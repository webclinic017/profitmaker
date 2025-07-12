import express from 'express';
import cors from 'cors';
import ccxt from 'ccxt';

// Try to import CCXT Pro, fallback if not available
let ccxtPro: any = null;
try {
  ccxtPro = (ccxt as any).pro;
} catch (error) {
  console.warn('⚠️ CCXT Pro not available, WebSocket features will be disabled');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins to bypass CORS issues
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));
app.use(express.json());

// Authentication middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Simple token validation - in production use proper JWT validation
  const validToken = process.env.API_TOKEN || 'your-secret-token';
  if (token !== validToken) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  next();
};

// Apply authentication to all routes except health check
app.use((req, res, next) => {
  if (req.path === '/health') {
    next();
  } else {
    authenticateToken(req, res, next);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CCXT instance cache
const instanceCache = new Map<string, any>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

interface CCXTInstanceConfig {
  exchangeId: string;
  marketType: string;
  ccxtType: 'regular' | 'pro';
  apiKey?: string;
  secret?: string;
  password?: string;
  sandbox?: boolean;
}

// Create cache key for CCXT instance
const createCacheKey = (config: CCXTInstanceConfig): string => {
  const keyParts = [
    config.exchangeId,
    config.marketType,
    config.ccxtType,
    config.sandbox ? 'sandbox' : 'live'
  ];
  
  if (config.apiKey) {
    keyParts.push(config.apiKey.substring(0, 8)); // First 8 chars for uniqueness
  }
  
  return keyParts.join(':');
};

// Get or create CCXT instance
const getCCXTInstance = async (config: CCXTInstanceConfig): Promise<any> => {
  const cacheKey = createCacheKey(config);
  const cached = instanceCache.get(cacheKey);
  
  // Check cache validity
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`📋 Using cached instance for ${cacheKey}`);
    return cached.instance;
  }
  
  console.log(`🔄 Creating new instance for ${cacheKey}`);
  
  // Select CCXT library
  let ccxtLib: any;
  let ExchangeClass: any;

  if (config.ccxtType === 'pro') {
    if (!ccxtPro) {
      throw new Error('CCXT Pro not available');
    }
    ccxtLib = ccxtPro;
    ExchangeClass = ccxtLib[config.exchangeId];
  } else {
    ccxtLib = ccxt;
    ExchangeClass = ccxtLib[config.exchangeId];
  }

  if (!ExchangeClass) {
    throw new Error(`Exchange ${config.exchangeId} not found in CCXT${config.ccxtType === 'pro' ? ' Pro' : ''}`);
  }
  
  // Create instance config
  const instanceConfig: any = {
    enableRateLimit: true,
    sandbox: config.sandbox || false,
    // Configure for server-side usage to bypass CORS
    headers: {
      'User-Agent': 'CCXT-Express-Server/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    // Disable browser-specific features
    agent: false, // Disable HTTP agent for server usage
    timeout: 30000,
  };
  
  // Add credentials if provided
  if (config.apiKey && config.secret) {
    instanceConfig.apiKey = config.apiKey;
    instanceConfig.secret = config.secret;
    if (config.password) {
      instanceConfig.password = config.password;
    }
  }
  
  // Set market type
  if (config.marketType === 'futures') {
    instanceConfig.defaultType = 'future';
  } else if (config.marketType === 'spot') {
    instanceConfig.defaultType = 'spot';
  }
  
  const exchangeInstance = new ExchangeClass(instanceConfig);
  
  // Load markets
  try {
    await exchangeInstance.loadMarkets();
    console.log(`✅ Markets loaded for ${config.exchangeId}`);
  } catch (error) {
    console.warn(`⚠️ Failed to load markets for ${config.exchangeId}:`, error);
  }
  
  // Cache instance
  instanceCache.set(cacheKey, {
    instance: exchangeInstance,
    timestamp: Date.now()
  });
  
  return exchangeInstance;
};

// Get exchange instance endpoint
app.post('/api/exchange/instance', async (req, res) => {
  try {
    const config: CCXTInstanceConfig = req.body;
    
    if (!config.exchangeId) {
      return res.status(400).json({ error: 'exchangeId is required' });
    }
    
    const instance = await getCCXTInstance(config);
    
    res.json({
      success: true,
      exchangeId: config.exchangeId,
      marketType: config.marketType || 'spot',
      ccxtType: config.ccxtType || 'regular',
      sandbox: config.sandbox || false,
      hasCredentials: !!(config.apiKey && config.secret)
    });
  } catch (error) {
    console.error('Failed to create exchange instance:', error);
    res.status(500).json({ 
      error: 'Failed to create exchange instance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fetch market data endpoints
app.post('/api/exchange/fetchTicker', async (req, res) => {
  try {
    const { config, symbol } = req.body;
    const instance = await getCCXTInstance(config);
    const ticker = await instance.fetchTicker(symbol);
    res.json({ success: true, data: ticker });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch ticker',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/fetchOrderBook', async (req, res) => {
  try {
    const { config, symbol, limit } = req.body;
    const instance = await getCCXTInstance(config);
    const orderbook = await instance.fetchOrderBook(symbol, limit);
    res.json({ success: true, data: orderbook });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch orderbook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/fetchTrades', async (req, res) => {
  try {
    const { config, symbol, limit } = req.body;
    const instance = await getCCXTInstance(config);
    const trades = await instance.fetchTrades(symbol, undefined, limit);
    res.json({ success: true, data: trades });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch trades',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/fetchOHLCV', async (req, res) => {
  try {
    const { config, symbol, timeframe, limit } = req.body;
    const instance = await getCCXTInstance(config);
    const ohlcv = await instance.fetchOHLCV(symbol, timeframe, undefined, limit);
    res.json({ success: true, data: ohlcv });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch OHLCV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Trading endpoints (require credentials)
app.post('/api/exchange/fetchBalance', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config.apiKey || !config.secret) {
      return res.status(400).json({ error: 'API credentials required for balance' });
    }
    
    const instance = await getCCXTInstance(config);
    const balance = await instance.fetchBalance();
    res.json({ success: true, data: balance });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// WebSocket endpoints for CCXT Pro
app.post('/api/exchange/watchTicker', async (req, res) => {
  try {
    const { config, symbol } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchTicker']) {
      return res.status(400).json({ error: 'Exchange does not support watchTicker' });
    }

    const ticker = await instance.watchTicker(symbol);
    res.json({ success: true, data: ticker });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch ticker',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/watchOrderBook', async (req, res) => {
  try {
    const { config, symbol, limit } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchOrderBook']) {
      return res.status(400).json({ error: 'Exchange does not support watchOrderBook' });
    }

    const orderbook = await instance.watchOrderBook(symbol, limit);
    res.json({ success: true, data: orderbook });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch orderbook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/watchTrades', async (req, res) => {
  try {
    const { config, symbol } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchTrades']) {
      return res.status(400).json({ error: 'Exchange does not support watchTrades' });
    }

    const trades = await instance.watchTrades(symbol);
    res.json({ success: true, data: trades });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch trades',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/watchOHLCV', async (req, res) => {
  try {
    const { config, symbol, timeframe } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchOHLCV']) {
      return res.status(400).json({ error: 'Exchange does not support watchOHLCV' });
    }

    const ohlcv = await instance.watchOHLCV(symbol, timeframe);
    res.json({ success: true, data: ohlcv });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch OHLCV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/watchBalance', async (req, res) => {
  try {
    const { config } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    if (!config.apiKey || !config.secret) {
      return res.status(400).json({ error: 'API credentials required for balance watching' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchBalance']) {
      return res.status(400).json({ error: 'Exchange does not support watchBalance' });
    }

    const balance = await instance.watchBalance();
    res.json({ success: true, data: balance });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get exchange capabilities
app.post('/api/exchange/capabilities', async (req, res) => {
  try {
    const { config } = req.body;
    const instance = await getCCXTInstance(config);

    res.json({
      success: true,
      data: {
        has: instance.has,
        markets: Object.keys(instance.markets || {}),
        symbols: instance.symbols || [],
        timeframes: instance.timeframes || {},
        fees: instance.fees || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get capabilities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generic HTTP proxy endpoint for bypassing CORS
app.post('/api/proxy/request', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body, timeout = 30000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🌐 [Proxy] ${method} ${url}`);

    // Add CORS-bypass headers
    const proxyHeaders = {
      'User-Agent': 'CCXT-Express-Server/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: proxyHeaders,
      body: body ? JSON.stringify(body) : undefined,
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

    res.status(response.status).json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: parsedData
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      res.status(408).json({
        error: 'Request timeout',
        details: `Request timed out after ${req.body.timeout || 30000}ms`
      });
    } else {
      res.status(500).json({
        error: 'Proxy request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Cleanup cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of instanceCache.entries()) {
    if ((now - cached.timestamp) > CACHE_TTL) {
      instanceCache.delete(key);
      console.log(`🧽 Cleaned up expired instance: ${key}`);
    }
  }
}, 10 * 60 * 1000); // Every 10 minutes

app.listen(PORT, () => {
  console.log(`🚀 CCXT Express Server running on port ${PORT}`);
  console.log(`🔑 API Token: ${process.env.API_TOKEN || 'your-secret-token'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
