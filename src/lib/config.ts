export const STOCK_MARKET_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STOCK_MARKET_URL)
    ? process.env.NEXT_PUBLIC_STOCK_MARKET_URL.replace(/\/$/, '')
    : 'http://arthmantratrading.tech';
