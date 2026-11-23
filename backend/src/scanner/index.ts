import type { ScanReport, ScanOptions } from './types';
import { _parseManifest } from './_parser';
import { _runAllRules } from './_ruleEngine';
import { _computeScore } from './_scorer';
import {
  computeToolFingerprint,
  computeManifestFingerprint,
} from './_fingerprint';

export * from './types';
export { canonicalJsonStringify, computeToolFingerprint, computeManifestFingerprint } from './_fingerprint';
export { diffManifests, type ManifestDiffReport, type ModifiedToolDiff, type ToolPropertyChange } from './_diff';
export { hardenManifest, type HardenedManifestResult, type HardeningChange } from './_sanitizer';

/**
 * Scan an MCP tool manifest for security risks.
 *
 * This is the primary public entrypoint of the scanner module.
 *
 * @param rawManifest — parsed JSON body, raw string (JSON, JSONL, YAML), or Claude Desktop config
 * @param options — optional scanning options (e.g. scanResourcesAndPrompts)
 * @returns ScanReport with summary, fingerprints, tools, and findings
 * @throws string — human-readable validation error
 */
export function scanManifest(
  rawManifest: unknown,
  options?: ScanOptions,
): ScanReport {
  const { tools, resources, prompts } = _parseManifest(rawManifest);

  // Compute tool fingerprints
  const toolFingerprints: Record<string, string> = {};
  for (const tool of tools) {
    const fp = computeToolFingerprint(tool);
    tool.toolFingerprint = fp;
    toolFingerprints[tool.name] = fp;
  }

  // Compute manifest fingerprint
  const manifestFingerprint = computeManifestFingerprint(tools);

  // Run detection rules
  const findings = _runAllRules(tools, resources, prompts, options);
  const summary = _computeScore(findings, tools.length, manifestFingerprint);

  return {
    summary,
    manifestFingerprint,
    toolFingerprints,
    tools,
    resources,
    prompts,
    findings,
    scannedAt: new Date().toISOString(),
  };
}
