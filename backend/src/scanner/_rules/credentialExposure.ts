import type { ManifestTool, Finding } from '../types';

const CRED_PATTERNS =
  /\b(ssh|id_rsa|id_ed25519|api_key|api[-_]?secret|password|passwd|token|credential|secret|\.env|auth_token|private_key|access_key|bearer|jwt|oauth|cookie|session_id)\b/i;

export function checkCredentialExposure(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const desc = tool.description ?? '';

  if (CRED_PATTERNS.test(desc)) {
    const match = desc.match(CRED_PATTERNS);
    findings.push({
      ruleId: 'credential-access',
      severity: 'critical',
      toolName: tool.name,
      title: 'Potential credential or secret access',
      description:
        'Tool description references credential files, API keys, tokens, or secrets.',
      evidence: `Description contains: "${match?.[0]}"`,
      remediation:
        'Never reference or encourage access to credential files or secrets in tool descriptions. Use scoped, server-side credential management instead.',
    });
  }

  // Check parameter names
  if (tool.inputSchema?.properties) {
    const props = tool.inputSchema.properties as Record<string, unknown>;
    for (const key of Object.keys(props)) {
      if (CRED_PATTERNS.test(key)) {
        findings.push({
          ruleId: 'credential-access',
          severity: 'high',
          toolName: tool.name,
          title: `Credential-related parameter: "${key}"`,
          description: `Input parameter name "${key}" suggests the tool handles credentials or secrets directly.`,
          evidence: `inputSchema.properties.${key}`,
          remediation:
            'Avoid passing credentials through tool parameters. Use server-side secrets management and reference secrets by name, not value.',
        });
      }
    }
  }

  return findings;
}
