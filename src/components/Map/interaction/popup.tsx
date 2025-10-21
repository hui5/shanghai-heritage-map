import mapboxgl, { type GeoJSONFeature } from "mapbox-gl";
import { isTouchDevice } from "@/app/globalStore";
import { fetchJSON } from "@/helper/fetchJSON";
import { proxyImage } from "@/helper/proxyImage";
import { generateBuildingPopupContent } from "./building";
import { generateHistoricalPopupContent } from "./historical";
import usePanelStore from "./panel/panelStore";

let mainPopup: mapboxgl.Popup | null = null;
let sidePopup: mapboxgl.Popup | null = null;
let currentWikipediaUrl: string | null = null;
let timeoutId: NodeJS.Timeout | null = null;

export const showPopup = ({
  lngLat,
  map,
  feature,
  delay = 100,
}: {
  lngLat: [number, number];
  feature: GeoJSONFeature;
  map: mapboxgl.Map;
  delay: number;
}) => {
  closePopup();
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  const { popupContent, locationInfo } = feature.layer?.id.includes(
    "openda_building-",
  )
    ? generateBuildingPopupContent(feature)
    : generateHistoricalPopupContent(feature);

  timeoutId = setTimeout(() => {
    const coordinates =
      locationInfo.geometry?.type === "Point"
        ? locationInfo.geometry.coordinates
        : lngLat;
    locationInfo.coordinates = coordinates;

    // 触屏设备下不显示 popup
    if (!isTouchDevice) {
      // 创建主弹出框
      mainPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        anchor: "right",
        offset: { bottom: [0, -30], right: [-50, 0] },
      })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map);

      // 创建侧边弹出框
      if (locationInfo.wikipedia && locationInfo.dataSource !== "上海图书馆") {
        currentWikipediaUrl = locationInfo.wikipedia;
        sidePopup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          anchor: "right",
          offset: [-340, 0],
        })
          .setLngLat(coordinates)
          .setHTML(
            `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; min-width:240px; max-width:300px; background:#ffffff; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.18); padding:12px 14px; font-size:12px; color:#6b7280;">加载中...</div>`,
          )
          .addTo(map);

        setSideContentAsync(locationInfo.wikipedia);
      }
    }

    const rect = (sidePopup || mainPopup)
      ?.getElement()
      ?.getBoundingClientRect();
    const currentZoom = map.getZoom();
    usePanelStore.getState().scheduleOpen({
      locationInfo,
      currentZoom,
      triggerPoint: rect ? { x: rect.x, y: rect.y + rect.height / 2 } : null,
    });
  }, delay);
};

const buildWikipediaHtml = (summary: any): string => {
  const title = summary?.title || "维基百科";
  const extract = summary?.extract || summary?.description || "";
  // 不显示“查看原文”链接
  const thumb =
    summary?.thumbnail?.source || summary?.originalimage?.source || "";

  return `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; min-width:240px; max-width:300px; background:#ffffff; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.18); overflow:hidden;">
          <div style="padding:12px 14px 10px 14px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
              <span style="color:#6b7280; font-size:10px; font-weight:500; padding:1px 4px; border:1px solid #e5e7eb; border-radius:6px; background:#f9fafb;">维基百科</span>
            </div>
            <h4 style="margin:0 0 8px 0; font-size:14px; line-height:1.2; color:#111827;">${title}</h4>
            ${
              thumb
                ? `<img src="${proxyImage(
                    thumb,
                  )}" alt="${title}" style="width:100%; height:auto; border-radius:6px; margin:0 0 8px 0;"/>`
                : ""
            }
            ${
              extract
                ? `<div style="margin:0; font-size:13px; color:#4b5563; line-height:1.55;">${extract}</div>`
                : ""
            }
          </div>
        </div>
      `;
};

const setSideContent = (wikipediaUrl: string, summary: any) => {
  if (currentWikipediaUrl !== wikipediaUrl) return;
  sidePopup?.setHTML(
    typeof summary === "string" ? summary : buildWikipediaHtml(summary),
  );
};

export const closePopup = () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  if (mainPopup) mainPopup.remove();
  if (sidePopup) sidePopup.remove();
  mainPopup = null;
  sidePopup = null;
  currentWikipediaUrl = null;

  usePanelStore.getState().cancelOpen();
  usePanelStore.getState().scheduleHide();
};

const setSideContentAsync = async (wikipediaUrl: string) => {
  const json = await fetchJSON(`/api/wiki-summary?wikipedia=${wikipediaUrl}`);
  setSideContent(wikipediaUrl, json);
};
