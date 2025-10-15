/**
 * 通用的地图位置高亮工具
 * 用于在地图上临时高亮显示某个位置
 */

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
  /** 高亮图层 ID 前缀 */
  layerIdPrefix?: string;
  /** 高亮样式配置 */
  style?: HighlightStyle;
}

const DEFAULT_STYLE: Required<HighlightStyle> = {
  color: "#4ade80",
  glowOpacity: 0.3,
  strokeOpacity: 0.9,
  duration: 3000,
};

/**
 * 创建位置高亮管理器
 */
export class LocationHighlighter {
  private map: mapboxgl.Map;
  private layerId: string;
  private sourceId: string;
  private style: Required<HighlightStyle>;
  private clearTimer: number | null = null;

  constructor(map: mapboxgl.Map, options: LocationHighlightOptions = {}) {
    this.map = map;
    const prefix = options.layerIdPrefix || "location-highlight";
    this.layerId = prefix;
    this.sourceId = `${prefix}-source`;
    this.style = { ...DEFAULT_STYLE, ...options.style };

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

      // 添加高亮图层 - 外圈光晕
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
            30,
            15,
            40,
            20,
            50,
          ],
          "circle-color": this.style.color,
          "circle-opacity": this.style.glowOpacity,
          "circle-blur": 1.5,
        },
      });

      // 添加高亮图层 - 圆环样式
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
          "circle-stroke-color": this.style.color,
          "circle-stroke-opacity": this.style.strokeOpacity,
        },
      });
    };

    // 如果地图样式已加载，立即设置图层
    if (this.map.isStyleLoaded()) {
      setupLayers();
    } else {
      // 否则等待样式加载完成
      this.map.once("style.load", setupLayers);
    }

    // 监听样式更换事件，重新添加图层
    const handleStyleLoad = () => {
      setTimeout(() => {
        setupLayers();
      }, 500);
    };

    this.map.on("style.load", handleStyleLoad);
  }

  /**
   * 在指定位置显示高亮
   * @param coordinates 经纬度坐标 [lng, lat]
   * @param name 可选的位置名称
   * @param customDuration 自定义持续时间，覆盖默认配置
   */
  highlight(
    coordinates: [number, number],
    name?: string,
    customDuration?: number,
  ) {
    try {
      // 优化：使用更可靠的地图状态检测
      if (!this.map.isStyleLoaded()) {
        // 使用 'idle' 事件，它在地图完成渲染且所有数据加载完毕时触发
        const onIdle = () => {
          this.map.off("idle", onIdle);
          this.tryHighlight(coordinates, name, customDuration);
        };

        // 同时监听 style.load 作为备选
        const onStyleLoad = () => {
          this.map.off("style.load", onStyleLoad);
          this.tryHighlight(coordinates, name, customDuration);
        };

        this.map.once("idle", onIdle);
        this.map.once("style.load", onStyleLoad);

        // 更短的超时时间，并直接尝试
        setTimeout(() => {
          this.map.off("idle", onIdle);
          this.map.off("style.load", onStyleLoad);
          this.tryHighlight(coordinates, name, customDuration);
        }, 1000); // 减少到1秒
        return;
      }

      this.tryHighlight(coordinates, name, customDuration);
    } catch (error) {
      console.warn("Error showing location highlight:", error);
    }
  }

  /**
   * 尝试显示高亮的内部方法
   */
  private tryHighlight(
    coordinates: [number, number],
    name?: string,
    customDuration?: number,
  ) {
    try {
      // 优化：确保源和图层存在，如果不存在则重新初始化
      let source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource;
      if (!source) {
        this.initialize();
        source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource;
        if (!source) {
          return;
        }
      }

      // 清除之前的定时器
      if (this.clearTimer) {
        window.clearTimeout(this.clearTimer);
        this.clearTimer = null;
      }

      // 显示高亮
      source.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates,
            },
            properties: {
              name: name || "",
            },
          },
        ],
      });

      // 自动清除高亮
      const duration = customDuration ?? this.style.duration;
      if (duration > 0) {
        this.clearTimer = window.setTimeout(() => {
          this.clear();
        }, duration);
      }
    } catch (error) {
      console.warn("Error in tryHighlight:", error);
    }
  }

  /**
   * 确保高亮图层在最上层
   */

  /**
   * 清除高亮
   */
  clear() {
    try {
      if (this.clearTimer) {
        window.clearTimeout(this.clearTimer);
        this.clearTimer = null;
      }

      const source = this.map.getSource(
        this.sourceId,
      ) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    } catch (error) {
      console.warn("Error clearing highlight:", error);
    }
  }

  /**
   * 销毁高亮管理器，清理所有资源
   */
  destroy() {
    this.clear();

    try {
      if (this.map.getLayer(this.layerId)) {
        this.map.removeLayer(this.layerId);
      }
      if (this.map.getLayer(`${this.layerId}-glow`)) {
        this.map.removeLayer(`${this.layerId}-glow`);
      }
      if (this.map.getSource(this.sourceId)) {
        this.map.removeSource(this.sourceId);
      }
    } catch (error) {
      console.warn("Error destroying location highlighter:", error);
    }
  }
}

/**
 * 创建位置高亮管理器的工厂函数
 */
export const createLocationHighlighter = (
  map: mapboxgl.Map,
  options?: LocationHighlightOptions,
) => {
  return new LocationHighlighter(map, options);
};
