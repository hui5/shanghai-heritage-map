import { Clock, MapPin, Trash2 } from "lucide-react";
import type { UtilsMap } from "map-gl-utils";
import { usePanelStore } from "../../interaction/panel/panelStore";
import { useSearchHistoryStore } from "../../interaction/panel/searchStore";

interface SearchHistoryProps {
  mapInstance: UtilsMap;
}

export function SearchHistory({ mapInstance }: SearchHistoryProps) {
  const { history, removeSearchHistory, clearHistory } =
    useSearchHistoryStore();
  const { setFullscreen, setOverview, setPinned } = usePanelStore();

  const handleSearchItemClick = (item: any) => {
    // Fly to 查询地点
    if (mapInstance && item.coordinates) {
      mapInstance.flyTo({
        center: item.coordinates,
        zoom: 17,
        duration: 1000,
      });
    }

    // 弹出查询面板
    usePanelStore.setState({
      locationInfo: item.locationInfo,
      isOpen: true,
      isPinned: true,
    });
    setFullscreen(true);
    setOverview(true);
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSearchHistory(id);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "昨天";
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
      });
    }
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm">暂无查询历史</p>
        <p className="text-xs text-gray-400 mt-1">开始地图探索之旅吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 头部操作 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            查询历史 ({history.length})
          </span>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="text-xs text-red-500 hover:text-red-700 transition-colors"
            title="清空所有历史"
          >
            清空
          </button>
        )}
      </div>

      {/* 历史记录列表 */}
      <div className="space-y-2  overflow-y-auto custom-scrollbar">
        {history.map((item) => (
          <div
            key={item.id}
            className="group w-full py-3 px-2 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <button
                type="button"
                className="flex-1 min-w-0 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
                onClick={() => handleSearchItemClick(item)}
                aria-label={`查看 ${item.locationInfo.name} 的详细信息`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.query}
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0 ml-2">
                    {item.locationInfo.dataSource}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(item.timestamp)}
                  </span>
                  {item.locationInfo.address && (
                    <span className="truncate max-w-32">
                      {item.locationInfo.address}
                    </span>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-1 ">
                <button
                  type="button"
                  onClick={(e) => handleRemoveItem(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  title="删除此记录"
                  aria-label="删除此记录"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
