import * as OpenCC from "opencc-js";
import rawJson from "@/data/laozaoshanghai_images.json";

const converterTW = OpenCC.Converter({ from: "cn", to: "tw" });

// Cast once for typed access
const photos: LaozaoItem[] = rawJson as LaozaoItem[];

export interface LaozaoMediaItem {
	type: string; // e.g., "photo"
	url: string;
	fileName?: string;
	previewUrl?: string;
}

export interface LaozaoItem {
	id: string;
	contentType?: string | null;
	text: string;
	source?: string;
	mediaItems?: LaozaoMediaItem[];
	tags?: string[];
	dateCreated?: string;
	defaultImageUrl?: string;
}

export interface LaozaoSearchResponse {
	total: number;
	data: LaozaoItem[];
}

export async function searchLaozaoPhotos(
	keyword: string,
	pageIndex: number = 0,
	pageSize: number = 30,
): Promise<LaozaoSearchResponse> {
	const traditionalKeyword = converterTW(keyword);
	const data = photos
		.filter(
			(photo) =>
				photo.text.includes(keyword) || photo.text.includes(traditionalKeyword),
		)
		.slice(pageIndex, pageIndex + pageSize);
	const total = data.length;

	return { total, data };
}
