import * as OpenCC from "opencc-js";

// 将全角 ASCII 转半角 ASCII
const toHalfWidth = (input: string): string => {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCharCode(code - 0xfee0);
    } else if (code === 0x3000) {
      out += " ";
    } else {
      out += input[i];
    }
  }
  return out;
};

// 轻量常见繁体 -> 简体字映射（覆盖常见地名/通用用字）
const T2S_LITE_MAP: Record<string, string> = {
  風: "风",
  體: "体",
  車: "车",
  電: "电",
  醫: "医",
  國: "国",
  歷: "历",
  曆: "历",
  廣: "广",
  觀: "观",
  華: "华",
  舊: "旧",
  鄉: "乡",
  區: "区",
  廠: "厂",
  團: "团",
  學: "学",
  號: "号",
  場: "场",
  門: "门",
  開: "开",
  閉: "闭",
  轉: "转",
  專: "专",
  長: "长",
  島: "岛",
  衞: "卫",
  術: "术",
  設: "设",
  計: "计",
  館: "馆",
  龍: "龙",
  麼: "么",
  僑: "侨",
  書: "书",
  憶: "忆",
  記: "记",
  餘: "余",
  鄭: "郑",
  趙: "赵",
  樂: "乐",
  閘: "闸",
  牆: "墙",
  亞: "亚",
  傳: "传",
  藝: "艺",
  證: "证",
  銀: "银",
  鐵: "铁",
  興: "兴",
  麗: "丽",
  畫: "画",
  階: "阶",
  櫻: "樱",
  間: "间",
  離: "离",
  臺: "台",
  臺灣: "台湾",
};

const convertTraditionalToSimplifiedLite = (input: string): string =>
  input.replace(/[\u4E00-\u9FFF]/g, (ch) => T2S_LITE_MAP[ch] || ch);

// 尝试动态加载 opencc-js 做更全面的繁简转换；失败则回退到轻量映射
const convertTraditionalToSimplified = async (
  input: string,
): Promise<string> => {
  try {
    // 通过 new Function 动态 import，避免 TS 模块解析错误
    const _dynamicImport: (m: string) => Promise<any> = new Function(
      "m",
      "return import(m)",
    ) as any;
    if (OpenCC?.Converter) {
      const converter = await OpenCC.Converter({ from: "tw", to: "cn" });
      return converter(input);
    }
  } catch {}
  return convertTraditionalToSimplifiedLite(input);
};

// 去除常见查询尾缀/注释（如：旧居、旧址 等）
const removeCommonQualifiers = (input: string): string => {
  if (!input) return input;
  const qualifiers = ["旧居", "旧址", "住宅", "故居", "遗址"];
  const qGroup = qualifiers
    .map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  let out = input;

  // 1) 去除括号里的纯修饰词（全局）
  const parenRegex = new RegExp(
    `\\s*[\\(\\[]\\s*(?:${qGroup})\\s*[\\)\\]]\\s*`,
    "g",
  );
  out = out.replace(parenRegex, " ");

  // 2) 去除结尾的修饰词（无论是否有空格/连接）
  const suffixRegex = new RegExp(`(?:\\s|-|_|,|·|・)?(?:${qGroup})$`);
  out = out.replace(suffixRegex, "");

  // 3) 去除紧贴结尾的修饰词（例如：鲁迅旧居 -> 鲁迅）
  const tightSuffixRegex = new RegExp(`(?:${qGroup})$`);
  out = out.replace(tightSuffixRegex, "");

  // 折叠空白并去尾部空白/标点
  out = out
    .replace(/\s{2,}/g, " ")
    .replace(/[\s\-_,./:;]+$/, "")
    .split("\\")[0];
  return out.trim() || input;
};

// 规范化查询名称：去噪、统一标点/空白、去尾号、繁体转简体
export async function normalizeQueryName(
  raw: string | undefined | null,
): Promise<string> {
  let s = String(raw ?? "").trim();
  if (!s) return "";

  // Unicode 规范化 + 全角转半角
  s = toHalfWidth(s.normalize("NFKC"));

  // 常见中文标点替换为半角
  const punctMap: Record<string, string> = {
    "（": "(",
    "）": ")",
    "，": ",",
    "。": ".",
    "．": ".",
    "：": ":",
    "；": ";",
    "、": ",",
    "【": "[",
    "】": "]",
    "「": '"',
    "」": '"',
    "『": '"',
    "』": '"',
    "“": '"',
    "”": '"',
    "‘": "'",
    "’": "'",
    "—": "-",
    "－": "-",
    "～": "~",
    "·": " ",
    "・": " ",
    "‧": " ",
    "／": "/",
  };
  s = s.replace(
    /[（）。，．：；、【】「」『』“”‘’—－～·・‧／]/g,
    (ch) => punctMap[ch] || ch,
  );

  // 去除结尾编号/序号（如: "(1)", "-2", " 3" 等）
  s = s.replace(/[\s\-_,:;#]*[([]?\s*\d{1,4}\s*[)\]]?\s*$/, "");

  // 去除尾随标点/空白
  s = s.replace(/[\s\-_,./:;]+$/, "");

  // 折叠多余空白
  s = s.replace(/\s{2,}/g, " ");

  // 繁体 -> 简体（尽力）
  s = await convertTraditionalToSimplified(s);

  // 去除常见修饰词（如 旧居、旧址）
  s = removeCommonQualifiers(s);

  return s.trim();
}
