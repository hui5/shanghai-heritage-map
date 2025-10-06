/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import { findLast, last, sortBy } from "lodash";
import { Info, LayoutGrid, Maximize2, Minimize2, Pin, X } from "lucide-react";
import type React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import type { LocationInfo } from "../../../../helper/map-data/LocationInfo";
import { PANEL } from "./panelConfig";
import { usePanelStore } from "./panelStore";

export type PanelTabId =
  | "wikipedia"
  | "commons"
  | "virtualshanghai"
  | "shlibrary"
  | "nianpu"
  | "laozao";

export interface PanelContent {
  id: PanelTabId;
  label: string;
  render: React.ReactNode;
  visible?: boolean;
  hint?: string;
  isLoading?: boolean;
  order: number;
}

export interface FloatingInfoPanelProps {
  // Allow drag and resize
  draggable?: boolean;
  resizable?: boolean;

  // Tabs/content
  contents: PanelContent[];
  className?: string;
  locationInfo?: LocationInfo;
  triggerPoint?: { x: number; y: number } | null;
}

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

export const FloatingInfoPanel: React.FC<FloatingInfoPanelProps> = ({
  draggable = true,
  resizable = true,
  contents,
  className = "",
  locationInfo,
  triggerPoint,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [left, setLeft] = useState<number>(PANEL.defaultLeft);
  const [top, setTop] = useState<number>(PANEL.defaultTop);
  const [width, setWidth] = useState<number>(PANEL.defaultWidth);
  const [height, setHeight] = useState<number>(PANEL.loadingCollapsedHeight);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [activeId, setActiveId] = useState<PanelTabId>("shlibrary");
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isOpen = usePanelStore((s) => s.isOpen);

  const pinned = usePanelStore((s) => s.isPinned);
  const setPinned = usePanelStore((s) => s.setPinned);

  const showOverview = usePanelStore((s) => s.showOverview);
  const toggleOverview = usePanelStore((s) => s.toggleOverview);

  const isFullscreen = usePanelStore((s) => s.isFullscreen);
  const toggleFullscreen = usePanelStore((s) => s.toggleFullscreen);

  const close = usePanelStore((s) => s.close);
  const scheduleHide = usePanelStore((s) => s.scheduleHide);
  const cancelAll = usePanelStore((s) => s.cancelAll);
  // Default collapsed; when content available and not loading, expand to default unless user resized
  useEffect(() => {
    const current = findLast(contents, (c) => !c.isLoading) || last(contents);

    if (current) {
      setActiveId(current.id);
      if (current.isLoading) {
        setHeight(PANEL.loadingCollapsedHeight);
      } else {
        setHeight(PANEL.defaultHeight);
      }
    }
  }, [contents]);

  // On open, reposition to avoid covering the trigger mouse point horizontally only
  useLayoutEffect(() => {
    if (pinned) return;

    const m: { x: number; y: number } | null = triggerPoint || null;
    if (!m) return;

    let targetX = m.x - width - 70;

    if (targetX < 0) {
      targetX = 0;
    }

    setLeft(targetX);

    let targetY = m.y - PANEL.defaultHeight / 2;

    if (targetY < 0) {
      targetY = 0;
    }
    if (targetY > window.innerHeight - PANEL.defaultHeight) {
      targetY = window.innerHeight - PANEL.defaultHeight;
    }
    setTop(targetY);
  }, [triggerPoint, pinned, width]);

  const handleMouseDownHeader = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleMouseDownResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove, true);

    const onEnter = () => {
      // cancel any hide scheduled by controller by notifying window controller
      try {
        const controller = (window as any).__FloatingInfoController__;
        if (controller && typeof controller.onPanelEnter === "function") {
          controller.onPanelEnter();
        }
      } catch {}
    };
    const onLeave = () => {
      try {
        const controller = (window as any).__FloatingInfoController__;
        if (controller && typeof controller.onPanelLeave === "function") {
          controller.onPanelLeave();
        }
      } catch {}
    };

    const el = containerRef.current;
    el?.addEventListener("mouseenter", onEnter);
    el?.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMouseMove, true);
      el?.removeEventListener("mouseenter", onEnter);
      el?.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const visibleContents = useMemo(
    () => contents.filter((c) => c.visible !== false),
    [contents],
  );

  useEffect(() => {
    const processKey = (key: string) => {
      const isShow = isOpen && visibleContents.length;
      if (!isShow) {
        return false;
      }

      if (key === "Escape") {
        close();
        return true;
      }
      if (key === "Space") {
        const getHoveredTabId = (): PanelTabId | null => {
          const { x, y } = mousePosRef.current;
          const start = document.elementFromPoint(x, y) as HTMLElement | null;
          let cur: HTMLElement | null = start;
          while (cur) {
            const id = cur.getAttribute("data-tab-id") as PanelTabId | null;
            if (id) return id;
            cur = cur.parentElement as HTMLElement | null;
          }
          return null;
        };

        if (!isFullscreen) {
          toggleFullscreen();
        } else {
          const hoveredId = getHoveredTabId();
          if (hoveredId && visibleContents.some((c) => c.id === hoveredId)) {
            setActiveId(hoveredId);
          }

          toggleOverview();
        }

        return true;
      }

      if (!showOverview && (key === "ArrowLeft" || key === "ArrowRight")) {
        const currentIndex = Math.max(
          0,
          visibleContents.findIndex((c) => c.id === activeId),
        );
        const nextIndex =
          key === "ArrowLeft"
            ? (currentIndex - 1 + visibleContents.length) %
              visibleContents.length
            : (currentIndex + 1) % visibleContents.length;
        setActiveId(visibleContents[nextIndex].id);

        return true;
      }
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      // Intercept relevant keys globally when panel is open
      const handled = processKey(e.code);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Use capture to pre-empt map's own handlers
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
    };
  }, [
    close,
    activeId,
    visibleContents,
    showOverview,
    toggleOverview,
    isFullscreen,
    toggleFullscreen,
    isOpen,
  ]);

  const Buttons = (
    <div className="flex items-center gap-1">
      {isFullscreen ? (
        <button
          type="button"
          aria-pressed={showOverview}
          aria-label={showOverview ? "关闭概览" : "概览"}
          title={
            showOverview
              ? "关闭概览。 Space、ArrowLeft、ArrowRight键快速切换"
              : "概览。 Space、ArrowLeft、ArrowRight键快速切换"
          }
          className={`p-1.5 rounded text-xs ${
            showOverview
              ? "bg-blue-100 border-blue-300 text-blue-700"
              : "bg-white/30 border-gray-300 text-gray-700 hover:bg-gray-100"
          } border`}
          onClick={toggleOverview}
        >
          <LayoutGrid size={16} />
        </button>
      ) : null}
      <button
        type="button"
        aria-pressed={isFullscreen}
        aria-label={isFullscreen ? "退出全屏" : "全屏"}
        title={
          isFullscreen
            ? "退出全屏。 面板触发弹出时：鼠标左键点击触发位置，或按Space键快速打开全屏"
            : "全屏。 面板触发弹出时：鼠标左键点击触发位置，或按Space键快速打开全屏"
        }
        className={`p-1.5 rounded text-xs bg-white/30 border border-gray-300 text-gray-700 hover:bg-gray-100`}
        onClick={() => toggleFullscreen()}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <button
        type="button"
        aria-pressed={pinned}
        aria-label={pinned ? "取消固定" : "固定"}
        title={pinned ? "取消固定" : "固定"}
        className={`p-1.5 rounded text-xs  ${
          pinned
            ? "bg-amber-100 border-amber-300 text-amber-700"
            : "bg-white/30 border-gray-300 text-gray-700 hover:bg-gray-100"
        }`}
        onClick={() => {
          setPinned(!pinned);
        }}
      >
        {pinned ? <Pin size={16} /> : <Pin size={16} />}
      </button>
      <button
        type="button"
        className="p-1.5 rounded text-xs  bg-white/30 text-gray-700 hover:bg-gray-100"
        onClick={close}
        aria-label="关闭"
        title="关闭。 Esc键,或点击面板之外空白区域快速关闭"
      >
        <X size={16} />
      </button>
    </div>
  );

  const nonFullscreenPanel = (
    <Rnd
      size={{ width, height }}
      position={{ x: left, y: top }}
      onDragStart={() => setIsDragging(true)}
      onDrag={(_, d) => {
        setLeft(clamp(d.x, 0, window.innerWidth - 80));
        setTop(clamp(d.y, 0, window.innerHeight - 80));
      }}
      onDragStop={(_, d) => {
        setIsDragging(false);
        setLeft(clamp(d.x, 0, window.innerWidth - 80));
        setTop(clamp(d.y, 0, window.innerHeight - 80));
      }}
      onResizeStart={() => setIsResizing(true)}
      onResize={(_, __, ref, ___, position) => {
        const minW = 320;
        const minH = 200;
        const nextW = Math.max(minW, ref.offsetWidth);
        const nextH = Math.max(minH, Math.min(ref.offsetHeight));
        setWidth(nextW);
        setHeight(nextH);
        setLeft(position.x);
        setTop(position.y);
      }}
      onResizeStop={(_, __, ref, ___, position) => {
        const minW = 320;
        const minH = 200;
        const nextW = Math.max(minW, ref.offsetWidth);
        const nextH = Math.max(minH, Math.min(ref.offsetHeight));
        setIsResizing(false);
        setWidth(nextW);
        setHeight(nextH);
        setLeft(position.x);
        setTop(position.y);
      }}
      enableResizing={resizable}
      disableDragging={!draggable}
      bounds="window"
      className={`fixed z-[100] ${className}`}
      style={{
        transition:
          isDragging || isResizing
            ? "none"
            : "height 220ms ease, width 220ms ease",
        willChange: "height, width, transform",
        minHeight: 160,
      }}
    >
      <div
        ref={containerRef}
        className="shadow-2xl rounded-lg border border-gray-200 bg-white/80 h-full w-full flex flex-col transition-opacity duration-200"
        role="dialog"
        aria-modal="false"
        aria-label="信息面板"
        onMouseEnter={cancelAll}
        onMouseLeave={scheduleHide}
      >
        {/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
        <div
          className="cursor-move select-none flex items-center justify-between px-3 py-1.5  "
          onMouseDown={handleMouseDownHeader}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">
              {locationInfo?.name}
            </span>
          </div>

          {Buttons}
        </div>

        {/* Tabs */}
        <div className="flex items-center flex-wrap gap-1 px-2 ">
          {visibleContents.map((c) => (
            <button
              type="button"
              key={c.id}
              data-tab-id={c.id}
              className={`px-2 pt-1 pb-2 text-xs font-bold rounded-t border-b-0 border ${
                activeId === c.id
                  ? "bg-white border-gray-300 text-gray-900"
                  : "bg-gray-100 border-gray-200 text-gray-600"
              }`}
              onClick={() => setActiveId(c.id)}
            >
              {c.isLoading ? "..." : c.label}
              {c.hint ? (
                <span
                  className="inline-flex items-center ml-1 align-middle"
                  title={c.hint}
                >
                  <Info size={12} className="text-gray-400" />
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="px-2 pt-0 pb-1 overflow-auto  flex-1 min-h-[160px] "
        >
          {visibleContents.map((c) => (
            <div
              key={c.id}
              className="h-full"
              style={{
                display: activeId === c.id ? "block" : "none",
                height: "100%",
              }}
              data-tab-id={c.id}
            >
              {c.render}
            </div>
          ))}
        </div>
      </div>
    </Rnd>
  );

  const fullscreenOverlay = (
    <div
      className={`fixed inset-0 z-[2000000] pointer-events-auto ${className}`}
    >
      <div
        ref={containerRef}
        className="h-full w-full flex flex-col bg-white/50 backdrop-blur-md border-t border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-label="信息面板全屏"
      >
        <div className="select-none flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white/70">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">
              {locationInfo?.name}
            </span>
          </div>
          {Buttons}
        </div>
        <div
          className="flex-1 overflow-auto px-3 pt-2 pb-3"
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            const insideTile = target?.closest("[data-tab-id]");
            if (!insideTile) {
              close();
            }
          }}
        >
          <div className="flex items-start justify-center gap-5">
            {sortBy(visibleContents, "order").map((c) => (
              <div
                key={c.id}
                style={{
                  display: showOverview
                    ? "block"
                    : activeId === c.id
                      ? "block"
                      : "none",
                }}
                data-tab-id={c.id}
                className=""
              >
                <div className="px-2 py-1 text-sm font-semibold text-gray-700">
                  {c.label}
                  {c.hint ? (
                    <span
                      className="inline-flex items-center ml-1 align-middle"
                      title={c.hint}
                    >
                      <Info size={12} className="text-gray-400" />
                    </span>
                  ) : null}
                </div>
                {c.render}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const panel = isFullscreen ? fullscreenOverlay : nonFullscreenPanel;

  return createPortal(panel, document.body);
};

export default FloatingInfoPanel;
