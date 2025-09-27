export interface PanelBehaviorConfig {
  // Delay before auto-opening after hovering a label (ms)
  openDelayMs: number;
  // Delay before auto-hiding after mouse leaves panel and not pinned (ms)
  autoHideDelayMs: number;
  // Minimum zoom level to enable hover opening
  minZoom: number;
  // Default size and position
  defaultLeft: number;
  defaultTop: number;
  defaultWidth: number;
  defaultHeight: number;
  // Collapsed height while loading for smaller panel footprint
  loadingCollapsedHeight: number;
  // Whether to update content when hovering a new label while open
  updateWhileOpen: boolean;
}

export const PANEL: PanelBehaviorConfig = {
  openDelayMs: 300,
  autoHideDelayMs: 500,
  minZoom: 12,
  defaultLeft:
    typeof window !== "undefined"
      ? Math.round(window.innerWidth * 0.5) - 200
      : 3,
  defaultTop:
    typeof window !== "undefined" ? Math.round(window.innerHeight * 0.15) : 100,
  defaultWidth: 400,
  // Use 80% of viewport height as initial panel height; fallback for SSR
  defaultHeight:
    typeof window !== "undefined" ? Math.round(window.innerHeight * 0.6) : 700,
  // Target height when loading to avoid tall empty panel
  loadingCollapsedHeight: 140,
  updateWhileOpen: false,
};
