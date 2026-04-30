import { describe, expect, test } from 'bun:test';
import {
  isBlockedProxyHostname,
  sanitizeProxyHeaders,
  validateProxyRequestBody,
} from './proxy';

describe('proxy request validation', () => {
  test('accepts public http and https URLs', () => {
    const result = validateProxyRequestBody({
      url: 'https://api.binance.com/api/v3/time',
      method: 'post',
      headers: { Authorization: 'Bearer exchange-token' },
      body: { ping: true },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.method).toBe('POST');
      expect(result.request.headers.Authorization).toBe('Bearer exchange-token');
      expect(result.request.timeout).toBe(30_000);
    }
  });

  test('rejects unsupported protocols and methods', () => {
    expect(validateProxyRequestBody({ url: 'file:///etc/passwd' }).ok).toBe(false);
    expect(validateProxyRequestBody({ url: 'https://api.binance.com', method: 'TRACE' }).ok).toBe(false);
  });

  test('rejects credentialed and private-network URLs', () => {
    const blockedUrls = [
      'https://user:pass@example.com',
      'http://localhost:3001/health',
      'http://127.0.0.1:3001/health',
      'http://10.0.0.5/status',
      'http://172.16.0.5/status',
      'http://192.168.1.1/status',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/health',
      'http://[::ffff:172.16.0.5]/status',
    ];

    for (const url of blockedUrls) {
      expect(validateProxyRequestBody({ url }).ok).toBe(false);
    }
  });

  test('detects blocked hostnames directly', () => {
    expect(isBlockedProxyHostname('localhost')).toBe(true);
    expect(isBlockedProxyHostname('service.localhost')).toBe(true);
    expect(isBlockedProxyHostname('metadata.google.internal')).toBe(true);
    expect(isBlockedProxyHostname('::ffff:7f00:1')).toBe(true);
    expect(isBlockedProxyHostname('api.binance.com')).toBe(false);
    expect(isBlockedProxyHostname('::ffff:808:808')).toBe(false);
  });

  test('sanitizes hop-by-hop headers without removing exchange auth headers', () => {
    const headers = sanitizeProxyHeaders({
      Host: 'evil.local',
      Connection: 'keep-alive',
      'Content-Length': 10,
      'Sec-Fetch-Site': 'same-origin',
      Authorization: 'Bearer token',
      'X-Exchange-Signature': 'signed',
    });

    expect(headers).toEqual({
      Authorization: 'Bearer token',
      'X-Exchange-Signature': 'signed',
    });
  });

  test('clamps timeout to the supported range', () => {
    const result = validateProxyRequestBody({
      url: 'https://api.binance.com',
      timeout: 500_000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.timeout).toBe(60_000);
  });
});
