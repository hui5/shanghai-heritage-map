import type { Map as MapboxMap } from "mapbox-gl";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import { LoadingSpinner } from "@/components/Loading/LoadingOverlay";
import type { LaozaoItem } from "@/helper/api/laozaoShanghaiPhotosApi";
import {
  getShLibraryImageUrl,
  getShLibraryThumbnailUrl,
} from "@/helper/api/shLibraryPhotosApi";
import type { VirtualShanghaiPhotoZh } from "@/helper/api/virtualShanghaiPhotosApi";
import { highlightLocation } from "@/helper/mapbox/locationHighlight";
import {
  getVirtualShanghaiBuildingLink,
  getVirtualShanghaiImageUrl_proxy,
} from "../../../../helper/map-data/virtualshanghai";
import { AIStreamingDisplay } from "../AI/AIStreamingDisplay";
import { ImagesPreview } from "./_Images";
import { NianpuPreview } from "./_Nianpu";
import { WikipediaPreview } from "./_Wikipedia";
import { FloatingInfoPanel, type PanelContent } from "./FloatingInfoPanel";
import type { PanelBehaviorConfig } from "./panelConfig";
import { usePanelStore } from "./panelStore";

const Loading = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center gap-2 text-gray-700 text-sm px-2 py-2 h-full ">
    <LoadingSpinner size="sm" />
    <span>{name}…</span>
  </div>
);
export interface FloatingInfoControllerProps {
  mapInstance: MapboxMap | null;
  behavior?: Partial<PanelBehaviorConfig>;
}

export const FloatingInfoController: React.FC<FloatingInfoControllerProps> = ({
  mapInstance,
}) => {
  const locationInfo = usePanelStore((s) => s.locationInfo);
  const triggerPoint = usePanelStore((s) => s.triggerPoint);

  const forceHide = usePanelStore((s) => s.forceHide);
  const isOpen = usePanelStore((s) => s.isOpen);
  const isFullscreen = usePanelStore((s) => s.isFullscreen);
  const aiActive = usePanelStore((s) => s.aiActive);
  const setAiActive = usePanelStore((s) => s.setAiActive);

  // Split endpoints per requirement
  const fetcher = useCallback((url: string, body: any) => {
    return fetch(url, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify(body),
    }).then((res) => res.json());
  }, []);

  const { data: wikiRes, isLoading: wikiLoading } = useSWR(
    locationInfo ? ["/api/prepare/wikidata", locationInfo] : null,
    ([url, body]) => fetcher(url as string, body),
    { revalidateOnFocus: false },
  );

  const { data: shPhotosRes, isLoading: shPhotosLoading } = useSWR(
    locationInfo ? ["/api/prepare/shlibrary-photos", locationInfo] : null,
    ([url, body]) => fetcher(url as string, body),
    { revalidateOnFocus: false },
  );

  const { data: nianpuRes, isLoading: nianpuLoading } = useSWR(
    locationInfo ? ["/api/prepare/shlibrary-nianpu", locationInfo] : null,
    ([url, body]) => fetcher(url as string, body),
    { revalidateOnFocus: false },
  );

  const { data: vsRes, isLoading: vsLoading } = useSWR(
    locationInfo ? ["/api/prepare/virtualshanghai-photos", locationInfo] : null,
    ([url, body]) => fetcher(url as string, body),
    { revalidateOnFocus: false },
  );

  const { data: laozaoRes, isLoading: laozaoLoading } = useSWR(
    locationInfo ? ["/api/prepare/laozao-photos", locationInfo] : null,
    ([url, body]) => fetcher(url as string, body),
    { revalidateOnFocus: false },
  );

  const contents: PanelContent[] = useMemo(() => {
    const items: PanelContent[] = [];
    if (!locationInfo) return items;

    // Wikipedia (uses shared wiki loading)
    if (wikiLoading || wikiRes?.wikipediaSpec) {
      items.push({
        id: "wikipedia",
        label: "维基百科",
        render: (
          <div className="relative">
            {wikiLoading ? (
              <Loading name="维基百科" />
            ) : (
              <WikipediaPreview wikipediaSpec={wikiRes?.wikipediaSpec} />
            )}
          </div>
        ),
        hint:
          wikiRes?.hasShanghaiConstraint === false
            ? "未添加上海地域限制"
            : undefined,
        visible: true,
        isLoading: wikiLoading,
        order: 2,
      });
    }

    // Commons (shares wiki loading/state)
    const commonsImages = wikiRes?.commonsData?.images ?? [];
    if (wikiLoading || commonsImages.length > 0) {
      items.push({
        id: "commons",
        label: "维基共享",
        render: (
          <div className="relative">
            {wikiLoading ? (
              <Loading name="维基共享" />
            ) : (
              <ImagesPreview
                data={wikiRes?.commonsData as any}
                title=""
                className=""
                maxWidth={500}
                category="维基共享"
                locationInfo={locationInfo}
              />
            )}
          </div>
        ),
        hint:
          wikiRes?.hasShanghaiConstraint === false
            ? "未添加上海地域限制"
            : undefined,
        visible: true,
        isLoading: wikiLoading,
        order: 1,
      });
    }

    // SH Library Nianpu
    const nianpuItems = nianpuRes?.items ?? [];
    if (nianpuLoading || nianpuItems.length > 0) {
      items.push({
        id: "nianpu",
        label: "上图·年谱",
        render: (
          <div className="relative">
            {nianpuLoading ? (
              <Loading name="上图·年谱" />
            ) : (
              <NianpuPreview items={nianpuItems} />
            )}
          </div>
        ),
        visible: true,
        isLoading: nianpuLoading,
        order: 5,
      });
    }

    // Laozao Shanghai
    const laozaoItems = laozaoRes?.items ?? [];
    if (laozaoLoading || laozaoItems.length > 0) {
      items.push({
        id: "laozao",
        label: "老早上海",
        render: (
          <div className="relative">
            {laozaoLoading ? (
              <Loading name="老早上海" />
            ) : (
              <ImagesPreview
                data={{
                  images: laozaoItems.map((item: LaozaoItem) => ({
                    title: "",
                    thumbnail: item.defaultImageUrl || "",
                    description: item.text || "",
                    ref: `https://laozaoshanghai.com/info/${item.id}`,
                    source: item.source,
                  })),
                }}
                title=""
                className=""
                maxWidth={700}
                category="老早上海"
                locationInfo={locationInfo}
              />
            )}
          </div>
        ),
        visible: true,
        isLoading: laozaoLoading,
        order: 3,
      });
    }

    // Virtual Shanghai
    const vsPhotos = vsRes?.photos ?? [];
    if (vsLoading || vsPhotos.length > 0) {
      items.push({
        id: "virtualshanghai",
        label: "虚拟上海",
        render: (
          <div className="relative">
            {vsLoading ? (
              <Loading name="虚拟上海" />
            ) : (
              <ImagesPreview
                data={{
                  images: vsPhotos.map((photo: VirtualShanghaiPhotoZh) => {
                    const { id, title_zh, note_zh, street_zh, date } = photo;
                    const { imageUrl, thumbnailUrl, ref } =
                      getVirtualShanghaiImageUrl_proxy(id);
                    return {
                      title: (title_zh as string) || "",
                      description: (note_zh as string) || "",
                      address: (street_zh as string) || "",
                      date,
                      thumbnail: thumbnailUrl,
                      url: imageUrl,
                      ref,
                    };
                  }),
                  categoryUrl:
                    locationInfo.dataSource === "Virtual Shanghai" &&
                    locationInfo.images?.length
                      ? getVirtualShanghaiBuildingLink(locationInfo)
                      : undefined,
                }}
                title=""
                className=""
                maxWidth={700}
                category="虚拟上海"
                locationInfo={locationInfo}
              />
            )}
          </div>
        ),
        visible: true,
        isLoading: vsLoading,
        order: 3,
      });
    }

    // SH Library Photos
    const shPhotos = shPhotosRes?.photos ?? [];
    if (shPhotosLoading || shPhotos.length > 0) {
      items.push({
        id: "shlibrary",
        label: "上图·照片",
        render: (
          <div className="relative">
            {shPhotosLoading ? (
              <Loading name="上图·照片" />
            ) : (
              <ImagesPreview
                data={{
                  images: shPhotos.map((p: any) => ({
                    title: "",
                    description:
                      p.chsDescription?.["@value"] ||
                      p.chsTitle?.["@value"] ||
                      "",
                    date: p.source?.date ?? "",
                    thumbnail: getShLibraryThumbnailUrl(p.image || ""),
                    url: getShLibraryImageUrl(p.image || ""),
                    ref: p["@id"],
                  })),
                }}
                title=""
                className=""
                maxWidth={700}
                category="上图·照片"
                locationInfo={locationInfo}
              />
            )}
          </div>
        ),
        visible: true,
        isLoading: shPhotosLoading,
        order: 4,
      });
    }

    // AI Tab
    if (aiActive && locationInfo) {
      items.push({
        id: "ai",
        label: "AI 分析",
        render: (
          <div className="relative h-full max-w-2xl bg-white/50 p-5">
            <AIStreamingDisplay
              key={`${locationInfo.coordinates?.[0]}-${locationInfo.coordinates?.[1]}-${locationInfo.name || "unknown"}`}
              requestData={{
                name: locationInfo.name,
                address: locationInfo.address,
                coordinates: locationInfo.coordinates,
                properties: locationInfo.properties,
              }}
              isOpen={aiActive}
            />
          </div>
        ),
        visible: true,
        isLoading: false,
        order: 0, // AI tab 排在最前面
      });
    }

    return items;
  }, [
    locationInfo,
    wikiRes,
    wikiLoading,
    vsRes,
    vsLoading,
    nianpuRes,
    nianpuLoading,
    shPhotosRes,
    shPhotosLoading,
    laozaoRes,
    laozaoLoading,
    aiActive,
  ]);

  useEffect(() => {
    if (locationInfo && contents.length === 0) {
      if (isFullscreen && !aiActive) {
        setAiActive(true);
      } else {
        forceHide();
      }
    }
  }, [locationInfo, contents, forceHide, isFullscreen, setAiActive, aiActive]);

  // 清除高亮的方法

  // 监听全屏状态变化，处理高亮和URL同步
  useEffect(() => {
    if (isFullscreen && locationInfo?.name) {
      const currentPath = window.location.pathname;

      // 只有当前在首页时才更新到搜索页面
      if (currentPath === "/") {
        window.history.pushState(
          {},
          "",
          `/search?n=${encodeURIComponent(locationInfo.name)}`,
        );
      }
    }

    if (!isFullscreen) {
      const currentPath = window.location.pathname;

      // 只有当前在搜索页面时才更新到首页
      if (currentPath === "/search") {
        window.history.pushState({}, "", "/");
        if (mapInstance && locationInfo?.coordinates) {
          highlightLocation(mapInstance, locationInfo.coordinates);
        }
      }
    }
  }, [isFullscreen, locationInfo, mapInstance]);

  return (
    <>
      {isOpen && contents.length && (
        <FloatingInfoPanel
          contents={contents}
          locationInfo={locationInfo ?? undefined}
          triggerPoint={triggerPoint ?? undefined}
          className=""
        />
      )}
    </>
  );
};

export default FloatingInfoController;
