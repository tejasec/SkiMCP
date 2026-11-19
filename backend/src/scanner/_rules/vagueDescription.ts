import type { ManifestTool, Finding } from '../types';

export function checkVagueDescription(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const desc = (tool.description ?? '').trim();

  if (!desc) {
    findings.push({
      ruleId: 'vague-description',
      severity: 'medium',
      toolName: tool.name,
      title: 'Missing tool description',
      description:
        'Tool has no description. The LLM cannot understand when or how to use it safely, increasing misuse risk.',
      evidence: 'description is empty or undefined',
      remediation:
        'Add a clear, declarative description explaining what the tool does, what inputs it expects, and what side effects it has.',
    });
  } else if (desc.split(/\s+/).length <= 3) {
    findings.push({
      ruleId: 'vague-description',
      severity: 'medium',
      toolName: tool.name,
      title: 'Vague or minimal tool description',
      description:
        'Tool description is very short (≤3 words), giving the LLM insufficient context for safe usage.',
      evidence: `description: "${desc}"`,
      remediation:
        'Expand the description to explain purpose, expected inputs, side effects, and any access restrictions.',
    });
  }

  return findings;
}
