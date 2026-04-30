import { describe, expect, test } from 'vitest';
import { deriveSocketUrl } from './ccxtServerProvider';

describe('deriveSocketUrl', () => {
  test('uses the next port for explicit local server URLs', () => {
    expect(deriveSocketUrl('http://localhost:3001')).toBe('http://localhost:3002');
    expect(deriveSocketUrl('http://127.0.0.1:4000/')).toBe('http://127.0.0.1:4001');
  });

  test('keeps reverse-proxied URLs without explicit ports unchanged', () => {
    expect(deriveSocketUrl('https://api.profitmaker.cc')).toBe('https://api.profitmaker.cc');
  });

  test('falls back to trimming invalid URLs', () => {
    expect(deriveSocketUrl('not-a-url/')).toBe('not-a-url');
  });
});
