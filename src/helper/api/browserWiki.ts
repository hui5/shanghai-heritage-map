// Browser-side wiki helpers with simple in-memory fetch cache

import { LocationInfo } from "@/helper/map-data/LocationInfo";
import { fetchJSON } from "../fetchJSON";
import { proxyImage } from "../proxyImage";

export interface WikipediaPreviewData {
  title: string;
  extract: string;
  thumbnail?: string;
  url: string;
}

export interface WikicommonsPreviewData {
  images: Array<{ title: string; thumbnail: string; url: string }>;
  categoryUrl?: string;
}

export interface BrowserWikiData {
  wikipedia?: WikipediaPreviewData;
  wikicommons?: WikicommonsPreviewData;
}

const parseWikipediaSpec = (
  wikipedia: string
): { lang: string; title: string } | null => {
  try {
    if (!wikipedia) return null;
    if (wikipedia.startsWith("http")) {
      const url = new URL(wikipedia);
      const lang = url.hostname.split(".")[0];
      const title = decodeURIComponent(url.pathname.replace(/^\/wiki\//, ""));
      return lang && title ? { lang, title } : null;
    }
    const [lang, rawTitle] = wikipedia.split(":", 2);
    if (!lang || !rawTitle) return null;
    return { lang, title: decodeURIComponent(rawTitle) };
  } catch {
    return null;
  }
};

const getWikidataId = async (
  lang: string,
  title: string
): Promise<string | null> => {
  try {
    const api = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageprops&redirects=1&titles=${encodeURIComponent(
      title
    )}&format=json&origin=*`;
    const data = await fetchJSON(api);
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0] as any;
    return page?.pageprops?.wikibase_item || null;
  } catch {
    return null;
  }
};

const getChineseTitleFromWikidata = async (
  qid: string
): Promise<string | null> => {
  try {
    const api = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(
      qid
    )}&props=sitelinks&format=json&origin=*`;
    const data = await fetchJSON(api);
    const entity = data?.entities?.[qid];
    const title = entity?.sitelinks?.zhwiki?.title;
    return title || null;
  } catch {
    return null;
  }
};

const fetchSummaryRest = async (
  lang: string,
  title: string
): Promise<any | null> => {
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}?redirect=true`;
    const data = await fetchJSON(url);
    return data?.title ? data : null;
  } catch {
    return null;
  }
};

export const fetchWikipediaSummary = async (
  wikipediaUrl: string
): Promise<any | null> => {
  const parsed = parseWikipediaSpec(wikipediaUrl);
  if (!parsed) return "";
  const { lang, title } = parsed;
  const normalizedTitle = decodeURIComponent(title).replace(/_/g, " ");
  try {
    // 1) 如果是非中文页面，先通过 Wikidata 解析中文站点标题
    if (lang !== "zh") {
      const qid = await getWikidataId(lang, normalizedTitle);
      if (qid) {
        const zhTitle = await getChineseTitleFromWikidata(qid);
        if (zhTitle) {
          const zhSummary = await fetchSummaryRest("zh", zhTitle);
          if (zhSummary) {
            return zhSummary;
          }
        }
      }
    }

    // 2) 直接尝试中文原标题
    const zhFallback = await fetchSummaryRest("zh", normalizedTitle);
    if (zhFallback) {
      return zhFallback;
    }

    // 3) 回退到原始语言
    const orig = await fetchSummaryRest(lang, normalizedTitle);
    if (orig) {
      return orig;
    }

    throw new Error("No summary");
  } catch (err) {
    return {};
  }
};

// Compute standardized wiki identifiers from inputs
export const convertWikiIds = async (
  wikipedia?: string,
  wikidata?: string,
  wikicommons?: string
): Promise<{
  wikipediaSpec: string | null;
  wikidataId: string | null;
  commonsCategory: string | null;
}> => {
  let wikipediaSpec: string | null = null;
  let wikidataId: string | null = null;
  let commonsCategory: string | null = null;

  const fetchEntity = async (qid: string) => {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${encodeURIComponent(
        qid
      )}&props=sitelinks|claims&origin=*`;
      const data = await fetchJSON(url);
      return data?.entities?.[qid] || null;
    } catch {
      return null;
    }
  };

  try {
    // If wikipedia provided, parse and try to resolve qid and better sitelinks
    const parsed = wikipedia ? parseWikipediaSpec(wikipedia) : null;
    if (parsed) {
      const lang = parsed.lang;
      const title = decodeURIComponent(parsed.title).replace(/_/g, " ");
      wikipediaSpec = `${lang}:${title}`;
      commonsCategory = commonsCategory || wikicommons || null;

      if (lang !== "zh" || !commonsCategory) {
        const qid = await getWikidataId(lang, title);
        if (qid) {
          wikidataId = qid;
          const entity = await fetchEntity(qid);
          const zhTitle = entity?.sitelinks?.zhwiki?.title as
            | string
            | undefined;
          const enTitle = entity?.sitelinks?.enwiki?.title as
            | string
            | undefined;
          if (zhTitle) wikipediaSpec = `zh:${zhTitle}`;
          else if (enTitle) wikipediaSpec = `en:${enTitle}`;
          const p373 = entity?.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
          if (typeof p373 === "string" && p373) {
            commonsCategory = `Category:${p373}`;
          }
        }
      }
    } else if (wikidata) {
      const qid = wikidata.includes("/")
        ? wikidata.match(/(Q\d+)/)?.[1] || ""
        : wikidata;
      if (qid) {
        wikidataId = qid;
        const entity = await fetchEntity(qid);
        const zhTitle = entity?.sitelinks?.zhwiki?.title as string | undefined;
        const enTitle = entity?.sitelinks?.enwiki?.title as string | undefined;
        if (zhTitle) wikipediaSpec = `zh:${zhTitle}`;
        else if (enTitle) wikipediaSpec = `en:${enTitle}`;
        const p373 = entity?.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
        if (typeof p373 === "string" && p373) {
          commonsCategory = `Category:${p373}`;
        }
      }
    }
  } catch {}

  return { wikipediaSpec, wikidataId, commonsCategory };
};

export const fetchWikicommonsImages = async (
  commons: string,
  width: number = 500
): Promise<WikicommonsPreviewData | null> => {
  if (!commons) return null;
  try {
    const category = commons.startsWith("http")
      ? decodeURIComponent(commons.split("/wiki/")[1] || "")
      : commons;
    const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(
      category
    )}&gcmtype=file&gcmlimit=20&prop=imageinfo&iiprop=url|mime&iiurlwidth=${width}&format=json&origin=*`;
    const data = await fetchJSON(api);
    const pages = data?.query?.pages || {};
    const images = Object.values(pages)
      .map((p: any) => {
        const info = p?.imageinfo?.[0];
        if (!info) return null;
        return {
          title: p?.title || "",
          thumbnail: proxyImage(info.thumburl || info.url),
          url: proxyImage(info.url),
        };
      })
      .filter(Boolean) as Array<{
      title: string;
      thumbnail: string;
      url: string;
    }>;
    return {
      images,
      categoryUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(
        category
      )}`,
    };
  } catch {
    return null;
  }
};

// --- Wikipedia fallback search within Shanghai and Commons resolver ---

export interface ResolvedWikiForLocation {
  wikipedia?: string; // e.g. "zh:外白渡桥"
  wikidata?: string; // e.g. "Q12345"
  commons?: string; // e.g. "Category:Waibaidu Bridge"
  matchData?: any; // e.g. { id: string, data: any }
  hasShanghaiConstraint: boolean;
}

export const resolveWikipediaAndCommonsForLocation = async (
  name: string,
  locationInfo?: LocationInfo
): Promise<ResolvedWikiForLocation | null> => {
  if (!name) return null;

  let hasShanghaiConstraint = true;
  let searchQuery = `${name} shanghai`;
  if (
    (locationInfo?.dataSource === "地图书" &&
      locationInfo?.subtypeId.includes("famous_residences")) ||
    locationInfo?.name.endsWith("故居") ||
    locationInfo?.name.endsWith("旧居")
  ) {
    searchQuery = `${name}`;
    hasShanghaiConstraint = false;
  }

  const params = {
    action: "query",
    list: "search",
    format: "json",
    srsearch: searchQuery,
    srwhat: "text",
    srnamespace: "0|120",
    srlimit: "5",
    //# 高级搜索的额外选项
    srinfo: "totalhits|suggestion", //获取总数和建议
    srprop: "size|wordcount|timestamp|snippet", // 额外属性
    origin: "*",
  };

  const searchInShanghai = async (params: any) => {
    console.log("wiki search:", params.srsearch);
    try {
      const url = `https://www.wikidata.org/w/api.php?${new URLSearchParams(
        params
      ).toString()}`;
      const data = await fetchJSON(url);
      const result = data?.query?.search?.[0];
      if (!result) return null;
      return { id: result.title as string, data };
    } catch {
      return null;
    }
  };

  let match = await searchInShanghai(params);
  if (!match && hasShanghaiConstraint) {
    hasShanghaiConstraint = false;
    params.srsearch = `${name}`;
    match = await searchInShanghai(params);
  }

  if (!match) return null;

  const qid = match.id;
  let wikipediaSpec: string | undefined;
  let commons: string | undefined;
  try {
    const detailUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${encodeURIComponent(
      qid
    )}&props=sitelinks|claims&origin=*`;
    const detail = await fetchJSON(detailUrl);
    const entity = detail?.entities?.[qid];
    const zhTitle = entity?.sitelinks?.zhwiki?.title;
    const enTitle = entity?.sitelinks?.enwiki?.title;
    if (zhTitle) wikipediaSpec = `zh:${zhTitle}`;
    else if (enTitle) wikipediaSpec = `en:${enTitle}`;
    const p373 = entity?.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
    if (typeof p373 === "string" && p373) commons = `Category:${p373}`;
  } catch {}

  return {
    wikipedia: wikipediaSpec,
    wikidata: qid,
    commons,
    matchData: match.data,
    hasShanghaiConstraint,
  };
};
