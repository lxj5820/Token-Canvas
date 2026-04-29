import { useEffect, useCallback, useRef } from "react";
import {
  NodeData,
  Connection,
  NodeType,
  CanvasTransform,
  Point,
  DragMode,
} from "../types";

export interface UseKeyboardShortcutsOptions {
  selectedNodeIds: Set<string>;
  selectedConnectionId: string | null;
  nodes: NodeData[];
  connections: Connection[];
  currentMode: DragMode;
  previewMedia: { url: string; type: "image" | "video" } | null;
  contextMenu: {
    type: "CANVAS" | "NODE";
    nodeId?: string;
    nodeType?: NodeType;
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null;
  quickAddMenu: {
    sourceId: string;
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null;
  showNewWorkflowDialog: boolean;
  isSettingsOpen: boolean;
  isStorageOpen: boolean;
  isExportImportOpen: boolean;
  showCommunityPanel?: boolean;
  handleSelectMode: () => void;
  handlePanMode: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleAlign: (direction: "UP" | "DOWN" | "LEFT" | "RIGHT", selectedNodeIds: Set<string>) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  performCopy: () => void;
  deleteSelectedNodes: () => void;
  deleteSelectedConnection: () => void;
  setPreviewMedia: React.Dispatch<
    React.SetStateAction<{ url: string; type: "image" | "video" } | null>
  >;
  setContextMenu: React.Dispatch<
    React.SetStateAction<{
      type: "CANVAS" | "NODE";
      nodeId?: string;
      nodeType?: NodeType;
      x: number;
      y: number;
      worldX: number;
      worldY: number;
    } | null>
  >;
  setQuickAddMenu: React.Dispatch<
    React.SetStateAction<{
      sourceId: string;
      x: number;
      y: number;
      worldX: number;
      worldY: number;
    } | null>
  >;
  setShowNewWorkflowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStorageOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsExportImportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCommunityPanel?: React.Dispatch<React.SetStateAction<boolean>>;
  transform: CanvasTransform;
  internalClipboard: { nodes: NodeData[]; connections: Connection[] } | null;
  performPaste: (targetPos: Point) => void;
  setDeletedNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  saveToHistory: (nodes: NodeData[], connections: Connection[]) => void;
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleGroup: (selectedNodeIds: Set<string>) => void;
  handleUnGroup: (groupId: string) => void;
  spacePressedRef?: React.MutableRefObject<boolean>;
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const {
    selectedNodeIds,
    selectedConnectionId,
    nodes,
    connections,
    handleSelectMode,
    handlePanMode,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleAlign,
    handleUndo,
    handleRedo,
    performCopy,
    previewMedia,
    contextMenu,
    quickAddMenu,
    showNewWorkflowDialog,
    isSettingsOpen,
    isStorageOpen,
    isExportImportOpen,
    showCommunityPanel,
    deleteSelectedNodes,
    deleteSelectedConnection,
    setPreviewMedia,
    setContextMenu,
    setQuickAddMenu,
    setShowNewWorkflowDialog,
    setIsSettingsOpen,
    setIsStorageOpen,
    setIsExportImportOpen,
    setShowCommunityPanel,
    performPaste,
    setDeletedNodes,
    saveToHistory,
    setNodes,
    setConnections,
    setSelectedNodeIds,
    handleGroup,
    handleUnGroup,
    spacePressedRef,
  } = options;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handleModeShortcuts = (e: KeyboardEvent, opts: UseKeyboardShortcutsOptions) => {
    const modeMap: Record<string, () => void> = {
      v: opts.handleSelectMode,
      V: opts.handleSelectMode,
      h: opts.handlePanMode,
      H: opts.handlePanMode,
    };
    const zoomMap: Record<string, () => void> = {
      "[": opts.handleZoomIn,
      "]": opts.handleZoomOut,
      "0": opts.handleZoomReset,
    };
    if (modeMap[e.key]) { modeMap[e.key](); return true; }
    if (zoomMap[e.key]) { zoomMap[e.key](); return true; }
    return false;
  };

  const handleDeleteShortcut = (e: KeyboardEvent, opts: UseKeyboardShortcutsOptions) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return false;
    if (opts.selectedNodeIds.size > 0) opts.deleteSelectedNodes();
    if (opts.selectedConnectionId) opts.deleteSelectedConnection();
    return true;
  };

  const handleClipboardShortcut = (e: KeyboardEvent, opts: UseKeyboardShortcutsOptions) => {
    if (!(e.ctrlKey || e.metaKey) || e.key !== "c") return false;
    e.preventDefault();
    opts.performCopy();
    return true;
  };

  const handleSelectAllShortcut = (e: KeyboardEvent, opts: UseKeyboardShortcutsOptions) => {
    if (!(e.ctrlKey || e.metaKey) || e.key !== "a") return false;
    e.preventDefault();
    const allIds = new Set(opts.nodes.map((n) => n.id));
    opts.setSelectedNodeIds(allIds);
    return true;
  };

  const handleGroupShortcuts = (e: KeyboardEvent, opts: UseKeyboardShortcutsOptions) => {
    if (!(e.ctrlKey || e.metaKey) || e.key !== "g") return false;
    e.preventDefault();
    if (e.shiftKey) {
      const groupNode = opts.nodes.find(
        (n) => opts.selectedNodeIds.has(n.id) && n.type === NodeType.GROUP,
      );
      if (groupNode) opts.handleUnGroup(groupNode.id);
    } else {
      if (opts.selectedNodeIds.size >= 2) opts.handleGroup(opts.selectedNodeIds);
    }
    return true;
  };

  const handleHistoryShortcuts = (e: KeyboardEvent, opts: UseKeyboardShortcutsOptions) => {
    if (!(e.ctrlKey || e.metaKey)) return false;
    if (e.key === "z") { e.preventDefault(); opts.handleUndo(); return true; }
    if (e.key === "y") { e.preventDefault(); opts.handleRedo(); return true; }
    return false;
  };

  const handleAlignShortcut = (e: KeyboardEvent, opts: UseKeyboardShortcutsOptions) => {
    const arrowMap: Record<string, "UP" | "DOWN" | "LEFT" | "RIGHT"> = {
      ArrowUp: "UP",
      ArrowDown: "DOWN",
      ArrowLeft: "LEFT",
      ArrowRight: "RIGHT",
    };
    const direction = arrowMap[e.key];
    if (!direction) return false;
    e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      opts.handleAlign(direction, opts.selectedNodeIds);
    } else if (!(e.ctrlKey || e.metaKey)) {
      if (opts.selectedNodeIds.size >= 2) opts.handleAlign(direction, opts.selectedNodeIds);
    }
    return true;
  };

  const handleEscapeShortcut = (e: KeyboardEvent, opts: UseKeyboardShortcutsOptions) => {
    if (e.key !== "Escape") return false;
    if (opts.previewMedia) opts.setPreviewMedia(null);
    if (opts.contextMenu) opts.setContextMenu(null);
    if (opts.quickAddMenu) opts.setQuickAddMenu(null);
    if (opts.showNewWorkflowDialog) opts.setShowNewWorkflowDialog(false);
    if (opts.isSettingsOpen) opts.setIsSettingsOpen(false);
    if (opts.isStorageOpen) opts.setIsStorageOpen(false);
    if (opts.isExportImportOpen) opts.setIsExportImportOpen(false);
    if (opts.showCommunityPanel && opts.setShowCommunityPanel)
      opts.setShowCommunityPanel(false);
    return true;
  };

  const handleSpaceShortcut = (e: KeyboardEvent, opts: UseKeyboardShortcutsOptions) => {
    if (e.code !== "Space" || !opts.spacePressedRef) return false;
    opts.spacePressedRef.current = true;
    return true;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const opts = optionsRef.current;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.getAttribute("role") === "textbox";

      if (!isInput) {
        if (handleModeShortcuts(e, opts)) return;
        if (handleDeleteShortcut(e, opts)) return;
        if (handleClipboardShortcut(e, opts)) return;
        if (handleSelectAllShortcut(e, opts)) return;
        if (handleGroupShortcuts(e, opts)) return;
        if (handleHistoryShortcuts(e, opts)) return;
        if (handleAlignShortcut(e, opts)) return;
      }

      if (handleEscapeShortcut(e, opts)) return;
      if (handleSpaceShortcut(e, opts)) return;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && optionsRef.current.spacePressedRef)
        optionsRef.current.spacePressedRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
};

export const deleteSelectedNodesHelper = (
  nodes: NodeData[],
  connections: Connection[],
  selectedNodeIds: Set<string>,
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>,
  setDeletedNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
  saveToHistory: (nodes: NodeData[], connections: Connection[]) => void,
) => {
  const nodesToDelete = nodes.filter((n) => selectedNodeIds.has(n.id));
  const withContent = nodesToDelete.filter((n) => n.imageSrc || n.videoSrc);
  if (withContent.length > 0) {
    setDeletedNodes((prev) => [...prev, ...withContent]);
  }
  saveToHistory(nodes, connections);
  const hasGroup = nodesToDelete.some((n) => n.type === NodeType.GROUP);
  if (hasGroup) {
    const groupIds = new Set(
      nodesToDelete
        .filter((n) => n.type === NodeType.GROUP)
        .map((n) => n.id),
    );
    setNodes((prev) =>
      prev
        .filter((n) => !selectedNodeIds.has(n.id))
        .map((n) =>
          n.parentId && groupIds.has(n.parentId)
            ? { ...n, parentId: undefined }
            : n,
        ),
    );
  } else {
    setNodes((prev) => prev.filter((n) => !selectedNodeIds.has(n.id)));
  }
  setConnections((prev) =>
    prev.filter(
      (c) =>
        !selectedNodeIds.has(c.sourceId) && !selectedNodeIds.has(c.targetId),
    ),
  );
  setSelectedNodeIds(new Set());
};
