/**
 * YatraSaarthi — Dynamic Chunk Load Failure Recovery
 *
 * When a PWA or SPA deploys a new build, older service-worker caches or stale HTML
 * may try to request dynamic chunks that no longer exist (e.g. "Failed to fetch dynamically imported module").
 * This handler catches these errors and reloads the page once to pull the fresh bundle.
 */

const RELOAD_GUARD_KEY = 'ys_chunk_reload_timestamp';
const RELOAD_COOLDOWN_MS = 15000; // 15 seconds cooldown to prevent reload loops

export function setupChunkLoadRecovery(): void {
  if (typeof window === 'undefined') return;

  const handleChunkError = (error: any) => {
    const errorMsg = error?.message || error?.toString() || '';
    const isChunkError =
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('Loading CSS chunk') ||
      errorMsg.includes('Importing a module script failed');

    if (isChunkError) {
      console.warn('[YatraSaarthi] Detected dynamic chunk load failure:', errorMsg);
      const lastReload = sessionStorage.getItem(RELOAD_GUARD_KEY);
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, now.toString());
        console.warn('[YatraSaarthi] Reloading page to fetch updated application bundle...');
        window.location.reload();
      } else {
        console.error('[YatraSaarthi] Reload loop prevented for chunk load error.');
      }
    }
  };

  window.addEventListener('error', (event) => {
    handleChunkError(event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    handleChunkError(event.reason);
  });
}
