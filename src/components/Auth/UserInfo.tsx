"use client";

import { Bookmark, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../helper/store/authStore";
import { useFavoriteStore } from "../../helper/store/favoriteStore";

interface UserInfoProps {
  onLoginClick: () => void;
}

export default function UserInfo({ onLoginClick }: UserInfoProps) {
  const { user, signOut } = useAuthStore();
  const { favorites } = useFavoriteStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 计算云端收藏数（已同步的收藏）
  const cloudFavoritesCount = favorites.filter((fav) => fav.isSynced).length;

  const handleSignOut = async () => {
    await signOut();
    setIsDropdownOpen(false);
  };

  if (!user) {
    return (
      <button
        type="button"
        onClick={onLoginClick}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <User className="w-4 h-4" />
        登录
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <User className="w-3 h-3 text-white" />
        </div>
        <span className="hidden sm:inline">
          {user.user_metadata?.full_name || user.email?.split("@")[0] || "用户"}
        </span>
      </button>

      {isDropdownOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
            aria-label="关闭菜单"
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-3 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-900">
                {user.user_metadata?.full_name || "用户"}
              </div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>

            <div className="p-1">
              <div className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700">
                <Bookmark className="w-4 h-4" />
                <span>云端收藏</span>
                <span className="ml-auto text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {cloudFavoritesCount}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
