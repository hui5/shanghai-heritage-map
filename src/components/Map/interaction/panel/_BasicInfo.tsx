/** biome-ignore-all lint/a11y/noSvgWithoutTitle: SVG elements in this file are decorative */
import type React from "react";
import type { LocationInfo } from "@/helper/map-data/LocationInfo";
import { generateMapbookAttributeRows } from "@/helper/map-data/mapbook";
import { generateOSMAttributeRows } from "@/helper/map-data/openstreetmap";
import { generateVirtualShanghaiAttributeRows } from "@/helper/map-data/virtualshanghai";
import { findConfigInfo } from "@/utils/unifiedConfig";
import { config } from "../../historical/data";

interface BasicInfoProps {
  locationInfo: LocationInfo;
}

// 获取建筑类型信息
const getBuildingTypeInfo = (props: any) => {
  const type = props.type || "";

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

// 信息标签组件
const InfoTag: React.FC<{
  icon?: string;
  label: string;
  value?: string | number;
  color: string;
}> = ({ icon, label, value, color }) => {
  const hasValue = value !== "" && value !== null && value !== undefined;

  if (hasValue) {
    return (
      <div className="flex items-center justify-between my-1 py-0.5">
        <span className="text-xs text-gray-700 font-medium min-w-[40px]">
          {icon && `${icon} `}
          {label}
        </span>
        <span className="text-xs font-semibold" style={{ color }}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center my-1 py-0.5">
      <span className="text-xs font-medium" style={{ color }}>
        {icon && `${icon} `}
        {label}
      </span>
    </div>
  );
};

export const BasicInfoPreview: React.FC<BasicInfoProps> = ({
  locationInfo,
}) => {
  const {
    name,
    address,
    description,
    dataSource,
    properties,
    subtypeId,
    wikipedia,
    wikicommons,
  } = locationInfo;

  const isBuilding = dataSource === "上海图书馆";
  const isSearch = subtypeId === "search";
  const photoUrl = properties?.photo_url;

  // 建筑信息标签
  const buildingInfoTags = isBuilding
    ? (() => {
        const tags = [];
        const buildingTypeInfo = getBuildingTypeInfo(properties);

        tags.push(
          <InfoTag
            key="type"
            label={buildingTypeInfo.name}
            color={buildingTypeInfo.color}
          />,
        );

        if (properties.construction_year) {
          tags.push(
            <InfoTag
              key="year"
              icon="🗓️"
              label="建设年份"
              value={properties.construction_year}
              color="#6B7280"
            />,
          );
        }

        if (properties.batch) {
          tags.push(
            <InfoTag
              key="batch"
              icon="📋"
              label="批次"
              value={properties.batch}
              color="#3B82F6"
            />,
          );
        }

        if (address?.trim()) {
          tags.push(
            <InfoTag
              key="address"
              icon="📍"
              label="地址："
              value={address}
              color="#6B7280"
            />,
          );
        }

        if (properties.placeValue?.trim()) {
          tags.push(
            <InfoTag
              key="place"
              icon="🏢"
              label="区域"
              value={properties.placeValue}
              color="#8B5CF6"
            />,
          );
        }

        return tags;
      })()
    : null;

  // 搜索类型信息标签
  const searchInfoTags = isSearch
    ? (() => {
        const tags = [];
        tags.push(<InfoTag key="type" label="搜索结果" color="#3B82F6" />);
        return tags;
      })()
    : null;

  // 历史数据信息标签
  const historicalInfoTags =
    !isBuilding && !isSearch
      ? (() => {
          const { subtype } = findConfigInfo(config, subtypeId);
          const tags = [];

          tags.push(
            <InfoTag
              key="type"
              label={subtype.name}
              color={subtype.labels?.style?.color || subtype.style?.color}
            />,
          );

          if (address) {
            tags.push(
              <InfoTag
                key="address"
                label="地址"
                value={address}
                color="#6B7280"
              />,
            );
          }

          // wikidata
          if (dataSource === "Wikidata" && properties.heritage_statusLabel) {
            tags.push(
              <InfoTag
                key="heritage"
                label="文保"
                value={properties.heritage_statusLabel}
                color="#6B7280"
              />,
            );
          }

          return tags;
        })()
      : null;

  // 状态标签
  const statusTags = [];
  statusTags.push(dataSource);

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg overflow-hidden">
      {/* 图片区域（仅建筑） */}
      {isBuilding && photoUrl && (
        <div className="relative w-full">
          <img
            src={`/images/${photoUrl}`}
            alt={name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}

      <div className="p-4">
        {/* 标题 */}
        <h3 className="text-base font-semibold text-gray-900 mb-3 leading-snug">
          {name}
        </h3>

        {/* 信息标签区域 */}
        <div className="mb-3">
          {isBuilding
            ? buildingInfoTags
            : isSearch
              ? searchInfoTags
              : historicalInfoTags}

          {/* OSM/地图书/Virtual Shanghai 额外属性 */}
          {!isBuilding && !isSearch && (
            <div
              className="mt-2"
              /* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is generated from trusted sources (OSM/mapbook/VS data) */
              dangerouslySetInnerHTML={{
                __html:
                  dataSource === "OpenStreetMap"
                    ? generateOSMAttributeRows(properties)
                    : dataSource === "地图书"
                      ? generateMapbookAttributeRows(properties, subtypeId)
                      : dataSource === "Virtual Shanghai"
                        ? generateVirtualShanghaiAttributeRows(locationInfo, {
                            maxImages: 1,
                            showFunctionLabel: true,
                          })
                        : "",
              }}
            />
          )}
        </div>

        {/* 描述信息 */}
        {description?.trim() && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 leading-relaxed">
              {description.length > 200
                ? `${description.substring(0, 200)}...`
                : description}
            </p>
          </div>
        )}

        {/* 状态标签 */}
        {statusTags.length > 0 && (
          <div className="border-t border-gray-200 pt-2">
            <p className="text-xs text-gray-400">{statusTags.join(" · ")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
