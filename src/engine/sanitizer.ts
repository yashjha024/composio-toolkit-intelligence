import {
  AccessModel,
  ApiBreadth,
  ApiStyle,
  AuthMethod,
  CanonicalStageResult,
  McpStatus,
  PublicApiStatus,
} from '../types/schema.js';

export function sanitizeAccessModel(raw: any): AccessModel {
  if (typeof raw !== 'string') return 'unclear';
  const s = raw.toLowerCase().trim();
  if (s === 'self_serve_free' || s === 'self-serve free') return 'self_serve_free';
  if (s === 'self_serve_trial' || s === 'self-serve trial') return 'self_serve_trial';
  if (s === 'self_serve_paid' || s === 'self-serve paid') return 'self_serve_paid';
  if (s === 'admin_gated' || s === 'admin gated') return 'admin_gated';
  if (s === 'sales_gated' || s === 'sales gated') return 'sales_gated';
  if (s === 'partner_gated' || s === 'partner gated') return 'partner_gated';
  if (s.includes('admin')) return 'admin_gated';
  if (s.includes('sales')) return 'sales_gated';
  if (s.includes('partner')) return 'partner_gated';
  if (s.includes('self_serve') || s.includes('self-serve')) {
    if (s.includes('trial')) return 'self_serve_trial';
    if (s.includes('paid')) return 'self_serve_paid';
    return 'self_serve_free';
  }
  return 'unclear';
}

export function sanitizePublicApi(raw: any): PublicApiStatus {
  if (typeof raw !== 'string') return 'unclear';
  const s = raw.toLowerCase().trim();
  if (s === 'yes' || s === 'true') return 'yes';
  if (s === 'no' || s === 'false') return 'no';
  if (s === 'limited') return 'limited';
  if (s.includes('yes')) return 'yes';
  if (s.includes('no')) return 'no';
  return 'unclear';
}

export function sanitizeApiBreadth(raw: any): ApiBreadth {
  if (typeof raw !== 'string') return 'unclear';
  const s = raw.toLowerCase().trim();
  if (s === 'broad') return 'broad';
  if (s === 'moderate') return 'moderate';
  if (s === 'narrow') return 'narrow';
  if (s === 'none') return 'none';
  return 'unclear';
}

export function sanitizeMcpStatus(raw: any): McpStatus {
  if (typeof raw !== 'string') return 'unclear';
  const s = raw.toLowerCase().trim();
  if (s === 'official') return 'official';
  if (s === 'community') return 'community';
  if (s === 'none_found' || s === 'none found' || s === 'none') return 'none_found';
  return 'unclear';
}

export function sanitizeAuthMethods(raw: any): AuthMethod[] {
  if (!Array.isArray(raw)) return ['unclear'];
  const validSet = new Set<AuthMethod>();
  const allowed: AuthMethod[] = ['oauth2', 'api_key', 'basic', 'bearer_token', 'service_account', 'custom', 'other', 'unclear'];
  for (const item of raw) {
    if (typeof item === 'string') {
      const s = item.toLowerCase().trim() as AuthMethod;
      if (allowed.includes(s)) {
        validSet.add(s);
      } else if (s.includes('oauth')) {
        validSet.add('oauth2');
      } else if (s.includes('key')) {
        validSet.add('api_key');
      } else if (s.includes('bearer') || s.includes('token')) {
        validSet.add('bearer_token');
      } else if (s.includes('basic')) {
        validSet.add('basic');
      } else {
        validSet.add('other');
      }
    }
  }
  return validSet.size > 0 ? Array.from(validSet) : ['unclear'];
}

export function sanitizeApiStyles(raw: any): ApiStyle[] {
  if (!Array.isArray(raw)) return [];
  const validSet = new Set<ApiStyle>();
  const allowed: ApiStyle[] = ['REST', 'GraphQL', 'SDK', 'CLI', 'webhooks', 'other'];
  for (const item of raw) {
    if (typeof item === 'string') {
      const s = item.toUpperCase().trim();
      if (s === 'REST' || s === 'GRAPHQL' || s === 'SDK' || s === 'CLI' || s === 'WEBHOOKS' || s === 'OTHER') {
        validSet.add(s === 'GRAPHQL' ? 'GraphQL' : s === 'WEBHOOKS' ? 'webhooks' : s === 'OTHER' ? 'other' : (s as ApiStyle));
      } else if (s.includes('REST')) {
        validSet.add('REST');
      } else if (s.includes('GRAPH')) {
        validSet.add('GraphQL');
      } else if (s.includes('SDK')) {
        validSet.add('SDK');
      } else if (s.includes('CLI')) {
        validSet.add('CLI');
      } else if (s.includes('HOOK')) {
        validSet.add('webhooks');
      } else {
        validSet.add('other');
      }
    }
  }
  return Array.from(validSet);
}

export function sanitizeStageResult(result: any): CanonicalStageResult {
  return {
    identity: result.identity,
    product: {
      normalized_category: result.product?.normalized_category || result.identity.assigned_category,
      one_line_description: result.product?.one_line_description || `${result.identity.app_name} application`,
    },
    authentication: {
      auth_methods: sanitizeAuthMethods(result.authentication?.auth_methods),
      auth_summary: result.authentication?.auth_summary || 'Unclear authentication summary.',
    },
    developer_access: {
      access_model: sanitizeAccessModel(result.developer_access?.access_model),
      credentials_obtainable_without_human_approval:
        typeof result.developer_access?.credentials_obtainable_without_human_approval === 'boolean'
          ? result.developer_access.credentials_obtainable_without_human_approval
          : 'unknown',
      access_notes: result.developer_access?.access_notes || 'Unclear developer credential access model notes.',
    },
    api_surface: {
      public_api: sanitizePublicApi(result.api_surface?.public_api),
      api_styles: sanitizeApiStyles(result.api_surface?.api_styles),
      api_breadth: sanitizeApiBreadth(result.api_surface?.api_breadth),
      api_summary: result.api_surface?.api_summary || 'Unclear API surface summary.',
    },
    mcp: {
      mcp_status: sanitizeMcpStatus(result.mcp?.mcp_status),
      mcp_summary: result.mcp?.mcp_summary || 'Unclear MCP status summary.',
    },
    buildability: result.buildability || {
      verdict: 'unclear',
      primary_blocker: null,
      verdict_reasoning: 'Unclear buildability verdict.',
    },
    confidence: {
      field_confidence: result.confidence?.field_confidence || {},
      overall_confidence: typeof result.confidence?.overall_confidence === 'number' ? result.confidence.overall_confidence : 0.5,
      requires_human_review: typeof result.confidence?.requires_human_review === 'boolean' ? result.confidence.requires_human_review : true,
      human_review_reason: result.confidence?.human_review_reason || null,
    },
  };
}
