import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_BACKEND = process.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_API_URL || 'https://ai-psx-indicator-1.onrender.com';
const API_BASE = DEFAULT_BACKEND;

const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

/**
 * Fetches REAL historical OHLCV candle data from PSX DPS API via backend.
 * Auto-refreshes every 2 minutes.
 * Falls back to synthetic data (clearly labelled) if API unavailable.
 */
export function useHistoricalData(symbol, range = '1m') {
  const [candles, setCandles]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [source, setSource]     = useState('none');
  const [lastFetch, setLastFetch] = useState(null);
  const abortRef  = useRef(null);
  const timerRef  = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!symbol || !range) return;

    // Abort previous fetch
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}/api/historical/${encodeURIComponent(symbol)}?range=${range}`;
      const res = await fetch(url, { signal: abortRef.current.signal });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!mountedRef.current) return;

      const rawCandles = data.candles || [];

      // Validate and normalize candles
      const valid = rawCandles
        .filter(c => c && Number.isFinite(c.time) && Number.isFinite(c.close) && c.close > 0)
        .map(c => ({
          time:      c.time,
          open:      Number.isFinite(c.open)   && c.open  > 0 ? c.open   : c.close,
          high:      Number.isFinite(c.high)   && c.high  > 0 ? c.high   : Math.max(c.open || c.close, c.close),
          low:       Number.isFinite(c.low)    && c.low   > 0 ? c.low    : Math.min(c.open || c.close, c.close),
          close:     c.close,
          volume:    Number.isFinite(c.volume) ? c.volume : 0,
          synthetic: Boolean(c.synthetic),
        }))
        .sort((a, b) => a.time - b.time)
        // Remove duplicate timestamps
        .filter((c, i, arr) => i === 0 || c.time !== arr[i-1].time);

      setCandles(valid);
      setSource(data.source || 'unknown');
      setLastFetch(Date.now());
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(err.message);
      console.warn(`Historical data fetch failed for ${symbol} (${range}):`, err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => {
    mountedRef.current = true;
    setCandles([]);
    setSource('none');
    fetchData();

    // Auto-refresh every 2 minutes
    timerRef.current = setInterval(fetchData, REFRESH_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      clearInterval(timerRef.current);
    };
  }, [fetchData]);

  return { candles, loading, error, source, lastFetch, refetch: fetchData };
}

/**
 * Fetches market events for a date range.
 */
export function useMarketEvents(from, to, sector = null) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (sector) params.set('sector', sector);

    fetch(`${API_BASE}/api/events?${params}`)
      .then(r => r.json())
      .then(d => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to, sector]);

  return { events, loading };
}

/**
 * Fetches price movement explanation for a symbol and range.
 */
export function useExplanation(symbol, range) {
  const [explanation, setExplanation] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol || !range) return;
    setLoading(true);

    fetch(`${API_BASE}/api/explain/${encodeURIComponent(symbol)}?range=${range}`)
      .then(r => r.json())
      .then(d => {
        setExplanation(d.explanation || null);
        setEvents(d.events || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol, range]);

  return { explanation, events, loading };
}
