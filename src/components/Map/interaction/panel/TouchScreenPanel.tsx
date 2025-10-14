/** biome-ignore-all lint/a11y/noStaticElementInteractions: touch interactions are intentional */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: keyboard events handled elsewhere */
import { ChevronDown, ChevronUp, Info, Sparkles, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Swiper as SwiperType } from "swiper";
import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

// 导入 Swiper 样式
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import type { LocationInfo } from "../../../../helper/map-data/LocationInfo";
import { BasicInfoPreview } from "./_BasicInfo";
import type { PanelContent, PanelTabId } from "./FloatingInfoPanel";
import { usePanelStore } from "./panelStore";

export interface TouchScreenPanelProps {
  contents: PanelContent[];
  activeId: PanelTabId;
  setActiveId: (id: PanelTabId) => void;
  locationInfo?: LocationInfo;
  className?: string;
}

export const TouchScreenPanel: React.FC<TouchScreenPanelProps> = ({
  contents,
  activeId,
  setActiveId,
  locationInfo,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const [showTabs, setShowTabs] = useState(true);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<"up" | "down" | null>(null);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // 基本信息展开状态
  const [infoExpanded, setInfoExpanded] = useState(true);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 从 store 获取状态
  const close = usePanelStore((s) => s.close);
  const aiActive = usePanelStore((s) => s.aiActive);
  const toggleAiActive = usePanelStore((s) => s.toggleAiActive);

  // 获取当前激活的索引
  const activeIndex = contents.findIndex((c) => c.id === activeId);

  // 处理 AI 按钮点击
  const handleAiToggle = useCallback(() => {
    if (!aiActive) {
      setActiveId("ai");
      toggleAiActive();
    } else {
      toggleAiActive();
    }
  }, [aiActive, toggleAiActive, setActiveId]);

  // 当 activeId 改变时，更新 Swiper 的 slide
  useEffect(() => {
    if (swiperRef.current && activeIndex !== -1) {
      swiperRef.current.slideTo(activeIndex);
    }
  }, [activeIndex]);

  // Tab 滚动相关状态
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 检查滚动状态
  const checkScrollState = useCallback(() => {
    if (!tabsContainerRef.current) return;

    const container = tabsContainerRef.current;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth,
    );
  }, []);

  // 滚动到指定 tab
  const scrollToTab = useCallback((targetIndex: number) => {
    if (!tabsContainerRef.current) return;

    const container = tabsContainerRef.current;
    const tabElements = container.querySelectorAll("[data-tab-id]");
    const targetTab = tabElements[targetIndex] as HTMLElement;

    if (targetTab) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = targetTab.getBoundingClientRect();

      // 计算目标位置（居中显示）
      const scrollLeft =
        targetTab.offsetLeft - (containerRect.width - tabRect.width) / 2;

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: "smooth",
      });
    }
  }, []);

  // 当内容或激活 tab 改变时，滚动到当前 tab
  useEffect(() => {
    if (activeIndex !== -1) {
      // 延迟执行，确保 DOM 更新完成
      setTimeout(() => scrollToTab(activeIndex), 100);
    }
  }, [activeIndex, scrollToTab]);

  // 当内容数量改变时，滚动到最后一个 tab（如果没有激活的 tab）
  useEffect(() => {
    if (activeIndex === -1 && contents.length > 0) {
      setTimeout(() => scrollToTab(contents.length - 1), 100);
    }
  }, [contents.length, activeIndex, scrollToTab]);

  // 自动展开和合上基本信息
  useEffect(() => {
    // 进入时自动展开
    setInfoExpanded(true);

    // 清除之前的定时器
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
    }

    // 3秒后自动合上
    autoCloseTimeoutRef.current = setTimeout(() => {
      setInfoExpanded(false);
    }, 3000);

    // 清理函数
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []); // 只在组件挂载时执行一次

  // 初始检查滚动状态
  useEffect(() => {
    // 延迟检查，确保 DOM 渲染完成
    const timer = setTimeout(checkScrollState, 100);
    return () => clearTimeout(timer);
  }, [checkScrollState]);

  // 监听内容滚动，自动隐藏/显示标签栏（优化版，防止闪动）
  const handleContentScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const currentScrollY = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;

      // 计算滚动差值
      const scrollDiff = currentScrollY - lastScrollY.current;

      // 阈值：必须滚动超过 10px 才触发变化
      const threshold = 10;

      // 检测是否接近底部或顶部（避免边界闪动）
      const _isNearBottom = scrollHeight - currentScrollY - clientHeight < 50;
      const _isNearTop = currentScrollY < 50;

      // 清除之前的定时器
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // 使用防抖，避免频繁触发
      scrollTimeout.current = setTimeout(() => {
        // 如果在顶部，始终显示标签栏
        // if (isNearTop) {
        //   setShowTabs(true);
        //   scrollDirection.current = null;
        //   return;
        // }

        // // 如果在底部，保持当前状态，不要切换
        // if (isNearBottom) {
        //   return;
        // }

        // 向下滚动且滚动距离足够（内容向上移动）
        if (scrollDiff > threshold && currentScrollY > 50) {
          if (scrollDirection.current !== "down") {
            scrollDirection.current = "down";
            setShowTabs(false);
          }
          // 自动关闭基本信息展示
          if (infoExpanded) {
            setInfoExpanded(false);
            // 清除自动关闭定时器
            if (autoCloseTimeoutRef.current) {
              clearTimeout(autoCloseTimeoutRef.current);
              autoCloseTimeoutRef.current = null;
            }
          }
        }
        // 向上滚动且滚动距离足够
        else if (scrollDiff < -threshold) {
          if (scrollDirection.current !== "up") {
            scrollDirection.current = "up";
            setShowTabs(true);
          }
        }

        lastScrollY.current = currentScrollY;
      }, 50); // 50ms 防抖
    },
    [infoExpanded],
  );

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-[2000] ${className}`}>
      <div
        ref={containerRef}
        className="h-full w-full flex flex-col bg-gradient-to-b from-white/95 to-white/90 backdrop-blur-lg"
        role="dialog"
        aria-modal="true"
        aria-label="信息面板"
      >
        {/* 头部 - 触摸屏优化 */}
        <div className="flex-shrink-0 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setInfoExpanded(!infoExpanded);
                // 手动点击时清除自动关闭定时器
                if (autoCloseTimeoutRef.current) {
                  clearTimeout(autoCloseTimeoutRef.current);
                  autoCloseTimeoutRef.current = null;
                }
              }}
              className="flex items-center gap-2 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
            >
              <span className="text-lg font-bold text-gray-900 truncate">
                {locationInfo?.name}
              </span>
              {infoExpanded ? (
                <ChevronUp size={20} className="text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronDown
                  size={20}
                  className="text-gray-500 flex-shrink-0"
                />
              )}
            </button>

            {/* 触摸屏优化按钮组 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* AI 按钮 */}
              <button
                type="button"
                aria-pressed={aiActive}
                aria-label={aiActive ? "关闭 AI 分析" : "AI 分析"}
                title={aiActive ? "关闭 AI 分析" : "AI 分析"}
                className={`p-2.5 rounded-xl text-sm border-2 transition-all duration-200 active:scale-95 ${
                  aiActive
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400 text-white shadow-lg"
                    : "bg-white/70 border-gray-300 text-gray-700 active:bg-gray-100"
                }`}
                onClick={handleAiToggle}
              >
                <Sparkles
                  size={20}
                  className={aiActive ? "animate-pulse" : ""}
                />
              </button>

              {/* 关闭按钮 */}
              <button
                type="button"
                className="p-2.5 rounded-xl text-base border-2 border-gray-300 bg-white/70 text-gray-700 active:bg-gray-100 transition-all duration-200 active:scale-95"
                onClick={close}
                aria-label="关闭"
                title="关闭面板"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 可展开的基本信息区域 */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              infoExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-4 pb-3 pt-1 max-h-[600px] overflow-y-auto">
              {locationInfo && <BasicInfoPreview locationInfo={locationInfo} />}
            </div>
          </div>
        </div>

        {/* 内容区域 - Swiper */}
        <div className="flex-1 overflow-hidden relative">
          {/* 标签栏 - 绝对定位浮动在内容上方，触摸优化 */}
          <div
            className={`absolute top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out border-b border-gray-200/50 bg-white/70 backdrop-blur-sm shadow-sm ${
              showTabs
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-full pointer-events-none"
            }`}
          >
            <div className="px-4 py-1 relative">
              {/* 左侧滚动指示器 */}
              {canScrollLeft && (
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white/70 to-transparent z-10 pointer-events-none" />
              )}

              {/* 右侧滚动指示器 */}
              {canScrollRight && (
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/70 to-transparent z-10 pointer-events-none" />
              )}

              <div
                ref={tabsContainerRef}
                className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide pb-1"
                onScroll={checkScrollState}
              >
                {contents.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    data-tab-id={c.id}
                    title={c.label}
                    className={`flex-shrink-0 px-3 py-2 text-sm font-semibold rounded-full transition-all duration-200 min-w-[80px] ${
                      activeId === c.id
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105"
                        : "bg-white/90 text-gray-700 border border-gray-300 active:scale-95 active:bg-gray-100"
                    }`}
                    onClick={() => setActiveId(c.id)}
                  >
                    {c.isLoading ? (
                      <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        {c.label}
                        {c.hint && (
                          <Info
                            size={16}
                            className={
                              activeId === c.id
                                ? "text-white/80"
                                : "text-gray-400"
                            }
                          />
                        )}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Swiper
            modules={[Pagination, Navigation]}
            spaceBetween={0}
            slidesPerView={1}
            speed={400}
            initialSlide={activeIndex !== -1 ? activeIndex : 0}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => {
              const newId = contents[swiper.activeIndex]?.id;
              if (newId && newId !== activeId) {
                setActiveId(newId);
              }
              // swipe 切换时自动显示 tab 栏
              setShowTabs(true);
            }}
            className="h-full w-full"
          >
            {contents.map((c, index) => (
              <SwiperSlide key={c.id} className="h-full">
                <div
                  className="h-full flex justify-center overflow-auto px-4 pt-16 pb-6 smooth-scroll"
                  data-tab-id={c.id}
                  onScroll={handleContentScroll}
                >
                  {/* 显示提示：向上滑动切换标签 */}
                  {!showTabs && index === activeIndex && (
                    <div
                      className="sticky top-0 z-10 flex justify-center mb-2"
                      onClick={() => setShowTabs(true)}
                    >
                      {/* <div className="bg-gray-800/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg">
                        点击显示标签栏 ↑
                      </div> */}
                    </div>
                  )}

                  <div className="mx-auto">{c.render}</div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* 滑动指示器（点击显示标签栏） - 触摸优化 */}
          {!showTabs && (
            <button
              type="button"
              className="absolute top-0 left-0 right-0 h-14 z-40 flex flex-col justify-start items-center pt-3 bg-gradient-to-b from-gray-900/10 to-transparent active:from-gray-900/15 transition-colors"
              onClick={() => setShowTabs(true)}
              aria-label="显示标签栏"
            >
              <div className="w-16 h-1.5 bg-gray-400/90 rounded-full mb-1.5 shadow-sm" />
              <ChevronDown
                size={16}
                className="text-gray-500/80 animate-bounce"
              />
            </button>
          )}
        </div>
      </div>

      {/* 全局样式 - 触摸屏优化 */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .smooth-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        
        /* 安全区域支持 */
        .safe-area-bottom {
          padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
        }
        
        /* Swiper 自定义样式 */
        .swiper-slide {
          background: transparent;
        }
        
        /* 触摸反馈优化 */
        @media (hover: none) and (pointer: coarse) {
          button:active {
            transform: scale(0.98);
          }
        }
        
        /* 优化滚动条（触摸设备上更宽更明显） */
        .touch-screen-content::-webkit-scrollbar {
          width: 6px;
        }
        .touch-screen-content::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
        }
        .touch-screen-content::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
        }
        .touch-screen-content::-webkit-scrollbar-thumb:active {
          background: rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default TouchScreenPanel;
