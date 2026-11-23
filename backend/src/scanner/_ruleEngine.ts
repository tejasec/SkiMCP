import type {
  ManifestTool,
  ManifestResource,
  ManifestPrompt,
  Finding,
  ScanOptions,
} from './types';
import { allRules, checkResourcePromptInjection } from './_rules';

/**
 * Run registered rules against tools (and optionally resources/prompts) and collect findings.
 * Attaches tool fingerprints to findings where applicable.
 */
export function _runAllRules(
  tools: ManifestTool[],
  resources?: ManifestResource[],
  prompts?: ManifestPrompt[],
  options?: ScanOptions,
): Finding[] {
  const findings: Finding[] = [];

  for (const tool of tools) {
    for (const rule of allRules) {
      const toolFindings = rule(tool);
      for (const f of toolFindings) {
        if (!f.toolFingerprint && tool.toolFingerprint) {
          f.toolFingerprint = tool.toolFingerprint;
        }
        findings.push(f);
      }
    }
  }

  // Opt-in resource and prompt inspection
  if (options?.scanResourcesAndPrompts && (resources?.length || prompts?.length)) {
    const rpFindings = checkResourcePromptInjection(resources ?? [], prompts ?? []);
    findings.push(...rpFindings);
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
