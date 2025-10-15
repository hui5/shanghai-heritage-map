import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MapPosition {
  center: [number, number]; // [lat, lng] 格式
  zoom: number;
  timestamp: number;
}

interface MapPositionState {
  position: MapPosition | null;
  savePosition: (center: [number, number], zoom: number) => void;
  getPosition: () => MapPosition | null;
  clearPosition: () => void;
}

// 防抖函数
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const useMapPosition = create<MapPositionState>()(
  persist(
    (set, get) => ({
      position: null,

      // 防抖的位置保存函数（延迟500ms保存，避免频繁更新）
      savePosition: debounce((center: [number, number], zoom: number) => {
        set({
          position: {
            center,
            zoom,
            timestamp: Date.now(),
          },
        });
      }, 500),

      getPosition: () => get().position,

      clearPosition: () => set({ position: null }),
    }),
    {
      name: "map-position", // 使用独立的存储键
      // 只保存位置数据，不与其他设置混合
    },
  ),
);

// 导出防抖的保存函数，供地图组件使用
export const saveMapPositionDebounced = useMapPosition.getState().savePosition;
