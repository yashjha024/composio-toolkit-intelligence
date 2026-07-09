# Composio Toolkit Intelligence

> An AI-powered product operations research system that evaluated 100 applications for agent-toolkit buildability, surfaced portfolio-level integration opportunities, and measured its own accuracy through independent verification loops.

**100 apps researched · 10 categories · 15-app independent verification sample · 68.33% baseline accuracy · 97.50% after verification · +29.17 percentage-point improvement**

---

## Overview

Composio turns applications into tools that AI agents can call.

Before deciding whether to build an integration, a product or operations team needs to answer a surprisingly complex set of questions:

- Does the application expose a public API?
- Which authentication methods does it support?
- Can a developer obtain credentials independently?
- Is access self-serve, paid, admin-gated, sales-gated, or partnership-gated?
- How broad is the available API surface?
- Does an official or community MCP implementation already exist?
- Can the application become an agent-callable toolkit today?
- If not, what is the actual blocker?

Answering these questions manually across hundreds of applications does not scale.

This project builds an AI-assisted research and verification pipeline for that problem.

The system researched a benchmark of **100 applications across 10 categories**, transformed fragmented developer documentation into structured integration intelligence, assigned buildability verdicts through deterministic product rules, independently verified a stratified sample, diagnosed systematic failure modes, and generated a self-contained case study for decision-makers.

The objective was not simply to produce 100 rows.

The objective was to build a repeatable system that could answer:

> **Where should an integration platform build now, where should it pursue partnerships, and where is the available evidence still too weak to make a confident decision?**

---

## Live Case Study

The primary deliverable is a self-contained interactive HTML case study:

**`case-study.html`**

It is designed to be understood by a reviewer in approximately two minutes without narration.

The case study includes:

- the headline portfolio finding;
- buildability verdict distribution;
- five cross-portfolio patterns;
- an interactive 100-app explorer;
- the research-agent workflow;
- verification methodology;
- measured accuracy before and after verification;
- failure modes and honest misses;
- uncertainty and provenance analysis;
- runnable proof of the underlying system.

The page contains all required data, styling, and interaction logic in a single file and can be opened directly in a browser.

---

## Executive Findings

The final presentation layer identifies:

| Verdict | Apps | Interpretation |
|---|---:|---|
| `BUILD_NOW` | 20 | Strong current opportunity for an agent-callable toolkit |
| `BUILD_WITH_CAVEATS` | 3 | Buildable, but with meaningful implementation or access constraints |
| `OUTREACH_REQUIRED` | 12 | Integration opportunity exists, but access requires sales, partnership, approval, or vendor coordination |
| `BLOCKED_LOW_PRIORITY` | 4 | Current API/access conditions make near-term investment unattractive |
| `UNCLEAR` | 61 | Available verified evidence is insufficient for a confident promotion to another verdict |

A major finding of the project is that `UNCLEAR` does **not** necessarily mean that an API does not exist.

In many cases, it means that the one-pass research system found evidence of an API but did not obtain enough independently validated evidence about authentication, credential access, onboarding requirements, or another material field to promote the application confidently.

That distinction became one of the most important lessons from the system.

---

## The Core Product Insight

The easiest integration opportunities are not simply the applications with the largest APIs.

The strongest `BUILD_NOW` candidates combine three properties:

1. a documented public API;
2. credentials obtainable without manual approval;
3. sufficiently broad read/write capabilities for meaningful agent actions.

By contrast, the most common blockers were not purely technical.

They included:

- partnership requirements;
- contact-sales access;
- tenant or administrator approval;
- unclear credential issuance;
- documentation that confirms an API but not the path to usable credentials;
- evidence that could not be validated strongly enough in a single research pass.

This changes the product question from:

> “Which applications have APIs?”

to:

> “Which applications have APIs that a developer can actually access and turn into useful agent actions today?”

---

## What I Built

I built a multi-stage research, verification, calibration, analytics, and presentation pipeline.

At a high level:

```text
100-App Benchmark
        │
        ▼
Official Source Discovery
        │
        ▼
Deterministic Source Fetching
        │
        ▼
Structured LLM Extraction
        │
        ▼
Evidence Validation
        │
        ▼
Deterministic Buildability Verdict
        │
        ▼
Risk Flags + Immediate Persistence
        │
        ▼
Independent Verification Sample
        │
        ▼
Failure Analysis + Calibration
        │
        ▼
Portfolio-Level Analytics
        │
        ▼
Interactive Case Study
```

The architecture deliberately separates probabilistic work from deterministic product logic.

> **The LLM extracts structured facts. A deterministic TypeScript state machine converts those facts into buildability verdicts.**

This was an intentional design decision.

The model is used where language understanding is valuable:

- interpreting documentation;
- extracting authentication details;
- identifying access restrictions;
- summarizing API breadth;
- identifying MCP availability;
- collecting supporting evidence.

The model does **not** directly control the final product classification.

Instead, structured extracted facts are passed into deterministic verdict rules.

This makes the system:

- easier to inspect;
- easier to test;
- easier to reproduce;
- easier to calibrate;
- safer to change;
- more useful for downstream product operations.

---

## Why I Did Not Ask the LLM to Directly Decide Everything

A fully generative pipeline would have been faster to prototype, but harder to trust.

If a model directly outputs:

> `BUILD_NOW`

it is difficult to determine whether that verdict came from:

- confirmed public API availability;
- inferred authentication support;
- assumed self-serve access;
- weak evidence;
- or hallucinated reasoning.

Instead, this system separates the problem into two layers.

### Layer 1: Probabilistic Research

The model extracts structured facts such as:

```text
public_api_status
auth_methods
developer_access_model
credentials_obtainable_without_approval
api_breadth
mcp_status
primary_blocker
evidence
```

### Layer 2: Deterministic Product Decision

A TypeScript verdict engine evaluates those facts using explicit rules.

Conceptually:

```text
IF public API exists
AND credentials are obtainable without approval
AND authentication is understood
AND the API surface is useful
THEN BUILD_NOW
```

Other combinations map to:

```text
BUILD_WITH_CAVEATS
OUTREACH_REQUIRED
BLOCKED_LOW_PRIORITY
UNCLEAR
```

This separation made it possible to diagnose an important system-level problem later:

> The research layer was often directionally correct, while conservative evidence-validation guardrails caused valid opportunities to remain `UNCLEAR`.

That would have been much harder to discover if extraction and decision-making were hidden inside one model response.

---

## Research Scope

The benchmark contains **100 applications across 10 categories**.

| Category | Apps |
|---|---:|
| CRM and Sales | 10 |
| Support and Helpdesk | 10 |
| Communications and Messaging | 10 |
| Marketing, Ads, Email and Social | 10 |
| Ecommerce | 10 |
| Data, SEO and Scraping | 10 |
| Developer, Infra and Data Platforms | 10 |
| Productivity and Project Management | 10 |
| Finance and Fintech | 10 |
| AI, Research and Media-native | 10 |

The benchmark intentionally includes a difficult mix of:

- mature developer platforms;
- enterprise software;
- open-source tools;
- consumer applications;
- self-serve APIs;
- partner-gated APIs;
- sales-gated products;
- applications with official MCP support;
- applications with community MCP implementations;
- applications with fragmented or ambiguous documentation.

This made the task useful as a systems problem rather than a simple documentation-scraping exercise.

---

## What the Agent Captures

For every application, the research pipeline attempts to determine the material fields required for a toolkit decision.

### Application Context

- category;
- one-line description;
- official website;
- developer documentation sources.

### Authentication

- OAuth 2.0;
- API key;
- Basic authentication;
- bearer token;
- custom authentication;
- other documented mechanisms.

### Developer Access

- self-serve;
- paid self-serve;
- trial-based;
- admin-gated;
- sales-gated;
- partnership-gated;
- unclear.

### Credential Availability

The system distinguishes between:

- an API existing;
- documentation existing;
- and a developer actually being able to obtain usable credentials.

This distinction is critical for product prioritization.

### API Surface

The system captures:

- whether a public API exists;
- REST, GraphQL, or other surface;
- approximate breadth;
- read/write capability;
- narrow versus broad integration potential.

### MCP Availability

The system looks for:

- official MCP support;
- community MCP implementations;
- no MCP found;
- unclear MCP status.

### Buildability

Each application receives one of five final presentation verdicts:

```text
BUILD_NOW
BUILD_WITH_CAVEATS
OUTREACH_REQUIRED
BLOCKED_LOW_PRIORITY
UNCLEAR
```

### Evidence

Material findings are tied to supporting evidence wherever available.

The system stores:

- evidence URLs;
- concise evidence snippets;
- validation status;
- confidence information;
- unresolved questions.

---

## Fast Scale Mode

The benchmark needed to be completed efficiently without turning the project into an uncontrolled sequence of expensive agent loops.

I therefore built a lean Fast Scale research path.

For each unfinished application, Fast Scale performs:

1. source discovery;
2. deterministic source fetching;
3. exactly one structured LLM extraction call;
4. deterministic evidence validation;
5. deterministic verdict computation;
6. deterministic risk-flag generation;
7. immediate persistence.

It deliberately does **not** perform:

- a critic pass;
- targeted re-research;
- a second extraction;
- browser fallback;
- full verification.

This created a useful product trade-off.

The system could scale quickly across the benchmark while explicitly marking records that required later attention.

Instead of pretending that every fast result had equal confidence, the pipeline generated deterministic risk flags.

Examples include:

```text
risk_access_model_unclear
risk_auth_methods_unclear
risk_public_api_unclear
risk_material_evidence_validation_failed
risk_insufficient_official_sources
risk_blocked_documentation
risk_contradictory_claims
risk_verdict_unclear
risk_low_confidence
```

This allowed uncertainty to become a queue for verification rather than a hidden weakness.

---

## Resumability and Failure Isolation

The benchmark runner was designed to survive interruption.

For every application, the runner:

1. reads the benchmark directly from the canonical 100-app file;
2. checks whether usable research already exists;
3. skips covered applications without modifying them;
4. processes only unfinished applications;
5. saves immediately after each successful completion.

This means the pipeline can restart safely without rerunning completed work.

The generic runner does not hardcode the remaining application IDs.

It determines the next unfinished application automatically.

If one application fails for a non-provider reason:

- the failure is isolated;
- existing data is preserved;
- the runner can continue.

If an unrecoverable provider error occurs:

- execution stops cleanly;
- completed work remains persisted;
- the first unfinished application can be reported.

This design became especially important during the migration from the free Gemini API route to billed Vertex AI.

---

## Vertex AI Migration

The initial research pipeline used the Gemini API route.

During benchmark execution, quota limits became a bottleneck.

I migrated the active LLM provider to Vertex AI using:

```text
Provider route: vertex-ai
Project: gen-lang-client-0153019470
Location: global
Model: gemini-2.5-flash
Authentication: Google Cloud Application Default Credentials
```

No API key is passed to the active `GoogleGenAI` Vertex AI client.

The migration preserved:

- prompts;
- research logic;
- schemas;
- verdict rules;
- risk flags;
- benchmark records.

Only the provider route changed.

This allowed the research system to continue at higher throughput without redesigning the pipeline.

---

## Token and Cost Observability

Before running the remaining benchmark, I added token-level observability to the Vertex AI provider.

For every successful LLM call, the provider captures:

```text
promptTokenCount
candidatesTokenCount
totalTokenCount
cachedContentTokenCount
thoughtsTokenCount
```

Missing optional fields are treated as zero.

Each successful call logs one concise usage line:

```text
[Vertex Usage] input=<input> output=<output> total=<total> cached=<cached> thoughts=<thoughts>
```

The system also maintains cumulative run-level totals for:

- input tokens;
- output tokens;
- total tokens;
- cached tokens;
- thinking tokens;
- successful LLM calls.

Usage metrics are persisted separately from research records:

```text
data/metrics/vertex-usage.json
```

This separation was deliberate.

Token and cost telemetry are operational metadata, not research facts.

The 100 benchmark records remain free from billing-specific fields.

The production research and verification work recorded approximately:

```text
116 successful LLM calls
~1.1 million total tokens
~$0.1072 estimated API cost
```

Cost values are treated as estimated API cost rather than final cloud billing.

---

## Verification Was a Separate System, Not a Second Extraction

The assignment prioritizes accuracy.

A first-pass research agent alone was therefore not sufficient.

I created a separate independent verification stage.

The verifier did **not** rerun the original extraction.

Instead, it:

1. loaded the existing research result as an immutable baseline;
2. preserved the original values;
3. independently re-checked material fields;
4. used fresh official sources wherever possible;
5. made one independent verification call per sampled application;
6. compared baseline values against verified values;
7. stored corrections separately.

The original research records were not overwritten.

For every material field, the verifier classified the baseline as:

```text
correct
partially_correct
incorrect
unverifiable
```

The material fields included:

- authentication methods;
- developer access model;
- credentials obtainable without approval;
- public API status;
- API breadth;
- MCP status;
- buildability verdict;
- primary blocker.

This created a measurable accuracy loop rather than a vague claim that the agent had been “checked.”

---

## Verification Results

A stratified **15-app verification sample** was independently audited.

### Before Verification

**Field-level baseline accuracy: 68.33%**

### After Verification

**Corrected sample accuracy: 97.50%**

### Improvement

**+29.17 percentage points**

The distinction between percentages and percentage points is intentional.

```text
97.50% - 68.33% = 29.17 percentage points
```

The project does not claim that all 100 applications were independently verified.

The accuracy measurement applies to the 15-app verification sample.

That limitation is preserved explicitly throughout the presentation.

---

## Why Verification Improved the System

The verification loop revealed that the most important problem was not simply hallucination.

The pipeline had several distinct failure modes.

### 1. Extraction Errors

The model occasionally failed to extract a fact that existed in the available evidence.

### 2. Evidence Validation Errors

The extracted fact could be directionally correct, but deterministic validation failed to match the evidence strongly enough.

### 3. Conservative Guardrail Errors

The system sometimes had enough information to suggest that an integration was buildable, but strict rules prevented promotion from `UNCLEAR`.

### 4. Genuine Uncertainty

Some applications genuinely did not expose enough public information to determine:

- credential availability;
- access restrictions;
- approval requirements;
- or implementation feasibility.

Separating these failure modes was essential.

Without that analysis, every `UNCLEAR` result would have looked like the same problem.

It was not.

---

## The UNCLEAR Funnel

The baseline system initially produced:

```text
76 UNCLEAR
```

After deterministic recalibration:

```text
70 UNCLEAR
```

After targeted verification and final presentation calibration:

```text
61 UNCLEAR
```

The final 61 are explicitly separated into:

```text
7 genuinely unresolved after dedicated verification
54 baseline-unverified conservative UNCLEAR
```

This distinction is important.

`UNCLEAR` does not mean:

> “No API exists.”

It often means:

> “The one-pass system did not collect or validate enough evidence to promote this application confidently.”

The case study visualizes this uncertainty exactly once rather than repeating it across multiple sections.

---

## Provenance Model

The final dataset uses four explicit provenance tiers.

### `independently_verified`

Applications included in the independent verification sample.

These records received dedicated re-checking against fresh evidence.

### `targeted_verified`

Borderline applications that received focused verification after the initial calibration stage.

### `deterministically_calibrated`

Applications whose verdicts could be adjusted from existing facts using deterministic rules without another LLM call.

### `baseline_unverified`

Applications that retain their baseline research result and are not represented as independently verified.

The final provenance distribution is:

| Provenance Tier | Apps |
|---|---:|
| Independently verified | 15 |
| Targeted verified | 14 |
| Deterministically calibrated | 3 |
| Baseline unverified | 68 |

This provenance model prevents a common analytics mistake:

> presenting every row in a large AI-generated dataset as equally verified.

They are not.

The system preserves that difference.

---

## Human-in-the-Loop Strategy

The project does not assume that a human should manually verify all 100 applications.

That would defeat the purpose of building the system.

Instead, human attention should be allocated based on risk and product value.

The intended workflow is:

```text
Agent researches all applications
        │
        ▼
Deterministic rules classify opportunities
        │
        ▼
Risk flags identify weak evidence
        │
        ▼
Stratified verification measures accuracy
        │
        ▼
Targeted verification resolves high-value uncertainty
        │
        ▼
Human reviews only consequential edge cases
```

A human is most valuable when:

- documentation is contradictory;
- access requirements are commercially gated;
- credentials require a real tenant;
- a high-value application remains uncertain;
- the model and evidence validator disagree;
- a verdict could materially affect roadmap prioritization.

This is the operating model I would use at larger scale.

---

## Five Portfolio-Level Patterns

The assignment asked for patterns rather than only 100 rows.

The system therefore analyzes the benchmark as a portfolio.

### 1. Self-Serve Developer Platforms Produce the Clearest Build Opportunities

Applications with:

- public documentation;
- self-serve credentials;
- standard authentication;
- broad read/write APIs;

are the strongest immediate toolkit candidates.

Representative opportunities include applications across:

- CRM;
- developer infrastructure;
- productivity;
- data tooling.

---

### 2. Enterprise Access Friction Is Often More Important Than API Breadth

A broad API does not automatically make an application easy to integrate.

Some platforms expose extensive developer capabilities but still require:

- partnership approval;
- vendor outreach;
- administrator access;
- enterprise contracts;
- tenant-level approval.

For product prioritization, access friction can matter more than endpoint count.

---

### 3. OAuth 2.0 and API Keys Dominate Resolved Authentication Patterns

Across applications where authentication could be confidently resolved, modern integrations are primarily built around:

- OAuth 2.0;
- API keys;
- bearer tokens.

This suggests that a toolkit platform can standardize a large portion of integration infrastructure around a relatively small set of reusable authentication patterns.

---

### 4. Public APIs Are Much More Common Than Official MCP Support

Many applications already expose broad APIs.

Official MCP support is considerably less mature.

This creates two different opportunity classes:

1. applications where the underlying API already makes toolkit construction practical;
2. applications where official MCP support provides an additional agent-native integration path.

The absence of MCP does not imply that an application is not agent-buildable.

---

### 5. Verification Infrastructure Matters as Much as Research Speed

The first-pass system could research applications quickly.

The harder product problem was knowing when to trust the output.

The largest quality improvement came from:

- preserving evidence;
- separating extraction from verdict logic;
- adding deterministic risk flags;
- measuring accuracy on a sample;
- diagnosing failure modes;
- keeping provenance explicit.

The project therefore evolved from:

> “an agent that researches APIs”

into:

> “a research operations system that knows which outputs are strong, which are weak, and where additional effort creates the most value.”

---

## Interactive 100-App Explorer

The case study includes an interactive explorer for all 100 applications.

The table supports:

- text search;
- category filtering;
- verdict filtering;
- provenance filtering;
- row expansion;
- evidence inspection.

Each application can expose:

- assignment number;
- application name;
- category;
- final verdict;
- provenance tier;
- authentication;
- public API status;
- API breadth;
- MCP status;
- primary blocker;
- evidence URLs;
- verdict progression.

This allows both machine-scale findings and individual records to be inspected from the same interface.

---

## Data Integrity and Identity Safety

A 100-application benchmark creates a subtle engineering risk:

> data from one application can accidentally be joined to another application.

The pipeline therefore treats `assignment_number` as the canonical benchmark identity.

The project includes regression tests for:

- exact 100-row identity mapping;
- benchmark-to-record joins;
- calibration joins;
- verification joins;
- presentation joins;
- provenance totals;
- verdict arithmetic.

The final local audit confirmed:

```text
100 / 100 records complete
0 identity mismatches
10 deep-verified records
90 Fast Scale records
```

This was especially important because a visually polished dashboard with incorrect identity joins would be worse than an incomplete one.

---

## Testing Strategy

The project includes a full automated test suite.

Current status:

```text
54 / 54 tests passing
8 test suites
```

The test suite covers:

### Verdict Logic

```text
src/tests/verdict.test.ts
```

Tests deterministic state-machine behavior.

### Pre-Scale Fixes

```text
src/tests/pre-scale-fixes.test.ts
```

Tests authentication extraction and API-related guardrails.

### Final Calibration

```text
src/tests/final-calibration.test.ts
```

Tests calibration invariants and baseline preservation.

### Benchmark Validation

```text
src/tests/validate-benchmark.test.ts
```

Tests exact benchmark identity joins.

### Case Study Data Contract

```text
src/tests/case-study-data.test.ts
```

Tests:

- contract completeness;
- quantitative claims;
- identity joins;
- verification metrics;
- `+29.17 pp` unit correctness;
- uncertainty progression.

### Analytics Regression

```text
src/tests/analytics-regression.test.ts
```

Tests:

- exact 100-row identity;
- verdict counts;
- provenance sums;
- arithmetic reconciliation.

### Local Audit

```text
src/tests/local-audit.test.ts
```

Tests research artifact completeness.

### Usage Observability

```text
src/tests/usage.test.ts
```

Tests:

- token accumulation;
- missing optional usage fields;
- failed-call exclusion;
- persistence;
- preservation of existing metrics;
- estimated-cost configuration behavior.

---

## Repository Structure

```text
composio-toolkit-intelligence/
│
├── case-study.html
├── README.md
├── package.json
│
├── data/
│   ├── benchmark_100.json
│   │
│   ├── records/
│   │   └── app_*.json
│   │
│   ├── analysis/
│   │   └── verification_sample_15.json
│   │
│   ├── verification/
│   │   ├── verification_results_15.json
│   │   ├── accuracy_report.json
│   │   ├── failure_taxonomy.json
│   │   └── verdict_calibration_recommendation.json
│   │
│   ├── calibrated/
│   │   ├── calibrated_100.json
│   │   ├── final_presentation_100.json
│   │   ├── final_analytics.json
│   │   └── targeted_verified/
│   │
│   ├── presentation/
│   │   └── case_study_data.json
│   │
│   └── metrics/
│       └── vertex-usage.json
│
└── src/
    ├── cli/
    │   ├── build-html.ts
    │   ├── generate-case-study-data.ts
    │   └── research runners
    │
    ├── engine/
    │   ├── research pipeline
    │   ├── Fast Scale pipeline
    │   └── verdict logic
    │
    ├── providers/
    │   ├── LLM provider
    │   ├── search provider
    │   └── fetcher provider
    │
    ├── types/
    │   └── schemas
    │
    └── tests/
        └── automated regression suites
```

---

## Running the Project

### Prerequisites

```text
Node.js 18+
npm
```

### Installation

```bash
git clone <repository-url>
cd composio-toolkit-intelligence
npm install
```

---

## Run the Test Suite

```bash
npm test
```

This runs the complete verification and regression suite.

Expected result:

```text
54 / 54 tests passing
```

The test suite does not require a new LLM call.

---

## Replay the Deep-Verified Pipeline

```bash
npm run gate:b
```

The repository contains saved deep-verified records for the replay targets.

The runner's resumability logic detects completed records and skips unnecessary research work.

This provides a reproducible demonstration of:

- benchmark loading;
- record inspection;
- resume behavior;
- pipeline orchestration;
- verification reporting.

---

## Rebuild the Case Study Data

```bash
npm run build:data
```

This regenerates the presentation data contract from authoritative local artifacts.

---

## Rebuild the HTML Case Study

```bash
npm run build:html
```

This regenerates:

```text
case-study.html
```

from the locked presentation data contract.

The HTML is deterministic and self-contained.

---

## Open the Case Study

Open:

```text
case-study.html
```

directly in a browser.

No application server is required.

---

## Design Principles

Several principles guided the implementation.

### 1. Evidence Over Model Confidence

A confident model response is not equivalent to a verified fact.

Material claims should be tied to evidence.

### 2. Deterministic Decisions Over Free-Form Verdicts

LLMs are useful for interpreting documentation.

Product classifications should be explicit and testable.

### 3. Preserve the Baseline

Verification should not silently rewrite history.

Original outputs remain available for before/after comparison.

### 4. Make Uncertainty Visible

An uncertain result should remain uncertain until evidence supports promotion.

### 5. Verify Strategically

The goal is not to manually redo every AI-generated result.

The goal is to identify where verification produces the highest marginal value.

### 6. Optimize Wall-Clock Time Without Hiding Quality Trade-offs

Fast Scale Mode reduced research time.

Risk flags and provenance preserved the cost of that speed.

### 7. Separate Research Data from Operational Telemetry

Token usage and estimated cost are stored separately from benchmark facts.

### 8. Make the Final Output Useful to a Decision-Maker

The final artifact prioritizes:

- opportunities;
- blockers;
- patterns;
- evidence;
- uncertainty;
- trust.

The pipeline exists to support product decisions, not merely to demonstrate technical complexity.

---

## What I Would Improve Next

Given more time, I would extend the system in four directions.

### 1. Risk-Based Verification Scheduling

Instead of selecting verification targets primarily through stratified sampling and targeted uncertainty, I would score every record using:

```text
business value
× uncertainty
× evidence weakness
× expected correction impact
```

The highest-value records would be verified first.

### 2. Claim-Level Evidence Graph

Each material claim could be represented as:

```text
claim
→ source
→ evidence snippet
→ validation status
→ confidence
→ downstream verdict impact
```

This would make it easier to explain exactly why a verdict changed.

### 3. Documentation Change Monitoring

Developer access conditions change.

A production system should periodically re-check:

- authentication documentation;
- pricing restrictions;
- developer onboarding;
- partner requirements;
- API deprecations;
- MCP availability.

### 4. Human Review Queue

Instead of a generic list of uncertain applications, the system could generate a prioritized operations queue such as:

```text
High product value + weak access evidence
High product value + contradictory documentation
Likely BUILD_NOW + evidence validation failure
Likely OUTREACH_REQUIRED + missing partnership evidence
```

This would convert the research pipeline into an ongoing Product Ops system.

---

## Key Technical Decisions

| Decision | Why |
|---|---|
| Structured LLM extraction | Makes research machine-readable |
| Deterministic verdict engine | Makes product decisions reproducible |
| One-call Fast Scale mode | Controls latency and cost |
| Immediate persistence | Makes long runs resumable |
| Risk flags | Converts uncertainty into a verification queue |
| Immutable baseline | Enables honest before/after measurement |
| Independent verification | Measures actual system quality |
| Provenance tiers | Prevents false claims of universal verification |
| Identity regression tests | Prevents cross-app data corruption |
| Separate usage metrics | Keeps operational telemetry out of research records |
| Self-contained HTML | Makes the submission easy to review |

---

## Assignment Requirements Coverage

| Requirement | Implementation |
|---|---|
| Research 100 applications | Complete |
| Category and one-line description | Structured research records |
| Authentication methods | Extracted and normalized |
| Self-serve vs gated access | Developer access model |
| Public API and breadth | Structured API surface fields |
| MCP availability | Official/community/none/unclear status |
| Buildability verdict | Deterministic 5-tier verdict system |
| Evidence | Source URLs and evidence records |
| Find cross-portfolio patterns | Five headline findings |
| Build an agent/pipeline | Multi-stage TypeScript research system |
| Explain human involvement | Risk-based verification strategy |
| Verify accuracy | 15-app independent sample |
| Show first-pass accuracy | 68.33% |
| Show improvement | 97.50% after verification |
| Show misses honestly | Failure taxonomy and uncertainty funnel |
| Single self-explanatory deliverable | Interactive `case-study.html` |
| Runnable proof | Test suite and pipeline replay |
| Source repository | This repository |

---

## What This Project Demonstrates

This project is intended to demonstrate more than the ability to call an LLM API.

It demonstrates:

### Product Judgment

The system optimizes for the question that matters:

> Which integrations are worth building, which require outreach, and which need more evidence?

### AI Systems Thinking

The architecture separates:

- research;
- extraction;
- evidence;
- decision logic;
- verification;
- calibration;
- analytics;
- presentation.

### Product Operations

The pipeline turns a large, ambiguous research problem into:

- structured records;
- repeatable workflows;
- prioritized opportunities;
- explicit blockers;
- measurable quality.

### Engineering Execution

The system includes:

- resumable execution;
- provider migration;
- concurrency;
- error isolation;
- atomic persistence;
- deterministic tests;
- usage observability;
- reproducible artifact generation.

### Analytical Rigor

The final output includes:

- portfolio-level patterns;
- accuracy measurement;
- failure-mode analysis;
- uncertainty decomposition;
- provenance tracking.

### Honesty About AI Limitations

The project does not claim that:

- every model output was correct;
- all 100 records were independently verified;
- every `UNCLEAR` application lacks an API;
- the verification sample proves universal accuracy.

Instead, it shows:

- what was measured;
- what improved;
- what remains uncertain;
- and where additional work would create the most value.

---

## Final Takeaway

The main lesson from this project is that scaling AI research is not primarily a prompting problem.

The difficult part is building a system that can answer:

```text
What did the agent find?
What evidence supports it?
Which decisions are deterministic?
Where is the system uncertain?
How accurate was the first pass?
What did verification correct?
Which results should a human inspect next?
```

The final result is therefore not just a 100-row dataset.

It is a small Product Operations system for converting fragmented developer information into:

- integration opportunities;
- access blockers;
- outreach priorities;
- verification queues;
- and defensible product decisions.

---

## Author

**Yash Jha**

Built as an AI Product Operations take-home project.

**July 2026**