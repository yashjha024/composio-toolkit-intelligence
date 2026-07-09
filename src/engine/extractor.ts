import { CanonicalStageResult, EvidenceRecord } from '../types/schema.js';
import { LlmProvider, WebPageContent } from '../providers/types.js';
import { computeProvisionalVerdict } from './verdict.js';
import { sanitizeStageResult } from './sanitizer.js';

export interface ExtractionOutput {
  stage_result: CanonicalStageResult;
  evidence_pool: EvidenceRecord[];
}

export class FirstPassExtractor {
  constructor(private llm: LlmProvider) {}

  public async extractFirstPass(
    assignmentNumber: number,
    appName: string,
    websiteHint: string,
    assignedCategory: string,
    pages: WebPageContent[]
  ): Promise<ExtractionOutput> {
    const pagesContext = pages
      .map(
        (p, idx) =>
          `[Source #${idx + 1}] URL: ${p.url}\nTitle: ${p.title}\nStatus: ${p.status}\nContent Snippet:\n${p.markdown || p.rawHtml}\n---`
      )
      .join('\n\n');

    const systemInstruction = `You are an expert AI Product Operations researcher investigating applications to evaluate whether they can become toolkits that AI agents can call.
Extract exact, factual research claims strictly derived from the provided source pages.
If a fact cannot be established from the sources, set or classify it as "unclear" or "unknown".
Never invent URLs, endpoints, or supporting text. Every evidence snippet MUST be exact text copied directly from the provided source content.`;

    const prompt = `Research Target:
- Assignment #: ${assignmentNumber}
- App Name: ${appName}
- Website Hint: ${websiteHint}
- Assigned Category: ${assignedCategory}

Available Source Pages:
${pagesContext}

Extract the core research fields and provide direct evidence snippets for every claim.
Return a JSON object matching this exact structure:
{
  "product": {
    "normalized_category": "${assignedCategory}",
    "one_line_description": "Clear 1-sentence description of what the application does"
  },
  "authentication": {
    "auth_methods": ["oauth2" | "api_key" | "basic" | "bearer_token" | "service_account" | "custom" | "other" | "unclear"],
    "auth_summary": "Summary of authentication patterns and requirements"
  },
  "developer_access": {
    "access_model": "self_serve_free" | "self_serve_trial" | "self_serve_paid" | "admin_gated" | "sales_gated" | "partner_gated" | "unclear",
    "credentials_obtainable_without_human_approval": true | false | "unknown",
    "access_notes": "Explanation of exact credential generation steps and whether human/vendor/admin approval is needed"
  },
  "api_surface": {
    "public_api": "yes" | "no" | "limited" | "unclear",
    "api_styles": ["REST" | "GraphQL" | "SDK" | "CLI" | "webhooks" | "other"],
    "api_breadth": "broad" | "moderate" | "narrow" | "none" | "unclear",
    "api_summary": "Summary of documented endpoints and breadth"
  },
  "mcp": {
    "mcp_status": "official" | "community" | "none_found" | "unclear",
    "mcp_summary": "Summary of Model Context Protocol server availability"
  },
  "confidence": {
    "field_confidence": {
      "auth_methods": 0.0 to 1.0,
      "access_model": 0.0 to 1.0,
      "public_api": 0.0 to 1.0,
      "api_breadth": 0.0 to 1.0,
      "mcp_status": 0.0 to 1.0
    },
    "overall_confidence": 0.0 to 1.0,
    "requires_human_review": boolean,
    "human_review_reason": string or null
  },
  "evidence_items": [
    {
      "claim_field": "developer_access.access_model" or other field path,
      "claim": string or boolean value claimed,
      "source_url": "Exact URL of the source page from the list",
      "source_title": "Title of the source page",
      "source_type": "official_doc" | "api_ref" | "developer_portal" | "github_repo" | "secondary" | "unknown",
      "evidence_snippet": "Exact quote from the page proving the claim"
    }
  ]
}`;

    const schema = {
      type: 'object',
      properties: {
        product: {
          type: 'object',
          properties: {
            normalized_category: { type: 'string' },
            one_line_description: { type: 'string' },
          },
          required: ['normalized_category', 'one_line_description'],
        },
        authentication: {
          type: 'object',
          properties: {
            auth_methods: { type: 'array', items: { type: 'string' } },
            auth_summary: { type: 'string' },
          },
          required: ['auth_methods', 'auth_summary'],
        },
        developer_access: {
          type: 'object',
          properties: {
            access_model: { type: 'string' },
            credentials_obtainable_without_human_approval: {},
            access_notes: { type: 'string' },
          },
          required: ['access_model', 'credentials_obtainable_without_human_approval', 'access_notes'],
        },
        api_surface: {
          type: 'object',
          properties: {
            public_api: { type: 'string' },
            api_styles: { type: 'array', items: { type: 'string' } },
            api_breadth: { type: 'string' },
            api_summary: { type: 'string' },
          },
          required: ['public_api', 'api_styles', 'api_breadth', 'api_summary'],
        },
        mcp: {
          type: 'object',
          properties: {
            mcp_status: { type: 'string' },
            mcp_summary: { type: 'string' },
          },
          required: ['mcp_status', 'mcp_summary'],
        },
        confidence: {
          type: 'object',
          properties: {
            field_confidence: { type: 'object' },
            overall_confidence: { type: 'number' },
            requires_human_review: { type: 'boolean' },
            human_review_reason: {},
          },
          required: ['field_confidence', 'overall_confidence', 'requires_human_review'],
        },
        evidence_items: {
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
      required: ['product', 'authentication', 'developer_access', 'api_surface', 'mcp', 'confidence', 'evidence_items'],
    };

    const rawResult: any = await this.llm.generateStructured(prompt, schema, systemInstruction);

    // Compute deterministic buildability verdict from extracted facts
    const verdictCalc = computeProvisionalVerdict({
      developer_access: rawResult.developer_access,
      api_surface: rawResult.api_surface,
    });

    const stageResult: CanonicalStageResult = sanitizeStageResult({
      identity: {
        assignment_number: assignmentNumber,
        app_name: appName,
        website_hint: websiteHint,
        assigned_category: assignedCategory,
        researched_at: new Date().toISOString(),
      },
      product: rawResult.product || {
        normalized_category: assignedCategory,
        one_line_description: `${appName} application`,
      },
      authentication: rawResult.authentication || {
        auth_methods: ['unclear'],
        auth_summary: 'Unclear authentication methods.',
      },
      developer_access: rawResult.developer_access || {
        access_model: 'unclear',
        credentials_obtainable_without_human_approval: 'unknown',
        access_notes: 'Unclear developer credential access model.',
      },
      api_surface: rawResult.api_surface || {
        public_api: 'unclear',
        api_styles: [],
        api_breadth: 'unclear',
        api_summary: 'Unclear public API availability.',
      },
      mcp: rawResult.mcp || {
        mcp_status: 'unclear',
        mcp_summary: 'Unclear MCP availability.',
      },
      buildability: {
        verdict: verdictCalc.verdict,
        primary_blocker: verdictCalc.primary_blocker,
        verdict_reasoning: verdictCalc.verdict_reasoning,
      },
      confidence: rawResult.confidence || {
        field_confidence: {},
        overall_confidence: 0.5,
        requires_human_review: true,
        human_review_reason: 'Default confidence fallback.',
      },
    });

    const evidencePool: EvidenceRecord[] = (rawResult.evidence_items || []).map((e: any, idx: number) => ({
      evidence_id: `ev_fp_${Date.now()}_${idx}`,
      claim_field: e.claim_field || 'general',
      claim: e.claim ?? '',
      source_url: e.source_url || pages[0]?.url || websiteHint,
      source_title: e.source_title || 'Source Documentation',
      source_type: ['official_doc', 'api_ref', 'developer_portal', 'github_repo', 'secondary', 'unknown'].includes(e.source_type)
        ? e.source_type
        : 'official_doc',
      evidence_snippet: e.evidence_snippet || '',
      retrieved_at: new Date().toISOString(),
      supports_claim: true,
      url_status: { format_valid: true, resolves: true, redirect_chain: [e.source_url || ''] },
      snippet_match_status: { exact_match: false, normalized_match: false, match_type: 'not_found' },
      semantic_support_status: { supported: true, critic_notes: '' },
    }));

    return { stage_result: stageResult, evidence_pool: evidencePool };
  }
}
