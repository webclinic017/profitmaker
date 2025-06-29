// CCXT loaded via CDN script tag - available as window.ccxt
declare global {
  interface Window {
    ccxt: any;
  }
}

/**
 * Get CCXT from global object (CDN version)
 */
export const getCCXT = () => {
  if (!window.ccxt) {
    console.error('CCXT not loaded! Check CDN script tag connection');
    return null;
  }
  return window.ccxt;
};

/**
 * Get CCXT Pro (for WebSocket)
 */
export const getCCXTPro = () => {
  const ccxt = getCCXT();
  if (ccxt && ccxt.pro) {
    return ccxt.pro;
  }
  
  console.error('❌ CCXT Pro not available. Make sure you are using the full CCXT version with WebSocket support');
  return null;
}; 