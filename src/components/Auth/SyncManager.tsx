"use client";

import { useEffect } from "react";
import { useAuthStore } from "../../helper/store/authStore";
import { useFavoriteStore } from "../../helper/store/favoriteStore";

export default function SyncManager() {
  const { user } = useAuthStore();
  const { loadCloudFavorites, syncWithCloud } = useFavoriteStore();

  useEffect(() => {
    if (user) {
      // 用户登录后，加载云端收藏并同步
      const initializeSync = async () => {
        await loadCloudFavorites();
        await syncWithCloud();
      };

      initializeSync();
    }
  }, [user, loadCloudFavorites, syncWithCloud]);

  return null; // 这是一个无渲染组件
}
