/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Settings, RefreshCw, Layers, ShieldCheck, Zap, Filter, LayoutGrid, Brain, ShieldAlert, Cpu, BellRing } from 'lucide-react';
import { ScannerSettings, Mode, AppUser } from '../types';

interface SidebarProps {
  settings: ScannerSettings;
  setSettings: (settings: ScannerSettings) => void;
  onScan: () => void;
  onTestTelegram: () => void;
  isScanning: boolean;
  user: AppUser;
  activeTab: 'SCANNER' | 'AI_HUB' | 'ADMIN';
  setActiveTab: (tab: 'SCANNER' | 'AI_HUB' | 'ADMIN') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ settings, setSettings, onScan, onTestTelegram, isScanning, user, activeTab, setActiveTab }) => {
  return (
    <div className="h-full bg-bento-card border border-bento-border rounded-xl p-6 flex flex-col gap-6 text-white sidebar custom-scrollbar overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 bg-bento-gold rounded-sm"></div>
        <h1 className="text-lg font-bold tracking-tighter uppercase">ESTR<span className="text-bento-gold"> V2.0 PRO</span></h1>
      </div>

      {/* Navigation tabs */}
      <nav className="space-y-1">
        <button
          onClick={() => setActiveTab('SCANNER')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'SCANNER' ? 'bg-bento-gold text-black shadow-lg shadow-bento-gold/10' : 'text-bento-muted hover:bg-white/5 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> SCANNER MATRIX
        </button>
        <button
          onClick={() => setActiveTab('AI_HUB')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'AI_HUB' ? 'bg-bento-gold text-black shadow-lg shadow-bento-gold/10' : 'text-bento-muted hover:bg-white/5 hover:text-white'
          }`}
        >
          <Brain className="w-4 h-4" /> AI HUB AGENTS
        </button>
        {user.isAdmin && (
          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ADMIN' ? 'bg-bento-gold text-black shadow-lg shadow-bento-gold/10' : 'text-bento-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> ADMINISTRATOR
          </button>
        )}
      </nav>

      {activeTab === 'SCANNER' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Mode & Scan Type */}
          <section className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-bento-muted uppercase tracking-widest block">System Mode</label>
              <div className="grid grid-cols-2 gap-1 bg-bento-border p-1 rounded-lg">
                <button
                  onClick={() => setSettings({ ...settings, mode: 'SMC_ICT' })}
                  className={`py-1.5 px-3 text-[10px] font-bold rounded-md transition-all ${
                    settings.mode === 'SMC_ICT' ? 'bg-slate-700 text-white' : 'text-bento-muted hover:text-white'
                  }`}
                >
                  SMC / ICT
                </button>
                <button
                  onClick={() => setSettings({ ...settings, mode: 'TECHNICAL' })}
                  className={`py-1.5 px-3 text-[10px] font-bold rounded-md transition-all ${
                    settings.mode === 'TECHNICAL' ? 'bg-slate-700 text-white' : 'text-bento-muted hover:text-white'
                  }`}
                >
                  TECH
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-bento-muted uppercase tracking-widest block">Scan Source</label>
              <select
                value={settings.scanType}
                onChange={(e) => setSettings({ ...settings, scanType: e.target.value as any })}
                className="w-full bg-bento-border border-none text-[11px] font-bold py-2 px-3 rounded-lg text-white focus:ring-1 focus:ring-bento-gold"
              >
                <option value="GAINERS">TOP GAINERS %</option>
                <option value="VOLUME">TOP VOLUME</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-bento-muted uppercase tracking-widest block">Analysis Timeframe</label>
              <select
                value={settings.timeframe}
                onChange={(e) => setSettings({ ...settings, timeframe: e.target.value })}
                className="w-full bg-bento-border border-none text-[11px] font-bold py-2 px-3 rounded-lg text-white focus:ring-1 focus:ring-bento-gold"
              >
                <option value="15m">15 MINUTES</option>
                <option value="1h">1 HOUR</option>
                <option value="4h">4 HOURS</option>
                <option value="1d">1 DAY</option>
              </select>
            </div>
          </section>

          {/* Scoring & Risk */}
          <section className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-bento-muted uppercase tracking-widest">Min Score ({settings.minScore})</label>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={settings.minScore}
                onChange={(e) => setSettings({ ...settings, minScore: parseFloat(e.target.value) })}
                className="w-full accent-bento-gold h-1 bg-bento-border rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-bento-muted uppercase tracking-widest">Coin Limit ({settings.coinLimit})</label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.coinLimit}
                onChange={(e) => setSettings({ ...settings, coinLimit: parseInt(e.target.value) })}
                className="w-full accent-bento-gold h-1 bg-bento-border rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </section>

          {/* Automation toggles */}
          <section className="space-y-4 p-4 bg-bento-gold/5 border border-bento-gold/10 rounded-xl">
            <label className="text-[10px] font-bold text-bento-gold uppercase tracking-widest flex items-center gap-2">
              <Cpu className="w-3 h-3" /> Automation Logic
            </label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-300 uppercase">Auto Scan</label>
                <button 
                  onClick={() => setSettings({ ...settings, autoScan: !settings.autoScan })}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors ${settings.autoScan ? 'bg-bento-blue' : 'bg-bento-border'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.autoScan ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {settings.autoScan && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-[9px] font-bold text-bento-muted uppercase tracking-wider">
                    <span>Scan Frequency</span>
                    <span className="text-bento-blue">{settings.refreshInterval} min</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="120"
                    step="1"
                    value={settings.refreshInterval}
                    onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
                    className="w-full accent-bento-blue h-1 bg-bento-border rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              <div className={`flex items-center justify-between transition-opacity ${user.isAdmin ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}>
                <label className="text-[10px] font-bold text-slate-300 uppercase">Auto Send (TG)</label>
                <div className="flex items-center gap-2">
                  {user.isAdmin && (
                    <button 
                      onClick={onTestTelegram}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-bento-muted hover:text-bento-gold"
                      title="Test Telegram Connection"
                    >
                      <BellRing className="w-3 h-3" />
                    </button>
                  )}
                  <button 
                    disabled={!user.isAdmin}
                    onClick={() => setSettings({ ...settings, autoSendTelegram: !settings.autoSendTelegram })}
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors ${settings.autoSendTelegram ? 'bg-bento-green' : 'bg-bento-border'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.autoSendTelegram ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {!user.isAdmin && (
                <div className="flex items-center gap-2 text-[9px] text-bento-muted bg-black/20 p-2 rounded">
                  <ShieldCheck className="w-3 h-3" /> Admin Access Required for Auto-Send
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'SCANNER' && (
        <div className="mt-auto px-1">
          <button
            onClick={onScan}
            disabled={isScanning}
            className={`w-full py-3 rounded-lg font-bold text-sm tracking-tight transition-all uppercase flex items-center justify-center gap-2 ${
              isScanning 
                ? 'bg-bento-border text-bento-muted cursor-not-allowed' 
                : 'bg-white text-black hover:bg-slate-200 active:scale-95 shadow-lg'
            }`}
          >
            {isScanning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isScanning ? 'Synchronising...' : 'RUN ANALYTICS'}
          </button>
        </div>
      )}
    </div>
  );
};
