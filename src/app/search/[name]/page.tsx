"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePanelStore } from "@/components/Map/interaction/panel/panelStore";

export default function SearchPage() {
  const params = useParams();
  const name = params?.name ? decodeURIComponent(params.name as string) : null;
  const scheduleOpen = usePanelStore((s) => s.scheduleOpen);
  const setFullscreen = usePanelStore((s) => s.setFullscreen);
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

      // 延迟打开面板，确保地图已经加载
      const timer = setTimeout(() => {
        scheduleOpen({
          locationInfo: locationInfo as any,
          triggerPoint: null,
          currentZoom: 15,
        });
        // 直接设置为全屏模式
        setTimeout(() => {
          setFullscreen(true);
        }, 100);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [name, scheduleOpen, setFullscreen]);

  // MapContainer在MapLayout中，这个页面不需要渲染任何可见内容
  return null;
}
