import React, { memo, useState, useRef, useCallback } from "react";
import { NodeData, NodeType } from "../../types";

interface BaseNodeProps {
  data: NodeData;
  selected: boolean;
  /** 稳定引用：由 BaseNode 内部绑定 data.id */
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  /** 稳定引用：由 BaseNode 内部绑定 data.id + data.type */
  onContextMenu: (e: React.MouseEvent, id: string, type: NodeType) => void;
  /** 稳定引用：由 BaseNode 内部绑定 data.id */
  onConnectStart: (e: React.MouseEvent, nodeId: string, type: "source" | "target") => void;
  onPortMouseUp?: (
    e: React.MouseEvent,
    nodeId: string,
    type: "source" | "target",
  ) => void;
  /** 稳定引用：由 BaseNode 内部绑定 data.id */
  onResizeStart?: (e: React.MouseEvent, nodeId: string) => void;
  children: React.ReactNode;
  scale: number;
  isDark?: boolean;
}

// 自定义连接端口组件
const ConnectionPort: React.FC<{
  type: "input" | "output";
  isDark: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
}> = ({ type, isDark, onMouseDown, onMouseUp }) => {
  const isInput = type === "input";
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const DETECT_RADIUS = 80;
  const SNAP_RADIUS = 30;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= SNAP_RADIUS) {
      setOffset({ x: dx, y: dy });
    } else if (dist <= DETECT_RADIUS) {
      const t = (dist - SNAP_RADIUS) / (DETECT_RADIUS - SNAP_RADIUS);
      const attraction = (1 - t) * (1 - t);
      setOffset({ x: dx * attraction, y: dy * attraction });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div
      className={`absolute ${isInput ? "-left-3" : "-right-3"} top-1/2 -translate-y-1/2 z-50 group/port`}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown?.(e);
      }}
      onMouseUp={onMouseUp}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    >
      <div
        className="absolute cursor-crosshair"
        style={{ pointerEvents: "all", inset: -48 }}
      />

      {isHovered && (
        <div
          className="pointer-events-none absolute z-40"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            transition: "transform 0.08s ease-out",
          }}
        >
          <div
            className={`
              w-8 h-8 rounded-full cursor-crosshair
              flex items-center justify-center
              transition-all duration-200 ease-out
              ${
                isDark
                  ? "bg-[#1e1e1e]/80 border border-zinc-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                  : "bg-white/80 border border-gray-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
              }
            `}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              className={isDark ? "text-zinc-400" : "text-gray-500"}
            >
              <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      {!isHovered && (
        <div
          className={`
        relative w-3.5 h-3.5 rounded-full cursor-crosshair
        transition-all duration-200 ease-out
        ${
          isDark
            ? "bg-[#1e1e1e] border border-zinc-600 shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            : "bg-white border border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
        }
        group-hover/port:scale-125 
        group-hover/port:border-yellow-500
        group-hover/port:shadow-[0_0_8px_rgba(59,130,246,0.5)]
      `}
        >
          <div
            className={`
          absolute inset-[3px] rounded-full
          transition-all duration-200
          ${isDark ? "bg-zinc-400" : "bg-gray-400"}
          group-hover/port:bg-yellow-500
        `}
          />
        </div>
      )}
    </div>
  );
};

const BaseNodeComponent: React.FC<BaseNodeProps> = ({
  data,
  selected,
  onMouseDown,
  onContextMenu,
  onConnectStart,
  onPortMouseUp,
  children,
  onResizeStart,
  isDark = true,
}) => {
  // 获取节点类型的强调颜色
  const getAccentColor = () => {
    switch (data.type) {
      case NodeType.TEXT_TO_IMAGE:
        return "cyan";
      case NodeType.TEXT_TO_VIDEO:
        return "cyan";
      case NodeType.IMAGE_TO_IMAGE:
        return "purple";
      case NodeType.IMAGE_TO_VIDEO:
        return "orange";
      case NodeType.START_END_TO_VIDEO:
        return "emerald";
      default:
        return "cyan";
    }
  };

  const accentColor = getAccentColor();
  const showInputPort = data.type !== NodeType.ORIGINAL_IMAGE;

  return (
    <div
      className="absolute flex flex-col group"
      style={{
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        zIndex: data.isStackOpen ? 100 : selected ? 50 : 10,
        overflow: "visible",
      }}
      onMouseDown={(e) => onMouseDown(e, data.id)}
      onContextMenu={(e) => onContextMenu(e, data.id, data.type)}
    >
      {/* 主内容区域，包含节点内容 */}
      <div className="relative w-full h-full">
        {children}

        {/* 连接端口 */}
        {showInputPort && (
          <ConnectionPort
            type="input"
            isDark={isDark}
            onMouseUp={(e) => onPortMouseUp?.(e, data.id, "target")}
          />
        )}

        <ConnectionPort
          type="output"
          isDark={isDark}
          onMouseDown={(e) => onConnectStart(e, data.id, "source")}
        />

        {/* 调整大小句柄 */}
        <div
          className={`
                absolute -right-1 -bottom-1 w-5 h-5 cursor-se-resize z-50 
                flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
              `}
          onMouseDown={(e) => onResizeStart?.(e, data.id)}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={isDark ? "text-zinc-500" : "text-gray-400"}
          >
            <path
              d="M9 1L1 9M9 5L5 9M9 9L9 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export const BaseNode = memo(BaseNodeComponent);
export default BaseNode;
