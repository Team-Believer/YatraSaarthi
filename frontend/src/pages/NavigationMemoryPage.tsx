import React, { useState, useEffect, useMemo } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Route,
  Navigation2,
  Plus,
  Search,
  MapPin,
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
  WifiOff,
  MoreVertical,
  Pencil,
  Edit3,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useRouteStore, type TravelMode } from '../stores/useRouteStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useSystemState } from '../hooks/useSystemState';
import { routeService } from '../services/navigation/routeService';
import { savedRouteService, formatRouteSubtitle, type SavedPlaceItem } from '../services/navigation/savedRouteService';
import { TripRouteMap } from '../components/map/TripRouteMap';
import { SavedOfflineRoutes } from '../components/navigation/SavedOfflineRoutes';

export type { SavedPlaceItem };

type TypeFilter = 'all' | 'route' | 'place' | 'offline';

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
  const { networkState } = useSystemState();

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
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Overflow and CRUD Management States
  const [actionSheetItem, setActionSheetItem] = useState<SavedPlaceItem | null>(null);
  const [editModalItem, setEditModalItem] = useState<SavedPlaceItem | null>(null);
  const [renameModalItem, setRenameModalItem] = useState<SavedPlaceItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<SavedPlaceItem | null>(null);

  // Form States for Edit / Rename
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [renameValue, setRenameValue] = useState('');

  // Add Modal Form State
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLon, setNewLon] = useState(userLon ? userLon.toFixed(6) : '');
  const [newLat, setNewLat] = useState(userLat ? userLat.toFixed(6) : '');

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

  // Filtered lists with case-insensitive search across name, address, and route roads
  const matchingRoutes = useMemo(() => {
    return savedItems.filter((item) => {
      if (item.type !== 'route') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.summary && item.summary.toLowerCase().includes(q))
      );
    });
  }, [savedItems, searchQuery]);

  const matchingPlaces = useMemo(() => {
    return savedItems.filter((item) => {
      if (item.type !== 'place') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.address && item.address.toLowerCase().includes(q))
      );
    });
  }, [savedItems, searchQuery]);

  const routeCount = useMemo(() => savedItems.filter((i) => i.type === 'route').length, [savedItems]);
  const placeCount = useMemo(() => savedItems.filter((i) => i.type === 'place').length, [savedItems]);

  const selectedItem = useMemo(() => {
    return savedItems.find((s) => s.id === selectedId) || null;
  }, [savedItems, selectedId]);

  // Navigate Action: Opens Navigate flow (/app/map) with destination prefilled
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
    navigate('/app/map');
  };

  // Add Place Action
  const handleAddPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const lon = parseFloat(newLon) || (userLon ?? 0);
    const lat = parseFloat(newLat) || (userLat ?? 0);

    const newItem = savedRouteService.savePlace({
      name: newName.trim(),
      address: newAddress.trim() || 'Saved destination',
      coordinates: [lon, lat],
    });

    setSavedItems(savedRouteService.getSavedItems());
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

  // Select Item Action (Main Row Tap)
  const handleSelectItem = (id: string) => {
    setSelectedId(id);
    setIsMobileSheetOpen(true);
  };

  // Overflow Actions: Open Sheet / Modal
  const handleOpenActionSheet = (item: SavedPlaceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionSheetItem(item);
  };

  const handleOpenEdit = (item: SavedPlaceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionSheetItem(null);
    setEditModalItem(item);
    setEditName(item.name);
    setEditAddress(item.address || (item.summary ? `Via ${item.summary}` : ''));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem || !editName.trim()) return;

    savedRouteService.updateSavedItem(editModalItem.id, {
      name: editName.trim(),
      address: editAddress.trim() || undefined,
    });
    setSavedItems(savedRouteService.getSavedItems());
    setEditModalItem(null);
  };

  const handleOpenRename = (item: SavedPlaceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionSheetItem(null);
    setRenameModalItem(item);
    setRenameValue(item.name);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModalItem || !renameValue.trim()) return;

    savedRouteService.updateSavedItem(renameModalItem.id, {
      name: renameValue.trim(),
    });
    setSavedItems(savedRouteService.getSavedItems());
    setRenameModalItem(null);
  };

  const handlePromptDelete = (item: SavedPlaceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionSheetItem(null);
    setDeleteConfirmItem(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;
    const id = deleteConfirmItem.id;
    savedRouteService.removeSavedItem(id);
    const updated = savedItems.filter((item) => item.id !== id);
    setSavedItems(updated);
    if (selectedId === id) {
      setSelectedId(updated[0]?.id || null);
    }
    setDeleteConfirmItem(null);
    if (isMobileSheetOpen && selectedItem?.id === id) {
      setIsMobileSheetOpen(false);
    }
  };

  const totalFilteredCount =
    typeFilter === 'all'
      ? matchingRoutes.length + matchingPlaces.length
      : typeFilter === 'route'
      ? matchingRoutes.length
      : matchingPlaces.length;

  return (
    <div className="max-w-[1240px] w-full mx-auto space-y-3 pb-20 md:pb-10 text-ink animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-3 pt-0.5 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#083335] font-heading">
            Saved
          </h1>
          <p className="text-xs text-[#5E5E5E] font-body mt-0.5">
            Places and routes you use often
          </p>
        </div>

        {/* '+' button (Add saved place) */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Add saved place"
          title="Add saved place"
          className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#F0F4F4] hover:bg-[#E2EBEB] active:bg-[#D5E2E2] text-[#083335] transition-colors cursor-pointer select-none active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[2.4]" />
        </button>
      </div>

      {/* Offline Alert Banner */}
      {networkState === 'OFFLINE' && (
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-2.5 text-xs text-slate-700 shadow-2xs backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
          <WifiOff className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">Offline Mode</strong> · Saved routes and route geometries are fully available without internet.
          </span>
        </div>
      )}

      {/* 2. Search Field */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#8CA5A6] pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search saved places or routes"
          aria-label="Search saved places and routes"
          className="w-full h-11 sm:h-12 pl-10 pr-10 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-ink placeholder:text-[#8CA5A6] focus:outline-none focus:border-[#083335] focus:ring-1 focus:ring-[#083335]/20 transition-all font-body"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8CA5A6] hover:text-ink w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. Filter Tabs (Dynamic Counts) */}
      {savedItems.length > 0 && (
        <div className="flex items-center gap-1.5 pt-0.5 pb-1 select-none">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5',
              typeFilter === 'all'
                ? 'bg-[#083335] text-white shadow-2xs'
                : 'text-[#5E5E5E] hover:text-[#083335] hover:bg-[#F0F2F2]'
            )}
          >
            <span>Everything</span>
            <span className={clsx('text-[11px]', typeFilter === 'all' ? 'text-white/80' : 'text-[#8CA5A6]')}>
              {savedItems.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('route')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5',
              typeFilter === 'route'
                ? 'bg-[#083335] text-white shadow-2xs'
                : 'text-[#5E5E5E] hover:text-[#083335] hover:bg-[#F0F2F2]'
            )}
          >
            <span>Routes</span>
            <span className={clsx('text-[11px]', typeFilter === 'route' ? 'text-white/80' : 'text-[#8CA5A6]')}>
              {routeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('place')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5',
              typeFilter === 'place'
                ? 'bg-[#083335] text-white shadow-2xs'
                : 'text-[#5E5E5E] hover:text-[#083335] hover:bg-[#F0F2F2]'
            )}
          >
            <span>Places</span>
            <span className={clsx('text-[11px]', typeFilter === 'place' ? 'text-white/80' : 'text-[#8CA5A6]')}>
              {placeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('offline')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5',
              typeFilter === 'offline'
                ? 'bg-[#083335] text-white shadow-2xs'
                : 'text-[#5E5E5E] hover:text-[#083335] hover:bg-[#F0F2F2]'
            )}
          >
            <span>Offline Saved</span>
          </button>
        </div>
      )}

      {/* 4. Empty State Handling */}
      {savedItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 sm:p-8 text-center border border-[#E5E7EB] space-y-3">
          <div className="w-11 h-11 bg-[#F0F4F4] text-[#083335] rounded-xl flex items-center justify-center mx-auto">
            <BookmarkPlus className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-base text-[#083335]">Your saved places and routes</h3>
            <p className="text-xs text-[#5E5E5E] max-w-xs mx-auto leading-relaxed font-body">
              will appear here.
            </p>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              aria-label="Add a place"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#083335] text-white text-xs font-semibold hover:bg-[#052426] transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add a place</span>
            </button>
          </div>
        </div>
      ) : totalFilteredCount === 0 ? (
        <div className="bg-white rounded-2xl p-6 sm:p-8 text-center border border-[#E5E7EB] space-y-2 text-[#5E5E5E]">
          <Search className="w-5 h-5 mx-auto text-[#8CA5A6]" />
          <p className="text-xs font-semibold text-[#083335] font-heading">No saved items match your search.</p>
          <p className="text-[11px] text-[#5E5E5E] font-body">Check for typos or try clearing the search.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
            }}
            aria-label="Clear search"
            className="text-xs text-[#083335] font-semibold hover:underline pt-1 cursor-pointer"
          >
            Clear search
          </button>
        </div>
      ) : typeFilter === 'offline' ? (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E7EB] shadow-2xs">
          <SavedOfflineRoutes />
        </div>
      ) : (
        /* 5. Content Sections: Visually Consistent Native Hierarchy */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <div className="md:col-span-5 space-y-4">
            {/* OFFLINE SAVED ROUTES (when all) */}
            {typeFilter === 'all' && (
              <div className="space-y-1.5">
                <SavedOfflineRoutes />
              </div>
            )}

            {/* 5A. FREQUENT ROUTES SECTION */}
            {(typeFilter === 'all' || typeFilter === 'route') && matchingRoutes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#8CA5A6] uppercase tracking-wider block px-1">
                  Frequent Routes
                </span>

                <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-[#F0F2F2] overflow-hidden">
                  {matchingRoutes.map((item) => {
                    const isSelected = selectedId === item.id;
                    const distStr = formatDistance(item.distance_meters);
                    const durStr = formatDuration(item.duration_seconds);
                    const subtitle = formatRouteSubtitle(item);

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        aria-selected={isSelected}
                        aria-label={`View details for ${item.name}`}
                        onClick={() => handleSelectItem(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectItem(item.id);
                          }
                        }}
                        className={clsx(
                          'p-3 sm:p-3.5 transition-colors cursor-pointer select-none flex items-center justify-between gap-3 min-h-[64px]',
                          isSelected
                            ? 'bg-[#083335]/[0.05] border-l-2 border-l-[#083335]'
                            : 'hover:bg-[#F9FBFA] active:bg-[#F0F4F4]'
                        )}
                      >
                        {/* Consistent Row: [Icon] + Title / Subtitle (2-line clamp) / Metadata */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-6 h-6 flex items-center justify-center text-[#083335] shrink-0 self-start mt-0.5">
                            <Route className="w-5 h-5 stroke-[2]" />
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="font-heading font-semibold text-sm sm:text-base text-[#083335] truncate leading-tight">
                              {item.name}
                            </div>
                            <div className="text-xs text-[#5E5E5E] font-body line-clamp-2 leading-snug break-words">
                              {subtitle}
                            </div>
                            {distStr && (
                              <div className="text-xs font-semibold text-[#083335] flex items-center gap-1.5 pt-0.5 font-heading">
                                <span>{distStr}</span>
                                <span className="text-slate-300">·</span>
                                <span className="text-[#5E5E5E] font-normal font-body">{durStr}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Trailing Action Zone: Overflow Menu (⋯) + Navigate Arrow (↗) */}
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenActionSheet(item, e)}
                            title={`More options for ${item.name}`}
                            aria-label={`More options for ${item.name}`}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8CA5A6] hover:text-[#083335] hover:bg-[#EAEAEA] active:scale-95 transition-all cursor-pointer"
                          >
                            <MoreVertical className="w-4.5 h-4.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleNavigate(item, e)}
                            title={`Navigate to ${item.name}`}
                            aria-label={`Navigate to ${item.name}`}
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#083335] hover:bg-[#E6EDED] active:scale-95 transition-all cursor-pointer"
                          >
                            <Navigation2 className="w-5 h-5 text-[#083335] fill-[#083335] rotate-45" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5B. SAVED PLACES SECTION */}
            {(typeFilter === 'all' || typeFilter === 'place') && matchingPlaces.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#8CA5A6] uppercase tracking-wider block px-1">
                  Saved Places
                </span>

                <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-[#F0F2F2] overflow-hidden">
                  {matchingPlaces.map((item) => {
                    const Icon = getPlaceIcon(item);
                    const isSelected = selectedId === item.id;

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        aria-selected={isSelected}
                        aria-label={`View details for ${item.name}`}
                        onClick={() => handleSelectItem(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectItem(item.id);
                          }
                        }}
                        className={clsx(
                          'p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none min-h-[60px]',
                          isSelected
                            ? 'bg-[#083335]/[0.05] border-l-2 border-l-[#083335]'
                            : 'hover:bg-[#F9FBFA] active:bg-[#F0F4F4]'
                        )}
                      >
                        {/* Consistent Row: [Icon] + Title / Subtitle (2-line clamp) */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-6 h-6 flex items-center justify-center text-[#083335] shrink-0 self-start mt-0.5">
                            <Icon className="w-5 h-5 stroke-[2]" />
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="font-heading font-semibold text-sm text-[#083335] truncate leading-tight">
                              {item.name}
                            </div>
                            <div className="text-xs text-[#5E5E5E] font-body line-clamp-2 leading-snug break-words">
                              {item.address || 'Saved place'}
                            </div>
                          </div>
                        </div>

                        {/* Trailing Action Zone: Overflow Menu (⋯) + Navigate Arrow (↗) */}
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenActionSheet(item, e)}
                            title={`More options for ${item.name}`}
                            aria-label={`More options for ${item.name}`}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8CA5A6] hover:text-[#083335] hover:bg-[#EAEAEA] active:scale-95 transition-all cursor-pointer"
                          >
                            <MoreVertical className="w-4.5 h-4.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleNavigate(item, e)}
                            title={`Navigate to ${item.name}`}
                            aria-label={`Navigate to ${item.name}`}
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#083335] hover:bg-[#E6EDED] active:scale-95 transition-all cursor-pointer"
                          >
                            <Navigation2 className="w-5 h-5 text-[#083335] fill-[#083335] rotate-45" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Desktop Detail Panel (Hidden on Mobile) */}
          <div className="hidden md:block md:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E7EB] shadow-xs space-y-4">
            {selectedItem ? (
              <div className="space-y-4">
                {/* Header */}
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

                    <p className="text-xs sm:text-[13px] text-[#5E5E5E] mt-1 font-body break-words">
                      {selectedItem.type === 'route'
                        ? formatRouteSubtitle(selectedItem)
                        : (selectedItem.address || 'Saved destination')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      title="Saved in spatial memory"
                      className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 border border-emerald-200 inline-flex items-center justify-center"
                    >
                      <BookmarkCheck className="w-4 h-4" />
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(selectedItem, e)}
                      title={`Edit ${selectedItem.name}`}
                      aria-label={`Edit ${selectedItem.name}`}
                      className="p-2 rounded-lg text-ink-mute hover:text-[#083335] hover:bg-[#F0F2F2] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handlePromptDelete(selectedItem, e)}
                      title={`Delete ${selectedItem.name}`}
                      aria-label={`Delete ${selectedItem.name}`}
                      className="p-2 rounded-lg text-ink-mute hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Structured Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl text-xs select-none">
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
                    <div className="rounded-xl overflow-hidden border border-[#E5E7EB] shadow-2xs">
                      <TripRouteMap
                        geometry={selectedItem.geometry}
                        className="w-full h-64 sm:h-72 md:h-80"
                      />
                    </div>
                  ) : (
                    <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl flex flex-col items-center justify-center p-6 text-center select-none h-44 sm:h-52 space-y-2">
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

                {/* Primary Action CTA */}
                <div className="pt-4 mt-2 border-t border-[#E5E7EB] flex items-center justify-end">
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

      {/* 6. Mobile Route/Place Detail Bottom Sheet */}
      {isMobileSheetOpen && selectedItem && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            onClick={() => setIsMobileSheetOpen(false)}
            className="absolute inset-0 bg-[#083335]/30 backdrop-blur-2xs"
          />

          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] border-t border-[#E5E7EB] shadow-nav-floating max-h-[85dvh] flex flex-col animate-in slide-in-from-bottom duration-250">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

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
                  <p className="text-xs text-[#5E5E5E] mt-0.5 font-body break-words">
                    {selectedItem.type === 'route'
                      ? formatRouteSubtitle(selectedItem)
                      : (selectedItem.address || 'Saved destination')}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(selectedItem, e)}
                    title={`Edit ${selectedItem.name}`}
                    aria-label={`Edit ${selectedItem.name}`}
                    className="p-2 rounded-lg text-ink-mute hover:text-[#083335] hover:bg-[#F0F2F2] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handlePromptDelete(selectedItem, e)}
                    title={`Delete ${selectedItem.name}`}
                    aria-label={`Delete ${selectedItem.name}`}
                    className="p-2 rounded-lg text-ink-mute hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMobileSheetOpen(false)}
                    aria-label="Close details"
                    className="p-2 rounded-lg text-ink-mute hover:text-ink hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Map Preview */}
              {selectedItem.geometry && selectedItem.geometry.length >= 2 ? (
                <div className="rounded-xl overflow-hidden border border-[#E5E7EB] shadow-2xs">
                  <TripRouteMap
                    geometry={selectedItem.geometry}
                    className="w-full h-48 sm:h-56"
                  />
                </div>
              ) : (
                <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl flex flex-col items-center justify-center p-4 text-center select-none h-32 space-y-1">
                  <div className="w-8 h-8 rounded-full bg-[#EAEAEA] flex items-center justify-center text-ink">
                    <MapPin className="w-4 h-4 text-[#5E5E5E]" />
                  </div>
                  <p className="text-xs font-semibold text-ink font-heading">{selectedItem.name}</p>
                  <p className="text-[11px] text-[#5E5E5E] max-w-xs font-body">
                    {selectedItem.address || 'Direct coordinates saved.'}
                  </p>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl text-xs">
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
            </div>

            {/* Bottom Sheet Sticky Navigation CTA */}
            <div className="p-4 pt-2 border-t border-[#E5E7EB] bg-white pb-[calc(1rem+env(safe-area-inset-bottom))]">
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

      {/* 7. Compact Mobile Action Sheet for Overflow ⋯ */}
      {actionSheetItem && (
        <div className="fixed inset-0 z-50 bg-[#083335]/30 backdrop-blur-2xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div
            onClick={() => setActionSheetItem(null)}
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-[#E5E7EB] shadow-nav-floating p-4 space-y-2 animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F2F2]">
              <div>
                <h4 className="font-heading font-semibold text-sm text-[#083335] truncate max-w-[240px]">
                  {actionSheetItem.name}
                </h4>
                <p className="text-[11px] text-[#5E5E5E] font-body">
                  {actionSheetItem.type === 'route' ? 'Saved Route' : 'Saved Place'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionSheetItem(null)}
                aria-label="Close options"
                className="p-1 rounded-full text-ink-mute hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 pt-1">
              <button
                type="button"
                onClick={() => handleOpenEdit(actionSheetItem)}
                aria-label={`Edit ${actionSheetItem.name}`}
                className="w-full px-3 py-2.5 rounded-xl hover:bg-[#F0F4F4] active:bg-[#E2EBEB] text-ink text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
              >
                <Pencil className="w-4 h-4 text-[#083335]" />
                <span>Edit details</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenRename(actionSheetItem)}
                aria-label={`Rename ${actionSheetItem.name}`}
                className="w-full px-3 py-2.5 rounded-xl hover:bg-[#F0F4F4] active:bg-[#E2EBEB] text-ink text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
              >
                <Edit3 className="w-4 h-4 text-[#083335]" />
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={() => handlePromptDelete(actionSheetItem)}
                aria-label={`Delete ${actionSheetItem.name}`}
                className="w-full px-3 py-2.5 rounded-xl hover:bg-rose-50 active:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Edit Item Modal */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-[#083335]/30 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-nav-floating space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold font-heading text-ink">
                Edit {editModalItem.type === 'route' ? 'Saved Route' : 'Saved Place'}
              </h3>
              <button
                type="button"
                onClick={() => setEditModalItem(null)}
                aria-label="Close edit modal"
                className="p-1 rounded-full text-ink-mute hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-[#083335] focus:ring-1 focus:ring-[#083335]/20 font-body"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Address / Description
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. Ahmedabad, Gujarat"
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-[#083335] focus:ring-1 focus:ring-[#083335]/20 font-body"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] text-xs font-medium text-ink hover:bg-[#F3F3F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#083335] text-white text-xs font-semibold hover:bg-[#052426] transition-colors shadow-2xs cursor-pointer"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Rename Item Modal */}
      {renameModalItem && (
        <div className="fixed inset-0 z-50 bg-[#083335]/30 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-nav-floating space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold font-heading text-ink">Rename Item</h3>
              <button
                type="button"
                onClick={() => setRenameModalItem(null)}
                aria-label="Close rename modal"
                className="p-1 rounded-full text-ink-mute hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  New Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-[#083335] focus:ring-1 focus:ring-[#083335]/20 font-body"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameModalItem(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] text-xs font-medium text-ink hover:bg-[#F3F3F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#083335] text-white text-xs font-semibold hover:bg-[#052426] transition-colors shadow-2xs cursor-pointer"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Small Confirmation Modal for Delete */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-[#083335]/30 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-nav-floating space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold font-heading text-ink">
                Delete {deleteConfirmItem.type === 'route' ? 'Route' : 'Place'}?
              </h3>
            </div>

            <p className="text-xs text-[#5E5E5E] font-body leading-relaxed">
              Are you sure you want to remove <strong className="text-ink">"{deleteConfirmItem.name}"</strong>? This saved item will be removed from memory.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] text-xs font-medium text-ink hover:bg-[#F3F3F3] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Add Place Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#083335]/30 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-nav-floating space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold font-heading text-ink">Add saved place</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
                className="p-1 rounded-full text-ink-mute hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
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
                  <Home className="w-3.5 h-3.5 text-[#083335]" />
                  <span>Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Office', 'Gandhinagar, Gujarat')}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F5F5] hover:bg-[#EAEAEA] text-xs font-medium text-ink flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#083335]" />
                  <span>Office</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Airport', 'Sardar Vallabhbhai Patel International Airport, Ahmedabad')}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F5F5] hover:bg-[#EAEAEA] text-xs font-medium text-ink flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plane className="w-3.5 h-3.5 text-[#083335]" />
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
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-[#083335] focus:ring-1 focus:ring-[#083335]/20 font-body"
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
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-[#083335] focus:ring-1 focus:ring-[#083335]/20 font-body"
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
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-[#083335]"
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
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-[#083335]"
                  />
                </div>
              </div>

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
                  className="px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] text-xs font-medium text-ink hover:bg-[#F3F3F3] cursor-pointer"
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
