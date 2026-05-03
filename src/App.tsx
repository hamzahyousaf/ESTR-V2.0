/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { ScannerTable } from './components/ScannerTable';
import { ScannerSettings, ScanResult, AppUser } from './types';
import { getTopSymbols, getKlines, getCurrentPrice } from './services/dataFetcher';
import { calculateEMA, calculateRSI, detectCandlestickPatterns, calculateBollingerBands } from './services/indicators';
import { detectSMC } from './services/smc';
import { calculateWeightedScore, getSignalGrade } from './services/scoring';
import { Activity, Terminal, Zap, ShieldCheck, LogOut, User, Brain, BarChart3, History, Cpu, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { auth, db, ADMIN_EMAIL, checkWhitelist } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, query, limit, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { Login, AccessDenied } from './components/AuthScreens';
import { generateCandleChart } from './services/chartGenerator';

const DEFAULT_SETTINGS: ScannerSettings = {
  mode: 'TECHNICAL',
  scanType: 'GAINERS',
  minScore: 4.0,
  minRR: 2.0,
  coinLimit: 60,
  volumeFilter: true,
  volumeThreshold: 500000,
  trendStrengthFilter: true,
  refreshInterval: 60,
  autoSendTelegram: false,
  autoScan: true,
  timeframe: '1h'
};

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState<ScannerSettings>(DEFAULT_SETTINGS);
  const [privateConfig, setPrivateConfig] = useState({ telegramToken: '', telegramChatId: '' });
  
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSignal, setActiveSignal] = useState<ScanResult | null>(null);
  const [stats, setStats] = useState({ coinsScanned: 0, signalsFound: 0 });
  const [activeTab, setActiveTab] = useState<'SCANNER' | 'AI_HUB' | 'ADMIN'>('SCANNER');

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const isWhitelisted = await checkWhitelist(fbUser.email || '');
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          isAdmin: fbUser.email === ADMIN_EMAIL,
          isWhitelisted
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
  }, []);

  // Sync Settings & Private Config
  useEffect(() => {
    if (!user?.isWhitelisted) return;

    const unsubPublic = onSnapshot(doc(db, 'config', 'public'), (snap) => {
      if (snap.exists()) setSettings(prev => ({ ...prev, ...snap.data() }));
    });

    let unsubPrivate: (() => void) | undefined;
    if (user.isAdmin) {
      unsubPrivate = onSnapshot(doc(db, 'config', 'private'), (snap) => {
        if (snap.exists()) setPrivateConfig(snap.data() as any);
      });
    }

    return () => {
      unsubPublic();
      unsubPrivate?.();
    };
  }, [user]);

  const handleSendTelegram = async (result: ScanResult, isAuto = false) => {
    const token = privateConfig.telegramToken || settings.telegramToken;
    const chatId = privateConfig.telegramChatId || settings.telegramChatId;

    if (!token || !chatId) return;

    const directionEmoji = result.direction === 'LONG' ? '🟢' : '🔴';
    const formattedSymbol = result.symbol.replace('USDT', '/USDT');

    // Build detailed analysis string
    const indicators = result.activeIndicators;
    const strategiesStr = result.strategies.join(', ');
    const technicalDetail = `RSI: ${indicators?.rsi?.toFixed(1) || 'N/A'} | EMA20: ${indicators?.ema20?.toLocaleString() || 'N/A'} | EMA50: ${indicators?.ema50?.toLocaleString() || 'N/A'}`;

    const message = `${directionEmoji}#${formattedSymbol}\n` +
      `💎 Signal Type: ${result.direction}\n` +
      `🌐 Score: ${result.score.toFixed(1)} (${result.grade})\n` +
      `🌐 Leverage: Cross (50.0X)\n` +
      `✅ Entry ${result.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}\n` +
      `🎯 TP: ${result.tp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}\n` +
      `🛑 SL: ${result.sl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}\n` +
      `💡 Analysis:\n` +
      `${result.reason}\n` +
      `⚡ ${technicalDetail}\n` +
      `🛠 Strategies: ${strategiesStr}`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      if (!response.ok) {
        console.error('Telegram error:', await response.text());
      }
    } catch (e) {
      console.error('Failed to send telegram', e);
    }
  };

  const handleTestTelegram = async () => {
    const token = privateConfig.telegramToken || settings.telegramToken;
    const chatId = privateConfig.telegramChatId || settings.telegramChatId;
    if (!token || !chatId) {
      alert('Please configure Telegram settings in the Admin Area first.');
      return;
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '📡 *ESTR V2.0 PRO: SYSTEM TEST*\nTesting connection to neural broadcast network... Success.',
          parse_mode: 'Markdown'
        })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      alert('Test message sent!');
    } catch (e) {
      alert('Test failed. Check console or credentials.');
      console.error(e);
    }
  };

  const runScanner = useCallback(async () => {
    if (!user?.isWhitelisted) return;
    setIsScanning(true);
    setError(null);
    const newResults: ScanResult[] = [];
    let scanned = 0;

    try {
      const symbols = await getTopSymbols(settings.scanType, settings.coinLimit);
      
      const weightsSnap = await getDocs(collection(db, 'strategy_weights'));
      const dynamicWeights: Record<string, number> = {};
      weightsSnap.forEach(doc => {
        dynamicWeights[doc.id] = doc.data().weight || 1.0;
      });

      for (const symbol of symbols) {
        scanned++;
        const klines = await getKlines(symbol, settings.timeframe as any, 50);
        if (klines.length < 20) continue;

        if (settings.volumeFilter) {
          const avgVol = klines.slice(-24).reduce((sum, k) => sum + k.volume, 0) / 24;
          const currentPrice = klines[klines.length - 1].close;
          const volInUsdt = avgVol * currentPrice;
          if (volInUsdt < settings.volumeThreshold) continue;
        }

        const prices = klines.map(k => k.close);
        const currentPrice = await getCurrentPrice(symbol);
        
        const ema20 = calculateEMA(prices, 20);
        const ema50 = calculateEMA(prices, 50);
        const rsi = calculateRSI(prices, 14);
        const patterns = detectCandlestickPatterns(klines);
        const bb = calculateBollingerBands(prices, 20, 2);

        const techStrategies: string[] = [];
        const lastRsi = rsi[rsi.length - 1];

        if (ema20[ema20.length - 1] > ema50[ema50.length - 1]) techStrategies.push('EMA-20 Trend');
        if (lastRsi < 30) techStrategies.push('RSI Oversold');
        else if (lastRsi > 70) techStrategies.push('RSI Overbought');
        if (bb && currentPrice <= bb.lower) techStrategies.push('Bollinger Bands (LONG)');
        else if (bb && currentPrice >= bb.upper) techStrategies.push('Bollinger Bands (SHORT)');

        patterns.forEach(p => techStrategies.push(p));

        const smcResults = detectSMC(klines);
        const analysis = calculateWeightedScore(settings.mode, techStrategies, smcResults, currentPrice, dynamicWeights);
        
        if (analysis.score >= settings.minScore) {
          const atr = Math.abs(klines[klines.length - 1].high - klines[klines.length - 1].low) || currentPrice * 0.01;
          const sl = analysis.direction === 'LONG' ? currentPrice - (atr * 1.5) : currentPrice + (atr * 1.5);
          const tp = analysis.direction === 'LONG' ? currentPrice + (atr * 3) : currentPrice - (atr * 3);
          const rr = Math.abs(tp - currentPrice) / Math.abs(currentPrice - sl);

          if (rr >= settings.minRR) {
            const signal: ScanResult = {
              symbol, mode: settings.mode, direction: analysis.direction,
              score: analysis.score, confidence: analysis.confidence,
              entry: currentPrice, sl, tp, rr, 
              strategies: analysis.strategies,
              strategiesDetails: analysis.strategiesDetails,
              reason: analysis.reason, price: currentPrice, timestamp: Date.now(),
              grade: getSignalGrade(analysis.score, analysis.confidence),
              activeIndicators: { rsi: lastRsi, ema20: ema20[ema20.length-1], ema50: ema50[ema50.length-1] }
            };
            newResults.push(signal);

            if (settings.autoScan && settings.autoSendTelegram && user?.isAdmin) {
              handleSendTelegram(signal, true);
            }

            addDoc(collection(db, 'signals'), {
              ...signal,
              status: 'PENDING',
              createdAt: serverTimestamp()
            });
          }
        }
      }

      const sorted = newResults.sort((a, b) => b.score - a.score);
      setResults(sorted);
      if (sorted.length > 0) setActiveSignal(sorted[0]);
      setLastScanTime(Date.now());
      setStats({ coinsScanned: scanned, signalsFound: newResults.length });
    } catch (err) {
      console.error(err);
      setError('Connection Error');
    } finally {
      setIsScanning(false);
    }
  }, [settings, user]);

  useEffect(() => {
    if (!settings.autoScan) return;
    const interval = setInterval(() => {
      if (!isScanning) runScanner();
    }, settings.refreshInterval * 60000);
    return () => clearInterval(interval);
  }, [settings.autoScan, settings.refreshInterval, runScanner, isScanning]);

  if (authLoading) return <div className="h-screen w-screen bg-bento-bg flex items-center justify-center text-white font-bold uppercase tracking-widest">Initialising Systems...</div>;
  if (!user) return <Login />;
  if (!user.isWhitelisted) return <AccessDenied email={user.email} />;

  return (
    <div className="p-3 bg-bento-bg h-screen w-screen box-border overflow-hidden grid gap-3 bento-layout">
      <Sidebar 
        settings={settings} 
        setSettings={setSettings} 
        onScan={runScanner} 
        onTestTelegram={handleTestTelegram} 
        isScanning={isScanning} 
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <header className="bg-bento-card border border-bento-border rounded-xl px-5 flex items-center justify-between header">
        <div className="flex gap-8">
          <div className="flex flex-col">
            <label className="text-[11px] text-bento-muted font-bold tracking-tight">MARKET STATUS</label>
            <span className="text-sm font-bold uppercase tracking-tight">ESTR V2.0 <span className="text-bento-green ml-2">● LIVE</span></span>
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] text-bento-muted font-bold tracking-tight">SYSTEM OPERATOR</label>
            <span className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
              <User className="w-3 h-3 text-bento-gold" />
              {user.displayName?.split(' ')[0] || 'Member'} 
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${user.isAdmin ? 'bg-bento-gold/20 text-bento-gold' : 'bg-slate-700 text-slate-300'}`}>
                {user.isAdmin ? 'ADMIN' : 'MEMBER'}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <label className="text-[11px] text-bento-muted font-bold tracking-tight">LAST UPDATED</label>
            <span className="text-sm font-mono text-bento-gold block">
              {lastScanTime ? format(lastScanTime, 'HH:mm:ss') : '--:--:--'} UTC
            </span>
          </div>
          <button onClick={() => signOut(auth)} className="text-bento-muted hover:text-bento-red transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {activeTab === 'SCANNER' && (
        <>
          <div className="grid grid-cols-3 gap-3 stats-row">
            <div className="bg-bento-card border border-bento-border rounded-xl p-4 flex flex-col justify-between">
              <label className="text-[11px] text-bento-muted font-bold tracking-tight uppercase">Coins Processed</label>
              <div className="text-2xl font-black">{stats.coinsScanned} <span className="text-xs font-normal text-bento-muted">Symbols/1h</span></div>
              <div className="text-bento-green text-xs font-bold mt-2">↑ {stats.signalsFound} Strategy Matches</div>
            </div>
            <div className="bg-bento-card border border-bento-border rounded-xl p-4 flex flex-col justify-between">
              <label className="text-[11px] text-bento-muted font-bold tracking-tight uppercase">Auto-Scan Depth</label>
              <div className="text-2xl font-black">{results.length > 0 ? (results.reduce((a,b)=>a+b.confidence,0)/results.length).toFixed(1) : 0}%</div>
              <div className="text-xs text-bento-muted font-medium mt-2">Avg System Confidence</div>
            </div>
            <div className="bg-bento-card border border-bento-border rounded-xl p-4 flex flex-col justify-between">
              <label className="text-[11px] text-bento-muted font-bold tracking-tight uppercase">Bias Intelligence</label>
              <div className={`text-2xl font-black ${results[0]?.direction === 'SHORT' ? 'text-bento-red' : 'text-bento-green'}`}>
                {results.length > 0 ? (results.filter(r => r.direction === 'LONG').length > results.filter(r => r.direction === 'SHORT').length ? 'BULLISH' : 'BEARISH') : 'NEUTRAL'}
              </div>
              <div className="text-xs text-bento-muted font-medium mt-2">{results.length} Active Signal Convergences</div>
            </div>
          </div>

          <div className="bg-bento-card border border-bento-border rounded-xl p-4 overflow-hidden flex flex-col main-table">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[11px] text-bento-muted font-bold tracking-tight uppercase flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Live Signal stream
              </label>
              {isScanning && <div className="flex items-center gap-2 text-[10px] font-bold text-bento-gold animate-pulse"><Zap className="w-3 h-3" /> ANALYSING...</div>}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ScannerTable results={results} activeSignal={activeSignal} onSelect={setActiveSignal} />
            </div>
          </div>

          <div className="bg-bento-card border border-bento-border rounded-xl p-5 overflow-y-auto custom-scrollbar signal-breakdown">
            <label className="mb-4 text-[11px] text-bento-muted font-bold tracking-tight uppercase flex items-center gap-2">
              <Activity className="w-3 h-3" /> Confluence breakdown
            </label>
            {activeSignal ? (
              <SignalDetails result={activeSignal} isAdmin={user.isAdmin} onSendTelegram={handleSendTelegram} />
            ) : (
              <div className="h-full flex items-center justify-center text-bento-muted text-xs italic text-center">
                Select a signal from the matrix<br/>for advanced AI breakdown
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'AI_HUB' && <AIHub adminMode={user.isAdmin} />}
      {activeTab === 'ADMIN' && user.isAdmin && <AdminArea />}

      <footer className="bg-bento-card border border-bento-border rounded-xl px-5 footer-status">
        <div className="flex justify-between items-center h-full">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-bento-green rounded-full shadow-[0_0_8px_#10B981]"></div>
              <span className="text-xs font-medium text-slate-300 tracking-tight">Mainframe Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-bento-blue rounded-full shadow-[0_0_8px_#3B82F6]"></div>
              <span className="text-xs font-medium text-slate-300 tracking-tight">AI Agents Active</span>
            </div>
          </div>
          <div className="text-[10px] text-bento-muted font-bold tracking-widest uppercase flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> ESTR V2.0 PRO SECURE KERNEL
          </div>
        </div>
      </footer>

      <style>{`
        .bento-layout {
          grid-template-columns: 240px 1fr 1fr 340px;
          grid-template-rows: 60px 140px 1fr 60px;
        }
        .sidebar { grid-row: 1 / 5; }
        .header { grid-column: 2 / 5; }
        .stats-row { grid-column: 2 / 5; }
        .main-table { grid-column: 2 / 4; grid-row: 3 / 4; }
        .signal-breakdown { grid-column: 4 / 5; grid-row: 3 / 4; }
        .footer-status { grid-column: 2 / 5; }
      `}</style>
    </div>
  );
}

function SignalDetails({ result, isAdmin, onSendTelegram }: { result: ScanResult, isAdmin: boolean, onSendTelegram: (r: ScanResult) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-lg font-black tracking-tight">{result.symbol}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
          result.grade === 'A+' ? 'bg-bento-gold text-black' : 'bg-slate-700 text-white'
        }`}>{result.grade} Grade</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-bento-muted">Confidence</span>
          <span className="text-bento-green">{result.confidence}%</span>
        </div>
        <div className="flex justify-between text-xs font-medium">
          <span className="text-bento-muted">Entry Zone</span>
          <span className="font-mono">{result.entry.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs font-medium">
          <span className="text-bento-muted">Stop Loss</span>
          <span className="font-mono text-bento-red">{result.sl.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs font-medium">
          <span className="text-bento-muted">Take Profit</span>
          <span className="font-mono text-bento-green">{result.tp.toLocaleString()}</span>
        </div>
      </div>

      <div className="p-3 bg-bento-border/50 rounded-lg text-[11px] leading-relaxed">
        <span className="text-bento-gold font-bold uppercase mr-1">ANALYSIS:</span>
        <span className="text-slate-300">{result.reason}</span>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] text-bento-muted font-bold tracking-widest uppercase">Strategy Confluence</label>
        <div className="space-y-2">
          {result.strategiesDetails.map((strat, i) => (
            <div key={i} className="p-3 bg-bento-border/30 rounded-lg border border-bento-border/50 group/strat hover:bg-bento-border/50 transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white tracking-tight">{strat.name}</span>
                <span className="text-[10px] font-mono text-bento-gold">+{strat.weight.toFixed(1)}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal line-clamp-2 group-hover/strat:line-clamp-none transition-all">
                {strat.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <button 
          onClick={() => onSendTelegram(result)}
          className="w-full flex items-center justify-center gap-2 bg-bento-gold/10 border border-bento-gold/30 hover:bg-bento-gold/20 text-bento-gold py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-tight"
        >
          <Zap className="w-3 h-3" /> Send to Telegram
        </button>
      )}
    </div>
  );
}

function AIHub({ adminMode }: { adminMode: boolean }) {
  const [signals, setSignals] = useState<ScanResult[]>([]);
  const [weights, setWeights] = useState<any[]>([]);
  const [activeSignalForLearning, setActiveSignalForLearning] = useState<any | null>(null);
  const [learningForm, setLearningForm] = useState({ outcome: 'TP HIT', profit: 0, notes: '' });

  useEffect(() => {
    const q = query(collection(db, 'signals'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, (snap) => {
      setSignals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'strategy_weights'), (snap) => {
      setWeights(snap.docs.map(doc => ({ name: doc.id, ...doc.data() } as any)));
    });
  }, []);

  const handleSubmitLearning = async () => {
    if (!activeSignalForLearning?.id) return;
    try {
      await setDoc(doc(db, 'signals', activeSignalForLearning.id), {
        outcome: learningForm.outcome,
        profitPercent: learningForm.profit,
        notes: learningForm.notes,
        status: 'COMPLETED'
      }, { merge: true });
      
      const isWin = learningForm.outcome === 'TP HIT';
      for (const strat of activeSignalForLearning.strategies) {
        const weightRef = doc(db, 'strategy_weights', strat);
        const weightSnap = await getDoc(weightRef);
        const data = weightSnap.exists() ? weightSnap.data() : { success: 0, total: 0, weight: 1.0 };
        const newTotal = (data.total || 0) + 1;
        const newSuccess = (data.success || 0) + (isWin ? 1 : 0);
        const successRate = newSuccess / newTotal;
        const newWeight = 1.0 + (successRate * 0.5);
        
        await setDoc(weightRef, {
          success: newSuccess,
          total: newTotal,
          successRate,
          weight: newWeight,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      alert('AI Learning complete. Weights updated.');
      setActiveSignalForLearning(null);
    } catch (e) {
      console.error(e);
      alert('Learning failed.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-12 gap-3 stats-row main-table h-full overflow-hidden"
    >
      {/* Agent 1: Neural Memory Core */}
      <motion.div 
        layout
        className="bg-gradient-to-br from-bento-card to-bento-bg border border-bento-border rounded-xl p-5 flex flex-col col-span-8 overflow-hidden relative group"
      >
        <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none transition-opacity group-hover:opacity-10">
          <History className="w-32 h-32 text-white" />
        </div>
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bento-blue/10 rounded-lg border border-bento-blue/20">
              <History className="w-4 h-4 text-bento-blue" />
            </div>
            <div>
              <label className="text-[11px] text-bento-muted font-black tracking-[0.25em] uppercase block">Signal Memory Core</label>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-bento-blue animate-pulse"></span>
                <span className="text-[9px] font-bold text-bento-blue uppercase tracking-widest">Neural Logging Active</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="text-right">
              <span className="text-[9px] text-bento-muted font-bold block leading-none">TOTAL EVENTS</span>
              <span className="text-sm font-black text-white">{signals.length}</span>
            </div>
          </div>
        </div>

        <motion.div 
          className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 relative z-10"
        >
          <AnimatePresence mode="popLayout">
            {signals.map((s, idx) => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={s.id} 
                onClick={() => setActiveSignalForLearning(s)} 
                className={`p-4 rounded-xl cursor-pointer transition-all border group relative overflow-hidden ${
                  activeSignalForLearning?.id === s.id 
                  ? 'bg-bento-gold/5 border-bento-gold shadow-[0_0_15px_rgba(255,215,0,0.05)]' 
                  : 'bg-black/20 border-bento-border hover:border-bento-muted/50 hover:bg-black/40'
                }`}
              >
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-black text-sm tracking-tighter text-white group-hover:text-bento-gold transition-colors">{s.symbol}</span>
                      <span className="text-[8px] font-bold text-bento-muted uppercase tracking-widest">H1 TIMEFRAME</span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 ${
                      s.direction === 'LONG' 
                      ? 'bg-bento-green/10 text-bento-green border border-bento-green/20' 
                      : 'bg-bento-red/10 text-bento-red border border-bento-red/20'
                    }`}>
                      {s.direction === 'LONG' ? <Activity className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                      {s.direction}
                    </div>
                  </div>
  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] text-bento-muted font-bold block uppercase tracking-tighter">CONFIDENCE</span>
                      <span className="text-xs font-black text-white">{(s.confidence || 0)}%</span>
                    </div>
                    <div className="text-right">
                      {(s as any).outcome ? (
                        <span className={`text-[9px] px-2 py-1 rounded font-black uppercase tracking-[0.1em] ${(s as any).outcome === 'TP HIT' ? 'bg-bento-green text-black' : 'bg-bento-red text-white'}`}>
                          {(s as any).outcome}
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-1 rounded bg-slate-800 text-slate-400 font-bold border border-white/5 uppercase">Pending</span>
                      )}
                    </div>
                    <div className="text-[10px] text-bento-muted font-mono bg-black/40 px-2 py-1 rounded group-hover:text-white transition-colors">
                      {s.timestamp ? format(s.timestamp, 'HH:mm') : '--:--'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Agent 3: Reinforcement Center */}
      <motion.div 
        layout
        className="bg-bento-card border border-bento-border rounded-xl p-5 flex flex-col col-span-4 h-full shadow-2xl relative overflow-hidden backdrop-blur-sm group"
      >
        <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none group-hover:rotate-12 transition-transform duration-700">
            <Brain className="w-32 h-32 text-white" />
        </div>
        
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="p-2 bg-bento-gold/10 rounded-lg border border-bento-gold/20">
            <Brain className="w-4 h-4 text-bento-gold" />
          </div>
          <div>
            <label className="text-[11px] text-bento-muted font-black tracking-[0.25em] uppercase block">AI Reinforcement</label>
            <span className="text-[9px] font-bold text-bento-gold uppercase tracking-widest">Agent Training Portal</span>
          </div>
        </div>

        {activeSignalForLearning ? (
          <div className="space-y-6 flex-1 flex flex-col relative z-10">
            <div className="p-4 bg-gradient-to-r from-bento-gold/10 to-transparent border-l-2 border-bento-gold rounded-r-xl space-y-1">
              <span className="text-[10px] text-bento-gold font-black uppercase tracking-widest block opacity-70 mb-1">SELECTED ANALYTICS</span>
              <div className="flex justify-between items-end">
                <span className="text-lg font-black text-white tracking-tighter leading-none">{activeSignalForLearning.symbol}</span>
                <span className="text-[10px] text-bento-muted font-bold font-mono">ID: {activeSignalForLearning.id?.slice(-8).toUpperCase()}</span>
              </div>
            </div>

            <div className="space-y-6 flex-1 pr-1 custom-scrollbar overflow-y-auto">
              <section className="space-y-3">
                <label className="text-[10px] text-bento-muted font-black uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 bg-bento-gold rounded-full"></div>
                  Neural Outcome Verification
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/30 rounded-xl border border-white/5">
                    <button 
                        onClick={() => setLearningForm({...learningForm, outcome: 'TP HIT'})}
                        className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          learningForm.outcome === 'TP HIT' 
                          ? 'bg-bento-green text-black shadow-lg shadow-bento-green/20 scale-[1.02]' 
                          : 'bg-transparent text-slate-500 hover:text-bento-green'
                        }`}
                    >
                        Success
                    </button>
                    <button 
                        onClick={() => setLearningForm({...learningForm, outcome: 'SL HIT'})}
                        className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          learningForm.outcome === 'SL HIT' 
                          ? 'bg-bento-red text-white shadow-lg shadow-bento-red/20 scale-[1.02]' 
                          : 'bg-transparent text-slate-500 hover:text-bento-red'
                        }`}
                    >
                        Failed
                    </button>
                </div>
              </section>

              <section className="space-y-3">
                <label className="text-[10px] text-bento-muted font-black uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 bg-bento-gold rounded-full"></div>
                  Performance Attribution (x/100)
                </label>
                <div className="group relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bento-gold font-black text-xs leading-none">±</span>
                    <input 
                    type="number" 
                    value={learningForm.profit}
                    onChange={(e) => setLearningForm({...learningForm, profit: parseFloat(e.target.value)})}
                    className="w-full bg-black/30 border border-bento-border py-3 pl-8 pr-4 rounded-xl text-xs text-white font-mono focus:border-bento-gold focus:ring-1 focus:ring-bento-gold/20 transition-all outline-none"
                    placeholder="Enter variance percentage..."
                    />
                </div>
              </section>

              <section className="flex-1 space-y-3 flex flex-col">
                <label className="text-[10px] text-bento-muted font-black uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 bg-bento-gold rounded-full"></div>
                  Contextual Metadata
                </label>
                <textarea 
                  value={learningForm.notes}
                  onChange={(e) => setLearningForm({...learningForm, notes: e.target.value})}
                  className="w-full flex-1 bg-black/30 border border-bento-border p-4 rounded-xl text-xs text-slate-300 resize-none focus:border-bento-gold focus:ring-1 focus:ring-bento-gold/20 transition-all outline-none custom-scrollbar"
                  placeholder="Record market anomalies or ICT confirmation details for the model..."
                ></textarea>
              </section>
            </div>

            <button 
              onClick={handleSubmitLearning}
              disabled={!adminMode}
              className={`w-full font-black py-4 rounded-xl text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-xl ${
                adminMode 
                ? 'bg-bento-gold text-black hover:brightness-110 active:scale-[0.98] shadow-bento-gold/10' 
                : 'bg-slate-800 text-slate-600 cursor-not-allowed grayscale'
              }`}
            >
              <Cpu className="w-4 h-4 animate-pulse" /> Finalize Training Cycle
            </button>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center p-8 relative z-10">
            <div className="space-y-6">
                <div className="w-20 h-20 bg-bento-border/20 rounded-[2rem] flex items-center justify-center mx-auto border border-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    <Brain className="w-10 h-10 text-bento-gold/20" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-white font-black uppercase tracking-widest">Neural Link Offline</p>
                  <p className="text-[10px] text-bento-muted leading-relaxed px-4">
                    Initialize a selection from the <span className="text-slate-200">Neural Memory Core</span> to bridge the reinforcement gap.
                  </p>
                </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Agent 2 & 4: Deep Learning Grid */}
      <div className="bg-bento-card border border-bento-border rounded-xl p-6 flex flex-col row-start-2 col-start-1 col-span-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-bento-blue/5 to-transparent pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-bento-gold/10 rounded-xl border border-bento-gold/20">
              <BarChart3 className="w-5 h-5 text-bento-gold" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[12px] text-white font-black tracking-[0.25em] uppercase flex items-center gap-2">
                  Agent 2 & 4: Strategic Optimization Grid
              </label>
              <div className="flex items-center gap-4 overflow-hidden">
                <span className="text-[9px] text-bento-muted font-bold uppercase tracking-widest">Global Dynamic Weighting Engine</span>
                <div className="h-px bg-bento-border flex-1 w-32"></div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-6 items-center">
              <div className="px-4 py-2 bg-bento-blue/5 rounded-xl border border-bento-blue/10">
                  <div className="text-[8px] text-bento-muted font-black uppercase tracking-widest mb-0.5">LEARNING RADIUS</div>
                  <div className="text-xs font-black text-bento-blue">ADAPTIVE ±4.2%</div>
              </div>
              <button className="p-2 text-bento-muted hover:text-white transition-colors">
                <Terminal className="w-4 h-4" />
              </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 overflow-x-auto pb-4 custom-scrollbar relative z-10">
          {weights.length > 0 ? weights.map(w => (
            <div key={w.name} className="p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-bento-gold/30 hover:bg-black/60 transition-all flex flex-col justify-between h-[130px] shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="text-[10px] font-black text-white uppercase tracking-tighter w-2/3 leading-tight group-hover:text-bento-gold transition-colors">{w.name}</div>
                <div className="text-[10px] font-mono font-black text-bento-gold bg-bento-gold/10 px-1.5 py-0.5 rounded-md border border-bento-gold/20">
                  x{w.weight?.toFixed(2)}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <span className="text-[9px] text-bento-muted font-bold uppercase tracking-widest">EFFICIENCY</span>
                    <span className="text-xs font-black text-white">{Math.round((w.successRate || 0) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden p-[1px]">
                    <div className="h-full bg-gradient-to-r from-bento-gold/20 to-bento-gold rounded-full shadow-[0_0_8px_rgba(255,215,0,0.3)] transition-all duration-1000" style={{ width: `${(w.successRate || 0) * 100}%` }} />
                </div>
                <div className="flex justify-between text-[8px] text-slate-500 font-bold">
                  <span>{w.total || 0} PASSES</span>
                  <span className="flex items-center gap-1"><Zap className="w-2 h-2 text-bento-gold" /> READY</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-5 text-center py-16 border-2 border-dashed border-bento-border/30 rounded-[2.5rem] bg-black/10">
              <Terminal className="w-12 h-12 text-bento-muted mx-auto mb-4 opacity-[0.05]" />
              <div className="text-[10px] text-bento-muted font-black uppercase tracking-[0.3em] opacity-40">Neural_Feedback_Loop_Awaiting_Data</div>
            </div>
          )}
        </div>
        
        {weights.length > 0 && (
          <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[9px] text-bento-muted font-black uppercase tracking-widest mb-1">Processing State</span>
                <span className="text-xs font-black text-bento-blue flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bento-blue opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-bento-blue"></span>
                    </span>
                    OPTIMIZATION_SYNC_v9.2
                </span>
              </div>
              <div className="h-10 w-px bg-white/5"></div>
              <div className="flex flex-col">
                <span className="text-[9px] text-bento-muted font-black uppercase tracking-widest mb-1">Global Weight Iteration</span>
                <span className="text-xs font-black text-white flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-bento-muted" /> PASS #{(weights.reduce((a,b)=>a+(b.total||0),0)/10).toFixed(0)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-black/40 px-5 py-3 rounded-2xl border border-bento-gold/10 flex items-center gap-4 group-hover:border-bento-gold/30 transition-all">
                <Zap className="w-4 h-4 text-bento-gold animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[8px] text-bento-muted font-black tracking-widest uppercase">Strongest Variable</span>
                  <span className="text-[11px] text-white font-black uppercase tracking-tighter">
                    {weights.sort((a,b)=>b.successRate-a.successRate)[0]?.name || 'Neural convergence'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AdminArea() {
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [privateConfig, setPrivateConfig] = useState({ telegramToken: '', telegramChatId: '' });

  useEffect(() => {
    return onSnapshot(collection(db, 'whitelisted_users'), (snap) => {
      setWhitelist(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'private'), (snap) => {
      if (snap.exists()) setPrivateConfig(snap.data() as any);
    });
  }, []);

  const handleAddWhitelist = async () => {
    if (!newEmail.includes('@')) return;
    await setDoc(doc(db, 'whitelisted_users', newEmail.toLowerCase()), {
      email: newEmail.toLowerCase(),
      addedAt: Date.now(),
      addedBy: auth.currentUser?.uid
    });
    setNewEmail('');
  };

  const handleRemoveWhitelist = async (email: string) => {
    await deleteDoc(doc(db, 'whitelisted_users', email));
  };

  const savePrivateConfig = async () => {
    await setDoc(doc(db, 'config', 'private'), privateConfig, { merge: true });
    alert('Private configuration saved.');
  };

  return (
    <div className="grid grid-cols-2 gap-3 main-table h-full overflow-hidden">
      <div className="bg-bento-card border border-bento-border rounded-xl p-5 flex flex-col">
        <label className="text-[11px] text-bento-muted font-bold tracking-tight uppercase mb-4">Operator Whitelist Management</label>
        
        <div className="flex gap-2 mb-4">
          <input 
            type="email" 
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Operator Email"
            className="flex-1 bg-bento-bg border border-bento-border p-2 rounded text-xs text-white"
          />
          <button onClick={handleAddWhitelist} className="bg-bento-gold text-black px-4 rounded font-bold text-xs">ADD</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {whitelist.map(u => (
            <div key={u.id} className="p-2.5 bg-bento-border/20 rounded flex justify-between items-center group">
              <span className="text-xs text-slate-300 font-medium">{u.email}</span>
              <button disabled={u.email === ADMIN_EMAIL} onClick={() => handleRemoveWhitelist(u.id)} className="text-bento-muted hover:text-bento-red opacity-0 group-hover:opacity-100 transition-all">
                <ShieldAlert className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-bento-card border border-bento-border rounded-xl p-5 flex flex-col space-y-6">
        <label className="text-[11px] text-bento-muted font-bold tracking-tight uppercase">Confidential Integration Secrets</label>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-bento-muted font-bold uppercase mb-1 block tracking-widest">Telegram Bot Token</label>
            <input 
              type="password" 
              value={privateConfig.telegramToken}
              onChange={(e) => setPrivateConfig({ ...privateConfig, telegramToken: e.target.value })}
              className="w-full bg-bento-bg border border-bento-border p-2.5 rounded text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-bento-muted font-bold uppercase mb-1 block tracking-widest">Telegram Chat ID</label>
            <input 
              type="text" 
              value={privateConfig.telegramChatId}
              onChange={(e) => setPrivateConfig({ ...privateConfig, telegramChatId: e.target.value })}
              className="w-full bg-bento-bg border border-bento-border p-2.5 rounded text-xs text-white font-mono"
            />
          </div>
        </div>

        <button onClick={savePrivateConfig} className="bg-bento-gold text-black font-black py-3 rounded-xl text-xs uppercase tracking-tight">
          Synchronise Encryption Keys
        </button>

        <div className="p-4 bg-bento-red/10 border border-bento-red/20 rounded-lg">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-bento-red shrink-0" />
            <div>
              <div className="text-[10px] font-black text-bento-red uppercase mb-1">Administrative Security Warning</div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Credentials stored here are only visible to the Master Administrator. 
                Operators do not have access to these values at runtime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
