import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  canonicalJsonStringify,
  computeToolFingerprint,
  computeManifestFingerprint,
} from '../src/scanner/_fingerprint';
import type { ManifestTool } from '../src/scanner/types';

describe('Cryptographic Fingerprints & Canonicalization', () => {
  it('canonicalJsonStringify sorts object keys deterministically', () => {
    const objA = { z: 1, a: 2, m: { y: 'test', b: true } };
    const objB = { a: 2, m: { b: true, y: 'test' }, z: 1 };

    const strA = canonicalJsonStringify(objA);
    const strB = canonicalJsonStringify(objB);

    assert.strictEqual(strA, strB);
    assert.strictEqual(strA, '{"a":2,"m":{"b":true,"y":"test"},"z":1}');
  });

  it('omits undefined values and functions in objects', () => {
    const obj = { a: 1, b: undefined, c: () => {}, d: 'ok' };
    const canonical = canonicalJsonStringify(obj);
    assert.strictEqual(canonical, '{"a":1,"d":"ok"}');
  });

  it('computes identical tool fingerprint regardless of key order', () => {
    const toolA: ManifestTool = {
      name: 'test_tool',
      description: 'A test tool description',
      inputSchema: {
        properties: { b: { type: 'number' }, a: { type: 'string' } },
        type: 'object',
      },
    };

    const toolB: ManifestTool = {
      description: 'A test tool description',
      inputSchema: {
        type: 'object',
        properties: { a: { type: 'string' }, b: { type: 'number' } },
      },
      name: 'test_tool',
    };

    const fpA = computeToolFingerprint(toolA);
    const fpB = computeToolFingerprint(toolB);

    assert.ok(fpA.startsWith('sha256:'));
    assert.strictEqual(fpA.length, 7 + 64);
    assert.strictEqual(fpA, fpB);
  });

  it('computes different tool fingerprints for different schemas', () => {
    const toolA: ManifestTool = {
      name: 'my_tool',
      description: 'Original description',
    };
    const toolB: ManifestTool = {
      name: 'my_tool',
      description: 'Modified description',
    };

    const fpA = computeToolFingerprint(toolA);
    const fpB = computeToolFingerprint(toolB);

    assert.notStrictEqual(fpA, fpB);
  });

  it('computes order-invariant manifest fingerprint', () => {
    const tool1: ManifestTool = { name: 'alpha', description: 'Alpha tool' };
    const tool2: ManifestTool = { name: 'beta', description: 'Beta tool' };
    const tool3: ManifestTool = { name: 'gamma', description: 'Gamma tool' };

    const manifestFp1 = computeManifestFingerprint([tool1, tool2, tool3]);
    const manifestFp2 = computeManifestFingerprint([tool3, tool1, tool2]);

    assert.ok(manifestFp1.startsWith('sha256:'));
    assert.strictEqual(manifestFp1, manifestFp2);
  });
});
