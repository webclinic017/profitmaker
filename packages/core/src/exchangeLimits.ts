/**
 * CCXT Exchange-specific limits configuration
 * Based on exchange documentation and CCXT implementation
 */

export interface ExchangeLimits {
  ohlcv: number;     // Max candles per fetchOHLCV request
  trades: number;    // Max trades per fetchTrades request
  rateLimit: number; // Default rate limit in ms
}

/**
 * Exchange-specific limits based on official documentation and testing
 * Sources:
 * - Freqtrade documentation
 * - CCXT source code
 * - Exchange API documentation
 */
export const EXCHANGE_LIMITS: Record<string, ExchangeLimits> = {
  // Binance - Very generous limits
  binance: {
    ohlcv: 1000,    // Up to 1000 candles
    trades: 1000,   // Up to 1000 trades
    rateLimit: 100  // 100ms between requests
  },
  
  // Binance US - Same as international
  binanceus: {
    ohlcv: 1000,
    trades: 1000,
    rateLimit: 100
  },
  
  // OKX - Limited to 100 candles per documentation
  okx: {
    ohlcv: 100,     // Limited to 100 candles per API call
    trades: 100,
    rateLimit: 200
  },
  
  // MyOKX (EEA) - Same as OKX
  myokx: {
    ohlcv: 100,
    trades: 100,
    rateLimit: 200
  },
  
  // Kraken - Very limited historical data
  kraken: {
    ohlcv: 720,     // Only 720 historical candles available
    trades: 1000,
    rateLimit: 3100 // 3.1s between requests to avoid bans
  },
  
  // KuCoin - Good limits
  kucoin: {
    ohlcv: 1500,    // Up to 1500 candles
    trades: 1000,
    rateLimit: 200
  },
  
  // Bybit - Good limits
  bybit: {
    ohlcv: 1000,
    trades: 1000,
    rateLimit: 100
  },
  
  // Gate.io - Good limits
  gateio: {
    ohlcv: 1000,
    trades: 1000,
    rateLimit: 200
  },
  
  // HTX (Huobi) - Decent limits
  htx: {
    ohlcv: 1000,
    trades: 2000,
    rateLimit: 100
  },
  
  // Huobi - Same as HTX
  huobi: {
    ohlcv: 1000,
    trades: 2000,
    rateLimit: 100
  },
  
  // Bitfinex - Good limits
  bitfinex: {
    ohlcv: 10000,   // Very generous limit
    trades: 10000,
    rateLimit: 1500
  },
  
  // Coinbase - Moderate limits
  coinbase: {
    ohlcv: 300,
    trades: 1000,
    rateLimit: 1000
  },
  
  // Coinbase Advanced
  coinbaseadvanced: {
    ohlcv: 300,
    trades: 1000,
    rateLimit: 1000
  },
  
  // Hyperliquid - High limit but limited history
  hyperliquid: {
    ohlcv: 5000,    // 5000 candles but limited historical data
    trades: 1000,
    rateLimit: 200
  },
  
  // Phemex - Good limits
  phemex: {
    ohlcv: 1000,
    trades: 1000,
    rateLimit: 100
  },
  
  // Bingx - Good limits
  bingx: {
    ohlcv: 1000,
    trades: 1000,
    rateLimit: 100
  },
  
  // MEXC - Good limits
  mexc: {
    ohlcv: 1000,
    trades: 1000,
    rateLimit: 50
  },
  
  // Bitvavo - Moderate limits
  bitvavo: {
    ohlcv: 1440,    // 1440 candles (24 hours of 1m candles)
    trades: 1000,
    rateLimit: 200
  },
  
  // Default limits for unknown exchanges
  default: {
    ohlcv: 500,     // Conservative default
    trades: 500,
    rateLimit: 1000 // 1 second default rate limit
  }
};

/**
 * Get limits for specific exchange
 */
export function getExchangeLimits(exchange: string): ExchangeLimits {
  const exchangeLower = exchange.toLowerCase();
  return EXCHANGE_LIMITS[exchangeLower] || EXCHANGE_LIMITS.default;
}

/**
 * Get optimal OHLCV limit for exchange
 */
export function getOHLCVLimit(exchange: string): number {
  return getExchangeLimits(exchange).ohlcv;
}

/**
 * Get optimal trades limit for exchange
 */
export function getTradesLimit(exchange: string): number {
  return getExchangeLimits(exchange).trades;
}

/**
 * Get rate limit for exchange
 */
export function getRateLimit(exchange: string): number {
  return getExchangeLimits(exchange).rateLimit;
}

/**
 * Validate and log exchange limits usage
 */
export function logExchangeLimits(exchange: string, requestedLimit: number, dataType: 'ohlcv' | 'trades'): void {
  const limits = getExchangeLimits(exchange);
  const maxLimit = dataType === 'ohlcv' ? limits.ohlcv : limits.trades;
  
  if (requestedLimit > maxLimit) {
    console.warn(`⚠️ [${exchange}] Requested ${dataType} limit (${requestedLimit}) exceeds maximum (${maxLimit}). Using maximum.`);
  } else {
    console.log(`✅ [${exchange}] Using ${dataType} limit: ${requestedLimit}/${maxLimit}`);
  }
} 