// Mapbox is loaded via CDN in MapLayout.tsx
declare global {
  interface Window {
    mapboxgl: typeof import("mapbox-gl");
    toggleWikimapFavorite?: (
      url: string,
      thumbnail: string,
      title: string,
      pageid: string,
      buttonId: string,
      coordinates: [number, number],
    ) => Promise<void>;
    openWikimapLightbox?: (
      url: string,
      thumbnail: string,
      title: string,
    ) => void;
  }
}

import type {
  GeoJSONSource,
  Map as MapboxMap,
  MapMouseEvent,
  Popup,
} from "mapbox-gl";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import {
  computeDynamicRadiusMeters,
  getFetchDistanceThreshold,
  useWikimapStore,
} from "@/components/Map/wikimap/wikimapStore";
import { openImageLightbox } from "../../../helper/imageLightbox";
import type { LocationInfo } from "../../../helper/map-data/LocationInfo";
import { useFavoriteStore } from "../../../helper/store/favoriteStore";
import {
  useWikimapPopup,
  WIKIMAP_PERSISTENT_POPUP_ZOOM,
} from "./useWikimapPopup";

interface WikimapLayerProps {
  mapInstance: MapboxMap | null;
}

const SOURCE_ID = "openda_wikimap-source";
export const LAYER_ID = "openda_wikimap-layer";
const MIN_ZOOM = 18;

export const WikimapLayer: React.FC<WikimapLayerProps> = ({ mapInstance }) => {
  const iconImageId = "wikimap_marker";

  const isOverFeatureRef = useRef<boolean>(false);
  const isPopupHoveredRef = useRef<boolean>(false);

  const autoModeRef = useRef<boolean>(false);
  const recomputeTimerRef = useRef<number | null>(null);
  const tooltipRef = useRef<Popup | null>(null);

  // Get wikimap store functions
  const { isEnabled, getFeatureCollection, shouldFetch, performFetch } =
    useWikimapStore();

  // Get favorite store functions
  const addFavorite = useFavoriteStore((s) => s.addFavorite);
  const removeFavorite = useFavoriteStore((s) => s.removeFavorite);
  const favorites = useFavoriteStore((s) => s.favorites);

  // Shared visibility update function
  const updateVisibility = useCallback(() => {
    if (!mapInstance) return;

    try {
      if (!mapInstance.getLayer(LAYER_ID)) return;
      const visible =
        isEnabled && mapInstance.getZoom() >= MIN_ZOOM ? "visible" : "none";
      mapInstance.setLayoutProperty(LAYER_ID, "visibility", visible);
    } catch (error) {
      console.warn("Error updating visibility:", error);
    }
  }, [mapInstance, isEnabled]);

  const isWikimapFavorited = useCallback((url: string) => {
    const favoriteId = `Wikimap::${url}`;
    return useFavoriteStore
      .getState()
      .favorites.some((f) => f.favoriteId === favoriteId);
  }, []);

  const {
    createPopupHTML,
    recomputeAutoPopups,
    clearAllPersistentPopups,
    openPersistentPopupForFeature,
    persistentPopupsRef,
  } = useWikimapPopup(mapInstance, isWikimapFavorited);

  // Set up global functions for wikimap
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Toggle favorite function with visual feedback
      window.toggleWikimapFavorite = async (
        url: string,
        thumbnail: string,
        title: string,
        pageid: string,
        buttonId: string,
        coordinates: [number, number],
      ) => {
        console.log("toggleWikimapFavorite called with:", {
          url,
          thumbnail,
          title,
          pageid,
          buttonId,
        });

        const isCurrentlyFavorited = isWikimapFavorited(url);

        try {
          if (isCurrentlyFavorited) {
            // Remove from favorites
            const favoriteId = `Wikimap::${url}`;
            await removeFavorite(favoriteId);
            console.log("Removed from favorites");
          } else {
            // Add to favorites using the actual wikimap image coordinates
            const locationInfo: LocationInfo = {
              name: "",
              coordinates: coordinates,
              dataSource: "Wikidata" as const,
              subtypeId: "wikimap",
              properties: { pageid: pageid, tags: ["wikimap"] },
            };

            const image = {
              url: url,
              thumbnail: thumbnail,
              title: title,
              ref: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}`,
              tags: ["wikimap"],
            };

            await addFavorite(image, "Wikimap", locationInfo);
            console.log("Added to favorites");
          }
        } catch (error) {
          console.error("Failed to toggle wikimap favorite:", error);
        }
      };

      // Open lightbox function
      window.openWikimapLightbox = (
        url: string,
        thumbnail: string,
        title: string,
      ) => {
        const image = {
          url: url,
          thumbnail: thumbnail,
          title: title,
          ref: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}`,
        };
        openImageLightbox([image], 0, "Wikimap");
      };
    }

    return () => {
      if (typeof window !== "undefined") {
        delete window.toggleWikimapFavorite;
        delete window.openWikimapLightbox;
      }
    };
  }, [addFavorite, removeFavorite, isWikimapFavorited]);

  // Auto-update button states when favorites change
  useEffect(() => {
    if (!mapInstance) return;

    const updateButtonState = (button: HTMLButtonElement) => {
      const url = button.getAttribute("data-url") || "";
      const isFavorited = favorites.some(
        (f) => f.favoriteId === `Wikimap::${url}`,
      );
      const svg = button.querySelector("svg");
      if (svg) {
        if (isFavorited) {
          // Favorited state - filled and blue
          svg.setAttribute("fill", "currentColor");
          svg.setAttribute("stroke", "none");
          button.style.color = "#3b82f6";
          button.style.border = "none";
          button.title = "取消收藏";
        } else {
          // Not favorited state - outline and gray
          svg.setAttribute("fill", "none");
          svg.setAttribute("stroke", "currentColor");
          button.style.color = "#6b7280";
          button.style.border = "none";
          button.title = "收藏到 Wikimap";
        }
      }
    };

    // Update all existing popup button states
    persistentPopupsRef.current.forEach((popup) => {
      try {
        const popupElement = popup.getElement();
        if (popupElement) {
          const button = popupElement.querySelector(
            'button[id$="-btn"]',
          ) as HTMLButtonElement;
          if (button) {
            updateButtonState(button);
          }
        }
      } catch (error) {
        console.warn("Error updating popup button state:", error);
      }
    });

    // Update tooltip button
    try {
      const tooltipElement = tooltipRef.current?.getElement();
      if (tooltipElement) {
        const button = tooltipElement.querySelector(
          'button[id="tooltip-favorite-btn"]',
        ) as HTMLButtonElement;
        if (button) {
          updateButtonState(button);
        }
      }
    } catch (error) {
      console.warn("Error updating tooltip button state:", error);
    }
  }, [
    mapInstance,
    favorites, // Update all existing popup button states
    persistentPopupsRef.current.forEach,
  ]);

  // Ensure marker icon is loaded into the style image registry
  useEffect(() => {
    if (!mapInstance) return;

    const addIconIfMissing = async () => {
      if (!mapInstance) return;

      try {
        // 检查图标是否已存在，如果存在则跳过
        if (mapInstance.hasImage(iconImageId)) {
          return;
        }

        const response = await fetch("/icons/wikimap-marker.png");
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        if (!mapInstance.hasImage(iconImageId)) {
          mapInstance.addImage(iconImageId, bitmap, { pixelRatio: 2 });
        }
      } catch (e) {
        console.warn("Failed to load marker icon", e);
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

    const fc = getFeatureCollection();
    try {
      if (!mapInstance.getSource(SOURCE_ID)) {
        mapInstance.addSource(SOURCE_ID, { type: "geojson", data: fc });
      } else {
        (mapInstance.getSource(SOURCE_ID) as GeoJSONSource).setData(fc);
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
  }, [mapInstance, getFeatureCollection]);

  // Hover tooltip with title and thumbnail
  useEffect(() => {
    if (!mapInstance) return;

    tooltipRef.current = new window.mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      closeOnMove: false,
      maxWidth: "340px",
      offset: [0, -3],
      anchor: "bottom",
    });

    const maybeClose = () => {
      if (!isOverFeatureRef.current && !isPopupHoveredRef.current) {
        if (tooltipRef.current?.isOpen()) tooltipRef.current?.remove();
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
      const el = tooltipRef.current?.getElement?.();
      if (!el) return;
      // ensure no duplicate handlers
      el.removeEventListener("mouseenter", onPopupMouseEnter);
      el.removeEventListener("mouseleave", onPopupMouseLeave);
      el.addEventListener("mouseenter", onPopupMouseEnter);
      el.addEventListener("mouseleave", onPopupMouseLeave);
    };

    const onEnter = (e: MapMouseEvent) => {
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

      const html = createPopupHTML(
        url,
        thumburl,
        title,
        props.pageid || "",
        coordinates,
        "tooltip-favorite-btn",
        tw,
        th,
      );

      tooltipRef.current
        ?.setLngLat(coordinates)
        .setHTML(html)
        .addTo(mapInstance);
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
        const el = tooltipRef.current?.getElement?.();
        if (el) {
          el.removeEventListener("mouseenter", onPopupMouseEnter);
          el.removeEventListener("mouseleave", onPopupMouseLeave);
        }
      } catch {}
      tooltipRef.current?.remove();
    };
  }, [mapInstance, createPopupHTML]);

  // Fetch logic: always around map center; dynamic radius based on viewport/zoom
  useEffect(() => {
    if (!mapInstance) return;

    const maybeFetch = async () => {
      const { isEnabled } = useWikimapStore.getState();
      if (!isEnabled || mapInstance.getZoom() < MIN_ZOOM) return;

      const center = mapInstance.getCenter();
      const { lng, lat } = window.mapboxgl.LngLat.convert(center);
      const radiusM = computeDynamicRadiusMeters(mapInstance);
      const distanceThreshold = getFetchDistanceThreshold(radiusM);

      if (shouldFetch(lng, lat, radiusM, distanceThreshold)) {
        await performFetch(lng, lat, radiusM);

        // Update source data after fetch
        if (mapInstance.getSource(SOURCE_ID)) {
          (mapInstance.getSource(SOURCE_ID) as GeoJSONSource).setData(
            getFeatureCollection(),
          );
        }
        // Trigger auto-open recompute after data arrives if in auto mode
        try {
          if (autoModeRef.current) {
            // After source update, wait for map to render idle, then recompute
            mapInstance.once("idle", () => {
              setTimeout(() => {
                recomputeAutoPopups();
              }, 0);
            });
          }
        } catch {}
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
  }, [
    mapInstance,
    shouldFetch,
    performFetch,
    getFeatureCollection,
    updateVisibility,
    recomputeAutoPopups,
  ]);

  // Persistent popup utilities (zoom > 20)
  useEffect(() => {
    if (!mapInstance) return;

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

    const onClickFeature = (e: MapMouseEvent) => {
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
    };
  }, [
    mapInstance,
    openPersistentPopupForFeature,
    recomputeAutoPopups,
    clearAllPersistentPopups,
  ]);

  return null;
};

export default WikimapLayer;
