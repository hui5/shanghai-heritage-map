import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 读取项目根目录的 README.md 文件
    const readmePath = join(process.cwd(), "README.md");
    const readmeContent = readFileSync(readmePath, "utf8");

    // 使用 remark 处理 Markdown
    const processedContent = await remark()
      .use(remarkGfm) // GitHub Flavored Markdown 支持
      .use(remarkHtml, { sanitize: false }) // 转换为 HTML
      .process(readmeContent);

    // 处理图片路径和属性，以及链接属性
    const htmlContent = processedContent
      .toString()
      // 处理双引号的图片路径
      .replace(/src="public\/doc\//g, 'src="/doc/')
      // 处理单引号的图片路径
      .replace(/src='public\/doc\//g, "src='/doc/")
      // 为没有 alt 属性的 img 标签添加 alt 属性
      .replace(
        /<img([^>]*?)(?:\s+alt\s*=\s*["'][^"']*["'])?([^>]*?)>/gi,
        (match, before, after) => {
          // 如果已经有 alt 属性，直接返回
          if (match.includes("alt=")) {
            return match;
          }
          // 如果没有 alt 属性，添加默认的 alt
          return `<img${before} alt="截图"${after}>`;
        },
      )
      // 为所有外部链接添加 target="_blank" 和 rel="noopener noreferrer"
      .replace(
        /<a\s+([^>]*?)href\s*=\s*["']([^"']*?)["']([^>]*?)>/gi,
        (match, before, href, after) => {
          // 检查是否是外部链接（不是以 # 开头的锚点链接）
          if (href.startsWith("#") || href.startsWith("/")) {
            return match; // 内部链接保持不变
          }

          // 检查是否已经有 target 属性
          if (match.includes("target=")) {
            return match; // 已有 target 属性，保持不变
          }

          // 添加 target="_blank" 和 rel="noopener noreferrer"
          return `<a ${before}href="${href}"${after} target="_blank" rel="noopener noreferrer">`;
        },
      );

    res.status(200).json({
      content: htmlContent,
      success: true,
    });
  } catch (error) {
    console.error("Error reading README.md:", error);
    res.status(500).json({
      error: "Failed to read README.md",
      success: false,
    });
  }
}
