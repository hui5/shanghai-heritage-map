import { createOpenAI } from "@ai-sdk/openai";
import { Redis } from "@upstash/redis";
import { streamText } from "ai";

// Initialize Redis
const redis = new Redis({
  url: "https://bright-mammal-7064.upstash.io",
  token: "ARuYAAImcDEwODYzZWU1MTQzMzU0NTFjYTYyOGQ3OTliYmIxNDMyY3AxNzA2NA",
});
// Edge Runtime配置 - 支持Response对象
export const config = {
  runtime: "edge",
};

interface GPTInfoRequest {
  name?: string;
  address?: string;
  coordinates?: [number, number];
  properties?: any;
}

interface CachedResponse {
  content: string;
  timestamp: number;
}

// 配置自定义OpenAI提供者
const openai = createOpenAI({
  apiKey: process.env.ZETA_API_KEY,
  baseURL: "https://api.zetatechs.com/v1",
});

// 缓存配置
const CACHE_TTL = 24 * 60 * 60 * 30; // 30天 (秒)
const CACHE_PREFIX = "gpt_search:";

// 生成缓存键
async function generateCacheKey(requestData: GPTInfoRequest): Promise<string> {
  const normalized = {
    name: requestData.name?.trim().toLowerCase(),
    address: requestData.address?.trim().toLowerCase(),
    properties: requestData.properties,
  };

  const content = JSON.stringify(normalized, Object.keys(normalized).sort());

  // 使用Web Crypto API生成哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16); // 取前16位

  return `${CACHE_PREFIX}${
    requestData.name
      ? requestData.name.replace(/[^a-zA-Z0-9]/g, "_")
      : "unknown"
  }_${hash}`;
}

// 从缓存获取响应
async function getCachedResponse(cacheKey: string): Promise<string | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (!cached) return null;

    // 尝试解析缓存数据
    let parsedCache: CachedResponse;
    try {
      parsedCache =
        typeof cached === "string"
          ? JSON.parse(cached)
          : (cached as CachedResponse);
    } catch (parseError) {
      console.error("Cache parse error:", parseError);
      await redis.del(cacheKey); // 删除损坏的缓存
      return null;
    }

    // 检查缓存是否过期
    const now = Date.now();
    if (now - parsedCache.timestamp > CACHE_TTL * 1000) {
      await redis.del(cacheKey);
      return null;
    }

    return parsedCache.content;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

// 缓存响应
async function setCachedResponse(
  cacheKey: string,
  content: string,
): Promise<void> {
  try {
    const cached: CachedResponse = {
      content,
      timestamp: Date.now(),
    };
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(cached));
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();

    const { prompt, ...requestData }: { prompt: string } & GPTInfoRequest =
      body;

    console.log("🔍 gpt search: " + requestData.name);

    // 生成缓存键
    const cacheKey = await generateCacheKey(requestData);

    // 检查缓存
    const cachedContent = await getCachedResponse(cacheKey);
    if (cachedContent) {
      console.log(
        "📦 Cache hit for:",
        requestData.name,
        "| Key:",
        cacheKey.slice(-8),
      );
      return new Response(cachedContent, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Cache": "HIT",
          "X-Cache-Key": cacheKey.slice(-8), // 只显示缓存键的最后8位用于调试
        },
      });
    }

    console.log("🔄 Cache miss, calling GPT for:", requestData.name);

    // 构建查询上下文
    const context = buildContextString(requestData);

    const result = streamText({
      model: openai("gpt-5-chat-latest"),
      system:
        "你是一个专业的上海历史文化专家，对上海的建筑、历史、文化有深入了解。目的是以地点为纽带，关联出建筑，人物， 时代 ，事件， 故事， 不求面面俱到，但求有趣的知识，生动的细节，以小见大的能力。你的回答应该准确、详细、有趣,少用套话和无意义的说教。请严格按照用户要求的格式回答，使用markdown格式。",
      prompt: context,
      maxOutputTokens: 2000,
      temperature: 0.2,
    });

    // 创建一个可读流来处理流式响应并缓存完整内容
    const stream = result.toUIMessageStreamResponse();

    // 对于流式响应，我们需要收集完整内容来缓存
    return new Response(
      new ReadableStream({
        async start(controller) {
          const reader = stream.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          let fullContent = "";
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                // 流结束，缓存完整内容
                if (fullContent.trim()) {
                  await setCachedResponse(cacheKey, fullContent);
                  console.log(
                    "💾 Cached response for:",
                    requestData.name,
                    "| Key:",
                    cacheKey.slice(-8),
                  );
                }
                controller.close();
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              fullContent += chunk;
              controller.enqueue(value);
            }
          } catch (error) {
            console.error("Stream processing error:", error);
            controller.error(error);
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Cache": "MISS",
          "X-Cache-Key": cacheKey.slice(-8),
        },
      },
    );
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

function buildContextString({
  name,
  address,
  coordinates,
  properties,
}: GPTInfoRequest): string {
  let context = "请为以下上海的地点提供详细的历史文化信息：\n\n";

  if (name) {
    context += `名称: ${name}\n`;
  }

  if (address) {
    context += `地址: ${address}\n`;
  }

  if (properties) {
    context += `其它: ${JSON.stringify(properties)}`;
  }

  context += `

以上面提供的信息为基础，结合上海的历史文化背景，用markdown格式提供更详细的建筑历史介绍。

要求：
1. 使用中文回答
2. 充分利用提供的所有数据信息，同时查询可能的相关资料
3. 以知识介绍为主，不要讲意义，文字要精炼
4. 给出历史沿革，相关人物事件
5. 内容要丰富具体，结构清晰
6. 使用markdown语法，包括标题、段落、列表等格式
7. 如果某些信息不确定或资料不足，不要推测
8. 对建筑本身的介绍要简洁， 侧重于建筑相关的人和事
9. 避免输出图片地址
10.结尾避免给出任何建议、询问
`;

  return context;
}
