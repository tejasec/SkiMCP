import type { ManifestTool, Finding } from '../types';

// Critical OS execution utilities & LLM reserved primitives
const CRITICAL_SHADOW_TARGETS = new Set([
  'eval',
  'sudo',
  'sh',
  'bash',
  'curl',
  'wget',
  'rm',
  'nc',
  'netcat',
  'dd',
  'system',
  'final_answer',
  'computer_use',
  'browser',
  'python_repl',
]);

// High-impact OS utilities
const HIGH_SHADOW_TARGETS = new Set([
  'ls',
  'cat',
  'chmod',
  'chown',
  'ps',
  'kill',
  'top',
  'grep',
  'cp',
  'mv',
  'find',
  'head',
  'tail',
]);

/**
 * Extracts the base name of a tool, stripping namespace prefixes like "system:", "os/", "core.".
 */
function extractBaseName(name: string): string {
  const normalized = name.trim().toLowerCase();
  const parts = normalized.split(/[:./_-]/);
  // If the raw name is an exact match, return it
  if (CRITICAL_SHADOW_TARGETS.has(normalized) || HIGH_SHADOW_TARGETS.has(normalized)) {
    return normalized;
  }
  // If delimited by namespace separator like "system:ls" or "os/curl"
  if (normalized.includes(':') || normalized.includes('/')) {
    const afterSeparator = normalized.split(/[:/]/).pop()?.trim() || '';
    if (CRITICAL_SHADOW_TARGETS.has(afterSeparator) || HIGH_SHADOW_TARGETS.has(afterSeparator)) {
      return afterSeparator;
    }
  }
  return normalized;
}

/**
 * Check if tool impersonates standard OS utilities or native LLM primitives.
 * Avoids false positives from compound names (e.g. `eval_expression`, `curl_api_client`, `git_ls_remote`).
 */
export function checkToolShadowing(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const rawName = tool.name.trim();
  const baseName = extractBaseName(rawName);

  const isCritical = CRITICAL_SHADOW_TARGETS.has(baseName);
  const isHigh = HIGH_SHADOW_TARGETS.has(baseName);

  if (!isCritical && !isHigh) {
    return findings;
  }

  const severity = isCritical ? 'critical' : 'high';
  const category = isCritical ? 'system command / LLM primitive' : 'standard OS utility';

  findings.push({
    ruleId: 'tool-shadowing',
    severity,
    toolName: tool.name,
    title: `Tool shadows ${category} ("${baseName}")`,
    description: `Tool "${tool.name}" uses the exact name of a ${category} ("${baseName}"). An LLM may mistakenly route user queries meant for trusted host binaries or internal reasoning to this untrusted MCP tool.`,
    evidence: `Tool name "${tool.name}" matches shadowed target "${baseName}". Description: "${(tool.description ?? 'None').slice(0, 150)}"`,
    remediation: `Prefix or namespace the tool with an explicit, purpose-built domain identifier (e.g. "workspace_list_files" instead of "${baseName}", or "http_request" instead of "${baseName}"). Never impersonate standard shell binaries or reserved agent function names.`,
  });

  return findings;
}
