export interface MultiplierRecord {
  id: string;
  multiplier: number;
  timestamp: number;
  source: 'simulator' | 'manual' | 'scraper';
}

export type AlertType = 'consecutive_low' | 'no_high' | 'average_low';

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  threshold: number;
  consecutiveRounds: number;
  isActive: boolean;
  isTriggered: boolean;
}

export interface AIPrediction {
  summary: string;
  detectedPatterns: string[];
  nextRoundForecast: {
    range: string;
    probabilityUnder20: number;
    probabilityOver20: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  strategyAdvice: string;
  timestamp: number;
  isFallback?: boolean;
}
