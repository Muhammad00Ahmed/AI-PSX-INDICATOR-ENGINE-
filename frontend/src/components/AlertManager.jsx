import { useState, useEffect, memo, useCallback } from 'react';
import { API_PATH } from '../utils/api';
import './AlertManager.css';

/**
 * Alert Manager Component
 * Manage all user alerts and view alert history
 */

function AlertManager({ userId }) {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts', 'history', 'notifications'
  const [formData, setFormData] = useState({
    type: 'price',
    symbol: '',
    condition: 'drop_5',
    name: '',
    channels: ['browser'],
  });

  useEffect(() => {
    if (!userId) return;
    loadAlerts();
    loadStats();
  }, [userId]);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_PATH}/alerts/${userId}`);
      const data = await res.json();
      setAlerts(data.alerts || []);
      loadHistory();
    } catch (err) {
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_PATH}/alerts/${userId}/history?limit=20`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  }, [userId]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_PATH}/alerts/${userId}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [userId]);

  const createAlert = async () => {
    if (!formData.symbol) {
      alert('Please enter a stock symbol');
      return;
    }

    try {
      const res = await fetch(`${API_PATH}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData,
        }),
      });

      if (res.ok) {
        const newAlert = await res.json();
        setAlerts([...alerts, newAlert]);
        setFormData({ type: 'price', symbol: '', condition: 'drop_5', name: '', channels: ['browser'] });
        setShowCreateForm(false);
        loadStats();
      }
    } catch (err) {
      console.error('Error creating alert:', err);
      alert('Failed to create alert');
    }
  };

  const deleteAlert = async (alertId) => {
    if (!confirm('Delete this alert?')) return;

    try {
      const res = await fetch(`${API_PATH}/alerts/${userId}/${alertId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId));
        loadStats();
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
    }
  };

  const toggleAlert = async (alert) => {
    try {
      const res = await fetch(`${API_PATH}/alerts/${userId}/${alert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !alert.enabled }),
      });

      if (res.ok) {
        setAlerts(alerts.map(a => (a.id === alert.id ? { ...a, enabled: !a.enabled } : a)));
        loadStats();
      }
    } catch (err) {
      console.error('Error updating alert:', err);
    }
  };

  if (!userId) {
    return <div className="alert-manager-empty">Sign in to manage alerts</div>;
  }

  return (
    <div className="alert-manager">
      <div className="alert-manager-header">
        <div className="header-content">
          <h2>🔔 Alert Center</h2>
          <p className="header-subtitle">Create alerts and get notified of market events</p>
        </div>
        <button
          className={`btn-create ${showCreateForm ? 'active' : ''}`}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '+ New Alert'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="alert-stats">
          <StatCard label="Active Alerts" value={stats.enabledAlerts} icon="✓" />
          <StatCard label="Total Alerts" value={stats.totalAlerts} icon="📋" />
          <StatCard label="Triggered Today" value={stats.totalTriggered} icon="🔔" />
        </div>
      )}

      {/* Create Alert Form */}
      {showCreateForm && (
        <div className="create-alert-form">
          <div className="form-section">
            <label>Alert Type</label>
            <select
              value={formData.type}
              onChange={(e) => {
                setFormData({ ...formData, type: e.target.value, condition: '' });
              }}
              className="form-select"
            >
              <option value="price">Price Change</option>
              <option value="volume">Volume Spike</option>
              <option value="rsi">RSI Level</option>
              <option value="unusual">Unusual Activity</option>
              <option value="board">Board Result</option>
            </select>
          </div>

          <div className="form-section">
            <label>Stock Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., OGDC, HBL, PSO"
              className="form-input"
            />
          </div>

          <div className="form-section">
            <label>Condition</label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="form-select"
            >
              {formData.type === 'price' && (
                <>
                  <option value="drop_5">Drops 5%</option>
                  <option value="drop_10">Drops 10%</option>
                  <option value="rise_3">Rises 3%</option>
                  <option value="rise_5">Rises 5%</option>
                </>
              )}
              {formData.type === 'volume' && (
                <>
                  <option value="volume_spike_2x">Volume 2x</option>
                  <option value="volume_spike_3x">Volume 3x</option>
                  <option value="volume_spike_5x">Volume 5x</option>
                </>
              )}
              {formData.type === 'rsi' && (
                <>
                  <option value="rsi_above_70">RSI Above 70</option>
                  <option value="rsi_below_30">RSI Below 30</option>
                  <option value="rsi_above_80">RSI Above 80</option>
                  <option value="rsi_below_20">RSI Below 20</option>
                </>
              )}
              {formData.type === 'unusual' && (
                <>
                  <option value="unusual_volume">Unusual Volume</option>
                  <option value="unusual_volatility">Unusual Volatility</option>
                </>
              )}
            </select>
          </div>

          <div className="form-section">
            <label>Alert Name (Optional)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., OGDC Price Drop Alert"
              className="form-input"
            />
          </div>

          <div className="form-section">
            <label>Notification Channels</label>
            <div className="channel-checkboxes">
              {['browser', 'email', 'telegram'].map((channel) => (
                <label key={channel} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.channels.includes(channel)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, channels: [...formData.channels, channel] });
                      } else {
                        setFormData({
                          ...formData,
                          channels: formData.channels.filter((c) => c !== channel),
                        });
                      }
                    }}
                  />
                  <span>{channel.charAt(0).toUpperCase() + channel.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="btn-submit" onClick={createAlert}>
            Create Alert
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="alert-tabs">
        <button
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Active Alerts ({alerts.length})
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Recent Triggers ({history.length})
        </button>
      </div>

      {/* Alerts List */}
      {activeTab === 'alerts' && (
        <div className="alerts-list">
          {loading ? (
            <p className="list-empty">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="list-empty">No alerts yet. Create one to get started!</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`alert-item ${alert.enabled ? 'enabled' : 'disabled'}`}>
                <div className="alert-item-header">
                  <div className="alert-info">
                    <h4 className="alert-name">{alert.name}</h4>
                    <span className="alert-condition">{alert.symbol} • {alert.condition}</span>
                  </div>
                  <div className="alert-actions">
                    <button
                      className={`btn-toggle ${alert.enabled ? 'on' : 'off'}`}
                      onClick={() => toggleAlert(alert)}
                      title={alert.enabled ? 'Disable' : 'Enable'}
                    >
                      {alert.enabled ? '●' : '○'}
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => deleteAlert(alert.id)}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <div className="alert-meta">
                  <span className="meta-item">
                    {alert.channels.map((c) => CHANNEL_ICONS[c] || c).join(' ')}
                  </span>
                  <span className="meta-item">
                    {alert.triggerCount > 0 ? `Triggered ${alert.triggerCount}x` : 'Never triggered'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History List */}
      {activeTab === 'history' && (
        <div className="history-list">
          {history.length === 0 ? (
            <p className="list-empty">No alert history</p>
          ) : (
            history.map((entry, idx) => (
              <div key={idx} className="history-item">
                <div className="history-time">
                  {new Date(entry.timestamp).toLocaleTimeString('en-PK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="history-content">
                  <p className="history-symbol">{entry.symbol}</p>
                  <p className="history-value">
                    {entry.price?.toFixed(2)} ({entry.change >= 0 ? '+' : ''}{entry.change}%)
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}

const CHANNEL_ICONS = {
  browser: '🌐',
  email: '📧',
  telegram: '📱',
  whatsapp: '💬',
};

export default memo(AlertManager);
