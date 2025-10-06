const __jsonCache = new Map<string, any>();
const __inflight = new Map<string, Promise<any>>();
let __devProxyAgent: any | null = null;

const stableStringify = (value: any): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as any)[k])}`)
    .join(",")}}`;
};

export const fetchJSON = async (
  url: string,
  init?: RequestInit,
  isText: boolean = false,
): Promise<any> => {
  const method = (init?.method || "GET").toUpperCase();
  const rawBody: any = init?.body as any;
  const isPlainObjectBody =
    rawBody != null &&
    Object.prototype.toString.call(rawBody) === "[object Object]";

  const cacheable =
    method === "GET" || (method === "POST" && isPlainObjectBody);
  const cacheKey = cacheable
    ? method === "GET"
      ? `GET ${url}`
      : `POST ${url} ${stableStringify(rawBody)}`
    : "";

  if (cacheable) {
    if (__jsonCache.has(cacheKey)) return __jsonCache.get(cacheKey);
    const existing = __inflight.get(cacheKey);
    if (existing) return existing;
  }

  const p = (async () => {
    let headers = init?.headers || {};
    let body: any = rawBody;

    if (isPlainObjectBody) {
      headers = { "Content-Type": "application/json", ...(headers as any) };
      body = JSON.stringify(body);
    }

    let dispatcher: any | undefined;
    const isServer = typeof window === "undefined";
    const isDev = process.env.NODE_ENV !== "production";
    const proxyUrl =
      process.env.DEV_HTTP_PROXY ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY;
    const isAbsoluteHttp = /^https?:\/\//i.test(url);
    const isLocal =
      /^(https?:\/\/)?(localhost|127\.0\.0\.1|::1|0\.0\.0\.0|.*\.local)(?::\d+)?/i.test(
        url,
      );
    if (isServer && isDev && proxyUrl && isAbsoluteHttp && !isLocal) {
      if (!__devProxyAgent) {
        try {
          // biome-ignore lint/security/noGlobalEval: <explanation>
          const undici = await (0, eval)("import('undici')");
          __devProxyAgent = new (undici as any).ProxyAgent(proxyUrl);
        } catch {
          console.error("Failed to import undici");
          // ignore if undici is unavailable; proceed without proxy
        }
      }
      if (__devProxyAgent) dispatcher = __devProxyAgent;
    }

    const res = await fetch(url, {
      credentials: "omit",
      ...init,
      method,
      headers,
      body,
      ...(dispatcher ? { dispatcher } : {}),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = isText ? await res.text() : await res.json();
    if (cacheable) {
      __jsonCache.set(cacheKey, data);
      __inflight.delete(cacheKey);
    }
    return data;
  })();

  if (cacheable) {
    __inflight.set(cacheKey, p);
  }

  return p;
};
