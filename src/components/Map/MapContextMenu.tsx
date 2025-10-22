import type { Map as MapboxMap, MapMouseEvent } from "mapbox-gl";
import { useCallback, useEffect, useState } from "react";

interface MapContextMenuProps {
  mapInstance: MapboxMap | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function MapContextMenu({
  mapInstance,
  containerRef,
}: MapContextMenuProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [lngLat, setLngLat] = useState<{ lng: number; lat: number } | null>(
    null,
  );

  const hideMenu = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!mapInstance) return;

    const onContextMenu = (e: MapMouseEvent) => {
      try {
        setVisible(false);
        setLngLat({ lng: e.lngLat.lng, lat: e.lngLat.lat });

        const rect = containerRef.current?.getBoundingClientRect();
        const x = e.point.x;
        const y = e.point.y;

        const padding = 8;
        const menuWidth = 220;
        const menuHeight = 90;

        let left = x + padding;
        let top = y + padding;

        const containerWidth = rect?.width ?? 0;
        const containerHeight = rect?.height ?? 0;

        if (containerWidth && left + menuWidth > containerWidth) {
          left = x - menuWidth - padding;
        }
        if (containerHeight && top + menuHeight > containerHeight) {
          top = y - menuHeight - padding;
        }

        setPosition({ x: left, y: top });
        setVisible(true);

        (e as any).preventDefault?.();
        (e as any).originalEvent?.preventDefault?.();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Context menu error:", err);
      }
    };

    mapInstance.on("contextmenu", onContextMenu);
    mapInstance.on("movestart", hideMenu);
    mapInstance.on("zoomstart", hideMenu);
    mapInstance.on("dragstart", hideMenu);
    mapInstance.on("click", hideMenu);

    return () => {
      mapInstance.off("contextmenu", onContextMenu);
      mapInstance.off("movestart", hideMenu);
      mapInstance.off("zoomstart", hideMenu);
      mapInstance.off("dragstart", hideMenu);
      mapInstance.off("click", hideMenu);
    };
  }, [mapInstance, containerRef, hideMenu]);

  if (!visible || !lngLat) return null;

  const center = mapInstance?.getCenter();
  const currentZoom = mapInstance?.getZoom() ?? 15;

  const latFromCenter = center?.lat ?? lngLat.lat;
  const lngFromCenter = center?.lng ?? lngLat.lng;

  const computedDistance = 40000000 / 2 ** (currentZoom - 7);
  const clampedDistance = Math.max(
    50,
    Math.min(20000000, Number(computedDistance.toFixed(1))),
  );

  return (
    <div
      role="menu"
      className="absolute z-[10000] bg-white border rounded shadow-lg text-sm"
      style={{ left: position.x, top: position.y, width: 220 }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="px-3 py-2 border-b text-gray-600">
        坐标：{lngLat.lat.toFixed(6)}, {lngLat.lng.toFixed(6)}
      </div>

      <button
        type="button"
        className="w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          const url = `https://livingatlas.arcgis.com/wayback/#active=27982&mapCenter=${lngFromCenter}%2C${latFromCenter}%2C${
            Math.round(currentZoom) + 1
          }&mode=swipe&swipeWidget=27982%2C10`;
          window.open(url, "_blank", "noopener,noreferrer");
          setVisible(false);
        }}
      >
        Wayback（2021 - 2010）
      </button>

      <button
        type="button"
        className="w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          const url = `https://earth.google.com/web/@${latFromCenter},${lngFromCenter},${20}a,${clampedDistance}d,0h,0t`;
          window.open(url, "_blank", "noopener,noreferrer");
          setVisible(false);
        }}
      >
        Google Earth
      </button>

      <button
        type="button"
        className="w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          const dataSegment =
            "data=ChYqEAgBEgoyMDAyLTA3LTI0GAFCAggBOgMKATBCAggASg0I____________ARAA";
          const url = `https://earth.google.com/web/@${latFromCenter},${lngFromCenter},${20}a,${clampedDistance}d,0h,0t/${dataSegment}`;
          window.open(url, "_blank", "noopener,noreferrer");
          setVisible(false);
        }}
      >
        Google Earth 历史（2002）
      </button>

      <button
        type="button"
        className="w-full text-left px-3 py-2 hover:bg-gray-100"
        onClick={() => {
          const { lat, lng } = lngLat;
          const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&hl=zh-CN`;
          window.open(url, "_blank", "noopener,noreferrer");
          setVisible(false);
        }}
      >
        Google 街景
      </button>
    </div>
  );
}
