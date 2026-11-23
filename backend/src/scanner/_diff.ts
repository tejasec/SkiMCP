import { scanManifest } from './index';
import type { ManifestTool, Finding, ScanReport } from './types';

export interface ToolPropertyChange {
  path: string;
  before: unknown;
  after: unknown;
  severity: 'escalated' | 'hardened' | 'neutral';
  description: string;
}

export interface ModifiedToolDiff {
  name: string;
  baselineFingerprint: string;
  targetFingerprint: string;
  isEscalated: boolean;
  propertyChanges: ToolPropertyChange[];
  descriptionChanged: boolean;
  schemaChanged: boolean;
  baselineTool: ManifestTool;
  targetTool: ManifestTool;
}

export interface ManifestDiffReport {
  baselineFingerprint: string;
  targetFingerprint: string;
  baselineScore: number;
  targetScore: number;
  riskDelta: number;
  status: 'escalated' | 'hardened' | 'neutral';
  summary: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    escalatedCount: number;
    unchangedCount: number;
  };
  toolsAdded: ManifestTool[];
  toolsRemoved: ManifestTool[];
  toolsModified: ModifiedToolDiff[];
  toolsUnchanged: string[];
  findingsDelta: {
    newFindings: Finding[];
    resolvedFindings: Finding[];
  };
}

/**
 * Compare two MCP manifest definitions (Baseline vs Target) and identify
 * added tools, removed tools, description changes, schema relaxations,
 * permission escalations, and the net risk score delta.
 */
export function diffManifests(
  baselineRaw: unknown,
  targetRaw: unknown,
): ManifestDiffReport {
  const baselineReport: ScanReport = scanManifest(baselineRaw, {
    scanResourcesAndPrompts: true,
  });
  const targetReport: ScanReport = scanManifest(targetRaw, {
    scanResourcesAndPrompts: true,
  });

  const baselineToolsMap = new Map<string, ManifestTool>();
  for (const t of baselineReport.tools) {
    baselineToolsMap.set(t.name, t);
  }

  const targetToolsMap = new Map<string, ManifestTool>();
  for (const t of targetReport.tools) {
    targetToolsMap.set(t.name, t);
  }

  const toolsAdded: ManifestTool[] = [];
  const toolsRemoved: ManifestTool[] = [];
  const toolsModified: ModifiedToolDiff[] = [];
  const toolsUnchanged: string[] = [];

  // 1. Identify added and modified tools
  for (const [name, targetTool] of targetToolsMap.entries()) {
    const baseTool = baselineToolsMap.get(name);
    if (!baseTool) {
      toolsAdded.push(targetTool);
    } else if (baseTool.toolFingerprint === targetTool.toolFingerprint) {
      toolsUnchanged.push(name);
    } else {
      // Tool modified! Compare properties and schema
      const propertyChanges: ToolPropertyChange[] = [];
      let isEscalated = false;
      let descriptionChanged = false;
      let schemaChanged = false;

      // Description comparison
      if ((baseTool.description || '') !== (targetTool.description || '')) {
        descriptionChanged = true;
        const baseDesc = baseTool.description || '';
        const targetDesc = targetTool.description || '';

        const suspiciousWords = [
          'important',
          'system',
          'admin',
          'shell',
          'exec',
          'override',
          'bypass',
          'secret',
        ];
        const hasNewSuspiciousWord = suspiciousWords.some(
          (w) =>
            !baseDesc.toLowerCase().includes(w) &&
            targetDesc.toLowerCase().includes(w),
        );

        propertyChanges.push({
          path: 'description',
          before: baseDesc,
          after: targetDesc,
          severity: hasNewSuspiciousWord ? 'escalated' : 'neutral',
          description: hasNewSuspiciousWord
            ? 'Description rewritten with sensitive or trigger keywords'
            : 'Description text modified',
        });

        if (hasNewSuspiciousWord) isEscalated = true;
      }

      // InputSchema comparison
      const baseSchema = baseTool.inputSchema || {};
      const targetSchema = targetTool.inputSchema || {};

      if (JSON.stringify(baseSchema) !== JSON.stringify(targetSchema)) {
        schemaChanged = true;

        // Check additionalProperties relaxed
        const baseAddProps = (baseSchema as Record<string, unknown>)
          .additionalProperties;
        const targetAddProps = (targetSchema as Record<string, unknown>)
          .additionalProperties;
        if (baseAddProps === false && targetAddProps !== false) {
          isEscalated = true;
          propertyChanges.push({
            path: 'inputSchema.additionalProperties',
            before: false,
            after: targetAddProps ?? 'undefined (allowed)',
            severity: 'escalated',
            description:
              'additionalProperties restriction removed, allowing arbitrary input fields',
          });
        }

        // Check properties added/changed
        const baseProps =
          ((baseSchema as Record<string, unknown>).properties as Record<
            string,
            unknown
          >) || {};
        const targetProps =
          ((targetSchema as Record<string, unknown>).properties as Record<
            string,
            unknown
          >) || {};

        for (const [propName, targetPropVal] of Object.entries(targetProps)) {
          if (!baseProps[propName]) {
            const isRiskyParam =
              /path|file|dir|command|cmd|exec|url|host|token|key|secret/i.test(
                propName,
              );
            if (isRiskyParam) isEscalated = true;
            propertyChanges.push({
              path: `inputSchema.properties.${propName}`,
              before: undefined,
              after: targetPropVal,
              severity: isRiskyParam ? 'escalated' : 'neutral',
              description: `New parameter declared: "${propName}"${
                isRiskyParam ? ' (access-sensitive parameter)' : ''
              }`,
            });
          }
        }

        for (const propName of Object.keys(baseProps)) {
          if (!targetProps[propName]) {
            propertyChanges.push({
              path: `inputSchema.properties.${propName}`,
              before: baseProps[propName],
              after: undefined,
              severity: 'neutral',
              description: `Parameter removed: "${propName}"`,
            });
          }
        }
      }

      // Check if target tool has more findings than baseline tool
      const baseToolFindings = baselineReport.findings.filter(
        (f) => f.toolName === name,
      );
      const targetToolFindings = targetReport.findings.filter(
        (f) => f.toolName === name,
      );
      if (targetToolFindings.length > baseToolFindings.length) {
        isEscalated = true;
      }

      toolsModified.push({
        name,
        baselineFingerprint: baseTool.toolFingerprint || '',
        targetFingerprint: targetTool.toolFingerprint || '',
        isEscalated,
        propertyChanges,
        descriptionChanged,
        schemaChanged,
        baselineTool: baseTool,
        targetTool,
      });
    }
  }

  // 2. Identify removed tools
  for (const [name, baseTool] of baselineToolsMap.entries()) {
    if (!targetToolsMap.has(name)) {
      toolsRemoved.push(baseTool);
    }
  }

  // 3. Findings delta
  const baseFindingKeys = new Set(
    baselineReport.findings.map(
      (f) => `${f.ruleId}:${f.toolName}:${f.evidence.slice(0, 30)}`,
    ),
  );
  const targetFindingKeys = new Set(
    targetReport.findings.map(
      (f) => `${f.ruleId}:${f.toolName}:${f.evidence.slice(0, 30)}`,
    ),
  );

  const newFindings = targetReport.findings.filter(
    (f) => !baseFindingKeys.has(`${f.ruleId}:${f.toolName}:${f.evidence.slice(0, 30)}`),
  );
  const resolvedFindings = baselineReport.findings.filter(
    (f) =>
      !targetFindingKeys.has(`${f.ruleId}:${f.toolName}:${f.evidence.slice(0, 30)}`),
  );

  const riskDelta =
    targetReport.summary.riskScore - baselineReport.summary.riskScore;
  const escalatedCount = toolsModified.filter((m) => m.isEscalated).length;

  let status: 'escalated' | 'hardened' | 'neutral' = 'neutral';
  if (riskDelta > 0 || escalatedCount > 0) {
    status = 'escalated';
  } else if (riskDelta < 0) {
    status = 'hardened';
  }

  return {
    baselineFingerprint: baselineReport.manifestFingerprint,
    targetFingerprint: targetReport.manifestFingerprint,
    baselineScore: baselineReport.summary.riskScore,
    targetScore: targetReport.summary.riskScore,
    riskDelta,
    status,
    summary: {
      addedCount: toolsAdded.length,
      removedCount: toolsRemoved.length,
      modifiedCount: toolsModified.length,
      escalatedCount,
      unchangedCount: toolsUnchanged.length,
    },
    toolsAdded,
    toolsRemoved,
    toolsModified,
    toolsUnchanged,
    findingsDelta: {
      newFindings,
      resolvedFindings,
    },
  };
}
