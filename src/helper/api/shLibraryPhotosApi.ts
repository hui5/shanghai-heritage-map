// Shanghai Library photo search API client
import { fetchJSON } from "../fetchJSON";

export const SHL_IMAGE_BASE = "https://img.library.sh.cn/whzk/img/";
import { proxyImage } from "../proxyImage";

export function getShLibraryImageUrl(name: string): string {
  // name is typically a file name or path, e.g., "w23ktmf7vdx8rl4k.jpg" or "2024/xx.jpg"
  return `${SHL_IMAGE_BASE}${name}`;
}

export function getShLibraryThumbnailUrl(
  name: string,
  width: number = 700 // 476
): string {
  // Server supports suffix like !476x476
  return `${getShLibraryImageUrl(name)}!${width}x${width}`;
}

export function getShLibraryThumbnailUrl_proxy(
  name: string,
  width: number = 700
): string {
  // Server supports suffix like !476x476
  return proxyImage(getShLibraryImageUrl(name), width);
}

export interface SHLPager {
  startIndex?: number;
  pageSize: number;
  pageth: number;
  pageCount?: number;
  rowCount?: number;
  took?: number;
}

export interface SHLLangValue {
  "@language"?: string;
  "@value"?: string;
}

export interface SHLPerson {
  "@id"?: string;
  "@type"?: string;
  personchsName?: SHLLangValue;
}

export interface SHLSource {
  "@id"?: string;
  "@type"?: string;
  date?: string;
  title?: string;
  year?: string[];
  callno?: string;
}

export interface SHLCollection {
  "@id"?: string;
  "@type"?: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface SHLPhotoItem {
  "@context"?: { "@vocab"?: string };
  "@id"?: string;
  "@type"?: string; // typically "Photo"
  chsDescription?: SHLLangValue;
  chsTitle?: SHLLangValue;
  identifier?: string;
  image?: string;
  noteOfSource?: string;
  person?: SHLPerson | SHLPerson[];
  source?: SHLSource;
  isPartOf?: SHLCollection;
  created?: string;
  createdby?: string;
  modifytime?: string;
  hits?: number;
}

export interface SHLFacetBucket {
  facet: string;
  count: number;
}

export interface SHLFacets {
  orgFacet?: SHLFacetBucket[];
  coFacet?: SHLFacetBucket[];
  isFacet?: SHLFacetBucket[];
  plFacet?: SHLFacetBucket[];
}

export interface SHLSearchResponse {
  pager: SHLPager;
  datas: SHLPhotoItem[];
  errorMessage: string;
  errorCode: string; // "0" means success in sample
  facets?: SHLFacets;
}

export interface SHLFacetInput {
  CO?: string;
  ORG?: string;
  IS?: string;
  PL?: string;
}

export interface SearchSHLParams {
  freetext: string;
  page?: number; // 1-based
  pageSize?: number;
  sorts?: Record<string, string | number>;
  facet?: SHLFacetInput;
  searchType?: string | number; // default: "1"
}

// Nianpu (chronicle/biography) search
// (moved) Nianpu search types are now in shLibraryNianpuApi.ts

const ENDPOINT = "https://names.library.sh.cn/whzk/photo/search";

export async function searchSHLibraryPhotos(
  params: SearchSHLParams
): Promise<SHLSearchResponse> {
  const {
    freetext,
    page = 1,
    pageSize = 9,
    sorts,
    facet,
    searchType = "1",
  } = params;

  const body = {
    searchType,
    freetext,
    sorts: sorts ?? {},
    pager: { pageth: page, pageSize },
    facet: { CO: "", ORG: "", IS: "", PL: "", ...(facet || {}) },
  } as const;

  const json = await fetchJSON(ENDPOINT, {
    method: "POST",
    body: {
      searchType,
      freetext,
      sorts: sorts ?? {},
      pager: { pageth: page, pageSize },
      facet: { CO: "", ORG: "", IS: "", PL: "", ...(facet || {}) },
    } as any,
  });

  return json as SHLSearchResponse;
}

// Optional helper to coerce single person to array for uniform downstream handling
export function getPersons(item: SHLPhotoItem): SHLPerson[] {
  if (!item.person) return [];
  return Array.isArray(item.person) ? item.person : [item.person];
}

// (moved) searchSHLibraryNianpu now lives in shLibraryNianpuApi.ts
