import { Elysia } from 'elysia';

export const proxyRoutes = new Elysia({ prefix: '/api/proxy' })
  .post('/request', async ({ body, set }) => {
    const { url, method = 'GET', headers = {}, body: reqBody, timeout = 30000 } = body as any;

    if (!url) {
      set.status = 400;
      return { error: 'URL is required' };
    }

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
        body: reqBody ? JSON.stringify(reqBody) : undefined,
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
