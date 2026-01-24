import React from 'react';
import { NodeData, NodeType } from '../../types';

interface BaseNodeProps {
  data: NodeData;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onConnectStart: (e: React.MouseEvent, type: 'source' | 'target') => void;
  onPortMouseUp?: (e: React.MouseEvent, nodeId: string, type: 'source' | 'target') => void;
  onResizeStart?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  scale: number;
  isDark?: boolean;
}

const BaseNode: React.FC<BaseNodeProps> = ({ 
  data, selected, onMouseDown, onContextMenu, onConnectStart, onPortMouseUp, children, onResizeStart, isDark = true
}) => {
  
  const portBg = isDark ? 'bg-[#0B0C0E] border-zinc-500' : 'bg-white border-gray-400';
  const portText = isDark ? 'text-zinc-400' : 'text-gray-500';

  return (
    <div 
      className={`absolute flex flex-col group`}
      style={{
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        // Boost z-index to 100 if stack is open, otherwise 50 if selected, else 1
        zIndex: data.isStackOpen ? 100 : (selected ? 50 : 1), 
        overflow: 'visible' 
      }}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      {/* Selection Border */}
      {selected && (
          <div className={`absolute inset-0 pointer-events-none rounded-xl border-2 border-cyan-500/50 z-40 ${data.isStackOpen ? 'opacity-0' : 'opacity-100'}`}></div> 
      )}

      {/* Main Content Area */}
      <div className="relative w-full h-full">
          {children}

          {/* Connection Ports */}
          
          {/* INPUT PORT (Target) - Hidden for Original Image */}
          {data.type !== NodeType.ORIGINAL_IMAGE && (
            <div 
              className={`absolute w-4 h-4 rounded-full border -left-2 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform z-50 shadow-sm ${portBg}`}
              onMouseDown={(e) => e.stopPropagation()} // Prevent node drag
              onMouseUp={(e) => onPortMouseUp && onPortMouseUp(e, data.id, 'target')} // Handle drop
            >
                <span className={`text-[10px] leading-none select-none relative -top-[0.5px] ${portText}`}>+</span>
                <div className="absolute -inset-4 rounded-full bg-transparent z-10"></div>
            </div>
          )}

          {/* OUTPUT PORT (Source) - Available for All Nodes */}
          <div 
            className={`absolute w-4 h-4 rounded-full border -right-2 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform z-50 shadow-sm ${portBg}`}
            onMouseDown={(e) => onConnectStart(e, 'source')}
          >
                <span className={`text-[10px] leading-none select-none relative -top-[0.5px] ${portText}`}>+</span>
                <div className="absolute -inset-4 rounded-full bg-transparent z-10"></div>
          </div>

          {/* Resize Handle (Bottom Right of Main Box) */}
          <div 
              className="absolute -right-1 -bottom-1 w-6 h-6 cursor-se-resize z-50 flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={onResizeStart}
          >
              <div className={`w-2 h-2 border-r-2 border-b-2 ${isDark ? 'border-zinc-400' : 'border-gray-400'}`}></div>
          </div>
      </div>
    </div>
  );
};

export default BaseNode;