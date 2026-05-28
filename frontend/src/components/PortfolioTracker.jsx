import { useState, useEffect, memo, useCallback } from 'react';
import { API_PATH } from '../utils/api';
import './PortfolioTracker.css';

/**
 * Portfolio Tracker Component
 * Manage investments, track P&L, analyze sector exposure
 */

function PortfolioTracker({ userId }) {
  const [portfolio, setPortfolio] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('holdings');
  const [formData, setFormData] = useState({
    symbol: '',
    quantity: '',
    buyPrice: '',
    sector: '',
    companyName: '',
  });

  useEffect(() => {
    if (!userId) return;
    loadPortfolioData();
  }, [userId]);

  const loadPortfolioData = useCallback(async () => {
    setLoading(true);
    try {
      const [portfolioRes, performanceRes, sectorsRes] = await Promise.all([
        fetch(`${API_PATH}/portfolio/${userId}`),
        fetch(`${API_PATH}/portfolio/${userId}/performance`),
        fetch(`${API_PATH}/portfolio/${userId}/sectors`),
      ]);

      const [portfolioData, performanceData, sectorsData] = await Promise.all([
        portfolioRes.json(),
        performanceRes.json(),
        sectorsRes.json(),
      ]);

      setPortfolio(portfolioData.portfolio);
      setPerformance(performanceData);
      setSectors(sectorsData.sectors || []);
    } catch (err) {
      console.error('Error loading portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addHolding = async () => {
    if (!formData.symbol || !formData.quantity || !formData.buyPrice) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const res = await fetch(`${API_PATH}/portfolio/${userId}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ symbol: '', quantity: '', buyPrice: '', sector: '', companyName: '' });
        setShowAddForm(false);
        loadPortfolioData();
      }
    } catch (err) {
      console.error('Error adding holding:', err);
      alert('Failed to add holding');
    }
  };

  const removeHolding = async (holdingId) => {
    if (!confirm('Remove this holding?')) return;

    try {
      const res = await fetch(`${API_PATH}/portfolio/${userId}/holdings/${holdingId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadPortfolioData();
      }
    } catch (err) {
      console.error('Error removing holding:', err);
    }
  };

  if (!userId) {
    return <div className="portfolio-empty">Sign in to manage your portfolio</div>;
  }

  if (loading && !portfolio) {
    return <div className="portfolio-loading">Loading portfolio...</div>;
  }

  const summary = performance?.summary || {
    totalInvestment: 0,
    totalCurrentValue: 0,
    totalUnrealizedPL: 0,
    totalUnrealizedPLPercent: 0,
  };

  const holdings = performance?.holdings || [];

  return (
    <div className="portfolio-tracker">
      <div className="portfolio-header">
        <div className="header-content">
          <h2>💼 Portfolio</h2>
          <p className="header-subtitle">Track your investments and P&L</p>
        </div>
        <button
          className={`btn-add ${showAddForm ? 'active' : ''}`}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Holding'}
        </button>
      </div>

      {/* Performance Summary Cards */}
      <div className="performance-cards">
        <PerfCard label="Invested" value={summary.totalInvestment} icon="💰" />
        <PerfCard label="Current Value" value={summary.totalCurrentValue} icon="📊" />
        <PerfCard
          label="Profit/Loss"
          value={summary.totalUnrealizedPL}
          percent={summary.totalUnrealizedPLPercent}
          icon="📈"
          showPercent
        />
        <PerfCard label="Holdings" value={summary.holdingCount} icon="📑" />
      </div>

      {/* Add Holding Form */}
      {showAddForm && (
        <div className="add-holding-form">
          <div className="form-section">
            <label>Stock Symbol *</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., OGDC"
              className="form-input"
            />
          </div>

          <div className="form-section">
            <label>Quantity *</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="Number of shares"
              className="form-input"
            />
          </div>

          <div className="form-section">
            <label>Buy Price *</label>
            <input
              type="number"
              step="0.01"
              value={formData.buyPrice}
              onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
              placeholder="Purchase price per share"
              className="form-input"
            />
          </div>

          <div className="form-section">
            <label>Sector</label>
            <select
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              className="form-select"
            >
              <option value="">Auto-detect</option>
              <option value="Energy">Energy</option>
              <option value="Banking">Banking</option>
              <option value="Chemicals">Chemicals</option>
              <option value="Tech">Technology</option>
              <option value="Pharma">Pharmaceuticals</option>
            </select>
          </div>

          <button className="btn-submit" onClick={addHolding}>
            Add to Portfolio
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="portfolio-tabs">
        <button
          className={`tab ${activeTab === 'holdings' ? 'active' : ''}`}
          onClick={() => setActiveTab('holdings')}
        >
          Holdings ({holdings.length})
        </button>
        <button
          className={`tab ${activeTab === 'sectors' ? 'active' : ''}`}
          onClick={() => setActiveTab('sectors')}
        >
          Sector Exposure
        </button>
      </div>

      {/* Holdings Tab */}
      {activeTab === 'holdings' && (
        <div className="holdings-list">
          {holdings.length === 0 ? (
            <p className="empty-state">No holdings yet. Add stocks to get started!</p>
          ) : (
            <div className="holdings-table-container">
              <table className="holdings-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Qty</th>
                    <th>Buy Price</th>
                    <th>Current Price</th>
                    <th>Value</th>
                    <th>P&L</th>
                    <th>%</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.id}>
                      <td className="cell-symbol">{h.symbol}</td>
                      <td className="cell-qty">{h.quantity}</td>
                      <td className="cell-price">{h.buyPrice?.toFixed(2)}</td>
                      <td className="cell-price">{h.currentPrice?.toFixed(2)}</td>
                      <td className="cell-value">{h.currentValue?.toFixed(0)}</td>
                      <td className={`cell-pl ${h.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
                        {h.unrealizedPL >= 0 ? '+' : ''}{h.unrealizedPL?.toFixed(0)}
                      </td>
                      <td className={`cell-percent ${h.unrealizedPLPercent >= 0 ? 'positive' : 'negative'}`}>
                        {h.unrealizedPLPercent >= 0 ? '+' : ''}{h.unrealizedPLPercent?.toFixed(2)}%
                      </td>
                      <td className="cell-action">
                        <button
                          className="btn-delete"
                          onClick={() => removeHolding(h.id)}
                          title="Remove"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sectors Tab */}
      {activeTab === 'sectors' && (
        <div className="sectors-list">
          {sectors.length === 0 ? (
            <p className="empty-state">Add holdings to see sector breakdown</p>
          ) : (
            <div className="sectors-content">
              {sectors.map((sector) => (
                <div key={sector.sector} className="sector-item">
                  <div className="sector-header">
                    <h4>{sector.sector}</h4>
                    <span className="sector-percentage">{sector.percentage}%</span>
                  </div>
                  <div className="sector-bar">
                    <div
                      className="sector-fill"
                      style={{ width: `${sector.percentage}%` }}
                    />
                  </div>
                  <div className="sector-details">
                    <span className="detail">Value: {sector.totalValue?.toLocaleString('en-PK')}</span>
                    <span className="detail">Holdings: {sector.holdings.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PerfCard({ label, value, percent, icon, showPercent }) {
  const isNegative = value < 0;
  const formattedValue = typeof value === 'number'
    ? value > 10000
      ? (value / 1000).toFixed(1) + 'K'
      : value.toFixed(2)
    : value;

  return (
    <div className={`perf-card ${isNegative && showPercent ? 'negative' : ''}`}>
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <p className="card-label">{label}</p>
        <p className={`card-value ${isNegative && showPercent ? 'text-negative' : ''}`}>
          {isNegative && !showPercent ? '−' : ''}{formattedValue}
        </p>
        {showPercent && (
          <p className={`card-percent ${isNegative ? 'text-negative' : 'text-positive'}`}>
            {isNegative ? '' : '+'}
            {percent?.toFixed(2)}%
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(PortfolioTracker);
