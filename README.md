# Composio Toolkit Intelligence Engine

An **Evidence-First AI Product Operations Research & Verification System** designed to systematically evaluate application buildability and opportunity tiers across **100 enterprise and consumer SaaS applications**.

Built for the **Composio AI Product Operations Intern Take-Home Assignment (2026)**.

---

## 🚀 Live Case Study & Runnable Proof

* **Live Interactive Case Study**: `[Deployment Link Placeholder — e.g. https://composio-toolkit-intelligence.vercel.app/case-study.html]`
* **Local Self-Contained Case Study**: Open `case-study.html` directly in any web browser (`file:///.../case-study.html`). No server required.
* **Runnable Verification Proof (`0 API calls · $0 cost · <1s`)**:
  ```bash
  npm test
  ```
* **Runnable Deep Verification Replay (`Salesforce · Firecrawl · PitchBook · Otter AI`)**:
  ```bash
  npm run gate:b
  ```

---

## 📊 Executive Summary & Core Findings

Our autonomous research pipeline analyzed all 100 applications in the Composio benchmark (`data/benchmark_100.json`) across 10 categories, evaluating developer documentation, API surface breadth, authentication protocols, and onboarding friction.

### 1. Headline Buildability Landscape (100 Apps)

| Verdict Tier | Count | Share | Description & Action Required |
|---|:---:|:---:|---|
| 🟢 **BUILD_NOW** | **20** | **20%** | Self-serve developer onboarding verified; public REST/SDK API documented. Ready for immediate engineering deployment. |
| 🟡 **BUILD_WITH_CAVEATS** | **3** | **3%** | Public developer API exists, but subject to narrow breadth (`Attio #4`), non-standard protocols, or strict rate limits. |
| 🟣 **OUTREACH_REQUIRED** | **12** | **12%** | API exists but requires partner application, sales call, or manual verification before credentials are issued. |
| ⚪ **BLOCKED_LOW_PRIORITY** | **4** | **4%** | Documented lack of public developer API (`Threads #39`, `Systeme.io #37`, `Fanbasis #50`, `Consensus #94`). |
| 🔵 **UNCLEAR** | **61** | **61%** | Ambiguous extraction (`54 conservative baseline-unverified` + `7 genuinely unresolved` after dedicated verification). |

---

## 🎯 Verification Methodology & Intellectual Honesty

To prevent AI hallucination and ensure absolute data integrity, we designed a **strict 4-tier provenance hierarchy** (`src/engine/verdict.ts`) and independently audited a stratified **15-app verification sample** across 120 atomic extraction fields (`data/verification/verification_sample_15.json`).

### 1. Provenance Hierarchy (No Unverified Claims)

1. **`independently_verified` (14 apps)**: Human/critic re-audit confirmed every atomic field with direct URL evidence and zero remaining uncertainty.
2. **`targeted_verified` (15 apps)**: Borderline `UNCLEAR` apps subjected to targeted LLM re-research (`src/engine/reresearch.ts`) to resolve extraction ambiguity.
3. **`deterministically_calibrated` (3 apps)**: Verdict promoted by exact atomic facts matching strict rules (`Salesforce #1`, `GitHub #61`, `Plaid #82`).
4. **`baseline_unverified` (68 apps)**: Processed via single-pass high-throughput extraction (`Fast Scale Mode`). Retained under conservative guardrails without fabricated human verification claims.

### 2. Measured Verification Lift across the 15-App Verification Sample

Our independent verification audit measured the exact accuracy improvement achieved by multi-pass verification:

* **Baseline First-Pass Field Accuracy**: **68.33%** (`82 / 120 fields correct`)
  * Deep-Verified Subset (5 apps): `52.50% baseline accuracy`
  * Fast Scale Subset (10 apps): `76.25% baseline accuracy`
* **Post-Verification Field Accuracy**: **97.50%** (`117 / 120 fields correct`)
* **Absolute Accuracy Lift**: **+29.17 percentage points** (`+45.0 pp on deep verified; +21.25 pp on fast scale`)
* **False UNCLEAR Rate**: **71.4%** (`5 of 7 sampled UNCLEAR apps` were actually buildable upon multi-pass inspection).

---

## 🔍 Understanding the UNCLEAR Funnel (`76 → 70 → 61`)

A critical contribution of our research is demonstrating that **`UNCLEAR` does not mean "no API exists."** Single-pass LLM extraction frequently struggles with dynamic single-page applications (SPAs), multi-product enterprise docs, or login-walled developer portals (`#1 Failure Mode: Extraction Errors across 22 fields`).

```
76 Baseline Initial UNCLEAR Apps
  ↓  (-6 resolved by deterministic recalibration & sample adjustments)
70 UNCLEAR after Deterministic Recalibration
  ↓  (-9 resolved by 15 targeted LLM re-audits on borderline integrations)
61 Final Presentation UNCLEAR Apps
  ├── 7 Genuinely Unresolved Apps (True multi-tenant gating / waitlists: #7 Zoho CRM, #8 Close, #12 Intercom, #14 Front, #16 LiveAgent, #18 Help Scout, #96 Devin)
  └── 54 Conservative Baseline-Unverified Apps (Public API largely present, but single-pass guardrails retained to honor strict provenance integrity)
```

---

## ⚙️ System Architecture & Research Pipeline

The engine (`src/engine/pipeline.ts`) operates through a multi-stage architecture powered by **Google Cloud Vertex AI** (`gemini-2.5-flash`):

1. **Search & Snippet Discovery (`DuckDuckGo / Seeded URLs`)**: Queries authoritative documentation domains (`developers.app.com`, `docs.app.com`, `github.com`).
2. **Fast Cheerio Fetcher (`src/providers/fetcher/cheerio.ts`)**: High-speed, lightweight DOM scraping converting raw HTML/markdown into clean semantic evidence pools.
3. **Atomic Schema Extractor (`src/engine/extractor.ts`)**: Strictly validated Zod JSON schema (`src/types/schema.ts`) extracting authentication (`oauth2`, `api_key`, `bearer_token`), developer access (`self_serve`, `human_approval_required`), API surface, and Model Context Protocol (`mcp`) support.
4. **Adversarial Critic & Reresearch (`src/engine/critic.ts`)**: Evaluates first-pass extraction against error taxonomy flags (`login_walled_portal`, `dynamic_spa_content`, `conservative_guardrail`).
5. **Deterministic Verdict State Machine (`src/engine/verdict.ts`)**: An immutable TypeScript engine evaluating verified facts to output exact, reproducible buildability verdicts.

---

## 📁 Repository Structure

```
composio-toolkit-intelligence/
├── case-study.html                 # 🌟 Single self-contained interactive case study (Vanilla HTML/CSS/JS)
├── README.md                       # Repository documentation & review guide
├── package.json                    # Project configuration, dependencies, and NPM scripts
├── tsconfig.json / vitest.config.ts# TypeScript and Vitest testing configuration
│
├── data/                           # Canonical atomic JSON storage
│   ├── benchmark_100.json          # Immutable authoritative 100-app benchmark (Assignment ID joined)
│   ├── presentation/
│   │   └── case_study_data.json    # Authoritative presentation data contract (Source for HTML)
│   ├── calibrated/                 # Rebuilt final analytics and presentation rows
│   ├── verification/               # 15-app verification sample, accuracy reports & failure taxonomy
│   ├── metrics/                    # Vertex AI token usage & estimated cost observability (`vertex-usage.json`)
│   └── records/                    # 100 immutable atomic JSON research records (`app_001` - `app_100`)
│
├── src/                            # Engine & CLI Source Code
│   ├── cli/                        # Runnable CLI entry points
│   │   ├── run-gate-a.ts           # Gate A verification loop (GitHub #61)
│   │   ├── run-gate-b.ts           # Gate B offline replay loop (Salesforce, Firecrawl, PitchBook, Otter AI)
│   │   ├── run-fast-scale.ts       # 100-app Fast Scale benchmark runner
│   │   └── build-html.ts           # Deterministic HTML case study builder (`npm run build:html`)
│   ├── engine/                     # Core research engine, pipeline, extractor, critic, and verdict rules
│   ├── lib/                        # Atomic JSON disk storage store (`store.ts`)
│   ├── providers/                  # DuckDuckGo search, Cheerio fetcher, and Vertex AI (`gemini.ts`)
│   ├── tests/                      # 54 automated unit & regression tests across 8 suites
│   └── types/                      # Canonical Zod schema (`schema.ts`)
```

---

## 💻 Setup & Commands (Runnable Proof)

### 1. Installation

```bash
git clone https://github.com/yashjha024/composio-toolkit-intelligence.git
cd composio-toolkit-intelligence
npm install
```

### 2. Run the 54-Test Verification & Regression Suite (Offline · $0 Cost)

```bash
npm test
```
Runs **54 automated unit and regression tests** across 8 test suites in `<1 second`. Verifies:
* Exact 100-app benchmark identity joins (`#20 Gladly`, `#22 Twilio`, `#23 Zoho Cliq`, `#24 Lark`, `#25 Pumble`).
* Deterministic buildability verdict engine transitions.
* `case_study_data.json` contract completeness, `unclear_progression` invariants, and arithmetic reconciliation.
* Vertex AI token/cost observability mock verification.

### 3. Replay the Deep-Verified Calibration Loop (`npm run gate:b`)

```bash
npm run gate:b
```
Replays the comprehensive 8-step deep verification research pipeline for **4 diverse applications** (`#1 Salesforce`, `#56 Firecrawl`, `#90 PitchBook`, `#92 Otter AI`).
* **Why this runs offline without API keys:** Because complete, verified `final_agent_result` records exist on disk in `data/records/app_*.json`, our resume-from-checkpoint logic (`src/cli/run-gate-b.ts:85-96`) automatically skips Vertex AI network calls and prints the full research report (evidence snippets, first-pass extraction, critic challenges, error flags, diff logs, and final buildability reasoning).

### 4. Regenerate HTML Case Study from Data Contract

```bash
npm run build:data     # Regenerate data/presentation/case_study_data.json
npm run build:html     # Rebuild self-contained case-study.html
```

---

## 📈 Observability & System Performance

Across the complete 100-app research execution, all LLM calls were tracked via the Vertex AI observability provider (`src/providers/llm/gemini.ts`):

* **Total Successful LLM Calls**: `116 calls`
* **Cumulative Tokens Processed**: `1,118,928 tokens` (`718,342 input` + `400,586 output`)
* **Total Estimated Cost**: **$0.1072 USD**
* **Provider & Model**: `Google Cloud Vertex AI` · `gemini-2.5-flash`

---

## ⚠️ Known Limitations & Future Work

1. **SPA & JS-Heavy Documentation Scraper Limitations**: Our Cheerio DOM fetcher cannot execute JavaScript on single-page applications. Integrating a headless browser fallback (e.g., Playwright or Firecrawl API) would eliminate up to `40% of baseline UNCLEAR verdicts` directly during Phase 1 extraction.
2. **Authenticated Portal Gating**: Enterprise developer portals (`#7 Zoho CRM`, `#12 Intercom`, `#14 Front`) require user login credentials or partner account approvals to inspect exact endpoint definitions. These require human product-operations provisioning before automated tool generation.
3. **Automated MCP Server Generation**: While `#56 Firecrawl` and `#92 Otter AI` feature confirmed Model Context Protocol (`mcp`) support, extending the engine to auto-generate open-source MCP server boilerplate directly from OpenAPI specs is the planned next milestone.

---

## 👨‍💻 Author & Submission Details

* **Author**: **Yash Jha** (`yashjha024`)
* **GitHub**: [https://github.com/yashjha024](https://github.com/yashjha024)
* **LinkedIn**: [https://www.linkedin.com/in/yashjha024/](https://www.linkedin.com/in/yashjha024/)
* **Project**: AI Product Operations Intern Take-Home Submission (Composio AI)
* **Date**: July 2026
* **Data Contract Lock Status**: `AUTHORITATIVE_FINAL_LOCKED` (`Version 1.0.0`)
