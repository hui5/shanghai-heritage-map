import { cn } from "@/utils/helpers";
import React from "react";
import { Loader2 } from "lucide-react";
import { state as stateH } from "@/components/Map/historical/data";
import { state as stateB } from "@/components/Map/building/data";
import { useSnapshot } from "valtio";

interface LoadingOverlayProps {
  message?: string;
  styleReady: boolean;
}

export function LoadingOverlay({ styleReady }: LoadingOverlayProps) {
  const snapshotH = useSnapshot(stateH);
  const snapshotB = useSnapshot(stateB);

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
        className
      )}
    />
  );
}
