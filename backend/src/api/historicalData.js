'use strict';

/**
 * PSX Historical Data Service
 *
 * Fetches real historical OHLCV data from dps.psx.com.pk timeseries endpoints.
 * Supports multiple time ranges: 1D, 1W, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y
 * Caches results in-memory with TTL to avoid hammering the API.
 */

const axios = require('axios');
const logger = require('../utils/logger');

const BASE = 'https://dps.psx.com.pk';

// ── In-memory cache ───────────────────────────────────────────────────
// key → { data, fetchedAt, ttlMs }
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > entry.ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data, ttlMs) {
  cache.set(key, { data, fetchedAt: Date.now(), ttlMs });
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; PSXEngine/2.0)',
  'Accept': 'application/json',
  'Referer': 'https://dps.psx.com.pk/',
};

// ── Range config ──────────────────────────────────────────────────────
// Maps range ID → { endpoint path, TTL }

const RANGE_CONFIG = {
  '1d':  { path: '/timeseries/tickbystock', type: 'intraday', ttl: 60 * 1000 },        // 1 min cache
  '1w':  { path: '/timeseries/stockprice',  type: 'daily',    ttl: 5 * 60 * 1000 },
  '1m':  { path: '/timeseries/stockprice',  type: 'daily',    ttl: 5 * 60 * 1000 },
  '3m':  { path: '/timeseries/stockprice',  type: 'daily',    ttl: 10 * 60 * 1000 },
  '6m':  { path: '/timeseries/stockprice',  type: 'daily',    ttl: 15 * 60 * 1000 },
  'ytd': { path: '/timeseries/stockprice',  type: 'daily',    ttl: 15 * 60 * 1000 },
  '1y':  { path: '/timeseries/stockprice',  type: 'daily',    ttl: 30 * 60 * 1000 },
  '3y':  { path: '/timeseries/stockprice',  type: 'daily',    ttl: 60 * 60 * 1000 },
  '5y':  { path: '/timeseries/stockprice',  type: 'daily',    ttl: 60 * 60 * 1000 },
};

// Calculate date range for a given range ID
function getDateRange(rangeId) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start;

  switch (rangeId) {
    case '1d': {
      start = end;
      break;
    }
    case '1w': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
      break;
    }
    case '1m': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      start = d.toISOString().split('T')[0];
      break;
    }
    case '3m': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      start = d.toISOString().split('T')[0];
      break;
    }
    case '6m': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      start = d.toISOString().split('T')[0];
      break;
    }
    case 'ytd': {
      start = `${now.getFullYear()}-01-01`;
      break;
    }
    case '1y': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      start = d.toISOString().split('T')[0];
      break;
    }
    case '3y': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 3);
      start = d.toISOString().split('T')[0];
      break;
    }
    case '5y': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 5);
      start = d.toISOString().split('T')[0];
      break;
    }
    default:
      start = end;
  }

  return { start, end };
}

/**
 * Fetch intraday tick data for a symbol (1D).
 * Endpoint: GET /timeseries/tickbystock?symbol=HBL
 */
async function fetchIntradayData(symbol) {
  const key = `intraday:${symbol}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const url = `${BASE}/timeseries/tickbystock`;
    const res = await axios.get(url, {
      params: { symbol },
      timeout: 10000,
      headers: HEADERS,
    });

    const rows = res.data?.data || res.data || [];
    if (!Array.isArray(rows) || rows.length === 0) return [];

    // DPS tick format: [timestamp_ms_or_s, price, volume]
    const candles = rows
      .map(row => {
        let ts = Number(row[0]);
        // If timestamp looks like seconds (< year 3000 in ms)
        if (ts < 1e12) ts *= 1000;
        const price = parseFloat(row[1]);
        const vol   = parseFloat(row[2] || 0);
        if (!Number.isFinite(price) || price <= 0) return null;
        return { time: ts, open: price, high: price, low: price, close: price, volume: vol };
      })
      .filter(Boolean);

    // Aggregate into 5-min OHLCV buckets for intraday
    const buckets = new Map();
    for (const tick of candles) {
      const bucket = Math.floor(tick.time / (5 * 60 * 1000)) * (5 * 60 * 1000);
      if (!buckets.has(bucket)) {
        buckets.set(bucket, { time: bucket, open: tick.open, high: tick.high, low: tick.low, close: tick.close, volume: tick.volume });
      } else {
        const b = buckets.get(bucket);
        b.high   = Math.max(b.high, tick.high);
        b.low    = Math.min(b.low, tick.low);
        b.close  = tick.close;
        b.volume += tick.volume;
      }
    }

    const result = Array.from(buckets.values()).sort((a, b) => a.time - b.time);
    cacheSet(key, result, 60 * 1000);
    return result;
  } catch (err) {
    logger.debug({ err: err.message, symbol }, 'Intraday fetch failed');
    return [];
  }
}

/**
 * Fetch daily OHLCV data for a symbol and date range.
 * Endpoint: GET /timeseries/stockprice?symbol=HBL&from=2024-01-01&to=2025-01-01
 */
async function fetchDailyData(symbol, from, to) {
  const key = `daily:${symbol}:${from}:${to}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const url = `${BASE}/timeseries/stockprice`;
    const res = await axios.get(url, {
      params: { symbol, from, to },
      timeout: 15000,
      headers: HEADERS,
    });

    const rows = res.data?.data || res.data || [];
    if (!Array.isArray(rows) || rows.length === 0) return [];

    // DPS stockprice format: [date_str, open, high, low, close, volume]
    // OR: { date, open, high, low, close, volume }
    const candles = rows
      .map(row => {
        let ts, open, high, low, close, volume;

        if (Array.isArray(row)) {
          // Array format
          const dateStr = row[0];
          ts = new Date(dateStr).getTime();
          open   = parseFloat(row[1]);
          high   = parseFloat(row[2]);
          low    = parseFloat(row[3]);
          close  = parseFloat(row[4]);
          volume = parseFloat(row[5] || 0);
        } else {
          // Object format
          ts     = new Date(row.date || row.Date || row.t).getTime();
          open   = parseFloat(row.open   || row.Open   || row.o);
          high   = parseFloat(row.high   || row.High   || row.h);
          low    = parseFloat(row.low    || row.Low    || row.l);
          close  = parseFloat(row.close  || row.Close  || row.c || row.ldcp);
          volume = parseFloat(row.volume || row.Volume || row.v || 0);
        }

        if (!Number.isFinite(ts) || !Number.isFinite(close) || close <= 0) return null;

        // Sanitize OHLC
        if (!Number.isFinite(open)  || open  <= 0) open  = close;
        if (!Number.isFinite(high)  || high  <= 0) high  = Math.max(open, close);
        if (!Number.isFinite(low)   || low   <= 0) low   = Math.min(open, close);
        if (high < low) [high, low] = [low, high];
        if (close > high) high = close;
        if (close < low)  low  = close;

        return { time: ts, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

    // Cache duration depends on how old the range is
    const ttl = 5 * 60 * 1000; // 5 min default
    cacheSet(key, candles, ttl);
    return candles;
  } catch (err) {
    logger.debug({ err: err.message, symbol, from, to }, 'Daily data fetch failed');
    return [];
  }
}

/**
 * Main entry: fetch historical candles for any range.
 * Returns array of { time(ms), open, high, low, close, volume }
 */
async function fetchHistorical(symbol, rangeId = '1m') {
  const cfg = RANGE_CONFIG[rangeId] || RANGE_CONFIG['1m'];
  const { start, end } = getDateRange(rangeId);

  if (cfg.type === 'intraday') {
    return fetchIntradayData(symbol);
  }

  return fetchDailyData(symbol, start, end);
}

/**
 * Fetch index historical data (KSE100, KSE30, etc.)
 * Endpoint: GET /timeseries/int/KSE100
 */
async function fetchIndexHistory(indexName, rangeId = '1m') {
  const key = `index:${indexName}:${rangeId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const { start, end } = getDateRange(rangeId);

  try {
    const url = `${BASE}/timeseries/int/${indexName}`;
    const res = await axios.get(url, {
      params: { from: start, to: end },
      timeout: 15000,
      headers: HEADERS,
    });

    const rows = res.data?.data || res.data || [];
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const data = rows
      .map(row => {
        const ts  = Array.isArray(row) ? Number(row[0]) * 1000 : new Date(row.date || row[0]).getTime();
        const val = Array.isArray(row) ? parseFloat(row[1]) : parseFloat(row.close || row.value);
        const vol = Array.isArray(row) ? parseFloat(row[2] || 0) : parseFloat(row.volume || 0);
        if (!Number.isFinite(ts) || !Number.isFinite(val) || val <= 0) return null;
        return { time: ts, value: val, volume: vol };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

    cacheSet(key, data, 5 * 60 * 1000);
    return data;
  } catch (err) {
    logger.debug({ err: err.message, indexName }, 'Index history fetch failed');
    return [];
  }
}

/**
 * Generate realistic synthetic candles from a current price when API fails.
 * Uses Geometric Brownian Motion with Pakistani market volatility params.
 * This is the ONLY place we allow synthetic data, clearly labelled.
 */
function generateSyntheticCandles(symbol, currentPrice, rangeId) {
  const { start, end } = getDateRange(rangeId);
  const startMs = new Date(start).getTime();
  const endMs   = Math.min(new Date(end).getTime(), Date.now());

  const candles = [];
  const dailyVol = 0.015; // 1.5% daily volatility (PSX typical)

  let price = currentPrice;
  const step = rangeId === '1d' ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;

  // Walk backwards from current price
  const steps = Math.min(Math.floor((endMs - startMs) / step), 1825);
  const prices = [price];
  for (let i = 1; i < steps; i++) {
    const drift = (Math.random() - 0.5) * dailyVol * 2;
    price = Math.max(price * (1 + drift), 0.01);
    prices.unshift(price);
  }

  let t = startMs;
  for (let i = 0; i < prices.length && t <= endMs; i++) {
    const p = prices[i];
    const spread = p * 0.005;
    const open   = p + (Math.random() - 0.5) * spread;
    const close  = i === prices.length - 1 ? currentPrice : p;
    const high   = Math.max(open, close) + Math.random() * spread * 0.5;
    const low    = Math.min(open, close) - Math.random() * spread * 0.5;
    candles.push({
      time: t,
      open:  parseFloat(open.toFixed(2)),
      high:  parseFloat(high.toFixed(2)),
      low:   parseFloat(Math.max(0.01, low).toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000 + 10000),
      synthetic: true,
    });
    t += step;
  }

  return candles;
}

module.exports = { fetchHistorical, fetchIndexHistory, generateSyntheticCandles, getDateRange };
