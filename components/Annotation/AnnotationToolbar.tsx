import React, { useState, useRef, useEffect } from 'react';
import { AnnotationTool } from '../../types';
import { Icons } from '../Icons';

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClose: () => void;
  isDark?: boolean;
}

const toolConfig: { key: AnnotationTool; label: string; icon: React.ReactNode }[] = [
  { key: 'pen', label: '画笔', icon: <Icons.Edit3 size={13} /> },
  { key: 'eraser', label: '橡皮', icon: <Icons.Eraser size={13} /> },
  { key: 'rect', label: '矩形', icon: <Icons.Frame size={13} /> },
  { key: 'text', label: '文字', icon: <Icons.Type size={13} /> },
];

const COLORS = ['#FF0000', '#FFD700', '#00CC00', '#4488FF', '#FF44FF', '#FFFFFF'];

const SLIDER_WIDTH = 64; // px
const THUMB_SIZE = 12; // px (w-3 = 12px)
const MIN_STROKE = 1;
const MAX_STROKE = 40;

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  activeTool,
  onToolChange,
  currentColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  onClose,
  isDark = true,
}) => {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭颜色选择器
  useEffect(() => {
    if (!colorPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [colorPickerOpen]);

  const buttonBase = isDark
    ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50 active:bg-zinc-600/50'
    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200';
  const buttonActive = isDark
    ? 'text-yellow-400 bg-yellow-500/20'
    : 'text-yellow-600 bg-yellow-100';
  const separatorColor = isDark ? 'bg-zinc-600' : 'bg-gray-300';

  // 滑块位置计算
  const ratio = (strokeWidth - MIN_STROKE) / (MAX_STROKE - MIN_STROKE);
  const filledWidth = ratio * SLIDER_WIDTH;
  const thumbLeft = ratio * (SLIDER_WIDTH - THUMB_SIZE);

  return (
    <div className={`bg-[#1a1a1a]/95 backdrop-blur-xl border-zinc-700/50 flex w-fit items-center gap-1.5 rounded-xl p-1.5 shadow-md border`}>
      {/* 工具按钮组 */}
      {toolConfig.map(tool => (
        <button
          key={tool.key}
          className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${
            activeTool === tool.key ? buttonActive : buttonBase
          }`}
          title={tool.label}
          onClick={() => onToolChange(tool.key)}
        >
          <span className={activeTool === tool.key ? '' : 'opacity-60'}>{tool.icon}</span>
        </button>
      ))}

      {/* 分隔线 */}
      <div className={`${separatorColor} h-5 w-px shrink-0`} />

      {/* 颜色选择器 */}
      <div ref={colorPickerRef} className="relative">
        <button
          className={`${buttonBase} inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer`}
          title="选择颜色"
          onClick={() => setColorPickerOpen(!colorPickerOpen)}
        >
          <span
            className="h-4 w-4 rounded-full border-2 border-white/30"
            style={{ backgroundColor: currentColor }}
          />
        </button>

        {/* 颜色弹出面板 - 向上弹出 */}
        {colorPickerOpen && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1a1a1a]/95 backdrop-blur-xl border-zinc-700/50 border rounded-xl p-2.5 shadow-xl z-50">
            <div className="flex flex-wrap gap-2 max-w-[120px]">
              {COLORS.map(color => (
                <button
                  key={color}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer shrink-0 ${
                    currentColor === color ? 'scale-110 border-white shadow-[0_0_6px_rgba(255,255,255,0.4)]' : 'border-white/10'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onColorChange(color);
                    setColorPickerOpen(false);
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 线宽滑块 */}
      <div className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg bg-transparent px-2 text-neutral-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 opacity-60">
          <path fill="currentColor" d="M8.631 1.304c.394-.142.802-.22 1.196-.168.409.054.774.245 1.058.583.334.397.374.874.273 1.32-.098.43-.335.875-.622 1.305-.576.863-1.473 1.834-2.324 2.763-.872.95-1.699 1.857-2.21 2.641-.257.393-.406.715-.458.963-.047.231-.004.354.073.443.093.108.191.149.345.14.184-.012.443-.1.78-.293.672-.385 1.462-1.076 2.285-1.844.799-.745 1.632-1.566 2.33-2.128.348-.28.7-.527 1.027-.668.288-.125.706-.23 1.078 0l.073.05.129.106c.286.256.46.57.519.926.064.388-.017.778-.149 1.136-.26.702-.794 1.463-1.283 2.153-.513.724-.985 1.384-1.235 1.964-.252.58-.197.872.004 1.07a.58.58 0 0 0 .38.187c.137.01.312-.025.532-.124.451-.203.946-.61 1.442-1.056l.348.387.348.386c-.49.44-1.093.953-1.71 1.232-.315.142-.668.239-1.035.212a1.62 1.62 0 0 1-1.037-.485c-.672-.665-.53-1.52-.227-2.222.304-.703.855-1.465 1.342-2.152.511-.722.953-1.366 1.156-1.913.098-.268.12-.464.097-.606a.54.54 0 0 0-.216-.344.6.6 0 0 0-.143.047q-.293.127-.789.524c-.658.53-1.435 1.299-2.272 2.08-.814.759-1.686 1.531-2.477 1.984-.394.227-.817.402-1.234.428a1.41 1.41 0 0 1-1.198-.5c-.34-.396-.395-.874-.301-1.329.09-.437.32-.887.604-1.322.569-.871 1.463-1.847 2.315-2.776.873-.952 1.704-1.857 2.226-2.638.262-.391.416-.711.473-.958.052-.23.01-.342-.054-.419a.6.6 0 0 0-.4-.221c-.172-.023-.405.006-.707.114-.612.22-1.365.712-2.199 1.382C5.116 5.005 3.326 6.88 1.911 8.206l-.711-.76c1.347-1.262 3.226-3.22 4.933-4.592.854-.687 1.717-1.27 2.498-1.55" />
        </svg>
        <div className="relative flex h-3 shrink-0 items-center" style={{ width: SLIDER_WIDTH }}>
          {/* 背景轨道 */}
          <div className="pointer-events-none absolute inset-x-0 h-1 rounded-full bg-neutral-600" />
          {/* 填充轨道 */}
          <div
            className="pointer-events-none absolute left-0 h-1 rounded-full bg-yellow-500/70"
            style={{ width: filledWidth }}
          />
          {/* 圆形指示器 */}
          <div
            className="pointer-events-none absolute top-0 h-3 w-3 rounded-full border border-neutral-100 bg-white"
            style={{ left: thumbLeft }}
          />
          {/* 实际 range input */}
          <input
            aria-label="线宽"
            min={MIN_STROKE}
            max={MAX_STROKE}
            step={1}
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
            className="absolute inset-0 h-3 w-full cursor-pointer appearance-none bg-transparent opacity-0 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-neutral-100 [&::-webkit-slider-thumb]:bg-white"
            type="range"
          />
        </div>
      </div>

      {/* 分隔线 */}
      <div className={`${separatorColor} h-5 w-px shrink-0`} />

      {/* 撤销 */}
      <button
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 ${
          canUndo ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50 active:bg-zinc-600/50 cursor-pointer' : 'text-zinc-300 opacity-50 cursor-not-allowed'
        }`}
        title="撤销"
        onClick={onUndo}
        disabled={!canUndo}
      >
        <Icons.RotateCcw size={13} className="opacity-60" />
      </button>

      {/* 重做 */}
      <button
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 ${
          canRedo ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50 active:bg-zinc-600/50 cursor-pointer' : 'text-zinc-300 opacity-50 cursor-not-allowed'
        }`}
        title="重做"
        onClick={onRedo}
        disabled={!canRedo}
      >
        <Icons.RotateCw size={13} className="opacity-60" />
      </button>

      {/* 清空 */}
      <button
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 ${
          canUndo ? 'text-zinc-300 hover:text-red-400 hover:bg-zinc-700/50 active:bg-zinc-600/50 cursor-pointer' : 'text-zinc-300 opacity-50 cursor-not-allowed'
        }`}
        title="清空"
        onClick={onClear}
        disabled={!canUndo}
      >
        <Icons.Trash2 size={13} className="opacity-60" />
      </button>

      {/* 保存按钮 */}
      <button
        type="button"
        className="inline-flex h-7 items-center justify-center whitespace-nowrap rounded-lg px-3 leading-none bg-white text-neutral-950 hover:bg-neutral-200 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
        onClick={onClose}
      >
        保存
      </button>
    </div>
  );
};
