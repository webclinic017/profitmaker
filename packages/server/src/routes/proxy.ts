import { Elysia } from 'elysia';
import { resolve4, resolve6 } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import type { RequestOptions } from 'node:http';

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
        targetAddress?: string;
        targetFamily?: 4 | 6;
      };
    }
  | {
      ok: false;
      status: number;
      error: string;
      details?: string;
    };

type ProxyResolver = {
  resolve4: (hostname: string) => Promise<string[]>;
  resolve6: (hostname: string) => Promise<string[]>;
};

type ProxyResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  text: string;
};

const defaultResolver: ProxyResolver = {
  resolve4,
  resolve6,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/\.$/, '');
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
  const normalized = normalizeHostname(hostname);

  if (!normalized) return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized === 'metadata.google.internal') return true;

  const ipv4 = parseIPv4Address(normalized);
  if (ipv4) return isBlockedIPv4(ipv4);
  if (normalized.includes(':')) return isBlockedIPv6(normalized);

  return false;
}

async function resolveOptional(
  resolver: (hostname: string) => Promise<string[]>,
  hostname: string
): Promise<string[]> {
  try {
    return await resolver(hostname);
  } catch {
    return [];
  }
}

export async function resolveProxyTarget(
  hostname: string,
  resolver: ProxyResolver = defaultResolver
): Promise<
  | { ok: true; address: string; family: 4 | 6 }
  | { ok: false; status: number; error: string; details?: string }
> {
  const normalized = normalizeHostname(hostname);
  if (!normalized) {
    return { ok: false, status: 400, error: 'Proxy URL host is not allowed' };
  }

  const literalIpFamily = isIP(normalized);
  if (literalIpFamily) {
    if (isBlockedProxyHostname(normalized)) {
      return {
        ok: false,
        status: 400,
        error: 'Proxy URL host is not allowed',
        details: 'Local, private, link-local, and metadata hosts are blocked',
      };
    }

    return {
      ok: true,
      address: normalized,
      family: literalIpFamily as 4 | 6,
    };
  }

  const [ipv4Addresses, ipv6Addresses] = await Promise.all([
    resolveOptional(resolver.resolve4, normalized),
    resolveOptional(resolver.resolve6, normalized),
  ]);

  const resolvedAddresses = [
    ...ipv4Addresses.map((address) => ({ address, family: 4 as const })),
    ...ipv6Addresses.map((address) => ({ address, family: 6 as const })),
  ];

  if (resolvedAddresses.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'Proxy URL host could not be resolved',
    };
  }

  const blockedAddress = resolvedAddresses.find(({ address }) => isBlockedProxyHostname(address));
  if (blockedAddress) {
    return {
      ok: false,
      status: 400,
      error: 'Proxy URL host is not allowed',
      details: 'Resolved proxy targets cannot be local, private, link-local, or metadata addresses',
    };
  }

  return { ok: true, ...resolvedAddresses[0] };
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

export async function validateProxyRequest(
  body: unknown,
  resolver: ProxyResolver = defaultResolver
): Promise<ProxyValidationResult> {
  const validation = validateProxyRequestBody(body);
  if (!validation.ok) return validation;

  const parsedUrl = new URL(validation.request.url);
  const target = await resolveProxyTarget(parsedUrl.hostname, resolver);
  if (!target.ok) return target;

  return {
    ok: true,
    request: {
      ...validation.request,
      targetAddress: target.address,
      targetFamily: target.family,
    },
  };
}

function stringifyProxyBody(body: unknown, method: string): string | undefined {
  if (body === undefined || method === 'GET' || method === 'HEAD') return undefined;
  return typeof body === 'string' ? body : JSON.stringify(body);
}

function performProxyRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  timeout: number,
  targetAddress?: string,
  targetFamily?: 4 | 6
): Promise<ProxyResponse> {
  const parsedUrl = new URL(url);
  const requestBody = stringifyProxyBody(body, method);
  const transport = parsedUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const requestHeaders = {
    ...headers,
    ...(requestBody !== undefined ? { 'Content-Length': Buffer.byteLength(requestBody).toString() } : {}),
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      callback();
    };

    const options: RequestOptions = {
      protocol: parsedUrl.protocol,
      hostname: normalizeHostname(parsedUrl.hostname),
      port: parsedUrl.port || undefined,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method,
      headers: requestHeaders,
      lookup: targetAddress && targetFamily
        ? (_hostname, _options, callback) => callback(null, targetAddress, targetFamily)
        : undefined,
    };

    const req = transport(options, (response) => {
      const chunks: Buffer[] = [];

      response.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      response.on('end', () => {
        finish(() => {
          resolve({
            ok: response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode ?? 0,
            statusText: response.statusMessage ?? '',
            headers: Object.fromEntries(
              Object.entries(response.headers).map(([name, value]) => [
                name,
                Array.isArray(value) ? value.join(', ') : value ?? '',
              ])
            ),
            text: Buffer.concat(chunks).toString('utf8'),
          });
        });
      });
    });

    timeoutId = setTimeout(() => {
      req.destroy(Object.assign(new Error('Request timeout'), { name: 'AbortError' }));
    }, timeout);

    req.on('error', (error) => {
      finish(() => reject(error));
    });

    if (requestBody !== undefined) req.write(requestBody);
    req.end();
  });
}

export const proxyRoutes = new Elysia({ prefix: '/api/proxy' })
  .post('/request', async ({ body, set }) => {
    const validation = await validateProxyRequest(body);
    if (!validation.ok) {
      set.status = validation.status;
      return { error: validation.error, details: validation.details };
    }

    const { url, method, headers, body: reqBody, timeout, targetAddress, targetFamily } = validation.request;
    const proxyHeaders = {
      'User-Agent': 'Profitmaker-Server/3.0',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };

    try {
      const response = await performProxyRequest(
        url,
        method,
        proxyHeaders,
        reqBody,
        timeout,
        targetAddress,
        targetFamily
      );

      const responseData = response.text;
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
        headers: response.headers,
        data: parsedData,
      };
    } catch (error) {
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
