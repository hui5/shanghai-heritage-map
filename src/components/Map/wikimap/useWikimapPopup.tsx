import type {
  MapboxGeoJSONFeature,
  Map as MapboxMap,
  PointLike,
  Popup,
} from "mapbox-gl";
import { useCallback, useEffect, useRef } from "react";
import { LAYER_ID } from "./WikimapLayer";

// Global tuning parameters for persistent popup behavior
export const WIKIMAP_PERSISTENT_POPUP_ZOOM = 20; // switch to persistent+auto-open mode when zoom > this

const WIKIMAP_SIZE_MIN_PX = 80; // min estimated size used for overlap estimation
const WIKIMAP_SIZE_MAX_PX = 340; // max estimated size used for overlap estimation
// Maximum allowed overlap ratio (intersection area divided by the smaller rect's area)
const WIKIMAP_MAX_OVERLAP_RATIO = 0.1; // 10%

// Minimum visible pixels to consider a popup eligible (allow partial overflow)
// Set to 0 to allow any intersection; increase to be stricter
const WIKIMAP_POPUP_MIN_VISIBLE_PX = 1;

export const useWikimapPopup = (
  mapInstance: MapboxMap | null,
  isWikimapFavorited: (url: string) => boolean,
) => {
  const persistentPopupsRef = useRef<Map<number, Popup>>(
    new Map<number, Popup>(),
  );
  const suppressedPageIdsRef = useRef<Set<number>>(new Set());
  // 生成收藏按钮HTML的共用函数
  const createFavoriteButtonHTML = useCallback(
    (
      url: string,
      thumburl: string,
      title: string,
      pageid: string,
      coordinates: [number, number],
      buttonId: string,
    ) => {
      const isFavorited = isWikimapFavorited(url);

      return `
      <button
        id="${buttonId}"
        data-url="${url}"
        onclick="
          console.log('Wikimap favorite button clicked');
          if (window.toggleWikimapFavorite) {
            const coordinates = [${coordinates[0]}, ${coordinates[1]}];
            window.toggleWikimapFavorite('${url}', '${thumburl}', '${title.replace(/'/g, "\\'")}', '${pageid}', '${buttonId}', coordinates);
          } else {
            console.error('toggleWikimapFavorite function not found');
          }
        "
        style="
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 6px;
          padding: 4px 6px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          color: ${isFavorited ? "#3b82f6" : "#6b7280"};
          pointer-events: auto;
        "
        onmouseover="this.style.background='white';"
        onmouseout="this.style.background='rgba(255, 255, 255, 0.9)';"
        title="${isFavorited ? "取消收藏" : "收藏到 Wikimap"}"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFavorited ? "currentColor" : "none"}" stroke="${isFavorited ? "none" : "currentColor"}" stroke-width="2">
          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>`;
    },
    [isWikimapFavorited],
  );

  // 生成 popup HTML 的共用函数
  const createPopupHTML = useCallback(
    (
      url: string,
      thumburl: string,
      title: string,
      pageid: string,
      coordinates: [number, number],
      buttonId: string,
      thumbwidth?: number,
      thumbheight?: number,
    ) => {
      const tw: number | undefined = thumbwidth || undefined;
      const th: number | undefined = thumbheight || undefined;
      const sizeAttrs = [
        typeof tw === "number" && tw > 0 ? `width="${tw}"` : "",
        typeof th === "number" && th > 0 ? `height="${th}"` : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 180px; max-width: 340px;">
          ${
            thumburl
              ? `<img 
                  src="${thumburl}" 
                  ${sizeAttrs} 
                  style="max-width:100%; height:auto; border-radius:6px; margin-bottom:6px; display:block; cursor:pointer;"
                  onclick="
                    if (window.openWikimapLightbox) {
                      window.openWikimapLightbox('${url}', '${thumburl}', '${title.replace(/'/g, "\\'")}');
                    }
                  "
                  onmouseover="this.style.opacity='0.9';"
                  onmouseout="this.style.opacity='1';"
                />`
              : ""
          }
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="color:#0369a1; font-weight:600; flex: 1;">${title}</span>
            ${createFavoriteButtonHTML(url, thumburl, title, pageid || "", coordinates, buttonId)}
          </div>
        </div>`;
    },
    [createFavoriteButtonHTML],
  );

  const openPersistentPopupForFeature = useCallback(
    (feature: MapboxGeoJSONFeature) => {
      if (!mapInstance) return;
      const props = feature.properties || {};
      const pageid: number | undefined = props.pageid
        ? Number(props.pageid)
        : undefined;
      if (!pageid || suppressedPageIdsRef.current.has(pageid)) return;
      if (persistentPopupsRef.current.has(pageid)) return;
      const coordinates = (feature.geometry as any).coordinates as [
        number,
        number,
      ];
      const title: string = props.title || "Wikimedia File";
      const url: string = props.url || "";
      const thumburl: string = props.thumburl || "";
      const tw: number | undefined =
        (props.thumbwidth as number) || (props.width as number) || undefined;
      const th: number | undefined =
        (props.thumbheight as number) || (props.height as number) || undefined;
      const popupId = `wikimap-popup-${pageid || Date.now()}`;
      const html = createPopupHTML(
        url,
        thumburl,
        title,
        pageid?.toString() || "",
        coordinates,
        `${popupId}-btn`,
        tw,
        th,
      );
      const popup = new window.mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        closeOnMove: false,
        maxWidth: "340px",
        offset: [0, -3],
        anchor: "bottom",
      })
        .setLngLat(coordinates)
        .setHTML(html)
        .addTo(mapInstance);

      // Let wheel events pass through to the map while preserving close/link clicks
      try {
        const el = popup.getElement();
        const content = el?.querySelector(
          ".mapboxgl-popup-content",
        ) as HTMLElement | null;
        if (content) {
          content.style.pointerEvents = "none";
          const closeBtn = content.querySelector(
            ".mapboxgl-popup-close-button",
          ) as HTMLElement | null;
          if (closeBtn) closeBtn.style.pointerEvents = "auto";
          const anchors = content.querySelectorAll("a");
          anchors.forEach((a) => {
            (a as HTMLElement).style.pointerEvents = "auto";
          });
          // Enable pointer events for buttons (including our favorite button)
          const buttons = content.querySelectorAll("button");
          buttons.forEach((btn) => {
            (btn as HTMLElement).style.pointerEvents = "auto";
          });
          // Enable pointer events for images (for lightbox click)
          const images = content.querySelectorAll("img");
          images.forEach((img) => {
            (img as HTMLElement).style.pointerEvents = "auto";
          });
        }
      } catch {}

      popup.on("close", () => {
        try {
          if (pageid) {
            persistentPopupsRef.current.delete(pageid);
            // Remember user closed items to avoid immediate re-open in auto mode
            suppressedPageIdsRef.current.add(pageid);
          }
        } catch {}
      });

      persistentPopupsRef.current.set(pageid, popup);
    },
    [createPopupHTML, mapInstance],
  );

  const clearAllPersistentPopups = useCallback(() => {
    persistentPopupsRef.current.forEach((p) => {
      try {
        p.remove();
      } catch {}
    });
    persistentPopupsRef.current.clear();
    suppressedPageIdsRef.current.clear();
  }, []);

  const selectAutoOpenCandidates = useCallback(
    (features: MapboxGeoJSONFeature[], _zoom: number) => {
      // Always use map center as origin for radial ordering
      if (!mapInstance) return [];
      const originLngLat = mapInstance.getCenter();
      const originPoint = mapInstance.project(
        window.mapboxgl.LngLat.convert(originLngLat),
      );

      // Prepare features with projected points and radial distance from origin
      const prepared = features
        .filter((f) => !!(f.properties && (f.properties as any).pageid))
        .map((f) => {
          const coords = (f.geometry as any).coordinates as [number, number];
          const point = mapInstance.project(coords as any);
          const dx = point.x - originPoint.x;
          const dy = point.y - originPoint.y;
          const dist = Math.hypot(dx, dy);
          return { feature: f, point, dist };
        })
        .sort((a, b) => {
          if (a.dist !== b.dist) return a.dist - b.dist;
          const ap = a.feature.properties as any;
          const bp = b.feature.properties as any;
          return Number(ap.pageid) - Number(bp.pageid);
        });

      const selected: MapboxGeoJSONFeature[] = [];
      const rectangles: {
        left: number;
        right: number;
        top: number;
        bottom: number;
        area: number;
      }[] = [];
      const canvas = mapInstance.getCanvas();
      const rect = canvas.getBoundingClientRect();

      const computeIntersectionArea = (
        a: { left: number; right: number; top: number; bottom: number },
        b: { left: number; right: number; top: number; bottom: number },
      ): number => {
        const ix = Math.max(
          0,
          Math.min(a.right, b.right) - Math.max(a.left, b.left),
        );
        const iy = Math.max(
          0,
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
        );
        return ix * iy;
      };

      // Seed with already open persistent popups to keep them fixed
      try {
        persistentPopupsRef.current.forEach((popup) => {
          try {
            const lngLat = popup.getLngLat();
            const p = mapInstance.project(lngLat);
            const el = popup.getElement();
            const content = el?.querySelector(
              ".mapboxgl-popup-content",
            ) as HTMLElement | null;
            const b = content?.getBoundingClientRect();
            const w = b?.width || WIKIMAP_SIZE_MIN_PX;
            const h = b?.height || WIKIMAP_SIZE_MIN_PX;
            const left = p.x - w * 0.5;
            const right = p.x + w * 0.5;
            const top = p.y - h; // anchored bottom
            const bottom = p.y;
            rectangles.push({ left, right, top, bottom, area: w * h });
          } catch {}
        });
      } catch {}

      for (const item of prepared) {
        const f = item.feature;
        const p = item.point;
        const props: any = f.properties || {};
        const pageid: number = Number(props.pageid);
        if (suppressedPageIdsRef.current.has(pageid)) continue;

        const tw: number =
          Number(props.thumbwidth) || Number(props.width) || 200;
        const th: number =
          Number(props.thumbheight) || Number(props.height) || tw;
        // Use geometric mean as a proxy for occupied size on screen
        const sizeEstimate = Math.sqrt(Math.max(1, tw) * Math.max(1, th));
        const sizePx = Math.min(
          Math.max(WIKIMAP_SIZE_MIN_PX, sizeEstimate),
          WIKIMAP_SIZE_MAX_PX,
        );
        // Fixed anchor: 'bottom' (popup above marker). Allow partial overflow as long as
        // there is at least WIKIMAP_POPUP_MIN_VISIBLE_PX of intersection within viewport.
        const estimatedHalfWidth = sizePx * 0.5;
        const estimatedHeight = sizePx; // conservative estimate for height
        const left = p.x - estimatedHalfWidth;
        const right = p.x + estimatedHalfWidth;
        const top = p.y - estimatedHeight; // above the marker
        const bottom = p.y; // tip is at marker
        const area = (right - left) * (bottom - top);
        const visibleLeft = Math.max(0, left);
        const visibleRight = Math.min(rect.width, right);
        const visibleTop = Math.max(0, top);
        const visibleBottom = Math.min(rect.height, bottom);
        const visibleWidth = Math.max(0, visibleRight - visibleLeft);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleArea = visibleWidth * visibleHeight;
        if (
          visibleWidth < WIKIMAP_POPUP_MIN_VISIBLE_PX ||
          visibleHeight < WIKIMAP_POPUP_MIN_VISIBLE_PX ||
          visibleArea < WIKIMAP_POPUP_MIN_VISIBLE_PX
        ) {
          continue;
        }

        let ok = true;
        for (let i = 0; i < rectangles.length; i++) {
          const other = rectangles[i];
          const interArea = computeIntersectionArea(
            { left, right, top, bottom },
            other,
          );
          if (interArea > 0) {
            const smallerArea = Math.min(area, other.area);
            const overlapRatio = smallerArea > 0 ? interArea / smallerArea : 0;
            if (overlapRatio >= WIKIMAP_MAX_OVERLAP_RATIO) {
              ok = false;
              break;
            }
          }
        }
        if (ok) {
          selected.push(f);
          rectangles.push({ left, right, top, bottom, area });
        }
      }
      return selected;
    },
    [mapInstance],
  );

  const recomputeAutoPopups = useCallback(() => {
    if (!mapInstance) return [];
    try {
      if (!mapInstance.getLayer(LAYER_ID)) return;
      const zoom = mapInstance.getZoom();
      const inAutoMode = zoom > WIKIMAP_PERSISTENT_POPUP_ZOOM;
      if (!inAutoMode) return;

      const canvas = mapInstance.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const queryBox: [PointLike, PointLike] = [
        [0, 0],
        [rect.width, rect.height],
      ];
      const feats = mapInstance.queryRenderedFeatures(queryBox, {
        layers: [LAYER_ID],
      });
      if (!feats || feats.length === 0) return;

      const candidates = selectAutoOpenCandidates(feats, zoom);
      candidates.forEach((f) => {
        openPersistentPopupForFeature(f);
      });
    } catch (error) {
      console.warn("Error in recomputeAutoPopups:", error);
      return;
    }
  }, [mapInstance, selectAutoOpenCandidates, openPersistentPopupForFeature]);

  useEffect(() => {
    return () => {
      clearAllPersistentPopups();
    };
  }, [clearAllPersistentPopups]);

  return {
    createPopupHTML,
    openPersistentPopupForFeature,
    recomputeAutoPopups,
    clearAllPersistentPopups,
    persistentPopupsRef,
  };
};
