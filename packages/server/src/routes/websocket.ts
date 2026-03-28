import { Elysia, t } from 'elysia';
import { getCCXTInstance, type CCXTInstanceConfig } from '../services/ccxtCache';

const watchBody = t.Object({
  config: t.Object({
    exchangeId: t.String(),
    marketType: t.Optional(t.String()),
    ccxtType: t.Optional(t.Union([t.Literal('regular'), t.Literal('pro')])),
    apiKey: t.Optional(t.String()),
    secret: t.Optional(t.String()),
    password: t.Optional(t.String()),
    sandbox: t.Optional(t.Boolean()),
  }),
  symbol: t.Optional(t.String()),
  limit: t.Optional(t.Number()),
  timeframe: t.Optional(t.String()),
});

const requirePro = (config: any, set: any) => {
  if (config.ccxtType !== 'pro') {
    set.status = 400;
    return { error: 'WebSocket requires CCXT Pro (ccxtType: "pro")' };
  }
  return null;
};

export const websocketRoutes = new Elysia({ prefix: '/api/exchange' })
  .post('/watchTicker', async ({ body, set }) => {
    const { config, symbol } = body;
    const err = requirePro(config, set); if (err) return err;
    const instance = await getCCXTInstance(config);
    if (!instance.has['watchTicker']) { set.status = 400; return { error: 'Exchange does not support watchTicker' }; }
    const ticker = await instance.watchTicker(symbol);
    return { success: true, data: ticker };
  }, { body: watchBody })

  .post('/watchOrderBook', async ({ body, set }) => {
    const { config, symbol, limit } = body;
    const err = requirePro(config, set); if (err) return err;
    const instance = await getCCXTInstance(config);
    if (!instance.has['watchOrderBook']) { set.status = 400; return { error: 'Exchange does not support watchOrderBook' }; }
    const orderbook = await instance.watchOrderBook(symbol, limit);
    return { success: true, data: orderbook };
  }, { body: watchBody })

  .post('/watchTrades', async ({ body, set }) => {
    const { config, symbol } = body;
    const err = requirePro(config, set); if (err) return err;
    const instance = await getCCXTInstance(config);
    if (!instance.has['watchTrades']) { set.status = 400; return { error: 'Exchange does not support watchTrades' }; }
    const trades = await instance.watchTrades(symbol);
    return { success: true, data: trades };
  }, { body: watchBody })

  .post('/watchOHLCV', async ({ body, set }) => {
    const { config, symbol, timeframe } = body;
    const err = requirePro(config, set); if (err) return err;
    const instance = await getCCXTInstance(config);
    if (!instance.has['watchOHLCV']) { set.status = 400; return { error: 'Exchange does not support watchOHLCV' }; }
    const ohlcv = await instance.watchOHLCV(symbol, timeframe);
    return { success: true, data: ohlcv };
  }, { body: watchBody })

  .post('/watchBalance', async ({ body, set }) => {
    const { config } = body;
    const err = requirePro(config, set); if (err) return err;
    if (!config.apiKey || !config.secret) { set.status = 400; return { error: 'API credentials required' }; }
    const instance = await getCCXTInstance(config);
    if (!instance.has['watchBalance']) { set.status = 400; return { error: 'Exchange does not support watchBalance' }; }
    const balance = await instance.watchBalance();
    return { success: true, data: balance };
  }, { body: watchBody })

  .onError(({ error, set }) => {
    set.status = 500;
    return {
      error: 'WebSocket operation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  });
