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
}

export interface Manifest {
  tools: ManifestTool[];
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
}

export interface ScanSummary {
  totalTools: number;
  totalFindings: number;
  overallRisk: OverallRisk;
  riskScore: number;
}

export interface ScanReport {
  summary: ScanSummary;
  findings: Finding[];
  scannedAt: string;
}

// ── Rule interface ─────────────────────────────────────────────────

export type ScanRule = (tool: ManifestTool) => Finding[];
