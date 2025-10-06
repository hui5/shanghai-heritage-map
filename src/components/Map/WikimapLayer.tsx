import mapboxgl from "mapbox-gl";
import type React from "react";
import { useEffect, useRef } from "react";
import { normalizeWikimapResponse, wikimapCache } from "@/helper/wikimapCache";

interface WikimapLayerProps {
  mapInstance: mapboxgl.Map | null;
}

const SOURCE_ID = "openda_wikimap-source";
const LAYER_ID = "openda_wikimap-layer";
const MIN_ZOOM = 18;

// Global tuning parameters for persistent popup behavior
const WIKIMAP_PERSISTENT_POPUP_ZOOM = 20; // switch to persistent+auto-open mode when zoom > this
const WIKIMAP_SIZE_MIN_PX = 80; // min estimated size used for overlap estimation
const WIKIMAP_SIZE_MAX_PX = 340; // max estimated size used for overlap estimation
// Maximum allowed overlap ratio (intersection area divided by the smaller rect's area)
const WIKIMAP_MAX_OVERLAP_RATIO = 0.1; // 10%

// Minimum visible pixels to consider a popup eligible (allow partial overflow)
// Set to 0 to allow any intersection; increase to be stricter
const WIKIMAP_POPUP_MIN_VISIBLE_PX = 1;

// Dynamic fetch radius controls (meters)
const WIKIMAP_DYNAMIC_RADIUS_PADDING_M = 100; // extra beyond farthest corner
const WIKIMAP_DYNAMIC_RADIUS_MIN_M = 100; // clamp lower bound
const WIKIMAP_DYNAMIC_RADIUS_MAX_M = 3000; // clamp upper bound

// Fetch trigger thresholds
const WIKIMAP_MIN_FETCH_THRESHOLD_M = 50; // never below this
const WIKIMAP_FETCH_DISTANCE_THRESHOLD_FACTOR = 0.4; // fraction of current radius

export const WikimapLayer: React.FC<WikimapLayerProps> = ({ mapInstance }) => {
  const iconImageId = "wikimap_marker";
  const lastMouseLngLatRef = useRef<mapboxgl.LngLatLike | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const isOverFeatureRef = useRef<boolean>(false);
  const isPopupHoveredRef = useRef<boolean>(false);
  const persistentPopupsRef = useRef<Map<number, mapboxgl.Popup>>(new Map());
  const suppressedPageIdsRef = useRef<Set<number>>(new Set());
  const autoModeRef = useRef<boolean>(false);
  const recomputeTimerRef = useRef<number | null>(null);
  const recomputeAutoPopupsRef = useRef<() => void>(() => {});

  // Ensure marker icon is loaded into the style image registry
  useEffect(() => {
    if (!mapInstance) return;

    const addIconIfMissing = async () => {
      if (!mapInstance) return;

      if (!mapInstance.hasImage(iconImageId)) {
        try {
          const response = await fetch("/icons/wikimap-marker.png");
          const blob = await response.blob();
          const bitmap = await createImageBitmap(blob);
          mapInstance.addImage(iconImageId, bitmap, { pixelRatio: 2 });
        } catch (e) {
          console.warn("Failed to load marker icon", e);
        }
      }
    };

    addIconIfMissing();

    return () => {
      try {
        if (mapInstance?.hasImage(iconImageId)) {
          mapInstance.removeImage(iconImageId);
        }
      } catch {}
    };
  }, [mapInstance]);

  // Initialize source and layer
  useEffect(() => {
    if (!mapInstance) return;

    const fc = wikimapCache.toFeatureCollection();
    try {
      if (!mapInstance.getSource(SOURCE_ID)) {
        mapInstance.addSource(SOURCE_ID, { type: "geojson", data: fc });
      } else {
        (mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
          fc,
        );
      }
    } catch {}

    try {
      if (!mapInstance.getLayer(LAYER_ID)) {
        const layerConfig: any = {
          id: LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          layout: {
            "icon-image": iconImageId,
            "icon-size": 0.6,
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
          },
          minzoom: MIN_ZOOM,
        };
        mapInstance.addLayer(layerConfig);
      }
    } catch (error) {
      console.warn("Error checking or adding layer:", error);
    }
  }, [mapInstance]);

  // Hover tooltip with title and thumbnail
  useEffect(() => {
    if (!mapInstance) return;

    const tooltip = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      closeOnMove: false,
      maxWidth: "340px",
      offset: [0, -3],
      anchor: "bottom",
    });

    const maybeClose = () => {
      if (!isOverFeatureRef.current && !isPopupHoveredRef.current) {
        if (tooltip.isOpen()) tooltip.remove();
        mapInstance.getCanvas().style.cursor = "";
      }
    };

    const onPopupMouseEnter = () => {
      isPopupHoveredRef.current = true;
    };
    const onPopupMouseLeave = () => {
      isPopupHoveredRef.current = false;
      // slight delay to allow pointer transition between layer and popup
      setTimeout(maybeClose, 100);
    };

    const attachPopupHoverHandlers = () => {
      const el = tooltip.getElement?.();
      if (!el) return;
      // ensure no duplicate handlers
      el.removeEventListener("mouseenter", onPopupMouseEnter);
      el.removeEventListener("mouseleave", onPopupMouseLeave);
      el.addEventListener("mouseenter", onPopupMouseEnter);
      el.addEventListener("mouseleave", onPopupMouseLeave);
    };

    const onEnter = (e: mapboxgl.MapMouseEvent) => {
      if (mapInstance.getZoom() < MIN_ZOOM) return;
      // Disable hover tooltip when auto persistent mode is active
      if (mapInstance.getZoom() > WIKIMAP_PERSISTENT_POPUP_ZOOM) return;
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: [LAYER_ID],
      });
      if (!features.length) return;
      const f = features[0];
      const props = f.properties || {};
      const coordinates = (f.geometry as any).coordinates as [number, number];
      const title: string = props.title || "Wikimedia File";
      const url: string = props.url || "";
      const thumburl: string = props.thumburl || "";
      const tw: number | undefined =
        (props.thumbwidth as number) || (props.width as number) || undefined;
      const th: number | undefined =
        (props.thumbheight as number) || (props.height as number) || undefined;
      const sizeAttrs = [
        typeof tw === "number" && tw > 0 ? `width="${tw}"` : "",
        typeof th === "number" && th > 0 ? `height="${th}"` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 220px; max-width: 340px;">
          ${
            thumburl
              ? `<img src="${thumburl}" ${sizeAttrs} style="max-width:100%; height:auto; border-radius:6px; margin-bottom:6px; display:block;" />`
              : ""
          }
          <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0369a1; font-weight:600; text-decoration:none;">${title}</a>
        </div>`;
      tooltip.setLngLat(coordinates).setHTML(html).addTo(mapInstance);
      attachPopupHoverHandlers();
      isOverFeatureRef.current = true;
      mapInstance.getCanvas().style.cursor = "pointer";
    };

    const onLeave = () => {
      isOverFeatureRef.current = false;
      setTimeout(maybeClose, 10);
    };

    mapInstance.on("mouseenter", LAYER_ID, onEnter);
    mapInstance.on("mouseleave", LAYER_ID, onLeave);

    return () => {
      if (!mapInstance) return;
      try {
        mapInstance.off("mouseenter", LAYER_ID, onEnter);
        mapInstance.off("mouseleave", LAYER_ID, onLeave);
      } catch (error) {
        console.warn("Error removing tooltip event listeners:", error);
      }
      try {
        const el = tooltip.getElement?.();
        if (el) {
          el.removeEventListener("mouseenter", onPopupMouseEnter);
          el.removeEventListener("mouseleave", onPopupMouseLeave);
        }
      } catch {}
      tooltip.remove();
    };
  }, [mapInstance]);

  // Persistent popup utilities (zoom > 21)
  useEffect(() => {
    if (!mapInstance) return;

    const createPersistentPopupHTML = (props: any, title: string) => {
      const url: string = props.url || "";
      const thumburl: string = props.thumburl || "";
      const tw: number | undefined =
        (props.thumbwidth as number) || (props.width as number) || undefined;
      const th: number | undefined =
        (props.thumbheight as number) || (props.height as number) || undefined;
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
              ? `<img src="${thumburl}" ${sizeAttrs} style="max-width:100%; height:auto; border-radius:6px; margin-bottom:6px; display:block;" />`
              : ""
          }
          <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0369a1; font-weight:600; text-decoration:none;">${title}</a>
        </div>`;
    };

    const openPersistentPopupForFeature = (
      feature: mapboxgl.MapboxGeoJSONFeature,
    ) => {
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
      const html = createPersistentPopupHTML(props, title);
      const popup = new mapboxgl.Popup({
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
    };

    const clearAllPersistentPopups = () => {
      persistentPopupsRef.current.forEach((p) => {
        try {
          p.remove();
        } catch {}
      });
      persistentPopupsRef.current.clear();
      suppressedPageIdsRef.current.clear();
    };

    const selectAutoOpenCandidates = (
      features: mapboxgl.MapboxGeoJSONFeature[],
      _zoom: number,
    ) => {
      // Always use map center as origin for radial ordering
      const originLngLat = mapInstance.getCenter();
      const originPoint = mapInstance.project(
        mapboxgl.LngLat.convert(originLngLat),
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

      const selected: mapboxgl.MapboxGeoJSONFeature[] = [];
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
    };

    const recomputeAutoPopups = () => {
      if (!mapInstance) return;
      try {
        if (!mapInstance.getLayer(LAYER_ID)) return;
        const zoom = mapInstance.getZoom();
        const inAutoMode = zoom > WIKIMAP_PERSISTENT_POPUP_ZOOM;
        if (!inAutoMode) return;

        const canvas = mapInstance.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const queryBox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
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
    };

    // Expose to other effects (e.g., after data fetch)
    recomputeAutoPopupsRef.current = recomputeAutoPopups;

    const scheduleRecompute = (delay = 80) => {
      if (recomputeTimerRef.current) {
        window.clearTimeout(recomputeTimerRef.current);
        recomputeTimerRef.current = null;
      }
      recomputeTimerRef.current = window.setTimeout(() => {
        recomputeAutoPopups();
      }, delay) as unknown as number;
    };

    const onZoomEnd = () => {
      const z = mapInstance.getZoom();
      const nextAuto = z > WIKIMAP_PERSISTENT_POPUP_ZOOM;
      const prevAuto = autoModeRef.current;
      autoModeRef.current = nextAuto;
      if (nextAuto) {
        scheduleRecompute(10);
      }
      // Leaving auto mode: clear all persistent popups
      if (prevAuto && !nextAuto) {
        clearAllPersistentPopups();
      }
    };

    const onMoveEnd = () => {
      if (autoModeRef.current) scheduleRecompute(30);
    };

    const onClickFeature = (e: mapboxgl.MapMouseEvent) => {
      if (!autoModeRef.current) return;
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: [LAYER_ID],
      });
      if (!features.length) return;
      openPersistentPopupForFeature(features[0]);
    };

    mapInstance.on("zoomend", onZoomEnd);
    mapInstance.on("moveend", onMoveEnd);
    mapInstance.on("click", LAYER_ID, onClickFeature);

    // Initialize current mode state
    autoModeRef.current = mapInstance.getZoom() > WIKIMAP_PERSISTENT_POPUP_ZOOM;
    if (autoModeRef.current) {
      scheduleRecompute(10);
      try {
        mapInstance.once("idle", () => scheduleRecompute(0));
      } catch {}
    }

    return () => {
      if (!mapInstance) return;
      try {
        mapInstance.off("zoomend", onZoomEnd);
        mapInstance.off("moveend", onMoveEnd);
        mapInstance.off("click", LAYER_ID, onClickFeature);
      } catch (error) {
        console.warn("Error removing popup event listeners:", error);
      }
      if (recomputeTimerRef.current) {
        window.clearTimeout(recomputeTimerRef.current);
        recomputeTimerRef.current = null;
      }
      // Reset exposed ref
      recomputeAutoPopupsRef.current = () => {};
      // Cleanup persistent popups on unmount
      try {
        persistentPopupsRef.current.forEach((p) => {
          p.remove();
        });
      } catch {}
      persistentPopupsRef.current.clear();
      suppressedPageIdsRef.current.clear();
    };
  }, [mapInstance]);

  // Fetch logic: always around map center; dynamic radius based on viewport/zoom
  useEffect(() => {
    if (!mapInstance) return;

    // Haversine distance in meters
    const haversineMeters = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ): number => {
      const R = 6371000;
      const toRad = (x: number) => (x * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Compute dynamic fetch radius from center to farthest viewport corner
    const computeDynamicRadiusMeters = (): number => {
      const canvas = mapInstance.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const center = mapInstance.getCenter();
      const corners: [number, number][] = [
        [0, 0],
        [rect.width, 0],
        [rect.width, rect.height],
        [0, rect.height],
      ];
      let maxMeters = 0;
      for (const [x, y] of corners) {
        const ll = mapInstance.unproject([x, y]);
        const d = haversineMeters(center.lat, center.lng, ll.lat, ll.lng);
        if (d > maxMeters) maxMeters = d;
      }
      // Add padding and clamp to configured bounds
      const padded = maxMeters + WIKIMAP_DYNAMIC_RADIUS_PADDING_M;
      const clamped = Math.max(
        WIKIMAP_DYNAMIC_RADIUS_MIN_M,
        Math.min(WIKIMAP_DYNAMIC_RADIUS_MAX_M, padded),
      );
      return Math.round(clamped);
    };

    const updateVisibility = () => {
      if (!mapInstance) return;
      try {
        if (!mapInstance.getLayer(LAYER_ID)) return;
        const visible = mapInstance.getZoom() >= MIN_ZOOM ? "visible" : "none";
        mapInstance.setLayoutProperty(LAYER_ID, "visibility", visible);
      } catch (error) {
        console.warn("Error updating visibility:", error);
      }
    };

    const lastFetchRadiusRef = { current: null as number | null };

    const fetchAroundPoint = async (
      lng: number,
      lat: number,
      radiusM: number,
    ) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const url = `/api/wikimap?lat=${lat}&lon=${lng}&dist=${radiusM}&commons&lang=zh`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const items = normalizeWikimapResponse(json);
          wikimapCache.upsertItems(items);
          wikimapCache.recordFetch(lng, lat);
          lastFetchRadiusRef.current = radiusM;

          // Update source data
          if (mapInstance.getSource(SOURCE_ID)) {
            (
              mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource
            ).setData(wikimapCache.toFeatureCollection());
          }
          // Trigger auto-open recompute after data arrives if in auto mode
          try {
            if (autoModeRef.current) {
              // After source update, wait for map to render idle, then recompute
              mapInstance.once("idle", () => {
                setTimeout(() => {
                  recomputeAutoPopupsRef.current();
                }, 0);
              });
            }
          } catch {}
        }
      } catch (e) {
        console.warn("Wikimap fetch failed", e);
      } finally {
        isFetchingRef.current = false;
      }
    };

    const maybeFetch = () => {
      if (mapInstance.getZoom() < MIN_ZOOM) return;
      const center = mapInstance.getCenter();
      const { lng, lat } = mapboxgl.LngLat.convert(center);
      const radiusM = computeDynamicRadiusMeters();
      const distanceThreshold = Math.max(
        WIKIMAP_MIN_FETCH_THRESHOLD_M,
        Math.round(radiusM * WIKIMAP_FETCH_DISTANCE_THRESHOLD_FACTOR),
      );
      const radiusChangedSignificantly =
        !lastFetchRadiusRef.current ||
        Math.abs(radiusM - lastFetchRadiusRef.current) /
          lastFetchRadiusRef.current >
          0.25;

      if (
        radiusChangedSignificantly ||
        wikimapCache.shouldFetch(lng, lat, distanceThreshold)
      ) {
        fetchAroundPoint(lng, lat, radiusM);
      }
    };

    const onMoveEnd = () => {
      updateVisibility();
      maybeFetch();
    };

    const onZoomEnd = () => {
      updateVisibility();
      if (mapInstance.getZoom() >= MIN_ZOOM) {
        maybeFetch();
      }
    };

    // Initialize visibility and data source, then attempt an initial fetch
    updateVisibility();
    maybeFetch();

    mapInstance.on("moveend", onMoveEnd);
    mapInstance.on("zoomend", onZoomEnd);

    return () => {
      if (!mapInstance) return;
      try {
        mapInstance.off("moveend", onMoveEnd);
        mapInstance.off("zoomend", onZoomEnd);
      } catch (error) {
        console.warn("Error removing fetch event listeners:", error);
      }
    };
  }, [mapInstance]);

  return null;
};

export default WikimapLayer;
