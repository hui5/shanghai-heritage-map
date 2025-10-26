import { cloneDeep } from "lodash";
import type { GeoJSONFeature } from "mapbox-gl";
import type { Geometry } from "@/components/Map/historical/types";
import {
  generateMapbookAttributeRows,
  getMapbookLocationInfo,
} from "@/helper/map-data/mapbook";
import {
  generateOSMAttributeRows,
  getOSMLocationInfo,
} from "@/helper/map-data/openstreetmap";
import {
  generateVirtualShanghaiAttributeRows,
  getVirtualShanghaiLocationInfo,
} from "@/helper/map-data/virtualshanghai";
import { findConfigInfo } from "@/utils/unifiedConfig";
import type { LocationInfo } from "../../helper/map-data/LocationInfo";
import { getWikidataLocationInfo } from "../../helper/map-data/wikidata";
import { config, getSubtypeIdFromLayerId } from "../Map/historical/data";

export const getHistoricalLocationInfo = (
  feature: GeoJSONFeature,
): LocationInfo => {
  const props = feature.properties || {};

  const layerId = feature.layer?.id;

  // 从图层ID中提取子类型ID
  const subtypeId = getSubtypeIdFromLayerId(layerId || "");

  // 判断是否为 OSM 子类型
  const isOSM = subtypeId.includes("osm_");
  const isWikidata = subtypeId.includes("wikidata_");
  const isVirtualShanghai = subtypeId.includes("virtual_shanghai_");
  // 使用config和subtypeId确定数据源信息

  let locationInfo: LocationInfo;

  // OSM
  if (isOSM) {
    locationInfo = getOSMLocationInfo(props, subtypeId);
  }
  // wikidata
  else if (isWikidata) {
    locationInfo = getWikidataLocationInfo(props, subtypeId);
  }
  // 可视上海
  else if (isVirtualShanghai) {
    locationInfo = getVirtualShanghaiLocationInfo(props, subtypeId);
  }

  // 地图书
  else {
    locationInfo = getMapbookLocationInfo(props, subtypeId);
  }

  locationInfo.geometry = cloneDeep(feature.geometry) as Geometry;

  return locationInfo;
};

const createInfoTag = (
  icon: string,
  label: string,
  value: string | number,
  color: string,
) => {
  const hasValue = value !== "" && value !== null && value !== undefined;

  if (hasValue) {
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin: 4px 0; padding: 2px 0;">
        <span style="font-size: 12px; color: #374151; font-weight: 500; min-width: 40px; text-align: left;">${icon} ${label}</span>
        <span style="font-size: 12px; font-weight: 600; color: ${color}; text-align: left;">${value}</span>
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
// 生成弹出框内容
export const generateHistoricalPopupContent = (feature: GeoJSONFeature) => {
  const locationInfo = getHistoricalLocationInfo(feature);
  const {
    name,
    subtypeId,
    address,
    description,
    wikipedia,
    wikicommons,
    dataSource,
    properties,
  } = locationInfo;

  // 使用config和subtypeId确定数据源信息
  const { subtype, category } = findConfigInfo(config, subtypeId);

  // 数据类型标签
  const infoTags = [];
  infoTags.push(
    createInfoTag(
      "",
      subtype.name,
      "",
      subtype.labels?.style?.color || subtype.style?.color,
    ),
  );
  const addInfoTag = (label: string, value: string) => {
    value && infoTags.push(createInfoTag("", label, value, "#6B7280"));
  };

  address && infoTags.push(createInfoTag("", "地址", address, "#6B7280"));

  // wikidata
  if (dataSource === "Wikidata") {
    addInfoTag("文保", properties.heritage_statusLabel);
  }

  const statusTags = [];
  // 数据来源标签
  statusTags.push(dataSource);
  // Wiki链接状态
  if (wikipedia) {
    statusTags.push("📖 ");
  }
  if (wikicommons) {
    statusTags.push("🖼️ ");
  }

  // 描述信息处理
  const hasDescription = description && description.trim().length > 0;

  return {
    popupContent: `

    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 160px;  background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; pointer-events: none;">
      <div style="padding: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1f2937; line-height: 1.4;">
          ${name}
        </h3>
        
        <!-- 信息标签区域（含 OSM/地图书/可视上海 属性） -->
        <div style="margin-bottom: 12px;  display: grid; row-gap: 6px;">
          ${infoTags.join("")}
          ${
            dataSource === "OpenStreetMap"
              ? generateOSMAttributeRows(properties)
              : dataSource === "地图书"
                ? generateMapbookAttributeRows(properties, subtypeId)
                : dataSource === "Virtual Shanghai"
                  ? generateVirtualShanghaiAttributeRows(locationInfo, {
                      maxImages: 1,
                      showFunctionLabel: true,
                    })
                  : ""
          }
        </div>
        
        ${
          hasDescription
            ? `
        <!-- 描述信息区域 -->
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 12px; color: #6B7280; line-height: 1.5;">
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
  `,
    locationInfo,
  };
};
