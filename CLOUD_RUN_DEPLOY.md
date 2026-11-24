# Google Cloud Run Deployment Guide for SkiMCP

This guide provides step-by-step instructions for deploying **SkiMCP** (MCP Tool Manifest Risk Scanner) to **Google Cloud Run**.

---

## 1. Fast Track: Deploy in 1 Command

If you have the Google Cloud SDK (`gcloud`) installed and authenticated on your machine, you can deploy immediately:

```bash
cd skimcp
npm run deploy:cloudrun
```

Or run the underlying `gcloud` command directly:

```bash
gcloud run deploy skimcp \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1
```

> [!NOTE]
> When using `--source .`, Google Cloud Build automatically uploads your source code, builds the multi-stage `Dockerfile` in the cloud, registers the image to Artifact Registry, and deploys it to Cloud Run. You do not even need Docker installed locally!

---

## 2. Prerequisites & Initial GCP Setup

### A. Install and Authenticate Google Cloud CLI

1. Install `gcloud` if not already installed:
   - macOS: `brew install google-cloud-sdk`
   - Linux / Ubuntu: `sudo snap install google-cloud-cli --classic` or via official apt repo
   - Windows: Download installer from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

2. Authenticate:
   ```bash
   gcloud auth login
   ```

3. Set or create your target GCP project:
   ```bash
   # List existing projects
   gcloud projects list

   # Set active project
   gcloud config set project YOUR_PROJECT_ID
   ```

### B. Enable Required GCP APIs

Run once per project to enable Cloud Run, Cloud Build, and Artifact Registry APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 3. Alternative Deployment Methods

### Method A: Local Docker Build + Push to Artifact Registry

If you prefer building and inspecting the container locally before pushing:

1. **Configure Docker authentication with Artifact Registry**:
   ```bash
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

2. **Create Artifact Registry repository** (one-time):
   ```bash
   gcloud artifacts repositories create skimcp \
     --repository-format=docker \
     --location=us-central1 \
     --description="SkiMCP container repository"
   ```

3. **Build the container locally**:
   ```bash
   docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/skimcp/skimcp:latest .
   ```

4. **Push the image**:
   ```bash
   docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/skimcp/skimcp:latest
   ```

5. **Deploy the image to Cloud Run**:
   ```bash
   gcloud run deploy skimcp \
     --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/skimcp/skimcp:latest \
     --region=us-central1 \
     --platform=managed \
     --allow-unauthenticated \
     --port=8080 \
     --memory=512Mi \
     --cpu=1
   ```

---

### Method B: Google Cloud Console (Web GUI)

If you prefer deploying via the Google Cloud web browser interface:

1. Open the [Google Cloud Run Console](https://console.cloud.google.com/run).
2. Click **Create Service**.
3. Under **Deployment platform**, select **Continuously deploy from a repository** (Cloud Build) or select **Deploy one revision from an existing container image**.
4. If deploying from source / repository:
   - Connect your GitHub account and select the `SkiMCP` repository.
   - Branch: `main`
   - Build type: **Dockerfile** (path: `Dockerfile`).
5. Under **Service settings**:
   - Service name: `skimcp`
   - Region: `us-central1` (or your preferred region)
6. Under **Authentication**:
   - Select **Allow unauthenticated invocations** (makes the scanner publicly accessible).
7. Under **Container, Networking, Security**:
   - Container port: `8080`
   - Memory: `512 MiB`
   - CPU: `1`
   - Maximum requests per container (Concurrency): `80`
   - Execution environment: **Default**
8. Click **Create**.
9. In 1 to 2 minutes, your deployment will finish and display a live `https://skimcp-*.a.run.app` URL.

---

### Method C: GitHub Actions CI/CD Pipeline

The repository includes a ready-to-use GitHub Actions workflow at [`.github/workflows/deploy-cloudrun.yml`](.github/workflows/deploy-cloudrun.yml).

To activate automated deployment on push to `main`:

1. In Google Cloud, create a Service Account with permissions:
   - `roles/run.admin` (Cloud Run Admin)
   - `roles/iam.serviceAccountUser` (Service Account User)
   - `roles/artifactregistry.writer` (Artifact Registry Writer)
   - `roles/cloudbuild.builds.builder` (Cloud Build Builder)

2. Create a JSON key for the Service Account:
   ```bash
   gcloud iam service-accounts keys create key.json \
     --iam-account=SA_NAME@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

3. In your GitHub repository:
   - Navigate to **Settings** > **Secrets and variables** > **Actions**.
   - Add Secret: `GCP_PROJECT_ID` = `YOUR_PROJECT_ID`
   - Add Secret: `GCP_SA_KEY` = contents of `key.json`

4. Any commit pushed to `main` touching application code will now automatically build and deploy to Cloud Run!

---

## 4. Architecture & Cloud Run Optimization

### Architecture Highlights

- **Unified Container**: Express backend + Vite React SPA in a single container image (~120 MB Alpine Linux).
- **Static Asset Serving**: Express directly serves the pre-compiled Vite frontend bundle from `/app/frontend/dist` with fallback to `index.html` for single-page routing.
- **REST Endpoints**: Real-time auditing (`/api/scan`, `/api/scan-url`), diff computation (`/api/diff`), one-click hardening (`/api/harden`), and health checks (`/api/health`).
- **Graceful Termination**: Handles `SIGTERM` and `SIGINT` signals so Cloud Run instance autoscaling downscales without interrupting in-flight audits.

### Cost & Free Tier Efficiency

Google Cloud Run includes a generous **Always Free tier** every month:
- **2,000,000 requests** free per month
- **360,000 GB-seconds** of memory free per month
- **180,000 vCPU-seconds** of compute free per month
- **1 GB** egress to North America free per month

Because SkiMCP is configured with:
- `min-instances: 0` (scales down to zero when idle, incurring $0.00 cost)
- `memory: 512Mi`
- `cpu: 1` (with CPU throttling enabled when not processing requests)

> [!TIP]
> SkiMCP will operate **100% free of charge** under standard personal and small-to-medium team scanning usage.

---

## 5. Custom Domain & Managed SSL

To map SkiMCP to your own custom domain (e.g. `scanner.yourdomain.com`):

1. In Cloud Run console, go to **Manage Custom Domains**.
2. Click **Add Mapping**.
3. Select service: `skimcp`.
4. Enter your custom domain name.
5. Google Cloud Run provides DNS records (`CNAME` or `A` / `AAAA` records). Add these records in your DNS registrar (Cloudflare, Namecheap, Route 53, etc.).
6. Google Cloud automatically provisions and renews a free **Let's Encrypt / Google Trust Services SSL certificate** within ~15 minutes.

---

## 6. Verification & Troubleshooting

### Check Health Probe
```bash
curl -i https://YOUR_SERVICE_URL.a.run.app/api/health
```
Expected output:
```json
HTTP/2 200
content-type: application/json; charset=utf-8

{"ok":true,"service":"skimcp","timestamp":"2026-11-24T09:17:16.878Z"}
```

### Inspect Live Logs
```bash
gcloud run services logs tail skimcp --project=YOUR_PROJECT_ID --region=us-central1
```

### Common Questions

- **Why port 8080?**: Cloud Run passes the `PORT` environment variable (default `8080`) to the container. The backend automatically reads `process.env.PORT` and binds to `0.0.0.0`.
- **How to update environment variables?**:
  ```bash
  gcloud run services update skimcp --set-env-vars="LOG_LEVEL=debug"
  ```
