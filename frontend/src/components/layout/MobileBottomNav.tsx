import { Link, useLocation } from 'react-router-dom';
import { Navigation, Clock, Activity, User } from 'lucide-react';
import { clsx } from 'clsx';

const tabs = [
  { name: 'Navigate', path: '/app', icon: Navigation },
  { name: 'Trips', path: '/app/history', icon: Clock },
  { name: 'Sensors', path: '/app/diagnostics', icon: Activity },
  { name: 'Profile', path: '/app/profile', icon: User },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border-clean md:hidden safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.path === '/app'
              ? location.pathname === '/app'
              : location.pathname.startsWith(tab.path);

          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors relative select-none',
                isActive ? 'text-ink' : 'text-ink-mute hover:text-ink-body'
              )}
            >
              {isActive && (
                <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-black rounded-full" />
              )}
              <Icon
                className={clsx(
                  'w-5 h-5 transition-transform',
                  isActive && 'scale-105'
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={clsx(
                  'text-[10px] leading-none',
                  isActive ? 'font-semibold text-ink' : 'font-medium text-ink-mute'
                )}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

