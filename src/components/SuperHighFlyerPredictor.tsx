import React, { useMemo } from 'react';
import { Trophy, Compass, ShieldAlert, Cpu, Sparkles, Flame, Clock, BarChart3, AlertTriangle, PlayCircle } from 'lucide-react';
import { MultiplierRecord } from '../types';

interface SuperHighFlyerPredictorProps {
  multipliers: MultiplierRecord[];
}

export default function SuperHighFlyerPredictor({ multipliers }: SuperHighFlyerPredictorProps) {
  const totalCount = multipliers.length;

  // Chronological order: oldest to newest
  const chronological = useMemo(() => {
    return [...multipliers].reverse();
  }, [multipliers]);

  // Model 1: 10x+ High Flyer Predictor Model
  const model10x = useMemo(() => {
    if (totalCount === 0) return { drought: 0, avgGap: 10, prob: 0, roundsLeft: 10, confidence: 0 };

    let drought = 0;
    for (let i = 0; i < multipliers.length; i++) {
      if (multipliers[i].multiplier >= 10.0) {
        break;
      }
      drought++;
    }

    // Calculate all intervals between 10x+ hits
    const intervals: number[] = [];
    let currentInterval = 0;
    
    chronological.forEach(m => {
      if (m.multiplier >= 10.0) {
        if (currentInterval > 0) {
          intervals.push(currentInterval);
        }
        currentInterval = 0;
      } else {
        currentInterval++;
      }
    });

    const avgGap = intervals.length > 0 
      ? Math.round(intervals.reduce((acc, v) => acc + v, 0) / intervals.length)
      : 12; // Baseline expectation: 1 in 12 flights are 10x+

    // Predict probability and expected rounds left
    const roundsLeft = Math.max(1, avgGap - drought);
    
    // As drought increases past average, the probability of correction peaks
    const ratio = drought / avgGap;
    const prob = Math.min(99, Math.round((1 - Math.exp(-ratio * 1.5)) * 100));
    
    // Confidence in the prediction based on the sample size
    const confidence = Math.min(95, Math.round((intervals.length * 15) + 35));

    return { drought, avgGap, prob, roundsLeft, confidence };
  }, [multipliers, chronological]);

  // Model 2: 100x+ Century Flight Predictor Model
  const model100x = useMemo(() => {
    if (totalCount === 0) return { drought: 0, avgGap: 100, prob: 0, roundsLeft: 100, confidence: 0 };

    let drought = 0;
    for (let i = 0; i < multipliers.length; i++) {
      if (multipliers[i].multiplier >= 100.0) {
        break;
      }
      drought++;
    }

    // Calculate intervals between 100x+ hits
    const intervals: number[] = [];
    let currentInterval = 0;
    
    chronological.forEach(m => {
      if (m.multiplier >= 100.0) {
        if (currentInterval > 0) {
          intervals.push(currentInterval);
        }
        currentInterval = 0;
      } else {
        currentInterval++;
      }
    });

    const avgGap = intervals.length > 0 
      ? Math.round(intervals.reduce((acc, v) => acc + v, 0) / intervals.length)
      : 90; // Baseline expectation: 1 in 90 flights are 100x+

    const roundsLeft = Math.max(1, avgGap - drought);
    const ratio = drought / avgGap;
    const prob = Math.min(99, Math.round((1 - Math.exp(-ratio * 1.2)) * 100));
    const confidence = Math.min(95, Math.round((intervals.length * 30) + 20));

    return { drought, avgGap, prob, roundsLeft, confidence };
  }, [multipliers, chronological]);

  // Model 3: 1000x+ Legendary Sky Predictor Model
  const model1000x = useMemo(() => {
    if (totalCount === 0) return { drought: 0, avgGap: 1000, prob: 0, roundsLeft: 1000, confidence: 0 };

    let drought = 0;
    for (let i = 0; i < multipliers.length; i++) {
      if (multipliers[i].multiplier >= 1000.0) {
        break;
      }
      drought++;
    }

    // Calculate intervals between 1000x+ hits
    const intervals: number[] = [];
    let currentInterval = 0;
    
    chronological.forEach(m => {
      if (m.multiplier >= 1000.0) {
        if (currentInterval > 0) {
          intervals.push(currentInterval);
        }
        currentInterval = 0;
      } else {
        currentInterval++;
      }
    });

    const avgGap = intervals.length > 0 
      ? Math.round(intervals.reduce((acc, v) => acc + v, 0) / intervals.length)
      : 850; // Baseline expectation: 1 in 850 flights are 1000x+

    const roundsLeft = Math.max(1, avgGap - drought);
    const ratio = drought / avgGap;
    const prob = Math.min(99, Math.round((1 - Math.exp(-ratio * 1.0)) * 100));
    const confidence = Math.min(95, Math.round((intervals.length * 40) + 10));

    return { drought, avgGap, prob, roundsLeft, confidence };
  }, [multipliers, chronological]);

  return (
    <div id="super-high-flyer-panel" className="glass-card rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background neon accents */}
      <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Compass size={20} className="plane-flight" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              Super High Flyer Predictor Suite
              <span className="text-[9px] bg-indigo-950/80 border border-indigo-900/40 text-indigo-400 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider animate-pulse">
                Stochastic Models
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">Three specialized deep probability algorithms forecasting extreme outlier crashes</p>
          </div>
        </div>
      </div>

      {totalCount < 5 ? (
        <div className="bg-[#080b16]/50 rounded-2xl p-8 border border-white/5 text-center space-y-4">
          <ShieldAlert className="text-slate-600 mx-auto animate-bounce" size={32} />
          <div>
            <h4 className="text-xs font-semibold text-slate-300 font-display uppercase tracking-wider">Awaiting Flight History ({totalCount}/5 Rounds)</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-sans">
              High-flyer statistical predictions require telemetry data points to calibrate historical drought patterns and model outlier intervals.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* MODEL A: 10x+ Prediction */}
          <div className="bg-[#080c16]/75 rounded-2xl p-5 border border-white/5 space-y-4 flex flex-col justify-between relative overflow-hidden shadow-lg hover:border-indigo-500/20 transition-all group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl"></div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Model Alpha</span>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">10x+ High Flyer</h4>
                </div>
                <div className="px-2 py-0.5 bg-indigo-950 border border-indigo-900 text-indigo-400 text-[8px] font-mono rounded font-bold uppercase">
                  Drought Core
                </div>
              </div>

              {/* Progress to target */}
              <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-slate-500 font-mono">CURRENT DROUGHT</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {model10x.drought} <span className="text-[10px] text-slate-500 font-normal">flights</span>
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-slate-500 font-mono">AVG INTERVAL</span>
                  <span className="text-sm font-mono font-semibold text-slate-300">
                    {model10x.avgGap} <span className="text-[10px] text-slate-500 font-normal">flights</span>
                  </span>
                </div>
              </div>

              {/* Stochastic Forecast */}
              <div className="bg-[#05070e] p-3.5 rounded-xl border border-white/5 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-mono font-bold">NEXT HIT PROBABILITY</span>
                  <span className="text-xs font-mono font-black text-rose-400 flex items-center gap-0.5">
                    <Flame size={11} className="animate-pulse" />
                    {model10x.prob}%
                  </span>
                </div>

                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-300 transition-all duration-700"
                    style={{ width: `${model10x.prob}%` }}
                  />
                  <div className="bg-[#0a0f1c] h-full" style={{ width: `${100 - model10x.prob}%` }} />
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                  <span>Confidence: {model10x.confidence}%</span>
                  <span>Est: {model10x.roundsLeft} rounds left</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 text-[10px] leading-relaxed text-slate-400">
              <span className="text-slate-300 font-semibold text-[9px] block uppercase text-indigo-400 mb-0.5">Model Recommendation:</span>
              {model10x.prob > 75 
                ? "Drought limits exceeded! Heavy stochastic tension indicates a 10x+ outlier is highly expected in the next few flight sequences."
                : "Continuous cycles indicate standard intervals. Continue observing sequence counters before ramping entries."}
            </div>
          </div>

          {/* MODEL B: 100x+ Prediction */}
          <div className="bg-[#080c16]/75 rounded-2xl p-5 border border-white/5 space-y-4 flex flex-col justify-between relative overflow-hidden shadow-lg hover:border-violet-500/20 transition-all group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/5 rounded-full blur-xl"></div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono text-violet-400 font-bold uppercase tracking-wider">Model Beta</span>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">100x+ Century Flight</h4>
                </div>
                <div className="px-2 py-0.5 bg-violet-950 border border-violet-900 text-violet-400 text-[8px] font-mono rounded font-bold uppercase">
                  Poisson Distribution
                </div>
              </div>

              {/* Progress to target */}
              <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-slate-500 font-mono">CURRENT DROUGHT</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {model100x.drought} <span className="text-[10px] text-slate-500 font-normal">flights</span>
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-slate-500 font-mono">AVG INTERVAL</span>
                  <span className="text-sm font-mono font-semibold text-slate-300">
                    {model100x.avgGap} <span className="text-[10px] text-slate-500 font-normal">flights</span>
                  </span>
                </div>
              </div>

              {/* Stochastic Forecast */}
              <div className="bg-[#05070e] p-3.5 rounded-xl border border-white/5 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-mono font-bold">NEXT HIT PROBABILITY</span>
                  <span className="text-xs font-mono font-black text-rose-400 flex items-center gap-0.5">
                    <Flame size={11} className="animate-pulse" />
                    {model100x.prob}%
                  </span>
                </div>

                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-violet-300 transition-all duration-700"
                    style={{ width: `${model100x.prob}%` }}
                  />
                  <div className="bg-[#0a0f1c] h-full" style={{ width: `${100 - model100x.prob}%` }} />
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                  <span>Confidence: {model100x.confidence}%</span>
                  <span>Est: {model100x.roundsLeft} rounds left</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 text-[10px] leading-relaxed text-slate-400">
              <span className="text-slate-300 font-semibold text-[9px] block uppercase text-violet-400 mb-0.5">Model Recommendation:</span>
              {model100x.prob > 60 
                ? "Outlier tension threshold is rising. High indicators of Poisson clustering expect century flight targets to mature."
                : "Statistical standard deviation says keep a moderate stance. The next 100x Century Flight is still assembling patterns."}
            </div>
          </div>

          {/* MODEL C: 1000x+ Prediction */}
          <div className="bg-[#080c16]/75 rounded-2xl p-5 border border-white/5 space-y-4 flex flex-col justify-between relative overflow-hidden shadow-lg hover:border-rose-500/20 transition-all group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-xl"></div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono text-rose-400 font-bold uppercase tracking-wider">Model Gamma</span>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide text-rose-300 neon-red-text font-black">1000x+ Legendary Sky</h4>
                </div>
                <div className="px-2 py-0.5 bg-rose-950 border border-rose-900 text-rose-400 text-[8px] font-mono rounded font-bold uppercase">
                  Long-Memory Model
                </div>
              </div>

              {/* Progress to target */}
              <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-slate-500 font-mono">CURRENT DROUGHT</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {model1000x.drought} <span className="text-[10px] text-slate-500 font-normal">flights</span>
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-slate-500 font-mono">AVG INTERVAL</span>
                  <span className="text-sm font-mono font-semibold text-slate-300">
                    {model1000x.avgGap} <span className="text-[10px] text-slate-500 font-normal">flights</span>
                  </span>
                </div>
              </div>

              {/* Stochastic Forecast */}
              <div className="bg-[#05070e] p-3.5 rounded-xl border border-white/5 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-mono font-bold">NEXT HIT PROBABILITY</span>
                  <span className="text-xs font-mono font-black text-rose-400 flex items-center gap-0.5">
                    <Flame size={11} className="animate-pulse" />
                    {model1000x.prob}%
                  </span>
                </div>

                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-700"
                    style={{ width: `${model1000x.prob}%` }}
                  />
                  <div className="bg-[#0a0f1c] h-full" style={{ width: `${100 - model1000x.prob}%` }} />
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                  <span>Confidence: {model1000x.confidence}%</span>
                  <span>Est: {model1000x.roundsLeft} rounds left</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 text-[10px] leading-relaxed text-slate-400">
              <span className="text-slate-300 font-semibold text-[9px] block uppercase text-rose-400 mb-0.5">Model Recommendation:</span>
              {model1000x.prob > 50 
                ? "Drought length suggests extreme pressure building. High convergence window for legendary sky crashes."
                : "Legendary sky targets are sparse. Continue observing other predictive models for standard operational cycles."}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
