import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { DuckDuckGoSearchProvider } from '../providers/search/duckduckgo.js';
import { FastCheerioFetcherProvider } from '../providers/fetcher/cheerio.js';
import { GeminiLlmProvider } from '../providers/llm/gemini.js';
import { FastResearchPipeline } from '../engine/fast-pipeline.js';
import { JsonStore } from '../lib/store.js';

async function runGenericFastScaleBenchmark() {
  console.log('================================================================');
  console.log('     TOOLKIT INTELLIGENCE ENGINE — GENERIC FAST SCALE RUNNER    ');
  console.log('================================================================\n');

  const store = new JsonStore(path.resolve(process.cwd(), 'data'));
  const searchProvider = new DuckDuckGoSearchProvider();
  const fetcherProvider = new FastCheerioFetcherProvider();
  const llmProvider = new GeminiLlmProvider('gemini-2.5-flash');

  const fastPipeline = new FastResearchPipeline(searchProvider, fetcherProvider, llmProvider, store);

  const benchmarkFile = path.resolve(process.cwd(), 'data/benchmark_100.json');
  if (!fs.existsSync(benchmarkFile)) {
    console.error(`[Error] Benchmark file not found at ${benchmarkFile}`);
    process.exit(1);
  }

  const allApps: Array<{
    assignment_number: number;
    app_name: string;
    website_hint: string;
    assigned_category: string;
  }> = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'));

  let coveredCount = 0;
  let newlyCompletedCount = 0;
  let totalRuntimeMs = 0;
  let totalLlmCalls = 0;
  let providerErrorOccurred = false;
  let firstUnfinishedReported = false;
  const failedApps: Array<{ id: number; name: string; error: string }> = [];
  const providerErrors: string[] = [];

  // Inspect existing records to count current baseline and find first unfinished
  for (const app of allApps) {
    const existing = store.getRecord(app.assignment_number, app.app_name);
    if (existing && (existing.final_agent_result || existing.first_pass)) {
      coveredCount++;
    } else if (!firstUnfinishedReported) {
      console.log(`[Status] First unfinished app detected: #${app.assignment_number} (${app.app_name})`);
      firstUnfinishedReported = true;
    }
  }

  console.log(`[Status] Baseline coverage before run: ${coveredCount}/100. Unfinished: ${allApps.length - coveredCount}\n`);

  for (const app of allApps) {
    const existing = store.getRecord(app.assignment_number, app.app_name);
    if (existing && (existing.final_agent_result || existing.first_pass)) {
      // Already covered, skip without modifying
      continue;
    }

    console.log(`\n----------------------------------------------------------------`);
    console.log(`[Processing [#${app.assignment_number}] ${app.app_name} (${app.assigned_category})...`);
    console.log(`----------------------------------------------------------------`);

    try {
      const startTime = Date.now();
      const res = await fastPipeline.runFastAppResearch(
        app.assignment_number,
        app.app_name,
        app.website_hint,
        app.assigned_category
      );
      const runtimeMs = Date.now() - startTime;
      totalRuntimeMs += runtimeMs;
      totalLlmCalls += res.stats.llmCallsCount;
      coveredCount++;
      newlyCompletedCount++;

      const verdict = res.record.first_pass?.buildability.verdict?.toUpperCase() || 'UNKNOWN';
      const riskFlags = res.stats.riskFlags || res.record.fast_scale_risk_flags || [];

      console.log(`>>> [covered/100: ${coveredCount}/100] ${app.app_name} — ${verdict} — ${riskFlags.length} risk flags`);
    } catch (err: any) {
      const errMsg = err?.message || String(err);

      if (
        errMsg.includes('429') ||
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('limit: 0') ||
        errMsg.includes('not found')
      ) {
        console.error(`\n[Provider Error Detected] Unrecoverable Vertex AI error on #${app.assignment_number} (${app.app_name}): ${errMsg}`);
        console.log(`Stopping cleanly and preserving all completed work. First unfinished app is #${app.assignment_number} (${app.app_name}).`);
        providerErrorOccurred = true;
        providerErrors.push(`[#${app.assignment_number} ${app.app_name}] ${errMsg}`);
        break;
      } else {
        console.error(`[Error] App #${app.assignment_number} (${app.app_name}) failed for non-provider reason: ${errMsg}`);
        failedApps.push({ id: app.assignment_number, name: app.app_name, error: errMsg });
      }
    }

    // 10s inter-app cooldown
    if (coveredCount < allApps.length && !providerErrorOccurred) {
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  // Scan all 100 records for final metrics
  let totalFinalCoverage = 0;
  const verdictDistribution: Record<string, number> = {
    BUILD_NOW: 0,
    NEEDS_CONFIG: 0,
    NEEDS_PROXY: 0,
    DO_NOT_BUILD: 0,
    UNCLEAR: 0,
  };
  let recordsWithRiskFlags = 0;
  const riskFlagCounts: Record<string, number> = {};
  const unfinishedAppsList: Array<{ id: number; name: string }> = [];

  for (const app of allApps) {
    const existing = store.getRecord(app.assignment_number, app.app_name);
    if (existing && (existing.final_agent_result || existing.first_pass)) {
      totalFinalCoverage++;
      let verdict = 'UNCLEAR';
      if (existing.final_agent_result) {
        verdict = existing.final_agent_result.verdict?.toUpperCase() || 'UNCLEAR';
      } else if (existing.first_pass) {
        verdict = existing.first_pass.buildability?.verdict?.toUpperCase() || 'UNCLEAR';
      }
      verdictDistribution[verdict] = (verdictDistribution[verdict] || 0) + 1;

      const flags = existing.fast_scale_risk_flags || existing.pipeline_metadata?.unresolved_questions || [];
      if (flags && flags.length > 0) {
        recordsWithRiskFlags++;
        for (const flag of flags) {
          riskFlagCounts[flag] = (riskFlagCounts[flag] || 0) + 1;
        }
      }
    } else {
      unfinishedAppsList.push({ id: app.assignment_number, name: app.app_name });
    }
  }

  const riskFlagPercentage = totalFinalCoverage > 0 ? ((recordsWithRiskFlags / totalFinalCoverage) * 100).toFixed(1) : '0.0';
  const topRiskFlags = Object.entries(riskFlagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log(`\n================================================================`);
  console.log(`                 100-APP BENCHMARK FINAL REPORT                 `);
  console.log(`================================================================`);
  console.log(`1. Total benchmark coverage out of 100: ${totalFinalCoverage}/100`);
  console.log(`2. Apps newly completed in this run: ${newlyCompletedCount}`);
  console.log(`3. Total runtime: ${(totalRuntimeMs / 1000).toFixed(2)}s (${(totalRuntimeMs / 60000).toFixed(2)} mins)`);
  console.log(`4. Successful LLM calls: ${totalLlmCalls}`);
  console.log(`5. Failed apps (non-provider): ${failedApps.length > 0 ? failedApps.map(f => `#${f.id} ${f.name} (${f.error})`).join('; ') : 'NONE'}`);
  console.log(`6. Provider/quota/authentication errors: ${providerErrors.length > 0 ? providerErrors.join('; ') : 'NONE'}`);
  console.log(`7. Verdict distribution across ${totalFinalCoverage} covered records:`);
  for (const [v, count] of Object.entries(verdictDistribution)) {
    console.log(`   - ${v}: ${count} (${((count / (totalFinalCoverage || 1)) * 100).toFixed(1)}%)`);
  }
  console.log(`8. Records carrying risk flags: ${recordsWithRiskFlags} / ${totalFinalCoverage} (${riskFlagPercentage}%)`);
  console.log(`9. Top risk flags by frequency:`);
  if (topRiskFlags.length === 0) {
    console.log(`   - NONE`);
  } else {
    for (const [flag, count] of topRiskFlags) {
      console.log(`   - ${flag}: ${count} occurrences`);
    }
  }
  console.log(`10. Exact list of apps still unfinished (${unfinishedAppsList.length} total):`);
  if (unfinishedAppsList.length === 0) {
    console.log(`    - NONE! All 100 benchmark apps completed.`);
  } else {
    for (const u of unfinishedAppsList) {
      console.log(`    - #${u.id} ${u.name}`);
    }
  }

  if (llmProvider.getCumulativeUsageSummary) {
    console.log(`\n--- Cumulative Vertex AI Usage & Estimated Cost ---`);
    console.log(JSON.stringify(llmProvider.getCumulativeUsageSummary(), null, 2));
  }
}

runGenericFastScaleBenchmark().catch(console.error);
