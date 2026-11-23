import YAML from 'yaml';
import type {
  ManifestTool,
  ManifestResource,
  ManifestPrompt,
  ParsedManifest,
} from './types';

/**
 * Parse and validate raw manifest input from various sources and formats:
 * - JSON string or parsed object: `{ tools: [...] }`, `[...]`, `{ result: { tools: [...] } }`
 * - Claude Desktop Config: `{ mcpServers: { [name]: { command, args, env } } }`
 * - JSON Lines (`.jsonl`): One JSON object per line
 * - YAML string: Multi-line YAML defining tools or mcpServers
 * - Optional `resources` and `prompts` arrays
 *
 * @returns ParsedManifest with validated tools, resources, and prompts
 * @throws string — human-readable validation error
 */
export function _parseManifest(raw: unknown): ParsedManifest {
  if (raw === null || raw === undefined) {
    throw 'Manifest input is empty. Expected a JSON, JSONL, YAML manifest, or Claude Desktop config.';
  }

  let parsed: unknown = raw;

  // If input is a string, detect format (JSON, JSONL, YAML)
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw 'Manifest text is empty — nothing to scan.';
    }

    parsed = _parseTextPayload(trimmed);
  }

  return _normalizeParsed(parsed);
}

/**
 * Attempt to parse text payload as JSON, JSONL, or YAML.
 */
function _parseTextPayload(text: string): unknown {
  // 1. Try standard JSON first
  try {
    return JSON.parse(text);
  } catch (jsonErr) {
    // If not JSON, try JSON Lines (.jsonl)
    const jsonlResult = _tryParseJsonLines(text);
    if (jsonlResult) {
      return jsonlResult;
    }

    // Try YAML
    try {
      const yamlParsed = YAML.parse(text);
      if (yamlParsed && typeof yamlParsed === 'object') {
        return yamlParsed;
      }
    } catch (yamlErr) {
      // If neither worked, report informative syntax error
      const jsonMessage = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
      const yamlMessage = yamlErr instanceof Error ? yamlErr.message : String(yamlErr);
      throw `Failed to parse manifest: Not valid JSON (${jsonMessage}) nor valid YAML (${yamlMessage}).`;
    }

    throw 'Unrecognized manifest format. Please provide valid JSON, JSON Lines (.jsonl), or YAML.';
  }
}

/**
 * Try parsing text as JSON Lines (each line is a valid JSON object).
 */
function _tryParseJsonLines(text: string): unknown | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

  // Needs at least 2 lines or a single line that wasn't full-file JSON
  if (lines.length < 1) return null;

  const collectedTools: unknown[] = [];
  let isJsonL = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      const parsedLine = JSON.parse(line);
      if (typeof parsedLine !== 'object' || parsedLine === null) {
        isJsonL = false;
        break;
      }
      if (Array.isArray(parsedLine)) {
        collectedTools.push(...parsedLine);
      } else if ('tools' in parsedLine && Array.isArray((parsedLine as Record<string, unknown>).tools)) {
        collectedTools.push(...((parsedLine as Record<string, unknown>).tools as unknown[]));
      } else if ('name' in parsedLine) {
        collectedTools.push(parsedLine);
      } else {
        isJsonL = false;
        break;
      }
    } catch {
      isJsonL = false;
      break;
    }
  }

  if (isJsonL && collectedTools.length > 0) {
    return { tools: collectedTools };
  }

  return null;
}

/**
 * Normalize and validate parsed object into ParsedManifest.
 */
function _normalizeParsed(obj: unknown): ParsedManifest {
  if (typeof obj !== 'object' || obj === null) {
    throw 'Expected an object or array representing an MCP manifest or Claude Desktop config.';
  }

  // Bare array of tools
  if (Array.isArray(obj)) {
    return {
      tools: _validateTools(obj),
    };
  }

  const record = obj as Record<string, unknown>;

  // Check for wrapped manifest: { manifest: ... }
  if ('manifest' in record && record.manifest && typeof record.manifest === 'object') {
    return _normalizeParsed(record.manifest);
  }

  // Check for Claude Desktop config: { mcpServers: { ... } } or { servers: { ... } }
  if ('mcpServers' in record && typeof record.mcpServers === 'object' && record.mcpServers !== null) {
    return _parseClaudeDesktopConfig(record.mcpServers as Record<string, unknown>);
  }

  // Wrapped MCP response: { result: { tools: [...] } }
  if (
    'result' in record &&
    typeof record.result === 'object' &&
    record.result !== null
  ) {
    const resultObj = record.result as Record<string, unknown>;
    const tools = 'tools' in resultObj && Array.isArray(resultObj.tools)
      ? _validateTools(resultObj.tools)
      : [];
    const resources = 'resources' in resultObj && Array.isArray(resultObj.resources)
      ? _validateResources(resultObj.resources)
      : undefined;
    const prompts = 'prompts' in resultObj && Array.isArray(resultObj.prompts)
      ? _validatePrompts(resultObj.prompts)
      : undefined;

    if (tools.length === 0 && (!resources || resources.length === 0) && (!prompts || prompts.length === 0)) {
      throw 'MCP "result" object did not contain any valid "tools", "resources", or "prompts" arrays.';
    }

    return { tools, resources, prompts };
  }

  // Standard MCP tools manifest: { tools: [...] }
  if ('tools' in record && Array.isArray(record.tools)) {
    const tools = _validateTools(record.tools);
    const resources = 'resources' in record && Array.isArray(record.resources)
      ? _validateResources(record.resources)
      : undefined;
    const prompts = 'prompts' in record && Array.isArray(record.prompts)
      ? _validatePrompts(record.prompts)
      : undefined;

    return { tools, resources, prompts };
  }

  throw 'Expected a JSON/YAML object with a "tools" array, an array of tools, or a Claude Desktop config with "mcpServers".';
}

/**
 * Parse claude_desktop_config.json mcpServers dictionary.
 * Extracts declared servers, executable commands, arguments, and environment variables.
 */
function _parseClaudeDesktopConfig(
  servers: Record<string, unknown>,
): ParsedManifest {
  const serverKeys = Object.keys(servers);
  if (serverKeys.length === 0) {
    throw 'Claude Desktop config has empty "mcpServers" — no servers configured.';
  }

  const tools: ManifestTool[] = [];

  for (const serverName of serverKeys) {
    const s = servers[serverName];
    if (typeof s !== 'object' || s === null) {
      throw `Claude Desktop server "${serverName}" is not an object.`;
    }

    const conf = s as Record<string, unknown>;
    const command = typeof conf.command === 'string' ? conf.command : undefined;
    const args = Array.isArray(conf.args)
      ? conf.args.map((a) => String(a))
      : undefined;
    const env =
      typeof conf.env === 'object' && conf.env !== null
        ? (conf.env as Record<string, string>)
        : undefined;
    const url = typeof conf.url === 'string' ? conf.url : undefined;

    // If server configuration defines tools directly, extract them
    if ('tools' in conf && Array.isArray(conf.tools) && conf.tools.length > 0) {
      for (const t of _validateTools(conf.tools)) {
        tools.push({
          ...t,
          server: serverName,
          command,
          args,
          env,
        });
      }
      continue;
    }

    // Synthesize an auditable ManifestTool representation for this declared server
    const cmdStr = [command, ...(args ?? [])].filter(Boolean).join(' ');
    const envKeys = env ? Object.keys(env) : [];
    const envDetail = env
      ? Object.entries(env)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      : 'None';

    const description = [
      `MCP server "${serverName}".`,
      cmdStr ? `Executes: ${cmdStr}.` : '',
      url ? `Connects to endpoint: ${url}.` : '',
      envKeys.length > 0 ? `Environment variables: ${envDetail}.` : 'No environment variables declared.',
    ]
      .filter(Boolean)
      .join(' ');

    const properties: Record<string, unknown> = {};
    if (command) {
      properties.command = {
        type: 'string',
        description: `Executable command: ${command}`,
      };
    }
    if (args && args.length > 0) {
      properties.args = {
        type: 'array',
        description: `Command arguments: ${args.join(' ')}`,
      };
    }
    if (env) {
      for (const [k, v] of Object.entries(env)) {
        properties[k] = {
          type: 'string',
          description: `Environment variable: ${k}=${v}`,
        };
      }
    }

    tools.push({
      name: serverName,
      title: `MCP Server: ${serverName}`,
      description,
      inputSchema: {
        type: 'object',
        properties,
      },
      server: serverName,
      command,
      args,
      env,
    });
  }

  return { tools };
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

function _validateResources(arr: unknown[]): ManifestResource[] {
  return arr.map((item, i) => {
    if (typeof item !== 'object' || item === null) {
      throw `Resource at index ${i} is not an object.`;
    }
    const r = item as Record<string, unknown>;
    return {
      uri: typeof r.uri === 'string' ? r.uri : '',
      name: typeof r.name === 'string' ? r.name : `resource_${i}`,
      description: typeof r.description === 'string' ? r.description : undefined,
      mimeType: typeof r.mimeType === 'string' ? r.mimeType : undefined,
    };
  });
}

function _validatePrompts(arr: unknown[]): ManifestPrompt[] {
  return arr.map((item, i) => {
    if (typeof item !== 'object' || item === null) {
      throw `Prompt at index ${i} is not an object.`;
    }
    const p = item as Record<string, unknown>;
    return {
      name: typeof p.name === 'string' ? p.name : `prompt_${i}`,
      description: typeof p.description === 'string' ? p.description : undefined,
      arguments: Array.isArray(p.arguments)
        ? p.arguments.map((arg) => {
            const a = arg as Record<string, unknown>;
            return {
              name: typeof a.name === 'string' ? a.name : '',
              description: typeof a.description === 'string' ? a.description : undefined,
              required: typeof a.required === 'boolean' ? a.required : undefined,
            };
          })
        : undefined,
    };
  });
}
