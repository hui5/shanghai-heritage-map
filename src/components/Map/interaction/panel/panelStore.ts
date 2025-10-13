import { create } from "zustand";
import type { LocationInfo } from "../../../../helper/map-data/LocationInfo";
import { PANEL } from "./panelConfig";

interface PanelState {
  isOpen: boolean;
  isPinned: boolean;
  isFullscreen: boolean;
  showOverview: boolean;
  locationInfo: LocationInfo | null;
  triggerPoint: { x: number; y: number } | null;
  aiActive: boolean; // AI 是否激活

  hoverTimerId: number | null;
  hideTimerId: number | null;

  openDelayMs: number;
  autoHideDelayMs: number;
  minZoom: number;

  // actions

  scheduleOpen: ({
    locationInfo,
    triggerPoint,
    currentZoom,
  }: {
    locationInfo: PanelState["locationInfo"];
    triggerPoint: PanelState["triggerPoint"];
    currentZoom: number;
  }) => void;

  cancelOpen: () => void;
  scheduleHide: () => void;
  cancelHide: () => void;
  setPinned: (p: boolean) => void;
  setFullscreen: (v: boolean) => void;
  toggleFullscreen: () => void;
  setOverview: (v: boolean) => void;
  toggleOverview: () => void;
  setAiActive: (v: boolean) => void;
  toggleAiActive: () => void;
  close: () => void;
  hide: () => void;
  forceHide: () => void;
  cancelAll: () => void;
}

export const usePanelStore = create<PanelState>((set, get) => ({
  isOpen: false,
  isPinned: false,
  isFullscreen: false,
  showOverview: false,
  aiActive: false,

  hoverTimerId: null,
  hideTimerId: null,

  openDelayMs: PANEL.openDelayMs,
  autoHideDelayMs: PANEL.autoHideDelayMs,
  minZoom: PANEL.minZoom,

  locationInfo: null,
  triggerPoint: null,

  scheduleOpen: ({ locationInfo, currentZoom, triggerPoint }) => {
    const { openDelayMs, minZoom, isOpen, isPinned } = get();
    const { cancelAll } = get();
    cancelAll();

    if (isOpen && isPinned) return;
    if (typeof currentZoom === "number" && currentZoom < minZoom) return;

    const id = window.setTimeout(() => {
      const { isPinned } = get();
      if (isPinned) return;

      set({ isOpen: true, locationInfo, triggerPoint, hoverTimerId: null });
    }, openDelayMs) as unknown as number;

    set({ hoverTimerId: id });
  },

  cancelOpen: () => {
    const { hoverTimerId } = get();
    if (hoverTimerId) window.clearTimeout(hoverTimerId);
    set({ hoverTimerId: null });
  },

  scheduleHide: () => {
    const { isPinned, autoHideDelayMs, hide, cancelHide } = get();
    cancelHide();
    if (isPinned) return;
    const id = window.setTimeout(hide, autoHideDelayMs) as unknown as number;
    set({ hideTimerId: id });
  },

  cancelHide: () => {
    const { hideTimerId } = get();
    if (hideTimerId) window.clearTimeout(hideTimerId);
    set({ hideTimerId: null });
  },

  cancelAll: () => {
    const { cancelOpen, cancelHide } = get();
    cancelOpen();
    cancelHide();
  },

  hide: () => {
    const { cancelHide, isPinned, isFullscreen } = get();
    cancelHide();
    if (isPinned) return;
    if (isFullscreen) return;
    set({
      isOpen: false,
    });
  },

  setPinned: (p) => set({ isPinned: p }),
  setFullscreen: (v) => set({ isFullscreen: v }),
  toggleFullscreen: () => {
    if (get().isFullscreen) {
      set({ isFullscreen: false, showOverview: false, isPinned: true });
    } else {
      set({ isFullscreen: true, showOverview: true, isPinned: true });
    }
  },

  setOverview: (v) => set({ showOverview: v }),
  toggleOverview: () => set((s) => ({ showOverview: !s.showOverview })),

  setAiActive: (v) => set({ aiActive: v }),
  toggleAiActive: () => set((s) => ({ aiActive: !s.aiActive })),

  forceHide: () => {
    const { cancelHide } = get();
    cancelHide();

    set({
      isOpen: false,
      isPinned: false,
      isFullscreen: false,
      showOverview: false,
      aiActive: false,
    });
  },

  close: () => {
    const { cancelAll, forceHide } = get();
    cancelAll();
    forceHide();
  },
}));

export default usePanelStore;
