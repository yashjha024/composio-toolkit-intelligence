import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JsonStore } from '../lib/store.js';
import { runRebuildAnalytics } from '../cli/run-rebuild-analytics.js';

describe('Final Analytics Rebuild — Identity, Arithmetic & Provenance Regression Tests', () => {
  const baseDir = path.resolve(process.cwd(), 'data');
  const calibratedDir = path.join(baseDir, 'calibrated');
  const verificationDir = path.join(baseDir, 'verification');
  const targetedDir = path.join(calibratedDir, 'targeted_verified');
  let store: JsonStore;
  let benchmarkApps: any[];
  let presentation: any[];
  let analytics: any[];
  let calibrated: any[];

  beforeAll(async () => {
    store = new JsonStore(baseDir);
    benchmarkApps = store.loadBenchmark();
    // Re-run rebuild to ensure artifacts are always freshly regenerated from ground truth
    await runRebuildAnalytics();
    presentation = JSON.parse(fs.readFileSync(path.join(calibratedDir, 'final_presentation_100.json'), 'utf-8'));
    analytics = JSON.parse(fs.readFileSync(path.join(calibratedDir, 'final_analytics.json'), 'utf-8'));
    calibrated = JSON.parse(fs.readFileSync(path.join(calibratedDir, 'calibrated_100.json'), 'utf-8'));
  });

  // ----- 1. IDENTITY REGRESSIONS -----

  it('R1: all 100 final presentation rows have assignment_number, app_name, category exactly matching benchmark_100.json', () => {
    expect(presentation).toHaveLength(100);
    const benchIndex = new Map(benchmarkApps.map(b => [b.assignment_number, b]));
    for (const row of presentation) {
      const bench = benchIndex.get(row.assignment_number);
      expect(bench, `#${row.assignment_number} not found in benchmark`).toBeDefined();
      expect(row.app_name, `#${row.assignment_number} name mismatch`).toBe(bench!.app_name);
      expect(row.assigned_category, `#${row.assignment_number} category mismatch`).toBe(bench!.assigned_category);
    }
  });

  it('R2: known formerly-drifted identities resolve correctly from benchmark', () => {
    const benchIndex = new Map(benchmarkApps.map(b => [b.assignment_number, b]));
    const checks = [
      { id: 20, name: 'Gladly', cat: 'Support and Helpdesk' },
      { id: 22, name: 'Twilio', cat: 'Communications and Messaging' },
      { id: 23, name: 'Zoho Cliq', cat: 'Communications and Messaging' },
      { id: 24, name: 'Lark (Larksuite)', cat: 'Communications and Messaging' },
      { id: 25, name: 'Pumble', cat: 'Communications and Messaging' },
    ];
    for (const c of checks) {
      const bench = benchIndex.get(c.id);
      expect(bench?.app_name, `#${c.id} benchmark app_name`).toBe(c.name);
      expect(bench?.assigned_category, `#${c.id} benchmark category`).toBe(c.cat);
      const prow = presentation.find(r => r.assignment_number === c.id);
      expect(prow?.app_name, `#${c.id} presentation app_name`).toBe(c.name);
      expect(prow?.assigned_category, `#${c.id} presentation category`).toBe(c.cat);
    }
  });

  it('R3: all 100 calibrated rows identity-match benchmark_100.json (no name or category drift)', () => {
    expect(calibrated).toHaveLength(100);
    const benchIndex = new Map(benchmarkApps.map(b => [b.assignment_number, b]));
    for (const row of calibrated) {
      const bench = benchIndex.get(row.assignment_number);
      expect(bench, `#${row.assignment_number} missing from benchmark`).toBeDefined();
      expect(row.app_name, `#${row.assignment_number} calibrated name mismatch`).toBe(bench!.app_name);
    }
  });

  // ----- 2. ARITHMETIC REGRESSIONS -----

  it('R4: final verdict distribution sums to exactly 100', () => {
    const dist = analytics.final_verdict_distribution;
    const total = Object.values(dist).reduce((s: number, v: any) => s + v, 0);
    expect(total).toBe(100);
  });

  it('R5: final provenance distribution sums to exactly 100', () => {
    const dist = analytics.final_provenance_distribution;
    const total = Object.values(dist).reduce((s: number, v: any) => s + v, 0);
    expect(total).toBe(100);
  });

  it('R6: UNCLEAR stage progression is internally consistent', () => {
    const prog = analytics.unclear_progression;
    // Baseline >= after_det >= after_targeted
    expect(prog.baseline).toBeGreaterThanOrEqual(prog.after_deterministic_recalibration);
    expect(prog.after_deterministic_recalibration).toBeGreaterThanOrEqual(prog.after_targeted_verification);
    // Final UNCLEAR = genuinely_unresolved + baseline_unverified_conservative
    expect(prog.genuinely_unresolved_verified + prog.baseline_unverified_conservative).toBe(prog.after_targeted_verification);
    // after_targeted must equal final verdict dist UNCLEAR count
    expect(prog.after_targeted_verification).toBe(analytics.final_verdict_distribution.UNCLEAR);
  });

  it('R7: baseline UNCLEAR count matches calibrated.baseline_verdict === UNCLEAR count', () => {
    const baselineUnclear = calibrated.filter((r: any) => r.baseline_verdict === 'UNCLEAR').length;
    expect(analytics.unclear_progression.baseline).toBe(baselineUnclear);
    expect(baselineUnclear).toBe(76);
  });

  // ----- 3. LISTS-MATCH-COUNTS REGRESSIONS -----

  it('R8: easy_wins list length equals BUILD_NOW verdict count', () => {
    expect(analytics.lists.easy_wins.length).toBe(analytics.final_verdict_distribution.BUILD_NOW);
  });

  it('R9: outreach_required list length equals OUTREACH_REQUIRED verdict count', () => {
    expect(analytics.lists.outreach_required_opportunities.length).toBe(analytics.final_verdict_distribution.OUTREACH_REQUIRED);
  });

  it('R10: genuinely_unresolved + baseline_unverified_conservative list lengths match stated counts', () => {
    const prog = analytics.unclear_progression;
    expect(analytics.lists.genuinely_unresolved_after_verification.length).toBe(prog.genuinely_unresolved_verified);
    expect(analytics.lists.baseline_unverified_conservative_unclear.length).toBe(prog.baseline_unverified_conservative);
  });

  // ----- 4. NAMED EXAMPLE REGRESSIONS -----

  it('R11: every app in easy_wins has final_presentation_verdict=BUILD_NOW and correct benchmark identity', () => {
    const benchIndex = new Map(benchmarkApps.map(b => [b.assignment_number, b]));
    for (const entry of analytics.lists.easy_wins) {
      const id = parseInt(entry.match(/^#(\d+)/)?.[1] ?? '-1');
      const appName = entry.replace(/^#\d+\s+/, '');
      const bench = benchIndex.get(id);
      expect(bench, `easy_win #${id} missing from benchmark`).toBeDefined();
      expect(appName).toBe(bench!.app_name);
      const prow = presentation.find(r => r.assignment_number === id);
      expect(prow?.final_presentation_verdict, `easy_win #${id} verdict`).toBe('BUILD_NOW');
    }
  });

  it('R12: every app in outreach_required has final_presentation_verdict=OUTREACH_REQUIRED and correct identity', () => {
    const benchIndex = new Map(benchmarkApps.map(b => [b.assignment_number, b]));
    for (const entry of analytics.lists.outreach_required_opportunities) {
      const id = parseInt(entry.match(/^#(\d+)/)?.[1] ?? '-1');
      const appName = entry.replace(/^#\d+\s+/, '');
      const bench = benchIndex.get(id);
      expect(bench, `outreach #${id} missing from benchmark`).toBeDefined();
      expect(appName).toBe(bench!.app_name);
      const prow = presentation.find(r => r.assignment_number === id);
      expect(prow?.final_presentation_verdict, `outreach #${id} verdict`).toBe('OUTREACH_REQUIRED');
    }
  });

  it('R13: every app in genuinely_unresolved_after_verification has final_presentation_verdict=UNCLEAR and was externally verified', () => {
    const verifiedIds = new Set<number>();
    if (fs.existsSync(verificationDir)) {
      for (const f of fs.readdirSync(verificationDir)) {
        if (!f.endsWith('_verified.json')) continue;
        try { const d = JSON.parse(fs.readFileSync(path.join(verificationDir, f), 'utf-8')); if (d?.assignment_number) verifiedIds.add(d.assignment_number); } catch {}
      }
    }
    if (fs.existsSync(targetedDir)) {
      for (const f of fs.readdirSync(targetedDir)) {
        if (!f.endsWith('_targeted.json')) continue;
        try { const d = JSON.parse(fs.readFileSync(path.join(targetedDir, f), 'utf-8')); if (d?.assignment_number) verifiedIds.add(d.assignment_number); } catch {}
      }
    }

    const benchIndex = new Map(benchmarkApps.map(b => [b.assignment_number, b]));
    for (const entry of analytics.lists.genuinely_unresolved_after_verification) {
      const id = parseInt(entry.match(/^#(\d+)/)?.[1] ?? '-1');
      const bench = benchIndex.get(id);
      expect(bench, `genuinely_unresolved #${id} missing from benchmark`).toBeDefined();
      const prow = presentation.find(r => r.assignment_number === id);
      expect(prow?.final_presentation_verdict, `genuinely_unresolved #${id} verdict`).toBe('UNCLEAR');
      expect(verifiedIds.has(id), `genuinely_unresolved #${id} should be externally verified`).toBe(true);
    }
  });

  it('R14: #11 Zendesk final_presentation_verdict = BUILD_NOW (targeted verification supersedes independent verification UNCLEAR)', () => {
    const zendesk = presentation.find(r => r.assignment_number === 11);
    expect(zendesk?.app_name).toBe('Zendesk');
    expect(zendesk?.final_presentation_verdict).toBe('BUILD_NOW');
    expect(zendesk?.verification_status).toBe('targeted_verified');
  });

  it('R15: Freshdesk (#13) final_presentation_verdict = OUTREACH_REQUIRED per targeted verification artifact', () => {
    const freshdesk = presentation.find(r => r.assignment_number === 13);
    expect(freshdesk?.app_name).toBe('Freshdesk');
    expect(freshdesk?.final_presentation_verdict).toBe('OUTREACH_REQUIRED');
  });

  it('R16: no presentation row uses hardcoded stale names (Dixa, Microsoft Teams, Zoom, Google Meet, Webex)', () => {
    const staleNames = ['Dixa', 'Microsoft Teams', 'Zoom', 'Google Meet', 'Webex'];
    for (const row of presentation) {
      for (const staleName of staleNames) {
        expect(row.app_name, `Row #${row.assignment_number} contains stale name`).not.toBe(staleName);
      }
    }
  });

  // ----- 5. PROVENANCE SEMANTICS -----

  it('R17: no baseline_unverified row is labeled as independently_verified or targeted_verified', () => {
    // Apps not in any verification pool should be baseline_unverified
    const verifiedIds = new Set<number>();
    if (fs.existsSync(verificationDir)) {
      for (const f of fs.readdirSync(verificationDir)) {
        if (!f.endsWith('_verified.json')) continue;
        try { const d = JSON.parse(fs.readFileSync(path.join(verificationDir, f), 'utf-8')); if (d?.assignment_number) verifiedIds.add(d.assignment_number); } catch {}
      }
    }
    if (fs.existsSync(targetedDir)) {
      for (const f of fs.readdirSync(targetedDir)) {
        if (!f.endsWith('_targeted.json')) continue;
        try { const d = JSON.parse(fs.readFileSync(path.join(targetedDir, f), 'utf-8')); if (d?.assignment_number) verifiedIds.add(d.assignment_number); } catch {}
      }
    }
    const detChangedIds = new Set(calibrated.filter((r: any) => r.verdict_changed && r.exact_deterministic_rule !== 'verified_sample_15').map((r: any) => r.assignment_number));

    for (const row of presentation) {
      const isExtVerified = verifiedIds.has(row.assignment_number);
      const isDetChanged = detChangedIds.has(row.assignment_number);
      if (!isExtVerified && !isDetChanged) {
        expect(row.verification_status, `#${row.assignment_number} is unverified but labeled ${row.verification_status}`).toBe('baseline_unverified');
      }
    }
  });

  it('R18: exact provenance distribution matches row-level counts directly derived from presentation rows (independently_verified=14, targeted_verified=15, deterministically_calibrated=3, baseline_unverified=68)', () => {
    const provCounts: Record<string, number> = {
      independently_verified: 0,
      targeted_verified: 0,
      deterministically_calibrated: 0,
      baseline_unverified: 0
    };
    for (const row of presentation) {
      provCounts[row.verification_status] = (provCounts[row.verification_status] || 0) + 1;
    }
    expect(provCounts.independently_verified).toBe(14);
    expect(provCounts.targeted_verified).toBe(15);
    expect(provCounts.deterministically_calibrated).toBe(3);
    expect(provCounts.baseline_unverified).toBe(68);
    expect(analytics.final_provenance_distribution).toEqual(provCounts);
    const sum = Object.values(provCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});
