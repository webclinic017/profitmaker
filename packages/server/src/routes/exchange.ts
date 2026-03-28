import { Elysia, t } from 'elysia';
import { getCCXTInstance, type CCXTInstanceConfig } from '../services/ccxtCache';

const configSchema = t.Object({
  exchangeId: t.String(),
  marketType: t.Optional(t.String()),
  ccxtType: t.Optional(t.Union([t.Literal('regular'), t.Literal('pro')])),
  apiKey: t.Optional(t.String()),
  secret: t.Optional(t.String()),
  password: t.Optional(t.String()),
  sandbox: t.Optional(t.Boolean()),
});

const configWithSymbol = t.Object({
  config: configSchema,
  symbol: t.String(),
});

const configWithSymbolAndLimit = t.Object({
  config: configSchema,
  symbol: t.String(),
  limit: t.Optional(t.Number()),
});

const configWithSymbolTimeframeLimit = t.Object({
  config: configSchema,
  symbol: t.String(),
  timeframe: t.Optional(t.String()),
  limit: t.Optional(t.Number()),
});

const configOnly = t.Object({
  config: configSchema,
});

export const exchangeRoutes = new Elysia({ prefix: '/api/exchange' })
  .post('/instance', async ({ body }) => {
    const config = body as CCXTInstanceConfig;
    if (!config.exchangeId) return { error: 'exchangeId is required' };
    await getCCXTInstance(config);
    return {
      success: true,
      exchangeId: config.exchangeId,
      marketType: config.marketType || 'spot',
      ccxtType: config.ccxtType || 'regular',
      sandbox: config.sandbox || false,
      hasCredentials: !!(config.apiKey && config.secret),
    };
  }, { body: configSchema })

  .post('/fetchTicker', async ({ body }) => {
    const { config, symbol } = body;
    const instance = await getCCXTInstance(config);
    const ticker = await instance.fetchTicker(symbol);
    return { success: true, data: ticker };
  }, { body: configWithSymbol })

  .post('/fetchOrderBook', async ({ body }) => {
    const { config, symbol, limit } = body;
    const instance = await getCCXTInstance(config);
    const orderbook = await instance.fetchOrderBook(symbol, limit);
    return { success: true, data: orderbook };
  }, { body: configWithSymbolAndLimit })

  .post('/fetchTrades', async ({ body }) => {
    const { config, symbol, limit } = body;
    const instance = await getCCXTInstance(config);
    const trades = await instance.fetchTrades(symbol, undefined, limit);
    return { success: true, data: trades };
  }, { body: configWithSymbolAndLimit })

  .post('/fetchOHLCV', async ({ body }) => {
    const { config, symbol, timeframe, limit } = body;
    const instance = await getCCXTInstance(config);
    const ohlcv = await instance.fetchOHLCV(symbol, timeframe, undefined, limit);
    return { success: true, data: ohlcv };
  }, { body: configWithSymbolTimeframeLimit })

  .post('/fetchBalance', async ({ body, set }) => {
    const { config } = body;
    if (!config.apiKey || !config.secret) {
      set.status = 400;
      return { error: 'API credentials required for balance' };
    }
    const instance = await getCCXTInstance(config);
    const balance = await instance.fetchBalance();
    return { success: true, data: balance };
  }, { body: configOnly })

  .post('/capabilities', async ({ body }) => {
    const { config } = body;
    const instance = await getCCXTInstance(config);
    return {
      success: true,
      data: {
        has: instance.has,
        markets: Object.keys(instance.markets || {}),
        symbols: instance.symbols || [],
        timeframes: instance.timeframes || {},
        fees: instance.fees || {},
      },
    };
  }, { body: configOnly })

  .onError(({ error, set }) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Map known CCXT errors to appropriate HTTP codes
    if (message.includes('not found')) {
      set.status = 404;
    } else if (message.includes('not available') || message.includes('not supported')) {
      set.status = 400;
    } else {
      set.status = 500;
    }
    return { error: 'Exchange operation failed', details: message };
  });
