import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Navigation2, History, Bookmark } from 'lucide-react';
import { clsx } from 'clsx';

export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/app', icon: LayoutGrid, exact: true },
    {
      name: 'Navigate',
      path: '/app/map',
      icon: (props: any) => <Navigation2 {...props} className={clsx(props.className, 'rotate-45')} />,
      exact: false,
    },
    { name: 'Trips', path: '/app/history', icon: History, exact: false },
    { name: 'Saved', path: '/app/memory', icon: Bookmark, exact: false },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border-clean md:hidden pb-[env(safe-area-inset-bottom)] shadow-nav-floating select-none"
    >
      <div className="grid grid-cols-4 h-[60px] px-2 max-w-lg mx-auto">
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
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'flex flex-col items-center justify-center min-h-[44px] py-1 transition-all relative rounded-xl',
                isActive ? 'text-[#083335]' : 'text-[#8CA5A6] hover:text-[#4A6364]'
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#083335] rounded-full" />
              )}
              <Icon
                className={clsx(
                  'w-5 h-5 transition-transform duration-150',
                  isActive ? 'scale-105 stroke-[2.4]' : 'stroke-[1.8]'
                )}
              />
              <span
                className={clsx(
                  'text-[11px] leading-tight mt-1 font-body',
                  isActive ? 'font-bold text-[#083335]' : 'font-medium text-[#4A6364]'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


