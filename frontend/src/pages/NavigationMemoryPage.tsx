import { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  Route,
  Navigation,
  Plus,
  Search,
  MapPin,
  Trash2,
  X,
  ArrowLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useRouteStore } from '../stores/useRouteStore';
import { routeService } from '../services/navigation/routeService';
import { TripRouteMap } from '../components/map/TripRouteMap';

export interface SavedPlaceItem {
  id: string;
  name: string;
  address?: string;
  type: 'place' | 'route';
  coordinates: [number, number]; // [lon, lat]
  distance_meters?: number;
  duration_seconds?: number;
  geometry?: [number, number][];
  createdAt?: string;
}

const STORAGE_KEY = 'yatrasaarthi_saved_routes_v1';

const DEFAULT_SAVED_PLACES: SavedPlaceItem[] = [
  {
    id: 'saved-home',
    name: 'Home',
    address: 'Ahmedabad, Gujarat',
    type: 'place',
    coordinates: [72.5714, 23.0225],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'saved-office',
    name: 'Office',
    address: 'Gandhinagar, Gujarat',
    type: 'place',
    coordinates: [72.6369, 23.2156],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'saved-airport',
    name: 'Airport',
    address: 'Sardar Vallabhbhai Patel International Airport',
    type: 'place',
    coordinates: [72.6347, 23.0734],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

export default function NavigationMemoryPage() {
  const navigate = useNavigate();
  const setDestination = useNavigationStore((s) => s.setDestination);
  const travelMode = useRouteStore((s) => s.travelMode);

  // Load saved places from localStorage
  const [savedItems, setSavedItems] = useState<SavedPlaceItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SAVED_PLACES;
  });

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    return DEFAULT_SAVED_PLACES[0]?.id || null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLon, setNewLon] = useState('72.5714');
  const [newLat, setNewLat] = useState('23.0225');
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [savedItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return savedItems;
    const q = searchQuery.toLowerCase().trim();
    return savedItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.address && item.address.toLowerCase().includes(q))
    );
  }, [savedItems, searchQuery]);

  const selectedItem = useMemo(() => {
    return savedItems.find((s) => s.id === selectedId) || null;
  }, [savedItems, selectedId]);

  // Navigate Action
  const handleNavigate = (item: SavedPlaceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDestination({
      name: item.name,
      coordinates: item.coordinates,
    });
    routeService.calculateRoutes(item.coordinates, travelMode);
    navigate('/app');
  };

  // Add Place Action
  const handleAddPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const lon = parseFloat(newLon) || 72.5714;
    const lat = parseFloat(newLat) || 23.0225;

    const newItem: SavedPlaceItem = {
      id: `saved-${Date.now()}`,
      name: newName.trim(),
      address: newAddress.trim() || 'Saved destination',
      type: 'place',
      coordinates: [lon, lat],
      createdAt: new Date().toISOString(),
    };

    setSavedItems((prev) => [newItem, ...prev]);
    setSelectedId(newItem.id);
    setIsAddModalOpen(false);
    setNewName('');
    setNewAddress('');
  };

  // Delete Place Action
  const handleDeletePlace = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) {
      const remaining = savedItems.filter((item) => item.id !== id);
      setSelectedId(remaining[0]?.id || null);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedId(id);
    setShowMobileDetail(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-10 text-slate-900">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border-clean pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Saved routes
          </h1>
          <p className="text-sm text-[#5E5E5E] font-normal mt-1">
            Your saved places and routes
          </p>
        </div>

        {/* Action Header Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ink text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save a place</span>
        </button>
      </div>

      {/* 2. Optional Search (if items exist) */}
      {savedItems.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved routes"
            aria-label="Search saved routes"
            className="w-full pl-10 pr-9 py-2 bg-white border border-border-clean rounded-full text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-ink/40 transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink p-1 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 3. Empty State */}
      {savedItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 sm:p-14 text-center border border-border-clean space-y-4 shadow-2xs">
          <div className="w-12 h-12 bg-canvas-soft rounded-2xl flex items-center justify-center mx-auto text-ink-mute">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-ink text-base sm:text-lg">No saved routes yet</h3>
            <p className="text-xs sm:text-sm text-ink-body max-w-sm mx-auto mt-1 leading-relaxed">
              Save a place or route while planning a trip and it will appear here.
            </p>
          </div>
          <div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save a place</span>
            </button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-border-clean space-y-2 text-ink-mute shadow-2xs">
          <Search className="w-6 h-6 mx-auto text-ink-mute" />
          <p className="text-xs font-medium text-ink">No matching saved routes</p>
          <p className="text-[11px] text-[#5E5E5E]">Try adjusting your search query.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-blue-600 font-medium hover:underline pt-2 cursor-pointer"
          >
            Clear search
          </button>
        </div>
      ) : (
        /* 4. Two-Column Layout (List + Preview) */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: Saved Places List (approx 45%) */}
          <div
            className={clsx(
              'md:col-span-5 space-y-2',
              showMobileDetail ? 'hidden md:block' : 'block'
            )}
          >
            {filteredItems.map((item) => {
              const isSelected = selectedId === item.id;
              const Icon = item.type === 'route' ? Route : Bookmark;

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => handleSelectItem(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectItem(item.id);
                    }
                  }}
                  className={clsx(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 min-h-[72px] max-h-[88px]',
                    isSelected
                      ? 'bg-[#F3F3F3] border-slate-300 text-ink shadow-2xs'
                      : 'bg-white border-border-clean hover:border-slate-300 text-ink hover:bg-[#F7F7F7]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-canvas-soft border border-border-clean flex items-center justify-center text-ink shrink-0">
                      <Icon className="w-4 h-4 text-ink-body" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="font-semibold text-sm text-ink truncate leading-tight">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#5E5E5E] truncate">
                        {item.address || (item.type === 'route' ? 'Saved route' : 'Saved place')}
                      </div>
                      {item.distance_meters && item.distance_meters > 0 && (
                        <div className="text-[11px] text-[#5E5E5E]">
                          {(item.distance_meters / 1000).toFixed(1)} km · {Math.round((item.duration_seconds || 0) / 60)} min
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Action: Navigate button */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleNavigate(item, e)}
                      title="Navigate to this location"
                      aria-label={`Navigate to ${item.name}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-ink text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 fill-white" />
                      <span>Navigate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Saved Place / Route Preview (approx 55%) */}
          <div
            className={clsx(
              'md:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5E5] shadow-2xs space-y-4',
              showMobileDetail ? 'block' : 'hidden md:block'
            )}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <button
                onClick={() => setShowMobileDetail(false)}
                aria-label="Back to saved routes"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink px-3 py-1.5 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <span className="text-xs font-medium text-[#5E5E5E]">Saved route details</span>
            </div>

            {selectedItem ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-[22px] font-bold text-ink tracking-tight leading-snug">
                      {selectedItem.name}
                    </h2>
                    <p className="text-xs sm:text-[13px] text-[#5E5E5E] mt-0.5">
                      {selectedItem.address || (selectedItem.type === 'route' ? 'Saved route' : 'Saved place')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleDeletePlace(selectedItem.id, e)}
                      title="Delete saved place"
                      aria-label="Delete saved place"
                      className="p-2 rounded-lg text-ink-mute hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Optional Real Distance/Duration Metrics */}
                {selectedItem.distance_meters && selectedItem.distance_meters > 0 && (
                  <div className="text-xs font-medium text-[#5E5E5E] flex items-center gap-1.5">
                    <span>{(selectedItem.distance_meters / 1000).toFixed(1)} km</span>
                    <span>·</span>
                    <span>{Math.round((selectedItem.duration_seconds || 0) / 60)} min</span>
                  </div>
                )}

                {/* Route Preview Section */}
                <div className="space-y-2 pt-1">
                  <span className="text-[13px] font-medium text-[#5E5E5E] block">
                    Route preview
                  </span>

                  {selectedItem.geometry && selectedItem.geometry.length >= 2 ? (
                    <TripRouteMap
                      points={selectedItem.geometry.map(([lon, lat]) => ({
                        latitude: lat,
                        longitude: lon,
                        timestamp: null,
                      }))}
                      className="w-full h-60 sm:h-64"
                    />
                  ) : (
                    <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl flex flex-col items-center justify-center p-4 text-center select-none h-24 sm:h-28">
                      <p className="text-[13px] font-semibold text-ink">Route preview unavailable</p>
                      <p className="text-[12px] text-[#5E5E5E] mt-0.5 max-w-xs">
                        This saved item does not contain route geometry.
                      </p>
                    </div>
                  )}
                </div>

                {/* Primary Action Button: Navigate */}
                <div className="pt-2">
                  <button
                    onClick={() => handleNavigate(selectedItem)}
                    className="w-full py-2.5 rounded-full bg-ink text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 fill-white" />
                    <span>Navigate to {selectedItem.name}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-[#5E5E5E] space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-ink-mute" />
                <p className="text-xs font-medium text-ink">Select a saved place</p>
                <p className="text-[11px] text-[#5E5E5E]">Choose a place on the left to inspect its details and navigate.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Add Place Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-nav-floating space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <h3 className="text-base font-bold text-ink">Save a place</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-ink-mute hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPlace} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Place Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gym, Library, Client Office"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-ink/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Address / City (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmedabad, Gujarat"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-ink/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={newLon}
                    onChange={(e) => setNewLon(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-ink/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-ink/50"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-full border border-[#E5E5E5] text-xs font-medium text-ink hover:bg-[#F3F3F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-ink text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                >
                  Save place
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
