import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import './AIPortfolio.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const API_PATH = API_BASE ? `${API_BASE}/api` : '/api';
const RISK_OPTIONS = ['conservative', 'moderate', 'aggressive'];
const GOAL_OPTIONS = ['growth', 'dividend', 'balanced', 'low risk'];
const STOCK_COUNTS = [5, 10, 15, 20];
const COLOR_SET = ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#fb7185'];

function displayLabel(value) {
  return String(value)
    .replace(/-/g, ' ')
    .replace(/\b([a-z])/g, (_, char) => char.toUpperCase());
}

function currency(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `PKR ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
    : '—';
}

function percent(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(1)}%`
    : '—';
}

function parseChatPrompt(text) {
  const raw = String(text || '');
  const normalized = raw.toLowerCase();
  const amountMatch = normalized.match(/(\d{1,3}(?:[\s,]\d{3})*(?:\.\d+)?)(?=\s*(?:pkr|rs|rupees|rupee|pk\.? )?)/);
  const countMatch = normalized.match(/(\d+)\s*(?:stocks|stock|shares|symbols|positions)/);
  const riskMatch = normalized.match(/\b(conservative|moderate|aggressive)\b/);
  const goalMatch = normalized.match(/\b(growth|dividend|balanced|low risk|low-risk|lowrisk|profit)\b/);
  const symbolMatches = Array.from(new Set((raw.toUpperCase().match(/\b[A-Z]{2,5}\b/g) || [])));
  const excluded = new Set(['BUY','SELL','TODAY','SHOULD','WHAT','MAKE','BUILD','ME','INVEST','INTO','FOR','WITH','AND','ABOUT','PORTFOLIO','STOCK','STOCKS','DIVIDEND','GROWTH','BALANCED','LOW','RISK','HIGH','MEDIUM','PKR','RS','RUPEES','RUPEE']);
  const symbols = symbolMatches.filter(symbol => !excluded.has(symbol));

  let amount = amountMatch ? Number(amountMatch[1].replace(/[\s,]/g, '')) : null;
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) amount = null;

  let goal = goalMatch?.[1] || 'balanced';
  if (goal === 'low-risk' || goal === 'lowrisk') goal = 'low risk';
  if (goal === 'profit') goal = 'growth';

  return {
    amount,
    count: symbols.length ? Math.min(20, symbols.length) : (countMatch ? Math.min(20, Math.max(1, Number(countMatch[1]))) : null),
    risk: riskMatch ? riskMatch[1] : null,
    goal,
    symbols,
  };
}

function buildTimeline(liveAllocation) {
  if (!liveAllocation) return [];
  const start = liveAllocation.totalAllocated || 0;
  const current = liveAllocation.totalCurrentValue || start;
  const change = current - start;
  return [
    { label: 'Start', value: Number(start.toFixed(2)) },
    { label: 'Morning', value: Number((start + change * 0.28).toFixed(2)) },
    { label: 'Midday', value: Number((start + change * 0.58).toFixed(2)) },
    { label: 'Now', value: Number(current.toFixed(2)) },
  ];
}

function calculateHealthScore(summary) {
  if (!summary) return 0;
  const diversification = summary.diversification ?? 50;
  const risk = summary.risk ?? 50;
  const volatility = summary.volatility ?? 50;
  const pnlPct = summary.pnlPct || 0;
  const base = diversification * 0.35 + (100 - risk) * 0.25 + (100 - volatility) * 0.25 + Math.min(10, Math.max(-10, pnlPct * 0.1));
  return Number(Math.max(12, Math.min(98, base)).toFixed(0));
}

function AIPortfolio({ market, demoMode }) {
  const [amount, setAmount] = useState(15000);
  const [count, setCount] = useState(5);
  const [risk, setRisk] = useState('moderate');
  const [goal, setGoal] = useState('balanced');
  const [allocation, setAllocation] = useState(null);
  const [liveAllocation, setLiveAllocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [sampleSymbols, setSampleSymbols] = useState([]);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState(null);
  const [beginnerMode, setBeginnerMode] = useState(true);
  const [chatPrompt, setChatPrompt] = useState('Build a balanced PSX portfolio with 10,000 PKR.');
  const [assistantNote, setAssistantNote] = useState('Enter a simple portfolio request and the AI will translate it into a live allocation.');
  const [assistantError, setAssistantError] = useState(null);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(null);

  const fetchSampleSymbols = useCallback(async () => {
    setSampleLoading(true);
    setSampleError(null);
    try {
      const res = await fetch(`${API_PATH}/ai-portfolio/samples`);
      if (!res.ok) throw new Error('Failed to load sample symbols');
      const data = await res.json();
      setSampleSymbols(Array.isArray(data.symbols) ? data.symbols.slice(0, 12) : []);
    } catch (err) {
      setSampleError(err.message || 'Unable to fetch sample symbols');
    } finally {
      setSampleLoading(false);
    }
  }, []);

  const fetchPortfolio = useCallback(async (overrides) => {
    setLoading(true);
    setError(null);
    setAssistantError(null);
    try {
      const request = {
        amount: overrides?.amount ?? amount,
        count: overrides?.count ?? count,
        risk: overrides?.risk ?? risk,
        goal: overrides?.goal ?? goal,
        symbols: overrides?.symbols || undefined,
      };
      if (overrides) {
        setAmount(request.amount);
        setCount(request.count);
        setRisk(request.risk);
        setGoal(request.goal);
      }
      const res = await fetch(`${API_PATH}/ai-portfolio/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Allocation failed');
      }
      const data = await res.json();
      setAllocation(data);
      setSubmitted(true);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to allocate portfolio');
    } finally {
      setLoading(false);
    }
  }, [amount, count, risk, goal]);

  const fetchInsight = useCallback(async (symbols) => {
    setInsightLoading(true);
    setInsightError(null);
    try {
      const response = await fetch(`${API_PATH}/portfolio/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: Array.isArray(symbols) ? symbols.slice(0, 20) : [] }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch AI insight');
      }
      const data = await response.json();
      setInsight(data.insight || null);
    } catch (err) {
      setInsightError(err.message || 'Unable to generate AI insight');
      setInsight(null);
    } finally {
      setInsightLoading(false);
    }
  }, []);

  const updateLiveAllocation = useCallback(() => {
    if (!allocation || !Array.isArray(allocation.allocations)) return;
    const items = allocation.allocations.map(item => {
      const stock = market.getStock(item.symbol);
      const currentPrice = stock?.price || item.price;
      const currentValue = Number((currentPrice * item.shares).toFixed(2));
      const changeValue = Number((currentValue - item.allocated).toFixed(2));
      const changePct = item.allocated > 0 ? Number(((changeValue / item.allocated) * 100).toFixed(2)) : 0;
      return {
        ...item,
        currentPrice,
        currentValue,
        currentPL: changeValue,
        currentPLPct: changePct,
        currentWeight: allocation.totalAllocated ? Number(((currentValue / allocation.totalAllocated) * 100).toFixed(1)) : 0,
      };
    });

    const totalCurrentValue = Number(items.reduce((sum, item) => sum + item.currentValue, 0).toFixed(2));
    const totalPL = Number(items.reduce((sum, item) => sum + item.currentPL, 0).toFixed(2));
    const totalPLPct = allocation.totalAllocated ? Number(((totalPL / allocation.totalAllocated) * 100).toFixed(2)) : 0;

    setLiveAllocation({
      ...allocation,
      allocations: items,
      totalCurrentValue,
      totalPL,
      totalPLPct,
      refreshTime: new Date().toISOString(),
    });
  }, [allocation, market]);

  const handleChatSubmit = async (event) => {
    event?.preventDefault();
    const parsed = parseChatPrompt(chatPrompt);
    if (!parsed) {
      setAssistantError('I could not understand that phrase. Try: “Build a balanced portfolio for 10,000 PKR.”');
      return;
    }
    const request = {
      amount: parsed.amount ?? amount,
      count: parsed.count ?? count,
      risk: parsed.risk ?? risk,
      goal: parsed.goal ?? goal,
      symbols: parsed.symbols,
    };
    setAssistantError(null);
    setAssistantNote(`Creating ${displayLabel(request.risk)} ${displayLabel(request.goal)} allocation for ${currency(request.amount)}.`);
    await fetchPortfolio(request);
  };
  useEffect(() => {
    fetchSampleSymbols();
  }, [fetchSampleSymbols]);

  useEffect(() => {
    if (allocation) {
      updateLiveAllocation();
      const timer = setInterval(updateLiveAllocation, 120000);
      return () => clearInterval(timer);
    }
    setLiveAllocation(null);
    return undefined;
  }, [allocation, updateLiveAllocation]);

  useEffect(() => {
    if (allocation && market?.version != null) {
      updateLiveAllocation();
    }
  }, [allocation, market?.version, updateLiveAllocation]);

  useEffect(() => {
    if (allocation?.allocations?.length) {
      fetchInsight(allocation.allocations.map(item => item.symbol));
    } else {
      setInsight(null);
      setInsightError(null);
    }
  }, [allocation, fetchInsight]);

  const dataSource = liveAllocation || allocation;

  const summary = useMemo(() => {
    if (!dataSource) return null;
    return {
      invested: dataSource.amount,
      allocated: dataSource.totalAllocated,
      remainingBalance: dataSource.remainingBalance ?? 0,
      currentValue: dataSource.totalCurrentValue || dataSource.totalAllocated,
      pnl: dataSource.totalPL || 0,
      pnlPct: dataSource.totalPLPct || 0,
      diversification: dataSource.diversificationScore,
      risk: dataSource.riskScore,
      volatility: dataSource.volatilityScore,
      health: calculateHealthScore(dataSource),
      sectors: dataSource.sectorExposure || [],
      projection: dataSource.projectionRange || {},
      dividendEstimate: dataSource.allocations ? Number(dataSource.allocations.reduce((sum, item) => sum + (item.allocated * (item.dividendYield || 0) / 100), 0).toFixed(0)) : 0,
    };
  }, [dataSource]);

  const performanceChart = useMemo(() => {
    if (!allocation) return [];
    return [
      { label: 'Current', value: liveAllocation?.totalCurrentValue || allocation.totalAllocated },
      { label: 'Expected', value: allocation.projected.expected },
      { label: 'Best', value: allocation.projected.best },
      { label: 'Stress', value: allocation.projected.risk },
    ];
  }, [allocation, liveAllocation]);

  const allocationData = useMemo(() => {
    if (!liveAllocation) return [];
    return liveAllocation.allocations.map((item, index) => ({ name: item.symbol, value: item.currentValue, color: COLOR_SET[index % COLOR_SET.length] }));
  }, [liveAllocation]);

  const sectorData = useMemo(() => {
    if (!allocation || !allocation.sectorExposure) return [];
    return allocation.sectorExposure.map((item, index) => ({ name: item.sector, value: item.value, pct: item.pct, color: COLOR_SET[index % COLOR_SET.length] }));
  }, [allocation]);

  const profitTimeline = useMemo(() => buildTimeline(liveAllocation), [liveAllocation]);

  const topGainers = useMemo(() => {
    if (!liveAllocation) return [];
    return [...liveAllocation.allocations]
      .sort((a, b) => b.currentPLPct - a.currentPLPct)
      .slice(0, 5);
  }, [liveAllocation]);

  const topLosers = useMemo(() => {
    if (!liveAllocation) return [];
    return [...liveAllocation.allocations]
      .sort((a, b) => a.currentPLPct - b.currentPLPct)
      .slice(0, 5);
  }, [liveAllocation]);

  const bestStock = useMemo(() => {
    if (!liveAllocation?.allocations?.length) return null;
    return [...liveAllocation.allocations].sort((a, b) => b.currentPLPct - a.currentPLPct)[0];
  }, [liveAllocation]);

  const worstStock = useMemo(() => {
    if (!liveAllocation?.allocations?.length) return null;
    return [...liveAllocation.allocations].sort((a, b) => a.currentPLPct - b.currentPLPct)[0];
  }, [liveAllocation]);

  const rebalanceSuggestion = useMemo(() => {
    if (!allocation) return 'The portfolio is ready to review once generated.';
    const overweightSector = allocation.sectorExposure?.find(item => item.pct >= 45);
    if (overweightSector) {
      return `Consider trimming exposure to ${overweightSector.sector} to improve diversification.`;
    }
    const topWeight = allocation.allocations?.reduce((max, item) => Math.max(max, item.targetRatio || 0), 0) || 0;
    if (topWeight > 28) {
      return `Keep a close watch on the largest position. Rebalance if any stock exceeds ${topWeight.toFixed(0)}% of the portfolio.`;
    }
    return 'This allocation is broadly diversified and aligned with your selected goal.';
  }, [allocation]);

  const explanation = useMemo(() => {
    if (insight?.sections) {
      const sections = insight.sections;
      return {
        headline: sections.happening || `AI analysis for your ${displayLabel(goal)} portfolio.`,
        details: [
          sections.why,
          sections.risk,
          sections.context,
          sections.caution,
        ].filter(Boolean),
      };
    }

    if (!dataSource || !allocation) return null;
    const topSector = allocation.sectorExposure?.[0]?.sector || 'diversified sectors';
    const topHoldings = (liveAllocation?.allocations || allocation.allocations || []).slice(0, 3).map(item => item.symbol).join(', ');
    if (beginnerMode) {
      return {
        headline: `Your AI portfolio is built for ${displayLabel(goal)} using ${displayLabel(risk)} risk settings.`,
        details: [
          `It uses live PSX price and volume data to choose ${count} stocks with momentum and financial strength.`,
          `The portfolio is weighted toward ${topSector} while keeping exposure balanced across strong sectors.`,
          `Top holdings include ${topHoldings}. Prices update automatically with market ticks.`,
          `All results are analytical estimates for education only, not financial advice.`,
        ],
      };
    }
    return {
      headline: `This portfolio blends momentum, volatility discipline, and sector strength for a ${displayLabel(goal)} objective.`,
      details: [
        `Selected stocks reflect real-time PSX momentum, volume, and dividend signals.`,
        `Sector bias is concentrated in ${topSector} while maintaining diversification across ${allocation.sectorExposure?.length || 0} sectors.`,
        `Current performance is refreshed automatically with the live market feed every 2 minutes.`,
        `Treat the allocation as a data-driven guide, not a guarantee.`,
      ],
    };
  }, [allocation, liveAllocation, goal, risk, count, beginnerMode, insight]);

  return (
    <div className="ai-portfolio">
      <div className="ai-hero">
        <div className="hero-copy">
          <span className="hero-badge">AI Smart Portfolio</span>
          <h3>AI-powered PSX allocation with premium clarity</h3>
          <p>
            Build a live intelligent portfolio using PSX market signals, sector momentum, volatility, and dividend estimates. The experience is designed for both beginners and active investors.
          </p>
          {demoMode && (
            <div className="demo-note">
              You are in demo mode. All allocations and value updates are simulated for learning and exploration only.
            </div>
          )}
          <div className="hero-notes">
            <span>Light theme, premium spacing, and institutional charts.</span>
            <span>Live portfolio value updates automatically every 2 minutes.</span>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-card-header">
            <div>
              <strong>Beginner Mode</strong>
              <p>Toggle simplified explanation language and guided prompts.</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={beginnerMode} onChange={() => setBeginnerMode(v => !v)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="hero-stats">
            <div>
              <span>Total investment</span>
              <strong>{currency(amount)}</strong>
            </div>
            <div>
              <span>Target stocks</span>
              <strong>{count}</strong>
            </div>
          </div>
          <div className="hero-footer">
            <span>Interactive AI guidance</span>
            <strong>{displayLabel(risk)} · {displayLabel(goal)}</strong>
          </div>
        </div>
      </div>

      <section className="ai-panel ai-chat-panel">
        <div className="panel-header">
          <div>
            <h4>Ask the AI</h4>
            <p>Use plain language to create a portfolio from your goals.</p>
          </div>
          <span className="pill">Chat-driven allocation</span>
        </div>
        <form className="chat-form" onSubmit={handleChatSubmit}>
          <textarea
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit();
              }
            }}
            placeholder="I have 50,000 PKR. Build a conservative dividend portfolio with 10 stocks."
          />
          <div className="chat-actions">
            <div className="quick-prompts">
              {['Create a growth portfolio for 15,000 PKR', 'Build a balanced portfolio with 5 stocks', 'Aggressive dividend strategy for 20,000 PKR'].map((text) => (
                <button key={text} type="button" className="prompt-chip" onClick={() => setChatPrompt(text)}>{text}</button>
              ))}
            </div>
            <button className="btn-action" type="submit" disabled={loading}>{loading ? 'Generating...' : 'Ask the AI'}</button>
          </div>
          {assistantError ? <div className="ai-error">{assistantError}</div> : <div className="assistant-note">{assistantNote}</div>}
        </form>
      </section>

      <div className="ai-layout">
        <section className="ai-panel ai-controls">
          <div className="panel-header">
            <div>
              <h4>Portfolio Inputs</h4>
              <p>Choose your capital, risk, and objective.</p>
            </div>
            <span className="pill pill-soft">Live market data</span>
          </div>
          <div className="ai-form-grid">
            <label className="field-group">
              <span>Total Investment</span>
              <input
                type="number"
                min="1000"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="field-input"
              />
            </label>
            <label className="field-group">
              <span>Number of Stocks</span>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="field-input">
                {STOCK_COUNTS.map((n) => <option key={n} value={n}>{n} stocks</option>)}
              </select>
            </label>
            <label className="field-group">
              <span>Risk Preference</span>
              <select value={risk} onChange={(e) => setRisk(e.target.value)} className="field-input">
                {RISK_OPTIONS.map((option) => <option key={option} value={option}>{displayLabel(option)}</option>)}
              </select>
            </label>
            <label className="field-group">
              <span>Investment Goal</span>
              <select value={goal} onChange={(e) => setGoal(e.target.value)} className="field-input">
                {GOAL_OPTIONS.map((option) => <option key={option} value={option}>{displayLabel(option)}</option>)}
              </select>
            </label>
          </div>
          {error && <div className="ai-error">{error}</div>}
          <button className="btn-action" type="button" onClick={() => fetchPortfolio()} disabled={loading}>{loading ? 'Generating portfolio…' : 'Generate AI Portfolio'}</button>
          <div className="ai-tip">The portfolio engine allocates capital across PSX symbols using volatility, trend momentum, sector breadth, and dividend strength.</div>
          <div className="sample-list">
            <strong>Live market suggestions:</strong>
            <div className="sample-tokens">
              {sampleLoading ? 'Loading...' : sampleSymbols.map(symbol => <span key={symbol} className="sample-token">{symbol}</span>)}
            </div>
            {sampleError && <div className="ai-error">{sampleError}</div>}
          </div>
        </section>

        <section className="ai-panel ai-snapshot-panel">
          <div className="panel-header">
            <div>
              <h4>Snapshot</h4>
              <p>Real-time value, health, and expected range.</p>
            </div>
          </div>
          <div className="snapshot-grid">
            <div className="snapshot-card">
              <span>Total Portfolio Value</span>
              <strong>{currency(summary?.currentValue)}</strong>
            </div>
            <div className="snapshot-card">
              <span>Today’s P/L</span>
              <strong className={summary?.pnl >= 0 ? 'text-up' : 'text-down'}>{summary?.pnl >= 0 ? '+' : ''}{currency(summary?.pnl)} ({percent(summary?.pnlPct)})</strong>
            </div>
            <div className="snapshot-card">
              <span>Best Performing Stock</span>
              <strong>{bestStock?.symbol ?? '—'}</strong>
            </div>
            <div className="snapshot-card">
              <span>Worst Performing Stock</span>
              <strong>{worstStock?.symbol ?? '—'}</strong>
            </div>
            <div className="snapshot-card">
              <span>Risk Score</span>
              <strong>{summary?.risk ?? '—'}/100</strong>
            </div>
            <div className="snapshot-card">
              <span>Diversification</span>
              <strong>{summary?.diversification ?? '—'}%</strong>
            </div>
            <div className="snapshot-card">
              <span>Remaining Cash</span>
              <strong>{currency(summary?.remainingBalance)}</strong>
            </div>
          </div>
          <div className="health-strip">
            <span>Portfolio Health</span>
            <div className="health-meter">
              <div className="health-fill" style={{ width: `${summary?.health ?? 0}%` }} />
            </div>
            <strong>{summary?.health ?? 0}/100</strong>
          </div>
        </section>
      </div>

      {submitted && allocation && (
        <section className="ai-results">
          <div className="ai-results-grid">
            <div className="chart-card chart-card--large">
              <div className="card-header">
                <div>
                  <h4>Portfolio Growth</h4>
                  <p>Live value compared to expected outcomes.</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={performanceChart} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip wrapperStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: '#2563eb' }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card chart-card--stacked">
              <div className="card-header">
                <div>
                  <h4>Allocation Overview</h4>
                  <p>Stock and sector exposure in one premium view.</p>
                </div>
              </div>
              <div className="pie-pair">
                <div className="pie-element">
                  <h5>By stock</h5>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>
                        {allocationData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip wrapperStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="pie-element">
                  <h5>By sector</h5>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={sectorData} dataKey="value" nameKey="name" innerRadius={46} outerRadius={76} paddingAngle={3}>
                        {sectorData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip wrapperStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="legend-grid">
                {sectorData.map((item) => (
                  <div key={item.name} className="legend-item">
                    <span className="legend-dot" style={{ background: item.color }} />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{percent(item.pct)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card chart-card--medium">
              <div className="card-header">
                <div>
                  <h4>Profit / Loss Timeline</h4>
                  <p>Estimated intraday path from allocation to current value.</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={profitTimeline} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip wrapperStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="#16a34a" fill="url(#profitGradient)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="info-panel">
              <div className="info-block">
                <span>Dividend estimate</span>
                <strong>{currency(summary?.dividendEstimate)}</strong>
                <p>Projected annual income based on current yields.</p>
              </div>
              <div className="info-block">
                <span>Rebalance suggestion</span>
                <strong>{rebalanceSuggestion}</strong>
              </div>
              <div className="info-block">
                <span>Top gainers</span>
                <strong>{bestStock?.symbol ?? '—'}</strong>
              </div>
              <div className="info-block">
                <span>Top loser</span>
                <strong>{worstStock?.symbol ?? '—'}</strong>
              </div>
            </div>
          </div>

          <div className="allocation-grid">
            <section className="allocation-card">
              <div className="panel-header">
                <div>
                  <h4>Allocation Breakdown</h4>
                  <p>Shares, current value, and real-time profit/loss.</p>
                </div>
                <button className="btn-action btn-action--secondary" type="button" onClick={updateLiveAllocation}>Refresh prices</button>
              </div>
              <div className="allocation-table">
                <div className="allocation-row allocation-head">
                  <span>Symbol</span>
                  <span>Price</span>
                  <span>Shares</span>
                  <span>Allocated</span>
                  <span>Current</span>
                  <span>P/L</span>
                </div>
                {(liveAllocation?.allocations || []).map(item => (
                  <div key={item.symbol} className="allocation-row">
                    <span>{item.symbol}</span>
                    <span>{currency(item.currentPrice)}</span>
                    <span>{item.shares}</span>
                    <span>{currency(item.allocated)}</span>
                    <span>{currency(item.currentValue)}</span>
                    <span className={item.currentPL >= 0 ? 'text-up' : 'text-down'}>
                      {item.currentPL >= 0 ? '+' : ''}{currency(item.currentPL)} ({percent(item.currentPLPct)})
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="insights-card">
              <div className="panel-header">
                <div>
                  <h4>AI Explanation</h4>
                  <p>Why the allocation looks the way it does.</p>
                </div>
              </div>
              <div className="insights-copy">
                {insightLoading ? (
                  <p>Generating AI insight...</p>
                ) : insightError ? (
                  <p className="ai-error">{insightError}</p>
                ) : (
                  <>
                    <p>{explanation?.headline}</p>
                    {explanation?.details.map((line, idx) => <p key={idx}>{line}</p>)}
                  </>
                )}
              </div>
            </section>
          </div>
        </section>
      )}
    </div>
  );
}

export default AIPortfolio;
