import { CanonicalStageResult, CriticResult, EvidenceRecord } from '../types/schema.js';
import { LlmProvider, WebPageContent } from '../providers/types.js';

export interface ReResearchOutput {
  updated_fields: Partial<CanonicalStageResult>;
  new_evidence: EvidenceRecord[];
}

export class TargetedReResearchEngine {
  constructor(private llm: LlmProvider) {}

  public async reResearchChallengedFields(
    firstPass: CanonicalStageResult,
    criticResult: CriticResult,
    pages: WebPageContent[]
  ): Promise<ReResearchOutput> {
    if (!criticResult.challenged_fields || criticResult.challenged_fields.length === 0) {
      return { updated_fields: {}, new_evidence: [] };
    }

    const pagesContext = pages
      .map(
        (p, idx) =>
          `[Source #${idx + 1}] URL: ${p.url}\nTitle: ${p.title}\nStatus: ${p.status}\nContent Snippet:\n${p.markdown || p.rawHtml}\n---`
      )
      .join('\n\n');

    const systemInstruction = `You are a targeted re-research specialist resolving discrepancies and unsupported claims identified by an independent critic.
You MUST focus EXCLUSIVELY on the challenged fields listed below and locate rigorous, exact verbatim evidence in the source documentation.
If the source documentation does not contain clear proof, set or classify the challenged field as "unclear". Never assume or guess.`;

    const prompt = `Research Target: ${firstPass.identity.app_name} (${firstPass.identity.website_hint})

First-Pass Stage Result:
${JSON.stringify(firstPass, null, 2)}

Challenged Fields & Critic Analysis:
${JSON.stringify({ challenged_fields: criticResult.challenged_fields, critic_analysis: criticResult.critic_analysis, flags: criticResult.error_taxonomy_flags }, null, 2)}

Available Source Pages:
${pagesContext}

Provide corrected, highly confident extractions ONLY for the challenged fields (` +
      criticResult.challenged_fields.join(', ') +
      `), along with exact verbatim evidence snippets supporting each corrected value.
Return a JSON object:
{
  "updated_stage_partial": {
    "developer_access": { ... } // only if challenged
    "api_surface": { ... } // only if challenged
    "mcp": { ... } // only if challenged
    "authentication": { ... } // only if challenged
  },
  "new_evidence_items": [
    {
      "claim_field": string,
      "claim": any,
      "source_url": string,
      "source_title": string,
      "source_type": string,
      "evidence_snippet": string
    }
  ]
}`;

    const schema = {
      type: 'object',
      properties: {
        updated_stage_partial: { type: 'object' },
        new_evidence_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              claim_field: { type: 'string' },
              claim: {},
              source_url: { type: 'string' },
              source_title: { type: 'string' },
              source_type: { type: 'string' },
              evidence_snippet: { type: 'string' },
            },
            required: ['claim_field', 'claim', 'source_url', 'evidence_snippet'],
          },
        },
      },
      required: ['updated_stage_partial', 'new_evidence_items'],
    };

    try {
      const rawResult: any = await this.llm.generateStructured(prompt, schema, systemInstruction);
      const newEvidence: EvidenceRecord[] = (rawResult.new_evidence_items || []).map((e: any, idx: number) => ({
        evidence_id: `ev_rr_${Date.now()}_${idx}`,
        claim_field: e.claim_field || 'general',
        claim: e.claim ?? '',
        source_url: e.source_url || pages[0]?.url || firstPass.identity.website_hint,
        source_title: e.source_title || 'Re-Research Source',
        source_type: ['official_doc', 'api_ref', 'developer_portal', 'github_repo', 'secondary', 'unknown'].includes(e.source_type)
          ? e.source_type
          : 'official_doc',
        evidence_snippet: e.evidence_snippet || '',
        retrieved_at: new Date().toISOString(),
        supports_claim: true,
        fetch_mode: pages.find((p: any) => p.url === e.source_url)?.fetchMode || 'http',
        url_status: { format_valid: true, resolves: true, redirect_chain: [e.source_url || ''] },
        snippet_match_status: { exact_match: false, normalized_match: false, match_type: 'not_found' },
        semantic_support_status: { supported: true, critic_notes: '' },
      }));

      return {
        updated_fields: rawResult.updated_stage_partial || {},
        new_evidence: newEvidence,
      };
    } catch {
      return { updated_fields: {}, new_evidence: [] };
    }
  }
}
