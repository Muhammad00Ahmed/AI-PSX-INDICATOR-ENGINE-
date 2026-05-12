'use strict';

/**
 * Sentiment & Learning API Routes
 */

const express = require('express');
const logger = require('../utils/logger');
const { getSentimentEngine } = require('../analysis/sentimentEngine');
const { getLearningMode, LEARNING_CONTENT } = require('../analysis/learningMode');
const { getState } = require('../state/marketState');

const router = express.Router();

// ── MARKET SENTIMENT ────────────────────────────────────────────────

router.get('/sentiment', (req, res) => {
  try {
    const state = getState();
    const stocks = state.getAllStocks();
    
    // Get volatility data (simplified)
    const volatility = {};
    for (const stock of stocks) {
      volatility[stock.symbol] = Math.abs(stock.change) || 0;
    }

    const sentimentEngine = getSentimentEngine();
    const sentiment = sentimentEngine.calculateSentiment(stocks, [], volatility);

    res.json({ sentiment, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Sentiment calculation error');
    res.status(500).json({ error: 'Failed to calculate sentiment' });
  }
});

router.get('/sentiment/history', (req, res) => {
  try {
    const days = Math.min(365, Number(req.query.days) || 30);
    const sentimentEngine = getSentimentEngine();
    const history = sentimentEngine.getHistory(days);

    res.json({ history, count: history.length, days, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Sentiment history error');
    res.status(500).json({ error: 'Failed to fetch sentiment history' });
  }
});

router.get('/sentiment/trend', (req, res) => {
  try {
    const days = Math.min(30, Number(req.query.days) || 7);
    const sentimentEngine = getSentimentEngine();
    const trend = sentimentEngine.getTrend(days);

    res.json({ trend, days, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Sentiment trend error');
    res.status(500).json({ error: 'Failed to get sentiment trend' });
  }
});

// ── LEARNING MODE ──────────────────────────────────────────────────

router.get('/learning/terms', (req, res) => {
  try {
    res.json({ terms: LEARNING_CONTENT, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Learning terms error');
    res.status(500).json({ error: 'Failed to fetch learning content' });
  }
});

router.get('/learning/term/:termKey', (req, res) => {
  try {
    const learningMode = getLearningMode();
    const term = learningMode.getTerm(req.params.termKey);

    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    res.json({ term, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Learning term error');
    res.status(500).json({ error: 'Failed to fetch term' });
  }
});

router.get('/learning/stock-metrics/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const state = getState();
    const stock = state.getStock(symbol);

    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const learningMode = getLearningMode();
    const explanations = learningMode.explainStockMetrics(stock);

    res.json({
      symbol,
      explanations,
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Stock metrics explanation error');
    res.status(500).json({ error: 'Failed to explain stock metrics' });
  }
});

router.get('/learning/risk-assessment/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const state = getState();
    const stock = state.getStock(symbol);

    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const learningMode = getLearningMode();
    const riskAssessment = learningMode.assessRisk(stock);

    res.json({
      symbol,
      riskAssessment,
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Risk assessment error');
    res.status(500).json({ error: 'Failed to assess risk' });
  }
});

router.get('/learning/tips/:condition', (req, res) => {
  try {
    const learningMode = getLearningMode();
    const tips = learningMode.getTips(req.params.condition);

    res.json({ condition: req.params.condition, tips, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Tips error');
    res.status(500).json({ error: 'Failed to fetch tips' });
  }
});

router.get('/learning/portfolio-guidance', (req, res) => {
  try {
    const learningMode = getLearningMode();
    const guidance = learningMode.getPortfolioGuidance();

    res.json({ guidance, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Portfolio guidance error');
    res.status(500).json({ error: 'Failed to fetch guidance' });
  }
});

module.exports = router;
