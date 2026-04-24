import React from 'react';
import { AnnotationItem } from '../../types';

const DEFAULT_FONT_SIZE = 16;
const ERASER_RADIUS = 12;

interface AnnotationRendererProps {
  annotations: AnnotationItem[];
  width: number;
  height: number;
}

/**
 * 只读标注渲染层——用 SVG 渲染已保存的标注数据
 * 在非标注模式下覆盖在图片上方，显示持久化的标注
 */
export const AnnotationRenderer: React.FC<AnnotationRendererProps> = ({
  annotations,
  width,
  height,
}) => {
  if (!annotations || annotations.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {annotations.map(item => {
        switch (item.tool) {
          case 'pen':
            if (item.points && item.points.length > 1) {
              const d = item.points
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
                .join(' ');
              return (
                <path
                  key={item.id}
                  d={d}
                  stroke={item.color}
                  strokeWidth={item.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              );
            } else if (item.points && item.points.length === 1) {
              return (
                <circle
                  key={item.id}
                  cx={item.points[0].x}
                  cy={item.points[0].y}
                  r={item.strokeWidth / 2}
                  fill={item.color}
                />
              );
            }
            return null;

          case 'eraser':
            // 橡皮擦在只读模式下不渲染（它是对 canvas 的 destructive 操作）
            // 在持久化渲染中，橡皮擦的路径已经在导出时被应用了
            return null;

          case 'rect':
            if (item.rect) {
              return (
                <rect
                  key={item.id}
                  x={item.rect.x}
                  y={item.rect.y}
                  width={item.rect.width}
                  height={item.rect.height}
                  stroke={item.color}
                  strokeWidth={item.strokeWidth}
                  fill={item.color}
                  fillOpacity={0.12}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            }
            return null;

          case 'text':
            if (item.text) {
              const fontSize = item.fontSize || DEFAULT_FONT_SIZE;
              return (
                <text
                  key={item.id}
                  x={item.text.x}
                  y={item.text.y + fontSize}
                  fill={item.color}
                  fontSize={fontSize}
                  fontFamily="'Inter', 'SF Pro', system-ui, sans-serif"
                  fontWeight="bold"
                >
                  {item.text.content}
                </text>
              );
            }
            return null;

          default:
            return null;
        }
      })}
    </svg>
  );
};
