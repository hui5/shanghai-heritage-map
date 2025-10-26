import { Settings } from "lucide-react";
import type { UtilsMap } from "map-gl-utils";
import { useEffect, useRef, useState } from "react";
import { useSearchHistoryStore } from "../../interaction/panel/searchStore";
import { ConsoleHeader } from "./ConsoleHeader";
import { LayerManagement } from "./LayerManagement";
import { MapSettingsComponent } from "./MapSettings";
import { SearchHistory } from "./SearchHistory";

interface MapConsoleProps {
  mapInstance: UtilsMap;
}

// Tab 类型定义
type TabType = "searchHistory" | "dataLayers" | "mapSettings";

export function MapConsole({ mapInstance }: MapConsoleProps) {
  const [isExpanded, setIsExpanded] = useState(() => false);
  const { history } = useSearchHistoryStore();

  // 如果有查询记录，默认显示查询历史，否则显示数据图层
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    history.length > 0 ? "searchHistory" : "dataLayers",
  );

  const panelRef = useRef<HTMLDivElement | null>(null);

  // 直接从环境变量获取版本信息
  const versionInfo = {
    version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT || "local",
  };

  // ESC 键关闭控制台
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isExpanded]);

  return (
    <>
      {/* 设置面板 - 保持挂载状态，只控制显示/隐藏 */}
      <div
        ref={panelRef}
        className={`fixed top-2 right-2 bg-white rounded-lg shadow-xl border w-80 max-h-[80vh] z-[100] transition-all duration-300 ${
          isExpanded
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <ConsoleHeader onClose={() => setIsExpanded(false)} />

        {/* Tab 导航 */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab("searchHistory")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "searchHistory"
                ? "text-indigo-600 border-b-2 border-indigo-400 bg-indigo-30"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            查询历史
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dataLayers")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "dataLayers"
                ? "text-indigo-600 border-b-2 border-indigo-400 bg-indigo-30"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            数据图层
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mapSettings")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "mapSettings"
                ? "text-indigo-600 border-b-2 border-indigo-400 bg-indigo-30"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            地图设置
          </button>
        </div>

        <div className="flex flex-col max-h-[60vh]">
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            {/* 根据 activeTab 显示对应内容 */}
            {activeTab === "searchHistory" ? (
              <SearchHistory mapInstance={mapInstance} />
            ) : activeTab === "dataLayers" ? (
              <LayerManagement mapInstance={mapInstance} />
            ) : (
              <MapSettingsComponent mapInstance={mapInstance} />
            )}
          </div>

          {/* 版本信息 - 固定在底部 */}
          {versionInfo && (
            <div className="px-4 py-2 border-t bg-gray-50 rounded-b-lg">
              <div className="text-xs text-gray-500 text-center">
                v{versionInfo.version} • {versionInfo.gitCommit}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 设置按钮 */}
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="fixed top-3 right-3 bg-white border rounded-full shadow-xl p-2 hover:shadow-2xl transition z-[10] hover:scale-110"
        title="打开控制台"
        aria-label="打开控制台"
      >
        <Settings className="w-6 h-6 text-gray-700" />
      </button>
    </>
  );
}
