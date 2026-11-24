# SkiMCP

[![CI](https://github.com/tejasec/SkiMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/tejasec/SkiMCP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

**SkiMCP** is a deterministic, rule-based security scanner for [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) tool manifests. It audits MCP servers for prompt injection, shell execution, credential exposure, schema over-permissioning, and permission drift before they reach an agent runtime.

**Live demo:** [skimcp.vercel.app](https://skimcp.vercel.app/)

---

## Why SkiMCP

- **Deterministic scanning** — rule-based findings with reproducible fingerprints, not LLM guesswork.
- **CI-friendly** — scan manifests, diff PR changes, and fail builds on severity thresholds.
- **Actionable hardening** — generate a sanitized manifest that strips risky patterns and tightens schemas.
- **Multiple surfaces** — use it as a web app, CLI, Docker container, or GitHub Action.

## Quick Start

### Web App (local)

```bash
npm install
npm run build
PORT=8080 npm start
# Open http://localhost:8080
```

### CLI

```bash
# Scan a manifest/config (exit 1 if findings meet threshold)
npx skimcp scan ./claude_desktop_config.json --fail-on=high

# Compare baseline (v1) vs target (v2) for permission drift
npx skimcp diff ./manifest-v1.json ./manifest-v2.json

# Generate a hardened manifest
npx skimcp harden ./risky-manifest.json --output ./hardened.json
```

### Docker

```bash
docker build -t skimcp .
docker run --rm -p 8080:8080 skimcp
```

### GitHub Action

Use SkiMCP in CI to scan MCP manifests and block risky changes:

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
```

See [`action.yml`](action.yml) for all inputs.

## CLI Reference

| Command | Purpose | Example |
|---|---|---|
| `scan <path-or-url>` | Audit a manifest/config for security findings | `skimcp scan ./claude_desktop_config.json --fail-on=high` |
| `diff <baseline> <target>` | Detect permission drift between two manifests | `skimcp diff ./v1.json ./v2.json` |
| `harden <path>` | Produce a sanitized/hardened manifest | `skimcp harden ./manifest.json --output ./safe.json` |
| `version` | Print CLI version | `skimcp version` |

| Option | Description |
|---|---|
| `--fail-on=<level>` | Exit `1` when findings reach `critical`, `high`, `medium`, or `low` |
| `--format=<format>` | Output as `table` (default), `json`, or `markdown` |
| `--output=<path>` | Write output to a file instead of stdout |
| `--include-prompts` | Include MCP resources/prompts in injection auditing |
| `--help`, `-h` | Show help |

## API Endpoints

The web server exposes a small REST API:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/scan` | Scan a manifest payload |
| `POST` | `/api/scan-url` | Scan a live MCP endpoint URL (SSRF-protected) |
| `POST` | `/api/diff` | Compare baseline vs target manifests |
| `POST` | `/api/harden` | Generate a hardened manifest |

## Core Capabilities

### 1. Multi-Source Manifest Ingestion
- **MCP manifests** — official `tools/list` payloads and raw tool arrays.
- **Claude Desktop config** — extracts servers, commands (`npx`, `bash`, `docker`), args, and env vars from `claude_desktop_config.json`.
- **JSONL / YAML** — ingests `.jsonl`, `.yaml`, and `.yml` manifests.
- **Live URL scanning** — audits HTTP GET, JSON-RPC 2.0 `tools/list`, or SSE endpoints with SSRF defenses.

### 2. Cryptographic Fingerprints & Lockfile Pinning
- **Deterministic canonicalization** — RFC 8785-style recursive key sorting for stable SHA-256 digests.
- **Anti-rug-pull hashes** — per-tool `toolFingerprint` and whole-manifest `manifestFingerprint`.

### 3. Permission Diff & Drift Detection
- Compares **baseline (v1)** vs **target (v2)** manifests.
- Flags added/removed tools, description changes, and permission escalations (e.g., `additionalProperties: false -> true`, unconstrained path params).
- Reports a net risk-score delta for PR/security review.

### 4. One-Click Hardening
- Strips covert prompt-injection tags (`<IMPORTANT>`, `<SYSTEM>`).
- Removes invisible zero-width Unicode characters.
- Injects `additionalProperties: false` where schemas are too open.
- Adds safe regex validation (`^[a-zA-Z0-9_\-\./]+$`) for unconstrained filesystem path parameters.

### 5. Curated MCP Trust Directory
- Searchable directory of pre-audited MCP servers.
- Ecosystem metrics (safe/caution/avoid/risk averages).
- One-click “Inspect in Scanner” for community servers.

## Threat Detection Rules

| Rule | Severity | Category | Detects |
|---|---|---|---|
| `prompt-injection` | Critical | Prompt & AI Integrity | Hidden imperative instructions, bypass attempts, fake XML tags |
| `obfuscation-detected` | Critical / High | Prompt & AI Integrity | Zero-width Unicode steganography, BiDi overrides, Base64 payloads |
| `tool-shadowing` | Critical / High | Execution Safety | Tools impersonating OS binaries (`ls`, `curl`, `eval`) or LLM control primitives |
| `shell-execution` | Critical | Execution Safety | Arbitrary command execution keywords and unconstrained shell parameters |
| `credential-access` | Critical | Data & Network Boundary | References to secrets, keys, SSH files, and sensitive environment tokens |
| `filesystem-sensitive` | Critical | Data & Network Boundary | Sensitive system paths (`/etc/passwd`, `/root`, `~/.ssh`) |
| `filesystem-broad` | High | Data & Network Boundary | Unrestricted file path access without directory boundaries |
| `network-egress` | High / Medium | Data & Network Boundary | Unrestricted URL/HTTP requests without domain allowlists |
| `over-permission` | High / Medium | Privilege & Schema Scope | `additionalProperties: true`, missing parameter constraints |
| `vague-description` | Medium | Privilege & Schema Scope | Missing or minimal tool descriptions (< 15 chars) |
| `resource-prompt-injection` | Critical / High | Prompt & AI Integrity | Opt-in auditing of MCP resources and prompt templates |

## Development

```bash
# Install dependencies
npm install

# Run web app locally
npm run dev

# Typecheck
npm run typecheck

# Run tests
npm test

# Build
npm run build
```

The automated suite currently includes **55 tests across 15 test suites** covering parser, fingerprints, SSRF, detection rules, diff engine, sanitizer, and CLI behavior.

## Contributing & Security

- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

This project is licensed under the [MIT License](LICENSE).
