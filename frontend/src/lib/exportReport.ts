import type { ScanReport } from './api';

export interface BadgeInfo {
  label: string;
  color: string;
  badgeUrl: string;
  markdown: string;
}

/**
 * Derive Shields.io badge label and color from the actual scan risk score.
 */
export function getBadgeInfo(riskScore: number, overallRisk: string): BadgeInfo {
  let label = 'Low';
  let color = 'brightgreen';

  if (riskScore >= 80 || overallRisk === 'critical') {
    label = 'Critical';
    color = 'red';
  } else if (riskScore >= 50 || overallRisk === 'high') {
    label = 'High';
    color = 'orange';
  } else if (riskScore >= 20 || overallRisk === 'medium') {
    label = 'Medium';
    color = 'yellow';
  } else {
    label = riskScore > 0 ? 'Low' : 'Clean';
    color = 'brightgreen';
  }

  const badgeUrl = `https://img.shields.io/badge/MCP%20Risk-${encodeURIComponent(label)}-${color}`;
  const markdown = `[![MCP Security](${badgeUrl})]()`;

  return { label, color, badgeUrl, markdown };
}

/**
 * Generate a standalone Markdown security audit report (MCP_SECURITY_REPORT.md).
 */
export function generateMarkdownReport(report: ScanReport): string {
  const { summary, manifestFingerprint, toolFingerprints, findings, scannedAt } = report;
  const badge = getBadgeInfo(summary.riskScore, summary.overallRisk);

  const lines: string[] = [];

  lines.push('# ScourMCP Security Audit Report');
  lines.push('');
  lines.push(`**Scanned At:** \`${scannedAt}\`  `);
  lines.push(`**Overall Risk:** **${summary.overallRisk.toUpperCase()}** (Score: ${summary.riskScore}/100)  `);
  lines.push(`**Status Badge:** ${badge.markdown}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Cryptographic Integrity Fingerprints');
  lines.push('');
  lines.push('Deterministic SHA-256 canonical fingerprints for lockfile and version pinning:');
  lines.push('');
  lines.push(`- **Manifest Fingerprint:** \`${manifestFingerprint}\``);
  lines.push('');
  lines.push('### Tool Integrity Lockfile');
  lines.push('');
  lines.push('| Tool Name | Canonical SHA-256 Fingerprint |');
  lines.push('|---|---|');

  const toolNames = Object.keys(toolFingerprints || {}).sort();
  if (toolNames.length === 0) {
    lines.push('| *(No tools registered)* | - |');
  } else {
    for (const name of toolNames) {
      lines.push(`| \`${name}\` | \`${toolFingerprints[name]}\` |`);
    }
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| **Total Tools Audited** | ${summary.totalTools} |`);
  lines.push(`| **Total Security Findings** | ${summary.totalFindings} |`);
  lines.push(`| **Risk Score** | ${summary.riskScore} / 100 |`);
  lines.push(`| **Risk Level** | ${summary.overallRisk.toUpperCase()} |`);
  lines.push('');

  lines.push('### Permission Category Breakdown');
  lines.push('');
  lines.push('| Category | Findings | Severity |');
  lines.push('|---|---|---|');
  
  const categoryRules: Record<string, string[]> = {
    '⚡ Shell & Execution': ['shell-execution', 'tool-shadowing'],
    '📁 Filesystem Access': ['filesystem-broad', 'filesystem-sensitive'],
    '🌐 Network & Egress': ['network-egress'],
    '🔑 Credentials & Secrets': ['credential-access'],
    '🎯 Prompt & AI Integrity': ['prompt-injection', 'obfuscation-detected', 'resource-prompt-injection'],
    '⚠️ Advisories & Blocklist': ['advisory-match'],
    '📐 Schema Scope': ['over-permission', 'vague-description'],
  };

  for (const [catName, rIds] of Object.entries(categoryRules)) {
    const matched = findings.filter(f => rIds.includes(f.ruleId));
    if (matched.length > 0) {
      const severities = matched.map(m => m.severity);
      const topSev = severities.includes('critical') ? 'CRITICAL' : severities.includes('high') ? 'HIGH' : severities.includes('medium') ? 'MEDIUM' : 'LOW';
      lines.push(`| ${catName} | ${matched.length} | ${topSev} |`);
    }
  }
  lines.push('');

  if (report.canaryObservations && report.canaryObservations.length > 0) {
    lines.push('### Runtime Canary Sandbox Observations');
    lines.push('');
    lines.push('| Tool | Probe Type | Status | Latency | Details |');
    lines.push('|---|---|---|---|---|');
    for (const c of report.canaryObservations) {
      lines.push(`| \`${c.toolName}\` | ${c.probeType} | **${c.status.toUpperCase()}** | ${c.latencyMs}ms | ${c.details} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Audit Findings');
  lines.push('');

  if (findings.length === 0) {
    lines.push('✅ **No security issues found.** All scanned tools adhere to declarative safety rules.');
  } else {
    findings.forEach((f, idx) => {
      lines.push(`### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}`);
      lines.push('');
      lines.push(`- **Target Tool:** \`${f.toolName}\``);
      lines.push(`- **Rule ID:** \`${f.ruleId}\``);
      if (f.toolFingerprint) {
        lines.push(`- **Tool Fingerprint:** \`${f.toolFingerprint}\``);
      }
      lines.push(`- **Severity:** \`${f.severity.toUpperCase()}\``);
      lines.push('');
      lines.push(`**Description:**  `);
      lines.push(f.description);
      lines.push('');
      lines.push(`**Evidence:**  `);
      lines.push('```');
      lines.push(f.evidence);
      lines.push('```');
      lines.push('');
      lines.push(`**Remediation:**  `);
      lines.push(f.remediation);
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  }

  lines.push('## Verification Badge');
  lines.push('');
  lines.push('Embed this badge in your repository README to display live verification status:');
  lines.push('');
  lines.push('```markdown');
  lines.push(badge.markdown);
  lines.push('```');
  lines.push('');
  lines.push('*Report generated deterministically by ScourMCP.*');

  return lines.join('\n');
}

/**
 * Trigger browser file download.
 */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
