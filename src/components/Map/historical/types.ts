// 统一配置系统类型定义
// 用于建筑、交通、历史区域等各种数据源的统一管理

// 基础几何类型
export interface Point {
  type: "Point";
  coordinates: [number, number];
}

export interface LineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface Polygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

export type Geometry = Point | LineString | Polygon;

// 通用特征类型
export interface UnifiedFeature {
  type: "Feature";
  geometry: Geometry;
  properties: Record<string, any>;
}

// 通用集合类型
export interface UnifiedCollection {
  type: "FeatureCollection";
  features: UnifiedFeature[];
}

// 样式配置基础类型
export interface BaseStyle {
  color: string;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
  radius?: number;
  strokeWidth?: number;
  strokeColor?: string;
  dashArray?: string; // 虚线样式，格式如 "5,10"
  // 可选：用于 text-only 场景
  type?: string;
  fontSize?: number;
  haloColor?: string;
  haloWidth?: number;
  offset?: [number, number];
  // 可选：随缩放变化的字体大小配置
  fontSizeStops?: [number, number][]; // [[zoom, size], ...]
  fontSizeBase?: number; // 指数插值基数，默认1（线性）
  // 可选：用于 symbol 场景
  symbol?: {
    type: "icon" | "text" | "combined"; // icon: 仅图标, text: 仅文本, combined: 图标+文本
    iconImage?: string; // 图标图片名称/路径
    iconSize?: number; // 图标大小（固定值）
    iconSizeStops?: [number, number][]; // 图标大小随缩放变化 [[zoom, size], ...]
    iconSizeBase?: number; // 图标大小插值基数，默认1（线性）
    iconColor?: string; // 图标颜色
    iconAnchor?:
      | "center"
      | "left"
      | "right"
      | "top"
      | "bottom"
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right"; // 图标锚点
    iconOffset?: [number, number]; // 图标偏移
    iconAllowOverlap?: boolean; // 允许图标重叠
    textField?: string; // 文本字段名
    textOffset?: [number, number]; // 文本偏移
    textSize?: number; // 文本大小（固定值）
    textSizeStops?: [number, number][]; // 文本大小随缩放变化 [[zoom, size], ...]
    textSizeBase?: number; // 文本大小插值基数，默认1（线性）
    textColor?: string; // 文本颜色
    textHaloColor?: string; // 文本光晕颜色
    textHaloWidth?: number; // 文本光晕宽度
    textHaloWidthStops?: [number, number][]; // 文本光晕宽度随缩放变化 [[zoom, width], ...]
    textAnchor?:
      | "center"
      | "left"
      | "right"
      | "top"
      | "bottom"
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right"; // 文本锚点
  };
}

// 标签样式配置
export interface LabelStyle {
  fontSize: number;
  color: string;
  haloColor: string;
  haloWidth: number;
  offset: [number, number];
  // 可选：随缩放变化的字体大小配置
  fontSizeStops?: [number, number][]; // [[zoom, size], ...]
  fontSizeBase?: number; // 指数插值基数，默认1（线性）
  // 可选：文本对齐和其他样式
  textAlign?: "center" | "left" | "right";
  repeat?: number; // 文本重复间隔
  maxAngle?: number; // 最大角度
  textAnchor?:
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  opacity?: number; // 文本透明度
}

// 标签配置
export interface Labels {
  enabled: boolean;
  minZoom: number;
  maxZoom: number;
  field: string;
  style: LabelStyle;
  // 可选：路径标签配置
  pathLabels?: boolean; // 是否为路径标签
}

// 聚合样式配置（仅建筑使用）
export interface ClusterStyle {
  color: string;
  priority: number;
}

// 数据子类型配置
export interface DataSubtype {
  id: string;
  name: string;
  dataFile: string;
  geometryType: "Point" | "LineString" | "Polygon";
  enabled: boolean;
  priority?: number; // 建筑专用：优先级
  filter?: Record<string, any>; // 历史区域专用：过滤条件
  style: BaseStyle;
  clusterStyle?: ClusterStyle; // 建筑专用：聚合样式
  labels?: Labels;
  slot?: "top" | "middle" | "bottom"; // 图层槽位，控制在同类型图层中的相对位置
  coordinateSystem?: "wgs84" | "gcj02" | "bd09"; // 坐标系类型，默认为 gcj02
  // 可选：缩放级别配置（向后兼容）
  minzoom?: number; // 最小缩放级别
  maxzoom?: number; // 最大缩放级别
}

// 数据类别配置
export interface DataCategory {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  subtypes: DataSubtype[];
}

// 聚合配置（建筑专用）
export interface ClusteringConfig {
  enabled: boolean;
  clusterMaxZoom: number;
  clusterMinZoom?: number; // 最小聚合zoom级别，低于此级别不进行聚合
  clusterRadius: number;
  clusterMinPoints: number;
  labelMinZoom: number;
}

// 性能配置
export interface PerformanceConfig {
  buffer: number;
  tolerance: number;
  maxzoom: number;
}

// 元数据配置
export interface ConfigMetadata {
  clustering?: ClusteringConfig; // 建筑专用
  performance?: PerformanceConfig;
}

// 统一配置结构
export interface UnifiedConfig {
  version: string;
  lastUpdated: string;
  metadata?: ConfigMetadata;
  categories: DataCategory[];
}
