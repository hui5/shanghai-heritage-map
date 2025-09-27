// 统一配置系统工具函数
// 用于从JSON配置生成Mapbox样式、聚合属性等
// 支持 historical 和 building 配置的公共功能

import { BaseStyle, UnifiedConfig } from "@/components/Map/historical/types";

// 在配置中查找子类型
export const findConfigInfo = (config: UnifiedConfig, subtypeId: string) => {
  for (const category of config.categories) {
    const subtype = category.subtypes.find((st) => st.id === subtypeId);
    if (subtype) return { category, subtype };
  }
  throw new Error(`子类型 ${subtypeId} 未找到`);
};

/**
 * 获取子类型样式
 */
export function getSubtypeStyle(
  config: UnifiedConfig,
  subtypeId: string
): BaseStyle | null {
  for (const category of config.categories) {
    for (const subtype of category.subtypes) {
      if (subtype.id === subtypeId) {
        return subtype.style;
      }
    }
  }
  return null;
}

export function buildTextSizeExpression(
  style: {
    fontSize?: number;
    fontSizeStops?: [number, number][];
    fontSizeBase?: number;
  },
  fallbackFontSize: number
): number | any[] {
  if (Array.isArray(style.fontSizeStops) && style.fontSizeStops.length > 0) {
    const base =
      typeof style.fontSizeBase === "number" ? style.fontSizeBase : 1;
    const flattenedStops = style.fontSizeStops.flat();
    return [
      "interpolate",
      [base === 1 ? "linear" : "exponential", base],
      ["zoom"],
      ...flattenedStops,
    ];
  }
  return style.fontSize ?? fallbackFontSize;
}

export function buildIconSizeExpression(
  iconSize?: number,
  iconSizeStops?: [number, number][],
  iconSizeBase?: number,
  fallbackIconSize: number = 1
): number | any[] {
  if (Array.isArray(iconSizeStops) && iconSizeStops.length > 0) {
    const base = typeof iconSizeBase === "number" ? iconSizeBase : 1;
    const flattenedStops = iconSizeStops.flat();
    return [
      "interpolate",
      [base === 1 ? "linear" : "exponential", base],
      ["zoom"],
      ...flattenedStops,
    ];
  }
  return iconSize ?? fallbackIconSize;
}

export function buildHaloWidthExpression(
  haloWidth?: number,
  haloWidthStops?: [number, number][],
  fallbackHaloWidth: number = 1
): number | any[] {
  if (Array.isArray(haloWidthStops) && haloWidthStops.length > 0) {
    const flattenedStops = haloWidthStops.flat();
    return ["interpolate", ["linear"], ["zoom"], ...flattenedStops];
  }
  return haloWidth ?? fallbackHaloWidth;
}

/**
 * 获取配置中的所有子类型
 */
export function getAllSubtypes(config: UnifiedConfig) {
  return config.categories.flatMap((category) => category.subtypes);
}

/**
 * 通过ID查找分类
 */
export function findCategoryById(config: UnifiedConfig, categoryId: string) {
  return config.categories.find((category) => category.id === categoryId);
}

/**
 * 通过ID查找子类型
 */
export function findSubtypeById(config: UnifiedConfig, subtypeId: string) {
  for (const category of config.categories) {
    const subtype = category.subtypes.find((st) => st.id === subtypeId);
    if (subtype) {
      return { category, subtype };
    }
  }
  return null;
}

/**
 * 生成图层ID
 */
export function generateLayerId(
  dataType: string,
  subtypeId: string,
  suffix?: string
): string {
  const baseId = `openda_${dataType}-${subtypeId}`;
  return suffix ? `${baseId}-${suffix}` : `${baseId}-layer`;
}

/**
 * 生成数据源ID
 */
export function generateSourceId(dataType: string, subtypeId: string): string {
  return `openda_${dataType}-${subtypeId}-source`;
}

/**
 * 检查配置是否支持聚集（clustering）
 */
export function isClusteringEnabled(config: UnifiedConfig): boolean {
  return config.metadata?.clustering?.enabled === true;
}

/**
 * 获取配置的缩放级别范围
 */
export function getZoomRange(config: UnifiedConfig) {
  const subtypes = getAllSubtypes(config);
  const minZooms = subtypes
    .map((st) => (st as any).minzoom)
    .filter((z) => z !== undefined);
  const maxZooms = subtypes
    .map((st) => (st as any).maxzoom)
    .filter((z) => z !== undefined);

  return {
    minZoom: minZooms.length > 0 ? Math.min(...minZooms) : 0,
    maxZoom: maxZooms.length > 0 ? Math.max(...maxZooms) : 22,
  };
}

/**
 * 构建通用的可见性更新函数
 */
export function buildVisibilityUpdateFunction(
  config: UnifiedConfig,
  dataType: string,
  layerVisibility: Record<string, boolean>,
  toggleLayerVisibility: (layerId: string) => void
) {
  return (categoryId: string, enabled: boolean) => {
    const category = findCategoryById(config, categoryId);
    if (!category) return;

    // 更新分类可见性
    if (enabled !== layerVisibility[categoryId]) {
      toggleLayerVisibility(categoryId);
    }

    // 更新子类型可见性
    category.subtypes.forEach((subtype) => {
      const currentSubtypeVisible = layerVisibility[subtype.id];
      if (enabled) {
        if (!currentSubtypeVisible) {
          toggleLayerVisibility(subtype.id);
        }
      } else {
        if (currentSubtypeVisible) {
          toggleLayerVisibility(subtype.id);
        }
      }
    });
  };
}
