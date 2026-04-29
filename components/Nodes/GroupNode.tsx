import React, { useState, useRef, useEffect, useCallback } from "react";
import { NodeData } from "../../types";

const GROUP_COLORS = [
  "#6366f1",
  "#10b981",
  "#06b6d4",
  "#ef4444",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

export type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

interface GroupNodeProps {
  data: NodeData;
  selected: boolean;
  isDark: boolean;
  onUpdateData: (id: string, patch: Partial<NodeData>) => void;
  onUnGroup: (groupId: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeStart: (
    e: React.MouseEvent,
    id: string,
    direction: ResizeDirection,
  ) => void;
}

const HANDLE_SIZE = 8;
const EDGE_HIT = 5;

const CURSOR_MAP: Record<ResizeDirection, string> = {
  n: "cursor-ns-resize",
  s: "cursor-ns-resize",
  e: "cursor-ew-resize",
  w: "cursor-ew-resize",
  ne: "cursor-nesw-resize",
  nw: "cursor-nwse-resize",
  se: "cursor-nwse-resize",
  sw: "cursor-nesw-resize",
};

const HANDLES: {
  dir: ResizeDirection;
  style: (w: number, h: number) => React.CSSProperties;
}[] = [
  {
    dir: "nw",
    style: () => ({
      left: -HANDLE_SIZE / 2,
      top: -HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    }),
  },
  {
    dir: "n",
    style: (w) => ({
      left: w / 2 - HANDLE_SIZE / 2,
      top: -HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    }),
  },
  {
    dir: "ne",
    style: (w) => ({
      left: w - HANDLE_SIZE / 2,
      top: -HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    }),
  },
  {
    dir: "e",
    style: (w, h) => ({
      left: w - HANDLE_SIZE / 2,
      top: h / 2 - HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    }),
  },
  {
    dir: "se",
    style: (w, h) => ({
      left: w - HANDLE_SIZE / 2,
      top: h - HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    }),
  },
  {
    dir: "s",
    style: (w, h) => ({
      left: w / 2 - HANDLE_SIZE / 2,
      top: h - HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    }),
  },
  {
    dir: "sw",
    style: (_, h) => ({
      left: -HANDLE_SIZE / 2,
      top: h - HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    }),
  },
  {
    dir: "w",
    style: (_, h) => ({
      left: -HANDLE_SIZE / 2,
      top: h / 2 - HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    }),
  },
];

export const GroupNode: React.FC<GroupNodeProps> = ({
  data,
  selected,
  isDark,
  onUpdateData,
  onUnGroup,
  onMouseDown,
  onResizeStart,
}) => {
  const [editing, setEditing] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const titleRef = useRef<HTMLSpanElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  const color = data.groupColor || GROUP_COLORS[0];
  const borderColor = color;
  const bgColor = color + "0d";
  const titleColor = color;

  useEffect(() => {
    if (editing && titleRef.current) {
      titleRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(titleRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  useEffect(() => {
    if (!colorMenuOpen) return;
    const handler = (e: PointerEvent) => {
      if (
        colorMenuRef.current &&
        !colorMenuRef.current.contains(e.target as Node)
      ) {
        setColorMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [colorMenuOpen]);

  const handleTitleBlur = useCallback(() => {
    setEditing(false);
    const newName = titleRef.current?.textContent?.trim() || "新建组";
    onUpdateData(data.id, { groupName: newName });
  }, [data.id, onUpdateData]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleRef.current?.blur();
    }
  }, []);

  const handleColorSelect = useCallback(
    (c: string) => {
      onUpdateData(data.id, { groupColor: c });
      setColorMenuOpen(false);
    },
    [data.id, onUpdateData],
  );

  const handleColor = isDark
    ? "rgba(255,255,255,0.35)"
    : "rgba(0,0,0,0.25)";

  return (
    <div
      className="absolute flex flex-col"
      style={{
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        zIndex: selected ? 5 : 0,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 14,
        background: bgColor,
        cursor: "default",
      }}
      onMouseDown={onMouseDown}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 select-none"
        style={{ minHeight: 28 }}
        onMouseDown={(e) => {
          if (editing) e.stopPropagation();
        }}
      >
        {editing ? (
          <span
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            className="text-[13px] font-medium outline-none rounded px-1 -ml-1"
            style={{
              color: titleColor,
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              minWidth: 40,
            }}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
          >
            {data.groupName || "新建组"}
          </span>
        ) : (
          <span
            className="text-[13px] font-medium truncate cursor-text"
            style={{ color: titleColor }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            title="双击重命名"
          >
            {data.groupName || "新建组"}
          </span>
        )}

        <div
          className="flex items-center gap-1 opacity-0 transition-opacity"
          style={{ opacity: selected ? 1 : undefined }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            if (!selected) (e.currentTarget as HTMLElement).style.opacity = "0";
          }}
        >
          <div ref={colorMenuRef} className="relative">
            <button
              className="w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center cursor-pointer"
              style={{
                background: color,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.15)",
              }}
              title="设置颜色"
              onClick={(e) => {
                e.stopPropagation();
                setColorMenuOpen((v) => !v);
              }}
            />
            {colorMenuOpen && (
              <div
                className="absolute top-full left-0 mt-1 flex gap-1.5 p-1.5 rounded-lg z-50"
                style={{
                  background: isDark
                    ? "rgba(22,24,28,0.95)"
                    : "rgba(255,255,255,0.95)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
                  backdropFilter: "blur(10px)",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-125"
                    style={{
                      background: c,
                      border:
                        c === color
                          ? "2px solid white"
                          : "2px solid transparent",
                    }}
                    onClick={() => handleColorSelect(c)}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            className={`inline-flex items-center justify-center rounded-md transition-colors h-6 w-6 p-1 cursor-pointer ${
              isDark
                ? "text-zinc-400 hover:text-white hover:bg-white/10"
                : "text-gray-500 hover:text-gray-800 hover:bg-black/5"
            }`}
            title="解组"
            onClick={(e) => {
              e.stopPropagation();
              onUnGroup(data.id);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1" />

      {selected &&
        HANDLES.map(({ dir, style }) => (
          <div
            key={dir}
            className={`absolute ${CURSOR_MAP[dir]} rounded-sm`}
            style={{
              ...style(data.width, data.height),
              background: handleColor,
              zIndex: 10,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, data.id, dir);
            }}
          />
        ))}

      {selected && (
        <>
          <div
            className="absolute cursor-ns-resize"
            style={{
              left: 0,
              top: -EDGE_HIT,
              width: "100%",
              height: EDGE_HIT * 2,
              zIndex: 9,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, data.id, "n");
            }}
          />
          <div
            className="absolute cursor-ns-resize"
            style={{
              left: 0,
              bottom: -EDGE_HIT,
              width: "100%",
              height: EDGE_HIT * 2,
              zIndex: 9,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, data.id, "s");
            }}
          />
          <div
            className="absolute cursor-ew-resize"
            style={{
              left: -EDGE_HIT,
              top: 0,
              width: EDGE_HIT * 2,
              height: "100%",
              zIndex: 9,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, data.id, "w");
            }}
          />
          <div
            className="absolute cursor-ew-resize"
            style={{
              right: -EDGE_HIT,
              top: 0,
              width: EDGE_HIT * 2,
              height: "100%",
              zIndex: 9,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, data.id, "e");
            }}
          />
        </>
      )}
    </div>
  );
};
