// ── Types mirroring backend ScanReport ──────────────────────────────

export interface Finding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  toolName: string;
  title: string;
  description: string;
  evidence: string;
  remediation: string;
}

export interface ScanSummary {
  totalTools: number;
  totalFindings: number;
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number;
}

export interface ScanReport {
  summary: ScanSummary;
  findings: Finding[];
  scannedAt: string;
}

export interface ScanError {
  error: string;
  message: string;
}

export interface HealthResponse {
  ok: boolean;
  service: string;
  timestamp: string;
}

// ── API calls ──────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return (await res.json()) as HealthResponse;
}

export async function scanManifest(
  manifestJson: string,
): Promise<ScanReport> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestJson);
  } catch {
    throw new Error('Invalid JSON — please check your manifest syntax.');
  }

  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ manifest: parsed }),
  });

  const body = await res.json();

  if (!res.ok) {
    const err = body as ScanError;
    throw new Error(err.message || 'Scan failed');
  }

  return body as ScanReport;
}
