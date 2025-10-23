import Link from "next/link";
import type React from "react";
import { useFavoriteStore } from "../../../helper/store/favoriteStore";

export const FavoriteButton: React.FC = () => {
  const favorites = useFavoriteStore((s) => s.favorites);

  return (
    <Link
      href="/favorites"
      className="group relative inline-flex items-center justify-center p-2 bg-white/90 hover:bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 hover:scale-110"
      title="查看收藏的图片"
    >
      {/* 书签图标 */}
      <svg
        className="w-5 h-5 text-gray-500 group-hover:scale-110 transition-transform"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
      </svg>

      {/* 收藏数量徽章 */}
      {favorites.length > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-500 rounded-full border-2 border-white shadow-sm">
          {favorites.length > 99 ? "99+" : favorites.length}
        </span>
      )}
    </Link>
  );
};

export default FavoriteButton;
