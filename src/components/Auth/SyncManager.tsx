"use client";

import { useEffect } from "react";
import { useAuthStore } from "../../helper/store/authStore";
import { useFavoriteStore } from "../../helper/store/favoriteStore";

export default function SyncManager() {
  const { user } = useAuthStore();
  const { loadCloudFavorites, syncWithCloud } = useFavoriteStore();

  useEffect(() => {
    if (user) {
      // 用户登录后，先加载云端收藏（这会处理删除同步），然后同步本地未同步的收藏
      const initializeSync = async () => {
        try {
          // 先加载云端收藏，这会删除本地多余的收藏
          await loadCloudFavorites();
          // 然后同步本地未同步的收藏到云端
          await syncWithCloud();
        } catch (error) {
          console.error("Error during sync initialization:", error);
        }
      };

      initializeSync();
    }
  }, [user, loadCloudFavorites, syncWithCloud]);

  return null; // 这是一个无渲染组件
}
