"use client";

import { Bookmark } from "lucide-react";
import dynamic from "next/dynamic";
import ModalLayout from "@/app/ModalLayout";

// 动态导入，禁用 SSR
const FavoritesContent = dynamic(() => import("./FavoritesContent"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-sm">加载中...</p>
    </div>
  ),
});

export default function FavoritesPage() {
  const favoritesIcon = (
    <div className="w-6 h-6 flex items-center justify-center">
      <Bookmark size={20} className="text-blue-600" />
    </div>
  );

  return (
    <ModalLayout
      title="我的收藏"
      icon={favoritesIcon}
      maxWidth="max-w-4xl"
      headerBg="from-pink-50 to-rose-50"
      closeAriaLabel="关闭收藏"
    >
      <FavoritesContent />
    </ModalLayout>
  );
}
