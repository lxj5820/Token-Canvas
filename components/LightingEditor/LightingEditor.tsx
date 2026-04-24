import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icons } from '../Icons';

// ===== 常量 =====

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
  azimuth: 45,
  elevation: 32,
  intensity: 80,
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
  isDrag?: boolean;
}> = ({ pos, color, size, label, isDrag }) => {
  return (
    <div
      className="absolute"
      style={{
        transformStyle: 'preserve-3d',
        transform: `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)`,
      }}
    >
      {/* 灯光球体 */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          left: -size,
          top: -size,
          width: size * 2,
          height: size * 2,
          background: isDrag ? `${color}EE` : `${color}DD`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 ${size}px ${color}90, 0 0 ${size * 2}px ${color}40`,
          transform: 'translateZ(2px) rotateX(25deg) rotateY(30deg)',
        }}
      >
        <span className="text-[8px] font-bold text-black/60" style={{ transform: 'rotateX(-25deg) rotateY(-30deg)' }}>{label}</span>
      </div>

    </div>
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
  // 正面投影：x → x, y → y（忽略 z 深度）
  const px = pos.x;
  const py = pos.y;
  const dist = Math.sqrt(px ** 2 + py ** 2);

  return (
    <>
      {/* 光束线 */}
      <svg
        className="absolute pointer-events-none"
        style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        <line
          x1="50%"
          y1="50%"
          x2={`calc(50% + ${px}px)`}
          y2={`calc(50% + ${py}px)`}
          stroke={color}
          strokeWidth={1.5}
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
      const newEl = Math.max(-90, Math.min(90, dragStartRef.current.el + dy * 0.3));
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
      className={`rounded-2xl shadow-2xl overflow-hidden border backdrop-blur-xl flex ${
        isDark ? 'bg-[#1a1a1a]/95 border-zinc-700/50' : 'bg-white/95 border-gray-200 shadow-xl'
      }`}
      style={{ width: 'auto', minWidth: 700, maxWidth: '100%' }}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* ===== 左侧：3D 预览 ===== */}
      <div
        className={`relative flex flex-col border-r ${isDark ? 'bg-[#0d0d0d] border-zinc-700/50' : 'bg-gray-100 border-gray-200'}`}
        style={{ width: 350, minHeight: 480 }}
      >
        {/* 顶部标题栏（透视/正面切换 + 关闭按钮） */}
        <div className="flex justify-between items-center px-3 pt-3 pb-1">
          <div className={`z-10 flex p-1 rounded-full backdrop-blur-sm border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-gray-200'}`}>
            <button
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                viewMode === 'perspective'
                  ? (isDark ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800')
                  : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800')
              }`}
              onClick={() => setViewMode('perspective')}
            >
              透视
            </button>
            <button
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                viewMode === 'front'
                  ? (isDark ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800')
                  : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800')
              }`}
              onClick={() => setViewMode('front')}
            >
              正面
            </button>
          </div>
          <button
            className={`transition-colors cursor-pointer ${isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
            onClick={onClose}
            title="关闭"
          >
            <Icons.X size={18} />
          </button>
        </div>
        {/* 3D 场景 */}
        <div
          ref={sceneRef}
          className="flex-1 w-full relative overflow-hidden select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleSceneMouseDown}
        >
          {/* 透视模式 */}
          {viewMode === 'perspective' && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ perspective: PERSPECTIVE }}
            >
              <div
                className="absolute"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: 'rotateX(-25deg) rotateY(-30deg)',
                  width: 0,
                  height: 0,
                }}
              >
                {/* 地面参考圆（赤道平面） */}
                <div
                  className="absolute"
                  style={{
                    width: 220,
                    height: 220,
                    left: -110,
                    top: -110,
                    borderRadius: '50%',
                    border: '1px solid rgba(168,85,247,0.18)',
                    transform: 'rotateX(90deg) translateZ(0px)',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    width: 160,
                    height: 160,
                    left: -80,
                    top: -80,
                    borderRadius: '50%',
                    border: '1px solid rgba(168,85,247,0.10)',
                    transform: 'rotateX(90deg) translateZ(0px)',
                  }}
                />
                {/* 方位十字线 */}
                <div style={{ transformStyle: 'preserve-3d', transform: 'rotateX(90deg)' }}>
                  <div className="absolute" style={{ left: -110, top: -0.5, width: 220, height: 1, background: 'rgba(168,85,247,0.10)' }} />
                  <div className="absolute" style={{ left: -0.5, top: -110, width: 1, height: 220, background: 'rgba(168,85,247,0.10)' }} />
                </div>
                {/* 方位标注 */}
                <div style={{ transformStyle: 'preserve-3d', transform: 'rotateX(90deg)' }}>
                  <span className="absolute text-[9px] text-purple-400/50 font-medium" style={{ left: 112, top: -6 }}>右</span>
                  <span className="absolute text-[9px] text-purple-400/50 font-medium" style={{ left: -120, top: -6 }}>左</span>
                  <span className="absolute text-[9px] text-purple-400/50 font-medium" style={{ left: -4, top: -122 }}>后</span>
                  <span className="absolute text-[9px] text-purple-400/50 font-medium" style={{ left: -4, top: 112 }}>前</span>
                </div>

                {/* 中心图片卡片 */}
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
                  />
                )}

                {/* 辅光 */}
                {fillLight.enabled && !isDragging && (
                  <LightOrb3D
                    pos={fillPos}
                    color={fillLight.color}
                    size={11}
                    label="F"
                  />
                )}

                {/* 拖拽中的灯光 */}
                {isDragging && (
                  <LightOrb3D
                    pos={currentDragPos}
                    color={currentLight.color}
                    size={16}
                    label={activeTab === 'main' ? 'M' : 'F'}
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
                <div className="absolute inset-0 rounded-full border border-purple-500/18" />
                <div className="absolute" style={{ left: 0, top: '50%', width: '100%', height: 1, background: 'rgba(168,85,247,0.10)', marginTop: -0.5 }} />
                <div className="absolute" style={{ left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(168,85,247,0.10)', marginLeft: -0.5 }} />
                <span className="absolute text-[9px] text-purple-400/50 font-medium" style={{ right: -18, top: '50%', marginTop: -6 }}>右</span>
                <span className="absolute text-[9px] text-purple-400/50 font-medium" style={{ left: -18, top: '50%', marginTop: -6 }}>左</span>
                <span className="absolute text-[9px] text-purple-400/50 font-medium" style={{ left: '50%', top: -16, marginLeft: -4 }}>上</span>
                <span className="absolute text-[9px] text-purple-400/50 font-medium" style={{ left: '50%', bottom: -16, marginLeft: -4 }}>下</span>
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

        {/* 重置按钮 */}
        <div className="absolute bottom-4 left-4">
          <button
            className={`flex items-center gap-1.5 text-sm transition-colors cursor-pointer ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={handleReset}
          >
            <Icons.RotateCcw size={14} />
            <span>重置</span>
          </button>
        </div>
      </div>

      {/* ===== 右侧：控制面板 ===== */}
      <div className={`w-full p-4 flex flex-col gap-3 ${isDark ? 'bg-black border-l border-white/5' : 'bg-white border-l border-gray-200'}`} style={{ width: 350 }}>
        {/* 主光/辅光标签页 */}
        <div className={`flex gap-1 p-1 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-100'} rounded-xl`}>
          <button
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'main'
                ? (isDark ? 'bg-[#1a1a1a] text-purple-400 shadow-sm border border-purple-500/20' : 'bg-white text-purple-600 shadow-sm border border-purple-300')
                : (isDark ? 'text-gray-500 hover:text-gray-300 border border-transparent' : 'text-gray-400 hover:text-gray-600 border border-transparent')
            }`}
            onClick={() => setActiveTab('main')}
          >
            主光 (Main)
          </button>
          <button
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'fill'
                ? (isDark ? 'bg-[#1a1a1a] text-purple-400 shadow-sm border border-purple-500/20' : 'bg-white text-purple-600 shadow-sm border border-purple-300')
                : (isDark ? 'text-gray-500 hover:text-gray-300 border border-transparent' : 'text-gray-400 hover:text-gray-600 border border-transparent')
            }`}
            onClick={() => setActiveTab('fill')}
          >
            辅光 (Fill)
            {fillLight.enabled && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
            )}
          </button>
        </div>

        {/* 启用辅光开关（仅在辅光标签页显示） */}
        {activeTab === 'fill' && (
          <div className={`flex items-center justify-between ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'} p-2.5 rounded-xl border ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>启用辅助光源</span>
            <button
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                fillLight.enabled
                  ? 'bg-purple-600'
                  : (isDark ? 'bg-zinc-700' : 'bg-gray-300')
              }`}
              onClick={() => setFillLight(prev => ({ ...prev, enabled: !prev.enabled }))}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                style={{ left: fillLight.enabled ? 18 : 2 }}
              />
            </button>
          </div>
        )}

        {/* 预设位置 */}
        <div className="space-y-2">
          <h3 className={`text-[11px] uppercase tracking-wider font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>预设位置</h3>
          <div className="grid grid-cols-4 gap-1.5">
            {LIGHT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                className={`${isDark ? 'bg-[#111] hover:bg-[#222] hover:text-purple-300 border border-white/5 hover:border-purple-500/30' : 'bg-gray-50 hover:bg-gray-100 hover:text-purple-600 border border-gray-200 hover:border-purple-300'} rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  activePreset === preset.name
                    ? (isDark ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-300')
                    : (isDark ? 'text-gray-400' : 'text-gray-500')
                }`}
                onClick={() => handlePreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* 参数调节 */}
        {(activeTab === 'main' || activeTab === 'fill') && (
          <div className="space-y-3">
            <h3 className={`text-[11px] uppercase tracking-wider font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>参数调节</h3>

            {/* 水平环绕 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>水平环绕 (Azimuth)</span>
                <span className={`font-mono text-[11px] ${isDark ? 'bg-[#0a0a0a] text-purple-300 border-white/5' : 'bg-gray-100 text-purple-600 border-gray-200'} px-1.5 py-0.5 rounded border w-12 text-center`}>
                  {currentLight.azimuth}°
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={currentLight.azimuth}
                onChange={(e) => handleParamChange('azimuth', Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                style={{ background: getSliderGradient(currentLight.azimuth, 0, 360, '#a855f7') }}
              />
            </div>

            {/* 高度 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>高度 (Elevation)</span>
                <span className={`font-mono text-[11px] ${isDark ? 'bg-[#0a0a0a] text-purple-300 border-white/5' : 'bg-gray-100 text-purple-600 border-gray-200'} px-1.5 py-0.5 rounded border w-12 text-center`}>
                  {currentLight.elevation}°
                </span>
              </div>
              <input
                type="range"
                min={-90}
                max={90}
                value={currentLight.elevation}
                onChange={(e) => handleParamChange('elevation', Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                style={{ background: getSliderGradient(currentLight.elevation, -90, 90, '#a855f7') }}
              />
            </div>

            {/* 强度 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>强度 (Intensity)</span>
                <span className={`font-mono text-[11px] ${isDark ? 'bg-[#0a0a0a] text-purple-300 border-white/5' : 'bg-gray-100 text-purple-600 border-gray-200'} px-1.5 py-0.5 rounded border w-12 text-center`}>
                  {currentLight.intensity}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={currentLight.intensity}
                onChange={(e) => handleParamChange('intensity', Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                style={{ background: getSliderGradient(currentLight.intensity, 0, 100, '#a855f7') }}
              />
            </div>
          </div>
        )}

        {/* 灯光颜色 */}
        {(activeTab === 'main' || activeTab === 'fill') && (
          <div className="space-y-2">
            <h3 className={`text-[11px] uppercase tracking-wider font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>灯光颜色</h3>
            <div className={`flex items-center gap-3 ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-gray-50 border-gray-200'} border rounded-xl p-2`}>
              <div className={`relative w-7 h-7 rounded-md ${isDark ? 'border-white/10' : 'border-gray-300'} border shrink-0 shadow-inner cursor-pointer`} style={{ background: currentLight.color }}>
                <input
                  key={`${activeTab}-color`}
                  type="color"
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  value={currentLight.color}
                  onChange={(e) => handleParamChange('color', e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <span className={`text-[9px] font-bold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>HEX COLOR</span>
                <input
                  key={`${activeTab}-hex`}
                  type="text"
                  className={`bg-transparent border-none outline-none text-xs w-full font-mono uppercase transition-colors ${isDark ? 'text-gray-200 focus:text-purple-300' : 'text-gray-800 focus:text-purple-600'}`}
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
          </div>
        )}

        {/* 提示词开关 */}
        <div className="flex items-center justify-between">
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>提示词</span>
          <button
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              includePrompt
                ? 'bg-purple-600'
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
          isDark ? 'bg-purple-500/8 border-purple-500/15 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-600'
        }`}>
          主光：{mainLight.azimuth}°{getElevationLabel(mainLight.elevation)}，强度{mainLight.intensity}%，{mainLight.color}色光
          {fillLight.enabled && ` | 辅光：${fillLight.azimuth}°${getElevationLabel(fillLight.elevation)}，强度${fillLight.intensity}%，${fillLight.color}光`}
          {includePrompt && prompt ? `。原始描述：${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}` : ''}
        </div>

        {/* 底部操作栏 */}
        <div className="mt-auto flex items-center justify-end gap-2">
          {/* 数量选择 */}
          <div className="flex items-center gap-2 count-dropdown-container relative">
            <button
              className={`flex items-center gap-2 cursor-pointer group h-8 px-3 rounded-lg border transition-all ${
                isDark ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => setCountDropdownOpen(!countDropdownOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors ${isDark ? 'text-zinc-400 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-700'}`} aria-hidden="true">
                <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path>
                <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path>
                <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>
              </svg>
              <span className={`text-xs font-medium transition-colors select-none min-w-[20px] text-center ${isDark ? 'text-zinc-300 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-800'}`}>{count}</span>
            </button>

            {countDropdownOpen && (
              <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max min-w-[130px] ${isDark ? 'bg-[#1a1a1a] border-zinc-700' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl py-1.5 z-[100]`}>
                <div className="max-h-[300px] overflow-y-auto px-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className={`relative px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-between cursor-pointer mb-0.5 ${
                        count === n
                          ? (isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-600')
                          : (isDark ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800')
                      }`}
                      onClick={() => { setCount(n); setCountDropdownOpen(false); }}
                    >
                      <span className="whitespace-nowrap pr-2">{n}</span>
                      {count === n && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 shrink-0 ml-2" aria-hidden="true">
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
            className="h-8 px-5 rounded-lg text-[13px] font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98]"
            onClick={handleGenerateClick}
            disabled={isLoading}
          >
            {isLoading ? <Icons.Loader2 size={14} className="animate-spin" /> : <Icons.Wand2 size={14} />}
            <span>{isLoading ? '生成中' : '生成'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
