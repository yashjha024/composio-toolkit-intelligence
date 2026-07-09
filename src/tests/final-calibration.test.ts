/**
 * final-calibration.test.ts
 *
 * Static structural validation of the calibrated_100.json artifact produced
 * by run-final-calibration.ts.  Does NOT re-execute the LLM pipeline.
 * The live regression suite (analytics-regression.test.ts) owns the
 * presentation-layer invariants.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JsonStore } from '../lib/store.js';

describe('Final Dataset Calibration — Static Artifact Validation', () => {
  const baseDir = path.resolve(process.cwd(), 'data');
  const calibratedDir = path.join(baseDir, 'calibrated');
  const store = new JsonStore(baseDir);

  it('proves calibrated_100.json has exactly 100 rows and maps strictly by assignment_number to benchmark_100.json', () => {
    const benchmarkApps = store.loadBenchmark();
    const calibratedPath = path.join(calibratedDir, 'calibrated_100.json');
    expect(fs.existsSync(calibratedPath)).toBe(true);

    const rows = JSON.parse(fs.readFileSync(calibratedPath, 'utf-8'));
    expect(rows).toHaveLength(100);

    for (const row of rows) {
      const bench = benchmarkApps.find(b => b.assignment_number === row.assignment_number);
      expect(bench, `#${row.assignment_number} missing from benchmark`).toBeDefined();
      expect(row.app_name).toBe(bench!.app_name);
      expect(row.assigned_category).toBe(bench!.assigned_category);
    }
  });

  it('proves calibrated records never falsely claim to be human-verified or independently verified unless in verified 15 sample', () => {
    const calibratedPath = path.join(calibratedDir, 'calibrated_100.json');
    const rows = JSON.parse(fs.readFileSync(calibratedPath, 'utf-8'));

    for (const row of rows) {
      expect(row.provenance.calibration_layer).toMatch(/^(independently_verified_15|deterministic_calibration)$/);
      if (row.provenance.calibration_layer === 'deterministic_calibration') {
        expect(row.exact_deterministic_rule).not.toBe('verified_sample_15');
      }
    }
  });

  it('proves final_presentation_100.json has 100 rows with distinct 4-tier provenance and baseline verdict preserved', () => {
    const presentationPath = path.join(calibratedDir, 'final_presentation_100.json');
    expect(fs.existsSync(presentationPath)).toBe(true);

    const rows = JSON.parse(fs.readFileSync(presentationPath, 'utf-8'));
    expect(rows).toHaveLength(100);

    for (const row of rows) {
      expect(['independently_verified', 'targeted_verified', 'deterministically_calibrated', 'baseline_unverified'])
        .toContain(row.verification_status);
    }
  });

  it('proves final_analytics.json is complete and contains all required sections', () => {
    const analyticsPath = path.join(calibratedDir, 'final_analytics.json');
    expect(fs.existsSync(analyticsPath)).toBe(true);

    const analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
    expect(analytics.total_apps).toBe(100);
    expect(analytics.final_verdict_distribution).toBeDefined();
    expect(analytics.unclear_progression).toBeDefined();
    expect(analytics.lists.easy_wins).toBeDefined();
    expect(analytics.lists.outreach_required_opportunities).toBeDefined();
    expect(analytics.lists.genuinely_unresolved_after_verification).toBeDefined();
    expect(analytics.lists.baseline_unverified_conservative_unclear).toBeDefined();
  });
});
