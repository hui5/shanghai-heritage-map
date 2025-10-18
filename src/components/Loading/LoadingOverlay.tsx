import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { state as stateB } from "@/components/Map/building/data";
import { state as stateH } from "@/components/Map/historical/data";
import { cn } from "@/utils/helpers";

interface LoadingOverlayProps {
  message?: string;
  styleReady: boolean;
}

export function LoadingOverlay({ styleReady }: LoadingOverlayProps) {
  const [isClient, setIsClient] = useState(false);

  // 确保只在客户端渲染时使用状态
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 始终调用 hooks，但根据 isClient 状态决定使用方式
  const snapshotH = useSnapshot(stateH);
  const snapshotB = useSnapshot(stateB);

  // 在服务端渲染时，始终显示加载界面以避免 hydration 错误
  if (!isClient) {
    // 服务端渲染时，始终显示加载界面
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" className="mx-auto block" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">
              上海历史建筑地图
            </h3>
            <p className="text-gray-600">正在渲染地图，请稍候...</p>
          </div>
        </div>
      </div>
    );
  }

  // 客户端渲染时，使用真实的状态
  const isLoading =
    snapshotH.loading.processing.length > 0 ||
    snapshotB.loading.processing.length > 0;

  if (!isLoading && styleReady) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto block" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800">
            上海历史建筑地图
          </h3>
          <p className="text-gray-600">正在渲染地图，请稍候...</p>
          {isLoading && (
            <div className="text-sm text-gray-500">
              数据文件下载进度：{" "}
              {snapshotH.loading.processing.length +
                snapshotB.loading.processing.length}{" "}
              {" > "}
              {snapshotH.loading.completed.length +
                snapshotB.loading.completed.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2
      className={cn(
        "animate-spin text-primary-500",
        sizeClasses[size],
        className,
      )}
    />
  );
}
