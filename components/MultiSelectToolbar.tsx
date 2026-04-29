import React, { useMemo } from "react";
import { NodeData, CanvasTransform } from "../types";
import { Icons } from "./Icons";

interface MultiSelectToolbarProps {
  selectedNodeIds: Set<string>;
  nodes: NodeData[];
  transform: CanvasTransform;
  isDark: boolean;
  onEdgeAlign: (
    direction: "left" | "right" | "top" | "bottom" | "h-center" | "v-center",
  ) => void;
  onDistribute: (direction: "horizontal" | "vertical") => void;
  onDelete: () => void;
  onGroup: () => void;
  onUnGroup: () => void;
  hasGroupInSelection: boolean;
}

export const MultiSelectToolbar: React.FC<MultiSelectToolbarProps> = ({
  selectedNodeIds,
  nodes,
  transform,
  isDark,
  onEdgeAlign,
  onDistribute,
  onDelete,
  onGroup,
  onUnGroup,
  hasGroupInSelection,
}) => {
  const selectionBounds = useMemo(() => {
    const selected = nodes.filter(
      (n) => selectedNodeIds.has(n.id) && n.type !== ("GROUP" as string),
    );
    if (selected.length < 2) return null;
    const xs = selected.map((n) => n.x);
    const ys = selected.map((n) => n.y);
    const rightEdges = selected.map((n) => n.x + n.width);
    const bottomEdges = selected.map((n) => n.y + n.height);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      x: minX,
      y: minY,
      width: Math.max(...rightEdges) - minX,
      height: Math.max(...bottomEdges) - minY,
    };
  }, [nodes, selectedNodeIds]);

  if (!selectionBounds || selectedNodeIds.size < 2) return null;

  const MULTI_SELECT_BOX_PADDING = 30;
  const TOOLBAR_GAP = 10;

  const screenX =
    transform.x + (selectionBounds.x + selectionBounds.width / 2) * transform.k;
  const screenY =
    transform.y + (selectionBounds.y - MULTI_SELECT_BOX_PADDING) * transform.k - TOOLBAR_GAP;

  const canDistribute = selectedNodeIds.size >= 3;

  const iconBtnBase = isDark
    ? "text-zinc-300 hover:text-white hover:bg-zinc-700/50 active:bg-zinc-600/50"
    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200";
  const iconBtnDisabled = isDark
    ? "text-zinc-600 cursor-not-allowed"
    : "text-gray-300 cursor-not-allowed";
  const separator = isDark ? "bg-zinc-600" : "bg-gray-300";

  return (
    <div
      className={`absolute flex items-center justify-center gap-1.5 rounded-xl p-1.5 backdrop-blur-xl border shadow-md z-[60] pointer-events-auto ${
        isDark
          ? "bg-[#1a1a1a]/95 border-zinc-700/50"
          : "bg-white/95 border-gray-200"
      }`}
      style={{
        left: screenX,
        top: screenY,
        transform: "translateX(-50%) translateY(-100%)",
        whiteSpace: "nowrap",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onEdgeAlign("left"); }}
        title="左对齐"
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
      >
        <Icons.AlignStartVertical size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onEdgeAlign("h-center"); }}
        title="水平居中"
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
      >
        <Icons.AlignCenterVertical size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onEdgeAlign("right"); }}
        title="右对齐"
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
      >
        <Icons.AlignEndVertical size={13} />
      </button>

      <div className={`${separator} mx-0.5 h-5 w-px`} />

      <button
        onClick={(e) => { e.stopPropagation(); onEdgeAlign("top"); }}
        title="顶对齐"
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
      >
        <Icons.AlignStartHorizontal size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onEdgeAlign("v-center"); }}
        title="垂直居中"
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
      >
        <Icons.AlignCenterHorizontal size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onEdgeAlign("bottom"); }}
        title="底对齐"
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
      >
        <Icons.AlignEndHorizontal size={13} />
      </button>

      <div className={`${separator} mx-0.5 h-5 w-px`} />

      <button
        onClick={(e) => { e.stopPropagation(); onDistribute("horizontal"); }}
        disabled={!canDistribute}
        title="水平等间距分布"
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${canDistribute ? iconBtnBase : iconBtnDisabled}`}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="2" width="2.5" height="10" rx="0.5" stroke="currentColor" strokeWidth="1" />
          <rect x="5.75" y="2" width="2.5" height="10" rx="0.5" stroke="currentColor" strokeWidth="1" />
          <rect x="10.5" y="2" width="2.5" height="10" rx="0.5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDistribute("vertical"); }}
        disabled={!canDistribute}
        title="垂直等间距分布"
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${canDistribute ? iconBtnBase : iconBtnDisabled}`}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="1" width="10" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
          <rect x="2" y="5.75" width="10" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
          <rect x="2" y="10.5" width="10" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      <div className={`${separator} mx-0.5 h-5 w-px`} />

      {hasGroupInSelection ? (
        <button
          onClick={(e) => { e.stopPropagation(); onUnGroup(); }}
          title="取消分组"
          className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onGroup(); }}
          title="打组"
          className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <rect x="4" y="4" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
            <rect x="8.5" y="4" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
            <rect x="4" y="8.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
            <rect x="8.5" y="8.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        </button>
      )}

      <div className={`${separator} mx-0.5 h-5 w-px`} />

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="删除选中"
        className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
      >
        <Icons.Trash2 size={13} />
      </button>
    </div>
  );
};
