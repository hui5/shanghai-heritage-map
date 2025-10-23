import {
  Box,
  Lightbulb,
  Mountain,
  Palette,
  RotateCcw,
  Settings,
  Type,
} from "lucide-react";
import type { UtilsMap } from "map-gl-utils";
import { useEffect, useRef } from "react";
import { type MapSettings, useMapSettings } from "./settings";

type Theme = MapSettings["theme"];
type LightPreset = MapSettings["lightPreset"];

interface MapSettingsProps {
  mapInstance: UtilsMap;
}

export function MapSettingsComponent({ mapInstance }: MapSettingsProps) {
  // 使用持久化的地图设置
  const mapSettings = useMapSettings((s) => s.settings);
  const setFontSize = useMapSettings((s) => s.setFontSize);
  const setTheme = useMapSettings((s) => s.setTheme);
  const setShow3dObjects = useMapSettings((s) => s.setShow3dObjects);
  const setPitch = useMapSettings((s) => s.setPitch);
  const setLightPreset = useMapSettings((s) => s.setLightPreset);
  const resetAllSettings = useMapSettings((s) => s.resetAllSettings);

  const { fontSize, theme, show3dObjects, pitch, lightPreset } = mapSettings;

  // 保存每个图层的原始字体大小和光晕颜色
  const originalTextSizesRef = useRef<Map<string, any>>(new Map());
  const originalHaloColorsRef = useRef<Map<string, any>>(new Map());

  // 应用字体大小到地图标注
  useEffect(() => {
    if (!mapInstance) return;

    const map = mapInstance;
    const style = map.getStyle();

    if (style?.layers) {
      style.layers.forEach((layer: any) => {
        if (layer.type === "symbol" && layer.layout?.["text-field"]) {
          const layerId = layer.id;

          // 第一次保存原始大小
          if (!originalTextSizesRef.current.has(layerId)) {
            const originalSize = map.getLayoutProperty(layerId, "text-size");
            if (originalSize) {
              originalTextSizesRef.current.set(layerId, originalSize);
            }
          }

          // 获取原始大小并应用缩放
          const originalSize = originalTextSizesRef.current.get(layerId);
          if (originalSize) {
            try {
              if (typeof originalSize === "number") {
                map.setLayoutProperty(
                  layerId,
                  "text-size",
                  originalSize * fontSize,
                );
              } else if (Array.isArray(originalSize)) {
                const scaledExpression = scaleTextSizeExpression(
                  originalSize,
                  fontSize,
                );
                map.setLayoutProperty(layerId, "text-size", scaledExpression);
              }
            } catch (error) {
              console.warn(
                `Failed to set font size for layer ${layerId}:`,
                error,
              );
            }
          }
        }
      });
    }
  }, [fontSize, mapInstance]);

  // 应用主题设置
  useEffect(() => {
    if (!mapInstance) return;
    mapInstance.setConfigProperty("basemap", "theme", theme);
  }, [theme, mapInstance]);

  // 应用 3D 建筑显示设置
  useEffect(() => {
    if (!mapInstance) return;
    mapInstance.setConfigProperty("basemap", "show3dObjects", show3dObjects);
  }, [show3dObjects, mapInstance]);

  // 应用俯仰角设置
  useEffect(() => {
    if (!mapInstance) return;

    const map = mapInstance;
    map.easeTo({ pitch, duration: 500 });
  }, [pitch, mapInstance]);

  // 应用光照预设
  useEffect(() => {
    if (!mapInstance) return;
    mapInstance.setConfigProperty("basemap", "lightPreset", lightPreset);
  }, [lightPreset, mapInstance]);

  // 智能文字颜色调整（根据光照预设）
  useEffect(() => {
    if (!mapInstance) return;

    const map = mapInstance;
    const style = map.getStyle();

    // 首次加载时保存所有原始设置
    if (style?.layers && originalHaloColorsRef.current.size === 0) {
      style.layers.forEach((layer: any) => {
        if (layer.type === "symbol" && layer.layout?.["text-field"]) {
          const layerId = layer.id;
          const originalColor = map.getPaintProperty(layerId, "text-color");
          const originalHaloColor = map.getPaintProperty(
            layerId,
            "text-halo-color",
          );
          const originalHaloWidth = map.getPaintProperty(
            layerId,
            "text-halo-width",
          );
          const originalHaloBlur = map.getPaintProperty(
            layerId,
            "text-halo-blur",
          );

          originalHaloColorsRef.current.set(layerId, {
            color: originalColor,
            haloColor: originalHaloColor,
            haloWidth: originalHaloWidth,
            haloBlur: originalHaloBlur,
          });
        }
      });
    }

    // 简化的光照适应逻辑
    const getAdaptiveColors = (
      originalColor: any,
      preset: LightPreset,
      textSize?: any,
    ) => {
      if (!originalColor) return null;

      // 根据文字大小计算光晕宽度
      const getHaloWidth = (
        baseWidth: number,
        textSize: any,
        preset: LightPreset,
      ) => {
        let size = baseWidth;

        // 解析文字大小
        if (textSize) {
          if (typeof textSize === "number") {
            size = textSize;
          } else if (typeof textSize === "object" && textSize.stops) {
            // 处理 Mapbox 的 stops 格式，取第一个值作为参考
            size = textSize.stops[0]?.[1] || baseWidth;
          }
        }

        // 根据光照预设和文字大小计算光晕宽度
        const ratio = preset === "night" ? 0.5 : preset === "dusk" ? 0.5 : 0.5;
        return Math.max(0.5, size * ratio);
      };

      switch (preset) {
        case "dawn":
          // 黎明：微调颜色适应光线，保持原色特征
          return {
            textColor: originalColor, // 使用原始颜色，确保正确恢复
            haloColor: "rgba(255, 248, 220, 0.8)", // 温暖的淡色光晕
            haloWidth: getHaloWidth(1.5, textSize, preset),
            haloBlur: 0.3,
          };
        case "dusk":
          // 傍晚：光晕和文字颜色对调，优化光晕效果
          return {
            textColor: "rgba(255, 200, 255, 0.95)", // 更亮的淡紫色文字
            haloColor: originalColor, // 光晕用原色
            haloWidth: getHaloWidth(1.8, textSize, preset), // 动态光晕宽度
            haloBlur: 0.5,
          };
        case "night":
          // 夜晚：光晕和文字颜色对调，更强对比
          return {
            textColor: "rgba(255, 255, 255, 0.95)", // 更亮的白色文字
            haloColor: originalColor, // 光晕用原色
            haloWidth: getHaloWidth(2.0, textSize, preset), // 动态光晕宽度
            haloBlur: 0.6,
          };
        default:
          return null; // 白天保持原始
      }
    };

    // 如果是白天模式，恢复原始文字颜色和光晕设置
    if (lightPreset === "day") {
      if (style?.layers) {
        style.layers.forEach((layer: any) => {
          if (layer.type === "symbol" && layer.layout?.["text-field"]) {
            const layerId = layer.id;
            const originalSettings = originalHaloColorsRef.current.get(layerId);

            if (originalSettings) {
              try {
                // 恢复原始设置
                const properties = [
                  { key: "text-color", value: originalSettings.color },
                  { key: "text-halo-color", value: originalSettings.haloColor },
                  { key: "text-halo-width", value: originalSettings.haloWidth },
                  { key: "text-halo-blur", value: originalSettings.haloBlur },
                ];

                properties.forEach(({ key, value }) => {
                  if (value !== undefined) {
                    map.setPaintProperty(layerId, key as any, value);
                  }
                });
              } catch (error) {
                console.warn(
                  `Failed to restore settings for layer ${layerId}:`,
                  error,
                );
              }
            }
          }
        });
      }
      return;
    }

    // 应用智能文字颜色
    if (style?.layers) {
      style.layers.forEach((layer: any) => {
        if (layer.type === "symbol" && layer.layout?.["text-field"]) {
          const layerId = layer.id;

          // 获取原始颜色并生成自适应颜色方案
          const originalSettings = originalHaloColorsRef.current.get(layerId);
          if (originalSettings) {
            // 获取当前文字大小
            const textSize = map.getLayoutProperty(layerId, "text-size");
            const colorScheme = getAdaptiveColors(
              originalSettings.color,
              lightPreset,
              textSize,
            );

            if (colorScheme) {
              try {
                // 应用自适应颜色方案
                const properties = [
                  { key: "text-color", value: colorScheme.textColor },
                  { key: "text-halo-color", value: colorScheme.haloColor },
                  { key: "text-halo-width", value: colorScheme.haloWidth },
                  { key: "text-halo-blur", value: colorScheme.haloBlur },
                ];

                properties.forEach(({ key, value }) => {
                  if (value !== undefined) {
                    map.setPaintProperty(layerId, key as any, value);
                  }
                });
              } catch (error) {
                console.warn(
                  `Failed to set adaptive colors for layer ${layerId}:`,
                  error,
                );
              }
            }
          }
        }
      });
    }
  }, [lightPreset, mapInstance]);

  return (
    <div className="mb-4 border-2 border-indigo-100 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-40">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-indigo-600" />
            <h4 className="font-semibold text-gray-800">地图设置</h4>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-xs text-indigo-600">
              <span>当前浏览器</span>
            </div>
            <button
              type="button"
              onClick={resetAllSettings}
              className="flex items-center space-x-1 text-xs text-gray-600 hover:text-indigo-600 transition-colors px-2 py-1 rounded"
              title="重置所有地图设置到默认值"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重置</span>
            </button>
          </div>
        </div>

        {/* 字体大小控制 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Type className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                字体大小
              </span>
            </div>
            <span className="text-xs font-medium text-indigo-600">
              {Math.round(fontSize * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="1.0"
            max="1.25"
            step="0.05"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            style={{
              background: `linear-gradient(to right, rgb(79 70 229) 0%, rgb(79 70 229) ${((fontSize - 1.0) / 0.25) * 100}%, rgb(229 231 235) ${((fontSize - 1.0) / 0.25) * 100}%, rgb(229 231 235) 100%)`,
            }}
          />
        </div>

        {/* 3D 物体显示 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Box className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                显示 3D 建筑
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={show3dObjects}
                onChange={(e) => setShow3dObjects(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* 俯仰角设置 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Mountain className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              视角倾斜角度
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {[0, 15, 30, 45].map((pitchOption) => (
              <button
                key={pitchOption}
                type="button"
                onClick={() => setPitch(pitchOption)}
                className={`px-2 py-1 text-xs rounded transition ${
                  pitch === pitchOption
                    ? "bg-indigo-300 text-indigo-800 font-medium shadow"
                    : "bg-white text-gray-700 border hover:border-indigo-400"
                }`}
              >
                {pitchOption}°
              </button>
            ))}
          </div>
        </div>

        {/* 主题设置 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">主题</span>
          </div>

          <div className="grid grid-cols-2 gap-1">
            {(["faded", "monochrome"] as Theme[]).map((themeOption) => (
              <button
                key={themeOption}
                type="button"
                onClick={() => setTheme(themeOption)}
                className={`px-2 py-1 text-xs rounded transition ${
                  theme === themeOption
                    ? "bg-indigo-300 text-indigo-800 font-medium shadow"
                    : "bg-white text-gray-700 border hover:border-indigo-400"
                }`}
              >
                {themeOption === "faded" ? "淡色" : "单色"}
              </button>
            ))}
          </div>
        </div>

        {/* 光照预设 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">光照预设</span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {(["day", "dawn", "dusk", "night"] as LightPreset[]).map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLightPreset(preset)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    lightPreset === preset
                      ? "bg-indigo-300 text-indigo-800 font-medium shadow"
                      : "bg-white text-gray-700 border hover:border-indigo-400"
                  }`}
                >
                  {preset === "day"
                    ? "白天"
                    : preset === "dawn"
                      ? "黎明"
                      : preset === "dusk"
                        ? "黄昏"
                        : "夜晚"}
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 辅助函数：缩放文本大小表达式
function scaleTextSizeExpression(expression: any, scale: number): any {
  if (typeof expression === "number") {
    return expression * scale;
  }

  if (Array.isArray(expression)) {
    return expression.map((item) => {
      if (typeof item === "number") {
        return item * scale;
      }
      if (Array.isArray(item)) {
        return scaleTextSizeExpression(item, scale);
      }
      return item;
    });
  }

  return expression;
}
