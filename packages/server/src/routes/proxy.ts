import { Elysia } from 'elysia';

const DEFAULT_PROXY_TIMEOUT_MS = 30_000;
const MIN_PROXY_TIMEOUT_MS = 1_000;
const MAX_PROXY_TIMEOUT_MS = 60_000;

const allowedProxyMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);
const blockedProxyHeaders = new Set([
  'connection',
  'content-length',
  'expect',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

type ProxyValidationResult =
  | {
      ok: true;
      request: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: unknown;
        timeout: number;
      };
    }
  | {
      ok: false;
      status: number;
      error: string;
      details?: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseIPv4Address(hostname: string): number[] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;

  const octets = parts.map((part) => {
    if (!/^\d+$/.test(part)) return NaN;
    const value = Number(part);
    return Number.isInteger(value) && value >= 0 && value <= 255 ? value : NaN;
  });

  return octets.every(Number.isFinite) ? octets : null;
}

function isBlockedIPv4(octets: number[]): boolean {
  const [a, b] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function parseIPv4MappedIPv6(hostname: string): number[] | null {
  if (!hostname.startsWith('::ffff:')) return null;

  const tail = hostname.slice('::ffff:'.length);
  const dottedIPv4 = parseIPv4Address(tail);
  if (dottedIPv4) return dottedIPv4;

  const parts = tail.split(':');
  if (parts.length !== 2) return null;

  if (parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) {
    return null;
  }

  const words = parts.map((part) => Number.parseInt(part, 16));
  if (words.some((word) => !Number.isInteger(word) || word < 0 || word > 0xffff)) {
    return null;
  }

  const [high, low] = words;
  return [high >> 8, high & 0xff, low >> 8, low & 0xff];
}

function isBlockedIPv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const mappedIPv4 = parseIPv4MappedIPv6(normalized);
  if (mappedIPv4) return isBlockedIPv4(mappedIPv4);

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  );
}

export function isBlockedProxyHostname(hostname: string): boolean {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/\.$/, '');

  if (!normalized) return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized === 'metadata.google.internal') return true;

  const ipv4 = parseIPv4Address(normalized);
  if (ipv4) return isBlockedIPv4(ipv4);
  if (normalized.includes(':')) return isBlockedIPv6(normalized);

  return false;
}

export function sanitizeProxyHeaders(headers: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    const headerName = name.trim();
    const lowerName = headerName.toLowerCase();

    if (!headerName || blockedProxyHeaders.has(lowerName) || lowerName.startsWith('sec-')) {
      continue;
    }

    if (typeof value === 'string') {
      sanitized[headerName] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[headerName] = String(value);
    } else if (Array.isArray(value)) {
      sanitized[headerName] = value.map(String).join(', ');
    }
  }

  return sanitized;
}

export function validateProxyRequestBody(body: unknown): ProxyValidationResult {
  if (!isRecord(body)) {
    return { ok: false, status: 400, error: 'Proxy request body must be an object' };
  }

  const rawUrl = body.url;
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return { ok: false, status: 400, error: 'URL is required' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { ok: false, status: 400, error: 'Invalid URL' };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { ok: false, status: 400, error: 'Only http and https proxy URLs are allowed' };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return { ok: false, status: 400, error: 'Credentials in proxy URLs are not allowed' };
  }

  if (isBlockedProxyHostname(parsedUrl.hostname)) {
    return {
      ok: false,
      status: 400,
      error: 'Proxy URL host is not allowed',
      details: 'Local, private, link-local, and metadata hosts are blocked',
    };
  }

  const method = typeof body.method === 'string' ? body.method.toUpperCase() : 'GET';
  if (!allowedProxyMethods.has(method)) {
    return { ok: false, status: 400, error: `Proxy method ${method} is not allowed` };
  }

  const timeout =
    typeof body.timeout === 'number' && Number.isFinite(body.timeout)
      ? Math.min(Math.max(body.timeout, MIN_PROXY_TIMEOUT_MS), MAX_PROXY_TIMEOUT_MS)
      : DEFAULT_PROXY_TIMEOUT_MS;

  return {
    ok: true,
    request: {
      url: parsedUrl.toString(),
      method,
      headers: sanitizeProxyHeaders(isRecord(body.headers) ? body.headers : {}),
      body: body.body,
      timeout,
    },
  };
}

export const proxyRoutes = new Elysia({ prefix: '/api/proxy' })
  .post('/request', async ({ body, set }) => {
    const validation = validateProxyRequestBody(body);
    if (!validation.ok) {
      set.status = validation.status;
      return { error: validation.error, details: validation.details };
    }

    const { url, method, headers, body: reqBody, timeout } = validation.request;
    const proxyHeaders = {
      'User-Agent': 'Profitmaker-Server/3.0',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: proxyHeaders,
        body: reqBody !== undefined && method !== 'GET' && method !== 'HEAD'
          ? JSON.stringify(reqBody)
          : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.text();
      let parsedData;
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }

      set.status = response.status;
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsedData,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        set.status = 408;
        return { error: 'Request timeout', details: `Timed out after ${timeout}ms` };
      }
      set.status = 500;
      return {
        error: 'Proxy request failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
