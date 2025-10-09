import type { NextApiRequest, NextApiResponse } from "next";
import {
  getPhotosByIds,
  searchPhotosByName,
  type VirtualShanghaiPhotoZh,
} from "@/helper/api/virtualShanghaiPhotosApi";
import type { LocationInfo } from "@/helper/map-data/LocationInfo";
import { normalizeQueryName } from "@/helper/normalizeQueryName";

export interface VirtualShanghaiPhotosResponse {
  photos: VirtualShanghaiPhotoZh[] | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VirtualShanghaiPhotosResponse | { error: string }>,
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

    let photos: VirtualShanghaiPhotoZh[] | null = null;
    if (
      locationInfo.dataSource === "Virtual Shanghai" &&
      locationInfo.images?.length
    ) {
      photos = await getPhotosByIds(locationInfo.images);
    } else {
      photos = await searchPhotosByName(normalizedName, 20);
    }
    return res.status(200).json({ photos });
  } catch (_e) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
