import _ from "lodash";
import { ChevronDown, ChevronRight, Settings, Type } from "lucide-react";
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

export function MapConsole({ mapInstance }: { mapInstance: UtilsMap }) {
  const [isExpanded, setIsExpanded] = useState(() => false);
  const [fontSize, setFontSize] = useState<number>(1.0);

  const snapshotH = useSnapshot(stateH);
  const snapshotB = useSnapshot(stateB);

  // 保存每个图层的原始字体大小
  const originalTextSizesRef = useRef<Map<string, any>>(new Map());

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
            <h3 className="font-semibold text-gray-800">地图控制台</h3>
          </button>
        </div>
      </div>

      <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {/* 全局显示设置 */}
        <div className="mb-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="p-4 space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <Settings className="w-4 h-4 text-indigo-600" />
              <h4 className="font-semibold text-gray-800">设置</h4>
            </div>

            {/* 字体大小控制 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Type className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    地图字体大小
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
    <div className="mb-4 border rounded-lg">
      <div className="bg-gray-50 border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
            <span className="text-base">{icon}</span>
            <span className="font-medium text-gray-800">{title}</span>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isGlobalVisible}
              onChange={(e) =>
                toggle({
                  visible: e.target.checked,
                  mapInstance,
                })
              }
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600">启用</span>
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
