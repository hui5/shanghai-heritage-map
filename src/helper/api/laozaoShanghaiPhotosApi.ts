import { fetchJSON } from "../fetchJSON";

export interface LaozaoMediaItem {
  type: string; // e.g., "photo"
  url: string;
  fileName?: string;
  previewUrl?: string;
}

export interface LaozaoItem {
  id: string;
  contentType?: string | null;
  text: string;
  source?: string;
  mediaItems?: LaozaoMediaItem[];
  tags?: string[];
  dateCreated?: string;
  defaultImageUrl?: string;
}

export interface LaozaoSearchResponse {
  total: number;
  data: LaozaoItem[];
}

const BASE = "https://service.laozaoshanghai.com/api/contentItems";

export async function searchLaozaoPhotos(
  keyword: string,
  pageIndex: number = 0,
  pageSize: number = 30,
): Promise<LaozaoSearchResponse> {
  const url = `${BASE}?pageIndex=${pageIndex}&pageSize=${pageSize}&keyword=${encodeURIComponent(
    keyword,
  )}`;
  const res = await fetchJSON(url);
  // Basic shape guard
  const total = Number(res?.total || 0);
  const data = Array.isArray(res?.data) ? (res.data as LaozaoItem[]) : [];
  return { total, data };
}
