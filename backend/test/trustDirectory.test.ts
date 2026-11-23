import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deriveTrustLevel,
  derivePermissionBadges,
  SEED_SERVERS,
  type CuratedDirectoryDataset,
} from '../../scripts/harvest-directory';
import { scanManifest } from '../src/scanner/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Curated Trust Directory & Harvester', () => {
  const jsonPath = path.resolve(ROOT_DIR, 'frontend/src/data/trust-directory.json');

  it('generates a valid, readable trust-directory.json file', () => {
    assert.ok(fs.existsSync(jsonPath), 'trust-directory.json should exist');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw) as CuratedDirectoryDataset;

    assert.equal(data.version, '1.0.0');
    assert.ok(data.totalServers >= 15, 'Should have at least 15 curated servers');
    assert.ok(Array.isArray(data.servers), 'Servers must be an array');
    assert.equal(data.servers.length, data.totalServers);
  });

  it('computes consistent ecosystem statistics', () => {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw) as CuratedDirectoryDataset;

    const { stats, servers } = data;
    assert.equal(
      stats.verifiedCount + stats.cautionCount + stats.dangerousCount,
      servers.length,
      'Sum of trust tiers must equal total server count',
    );

    assert.ok(stats.avgRiskScore >= 0 && stats.avgRiskScore <= 100);
    assert.ok(stats.verifiedCount > 0, 'Should have verified safe servers');
    assert.ok(stats.dangerousCount > 0, 'Should have flagged dangerous/avoid servers');
  });

  it('guarantees cryptographic SHA-256 fingerprints for every curated server', () => {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw) as CuratedDirectoryDataset;

    const sha256Pattern = /^sha256:[a-f0-9]{64}$/;

    for (const server of data.servers) {
      assert.match(
        server.manifestFingerprint,
        sha256Pattern,
        `Server ${server.id} must have a valid SHA-256 manifest fingerprint`,
      );
      assert.ok(server.toolsCount > 0, `Server ${server.id} must declare tools`);
      assert.equal(
        server.toolsSummary.length,
        server.toolsCount,
        `Server ${server.id} toolsSummary length must match toolsCount`,
      );
      assert.ok(server.riskScore >= 0 && server.riskScore <= 100);
    }
  });

  it('correctly derives trustLevel based on scan severity', () => {
    // 1. Clean tool
    const cleanReport = scanManifest({
      tools: [
        {
          name: 'get_time',
          description: 'Get current UTC time.',
          inputSchema: { type: 'object' },
        },
      ],
    });
    assert.equal(deriveTrustLevel(cleanReport), 'verified');

    // 2. Dangerous shell tool
    const dangerousReport = scanManifest({
      tools: [
        {
          name: 'run_command',
          description: 'Execute shell commands.',
          inputSchema: {
            type: 'object',
            properties: { cmd: { type: 'string' } },
            required: ['cmd'],
          },
        },
      ],
    });
    assert.equal(deriveTrustLevel(dangerousReport), 'dangerous');
  });

  it('correctly assigns permission badges based on rules and tools', () => {
    const fsReport = scanManifest({
      tools: [
        {
          name: 'read_file',
          description: 'Read file contents from arbitrary path.',
          inputSchema: {
            type: 'object',
            properties: { path: { type: 'string' } },
            required: ['path'],
          },
        },
      ],
    });
    const badges = derivePermissionBadges(fsReport, ['read_file']);
    assert.ok(badges.includes('Filesystem Access'), 'Should identify Filesystem Access');

    const cleanReport = scanManifest({
      tools: [
        {
          name: 'ping',
          description: 'Ping health service.',
          inputSchema: { type: 'object' },
        },
      ],
    });
    const cleanBadges = derivePermissionBadges(cleanReport, ['ping']);
    assert.ok(cleanBadges.includes('Read-Only') || cleanBadges.includes('Sandboxed'));
  });

  it('ensures all seed servers match realistic ecosystem schemas', () => {
    assert.ok(SEED_SERVERS.length >= 15);
    const names = new Set<string>();

    for (const seed of SEED_SERVERS) {
      assert.ok(!names.has(seed.id), `Duplicate server id: ${seed.id}`);
      names.add(seed.id);
      assert.ok(seed.manifest.tools.length > 0, `Seed ${seed.id} must have tools`);
      assert.ok(seed.repoUrl.startsWith('https://github.com/'));
    }
  });
});
