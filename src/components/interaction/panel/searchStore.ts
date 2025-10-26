import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LocationInfo } from "../../../helper/map-data/LocationInfo";

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  locationInfo: LocationInfo;
  coordinates: [number, number];
  searchResults?: any; // 保存查询结果，用于直接展示
}

interface SearchHistoryState {
  history: SearchHistoryItem[];
  maxHistoryItems: number;

  // Actions
  addSearchHistory: (item: Omit<SearchHistoryItem, "id" | "timestamp">) => void;
  removeSearchHistory: (id: string) => void;
  clearHistory: () => void;
  getHistory: () => SearchHistoryItem[];
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      maxHistoryItems: 50, // 最大保存50条记录

      addSearchHistory: (item) => {
        const { history, maxHistoryItems } = get();
        const newItem: SearchHistoryItem = {
          ...item,
          id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };

        // 检查是否已存在相同的查询（基于查询内容和坐标）
        const existingIndex = history.findIndex(
          (h) =>
            h.query === newItem.query &&
            h.coordinates[0] === newItem.coordinates[0] &&
            h.coordinates[1] === newItem.coordinates[1],
        );

        let newHistory: SearchHistoryItem[];
        if (existingIndex !== -1) {
          // 如果存在，更新现有记录的时间戳
          newHistory = [...history];
          newHistory[existingIndex] = newItem;
        } else {
          // 如果不存在，添加新记录
          newHistory = [newItem, ...history];
        }

        // 限制历史记录数量
        if (newHistory.length > maxHistoryItems) {
          newHistory = newHistory.slice(0, maxHistoryItems);
        }

        set({ history: newHistory });
      },

      removeSearchHistory: (id) => {
        const { history } = get();
        set({ history: history.filter((item) => item.id !== id) });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      getHistory: () => {
        return get().history;
      },
    }),
    {
      name: "search-history-storage",
      version: 1,
    },
  ),
);

export default useSearchHistoryStore;
