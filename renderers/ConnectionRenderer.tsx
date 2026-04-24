import React from 'react';
import { NodeData, Connection } from '../types';

interface ConnectionRendererProps {
  connections: Connection[];
  nodes: NodeData[];
  selectedConnectionId: string | null;
  hoveredConnectionId: string | null;
  isDark: boolean;
  setHoveredConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  removeConnection: (id: string) => void;
  dragMode: string;
  connectionStartRef: React.MutableRefObject<{ nodeId: string; type: 'source' | 'target' } | null>;
  tempConnection: { x: number; y: number } | null;
}

export const ConnectionRenderer: React.FC<ConnectionRendererProps> = ({
  connections,
  nodes,
  selectedConnectionId,
  hoveredConnectionId,
  isDark,
  setHoveredConnectionId,
  setSelectedConnectionId,
  removeConnection,
  dragMode,
  connectionStartRef,
  tempConnection,
}) => {
  return (
    <>
      {connections.map(conn => {
        const source = nodes.find(n => n.id === conn.sourceId);
        const target = nodes.find(n => n.id === conn.targetId);
        if (!source || !target) return null;

        const sx = source.x + source.width;
        const sy = source.y + source.height / 2;
        const tx = target.x;
        const ty = target.y + target.height / 2;

        const dist = Math.abs(tx - sx);
        const cp = Math.max(50, dist * 0.4);

        const minX = Math.min(sx, tx) - cp - 20;
        const minY = Math.min(sy, ty) - 20;
        const maxX = Math.max(sx, tx) + cp + 20;
        const maxY = Math.max(sy, ty) + 20;
        const svgWidth = maxX - minX;
        const svgHeight = maxY - minY;

        const relSx = sx - minX;
        const relSy = sy - minY;
        const relTx = tx - minX;
        const relTy = ty - minY;

        const d = `M ${relSx} ${relSy} C ${relSx + cp} ${relSy}, ${relTx - cp} ${relTy}, ${relTx} ${relTy}`;
        const isSelected = selectedConnectionId === conn.id;
        const isHovered = hoveredConnectionId === conn.id;
        const showDeleteBtn = isSelected || isHovered;

        const lineColor = isSelected ? "#3b82f6" : (isHovered ? "#ef4444" : (isDark ? "#6b7280" : "#9ca3af"));

        const t = 0.5;
        const p0x = relSx, p0y = relSy;
        const p1x = relSx + cp, p1y = relSy;
        const p2x = relTx - cp, p2y = relTy;
        const p3x = relTx, p3y = relTy;
        const midX = Math.pow(1 - t, 3) * p0x + 3 * Math.pow(1 - t, 2) * t * p1x + 3 * (1 - t) * Math.pow(t, 2) * p2x + Math.pow(t, 3) * p3x;
        const midY = Math.pow(1 - t, 3) * p0y + 3 * Math.pow(1 - t, 2) * t * p1y + 3 * (1 - t) * Math.pow(t, 2) * p2y + Math.pow(t, 3) * p3y;

        return (
          <svg
            key={conn.id}
            className="absolute"
            style={{
              left: minX,
              top: minY,
              width: svgWidth,
              height: svgHeight,
              zIndex: isSelected ? 20 : 5,
              overflow: 'visible',
              pointerEvents: 'none'
            }}
            onMouseEnter={() => setHoveredConnectionId(conn.id)}
            onMouseLeave={() => setHoveredConnectionId(null)}
          >
            <path
              d={d}
              stroke="transparent"
              strokeWidth={16}
              fill="none"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); setSelectedConnectionId(conn.id); }}
            />
            <path
              d={d}
              stroke={lineColor}
              strokeWidth={isSelected ? 3 : 2}
              fill="none"
              strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
            {isSelected && (
              <path
                d={d}
                stroke="#3b82f6"
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                opacity={0.3}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {showDeleteBtn && (
              <g
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); removeConnection(conn.id); }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <circle
                  cx={midX}
                  cy={midY}
                  r={12}
                  fill={isDark ? "#27272a" : "#ffffff"}
                  stroke={isDark ? "#52525b" : "#d1d5db"}
                  strokeWidth={1}
                />
                <line
                  x1={midX - 5} y1={midY - 5}
                  x2={midX + 5} y2={midY + 5}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <line
                  x1={midX + 5} y1={midY - 5}
                  x2={midX - 5} y2={midY + 5}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </g>
            )}
          </svg>
        );
      })}

      {dragMode === 'CONNECT' && connectionStartRef.current && tempConnection && (() => {
        const sourceNode = nodes.find(n => n.id === connectionStartRef.current?.nodeId);
        if (!sourceNode) return null;

        const sx = sourceNode.x + sourceNode.width;
        const sy = sourceNode.y + sourceNode.height / 2;
        const tx = tempConnection.x;
        const ty = tempConnection.y;

        const dist = Math.abs(tx - sx);
        const cp = Math.max(30, dist * 0.3);

        const minX = Math.min(sx, tx) - cp - 20;
        const minY = Math.min(sy, ty) - 20;
        const maxX = Math.max(sx, tx) + cp + 20;
        const maxY = Math.max(sy, ty) + 20;

        const relSx = sx - minX;
        const relSy = sy - minY;
        const relTx = tx - minX;
        const relTy = ty - minY;

        const d = `M ${relSx} ${relSy} C ${relSx + cp} ${relSy}, ${relTx - cp} ${relTy}, ${relTx} ${relTy}`;

        return (
          <svg
            className="absolute pointer-events-none"
            style={{
              left: minX,
              top: minY,
              width: maxX - minX,
              height: maxY - minY,
              zIndex: 100,
              overflow: 'visible'
            }}
          >
            <path
              d={d}
              stroke="#3b82f6"
              strokeWidth={2}
              fill="none"
              strokeDasharray="6,4"
              strokeLinecap="round"
            />
            <circle
              cx={relTx}
              cy={relTy}
              r={5}
              fill="#3b82f6"
            />
          </svg>
        );
      })()}
    </>
  );
};
