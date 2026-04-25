import React, { useState, useRef, useEffect, useCallback } from "react";
import { NodeData } from "../../types";

interface GridSplitOverlayProps {
  width: number;
  height: number;
  rows: number;
  cols: number;
  selectedCells: string[];
  onToggleCell: (cellId: string) => void;
  isDark?: boolean;
}

export const GridSplitOverlay: React.FC<GridSplitOverlayProps> = ({
  width,
  height,
  rows,
  cols,
  selectedCells,
  onToggleCell,
  isDark = true,
}) => {
  const cellW = width / cols;
  const cellH = height / rows;

  return (
    <div className="absolute inset-0 z-10" style={{ pointerEvents: "auto" }}>
      <svg
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ pointerEvents: "none" }}
      >
        {/* Grid lines */}
        {Array.from({ length: cols - 1 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={(i + 1) * cellW}
            y1={0}
            x2={(i + 1) * cellW}
            y2={height}
            stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: rows - 1 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={(i + 1) * cellH}
            x2={width}
            y2={(i + 1) * cellH}
            stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"}
            strokeWidth={1}
          />
        ))}
      </svg>

      {/* Clickable cell areas */}
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const cellId = `${r}-${c}`;
        const isSelected = selectedCells.includes(cellId);

        return (
          <div
            key={cellId}
            className="absolute cursor-pointer transition-colors duration-150"
            style={{
              left: c * cellW,
              top: r * cellH,
              width: cellW,
              height: cellH,
              background: isSelected
                ? "rgba(250,204,21,0.25)"
                : isDark
                  ? "rgba(0,0,0,0.15)"
                  : "rgba(255,255,255,0.15)",
              border: isSelected
                ? "1.5px solid rgba(250,204,21,0.6)"
                : "1px solid transparent",
              pointerEvents: "auto",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCell(cellId);
            }}
          >
            <span
              className={`absolute inset-0 flex items-center justify-center text-[10px] font-medium ${
                isSelected
                  ? "text-yellow-400/80"
                  : isDark
                    ? "text-white/30"
                    : "text-black/30"
              }`}
            >
              {r + 1},{c + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
};

interface GridSplitToolbarProps {
  rows: number;
  cols: number;
  selectedCount: number;
  totalCount: number;
  onSetSize: (rows: number, cols: number) => void;
  onClose: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCreateNodes?: () => void;
  onDownload?: () => void;
  isDark?: boolean;
}

const GRID_PRESETS = [
  { label: "2×2", rows: 2, cols: 2 },
  { label: "3×3", rows: 3, cols: 3 },
  { label: "4×4", rows: 4, cols: 4 },
  { label: "5×5", rows: 5, cols: 5 },
];

export const GridSplitToolbar: React.FC<GridSplitToolbarProps> = ({
  rows,
  cols,
  selectedCount,
  totalCount,
  onSetSize,
  onClose,
  onSelectAll,
  onDeselectAll,
  onCreateNodes,
  onDownload,
  isDark = true,
}) => {
  const [customOpen, setCustomOpen] = useState(false);
  const [customRows, setCustomRows] = useState(rows);
  const [customCols, setCustomCols] = useState(cols);
  const customRef = useRef<HTMLDivElement>(null);

  // 判断当前是否为自定义尺寸（不在预设中）
  const isCustomSize = !GRID_PRESETS.some(
    (p) => p.rows === rows && p.cols === cols,
  );

  // 点击外部关闭自定义面板
  useEffect(() => {
    if (!customOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setCustomOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [customOpen]);

  // 打开自定义面板时同步当前行列
  useEffect(() => {
    if (customOpen) {
      setCustomRows(rows);
      setCustomCols(cols);
    }
  }, [customOpen, rows, cols]);

  const handleCustomApply = useCallback(() => {
    const r = Math.max(1, Math.min(10, customRows));
    const c = Math.max(1, Math.min(10, customCols));
    onSetSize(r, c);
    setCustomOpen(false);
  }, [customRows, customCols, onSetSize]);

  const controlPanelBg = isDark
    ? "bg-[#1a1a1a]/95 backdrop-blur-xl border-zinc-700/50"
    : "bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl";
  const buttonBase = isDark
    ? "text-zinc-300 hover:text-white hover:bg-zinc-700/50"
    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100";
  const buttonActive = isDark
    ? "text-yellow-400 bg-yellow-500/20"
    : "text-yellow-600 bg-yellow-100";
  const separator = isDark ? "bg-zinc-600" : "bg-gray-300";

  const inputClass = isDark
    ? "w-10 h-6 rounded bg-zinc-800 border border-zinc-600 text-center text-xs text-white focus:outline-none focus:border-yellow-500"
    : "w-10 h-6 rounded bg-gray-50 border border-gray-300 text-center text-xs text-gray-900 focus:outline-none focus:border-yellow-500";

  return (
    <div
      className={`${controlPanelBg} rounded-xl p-1.5 flex items-center gap-1.5 border`}
    >
      {/* 预设 */}
      {GRID_PRESETS.map((preset) => (
        <button
          key={preset.label}
          className={`${
            rows === preset.rows && cols === preset.cols && !isCustomSize
              ? buttonActive
              : buttonBase
          } inline-flex h-7 items-center justify-center whitespace-nowrap rounded-lg px-2.5 leading-none transition-colors cursor-pointer text-xs`}
          onClick={() => onSetSize(preset.rows, preset.cols)}
        >
          {preset.label}
        </button>
      ))}

      {/* 自定义按钮 */}
      <div ref={customRef} className="relative">
        <button
          className={`${isCustomSize ? buttonActive : buttonBase} inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer p-1`}
          title="自定义切分"
          onClick={() => setCustomOpen(!customOpen)}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* 自定义面板 - 向上弹出 */}
        {customOpen && (
          <div
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${controlPanelBg} rounded-xl p-2 shadow-xl z-50 border flex items-center gap-2`}
          >
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={10}
                value={customRows}
                onChange={(e) =>
                  setCustomRows(
                    Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                  )
                }
                className={inputClass}
                aria-label="行数"
              />
              <span
                className={`text-xs leading-none ${isDark ? "text-zinc-400" : "text-gray-500"}`}
              >
                ×
              </span>
              <input
                type="number"
                min={1}
                max={10}
                value={customCols}
                onChange={(e) =>
                  setCustomCols(
                    Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                  )
                }
                className={inputClass}
                aria-label="列数"
              />
            </div>
            <button
              className="inline-flex h-6 items-center justify-center whitespace-nowrap rounded-md px-2.5 leading-none text-xs font-medium bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white cursor-pointer transition-all"
              onClick={handleCustomApply}
            >
              应用
            </button>
          </div>
        )}
      </div>

      {/* 分隔线 */}
      <div className={`${separator} h-5 w-px`} />

      {/* 全选/取消 */}
      <button
        className={`${buttonBase} inline-flex h-7 items-center justify-center whitespace-nowrap rounded-lg px-2.5 leading-none transition-colors cursor-pointer text-xs`}
        onClick={onSelectAll}
      >
        全选
      </button>
      <button
        className={`${buttonBase} inline-flex h-7 items-center justify-center whitespace-nowrap rounded-lg px-2.5 leading-none transition-colors cursor-pointer text-xs`}
        onClick={onDeselectAll}
      >
        取消
      </button>

      {/* 选中计数 */}
      <span
        className={`text-[11px] leading-none tabular-nums ${isDark ? "text-zinc-500" : "text-gray-400"}`}
      >
        {selectedCount}/{totalCount}
      </span>

      {/* 分隔线 */}
      <div className={`${separator} h-5 w-px`} />

      {/* 创建节点 */}
      {onCreateNodes && (
        <button
          className="inline-flex h-7 items-center justify-center whitespace-nowrap rounded-lg px-3 leading-none text-xs font-semibold transition-all cursor-pointer bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg shadow-yellow-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onCreateNodes}
          disabled={selectedCount === 0}
        >
          创建节点
        </button>
      )}

      {/* 下载 */}
      {onDownload && (
        <button
          className={`${buttonBase} inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer p-1`}
          onClick={onDownload}
          title="下载选中"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-download"
            aria-hidden="true"
          >
            <path d="M12 15V3"></path>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <path d="m7 10 5 5 5-5"></path>
          </svg>
        </button>
      )}

      {/* 关闭 */}
      <button
        className={`${buttonBase} inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer p-1`}
        onClick={onClose}
        title="关闭"
      >
        ✕
      </button>
    </div>
  );
};
