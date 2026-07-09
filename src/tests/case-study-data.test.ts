import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JsonStore } from '../lib/store.js';
import { generateCaseStudyData } from '../cli/generate-case-study-data.js';

describe('Case Study Data Contract Validation', () => {
  const baseDir = path.resolve(process.cwd(), 'data');
  const presentationDir = path.join(baseDir, 'presentation');
  let store: JsonStore;
  let benchmarkApps: any[];
  let caseStudyData: any;
  let analytics: any;

  beforeAll(async () => {
    store = new JsonStore(baseDir);
    benchmarkApps = store.loadBenchmark();
    await generateCaseStudyData();
    caseStudyData = JSON.parse(fs.readFileSync(path.join(presentationDir, 'case_study_data.json'), 'utf-8'));
    analytics = JSON.parse(fs.readFileSync(path.join(baseDir, 'calibrated', 'final_analytics.json'), 'utf-8'));
  });

  it('C1: exact_100_app_table_rows has exactly 100 rows joined strictly by assignment_number to benchmark_100.json', () => {
    expect(caseStudyData.exact_100_app_table_rows).toHaveLength(100);
    const benchMap = new Map(benchmarkApps.map(b => [b.assignment_number, b]));
    for (const row of caseStudyData.exact_100_app_table_rows) {
      const bench = benchMap.get(row.assignment_number);
      expect(bench, `Table row #${row.assignment_number} not found in benchmark`).toBeDefined();
      expect(row.app_name).toBe(bench!.app_name);
      expect(row.assigned_category).toBe(bench!.assigned_category);
      expect(row.website_hint).toBe(bench!.website_hint);
    }
  });

  it('C2: distributions and matrices exactly match source final_analytics.json', () => {
    expect(caseStudyData.distributions.final_verdict_distribution).toEqual(analytics.final_verdict_distribution);
    expect(caseStudyData.distributions.provenance_distribution).toEqual(analytics.final_provenance_distribution);
    expect(caseStudyData.distributions.auth_distribution).toEqual(analytics.distributions.auth_methods);
    expect(caseStudyData.distributions.access_model_distribution).toEqual(analytics.distributions.access_model);
    expect(caseStudyData.distributions.public_api_status_distribution).toEqual(analytics.distributions.public_api_status);
    expect(caseStudyData.distributions.api_breadth_distribution).toEqual(analytics.distributions.api_breadth);
    expect(caseStudyData.distributions.mcp_distribution).toEqual(analytics.distributions.mcp_status);
    expect(caseStudyData.matrices.category_by_verdict_matrix).toEqual(analytics.matrices.category_by_buildability);
    expect(caseStudyData.matrices.category_by_access_model_matrix).toEqual(analytics.matrices.category_by_access_model);
  });

  it('C3: opportunities_and_uncertainties lists exactly match source counts and contain correct items', () => {
    expect(caseStudyData.opportunities_and_uncertainties.build_now_opportunities).toHaveLength(caseStudyData.distributions.final_verdict_distribution.BUILD_NOW);
    expect(caseStudyData.opportunities_and_uncertainties.outreach_required_opportunities).toHaveLength(caseStudyData.distributions.final_verdict_distribution.OUTREACH_REQUIRED);
    expect(caseStudyData.opportunities_and_uncertainties.exactly_7_genuinely_unresolved_verified_apps).toHaveLength(7);
    expect(caseStudyData.opportunities_and_uncertainties['54_baseline_unverified_conservative_unclear_apps']).toHaveLength(54);
  });

  it('C4: verification_metrics matches accuracy_report.json metrics exactly', () => {
    expect(caseStudyData.verification_metrics.baseline_field_level_accuracy_percentage).toBe('68.33%');
    expect(caseStudyData.verification_metrics.post_verification_field_level_accuracy_percentage).toBe('97.5%');
    expect(caseStudyData.verification_metrics.absolute_percentage_point_improvement).toBe('+29.17 pp');
  });

  it('C5: every representative app in top_five_patterns maps strictly to benchmark_100.json and matches final verdict/provenance', () => {
    expect(caseStudyData.top_five_patterns).toHaveLength(5);
    const benchMap = new Map(benchmarkApps.map(b => [b.assignment_number, b]));
    const rowMap = new Map(caseStudyData.exact_100_app_table_rows.map((r: any) => [r.assignment_number, r]));

    for (const pat of caseStudyData.top_five_patterns) {
      expect(pat.headline).toBeDefined();
      expect(pat.supporting_metric).toBeDefined();
      expect(pat.categories_driving.length).toBeGreaterThan(0);
      expect(pat.representative_apps.length).toBeGreaterThanOrEqual(2);
      expect(pat.representative_apps.length).toBeLessThanOrEqual(4);
      expect(pat.source_fields_derived.length).toBeGreaterThan(0);

      for (const rep of pat.representative_apps) {
        const bench = benchMap.get(rep.assignment_number);
        expect(bench, `Pattern ${pat.pattern_id} app #${rep.assignment_number} missing from benchmark`).toBeDefined();
        expect(rep.app_name).toBe(bench!.app_name);
        expect(rep.assigned_category).toBe(bench!.assigned_category);

        const tableRow: any = rowMap.get(rep.assignment_number);
        expect(tableRow).toBeDefined();
        expect(rep.final_verdict).toBe(tableRow.final_presentation_verdict);
        expect(rep.verification_status).toBe(tableRow.verification_status);
      }
    }
  });

  it('C6: token_and_runtime_metrics are accurately populated from source usage and performance files', () => {
    expect(caseStudyData.token_and_runtime_metrics.provider_route).toBe('vertex-ai');
    expect(caseStudyData.token_and_runtime_metrics.model).toBe('gemini-2.5-flash');
    expect(caseStudyData.token_and_runtime_metrics.successful_llm_calls_total).toBeGreaterThan(0);
    expect(caseStudyData.token_and_runtime_metrics.cumulative_total_tokens).toBeGreaterThan(0);
    expect(caseStudyData.token_and_runtime_metrics.estimated_cumulative_cost_usd).toBeGreaterThan(0);
  });

  it('C7: unclear_progression is present, matches source final_analytics.json, and is internally consistent', () => {
    const prog = caseStudyData.unclear_progression;
    expect(prog).toBeDefined();
    expect(prog.baseline).toBe(76);
    expect(prog.after_deterministic_recalibration).toBe(70);
    expect(prog.after_targeted_verification).toBe(61);
    expect(prog.genuinely_unresolved_verified).toBe(7);
    expect(prog.baseline_unverified_conservative).toBe(54);
    // Monotonically decreasing
    expect(prog.baseline).toBeGreaterThanOrEqual(prog.after_deterministic_recalibration);
    expect(prog.after_deterministic_recalibration).toBeGreaterThanOrEqual(prog.after_targeted_verification);
    // Final UNCLEAR = genuinely_unresolved + baseline_unverified_conservative
    expect(prog.genuinely_unresolved_verified + prog.baseline_unverified_conservative).toBe(prog.after_targeted_verification);
    // Matches final_verdict_distribution.UNCLEAR
    expect(prog.after_targeted_verification).toBe(caseStudyData.distributions.final_verdict_distribution.UNCLEAR);
    // Matches source analytics
    expect(prog).toEqual(analytics.unclear_progression);
  });
});
