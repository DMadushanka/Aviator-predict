import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, BellOff, Trash2, RefreshCw, Plus, TrendingUp, History, 
  BarChart3, Zap, ArrowRight, ShieldCheck, Database, Sliders, Play, Brain, ShieldAlert,
  Sparkles, Activity, Gauge, Rocket, Plane, AlertTriangle, ChevronDown, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { MultiplierRecord, AlertRule, AIPrediction } from './types';
import PatternLearningPredictor from './components/PatternLearningPredictor';
import SuperHighFlyerPredictor from './components/SuperHighFlyerPredictor';
import MultipliersExcelTable from './components/MultipliersExcelTable';
import MultiplierRanker from './components/MultiplierRanker';
import ConsoleScraper from './components/ConsoleScraper';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import MultiplierLineChart from './components/MultiplierLineChart';
import AutoBetEngine from './components/AutoBetEngine';

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 20,
    }
  },
  hover: {
    y: -4,
    scale: 1.01,
    transition: { type: "spring", stiffness: 300, damping: 15 }
  }
};

const statCardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.1,
      type: "spring",
      stiffness: 100,
      damping: 12,
    }
  })
};

export default function App() {
  const [multipliers, setMultipliers] = useState<MultiplierRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Stats Slider Threshold
  const [statThreshold, setStatThreshold] = useState<number>(20.0);

  // Rules Configuration
  const [rules, setRules] = useState<AlertRule[]>([
    {
      id: 'rule_1',
      name: 'Cold Streak Warning (Recent < 20x)',
      type: 'consecutive_low',
      threshold: 20.0,
      consecutiveRounds: 10,
      isActive: true,
      isTriggered: false
    },
    {
      id: 'rule_2',
      name: 'Extreme Crash Squeeze (Recent < 1.5x)',
      type: 'consecutive_low',
      threshold: 1.5,
      consecutiveRounds: 5,
      isActive: true,
      isTriggered: false
    },
    {
      id: 'rule_3',
      name: 'Drought Alarm (No > 10x)',
      type: 'no_high',
      threshold: 10.0,
      consecutiveRounds: 25,
      isActive: false,
      isTriggered: false
    }
  ]);

  // Alarms Sound Toggle
  const [soundAlerts, setSoundAlerts] = useState<boolean>(true);
  const [activeAlarm, setActiveAlarm] = useState<string | null>(null);

  // Manual Input State
  const [manualInput, setManualInput] = useState<string>('');
  const [manualSubmitting, setManualSubmitting] = useState<boolean>(false);

  // New Rule Modal Form
  const [showAddRule, setShowAddRule] = useState<boolean>(false);
  const [newRuleName, setNewRuleName] = useState<string>('');
  const [newRuleType, setNewRuleType] = useState<'consecutive_low' | 'no_high' | 'average_low'>('consecutive_low');
  const [newRuleThreshold, setNewRuleThreshold] = useState<number>(20.0);
  const [newRuleRounds, setNewRuleRounds] = useState<number>(10);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Sound
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const triggerAlarmBeep = () => {
    if (!soundAlerts) return;
    try {
      initAudio();
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(660, ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(330, ctx.currentTime);
      osc2.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Could not fire sound alarm", e);
    }
  };

  // Fetch History on Load
  const fetchHistory = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/multipliers');
      if (res.ok) {
        const data = await res.json();
        setMultipliers(data);
        setDbConnected(true);
      }
    } catch (error) {
      console.error("Crashed loading multipliers:", error);
      setDbConnected(false);
    } finally {
      setSyncing(false);
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Set up real-time automatic polling sync (every 1.5 seconds)
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/multipliers');
        if (res.ok) {
          const data = await res.json();
          setMultipliers(prev => {
            // Compare newest multiplier's ID or list length to avoid unnecessary state triggers
            const hasChanged = prev.length !== data.length || (prev.length > 0 && data.length > 0 && prev[0].id !== data[0].id);
            if (hasChanged) {
              evaluateRules(data, rules);
              return data;
            }
            return prev;
          });
          setDbConnected(true);
        }
      } catch (error) {
        console.error("Failed to fetch real-time update:", error);
        setDbConnected(false);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [rules]);

  // Rules Evaluator
  const evaluateRules = (currentHistory: MultiplierRecord[], currentRules: AlertRule[]) => {
    let triggeredRuleName: string | null = null;
    
    const evaluated = currentRules.map(rule => {
      if (!rule.isActive) {
        return { ...rule, isTriggered: false };
      }

      let triggered = false;

      if (rule.type === 'consecutive_low') {
        if (currentHistory.length >= rule.consecutiveRounds) {
          const recent = currentHistory.slice(0, rule.consecutiveRounds);
          triggered = recent.every(item => item.multiplier < rule.threshold);
        }
      } else if (rule.type === 'no_high') {
        if (currentHistory.length >= rule.consecutiveRounds) {
          const recent = currentHistory.slice(0, rule.consecutiveRounds);
          triggered = recent.every(item => item.multiplier < rule.threshold);
        }
      } else if (rule.type === 'average_low') {
        if (currentHistory.length >= rule.consecutiveRounds) {
          const recent = currentHistory.slice(0, rule.consecutiveRounds);
          const sum = recent.reduce((acc, item) => acc + item.multiplier, 0);
          const avg = sum / rule.consecutiveRounds;
          triggered = avg < rule.threshold;
        }
      }

      if (triggered && !rule.isTriggered) {
        // Newly triggered rule!
        triggeredRuleName = rule.name;
      }

      return { ...rule, isTriggered: triggered };
    });

    if (triggeredRuleName) {
      setActiveAlarm(triggeredRuleName);
      triggerAlarmBeep();
      
      // Request standard web push notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("Aviator Pattern Triggered!", {
          body: `Rule Matched: ${triggeredRuleName}`,
          icon: '/favicon.ico'
        });
      }
    } else {
      // If no rules are triggered across the list, clear active alarm
      const anyTriggered = evaluated.some(r => r.isTriggered);
      if (!anyTriggered) {
        setActiveAlarm(null);
      }
    }

    setRules(evaluated);
  };

  // Add Multiplier Handler
  const handleAddMultiplier = async (val: number, source: 'manual' | 'scraper' = 'manual') => {
    try {
      const res = await fetch('/api/multipliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier: val, source })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = [data, ...multipliers];
        setMultipliers(updated);
        evaluateRules(updated, rules);
      }
    } catch (err) {
      console.error("Failed adding multiplier to API:", err);
      // fallback in-memory on communication error
      const localId = "err_" + Math.random().toString(36).substring(2, 11);
      const newRec: MultiplierRecord = {
        id: localId,
        multiplier: val,
        timestamp: Date.now(),
        source
      };
      const updated = [newRec, ...multipliers];
      setMultipliers(updated);
      evaluateRules(updated, rules);
    }
  };

  // Manual submission form
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(manualInput);
    if (isNaN(val) || val < 1.00) return;

    setManualSubmitting(true);
    await handleAddMultiplier(val, 'manual');
    setManualInput('');
    setManualSubmitting(false);
  };

  // Clear Database History
  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your multiplier history database? This action cannot be undone.")) return;
    try {
      const res = await fetch('/api/clear', { method: 'POST' });
      if (res.ok) {
        setMultipliers([]);
        setActiveAlarm(null);
        // Clear triggered rules
        setRules(prev => prev.map(r => ({ ...r, isTriggered: false })));
      }
    } catch (err) {
      console.error("Failed clearing database history:", err);
    }
  };

  // Add Custom Alert Rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const rule: AlertRule = {
      id: 'rule_' + Math.random().toString(36).substring(2, 11),
      name: newRuleName,
      type: newRuleType,
      threshold: newRuleThreshold,
      consecutiveRounds: newRuleRounds,
      isActive: true,
      isTriggered: false
    };

    const updatedRules = [...rules, rule];
    setRules(updatedRules);
    evaluateRules(multipliers, updatedRules);
    
    // reset form
    setNewRuleName('');
    setShowAddRule(false);
  };

  // Toggle Rule Status
  const toggleRuleActive = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, isActive: !r.isActive, isTriggered: false } : r);
    setRules(updated);
    evaluateRules(multipliers, updated);
  };

  // Delete Rule
  const deleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    evaluateRules(multipliers, updated);
  };

  // Setup browser push notifications
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  };

  // Math metrics calculation
  const totalRounds = multipliers.length;
  const avgMultiplier = totalRounds > 0 
    ? multipliers.reduce((acc, r) => acc + r.multiplier, 0) / totalRounds 
    : 0;

  // Median calculation
  let medianMultiplier = 0;
  if (totalRounds > 0) {
    const sorted = [...multipliers].map(r => r.multiplier).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianMultiplier = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Crash threshold ratios
  const roundsUnderThreshold = multipliers.filter(r => r.multiplier < statThreshold).length;
  const underThresholdRatio = totalRounds > 0 ? (roundsUnderThreshold / totalRounds) * 100 : 0;

  // Rounds since last massive (>20x) multiplier
  let roundsSinceHigh = 0;
  const lastHighIndex = multipliers.findIndex(r => r.multiplier >= 20.0);
  if (lastHighIndex !== -1) {
    roundsSinceHigh = lastHighIndex;
  } else {
    roundsSinceHigh = totalRounds;
  }

  // Prepare chart data (Recharts likes oldest to newest)
  const chartData = [...multipliers].slice(0, 30).reverse().map((r, idx) => ({
    round: idx + 1,
    multiplier: r.multiplier,
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }));

  // Histogram buckets calculation
  const buckets = [
    { name: '1.0x-1.2x', count: 0, color: '#f43f5e' }, // high crash risk
    { name: '1.2x-2.0x', count: 0, color: '#3b82f6' }, // low multipliers
    { name: '2.0x-5.0x', count: 0, color: '#8b5cf6' }, // medium multipliers
    { name: '5.0x-10.0x', count: 0, color: '#a78bfa' },
    { name: '10.0x-20.0x', count: 0, color: '#ec4899' },
    { name: '20.0x+', count: 0, color: '#e11d48' } // super multiplier
  ];

  multipliers.forEach(r => {
    const m = r.multiplier;
    if (m >= 1.0 && m < 1.2) buckets[0].count++;
    else if (m >= 1.2 && m < 2.0) buckets[1].count++;
    else if (m >= 2.0 && m < 5.0) buckets[2].count++;
    else if (m >= 5.0 && m < 10.0) buckets[3].count++;
    else if (m >= 10.0 && m < 20.0) buckets[4].count++;
    else if (m >= 20.0) buckets[5].count++;
  });

  return (
    <motion.div 
      className="min-h-screen bg-[#060814] font-sans text-slate-200 antialiased selection:bg-rose-500/30 selection:text-white bg-grid-pattern"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated Background Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-rose-500/20"
            style={{
              left: `${10 + i * 18}%`,
              bottom: '-10px',
            }}
            animate={{
              y: [0, -window.innerHeight - 100],
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              delay: i * 1.5,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Decorative top vibrant neon laser border */}
      <motion.div 
        className="h-1.5 bg-gradient-to-r from-rose-600 via-pink-500 to-amber-500 shadow-md shadow-rose-500/10 relative z-10"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* Main Header */}
      <motion.header 
        className="border-b border-white/5 bg-[#0a0d1e]/80 backdrop-blur-md sticky top-0 z-40"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          >
            <motion.div 
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 p-[1px] shadow-lg shadow-rose-950/30"
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-full h-full bg-[#0d1424] rounded-xl flex items-center justify-center">
                <span className="text-rose-500 font-display font-black text-xl select-none tracking-tighter">A</span>
              </div>
            </motion.div>
            <div>
              <h1 className="text-sm md:text-base font-display font-bold text-white tracking-tight flex items-center gap-2">
                Aviator Tracker & Predictor
                <motion.span 
                  className="text-[9px] bg-rose-950/80 border border-rose-900/60 text-rose-400 px-1.5 py-0.5 rounded-full font-mono uppercase font-semibold tracking-wide"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Mostbet Edition
                </motion.span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">CRASH PATTERN LOG ENGINE</p>
            </div>
          </motion.div>

          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          >
            {/* Database Sync Status */}
            <motion.div 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-medium transition-all duration-300 ${
                dbConnected 
                  ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40 shadow-sm shadow-emerald-950/20' 
                  : 'bg-amber-950/30 text-amber-500 border-amber-900/40 shadow-sm shadow-amber-950/20 animate-pulse'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              <motion.span 
                className={`w-1.5 h-1.5 rounded-full ${dbConnected ? 'bg-emerald-400' : 'bg-amber-500'}`}
                animate={dbConnected ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Database size={13} className="opacity-80" />
              {dbConnected ? 'Cloud Sync (Firestore)' : 'Local Safe Mode'}
            </motion.div>

            {/* Sound Toggle */}
            <motion.button
              id="btn-toggle-app-alerts"
              onClick={() => { initAudio(); setSoundAlerts(!soundAlerts); }}
              className={`p-2 rounded-xl border transition-all ${
                soundAlerts 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'
              }`}
              title={soundAlerts ? 'Alarms Unmuted' : 'Alarms Muted'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {soundAlerts ? <Bell size={16} /> : <BellOff size={16} />}
            </motion.button>

            {/* Force Reload */}
            <motion.button
              id="btn-reload-history"
              onClick={fetchHistory}
              disabled={syncing}
              className="p-2 rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Refresh database feed"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            </motion.button>
          </motion.div>
        </div>
      </motion.header>

      {/* Alarm Warning Beacon */}
      <AnimatePresence>
        {activeAlarm && (
          <motion.div 
            className="bg-rose-950/40 border-b border-rose-900/60 px-4 py-3 flex items-center justify-between text-xs text-rose-300"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <motion.div 
              className="flex items-center gap-2.5 font-medium"
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <motion.span 
                className="w-2.5 h-2.5 rounded-full bg-rose-500"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="font-bold tracking-widest text-rose-400 uppercase font-display">PATTERN ALERT TRIGGERED:</span>
              <span className="font-semibold text-slate-100">{activeAlarm}</span>
            </motion.div>
            <motion.button
              id="btn-dismiss-alarm"
              onClick={() => setActiveAlarm(null)}
              className="px-3 py-1 rounded bg-rose-900 hover:bg-rose-800 text-white font-semibold transition-all shadow-md shadow-rose-950/40"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Dismiss
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <motion.main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Loading State */}
        {loadingHistory && (
          <motion.div 
            className="flex flex-col items-center justify-center py-20 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Plane size={40} className="text-rose-500" />
            </motion.div>
            <p className="text-sm text-slate-400 font-mono">Loading flight history...</p>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}

        {/* Real-Time Horizon Tape (Horizontal bubbles) */}
        <motion.div 
          id="live-horizon-tape" 
          className="glass-card rounded-2xl p-4 shadow-2xl"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History size={15} className="text-rose-500" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
                Live Multiplier History (Newest Left)
              </span>
            </div>
            {totalRounds > 0 && (
              <motion.button
                id="btn-delete-database-history"
                onClick={handleClearHistory}
                className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="Wipe database rounds"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Trash2 size={13} />
                Wipe History
              </motion.button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {multipliers.length === 0 ? (
              <motion.p 
                className="text-xs text-slate-500 italic py-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                No rounds logged. Use manual entry or copy the browser console scraper script to begin tracking live casino rounds in real-time.
              </motion.p>
            ) : (
              multipliers.slice(0, 40).map((r, i) => {
                let colorClass = 'bg-sky-950/30 text-sky-400 border-sky-900/40'; // < 2.0x
                if (r.multiplier >= 2.0 && r.multiplier < 10.0) {
                  colorClass = 'bg-violet-950/30 text-violet-400 border-violet-900/40';
                } else if (r.multiplier >= 10.0 && r.multiplier < 20.0) {
                  colorClass = 'bg-pink-950/30 text-pink-400 border-pink-900/40';
                } else if (r.multiplier >= 20.0) {
                  colorClass = 'bg-rose-950/60 text-rose-300 border-rose-500/50 font-bold shadow-md shadow-rose-950/40';
                }

                return (
                  <motion.div
                    key={r.id || i}
                    className={`shrink-0 flex items-center justify-center px-3.5 py-1.5 rounded-full border text-xs font-mono transition-all duration-300 ${colorClass}`}
                    title={`Logged at ${new Date(r.timestamp).toLocaleTimeString()} via ${r.source}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03, type: "spring", stiffness: 200 }}
                    whileHover={{ scale: 1.15, y: -2 }}
                  >
                    {r.multiplier.toFixed(2)}x
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Real-Time Stats Summary Cards Row */}
        <motion.div 
          id="statistics-cards-row" 
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
        >
          {[
            {
              label: 'Tracked Rounds',
              value: totalRounds,
              unit: 'flights',
              sub: 'Current collection scale',
              color: 'text-white'
            },
            {
              label: 'Median Multiplier',
              value: medianMultiplier > 0 ? `${medianMultiplier.toFixed(2)}x` : '--',
              unit: '',
              sub: `Average (mean): ${avgMultiplier.toFixed(2)}x`,
              color: 'text-white'
            },
            {
              label: `Crash Under ${statThreshold.toFixed(1)}x`,
              value: `${underThresholdRatio.toFixed(0)}%`,
              unit: '',
              sub: `${roundsUnderThreshold} of ${totalRounds} rounds`,
              color: 'text-rose-500',
              hasSlider: true
            },
            {
              label: 'Massive Drought',
              value: roundsSinceHigh,
              unit: 'rounds',
              sub: 'Rounds since any > 20.0x multiplier',
              color: roundsSinceHigh >= 30 ? 'text-amber-500' : 'text-white'
            }
          ].map((card, i) => (
            <motion.div
              key={card.label}
              className="glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between"
              variants={statCardVariants}
              custom={i}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">
                {card.label}
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <motion.span 
                  className={`text-3xl font-mono font-bold ${card.color}`}
                  key={String(card.value)}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                >
                  {card.value}
                </motion.span>
                {card.unit && <span className="text-xs text-slate-500">{card.unit}</span>}
              </div>
              
              {card.hasSlider && (
                <div className="mt-3">
                  <input
                    id="slider-stats-threshold"
                    type="range"
                    min="1.1"
                    max="50.0"
                    step="0.5"
                    value={statThreshold}
                    onChange={(e) => setStatThreshold(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              
              <p className="text-[10px] text-slate-500 mt-2 font-mono">{card.sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bento Grid Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANES: Simulator & Visual Charts (7 Cols) */}
          <motion.div 
            className="lg:col-span-7 space-y-6"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <PatternLearningPredictor multipliers={multipliers} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <SuperHighFlyerPredictor multipliers={multipliers} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MultiplierLineChart multipliers={multipliers} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <AutoBetEngine multipliers={multipliers} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <AnalyticsDashboard 
                multipliers={multipliers}
                onAddLocalMultiplier={(val) => handleAddMultiplier(val, 'manual')}
                onClearHistory={handleClearHistory}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MultiplierRanker multipliers={multipliers} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <MultipliersExcelTable multipliers={multipliers} />
            </motion.div>
          </motion.div>

          {/* RIGHT PANES: Alerts Configuration & Manual Logger & Scraper script (5 Cols) */}
          <motion.div 
            className="lg:col-span-5 space-y-6"
            variants={containerVariants}
          >
            {/* Pattern Alarm Rules Engine Panel */}
            <motion.div 
              id="alerts-config-panel" 
              className="glass-card rounded-2xl p-6 shadow-2xl space-y-4"
              variants={cardVariants}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                  <Sliders className="text-rose-500" size={15} />
                  Pattern Alarm Triggers
                </h3>
                <motion.button
                  id="btn-open-add-rule-form"
                  onClick={() => setShowAddRule(!showAddRule)}
                  className="p-1 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {showAddRule ? <X size={13} /> : <Plus size={13} />}
                  {showAddRule ? 'Close' : 'Add Trigger'}
                </motion.button>
              </div>

              {/* Add Custom Rule Form */}
              <AnimatePresence>
                {showAddRule && (
                  <motion.form 
                    onSubmit={handleAddRule} 
                    className="glass-card-red p-4 rounded-xl space-y-3"
                    initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <h4 className="text-xs font-bold text-slate-200 font-display uppercase tracking-wider">Create Custom Multiplier Trigger</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Rule Name</label>
                      <input
                        id="inp-rule-name"
                        type="text"
                        required
                        placeholder="e.g. Danger Squeeze Zone"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        className="w-full glass-input rounded-lg px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Alert Trigger Type</label>
                        <select
                          id="sel-rule-type"
                          value={newRuleType}
                          onChange={(e) => setNewRuleType(e.target.value as any)}
                          className="w-full glass-input rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="consecutive_low">{'Consecutive < threshold'}</option>
                          <option value="no_high">{'No rounds >= threshold'}</option>
                          <option value="average_low">{'Average is < threshold'}</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Multiplier Limit</label>
                        <input
                          id="inp-rule-threshold"
                          type="number"
                          step="0.1"
                          min="1.0"
                          required
                          value={newRuleThreshold}
                          onChange={(e) => setNewRuleThreshold(parseFloat(e.target.value))}
                          className="w-full glass-input rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Required Rounds</label>
                        <input
                          id="inp-rule-rounds"
                          type="number"
                          min="2"
                          max="100"
                          required
                          value={newRuleRounds}
                          onChange={(e) => setNewRuleRounds(parseInt(e.target.value))}
                          className="w-full glass-input rounded-lg px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <motion.button
                          id="btn-submit-add-rule"
                          type="submit"
                          className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-lg font-bold py-1.5 text-xs transition-colors shadow-lg shadow-rose-950/40 cursor-pointer"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Save
                        </motion.button>
                        <motion.button
                          id="btn-cancel-add-rule"
                          type="button"
                          onClick={() => setShowAddRule(false)}
                          className="w-full bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg font-bold py-1.5 text-xs transition-colors cursor-pointer"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* List of active rules */}
              <div className="space-y-2.5">
                <AnimatePresence>
                  {rules.map((rule) => (
                    <motion.div 
                      key={rule.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className={`p-3.5 rounded-xl border transition-all duration-300 ${
                        rule.isTriggered 
                          ? 'bg-rose-950/20 border-rose-800/60 shadow-lg shadow-rose-950/20' 
                          : 'bg-[#080b16]/60 border-white/5 hover:border-white/10 hover:bg-[#080b16]/90'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <input
                            id={`chk-rule-active-${rule.id}`}
                            type="checkbox"
                            checked={rule.isActive}
                            onChange={() => toggleRuleActive(rule.id)}
                          />
                          <div>
                            <p className={`text-xs font-semibold ${rule.isActive ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                              {rule.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Trigger: Last {rule.consecutiveRounds} rounds{' '}
                              {rule.type === 'consecutive_low' ? `all < ${rule.threshold}x` : rule.type === 'no_high' ? `have no > ${rule.threshold}x` : `average < ${rule.threshold}x`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          {rule.isTriggered && (
                            <motion.span 
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-rose-600 text-white tracking-wider"
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              ACTIVE
                            </motion.span>
                          )}
                          <motion.button
                            id={`btn-delete-rule-${rule.id}`}
                            onClick={() => deleteRule(rule.id)}
                            className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                            whileHover={{ scale: 1.2, color: '#f43f5e' }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Sound/Alert setup helper button */}
              <motion.button
                id="btn-request-notifications"
                onClick={requestNotificationPermission}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 border border-white/5 hover:border-white/10 bg-[#080b16]/60 hover:bg-[#080b16] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Bell size={13} className="text-rose-400" />
                Enable Native OS Push Alerts
              </motion.button>
            </motion.div>

            {/* Manual Multiplier Input Form */}
            <motion.div 
              id="manual-logger-panel" 
              className="glass-card rounded-2xl p-6 shadow-2xl"
              variants={cardVariants}
            >
              <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 mb-3 uppercase tracking-widest">
                <Plus className="text-rose-500" size={15} />
                Manual Round Entry
              </h3>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  id="inp-manual-multiplier"
                  type="number"
                  step="0.01"
                  min="1.00"
                  required
                  placeholder="e.g. 1.84"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-grow glass-input rounded-xl px-4 py-2.5 text-sm placeholder-slate-600"
                />
                <motion.button
                  id="btn-submit-manual-round"
                  type="submit"
                  disabled={manualSubmitting}
                  className="bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white px-5 py-2.5 rounded-xl text-xs font-semibold border border-white/5 hover:border-white/10 shrink-0 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {manualSubmitting ? 'Syncing...' : 'Log Multiplier'}
                </motion.button>
              </form>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">
                Log multipliers directly while watching your game window on Mostbet Casino.
              </p>
            </motion.div>

            {/* Console Scraper Code Block Panel */}
            <motion.div variants={itemVariants}>
              <ConsoleScraper />
            </motion.div>
          </motion.div>
        </div>
      </motion.main>

      {/* Humble Footer */}
      <motion.footer 
        className="border-t border-white/5 py-8 mt-12 text-center text-slate-600 text-xs bg-[#04060f]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="font-display font-medium tracking-wide">&copy; 2026 Aviator Tracker & Pattern Predictor. All rights reserved.</p>
        <p className="font-mono text-[10px] mt-2 max-w-xl mx-auto text-slate-600/80 leading-relaxed">
          HOUSE ADVISORY: Trial outcomes are statistically independent random events. Use metrics and AI pattern suggestions as statistical guidance only. Play responsibly.
        </p>
      </motion.footer>
    </motion.div>
  );
}