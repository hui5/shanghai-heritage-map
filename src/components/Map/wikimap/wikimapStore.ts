import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  UnifiedCollection,
  UnifiedFeature,
} from "@/components/Map/historical/types";
import { proxyImage } from "../../../helper/proxyImage";

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

// Fetch configuration constants
export const WIKIMAP_DYNAMIC_RADIUS_PADDING_M = 100; // extra beyond farthest corner
export const WIKIMAP_DYNAMIC_RADIUS_MIN_M = 100; // clamp lower bound
export const WIKIMAP_DYNAMIC_RADIUS_MAX_M = 3000; // clamp upper bound
export const WIKIMAP_MIN_FETCH_THRESHOLD_M = 50; // never below this
export const WIKIMAP_FETCH_DISTANCE_THRESHOLD_FACTOR = 0.4; // fraction of current radius

interface WikimapState {
  // 数据状态
  items: Map<number, WikimapItem>;
  fetchHistory: FetchHistoryEntry[];
  lastFetchPoint: { lng: number; lat: number } | null;
  lastFetchRadius: number | null;

  // 控制状态
  isEnabled: boolean;
  isFetching: boolean;

  getFeatureCollection: () => UnifiedCollection;

  // 数据操作
  upsertItems: (items: WikimapItem[]) => void;
  clearCache: () => void;

  // 控制操作
  setEnabled: (enabled: boolean) => void;

  // 获取操作
  recordFetch: (lng: number, lat: number, radius?: number) => void;
  shouldFetch: (
    currentLng: number,
    currentLat: number,
    currentRadius: number,
    thresholdMeters?: number,
  ) => boolean;

  // Fetch 操作
  performFetch: (
    lng: number,
    lat: number,
    radiusM: number,
  ) => Promise<WikimapItem[]>;

  // 统计数据
  getFetchStats: () => {
    count: number;
    lastFetchTime: number | null;
    lastFetchLocation: { lng: number; lat: number } | null;
    lastFetchRadius: number | null;
  };
}

// Haversine distance in meters
export function haversineMeters(
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

// Compute dynamic fetch radius from center to farthest viewport corner
export function computeDynamicRadiusMeters(mapInstance: {
  getCanvas: () => HTMLCanvasElement;
  getCenter: () => { lng: number; lat: number };
  unproject: (point: [number, number]) => { lng: number; lat: number };
}): number {
  const mapCanvas = mapInstance.getCanvas();
  const mapCenter = mapInstance.getCenter();
  const rect = mapCanvas.getBoundingClientRect();

  const corners: [number, number][] = [
    [0, 0],
    [rect.width, 0],
    [rect.width, rect.height],
    [0, rect.height],
  ];

  let maxMeters = 0;
  for (const [x, y] of corners) {
    const ll = mapInstance.unproject([x, y]);
    const d = haversineMeters(mapCenter.lat, mapCenter.lng, ll.lat, ll.lng);
    if (d > maxMeters) maxMeters = d;
  }

  // Add padding and clamp to configured bounds
  const padded = maxMeters + WIKIMAP_DYNAMIC_RADIUS_PADDING_M;
  const clamped = Math.max(
    WIKIMAP_DYNAMIC_RADIUS_MIN_M,
    Math.min(WIKIMAP_DYNAMIC_RADIUS_MAX_M, padded),
  );
  return Math.round(clamped);
}

// Calculate distance threshold for fetch trigger
export function getFetchDistanceThreshold(radiusMeters: number): number {
  return Math.max(
    WIKIMAP_MIN_FETCH_THRESHOLD_M,
    Math.round(radiusMeters * WIKIMAP_FETCH_DISTANCE_THRESHOLD_FACTOR),
  );
}

export const useWikimapStore = create<WikimapState>()(
  persist(
    (set, get) => ({
      // 初始状态
      items: new Map(),
      fetchHistory: [],
      lastFetchPoint: null,
      lastFetchRadius: null,
      isEnabled: true,
      isFetching: false,

      getFeatureCollection: (): UnifiedCollection => {
        const { items } = get();
        const features: UnifiedFeature[] = Array.from(items.values()).map(
          (item) => ({
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
          }),
        );

        return {
          type: "FeatureCollection",
          features,
        };
      },

      // 数据操作
      upsertItems: (newItems: WikimapItem[]) => {
        const { items } = get();
        let hasNewItems = false;
        const updatedItems = new Map(items);

        for (const item of newItems) {
          if (!updatedItems.has(item.pageid)) {
            updatedItems.set(item.pageid, item);
            hasNewItems = true;
          }
        }

        if (hasNewItems) {
          set({ items: updatedItems });
        }
      },

      clearCache: () => {
        set({
          items: new Map(),
          fetchHistory: [],
          lastFetchPoint: null,
          lastFetchRadius: null,
        });
      },

      // 控制操作
      setEnabled: (enabled: boolean) => {
        set({ isEnabled: enabled });
      },

      // 获取操作
      recordFetch: (lng: number, lat: number, radius?: number) => {
        const { fetchHistory } = get();
        const newHistory = [
          ...fetchHistory,
          { lng, lat, timestamp: Date.now() },
        ];

        // 保持历史记录在100条以内
        if (newHistory.length > 100) {
          newHistory.shift();
        }

        set({
          lastFetchPoint: { lng, lat },
          lastFetchRadius: radius ?? null,
          fetchHistory: newHistory,
        });
      },

      shouldFetch: (
        currentLng: number,
        currentLat: number,
        currentRadius: number,
        thresholdMeters = 50,
      ) => {
        const { lastFetchPoint, lastFetchRadius } = get();
        if (!lastFetchPoint || !lastFetchRadius) return true;

        // Check if radius changed significantly
        const radiusChangedSignificantly =
          !lastFetchRadius ||
          Math.abs(currentRadius - lastFetchRadius) / lastFetchRadius > 0.25;

        // Check if moved far enough
        const distance = haversineMeters(
          lastFetchPoint.lat,
          lastFetchPoint.lng,
          currentLat,
          currentLng,
        );

        return radiusChangedSignificantly || distance > thresholdMeters;
      },

      // Fetch 操作
      performFetch: async (lng: number, lat: number, radiusM: number) => {
        const { isFetching, isEnabled } = get();
        if (!isEnabled || isFetching) return [];

        set({ isFetching: true });
        try {
          const url = `/api/wikimap?lat=${lat}&lon=${lng}&dist=${radiusM}&commons&lang=zh`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            const items = normalizeWikimapResponse(json);
            get().upsertItems(items);
            get().recordFetch(lng, lat, radiusM);
            return items;
          }
          return [];
        } catch (e) {
          console.warn("Wikimap fetch failed", e);
          return [];
        } finally {
          set({ isFetching: false });
        }
      },

      // 获取统计信息
      getFetchStats: () => {
        const { fetchHistory, lastFetchPoint, lastFetchRadius } = get();
        const lastFetch =
          fetchHistory.length > 0
            ? fetchHistory[fetchHistory.length - 1]
            : null;

        return {
          count: fetchHistory.length,
          lastFetchTime: lastFetch ? lastFetch.timestamp : null,
          lastFetchLocation: lastFetchPoint,
          lastFetchRadius: lastFetchRadius,
        };
      },
    }),
    {
      name: "wikimap-store",
      partialize: (state) => ({
        items: Array.from(state.items.entries()) as [number, WikimapItem][],
        fetchHistory: state.fetchHistory,
        lastFetchPoint: state.lastFetchPoint,
        lastFetchRadius: state.lastFetchRadius,
        isEnabled: state.isEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 将数组转换回 Map
          const itemsMap = new Map(
            state.items as unknown as [number, WikimapItem][],
          );
          state.items = itemsMap;
        }
      },
    },
  ),
);

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

export default useWikimapStore;
