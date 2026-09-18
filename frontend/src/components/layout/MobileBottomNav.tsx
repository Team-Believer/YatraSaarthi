import { Link, useLocation } from 'react-router-dom';
import { Home, Map, Clock, Activity, User } from 'lucide-react';
import { clsx } from 'clsx';

const tabs = [
  { name: 'Home', path: '/app', icon: Home },
  { name: 'Map', path: '/app/map', icon: Map },
  { name: 'History', path: '/app/history', icon: Clock },
  { name: 'Sensors', path: '/app/diagnostics', icon: Activity },
  { name: 'Profile', path: '/app/profile', icon: User },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 md:hidden safe-bottom">
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
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors relative',
                isActive ? 'text-brand-600' : 'text-gray-400'
              )}
            >
              {isActive && (
                <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-600 rounded-full" />
              )}
              <Icon
                className={clsx(
                  'w-5 h-5 transition-transform',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={clsx(
                  'text-[10px] leading-none',
                  isActive ? 'font-bold' : 'font-medium'
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
