import { validateUrlForSsrf } from './_ssrf';
export { validateUrlForSsrf } from './_ssrf';

const REQUEST_TIMEOUT_MS = 10000;
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB cap

/**
 * Safe fetch wrapper that enforces SSRF checks on initial URL and on every redirect.
 */
async function safeFetch(
  initialUrl: string,
  options: RequestInit = {},
  maxRedirects = 3,
): Promise<Response> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    // Validate target URL before connecting
    await validateUrlForSsrf(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(currentUrl, {
        ...options,
        redirect: 'manual', // Manually intercept redirects to validate each target
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Check for redirects
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (!location) {
          throw `Server returned HTTP ${res.status} redirect without a Location header.`;
        }
        // Resolve relative redirects
        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = nextUrl;
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        throw `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s while connecting to ${currentUrl}.`;
      }
      if (typeof err === 'string') throw err;
      throw `Network error connecting to ${currentUrl}: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  throw `Too many redirects (exceeded limit of ${maxRedirects}) while fetching ${initialUrl}.`;
}

/**
 * Fetch tools from a live MCP server via HTTP POST (JSON-RPC), HTTP GET, or SSE transport.
 */
export async function fetchLiveMcpManifest(targetUrl: string): Promise<unknown> {
  const urlObj = await validateUrlForSsrf(targetUrl);
  const isSseUrl = urlObj.pathname.endsWith('/sse') || urlObj.searchParams.has('sse');

  // If endpoint appears to be SSE, attempt SSE handshake first
  if (isSseUrl) {
    try {
      return await fetchViaSse(targetUrl);
    } catch (sseErr) {
      // Fall through to JSON-RPC HTTP POST if SSE connection failed
    }
  }

  // 1. Try standard JSON-RPC 2.0 "tools/list" request over HTTP POST
  try {
    const postRes = await safeFetch(targetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    const contentType = postRes.headers.get('content-type') || '';

    if (postRes.ok) {
      if (contentType.includes('text/event-stream')) {
        return await parseSseStream(postRes);
      }
      const json = await postRes.json();
      return json;
    }
  } catch (postErr) {
    // If POST fails, try GET before giving up
  }

  // 2. Try HTTP GET (for servers exposing direct tools manifest or SSE on GET)
  try {
    const getRes = await safeFetch(targetUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json, text/event-stream',
      },
    });

    const contentType = getRes.headers.get('content-type') || '';

    if (!getRes.ok) {
      throw `HTTP request failed with status ${getRes.status}: ${getRes.statusText}`;
    }

    if (contentType.includes('text/event-stream')) {
      return await parseSseStream(getRes);
    }

    const text = await getRes.text();
    if (text.length > MAX_BODY_BYTES) {
      throw `Response exceeded maximum permitted size of 1MB (${text.length} bytes).`;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (getErr) {
    if (typeof getErr === 'string') throw getErr;
    throw `Failed to fetch MCP tools from ${targetUrl}: ${getErr instanceof Error ? getErr.message : String(getErr)}`;
  }
}

/**
 * Perform MCP SSE protocol handshake:
 * 1. GET /sse with Accept: text/event-stream
 * 2. Receive `endpoint` event specifying the messages POST URL
 * 3. POST `tools/list` to that messages URL
 */
async function fetchViaSse(sseUrl: string): Promise<unknown> {
  const sseRes = await safeFetch(sseUrl, {
    method: 'GET',
    headers: {
      accept: 'text/event-stream',
    },
  });

  if (!sseRes.ok) {
    throw `SSE handshake failed with status ${sseRes.status}`;
  }

  if (!sseRes.body) {
    throw 'No response body received from SSE endpoint.';
  }

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let endpointUrl: string | null = null;
  const startTime = Date.now();

  try {
    while (Date.now() - startTime < REQUEST_TIMEOUT_MS) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const eventBlock of events) {
        const lines = eventBlock.split('\n');
        let eventType = 'message';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            eventData += line.slice(5).trim();
          }
        }

        // Endpoint event establishes the message destination
        if (eventType === 'endpoint' && eventData) {
          endpointUrl = new URL(eventData, sseUrl).toString();
          break;
        }

        // If the event itself contains tools or a JSON-RPC response with tools
        if (eventData) {
          try {
            const parsed = JSON.parse(eventData);
            if (
              ('tools' in parsed && Array.isArray(parsed.tools)) ||
              (parsed.result && 'tools' in parsed.result)
            ) {
              return parsed;
            }
          } catch {
            // Not JSON yet, continue
          }
        }
      }

      if (endpointUrl) break;
    }
  } finally {
    reader.releaseLock();
  }

  if (endpointUrl) {
    // Validate target messages URL against SSRF
    await validateUrlForSsrf(endpointUrl);

    // POST tools/list to the discovered endpoint
    const postRes = await safeFetch(endpointUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    if (postRes.ok) {
      return await postRes.json();
    }
  }

  throw 'Could not extract MCP tools from SSE stream.';
}

/**
 * Parse an SSE response stream looking for a JSON payload containing tools.
 */
async function parseSseStream(response: Response): Promise<unknown> {
  if (!response.body) {
    throw 'No response body received from SSE stream.';
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const startTime = Date.now();

  try {
    while (Date.now() - startTime < REQUEST_TIMEOUT_MS) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        const lines = block.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();
            try {
              const parsed = JSON.parse(dataStr);
              if (
                ('tools' in parsed && Array.isArray(parsed.tools)) ||
                (parsed.result && 'tools' in parsed.result)
              ) {
                return parsed;
              }
            } catch {
              // Ignore non-json lines
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  throw 'No MCP tools found in SSE stream.';
}
