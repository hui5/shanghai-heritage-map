import { readFileSync } from "node:fs";
import { join } from "node:path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import ModalLayout from "@/app/ModalLayout";

// 构建时生成静态内容
export const revalidate = false; // 静态生成，永不重新验证

async function getReadmeContent() {
  const readmePath = join(process.cwd(), "README.md");
  const readmeContent = readFileSync(readmePath, "utf8");

  const processedContent = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(readmeContent);

  return processedContent
    .toString()
    .replace(/src="public\/doc\//g, 'src="/doc/')
    .replace(/src='public\/doc\//g, "src='/doc/")
    .replace(
      /<img([^>]*?)(?:\s+alt\s*=\s*["'][^"']*["'])?([^>]*?)>/gi,
      (match, before, after) => {
        if (match.includes("alt=")) return match;
        return `<img${before} alt="截图"${after}>`;
      },
    )
    .replace(
      /<a\s+([^>]*?)href\s*=\s*["']([^"']*?)["']([^>]*?)>/gi,
      (match, before, href, after) => {
        if (href.startsWith("#") || href.startsWith("/")) return match;
        if (match.includes("target=")) return match;
        return `<a ${before}href="${href}"${after} target="_blank" rel="noopener noreferrer">`;
      },
    );
}

export default async function HelpPage() {
  const content = await getReadmeContent();

  const helpIcon = (
    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
      <span className="text-white text-sm font-bold">?</span>
    </div>
  );

  return (
    <ModalLayout
      title="使用帮助"
      icon={helpIcon}
      maxWidth="max-w-4xl"
      headerBg="from-blue-50 to-indigo-50"
      closeAriaLabel="关闭帮助"
    >
      <div
        className="prose prose-gray max-w-none"
        /* biome-ignore lint/security/noDangerouslySetInnerHtml: README content is sanitized by remark */
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </ModalLayout>
  );
}
