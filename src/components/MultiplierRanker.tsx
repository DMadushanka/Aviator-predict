import React, { useState, useMemo } from 'react';
import { Trophy, Clock, Search, ArrowDownAZ, ArrowUpAZ, Sparkles, Filter, ListCollapse } from 'lucide-react';
import { MultiplierRecord } from '../types';

interface MultiplierRankerProps {
  multipliers: MultiplierRecord[];
}

export default function MultiplierRanker({ multipliers }: MultiplierRankerProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [limit, setLimit] = useState<number>(15);
  const [minMultiplier, setMinMultiplier] = useState<number>(1.00);

  // Categorization function for multipliers
  const getCategoryDetails = (val: number) => {
    if (val < 1.50) {
      return {
        label: 'CRASH',
        color: 'text-rose-400 bg-rose-950/30 border-rose-900/40',
        badge: '🚨 Instant'
      };
    }
    if (val < 2.00) {
      return {
        label: 'LOW',
        color: 'text-amber-400 bg-amber-950/30 border-amber-900/40',
        badge: '📉 Sub-2x'
      };
    }
    if (val < 10.00) {
      return {
        label: 'MEDIUM',
        color: 'text-violet-400 bg-violet-950/30 border-violet-900/40',
        badge: '⚡ Medium'
      };
    }
    return {
      label: 'HIGH FLYER',
      color: 'text-rose-300 bg-rose-900/30 border-rose-500/40 font-extrabold neon-red-text',
      badge: '🚀 Legendary'
    };
  };

  // Sort and rank multipliers from highest to lowest
  const rankedMultipliers = useMemo(() => {
    // We clone the array to avoid mutating state
    const sorted = [...multipliers].sort((a, b) => b.multiplier - a.multiplier);
    
    // Assign overall rank to each record (relative to the whole set)
    return sorted.map((record, index) => ({
      ...record,
      overallRank: index + 1
    }));
  }, [multipliers]);

  // Filter based on search input and minimum multiplier
  const filteredRankings = useMemo(() => {
    return rankedMultipliers.filter(item => {
      const matchesSearch = item.multiplier.toFixed(2).includes(searchTerm) || 
                            item.source.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMinVal = item.multiplier >= minMultiplier;
      return matchesSearch && matchesMinVal;
    });
  }, [rankedMultipliers, searchTerm, minMultiplier]);

  const displayedRankings = useMemo(() => {
    return filteredRankings.slice(0, limit);
  }, [filteredRankings, limit]);

  // Format timestamp nicely
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Top Statistics indicators
  const topStats = useMemo(() => {
    if (multipliers.length === 0) return { max: 0, avgTop: 0, highFlyerCount: 0 };
    const max = rankedMultipliers[0]?.multiplier || 0;
    const top10Percent = rankedMultipliers.slice(0, Math.max(1, Math.ceil(multipliers.length * 0.1)));
    const avgTop = top10Percent.reduce((acc, m) => acc + m.multiplier, 0) / top10Percent.length;
    const highFlyerCount = multipliers.filter(m => m.multiplier >= 10.0).length;

    return { max, avgTop, highFlyerCount };
  }, [multipliers, rankedMultipliers]);

  return (
    <div id="multiplier-leaderboard-panel" className="glass-card rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
            <Trophy size={20} className="plane-flight" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              Historical Flight Leaderboard
              <span className="text-[9px] bg-rose-950/80 border border-rose-900/40 text-rose-400 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">
                Ranked Live
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">Ranked order of recorded flight crash multipliers from peak to low</p>
          </div>
        </div>

        {/* Quick Filter Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Limit:</span>
          <select
            id="sel-ranker-limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="glass-input rounded-lg px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
          >
            <option value={10}>Top 10</option>
            <option value={15}>Top 15</option>
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>All Records</option>
          </select>
        </div>
      </div>

      {multipliers.length === 0 ? (
        <div className="py-12 text-center bg-[#080b16]/30 rounded-xl border border-white/5">
          <Trophy className="text-slate-600 mx-auto opacity-30 mb-2" size={36} />
          <p className="text-xs text-slate-400">Awaiting casino data points to establish rankings...</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Quick Bento Stats for Peak flights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-[#080c16]/75 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">All-Time Peak</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-mono font-black text-rose-400 neon-red-text">
                  {topStats.max.toFixed(2)}x
                </span>
              </div>
              <span className="text-[8px] text-slate-500 font-mono">Highest recorded multiplier</span>
            </div>

            <div className="bg-[#080c16]/75 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">Top 10% Average</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-mono font-bold text-violet-400">
                  {topStats.avgTop.toFixed(2)}x
                </span>
              </div>
              <span className="text-[8px] text-slate-500 font-mono">Mean multiplier of peak flights</span>
            </div>

            <div className="bg-[#080c16]/75 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">High Flyers (&gt;= 10x)</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-mono font-bold text-emerald-400">
                  {topStats.highFlyerCount}
                </span>
                <span className="text-[10px] text-slate-500">flights</span>
              </div>
              <span className="text-[8px] text-slate-500 font-mono">Rounds escaping early crash zones</span>
            </div>
          </div>

          {/* Search/Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-[#060914] p-3 rounded-xl border border-white/5">
            {/* Search Input */}
            <div className="relative flex-grow min-w-[200px]">
              <Search className="absolute left-3 top-2.5 text-slate-600" size={14} />
              <input
                id="inp-ranker-search"
                type="text"
                placeholder="Search multiplier values..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full glass-input rounded-lg pl-9 pr-3 py-1.5 text-xs placeholder-slate-600"
              />
            </div>

            {/* Threshold Slider */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold flex items-center gap-1">
                <Filter size={11} className="text-rose-400" />
                Min Multiplier:
              </span>
              <input
                id="range-ranker-min"
                type="range"
                min="1.0"
                max="50.0"
                step="0.5"
                value={minMultiplier}
                onChange={(e) => setMinMultiplier(parseFloat(e.target.value))}
                className="w-24 sm:w-32 h-1.5 bg-[#0e1424] rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <span className="text-xs font-mono font-bold text-slate-300 w-12 text-right">
                {minMultiplier.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Ranked List Grid */}
          <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 bg-[#080b16] py-2 px-4 border-b border-white/5 text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">
              <span className="col-span-2 text-center">RANK</span>
              <span className="col-span-3">MULTIPLIER</span>
              <span className="col-span-3">CATEGORY</span>
              <span className="col-span-4 text-right">TIMESTAMP & DATE</span>
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
              {displayedRankings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-sans italic">
                  No multipliers matching current filters. Try lowering the slider or search string.
                </div>
              ) : (
                displayedRankings.map((item, idx) => {
                  const details = getCategoryDetails(item.multiplier);
                  
                  // Style rank badges uniquely for podium placements (1st, 2nd, 3rd)
                  let rankBadge = '';
                  let rankBg = 'bg-[#0b1022] text-slate-400';
                  
                  if (item.overallRank === 1) {
                    rankBadge = '🥇';
                    rankBg = 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black';
                  } else if (item.overallRank === 2) {
                    rankBadge = '🥈';
                    rankBg = 'bg-slate-300/15 text-slate-300 border border-slate-300/30 font-black';
                  } else if (item.overallRank === 3) {
                    rankBadge = '🥉';
                    rankBg = 'bg-amber-700/15 text-amber-600 border border-amber-700/20 font-black';
                  }

                  return (
                    <div 
                      key={item.id} 
                      className={`grid grid-cols-12 gap-2 items-center py-3 px-4 text-xs transition-colors hover:bg-white/2`}
                    >
                      {/* Rank Indicator */}
                      <div className="col-span-2 flex justify-center">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] text-center min-w-[28px] ${rankBg}`}>
                          {rankBadge ? `${rankBadge}` : `#${item.overallRank}`}
                        </span>
                      </div>

                      {/* Multiplier value */}
                      <div className="col-span-3">
                        <span className={`font-mono text-sm font-black ${item.multiplier >= 10 ? 'text-rose-400 neon-red-text' : 'text-slate-200'}`}>
                          {item.multiplier.toFixed(2)}x
                        </span>
                      </div>

                      {/* Category Label */}
                      <div className="col-span-3 flex items-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono border uppercase tracking-wider ${details.color}`}>
                          {details.badge}
                        </span>
                      </div>

                      {/* Time and Date */}
                      <div className="col-span-4 text-right flex flex-col justify-center">
                        <span className="font-mono text-[11px] text-slate-300 font-semibold flex items-center justify-end gap-1">
                          <Clock size={10} className="text-slate-500" />
                          {formatTime(item.timestamp)}
                        </span>
                        <span className="text-[9px] text-slate-500 font-sans mt-0.5">
                          {formatDate(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* List count overview footer info */}
            <div className="bg-[#05070e] py-2.5 px-4 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>Showing {displayedRankings.length} of {filteredRankings.length} qualified flights</span>
              {filteredRankings.length > limit && (
                <button
                  id="btn-ranker-load-more"
                  onClick={() => setLimit(prev => prev + 15)}
                  className="text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Load More...
                </button>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
