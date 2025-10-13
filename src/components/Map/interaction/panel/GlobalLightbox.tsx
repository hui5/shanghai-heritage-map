"use client";

import PhotoSwipe from "photoswipe";
import { useCallback, useEffect, useRef, useState } from "react";
import "photoswipe/style.css";
import type { Image } from "./_Images";

interface LightboxState {
  isOpen: boolean;
  images: Image[];
  index: number;
}

let globalOpenLightbox: ((images: Image[], index: number) => void) | null =
  null;

// 全局状态：lightbox 是否打开
let isLightboxOpen = false;

// 全局方法：检查 lightbox 是否打开
export const isGlobalLightboxOpen = () => isLightboxOpen;

// 全局方法：打开 Lightbox
export const openLightbox = (images: Image[], index: number = 0) => {
  if (globalOpenLightbox) {
    globalOpenLightbox(images, index);
  }
};

// 全局方法：关闭 Lightbox
export const closeLightbox = () => {
  // PhotoSwipe 会自己处理关闭
};

// 全局 Lightbox 组件
export function GlobalLightbox() {
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const [_currentState, setCurrentState] = useState<LightboxState>({
    isOpen: false,
    images: [],
    index: 0,
  });

  // 创建底部信息栏 HTML
  const createInfoBar = useCallback((image: Image) => {
    return `
      <div class="pswp__info-bar" style="
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(12px);
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        padding: 12px 16px;
        z-index: 2147483647;
        max-height: 180px;
        overflow-y: auto;
        pointer-events: auto;
      ">
        <div style="max-width: 1024px; margin: 0 auto;">
          ${
            image.title
              ? `<h3 style="color: white; font-size: 16px; font-weight: 500; margin-bottom: 6px; user-select: text; line-height: 1.5;">${image.title}</h3>`
              : ""
          }
          ${
            image.description
              ? `<p style="color: #d1d5db; font-size: 14px; margin-bottom: 6px; user-select: text; line-height: 1.5;">${image.description}</p>`
              : ""
          }
          ${
            image.date || image.address || image.source
              ? `<p style="color: #9ca3af; font-size: 12px; margin-bottom: 10px; user-select: text;">
              ${image.date || ""} ${image.address || ""} ${image.source || ""}
            </p>`
              : ""
          }
          ${
            image.ref
              ? `<a 
              href="${image.ref}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="pswp__ref-link"
              style="
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                font-size: 13px;
                font-weight: 500;
                color: #93c5fd;
                text-decoration: none;
                cursor: pointer;
                transition: color 0.2s;
              ">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              来源
            </a>`
              : ""
          }
        </div>
      </div>
    `;
  }, []);

  // 初始化 PhotoSwipe 实例
  const initializePhotoSwipe = useCallback(
    (pswp: PhotoSwipe, images: Image[]) => {
      // 添加键盘事件监听器（使用 capture: true 确保最高优先级）
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" || e.code === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          pswp.close();
          return false;
        }
      };

      // 标记 lightbox 已打开
      isLightboxOpen = true;

      // 立即添加键盘事件监听，在 PhotoSwipe 初始化之前
      window.addEventListener("keydown", handleKeyDown, true);

      // 监听初始化完成
      pswp.on("uiRegister", () => {
        // 添加自定义 UI 元素
        pswp.ui?.registerElement({
          name: "custom-info",
          order: 9,
          isButton: false,
          appendTo: "root",
          html: "",
          onInit: (el) => {
            // 初始化信息栏（只显示一张图片）
            const currentImage = images[0];
            el.innerHTML = createInfoBar(currentImage);

            // 阻止信息栏的所有点击事件冒泡
            const infoBar = el.querySelector(".pswp__info-bar");
            if (infoBar) {
              infoBar.addEventListener("click", (e) => {
                e.stopPropagation();
              });
              infoBar.addEventListener("mousedown", (e) => {
                e.stopPropagation();
              });
              infoBar.addEventListener("touchstart", (e) => {
                e.stopPropagation();
              });
            }

            // 绑定外部链接事件
            const refLink = el.querySelector(".pswp__ref-link");
            if (refLink) {
              refLink.addEventListener("click", (e) => {
                e.stopPropagation();
              });
              refLink.addEventListener("mousedown", (e) => {
                e.stopPropagation();
              });
            }
          },
        });
      });

      // 监听关闭
      pswp.on("close", () => {
        // 标记 lightbox 已关闭
        isLightboxOpen = false;
        // 移除键盘事件监听
        window.removeEventListener("keydown", handleKeyDown, true);
        setCurrentState((prev) => ({ ...prev, isOpen: false }));
        pswpRef.current = null;
      });

      // 初始化并打开
      pswp.init();
      pswpRef.current = pswp;
    },
    [createInfoBar],
  );

  // 打开 PhotoSwipe
  const openPhotoSwipe = useCallback(
    (images: Image[], index: number) => {
      // 如果已经打开，先关闭
      if (pswpRef.current) {
        pswpRef.current.close();
      }

      // 只获取当前点击的单张图片
      const currentImage = images[index];
      const thumbnailSrc = currentImage.thumbnail;
      const fullSrc = currentImage.url || currentImage.thumbnail;
      const hasHighRes =
        currentImage.url && currentImage.url !== currentImage.thumbnail;

      // 保存当前状态
      setCurrentState({
        isOpen: true,
        images: [currentImage], // 只保存当前图片
        index: 0, // 索引重置为0
      });

      // 先加载缩略图
      const thumbnailImg = new Image();
      thumbnailImg.src = thumbnailSrc;

      thumbnailImg.onload = () => {
        // 使用缩略图尺寸先打开 PhotoSwipe
        const dataSource = [
          {
            src: thumbnailSrc,
            width: thumbnailImg.naturalWidth,
            height: thumbnailImg.naturalHeight,
            alt: currentImage.title || "",
          },
        ];

        // 创建 PhotoSwipe 实例
        const pswp = new PhotoSwipe({
          dataSource,
          index: 0,
          pswpModule: () => import("photoswipe"),
          padding: { top: 50, bottom: 200, left: 20, right: 20 },
          bgOpacity: 0.95,
          closeOnVerticalDrag: true,
          pinchToClose: true,
          wheelToZoom: true,
          clickToCloseNonZoomable: false,
          loop: false,
          arrowKeys: false,
        });

        initializePhotoSwipe(pswp, [currentImage]);

        // 如果有高清图，在后台加载并替换
        if (hasHighRes) {
          const fullImg = new Image();
          fullImg.src = fullSrc;

          fullImg.onload = () => {
            // 检查 PhotoSwipe 是否还在打开状态
            if (pswp && !pswp.isDestroying) {
              // 更新数据源为高清图
              const slide = pswp.currSlide;
              if (slide) {
                // 更新 slide 的数据
                slide.data.src = fullSrc;
                slide.data.width = fullImg.naturalWidth;
                slide.data.height = fullImg.naturalHeight;

                // 重新加载当前 slide
                pswp.refreshSlideContent(0);
              }
            }
          };

          fullImg.onerror = () => {
            // 高清图加载失败，保持使用缩略图
            console.warn("Failed to load high-res image:", fullSrc);
          };
        }
      };

      // 如果缩略图加载失败，使用默认尺寸
      thumbnailImg.onerror = () => {
        const dataSource = [
          {
            src: thumbnailSrc,
            width: 1600,
            height: 1200,
            alt: currentImage.title || "",
          },
        ];

        const pswp = new PhotoSwipe({
          dataSource,
          index: 0,
          pswpModule: () => import("photoswipe"),
          padding: { top: 50, bottom: 200, left: 20, right: 20 },
          bgOpacity: 0.95,
          closeOnVerticalDrag: true,
          pinchToClose: true,
          wheelToZoom: true,
          clickToCloseNonZoomable: false,
          loop: false,
          arrowKeys: false,
        });

        initializePhotoSwipe(pswp, [currentImage]);
      };
    },
    [initializePhotoSwipe],
  );

  useEffect(() => {
    globalOpenLightbox = openPhotoSwipe;
    return () => {
      globalOpenLightbox = null;
      if (pswpRef.current) {
        pswpRef.current.close();
      }
    };
  }, [openPhotoSwipe]);

  return null; // PhotoSwipe 会自己创建 DOM
}
