/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Mode, Direction, SignalGrade, Strategy } from '../types';
import { MarketStructure } from './smc';

const STRATEGY_METADATA: Record<string, { weight: number; description: string }> = {
  'EMA-20 Trend': { 
    weight: 1.0, 
    description: 'The asset price is consistently trading above or below the 20-period Exponential Moving Average (EMA). This confirms the prevailing short-term market momentum and suggests a strong directional trend is in place.' 
  },
  'RSI Oversold': { 
    weight: 1.5, 
    description: 'The Relative Strength Index (RSI) has dropped below the 30 threshold. Historically, this level indicates that selling pressure may be exhausted, creating a high-probability opportunity for a bullish mean-reversion move.' 
  },
  'RSI Overbought': { 
    weight: 1.5, 
    description: 'The Relative Strength Index (RSI) has crossed above 70. This suggests that the asset is overextended to the upside and may be due for a corrective pullback or a period of consolidation as buying interest wanes.' 
  },
  'Hammer': { 
    weight: 2.0, 
    description: 'A bullish reversal candle characterized by a small body near the high and a long lower wick. This suggests that while sellers pushed prices down, buyers aggressively stepped in, reclaiming the level and ending the session strong.' 
  },
  'Shooting Star': { 
    weight: 2.0, 
    description: 'A bearish reversal candle with a long upper shadow and small body near the low. It indicates that buyers attempted to push prices higher but were met with significant supply, leading to a session close near the opening low.' 
  },
  'Bullish Engulfing': { 
    weight: 2.5, 
    description: 'A powerful two-candle pattern where a substantial bullish candle completely encompasses the body of the preceding bearish candle. This marks a clear shift in market psychology from bearishness to aggressive bullish dominance.' 
  },
  'Bearish Engulfing': { 
    weight: 2.5, 
    description: 'A two-candle bearish reversal pattern where a large bearish candle "engulfs" the previous small bullish candle. This signals a sharp rejection of higher prices and a likely transition into a downward trend.' 
  },
  'BOS (BULLISH)': { 
    weight: 2.0, 
    description: 'Break of Structure: Price has successfully closed above a key swing high. This confirms that the market is forming higher highs and higher lows, maintaining a healthy bullish trend structure according to SMC principles.' 
  },
  'BOS (BEARISH)': { 
    weight: 2.0, 
    description: 'Break of Structure: Price has broken and closed below a significant swing low. This validates a bearish structural shift, confirming that lower lows are being formed and the trend is likely to continue downward.' 
  },
  'CHOCH (BULLISH)': { 
    weight: 3.0, 
    description: 'Change of Character: This is the first signal of an impending trend reversal. Price breaks the internal structure (previous LL) to the upside, suggesting that the bearish trend has ended and a new bullish phase is beginning.' 
  },
  'CHOCH (BEARISH)': { 
    weight: 3.0, 
    description: 'Change of Character: A high-probability reversal signal where price breaks its immediate bullish structure (previous HH) to the downside. It signifies that the market character has shifted from supply-demand equilibrium to supply dominance.' 
  },
  'FVG (BULLISH)': { 
    weight: 1.5, 
    description: 'Bullish Fair Value Gap: A large candle creation left an inefficiency (imbalance) in the market. Since markets tend to seek efficiency, these gaps act as magnets, often providing deep retracement entries before the trend resumes.' 
  },
  'FVG (BEARISH)': { 
    weight: 1.5, 
    description: 'Bearish Fair Value Gap: An area of rapid price descent that left a void in liquidity. These zones are highly sensitive and often act as resistance when price retraces to fill the "imbalanced" orders left behind by institutional selling.' 
  },
  'OB (BULLISH)': { 
    weight: 2.5, 
    description: 'Bullish Order Block: A specific zone where institutions previously placed significant buy orders. When price returns to these "Point of Interest" (POI) levels, it often finds strong reactive support due to order mitigations.' 
  },
  'OB (BEARISH)': { 
    weight: 2.5, 
    description: 'Bearish Order Block: A supply zone identified as the last "up" candle before an aggressive downward movement. These blocks represent areas of high institutional selling interest and typically act as formidable resistance lines.' 
  },
  'LIQUIDITY (BULLISH)': { 
    weight: 1.0, 
    description: 'Discount Zone: According to the Fibonacci Premium/Discount model, price is currently trading in the lower 50% of the recent price range. Buying in the discount zone offers a higher statistical edge and better risk-to-reward ratio.' 
  },
  'LIQUIDITY (BEARISH)': { 
    weight: 1.0, 
    description: 'Premium Zone: Price is currently positioned in the upper 50% relative to its recent high/low range. Selling in the premium zone is favored by professionals who wait for "expensive" prices to initiate short positions.' 
  },
  'Bollinger Bands': {
    weight: 1.5,
    description: 'Price is interacting with the outer volatility bands. A touch of the lower band indicates oversold conditions, while the upper band suggests an overextended state.'
  },
};

export function calculateWeightedScore(
  mode: Mode,
  techStrategies: string[],
  smcEntities: MarketStructure[],
  currentPrice: number,
  dynamicWeights: Record<string, number> = {}
): { score: number; confidence: number; direction: Direction; strategies: string[]; strategiesDetails: Strategy[]; reason: string } {
  let score = 0;
  let strategies: string[] = [];
  let strategiesDetails: Strategy[] = [];
  let bullishPoints = 0;
  let bearishPoints = 0;

  // Technical
  techStrategies.forEach(s => {
    const isLongBB = s === 'Bollinger Bands (LONG)';
    const isShortBB = s === 'Bollinger Bands (SHORT)';
    const cleanName = (isLongBB || isShortBB) ? 'Bollinger Bands' : s;
    
    const meta = STRATEGY_METADATA[cleanName] || { weight: 1.0, description: 'Standard technical signal detected.' };
    const weight = dynamicWeights[cleanName] || meta.weight;
    
    if (s.includes('Bullish') || s === 'Hammer' || s.includes('Trend') || s === 'RSI Oversold' || isLongBB) {
       bullishPoints += weight;
    } else {
       bearishPoints += weight;
    }
    strategies.push(cleanName);
    strategiesDetails.push({ name: cleanName, weight: weight, description: meta.description });
  });

  // SMC
  smcEntities.forEach(e => {
    const name = `${e.type} (${e.direction})`;
    const meta = STRATEGY_METADATA[name] || { weight: e.strength, description: `SMC ${e.type} structure detected.` };
    const weight = dynamicWeights[name] || meta.weight;
    
    if (e.direction === 'BULLISH') bullishPoints += weight;
    else bearishPoints += weight;
    
    strategies.push(name);
    strategiesDetails.push({ name, weight: weight, description: meta.description });
  });

  const direction: Direction = bullishPoints >= bearishPoints ? 'LONG' : 'SHORT';
  score = direction === 'LONG' ? bullishPoints : bearishPoints;
  
  const total = bullishPoints + bearishPoints;
  const confidence = total === 0 ? 0 : Math.min(100, Math.round((score / total) * 100));

  // Sort strategies by weight for the reasoning
  const sortedDetails = [...strategiesDetails].sort((a, b) => b.weight - a.weight);
  const topStrats = sortedDetails.slice(0, 2).map(s => s.name).join(' and ');

  let reason = `Strong confluence detected primarily via ${topStrats}. `;
  if (mode === 'SMC_ICT') {
    reason += `The market structure shows a clear ${direction} displacement, suggesting high-probability institutional alignment in the ${direction} direction.`;
  } else {
    reason += `Technical momentum indicators are aligned, showing a robust ${direction} trend with exhaustion in opposing pressure.`;
  }

  return { score, confidence, direction, strategies, strategiesDetails, reason };
}


export function getSignalGrade(score: number, confidence: number): SignalGrade {
  if (score >= 6 && confidence >= 80) return 'A+';
  if (score >= 4 && confidence >= 65) return 'A';
  return 'B';
}
