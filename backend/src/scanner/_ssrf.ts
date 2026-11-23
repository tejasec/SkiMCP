import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Checks if an IPv4 address is in private, loopback, or reserved address ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 treated as unsafe
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 10.0.0.0/8 (Private network)
  if (b0 === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata service e.g. 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 172.16.0.0/12 (Private network: 172.16.0.0 – 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && parts[2] === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;

  // 192.168.0.0/16 (Private network)
  if (b0 === 192 && b1 === 168) return true;

  // 198.18.0.0/15 (Network benchmark tests)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in private, loopback, or reserved address ranges.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback ::1
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // Unspecified ::
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 etc.)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.replace('::ffff:', '');
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  // Unique local addresses (fc00::/7 -> fc00:: to fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local unicast (fe80::/10 -> fe80:: to febf::)
  if (/^fe[89ab]/.test(normalized)) return true;

  // Site-local (deprecated, fec0::/10)
  if (/^fe[c-f]/.test(normalized)) return true;

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) return true;

  return false;
}

/**
 * Validate a target URL against SSRF attacks.
 * Verifies protocol and resolves IP addresses to block private, loopback,
 * and link-local cloud metadata IPs.
 *
 * @throws string error message explaining why the URL was blocked
 */
export async function validateUrlForSsrf(
  targetUrl: string,
  options?: { allowLoopbackForTesting?: boolean },
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw `Invalid URL: "${targetUrl}". Expected a valid HTTP or HTTPS URL.`;
  }

  const allowLoopback =
    options?.allowLoopbackForTesting ||
    process.env.ALLOW_LOOPBACK_TESTING === 'true';

  // 1. Enforce HTTP/HTTPS protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw `Forbidden protocol "${parsed.protocol}". Only "http:" and "https:" URLs are allowed for security.`;
  }

  const hostname = parsed.hostname.toLowerCase();
  // Strip brackets from IPv6 hostnames (e.g. "[::1]" -> "::1")
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

  // 2. Reject obvious loopback / local hostnames
  if (
    !allowLoopback &&
    (cleanHost === 'localhost' ||
      cleanHost.endsWith('.localhost') ||
      cleanHost === 'local' ||
      cleanHost.endsWith('.local'))
  ) {
    throw `SSRF Protection: Requests to local hostnames ("${cleanHost}") are strictly forbidden.`;
  }

  // 3. If hostname is an IP literal, validate directly
  if (net.isIP(cleanHost)) {
    if (allowLoopback && (cleanHost === '127.0.0.1' || cleanHost === '::1')) {
      return parsed;
    }
    if (net.isIPv4(cleanHost) && isPrivateIPv4(cleanHost)) {
      throw `SSRF Protection: Access to private or loopback IPv4 address "${cleanHost}" is forbidden.`;
    }
    if (net.isIPv6(cleanHost) && isPrivateIPv6(cleanHost)) {
      throw `SSRF Protection: Access to private or loopback IPv6 address "${cleanHost}" is forbidden.`;
    }
    return parsed;
  }

  // 4. Resolve DNS to check the actual IP address (prevents DNS rebinding and nip.io / localtest.me bypasses)
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw `DNS resolution failed for host "${hostname}".`;
    }

    for (const record of addresses) {
      if (allowLoopback && (record.address === '127.0.0.1' || record.address === '::1')) {
        continue;
      }
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        throw `SSRF Protection: Host "${hostname}" resolves to private/loopback IP "${record.address}", which is forbidden.`;
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        throw `SSRF Protection: Host "${hostname}" resolves to private/loopback IPv6 "${record.address}", which is forbidden.`;
      }
    }
  } catch (err) {
    if (typeof err === 'string') throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw `Network validation error for "${hostname}": ${msg}`;
  }

  return parsed;
}
