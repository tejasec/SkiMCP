import type { ManifestTool, Finding } from '../types';
import advisoriesData from '../../data/advisories.json';

export interface AdvisoryItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  toolName?: string;
  matchType: 'name' | 'pattern' | 'fingerprint';
  pattern?: string;
  fingerprint?: string;
  reportedDate?: string;
  reporter?: string;
  cve?: string;
}

const advisories = advisoriesData as AdvisoryItem[];

/**
 * Checks if a tool matches any known malicious tool advisories or community blocklists.
 */
export function checkAdvisoryMatch(tool: ManifestTool): Finding[] {
  const findings: Finding[] = [];
  const toolNameLower = tool.name.trim().toLowerCase();
  const desc = tool.description || '';
  const schemaStr = tool.inputSchema ? JSON.stringify(tool.inputSchema) : '';

  for (const adv of advisories) {
    let matched = false;
    let evidence = '';

    if (adv.matchType === 'name' && adv.toolName) {
      if (toolNameLower === adv.toolName.toLowerCase()) {
        matched = true;
        evidence = `Tool name "${tool.name}" matches known security advisory ${adv.id} (${adv.title})`;
      }
    } else if (adv.matchType === 'pattern' && adv.pattern) {
      const regex = new RegExp(adv.pattern, 'i');
      if (regex.test(desc) || regex.test(schemaStr)) {
        matched = true;
        evidence = `Content matches advisory signature ${adv.id}: /${adv.pattern}/`;
      }
    } else if (adv.matchType === 'fingerprint' && adv.fingerprint && tool.toolFingerprint) {
      if (tool.toolFingerprint === adv.fingerprint) {
        matched = true;
        evidence = `Tool SHA-256 fingerprint matches blocklist entry ${adv.id}`;
      }
    }

    if (matched) {
      findings.push({
        ruleId: 'advisory-match',
        severity: adv.severity,
        toolName: tool.name,
        title: `Community Advisory Match: ${adv.id} - ${adv.title}`,
        description: adv.description,
        evidence,
        remediation: `Remove or isolate tool "${tool.name}". Refer to advisory ${adv.id}${adv.cve ? ` (${adv.cve})` : ''} reported by ${adv.reporter || 'community'} on ${adv.reportedDate || 'recent date'}.`,
        toolFingerprint: tool.toolFingerprint,
      });
    }
  }

  return findings;
}
