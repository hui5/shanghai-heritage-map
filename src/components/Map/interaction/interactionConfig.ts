/**
 * 全局交互配置
 * 用于控制地图交互功能的缩放级别阈值
 */

export interface InteractionConfig {
  /** 启用详细交互功能的最小缩放级别 */
  minZoomForInteractions: number;

  minZoomForClusterInteractions: number;

  /** 启用标签点击功能的最小缩放级别 */
  minZoomForLabelClicks: number;
}

/**
 * 默认交互配置
 * 所有交互功能在缩放级别 > 17 时生效
 */
export const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  minZoomForInteractions: 11,
  minZoomForClusterInteractions: 11,
  minZoomForLabelClicks: 11,
};

/**
 * 全局交互配置实例
 * 可以在运行时修改这些值来调整交互行为
 */
export let GLOBAL_INTERACTION_CONFIG: InteractionConfig = {
  ...DEFAULT_INTERACTION_CONFIG,
};

/**
 * 更新全局交互配置
 */
export const updateInteractionConfig = (
  newConfig: Partial<InteractionConfig>
) => {
  GLOBAL_INTERACTION_CONFIG = {
    ...GLOBAL_INTERACTION_CONFIG,
    ...newConfig,
  };
};

/**
 * 重置为默认配置
 */
export const resetInteractionConfig = () => {
  GLOBAL_INTERACTION_CONFIG = { ...DEFAULT_INTERACTION_CONFIG };
};

/**
 * 检查当前缩放级别是否允许交互
 */
export const canInteract = (
  currentZoom: number,
  interactionType: keyof InteractionConfig
): boolean => {
  return currentZoom > GLOBAL_INTERACTION_CONFIG[interactionType];
};
