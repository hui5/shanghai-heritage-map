import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  UnifiedCollection,
  UnifiedConfig,
} from "@/components/Map/historical/types";
import type { SearchResult } from "@/components/Map/search/MapSearch";

interface UseMapSearchProps {
  mapInstance: mapboxgl.Map | null;
  buildingData: Record<string, UnifiedCollection>; // 改为统一格式
  historicalData: Record<string, UnifiedCollection>;
  historicalConfig: UnifiedConfig; // 添加历史数据配置
  wikimapData?: any[];
}

export const useMapSearch = ({
  mapInstance,
  buildingData,
  historicalData,
}: UseMapSearchProps) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const highlightLayerId = "search-highlight-layer";
  const highlightSourceId = "search-highlight-source";
  const originalCenterRef = useRef<[number, number] | null>(null);
  const originalZoomRef = useRef<number | null>(null);

  // 准备搜索数据，统一使用GeoJSON格式的properties
  const searchData = useMemo(() => {
    // 建筑数据现在是统一格式的Record<string, UnifiedCollection>
    const buildings = Object.values(buildingData)
      .flatMap((collection) => collection?.features || [])
      .map((feature) => ({
        ...feature,
        properties: feature.properties, // 统一的GeoJSON特征properties
      }));

    const historical = Object.values(historicalData)
      .flatMap((collection) => collection?.features || [])
      .map((feature) => ({
        ...feature,
        properties: feature.properties, // GeoJSON特征的properties
      }));

    return {
      buildings,
      historical,
    };
  }, [buildingData, historicalData]);

  // 初始化高亮图层
  useEffect(() => {
    if (!mapInstance) return;

    const setupHighlightLayer = () => {
      // 检查图层是否已存在
      if (mapInstance.getLayer(highlightLayerId)) {
        return;
      }

      // 添加数据源
      if (!mapInstance.getSource(highlightSourceId)) {
        mapInstance.addSource(highlightSourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });
      }

      // 获取所有现有图层，用于确定插入位置
      const layers = mapInstance.getStyle().layers || [];
      const topLayerId =
        layers.length > 0 ? layers[layers.length - 1].id : undefined;

      // 添加高亮图层 - 外圈光晕（在最顶层）
      mapInstance.addLayer({
        id: `${highlightLayerId}-glow`,
        type: "circle",
        source: highlightSourceId,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            25,
            15,
            35,
            20,
            45,
          ],
          "circle-color": "#ff6b6b",
          "circle-opacity": 0.2,
          "circle-blur": 1.5,
        },
      });

      // 添加高亮图层 - 圆环样式（在光晕之上）
      mapInstance.addLayer({
        id: highlightLayerId,
        type: "circle",
        source: highlightSourceId,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            10,
            15,
            30,
            20,
            50,
          ],
          "circle-color": "transparent", // 设置填充为透明
          "circle-opacity": 0, // 填充完全透明
          "circle-stroke-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            5,
            15,
            3,
            20,
            1,
          ], // 圆环粗细随缩放调整
          "circle-stroke-color": "#ff6b6b",
          "circle-stroke-opacity": 0.9,
        },
      });

      // 添加地点名称标签（在最顶层）
      mapInstance.addLayer({
        id: `${highlightLayerId}-label`,
        type: "symbol",
        source: highlightSourceId,
        layout: {
          "text-field": ["get", "name"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            15,
            15,
            15,
            20,
            15,
          ],
          "text-offset": [0, -2.5],
          "text-anchor": "bottom",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#ff6b6b",
          "text-halo-width": 5,
        },
      });
    };

    // 如果地图样式已加载，立即设置图层
    if (mapInstance.isStyleLoaded()) {
      setupHighlightLayer();
    } else {
      // 否则等待样式加载完成
      mapInstance.once("style.load", setupHighlightLayer);
    }

    // 监听样式更换事件，重新添加图层
    const handleStyleLoad = () => {
      // 延迟添加图层，确保在其他图层之后
      setTimeout(() => {
        setupHighlightLayer();
      }, 500);
    };

    mapInstance.on("style.load", handleStyleLoad);

    return () => {
      mapInstance.off("style.load", handleStyleLoad);
    };
  }, [mapInstance]);

  // 控制聚合图层显示/隐藏
  const toggleClusterLayers = useCallback(
    (visible: boolean) => {
      if (!mapInstance) return;
      // 在热更新或样式切换期间，style 可能未就绪
      try {
        if (!mapInstance.isStyleLoaded() || !mapInstance.getStyle()) return;
      } catch {
        return;
      }

      // 获取所有聚合相关的图层
      const clusterLayerPatterns = ["building-cluster"];

      clusterLayerPatterns.forEach((pattern) => {
        const style = mapInstance.getStyle();
        if (!style) return;
        const layers = style.layers || [];
        layers.forEach((layer) => {
          if (layer.id.includes(pattern)) {
            try {
              mapInstance.setLayoutProperty(
                layer.id,
                "visibility",
                visible ? "visible" : "none",
              );
            } catch (error) {
              // 忽略不存在的图层
            }
          }
        });
      });
    },
    [mapInstance],
  );

  // 高亮显示多个搜索结果
  const highlightMultipleResults = useCallback(
    (results: SearchResult[], searchMode: boolean = true) => {
      if (!mapInstance) return;
      // 在 HMR 或样式重载期间，getSource 可能会因 style 未初始化而抛错
      try {
        if (!mapInstance.isStyleLoaded() || !mapInstance.getStyle()) return;
      } catch {
        return;
      }

      let source: mapboxgl.GeoJSONSource | null = null;
      try {
        source = mapInstance.getSource(
          highlightSourceId,
        ) as mapboxgl.GeoJSONSource;
      } catch {
        // 样式未就绪或 map 正在重建，直接忽略本次更新
        return;
      }
      if (!source) return;

      if (searchMode !== isSearchActive) {
        // 搜索状态发生变化时切换聚合图层
        toggleClusterLayers(!searchMode);
        setIsSearchActive(searchMode);
      }

      if (results.length > 0) {
        // 显示所有结果的高亮点，带数字标签
        const features = results.map((result, index) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: result.coordinates,
          },
          properties: {
            name: result.name,
            type: result.type,
          },
        }));

        source.setData({
          type: "FeatureCollection",
          features,
        });

        // 确保高亮图层在最上层
        setTimeout(() => {
          try {
            const layers = [
              `${highlightLayerId}-glow`,
              highlightLayerId,
              `${highlightLayerId}-label`,
            ];
            layers.forEach((layerId) => {
              if (mapInstance.getLayer(layerId)) {
                mapInstance.moveLayer(layerId);
              }
            });
          } catch (error) {
            console.warn("Failed to reorder highlight layers:", error);
          }
        }, 100);
      } else {
        // 清除所有高亮
        source.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    },
    [mapInstance, toggleClusterLayers, isSearchActive],
  );

  // 飞行到搜索结果
  const flyToSearchResult = useCallback(
    (result: SearchResult) => {
      if (!mapInstance) return;

      // 保存当前位置（仅在第一次搜索时）
      if (!originalCenterRef.current) {
        const center = mapInstance.getCenter();
        originalCenterRef.current = [center.lng, center.lat];
        originalZoomRef.current = mapInstance.getZoom();
      }

      // 计算合适的缩放级别
      const currentZoom = mapInstance.getZoom();
      const targetZoom = Math.max(currentZoom, 16);

      // 平滑飞行到目标位置
      mapInstance.flyTo({
        center: result.coordinates,
        zoom: targetZoom,
        duration: currentZoom < 14 ? 2000 : 1200, // 远距离飞行时间更长
        curve: 1.42, // 更自然的飞行曲线
        easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t), // ease-in-out
      });
    },
    [mapInstance],
  );

  // 处理搜索结果选择
  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      flyToSearchResult(result);
    },
    [flyToSearchResult],
  );

  // 返回原始位置
  const returnToOriginalPosition = useCallback(() => {
    if (!mapInstance || !originalCenterRef.current || !originalZoomRef.current)
      return;

    mapInstance.flyTo({
      center: originalCenterRef.current,
      zoom: originalZoomRef.current,
      duration: 1500,
    });

    // 清除保存的位置
    originalCenterRef.current = null;
    originalZoomRef.current = null;
  }, [mapInstance]);

  // 简化的键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape 清除高亮 - 现在由搜索组件统一处理
      // if (event.key === "Escape") {
      //   highlightSearchResult(null);
      // }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      if (mapInstance) {
        // 清理图层和数据源
        try {
          if (mapInstance.getLayer(`${highlightLayerId}-label`)) {
            mapInstance.removeLayer(`${highlightLayerId}-label`);
          }

          if (mapInstance.getLayer(highlightLayerId)) {
            mapInstance.removeLayer(highlightLayerId);
          }
          if (mapInstance.getLayer(`${highlightLayerId}-glow`)) {
            mapInstance.removeLayer(`${highlightLayerId}-glow`);
          }
          if (mapInstance.getSource(highlightSourceId)) {
            mapInstance.removeSource(highlightSourceId);
          }
        } catch (error) {
          console.warn("Error cleaning up search highlight layers:", error);
        }
      }
    };
  }, [mapInstance]);

  return {
    searchData,
    isSearchActive,
    handleResultSelect,
    highlightMultipleResults,
    returnToOriginalPosition,
  };
};

export default useMapSearch;
