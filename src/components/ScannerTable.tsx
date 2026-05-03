/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Info, Send, ExternalLink, Flame } from 'lucide-react';
import { ScanResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface ScannerTableProps {
  results: ScanResult[];
  activeSignal: ScanResult | null;
  onSelect: (result: ScanResult) => void;
}

export const ScannerTable: React.FC<ScannerTableProps> = ({ results, activeSignal, onSelect }) => {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-bento-muted gap-4">
        <TrendingUp className="w-8 h-8 opacity-20" />
        <p className="text-xs font-bold uppercase tracking-widest">No signals found</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[100px_80px_60px_80px_1fr] gap-4 px-4 py-2 border-b border-bento-border text-[10px] font-black text-bento-muted uppercase tracking-widest">
        <span>Symbol</span>
        <span>Dir</span>
        <span>Score</span>
        <span>RR</span>
        <span>Strategies Triggered</span>
      </div>

      {/* Rows */}
      <div className="mt-2 space-y-1">
        {results.map((result) => (
          <div
            key={result.symbol}
            onClick={() => onSelect(result)}
            className={`grid grid-cols-[100px_80px_60px_80px_1fr] gap-4 px-4 py-3 items-center cursor-pointer transition-all rounded-lg group ${
              activeSignal?.symbol === result.symbol 
                ? 'bg-white/5 ring-1 ring-bento-border' 
                : 'hover:bg-white/5'
            }`}
          >
            <span className="text-sm font-black tracking-tight">{result.symbol}</span>
            
            <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border w-fit ${
              result.direction === 'LONG' 
                ? 'bg-bento-green/10 text-bento-green border-bento-green/20' 
                : 'bg-bento-red/10 text-bento-red border-bento-red/20'
            }`}>
              {result.direction}
            </div>

            <span className="font-mono text-bento-gold text-xs font-bold">{result.score.toFixed(1)}</span>
            
            <span className="font-mono text-xs text-slate-400">1:{result.rr.toFixed(1)}</span>

            <div className="flex gap-2 overflow-hidden items-center">
              {result.strategies.slice(0, 2).map((s, i) => (
                <span key={i} className="text-[10px] text-bento-muted whitespace-nowrap bg-white/5 px-2 py-0.5 rounded">
                  {s}
                </span>
              ))}
              {result.strategies.length > 2 && (
                <span className="text-[10px] text-bento-muted">+{result.strategies.length - 2}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
