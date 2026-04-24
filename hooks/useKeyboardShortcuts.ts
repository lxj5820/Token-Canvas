import { useEffect, useCallback } from 'react';
import { NodeData, Connection, NodeType, CanvasTransform, Point } from '../types';

export interface UseKeyboardShortcutsOptions {
  selectedNodeIds: Set<string>;
  selectedConnectionId: string | null;
  nodes: NodeData[];
  connections: Connection[];
  currentMode: 'select' | 'pan';
  previewMedia: { url: string; type: 'image' | 'video' } | null;
  contextMenu: { type: 'CANVAS' | 'NODE'; nodeId?: string; nodeType?: NodeType; x: number; y: number; worldX: number; worldY: number } | null;
  quickAddMenu: { sourceId: string; x: number; y: number; worldX: number; worldY: number } | null;
  showNewWorkflowDialog: boolean;
  isSettingsOpen: boolean;
  isStorageOpen: boolean;
  isExportImportOpen: boolean;
  handleSelectMode: () => void;
  handlePanMode: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleAlign: (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  handleUndo: () => void;
  handleRedo: () => void;
  performCopy: () => void;
  deleteSelectedNodes: () => void;
  deleteSelectedConnection: () => void;
  setPreviewMedia: React.Dispatch<React.SetStateAction<{ url: string; type: 'image' | 'video' } | null>>;
  setContextMenu: React.Dispatch<React.SetStateAction<{ type: 'CANVAS' | 'NODE'; nodeId?: string; nodeType?: NodeType; x: number; y: number; worldX: number; worldY: number } | null>>;
  setQuickAddMenu: React.Dispatch<React.SetStateAction<{ sourceId: string; x: number; y: number; worldX: number; worldY: number } | null>>;
  setShowNewWorkflowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStorageOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsExportImportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  transform: CanvasTransform;
  internalClipboard: { nodes: NodeData[]; connections: Connection[] } | null;
  performPaste: (targetPos: Point) => void;
  setDeletedNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  saveToHistory: (nodes: NodeData[], connections: Connection[]) => void;
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
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
    deleteSelectedNodes,
    deleteSelectedConnection,
    setPreviewMedia,
    setContextMenu,
    setQuickAddMenu,
    setShowNewWorkflowDialog,
    setIsSettingsOpen,
    setIsStorageOpen,
    setIsExportImportOpen,
    performPaste,
    setDeletedNodes,
    saveToHistory,
    setNodes,
    setConnections,
    setSelectedNodeIds,
  } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (!isInput) {
        if (e.key === 'v' || e.key === 'V') {
          handleSelectMode();
        }
        if (e.key === 'h' || e.key === 'H') {
          handlePanMode();
        }
        if (e.key === '[') {
          handleZoomIn();
        }
        if (e.key === ']') {
          handleZoomOut();
        }
        if (e.key === '0') {
          handleZoomReset();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedNodeIds.size > 0) {
            deleteSelectedNodes();
          }
          if (selectedConnectionId) {
            deleteSelectedConnection();
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          e.preventDefault();
          performCopy();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          handleUndo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          if (e.key === 'ArrowUp') { e.preventDefault(); handleAlign('UP'); }
          if (e.key === 'ArrowDown') { e.preventDefault(); handleAlign('DOWN'); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); handleAlign('LEFT'); }
          if (e.key === 'ArrowRight') { e.preventDefault(); handleAlign('RIGHT'); }
        }
        if (!(e.ctrlKey || e.metaKey)) {
          if (e.key === 'ArrowUp') { e.preventDefault(); if (selectedNodeIds.size >= 2) handleAlign('UP'); }
          if (e.key === 'ArrowDown') { e.preventDefault(); if (selectedNodeIds.size >= 2) handleAlign('DOWN'); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); if (selectedNodeIds.size >= 2) handleAlign('LEFT'); }
          if (e.key === 'ArrowRight') { e.preventDefault(); if (selectedNodeIds.size >= 2) handleAlign('RIGHT'); }
        }
      }

      if (e.key === 'Escape') {
        if (previewMedia) setPreviewMedia(null);
        if (contextMenu) setContextMenu(null);
        if (quickAddMenu) setQuickAddMenu(null);
        if (showNewWorkflowDialog) setShowNewWorkflowDialog(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isStorageOpen) setIsStorageOpen(false);
        if (isExportImportOpen) setIsExportImportOpen(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Handle key up if needed
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selectedNodeIds,
    selectedConnectionId,
    previewMedia,
    contextMenu,
    quickAddMenu,
    showNewWorkflowDialog,
    isSettingsOpen,
    isStorageOpen,
    isExportImportOpen,
    handleAlign,
  ]);
};

export const deleteSelectedNodesHelper = (
  nodes: NodeData[],
  connections: Connection[],
  selectedNodeIds: Set<string>,
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>,
  setDeletedNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
  saveToHistory: (nodes: NodeData[], connections: Connection[]) => void
) => {
  const nodesToDelete = nodes.filter(n => selectedNodeIds.has(n.id));
  const withContent = nodesToDelete.filter(n => n.imageSrc || n.videoSrc);
  if (withContent.length > 0) {
    setDeletedNodes(prev => [...prev, ...withContent]);
  }
  saveToHistory(nodes, connections);
  setNodes(prev => prev.filter(n => !selectedNodeIds.has(n.id)));
  setConnections(prev => prev.filter(c => !selectedNodeIds.has(c.sourceId) && !selectedNodeIds.has(c.targetId)));
  setSelectedNodeIds(new Set());
};
