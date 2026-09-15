import { Link, useLocation } from 'react-router-dom';
import { Navigation, Map, Clock, BrainCircuit, Settings, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const navItems = [
  { name: 'Home', path: '/app', icon: Navigation },
  { name: 'Map', path: '/app/map', icon: Map },
  { name: 'History', path: '/app/history', icon: Clock },
  { name: 'Learning Insights', path: '/app/learning', icon: BrainCircuit },
  { name: 'Diagnostics', path: '/app/diagnostics', icon: Activity },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-white border-r border-brand-100 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-brand-100">
        <Link to="/app" className="flex items-center gap-2 text-brand-600">
          <Navigation className="w-8 h-8 fill-brand-600" />
          <span className="text-xl font-bold text-brand-navy">YatraSaarthi</span>
        </Link>
      </div>
      
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={twMerge(
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-brand-50 text-brand-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand-900'
                )
              )}
            >
              <Icon className={clsx("w-5 h-5", isActive ? "text-brand-600" : "text-gray-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 m-3 bg-brand-50 rounded-xl border border-brand-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-status-success" />
          <span className="text-xs font-semibold text-brand-900">IDR Engine Active</span>
        </div>
        <p className="text-xs text-gray-500">Ready for GNSS-denied environments.</p>
      </div>
    </div>
  );
}
