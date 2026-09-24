/**
 * YatraSaarthi - Saved Route & Place Persistence Service
 *
 * Centralized client-side persistence for saved routes and places.
 * Stores data in localStorage and IndexedDB ('yatrasaarthi_offline_db_v1')
 * for 100% offline access to geometries, waypoints, and turn steps.
 */

import { type TravelMode, type RouteStep } from '../../stores/useRouteStore';
import { offlineStorage } from '../storage/offlineStorage';

export interface SavedPlaceItem {
  id: string;
  name: string;
  address?: string;
  type: 'place' | 'route';
  coordinates: [number, number]; // [lon, lat]
  originCoordinates?: [number, number];
  distance_meters?: number;
  duration_seconds?: number;
  geometry?: [number, number][];
  summary?: string;
  travelMode?: TravelMode;
  steps?: RouteStep[];
  createdAt?: string;
}

export const SAVED_ROUTES_STORAGE_KEY = 'yatrasaarthi_saved_routes_v1';
const SAVED_ROUTES_EVENT = 'yatrasaarthi_saved_routes_updated';

export const DEFAULT_SAVED_PLACES: SavedPlaceItem[] = [
  {
    id: 'saved-route-mahesana',
    name: 'Mahesana',
    address: 'Ahmedabad → Mahesana',
    summary: 'NH48, SH41',
    type: 'route',
    coordinates: [72.3998, 23.5880],
    originCoordinates: [72.5714, 23.0225],
    distance_meters: 86000,
    duration_seconds: 8280, // 2h 18m
    travelMode: 'driving',
    geometry: [
      [72.5714, 23.0225],
      [72.5850, 23.1120],
      [72.5720, 23.2340],
      [72.5120, 23.3850],
      [72.4410, 23.4920],
      [72.3998, 23.5880],
    ],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
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

export const savedRouteService = {
  getSavedItems(): SavedPlaceItem[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(SAVED_ROUTES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to read saved routes from localStorage:', e);
    }
    return DEFAULT_SAVED_PLACES;
  },

  setSavedItems(items: SavedPlaceItem[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVED_ROUTES_STORAGE_KEY, JSON.stringify(items));
      }
      offlineStorage.cacheSavedRoutes(items).catch((err) => {
        console.warn('Failed to sync saved routes to IndexedDB:', err);
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SAVED_ROUTES_EVENT, { detail: items }));
      }
    } catch (e) {
      console.warn('Failed to write saved routes to localStorage:', e);
    }
  },

  saveRoute(data: {
    name: string;
    coordinates: [number, number];
    originCoordinates?: [number, number];
    address?: string;
    summary?: string;
    distance_meters?: number;
    duration_seconds?: number;
    geometry?: [number, number][];
    travelMode?: TravelMode;
    steps?: RouteStep[];
  }): SavedPlaceItem {
    const items = this.getSavedItems();

    // Check if this exact route is already saved
    const existing = this.findMatchingRoute(data.coordinates, data.geometry, data.summary);
    if (existing) {
      return existing;
    }

    const newItem: SavedPlaceItem = {
      id: `saved-route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: data.name,
      address: data.address || (data.summary ? `Via ${data.summary}` : 'Saved route'),
      type: 'route',
      coordinates: data.coordinates,
      originCoordinates: data.originCoordinates,
      summary: data.summary,
      distance_meters: data.distance_meters,
      duration_seconds: data.duration_seconds,
      geometry: data.geometry,
      travelMode: data.travelMode,
      steps: data.steps,
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...items];
    this.setSavedItems(updated);
    return newItem;
  },

  removeSavedItem(id: string): boolean {
    const items = this.getSavedItems();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length !== items.length) {
      this.setSavedItems(filtered);
      return true;
    }
    return false;
  },

  findMatchingRoute(
    destinationCoords: [number, number],
    geometry?: [number, number][],
    summary?: string,
    itemsList?: SavedPlaceItem[]
  ): SavedPlaceItem | null {
    const items = itemsList || this.getSavedItems();
    return (
      items.find((item) => {
        const destMatch =
          Math.abs(item.coordinates[0] - destinationCoords[0]) < 0.0001 &&
          Math.abs(item.coordinates[1] - destinationCoords[1]) < 0.0001;

        if (!destMatch) return false;

        // If checking a route with geometry
        if (geometry && geometry.length > 0) {
          if (item.type === 'route' && item.geometry && item.geometry.length > 0) {
            // Match if geometry lengths are equal and start/end coordinates match
            const geomLengthMatch = Math.abs(item.geometry.length - geometry.length) <= 1;
            const summaryMatch = !summary || !item.summary || summary.toLowerCase() === item.summary.toLowerCase();
            const startEndMatch =
              Math.abs(item.geometry[0][0] - geometry[0][0]) < 0.0001 &&
              Math.abs(item.geometry[0][1] - geometry[0][1]) < 0.0001 &&
              Math.abs(item.geometry[item.geometry.length - 1][0] - geometry[geometry.length - 1][0]) < 0.0001 &&
              Math.abs(item.geometry[item.geometry.length - 1][1] - geometry[geometry.length - 1][1]) < 0.0001;

            return geomLengthMatch && summaryMatch && startEndMatch;
          }
          return false;
        }

        // If just coordinates match and item is a simple place
        return item.type === 'place';
      }) || null
    );
  },

  subscribe(callback: (items: SavedPlaceItem[]) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SavedPlaceItem[]>;
      callback(customEvent.detail || this.getSavedItems());
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === SAVED_ROUTES_STORAGE_KEY) {
        callback(this.getSavedItems());
      }
    };

    window.addEventListener(SAVED_ROUTES_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(SAVED_ROUTES_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  },
};
