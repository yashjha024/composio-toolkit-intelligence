import {
  CanonicalResearchRecord,
  CanonicalStageResult,
  ChangeLogEntry,
  EvidenceRecord,
} from '../types/schema.js';
import { SearchProvider, WebFetcherProvider, LlmProvider } from '../providers/types.js';
import { SourceDiscoveryEngine } from './discovery.js';
import { FirstPassExtractor } from './extractor.js';
import { EvidenceValidator } from './validator.js';
import { IndependentCriticEngine } from './critic.js';
import { TargetedReResearchEngine } from './reresearch.js';
import { computeProvisionalVerdict } from './verdict.js';
import { sanitizeStageResult } from './sanitizer.js';
import { JsonStore } from '../lib/store.js';

export interface PipelineStats {
  totalRuntimeMs: number;
  urlsFetched: number;
  llmCallsCount: number;
}

export class ResearchPipeline {
  private discovery: SourceDiscoveryEngine;
  private extractor: FirstPassExtractor;
  private validator: EvidenceValidator;
  private critic: IndependentCriticEngine;
  private reresearch: TargetedReResearchEngine;

  constructor(
    private searchProvider: SearchProvider,
    private fetcher: WebFetcherProvider,
    private llmProvider: LlmProvider,
    private store: JsonStore
  ) {
    this.discovery = new SourceDiscoveryEngine(this.searchProvider);
    this.extractor = new FirstPassExtractor(this.llmProvider);
    this.validator = new EvidenceValidator(this.fetcher);
    this.critic = new IndependentCriticEngine(this.llmProvider);
    this.reresearch = new TargetedReResearchEngine(this.llmProvider);
  }

  private computeDiffChanges(
    firstPass: CanonicalStageResult,
    finalResult: CanonicalStageResult,
    criticReasons: Record<string, string>
  ): ChangeLogEntry[] {
    const changes: ChangeLogEntry[] = [];
    const now = new Date().toISOString();

    const checkField = (fieldPath: string, oldVal: any, newVal: any) => {
      const oldStr = JSON.stringify(oldVal);
      const newStr = JSON.stringify(newVal);
      if (oldStr !== newStr) {
        changes.push({
          timestamp: now,
          field_changed: fieldPath,
          old_value: oldVal,
          new_value: newVal,
          reason: criticReasons[fieldPath] || `Updated during targeted verification loop`,
          verification_loop_trigger: 'critic_audit',
        });
      }
    };

    checkField('developer_access.access_model', firstPass.developer_access.access_model, finalResult.developer_access.access_model);
    checkField(
      'developer_access.credentials_obtainable_without_human_approval',
      firstPass.developer_access.credentials_obtainable_without_human_approval,
      finalResult.developer_access.credentials_obtainable_without_human_approval
    );
    checkField('api_surface.public_api', firstPass.api_surface.public_api, finalResult.api_surface.public_api);
    checkField('api_surface.api_breadth', firstPass.api_surface.api_breadth, finalResult.api_surface.api_breadth);
    checkField('mcp.mcp_status', firstPass.mcp.mcp_status, finalResult.mcp.mcp_status);
    checkField('buildability.verdict', firstPass.buildability.verdict, finalResult.buildability.verdict);

    return changes;
  }

  public async runAppResearch(
    assignmentNumber: number,
    appName: string,
    websiteHint: string,
    assignedCategory: string,
    seededUrls: string[] = []
  ): Promise<{ record: CanonicalResearchRecord; stats: PipelineStats }> {
    const startTime = Date.now();
    let urlsFetched = 0;
    const initialLlmCalls = (this.llmProvider as any).callCount || 0;

    // Step 1: Find relevant official documentation
    const discovered = await this.discovery.discoverSources(appName, websiteHint, seededUrls);
    const pagesToFetch = discovered.slice(0, 3); // Fetch top 3 candidate sources
    const pages = [];

    for (const source of pagesToFetch) {
      try {
        const page = await this.validator.getCachedOrFetch(source.url);
        if (page.status >= 200 && page.status < 400 && page.markdown) {
          pages.push(page);
          urlsFetched++;
        }
      } catch {
        // Skip failed fetch cleanly
      }
    }

    if (pages.length === 0) {
      // Fallback: try fetching websiteHint directly if discovery queries failed or returned non-200
      const directUrl = websiteHint.startsWith('http') ? websiteHint : `https://${websiteHint.replace(/\(.*?\)/g, '').trim()}`;
      try {
        const page = await this.validator.getCachedOrFetch(directUrl);
        if (page.markdown || page.rawHtml) {
          pages.push(page);
          urlsFetched++;
        }
      } catch {
        // Still proceed so extractor returns 'unclear' instead of crashing
      }
    }

    // Step 2: Extract the required research fields with evidence
    const { stage_result: firstPass, evidence_pool: initialEvidence } = await this.extractor.extractFirstPass(
      assignmentNumber,
      appName,
      websiteHint,
      assignedCategory,
      pages
    );

    // Step 3: Save the first-pass result
    const initialRecord: CanonicalResearchRecord = {
      identity: firstPass.identity,
      evidence_pool: initialEvidence,
      first_pass: firstPass,
      change_log: [],
      pipeline_metadata: {
        pipeline_version: '1.0.0',
        current_stage: 'first_pass',
        errors: [],
        unresolved_questions: [],
      },
    };
    this.store.saveRecord(initialRecord);

    // Step 4: Verify whether the evidence actually supports the claims
    const validatedEvidence: EvidenceRecord[] = [];
    for (const ev of initialEvidence) {
      const checked = await this.validator.validateEvidence(ev);
      // If URL resolution failed, fetch might have counted it or it failed
      validatedEvidence.push(checked);
    }

    // Step 5: Challenge weak or contradictory fields
    const criticResult = await this.critic.auditStageResult(firstPass, validatedEvidence);

    // Step 6: Re-research ONLY challenged or low-confidence fields
    let targetedResultPartial = {};
    let newEvidencePool: EvidenceRecord[] = [];

    if (criticResult.challenged_fields && criticResult.challenged_fields.length > 0) {
      const rrOutput = await this.reresearch.reResearchChallengedFields(firstPass, criticResult, pages);
      targetedResultPartial = rrOutput.updated_fields;
      for (const nev of rrOutput.new_evidence) {
        const checked = await this.validator.validateEvidence(nev);
        newEvidencePool.push(checked);
      }
    }

    // Merge firstPass + targetedResultPartial -> finalAgentResult
    const mergedDeveloperAccess = {
      ...firstPass.developer_access,
      ...((targetedResultPartial as any).developer_access || {}),
    };
    const mergedApiSurface = {
      ...firstPass.api_surface,
      ...((targetedResultPartial as any).api_surface || {}),
    };

    // Recompute deterministic verdict on merged final facts
    const finalVerdictCalc = computeProvisionalVerdict({
      developer_access: mergedDeveloperAccess,
      api_surface: mergedApiSurface,
    });

    const rawFinalAgentResult: CanonicalStageResult = {
      ...firstPass,
      authentication: {
        ...firstPass.authentication,
        ...((targetedResultPartial as any).authentication || {}),
      },
      developer_access: mergedDeveloperAccess,
      api_surface: mergedApiSurface,
      mcp: {
        ...firstPass.mcp,
        ...((targetedResultPartial as any).mcp || {}),
      },
      buildability: {
        verdict: finalVerdictCalc.verdict,
        primary_blocker: finalVerdictCalc.primary_blocker,
        verdict_reasoning: finalVerdictCalc.verdict_reasoning,
      },
    };

    const finalAgentResult = sanitizeStageResult(rawFinalAgentResult);

    // Step 8: Show what changed and why
    const changeLog = this.computeDiffChanges(firstPass, finalAgentResult, criticResult.critic_analysis);

    const finalEvidencePool = [...validatedEvidence, ...newEvidencePool];

    const cleanTargetedPartial = Object.keys(targetedResultPartial).length > 0
      ? sanitizeStageResult({
          ...firstPass,
          ...targetedResultPartial,
          authentication: { ...firstPass.authentication, ...((targetedResultPartial as any).authentication || {}) },
          developer_access: { ...firstPass.developer_access, ...((targetedResultPartial as any).developer_access || {}) },
          api_surface: { ...firstPass.api_surface, ...((targetedResultPartial as any).api_surface || {}) },
          mcp: { ...firstPass.mcp, ...((targetedResultPartial as any).mcp || {}) },
        })
      : undefined;

    // Step 7: Save the final result separately
    const finalRecord: CanonicalResearchRecord = {
      identity: firstPass.identity,
      product: finalAgentResult.product,
      authentication: finalAgentResult.authentication,
      developer_access: finalAgentResult.developer_access,
      api_surface: finalAgentResult.api_surface,
      mcp: finalAgentResult.mcp,
      buildability: finalAgentResult.buildability,
      confidence: finalAgentResult.confidence,
      evidence_pool: finalEvidencePool,
      first_pass: firstPass,
      critic_result: criticResult,
      targeted_reresearch_result: cleanTargetedPartial,
      final_agent_result: finalAgentResult,
      change_log: changeLog,
      pipeline_metadata: {
        pipeline_version: '1.0.0',
        current_stage: 'final_agent',
        errors: criticResult.error_taxonomy_flags,
        unresolved_questions:
          finalAgentResult.buildability.verdict === 'unclear'
            ? ['Remaining ambiguity after critic audit and re-research loop']
            : [],
      },
    };

    this.store.saveRecord(finalRecord);

    const endTime = Date.now();
    const finalLlmCalls = (this.llmProvider as any).callCount || 0;

    return {
      record: finalRecord,
      stats: {
        totalRuntimeMs: endTime - startTime,
        urlsFetched,
        llmCallsCount: finalLlmCalls - initialLlmCalls,
      },
    };
  }
}
