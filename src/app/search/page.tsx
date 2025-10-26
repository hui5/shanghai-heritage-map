"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { usePanelStore } from "@/components/interaction/panel/panelStore";
import { useSearchHistoryStore } from "@/components/interaction/panel/searchStore";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const name = searchParams?.get("n");
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (name && !hasInitialized.current) {
      hasInitialized.current = true;

      // 构造一个简单的 locationInfo，只包含 name
      const locationInfo = {
        name: name,
        subtypeId: "search",
        properties: {},
        dataSource: "Search" as any,
        coordinates: [121.4737, 31.2304] as [number, number], // 上海中心坐标
      };

      // 保存到查询历史
      const searchHistoryStore = useSearchHistoryStore.getState();
      searchHistoryStore.addSearchHistory({
        query: name,
        locationInfo: locationInfo as any,
        coordinates: locationInfo.coordinates,
      });

      usePanelStore.setState({
        isOpen: true,
        locationInfo: locationInfo as any,
        isFullscreen: true,
        showOverview: true,
      });
    }
  }, [name]);

  // MapContainer在MapLayout中，这个页面不需要渲染任何可见内容
  return null;
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
