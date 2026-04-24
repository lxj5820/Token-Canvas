import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icons } from '../Icons';

// ===== 常量 =====

const GRID_SIZE = 240;
const LIGHT_DISTANCE = 120;
const PERSPECTIVE = 800;

// 预设位置
const LIGHT_PRESETS = [
  { name: '左侧', azimuth: 270, elevation: 0 },
  { name: '顶部', azimuth: 0, elevation: 90 },
  { name: '右侧', azimuth: 90, elevation: 0 },
  { name: '左上', azimuth: 315, elevation: 45 },
  { name: '前方', azimuth: 0, elevation: 0 },
  { name: '右上', azimuth: 45, elevation: 45 },
  { name: '底部', azimuth: 0, elevation: -90 },
  { name: '后方', azimuth: 180, elevation: 0 },
];

// 方位标签
const AZIMUTH_LABELS: Record<number, string> = {
  0: '前方', 45: '右前方', 90: '右侧', 135: '右后方',
  180: '后方', 225: '左后方', 270: '左侧', 315: '左前方',
};

const getElevationLabel = (e: number) => {
  if (e <= -60) return '正下方';
  if (e <= -30) return '下方';
  if (e <= 10) return '水平';
  if (e <= 45) return '上方';
  if (e <= 80) return '斜上方';
  return '正上方';
};

const getColorDesc = (hex: string): string => {
  if (!hex) return '';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (r === 255 && g === 255 && b === 255) return '白色';
  if (r === 0 && g === 0 && b === 0) return '黑色';
  if (r === 255 && g === 0 && b === 0) return '红色';
  if (r === 0 && g === 255 && b === 0) return '绿色';
  if (r === 0 && g === 0 && b === 255) return '蓝色';
  if (r === 255 && g === 255 && b === 0) return '黄色';
  if (r === 255 && g === 165 && b === 0) return '橙色';
  if (r === 128 && g === 0 && b === 128) return '紫色';
  if (r === 0 && g === 255 && b === 255) return '青色';
  if (r === 255 && g === 192 && b === 203) return '粉色';
  if (r === 255 && g === 215 && b === 0) return '金色';
  if (r > g && r > b) return g > 150 ? '暖黄色' : '暖红色';
  if (b > r && b > g) return g > 150 ? '冷青色' : '冷蓝色';
  if (g > r && g > b) return '冷绿色';
  if (r > 200 && g > 200 && b < 150) return '暖黄色';
  if (r > 200 && b > 200 && g < 150) return '冷紫色';
  return `${hex}色`;
};

// ===== 类型 =====

export interface LightSourceParams {
  azimuth: number;       // 水平环绕 0-360°
  elevation: number;     // 高度 -90~90°
  intensity: number;     // 强度 0-100%
  color: string;         // 灯光颜色 HEX
  enabled: boolean;      // 是否启用
}

export interface LightingGenerateParams {
  mainLight: LightSourceParams;
  fillLight: LightSourceParams;
  includePrompt: boolean;
  count: number;
}

interface LightingEditorProps {
  imageSrc: string;
  onClose: () => void;
  onGenerate: (params: LightingGenerateParams) => void;
  isDark?: boolean;
  prompt?: string;
  isLoading?: boolean;
}

// ===== 工具函数 =====

// 球坐标 → 笛卡尔坐标（Y轴向上）
const sphericalToCartesian = (azimuth: number, elevation: number, distance: number) => {
  const azRad = (azimuth * Math.PI) / 180;
  const elRad = (elevation * Math.PI) / 180;
  return {
    x: distance * Math.cos(elRad) * Math.sin(azRad),
    y: -distance * Math.sin(elRad),  // CSS Y轴向下，取反
    z: distance * Math.cos(elRad) * Math.cos(azRad),
  };
};

// 默认灯光参数
const DEFAULT_MAIN: LightSourceParams = {
  azimuth: 0,
  elevation: 0,
  intensity: 50,
  color: '#FFFFFF',
  enabled: true,
};

const DEFAULT_FILL: LightSourceParams = {
  azimuth: 180,
  elevation: 10,
  intensity: 30,
  color: '#0000FF',
  enabled: false,
};

// ===== 灯光指示器子组件 =====

/** 3D 透视模式下的灯光球 + 光束线 */
const LightOrb3D: React.FC<{
  pos: { x: number; y: number; z: number };
  color: string;
  size: number;
  label: string;
  intensity?: number;
  isDrag?: boolean;
}> = ({ pos, color, size, label, intensity = 80, isDrag }) => {
  const px = pos.x;
  const py = pos.y;
  const pz = pos.z;
  const dist3D = Math.sqrt(px * px + py * py + pz * pz);

  const rotYAngle = Math.atan2(px, pz) * 180 / Math.PI;
  const rotXAngle = -Math.asin(py / Math.max(dist3D, 0.001)) * 180 / Math.PI;

  const intensityFactor = intensity / 100;

  return (
    <>
      {/* 3D光锥 - 从灯光球体中心到场景中心 */}
      <div
        className="absolute pointer-events-none"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)`,
          zIndex: 1,
        }}
      >
        {/* 旋转容器 - 让 -Z 轴指向场景中心 */}
        <div
          style={{
            position: 'absolute',
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotYAngle}deg) rotateX(${rotXAngle}deg)`,
          }}
        >
          {/* 光束线 */}
          <div
            style={{
              position: 'absolute',
              left: -1,
              top: 0,
              width: 2,
              height: dist3D,
              background: `linear-gradient(to bottom, ${color}${Math.round(intensityFactor * 0.6 * 255).toString(16).padStart(2, '0')}, ${color}00)`,
              transformOrigin: 'top center',
              transform: 'rotateX(-90deg)',
            }}
          />

          {/* 虚线辅助 */}
          <div
            style={{
              position: 'absolute',
              left: -0.5,
              top: 0,
              width: 1,
              height: dist3D,
              background: `repeating-linear-gradient(to bottom, ${color}${Math.round(intensityFactor * 0.38 * 255).toString(16).padStart(2, '0')} 0px, ${color}${Math.round(intensityFactor * 0.38 * 255).toString(16).padStart(2, '0')} 4px, transparent 4px, transparent 8px)`,
              transformOrigin: 'top center',
              transform: 'rotateX(-90deg)',
            }}
          />

          {/* 光锥截面 - 从光源到目标逐渐扩大，模拟体积光散射 */}
          {Array.from({ length: 128 }, (_, i) => {
            const t = (i + 0.5) / 128;
            const zPos = -t * dist3D;
            const radius = t * 40;
            const edgeAlpha = intensityFactor * 0.12 * Math.pow(1 - t, 0.8);
            const centerAlpha = intensityFactor * 0.06 * Math.pow(1 - t * 0.7, 1.2);
            return (
              <div
                key={`slice-${i}`}
                className="absolute rounded-full"
                style={{
                  left: -radius,
                  top: -radius,
                  width: radius * 2,
                  height: radius * 2,
                  background: `radial-gradient(circle, ${color}${Math.round(centerAlpha * 255).toString(16).padStart(2, '0')}, ${color}${Math.round(edgeAlpha * 255).toString(16).padStart(2, '0')} 50%, transparent 100%)`,
                  transform: `translateZ(${zPos}px)`,
                }}
              />
            );
          })}

          {/* 照射面光斑 - 柔和的圆形光斑 */}
          <div
            className="absolute rounded-full"
            style={{
              left: -52,
              top: -52,
              width: 104,
              height: 104,
              background: `radial-gradient(circle, ${color}${Math.round(intensityFactor * 0.25 * 255).toString(16).padStart(2, '0')}, ${color}${Math.round(intensityFactor * 0.12 * 255).toString(16).padStart(2, '0')} 35%, ${color}${Math.round(intensityFactor * 0.05 * 255).toString(16).padStart(2, '0')} 65%, transparent 100%)`,
              transform: `translateZ(${-dist3D}px)`,
            }}
          />
        </div>
      </div>

      {/* 灯光球体 */}
      <div
        className="absolute"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)`,
        }}
      >
        {/* 简洁的3D球体 - 经纬线框架 */}
        <div
          style={{
            position: 'absolute',
            transformStyle: 'preserve-3d',
            left: -size,
            top: -size,
            width: size * 2,
            height: size * 2,
          }}
        >
          {/* 经线 - 8个 */}
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={`v${i}`}
              className="absolute rounded-full"
              style={{
                width: size * 2,
                height: size * 2,
                left: 0,
                top: 0,
                border: `1px solid ${color}60`,
                transform: `rotateY(${i * 45}deg)`,
                transformStyle: 'preserve-3d',
              }}
            />
          ))}

          {/* 纬线 - 3个 */}
          {Array.from({ length: 3 }, (_, i) => {
            const angle = (i - 1) * 90;
            const yOffset = Math.sin(angle * Math.PI / 180) * size;
            const ringSize = Math.cos(angle * Math.PI / 180) * size * 2;
            return (
              <div
                key={`h${i}`}
                className="absolute rounded-full"
                style={{
                  width: ringSize,
                  height: ringSize,
                  left: size - ringSize / 2,
                  top: size - ringSize / 2,
                  border: `1px solid ${color}50`,
                  transform: `rotateX(90deg) translateY(${yOffset}px)`,
                  transformStyle: 'preserve-3d',
                }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};

/** 正面模式下的灯光球（2D 投影） */
const LightOrb2D: React.FC<{
  pos: { x: number; y: number; z: number };
  color: string;
  size: number;
  label: string;
  isDrag?: boolean;
}> = ({ pos, color, size, label, isDrag }) => {
  const px = pos.x;
  const py = pos.y;
  const dist = Math.sqrt(px ** 2 + py ** 2);

  const beamLength = dist - 20;
  const beamAngle = Math.atan2(py, px);
  const coneHalfAngle = 0.18;
  const coneEndX1 = px - Math.cos(beamAngle - coneHalfAngle) * beamLength;
  const coneEndY1 = py - Math.sin(beamAngle - coneHalfAngle) * beamLength;
  const coneEndX2 = px - Math.cos(beamAngle + coneHalfAngle) * beamLength;
  const coneEndY2 = py - Math.sin(beamAngle + coneHalfAngle) * beamLength;

  const svgSize = 400;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  return (
    <>
      {/* 光锥 - 模拟灯光照射方向 */}
      <svg
        className="absolute pointer-events-none"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: svgSize, height: svgSize, overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`beam-2d-${label}`} x1={cx + px} y1={cy + py} x2={cx} y2={cy} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${cx + px},${cy + py} ${cx + coneEndX1},${cy + coneEndY1} ${cx + coneEndX2},${cy + coneEndY2}`}
          fill={`url(#beam-2d-${label})`}
        />
      </svg>
      {/* 光束线 */}
      <svg
        className="absolute pointer-events-none"
        style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`line-2d-${label}`} x1={`${50 + px * 50 / 200}%`} y1={`${50 + py * 50 / 200}%`} x2="50%" y2="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="50%"
          y1="50%"
          x2={`calc(50% + ${px}px)`}
          y2={`calc(50% + ${py}px)`}
          stroke={`url(#line-2d-${label})`}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <line
          x1="50%"
          y1="50%"
          x2={`calc(50% + ${px}px)`}
          y2={`calc(50% + ${py}px)`}
          stroke={color}
          strokeWidth={1}
          strokeOpacity={0.3}
          strokeDasharray="4 3"
        />
      </svg>
      {/* 灯光球 */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          left: `calc(50% + ${px}px - ${size}px)`,
          top: `calc(50% + ${py}px - ${size}px)`,
          width: size * 2,
          height: size * 2,
          background: isDrag ? `${color}EE` : `${color}DD`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 ${size}px ${color}90, 0 0 ${size * 2}px ${color}40`,
          zIndex: 10,
        }}
      >
        <span className="text-[8px] font-bold text-black/60">{label}</span>
      </div>
    </>
  );
};

// ===== 主组件 =====

export const LightingEditor: React.FC<LightingEditorProps> = ({
  imageSrc, onClose, onGenerate, isDark = true, prompt, isLoading
}) => {
  // 灯光参数
  const [mainLight, setMainLight] = useState<LightSourceParams>({ ...DEFAULT_MAIN });
  const [fillLight, setFillLight] = useState<LightSourceParams>({ ...DEFAULT_FILL });
  const [activeTab, setActiveTab] = useState<'main' | 'fill'>('main');
  const [includePrompt, setIncludePrompt] = useState(false);
  const [count, setCount] = useState(1);
  const [countDropdownOpen, setCountDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'perspective' | 'front'>('perspective');

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragAzimuth, setDragAzimuth] = useState(45);
  const [dragElevation, setDragElevation] = useState(32);
  const dragStartRef = useRef({ x: 0, y: 0, az: 0, el: 0 });
  const sceneRef = useRef<HTMLDivElement>(null);

  // 当前编辑的灯光
  const currentLight = activeTab === 'main' ? mainLight : fillLight;
  const setCurrentLight = activeTab === 'main' ? setMainLight : setFillLight;

  // 拖拽中用连续值
  const displayAzimuth = isDragging ? dragAzimuth : currentLight.azimuth;
  const displayElevation = isDragging ? dragElevation : currentLight.elevation;

  // 主光 3D 坐标
  const mainPos = sphericalToCartesian(mainLight.azimuth, mainLight.elevation, LIGHT_DISTANCE);
  // 辅光 3D 坐标
  const fillPos = sphericalToCartesian(fillLight.azimuth, fillLight.elevation, LIGHT_DISTANCE * 0.85);
  // 当前拖拽的灯光坐标
  const currentDragPos = sphericalToCartesian(displayAzimuth, displayElevation, LIGHT_DISTANCE);

  // ===== 拖拽处理 =====

  const handleSceneMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragAzimuth(currentLight.azimuth);
    setDragElevation(currentLight.elevation);
    dragStartRef.current = { x: e.clientX, y: e.clientY, az: currentLight.azimuth, el: currentLight.elevation };
  }, [currentLight]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const newAz = ((dragStartRef.current.az + dx * 0.5) % 360 + 360) % 360;
      const newEl = Math.max(-90, Math.min(90, dragStartRef.current.el - dy * 0.3));
      setDragAzimuth(newAz);
      setDragElevation(newEl);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setCurrentLight(prev => ({
        ...prev,
        azimuth: Math.round(dragAzimuth),
        elevation: Math.round(dragElevation),
      }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragAzimuth, dragElevation, setCurrentLight]);

  // ===== 下拉菜单点击外部关闭 =====

  useEffect(() => {
    if (!countDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.count-dropdown-container')) {
        setCountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countDropdownOpen]);

  // ===== 预设位置 =====

  const handlePreset = useCallback((preset: typeof LIGHT_PRESETS[number]) => {
    setCurrentLight(prev => ({
      ...prev,
      azimuth: preset.azimuth,
      elevation: preset.elevation,
    }));
  }, [setCurrentLight]);

  // ===== 参数调节 =====

  const handleParamChange = useCallback((param: keyof LightSourceParams, value: number | string) => {
    setCurrentLight(prev => ({ ...prev, [param]: value }));
  }, [setCurrentLight]);

  // ===== 重置 =====

  const handleReset = useCallback(() => {
    setMainLight({ ...DEFAULT_MAIN });
    setFillLight({ ...DEFAULT_FILL });
    setActiveTab('main');
  }, []);

  // ===== 生成 =====

  const handleGenerateClick = useCallback(() => {
    onGenerate({ mainLight, fillLight, includePrompt, count });
  }, [mainLight, fillLight, includePrompt, count, onGenerate]);

  // ===== 滑块渐变 =====

  const getSliderGradient = (value: number, min: number, max: number, color: string) => {
    const pct = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #3f3f46 ${pct}%, #3f3f46 100%)`;
  };

  // ===== 判断哪个预设被选中 =====

  const activePreset = LIGHT_PRESETS.find(
    p => p.azimuth === currentLight.azimuth && p.elevation === currentLight.elevation
  )?.name || '';

  return (
    <div
      className={`rounded-2xl shadow-2xl overflow-hidden border backdrop-blur-xl ${
        isDark ? 'bg-[#1a1a1a]/95 border-zinc-700/50' : 'bg-white/95 border-gray-200 shadow-xl'
      }`}
      style={{ width: 'auto', minWidth: 480, maxWidth: '100%' }}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* ===== Header ===== */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-zinc-700/50' : 'border-gray-200'}`}>
        <h1 className={`text-[15px] font-semibold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>灯光编辑器</h1>
        <div className="flex items-center gap-2">
          {/* 主光/辅光标签页 */}
          <div className={`flex gap-1 p-1 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
            <button
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                activeTab === 'main'
                  ? (isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600')
                  : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-700')
              }`}
              onClick={() => setActiveTab('main')}
            >
              主光
            </button>
            <button
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'fill'
                  ? (isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600')
                  : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-700')
              }`}
              onClick={() => setActiveTab('fill')}
            >
              辅光
              {fillLight.enabled && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500" />
              )}
            </button>
          </div>
          <button
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
              isDark ? 'text-zinc-400 hover:bg-zinc-700/50 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
            onClick={onClose}
          >
            <Icons.X size={18} />
          </button>
        </div>
      </div>

      {/* ===== 辅光启用开关（仅辅光标签页） ===== */}
      {activeTab === 'fill' && (
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-zinc-700/50' : 'border-gray-200'}`}>
          <span className={`text-[12px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>启用辅助光源</span>
          <button
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              fillLight.enabled
                ? 'bg-yellow-500'
                : (isDark ? 'bg-zinc-700' : 'bg-gray-300')
            }`}
            onClick={() => setFillLight(prev => ({ ...prev, enabled: !prev.enabled }))}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
              style={{ left: fillLight.enabled ? 18 : 2 }}
            />
          </button>
        </div>
      )}

      {/* ===== 3D Scene ===== */}
      <div className={`relative border-b ${isDark ? 'bg-[#0d0d0d] border-zinc-700/50' : 'bg-gray-100 border-gray-200'}`} style={{ height: 260 }}>
        {/* 透视/正面切换 */}
        <div className="absolute top-3 left-3 z-10">
          <div className={`flex p-1 rounded-full backdrop-blur-sm border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-gray-200'}`}>
            <button
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'perspective'
                  ? (isDark ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800')
                  : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800')
              }`}
              onClick={() => setViewMode('perspective')}
            >
              透视
            </button>
            <button
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'front'
                  ? (isDark ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800')
                  : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800')
              }`}
              onClick={() => setViewMode('front')}
            >
              正面
            </button>
          </div>
        </div>

        {/* Scene container */}
        <div
          ref={sceneRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleSceneMouseDown}
        >
          {/* 透视模式 */}
          {viewMode === 'perspective' && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ perspective: PERSPECTIVE }}
            >
              {/* 3D球体网格 */}
              <div
                className="absolute"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: 'rotateX(-25deg) rotateY(-30deg)',
                }}
              >
                {/* 经线 - 12条竖经线围绕球体 */}
                {Array.from({ length: 12 }, (_, i) => (
                  <div
                    key={`m${i}`}
                    className="absolute"
                    style={{
                      width: GRID_SIZE,
                      height: GRID_SIZE,
                      left: -GRID_SIZE / 2,
                      top: -GRID_SIZE / 2,
                      borderRadius: '50%',
                      border: `1px solid rgba(234,179,8,0.12)`,
                      transform: `rotateY(${i * 15}deg)`,
                      transformStyle: 'preserve-3d',
                    }}
                  />
                ))}
                {/* 赤道 */}
                <div
                  className="absolute"
                  style={{
                    width: GRID_SIZE,
                    height: GRID_SIZE,
                    left: -GRID_SIZE / 2,
                    top: -GRID_SIZE / 2,
                    borderRadius: '50%',
                    border: `1px solid rgba(234,179,8,0.15)`,
                    transform: 'rotateX(90deg)',
                  }}
                />
                {/* 纬线 - 4条纬线 */}
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
                        borderRadius: '50%',
                        border: `1px solid rgba(234,179,8,0.08)`,
                        transform: `translateY(${offset}px) rotateX(90deg)`,
                      }}
                    />
                  );
                })}

                {/* 中心球体 */}
                <div
                  className="absolute overflow-hidden"
                  style={{
                    width: 80,
                    height: 80,
                    left: -40,
                    top: -40,
                    background: '#171717',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                    transform: 'translateZ(0px)',
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

                {/* 主光 */}
                {mainLight.enabled && !isDragging && (
                  <LightOrb3D
                    pos={mainPos}
                    color={mainLight.color}
                    size={14}
                    label="M"
                    intensity={mainLight.intensity}
                  />
                )}

                {/* 辅光 */}
                {fillLight.enabled && !isDragging && (
                  <LightOrb3D
                    pos={fillPos}
                    color={fillLight.color}
                    size={11}
                    label="F"
                    intensity={fillLight.intensity}
                  />
                )}

                {/* 拖拽中的灯光 */}
                {isDragging && (
                  <LightOrb3D
                    pos={currentDragPos}
                    color={currentLight.color}
                    size={16}
                    label={activeTab === 'main' ? 'M' : 'F'}
                    intensity={currentLight.intensity}
                    isDrag
                  />
                )}
              </div>
            </div>
          )}

          {/* 正面模式 - 2D 投影 */}
          {viewMode === 'front' && (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* 参考圆 + 十字线 */}
              <div className="absolute" style={{ width: 220, height: 220 }}>
                <div className="absolute inset-0 rounded-full border border-yellow-500/18" />
                <div className="absolute" style={{ left: 0, top: '50%', width: '100%', height: 1, background: 'rgba(234,179,8,0.10)', marginTop: -0.5 }} />
                <div className="absolute" style={{ left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(234,179,8,0.10)', marginLeft: -0.5 }} />
                <span className="absolute text-[9px] text-yellow-400/50 font-medium" style={{ right: -18, top: '50%', marginTop: -6 }}>右</span>
                <span className="absolute text-[9px] text-yellow-400/50 font-medium" style={{ left: -18, top: '50%', marginTop: -6 }}>左</span>
                <span className="absolute text-[9px] text-yellow-400/50 font-medium" style={{ left: '50%', top: -16, marginLeft: -4 }}>上</span>
                <span className="absolute text-[9px] text-yellow-400/50 font-medium" style={{ left: '50%', bottom: -16, marginLeft: -4 }}>下</span>
              </div>

              {/* 中心图片 */}
              <div
                className="absolute overflow-hidden"
                style={{
                  width: 80,
                  height: 80,
                  background: '#171717',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
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

              {/* 主光 2D 投影 */}
              {mainLight.enabled && !isDragging && (
                <LightOrb2D
                  pos={mainPos}
                  color={mainLight.color}
                  size={14}
                  label="M"
                />
              )}

              {/* 辅光 2D 投影 */}
              {fillLight.enabled && !isDragging && (
                <LightOrb2D
                  pos={fillPos}
                  color={fillLight.color}
                  size={11}
                  label="F"
                />
              )}

              {/* 拖拽中 2D 投影 */}
              {isDragging && (
                <LightOrb2D
                  pos={currentDragPos}
                  color={currentLight.color}
                  size={16}
                  label={activeTab === 'main' ? 'M' : 'F'}
                  isDrag
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== Presets ===== */}
      <div className={`flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar border-b ${isDark ? 'border-zinc-700/50' : 'border-gray-200'}`}>
        {LIGHT_PRESETS.map((preset) => (
          <button
            key={preset.name}
            className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap border ${
              activePreset === preset.name
                ? (isDark ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-yellow-50 text-yellow-600 border-yellow-300')
                : (isDark ? 'bg-zinc-700/50 text-zinc-400 border-zinc-700/50 hover:text-zinc-200' : 'bg-gray-100 text-gray-500 border-gray-200 hover:text-gray-700')
            }`}
            onClick={() => handlePreset(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* ===== Controls ===== */}
      <div className={`px-4 py-3 flex flex-col gap-3 border-b ${isDark ? 'border-zinc-700/50' : 'border-gray-200'}`}>
        {/* 水平环绕 */}
        <div className="flex items-center gap-3">
          <span className={`text-[12px] w-16 shrink-0 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>水平环绕</span>
          <input
            type="range"
            min={0}
            max={360}
            value={currentLight.azimuth}
            onChange={(e) => handleParamChange('azimuth', Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
            style={{ background: getSliderGradient(currentLight.azimuth, 0, 360, '#eab308') }}
          />
          <span className={`text-[12px] w-12 text-right tabular-nums font-medium ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>{currentLight.azimuth}°</span>
        </div>

        {/* 高度 */}
        <div className="flex items-center gap-3">
          <span className={`text-[12px] w-16 shrink-0 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>高度</span>
          <input
            type="range"
            min={-90}
            max={90}
            value={currentLight.elevation}
            onChange={(e) => handleParamChange('elevation', Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
            style={{ background: getSliderGradient(currentLight.elevation, -90, 90, '#eab308') }}
          />
          <span className={`text-[12px] w-12 text-right tabular-nums font-medium ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>{currentLight.elevation}°</span>
        </div>

        {/* 强度 */}
        <div className="flex items-center gap-3">
          <span className={`text-[12px] w-16 shrink-0 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>强度</span>
          <input
            type="range"
            min={0}
            max={100}
            value={currentLight.intensity}
            onChange={(e) => handleParamChange('intensity', Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
            style={{ background: getSliderGradient(currentLight.intensity, 0, 100, '#eab308') }}
          />
          <span className={`text-[12px] w-12 text-right tabular-nums font-medium ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>{currentLight.intensity}%</span>
        </div>

        {/* 灯光颜色 */}
        <div className="flex items-center gap-3">
          <span className={`text-[12px] w-16 shrink-0 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>灯光颜色</span>
          <div className="flex items-center gap-2 flex-1">
            <div className={`relative w-7 h-7 rounded-md ${isDark ? 'border-white/10' : 'border-gray-300'} border shrink-0 shadow-inner cursor-pointer`} style={{ background: currentLight.color }}>
              <input
                key={`${activeTab}-color`}
                type="color"
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                value={currentLight.color}
                onChange={(e) => handleParamChange('color', e.target.value)}
              />
            </div>
            <input
              key={`${activeTab}-hex`}
              type="text"
              className={`bg-transparent border-none outline-none text-[12px] w-20 font-mono uppercase ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}
              maxLength={7}
              value={currentLight.color}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                  handleParamChange('color', val);
                }
              }}
            />
          </div>
        </div>

        {/* 提示词开关 */}
        <div className="flex items-center justify-between">
          <span className={`text-[12px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>提示词</span>
          <button
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              includePrompt
                ? 'bg-yellow-500'
                : (isDark ? 'bg-zinc-700' : 'bg-gray-300')
            }`}
            onClick={() => setIncludePrompt(!includePrompt)}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
              style={{ left: includePrompt ? 18 : 2 }}
            />
          </button>
        </div>

        {/* 灯光描述预览 */}
        <div className={`px-3 py-2 rounded-lg text-[11px] border ${
          isDark ? 'bg-yellow-500/8 border-yellow-500/15 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-600'
        }`}>
          主光：{mainLight.azimuth}°{getElevationLabel(mainLight.elevation)}，强度{mainLight.intensity}%，{mainLight.color}色光
          {fillLight.enabled && ` | 辅光：${fillLight.azimuth}°${getElevationLabel(fillLight.elevation)}，强度${fillLight.intensity}%，${fillLight.color}光`}
          {includePrompt && prompt ? `。原始描述：${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}` : ''}
        </div>
      </div>

      {/* ===== Footer ===== */}
      <div className="flex items-center px-4 py-3">
        {/* 重置按钮 */}
        <button
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] transition-colors cursor-pointer ${
            isDark
              ? 'text-zinc-400 bg-zinc-700/50 hover:text-zinc-200 hover:bg-zinc-700/70'
              : 'text-gray-500 bg-gray-100 hover:text-gray-700 hover:bg-gray-200'
          }`}
          onClick={handleReset}
        >
          <Icons.RotateCcw size={14} />
          <span>重置参数</span>
        </button>

        <div className="flex-1" />

        {/* 数量选择 */}
        <div className="flex items-center gap-2 mr-3 count-dropdown-container relative">
          <button
            className="flex items-center gap-2 cursor-pointer group h-8 px-3 rounded-lg border transition-all border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700"
            onClick={() => setCountDropdownOpen(!countDropdownOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors text-zinc-400 group-hover:text-white" aria-hidden="true">
              <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path>
              <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path>
              <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>
            </svg>
            <span className="text-xs font-medium transition-colors select-none text-zinc-300 group-hover:text-white min-w-[20px] text-center">{count}</span>
          </button>

          {countDropdownOpen && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max min-w-[130px] bg-[#1a1a1a] border-zinc-700 border rounded-xl shadow-2xl py-1.5 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-visible">
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`relative px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-between cursor-pointer mb-0.5 ${
                      count === n
                        ? 'bg-yellow-500/15 text-yellow-400'
                        : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                    }`}
                    onClick={() => { setCount(n); setCountDropdownOpen(false); }}
                  >
                    <span className="whitespace-nowrap pr-2">{n}</span>
                    {count === n && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-yellow-400 shrink-0 ml-2" aria-hidden="true">
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
          {isLoading ? <Icons.Loader2 size={14} className="animate-spin" /> : <Icons.Wand2 size={14} />}
          <span>{isLoading ? '生成中' : '生成'}</span>
        </button>
      </div>
    </div>
  );
};
