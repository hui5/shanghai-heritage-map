import type { Map as MapboxMap } from "mapbox-gl";
import { canInteract } from "./interactionConfig";
import { closePopup, showPopup } from "./popup";

let isMapInteracting = false;

export const addEventListeners = (mapInstance: MapboxMap) => {
  // 监听地图交互状态
  ["dragstart", "zoomstart", "rotatestart", "pitchstart"].forEach((event) => {
    mapInstance.on(event, () => {
      isMapInteracting = true;
      closePopup();
    });
  });

  ["dragend", "zoomend", "rotateend", "pitchend"].forEach((event) => {
    mapInstance.on(event, () => {
      setTimeout(() => {
        isMapInteracting = false;
      }, 300);
    });
  });
};

export const addInteraction = (mapInstance: MapboxMap, layerId: string) => {
  const mouseenterId = `mouseenter-${layerId}`;
  const mouseleaveId = `mouseleave-${layerId}`;
  const clickId = `click-${layerId}`;

  mapInstance.addInteraction(mouseenterId, {
    type: "mouseenter",
    target: { layerId },
    handler: (e) => {
      const feature = e.feature;
      if (!feature) return;

      if (isMapInteracting) return;

      if (!canInteract(mapInstance.getZoom(), "minZoomForInteractions")) {
        return;
      }

      mapInstance.getCanvas().style.cursor = "pointer";

      mapInstance.setFeatureState(feature, { hover: true });

      showPopup({
        lngLat: e.lngLat.toArray(),
        feature,
        map: mapInstance,
        delay: 300,
      });
    },
  });

  mapInstance.addInteraction(mouseleaveId, {
    type: "mouseleave",
    target: { layerId },
    handler: (e) => {
      const feature = e.feature;
      if (!feature) return;

      mapInstance.getCanvas().style.cursor = "";
      mapInstance.setFeatureState(feature, { hover: false });
      closePopup();
    },
  });

  mapInstance.addInteraction(clickId, {
    type: "click",
    target: { layerId },
    handler: (_e) => {},
  });

  return [mouseenterId, mouseleaveId, clickId];
};
