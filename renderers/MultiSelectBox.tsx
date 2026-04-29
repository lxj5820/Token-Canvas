import React, { useMemo } from "react";
import { NodeData, NodeType } from "../types";

interface MultiSelectBoxProps {
  selectedNodeIds: Set<string>;
  nodes: NodeData[];
  onGroupMouseDown?: (e: React.MouseEvent, groupId: string) => void;
}

const PADDING = 30;

const SelectionBox: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
}> = ({ x, y, width, height }) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: x,
      top: y,
      width,
      height,
      borderRadius: 30,
      border: "5px dashed rgba(140, 170, 200, 0.7)",
      background: "rgba(80, 120, 180, 0.04)",
    }}
  />
);

export const MultiSelectBox: React.FC<MultiSelectBoxProps> = ({
  selectedNodeIds,
  nodes,
  onGroupMouseDown,
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
    const minX = Math.min(...xs) - PADDING;
    const minY = Math.min(...ys) - PADDING;
    const maxX = Math.max(...rightEdges) + PADDING;
    const maxY = Math.max(...bottomEdges) + PADDING;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [nodes, selectedNodeIds]);

  const hasGroupSelected = useMemo(
    () => nodes.some((n) => selectedNodeIds.has(n.id) && n.type === ("GROUP" as string)),
    [nodes, selectedNodeIds],
  );

  if (hasGroupSelected || !selectionBounds) return null;

  return <SelectionBox {...selectionBounds} />;
};
