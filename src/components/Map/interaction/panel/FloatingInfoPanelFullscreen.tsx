/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */

import { find } from "lodash";
import { Info } from "lucide-react";
import type React from "react";
import type { LocationInfo } from "../../../../helper/map-data/LocationInfo";
import type { PanelContent, PanelTabId } from "./FloatingInfoPanel";

interface FloatingInfoPanelFullscreenProps {
  contents: PanelContent[];
  activeId: PanelTabId;
  showOverview: boolean;
  locationInfo?: LocationInfo;
  close: () => void;
  Buttons: React.ReactNode;
  className?: string;
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
}) => {
  const visibleContents = contents.filter((c) => c.visible !== false);

  return (
    <div className={`fixed inset-0 z-[200] pointer-events-auto ${className}`}>
      <div
        className="h-full w-full flex flex-col bg-white/50 backdrop-blur-md border-t border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-label="信息面板全屏"
      >
        <div className="select-none flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white/70">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">
              {locationInfo?.name}
            </span>
          </div>
          <div className="text-sm ml-7 font-bold text-gray-700">
            {!showOverview &&
              find(visibleContents, (c) => c.id === activeId)?.label}
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
              if (!insideTile) {
                close();
              }
            }}
          >
            <div
              className={`flex items-start ${visibleContents.length > 4 ? "justify-start" : "justify-center"} gap-5 px-6`}
            >
              {visibleContents.map((c) => (
                <div key={c.id} data-tab-id={c.id} className="">
                  {/* 固定浮动的 Tab 名称 */}
                  <div className="sticky top-0 px-3 py-2 mb-2 bg-gradient-to-b from-white via-white/85 to-white/50 backdrop-blur-md z-10 border-b border-gray-200/60 shadow-sm">
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
                  </div>
                  <div className="px-1">{c.render}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Tab 模式 - 单个 tab 显示
          <div
            className="flex-1 overflow-auto pt-2 pb-3"
            onClick={(e) => {
              const target = e.target as HTMLElement | null;
              const insideTile = target?.closest("[data-tab-id]");
              if (!insideTile) {
                close();
              }
            }}
          >
            <div className="flex justify-center px-3">
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
