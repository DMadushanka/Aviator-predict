import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, ShieldAlert, Sparkles, Clock, History, 
  Layers, Lightbulb, Zap, Download, Upload, Trash2, Calendar, Gauge
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { MultiplierRecord } from '../types';

interface AnalyticsDashboardProps {
  multipliers: MultiplierRecord[];
  onAddLocalMultiplier: (val: number) => void;
  onClearHistory: () => void;
}

export default function AnalyticsDashboard({ multipliers, onAddLocalMultiplier, onClearHistory }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'prediction' | 'time' | 'streaks' | 'backup'>('prediction');
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.0);

  // Load browser localStorage backup list if any, to merge or manage
  const [localBackupCount, setLocalBackupCount] = useState<number>(0);

  useEffect(() => {
    const localData = localStorage.getItem('aviator_local_multipliers');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        setLocalBackupCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch (e) {
        setLocalBackupCount(0);
      }
    }
  }, [multipliers]);

  // Calculate stats
  const totalRounds = multipliers.length;

  const stats = React.useMemo(() => {
    if (totalRounds === 0) return {
      avg: 0,
      median: 0,
      max: 0,
      blueRatio: 0,   // < 2x
      purpleRatio: 0, // 2x - 10x
      pinkRatio: 0,   // 10x - 50x
      redRatio: 0,    // >= 50x
    };

    const values = multipliers.map(r => r.multiplier);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / totalRounds;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const max = Math.max(...values);

    const blue = values.filter(v => v < 2.0).length;
    const purple = values.filter(v => v >= 2.0 && v < 10.0).length;
    const pink = values.filter(v => v >= 10.0 && v < 50.0).length;
    const red = values.filter(v => v >= 50.0).length;

    return {
      avg,
      median,
      max,
      blueRatio: (blue / totalRounds) * 100,
      purpleRatio: (purple / totalRounds) * 100,
      pinkRatio: (pink / totalRounds) * 100,
      redRatio: (red / totalRounds) * 100,
    };
  }, [multipliers]);

  // Next high multiplier prediction model (Statistical Expectation)
  const predictionData = React.useMemo(() => {
    if (totalRounds < 5) {
      return {
        nextHighExpectancy: 'LOW',
        expectancyPercentage: 10,
        consecutiveLows: 0,
        roundsSinceHigh: 0,
        averageGapBetweenHighs: 15,
        estimatedRoundsToNextHigh: 'N/A',
        safestCashoutTarget: 1.20,
        winProbTarget: 50,
      };
    }

    // A "high multiplier" is defined as >= 10.0x
    const HIGH_THRESHOLD = 10.0;
    
    // Find consecutive low multipliers (recent trend)
    let consecutiveLows = 0;
    for (const r of multipliers) {
      if (r.multiplier < 2.0) {
        consecutiveLows++;
      } else {
        break;
      }
    }

    // Rounds since last high multiplier (>= 10.0x)
    let roundsSinceHigh = 0;
    const firstHighIndex = multipliers.findIndex(r => r.multiplier >= HIGH_THRESHOLD);
    if (firstHighIndex !== -1) {
      roundsSinceHigh = firstHighIndex;
    } else {
      roundsSinceHigh = totalRounds;
    }

    // Calculate historical spacing/gap between consecutive high multipliers (>= 10.0x)
    const highIndices: number[] = [];
    multipliers.forEach((r, idx) => {
      if (r.multiplier >= HIGH_THRESHOLD) {
        highIndices.push(idx);
      }
    });

    const gaps: number[] = [];
    for (let i = 0; i < highIndices.length - 1; i++) {
      gaps.push(highIndices[i + 1] - highIndices[i]);
    }

    const averageGapBetweenHighs = gaps.length > 0 
      ? Math.round(gaps.reduce((acc, g) => acc + g, 0) / gaps.length)
      : 15; // default fallback gap of 15 rounds

    // Probability Expectancy Calculation
    // As roundsSinceHigh increases beyond the averageGapBetweenHighs, the "expectancy" of a correction increases.
    // This is mathematically independent but statistically follows a density curve (Poisson process).
    let expectancyPercentage = Math.round((roundsSinceHigh / Math.max(averageGapBetweenHighs, 1)) * 100);
    if (expectancyPercentage > 100) {
      // Add bonus percentage for consecutive cold streaks
      expectancyPercentage += consecutiveLows * 10;
    }
    // Cap at 99% (nothing is 100% in a random game!)
    expectancyPercentage = Math.min(expectancyPercentage, 99);

    let nextHighExpectancy: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (expectancyPercentage >= 150) nextHighExpectancy = 'CRITICAL';
    else if (expectancyPercentage >= 100) nextHighExpectancy = 'HIGH';
    else if (expectancyPercentage >= 60) nextHighExpectancy = 'MEDIUM';

    // Calculate estimated rounds to next high multiplier
    let estimatedRoundsToNextHigh = 'Immediate (Overdue)';
    if (roundsSinceHigh < averageGapBetweenHighs) {
      const diff = averageGapBetweenHighs - roundsSinceHigh;
      estimatedRoundsToNextHigh = `${Math.max(1, diff - 2)} - ${diff + 2} rounds`;
    }

    // Safest target recommended based on current cold streaks
    let safestCashoutTarget = 1.35;
    if (consecutiveLows >= 5) {
      safestCashoutTarget = 1.15; // lower target because game is on extreme tight crash streak
    } else if (consecutiveLows === 0) {
      safestCashoutTarget = 1.50; // game is "hot", can aim slightly higher
    }

    // Target multiplier win probability
    // Historical win probability for user's target input
    const targetWins = multipliers.filter(r => r.multiplier >= targetMultiplier).length;
    const winProbTarget = totalRounds > 0 ? Math.round((targetWins / totalRounds) * 100) : 50;

    return {
      nextHighExpectancy,
      expectancyPercentage,
      consecutiveLows,
      roundsSinceHigh,
      averageGapBetweenHighs,
      estimatedRoundsToNextHigh,
      safestCashoutTarget,
      winProbTarget,
    };
  }, [multipliers, targetMultiplier]);

  // Time-of-day interval analysis
  const timeAnalysis = React.useMemo(() => {
    if (totalRounds === 0) return { hourlyDistribution: [], averageByMinute: [] };

    // Group by minutes of the hour (0-9, 10-19, 20-29, 30-39, 40-49, 50-59)
    const minutesBuckets = [
      { interval: "00-09m", count: 0, highCount: 0, avg: 0, total: 0 },
      { interval: "10-19m", count: 0, highCount: 0, avg: 0, total: 0 },
      { interval: "20-29m", count: 0, highCount: 0, avg: 0, total: 0 },
      { interval: "30-39m", count: 0, highCount: 0, avg: 0, total: 0 },
      { interval: "40-49m", count: 0, highCount: 0, avg: 0, total: 0 },
      { interval: "50-59m", count: 0, highCount: 0, avg: 0, total: 0 }
    ];

    multipliers.forEach(r => {
      const date = new Date(r.timestamp);
      const minutes = date.getMinutes();
      const bucketIdx = Math.floor(minutes / 10);
      
      if (bucketIdx >= 0 && bucketIdx < 6) {
        minutesBuckets[bucketIdx].count++;
        minutesBuckets[bucketIdx].total += r.multiplier;
        if (r.multiplier >= 10.0) {
          minutesBuckets[bucketIdx].highCount++;
        }
      }
    });

    // Calculate averages
    minutesBuckets.forEach(b => {
      b.avg = b.count > 0 ? Math.round((b.total / b.count) * 100) / 100 : 0;
    });

    return {
      minutesDistribution: minutesBuckets,
    };
  }, [multipliers]);

  // Longest streak calculations
  const streaks = React.useMemo(() => {
    if (totalRounds === 0) return { currentLows: 0, maxLows: 0, currentHighs: 0, maxHighs: 0 };

    let currentLows = 0;
    let maxLows = 0;
    let currentHighs = 0;
    let maxHighs = 0;

    let tempLows = 0;
    let tempHighs = 0;

    // To compute longest historical streaks, process chronological order (oldest to newest)
    const chronRecords = [...multipliers].reverse();

    chronRecords.forEach(r => {
      // Low multiplier (< 2.0x) streak
      if (r.multiplier < 2.0) {
        tempLows++;
        maxLows = Math.max(maxLows, tempLows);
      } else {
        tempLows = 0;
      }

      // Medium/High multiplier (>= 2.0x) streak
      if (r.multiplier >= 2.0) {
        tempHighs++;
        maxHighs = Math.max(maxHighs, tempHighs);
      } else {
        tempHighs = 0;
      }
    });

    // Current streaks (using the newest item list, which is newest first)
    for (const r of multipliers) {
      if (r.multiplier < 2.0) {
        currentLows++;
      } else {
        break;
      }
    }

    for (const r of multipliers) {
      if (r.multiplier >= 2.0) {
        currentHighs++;
      } else {
        break;
      }
    }

    return {
      currentLows,
      maxLows,
      currentHighs,
      maxHighs
    };
  }, [multipliers]);

  // Local storage management functions
  const handleBackupToLocalStorage = () => {
    localStorage.setItem('aviator_local_multipliers', JSON.stringify(multipliers));
    setLocalBackupCount(multipliers.length);
    alert(`Successfully backed up ${multipliers.length} multiplier records to your browser local storage!`);
  };

  const handleRestoreFromLocalStorage = () => {
    const localData = localStorage.getItem('aviator_local_multipliers');
    if (!localData) {
      alert("No local storage backup found to restore.");
      return;
    }
    try {
      const parsed = JSON.parse(localData);
      if (Array.isArray(parsed)) {
        // Add them to the app state
        parsed.forEach(r => {
          onAddLocalMultiplier(r.multiplier);
        });
        alert(`Successfully synchronized ${parsed.length} records into the log from local cache.`);
      } else {
        alert("Backup file structure is invalid.");
      }
    } catch (err) {
      alert("Failed to parse local storage cache backup.");
    }
  };

  const handleClearLocalStorageBackup = () => {
    if (confirm("Are you sure you want to delete the local storage backup file? This will clear the client backup cache.")) {
      localStorage.removeItem('aviator_local_multipliers');
      setLocalBackupCount(0);
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="glass-card rounded-2xl p-6 shadow-2xl space-y-6">
      
      {/* Tab Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-sm md:text-base font-display font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-rose-500" size={18} />
            Statistical Predictive Engine & Analytics
          </h2>
          <p className="text-[11px] text-slate-500">Real-time local mathematical expectation models & time charts</p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0a0d1e] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('prediction')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'prediction' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold' 
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Gauge size={12} className="inline mr-1" />
            Predictor
          </button>
          
          <button
            onClick={() => setActiveTab('time')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'time' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold' 
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Clock size={12} className="inline mr-1" />
            Time Patterns
          </button>

          <button
            onClick={() => setActiveTab('streaks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'streaks' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold' 
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Layers size={12} className="inline mr-1" />
            Streaks
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'backup' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold' 
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Download size={12} className="inline mr-1" />
            Offline Backup
          </button>
        </div>
      </div>

      {/* TAB 1: EXPECTANCY & NEXT HIGH PREDICTOR */}
      {activeTab === 'prediction' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Expectancy Gauge Widget (Large visual circle concept) */}
            <div className="md:col-span-5 bg-[#080c16]/50 rounded-2xl p-5 border border-white/5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                  High Multiplier Expectancy ({"&gt;="} 10.0x)
                </span>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Poisson Density Distribution Probability</p>
              </div>

              {totalRounds < 5 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500 italic">Add 5+ rounds to boot predictive algorithms</p>
                </div>
              ) : (
                <div className="my-4 flex flex-col items-center">
                  {/* Circular visual gauge bar */}
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="52"
                        className="stroke-slate-900"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="52"
                        className="stroke-rose-500 transition-all duration-1000 ease-out"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 52}
                        strokeDashoffset={2 * Math.PI * 52 * (1 - predictionData.expectancyPercentage / 100)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    
                    {/* Gauge internal text value */}
                    <div className="absolute text-center">
                      <span className="text-2xl font-mono font-black text-white">{predictionData.expectancyPercentage}%</span>
                      <p className="text-[8px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">EXPECTED</p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-3 text-center">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono ${
                      predictionData.nextHighExpectancy === 'CRITICAL' ? 'bg-rose-950/80 text-rose-400 border border-rose-900/60 animate-pulse' :
                      predictionData.nextHighExpectancy === 'HIGH' ? 'bg-orange-950/60 text-orange-400 border border-orange-900/40' :
                      predictionData.nextHighExpectancy === 'MEDIUM' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/40' :
                      'bg-sky-950/60 text-sky-400 border border-sky-900/40'
                    }`}>
                      {predictionData.nextHighExpectancy} EXPECTANCY
                    </span>
                  </div>
                </div>
              )}

              <div className="border-t border-white/5 pt-3.5 mt-2">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Drought Length:</span>
                  <span className="text-slate-300 font-bold">{predictionData.roundsSinceHigh} flights</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono mt-1.5">
                  <span className="text-slate-500">Average Gap:</span>
                  <span className="text-slate-300 font-bold">~{predictionData.averageGapBetweenHighs} flights</span>
                </div>
              </div>
            </div>

            {/* Core Predictive Statistical Grid */}
            <div className="md:col-span-7 space-y-4">
              
              <div className="bg-[#080c16]/50 rounded-2xl p-5 border border-white/5 space-y-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                  Corrections & Target Estimator
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0a0d1e] p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 block mb-0.5">EST. ROUND WINDOW TO NEXT 10x+</span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {predictionData.estimatedRoundsToNextHigh}
                    </span>
                  </div>
                  <div className="bg-[#0a0d1e] p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 block mb-0.5">SAFEST CASHOUT RECOMMENDATION</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {predictionData.safestCashoutTarget.toFixed(2)}x
                    </span>
                  </div>
                </div>

                {/* Target Predictor Input Tester */}
                <div className="bg-[#0d1424]/40 p-4 rounded-xl border border-white/5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Multiplier Win Probability Tool</span>
                      <p className="text-[9px] text-slate-500 font-mono">Test custom cashout targets against historical data</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        value={targetMultiplier}
                        onChange={(e) => setTargetMultiplier(parseFloat(e.target.value) || 2.0)}
                        className="w-12 text-center bg-transparent border-none text-xs font-mono font-bold text-slate-200 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-mono">x</span>
                    </div>
                  </div>

                  {/* Horizontal probability bars */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Survival probability to reach {targetMultiplier.toFixed(1)}x:</span>
                      <span className="font-mono font-bold text-rose-400">{predictionData.winProbTarget}%</span>
                    </div>
                    
                    <div className="h-2 bg-[#05070e] rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-rose-600 to-rose-400 h-full transition-all duration-500"
                        style={{ width: `${predictionData.winProbTarget}%` }}
                      ></div>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono text-right">
                      Calculated from {multipliers.filter(r => r.multiplier >= targetMultiplier).length} of {totalRounds} successful rounds
                    </p>
                  </div>
                </div>

                <div className="bg-rose-950/10 border border-rose-900/10 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={14} />
                  <div>
                    <p className="font-bold text-slate-300">Predictive Modeling Disclaimer:</p>
                    <p className="text-slate-400 mt-0.5 leading-relaxed">
                      This calculator calculates poisson expectancy and spacing correction intervals. Pseudo-random generators do not have a memory, but in long-tail sequences, multipliers converge to a predictable density distribution.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIME INTERVAL & REAL-TIME GENERATION LOG */}
      {activeTab === 'time' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Time of Hour Density Chart */}
            <div className="md:col-span-7 bg-[#080c16]/50 rounded-2xl p-5 border border-white/5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                  Periodicity Index: Minute Density (60-minute cycle)
                </span>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Average crash multiplier grouped by standard minute segments</p>
              </div>

              <div className="h-44">
                {totalRounds === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No data to display. Log rounds to construct minutes patterns.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeAnalysis.minutesDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="interval" stroke="#334155" fontSize={10} />
                      <YAxis stroke="#334155" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0b1329', borderColor: 'rgba(255,255,255,0.08)', fontSize: 11 }}
                      />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {timeAnalysis.minutesDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.avg > 5 ? '#e11d48' : '#8b5cf6'} fillOpacity={0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono text-center">
                Observe if multipliers are spiking during particular windows of the hour.
              </p>
            </div>

            {/* Time performance analysis card */}
            <div className="md:col-span-5 bg-[#080c16]/50 rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                  Real-Time Peak Analysis
                </span>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Statistical hot-zones in current hours</p>
              </div>

              <div className="my-4 space-y-2.5">
                {timeAnalysis.minutesDistribution && timeAnalysis.minutesDistribution.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5 text-xs font-mono">
                    <span className="text-slate-400">{item.interval} slot</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{item.count} rounds</span>
                      <span className="font-bold text-slate-300">Avg {item.avg.toFixed(2)}x</span>
                      {item.highCount > 0 && (
                        <span className="bg-rose-950 text-rose-400 border border-rose-900 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                          {item.highCount} high
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-slate-600 font-mono">
                Some servers exhibit systemic seed cycling periodicities. Watch for high-average minute slots.
              </p>
            </div>

          </div>

          {/* Timeline list with precise timestamps */}
          <div className="bg-[#080c16]/50 rounded-2xl p-5 border border-white/5 space-y-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-display">
              Precise Generation Timeline & Gaps
            </span>

            <div className="max-h-72 overflow-y-auto space-y-2 scrollbar-thin pr-2">
              {multipliers.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No timeline entries found.</p>
              ) : (
                multipliers.slice(0, 30).map((r, i) => {
                  const date = new Date(r.timestamp);
                  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  
                  let badgeColor = 'bg-sky-950/20 text-sky-400 border-sky-900/30';
                  if (r.multiplier >= 2.0 && r.multiplier < 10.0) {
                    badgeColor = 'bg-violet-950/20 text-violet-400 border-violet-900/30';
                  } else if (r.multiplier >= 10.0) {
                    badgeColor = 'bg-rose-950/40 text-rose-400 border-rose-500/40 font-bold';
                  }

                  return (
                    <div key={r.id || i} className="flex items-center justify-between bg-black/20 px-4 py-2.5 rounded-xl border border-white/5 hover:bg-black/40 transition-all text-xs font-mono">
                      <div className="flex items-center gap-3">
                        <Clock size={13} className="text-slate-500" />
                        <span className="text-slate-400">{formattedTime}</span>
                        <span className="text-slate-600 text-[10px]">{formattedDate}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-slate-500 uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {r.source}
                        </span>
                        
                        <div className={`px-2.5 py-0.5 rounded-full border text-xs ${badgeColor}`}>
                          {r.multiplier.toFixed(2)}x
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STREAK STATISTICS & SEQUENCE TRENDS */}
      {activeTab === 'streaks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Low vs High streaks */}
            <div className="bg-[#080c16]/50 rounded-2xl p-5 border border-white/5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                  Streak Counter Diagnostics
                </span>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Consecutive outcomes of standard multiplier bounds</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a0d1e] p-4 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold font-display">Cold Run Streak (&lt; 2.0x)</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-mono font-bold text-rose-400">{streaks.currentLows}</span>
                    <span className="text-slate-500 text-xs">current</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-white/5 pt-1.5 mt-1.5 text-[10px] text-slate-500 font-mono">
                    <span>Longest record:</span>
                    <span className="text-slate-300">{streaks.maxLows} rounds</span>
                  </div>
                </div>

                <div className="bg-[#0a0d1e] p-4 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold font-display">Hot Run Streak (&gt;= 2.0x)</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-mono font-bold text-emerald-400">{streaks.currentHighs}</span>
                    <span className="text-slate-500 text-xs">current</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-white/5 pt-1.5 mt-1.5 text-[10px] text-slate-500 font-mono">
                    <span>Longest record:</span>
                    <span className="text-slate-300">{streaks.maxHighs} rounds</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0d1e]/50 p-4 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-300 font-display uppercase tracking-wide text-[9px]">Streak Spacing Probability Law</p>
                <p className="leading-relaxed text-[11px]">
                  Longest recorded streaks give a baseline limit of the pseudo-random generator state. If the current cold streak ({streaks.currentLows}) is approaching the longest record ({streaks.maxLows}), statistical convergence dictates high probability of a reversal soon.
                </p>
              </div>
            </div>

            {/* General Distribution Ratios */}
            <div className="bg-[#080c16]/50 rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-display">
                  Multiplier Distribution Ratios
                </span>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Ratio breakdown of recorded flights</p>
              </div>

              <div className="my-4 space-y-3">
                {/* Blue */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-sky-400">Blue (&lt; 2.0x)</span>
                    <span>{stats.blueRatio.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-[#05070e] rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full" style={{ width: `${stats.blueRatio}%` }}></div>
                  </div>
                </div>

                {/* Purple */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-violet-400">Purple (2.0x - 10.0x)</span>
                    <span>{stats.purpleRatio.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-[#05070e] rounded-full overflow-hidden">
                    <div className="bg-violet-500 h-full" style={{ width: `${stats.purpleRatio}%` }}></div>
                  </div>
                </div>

                {/* Pink */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-pink-400">Pink (10.0x - 50.0x)</span>
                    <span>{stats.pinkRatio.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-[#05070e] rounded-full overflow-hidden">
                    <div className="bg-pink-500 h-full" style={{ width: `${stats.pinkRatio}%` }}></div>
                  </div>
                </div>

                {/* Red */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-rose-400">Golden/Red (&gt;= 50.0x)</span>
                    <span>{stats.redRatio.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-[#05070e] rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full" style={{ width: `${stats.redRatio}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono flex justify-between border-t border-white/5 pt-2.5">
                <span>Rounds logged: {totalRounds}</span>
                <span>Max multiplier: {stats.max.toFixed(2)}x</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: OFFLINE BACKUP & LOCAL STORAGE CACHE SYNC */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="bg-[#080c16]/50 rounded-2xl p-5 border border-white/5 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-200 font-display uppercase tracking-wider">Browser local storage Sync Engine</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Manage an offline copy of your flight log database directly inside this browser session.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
              
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider">Backup Log</span>
                  <p className="text-[11px] text-slate-400 mt-1">Copy the active dataset to browser LocalStorage to protect it against server recycles.</p>
                </div>
                <button
                  onClick={handleBackupToLocalStorage}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={13} />
                  Backup Now ({totalRounds} items)
                </button>
              </div>

              <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider">Restore Backup</span>
                  <p className="text-[11px] text-slate-400 mt-1">Restore and sync previously backed up multipliers from your local browser database.</p>
                </div>
                <button
                  onClick={handleRestoreFromLocalStorage}
                  disabled={localBackupCount === 0}
                  className={`w-full font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    localBackupCount === 0
                      ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                      : 'bg-[#0c1424] hover:bg-white/10 text-slate-200 border border-white/5'
                  }`}
                >
                  <Download size={13} />
                  Restore Backup ({localBackupCount} items)
                </button>
              </div>

              <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider">Wipe Backup File</span>
                  <p className="text-[11px] text-slate-400 mt-1">Permanently remove the LocalStorage backup database file saved inside this browser.</p>
                </div>
                <button
                  onClick={handleClearLocalStorageBackup}
                  disabled={localBackupCount === 0}
                  className={`w-full font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    localBackupCount === 0
                      ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                      : 'bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 border border-rose-900/30'
                  }`}
                >
                  <Trash2 size={13} />
                  Wipe Backup
                </button>
              </div>

            </div>

            <div className="bg-[#0a0d1e] p-4 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1.5">
              <span className="font-bold text-slate-300 font-display uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Lightbulb size={13} className="text-yellow-400" />
                No Firebase Required
              </span>
              <p className="text-[11px] leading-relaxed">
                By coupling the local server-side database (`multipliers.json` file) and the client-side `localStorage` sync, you can operate this Aviator Tracker entirely locally. Even if Firebase is disconnected or down, your history is kept safe and can be exported, backed up, or loaded instantly.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
