import type { ManifestTool, Finding, ScanRule } from './types';
import { allRules } from './_rules';

/**
 * Run every registered rule against every tool and collect findings.
 * Private to the scanner module.
 */
export function _runAllRules(tools: ManifestTool[]): Finding[] {
  const findings: Finding[] = [];

  for (const tool of tools) {
    for (const rule of allRules) {
      findings.push(...rule(tool));
    }
  }

  // Sort: critical first, then high, medium, low
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  findings.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return findings;
}
