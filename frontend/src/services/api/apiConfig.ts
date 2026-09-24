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

export {
  PRODUCTION_DEFAULT_API_URL,
  PRODUCTION_DEFAULT_WS_URL,
  getRawEnv as getEnv,
  isDevEnvironment,
  isLocalOrPrivateHost,
  isBackendConfigured,
  getApiBaseUrl,
  getWsBaseUrl,
  getNavigationWsUrl,
  getMapboxToken,
} from './envConfig';

import {
  isDevEnvironment,
  isBackendConfigured,
  getApiBaseUrl,
  getNavigationWsUrl,
} from './envConfig';


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
      userFriendlyMessage: 'Production FastAPI backend URL is not defined in the frontend configuration. Please configure API_URL in your deployment settings.',
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
