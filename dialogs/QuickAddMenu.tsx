import React from 'react';
import { Icons } from '../components/Icons';
import { NodeType } from '../types';

interface QuickAddMenuProps {
  quickAddMenu: {
    sourceId: string;
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null;
  isDark: boolean;
  onAddNode: (type: NodeType) => void;
}

export const QuickAddMenu: React.FC<QuickAddMenuProps> = ({
  quickAddMenu,
  isDark,
  onAddNode,
}) => {
  if (!quickAddMenu) return null;

  const menuItemClass = `text-left px-3 py-2 text-xs transition-all duration-150 flex items-center gap-2.5 rounded-lg mx-1 ${
    isDark ? 'text-gray-300 hover:bg-zinc-800/80 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-black'
  }`;
  const groupLabelClass = `px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-gray-400'}`;

  return (
    <div
      className={`fixed z-50 border rounded-xl shadow-2xl py-2 min-w-[200px] flex flex-col animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${
        isDark ? 'bg-zinc-900/95 border-zinc-700/80' : 'bg-white/95 border-gray-200'
      }`}
      style={{ left: quickAddMenu.x, top: quickAddMenu.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={`px-3 pb-2 mb-1 text-[11px] font-semibold border-b ${isDark ? 'text-gray-200 border-zinc-800' : 'text-gray-800 border-gray-100'}`}>
        连接到节点
      </div>

      <div className={groupLabelClass}>生成</div>
      <button className={menuItemClass} onClick={() => onAddNode(NodeType.TEXT_TO_IMAGE)}>
        <div className="w-6 h-6 rounded-md bg-yellow-500/10 flex items-center justify-center">
          <Icons.Image size={14} className="text-yellow-400" />
        </div>
        <span>生图</span>
      </button>
      <button className={menuItemClass} onClick={() => onAddNode(NodeType.TEXT_TO_VIDEO)}>
        <div className="w-6 h-6 rounded-md bg-yellow-500/10 flex items-center justify-center">
          <Icons.Video size={14} className="text-yellow-400" />
        </div>
        <span>生视频</span>
      </button>
      <button className={menuItemClass} onClick={() => onAddNode(NodeType.TEXT_TO_AUDIO)}>
        <div className="w-6 h-6 rounded-md bg-green-500/10 flex items-center justify-center">
          <Icons.Music size={14} className="text-green-400" />
        </div>
        <span>生音频</span>
      </button>
      <button className={menuItemClass} onClick={() => onAddNode(NodeType.START_END_TO_VIDEO)}>
        <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
          <Icons.Frame size={14} className="text-emerald-400" />
        </div>
        <span>首尾帧视频</span>
      </button>
    </div>
  );
};
