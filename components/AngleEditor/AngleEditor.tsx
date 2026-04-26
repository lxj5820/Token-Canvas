import React, { useState, useCallback, useRef, useEffect } from "react";
import { Icons } from "../Icons";
import { LocalCustomDropdown } from "../Nodes/Shared/LocalNodeComponents";
import { IMAGE_HANDLERS } from "../../services/mode/image/configurations";

// ===== 常量 =====

const GRID_SIZE = 240;
const CUBE_SIZE = 100;
const CUBE_HALF = CUBE_SIZE / 2;
const PERSPECTIVE = 600;
const CAMERA_BASE_DISTANCE = 200;

const ANGLE_PRESETS = [
  { name: "全景俯拍", h: 45, v: 30, z: 0 },
  { name: "正面平视", h: 0, v: 0, z: 5 },
  { name: "右侧视角", h: 90, v: 0, z: 5 },
  { name: "背面视角", h: 180, v: 0, z: 0 },
  { name: "左侧视角", h: 270, v: 0, z: 5 },
  { name: "仰视特写", h: 0, v: -30, z: 15 },
  { name: "鸟瞰全景", h: 0, v: 60, z: 0 },
  { name: "自定义", h: -1, v: 0, z: 0 },
];

const H_LABELS: Record<number, string> = {
  0: "正面",
  45: "右前方",
  90: "右侧",
  135: "右后方",
  180: "背面",
  225: "左后方",
  270: "左侧",
  315: "左前方",
};

const ZOOM_LABELS: Record<number, string> = {
  0: "全景",
  5: "中景",
  10: "近景",
  15: "特写",
};

const getVLabel = (v: number) => {
  if (v <= -30) return "仰视";
  if (v <= 0) return "平视";
  if (v <= 30) return "俯视";
  return "鸟瞰";
};

const snapToStep = (value: number, step: number, min: number, max: number) => {
  const snapped = Math.round(value / step) * step;
  return Math.max(min, Math.min(max, snapped));
};

// ===== 类型 =====

export interface AngleGenerateParams {
  horizontalAngle: number;
  verticalAngle: number;
  zoom: number;
  includePrompt: boolean;
  prompt?: string;
  count: number;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
}

interface AngleEditorProps {
  imageSrc: string;
  onClose: () => void;
  onGenerate: (params: AngleGenerateParams) => void;
  isDark?: boolean;
  prompt?: string;
  isLoading?: boolean;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  imageModels?: string[];
}

// ===== 组件 =====

export const AngleEditor: React.FC<AngleEditorProps> = ({
  imageSrc,
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
  const [hAngle, setHAngle] = useState(45);
  const [vAngle, setVAngle] = useState(30);
  const [zoom, setZoom] = useState(0);
  const [includePrompt, setIncludePrompt] = useState(false);
  const [promptInput, setPromptInput] = useState(prompt || "");
  const [count, setCount] = useState(1);
  const [activePreset, setActivePreset] = useState("全景俯拍");
  const [countDropdownOpen, setCountDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(defaultModel || "Banana 2");
  const [selectedRatio, setSelectedRatio] = useState(defaultAspectRatio || "1:1");
  const [selectedResolution, setSelectedResolution] = useState(defaultResolution || "1k");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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

  const handler = IMAGE_HANDLERS[selectedModel] || IMAGE_HANDLERS["Banana 2"];
  const rules = handler.rules;
  const supportedRatios = rules.ratios || ["1:1", "16:9"];
  const supportedResolutions = rules.resolutions || ["1k"];

  const handleRatioChange = useCallback((val: string) => {
    setSelectedRatio(val);
  }, []);

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragH, setDragH] = useState(45);
  const [dragV, setDragV] = useState(30);
  const dragStartRef = useRef({ x: 0, y: 0, h: 0, v: 0 });
  const sceneRef = useRef<HTMLDivElement>(null);

  // 当前显示角度（拖拽中用连续值，否则用步进值）
  const displayH = isDragging ? dragH : hAngle;
  const displayV = isDragging ? dragV : vAngle;

  // ===== 拖拽处理 =====

  const handleSceneMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragH(hAngle);
      setDragV(vAngle);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        h: hAngle,
        v: vAngle,
      };
    },
    [hAngle, vAngle],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const newH = (((dragStartRef.current.h + dx * 0.5) % 360) + 360) % 360;
      const newV = Math.max(
        -60,
        Math.min(60, dragStartRef.current.v - dy * 0.3),
      );
      setDragH(newH);
      setDragV(newV);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const snappedH = snapToStep(dragH, 45, 0, 315);
      const snappedV = snapToStep(dragV, 30, -30, 60);
      setHAngle(snappedH);
      setVAngle(snappedV);
      setDragH(snappedH);
      setDragV(snappedV);
      setActivePreset("自定义");
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragH, dragV]);

  // ===== 下拉菜单点击外部关闭 =====
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

  // ===== 方向按钮 =====

  const handleDirection = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      let newH = hAngle;
      let newV = vAngle;
      if (dir === "up") newV = Math.min(60, vAngle + 30);
      if (dir === "down") newV = Math.max(-30, vAngle - 30);
      if (dir === "left") newH = (((hAngle - 45) % 360) + 360) % 360;
      if (dir === "right") newH = (hAngle + 45) % 360;
      if (newH > 315) newH = 0;
      setHAngle(newH);
      setVAngle(newV);
      setActivePreset("自定义");
    },
    [hAngle, vAngle],
  );

  // ===== 预设 =====

  const handlePreset = useCallback((preset: (typeof ANGLE_PRESETS)[number]) => {
    if (preset.h === -1) {
      setActivePreset(preset.name);
      return;
    }
    setHAngle(preset.h);
    setVAngle(preset.v);
    setZoom(preset.z);
    setActivePreset(preset.name);
  }, []);

  // ===== 滑块变化 =====

  const handleSliderChange = useCallback(
    (type: "h" | "v" | "z", value: number) => {
      if (type === "h") setHAngle(value);
      if (type === "v") setVAngle(value);
      if (type === "z") setZoom(value);
      setActivePreset("自定义");
    },
    [],
  );

  // ===== 重置 =====

  const handleReset = useCallback(() => {
    setHAngle(0);
    setVAngle(0);
    setZoom(0);
    setActivePreset("自定义");
  }, []);

  // ===== 生成 =====

  const handleGenerateClick = useCallback(() => {
    onGenerate({
      horizontalAngle: hAngle,
      verticalAngle: vAngle,
      zoom,
      includePrompt,
      prompt: promptInput,
      count,
      model: selectedModel,
      aspectRatio: selectedRatio,
      resolution: selectedResolution,
    });
  }, [hAngle, vAngle, zoom, includePrompt, promptInput, count, onGenerate, selectedModel, selectedRatio, selectedResolution]);

  // ===== 滑块渐变计算 =====

  const getSliderGradient = (value: number, min: number, max: number) => {
    const pct = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, #eab308 0%, #eab308 ${pct}%, #3f3f46 ${pct}%, #3f3f46 100%)`;
  };

  // ===== 相机距离 =====

  const cameraDistance = CAMERA_BASE_DISTANCE - zoom * 6;

  return (
    <div
      className={`rounded-2xl shadow-2xl overflow-hidden border backdrop-blur-xl ${
        isDark
          ? "bg-[#1a1a1a]/95 border-zinc-700/50"
          : "bg-white/95 border-gray-200 shadow-xl"
      }`}
      style={{ width: "auto", minWidth: 480, maxWidth: "100%" }}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* ===== Header ===== */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-zinc-700/50" : "border-gray-200"}`}
      >
        <h1
          className={`text-[15px] font-semibold ${isDark ? "text-zinc-200" : "text-gray-900"}`}
        >
          多角度编辑器
        </h1>
        <button
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            isDark
              ? "text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          onClick={onClose}
        >
          <Icons.X size={18} />
        </button>
      </div>

      {/* ===== Presets ===== */}
      <div
        className={`flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar border-b ${isDark ? "border-zinc-700/50" : "border-gray-200"}`}
      >
        {ANGLE_PRESETS.map((preset) => (
          <button
            key={preset.name}
            className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap border ${
              activePreset === preset.name
                ? isDark
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                  : "bg-yellow-50 text-yellow-600 border-yellow-300"
                : isDark
                  ? "bg-zinc-700/50 text-zinc-400 border-zinc-700/50 hover:text-zinc-200"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:text-gray-700"
            }`}
            onClick={() => handlePreset(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* ===== 3D Scene ===== */}
      <div
        className={`relative border-b ${isDark ? "bg-[#0d0d0d] border-zinc-700/50" : "bg-gray-100 border-gray-200"}`}
        style={{ height: 280 }}
      >
        {/* Scene container */}
        <div
          ref={sceneRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            perspective: PERSPECTIVE,
            cursor: isDragging ? "grabbing" : "grab",
          }}
          onMouseDown={handleSceneMouseDown}
        >
          {/* Sphere grid - rotates with camera */}
          <div
            className="absolute"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${displayV}deg) rotateY(${displayH}deg)`,
            }}
          >
            {/* Meridians */}
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={`m${i}`}
                className="absolute"
                style={{
                  width: GRID_SIZE,
                  height: GRID_SIZE,
                  left: -GRID_SIZE / 2,
                  top: -GRID_SIZE / 2,
                  borderRadius: "50%",
                  border: `1px solid rgba(234,179,8,0.12)`,
                  transform: `rotateY(${i * 15}deg)`,
                  transformStyle: "preserve-3d",
                }}
              />
            ))}
            {/* Equator */}
            <div
              className="absolute"
              style={{
                width: GRID_SIZE,
                height: GRID_SIZE,
                left: -GRID_SIZE / 2,
                top: -GRID_SIZE / 2,
                borderRadius: "50%",
                border: `1px solid rgba(234,179,8,0.15)`,
                transform: "rotateX(90deg)",
              }}
            />
            {/* Parallels */}
            {[19.5, -19.5, 37.5, -37.5].map((offset, i) => {
              const size = GRID_SIZE * (1 - Math.abs(offset) / 80);
              return (
                <div
                  key={`p${i}`}
                  className="absolute"
                  style={{
                    width: size,
                    height: size,
                    left: -size / 2,
                    top: -size / 2,
                    borderRadius: "50%",
                    border: `1px solid rgba(234,179,8,0.08)`,
                    transform: `translateY(${offset}px) rotateX(90deg)`,
                  }}
                />
              );
            })}
          </div>

          {/* Reference Cube - stays fixed */}
          <div style={{ transformStyle: "preserve-3d" }}>
            <div
              style={{
                transformStyle: "preserve-3d",
                transform: "scale(1)",
              }}
            >
              {/* Front face - shows image */}
              <div
                className="absolute flex items-center justify-center overflow-hidden"
                style={{
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  left: -CUBE_HALF,
                  top: -CUBE_HALF,
                  transform: `translateZ(${CUBE_HALF}px)`,
                  background: "#171717",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <img
                  src={imageSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                  style={{ opacity: 0.9 }}
                />
              </div>
              {/* Back face */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  left: -CUBE_HALF,
                  top: -CUBE_HALF,
                  transform: `rotateY(180deg) translateZ(${CUBE_HALF}px)`,
                  background: "rgba(39,39,42,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 14,
                  fontWeight: 600,
                  backfaceVisibility: "hidden",
                }}
              >
                B
              </div>
              {/* Right face */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  left: -CUBE_HALF,
                  top: -CUBE_HALF,
                  transform: `rotateY(90deg) translateZ(${CUBE_HALF}px)`,
                  background: "rgba(39,39,42,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 14,
                  fontWeight: 600,
                  backfaceVisibility: "hidden",
                }}
              >
                R
              </div>
              {/* Left face */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  left: -CUBE_HALF,
                  top: -CUBE_HALF,
                  transform: `rotateY(-90deg) translateZ(${CUBE_HALF}px)`,
                  background: "rgba(39,39,42,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 14,
                  fontWeight: 600,
                  backfaceVisibility: "hidden",
                }}
              >
                L
              </div>
              {/* Top face */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  left: -CUBE_HALF,
                  top: -CUBE_HALF,
                  transform: `rotateX(90deg) translateZ(${CUBE_HALF}px)`,
                  background: "rgba(63,63,70,0.5)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 14,
                  fontWeight: 600,
                  backfaceVisibility: "hidden",
                }}
              >
                T
              </div>
              {/* Bottom face */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  left: -CUBE_HALF,
                  top: -CUBE_HALF,
                  transform: `rotateX(-90deg) translateZ(${CUBE_HALF}px)`,
                  background: "rgba(39,39,42,0.4)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 14,
                  fontWeight: 600,
                  backfaceVisibility: "hidden",
                }}
              >
                B
              </div>
            </div>
          </div>

          {/* Camera indicator - rotates with angle */}
          <div
            className="absolute"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${displayV}deg) rotateY(${displayH}deg)`,
            }}
          >
            <div
              className="absolute"
              style={{
                transformStyle: "preserve-3d",
                transform: `translateZ(${cameraDistance}px)`,
              }}
            >
              {/* Camera indicator */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: -16,
                  top: -13,
                  width: 32,
                  height: 26,
                  borderRadius: 6,
                  background: "rgba(234,179,8,0.9)",
                  border: "2px solid rgba(255,255,255,0.6)",
                  boxShadow:
                    "0 0 14px rgba(234,179,8,0.5), 0 0 28px rgba(234,179,8,0.25)",
                  transform: "translateZ(-4px) rotateY(180deg)",
                }}
              >
                {/* Viewfinder bump */}
                <div
                  className="absolute"
                  style={{
                    left: 6,
                    top: -5,
                    width: 10,
                    height: 6,
                    borderRadius: "3px 3px 0 0",
                    background: "rgba(234,179,8,0.9)",
                    border: "2px solid rgba(255,255,255,0.6)",
                    borderBottom: "none",
                  }}
                />
                {/* Lens */}
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.5)",
                    border: "2px solid rgba(255,255,255,0.7)",
                    boxShadow: "inset 0 0 3px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Lens reflection */}
                  <div
                    style={{
                      position: "absolute",
                      left: 2,
                      top: 2,
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.4)",
                    }}
                  />
                </div>
              </div>
              {/* Camera line to center */}
              <div
                className="absolute"
                style={{
                  left: 0,
                  top: 0,
                  width: 2,
                  background: "rgba(234,179,8,0.4)",
                  transform: "translateZ(-4px) rotateX(-90deg)",
                  transformOrigin: "top center",
                  height: cameraDistance,
                }}
              />
            </div>
          </div>

          {/* Vertical helper line */}
          <div
            className="absolute"
            style={{
              width: 1,
              height: GRID_SIZE,
              left: 0,
              top: -GRID_SIZE / 2,
              background: "rgba(234,179,8,0.2)",
              opacity: displayH % 90 === 0 ? 1 : 0.4,
            }}
          />
        </div>

        {/* Direction buttons */}
        <button
          className="absolute top-3 left-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-black/60 z-10"
          style={{
            background: "rgba(0,0,0,0.4)",
            color: "rgba(255,255,255,0.7)",
          }}
          onClick={() => handleDirection("up")}
          title="向上旋转"
        >
          <Icons.ChevronUp size={16} />
        </button>
        <button
          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-black/60 z-10"
          style={{
            background: "rgba(0,0,0,0.4)",
            color: "rgba(255,255,255,0.7)",
          }}
          onClick={() => handleDirection("down")}
          title="向下旋转"
        >
          <Icons.ChevronDown size={16} />
        </button>
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-black/60 z-10"
          style={{
            background: "rgba(0,0,0,0.4)",
            color: "rgba(255,255,255,0.7)",
          }}
          onClick={() => handleDirection("left")}
          title="向左旋转"
        >
          <Icons.ChevronLeft size={16} />
        </button>
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-black/60 z-10"
          style={{
            background: "rgba(0,0,0,0.4)",
            color: "rgba(255,255,255,0.7)",
          }}
          onClick={() => handleDirection("right")}
          title="向右旋转"
        >
          <Icons.ChevronRight size={16} />
        </button>
      </div>

      {/* ===== Controls ===== */}
      <div
        className={`px-4 py-3 flex flex-col gap-3 border-b ${isDark ? "border-zinc-700/50" : "border-gray-200"}`}
      >
        {/* 水平环绕 */}
        <div className="flex items-center gap-3">
          <span
            className={`text-[12px] w-16 shrink-0 ${isDark ? "text-zinc-400" : "text-gray-500"}`}
          >
            水平环绕
          </span>
          <input
            type="range"
            min={0}
            max={315}
            step={45}
            value={hAngle}
            onChange={(e) => handleSliderChange("h", Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
            style={{ background: getSliderGradient(hAngle, 0, 315) }}
          />
          <span
            className={`text-[12px] w-10 text-right tabular-nums font-medium ${isDark ? "text-zinc-200" : "text-gray-900"}`}
          >
            {hAngle}°
          </span>
        </div>

        {/* 垂直俯仰 */}
        <div className="flex items-center gap-3">
          <span
            className={`text-[12px] w-16 shrink-0 ${isDark ? "text-zinc-400" : "text-gray-500"}`}
          >
            垂直俯仰
          </span>
          <input
            type="range"
            min={-30}
            max={60}
            step={30}
            value={vAngle}
            onChange={(e) => handleSliderChange("v", Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
            style={{ background: getSliderGradient(vAngle, -30, 60) }}
          />
          <span
            className={`text-[12px] w-10 text-right tabular-nums font-medium ${isDark ? "text-zinc-200" : "text-gray-900"}`}
          >
            {vAngle}°
          </span>
        </div>

        {/* 景别缩放 */}
        <div className="flex items-center gap-3">
          <span
            className={`text-[12px] w-16 shrink-0 ${isDark ? "text-zinc-400" : "text-gray-500"}`}
          >
            景别缩放
          </span>
          <input
            type="range"
            min={0}
            max={15}
            step={5}
            value={zoom}
            onChange={(e) => handleSliderChange("z", Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
            style={{ background: getSliderGradient(zoom, 0, 15) }}
          />
          <span
            className={`text-[12px] w-10 text-right font-medium ${isDark ? "text-zinc-200" : "text-gray-900"}`}
          >
            {ZOOM_LABELS[zoom] || "全景"}
          </span>
        </div>

        {/* 提示词开关 */}
        <div className="flex items-center justify-between">
          <span
            className={`text-[12px] ${isDark ? "text-zinc-400" : "text-gray-500"}`}
          >
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

        {/* 原始描述输入框 - 提示词开关开启时显示 */}
        {includePrompt && (
          <textarea
            className="w-full border rounded-xl px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/20 min-h-[72px] no-scrollbar transition-all bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 focus:border-yellow-500 text-white placeholder-zinc-500"
            placeholder="输入原始描述提示词..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
        )}
      </div>

      {/* ===== Footer ===== */}
      <div className="flex items-center px-4 py-3">
        {/* 重置按钮 */}
        <button
          className={`group/reset relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer ${
            isDark
              ? "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/70"
              : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"
          }`}
          onClick={handleReset}
          title="重置参数"
        >
          <Icons.RotateCcw size={15} />
        </button>

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

        {/* 数量选择 */}
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

        {/* 生成按钮 */}
        <button
          className="h-8 px-5 rounded-lg text-[13px] font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 active:scale-[0.98]"
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
