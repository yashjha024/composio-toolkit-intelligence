# Composio Toolkit Intelligence

An AI research pipeline that evaluates 100 applications for agent-toolkit buildability — researching authentication, API surface, developer access model, and MCP availability for each.

**100 apps researched · 15-app verification sample · 68.33% baseline accuracy · 97.50% after verification · +29.17 percentage-point improvement**

---

## Live Case Study

https://composio-toolkit-intelligence.netlify.app

The page contains all findings, patterns, the interactive 100-app explorer, verification methodology, and runnable proof. Designed to be understood in approximately two minutes without narration.

---

## How to Run the Research Agent

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/yashjha024/composio-toolkit-intelligence.git
cd composio-toolkit-intelligence
npm install
```

### Run the test suite (no API key required)

```bash
npm test
```

Runs 56 offline regression tests covering verdict logic, identity integrity, provenance arithmetic, and verification metrics. Completes in under 2 seconds with zero LLM calls.

Expected output: `56 / 56 tests passing`

### Replay the deep-verified pipeline (no API key required)

```bash
npm run gate:b
```

The repository includes pre-saved verified records for the 10 deep-verified applications. The pipeline's resume logic detects completed records, skips redundant LLM calls, and prints the full 8-step verification report covering sources, first-pass extraction, critic challenges, error flags, diffs, and final verdict reasoning.

This demonstrates the live pipeline behavior without requiring new API calls or credentials.

### Run new research (requires Vertex AI credentials)

To run fresh extractions, configure `.env` from the provided template:

```bash
cp .env.example .env
```

Edit `.env` with your Google Cloud project credentials, then run:

```bash
npm run gate:a
```

This executes the full Fast Scale research pipeline across the benchmark.

### Rebuild presentation artifacts

```bash
npm run build:data    # regenerates data/presentation/case_study_data.json
npm run build:html    # regenerates case-study.html
```

---

## What the Agent Does

For each of the 100 benchmark applications, the pipeline:

1. discovers official documentation sources via search;
2. fetches and parses developer documentation using a lightweight Cheerio DOM fetcher;
3. makes exactly one structured LLM extraction call (Vertex AI, `gemini-2.5-flash`) to extract authentication methods, developer access model, credential availability, API surface, and MCP status;
4. validates extracted evidence deterministically;
5. computes a buildability verdict through a TypeScript state machine — the model does not directly decide the verdict;
6. generates risk flags for weak or unvalidated evidence;
7. persists the record atomically.

The pipeline resumes safely from interruption — completed records are detected and skipped automatically.

---

## Verification

A stratified 15-app sample was independently audited using a separate verification pass that did not alter baseline records.

- Baseline field-level accuracy across the sample: **68.33%** (82 / 120 fields correct)
- Post-verification accuracy: **97.50%** (117 / 120 fields correct)
- Improvement: **+29.17 percentage points**

The verification loop diagnosed three distinct failure modes: extraction errors, evidence validation mismatches, and conservative guardrail false-negatives. These are documented in `data/verification/failure_taxonomy.json`.

---

## Where the Agent Needed Human Input

The pipeline flags where automated research was insufficient:

- **Login-walled developer portals** — seven applications (`#7 Zoho CRM`, `#8 Close`, `#12 Intercom`, `#14 Front`, `#16 LiveAgent`, `#18 Help Scout`, `#96 Devin`) remain genuinely unresolved after dedicated verification because their credential onboarding requires a real tenant account or vendor contact.
- **Contradictory commercial claims** — some platforms advertise a public API on marketing pages while restricting access to enterprise tiers in licensing terms. Resolving these requires a human to review pricing terms and make a product judgment on classification.
- **Verification sampling decisions** — the selection of which 15 apps to audit, and the interpretation of genuinely ambiguous verification findings, involved human review.

The 54 remaining UNCLEAR applications were not individually verified. They are retained as conservative baseline results rather than extrapolating the 71.4% sample resolution rate to unverified records.

---

## Key Findings

| Verdict | Apps |
|---|---:|
| BUILD_NOW | 20 |
| BUILD_WITH_CAVEATS | 3 |
| OUTREACH_REQUIRED | 12 |
| BLOCKED_LOW_PRIORITY | 4 |
| UNCLEAR | 61 |

UNCLEAR does not mean no API exists. It means the one-pass system did not accumulate enough validated evidence to promote the verdict confidently under the system's decision rules.

| Provenance Tier | Apps |
|---|---:|
| Independently verified | 14 |
| Targeted verified | 15 |
| Deterministically calibrated | 3 |
| Baseline unverified | 68 |

---

## Repository Structure

```text
composio-toolkit-intelligence/
├── case-study.html                  # primary deliverable
├── data/
│   ├── benchmark_100.json           # canonical 100-app benchmark
│   ├── records/                     # immutable per-app research records
│   ├── verification/                # 15-app verification artifacts
│   ├── calibrated/                  # final calibrated and targeted verified records
│   ├── presentation/                # case_study_data.json (data contract for HTML)
│   └── metrics/                     # vertex-usage.json (token and cost telemetry)
└── src/
    ├── cli/                         # pipeline runners and HTML/data builders
    ├── engine/                      # research pipeline, verdict logic
    ├── providers/                   # LLM, search, and fetcher providers
    └── tests/                       # 8 test suites, 56 tests
```

---

## Author

**Yash Jha**
[github.com/yashjha024](https://github.com/yashjha024) · [linkedin.com/in/yashjha024](https://www.linkedin.com/in/yashjha024/)