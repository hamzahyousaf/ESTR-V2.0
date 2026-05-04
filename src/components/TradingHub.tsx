import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Key, Settings, Zap, History, LayoutGrid, Terminal, Activity, AlertCircle } from 'lucide-react';
import { UserTradingConfig, AppUser } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface TradingHubProps {
  user: AppUser;
}

export const TradingHub: React.FC<TradingHubProps> = ({ user }) => {
  const [config, setConfig] = useState<UserTradingConfig>({
    binanceApiKey: '',
    binanceApiSecret: '',
    bybitApiKey: '',
    bybitApiSecret: '',
    autoTradeEnabled: false,
    leverage: 20,
    riskPerTrade: 1,
    exchange: 'BINANCE'
  });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!user.uid) return;
    
    const unsub = onSnapshot(doc(db, 'trading_configs', user.uid), (snap) => {
      if (snap.exists()) {
        setConfig(prev => ({ ...prev, ...snap.data() }));
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user.uid]);

  const handleSave = async () => {
    setSaveLoading(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'trading_configs', user.uid), config);
      setMessage({ type: 'success', text: 'Trading configuration updated and synced.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Permission denied. Check firewall settings.' });
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 text-bento-gold animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-12 gap-3 h-full overflow-hidden"
    >
      {/* Configuration Panel */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-3 min-h-0">
        <div className="bg-bento-card border border-bento-border rounded-xl p-6 flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity">
            <Key className="w-48 h-48" />
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-bento-gold/10 rounded-xl border border-bento-gold/20">
                <Settings className="w-5 h-5 text-bento-gold" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Trade Bridge Protocol</h2>
                <p className="text-[10px] text-bento-muted font-bold uppercase tracking-tighter">Secure API Integration Matrix</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-bento-muted uppercase">Global Auto-Trade</label>
              <button 
                onClick={() => setConfig({ ...config, autoTradeEnabled: !config.autoTradeEnabled })}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${config.autoTradeEnabled ? 'bg-bento-green' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${config.autoTradeEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Binance Section */}
            <div className="space-y-4 p-5 bg-black/40 rounded-2xl border border-white/5 hover:border-bento-gold/20 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-bento-gold shadow-[0_0_8px_rgba(255,215,0,0.5)]"></div>
                <span className="text-[11px] font-black text-white uppercase tracking-widest">Binance Futures (F-API)</span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-bento-muted uppercase tracking-wider">Public Key</label>
                  <input 
                    type="password"
                    value={config.binanceApiKey}
                    onChange={(e) => setConfig({ ...config, binanceApiKey: e.target.value })}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-lg py-2 px-3 text-xs font-mono text-white focus:border-bento-gold outline-none transition-all"
                    placeholder="********************"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-bento-muted uppercase tracking-wider">Secret Key</label>
                  <input 
                    type="password"
                    value={config.binanceApiSecret}
                    onChange={(e) => setConfig({ ...config, binanceApiSecret: e.target.value })}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-lg py-2 px-3 text-xs font-mono text-white focus:border-bento-gold outline-none transition-all"
                    placeholder="********************"
                  />
                </div>
              </div>
            </div>

            {/* Bybit Section */}
            <div className="space-y-4 p-5 bg-black/40 rounded-2xl border border-white/5 hover:border-bento-gold/20 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-bento-blue shadow-[0_0_8px_rgba(0,120,255,0.5)]"></div>
                <span className="text-[11px] font-black text-white uppercase tracking-widest">Bybit Unified (V5)</span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-bento-muted uppercase tracking-wider">Public Key</label>
                  <input 
                    type="password"
                    value={config.bybitApiKey}
                    onChange={(e) => setConfig({ ...config, bybitApiKey: e.target.value })}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-lg py-2 px-3 text-xs font-mono text-white focus:border-bento-gold outline-none transition-all"
                    placeholder="********************"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-bento-muted uppercase tracking-wider">Secret Key</label>
                  <input 
                    type="password"
                    value={config.bybitApiSecret}
                    onChange={(e) => setConfig({ ...config, bybitApiSecret: e.target.value })}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-lg py-2 px-3 text-xs font-mono text-white focus:border-bento-gold outline-none transition-all"
                    placeholder="********************"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-2 relative z-10">
            <div className="space-y-1.5 focus-within:scale-[1.02] transition-transform">
              <label className="text-[9px] font-bold text-bento-muted uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3 h-3" /> Leverage (X)
              </label>
              <input 
                type="number" 
                value={config.leverage}
                onChange={(e) => setConfig({ ...config, leverage: parseInt(e.target.value) })}
                className="w-full bg-black/50 border border-white/5 rounded-xl py-3 px-4 text-sm font-black text-bento-gold focus:border-bento-gold outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5 focus-within:scale-[1.02] transition-transform">
              <label className="text-[9px] font-bold text-bento-muted uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> Risk Per Trade (%)
              </label>
              <input 
                type="number" 
                step="0.1"
                value={config.riskPerTrade}
                onChange={(e) => setConfig({ ...config, riskPerTrade: parseFloat(e.target.value) })}
                className="w-full bg-black/50 border border-white/5 rounded-xl py-3 px-4 text-sm font-black text-bento-blue focus:border-bento-blue outline-none transition-all"
              />
            </div>
            <div className="flex items-end pb-1">
                <button 
                  onClick={handleSave}
                  disabled={saveLoading}
                  className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${
                    saveLoading ? 'bg-slate-700 text-slate-400' : 'bg-white text-black hover:bg-slate-200 active:scale-95'
                  }`}
                >
                  {saveLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                  Finalize Handshake
                </button>
            </div>
          </div>

          {message && (
            <div className={`mt-2 p-3 rounded-xl text-[10px] font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                message.type === 'success' ? 'bg-bento-green/10 text-bento-green border border-bento-green/20' : 'bg-bento-red/10 text-bento-red border border-bento-red/20'
            }`}>
                {message.type === 'success' ? <Zap className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
            </div>
          )}
        </div>

        {/* Execution Engine Status */}
        <div className="bg-gradient-to-br from-bento-card to-bento-bg border border-bento-border rounded-xl p-6 flex-1 relative overflow-hidden flex flex-col group">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-bento-blue/10 rounded-lg border border-bento-blue/20">
                        <Terminal className="w-4 h-4 text-bento-blue" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Execution Engine Logs</h3>
                        <p className="text-[9px] text-bento-muted font-bold uppercase">Real-time Trade Pulse</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-bento-green animate-pulse"></span>
                    <span className="text-[8px] font-black text-bento-green uppercase">Engine Active</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar font-mono text-[9px]">
                <div className="flex gap-3 text-bento-muted opacity-50">
                    <span className="text-white font-bold">[SYSTEM]</span>
                    <span>Broadcasting neural signal sync...</span>
                </div>
                <div className="flex gap-3 text-bento-muted opacity-50">
                    <span className="text-white font-bold">[ENGINE]</span>
                    <span>Awaiting signal confirmation from Scanners...</span>
                </div>
                {config.autoTradeEnabled ? (
                    <div className="flex gap-3 text-bento-blue">
                        <span className="font-bold">[READY]</span>
                        <span>Auto-Trading engaged on {config.exchange}. Risk Profile: {config.riskPerTrade}% | Lev: {config.leverage}x</span>
                    </div>
                ) : (
                    <div className="flex gap-3 text-bento-red opacity-80">
                        <span className="font-bold">[HALTED]</span>
                        <span>Auto-Trading disabled. Manual intervention required for executions.</span>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Account Overview / Stats */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
        <div className="bg-bento-card border border-bento-border rounded-xl p-6 flex flex-col gap-6 relative overflow-hidden">
            <div className="space-y-4">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                    <label className="text-[9px] font-bold text-bento-muted uppercase tracking-[0.2em] block">TOTAL NET RISK</label>
                    <div className="text-2xl font-black text-white tracking-tighter">$0.00 <span className="text-xs text-bento-muted font-normal">USDT</span></div>
                    <div className="flex items-center gap-2 text-[10px] text-bento-green font-bold">
                        <Zap className="w-3 h-3" /> +0.0% Session PNL
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-center">
                        <div className="text-[8px] text-bento-muted font-bold uppercase mb-1">Open Positions</div>
                        <div className="text-lg font-black text-white leading-none">0</div>
                    </div>
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-center">
                        <div className="text-[8px] text-bento-muted font-bold uppercase mb-1">Trades Today</div>
                        <div className="text-lg font-black text-white leading-none">0</div>
                    </div>
                </div>
            </div>

            <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Active Orders</h3>
                    <div className="h-px bg-white/5 flex-1 mx-4"></div>
                </div>
                
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                    <Activity className="w-8 h-8 text-bento-muted mb-3" />
                    <p className="text-[9px] font-bold text-bento-muted uppercase tracking-widest leading-loose">No Active Signal Bridges<br/>Awaiting Tactical Entry</p>
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

import { RefreshCw } from 'lucide-react';
