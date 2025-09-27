import { fetchJSON } from "../fetchJSON";

export interface NianpuPager {
  startIndex?: number;
  pageSize: number;
  pageth: number;
  pageCount?: number;
  rowCount?: number;
  took?: number;
}

export interface NianpuImage {
  "@id": string;
  "@type": string; // "Image"
  description?: string;
  format?: string; // e.g., "jpg"
  identifier?: string; // e.g., "74601"
  label?: string; // e.g., "w23ktmf7vdx8rl4k.jpg"
  source?: string;
  title?: string; // e.g., "WX-0072.jpg"
}

export interface NianpuEventItem {
  "@id": string;
  "@type": string; // "Event"
  title?: string;
  description?: string;
  dateLabel?: string; // e.g., "1920年9月30日"
  date?: string; // e.g., "2015-07-21 10:43:06"
  creator?: string; // e.g., "解舒匀"
  image?: NianpuImage | NianpuImage[]; // single or array per sample
  dctType?: string | string[]; // e.g., "文学"
  type?: string[]; // e.g., ["否","大","文学"]
  year?: string; // e.g., "1920" or "1944"
}

export interface NianpuFacetBucket {
  facet: string;
  count: number;
}

export interface NianpuFacets {
  coFacet?: NianpuFacetBucket[];
  isFacet?: NianpuFacetBucket[];
  plFacet?: NianpuFacetBucket[];
  typeFacet?: NianpuFacetBucket[];
  bigFacet?: NianpuFacetBucket[];
  orgFacet?: NianpuFacetBucket[];
}

export interface NianpuSearchResponse {
  pager: NianpuPager;
  datas: NianpuEventItem[];
  errorMessage: string;
  errorCode: string; // "0" means success
  facets?: NianpuFacets;
}

export interface SearchNianpuParams {
  freetext: string;
  page?: number; // 1-based
  pageSize?: number; // default 10
  sorts?: Record<string, string | number>;
  facet?: Record<string, unknown>;
  searchType?: string | number; // default: "1"
  collection?: string; // default: ""
  expression?: string; // default: ""
  cdtn?: unknown[]; // default: []
  secondCdtn?: string; // default: ""
  hasFacet?: boolean; // default: true
}

const NIANPU_ENDPOINT = "https://names.library.sh.cn/whzk/nianpu/search";

export async function searchSHLibraryNianpu(
  params: SearchNianpuParams
): Promise<NianpuSearchResponse> {
  const {
    freetext,
    page = 1,
    pageSize = 50,
    sorts = {}, // { IS: "1" },
    facet = {},
    searchType = "1",
    collection = "",
    expression = "",
    cdtn = [],
    secondCdtn = "",
    hasFacet = true,
  } = params;

  const json = await fetchJSON(NIANPU_ENDPOINT, {
    method: "POST",
    body: {
      searchType,
      freetext,
      collection,
      expression,
      cdtn,
      facet,
      secondCdtn,
      pager: { pageth: page, pageSize },
      sorts,
      hasFacet,
    } as any,
  });

  return json as NianpuSearchResponse;
}

export function getNianpuImages(item: NianpuEventItem): NianpuImage[] {
  if (!item.image) return [];
  return Array.isArray(item.image) ? item.image : [item.image];
}
