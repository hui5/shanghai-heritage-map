import type { NextApiRequest, NextApiResponse } from "next";
import {
	convertWikiIds,
	fetchWikicommonsImages,
	resolveWikipediaAndCommonsForLocation,
	type WikicommonsPreviewData,
} from "@/helper/api/browserWiki";
import type { LocationInfo } from "@/helper/map-data/LocationInfo";
import { normalizeQueryName } from "@/helper/normalizeQueryName";

export interface WikiPreparedResponse {
	wikipediaSpec?: string | null;
	wikidataId?: string | null;
	commonsCategory?: string | null;
	commonsData?: WikicommonsPreviewData | null;
	hasShanghaiConstraint?: boolean;
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<WikiPreparedResponse | { error: string }>,
) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const locationInfo: LocationInfo = req.body;
		if (!locationInfo || !locationInfo.name) {
			return res.status(400).json({ error: "Invalid location info" });
		}

		const normalizedName = await normalizeQueryName(locationInfo.name);

		let wikipediaSpec: string | null | undefined = locationInfo.wikipedia;
		let wikidataId: string | null | undefined = locationInfo.wikidata;
		let commonsCategory: string | null | undefined = locationInfo.wikicommons;
		let commonsData: WikicommonsPreviewData | null | undefined = null;
		let hasShanghaiConstraint: boolean | undefined = true;

		if (!wikipediaSpec && !wikidataId) {
			try {
				const resolved = await resolveWikipediaAndCommonsForLocation(
					normalizedName,
					locationInfo,
				);
				if (resolved) {
					wikipediaSpec = resolved.wikipedia || wikipediaSpec;
					wikidataId = resolved.wikidata || wikidataId;
					commonsCategory = resolved.commons || commonsCategory;
					hasShanghaiConstraint = resolved.hasShanghaiConstraint;
				}
			} catch {}
		} else {
			try {
				const resolved = await convertWikiIds(
					wikipediaSpec,
					wikidataId,
					commonsCategory,
				);
				if (resolved) {
					wikipediaSpec = resolved.wikipediaSpec || wikipediaSpec;
					wikidataId = resolved.wikidataId || wikidataId;
					commonsCategory = resolved.commonsCategory || commonsCategory;
				}
			} catch {}
		}

		if (commonsCategory) {
			try {
				commonsData = await fetchWikicommonsImages(commonsCategory);
			} catch {
				commonsData = null;
			}
		}

		return res.status(200).json({
			wikipediaSpec: wikipediaSpec ?? null,
			wikidataId: wikidataId ?? null,
			commonsCategory: commonsCategory ?? null,
			commonsData: commonsData ?? null,
			hasShanghaiConstraint: hasShanghaiConstraint ?? true,
		});
	} catch (e) {
		return res.status(500).json({ error: "Internal Server Error" });
	}
}
