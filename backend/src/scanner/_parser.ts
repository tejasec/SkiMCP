import type { Manifest, ManifestTool } from './types';

/**
 * Parse and validate raw manifest input.
 * Accepts either `{ tools: [...] }` or a bare `[...]` array.
 * Throws a human-readable string on invalid input.
 */
export function _parseManifest(raw: unknown): ManifestTool[] {
  if (raw === null || raw === undefined) {
    throw 'Expected a JSON object with a "tools" array.';
  }

  // Accept bare array of tools
  if (Array.isArray(raw)) {
    return _validateTools(raw);
  }

  if (typeof raw !== 'object') {
    throw 'Expected a JSON object with a "tools" array.';
  }

  const obj = raw as Record<string, unknown>;

  // Accept { tools: [...] }
  if ('tools' in obj && Array.isArray(obj.tools)) {
    return _validateTools(obj.tools);
  }

  // Accept { result: { tools: [...] } } (some MCP responses wrap it)
  if (
    'result' in obj &&
    typeof obj.result === 'object' &&
    obj.result !== null &&
    'tools' in (obj.result as Record<string, unknown>) &&
    Array.isArray((obj.result as Record<string, unknown>).tools)
  ) {
    return _validateTools(
      (obj.result as Record<string, unknown>).tools as unknown[],
    );
  }

  throw 'Expected a JSON object with a "tools" array, or a bare array of tool objects.';
}

function _validateTools(arr: unknown[]): ManifestTool[] {
  if (arr.length === 0) {
    throw 'The tools array is empty — nothing to scan.';
  }

  return arr.map((item, i) => {
    if (typeof item !== 'object' || item === null) {
      throw `Tool at index ${i} is not an object.`;
    }
    const tool = item as Record<string, unknown>;
    if (typeof tool.name !== 'string' || tool.name.trim() === '') {
      throw `Tool at index ${i} is missing a valid "name" string.`;
    }
    return {
      name: tool.name as string,
      title: typeof tool.title === 'string' ? tool.title : undefined,
      description:
        typeof tool.description === 'string' ? tool.description : undefined,
      inputSchema:
        typeof tool.inputSchema === 'object' && tool.inputSchema !== null
          ? (tool.inputSchema as Record<string, unknown>)
          : undefined,
      outputSchema:
        typeof tool.outputSchema === 'object' && tool.outputSchema !== null
          ? (tool.outputSchema as Record<string, unknown>)
          : undefined,
      annotations:
        typeof tool.annotations === 'object' && tool.annotations !== null
          ? (tool.annotations as Record<string, unknown>)
          : undefined,
    };
  });
}
