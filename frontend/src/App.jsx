import { useState, useMemo, useRef, useEffect, memo, useCallback } from 'react';
import { useMarketData } from './hooks/useMarketData';
import { useHistoricalData, useExplanation } from './hooks/useHistoricalData';
import * as d3 from 'd3';
import './App.css';

// ── Constants ─────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { id: '1d',  label: '1D',  desc: 'Intraday'    },
  { id: '1w',  label: '1W',  desc: 'This week'   },
  { id: '1m',  label: '1M',  desc: 'Past month'  },
  { id: '3m',  label: '3M',  desc: 'Past 3 months' },
  { id: '6m',  label: '6M',  desc: 'Past 6 months' },
  { id: 'ytd', label: 'YTD', desc: 'Year to date' },
  { id: '1y',  label: '1Y',  desc: 'Past year'   },
  { id: '3y',  label: '3Y',  desc: 'Past 3 years' },
  { id: '5y',  label: '5Y',  desc: 'Past 5 years' },
];

const TABS = ['Market', 'Gainers/Losers', 'Heatmap', 'Portfolio', 'Advisor'];

const EVENT_ICONS = {
  monetary_policy: '🏦',
  imf:            '💰',
  political:      '🏛️',
  geopolitical:   '⚠️',
  crisis:         '🚨',
  disaster:       '🌊',
  macro:          '📊',
  fiscal_policy:  '📋',
  currency:       '💱',
  market_milestone: '🎯',
  global:         '🌍',
  recovery:       '📈',
};

const EVENT_COLORS = {
  crash:       '#ef4444',
  negative:    '#f97316',
  mixed:       '#eab308',
  neutral:     '#6b7280',
  recovery:    '#22c55e',
  rally:       '#22c55e',
  mega_rally:  '#16a34a',
};

// ── Formatting ─────────────────────────────────────────────────────────

const fmt  = (n, d = 2) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(d) : '—');
const fmtV = (v) => {
  if (!v || !Number.isFinite(v) || v <= 0) return '—';
  return Math.round(v).toLocaleString('en-US');
};
const fmtI = (n) => n != null && Number.isFinite(n)
  ? n.toLocaleString('en-PK', { maximumFractionDigits: 2 }) : '—';
const fmtDate = (ts, range) => {
  const d = new Date(ts);
  if (range === '1d') return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  if (['1w','1m'].includes(range)) return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short' });
};

// ── Sub-components ─────────────────────────────────────────────────────

function LiveDot({ active }) {
  return <span className={`live-dot ${active ? 'live-dot-on' : ''}`} />;
}

function MarketStatusBadge({ status }) {
  const map = {
    OPEN:       { cls: 'badge-green',  label: '● MARKET OPEN' },
    PRE_MARKET: { cls: 'badge-yellow', label: '◐ PRE-MARKET' },
    CLOSED:     { cls: 'badge-red',    label: '○ CLOSED' },
    WEEKEND:    { cls: 'badge-gray',   label: '○ WEEKEND' },
    UNKNOWN:    { cls: 'badge-gray',   label: '? UNKNOWN' },
  };
  const { cls, label } = map[status] || map.UNKNOWN;
  return <span className={`market-badge ${cls}`}>{label}</span>;
}

function IndexCard({ index, label }) {
  if (!index) return (
    <div className="index-card index-card--empty">
      <div className="index-card__name">{label}</div>
      <div className="index-card__value">—</div>
    </div>
  );
  const up = index.changePercent >= 0;
  return (
    <div className={`index-card ${up ? 'index-card--up' : 'index-card--down'}`}>
      <div className="index-card__name">{label}</div>
      <div className="index-card__value">{fmtI(index.value)}</div>
      <div className={`index-card__change ${up ? 'text-up' : 'text-down'}`}>
        {up ? '▲' : '▼'} {fmt(Math.abs(index.change))} ({fmt(Math.abs(index.changePercent))}%)
      </div>
      <div className="index-card__vol">Vol: {fmtV(index.volume)}</div>
    </div>
  );
}

function PriceCell({ price }) {
  const prevRef = useRef(price);
  const [flash, setFlash] = useState('');
  useEffect(() => {
    if (prevRef.current === price) return;
    const dir = price > prevRef.current ? 'flash-up' : 'flash-down';
    prevRef.current = price;
    setFlash(dir);
    const t = setTimeout(() => setFlash(''), 600);
    return () => clearTimeout(t);
  }, [price]);
  return <span className={`price-cell ${flash}`}>{fmt(price)}</span>;
}

function TickerTape({ stocks }) {
  const items = useMemo(() =>
    stocks.filter(s => s.price > 0).slice(0, 40).map(s => ({
      sym: s.symbol, price: fmt(s.price), pct: fmt(Math.abs(s.changePercent)), up: s.changePercent >= 0,
    })), [stocks]);
  if (!items.length) return null;
  return (
    <div className="ticker-wrap">
      <div className="ticker-tape">
        {[...items, ...items].map((s, i) => (
          <span key={i} className={`ticker-item ${s.up ? 'ticker-up' : 'ticker-down'}`}>
            <b>{s.sym}</b> {s.price} <span>{s.up ? '▲' : '▼'}{s.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Professional Chart using Lightweight Charts ─────────────────────────

function ProfessionalChart({ symbol, range, currentPrice }) {
  const { candles, loading, source, lastFetch } = useHistoricalData(symbol, range);
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);
  const volRef       = useRef(null);
  const eventMarkers = useRef([]);

  // Fetch events for the current range
  const { explanation, events } = useExplanation(symbol, range);

  // Build chart
  useEffect(() => {
    if (!containerRef.current) return;
    let cleanup = () => {};

    import('lightweight-charts').then(({ createChart, ColorType, CrosshairMode }) => {
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

      const chart = createChart(containerRef.current, {
        width:  containerRef.current.clientWidth,
        height: 340,
        layout: {
          background: { type: ColorType.Solid, color: '#f8fafc' },
          textColor: '#111827',
          fontSize: 11,
          fontFamily: "'Inter', system-ui, sans-serif",
        },
        grid: {
          vertLines: { color: '#dfe3e8', style: 1 },
          horzLines: { color: '#dfe3e8', style: 1 },
        },
        crosshair: {
          mode: CrosshairMode ? CrosshairMode.Normal : 1,
          vertLine: { color: '#cbd5e1', width: 1, style: 1 },
          horzLine: { color: '#cbd5e1', width: 1, style: 1 },
        },
        rightPriceScale: {
          borderColor: '#d1d5db',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: '#d1d5db',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale:  { mouseWheel: true, pinch: true },
      });

      // Main candle series
      const candleSeries = chart.addCandlestickSeries({
        upColor:          '#22c55e',
        downColor:        '#ef4444',
        borderUpColor:    '#16a34a',
        borderDownColor:  '#dc2626',
        wickUpColor:      '#16a34a',
        wickDownColor:    '#dc2626',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });

      // Volume
      const volSeries = chart.addHistogramSeries({
        priceScaleId: 'vol',
        priceFormat: { type: 'volume' },
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

      chartRef.current = chart;
      seriesRef.current = candleSeries;
      volRef.current = volSeries;

      // ResizeObserver
      const obs = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      obs.observe(containerRef.current);

      cleanup = () => {
        obs.disconnect();
        if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
      };
    });

    return cleanup;
  }, [symbol]);

  // Update data when candles change
  useEffect(() => {
    if (!seriesRef.current || !volRef.current || candles.length === 0) return;

    // Convert ms timestamps to seconds for LWC
    const candleData = candles.map(c => ({
      time:  Math.floor(c.time / 1000),
      open:  c.open,
      high:  c.high,
      low:   c.low,
      close: c.close,
    })).filter(c => c.open && c.high && c.low && c.close);

    const volData = candles.map(c => ({
      time:  Math.floor(c.time / 1000),
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
    }));

    if (candleData.length > 0) {
      seriesRef.current.setData(candleData);
      volRef.current.setData(volData.filter(v => v.value > 0));

      // Add event markers on chart
      if (events && events.length > 0) {
        const markers = events
          .map(evt => {
            const evtTime = Math.floor(new Date(evt.date).getTime() / 1000);
            const icon = EVENT_ICONS[evt.type] || '📌';
            const color = EVENT_COLORS[evt.impact] || '#6b7280';
            return {
              time: evtTime,
              position: evt.magnitude > 0 ? 'belowBar' : 'aboveBar',
              color,
              shape: 'circle',
              text: icon,
              size: 1,
            };
          })
          .filter(m => m.time >= candleData[0].time && m.time <= candleData[candleData.length - 1].time)
          .sort((a, b) => a.time - b.time);

        if (markers.length > 0) {
          seriesRef.current.setMarkers(markers);
        }
      }

      if (chartRef.current) chartRef.current.timeScale().fitContent();
    }
  }, [candles, events]);

  return (
    <div className="pro-chart">
      <div className="pro-chart__meta">
        <span className={`chart-source ${source === 'dps_api' ? 'source-live' : source === 'synthetic' ? 'source-synthetic' : ''}`}>
          {source === 'dps_api' ? '● Live PSX Data' : source === 'synthetic' ? '◐ Estimated Data' : '○ Loading…'}
        </span>
        {lastFetch && (
          <span className="chart-refresh">
            Updated {new Date(lastFetch).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      {loading && candles.length === 0 && (
        <div className="chart-skeleton">
          <div className="skeleton-bar" style={{ height: '60%', left: '5%' }} />
          <div className="skeleton-bar" style={{ height: '80%', left: '20%' }} />
          <div className="skeleton-bar" style={{ height: '45%', left: '35%' }} />
          <div className="skeleton-bar" style={{ height: '90%', left: '50%' }} />
          <div className="skeleton-bar" style={{ height: '70%', left: '65%' }} />
          <div className="skeleton-bar" style={{ height: '55%', left: '80%' }} />
        </div>
      )}
      <div ref={containerRef} className="pro-chart__canvas" style={{ display: (loading && candles.length === 0) ? 'none' : 'block' }} />
    </div>
  );
}

// ── Event Timeline ────────────────────────────────────────────────────

function EventTimeline({ events, explanation, stock }) {
  const [expanded, setExpanded] = useState(null);

  if (!events || events.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No major market events found for this period.</p>
      </div>
    );
  }

  const positiveCount = events.filter(evt => evt.magnitude > 0).length;
  const negativeCount = events.filter(evt => evt.magnitude < 0).length;
  const impactSum = events.reduce((total, evt) => total + (evt.magnitude || 0), 0);
  const sentiment = impactSum >= 3 ? 'Bullish' : impactSum <= -3 ? 'Bearish' : 'Neutral';
  const topEvents = events
    .slice()
    .sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude))
    .slice(0, 3);

  return (
    <div className="event-timeline">
      <div className="event-summary-grid">
        <div className="pulse-card">
          <div className="pulse-label">Live Market Pulse</div>
          <div className="pulse-value">{sentiment}</div>
          <div className="pulse-sub">{positiveCount} bullish / {negativeCount} bearish signals</div>
        </div>
        <div className="pulse-card">
          <div className="pulse-label">Impact Score</div>
          <div className="pulse-value">{impactSum.toFixed(1)}%</div>
          <div className="pulse-sub">Higher values reflect stronger directional news</div>
        </div>
        <div className="pulse-card">
          <div className="pulse-label">Investor Activity</div>
          <div className="pulse-value">{stock?.volumePct ? `${stock.volumePct}%` : stock?.volume ? fmtV(stock.volume) : 'N/A'}</div>
          <div className="pulse-sub">Relative volume or latest traded size</div>
        </div>
        <div className="pulse-card">
          <div className="pulse-label">Sector Signal</div>
          <div className="pulse-value">{stock?.sector || 'Unknown'}</div>
          <div className="pulse-sub">{stock?.sector ? `${stock.sector} sector dynamics` : 'No sector data'}</div>
        </div>
      </div>

      <div className="signals-list">
        {topEvents.map((evt, i) => (
          <div key={i} className="signal-card">
            <div className="signal-header">
              <span className="signal-tag" style={{ borderColor: EVENT_COLORS[evt.impact] || '#6b7280', color: EVENT_COLORS[evt.impact] || '#6b7280' }}>
                {evt.type?.replace('_', ' ') || 'News'}
              </span>
              <span className={`signal-change ${evt.magnitude >= 0 ? 'text-up' : 'text-down'}`}>
                {evt.magnitude >= 0 ? '+' : ''}{evt.magnitude}%
              </span>
            </div>
            <div className="signal-symbol">{evt.title}</div>
            <div className="signal-company">{new Date(evt.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}</div>
            <div className="signal-price">Impact: {evt.impact || 'medium'} | {evt.magnitude >= 0 ? 'Positive' : 'Negative'}</div>
            <div className="signal-detail">{evt.description}</div>
          </div>
        ))}
      </div>

      {explanation && (
        <div className="explain-summary">
          <div className="explain-trend">
            <span className={`trend-badge ${explanation.totalChange >= 0 ? 'trend-up' : 'trend-down'}`}>
              {explanation.totalChange >= 0 ? '▲' : '▼'} {Math.abs(explanation.totalChange).toFixed(2)}%
            </span>
            <span className="trend-label">{explanation.trend} over this period</span>
          </div>
          {explanation.explanations && explanation.explanations.length > 0 && (
            <div className="explain-reasons">
              {explanation.explanations.map((e, i) => (
                <p key={i} className="explain-reason">💡 {e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <h4 className="timeline-title">Key Market Events</h4>
      <div className="timeline-note">
        <span>Tap an event to expand the news-style cause explanation and see why the share moved up or down.</span>
      </div>
      <div className="timeline-list">
        {events.map((evt, i) => (
          <div
            key={i}
            className={`timeline-event ${expanded === i ? 'timeline-event--open' : ''}`}
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="evt-left">
              <div className="evt-icon">{EVENT_ICONS[evt.type] || '📌'}</div>
              <div className="evt-line" style={{ background: EVENT_COLORS[evt.impact] || '#6b7280' }} />
            </div>
            <div className="evt-body">
              <div className="evt-header">
                <span className="evt-date">{new Date(evt.date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <span className="evt-impact" style={{ color: EVENT_COLORS[evt.impact] || '#6b7280' }}>
                  {evt.magnitude > 0 ? `+${evt.magnitude}` : evt.magnitude}% impact
                </span>
              </div>
              <div className="evt-title">{evt.title}</div>
              <div className={`evt-news-signal ${evt.magnitude >= 0 ? 'evt-up' : 'evt-down'}`}>
                {evt.magnitude >= 4 ? 'Major gain catalyst'
                  : evt.magnitude > 0 ? 'Positive news catalyst'
                  : evt.magnitude <= -4 ? 'Major loss trigger'
                  : 'Negative news catalyst'}
              </div>
              <div className="evt-cause">Cause: {evt.description}</div>
              {expanded === i && (
                <div className="evt-desc">{evt.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StockIntelligenceReport({ stock, explanation, events, range }) {
  const change = explanation?.totalChange ?? stock?.changePercent ?? 0;
  const direction = change >= 0 ? 'increased' : 'decreased';
  const signal = change >= 0 ? 'bullish' : 'bearish';
  const score = explanation?.confidence != null
    ? Math.max(0, Math.min(1, explanation.confidence))
    : Math.max(0.35, Math.min(0.98, 0.35 + Math.min(0.45, Math.abs(change) / 20) + Math.min(0.2, (events?.length || 0) * 0.05)));
  const confidence = `${Math.round(score * 100)}%`;
  const topEvent = events?.slice().sort((a, b) => Math.abs(b.magnitude || 0) - Math.abs(a.magnitude || 0))[0];
  const hasInstitutions = events?.some(evt => /institution|fund|sovereign|bank|investor|portfolio|holding/i.test(`${evt.title} ${evt.description}`));
  const hasAcquisition = events?.some(evt => /acquir|acquisition|merger|buyout|takeover/i.test(`${evt.title} ${evt.description}`));
  const hasRegulatory = events?.some(evt => /regulator|regulatory|court|investigation|compliance|penalty/i.test(`${evt.title} ${evt.description}`));
  const marketCap = stock?.marketCap ? `${fmtV(stock.marketCap)}` : 'Not available';
  const actorLabel = hasInstitutions ? 'Institutional investor activity' : 'Market sentiment';
  const volumeLabel = stock?.volume ? `${fmtV(stock.volume)} traded` : 'Volume not available';
  const changeReason = topEvent ? `${topEvent.title} drove the move.` : `The stock ${direction} due to recent market signals.`;

  const aiSummary = `${stock.symbol} ${direction} ${fmt(Math.abs(change), 2)}% ${change >= 0 ? 'today' : 'recently'} as ${direction === 'increased' ? 'positive momentum' : 'selling pressure'} built around ${topEvent ? topEvent.title.toLowerCase() : 'key news' }. ${hasInstitutions ? 'Institutional flows ' : 'Investor sentiment '} remains ${signal}.`;

  return (
    <div className="intelligence-panel">
      <div className="report-top">
        <div>
          <div className="report-title">AI Intelligence Summary</div>
          <div className="report-subtitle">What happened, why it happened, who caused it, and how it impacted the stock.</div>
        </div>
        <div className="report-badges">
          <span className={`badge ${signal === 'bullish' ? 'badge-green' : 'badge-red'}`}>{signal.toUpperCase()}</span>
          <span className="badge badge-blue">Confidence {confidence}</span>
        </div>
      </div>

      <div className="report-grid">
        <div className="metric-card">
          <div className="metric-label">Why price changed</div>
          <div className="metric-value">{changeReason}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Market cap movement</div>
          <div className="metric-value">{stock?.marketCap ? `${marketCap} ${change >= 0 ? 'expanded' : 'contracted'}` : 'Data unavailable'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Who invested</div>
          <div className="metric-value">{hasInstitutions ? 'Institutions and funds driving flow' : 'Retail and market participants'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">News impact</div>
          <div className="metric-value">{topEvent ? `${topEvent.title} impacted price by ${topEvent.magnitude || 0}%` : 'No headline event found'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Volume spike reason</div>
          <div className="metric-value">{volumeLabel}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Institutional flow</div>
          <div className="metric-value">{hasInstitutions ? 'Buying pressure detected' : 'No clear institutional signal'}</div>
        </div>
      </div>

      <div className="sentiment-meter">
        <div className="meter-label">
          <span>Sentiment</span>
          <strong>{signal}</strong>
        </div>
        <div className="meter-bar">
          <div className="meter-fill" style={{ width: `${Math.min(100, Math.max(20, score * 100))}%`, background: change >= 0 ? 'var(--up)' : 'var(--down)' }} />
        </div>
      </div>

      <div className="report-summary">
        <p>{aiSummary}</p>
        <p>{topEvent ? `Top event: ${topEvent.title}. ${topEvent.description}` : 'This intelligence report is built from market signals and event correlation.'}</p>
      </div>
    </div>
  );
}

// ── AI Explanation Panel ──────────────────────────────────────────────

function MovementExplanation({ symbol, range, stock }) {
  const { explanation, events, loading } = useExplanation(symbol, range);

  if (loading) return <div className="explain-loading">Analyzing price movement…</div>;

  // Build AI-style narrative
  const narratives = [];

  if (explanation) {
    const dir = explanation.totalChange >= 0 ? 'profit' : 'loss';
    narratives.push(
      `${symbol} posted a ${dir} of ${Math.abs(explanation.totalChange).toFixed(2)}% over this period, showing ${explanation.trend}.`
    );
  }

  if (events && events.length > 0) {
    const impactEvents = events.filter(e => Math.abs(e.magnitude) >= 3);
    if (impactEvents.length > 0) {
      const biggest = impactEvents.sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude))[0];
      narratives.push(
        `The most significant market driver was "${biggest.title}" on ${new Date(biggest.date).toLocaleDateString('en-PK', { month: 'long', day: 'numeric', year: 'numeric' })}. ` +
        `That event ${biggest.magnitude > 0 ? 'pushed the price higher' : 'pushed the price lower'} and is the main reason this share is ${biggest.magnitude > 0 ? 'in profit' : 'showing a loss'} for the selected window.`
      );
    }

    const majorLoss = events.filter(e => e.magnitude <= -4).sort((a,b) => a.magnitude - b.magnitude)[0];
    if (majorLoss) {
      narratives.push(
        `A major loss trigger was "${majorLoss.title}" with an estimated ${Math.abs(majorLoss.magnitude)}% impact — this is the largest negative driver in the current period.`
      );
    }

    const majorGain = events.filter(e => e.magnitude >= 4).sort((a,b) => b.magnitude - a.magnitude)[0];
    if (majorGain) {
      narratives.push(
        `A strong profit catalyst was "${majorGain.title}" with about ${majorGain.magnitude}% impact — this helped lift the stock during the period.`
      );
    }

    const policyEvents = events.filter(e => ['monetary_policy', 'imf', 'fiscal_policy'].includes(e.type));
    if (policyEvents.length > 0) {
      narratives.push(
        `Policy and macro events (${policyEvents.map(e => e.title).slice(0,2).join(', ')}) also played a role in the move.`
      );
    }

    const firstEvent = events[0];
    if (firstEvent) {
      narratives.push(`Price movement is connected to the event "${firstEvent.title}", where ${firstEvent.description.toLowerCase()}.`);
    }
  }

  if (stock?.sector) {
    narratives.push(
      `As a ${stock.sector} sector stock, ${symbol} may reflect broader sector dynamics in addition to company-specific factors.`
    );
  }

  narratives.push('Past price behavior does not guarantee future performance. All analysis is probabilistic and for informational purposes only.');

  return (
    <div className="movement-explain">
      <h4 className="explain-heading">📖 Why Did The Price Move?</h4>
      <div className="explain-paragraphs">
        {narratives.map((p, i) => (
          <p key={i} className={`explain-para ${i === narratives.length - 1 ? 'explain-disclaimer' : ''}`}>{p}</p>
        ))}
      </div>
    </div>
  );
}

// ── Stock Detail Modal ────────────────────────────────────────────────

function StockDetailModal({ stock, onClose, getStock }) {
  const [range, setRange]       = useState('1m');
  const [activeTab, setActiveTab] = useState('chart');
  const liveStock = getStock(stock.symbol) || stock;

  const up = liveStock.changePercent >= 0;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const { explanation, events } = useExplanation(stock.symbol, range);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="stock-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-top">
          <div className="modal-stock-id">
            <div className="modal-symbol">{liveStock.symbol}</div>
            <div className="modal-company">{liveStock.companyName}</div>
            {liveStock.sector && <div className="modal-sector">{liveStock.sector}</div>}
          </div>
          <div className="modal-pricing">
            {liveStock.changePercent >= 4 && <span className="hot-stock-badge">HOT STOCK</span>}
            <div className="modal-price">{fmt(liveStock.price)}</div>
            <div className={`modal-change ${up ? 'text-up' : 'text-down'}`}>
              {up ? '▲' : '▼'} {fmt(Math.abs(liveStock.change))} ({up ? '+' : ''}{fmt(liveStock.changePercent)}%)
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Stats bar */}
        <div className="modal-statsbar">
          <div className="mstat"><span>Open</span><b>{fmt(liveStock.open)}</b></div>
          <div className="mstat"><div className="mstat-divider"/>  </div>
          <div className="mstat"><span>High</span><b className="text-up">{fmt(liveStock.high)}</b></div>
          <div className="mstat"><div className="mstat-divider"/>  </div>
          <div className="mstat"><span>Low</span><b className="text-down">{fmt(liveStock.low)}</b></div>
          <div className="mstat"><div className="mstat-divider"/>  </div>
          <div className="mstat"><span>Prev Close</span><b>{fmt(liveStock.ldcp)}</b></div>
          <div className="mstat"><div className="mstat-divider"/>  </div>
          <div className="mstat"><span>Volume</span><b>{fmtV(liveStock.volume)}</b></div>
        </div>

        {/* Tab nav */}
        <div className="modal-tabs">
          <button className={`mtab ${activeTab === 'chart' ? 'mtab--active' : ''}`} onClick={() => setActiveTab('chart')}>📈 Chart</button>
          <button className={`mtab ${activeTab === 'events' ? 'mtab--active' : ''}`} onClick={() => setActiveTab('events')}>📅 Events & Analysis</button>
          <button className={`mtab ${activeTab === 'details' ? 'mtab--active' : ''}`} onClick={() => setActiveTab('details')}>🔍 Details</button>
        </div>

        {/* Time range picker */}
        {activeTab === 'chart' && (
          <div className="modal-range-bar">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r.id}
                className={`range-chip ${range === r.id ? 'range-chip--active' : ''}`}
                onClick={() => setRange(r.id)}
                title={r.desc}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="modal-body">
          {activeTab === 'chart' && (
            <div className="modal-chart-section">
              <ProfessionalChart symbol={liveStock.symbol} range={range} currentPrice={liveStock.price} />
              <MovementExplanation symbol={liveStock.symbol} range={range} stock={liveStock} />
            </div>
          )}

          {activeTab === 'events' && (
            <div className="modal-events-section">
              <div className="modal-range-bar" style={{ marginBottom: 16 }}>
                {RANGE_OPTIONS.map(r => (
                  <button
                    key={r.id}
                    className={`range-chip ${range === r.id ? 'range-chip--active' : ''}`}
                    onClick={() => setRange(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <StockIntelligenceReport stock={liveStock} explanation={explanation} events={events} range={range} />
              <EventTimeline events={events} explanation={explanation} stock={liveStock} />
            </div>
          )}

          {activeTab === 'details' && (
            <div className="modal-details-grid">
              <div className="detail-card">
                <span>Symbol</span><b>{liveStock.symbol}</b>
              </div>
              <div className="detail-card">
                <span>Company</span><b>{liveStock.companyName}</b>
              </div>
              <div className="detail-card">
                <span>Sector</span><b>{liveStock.sector || '—'}</b>
              </div>
              <div className="detail-card">
                <span>Listed In</span>
                <b>{Array.isArray(liveStock.listedIn) && liveStock.listedIn.length ? liveStock.listedIn.join(', ') : '—'}</b>
              </div>
              <div className="detail-card">
                <span>Current Price</span><b className={up ? 'text-up' : 'text-down'}>{fmt(liveStock.price)}</b>
              </div>
              <div className="detail-card">
                <span>Change</span>
                <b className={up ? 'text-up' : 'text-down'}>{up ? '+' : ''}{fmt(liveStock.changePercent)}%</b>
              </div>
              <div className="detail-card">
                <span>Day High</span><b className="text-up">{fmt(liveStock.high)}</b>
              </div>
              <div className="detail-card">
                <span>Day Low</span><b className="text-down">{fmt(liveStock.low)}</b>
              </div>
              <div className="detail-card">
                <span>Open</span><b>{fmt(liveStock.open)}</b>
              </div>
              <div className="detail-card">
                <span>Prev Close</span><b>{fmt(liveStock.ldcp)}</b>
              </div>
              <div className="detail-card">
                <span>Volume</span><b>{fmtV(liveStock.volume)}</b>
              </div>
              <div className="detail-card">
                <span>Data Source</span><b>{liveStock.source || '—'}</b>
              </div>
              <div className="detail-card">
                <span>Last Updated</span>
                <b>{liveStock.timestamp ? new Date(liveStock.timestamp).toLocaleTimeString('en-PK') : '—'}</b>
              </div>
              {liveStock.isETF && <div className="detail-card detail-tag"><span>Type</span><b>ETF</b></div>}
              {liveStock.isDebt && <div className="detail-card detail-tag"><span>Type</span><b>Debt Instrument</b></div>}
              {liveStock.isGEM && <div className="detail-card detail-tag"><span>Market</span><b>GEM Board</b></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────

function Heatmap({ stocks, onClickStock }) {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const treemapData = useMemo(() => {
    const filteredStocks = stocks.filter(s => s.price > 0 && Number.isFinite(s.changePercent));
    const sectors = {};

    filteredStocks.forEach(stock => {
      const sector = (stock.sector || 'OTHER').toUpperCase();
      if (!sectors[sector]) sectors[sector] = [];
      sectors[sector].push(stock);
    });

    return Object.keys(sectors).map(sector => ({
      name: sector,
      stocks: sectors[sector]
    }));
  }, [stocks]);

  const sectorGrids = useMemo(() => {
    return treemapData.map(sectorData => {
      const stocks = sectorData.stocks;
      const numStocks = stocks.length;
      const cols = Math.ceil(Math.sqrt(numStocks)); // approximate square grid
      const rows = Math.ceil(numStocks / cols);
      const tileWidth = dimensions.width / cols;
      const tileHeight = 80; // fixed height for visibility

      return {
        sector: sectorData.name,
        stocks: stocks,
        cols: cols,
        rows: rows,
        tileWidth: tileWidth,
        tileHeight: tileHeight,
        totalHeight: rows * tileHeight
      };
    });
  }, [treemapData, dimensions]);

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const getColor = (pct) => {
    if (pct > 5) return '#0f5132'; // dark green
    if (pct > 2) return '#166534'; // green
    if (pct > 0) return '#16a34a'; // light green
    if (pct === 0) return '#6b7280'; // gray
    if (pct > -2) return '#ea580c'; // orange
    if (pct > -5) return '#dc2626'; // red
    return '#991b1b'; // dark red
  };

  const getTextSize = (width, height) => {
    const size = Math.min(width, height) / 6;
    return Math.max(8, Math.min(24, size));
  };

  return (
    <div className="heatmap-section">
      <div className="heatmap-toolbar">
        <div className="heatmap-title">Sector Grid Heatmap</div>
      </div>
      <div className="heatmap-legend">
        <div className="legend-item"><div className="legend-color" style={{ background: '#16a34a' }}></div><span>Gains</span></div>
        <div className="legend-item"><div className="legend-color" style={{ background: '#dc2626' }}></div><span>Losses</span></div>
        <div className="legend-item"><div className="legend-color" style={{ background: '#6b7280' }}></div><span>Neutral</span></div>
      </div>
      <div className="heatmap-body-treemap">
        {sectorGrids.map((sectorData, idx) => (
          <div key={sectorData.sector} className="sector-section">
            <h3 className="sector-title">{sectorData.sector}</h3>
            <svg width="100%" height={sectorData.totalHeight} style={{ background: '#1a1a1a' }}>
              {sectorData.stocks.map((stock, i) => {
                const col = i % sectorData.cols;
                const row = Math.floor(i / sectorData.cols);
                const x = col * sectorData.tileWidth;
                const y = row * sectorData.tileHeight;
                const width = sectorData.tileWidth;
                const height = sectorData.tileHeight;
                const textSize = Math.min(14, width / 10); // fixed readable size
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={getColor(stock.changePercent)}
                      stroke="#000"
                      strokeWidth="0.5"
                      onClick={() => onClickStock && onClickStock(stock)}
                      style={{ cursor: 'pointer' }}
                    />
                    <text
                      x={x + width / 2}
                      y={y + height / 2 - textSize / 2}
                      textAnchor="middle"
                      fontSize={textSize}
                      fill="#fff"
                      fontWeight="bold"
                    >
                      {stock.symbol}
                    </text>
                    <text
                      x={x + width / 2}
                      y={y + height / 2 + textSize / 2}
                      textAnchor="middle"
                      fontSize={textSize * 0.8}
                      fill="#fff"
                    >
                      {fmt(stock.changePercent)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mover List ────────────────────────────────────────────────────────

function MoverList({ items, label, onClickStock }) {
  return (
    <div className="mover-list">
      <h4 className="mover-title">{label}</h4>
      {items.slice(0, 8).map(s => {
        const up = s.changePercent >= 0;
        return (
          <div key={s.symbol} className="mover-row" onClick={() => onClickStock && onClickStock(s)}>
            <span className="mover-sym">{s.symbol}</span>
            <span className="mover-price">{fmt(s.price)}</span>
            <span className={`mover-pct ${up ? 'text-up' : 'text-down'}`}>
              {up ? '+' : ''}{fmt(s.changePercent)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Stock Row ─────────────────────────────────────────────────────────

const StockRow = memo(function StockRow({ stock, onClick, selected, onAddPortfolio, inPortfolio }) {
  const up = stock.changePercent >= 0;
  return (
    <tr className={`stock-row ${selected ? 'stock-row--selected' : ''}`} onClick={() => onClick(stock)}>
      <td className="col-symbol">
        <div className="sym">{stock.symbol}</div>
        <div className="company-name">{(stock.companyName || '').slice(0, 22)}</div>
      </td>
      <td className="col-price"><PriceCell price={stock.price} /></td>
      <td className={`col-change ${up ? 'text-up' : 'text-down'}`}>{up ? '+' : ''}{fmt(stock.change)}</td>
      <td className={`col-pct ${up ? 'text-up' : 'text-down'}`}>{up ? '+' : ''}{fmt(stock.changePercent)}%</td>
      <td className="col-vol">{fmtV(stock.volume)}</td>
      <td className="col-high">{fmt(stock.high)}</td>
      <td className="col-low">{fmt(stock.low)}</td>
      <td className="col-ldcp">{fmt(stock.ldcp)}</td>
      <td style={{ textAlign: 'center' }}>
        <button className={`add-btn ${inPortfolio ? 'add-btn--update' : ''}`}
          onClick={e => { e.stopPropagation(); onAddPortfolio(stock); }}>
          {inPortfolio ? '✎' : '✚'}
        </button>
      </td>
    </tr>
  );
});

// ── Redesigned Advisor ────────────────────────────────────────────────

function MarketAdvisor({ market, portfolio, onClickStock }) {
  const stocks = useMemo(() => market.stocks.filter(s => s.price > 0 && !s.isDebt), [market.stocks]);

  // Market sentiment metrics
  const totalStocks   = stocks.length;
  const gainers       = stocks.filter(s => s.changePercent > 0).length;
  const losers        = stocks.filter(s => s.changePercent < 0).length;
  const bullishRatio  = totalStocks ? Math.round((gainers / totalStocks) * 100) : 0;
  const avgChange     = totalStocks ? (stocks.reduce((s, x) => s + (x.changePercent || 0), 0) / totalStocks) : 0;
  const sentiment     = avgChange > 1 ? 'Bullish' : avgChange < -1 ? 'Bearish' : 'Neutral';
  const sentimentColor = avgChange > 1 ? '#22c55e' : avgChange < -1 ? '#ef4444' : '#eab308';

  // Top opportunities (signal-based, not BUY/SELL)
  const watchlist = useMemo(() => {
    const items = [];

    // Strong momentum
    stocks.filter(s => s.changePercent > 3 && s.volume > 100000)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 4)
      .forEach(s => items.push({ stock: s, signal: 'MOMENTUM', tag: 'Strong Move', tagColor: '#22c55e', detail: `Up ${fmt(s.changePercent)}% with above-average volume — may indicate institutional interest.` }));

    // Oversold watch
    stocks.filter(s => s.changePercent < -4)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 3)
      .forEach(s => items.push({ stock: s, signal: 'OVERSOLD', tag: 'Pullback Watch', tagColor: '#f59e0b', detail: `Down ${fmt(Math.abs(s.changePercent))}% — may be approaching support. Monitor for reversal signals.` }));

    // Volume surge
    const avgVol = stocks.reduce((s, x) => s + (x.volume || 0), 0) / totalStocks;
    stocks.filter(s => s.volume > avgVol * 3 && Math.abs(s.changePercent) > 1)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3)
      .forEach(s => items.push({ stock: s, signal: 'VOLUME', tag: 'Volume Surge', tagColor: '#3b82f6', detail: `${fmtV(s.volume)} traded — significantly above average. Unusual activity detected.` }));

    return items.slice(0, 10);
  }, [stocks, totalStocks]);

  // Portfolio P/L
  const portfolioMetrics = useMemo(() => {
    if (!portfolio.length) return null;
    let totalValue = 0, totalCost = 0;
    const items = portfolio.map(h => {
      const s = market.getStock(h.symbol);
      if (!s) return null;
      const val = s.price * h.quantity;
      const cost = h.buyPrice * h.quantity;
      totalValue += val; totalCost += cost;
      return { ...h, currentPrice: s.price, value: val, cost, pl: val - cost, plPct: ((s.price / h.buyPrice) - 1) * 100 };
    }).filter(Boolean);
    return { items, totalValue, totalCost, totalPL: totalValue - totalCost, totalPLPct: totalCost > 0 ? ((totalValue / totalCost) - 1) * 100 : 0 };
  }, [portfolio, market.stocks]);

  return (
    <div className="advisor-v2">
      {/* ── Market Pulse ── */}
      <section className="advisor-section">
        <h3 className="advisor-section-title">Market Pulse</h3>
        <div className="pulse-grid">
          <div className="pulse-card">
            <div className="pulse-label">Sentiment</div>
            <div className="pulse-value" style={{ color: sentimentColor }}>{sentiment}</div>
            <div className="pulse-sub">{bullishRatio}% stocks advancing</div>
          </div>
          <div className="pulse-card">
            <div className="pulse-label">Advances</div>
            <div className="pulse-value text-up">{gainers}</div>
            <div className="pulse-sub">of {totalStocks} stocks</div>
          </div>
          <div className="pulse-card">
            <div className="pulse-label">Declines</div>
            <div className="pulse-value text-down">{losers}</div>
            <div className="pulse-sub">of {totalStocks} stocks</div>
          </div>
          <div className="pulse-card">
            <div className="pulse-label">Avg Move</div>
            <div className={`pulse-value ${avgChange >= 0 ? 'text-up' : 'text-down'}`}>
              {avgChange >= 0 ? '+' : ''}{fmt(avgChange)}%
            </div>
            <div className="pulse-sub">Market average</div>
          </div>
        </div>

        {/* Sentiment meter */}
        <div className="sentiment-meter">
          <div className="meter-label">
            <span>Bearish</span>
            <span className="meter-center">{bullishRatio}% Bullish</span>
            <span>Bullish</span>
          </div>
          <div className="meter-bar">
            <div className="meter-fill" style={{ width: `${bullishRatio}%`, background: sentimentColor }} />
          </div>
        </div>
      </section>

      {/* ── Signals to Watch ── */}
      <section className="advisor-section">
        <h3 className="advisor-section-title">Signals to Watch</h3>
        <p className="advisor-note">
          These signals are based on price and volume analysis. They do not constitute financial advice.
          Always conduct your own research before making any investment decisions.
        </p>
        <div className="signals-list">
          {watchlist.map((item, i) => (
            <div key={i} className="signal-card" onClick={() => onClickStock && onClickStock(item.stock)}>
              <div className="signal-header">
                <span className="signal-tag" style={{ background: item.tagColor + '22', color: item.tagColor, borderColor: item.tagColor + '44' }}>
                  {item.tag}
                </span>
                <span className="signal-symbol">{item.stock.symbol}</span>
                <span className={`signal-change ${item.stock.changePercent >= 0 ? 'text-up' : 'text-down'}`}>
                  {item.stock.changePercent >= 0 ? '+' : ''}{fmt(item.stock.changePercent)}%
                </span>
              </div>
              <div className="signal-company">{(item.stock.companyName || '').slice(0, 35)}</div>
              <div className="signal-price">{fmt(item.stock.price)} · Vol: {fmtV(item.stock.volume)}</div>
              <div className="signal-detail">{item.detail}</div>
            </div>
          ))}
          {watchlist.length === 0 && (
            <div className="advisor-empty">
              <p>Market data loading. Signals will appear shortly.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Portfolio Review ── */}
      {portfolioMetrics && (
        <section className="advisor-section">
          <h3 className="advisor-section-title">Portfolio Overview</h3>
          <div className="port-summary">
            <div className="port-metric">
              <span>Current Value</span><b>{fmtI(portfolioMetrics.totalValue)}</b>
            </div>
            <div className="port-metric">
              <span>Total Cost</span><b>{fmtI(portfolioMetrics.totalCost)}</b>
            </div>
            <div className={`port-metric ${portfolioMetrics.totalPL >= 0 ? 'metric-profit' : 'metric-loss'}`}>
              <span>Unrealized P/L</span>
              <b>{portfolioMetrics.totalPL >= 0 ? '+' : ''}{fmtI(portfolioMetrics.totalPL)} ({fmt(portfolioMetrics.totalPLPct)}%)</b>
            </div>
          </div>
          <div className="port-items">
            {portfolioMetrics.items.map(h => (
              <div key={h.symbol} className={`port-item ${h.pl >= 0 ? 'port-profit' : 'port-loss'}`} onClick={() => onClickStock && onClickStock(market.getStock(h.symbol))}>
                <div className="port-sym">{h.symbol}</div>
                <div className="port-qty">{h.quantity} @ {fmt(h.buyPrice)}</div>
                <div className="port-current">{fmt(h.currentPrice)}</div>
                <div className={`port-pl ${h.pl >= 0 ? 'text-up' : 'text-down'}`}>
                  {h.pl >= 0 ? '+' : ''}{fmt(h.plPct)}%
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Disclaimer ── */}
      <div className="advisor-disclaimer">
        <p>⚠️ <b>Disclaimer:</b> All analysis is for informational purposes only. Nothing on this platform constitutes financial advice, a recommendation to buy or sell any security, or a guarantee of any outcome. Past market behavior does not predict future results. Always consult a licensed financial advisor before making investment decisions.</p>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────

export default function App() {
  const market = useMarketData();

  const [tab,           setTab]          = useState('Market');
  const [search,        setSearch]       = useState('');
  const [sortField,     setSortField]    = useState('changePercent');
  const [sortDir,       setSortDir]      = useState('desc');
  const [selectedStock, setSelectedStock] = useState(null);
  const [indexFilter,   setIndexFilter]  = useState('ALL'); // 'ALL', 'KSE-30', 'KSE-100'
  const [portfolio,     setPortfolio]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('psx-portfolio') || '[]'); } catch { return []; }
  });
  const [formState,  setFormState]  = useState(null);
  const [showModal,  setShowModal]  = useState(false);

  const openModal = useCallback((stock) => {
    setSelectedStock(stock);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedStock(null);
  }, []);

  const openAddForm = useCallback((stock) => {
    setFormState({ stock, qty: '1', buyPrice: String(stock.price), show: true });
  }, []);

  const submitPortfolio = () => {
    if (!formState) return;
    const qty = parseFloat(formState.qty);
    const bp  = parseFloat(formState.buyPrice);
    if (!qty || !bp || qty <= 0 || bp <= 0) return;
    const holding = { symbol: formState.stock.symbol, quantity: qty, buyPrice: bp, dateAdded: new Date().toISOString() };
    setPortfolio(prev => {
      const updated = [...prev.filter(h => h.symbol !== holding.symbol), holding];
      localStorage.setItem('psx-portfolio', JSON.stringify(updated));
      return updated;
    });
    setFormState(null);
  };

  const removeFromPortfolio = (symbol) => {
    if (!window.confirm(`Remove ${symbol}?`)) return;
    setPortfolio(prev => {
      const updated = prev.filter(h => h.symbol !== symbol);
      localStorage.setItem('psx-portfolio', JSON.stringify(updated));
      return updated;
    });
  };

  const filteredStocks = useMemo(() => {
    let list = market.stocks.filter(s => s.price > 0 && !s.isDebt);
    
    // Apply index filter
    if (indexFilter === 'KSE-100') {
      list = list.filter(s => s.listedIn?.includes('KSE100'));
    } else if (indexFilter === 'KSE-30') {
      list = list.filter(s => s.listedIn?.includes('KSE30'));
    }
    
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || (s.companyName || '').toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const av = a[sortField] ?? 0; const bv = b[sortField] ?? 0;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [market.stocks, search, sortField, sortDir, indexFilter]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const sortIcon = (f) => sortField === f ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">PSX<span className="logo-pro"> PRO</span></span>
          <LiveDot active={market.connected} />
          <MarketStatusBadge status={market.marketStatus} />
        </div>
        <div className="header-indices">
          <IndexCard index={market.kse100} label="KSE-100" />
          <IndexCard index={market.kse30}  label="KSE-30" />
        </div>
        <div className="header-right">
          <span className="header-stats">
            {market.stocks.length} stocks
            {market.lastUpdate ? ` · ${new Date(market.lastUpdate).toLocaleTimeString('en-PK')}` : ''}
          </span>
        </div>
      </header>

      {/* Ticker */}
      <TickerTape stocks={market.stocks} />

      {/* Tabs */}
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'tab-btn--active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
        <div className="kse-filter">
          <button
            className={`kse-btn ${indexFilter === 'ALL' ? 'kse-btn--active' : ''}`}
            onClick={() => setIndexFilter('ALL')}
            title="Show all stocks"
          >
            All Stocks
          </button>
          <button
            className={`kse-btn ${indexFilter === 'KSE-30' ? 'kse-btn--active' : ''}`}
            onClick={() => setIndexFilter('KSE-30')}
            title="Show KSE-30 index stocks only"
          >
            KSE-30
          </button>
          <button
            className={`kse-btn ${indexFilter === 'KSE-100' ? 'kse-btn--active' : ''}`}
            onClick={() => setIndexFilter('KSE-100')}
            title="Show KSE-100 index stocks only"
          >
            KSE-100
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="main-content">
        <div className="panel">

          {tab === 'Market' && (
            <>
              <div className="toolbar">
                <input className="search-input" placeholder="Search symbol or company…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                <span className="result-count">{filteredStocks.length} results</span>
              </div>
              <div className="table-wrap">
                <table className="market-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('symbol')}>Symbol{sortIcon('symbol')}</th>
                      <th onClick={() => handleSort('price')}>Current Price{sortIcon('price')}</th>
                      <th onClick={() => handleSort('change')}>Change{sortIcon('change')}</th>
                      <th onClick={() => handleSort('changePercent')}>Change %{sortIcon('changePercent')}</th>
                      <th onClick={() => handleSort('volume')}>Volume{sortIcon('volume')}</th>
                      <th onClick={() => handleSort('high')}>High{sortIcon('high')}</th>
                      <th onClick={() => handleSort('low')}>Low{sortIcon('low')}</th>
                      <th>Prev Close</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map(s => (
                      <StockRow key={s.symbol} stock={s} onClick={openModal}
                        selected={selectedStock?.symbol === s.symbol}
                        onAddPortfolio={openAddForm}
                        inPortfolio={portfolio.some(h => h.symbol === s.symbol)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'Gainers/Losers' && (
            <div className="movers-grid">
              <MoverList items={market.gainers} label="🚀 Top Gainers" onClickStock={openModal} />
              <MoverList items={market.losers}  label="📉 Top Losers"  onClickStock={openModal} />
              <MoverList items={market.active}  label="🔥 Most Active" onClickStock={openModal} />
            </div>
          )}

          {tab === 'Heatmap' && (
            <div className="heatmap-wrap">
              <Heatmap stocks={market.stocks} onClickStock={openModal} />
            </div>
          )}

          {tab === 'Portfolio' && (
            <div className="portfolio-tab">
              <div className="portfolio-header">
                <h3 className="section-title">📊 My Portfolio</h3>
                <button className="btn-add-stock" onClick={() => setTab('Market')}>＋ Add Stock</button>
              </div>
              {portfolio.length === 0 ? (
                <div className="portfolio-empty">
                  <div className="empty-icon">📈</div>
                  <p>No stocks in portfolio yet</p>
                  <small>Go to Market tab and click ✚ to add stocks</small>
                </div>
              ) : (
                <>
                  {(() => {
                    const tv = portfolio.reduce((s, h) => { const st = market.getStock(h.symbol); return s + (st ? st.price * h.quantity : 0); }, 0);
                    const tc = portfolio.reduce((s, h) => s + h.buyPrice * h.quantity, 0);
                    const pl = tv - tc;
                    return (
                      <div className="portfolio-stats">
                        <div className="stat-card"><span className="stat-label">Total Value</span><span className="stat-value">{fmtI(tv)}</span></div>
                        <div className="stat-card"><span className="stat-label">Total Cost</span><span className="stat-value">{fmtI(tc)}</span></div>
                        <div className={`stat-card ${pl >= 0 ? 'stat-profit' : 'stat-loss'}`}>
                          <span className="stat-label">Unrealized P/L</span>
                          <span className="stat-value">{pl >= 0 ? '+' : ''}{fmtI(pl)}</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="portfolio-list">
                    {portfolio.map(h => {
                      const stock = market.getStock(h.symbol);
                      if (!stock) return null;
                      const val = stock.price * h.quantity;
                      const cost = h.buyPrice * h.quantity;
                      const pl = val - cost;
                      const plPct = ((stock.price / h.buyPrice) - 1) * 100;
                      return (
                        <div key={h.symbol} className={`portfolio-item ${pl >= 0 ? 'item-profit' : 'item-loss'}`} onClick={() => openModal(stock)}>
                          <div className="item-left">
                            <div className="item-symbol">{h.symbol}</div>
                            <div className="item-company">{(stock.companyName || '').slice(0, 18)}</div>
                          </div>
                          <div className="item-middle">
                            <div className="item-row"><span>Qty</span><b>{h.quantity}</b></div>
                            <div className="item-row"><span>Avg Cost</span><b>{fmt(h.buyPrice)}</b></div>
                            <div className="item-row"><span>Current</span><b className={pl >= 0 ? 'text-up' : 'text-down'}>{fmt(stock.price)}</b></div>
                          </div>
                          <div className="item-right">
                            <div className="item-value">{fmtI(val)}</div>
                            <div className={`item-pl ${pl >= 0 ? 'text-up' : 'text-down'}`}>{pl >= 0 ? '+' : ''}{fmtI(Math.abs(pl))}</div>
                            <div className={`item-pct ${pl >= 0 ? 'text-up' : 'text-down'}`}>{pl >= 0 ? '+' : ''}{fmt(plPct)}%</div>
                          </div>
                          <div className="item-actions" onClick={e => e.stopPropagation()}>
                            <button className="btn-edit" onClick={() => openAddForm(stock)}>✎</button>
                            <button className="btn-delete" onClick={() => removeFromPortfolio(h.symbol)}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'Advisor' && (
            <MarketAdvisor market={market} portfolio={portfolio} onClickStock={openModal} />
          )}
        </div>
      </main>

      {/* Stock Detail Modal */}
      {showModal && selectedStock && (
        <StockDetailModal stock={selectedStock} onClose={closeModal} getStock={market.getStock} />
      )}

      {/* Add to Portfolio Form */}
      {formState?.show && (
        <div className="modal-overlay" onClick={() => setFormState(null)}>
          <div className="modal-form" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{formState.stock.symbol} — Add to Portfolio</h3>
              <button className="modal-close" onClick={() => setFormState(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <div className="form-group">
                <label>Current Price</label>
                <div className="price-display">{fmt(formState.stock.price)}</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input type="number" min="1" step="1" className="form-input" value={formState.qty}
                    onChange={e => setFormState(s => ({ ...s, qty: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Buy Price *</label>
                  <input type="number" min="0.01" step="0.01" className="form-input" value={formState.buyPrice}
                    onChange={e => setFormState(s => ({ ...s, buyPrice: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setFormState(null)}>Cancel</button>
              <button className="btn-submit" onClick={submitPortfolio}>Add to Portfolio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
