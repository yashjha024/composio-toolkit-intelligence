/**
 * run-rebuild-analytics.ts
 *
 * Rebuilds ONLY the presentation/analytics layer from existing persisted artifacts.
 * Zero LLM calls. Zero modifications to data/records/, data/verification/, data/calibrated/targeted_verified/.
 *
 * Ground truth layer priority (highest → lowest):
 *   1. targeted_verified result (for apps in targeted set — supersedes independent verification)
 *   2. independently_verified_15 result (for apps in 15-app verified sample NOT in targeted set)
 *   3. deterministic_calibration result (where calibrated_verdict ≠ baseline_verdict and rule ≠ verified_sample_15)
 *   4. baseline_unverified (everything else — remains as calibrated_verdict, provenance = baseline_unverified)
 */

import fs from 'fs';
import path from 'path';
import { JsonStore } from '../lib/store.js';

async function main() {
  console.log('================================================================');
  console.log('     FINAL ANALYTICS REBUILD — ZERO API CALLS — LOCAL ONLY      ');
  console.log('================================================================');

  const baseDir = path.resolve(process.cwd(), 'data');
  const calibratedDir = path.join(baseDir, 'calibrated');
  const verificationDir = path.join(baseDir, 'verification');
  const targetedDir = path.join(calibratedDir, 'targeted_verified');

  const store = new JsonStore(baseDir);
  const benchmarkApps = store.loadBenchmark();

  // Build identity index from benchmark — the ONLY identity source
  const benchIndex = new Map<number, { app_name: string; assigned_category: string; website_hint: string }>();
  for (const b of benchmarkApps) {
    benchIndex.set(b.assignment_number, {
      app_name: b.app_name,
      assigned_category: b.assigned_category,
      website_hint: b.website_hint,
    });
  }

  // Load calibrated_100.json (deterministic layer)
  const calibratedPath = path.join(calibratedDir, 'calibrated_100.json');
  if (!fs.existsSync(calibratedPath)) throw new Error('calibrated_100.json missing');
  const calibratedRows: any[] = JSON.parse(fs.readFileSync(calibratedPath, 'utf-8'));
  if (calibratedRows.length !== 100) throw new Error(`calibrated_100.json has ${calibratedRows.length} rows, expected 100`);

  // IDENTITY ASSERTION: every calibrated row must match benchmark exactly
  for (const row of calibratedRows) {
    const bench = benchIndex.get(row.assignment_number);
    if (!bench) throw new Error(`[Abort] calibrated_100.json has assignment_number #${row.assignment_number} not found in benchmark_100.json`);
    if (bench.app_name !== row.app_name) throw new Error(`[Abort] #${row.assignment_number} name mismatch: calibrated="${row.app_name}" benchmark="${bench.app_name}"`);
    if (bench.assigned_category !== row.assigned_category) throw new Error(`[Abort] #${row.assignment_number} category mismatch: calibrated="${row.assigned_category}" benchmark="${bench.assigned_category}"`);
  }
  console.log('[✓] All 100 calibrated rows identity-validated against benchmark_100.json');

  // Load independently_verified_15 sample
  const verifiedMap = new Map<number, any>();
  if (fs.existsSync(verificationDir)) {
    for (const f of fs.readdirSync(verificationDir)) {
      if (!f.endsWith('_verified.json')) continue;
      try {
        const d = JSON.parse(fs.readFileSync(path.join(verificationDir, f), 'utf-8'));
        if (d?.assignment_number && d.verified_fields) {
          verifiedMap.set(d.assignment_number, d);
        }
      } catch {}
    }
  }
  console.log(`[✓] Loaded ${verifiedMap.size} independently verified records`);

  // Load targeted verification results
  const targetedMap = new Map<number, any>();
  if (fs.existsSync(targetedDir)) {
    for (const f of fs.readdirSync(targetedDir)) {
      if (!f.endsWith('_targeted.json')) continue;
      try {
        const d = JSON.parse(fs.readFileSync(path.join(targetedDir, f), 'utf-8'));
        if (d?.assignment_number && d.targeted_result) {
          targetedMap.set(d.assignment_number, d);
        }
      } catch {}
    }
  }
  console.log(`[✓] Loaded ${targetedMap.size} targeted verification records`);

  // STAGE-BY-STAGE UNCLEAR COUNTS
  const baselineUnclearCount = calibratedRows.filter(r => r.baseline_verdict === 'UNCLEAR').length;
  const afterDetRecalUnclearCount = calibratedRows.filter(r => r.calibrated_verdict === 'UNCLEAR').length;
  const determinismChangedCount = calibratedRows.filter(r => r.verdict_changed && r.exact_deterministic_rule !== 'verified_sample_15').length;

  // BUILD FINAL PRESENTATION LAYER
  const finalPresentationRows: any[] = [];
  const finalVerdictDist: Record<string, number> = {
    BUILD_NOW: 0, BUILD_WITH_CAVEATS: 0, OUTREACH_REQUIRED: 0, BLOCKED_LOW_PRIORITY: 0, UNCLEAR: 0,
  };
  const provenanceDist: Record<string, number> = {
    independently_verified: 0,
    targeted_verified: 0,
    deterministically_calibrated: 0,
    baseline_unverified: 0,
  };

  // Per-app analytics accumulators
  const authDist: Record<string, number> = {};
  const accessDist: Record<string, number> = {};
  const publicApiDist: Record<string, number> = {};
  const apiBreadthDist: Record<string, number> = {};
  const mcpDist: Record<string, number> = {};
  const blockersDist: Record<string, number> = {};
  const catAccessMatrix: Record<string, Record<string, number>> = {};
  const catVerdictMatrix: Record<string, Record<string, number>> = {};

  const easyWins: { id: number; app_name: string; category: string }[] = [];
  const outreachRequiredList: { id: number; app_name: string; category: string }[] = [];
  const genuinelyUnresolvedVerified: { id: number; app_name: string; category: string }[] = [];
  const baselineUnverifiedUnclear: { id: number; app_name: string; category: string }[] = [];

  let afterTargetedUnclearCount = 0;

  for (const calRow of calibratedRows) {
    const bench = benchIndex.get(calRow.assignment_number)!;
    const { app_name, assigned_category } = bench; // Always from benchmark

    // Determine final verdict and provenance using priority order
    // Priority: targeted_verified > independently_verified_15 > deterministic_calibration > baseline_unverified
    let finalVerdict = calRow.calibrated_verdict;
    let verificationStatus: 'independently_verified' | 'targeted_verified' | 'deterministically_calibrated' | 'baseline_unverified';
    let evidenceUrls: string[] = [];
    let remainingUncertainty: string[] = calRow.remaining_uncertainty_reasons || [];
    let finalAuth: string[] = calRow.baseline_facts.extracted_auth_methods;
    let finalAccess: string = calRow.baseline_facts.access_model;
    let finalPublicApi: string = calRow.baseline_facts.public_api_status;
    let finalBreadth: string = calRow.baseline_facts.api_breadth;
    let finalMcp: string = calRow.baseline_facts.mcp_status;
    let finalBlocker: string | null = calRow.baseline_facts.primary_blocker;

    if (targetedMap.has(calRow.assignment_number)) {
      // Targeted verification is highest resolution (supersedes independent verification)
      const targ = targetedMap.get(calRow.assignment_number)!;
      finalVerdict = targ.targeted_result.verified_verdict;
      verificationStatus = 'targeted_verified';
      finalAuth = targ.targeted_result.verified_auth_methods || finalAuth;
      finalAccess = targ.targeted_result.verified_access_model || finalAccess;
      finalPublicApi = targ.targeted_result.verified_public_api_status || finalPublicApi;
      finalBreadth = targ.targeted_result.verified_api_breadth || finalBreadth;
      finalBlocker = targ.targeted_result.primary_blocker ?? finalBlocker;
      if (targ.targeted_result.evidence_url) evidenceUrls.push(targ.targeted_result.evidence_url);
      remainingUncertainty = targ.targeted_result.remaining_uncertainty || [];
    } else if (verifiedMap.has(calRow.assignment_number)) {
      // Independently verified 15-app sample (not in targeted set)
      const ver = verifiedMap.get(calRow.assignment_number)!;
      finalVerdict = ver.verified_fields.buildability_verdict.verified_value;
      verificationStatus = 'independently_verified';
      finalAuth = ver.verified_fields.auth_methods?.verified_value || finalAuth;
      finalAccess = ver.verified_fields.access_model?.verified_value || finalAccess;
      finalPublicApi = ver.verified_fields.public_api_status?.verified_value || finalPublicApi;
      finalBreadth = ver.verified_fields.api_breadth?.verified_value || finalBreadth;
      finalBlocker = ver.verified_fields.primary_blocker?.verified_value ?? finalBlocker;
      if (ver.verified_fields.buildability_verdict?.evidence_url) evidenceUrls.push(ver.verified_fields.buildability_verdict.evidence_url);
      if (finalVerdict === 'UNCLEAR' && ver.verified_fields.unclear_diagnosis === 'genuinely_unclear') {
        remainingUncertainty = ['genuinely_unclear_per_verified_audit'];
      } else {
        remainingUncertainty = [];
      }
    } else if (calRow.verdict_changed && calRow.exact_deterministic_rule !== 'verified_sample_15') {
      // Deterministic recalibration resolved a false UNCLEAR
      verificationStatus = 'deterministically_calibrated';
      remainingUncertainty = [];
    } else {
      // Baseline raw result — unverified
      verificationStatus = 'baseline_unverified';
    }

    finalVerdictDist[finalVerdict] = (finalVerdictDist[finalVerdict] || 0) + 1;
    provenanceDist[verificationStatus]++;
    if (finalVerdict === 'UNCLEAR') afterTargetedUnclearCount++;

    // Category and analytics matrices (identity always from benchmark)
    if (!catAccessMatrix[assigned_category]) catAccessMatrix[assigned_category] = {};
    catAccessMatrix[assigned_category][finalAccess] = (catAccessMatrix[assigned_category][finalAccess] || 0) + 1;
    if (!catVerdictMatrix[assigned_category]) catVerdictMatrix[assigned_category] = {};
    catVerdictMatrix[assigned_category][finalVerdict] = (catVerdictMatrix[assigned_category][finalVerdict] || 0) + 1;

    for (const a of (Array.isArray(finalAuth) ? finalAuth : [finalAuth])) {
      authDist[a] = (authDist[a] || 0) + 1;
    }
    accessDist[finalAccess] = (accessDist[finalAccess] || 0) + 1;
    publicApiDist[finalPublicApi] = (publicApiDist[finalPublicApi] || 0) + 1;
    apiBreadthDist[finalBreadth] = (apiBreadthDist[finalBreadth] || 0) + 1;
    mcpDist[finalMcp] = (mcpDist[finalMcp] || 0) + 1;
    if (finalBlocker) blockersDist[finalBlocker] = (blockersDist[finalBlocker] || 0) + 1;

    if (finalVerdict === 'BUILD_NOW') {
      easyWins.push({ id: calRow.assignment_number, app_name, category: assigned_category });
    } else if (finalVerdict === 'OUTREACH_REQUIRED') {
      outreachRequiredList.push({ id: calRow.assignment_number, app_name, category: assigned_category });
    }
    if (finalVerdict === 'UNCLEAR') {
      const isExternallyVerified = targetedMap.has(calRow.assignment_number) || verifiedMap.has(calRow.assignment_number);
      if (isExternallyVerified) {
        genuinelyUnresolvedVerified.push({ id: calRow.assignment_number, app_name, category: assigned_category });
      } else {
        baselineUnverifiedUnclear.push({ id: calRow.assignment_number, app_name, category: assigned_category });
      }
    }

    finalPresentationRows.push({
      assignment_number: calRow.assignment_number,
      app_name, // Always from benchmark identity
      assigned_category, // Always from benchmark identity
      website_hint: bench.website_hint,
      original_baseline_facts: calRow.baseline_facts,
      original_baseline_verdict: calRow.baseline_verdict,
      calibrated_verdict: calRow.calibrated_verdict,
      final_presentation_verdict: finalVerdict,
      verification_status: verificationStatus,
      evidence_urls: evidenceUrls,
      remaining_uncertainty: remainingUncertainty,
      risk_flags: [],
    });
  }

  // VERIFICATION: all counts sum to 100
  const verdictSum = Object.values(finalVerdictDist).reduce((a, b) => a + b, 0);
  const provSum = Object.values(provenanceDist).reduce((a, b) => a + b, 0);
  if (verdictSum !== 100) throw new Error(`[FAIL] Verdict sum = ${verdictSum}, expected 100`);
  if (provSum !== 100) throw new Error(`[FAIL] Provenance sum = ${provSum}, expected 100`);

  // VERIFICATION: genuinely_unresolved + baseline_unverified = afterTargetedUnclearCount
  if (genuinelyUnresolvedVerified.length + baselineUnverifiedUnclear.length !== afterTargetedUnclearCount) {
    throw new Error(`[FAIL] UNCLEAR lists don't sum: ${genuinelyUnresolvedVerified.length} + ${baselineUnverifiedUnclear.length} ≠ ${afterTargetedUnclearCount}`);
  }

  const unclearProgression = {
    baseline: baselineUnclearCount,
    after_deterministic_recalibration: afterDetRecalUnclearCount,
    changed_by_deterministic_rules: determinismChangedCount,
    after_targeted_verification: afterTargetedUnclearCount,
    genuinely_unresolved_verified: genuinelyUnresolvedVerified.length,
    baseline_unverified_conservative: baselineUnverifiedUnclear.length,
  };

  const finalAnalytics = {
    total_apps: 100,
    unclear_progression: unclearProgression,
    final_verdict_distribution: finalVerdictDist,
    final_provenance_distribution: provenanceDist,
    distributions: {
      auth_methods: authDist,
      access_model: accessDist,
      public_api_status: publicApiDist,
      api_breadth: apiBreadthDist,
      mcp_status: mcpDist,
      most_common_blockers: blockersDist,
    },
    matrices: {
      category_by_access_model: catAccessMatrix,
      category_by_buildability: catVerdictMatrix,
    },
    lists: {
      easy_wins: easyWins.map(e => `#${e.id} ${e.app_name}`),
      outreach_required_opportunities: outreachRequiredList.map(e => `#${e.id} ${e.app_name}`),
      genuinely_unresolved_after_verification: genuinelyUnresolvedVerified.map(e => `#${e.id} ${e.app_name}`),
      baseline_unverified_conservative_unclear: baselineUnverifiedUnclear.map(e => `#${e.id} ${e.app_name}`),
    },
  };

  // Write artifacts
  const presentationPath = path.join(calibratedDir, 'final_presentation_100.json');
  const analyticsPath = path.join(calibratedDir, 'final_analytics.json');
  const tmp1 = `${presentationPath}.tmp.${Date.now()}`;
  const tmp2 = `${analyticsPath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmp1, JSON.stringify(finalPresentationRows, null, 2), 'utf-8');
  fs.renameSync(tmp1, presentationPath);
  fs.writeFileSync(tmp2, JSON.stringify(finalAnalytics, null, 2), 'utf-8');
  fs.renameSync(tmp2, analyticsPath);

  console.log('\n[✓] Saved final_presentation_100.json and final_analytics.json');
  console.log('--- FINAL COUNTS ---');
  console.log('UNCLEAR progression:', JSON.stringify(unclearProgression));
  console.log('Final verdict dist:', JSON.stringify(finalVerdictDist));
  console.log('Provenance dist:', JSON.stringify(provenanceDist));
  console.log('Easy wins:', easyWins.length);
  console.log('Outreach required:', outreachRequiredList.length);
  console.log('Genuinely unresolved (externally verified):', genuinelyUnresolvedVerified.length, JSON.stringify(genuinelyUnresolvedVerified.map(e => `#${e.id} ${e.app_name}`)));
  console.log('Baseline unverified conservative UNCLEAR:', baselineUnverifiedUnclear.length);
}

if (process.env.NODE_ENV !== 'test') {
  main().catch(err => { console.error(err); process.exit(1); });
}

export { main as runRebuildAnalytics };
