import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationInfo } from "../../../../helper/map-data/LocationInfo";
import { useFavoriteStore } from "./favoriteStore";
import { openLightbox } from "./GlobalLightbox";
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
  tags?: string[];
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
  category?: string; // 分类名称，用于收藏功能
  locationInfo?: LocationInfo; // 位置信息，用于收藏功能
  showFavoriteButton?: boolean; // 是否显示收藏按钮
  onTagClick?: (tag: string, locationInfo?: LocationInfo) => void; // tag 点击回调
}

export const ImagesPreview: React.FC<ImagesPreviewProps> = ({
  data,
  className = "",
  maxWidth = 500,
  pageSize = 10, // 默认每页显示10张图片
  category = "",
  locationInfo,
  showFavoriteButton = true,
  onTagClick,
}) => {
  const setPinned = usePanelStore((s) => s.setPinned);
  const isFullscreen = usePanelStore((s) => s.isFullscreen);

  // 订阅收藏列表，这样当收藏状态改变时组件会重新渲染
  const favorites = useFavoriteStore((s) => s.favorites);
  const addFavorite = useFavoriteStore((s) => s.addFavorite);
  const removeFavorite = useFavoriteStore((s) => s.removeFavorite);

  // 在组件中计算是否已收藏和获取 favoriteId
  const isFavorited = useCallback(
    (imageUrl: string, cat: string) => {
      const favoriteId = `${cat}::${imageUrl}`;
      return favorites.some((f) => f.favoriteId === favoriteId);
    },
    [favorites],
  );

  const getFavoriteId = useCallback(
    (imageUrl: string, cat: string) => {
      const favoriteId = `${cat}::${imageUrl}`;
      const favorite = favorites.find((f) => f.favoriteId === favoriteId);
      return favorite ? favorite.favoriteId : null;
    },
    [favorites],
  );

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

  // 处理图片点击，打开全局 Lightbox
  const handleImageClick = useCallback(
    (index: number) => {
      // 传递完整的图片组，而不是当前显示的10个
      const allImages = data?.images ?? [];
      openLightbox(allImages, index, category);
      setPinned(true);
    },
    [data?.images, setPinned, category],
  );

  // 处理收藏按钮点击
  const handleFavoriteClick = useCallback(
    (image: Image, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!locationInfo || !category) return;

      const imageUrl = image.url || image.thumbnail;
      const favoriteId = getFavoriteId(imageUrl, category);

      if (favoriteId) {
        removeFavorite(favoriteId);
      } else {
        addFavorite(image, category, locationInfo);
      }
    },
    [locationInfo, category, addFavorite, removeFavorite, getFavoriteId],
  );

  // 处理 tag 点击
  const handleTagClick = useCallback(
    (tag: string, image: Image, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 如果是收藏的图片，可以从 locationInfo 中获取
      const imageLocationInfo = (image as any).locationInfo;
      if (onTagClick) {
        onTagClick(tag, imageLocationInfo);
      }
    },
    [onTagClick],
  );

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
            {displayedImages.map((image, index) => {
              const imageUrl = image.url || image.thumbnail;
              const favorited =
                showFavoriteButton && category && locationInfo
                  ? isFavorited(imageUrl, category)
                  : false;

              return (
                <div
                  key={`${image.thumbnail}-${index}`}
                  className="block rounded-lg hover:shadow-lg transition-all duration-200 group relative"
                >
                  <button
                    type="button"
                    onClick={() => handleImageClick(index)}
                    className="w-full text-left"
                  >
                    <div className="relative flex items-center justify-center p-3 min-h-[120px]  bg-gradient-to-br from-transparent via-white/5 to-white/10  rounded-lg cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.thumbnail}
                        alt={image.title || "历史图片"}
                        className={` ${
                          isFullscreen ? "max-h-[550px]" : "max-h-[450px]"
                        } object-contain hover:scale-105 transition-transform duration-200 rounded shadow-md `}
                        onError={(e) => {
                          e.currentTarget.alt = "图片缺失";
                        }}
                      />
                    </div>
                  </button>
                  {/* 收藏按钮 - 独立于主按钮 */}
                  {showFavoriteButton && locationInfo && category && (
                    <button
                      type="button"
                      onClick={(e) => handleFavoriteClick(image, e)}
                      className="absolute top-5 right-5 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
                      title={favorited ? "取消收藏" : "收藏"}
                    >
                      <svg
                        className={`w-5 h-5 transition-colors ${
                          favorited ? "text-blue-600" : "text-gray-500"
                        }`}
                        fill={favorited ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                        />
                      </svg>
                    </button>
                  )}
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
                    {/* Tags 标签 */}
                    {image.tags && image.tags.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1">
                        {image.tags.map((tag) => (
                          <button
                            key={`${image.url}-${tag}`}
                            type="button"
                            onClick={(e) => handleTagClick(tag, image, e)}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                            title={`查看 ${tag}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
              <title>查看原始分类页面</title>
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
