import {
  CanonicalResearchRecord,
  CanonicalStageResult,
  EvidenceRecord,
} from '../types/schema.js';
import { SearchProvider, WebFetcherProvider, LlmProvider } from '../providers/types.js';
import { SourceDiscoveryEngine } from './discovery.js';
import { FirstPassExtractor } from './extractor.js';
import { EvidenceValidator } from './validator.js';
import { computeProvisionalVerdict } from './verdict.js';
import { sanitizeStageResult } from './sanitizer.js';
import { JsonStore } from '../lib/store.js';

export interface FastPipelineStats {
  totalRuntimeMs: number;
  urlsFetched: number;
  llmCallsCount: number;
  riskFlags: string[];
}

export class FastResearchPipeline {
  private discovery: SourceDiscoveryEngine;
  private extractor: FirstPassExtractor;
  private validator: EvidenceValidator;

  constructor(
    private searchProvider: SearchProvider,
    private fetcher: WebFetcherProvider,
    private llmProvider: LlmProvider,
    private store: JsonStore
  ) {
    this.discovery = new SourceDiscoveryEngine(this.searchProvider);
    this.extractor = new FirstPassExtractor(this.llmProvider);
    this.validator = new EvidenceValidator(this.fetcher);
  }

  public async runFastAppResearch(
    assignmentNumber: number,
    appName: string,
    websiteHint: string,
    assignedCategory: string,
    seededUrls: string[] = []
  ): Promise<{ record: CanonicalResearchRecord; stats: FastPipelineStats }> {
    const startTime = Date.now();
    let urlsFetched = 0;

    // 1. Check existing record
    const existingRecord = this.store.getRecord(assignmentNumber, appName);
    if (existingRecord && existingRecord.final_agent_result) {
      return {
        record: existingRecord,
        stats: { totalRuntimeMs: 0, urlsFetched: 0, llmCallsCount: 0, riskFlags: [] },
      };
    }

    if (existingRecord && existingRecord.first_pass) {
      // Treat existing first pass as fast-scale result
      const firstPass = existingRecord.first_pass;
      const riskFlags = this.computeRiskFlags(firstPass, existingRecord.evidence_pool || [], [], 1);
      const updatedRecord: CanonicalResearchRecord = {
        ...existingRecord,
        fast_scale_risk_flags: riskFlags,
        pipeline_metadata: {
          ...existingRecord.pipeline_metadata,
          current_stage: 'first_pass',
          unresolved_questions: riskFlags,
        },
      };
      this.store.saveRecord(updatedRecord);
      return {
        record: updatedRecord,
        stats: { totalRuntimeMs: Date.now() - startTime, urlsFetched: 0, llmCallsCount: 0, riskFlags },
      };
    }

    // Step 1: Discover candidate official sources
    const discovered = await this.discovery.discoverSources(appName, websiteHint, seededUrls);
    const pagesToFetch = discovered.slice(0, 3);
    const pages: any[] = [];

    for (const source of pagesToFetch) {
      try {
        const page = await this.validator.getCachedOrFetch(source.url);
        if (page.status >= 200 && page.status < 400 && page.markdown) {
          page.fetchMode = 'http';
          pages.push(page);
          urlsFetched++;
        }
      } catch {
        // Skip
      }
    }

    if (pages.length === 0) {
      // Try alternate official documentation without browser fallback
      const alternateSources = discovered.slice(3, 8);
      const domainClean = websiteHint.replace(/\(.*?\)/g, '').trim().replace(/^https?:\/\//, '').split('/')[0];
      const extraAlternates = [
        `https://help.${domainClean}`,
        `https://support.${domainClean}`,
        `https://docs.${domainClean}`,
      ];

      for (const altUrl of [...alternateSources.map((s) => s.url), ...extraAlternates]) {
        try {
          const page = await this.validator.getCachedOrFetch(altUrl);
          if (page.status >= 200 && page.status < 400 && (page.markdown || page.rawHtml)) {
            page.fetchMode = 'alternate_official_source';
            pages.push(page);
            urlsFetched++;
            if (pages.length >= 2) break;
          }
        } catch {
          // Skip
        }
      }
    }

    // Step 3: Make exactly ONE structured LLM extraction call
    const extraction = await this.extractor.extractFirstPass(
      assignmentNumber,
      appName,
      websiteHint,
      assignedCategory,
      pages
    );
    let firstPass = extraction.stage_result;
    const initialEvidence = extraction.evidence_pool;

    // Step 4: Validate evidence URLs and snippets deterministically
    const validatedEvidence: EvidenceRecord[] = [];
    for (const ev of initialEvidence) {
      const checked = await this.validator.validateEvidence(ev);
      validatedEvidence.push(checked);
    }

    // Conservative enforcement based on deterministic validation
    const hasValidAuth = validatedEvidence.some((e) => e.claim_field?.includes('auth') && e.supports_claim);
    if (!hasValidAuth && firstPass.authentication.auth_methods.length > 0 && !firstPass.authentication.auth_methods.includes('unclear')) {
      firstPass.authentication.auth_methods = ['unclear'];
    }

    const hasValidAccess = validatedEvidence.some((e) => e.claim_field?.includes('access_model') && e.supports_claim && /api key|oauth|token|client|service account|developer/i.test(e.evidence_snippet));
    if (!hasValidAccess && firstPass.developer_access.access_model === 'self_serve_free') {
      firstPass.developer_access.access_model = 'unclear';
    }

    // Step 5: Compute the opportunity verdict deterministically
    const verdictCalc = computeProvisionalVerdict({
      developer_access: firstPass.developer_access,
      api_surface: firstPass.api_surface,
    });

    firstPass.buildability = {
      verdict: verdictCalc.verdict,
      primary_blocker: verdictCalc.primary_blocker,
      verdict_reasoning: verdictCalc.verdict_reasoning,
    };

    firstPass = sanitizeStageResult(firstPass);

    // Step 6: Deterministic risk flags
    const riskFlags = this.computeRiskFlags(firstPass, validatedEvidence, pages, urlsFetched);

    // Step 7: Save result immediately
    const record: CanonicalResearchRecord = {
      identity: firstPass.identity,
      product: firstPass.product,
      authentication: firstPass.authentication,
      developer_access: firstPass.developer_access,
      api_surface: firstPass.api_surface,
      mcp: firstPass.mcp,
      buildability: firstPass.buildability,
      confidence: firstPass.confidence,
      evidence_pool: validatedEvidence,
      first_pass: firstPass,
      fast_scale_risk_flags: riskFlags,
      change_log: [],
      pipeline_metadata: {
        pipeline_version: '1.0.0-fast',
        current_stage: 'first_pass',
        errors: [],
        unresolved_questions: riskFlags,
      },
    };

    this.store.saveRecord(record);

    return {
      record,
      stats: {
        totalRuntimeMs: Date.now() - startTime,
        urlsFetched,
        llmCallsCount: 1,
        riskFlags,
      },
    };
  }

  private computeRiskFlags(
    fp: CanonicalStageResult,
    evidence: EvidenceRecord[],
    pages: any[],
    urlsFetched: number
  ): string[] {
    const flags: string[] = [];

    if (fp.developer_access.access_model === 'unclear') {
      flags.push('risk_access_model_unclear');
    }
    if (fp.authentication.auth_methods.includes('unclear')) {
      flags.push('risk_auth_methods_unclear');
    }
    if (fp.api_surface.public_api === 'unclear') {
      flags.push('risk_public_api_unclear');
    }

    const materialFields = ['developer_access', 'authentication', 'api_surface'];
    const materialEvidenceFailed = evidence.some(
      (e) => materialFields.some((m) => e.claim_field?.includes(m)) && !e.supports_claim
    );
    if (materialEvidenceFailed) {
      flags.push('risk_material_evidence_validation_failed');
    }

    if (urlsFetched === 0 || pages.length === 0) {
      flags.push('risk_insufficient_official_sources');
    }

    const blockedDocs = pages.some((p) => p.status === 403 || p.status === 429);
    if (blockedDocs && (fp.developer_access.access_model === 'unclear' || fp.api_surface.public_api === 'unclear')) {
      flags.push('risk_blocked_documentation');
    }

    if (fp.api_surface.public_api === 'yes' && fp.developer_access.access_model === 'unclear') {
      flags.push('risk_contradictory_claims');
    }
    if (fp.buildability.verdict === 'build_now' && (fp.developer_access.access_model === 'unclear' || fp.authentication.auth_methods.includes('unclear'))) {
      flags.push('risk_contradictory_claims');
    }

    if (fp.buildability.verdict === 'unclear') {
      flags.push('risk_verdict_unclear');
    }

    if (fp.confidence.overall_confidence < 0.7 || fp.confidence.requires_human_review) {
      flags.push('risk_low_confidence');
    }

    return Array.from(new Set(flags));
  }
}
