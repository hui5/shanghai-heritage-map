import {
  coerceToNumberArray,
  coerceToStringArray,
  escapeHtml,
  isNonEmptyArray,
} from "@/utils/helpers";
import type { CommonFields, LocationInfo } from "./LocationInfo";

export type LocationInfo_VirtualShanghai = CommonFields & {
  dataSource: "Virtual Shanghai";
  functions: string[];
  images: number[];
  id: number;
};

export const getVirtualShanghaiLocationInfo = (
  props: any,
  subtypeId: string,
): LocationInfo => {
  const functions: string[] = isNonEmptyArray(props.functions)
    ? props.functions.filter((s: any) => typeof s === "string")
    : coerceToStringArray(props.functions);

  const images: number[] = isNonEmptyArray(props.images)
    ? props.images.filter((n: any) => Number.isFinite(n))
    : coerceToNumberArray(props.images);

  return {
    subtypeId,
    properties: props,
    dataSource: "Virtual Shanghai",
    name: props.name_zh || props.name_en || "",
    address: props.address || "",
    functions,
    images,
    id: props.building_id,
  };
};

export const getVirtualShanghaiImageUrl = (
  imageId: string | number,
): { thumbnailUrl: string; imageUrl: string; ref: string } => ({
  thumbnailUrl: `https://www.virtualshanghai.net/Asset/Thumbnail/dbImage_ID-${imageId}_No-1.jpeg`,
  imageUrl: `https://www.virtualshanghai.net/Asset/Preview/dbImage_ID-${imageId}_No-1.jpeg`,
  ref: `https://www.virtualshanghai.net/Photos/Images?ID=${imageId}`,
});

export const getVirtualShanghaiImageUrl_jsdelivr = (
  imageId: string | number,
): { thumbnailUrl: string; imageUrl: string; ref: string } => ({
  thumbnailUrl: `https://cdn.jsdelivr.net/gh/hui5/VirtualShanghai-photos@main/images/${imageId}.jpeg`,
  imageUrl: `https://cdn.jsdelivr.net/gh/hui5/VirtualShanghai-photos@main/images/${imageId}.jpeg`,
  ref: `https://www.virtualshanghai.net/Photos/Images?ID=${imageId}`,
});

export const getVirtualShanghaiBuildingLink = ({
  id,
}: LocationInfo_VirtualShanghai): string =>
  `https://www.virtualshanghai.net/Data/Buildings?ID=${id}`;

/**
 * 生成"Virtual Shanghai 属性/媒体 区块
 * - functions：以标签（chips）形式展示
 * - images：竖排列表，支持数量上限
 */
export const generateVirtualShanghaiAttributeRows = (
  { functions, images }: LocationInfo_VirtualShanghai,
  opts?: { maxImages?: number; showFunctionLabel?: boolean },
): string => {
  const maxImages = Math.max(0, opts?.maxImages ?? 3);
  const showFunctionLabel = opts?.showFunctionLabel ?? true;

  const functionChips = functions.length
    ? `
      <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
        ${
          showFunctionLabel
            ? `<span style="font-size: 11px; color: #6B7280;">用途</span>`
            : ""
        }
        ${functions
          .map(
            (f) => `
              <span style="display: inline-flex; align-items: center; padding: 2px 6px; border-radius: 999px; background: #F3F4F6; color: #374151; font-size: 11px; line-height: 1.4; border: 1px solid #E5E7EB;">${escapeHtml(
                f,
              )}</span>
            `,
          )
          .join("")}
      </div>
    `
    : "";

  const limitedImages = images.slice(0, maxImages);
  const moreCount = Math.max(0, images.length - limitedImages.length);

  const imageList = limitedImages.length
    ? `
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px; ">
        ${limitedImages
          .map((id) => {
            const { thumbnailUrl, imageUrl, ref } =
              getVirtualShanghaiImageUrl_jsdelivr(id);
            const alt = `Virtual Shanghai Image ${id}`;
            return `
              <div style="width: 100%; min-width: 250px; overflow: hidden; border-radius: 6px; border: 1px solid #E5E7EB; background: #F9FAFB;">
                <img src="${imageUrl}" alt="${escapeHtml(
                  alt,
                )}" style="display: block; width: 100%; height: auto;"/>
              </div>
            `;
          })
          .join("")}
        ${
          moreCount > 0
            ? `<div style="font-size: 11px; color: #9CA3AF; text-align: right;">还有 ${moreCount} 张...</div>`
            : ""
        }
      </div>
    `
    : "";

  if (!functionChips && !imageList) return "";

  return `
    ${functionChips}
    ${imageList}
  `;
};
