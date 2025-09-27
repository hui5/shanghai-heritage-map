// 坐标转换工具 - TypeScript版本
// 基于原Python版本的coordinate_converter.py转换

/**
 * 从不同坐标系转换为适合地图显示的坐标系
 * @param lng 经度
 * @param lat 纬度
 * @param fromSystem 源坐标系
 * @param toSystem 目标坐标系
 * @returns [lng, lat] 转换后的坐标
 */
export function convertCoordinatesForChina(
  lng: number,
  lat: number,
  fromSystem: "bd09" | "gcj02" | "wgs84" = "bd09",
  toSystem: "wgs84" | "gcj02" = "wgs84"
): [number, number] {
  let convertedLng = lng;
  let convertedLat = lat;

  // BD09 -> GCJ02
  if (fromSystem === "bd09") {
    [convertedLng, convertedLat] = bd09ToGcj02(convertedLng, convertedLat);
  }

  // GCJ02 -> WGS84
  if (
    toSystem === "wgs84" &&
    (fromSystem === "bd09" || fromSystem === "gcj02")
  ) {
    [convertedLng, convertedLat] = gcj02ToWgs84(convertedLng, convertedLat);
  }

  return [convertedLng, convertedLat];
}

/**
 * WGS84 坐标系转 GCJ02 坐标系
 */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (!isInChina(lng, lat)) return [lng, lat];
  const dlat = transformLat(lng - 105.0, lat - 35.0);
  const dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radlat);
  magic = 1 - 0.00669342162296594323 * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  const transformedDlat =
    (dlat * 180.0) /
    (((6378245.0 * (1 - 0.00669342162296594323)) / (magic * sqrtmagic)) *
      Math.PI);
  const transformedDlng =
    (dlng * 180.0) / ((6378245.0 / sqrtmagic) * Math.cos(radlat) * Math.PI);
  const mglat = lat + transformedDlat;
  const mglng = lng + transformedDlng;
  return [mglng, mglat];
}

/**
 * GCJ02 坐标系转 BD09 坐标系
 */
export function gcj02ToBd09(lng: number, lat: number): [number, number] {
  const z =
    Math.sqrt(lng * lng + lat * lat) +
    0.00002 * Math.sin((lat * Math.PI * 3000.0) / 180.0);
  const theta =
    Math.atan2(lat, lng) +
    0.000003 * Math.cos((lng * Math.PI * 3000.0) / 180.0);
  const bdLng = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;
  return [bdLng, bdLat];
}

/**
 * WGS84 坐标系转 BD09 坐标系（WGS84 -> GCJ02 -> BD09）
 */
export function wgs84ToBd09(lng: number, lat: number): [number, number] {
  const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
  return gcj02ToBd09(gcjLng, gcjLat);
}

/**
 * BD09坐标系转GCJ02坐标系
 */
function bd09ToGcj02(lng: number, lat: number): [number, number] {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z =
    Math.sqrt(x * x + y * y) -
    0.00002 * Math.sin((y * Math.PI * 3000.0) / 180.0);
  const theta =
    Math.atan2(y, x) - 0.000003 * Math.cos((x * Math.PI * 3000.0) / 180.0);
  const gcjLng = z * Math.cos(theta);
  const gcjLat = z * Math.sin(theta);
  return [gcjLng, gcjLat];
}

/**
 * GCJ02坐标系转WGS84坐标系
 */
function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  const dlat = transformLat(lng - 105.0, lat - 35.0);
  const dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radlat);
  magic = 1 - 0.00669342162296594323 * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  const transformedDlat =
    (dlat * 180.0) /
    (((6378245.0 * (1 - 0.00669342162296594323)) / (magic * sqrtmagic)) *
      Math.PI);
  const transformedDlng =
    (dlng * 180.0) / ((6378245.0 / sqrtmagic) * Math.cos(radlat) * Math.PI);
  const mglat = lat - transformedDlat;
  const mglng = lng - transformedDlng;
  return [mglng, mglat];
}

/**
 * 纬度转换辅助函数
 */
function transformLat(lng: number, lat: number): number {
  let ret =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng));
  ret +=
    ((20.0 * Math.sin(6.0 * lng * Math.PI) +
      20.0 * Math.sin(2.0 * lng * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin((lat / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((160.0 * Math.sin((lat / 12.0) * Math.PI) +
      320 * Math.sin((lat * Math.PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * 经度转换辅助函数
 */
function transformLng(lng: number, lat: number): number {
  let ret =
    300.0 +
    lng +
    2.0 * lat +
    0.1 * lng * lng +
    0.1 * lng * lat +
    0.1 * Math.sqrt(Math.abs(lng));
  ret +=
    ((20.0 * Math.sin(6.0 * lng * Math.PI) +
      20.0 * Math.sin(2.0 * lng * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin((lng / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((150.0 * Math.sin((lng / 12.0) * Math.PI) +
      300.0 * Math.sin((lng / 30.0) * Math.PI)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * 检查坐标是否在中国境内（大致范围）
 */
export function isInChina(lng: number, lat: number): boolean {
  // 中国大致经纬度范围
  return lng >= 73 && lng <= 135 && lat >= 15 && lat <= 54;
}

/**
 * 批量转换坐标
 */
export function batchConvertCoordinates(
  coordinates: Array<{ lng: number; lat: number }>,
  fromSystem: "bd09" | "gcj02" | "wgs84" = "bd09",
  toSystem: "wgs84" | "gcj02" = "wgs84"
): Array<{ lng: number; lat: number }> {
  return coordinates.map((coord) => {
    const [lng, lat] = convertCoordinatesForChina(
      coord.lng,
      coord.lat,
      fromSystem,
      toSystem
    );
    return { lng, lat };
  });
}

// 转换GeoJSON坐标
export const convertGeoJSONCoordinates = (
  geojsonData: GeoJSON.FeatureCollection,
  sourceCoordinateSystem: "wgs84" | "gcj02" | "bd09" = "gcj02",
  targetCoordinateSystem: "wgs84" | "gcj02" = "wgs84"
): GeoJSON.FeatureCollection => {
  try {
    const convertedData = geojsonData; // 深拷贝

    // 如果源坐标系和目标坐标系相同，跳过转换
    if (sourceCoordinateSystem === targetCoordinateSystem) {
      return convertedData;
    }

    convertedData.features = convertedData.features.map((feature: any) => {
      if (feature.geometry && feature.geometry.coordinates) {
        if (feature.geometry.type === "Point") {
          // 点要素：直接转换坐标
          const [lng, lat] = feature.geometry.coordinates;
          const [convertedLng, convertedLat] = convertCoordinatesForChina(
            lng,
            lat,
            sourceCoordinateSystem,
            targetCoordinateSystem
          );
          feature.geometry.coordinates = [convertedLng, convertedLat];
        } else if (feature.geometry.type === "LineString") {
          // 线要素：转换所有坐标点
          feature.geometry.coordinates = feature.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => {
              const [convertedLng, convertedLat] = convertCoordinatesForChina(
                lng,
                lat,
                sourceCoordinateSystem,
                targetCoordinateSystem
              );
              return [convertedLng, convertedLat];
            }
          );
        } else if (feature.geometry.type === "MultiLineString") {
          // 多线要素：转换所有线的所有坐标点
          feature.geometry.coordinates = feature.geometry.coordinates.map(
            (line: [number, number][]) =>
              line.map(([lng, lat]) => {
                const [convertedLng, convertedLat] = convertCoordinatesForChina(
                  lng,
                  lat,
                  sourceCoordinateSystem,
                  targetCoordinateSystem
                );
                return [convertedLng, convertedLat];
              })
          );
        } else if (feature.geometry.type === "Polygon") {
          // 面要素：转换所有环的所有坐标点
          feature.geometry.coordinates = feature.geometry.coordinates.map(
            (ring: [number, number][]) =>
              ring.map(([lng, lat]) => {
                const [convertedLng, convertedLat] = convertCoordinatesForChina(
                  lng,
                  lat,
                  sourceCoordinateSystem,
                  targetCoordinateSystem
                );
                return [convertedLng, convertedLat];
              })
          );
        }
      }
      return feature;
    });

    return convertedData;
  } catch (error) {
    console.warn("Failed to convert coordinates, using original data:", error);
    return geojsonData as GeoJSON.FeatureCollection;
  }
};
