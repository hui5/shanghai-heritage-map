import type { Map as MapboxMap } from "mapbox-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  UnifiedCollection,
  UnifiedConfig,
} from "@/components/Map/historical/types";
import type { SearchResult } from "@/components/Map/search/MapSearch";
import { createMultiLocationHighlighter } from "@/helper/mapbox/multiLocationHighlight";

interface UseMapSearchProps {
  mapInstance: MapboxMap | null;
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
  const highlighterRef = useRef<ReturnType<
    typeof createMultiLocationHighlighter
  > | null>(null);
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

  // 初始化高亮管理器
  useEffect(() => {
    if (!mapInstance) return;

    highlighterRef.current = createMultiLocationHighlighter(mapInstance, {
      layerIdPrefix: "search-highlight",
      color: "#ff6b6b",
      showLabels: true,
    });

    return () => {
      highlighterRef.current?.destroy();
      highlighterRef.current = null;
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
            } catch (_error) {
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
      if (!mapInstance || !highlighterRef.current) return;

      // 在 HMR 或样式重载期间，样式可能未初始化
      try {
        if (!mapInstance.isStyleLoaded() || !mapInstance.getStyle()) return;
      } catch {
        return;
      }

      if (searchMode !== isSearchActive) {
        // 搜索状态发生变化时切换聚合图层
        toggleClusterLayers(!searchMode);
        setIsSearchActive(searchMode);
      }

      if (results.length > 0) {
        // 显示所有结果的高亮点
        highlighterRef.current.highlight(
          results.map((result) => ({
            coordinates: result.coordinates,
            name: result.name,
            type: result.type,
          })),
        );
      } else {
        // 清除所有高亮
        highlighterRef.current.clear();
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

  return {
    searchData,
    isSearchActive,
    handleResultSelect,
    highlightMultipleResults,
    returnToOriginalPosition,
  };
};

export default useMapSearch;
