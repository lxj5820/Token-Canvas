import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { NodeData } from "../../types";
import { Icons } from "../Icons";
import { EditableTitle } from "./Shared/NodeComponents";
import { LocalCustomDropdown } from "./Shared/LocalNodeComponents";
import { PanoramaViewer } from "../PanoramaEditor";
import type { PanoramaViewerRef } from "../PanoramaEditor";

interface PanoramaNodeProps {
  data: NodeData;
  updateData: (id: string, updates: Partial<NodeData>) => void;
  isDark?: boolean;
  selected?: boolean;
  showControls?: boolean;
  inputs?: string[];
  onPanoramaScreenshot?: (sourceNodeId: string, dataUrl: string, outputWidth: number, outputHeight: number) => void;
}

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1" },
  { label: "2:3", value: "2:3" },
  { label: "3:2", value: "3:2" },
  { label: "3:4", value: "3:4" },
  { label: "4:3", value: "4:3" },
  { label: "9:16", value: "9:16" },
  { label: "16:9", value: "16:9" },
  { label: "21:9", value: "21:9" },
];

const NODE_BASE_HEIGHT = 280;

const fitAspectInContainer = (
  containerW: number,
  containerH: number,
  ratio: string,
): { x: number; y: number; w: number; h: number } => {
  const [rw, rh] = ratio.split(":").map(Number);
  const targetAspect = rw / rh;
  const containerAspect = containerW / containerH;
  if (containerAspect > targetAspect) {
    const h = containerH;
    const w = containerH * targetAspect;
    return { x: (containerW - w) / 2, y: 0, w, h };
  } else {
    const w = containerW;
    const h = containerW / targetAspect;
    return { x: 0, y: (containerH - h) / 2, w, h };
  }
};

export const PanoramaNode: React.FC<PanoramaNodeProps> = ({
  data,
  updateData,
  isDark = true,
  selected,
  showControls,
  inputs,
  onPanoramaScreenshot,
}) => {
  const viewerRef = useRef<PanoramaViewerRef>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const isPanoramaMode = data.isPanoramaMode !== false;
  const yaw = data.panoramaYaw ?? 0;
  const pitch = data.panoramaPitch ?? 0;
  const fov = data.panoramaFov ?? 75;
  const aspectRatio = data.panoramaAspectRatio ?? "16:9";
  const showGrid = data.panoramaShowGrid ?? false;

  const imageSrc = inputs && inputs.length > 0 ? inputs[0] : (data.imageSrc || "");
  const hasImage = !!imageSrc;

  const containerBorder = selected
    ? "border-yellow-400 node-selected-glow"
    : isDark ? "border-zinc-800" : "border-gray-200";
  const containerBg = isDark ? "bg-[#1a1a1a]" : "bg-white";

  const togglePanoramaMode = useCallback(() => {
    updateData(data.id, { isPanoramaMode: !isPanoramaMode });
  }, [data.id, isPanoramaMode, updateData]);

  const handleViewChange = useCallback((newYaw: number, newPitch: number, newFov: number) => {
    updateData(data.id, {
      panoramaYaw: newYaw,
      panoramaPitch: newPitch,
      panoramaFov: newFov,
    });
  }, [data.id, updateData]);

  const handleResetView = useCallback(() => {
    viewerRef.current?.resetView();
  }, []);

  const handleToggleGrid = useCallback(() => {
    updateData(data.id, { panoramaShowGrid: !showGrid });
  }, [data.id, showGrid, updateData]);

  const handleAspectRatioChange = useCallback((newRatio: string) => {
    const [rw, rh] = newRatio.split(":").map(Number);
    const targetAspect = rw / rh;
    const currentArea = data.width * data.height;
    const newHeight = Math.round(Math.sqrt(currentArea / targetAspect));
    const newWidth = Math.round(newHeight * targetAspect);
    updateData(data.id, {
      panoramaAspectRatio: newRatio,
      width: Math.max(200, newWidth),
      height: Math.max(200, newHeight),
    });
  }, [data.id, updateData, data.width, data.height]);

  const handleScreenshot = useCallback(() => {
    const dataUrl = viewerRef.current?.captureScreenshot();
    if (dataUrl && onPanoramaScreenshot) {
      const [rw, rh] = aspectRatio.split(":").map(Number);
      const shotH = 720;
      const shotW = Math.round(shotH * rw / rh);
      onPanoramaScreenshot(data.id, dataUrl, shotW, shotH);
    }
  }, [data.id, aspectRatio, onPanoramaScreenshot]);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleExitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleDownload = useCallback(() => {
    const dataUrl = viewerRef.current?.captureScreenshot();
    if (dataUrl) {
      const link = document.createElement("a");
      link.download = `panorama_screenshot_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, []);

  const btnBase = isDark
    ? "text-zinc-300 hover:text-white hover:bg-zinc-700/50 active:bg-zinc-600/50"
    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200";
  const btnActive = isDark
    ? "text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30"
    : "text-yellow-600 bg-yellow-100 hover:bg-yellow-200";

  const viewerContainerW = data.width - 8;
  const viewerContainerH = data.height - 40;
  const viewerFit = useMemo(
    () => fitAspectInContainer(Math.max(100, viewerContainerW), Math.max(100, viewerContainerH), aspectRatio),
    [viewerContainerW, viewerContainerH, aspectRatio]
  );

  const fullscreenFit = useMemo(
    () => fitAspectInContainer(window.innerWidth - 64, window.innerHeight - 64, aspectRatio),
    [aspectRatio, isFullscreen]
  );

  const fullscreenOverlay = isFullscreen ? createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-8 gap-1 px-3 cursor-pointer ${btnBase} bg-black/50`}
          onClick={handleResetView}
          title="重置视角"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span className="text-sm">重置</span>
        </button>
        <button
          className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-8 gap-1 px-3 cursor-pointer ${showGrid ? btnActive : btnBase} bg-black/50`}
          onClick={handleToggleGrid}
          title="构图参考线"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          <span className="text-sm">参考线</span>
        </button>
        <button
          className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-8 gap-1 px-3 cursor-pointer ${btnBase} bg-black/50`}
          onClick={handleScreenshot}
          title="截图"
        >
          <Icons.Camera size={16} />
          <span className="text-sm">截图</span>
        </button>
        <button
          className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-8 w-8 p-1.5 cursor-pointer ${btnBase} bg-black/50`}
          onClick={handleExitFullscreen}
          title="退出全屏 (Esc)"
        >
          <Icons.Minimize size={16} />
        </button>
      </div>
      <div className="w-full h-full flex items-center justify-center p-8">
        <PanoramaViewer
          imageSrc={imageSrc}
          width={fullscreenFit.w}
          height={fullscreenFit.h}
          yaw={yaw}
          pitch={pitch}
          fov={fov}
          showGrid={showGrid}
          onViewChange={handleViewChange}
          isDark={true}
        />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {fullscreenOverlay}

      <div className="absolute bottom-full left-0 w-full mb-2 flex items-center justify-between pointer-events-auto">
        <EditableTitle
          title={data.title}
          onUpdate={(t) => updateData(data.id, { title: t })}
          isDark={isDark}
        />
      </div>

      {hasImage && selected && showControls && (
        <div
          className="absolute top-[-18px] left-1/2 -translate-x-1/2 -translate-y-full z-[1001] pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className={`${isDark ? 'bg-[#1a1a1a]/95 border-zinc-700/50' : 'bg-white/95 border-gray-200'} backdrop-blur-xl box-border flex w-fit items-center justify-center gap-1 rounded-xl p-1.5 border shadow-md`}
          >
            <button
              className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 gap-1 px-2 cursor-pointer ${isPanoramaMode ? btnActive : btnBase}`}
              title={isPanoramaMode ? "切换为图片" : "切换为全景"}
              onClick={togglePanoramaMode}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 14 14" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path fill="currentColor" d="M1.48 7.624a.13.13 0 0 1 .198.112.14.14 0 0 1-.045.102c-.299.28-.465.588-.465.912 0 .99 1.543 1.835 3.718 2.174v-.88c0-.192.221-.301.375-.184l1.588 1.222a.35.35 0 0 1-.007.56L5.256 12.8a.233.233 0 0 1-.37-.189v-.565C2.218 11.662.294 10.569.293 9.28c0-.615.438-1.186 1.186-1.656m10.845.112a.13.13 0 0 1 .198-.112c.748.47 1.186 1.041 1.186 1.656 0 1.36-2.14 2.5-5.033 2.824a.2.2 0 0 1-.22-.198v-.716c0-.102.078-.188.18-.2 2.425-.283 4.197-1.179 4.198-2.24 0-.324-.166-.632-.465-.912a.14.14 0 0 1-.044-.102m-1.977-6.355a1.34 1.34 0 0 1 1.254.78q.174.356.174.797v4.294q0 .441-.174.804a1.37 1.37 0 0 1-.496.564 1.35 1.35 0 0 1-.758.21q-.456 0-.779-.21a1.35 1.35 0 0 1-.485-.564 1.9 1.9 0 0 1-.164-.804V2.958q0-.446.169-.803.172-.357.495-.565.323-.21.764-.21M4.622 2.532 3.551 8.75H2.44l1.09-6.229H1.925v-1.06h2.697zm2.073-1.151q.392 0 .665.13.274.128.442.366t.243.575q.08.333.079.744 0 .492-.148 1.062a9 9 0 0 1-.388 1.165q-.238.594-.535 1.175-.298.575-.605 1.09h1.696V8.75H5.238V7.688q.343-.525.664-1.105.323-.58.58-1.166a8 8 0 0 0 .417-1.14q.154-.55.154-1.011 0-.328-.065-.61-.064-.283-.293-.283-.227 0-.292.282a2.7 2.7 0 0 0-.064.61v.506h-1.07v-.505q-.001-.436.073-.784.079-.351.248-.595.169-.247.441-.376.273-.13.664-.13m3.653 1.042a.28.28 0 0 0-.273.168.8.8 0 0 0-.084.367v4.294q0 .213.084.377.084.159.273.16a.29.29 0 0 0 .273-.16.8.8 0 0 0 .084-.377V2.958a.8.8 0 0 0-.084-.377.29.29 0 0 0-.273-.158" />
              </svg>
              <span className="whitespace-nowrap text-xs leading-none">{isPanoramaMode ? "全景" : "图片"}</span>
            </button>

            {isPanoramaMode && (
              <>
                <button
                  className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 gap-1 px-2 cursor-pointer ${btnBase}`}
                  title="截图"
                  onClick={handleScreenshot}
                >
                  <Icons.Camera size={14} />
                  <span className="whitespace-nowrap text-xs leading-none">截图</span>
                </button>

                <LocalCustomDropdown
                  icon={Icons.Crop}
                  options={ASPECT_RATIOS.map(r => r.value)}
                  value={aspectRatio}
                  onChange={(val: string) => handleAspectRatioChange(val)}
                  isOpen={activeDropdown === "ratio"}
                  onToggle={() => setActiveDropdown(activeDropdown === "ratio" ? null : "ratio")}
                  onClose={() => setActiveDropdown(null)}
                  isDark={isDark}
                />

                <button
                  className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${btnBase}`}
                  title="重置视角"
                  onClick={handleResetView}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>

                <button
                  className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${showGrid ? btnActive : btnBase}`}
                  title="构图参考线"
                  onClick={handleToggleGrid}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="3" y1="15" x2="21" y2="15" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                  </svg>
                </button>

                <button
                  className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${btnBase}`}
                  title="全屏预览"
                  onClick={handleFullscreen}
                >
                  <Icons.Maximize2 size={13} />
                </button>
              </>
            )}

            <div className={`${isDark ? 'bg-zinc-600' : 'bg-gray-300'} mx-0.5 h-5 w-px`} aria-hidden="true" />

            <button
              className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${btnBase}`}
              title="下载"
              onClick={handleDownload}
            >
              <Icons.Download size={13} />
            </button>
          </div>
        </div>
      )}

      <div
        className={`w-full h-full relative group rounded-xl border ${containerBorder} ${containerBg} overflow-hidden shadow-lg transition-all duration-200`}
      >
        {hasImage ? (
          isPanoramaMode ? (
            <div className="w-full h-full flex items-center justify-center nodrag nowheel"
              style={{ background: isDark ? "#111" : "#ddd" }}
            >
              <PanoramaViewer
                ref={viewerRef}
                imageSrc={imageSrc}
                width={viewerFit.w}
                height={viewerFit.h}
                yaw={yaw}
                pitch={pitch}
                fov={fov}
                showGrid={showGrid}
                onViewChange={handleViewChange}
                isDark={isDark}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={imageSrc}
                alt="panorama source"
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
            </div>
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
            <Icons.Image size={32} className={isDark ? "text-zinc-500" : "text-gray-400"} />
            <span className={`text-[11px] font-medium select-none ${isDark ? "text-zinc-500" : "text-gray-500"}`}>
              等待输入图片
            </span>
          </div>
        )}
      </div>
    </>
  );
};
