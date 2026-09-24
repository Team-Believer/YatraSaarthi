/**
 * YatraSaarthi - Safe Environment Variable Access Layer
 * 
 * Provides typed, runtime-safe access to MAPBOX_TOKEN and API_URL
 * without requiring the VITE_ prefix.
 * 
 * Works consistently in:
 * 1. Vite Development mode (Vite define / loadEnv)
 * 2. Vercel Production build (process.env injected at build time)
 * 3. Node.js test runners (process.env)
 */

declare global {
  interface Window {
    __APP_ENV__?: {
      MAPBOX_TOKEN?: string;
      API_URL?: string;
      WS_URL?: string;
    };
  }
  const __APP_ENV__: {
    MAPBOX_TOKEN?: string;
    API_URL?: string;
    WS_URL?: string;
  } | undefined;
}

export const PRODUCTION_DEFAULT_API_URL = 'https://yatrasaarthi.onrender.com';
export const PRODUCTION_DEFAULT_WS_URL = 'wss://yatrasaarthi.onrender.com';

/**
 * Resolves current environment variables dictionary safely across Vite and Node
 */
export function getRawEnv(overrideEnv?: Record<string, string | undefined>): Record<string, string | undefined> {
  if (overrideEnv) return overrideEnv;

  const result: Record<string, string | undefined> = {};

  // 1. Process.env in Node/test environments
  if (typeof process !== 'undefined' && process.env) {
    Object.assign(result, process.env);
  }

  // 2. Vite import.meta.env
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    Object.assign(result, (import.meta as any).env);
  }

  // 3. Vite custom build-time injected define global
  if (typeof __APP_ENV__ !== 'undefined' && __APP_ENV__) {
    if (__APP_ENV__.MAPBOX_TOKEN) result.MAPBOX_TOKEN = __APP_ENV__.MAPBOX_TOKEN;
    if (__APP_ENV__.API_URL) result.API_URL = __APP_ENV__.API_URL;
    if (__APP_ENV__.WS_URL) result.WS_URL = __APP_ENV__.WS_URL;
  }

  // 4. Browser window.__APP_ENV__ if set
  if (typeof window !== 'undefined' && window.__APP_ENV__) {
    if (window.__APP_ENV__.MAPBOX_TOKEN) result.MAPBOX_TOKEN = window.__APP_ENV__.MAPBOX_TOKEN;
    if (window.__APP_ENV__.API_URL) result.API_URL = window.__APP_ENV__.API_URL;
    if (window.__APP_ENV__.WS_URL) result.WS_URL = window.__APP_ENV__.WS_URL;
  }

  return result;
}

/**
 * Returns the public Mapbox Access Token
 */
export function getMapboxToken(overrideEnv?: Record<string, string | undefined>): string {
  const env = getRawEnv(overrideEnv);
  const token = (
    env.MAPBOX_TOKEN ||
    env.MAPBOX_ACCESS_TOKEN ||
    (typeof __APP_ENV__ !== 'undefined' ? __APP_ENV__?.MAPBOX_TOKEN : '') ||
    ''
  ).trim();

  return token;
}

/**
 * Detects whether the current execution is in Development mode
 */
export function isDevEnvironment(overrideEnv?: Record<string, string | undefined>): boolean {
  const env = getRawEnv(overrideEnv);
  if (typeof env.DEV === 'boolean') return env.DEV;
  if (typeof env.DEV === 'string') return env.DEV === 'true';
  if (typeof env.MODE === 'string') return env.MODE === 'development' || env.MODE === 'test';
  if (typeof env.NODE_ENV === 'string') return env.NODE_ENV !== 'production';

  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return Boolean((import.meta as any).env.DEV);
  }
  return true;
}

/**
 * Identifies localhost, 127.0.0.1, 0.0.0.0, or private RFC 1918 LAN addresses
 */
export function isLocalOrPrivateHost(url: string): boolean {
  if (!url) return false;
  return /(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i.test(url);
}

/**
 * Returns whether a valid production backend is configured
 */
export function isBackendConfigured(overrideEnv?: Record<string, string | undefined>): boolean {
  const isDev = isDevEnvironment(overrideEnv);
  if (isDev) return true; // Development relies on Vite dev proxy

  const apiBase = getApiBaseUrl(overrideEnv);
  return Boolean(apiBase && !isLocalOrPrivateHost(apiBase));
}

/**
 * Returns the configured Backend API Base URL.
 * In development: returns custom API_URL or "" (relative same-origin Vite proxy).
 * In production: returns sanitized public HTTPS API URL (defaults to verified Render backend).
 */
export function getApiBaseUrl(overrideEnv?: Record<string, string | undefined>): string {
  const env = getRawEnv(overrideEnv);
  const rawUrl = (
    env.API_URL ||
    env.API_BASE_URL ||
    (typeof __APP_ENV__ !== 'undefined' ? __APP_ENV__?.API_URL : '') ||
    ''
  ).trim();
  const isDev = isDevEnvironment(overrideEnv);

  if (rawUrl) {
    const cleaned = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    if (!isDev && isLocalOrPrivateHost(cleaned)) {
      console.warn(`[apiConfig] Rejected local/LAN URL '${cleaned}' in production environment. Using ${PRODUCTION_DEFAULT_API_URL}`);
      return PRODUCTION_DEFAULT_API_URL;
    }
    return cleaned;
  }

  // In development without explicit API_URL, return "" for Vite dev proxy
  if (isDev) {
    return '';
  }

  // In production default to verified Render deployment
  return PRODUCTION_DEFAULT_API_URL;
}

/**
 * Returns the WebSocket base URL derived from WS_URL or API Base URL.
 * In development: supports Vite WS proxy or ws://localhost:8000.
 * In production: strictly derives wss:// from public API base URL or verified Render URL.
 */
export function getWsBaseUrl(overrideEnv?: Record<string, string | undefined>): string {
  const env = getRawEnv(overrideEnv);
  const isDev = isDevEnvironment(overrideEnv);
  const explicitWs = (
    env.WS_URL ||
    (typeof __APP_ENV__ !== 'undefined' ? __APP_ENV__?.WS_URL : '') ||
    ''
  ).trim();

  if (explicitWs) {
    const cleaned = explicitWs.endsWith('/') ? explicitWs.slice(0, -1) : explicitWs;
    if (!isDev && isLocalOrPrivateHost(cleaned)) {
      console.warn(`[apiConfig] Rejected local/LAN WebSocket URL '${cleaned}' in production.`);
      return PRODUCTION_DEFAULT_WS_URL;
    }
    return cleaned;
  }

  const apiBase = getApiBaseUrl(overrideEnv);
  if (apiBase.startsWith('https://')) {
    return apiBase.replace(/^https:\/\//, 'wss://');
  }
  if (apiBase.startsWith('http://')) {
    return apiBase.replace(/^http:\/\//, 'ws://');
  }

  // Development same-origin Vite proxy mode
  if (isDev) {
    if (typeof window !== 'undefined' && window.location) {
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${wsProto}//${host}`;
    }
    return 'ws://localhost:8000';
  }

  // In production fallback to verified Render WebSocket base
  return PRODUCTION_DEFAULT_WS_URL;
}

/**
 * Returns the full WebSocket URL for a live navigation session.
 */
export function getNavigationWsUrl(sessionId: string, overrideEnv?: Record<string, string | undefined>): string {
  const wsBase = getWsBaseUrl(overrideEnv);
  if (!wsBase) return '';
  return `${wsBase}/ws/navigation/${encodeURIComponent(sessionId)}`;
}
