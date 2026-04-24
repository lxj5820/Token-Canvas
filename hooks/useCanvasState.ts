import { useState, useCallback, useMemo } from 'react';
import { NodeData, Connection, CanvasTransform, DragMode, Point } from '../types';

const EMPTY_ARRAY: string[] = [];

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
  currentMode: 'select' | 'pan';
  setCurrentMode: React.Dispatch<React.SetStateAction<'select' | 'pan'>>;
  canvasBg: string;
  setCanvasBg: React.Dispatch<React.SetStateAction<string>>;
  isDark: boolean;
  projectName: string;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;
  selectionBox: { x: number; y: number; w: number; h: number } | null;
  setSelectionBox: React.Dispatch<React.SetStateAction<{ x: number; y: number; w: number; h: number } | null>>;
  selectedConnectionId: string | null;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  inputsMap: Record<string, string[]>;
  getInputImages: (nodeId: string) => string[];
  screenToWorld: (x: number, y: number) => Point;
}

export const useCanvasState = (): UseCanvasStateReturn => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, k: 1 });
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [dragMode, setDragMode] = useState<DragMode>('NONE');
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'select' | 'pan'>('select');
  const [canvasBg, setCanvasBg] = useState('#0B0C0E');
  const [projectName, setProjectName] = useState('未命名项目');
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const isDark = canvasBg === '#0B0C0E';

  const inputsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    nodes.forEach(node => {
      map[node.id] = connections
        .filter(c => c.targetId === node.id)
        .map(c => nodes.find(n => n.id === c.sourceId))
        .filter(n => n && (n.imageSrc || n.videoSrc))
        .map(n => {
          // 优先使用带标注的图片，确保标注内容传递给下游节点
          if (n?.annotatedImageSrc) return n.annotatedImageSrc;
          return n?.imageSrc || n?.videoSrc || '';
        });
    });
    return map;
  }, [nodes, connections]);

  const getInputImages = useCallback((nodeId: string) => {
    return inputsMap[nodeId] || EMPTY_ARRAY;
  }, [inputsMap]);

  const screenToWorld = useCallback((x: number, y: number) => ({
    x: (x - transform.x) / transform.k,
    y: (y - transform.y) / transform.k,
  }), [transform]);

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
    setCanvasBg,
    isDark,
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
