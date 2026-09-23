/**
 * YatraSaarthi - High-Performance Client-Side Geocoding Cache & Service
 *
 * Resolves human-readable locality and city names from coordinates using the
 * existing Mapbox Geocoding API with multi-tier memory + localStorage caching.
 */

const MAPBOX_TOKEN = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_MAPBOX_TOKEN : '') || '';
const GEO_CACHE_STORAGE_KEY = 'yatrasaarthi_geocache_v1';

export function getCoordKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

class GeocodingService {
  private memoryCache: Map<string, string> = new Map();
  private pendingRequests: Map<string, Promise<string | null>> = new Map();

  constructor() {
    this.loadCacheFromStorage();
  }

  private loadCacheFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      const stored = localStorage.getItem(GEO_CACHE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string') {
              this.memoryCache.set(k, v);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load geocache from localStorage:', e);
    }
  }

  private persistCache() {
    try {
      const obj: Record<string, string> = {};
      this.memoryCache.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(GEO_CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to persist geocache to localStorage:', e);
    }
  }

  /**
   * Synchronously gets cached location name if available
   */
  public getCachedName(lat: number, lon: number): string | null {
    const key = getCoordKey(lat, lon);
    return this.memoryCache.get(key) || null;
  }

  /**
   * Asynchronously resolves a coordinate pair to a human-readable place name
   */
  public async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    if (lat === null || lat === undefined || lon === null || lon === undefined) {
      return null;
    }
    if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return null;
    }

    const key = getCoordKey(lat, lon);

    // 1. Check memory / local storage cache
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)!;
    }

    // 2. Check in-flight pending request for the same coordinate
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    if (!MAPBOX_TOKEN) {
      return null;
    }

    // 3. Make Mapbox Geocoding request
    const requestPromise = (async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=neighborhood,locality,place,district&limit=1&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const feat = data.features[0];
          let placeName = '';

          const text = feat.text || '';
          const context = feat.context || [];
          const parentPlace = context.find((c: any) => c.id?.startsWith('place') || c.id?.startsWith('locality'))?.text;
          const region = context.find((c: any) => c.id?.startsWith('region'))?.text;

          if (text && parentPlace && !parentPlace.toLowerCase().includes(text.toLowerCase())) {
            placeName = `${text}, ${parentPlace}`;
          } else if (text) {
            placeName = text;
          } else if (feat.place_name) {
            placeName = feat.place_name.split(',').slice(0, 2).join(', ').trim();
          }

          if (!placeName && region) {
            placeName = region;
          }

          if (placeName) {
            this.memoryCache.set(key, placeName);
            this.persistCache();
            return placeName;
          }
        }
      } catch (err) {
        console.warn(`Geocoding error for ${lat},${lon}:`, err);
      } finally {
        this.pendingRequests.delete(key);
      }
      return null;
    })();

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Batch resolves multiple coordinates and updates cache
   */
  public async resolveCoordinates(
    coords: Array<{ lat: number; lon: number }>
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const promises: Promise<void>[] = [];

    for (const { lat, lon } of coords) {
      if (lat === null || lat === undefined || lon === null || lon === undefined) continue;
      const key = getCoordKey(lat, lon);

      if (this.memoryCache.has(key)) {
        results[key] = this.memoryCache.get(key)!;
      } else {
        promises.push(
          this.reverseGeocode(lat, lon).then((name) => {
            if (name) {
              results[key] = name;
            }
          })
        );
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    // Populate all cached items
    for (const { lat, lon } of coords) {
      const key = getCoordKey(lat, lon);
      const cached = this.memoryCache.get(key);
      if (cached) {
        results[key] = cached;
      }
    }

    return results;
  }
}

export const geocodingService = new GeocodingService();
