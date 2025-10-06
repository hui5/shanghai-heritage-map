import { map } from "lodash";
import type { CommonFields, LocationInfo } from "./LocationInfo";

export type LocationInfo_Mapbook = CommonFields & {
  dataSource: "地图书";
};

export const getMapbookLocationInfo = (
  props: any,
  subtypeId: string,
): LocationInfo => {
  return {
    dataSource: "地图书",
    name: props.name || props.NAME_CN || props.title,
    address: props.address || props.di_zhi || props.xian_di_zhi,
    subtypeId,
    properties: props,
  };
};

// 地图书 常见键的中文映射
const MAPBOOK_KEY_LABELS: Record<string, Record<string, string>> = {
  hujiang_landmarks: {
    NAME_EN: "英文名",
    //NAME_CN: "中文名",
  },
  famous_residences: {
    // di_zhi: "地址",
    zheng_qu: "行政区",
    lei_bie: "类别",
  },
  historical_architecture: {
    // xian_di_zhi: "地址",
    kai_shi_jian_zao_shi_jian: "建造开始",
    jie_shu_jian_zao_shi_jian: "建造结束",
    she_ji_zhe: "建筑师",
    //she_ji_dan_wei: "设计单位",
    wen_bao_ji_bie: "文保级别",
    shi_you_bian_hao: "市优编号",
    //shang_hai_shi_you_xiu_li_shi_jian_zhu: "市优历史建筑",
    //shang_hai_shi_bu_ke_yi_dong_wen_wu: "不可移动文物",
    //guo_bie: "国别",
    //qu: "行政区",
    //xu_hao: "序号",
    //li_shi_qu_hua: "历史区划",
  },
};

const stringifyValue = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const generateMapbookAttributeRows = (
  props: any,
  subtypeId: string,
): string => {
  if (!props || typeof props !== "object") return "";

  const keyLabels = MAPBOOK_KEY_LABELS[subtypeId];

  if (!keyLabels) return "";

  return map(keyLabels, (label, field) => {
    const value = stringifyValue(props[field]);
    return value
      ? `
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
            <span style="flex: 0 0 40%; font-size: 11px; color: #6B7280; line-height: 1.4; word-break: break-all; text-align: left;">${label}</span>
            <span style="flex: 1; font-size: 12px; color: #111827; line-height: 1.5; word-break: break-all; text-align: left;">${value}</span>
          </div>
        `
      : "";
  }).join("");
};

export default generateMapbookAttributeRows;
