/**
 * 多点位置高亮工具
 * 用于搜索等需要同时显示多个位置的场景
 */
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";

export interface HighlightLocation {
  coordinates: [number, number];
  name: string;
  type?: string;
}

export interface MultiLocationHighlightOptions {
  /** 高亮图层 ID 前缀 */
  layerIdPrefix?: string;
  /** 圆环颜色 */
  color?: string;
  /** 是否显示标签 */
  showLabels?: boolean;
}

/**
 * 多点位置高亮管理器
 */
export class MultiLocationHighlighter {
  private map: MapboxMap;
  private layerId: string;
  private sourceId: string;
  private color: string;
  private showLabels: boolean;

  constructor(map: MapboxMap, options: MultiLocationHighlightOptions = {}) {
    this.map = map;
    const prefix = options.layerIdPrefix || "multi-location-highlight";
    this.layerId = prefix;
    this.sourceId = `${prefix}-source`;
    this.color = options.color || "#ff6b6b";
    this.showLabels = options.showLabels ?? true;

    this.initialize();
  }

  /**
   * 初始化高亮图层
   */
  private initialize() {
    const setupLayers = () => {
      // 检查图层是否已存在
      if (this.map.getLayer(this.layerId)) {
        return;
      }

      // 添加数据源
      if (!this.map.getSource(this.sourceId)) {
        this.map.addSource(this.sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });
      }

      // 添加外圈光晕
      this.map.addLayer({
        id: `${this.layerId}-glow`,
        type: "circle",
        source: this.sourceId,
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
          "circle-color": this.color,
          "circle-opacity": 0.2,
          "circle-blur": 1.5,
        },
      });

      // 添加圆环
      this.map.addLayer({
        id: this.layerId,
        type: "circle",
        source: this.sourceId,
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
          "circle-color": "transparent",
          "circle-opacity": 0,
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
          ],
          "circle-stroke-color": this.color,
          "circle-stroke-opacity": 0.9,
        },
      });

      // 添加标签（如果启用）
      if (this.showLabels) {
        this.map.addLayer({
          id: `${this.layerId}-label`,
          type: "symbol",
          source: this.sourceId,
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
            "text-halo-color": this.color,
            "text-halo-width": 5,
          },
        });
      }
    };

    // 如果地图样式已加载，立即设置图层
    if (this.map.isStyleLoaded()) {
      setupLayers();
    } else {
      this.map.once("style.load", setupLayers);
    }

    // 监听样式更换事件
    const handleStyleLoad = () => {
      setTimeout(() => {
        setupLayers();
      }, 500);
    };

    this.map.on("style.load", handleStyleLoad);
  }

  /**
   * 显示多个位置的高亮
   */
  highlight(locations: HighlightLocation[]) {
    try {
      // 确保地图样式已加载
      if (!this.map.isStyleLoaded()) {
        console.warn("Map style not loaded yet");
        return;
      }

      // 如果源不存在，尝试重新初始化
      let source = this.map.getSource(this.sourceId) as GeoJSONSource;
      if (!source) {
        console.log("Source not found, reinitializing...");
        this.initialize();
        source = this.map.getSource(this.sourceId) as GeoJSONSource;
        if (!source) {
          console.warn("Failed to create highlight source");
          return;
        }
      }

      const features = locations.map((location) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: location.coordinates,
        },
        properties: {
          name: location.name,
          type: location.type || "",
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
            `${this.layerId}-glow`,
            this.layerId,
            ...(this.showLabels ? [`${this.layerId}-label`] : []),
          ];
          for (const layerId of layers) {
            if (this.map.getLayer(layerId)) {
              this.map.moveLayer(layerId);
            }
          }
        } catch (error) {
          console.warn("Failed to reorder highlight layers:", error);
        }
      }, 100);
    } catch (error) {
      console.warn("Error showing location highlights:", error);
    }
  }

  /**
   * 清除所有高亮
   */
  clear() {
    try {
      // 确保地图样式已加载
      if (!this.map.isStyleLoaded()) {
        return;
      }

      const source = this.map.getSource(this.sourceId) as GeoJSONSource;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    } catch (error) {
      console.warn("Error clearing highlights:", error);
    }
  }

  /**
   * 销毁高亮管理器
   */
  destroy() {
    this.clear();

    try {
      const layers = [
        `${this.layerId}-label`,
        this.layerId,
        `${this.layerId}-glow`,
      ];

      for (const layerId of layers) {
        if (this.map.getLayer(layerId)) {
          this.map.removeLayer(layerId);
        }
      }

      if (this.map.getSource(this.sourceId)) {
        this.map.removeSource(this.sourceId);
      }
    } catch (error) {
      console.warn("Error destroying multi-location highlighter:", error);
    }
  }
}

/**
 * 创建多点位置高亮管理器的工厂函数
 */
export const createMultiLocationHighlighter = (
  map: MapboxMap,
  options?: MultiLocationHighlightOptions,
) => {
  return new MultiLocationHighlighter(map, options);
};
