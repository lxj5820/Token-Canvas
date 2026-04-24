import React from 'react';

interface SelectionBoxProps {
  selectionBox: { x: number; y: number; w: number; h: number } | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({ selectionBox, containerRef }) => {
  if (!selectionBox) return null;

  return (
    <div
      className="fixed border border-yellow-500/50 bg-yellow-500/10 pointer-events-none z-50"
      style={{
        left: containerRef.current!.getBoundingClientRect().left + selectionBox.x,
        top: containerRef.current!.getBoundingClientRect().top + selectionBox.y,
        width: selectionBox.w,
        height: selectionBox.h
      }}
    />
  );
};
