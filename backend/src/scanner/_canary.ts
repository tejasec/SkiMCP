import type { ManifestTool, CanaryObservation } from './types';
import { validateUrlForSsrf } from './_ssrf';

/**
 * Executes benign canary test calls against a live MCP server's tools/call endpoint
 * to observe runtime behavior without causing side effects.
 */
export async function runCanaryProbes(
  serverUrl: string,
  tools: ManifestTool[],
  options?: { allowLoopbackForTesting?: boolean },
): Promise<CanaryObservation[]> {
  const observations: CanaryObservation[] = [];
  await validateUrlForSsrf(serverUrl, options);

  // Normalize endpoint URL (if ending in /sse or /tools/list, or base)
  let callUrl = serverUrl;
  if (callUrl.endsWith('/sse')) {
    callUrl = callUrl.replace(/\/sse$/, '');
  } else if (callUrl.endsWith('/tools/list')) {
    callUrl = callUrl.replace(/\/tools\/list$/, '');
  }

  // Probe up to 5 tools to stay fast and avoid overwhelming the remote server
  const sampleTools = tools.slice(0, 5);

  for (const tool of sampleTools) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      // Construct a safe, inert probe: empty arguments or type-safe defaults
      const probePayload = {
        jsonrpc: '2.0',
        id: `canary-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        method: 'tools/call',
        params: {
          name: tool.name,
          arguments: {},
        },
      };

      const res = await fetch(callUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(probePayload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const latencyMs = Date.now() - start;
      const text = await res.text();

      // Analyze response body for indications of underlying shell execution or abnormal errors
      const lower = text.toLowerCase();
      let status: 'expected' | 'anomaly' | 'suspicious' = 'expected';
      let details = `Response code: ${res.status}. Clean parameter rejection or inert response.`;

      if (
        lower.includes('bash:') ||
        lower.includes('/bin/sh') ||
        lower.includes('syntax error near') ||
        lower.includes('command not found') ||
        lower.includes('powershell') ||
        lower.includes('stderr:')
      ) {
        status = 'suspicious';
        details = `Server returned raw shell interpreter output during empty probe: "${text.slice(0, 120)}..."`;
      } else if (res.status >= 500) {
        status = 'anomaly';
        details = `Server crashed with HTTP ${res.status} on inert probe. Possible unhandled exception or fragile parser.`;
      } else if (text.length > 50000) {
        status = 'anomaly';
        details = `Unexpected high-volume response payload (${text.length} bytes) returned for empty probe.`;
      }

      observations.push({
        toolName: tool.name,
        probeType: 'inert-empty-params',
        status,
        latencyMs,
        details,
      });
    } catch (err) {
      const latencyMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      observations.push({
        toolName: tool.name,
        probeType: 'inert-empty-params',
        status: message.includes('abort') ? 'anomaly' : 'expected',
        latencyMs,
        details: message.includes('abort')
          ? 'Probe timed out after 3000ms. Server response delayed.'
          : `Handshake rejection: ${message}`,
      });
    }
  }

  return observations;
}
