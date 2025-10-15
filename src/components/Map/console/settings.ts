import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "faded" | "monochrome";
type LightPreset = "day" | "night" | "dawn" | "dusk";

export interface MapSettings {
  fontSize: number;
  theme: Theme;
  show3dObjects: boolean;
  pitch: number;
  lightPreset: LightPreset;
  // 注意：mapPosition 已移除，使用独立的位置存储系统
}

interface MapSettingsState {
  settings: MapSettings;
  setFontSize: (fontSize: number) => void;
  setTheme: (theme: Theme) => void;
  setShow3dObjects: (show: boolean) => void;
  setPitch: (pitch: number) => void;
  setLightPreset: (lightPreset: LightPreset) => void;
  // 重置所有设置到默认值
  resetAllSettings: () => void;
}

export const useMapSettings = create<MapSettingsState>()(
  persist(
    (set) => ({
      settings: {
        fontSize: 1.0,
        theme: "faded" as Theme,
        show3dObjects: true,
        pitch: 0,
        lightPreset: "day" as LightPreset,
      },
      setFontSize: (fontSize) =>
        set((state) => ({
          settings: { ...state.settings, fontSize },
        })),
      setTheme: (theme) =>
        set((state) => ({
          settings: { ...state.settings, theme },
        })),
      setShow3dObjects: (show3dObjects) =>
        set((state) => ({
          settings: { ...state.settings, show3dObjects },
        })),
      setPitch: (pitch) =>
        set((state) => ({
          settings: { ...state.settings, pitch },
        })),
      setLightPreset: (lightPreset) =>
        set((state) => ({
          settings: { ...state.settings, lightPreset },
        })),
      resetAllSettings: () =>
        set(() => ({
          settings: {
            fontSize: 1.0,
            theme: "faded" as Theme,
            show3dObjects: true,
            pitch: 0,
            lightPreset: "day" as LightPreset,
          },
        })),
    }),
    {
      name: "map-settings",
    },
  ),
);
