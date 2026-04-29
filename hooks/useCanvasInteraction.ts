import { useCallback, useRef, useEffect, useState } from "react";
import {
  NodeData,
  Connection,
  NodeType,
  CanvasTransform,
  Point,
  DragMode,
} from "../types";
import { generateId } from "../services/canvasConstants";
import { throttleRaf } from "../utils/throttle";

interface UseCanvasInteractionParams {
  nodes: NodeData[];
  connections: Connection[];
  transform: CanvasTransform;
  setTransform: React.Dispatch<React.SetStateAction<CanvasTransform>>;
  selectedNodeIds: Set<string>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dragMode: DragMode;
  setDragMode: React.Dispatch<React.SetStateAction<DragMode>>;
  currentMode: "select" | "pan";
  setSelectionBox: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; w: number; h: number } | null>
  >;
  selectedConnectionId: string | null;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setQuickAddMenu: React.Dispatch<React.SetStateAction<any>>;
  setContextMenu: React.Dispatch<React.SetStateAction<any>>;
  saveToHistory: (nodes: NodeData[], connections: Connection[]) => void;
  screenToWorld: (x: number, y: number) => Point;
  containerRef: React.RefObject<HTMLDivElement | null>;
  spacePressed: React.MutableRefObject<boolean>;
  getGroupNodeIds: (nodeId: string) => Set<string>;
}

export const useCanvasInteraction = ({
  nodes,
  connections,
  transform,
  setTransform,
  selectedNodeIds,
  setSelectedNodeIds,
  dragMode,
  setDragMode,
  currentMode,
  setSelectionBox,
  selectedConnectionId,
  setSelectedConnectionId,
  setNodes,
  setConnections,
  setQuickAddMenu,
  setContextMenu,
  saveToHistory,
  screenToWorld,
  containerRef,
  spacePressed,
  getGroupNodeIds,
}: UseCanvasInteractionParams) => {
  const dragModeRef = useRef(dragMode);
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const saveToHistoryRef = useRef(saveToHistory);
  const transformRef = useRef(transform);
  const selectedNodeIdsRef = useRef(selectedNodeIds);
  const screenToWorldRef = useRef(screenToWorld);

  const dragStartRef = useRef<{
    x: number;
    y: number;
    w?: number;
    h?: number;
    nodeId?: string;
    nodeX?: number;
    nodeY?: number;
    resizeDir?: string;
  }>({ x: 0, y: 0 });
  const initialTransformRef = useRef<CanvasTransform>({ x: 0, y: 0, k: 1 });
  const initialNodePositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  const connectionStartRef = useRef<{
    nodeId: string;
    type: "source" | "target";
  } | null>(null);
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 });
  const lastSuggestedNodesTimeRef = useRef(0);
  const lastMousePosForSuggestionsRef = useRef({ x: 0, y: 0 });

  const [tempConnection, setTempConnection] = useState<Point | null>(null);
  const [suggestedNodes, setSuggestedNodes] = useState<NodeData[]>([]);

  useEffect(() => {
    dragModeRef.current = dragMode;
  }, [dragMode]);

  useEffect(() => {
    nodesRef.current = nodes;
    connectionsRef.current = connections;
    saveToHistoryRef.current = saveToHistory;
  }, [nodes, connections, saveToHistory]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  useEffect(() => {
    screenToWorldRef.current = screenToWorld;
  }, [screenToWorld]);

  const createConnection = useCallback(
    (sourceId: string, targetId: string) => {
      setConnections((prev) => {
        if (prev.some((c) => c.sourceId === sourceId && c.targetId === targetId)) {
          return prev;
        }
        const currentNodes = nodesRef.current;
        const currentConnections = prev;
        setTimeout(() => {
          saveToHistoryRef.current(currentNodes, currentConnections);
        }, 0);
        return [...prev, { id: generateId(), sourceId, targetId }];
      });
      setDragMode("NONE");
      setTempConnection(null);
      connectionStartRef.current = null;
      setSuggestedNodes([]);
    },
    [],
  );

  const removeConnection = useCallback(
    (id: string) => {
      saveToHistory(nodes, connections);
      setConnections((prev) => prev.filter((c) => c.id !== id));
      setSelectedConnectionId(null);
    },
    [nodes, connections, saveToHistory],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (selectedConnectionId) {
        setSelectedConnectionId(null);
      }
      setContextMenu(null);
      setQuickAddMenu(null);

      const isPanMode =
        currentMode === "pan" ||
        e.button === 1 ||
        (e.button === 0 && spacePressed.current);
      if (isPanMode) {
        setDragMode("PAN");
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialTransformRef.current = { ...transformRef.current };
        e.preventDefault();
        return;
      }
      if (e.target === containerRef.current && e.button === 0) {
        setDragMode("SELECT");
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        setSelectionBox({ x: 0, y: 0, w: 0, h: 0 });
        if (!e.shiftKey) setSelectedNodeIds(new Set());
      }
    },
    [currentMode, selectedConnectionId],
  );

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setContextMenu(null);
      setQuickAddMenu(null);
      setSelectedConnectionId(null);
      if (e.button === 0) {
        setDragMode("DRAG_NODE");
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        const groupIds = getGroupNodeIds(id);
        setSelectedNodeIds((prev) => {
          const isAlreadySelected = prev.has(id);
          let newSelection = new Set(prev);
          if (e.shiftKey) {
            if (isAlreadySelected) {
              groupIds.forEach((gid) => newSelection.delete(gid));
            } else {
              groupIds.forEach((gid) => newSelection.add(gid));
            }
          } else {
            const allGroupSelected = [...groupIds].every((gid) => prev.has(gid));
            if (!allGroupSelected) {
              newSelection.clear();
              groupIds.forEach((gid) => newSelection.add(gid));
            }
          }
          initialNodePositionsRef.current = new Map(
            nodesRef.current
              .filter((n) => newSelection.has(n.id))
              .map((n) => [n.id, { x: n.x, y: n.y }]),
          );
          return newSelection;
        });
      }
    },
    [getGroupNodeIds],
  );

  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, id: string, type: NodeType) => {
      e.stopPropagation();
      e.preventDefault();
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setContextMenu({
        type: "NODE",
        nodeId: id,
        nodeType: type,
        x: e.clientX,
        y: e.clientY,
        worldX: worldPos.x,
        worldY: worldPos.y,
      });
      if (!selectedNodeIds.has(id)) setSelectedNodeIds(new Set([id]));
    },
    [selectedNodeIds, screenToWorld],
  );

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setContextMenu({
        type: "CANVAS",
        x: e.clientX,
        y: e.clientY,
        worldX: worldPos.x,
        worldY: worldPos.y,
      });
    },
    [screenToWorld],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, nodeId: string, direction?: string) => {
      e.stopPropagation();
      e.preventDefault();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setDragMode("RESIZE_NODE");
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: node.width,
        h: node.height,
        nodeId: nodeId,
        nodeX: node.x,
        nodeY: node.y,
        resizeDir: direction || "se",
      };
      setSelectedNodeIds(new Set([nodeId]));
    },
    [nodes],
  );

  const handleConnectStart = useCallback(
    (e: React.MouseEvent, nodeId: string, type: "source" | "target") => {
      e.stopPropagation();
      e.preventDefault();
      connectionStartRef.current = { nodeId, type };
      setDragMode("CONNECT");
      setTempConnection(screenToWorld(e.clientX, e.clientY));
    },
    [screenToWorld],
  );

  const handlePortMouseUp = useCallback(
    (e: React.MouseEvent, nodeId: string, type: "source" | "target") => {
      e.stopPropagation();
      e.preventDefault();
      if (
        dragModeRef.current === "CONNECT" &&
        connectionStartRef.current &&
        connectionStartRef.current.type === "source" &&
        type === "target" &&
        connectionStartRef.current.nodeId !== nodeId
      ) {
        createConnection(connectionStartRef.current.nodeId, nodeId);
      }
    },
    [createConnection],
  );

  const handleMouseMove = useCallback(
    throttleRaf((e: React.MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      const worldPos = screenToWorldRef.current(e.clientX, e.clientY);
      const currentDragMode = dragModeRef.current;

      if (currentDragMode !== "NONE" && e.buttons === 0) {
        setDragMode("NONE");
        dragStartRef.current = { x: 0, y: 0 };
        return;
      }
      if (currentDragMode === "PAN") {
        setTransform({
          ...initialTransformRef.current,
          x: initialTransformRef.current.x +
            (e.clientX - dragStartRef.current.x),
          y: initialTransformRef.current.y +
            (e.clientY - dragStartRef.current.y),
        });
      } else if (currentDragMode === "DRAG_NODE") {
        const dx =
          (e.clientX - dragStartRef.current.x) / transformRef.current.k;
        const dy =
          (e.clientY - dragStartRef.current.y) / transformRef.current.k;
        setNodes((prev) =>
          prev.map((n) => {
            const initial = initialNodePositionsRef.current.get(n.id);
            if (initial)
              return { ...n, x: initial.x + dx, y: initial.y + dy };
            return n;
          }),
        );
      } else if (currentDragMode === "SELECT") {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;
        const x = Math.min(dragStartRef.current.x, e.clientX);
        const y = Math.min(dragStartRef.current.y, e.clientY);
        const w = Math.abs(e.clientX - dragStartRef.current.x);
        const h = Math.abs(e.clientY - dragStartRef.current.y);
        setSelectionBox({
          x: x - containerRect.left,
          y: y - containerRect.top,
          w,
          h,
        });
        const worldStartX =
          (x - containerRect.left - transformRef.current.x) /
          transformRef.current.k;
        const worldStartY =
          (y - containerRect.top - transformRef.current.y) /
          transformRef.current.k;
        const worldWidth = w / transformRef.current.k;
        const worldHeight = h / transformRef.current.k;
        const newSelection = new Set<string>();
        nodesRef.current.forEach((n) => {
          if (n.type === ("GROUP" as string)) {
            const contained =
              n.x >= worldStartX &&
              n.x + n.width <= worldStartX + worldWidth &&
              n.y >= worldStartY &&
              n.y + n.height <= worldStartY + worldHeight;
            if (contained) newSelection.add(n.id);
          } else {
            if (
              n.x < worldStartX + worldWidth &&
              n.x + n.width > worldStartX &&
              n.y < worldStartY + worldHeight &&
              n.y + n.height > worldStartY
            ) {
              newSelection.add(n.id);
            }
          }
        });
        setSelectedNodeIds(newSelection);
      } else if (currentDragMode === "CONNECT") {
        setTempConnection(worldPos);
        if (connectionStartRef.current?.type === "source") {
          const now = performance.now();
          const distanceMoved = Math.sqrt(
            Math.pow(
              e.clientX - lastMousePosForSuggestionsRef.current.x,
              2,
            ) +
              Math.pow(
                e.clientY - lastMousePosForSuggestionsRef.current.y,
                2,
              ),
          );

          if (now - lastSuggestedNodesTimeRef.current > 16 && distanceMoved > 5) {
            lastSuggestedNodesTimeRef.current = now;
            lastMousePosForSuggestionsRef.current = {
              x: e.clientX,
              y: e.clientY,
            };

            requestAnimationFrame(() => {
              const currentNodes = nodesRef.current;
              const candidates = currentNodes
                .filter(
                  (n) => n.id !== connectionStartRef.current?.nodeId,
                )
                .filter((n) => n.type !== NodeType.ORIGINAL_IMAGE)
                .map((n) => ({
                  node: n,
                  dist: Math.sqrt(
                    Math.pow(worldPos.x - (n.x + n.width / 2), 2) +
                      Math.pow(worldPos.y - (n.y + n.height / 2), 2),
                  ),
                }))
                .filter((item) => item.dist < 500)
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 3)
                .map((item) => item.node);
              setSuggestedNodes(candidates);
            });
          }
        }
      } else if (currentDragMode === "RESIZE_NODE") {
        const nodeId = dragStartRef.current.nodeId;
        const node = nodesRef.current.find((n) => n.id === nodeId);
        if (node) {
          const dx =
            (e.clientX - dragStartRef.current.x) / transformRef.current.k;
          const dy =
            (e.clientY - dragStartRef.current.y) / transformRef.current.k;
          const dir = dragStartRef.current.resizeDir || "se";
          const isGroup = node.type === ("GROUP" as string);

          if (isGroup) {
            const origX = dragStartRef.current.nodeX ?? node.x;
            const origY = dragStartRef.current.nodeY ?? node.y;
            const origW = dragStartRef.current.w || node.width;
            const origH = dragStartRef.current.h || node.height;
            const minW = 120;
            const minH = 60;

            let newX = origX;
            let newY = origY;
            let newW = origW;
            let newH = origH;

            if (dir.includes("e")) newW = Math.max(minW, origW + dx);
            if (dir.includes("w")) {
              newW = Math.max(minW, origW - dx);
              newX = origX + origW - newW;
            }
            if (dir.includes("s")) newH = Math.max(minH, origH + dy);
            if (dir.includes("n")) {
              newH = Math.max(minH, origH - dy);
              newY = origY + origH - newH;
            }

            setNodes((prev) =>
              prev.map((n) =>
                n.id === nodeId
                  ? { ...n, x: newX, y: newY, width: newW, height: newH }
                  : n,
              ),
            );
          } else {
            let ratio = 1.33;
            if (node.aspectRatio) {
              const ar =
                node.aspectRatio === "auto" ? "1:1" : node.aspectRatio;
              const [w, h] = ar.split(":").map(Number);
              if (!isNaN(w) && !isNaN(h) && h !== 0) ratio = w / h;
            } else if (node.type === NodeType.ORIGINAL_IMAGE) {
              ratio =
                (dragStartRef.current.w || 1) / (dragStartRef.current.h || 1);
            }
            let minWidth = 150;
            if (node.type !== NodeType.CREATIVE_DESC) {
              const limit1 = ratio >= 1 ? 400 * ratio : 400;
              minWidth = Math.max(limit1, 400);
            } else minWidth = 280;
            let newWidth = Math.max(
              minWidth,
              (dragStartRef.current.w || 0) + dx,
            );
            setNodes((prev) =>
              prev.map((n) =>
                n.id === nodeId
                  ? { ...n, width: newWidth, height: newWidth / ratio }
                  : n,
              ),
            );
          }
        }
      }
    }),
    [],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (
        dragModeRef.current === "CONNECT" &&
        connectionStartRef.current?.type === "source"
      ) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setQuickAddMenu({
          sourceId: connectionStartRef.current.nodeId,
          x: e.clientX,
          y: e.clientY,
          worldX: worldPos.x,
          worldY: worldPos.y,
        });
      }
      if (
        dragModeRef.current === "DRAG_NODE" ||
        dragModeRef.current === "RESIZE_NODE"
      ) {
        const startRef = dragStartRef.current;
        const hasMoved = startRef.x !== 0 || startRef.y !== 0;
        if (hasMoved) {
          const currentNodes = nodesRef.current;
          const currentConnections = connectionsRef.current;
          setTimeout(() => {
            saveToHistoryRef.current(currentNodes, currentConnections);
          }, 0);
        }
        if (dragModeRef.current === "DRAG_NODE" && hasMoved) {
          const currentNodes = nodesRef.current;
          const detached = new Set<string>();
          currentNodes.forEach((n) => {
            if (!n.parentId) return;
            const parent = currentNodes.find((p) => p.id === n.parentId);
            if (!parent) return;
            const inBounds =
              n.x >= parent.x &&
              n.y >= parent.y &&
              n.x + n.width <= parent.x + parent.width &&
              n.y + n.height <= parent.y + parent.height;
            if (!inBounds) {
              detached.add(n.id);
            }
          });
          if (detached.size > 0) {
            setNodes((prev) =>
              prev.map((n) =>
                detached.has(n.id) ? { ...n, parentId: undefined } : n,
              ),
            );
          }
          const attachMap = new Map<string, string>();
          currentNodes.forEach((n) => {
            if (n.type === ("GROUP" as string)) return;
            if (n.parentId) return;
            if (detached.has(n.id)) return;
            const cx = n.x + n.width / 2;
            const cy = n.y + n.height / 2;
            for (const g of currentNodes) {
              if (g.type !== ("GROUP" as string)) continue;
              if (
                cx >= g.x &&
                cx <= g.x + g.width &&
                cy >= g.y &&
                cy <= g.y + g.height
              ) {
                attachMap.set(n.id, g.id);
                break;
              }
            }
          });
          if (attachMap.size > 0) {
            setNodes((prev) =>
              prev.map((n) => {
                const newParent = attachMap.get(n.id);
                if (newParent) return { ...n, parentId: newParent };
                return n;
              }),
            );
          }
        }
      }
      if (dragModeRef.current !== "NONE") {
        setDragMode("NONE");
        setTempConnection(null);
        connectionStartRef.current = null;
        setSuggestedNodes([]);
        setSelectionBox(null);
      }
    },
    [screenToWorld],
  );

  const handleGlobalMouseUp = useCallback(() => {
    if (dragModeRef.current !== "NONE") {
      if (
        dragModeRef.current === "DRAG_NODE" ||
        dragModeRef.current === "RESIZE_NODE"
      ) {
        const startRef = dragStartRef.current;
        const hasMoved = startRef.x !== 0 || startRef.y !== 0;
        if (hasMoved) {
          const currentNodes = nodesRef.current;
          const currentConnections = connectionsRef.current;
          setTimeout(() => {
            saveToHistoryRef.current(currentNodes, currentConnections);
          }, 0);
        }
      }
      setDragMode("NONE");
      setTempConnection(null);
      connectionStartRef.current = null;
      dragStartRef.current = { x: 0, y: 0 };
      setSuggestedNodes([]);
      setSelectionBox(null);
    }
  }, []);

  const getCanvasCursor = useCallback(() => {
    if (dragMode === "PAN") return "cursor-grabbing";
    if (dragMode === "DRAG_NODE") return "cursor-move";
    if (dragMode === "SELECT") return "cursor-default";
    if (dragMode === "CONNECT") return "cursor-crosshair";
    if (dragMode === "RESIZE_NODE") return "cursor-nwse-resize";
    if (currentMode === "pan" || spacePressed.current) return "cursor-grab";
    return "cursor-default";
  }, [dragMode, currentMode, spacePressed]);

  const handleGroupBoxMouseDown = useCallback(
    (e: React.MouseEvent, groupId: string) => {
      e.stopPropagation();
      setContextMenu(null);
      setQuickAddMenu(null);
      setSelectedConnectionId(null);
      if (e.button !== 0) return;
      const groupNodeIds = getGroupNodeIds(groupId);
      setDragMode("DRAG_NODE");
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setSelectedNodeIds((prev) => {
        const allGroupSelected = [...groupNodeIds].every((id) => prev.has(id));
        let newSelection: Set<string>;
        if (e.shiftKey) {
          newSelection = new Set(prev);
          if (allGroupSelected) {
            groupNodeIds.forEach((id) => newSelection.delete(id));
          } else {
            groupNodeIds.forEach((id) => newSelection.add(id));
          }
        } else {
          newSelection = allGroupSelected ? prev : groupNodeIds;
        }
        initialNodePositionsRef.current = new Map(
          nodesRef.current
            .filter((n) => newSelection.has(n.id))
            .map((n) => [n.id, { x: n.x, y: n.y }]),
        );
        return newSelection;
      });
    },
    [getGroupNodeIds],
  );

  return {
    handleMouseDown,
    handleNodeMouseDown,
    handleGroupBoxMouseDown,
    handleNodeContextMenu,
    handleCanvasContextMenu,
    handleResizeStart,
    handleConnectStart,
    handlePortMouseUp,
    handleMouseMove,
    handleMouseUp,
    handleGlobalMouseUp,
    createConnection,
    removeConnection,
    tempConnection,
    suggestedNodes,
    lastMousePosRef,
    connectionStartRef,
    getCanvasCursor,
  };
};
