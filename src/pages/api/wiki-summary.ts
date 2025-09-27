import { fetchWikipediaSummary } from "@/helper/api/browserWiki";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { wikipedia } = req.query as { wikipedia: string };

  const response = await fetchWikipediaSummary(wikipedia);

  res.status(200).send(response);
}
