/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KLine } from '../types';

export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  let ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  let rsi = new Array(data.length).fill(50);
  if (data.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }

  return rsi;
}

export function detectCandlestickPatterns(klines: KLine[]) {
  const last = klines[klines.length - 1];
  const prev = klines[klines.length - 2];
  
  const bodySize = Math.abs(last.close - last.open);
  const totalSize = last.high - last.low;
  const upperShadow = last.high - Math.max(last.open, last.close);
  const lowerShadow = Math.min(last.open, last.close) - last.low;
  
  const patterns = [];

  // Hammer
  if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
    patterns.push('Hammer');
  }

  // Shooting Star
  if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5) {
    patterns.push('Shooting Star');
  }

  // Bullish Engulfing
  if (last.close > last.open && prev.open > prev.close && last.close > prev.open && last.open < prev.close) {
    patterns.push('Bullish Engulfing');
  }

  // Bearish Engulfing
  if (last.open > last.close && prev.close > prev.open && last.open > prev.close && last.close < prev.open) {
    patterns.push('Bearish Engulfing');
  }

  return patterns;
}

export function calculateBollingerBands(data: number[], period: number = 20, multiplier: number = 2) {
  if (data.length < period) return null;
  
  const slice = data.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    sma,
    upper: sma + stdDev * multiplier,
    lower: sma - stdDev * multiplier
  };
}
