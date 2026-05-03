/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Mode = 'TECHNICAL' | 'SMC_ICT';

export type ScanType = 'GAINERS' | 'VOLUME';

export type Direction = 'LONG' | 'SHORT';

export type SignalGrade = 'A+' | 'A' | 'B';

export interface Strategy {
  name: string;
  weight: number;
  description: string;
}

export interface KLine {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ScanResult {
  id?: string; // Firestore ID
  symbol: string;
  mode: Mode;
  direction: Direction;
  score: number;
  confidence: number;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  strategies: string[];
  strategiesDetails: Strategy[];
  reason: string;
  price: number;
  timestamp: number;
  grade: SignalGrade;
  outcome?: 'PENDING' | 'TP HIT' | 'SL HIT';
  profitPercent?: number;
  notes?: string;
  activeIndicators?: Record<string, any>;
}

export interface ScannerSettings {
  mode: Mode;
  scanType: ScanType;
  minScore: number;
  minRR: number;
  coinLimit: number;
  volumeFilter: boolean;
  volumeThreshold: number;
  trendStrengthFilter: boolean;
  refreshInterval: number;
  telegramToken?: string;
  telegramChatId?: string;
  autoSendTelegram: boolean;
  autoScan: boolean;
  timeframe: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  isWhitelisted: boolean;
}
