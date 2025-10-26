"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import ModalLayout from "@/app/(modal)/ModalLayout";
import { ImagesPreview } from "@/components/interaction/panel/_Images";
import { usePanelStore } from "@/components/interaction/panel/panelStore";
import type { LocationInfo } from "@/helper/map-data/LocationInfo";
import { highlightLocation } from "@/helper/mapbox/locationHighlight";
import { useFavoriteStore } from "../../../helper/supabase/favoriteStore";
import { isTouchDevice, useGlobalStore } from "../../globalStore";

export default function FavoritesPage() {
  const router = useRouter();
  const favorites = useFavoriteStore((s) => s.favorites);
  const scheduleOpen = usePanelStore((s) => s.scheduleOpen);
  const mapInstance = useGlobalStore((s) => s.mapInstance);

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

  // 处理 tag 点击，跳转到对应的位置信息面板
  const handleTagClick = useCallback(
    (_tag: string, locationInfo?: LocationInfo) => {
      if (!locationInfo) return;

      // 检查是否有全局地图实例
      if (!mapInstance) {
        console.log("Map instance not available");
        return;
      }

      if (isTouchDevice) {
        router.push(`/search?n=${encodeURIComponent(locationInfo.name)}`);
        return;
      } else {
        router.back();

        // 特殊处理 Wikimap 项目
        if (
          locationInfo.dataSource === "Wikidata" &&
          locationInfo.subtypeId === "wikimap" &&
          locationInfo.coordinates
        ) {
          const coordinates = locationInfo.coordinates;

          // 监听飞行结束事件
          const onMoveEnd = () => {
            mapInstance.off("moveend", onMoveEnd);

            // 飞行结束后显示高亮
            highlightLocation(mapInstance, coordinates);
          };

          highlightLocation(mapInstance, coordinates);

          mapInstance.once("moveend", onMoveEnd);

          mapInstance.flyTo({
            center: coordinates,
            zoom: 21,
            duration: 1000,
          });
        } else if (locationInfo.coordinates) {
          // 普通位置的处理
          const coordinates = locationInfo.coordinates;
          const _name = locationInfo.name;

          // 监听飞行结束事件
          const onMoveEnd = () => {
            mapInstance.off("moveend", onMoveEnd);

            // 飞行结束后显示高亮
            highlightLocation(mapInstance, coordinates);

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
      }
    },
    [mapInstance, scheduleOpen, router.push, router.back],
  );

  const favoritesIcon = (
    <div className="w-6 h-6 flex items-center justify-center">
      <Bookmark size={20} className="text-blue-600" />
    </div>
  );

  const renderContent = () => {
    if (favorites.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
          <div className="w-20 h-20 mb-4 text-gray-300">
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <title>收藏图标</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
              />
            </svg>
          </div>
          <p className="text-lg">还没有收藏图片</p>
          <p className="text-sm mt-2 text-center">
            点击图片上的书签按钮来收藏您喜欢的图片
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {Object.entries(groupedFavorites).map(([category, images]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-lg w-[135px] font-semibold text-gray-800 flex items-center gap-2 sticky top-0 bg-white/35 backdrop-blur-sm z-10 rounded-full">
              <span className="px-3 py-1 bg-gradient-to-r from-pink-200 to-purple-200 text-purple-700 rounded-full text-sm">
                {category}
              </span>
              <span className="text-sm font-bold text-gray-600">
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
    );
  };

  return (
    <ModalLayout
      title={`我的收藏 (${favorites.length})`}
      icon={favoritesIcon}
      maxWidth="max-w-4xl"
      headerBg="from-blue-50 to-indigo-50"
      closeAriaLabel="关闭收藏"
    >
      {renderContent()}
    </ModalLayout>
  );
}
