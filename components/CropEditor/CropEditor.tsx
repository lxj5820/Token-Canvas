import React, { useState, useCallback, useRef, useEffect } from "react";
import { Icons } from "../Icons";

const CROP_RATIOS = ["任意", "原比例", "1:1", "3:4", "4:3", "9:16", "16:9", "9:21", "21:9"];
const MIN_CROP_SIZE = 20;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
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

interface CropEditorProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  onClose: () => void;
  onCrop: (dataUrl: string, outputWidth: number, outputHeight: number) => void;
  isDark?: boolean;
}

export const CropEditor: React.FC<CropEditorProps> = ({
  imageSrc,
  imageHeight: origImageHeight,
  imageWidth: origImageWidth,
  onClose,
  onCrop,
  isDark = true,
}) => {
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState("原比例");
  const [renderedUrl, setRenderedUrl] = useState<string>("");
  const previewRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const imgRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<HandleId | "move">("move");
  const dragStartRef = useRef({ x: 0, y: 0, crop: { x: 0, y: 0, w: 0, h: 0 } });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const isRotated = rotation === 90 || rotation === 270;
      const outW = isRotated ? img.height : img.width;
      const outH = isRotated ? img.width : img.height;

      const cvs = document.createElement("canvas");
      cvs.width = outW;
      cvs.height = outH;
      const ctx = cvs.getContext("2d")!;

      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      setRenderedUrl(cvs.toDataURL("image/png"));
    };
  }, [imageSrc, rotation, flipH, flipV]);

  const getTargetRatio = useCallback((): number | null => {
    if (selectedRatio === "任意") return null;
    if (selectedRatio === "原比例") {
      const isRotated = rotation === 90 || rotation === 270;
      const imgW = isRotated ? origImageHeight : origImageWidth;
      const imgH = isRotated ? origImageWidth : origImageHeight;
      if (imgW === 0 || imgH === 0) return null;
      return imgW / imgH;
    }
    
    const [w, h] = selectedRatio.split(":").map(Number);
    if (isNaN(w) || isNaN(h) || h === 0) return null;
    return w / h;
  }, [selectedRatio, origImageWidth, origImageHeight, rotation]);

  useEffect(() => {
    if (!renderedUrl) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = renderedUrl;
    img.onload = () => {
      const container = previewRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      let scale = Math.min(
        containerWidth / img.width,
        containerHeight / img.height,
        1
      );
      
      scale = Math.max(scale, 0.01);
      
      const scaledW = img.width * scale;
      const scaledH = img.height * scale;
      const offsetX = (containerWidth - scaledW) / 2;
      const offsetY = (containerHeight - scaledH) / 2;

      scaleRef.current = scale;
      imgRectRef.current = { x: offsetX, y: offsetY, width: scaledW, height: scaledH };

      const targetRatio = getTargetRatio();
      let cw: number, ch: number;
      
      if (targetRatio !== null) {
        const imgAspect = scaledW / scaledH;
        if (imgAspect > targetRatio) {
          ch = scaledH * 0.9;
          cw = ch * targetRatio;
        } else {
          cw = scaledW * 0.9;
          ch = cw / targetRatio;
        }
      } else {
        cw = scaledW * 0.9;
        ch = scaledH * 0.9;
      }

      const cx = offsetX + (scaledW - cw) / 2;
      const cy = offsetY + (scaledH - ch) / 2;

      setCrop({
        x: cx,
        y: cy,
        w: cw,
        h: ch,
      });
    };
  }, [renderedUrl, getTargetRatio]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: HandleId | "move") => {
      e.preventDefault();
      e.stopPropagation();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        crop: { ...crop },
      };
      setIsDragging(true);
      setDragType(type);
    },
    [crop]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const sc = dragStartRef.current.crop;
      const imgRect = imgRectRef.current;
      const targetRatio = getTargetRatio();

      if (dragType === "move") {
        let newX = sc.x + dx;
        let newY = sc.y + dy;
        newX = Math.max(imgRect.x, Math.min(imgRect.x + imgRect.width - sc.w, newX));
        newY = Math.max(imgRect.y, Math.min(imgRect.y + imgRect.height - sc.h, newY));
        setCrop({ x: newX, y: newY, w: sc.w, h: sc.h });
        return;
      }

      const h = dragType;

      const isLeft = h === "nw" || h === "w" || h === "sw";
      const isRight = h === "ne" || h === "e" || h === "se";
      const isTop = h === "nw" || h === "n" || h === "ne";
      const isBottom = h === "sw" || h === "s" || h === "se";

      let anchorX: number, anchorY: number;
      if (isLeft) anchorX = sc.x + sc.w;
      else if (isRight) anchorX = sc.x;
      else anchorX = sc.x + sc.w / 2;

      if (isTop) anchorY = sc.y + sc.h;
      else if (isBottom) anchorY = sc.y;
      else anchorY = sc.y + sc.h / 2;

      let newWidth: number, newHeight: number;

      if (h === "n" || h === "s") {
        const deltaH = h === "n" ? -dy : dy;
        newHeight = sc.h + deltaH;
        if (targetRatio !== null) {
          newWidth = newHeight * targetRatio;
        } else {
          newWidth = sc.w;
        }
      } else if (h === "e" || h === "w") {
        const deltaW = h === "w" ? -dx : dx;
        newWidth = sc.w + deltaW;
        if (targetRatio !== null) {
          newHeight = newWidth / targetRatio;
        } else {
          newHeight = sc.h;
        }
      } else {
        const handleStartX = isLeft ? sc.x : sc.x + sc.w;
        const handleStartY = isTop ? sc.y : sc.y + sc.h;
        const startDist = Math.sqrt((handleStartX - anchorX) ** 2 + (handleStartY - anchorY) ** 2);
        const newDist = Math.sqrt((handleStartX + dx - anchorX) ** 2 + (handleStartY + dy - anchorY) ** 2);
        const scaleFactor = startDist > 0 ? newDist / startDist : 1;
        newWidth = sc.w * scaleFactor;
        newHeight = targetRatio !== null ? newWidth / targetRatio : sc.h * scaleFactor;
      }

      if (newWidth < MIN_CROP_SIZE) {
        newWidth = MIN_CROP_SIZE;
        if (targetRatio !== null) {
          newHeight = newWidth / targetRatio;
        }
      }
      if (newHeight < MIN_CROP_SIZE) {
        newHeight = MIN_CROP_SIZE;
        if (targetRatio !== null) {
          newWidth = newHeight * targetRatio;
        }
      }

      if (newWidth > imgRect.width) {
        newWidth = imgRect.width;
        if (targetRatio !== null) {
          newHeight = newWidth / targetRatio;
        }
      }
      if (newHeight > imgRect.height) {
        newHeight = imgRect.height;
        if (targetRatio !== null) {
          newWidth = newHeight * targetRatio;
        }
      }

      let newLeft: number, newTop: number;
      if (isLeft) newLeft = anchorX - newWidth;
      else if (isRight) newLeft = anchorX;
      else newLeft = anchorX - newWidth / 2;

      if (isTop) newTop = anchorY - newHeight;
      else if (isBottom) newTop = anchorY;
      else newTop = anchorY - newHeight / 2;

      if (newLeft < imgRect.x) newLeft = imgRect.x;
      if (newTop < imgRect.y) newTop = imgRect.y;
      if (newLeft + newWidth > imgRect.x + imgRect.width) newLeft = imgRect.x + imgRect.width - newWidth;
      if (newTop + newHeight > imgRect.y + imgRect.height) newTop = imgRect.y + imgRect.height - newHeight;

      setCrop({ x: newLeft, y: newTop, w: newWidth, h: newHeight });
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
  }, [isDragging, dragType, getTargetRatio]);

  const handleConfirm = useCallback(() => {
    if (!renderedUrl) return;

    const scale = scaleRef.current;
    const imgRect = imgRectRef.current;
    
    const sx = Math.round((crop.x - imgRect.x) / scale);
    const sy = Math.round((crop.y - imgRect.y) / scale);
    const sw = Math.round(crop.w / scale);
    const sh = Math.round(crop.h / scale);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = renderedUrl;
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width = sw;
      cvs.height = sh;
      const ctx = cvs.getContext("2d")!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const dataUrl = cvs.toDataURL("image/png");
      onCrop(dataUrl, sw, sh);
    };
  }, [renderedUrl, crop, onCrop]);

  const handleRotate = useCallback((direction: "cw" | "ccw") => {
    setRotation((prev) => {
      if (direction === "cw") return (prev + 90) % 360;
      return (prev - 90 + 360) % 360;
    });
  }, []);

  const handleFlipH = useCallback(() => setFlipH((prev) => !prev), []);
  const handleFlipV = useCallback(() => setFlipV((prev) => !prev), []);

  const handleRatioChange = useCallback((ratio: string) => {
    setSelectedRatio(ratio);
  }, []);

  const handleIds: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const isRotated = rotation === 90 || rotation === 270;
  const renderedW = isRotated ? origImageHeight : origImageWidth;
  const renderedH = isRotated ? origImageWidth : origImageHeight;

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
          裁剪
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
        ref={previewRef}
        className={`relative overflow-hidden border-b ${isDark ? "bg-[#0d0d0d] border-zinc-700/50" : "bg-gray-100 border-gray-200"}`}
        style={{ height: 400 }}
      >
        {renderedUrl && (
          <>
            <img
              src={renderedUrl}
              alt=""
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full object-contain"
              draggable={false}
            />
            
            {/* Dark overlay on non-cropped areas */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: 0,
                top: 0,
                width: imgRectRef.current.x,
                height: "100%",
                background: "rgba(0,0,0,0.6)",
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                left: imgRectRef.current.x + imgRectRef.current.width,
                top: 0,
                width: `calc(100% - ${imgRectRef.current.x + imgRectRef.current.width}px)`,
                height: "100%",
                background: "rgba(0,0,0,0.6)",
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                left: imgRectRef.current.x,
                top: 0,
                width: imgRectRef.current.width,
                height: imgRectRef.current.y,
                background: "rgba(0,0,0,0.6)",
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                left: imgRectRef.current.x,
                top: imgRectRef.current.y + imgRectRef.current.height,
                width: imgRectRef.current.width,
                height: `calc(100% - ${imgRectRef.current.y + imgRectRef.current.height}px)`,
                background: "rgba(0,0,0,0.6)",
              }}
            />
            
            {/* Crop area - interactive */}
            <div
              className="absolute cursor-move z-10"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.w,
                height: crop.h,
              }}
              onMouseDown={(e) => handleMouseDown(e, "move")}
            >
              <div className="absolute inset-0 border-2 border-white border-dashed" />
              
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 border-r border-white/30" />
                <div className="absolute left-2/3 top-0 bottom-0 border-r border-white/30" />
                <div className="absolute top-1/3 left-0 right-0 border-b border-white/30" />
                <div className="absolute top-2/3 left-0 right-0 border-b border-white/30" />
              </div>

              {handleIds.map((hid) => {
                const handleStyle: React.CSSProperties = {
                  position: "absolute",
                  width: 12,
                  height: 12,
                  background: "white",
                  border: "2px solid rgba(0,0,0,0.5)",
                  borderRadius: "2px",
                  cursor: HANDLE_CURSORS[hid],
                  zIndex: 20,
                };

                if (hid === "nw") { handleStyle.top = -6; handleStyle.left = -6; }
                if (hid === "n") { handleStyle.top = -6; handleStyle.left = "50%"; handleStyle.transform = "translateX(-50%)"; }
                if (hid === "ne") { handleStyle.top = -6; handleStyle.right = -6; }
                if (hid === "e") { handleStyle.top = "50%"; handleStyle.right = -6; handleStyle.transform = "translateY(-50%)"; }
                if (hid === "se") { handleStyle.bottom = -6; handleStyle.right = -6; }
                if (hid === "s") { handleStyle.bottom = -6; handleStyle.left = "50%"; handleStyle.transform = "translateX(-50%)"; }
                if (hid === "sw") { handleStyle.bottom = -6; handleStyle.left = -6; }
                if (hid === "w") { handleStyle.top = "50%"; handleStyle.left = -6; handleStyle.transform = "translateY(-50%)"; }

                return (
                  <div
                    key={hid}
                    style={handleStyle}
                    onMouseDown={(e) => handleMouseDown(e, hid)}
                  />
                );
              })}

              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {Math.round(crop.w / scaleRef.current)} × {Math.round(crop.h / scaleRef.current)}
              </div>
            </div>
          </>
        )}
      </div>

      <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDark ? "border-zinc-700/50" : "border-gray-200"}`}>
        <button
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            isDark ? "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 hover:text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => handleRotate("ccw")}
          title="逆时针旋转"
        >
          <Icons.RotateCcw size={14} />
          <span>逆时针90°</span>
        </button>
        <button
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            isDark ? "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 hover:text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => handleRotate("cw")}
          title="顺时针旋转"
        >
          <Icons.RotateCw size={14} />
          <span>顺时针90°</span>
        </button>
        <button
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            flipH ? "bg-yellow-500/20 text-yellow-400" : isDark ? "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 hover:text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={handleFlipH}
          title="水平镜像"
        >
          <Icons.FlipHorizontal size={14} />
          <span>水平镜像</span>
        </button>
        <button
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            flipV ? "bg-yellow-500/20 text-yellow-400" : isDark ? "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 hover:text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={handleFlipV}
          title="垂直镜像"
        >
          <Icons.FlipVertical size={14} />
          <span>垂直镜像</span>
        </button>
      </div>

      <div className={`px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b ${isDark ? "border-zinc-700/50" : "border-gray-200"}`}>
        {CROP_RATIOS.map((ratio) => (
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

      <div className="flex items-center justify-end px-4 py-3">
        <button
          className="h-9 px-6 rounded-lg text-[13px] font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 active:scale-[0.98]"
          onClick={handleConfirm}
        >
          <Icons.Check size={16} />
          <span>确定</span>
        </button>
      </div>
    </div>
  );
};
