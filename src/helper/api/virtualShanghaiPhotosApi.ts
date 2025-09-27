import rawPhotos from "@/data/virtual_shanghai_photos_min_zh.json";

export interface VirtualShanghaiPhotoZh {
  id: string;
  date?: string | null;
  title_zh?: string | null;
  note_zh?: string | null;
  street_zh?: string | null;
}

// Cast once for typed access
const photos: VirtualShanghaiPhotoZh[] =
  rawPhotos as any[] as VirtualShanghaiPhotoZh[];

const idToPhoto: Map<string, VirtualShanghaiPhotoZh> = new Map(
  photos.map((p) => [String(p.id), p])
);

/**
 * 根据一组图片 id（字符串或数字）获取对应的图片信息。
 * - 会按传入顺序返回
 * - 未找到的 id 将被忽略
 */
export function getPhotosByIds(
  ids: Array<string | number>
): VirtualShanghaiPhotoZh[] {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const result: VirtualShanghaiPhotoZh[] = [];
  for (const rawId of ids) {
    const key = String(rawId);
    const p = idToPhoto.get(key);
    if (p) result.push(p);
  }
  return result;
}

/**
 * 根据名称在 title_zh → street_zh → note_zh 中进行包含匹配（优先级依次递减）。
 * 返回按匹配优先级排序的图片信息数组。
 */
export function searchPhotosByName(
  name: string,
  limit: number = 10
): VirtualShanghaiPhotoZh[] {
  const q = String(name || "").trim();
  if (!q) return [];

  const titleMatches: VirtualShanghaiPhotoZh[] = [];
  const streetMatches: VirtualShanghaiPhotoZh[] = [];
  const noteMatches: VirtualShanghaiPhotoZh[] = [];

  for (const p of photos) {
    const title = p.title_zh || "";
    const street = p.street_zh || "";
    const note = p.note_zh || "";

    if (title.includes(q)) {
      titleMatches.push(p);
      continue;
    }
    if (street.includes(q)) {
      streetMatches.push(p);
      continue;
    }
    if (note.includes(q)) {
      noteMatches.push(p);
    }
  }

  return [...titleMatches, ...streetMatches, ...noteMatches].slice(0, limit);
}
