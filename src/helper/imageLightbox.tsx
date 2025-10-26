"use client";
import "photoswipe/style.css";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import type { Image } from "../components/interaction/panel/_Images";

let currentLightbox: PhotoSwipeLightbox | null = null;

// 全局状态：lightbox 是否打开
let isLightboxOpen = false;

// 全局方法：检查 lightbox 是否打开
export const isGlobalLightboxOpen = () => isLightboxOpen;

// 创建底部信息栏 HTML
const createInfoBar = (image: Image, category: string) => {
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
      max-height: 30vh;
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
            ${category}
          </a>`
            : ""
        }
      </div>
    </div>
  `;
};

// 全局方法：打开 Lightbox
export const openImageLightbox = (
  images: Image[],
  index: number = 0,
  category: string = "",
) => {
  // 如果已经打开，先关闭
  if (currentLightbox) {
    currentLightbox.pswp?.close();
  }

  // 只获取当前点击的单张图片
  const currentImage = images[index];
  const thumbnailSrc = currentImage.thumbnail;
  const fullSrc = currentImage.url || currentImage.thumbnail;

  let initedOriginalSize = false;

  // 使用缩略图尺寸先打开 PhotoSwipe
  const dataSource = [
    {
      msrc: thumbnailSrc,
      src: fullSrc,
      alt: currentImage.title || "",
    },
  ];

  // 创建 PhotoSwipe 实例
  const lightbox = new PhotoSwipeLightbox({
    pswpModule: () => import("photoswipe"),
    dataSource,
    index: 0,
    padding: { top: 50, bottom: 200, left: 20, right: 20 },
    bgOpacity: 0.95,
    closeOnVerticalDrag: true,
    pinchToClose: true,
    wheelToZoom: true,
    clickToCloseNonZoomable: false,
    loop: false,
    arrowKeys: false,
    initialZoomLevel: "fit",
  });

  lightbox.on("loadComplete", (e) => {
    const imgEl = e.content.element as HTMLImageElement; // <img>
    if (imgEl) {
      const w = imgEl.naturalWidth;
      const h = imgEl.naturalHeight;
      if (lightbox.pswp && !initedOriginalSize) {
        initedOriginalSize = true;
        lightbox.pswp.options.dataSource = [
          {
            src: fullSrc,
            width: w,
            height: h,
            alt: currentImage.title || "",
          },
        ];
        lightbox.pswp.refreshSlideContent(0);
      }
    }
  });

  // 添加键盘事件监听器
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.code === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      lightbox.pswp?.close();
      return false;
    }
  };

  // 标记 lightbox 已打开
  isLightboxOpen = true;

  // 立即添加键盘事件监听
  window.addEventListener("keydown", handleKeyDown, true);

  // 监听初始化完成
  lightbox.on("uiRegister", () => {
    // 添加自定义 UI 元素
    lightbox.pswp?.ui?.registerElement({
      name: "custom-info",
      order: 9,
      isButton: false,
      appendTo: "root",
      html: "",
      onInit: (el) => {
        // 初始化信息栏
        el.innerHTML = createInfoBar(currentImage, category);

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
  lightbox.on("close", () => {
    // 标记 lightbox 已关闭
    isLightboxOpen = false;
    // 移除键盘事件监听
    window.removeEventListener("keydown", handleKeyDown, true);
    currentLightbox = null;
  });

  lightbox.init();
  lightbox.loadAndOpen(0);
  currentLightbox = lightbox;
};
