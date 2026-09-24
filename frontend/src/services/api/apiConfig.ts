/**
 * YatraSaarthi - Centralized Production & Development API / WebSocket Configuration
 * 
 * Architecture Rules:
 * 1. DEVELOPMENT:
 *    - Uses Vite dev proxy (relative /api and /ws) when VITE_API_URL is omitted.
 *    - Forwards seamlessly to local FastAPI backend on port 8000.
 * 
 * 2. PRODUCTION (Vercel / Cloud):
 *    - Connects directly to verified public FastAPI backend: https://yatrasaarthi.onrender.com
 *    - Strictly rejects localhost, 127.0.0.1, 0.0.0.0, and LAN IP addresses.
 *    - Derives matching WSS WebSocket URL: wss://yatrasaarthi.onrender.com/ws/navigation/{session_id}
 *    - Never assumes Vercel origin is the WebSocket server or FastAPI backend.
 */

export const PRODUCTION_DEFAULT_API_URL = 'https://yatrasaarthi.onrender.com';
export const PRODUCTION_DEFAULT_WS_URL = 'wss://yatrasaarthi.onrender.com';

export type NetworkErrorKind =
  | 'API_URL_UNCONFIGURED'
  | 'NETWORK_UNREACHABLE'
  | 'MIXED_CONTENT_BLOCKED'
  | 'CORS_BLOCKED'
  | 'HTTP_ERROR'
  | 'WEBSOCKET_FAILED'
  | 'SESSION_CREATE_FAILED'
  | 'ROUTE_LOAD_FAILED'
  | 'UNKNOWN';

export interface ClassifiedApiError {
  kind: NetworkErrorKind;
  message: string;
  userFriendlyMessage: string;
  status: number;
}

/**
 * Resolves current environment variables safely across Vite and Node test environments
 */
export function getEnv(overrideEnv?: Record<string, string | undefined>): Record<string, string | undefined> {
  if (overrideEnv) return overrideEnv;
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>;
  }
  return {};
}

/**
 * Detects whether the current execution is in Development mode
 */
export function isDevEnvironment(overrideEnv?: Record<string, string | undefined>): boolean {
  const env = getEnv(overrideEnv);
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
 * In development: returns custom VITE_API_URL or "" (relative same-origin Vite proxy).
 * In production: returns sanitized public HTTPS API URL (defaults to verified Render backend).
 */
export function getApiBaseUrl(overrideEnv?: Record<string, string | undefined>): string {
  const env = getEnv(overrideEnv);
  const rawUrl = (env.VITE_API_URL || env.VITE_API_BASE_URL || '').trim();
  const isDev = isDevEnvironment(overrideEnv);

  if (rawUrl) {
    const cleaned = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    if (!isDev && isLocalOrPrivateHost(cleaned)) {
      console.warn(`[apiConfig] Rejected local/LAN URL '${cleaned}' in production environment. Using ${PRODUCTION_DEFAULT_API_URL}`);
      return PRODUCTION_DEFAULT_API_URL;
    }
    return cleaned;
  }

  // In development without explicit VITE_API_URL, return "" for Vite dev proxy
  if (isDev) {
    return '';
  }

  // In production default to verified Render deployment
  return PRODUCTION_DEFAULT_API_URL;
}

/**
 * Returns the WebSocket base URL derived from VITE_WS_URL or API Base URL.
 * In development: supports Vite WS proxy or ws://localhost:8000.
 * In production: strictly derives wss:// from public API base URL or verified Render URL.
 */
export function getWsBaseUrl(overrideEnv?: Record<string, string | undefined>): string {
  const env = getEnv(overrideEnv);
  const isDev = isDevEnvironment(overrideEnv);
  const explicitWs = (env.VITE_WS_URL || '').trim();

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

/**
 * Detects if the current frontend origin is HTTPS while API URL is insecure HTTP
 */
export function isMixedContentRisk(apiUrl?: string, overrideEnv?: Record<string, string | undefined>): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const isHttps = window.location.protocol === 'https:';
  if (!isHttps) return false;

  const resolvedApi = apiUrl !== undefined ? apiUrl : getApiBaseUrl(overrideEnv);
  return resolvedApi.startsWith('http://');
}

/**
 * Classifies raw network errors into user-friendly and engineering diagnostics
 */
export function classifyNetworkError(
  err: any,
  context?: string,
  overrideEnv?: Record<string, string | undefined>
): ClassifiedApiError {
  const rawMsg = err?.message || String(err || '');
  const status = typeof err?.status === 'number' ? err.status : 0;
  const isDev = isDevEnvironment(overrideEnv);

  // 1. Check for unconfigured backend in production
  if (!isDev && !isBackendConfigured(overrideEnv)) {
    return {
      kind: 'API_URL_UNCONFIGURED',
      status: 0,
      message: 'Production FastAPI backend URL is not defined in the frontend configuration.',
      userFriendlyMessage: 'Production FastAPI backend URL is not defined in the frontend configuration. Please configure VITE_API_URL in your deployment settings.',
    };
  }

  // 2. Check for mixed content blocking
  if (isMixedContentRisk(undefined, overrideEnv)) {
    return {
      kind: 'MIXED_CONTENT_BLOCKED',
      status: 0,
      message: 'Mixed content blocked: HTTPS browser cannot call insecure HTTP backend.',
      userFriendlyMessage: 'Navigation server connection blocked by browser HTTPS security. A secure (HTTPS) backend URL is required.',
    };
  }

  // 3. Check for generic network unreachable / CORS block
  const isNetworkFailure =
    status === 0 ||
    /failed to fetch|network\s?error|network request failed|connection refused|econnrefused/i.test(rawMsg);

  if (isNetworkFailure) {
    return {
      kind: 'NETWORK_UNREACHABLE',
      status: 0,
      message: rawMsg || 'Network unreachable or server down',
      userFriendlyMessage: 'Navigation server unavailable. Your route is still available. Reconnect and retry to start live navigation.',
    };
  }

  // 4. Endpoint-specific HTTP 404
  if (status === 404) {
    if (context === 'session_create') {
      return {
        kind: 'SESSION_CREATE_FAILED',
        status: 404,
        message: 'Session creation endpoint not found (404)',
        userFriendlyMessage: 'Unable to initialize navigation session on server. Reconnect and retry.',
      };
    }
    if (context === 'route_inject') {
      return {
        kind: 'ROUTE_LOAD_FAILED',
        status: 404,
        message: 'Route injection endpoint not found (404)',
        userFriendlyMessage: 'Route synchronization with server failed. Reconnect and retry.',
      };
    }
  }

  // 5. Client HTTP errors
  if (status >= 400 && status < 500) {
    return {
      kind: 'HTTP_ERROR',
      status,
      message: rawMsg || `Client error (HTTP ${status})`,
      userFriendlyMessage: `Navigation server rejected request (HTTP ${status}). Check settings and retry.`,
    };
  }

  // 6. Server HTTP errors
  if (status >= 500) {
    return {
      kind: 'HTTP_ERROR',
      status,
      message: rawMsg || `Internal server error (HTTP ${status})`,
      userFriendlyMessage: 'Navigation server encountered an internal error. Please try again.',
    };
  }

  return {
    kind: 'UNKNOWN',
    status,
    message: rawMsg || 'Unknown error occurred',
    userFriendlyMessage: rawMsg || 'Unable to connect to navigation engine. Please try again.',
  };
}

/**
 * DEVELOPMENT-ONLY diagnostics logged when Start Navigation is triggered
 */
export function logNavigationStartDiagnostics(
  sessionId?: string,
  overrideEnv?: Record<string, string | undefined>
): void {
  const isDev = isDevEnvironment(overrideEnv);
  if (!isDev) return; // Never print noisy diagnostics in production

  const apiBase = getApiBaseUrl(overrideEnv);
  const sessionEndpoint = apiBase ? `${apiBase}/api/v1/navigation/session` : '/api/v1/navigation/session';
  const wsUrl = sessionId ? getNavigationWsUrl(sessionId, overrideEnv) : getNavigationWsUrl('<session_id>', overrideEnv);
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'N/A';

  console.group('🚀 [NAV START]');
  console.info('environment:', isDev ? 'development' : 'production');
  console.info('apiBaseUrl:', apiBase || '(relative / same-origin proxy)');
  console.info('sessionUrl:', sessionEndpoint);
  console.info('websocketUrl:', wsUrl || '(unconfigured)');
  console.info('frontendOrigin:', origin);
  console.groupEnd();
}
