import { useState, useEffect, memo } from 'react';
import { API_PATH } from '../utils/api';
import './FearGreedIndex.css';

/**
 * Market Fear & Greed Index Component
 * Displays market sentiment gauge and recommendations
 */

function FearGreedIndex() {
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSentiment();
    const interval = setInterval(loadSentiment, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadSentiment = async () => {
    try {
      const res = await fetch(`${API_PATH}/sentiment`);
      if (!res.ok) throw new Error('Failed to fetch sentiment');
      const data = await res.json();
      setSentiment(data.sentiment);
      setError(null);
    } catch (err) {
      console.error('Error loading sentiment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="fgi-loading">Calculating market sentiment...</div>;
  if (error) return <div className="fgi-error">Error: {error}</div>;
  if (!sentiment) return null;

  const getGaugeColor = (score) => {
    if (score < 25) return '#ef4444'; // Red - Extreme fear
    if (score < 45) return '#f97316'; // Orange - Fear
    if (score < 55) return '#eab308'; // Yellow - Neutral
    if (score < 75) return '#84cc16'; // Lime - Greed
    return '#22c55e'; // Green - Extreme greed
  };

  const getGaugeLabel = (score) => {
    if (score < 25) return 'EXTREME FEAR';
    if (score < 45) return 'FEAR';
    if (score < 55) return 'NEUTRAL';
    if (score < 75) return 'GREED';
    return 'EXTREME GREED';
  };

  return (
    <div className="fear-greed-index">
      <div className="fgi-header">
        <h3>📊 Market Fear & Greed Index</h3>
        <p className="fgi-subtitle">Real-time market sentiment analysis</p>
      </div>

      {/* Gauge Display */}
      <div className="gauge-container">
        <div className="gauge-wrapper">
          <svg viewBox="0 0 200 120" className="gauge-svg">
            {/* Background arc */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" x2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>

            {/* Gauge arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="12"
            />

            {/* Needle */}
            <g
              transform={`rotate(${sentiment.fearGreedScore * 1.8 - 90} 100 100)`}
              className="gauge-needle"
            >
              <line x1="100" y1="100" x2="100" y2="30" stroke="#f1f5f9" strokeWidth="2" />
              <circle cx="100" cy="100" r="4" fill="#f1f5f9" />
            </g>

            {/* Labels */}
            <text x="25" y="115" className="gauge-label">Fear</text>
            <text x="165" y="115" className="gauge-label">Greed</text>
          </svg>

          <div className="gauge-value">
            <p className="value-number">{Math.round(sentiment.fearGreedScore)}</p>
            <p className="value-label">{getGaugeLabel(sentiment.fearGreedScore)}</p>
          </div>
        </div>

        {/* Metrics Breakdown */}
        <div className="metrics-breakdown">
          <MetricBar
            label="Volatility"
            value={sentiment.metrics.volatility}
            icon="📉"
          />
          <MetricBar
            label="Momentum"
            value={sentiment.metrics.momentum}
            icon="📈"
          />
          <MetricBar
            label="Volume"
            value={sentiment.metrics.volume}
            icon="📊"
          />
          <MetricBar
            label="News Sentiment"
            value={sentiment.metrics.newsSentiment}
            icon="📰"
          />
          <MetricBar
            label="Sector Breadth"
            value={sentiment.metrics.sectorBreadth}
            icon="🌐"
          />
        </div>
      </div>

      {/* Interpretation */}
      <div className="sentiment-interpretation">
        <h4 className="interpretation-title">💭 Market Context</h4>
        <p className="interpretation-text">{sentiment.interpretation}</p>
      </div>

      {/* Recommendations */}
      <div className="recommendations">
        <h4 className="recommendations-title">🧭 Suggestions</h4>
        <div className="recommendation-items">
          {sentiment.recommendations.map((rec, idx) => (
            <div key={idx} className="rec-item">
              <span className="rec-dot">•</span>
              <span className="rec-text">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Important Note */}
      <div className="sentiment-note">
        ⚠️ <strong>Disclaimer:</strong> This sentiment index is for educational purposes. Not financial advice. Always do your own research and consult professionals before making investment decisions.
      </div>
    </div>
  );
}

function MetricBar({ label, value, icon }) {
  const percentage = Math.min(100, Math.max(0, value));
  const getColor = (val) => {
    if (val < 30) return '#ef4444';
    if (val < 50) return '#f97316';
    if (val < 70) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="metric-bar">
      <div className="metric-label">
        <span className="metric-icon">{icon}</span>
        <span className="metric-name">{label}</span>
      </div>
      <div className="metric-bar-container">
        <div
          className="metric-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: getColor(percentage),
          }}
        />
      </div>
      <span className="metric-value">{Math.round(percentage)}%</span>
    </div>
  );
}

export default memo(FearGreedIndex);
