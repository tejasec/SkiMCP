#!/usr/bin/env bash
# ==============================================================================
# SkiMCP — Google Cloud Run Automated Deployment Script
# ==============================================================================
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-skimcp}"
REGION="${REGION:-us-central1}"
MEMORY="${MEMORY:-512Mi}"
CPU="${CPU:-1}"
CONCURRENCY="${CONCURRENCY:-80}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-10}"

echo "============================================================"
echo "  SkiMCP — Google Cloud Run Automated Deployment"
echo "============================================================"

# 1. Verify gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
  echo "[ERROR] Google Cloud SDK (gcloud) is not installed."
  echo "        Install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# 2. Verify authentication
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
if [ -z "${ACTIVE_ACCOUNT}" ]; then
  echo "[AUTH] No active Google Cloud account found."
  echo "       Running 'gcloud auth login'..."
  gcloud auth login
  ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
fi
echo "[AUTH] Authenticated as: ${ACTIVE_ACCOUNT}"

# 3. Detect or prompt for Project ID
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || true)
PROJECT_ID="${PROJECT_ID:-${CURRENT_PROJECT}}"

if [ -z "${PROJECT_ID}" ] || [ "${PROJECT_ID}" = "(unset)" ]; then
  echo ""
  echo "No active project is configured in gcloud."
  read -r -p "Enter your Google Cloud Project ID: " PROJECT_ID
  gcloud config set project "${PROJECT_ID}"
fi
echo "[PROJECT] Target GCP Project: ${PROJECT_ID}"
echo "[REGION] Target Cloud Run Region: ${REGION}"
echo ""

# 4. Enable required Google Cloud APIs
echo "[SETUP] Ensuring required Google Cloud APIs are enabled..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project="${PROJECT_ID}"

echo "[OK] Required APIs are enabled."
echo ""

# 5. Build and Deploy directly to Cloud Run from source
echo "[DEPLOY] Building container and deploying service '${SERVICE_NAME}'..."
echo "         (Google Cloud Build will package and deploy from source)"
echo ""

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory="${MEMORY}" \
  --cpu="${CPU}" \
  --concurrency="${CONCURRENCY}" \
  --min-instances="${MIN_INSTANCES}" \
  --max-instances="${MAX_INSTANCES}" \
  --set-env-vars="NODE_ENV=production,PORT=8080"

# 6. Retrieve Service URL and verify health
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(status.url)")

echo ""
echo "============================================================"
echo "  [SUCCESS] SkiMCP is successfully deployed to Cloud Run!"
echo "============================================================"
echo "  Public URL:    ${SERVICE_URL}"
echo "  Health Check:  ${SERVICE_URL}/api/health"
echo "  Region:        ${REGION}"
echo "  Project:       ${PROJECT_ID}"
echo "============================================================"
echo ""

# 7. Quick health check test
echo "[VERIFY] Checking health endpoint..."
if command -v curl &> /dev/null; then
  HEALTH_STATUS=$(curl -fsS "${SERVICE_URL}/api/health" 2>/dev/null || true)
  if [ -n "${HEALTH_STATUS}" ]; then
    echo "[OK] Health Check Response: ${HEALTH_STATUS}"
  else
    echo "[INFO] Health check pending DNS propagation. Test manually in 10-15 seconds."
  fi
fi
echo ""
echo "Open ${SERVICE_URL} in your browser to start auditing MCP manifests!"
