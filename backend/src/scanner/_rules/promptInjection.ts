import type { ManifestTool, Finding } from '../types';

// Detects hidden imperative instructions in tool descriptions
// that could hijack LLM behavior (tool poisoning / prompt injection)
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
    pattern: /\b(read|access|send|exfiltrate|upload|post)\b.*\b(ssh|id_rsa|\.env|private|secret|key|token|password|credential)\b/i,
    label: 'Data exfiltration directive',
  },
  {
    pattern: /\b(without|don'?t)\s+(telling|mentioning|showing|revealing|informing)\b/i,
    label: 'Concealment instruction',
  },
];

export function checkPromptInjection(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const desc = tool.description ?? '';

  if (!desc) return findings;

  for (const { pattern, label } of INJECTION_PATTERNS) {
    const match = desc.match(pattern);
    if (match) {
      findings.push({
        ruleId: 'prompt-injection',
        severity: 'critical',
        toolName: tool.name,
        title: `Hidden instructions detected in tool description (${label})`,
        description:
          'Tool description contains imperative or instructional text that may hijack LLM behavior when the model reads the tool manifest.',
        evidence: `Matched "${match[0]}" in description: "${desc.slice(0, 300)}"`,
        remediation:
          'Tool descriptions should be purely declarative — explaining what the tool does, not issuing commands. Remove all imperative instructions, XML-like directive tags, and concealment language.',
      });
    }
  }

  return findings;
}
