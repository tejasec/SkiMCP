# Contributing to SkiMCP

Thanks for your interest in contributing to SkiMCP.

## Development Setup

### Prerequisites

- Node.js 20+
- npm

### Install and run

```bash
npm install
npm run build
npm start
```

For local development:

```bash
npm run dev
```

## Checks before opening a PR

Run the same checks CI expects:

```bash
npm run typecheck
npm test
npm run build
```

## Project layout

- `backend/` — CLI, API, scanning engine, rule engine, diff/harden utilities
- `frontend/` — web UI
- `scripts/` — build/harvest scripts
- `.github/workflows/` — CI and automation workflows
- `action.yml` — GitHub Action definition

## Pull request guidelines

- Keep changes focused and atomic.
- Add or update tests for behavior changes when applicable.
- Update documentation (`README.md`, workflow docs, etc.) when user-facing behavior changes.
- Avoid committing generated artifacts unless they are intentionally tracked.
- Do not include secrets, tokens, or private data in issues, PRs, or test fixtures.

## Reporting bugs and requesting features

- Use GitHub Issues for bugs and feature requests.
- For security vulnerabilities, follow [SECURITY.md](SECURITY.md) and do not open a public issue.
