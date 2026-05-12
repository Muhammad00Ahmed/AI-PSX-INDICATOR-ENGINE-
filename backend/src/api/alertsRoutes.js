'use strict';

/**
 * Alert System API Routes
 */

const express = require('express');
const logger = require('../utils/logger');
const { getAlertEngine } = require('../analysis/alertEngine');

const router = express.Router();

// ── ALERT MANAGEMENT ────────────────────────────────────────────────

router.post('/alerts', (req, res) => {
  try {
    const { userId, type, symbol, condition, value, name, channels } = req.body;

    if (!userId || !type || !symbol) {
      return res.status(400).json({ error: 'Missing required fields: userId, type, symbol' });
    }

    const alertEngine = getAlertEngine();
    const alert = alertEngine.createAlert(userId, {
      type,
      symbol,
      condition,
      value,
      name,
      channels: channels || ['browser'],
    });

    logger.info({ userId, alertId: alert.id }, 'Alert created');
    res.status(201).json(alert);
  } catch (err) {
    logger.error({ err: err.message }, 'Create alert error');
    res.status(400).json({ error: err.message });
  }
});

router.get('/alerts/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const alertEngine = getAlertEngine();
    const alerts = alertEngine.getAlerts(userId);

    res.json({
      userId,
      alerts,
      count: alerts.length,
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Get alerts error');
    res.status(400).json({ error: err.message });
  }
});

router.put('/alerts/:userId/:alertId', (req, res) => {
  try {
    const { userId, alertId } = req.params;
    const updates = req.body;

    const alertEngine = getAlertEngine();
    const alert = alertEngine.updateAlert(userId, alertId, updates);

    logger.info({ userId, alertId }, 'Alert updated');
    res.json(alert);
  } catch (err) {
    logger.error({ err: err.message }, 'Update alert error');
    res.status(400).json({ error: err.message });
  }
});

router.delete('/alerts/:userId/:alertId', (req, res) => {
  try {
    const { userId, alertId } = req.params;
    const alertEngine = getAlertEngine();
    const alert = alertEngine.deleteAlert(userId, alertId);

    logger.info({ userId, alertId }, 'Alert deleted');
    res.json({ success: true, deletedAlert: alert });
  } catch (err) {
    logger.error({ err: err.message }, 'Delete alert error');
    res.status(400).json({ error: err.message });
  }
});

// ── ALERT HISTORY ──────────────────────────────────────────────────

router.get('/alerts/:userId/history', (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(100, Number(req.query.limit) || 50);

    const alertEngine = getAlertEngine();
    const history = alertEngine.getAlertHistory(userId, limit);

    res.json({
      userId,
      history,
      count: history.length,
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Get history error');
    res.status(400).json({ error: err.message });
  }
});

// ── ALERT STATISTICS ───────────────────────────────────────────────

router.get('/alerts/:userId/stats', (req, res) => {
  try {
    const { userId } = req.params;
    const alertEngine = getAlertEngine();
    const stats = alertEngine.getStats(userId);

    res.json({ userId, ...stats, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err: err.message }, 'Get stats error');
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
