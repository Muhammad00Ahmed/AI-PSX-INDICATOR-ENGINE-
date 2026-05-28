'use strict';

const express = require('express');
const logger = require('../utils/logger');
const { requireAuth } = require('./authMiddleware');
const { getUserSummary, appendChatEntry, appendTransaction, appendAiInsight, saveWatchlists } = require('../storage/userDataStore');

const router = express.Router();
router.use(requireAuth);

function ensureSelf(req, res, next) {
  const { userId } = req.params;
  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.get('/user/:userId/summary', ensureSelf, (req, res) => {
  try {
    const userId = req.params.userId;
    const summary = getUserSummary(userId);
    res.json({ userId, ...summary, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'User summary error');
    res.status(500).json({ error: 'Unable to load user summary' });
  }
});

router.post('/user/:userId/chat', ensureSelf, (req, res) => {
  try {
    const userId = req.params.userId;
    const entry = appendChatEntry(userId, req.body);
    res.status(201).json({ chatHistory: entry, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Chat save error');
    res.status(500).json({ error: 'Unable to save chat entry' });
  }
});

router.post('/user/:userId/transactions', ensureSelf, (req, res) => {
  try {
    const userId = req.params.userId;
    const entries = appendTransaction(userId, req.body);
    res.status(201).json({ transactions: entries, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Transaction save error');
    res.status(500).json({ error: 'Unable to save transaction' });
  }
});

router.post('/user/:userId/insights', ensureSelf, (req, res) => {
  try {
    const userId = req.params.userId;
    const insights = appendAiInsight(userId, req.body);
    res.status(201).json({ aiInsights: insights, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Insight save error');
    res.status(500).json({ error: 'Unable to save insight' });
  }
});

router.put('/user/:userId/watchlists', ensureSelf, (req, res) => {
  try {
    const userId = req.params.userId;
    const watchlists = Array.isArray(req.body.watchlists) ? req.body.watchlists : [];
    const saved = saveWatchlists(userId, watchlists);
    res.json({ watchlists: saved, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Watchlist save error');
    res.status(500).json({ error: 'Unable to save watchlists' });
  }
});

module.exports = router;
