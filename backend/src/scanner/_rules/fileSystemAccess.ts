import type { ManifestTool, Finding } from '../types';

const FS_NAME_PATTERNS =
  /\b(read_file|write_file|delete_file|list_dir|mkdir|rmdir|copy_file|move_file|rename_file|file_system|filesystem|fs_|readdir)\b/i;

const SENSITIVE_PATH_PATTERNS =
  /(\/(etc|root|home|usr|var|tmp|proc|sys)\b|~\/|\.ssh|\.gnupg|\.aws|\.env|\.git\/config|\/passwd|\/shadow|id_rsa)/i;

export function checkFileSystemAccess(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const text = `${tool.name} ${tool.description ?? ''}`;

  // Check for broad FS tools
  if (FS_NAME_PATTERNS.test(text)) {
    // Check if path parameter is unconstrained
    const props = tool.inputSchema?.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    const pathParam = props
      ? Object.entries(props).find(
          ([key]) => /path|file|dir|directory|filename/i.test(key),
        )
      : undefined;

    if (pathParam && !pathParam[1].enum && !pathParam[1].pattern) {
      findings.push({
        ruleId: 'filesystem-broad',
        severity: 'high',
        toolName: tool.name,
        title: 'Unrestricted filesystem access',
        description:
          'Tool allows reading/writing/listing any file path without directory constraints.',
        evidence: `inputSchema.properties.${pathParam[0]}: no enum or pattern restriction`,
        remediation:
          'Constrain the path parameter to an allowlisted directory prefix or add a "pattern" regex that limits access scope.',
      });
    }
  }

  // Check for references to sensitive paths in descriptions
  if (SENSITIVE_PATH_PATTERNS.test(tool.description ?? '')) {
    const match = (tool.description ?? '').match(SENSITIVE_PATH_PATTERNS);
    findings.push({
      ruleId: 'filesystem-sensitive',
      severity: 'critical',
      toolName: tool.name,
      title: 'Reference to sensitive filesystem path in description',
      description:
        'Tool description references paths commonly associated with credentials or system configuration.',
      evidence: `Description contains: "${match?.[0]}"`,
      remediation:
        'Remove references to sensitive filesystem paths from tool descriptions.',
    });
  }

  return findings;
}
