import { useState, useEffect, memo } from 'react';
import './StockComparison.css';

/**
 * Stock Comparison Component
 * Compare multiple stocks side-by-side with key metrics
 */

function StockComparison() {
  const [symbols, setSymbols] = useState(['OGDC', 'PPL']);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(null);

  const psx_symbols = [
    'OGDC', 'PPL', 'PSO', 'HBL', 'MCB', 'UBL', 'EBL', 'TRG',
    'SYS', 'AKRL', 'BAFL', 'BATA', 'COLG', 'DAWH', 'ENGC',
    'FCCL', 'FFBL', 'FLNG', 'FWDH', 'GATM', 'GLAXO', 'GSPLTD',
  ];

  useEffect(() => {
    loadComparison();
  }, [symbols]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compare?symbols=${symbols.join(',')}`);
      if (!res.ok) throw new Error('Unable to load comparison');
      const data = await res.json();
      const validStocks = Array.isArray(data.stocks) ? data.stocks.filter(Boolean) : [];
      setStocks(validStocks);
      setError(null);
    } catch (err) {
      console.error('Error loading comparison:', err);
      setError('Unable to fetch comparison data from the server.');
      const fallbackData = symbols.map((symbol) => ({
        symbol,
        price: Math.random() * 200 + 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 10000000),
        marketCap: Math.floor(Math.random() * 500000000000),
        peRatio: Math.random() * 15 + 5,
        dividend: Math.random() * 15,
        eps: Math.random() * 20 + 2,
        roe: Math.random() * 30 + 5,
        debtToEquity: Math.random() * 2,
        dayRange: { high: 100, low: 80 },
        fiftyTwoWeekRange: { high: 150, low: 40 },
      }));
      setStocks(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const addSymbol = () => {
    const symbol = inputValue.toUpperCase();
    if (symbol && !symbols.includes(symbol) && psx_symbols.includes(symbol)) {
      setSymbols([...symbols, symbol]);
      setInputValue('');
    }
  };

  const removeSymbol = (symbol) => {
    if (symbols.length > 1) {
      setSymbols(symbols.filter((s) => s !== symbol));
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value.toUpperCase());
  };

  const filteredSuggestions = psx_symbols.filter(
    (s) => s.startsWith(inputValue) && !symbols.includes(s) && inputValue.length > 0
  );

  const formatNumber = (value, digits = 2) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';

  const formatLargeNumber = (value, digits = 2) =>
    typeof value === 'number' && Number.isFinite(value) ? (value / 1000000).toFixed(digits) : '—';

  const metrics = [
    { label: 'Price', render: (s) => `${formatNumber(s?.price)} PKR` },
    {
      label: 'Change',
      render: (s) => {
        const change = typeof s?.change === 'number' && Number.isFinite(s.change) ? s.change : null;
        const changePercent = typeof s?.changePercent === 'number' && Number.isFinite(s.changePercent) ? s.changePercent : null;
        const positive = change != null && change >= 0;
        return (
          <span className={positive ? 'positive' : 'negative'}>
            {positive ? '↑' : '↓'} {change != null ? Math.abs(change).toFixed(2) : '—'} {changePercent != null ? `(${formatNumber(changePercent)}%)` : '(—)'}
          </span>
        );
      },
    },
    { label: 'Volume', render: (s) => `${formatLargeNumber(s?.volume)}M` },
    { label: 'Market Cap', render: (s) => `${formatNumber(s?.marketCap / 1000000000, 1)}B PKR` },
    { label: 'P/E Ratio', render: (s) => formatNumber(s?.peRatio) },
    { label: 'Dividend (PKR)', render: (s) => formatNumber(s?.dividend) },
    { label: 'EPS', render: (s) => formatNumber(s?.eps) },
    { label: 'ROE (%)', render: (s) => formatNumber(s?.roe, 1) },
    { label: 'Debt/Equity', render: (s) => formatNumber(s?.debtToEquity) },
    {
      label: '52-Week Range',
      render: (s) => {
        const low = typeof s?.fiftyTwoWeekRange?.low === 'number' ? formatNumber(s.fiftyTwoWeekRange.low, 0) : '—';
        const high = typeof s?.fiftyTwoWeekRange?.high === 'number' ? formatNumber(s.fiftyTwoWeekRange.high, 0) : '—';
        return `${low} - ${high}`;
      },
    },
  ];

  return (
    <div className="stock-comparison">
      <div className="sc-header">
        <h2>🔄 Stock Comparison</h2>
        <p className="sc-subtitle">Compare metrics across PSX stocks</p>
      </div>

      {/* Add Symbols */}
      <div className="sc-input-section">
        <div className="input-group">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
            placeholder="Enter stock symbol..."
            className="sc-input"
            list="suggestions"
            maxLength="5"
          />
          <datalist id="suggestions">
            {filteredSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <button onClick={addSymbol} className="sc-add-btn">
            + Add
          </button>
        </div>
        <p className="sc-help-text">Max 5 stocks. Press Enter or click Add.</p>
      </div>

      {error && <div className="sc-error">{error}</div>}

      {/* Comparison Table */}
      {loading ? (
        <div className="sc-loading">Loading comparison...</div>
      ) : (
        <div className="sc-table-container">
          <table className="sc-table">
            <thead>
              <tr>
                <th className="metric-col">Metric</th>
                {stocks.map((stock) => (
                  <th key={stock.symbol} className="stock-col">
                    <div className="stock-header">
                      <span className="symbol">{stock.symbol}</span>
                      <button
                        className="remove-btn"
                        onClick={() => removeSymbol(stock.symbol)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.label}>
                  <td className="metric-col">{metric.label}</td>
                  {stocks.map((stock) => (
                    <td key={stock.symbol}>{metric.render(stock)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="sc-legend">
        <div className="legend-item">
          <span className="legend-dot positive"></span>
          <span>Positive Change</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot negative"></span>
          <span>Negative Change</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot neutral"></span>
          <span>Neutral</span>
        </div>
      </div>

      {/* Info */}
      <div className="sc-info">
        <h4>💡 Understanding the Metrics</h4>
        <ul>
          <li><strong>P/E Ratio:</strong> Lower ratios may indicate undervaluation</li>
          <li><strong>Dividend:</strong> Annual dividend per share in PKR</li>
          <li><strong>ROE:</strong> Return on Equity - higher is better for profitability</li>
          <li><strong>Debt/Equity:</strong> Lower ratios indicate less financial risk</li>
        </ul>
      </div>
    </div>
  );
}

export default memo(StockComparison);
