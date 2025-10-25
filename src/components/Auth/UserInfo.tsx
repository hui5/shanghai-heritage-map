"use client";

import { Bookmark, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../helper/store/authStore";
import { useFavoriteStore } from "../../helper/store/favoriteStore";
import LoginModal from "./LoginModal";

export default function UserInfo() {
  const { user, signOut, isLoading } = useAuthStore();
  const { favorites } = useFavoriteStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // 计算云端收藏数（已同步的收藏）
  const cloudFavoritesCount = favorites.filter((fav) => fav.isSynced).length;

  const handleSignOut = async () => {
    await signOut();
    setIsDropdownOpen(false);
  };

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={handleLoginClick}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <User className="w-4 h-4" />
          )}
          {isLoading ? "登录中..." : "登录"}
        </button>

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </>
    );
  }

  // 获取头像和用户名
  const avatarUrl = user.user_metadata?.avatar_url;

  const displayName =
    user.user_metadata?.user_name || // GitHub username
    user.user_metadata?.full_name || // Full name
    user.email?.split("@")[0] || // Email prefix
    "用户";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-6 h-6 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
        )}
        <span className="hidden sm:inline">{displayName}</span>
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
              <div className="flex items-center gap-2 mb-1">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.user_metadata?.user_name ||
                      user.user_metadata?.full_name ||
                      "用户"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email || "GitHub 用户"}
                  </div>
                </div>
              </div>
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
