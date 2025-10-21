import { create } from "zustand";
import type { Image } from "../../components/Map/interaction/panel/_Images";
import type { LocationInfo } from "../../helper/map-data/LocationInfo";

export interface FavoriteImage extends Image {
  // 必须包含的额外字段
  category: string; // tab 分类名称（如 "维基共享"、"上图·照片" 等）
  locationName: string; // 来自 locationInfo.name
  locationInfo?: LocationInfo; // 完整的位置信息，用于跳转
  favoriteId: string; // 唯一标识符
  timestamp: number; // 收藏时间戳
}

interface FavoriteState {
  favorites: FavoriteImage[];
  isOpen: boolean;

  // actions
  addFavorite: (
    image: Image,
    category: string,
    locationInfo: LocationInfo,
  ) => void;
  removeFavorite: (favoriteId: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = "shanghai-heritage-favorites";

// 从 localStorage 加载收藏数据
const loadFavorites = (): FavoriteImage[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load favorites:", error);
    return [];
  }
};

// 保存收藏数据到 localStorage
const saveFavorites = (favorites: FavoriteImage[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Failed to save favorites:", error);
  }
};

// 生成唯一 ID
const generateFavoriteId = (imageUrl: string, category: string): string => {
  return `${category}::${imageUrl}`;
};

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: loadFavorites(),
  isOpen: false,

  addFavorite: (image, category, locationInfo) => {
    const favoriteId = generateFavoriteId(
      image.url || image.thumbnail,
      category,
    );
    const { favorites } = get();

    // 检查是否已经收藏
    if (favorites.some((f) => f.favoriteId === favoriteId)) {
      return;
    }

    const favoriteImage: FavoriteImage = {
      ...image,
      category,
      locationName: locationInfo.name,
      locationInfo,
      favoriteId,
      timestamp: Date.now(),
      tags: [...(image.tags || []), locationInfo.name],
    };

    const newFavorites = [favoriteImage, ...favorites];
    set({ favorites: newFavorites });
    saveFavorites(newFavorites);
  },

  removeFavorite: (favoriteId) => {
    const { favorites } = get();
    const newFavorites = favorites.filter((f) => f.favoriteId !== favoriteId);
    set({ favorites: newFavorites });
    saveFavorites(newFavorites);
  },

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  clearAll: () => {
    set({ favorites: [] });
    saveFavorites([]);
  },
}));

export default useFavoriteStore;
