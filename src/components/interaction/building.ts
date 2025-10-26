import { cloneDeep } from "lodash";
import type { GeoJSONFeature } from "mapbox-gl";
import type { LocationInfo } from "@/helper/map-data/LocationInfo";
import type { Geometry } from "../Map/historical/types";

export const unclusteredLayerIds = [
  "openda_building-unclustered-point",
  "openda_building-labels",
];

export const getBuildingLocationInfo = (
  feature: GeoJSONFeature,
): LocationInfo => {
  const props = feature.properties || {};

  return {
    dataSource: "上海图书馆",

    name: props.nameS || props.nameT || props.name || "",
    address: props.address || "",
    description: props.description || props.des || "",

    wikipedia: props.wiki_url || "",
    wikidata: "",
    wikicommons: "",

    properties: props,
    subtypeId: "",

    geometry: cloneDeep(feature.geometry) as Geometry,
  };
};

// 简化的信息标签组件样式生成器
export const createInfoTag = (
  icon: string,
  label: string,
  value: string | number,
  color: string,
) => {
  const hasValue = value !== "" && value !== null && value !== undefined;

  if (hasValue) {
    return `
        <div style="display: flex; align-items: center; justify-content: space-between; margin: 4px 0; padding: 2px 0;">
          <span style="font-size: 12px; color: #374151; font-weight: 500;">${icon} ${label}</span>
          <span style="font-size: 12px; font-weight: 600; color: ${color};">${value}</span>
        </div>
      `;
  } else {
    return `
        <div style="display: flex; align-items: center; margin: 4px 0; padding: 2px 0;">
          <span style="font-size: 12px; color: ${color}; font-weight: 500;">${icon} ${label}</span>
        </div>
      `;
  }
};

// 获取建筑类型信息
const getBuildingTypeInfo = (props: any) => {
  const type = props.type || "";

  // 根据type字段判断建筑类型
  if (type.includes("全国重点文物保护单位")) {
    return { icon: "🏛️", name: "全国重点文物保护单位", color: "#DC2626" };
  } else if (
    type.includes("上海市文物保护单位") ||
    type.includes("市级文物保护单位")
  ) {
    return { icon: "🏢", name: "市级文物保护单位", color: "#EA580C" };
  } else if (type.includes("区级文物保护单位")) {
    return { icon: "🏘️", name: "区级文物保护单位", color: "#F59E0B" };
  } else if (type.includes("上海市优秀历史建筑")) {
    return { icon: "🏰", name: "优秀历史建筑", color: "#8E44AD" };
  } else if (type.includes("红色旅游")) {
    return { icon: "🚩", name: "红色旅游景点", color: "#991B1B" };
  } else if (type.includes("文物保护点")) {
    return { icon: "📍", name: "文物保护点", color: "#84CC16" };
  } else {
    return { icon: "🏠", name: "历史建筑", color: "#6B7280" };
  }
};

// 生成建筑详细信息标签
const generateBuildingInfoTags = (pointInfo: LocationInfo) => {
  const props = pointInfo.properties;
  const address = pointInfo.address;
  const infoTags = [];

  // 建筑类型标签
  const buildingTypeInfo = getBuildingTypeInfo(props);
  infoTags.push(
    createInfoTag("", buildingTypeInfo.name, "", buildingTypeInfo.color),
  );

  // 建设年份（data_1特有）
  if (props.construction_year) {
    infoTags.push(
      createInfoTag("🗓️", "建设年份", props.construction_year, "#6B7280"),
    );
  }

  // 批次信息（data_1特有）
  if (props.batch) {
    infoTags.push(createInfoTag("📋", "批次", props.batch, "#3B82F6"));
  }

  // 地址信息
  if (address?.trim()) {
    infoTags.push(createInfoTag("📍", "地址：", address, "#6B7280"));
  }

  // 所在区域
  if (props.placeValue?.trim()) {
    infoTags.push(createInfoTag("🏢", "区域", props.placeValue, "#8B5CF6"));
  }

  return infoTags;
};

// 生成建筑状态标签（简化版本）
const generateBuildingStatusTags = (locationInfo: LocationInfo) => {
  const { wikipedia, description } = locationInfo;
  const statusTags = [];

  // 数据来源（统一显示）
  statusTags.push("上海图书馆");

  // Wiki链接状态
  const hasWikiLink = wikipedia && wikipedia.trim() !== "";
  if (hasWikiLink) {
    statusTags.push("📖 关联维基百科");
  }

  // 描述信息状态 - 统一使用description字段
  if (description && description.trim() !== "") {
    statusTags.push("📝 有详细描述");
  }

  return statusTags;
};

// 导出建筑弹出框内容生成函数
export const generateBuildingPopupContent = (feature: GeoJSONFeature) => {
  // 获取建筑名称 - 支持多种格式
  const locationInfo = getBuildingLocationInfo(feature);
  const props = locationInfo.properties;
  const buildingName = locationInfo.name;

  const photoUrl = props.photo_url;

  // 使用新的函数生成信息标签和状态标签
  const infoTags = generateBuildingInfoTags(locationInfo);
  const statusTags = generateBuildingStatusTags(locationInfo);

  // 描述信息处理 - 统一使用description字段
  const description = locationInfo.description;
  const hasDescription = description && description.length > 0;

  // 创建弹出框内容，简化设计，直接包含图片
  const popupContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 300px; background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; pointer-events: none;">
        ${
          photoUrl
            ? `
        <!-- 图片区域 -->
        <div style="position: relative;">
          <img src="/images/${photoUrl}" 
               style="width: 100%; height: 180px; object-fit: cover; display: block;" 
               onerror="this.style.display='none'" />
        </div>
        `
            : ""
        }
        <div style="padding: 16px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; line-height: 1.4;">
            ${buildingName}
          </h3>
          
          <!-- 信息标签区域 -->
          <div style="margin-bottom: 12px; ">
            ${infoTags.join("")}
          </div>
          
          ${
            hasDescription
              ? `
          <!-- 描述信息区域 -->
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 13px; color:#4b5563; line-height: 1.5;">
               ${
                 description.length > 120
                   ? `${description.substring(0, 120)}...`
                   : description
               }
            </p>
          </div>
          `
              : ""
          }
          
          ${
            statusTags.length > 0
              ? `
          <!-- 状态标签区域 -->
          <div style="border-top: 1px solid #E5E7EB; padding-top: 8px;">
            <p style="margin: 0; font-size: 11px; color: #9CA3AF; line-height: 1.4;">
              ${statusTags.join(" · ")}
            </p>
          </div>
          `
              : ""
          }
        </div>
      </div>
    `;

  return { popupContent, photoUrl, locationInfo };
};
