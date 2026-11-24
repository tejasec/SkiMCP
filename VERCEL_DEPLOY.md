# Vercel Deployment Guide for SkiMCP

This guide provides step-by-step instructions for deploying **SkiMCP** (MCP Tool Manifest Risk Scanner) to **Vercel**.

---

## 1. Fast Track: 1-Click Deployment via Vercel Dashboard (Recommended)

The easiest and most reliable way to deploy SkiMCP is through the Vercel web dashboard linked to your GitHub repository:

1. Open the [Vercel Dashboard](https://vercel.com/new).
2. Click **Import Repository** and select `tejasec/SkiMCP` (or paste `https://github.com/tejasec/SkiMCP.git`).
3. In the **Configure Project** screen:
   - **Project Name**: `skimcp` (or your preferred name)
   - **Framework Preset**: `Other` or `Vite` (Vercel automatically picks up `vercel.json`)
   - **Root Directory**: `./` (leave default)
   - **Build and Output Settings**: Pre-configured by `vercel.json`:
     - Build Command: `npm run build`
     - Output Directory: `frontend/dist`
   - **Environment Variables**: None required! SkiMCP is 100% deterministic and self-contained with zero external database or API key dependencies.
4. Click **Deploy**.
5. Within ~60 seconds, Vercel will complete the build and provide your live production URL (e.g., `https://skimcp.vercel.app`).

---

## 2. Deploying via Vercel CLI

If you prefer deploying from your local terminal:

### A. Install or Run Vercel CLI
```bash
# Log in to your Vercel account
npx vercel login
```

### B. Preview Deployment (Test Run)
From the `skimcp` folder, run:
```bash
cd skimcp
npx vercel
```
- Select your scope/team.
- Link to an existing project or create a new one.
- Accept the pre-detected settings from `vercel.json`.
- Vercel outputs a unique Preview URL for testing.

### C. Production Deployment
To deploy directly to your production URL:
```bash
cd skimcp
npx vercel --prod
```

Or using the npm script:
```bash
cd skimcp
npm run deploy:vercel -- --prod
```

---

## 3. How SkiMCP Runs on Vercel

```
                               ┌─────────────────────────┐
                               │  Vercel Global Edge CDN  │
                               └────────────┬────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
         Static Frontend Requests                      API Endpoints (/api/*)
           (HTML, CSS, JS bundles)                      (POST /api/scan, etc.)
                     │                                             │
                     ▼                                             ▼
              frontend/dist/                             api/index.ts (Node Serverless)
          (0ms server execution)                                   │
                                                                   ▼
                                                          backend/src/app.ts
                                                      (11 Security Detection Rules)
```

1. **Frontend**: Vite compiles React components into `frontend/dist`. Vercel's global CDN caches and serves these assets at the edge with gzip/brotli compression.
2. **Backend API**: The Express application in `backend/src/app.ts` is exported via `api/index.ts`. All `/api/*` traffic is routed serverlessly on demand:
   - `GET /api/health` — Instant health and service status probe.
   - `POST /api/scan` — Comprehensive manifest risk audit with SHA-256 fingerprints.
   - `POST /api/scan-url` — Live MCP server URL audit with SSRF guard and canary testing.
   - `POST /api/diff` — Baseline vs Target drift detection and permission escalation check.
   - `POST /api/harden` — One-click sanitization and schema clamping.
3. **SPA Routing**: The rewrite `/(.*) -> /index.html` ensures client-side routing works smoothly across all views.

---

## 4. Custom Domain & Managed SSL

To connect SkiMCP to your own domain (e.g. `scanner.yourdomain.com`):

1. Go to your project on [vercel.com](https://vercel.com) > **Settings** > **Domains**.
2. Enter your domain name and click **Add**.
3. Vercel displays the required DNS records (`CNAME` to `cname.vercel-dns.com` or `A` record).
4. Add the record in your domain registrar (Cloudflare, Namecheap, GoDaddy, Route 53, etc.).
5. Vercel automatically generates and auto-renews a free SSL certificate within seconds.

---

## 5. Verification & Health Check

After deployment, test that both static assets and the serverless API are functioning:

```bash
# Verify API health
curl -s https://YOUR_PROJECT.vercel.app/api/health

# Expected response:
# {"ok":true,"service":"skimcp","timestamp":"2026-11-24T..."}
```

You can also run a test manifest scan directly against your production deployment:
```bash
curl -s -X POST https://YOUR_PROJECT.vercel.app/api/scan \
  -H "Content-Type: application/json" \
  -d '{"manifest":{"tools":[{"name":"test","description":"test"}]}}'
```

---

## 6. Continuous Deployment (CI/CD)

Vercel provides native GitHub integration:
- **Every Pull Request**: Vercel automatically creates an isolated Preview Deployment with its own unique URL and posts a comment on the GitHub PR.
- **Merge to `main`**: Automatically triggers a zero-downtime production deployment.
