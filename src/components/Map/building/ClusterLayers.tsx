import type { UtilsMap } from "map-gl-utils";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import {
  getBuildingLayerConfigs,
  getBuildingMapboxDataSourceConfig,
} from "@/components/Map/building/convertConfig";
import { useBuildingClusterInteractions } from "@/components/Map/building/useClusterInteractions";
import { addInteraction } from "../interaction/addInteraction";
import { state } from "./data";

const sourceId = "openda_building-source";

export const BuildingClusterLayers = ({
  mapInstance,
}: {
  mapInstance: UtilsMap;
}) => {
  const snapshot = useSnapshot(state);

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

    // mapInstance.addLayer(layerConfigs.clusters);
    mapInstance.addLayer(layerConfigs.clusterCount);
    mapInstance.addLayer(layerConfigs.unclusteredPoint);
    mapInstance.addLayer(layerConfigs.buildingLabels);

    const interactionIds = [
      ...addInteraction(mapInstance, layerConfigs.unclusteredPoint.id),
      ...addInteraction(mapInstance, layerConfigs.buildingLabels.id),
    ];

    return () => {
      interactionIds.forEach((id) => {
        mapInstance.removeInteraction(id);
      });
    };
  }, [mapInstance]);

  useEffect(() => {
    mapInstance.U.setData(sourceId, snapshot.data as GeoJSON.FeatureCollection);
  }, [mapInstance, snapshot.data]);

  useBuildingClusterInteractions({
    mapInstance,
  });

  return null;
};

export default BuildingClusterLayers;
