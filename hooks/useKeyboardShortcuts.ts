import { useEffect, useCallback, useRef } from "react";
import {
  NodeData,
  Connection,
  NodeType,
  CanvasTransform,
  Point,
} from "../types";

export interface UseKeyboardShortcutsOptions {
  selectedNodeIds: Set<string>;
  selectedConnectionId: string | null;
  nodes: NodeData[];
  connections: Connection[];
  currentMode: "select" | "pan";
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
  handleAlign: (direction: "UP" | "DOWN" | "LEFT" | "RIGHT") => void;
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
    spacePressedRef,
  } = options;

  const optionsRef = useRef(options);
  optionsRef.current = options;

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
        if (e.key === "v" || e.key === "V") opts.handleSelectMode();
        if (e.key === "h" || e.key === "H") opts.handlePanMode();
        if (e.key === "[") opts.handleZoomIn();
        if (e.key === "]") opts.handleZoomOut();
        if (e.key === "0") opts.handleZoomReset();
        if (e.key === "Delete" || e.key === "Backspace") {
          if (opts.selectedNodeIds.size > 0) opts.deleteSelectedNodes();
          if (opts.selectedConnectionId) opts.deleteSelectedConnection();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "c") {
          e.preventDefault();
          opts.performCopy();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
          e.preventDefault();
          opts.handleUndo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "y") {
          e.preventDefault();
          opts.handleRedo();
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            opts.handleAlign("UP");
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            opts.handleAlign("DOWN");
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            opts.handleAlign("LEFT");
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            opts.handleAlign("RIGHT");
          }
        }
        if (!(e.ctrlKey || e.metaKey)) {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (opts.selectedNodeIds.size >= 2) opts.handleAlign("UP");
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (opts.selectedNodeIds.size >= 2) opts.handleAlign("DOWN");
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            if (opts.selectedNodeIds.size >= 2) opts.handleAlign("LEFT");
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            if (opts.selectedNodeIds.size >= 2) opts.handleAlign("RIGHT");
          }
        }
      }

      if (e.key === "Escape") {
        if (opts.previewMedia) opts.setPreviewMedia(null);
        if (opts.contextMenu) opts.setContextMenu(null);
        if (opts.quickAddMenu) opts.setQuickAddMenu(null);
        if (opts.showNewWorkflowDialog) opts.setShowNewWorkflowDialog(false);
        if (opts.isSettingsOpen) opts.setIsSettingsOpen(false);
        if (opts.isStorageOpen) opts.setIsStorageOpen(false);
        if (opts.isExportImportOpen) opts.setIsExportImportOpen(false);
        if (opts.showCommunityPanel && opts.setShowCommunityPanel)
          opts.setShowCommunityPanel(false);
      }
      if (e.code === "Space" && opts.spacePressedRef) opts.spacePressedRef.current = true;
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
  setNodes((prev) => prev.filter((n) => !selectedNodeIds.has(n.id)));
  setConnections((prev) =>
    prev.filter(
      (c) =>
        !selectedNodeIds.has(c.sourceId) && !selectedNodeIds.has(c.targetId),
    ),
  );
  setSelectedNodeIds(new Set());
};
