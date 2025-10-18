import type { UtilsMap } from "map-gl-utils";
import { useEffect } from "react";
import { subscribe } from "valtio";
import { generateHistoricalLayerConfig } from "@/components/Map/historical/convertConfig";
import { addInteraction } from "../interaction/addInteraction";
import { cleanupMapInstance, initializeMapDataDebounced, state } from "./data";

export const HistoricalLayers = ({
  mapInstance,
  configName,
}: {
  mapInstance: UtilsMap;
  configName: string;
}) => {
  // 只在数据真正发生变化时创建图层
  useEffect(() => {
    try {
      console.log("historical layers: ");
      const interactionIds: string[] = [];

      state.subtypeDatas.forEach((subtypeData) => {
        const { id, subtype, sourceId, layers, data } = subtypeData;

        subtypeData.layers = [];

        mapInstance.U.removeSource(sourceId);

        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          generateId: true,
        });

        // 使用配置化的图层创建
        const layerConfigs = generateHistoricalLayerConfig(
          subtype,
          sourceId,
          configName,
          true,
        );

        // 添加所有生成的图层配置
        layerConfigs.forEach((layerConfig) => {
          layerConfig.layout.visibility = subtypeData.visible
            ? "visible"
            : "none";
          const layerId = layerConfig.id;
          mapInstance.addLayer(layerConfig);
          subtypeData.layers.push(layerId);

          if (layerConfig.type === "symbol") {
            const [mouseenterId, mouseleaveId, clickId] = addInteraction(
              mapInstance,
              layerId,
            );
            interactionIds.push(mouseenterId, mouseleaveId, clickId);
          }
        });
      });

      initializeMapDataDebounced(mapInstance);
      const unsubscribe = subscribe(
        state.loading.completed,
        (_subtypeDatas) => {
          initializeMapDataDebounced(mapInstance);
        },
      );

      return () => {
        try {
          unsubscribe();
          interactionIds.forEach((id) => {
            mapInstance.removeInteraction(id);
          });
          // 清理 mapInstance 相关的缓存
          cleanupMapInstance(mapInstance);
        } catch {}
      };
    } catch (error) {
      console.error("historical layers error: ", error);
    }
  }, [mapInstance, configName]);

  return null;
};

export default HistoricalLayers;
