import type { NextApiRequest, NextApiResponse } from "next";

// Simple proxy to bypass CORS for wikimap.toolforge.org
// Usage: /api/wikimap?lat=..&lon=..&dist=100&commons&lang=zh

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const {
    lat,
    lon,
    dist = 100,
    lang = "zh",
  } = req.query as Record<string, string>;
  if (!lat || !lon) {
    res.status(400).json({ error: "Missing lat/lon" });
    return;
  }

  const base = "https://wikimap.toolforge.org/api.php";
  const url = `${base}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(
    lon,
  )}&dist=${encodeURIComponent(String(dist))}&commons&lang=${encodeURIComponent(
    String(lang),
  )}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "openda-shanghai-map/1.0 (CORS proxy)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      res
        .status(upstream.status)
        .json({ error: `Upstream HTTP ${upstream.status}` });
      return;
    }

    const data = await upstream.json();

    // Set cache headers to reduce repeated calls in dev
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json(data);
  } catch (e: any) {
    const message =
      e?.name === "AbortError"
        ? "Upstream timeout"
        : e?.message || "Proxy error";
    res.status(502).json({ error: message });
  }
}
