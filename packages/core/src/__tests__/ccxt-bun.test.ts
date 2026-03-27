/**
 * CCXT Integration Tests for Bun runtime
 * Tests all CCXT methods used by widgets:
 * - REST: fetchTicker, fetchOrderBook, fetchTrades, fetchOHLCV, fetchBalance, fetchMyTrades, fetchOpenOrders, fetchPositions
 * - WebSocket: watchTicker, watchOrderBook, watchTrades, watchOHLCV
 *
 * Run: bun test packages/core/src/__tests__/ccxt-bun.test.ts
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import ccxt from 'ccxt';

const EXCHANGE = 'binance';
const SYMBOL = 'BTC/USDT';
const TIMEFRAME = '1m';
const TIMEOUT = 30_000;

let exchange: any;
let proExchange: any;
let initialized = false;

async function ensureInitialized() {
  if (initialized) return;

  // Regular CCXT instance (REST)
  const ExchangeClass = (ccxt as any)[EXCHANGE];
  exchange = new ExchangeClass({
    enableRateLimit: true,
    sandbox: false,
  });
  await exchange.loadMarkets();

  // CCXT Pro instance (WebSocket)
  try {
    const pro = (ccxt as any).pro;
    if (pro && pro[EXCHANGE]) {
      proExchange = new pro[EXCHANGE]({
        enableRateLimit: true,
        sandbox: false,
      });
      await proExchange.loadMarkets();
    }
  } catch {
    console.warn('CCXT Pro not available, WebSocket tests will be skipped');
  }

  initialized = true;
}

// ========== REST TESTS ==========

describe('CCXT REST in Bun', () => {
  test('initialize exchange', async () => {
    await ensureInitialized();
    expect(exchange).toBeDefined();
    expect(Object.keys(exchange.markets).length).toBeGreaterThan(0);
    console.log(`Initialized ${EXCHANGE} with ${Object.keys(exchange.markets).length} markets`);
  }, 60_000);

  test('fetchTicker returns valid ticker', async () => {
    await ensureInitialized();
    const ticker = await exchange.fetchTicker(SYMBOL);

    expect(ticker).toBeDefined();
    expect(ticker.symbol).toBe(SYMBOL);
    expect(typeof ticker.bid).toBe('number');
    expect(typeof ticker.ask).toBe('number');
    expect(ticker.bid).toBeGreaterThan(0);
    expect(ticker.ask).toBeGreaterThan(0);
    expect(ticker.ask).toBeGreaterThanOrEqual(ticker.bid);

    console.log(`fetchTicker: ${SYMBOL} bid=${ticker.bid} ask=${ticker.ask}`);
  }, TIMEOUT);

  test('fetchOrderBook returns bids and asks', async () => {
    await ensureInitialized();
    const ob = await exchange.fetchOrderBook(SYMBOL, 10);

    expect(ob).toBeDefined();
    expect(ob.bids).toBeInstanceOf(Array);
    expect(ob.asks).toBeInstanceOf(Array);
    expect(ob.bids.length).toBeGreaterThan(0);
    expect(ob.asks.length).toBeGreaterThan(0);

    // Bid format: [price, amount]
    expect(ob.bids[0].length).toBeGreaterThanOrEqual(2);
    expect(typeof ob.bids[0][0]).toBe('number');
    expect(typeof ob.bids[0][1]).toBe('number');

    // Best bid < best ask (no crossed book)
    expect(ob.bids[0][0]).toBeLessThan(ob.asks[0][0]);

    console.log(`fetchOrderBook: ${ob.bids.length} bids, ${ob.asks.length} asks, spread=${ob.asks[0][0] - ob.bids[0][0]}`);
  }, TIMEOUT);

  test('fetchTrades returns recent trades', async () => {
    await ensureInitialized();
    const trades = await exchange.fetchTrades(SYMBOL, undefined, 20);

    expect(trades).toBeInstanceOf(Array);
    expect(trades.length).toBeGreaterThan(0);

    const trade = trades[0];
    expect(trade.id).toBeDefined();
    expect(typeof trade.timestamp).toBe('number');
    expect(typeof trade.price).toBe('number');
    expect(typeof trade.amount).toBe('number');
    expect(['buy', 'sell']).toContain(trade.side);
    expect(trade.price).toBeGreaterThan(0);

    console.log(`fetchTrades: ${trades.length} trades, latest price=${trades[trades.length - 1].price}`);
  }, TIMEOUT);

  test('fetchOHLCV returns candles', async () => {
    await ensureInitialized();
    const candles = await exchange.fetchOHLCV(SYMBOL, TIMEFRAME, undefined, 100);

    expect(candles).toBeInstanceOf(Array);
    expect(candles.length).toBeGreaterThan(0);

    // Candle format: [timestamp, open, high, low, close, volume]
    const candle = candles[0];
    expect(candle.length).toBeGreaterThanOrEqual(6);
    expect(typeof candle[0]).toBe('number'); // timestamp
    expect(typeof candle[1]).toBe('number'); // open
    expect(typeof candle[2]).toBe('number'); // high
    expect(typeof candle[3]).toBe('number'); // low
    expect(typeof candle[4]).toBe('number'); // close
    expect(typeof candle[5]).toBe('number'); // volume

    // high >= low
    expect(candle[2]).toBeGreaterThanOrEqual(candle[3]);
    // high >= open and high >= close
    expect(candle[2]).toBeGreaterThanOrEqual(candle[1]);
    expect(candle[2]).toBeGreaterThanOrEqual(candle[4]);

    console.log(`fetchOHLCV: ${candles.length} candles, timeframe=${TIMEFRAME}`);
  }, TIMEOUT);

  test('exchange.has reports capabilities correctly', async () => {
    await ensureInitialized();
    expect(exchange.has).toBeDefined();
    expect(exchange.has.fetchTicker).toBeTruthy();
    expect(exchange.has.fetchOrderBook).toBeTruthy();
    expect(exchange.has.fetchTrades).toBeTruthy();
    expect(exchange.has.fetchOHLCV).toBeTruthy();

    console.log('exchange.has keys:', Object.entries(exchange.has)
      .filter(([_, v]) => v === true)
      .map(([k]) => k)
      .slice(0, 20)
      .join(', '));
  });

  test('exchange.markets loaded correctly', async () => {
    await ensureInitialized();
    expect(exchange.markets).toBeDefined();
    expect(Object.keys(exchange.markets).length).toBeGreaterThan(100);

    const btcUsdt = exchange.markets[SYMBOL];
    expect(btcUsdt).toBeDefined();
    expect(btcUsdt.active).toBe(true);
    expect(btcUsdt.type).toBe('spot');

    console.log(`markets: ${Object.keys(exchange.markets).length} total, ${SYMBOL} active=${btcUsdt.active}`);
  });

  test('exchange.timeframes available', async () => {
    await ensureInitialized();
    expect(exchange.timeframes).toBeDefined();
    expect(Object.keys(exchange.timeframes).length).toBeGreaterThan(0);
    expect(exchange.timeframes['1m']).toBeDefined();
    expect(exchange.timeframes['1h']).toBeDefined();
    expect(exchange.timeframes['1d']).toBeDefined();

    console.log('timeframes:', Object.keys(exchange.timeframes).join(', '));
  });

  test('multiple exchanges can be instantiated', async () => {
    await ensureInitialized();
    const exchanges = ['bybit', 'okx', 'kucoin'];

    for (const id of exchanges) {
      const ExClass = (ccxt as any)[id];
      if (!ExClass) {
        console.warn(`Exchange ${id} not found in CCXT, skipping`);
        continue;
      }

      const ex = new ExClass({ enableRateLimit: true });
      await ex.loadMarkets();

      expect(Object.keys(ex.markets).length).toBeGreaterThan(0);
      console.log(`${id}: ${Object.keys(ex.markets).length} markets loaded`);
    }
  }, 60_000);
});

// ========== WEBSOCKET TESTS ==========

describe('CCXT Pro WebSocket in Bun', () => {
  test('watchTicker streams live data', async () => {
    await ensureInitialized();
    if (!proExchange) {
      console.warn('Skipping: CCXT Pro not available');
      return;
    }

    const ticker = await proExchange.watchTicker(SYMBOL);

    expect(ticker).toBeDefined();
    expect(ticker.symbol).toBe(SYMBOL);
    expect(typeof ticker.bid).toBe('number');
    expect(typeof ticker.ask).toBe('number');
    expect(ticker.bid).toBeGreaterThan(0);

    console.log(`watchTicker: ${SYMBOL} bid=${ticker.bid} ask=${ticker.ask}`);
  }, TIMEOUT);

  test('watchOrderBook streams live order book', async () => {
    await ensureInitialized();
    if (!proExchange) {
      console.warn('Skipping: CCXT Pro not available');
      return;
    }

    const ob = await proExchange.watchOrderBook(SYMBOL);

    expect(ob).toBeDefined();
    expect(ob.bids.length).toBeGreaterThan(0);
    expect(ob.asks.length).toBeGreaterThan(0);
    expect(ob.bids[0][0]).toBeLessThan(ob.asks[0][0]);

    console.log(`watchOrderBook: ${ob.bids.length} bids, ${ob.asks.length} asks`);
  }, TIMEOUT);

  test('watchTrades streams live trades', async () => {
    await ensureInitialized();
    if (!proExchange) {
      console.warn('Skipping: CCXT Pro not available');
      return;
    }

    const trades = await proExchange.watchTrades(SYMBOL);

    expect(trades).toBeInstanceOf(Array);
    expect(trades.length).toBeGreaterThan(0);
    expect(typeof trades[0].price).toBe('number');
    expect(['buy', 'sell']).toContain(trades[0].side);

    console.log(`watchTrades: ${trades.length} trades received`);
  }, TIMEOUT);

  test('watchOHLCV streams live candles', async () => {
    await ensureInitialized();
    if (!proExchange) {
      console.warn('Skipping: CCXT Pro not available');
      return;
    }

    if (!proExchange.has.watchOHLCV) {
      console.warn(`Skipping: ${EXCHANGE} does not support watchOHLCV`);
      return;
    }

    const candles = await proExchange.watchOHLCV(SYMBOL, TIMEFRAME);

    expect(candles).toBeInstanceOf(Array);
    expect(candles.length).toBeGreaterThan(0);
    expect(candles[0].length).toBeGreaterThanOrEqual(6);

    console.log(`watchOHLCV: ${candles.length} candles received`);
  }, TIMEOUT);
});

// ========== AUTHENTICATED TESTS (skipped without keys) ==========

describe('CCXT Authenticated Methods (skipped without API keys)', () => {
  const hasKeys = !!process.env.BINANCE_API_KEY;

  test.skipIf(!hasKeys)('fetchBalance returns wallet data', async () => {
    const authedExchange = new (ccxt as any)[EXCHANGE]({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_SECRET,
      enableRateLimit: true,
    });
    await authedExchange.loadMarkets();

    const balance = await authedExchange.fetchBalance();

    expect(balance).toBeDefined();
    expect(balance.info).toBeDefined();

    const nonZero = Object.entries(balance)
      .filter(([k, v]: [string, any]) =>
        k !== 'info' && k !== 'datetime' && k !== 'timestamp' &&
        v && typeof v === 'object' && (v.total > 0)
      );

    console.log(`fetchBalance: ${nonZero.length} currencies with balance`);
  }, TIMEOUT);

  test.skipIf(!hasKeys)('fetchMyTrades returns trade history', async () => {
    const authedExchange = new (ccxt as any)[EXCHANGE]({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_SECRET,
      enableRateLimit: true,
    });
    await authedExchange.loadMarkets();

    const trades = await authedExchange.fetchMyTrades(SYMBOL, undefined, 10);

    expect(trades).toBeInstanceOf(Array);
    // May be empty if no trades
    if (trades.length > 0) {
      expect(trades[0].symbol).toBe(SYMBOL);
      expect(typeof trades[0].price).toBe('number');
    }

    console.log(`fetchMyTrades: ${trades.length} trades`);
  }, TIMEOUT);

  test.skipIf(!hasKeys)('fetchOpenOrders returns open orders', async () => {
    const authedExchange = new (ccxt as any)[EXCHANGE]({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_SECRET,
      enableRateLimit: true,
    });
    await authedExchange.loadMarkets();

    const orders = await authedExchange.fetchOpenOrders(SYMBOL);

    expect(orders).toBeInstanceOf(Array);
    orders.forEach((order: any) => {
      expect(order.status).toBe('open');
    });

    console.log(`fetchOpenOrders: ${orders.length} open orders`);
  }, TIMEOUT);

  test.skipIf(!hasKeys)('fetchPositions returns futures positions', async () => {
    const futuresExchange = new (ccxt as any)[EXCHANGE]({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_SECRET,
      enableRateLimit: true,
      defaultType: 'future',
    });
    await futuresExchange.loadMarkets();

    if (!futuresExchange.has.fetchPositions) {
      console.warn('fetchPositions not supported');
      return;
    }

    const positions = await futuresExchange.fetchPositions();

    expect(positions).toBeInstanceOf(Array);

    console.log(`fetchPositions: ${positions.length} positions`);
  }, TIMEOUT);
});
