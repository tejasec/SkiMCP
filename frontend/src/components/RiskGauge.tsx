interface RiskGaugeProps {
  score: number;
  risk: 'critical' | 'high' | 'medium' | 'low';
}

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export default function RiskGauge({ score, risk }: RiskGaugeProps) {
  const color = RISK_COLORS[risk];
  // SVG arc from 0–100
  const radius = 60;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="risk-gauge">
      <svg viewBox="0 0 140 80" className="gauge-svg">
        {/* Background arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke="#2a2a3e"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${offset}`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="gauge-score" style={{ color }}>
        {score}
      </div>
      <div className="gauge-label" style={{ color }}>
        {risk.toUpperCase()}
      </div>
    </div>
  );
}
