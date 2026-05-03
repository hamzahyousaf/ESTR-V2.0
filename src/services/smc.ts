/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KLine } from '../types';

export interface MarketStructure {
  type: 'BOS' | 'CHOCH' | 'OB' | 'FVG' | 'LIQUIDITY';
  direction: 'BULLISH' | 'BEARISH';
  price: number;
  strength: number;
}

export function detectSMC(klines: KLine[]): MarketStructure[] {
  const result: MarketStructure[] = [];
  if (klines.length < 20) return result;

  const len = klines.length;
  const last3 = klines.slice(-3);
  
  // 1. Fair Value Gap (FVG)
  // Bullish FVG: Low of candle 3 > High of candle 1
  if (klines[len - 1].low > klines[len - 3].high) {
    result.push({
      type: 'FVG',
      direction: 'BULLISH',
      price: (klines[len - 1].low + klines[len - 3].high) / 2,
      strength: 1.5
    });
  }
  // Bearish FVG: High of candle 3 < Low of candle 1
  if (klines[len - 1].high < klines[len - 3].low) {
    result.push({
      type: 'FVG',
      direction: 'BEARISH',
      price: (klines[len - 1].high + klines[len - 3].low) / 2,
      strength: 1.5
    });
  }

  // 2. Order Blocks (Simplified)
  // Bullish OB: Last down candle before a strong up move
  const lastCandle = klines[len-1];
  const prevCandle = klines[len-2];
  if (lastCandle.close > lastCandle.open && prevCandle.open > prevCandle.close && lastCandle.close > prevCandle.high) {
     result.push({
      type: 'OB',
      direction: 'BULLISH',
      price: prevCandle.low,
      strength: 2.5
    });
  }
  // Bearish OB: Last up candle before strong down move
  if (lastCandle.open > lastCandle.close && prevCandle.close > prevCandle.open && lastCandle.close < prevCandle.low) {
    result.push({
      type: 'OB',
      direction: 'BEARISH',
      price: prevCandle.high,
      strength: 2.5
    });
  }

  // 3. Simple BOS/CHOCH detection using recent highs/lows
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  
  const recentHigh = Math.max(...highs.slice(-10, -1));
  const recentLow = Math.min(...lows.slice(-10, -1));

  if (lastCandle.close > recentHigh) {
    result.push({
      type: 'BOS',
      direction: 'BULLISH',
      price: recentHigh,
      strength: 2.0
    });
  } else if (lastCandle.close < recentLow) {
    result.push({
      type: 'BOS',
      direction: 'BEARISH',
      price: recentLow,
      strength: 2.0
    });
  }

  // 4. Premium/Discount Zones
  // Based on the last 50 candles' high/low
  const rangeHigh = Math.max(...highs.slice(-50));
  const rangeLow = Math.min(...lows.slice(-50));
  const equilibrium = (rangeHigh + rangeLow) / 2;
  
  if (lastCandle.close > equilibrium) {
    result.push({
      type: 'LIQUIDITY',
      direction: 'BEARISH', // Premium is for shorting
      price: rangeHigh,
      strength: 1.0
    });
  } else {
    result.push({
      type: 'LIQUIDITY',
      direction: 'BULLISH', // Discount is for longing
      price: rangeLow,
      strength: 1.0
    });
  }

  return result;
}
