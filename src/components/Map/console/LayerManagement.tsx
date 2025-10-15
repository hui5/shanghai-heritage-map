import _ from "lodash";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";
import type { UtilsMap } from "map-gl-utils";
import { useState } from "react";
import { useSnapshot } from "valtio";
import {
  state as stateB,
  toggleSubtypeVisible as toggleBuildingSubtypeVisible,
} from "../building/data";
import {
  type SubtypeData,
  state as stateH,
  toggleSubtypeVisible,
} from "../historical/data";

interface LayerManagementProps {
  mapInstance: UtilsMap;
}

export function LayerManagement({ mapInstance }: LayerManagementProps) {
  const snapshotH = useSnapshot(stateH);
  const snapshotB = useSnapshot(stateB);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-3 py-2 ">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-gray-800">数据图层</span>
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
