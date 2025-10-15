import _ from "lodash";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Mountain,
  Palette,
  Save,
  Settings,
  Type,
  Zap,
} from "lucide-react";
import type { UtilsMap } from "map-gl-utils";
import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import {
  state as stateB,
  toggleSubtypeVisible as toggleBuildingSubtypeVisible,
} from "./building/data";
import {
  type SubtypeData,
  state as stateH,
  toggleSubtypeVisible,
} from "./historical/data";
import { type MapSettings, useMapSettings } from "./mapSettings";

type Theme = MapSettings["theme"];
type LightPreset = MapSettings["lightPreset"];

export function MapConsole({ mapInstance }: { mapInstance: UtilsMap }) {
  const [isExpanded, setIsExpanded] = useState(() => false);

  const snapshotH = useSnapshot(stateH);
  const snapshotB = useSnapshot(stateB);

  // 使用持久化的地图设置
  const mapSettings = useMapSettings((s) => s.settings);
  const setFontSize = useMapSettings((s) => s.setFontSize);
  const setTheme = useMapSettings((s) => s.setTheme);
  const setShow3dObjects = useMapSettings((s) => s.setShow3dObjects);
  const setPitch = useMapSettings((s) => s.setPitch);
  const setLightPreset = useMapSettings((s) => s.setLightPreset);

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

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  return isExpanded ? (
    <div
      ref={panelRef}
      className="fixed top-2 right-2 bg-white rounded-lg shadow-xl border w-80 max-h-[80vh] z-[100]"
    >
      <div className="border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 flex-1 p-4 hover:bg-gray-100 transition-colors text-left"
            title={"收起控制台"}
          >
            <Settings className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-gray-800">控制台</h3>
          </button>
        </div>
      </div>

      <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {/* 全局显示设置 */}
        <div className="mb-4 border-2 border-indigo-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-indigo-600" />
                <h4 className="font-semibold text-gray-800">地图设置</h4>
              </div>
              <div className="flex items-center space-x-1 text-xs text-indigo-600">
                <Save className="w-3 h-3" />
                <span>自动保存</span>
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
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

              <div className="grid grid-cols-4 gap-2">
                {[0, 15, 30, 45].map((pitchOption) => (
                  <button
                    key={pitchOption}
                    type="button"
                    onClick={() => setPitch(pitchOption)}
                    className={`px-3 py-2 text-sm rounded transition ${
                      pitch === pitchOption
                        ? "bg-indigo-600 text-white font-medium shadow"
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

              <div className="grid grid-cols-2 gap-2">
                {(["faded", "monochrome"] as Theme[]).map((themeOption) => (
                  <button
                    key={themeOption}
                    type="button"
                    onClick={() => setTheme(themeOption)}
                    className={`px-3 py-2 text-sm rounded transition ${
                      theme === themeOption
                        ? "bg-indigo-600 text-white font-medium shadow"
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
                <span className="text-sm font-medium text-gray-700">
                  光照预设
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(["day", "dawn", "dusk", "night"] as LightPreset[]).map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLightPreset(preset)}
                      className={`px-3 py-2 text-sm rounded transition ${
                        lightPreset === preset
                          ? "bg-indigo-600 text-white font-medium shadow"
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

        {/* 地图数据 - 临时设置 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-3 py-2 ">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-gray-800">数据设置</span>
            </div>
            <div className="flex items-center space-x-1 text-xs font-semibold text-amber-700">
              <Zap className="w-3.5 h-3.5" />
              <span>本次有效</span>
            </div>
          </div>

          <LayerSection
            title="上海文保单位"
            icon="🏛️"
            mapInstance={mapInstance}
            subtypeDatas={snapshotB.subtypeDatas as SubtypeData[]}
            toggle={toggleBuildingSubtypeVisible}
          />
          <LayerSection
            title="历史背景数据"
            icon="📜"
            mapInstance={mapInstance}
            subtypeDatas={snapshotH.subtypeDatas as SubtypeData[]}
            toggle={toggleSubtypeVisible}
          />
        </div>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setIsExpanded(true)}
      className="fixed top-2 right-2 bg-white border rounded-full shadow-xl p-3 hover:shadow-2xl transition z-[10] hover:scale-110"
      title="打开控制台"
      aria-label="打开控制台"
    >
      <Settings className="w-5 h-5 text-gray-700" />
    </button>
  );
}

interface LayerSectionProps {
  title: string;
  icon: string;
  mapInstance: UtilsMap;
  subtypeDatas: SubtypeData[];
  toggle: (params: {
    visible: boolean;
    subtypeId?: string;
    categoryId?: string;
    mapInstance: UtilsMap;
  }) => void;
}

function LayerSection({
  title,
  icon,
  mapInstance,
  subtypeDatas,
  toggle,
}: LayerSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isGlobalVisible = !!_.find(subtypeDatas, "visible");
  const categoryDatas = _(subtypeDatas)
    .groupBy(({ category }) => category.id)
    .values()
    .value();

  return (
    <div className="border-2 border-gray-200 rounded-lg bg-white shadow-sm">
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-200 rounded transition"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
            <span className="text-base">{icon}</span>
            <span className="font-semibold text-gray-800">{title}</span>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isGlobalVisible}
              onChange={(e) =>
                toggle({
                  visible: e.target.checked,
                  mapInstance,
                })
              }
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-600">启用</span>
          </label>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3">
          <div className="space-y-3">
            {categoryDatas.map((categoryData) => {
              const isCategoryVisible = !!_.find(categoryData, "visible");

              const _categoryCount = _(categoryData)
                .map(({ data }) => data?.features?.length || 0)
                .sum();

              return (
                <div key={categoryData[0].category.id} className="space-y-2">
                  <div className="flex items-center justify-between py-1">
                    <label className="flex items-center space-x-2 cursor-pointer text-sm flex-1">
                      <input
                        type="checkbox"
                        checked={isCategoryVisible}
                        disabled={!isGlobalVisible}
                        onChange={() => {
                          toggle({
                            visible: !isCategoryVisible,
                            categoryId: categoryData[0].category.id,
                            mapInstance,
                          });
                        }}
                        className="w-3 h-3"
                      />
                      <span className="text-base">
                        {categoryData[0].category.icon}
                      </span>
                      <span
                        className={`${
                          isCategoryVisible ? "text-gray-800" : "text-gray-400"
                        } text-sm`}
                      >
                        {categoryData[0].category.name}
                      </span>
                    </label>
                    <span
                      className={`${
                        isCategoryVisible ? "text-gray-700" : "text-gray-400"
                      } text-xs`}
                    >
                      {/* {categoryCount} */}
                    </span>
                  </div>

                  {(isCategoryVisible || !isGlobalVisible) && (
                    <div className="ml-6 space-y-1">
                      {categoryData.map((subtypeData) => {
                        const { data, visible, subtype, id } = subtypeData;
                        const subtypeCount = data?.features?.length || 0;
                        const subtypeVisible = visible;
                        const effectiveVisible =
                          isGlobalVisible &&
                          isCategoryVisible &&
                          subtypeVisible;

                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between py-1"
                          >
                            <label className="flex items-center space-x-2 cursor-pointer text-xs flex-1">
                              <input
                                type="checkbox"
                                checked={subtypeVisible}
                                disabled={
                                  !isGlobalVisible || !isCategoryVisible
                                }
                                onChange={() => {
                                  toggle({
                                    visible: !subtypeVisible,
                                    subtypeId: id,
                                    mapInstance,
                                  });
                                }}
                                className="w-3 h-3"
                              />
                              <span
                                className="w-3 h-3 rounded-sm border"
                                style={{
                                  backgroundColor: effectiveVisible
                                    ? subtype.style.fillColor ||
                                      subtype.style.color
                                    : "#e5e5e5",
                                  borderColor: effectiveVisible
                                    ? subtype.style.color
                                    : "#ccc",
                                }}
                              ></span>
                              <span
                                className={`${
                                  effectiveVisible
                                    ? "text-gray-700"
                                    : "text-gray-400"
                                } text-xs`}
                              >
                                {subtype.name}
                              </span>
                            </label>
                            <span
                              className={`text-xs font-medium ${
                                effectiveVisible
                                  ? "text-gray-700"
                                  : "text-gray-400"
                              }`}
                            >
                              {subtypeCount}{" "}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
