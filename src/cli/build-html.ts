import fs from 'fs';
import path from 'path';

const dataPath = path.resolve(process.cwd(), 'data/presentation/case_study_data.json');
if (!fs.existsSync(dataPath)) {
  console.error(`[Error] Authoritative data contract not found at ${dataPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Format numbers
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Generate the complete self-contained HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Composio Toolkit Intelligence — 100-App Buildability Research Case Study</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --surface: #18181b;
      --surface-hover: #27272a;
      --surface-card: #121215;
      --border: #27272a;
      --border-light: #3f3f46;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --text-dim: #71717a;
      --accent: #6366f1;
      --accent-light: #818cf8;
      
      --verdict-build-now: #10b981;
      --verdict-build-now-bg: rgba(16, 185, 129, 0.12);
      --verdict-caveats: #f59e0b;
      --verdict-caveats-bg: rgba(245, 158, 11, 0.12);
      --verdict-outreach: #8b5cf6;
      --verdict-outreach-bg: rgba(139, 92, 246, 0.15);
      --verdict-blocked: #64748b;
      --verdict-blocked-bg: rgba(100, 116, 139, 0.15);
      --verdict-unclear: #94a3b8;
      --verdict-unclear-bg: rgba(148, 163, 184, 0.12);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      scroll-behavior: smooth;
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    a {
      color: var(--accent-light);
      text-decoration: none;
      transition: color 0.15s ease;
    }

    a:hover {
      color: #fff;
    }

    code, .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.88em;
    }

    /* Sticky Navigation */
    .sticky-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(9, 9, 11, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 0 1.5rem;
    }

    .nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .nav-brand {
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: -0.02em;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-brand-badge {
      background: var(--surface-hover);
      color: var(--text-muted);
      font-size: 0.72rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .nav-links {
      display: flex;
      gap: 1.5rem;
      list-style: none;
    }

    .nav-links a {
      color: var(--text-muted);
      font-size: 0.86rem;
      font-weight: 500;
      transition: color 0.15s ease;
    }

    .nav-links a:hover {
      color: var(--text);
    }

    /* Main Container */
    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem 5rem 1.5rem;
      flex: 1;
      width: 100%;
    }

    section {
      padding: 4rem 0;
      border-bottom: 1px solid var(--border);
    }

    section:last-of-type {
      border-bottom: none;
    }

    .section-title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
    }

    .section-subhead {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 760px;
      margin-bottom: 2.5rem;
    }

    /* Section 0: Hero */
    .hero {
      padding: 4.5rem 0 3.5rem 0;
    }

    .hero-headline {
      font-size: clamp(2.2rem, 4.5vw, 3.25rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1.15;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-headline span {
      background: linear-gradient(135deg, var(--verdict-build-now) 0%, #6ee7b7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-subhead {
      font-size: 1.15rem;
      color: var(--text-muted);
      max-width: 780px;
      margin-bottom: 3rem;
      line-height: 1.6;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: border-color 0.15s ease;
    }

    .stat-card:hover {
      border-color: var(--border-light);
    }

    .stat-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.75rem;
    }

    .stat-value {
      font-size: 2.35rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
    }

    .stat-card.build-now .stat-value { color: var(--verdict-build-now); }
    .stat-card.outreach .stat-value { color: var(--verdict-outreach); }
    .stat-card.lift .stat-value { color: #60a5fa; }

    /* Credibility Strip */
    .credibility-strip {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.86rem;
      font-weight: 500;
      color: var(--text-muted);
    }

    .cred-item {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .cred-item strong {
      color: var(--text);
      font-weight: 600;
    }

    .cred-arrow {
      color: var(--text-dim);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Section 1: Verdict Distribution */
    .verdict-bar-container {
      margin-top: 1rem;
    }

    .verdict-bar {
      display: flex;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
      margin-bottom: 1.25rem;
    }

    .verdict-segment {
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      color: #fff;
      transition: filter 0.15s ease;
      cursor: default;
      position: relative;
    }

    .verdict-segment:hover {
      filter: brightness(1.15);
    }

    .verdict-segment.build-now { background-color: var(--verdict-build-now); }
    .verdict-segment.outreach { background-color: var(--verdict-outreach); }
    .verdict-segment.caveats { background-color: var(--verdict-caveats); color: #000; }
    .verdict-segment.blocked { background-color: var(--verdict-blocked); }
    .verdict-segment.unclear { background-color: var(--verdict-unclear); color: #1e293b; }

    .verdict-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      justify-content: center;
      font-size: 0.86rem;
      color: var(--text-muted);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .legend-dot.build-now { background-color: var(--verdict-build-now); }
    .legend-dot.outreach { background-color: var(--verdict-outreach); }
    .legend-dot.caveats { background-color: var(--verdict-caveats); }
    .legend-dot.blocked { background-color: var(--verdict-blocked); }
    .legend-dot.unclear { background-color: var(--verdict-unclear); }

    /* Section 2: Patterns */
    .pattern-stack {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .pattern-card {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.75rem;
      transition: border-color 0.15s ease;
    }

    .pattern-card:hover {
      border-color: var(--border-light);
    }

    .pattern-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .pattern-number {
      background: var(--surface-hover);
      color: var(--accent-light);
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      flex-shrink: 0;
    }

    .pattern-headline {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.35;
    }

    .pattern-body {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }

    .pattern-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border);
    }

    .pattern-apps {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .pattern-apps-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      margin-right: 0.25rem;
    }

    .app-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--text);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .app-pill:hover {
      border-color: var(--accent);
      background: var(--surface-hover);
    }

    .verdict-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .verdict-dot.BUILD_NOW { background-color: var(--verdict-build-now); }
    .verdict-dot.OUTREACH_REQUIRED { background-color: var(--verdict-outreach); }
    .verdict-dot.BUILD_WITH_CAVEATS { background-color: var(--verdict-caveats); }
    .verdict-dot.BLOCKED_LOW_PRIORITY { background-color: var(--verdict-blocked); }
    .verdict-dot.UNCLEAR { background-color: var(--verdict-unclear); }

    .pattern-categories {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .cat-tag {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-dim);
      font-size: 0.76rem;
      padding: 0.18rem 0.5rem;
      border-radius: 4px;
    }

    /* Section 3: 100-App Explorer */
    .explorer-controls {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
      background: var(--surface);
      padding: 1.25rem;
      border-radius: 10px;
      border: 1px solid var(--border);
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .control-label {
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .explorer-input, .explorer-select {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.55rem 0.75rem;
      border-radius: 6px;
      font-size: 0.86rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .explorer-input:focus, .explorer-select:focus {
      border-color: var(--accent);
    }

    .table-container {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      max-height: 680px;
      overflow-y: auto;
    }

    .explorer-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.86rem;
    }

    .explorer-table th {
      position: sticky;
      top: 0;
      background: #18181b;
      z-index: 10;
      padding: 0.75rem 1rem;
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      user-select: none;
    }

    .explorer-table th:hover {
      color: var(--text);
    }

    .explorer-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(39, 39, 42, 0.6);
      color: var(--text);
    }

    .explorer-table tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .explorer-table tr.clickable-row {
      cursor: pointer;
      transition: background-color 0.1s ease;
    }

    .explorer-table tr.clickable-row:hover {
      background: var(--surface-hover);
    }

    .explorer-table tr.expanded-details {
      background: #101014;
    }

    .verdict-badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .verdict-badge.BUILD_NOW { background: var(--verdict-build-now-bg); color: var(--verdict-build-now); border: 1px solid rgba(16, 185, 129, 0.3); }
    .verdict-badge.OUTREACH_REQUIRED { background: var(--verdict-outreach-bg); color: var(--verdict-outreach); border: 1px solid rgba(139, 92, 246, 0.3); }
    .verdict-badge.BUILD_WITH_CAVEATS { background: var(--verdict-caveats-bg); color: var(--verdict-caveats); border: 1px solid rgba(245, 158, 11, 0.3); }
    .verdict-badge.BLOCKED_LOW_PRIORITY { background: var(--verdict-blocked-bg); color: var(--verdict-blocked); border: 1px solid rgba(100, 116, 139, 0.3); }
    .verdict-badge.UNCLEAR { background: var(--verdict-unclear-bg); color: var(--verdict-unclear); border: 1px solid rgba(148, 163, 184, 0.3); }

    .prov-badge {
      font-size: 0.78rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    /* Inline Row Details */
    .row-detail-panel {
      padding: 1.25rem 1.5rem;
      border-top: 1px dashed var(--border);
      border-bottom: 2px solid var(--accent);
      background: rgba(18, 18, 21, 0.95);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .detail-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .detail-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-dim);
      text-transform: uppercase;
    }

    .detail-text {
      font-size: 0.88rem;
      color: var(--text);
    }

    .progression-pills {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* Section 4: Agent Workflow */
    .workflow-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
      margin-bottom: 2.5rem;
    }

    .stage-card {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      position: relative;
    }

    .stage-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--accent-light);
      margin-bottom: 0.5rem;
      display: inline-block;
    }

    .stage-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.5rem;
    }

    .stage-count {
      display: inline-block;
      background: rgba(99, 102, 241, 0.15);
      color: var(--accent-light);
      font-size: 0.74rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      margin-bottom: 0.75rem;
    }

    .stage-desc {
      font-size: 0.82rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    details.disclosure {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 1rem;
      overflow: hidden;
    }

    details.disclosure summary {
      padding: 1rem 1.25rem;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text);
      user-select: none;
    }

    details.disclosure summary:hover {
      background: var(--surface-hover);
    }

    details.disclosure summary::after {
      content: "▸";
      font-size: 1rem;
      color: var(--text-muted);
      transition: transform 0.2s ease;
    }

    details[open].disclosure summary::after {
      transform: rotate(90deg);
    }

    .disclosure-body {
      padding: 1.25rem;
      border-top: 1px solid var(--border);
      background: var(--surface-card);
      font-size: 0.88rem;
      color: var(--text-muted);
    }

    .def-grid {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(39, 39, 42, 0.4);
    }

    .def-grid:last-of-type {
      border-bottom: none;
    }

    .def-term {
      font-weight: 600;
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
    }

    /* Matrix Table inside details */
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }

    .matrix-table th, .matrix-table td {
      padding: 0.6rem 0.8rem;
      border: 1px solid var(--border);
      text-align: center;
    }

    .matrix-table th {
      background: var(--surface);
      font-weight: 600;
      color: var(--text);
      text-align: left;
    }

    .matrix-table td.cat-name {
      text-align: left;
      font-weight: 500;
      color: var(--text);
    }

    /* Section 5: Honest Misses & Uncertainty */
    .uncertainty-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2.5rem;
    }

    .uncertainty-header {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      color: #fff;
    }

    .funnel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 0.6rem;
      font-size: 0.9rem;
    }

    .funnel-row strong {
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
    }

    .funnel-branch {
      margin-left: 2rem;
      padding: 0.75rem 1rem;
      background: rgba(18, 18, 21, 0.6);
      border-left: 3px solid var(--verdict-unclear);
      border-radius: 0 8px 8px 0;
      margin-bottom: 0.5rem;
      font-size: 0.86rem;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .funnel-branch strong {
      color: #fff;
    }

    .funnel-annotation {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border);
      font-size: 0.92rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    .funnel-annotation strong {
      color: var(--text);
    }

    .misses-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }

    .miss-card {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .miss-header {
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.75rem;
    }

    .miss-body {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
      line-height: 1.6;
    }

    /* Section 6: Run It */
    .run-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .code-box {
      background: #101014;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.84rem;
      color: #e2e8f0;
      overflow-x: auto;
      margin-bottom: 1rem;
    }

    .code-box .comment {
      color: #64748b;
    }

    .code-box .cmd {
      color: #38bdf8;
      font-weight: 600;
    }

    .token-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
    }

    .token-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }

    .token-stat {
      display: flex;
      flex-direction: column;
    }

    .token-stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .token-stat-val {
      font-size: 1.25rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
    }

    /* Footer */
    footer {
      padding: 3rem 0;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-dim);
    }

    /* Responsive Utilities */
    @media (max-width: 1024px) {
      .stat-grid { grid-template-columns: repeat(2, 1fr); }
      .workflow-grid { grid-template-columns: repeat(2, 1fr); }
      .misses-grid { grid-template-columns: 1fr; }
      .run-grid { grid-template-columns: 1fr; }
      .explorer-controls { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 640px) {
      .stat-grid { grid-template-columns: 1fr; }
      .workflow-grid { grid-template-columns: 1fr; }
      .explorer-controls { grid-template-columns: 1fr; }
      .row-detail-panel { grid-template-columns: 1fr; }
      .def-grid { grid-template-columns: 1fr; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>

  <!-- Sticky Navigation -->
  <nav class="sticky-nav">
    <div class="nav-inner">
      <div class="nav-brand">
        Composio Toolkit Intelligence
        <span class="nav-brand-badge">100-App Case Study</span>
      </div>
      <ul class="nav-links">
        <li><a href="#hero">Findings</a></li>
        <li><a href="#verdicts">Landscape</a></li>
        <li><a href="#patterns">Patterns</a></li>
        <li><a href="#explorer">Explorer</a></li>
        <li><a href="#workflow">Agent</a></li>
        <li><a href="#uncertainty">Misses</a></li>
        <li><a href="#run">Run It</a></li>
      </ul>
    </div>
  </nav>

  <main>
    <!-- Section 0: Hero + Credibility Strip -->
    <section id="hero" class="hero">
      <h1 class="hero-headline">
        <span>20 of 100 apps</span> are ready to become Composio agent toolkits today.
      </h1>
      <p class="hero-subhead">
        An autonomous research agent analyzed 100 applications across 10 categories and measured its own accuracy. Independent verification improved sampled field-level accuracy from 68.33% to 97.50% (+29.17 pp).
      </p>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Apps Researched</div>
          <div class="stat-value">${data.contract_metadata.total_apps}</div>
        </div>
        <div class="stat-card build-now">
          <div class="stat-label">Build Now Toolkits</div>
          <div class="stat-value">${data.distributions.final_verdict_distribution.BUILD_NOW}</div>
        </div>
        <div class="stat-card outreach">
          <div class="stat-label">Outreach Required</div>
          <div class="stat-value">${data.distributions.final_verdict_distribution.OUTREACH_REQUIRED}</div>
        </div>
        <div class="stat-card lift">
          <div class="stat-label">Verification Accuracy Lift</div>
          <div class="stat-value">${data.verification_metrics.absolute_percentage_point_improvement}</div>
        </div>
      </div>

      <!-- Credibility Strip -->
      <div class="credibility-strip">
        <div class="cred-item"><span>🔍</span> <strong>100 apps researched</strong> across 10 categories</div>
        <div class="cred-arrow">→</div>
        <div class="cred-item"><span>📊</span> <strong>15-app verification sample</strong> audited</div>
        <div class="cred-arrow">→</div>
        <div class="cred-item"><span>📈</span> <strong>${data.verification_metrics.baseline_field_level_accuracy_percentage}</strong> baseline accuracy</div>
        <div class="cred-arrow">→</div>
        <div class="cred-item"><span>🎯</span> <strong>${data.verification_metrics.post_verification_field_level_accuracy_percentage}</strong> after verification</div>
        <div class="cred-arrow">→</div>
        <div class="cred-item" style="color: #60a5fa; font-weight: 700;"><span>⚡</span> <strong>+29.17 percentage points</strong> lift</div>
      </div>
    </section>

    <!-- Section 1: Verdict Distribution -->
    <section id="verdicts">
      <h2 class="section-title">Buildability Verdict Distribution</h2>
      <p class="section-subhead">
        Each of the 100 benchmark applications was deterministically classified into one of five buildability opportunity tiers based on extracted API availability, authentication methods, developer onboarding friction, and verification provenance.
      </p>

      <div class="verdict-bar-container">
        <div class="verdict-bar">
          <div class="verdict-segment build-now" style="width: 20%;" title="BUILD_NOW: 20 apps (20%)">BUILD NOW (20%)</div>
          <div class="verdict-segment caveats" style="width: 3%;" title="BUILD_WITH_CAVEATS: 3 apps (3%)">3%</div>
          <div class="verdict-segment outreach" style="width: 12%;" title="OUTREACH_REQUIRED: 12 apps (12%)">OUTREACH (12%)</div>
          <div class="verdict-segment blocked" style="width: 4%;" title="BLOCKED_LOW_PRIORITY: 4 apps (4%)">4%</div>
          <div class="verdict-segment unclear" style="width: 61%;" title="UNCLEAR: 61 apps (61%)">UNCLEAR (61%)</div>
        </div>

        <div class="verdict-legend">
          <div class="legend-item"><span class="legend-dot build-now"></span> <strong style="color:#fff;">20 BUILD_NOW</strong> &nbsp;— Self-serve dev access & public REST/SDK API</div>
          <div class="legend-item"><span class="legend-dot caveats"></span> <strong style="color:#fff;">3 BUILD_WITH_CAVEATS</strong> &nbsp;— Public API with narrow breadth or non-standard protocol</div>
          <div class="legend-item"><span class="legend-dot outreach"></span> <strong style="color:#fff;">12 OUTREACH_REQUIRED</strong> &nbsp;— API exists but requires sales or partner approval</div>
          <div class="legend-item"><span class="legend-dot blocked"></span> <strong style="color:#fff;">4 BLOCKED_LOW_PRIORITY</strong> &nbsp;— Documented lack of public developer API</div>
          <div class="legend-item"><span class="legend-dot unclear"></span> <strong style="color:#fff;">61 UNCLEAR</strong> &nbsp;— Ambiguous extraction (54 conservative + 7 genuinely unresolved)</div>
        </div>
      </div>
    </section>

    <!-- Section 2: Five Quantitative Patterns -->
    <section id="patterns">
      <h2 class="section-title">Five Quantitative Patterns Across 100 Apps</h2>
      <p class="section-subhead">
        Synthesizing atomic research facts across all 10 categories revealed five foundational patterns that dictate where Composio should deploy engineering resources immediately versus where product-ops outreach is required.
      </p>

      <div class="pattern-stack">
        ${data.top_five_patterns.map((pat: any) => `
          <div class="pattern-card">
            <div class="pattern-header">
              <div class="pattern-number">PATTERN #${pat.pattern_id}</div>
              <h3 class="pattern-headline">${pat.headline}</h3>
            </div>
            <p class="pattern-body">${pat.supporting_metric}</p>
            <div class="pattern-footer">
              <div class="pattern-apps">
                <span class="pattern-apps-label">Representative Apps:</span>
                ${pat.representative_apps.map((rep: any) => `
                  <div class="app-pill" onclick="jumpToApp(${rep.assignment_number})" title="Click to view #${rep.assignment_number} in Explorer">
                    <span class="verdict-dot ${rep.final_verdict}"></span>
                    <strong>#${rep.assignment_number} ${rep.app_name}</strong>
                  </div>
                `).join('')}
              </div>
              <div class="pattern-categories">
                ${pat.categories_driving.map((c: string) => `<span class="cat-tag">${c}</span>`).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Section 3: 100-App Explorer -->
    <section id="explorer">
      <h2 class="section-title">Searchable 100-App Explorer</h2>
      <p class="section-subhead">
        Explore every application in the authoritative benchmark. Filter by category, buildability verdict, or verification provenance tier. Click any row to progressively disclose its exact website, primary blocker, evidence URLs, and 3-stage verdict progression.
      </p>

      <div class="explorer-controls">
        <div class="control-group">
          <span class="control-label">Search App Name or #</span>
          <input type="text" id="searchInput" class="explorer-input" placeholder="e.g. Salesforce, Supabase, #56...">
        </div>
        <div class="control-group">
          <span class="control-label">Filter Category</span>
          <select id="categorySelect" class="explorer-select">
            <option value="ALL">All Categories (10)</option>
            ${Object.keys(data.matrices.category_by_verdict_matrix).map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="control-group">
          <span class="control-label">Filter Verdict</span>
          <select id="verdictSelect" class="explorer-select">
            <option value="ALL">All Verdicts (5)</option>
            <option value="BUILD_NOW">BUILD_NOW (20)</option>
            <option value="OUTREACH_REQUIRED">OUTREACH_REQUIRED (12)</option>
            <option value="BUILD_WITH_CAVEATS">BUILD_WITH_CAVEATS (3)</option>
            <option value="BLOCKED_LOW_PRIORITY">BLOCKED_LOW_PRIORITY (4)</option>
            <option value="UNCLEAR">UNCLEAR (61)</option>
          </select>
        </div>
        <div class="control-group">
          <span class="control-label">Filter Provenance</span>
          <select id="provenanceSelect" class="explorer-select">
            <option value="ALL">All Provenance Tiers (4)</option>
            <option value="independently_verified">Independently Verified (14)</option>
            <option value="targeted_verified">Targeted Verified (15)</option>
            <option value="deterministically_calibrated">Deterministically Calibrated (3)</option>
            <option value="baseline_unverified">Baseline Unverified (68)</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="explorer-table">
          <thead>
            <tr>
              <th onclick="sortTable('assignment_number')">#</th>
              <th onclick="sortTable('app_name')">Application</th>
              <th onclick="sortTable('assigned_category')">Category</th>
              <th onclick="sortTable('final_presentation_verdict')">Buildability Verdict</th>
              <th onclick="sortTable('verification_status')">Provenance Tier</th>
              <th>Auth Methods</th>
              <th>Public API</th>
              <th>Breadth</th>
              <th>MCP</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            <!-- Populated dynamically via client-side JavaScript -->
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 4: How the Research Agent Works -->
    <section id="workflow">
      <h2 class="section-title">How the Research Agent Works</h2>
      <p class="section-subhead">
        The research pipeline combines high-throughput single-pass LLM extraction with a rigorous multi-stage verification and deterministic calibration loop. All final opportunity tiers are computed by an immutable deterministic state machine (<code>src/engine/verdict.ts</code>).
      </p>

      <div class="workflow-grid">
        ${data.agent_workflow_stages.map((stage: any) => `
          <div class="stage-card">
            <span class="stage-num">PHASE ${stage.stage_order}</span>
            <h3 class="stage-title">${stage.stage_name.split(': ')[1] || stage.stage_name}</h3>
            <span class="stage-count">${stage.apps_processed} APPS PROCESSED</span>
            <p class="stage-desc">${stage.description}</p>
          </div>
        `).join('')}
      </div>

      <details class="disclosure">
        <summary>Methodology & Provenance Tier Definitions (Strict 4-Tier Separation)</summary>
        <div class="disclosure-body">
          ${Object.entries(data.methodology_and_provenance_definitions).map(([term, def]) => `
            <div class="def-grid">
              <div class="def-term">${term}</div>
              <div class="def-desc">${def}</div>
            </div>
          `).join('')}
        </div>
      </details>

      <details class="disclosure">
        <summary>Category × Buildability Verdict 10×5 Heatmap Matrix</summary>
        <div class="disclosure-body" style="overflow-x: auto;">
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="width: 250px;">Category</th>
                <th style="color: var(--verdict-build-now);">BUILD_NOW</th>
                <th style="color: var(--verdict-caveats);">CAVEATS</th>
                <th style="color: var(--verdict-outreach);">OUTREACH</th>
                <th style="color: var(--verdict-blocked);">BLOCKED</th>
                <th style="color: var(--verdict-unclear);">UNCLEAR</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(data.matrices.category_by_verdict_matrix).map(([cat, counts]: [string, any]) => `
                <tr>
                  <td class="cat-name">${cat}</td>
                  <td style="font-weight: 700; color: ${counts.BUILD_NOW > 0 ? 'var(--verdict-build-now)' : 'inherit'};">${counts.BUILD_NOW || 0}</td>
                  <td style="font-weight: 700; color: ${counts.BUILD_WITH_CAVEATS > 0 ? 'var(--verdict-caveats)' : 'inherit'};">${counts.BUILD_WITH_CAVEATS || 0}</td>
                  <td style="font-weight: 700; color: ${counts.OUTREACH_REQUIRED > 0 ? 'var(--verdict-outreach)' : 'inherit'};">${counts.OUTREACH_REQUIRED || 0}</td>
                  <td style="font-weight: 700; color: ${counts.BLOCKED_LOW_PRIORITY > 0 ? 'var(--verdict-blocked)' : 'inherit'};">${counts.BLOCKED_LOW_PRIORITY || 0}</td>
                  <td style="font-weight: 700; color: ${counts.UNCLEAR > 0 ? 'var(--verdict-unclear)' : 'inherit'};">${counts.UNCLEAR || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </details>
    </section>

    <!-- Section 5: Honest Misses & Uncertainty -->
    <section id="uncertainty">
      <h2 class="section-title">Honest Misses & Uncertainty Analysis</h2>
      <p class="section-subhead">
        Intellectual honesty requires transparently separating what was rigorously verified from what was retained under conservative single-pass guardrails. We never label baseline unverified apps as human-verified.
      </p>

      <!-- The Single Uncertainty / Provenance Visualization -->
      <div class="uncertainty-box">
        <h3 class="uncertainty-header">The UNCLEAR Funnel & Separation of Ambiguity</h3>
        
        <div class="funnel-row">
          <span><strong>76 Baseline UNCLEAR Apps</strong> &nbsp;(Single-pass initial extraction)</span>
          <span class="mono" style="color: #60a5fa;">Initial Raw Pool</span>
        </div>
        <div class="funnel-row" style="margin-left: 1rem; width: calc(100% - 1rem);">
          <span><strong>70 UNCLEAR after Deterministic Recalibration</strong> &nbsp;(Part 2: 3 promoted by exact raw facts + verified sample adjustments)</span>
          <span class="mono" style="color: #34d399;">−6 Resolved</span>
        </div>
        <div class="funnel-row" style="margin-left: 2rem; width: calc(100% - 2rem);">
          <span><strong>61 Final Presentation UNCLEAR Apps</strong> &nbsp;(Part 4: 15 targeted LLM re-audits on borderline apps)</span>
          <span class="mono" style="color: #a78bfa;">−9 Promoted</span>
        </div>

        <div style="margin-top: 1rem; margin-left: 3rem;">
          <div class="funnel-branch">
            <span>↳ <strong>7 Genuinely Unresolved Apps</strong> &nbsp;(Dedicated verification confirmed true multi-tenant gating / waitlists: #7 Zoho CRM, #8 Close, #12 Intercom, #14 Front, #16 LiveAgent, #18 Help Scout, #96 Devin)</span>
            <span class="verdict-badge UNCLEAR">True Ambiguity</span>
          </div>
          <div class="funnel-branch" style="border-left-color: #64748b;">
            <span>↳ <strong>54 Conservative Baseline-Unverified Apps</strong> &nbsp;(retained because the one-pass system did not produce enough validated evidence for confident promotion)</span>
            <span class="verdict-badge BLOCKED_LOW_PRIORITY">Guardrail Retained</span>
          </div>
        </div>

        <div class="funnel-annotation">
          <strong>Key Takeaway on Uncertainty:</strong> UNCLEAR does not mean "no API exists." It means the single-pass system did not accumulate enough validated evidence to promote the verdict confidently under the system's decision rules. 5 of 7 sampled baseline UNCLEAR verdicts (71.4%) were resolved during independent verification. The remaining 54 baseline-unverified UNCLEAR apps were intentionally preserved rather than extrapolating the sample result to unverified records.
          <div style="margin-top: 0.75rem; font-weight: 600; color: #fff;">
            Final Provenance Composition: &nbsp; <span style="color: #34d399;">14 Independently Verified</span> &nbsp;·&nbsp; <span style="color: #60a5fa;">15 Targeted Verified</span> &nbsp;·&nbsp; <span style="color: #f59e0b;">3 Deterministically Calibrated</span> &nbsp;·&nbsp; <span style="color: #94a3b8;">68 Baseline Unverified</span>
          </div>
        </div>
      </div>

      <!-- 3 Honest Miss Cards -->
      <div class="misses-grid">
        <div class="miss-card">
          <div>
            <h3 class="miss-header">#1 Failure Mode: Extraction Errors (${data.top_failure_modes.extraction_error.count} fields)</h3>
            <p class="miss-body">
              Across our 15-app verification sample, field-level extraction errors (<code>${data.top_failure_modes.extraction_error.count}</code>) outnumbered conservative guardrails (<code>${data.top_failure_modes.conservative_guardrail.count}</code>). Dynamic SPAs, login-walled developer portals, and multi-product enterprise docs caused the single-pass agent to return <code>unclear</code> when the real answer was discoverable.
            </p>
          </div>
          <details class="disclosure" style="margin-bottom: 0;">
            <summary style="padding: 0.6rem 0.8rem; font-size: 0.78rem;">View All 22 Affected Fields</summary>
            <div class="disclosure-body" style="padding: 0.75rem; font-size: 0.76rem; font-family: 'JetBrains Mono', monospace; max-height: 180px; overflow-y: auto;">
              ${data.top_failure_modes.extraction_error.apps_and_fields.join('<br>')}
            </div>
          </details>
        </div>

        <div class="miss-card">
          <div>
            <h3 class="miss-header">7 Structurally Ambiguous Integrations</h3>
            <p class="miss-body">
              Even after dedicated verification, 7 applications resisted resolution: <code>#7 Zoho CRM</code>, <code>#8 Close</code>, <code>#12 Intercom</code>, <code>#14 Front</code>, <code>#16 LiveAgent</code>, <code>#18 Help Scout</code>, and <code>#96 Devin</code>. These integrations use complex multi-regional auth or developer waitlists where automated web scraping cannot replace manual product-ops testing.
            </p>
          </div>
          <details class="disclosure" style="margin-bottom: 0;">
            <summary style="padding: 0.6rem 0.8rem; font-size: 0.78rem;">View Remaining Uncertainty Details</summary>
            <div class="disclosure-body" style="padding: 0.75rem; font-size: 0.78rem;">
              <strong>Recommendation:</strong> Require manual developer account provisioning and targeted API testing before building productized connectors for these 7 integrations.
            </div>
          </details>
        </div>

        <div class="miss-card">
          <div>
            <h3 class="miss-header">What the Verification Loop Corrected</h3>
            <p class="miss-body">
              Our independent audit proved why multi-pass verification is essential: baseline first-pass field accuracy across the 15-app sample jumped from <strong>${data.verification_metrics.baseline_field_level_accuracy_percentage}</strong> (<code>82/120</code> fields) to <strong>${data.verification_metrics.post_verification_field_level_accuracy_percentage}</strong> (<code>117/120</code> fields), achieving a measured <strong>${data.verification_metrics.absolute_percentage_point_improvement}</strong> accuracy gain.
            </p>
          </div>
          <details class="disclosure" style="margin-bottom: 0;">
            <summary style="padding: 0.6rem 0.8rem; font-size: 0.78rem;">Sample Stratification Breakdown</summary>
            <div class="disclosure-body" style="padding: 0.75rem; font-size: 0.78rem;">
              • <strong>5 Deep-Verified Apps:</strong> 52.5% baseline → 97.5% verified<br>
              • <strong>10 Fast Scale Apps:</strong> 76.25% baseline → 97.5% verified<br>
              • <strong>False UNCLEAR Rate:</strong> 71.4% (<code>5/7</code> sampled UNCLEARs were buildable)
            </div>
          </details>
        </div>
      </div>
    </section>

    <!-- Section 6: Run the Research Agent / Source -->
    <section id="run">
      <h2 class="section-title">Run the Research Agent Locally</h2>
      <p class="section-subhead">
        We built the Toolkit Intelligence Engine to be fully reproducible, testable offline without API keys, and verifiable in under one second. Replay our deep-verified research pipeline right from your terminal.
      </p>

      <div class="run-grid">
        <div>
          <div class="code-box">
            <div class="comment"># 1. Clone repository and install dependencies</div>
            <div class="cmd">git clone https://github.com/yashjha024/composio-toolkit-intelligence.git</div>
            <div class="cmd">cd composio-toolkit-intelligence && npm install</div>
            <br>
            <div class="comment"># 2. Run the full 54-test verification & regression suite (Offline · Zero API calls · $0 cost)</div>
            <div class="cmd">npm test</div>
            <br>
            <div class="comment"># 3. Replay deep-verified calibration loop for 4 diverse apps (#1 Salesforce, #56 Firecrawl, #90 PitchBook, #92 Otter AI)</div>
            <div class="cmd">npm run gate:b</div>
          </div>
        </div>

        <div class="token-box">
          <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">Production Observability Metrics</h3>
          <p style="font-size: 0.84rem; color: var(--text-muted);">
            All LLM interactions executed via <strong>Google Cloud Vertex AI</strong> (<code>gemini-2.5-flash</code>) with full token and cost observability tracked in <code>data/metrics/vertex-usage.json</code>.
          </p>

          <div class="token-grid">
            <div class="token-stat">
              <span class="token-stat-label">Successful LLM Calls</span>
              <span class="token-stat-val">${data.token_and_runtime_metrics.successful_llm_calls_total}</span>
            </div>
            <div class="token-stat">
              <span class="token-stat-label">Total Tokens Processed</span>
              <span class="token-stat-val">${formatNumber(data.token_and_runtime_metrics.cumulative_total_tokens)}</span>
            </div>
            <div class="token-stat">
              <span class="token-stat-label">Estimated Total Cost</span>
              <span class="token-stat-val" style="color: #34d399;">$${data.token_and_runtime_metrics.estimated_cumulative_cost_usd} USD</span>
            </div>
            <div class="token-stat">
              <span class="token-stat-label">Calibration Runtime</span>
              <span class="token-stat-val">${data.token_and_runtime_metrics.final_calibration_wallclock_runtime_seconds}s</span>
            </div>
          </div>

          <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border); display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href="https://github.com/yashjha024/composio-toolkit-intelligence" target="_blank" style="background: var(--accent); color: #fff; padding: 0.6rem 1.25rem; border-radius: 6px; font-weight: 600; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 0.4rem;">
              <span>⭐ View GitHub Repository</span>
            </a>
            <a href="data/presentation/case_study_data.json" target="_blank" style="background: var(--surface-hover); color: var(--text); padding: 0.6rem 1.25rem; border-radius: 6px; font-weight: 600; font-size: 0.88rem;">
              Inspect JSON Contract
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer>
    <p style="font-size: 0.95rem; font-weight: 600; color: #fff;">
      Built by <strong style="color: var(--accent-light);">Yash Jha</strong> · AI Product Operations Intern Take-Home Submission
    </p>
    <p style="margin-top: 0.65rem; display: flex; justify-content: center; gap: 1.75rem; font-size: 0.88rem;">
      <a href="https://github.com/yashjha024" target="_blank" style="color: var(--text); display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: underline;">
        <span>⭐ GitHub Profile</span>
      </a>
      <a href="https://www.linkedin.com/in/yashjha024/" target="_blank" style="color: var(--text); display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: underline;">
        <span>💼 LinkedIn Profile</span>
      </a>
    </p>
  </footer>

  <script>
    // Embedded Authoritative Data Contract
    const DATA = ${JSON.stringify(data)};

    let currentSortColumn = 'assignment_number';
    let currentSortOrder = 'asc';
    let expandedRows = new Set();

    function renderTable() {
      const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();
      const categoryFilter = document.getElementById('categorySelect').value;
      const verdictFilter = document.getElementById('verdictSelect').value;
      const provenanceFilter = document.getElementById('provenanceSelect').value;
      const tbody = document.getElementById('tableBody');

      // Filter rows
      let rows = DATA.exact_100_app_table_rows.filter(row => {
        const matchesSearch = row.app_name.toLowerCase().includes(searchInput) || 
                              String(row.assignment_number).includes(searchInput) ||
                              row.website_hint.toLowerCase().includes(searchInput);
        const matchesCat = categoryFilter === 'ALL' || row.assigned_category === categoryFilter;
        const matchesVerdict = verdictFilter === 'ALL' || row.final_presentation_verdict === verdictFilter;
        const matchesProv = provenanceFilter === 'ALL' || row.verification_status === provenanceFilter;
        return matchesSearch && matchesCat && matchesVerdict && matchesProv;
      });

      // Sort rows
      rows.sort((a, b) => {
        let valA = a[currentSortColumn];
        let valB = b[currentSortColumn];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      // Render rows
      tbody.innerHTML = rows.map(row => {
        const isExpanded = expandedRows.has(row.assignment_number);
        const provIcon = row.verification_status === 'independently_verified' ? '✓' :
                         row.verification_status === 'targeted_verified' ? '◎' :
                         row.verification_status === 'deterministically_calibrated' ? '◆' : '○';

        const mainHtml = '<tr class="clickable-row ' + (isExpanded ? 'expanded-details' : '') + '" onclick="toggleRow(' + row.assignment_number + ')">' +
          '<td class="mono" style="font-weight: 700; color: var(--accent-light);">#' + row.assignment_number + '</td>' +
          '<td style="font-weight: 600; color: #fff;">' + row.app_name + '</td>' +
          '<td style="color: var(--text-muted);">' + row.assigned_category + '</td>' +
          '<td><span class="verdict-badge ' + row.final_presentation_verdict + '">' + row.final_presentation_verdict + '</span></td>' +
          '<td><span class="prov-badge">' + provIcon + ' ' + row.verification_status.replace('_', ' ') + '</span></td>' +
          '<td class="mono" style="font-size: 0.78rem;">' + row.auth_methods.join(', ') + '</td>' +
          '<td style="text-align: center;">' + (row.public_api_status === 'yes' ? '✅' : row.public_api_status === 'no' ? '❌' : '⚠️') + '</td>' +
          '<td class="mono">' + row.api_breadth + '</td>' +
          '<td class="mono">' + row.mcp_status + '</td>' +
          '</tr>';

        const evidenceLinks = row.evidence_urls.map(u => '📎 <a href="' + u + '" target="_blank" style="font-size: 0.82rem; word-break: break-all;">' + u + '</a>').join('<br>');
        const remainingUnc = (row.remaining_uncertainty && row.remaining_uncertainty.length > 0) ? 
          '<span class="detail-label" style="margin-top: 0.75rem;">Remaining Uncertainty Fields</span>' +
          '<div class="detail-text mono" style="color: #fbbf24; font-size: 0.8rem;">' + row.remaining_uncertainty.join(', ') + '</div>' : '';

        const detailsHtml = isExpanded ? '<tr class="expanded-details">' +
          '<td colspan="9" style="padding: 0;">' +
          '<div class="row-detail-panel">' +
          '<div class="detail-group">' +
          '<span class="detail-label">Website Hint & Evidence Links</span>' +
          '<div class="detail-text">' +
          '🌐 <a href="https://' + row.website_hint + '" target="_blank">' + row.website_hint + '</a><br>' + evidenceLinks +
          '</div>' +
          '<span class="detail-label" style="margin-top: 0.75rem;">Primary Blockers / Access Notes</span>' +
          '<div class="detail-text" style="color: var(--text-muted);">' + (row.primary_blocker || 'Self-serve developer credentials and public API verified.') + '</div>' +
          '</div>' +
          '<div class="detail-group">' +
          '<span class="detail-label">3-Stage Verdict Progression</span>' +
          '<div class="progression-pills">' +
          '<span class="verdict-badge ' + row.original_baseline_verdict + '" style="font-size: 0.7rem;">Baseline: ' + row.original_baseline_verdict + '</span>' +
          '<span>→</span>' +
          '<span class="verdict-badge ' + row.calibrated_verdict + '" style="font-size: 0.7rem;">Calibrated: ' + row.calibrated_verdict + '</span>' +
          '<span>→</span>' +
          '<span class="verdict-badge ' + row.final_presentation_verdict + '" style="font-size: 0.7rem;">Final: ' + row.final_presentation_verdict + '</span>' +
          '</div>' + remainingUnc +
          '</div>' +
          '</div>' +
          '</td>' +
          '</tr>' : '';

        return mainHtml + detailsHtml;
      }).join('');
    }

    function toggleRow(id) {
      if (expandedRows.has(id)) {
        expandedRows.delete(id);
      } else {
        expandedRows.add(id);
      }
      renderTable();
    }

    function sortTable(column) {
      if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortColumn = column;
        currentSortOrder = 'asc';
      }
      renderTable();
    }

    function jumpToApp(id) {
      document.getElementById('searchInput').value = '#' + id;
      document.getElementById('categorySelect').value = 'ALL';
      document.getElementById('verdictSelect').value = 'ALL';
      document.getElementById('provenanceSelect').value = 'ALL';
      expandedRows.add(id);
      renderTable();
      document.getElementById('explorer').scrollIntoView({ behavior: 'smooth' });
    }

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', renderTable);
    document.getElementById('categorySelect').addEventListener('change', renderTable);
    document.getElementById('verdictSelect').addEventListener('change', renderTable);
    document.getElementById('provenanceSelect').addEventListener('change', renderTable);

    // Initial render
    renderTable();
  </script>
</body>
</html>`;

const outPath = path.resolve(process.cwd(), 'case-study.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('[Success] Built complete self-contained HTML case study at: ' + outPath + ' (' + (html.length / 1024).toFixed(1) + ' KB)');
