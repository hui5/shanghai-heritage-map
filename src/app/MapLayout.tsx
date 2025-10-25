"use client";

import { useState } from "react";
import { LoadingOverlay } from "@/components/Loading/LoadingOverlay";
import MapContainer from "@/components/Map/MapContainer";

export default function MapLayout() {
  const [styleReady, setStyleReady] = useState<boolean>(false);

  return (
    <>
      <link
        href="https://api.mapbox.com/mapbox-gl-js/v3.16.0/mapbox-gl.css"
        rel="stylesheet"
      />
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.16.0/mapbox-gl.js"></script>
      <main className="map-container">
        <LoadingOverlay styleReady={styleReady} />
        <MapContainer onStyleReady={setStyleReady} />
      </main>
    </>
  );
}
