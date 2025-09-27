// 兼容之前的 url 模式
export const getParamsFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const result: { center?: [number, number]; zoom?: number } = {};

  // 解析地图中心点
  const centerParam = params.get("center");
  if (centerParam) {
    try {
      const [lat, lng] = centerParam.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        result.center = [lat, lng];
      }
    } catch (error) {
      // 忽略解析错误
    }
  }

  // 解析缩放级别
  const zoomParam = params.get("zoom");
  if (zoomParam) {
    const zoom = parseInt(zoomParam, 10);
    if (!isNaN(zoom)) {
      result.zoom = zoom;
    }
  }

  return result;
};
