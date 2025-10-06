import { Box, Layers3 } from "lucide-react";
import type React from "react";

interface Map3DToggleProps {
  mapMode: "2d" | "3d" | "middle";
  onToggle: (mode: "2d" | "3d" | "middle") => void;
  on3DAngleToggle?: () => void;
  currentPitch?: number;
  className?: string;
}

export const Map3DToggle: React.FC<Map3DToggleProps> = ({
  mapMode,
  onToggle,
  on3DAngleToggle,
  currentPitch = 60,
  className = "",
}) => {
  // 确定当前激活的模式

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-gray-200 p-1 ${className}`}
      style={{ minWidth: "100px" }}
    >
      <div className="flex items-center space-x-1">
        {/* 2D 按钮 */}
        <button
          type="button"
          onClick={() => onToggle(mapMode === "middle" ? "2d" : "middle")}
          className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            mapMode === "2d"
              ? "bg-blue-500 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          title="2D地图"
        >
          <Box size={16} className="mr-1" />
          2D
        </button>

        {/* 3D 按钮 */}
        <button
          type="button"
          onClick={
            mapMode === "2d" ? () => onToggle("middle") : on3DAngleToggle
          }
          className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            mapMode === "3d"
              ? "bg-blue-500 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          title={mapMode === "3d" ? `3D地图 (${currentPitch}°)` : "3D地图"}
        >
          <Layers3 size={16} className="mr-1" />
          3D
          {/* {mapMode === "3d" && (
            <span className="ml-1 text-xs opacity-75">{currentPitch}°</span>
          )} */}
        </button>

        {/* 卫星 按钮 */}
        {/* <button
          onClick={() => onToggle("satellite")}
          className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            currentMode === "satellite"
              ? "bg-green-500 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          title="卫星地图"
        >
          <Satellite size={16} className="mr-1" />
          卫星
        </button> */}
      </div>
    </div>
  );
};
