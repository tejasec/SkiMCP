import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateUrlForSsrf } from '../src/scanner/_ssrf';

describe('SSRF Protection & URL Validation', () => {
  it('blocks loopback IP addresses (127.0.0.1 and ::1)', async () => {
    await assert.rejects(
      () => validateUrlForSsrf('http://127.0.0.1:8080/tools/list'),
      /private or loopback/i,
    );

    await assert.rejects(
      () => validateUrlForSsrf('http://[::1]:8080/tools/list'),
      /private or loopback/i,
    );
  });

  it('blocks localhost hostname', async () => {
    await assert.rejects(
      () => validateUrlForSsrf('http://localhost:3000/sse'),
      /local hostnames/i,
    );
  });

  it('blocks private IPv4 networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', async () => {
    await assert.rejects(
      () => validateUrlForSsrf('http://10.0.0.5:8000/tools/list'),
      /private or loopback/i,
    );

    await assert.rejects(
      () => validateUrlForSsrf('http://172.20.0.1/tools/list'),
      /private or loopback/i,
    );

    await assert.rejects(
      () => validateUrlForSsrf('http://192.168.1.100/tools/list'),
      /private or loopback/i,
    );
  });

  it('blocks AWS/GCP cloud metadata IP (169.254.169.254)', async () => {
    await assert.rejects(
      () => validateUrlForSsrf('http://169.254.169.254/latest/meta-data'),
      /private or loopback/i,
    );
  });

  it('blocks forbidden protocols like file:, ftp:, gopher:', async () => {
    await assert.rejects(
      () => validateUrlForSsrf('file:///etc/passwd'),
      /Forbidden protocol "file:"/i,
    );

    await assert.rejects(
      () => validateUrlForSsrf('ftp://ftp.example.com/manifest.json'),
      /Forbidden protocol "ftp:"/i,
    );
  });

  it('rejects malformed URLs', async () => {
    await assert.rejects(
      () => validateUrlForSsrf('not-a-valid-url'),
      /Invalid URL/i,
    );
  });

  it('allows valid public HTTP and HTTPS URLs', async () => {
    // 93.184.216.34 is example.com's public IP
    const url = await validateUrlForSsrf('http://93.184.216.34/tools/list');
    assert.strictEqual(url.protocol, 'http:');
    assert.strictEqual(url.hostname, '93.184.216.34');
  });
});
