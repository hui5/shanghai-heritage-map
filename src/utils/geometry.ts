// 获取几何体的极值坐标点（支持 top/bottom/left/right）
type ExtremumMode = "top" | "bottom" | "left" | "right";
export const getExtremeCoordinate = (
  geometry: any,
  mode: ExtremumMode = "left",
): [number, number] => {
  if (!geometry) return [0, 0];
  const { type, coordinates } = geometry;

  if (type === "Point") {
    return (coordinates as [number, number]).slice() as [number, number];
  }

  // 计算几何的包围盒
  const bounds = {
    minLng: Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity,
  };

  const traverse = (node: any) => {
    if (!Array.isArray(node)) return;
    if (
      node.length >= 2 &&
      typeof node[0] === "number" &&
      typeof node[1] === "number"
    ) {
      const lng = node[0] as number;
      const lat = node[1] as number;
      if (lng < bounds.minLng) bounds.minLng = lng;
      if (lng > bounds.maxLng) bounds.maxLng = lng;
      if (lat < bounds.minLat) bounds.minLat = lat;
      if (lat > bounds.maxLat) bounds.maxLat = lat;
      return;
    }
    for (const child of node) traverse(child);
  };

  traverse(coordinates);

  if (
    !Number.isFinite(bounds.minLng) ||
    !Number.isFinite(bounds.maxLng) ||
    !Number.isFinite(bounds.minLat) ||
    !Number.isFinite(bounds.maxLat)
  ) {
    return [0, 0];
  }

  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;

  switch (mode) {
    case "top":
      return [centerLng, bounds.maxLat];
    case "bottom":
      return [centerLng, bounds.minLat];
    case "right":
      return [bounds.maxLng, centerLat];
    default:
      return [bounds.minLng, centerLat];
  }
};
