// 建筑配置系统 - 基于统一配置架构重构

import config from "./config.json";
import { buildTextSizeExpression } from "@/utils/unifiedConfig";
import _, { cloneDeep, get } from "lodash";

export const subtypes = config.categories.flatMap(
  (category) => category.subtypes
);

export const buildingLayerIds = [
  "openda_building-clusters",
  "openda_building-cluster-count",
  "openda_building-unclustered-point",
  "openda_building-labels",
];

const subtypeExpression = (props: string[], defaultValue: any) => {
  const expression: any[] = ["case"];
  subtypes.forEach((subtype) => {
    expression.push(["==", ["get", "dataSource"], subtype.id]);
    expression.push(get(subtype, props));
  });
  expression.push(defaultValue);
  return expression;
};

function generateBuildingLabelsFromConfig() {
  let labelStyle: any = subtypes[0]?.labels?.style;

  return {
    layout: {
      "text-field": ["get", "nameS"],
      "text-font": ["DIN Pro Medium"],
      "text-size": buildTextSizeExpression(
        labelStyle as any,
        (labelStyle as any).fontSize || 12
      ),
      "text-anchor": "left",
      "text-offset": labelStyle.offset,
      "text-max-width": 10,
      "text-allow-overlap": false,
      "text-optional": true,
      "symbol-sort-key": subtypeExpression(["priority"], 2),
      "symbol-z-elevate": true,
    },
    paint: {
      "text-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        "#be615b",
        subtypeExpression(["style", "color"], "#4D4A46"),
      ],

      "text-halo-color": labelStyle.haloColor,
      "text-halo-width": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        5,
        labelStyle.haloWidth,
      ],
      "text-opacity": 1,
    },
    minzoom: config.metadata?.clustering?.labelMinZoom || 14,
  } as any;
}

function generateClusterColorExpression(): any[] {
  const expression: any[] = ["case"];

  const sortedSubtypes = _(subtypes)
    .filter((s) => s.priority !== undefined)
    .sortBy("priority")
    .value();

  sortedSubtypes.forEach((subtype) => {
    expression.push([
      ">=",
      ["*", ["get", `${subtype.id}Count`], 100],
      ["*", ["get", "point_count"], 70],
    ]);
    expression.push(subtype.style.fillColor);
  });

  sortedSubtypes.forEach((subtype) => {
    expression.push([">", ["get", `${subtype.id}Count`], 0]);
    expression.push(subtype.style.fillColor);
  });

  expression.push("#96A6B7");
  return expression;
}

export function generateBuildingMapboxStyles(): Record<string, any> {
  const clusterStyle = {
    paint: {
      "circle-color": generateClusterColorExpression(),
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "point_count"],
        10,
        18,
        25,
        24,
        50,
        26,
        70,
        28,
        100,
        34,
        200,
        42,
      ],
      "circle-stroke-width": [
        "case",
        [">", ["get", "point_count"], 50],
        3,
        [">", ["get", "point_count"], 20],
        2.5,
        2,
      ],
      "circle-stroke-color": "white",
      "circle-opacity": [
        "interpolate",
        ["linear"],
        ["get", "point_count"],
        5,
        0.4,
        50,
        0.5,
        100,
        0.6,
      ],
      "circle-blur": [
        "case",
        [">", ["get", "point_count"], 100],
        0.3,
        [">", ["get", "point_count"], 50],
        0.2,
        0.1,
      ],
    },
  };

  const clusterCountStyle = {
    layout: {
      "text-font": ["DIN Pro Bold"],
      "text-field": [
        "case",
        [">", ["get", "point_count"], 100],
        ["concat", ["to-string", ["get", "point_count"]], "+"],
        ["to-string", ["get", "point_count"]],
      ],
      "text-size": [
        "interpolate",
        ["linear"],
        ["get", "point_count"],
        5,
        13,
        25,
        14,
        100,
        15,
        200,
        17,
      ],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "white",
      "text-halo-color": [
        "case",
        [">", ["get", "point_count"], 100],
        "rgba(0,0,0,0.8)",
        [">", ["get", "point_count"], 50],
        "rgba(0,0,0,0.7)",
        "rgba(0,0,0,0.6)",
      ],
      "text-halo-width": ["case", [">", ["get", "point_count"], 100], 1.5, 1.2],
    },
  };

  const symbolStyle = {
    layout: {
      "symbol-z-elevate": true,
      "icon-image": subtypeExpression(
        ["style", "icon-image"],
        "circle-stroked"
      ),
      "icon-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        13,
        0.8,
        16,
        0.8,
        20,
        1,
      ],
      "icon-anchor": "center",
      "icon-offset": [-1, 0],
      "icon-allow-overlap": true,
      "symbol-sort-key": subtypeExpression(["priority"], 2),
    },
    paint: {
      "icon-opacity": 1,
    },
  };

  return {
    cluster: clusterStyle,
    clusterCount: clusterCountStyle,
    unclusteredPoint: symbolStyle,
    buildingLabels: generateBuildingLabelsFromConfig(),
  };
}

export function generateBuildingClusterProperties(): Record<string, any> {
  const properties: Record<string, any> = {
    totalCount: ["+", 1],
    totalWeight: ["+", 1],
  };

  subtypes.forEach((subtype) => {
    const countKey = `${subtype.id}Count`;
    properties[countKey] = [
      "+",
      ["case", ["==", ["get", "dataSource"], subtype.id], 1, 0],
    ];
  });

  return properties;
}

/**
 * 获取建筑Mapbox数据源配置
 */
export function getBuildingMapboxDataSourceConfig() {
  const clusterConfig = config.metadata?.clustering;
  const performanceConfig = config.metadata?.performance;

  return {
    type: "geojson" as const,
    cluster: clusterConfig.enabled,
    clusterMaxZoom: clusterConfig.clusterMaxZoom,
    clusterRadius: clusterConfig.clusterRadius,
    clusterMinPoints: clusterConfig.clusterMinPoints,
    clusterProperties: generateBuildingClusterProperties(),
    buffer: performanceConfig.buffer,
    tolerance: performanceConfig.tolerance,
  };
}

/**
 * 获取建筑图层配置
 */
export function getBuildingLayerConfigs() {
  const styles = generateBuildingMapboxStyles();
  const clusterMinZoom = config.metadata?.clustering.clusterMinZoom || 0;

  return {
    clusters: {
      id: "openda_building-clusters",
      type: "circle" as const,
      source: "openda_building-source",
      filter: ["has", "point_count"] as any,
      paint: styles.cluster.paint,
      minzoom: clusterMinZoom,
    },
    clusterCount: {
      id: "openda_building-cluster-count",
      type: "symbol" as const,
      source: "openda_building-source",
      filter: ["has", "point_count"] as any,
      layout: styles.clusterCount.layout,
      paint: styles.clusterCount.paint,
      minzoom: clusterMinZoom,
    },
    unclusteredPoint: {
      id: "openda_building-unclustered-point",
      type: "symbol" as const,
      source: "openda_building-source",
      filter: ["!", ["has", "point_count"]] as any,
      layout: styles.unclusteredPoint.layout,
      paint: styles.unclusteredPoint.paint,
      minzoom: clusterMinZoom,
    },
    buildingLabels: {
      id: "openda_building-labels",
      type: "symbol" as const,
      source: "openda_building-source",
      filter: ["!", ["has", "point_count"]] as any,
      layout: styles.buildingLabels.layout,
      paint: styles.buildingLabels.paint,
      minzoom: Math.max(styles.buildingLabels.minzoom, clusterMinZoom),
    },
  };
}
