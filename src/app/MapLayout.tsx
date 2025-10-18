"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LoadingOverlay } from "@/components/Loading/LoadingOverlay";

// 动态导入地图组件，避免SSR问题
const MapContainer = dynamic(() => import("@/components/Map/MapContainer"), {
  ssr: false,
});

export default function MapLayout({ children }: { children: React.ReactNode }) {
  const [styleReady, setStyleReady] = useState<boolean>(false);

  return (
    <main className="map-container">
      <LoadingOverlay styleReady={styleReady} />
      <MapContainer onStyleReady={setStyleReady} />
      {children}
    </main>
  );
}
