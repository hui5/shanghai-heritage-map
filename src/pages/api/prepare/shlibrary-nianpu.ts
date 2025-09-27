import type { NextApiRequest, NextApiResponse } from "next";
import { LocationInfo } from "@/helper/map-data/LocationInfo";
import { normalizeQueryName } from "@/helper/normalizeQueryName";
import {
  searchSHLibraryNianpu,
  NianpuSearchResponse,
  NianpuEventItem,
} from "@/helper/api/shLibraryNianpuApi";

export interface ShLibraryNianpuResponse {
  items: NianpuEventItem[] | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShLibraryNianpuResponse | { error: string }>
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
    try {
      const npr: NianpuSearchResponse = await searchSHLibraryNianpu({
        freetext: normalizedName,
        pageSize: 10,
      });
      return res.status(200).json({ items: npr?.datas ?? null });
    } catch {
      return res.status(200).json({ items: null });
    }
  } catch (e) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
