import { useCallback } from "react";
import { NodeData, Connection, NodeType, Point } from "../types";
import { saveAssetToIndexedDB } from "../services/saveAssetToIndexedDB";
import {
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  generateId,
  calculateImportDimensions,
  getDefaultNodeSize,
  getDefaultNodeConfig,
  OVERLAP_THRESHOLD,
  HORIZONTAL_GAP,
  VERTICAL_GAP,
} from "../services/canvasConstants";
import { logger } from "../services/logger";

interface UseNodeActionsParams {
  nodes: NodeData[];
  connections: Connection[];
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setDeletedNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  saveToHistory: (nodes: NodeData[], connections: Connection[]) => void;
  screenToWorld: (x: number, y: number) => Point;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onNotification?: (message: string, type: "success" | "error") => void;
}

export const useNodeActions = ({
  nodes,
  connections,
  setNodes,
  setConnections,
  setSelectedNodeIds,
  setDeletedNodes,
  saveToHistory,
  screenToWorld,
  containerRef,
  onNotification,
}: UseNodeActionsParams) => {
  const notify = useCallback(
    (message: string, type: "success" | "error") => {
      if (onNotification) {
        onNotification(message, type);
      }
    },
    [onNotification],
  );
  const updateNodeData = useCallback(
    (id: string, updates: Partial<NodeData>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      );
    },
    [setNodes],
  );

  const addNode = useCallback(
    (
      type: NodeType,
      x?: number,
      y?: number,
      dataOverride?: Partial<NodeData>,
    ) => {
      if (x === undefined || y === undefined) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const center = screenToWorld(rect.width / 2, rect.height / 2);
          x = center.x - DEFAULT_NODE_WIDTH / 2;
          y = center.y - DEFAULT_NODE_HEIGHT / 2;
        } else {
          x = 0;
          y = 0;
        }
      }
      const { width, height } = getDefaultNodeSize(type, dataOverride);
      const defaultConfig = getDefaultNodeConfig(type);
      const newNode: NodeData = {
        id: generateId(),
        type,
        x,
        y,
        width,
        height,
        title: dataOverride?.title || defaultConfig.title,
        aspectRatio: dataOverride?.aspectRatio || defaultConfig.aspectRatio,
        model: dataOverride?.model || defaultConfig.model,
        resolution: dataOverride?.resolution || defaultConfig.resolution,
        duration: dataOverride?.duration || defaultConfig.duration,
        count: dataOverride?.count || defaultConfig.count,
        prompt: dataOverride?.prompt || defaultConfig.prompt,
        imageSrc: dataOverride?.imageSrc,
        videoSrc: dataOverride?.videoSrc,
        outputArtifacts:
          dataOverride?.outputArtifacts ||
          (dataOverride?.imageSrc || dataOverride?.videoSrc
            ? [dataOverride.imageSrc || dataOverride.videoSrc || ""]
            : []),
      };
      saveToHistory(nodes, connections);
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeIds(new Set([newNode.id]));
    },
    [nodes, connections, saveToHistory, screenToWorld],
  );

  const handleQuickAddNode = useCallback(
    (type: NodeType, quickAddMenu: { sourceId: string; worldX: number; worldY: number }) => {
      const { width, height } = getDefaultNodeSize(type);
      const defaultConfig = getDefaultNodeConfig(type);
      const newNode: NodeData = {
        id: generateId(),
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
        {
          id: generateId(),
          sourceId: quickAddMenu.sourceId,
          targetId: newNode.id,
        },
      ]);
    },
    [nodes, connections, saveToHistory],
  );

  const deleteNode = useCallback(
    (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (node && (node.imageSrc || node.videoSrc))
        setDeletedNodes((prev) => [...prev, node]);
      saveToHistory(nodes, connections);
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setConnections((prev) =>
        prev.filter((c) => c.sourceId !== id && c.targetId !== id),
      );
    },
    [nodes, connections, saveToHistory],
  );

  const performCopy = useCallback(
    (selectedNodeIds: Set<string>) => {
      if (selectedNodeIds.size === 0) return null;
      const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id));
      const selectedConnections = connections.filter(
        (c) => selectedNodeIds.has(c.sourceId) && selectedNodeIds.has(c.targetId),
      );
      return { nodes: selectedNodes, connections: selectedConnections };
    },
    [nodes, connections],
  );

  const performPaste = useCallback(
    (
      targetPos: Point,
      internalClipboard: { nodes: NodeData[]; connections: Connection[] },
      selectedNodeIds: Set<string>,
    ) => {
      if (!internalClipboard || internalClipboard.nodes.length === 0) return;
      const { nodes: clipboardNodes, connections: clipboardConnections } =
        internalClipboard;
      let minX = Infinity,
        minY = Infinity;
      clipboardNodes.forEach((n) => {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
      });
      const idMap = new Map<string, string>();
      const newNodes: NodeData[] = [];
      const getCopyTitle = (title: string): string => {
        const copySuffix = / \(Copy\)( \((Copy)\))*$/;
        if (copySuffix.test(title)) return title;
        return `${title} (Copy)`;
      };
      clipboardNodes.forEach((node) => {
        const newId = generateId();
        idMap.set(node.id, newId);
        newNodes.push({
          ...node,
          id: newId,
          x: targetPos.x + (node.x - minX),
          y: targetPos.y + (node.y - minY),
          title: getCopyTitle(node.title),
          isLoading: false,
        });
      });
      const newConnections: Connection[] = clipboardConnections
        .map((c) => ({
          id: generateId(),
          sourceId: idMap.get(c.sourceId),
          targetId: idMap.get(c.targetId),
        }))
        .filter((c) => c.sourceId && c.targetId)
        .map((c) => ({ id: c.id, sourceId: c.sourceId!, targetId: c.targetId! }));
      saveToHistory(nodes, connections);
      setNodes((prev) => [...prev, ...newNodes]);
      setConnections((prev) => [...prev, ...newConnections]);
      setSelectedNodeIds(new Set(newNodes.map((n) => n.id)));
    },
    [nodes, connections, saveToHistory],
  );

  const handleAlign = useCallback(
    (direction: "UP" | "DOWN" | "LEFT" | "RIGHT", selectedNodeIds: Set<string>) => {
      if (selectedNodeIds.size < 2) return;
      saveToHistory(nodes, connections);
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
            const current = queue.shift();
            if (!current) break;
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
    [nodes, connections, saveToHistory],
  );

  const getNodeDisplayData = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;
      const displaySrc = node.annotatedImageSrc || node.imageSrc;
      if (node.videoSrc) return { url: node.videoSrc, type: "video" as const };
      else if (displaySrc) return { url: displaySrc, type: "image" as const };
      else return null;
    },
    [nodes],
  );

  const copyImageToClipboard = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      const src = node?.annotatedImageSrc || node?.imageSrc;
      if (src) {
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob as Blob }),
          ]);
          notify("图片已复制到剪贴板", "success");
        } catch (e) {
          logger.error("copyImageToClipboard failed", e);
          notify("复制图片失败", "error");
        }
      }
    },
    [nodes, notify],
  );

  const triggerReplaceImage = useCallback(
    (replaceImageRef: React.RefObject<HTMLInputElement | null>) => {
      replaceImageRef.current?.click();
    },
    [],
  );

  const handleReplaceImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, nodeToReplaceRef: React.MutableRefObject<string | null>) => {
      const file = e.target.files?.[0];
      const nodeId = nodeToReplaceRef.current;
      if (file && nodeId) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new Image();
          img.onload = async () => {
            const { width, height, ratio } = calculateImportDimensions(
              img.width,
              img.height,
            );
            const src = event.target?.result as string;
            setNodes((prev) =>
              prev.map((n) => {
                if (n.id !== nodeId) return n;
                const currentArtifacts = n.outputArtifacts || [];
                const newArtifacts = [src, ...currentArtifacts];
                return {
                  ...n,
                  imageSrc: src,
                  width,
                  height,
                  aspectRatio: `${ratio}:1`,
                  outputArtifacts: newArtifacts,
                  annotations: [],
                  annotatedImageSrc: undefined,
                  isAnnotating: false,
                };
              }),
            );
            await saveAssetToIndexedDB(nodeId, src, "image");
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
      nodeToReplaceRef.current = null;
    },
    [setNodes],
  );

  return {
    updateNodeData,
    addNode,
    handleQuickAddNode,
    deleteNode,
    performCopy,
    performPaste,
    handleAlign,
    getNodeDisplayData,
    handleMaximize: getNodeDisplayData,
    copyImageToClipboard,
    triggerReplaceImage,
    handleReplaceImage,
  };
};
