import React, { useMemo } from "react";
import { NodeData } from "../types";

interface MinimapProps {
  nodes: NodeData[];
  transform: { x: number; y: number; k: number };
  containerWidth: number;
  containerHeight: number;
  isDark?: boolean;
}

const Minimap: React.FC<MinimapProps> = ({
  nodes,
  transform,
  containerWidth,
  containerHeight,
  isDark = true,
}) => {
  const minimapWidth = 160;
  const minimapHeight = 100;
  const padding = 8;

  const { scale, offsetX, offsetY, viewRect } = useMemo(() => {
    if (nodes.length === 0) {
      return {
        scale: 1,
        offsetX: padding,
        offsetY: padding,
        viewRect: {
          x: 0,
          y: 0,
          width: containerWidth,
          height: containerHeight,
        },
      };
    }

    // 计算所有节点的边界框
    const nodeBounds = nodes.map((node) => ({
      x: node.x,
      y: node.y,
      width: node.width || 200,
      height: node.height || 150,
    }));

    const minX = Math.min(...nodeBounds.map((b) => b.x));
    const minY = Math.min(...nodeBounds.map((b) => b.y));
    const maxX = Math.max(...nodeBounds.map((b) => b.x + b.width));
    const maxY = Math.max(...nodeBounds.map((b) => b.y + b.height));

    // 包含视口和节点的总边界
    const totalMinX = Math.min(minX, -transform.x / transform.k);
    const totalMinY = Math.min(minY, -transform.y / transform.k);
    const totalMaxX = Math.max(
      maxX,
      (-transform.x + containerWidth) / transform.k,
    );
    const totalMaxY = Math.max(
      maxY,
      (-transform.y + containerHeight) / transform.k,
    );

    const contentWidth = totalMaxX - totalMinX;
    const contentHeight = totalMaxY - totalMinY;

    // 计算缩放比例以适应小地图
    const scaleX =
      (minimapWidth - padding * 2) /
      Math.max(contentWidth, containerWidth / transform.k);
    const scaleY =
      (minimapHeight - padding * 2) /
      Math.max(contentHeight, containerHeight / transform.k);
    const scale = Math.min(scaleX, scaleY);

    // 居中偏移
    const offsetX =
      padding +
      (minimapWidth - padding * 2 - contentWidth * scale) / 2 -
      totalMinX * scale;
    const offsetY =
      padding +
      (minimapHeight - padding * 2 - contentHeight * scale) / 2 -
      totalMinY * scale;

    // 视口矩形
    const viewRect = {
      x: (-transform.x / transform.k) * scale + offsetX,
      y: (-transform.y / transform.k) * scale + offsetY,
      width: (containerWidth / transform.k) * scale,
      height: (containerHeight / transform.k) * scale,
    };

    return { scale, offsetX, offsetY, viewRect };
  }, [nodes, transform, containerWidth, containerHeight]);

  const bgColor = isDark ? "bg-zinc-900/90" : "bg-white/90";
  const borderColor = isDark ? "border-zinc-700" : "border-gray-300";
  const nodeColor = isDark ? "bg-pink-500/60" : "bg-pink-500/40";
  const viewBorderColor = isDark ? "border-white/60" : "border-gray-600";

  return (
    <div
      className={`fixed bottom-4 right-4 w-[160px] h-[100px] rounded-lg border ${bgColor} ${borderColor} backdrop-blur-sm shadow-lg overflow-hidden z-40`}
      style={{ pointerEvents: "none" }}
    >
      <svg
        width={minimapWidth}
        height={minimapHeight}
        className="absolute inset-0"
      >
        {/* 网格背景 */}
        <defs>
          <pattern
            id="minimapGrid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.5" fill={isDark ? "#333" : "#ddd"} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#minimapGrid)" />

        {/* 节点 */}
        {nodes.map((node) => {
          const x = node.x * scale + offsetX;
          const y = node.y * scale + offsetY;
          const w = Math.max((node.width || 200) * scale, 4);
          const h = Math.max((node.height || 150) * scale, 3);

          return (
            <rect
              key={node.id}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={2}
              className={nodeColor}
              fill="currentColor"
            />
          );
        })}

        {/* 视口框 */}
        <rect
          x={viewRect.x}
          y={viewRect.y}
          width={Math.min(viewRect.width, minimapWidth - viewRect.x)}
          height={Math.min(viewRect.height, minimapHeight - viewRect.y)}
          fill="none"
          stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"}
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
    </div>
  );
};

export default Minimap;
