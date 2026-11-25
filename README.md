# SkiMCP — MCP Tool Manifest Risk Scanner

[![CI](https://github.com/tejasec/SkiMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/tejasec/SkiMCP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Analysis](https://img.shields.io/badge/analysis-deterministic%20%7C%20zero%20LLM%20calls-blue)](#what-makes-it-different)

**SkiMCP is a deterministic, rule-based security scanner, permission-drift detector, and manifest-hardening tool for Model Context Protocol (MCP) tool manifests.**
*PromptWars x Echo Engineer's AI VIBEATHON 2026 submission.*

Agentic AI hosts (Claude Desktop, Cursor, VS Code Copilot, Windsurf, Claude Code, Codex, and CLI agents) ingest third-party MCP `tools/list` manifests, prompt templates, and desktop configs directly into LLM context before execution. A single poisoned description containing hidden `<IMPORTANT>` directives, invisible zero-width Unicode characters, unconstrained shell parameters, credential targets, or silent upstream schema expansions ("rug-pulls") can hijack an agent without triggering traditional code scanners. SkiMCP audits MCP manifests and live endpoints prior to runtime using deterministic static rules, RFC 8785-style SHA-256 canonical fingerprinting, structural permission diffing, and one-click schema hardening. **Zero runtime LLM calls, zero external database, and no API key required.**

**Live demo:** [https://skimcp.vercel.app/](https://skimcp.vercel.app/) (full interactive React scanner + serverless API, no install required)

**Built with:** TypeScript (strict), Node.js `>=20`, Express (`backend/`), React 18 + Vite (`frontend/`), `yaml`, Docker, Vercel serverless adapter (`api/index.ts`), standalone CLI (`skimcp`), and composite GitHub Action (`action.yml`).

**Contents:** [Problem statement & alignment](#problem-statement--solution-alignment) · [Try it in 2 minutes](#try-it-in-2-minutes) · [What makes it different](#what-makes-it-different) · [Verification & ecosystem metrics](#verification--ecosystem-metrics) · [Run it locally](#run-it-locally) · [Limitations](#limitations-please-read) · [More detail](#more-detail)

![SkiMCP live web scanner overview showing URL/manifest tabs, client config locator, and opt-in runtime canary controls](docs/screenshots/01-scanner-overview.png)

---

## Problem Statement & Solution Alignment

The core goal of SkiMCP is **pre-runtime review, evidence, and least-privilege enforcement** for MCP tool ecosystems without relying on non-deterministic LLM-as-a-judge checks or persistent server storage:

1. **Tool Poisoning & Prompt Injection:** Malicious or compromised MCP servers hide imperative overrides (`<IMPORTANT>`, `<SYSTEM>`), zero-width Unicode steganography, BiDi Trojan Source overrides, or Base64 payloads inside tool descriptions, resources, and prompt templates.
2. **Excessive Agency & Boundary Exposure:** Tools frequently declare unconstrained shell arguments (`bash -c`, `eval`), unrestricted filesystem paths, sensitive paths (`~/.ssh`, `.env`, `/etc/passwd`), unrestricted outbound URL parameters, or open schemas (`additionalProperties: true`).
3. **Silent Upstream Drift ("Rug-Pulls"):** An MCP server approved during initial review can quietly add tools, widen schemas, or inject new prompt directives in a later version.
4. **Fragmented Ecosystem Visibility:** Teams lack a consistent format-agnostic way to inspect client configs (`claude_desktop_config.json`, YAML, JSONL, `tools/list` JSON, live HTTP/SSE), pin canonical hashes, and enforce CI gates.

### Requirement-to-Codebase Traceability

Every requirement in the problem statement maps directly to verified modules, API routes, and CLI commands in this repository:

| Problem Statement Requirement | Implemented Solution / Feature | Verified Codebase Implementation |
|---|---|---|
| Parse diverse MCP manifest & host config formats | Multi-source parser for JSON (`tools/list`, bare arrays, `result.tools`), JSONL, YAML, and `mcpServers` configs | [`backend/src/scanner/_parser.ts`](backend/src/scanner/_parser.ts) (`_parseManifest`), [`frontend/src/data/mcpClients.ts`](frontend/src/data/mcpClients.ts) (29 clients), [`InputGuidanceDrawer.tsx`](frontend/src/components/InputGuidanceDrawer.tsx) |
| Audit live remote MCP servers safely without SSRF risk | HTTP POST JSON-RPC 2.0 (`tools/list`), HTTP GET, and SSE handshake with pre-connection IP/DNS/redirect validation | [`backend/src/scanner/_urlFetcher.ts`](backend/src/scanner/_urlFetcher.ts) (`fetchLiveMcpManifest`), [`backend/src/scanner/_ssrf.ts`](backend/src/scanner/_ssrf.ts) (`validateUrlForSsrf`), `POST /api/scan-url` |
| Detect prompt injection, obfuscation, shadowing, shell, credential, FS, network & schema risks | 12 deterministic detection `ruleId`s across 11 rule modules + community advisory signatures | [`backend/src/scanner/_rules/index.ts`](backend/src/scanner/_rules/index.ts), [`backend/src/scanner/_ruleEngine.ts`](backend/src/scanner/_ruleEngine.ts), [`backend/src/data/advisories.json`](backend/src/data/advisories.json) |
| Produce reproducible, explainable risk scores | Capped weighted severity scoring (`min(100, sum)`) + 4-pillar & 7-category threat visualizers | [`backend/src/scanner/_scorer.ts`](backend/src/scanner/_scorer.ts) (`_computeScore`), [`ScanReport.tsx`](frontend/src/components/ScanReport.tsx), [`RiskGauge.tsx`](frontend/src/components/RiskGauge.tsx) |
| Prevent silent upstream tampering / rug-pulls | RFC 8785-inspired canonical JSON serialization + SHA-256 `toolFingerprint` & order-invariant `manifestFingerprint` | [`backend/src/scanner/_fingerprint.ts`](backend/src/scanner/_fingerprint.ts) (`canonicalJsonStringify`, `computeToolFingerprint`, `computeManifestFingerprint`) |
| Detect capability growth and permission escalations across versions | Structural AST diff comparing baseline (`v1`) vs target (`v2`) with net risk delta and property-level escalations | [`backend/src/scanner/_diff.ts`](backend/src/scanner/_diff.ts) (`diffManifests`), `POST /api/diff`, `skimcp diff`, [`PermissionDiff.tsx`](frontend/src/components/PermissionDiff.tsx) |
| Remediate risky manifests automatically | One-click hardening stripping tags/Unicode obfuscation, clamping `additionalProperties: false`, constraining path regexes, and enforcing `required` fields | [`backend/src/scanner/_sanitizer.ts`](backend/src/scanner/_sanitizer.ts) (`hardenManifest`), `POST /api/harden`, `skimcp harden` |
| Verify live endpoint behavior beyond static schemas | Opt-in inert JSON-RPC `tools/call` canary probes detecting shell error leaks, 500 crashes, timeouts, or huge payloads | [`backend/src/scanner/_canary.ts`](backend/src/scanner/_canary.ts) (`runCanaryProbes`), `POST /api/scan-url` (`options.runCanaryProbes`) |
| Surface ecosystem baseline risk scores without a DB | Static build-time harvester scanning 34 seed servers into a searchable Trust Directory | [`scripts/harvest-directory.ts`](scripts/harvest-directory.ts), [`frontend/src/data/trust-directory.json`](frontend/src/data/trust-directory.json), [`TrustDirectory.tsx`](frontend/src/components/TrustDirectory.tsx) |
| Export, embed, retain locally, and gate CI/CD pipelines | Markdown/JSON exports, dynamic Shields.io badges, `/embed` iframe widget, `localStorage` scan history (max 50), CLI & GitHub Action | [`exportReport.ts`](frontend/src/lib/exportReport.ts), [`EmbedWidget.tsx`](frontend/src/components/EmbedWidget.tsx), [`ScanHistory.tsx`](frontend/src/components/ScanHistory.tsx), [`cli.ts`](backend/src/cli.ts), [`action.yml`](action.yml) |

---

## Try It in 2 Minutes

Open the [live scanner](https://skimcp.vercel.app/) (`https://skimcp.vercel.app/`). Every step below runs against the live Express/Vercel API (`api/index.ts`):

1. **Interactive Hero & Client Config Locator.** Click any highlighted token in the hero tagline (e.g., `shell execution`, `prompt injection`, `desktop host configs`, `permission drift diffing`) to inspect CLI commands and payloads, or expand **Need help finding a URL or manifest?** (`InputGuidanceDrawer.tsx`) to filter config paths across **29 MCP clients** by OS (`Windows`, `Linux`, `macOS`).
2. **Manifest Scanning & Presets.** Switch to **Manifest (JSON / YAML / JSONL / Config)** and test the built-in presets:
   - *Safe Reference:* **GitHub (Official)**, **Postgres (Read-Only)**
   - *Active Exploits:* **Unsandboxed Shell**, **Poisoned Fetcher** (`<IMPORTANT>` + zero-width `\u200B\u200C\uFEFF` + `<SYSTEM>` tags), **Rug-Pull Evolution**
   - *Client Formats:* **Desktop Config** (`mcpServers`), **YAML**
   - Toggle **Opt-in: Inspect MCP `resources/list` and `prompts/list` for prompt injections** when scanning full MCP payloads.
3. **One-Click Hardening, Exports & Embed Widget.** After scanning **Poisoned Fetcher** or **Unsandboxed Shell**, explore the **Permission Category Breakdown** filter cards, **Threat Breakdown** meters, and **View Tool Lockfile** SHA-256 hashes. Click **Generate Hardened Manifest** to preview the score reduction and download `mcp-manifest.hardened.json`, or use **Export Report (MD)** (`MCP_SECURITY_REPORT.md`), **Export JSON**, **Copy Badge**, and **Embed Widget** (`/embed?data=...`).
4. **Permission Diff (v1 vs v2).** Open the **Permission Diff (v1 vs v2)** tab, load **Rug-Pull Escalation** (or **Hardened Reduction**), and click **Compare Manifests & Compute Risk Delta** to inspect added/removed tools, `additionalProperties: false -> true` escalations, and injected `<IMPORTANT>` description changes.
5. **Curated Trust Directory & Local History.** Open **Curated Trust Directory** to search and filter **34** pre-audited servers across 6 categories and click **Inspect in Scanner** on any entry. Back on the scanner tab, expand **Local Scan History** (`localStorage` key `skimcp_scan_history_v1`) and select any 2 past scans to click **Compare Selected (2)**.

---

## What Makes It Different

| Mechanism | What it guarantees | What it does **not** guarantee |
|---|---|---|
| **Deterministic Rule Engine (`_ruleEngine.ts`)** | Reproducible findings, evidence strings, and scores across CLI, API, and Web UI with zero LLM latency or API keys | Semantic intent detection beyond the 12 implemented pattern/schema/advisory rules |
| **Canonical SHA-256 Fingerprints (`_fingerprint.ts`)** | Key-order-invariant `toolFingerprint` and tool-order-invariant `manifestFingerprint`; any schema, description, or command edit changes the digest | Runtime code safety on the remote server host (a matching hash only proves the *declared manifest* has not drifted) |
| **One-Click Hardening (`_sanitizer.ts`)** | Strips recognized injection tags/imperatives and zero-width/BiDi Unicode, sets `additionalProperties: false`, constrains path params (`^[a-zA-Z0-9_\-\./]+$`), and populates `required` on destructive tool names | Safe server-side implementation of a tool (hardening tightens the manifest contract; it does not sandbox host code) |
| **Opt-In Runtime Canary Probes (`_canary.ts`)** | Sends inert `tools/call` (`arguments: {}`, 3s timeout, max 5 tools) to flag shell interpreter leaks, 500 crashes, or >50 KB responses | Exhaustive fuzzing or side-effect isolation on remote hosts (use only on servers you own or are authorized to test) |

### Scoring, Categories & Architectural Invariants

- **Weighted Risk Score (`backend/src/scanner/_scorer.ts`):** `riskScore = min(100, sum of finding weights)` where `critical = 30`, `high = 15`, `medium = 5`, `low = 2`. Risk tiers: `critical` (`>= 80`), `high` (`50–79`), `medium` (`20–49`), `low` (`0–19`).
- **Two Views of Risk (`ScanReport.tsx`):** Findings map into **7 clickable Permission Categories** (*Shell & Execution*, *Filesystem Access*, *Network & Egress*, *Credentials & Secrets*, *Prompt & AI Integrity*, *Advisories & Blocklist*, *Schema Scope*) and **4 Security Pillars** (*Execution Safety*, *Data & Network Boundary*, *Prompt & AI Integrity*, *Privilege & Schema Scope*).
- **Hard Design Invariants:** Stateless server (no database, no user accounts/auth), zero runtime LLM calls, `1 MB` payload cap (`express.json({ limit: '1mb' })` and `MAX_BODY_BYTES` in `_urlFetcher.ts`), and fail-closed SSRF protection (`_ssrf.ts`) on all live URL fetches and redirect hops.

---

## Verification & Ecosystem Metrics

All counts below are verified against the current repository scripts and tests:

- **Automated Test Suite (`npm test`):** **69 passing tests across 18 suites** (`0` failures) spanning 12 test files in [`backend/test/`](backend/test/) covering `advisory`, `api`, `canary`, `cli`, `diff`, `fingerprint`, `mcpClients`, `parser`, `rules`, `sanitizer`, `ssrf`, and `trustDirectory`.
- **Type Safety & Production Bundle:** `npm run typecheck` checks both `@skimcp/backend` and `@skimcp/frontend` with `tsc --noEmit` (`strict: true`); `npm run build` compiles backend + frontend and regenerates the directory dataset.
- **Curated Trust Directory (`npm run harvest`):** Deterministic build-time scan of **34** real/research MCP manifests in [`scripts/harvest-directory.ts`](scripts/harvest-directory.ts) across **6 categories** (`Cloud & DevOps`, `Databases`, `Developer Tools`, `Productivity`, `System`, `Web & Search`): **20 Verified Safe**, **4 Caution**, **10 Avoid / High Risk**, with an ecosystem average risk score of **20/100**.
- **Community Advisory Feed:** 4 active signatures (`MCP-ADV-2024-001` through `MCP-ADV-2024-004`) in [`backend/src/data/advisories.json`](backend/src/data/advisories.json).
- **Zero-Emoji Check:** [`scripts/check-emojis.py`](scripts/check-emojis.py) verifies zero emoji regressions across `.ts`, `.tsx`, `.css`, `.html`, and `.md` files.

---

## Run It Locally

Prerequisites: **Node.js `>= 20`**, **npm**, and (optional) **Docker** / **Python 3** (for `check-emojis.py`).

### 1. Web App (Local Production & Dev Modes)

```bash
git clone https://github.com/tejasec/SkiMCP.git
cd SkiMCP
npm install
npm run build
PORT=8080 npm start
# Web UI + API running at http://localhost:8080 (Health check: http://localhost:8080/api/health)
```

For hot-reloading development (`Vite` on `http://localhost:5173` proxying `/api` to Express on `http://localhost:8080`):

```bash
npm run dev
```

Verification checks:

```bash
npm run typecheck
npm test
python3 scripts/check-emojis.py .
```

### 2. Standalone CLI (`skimcp`)

Run directly via `npx` (published on npm as `skimcp`) or install globally (`npm install -g skimcp`), or execute the local build via `node dist/cli.js`:

```bash
# Scan a local manifest or Claude Desktop config (exits 1 if findings reach threshold)
npx skimcp scan ./claude_desktop_config.json --fail-on=high

# Include opt-in audit of MCP resources/list and prompts/list
npx skimcp scan ./manifest.json --include-prompts --format=markdown --output=MCP_SECURITY_REPORT.md

# Compare baseline (v1) vs target (v2) for permission drift (exits 1 on escalation when --fail-on is set)
npx skimcp diff ./manifest-v1.json ./manifest-v2.json --fail-on=high

# Generate a hardened, least-privilege manifest
npx skimcp harden ./risky-manifest.json --output ./hardened.json
```

| Command | Purpose | Supported Options | Exit Codes |
|---|---|---|---|
| `scan <path-or-url>` | Audit local file or HTTP(S) manifest | `--fail-on=<level>`, `--format=table\|json\|markdown`, `--output=<path>`, `--include-prompts` | `0` pass, `1` threshold met, `2` error |
| `diff <baseline> <target>` | Compare v1 vs v2 for drift & escalations | `--format=table\|json`, `--fail-on=<level>` (exits `1` if `status === 'escalated'`) | `0` pass, `1` escalated, `2` error |
| `harden <path>` | Strip injections & clamp schema constraints | `--output=<path>`, `--format=json` | `0` success, `2` error |
| `version` | Print CLI version (`SkiMCP v0.1.0`) | `-v`, `--version` | `0` |

### 3. Docker

Multi-stage build running as non-root `node` user on port `8080` ([`Dockerfile`](Dockerfile)):

```bash
docker build -t skimcp .
docker run --rm -p 8080:8080 skimcp
# Open http://localhost:8080
```

### 4. GitHub Action

[`action.yml`](action.yml) defines a composite action with inputs `manifest_path`, `fail_on`, `format`, `include_prompts`, and `baseline_path`:

```yaml
name: MCP Security Audit
on:
  pull_request:
    paths:
      - '**/*manifest*.json'
      - '**/*manifest*.yaml'
      - '**/claude_desktop_config.json'
      - '**/mcp*.json'

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: tejasec/SkiMCP@main
        with:
          manifest_path: ./claude_desktop_config.json
          fail_on: high
          format: markdown
          include_prompts: 'true'
          baseline_path: ./baseline_manifest.json
```

*(Note: `dist/` is gitignored in this repository, so if referencing the composite `action.yml` from an external repository, either ensure the checked-out ref includes built CLI assets or invoke `npx skimcp` directly after `actions/setup-node`.)*

---

## Limitations (Please Read)

* **Static pattern & schema heuristics:** Detection relies on deterministic rules and regular expressions, not semantic LLM analysis. Novel phrasing, split multi-turn payloads, or obfuscations outside the implemented Unicode/Base64 patterns will not be flagged.
* **Fingerprints measure schema integrity, not server code:** A clean or unchanged `manifestFingerprint` proves the *declared tool metadata* matches a pinned snapshot; it cannot verify what unrevealed logic the MCP server actually executes when called.
* **Canary probes are shallow and opt-in:** `runCanaryProbes` tests at most 5 tools with empty arguments (`arguments: {}`, 3s timeout) over HTTP `tools/call`; it detects gross shell-error leaks or HTTP 500 crashes, not hidden logic gated behind specific parameter values.
* **Stateless & ephemeral by design:** There is no backend database, user login, or server-side audit log. Scan history lives only in browser `localStorage` (up to 50 items), and `/embed` encodes compact summary metrics into the URL query/hash.
* **1 MB input cap:** HTTP endpoints reject JSON payloads above `1 MB`, and `_urlFetcher.ts` enforces a `1 MB` / `10s` limit with up to 3 validated redirects.

---

## More Detail

<details>
<summary><b>Screenshots</b> (Web UI & mobile responsive layout)</summary>

| | |
|---|---|
| ![Manifest input tab with Safe Reference, Active Exploits, and Client Format presets](docs/screenshots/02-manifest-input.png) | ![Agent Permission Diff two-pane comparison with Rug-Pull Escalation preset](docs/screenshots/03-permission-diff.png) |
| ![Curated MCP Trust Directory showing 34 audited servers, category chips, and ecosystem metrics](docs/screenshots/04-trust-directory.png) | ![Mobile responsive viewport running SkiMCP scanner](docs/screenshots/05-mobile-scanner.jpg) |

</details>

<details>
<summary><b>Architecture & Pipeline</b></summary>

```mermaid
flowchart LR
  subgraph Client["Browser: React 18 + Vite + TypeScript"]
    UI["App.tsx: Scanner / Permission Diff / Trust Directory"]
    Drawer["InputGuidanceDrawer (29 Clients) & Local ScanHistory"]
    Embed["EmbedWidget (/embed)"]
  end

  subgraph Entry["HTTP & CLI Entrypoints"]
    Vercel["api/index.ts (Vercel Serverless)"]
    Express["backend/src/app.ts (Express + 1MB limit)"]
    CLI["backend/src/cli.ts (skimcp CLI)"]
  end

  subgraph Engine["Core Scanner Engine (backend/src/scanner/)"]
    Parse["_parser.ts (JSON/YAML/JSONL/mcpServers)"]
    Net["_ssrf.ts + _urlFetcher.ts + _canary.ts"]
    FP["_fingerprint.ts (RFC 8785 SHA-256)"]
    Rules["_ruleEngine.ts -> 11 Rule Modules (12 ruleIds)"]
    Score["_scorer.ts -> _diff.ts / _sanitizer.ts"]
  end

  subgraph Data["Static Datasets"]
    Adv["advisories.json (4 advisories)"]
    Dir["trust-directory.json (34 servers via harvest-directory.ts)"]
  end

  UI --> Vercel
  UI --> Express
  Vercel --> Express
  Express --> Parse
  Express --> Net
  CLI --> Parse
  Parse --> FP --> Rules --> Score
  Net --> Parse
  Rules --> Adv
  Dir --> UI
```

**Scanning Pipeline:**
1. **Ingest (`_parser.ts` / `_urlFetcher.ts`):** Normalize JSON, YAML, JSONL, `claude_desktop_config.json` (`mcpServers`), or SSRF-validated live HTTP/SSE `tools/list` responses.
2. **Fingerprint (`_fingerprint.ts`):** Recursively sort keys lexicographically and compute SHA-256 `toolFingerprint` per tool and tool-name-sorted `manifestFingerprint`.
3. **Evaluate (`_ruleEngine.ts`):** Run the 10 per-tool rules in `allRules` (starting with `advisoryMatch`) plus opt-in `checkResourcePromptInjection`, sorting findings `critical -> high -> medium -> low`.
4. **Score & Optional Runtime Probe (`_scorer.ts` / `_canary.ts`):** Compute capped 0–100 score (`critical=30`, `high=15`, `medium=5`, `low=2`) and optionally run inert `tools/call` canary probes on up to 5 tools.
5. **Diff or Harden (`_diff.ts` / `_sanitizer.ts`):** Compare baseline vs target schemas for escalations or emit a hardened manifest with applied fix ledger and score reduction.

</details>

<details>
<summary><b>Repository Layout</b></summary>

```text
skimcp/
├── action.yml                      # Composite GitHub Action (5 inputs)
├── api/index.ts                    # Vercel serverless entrypoint wrapping Express app
├── Dockerfile                      # Multi-stage Node 20 Alpine build (non-root user, port 8080)
├── package.json                    # npm workspaces root ("backend", "frontend")
├── vercel.json                     # Vercel build & SPA/API routing config
├── VERCEL_DEPLOY.md                # Vercel deployment & verification guide
├── scripts/
│   ├── check-emojis.py             # Zero-emoji CI/lint check across source & docs
│   └── harvest-directory.ts        # Pre-audits 34 seed servers into trust-directory.json
├── docs/screenshots/               # UI & mobile screenshots
├── .github/workflows/
│   ├── ci.yml                      # Push/PR CI: typecheck, npm test, build
│   ├── mcp-security.yml            # Example manifest audit workflow
│   └── publish.yml                 # Tag-triggered npm publish with provenance
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Express app (1MB JSON cap, API + SPA static serving)
│   │   ├── server.ts               # HTTP server with SIGTERM/SIGINT graceful shutdown
│   │   ├── cli.ts                  # Standalone CLI (scan, diff, harden, version)
│   │   ├── index.ts                # Package public API & CLI bin dispatcher
│   │   ├── config/env.ts           # PORT, NODE_ENV, FRONTEND_DIST config
│   │   ├── api/                    # Express route handlers (health, scan, scan-url, diff, harden)
│   │   ├── data/                   # advisories.json & trust-directory.json
│   │   └── scanner/                # Core deterministic engine (_parser, _fingerprint, _ruleEngine, _scorer, _diff, _sanitizer, _ssrf, _urlFetcher, _canary, _rules/)
│   └── test/                       # 12 test files (69 tests across 18 suites) + fixtures/
└── frontend/
    └── src/
        ├── App.tsx                 # Main SPA shell (Scanner, Permission Diff, Trust Directory, /embed)
        ├── components/             # ManifestInput, InputGuidanceDrawer, InteractiveHeroCopy, ScanReport, RiskGauge, PermissionDiff, TrustDirectory, ScanHistory, EmbedWidget, Icon
        ├── data/                   # heroTokens.ts (12 tokens), mcpClients.ts (29 clients), trust-directory.json, advisories.json
        └── lib/                    # api.ts, exportReport.ts, history.ts
```

</details>

<details>
<summary><b>All 12 Detection Rules</b> (<code>backend/src/scanner/_rules/</code>)</summary>

| Rule ID | Severity | Module | What It Detects |
|---|---|---|---|
| `advisory-match` | Critical / High / Medium / Low | [`advisoryMatch.ts`](backend/src/scanner/_rules/advisoryMatch.ts) | Tool names, regex patterns, or SHA-256 fingerprints matching `backend/src/data/advisories.json` |
| `prompt-injection` | Critical | [`promptInjection.ts`](backend/src/scanner/_rules/promptInjection.ts) | Fake XML directive tags (`<IMPORTANT>`, `<SYSTEM>`, `<ADMIN>`, `<HIDDEN>`), imperative overrides, exfiltration or concealment text |
| `obfuscation-detected` | Critical / High | [`obfuscation.ts`](backend/src/scanner/_rules/obfuscation.ts) | Zero-width chars (`U+200B–U+200F`, `U+FEFF`, `U+2060`), BiDi overrides (`U+202A–U+202E`, `U+2066–U+2069`), Base64 payloads (Critical if decoded text contains dangerous commands/directives) |
| `tool-shadowing` | Critical / High | [`toolShadowing.ts`](backend/src/scanner/_rules/toolShadowing.ts) | Exact or namespaced (`system:ls`, `os/curl`) impersonation of shell binaries (`eval`, `sudo`, `bash`, `curl`, `ls`, `cat`, etc.) or LLM primitives (`final_answer`, `computer_use`, `browser`); exempts compound names like `cat_facts` or `git_ls_remote` |
| `shell-execution` | Critical | [`shellExecution.ts`](backend/src/scanner/_rules/shellExecution.ts) | Command-execution names/descriptions (`exec`, `shell`, `bash`, `spawn`, `powershell`, etc.) and unconstrained string command parameters (no `enum`/`pattern`) |
| `credential-access` | Critical / High | [`credentialExposure.ts`](backend/src/scanner/_rules/credentialExposure.ts) | Critical if description mentions secrets (`id_rsa`, `.env`, `api_key`, `token`, `jwt`, `password`); High if schema parameter names match credential patterns |
| `filesystem-sensitive` | Critical | [`fileSystemAccess.ts`](backend/src/scanner/_rules/fileSystemAccess.ts) | Tool descriptions referencing `/etc`, `/root`, `/home`, `~/.ssh`, `.gnupg`, `.aws`, `.env`, `/passwd`, `/shadow`, `id_rsa` |
| `filesystem-broad` | High | [`fileSystemAccess.ts`](backend/src/scanner/_rules/fileSystemAccess.ts) | Filesystem tools whose `path`/`file`/`dir`/`directory`/`filename` parameter lacks an `enum` or `pattern` constraint |
| `network-egress` | High / Medium | [`networkEgress.ts`](backend/src/scanner/_rules/networkEgress.ts) | High if network tool has an unconstrained URL/endpoint/host/domain/uri/address parameter; Medium if network-capable without explicit URL parameter |
| `over-permission` | High / Medium | [`overPermission.ts`](backend/src/scanner/_rules/overPermission.ts) | High for destructive tools lacking `inputSchema` or setting `additionalProperties: true`; Medium for destructive tools with empty/missing `required` fields |
| `vague-description` | Medium | [`vagueDescription.ts`](backend/src/scanner/_rules/vagueDescription.ts) | Missing tool description or minimal description with `<= 3` whitespace-delimited words |
| `resource-prompt-injection` | Critical / High | [`resourcePromptInjection.ts`](backend/src/scanner/_rules/resourcePromptInjection.ts) | Opt-in (`scanResourcesAndPrompts: true` / `--include-prompts`): sensitive URIs, hidden directives, and zero-width chars in MCP `resources` and `prompts` (High for prompt arguments) |

</details>

<details>
<summary><b>REST API Specification</b> (<code>backend/src/api/</code>)</summary>

Base path `/api`:

| Method & Path | Request Body | Response / Error Codes |
|---|---|---|
| `GET /api/health` | None | `200 { ok: true, service: "skimcp", timestamp }` |
| `POST /api/scan` | `{ manifest, options?: { scanResourcesAndPrompts?: boolean } }`, `{ text, options? }`, or bare JSON/YAML/JSONL/`mcpServers` | `200 ScanReport` \| `400 { error: "invalid_request" \| "invalid_manifest", message }` |
| `POST /api/scan-url` | `{ url: string, options?: { scanResourcesAndPrompts?: boolean, runCanaryProbes?: boolean } }` | `200 ScanReport` (includes `canaryObservations` if enabled) \| `400 { error: "ssrf_blocked" \| "invalid_manifest" \| "fetch_failed" \| "invalid_request", message }` |
| `POST /api/diff` | `{ baseline, target }` (also accepts `v1`/`v2` or `before`/`after` aliases) | `200 ManifestDiffReport` \| `400 { error: "missing_baseline" \| "missing_target" \| "diff_failed" \| "invalid_request", message }` |
| `POST /api/harden` | `{ manifest }`, `{ text }`, or bare JSON/YAML/JSONL/`mcpServers` | `200 HardenedManifestResult` \| `400 { error: "hardening_failed" \| "invalid_request", message }` |

</details>

<details>
<summary><b>Security & Privacy Controls</b></summary>

* **SSRF Guard (`backend/src/scanner/_ssrf.ts` & `_urlFetcher.ts`):** Enforces `http:`/`https:` schemes only, blocks local hostnames (`localhost`, `*.localhost`, `local`, `*.local`), blocks private/loopback/CGNAT/multicast/link-local IPv4 (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `100.64.0.0/10`, etc.) and IPv6 (`::1`, `fc00::/7`, `fe80::/10`, `::ffff:*`), resolves DNS prior to connection (`dns.lookup(..., { all: true })`) to block DNS rebinding, and re-validates up to 3 redirect hops.
* **Zero Server-Side Data Retention:** Uploaded manifests, URLs, and reports are processed in memory and returned immediately; no database or third-party telemetry is used. Browser scan history is stored exclusively in local `localStorage` (`skimcp_scan_history_v1`).
* **Container Hardening:** `Dockerfile` runs as unprivileged `node` user in `NODE_ENV=production` serving the compiled React bundle from Express.

</details>

<details>
<summary><b>Contributing, Security & Deployment Docs</b></summary>

* [Contributing Guide](CONTRIBUTING.md)
* [Security Policy](SECURITY.md)
* [Code of Conduct](CODE_OF_CONDUCT.md)
* [Vercel Deployment Guide](VERCEL_DEPLOY.md)
* [Composite GitHub Action](action.yml)

</details>

## License

This project is licensed under the [MIT License](LICENSE).
