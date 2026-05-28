import { useState, useEffect, memo } from 'react';
import { API_PATH } from '../utils/api';

/**
 * Technical Indicators Panel Component
 * Displays RSI, MACD, SMA, EMA, Bollinger Bands, VWAP
 * With beginner-friendly explanations
 */

function TechnicalIndicators({ symbol, range = '1m' }) {
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIndicator, setExpandedIndicator] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    fetch(`${API_PATH}/indicators/${symbol}?range=${range}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setIndicators(data.indicators);
      })
      .catch(err => {
        console.error('Error fetching indicators:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [symbol, range]);

  if (!symbol) return null;
  if (loading) return <div className="indicator-loading">Loading indicators...</div>;
  if (error) return <div className="indicator-error">Error: {error}</div>;
  if (!indicators) return null;

  return (
    <div className="technical-indicators">
      <div className="indicators-header">
        <h3>📊 Technical Indicators</h3>
        <span className="indicators-subtitle">Professional analysis tools</span>
      </div>

      <div className="indicators-grid">
        {/* RSI */}
        <IndicatorCard
          name="RSI"
          fullName="Relative Strength Index"
          value={indicators.rsi}
          unit="%"
          expanded={expandedIndicator === 'rsi'}
          onToggle={() => setExpandedIndicator(expandedIndicator === 'rsi' ? null : 'rsi')}
        >
          <RSIExplanation value={indicators.rsi} />
        </IndicatorCard>

        {/* MACD */}
        <IndicatorCard
          name="MACD"
          fullName="Moving Average Convergence Divergence"
          value={indicators.macd?.line}
          unit={null}
          expanded={expandedIndicator === 'macd'}
          onToggle={() => setExpandedIndicator(expandedIndicator === 'macd' ? null : 'macd')}
        >
          <MACDExplanation macd={indicators.macd} />
        </IndicatorCard>

        {/* SMA */}
        <IndicatorCard
          name="SMA"
          fullName="Simple Moving Average"
          value={`20: ${indicators.sma?.sma20 || '—'} | 50: ${indicators.sma?.sma50 || '—'}`}
          unit={null}
          expanded={expandedIndicator === 'sma'}
          onToggle={() => setExpandedIndicator(expandedIndicator === 'sma' ? null : 'sma')}
        >
          <SMAExplanation sma={indicators.sma} current={indicators.current?.price} />
        </IndicatorCard>

        {/* EMA */}
        <IndicatorCard
          name="EMA"
          fullName="Exponential Moving Average"
          value={`12: ${indicators.ema?.ema12 || '—'} | 26: ${indicators.ema?.ema26 || '—'}`}
          unit={null}
          expanded={expandedIndicator === 'ema'}
          onToggle={() => setExpandedIndicator(expandedIndicator === 'ema' ? null : 'ema')}
        >
          <EMAExplanation ema={indicators.ema} current={indicators.current?.price} />
        </IndicatorCard>

        {/* Bollinger Bands */}
        <IndicatorCard
          name="BB"
          fullName="Bollinger Bands"
          value={`U: ${indicators.bollingerBands?.upper || '—'}`}
          unit={null}
          expanded={expandedIndicator === 'bb'}
          onToggle={() => setExpandedIndicator(expandedIndicator === 'bb' ? null : 'bb')}
        >
          <BollingerBandsExplanation bb={indicators.bollingerBands} current={indicators.current?.price} />
        </IndicatorCard>

        {/* VWAP */}
        <IndicatorCard
          name="VWAP"
          fullName="Volume Weighted Average Price"
          value={indicators.vwap}
          unit={null}
          expanded={expandedIndicator === 'vwap'}
          onToggle={() => setExpandedIndicator(expandedIndicator === 'vwap' ? null : 'vwap')}
        >
          <VWAPExplanation vwap={indicators.vwap} current={indicators.current?.price} />
        </IndicatorCard>
      </div>
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────

function IndicatorCard({ name, fullName, value, unit, expanded, onToggle, children }) {
  return (
    <div className={`indicator-card ${expanded ? 'expanded' : ''}`}>
      <div className="indicator-header" onClick={onToggle}>
        <div className="indicator-title">
          <span className="indicator-name">{name}</span>
          <span className="indicator-full">{fullName}</span>
        </div>
        <div className="indicator-value">
          <span className="value-number">{value}</span>
          {unit && <span className="value-unit">{unit}</span>}
          <span className="toggle-icon">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {expanded && <div className="indicator-content">{children}</div>}
    </div>
  );
}

function RSIExplanation({ value }) {
  if (!value && value !== 0) return <p>No data available</p>;
  
  let status, color, meaning;
  if (value > 70) {
    status = 'OVERBOUGHT';
    color = '#ef4444';
    meaning = 'Stock may be too strong; could pull back soon.';
  } else if (value < 30) {
    status = 'OVERSOLD';
    color = '#22c55e';
    meaning = 'Stock may be too weak; could recover soon.';
  } else {
    status = 'NEUTRAL';
    color = '#eab308';
    meaning = 'Stock is trading in a normal range.';
  }

  return (
    <div className="explanation">
      <div className="status-badge" style={{ borderColor: color }}>
        <span style={{ color }}>{status}</span>
      </div>
      <p className="explanation-text">{meaning}</p>
      <p className="explanation-tip">
        💡 <strong>Tip:</strong> RSI above 70 suggests temporary overbought conditions. RSI below 30 suggests temporary oversold conditions.
      </p>
    </div>
  );
}

function MACDExplanation({ macd }) {
  if (!macd) return <p>No data available</p>;
  
  const signal = macd.histogram > 0 ? 'BULLISH' : 'BEARISH';
  const color = macd.histogram > 0 ? '#22c55e' : '#ef4444';

  return (
    <div className="explanation">
      <div className="status-badge" style={{ borderColor: color }}>
        <span style={{ color }}>{signal}</span>
      </div>
      <div className="indicator-details">
        <div className="detail-row">
          <span>MACD Line:</span>
          <span>{macd.line?.toFixed(4) || '—'}</span>
        </div>
        <div className="detail-row">
          <span>Signal Line:</span>
          <span>{macd.signal?.toFixed(4) || '—'}</span>
        </div>
        <div className="detail-row">
          <span>Histogram:</span>
          <span>{macd.histogram?.toFixed(4) || '—'}</span>
        </div>
      </div>
      <p className="explanation-tip">
        💡 <strong>Tip:</strong> Positive histogram indicates bullish momentum. Negative indicates bearish momentum.
      </p>
    </div>
  );
}

function SMAExplanation({ sma, current }) {
  if (!sma) return <p>No data available</p>;
  
  const above50 = current > sma.sma50;
  const above20 = current > sma.sma20;

  return (
    <div className="explanation">
      <div className="indicator-details">
        <div className="detail-row">
          <span>20-Day SMA:</span>
          <span>{sma.sma20?.toFixed(2) || '—'}</span>
        </div>
        <div className="detail-row">
          <span>50-Day SMA:</span>
          <span>{sma.sma50?.toFixed(2) || '—'}</span>
        </div>
        <div className="detail-row">
          <span>Price Position:</span>
          <span>{above50 ? 'Above 50-day average ↑' : 'Below 50-day average ↓'}</span>
        </div>
      </div>
      <p className="explanation-text">
        {above50 ? 'Stock is trading above long-term average.' : 'Stock is trading below long-term average.'}
      </p>
      <p className="explanation-tip">
        💡 <strong>Tip:</strong> Price above SMA suggests uptrend. Price below SMA suggests downtrend.
      </p>
    </div>
  );
}

function EMAExplanation({ ema, current }) {
  if (!ema) return <p>No data available</p>;

  return (
    <div className="explanation">
      <div className="indicator-details">
        <div className="detail-row">
          <span>12-Day EMA:</span>
          <span>{ema.ema12?.toFixed(2) || '—'}</span>
        </div>
        <div className="detail-row">
          <span>26-Day EMA:</span>
          <span>{ema.ema26?.toFixed(2) || '—'}</span>
        </div>
      </div>
      <p className="explanation-text">
        EMA responds faster to recent price changes compared to SMA.
      </p>
      <p className="explanation-tip">
        💡 <strong>Tip:</strong> EMA crossovers can signal trend changes. Often used with MACD.
      </p>
    </div>
  );
}

function BollingerBandsExplanation({ bb, current }) {
  if (!bb) return <p>No data available</p>;
  
  let position = 'middle';
  if (current > bb.upper) position = 'above';
  if (current < bb.lower) position = 'below';

  return (
    <div className="explanation">
      <div className="indicator-details">
        <div className="detail-row">
          <span>Upper Band:</span>
          <span>{bb.upper?.toFixed(2) || '—'}</span>
        </div>
        <div className="detail-row">
          <span>Middle Band:</span>
          <span>{bb.middle?.toFixed(2) || '—'}</span>
        </div>
        <div className="detail-row">
          <span>Lower Band:</span>
          <span>{bb.lower?.toFixed(2) || '—'}</span>
        </div>
      </div>
      <p className="explanation-text">
        Price is {position === 'above' ? 'above upper band (may be overbought)' : position === 'below' ? 'below lower band (may be oversold)' : 'within normal range'}.
      </p>
      <p className="explanation-tip">
        💡 <strong>Tip:</strong> Wider bands mean higher volatility. Price touching upper band suggests overbought; lower band suggests oversold.
      </p>
    </div>
  );
}

function VWAPExplanation({ vwap, current }) {
  if (!vwap) return <p>No data available</p>;
  
  const aboveVWAP = current > vwap;

  return (
    <div className="explanation">
      <div className="indicator-details">
        <div className="detail-row">
          <span>VWAP:</span>
          <span>{vwap?.toFixed(2) || '—'}</span>
        </div>
        <div className="detail-row">
          <span>Current Price:</span>
          <span>{current?.toFixed(2) || '—'}</span>
        </div>
        <div className="detail-row">
          <span>Status:</span>
          <span>{aboveVWAP ? 'Above VWAP (Bullish)' : 'Below VWAP (Bearish)'}</span>
        </div>
      </div>
      <p className="explanation-text">
        {aboveVWAP ? 'Institutional buyers are active.' : 'Institutional sellers are active.'}
      </p>
      <p className="explanation-tip">
        💡 <strong>Tip:</strong> Used by institutional traders. Shows average price weighted by volume.
      </p>
    </div>
  );
}

export default memo(TechnicalIndicators);
