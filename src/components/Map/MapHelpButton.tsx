import { HelpCircle } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface MapHelpButtonProps {
  className?: string;
}

export const MapHelpButton: React.FC<MapHelpButtonProps> = ({
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // 加载 README.md 内容
  useEffect(() => {
    if (isOpen && !readmeContent) {
      setIsLoading(true);

      // 使用 API 路由读取并处理 README.md
      fetch("/api/readme")
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setReadmeContent(data.content);
          } else {
            throw new Error(data.error);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Failed to load README:", error);
          // 降级到内嵌内容
          setIsLoading(false);
        });
    }
  }, [isOpen, readmeContent]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* 帮助按钮 */}
      <button
        type="button"
        onClick={handleOpen}
        className={`fixed top-28 right-3 z-[1000] p-2 bg-white/90 hover:bg-white rounded-full shadow-lg border border-gray-200 transition-all duration-200 hover:scale-110 ${className}`}
        title="查看帮助"
        aria-label="查看帮助"
      >
        <HelpCircle size={20} className="text-gray-600" />
      </button>

      {/* 帮助弹窗 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <button
            type="button"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] border-0 cursor-default"
            onClick={handleClose}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                handleClose();
              }
            }}
            aria-label="关闭帮助"
          />

          {/* 弹窗内容 */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] w-[90vw] max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <HelpCircle size={24} className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">使用帮助</h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="关闭"
                aria-label="关闭"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    <span>加载帮助文档中...</span>
                  </div>
                </div>
              ) : (
                <div
                  className="prose prose-gray max-w-none"
                  /* biome-ignore lint/security/noDangerouslySetInnerHtml: README content is sanitized by remark */
                  dangerouslySetInnerHTML={{ __html: readmeContent }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default MapHelpButton;
