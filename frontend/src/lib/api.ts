// ── Types mirroring backend ScanReport ──────────────────────────────

export interface Finding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  toolName: string;
  title: string;
  description: string;
  evidence: string;
  remediation: string;
  toolFingerprint?: string;
}

export interface ScanSummary {
  totalTools: number;
  totalFindings: number;
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number;
  manifestFingerprint: string;
}

export interface ManifestTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  toolFingerprint?: string;
  server?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface CanaryObservation {
  toolName: string;
  probeType: string;
  status: 'expected' | 'anomaly' | 'suspicious';
  latencyMs: number;
  details: string;
}

export interface ScanOptions {
  scanResourcesAndPrompts?: boolean;
  runCanaryProbes?: boolean;
}

export interface ScanReport {
  summary: ScanSummary;
  manifestFingerprint: string;
  toolFingerprints: Record<string, string>;
  tools: ManifestTool[];
  findings: Finding[];
  scannedAt: string;
  canaryObservations?: CanaryObservation[];
}

export interface ToolPropertyChange {
  path: string;
  before: unknown;
  after: unknown;
  severity: 'escalated' | 'hardened' | 'neutral';
  description: string;
}

export interface ModifiedToolDiff {
  name: string;
  baselineFingerprint: string;
  targetFingerprint: string;
  isEscalated: boolean;
  propertyChanges: ToolPropertyChange[];
  descriptionChanged: boolean;
  schemaChanged: boolean;
  baselineTool: ManifestTool;
  targetTool: ManifestTool;
}

export interface ManifestDiffReport {
  baselineFingerprint: string;
  targetFingerprint: string;
  baselineScore: number;
  targetScore: number;
  riskDelta: number;
  status: 'escalated' | 'hardened' | 'neutral';
  summary: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    escalatedCount: number;
    unchangedCount: number;
  };
  toolsAdded: ManifestTool[];
  toolsRemoved: ManifestTool[];
  toolsModified: ModifiedToolDiff[];
  toolsUnchanged: string[];
  findingsDelta: {
    newFindings: Finding[];
    resolvedFindings: Finding[];
  };
}

export interface HardeningChange {
  toolName: string;
  type:
    | 'prompt_injection_removed'
    | 'obfuscation_removed'
    | 'schema_clamped'
    | 'path_constraint_added'
    | 'required_enforced';
  description: string;
}

export interface HardenedManifestResult {
  hardenedManifest: {
    tools: ManifestTool[];
  };
  changesApplied: HardeningChange[];
  beforeScore: number;
  afterScore: number;
  scoreReduction: number;
  beforeFingerprint: string;
  afterFingerprint: string;
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

/**
 * Scan a manifest provided as raw JSON, YAML, JSON Lines (.jsonl),
 * or desktop client config.
 */
export async function scanManifest(
  manifestInput: string,
  options?: ScanOptions,
): Promise<ScanReport> {
  let payload: unknown = manifestInput;
  // If valid JSON, parse to object so backend receives structured data;
  // otherwise send raw string for YAML / JSONL / text parsing in backend
  try {
    payload = JSON.parse(manifestInput);
  } catch {
    payload = manifestInput;
  }

  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ manifest: payload, options }),
  });

  const body = await res.json();

  if (!res.ok) {
    const err = body as ScanError;
    throw new Error(err.message || 'Scan failed');
  }

  return body as ScanReport;
}

/**
 * Audit a live MCP server via HTTP/SSE tools/list endpoint.
 */
export async function scanUrl(
  url: string,
  options?: ScanOptions,
): Promise<ScanReport> {
  const res = await fetch('/api/scan-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, options }),
  });

  const body = await res.json();

  if (!res.ok) {
    const err = body as ScanError;
    throw new Error(err.message || 'Live URL scan failed');
  }

  return body as ScanReport;
}

/**
 * Compare two manifests (baseline vs target) for permission drift.
 */
export async function diffManifests(
  baselineInput: string,
  targetInput: string,
): Promise<ManifestDiffReport> {
  let baselinePayload: unknown = baselineInput;
  try {
    baselinePayload = JSON.parse(baselineInput);
  } catch {
    baselinePayload = baselineInput;
  }

  let targetPayload: unknown = targetInput;
  try {
    targetPayload = JSON.parse(targetInput);
  } catch {
    targetPayload = targetInput;
  }

  const res = await fetch('/api/diff', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ baseline: baselinePayload, target: targetPayload }),
  });

  const body = await res.json();
  if (!res.ok) {
    const err = body as ScanError;
    throw new Error(err.message || 'Manifest diff failed');
  }

  return body as ManifestDiffReport;
}

/**
 * Automatically harden and sanitize a risky manifest.
 */
export async function hardenManifest(
  manifestInput: string,
): Promise<HardenedManifestResult> {
  let payload: unknown = manifestInput;
  try {
    payload = JSON.parse(manifestInput);
  } catch {
    payload = manifestInput;
  }

  const res = await fetch('/api/harden', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ manifest: payload }),
  });

  const body = await res.json();
  if (!res.ok) {
    const err = body as ScanError;
    throw new Error(err.message || 'Manifest hardening failed');
  }

  return body as HardenedManifestResult;
}
