import React, { useState, useCallback, useRef, useEffect } from "react";
import { Icons } from "../Icons";
import { LocalCustomDropdown } from "../Nodes/Shared/LocalNodeComponents";
import { IMAGE_HANDLERS } from "../../services/mode/image/configurations";

const CANVAS_RATIOS = ["原比例", "1:1", "3:4", "4:3", "9:16", "16:9", "9:21", "21:9"];
const RESOLUTIONS = ["1k", "2k", "4k"];

const RESOLUTION_MAP: Record<string, { w: number; h: number }> = {
  "1k": { w: 1024, h: 1024 },
  "2k": { w: 2048, h: 2048 },
  "4k": { w: 4096, h: 4096 },
};

const MIN_IMAGE_SIZE = 30;

interface ImageBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ExpandImageGenerateParams {
  aspectRatio: string;
  resolution: string;
  expandLeft: number;
  expandTop: number;
  expandRight: number;
  expandBottom: number;
  outputWidth: number;
  outputHeight: number;
  count: number;
  model?: string;
  includePrompt: boolean;
  prompt?: string;
  referenceImage?: string;
}

interface ExpandImageEditorProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onClose: () => void;
  onGenerate: (params: ExpandImageGenerateParams) => void;
  isDark?: boolean;
  prompt?: string;
  isLoading?: boolean;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  imageModels?: string[];
}

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

const parseRatio = (ratio: string): number | null => {
  if (ratio === "原比例") return null;
  const [w, h] = ratio.split(":").map(Number);
  return w / h;
};

export const ExpandImageEditor: React.FC<ExpandImageEditorProps> = ({
  imageSrc,
  imageWidth,
  imageHeight,
  onClose,
  onGenerate,
  isDark = true,
  prompt,
  isLoading,
  model: defaultModel,
  aspectRatio: defaultAspectRatio,
  resolution: defaultResolution,
  imageModels = [],
}) => {
  const [selectedRatio, setSelectedRatio] = useState(defaultAspectRatio || "原比例");
  const [selectedResolution, setSelectedResolution] = useState(defaultResolution || "1k");
  const [count, setCount] = useState(1);
  const [selectedModel, setSelectedModel] = useState(defaultModel || "Banana 2");
  const [includePrompt, setIncludePrompt] = useState(false);
  const [promptInput, setPromptInput] = useState(prompt || "");
  const [countDropdownOpen, setCountDropdownOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  const [canvasBox, setCanvasBox] = useState<ImageBox>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const [imageBox, setImageBox] = useState<ImageBox>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<HandleId | "move">("move");
  const dragStartRef = useRef({ x: 0, y: 0, imageBox: { ...imageBox }, canvasBox: { ...canvasBox } });

  const imgAspect = imageWidth / imageHeight;

  useEffect(() => {
    setPromptInput(prompt || "");
  }, [prompt]);

  useEffect(() => {
    if (defaultModel) setSelectedModel(defaultModel);
  }, [defaultModel]);

  useEffect(() => {
    if (defaultAspectRatio) setSelectedRatio(defaultAspectRatio);
  }, [defaultAspectRatio]);

  useEffect(() => {
    if (defaultResolution) setSelectedResolution(defaultResolution);
  }, [defaultResolution]);

  useEffect(() => {
    const container = previewAreaRef.current;
    if (!container) return;

    const updateSize = () => {
      setPreviewSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (previewSize.width === 0 || previewSize.height === 0) return;
    if (!imgAspect || !isFinite(imgAspect)) return;

    const ratio = parseRatio(selectedRatio);
    const targetAspect = ratio ?? imgAspect;

    const usableW = previewSize.width;
    const usableH = previewSize.height;

    let cw: number, ch: number;
    if (targetAspect > usableW / usableH) {
      cw = usableW;
      ch = cw / targetAspect;
    } else {
      ch = usableH;
      cw = ch * targetAspect;
    }

    const canvasLeft = (usableW - cw) / 2;
    const canvasTop = (usableH - ch) / 2;

    setCanvasBox({
      left: canvasLeft,
      top: canvasTop,
      width: cw,
      height: ch,
    });

    const imgScale = 0.65;
    let iw: number, ih: number;
    if (imgAspect > cw / ch) {
      iw = cw * imgScale;
      ih = iw / imgAspect;
    } else {
      ih = ch * imgScale;
      iw = ih * imgAspect;
    }

    const imgLeft = canvasLeft + (cw - iw) / 2;
    const imgTop = canvasTop + (ch - ih) / 2;

    setImageBox({
      left: imgLeft,
      top: imgTop,
      width: iw,
      height: ih,
    });
  }, [selectedRatio, previewSize, imgAspect]);

  const handleRatioChange = useCallback((val: string) => {
    setSelectedRatio(val);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: HandleId | "move") => {
      e.preventDefault();
      e.stopPropagation();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        imageBox: { ...imageBox },
        canvasBox: { ...canvasBox },
      };
      setIsDragging(true);
      setDragType(type);
    },
    [imageBox, canvasBox]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const sb = dragStartRef.current.imageBox;
      const cb = dragStartRef.current.canvasBox;

      if (dragType === "move") {
        let newLeft = sb.left + dx;
        let newTop = sb.top + dy;

        newLeft = Math.max(cb.left, Math.min(cb.left + cb.width - sb.width, newLeft));
        newTop = Math.max(cb.top, Math.min(cb.top + cb.height - sb.height, newTop));

        setImageBox({ left: newLeft, top: newTop, width: sb.width, height: sb.height });
        return;
      }

      const h = dragType;

      const isLeft = h === "nw" || h === "w" || h === "sw";
      const isRight = h === "ne" || h === "e" || h === "se";
      const isTop = h === "nw" || h === "n" || h === "ne";
      const isBottom = h === "sw" || h === "s" || h === "se";

      let anchorX: number, anchorY: number;
      if (isLeft) anchorX = sb.left + sb.width;
      else if (isRight) anchorX = sb.left;
      else anchorX = sb.left + sb.width / 2;

      if (isTop) anchorY = sb.top + sb.height;
      else if (isBottom) anchorY = sb.top;
      else anchorY = sb.top + sb.height / 2;

      let newWidth: number, newHeight: number;

      if (h === "n" || h === "s") {
        const deltaH = h === "n" ? -dy : dy;
        newHeight = sb.height + deltaH;
        newWidth = newHeight * imgAspect;
      } else if (h === "e" || h === "w") {
        const deltaW = h === "w" ? -dx : dx;
        newWidth = sb.width + deltaW;
        newHeight = newWidth / imgAspect;
      } else {
        const handleStartX = isLeft ? sb.left : sb.left + sb.width;
        const handleStartY = isTop ? sb.top : sb.top + sb.height;
        const startDist = Math.sqrt((handleStartX - anchorX) ** 2 + (handleStartY - anchorY) ** 2);
        const newDist = Math.sqrt((handleStartX + dx - anchorX) ** 2 + (handleStartY + dy - anchorY) ** 2);
        const scaleFactor = startDist > 0 ? newDist / startDist : 1;
        newWidth = sb.width * scaleFactor;
        newHeight = sb.height * scaleFactor;
      }

      if (newWidth < MIN_IMAGE_SIZE) {
        newWidth = MIN_IMAGE_SIZE;
        newHeight = newWidth / imgAspect;
      }
      if (newHeight < MIN_IMAGE_SIZE) {
        newHeight = MIN_IMAGE_SIZE;
        newWidth = newHeight * imgAspect;
      }

      if (newWidth > cb.width) {
        newWidth = cb.width;
        newHeight = newWidth / imgAspect;
      }
      if (newHeight > cb.height) {
        newHeight = cb.height;
        newWidth = newHeight * imgAspect;
      }

      let newLeft: number, newTop: number;
      if (isLeft) newLeft = anchorX - newWidth;
      else if (isRight) newLeft = anchorX;
      else newLeft = anchorX - newWidth / 2;

      if (isTop) newTop = anchorY - newHeight;
      else if (isBottom) newTop = anchorY;
      else newTop = anchorY - newHeight / 2;

      if (newLeft < cb.left) newLeft = cb.left;
      if (newTop < cb.top) newTop = cb.top;
      if (newLeft + newWidth > cb.left + cb.width) newLeft = cb.left + cb.width - newWidth;
      if (newTop + newHeight > cb.top + cb.height) newTop = cb.top + cb.height - newHeight;

      setImageBox({ left: newLeft, top: newTop, width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragType, imgAspect]);

  const handleGenerateClick = useCallback(async () => {
    const expandLeft = Math.round(imageBox.left - canvasBox.left);
    const expandTop = Math.round(imageBox.top - canvasBox.top);
    const expandRight = Math.round((canvasBox.left + canvasBox.width) - (imageBox.left + imageBox.width));
    const expandBottom = Math.round((canvasBox.top + canvasBox.height) - (imageBox.top + imageBox.height));

    const resBase = RESOLUTION_MAP[selectedResolution];
    const maxDim = Math.max(resBase.w, resBase.h);
    const scale = maxDim / Math.max(canvasBox.width, canvasBox.height);

    const outputWidth = Math.round(canvasBox.width * scale);
    const outputHeight = Math.round(canvasBox.height * scale);

    // 生成参考图：原图在虚线框中的位置
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(canvasBox.width);
    canvas.height = Math.round(canvasBox.height);
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // 绘制参考图背景（虚线框区域）
      ctx.fillStyle = "rgba(234,179,8,0.02)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 计算原图在canvas中的位置
      const imgLeft = Math.round(imageBox.left - canvasBox.left);
      const imgTop = Math.round(imageBox.top - canvasBox.top);
      const imgWidth = Math.round(imageBox.width);
      const imgHeight = Math.round(imageBox.height);
      
      // 加载原图并绘制
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, imgLeft, imgTop, imgWidth, imgHeight);
          resolve();
        };
        img.onerror = () => {
          resolve();
        };
        img.src = imageSrc;
      });
    }

    const referenceImage = canvas.toDataURL("image/png");

    onGenerate({
      aspectRatio: selectedRatio,
      resolution: selectedResolution,
      expandLeft: Math.round(expandLeft * scale),
      expandTop: Math.round(expandTop * scale),
      expandRight: Math.round(expandRight * scale),
      expandBottom: Math.round(expandBottom * scale),
      outputWidth,
      outputHeight,
      count,
      model: selectedModel,
      includePrompt,
      prompt: promptInput,
      referenceImage,
    });
  }, [imageBox, canvasBox, selectedRatio, selectedResolution, count, selectedModel, includePrompt, promptInput, onGenerate, imageSrc]);

  const handler = IMAGE_HANDLERS[selectedModel] || IMAGE_HANDLERS["Banana 2"];
  const rules = handler.rules;
  const supportedRatios = rules.ratios || ["1:1", "16:9"];
  const supportedResolutions = rules.resolutions || ["1k"];

  const handleIds: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  const resBase = RESOLUTION_MAP[selectedResolution] || RESOLUTION_MAP["2k"];
  const maxDim = Math.max(resBase.w, resBase.h);
  const scale = maxDim / Math.max(canvasBox.width, canvasBox.height);

  const expandLeft = imageBox.left - canvasBox.left;
  const expandTop = imageBox.top - canvasBox.top;
  const expandRight = (canvasBox.left + canvasBox.width) - (imageBox.left + imageBox.width);
  const expandBottom = (canvasBox.top + canvasBox.height) - (imageBox.top + imageBox.height);

  const outputW = Math.round(canvasBox.width * scale);
  const outputH = Math.round(canvasBox.height * scale);

  const scaledExpandTop = Math.round(expandTop * scale);
  const scaledExpandBottom = Math.round(expandBottom * scale);
  const scaledExpandLeft = Math.round(expandLeft * scale);
  const scaledExpandRight = Math.round(expandRight * scale);

  useEffect(() => {
    if (!countDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".count-dropdown-container")) {
        setCountDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [countDropdownOpen]);

  return (
    <div
      className={`rounded-2xl shadow-2xl overflow-hidden border backdrop-blur-xl ${
        isDark ? "bg-[#1a1a1a]/95 border-zinc-700/50" : "bg-white/95 border-gray-200 shadow-xl"
      }`}
      style={{ width: "auto", minWidth: 480, maxWidth: "100%" }}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-zinc-700/50" : "border-gray-200"}`}
      >
        <h1 className={`text-[15px] font-semibold ${isDark ? "text-zinc-200" : "text-gray-900"}`}>
          扩图
        </h1>
        <button
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            isDark ? "text-zinc-400 hover:bg-zinc-700/50 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          onClick={onClose}
        >
          <Icons.X size={18} />
        </button>
      </div>

      <div
        ref={previewAreaRef}
        className={`relative border-b overflow-hidden ${isDark ? "bg-[#0d0d0d] border-zinc-700/50" : "bg-gray-100 border-gray-200"}`}
        style={{ height: 340 }}
      >
        {/* Canvas area (target output) */}
        <div
          className="absolute"
          style={{
            left: canvasBox.left,
            top: canvasBox.top,
            width: canvasBox.width,
            height: canvasBox.height,
            background: isDark
              ? "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(234,179,8,0.04) 6px, rgba(234,179,8,0.04) 12px)"
              : "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(234,179,8,0.06) 6px, rgba(234,179,8,0.06) 12px)",
            border: `2px dashed ${isDark ? "rgba(234,179,8,0.25)" : "rgba(234,179,8,0.35)"}`,
            borderRadius: 4,
            zIndex: 1,
          }}
        >
          {/* Expand region labels */}
          {(() => {
            return (
              <>
                {scaledExpandTop > 10 && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-1 pointer-events-none" style={{ zIndex: 5 }}>
                    <span className={`text-[9px] px-1 rounded ${isDark ? "text-yellow-500/60" : "text-yellow-600/60"}`}>
                      +{scaledExpandTop}px
                    </span>
                  </div>
                )}
                {scaledExpandBottom > 10 && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-1 pointer-events-none" style={{ zIndex: 5 }}>
                    <span className={`text-[9px] px-1 rounded ${isDark ? "text-yellow-500/60" : "text-yellow-600/60"}`}>
                      +{scaledExpandBottom}px
                    </span>
                  </div>
                )}
                {scaledExpandLeft > 10 && (
                  <div className="absolute top-1/2 -translate-y-1/2 left-1 pointer-events-none" style={{ zIndex: 5 }}>
                    <span className={`text-[9px] px-1 rounded ${isDark ? "text-yellow-500/60" : "text-yellow-600/60"}`}>
                      +{scaledExpandLeft}px
                    </span>
                  </div>
                )}
                {scaledExpandRight > 10 && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-1 pointer-events-none" style={{ zIndex: 5 }}>
                    <span className={`text-[9px] px-1 rounded ${isDark ? "text-yellow-500/60" : "text-yellow-600/60"}`}>
                      +{scaledExpandRight}px
                    </span>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Image (draggable within canvas) */}
        <div
          className="absolute"
          style={{
            left: imageBox.left,
            top: imageBox.top,
            width: imageBox.width,
            height: imageBox.height,
            cursor: isDragging && dragType === "move" ? "grabbing" : "grab",
            zIndex: 2,
          }}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).dataset.handle) return;
            handleMouseDown(e, "move");
          }}
        >
          <img
            src={imageSrc}
            alt=""
            className="w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              border: "2px solid rgba(234,179,8,0.7)",
              boxShadow: "0 0 12px rgba(234,179,8,0.2)",
            }}
          />

          {/* Resize handles */}
          {handleIds.map((hid) => {
            const handleStyle: React.CSSProperties = {
              position: "absolute",
              width: 10,
              height: 10,
              background: "#eab308",
              border: "2px solid rgba(255,255,255,0.9)",
              borderRadius: 2,
              cursor: HANDLE_CURSORS[hid],
              zIndex: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
            };

            if (hid === "nw") { handleStyle.top = -5; handleStyle.left = -5; }
            if (hid === "n") { handleStyle.top = -5; handleStyle.left = "50%"; handleStyle.transform = "translateX(-50%)"; }
            if (hid === "ne") { handleStyle.top = -5; handleStyle.right = -5; }
            if (hid === "e") { handleStyle.top = "50%"; handleStyle.right = -5; handleStyle.transform = "translateY(-50%)"; }
            if (hid === "se") { handleStyle.bottom = -5; handleStyle.right = -5; }
            if (hid === "s") { handleStyle.bottom = -5; handleStyle.left = "50%"; handleStyle.transform = "translateX(-50%)"; }
            if (hid === "sw") { handleStyle.bottom = -5; handleStyle.left = -5; }
            if (hid === "w") { handleStyle.top = "50%"; handleStyle.left = -5; handleStyle.transform = "translateY(-50%)"; }

            return (
              <div
                key={hid}
                data-handle={hid}
                style={handleStyle}
                onMouseDown={(e) => handleMouseDown(e, hid)}
              />
            );
          })}
        </div>

        {/* Canvas dimension label */}
        <div
          className="absolute pointer-events-none z-[4]"
          style={{
            left: canvasBox.left + 6,
            top: canvasBox.top + 6,
          }}
        >
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDark ? "bg-black/60 text-yellow-400" : "bg-white/80 text-yellow-600"}`}>
            输出 {outputW}×{outputH}
          </span>
        </div>
      </div>

      <div className={`px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b ${isDark ? "border-zinc-700/50" : "border-gray-200"}`}>
        {CANVAS_RATIOS.map((ratio) => (
          <button
            key={ratio}
            className={`shrink-0 h-7 px-3 rounded-lg text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap border ${
              selectedRatio === ratio
                ? isDark
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                  : "bg-yellow-50 text-yellow-600 border-yellow-300"
                : isDark
                  ? "bg-zinc-700/50 text-zinc-400 border-zinc-700/50 hover:text-zinc-200"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:text-gray-700"
            }`}
            onClick={() => handleRatioChange(ratio)}
          >
            {ratio}
          </button>
        ))}
      </div>

      <div
        className={`px-4 py-3 border-b ${isDark ? "border-zinc-700/50" : "border-gray-200"}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[12px] ${isDark ? "text-zinc-400" : "text-gray-500"}`}>
            提示词
          </span>
          <button
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              includePrompt
                ? "bg-yellow-500"
                : isDark
                  ? "bg-zinc-700"
                  : "bg-gray-300"
            }`}
            onClick={() => setIncludePrompt(!includePrompt)}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
              style={{ left: includePrompt ? 18 : 2 }}
            />
          </button>
        </div>

        {includePrompt && (
          <textarea
            className="w-full border rounded-xl px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/20 min-h-[72px] no-scrollbar transition-all bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 focus:border-yellow-500 text-white placeholder-zinc-500"
            placeholder="输入原始描述提示词..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
        )}
      </div>

      <div className="flex items-center px-4 py-3">
        <div className="flex-1" />

        <div className="flex items-center gap-2 mr-3">
          <LocalCustomDropdown
            options={imageModels}
            value={selectedModel}
            onChange={(val: string) => setSelectedModel(val)}
            isOpen={activeDropdown === "model"}
            onToggle={() => setActiveDropdown(activeDropdown === "model" ? null : "model")}
            onClose={() => setActiveDropdown(null)}
            align="left"
            width="w-[130px]"
            isDark={isDark}
          />
          <LocalCustomDropdown
            icon={Icons.Crop}
            options={supportedRatios}
            value={selectedRatio}
            onChange={handleRatioChange}
            isOpen={activeDropdown === "ratio"}
            onToggle={() => setActiveDropdown(activeDropdown === "ratio" ? null : "ratio")}
            onClose={() => setActiveDropdown(null)}
            isDark={isDark}
          />
          <LocalCustomDropdown
            icon={Icons.Monitor}
            options={supportedResolutions}
            value={selectedResolution}
            onChange={(val: string) => setSelectedResolution(val)}
            isOpen={activeDropdown === "res"}
            onToggle={() => setActiveDropdown(activeDropdown === "res" ? null : "res")}
            onClose={() => setActiveDropdown(null)}
            disabledOptions={["1k", "2k", "4k"].filter((r) => !supportedResolutions.includes(r))}
            isDark={isDark}
          />
        </div>

        <div className="flex items-center gap-2 mr-3 count-dropdown-container relative">
          <button
            className="flex items-center gap-2 cursor-pointer group h-8 px-3 rounded-lg border transition-all border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700"
            onClick={() => setCountDropdownOpen(!countDropdownOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-colors text-zinc-400 group-hover:text-white"
              aria-hidden="true"
            >
              <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path>
              <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path>
              <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>
            </svg>
            <span className="text-xs font-medium transition-colors select-none text-zinc-300 group-hover:text-white min-w-[20px] text-center">
              {count}
            </span>
          </button>

          {countDropdownOpen && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max min-w-[130px] bg-[#1a1a1a] border-zinc-700 border rounded-xl shadow-2xl py-1.5 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-visible">
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`relative px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-between cursor-pointer mb-0.5 ${
                      count === n
                        ? "bg-yellow-500/15 text-yellow-400"
                        : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    }`}
                    onClick={() => {
                      setCount(n);
                      setCountDropdownOpen(false);
                    }}
                  >
                    <span className="whitespace-nowrap pr-2">{n}</span>
                    {count === n && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-check text-yellow-400 shrink-0 ml-2"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5"></path>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          className="h-9 px-6 rounded-lg text-[13px] font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 active:scale-[0.98]"
          onClick={handleGenerateClick}
          disabled={isLoading}
        >
          {isLoading ? (
            <Icons.Loader2 size={14} className="animate-spin" />
          ) : (
            <Icons.Wand2 size={14} />
          )}
          <span>{isLoading ? "生成中" : "生成"}</span>
        </button>
      </div>
    </div>
  );
};
