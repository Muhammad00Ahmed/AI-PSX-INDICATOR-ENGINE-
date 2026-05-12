'use strict';

/**
 * Smart Alert System
 * 
 * Features:
 * - Price alerts (drop/rise percentage)
 * - Volume spike alerts
 * - RSI overbought/oversold alerts
 * - Unusual activity alerts
 * - Board result alerts
 * - Real-time WebSocket notifications
 * - Alert history logging
 * - Throttling to prevent spam
 */

const EventEmitter = require('events');

class AlertEngine extends EventEmitter {
  constructor() {
    super();
    this.alerts = new Map(); // userId -> [alerts]
    this.alertHistory = new Map(); // userId -> [history entries]
    this.triggerLog = new Map(); // alertId -> last trigger timestamp (for throttling)
    this.THROTTLE_DURATION = 5 * 60 * 1000; // 5 minutes minimum between same alert
  }

  /**
   * Create a new alert for a user
   * @param {string} userId - User identifier
   * @param {object} alert - Alert configuration
   * @returns {object} Created alert with ID
   */
  createAlert(userId, alert) {
    const {
      type, // 'price', 'volume', 'rsi', 'unusual', 'board'
      symbol,
      condition, // e.g., 'drop_5', 'rise_3', 'volume_spike', 'rsi_above_70', 'rsi_below_30'
      value, // for custom conditions
      enabled = true,
      channels = ['browser'], // 'browser', 'email', 'telegram', 'whatsapp'
      name,
    } = alert;

    if (!type || !symbol) throw new Error('Alert must have type and symbol');

    const alertId = `${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertObj = {
      id: alertId,
      userId,
      type,
      symbol,
      condition,
      value,
      enabled,
      channels,
      name: name || this._generateAlertName(type, condition, symbol),
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      triggerCount: 0,
    };

    if (!this.alerts.has(userId)) this.alerts.set(userId, []);
    this.alerts.get(userId).push(alertObj);

    this.emit('alertCreated', { userId, alert: alertObj });
    return alertObj;
  }

  /**
   * Get all alerts for a user
   */
  getAlerts(userId) {
    return this.alerts.get(userId) || [];
  }

  /**
   * Update an alert
   */
  updateAlert(userId, alertId, updates) {
    const userAlerts = this.alerts.get(userId) || [];
    const alertIndex = userAlerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) throw new Error('Alert not found');

    userAlerts[alertIndex] = { ...userAlerts[alertIndex], ...updates, id: alertId };
    this.emit('alertUpdated', { userId, alert: userAlerts[alertIndex] });
    return userAlerts[alertIndex];
  }

  /**
   * Delete an alert
   */
  deleteAlert(userId, alertId) {
    const userAlerts = this.alerts.get(userId) || [];
    const index = userAlerts.findIndex(a => a.id === alertId);
    if (index === -1) throw new Error('Alert not found');

    const alert = userAlerts.splice(index, 1)[0];
    this.emit('alertDeleted', { userId, alertId });
    return alert;
  }

  /**
   * Check if alert should trigger based on current stock data
   * @param {object} stock - Current stock data
   * @param {object} alert - Alert configuration
   * @param {object} indicators - Technical indicators (optional)
   * @returns {boolean} Should trigger
   */
  shouldTrigger(stock, alert, indicators = {}) {
    if (!alert.enabled) return false;
    if (stock.symbol !== alert.symbol) return false;

    // Check throttling
    const lastTrigger = this.triggerLog.get(alert.id);
    if (lastTrigger && Date.now() - lastTrigger < this.THROTTLE_DURATION) {
      return false;
    }

    switch (alert.type) {
      case 'price':
        return this._checkPriceAlert(stock, alert);
      case 'volume':
        return this._checkVolumeAlert(stock, alert);
      case 'rsi':
        return this._checkRSIAlert(stock, alert, indicators);
      case 'unusual':
        return this._checkUnusualAlert(stock, alert);
      case 'board':
        return this._checkBoardAlert(stock, alert);
      default:
        return false;
    }
  }

  /**
   * Price alert: Check if price changed by specified percentage
   */
  _checkPriceAlert(stock, alert) {
    const { condition, value } = alert;
    const change = stock.change || 0;

    if (condition === 'drop_5') return change <= -5;
    if (condition === 'drop_10') return change <= -10;
    if (condition === 'rise_3') return change >= 3;
    if (condition === 'rise_5') return change >= 5;
    if (condition === 'custom') return Math.abs(change) >= value;

    return false;
  }

  /**
   * Volume alert: Check for unusual volume
   */
  _checkVolumeAlert(stock, alert) {
    const { condition } = alert;
    const volumeMultiplier = (stock.volume || 0) / (stock.avgVolume || 1);

    if (condition === 'volume_spike_2x') return volumeMultiplier >= 2;
    if (condition === 'volume_spike_3x') return volumeMultiplier >= 3;
    if (condition === 'volume_spike_5x') return volumeMultiplier >= 5;

    return false;
  }

  /**
   * RSI alert: Check RSI levels
   */
  _checkRSIAlert(stock, alert, indicators) {
    const { condition } = alert;
    const rsi = indicators?.rsi;

    if (!rsi && rsi !== 0) return false;

    if (condition === 'rsi_above_70') return rsi > 70;
    if (condition === 'rsi_below_30') return rsi < 30;
    if (condition === 'rsi_above_80') return rsi > 80;
    if (condition === 'rsi_below_20') return rsi < 20;

    return false;
  }

  /**
   * Unusual activity alert: Check for anomalies
   */
  _checkUnusualAlert(stock, alert) {
    const { condition } = alert;

    if (condition === 'unusual_volume') {
      return (stock.volume || 0) > (stock.avgVolume || 0) * 2;
    }

    if (condition === 'unusual_volatility') {
      return Math.abs(stock.change || 0) > 5;
    }

    return false;
  }

  /**
   * Board result alert: Check for board result events
   */
  _checkBoardAlert(stock, alert) {
    if (!stock.events) return false;
    return stock.events.some(e => e.type === 'board_result');
  }

  /**
   * Trigger an alert and record it
   */
  triggerAlert(userId, alert, stock, reason) {
    // Update throttle log
    this.triggerLog.set(alert.id, Date.now());

    // Update alert stats
    alert.lastTriggered = new Date().toISOString();
    alert.triggerCount = (alert.triggerCount || 0) + 1;

    // Log to history
    const historyEntry = {
      alertId: alert.id,
      timestamp: new Date().toISOString(),
      symbol: stock.symbol,
      price: stock.price,
      change: stock.change,
      reason,
      channels: alert.channels,
    };

    if (!this.alertHistory.has(userId)) this.alertHistory.set(userId, []);
    this.alertHistory.get(userId).push(historyEntry);

    // Emit event for WebSocket broadcasting
    this.emit('alertTriggered', {
      userId,
      alert,
      stock,
      reason,
      notification: this._buildNotification(alert, stock, reason),
    });
  }

  /**
   * Get alert history for a user
   */
  getAlertHistory(userId, limit = 50) {
    const history = this.alertHistory.get(userId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Build notification object
   */
  _buildNotification(alert, stock, reason) {
    return {
      title: `${alert.name || alert.symbol}`,
      message: `${stock.symbol}: ${stock.price || 'N/A'} (${stock.change >= 0 ? '+' : ''}${stock.change}%)`,
      reason,
      symbol: stock.symbol,
      price: stock.price,
      change: stock.change,
      icon: stock.change > 0 ? '📈' : '📉',
      url: `/stock/${stock.symbol}`,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate human-readable alert name
   */
  _generateAlertName(type, condition, symbol) {
    const names = {
      price_drop_5: `${symbol} drops 5%`,
      price_drop_10: `${symbol} drops 10%`,
      price_rise_3: `${symbol} rises 3%`,
      price_rise_5: `${symbol} rises 5%`,
      volume_spike_2x: `${symbol} volume spikes 2x`,
      volume_spike_3x: `${symbol} volume spikes 3x`,
      rsi_above_70: `${symbol} RSI above 70 (overbought)`,
      rsi_below_30: `${symbol} RSI below 30 (oversold)`,
      unusual_volume: `${symbol} unusual volume detected`,
      unusual_volatility: `${symbol} unusual movement detected`,
      board_result: `${symbol} board result alert`,
    };
    return names[`${type}_${condition}`] || `${symbol} alert`;
  }

  /**
   * Check all alerts for a user against stock data
   */
  checkUserAlerts(userId, stock, indicators = {}) {
    const userAlerts = this.getAlerts(userId) || [];
    const triggered = [];

    for (const alert of userAlerts) {
      if (alert.symbol === stock.symbol && this.shouldTrigger(stock, alert, indicators)) {
        this.triggerAlert(userId, alert, stock, 'Automatic trigger');
        triggered.push(alert);
      }
    }

    return triggered;
  }

  /**
   * Get statistics on alerts
   */
  getStats(userId) {
    const userAlerts = this.getAlerts(userId);
    const history = this.alertHistory.get(userId) || [];

    return {
      totalAlerts: userAlerts.length,
      enabledAlerts: userAlerts.filter(a => a.enabled).length,
      disabledAlerts: userAlerts.filter(a => !a.enabled).length,
      totalTriggered: history.length,
      recentTriggered: history.slice(-24),
    };
  }
}

// Singleton instance
let instance = null;

function getAlertEngine() {
  if (!instance) instance = new AlertEngine();
  return instance;
}

module.exports = { AlertEngine, getAlertEngine };
