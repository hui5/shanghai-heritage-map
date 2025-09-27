import type { NextApiRequest, NextApiResponse } from "next";
import { LocationInfo } from "@/helper/map-data/LocationInfo";
import { normalizeQueryName } from "@/helper/normalizeQueryName";
import {
  searchLaozaoPhotos,
  LaozaoItem,
} from "@/helper/api/laozaoShanghaiPhotosApi_local";

export interface LaozaoPhotosResponse {
  items: LaozaoItem[] | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LaozaoPhotosResponse | { error: string }>
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
    const resp = await searchLaozaoPhotos(normalizedName, 0, 200);
    return res.status(200).json({ items: resp?.data ?? null });
  } catch (e) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
