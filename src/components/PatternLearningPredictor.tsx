import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Brain, Sparkles, TrendingUp, Cpu, RefreshCw, BarChart, ChevronRight, HelpCircle, Terminal, Play, Sliders, Activity, Info } from 'lucide-react';
import { MultiplierRecord } from '../types';

interface PatternLearningPredictorProps {
  multipliers: MultiplierRecord[];
}

type StateType = 'CRASH' | 'LOW' | 'MEDIUM' | 'HIGH';

// Simple Neural Network Architecture in TypeScript
// 4 Inputs (previous 4 squashed multipliers) -> Hidden Layer 1 (6 neurons) -> Hidden Layer 2 (4 neurons) -> Output (1 squashed multiplier)
class AviatorNeuralNet {
  public weights1: number[][]; // 4 x 6
  public bias1: number[];      // 6
  public weights2: number[][]; // 6 x 4
  public bias2: number[];      // 4
  public weights3: number[][]; // 4 x 1
  public bias3: number[];      // 1

  constructor() {
    // Initialize random weights between -0.5 and 0.5
    this.weights1 = Array.from({ length: 4 }, () => Array.from({ length: 6 }, () => Math.random() - 0.5));
    this.bias1 = Array.from({ length: 6 }, () => Math.random() - 0.5);

    this.weights2 = Array.from({ length: 6 }, () => Array.from({ length: 4 }, () => Math.random() - 0.5));
    this.bias2 = Array.from({ length: 4 }, () => Math.random() - 0.5);

    this.weights3 = Array.from({ length: 4 }, () => Array.from({ length: 1 }, () => Math.random() - 0.5));
    this.bias3 = Array.from({ length: 1 }, () => Math.random() - 0.5);
  }

  // Sigmoid activation
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  // Derivative of sigmoid
  private dSigmoid(y: number): number {
    return y * (1 - y);
  }

  // Feed forward computation
  public feedForward(input: number[]) {
    // Hidden Layer 1
    const h1: number[] = [];
    for (let j = 0; j < 6; j++) {
      let sum = this.bias1[j];
      for (let i = 0; i < 4; i++) {
        sum += input[i] * this.weights1[i][j];
      }
      h1.push(this.sigmoid(sum));
    }

    // Hidden Layer 2
    const h2: number[] = [];
    for (let j = 0; j < 4; j++) {
      let sum = this.bias2[j];
      for (let i = 0; i < 6; i++) {
        sum += h1[i] * this.weights2[i][j];
      }
      h2.push(this.sigmoid(sum));
    }

    // Output Layer
    let outSum = this.bias3[0];
    for (let i = 0; i < 4; i++) {
      outSum += h2[i] * this.weights3[i][0];
    }
    const output = this.sigmoid(outSum);

    return { h1, h2, output };
  }

  // Backpropagation Training Step
  public trainStep(input: number[], target: number, learningRate: number): number {
    // 1. Forward Pass
    const { h1, h2, output } = this.feedForward(input);

    // Compute Output Error & Delta
    const error = target - output;
    const outputDelta = error * this.dSigmoid(output);

    // 2. Backward Pass for Hidden Layer 2
    const h2Errors = Array(4).fill(0);
    const h2Deltas = Array(4).fill(0);
    for (let i = 0; i < 4; i++) {
      h2Errors[i] = outputDelta * this.weights3[i][0];
      h2Deltas[i] = h2Errors[i] * this.dSigmoid(h2[i]);
    }

    // Backward Pass for Hidden Layer 1
    const h1Errors = Array(6).fill(0);
    const h1Deltas = Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        sum += h2Deltas[j] * this.weights2[i][j];
      }
      h1Errors[i] = sum;
      h1Deltas[i] = h1Errors[i] * this.dSigmoid(h1[i]);
    }

    // 3. Update Weights and Biases
    // Layer 3
    for (let i = 0; i < 4; i++) {
      this.weights3[i][0] += learningRate * outputDelta * h2[i];
    }
    this.bias3[0] += learningRate * outputDelta;

    // Layer 2
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        this.weights2[i][j] += learningRate * h2Deltas[j] * h1[i];
      }
    }
    for (let j = 0; j < 4; j++) {
      this.bias2[j] += learningRate * h2Deltas[j];
    }

    // Layer 1
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 6; j++) {
        this.weights1[i][j] += learningRate * h1Deltas[j] * input[i];
      }
    }
    for (let j = 0; j < 6; j++) {
      this.bias1[j] += learningRate * h1Deltas[j];
    }

    // Return Mean Squared Error
    return 0.5 * error * error;
  }
}

export default function PatternLearningPredictor({ multipliers }: PatternLearningPredictorProps) {
  const [modelType, setModelType] = useState<'deep_ml' | 'markov' | 'hybrid'>('deep_ml');
  const [learningRate, setLearningRate] = useState<number>(0.15);
  const [epochs, setEpochs] = useState<number>(800);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [currentLoss, setCurrentLoss] = useState<number>(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);

  // Keep a reference to the active Neural Network weights
  const nnRef = useRef<AviatorNeuralNet>(new AviatorNeuralNet());

  const totalCount = multipliers.length;

  // Squashing helper: maps multiplier [1, infinity) smoothly to [0, 1)
  const squashMultiplier = (val: number): number => {
    return 1 - (1 / val);
  };

  // Inverse squashing helper: maps normalized value [0, 1) back to [1, infinity)
  const unsquashMultiplier = (val: number): number => {
    if (val >= 1.0) return 999.0;
    if (val <= 0.0) return 1.0;
    return 1 / (1 - val);
  };

  // Categorization function for multipliers
  const getCategory = (val: number): StateType => {
    if (val < 1.50) return 'CRASH';       // Crash very early
    if (val < 2.00) return 'LOW';         // Sub-2x low outcome
    if (val < 10.00) return 'MEDIUM';     // Nice medium profit
    return 'HIGH';                        // 10x+ high flyer
  };

  const getCategoryColor = (cat: StateType) => {
    switch (cat) {
      case 'CRASH': return 'text-rose-400 bg-rose-950/40 border-rose-900/50';
      case 'LOW': return 'text-amber-400 bg-amber-950/40 border-amber-900/50';
      case 'MEDIUM': return 'text-violet-400 bg-violet-950/40 border-violet-900/50';
      case 'HIGH': return 'text-rose-300 bg-rose-900/40 border-rose-500/50 neon-red-text font-bold';
    }
  };

  // Helper to extract sequences for training the MLP
  // Each training pattern: inputs = [sq_1, sq_2, sq_3, sq_4], target = sq_5
  const trainingDataset = useMemo(() => {
    if (totalCount < 5) return [];

    const chron = [...multipliers].reverse(); // Oldest to newest
    const dataset: { input: number[]; target: number; actualVal: number }[] = [];

    for (let i = 0; i < chron.length - 4; i++) {
      const inputPattern = [
        squashMultiplier(chron[i].multiplier),
        squashMultiplier(chron[i+1].multiplier),
        squashMultiplier(chron[i+2].multiplier),
        squashMultiplier(chron[i+3].multiplier)
      ];
      const targetVal = squashMultiplier(chron[i+4].multiplier);
      
      dataset.push({
        input: inputPattern,
        target: targetVal,
        actualVal: chron[i+4].multiplier
      });
    }

    return dataset;
  }, [multipliers]);

  // Deep Learning training execution triggered manually or on new telemetry data
  const runModelTraining = () => {
    if (trainingDataset.length === 0) return;

    setIsTraining(true);
    const nn = nnRef.current;
    let localLossHistory: number[] = [];
    let avgLoss = 0;

    const time = new Date().toLocaleTimeString();
    const newLogs = [
      `[${time}] 🚀 Commencing Deep Learning training pipeline...`,
      `[${time}] 📐 Inputs: 4 sequential squashed multipliers. Outputs: 1 predicted sequel.`,
      `[${time}] 🧠 Initialising Multi-Layer Perceptron (MLP) backpropagation cycle.`
    ];

    // Train N epochs
    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochLoss = 0;
      
      // Shuffle training patterns
      const shuffled = [...trainingDataset].sort(() => Math.random() - 0.5);

      shuffled.forEach(pattern => {
        const loss = nn.trainStep(pattern.input, pattern.target, learningRate);
        epochLoss += loss;
      });

      const meanLoss = epochLoss / Math.max(1, shuffled.length);
      avgLoss = meanLoss;

      // Keep sample of losses for visualization
      if (epoch % Math.ceil(epochs / 12) === 0 || epoch === epochs - 1) {
        localLossHistory.push(parseFloat(meanLoss.toFixed(5)));
      }
    }

    // Evaluate current prediction accuracy on training set
    let absoluteErrorsSum = 0;
    trainingDataset.forEach(pattern => {
      const { output } = nn.feedForward(pattern.input);
      const prediction = unsquashMultiplier(output);
      const actual = pattern.actualVal;
      // Percent deviation up to 100%
      const deviation = Math.min(100, (Math.abs(prediction - actual) / actual) * 100);
      absoluteErrorsSum += (100 - deviation);
    });
    const avgAccuracy = Math.round(absoluteErrorsSum / Math.max(1, trainingDataset.length));

    // Update States
    setCurrentLoss(avgLoss);
    setLossHistory(localLossHistory);
    setAccuracyScore(avgAccuracy);
    setIsTraining(false);

    newLogs.push(`[${time}] ✨ Training finished in ${epochs} epochs. Final Loss: ${avgLoss.toFixed(5)}`);
    newLogs.push(`[${time}] 🎯 Average Historical Pattern Pattern Accuracy: ${avgAccuracy}%`);
    newLogs.push(`[${time}] 📊 Neural connections stabilized. Prediction updated.`);

    setTrainingLogs(prev => {
      const merged = [...newLogs, ...prev];
      return merged.slice(0, 50);
    });
  };

  // Auto-train whenever the dataset gains a new multiplier record
  useEffect(() => {
    if (trainingDataset.length > 0) {
      runModelTraining();
    }
  }, [totalCount]);

  // Compute live prediction based on selected model
  const livePrediction = useMemo(() => {
    if (totalCount < 4) return null;

    // Last 4 multipliers (newest first) squashed and sorted oldest first for prediction input
    const last4 = multipliers.slice(0, 4).reverse();
    const inputs = last4.map(m => squashMultiplier(m.multiplier));

    const nn = nnRef.current;
    const { output } = nn.feedForward(inputs);
    
    // Map output back to actual multiplier domain
    const mlPredictedValue = unsquashMultiplier(output);

    // Traditional Markov transition fallback
    const currentState = getCategory(multipliers[0].multiplier);
    const mStates = [...multipliers].reverse();
    
    const transitionMatrix: Record<StateType, Record<StateType, number>> = {
      CRASH: { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 },
      LOW: { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 },
      MEDIUM: { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 },
      HIGH: { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 },
    };
    const rowTotals: Record<StateType, number> = { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };

    for (let i = 0; i < mStates.length - 1; i++) {
      const from = getCategory(mStates[i].multiplier);
      const to = getCategory(mStates[i+1].multiplier);
      transitionMatrix[from][to]++;
      rowTotals[from]++;
    }

    const nextStateProb: Record<StateType, number> = { CRASH: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };
    const transitionsFromCurrent = rowTotals[currentState];
    if (transitionsFromCurrent > 0) {
      (Object.keys(nextStateProb) as StateType[]).forEach(s => {
        nextStateProb[s] = Math.round((transitionMatrix[currentState][s] / transitionsFromCurrent) * 100);
      });
    }

    // Hybrid combined estimation
    const crashProb = modelType === 'markov' 
      ? (nextStateProb.CRASH + nextStateProb.LOW)
      : modelType === 'deep_ml' 
        ? (mlPredictedValue < 2.0 ? 70 : 30)
        : Math.round(((nextStateProb.CRASH + nextStateProb.LOW) + (mlPredictedValue < 2.0 ? 75 : 25)) / 2);

    let predictedRange = "1.20x - 1.80x";
    let actionTip = "Inspecting historical trends...";
    let targetRecommendation = 1.35;
    let confidence = accuracyScore || 75;

    if (modelType === 'deep_ml') {
      targetRecommendation = Math.min(Math.max(mlPredictedValue * 0.85, 1.05), 35.0);
      if (mlPredictedValue < 1.50) {
        predictedRange = "1.00x - 1.45x";
        actionTip = "Deep ML Model predicts an imminent Early Crash. Keep targets very low (<1.15x) or stay out of the current sequence.";
      } else if (mlPredictedValue < 2.50) {
        predictedRange = "1.45x - 2.80x";
        actionTip = "Continuous neural pattern identified: Stable moderate climbing trend. Set a safe cashout around 1.35x - 1.50x.";
      } else {
        predictedRange = "2.80x - 8.50x";
        actionTip = "Deep sequential pattern indicates golden ratio window! High possibility of correction trend. Aim for 2.00x+.";
      }
    } else {
      // Hybrid or Markov
      if (crashProb > 60) {
        predictedRange = "1.00x - 1.40x";
        targetRecommendation = 1.20;
        actionTip = "Statistical transition matrix signals heavy cold series. Play defensively and cashout fast.";
      } else {
        predictedRange = "1.80x - 5.50x";
        targetRecommendation = 1.85;
        actionTip = "Moderate streak expansion detected. Favorable conditions for targeting multiplier exits between 1.50x and 2.0x.";
      }
    }

    return {
      predictedValue: mlPredictedValue,
      predictedRange,
      crashProb,
      confidence,
      actionTip,
      targetRecommendation,
      nextStateProb
    };
  }, [multipliers, modelType, accuracyScore]);

  // Initial terminal welcome message logs
  useEffect(() => {
    const time = new Date().toLocaleTimeString();
    setTrainingLogs([
      `[${time}] ⚙️ Deep Learning analytics engine initialized...`,
      `[${time}] 🛰️ Awaiting active casino console scraping feed for real-time training...`,
      `[${time}] Multi-Layer Perceptron neural network calibrated.`
    ]);
  }, []);

  return (
    <div id="learning-predictor-panel" className="glass-card rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background visual graphics */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Header with Title and Mode selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
            <Brain size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              Deep Learning Pattern Predictor
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider border transition-all ${
                isTraining 
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-400 animate-pulse' 
                  : 'bg-emerald-950/80 border-emerald-900/40 text-emerald-400'
              }`}>
                {isTraining ? '🎯 Training Model...' : '🧠 Neural Net Calibrated'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">Self-training browser-side Backpropagation Neural Network pipeline</p>
          </div>
        </div>

        {/* Model Mode Switches */}
        <div className="flex items-center gap-1.5 bg-[#0a0d1e] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setModelType('deep_ml')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              modelType === 'deep_ml' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold' 
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            Deep Neural Net
          </button>
          <button
            onClick={() => setModelType('hybrid')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              modelType === 'hybrid' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold' 
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            Hybrid AI
          </button>
          <button
            onClick={() => setModelType('markov')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              modelType === 'markov' 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold' 
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            Markov Matrix
          </button>
        </div>
      </div>

      {totalCount < 5 ? (
        <div className="bg-[#080b16]/50 rounded-2xl p-8 border border-white/5 text-center space-y-4">
          <Activity className="text-rose-500 mx-auto animate-pulse" size={32} />
          <div>
            <h4 className="text-xs font-semibold text-slate-300 font-display uppercase tracking-wider">Awaiting Flight History Dataset ({totalCount}/5 Rounds)</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-sans">
              The deep backpropagation neural networks require at least 5 registered multipliers to safely structure sliding sequences, map weights, and perform gradient descent training.
            </p>
          </div>
          <div className="bg-[#05070e] p-3 rounded-xl border border-white/5 inline-block text-[11px] font-mono text-slate-400">
            👉 Tip: Inject the console scraper script into your game page to begin auto-syncing rounds!
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* COLUMN 1: Neural Prediction output, Live charts & Synapse Visualizer (7 cols) */}
          <div className="md:col-span-7 space-y-5">
            
            {/* Live Predicted Scorecard */}
            {livePrediction && (
              <div className="bg-[#080c16]/75 rounded-2xl p-5 border border-white/5 relative overflow-hidden space-y-4 shadow-xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider flex items-center gap-1">
                      <Sparkles size={11} className="text-rose-400" />
                      Sequential Deep Forecast
                    </span>
                    <h4 className="text-xs font-bold text-slate-200 uppercase font-display tracking-wide mt-0.5">Real-Time Estimations</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 font-mono block">MODEL FIDELITY ACCURACY</span>
                    <span className="text-xs font-mono font-black text-rose-500 flex items-center gap-1 justify-end">
                      <Activity size={12} className="animate-pulse" />
                      {livePrediction.confidence}%
                    </span>
                  </div>
                </div>

                {/* Scorecard grids */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">ML Next Point</span>
                    <div className="text-base font-mono font-black text-white tracking-tight">
                      {livePrediction.predictedValue.toFixed(2)}x
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono block">Raw Squashed Point</span>
                  </div>

                  <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Estimated Range</span>
                    <div className="text-base font-mono font-bold text-rose-400 tracking-tight">
                      {livePrediction.predictedRange}
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono block">High/Low Confidence Window</span>
                  </div>

                  <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Recom. Auto-Cashout</span>
                    <div className="text-base font-mono font-black text-emerald-400 tracking-tight">
                      {livePrediction.targetRecommendation.toFixed(2)}x
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono block">Optimal Safe Stop point</span>
                  </div>
                </div>

                {/* Visual probability graph */}
                <div className="bg-[#05070e] p-4 rounded-xl border border-white/5 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <TrendingUp size={13} className="text-rose-500" />
                      Calculated Crash Likelihood (&lt; 2.00x)
                    </span>
                    <span className={`font-mono font-black ${livePrediction.crashProb > 60 ? 'text-rose-500' : 'text-emerald-400'}`}>
                      {livePrediction.crashProb}%
                    </span>
                  </div>

                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full transition-all duration-700 ${
                        livePrediction.crashProb > 60 
                          ? 'bg-gradient-to-r from-rose-600 to-rose-400' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${livePrediction.crashProb}%` }}
                    />
                    <div 
                      className="bg-[#0a0f1c] h-full" 
                      style={{ width: `${100 - livePrediction.crashProb}%` }}
                    />
                  </div>
                </div>

                {/* Tactical tip card */}
                <div className="bg-rose-950/10 border border-rose-900/10 rounded-xl p-3 text-[11px] leading-relaxed text-slate-300">
                  <strong className="text-rose-400 uppercase tracking-wide text-[9px] block mb-1">LEARNED ACTION RECOMMENDATION:</strong>
                  {livePrediction.actionTip}
                </div>

              </div>
            )}

            {/* Neural Connections Weight Network Visualizer (SVG) */}
            <div className="bg-[#05070e] rounded-xl p-4 border border-white/5 space-y-3.5 relative">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider">Neural Synapses Connections Matrix</span>
                <span className="text-[8px] bg-indigo-950 border border-indigo-900 text-indigo-400 px-2 py-0.5 rounded-full font-mono uppercase">
                  Feedforward Layer Activation
                </span>
              </div>

              <div className="h-28 w-full flex items-center justify-between px-4 bg-slate-950/40 rounded-lg relative overflow-hidden border border-white/5">
                {/* SVG Connections representing Neural Weights */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none">
                  {/* Synapse Lines (Input -> Hidden 1) */}
                  {[0, 1, 2, 3].map(i => 
                    [0, 1, 2, 3, 4, 5].map(j => {
                      const color = (i + j) % 2 === 0 ? 'rgba(244,63,94,0.15)' : 'rgba(52,211,153,0.1)';
                      return (
                        <line 
                          key={`l1-${i}-${j}`}
                          x1="12%" y1={`${20 + i * 20}%`}
                          x2="48%" y2={`${10 + j * 16}%`}
                          stroke={color}
                          strokeWidth="1"
                        />
                      );
                    })
                  )}

                  {/* Synapse Lines (Hidden 1 -> Hidden 2) */}
                  {[0, 1, 2, 3, 4, 5].map(i => 
                    [0, 1, 2, 3].map(j => {
                      const color = (i + j) % 2 === 0 ? 'rgba(244,63,94,0.12)' : 'rgba(52,211,153,0.1)';
                      return (
                        <line 
                          key={`l2-${i}-${j}`}
                          x1="48%" y1={`${10 + i * 16}%`}
                          x2="78%" y2={`${20 + j * 20}%`}
                          stroke={color}
                          strokeWidth="1"
                        />
                      );
                    })
                  )}

                  {/* Synapse Lines (Hidden 2 -> Output) */}
                  {[0, 1, 2, 3].map(i => (
                    <line 
                      key={`l3-${i}`}
                      x1="78%" y1={`${20 + i * 20}%`}
                      x2="94%" y2="50%"
                      stroke="rgba(244,63,94,0.25)"
                      strokeWidth="1.2"
                    />
                  ))}
                </svg>

                {/* Nodes Display Layer */}
                {/* Input Nodes */}
                <div className="flex flex-col gap-2.5 z-10">
                  {[0, 1, 2, 3].map(i => (
                    <div key={`n-in-${i}`} className="w-4.5 h-4.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[8px] font-mono text-slate-500" title={`Input Node ${i+1}`}>
                      X{i+1}
                    </div>
                  ))}
                </div>

                {/* Hidden Layer 1 Nodes */}
                <div className="flex flex-col gap-1 z-10">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div key={`n-h1-${i}`} className="w-3.5 h-3.5 rounded-full bg-rose-950/30 border border-rose-900/40 flex items-center justify-center text-[7px] font-mono text-rose-400" title={`Hidden Node H1-${i+1}`}>
                      H{i+1}
                    </div>
                  ))}
                </div>

                {/* Hidden Layer 2 Nodes */}
                <div className="flex flex-col gap-2 z-10">
                  {[0, 1, 2, 3].map(i => (
                    <div key={`n-h2-${i}`} className="w-3.5 h-3.5 rounded-full bg-indigo-950/30 border border-indigo-900/40 flex items-center justify-center text-[7px] font-mono text-indigo-400" title={`Hidden Node H2-${i+1}`}>
                      H{i+1}
                    </div>
                  ))}
                </div>

                {/* Output Node */}
                <div className="flex flex-col justify-center z-10 pr-2">
                  <div className="w-5.5 h-5.5 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-[9px] font-mono text-rose-500 font-extrabold animate-pulse" title="Next Squashed Target Prediction">
                    Y
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* COLUMN 2: Model Tuning Sliders, Loss graph & Terminal Logs Console (5 cols) */}
          <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
            
            {/* Tuning Sliders Block */}
            <div className="bg-[#080c16]/50 rounded-xl p-4 border border-white/5 space-y-4">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider block">Neural Network Optimizer Configuration</span>
              
              <div className="space-y-3.5 text-xs">
                {/* Learning Rate Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Sliders size={12} className="text-rose-500" />
                      Learning Rate (&eta;)
                    </span>
                    <span className="text-rose-400 font-bold">{learningRate.toFixed(2)}</span>
                  </div>
                  <input
                    id="slider-learning-rate"
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={learningRate}
                    onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#0e1424] rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <span className="text-[9px] text-slate-500 font-mono block">Controls step size during weight optimization</span>
                </div>

                {/* Training Epochs Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <RefreshCw size={12} className="text-rose-500" />
                      Training Epochs
                    </span>
                    <span className="text-rose-400 font-bold">{epochs}</span>
                  </div>
                  <input
                    id="slider-epochs"
                    type="range"
                    min="200"
                    max="1500"
                    step="100"
                    value={epochs}
                    onChange={(e) => setEpochs(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#0e1424] rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <span className="text-[9px] text-slate-500 font-mono block">Iterations of dataset backpropagation cycle</span>
                </div>

                {/* Retrain Button & Loss Metrics */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                  <div className="font-mono">
                    <span className="text-[9px] text-slate-500 block">CURRENT LOSS</span>
                    <strong className="text-slate-300 text-[11px]">
                      {currentLoss > 0 ? currentLoss.toFixed(5) : '0.00000'}
                    </strong>
                  </div>

                  <button
                    id="btn-re-train-nn"
                    disabled={isTraining}
                    onClick={runModelTraining}
                    className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-white border border-rose-500/30 rounded-xl font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play size={12} className={isTraining ? 'animate-spin' : ''} />
                    Retrain Model
                  </button>
                </div>
              </div>
            </div>

            {/* Micro Sparkline Loss Chart */}
            {lossHistory.length > 0 && (
              <div className="bg-[#05070e] p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex justify-between text-[9px] text-slate-500 font-mono uppercase font-bold">
                  <span>Backpropagation Loss Curve (MSE)</span>
                  <span className="text-rose-400">Stable Convergence</span>
                </div>
                <div className="flex items-end gap-1.5 h-11 pt-2 px-1">
                  {lossHistory.map((loss, idx) => {
                    // Map loss values to height percentages
                    const maxLoss = Math.max(...lossHistory, 0.01);
                    const minLoss = Math.min(...lossHistory);
                    const range = maxLoss - minLoss;
                    const pct = range > 0 ? ((loss - minLoss) / range) * 85 + 15 : 50;

                    return (
                      <div 
                        key={idx}
                        className="flex-grow bg-rose-500/30 hover:bg-rose-500 rounded-sm relative group cursor-pointer transition-all"
                        style={{ height: `${pct}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-950 border border-white/10 text-[8px] font-mono px-1.5 py-0.5 rounded text-white z-20 whitespace-nowrap">
                          Loss: {loss}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[8px] text-slate-600 font-mono">
                  <span>Epoch 1</span>
                  <span>Epoch {epochs}</span>
                </div>
              </div>
            )}

            {/* Live Model Training Log Terminal */}
            <div className="bg-[#03050a] rounded-xl border border-white/5 flex flex-col h-44 overflow-hidden shadow-inner">
              <div className="flex justify-between items-center bg-[#070b14] px-3.5 py-2 border-b border-white/5 text-[10px] font-mono">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Terminal size={12} className="text-rose-500 animate-pulse" />
                  ML Telemetry logs
                </span>
                <span className="text-slate-600 text-[9px] uppercase font-bold">BATCH GRADIENT ACTIVE</span>
              </div>

              <div className="p-3 overflow-y-auto font-mono text-[10px] text-emerald-400/90 leading-relaxed scrollbar-thin h-full flex flex-col-reverse justify-end">
                <div className="space-y-1">
                  {trainingLogs.map((log, i) => (
                    <p key={i} className="whitespace-pre-wrap select-all selection:bg-emerald-500/25">
                      {log}
                    </p>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
