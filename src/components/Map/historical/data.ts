import _, { cloneDeep, delay, difference, values } from "lodash";
import type { UtilsMap } from "map-gl-utils";
import { proxy, ref } from "valtio";
import historicalConfig from "@/components/Map/historical/config.json";
import type {
	DataCategory,
	DataSubtype,
	UnifiedConfig,
} from "@/components/Map/historical/types";
import { convertGeoJSONCoordinates } from "@/utils/coordinateConverter";

const dataType = "historical-context";

export const config = historicalConfig as UnifiedConfig;

export interface SubtypeData {
	id: string;
	subtype: DataSubtype;
	category: DataCategory;
	data: GeoJSON.FeatureCollection | null;
	sourceId: string;
	layers: string[];
	visible: boolean;
}

export const state = proxy({
	loading: {
		processing: [] as string[],
		completed: [] as string[],
		failed: [] as string[],
	},
	subtypeDatas: [] as SubtypeData[],
});

console.log("historical data: ");
config.categories.forEach((category) => {
	category.subtypes.forEach((subtype) => {
		const subtypeData: SubtypeData = {
			id: subtype.id,
			subtype,
			category,
			data: null,
			sourceId: `openda_${dataType}-${subtype.id}-source`,
			layers: [],
			visible: category.enabled && subtype.enabled,
		};

		state.subtypeDatas = [subtypeData, ...state.subtypeDatas];
	});
});

_(state.subtypeDatas)
	.groupBy((subtypeData) => subtypeData.subtype.dataFile)
	.forEach((group, dataFile: string) => {
		state.loading.processing.push(dataFile);
		fetch(`/data/645_release/${dataFile}`)
			.then((res) => res.json())
			.then((data) => {
				const convertedData = convertGeoJSONCoordinates(
					data,
					group[0].subtype.coordinateSystem,
					"wgs84",
				);

				group.forEach((subtypeData) => {
					const { subtype, sourceId } = subtypeData;

					const data = cloneDeep(convertedData);

					data.features = data.features.filter(({ geometry, properties }) => {
						const filter = subtype.filter;
						const geometryType = subtype.geometryType;
						if (
							filter &&
							!filter!.values.includes(properties?.[filter!.property])
						) {
							return false;
						}
						if (geometryType && geometry?.type !== geometryType) {
							return false;
						}
						return true;
					});
					subtypeData.data = ref(data);
				});

				state.loading.completed = [...state.loading.completed, dataFile];
			})
			.catch(() => {
				state.loading.failed = [...state.loading.failed, dataFile];
			})
			.finally(() => {
				state.loading.processing = difference(state.loading.processing, [
					dataFile,
				]);
			});
	});

export const toggleSubtypeVisible = ({
	visible,
	subtypeId,
	categoryId,
	mapInstance,
}: {
	visible: boolean;
	subtypeId?: string;
	categoryId?: string;
	mapInstance: UtilsMap;
}) => {
	const toggle = (subtypeData: SubtypeData) => {
		subtypeData.visible = visible;
		mapInstance.U.toggle(values(subtypeData.layers), visible);
	};

	_(state.subtypeDatas)
		.filter(({ category, subtype }) =>
			categoryId
				? category.id === categoryId
				: subtypeId
					? subtype.id === subtypeId
					: true,
		)
		.forEach(toggle);
};

export const getInteractionLayerIds = () => {
	const ids: string[] = [];

	state.subtypeDatas.forEach(({ category, subtype, layers }) => {
		if (category.enabled) {
			// 处理点图层、Polygon图层和文本标签图层
			if (subtype.geometryType === "Point" || subtype.id.includes("osm_")) {
				const layer = layers.find((layer) => layer.endsWith("-layer"));
				layer && ids.push(layer);
			}
			// 添加标签图层
			if ((subtype as any).labels?.enabled) {
				const layer = layers.find((layer) => layer.endsWith("-labels"));
				layer && ids.push(layer);
			}
		}
	});

	return ids;
};

export const getSubtypeIdFromLayerId = (layerId: string) => {
	return layerId
		.replace(`openda_${dataType}-`, "")
		.replace("-layer", "")
		.replace("-labels", "")
		.replace("-outline", "");
};
