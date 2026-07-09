import { CanonicalStageResult, CriticResult, EvidenceRecord } from '../types/schema.js';
import { LlmProvider } from '../providers/types.js';

export class IndependentCriticEngine {
  constructor(private llm: LlmProvider) {}

  public async auditStageResult(
    firstPass: CanonicalStageResult,
    evidencePool: EvidenceRecord[]
  ): Promise<CriticResult> {
    const systemInstruction = `You are an independent, skeptical Product Operations Critic auditing a first-pass research extraction for an application toolkit candidate.
Your primary objective is to verify whether the cited evidence genuinely supports every extracted claim without semantic drift or assumptions.

CRITICAL RULES FOR AUDIT (PRE-SCALE FIXES):
1. API-SPECIFIC DEVELOPER ACCESS: Verify whether "developer_access" refers strictly to obtaining credentials that allow API/tool access (API keys, OAuth client credentials, developer tokens, service-account credentials). A free product account, free dashboard, free trial, or "Get started free" button is NOT evidence of self-serve developer access! If the product is free but API access requires Enterprise, sales, partnership, or manual approval, you MUST challenge developer_access and flag "free_product_vs_free_api".
2. EVIDENCE-BACKED AUTHENTICATION: Check that every method listed in "authentication.auth_methods" has direct supporting evidence in the snippets. Do not permit inferred OAuth2, API keys, Basic auth, or bearer tokens from common SaaS patterns. If unsupported by direct snippet citation, challenge "authentication.auth_methods".

You MUST rigorously check for these exact five common failure modes:
1. "api_existence_vs_self_serve": Documented API endpoints exist, but obtaining developer credentials requires human approval, contacting sales, or enterprise partnership.
2. "free_product_vs_free_api": A free tier exists for the SaaS/consumer web application, but API access is restricted to paid or enterprise tiers.
3. "public_docs_vs_public_api": Public REST or GraphQL documentation is visible, but actual API requests require internal employee whitelisting or non-public tenant credentials.
4. "community_vs_official_mcp": A third-party or unofficial MCP server repository exists on GitHub, but was misclassified as vendor-supported or official.
5. "no_mcp_found_not_proof": Search returned zero qualifying MCP repositories, which must be categorized as "none_found", never asserted as absolute proof of non-existence.

If any field lacks explicit, direct supporting evidence in the snippets, or if it triggers one of the failure modes above, you MUST add that exact field name (e.g., "developer_access.access_model" or "mcp.mcp_status" or "authentication.auth_methods") to "challenged_fields" and explain why in "critic_analysis".`;

    const prompt = `Review the following first-pass stage result and supporting evidence pool:

First-Pass Stage Result:
${JSON.stringify(firstPass, null, 2)}

Supporting Evidence Pool:
${JSON.stringify(
  evidencePool.map((e) => ({
    claim_field: e.claim_field,
    claim: e.claim,
    source_url: e.source_url,
    evidence_snippet: e.evidence_snippet,
    url_resolves: e.url_status.resolves,
    match_type: e.snippet_match_status.match_type,
  })),
  null,
  2
)}

Evaluate whether every extracted claim is robustly proven by the exact evidence snippets.
Return a JSON object with this exact structure:
{
  "challenged_fields": string[], // List of field paths (e.g., "developer_access.access_model") that are weak, unsupported, contradictory, or trigger a failure mode
  "critic_analysis": { [fieldPath: string]: string }, // Detailed explanation per challenged or verified field
  "error_taxonomy_flags": string[] // Any of the 5 exact flags: "api_existence_vs_self_serve", "free_product_vs_free_api", "public_docs_vs_public_api", "community_vs_official_mcp", "no_mcp_found_not_proof", or other domain flags caught
}`;

    const schema = {
      type: 'object',
      properties: {
        challenged_fields: {
          type: 'array',
          items: { type: 'string' },
        },
        critic_analysis: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        error_taxonomy_flags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['challenged_fields', 'critic_analysis', 'error_taxonomy_flags'],
    };

    try {
      const result = await this.llm.generateStructured<CriticResult>(prompt, schema, systemInstruction);
      return {
        challenged_fields: Array.isArray(result.challenged_fields) ? result.challenged_fields : [],
        critic_analysis: result.critic_analysis || {},
        error_taxonomy_flags: Array.isArray(result.error_taxonomy_flags) ? result.error_taxonomy_flags : [],
      };
    } catch {
      // If critic LLM call fails, return empty challenge to not block pipeline execution
      return {
        challenged_fields: [],
        critic_analysis: { error: 'Critic audit LLM invocation failed' },
        error_taxonomy_flags: [],
      };
    }
  }
}
