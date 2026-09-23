import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useNavigationStore } from '../../stores/useNavigationStore';

export const PwaUpdatePrompt: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setRegistration(reg);
                setNeedRefresh(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    // If user is currently in a LIVE navigation session, warn and delay reload
    if (sessionStatus === 'LIVE') {
      alert('Navigation session active. Please end the session before updating the app to prevent interrupting dead reckoning.');
      return;
    }

    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-[#083335] p-3 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">New Version Available</div>
            <div className="text-[11px] text-white/70">
              {sessionStatus === 'LIVE' ? 'Update ready (Delayed during live navigation)' : 'Update ready to apply'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUpdate}
            className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-[#083335] shadow-sm transition hover:bg-emerald-400 active:scale-95"
          >
            Update
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            aria-label="Dismiss"
            className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
