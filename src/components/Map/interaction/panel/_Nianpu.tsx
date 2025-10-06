import type React from "react";
import { useState } from "react";
import type {
  NianpuEventItem,
  NianpuImage,
} from "@/helper/api/shLibraryNianpuApi";
import {
  getShLibraryImageUrl,
  getShLibraryThumbnailUrl,
} from "@/helper/api/shLibraryPhotosApi";
import usePanelStore from "./panelStore";

export interface NianpuPreviewProps {
  items: NianpuEventItem[];
  className?: string;
  title?: string;
}

const formatYear = (item: NianpuEventItem) => item.year || item.dateLabel || "";

const getImages = (img?: NianpuImage | NianpuImage[]) =>
  !img ? [] : Array.isArray(img) ? img : [img];

// Remove duplicated title at the beginning of description and any leading punctuation
const stripLeadingTitleAndPunc = (
  title: string,
  description?: string,
): string => {
  if (!description) return "";
  let d = description.trim();
  if (!d) return d;
  const t = (title || "").trim();
  if (t) {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    d = d.replace(new RegExp(`^\\s*${esc}(?:\\s*[：:，,。．、；;—-]*)?`), "");
  }
  d = d.replace(/^[：:，,。．、；;—-\s]+/, "");
  return d;
};

export const NianpuPreview: React.FC<NianpuPreviewProps> = ({
  items,
  className = "",
  title = "年谱",
}) => {
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({});
  const isFullscreen = usePanelStore((s) => s.isFullscreen);

  if (!items?.length) return null;

  return (
    <div
      className={`bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-white/10  max-w-[400px] ${className}`}
    >
      <div className="py-2">
        <div className="space-y-4">
          {items
            .sort((a, b) =>
              (a.dateLabel || "").localeCompare(b.dateLabel || ""),
            )
            .map((ev, idx) => {
              const isExpanded = !!expandedMap[idx];
              const toggleExpanded = () =>
                setExpandedMap((m) => ({ ...m, [idx]: !m[idx] }));
              const imgs = getImages(ev.image);
              const first = imgs[0];
              const thumbName = first?.label || first?.title || "";
              const description = stripLeadingTitleAndPunc(
                ev.title || "",
                ev.description,
              );
              return (
                <div key={ev.title} className="px-2">
                  <div className=" relative group rounded-md px-3 py-3 transition-all duration-150 border border-transparent hover:border-gray-200 hover:bg-white/70 hover:shadow-sm">
                    <span
                      className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-sky-300 opacity-0 group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="pl-2 pr-1 flex gap-3 items-start">
                      <span className="mt-0.5 inline-flex items-center h-6 pr-2 rounded  text-sky-700 text-base font-medium whitespace-nowrap">
                        {formatYear(ev)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium">
                          <a
                            href={ev["@id"]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {ev.title || ""}
                          </a>
                        </h3>

                        {imgs.length > 0 && thumbName && (
                          <a
                            className="mt-2 block rounded overflow-hidden bg-white/40"
                            href={getShLibraryImageUrl(thumbName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={thumbName}
                          >
                            <img
                              src={getShLibraryThumbnailUrl(thumbName)}
                              alt={ev.title || thumbName}
                              className={`max-h-[300px] object-cover`}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </a>
                        )}

                        {description && (
                          <div className="relative">
                            {/** biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                            <p
                              className={`mt-2 text-sm text-gray-700 ${
                                isExpanded ? "" : "line-clamp-3"
                              } cursor-pointer select-none`}
                              onClick={toggleExpanded}
                              title={isExpanded ? "点击收起" : "点击展开"}
                            >
                              {description}
                            </p>
                            {!isExpanded && !isFullscreen && (
                              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/80 to-transparent" />
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-gray-500">
                            {ev.dateLabel ? <span>{ev.dateLabel}</span> : null}
                          </div>
                          <span className="text-xs text-gray-600 bg-gray-100 px-1 py-1 rounded-md">
                            {ev.dctType
                              ? Array.isArray(ev.dctType)
                                ? ev.dctType.join(",")
                                : ev.dctType
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {idx < items.length - 1 && (
                    <div className="border-t border-gray-200 " />
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default NianpuPreview;
