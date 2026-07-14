import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Label
} from 'recharts';
import { 
  TrendingUp, Activity, HelpCircle, Eye, EyeOff, Layers, Info, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { MultiplierRecord } from '../types';

interface MultiplierLineChartProps {
  multipliers: MultiplierRecord[];
}

export default function MultiplierLineChart({ multipliers }: MultiplierLineChartProps) {
  const [roundsLimit, setRoundsLimit] = useState<number>(20);
  const [scaleMode, setScaleMode] = useState<'capped' | 'linear' | 'log'>('capped');
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Prepare chronological list of records (oldest to newest for correct timeline flow)
  const chartData = useMemo(() => {
    if (multipliers.length === 0) return [];
    
    // Copy and reverse to get chronological order (past to present)
    const chronList = [...multipliers].reverse();
    
    // Filter to the requested last N rounds
    const sliced = chronList.slice(-roundsLimit);
    
    return sliced.map((item, idx) => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Calculate scaled values to make visualization look proportional
      let scaledValue = item.multiplier;
      if (scaleMode === 'capped' && item.multiplier > 15) {
        // Soft compression for outliers above 15x
        scaledValue = 15 + Math.log2(item.multiplier - 14);
      } else if (scaleMode === 'log') {
        scaledValue = Math.log10(item.multiplier) + 1;
      }

      return {
        id: item.id,
        roundIndex: multipliers.length - sliced.length + idx + 1,
        multiplier: item.multiplier,
        scaledValueValue: Number(scaledValue.toFixed(2)),
        time: timeStr,
        source: item.source,
        isWin: item.multiplier >= 2.0,
      };
    });
  }, [multipliers, roundsLimit, scaleMode]);

  // Stat summary for the current visible window
  const visibleStats = useMemo(() => {
    if (chartData.length === 0) return { avg: 0, wins: 0, losses: 0, winRate: 0, highest: 0 };
    
    const vals = chartData.map(d => d.multiplier);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / chartData.length;
    const highest = Math.max(...vals);
    
    const wins = chartData.filter(d => d.isWin).length;
    const losses = chartData.length - wins;
    const winRate = (wins / chartData.length) * 100;
    
    return { avg, wins, losses, winRate, highest };
  }, [chartData]);

  // Dynamic color matching for Recharts tooltips & custom SVG gradients
  const gradientOffset = useMemo(() => {
    if (chartData.length === 0) return 0;
    
    const dataMax = Math.max(...chartData.map(item => item.scaledValueValue));
    const dataMin = Math.min(...chartData.map(item => item.scaledValueValue));
    
    if (dataMax === dataMin) return 0;
    
    // Position of 2.0x on our scale
    let thresholdVal = 2.0;
    if (scaleMode === 'log') {
      thresholdVal = Math.log10(2.0) + 1;
    }
    
    if (dataMax <= thresholdVal) return 0;
    if (dataMin >= thresholdVal) return 1;
    
    return (dataMax - thresholdVal) / (dataMax - dataMin);
  }, [chartData, scaleMode]);

  if (multipliers.length === 0) {
    return (
      <div id="multiplier-chart-empty" className="glass-card rounded-2xl p-8 text-center space-y-4">
        <Activity className="text-slate-600 mx-auto animate-pulse" size={32} />
        <div>
          <h4 className="text-xs font-semibold text-slate-300 font-display uppercase tracking-wider">Awaiting Flight Data</h4>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-sans">
            Please log manual multipliers or start the scraper to construct the dynamic multiplier timeline chart.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="multiplier-timeline-chart-panel" className="glass-card rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Visual background ambient glow */}
      <div className="absolute -top-10 -right-10 w-44 h-44 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 shadow-sm">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              Sequence Transition Chart
              <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">
                Live
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">Visualizing consecutive multiplier swings and crash threshold boundaries</p>
          </div>
        </div>

        {/* Filters and scale options */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Rounds limit */}
          <div className="flex items-center gap-1 bg-[#0a0d1e] p-1 rounded-xl border border-white/5">
            {[10, 20, 30, 50].map(limit => (
              <button
                key={limit}
                onClick={() => setRoundsLimit(limit)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  roundsLimit === limit 
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' 
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                {limit}R
              </button>
            ))}
          </div>

          {/* Scale mode selector */}
          <div className="flex items-center gap-1 bg-[#0a0d1e] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setScaleMode('capped')}
              title="Soft-capped visual scaling to keep charts clean"
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                scaleMode === 'capped'
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Proportional
            </button>
            <button
              onClick={() => setScaleMode('linear')}
              title="Standard flat linear scale"
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                scaleMode === 'linear'
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Linear
            </button>
          </div>

          {/* Toggle Grid */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="p-1.5 rounded-xl bg-[#0a0d1e] border border-white/5 text-slate-500 hover:text-slate-300 cursor-pointer"
            title="Toggle gridlines"
          >
            {showGrid ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        </div>
      </div>

      {/* Mini metric tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Win rate indicator */}
        <div className="bg-black/25 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Win Rate (≥ 2.0x)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-mono font-bold text-indigo-400">{visibleStats.winRate.toFixed(0)}%</span>
            <div className="text-[10px] text-slate-500 font-mono">
              <span className="text-emerald-400 font-semibold">{visibleStats.wins}</span> / {chartData.length}
            </div>
          </div>
        </div>

        {/* Average value */}
        <div className="bg-black/25 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Window Average</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-mono font-bold text-slate-200">{visibleStats.avg.toFixed(2)}x</span>
            <div className="text-[10px] text-slate-500 font-mono">
              Avg crash limit
            </div>
          </div>
        </div>

        {/* Highest in window */}
        <div className="bg-black/25 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Window Max Peak</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-mono font-bold text-rose-400">{visibleStats.highest.toFixed(2)}x</span>
            <span className="text-[9px] text-slate-500 font-mono bg-rose-950/20 px-1.5 py-0.2 rounded border border-rose-900/30">
              Outlier
            </span>
          </div>
        </div>

        {/* Last round outcome */}
        <div className="bg-black/25 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Recent Momentum</span>
          <div className="flex items-baseline justify-between mt-1">
            {chartData[chartData.length - 1]?.isWin ? (
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <ArrowUpRight size={12} />
                PROFIT STREAK
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-900/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <ArrowDownRight size={12} />
                CRASH SQUEEZE
              </span>
            )}
            <span className="text-xs font-mono font-bold text-slate-300">
              {chartData[chartData.length - 1]?.multiplier.toFixed(2)}x
            </span>
          </div>
        </div>

      </div>

      {/* Main Graph Area */}
      <div className="bg-[#080b16]/45 rounded-2xl p-4 border border-white/5">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="splitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={gradientOffset} stopColor="#e11d48" stopOpacity={0.4} />
                  <stop offset={gradientOffset} stopColor="#38bdf8" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              {showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              )}

              <XAxis 
                dataKey="roundIndex" 
                stroke="#334155" 
                fontSize={10} 
                tickLine={false}
                dy={8}
                label={{ value: 'Rounds Historical Chronology (Oldest → Latest)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 9 }}
              />
              
              <YAxis 
                stroke="#334155" 
                fontSize={10} 
                tickLine={false}
                dx={-4}
                domain={[1, 'auto']}
              />

              <Tooltip
                cursor={{ stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0b1329] border border-white/10 rounded-xl p-3 shadow-xl space-y-2 font-mono text-xs text-slate-300">
                        <div className="flex justify-between items-center gap-6 border-b border-white/5 pb-1.5">
                          <span className="text-[10px] text-slate-500">Round #{data.roundIndex}</span>
                          <span className="text-[10px] text-slate-500 uppercase bg-white/5 px-1.5 py-0.2 rounded">
                            {data.source}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${data.isWin ? 'bg-emerald-500 shadow-sm shadow-emerald-950' : 'bg-sky-500 shadow-sm shadow-sky-950'}`} />
                          <div>
                            <span className="text-slate-400">Multiplier: </span>
                            <span className={`font-bold text-sm ${data.isWin ? 'text-emerald-400' : 'text-sky-400'}`}>
                              {data.multiplier.toFixed(2)}x
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                          <span>Recorded time:</span>
                          <span>{data.time}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Threshold indicator line at 2.0x */}
              <ReferenceLine 
                y={scaleMode === 'log' ? Math.log10(2.0) + 1 : 2.0} 
                stroke="#475569" 
                strokeDasharray="4 4"
                strokeWidth={1.5}
              >
                <Label 
                  value="2.00x Safety Reference" 
                  position="top" 
                  fill="#64748b" 
                  fontSize={8} 
                  offset={4}
                  className="font-mono tracking-widest uppercase"
                />
              </ReferenceLine>

              {/* Area graph */}
              <Area
                type="monotone"
                dataKey="scaledValueValue"
                stroke="#e11d48"
                strokeWidth={2}
                fill="url(#splitGradient)"
                activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 1.5, fill: '#e11d48' }}
              />

            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Explainer Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500/60 inline-block" />
              Profit Range (≥ 2.00x)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/10 border border-sky-500/40 inline-block" />
              Crash Squeeze (&lt; 2.00x)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <Info size={11} />
            <span>Dual area visualization splits precisely at the 2.00x marker.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
