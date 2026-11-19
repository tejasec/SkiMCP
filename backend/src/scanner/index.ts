import type { ScanReport } from './types';
import { _parseManifest } from './_parser';
import { _runAllRules } from './_ruleEngine';
import { _computeScore } from './_scorer';

/**
 * Scan an MCP tool manifest for security risks.
 *
 * This is the ONLY public function of the scanner module.
 * All parsing, rule evaluation, and scoring is private.
 *
 * @param rawManifest — the parsed JSON body (tools array or { tools: [...] })
 * @returns ScanReport with summary + findings
 * @throws string — human-readable validation error
 */
export function scanManifest(rawManifest: unknown): ScanReport {
  const tools = _parseManifest(rawManifest);
  const findings = _runAllRules(tools);
  const summary = _computeScore(findings, tools.length);

  return {
    summary,
    findings,
    scannedAt: new Date().toISOString(),
  };
}
