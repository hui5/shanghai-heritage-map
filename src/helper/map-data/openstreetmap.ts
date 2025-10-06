import type { CommonFields, LocationInfo } from "./LocationInfo";

export type LocationInfo_OpenStreetMap = CommonFields & {
  dataSource: "OpenStreetMap";
};

export const getOSMLocationInfo = (
  props: any,
  subtypeId: string,
): LocationInfo => {
  return {
    dataSource: "OpenStreetMap",
    name: props.name || props["name:zh"] || props["name:en"] || props.old_name,
    oldNames: props.old_name?.split(";"),
    address:
      props.address ||
      (props["addr:street"] && props["addr:housenumber"]
        ? `${props["addr:street"]} ${props["addr:housenumber"]}号`
        : props["addr:street"]),

    wikipedia: props.wikipedia || "",
    wikidata: props.wikidata || "",
    wikicommons: props.wikimedia_commons || "",

    subtypeId,
    properties: props,
  };
};

// OSM 常见键的中文映射
const OSM_KEY_LABELS: Record<string, string> = {
  name: "名称",
  address: "地址",
  "addr:street": "街道",
  "addr:housenumber": "门牌号",
  "addr:district": "区/县",
  "addr:city": "城市",
  "addr:postcode": "邮编",
  alt_name: "别名",
  old_name: "旧称",

  start_date: "建成时间",
  "start_date:circa": "建成时间(约)",
  construction_year: "建设年份",
  architect: "建筑师",
  "building:architecture": "建筑风格",
  "building:part": "建筑部分",
  building: "建筑类型",
  amenity: "设施类型",
  height: "高度",
  levels: "楼层数",
  "building:levels": "楼层数",
  material: "材料",

  heritage: "文保",
  "heritage:operator": "文保级别",
  "heritage:ref": "文保编号",

  wikipedia: "维基百科",
  wikidata: "Wikidata",
  wikimedia_commons: "维基共享",

  operator: "运营方",
  opening_hours: "开放时间",
  website: "网站",
  phone: "电话",
  email: "邮箱",

  boundary: "边界",
  landuse: "用地类型",
  protect_class: "保护等级",
  protect_status: "保护状态",
  protect_level: "保护级别",
  protect_type: "保护类型",
  protect_method: "保护方法",
  protect_measure: "保护措施",
  protect_effect: "保护效果",

  tourism: "旅游类型",
  brand: "品牌",
  fee: "收费",
  wheelchair: "无障碍",
  toilets: "厕所",
  museum: "博物馆",
  note: "备注",
  shop: "商店",
  office: "办公室",
  leisure: "休闲",
  man_made: "人工制品",
  bridge: "桥梁",
  "bridge:structure": "桥梁结构",
  religion: "宗教",
  use: "用途",
  historic: "历史",

  source: "来源",
  "source:name": "来源名称",
  check_date: "检查日期",
};

const mapOSMKeyToChinese = (key: string) => {
  return OSM_KEY_LABELS[key] || key;
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

// 生成 OSM 属性行（无图标），与信息标签合并展示
export const generateOSMAttributeRows = (props: any): string => {
  if (!props || typeof props !== "object") return "";

  // 过滤掉标题、id、元数据、以及已在信息标签或状态中展示的键（支持简单 * 通配）
  const excludedPatterns = [
    "@id",
    "type",
    "name",
    "name:*",
    "old_name:*",
    "alt_name:*",
    "address",
    "addr:*",
    "contact:*",

    // "building",
    // "heritage",
    "built",

    "brand:*",
    "architect:*",
    "website:*",
    "toilets:*",

    // 状态中展示的
    "wikipedia",
    "wikidata",
    "wikimedia_commons",
  ];

  const escapeRegexExceptStar = (s: string) =>
    s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

  const shouldExclude = (key: string): boolean => {
    const lowerKey = key.toLowerCase();
    for (const pattern of excludedPatterns) {
      const p = pattern.toLowerCase();
      if (p.includes("*")) {
        const re = new RegExp(
          "^" + escapeRegexExceptStar(p).replace(/\*/g, ".*") + "$",
        );
        if (re.test(lowerKey)) return true;
      } else {
        if (lowerKey === p) return true;
      }
    }
    return false;
  };

  const seen = new Set<string>();
  const entries = Object.entries(props)
    .filter(([k, v]) => {
      if (shouldExclude(k)) return false;
      const value = stringifyValue(v);
      if (!value) return false;
      const sig = k.toLowerCase() + "=" + value;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) return "";

  return entries
    .map(([key, val]) => {
      const value = stringifyValue(val);
      const label = mapOSMKeyToChinese(key);
      return `
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
            <span style="flex: 0 0 40%; font-size: 11px; color: #6B7280; line-height: 1.4; word-break: break-all; text-align: left;">${label}</span>
            <span style="flex: 1; font-size: 12px; color: #111827; line-height: 1.5; word-break: break-all; text-align: left;">${value}</span>
          </div>
        `;
    })
    .join("");
};
