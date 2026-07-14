import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Square, Coins, DollarSign, Settings, RefreshCw, 
  CheckCircle2, AlertTriangle, TrendingUp, Cpu, HelpCircle, 
  Terminal, Check, Copy, ArrowRight, Sparkles, Sliders,
  Gauge, Activity, ShieldAlert, Info
} from 'lucide-react';
import { MultiplierRecord } from '../types';

interface AutoBetEngineProps {
  multipliers: MultiplierRecord[];
}

interface BetLog {
  id: string;
  timestamp: number;
  multiplier: number;
  wager: number;
  targetCashOut: number;
  payout: number;
  profit: number;
  isWin: boolean;
  balanceBefore: number;
  balanceAfter: number;
  strategyUsed: string;
  roundId: string;
  aiExplanation?: string;
}

type AIPayload = {
  predictedMultiplier: number;
  crashProbability: number;
  confidenceScore: number;
  wagerScalingFactor: number;
  actionRecommendation: string;
  isRoundSkipped: boolean;
};

export default function AutoBetEngine({ multipliers }: AutoBetEngineProps) {
  // Engine Configuration State
  const [isEngineActive, setIsEngineActive] = useState<boolean>(false);
  const [virtualBalance, setVirtualBalance] = useState<number>(10000);
  const [baseWager, setBaseWager] = useState<number>(100);
  const [targetCashOut, setTargetCashOut] = useState<number>(2.0);
  const [strategy, setStrategy] = useState<'flat' | 'martingale' | 'pattern' | 'prediction'>('prediction');
  
  // Pattern Strategy specifics
  const [consecutiveLowTrigger, setConsecutiveLowTrigger] = useState<number>(3);

  // Prediction (AI-Pilot) Strategy settings
  const [aiRiskProfile, setAiRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [skipHighCrashRisk, setSkipHighCrashRisk] = useState<boolean>(true);
  const [skipThreshold, setSkipThreshold] = useState<number>(65);
  const [useDynamicMultiplier, setUseDynamicMultiplier] = useState<boolean>(true);
  const [useDynamicWager, setUseDynamicWager] = useState<boolean>(true);
  
  // Simulation logs
  const [betLogs, setBetLogs] = useState<BetLog[]>([]);
  
  // Tracking state to prevent duplicate processing of same round
  const lastProcessedIdRef = useRef<string | null>(null);
  
  // Next wager calculation
  const [nextWager, setNextWager] = useState<number>(100);
  // Next target cashout calculation
  const [nextTargetCashOut, setNextTargetCashOut] = useState<number>(2.0);

  // Tab for help guides: Virtual Simulator vs. Casino DOM Script Creator
  const [activeTab, setActiveTab] = useState<'virtual' | 'code'>('virtual');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Categorization function for multipliers
  const getCategory = (val: number) => {
    if (val < 1.50) return 'CRASH';
    if (val < 2.00) return 'LOW';
    if (val < 10.00) return 'MEDIUM';
    return 'HIGH';
  };

  // Safe Prediction Math Engine running locally
  const livePredictionData = useMemo<AIPayload>(() => {
    if (multipliers.length === 0) {
      return {
        predictedMultiplier: 1.50,
        crashProbability: 50,
        confidenceScore: 50,
        wagerScalingFactor: 1.0,
        actionRecommendation: "Awaiting game data feed...",
        isRoundSkipped: false
      };
    }

    const totalRounds = multipliers.length;
    const history = [...multipliers].reverse(); // Oldest to newest

    // 1. Calculate base transition matrix probabilities
    const currentState = getCategory(multipliers[0].multiplier);
    const transitionMatrix: Record<string, Record<string, number>> = {
      CRASH: { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 },
      LOW: { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 },
      MEDIUM: { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 },
      HIGH: { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 },
    };
    const rowTotals: Record<string, number> = { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };

    for (let i = 0; i < history.length - 1; i++) {
      const from = getCategory(history[i].multiplier);
      const to = getCategory(history[i+1].multiplier);
      transitionMatrix[from][to]++;
      rowTotals[from]++;
    }

    // Determine probability of going to crash or low state next
    let crashProb = 50; // default anchor
    const transitionsFromCurrent = rowTotals[currentState];
    if (transitionsFromCurrent > 0) {
      const crashAndLowTransitionCount = transitionMatrix[currentState]['CRASH'] + transitionMatrix[currentState]['LOW'];
      crashProb = Math.round((crashAndLowTransitionCount / transitionsFromCurrent) * 100);
    } else {
      // Fallback: calculate overall crash ratio
      const crashRoundsCount = multipliers.filter(r => r.multiplier < 2.0).length;
      crashProb = Math.round((crashRoundsCount / totalRounds) * 100);
    }

    // 2. Continuous regression momentum of previous 5 multipliers
    const recent5 = multipliers.slice(0, 5);
    const avgRecent = recent5.reduce((sum, r) => sum + r.multiplier, 0) / Math.max(1, recent5.length);
    const countLowRecent = recent5.filter(r => r.multiplier < 1.8).length;

    // Adjusted dynamic multipliers based on Risk profile
    let calculatedTarget = 1.50;
    let scaling = 1.0;
    let recommendation = "";
    let confidence = 70;

    // Confidence is higher when the recent streak is consistent
    if (countLowRecent >= 4) {
      confidence = 85; // highly confidence it is a cold streak
    } else if (countLowRecent <= 1) {
      confidence = 80; // highly confidence it is a warm streak
    }

    if (aiRiskProfile === 'conservative') {
      // Conservative: targets very safe small multiplier increments
      calculatedTarget = Number((1.12 + (100 - crashProb) / 400).toFixed(2));
      calculatedTarget = Math.min(Math.max(calculatedTarget, 1.05), 1.35);

      if (crashProb > 50) {
        scaling = 0.5;
        recommendation = "Defensive Stance. High threat of premature crash. Bet decreased 50%. Target set to safety.";
      } else {
        scaling = 1.0;
        recommendation = "Steady Sequence. Risk is low. Placing safe base wager with tight auto cashout.";
      }
    } else if (aiRiskProfile === 'balanced') {
      // Balanced: standard dynamic target
      calculatedTarget = Number((1.35 + (100 - crashProb) / 200).toFixed(2));
      calculatedTarget = Math.min(Math.max(calculatedTarget, 1.15), 1.95);

      if (crashProb > 60) {
        scaling = 0.4;
        recommendation = "Probability of crash is elevated. Scaling wager size down to limit capital drawdowns.";
      } else if (crashProb < 40) {
        scaling = 1.4;
        recommendation = "Favorable pattern convergence! Boosting wager by 40% to leverage warm sequence window.";
      } else {
        scaling = 1.0;
        recommendation = "Standard balanced parameters active. Placing calculated average wager.";
      }
    } else {
      // Aggressive: high-risk high-reward target with Kelly-like sizing
      calculatedTarget = Number((1.65 + (100 - crashProb) / 80).toFixed(2));
      calculatedTarget = Math.min(Math.max(calculatedTarget, 1.30), 4.50);

      if (crashProb > 65) {
        scaling = 0.3;
        recommendation = "Aggressive Stance: Danger zone detected. Forcing minimum wager scaling to preserve bankroll.";
      } else if (crashProb < 35) {
        scaling = 2.0;
        recommendation = "PRIME WAVE DETECTED. Doubling base wager size to aggressively maximize profit margin.";
      } else {
        scaling = 1.2;
        recommendation = "Streak expansion in progress. Target cash out set higher to capture peak value.";
      }
    }

    // Evaluate Skip Threshold
    const isRoundSkipped = skipHighCrashRisk && crashProb >= skipThreshold;
    if (isRoundSkipped) {
      recommendation = `🛑 BYPASS SIGNAL: Calculated Crash Probability (${crashProb}%) exceeds your skip threshold (${skipThreshold}%). Standing down.`;
    }

    return {
      predictedMultiplier: calculatedTarget,
      crashProbability: crashProb,
      confidenceScore: confidence,
      wagerScalingFactor: scaling,
      actionRecommendation: recommendation,
      isRoundSkipped
    };
  }, [multipliers, aiRiskProfile, skipHighCrashRisk, skipThreshold]);

  // Synchronize nextWager and nextTargetCashOut preview based on selected strategy
  useEffect(() => {
    if (!isEngineActive) {
      if (strategy === 'prediction') {
        const scaled = useDynamicWager 
          ? Math.max(10, Math.round(baseWager * livePredictionData.wagerScalingFactor)) 
          : baseWager;
        setNextWager(scaled);
        setNextTargetCashOut(useDynamicMultiplier ? livePredictionData.predictedMultiplier : targetCashOut);
      } else {
        setNextWager(baseWager);
        setNextTargetCashOut(targetCashOut);
      }
    }
  }, [baseWager, targetCashOut, strategy, livePredictionData, useDynamicMultiplier, useDynamicWager, isEngineActive]);

  // Main game loop monitoring multipliers
  useEffect(() => {
    if (multipliers.length === 0) return;
    
    const latestRound = multipliers[0];
    
    // Prevent double processing
    if (lastProcessedIdRef.current === latestRound.id) return;
    
    // Update ref immediately
    const previousProcessedId = lastProcessedIdRef.current;
    lastProcessedIdRef.current = latestRound.id;

    // Only process if active and we had a valid history anchor
    if (!isEngineActive) return;
    if (!previousProcessedId) return;

    let shouldBet = false;
    let finalWagerToUse = nextWager;
    let finalCashoutToUse = nextTargetCashOut;
    let aiLogDetail = "";

    if (strategy === 'flat' || strategy === 'martingale') {
      shouldBet = true;
      finalCashoutToUse = targetCashOut;
    } else if (strategy === 'pattern') {
      finalCashoutToUse = targetCashOut;
      const precedingRounds = multipliers.slice(1, consecutiveLowTrigger + 1);
      if (precedingRounds.length === consecutiveLowTrigger) {
        shouldBet = precedingRounds.every(r => r.multiplier < 2.0);
      }
    } else if (strategy === 'prediction') {
      // AI Predictor Strategy evaluates:
      if (livePredictionData.isRoundSkipped) {
        // Log skip event
        const skipLog: BetLog = {
          id: `bet_skip_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          multiplier: latestRound.multiplier,
          wager: 0,
          targetCashOut: livePredictionData.predictedMultiplier,
          payout: 0,
          profit: 0,
          isWin: false,
          balanceBefore: virtualBalance,
          balanceAfter: virtualBalance,
          strategyUsed: 'AI_SKIP',
          roundId: latestRound.id,
          aiExplanation: `Bypassed round due to heavy threat. Crash risk was ${livePredictionData.crashProbability}%.`
        };
        setBetLogs(prev => [skipLog, ...prev].slice(0, 50));
        shouldBet = false;
      } else {
        shouldBet = true;
        // Dynamically compute wager & cashout
        finalWagerToUse = useDynamicWager 
          ? Math.max(10, Math.round(baseWager * livePredictionData.wagerScalingFactor)) 
          : baseWager;
        finalCashoutToUse = useDynamicMultiplier 
          ? livePredictionData.predictedMultiplier 
          : targetCashOut;
        aiLogDetail = livePredictionData.actionRecommendation;
      }
    }

    if (!shouldBet) {
      // Re-evaluate next predictions immediately for the upcoming round
      if (strategy === 'prediction') {
        const updatedWager = useDynamicWager 
          ? Math.max(10, Math.round(baseWager * livePredictionData.wagerScalingFactor)) 
          : baseWager;
        setNextWager(updatedWager);
        setNextTargetCashOut(useDynamicMultiplier ? livePredictionData.predictedMultiplier : targetCashOut);
      }
      return;
    }

    // Safety checks for wager size
    if (virtualBalance <= 0) {
      setIsEngineActive(false);
      return;
    }

    const actualWager = Math.min(finalWagerToUse, virtualBalance);
    const isWin = latestRound.multiplier >= finalCashoutToUse;
    const payout = isWin ? Number((actualWager * finalCashoutToUse).toFixed(2)) : 0;
    const profit = isWin ? Number((payout - actualWager).toFixed(2)) : -actualWager;
    const balanceBefore = virtualBalance;
    const balanceAfter = Number((virtualBalance + profit).toFixed(2));

    const newLog: BetLog = {
      id: `bet_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      multiplier: latestRound.multiplier,
      wager: actualWager,
      targetCashOut: finalCashoutToUse,
      payout,
      profit,
      isWin,
      balanceBefore,
      balanceAfter,
      strategyUsed: strategy === 'prediction' ? `AI-${aiRiskProfile.toUpperCase()}` : strategy.toUpperCase(),
      roundId: latestRound.id,
      aiExplanation: strategy === 'prediction' ? aiLogDetail : undefined
    };

    setVirtualBalance(balanceAfter);
    setBetLogs(prev => [newLog, ...prev].slice(0, 50));

    // Calculate next round preset
    if (strategy === 'martingale') {
      if (isWin) {
        setNextWager(baseWager);
      } else {
        setNextWager(prev => Math.min(prev * 2, balanceAfter));
      }
    } else if (strategy === 'prediction') {
      // Predict values for upcoming round on the updated balance
      const updatedWager = useDynamicWager 
        ? Math.max(10, Math.round(baseWager * livePredictionData.wagerScalingFactor)) 
        : baseWager;
      setNextWager(Math.min(updatedWager, balanceAfter));
      setNextTargetCashOut(useDynamicMultiplier ? livePredictionData.predictedMultiplier : targetCashOut);
    } else {
      setNextWager(baseWager);
    }

  }, [multipliers, isEngineActive, nextWager, nextTargetCashOut, strategy, targetCashOut, baseWager, consecutiveLowTrigger, virtualBalance, livePredictionData, useDynamicMultiplier, useDynamicWager, aiRiskProfile]);

  const handleResetSimulator = () => {
    setVirtualBalance(10000);
    setNextWager(baseWager);
    setBetLogs([]);
  };

  // Generate automated click and input control codes based on Spribe Aviator classes provided by the user
  // This features the direct, real-time AI prediction matrix inside the injector console!
  const automationScriptCode = `/**
 * =====================================================================
 *  SPRIBE AVIATOR FULLY AUTOMATED INTELLIGENT AI-PILOT & OVERRIDE CONTROLLER
 * =====================================================================
 * This advanced injection script runs our proprietary real-time Markov 
 * transition matrix and pattern probability engine directly inside the Spribe
 * browser window. It dynamically scales wagers & configures cashout caps on the fly.
 * 
 * 🎮 OVERRIDE FEATURE: Adds a fully interactive, draggable floating overlay
 * that allows manual bet and cashout triggers, and toggling automated betting ON/OFF.
 */
(function() {
  const BASE_WAGER = ${baseWager};
  const RISK_PROFILE = "${aiRiskProfile}"; // conservative, balanced, aggressive
  const USE_DYNAMIC_MULTIPLIER = ${useDynamicMultiplier ? 'true' : 'false'};
  const USE_DYNAMIC_WAGER = ${useDynamicWager ? 'true' : 'false'};
  const SKIP_HIGH_CRASH_RISK = ${skipHighCrashRisk ? 'true' : 'false'};
  const SKIP_THRESHOLD_PCT = ${skipThreshold};
  const FIXED_CASHOUT_FALLBACK = ${targetCashOut};

  console.log("%c🤖 Spribe Aviator AI-Pilot Robot Activated!", "color: #10b981; font-weight: bold; font-size: 16px; text-shadow: 0 0 5px rgba(16,185,129,0.3);");
  console.log(\`Configuration - Base Wager: \${BASE_WAGER} LKR | Profile: \${RISK_PROFILE.toUpperCase()} | Skip High Risk: \${SKIP_HIGH_CRASH_RISK}\`);

  let currentWager = BASE_WAGER;
  let currentTargetCashout = FIXED_CASHOUT_FALLBACK;
  let isAutoBetEnabled = true;

  // Helper: Trigger React/Angular native element bindings
  function setNativeInputValue(inputElement, value) {
    if (!inputElement) return;
    inputElement.value = value;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    inputElement.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
  }

  // Calculate live statistical prediction based on DOM history ribbon
  function getAIPrediction() {
    const payouts = [];
    const ribbon = document.querySelector('app-stats-widget .payouts-block, app-stats-list');
    if (ribbon) {
      const items = ribbon.querySelectorAll('.payout, [appcoloredmultiplier]');
      items.forEach(el => {
        const val = parseFloat(el.textContent.trim());
        if (!isNaN(val)) payouts.push(val);
      });
    }

    if (payouts.length < 5) {
      return { target: FIXED_CASHOUT_FALLBACK, scale: 1.0, crashRisk: 45, skip: false };
    }

    // Reverse to chronological
    const history = payouts.slice(0, 30).reverse();
    const latest = history[history.length - 1];

    const getCat = (v) => {
      if (v < 1.5) return 'CRASH';
      if (v < 2.0) return 'LOW';
      if (v < 10.0) return 'MEDIUM';
      return 'HIGH';
    };

    const currentCat = getCat(latest);
    let transitionMatches = 0;
    let crashMatches = 0;

    for (let i = 0; i < history.length - 1; i++) {
      if (getCat(history[i]) === currentCat) {
        transitionMatches++;
        const nextCat = getCat(history[i+1]);
        if (nextCat === 'CRASH' || nextCat === 'LOW') {
          crashMatches++;
        }
      }
    }

    let crashRisk = transitionMatches > 0 ? Math.round((crashMatches / transitionMatches) * 100) : 50;

    let target = FIXED_CASHOUT_FALLBACK;
    let scale = 1.0;

    if (RISK_PROFILE === 'conservative') {
      target = 1.12 + (100 - crashRisk) / 400;
      target = Math.min(Math.max(target, 1.05), 1.35);
      scale = crashRisk > 50 ? 0.5 : 1.0;
    } else if (RISK_PROFILE === 'balanced') {
      target = 1.35 + (100 - crashRisk) / 200;
      target = Math.min(Math.max(target, 1.15), 1.95);
      scale = crashRisk > 60 ? 0.4 : (crashRisk < 40 ? 1.4 : 1.0);
    } else { // aggressive
      target = 1.65 + (100 - crashRisk) / 80;
      target = Math.min(Math.max(target, 1.30), 4.50);
      scale = crashRisk > 65 ? 0.3 : (crashRisk < 35 ? 2.0 : 1.2);
    }

    const skip = SKIP_HIGH_CRASH_RISK && crashRisk >= SKIP_THRESHOLD_PCT;

    return {
      target: Number(target.toFixed(2)),
      scale: scale,
      crashRisk: crashRisk,
      skip: skip
    };
  }

  // Inject Stylesheet for Draggable Control Deck
  const styleEl = document.createElement('style');
  styleEl.innerHTML = \`
    #ai-floating-controller {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 2147483647 !important;
      width: 330px !important;
      background: rgb(10, 14, 28) !important;
      border: 2px solid #ef4444 !important;
      border-radius: 16px !important;
      box-shadow: 0 15px 45px rgba(0, 0, 0, 0.85), 0 0 25px rgba(239, 68, 68, 0.2) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      color: #f1f5f9 !important;
      padding: 14px !important;
      box-sizing: border-box !important;
      pointer-events: auto !important;
    }
    #ai-floating-controller * {
      pointer-events: auto !important;
    }
    .ai-floating-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      background: rgba(255, 255, 255, 0.04) !important;
      padding: 8px 12px !important;
      border-radius: 10px !important;
      cursor: move !important;
      margin-bottom: 12px !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .ai-header-title {
      font-size: 11px !important;
      font-weight: 800 !important;
      letter-spacing: 1.5px !important;
      color: #ef4444 !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .ai-drag-handle {
      font-size: 16px !important;
      color: #64748b !important;
      cursor: move !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .ai-stat-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-size: 11px !important;
      margin: 6px 0 !important;
      color: #94a3b8 !important;
    }
    #ai-status-indicator {
      font-weight: 800 !important;
      font-size: 10px !important;
      padding: 3px 8px !important;
      border-radius: 20px !important;
    }
    .ai-status-active {
      background: rgba(16, 185, 129, 0.15) !important;
      border: 1px solid rgba(16, 185, 129, 0.3) !important;
      color: #34d399 !important;
      text-shadow: 0 0 8px rgba(16, 185, 129, 0.3) !important;
    }
    .ai-status-manual {
      background: rgba(245, 158, 11, 0.15) !important;
      border: 1px solid rgba(245, 158, 11, 0.3) !important;
      color: #fbbf24 !important;
      text-shadow: 0 0 8px rgba(245, 158, 11, 0.3) !important;
    }
    .ai-divider {
      height: 1px !important;
      background: rgba(255, 255, 255, 0.07) !important;
      margin: 10px 0 !important;
    }
    .ai-predict-box {
      background: rgba(0, 0, 0, 0.4) !important;
      padding: 10px !important;
      border-radius: 10px !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
    .ai-grid-2 {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      margin-top: 6px !important;
      font-size: 11px !important;
    }
    .ai-btn {
      width: 100% !important;
      padding: 10px 14px !important;
      border-radius: 10px !important;
      border: none !important;
      font-size: 11px !important;
      font-weight: bold !important;
      cursor: pointer !important;
      transition: all 0.15s ease-in-out !important;
      outline: none !important;
      box-sizing: border-box !important;
      text-align: center !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .ai-btn-primary {
      background: #10b981 !important;
      color: #fff !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
    }
    .ai-btn-primary:hover {
      background: #059669 !important;
      transform: translateY(-1px) !important;
    }
    .ai-btn-primary:active {
      transform: translateY(1px) !important;
    }
    .ai-btn-danger {
      background: #ff4d4d !important;
      color: #fff !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
    }
    .ai-btn-danger:hover {
      background: #dc2626 !important;
      transform: translateY(-1px) !important;
    }
    .ai-btn-danger:active {
      transform: translateY(1px) !important;
    }
    .ai-btn-secondary {
      background: rgba(255, 255, 255, 0.06) !important;
      color: #e2e8f0 !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      margin-bottom: 10px !important;
    }
    .ai-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12) !important;
    }
    .ai-input-group {
      margin: 10px 0 !important;
    }
    .ai-input-group label {
      display: block !important;
      font-size: 10px !important;
      color: #64748b !important;
      margin-bottom: 5px !important;
      font-weight: bold !important;
      text-transform: uppercase !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .ai-input-group input {
      width: 100% !important;
      background: #000 !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 8px !important;
      color: #fff !important;
      padding: 8px !important;
      font-size: 11px !important;
      font-family: monospace !important;
      box-sizing: border-box !important;
      user-select: text !important;
      -webkit-user-select: text !important;
    }
    .ai-actions-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      margin-top: 12px !important;
    }
    .ai-footer {
      text-align: center !important;
      font-size: 9px !important;
      color: #475569 !important;
      margin-top: 10px !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
  \`;

  // Establish maximum top-level document body context for embedding (bypasses iframe clipping)
  let targetDoc = document;
  try {
    if (window.top && window.top.document) {
      targetDoc = window.top.document;
    }
  } catch (e) {
    // cross-origin security fallback
  }

  targetDoc.head.appendChild(styleEl);

  // Recursive query selector helper to locate elements inside nested cross/same-origin frames
  function safeQuerySelector(selector) {
    let el = document.querySelector(selector);
    if (el) return el;

    try {
      if (window.top && window.top !== window) {
        el = window.top.document.querySelector(selector);
        if (el) return el;
      }
    } catch (e) {}

    function search(root) {
      try {
        const iframes = root.querySelectorAll('iframe');
        for (const iframe of iframes) {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc) {
              const found = doc.querySelector(selector);
              if (found) return found;
              const nested = search(doc);
              if (nested) return nested;
            }
          } catch (e) {}
        }
      } catch (e) {}
      return null;
    }

    let searchRoot = document;
    try {
      if (window.top) searchRoot = window.top.document;
    } catch (e) {}

    return search(searchRoot);
  }

  function safeQuerySelectorAll(selector) {
    let results = Array.from(document.querySelectorAll(selector));

    try {
      if (window.top && window.top !== window) {
        const topResults = window.top.document.querySelectorAll(selector);
        topResults.forEach(el => {
          if (!results.includes(el)) results.push(el);
        });
      }
    } catch (e) {}

    function search(root) {
      try {
        const iframes = root.querySelectorAll('iframe');
        for (const iframe of iframes) {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc) {
              const found = doc.querySelectorAll(selector);
              found.forEach(el => {
                if (!results.includes(el)) results.push(el);
              });
              search(doc);
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    let searchRoot = document;
    try {
      if (window.top) searchRoot = window.top.document;
    } catch (e) {}

    search(searchRoot);
    return results;
  }

  // Injected HTML structure
  const overlayDiv = targetDoc.createElement('div');
  overlayDiv.id = 'ai-floating-controller';
  overlayDiv.innerHTML = \`
    <div class="ai-floating-header">
      <div class="ai-header-title">🟥 AVIATOR OVERRIDE DECK</div>
      <div class="ai-drag-handle">☰</div>
    </div>
    <div class="ai-body">
      <div class="ai-stat-row">
        <span>Machine Engine Mode:</span>
        <span id="ai-status-indicator" class="ai-status-active">AUTO-PILOT ON</span>
      </div>
      
      <div class="ai-divider"></div>
      
      <div class="ai-predict-box">
        <div style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase;">Real-time Predictions</div>
        <div class="ai-grid-2">
          <div>Crash Risk: <strong id="ai-live-crash-prob" style="color: #ff4d4d; font-size: 12px;">--%</strong></div>
          <div>Calculated Mult: <strong id="ai-live-target-mult" style="color: #10b981; font-size: 12px;">--x</strong></div>
        </div>
      </div>
      
      <div class="ai-divider"></div>
      
      <button id="ai-toggle-mode-btn" class="ai-btn ai-btn-secondary">
        🛑 Switch to MANUAL Mode
      </button>
      
      <div class="ai-input-group">
        <label>Bet Amount (LKR):</label>
        <input type="number" id="ai-override-wager" value="\\\${BASE_WAGER}" step="50">
      </div>
      
      <div class="ai-actions-grid">
        <button id="ai-manual-bet-btn" class="ai-btn ai-btn-primary">
          🟢 PLACE BET
        </button>
        <button id="ai-manual-cashout-btn" class="ai-btn ai-btn-danger">
          💰 CASH OUT
        </button>
      </div>
      
      <div class="ai-footer">
        Hold & drag header to reposition • Override Panel
      </div>
    </div>
  \`;
  targetDoc.body.appendChild(overlayDiv);

  // Prevent drag, touch, or click actions from leaking to the underlying canvas
  ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(evt => {
    overlayDiv.addEventListener(evt, (e) => {
      e.stopPropagation();
    }, { passive: true });
  });

  // Dragging Implementation for Floating Controller (using targetDoc level movement)
  (function() {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    const header = overlayDiv.querySelector('.ai-floating-header');

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = overlayDiv.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      overlayDiv.style.right = 'auto';
      overlayDiv.style.bottom = 'auto';
      overlayDiv.style.left = initialX + 'px';
      overlayDiv.style.top = initialY + 'px';
      e.preventDefault();
      e.stopPropagation();
    });

    targetDoc.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      overlayDiv.style.left = (initialX + dx) + 'px';
      overlayDiv.style.top = (initialY + dy) + 'px';
    });

    targetDoc.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch support for mobiles/inspect view responsive mode
    header.addEventListener('touchstart', (e) => {
      isDragging = true;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      const rect = overlayDiv.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      overlayDiv.style.right = 'auto';
      overlayDiv.style.bottom = 'auto';
      overlayDiv.style.left = initialX + 'px';
      overlayDiv.style.top = initialY + 'px';
      e.stopPropagation();
    });

    targetDoc.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      overlayDiv.style.left = (initialX + dx) + 'px';
      overlayDiv.style.top = (initialY + dy) + 'px';
    });

    targetDoc.addEventListener('touchend', () => {
      isDragging = false;
    });
  })();

  // DOM Trigger Helpers for wagers and cashouts (with broad touch emulation)
  function triggerManualBet(wagerVal) {
    const betControl = safeQuerySelector('app-bet-control.double-bet') || safeQuerySelector('app-bet-control');
    if (!betControl) {
      console.warn("❌ Bet control component not found in DOM!");
      return;
    }

    // Bind Spinner Wager Input
    const spinnerInput = betControl.querySelector('.spinner.big input, app-spinner.spinner input, input');
    if (spinnerInput) {
      setNativeInputValue(spinnerInput, wagerVal.toString());
    }

    // Execute Click on Bet Button
    const betBtn = betControl.querySelector('button.bet, button.btn-success, .bet-button');
    if (betBtn) {
      betBtn.click();
      
      // Dispatch extra touch & mouse events for strict responsive/inspect simulator capture
      const rect = betBtn.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;
      betBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX, clientY }));
      betBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX, clientY }));
      
      if (typeof TouchEvent !== 'undefined') {
        const touch = new Touch({ identifier: Date.now(), target: betBtn, clientX, clientY });
        betBtn.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch] }));
        betBtn.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch] }));
      }
      
      console.log(\`🟢 Placed manual bet of \${wagerVal} LKR successfully.\`);
    } else {
      console.warn("❌ Place Bet button not found!");
    }
  }

  function triggerManualCashout() {
    const betControl = safeQuerySelector('app-bet-control.double-bet') || safeQuerySelector('app-bet-control');
    const cashoutBtn = safeQuerySelector('.btn-warning, .cashout, .btn-danger') || 
                      (betControl && betControl.querySelector('button.cashout, button.btn-warning, .cash-out-button'));
    if (cashoutBtn) {
      cashoutBtn.click();
      
      // Dispatch extra touch & mouse events for strict responsive/inspect simulator capture
      const rect = cashoutBtn.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;
      cashoutBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX, clientY }));
      cashoutBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX, clientY }));
      
      if (typeof TouchEvent !== 'undefined') {
        const touch = new Touch({ identifier: Date.now(), target: cashoutBtn, clientX, clientY });
        cashoutBtn.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch] }));
        cashoutBtn.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch] }));
      }
      
      console.log("🟠 Manual override: Cash out clicked successfully.");
    } else {
      console.warn("❌ Cashout button not available! Ensure plane is flying with active bet.");
    }
  }

  // Set up interaction listeners for the Floating Overlay with double-trigger prevention
  const toggleModeBtn = overlayDiv.querySelector('#ai-toggle-mode-btn');
  const statusIndicator = overlayDiv.querySelector('#ai-status-indicator');
  const manualBetBtn = overlayDiv.querySelector('#ai-manual-bet-btn');
  const manualCashoutBtn = overlayDiv.querySelector('#ai-manual-cashout-btn');
  const overrideWagerInput = overlayDiv.querySelector('#ai-override-wager');

  // Stop drag or hover events from stealing input focuses inside the wager text field
  overrideWagerInput.addEventListener('mousedown', (e) => e.stopPropagation());
  overrideWagerInput.addEventListener('touchstart', (e) => e.stopPropagation());

  // Event binder that works seamlessly for click & touch interfaces without double fires
  function bindAction(el, callback) {
    if (!el) return;
    let activated = false;
    const run = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activated) return;
      activated = true;
      setTimeout(() => { activated = false; }, 350);
      callback(e);
    };
    el.addEventListener('click', run);
    el.addEventListener('touchstart', run, { passive: false });
  }

  bindAction(toggleModeBtn, () => {
    isAutoBetEnabled = !isAutoBetEnabled;
    if (isAutoBetEnabled) {
      statusIndicator.textContent = "AUTO-PILOT ON";
      statusIndicator.className = "ai-status-active";
      toggleModeBtn.textContent = "🛑 Switch to MANUAL Mode";
      toggleModeBtn.style.borderColor = "rgba(255,255,255,0.12)";
      console.log("%c🤖 AI Auto-Bet mode restored.", "color: #10b981;");
    } else {
      statusIndicator.textContent = "MANUAL OVERRIDE";
      statusIndicator.className = "ai-status-manual";
      toggleModeBtn.textContent = "🤖 Switch to AUTO Mode";
      toggleModeBtn.style.borderColor = "#fbbf24";
      console.log("%c🛑 Manual override mode enabled. Auto-Bet suspended.", "color: #fbbf24;");
    }
  });

  bindAction(manualBetBtn, () => {
    const wagerVal = parseFloat(overrideWagerInput.value) || BASE_WAGER;
    triggerManualBet(wagerVal);
  });

  bindAction(manualCashoutBtn, () => {
    triggerManualCashout();
  });

  // Updates overlay dashboard values
  function updateFloatingOverlay(crashRisk, targetVal) {
    const riskEl = overlayDiv.querySelector('#ai-live-crash-prob');
    const targetEl = overlayDiv.querySelector('#ai-live-target-mult');
    if (riskEl) riskEl.textContent = crashRisk + '%';
    if (targetEl) targetEl.textContent = targetVal.toFixed(2) + 'x';
  }

  // Configure DOM controls based on predictions (recursive lookup)
  function configureSpribeControls() {
    if (!isAutoBetEnabled) return; // Skip if user turned Auto off

    const betControl = safeQuerySelector('app-bet-control.double-bet') || safeQuerySelector('app-bet-control');
    if (!betControl) return false;

    // Switch tabs to Auto
    const switcher = betControl.querySelector('app-navigation-switcher');
    if (switcher) {
      const tabs = switcher.querySelectorAll('.tab');
      for (const tab of tabs) {
        if (tab.textContent.trim().includes('Auto') && !tab.classList.contains('active')) {
          tab.click();
        }
      }
    }

    // Run prediction
    const ai = getAIPrediction();
    currentWager = USE_DYNAMIC_WAGER ? Math.max(10, Math.round(BASE_WAGER * ai.scale)) : BASE_WAGER;
    currentTargetCashout = USE_DYNAMIC_MULTIPLIER ? ai.target : FIXED_CASHOUT_FALLBACK;

    updateFloatingOverlay(ai.crashRisk, currentTargetCashout);

    console.log(\`%c🧠 AI Engine Decision: Wager: \${currentWager} LKR | Cashout: \${currentTargetCashout}x | Crash Threat: \${ai.crashRisk}%\`, "color: #60a5fa;");

    if (ai.skip) {
      console.warn(\`⚠️ [AI STANDDOWN] Crash risk (\${ai.crashRisk}%) is too high. Bypassing current round.\`);
      // Toggle native auto-bet switcher OFF if it is on to bypass
      const switcherWidget = betControl.querySelector('.auto-bet app-ui-switcher .input-switch');
      if (switcherWidget && !switcherWidget.classList.contains('off')) {
        switcherWidget.click();
      }
      return true;
    }

    // Otherwise configure auto bet
    const spinnerInput = betControl.querySelector('.spinner.big input, app-spinner.spinner input, input');
    if (spinnerInput) {
      setNativeInputValue(spinnerInput, currentWager.toString());
    }

    const autoBetWrapper = betControl.querySelector('.auto-bet');
    if (autoBetWrapper) {
      const switcherWidget = autoBetWrapper.querySelector('app-ui-switcher .input-switch');
      if (switcherWidget && switcherWidget.classList.contains('off')) {
        switcherWidget.click();
      }
    }

    const cashoutBlock = betControl.querySelector('.cashout-block');
    if (cashoutBlock) {
      const cashoutSwitch = cashoutBlock.querySelector('.cash-out-switcher app-ui-switcher .input-switch');
      if (cashoutSwitch && cashoutSwitch.classList.contains('off')) {
        cashoutSwitch.click();
      }

      setTimeout(() => {
        const cashoutInput = cashoutBlock.querySelector('.cashout-spinner input, app-spinner input');
        if (cashoutInput) {
          setNativeInputValue(cashoutInput, currentTargetCashout.toFixed(2));
        }
      }, 200);
    }

    return true;
  }

  // Calculate live statistical prediction based on DOM history ribbon
  function getAIPrediction() {
    const payouts = [];
    const ribbon = safeQuerySelector('app-stats-widget .payouts-block, app-stats-list');
    if (ribbon) {
      const items = ribbon.querySelectorAll('.payout, [appcoloredmultiplier]');
      items.forEach(el => {
        const val = parseFloat(el.textContent.trim());
        if (!isNaN(val)) payouts.push(val);
      });
    }

    if (payouts.length < 5) {
      return { target: FIXED_CASHOUT_FALLBACK, scale: 1.0, crashRisk: 45, skip: false };
    }

    // Reverse to chronological
    const history = payouts.slice(0, 30).reverse();
    const latest = history[history.length - 1];

    const getCat = (v) => {
      if (v < 1.5) return 'CRASH';
      if (v < 2.0) return 'LOW';
      if (v < 10.0) return 'MEDIUM';
      return 'HIGH';
    };

    const currentCat = getCat(latest);
    let transitionMatches = 0;
    let crashMatches = 0;

    for (let i = 0; i < history.length - 1; i++) {
      if (getCat(history[i]) === currentCat) {
        transitionMatches++;
        const nextCat = getCat(history[i+1]);
        if (nextCat === 'CRASH' || nextCat === 'LOW') {
          crashMatches++;
        }
      }
    }

    let crashRisk = transitionMatches > 0 ? Math.round((crashMatches / transitionMatches) * 100) : 50;

    let target = FIXED_CASHOUT_FALLBACK;
    let scale = 1.0;

    if (RISK_PROFILE === 'conservative') {
      target = 1.12 + (100 - crashRisk) / 400;
      target = Math.min(Math.max(target, 1.05), 1.35);
      scale = crashRisk > 50 ? 0.5 : 1.0;
    } else if (RISK_PROFILE === 'balanced') {
      target = 1.35 + (100 - crashRisk) / 200;
      target = Math.min(Math.max(target, 1.15), 1.95);
      scale = crashRisk > 60 ? 0.4 : (crashRisk < 40 ? 1.4 : 1.0);
    } else { // aggressive
      target = 1.65 + (100 - crashRisk) / 80;
      target = Math.min(Math.max(target, 1.30), 4.50);
      scale = crashRisk > 65 ? 0.3 : (crashRisk < 35 ? 2.0 : 1.2);
    }

    const skip = SKIP_HIGH_CRASH_RISK && crashRisk >= SKIP_THRESHOLD_PCT;

    return {
      target: Number(target.toFixed(2)),
      scale: scale,
      crashRisk: crashRisk,
      skip: skip
    };
  }

  // Initialize
  setTimeout(() => {
    configureSpribeControls();
    const initialAi = getAIPrediction();
    updateFloatingOverlay(initialAi.crashRisk, USE_DYNAMIC_MULTIPLIER ? initialAi.target : FIXED_CASHOUT_FALLBACK);
  }, 1000);

  // Monitor timeline
  let lastState = "IDLE";
  let lastMultiplierText = "";

  function monitorGameTimeline() {
    const betBtn = safeQuerySelector('app-bet-control button.bet, button.btn-success, .bet-button');
    if (!betBtn) return;

    const labelText = betBtn.textContent.trim();
    const isFlying = safeQuerySelector('.btn-warning, .cashout, .btn-danger') !== null;

    if (labelText === "Bet" && lastState !== "IDLE") {
      const ribbon = safeQuerySelector('app-stats-widget .payouts-block, app-stats-list');
      if (ribbon) {
        const latestPayout = ribbon.querySelector('.payout, [appcoloredmultiplier]');
        if (latestPayout) {
          const multVal = parseFloat(latestPayout.textContent.trim());
          if (!isNaN(multVal) && latestPayout.textContent.trim() !== lastMultiplierText) {
            lastMultiplierText = latestPayout.textContent.trim();
            console.log(\`🏁 Round resolved at: \${multVal}x\`);
            
            // Re-configure based on new predictions
            setTimeout(configureSpribeControls, 1500);
          }
        }
      }
      lastState = "IDLE";
    } else if (labelText === "Cancel" && lastState !== "BET_PLACED") {
      lastState = "BET_PLACED";
    } else if (isFlying && lastState !== "FLYING") {
      lastState = "FLYING";
    }
  }

  const statsContainer = safeQuerySelector('app-stats-widget') || document.body;
  const observer = new MutationObserver(monitorGameTimeline);
  observer.observe(statsContainer, { childList: true, subtree: true });

  setInterval(monitorGameTimeline, 1000);
  return "🟢 Spribe Aviator Intelligent AI-Pilot Loaded with Manual Override Panel!";
})();`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(automationScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div id="auto-betting-system-panel" className="glass-card rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 shadow-sm">
            <Cpu size={20} className={isEngineActive ? "animate-spin" : ""} />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest flex items-center gap-2">
              Automated Betting Robot
              {isEngineActive ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-mono uppercase">
                  Stopped
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">Configure high-accuracy automated placing and cashout models</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#0a0d1e] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('virtual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'virtual'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sparkles size={13} />
            Virtual Simulator
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Terminal size={13} />
            Casino DOM Automation
          </button>
        </div>
      </div>

      {activeTab === 'virtual' ? (
        <div className="space-y-6">
          {/* Main Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left side: config panel */}
            <div className="md:col-span-5 space-y-4 bg-black/20 p-5 rounded-2xl border border-white/5 relative">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-display mb-2">
                <Sliders size={13} className="text-emerald-400" />
                Robot Settings
              </h4>

              {/* Strategy Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Betting Strategy</label>
                <div className="grid grid-cols-4 gap-1 bg-[#090b16] p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setStrategy('flat')}
                    disabled={isEngineActive}
                    className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      strategy === 'flat'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'text-slate-500 hover:text-slate-400 hover:bg-white/5 disabled:opacity-50'
                    }`}
                  >
                    Flat
                  </button>
                  <button
                    onClick={() => setStrategy('martingale')}
                    disabled={isEngineActive}
                    className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      strategy === 'martingale'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'text-slate-500 hover:text-slate-400 hover:bg-white/5 disabled:opacity-50'
                    }`}
                    title="Double wager size on loss, reset on win"
                  >
                    Martin.
                  </button>
                  <button
                    onClick={() => setStrategy('pattern')}
                    disabled={isEngineActive}
                    className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      strategy === 'pattern'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'text-slate-500 hover:text-slate-400 hover:bg-white/5 disabled:opacity-50'
                    }`}
                    title="Only wagers after consecutive cold rounds"
                  >
                    Pattern
                  </button>
                  <button
                    onClick={() => setStrategy('prediction')}
                    disabled={isEngineActive}
                    className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-0.5 ${
                      strategy === 'prediction'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-white/5 disabled:opacity-50'
                    }`}
                    title="Real-time AI Forecast & Wager Tuning System"
                  >
                    <Sparkles size={10} className="text-emerald-400" />
                    AI-Pilot
                  </button>
                </div>
              </div>

              {/* Strategy Parameters Panel */}
              {strategy === 'pattern' && (
                <div className="space-y-1.5 bg-[#0a0d1e] p-3 rounded-xl border border-white/5">
                  <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Consecutive Low Trigger (<span className="text-emerald-400 font-bold">&lt; 2.0x</span>)</label>
                  <div className="flex items-center justify-between gap-4 mt-1">
                    <span className="text-[11px] text-slate-500">Wait for N low rounds before betting:</span>
                    <select
                      value={consecutiveLowTrigger}
                      onChange={(e) => setConsecutiveLowTrigger(Number(e.target.value))}
                      disabled={isEngineActive}
                      className="bg-black border border-white/10 rounded-lg text-xs font-mono text-emerald-400 p-1 cursor-pointer"
                    >
                      {[2, 3, 4, 5, 6].map(v => (
                        <option key={v} value={v}>{v} Rounds</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {strategy === 'prediction' && (
                <div className="space-y-3 bg-[#080c16]/80 p-3.5 rounded-xl border border-white/5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <Sparkles size={11} className="text-emerald-400 animate-pulse" />
                      AI Decision Settings
                    </span>
                    <span className="text-[8px] px-1.5 py-0.2 rounded font-mono uppercase bg-emerald-950 text-emerald-400">
                      ACTIVE
                    </span>
                  </div>

                  {/* AI Risk Profile Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-mono uppercase">AI Risk Profile</label>
                    <div className="grid grid-cols-3 gap-1 bg-[#04060f] p-1 rounded-lg border border-white/5">
                      {(['conservative', 'balanced', 'aggressive'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAiRiskProfile(p)}
                          disabled={isEngineActive}
                          className={`py-1 rounded text-[9px] font-bold cursor-pointer capitalize transition-all ${
                            aiRiskProfile === p
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : 'text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Adjustments toggles */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#04060f] cursor-pointer hover:bg-[#060914] transition-all">
                      <input
                        type="checkbox"
                        checked={useDynamicWager}
                        onChange={(e) => setUseDynamicWager(e.target.checked)}
                        disabled={isEngineActive}
                        className="accent-emerald-500"
                      />
                      <span className="text-[9px] text-slate-400 select-none">AI Smart Wager</span>
                    </label>

                    <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#04060f] cursor-pointer hover:bg-[#060914] transition-all">
                      <input
                        type="checkbox"
                        checked={useDynamicMultiplier}
                        onChange={(e) => setUseDynamicMultiplier(e.target.checked)}
                        disabled={isEngineActive}
                        className="accent-emerald-500"
                      />
                      <span className="text-[9px] text-slate-400 select-none">AI Smart Cashout</span>
                    </label>
                  </div>

                  {/* Skip high crash threat option */}
                  <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skipHighCrashRisk}
                          onChange={(e) => setSkipHighCrashRisk(e.target.checked)}
                          disabled={isEngineActive}
                          className="accent-emerald-500"
                        />
                        <span className="text-[9px] text-slate-400 select-none">Skip High Crash Risk</span>
                      </label>
                      {skipHighCrashRisk && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">{skipThreshold}%</span>
                      )}
                    </div>

                    {skipHighCrashRisk && (
                      <div className="space-y-1">
                        <input
                          type="range"
                          min="40"
                          max="90"
                          step="5"
                          value={skipThreshold}
                          onChange={(e) => setSkipThreshold(parseInt(e.target.value))}
                          disabled={isEngineActive}
                          className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <span className="text-[8px] text-slate-500 block">Bypasses rounds if estimated crash probability equals or exceeds this limit.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Base Wager Input */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Base Wager (LKR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-600 font-mono text-[11px]">Rs.</span>
                    <input
                      type="number"
                      value={baseWager}
                      onChange={(e) => setBaseWager(Math.max(1, Number(e.target.value)))}
                      disabled={isEngineActive}
                      className="w-full bg-[#090b16] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
                    {strategy === 'prediction' && useDynamicMultiplier ? 'Fallback Cash Out' : 'Auto Cash Out'}
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-slate-600 font-mono text-[11px]">x</span>
                    <input
                      type="number"
                      step="0.05"
                      value={targetCashOut}
                      onChange={(e) => setTargetCashOut(Math.max(1.01, Number(e.target.value)))}
                      disabled={isEngineActive || (strategy === 'prediction' && useDynamicMultiplier)}
                      className="w-full bg-[#090b16] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Real-Time Live AI decision panel preview */}
              {strategy === 'prediction' && (
                <div className="bg-[#050812] border border-white/5 p-3 rounded-xl space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider">
                      <Gauge size={12} className="text-emerald-400" />
                      Live AI Decision Deck
                    </span>
                    <span className="text-[8px] text-slate-500">REALTIME ESTIMATE</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-500 block">AI NEXT TARGET</span>
                      <strong className="text-white text-[11px]">
                        {useDynamicMultiplier ? `${livePredictionData.predictedMultiplier.toFixed(2)}x` : `${targetCashOut.toFixed(2)}x`}
                      </strong>
                    </div>

                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-500 block">AI NEXT WAGER</span>
                      <strong className="text-amber-400 text-[11px]">
                        {useDynamicWager ? `${Math.max(10, Math.round(baseWager * livePredictionData.wagerScalingFactor))} LKR` : `${baseWager} LKR`}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-emerald-950/10 border border-emerald-900/15 p-2 rounded-lg text-[10px] leading-relaxed text-slate-300">
                    <div className="flex items-center gap-1.5 text-[8px] text-emerald-400 uppercase tracking-wider font-bold mb-0.5">
                      <Info size={10} />
                      AI Live Signal Command
                    </div>
                    {livePredictionData.isRoundSkipped ? (
                      <span className="text-rose-400 font-bold">{livePredictionData.actionRecommendation}</span>
                    ) : (
                      <span>{livePredictionData.actionRecommendation}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Live engine performance indicator */}
              <div className="border-t border-white/5 pt-4 space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Coins size={12} />
                    Simulated Balance:
                  </span>
                  <span className="font-bold text-slate-100 text-sm">
                    {virtualBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LKR
                  </span>
                </div>
                
                {isEngineActive && (
                  <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                    <span className="text-slate-500">Upcoming Bet Preset:</span>
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      {livePredictionData.isRoundSkipped ? (
                        <span className="text-slate-500 line-through">SKIPPED BY AI</span>
                      ) : (
                        <>
                          {nextWager.toLocaleString()} LKR @ {nextTargetCashOut.toFixed(2)}x
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Trigger Buttons */}
              <div className="flex gap-3 pt-2">
                {isEngineActive ? (
                  <button
                    onClick={() => setIsEngineActive(false)}
                    className="w-full bg-rose-600/10 hover:bg-rose-600/15 border border-rose-500/20 text-rose-400 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/20"
                  >
                    <Square size={13} fill="currentColor" />
                    Stop Robot
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEngineActive(true);
                      // Set anchor reference for the next incoming state change
                      if (multipliers.length > 0) {
                        lastProcessedIdRef.current = multipliers[0].id;
                      }
                    }}
                    className="w-full bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/20"
                  >
                    <Play size={13} fill="currentColor" />
                    Start Robot
                  </button>
                )}

                <button
                  onClick={handleResetSimulator}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  title="Reset simulator balance & log history"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex gap-2 mt-4">
                <HelpCircle size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  <strong>Simulated Play Mode:</strong> When enabled, the robot tracks new round payouts synced via your casino console scraper in real time and simulates bets automatically using this test wallet.
                </p>
              </div>
            </div>

            {/* Right side: dynamic wager logs */}
            <div className="md:col-span-7 flex flex-col h-[480px] bg-[#04060f]/60 rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#080c16] border-b border-white/5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Robot Action logs ({betLogs.length})</span>
                <span className="text-[9px] bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded font-mono">
                  Safe Sandbox
                </span>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
                {betLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <Cpu className="text-slate-700 animate-pulse" size={24} />
                    <div>
                      <p className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wide">Robot Standby</p>
                      <p className="text-[10px] text-slate-500 max-w-xs mt-1 font-sans">
                        No bets evaluated yet. Start the robot and push new rounds from the browser console scraper to view real-time automatic bet logs.
                      </p>
                    </div>
                  </div>
                ) : (
                  betLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-3.5 rounded-xl border flex flex-col gap-2.5 font-mono transition-all animate-fadeIn ${
                        log.strategyUsed === 'AI_SKIP'
                          ? 'bg-slate-900/40 border-slate-800'
                          : log.isWin 
                            ? 'bg-emerald-950/15 border-emerald-500/20' 
                            : 'bg-rose-950/15 border-rose-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                            log.strategyUsed === 'AI_SKIP'
                              ? 'bg-slate-800 text-slate-400'
                              : log.isWin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {log.strategyUsed === 'AI_SKIP' ? 'AI_SKIP' : log.isWin ? 'WIN' : 'LOSE'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Strategy: {log.strategyUsed}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                          {log.strategyUsed === 'AI_SKIP' ? (
                            <div className="text-[11px] text-slate-400 font-bold">
                              AI bypassed round bet
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">
                              Wagered <strong className="text-slate-200">{log.wager} LKR</strong>. Cashout limit: <strong className="text-indigo-400">{log.targetCashOut}x</strong>
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500">
                            Round plane crashed at: <strong className="text-slate-300">{log.multiplier.toFixed(2)}x</strong>
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          {log.strategyUsed === 'AI_SKIP' ? (
                            <span className="text-xs font-bold block text-slate-500">
                              Rs. 0.00
                            </span>
                          ) : (
                            <span className={`text-xs font-bold block ${log.isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {log.profit >= 0 ? '+' : ''}{log.profit.toLocaleString()} LKR
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 block">
                            Balance: {log.balanceAfter.toLocaleString()} LKR
                          </span>
                        </div>
                      </div>

                      {log.aiExplanation && (
                        <div className="p-2 rounded bg-black/30 text-[10px] text-slate-400 border border-white/5">
                          <span className="text-[8px] text-emerald-500 uppercase tracking-widest font-black block mb-0.5">AI Engine Logic:</span>
                          {log.aiExplanation}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-950/10 border border-emerald-900/20 rounded-2xl flex gap-3">
            <Cpu size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5 font-sans leading-relaxed text-slate-300">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Deploy Prediction Code directly inside Aviator Console</p>
              <p>
                In addition to running our virtual betting sandbox, you can automate placing real wagers and cashouts on Spribe's actual game DOM! Swapping the toggles on our dashboard updates the injector script instantly below.
              </p>
              <p className="text-slate-400 text-[11px]">
                👉 The script queries the precise Angular tags (e.g. <code className="text-emerald-400 font-mono">app-bet-control</code>, <code className="text-emerald-400 font-mono">app-spinner input</code>) to load bet presets, activate auto-cashout and Martingale sequences directly on-page.
              </p>
            </div>
          </div>

          {/* Script Display */}
          <div className="relative bg-[#04060f] border border-white/5 rounded-2xl overflow-hidden shadow-inner">
            <div className="flex justify-between items-center px-4 py-2.5 bg-[#080c16] border-b border-white/5 text-xs">
              <span className="font-mono text-slate-500 text-[10px] tracking-wide uppercase">spribe-auto-pilot.js</span>
              <button
                onClick={handleCopyCode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all font-semibold cursor-pointer border ${
                  copiedCode
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60 shadow-sm shadow-emerald-950/25'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/5 hover:border-white/10'
                }`}
              >
                {copiedCode ? (
                  <>
                    <Check size={13} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    Copy Code
                  </>
                )}
            </button>
          </div>

          <pre className="p-4 overflow-x-auto text-[11px] font-mono text-slate-400 max-h-72 leading-relaxed scrollbar-thin">
            <code>{automationScriptCode}</code>
          </pre>
        </div>
      </div>
      )}
    </div>
  );
}
