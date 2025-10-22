"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ModalLayoutProps {
  children: React.ReactNode;
  title: string;
  icon: React.ReactNode;
  maxWidth?: string;
  headerBg?: string;
  closeAriaLabel?: string;
}

export default function ModalLayout({
  children,
  title,
  icon,
  maxWidth = "max-w-4xl",
  headerBg = "from-blue-50 to-indigo-50",
  closeAriaLabel = "关闭",
}: ModalLayoutProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);

  // 组件挂载时重置关闭状态
  useEffect(() => {
    setIsClosing(false);
  }, []);

  const handleClose = useCallback(() => {
    // 立即设置关闭状态，提供即时反馈
    setIsClosing(true);

    // 延迟导航，让动画完成
    setTimeout(() => {
      router.push("/");
    }, 150); // 150ms 动画时长
  }, [router]);

  // 添加全局键盘事件监听器
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    // 添加事件监听器
    document.addEventListener("keydown", handleKeyDown);

    // 清理函数
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  return (
    <>
      {/* 遮罩层 */}
      <button
        type="button"
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] border-0 cursor-default transition-opacity duration-150 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
        aria-label={closeAriaLabel}
      />

      {/* 弹窗内容 */}
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] w-[100vw] ${maxWidth} max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-150 ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* 头部 */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r ${headerBg}`}
        >
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="关闭"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
}
