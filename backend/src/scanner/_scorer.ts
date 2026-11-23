import type { Finding, ScanSummary, OverallRisk, Severity } from './types';

const WEIGHT: Record<Severity, number> = {
  critical: 30,
  high: 15,
  medium: 5,
  low: 2,
};

export function _computeScore(
  findings: Finding[],
  totalTools: number,
  manifestFingerprint: string,
): ScanSummary {
  const rawScore = findings.reduce((sum, f) => sum + WEIGHT[f.severity], 0);
  const riskScore = Math.min(100, rawScore);

  let overallRisk: OverallRisk;
  if (riskScore >= 80) overallRisk = 'critical';
  else if (riskScore >= 50) overallRisk = 'high';
  else if (riskScore >= 20) overallRisk = 'medium';
  else overallRisk = 'low';

  return {
    totalTools,
    totalFindings: findings.length,
    overallRisk,
    riskScore,
    manifestFingerprint,
  };
}
