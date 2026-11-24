import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MCP_CLIENTS,
  INITIAL_CLIENT_COUNT,
  CLIENT_STEP_SIZE,
  getClientsForTab,
  normalizeConfigPaths,
  getShowMoreLabel,
} from '../../frontend/src/data/mcpClients';

describe('MCP Clients Config Registry & Progressive Pagination', () => {
  it('contains all 29 desktop, IDE, and CLI clients with unique slugs', () => {
    assert.equal(MCP_CLIENTS.length, 29);

    const ids = new Set(MCP_CLIENTS.map((c) => c.id));
    assert.equal(ids.size, 29, 'Every client id must be unique');

    assert.equal(getClientsForTab('all').length, 29);
    assert.equal(getClientsForTab('desktop').length, 5);
    assert.equal(getClientsForTab('ide').length, 12);
    assert.equal(getClientsForTab('cli').length, 12);
  });

  it('orders clients by priority within each category', () => {
    const desktop = getClientsForTab('desktop');
    assert.equal(desktop[0].name, 'Claude Desktop (macOS)');
    assert.equal(desktop[4].name, 'Devin Desktop (Windsurf Next)');

    const ide = getClientsForTab('ide');
    assert.equal(ide[0].name, 'Cursor IDE');
    assert.equal(ide[1].name, 'VS Code (Copilot)');
    assert.equal(ide[11].name, 'Trae / Augment Code / Visual Studio 2022');

    const cli = getClientsForTab('cli');
    assert.equal(cli[0].name, 'Claude Code');
    assert.equal(cli[1].name, 'OpenAI Codex');
    assert.equal(cli[11].name, 'Hermes');
  });

  it('normalizes both single string paths and OS-specific path arrays', () => {
    const single = normalizeConfigPaths('~/.cursor/mcp.json');
    assert.deepEqual(single, [{ path: '~/.cursor/mcp.json', copyable: true }]);

    const multi = normalizeConfigPaths([
      { label: 'macOS/Linux', path: '~/.config/zed/settings.json' },
      { label: 'IDE Settings', path: 'Tools > AI Assistant > MCP', copyable: false },
    ]);
    assert.equal(multi[0].copyable, true);
    assert.equal(multi[1].copyable, false);
  });

  it('formats progressive Show More button labels across 4-item increments', () => {
    assert.equal(INITIAL_CLIENT_COUNT, 4);
    assert.equal(CLIENT_STEP_SIZE, 4);

    // For a 12-item tab (IDE / CLI): 4 -> 8 -> 12
    assert.equal(getShowMoreLabel(8), 'Show 4 more (8 remaining)');
    assert.equal(getShowMoreLabel(4), 'Show 4 more');

    // For a 5-item tab (Desktop): 4 -> 5
    assert.equal(getShowMoreLabel(1), 'Show 1 more');

    // Final batch smaller than step size (e.g. 2 remaining)
    assert.equal(getShowMoreLabel(2), 'Show 2 more');
  });
});
