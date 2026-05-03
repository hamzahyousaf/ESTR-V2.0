/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KLine } from '../types';

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

export async function getTopSymbols(scanType: 'GAINERS' | 'VOLUME' = 'VOLUME', limit: number = 50): Promise<string[]> {
  try {
    const response = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/ticker/24hr`);
    if (!response.ok) {
      console.error('Binance API error:', response.statusText);
      return [];
    }
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('Unexpected Binance API response format');
      return [];
    }

    const pairs = data.filter((item: any) => item.symbol.endsWith('USDT'));

    if (scanType === 'GAINERS') {
      return pairs
        .sort((a: any, b: any) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
        .slice(0, limit)
        .map((item: any) => item.symbol);
    } else {
      return pairs
        .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit)
        .map((item: any) => item.symbol);
    }
  } catch (error) {
    console.error('Error fetching symbols:', error);
    return [];
  }
}

export async function getKlines(symbol: string, interval: string, limit: number = 100): Promise<KLine[]> {
  try {
    const response = await fetch(
      `${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    const data = await response.json();
    
    return data.map((item: any) => ({
      time: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error);
    return [];
  }
}

export async function getCurrentPrice(symbol: string): Promise<number> {
  try {
    const response = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/ticker/price?symbol=${symbol}`);
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return 0;
  }
}
