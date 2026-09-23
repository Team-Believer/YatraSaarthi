import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Navigation2, History, Bookmark, MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';

interface MobileBottomNavProps {
  onOpenMore?: () => void;
  onOpenMenu?: () => void;
}

export default function MobileBottomNav({ onOpenMore, onOpenMenu }: MobileBottomNavProps) {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/app', icon: LayoutGrid, exact: true },
    { name: 'Navigate', path: '/app/map', icon: Navigation2, exact: false },
    { name: 'Trips', path: '/app/history', icon: History, exact: false },
    { name: 'Saved', path: '/app/memory', icon: Bookmark, exact: false },
  ];

  const isMoreActive =
    location.pathname === '/app/diagnostics' ||
    location.pathname === '/app/learning' ||
    location.pathname === '/app/settings' ||
    location.pathname === '/app/profile';

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border-clean md:hidden pb-[env(safe-area-inset-bottom)] shadow-nav-floating select-none"
    >
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              aria-label={item.name}
              className={clsx(
                'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 transition-all relative rounded-xl',
                isActive ? 'text-[#083335]' : 'text-[#8CA5A6] hover:text-[#4A6364]'
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-[#083335] rounded-full" />
              )}
              <Icon
                className={clsx(
                  'w-5 h-5 transition-transform duration-150',
                  isActive ? 'scale-105 stroke-[2.4]' : 'stroke-[1.8]'
                )}
              />
              <span
                className={clsx(
                  'text-[10.5px] leading-tight mt-1 font-body',
                  isActive ? 'font-bold text-[#083335]' : 'font-medium text-[#4A6364]'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* More Tab - Triggers Secondary Mobile More Sheet */}
        <button
          type="button"
          onClick={onOpenMore || onOpenMenu}
          aria-label="Open more menu"
          className={clsx(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 transition-all relative rounded-xl cursor-pointer',
            isMoreActive ? 'text-[#083335]' : 'text-[#8CA5A6] hover:text-[#4A6364]'
          )}
        >
          {isMoreActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-[#083335] rounded-full" />
          )}
          <MoreHorizontal
            className={clsx(
              'w-5 h-5 transition-transform duration-150',
              isMoreActive ? 'scale-105 stroke-[2.4]' : 'stroke-[1.8]'
            )}
          />
          <span
            className={clsx(
              'text-[10.5px] leading-tight mt-1 font-body',
              isMoreActive ? 'font-bold text-[#083335]' : 'font-medium text-[#4A6364]'
            )}
          >
            More
          </span>
        </button>
      </div>
    </nav>
  );
}

