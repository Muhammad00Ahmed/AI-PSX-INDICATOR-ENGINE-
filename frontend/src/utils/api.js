function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

const configuredBase = normalizeBaseUrl(import.meta.env.VITE_API_URL || '');
export const API_BASE = configuredBase || (import.meta.env.DEV ? 'http://localhost:3002' : 'https://ai-psx-indicator-1.onrender.com');
export const API_PATH = API_BASE ? `${API_BASE}/api` : '/api';

export function buildApiUrl(path) {
  if (!path || typeof path !== 'string') return API_PATH;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_PATH}${path.startsWith('/') ? '' : '/'}${path}`;
}
