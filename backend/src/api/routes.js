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
const alertsRoutes = require('./alertsRoutes');
const portfolioRoutes = require('./portfolioRoutes');
const sentimentRoutes = require('./sentimentRoutes');

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
    };
  }).filter(Boolean);

  if (!stocks.length) return res.status(404).json({ error: 'No valid symbols found for comparison' });
  res.json({ symbols, stocks, count: stocks.length, timestamp: Date.now() });
});

router.get('/explain/:symbol', async (req, res) => {
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

// ── ALERTS ROUTES ────────────────────────────────────────────────────

router.use('', alertsRoutes);

// ── PORTFOLIO ROUTES ──────────────────────────────────────────────────

router.use('', portfolioRoutes);

// ── SENTIMENT & LEARNING ROUTES ────────────────────────────────────

router.use('', sentimentRoutes);

module.exports = router;
