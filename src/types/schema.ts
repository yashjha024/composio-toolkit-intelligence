import { z } from 'zod';

export const AuthMethodSchema = z.enum([
  'oauth2',
  'api_key',
  'basic',
  'bearer_token',
  'service_account',
  'custom',
  'other',
  'unclear',
]);
export type AuthMethod = z.infer<typeof AuthMethodSchema>;

export const AccessModelSchema = z.enum([
  'self_serve_free',
  'self_serve_trial',
  'self_serve_paid',
  'admin_gated',
  'sales_gated',
  'partner_gated',
  'unclear',
]);
export type AccessModel = z.infer<typeof AccessModelSchema>;

export const PublicApiStatusSchema = z.enum(['yes', 'no', 'limited', 'unclear']);
export type PublicApiStatus = z.infer<typeof PublicApiStatusSchema>;

export const ApiStyleSchema = z.enum(['REST', 'GraphQL', 'SDK', 'CLI', 'webhooks', 'other']);
export type ApiStyle = z.infer<typeof ApiStyleSchema>;

export const ApiBreadthSchema = z.enum(['broad', 'moderate', 'narrow', 'none', 'unclear']);
export type ApiBreadth = z.infer<typeof ApiBreadthSchema>;

export const McpStatusSchema = z.enum(['official', 'community', 'none_found', 'unclear']);
export type McpStatus = z.infer<typeof McpStatusSchema>;

export const OpportunityVerdictSchema = z.enum([
  'build_now',
  'build_with_caveats',
  'outreach_required',
  'blocked_low_priority',
  'unclear',
]);
export type OpportunityVerdict = z.infer<typeof OpportunityVerdictSchema>;

export const EvidenceRecordSchema = z.object({
  evidence_id: z.string(),
  claim_field: z.string(),
  claim: z.any(),
  source_url: z.string(),
  source_title: z.string(),
  source_type: z.enum([
    'official_doc',
    'api_ref',
    'developer_portal',
    'github_repo',
    'secondary',
    'unknown',
  ]),
  evidence_snippet: z.string(),
  retrieved_at: z.string(),
  supports_claim: z.union([z.boolean(), z.literal('unclear')]),
  fetch_mode: z.enum(['http', 'alternate_official_source', 'browser_fallback']).optional().default('http'),
  url_status: z.object({
    format_valid: z.boolean(),
    resolves: z.boolean(),
    status_code: z.number().optional(),
    redirect_chain: z.array(z.string()),
  }),
  snippet_match_status: z.object({
    exact_match: z.boolean(),
    normalized_match: z.boolean(),
    fuzzy_match_score: z.number().optional(),
    match_type: z.enum(['exact', 'normalized', 'fuzzy', 'not_found']),
  }),
  semantic_support_status: z.object({
    supported: z.union([z.boolean(), z.literal('unclear')]),
    critic_notes: z.string(),
  }),
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const IdentitySchema = z.object({
  assignment_number: z.number().int().positive(),
  app_name: z.string().min(1),
  website_hint: z.string(),
  assigned_category: z.string().min(1),
  researched_at: z.string().optional(),
});
export type Identity = z.infer<typeof IdentitySchema>;

export const ProductSchema = z.object({
  normalized_category: z.string(),
  one_line_description: z.string(),
});
export type Product = z.infer<typeof ProductSchema>;

export const AuthenticationSchema = z.object({
  auth_methods: z.array(AuthMethodSchema),
  auth_summary: z.string(),
});
export type Authentication = z.infer<typeof AuthenticationSchema>;

export const DeveloperAccessSchema = z.object({
  access_model: AccessModelSchema,
  credentials_obtainable_without_human_approval: z.union([
    z.boolean(),
    z.literal('unknown'),
  ]),
  access_notes: z.string(),
});
export type DeveloperAccess = z.infer<typeof DeveloperAccessSchema>;

export const ApiSurfaceSchema = z.object({
  public_api: PublicApiStatusSchema,
  api_styles: z.array(ApiStyleSchema),
  api_breadth: ApiBreadthSchema,
  api_summary: z.string(),
});
export type ApiSurface = z.infer<typeof ApiSurfaceSchema>;

export const McpSchema = z.object({
  mcp_status: McpStatusSchema,
  mcp_summary: z.string(),
});
export type Mcp = z.infer<typeof McpSchema>;

export const BuildabilitySchema = z.object({
  verdict: OpportunityVerdictSchema,
  primary_blocker: z.string().nullable(),
  verdict_reasoning: z.string(),
});
export type Buildability = z.infer<typeof BuildabilitySchema>;

export const ConfidenceSchema = z.object({
  field_confidence: z.record(z.string(), z.number().min(0).max(1)),
  overall_confidence: z.number().min(0).max(1),
  requires_human_review: z.boolean(),
  human_review_reason: z.string().nullable(),
});
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const CanonicalStageResultSchema = z.object({
  identity: IdentitySchema,
  product: ProductSchema,
  authentication: AuthenticationSchema,
  developer_access: DeveloperAccessSchema,
  api_surface: ApiSurfaceSchema,
  mcp: McpSchema,
  buildability: BuildabilitySchema,
  confidence: ConfidenceSchema,
});
export type CanonicalStageResult = z.infer<typeof CanonicalStageResultSchema>;

export const CriticResultSchema = z.object({
  challenged_fields: z.array(z.string()),
  critic_analysis: z.record(z.string(), z.string()),
  error_taxonomy_flags: z.array(z.string()),
});
export type CriticResult = z.infer<typeof CriticResultSchema>;

export const ChangeLogEntrySchema = z.object({
  timestamp: z.string(),
  field_changed: z.string(),
  old_value: z.any(),
  new_value: z.any(),
  reason: z.string(),
  verification_loop_trigger: z.enum([
    'deterministic_check',
    'critic_audit',
    'targeted_reresearch',
    'human_override',
  ]),
});
export type ChangeLogEntry = z.infer<typeof ChangeLogEntrySchema>;

export const PipelineMetadataSchema = z.object({
  pipeline_version: z.string(),
  current_stage: z.enum([
    'first_pass',
    'critic_audit',
    'targeted_reresearch',
    'final_agent',
    'human_reviewed',
    'failed',
  ]),
  errors: z.array(z.string()),
  unresolved_questions: z.array(z.string()),
});
export type PipelineMetadata = z.infer<typeof PipelineMetadataSchema>;

export const CanonicalResearchRecordSchema = z.object({
  identity: IdentitySchema,
  product: ProductSchema.optional(),
  authentication: AuthenticationSchema.optional(),
  developer_access: DeveloperAccessSchema.optional(),
  api_surface: ApiSurfaceSchema.optional(),
  mcp: McpSchema.optional(),
  buildability: BuildabilitySchema.optional(),
  confidence: ConfidenceSchema.optional(),

  evidence_pool: z.array(EvidenceRecordSchema).default([]),

  first_pass: CanonicalStageResultSchema.optional(),
  critic_result: CriticResultSchema.optional(),
  targeted_reresearch_result: CanonicalStageResultSchema.partial().optional(),
  final_agent_result: CanonicalStageResultSchema.optional(),
  human_corrected_result: CanonicalStageResultSchema.optional(),
  fast_scale_risk_flags: z.array(z.string()).optional(),

  change_log: z.array(ChangeLogEntrySchema).default([]),
  pipeline_metadata: PipelineMetadataSchema,
});
export type CanonicalResearchRecord = z.infer<typeof CanonicalResearchRecordSchema>;

export const BenchmarkAppSchema = z.object({
  assignment_number: z.number().int().positive(),
  app_name: z.string().min(1),
  website_hint: z.string(),
  assigned_category: z.string().min(1),
});
export type BenchmarkApp = z.infer<typeof BenchmarkAppSchema>;

export const BenchmarkDatasetSchema = z.array(BenchmarkAppSchema);
