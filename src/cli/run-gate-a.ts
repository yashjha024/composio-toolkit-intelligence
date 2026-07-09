import 'dotenv/config';
import path from 'path';
import { DuckDuckGoSearchProvider } from '../providers/search/duckduckgo.js';
import { FastCheerioFetcherProvider } from '../providers/fetcher/cheerio.js';
import { GeminiLlmProvider } from '../providers/llm/gemini.js';
import { ResearchPipeline } from '../engine/pipeline.js';
import { JsonStore } from '../lib/store.js';

async function runGateA() {
  console.log('================================================================');
  console.log('        TOOLKIT INTELLIGENCE ENGINE — CALIBRATION GATE A        ');
  console.log('================================================================\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in your .env file or environment variables.');
    console.error('Please open .env and add your GEMINI_API_KEY to proceed with Gate A.');
    process.exit(1);
  }

  const store = new JsonStore(path.resolve(process.cwd(), 'data'));
  const searchProvider = new DuckDuckGoSearchProvider();
  const fetcherProvider = new FastCheerioFetcherProvider();
  const llmProvider = new GeminiLlmProvider('gemini-2.5-pro');

  const pipeline = new ResearchPipeline(searchProvider, fetcherProvider, llmProvider, store);

  console.log('Starting 8-step verification pipeline for GitHub (#61)...');
  const { record, stats } = await pipeline.runAppResearch(
    61,
    'GitHub',
    'docs.github.com/rest',
    'Developer, Infra and Data platforms',
    ['https://docs.github.com/rest', 'https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api']
  );

  console.log('\n================================================================');
  console.log('                      GATE A REPORT: GITHUB (#61)               ');
  console.log('================================================================');

  console.log('\n1. SOURCES USED:');
  record.evidence_pool.forEach((ev, i) => {
    console.log(`   [${i + 1}] ${ev.source_title} (${ev.source_url})`);
    console.log(`       Status Code: ${ev.url_status.status_code || 'N/A'}, Match: ${ev.snippet_match_status.match_type}`);
  });

  console.log('\n2. FIRST-PASS RESULT (Key Fields):');
  if (record.first_pass) {
    console.log(`   - Auth Methods: ${JSON.stringify(record.first_pass.authentication.auth_methods)}`);
    console.log(`   - Access Model: ${record.first_pass.developer_access.access_model}`);
    console.log(`   - Self-Serve Without Approval: ${record.first_pass.developer_access.credentials_obtainable_without_human_approval}`);
    console.log(`   - Public API: ${record.first_pass.api_surface.public_api} (${record.first_pass.api_surface.api_breadth})`);
    console.log(`   - First-Pass Verdict: ${record.first_pass.buildability.verdict}`);
  }

  console.log('\n3. CRITIC CHALLENGES & ANALYSIS:');
  if (record.critic_result) {
    console.log(`   - Challenged Fields: ${JSON.stringify(record.critic_result.challenged_fields)}`);
    console.log(`   - Error Taxonomy Flags: ${JSON.stringify(record.critic_result.error_taxonomy_flags)}`);
    Object.entries(record.critic_result.critic_analysis).forEach(([k, v]) => {
      console.log(`   - [${k}]: ${v}`);
    });
  }

  console.log('\n4. FIELDS RE-RESEARCHED:');
  const reresearchedKeys = Object.keys(record.targeted_reresearch_result || {});
  console.log(`   - ${reresearchedKeys.length > 0 ? reresearchedKeys.join(', ') : 'None (No challenges requiring modification)'}`);

  console.log('\n5. FIRST-PASS VERSUS FINAL-RESULT DIFF:');
  if (record.change_log.length === 0) {
    console.log('   - No field value discrepancies detected between first-pass extraction and verified final state.');
  } else {
    record.change_log.forEach((change, i) => {
      console.log(`   [Diff #${i + 1}] Field: ${change.field_changed}`);
      console.log(`         Old Value: ${JSON.stringify(change.old_value)}`);
      console.log(`         New Value: ${JSON.stringify(change.new_value)}`);
      console.log(`         Reason: ${change.reason}`);
    });
  }

  console.log('\n6. FINAL RESULT & VERDICT:');
  if (record.final_agent_result) {
    console.log(`   - Auth Methods: ${JSON.stringify(record.final_agent_result.authentication.auth_methods)}`);
    console.log(`   - Access Model: ${record.final_agent_result.developer_access.access_model}`);
    console.log(`   - Public API: ${record.final_agent_result.api_surface.public_api} (${record.final_agent_result.api_surface.api_breadth})`);
    console.log(`   - MCP Status: ${record.final_agent_result.mcp.mcp_status}`);
    console.log(`   - Deterministic Verdict: ${record.final_agent_result.buildability.verdict.toUpperCase()}`);
    console.log(`   - Primary Blocker: ${record.final_agent_result.buildability.primary_blocker || 'None'}`);
    console.log(`   - Verdict Reasoning: ${record.final_agent_result.buildability.verdict_reasoning}`);
  }

  console.log('\n7. UNRESOLVED QUESTIONS:');
  console.log(`   - ${record.pipeline_metadata.unresolved_questions.length > 0 ? record.pipeline_metadata.unresolved_questions.join('; ') : 'None'}`);

  console.log('\n8. WHAT FAILED OR WAS BRITTLE:');
  if (record.pipeline_metadata.errors.length > 0) {
    console.log(`   - Pipeline Flags/Errors: ${record.pipeline_metadata.errors.join('; ')}`);
  } else {
    console.log('   - No system crashes or fatal fetch errors during Gate A execution.');
  }

  console.log('\n9. RUNTIME & SYSTEM METRICS:');
  console.log(`   - Total Runtime: ${(stats.totalRuntimeMs / 1000).toFixed(2)}s (${stats.totalRuntimeMs} ms)`);
  console.log(`   - URLs Fetched: ${stats.urlsFetched}`);
  console.log(`   - LLM Calls Executed: ${stats.llmCallsCount}`);
  console.log('================================================================\n');
}

runGateA().catch((err) => {
  console.error('Fatal error during Gate A execution:', err);
  process.exit(1);
});
