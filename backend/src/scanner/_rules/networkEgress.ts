import type { ManifestTool, Finding } from '../types';

const NETWORK_PATTERNS =
  /\b(fetch|http|https|request|curl|wget|download|upload|send_request|api_call|webhook|socket|connect|url)\b/i;

export function checkNetworkEgress(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const text = `${tool.name} ${tool.description ?? ''}`;

  if (NETWORK_PATTERNS.test(text)) {
    // Check if URL parameter is unconstrained
    const props = tool.inputSchema?.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    const urlParam = props
      ? Object.entries(props).find(
          ([key]) => /url|endpoint|host|domain|uri|address/i.test(key),
        )
      : undefined;

    if (urlParam && !urlParam[1].enum && !urlParam[1].pattern) {
      findings.push({
        ruleId: 'network-egress',
        severity: 'high',
        toolName: tool.name,
        title: 'Unrestricted network egress',
        description:
          'Tool enables arbitrary HTTP requests or URL fetching with no domain restriction, potentially allowing data exfiltration.',
        evidence: `inputSchema.properties.${urlParam[0]}: accepts any string URL`,
        remediation:
          'Restrict URLs to an allowlisted domain set via "enum" or "pattern" with approved hosts.',
      });
    } else if (!urlParam) {
      // Still flag the tool as network-capable
      findings.push({
        ruleId: 'network-egress',
        severity: 'medium',
        toolName: tool.name,
        title: 'Network-capable tool detected',
        description:
          'Tool name or description suggests network access capability.',
        evidence: `Matched network pattern in: "${text.slice(0, 200)}"`,
        remediation:
          'Verify that network access is scoped to intended destinations and document allowed endpoints.',
      });
    }
  }

  return findings;
}
