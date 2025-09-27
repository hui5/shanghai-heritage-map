import { proxyImage } from "./proxyImage";

import type {
  UnifiedCollection,
  UnifiedFeature,
} from "@/components/Map/historical/types";

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

class WikimapCache {
  private pageIdToFeature: Map<number, UnifiedFeature> = new Map();
  private fetchHistory: FetchHistoryEntry[] = [];
  private lastFetchPoint: { lng: number; lat: number } | null = null;

  public upsertItems(items: WikimapItem[]): void {
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
      }
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
  }

  public getLastFetchPoint(): { lng: number; lat: number } | null {
    return this.lastFetchPoint;
  }

  public shouldFetch(
    currentLng: number,
    currentLat: number,
    thresholdMeters = 50
  ): boolean {
    if (!this.lastFetchPoint) return true;
    const d = haversineMeters(
      this.lastFetchPoint.lat,
      this.lastFetchPoint.lng,
      currentLat,
      currentLng
    );
    return d > thresholdMeters;
  }
}

// Haversine distance in meters
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
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
