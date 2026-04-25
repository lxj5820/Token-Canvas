import { useCallback } from "react";
import {
  NodeData,
  Connection,
  NodeType,
  CanvasTransform,
  Point,
} from "../types";
import { saveAssetToIndexedDB } from "../services/saveAssetToIndexedDB";
import {
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  OVERLAP_THRESHOLD,
  HORIZONTAL_GAP,
  VERTICAL_GAP,
  generateId,
  getDefaultTitle,
  getDefaultModel,
  calculateImportDimensions,
  getDefaultNodeSize,
  getDefaultNodeConfig,
} from "../services/canvasConstants";

export interface UseNodeOperationsReturn {
  addNode: (
    type: NodeType,
    x?: number,
    y?: number,
    dataOverride?: Partial<NodeData>,
  ) => void;
  handleQuickAddNode: (
    type: NodeType,
    quickAddMenu: { sourceId: string; worldX: number; worldY: number },
    nodes: NodeData[],
    connections: Connection[],
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
    setQuickAddMenu: React.Dispatch<React.SetStateAction<any>>,
    saveToHistory: (nodes: NodeData[], connections: Connection[]) => void,
  ) => void;
  deleteNode: (
    id: string,
    nodes: NodeData[],
    connections: Connection[],
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
    setDeletedNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    saveToHistory: (nodes: NodeData[], connections: Connection[]) => void,
  ) => void;
  updateNodeData: (
    id: string,
    updates: Partial<NodeData>,
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
  ) => void;
  removeConnection: (
    id: string,
    nodes: NodeData[],
    connections: Connection[],
    selectedConnectionId: string | null,
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
    setSelectedConnectionId: React.Dispatch<
      React.SetStateAction<string | null>
    >,
    saveToHistory: (nodes: NodeData[], connections: Connection[]) => void,
  ) => void;
  createConnection: (
    sourceId: string,
    targetId: string,
    nodes: NodeData[],
    connections: Connection[],
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
    saveToHistory: (nodes: NodeData[], connections: Connection[]) => void,
  ) => void;
  handleAlign: (
    direction: "UP" | "DOWN" | "LEFT" | "RIGHT",
    selectedNodeIds: Set<string>,
    nodes: NodeData[],
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
  ) => void;
  calculateImportDimensions: typeof calculateImportDimensions;
  generateId: () => string;
  saveAssetToIndexedDB: (
    nodeId: string,
    url: string,
    type: "image" | "video",
  ) => Promise<void>;
}

/**
 * @deprecated This hook is not currently used by App.tsx (which has inline implementations).
 * Kept for reference; will be reintegrated when App.tsx is further refactored.
 */
export const useNodeOperations = (): UseNodeOperationsReturn => {
  const addNode = useCallback(
    (
      type: NodeType,
      x?: number,
      y?: number,
      dataOverride?: Partial<NodeData>,
    ) => {
      return { type, x, y, dataOverride, getDefaultTitle, getDefaultModel };
    },
    [],
  );

  const handleQuickAddNode = useCallback(
    (
      type: NodeType,
      quickAddMenu: { sourceId: string; worldX: number; worldY: number },
      nodes: NodeData[],
      connections: Connection[],
      setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
      setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
      setQuickAddMenu: React.Dispatch<React.SetStateAction<any>>,
      saveToHistory: (nodes: NodeData[], connections: Connection[]) => void,
    ) => {
      const { width, height } = getDefaultNodeSize(type);
      const defaultConfig = getDefaultNodeConfig(type);
      const newId = generateId();

      const newNode: NodeData = {
        id: newId,
        type,
        x: quickAddMenu.worldX,
        y: quickAddMenu.worldY - height / 2,
        width,
        height,
        title: defaultConfig.title,
        aspectRatio: defaultConfig.aspectRatio,
        model: defaultConfig.model,
        resolution: defaultConfig.resolution,
        duration: defaultConfig.duration,
        count: defaultConfig.count,
        prompt: defaultConfig.prompt,
        outputArtifacts: [],
      };

      saveToHistory(nodes, connections);
      setNodes((prev) => [...prev, newNode]);
      setConnections((prev) => [
        ...prev,
        { id: generateId(), sourceId: quickAddMenu.sourceId, targetId: newId },
      ]);
      setQuickAddMenu(null);
    },
    [],
  );

  const deleteNode = useCallback(
    (
      id: string,
      nodes: NodeData[],
      connections: Connection[],
      setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
      setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
      setDeletedNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
      saveToHistory: (nodes: NodeData[], connections: Connection[]) => void,
    ) => {
      const node = nodes.find((n) => n.id === id);
      if (node && (node.imageSrc || node.videoSrc)) {
        setDeletedNodes((prev) => [...prev, node]);
      }
      saveToHistory(nodes, connections);
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setConnections((prev) =>
        prev.filter((c) => c.sourceId !== id && c.targetId !== id),
      );
    },
    [],
  );

  const updateNodeData = useCallback(
    (
      id: string,
      updates: Partial<NodeData>,
      setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    ) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      );
    },
    [],
  );

  const removeConnection = useCallback(
    (
      id: string,
      nodes: NodeData[],
      connections: Connection[],
      selectedConnectionId: string | null,
      setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
      setSelectedConnectionId: React.Dispatch<
        React.SetStateAction<string | null>
      >,
      saveToHistory: (nodes: NodeData[], connections: Connection[]) => void,
    ) => {
      saveToHistory(nodes, connections);
      setConnections((prev) => prev.filter((c) => c.id !== id));
      setSelectedConnectionId(null);
    },
    [],
  );

  const createConnection = useCallback(
    (
      sourceId: string,
      targetId: string,
      nodes: NodeData[],
      connections: Connection[],
      setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
      saveToHistory: (nodes: NodeData[], connections: Connection[]) => void,
    ) => {
      if (
        !connections.some(
          (c) => c.sourceId === sourceId && c.targetId === targetId,
        )
      ) {
        saveToHistory(nodes, connections);
        setConnections((prev) => [
          ...prev,
          { id: generateId(), sourceId, targetId },
        ]);
      }
    },
    [],
  );

  const handleAlign = useCallback(
    (
      direction: "UP" | "DOWN" | "LEFT" | "RIGHT",
      selectedNodeIds: Set<string>,
      nodes: NodeData[],
      setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    ) => {
      if (selectedNodeIds.size < 2) return;

      setNodes((prevNodes) => {
        const selected = prevNodes.filter((n) => selectedNodeIds.has(n.id));
        const unselected = prevNodes.filter((n) => !selectedNodeIds.has(n.id));
        const updatedNodes = selected.map((n) => ({ ...n }));

        const isVerticalAlign = direction === "UP" || direction === "DOWN";

        const isOverlap = (a: NodeData, b: NodeData) => {
          if (isVerticalAlign) {
            const overlap =
              Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
            return overlap > OVERLAP_THRESHOLD;
          } else {
            const overlap =
              Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
            return overlap > OVERLAP_THRESHOLD;
          }
        };

        const clusters: NodeData[][] = [];
        const visited = new Set<string>();

        for (const node of updatedNodes) {
          if (visited.has(node.id)) continue;
          const cluster = [node];
          visited.add(node.id);
          const queue = [node];

          while (queue.length > 0) {
            const current = queue.shift()!;
            for (const other of updatedNodes) {
              if (!visited.has(other.id) && isOverlap(current, other)) {
                visited.add(other.id);
                cluster.push(other);
                queue.push(other);
              }
            }
          }
          clusters.push(cluster);
        }

        const minTop = Math.min(...updatedNodes.map((n) => n.y));
        const maxBottom = Math.max(...updatedNodes.map((n) => n.y + n.height));
        const minLeft = Math.min(...updatedNodes.map((n) => n.x));
        const maxRight = Math.max(...updatedNodes.map((n) => n.x + n.width));

        clusters.forEach((cluster) => {
          if (direction === "UP") {
            cluster.sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
            let currentY = minTop;
            cluster.forEach((node) => {
              node.y = currentY;
              currentY += node.height + VERTICAL_GAP;
            });
          } else if (direction === "DOWN") {
            cluster.sort((a, b) => b.y - a.y || a.id.localeCompare(b.id));
            let currentBottom = maxBottom;
            cluster.forEach((node) => {
              node.y = currentBottom - node.height;
              currentBottom -= node.height + VERTICAL_GAP;
            });
          } else if (direction === "LEFT") {
            cluster.sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
            let currentX = minLeft;
            cluster.forEach((node) => {
              node.x = currentX;
              currentX += node.width + HORIZONTAL_GAP;
            });
          } else if (direction === "RIGHT") {
            cluster.sort((a, b) => b.x - a.x || a.id.localeCompare(b.id));
            let currentRight = maxRight;
            cluster.forEach((node) => {
              node.x = currentRight - node.width;
              currentRight -= node.width + HORIZONTAL_GAP;
            });
          }
        });

        return [...unselected, ...updatedNodes];
      });
    },
    [],
  );

  return {
    addNode,
    handleQuickAddNode,
    deleteNode,
    updateNodeData,
    removeConnection,
    createConnection,
    handleAlign,
    calculateImportDimensions,
    generateId,
  };
};
