import ccxt from 'ccxt';

let ccxtPro: any = null;
try {
  ccxtPro = (ccxt as any).pro;
} catch {
  console.warn('CCXT Pro not available, WebSocket features will be disabled');
}

export interface CCXTInstanceConfig {
  exchangeId: string;
  marketType?: string;
  ccxtType?: 'regular' | 'pro';
  apiKey?: string;
  secret?: string;
  password?: string;
  sandbox?: boolean;
}

const instanceCache = new Map<string, { instance: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

export const createCacheKey = (config: CCXTInstanceConfig): string => {
  const parts = [
    config.exchangeId,
    config.marketType || 'spot',
    config.ccxtType || 'regular',
    config.sandbox ? 'sandbox' : 'live',
  ];
  if (config.apiKey) parts.push(config.apiKey.substring(0, 8));
  return parts.join(':');
};

export const getCCXTInstance = async (config: CCXTInstanceConfig): Promise<any> => {
  const cacheKey = createCacheKey(config);
  const cached = instanceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.instance;
  }

  const ccxtType = config.ccxtType || 'regular';
  let ExchangeClass: any;

  if (ccxtType === 'pro') {
    if (!ccxtPro) throw new Error('CCXT Pro not available');
    ExchangeClass = ccxtPro[config.exchangeId];
  } else {
    ExchangeClass = (ccxt as any)[config.exchangeId];
  }

  if (!ExchangeClass) {
    throw new Error(`Exchange ${config.exchangeId} not found in CCXT${ccxtType === 'pro' ? ' Pro' : ''}`);
  }

  const marketType = config.marketType || 'spot';
  const instanceConfig: any = {
    enableRateLimit: true,
    sandbox: config.sandbox || false,
    headers: {
      'User-Agent': 'Profitmaker-Server/3.0',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  };

  if (config.apiKey && config.secret) {
    instanceConfig.apiKey = config.apiKey;
    instanceConfig.secret = config.secret;
    if (config.password) instanceConfig.password = config.password;
  }

  if (marketType === 'futures') {
    instanceConfig.defaultType = 'future';
  } else if (marketType === 'spot') {
    instanceConfig.defaultType = 'spot';
  }

  const exchangeInstance = new ExchangeClass(instanceConfig);

  try {
    await exchangeInstance.loadMarkets();
  } catch (error) {
    console.warn(`Failed to load markets for ${config.exchangeId}:`, error);
  }

  instanceCache.set(cacheKey, { instance: exchangeInstance, timestamp: Date.now() });
  return exchangeInstance;
};

export const cleanupCache = () => {
  const now = Date.now();
  for (const [key, cached] of instanceCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      instanceCache.delete(key);
    }
  }
};

export { ccxtPro };
