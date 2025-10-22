"use client";

import { Check, Copy, Share2, Twitter } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

interface ShareButtonProps {
  url?: string;
  title?: string;
  description?: string;
  className?: string;
  variant?: "default" | "panel";
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  url = typeof window !== "undefined" ? window.location.href : "",
  title = "上海历史建筑地图",
  description = "探索上海的历史建筑与文化遗产",
  className = "",
  variant = "default",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  }, [url]);

  const handleXShare = useCallback(() => {
    const text = `${title} - ${description}`;
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  }, [title, description, url]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        setIsOpen(false);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    }
  }, [title, description, url]);

  return (
    <div className={`relative ${className}`}>
      {/* 主分享按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          variant === "panel"
            ? "p-1.5 rounded text-xs bg-white/30 border border-gray-300 text-gray-700 hover:bg-gray-100"
            : "group relative inline-flex items-center justify-center p-2 bg-white/90 hover:bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 hover:scale-110"
        }
        title="分享"
        aria-label="分享"
      >
        <Share2
          className={
            variant === "panel"
              ? "w-4 h-4"
              : "w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors"
          }
        />
      </button>

      {/* 分享选项下拉菜单 */}
      {isOpen && (
        <div className="absolute top-12 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50 share-button-tooltip">
          <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
            分享到
          </div>

          {/* X (Twitter) 分享 */}
          <button
            type="button"
            onClick={handleXShare}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Twitter className="w-4 h-4 text-blue-500" />
            <span>X (Twitter)</span>
          </button>

          {/* 原生分享 (移动端) */}
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-4 h-4 text-green-500" />
              <span>更多选项</span>
            </button>
          )}

          {/* 复制链接 */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-600">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-500" />
                <span>复制链接</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 点击外部关闭菜单 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default ShareButton;
