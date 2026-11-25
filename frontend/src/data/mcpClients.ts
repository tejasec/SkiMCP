export type McpClientCategory = 'desktop' | 'ide' | 'cli';

export type McpClientTab = 'all' | McpClientCategory;

export type McpClientOs = 'all' | 'windows' | 'linux' | 'macos';

export type McpConfigFormat = 'JSON' | 'JSON5' | 'YAML' | 'TOML' | 'YAML/JSON';

export interface McpConfigPath {
  label?: string;
  path: string;
  copyable?: boolean;
}

export interface McpClientEntry {
  id: string;
  name: string;
  category: McpClientCategory;
  globalPath: string | McpConfigPath[];
  projectPath?: string | McpConfigPath[];
  format: McpConfigFormat;
  rootKey: string;
  priority: number;
  supportedOs?: Array<'windows' | 'linux' | 'macos'>;
}

export const INITIAL_CLIENT_COUNT = 4;
export const CLIENT_STEP_SIZE = 4;

export const MCP_CLIENTS: McpClientEntry[] = [
  // ── Desktop Clients (desktop) — Ordered Windows, Linux, macOS ───────
  {
    id: 'claude-desktop-windows',
    name: 'Claude Desktop (Windows)',
    category: 'desktop',
    globalPath: '%APPDATA%\\Claude\\claude_desktop_config.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 1,
    supportedOs: ['windows'],
  },
  {
    id: 'claude-desktop-linux',
    name: 'Claude Desktop (Linux)',
    category: 'desktop',
    globalPath: '~/.config/Claude/claude_desktop_config.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 2,
    supportedOs: ['linux'],
  },
  {
    id: 'claude-desktop-macos',
    name: 'Claude Desktop (macOS)',
    category: 'desktop',
    globalPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 3,
    supportedOs: ['macos'],
  },
  {
    id: 'lm-studio',
    name: 'LM Studio',
    category: 'desktop',
    globalPath: '~/.lmstudio/mcp.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 4,
  },
  {
    id: 'devin-desktop',
    name: 'Devin Desktop (Windsurf Next)',
    category: 'desktop',
    globalPath: [
      { label: 'Win', path: '%APPDATA%\\devin\\mcp_config.json' },
      { label: 'Linux/macOS', path: '~/.config/devin/mcp_config.json' },
    ],
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 5,
  },

  // ── IDEs & Editor Extensions (ide) ──────────────────────────────────
  {
    id: 'cursor-ide',
    name: 'Cursor IDE',
    category: 'ide',
    globalPath: '~/.cursor/mcp.json',
    projectPath: '.cursor/mcp.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 1,
  },
  {
    id: 'vscode-copilot',
    name: 'VS Code (Copilot)',
    category: 'ide',
    globalPath: [
      { label: 'Win', path: '%APPDATA%\\Code\\User\\mcp.json' },
      { label: 'Linux', path: '~/.config/Code/User/mcp.json' },
      { label: 'macOS', path: '~/Library/Application Support/Code/User/mcp.json' },
    ],
    projectPath: [
      { path: '.vscode/mcp.json' },
      { label: 'alt', path: '.mcp.json' },
    ],
    format: 'JSON',
    rootKey: 'servers',
    priority: 2,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    category: 'ide',
    globalPath: '~/.codeium/windsurf/mcp_config.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 3,
  },
  {
    id: 'cline',
    name: 'Cline',
    category: 'ide',
    globalPath: [
      { label: 'VS Code globalStorage', path: 'cline_mcp_settings.json' },
    ],
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 4,
  },
  {
    id: 'roo-code',
    name: 'Roo Code',
    category: 'ide',
    globalPath: [
      { label: 'VS Code globalStorage', path: 'mcp_settings.json' },
    ],
    projectPath: '.roo/mcp.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 5,
  },
  {
    id: 'zed',
    name: 'Zed',
    category: 'ide',
    globalPath: [
      { label: 'Win', path: '%APPDATA%\\Zed\\settings.json' },
      { label: 'Linux/macOS', path: '~/.config/zed/settings.json' },
    ],
    format: 'JSON',
    rootKey: 'context_servers',
    priority: 6,
  },
  {
    id: 'continue-dev',
    name: 'Continue.dev',
    category: 'ide',
    globalPath: [
      { path: '~/.continue/config.yaml' },
      { label: 'alt', path: '~/.continue/config.json' },
    ],
    projectPath: '.continue/mcpServers/*.yaml',
    format: 'YAML/JSON',
    rootKey: 'mcpServers (array)',
    priority: 7,
  },
  {
    id: 'kiro-amazon-q',
    name: 'Kiro / Amazon Q',
    category: 'ide',
    globalPath: [
      { path: '~/.kiro/settings/mcp.json' },
      { label: 'legacy', path: '~/.aws/amazonq/mcp.json' },
    ],
    projectPath: '.kiro/settings/mcp.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 8,
  },
  {
    id: 'antigravity-ide',
    name: 'Antigravity IDE',
    category: 'ide',
    globalPath: '~/.gemini/config/mcp_config.json',
    projectPath: '.agents/mcp_config.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 9,
  },
  {
    id: 'kilo-code',
    name: 'Kilo Code',
    category: 'ide',
    globalPath: [
      { label: 'Extension', path: 'mcp_settings.json' },
    ],
    projectPath: '.kilocode/mcp.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 10,
  },
  {
    id: 'jetbrains-ai',
    name: 'JetBrains (AI Assistant / Junie)',
    category: 'ide',
    globalPath: [
      { label: 'IDE Settings', path: 'Tools > AI Assistant > MCP', copyable: false },
    ],
    projectPath: '.junie/mcp/mcp.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 11,
  },
  {
    id: 'trae-augment-vs2022',
    name: 'Trae / Augment Code / Visual Studio 2022',
    category: 'ide',
    globalPath: [
      { path: 'In-app MCP JSON settings', copyable: false },
    ],
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 12,
  },

  // ── Local CLI & Terminal (cli) ──────────────────────────────────────
  {
    id: 'claude-code',
    name: 'Claude Code',
    category: 'cli',
    globalPath: '~/.claude.json',
    projectPath: '.mcp.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 1,
  },
  {
    id: 'openai-codex',
    name: 'OpenAI Codex',
    category: 'cli',
    globalPath: '~/.codex/config.toml',
    projectPath: '.codex/config.toml',
    format: 'TOML',
    rootKey: '[mcp_servers.<name>]',
    priority: 2,
  },
  {
    id: 'antigravity-agy',
    name: 'Antigravity - agy',
    category: 'cli',
    globalPath: [
      { path: '~/.gemini/antigravity/mcp_config.json' },
      { label: 'settings', path: '~/.gemini/settings.json' },
    ],
    projectPath: [
      { path: '.agents/mcp_config.json' },
      { label: 'alt', path: '.gemini/settings.json' },
    ],
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 3,
  },
  {
    id: 'opencode-cli',
    name: 'OpenCode CLI',
    category: 'cli',
    globalPath: '~/.config/opencode/opencode.json',
    format: 'JSON',
    rootKey: 'mcp',
    priority: 4,
  },
  {
    id: 'goose-block',
    name: 'Goose (Block)',
    category: 'cli',
    globalPath: [
      { label: 'Win', path: '%APPDATA%\\Block\\goose\\config' },
      { label: 'Linux/macOS', path: '~/.config/goose/config.yaml' },
    ],
    format: 'YAML',
    rootKey: 'extensions',
    priority: 5,
  },
  {
    id: 'crush',
    name: 'Crush',
    category: 'cli',
    globalPath: 'crush.json',
    format: 'JSON',
    rootKey: 'mcp',
    priority: 6,
  },
  {
    id: 'warp',
    name: 'Warp',
    category: 'cli',
    globalPath: [
      { path: 'In-app MCP settings', copyable: false },
    ],
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 7,
  },
  {
    id: 'grok-build',
    name: 'Grok Build',
    category: 'cli',
    globalPath: '~/.grok/config.toml',
    format: 'TOML',
    rootKey: 'mcp_servers',
    priority: 8,
  },
  {
    id: 'kimi-code',
    name: 'Kimi Code',
    category: 'cli',
    globalPath: '~/.kimi-code/mcp.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 9,
  },
  {
    id: 'minimax-cli',
    name: 'MiniMax CLI',
    category: 'cli',
    globalPath: '~/.minimax/mcp.json',
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 10,
  },
  {
    id: 'pi-omp',
    name: 'Pi / OMP',
    category: 'cli',
    globalPath: [
      { label: 'Pi', path: '~/.pi/agent/mcp.json' },
      { label: 'OMP', path: '~/.omp/agent/mcp.json' },
    ],
    format: 'JSON',
    rootKey: 'mcpServers',
    priority: 11,
  },
  {
    id: 'hermes',
    name: 'Hermes',
    category: 'cli',
    globalPath: '~/.hermes/config.yaml',
    format: 'YAML',
    rootKey: 'mcp_servers',
    priority: 12,
  },
];

const CATEGORY_ORDER: Record<McpClientCategory, number> = {
  desktop: 0,
  ide: 1,
  cli: 2,
};

export function getClientsForTab(tab: McpClientTab): McpClientEntry[] {
  const filtered =
    tab === 'all'
      ? [...MCP_CLIENTS]
      : MCP_CLIENTS.filter((client) => client.category === tab);

  return filtered.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  });
}

export function normalizeConfigPaths(
  input: string | McpConfigPath[],
): McpConfigPath[] {
  if (typeof input === 'string') {
    return [{ path: input, copyable: true }];
  }
  return input.map((item) => ({
    ...item,
    copyable: item.copyable !== false,
  }));
}

function pathMatchesOs(label: string | undefined, osFilter: McpClientOs): boolean {
  if (osFilter === 'all' || !label) return true;
  const lower = label.toLowerCase();
  const isOsTagged =
    lower.includes('win') || lower.includes('linux') || lower.includes('macos');
  if (!isOsTagged) return true;

  if (osFilter === 'windows') return lower.includes('win');
  if (osFilter === 'linux') return lower.includes('linux');
  return lower.includes('macos');
}

export function filterPathsByOs(
  paths: McpConfigPath[],
  osFilter: McpClientOs,
): McpConfigPath[] {
  if (osFilter === 'all') return paths;
  const matched = paths.filter((entry) => pathMatchesOs(entry.label, osFilter));
  return matched.length > 0 ? matched : paths;
}

export function filterClients(
  tab: McpClientTab,
  osFilter: McpClientOs = 'all',
  searchQuery: string = '',
): McpClientEntry[] {
  const base = getClientsForTab(tab);
  const q = searchQuery.trim().toLowerCase();

  return base.filter((client) => {
    if (
      osFilter !== 'all' &&
      client.supportedOs &&
      !client.supportedOs.includes(osFilter)
    ) {
      return false;
    }

    if (!q) return true;

    const globalPaths = normalizeConfigPaths(client.globalPath);
    const projectPaths = client.projectPath
      ? normalizeConfigPaths(client.projectPath)
      : [];

    return (
      client.name.toLowerCase().includes(q) ||
      client.format.toLowerCase().includes(q) ||
      client.rootKey.toLowerCase().includes(q) ||
      globalPaths.some(
        (p) =>
          p.path.toLowerCase().includes(q) ||
          (p.label && p.label.toLowerCase().includes(q)),
      ) ||
      projectPaths.some(
        (p) =>
          p.path.toLowerCase().includes(q) ||
          (p.label && p.label.toLowerCase().includes(q)),
      )
    );
  });
}

export function getShowMoreLabel(
  remaining: number,
  stepSize: number = CLIENT_STEP_SIZE,
): string {
  const nextBatch = Math.min(stepSize, remaining);
  return remaining > stepSize
    ? `Show ${nextBatch} more (${remaining} remaining)`
    : `Show ${nextBatch} more`;
}
