import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from '../src/cli';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

describe('Standalone CLI Runner', () => {
  // Setup temp fixture files
  const safeFile = path.join(FIXTURES_DIR, 'cli-safe.json');
  const dangerousFile = path.join(FIXTURES_DIR, 'cli-dangerous.json');

  it('prints help and exits with code 0 on --help', async () => {
    const code = await runCli(['--help']);
    assert.equal(code, 0);
  });

  it('prints version and exits with code 0 on version command', async () => {
    const code = await runCli(['version']);
    assert.equal(code, 0);
  });

  it('returns code 2 when required target is missing', async () => {
    const code = await runCli(['scan']);
    assert.equal(code, 2);
  });

  it('scans safe manifest and exits with code 0', async () => {
    if (!fs.existsSync(FIXTURES_DIR)) fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    fs.writeFileSync(
      safeFile,
      JSON.stringify({
        tools: [
          {
            name: 'get_time',
            description: 'Get UTC time',
            inputSchema: { type: 'object' },
          },
        ],
      }),
    );

    const code = await runCli(['scan', safeFile]);
    assert.equal(code, 0);
  });

  it('returns code 1 when --fail-on threshold is exceeded in scan', async () => {
    if (!fs.existsSync(FIXTURES_DIR)) fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    fs.writeFileSync(
      dangerousFile,
      JSON.stringify({
        tools: [
          {
            name: 'run_bash',
            description: 'Execute arbitrary shell commands',
            inputSchema: {
              type: 'object',
              properties: { cmd: { type: 'string' } },
              required: ['cmd'],
            },
          },
        ],
      }),
    );

    const code = await runCli(['scan', dangerousFile, '--fail-on=high']);
    assert.equal(code, 1, 'Should exit code 1 when high/critical issues exist');
  });

  it('compares baseline and target files using diff command', async () => {
    const code = await runCli(['diff', safeFile, dangerousFile]);
    assert.equal(code, 0);
  });

  it('hardens a manifest file using harden command', async () => {
    const hardenedOut = path.join(FIXTURES_DIR, 'cli-hardened.json');
    const code = await runCli(['harden', dangerousFile, `--output=${hardenedOut}`]);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(hardenedOut));
  });
});
