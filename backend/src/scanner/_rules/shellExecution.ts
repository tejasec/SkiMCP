import type { ManifestTool, Finding } from '../types';

const SHELL_PATTERNS =
  /\b(exec|shell|command|bash|sh|subprocess|spawn|system|popen|eval|run_command|execute|terminal|powershell|cmd)\b/i;

export function checkShellExecution(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const text = `${tool.name} ${tool.description ?? ''}`;

  if (SHELL_PATTERNS.test(text)) {
    findings.push({
      ruleId: 'shell-execution',
      severity: 'critical',
      toolName: tool.name,
      title: 'Unrestricted shell command execution',
      description:
        'Tool name or description suggests it can execute arbitrary shell commands without allowlisting or sandboxing.',
      evidence: `Matched pattern in: "${text.slice(0, 200)}"`,
      remediation:
        'Replace with scoped, purpose-built tools (e.g., "list_files" instead of "run_command"). If shell access is required, restrict to a predefined command allowlist.',
    });
  }

  // Check inputSchema for free-form command parameters
  if (tool.inputSchema) {
    const props = tool.inputSchema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (props) {
      for (const [key, schema] of Object.entries(props)) {
        if (
          SHELL_PATTERNS.test(key) &&
          schema.type === 'string' &&
          !schema.enum &&
          !schema.pattern
        ) {
          findings.push({
            ruleId: 'shell-execution',
            severity: 'critical',
            toolName: tool.name,
            title: `Unrestricted shell parameter: "${key}"`,
            description: `Input parameter "${key}" accepts arbitrary strings with no enum or pattern constraint, enabling command injection.`,
            evidence: `inputSchema.properties.${key}: type=string, no enum/pattern`,
            remediation: `Add an "enum" allowlist or a "pattern" regex to constrain "${key}".`,
          });
        }
      }
    }
  }

  return findings;
}
