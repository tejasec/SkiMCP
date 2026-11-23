import crypto from 'node:crypto';
import type { ManifestTool } from './types';

/**
 * Deterministically serialize a JavaScript value to canonical JSON (RFC 8785 inspired).
 * - Object keys are sorted lexicographically.
 * - Whitespace is omitted.
 * - Undefined values, functions, and symbols in objects are omitted.
 * - Arrays preserve element order.
 */
export function canonicalJsonStringify(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return '';

  const type = typeof val;

  if (type === 'string') {
    return JSON.stringify(val);
  }

  if (type === 'number') {
    if (!Number.isFinite(val)) {
      throw new Error(`Cannot canonically serialize non-finite number: ${val}`);
    }
    return String(val);
  }

  if (type === 'boolean') {
    return val ? 'true' : 'false';
  }

  if (Array.isArray(val)) {
    const items = val.map((item) => {
      const serialized = canonicalJsonStringify(item);
      return serialized === '' ? 'null' : serialized;
    });
    return `[${items.join(',')}]`;
  }

  if (type === 'object') {
    const obj = val as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const pairs: string[] = [];

    for (const key of sortedKeys) {
      const v = obj[key];
      // Skip undefined or functions in objects
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol') {
        continue;
      }
      pairs.push(`${JSON.stringify(key)}:${canonicalJsonStringify(v)}`);
    }

    return `{${pairs.join(',')}}`;
  }

  throw new Error(`Cannot canonically serialize unsupported type: ${type}`);
}

/**
 * Compute SHA-256 canonical hash of any arbitrary data structure.
 */
export function sha256Canonical(val: unknown): string {
  const canonical = canonicalJsonStringify(val);
  const hash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  return `sha256:${hash}`;
}

/**
 * Compute canonical SHA-256 fingerprint for a single tool schema.
 * Omits any prior `toolFingerprint` field to avoid self-reference.
 */
export function computeToolFingerprint(tool: ManifestTool): string {
  const normalizedTool: Record<string, unknown> = {
    name: tool.name,
    title: tool.title ?? null,
    description: tool.description ?? null,
    inputSchema: tool.inputSchema ?? {},
    outputSchema: tool.outputSchema ?? null,
    annotations: tool.annotations ?? null,
    server: tool.server ?? null,
    command: tool.command ?? null,
    args: tool.args ?? null,
    env: tool.env ?? null,
  };

  return sha256Canonical(normalizedTool);
}

/**
 * Compute canonical SHA-256 fingerprint for the full manifest.
 * Sorts tools deterministically by tool name so equivalent tool collections
 * produce the same manifest fingerprint regardless of tool order in the source.
 */
export function computeManifestFingerprint(tools: ManifestTool[]): string {
  // Sort tools by name to make manifest fingerprint order-invariant
  const sortedTools = [...tools]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => {
      const fp = t.toolFingerprint ?? computeToolFingerprint(t);
      return {
        name: t.name,
        toolFingerprint: fp,
      };
    });

  return sha256Canonical(sortedTools);
}
