import type React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { createLocationHighlighter } from "@/helper/mapbox/locationHighlight";
import type { LocationInfo } from "../../../../helper/map-data/LocationInfo";
import { ImagesPreview } from "./_Images";
import { useFavoriteStore } from "./favoriteStore";
import { usePanelStore } from "./panelStore";

export interface FavoriteControllerProps {
  mapInstance: mapboxgl.Map | null;
}

export const FavoriteController: React.FC<FavoriteControllerProps> = ({
  mapInstance,
}) => {
  const isOpen = useFavoriteStore((s) => s.isOpen);
  const closePanel = useFavoriteStore((s) => s.closePanel);
  const favorites = useFavoriteStore((s) => s.favorites);
  const _clearAll = useFavoriteStore((s) => s.clearAll);

  const scheduleOpen = usePanelStore((s) => s.scheduleOpen);

  const highlighterRef = useRef<ReturnType<
    typeof createLocationHighlighter
  > | null>(null);

  // 按分类分组收藏的图片
  const groupedFavorites = useMemo(() => {
    const groups: Record<string, typeof favorites> = {};
    for (const fav of favorites) {
      if (!groups[fav.category]) {
        groups[fav.category] = [];
      }
      groups[fav.category].push(fav);
    }
    return groups;
  }, [favorites]);

  // 初始化位置高亮管理器
  useEffect(() => {
    if (!mapInstance) return;

    highlighterRef.current = createLocationHighlighter(mapInstance, {
      layerIdPrefix: "favorite-tag-highlight",
    });

    return () => {
      highlighterRef.current?.destroy();
      highlighterRef.current = null;
    };
  }, [mapInstance]);

  // 处理 tag 点击，跳转到对应的位置信息面板
  const handleTagClick = useCallback(
    (_tag: string, locationInfo?: LocationInfo) => {
      if (!locationInfo || !mapInstance) return;

      // 关闭收藏面板
      closePanel();

      // 如果有坐标，飞到该位置并高亮显示
      if (locationInfo.coordinates) {
        const coordinates = locationInfo.coordinates;
        const name = locationInfo.name;

        // 监听飞行结束事件
        const onMoveEnd = () => {
          mapInstance.off("moveend", onMoveEnd);

          // 飞行结束后显示高亮（highlight 方法内部会等待样式加载并确保图层在最上层）
          highlighterRef.current?.highlight(coordinates, name);

          // 打开位置信息面板
          const currentZoom = mapInstance.getZoom();
          scheduleOpen({
            locationInfo,
            triggerPoint: {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            },
            currentZoom,
          });
        };

        mapInstance.once("moveend", onMoveEnd);

        mapInstance.flyTo({
          center: coordinates,
          zoom: 17,
          duration: 1000,
        });
      } else {
        // 如果没有坐标，直接打开面板
        const currentZoom = mapInstance.getZoom();
        scheduleOpen({
          locationInfo,
          triggerPoint: {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          },
          currentZoom,
        });
      }
    },
    [mapInstance, closePanel, scheduleOpen],
  );

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <button
        type="button"
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[998] border-0 cursor-default"
        onClick={closePanel}
        aria-label="关闭收藏面板"
      />

      {/* 收藏面板 */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999] w-[90vw] max-w-4xl max-h-[95vh] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-pink-50/80 to-purple-50/80">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800">
              我的收藏
              <span className="ml-2 text-sm font-normal text-gray-600">
                共 {favorites.length} 张图片
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* {favorites.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("确定要清空所有收藏吗？")) {
                    clearAll();
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                清空收藏
              </button>
            )} */}
            <button
              type="button"
              onClick={closePanel}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="关闭"
              aria-label="关闭"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                className="w-20 h-20 mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
              <p className="text-lg">还没有收藏图片</p>
              <p className="text-sm mt-2">
                点击图片上的书签按钮来收藏您喜欢的图片
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedFavorites).map(([category, images]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg w-[140px] font-semibold text-gray-800 flex items-center gap-2 sticky top-0 bg-white/35 backdrop-blur-sm py-2 z-10">
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm">
                      {category}
                    </span>
                    <span className="text-sm font-normal text-gray-500">
                      {images.length} 张
                    </span>
                  </h3>
                  <ImagesPreview
                    data={{ images }}
                    title={category}
                    className="bg-white/50"
                    maxWidth={1000}
                    showFavoriteButton={true}
                    category={category}
                    locationInfo={images[0]?.locationInfo}
                    onTagClick={handleTagClick}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FavoriteController;
