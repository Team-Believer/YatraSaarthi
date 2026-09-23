import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  Route,
  Navigation2,
  Plus,
  Search,
  MapPin,
  MapPinned,
  Trash2,
  X,
  Home,
  Building2,
  Plane,
  CarFront,
  Bike,
  Footprints,
  Clock3,
  Milestone,
  Compass,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useRouteStore, type TravelMode } from '../stores/useRouteStore';
import { useLocationStore } from '../stores/useLocationStore';
import { routeService } from '../services/navigation/routeService';
import { savedRouteService, type SavedPlaceItem } from '../services/navigation/savedRouteService';
import { TripRouteMap } from '../components/map/TripRouteMap';

export type { SavedPlaceItem };

type TypeFilter = 'all' | 'route' | 'place';

// Resolve appropriate contextual icon for a saved place or route
function getPlaceIcon(item: SavedPlaceItem) {
  if (item.type === 'route') return Route;
  const name = (item.name || '').toLowerCase();
  if (name.includes('home') || name.includes('house') || name.includes('flat') || name.includes('residence')) {
    return Home;
  }
  if (name.includes('office') || name.includes('work') || name.includes('corp') || name.includes('hq') || name.includes('building')) {
    return Building2;
  }
  if (name.includes('airport') || name.includes('terminal') || name.includes('flight') || name.includes('aerodrome')) {
    return Plane;
  }
  return MapPin;
}

// Resolve travel mode icon
function getTravelModeIcon(mode?: TravelMode | string) {
  const m = (mode || '').toLowerCase();
  if (m.includes('bike') || m.includes('motorcycle') || m.includes('cycl')) return Bike;
  if (m.includes('walk') || m.includes('pedestrian')) return Footprints;
  return CarFront;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '< 1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function formatDistance(meters?: number): string {
  if (!meters || meters <= 0) return '';
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export default function NavigationMemoryPage() {
  const navigate = useNavigate();
  const setDestination = useNavigationStore((s) => s.setDestination);
  const travelMode = useRouteStore((s) => s.travelMode);
  const setTravelMode = useRouteStore((s) => s.setTravelMode);
  const userLat = useLocationStore((s) => s.latitude);
  const userLon = useLocationStore((s) => s.longitude);
  const userPlaceName = useLocationStore((s) => s.placeName);

  // Saved items from persistence service
  const [savedItems, setSavedItems] = useState<SavedPlaceItem[]>(() => {
    return savedRouteService.getSavedItems();
  });

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const items = savedRouteService.getSavedItems();
    return items[0]?.id || null;
  });

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Add Modal Form State
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLon, setNewLon] = useState('72.5714');
  const [newLat, setNewLat] = useState('23.0225');

  // Subscribe to changes in saved routes
  useEffect(() => {
    const unsubscribe = savedRouteService.subscribe((updatedItems) => {
      setSavedItems(updatedItems);
      setSelectedId((prev) => {
        if (prev && updatedItems.some((item) => item.id === prev)) {
          return prev;
        }
        return updatedItems[0]?.id || null;
      });
    });
    return unsubscribe;
  }, []);

  // Counts for segmented tabs
  const routeCount = useMemo(() => savedItems.filter((i) => i.type === 'route').length, [savedItems]);
  const placeCount = useMemo(() => savedItems.filter((i) => i.type === 'place').length, [savedItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return savedItems.filter((item) => {
      // 1. Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(q);
        const addressMatch = item.address ? item.address.toLowerCase().includes(q) : false;
        const summaryMatch = item.summary ? item.summary.toLowerCase().includes(q) : false;
        if (!nameMatch && !addressMatch && !summaryMatch) {
          return false;
        }
      }

      return true;
    });
  }, [savedItems, typeFilter, searchQuery]);

  const selectedItem = useMemo(() => {
    return savedItems.find((s) => s.id === selectedId) || null;
  }, [savedItems, selectedId]);

  // Navigate Action
  const handleNavigate = (item: SavedPlaceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.travelMode) {
      setTravelMode(item.travelMode);
    }
    setDestination({
      name: item.name,
      coordinates: item.coordinates,
    });
    routeService.calculateRoutes(item.coordinates, item.travelMode || travelMode);
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

    const updated = [newItem, ...savedItems];
    savedRouteService.setSavedItems(updated);
    setSavedItems(updated);
    setSelectedId(newItem.id);
    setIsAddModalOpen(false);
    setNewName('');
    setNewAddress('');
  };

  // Quick preset autofill in Add Modal
  const handleApplyPreset = (presetName: string, defaultAddress?: string) => {
    setNewName(presetName);
    if (defaultAddress) setNewAddress(defaultAddress);
  };

  // Use current live location coordinates
  const handleUseCurrentLocation = () => {
    if (userLat !== null && userLon !== null) {
      setNewLat(userLat.toFixed(6));
      setNewLon(userLon.toFixed(6));
      if (userPlaceName && !newName) {
        setNewName(userPlaceName);
      }
    }
  };

  // Delete Action
  const handleDeletePlace = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    savedRouteService.removeSavedItem(id);
    const updated = savedItems.filter((item) => item.id !== id);
    setSavedItems(updated);
    setConfirmDeleteId(null);
    if (selectedId === id) {
      setSelectedId(updated[0]?.id || null);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedId(id);
    setIsMobileSheetOpen(true);
    setConfirmDeleteId(null);
  };

  return (
    <div className="max-w-[1240px] w-full mx-auto space-y-4 sm:space-y-5 pb-20 md:pb-10 text-ink animate-in fade-in duration-200">
      {/* 1. Mobile & Desktop Page Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border-clean pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#083335] flex items-center gap-2 font-heading">
            <Bookmark className="w-6 h-6 sm:w-7 sm:h-7 text-[#083335] fill-[#083335]/10 stroke-[2.2]" />
            <span>Saved routes</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5E5E5E] font-normal mt-1 font-body">
            Your saved places & routes
          </p>
        </div>

        {/* Compact Save a Place secondary action */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Save a place"
          className="inline-flex items-center gap-1.5 h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl bg-[#083335] text-white text-xs sm:text-sm font-semibold hover:bg-[#052426] active:bg-[#031718] transition-colors shadow-2xs shrink-0 cursor-pointer select-none"
        >
          <Plus className="w-4 h-4" />
          <span>Save a place</span>
        </button>
      </div>

      {/* 2. Controls Section: Search Bar & Segmented Control */}
      {savedItems.length > 0 && (
        <div className="space-y-3">
          {/* Search Input - 48px height, 14-16px radius, subtle border & soft shadow */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#8CA5A6] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search routes or places..."
              aria-label="Search routes or places"
              className="w-full h-12 pl-10 pr-10 bg-white border border-border-clean rounded-2xl text-xs sm:text-sm text-ink placeholder:text-[#8CA5A6] focus:outline-none focus:border-[#083335]/40 focus:ring-2 focus:ring-[#083335]/15 transition-all shadow-2xs font-body"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8CA5A6] hover:text-ink p-1 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Segmented Filter Control: All 4 | Routes 1 | Places 3 */}
          <div className="flex items-center p-1 bg-[#F5F5F5] rounded-xl border border-border-clean w-fit select-none">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={clsx(
                'px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                typeFilter === 'all'
                  ? 'bg-[#083335] text-white shadow-2xs'
                  : 'text-[#5E5E5E] hover:text-[#083335] hover:bg-[#EAEAEA]'
              )}
            >
              All {savedItems.length}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('route')}
              className={clsx(
                'px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5',
                typeFilter === 'route'
                  ? 'bg-[#083335] text-white shadow-2xs'
                  : 'text-[#5E5E5E] hover:text-[#083335] hover:bg-[#EAEAEA]'
              )}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Routes {routeCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('place')}
              className={clsx(
                'px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5',
                typeFilter === 'place'
                  ? 'bg-[#083335] text-white shadow-2xs'
                  : 'text-[#5E5E5E] hover:text-[#083335] hover:bg-[#EAEAEA]'
              )}
            >
              <MapPinned className="w-3.5 h-3.5" />
              <span>Places {placeCount}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Empty States */}
      {savedItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-border-clean space-y-4 shadow-2xs">
          <div className="w-12 h-12 bg-canvas-soft rounded-2xl flex items-center justify-center mx-auto text-[#083335]">
            <BookmarkPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-ink text-base sm:text-lg">No saved routes yet</h3>
            <p className="text-xs sm:text-sm text-[#5E5E5E] max-w-sm mx-auto mt-1 leading-relaxed font-body">
              Save frequently used places and routes for quicker navigation.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#083335] text-white text-xs font-semibold hover:bg-[#052426] transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save a place</span>
            </button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-border-clean space-y-2 text-ink-mute shadow-2xs">
          <Search className="w-6 h-6 mx-auto text-ink-mute" />
          <p className="text-xs font-medium text-ink">No matching routes or places</p>
          <p className="text-[11px] text-[#5E5E5E]">Try adjusting your search query or filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
            }}
            className="text-xs text-[#083335] font-semibold hover:underline pt-2 cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* 4. Responsive Layout: Mobile List + Desktop Two-Column */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Items List (Routes & Places with separated styling) */}
          <div className="md:col-span-5 space-y-2.5">
            {filteredItems.map((item) => {
              const isSelected = selectedId === item.id;
              const Icon = getPlaceIcon(item);
              const distStr = formatDistance(item.distance_meters);
              const durStr = formatDuration(item.duration_seconds);

              // 4A. ROUTE CARD
              if (item.type === 'route') {
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-selected={isSelected}
                    aria-label={`Select route ${item.name}`}
                    onClick={() => handleSelectItem(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectItem(item.id);
                      }
                    }}
                    className={clsx(
                      'p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 shadow-2xs',
                      isSelected
                        ? 'bg-[#083335]/[0.05] border-[#083335]/30'
                        : 'bg-white border-border-clean hover:border-[#083335]/25 hover:bg-[#F9FAFA]'
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Icon */}
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors mt-0.5',
                          isSelected
                            ? 'bg-[#083335] text-white'
                            : 'bg-canvas-soft text-[#083335] border border-border-clean'
                        )}
                      >
                        <Route className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-semibold text-sm sm:text-base text-ink truncate">
                            {item.name}
                          </span>
                          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-[#EAEAEA] text-[#5E5E5E]">
                            • Route
                          </span>
                        </div>

                        {/* Origin -> Destination or summary */}
                        <div className="text-xs text-[#5E5E5E] truncate font-body">
                          {item.address || (item.summary ? `Via ${item.summary}` : 'Saved route')}
                        </div>

                        {item.summary && item.address && item.address.includes('→') && (
                          <div className="text-[11px] text-[#8CA5A6] truncate font-body">
                            Via {item.summary}
                          </div>
                        )}

                        {/* Distance & Duration */}
                        {distStr && (
                          <div className="text-xs font-semibold text-[#083335] flex items-center gap-1.5 pt-0.5 font-heading">
                            <span>{distStr}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-[#5E5E5E] font-normal font-body">{durStr}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Small Quick Navigate Icon Button (No large text button on card) */}
                    <button
                      type="button"
                      onClick={(e) => handleNavigate(item, e)}
                      title={`Navigate to ${item.name}`}
                      aria-label={`Navigate to ${item.name}`}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8CA5A6] hover:text-[#083335] hover:bg-[#EAF0F0] active:scale-95 transition-all shrink-0 cursor-pointer"
                    >
                      <Navigation2 className="w-4 h-4 text-[#083335] fill-[#083335] rotate-45" />
                    </button>
                  </div>
                );
              }

              // 4B. PLACE CARD
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  aria-label={`Select place ${item.name}`}
                  onClick={() => handleSelectItem(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectItem(item.id);
                    }
                  }}
                  className={clsx(
                    'p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 shadow-2xs',
                    isSelected
                      ? 'bg-[#083335]/[0.05] border-[#083335]/30'
                      : 'bg-white border-border-clean hover:border-[#083335]/25 hover:bg-[#F9FAFA]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Icon */}
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-[#083335] text-white'
                          : 'bg-canvas-soft text-[#083335] border border-border-clean'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="font-heading font-semibold text-sm sm:text-base text-ink truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#5E5E5E] truncate font-body">
                        {item.address || 'Saved place'}
                      </div>
                    </div>
                  </div>

                  {/* Small Quick Navigate Icon Button */}
                  <button
                    type="button"
                    onClick={(e) => handleNavigate(item, e)}
                    title={`Navigate to ${item.name}`}
                    aria-label={`Navigate to ${item.name}`}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8CA5A6] hover:text-[#083335] hover:bg-[#EAF0F0] active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    <Navigation2 className="w-4 h-4 text-[#083335] fill-[#083335] rotate-45" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right Column: Desktop Detail Panel (Hidden on Mobile) */}
          <div className="hidden md:block md:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-border-clean shadow-2xs space-y-4">
            {selectedItem ? (
              <div className="space-y-4">
                {/* Header with Title, Type Badge & Top-Right Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-[22px] font-bold text-ink tracking-tight font-heading truncate">
                        {selectedItem.name}
                      </h2>
                      <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedItem.type === 'route' ? 'Saved Route' : 'Saved Place'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-[13px] text-[#5E5E5E] mt-1 truncate font-body">
                      {selectedItem.address || (selectedItem.summary ? `Via ${selectedItem.summary}` : 'Saved destination')}
                    </p>
                  </div>

                  {/* Top-Right Action Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      title="Saved in spatial memory"
                      className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 border border-emerald-200 inline-flex items-center justify-center"
                    >
                      <BookmarkCheck className="w-4 h-4" />
                    </span>

                    {/* Delete with inline confirmation */}
                    {confirmDeleteId === selectedItem.id ? (
                      <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg p-1 animate-in fade-in duration-150">
                        <button
                          type="button"
                          onClick={(e) => handleDeletePlace(selectedItem.id, e)}
                          className="px-2 py-0.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 rounded cursor-pointer"
                          title="Confirm deletion"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-rose-100 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(selectedItem.id)}
                        title="Delete saved item"
                        aria-label={`Delete ${selectedItem.name}`}
                        className="p-1.5 rounded-lg text-ink-mute hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Structured Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-[#F9F9F9] border border-border-clean rounded-xl text-xs select-none">
                  {/* Metric: Distance or Coordinates */}
                  {selectedItem.distance_meters && selectedItem.distance_meters > 0 ? (
                    <div>
                      <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                        Distance
                      </span>
                      <span className="font-semibold text-ink text-sm mt-0.5 flex items-center gap-1 font-heading">
                        <Milestone className="w-3.5 h-3.5 text-[#5E5E5E]" />
                        {formatDistance(selectedItem.distance_meters)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                        Coordinates
                      </span>
                      <span className="font-mono text-ink text-[11px] mt-0.5 block truncate">
                        {selectedItem.coordinates[1].toFixed(4)}, {selectedItem.coordinates[0].toFixed(4)}
                      </span>
                    </div>
                  )}

                  {/* Metric: Duration */}
                  {selectedItem.duration_seconds && selectedItem.duration_seconds > 0 ? (
                    <div>
                      <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                        Duration
                      </span>
                      <span className="font-semibold text-ink text-sm mt-0.5 flex items-center gap-1 font-heading">
                        <Clock3 className="w-3.5 h-3.5 text-[#5E5E5E]" />
                        {formatDuration(selectedItem.duration_seconds)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                        Type
                      </span>
                      <span className="font-semibold text-ink text-xs mt-0.5 block">
                        Saved place
                      </span>
                    </div>
                  )}

                  {/* Metric: Travel Mode */}
                  <div>
                    <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                      Travel Mode
                    </span>
                    <span className="font-semibold text-ink text-xs mt-0.5 flex items-center gap-1 capitalize font-body">
                      {React.createElement(getTravelModeIcon(selectedItem.travelMode), {
                        className: 'w-3.5 h-3.5 text-[#5E5E5E]',
                      })}
                      {selectedItem.travelMode || 'Car'}
                    </span>
                  </div>
                </div>

                {/* Route Preview Map */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-ink font-heading">
                      Route preview
                    </span>
                    {selectedItem.geometry && selectedItem.geometry.length >= 2 && (
                      <span className="text-[11px] text-[#5E5E5E] font-body">
                        {selectedItem.geometry.length} geometry points
                      </span>
                    )}
                  </div>

                  {selectedItem.geometry && selectedItem.geometry.length >= 2 ? (
                    <div className="rounded-xl overflow-hidden border border-border-clean shadow-2xs">
                      <TripRouteMap
                        geometry={selectedItem.geometry}
                        className="w-full h-64 sm:h-72 md:h-80"
                      />
                    </div>
                  ) : (
                    <div className="bg-[#FAFAFA] border border-border-clean rounded-xl flex flex-col items-center justify-center p-6 text-center select-none h-44 sm:h-52 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[#EAEAEA] flex items-center justify-center text-ink">
                        <MapPin className="w-5 h-5 text-[#5E5E5E]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-ink font-heading">{selectedItem.name}</p>
                        <p className="text-[11px] text-[#5E5E5E] mt-0.5 max-w-xs font-body">
                          {selectedItem.address || 'Direct coordinates saved. Select navigate to calculate active live corridor.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Action CTA: Navigate */}
                <div className="pt-4 mt-2 border-t border-border-clean flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleNavigate(selectedItem)}
                    aria-label={`Navigate to ${selectedItem.name}`}
                    className="w-full sm:w-auto min-w-[200px] max-w-[320px] h-12 px-6 rounded-xl bg-[#083335] hover:bg-[#052426] active:bg-[#031718] text-white text-sm font-semibold shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer select-none active:scale-[0.98]"
                  >
                    <Navigation2 className="w-4.5 h-4.5 fill-white text-white rotate-45 shrink-0" />
                    <span className="truncate">Navigate to {selectedItem.name}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-[#5E5E5E] space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-ink-mute" />
                <p className="text-xs font-medium text-ink font-heading">Select a saved route or place</p>
                <p className="text-[11px] text-[#5E5E5E] font-body">
                  Choose an item on the left to view its preview and navigate.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Mobile Tap Bottom Sheet Modal */}
      {isMobileSheetOpen && selectedItem && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileSheetOpen(false)}
            className="absolute inset-0 bg-[#083335]/30 backdrop-blur-2xs"
          />

          {/* Sheet Container */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] border-t border-border-clean shadow-nav-floating max-h-[78dvh] flex flex-col animate-in slide-in-from-bottom duration-250">
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Scrollable Sheet Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold font-heading text-ink truncate">
                      {selectedItem.name}
                    </h2>
                    <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedItem.type === 'route' ? 'Saved Route' : 'Saved Place'}
                    </span>
                  </div>
                  <p className="text-xs text-[#5E5E5E] mt-0.5 truncate font-body">
                    {selectedItem.address || (selectedItem.summary ? `Via ${selectedItem.summary}` : 'Saved destination')}
                  </p>
                </div>

                {/* Top-Right Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    title="Saved in spatial memory"
                    className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 border border-emerald-200 inline-flex items-center justify-center"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                  </span>

                  {/* Delete with inline confirmation */}
                  {confirmDeleteId === selectedItem.id ? (
                    <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg p-1 animate-in fade-in duration-150">
                      <button
                        type="button"
                        onClick={(e) => {
                          handleDeletePlace(selectedItem.id, e);
                          setIsMobileSheetOpen(false);
                        }}
                        className="px-2 py-0.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 rounded cursor-pointer"
                        title="Confirm deletion"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-rose-100 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selectedItem.id)}
                      title="Delete saved item"
                      aria-label={`Delete ${selectedItem.name}`}
                      className="p-1.5 rounded-lg text-ink-mute hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsMobileSheetOpen(false)}
                    aria-label="Close details"
                    className="p-1.5 rounded-lg text-ink-mute hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-[#F9F9F9] border border-border-clean rounded-xl text-xs">
                {selectedItem.distance_meters && selectedItem.distance_meters > 0 ? (
                  <div>
                    <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                      Distance
                    </span>
                    <span className="font-semibold text-ink text-sm mt-0.5 flex items-center gap-1 font-heading">
                      <Milestone className="w-3.5 h-3.5 text-[#5E5E5E]" />
                      {formatDistance(selectedItem.distance_meters)}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                      Coordinates
                    </span>
                    <span className="font-mono text-ink text-[11px] mt-0.5 block truncate">
                      {selectedItem.coordinates[1].toFixed(4)}, {selectedItem.coordinates[0].toFixed(4)}
                    </span>
                  </div>
                )}

                {selectedItem.duration_seconds && selectedItem.duration_seconds > 0 ? (
                  <div>
                    <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                      Duration
                    </span>
                    <span className="font-semibold text-ink text-sm mt-0.5 flex items-center gap-1 font-heading">
                      <Clock3 className="w-3.5 h-3.5 text-[#5E5E5E]" />
                      {formatDuration(selectedItem.duration_seconds)}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                      Type
                    </span>
                    <span className="font-semibold text-ink text-xs mt-0.5 block">
                      Saved place
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                    Travel Mode
                  </span>
                  <span className="font-semibold text-ink text-xs mt-0.5 flex items-center gap-1 capitalize font-body">
                    {React.createElement(getTravelModeIcon(selectedItem.travelMode), {
                      className: 'w-3.5 h-3.5 text-[#5E5E5E]',
                    })}
                    {selectedItem.travelMode || 'Car'}
                  </span>
                </div>
              </div>

              {/* Map Preview */}
              {selectedItem.geometry && selectedItem.geometry.length >= 2 ? (
                <div className="rounded-xl overflow-hidden border border-border-clean shadow-2xs">
                  <TripRouteMap
                    geometry={selectedItem.geometry}
                    className="w-full h-44 sm:h-48"
                  />
                </div>
              ) : (
                <div className="bg-[#FAFAFA] border border-border-clean rounded-xl flex flex-col items-center justify-center p-4 text-center select-none h-32 space-y-1">
                  <div className="w-8 h-8 rounded-full bg-[#EAEAEA] flex items-center justify-center text-ink">
                    <MapPin className="w-4 h-4 text-[#5E5E5E]" />
                  </div>
                  <p className="text-xs font-semibold text-ink font-heading">{selectedItem.name}</p>
                  <p className="text-[11px] text-[#5E5E5E] max-w-xs font-body">
                    {selectedItem.address || 'Direct coordinates saved.'}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Sheet Sticky Navigation CTA */}
            <div className="p-4 pt-2 border-t border-border-clean bg-white pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => handleNavigate(selectedItem)}
                aria-label={`Navigate to ${selectedItem.name}`}
                className="w-full h-12 px-4 rounded-xl bg-[#083335] hover:bg-[#052426] active:bg-[#031718] text-white text-sm font-semibold shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer select-none active:scale-[0.98]"
              >
                <Navigation2 className="w-4.5 h-4.5 fill-white text-white rotate-45 shrink-0" />
                <span className="truncate">Navigate to {selectedItem.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Place Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#083335]/30 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-border-clean rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-nav-floating space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border-clean pb-3">
              <div className="flex items-center gap-2">
                <MapPinned className="w-4.5 h-4.5 text-[#083335]" />
                <h3 className="text-base font-bold font-heading text-ink">Save a place</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-ink-mute hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-[#8E8E8E] uppercase tracking-wider block mb-1.5">
                Quick Presets
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Home', 'Ahmedabad, Gujarat')}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F5F5] hover:bg-[#EAEAEA] text-xs font-medium text-ink flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Home className="w-3 h-3 text-[#5E5E5E]" />
                  <span>Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Office', 'Gandhinagar, Gujarat')}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F5F5] hover:bg-[#EAEAEA] text-xs font-medium text-ink flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Building2 className="w-3 h-3 text-[#5E5E5E]" />
                  <span>Office</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Airport', 'Sardar Vallabhbhai Patel International Airport')}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F5F5] hover:bg-[#EAEAEA] text-xs font-medium text-ink flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plane className="w-3 h-3 text-[#5E5E5E]" />
                  <span>Airport</span>
                </button>
              </div>
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
                  className="w-full px-3 py-2 bg-white border border-border-clean rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-[#083335]/40 focus:ring-1 focus:ring-[#083335]/20 font-body"
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
                  className="w-full px-3 py-2 bg-white border border-border-clean rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-[#083335]/40 focus:ring-1 focus:ring-[#083335]/20 font-body"
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
                    className="w-full px-3 py-2 bg-white border border-border-clean rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-[#083335]/40"
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
                    className="w-full px-3 py-2 bg-white border border-border-clean rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-[#083335]/40"
                  />
                </div>
              </div>

              {/* Quick Fill Location */}
              {userLat !== null && userLon !== null && (
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-xs text-[#083335] hover:text-[#052426] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Use current GPS position ({userLat.toFixed(4)}, {userLon.toFixed(4)})</span>
                </button>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border-clean text-xs font-medium text-ink hover:bg-[#F3F3F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#083335] text-white text-xs font-semibold hover:bg-[#052426] transition-colors shadow-2xs cursor-pointer"
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
