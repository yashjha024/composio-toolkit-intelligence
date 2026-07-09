import 'dotenv/config';
import path from 'path';
import { DuckDuckGoSearchProvider } from '../providers/search/duckduckgo.js';
import { FastCheerioFetcherProvider } from '../providers/fetcher/cheerio.js';
import { GeminiLlmProvider } from '../providers/llm/gemini.js';
import { ResearchPipeline } from '../engine/pipeline.js';
import { JsonStore } from '../lib/store.js';

async function runSmokeTest() {
  console.log('================================================================');
  console.log('      TOOLKIT INTELLIGENCE ENGINE — 10-APP SMOKE TEST           ');
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
      id: 4,
      name: 'Attio',
      hint: 'attio.com',
      category: 'CRM and Sales',
      seeded: ['https://developers.attio.com', 'https://attio.com/pricing', 'https://docs.attio.com'],
    },
    {
      id: 11,
      name: 'Zendesk',
      hint: 'zendesk.com',
      category: 'Support and Helpdesk',
      seeded: ['https://developer.zendesk.com/documentation/ticketing/introduction/about-the-zendesk-rest-api/', 'https://developer.zendesk.com', 'https://zendesk.com/pricing'],
    },
    {
      id: 21,
      name: 'Slack',
      hint: 'slack.com',
      category: 'Communications and Messaging',
      seeded: ['https://api.slack.com', 'https://api.slack.com/authentication', 'https://github.com/modelcontextprotocol/servers'],
    },
    {
      id: 33,
      name: 'LinkedIn Ads',
      hint: 'learn.microsoft.com/linkedin/marketing',
      category: 'Marketing, Ads, Email and Social',
      seeded: ['https://learn.microsoft.com/en-us/linkedin/marketing/getting-started', 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication'],
    },
    {
      id: 44,
      name: 'Salesforce Commerce Cloud',
      hint: 'developer.salesforce.com/docs/commerce',
      category: 'Ecommerce',
      seeded: ['https://developer.salesforce.com/docs/commerce', 'https://github.com/SalesforceCommerceCloud'],
    },
    {
      id: 55,
      name: 'Apify',
      hint: 'docs.apify.com',
      category: 'Data, SEO and Scraping',
      seeded: ['https://docs.apify.com/api/v2', 'https://github.com/apify/apify-mcp-server', 'https://apify.com/pricing'],
    },
    {
      id: 65,
      name: 'Supabase',
      hint: 'supabase.com/docs',
      category: 'Developer, Infra and Data platforms',
      seeded: ['https://supabase.com/docs/guides/api', 'https://github.com/supabase-community/mcp-server-supabase', 'https://supabase.com/pricing'],
    },
    {
      id: 71,
      name: 'Notion',
      hint: 'developers.notion.com',
      category: 'Productivity and Project Management',
      seeded: ['https://developers.notion.com/docs/getting-started', 'https://developers.notion.com', 'https://github.com/mcp-notion/notion-mcp-server'],
    },
    {
      id: 81,
      name: 'Stripe',
      hint: 'stripe.com/docs/api',
      category: 'Finance and Fintech',
      seeded: ['https://docs.stripe.com/api', 'https://docs.stripe.com/keys', 'https://stripe.com/pricing'],
    },
    {
      id: 96,
      name: 'Devin',
      hint: 'docs.devin.ai (MCP)',
      category: 'AI, Research and Media-native',
      seeded: ['https://docs.devin.ai', 'https://docs.devin.ai/mcp', 'https://devin.ai/pricing'],
    },
  ];

  const targetId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const filteredApps = targetId ? appsToRun.filter((a) => a.id === targetId) : appsToRun;

  let completedCount = 0;
  let reresearchCount = 0;
  let changedCount = 0;
  let unclearCount = 0;
  let discoveryFailedCount = 0;
  let totalRuntimeMs = 0;
  let totalLlmCalls = 0;

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
        console.log(`[Skipping] Found previously completed and verified final result on disk for ${app.name} (#${app.id}).`);
      }

      totalRuntimeMs += stats.totalRuntimeMs;
      totalLlmCalls += stats.llmCallsCount;

      if (record && record.final_agent_result) {
        completedCount++;
        const fpVerdict = record.first_pass?.buildability.verdict || 'N/A';
        const finalVerdict = record.final_agent_result.buildability.verdict;
        if (fpVerdict !== finalVerdict) changedCount++;
        if (finalVerdict === 'unclear') unclearCount++;
        if (record.targeted_reresearch_result && Object.keys(record.targeted_reresearch_result).length > 0) {
          reresearchCount++;
        }
        if (record.evidence_pool.length === 0 || !record.evidence_pool.some((e) => e.url_status.resolves && e.url_status.status_code && e.url_status.status_code >= 200 && e.url_status.status_code < 400)) {
          discoveryFailedCount++;
        }

        console.log(`\n>>> APP RESULT: [${app.name} (#${app.id})]`);
        console.log(`1. SOURCES USED (${record.evidence_pool.length} snippets):`);
        const seenUrls = new Set<string>();
        record.evidence_pool.forEach((ev) => {
          if (!seenUrls.has(ev.source_url)) {
            seenUrls.add(ev.source_url);
            console.log(`   - ${ev.source_title} (${ev.source_url}) [Status: ${ev.url_status.status_code || 'N/A'}, Match: ${ev.snippet_match_status.match_type}, Mode: ${ev.fetch_mode || 'http'}]`);
          }
        });
        console.log(`2. FIRST-PASS VERDICT: ${fpVerdict.toUpperCase()}`);
        console.log(`3. CRITIC CHALLENGES: ${JSON.stringify(record.critic_result?.challenged_fields || [])}`);
        console.log(`4. FINAL VERDICT: ${finalVerdict.toUpperCase()} (Primary Blocker: ${record.final_agent_result.buildability.primary_blocker || 'None'})`);
      } else {
        console.log(`[Partial Result] App ${app.name} (#${app.id}) did not finish final stage.`);
      }
    } catch (err: any) {
      console.error(`[Error] App #${app.id} (${app.name}) failed during execution:`, err.message);
      console.log(`[Resilience] Preserving any saved partial result for #${app.id} on disk and continuing to next app...`);
    }

    // Cooldown to avoid minute rate limits
    console.log(`\n[Inter-App Cooldown] Waiting 20s before next app...`);
    await new Promise((r) => setTimeout(r, 20000));
  }

  console.log(`\n================================================================`);
  console.log(`                10-APP SMOKE TEST COMPLETE                      `);
  console.log(`================================================================`);
  console.log(`Summary Statistics:`);
  console.log(`- Completed Successfully: ${completedCount}/${filteredApps.length}`);
  console.log(`- Required Targeted Re-Research: ${reresearchCount}`);
  console.log(`- Verdict Changed After Verification: ${changedCount}`);
  console.log(`- Left UNCLEAR: ${unclearCount}`);
  console.log(`- Source Discovery / Doc Blocked Failures: ${discoveryFailedCount}`);
  console.log(`- Total Runtime: ${(totalRuntimeMs / 1000).toFixed(2)}s`);
  console.log(`- Total LLM Calls: ${totalLlmCalls}`);
}

runSmokeTest().catch(console.error);
