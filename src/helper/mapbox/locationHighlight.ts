/**
 * 通用的地图位置高亮工具
 * 用于在地图上临时高亮显示某个位置
 */
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";

export interface HighlightStyle {
  /** 圆环颜色 */
  color?: string;
  /** 光晕透明度 */
  glowOpacity?: number;
  /** 描边透明度 */
  strokeOpacity?: number;
  /** 高亮持续时间（毫秒），0 表示不自动清除 */
  duration?: number;
}

export interface LocationHighlightOptions {
  /** 高亮样式配置 */
  style?: HighlightStyle;
  /** 位置名称 */
  name?: string;
}

const DEFAULT_STYLE: Required<HighlightStyle> = {
  color: "#4ade80",
  glowOpacity: 0.3,
  strokeOpacity: 0.9,
  duration: 3000,
};

/**
 * 高亮位置并返回销毁方法
 * @param map Mapbox 地图实例
 * @param location 经纬度坐标 [lng, lat]
 * @param options 可选配置
 * @returns 返回包含 destroy 方法的对象
 */
export function highlightLocation(
  map: MapboxMap,
  location: [number, number],
  options: LocationHighlightOptions = {},
) {
  const style = { ...DEFAULT_STYLE, ...options.style };
  const layerId = "location-highlight";
  const sourceId = "location-highlight-source";
  let clearTimer: number | null = null;

  const destroy = () => {
    // 清除定时器
    if (clearTimer) {
      window.clearTimeout(clearTimer);
      clearTimer = null;
    }

    try {
      // 清除高亮数据
      const source = map.getSource(sourceId) as GeoJSONSource;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: [],
        });
      }

      // 移除图层和源
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getLayer(`${layerId}-glow`)) {
        map.removeLayer(`${layerId}-glow`);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    } catch (error) {
      console.warn("Error destroying location highlight:", error);
    }
  };

  const setupLayers = () => {
    // 检查图层是否已存在
    if (map.getLayer(layerId)) {
      return;
    }

    // 添加数据源
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
    }

    // 添加高亮图层 - 外圈光晕
    map.addLayer({
      id: `${layerId}-glow`,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          30,
          15,
          40,
          20,
          50,
        ],
        "circle-color": style.color,
        "circle-opacity": style.glowOpacity,
        "circle-blur": 1.5,
      },
    });

    // 添加高亮图层 - 圆环样式
    map.addLayer({
      id: layerId,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          15,
          15,
          35,
          20,
          55,
        ],
        "circle-color": "transparent",
        "circle-opacity": 0,
        "circle-stroke-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          6,
          15,
          4,
          20,
          2,
        ],
        "circle-stroke-color": style.color,
        "circle-stroke-opacity": style.strokeOpacity,
      },
    });
  };

  const showHighlight = () => {
    try {
      const source = map.getSource(sourceId) as GeoJSONSource;
      if (!source) {
        setupLayers();
        const newSource = map.getSource(sourceId) as GeoJSONSource;
        if (!newSource) return;
      }

      // 显示高亮
      const sourceToUse = map.getSource(sourceId) as GeoJSONSource;
      sourceToUse.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: location,
            },
            properties: {
              name: options.name || "",
            },
          },
        ],
      });

      // 自动清除高亮
      if (style.duration > 0) {
        clearTimer = window.setTimeout(() => {
          destroy();
        }, style.duration);
      }
    } catch (error) {
      console.warn("Error showing location highlight:", error);
    }
  };

  // 初始化并显示高亮
  try {
    if (map.isStyleLoaded()) {
      setupLayers();
      showHighlight();
    } else {
      const onStyleLoad = () => {
        map.off("style.load", onStyleLoad);
        setupLayers();
        showHighlight();
      };
      map.once("style.load", onStyleLoad);

      // 超时保护
      setTimeout(() => {
        map.off("style.load", onStyleLoad);
        setupLayers();
        showHighlight();
      }, 1000);
    }
  } catch (error) {
    console.warn("Error initializing location highlight:", error);
  }

  return { destroy };
}
