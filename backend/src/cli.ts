#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { scanManifest, diffManifests, hardenManifest } from './scanner';
import type { Severity, Finding, ScanReport } from './scanner/types';

// ANSI styling helpers (works universally in modern terminals)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function printHelp() {
  console.log(`
${c.bold}${c.cyan}SkiMCP CLI${c.reset}
${c.dim}Deterministic, rule-based security auditing for MCP servers${c.reset}

${c.bold}USAGE:${c.reset}
  skimcp <command> [options]

${c.bold}COMMANDS:${c.reset}
  ${c.green}scan <path-or-url>${c.reset}       Audit an MCP manifest (JSON, YAML, JSONL, Claude config)
  ${c.green}diff <baseline> <target>${c.reset}  Compare baseline (v1) vs target (v2) for permission drift
  ${c.green}harden <path>${c.reset}             Sanitize manifest (strips prompt injections, clamps schemas)
  ${c.green}version${c.reset}                  Print version information

${c.bold}OPTIONS:${c.reset}
  ${c.yellow}--fail-on=<level>${c.reset}         Fail with exit code 1 if findings reach level (critical, high, medium, low)
  ${c.yellow}--format=<format>${c.reset}         Output format: table (default), json, markdown
  ${c.yellow}--output=<path>${c.reset}           Write output to file instead of stdout
  ${c.yellow}--include-prompts${c.reset}         Audit MCP resources and prompt templates for injection
  ${c.yellow}--help, -h${c.reset}                Show this help message

${c.bold}EXAMPLES:${c.reset}
  ${c.dim}# Scan a local Claude Desktop configuration and break CI on high or critical findings:${c.reset}
  skimcp scan ~/.config/Claude/claude_desktop_config.json --fail-on=high

  ${c.dim}# Compare baseline version against PR version for permission escalation:${c.reset}
  skimcp diff ./manifest-v1.json ./manifest-v2.json

  ${c.dim}# Automatically generate a hardened, sanitized manifest:${c.reset}
  skimcp harden ./manifest.json --output ./manifest-hardened.json
`);
}

function renderAsciiGauge(score: number): string {
  const width = 20;
  const filled = Math.min(width, Math.round((score / 100) * width));
  const empty = width - filled;

  let color = c.green;
  let level = 'LOW';
  if (score >= 80) {
    color = c.red;
    level = 'CRITICAL';
  } else if (score >= 50) {
    color = c.red;
    level = 'HIGH';
  } else if (score >= 20) {
    color = c.yellow;
    level = 'MEDIUM';
  }

  const bar = `[${color}${'█'.repeat(filled)}${c.dim}${'-'.repeat(empty)}${c.reset}]`;
  return `${bar} ${color}${score}/100 (${level})${c.reset}`;
}

async function readFileOrFetch(target: string): Promise<string> {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    const res = await fetch(target, { headers: { 'User-Agent': 'skimcp-cli' } });
    if (!res.ok) throw new Error(`HTTP fetch failed with status ${res.status}`);
    return await res.text();
  }
  const resolved = path.resolve(process.cwd(), target);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return fs.readFileSync(resolved, 'utf-8');
}

export async function runCli(args: string[]): Promise<number> {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    return 0;
  }

  const command = args[0];
  const failOnArg = args.find((a) => a.startsWith('--fail-on='));
  const failOn = (failOnArg ? failOnArg.split('=')[1] : null) as Severity | null;
  const formatArg = args.find((a) => a.startsWith('--format='));
  const format = formatArg ? formatArg.split('=')[1] : 'table';
  const outputArg = args.find((a) => a.startsWith('--output='));
  const outputPath = outputArg ? outputArg.split('=')[1] : null;
  const includePrompts = args.includes('--include-prompts');

  if (command === 'version' || args.includes('-v') || args.includes('--version')) {
    console.log('SkiMCP v0.1.0');
    return 0;
  }

  // ── SCAN COMMAND ──────────────────────────────────────────────────────────
  if (command === 'scan') {
    const target = args[1];
    if (!target) {
      console.error(`${c.red}Error:${c.reset} Please provide a manifest file path or URL to scan.`);
      return 2;
    }

    let content: string;
    try {
      content = await readFileOrFetch(target);
    } catch (err) {
      console.error(`${c.red}Error reading target:${c.reset}`, err instanceof Error ? err.message : err);
      return 2;
    }

    let report: ScanReport;
    try {
      report = scanManifest(content, { scanResourcesAndPrompts: includePrompts });
    } catch (err) {
      console.error(`${c.red}Scan parsing error:${c.reset}`, err instanceof Error ? err.message : err);
      return 2;
    }

    if (format === 'json') {
      const output = JSON.stringify(report, null, 2);
      if (outputPath) fs.writeFileSync(outputPath, output, 'utf-8');
      else console.log(output);
    } else if (format === 'markdown') {
      const md = `# MCP Security Audit Report\n\n- Manifest: \`${target}\`\n- Risk Score: **${report.summary.riskScore}/100 (${report.summary.overallRisk})**\n- Fingerprint: \`${report.manifestFingerprint}\`\n\n## Findings (${report.findings.length})\n\n` +
        report.findings.map(f => `### [${f.severity.toUpperCase()}] ${f.title} (${f.toolName})\n- Rule: \`${f.ruleId}\`\n- Evidence: \`${f.evidence}\`\n- Remediation: ${f.remediation}\n`).join('\n');
      if (outputPath) fs.writeFileSync(outputPath, md, 'utf-8');
      else console.log(md);
    } else {
      // Table formatting
      console.log(`\n${c.bold}🛡️  MCP Tool Manifest Risk Audit${c.reset}`);
      console.log(`${c.dim}Target:${c.reset} ${target}`);
      console.log(`${c.dim}SHA-256:${c.reset} ${report.manifestFingerprint}`);
      console.log(`${c.bold}Risk Score:${c.reset} ${renderAsciiGauge(report.summary.riskScore)}`);
      console.log(`${c.dim}Tools Declared:${c.reset} ${report.tools.length} | ${c.dim}Findings:${c.reset} ${report.findings.length}\n`);

      if (report.findings.length === 0) {
        console.log(`${c.green}${c.bold}✔ No dangerous patterns detected. Clean manifest!${c.reset}\n`);
      } else {
        console.log(`${c.bold}SECURITY FINDINGS:${c.reset}`);
        console.log('─'.repeat(80));
        for (const f of report.findings) {
          const sevColor = f.severity === 'critical' ? c.red : f.severity === 'high' ? c.red : f.severity === 'medium' ? c.yellow : c.green;
          console.log(` ${sevColor}${c.bold}[${f.severity.toUpperCase()}]${c.reset} ${c.bold}${f.title}${c.reset} in tool ${c.cyan}${f.toolName}${c.reset}`);
          console.log(`   ${c.dim}Rule:${c.reset} ${f.ruleId}`);
          console.log(`   ${c.dim}Evidence:${c.reset} ${f.evidence}`);
          console.log(`   ${c.dim}Remediation:${c.reset} ${f.remediation}`);
          console.log('─'.repeat(80));
        }
      }
    }

    // Gating check
    if (failOn && SEVERITY_WEIGHTS[failOn]) {
      const minWeight = SEVERITY_WEIGHTS[failOn];
      const hasFailingIssue = report.findings.some(f => SEVERITY_WEIGHTS[f.severity] >= minWeight);
      if (hasFailingIssue) {
        console.error(`${c.red}${c.bold}✖ CI/CD Gate Failed:${c.reset} Findings detected at or above threshold '${failOn}'.`);
        return 1;
      }
    }

    return 0;
  }

  // ── DIFF COMMAND ──────────────────────────────────────────────────────────
  if (command === 'diff') {
    const baseTarget = args[1];
    const newTarget = args[2];
    if (!baseTarget || !newTarget) {
      console.error(`${c.red}Error:${c.reset} Please provide baseline (v1) and target (v2) manifest file paths.`);
      return 2;
    }

    try {
      const baseContent = await readFileOrFetch(baseTarget);
      const newContent = await readFileOrFetch(newTarget);
      const diff = diffManifests(baseContent, newContent);

      if (format === 'json') {
        console.log(JSON.stringify(diff, null, 2));
      } else {
        console.log(`\n${c.bold}🔀 MCP Agent Permission Diff${c.reset}`);
        console.log(`${c.dim}Baseline (v1):${c.reset} ${baseTarget} (${diff.baselineScore}/100)`);
        console.log(`${c.dim}Target   (v2):${c.reset} ${newTarget} (${diff.targetScore}/100)`);

        const deltaColor = diff.riskDelta > 0 ? c.red : diff.riskDelta < 0 ? c.green : c.cyan;
        const deltaSign = diff.riskDelta > 0 ? `+${diff.riskDelta}` : `${diff.riskDelta}`;
        console.log(`${c.bold}Risk Delta:${c.reset} ${deltaColor}${deltaSign} (${diff.status.toUpperCase()})${c.reset}\n`);

        console.log(`Summary: ${c.green}+${diff.summary.addedCount} added${c.reset}, ${c.red}-${diff.summary.removedCount} removed${c.reset}, ${c.yellow}⚠ ${diff.summary.modifiedCount} modified (${diff.summary.escalatedCount} escalated)${c.reset}, ${c.dim}${diff.summary.unchangedCount} unchanged${c.reset}\n`);

        if (diff.toolsAdded.length > 0) {
          console.log(`${c.green}${c.bold}TOOLS ADDED:${c.reset}`);
          for (const t of diff.toolsAdded) console.log(`  + ${c.green}${t.name}${c.reset}: ${t.description || 'No description'}`);
        }

        if (diff.toolsRemoved.length > 0) {
          console.log(`${c.red}${c.bold}TOOLS REMOVED:${c.reset}`);
          for (const t of diff.toolsRemoved) console.log(`  - ${c.red}${t.name}${c.reset}`);
        }

        if (diff.toolsModified.length > 0) {
          console.log(`${c.yellow}${c.bold}TOOLS MODIFIED / ESCALATED:${c.reset}`);
          for (const m of diff.toolsModified) {
            const escTag = m.isEscalated ? `${c.red} [ESCALATED]${c.reset}` : '';
            console.log(`  * ${c.yellow}${m.name}${c.reset}${escTag}`);
            for (const ch of m.propertyChanges) {
              const chColor = ch.severity === 'escalated' ? c.red : c.dim;
              console.log(`    ${chColor}↳ ${ch.description}${c.reset}`);
            }
          }
        }
      }

      if (failOnArg && diff.status === 'escalated') {
        return 1;
      }
      return 0;
    } catch (err) {
      console.error(`${c.red}Diff error:${c.reset}`, err instanceof Error ? err.message : err);
      return 2;
    }
  }

  // ── HARDEN COMMAND ────────────────────────────────────────────────────────
  if (command === 'harden') {
    const target = args[1];
    if (!target) {
      console.error(`${c.red}Error:${c.reset} Please provide a manifest file path to harden.`);
      return 2;
    }

    try {
      const content = await readFileOrFetch(target);
      const hardened = hardenManifest(content);

      if (outputPath) {
        fs.writeFileSync(outputPath, JSON.stringify(hardened.hardenedManifest, null, 2), 'utf-8');
        console.log(`${c.green}✔ Hardened manifest saved to:${c.reset} ${outputPath}`);
      } else if (format === 'json') {
        console.log(JSON.stringify(hardened.hardenedManifest, null, 2));
      } else {
        console.log(`\n${c.bold}🛡️  Hardened Manifest Generated${c.reset}`);
        console.log(`Before Risk Score: ${c.red}${hardened.beforeScore}/100${c.reset}`);
        console.log(`After Risk Score:  ${c.green}${hardened.afterScore}/100${c.reset} (${c.green}-${hardened.scoreReduction} risk points${c.reset})\n`);
        console.log(`${c.bold}Applied Security Fixes (${hardened.changesApplied.length}):${c.reset}`);
        for (const ch of hardened.changesApplied) {
          console.log(`  ✔ [${c.cyan}${ch.toolName}${c.reset}] ${ch.description}`);
        }
      }
      return 0;
    } catch (err) {
      console.error(`${c.red}Hardening error:${c.reset}`, err instanceof Error ? err.message : err);
      return 2;
    }
  }

  console.error(`${c.red}Unknown command:${c.reset} ${command}`);
  printHelp();
  return 2;
}

if (process.argv[1] && process.argv[1].endsWith('cli.ts') || process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('skimcp')) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
