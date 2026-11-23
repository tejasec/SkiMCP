import type { ManifestResource, ManifestPrompt, Finding } from '../types';

const INJECTION_PATTERNS = [
  {
    pattern: /<\s*(IMPORTANT|SYSTEM|ADMIN|INTERNAL|HIDDEN|SECRET)\s*>/i,
    label: 'XML-like directive tag',
  },
  {
    pattern:
      /\b(ignore previous|ignore all|disregard|forget|override|you must|you should|do not mention|do not tell|before calling|before using|always include|pass its content)\b/i,
    label: 'Imperative instruction',
  },
  {
    pattern:
      /\b(read|access|send|exfiltrate|upload|post)\b.*\b(ssh|id_rsa|\.env|private|secret|key|token|password|credential)\b/i,
    label: 'Data exfiltration directive',
  },
  {
    pattern: /\b(without|don'?t)\s+(telling|mentioning|showing|revealing|informing)\b/i,
    label: 'Concealment instruction',
  },
];

const SENSITIVE_URI_PATTERNS =
  /(\/(etc|root|home|usr|var|tmp|proc|sys)\b|~\/|\.ssh|\.gnupg|\.aws|\.env|\/passwd|\/shadow|id_rsa|id_ed25519)/i;

const ZERO_WIDTH_REGEX = /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u2060]/;

/**
 * Opt-in rule to inspect MCP resources and prompts for prompt injection,
 * credential leakage, and URI-based sensitive file access.
 */
export function checkResourcePromptInjection(
  resources: ManifestResource[] = [],
  prompts: ManifestPrompt[] = [],
): Finding[] {
  const findings: Finding[] = [];

  // 1. Audit Resources
  for (const resource of resources) {
    const textToCheck = `${resource.name} ${resource.description ?? ''} ${resource.uri}`;

    // Sensitive URI path access
    if (SENSITIVE_URI_PATTERNS.test(resource.uri)) {
      const match = resource.uri.match(SENSITIVE_URI_PATTERNS);
      findings.push({
        ruleId: 'resource-prompt-injection',
        severity: 'critical',
        toolName: `resource:${resource.name}`,
        title: 'MCP Resource references sensitive system path',
        description:
          'A declared MCP resource URI points to a sensitive filesystem or credential location (e.g., SSH keys, /etc, or .env files).',
        evidence: `Resource "${resource.name}" URI "${resource.uri}" matches "${match?.[0]}".`,
        remediation:
          'Restrict resource URIs to authorized public or sandboxed asset paths. Remove references to root or credential paths.',
      });
    }

    // Hidden injection instructions in resource description
    const desc = resource.description ?? '';
    for (const { pattern, label } of INJECTION_PATTERNS) {
      const match = desc.match(pattern);
      if (match) {
        findings.push({
          ruleId: 'resource-prompt-injection',
          severity: 'critical',
          toolName: `resource:${resource.name}`,
          title: `Prompt injection in MCP resource description (${label})`,
          description:
            'MCP resource description contains imperative directives that can hijack LLM behavior when the model inspects available resources.',
          evidence: `Matched "${match[0]}" in resource description: "${desc.slice(0, 200)}"`,
          remediation:
            'Ensure resource descriptions are purely factual and declarative. Remove imperative commands or hidden directives.',
        });
      }
    }

    // Zero-width characters in resource
    if (ZERO_WIDTH_REGEX.test(textToCheck)) {
      findings.push({
        ruleId: 'resource-prompt-injection',
        severity: 'critical',
        toolName: `resource:${resource.name}`,
        title: 'Zero-width character obfuscation in MCP resource',
        description: 'Resource contains hidden zero-width characters in its definition or description.',
        evidence: `Zero-width character detected in resource "${resource.name}".`,
        remediation: 'Strip all invisible zero-width Unicode characters from resource metadata.',
      });
    }
  }

  // 2. Audit Prompts
  for (const prompt of prompts) {
    const textToCheck = `${prompt.name} ${prompt.description ?? ''}`;

    for (const { pattern, label } of INJECTION_PATTERNS) {
      const match = (prompt.description ?? '').match(pattern);
      if (match) {
        findings.push({
          ruleId: 'resource-prompt-injection',
          severity: 'critical',
          toolName: `prompt:${prompt.name}`,
          title: `Malicious directive in MCP prompt definition (${label})`,
          description:
            'Declared prompt template or description contains adversarial instructions designed to bypass guardrails or exfiltrate context.',
          evidence: `Matched "${match[0]}" in prompt "${prompt.name}" description.`,
          remediation:
            'Review prompt template instructions. Do not use prompt definitions to bypass host safety guidelines or exfiltrate private tokens.',
        });
      }
    }

    // Check prompt arguments
    if (prompt.arguments) {
      for (const arg of prompt.arguments) {
        for (const { pattern, label } of INJECTION_PATTERNS) {
          const match = (arg.description ?? '').match(pattern);
          if (match) {
            findings.push({
              ruleId: 'resource-prompt-injection',
              severity: 'high',
              toolName: `prompt:${prompt.name}`,
              title: `Adversarial instruction in prompt argument (${label})`,
              description: `Argument "${arg.name}" of prompt "${prompt.name}" contains suspicious instructions.`,
              evidence: `Matched "${match[0]}" in argument description.`,
              remediation: 'Keep argument descriptions concise, declarative, and focused solely on parameter format.',
            });
          }
        }
      }
    }
  }

  return findings;
}
