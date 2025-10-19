import { Settings } from "lucide-react";
import type { UtilsMap } from "map-gl-utils";
import { useRef, useState } from "react";
import { ConsoleHeader } from "./ConsoleHeader";
import { HelpModal } from "./HelpModal";
import { LayerManagement } from "./LayerManagement";
import { MapSettingsComponent } from "./MapSettings";

interface MapConsoleProps {
  mapInstance: UtilsMap;
}

export function MapConsole({ mapInstance }: MapConsoleProps) {
  const [isExpanded, setIsExpanded] = useState(() => false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // 直接从环境变量获取版本信息
  const versionInfo = {
    version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT || "local",
  };

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
        <ConsoleHeader
          onClose={() => setIsExpanded(false)}
          onHelpOpen={() => {
            setIsHelpOpen(true);
            setIsExpanded(false);
          }}
        />

        <div className="flex flex-col max-h-[60vh]">
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            {/* 地图设置 */}
            <MapSettingsComponent mapInstance={mapInstance} />

            {/* 图层管理 */}
            <LayerManagement mapInstance={mapInstance} />
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
        <Settings className="w-5 h-5 text-gray-700" />
      </button>

      {/* 帮助弹窗 */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
