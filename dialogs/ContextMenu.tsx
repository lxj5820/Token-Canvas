import React from "react";
import { Icons } from "../components/Icons";
import { NodeData, NodeType } from "../types";

interface ContextMenuProps {
  contextMenu: {
    type: "CANVAS" | "NODE";
    nodeId?: string;
    nodeType?: NodeType;
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null;
  isDark: boolean;
  nodes: NodeData[];
  internalClipboard: { nodes: NodeData[]; connections: any[] } | null;
  onCopy: () => void;
  onPaste: (pos: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onAddNode: (type: NodeType, x: number, y: number) => void;
  onReplaceImage?: (nodeId: string) => void;
  onCopyImageToClipboard?: (nodeId: string) => void;
  onToggleVideoType?: (nodeId: string) => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  isDark,
  nodes,
  internalClipboard,
  onCopy,
  onPaste,
  onDelete,
  onAddNode,
  onReplaceImage,
  onCopyImageToClipboard,
  onToggleVideoType,
  onClose,
}) => {
  if (!contextMenu) return null;

  const menuItemClass = `text-left px-3 py-2 text-xs transition-all duration-150 flex items-center gap-2.5 rounded-md mx-1 ${
    isDark
      ? "text-gray-300 hover:bg-zinc-800/80 hover:text-white"
      : "text-gray-700 hover:bg-gray-100 hover:text-black"
  }`;

  return (
    <div
      className={`fixed z-50 border rounded-xl shadow-2xl py-2 min-w-[180px] flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ${
        isDark
          ? "bg-zinc-900/95 border-zinc-700/80"
          : "bg-white/95 border-gray-200"
      }`}
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {contextMenu.type === "NODE" &&
        contextMenu.nodeId &&
        (() => {
          const node = nodes.find((n) => n.id === contextMenu.nodeId);
          const canToggleVideoType =
            node?.type === NodeType.TEXT_TO_VIDEO ||
            node?.type === NodeType.START_END_TO_VIDEO;

          return (
            <>
              <button
                className={menuItemClass}
                onClick={() => {
                  onCopy();
                  onClose();
                }}
              >
                <Icons.Copy size={14} /> 复制节点
              </button>
              {contextMenu.nodeType === NodeType.ORIGINAL_IMAGE &&
                onReplaceImage && (
                  <button
                    className={menuItemClass}
                    onClick={() => {
                      onReplaceImage(contextMenu.nodeId!);
                      onClose();
                    }}
                  >
                    <Icons.Upload size={14} /> 替换图片
                  </button>
                )}
              {canToggleVideoType && onToggleVideoType && (
                <button
                  className={menuItemClass}
                  onClick={() => {
                    onToggleVideoType(contextMenu.nodeId!);
                    onClose();
                  }}
                >
                  <Icons.RefreshCw size={14} />{" "}
                  {node?.type === NodeType.TEXT_TO_VIDEO
                    ? "切换为首尾帧模式"
                    : "切换为普通视频模式"}
                </button>
              )}
              {onCopyImageToClipboard && (
                <button
                  className={menuItemClass}
                  onClick={() => {
                    onCopyImageToClipboard(contextMenu.nodeId!);
                    onClose();
                  }}
                >
                  <Icons.Image size={14} /> 复制图片数据
                </button>
              )}
              <div
                className={`h-px my-1.5 mx-2 ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}
              ></div>
              <button
                className={`text-left px-3 py-2 text-xs transition-all duration-150 flex items-center gap-2.5 rounded-md mx-1 text-red-400 ${
                  isDark
                    ? "hover:bg-red-500/10 hover:text-red-300"
                    : "hover:bg-red-50 hover:text-red-600"
                }`}
                onClick={() => {
                  if (contextMenu.nodeId) onDelete(contextMenu.nodeId);
                  onClose();
                }}
              >
                <Icons.Trash2 size={14} /> 删除
              </button>
            </>
          );
        })()}

      {contextMenu.type === "CANVAS" && (
        <>
          <button
            className={`${menuItemClass} ${!internalClipboard ? "opacity-40 cursor-not-allowed" : ""}`}
            onClick={() => {
              if (internalClipboard) {
                onPaste({ x: contextMenu.worldX, y: contextMenu.worldY });
              }
              onClose();
            }}
            disabled={!internalClipboard}
          >
            <Icons.Copy size={14} /> 粘贴
          </button>
          <div
            className={`h-px my-1.5 mx-2 ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}
          ></div>
          <div
            className={`px-3 py-1 text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-gray-400"}`}
          >
            添加节点
          </div>
          <button
            className={menuItemClass}
            onClick={() => {
              onAddNode(
                NodeType.TEXT_TO_IMAGE,
                contextMenu.worldX,
                contextMenu.worldY,
              );
              onClose();
            }}
          >
            <div className="w-5 h-5 rounded bg-yellow-500/10 flex items-center justify-center">
              <Icons.Image size={12} className="text-yellow-400" />
            </div>
            <span>生图</span>
          </button>
          <button
            className={menuItemClass}
            onClick={() => {
              onAddNode(
                NodeType.TEXT_TO_VIDEO,
                contextMenu.worldX,
                contextMenu.worldY,
              );
              onClose();
            }}
          >
            <div className="w-5 h-5 rounded bg-yellow-500/10 flex items-center justify-center">
              <Icons.Video size={12} className="text-yellow-400" />
            </div>
            <span>生视频</span>
          </button>
          <button
            className={menuItemClass}
            onClick={() => {
              onAddNode(
                NodeType.TEXT_TO_AUDIO,
                contextMenu.worldX,
                contextMenu.worldY,
              );
              onClose();
            }}
          >
            <div className="w-5 h-5 rounded bg-green-500/10 flex items-center justify-center">
              <Icons.Music size={12} className="text-green-400" />
            </div>
            <span>生音频</span>
          </button>
          <button
            className={menuItemClass}
            onClick={() => {
              onAddNode(
                NodeType.START_END_TO_VIDEO,
                contextMenu.worldX,
                contextMenu.worldY,
              );
              onClose();
            }}
          >
            <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center">
              <Icons.Frame size={12} className="text-emerald-400" />
            </div>
            <span>首尾帧视频</span>
          </button>
        </>
      )}
    </div>
  );
};
