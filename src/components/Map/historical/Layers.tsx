import type { UtilsMap } from "map-gl-utils";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { generateHistoricalLayerConfig } from "@/components/Map/historical/convertConfig";
import { addInteraction } from "../interaction/addInteraction";
import { state } from "./data";

export const HistoricalLayers = ({
	mapInstance,
	configName,
}: {
	mapInstance: UtilsMap;
	configName: string;
}) => {
	const snapshot = useSnapshot(state);
	// 只在数据真正发生变化时创建图层
	useEffect(() => {
		try {
			console.log("historical layers: ");
			const interactionIds: string[] = [];

			state.subtypeDatas.forEach((subtypeData) => {
				const { id, subtype, sourceId, layers, data } = subtypeData;

				subtypeData.layers = [];

				mapInstance.U.removeSource(sourceId);

				mapInstance.addSource(sourceId, {
					type: "geojson",
					data: { type: "FeatureCollection", features: [] },
					generateId: true,
				});

				// 使用配置化的图层创建
				const layerConfigs = generateHistoricalLayerConfig(
					subtype,
					sourceId,
					configName,
					true,
				);

				// 添加所有生成的图层配置
				layerConfigs.forEach((layerConfig) => {
					layerConfig.layout.visibility = subtypeData.visible
						? "visible"
						: "none";
					const layerId = layerConfig.id;
					mapInstance.addLayer(layerConfig);
					subtypeData.layers.push(layerId);

					if (layerConfig.type === "symbol") {
						const [mouseenterId, mouseleaveId, clickId] = addInteraction(
							mapInstance,
							layerId,
						);
						interactionIds.push(mouseenterId, mouseleaveId, clickId);
					}
				});
			});

			return () => {
				try {
					interactionIds.forEach((id) => {
						mapInstance.removeInteraction(id);
					});
				} catch {}
			};
		} catch (error) {
			console.error("historical layers error: ", error);
		}
	}, [mapInstance, configName]);

	useEffect(() => {
		if (!snapshot.loading.completed) return; // 条件守卫

		// 热加载恢复机制：检测到地图实例存在但状态未准备时，强制重新检查  回填数据
		try {
			state.subtypeDatas.forEach((subtypeData) => {
				if (subtypeData.data) {
					mapInstance.U.setData(subtypeData.sourceId, subtypeData.data as any);
				}
			});
		} catch (error) {
			console.error("historical layers set data error: ", error);
		}
	}, [mapInstance, snapshot.loading.completed]);

	return null;
};

export default HistoricalLayers;
