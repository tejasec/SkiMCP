import type { ManifestTool, Finding } from '../types';

// Detects overly broad input schemas that give the tool too much power
const DESTRUCTIVE_INDICATORS =
  /\b(write|delete|remove|drop|update|modify|create|insert|alter|execute|run|send|post|put|patch)\b/i;

export function checkOverPermission(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const schema = tool.inputSchema;

  if (!schema) {
    // No schema at all — flag if tool name sounds destructive
    const text = `${tool.name} ${tool.description ?? ''}`;
    if (DESTRUCTIVE_INDICATORS.test(text)) {
      findings.push({
        ruleId: 'over-permission',
        severity: 'high',
        toolName: tool.name,
        title: 'Destructive tool with no input schema',
        description:
          'Tool appears to perform state-changing actions but defines no inputSchema, meaning the LLM can pass arbitrary parameters.',
        evidence: `No inputSchema defined; tool name/description matches destructive pattern`,
        remediation:
          'Define a strict inputSchema with explicit properties, required fields, and type constraints.',
      });
    }
    return findings;
  }

  // Check for additionalProperties: true on a tool that sounds destructive
  if (schema.additionalProperties === true) {
    findings.push({
      ruleId: 'over-permission',
      severity: 'high',
      toolName: tool.name,
      title: 'Schema allows additional unvalidated properties',
      description:
        'inputSchema has additionalProperties: true, allowing the LLM to inject unexpected parameters.',
      evidence: 'inputSchema.additionalProperties = true',
      remediation:
        'Set additionalProperties to false and explicitly declare all allowed properties.',
    });
  }

  // Check for destructive tools with no required fields
  const text = `${tool.name} ${tool.description ?? ''}`;
  if (DESTRUCTIVE_INDICATORS.test(text)) {
    const required = schema.required;
    if (!required || (Array.isArray(required) && required.length === 0)) {
      findings.push({
        ruleId: 'over-permission',
        severity: 'medium',
        toolName: tool.name,
        title: 'Destructive tool with no required parameters',
        description:
          'Tool appears to perform state-changing actions but defines no required parameters, allowing the LLM to call it with empty input.',
        evidence: 'inputSchema.required is empty or undefined',
        remediation:
          'Add critical parameters to the "required" array to prevent accidental invocations.',
      });
    }
  }

  return findings;
}
