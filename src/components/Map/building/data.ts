import _, { difference } from "lodash";
import type { UtilsMap } from "map-gl-utils";
import { proxy, ref } from "valtio";
import type {
  DataCategory,
  DataSubtype,
  UnifiedConfig,
} from "@/components/Map/historical/types";
import { convertCoordinatesForChina } from "@/utils/coordinateConverter";
import buildingConfig from "./config.json";

const sourceId = "openda_building-source";

const config = buildingConfig as UnifiedConfig;

export const state = proxy({
  loading: {
    processing: [] as string[],
    completed: [] as string[],
    failed: [] as string[],
  },
  subtypeDatas: [] as BuildingSubtypeData[],
});

export interface BuildingSubtypeData {
  id: string;
  subtype: DataSubtype;
  category: DataCategory;
  data: GeoJSON.FeatureCollection;
  visible: boolean;
}

console.log("building data: ");

config.categories.forEach((category) => {
  category.subtypes.forEach((subtype) => {
    const subtypeData: BuildingSubtypeData = {
      id: subtype.id,
      subtype,
      category,
      data: { type: "FeatureCollection", features: [] },
      visible: category.enabled && subtype.enabled,
    };
    if (category.enabled && subtype.enabled) {
      state.subtypeDatas.push(subtypeData);
    }
  });
});
const files = ["data/data.json", "data/data_1.json"];
state.loading.processing = files;
files.forEach(async (url) => {
  try {
    const response = await fetch(url);
    const { data } = await response.json();
    const convertedData = processCoordinates(data);
    state.subtypeDatas.forEach((subtypeData) => {
      const { subtype } = subtypeData;
      const data = convertedData.filter((item) => {
        if (item.type.includes(subtype.name)) {
          item.dataSource = subtype.id;
          return true;
        } else {
          return false;
        }
      });

      const newFeatures = convertToGeoJSON(data).features;
      subtypeData.data.features = ref([
        ...subtypeData.data.features,
        ...newFeatures,
      ]);
    });
    state.loading.completed = [...state.loading.completed, url];
  } catch (_e) {
    state.loading.failed = [...state.loading.failed, url];
  } finally {
    state.loading.processing = difference(state.loading.processing, [url]);
  }
});

export const toggleSubtypeVisible = ({
  visible,
  subtypeId,
  categoryId,
  mapInstance,
}: {
  visible: boolean;
  subtypeId?: string;
  categoryId?: string;
  mapInstance: UtilsMap;
}) => {
  const toggle = (subtypeData: BuildingSubtypeData) => {
    subtypeData.visible = visible;
  };

  _(state.subtypeDatas)
    .filter(({ category, subtype }) =>
      categoryId
        ? category.id === categoryId
        : subtypeId
          ? subtype.id === subtypeId
          : true,
    )
    .forEach(toggle);

  // 使用防抖来避免频繁更新地图数据源
  updateMapDataDebounced(mapInstance);
};

// 防抖函数，避免频繁更新地图数据源
let updateMapDataTimer: NodeJS.Timeout | null = null;
export const updateMapDataDebounced = (mapInstance: UtilsMap) => {
  if (updateMapDataTimer) {
    clearTimeout(updateMapDataTimer);
  }

  updateMapDataTimer = setTimeout(() => {
    // 重新计算所有可见的特征
    const allFeatures = _(state.subtypeDatas)
      .filter("visible")
      .map(({ data }) => data.features)
      .value()
      .flat();

    mapInstance.U.setData(sourceId, {
      type: "FeatureCollection",
      features: allFeatures,
    });

    updateMapDataTimer = null;
  }, 10); // 10ms 防抖延迟
};

/**
 * 处理坐标转换和验证
 */
function processCoordinates(buildings: BuildingData[]): BuildingData[] {
  return buildings.map((building) => {
    try {
      const lat = parseFloat(building.lat);
      const lng = parseFloat(building.long);

      // 跳过无效坐标
      if (lat === 0 || lng === 0 || Number.isNaN(lat) || Number.isNaN(lng)) {
        return building;
      }

      // 坐标转换：从BD09转换为WGS84
      const [lngCorrected, latCorrected] = convertCoordinatesForChina(
        lng,
        lat,
        "bd09",
        "wgs84",
      );

      building.lat_corrected = latCorrected;
      building.lng_corrected = lngCorrected;

      return building;
    } catch (error) {
      console.warn(`坐标转换失败: ${building.nameS}`, error);
      return building;
    }
  });
}

export const convertToGeoJSON = (
  data: BuildingData[],
): GeoJSON.FeatureCollection => {
  return {
    type: "FeatureCollection",
    features: data.map((item) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [item.lng_corrected, item.lat_corrected] as [
          number,
          number,
        ],
      },
      properties: item,
    })),
  };
};

// 建筑数据类型定义
interface BuildingData {
  nameE: string;
  address: string;
  houseNumber: string;
  placeUri: string;
  firstImg: string;
  type: string;
  uri: string;
  long: string;
  nameT: string;
  nameS: string;
  des: string;
  road: string;
  roadUri: string;
  lat: string;
  placeValue: string;

  // 处理后的字段
  dataSource?: string;

  lat_corrected?: number;
  lng_corrected?: number;

  // 扩展字段
  photo_url?: string; // 建筑图片文件名
  wiki_url?: string; // 维基百科链接
  csv_names?: string[]; // CSV文件中的建筑名称
  construction_year?: string; // 建设年份
  batch?: string; // 批次信息
}
