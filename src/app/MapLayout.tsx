"use client";

import { useState } from "react";
import { LoadingOverlay } from "@/components/Loading/LoadingOverlay";
import MapContainer from "@/components/Map/MapContainer";

export default function MapLayout() {
  const [styleReady, setStyleReady] = useState<boolean>(false);

  return (
    <main className="map-container">
      <LoadingOverlay styleReady={styleReady} />
      <MapContainer onStyleReady={setStyleReady} />
    </main>
  );
}
