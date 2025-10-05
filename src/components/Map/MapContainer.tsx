import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Github } from "lucide-react";
import U, { type UtilsMap } from "map-gl-utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingOverlay } from "@/components/Loading/LoadingOverlay";
import { BuildingClusterLayers } from "@/components/Map/building/ClusterLayers";
import { HistoricalLayers } from "@/components/Map/historical/Layers";
import DetailedInfoModal from "@/components/Map/interaction/AI/DetailedInfoModal";
import FloatingInfoController from "@/components/Map/interaction/panel/FloatingInfoController";
import { useGlobalClick } from "@/components/Map/interaction/useGlobalClick";
import { MapConsole } from "@/components/Map/MapConsole";
import MapContextMenu from "@/components/Map/MapContextMenu";
import { WikimapLayer } from "@/components/Map/WikimapLayer";
import { localStorageUtil } from "@/utils/localStorage";
import type { LocationInfo } from "../../helper/map-data/LocationInfo";
import { getParamsFromUrl } from "../../helper/mapbox/getParamsFromUrl";
import { addEventListeners } from "./interaction/addInteraction";

const defaultPitch = 0;

export default function MapContainer() {
	const mapContainer = useRef<HTMLDivElement>(null);
	const [mapInstance, setMapInstance] = useState<UtilsMap | null>(null);
	const [styleReady, setStyleReady] = useState<boolean>(false);
	const [mapMode, setMapMode] = useState<"2d" | "3d" | "middle">("3d");
	const [currentPitch, setCurrentPitch] = useState<number>(defaultPitch);
	const [lastPitch, setLastPitch] = useState<number>(0);

	// 详细信息模态框状态
	const [detailedInfoModalOpen, setDetailedInfoModalOpen] = useState(false);
	const [selectedLocationInfo, setSelectedLocationInfo] =
		useState<LocationInfo | null>(null);

	// 显示详细信息的回调
	const handleShowDetailedInfo = useCallback((data: LocationInfo) => {
		setSelectedLocationInfo(data);
		setDetailedInfoModalOpen(true);
	}, []);

	// 统一的地图模式切换回调
	const handleMapModeToggle = useCallback(
		(mode: "2d" | "3d" | "middle") => {
			if (!mapInstance) return;

			setMapMode(mode);

			// //确定地图样式;
			// let mapStyle: string;
			// switch (mode) {
			//   case "3d":
			//     mapStyle = "mapbox://styles/hui5/cmf7zygw7000r01pihwfgcesz";
			//     break;
			//   case "satellite":
			//     mapStyle = "mapbox://styles/mapbox/standard-satellite";
			//     break;
			//   default: // '2d'
			//     // mapStyle = "mapbox://styles/mapbox/light-v11";
			//     mapStyle = "mapbox://styles/hui5/cmf7zygw7000r01pihwfgcesz";
			//     break;
			// }

			// mapInstance.setStyle(mapStyle);

			// 设置视角
			switch (mode) {
				case "2d":
					setCurrentPitch(0);
					mapInstance.setConfigProperty("basemap", "show3dObjects", false);
					mapInstance.setConfigProperty("basemap", "theme", "monochrome");
					mapInstance.easeTo({
						pitch: 0,
						bearing: 0,
						duration: 1000,
					});
					break;
				case "middle":
					setCurrentPitch(0);
					mapInstance.setConfigProperty("basemap", "show3dObjects", true);
					mapInstance.setConfigProperty("basemap", "theme", "faded");
					mapInstance.easeTo({
						pitch: 0,
						bearing: 0,
						duration: 1000,
					});
					break;
				case "3d":
					mapInstance.setConfigProperty("basemap", "show3dObjects", true);
					mapInstance.setConfigProperty("basemap", "theme", "faded");
					mapInstance.easeTo({
						pitch: currentPitch,
						bearing: 0,
						duration: 1000,
					});
					break;
			}
		},
		[mapInstance, currentPitch],
	);

	// 热加载恢复机制：检测到地图实例存在但状态未准备时，强制重新检查
	useEffect(() => {
		if (mapInstance && !styleReady) {
			const checkAndRecover = () => {
				if (mapInstance.isStyleLoaded()) {
					setStyleReady(true);
				} else {
					mapInstance.once("style.load", () => {
						setStyleReady(true);
					});
				}
			};
			// 短暂延迟后检查，避免竞态条件
			const timer = setTimeout(checkAndRecover, 100);
			return () => clearTimeout(timer);
		}
	}, [mapInstance, styleReady]);

	// 3D角度切换回调
	const handle3DAngleToggle = useCallback(() => {
		if (!mapInstance) return;

		if (mapMode === "middle") {
			handleMapModeToggle("3d");
		}

		// 在30度和60度之间循环

		let newPitch: number;

		if (lastPitch === 0 && currentPitch === defaultPitch) {
			//   newPitch = 30;
			// } else if (lastPitch === 15 && currentPitch === 30) {
			//   newPitch = 60;
			// } else if (lastPitch === 30 && currentPitch === 60) {
			newPitch = 0;
		} else {
			newPitch = defaultPitch;
		}
		setLastPitch(currentPitch);
		setCurrentPitch(newPitch);

		mapInstance.easeTo({
			pitch: newPitch,
			duration: 500,
		});

		if (newPitch === 0) {
			handleMapModeToggle("middle");
		}
	}, [mapInstance, currentPitch, handleMapModeToggle, lastPitch, mapMode]);

	useGlobalClick({
		mapInstance,
		onShowDetailedInfo: handleShowDetailedInfo,
		minZoomLevel: 11,
	});

	// // 搜索功能
	// const {
	//   searchData,
	//   isSearchActive,
	//   handleResultSelect,
	//   highlightMultipleResults,
	//   returnToOriginalPosition,
	// } = useMapSearch({
	//   mapInstance,
	//   buildingData: {}, // 使用转换后的统一格式数据
	//   historicalData: {},
	//   wikimapData: [], // TODO: 添加Wikimap数据支持
	// });

	// 地图初始化
	useEffect(() => {
		if (!mapContainer.current) return;

		try {
			const paramsPosition = getParamsFromUrl();
			// 加载保存的地图位置
			const savedPosition = localStorageUtil.loadMapPosition();
			const defaultCenter: [number, number] = [121.4737, 31.2304]; // 上海市中心 [lng, lat]
			const defaultZoom = 11;

			// 修复坐标转换：localStorage中存储的是 [lat, lng]，Mapbox需要 [lng, lat]
			const center = paramsPosition.center
				? ([paramsPosition.center[1], paramsPosition.center[0]] as [
						number,
						number,
					])
				: savedPosition.center
					? ([savedPosition.center[1], savedPosition.center[0]] as [
							number,
							number,
						])
					: defaultCenter;
			const zoom = paramsPosition.zoom || savedPosition.zoom || defaultZoom;

			// Mapbox Access Token - 请配置您自己的访问令牌
			// 注意：这是一个测试令牌，在生产环境中请使用您自己的令牌
			mapboxgl.accessToken =
				process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
				process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
				"pk.eyJ1IjoidGVzdGluZ3VzZXIiLCJhIjoiY2p1czFxZzB0MGIxcTQzcHN5eWE4MnBvMyJ9.IHNcZI_KfRwUAREGvGj2OQ";

			// 禁用遥测以减少开发环境中的网络错误日志
			if (process.env.NODE_ENV === "development") {
				(mapboxgl as any).prewarm = () => {};
				(mapboxgl as any).clearPrewarmedResources = () => {};
			}

			console.log("mapboxgl init");

			// 创建地图实例
			const newMap = new mapboxgl.Map({
				container: mapContainer.current,
				// style: "mapbox://styles/mapbox/light-v11", // 使用浅色主题
				style: "mapbox://styles/hui5/cmf7zygw7000r01pihwfgcesz",

				// style: "mapbox://styles/mapbox/standard",

				pitch: defaultPitch,

				config: {
					basemap: {},
				},

				language: "zh-Hans", // 简体中文
				center: center,
				zoom: zoom,
				maxZoom: 22,
				hash: true,
				antialias: true,
				// 设置中文字体支持
				localIdeographFontFamily:
					"'Noto Sans CJK SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'WenQuanYi Micro Hei', sans-serif",
			});

			U.init(newMap as any, mapboxgl);

			// 健壮的样式加载检测机制 - 适配 Mapbox Standard 样式
			const handleStyleLoad = () => {
				autoHideRoadLables();
				setStyleReady(true);
			};

			// 多重样式加载检测策略
			newMap.on("style.load", handleStyleLoad);

			// 备用检测：使用 styledata 事件（推荐用于 Standard 样式）
			const handleStyleData = () => {
				if (newMap.isStyleLoaded()) {
					handleStyleLoad();
				}
			};

			// 最终检测：地图完全加载完成
			const handleMapLoad = () => {
				handleStyleLoad();

				// 延迟设置 layersReady，确保所有基础设施都准备就绪
			};

			newMap.on("styledata", handleStyleData);
			newMap.on("load", handleMapLoad);

			// 统一的位置保存函数
			const saveCurrentPosition = () => {
				const center = newMap.getCenter();
				const zoom = newMap.getZoom();

				// 保存到localStorage (注意：存储为 [lat, lng] 格式以保持一致)
				const positionToSave: [number, number] = [center.lat, center.lng];
				localStorageUtil.saveMapPosition(positionToSave, zoom);
			};

			const autoHideRoadLables = () => {
				const zoom = newMap.getZoom();
				if (zoom < 13) {
					newMap.setConfigProperty("basemap", "showRoadLabels", false);
				} else {
					newMap.setConfigProperty("basemap", "showRoadLabels", true);
				}
			};
			// 监听地图移动事件（平移完成）
			newMap.on("moveend", saveCurrentPosition);

			// 监听地图缩放事件（缩放完成）- 更精确的缩放监听
			newMap.on("zoomend", saveCurrentPosition);

			newMap.on("zoomend", autoHideRoadLables);

			addEventListeners(newMap);

			newMap.addControl(new mapboxgl.ScaleControl(), "bottom-left");

			// 添加导航控件（包含3D角度调整）- 放在右下角避免与设置面板冲突
			newMap.addControl(
				new mapboxgl.NavigationControl({
					showCompass: true,
					showZoom: true,
					visualizePitch: true,
				}),
				"bottom-right",
			);

			// addBuildingHighlight(newMap);

			// 立即设置地图实例，让图层组件可以开始初始化（不需要等待样式加载）
			setMapInstance(newMap as UtilsMap);

			// 清理函数
			return () => {
				try {
					// 移除事件监听器
					newMap.off("moveend", saveCurrentPosition);
					newMap.off("zoomend", saveCurrentPosition);
					newMap.off("style.load", handleStyleLoad);
					newMap.off("styledata", handleStyleData);
					newMap.off("load", handleMapLoad);
					newMap.off("zoomend", autoHideRoadLables);
					// 在销毁地图前清除状态引用
					setMapInstance(null);
					setStyleReady(false);
					newMap.remove();
				} catch (error) {
					console.warn("地图清理过程中出现错误:", error);
				}
			};
		} catch (error) {
			console.error("❌ 地图初始化失败:", error);
		}
	}, []);

	return (
		<div className="relative h-full w-full">
			<div ref={mapContainer} className="h-full w-full" />

			<LoadingOverlay styleReady={styleReady} />

			{/* GitHub 链接 */}
			<a
				href="https://github.com/hui5/shanghai-heritage-map.git"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="在 GitHub 查看项目"
				className="absolute right-0 top-0 z-10 inline-flex items-center gap-2 rounded-md bg-white/30 px-4 py-2 text-xs font-medium text-gray-800 shadow backdrop-blur hover:bg-white"
			>
				<Github className="h-4 w-4" />
				<span>GitHub</span>
			</a>

			{/* 确保样式和图层都准备就绪后才渲染自定义组件 */}
			{mapInstance && styleReady && (
				<>
					{/* 悬浮信息面板控制器 */}
					<FloatingInfoController mapInstance={mapInstance} />

					{/* 详细信息模态框 */}
					{selectedLocationInfo && (
						<DetailedInfoModal
							isOpen={detailedInfoModalOpen}
							onClose={() => {
								setDetailedInfoModalOpen(false);
								setSelectedLocationInfo(null);
							}}
							locationInfo={selectedLocationInfo}
						/>
					)}

					<MapContextMenu
						mapInstance={mapInstance}
						containerRef={mapContainer}
					/>

					{/* 历史背景图层 */}
					<HistoricalLayers
						mapInstance={mapInstance}
						configName="historical-context"
					/>
					{/* 建筑聚合图层 */}
					<BuildingClusterLayers mapInstance={mapInstance} />
					{/* Wikimedia 照片点层（独立功能） */}
					<WikimapLayer mapInstance={mapInstance} />
					{/* 搜索功能 */}
					{/* <MapSearch
            onResultSelect={handleResultSelect}
            onHighlightMultipleResults={highlightMultipleResults}
            isSearchActive={isSearchActive}
            searchData={searchData}
          /> */}
					<div className="absolute bottom-4 left-4 z-10 space-y-2">
						{/* 3D切换控件 */}
						{/* <Map3DToggle
              mapMode={mapMode}
              onToggle={handleMapModeToggle}
              on3DAngleToggle={handle3DAngleToggle}
              currentPitch={currentPitch}
            /> */}
					</div>
					<MapConsole mapInstance={mapInstance} />
				</>
			)}
		</div>
	);
}
