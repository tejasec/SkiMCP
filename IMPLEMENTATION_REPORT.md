# Implementation Report: ScourMCP

## 1. Executive Summary & System Purpose

The **ScourMCP** is an enterprise-grade, deterministic, rule-based security auditing and drift-detection engine designed specifically for the Model Context Protocol (MCP) ecosystem. 

In agentic AI architectures (such as Claude Desktop, Cursor, and autonomous agent frameworks), MCP servers expose tool definitions, external resources, and prompt templates that LLMs consume to interact with the physical world. While this architecture provides unprecedented extensibility, it introduces severe, unregulated attack vectors:
- **Prompt Injection & Tool Poisoning**: Malicious actors embed hidden instruction overrides or zero-width Unicode steganography in tool descriptions to hijack LLM system prompts and alter tool call parameters.
- **Excessive Agency & Shell Escapes**: Over-permissioned tools declare broad shell commands (`bash -c`, `eval`) or unrestricted filesystem access (`/`, `~/.ssh`), allowing arbitrary code execution.
- **Silent Upstream Capability Drift ("Rug-Pulls")**: A previously audited MCP server can silently alter its schema downstream, adding dangerous parameter flags or relaxing constraint boundaries without notifying the host agent.

The **ScourMCP** addresses these risks with a static, deterministic security review engine that requires **no external database**, **no authentication**, and **no runtime LLM invocations**. It runs anywhere—from developer terminals and GitHub Actions CI pipelines to serverless Google Cloud Run containers and offline Android Termux environments.

---

## 2. Features from the User's Point of View

### 2.1. Live Multi-Source Manifest Scanner
Users can provide MCP manifests in any format common to the agent ecosystem:
- **Claude Desktop Configuration**: Upload or paste `claude_desktop_config.json`. The scanner automatically discovers declared MCP servers, parses executable binaries (`npx`, `bash`, `docker`), extracts CLI arguments, and audits declared environment variables for embedded API keys or credentials.
- **Multi-Format Parsing**: Supports standard JSON (`tools/list` responses), bare arrays, JSON Lines (`.jsonl`), and YAML (`.yaml`, `.yml`).
- **Live MCP Server URL Auditing**: Switch to the *"🌐 Live Server URL (HTTP / SSE)"* tab, enter an endpoint (e.g., `https://mcp.example.com/sse`), and execute a live audit. The scanner handles HTTP GET, JSON-RPC 2.0 `tools/list` POST, and Server-Sent Events (SSE) handshakes in real time.
- **Built-in Showcase Presets**: One-click preset buttons allow instantaneous demonstration of realistic configurations:
  1. `GitHub (Official)`: Safe, scoped reference API with strict required parameters.
  2. `Postgres (Read-Only)`: Secure parameterized SQL client.
  3. `Unsandboxed Shell`: Dangerous arbitrary command execution exposing host shell access.
  4. `Poisoned Fetcher`: Covert prompt injection attempting credential exfiltration of SSH keys and `.env` files.
  5. `Rug-Pull Evolution`: Multi-version capability expansion showing permission escalation.

### 2.2. Multi-Dimensional 4-Pillar Risk Visualizer
Rather than presenting a monolithic, opaque risk number, the scanner breaks findings into four distinct security pillars, each equipped with visual progress meters:
1. **Execution Safety**: Evaluates arbitrary command execution (`run_command`, `eval`, `system`) and system binary impersonation (`ls`, `curl`).
2. **Data & Network Boundary**: Evaluates unconstrained filesystem paths, sensitive directory access (`/etc/passwd`, `~/.ssh`), credential leaks, and unrestricted HTTP egress.
3. **Prompt & AI Integrity**: Evaluates zero-width steganography characters, directional Unicode overrides (Trojan Source attacks), and concealed imperative instructions (`<IMPORTANT>`, `<SYSTEM>`).
4. **Privilege & Schema Scope**: Evaluates loose schema boundaries (`additionalProperties: true`), missing required constraints, and vague/minimal descriptions.

### 2.3. Automated Hardened Manifest Generator ("One-Click Remediation")
When an audit discovers vulnerabilities, users can click **"🛡️ Generate Hardened Manifest"** to open an interactive remediation workspace:
- **Score Delta Comparison**: Displays real-time risk reduction (e.g., `85/100 ➔ 15/100 (-70 pts)`).
- **Itemized Checklist**: Lists every security fix automatically applied (e.g., sanitized prompt injections, clamped schemas, injected regex constraints).
- **Export & Copy**: Provides one-click buttons to copy the sanitized JSON or download a ready-to-deploy hardened manifest file.

### 2.4. Agent Permission Diff & Drift Detector
By navigating to the **"🔀 Permission Diff"** tab, teams can compare a baseline manifest (`v1`) against a target pull request (`v2`):
- **Risk Delta Badge**: Computes the net risk difference, displaying badges such as `+35 Risk Increase (ESCALATED)` or `-20 Risk Reduction (HARDENED)`.
- **Structural Classification**: Categorizes tools into `Added`, `Removed`, `Modified`, and `Unchanged`.
- **Property Inspector**: Highlights fine-grained schema mutations (e.g., `additionalProperties: false ➔ true`, newly introduced parameters, or altered descriptions).

### 2.5. Curated MCP Trust Directory & Ecosystem Harvester
An integrated catalog of 16 pre-audited MCP servers across 6 core categories (`System`, `Developer Tools`, `Databases`, `Web & Search`, `Productivity`, `Cloud & DevOps`):
- **Ecosystem Health Metrics**: Real-time summary displaying total servers, verified safe count, caution count, dangerous/avoid count, and average risk score.
- **Search & Filters**: Instant client-side filtering by category, search keywords, or trust tier (`✅ Verified Safe`, `⚠️ Caution`, `🚨 Avoid / High Risk`).
- **1-Click Audit**: Clicking **"🔍 Inspect in Scanner"** loads the server's manifest into the Live Scanner and executes a fresh audit immediately.

### 2.6. Standalone CLI Runner & CI/CD Pipeline Gate
Developers can audit manifests directly in their terminal workflows, pre-commit hooks, or CI/CD pipelines without launching the web server:
```bash
# Scan a local manifest and fail CI if high or critical risks are present:
scourmcp scan ./claude_desktop_config.json --fail-on=high

# Compare two versions for permission drift:
scourmcp diff ./manifest-v1.json ./manifest-v2.json

# Automatically generate a hardened manifest:
scourmcp harden ./manifest.json --output ./manifest-hardened.json
```

### 2.7. Community Blocklist & Advisory Feed (F-11)
A community-driven feed of known malicious MCP servers, dangerous tool names, and exploit patterns (`advisories.json`):
- **Detection Rule**: Scans every tool against known CVE/threat signatures matching by exact name (`shell_exec`, `eval_js`), regex pattern (`nc -e`, `rm -rf /`, credential exfiltration), or cryptographic tool SHA-256 fingerprint.
- **Prominent UI Advisory Banner**: Surfaced at the top of scan results with advisory identifiers, reporter provenance, CVE links, and remediation advice.

### 2.8. Permission Category Breakdown & Threat Filter Matrix (F-9)
A dedicated, standalone risk profile visualization grouping findings into 7 intuitive capability buckets:
- **7 Buckets**: *Shell & Execution*, *Filesystem Access*, *Network & Egress*, *Credentials & Secrets*, *Prompt & AI Integrity*, *Identity & Shadowing*, and *Schema & Scope*.
- **Interactive Filtering**: Clicking any category card instantly scopes the findings list below to that category.
- **Export Summary**: Automatically included as a structured summary table in exported Markdown reports.

### 2.9. Browser-Local Scan History & Comparison (F-12)
Provides session persistence without requiring an external database:
- **`localStorage` Retention**: Automatically archives up to 50 recent scans locally (`mcp_scanner_scan_history_v1`).
- **History Management**: 1-click "Load into Scanner", selective multi-scan comparison ("Compare Selected") feeding directly into the Permission Diff engine, per-row deletion, and complete JSON export.

### 2.10. Embeddable Scan Widget & URL-Encoded Payloads (F-13)
Allows MCP server developers and repositories to embed live, audited risk summaries on documentation sites or READMEs:
- **URL Base64 Encoding**: Encodes the scan summary into URL hash/query parameters to adhere strictly to the zero-database architectural constraint.
- **Dedicated Route**: Accessing `/embed` renders a lightweight, responsive score and badge card.
- **Modal Snippet Generator**: 1-click "🔗 Embed Widget" modal in report view generates copyable `<iframe>` HTML with live preview.

### 2.11. Dynamic Runtime Canary Sandbox (F-8)
Safe, opt-in dynamic runtime verification for live MCP server endpoints:
- **Inert JSON-RPC Probes**: Sends benign `tools/call` requests with safe, inert parameters and 3000ms timeouts to observe server response characteristics.
- **Anomaly Detection**: Flags shell interpreter leaks (`/bin/sh`, `bash:`, `command not found`), server crashes (HTTP 500), and unhandled exceptions.
- **Runtime Observations Table**: Appended to the scan report and exported documents.

### 2.12. Reusable GitHub Action Gate (F-6)
An official, self-contained GitHub Action (`action.yml`):
- **Inputs**: `manifest_path`, `fail_on`, `format`, `include_prompts`, `baseline_path`.
- **Workflow Integration**: Runs directly on pull requests to fail checks if critical risks appear or permissions drift.

---

## 3. End-to-End System Architecture

The following diagram illustrates the complete end-to-end data flow through the system:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         USER INTERFACES                                         │
├───────────────────────────────────────────────┬─────────────────────────────────────────────────┤
│            Web Dashboard (React SPA)          │               Terminal CLI Runner               │
│  [Manifest Input]   [Diff Tab]   [Directory]  │   scourmcp scan | diff | harden             │
└───────────────────────┬───────────────────────┴────────────────────────┬────────────────────────┘
                        │                                                │
                        ▼                                                ▼
┌───────────────────────────────────────────────┐                ┌────────────────┐
│               HTTP REST API LAYER             │                │ Direct Node.js │
│   POST /api/scan      POST /api/scan-url      │                │ CLI Controller │
│   POST /api/diff      POST /api/harden        │                │  (src/cli.ts)  │
└───────────────────────┬───────────────────────┘                └───────┬────────┘
                        │                                                │
                        ▼                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CORE SECURITY & SCAN ENGINE                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  1. Ingestion & Normalization (_parser.ts)                                                      │
│     • Auto-detects JSON, JSONL, YAML, and claude_desktop_config.json                            │
│     • Resolves SSRF guard (_ssrf.ts) & executes live URL transports (_urlFetcher.ts)            │
│                                                                                                 │
│  2. Deterministic Cryptographic Fingerprinting (_fingerprint.ts)                                │
│     • RFC 8785 recursive lexicographical key sorting                                           │
│     • Computes toolFingerprint & manifestFingerprint (SHA-256)                                  │
│                                                                                                 │
│  3. Rule Evaluation Pipeline (_ruleEngine.ts & _rules/)                                         │
│     • 11 Deterministic Security Rules (Shell, Credential, FS, Network, Obfuscation, etc.)       │
│     • Optional opt-in inspection of MCP resources & prompt templates                            │
│                                                                                                 │
│  4. Scoring & Pillar Aggregation (_scorer.ts)                                                   │
│     • Weighted severity calculation: Critical=30, High=15, Medium=5, Low=2                       │
│     • Categorization across 4 Security Pillars                                                  │
│                                                                                                 │
│  5. Structural Mutation & Hardening Engines                                                      │
│     • _diff.ts: Computes baseline vs target delta, flags escalations, tracks property paths      │
│     • _sanitizer.ts: Strips prompt injection, clamps additionalProperties, adds regex patterns  │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     OUTPUTS & ARTIFACTS                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  • Standalone Markdown Audit Report (MCP_SECURITY_REPORT.md) with Shields.io Badge              │
│  • Machine-Readable JSON Scan Reports & Lockfiles (mcp-security-report.json)                    │
│  • Live Shields.io Risk Badge (copyable Markdown string)                                        │
│  • Sanitized Hardened JSON Manifest File                                                        │
│  • CLI Terminal Output (ANSI colored tables, ASCII risk meters, exit codes 0 / 1 / 2)           │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cryptographic Canonical Hashing (RFC 8785 Deep-Dive)

### 4.1. The Need for Canonicalization
In standard JSON, object key ordering is inherently non-deterministic. For instance:
```json
{"name": "execute_query", "description": "Execute SQL"}
```
and
```json
{"description": "Execute SQL", "name": "execute_query"}
```
represent semantically identical schemas. However, passing these two representations into standard SHA-256 hashing functions yields completely different digests, making lockfile pinning and drift detection impossible.

### 4.2. Implementation Mechanism (`backend/src/scanner/_fingerprint.ts`)
The scanner implements deterministic serialization adhering to the principles of **RFC 8785 (JSON Canonicalization Scheme)**:
1. **Recursive Lexicographical Sorting**: Keys in every dictionary and nested object are sorted lexicographically (`Object.keys(obj).sort()`).
2. **Whitespace Stripping**: Eliminates all whitespace, newlines, and indentation outside of quoted string values.
3. **Preservation of Array Order**: Array elements maintain their declared semantic sequence, while object elements within arrays are recursively sorted.
4. **Type Normalization**: Excludes `undefined` properties and function values; `null` primitives serialize strictly as `null`.

The canonicalized string is hashed via Node's native `crypto.createHash('sha256')`:
- **`toolFingerprint`**: The SHA-256 hash of an individual tool's canonicalized schema.
- **`manifestFingerprint`**: The tools array is sorted by tool `name` before computing the SHA-256 hash across the entire toolset.

### 4.3. Guarantees and Non-Guarantees
- **What Fingerprints Guarantee**:
  - **Integrity**: Any change to a tool's name, description, parameters, nested properties, required fields, or server commands produces a different SHA-256 hash.
  - **Order Invariance for Manifests**: Reordering tool entries in the manifest file does not alter `manifestFingerprint`.
  - **Lockfile Pinning**: Enables automated CI/CD checks to detect upstream schema modifications before deploying changes.
- **What Fingerprints Cannot Guarantee**:
  - **Runtime Code Execution**: A clean fingerprint verifies that the *declared schema* has not been tampered with; it cannot verify what code the server executes on its host machine when invoked.
  - **Semantic Safety**: A tool with a clean fingerprint may still declare inherently risky capabilities (e.g., legitimate shell execution); the fingerprint only ensures that its scope has not drifted.

---

## 5. Advanced Threat Detection Rules & Heuristics

The scanner executes 11 deterministic security rules against every tool schema. Each rule assigns a severity rating and evidence string:

| Rule ID | Severity | Category | Detects |
|---|---|---|---|
| `prompt-injection` | Critical | Prompt & AI Integrity | Hidden imperative directives (`ignore previous instructions`, `bypass rules`, `system prompt:`) and fake XML boundary tags (`<IMPORTANT>`, `<SYSTEM>`). |
| `obfuscation-detected` | Critical / High | Prompt & AI Integrity | Zero-width steganography (`\u200B`, `\uFEFF`, etc.), directional Unicode text overrides (Trojan Source attacks), and Base64-encoded shell/prompt injection strings. |
| `tool-shadowing` | Critical / High | Execution Safety | Tools named after system execution binaries (`eval`, `sudo`, `bash`, `curl`, `wget`) or native LLM control primitives (`final_answer`, `computer_use`). |
| `shell-execution` | Critical | Execution Safety | Arbitrary command execution keywords (`bash -c`, `sh`, `cmd.exe`, `exec`) and unconstrained command-line parameter names (`cmd`, `command`, `exec`). |
| `credential-access` | Critical | Data & Network Boundary | Keywords targeting secrets, private keys, SSH directories (`~/.ssh`), environment files (`.env`), and bearer tokens. |
| `filesystem-sensitive` | Critical | Data & Network Boundary | Direct references to sensitive operating system paths (`/etc/passwd`, `/etc/shadow`, `/root`, `C:\Windows\System32`). |
| `filesystem-broad` | High | Data & Network Boundary | Unconstrained path parameters allowing arbitrary read/write traversal across the host filesystem. |
| `network-egress` | High / Medium | Data & Network Boundary | Arbitrary URL parameters and unrestricted HTTP request dispatch without domain allowlists. |
| `over-permission` | High / Medium | Privilege & Schema Scope | Schemas with `additionalProperties: true`, missing `type` definitions, or missing required parameter constraints. |
| `vague-description` | Medium | Privilege & Schema Scope | Tools missing descriptions or possessing brief descriptions (< 15 characters) that force LLMs into guessing tool functionality. |
| `resource-prompt-injection` | Critical / High | Prompt & AI Integrity | Opt-in scanning of MCP `resources/list` URIs and `prompts/list` templates for prompt injection directives. |

### False-Positive Prevention in Tool Shadowing
To prevent flagging legitimate tools with utility-like prefixes or suffixes, `toolShadowing.ts` enforces strict boundary matching:
- **Flagged**: Exact matches (e.g. `ls`, `curl`, `eval`) or explicitly namespaced aliases (`system:ls`, `os/curl`).
- **Exempted**: Legitimate compound names such as `cat_facts`, `eval_formula`, `curl_api_client`, or `git_ls_remote`.

---

## 6. Agent Permission Diff & Automated Hardening Engines

### 6.1. Permission Diff Engine (`POST /api/diff`)
The diff engine in `backend/src/scanner/_diff.ts` takes two manifests (`baseline` and `target`) and performs a structural AST comparison:
1. **Tool Reconciliation**: Categorizes tools as `Added`, `Removed`, `Modified`, or `Unchanged` by matching names.
2. **Schema Property Walking**: Traverses nested schema trees, recording exact property path changes (e.g., `inputSchema.properties.path.pattern`).
3. **Escalation Classification**: Identifies changes that expand privileges:
   - Setting `additionalProperties: false ➔ true` (allowing arbitrary parameter injection).
   - Removing parameter regex patterns.
   - Introducing new filesystem or command execution parameters.
   - Altering tool descriptions to introduce prompt injection directives.
4. **Score Delta Computation**: Computes `riskDelta = targetScore - baselineScore` and derives status (`escalated`, `hardened`, or `neutral`).

### 6.2. Automated Manifest Hardening Engine (`POST /api/harden`)
The sanitizer engine in `backend/src/scanner/_sanitizer.ts` automatically repairs insecure manifests:
1. **Prompt Injection Sanitization**: Strips fake XML tags (`<IMPORTANT>`, `<SYSTEM>`), prompt override phrases, and invisible zero-width Unicode characters from tool descriptions.
2. **Schema Boundary Clamping**: Injects `additionalProperties: false` into all open object schemas, preventing parameter smuggling.
3. **Path Constraint Injection**: If a parameter accepts a filesystem path without constraints, injects a safe path regex pattern (`^[a-zA-Z0-9_\-\./]+$`).
4. **Required Field Enforcement**: Ensures destructive tools enforce explicit required parameter arrays.

---

## 7. Developer Guide: URL Scanning, Report Export & CLI Usage

### 7.1. Live URL Scanning & SSRF Guard
Remote endpoints are scanned via `POST /api/scan-url`:
```bash
curl -X POST http://localhost:8080/api/scan-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mcp.example.com/sse",
    "options": {
      "scanResourcesAndPrompts": true
    }
  }'
```

**SSRF Protection Matrix (`backend/src/scanner/_ssrf.ts`)**:
- Protocol enforcement: Only `http:` and `https:` are permitted. Protocols like `file:`, `ftp:`, `gopher:`, and `data:` return `HTTP 400`.
- Loopback blocking: `127.0.0.0/8` and `::1` are blocked before connection dispatch.
- Private network blocking: `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16` are rejected.
- Cloud metadata blocking: `169.254.169.254` (AWS, GCP, Azure instance metadata) is forbidden.
- DNS pre-resolution: Hostnames are resolved to IP addresses prior to HTTP requests; any domain resolving to a private IP is rejected.
- Redirect hop validation: Every HTTP redirect (301, 302, 307, 308) is intercepted and re-validated against the SSRF guard.

### 7.2. Report Export & Shields.io Badge
- **Markdown Export (`MCP_SECURITY_REPORT.md`)**: Standalone markdown document containing the scan timestamp, Shields.io badge, summary statistics, lockfile table, and detailed findings with remediation steps.
- **JSON Export**: Raw scan report JSON for machine consumption.
- **Shields.io Risk Badge**: Dynamic Markdown badge:
  ```markdown
  [![MCP Security](https://img.shields.io/badge/MCP%20Risk-Critical-red)]()
  ```
  The badge label and color dynamically update based on the scan score:
  - `Critical` (≥ 80 pts) ➔ `red`
  - `High` (50–79 pts) ➔ `orange`
  - `Medium` (20–49 pts) ➔ `yellow`
  - `Low` (1–19 pts) ➔ `brightgreen`
  - `Clean` (0 pts) ➔ `brightgreen`

### 7.3. Standalone CLI Usage (`backend/src/cli.ts`)
The scanner includes a standalone CLI binary:
```bash
# Display help and available commands
scourmcp --help

# Scan a local manifest file (JSON, YAML, JSONL, or Claude Desktop config)
scourmcp scan ./claude_desktop_config.json

# Enforce CI policy: fail with exit code 1 if findings reach 'high' or 'critical'
scourmcp scan ./claude_desktop_config.json --fail-on=high

# Output in JSON or Markdown format
scourmcp scan ./manifest.json --format=json --output=report.json
scourmcp scan ./manifest.json --format=markdown --output=REPORT.md

# Compare two manifest versions for permission drift
scourmcp diff ./manifest-v1.json ./manifest-v2.json

# Automatically generate a hardened manifest file
scourmcp harden ./risky-manifest.json --output ./hardened-manifest.json
```

---

## 8. Complete File Inventory & Module Map

| File Path | Component | Status | Key Exports / Responsibilities |
|---|---|---|---|
| `backend/src/scanner/types.ts` | Backend Core | Extended | TypeScript interfaces: `ManifestTool`, `ScanReport`, `ScanSummary`, `Finding`, `ScanOptions`, `ManifestDiffReport`, `HardenedManifestResult`. |
| `backend/src/scanner/_parser.ts` | Ingestion | Extended | Multi-format manifest parser supporting JSON, JSON Lines, YAML, and `claude_desktop_config.json`. |
| `backend/src/scanner/_fingerprint.ts` | Security | **New** | RFC 8785 canonical JSON serializer and deterministic SHA-256 fingerprinting functions. |
| `backend/src/scanner/_ssrf.ts` | Security | **New** | Network security guard validating IP addresses, DNS resolution, and redirect hops. |
| `backend/src/scanner/_urlFetcher.ts` | Networking | **New** | Live MCP server client supporting HTTP GET, JSON-RPC 2.0 POST, and SSE transports. |
| `backend/src/scanner/_rules/toolShadowing.ts` | Rules | **New** | Detection rule for tools impersonating OS binaries (`ls`, `curl`, `eval`) or LLM control primitives. |
| `backend/src/scanner/_rules/obfuscation.ts` | Rules | **New** | Detection rule for zero-width Unicode steganography, BiDi overrides, and Base64 payloads. |
| `backend/src/scanner/_rules/resourcePromptInjection.ts` | Rules | **New** | Opt-in rule auditing MCP resources and prompt templates for prompt injection directives. |
| `backend/src/scanner/_rules/index.ts` | Rules | Extended | Registry of all 11 active scanning rules. |
| `backend/src/scanner/_ruleEngine.ts` | Engine | Extended | Evaluates rules across tools, attaches tool fingerprints, and runs opt-in checks. |
| `backend/src/scanner/_scorer.ts` | Engine | Extended | Computes weighted risk scores, categorizes severity, and assigns 4-pillar ratings. |
| `backend/src/scanner/_diff.ts` | Engine | **New** | Structural manifest diff engine and permission escalation detector. |
| `backend/src/scanner/_sanitizer.ts` | Engine | **New** | One-click manifest hardening and prompt injection sanitizer. |
| `backend/src/scanner/index.ts` | Public API | Extended | Public facade exporting `scanManifest`, `diffManifests`, and `hardenManifest`. |
| `backend/src/api/scan.ts` | API Routes | Extended | Express handler for `POST /api/scan`. |
| `backend/src/api/scanUrl.ts` | API Routes | **New** | Express handler for `POST /api/scan-url`. |
| `backend/src/api/diff.ts` | API Routes | **New** | Express handler for `POST /api/diff`. |
| `backend/src/api/harden.ts` | API Routes | **New** | Express handler for `POST /api/harden`. |
| `backend/src/api/index.ts` | API Routes | Extended | Route registration router mapping all endpoints. |
| `backend/src/cli.ts` | CLI Runner | **New** | Standalone CLI entrypoint with `scan`, `diff`, and `harden` subcommands. |
| `backend/src/data/trust-directory.json` | Data | **New** | Pre-audited catalog of 16 popular MCP servers. |
| `scripts/harvest-directory.ts` | Tooling | **New** | Harvester script compiling and pre-auditing the curated trust directory. |
| `.github/workflows/mcp-security.yml` | CI/CD | **New** | Reference GitHub Action demonstrating automated PR auditing and drift gating. |
| `frontend/src/lib/api.ts` | Frontend SDK | Extended | Typed client methods: `scanManifest`, `scanUrl`, `diffManifests`, `hardenManifest`. |
| `frontend/src/lib/exportReport.ts` | Frontend SDK | **New** | Generates standalone Markdown reports, JSON downloads, and dynamic Shields.io badges. |
| `frontend/src/components/ManifestInput.tsx` | UI | Extended | Ingestion UI with mode tabs, file upload, 5 showcase presets, and opt-in toggles. |
| `frontend/src/components/ScanReport.tsx` | UI | Extended | Risk report view with 4-pillar meters, lockfile table, and hardening modal. |
| `frontend/src/components/PermissionDiff.tsx` | UI | **New** | Interactive two-pane manifest comparison view with live risk score delta badges. |
| `frontend/src/components/TrustDirectory.tsx` | UI | **New** | Browsable catalog of 16 pre-audited servers with search, filters, and 1-click inspect. |
| `frontend/src/App.tsx` | UI Shell | Extended | Top-level view switcher navigation (`Scanner`, `Diff`, `Trust Directory`). |
| `frontend/src/styles.css` | UI Styling | Extended | Styling for diff views, 4-pillar meters, hardening modals, and badges. |
| `backend/test/*.test.ts` | Test Suite | Extended | 55 automated tests covering all parser, fingerprint, rule, SSRF, diff, and CLI behaviors. |

---

## 9. Verification Evidence & Test Results

### 9.1. Automated Test Suite (`npm test`)
```bash
$ npm test
```
**Test Results (55 / 55 Passing)**:
```
▶ API Endpoints Integration
  ▶ GET /api/health
    ✔ returns healthy status
  ▶ POST /api/scan
    ✔ scans JSON manifest and returns report with fingerprints
    ✔ scans YAML string manifest
    ✔ scans Claude Desktop configuration with env secrets
    ✔ supports opt-in resource and prompt injection scanning
  ▶ POST /api/scan-url
    ✔ blocks loopback IP addresses via SSRF guard
    ✔ blocks cloud metadata address (169.254.169.254)
    ✔ rejects missing or empty URL
✔ API Endpoints Integration (75.4ms)

▶ Standalone CLI Runner
  ✔ prints help and exits with code 0 on --help
  ✔ prints version and exits with code 0 on version command
  ✔ returns code 2 when required target is missing
  ✔ scans safe manifest and exits with code 0
  ✔ returns code 1 when --fail-on threshold is exceeded in scan
  ✔ compares baseline and target files using diff command
  ✔ hardens a manifest file using harden command
✔ Standalone CLI Runner (21.4ms)

▶ Agent Permission Diff Engine
  ✔ detects newly added and removed tools between versions
  ✔ flags permission escalation when schema constraints are relaxed
  ✔ correctly reports risk score reduction when hardening tools
✔ Agent Permission Diff Engine (21.3ms)

▶ Cryptographic Fingerprints & Canonicalization
  ✔ canonicalJsonStringify sorts object keys deterministically
  ✔ omits undefined values and functions in objects
  ✔ computes identical tool fingerprint regardless of key order
  ✔ computes different tool fingerprints for different schemas
  ✔ computes order-invariant manifest fingerprint
✔ Cryptographic Fingerprints & Canonicalization (42.3ms)

▶ Multi-source Manifest Ingestion Parser
  ✔ parses standard JSON object with tools array
  ✔ parses bare JSON array of tools
  ✔ parses Claude Desktop configuration (claude_desktop_config.json)
  ✔ parses JSON Lines (.jsonl) manifests
  ✔ parses YAML manifest format
  ✔ extracts optional resources and prompts when present
  ✔ throws descriptive error on empty or malformed input
✔ Multi-source Manifest Ingestion Parser (43.8ms)

▶ Advanced Detection Rules
  ▶ checkToolShadowing
    ✔ detects tools shadowing critical system binaries and LLM primitives
    ✔ detects tools shadowing standard OS utilities like ls and cat
    ✔ detects delimited shadowing such as "system:ls" and "os/curl"
    ✔ does NOT flag legitimate compound tools with utility prefixes/suffixes
  ▶ checkObfuscation
    ✔ detects zero-width character steganography in tool descriptions
    ✔ detects BiDi text override characters
    ✔ detects Base64-encoded shell command payloads
  ▶ checkResourcePromptInjection (Opt-in)
    ✔ detects prompt injections and sensitive URIs in resources
    ✔ detects prompt injections in MCP prompts and prompt arguments
✔ Advanced Detection Rules (134.2ms)

▶ Automated Hardened Manifest Generator
  ✔ strips prompt injections and zero-width steganography characters
  ✔ clamps open schemas by injecting additionalProperties: false
  ✔ adds regex path validation pattern to unconstrained filesystem parameters
✔ Automated Hardened Manifest Generator (14.2ms)

▶ SSRF Protection & URL Validation
  ✔ blocks loopback IP addresses (127.0.0.1 and ::1)
  ✔ blocks localhost hostname
  ✔ blocks private IPv4 networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  ✔ blocks AWS/GCP cloud metadata IP (169.254.169.254)
  ✔ blocks forbidden protocols like file:, ftp:, gopher:
  ✔ rejects malformed URLs
  ✔ allows valid public HTTP and HTTPS URLs
✔ SSRF Protection & URL Validation (61.9ms)

▶ Curated Trust Directory & Harvester
  ✔ generates a valid, readable trust-directory.json file
  ✔ computes consistent ecosystem statistics
  ✔ guarantees cryptographic SHA-256 fingerprints for every curated server
  ✔ correctly derives trustLevel based on scan severity
  ✔ correctly assigns permission badges based on rules and tools
  ✔ ensures all seed servers match realistic ecosystem schemas
✔ Curated Trust Directory & Harvester (13.5ms)

▶ F-11: Community Blocklist / Advisory Feed Detection Rule
  ✔ detects a known malicious tool name from the community blocklist
  ✔ detects malicious pattern embedded in tool description or schema
  ✔ detects credential exfiltration pattern in prompt or instructions
  ✔ returns zero findings for clean, benign tools
  ✔ integrates into full scanManifest pipeline and generates advisory finding
✔ F-11: Community Blocklist / Advisory Feed Detection Rule (5.0ms)

▶ F-8: Dynamic Runtime Canary Sandbox
  ✔ records expected observation when server handles probe cleanly
  ✔ flags suspicious status when server leaks raw shell interpreter output
  ✔ flags anomaly status when server crashes with 500 on inert input
  ✔ handles unreachable host without crashing and records handshake rejection
✔ F-8: Dynamic Runtime Canary Sandbox (109.4ms)

ℹ tests 64
ℹ suites 17
ℹ pass 64
ℹ fail 0
ℹ duration_ms 3367ms
```

### 9.2. TypeScript Compilation Check (`npm run typecheck`)
```bash
$ npm run typecheck
```
**Output:**
```
npm notice run @scourmcp/backend@0.1.0 typecheck
npm notice run tsc --noEmit
npm notice run @scourmcp/frontend@0.1.0 typecheck
npm notice run tsc --noEmit
```
**Result**: Exit code 0, 0 type errors across backend and frontend workspaces.

### 9.3. Production Build (`npm run build`)
```bash
$ npm run build
```
**Output Highlights:**
```
🌱 Starting MCP Curated Trust Directory Harvester...
✅ Harvest complete!
📦 Total Servers Audited: 16 (8 Verified Safe, 2 Caution, 6 Avoid)
💾 Saved to: frontend/src/data/trust-directory.json
✓ 39 modules transformed.
dist/index.html                   0.41 kB │ gzip:  0.27 kB
dist/assets/index-_Ef_Ethk.css   27.40 kB │ gzip:  5.20 kB
dist/assets/index-BbqkcATn.js   210.43 kB │ gzip: 63.68 kB
✓ built in 1.09s
npm notice run @scourmcp/backend@0.1.0 build
npm notice run tsc -p tsconfig.json && chmod +x dist/cli.js
```
**Result**: Exit code 0, all production bundles compiled successfully.

---

## 10. Remaining Limitations & Follow-Up Work

1. **Stateless In-Memory Design**: By strict architectural design (`BLUEPRINT.md`), the scanner stores no data in a database. Scan results live purely in browser memory or terminal stdout. Page refreshes clear local results unless the user exports the Markdown or JSON report.
2. **Static Boundary vs. Dynamic Sandbox**: The scanner statically analyzes declared schemas, boundaries, constraints, parameter types, descriptions, and environment flags. It does not invoke live tools or sandbox arbitrary binary execution on remote server hosts.
3. **Roadmap Execution (Nov 24–28)**:
   - Presentation deck preparation and pitch rehearsals for the AI Vibeathon finale.
   - Offline laptop and Termux backup bundles for in-person competition judging.
