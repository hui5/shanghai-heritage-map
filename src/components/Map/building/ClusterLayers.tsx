import type { UtilsMap } from "map-gl-utils";
import { useEffect } from "react";
import { subscribe } from "valtio";
import {
  getBuildingLayerConfigs,
  getBuildingMapboxDataSourceConfig,
} from "@/components/Map/building/convertConfig";
import { useBuildingClusterInteractions } from "@/components/Map/building/useClusterInteractions";
import { addInteraction } from "../../interaction/addInteraction";
import { state, updateMapDataDebounced } from "./data";

const sourceId = "openda_building-source";

export const BuildingClusterLayers = ({
  mapInstance,
}: {
  mapInstance: UtilsMap;
}) => {
  useEffect(() => {
    console.log("building cluster layers:   ");
    const dataSourceConfig = getBuildingMapboxDataSourceConfig();
    const layerConfigs = getBuildingLayerConfigs();

    mapInstance.U.removeSource(sourceId);
    mapInstance.addSource(sourceId, {
      ...dataSourceConfig,
      data: { type: "FeatureCollection" as const, features: [] },
      generateId: true,
    });

    mapInstance.addLayer(layerConfigs.clusters);
    mapInstance.addLayer(layerConfigs.clusterCount);
    mapInstance.addLayer(layerConfigs.unclusteredPoint);
    mapInstance.addLayer(layerConfigs.buildingLabels);

    const interactionIds = [
      ...addInteraction(mapInstance, layerConfigs.unclusteredPoint.id),
      ...addInteraction(mapInstance, layerConfigs.buildingLabels.id),
    ];

    updateMapDataDebounced(mapInstance);
    const unsubscribe = subscribe(state.subtypeDatas, (_subtypeDatas) => {
      updateMapDataDebounced(mapInstance);
    });

    return () => {
      unsubscribe();
      interactionIds.forEach((id) => {
        mapInstance.removeInteraction(id);
      });
    };
  }, [mapInstance]);

  useBuildingClusterInteractions({
    mapInstance,
  });

  return null;
};

export default BuildingClusterLayers;
