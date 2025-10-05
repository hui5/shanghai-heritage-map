import type { NextApiRequest, NextApiResponse } from "next";
import { fetchJSON } from "@/helper/fetchJSON";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		if (req.method !== "GET") {
			res.setHeader("Allow", "GET");
			return res.status(405).end("Method Not Allowed");
		}

		const title = (req.query.title as string) || "";

		const targetUrl = `https://zh.m.wikipedia.org/wiki/${encodeURIComponent(
			title,
		)}?action=render`;

		const html = await fetchHtml(targetUrl);

		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.setHeader(
			"Cache-Control",
			"s-maxage=600, stale-while-revalidate=86400",
		);
		return res.status(200).send(html);
	} catch (err) {
		console.log(err);
		return res.status(500).end("Internal error");
	}
}

const fetchHtml = async (url: string): Promise<string> => {
	const res = await fetchJSON(
		url,
		{
			headers: {
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
			},
			redirect: "follow",
		},
		true,
	);
	return res;
};
