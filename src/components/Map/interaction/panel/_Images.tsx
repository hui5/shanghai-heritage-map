import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import usePanelStore from "./panelStore";

export interface Image {
  title: string;
  thumbnail: string;
  url: string;
  description?: string;
  address?: string;
  ref?: string;
  date?: string;
  source?: string;
}

interface Data {
  images: Image[];
  categoryUrl?: string;
}

interface ImagesPreviewProps {
  data?: Data | null;
  className?: string;
  title: string;
  maxWidth?: number;
  pageSize?: number; // 每页显示的图片数量
}

export const ImagesPreview: React.FC<ImagesPreviewProps> = ({
  data,
  className = "",
  maxWidth = 500,
  title,
  pageSize = 10, // 默认每页显示10张图片
}) => {
  const setPinned = usePanelStore((s) => s.setPinned);
  const isFullscreen = usePanelStore((s) => s.isFullscreen);

  // 当前显示的图片数量
  const [displayCount, setDisplayCount] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 用于检测滚动到底部
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 当数据变化时重置显示数量
  const dataRef = useRef(data);
  useEffect(() => {
    if (dataRef.current !== data) {
      setDisplayCount(pageSize);
      dataRef.current = data;
    }
  }, [data, pageSize]);

  // 加载更多的回调
  const loadMore = useCallback(() => {
    if (!data?.images || displayCount >= data.images.length) return;

    setIsLoadingMore(true);
    // 模拟加载延迟，避免图片闪烁
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + pageSize, data.images.length));
      setIsLoadingMore(false);
    }, 300);
  }, [data?.images, displayCount, pageSize]);

  // 使用 IntersectionObserver 监听滚动到底部
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !data?.images || displayCount >= data.images.length) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, data?.images, displayCount, isLoadingMore]);

  // 获取当前要显示的图片
  const displayedImages = data?.images.slice(0, displayCount) ?? [];
  const hasMore = (data?.images?.length ?? 0) > displayCount;

  return (
    <div
      className={` backdrop-blur-md rounded-lg  shadow-xl border border-white/10   overflow-hidden  ${className}`}
      style={{ maxWidth: maxWidth + 58 }}
    >
      {/* <div className="p-4 border-b bg-pink-50">
        <h3 className="text-base font-semibold text-pink-900">{title}</h3>
      </div> */}

      <div className="p-4">
        {/* 所有图片以大图形式显示 */}
        {displayedImages.length > 0 && (
          <div className="space-y-3 mb-4">
            {displayedImages.map((image, index) => (
              <div
                key={`${image.thumbnail}-${index}`}
                className="block rounded-lg hover:shadow-lg transition-all duration-200 group"
              >
                <a
                  href={image.ref || image.url}
                  target="_blank"
                  onClick={(_e) => {
                    setPinned(true);
                  }}
                  rel="noopener noreferrer"
                >
                  <div className="flex items-center justify-center p-3 min-h-[120px]  bg-gradient-to-br from-transparent via-white/5 to-white/10  rounded-lg ">
                    <img
                      src={image.thumbnail}
                      alt={image.title}
                      className={` ${
                        isFullscreen ? "max-h-[550px]" : "max-h-[450px]"
                      } object-contain hover:scale-105 transition-transform duration-200 rounded shadow-md `}
                      onError={(e) => {
                        e.currentTarget.alt = "图片缺失";
                      }}
                    />
                  </div>
                </a>
                {/* 图片标题 */}
                <div className="px-4 pb-4 ">
                  {image.title && (
                    <div className="  pt-1 rounded-b-lg">
                      <p
                        className={`${
                          isFullscreen ? "text-sm" : "text-xs"
                        }  text-gray-800  font-medium `}
                        title={image.title}
                      >
                        {image.title}
                      </p>
                    </div>
                  )}
                  {image.description && (
                    <div className="  pt-1 rounded-b-lg">
                      <p
                        className={`${
                          isFullscreen ? "text-sm" : "text-xs"
                        }  text-gray-700  font-medium`}
                        title={image.description}
                      >
                        {image.description}
                      </p>
                    </div>
                  )}
                  {(image.address || image.date || image.source) && (
                    <div className="  pt-1 rounded-b-lg">
                      <p
                        className={`${
                          isFullscreen ? "text-sm" : "text-xs"
                        }  text-gray-500  font-medium`}
                      >
                        {image.date || ""} {image.address || ""}
                        {image.source || ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 显示已加载数量和总数 */}
        {data?.images && data.images.length > 0 && (
          <div className="text-center text-xs text-gray-500 py-2">
            已显示 {displayCount} / {data.images.length} 张图片
          </div>
        )}

        {/* 加载更多触发器 */}
        {hasMore && (
          <div ref={loadMoreRef} className="py-4 text-center">
            {isLoadingMore ? (
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={loadMore}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                加载更多
              </button>
            )}
          </div>
        )}

        {data?.categoryUrl && (
          <a
            href={data.categoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>查看更多</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
};
