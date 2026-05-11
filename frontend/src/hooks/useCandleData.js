import { useState, useEffect, useRef } from 'react';

const DEFAULT_BACKEND = process.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_API_URL || 'https://ai-psx-indicator-1.onrender.com';
const API_BASE = DEFAULT_BACKEND;

export function useCandleData(symbol, intervalSec = 60, limit = 200) {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const symbolRef = useRef(symbol);

  useEffect(() => {
    if (!symbol) return;
    symbolRef.current = symbol;
    setLoading(true);

    fetch(`${API_BASE}/api/candles/${symbol}?interval=${intervalSec}&limit=${limit}`)
      .then(r => r.json())
      .then(data => {
        if (symbolRef.current !== symbol) return;
        setCandles(data.candles || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol, intervalSec]);

  return { candles, loading };
}
