import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { DuckDuckGoSearchProvider } from '../providers/search/duckduckgo.js';
import { FastCheerioFetcherProvider } from '../providers/fetcher/cheerio.js';
import { GeminiLlmProvider } from '../providers/llm/gemini.js';
import { FastResearchPipeline } from '../engine/fast-pipeline.js';
import { JsonStore } from '../lib/store.js';

async function runControlled3Apps() {
  console.log('================================================================');
  console.log('     TOOLKIT INTELLIGENCE ENGINE — CONTROLLED 3-APP CALIBRATION ');
  console.log('================================================================\n');

  const store = new JsonStore(path.resolve(process.cwd(), 'data'));
  const searchProvider = new DuckDuckGoSearchProvider();
  const fetcherProvider = new FastCheerioFetcherProvider();
  const llmProvider = new GeminiLlmProvider('gemini-2.5-flash');

  const fastPipeline = new FastResearchPipeline(searchProvider, fetcherProvider, llmProvider, store);

  const targetApps = [
    { id: 3, name: 'Pipedrive', hint: 'pipedrive.com', category: 'CRM and Sales', seeded: ['https://developers.pipedrive.com/docs/api/v1', 'https://developers.pipedrive.com'] },
    { id: 5, name: 'Twenty', hint: 'twenty.com (open-source CRM)', category: 'CRM and Sales', seeded: ['https://docs.twenty.com/developers', 'https://github.com/twentyhq/twenty'] },
    { id: 6, name: 'Podio', hint: 'podio.com', category: 'CRM and Sales', seeded: ['https://developers.podio.com', 'https://developers.podio.com/authentication'] },
  ];

  let completedCount = 0;
  let totalRuntimeMs = 0;
  let totalLlmCalls = 0;
  const appMetrics: Array<{
    id: number;
    name: string;
    runtimeSeconds: number;
    llmCalls: number;
    verdict: string;
    riskFlags: string[];
    error?: string;
  }> = [];
  const errorsEncountered: string[] = [];

  for (const app of targetApps) {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`[3-App Calibration] Processing [#${app.id}] ${app.name}...`);
    console.log(`----------------------------------------------------------------`);

    try {
      const existing = store.getRecord(app.id, app.name);
      if (existing && (existing.final_agent_result || existing.first_pass)) {
        console.log(`[Skipping] App #${app.id} (${app.name}) already has a completed result.`);
        continue;
      }

      const startTime = Date.now();
      const res = await fastPipeline.runFastAppResearch(app.id, app.name, app.hint, app.category, app.seeded);
      const endTime = Date.now();
      const runtimeMs = endTime - startTime;
      totalRuntimeMs += runtimeMs;
      totalLlmCalls += res.stats.llmCallsCount;
      completedCount++;

      const verdict = res.record.first_pass?.buildability.verdict || 'unknown';
      const riskFlags = res.stats.riskFlags || [];

      appMetrics.push({
        id: app.id,
        name: app.name,
        runtimeSeconds: runtimeMs / 1000,
        llmCalls: res.stats.llmCallsCount,
        verdict: verdict.toUpperCase(),
        riskFlags,
      });

      console.log(`>>> FAST RESULT SAVED: [${app.name} (#${app.id})] | Verdict: ${verdict.toUpperCase()} | Runtime: ${(runtimeMs / 1000).toFixed(2)}s | Risk Flags: ${JSON.stringify(riskFlags)}`);
    } catch (err: any) {
      const errMsg = err.message || String(err);
      console.error(`[Error] App #${app.id} (${app.name}) failed:`, errMsg);
      errorsEncountered.push(`[#${app.id} ${app.name}] ${errMsg}`);
      appMetrics.push({
        id: app.id,
        name: app.name,
        runtimeSeconds: 0,
        llmCalls: 0,
        verdict: 'FAILED',
        riskFlags: [],
        error: errMsg,
      });
    }

    // Short 10s cooldown between apps
    if (app !== targetApps[targetApps.length - 1]) {
      console.log('Waiting 10s cooldown...');
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  // Check total benchmark coverage across data/records
  const allRecords = fs.readdirSync(path.resolve(process.cwd(), 'data/records')).filter((f) => f.startsWith('app_') && f.endsWith('.json'));
  let totalCoverage = 0;
  for (const file of allRecords) {
    try {
      const d = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data/records', file), 'utf8'));
      if (d.final_agent_result || d.first_pass) {
        totalCoverage++;
      }
    } catch {
      // skip corrupted check
    }
  }

  const avgTimeSeconds = completedCount > 0 ? (totalRuntimeMs / 1000) / completedCount : 0;
  const remainingAppsCount = 100 - totalCoverage;
  const estimatedTimeSecondsRemaining = remainingAppsCount * (avgTimeSeconds + 10); // include 10s cooldown

  console.log(`\n================================================================`);
  console.log(`          CONTROLLED 3-APP CALIBRATION REPORT                   `);
  console.log(`================================================================`);
  console.log(`1. Apps Completed out of 3: ${completedCount}/3`);
  console.log(`2. Total Runtime: ${(totalRuntimeMs / 1000).toFixed(2)}s (Excluding inter-app cooldowns)`);
  console.log(`3. Runtime per app:`);
  for (const m of appMetrics) {
    console.log(`   - [#${m.id}] ${m.name}: ${m.runtimeSeconds.toFixed(2)}s | LLM calls: ${m.llmCalls} | Verdict: ${m.verdict}`);
  }
  console.log(`4. Successful LLM Calls: ${totalLlmCalls}`);
  console.log(`5. Any 429, quota, retry, authentication, or model errors: ${errorsEncountered.length > 0 ? errorsEncountered.join('; ') : 'NONE'}`);
  console.log(`6. Final verdict for each app:`);
  for (const m of appMetrics) {
    console.log(`   - [#${m.id}] ${m.name}: ${m.verdict}`);
  }
  console.log(`7. Risk flags for each app:`);
  for (const m of appMetrics) {
    console.log(`   - [#${m.id}] ${m.name}: ${JSON.stringify(m.riskFlags)}`);
  }
  console.log(`8. Current benchmark coverage out of 100: ${totalCoverage}/100`);
  console.log(`9. Projected runtime for all remaining (${remainingAppsCount}) unfinished apps at this speed: ~${(estimatedTimeSecondsRemaining / 60).toFixed(1)} minutes (~${((avgTimeSeconds + 10)).toFixed(1)}s per app including cooldown)`);

  // Verify persistence
  console.log(`\nChecking persistence on disk for target apps:`);
  for (const app of targetApps) {
    const p = store.getRecordPath(app.id, app.name);
    if (fs.existsSync(p)) {
      console.log(`   [CONFIRMED PERSISTED] ${p}`);
    } else {
      console.log(`   [MISSING ON DISK] ${p}`);
    }
  }
}

runControlled3Apps().catch(console.error);
