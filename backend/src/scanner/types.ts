// ── Severity & risk levels ──────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type OverallRisk = 'critical' | 'high' | 'medium' | 'low';

// ── MCP manifest structures ────────────────────────────────────────

export interface ManifestTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  toolFingerprint?: string;
  server?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ManifestResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ManifestPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface ParsedManifest {
  tools: ManifestTool[];
  resources?: ManifestResource[];
  prompts?: ManifestPrompt[];
}

export interface Manifest {
  tools: ManifestTool[];
  resources?: ManifestResource[];
  prompts?: ManifestPrompt[];
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

// ── Scan results ───────────────────────────────────────────────────

export interface Finding {
  ruleId: string;
  severity: Severity;
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
  overallRisk: OverallRisk;
  riskScore: number;
  manifestFingerprint: string;
}

export interface ScanReport {
  summary: ScanSummary;
  manifestFingerprint: string;
  toolFingerprints: Record<string, string>;
  tools: ManifestTool[];
  resources?: ManifestResource[];
  prompts?: ManifestPrompt[];
  findings: Finding[];
  scannedAt: string;
  canaryObservations?: CanaryObservation[];
}

// ── Rule interface ─────────────────────────────────────────────────

export type ScanRule = (tool: ManifestTool) => Finding[];
export type ResourcePromptScanRule = (
  resources: ManifestResource[],
  prompts: ManifestPrompt[],
) => Finding[];
