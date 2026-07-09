import { describe, it, expect } from 'vitest';
import { EvidenceValidator } from '../engine/validator.js';
import { IndependentCriticEngine } from '../engine/critic.js';
import { CanonicalStageResult, EvidenceRecord } from '../types/schema.js';
import { WebFetcherProvider, WebPageContent, LlmProvider } from '../providers/types.js';

class MockFetcher implements WebFetcherProvider {
  async fetchPage(url: string): Promise<WebPageContent> {
    return {
      url,
      status: 200,
      redirectChain: [url],
      rawHtml: '<html><body>Mock page text containing free plan and api key info</body></html>',
      markdown: 'Mock page text containing free plan and api key info. Basic tier is free to try. For API access, contact sales.',
      title: 'Mock Page',
    };
  }
}

class MockLlm implements LlmProvider {
  async generateStructured<T>(prompt: string, schema: any, systemInstruction?: string): Promise<T> {
    const challenged_fields: string[] = [];
    const error_taxonomy_flags: string[] = [];

    if (prompt.includes('self_serve_free') && prompt.includes('contact sales')) {
      challenged_fields.push('developer_access.access_model');
      error_taxonomy_flags.push('free_product_vs_free_api');
    }
    if (prompt.includes('"oauth2"') && !prompt.includes('oauth2 is supported')) {
      challenged_fields.push('authentication.auth_methods');
    }

    return {
      challenged_fields,
      critic_analysis: { reason: 'Pre-scale fix test audit' },
      error_taxonomy_flags,
    } as any;
  }
  async generateText(prompt: string): Promise<string> {
    return '';
  }
}

describe('Pre-Scale Fixes Validation Suite', () => {
  const validator = new EvidenceValidator(new MockFetcher());
  const critic = new IndependentCriticEngine(new MockLlm());

  it('1. Free product signup without API credential evidence must not become self_serve_free', async () => {
    const mockFirstPass: CanonicalStageResult = {
      identity: { assignment_number: 99, app_name: 'Test App', website_hint: 'test.com', assigned_category: 'AI' },
      product: { normalized_category: 'AI', one_line_description: 'Test app' },
      authentication: { auth_methods: ['api_key'], auth_summary: 'API key' },
      developer_access: {
        access_model: 'self_serve_free',
        credentials_obtainable_without_human_approval: true,
        access_notes: 'Free basic plan available',
      },
      api_surface: { public_api: 'limited', api_styles: ['REST'], api_breadth: 'moderate', api_summary: 'REST API' },
      mcp: { mcp_status: 'none_found', mcp_summary: 'None' },
      buildability: { verdict: 'build_now', primary_blocker: null, verdict_reasoning: 'Ready' },
      confidence: { field_confidence: {}, overall_confidence: 0.8, requires_human_review: false, human_review_reason: null },
    };

    const evidence: EvidenceRecord[] = [
      {
        evidence_id: 'ev_1',
        claim_field: 'developer_access.access_model',
        claim: 'self_serve_free',
        source_url: 'https://test.com/pricing',
        source_title: 'Pricing',
        source_type: 'official_doc',
        evidence_snippet: 'Basic tier is free to try. For API access, contact sales.',
        retrieved_at: new Date().toISOString(),
        supports_claim: true,
        fetch_mode: 'http',
        url_status: { format_valid: true, resolves: true, redirect_chain: ['https://test.com/pricing'] },
        snippet_match_status: { exact_match: true, normalized_match: true, match_type: 'exact' },
        semantic_support_status: { supported: true, critic_notes: '' },
      },
    ];

    const audit = await critic.auditStageResult(mockFirstPass, evidence);
    expect(audit.challenged_fields).toContain('developer_access.access_model');
    expect(audit.error_taxonomy_flags).toContain('free_product_vs_free_api');
  });

  it('2. Unsupported inferred OAuth2 must become unclear / challenged', async () => {
    const mockFirstPass: CanonicalStageResult = {
      identity: { assignment_number: 99, app_name: 'Test App', website_hint: 'test.com', assigned_category: 'AI' },
      product: { normalized_category: 'AI', one_line_description: 'Test app' },
      authentication: { auth_methods: ['oauth2'], auth_summary: 'Inferred OAuth2' },
      developer_access: { access_model: 'unclear', credentials_obtainable_without_human_approval: 'unknown', access_notes: 'Unclear' },
      api_surface: { public_api: 'unclear', api_styles: [], api_breadth: 'unclear', api_summary: 'Unclear' },
      mcp: { mcp_status: 'none_found', mcp_summary: 'None' },
      buildability: { verdict: 'unclear', primary_blocker: null, verdict_reasoning: 'Unclear' },
      confidence: { field_confidence: {}, overall_confidence: 0.5, requires_human_review: true, human_review_reason: null },
    };

    const evidence: EvidenceRecord[] = [
      {
        evidence_id: 'ev_auth',
        claim_field: 'authentication.auth_methods',
        claim: 'oauth2',
        source_url: 'https://test.com/docs',
        source_title: 'Docs',
        source_type: 'official_doc',
        evidence_snippet: 'Please use your secret API key inside the authorization header.',
        retrieved_at: new Date().toISOString(),
        supports_claim: true,
        fetch_mode: 'http',
        url_status: { format_valid: true, resolves: true, redirect_chain: ['https://test.com/docs'] },
        snippet_match_status: { exact_match: false, normalized_match: false, match_type: 'not_found' },
        semantic_support_status: { supported: true, critic_notes: '' },
      },
    ];

    const audit = await critic.auditStageResult(mockFirstPass, evidence);
    expect(audit.challenged_fields).toContain('authentication.auth_methods');

    const validated = await validator.validateEvidence(evidence[0]);
    expect(validated.supports_claim).toBe(false);
  });

  it('3. Search snippets (secondary source_type) must not become supporting evidence', async () => {
    const searchEvidence: EvidenceRecord = {
      evidence_id: 'ev_search',
      claim_field: 'api_surface.public_api',
      claim: 'yes',
      source_url: 'https://google.com/search?q=test+app+api',
      source_title: 'Google Search',
      source_type: 'secondary',
      evidence_snippet: 'Basic tier is free to try. For API access, contact sales.',
      retrieved_at: new Date().toISOString(),
      supports_claim: true,
      fetch_mode: 'http',
      url_status: { format_valid: true, resolves: true, redirect_chain: ['https://google.com/search?q=test+app+api'] },
      snippet_match_status: { exact_match: true, normalized_match: true, match_type: 'exact' },
      semantic_support_status: { supported: true, critic_notes: '' },
    };

    const checked = await validator.validateEvidence(searchEvidence);
    expect(checked.supports_claim).toBe(false);
  });
});
