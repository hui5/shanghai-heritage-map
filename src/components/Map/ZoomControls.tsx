import React from "react";
import mapboxgl from "mapbox-gl";

interface ZoomControlsProps {
  mapInstance: mapboxgl.Map;
}

export function ZoomControls({ mapInstance }: ZoomControlsProps) {
  const handleZoomIn = () => {
    mapInstance.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstance.zoomOut();
  };

  return (
    <div className="absolute top-4 left-4 z-[10000] flex flex-col bg-white rounded-lg shadow-lg border border-gray-200">
      {/* 放大按钮 */}
      <button
        onClick={handleZoomIn}
        className="p-3 hover:bg-gray-100 transition-colors duration-200 rounded-t-lg border-b border-gray-200 group"
        title="放大"
        aria-label="放大地图"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-700 group-hover:text-gray-900"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* 缩小按钮 */}
      <button
        onClick={handleZoomOut}
        className="p-3 hover:bg-gray-100 transition-colors duration-200 rounded-b-lg group"
        title="缩小"
        aria-label="缩小地图"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-700 group-hover:text-gray-900"
        >
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  );
}
