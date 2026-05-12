'use strict';

/**
 * Technical Indicators Engine
 * 
 * Calculates professional-grade technical indicators:
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 * - SMA (Simple Moving Average)
 * - EMA (Exponential Moving Average)
 * - Bollinger Bands
 * - VWAP (Volume Weighted Average Price)
 * 
 * All beginner-friendly explanations included.
 */

// ── RSI: Relative Strength Index ──────────────────────────────────────

/**
 * RSI measures momentum on a scale of 0-100
 * @param {number[]} closes - Array of closing prices
 * @param {number} period - Calculation period (default 14)
 * @returns {number|null} RSI value 0-100
 */
function calculateRSI(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length < period + 1) return null;
  
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + (changes[i] > 0 ? changes[i] : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (changes[i] < 0 ? Math.abs(changes[i]) : 0)) / period;
  }
  
  if (avgLoss === 0) return avgGain > 0 ? 100 : 0;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ── MACD: Moving Average Convergence Divergence ─────────────────────

/**
 * MACD detects trend changes and momentum shifts
 * @param {number[]} closes - Array of closing prices
 * @returns {{line: number, signal: number, histogram: number}|null}
 */
function calculateMACD(closes) {
  if (!Array.isArray(closes) || closes.length < 26) return null;
  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  
  if (!ema12 || !ema26) return null;
  
  const macdLine = ema12 - ema26;
  const signalLine = calculateEMA([macdLine], 9);
  const histogram = macdLine - signalLine;
  
  return { line: macdLine, signal: signalLine, histogram };
}

// ── SMA: Simple Moving Average ───────────────────────────────────────

/**
 * SMA averages prices over a period
 * @param {number[]} prices - Array of prices
 * @param {number} period - Period for averaging
 * @returns {number|null} SMA value
 */
function calculateSMA(prices, period = 20) {
  if (!Array.isArray(prices) || prices.length < period) return null;
  
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// ── EMA: Exponential Moving Average ──────────────────────────────────

/**
 * EMA gives more weight to recent prices
 * @param {number[]} prices - Array of prices
 * @param {number} period - Period for EMA
 * @returns {number|null} EMA value
 */
function calculateEMA(prices, period = 20) {
  if (!Array.isArray(prices) || prices.length < period) return null;
  
  const multiplier = 2 / (period + 1);
  let sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    sma = (prices[i] - sma) * multiplier + sma;
  }
  
  return sma;
}

// ── Bollinger Bands ──────────────────────────────────────────────────

/**
 * Bollinger Bands show price volatility and overbought/oversold conditions
 * @param {number[]} closes - Array of closing prices
 * @param {number} period - Period (default 20)
 * @param {number} stdDev - Standard deviation multiplier (default 2)
 * @returns {{upper: number, middle: number, lower: number}|null}
 */
function calculateBollingerBands(closes, period = 20, stdDev = 2) {
  if (!Array.isArray(closes) || closes.length < period) return null;
  
  const recent = closes.slice(-period);
  const middle = recent.reduce((a, b) => a + b, 0) / period;
  
  const variance = recent.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const sd = Math.sqrt(variance);
  
  return {
    upper: middle + (sd * stdDev),
    middle,
    lower: middle - (sd * stdDev),
  };
}

// ── VWAP: Volume Weighted Average Price ──────────────────────────────

/**
 * VWAP is the average price weighted by volume
 * @param {Array} candles - Array of {close, volume} objects
 * @returns {number|null} VWAP value
 */
function calculateVWAP(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  
  for (const candle of candles) {
    const pv = (candle.close || 0) * (candle.volume || 0);
    cumulativePriceVolume += pv;
    cumulativeVolume += candle.volume || 0;
  }
  
  if (cumulativeVolume === 0) return null;
  return cumulativePriceVolume / cumulativeVolume;
}

// ── Historical Indicator Series ──────────────────────────────────────

/**
 * Calculate historical RSI series
 * @param {number[]} closes - Array of prices
 * @param {number} period - RSI period
 * @returns {number[]} Array of RSI values
 */
function calculateRSISeries(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length < period + 1) return [];
  
  const results = [];
  
  for (let i = period; i < closes.length; i++) {
    const slice = closes.slice(Math.max(0, i - period), i + 1);
    const rsi = calculateRSI(slice, Math.min(period, slice.length - 1));
    results.push(rsi);
  }
  
  return results;
}

/**
 * Calculate historical EMA series
 * @param {number[]} prices - Array of prices
 * @param {number} period - EMA period
 * @returns {number[]} Array of EMA values
 */
function calculateEMASeries(prices, period = 20) {
  if (!Array.isArray(prices) || prices.length < period) return [];
  
  const results = [];
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  results.push(ema);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    results.push(ema);
  }
  
  return results;
}

/**
 * Calculate historical SMA series
 * @param {number[]} prices - Array of prices
 * @param {number} period - SMA period
 * @returns {number[]} Array of SMA values
 */
function calculateSMASeries(prices, period = 20) {
  if (!Array.isArray(prices) || prices.length < period) return [];
  
  const results = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    results.push(sum / period);
  }
  
  return results;
}

// ── Explanations (Beginner-Friendly) ─────────────────────────────────

const INDICATOR_EXPLANATIONS = {
  RSI: {
    name: 'Relative Strength Index',
    shortName: 'RSI',
    description: 'Measures how strong the upward or downward movement is.',
    ranges: [
      { min: 0, max: 30, label: 'Oversold', meaning: 'Stock may be too weak; could recover soon.' },
      { min: 30, max: 70, label: 'Neutral', meaning: 'Stock is trading in a normal range.' },
      { min: 70, max: 100, label: 'Overbought', meaning: 'Stock may be too strong; could pull back soon.' },
    ],
    tips: [
      'RSI above 70 suggests the stock may be temporarily overbought.',
      'RSI below 30 suggests the stock may be temporarily oversold.',
      'RSI crossing 50 can indicate a trend change.',
    ],
  },
  MACD: {
    name: 'Moving Average Convergence Divergence',
    shortName: 'MACD',
    description: 'Detects when a stock\'s trend is starting, stopping, or reversing.',
    interpretation: 'When MACD line crosses above signal line, it may suggest upward momentum.',
    tips: [
      'MACD crossing above signal line may indicate bullish momentum.',
      'MACD crossing below signal line may indicate bearish momentum.',
      'Positive histogram means bullish strength.',
    ],
  },
  SMA: {
    name: 'Simple Moving Average',
    shortName: 'SMA',
    description: 'Shows the average price over a specific period.',
    interpretation: 'Price above SMA suggests uptrend; below suggests downtrend.',
    tips: [
      'Price above SMA may indicate an uptrend.',
      'Price below SMA may indicate a downtrend.',
      'SMA acts as support or resistance.',
    ],
  },
  EMA: {
    name: 'Exponential Moving Average',
    shortName: 'EMA',
    description: 'Like SMA, but gives more weight to recent prices.',
    interpretation: 'Reacts faster to price changes than SMA.',
    tips: [
      'EMA responds faster to recent price movements.',
      'EMA crossovers can signal trend changes.',
      'Often used with other indicators.',
    ],
  },
  BOLLINGER_BANDS: {
    name: 'Bollinger Bands',
    shortName: 'BB',
    description: 'Shows price volatility and potential support/resistance levels.',
    zones: [
      { area: 'Upper Band', meaning: 'Price may be overbought; could pull back.' },
      { area: 'Middle Band', meaning: 'Fair value; average price level.' },
      { area: 'Lower Band', meaning: 'Price may be oversold; could bounce up.' },
    ],
    tips: [
      'When price touches upper band, stock may be overbought.',
      'When price touches lower band, stock may be oversold.',
      'Wider bands indicate higher volatility.',
    ],
  },
  VWAP: {
    name: 'Volume Weighted Average Price',
    shortName: 'VWAP',
    description: 'Average price weighted by trading volume; favors the price where most shares traded.',
    interpretation: 'Price above VWAP indicates institutional buying; below indicates selling.',
    tips: [
      'Used by institutional traders.',
      'Price above VWAP may indicate bullish institutional activity.',
      'Price below VWAP may indicate bearish institutional activity.',
    ],
  },
};

// ── Get Indicator Signal ─────────────────────────────────────────────

/**
 * Generate a human-readable signal based on indicator values
 * @param {string} indicator - Indicator name (RSI, MACD, etc.)
 * @param {number} value - Current indicator value
 * @returns {string} Signal description
 */
function getIndicatorSignal(indicator, value) {
  switch (indicator) {
    case 'RSI':
      if (value > 70) return 'Overbought — stock may be too strong and could pull back.';
      if (value < 30) return 'Oversold — stock may be too weak and could recover.';
      return 'Neutral — stock is trading in a normal range.';
    case 'MACD':
      if (value > 0) return 'Bullish — upward momentum detected.';
      if (value < 0) return 'Bearish — downward momentum detected.';
      return 'Neutral — no clear momentum signal.';
    default:
      return 'Signal pending...';
  }
}

// ── Module Exports ───────────────────────────────────────────────────

module.exports = {
  calculateRSI,
  calculateMACD,
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateVWAP,
  calculateRSISeries,
  calculateEMASeries,
  calculateSMASeries,
  INDICATOR_EXPLANATIONS,
  getIndicatorSignal,
};
