/** biome-ignore-all lint/a11y/noStaticElementInteractions: false positive */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: false positive */

import { find } from "lodash";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  LayoutGrid,
  Maximize2,
} from "lucide-react";
import type React from "react";
import type { LocationInfo } from "../../../helper/map-data/LocationInfo";
import type { PanelContent, PanelTabId } from "./FloatingInfoPanel";

interface FloatingInfoPanelFullscreenProps {
  contents: PanelContent[];
  activeId: PanelTabId;
  showOverview: boolean;
  locationInfo?: LocationInfo;
  close: () => void;
  Buttons: React.ReactNode;
  className?: string;
  onTabSelect?: (tabId: PanelTabId) => void;
  onOverviewToggle?: () => void;
}

export const FloatingInfoPanelFullscreen: React.FC<
  FloatingInfoPanelFullscreenProps
> = ({
  contents,
  activeId,
  showOverview,
  locationInfo,
  close,
  Buttons,
  className = "",
  onTabSelect,
  onOverviewToggle,
}) => {
  const visibleContents = contents.filter((c) => c.visible !== false);

  // 获取当前tab的索引
  const currentIndex = visibleContents.findIndex((c) => c.id === activeId);

  // 切换到下一个tab
  const goToNextTab = () => {
    if (onTabSelect && visibleContents.length > 0) {
      const nextIndex = (currentIndex + 1) % visibleContents.length;
      onTabSelect(visibleContents[nextIndex].id);
    }
  };

  // 切换到上一个tab
  const goToPrevTab = () => {
    if (onTabSelect && visibleContents.length > 0) {
      const prevIndex =
        currentIndex <= 0 ? visibleContents.length - 1 : currentIndex - 1;
      onTabSelect(visibleContents[prevIndex].id);
    }
  };

  return (
    <div className={`fixed inset-0 z-[200] pointer-events-auto ${className}`}>
      <div
        className="h-full w-full flex flex-col bg-white/50 backdrop-blur-md border-t border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-label="信息面板全屏"
      >
        <div
          className={`select-none flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white/70 ${
            !showOverview
              ? "cursor-pointer hover:bg-white/80 transition-colors"
              : ""
          }`}
          onClick={
            !showOverview
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("头部点击回到概览模式");
                  onOverviewToggle?.();
                }
              : undefined
          }
          title={!showOverview ? "点击回到概览模式" : undefined}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">
              {locationInfo?.name}
            </span>
          </div>
          <div className="text-sm ml-7 font-bold text-gray-700 flex items-center gap-2">
            {!showOverview && (
              <>
                {find(visibleContents, (c) => c.id === activeId)?.label}
                <LayoutGrid size={14} className="text-gray-400 animate-pulse" />
              </>
            )}
          </div>
          {Buttons}
        </div>

        {showOverview ? (
          // 概览模式
          <div
            className="flex-1 pb-3 overflow-y-auto overflow-x-auto"
            onClick={(e) => {
              const target = e.target as HTMLElement | null;
              const insideTile = target?.closest("[data-tab-id]");
              const insideButton = target?.closest("button");
              if (!insideTile && !insideButton) {
                close();
              }
            }}
          >
            <div
              className={`flex items-start ${visibleContents.length > 4 ? "justify-start" : "justify-center"} gap-5 px-6`}
            >
              {visibleContents.map((c) => (
                <div key={c.id} data-tab-id={c.id} className="">
                  {/* 固定浮动的 Tab 名称 - 整个头部可点击单独显示 */}
                  <div
                    className="sticky top-0 px-3 py-2 mb-2 bg-gradient-to-b from-white via-white/85 to-white/50 backdrop-blur-md z-10 border-b border-gray-200/60 shadow-sm cursor-pointer hover:bg-white/90 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("tab头部点击单独显示:", c.id);
                      onTabSelect?.(c.id);
                      onOverviewToggle?.();
                    }}
                    title={`点击单独显示 ${c.label}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-800">
                          {c.label}
                        </span>
                        {c.hint && (
                          <span
                            className="inline-flex items-center"
                            title={c.hint}
                          >
                            <Info size={13} className="text-gray-400" />
                          </span>
                        )}
                      </div>
                      {/* 单独显示图标提示 */}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Maximize2
                          size={12}
                          className="animate-pulse hover:scale-125 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-1">{c.render}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Tab 模式 - 单个 tab 显示
          <div className="flex-1 overflow-auto pt-2 pb-3 relative">
            {/* 左侧切换按钮 - 浮动在内容区域 */}
            {visibleContents.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToPrevTab();
                }}
                className="fixed left-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 bg-white/90 hover:bg-white border border-gray-200 rounded-full shadow-xl transition-all hover:shadow-2xl backdrop-blur-sm hover:scale-110"
                title="上一个标签页"
              >
                <ChevronLeft
                  size={24}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                />
              </button>
            )}

            {/* 右侧切换按钮 - 浮动在内容区域 */}
            {visibleContents.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToNextTab();
                }}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 bg-white/90 hover:bg-white border border-gray-200 rounded-full shadow-xl transition-all hover:shadow-2xl backdrop-blur-sm hover:scale-110"
                title="下一个标签页"
              >
                <ChevronRight
                  size={24}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                />
              </button>
            )}

            <div
              className="flex justify-center px-3"
              onClick={(e) => {
                const target = e.target as HTMLElement | null;
                const insideTile = target?.closest("[data-tab-id]");
                const insideButton = target?.closest("button");
                if (!insideTile && !insideButton) {
                  close();
                }
              }}
            >
              {visibleContents.map((c) => (
                <div
                  key={c.id}
                  className=""
                  style={{
                    display: activeId === c.id ? "block" : "none",
                  }}
                  data-tab-id={c.id}
                >
                  {c.render}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
