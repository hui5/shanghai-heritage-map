import { create } from "zustand";
import type { Image } from "../../components/interaction/panel/_Images";
import type { LocationInfo } from "../map-data/LocationInfo";
import { useAuthStore } from "./authStore";
import {
  type FavoriteImage as SupabaseFavoriteImage,
  supabase,
} from "./supabase";

export interface FavoriteImage extends Image {
  // 必须包含的额外字段
  category: string; // tab 分类名称（如 "维基共享"、"上图·照片" 等）
  locationName: string; // 来自 locationInfo.name
  locationInfo?: LocationInfo; // 完整的位置信息，用于跳转
  favoriteId: string; // 唯一标识符
  timestamp: number; // 收藏时间戳
  cloudId?: string; // 云端 ID，用于同步
  isSynced?: boolean; // 是否已同步到云端
}

interface FavoriteState {
  favorites: FavoriteImage[];
  isSyncing: boolean;

  // actions
  addFavorite: (
    image: Image,
    category: string,
    locationInfo: LocationInfo,
  ) => Promise<void>;
  removeFavorite: (favoriteId: string) => Promise<void>;

  syncFavorites: () => Promise<void>;
}

const STORAGE_KEY = "shanghai-heritage-favorites";

// 从 localStorage 加载收藏数据
const loadFavorites = (): FavoriteImage[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load favorites:", error);
    return [];
  }
};

// 保存收藏数据到 localStorage
const saveFavorites = (favorites: FavoriteImage[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Failed to save favorites:", error);
  }
};

// 生成唯一 ID
const generateFavoriteId = (imageUrl: string, category: string): string => {
  return `${category}::${imageUrl}`;
};

// 将本地收藏转换为 Supabase 格式
const convertToSupabaseFavorite = (
  favorite: FavoriteImage,
  userId: string,
): SupabaseFavoriteImage => {
  return {
    user_id: userId,
    image_url: favorite.url || favorite.thumbnail || "",
    thumbnail: favorite.thumbnail,
    title: favorite.title,
    description: favorite.description,
    ref: favorite.ref,
    category: favorite.category,
    location_name: favorite.locationName,
    location_info: favorite.locationInfo,
    favorite_id: favorite.favoriteId,
    tags: favorite.tags,
    timestamp: favorite.timestamp,
  };
};

// 将 Supabase 收藏转换为本地格式
const convertFromSupabaseFavorite = (
  cloudFavorite: SupabaseFavoriteImage,
): FavoriteImage => {
  return {
    url: cloudFavorite.image_url,
    thumbnail: cloudFavorite.thumbnail || "",
    title: cloudFavorite.title || "",
    description: cloudFavorite.description || "",
    ref: cloudFavorite.ref,
    tags: cloudFavorite.tags,
    category: cloudFavorite.category,
    locationName: cloudFavorite.location_name,
    locationInfo: cloudFavorite.location_info,
    favoriteId: cloudFavorite.favorite_id,
    timestamp: cloudFavorite.timestamp,
    cloudId: cloudFavorite.id,
    isSynced: true,
  };
};

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: loadFavorites(),
  isOpen: false,
  isSyncing: false,

  addFavorite: async (image, category, locationInfo) => {
    const favoriteId = generateFavoriteId(
      image.url || image.thumbnail,
      category,
    );
    const { favorites } = get();

    // 检查是否已经收藏
    if (favorites.some((f) => f.favoriteId === favoriteId)) {
      return;
    }

    const favoriteImage: FavoriteImage = {
      ...image,
      category,
      locationName: locationInfo.name,
      locationInfo,
      favoriteId,
      timestamp: Date.now(),
      tags: [
        ...(image.tags || []),
        ...(locationInfo.name ? [locationInfo.name] : []),
      ],
      isSynced: false,
      url: image.url || image.thumbnail || "",
      thumbnail: image.thumbnail || image.url || "",
    };

    const newFavorites = [favoriteImage, ...favorites];
    set({ favorites: newFavorites });
    saveFavorites(newFavorites);

    // 如果用户已登录，同步到云端
    const { user } = useAuthStore.getState();
    if (user) {
      try {
        const supabaseFavorite = convertToSupabaseFavorite(
          favoriteImage,
          user.id,
        );
        const { data, error } = await supabase
          .from("favorites")
          .insert([supabaseFavorite])
          .select()
          .single();

        if (error) {
          console.error("Failed to sync favorite to cloud:", error);
        } else {
          // 更新本地收藏的云端信息
          const updatedFavorites = newFavorites.map((fav) =>
            fav.favoriteId === favoriteId
              ? { ...fav, cloudId: data.id, isSynced: true }
              : fav,
          );
          set({ favorites: updatedFavorites });
          saveFavorites(updatedFavorites);
        }
      } catch (error) {
        console.error("Error syncing favorite to cloud:", error);
      }
    }
  },

  removeFavorite: async (favoriteId) => {
    const { favorites } = get();
    const favoriteToRemove = favorites.find((f) => f.favoriteId === favoriteId);

    const newFavorites = favorites.filter((f) => f.favoriteId !== favoriteId);
    set({ favorites: newFavorites });
    saveFavorites(newFavorites);

    // 如果用户已登录且收藏已同步，从云端删除
    const { user } = useAuthStore.getState();
    if (user && favoriteToRemove?.cloudId) {
      try {
        await supabase
          .from("favorites")
          .delete()
          .eq("id", favoriteToRemove.cloudId);
      } catch (error) {
        console.error("Error removing favorite from cloud:", error);
      }
    }
  },

  // 优化的同步方法：检查数据完整性并更新不完整的数据
  syncFavorites: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ isSyncing: true });

    try {
      const { favorites: localFavorites } = get();

      // 1. 从云端加载收藏数据
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Failed to load cloud favorites:", error);
        return;
      }

      const cloudFavorites = data.map(convertFromSupabaseFavorite);
      const cloudFavoriteIds = new Set(
        cloudFavorites.map((fav) => fav.favoriteId),
      );

      // 2. 过滤本地收藏：只保留云端存在或未同步的收藏
      const validLocalFavorites = localFavorites.filter(
        (localFav) =>
          cloudFavoriteIds.has(localFav.favoriteId) || !localFav.isSynced,
      );

      // 3. 双向同步：检查并更新 ref 字段
      const updatedCloudFavorites = await Promise.all(
        cloudFavorites.map(async (cloudFav) => {
          // 找到对应的本地版本
          const localVersion = validLocalFavorites.find(
            (localFav) => localFav.favoriteId === cloudFav.favoriteId,
          );

          // 检查是否需要更新云端（本地有 ref，云端没有）
          if (localVersion?.ref && !cloudFav.ref) {
            console.log(
              `Updating cloud ref from local: ${cloudFav.favoriteId}`,
            );

            try {
              const { data: updateData, error: updateError } = await supabase
                .from("favorites")
                .update({ ref: localVersion.ref })
                .eq("id", cloudFav.cloudId)
                .select()
                .single();

              if (updateError) {
                console.error("Failed to update cloud ref:", updateError);
                return cloudFav;
              } else {
                console.log(
                  `Successfully updated cloud ref: ${cloudFav.favoriteId}`,
                );
                return convertFromSupabaseFavorite(updateData);
              }
            } catch (error) {
              console.error("Error updating cloud ref:", error);
              return cloudFav;
            }
          }

          // 检查是否需要更新本地（云端有 ref，本地没有）
          if (cloudFav.ref && localVersion && !localVersion.ref) {
            console.log(
              `Updating local ref from cloud: ${cloudFav.favoriteId}`,
            );

            // 更新本地收藏的 ref 字段
            localVersion.ref = cloudFav.ref;
          }

          return cloudFav;
        }),
      );

      // 4. 上传本地未同步的收藏到云端
      const unsyncedFavorites = validLocalFavorites.filter(
        (fav) => !fav.isSynced,
      );
      const updatedLocalFavorites = [...validLocalFavorites];

      for (const favorite of unsyncedFavorites) {
        const supabaseFavorite = convertToSupabaseFavorite(favorite, user.id);
        const { data: uploadData, error: uploadError } = await supabase
          .from("favorites")
          .insert([supabaseFavorite])
          .select()
          .single();

        if (uploadError) {
          console.error("Failed to sync favorite to cloud:", uploadError);
        } else {
          // 更新本地收藏的同步状态
          const localIndex = updatedLocalFavorites.findIndex(
            (fav) => fav.favoriteId === favorite.favoriteId,
          );
          if (localIndex !== -1) {
            updatedLocalFavorites[localIndex] = {
              ...updatedLocalFavorites[localIndex],
              cloudId: uploadData.id,
              isSynced: true,
            };
          }
        }
      }

      // 5. 合并云端和本地收藏
      const mergedFavorites = [...updatedLocalFavorites];

      // 添加云端独有的收藏（本地不存在的）
      updatedCloudFavorites.forEach((cloudFav) => {
        const existsLocally = mergedFavorites.some(
          (localFav) => localFav.favoriteId === cloudFav.favoriteId,
        );
        if (!existsLocally) {
          mergedFavorites.push(cloudFav);
        } else {
          // 更新本地收藏的云端信息（确保 cloudId 和 isSynced 状态正确）
          const localIndex = mergedFavorites.findIndex(
            (localFav) => localFav.favoriteId === cloudFav.favoriteId,
          );
          if (localIndex !== -1) {
            mergedFavorites[localIndex] = {
              ...mergedFavorites[localIndex],
              isSynced: true,
              cloudId: cloudFav.cloudId,
            };
          }
        }
      });

      // 6. 按时间戳排序
      mergedFavorites.sort((a, b) => b.timestamp - a.timestamp);

      set({ favorites: mergedFavorites });
      saveFavorites(mergedFavorites);
    } catch (error) {
      console.error("Error syncing favorites:", error);
    } finally {
      set({ isSyncing: false });
    }
  },
}));

export default useFavoriteStore;
