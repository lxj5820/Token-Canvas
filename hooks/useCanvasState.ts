import { useState, useCallback, useMemo, useEffect } from "react";
import {
  NodeData,
  Connection,
  CanvasTransform,
  DragMode,
  Point,
} from "../types";

const EMPTY_ARRAY: string[] = [];

const STORAGE_KEYS = {
  THEME: "token-canvas-theme",
  CANVAS_BG: "token-canvas-canvas-bg",
};

export interface UseCanvasStateReturn {
  nodes: NodeData[];
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  transform: CanvasTransform;
  setTransform: React.Dispatch<React.SetStateAction<CanvasTransform>>;
  selectedNodeIds: Set<string>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dragMode: DragMode;
  setDragMode: React.Dispatch<React.SetStateAction<DragMode>>;
  hoveredConnectionId: string | null;
  setHoveredConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  currentMode: "select" | "pan";
  setCurrentMode: React.Dispatch<React.SetStateAction<"select" | "pan">>;
  canvasBg: string;
  setCanvasBg: (bg: string) => void;
  isDark: boolean;
  setIsDark: React.Dispatch<React.SetStateAction<boolean>>;
  projectName: string;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;
  selectionBox: { x: number; y: number; w: number; h: number } | null;
  setSelectionBox: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; w: number; h: number } | null>
  >;
  selectedConnectionId: string | null;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  inputsMap: Record<string, string[]>;
  getInputImages: (nodeId: string) => string[];
  screenToWorld: (x: number, y: number) => Point;
}

export const useCanvasState = (): UseCanvasStateReturn => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [transform, setTransform] = useState<CanvasTransform>({
    x: 0,
    y: 0,
    k: 1,
  });
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [dragMode, setDragMode] = useState<DragMode>("NONE");
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(
    null,
  );
  const [currentMode, setCurrentMode] = useState<"select" | "pan">("select");

  const [canvasBg, setCanvasBg] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEYS.CANVAS_BG);
      if (saved) return saved;
    }
    return "#0B0C0E";
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved !== null) return saved === "true";
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.THEME, isDark.toString());
    }
  }, [isDark]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CANVAS_BG, canvasBg);
    }
  }, [canvasBg]);

  const isValidHexColor = (color: string): boolean => {
    if (!color.startsWith("#") || color.length !== 7) return false;
    const hexPart = color.slice(1);
    return /^[0-9A-Fa-f]{6}$/.test(hexPart);
  };

  const handleSetCanvasBg = useCallback((bg: string) => {
    if (!isValidHexColor(bg)) return;
    setCanvasBg(bg);
    const r = parseInt(bg.slice(1, 3), 16);
    const g = parseInt(bg.slice(3, 5), 16);
    const b = parseInt(bg.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    setIsDark(luminance < 0.5);
  }, []);

  const [projectName, setProjectName] = useState("未命名项目");
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);

  // 只跟踪与连线图片相关的字段，拖拽位移不触发 inputsMap 重算
  const nodeImageData = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        imageSrc: n.imageSrc,
        videoSrc: n.videoSrc,
        annotatedImageSrc: n.annotatedImageSrc,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      // 通过 JSON key 稳定性来跟踪变化：只要图片字段没变就不触发
      nodes.map((n) => `${n.id}:${n.imageSrc}:${n.videoSrc}:${n.annotatedImageSrc}`).join("|"),
    ],
  );

  const inputsMap = useMemo(() => {
    // 建立 id→node 的 Map，内层查找 O(1)
    const nodeById = new Map(nodeImageData.map((n) => [n.id, n]));
    const map: Record<string, string[]> = {};
    connections.forEach((c) => {
      if (!map[c.targetId]) map[c.targetId] = [];
      const src = nodeById.get(c.sourceId);
      if (src && (src.imageSrc || src.videoSrc)) {
        // 优先使用带标注的图片，确保标注内容传递给下游节点
        map[c.targetId].push(
          src.annotatedImageSrc || src.imageSrc || src.videoSrc || "",
        );
      }
    });
    return map;
  }, [nodeImageData, connections]);

  const getInputImages = useCallback(
    (nodeId: string) => {
      return inputsMap[nodeId] || EMPTY_ARRAY;
    },
    [inputsMap],
  );

  const screenToWorld = useCallback(
    (x: number, y: number) => ({
      x: (x - transform.x) / transform.k,
      y: (y - transform.y) / transform.k,
    }),
    [transform],
  );

  return {
    nodes,
    setNodes,
    connections,
    setConnections,
    transform,
    setTransform,
    selectedNodeIds,
    setSelectedNodeIds,
    dragMode,
    setDragMode,
    hoveredConnectionId,
    setHoveredConnectionId,
    currentMode,
    setCurrentMode,
    canvasBg,
    setCanvasBg: handleSetCanvasBg,
    isDark,
    setIsDark,
    projectName,
    setProjectName,
    selectionBox,
    setSelectionBox,
    selectedConnectionId,
    setSelectedConnectionId,
    inputsMap,
    getInputImages,
    screenToWorld,
  };
};
