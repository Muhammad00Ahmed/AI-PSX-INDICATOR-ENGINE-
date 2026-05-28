'use strict';

const express  = require('express');
const logger   = require('../utils/logger');
const { getState }         = require('../state/marketState');
const { getOrchestrator }  = require('../scraper/orchestrator');
const { getCache }         = require('../pipeline/cache');
const { getMarketStatus, isMarketOpen } = require('../utils/marketSession');
const { fetchHistorical, fetchIndexHistory, generateSyntheticCandles, getDateRange } = require('./historicalData');
const { getEventsInRange, getEventsForSectors, explainPriceMovement, PSX_EVENTS } = require('./psxEvents');
const { calculateRSI, calculateMACD, calculateSMA, calculateEMA, calculateBollingerBands, calculateVWAP, calculateRSISeries, calculateEMASeries, calculateSMASeries, INDICATOR_EXPLANATIONS } = require('../analysis/technicalIndicators');
const { generateInsight } = require('../../analysis/insightGenerator');
const alertsRoutes = require('./alertsRoutes');
const authRoutes = require('./authRoutes');
const portfolioRoutes = require('./portfolioRoutes');
const sentimentRoutes = require('./sentimentRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

function getOrchestratorSafe() {
  try { return getOrchestrator(); } catch (_) { return null; }
}

router.get('/health', async (req, res) => {
  const state  = getState();
  const orch   = getOrchestratorSafe();
  const cache  = await getCache().healthCheck();
  const stats  = state.getStats();
  const healthy = stats.totalStocks > 0;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded', marketStatus: getMarketStatus(),
    isMarketOpen: isMarketOpen(), stocks: stats.totalStocks, indices: stats.totalIndices,
    version: state.version, lastUpdate: state.lastUpdateTime,
    scraper: orch ? orch.getHealth() : null, cache, uptime: process.uptime(),
    memory: process.memoryUsage(), serverTime: new Date().toISOString(),
  });
});

router.get('/status', (req, res) => {
  const state = getState();
  res.json({ marketStatus: getMarketStatus(), isMarketOpen: isMarketOpen(), stocks: state.stocks.size, version: state.version, lastUpdate: state.lastUpdateTime });
});

router.get('/market', (req, res) => {
  const state = getState();
  res.json({ stocks: state.getAllStocks(), indices: state.getAllIndices(), version: state.version, timestamp: state.lastUpdateTime, marketStatus: getMarketStatus(), totalStocks: state.stocks.size });
});

router.get('/stocks', (req, res) => {
  const state = getState();
  let stocks  = state.getAllStocks();
  const { sector, listed, search, minVol, sort, order } = req.query;
  if (sector) stocks = stocks.filter(x => (x.sector||'').toLowerCase().includes(sector.toLowerCase()));
  if (listed) stocks = stocks.filter(x => Array.isArray(x.listedIn) && x.listedIn.includes(listed.toUpperCase()));
  if (search) { const q = search.toLowerCase(); stocks = stocks.filter(x => x.symbol.toLowerCase().includes(q)||(x.companyName||'').toLowerCase().includes(q)); }
  if (minVol) { const mv = Number(minVol); if (Number.isFinite(mv)) stocks = stocks.filter(x => (x.volume||0) >= mv); }
  if (sort) { const dir = order === 'asc' ? 1 : -1; stocks = [...stocks].sort((a,b) => { const av = a[sort]??0; const bv = b[sort]??0; return typeof av === 'string' ? av.localeCompare(bv)*dir : (av-bv)*dir; }); }
  const page = Math.max(1, Number(req.query.page)||1);
  const limit = Math.min(500, Number(req.query.limit)||100);
  const start = (page-1)*limit;
  res.json({ stocks: stocks.slice(start, start+limit), total: stocks.length, page, limit, pages: Math.ceil(stocks.length/limit), timestamp: state.lastUpdateTime, version: state.version });
});

router.get('/stocks/:symbol', (req, res) => {
  const stock = getState().getStock(req.params.symbol.toUpperCase());
  if (!stock) return res.status(404).json({ error: `Symbol not found` });
  res.json({ stock, timestamp: Date.now() });
});

router.get('/indices', (req, res) => {
  const state = getState();
  res.json({ indices: state.getAllIndices(), kse100: state.getIndex('KSE100'), kse30: state.getIndex('KSE30'), timestamp: state.lastUpdateTime, version: state.version });
});

router.get('/indices/:name', (req, res) => {
  const index = getState().getIndex(req.params.name.toUpperCase());
  if (!index) return res.status(404).json({ error: `Index not found` });
  res.json({ index, timestamp: Date.now() });
});

router.get('/gainers', (req, res) => res.json({ gainers: getState().getTopGainers(Math.min(50, Number(req.query.limit)||10)), timestamp: Date.now() }));
router.get('/losers',  (req, res) => res.json({ losers:  getState().getTopLosers(Math.min(50, Number(req.query.limit)||10)),  timestamp: Date.now() }));
router.get('/active',  (req, res) => res.json({ active:  getState().getMostActive(Math.min(50, Number(req.query.limit)||10)), timestamp: Date.now() }));

router.get('/candles/:symbol', (req, res) => {
  const state = getState(); const symbol = req.params.symbol.toUpperCase();
  const interval = Number(req.query.interval)||60; const limit = Math.min(500, Number(req.query.limit)||200);
  const candles = state.getCandles(symbol, interval, limit);
  res.json({ symbol, interval, candles, count: candles.length, timestamp: Date.now(), source: 'realtime' });
});

// ── HISTORICAL DATA ENDPOINTS ─────────────────────────────────────────

router.get('/historical/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const range  = (req.query.range || '1m').toLowerCase();
  try {
    let candles = await fetchHistorical(symbol, range);
    if (!candles || candles.length < 2) {
      const stock = getState().getStock(symbol);
      if (stock && stock.price > 0) {
        candles = generateSyntheticCandles(symbol, stock.price, range);
        logger.info({ symbol, range }, 'Using synthetic candles as fallback');
      } else {
        return res.json({ symbol, range, candles: [], count: 0, source: 'none', timestamp: Date.now() });
      }
    }
    const source = candles[0]?.synthetic ? 'synthetic' : 'dps_api';
    res.json({ symbol, range, candles, count: candles.length, source, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message, symbol, range }, 'Historical route error');
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

router.get('/historical/index/:name', async (req, res) => {
  const name  = req.params.name.toUpperCase();
  const range = (req.query.range || '1m').toLowerCase();
  try {
    const data = await fetchIndexHistory(name, range);
    res.json({ name, range, data, count: data.length, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch index history' });
  }
});

// ── EVENTS ENDPOINTS ──────────────────────────────────────────────────

router.get('/events', (req, res) => {
  const { from, to, sector } = req.query;
  const fromDate = from || '2020-01-01';
  const toDate   = to   || new Date().toISOString().split('T')[0];
  const sectors  = sector ? sector.toUpperCase().split(',') : [];
  const events   = sectors.length ? getEventsForSectors(sectors, fromDate, toDate) : getEventsInRange(fromDate, toDate);
  res.json({ events, count: events.length, from: fromDate, to: toDate, timestamp: Date.now() });
});

router.get('/events/all', (req, res) => res.json({ events: PSX_EVENTS, count: PSX_EVENTS.length }));

router.get('/earnings/calendar', (req, res) => {
  const upcoming = [
    {
      symbol: 'OGDC',
      eventType: 'earnings',
      title: 'Q1 2026 Results',
      date: '2026-05-20',
      volatilityExpectation: 'high',
      description: 'OGDC Q1 earnings announcement expected to move the energy sector.',
    },
    {
      symbol: 'HBL',
      eventType: 'dividend',
      title: 'Dividend Ex-date',
      date: '2026-05-15',
      dividendPerShare: 5.5,
      description: 'HBL dividend record date for the next cash distribution.',
    },
    {
      symbol: 'PPL',
      eventType: 'board',
      title: 'Board Meeting',
      date: '2026-06-01',
      volatilityExpectation: 'medium',
      description: 'PPL board meeting may include dividend and guidance updates.',
    },
    {
      symbol: 'PSO',
      eventType: 'earnings',
      title: 'Quarterly Results',
      date: '2026-06-10',
      volatilityExpectation: 'high',
      description: 'PSO quarterly earnings release and sector commentary.',
    },
    {
      symbol: 'UBL',
      eventType: 'dividend',
      title: 'Dividend Payment',
      date: '2026-05-22',
      dividendPerShare: 8.0,
      description: 'UBL dividend payment execution date for confirmed payout.',
    },
  ];

  res.json({ events: upcoming, count: upcoming.length, timestamp: Date.now() });
});

router.get('/compare', (req, res) => {
  const symbols = (req.query.symbols || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 5);
  if (!symbols.length) return res.status(400).json({ error: 'Please provide one or more symbols using ?symbols=OGDC,PPL' });

  const state = getState();
  const stocks = symbols.map(symbol => {
    const stock = state.getStock(symbol);
    if (!stock) return null;
    return {
      symbol,
      companyName: stock.companyName || null,
      price: stock.price || 0,
      change: stock.change || 0,
      changePercent: stock.changePercent || 0,
      volume: stock.volume || 0,
      marketCap: stock.marketCap || 0,
      peRatio: stock.peRatio || null,
      dividend: stock.dividend || null,
      eps: stock.eps || null,
      roe: stock.roe || null,
      debtToEquity: stock.debtToEquity || null,
      dayRange: { high: stock.high || 0, low: stock.low || 0 },
      fiftyTwoWeekRange: { high: stock.fiftyTwoWeekHigh || stock.high || 0, low: stock.fiftyTwoWeekLow || stock.low || 0 },
      source: stock.source || 'live',
      sector: stock.sector || 'Unknown',
      volatility: stock.volatility || 0,
      momentum: stock.momentum || 0,
      trendScore: stock.trendScore || 0,
    };
  }).filter(Boolean);

  if (!stocks.length) return res.status(404).json({ error: 'No valid symbols found for comparison' });
  res.json({ symbols, stocks, count: stocks.length, timestamp: Date.now() });
});

let aiPortfolioCache = { key: '', ts: 0, data: null };
let aiPortfolioInsightCache = { key: '', ts: 0, data: null };

router.get('/ai-portfolio/samples', (req, res) => {
  const state = getState();
  const allStocks = state.getAllStocks().filter(s => s.price > 0);
  const topStocks = allStocks.sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 50);
  const sampleSymbols = topStocks.slice(0, 20).map(s => s.symbol);
  res.json({ symbols: sampleSymbols, count: sampleSymbols.length, timestamp: Date.now() });
});

router.post('/ai-portfolio/allocate', (req, res) => {
  const { amount, count, risk, goal, symbols } = req.body;
  const totalInvestment = Number(amount) || 0;
  const portfolioCount = Math.min(20, Math.max(1, Number(count) || 5));
  const prioritisedSymbols = Array.isArray(symbols)
    ? symbols.map(String).map(s => s.trim().toUpperCase()).filter(Boolean)
    : [];
  const riskPreference = ['conservative','moderate','aggressive'].includes((risk||'').toLowerCase()) ? risk.toLowerCase() : 'moderate';
  const investmentGoal = ['growth','dividend','balanced','low risk'].includes((goal||'').toLowerCase()) ? goal.toLowerCase() : 'balanced';

  if (totalInvestment <= 0) return res.status(400).json({ error: 'Investment amount must be greater than 0' });

  const cacheKey = JSON.stringify({ amount: totalInvestment, count: portfolioCount, risk: riskPreference, goal: investmentGoal, symbols: prioritisedSymbols.slice().sort() });
  const cacheAge = Date.now() - aiPortfolioCache.ts;
  if (cacheAge < 9000 && cacheKey === aiPortfolioCache.key) {
    return res.json({ ...aiPortfolioCache.data, cached: true, timestamp: Date.now() });
  }

  const state = getState();
  let candidates = state.getAllStocks().filter(s => s.price > 0 && s.volume > 0);

  const goalWeights = {
    growth:  { weight: 1.35, sectorBias: ['Oil & Gas','Technology','Pharma'] },
    dividend:{ weight: 1.15, sectorBias: ['Banks','Energy','Fertilizers'] },
    balanced:{ weight: 1.0, sectorBias: ['Banks','Oil & Gas','Cement'] },
    'low risk':{ weight: 0.85, sectorBias: ['Banks','Fertilizers','Cement'] },
  };

  const riskScores = {
    conservative: 0.7,
    moderate:     1.0,
    aggressive:   1.3,
  };

  const riskScale = riskScores[riskPreference];
  const target = goalWeights[investmentGoal] || goalWeights.balanced;

  const scoredStocks = candidates.map(stock => {
    const volatility = stock.volatility || Math.max(1, Math.abs(stock.changePercent || 0));
    const momentum = stock.momentum || ((stock.changePercent || 0) + ((stock.price || 0) / Math.max(1, stock.high || stock.price || 1)) * 10);
    const dividendYield = stock.dividendYield || ((stock.dividend || 0) / Math.max(1, stock.price || 1));
    const sectorStrength = ['Banks','Oil & Gas','Fertilizers','Cement'].includes(stock.sector) ? 1.1 : 1.0;
    const financialStrength = Math.min(1, Math.max(0, ((stock.roe || 0) / 20) + ((stock.peRatio ? 15 / stock.peRatio : 0.5))));

    const baseScore = (
      (momentum * 0.4) +
      ((1 / Math.max(1, volatility)) * 0.3) +
      (dividendYield * 0.15) +
      (financialStrength * 0.15)
    ) * sectorStrength;

    const goalBias = target.sectorBias.includes(stock.sector) ? 1.05 : 1.0;
    const riskBias = riskPreference === 'aggressive' ? (momentum > 0 ? 1.08 : 0.95) : riskPreference === 'conservative' ? (volatility < 5 ? 1.05 : 0.9) : 1.0;

    return {
      ...stock,
      score: baseScore * goalBias * riskBias,
      volatility,
      dividendYield,
      financialStrength,
      momentum,
    };
  });

  const symbolSet = new Set(prioritisedSymbols);
  const sortedCandidates = [...scoredStocks].sort((a, b) => b.score - a.score).slice(0, portfolioCount * 3);
  const requestedStocks = prioritisedSymbols
    .map(symbol => scoredStocks.find(stock => stock.symbol === symbol))
    .filter(Boolean)
    .map(stock => ({ ...stock, score: stock.score * 1.2 }));
  const remainingCandidates = sortedCandidates.filter(stock => !symbolSet.has(stock.symbol));
  const chosen = [...requestedStocks, ...remainingCandidates].slice(0, portfolioCount);
  const totalScore = chosen.reduce((sum, s) => sum + s.score, 0) || 1;

  const allocations = chosen.map((stock, idx) => {
    const raw = (stock.score / totalScore) * totalInvestment * (0.9 + 0.2 * ((portfolioCount - idx) / portfolioCount));
    const price = stock.price || 1;
    const shares = Math.max(1, Math.floor(raw / price));
    const allocated = shares * price;
    return {
      symbol: stock.symbol,
      companyName: stock.companyName || '',
      sector: stock.sector || 'Unknown',
      price,
      score: Number(stock.score.toFixed(4)),
      allocated: Number(allocated.toFixed(2)),
      shares,
      targetRatio: Number(((stock.score / totalScore) * 100).toFixed(1)),
      volatility: Number(stock.volatility.toFixed(2)),
      dividendYield: Number((stock.dividendYield * 100).toFixed(2)),
      momentum: Number(stock.momentum.toFixed(2)),
      financialStrength: Number(stock.financialStrength.toFixed(2)),
    };
  });

  const totalAllocated = allocations.reduce((sum, item) => sum + item.allocated, 0);
  const remainingBalance = Number((totalInvestment - totalAllocated).toFixed(2));

  const allocationBySector = allocations.reduce((map, item) => {
    map[item.sector] = (map[item.sector] || 0) + item.allocated;
    return map;
  }, {});

  const sectorExposure = Object.entries(allocationBySector).map(([sector, value]) => ({ sector, value, pct: Number(((value / totalAllocated) * 100).toFixed(1)) }));
  const diversificationScore = Number((Math.max(0, Math.min(100, 100 - (allocations.length > 0 ? ((Math.max(...allocations.map(a => a.targetRatio)) - Math.min(...allocations.map(a => a.targetRatio))) * 0.8) : 0)))).toFixed(0));
  const riskScore = Number((Math.min(100, Math.max(25, riskScale * 40 + (allocations.reduce((sum, a) => sum + a.volatility, 0) / allocations.length) * 3))).toFixed(0));
  const volatilityScore = Number((Math.max(0, Math.min(100, 100 - allocations.reduce((sum, a) => sum + a.volatility, 0) / Math.max(1, allocations.length)))).toFixed(0));

  const projected = {
    best: Number((totalInvestment * 1.15).toFixed(0)),
    expected: Number((totalInvestment * 1.06).toFixed(0)),
    risk: Number((totalInvestment * 0.91).toFixed(0)),
  };

  const projectionRange = {
    best: '+15%',
    expected: '+6%',
    risk: '-9%',
  };

  const response = {
    amount: totalInvestment,
    count: portfolioCount,
    risk: riskPreference,
    goal: investmentGoal,
    symbols: prioritisedSymbols,
    allocations,
    totalAllocated,
    remainingBalance,
    diversificationScore,
    riskScore,
    volatilityScore,
    sectorExposure,
    totalScore: Number(totalScore.toFixed(2)),
    projected,
    projectionRange,
    timestamp: Date.now(),
  };
  aiPortfolioCache = { key: cacheKey, ts: Date.now(), data: response };
  res.json(response);
});

router.post('/portfolio/analyze', async (req, res) => {
  const requested = Array.isArray(req.body.symbols)
    ? req.body.symbols.map(String).map(s => s.trim().toUpperCase()).filter(Boolean)
    : [];
  const cacheKey = JSON.stringify({ symbols: requested });
  const cacheAge = Date.now() - aiPortfolioInsightCache.ts;
  if (cacheAge < 10000 && cacheKey === aiPortfolioInsightCache.key) {
    return res.json({ ...aiPortfolioInsightCache.data, cached: true, timestamp: Date.now() });
  }

  try {
    const state = getState();
    const stocks = requested.length
      ? requested.map(sym => state.getStock(sym)).filter(Boolean)
      : state.getAllStocks().filter(s => s.price > 0).slice(0, 25);

    if (!stocks.length) {
      return res.status(400).json({ error: 'No valid symbols provided for analysis' });
    }

    const now = Date.now();
    const news = getEventsInRange(now - 14 * 24 * 60 * 60 * 1000, now).slice(0, 6);
    const insight = await generateInsight(stocks, news, { rate: null, direction: 'stable' });

    const response = { symbols: stocks.map(s => s.symbol), insight, timestamp: Date.now() };
    aiPortfolioInsightCache = { key: cacheKey, ts: Date.now(), data: response };
    res.json(response);
  } catch (err) {
    logger.error({ err: err.message }, 'Portfolio analyze error');
    res.status(500).json({ error: 'Failed to generate portfolio insight' });
  }
});

router.use('/', authRoutes);
router.use('/', sentimentRoutes);
router.use('/', alertsRoutes);
router.use('/', portfolioRoutes);

router.get('/health', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const range  = (req.query.range || '1m').toLowerCase();
  try {
    const state  = getState();
    const stock  = state.getStock(symbol);
    let candles  = await fetchHistorical(symbol, range);
    if (!candles || candles.length < 2) {
      if (stock?.price) candles = generateSyntheticCandles(symbol, stock.price, range);
    }
    const sectors = stock?.sector ? [stock.sector.toUpperCase().replace(/\s+/g,'_')] : [];
    const explanation = explainPriceMovement(candles, symbol, sectors[0]);
    const { start, end } = getDateRange(range);
    const rangeEvents = getEventsForSectors(sectors, start, end);
    res.json({ symbol, range, stock, explanation, events: rangeEvents, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message, symbol }, 'Explain route error');
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

router.get('/ticks/:symbol', (req, res) => {
  const state = getState(); const symbol = req.params.symbol.toUpperCase();
  const since = req.query.since ? Number(req.query.since) : null;
  const ticks = state.getTickHistory(symbol, since);
  res.json({ symbol, ticks, count: ticks.length, timestamp: Date.now() });
});

router.get('/stats', (req, res) => res.json({ ...getState().getStats(), marketStatus: getMarketStatus(), serverTime: new Date().toISOString() }));

// ── TECHNICAL INDICATORS ENDPOINTS ────────────────────────────────────

router.get('/indicators/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const range = (req.query.range || '1m').toLowerCase();
    
    const candles = await fetchHistorical(symbol, range);
    if (!candles || candles.length < 14) {
      return res.status(400).json({ error: 'Insufficient data for indicators' });
    }
    
    const closes = candles.map(c => c.close);
    
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const bb = calculateBollingerBands(closes);
    const vwap = calculateVWAP(candles);
    
    res.json({
      symbol,
      range,
      indicators: {
        rsi: rsi ? Number(rsi.toFixed(2)) : null,
        macd,
        sma: { sma20: sma20 ? Number(sma20.toFixed(2)) : null, sma50: sma50 ? Number(sma50.toFixed(2)) : null },
        ema: { ema12: ema12 ? Number(ema12.toFixed(2)) : null, ema26: ema26 ? Number(ema26.toFixed(2)) : null },
        bollingerBands: bb ? { upper: Number(bb.upper.toFixed(2)), middle: Number(bb.middle.toFixed(2)), lower: Number(bb.lower.toFixed(2)) } : null,
        vwap: vwap ? Number(vwap.toFixed(2)) : null,
      },
      current: {
        price: candles[candles.length - 1]?.close || 0,
        volume: candles[candles.length - 1]?.volume || 0,
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err: err.message, symbol: req.params.symbol }, 'Indicators route error');
    res.status(500).json({ error: 'Failed to calculate indicators' });
  }
});

router.get('/indicators/:symbol/rsi', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const period = Math.min(50, Math.max(5, Number(req.query.period) || 14));
    const range = (req.query.range || '1m').toLowerCase();
    
    const candles = await fetchHistorical(symbol, range);
    if (!candles || candles.length < period + 1) {
      return res.status(400).json({ error: 'Insufficient data' });
    }
    
    const closes = candles.map(c => c.close);
    const rsi = calculateRSI(closes, period);
    const series = calculateRSISeries(closes, period);
    
    res.json({
      symbol,
      indicator: 'RSI',
      period,
      current: rsi ? Number(rsi.toFixed(2)) : null,
      series: series.map(v => v ? Number(v.toFixed(2)) : null),
      explanation: INDICATOR_EXPLANATIONS.RSI,
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err: err.message }, 'RSI route error');
    res.status(500).json({ error: 'Failed to calculate RSI' });
  }
});

router.get('/indicators/explanations', (req, res) => {
  res.json({ indicators: INDICATOR_EXPLANATIONS });
});
// ── AUTH / DEMO ROUTES ──────────────────────────────────────────────────

router.use('', authRoutes);
// ── ALERTS ROUTES ────────────────────────────────────────────────────

router.use('', alertsRoutes);

// ── PORTFOLIO ROUTES ──────────────────────────────────────────────────

router.use('', portfolioRoutes);
// ── USER DATA ROUTES ───────────────────────────────────────────────────

router.use('', userRoutes);
// ── SENTIMENT & LEARNING ROUTES ────────────────────────────────────

router.use('', sentimentRoutes);

module.exports = router;
