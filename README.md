# MCP Tool Manifest Risk Scanner

Scan MCP (Model Context Protocol) server tool manifests for security risks. Paste or upload a `tools/list` JSON response and get instant findings with severity scores, evidence, and remediation steps.

## Quick Start

```bash
npm install
npm run build
PORT=8080 npm start
# Open http://localhost:8080
```

## Development

```bash
npm install
npm run dev
# Frontend: http://localhost:5173 (proxies /api to :8080)
# Backend:  http://localhost:8080
```

## What It Scans

| Rule | Severity | What It Flags |
|------|----------|---------------|
| Prompt injection | Critical | Hidden instructions in tool descriptions |
| Shell execution | Critical | Arbitrary command execution |
| Credential access | Critical | References to secrets, keys, SSH files |
| Filesystem access | High | Unrestricted file path parameters |
| Network egress | High | Unrestricted URL/HTTP access |
| Over-permission | High | Broad schemas, missing required fields |
| Vague description | Medium | Missing or minimal tool descriptions |

## Docker

```bash
docker build -t mcp-scanner .
docker run --rm -p 8080:8080 mcp-scanner
```

## Architecture

See [BLUEPRINT.md](BLUEPRINT.md) for module boundaries, API contracts, and architectural decisions.
