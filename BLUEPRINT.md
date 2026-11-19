# BLUEPRINT — MCP Tool Manifest Risk Scanner

Short, hackathon-practical contract.

## Product in one line

A web-based scanner that analyzes MCP server tool manifests for security risks — shell execution, prompt injection, credential exposure, over-permissions — and returns scored findings with actionable remediation.

## Hard constraints

- No data stored. No database. Scan results live only in the browser session.
- No auth, accounts, or settings for MVP.
- No LLM calls — scanning is entirely deterministic and rule-based.
- One Cloud Run service: backend serves built frontend.
- Body size limit: 1 MB.

## Module boundaries

| Module | Owns | Public interface | Never does |
| --- | --- | --- | --- |
| `frontend/` | UI, manifest paste/upload, report rendering | React components | Scanning logic, risk rules |
| `backend/src/api/` | HTTP routes and status codes | `registerRoutes(app)` | Scanning logic, scoring |
| `backend/src/scanner/` | All rules, parsing, scoring | `scanManifest(json)` → `ScanReport` | Express, env vars, HTTP |
| `backend/src/config/env.ts` | Env parsing/validation | `env` object | Business logic |

Private helpers use `_` prefix and must not be imported across modules.

## API contract

### `GET /api/health`

Response `200`:
```json
{ "ok": true, "service": "mcp-manifest-scanner", "timestamp": "..." }
```

### `POST /api/scan`

Request: `{ "manifest": { "tools": [...] } }` or bare `{ "tools": [...] }` or bare `[...]`

Response `200`: `{ summary: { totalTools, totalFindings, overallRisk, riskScore }, findings: [...], scannedAt }`

Response `400`: `{ error: "invalid_manifest", message: "..." }`

## Scanning rules

| Rule | Severity | Detects |
| --- | --- | --- |
| `prompt-injection` | Critical | Hidden instructions in descriptions |
| `shell-execution` | Critical | Arbitrary shell/command execution |
| `credential-access` | Critical | References to secrets, keys, passwords |
| `filesystem-broad` | High | Unrestricted file path access |
| `filesystem-sensitive` | Critical | References to sensitive system paths |
| `network-egress` | High/Medium | Unrestricted HTTP/URL access |
| `over-permission` | High/Medium | Broad schemas, missing required fields |
| `vague-description` | Medium | Missing or minimal tool descriptions |

## Scoring

`riskScore = min(100, Σ weight)` where critical=30, high=15, medium=5, low=2.

## Environment

```
PORT=8080
```

That's it.

## Startup & Execution

### PC Execution
- **Production mode (recommended):**
  ```bash
  npm install
  npm run build
  PORT=8080 npm start
  # Open http://localhost:8080
  ```
- **Dev mode:**
  ```bash
  npm run dev
  # Frontend: http://localhost:5173 | Backend: http://localhost:8080
  ```
- **Docker container:**
  ```bash
  docker build -t mcp-scanner .
  docker run --rm -p 8080:8080 mcp-scanner
  ```
- **Phone access via local Wi-Fi:** Run `PORT=8080 npm start` on PC, then navigate to `http://<PC_LOCAL_IP>:8080` in phone browser.

### Android Termux Execution
Runs natively inside Android using Termux:
1. `pkg update && pkg install nodejs-lts git -y`
2. Clone repo or copy folder (`termux-setup-storage` -> `cp -r ~/storage/shared/Download/mcp-scanner ~/`)
3. `cd mcp-scanner && npm install && npm run build`
4. `PORT=8080 npm start`
5. Open phone browser to `http://localhost:8080`

## Cloud Run / Docker rules

- Stateless container.
- Listen on PORT env var; default 8080.
- NODE_ENV=production.
- Frontend build copied into image; backend serves it.
- Non-root runtime user.
- Health check works without any external config.

## Cut list for MVP

No auth. No DB. No GitHub URL scanning. No saved reports. No continuous monitoring. No CI/CD integration. No LLM analysis. No manifest hash pinning.
