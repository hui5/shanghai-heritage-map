import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "faded" | "monochrome";

export interface MapSettings {
  fontSize: number;
  theme: Theme;
  show3dObjects: boolean;
  pitch: number;
}

interface MapSettingsState {
  settings: MapSettings;
  setFontSize: (fontSize: number) => void;
  setTheme: (theme: Theme) => void;
  setShow3dObjects: (show: boolean) => void;
  setPitch: (pitch: number) => void;
}

export const useMapSettings = create<MapSettingsState>()(
  persist(
    (set) => ({
      settings: {
        fontSize: 1.0,
        theme: "faded",
        show3dObjects: true,
        pitch: 0,
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
    }),
    {
      name: "map-settings",
    },
  ),
);
