"use client";

import dynamic from "next/dynamic";

// 动态导入地图组件，避免SSR问题
const MapContainer = dynamic(() => import("@/components/Map/MapContainer"), {
  ssr: false,
});

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="map-container">
      <MapContainer />
      {children}
    </main>
  );
}
