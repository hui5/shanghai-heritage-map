// Mapbox is loaded via CDN in MapLayout.tsx
declare global {
  interface Window {
    mapboxgl: typeof import("mapbox-gl");
  }
}

import type { GeoJSONSource, Map, MapMouseEvent } from "mapbox-gl";
import { useEffect, useRef } from "react";
import { createInfoTag } from "@/components/interaction/building";
import { canInteract } from "@/components/interaction/interactionConfig";

// 建筑类型配置
const BUILDING_TYPES = [
  {
    key: "data_nationalCount",
    name: "🏛️ 全国重点文物",
    color: "#DC2626",
  },
  { key: "data_municipalCount", name: "🏢 市级文物", color: "#EA580C" },
  { key: "data_districtCount", name: "🏘️ 区级文物", color: "#F59E0B" },
  { key: "data_1Count", name: "🏰 优秀历史建筑", color: "#8E44AD" },
  {
    key: "data_red_tourismCount",
    name: "🚩 红色旅游",
    color: "#991B1B",
  },
  { key: "data_pointsCount", name: "📍 文物保护点", color: "#84CC16" },
];

interface BuildingClusterInteractionsProps {
  mapInstance: Map | null;
}

export const useBuildingClusterInteractions = ({
  mapInstance,
}: BuildingClusterInteractionsProps) => {
  const _eventListenersRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    if (!mapInstance) return;

    const popup = new window.mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: "right",
    });

    const clusterLayerId = "openda_building-clusters";
    const sourceId = "openda_building-source";

    // 集群点击事件 - 放大集群
    const onClusterClick = (e: MapMouseEvent) => {
      // 检查缩放级别（使用全局配置）
      if (
        !canInteract(mapInstance.getZoom(), "minZoomForClusterInteractions")
      ) {
        return;
      }

      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: [clusterLayerId],
      });

      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      const source = mapInstance.getSource(sourceId) as GeoJSONSource;

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        // 优化缩放级别 - 确保用户能够清楚看到当前区域的建筑
        const currentZoom = mapInstance.getZoom();
        const targetZoom = Math.max(
          zoom || currentZoom + 2, // 至少放大2级
          16, // 最小缩放到16级，确保可以看清建筑细节
        );

        mapInstance.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: targetZoom,
          duration: 800, // 稍微延长动画时间，让用户更好地跟踪放大过程
        });
      });
    };

    // 集群悬停事件 - 显示个性化集群信息
    const onClusterHover = (e: MapMouseEvent) => {
      // 检查缩放级别（使用全局配置）
      if (
        !canInteract(mapInstance.getZoom(), "minZoomForClusterInteractions")
      ) {
        return;
      }

      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: [clusterLayerId],
      });

      if (features.length > 0) {
        const feature = features[0];
        const coordinates = (feature.geometry as any).coordinates.slice();
        const props = feature.properties;

        // 构建各类型建筑的数量统计
        const typeStats = BUILDING_TYPES.map((type) => ({
          ...type,
          count: props?.[type.key] || 0,
        })).filter((type) => type.count > 0);

        const popupContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 200px; max-width: 280px;">
           
            <div style="padding: 12px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="margin-bottom: 8px;">
                ${typeStats
                  .map((type) =>
                    createInfoTag(
                      type.name.split(" ")[0], // 提取图标
                      type.name.substring(type.name.indexOf(" ") + 1), // 提取名称
                      type.count,
                      type.color,
                    ),
                  )
                  .join("")}
              </div>
              <div style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 11px; color: #6b7280; font-style: italic;">💡 点击展开查看详情</p>
              </div>
            </div>
          </div>
        `;

        popup
          .setLngLat(coordinates)
          .setOffset({
            right: [-50, 0],
          })
          .setHTML(popupContent)
          .addTo(mapInstance);
      }
    };

    const onClusterLeave = () => {
      popup.remove();
    };

    // 添加事件监听器（只处理点和集群）
    mapInstance.on("click", clusterLayerId, onClusterClick);
    mapInstance.on("mouseenter", clusterLayerId, onClusterHover);
    mapInstance.on("mouseleave", clusterLayerId, onClusterLeave);

    // 清理函数（只处理点和集群）
    return () => {
      try {
        mapInstance.off("click", clusterLayerId, onClusterClick);
        mapInstance.off("mouseenter", clusterLayerId, onClusterHover);
        mapInstance.off("mouseleave", clusterLayerId, onClusterLeave);
      } catch (error) {
        console.warn("Building  cluster interactions cleanup warning:", error);
      }
    };
  }, [mapInstance]);

  return null;
};
