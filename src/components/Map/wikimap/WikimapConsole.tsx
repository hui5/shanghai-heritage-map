import { Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { useWikimapStore } from "@/components/Map/wikimap/wikimapStore";

interface WikimapConsoleProps {
  title?: string;
  icon?: string;
}

export function WikimapConsole({
  title = "维基地图",
  icon = "🗺️",
}: WikimapConsoleProps) {
  const { items, isEnabled, setEnabled, clearCache, getFetchStats } =
    useWikimapStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const stats = getFetchStats();

  const handleClearCache = () => {
    if (showConfirm) {
      clearCache();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      // 3秒后自动取消确认状态
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <div className="border-2 border-gray-200 rounded-lg bg-white shadow-sm">
      <div
        className={`bg-gradient-to-r border-b-2 p-3 ${
          isEnabled
            ? "from-blue-50 to-indigo-50 border-blue-200"
            : "from-gray-50 to-slate-50 border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">{icon}</span>
            <span
              className={`font-semibold ${isEnabled ? "text-gray-800" : "text-gray-500"}`}
            >
              {title}
            </span>
            {!isEnabled && (
              <span className="text-xs text-gray-400">(已禁用)</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-sm font-medium ${isEnabled ? "text-blue-600" : "text-gray-400"}`}
            >
              {items.size} 张图片
            </span>
            <button
              type="button"
              onClick={() => setEnabled(!isEnabled)}
              className={`p-1 rounded transition-colors ${
                isEnabled
                  ? "text-blue-600 hover:bg-blue-100"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
              title={isEnabled ? "禁用维基地图" : "启用维基地图"}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="text-xs text-gray-600 space-y-2">
          <p>• 维基共享资源图片</p>
          <p>• zoom &gt; 18 时，自动加载当前位置附近的图片</p>
          <p>• zoom &gt; 20 时，自动显示图片</p>

          {/* 统计信息 */}
          <div className="pt-2 mt-2 border-t border-gray-200 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">获取次数：</span>
              <span className="font-medium text-gray-700">{stats.count}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">上次获取：</span>
              <span className="font-medium text-gray-700">
                {stats.lastFetchTime
                  ? new Date(stats.lastFetchTime).toLocaleString()
                  : "从未"}
              </span>
            </div>
            {stats.lastFetchRadius && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">获取半径：</span>
                <span className="font-medium text-gray-700">
                  {stats.lastFetchRadius}m
                </span>
              </div>
            )}
          </div>

          {items.size > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClearCache}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                  showConfirm
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
                title="清理缓存"
              >
                <Trash2 className="w-3 h-3" />
                <span>{showConfirm ? "确认清理" : "清理缓存"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WikimapConsole;
