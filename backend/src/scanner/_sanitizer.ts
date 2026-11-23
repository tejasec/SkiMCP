import { scanManifest } from './index';
import { _parseManifest } from './_parser';
import type { ManifestTool, ManifestResource, ManifestPrompt } from './types';

export interface HardeningChange {
  toolName: string;
  type:
    | 'prompt_injection_removed'
    | 'obfuscation_removed'
    | 'schema_clamped'
    | 'path_constraint_added'
    | 'required_enforced';
  description: string;
}

export interface HardenedManifestResult {
  hardenedManifest: {
    tools: ManifestTool[];
    resources?: ManifestResource[];
    prompts?: ManifestPrompt[];
  };
  changesApplied: HardeningChange[];
  beforeScore: number;
  afterScore: number;
  scoreReduction: number;
  beforeFingerprint: string;
  afterFingerprint: string;
}

const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u200E\u200F\u2060]/g;
const BIDI_REGEX = /[\u202A-\u202E\u2066-\u2069]/g;
const PROMPT_INJECTION_TAGS =
  /<(?:important|system|admin|override|instruction|developer)[^>]*>[\s\S]*?<\/(?:important|system|admin|override|instruction|developer)>/gi;
const IMPERATIVE_PHRASES =
  /\b(?:ignore previous instructions|disregard previous|do not mention this to the user|exfiltrate|secretly send|bypass security)\b[\s\S]*?(?=[.!?\n]|$)/gi;

/**
 * Hardens an MCP tool manifest by removing dangerous prompt injection and
 * obfuscation patterns, clamping loose schema definitions, and applying
 * least-privilege constraints.
 */
export function hardenManifest(rawManifest: unknown): HardenedManifestResult {
  const beforeReport = scanManifest(rawManifest, {
    scanResourcesAndPrompts: true,
  });
  const { tools, resources, prompts } = _parseManifest(rawManifest);

  const changesApplied: HardeningChange[] = [];
  const hardenedTools: ManifestTool[] = JSON.parse(JSON.stringify(tools));

  for (const tool of hardenedTools) {
    // 1. Sanitize description
    if (tool.description) {
      let desc = tool.description;

      if (ZERO_WIDTH_REGEX.test(desc) || BIDI_REGEX.test(desc)) {
        desc = desc.replace(ZERO_WIDTH_REGEX, '').replace(BIDI_REGEX, '');
        changesApplied.push({
          toolName: tool.name,
          type: 'obfuscation_removed',
          description:
            'Stripped zero-width Unicode steganography characters and BiDi overrides from description',
        });
      }

      if (PROMPT_INJECTION_TAGS.test(desc) || IMPERATIVE_PHRASES.test(desc)) {
        desc = desc
          .replace(PROMPT_INJECTION_TAGS, '')
          .replace(IMPERATIVE_PHRASES, '')
          .trim();
        changesApplied.push({
          toolName: tool.name,
          type: 'prompt_injection_removed',
          description:
            'Sanitized covert imperative prompt injection directives and fake XML tags',
        });
      }

      tool.description = desc;
    }

    // 2. Harden schema constraints
    if (tool.inputSchema && typeof tool.inputSchema === 'object') {
      const schema = tool.inputSchema as Record<string, unknown>;

      // Clamp additionalProperties
      if (schema.additionalProperties !== false) {
        schema.additionalProperties = false;
        changesApplied.push({
          toolName: tool.name,
          type: 'schema_clamped',
          description:
            'Enforced "additionalProperties: false" to eliminate unrestricted parameter injection',
        });
      }

      // Constrain filesystem paths with safe regex
      if (schema.properties && typeof schema.properties === 'object') {
        const props = schema.properties as Record<string, Record<string, unknown>>;
        for (const [propKey, propDef] of Object.entries(props)) {
          if (
            /path|file|dir|folder/i.test(propKey) &&
            propDef.type === 'string' &&
            !propDef.pattern &&
            !propDef.enum
          ) {
            propDef.pattern = '^[a-zA-Z0-9_\\-\\./]+$';
            changesApplied.push({
              toolName: tool.name,
              type: 'path_constraint_added',
              description: `Added strict regex validation pattern ^[a-zA-Z0-9_\\-\\./]+$ to parameter "${propKey}"`,
            });
          }
        }
      }

      // Enforce required fields for destructive operations
      if (
        /delete|remove|write|exec|eval|drop|update|push/i.test(tool.name) &&
        schema.properties &&
        typeof schema.properties === 'object'
      ) {
        const propKeys = Object.keys(schema.properties);
        const existingReq = Array.isArray(schema.required)
          ? (schema.required as string[])
          : [];
        const missing = propKeys.filter((k) => !existingReq.includes(k));
        if (missing.length > 0) {
          schema.required = [...existingReq, ...missing];
          changesApplied.push({
            toolName: tool.name,
            type: 'required_enforced',
            description: `Enforced non-empty required properties [${missing.join(
              ', ',
            )}] on action tool`,
          });
        }
      }
    }
  }

  // Sanitize resources and prompts if present
  let hardenedResources = resources;
  if (resources && Array.isArray(resources)) {
    hardenedResources = resources.map((r) => ({
      ...r,
      description: r.description
        ? r.description
            .replace(ZERO_WIDTH_REGEX, '')
            .replace(PROMPT_INJECTION_TAGS, '')
        : r.description,
    }));
  }

  const hardenedManifest = {
    tools: hardenedTools,
    resources: hardenedResources,
    prompts,
  };

  const afterReport = scanManifest(hardenedManifest, {
    scanResourcesAndPrompts: true,
  });

  return {
    hardenedManifest,
    changesApplied,
    beforeScore: beforeReport.summary.riskScore,
    afterScore: afterReport.summary.riskScore,
    scoreReduction: Math.max(
      0,
      beforeReport.summary.riskScore - afterReport.summary.riskScore,
    ),
    beforeFingerprint: beforeReport.manifestFingerprint,
    afterFingerprint: afterReport.manifestFingerprint,
  };
}
