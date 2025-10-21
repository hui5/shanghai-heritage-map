import type { UtilsMap } from "map-gl-utils";
import { create } from "zustand";

interface GlobalState {
  mapInstance: UtilsMap | null;
  setMapInstance: (instance: UtilsMap | null) => void;
  getMapInstance: () => UtilsMap | null;
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  mapInstance: null,
  setMapInstance: (instance) => set({ mapInstance: instance }),
  getMapInstance: () => get().mapInstance,
}));

// 导出便捷的访问函数
export const getMapInstance = () => useGlobalStore.getState().getMapInstance();
export const setMapInstance = (instance: UtilsMap | null) =>
  useGlobalStore.getState().setMapInstance(instance);

// 检测是否为触摸屏设备
export const isTouchDevice = (() => {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - legacy IE property
    navigator.msMaxTouchPoints > 0
  );
})();
