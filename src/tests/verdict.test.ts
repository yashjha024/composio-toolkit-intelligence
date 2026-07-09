import { describe, it, expect } from 'vitest';
import { computeProvisionalVerdict, VerdictInput } from '../engine/verdict.js';

describe('Provisional v1 Deterministic Verdict Engine', () => {
  it('assigns build_now when public API is broad and credentials are self-serve free', () => {
    const input: VerdictInput = {
      developer_access: {
        access_model: 'self_serve_free',
        credentials_obtainable_without_human_approval: true,
      },
      api_surface: {
        public_api: 'yes',
        api_styles: ['REST'],
        api_breadth: 'broad',
      },
    };

    const result = computeProvisionalVerdict(input);
    expect(result.verdict).toBe('build_now');
    expect(result.primary_blocker).toBeNull();
    expect(result.is_provisional_rule).toBe(false);
  });

  it('assigns outreach_required when API is public but credentials are partner gated', () => {
    const input: VerdictInput = {
      developer_access: {
        access_model: 'partner_gated',
        credentials_obtainable_without_human_approval: false,
      },
      api_surface: {
        public_api: 'yes',
        api_styles: ['REST'],
        api_breadth: 'moderate',
      },
    };

    const result = computeProvisionalVerdict(input);
    expect(result.verdict).toBe('outreach_required');
    expect(result.primary_blocker).toContain('partner program approval');
    expect(result.is_provisional_rule).toBe(false);
  });

  it('assigns blocked_low_priority when there is no public API', () => {
    const input: VerdictInput = {
      developer_access: {
        access_model: 'unclear',
        credentials_obtainable_without_human_approval: 'unknown',
      },
      api_surface: {
        public_api: 'no',
        api_styles: [],
        api_breadth: 'none',
      },
    };

    const result = computeProvisionalVerdict(input);
    expect(result.verdict).toBe('blocked_low_priority');
    expect(result.primary_blocker).toContain('No documented public API available');
    expect(result.is_provisional_rule).toBe(false);
  });

  it('assigns unclear when critical facts about public API availability are unclear', () => {
    const input: VerdictInput = {
      developer_access: {
        access_model: 'self_serve_free',
        credentials_obtainable_without_human_approval: true,
      },
      api_surface: {
        public_api: 'unclear',
        api_styles: ['REST'],
        api_breadth: 'unclear',
      },
    };

    const result = computeProvisionalVerdict(input);
    expect(result.verdict).toBe('unclear');
    expect(result.primary_blocker).toContain('Research data ambiguous or insufficient');
    expect(result.is_provisional_rule).toBe(false);
  });

  it('handles provisional admin_gated rule based on vendor approval vs normal workspace admin', () => {
    // Case A: normal workspace admin without vendor contact
    const workspaceAdminInput: VerdictInput = {
      developer_access: {
        access_model: 'admin_gated',
        credentials_obtainable_without_human_approval: true,
        access_notes: 'Requires workspace admin rights in Org settings.',
      },
      api_surface: {
        public_api: 'yes',
        api_styles: ['REST'],
        api_breadth: 'broad',
      },
    };
    const resultA = computeProvisionalVerdict(workspaceAdminInput);
    expect(resultA.verdict).toBe('build_with_caveats');
    expect(resultA.is_provisional_rule).toBe(true);
    expect(resultA.verdict_reasoning).toContain('[PROVISIONAL V1]');

    // Case B: admin gated but explicitly requires external vendor approval
    const vendorAdminInput: VerdictInput = {
      developer_access: {
        access_model: 'admin_gated',
        credentials_obtainable_without_human_approval: false,
        access_notes: 'Requires vendor approval and contacting support to enable API access.',
      },
      api_surface: {
        public_api: 'yes',
        api_styles: ['REST'],
        api_breadth: 'broad',
      },
    };
    const resultB = computeProvisionalVerdict(vendorAdminInput);
    expect(resultB.verdict).toBe('outreach_required');
    expect(resultB.is_provisional_rule).toBe(true);
    expect(resultB.verdict_reasoning).toContain('[PROVISIONAL V1]');
  });
});
