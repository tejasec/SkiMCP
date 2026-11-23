import type { ManifestTool, Finding } from '../types';

// Zero-width characters used for steganography / injection concealment
const ZERO_WIDTH_REGEX = /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u2060\u200E\u200F]/;

// BiDi override characters (Trojan Source / visual spoofing)
const BIDI_OVERRIDE_REGEX = /[\u202A-\u202E\u2066-\u2069]/;

// Base64 candidate regex: strings of 24+ base64 characters with valid padding
const BASE64_CANDIDATE_REGEX = /\b[A-Za-z0-9+/]{24,}={0,2}\b/g;

// Dangerous indicators inside decoded Base64
const DECODED_DANGEROUS_PATTERNS =
  /\b(exec|shell|bash|sh|curl|wget|eval|powershell|cmd|system|rm\s+-rf|id_rsa|\.env|token|secret|password|ignore\s+previous|you\s+must|admin|hidden|http:\/\/|https:\/\/)\b/i;

export function checkObfuscation(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const desc = tool.description ?? '';
  const textToCheck = `${tool.name} ${desc}`;

  if (!desc) return findings;

  // 1. Detect zero-width characters
  if (ZERO_WIDTH_REGEX.test(textToCheck)) {
    const matchedChars: string[] = [];
    for (const char of textToCheck) {
      if (ZERO_WIDTH_REGEX.test(char)) {
        matchedChars.push(`U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
      }
    }
    const uniqueChars = Array.from(new Set(matchedChars));

    findings.push({
      ruleId: 'obfuscation-detected',
      severity: 'critical',
      toolName: tool.name,
      title: 'Zero-width characters detected in tool text',
      description:
        'Tool description contains zero-width characters (e.g. zero-width space, joiner, or BOM). These invisible characters are commonly used for prompt injection steganography to conceal malicious directives from human audit while still influencing LLM tokenizers.',
      evidence: `Found invisible zero-width characters: [${uniqueChars.join(', ')}] in tool "${tool.name}".`,
      remediation:
        'Strip all invisible Unicode zero-width characters (U+200B-U+200F, U+FEFF, U+2060) from tool names and descriptions.',
    });
  }

  // 2. Detect BiDi override characters
  if (BIDI_OVERRIDE_REGEX.test(textToCheck)) {
    const matchedBiDi = Array.from(textToCheck)
      .filter((c) => BIDI_OVERRIDE_REGEX.test(c))
      .map((c) => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
    const uniqueBiDi = Array.from(new Set(matchedBiDi));

    findings.push({
      ruleId: 'obfuscation-detected',
      severity: 'high',
      toolName: tool.name,
      title: 'Bidirectional (BiDi) Unicode override characters detected',
      description:
        'Tool description contains Unicode bidirectional text override characters. These can reverse the visual rendering of text, disguising executable commands or prompt instructions (Trojan Source attack).',
      evidence: `Found BiDi override control characters: [${uniqueBiDi.join(', ')}] in tool "${tool.name}".`,
      remediation:
        'Remove bidirectional control characters (U+202A-U+202E, U+2066-U+2069) from all manifest fields.',
    });
  }

  // 3. Detect Base64-encoded payloads
  const base64Matches = desc.match(BASE64_CANDIDATE_REGEX);
  if (base64Matches) {
    for (const match of base64Matches) {
      try {
        const decoded = Buffer.from(match, 'base64').toString('utf8');
        // Ensure decoded string contains mostly printable ASCII
        const printableAscii = /^[\x20-\x7E\r\n\t]+$/.test(decoded);

        if (printableAscii && decoded.trim().length > 8) {
          const isDangerous = DECODED_DANGEROUS_PATTERNS.test(decoded);
          const severity = isDangerous ? 'critical' : 'high';

          findings.push({
            ruleId: 'obfuscation-detected',
            severity,
            toolName: tool.name,
            title: isDangerous
              ? 'Base64-encoded payload containing dangerous directives/commands detected'
              : 'Base64-encoded string detected in tool description',
            description: isDangerous
              ? 'Tool description contains a Base64-encoded string that decodes to shell commands, network URLs, or prompt injection directives.'
              : 'Tool description contains an unexplained Base64-encoded payload string, which may conceal instructions or binary payloads.',
            evidence: `Encoded: "${match.slice(0, 50)}..." | Decoded: "${decoded.slice(0, 100)}"`,
            remediation:
              'Remove Base64-encoded strings from descriptions. All tool documentation must be in plain, declarative, human-readable text.',
          });
        }
      } catch {
        // Not valid UTF-8 base64, ignore
      }
    }
  }

  return findings;
}
