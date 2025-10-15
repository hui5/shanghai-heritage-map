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
}

interface MapSettingsState {
  settings: MapSettings;
  setFontSize: (fontSize: number) => void;
  setTheme: (theme: Theme) => void;
  setShow3dObjects: (show: boolean) => void;
  setPitch: (pitch: number) => void;
  setLightPreset: (lightPreset: LightPreset) => void;
}

export const useMapSettings = create<MapSettingsState>()(
  persist(
    (set) => ({
      settings: {
        fontSize: 1.0,
        theme: "faded",
        show3dObjects: true,
        pitch: 0,
        lightPreset: "day",
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
    }),
    {
      name: "map-settings",
    },
  ),
);
