'use strict';

/**
 * Portfolio Tracker API Routes
 */

const express = require('express');
const logger = require('../utils/logger');
const { getPortfolioEngine } = require('../analysis/portfolioEngine');
const { getState } = require('../state/marketState');

const router = express.Router();

// ── PORTFOLIO MANAGEMENT ────────────────────────────────────────────

router.get('/portfolio/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const engine = getPortfolioEngine();
    const portfolio = engine.getPortfolio(userId);

    res.json({
      userId,
      portfolio,
      stats: engine.getStats(userId),
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Get portfolio error');
    res.status(400).json({ error: err.message });
  }
});

router.post('/portfolio/:userId/holdings', (req, res) => {
  try {
    const { userId } = req.params;
    const { symbol, quantity, buyPrice, sector, companyName } = req.body;

    const engine = getPortfolioEngine();
    const holding = engine.addHolding(userId, {
      symbol,
      quantity,
      buyPrice,
      sector,
      companyName,
    });

    logger.info({ userId, symbol }, 'Holding added');
    res.status(201).json(holding);
  } catch (err) {
    logger.error({ err: err.message }, 'Add holding error');
    res.status(400).json({ error: err.message });
  }
});

router.put('/portfolio/:userId/holdings/:holdingId', (req, res) => {
  try {
    const { userId, holdingId } = req.params;
    const engine = getPortfolioEngine();
    const holding = engine.updateHolding(userId, holdingId, req.body);

    logger.info({ userId, holdingId }, 'Holding updated');
    res.json(holding);
  } catch (err) {
    logger.error({ err: err.message }, 'Update holding error');
    res.status(400).json({ error: err.message });
  }
});

router.delete('/portfolio/:userId/holdings/:holdingId', (req, res) => {
  try {
    const { userId, holdingId } = req.params;
    const engine = getPortfolioEngine();
    const holding = engine.removeHolding(userId, holdingId);

    logger.info({ userId, holdingId }, 'Holding removed');
    res.json({ success: true, removed: holding });
  } catch (err) {
    logger.error({ err: err.message }, 'Delete holding error');
    res.status(400).json({ error: err.message });
  }
});

// ── PORTFOLIO PERFORMANCE ──────────────────────────────────────────

router.get('/portfolio/:userId/performance', (req, res) => {
  try {
    const { userId } = req.params;
    const engine = getPortfolioEngine();
    const state = getState();

    const portfolio = engine.getPortfolio(userId);
    if (!portfolio.holdings || portfolio.holdings.length === 0) {
      return res.json({
        userId,
        holdings: [],
        summary: {
          totalInvestment: 0,
          totalCurrentValue: 0,
          totalUnrealizedPL: 0,
          totalUnrealizedPLPercent: 0,
          holdingCount: 0,
        },
        timestamp: Date.now(),
      });
    }

    // Get current prices
    const currentPrices = {};
    for (const holding of portfolio.holdings) {
      const stock = state.getStock(holding.symbol);
      currentPrices[holding.symbol] = stock?.price || holding.buyPrice;
    }

    const performance = engine.calculatePerformance(portfolio, currentPrices);
    res.json({ userId, ...performance, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Get performance error');
    res.status(400).json({ error: err.message });
  }
});

// ── SECTOR EXPOSURE ────────────────────────────────────────────────

router.get('/portfolio/:userId/sectors', (req, res) => {
  try {
    const { userId } = req.params;
    const engine = getPortfolioEngine();
    const state = getState();

    const portfolio = engine.getPortfolio(userId);
    if (!portfolio.holdings || portfolio.holdings.length === 0) {
      return res.json({ userId, sectors: [], timestamp: Date.now() });
    }

    // Get current prices
    const currentPrices = {};
    for (const holding of portfolio.holdings) {
      const stock = state.getStock(holding.symbol);
      currentPrices[holding.symbol] = stock?.price || holding.buyPrice;
    }

    const sectors = engine.calculateSectorExposure(portfolio, currentPrices);
    res.json({ userId, sectors, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Get sectors error');
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
