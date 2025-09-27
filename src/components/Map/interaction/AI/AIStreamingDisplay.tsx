import React, { useState, useEffect } from "react";
import { useCompletion } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

interface AIStreamingDisplayProps {
  requestData: {
    name?: string;
    address?: string;
    coordinates?: [number, number];
    properties?: any;
  };
  isOpen: boolean;
  onComplete?: () => void;
}

export const AIStreamingDisplay: React.FC<AIStreamingDisplayProps> = ({
  requestData,
  isOpen,
  onComplete,
}) => {
  const hasRequestedRef = React.useRef(false);

  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/gpt-search",
    onFinish: () => {
      onComplete?.();
    },
    onError: (err: Error) => {},
  });

  // 当打开模态框时自动开始请求
  React.useEffect(() => {
    if (isOpen && requestData && !hasRequestedRef.current) {
      hasRequestedRef.current = true;

      const bodyData = {
        prompt: "", // useCompletion需要prompt字段
        ...requestData,
      };

      complete("", {
        body: bodyData,
      });
    }
  }, [isOpen, requestData]); // 使用ref来防止重复请求

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          获取信息失败
        </h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={() => {
            hasRequestedRef.current = false;
            complete("", {
              body: {
                prompt: "",
                ...requestData,
              },
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (isLoading && !completion) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在连接 AI 服务...</p>
          <p className="text-sm text-gray-500 mt-2"></p>
          <div className="mt-4 text-xs text-gray-400">
            <p>✨ 内容将实时显示，无需等待</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 流式内容显示区域 - 占满剩余空间 */}
      <div className="flex-1 overflow-y-auto">
        {completion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700"
          >
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className="text-xl font-semibold text-gray-800 mb-3 mt-6"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className="text-lg font-medium text-gray-800 mb-2 mt-4"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    className="mb-4 text-gray-700 leading-relaxed"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className="mb-4 space-y-2 list-disc list-inside"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li className="text-gray-700" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-gray-900" {...props} />
                ),
                em: ({ node, ...props }) => (
                  <em className="italic text-gray-800" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-blue-400 pl-4 py-2 mb-4 bg-blue-50 rounded-r-lg"
                    {...props}
                  />
                ),
              }}
            >
              {completion}
            </ReactMarkdown>

            {/* 实时打字光标 - 仅在生成中显示 */}
            <AnimatePresence>
              {isLoading && (
                <motion.span
                  initial={{ opacity: 1 }}
                  animate={{ opacity: [1, 0, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-block w-0.5 h-4 bg-blue-500 ml-1"
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* 底部状态区域 */}
      <div className="flex-shrink-0">
        {/* 流式状态指示器 - 移到底部 */}
        <AnimatePresence>
          {isLoading && completion && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3 bg-gradient-to-r from-blue-50 to-transparent border-l-4 border-blue-400 rounded-r-lg mb-4"
            >
              <div className="flex items-center text-sm text-blue-700">
                <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                <span>AI正在生成内容...</span>
                <div className="ml-2 flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 bg-blue-400 rounded-full"
                      animate={{
                        y: [0, -4, 0],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 免责声明 - 完成后显示 */}
        <AnimatePresence>
          {completion && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-gray-50 rounded-lg p-4 text-center"
            >
              <p className="text-xs text-gray-500">
                ⚠️ 以上信息由AI生成，仅供参考。具体信息请以官方资料为准。
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
