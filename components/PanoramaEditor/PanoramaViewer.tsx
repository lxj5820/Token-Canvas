import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

export interface PanoramaViewerRef {
  captureScreenshot: () => string | null;
  resetView: () => void;
}

interface PanoramaViewerProps {
  imageSrc: string;
  width: number;
  height: number;
  yaw?: number;
  pitch?: number;
  fov?: number;
  showGrid?: boolean;
  onViewChange?: (yaw: number, pitch: number, fov: number) => void;
  isDark?: boolean;
}

const LOW_QUALITY_SCALE = 0.65;
const HI_QUALITY_SCALE = Math.min(window.devicePixelRatio || 1, 2);
const HI_QUALITY_DELAY = 60;

const renderPanorama = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  td: ImageData,
  tw: number,
  th: number,
  yaw: number,
  pitch: number,
  fov: number,
  showGrid: boolean,
) => {
  if (cw === 0 || ch === 0) return;

  const y = yaw * Math.PI / 180;
  const p = pitch * Math.PI / 180;
  const f = fov * Math.PI / 180;

  const aspect = cw / ch;
  const halfFovX = f * aspect / 2;
  const halfFovY = f / 2;

  const cosY = Math.cos(y);
  const sinY = Math.sin(y);
  const cosP = Math.cos(p);
  const sinP = Math.sin(p);

  const rightX = cosY;
  const rightY = 0;
  const rightZ = -sinY;
  const upX = -sinY * sinP;
  const upY = cosP;
  const upZ = -cosY * sinP;
  const fwdX = -sinY * cosP;
  const fwdY = -sinP;
  const fwdZ = -cosY * cosP;

  const imgData = ctx.createImageData(cw, ch);
  const pixels = imgData.data;
  const srcPixels = td.data;

  const invCh = 1 / ch;
  const invCw = 1 / cw;
  const twoHalfFovY = 2 * halfFovY;
  const twoHalfFovX = 2 * halfFovX;
  const invTwoPi = 1 / (2 * Math.PI);
  const invPi = 1 / Math.PI;
  const twM1 = tw - 1;
  const thM1 = th - 1;

  for (let py = 0; py < ch; py++) {
    const ndcY = (0.5 - py * invCh) * twoHalfFovY;
    const baseDx = fwdX + ndcY * upX;
    const baseDy = fwdY + ndcY * upY;
    const baseDz = fwdZ + ndcY * upZ;
    for (let px = 0; px < cw; px++) {
      const ndcX = (px * invCw - 0.5) * twoHalfFovX;

      const dx = baseDx + ndcX * rightX;
      const dy = baseDy + ndcX * rightY;
      const dz = baseDz + ndcX * rightZ;

      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = dx / r;
      const ny = dy / r;
      const nz = dz / r;

      let lon = Math.atan2(nx, -nz);
      if (lon < 0) lon += 2 * Math.PI;
      const lat = Math.asin(ny > 1 ? 1 : ny < -1 ? -1 : ny);

      const u = lon * invTwoPi;
      const v = 0.5 - lat * invPi;

      const sxF = u * twM1;
      const syF = v * thM1;
      const sx0 = sxF | 0;
      const sy0 = syF | 0;
      const sx1 = sx0 + 1 < tw ? sx0 + 1 : sx0;
      const sy1 = sy0 + 1 < th ? sy0 + 1 : sy0;
      const fx = sxF - sx0;
      const fy = syF - sy0;
      const fx1 = 1 - fx;
      const fy1 = 1 - fy;

      const i00 = (sy0 * tw + sx0) << 2;
      const i10 = (sy0 * tw + sx1) << 2;
      const i01 = (sy1 * tw + sx0) << 2;
      const i11 = (sy1 * tw + sx1) << 2;

      const w00 = fx1 * fy1;
      const w10 = fx * fy1;
      const w01 = fx1 * fy;
      const w11 = fx * fy;

      const dstIdx = (py * cw + px) << 2;
      pixels[dstIdx] = srcPixels[i00] * w00 + srcPixels[i10] * w10 + srcPixels[i01] * w01 + srcPixels[i11] * w11;
      pixels[dstIdx + 1] = srcPixels[i00 + 1] * w00 + srcPixels[i10 + 1] * w10 + srcPixels[i01 + 1] * w01 + srcPixels[i11 + 1] * w11;
      pixels[dstIdx + 2] = srcPixels[i00 + 2] * w00 + srcPixels[i10 + 2] * w10 + srcPixels[i01 + 2] * w01 + srcPixels[i11 + 2] * w11;
      pixels[dstIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (showGrid) {
    drawCompositionGrid(ctx, cw, ch);
  }
};

const drawCompositionGrid = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  const thirdX1 = Math.round(cw / 3);
  const thirdX2 = Math.round(cw * 2 / 3);
  const thirdY1 = Math.round(ch / 3);
  const thirdY2 = Math.round(ch * 2 / 3);

  ctx.beginPath();
  ctx.moveTo(thirdX1, 0); ctx.lineTo(thirdX1, ch);
  ctx.moveTo(thirdX2, 0); ctx.lineTo(thirdX2, ch);
  ctx.moveTo(0, thirdY1); ctx.lineTo(cw, thirdY1);
  ctx.moveTo(0, thirdY2); ctx.lineTo(cw, thirdY2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(cw, ch);
  ctx.moveTo(cw, 0); ctx.lineTo(0, ch);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  const cx = cw / 2;
  const cy = ch / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
  ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(cw, ch) * 0.15, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
};

const PanoramaViewer = forwardRef<PanoramaViewerRef, PanoramaViewerProps>(({
  imageSrc,
  width,
  height,
  yaw: propYaw = 0,
  pitch: propPitch = 0,
  fov: propFov = 75,
  showGrid = false,
  onViewChange,
  isDark = true,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureDataRef = useRef<ImageData | null>(null);
  const textureSizeRef = useRef({ w: 0, h: 0 });
  const needsRenderRef = useRef(true);
  const qualityRef = useRef<"low" | "high">("high");
  const hiQualityTimerRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const isInteractingRef = useRef(false);
  const syncTimerRef = useRef<number>(0);

  const yawRef = useRef(propYaw);
  const pitchRef = useRef(propPitch);
  const fovRef = useRef(propFov);
  const showGridRef = useRef(showGrid);

  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  useEffect(() => {
    if (!isDraggingRef.current && !isInteractingRef.current) {
      yawRef.current = propYaw;
      pitchRef.current = propPitch;
      fovRef.current = propFov;
      needsRenderRef.current = true;
    }
  }, [propYaw, propPitch, propFov]);

  useEffect(() => { showGridRef.current = showGrid; needsRenderRef.current = true; }, [showGrid]);

  const loadImage = useCallback((src: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tc = document.createElement("canvas");
      tc.width = img.naturalWidth;
      tc.height = img.naturalHeight;
      const ctx = tc.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      textureSizeRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      try {
        textureDataRef.current = ctx.getImageData(0, 0, tc.width, tc.height);
      } catch {
        textureDataRef.current = null;
      }
      needsRenderRef.current = true;
    };
    img.src = src;
  }, []);

  useEffect(() => {
    if (imageSrc) loadImage(imageSrc);
  }, [imageSrc, loadImage]);

  const doRender = useCallback((quality: "low" | "high") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = quality === "low" ? LOW_QUALITY_SCALE : HI_QUALITY_SCALE;
    const rw = Math.max(1, Math.floor(width * scale));
    const rh = Math.max(1, Math.floor(height * scale));

    if (canvas.width !== rw || canvas.height !== rh) {
      canvas.width = rw;
      canvas.height = rh;
    }

    const td = textureDataRef.current;
    const tw = textureSizeRef.current.w;
    const th = textureSizeRef.current.h;

    if (!td || tw === 0 || th === 0) {
      ctx.fillStyle = isDark ? "#1a1a1a" : "#e5e5e5";
      ctx.fillRect(0, 0, rw, rh);
      return;
    }

    renderPanorama(ctx, rw, rh, td, tw, th, yawRef.current, pitchRef.current, fovRef.current, showGridRef.current);
  }, [width, height, isDark]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      if (needsRenderRef.current) {
        needsRenderRef.current = false;
        doRender(qualityRef.current);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => { running = false; };
  }, [doRender]);

  const scheduleHiQuality = useCallback(() => {
    clearTimeout(hiQualityTimerRef.current);
    hiQualityTimerRef.current = window.setTimeout(() => {
      qualityRef.current = "high";
      needsRenderRef.current = true;
    }, HI_QUALITY_DELAY);
  }, []);

  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    qualityRef.current = "low";
    clearTimeout(hiQualityTimerRef.current);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = fovRef.current / 750;
    let newYaw = yawRef.current + dx * sensitivity;
    let newPitch = pitchRef.current - dy * sensitivity;
    newYaw = ((newYaw % 360) + 360) % 360;
    newPitch = Math.max(-85, Math.min(85, newPitch));
    yawRef.current = newYaw;
    pitchRef.current = newPitch;
    needsRenderRef.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      onViewChangeRef.current?.(yawRef.current, pitchRef.current, fovRef.current);
      scheduleHiQuality();
    }
  }, [scheduleHiQuality]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      isInteractingRef.current = true;
      qualityRef.current = "low";
      clearTimeout(hiQualityTimerRef.current);
      clearTimeout(syncTimerRef.current);

      let newFov = fovRef.current + e.deltaY * 0.05;
      newFov = Math.max(30, Math.min(120, newFov));
      fovRef.current = newFov;
      needsRenderRef.current = true;

      scheduleHiQuality();

      syncTimerRef.current = window.setTimeout(() => {
        isInteractingRef.current = false;
        onViewChangeRef.current?.(yawRef.current, pitchRef.current, fovRef.current);
      }, 200);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => {
      canvas.removeEventListener("wheel", handleWheel, { capture: true });
      clearTimeout(syncTimerRef.current);
    };
  }, [scheduleHiQuality]);

  useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      const td = textureDataRef.current;
      const tw = textureSizeRef.current.w;
      const th = textureSizeRef.current.h;
      if (!td || tw === 0 || th === 0) return null;

      const sc = document.createElement("canvas");
      const shotW = 1280;
      const shotH = Math.round(shotW / (width / Math.max(1, height)));
      sc.width = shotW;
      sc.height = shotH;
      const sctx = sc.getContext("2d");
      if (!sctx) return null;

      renderPanorama(sctx, shotW, shotH, td, tw, th, yawRef.current, pitchRef.current, fovRef.current, false);

      try {
        return sc.toDataURL("image/png");
      } catch {
        return null;
      }
    },
    resetView: () => {
      yawRef.current = 0;
      pitchRef.current = 0;
      fovRef.current = 75;
      onViewChangeRef.current?.(0, 0, 75);
      needsRenderRef.current = true;
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        cursor: isDraggingRef.current ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="rounded-lg nowheel"
    />
  );
});

PanoramaViewer.displayName = "PanoramaViewer";
export { PanoramaViewer };
