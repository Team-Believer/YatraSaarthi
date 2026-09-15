import { useEffect } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { sessionLifecycle } from '../services/navigation/sessionLifecycle';

/**
 * Hook to monitor WebSocket connection for active navigation session.
 * The connection itself is managed through sessionLifecycle to guarantee
 * clean start/end lifecycle and prevent dual connections.
 */
export function useNavigationWebSocket(_sessionId?: string | null) {
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);

  useEffect(() => {
    // If component unmounts while in session, we do not abruptly close
    // unless explicitly ended via endLiveSession()
    return () => {
      // Intentionally no-op to allow navigation across tabs (Home <-> LiveMap)
      // without tearing down the live navigation session.
    };
  }, [sessionStatus]);

  return sessionLifecycle.getWebSocket();
}
