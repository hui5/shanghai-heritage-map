import type {
  UnifiedCollection,
  UnifiedFeature,
} from "@/components/Map/historical/types";
import { proxyImage } from "./proxyImage";

// Simple in-memory cache for Wikimedia results
// - De-duplicates by pageid
// - Tracks last fetch position to decide re-fetch threshold

export interface WikimapItem {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  url: string; // media file url
  thumburl?: string;
  width?: number;
  height?: number;
  thumbwidth?: number;
  thumbheight?: number;
}

interface FetchHistoryEntry {
  lng: number;
  lat: number;
  timestamp: number;
}

interface CacheData {
  version: string;
  timestamp: number;
  features: UnifiedFeature[];
  fetchHistory: FetchHistoryEntry[];
  lastFetchPoint: { lng: number; lat: number } | null;
}

class WikimapCache {
  private pageIdToFeature: Map<number, UnifiedFeature> = new Map();
  private fetchHistory: FetchHistoryEntry[] = [];
  private lastFetchPoint: { lng: number; lat: number } | null = null;
  private readonly CACHE_KEY = "wikimap_cache";
  private readonly CACHE_VERSION = "1.0";
  private readonly CACHE_EXPIRY_DAYS = 7; // 缓存7天

  public upsertItems(items: WikimapItem[]): void {
    let hasNewItems = false;

    for (const item of items) {
      if (!this.pageIdToFeature.has(item.pageid)) {
        const feature: UnifiedFeature = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [item.lon, item.lat],
          },
          properties: {
            pageid: item.pageid,
            title: item.title,
            url: item.url,
            thumburl: item.thumburl || "",
            width: item.width,
            height: item.height,
            thumbwidth: item.thumbwidth,
            thumbheight: item.thumbheight,
          },
        };
        this.pageIdToFeature.set(item.pageid, feature);
        hasNewItems = true;
      }
    }

    // 如果有新数据，保存到localStorage
    if (hasNewItems) {
      this.persist();
    }
  }

  public toFeatureCollection(): UnifiedCollection {
    return {
      type: "FeatureCollection",
      features: Array.from(this.pageIdToFeature.values()),
    };
  }

  public recordFetch(lng: number, lat: number): void {
    this.lastFetchPoint = { lng, lat };
    this.fetchHistory.push({ lng, lat, timestamp: Date.now() });
    if (this.fetchHistory.length > 100) {
      this.fetchHistory.shift();
    }

    // 保存fetch历史到localStorage
    this.persist();
  }

  public getLastFetchPoint(): { lng: number; lat: number } | null {
    return this.lastFetchPoint;
  }

  public shouldFetch(
    currentLng: number,
    currentLat: number,
    thresholdMeters = 50,
  ): boolean {
    if (!this.lastFetchPoint) return true;
    const d = haversineMeters(
      this.lastFetchPoint.lat,
      this.lastFetchPoint.lng,
      currentLat,
      currentLng,
    );
    return d > thresholdMeters;
  }

  // localStorage缓存管理
  private saveToLocalStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const cacheData: CacheData = {
        version: this.CACHE_VERSION,
        timestamp: Date.now(),
        features: Array.from(this.pageIdToFeature.values()),
        fetchHistory: this.fetchHistory,
        lastFetchPoint: this.lastFetchPoint,
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to save wikimap cache to localStorage:", error);
    }
  }

  private loadFromLocalStorage(): boolean {
    if (typeof window === "undefined") return false;

    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return false;

      const cacheData: CacheData = JSON.parse(cached);

      // 检查版本和过期时间
      if (cacheData.version !== this.CACHE_VERSION) {
        this.clearLocalStorage();
        return false;
      }

      const now = Date.now();
      const cacheAge = now - cacheData.timestamp;
      const maxAge = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      if (cacheAge > maxAge) {
        this.clearLocalStorage();
        return false;
      }

      // 恢复数据
      this.pageIdToFeature.clear();
      cacheData.features.forEach((feature) => {
        const pageid = feature.properties?.pageid;
        if (pageid) {
          this.pageIdToFeature.set(pageid, feature);
        }
      });

      this.fetchHistory = cacheData.fetchHistory || [];
      this.lastFetchPoint = cacheData.lastFetchPoint;

      return true;
    } catch (error) {
      console.warn("Failed to load wikimap cache from localStorage:", error);
      this.clearLocalStorage();
      return false;
    }
  }

  private clearLocalStorage(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn("Failed to clear wikimap cache from localStorage:", error);
    }
  }

  // 初始化时从localStorage加载
  public initialize(): void {
    this.loadFromLocalStorage();
  }

  // 保存到localStorage（在数据更新后调用）
  public persist(): void {
    this.saveToLocalStorage();
  }

  // 清理过期缓存
  public cleanup(): void {
    const now = Date.now();
    const maxAge = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    // 清理过期的fetch历史
    this.fetchHistory = this.fetchHistory.filter(
      (entry) => now - entry.timestamp < maxAge,
    );

    // 如果缓存为空，清理localStorage
    if (this.pageIdToFeature.size === 0) {
      this.clearLocalStorage();
    } else {
      this.saveToLocalStorage();
    }
  }
}

// Haversine distance in meters
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const wikimapCache = new WikimapCache();

// Helper to normalize API response into WikimapItems
export function normalizeWikimapResponse(raw: any[]): WikimapItem[] {
  const items: WikimapItem[] = [];
  for (const entry of raw || []) {
    const coord = Array.isArray(entry.coordinates) && entry.coordinates[0];
    const info = Array.isArray(entry.imageinfo) && entry.imageinfo[0];
    if (!coord || !info) continue;
    items.push({
      pageid: entry.pageid,
      title: entry.title?.replace(/^File:/, "") || String(entry.pageid),
      lat: coord.lat,
      lon: coord.lon,
      url: proxyImage(info.url || info.descriptionurl || ""),
      thumburl: proxyImage(info.thumburl),
      width: typeof info.width === "number" ? info.width : undefined,
      height: typeof info.height === "number" ? info.height : undefined,
      thumbwidth:
        typeof info.thumbwidth === "number" ? info.thumbwidth : undefined,
      thumbheight:
        typeof info.thumbheight === "number" ? info.thumbheight : undefined,
    });
  }
  return items;
}
