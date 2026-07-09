import 'dotenv/config';
import path from 'path';
import { DuckDuckGoSearchProvider } from '../providers/search/duckduckgo.js';
import { FastCheerioFetcherProvider } from '../providers/fetcher/cheerio.js';
import { GeminiLlmProvider } from '../providers/llm/gemini.js';
import { ResearchPipeline } from '../engine/pipeline.js';
import { JsonStore } from '../lib/store.js';

async function runGateB() {
  console.log('================================================================');
  console.log('        TOOLKIT INTELLIGENCE ENGINE — CALIBRATION GATE B        ');
  console.log('================================================================\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in your .env file or environment variables.');
    process.exit(1);
  }

  const store = new JsonStore(path.resolve(process.cwd(), 'data'));
  const searchProvider = new DuckDuckGoSearchProvider();
  const fetcherProvider = new FastCheerioFetcherProvider();
  const llmProvider = new GeminiLlmProvider('gemini-2.5-flash');

  const pipeline = new ResearchPipeline(searchProvider, fetcherProvider, llmProvider, store);

  const appsToRun = [
    {
      id: 1,
      name: 'Salesforce',
      hint: 'salesforce.com',
      category: 'CRM and Sales',
      seeded: [
        'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_what_is_rest_api.htm',
        'https://developer.salesforce.com/docs',
        'https://github.com/forcedotcom',
      ],
    },
    {
      id: 56,
      name: 'Firecrawl',
      hint: 'firecrawl.dev',
      category: 'Data, SEO and Scraping',
      seeded: [
        'https://docs.firecrawl.dev/api-reference/introduction',
        'https://docs.firecrawl.dev/introduction',
        'https://github.com/mendableai/firecrawl-mcp-server',
      ],
    },
    {
      id: 90,
      name: 'PitchBook',
      hint: 'pitchbook.com (research API)',
      category: 'Finance and Fintech',
      seeded: [
        'https://pitchbook.com/products/api',
        'https://help.pitchbook.com',
        'https://pitchbook.com/contact',
      ],
    },
    {
      id: 92,
      name: 'Otter AI',
      hint: 'help.otter.ai (MCP server)',
      category: 'AI, Research and Media-native',
      seeded: [
        'https://help.otter.ai',
        'https://otter.ai/pricing',
        'https://github.com/search?q=otter+ai+mcp+server',
      ],
    },
  ];

  const targetId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const filteredApps = targetId ? appsToRun.filter((a) => a.id === targetId) : appsToRun;

  for (const app of filteredApps) {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`Starting Research Loop: [#${app.id}] ${app.name}...`);
    console.log(`----------------------------------------------------------------`);

    try {
      let record = store.getRecord(app.id, app.name);
      let stats = { totalRuntimeMs: 0, urlsFetched: 0, llmCallsCount: 0 };

      if (!record || !record.final_agent_result) {
        const res = await pipeline.runAppResearch(
          app.id,
          app.name,
          app.hint,
          app.category,
          app.seeded
        );
        record = res.record;
        stats = res.stats;
      } else {
        console.log(`[Resuming] Found previously completed and verified final result on disk for ${app.name} (#${app.id}). Skipping redundant LLM/network calls.`);
      }

      console.log(`\n>>> APP RESULT: [${app.name} (#${app.id})]`);
      console.log(`1. SOURCES USED (${record.evidence_pool.length} snippets):`);
      const seenUrls = new Set<string>();
      record.evidence_pool.forEach((ev) => {
        if (!seenUrls.has(ev.source_url)) {
          seenUrls.add(ev.source_url);
          console.log(`   - ${ev.source_title} (${ev.source_url}) [Status: ${ev.url_status.status_code || 'N/A'}, Match: ${ev.snippet_match_status.match_type}]`);
        }
      });

      console.log(`2. FIRST-PASS VERDICT:`);
      if (record.first_pass) {
        console.log(`   - Verdict: ${record.first_pass.buildability.verdict.toUpperCase()}`);
        console.log(`   - Auth: ${JSON.stringify(record.first_pass.authentication.auth_methods)}`);
        console.log(`   - Access: ${record.first_pass.developer_access.access_model} (Self-serve: ${record.first_pass.developer_access.credentials_obtainable_without_human_approval})`);
        console.log(`   - API: ${record.first_pass.api_surface.public_api} (${record.first_pass.api_surface.api_breadth})`);
        console.log(`   - MCP: ${record.first_pass.mcp.mcp_status}`);
      }

      console.log(`3. CRITIC CHALLENGES & TAXONOMY FLAGS:`);
      if (record.critic_result) {
        console.log(`   - Challenged Fields: ${JSON.stringify(record.critic_result.challenged_fields)}`);
        console.log(`   - Flags: ${JSON.stringify(record.critic_result.error_taxonomy_flags)}`);
        Object.entries(record.critic_result.critic_analysis).forEach(([k, v]) => {
          console.log(`     * [${k}]: ${v}`);
        });
      }

      console.log(`4. FIELDS RE-RESEARCHED:`);
      const rrKeys = Object.keys(record.targeted_reresearch_result || {});
      console.log(`   - ${rrKeys.length > 0 ? rrKeys.join(', ') : 'None'}`);

      console.log(`5. FINAL VERDICT:`);
      if (record.final_agent_result) {
        console.log(`   - Verdict: ${record.final_agent_result.buildability.verdict.toUpperCase()}`);
        console.log(`   - Primary Blocker: ${record.final_agent_result.buildability.primary_blocker || 'None'}`);
        console.log(`   - Auth: ${JSON.stringify(record.final_agent_result.authentication.auth_methods)}`);
        console.log(`   - Access: ${record.final_agent_result.developer_access.access_model} (Self-serve: ${record.final_agent_result.developer_access.credentials_obtainable_without_human_approval})`);
        console.log(`   - API: ${record.final_agent_result.api_surface.public_api} (${record.final_agent_result.api_surface.api_breadth})`);
        console.log(`   - MCP: ${record.final_agent_result.mcp.mcp_status}`);
      }

      console.log(`6. FIRST-PASS VERSUS FINAL CHANGES (${record.change_log.length} diffs):`);
      if (record.change_log.length === 0) {
        console.log(`   - No field value discrepancies detected between first-pass and final state.`);
      } else {
        record.change_log.forEach((change, idx) => {
          console.log(`   [Diff #${idx + 1}] ${change.field_changed}: ${JSON.stringify(change.old_value)} -> ${JSON.stringify(change.new_value)} (${change.reason})`);
        });
      }

      console.log(`7. UNRESOLVED QUESTIONS:`);
      console.log(`   - ${record.pipeline_metadata.unresolved_questions.length > 0 ? record.pipeline_metadata.unresolved_questions.join('; ') : 'None'}`);

      console.log(`8. RUNTIME & LLM METRICS:`);
      console.log(`   - Runtime: ${(stats.totalRuntimeMs / 1000).toFixed(2)}s | URLs Fetched: ${stats.urlsFetched} | LLM Calls: ${stats.llmCallsCount}`);

      if (app.id !== 92) {
        console.log(`\n[Inter-App Cooldown] Waiting 35s before next app to clear free-tier minute rate limit...`);
        await new Promise((resolve) => setTimeout(resolve, 35000));
      }
    } catch (err) {
      console.error(`Error researching app ${app.name}:`, err);
    }
  }

  console.log('\n================================================================');
  console.log('                 GATE B EXECUTION COMPLETE                      ');
  console.log('================================================================\n');
}

runGateB().catch((err) => {
  console.error('Fatal error during Gate B execution:', err);
  process.exit(1);
});
