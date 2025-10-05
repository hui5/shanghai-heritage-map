import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWikipediaSummary } from "@/helper/api/browserWiki";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const { wikipedia } = req.query as { wikipedia: string };

	const response = await fetchWikipediaSummary(wikipedia);

	res.status(200).send(response);
}
