// 历史图层配置系统 - 基于统一配置架构

import {
  buildIconSizeExpression,
  buildTextSizeExpression,
} from "@/utils/unifiedConfig";

// 生成历史图层 Mapbox 样式配置
export function generateHistoricalLayerConfig(
  subtype: any,
  sourceId: string,
  dataType: string,
  isVisible: boolean,
): any[] {
  const layerId = `openda_${dataType}-${subtype.id}-layer`;
  const style = subtype.style;
  const targetVisibility = (
    isVisible && subtype.enabled ? "visible" : "none"
  ) as "visible" | "none";

  const configs: any[] = [];
  const slotInfo = subtype.slot || "top"; // 默认为middle槽位

  if (subtype.geometryType === "Point") {
    // 检查是否为 symbol 样式
    if (style.symbol) {
      const symbolConfig = style.symbol;
      const layout: any = {
        visibility: targetVisibility,
        "symbol-z-elevate": true,
      };
      const paint: any = {};

      // 根据 symbol 类型配置图层
      if (symbolConfig.type === "icon" || symbolConfig.type === "combined") {
        // 图标配置
        if (symbolConfig.iconImage) {
          layout["icon-image"] = symbolConfig.iconImage;
          layout["icon-size"] = buildIconSizeExpression(
            symbolConfig.iconSize,
            symbolConfig.iconSizeStops,
            symbolConfig.iconSizeBase,
            1,
          );
          layout["icon-anchor"] = symbolConfig.iconAnchor ?? "center";
          layout["icon-offset"] = symbolConfig.iconOffset ?? [0, 0];
          layout["icon-allow-overlap"] = symbolConfig.iconAllowOverlap ?? true;

          // 图标颜色应该放在 paint 中
          if (symbolConfig.iconColor || style.color) {
            paint["icon-color"] = symbolConfig.iconColor ?? style.color;
          }
          // 确保图标可见性
          paint["icon-opacity"] = symbolConfig.iconOpacity ?? 0.8;
        }
      }

      if (symbolConfig.type === "text" || symbolConfig.type === "combined") {
        // 文本配置
        layout["text-field"] = [
          "get",
          symbolConfig.textField || style.field || "name",
        ];

        // 文本大小：优先使用symbol的配置，然后是style的配置
        if (symbolConfig.textSizeStops || symbolConfig.textSize !== undefined) {
          layout["text-size"] = buildTextSizeExpression(
            {
              fontSize: symbolConfig.textSize,
              fontSizeStops: symbolConfig.textSizeStops,
              fontSizeBase: symbolConfig.textSizeBase,
            },
            style.fontSize || 12,
          );
        } else {
          layout["text-size"] = buildTextSizeExpression(
            style as any,
            style.fontSize || 12,
          );
        }

        layout["text-offset"] = symbolConfig.textOffset ??
          style.offset ?? [0, 0];
        layout["text-anchor"] = symbolConfig.textAnchor ?? "center";

        layout["text-allow-overlap"] =
          symbolConfig.textAllowOverlap ?? style.textAllowOverlap ?? true;

        paint["text-color"] = [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#be615b",
          symbolConfig.textColor ?? style.color,
        ];
        paint["text-halo-color"] =
          symbolConfig.textHaloColor ?? style.haloColor ?? "#ffffff";

        // 文本光晕宽度：支持缩放控制
        paint["text-halo-width"] = [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          5,
          symbolConfig.textHaloWidth ?? style.haloWidth ?? 1,
        ];
      }

      const layerConfig = {
        id: layerId,
        type: "symbol" as const,
        source: sourceId,
        layout,
        paint,
        ...(subtype.minzoom !== undefined && {
          minzoom: subtype.minzoom,
        }),
        ...(subtype.maxzoom !== undefined && {
          maxzoom: subtype.maxzoom,
        }),
        slot: slotInfo,
      };

      configs.push(layerConfig);
    } else if (style.type === "text-only") {
      // 仅显示文字标签，不显示标记
      configs.push({
        id: layerId,
        type: "symbol" as const,
        source: sourceId,
        layout: {
          "text-field": ["get", style.field || "name"],
          "text-size": buildTextSizeExpression(
            style as any,
            style.fontSize || 12,
          ),
          "text-offset": style.offset || [0, 0],
          visibility: targetVisibility,
          "symbol-z-elevate": true,
        },
        paint: {
          "text-color": style.color,
          "text-halo-color": style.haloColor || "#ffffff",
          "text-halo-width": style.haloWidth || 1,
        },
        ...(subtype.minzoom !== undefined && {
          minzoom: subtype.minzoom,
        }),
        ...(subtype.maxzoom !== undefined && {
          maxzoom: subtype.maxzoom,
        }),
        slot: slotInfo, // 添加slot信息
      });
    } else {
      // 正常的圆形标记
      configs.push({
        id: layerId,
        type: "circle" as const,
        source: sourceId,
        layout: {
          visibility: targetVisibility,
        },
        paint: {
          "circle-color": style.color,
          "circle-radius": style.radius ?? 6,
          // 使用 null 合并，确保 0 生效（支持中空圆环：opacity: 0）
          "circle-opacity": style.opacity ?? 0.8,
          "circle-stroke-color": style.color,
          "circle-stroke-width": style.weight ?? 1,
        },
        ...(subtype.minzoom !== undefined && {
          minzoom: subtype.minzoom,
        }),
        ...(subtype.maxzoom !== undefined && {
          maxzoom: subtype.maxzoom,
        }),
        slot: slotInfo, // 添加slot信息
      });
    }
  } else if (subtype.geometryType === "LineString") {
    configs.push({
      id: layerId,
      type: "line" as const,
      source: sourceId,
      layout: {
        "line-cap": "round" as const,
        "line-join": "round" as const,
        visibility: targetVisibility,
      },
      paint: {
        "line-color": style.color,
        "line-width": style.weight || 2,
        "line-opacity": style.opacity || 0.8,
        // 支持虚线样式
        ...(style.dashArray && {
          "line-dasharray": style.dashArray
            .split(",")
            .map((x: string) => parseInt(x.trim(), 10)),
        }),
      },
      ...(subtype.minzoom !== undefined && {
        minzoom: subtype.minzoom,
      }),
      ...(subtype.maxzoom !== undefined && {
        maxzoom: subtype.maxzoom,
      }),
      slot: slotInfo, // 添加slot信息
    });
  } else if (subtype.geometryType === "Polygon") {
    // 为 OSM 建筑数据添加基于 wiki 信息的颜色区分
    const fillColorExpression: any = style.fillColor || style.color;
    const outlineColorExpression: any = style.color;

    // if (subtype.id === "osm_buildings") {
    //   // 数据驱动的颜色：有 wiki 信息的建筑使用不同颜色
    //   fillColorExpression = [
    //     "case",
    //     [
    //       "any",
    //       ["has", "wikipedia"],
    //       ["has", "brand:wikipedia"],
    //       ["has", "wikidata"],
    //       ["has", "brand:wikidata"],
    //       ["has", "wikimedia_commons"],
    //     ],
    //     "#E8F4FD", // 有 wiki 信息的建筑：浅蓝色填充
    //     "#FFE5CC", // 无 wiki 信息的建筑：原来的橙色填充
    //   ];

    //   outlineColorExpression = [
    //     "case",
    //     [
    //       "any",
    //       ["has", "wikipedia"],
    //       ["has", "brand:wikipedia"],
    //       ["has", "wikidata"],
    //       ["has", "brand:wikidata"],
    //       ["has", "wikimedia_commons"],
    //     ],
    //     "#1E88E5", // 有 wiki 信息的建筑：蓝色边框
    //     "#FF6B35", // 无 wiki 信息的建筑：原来的橙色边框
    //   ];
    // }

    // 填充图层
    configs.push({
      id: layerId,
      type: "fill" as const,
      source: sourceId,
      layout: {
        visibility: targetVisibility,
      },
      paint: {
        "fill-color": fillColorExpression,
        "fill-opacity": style.fillOpacity || 0.3,
      },
      ...(subtype.minzoom !== undefined && {
        minzoom: subtype.minzoom,
      }),
      ...(subtype.maxzoom !== undefined && {
        maxzoom: subtype.maxzoom,
      }),
      slot: slotInfo, // 添加slot信息
    });

    // 为Polygon添加边框线图层
    if (style.weight) {
      const outlineLayerId = `openda_${dataType}-${subtype.id}-outline`;
      configs.push({
        id: outlineLayerId,
        type: "line" as const,
        source: sourceId,
        layout: {
          "line-cap": "round" as const,
          "line-join": "round" as const,
          visibility: targetVisibility,
        },
        paint: {
          "line-color": outlineColorExpression,
          "line-width": style.weight,
          "line-opacity": style.opacity || 0.8,
        },
        ...(subtype.minzoom !== undefined && {
          minzoom: subtype.minzoom,
        }),
        ...(subtype.maxzoom !== undefined && {
          maxzoom: subtype.maxzoom,
        }),
        slot: slotInfo, // 添加slot信息
      });
    }
  }

  // 添加标签图层（如果配置了标签且不是 text-only 样式）
  if (subtype.labels?.enabled && style.type !== "text-only") {
    // 根据几何类型配置标签布局
    const isLineGeometry = subtype.geometryType === "LineString";
    const pathLabelsEnabled = subtype.labels?.pathLabels === true;
    const labelLayerId = `openda_${dataType}-${subtype.id}-labels`;

    // 为 OSM 建筑数据的标签添加基于 wiki 信息的颜色区分
    const labelColorExpression: any = subtype.labels.style.color;

    // if (subtype.id === "osm_buildings") {
    //   labelColorExpression = [
    //     "case",
    //     [
    //       "any",
    //       ["has", "wikipedia"],
    //       ["has", "brand:wikipedia"],
    //       ["has", "wikidata"],
    //       ["has", "brand:wikidata"],
    //       ["has", "wikimedia_commons"],
    //     ],
    //     "#1565C0", // 有 wiki 信息的建筑：深蓝色文字
    //     "#D4461F", // 无 wiki 信息的建筑：原来的橙色文字
    //   ];
    // }

    configs.push({
      id: labelLayerId,
      type: "symbol" as const,
      source: sourceId,
      layout: {
        "text-font": ["DIN Pro Medium"],
        "text-field": ["get", subtype.labels.field],
        "text-size": buildTextSizeExpression(
          subtype.labels.style as any,
          subtype.labels.style.fontSize,
        ),
        "text-offset": subtype.labels.style.offset,
        "text-anchor": subtype.labels.style.textAnchor ?? "center",
        visibility: targetVisibility,

        // 对于LineString且启用pathLabels的情况，沿线显示标签
        ...(isLineGeometry &&
          pathLabelsEnabled && {
            "symbol-placement": "line" as const,
            "text-rotation-alignment": "map" as const,
            "text-pitch-alignment": "viewport" as const,
            "symbol-spacing": subtype.labels.style?.repeat || 200,
            "text-max-angle":
              (((subtype.labels.style as any)?.maxAngle || 45) * Math.PI) / 180,
          }),
        "symbol-z-elevate": true,
      },
      paint: {
        "text-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#be615b",
          labelColorExpression,
        ],
        "text-halo-color": subtype.labels.style.haloColor,
        "text-halo-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          5,
          subtype.labels.style.haloWidth,
        ],
        "text-opacity": subtype.labels.style?.opacity ?? 1,
      },
      // 标签的缩放级别：优先使用标签自己的设置，其次使用图层设置
      minzoom: subtype.labels.minZoom || subtype.minzoom,
      maxzoom: subtype.labels.maxZoom || subtype.maxzoom || 23,
      // slot: slotInfo, // 添加slot信息
    });
  }

  return configs;
}
