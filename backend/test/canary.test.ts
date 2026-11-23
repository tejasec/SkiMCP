import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { runCanaryProbes } from '../src/scanner/_canary';
import type { ManifestTool } from '../src/scanner/types';

describe('F-8: Dynamic Runtime Canary Sandbox', () => {
  let server: http.Server;
  let port: number;
  let mode: 'clean' | 'shell_anomaly' | 'server_error' = 'clean';

  before(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        if (mode === 'clean') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              result: { content: [{ type: 'text', text: 'Benign output' }] },
            }),
          );
        } else if (mode === 'shell_anomaly') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              error: {
                message: '/bin/sh: command not found',
                code: -32603,
              },
            }),
          );
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Crash');
        }
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('records expected observation when server handles probe cleanly', async () => {
    mode = 'clean';
    const tools: ManifestTool[] = [
      {
        name: 'test_calculator',
        description: 'Safe calculator',
        inputSchema: {
          type: 'object',
          properties: { val: { type: 'number' } },
        },
      },
    ];

    const observations = await runCanaryProbes(
      `http://127.0.0.1:${port}/tools/list`,
      tools,
      { allowLoopbackForTesting: true },
    );
    assert.strictEqual(observations.length, 1);
    assert.strictEqual(observations[0].toolName, 'test_calculator');
    assert.strictEqual(observations[0].status, 'expected');
    assert.strictEqual(observations[0].probeType, 'inert-empty-params');
    assert.ok(observations[0].latencyMs >= 0);
  });

  it('flags suspicious status when server leaks raw shell interpreter output', async () => {
    mode = 'shell_anomaly';
    const tools: ManifestTool[] = [
      {
        name: 'untrusted_shell_tool',
        description: 'Potentially vulnerable tool',
        inputSchema: {
          type: 'object',
          properties: { cmd: { type: 'string' } },
        },
      },
    ];

    const observations = await runCanaryProbes(
      `http://127.0.0.1:${port}/tools/list`,
      tools,
      { allowLoopbackForTesting: true },
    );
    assert.strictEqual(observations.length, 1);
    assert.strictEqual(observations[0].status, 'suspicious');
    assert.ok(observations[0].details.includes('shell interpreter output'));
  });

  it('flags anomaly status when server crashes with 500 on inert input', async () => {
    mode = 'server_error';
    const tools: ManifestTool[] = [
      {
        name: 'fragile_tool',
        description: 'Crashes on empty args',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];

    const observations = await runCanaryProbes(
      `http://127.0.0.1:${port}/tools/list`,
      tools,
      { allowLoopbackForTesting: true },
    );
    assert.strictEqual(observations.length, 1);
    assert.strictEqual(observations[0].status, 'anomaly');
    assert.ok(observations[0].details.includes('HTTP 500'));
  });

  it('handles unreachable host without crashing and records handshake rejection', async () => {
    const unreachableUrl = 'http://127.0.0.1:59999/tools/list';
    const tools: ManifestTool[] = [
      {
        name: 'ghost_tool',
        description: 'Unreachable host',
      },
    ];

    const observations = await runCanaryProbes(unreachableUrl, tools, {
      allowLoopbackForTesting: true,
    });
    assert.strictEqual(observations.length, 1);
    assert.ok(observations[0].details.includes('Handshake rejection') || observations[0].details.includes('fetch failed'));
  });
});
