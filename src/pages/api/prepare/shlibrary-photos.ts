import type { NextApiRequest, NextApiResponse } from "next";
import {
  type SHLPhotoItem,
  searchSHLibraryPhotos,
} from "@/helper/api/shLibraryPhotosApi";
import type { LocationInfo } from "@/helper/map-data/LocationInfo";
import { normalizeQueryName } from "@/helper/normalizeQueryName";

export interface ShLibraryPhotosResponse {
  photos: SHLPhotoItem[] | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShLibraryPhotosResponse | { error: string }>,
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
    const photos = await searchSHLibraryPhotos({
      freetext: normalizedName,
      pageSize: 200,
    }).then((r) => r.datas ?? null);
    return res.status(200).json({ photos });
  } catch (_e) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
