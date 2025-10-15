import { Settings } from "lucide-react";
import type { UtilsMap } from "map-gl-utils";
import { useEffect, useRef, useState } from "react";
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

  return (
    <>
      {isExpanded ? (
        <div
          ref={panelRef}
          className="fixed top-2 right-2 bg-white rounded-lg shadow-xl border w-80 max-h-[80vh] z-[100]"
        >
          <ConsoleHeader
            onClose={() => setIsExpanded(false)}
            onHelpOpen={() => {
              setIsHelpOpen(true);
              setIsExpanded(false);
            }}
          />

          <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* 地图设置 */}
            <MapSettingsComponent mapInstance={mapInstance} />

            {/* 图层管理 */}
            <LayerManagement mapInstance={mapInstance} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="fixed top-3 right-3 bg-white border rounded-full shadow-xl p-2 hover:shadow-2xl transition z-[10] hover:scale-110"
          title="打开控制台"
          aria-label="打开控制台"
        >
          <Settings className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* 帮助弹窗 */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
