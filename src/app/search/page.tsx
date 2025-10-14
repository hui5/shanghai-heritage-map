"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePanelStore } from "@/components/Map/interaction/panel/panelStore";

export default function SearchPage() {
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
      };

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
