'use strict';

const express  = require('express');
const logger   = require('../utils/logger');
const { getState }         = require('../state/marketState');
const { getOrchestrator }  = require('../scraper/orchestrator');
const { getCache }         = require('../pipeline/cache');
const { getMarketStatus, isMarketOpen } = require('../utils/marketSession');
const { fetchHistorical, fetchIndexHistory, generateSyntheticCandles, getDateRange } = require('./historicalData');
const { getEventsInRange, getEventsForSectors, explainPriceMovement, PSX_EVENTS } = require('./psxEvents');

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

module.exports = router;
