import fs from 'fs';
import path from 'path';
import { JsonStore } from '../lib/store.js';
import { GeminiLlmProvider } from '../providers/llm/gemini.js';
import { FastCheerioFetcherProvider } from '../providers/fetcher/cheerio.js';
import { EvidenceValidator } from '../engine/validator.js';

interface TargetedVerificationResponse {
  verified_auth_methods: string[];
  verified_access_model: string;
  verified_credentials_obtainable_without_approval: boolean;
  verified_public_api_status: string;
  verified_api_breadth: string;
  verified_verdict: 'BUILD_NOW' | 'BUILD_WITH_CAVEATS' | 'OUTREACH_REQUIRED' | 'BLOCKED_LOW_PRIORITY' | 'UNCLEAR';
  primary_blocker: string | null;
  evidence_url: string;
  concise_evidence_snippet: string;
  remaining_uncertainty: string[];
}

const TargetedVerificationSchema = {
  type: 'object',
  properties: {
    verified_auth_methods: { type: 'array', items: { type: 'string' } },
    verified_access_model: { type: 'string' },
    verified_credentials_obtainable_without_approval: { type: 'boolean' },
    verified_public_api_status: { type: 'string' },
    verified_api_breadth: { type: 'string' },
    verified_verdict: { type: 'string', enum: ['BUILD_NOW', 'BUILD_WITH_CAVEATS', 'OUTREACH_REQUIRED', 'BLOCKED_LOW_PRIORITY', 'UNCLEAR'] },
    primary_blocker: { type: 'string', nullable: true },
    evidence_url: { type: 'string' },
    concise_evidence_snippet: { type: 'string' },
    remaining_uncertainty: { type: 'array', items: { type: 'string' } }
  },
  required: ['verified_auth_methods', 'verified_access_model', 'verified_credentials_obtainable_without_approval', 'verified_public_api_status', 'verified_api_breadth', 'verified_verdict', 'primary_blocker', 'evidence_url', 'concise_evidence_snippet', 'remaining_uncertainty']
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTargetedAppVerification(
  app: any,
  benchApp: any,
  rec: any,
  targetedDir: string,
  llm: GeminiLlmProvider,
  validator: EvidenceValidator
): Promise<any> {
  const paddedId = String(app.assignment_number).padStart(3, '0');
  const safeName = benchApp.app_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const outPath = path.join(targetedDir, `app_${paddedId}_${safeName}_targeted.json`);

  if (fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
      if (existing && existing.targeted_result) {
        return existing;
      }
    } catch {}
  }

  const urlsToFetch = [
    `https://${benchApp.website_hint}`,
    `https://${benchApp.website_hint}/pricing`,
    `https://${benchApp.website_hint}/docs`
  ];

  let fetchedDocText = '';
  for (const url of urlsToFetch) {
    try {
      const res = await validator.getCachedOrFetch(url);
      if (res && res.markdown) {
        fetchedDocText += `\n--- SOURCE URL: ${url} ---\n${res.markdown.slice(0, 3500)}\n`;
      }
    } catch {}
  }

  const existingSnippets = (rec.evidence_pool || []).map((e: any) => `[URL: ${e.source_url}] Claim: ${e.claim} | Snippet: "${e.evidence_snippet}"`).join('\n');

  const prompt = `You are a targeted technical verification specialist investigating application #${benchApp.assignment_number} "${benchApp.app_name}" (${benchApp.assigned_category}).
This application currently has a calibrated verdict of UNCLEAR due to specific unresolved fields: ${app.exact_fields_to_verify.join(', ')}.

Your objective is to independently resolve these specific fields against official source evidence and assign a final definitive buildability verdict ('BUILD_NOW', 'BUILD_WITH_CAVEATS', 'OUTREACH_REQUIRED', 'BLOCKED_LOW_PRIORITY', or 'UNCLEAR').

### BASELINE EXTRACTED FACTS:
- extracted_auth_methods: ${JSON.stringify(app.baseline_facts.extracted_auth_methods)}
- access_model: ${JSON.stringify(app.baseline_facts.access_model)}
- credentials_obtainable_without_approval: ${JSON.stringify(app.baseline_facts.credentials_obtainable_without_approval)}
- public_api_status: ${JSON.stringify(app.baseline_facts.public_api_status)}
- api_breadth: ${JSON.stringify(app.baseline_facts.api_breadth)}
- primary_blocker: ${JSON.stringify(app.baseline_facts.primary_blocker)}

### EXISTING EVIDENCE POOL:
${existingSnippets}

### FRESH OFFICIAL DOCUMENTATION:
${fetchedDocText || 'Rely on verified domain facts and existing evidence pool.'}

### TARGETED AUDIT INSTRUCTIONS:
1. Verify whether a public API exists (` + '`verified_public_api_status: "yes" | "no" | "limited" | "unknown"`' + `).
2. Verify the exact developer access model (` + '`verified_access_model: "self_serve_free" | "self_serve_paid" | "sales_gated" | "admin_gated" | "unclear"`' + `).
3. Verify whether developer API credentials (API key, OAuth app) can be obtained without manual vendor sales approval (` + '`verified_credentials_obtainable_without_approval: true | false`' + `).
4. Determine definitive ` + '`verified_verdict`' + `:
   - 'BUILD_NOW': if public API is yes/limited and credentials are self-serve without human approval.
   - 'BUILD_WITH_CAVEATS': if public API exists and is self-serve, but requires specific paid tiers or complex OAuth setup.
   - 'OUTREACH_REQUIRED': if credentials require sales approval or partnership.
   - 'BLOCKED_LOW_PRIORITY': if no public API exists.
   - 'UNCLEAR': only if official pricing/developer documentation genuinely cannot be confirmed after exhaustive search.
5. Quote the exact supporting ` + '`evidence_url`' + ` and ` + '`concise_evidence_snippet`' + ` (max 25 words).`;

  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await llm.generateStructured<TargetedVerificationResponse>(prompt, TargetedVerificationSchema as any);
      
      const targetedResult = {
        assignment_number: benchApp.assignment_number,
        app_name: benchApp.app_name,
        assigned_category: benchApp.assigned_category,
        baseline_verdict: app.baseline_verdict,
        calibrated_verdict: app.calibrated_verdict,
        exact_fields_to_verify: app.exact_fields_to_verify,
        targeted_result: response,
        verified_at: new Date().toISOString()
      };

      const tmp = `${outPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmp, JSON.stringify(targetedResult, null, 2), 'utf-8');
      fs.renameSync(tmp, outPath);

      return targetedResult;
    } catch (err: any) {
      const isTransient = err.status === 429 || err.status === 503 || (err.message && (err.message.includes('429') || err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('timeout') || err.message.includes('fetch failed')));
      if (isTransient && attempt < maxAttempts) {
        const backoff = Math.pow(2, attempt) * 1500 + Math.floor(Math.random() * 1000);
        console.warn(`[Targeted Retry] App #${benchApp.assignment_number} (${benchApp.app_name}) attempt ${attempt} failed with ${err.message || err.status}. Retrying in ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Targeted verification failed for app #${benchApp.assignment_number} after ${maxAttempts} attempts.`);
}

async function main() {
  console.log('================================================================');
  console.log('         FINAL DATASET CALIBRATION & PROVENANCE AUDIT           ');
  console.log('================================================================');

  const startTime = Date.now();
  const baseDir = path.resolve(process.cwd(), 'data');
  const analysisDir = path.join(baseDir, 'analysis');
  const verificationDir = path.join(baseDir, 'verification');
  const calibratedDir = path.join(baseDir, 'calibrated');
  const targetedDir = path.join(calibratedDir, 'targeted_verified');

  if (!fs.existsSync(calibratedDir)) fs.mkdirSync(calibratedDir, { recursive: true });
  if (!fs.existsSync(targetedDir)) fs.mkdirSync(targetedDir, { recursive: true });

  const store = new JsonStore(baseDir);
  const benchmarkApps = store.loadBenchmark();
  const allRecords = store.getAllRecords();

  // Load verified 15-app sample results
  const verifiedMap = new Map<number, any>();
  const verifiedFiles = fs.existsSync(verificationDir) ? fs.readdirSync(verificationDir).filter(f => f.endsWith('_verified.json')) : [];
  for (const f of verifiedFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(verificationDir, f), 'utf-8'));
      if (data && data.assignment_number && data.verified_fields) {
        verifiedMap.set(data.assignment_number, data);
      }
    } catch {}
  }

  // Index records strictly by assignment_number
  const recordMap = new Map<number, any>();
  for (const rec of allRecords) {
    if (rec?.identity?.assignment_number) {
      recordMap.set(rec.identity.assignment_number, rec);
    }
  }

  // PART 2 — DETERMINISTIC RECALIBRATION (ZERO LLM CALLS)
  const calibratedRows: any[] = [];
  let unclearBeforeCount = 0;
  let unclearAfterRecalCount = 0;
  let verdictsChangedCount = 0;

  const recalibratedVerdictDist: Record<string, number> = {
    BUILD_NOW: 0,
    BUILD_WITH_CAVEATS: 0,
    OUTREACH_REQUIRED: 0,
    BLOCKED_LOW_PRIORITY: 0,
    UNCLEAR: 0
  };

  const exactRulesUsedDist: Record<string, number> = {
    verified_sample_15: 0,
    SELF_SERVE_BUILD_NOW: 0,
    SELF_SERVE_BUILD_WITH_CAVEATS: 0,
    SALES_GATED_OUTREACH: 0,
    BLOCKED_OR_LOW_PRIO: 0,
    GENUINELY_UNCLEAR: 0
  };

  for (const app of benchmarkApps) {
    const rec = recordMap.get(app.assignment_number);
    if (!rec) {
      throw new Error(`[Abort] Record missing for app #${app.assignment_number} (${app.app_name})`);
    }

    const isDeepVerified = Boolean(
      rec.final_agent_result ||
      rec.critic_result ||
      rec.targeted_reresearch_result ||
      (rec.metadata?.current_stage &&
        ['critic_audit', 'targeted_reresearch', 'final_agent', 'human_reviewed'].includes(
          rec.metadata.current_stage
        ))
    );

    const usableResult = isDeepVerified ? (rec.final_agent_result || rec.first_pass || rec) : (rec.first_pass || rec);
    const baselineSource = isDeepVerified ? 'deep_verified_baseline' : 'fast_scale_baseline';

    const rawVerdict = (usableResult.buildability?.verdict || rec.buildability?.verdict || 'unclear').toUpperCase();
    const baselineVerdict = rawVerdict;
    if (baselineVerdict === 'UNCLEAR') unclearBeforeCount++;

    const authMethods: string[] = usableResult.authentication?.auth_methods || rec.authentication?.auth_methods || ['unclear'];
    const accessModel: string = usableResult.developer_access?.access_model || rec.developer_access?.access_model || 'unclear';
    const noApprovalRequired = usableResult.developer_access?.credentials_obtainable_without_human_approval ?? rec.developer_access?.credentials_obtainable_without_human_approval ?? 'unknown';
    const publicApi: string = usableResult.api_surface?.public_api || rec.api_surface?.public_api || 'unknown';
    const apiBreadth: string = usableResult.api_surface?.api_breadth || rec.api_surface?.api_breadth || 'unclear';
    const mcpStatus: string = usableResult.mcp?.mcp_status || rec.mcp?.mcp_status || 'unclear';
    const primaryBlocker = usableResult.buildability?.primary_blocker ?? rec.buildability?.primary_blocker ?? null;

    let calibratedVerdict = baselineVerdict;
    let exactRule = 'GENUINELY_UNCLEAR';
    let provenance: 'independently_verified_15' | 'deterministic_calibration' = 'deterministic_calibration';
    const remainingUncertainty: string[] = [];

    // Check if in verified 15-app sample first
    if (verifiedMap.has(app.assignment_number)) {
      const verData = verifiedMap.get(app.assignment_number)!;
      calibratedVerdict = verData.verified_fields.buildability_verdict.verified_value;
      exactRule = 'verified_sample_15';
      provenance = 'independently_verified_15';
    } else {
      // Deterministic Recalibration Rules derived from verified 15 findings
      const isPublicApiYes = publicApi === 'yes' || publicApi === 'limited';
      const isSelfServeAccess = ['self_serve_free', 'self_serve_paid', 'open_source', 'developer_edition'].includes(accessModel);
      const isSalesGated = ['sales_gated', 'admin_gated', 'partnership_required'].includes(accessModel) || primaryBlocker === 'contact_sales_required' || primaryBlocker === 'enterprise_gated' || noApprovalRequired === false || noApprovalRequired === 'no';
      const hasKnownAuth = authMethods.some(m => ['api_key', 'bearer_token', 'oauth2', 'basic', 'jwt'].includes(m));

      if (isSalesGated) {
        calibratedVerdict = 'OUTREACH_REQUIRED';
        exactRule = 'SALES_GATED_OUTREACH';
      } else if (publicApi === 'no' || primaryBlocker === 'no_public_api') {
        calibratedVerdict = 'BLOCKED_LOW_PRIORITY';
        exactRule = 'BLOCKED_OR_LOW_PRIO';
      } else if (isPublicApiYes && (noApprovalRequired === true || noApprovalRequired === 'yes') && isSelfServeAccess) {
        calibratedVerdict = 'BUILD_NOW';
        exactRule = 'SELF_SERVE_BUILD_NOW';
      } else if (isPublicApiYes && isSelfServeAccess && hasKnownAuth) {
        calibratedVerdict = 'BUILD_WITH_CAVEATS';
        exactRule = 'SELF_SERVE_BUILD_WITH_CAVEATS';
      } else if (baselineVerdict !== 'UNCLEAR') {
        calibratedVerdict = baselineVerdict;
        exactRule = baselineVerdict === 'BUILD_NOW' ? 'SELF_SERVE_BUILD_NOW' : baselineVerdict === 'OUTREACH_REQUIRED' ? 'SALES_GATED_OUTREACH' : 'SELF_SERVE_BUILD_WITH_CAVEATS';
      } else {
        calibratedVerdict = 'UNCLEAR';
        exactRule = 'GENUINELY_UNCLEAR';
        if (publicApi === 'unknown' || publicApi === 'unclear') remainingUncertainty.push('public_api_status_unclear');
        if (accessModel === 'unclear') remainingUncertainty.push('access_model_unclear');
        if (authMethods.includes('unclear')) remainingUncertainty.push('auth_methods_unclear');
        if (remainingUncertainty.length === 0) remainingUncertainty.push('conservative_unclear_fallback');
      }
    }

    const verdictChanged = baselineVerdict !== calibratedVerdict;
    if (verdictChanged) verdictsChangedCount++;
    if (calibratedVerdict === 'UNCLEAR') unclearAfterRecalCount++;

    recalibratedVerdictDist[calibratedVerdict] = (recalibratedVerdictDist[calibratedVerdict] || 0) + 1;
    exactRulesUsedDist[exactRule] = (exactRulesUsedDist[exactRule] || 0) + 1;

    calibratedRows.push({
      assignment_number: app.assignment_number,
      app_name: app.app_name,
      assigned_category: app.assigned_category,
      website_hint: app.website_hint,
      baseline_verdict: baselineVerdict,
      calibrated_verdict: calibratedVerdict,
      verdict_changed: verdictChanged,
      exact_deterministic_rule: exactRule,
      provenance: {
        baseline_source: baselineSource,
        calibration_layer: provenance
      },
      baseline_facts: {
        extracted_auth_methods: authMethods,
        access_model: accessModel,
        credentials_obtainable_without_approval: noApprovalRequired,
        public_api_status: publicApi,
        api_breadth: apiBreadth,
        mcp_status: mcpStatus,
        primary_blocker: primaryBlocker
      },
      remaining_uncertainty_reasons: remainingUncertainty
    });
  }

  // Save Part 2 deterministic calibrated output
  fs.writeFileSync(path.join(calibratedDir, 'calibrated_100.json'), JSON.stringify(calibratedRows, null, 2));

  // PART 3 — SELECT TARGETED REPAIR SET (Max 15 apps)
  const remainingUnclear = calibratedRows.filter(r => r.calibrated_verdict === 'UNCLEAR');
  const targetedCandidates = remainingUnclear.slice(0, 15).map(r => ({
    assignment_number: r.assignment_number,
    app_name: r.app_name,
    assigned_category: r.assigned_category,
    baseline_verdict: r.baseline_verdict,
    calibrated_verdict: r.calibrated_verdict,
    exact_fields_to_verify: r.remaining_uncertainty_reasons.length > 0 ? r.remaining_uncertainty_reasons : ['access_model', 'public_api_status'],
    baseline_facts: r.baseline_facts
  }));

  console.log('\n--- PART 3 PRE-TARGETED VERIFICATION SUMMARY ---');
  console.log('Recalibrated Verdict Distribution:', JSON.stringify(recalibratedVerdictDist, null, 2));
  console.log(`UNCLEAR count before recalibration: ${unclearBeforeCount}`);
  console.log(`UNCLEAR count after deterministic recalibration: ${unclearAfterRecalCount}`);
  console.log(`Number of verdicts changed by deterministic rules: ${verdictsChangedCount}`);
  console.log('Exact Recalibration Rules Used:', JSON.stringify(exactRulesUsedDist, null, 2));
  console.log(`Proposed Targeted Verification Apps (${targetedCandidates.length} apps):`);
  targetedCandidates.forEach(c => {
    console.log(`  - #${c.assignment_number} ${c.app_name} (${c.assigned_category}) -> verify: [${c.exact_fields_to_verify.join(', ')}]`);
  });

  // PART 4 — FAST TARGETED VERIFICATION (Vertex AI concurrency 10)
  console.log('\n[Status] Executing Part 4 Fast Targeted Verification on Vertex AI...');
  const llm = new GeminiLlmProvider('gemini-2.5-flash');
  const fetcher = new FastCheerioFetcherProvider();
  const validator = new EvidenceValidator(fetcher);

  const targetedResults: any[] = [];
  const queue = [...targetedCandidates];
  let successfulTargetedCalls = 0;

  await new Promise<void>((resolve, reject) => {
    let completed = 0;
    let hasAborted = false;

    const next = () => {
      if (hasAborted) return;
      if (completed === targetedCandidates.length) {
        resolve();
        return;
      }
      const concurrency = 10;
      let current = 0;
      while (current < concurrency && queue.length > 0) {
        const item = queue.shift()!;
        current++;

        const benchApp = benchmarkApps.find(b => b.assignment_number === item.assignment_number)!;
        const rec = store.getRecord(benchApp.assignment_number, benchApp.app_name)!;

        runTargetedAppVerification(item, benchApp, rec, targetedDir, llm, validator)
          .then(res => {
            current--;
            completed++;
            targetedResults.push(res);
            successfulTargetedCalls++;
            console.log(`[Targeted Verified ${completed}/${targetedCandidates.length}] #${item.assignment_number} ${item.app_name} -> Final: ${res.targeted_result.verified_verdict}`);
            next();
          })
          .catch(err => {
            current--;
            console.error(`[Error] Targeted verification failed on #${item.assignment_number}: ${err.message}`);
            if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('billing') || err.status === 401 || err.status === 403)) {
              hasAborted = true;
              reject(err);
              return;
            }
            completed++;
            next();
          });
      }
    };
    if (targetedCandidates.length === 0) resolve(); else next();
  });

  // Index targeted results
  const targetedMap = new Map<number, any>();
  for (const t of targetedResults) {
    if (t?.assignment_number && t.targeted_result) {
      targetedMap.set(t.assignment_number, t);
    }
  }

  // PART 5 — PRODUCE FINAL PRESENTATION LAYER & ANALYTICS
  const finalPresentationRows: any[] = [];
  const finalVerdictDist: Record<string, number> = {
    BUILD_NOW: 0,
    BUILD_WITH_CAVEATS: 0,
    OUTREACH_REQUIRED: 0,
    BLOCKED_LOW_PRIORITY: 0,
    UNCLEAR: 0
  };

  const finalProvenanceDist: Record<string, number> = {
    independently_verified: 0,
    targeted_verified: 0,
    deterministically_calibrated: 0,
    baseline_unverified: 0
  };

  const authDist: Record<string, number> = {};
  const accessDist: Record<string, number> = {};
  const publicApiDist: Record<string, number> = {};
  const apiBreadthDist: Record<string, number> = {};
  const mcpDist: Record<string, number> = {};
  const blockersDist: Record<string, number> = {};
  const catAccessMatrix: Record<string, Record<string, number>> = {};
  const catVerdictMatrix: Record<string, Record<string, number>> = {};

  const easyWins: string[] = [];
  const outreachRequiredList: string[] = [];
  const genuinelyUncertainCases: string[] = [];

  for (const row of calibratedRows) {
    const id = row.assignment_number;
    let finalVerdict = row.calibrated_verdict;
    let verificationStatus: 'independently_verified' | 'targeted_verified' | 'deterministically_calibrated' | 'baseline_unverified' = 'deterministically_calibrated';
    let evidenceUrls: string[] = [];
    let finalUncertainty = row.remaining_uncertainty_reasons || [];
    let finalAuth = row.baseline_facts.extracted_auth_methods;
    let finalAccess = row.baseline_facts.access_model;
    let finalPublicApi = row.baseline_facts.public_api_status;
    let finalBreadth = row.baseline_facts.api_breadth;
    let finalMcp = row.baseline_facts.mcp_status;
    let finalBlocker = row.baseline_facts.primary_blocker;

    if (verifiedMap.has(id)) {
      const ver = verifiedMap.get(id)!;
      finalVerdict = ver.verified_fields.buildability_verdict.verified_value;
      verificationStatus = 'independently_verified';
      finalAuth = ver.verified_fields.auth_methods.verified_value;
      finalAccess = ver.verified_fields.access_model.verified_value;
      finalPublicApi = ver.verified_fields.public_api_status.verified_value;
      finalBreadth = ver.verified_fields.api_breadth.verified_value;
      finalMcp = ver.verified_fields.mcp_status.verified_value;
      finalBlocker = ver.verified_fields.primary_blocker.verified_value;
      if (ver.verified_fields.buildability_verdict.evidence_url) {
        evidenceUrls.push(ver.verified_fields.buildability_verdict.evidence_url);
      }
      if (finalVerdict === 'UNCLEAR' && ver.verified_fields.unclear_diagnosis === 'genuinely_unclear') {
        finalUncertainty = ['genuinely_unclear_per_verified_audit'];
      } else {
        finalUncertainty = [];
      }
    } else if (targetedMap.has(id)) {
      const targ = targetedMap.get(id)!;
      finalVerdict = targ.targeted_result.verified_verdict;
      verificationStatus = 'targeted_verified';
      finalAuth = targ.targeted_result.verified_auth_methods || finalAuth;
      finalAccess = targ.targeted_result.verified_access_model || finalAccess;
      finalPublicApi = targ.targeted_result.verified_public_api_status || finalPublicApi;
      finalBreadth = targ.targeted_result.verified_api_breadth || finalBreadth;
      finalBlocker = targ.targeted_result.primary_blocker ?? finalBlocker;
      if (targ.targeted_result.evidence_url) {
        evidenceUrls.push(targ.targeted_result.evidence_url);
      }
      finalUncertainty = targ.targeted_result.remaining_uncertainty || [];
    } else if (row.verdict_changed) {
      verificationStatus = 'deterministically_calibrated';
      finalUncertainty = [];
    } else {
      verificationStatus = 'baseline_unverified';
    }

    finalVerdictDist[finalVerdict] = (finalVerdictDist[finalVerdict] || 0) + 1;
    finalProvenanceDist[verificationStatus] = (finalProvenanceDist[verificationStatus] || 0) + 1;

    for (const a of finalAuth) authDist[a] = (authDist[a] || 0) + 1;
    accessDist[finalAccess] = (accessDist[finalAccess] || 0) + 1;
    publicApiDist[finalPublicApi] = (publicApiDist[finalPublicApi] || 0) + 1;
    apiBreadthDist[finalBreadth] = (apiBreadthDist[finalBreadth] || 0) + 1;
    mcpDist[finalMcp] = (mcpDist[finalMcp] || 0) + 1;
    if (finalBlocker) blockersDist[finalBlocker] = (blockersDist[finalBlocker] || 0) + 1;

    if (!catAccessMatrix[row.assigned_category]) catAccessMatrix[row.assigned_category] = {};
    catAccessMatrix[row.assigned_category][finalAccess] = (catAccessMatrix[row.assigned_category][finalAccess] || 0) + 1;

    if (!catVerdictMatrix[row.assigned_category]) catVerdictMatrix[row.assigned_category] = {};
    catVerdictMatrix[row.assigned_category][finalVerdict] = (catVerdictMatrix[row.assigned_category][finalVerdict] || 0) + 1;

    if (finalVerdict === 'BUILD_NOW') easyWins.push(`#${id} ${row.app_name}`);
    if (finalVerdict === 'OUTREACH_REQUIRED') outreachRequiredList.push(`#${id} ${row.app_name}`);
    if (finalVerdict === 'UNCLEAR') genuinelyUncertainCases.push(`#${id} ${row.app_name}`);

    finalPresentationRows.push({
      assignment_number: row.assignment_number,
      app_name: row.app_name,
      assigned_category: row.assigned_category,
      original_baseline_facts: row.baseline_facts,
      original_baseline_verdict: row.baseline_verdict,
      calibrated_verdict: row.calibrated_verdict,
      final_presentation_verdict: finalVerdict,
      verification_status: verificationStatus,
      evidence_urls: evidenceUrls,
      remaining_uncertainty: finalUncertainty,
      risk_flags: []
    });
  }

  // Save final presentation layer & final analytics
  fs.writeFileSync(path.join(calibratedDir, 'final_presentation_100.json'), JSON.stringify(finalPresentationRows, null, 2));
  fs.writeFileSync(path.join(calibratedDir, 'final_analytics.json'), JSON.stringify({
    total_apps: 100,
    final_verdict_distribution: finalVerdictDist,
    final_provenance_distribution: finalProvenanceDist,
    distributions: {
      auth_methods: authDist,
      access_model: accessDist,
      public_api_status: publicApiDist,
      api_breadth: apiBreadthDist,
      mcp_status: mcpDist,
      most_common_blockers: blockersDist
    },
    matrices: {
      category_by_access_model: catAccessMatrix,
      category_by_buildability: catVerdictMatrix
    },
    lists: {
      easy_wins: easyWins,
      outreach_required_opportunities: outreachRequiredList,
      genuinely_uncertain_cases: genuinelyUncertainCases
    },
    performance_summary: {
      total_runtime_seconds: parseFloat(((Date.now() - startTime) / 1000).toFixed(2)),
      targeted_apps_selected: targetedCandidates.length,
      targeted_apps_completed: targetedResults.length,
      additional_llm_calls: successfulTargetedCalls
    }
  }, null, 2));

  console.log('\n[Success] Final dataset calibration cleanly generated and saved to data/calibrated/!');
  console.log('  - calibrated_100.json');
  console.log('  - final_presentation_100.json');
  console.log('  - final_analytics.json');
}

if (process.env.NODE_ENV !== 'test') {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { main as runFinalCalibration };
