import React, { useRef, useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import {
  NodeData,
  Connection,
  CanvasTransform,
  Point,
  DragMode,
  NodeType,
} from "./types";
import BaseNode from "./components/Nodes/BaseNode";
import { NodeContent } from "./components/Nodes/NodeContent";
import { Icons } from "./components/Icons";
import Minimap from "./components/Minimap";
import { SettingsModal } from "./components/Settings/SettingsModal";
import { StorageModal } from "./components/Settings/StorageModal";
import { ExportImportModal } from "./components/Settings/ExportImportModal";
import {
  WelcomeModal,
  hasShownWelcome,
} from "./components/Settings/WelcomeModal";
import { AIPanel } from "./components/AIPanel";

import { useHistory } from "./hooks/useHistory";
import { useAutoSave, useLoadWorkflow } from "./hooks/useAutoSave";
import {
  useKeyboardShortcuts,
  deleteSelectedNodesHelper,
} from "./hooks/useKeyboardShortcuts";
import { MODEL_REGISTRY, getModelConfig } from "./services/geminiService";
import { useCanvasState } from "./hooks/useCanvasState";
import { useGeneration } from "./hooks/useGeneration";
import { useZoom } from "./hooks/useZoom";
import { useNodeActions } from "./hooks/useNodeActions";
import { useWorkflowIO } from "./hooks/useWorkflowIO";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { ConnectionRenderer, SelectionBox, PreviewMedia, MultiSelectBox } from "./renderers";
import { GroupNode } from "./components/Nodes/GroupNode";
import { NewWorkflowDialog, ContextMenu, QuickAddMenu } from "./dialogs";
import { importFileAsNode } from "./utils/importFileAsNode";
import { logger } from "./services/logger";
import { storageService } from "./services/storageService";
import { generateId } from "./services/canvasConstants";
import { saveAssetToIndexedDB } from "./services/saveAssetToIndexedDB";
import { Toast, ToastContainer } from "./components/Toast";
import { MultiSelectToolbar } from "./components/MultiSelectToolbar";

const App: React.FC = () => {
  return <CanvasWithSidebar />;
};

const CanvasWithSidebar: React.FC = () => {
  const checkHasApiConfigured = () => {
    const globalConfig = getModelConfig("Banana 2");
    if (globalConfig.key) return true;

    return Object.keys(MODEL_REGISTRY).some((key) => {
      const config = getModelConfig(key);
      return config.key;
    });
  };

  const [showStorageWarning, setShowStorageWarning] = useState(
    !checkHasApiConfigured(),
  );

  const {
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
  } = useCanvasState();

  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => !hasShownWelcome() || !checkHasApiConfigured());
  const [storageDirName, setStorageDirName] = useState<string | null>(null);
  const [deletedNodes, setDeletedNodes] = useState<NodeData[]>([]);
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);
  const [quickAddMenu, setQuickAddMenu] = useState<{
    sourceId: string;
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: "CANVAS" | "NODE";
    nodeId?: string;
    nodeType?: NodeType;
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const [internalClipboard, setInternalClipboard] = useState<{
    nodes: NodeData[];
    connections: Connection[];
  } | null>(null);
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: "success" | "error" | "info";
  }>>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const replaceImageRef = useRef<HTMLInputElement>(null);
  const nodeToReplaceRef = useRef<string | null>(null);
  const spacePressed = useRef(false);

  const {
    history,
    historyIndex,
    saveToHistory,
    handleUndo,
    handleRedo,
    setInitialHistory,
  } = useHistory();

  useLoadWorkflow(
    setNodes,
    setConnections,
    setTransform,
    setProjectName,
    setInitialHistory,
  );

  useAutoSave({ nodes, connections, transform, projectName });

  const { handleZoomIn, handleZoomOut, handleZoomReset } =
    useZoom({ transform, setTransform, nodes, containerRef });

  const {
    updateNodeData,
    addNode,
    handleQuickAddNode: handleQuickAddNodeFromHook,
    deleteNode,
    performCopy: performCopyFromHook,
    performPaste: performPasteFromHook,
    handleAlign,
    handleEdgeAlign,
    handleDistribute,
    computeSelectionBounds,
    handleGroup,
    handleUnGroup,
    getGroupNodeIds,
    hasGroupInSelection,
    collectGroupDescendants,
    handleMaximize: handleMaximizeFromHook,
    copyImageToClipboard: copyImageToClipboardFromHook,
    triggerReplaceImage: triggerReplaceImageFromHook,
    handleReplaceImage: handleReplaceImageFromHook,
  } = useNodeActions({
    nodes,
    connections,
    setNodes,
    setConnections,
    setSelectedNodeIds,
    setDeletedNodes,
    saveToHistory,
    screenToWorld,
    containerRef,
  });

  const {
    handleSaveWorkflow,
    handleLoadWorkflow,
    handleConfirmNew: handleConfirmNewFromHook,
    handleDownload,
    handleImportWorkflow,
  } = useWorkflowIO({
    nodes,
    connections,
    transform,
    projectName,
    setNodes,
    setConnections,
    setTransform,
    setProjectName,
    setSelectedNodeIds,
    setSelectionBox,
    setDeletedNodes,
    saveToHistory,
  });

  const {
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
  } = useCanvasInteraction({
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
  });

  const {
    handleGenerate,
    handleAngleGenerate,
    handleLightGenerate,
    handleGridSplitCreateNodes,
    handleCrop,
    handleExpandImageGenerate,
  } = useGeneration({
    nodes,
    connections,
    updateNodeData,
    getInputImages,
    saveToHistory,
    setNodes,
    setConnections,
  });

  const performCopy = () => {
    const result = performCopyFromHook(selectedNodeIds);
    if (result) {
      setInternalClipboard(result);
      showToast(`已复制 ${result.nodes.length} 个节点`, "success");
    }
  };

  const performPaste = (targetPos: Point) => {
    if (internalClipboard) {
      performPasteFromHook(targetPos, internalClipboard, selectedNodeIds);
    }
  };

  const handleQuickAddNode = (type: NodeType) => {
    if (quickAddMenu) {
      handleQuickAddNodeFromHook(type, quickAddMenu);
      setQuickAddMenu(null);
    }
  };

  const handleMaximize = (nodeId: string) => {
    const result = handleMaximizeFromHook(nodeId);
    if (result) setPreviewMedia(result);
  };

  const triggerReplaceImage = () => {
    triggerReplaceImageFromHook(replaceImageRef);
  };

  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleReplaceImageFromHook(e, nodeToReplaceRef);
    if (replaceImageRef.current) replaceImageRef.current.value = "";
  };

  const copyImageToClipboard = async (nodeId: string) => {
    await copyImageToClipboardFromHook(nodeId);
    showToast("图片已复制到剪贴板", "success");
  };

  const handlePanoramaEdit = useCallback((sourceNodeId: string) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;
    const imageSrc = sourceNode.annotatedImageSrc || sourceNode.imageSrc;
    if (!imageSrc) return;
    const gap = 30;
    const newNodeId = generateId();
    const nodeH = sourceNode.height;
    const nodeW = Math.round(nodeH * 16 / 9);
    const newNode: NodeData = {
      id: newNodeId,
      type: NodeType.PANORAMA,
      x: sourceNode.x + sourceNode.width + gap,
      y: sourceNode.y,
      width: Math.max(200, nodeW),
      height: nodeH,
      title: "全景",
      imageSrc,
      isPanoramaMode: true,
      panoramaYaw: 0,
      panoramaPitch: 0,
      panoramaFov: 75,
      panoramaAspectRatio: "16:9",
      panoramaShowGrid: false,
      outputArtifacts: [imageSrc],
    };
    const newConn: Connection = {
      id: generateId(),
      sourceId: sourceNodeId,
      targetId: newNodeId,
    };
    saveToHistory(nodes, connections);
    setNodes((prev) => [...prev, newNode]);
    setConnections((prev) => [...prev, newConn]);
    setSelectedNodeIds(new Set([newNodeId]));
  }, [nodes, connections, saveToHistory]);

  const handlePanoramaScreenshot = useCallback((
    sourceNodeId: string,
    dataUrl: string,
    outputWidth: number,
    outputHeight: number,
  ) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;
    const gap = 30;
    const newNodeId = generateId();
    const ratio = outputWidth / Math.max(1, outputHeight);
    let nodeW: number, nodeH: number;
    if (ratio >= 1) {
      nodeH = 400;
      nodeW = Math.round(nodeH * ratio);
    } else {
      nodeW = 400;
      nodeH = Math.round(nodeW / ratio);
    }
    const newNode: NodeData = {
      id: newNodeId,
      type: NodeType.ORIGINAL_IMAGE,
      x: sourceNode.x + sourceNode.width + gap,
      y: sourceNode.y,
      width: Math.max(200, nodeW),
      height: Math.max(200, nodeH),
      title: `全景截图_${Date.now()}`,
      imageSrc: dataUrl,
      aspectRatio: sourceNode.panoramaAspectRatio || "16:9",
      outputArtifacts: [dataUrl],
    };
    const newConn: Connection = {
      id: generateId(),
      sourceId: sourceNodeId,
      targetId: newNodeId,
    };
    saveToHistory(nodes, connections);
    setNodes((prev) => [...prev, newNode]);
    setConnections((prev) => [...prev, newConn]);
    setSelectedNodeIds(new Set([newNodeId]));
    saveAssetToIndexedDB(newNodeId, dataUrl, "image");
  }, [nodes, connections, saveToHistory]);

  const handleConfirmNew = async (shouldSave: boolean) => {
    await handleConfirmNewFromHook(shouldSave);
    setShowNewWorkflowDialog(false);
  };

  const handleNewWorkflow = () => setShowNewWorkflowDialog(true);

  const handleSelectMode = useCallback(() => {
    setCurrentMode("select");
    setDragMode("NONE");
  }, []);

  const handlePanMode = useCallback(() => {
    setCurrentMode("pan");
    setDragMode("PAN");
  }, []);

  const toggleTheme = (dark: boolean) => {
    setIsDark(dark);
    setCanvasBg(dark ? "#0B0C0E" : "#F5F7FA");
  };

  const handleImportAsset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const center = rect
      ? screenToWorld(rect.width / 2, rect.height / 2)
      : { x: 0, y: 0 };
    importFileAsNode(file, center, addNode);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files: File[] = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const worldPos = screenToWorld(e.clientX, e.clientY);
    files.forEach((file, index) => {
      const offset = { x: worldPos.x + index * 20, y: worldPos.y + index * 20 };
      importFileAsNode(file, offset, addNode);
    });
  };

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const sora2Key = `API_CONFIG_MODEL_Sora 2`;
        const stored = localStorage.getItem(sora2Key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.endpoint === "/v1/chat/completions") {
            localStorage.removeItem(sora2Key);
          }
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    if (showStorageWarning) {
      const timer = setTimeout(() => setShowStorageWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showStorageWarning]);

  useEffect(() => {
    const loadStorageInfo = async () => {
      const name = await storageService.getDownloadDirectoryName();
      setStorageDirName(name);
    };
    loadStorageInfo();
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;
      if (isInputFocused) return;
      const items = e.clipboardData?.items;
      let hasSystemMedia = false;
      const mousePos = lastMousePosRef.current;
      const worldPos = screenToWorld(mousePos.x, mousePos.y);
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i] as DataTransferItem;
          if (item.type.indexOf("image") !== -1) {
            hasSystemMedia = true;
            const file = item.getAsFile();
            if (file) importFileAsNode(file, worldPos, addNode);
          } else if (item.type.indexOf("video") !== -1) {
            hasSystemMedia = true;
            const file = item.getAsFile();
            if (file) importFileAsNode(file, worldPos, addNode);
          }
        }
      }
      if (!hasSystemMedia && internalClipboard) performPaste(worldPos);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [transform, internalClipboard]);

  useKeyboardShortcuts({
    selectedNodeIds,
    selectedConnectionId,
    nodes,
    connections,
    currentMode: dragMode,
    previewMedia,
    contextMenu,
    quickAddMenu,
    showNewWorkflowDialog,
    isSettingsOpen,
    isStorageOpen,
    isExportImportOpen,
    handleSelectMode,
    handlePanMode,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleAlign,
    handleUndo: () => handleUndo(setNodes, setConnections),
    handleRedo: () => handleRedo(setNodes, setConnections),
    performCopy,
    deleteSelectedNodes: () =>
      deleteSelectedNodesHelper(
        nodes,
        connections,
        selectedNodeIds,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setDeletedNodes,
        saveToHistory,
      ),
    deleteSelectedConnection: () => {
      if (selectedConnectionId) {
        saveToHistory(nodes, connections);
        setConnections((prev) =>
          prev.filter((c) => c.id !== selectedConnectionId),
        );
        setSelectedConnectionId(null);
      }
    },
    setPreviewMedia,
    setContextMenu,
    setQuickAddMenu,
    setShowNewWorkflowDialog,
    setIsSettingsOpen,
    setIsStorageOpen,
    setIsExportImportOpen,
    transform,
    internalClipboard,
    performPaste,
    setDeletedNodes,
    saveToHistory,
    setNodes,
    setConnections,
    setSelectedNodeIds,
    handleGroup,
    handleUnGroup,
    spacePressedRef: spacePressed,
  });

  return (
    <div className="w-full h-screen overflow-hidden flex relative font-sans text-gray-800">
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        isDark={isDark}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDark={isDark}
      />
      <StorageModal
        isOpen={isStorageOpen}
        onClose={() => setIsStorageOpen(false)}
        isDark={isDark}
      />
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        isDark={isDark}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        nodes={nodes}
        connections={connections}
        transform={transform}
        onImport={handleImportWorkflow}
      />

      <Sidebar
        onAddNode={addNode}
        onNewWorkflow={handleNewWorkflow}
        onImportAsset={() => assetInputRef.current?.click()}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        nodes={[...nodes, ...deletedNodes]}
        onPreviewMedia={(url, type) => setPreviewMedia({ url, type })}
        isDark={isDark}
        onSelectMode={handleSelectMode}
        onPanMode={handlePanMode}
        onAlignVertical={() => handleAlign("UP", selectedNodeIds)}
        onAlignHorizontal={() => handleAlign("LEFT", selectedNodeIds)}
        currentMode={currentMode}
      />

      <div className="absolute bottom-4 left-4 z-50">
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded-2xl backdrop-blur-xl border transition-all ${
            isDark
              ? "bg-[#18181b]/90 border-zinc-800 shadow-xl"
              : "bg-white/90 border-gray-200 shadow-lg"
          }`}
        >
          <button
            onClick={handleZoomOut}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
            title="缩小 ([)"
          >
            <Icons.MinusCircle size={18} />
          </button>
          <button
            onClick={handleZoomReset}
            className={`px-3 py-1.5 text-sm font-medium tabular-nums rounded-lg transition-all ${isDark ? "text-gray-300 hover:text-white hover:bg-white/5" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
          >
            {Math.round(transform.k * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
            title="放大 (])"
          >
            <Icons.PlusCircle size={18} />
          </button>
          <div
            className={`w-px h-5 mx-1 ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}
          />
          <button
            onClick={handleZoomReset}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
            title="重置缩放 (0)"
          >
            <Icons.Maximize size={16} />
          </button>
          <div
            className={`w-px h-5 mx-1 ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}
          />
          <button
            onClick={() => handleUndo(setNodes, setConnections)}
            disabled={historyIndex <= 0}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${historyIndex <= 0 ? (isDark ? "text-zinc-600 cursor-not-allowed" : "text-gray-300 cursor-not-allowed") : isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
            title="撤销 (Ctrl+Z)"
          >
            <Icons.RotateCcw size={16} />
          </button>
          <button
            onClick={() => handleRedo(setNodes, setConnections)}
            disabled={historyIndex >= history.length - 1}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${historyIndex >= history.length - 1 ? (isDark ? "text-zinc-600 cursor-not-allowed" : "text-gray-300 cursor-not-allowed") : isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
            title="重做 (Ctrl+Y)"
          >
            <Icons.RotateCw size={16} />
          </button>
          <div
            className={`w-px h-5 mx-1 ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}
          />
          <button
            onClick={() => setShowShortcutsPanel(!showShortcutsPanel)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-all ${showShortcutsPanel ? (isDark ? "bg-blue-500/10 text-yellow-400" : "bg-yellow-50 text-yellow-600") : isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
            title="快捷键"
          >
            <Icons.Keyboard size={15} />
            <span className="text-xs">快捷键</span>
          </button>
        </div>
        {showShortcutsPanel && (
          <div
            className={`absolute bottom-full left-20 mb-2 w-72 p-4 rounded-2xl backdrop-blur-xl border shadow-xl animate-in slide-in-from-bottom-2 duration-200 z-[100] ${isDark ? "bg-[#18181b]/95 border-zinc-800" : "bg-white/95 border-gray-200"}`}
          >
            <div
              className={`text-sm font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              快捷键
            </div>
            <div className="space-y-2 text-xs">
              {[
                ["选择模式", "V"],
                ["移动模式", "H"],
                ["放大", "["],
                ["缩小", "]"],
                ["重置缩放", "0"],
                ["上下排列", "↑/↓"],
                ["左右排列", "←/→"],
                ["删除", "Delete"],
                ["复制", "Ctrl+C"],
                ["撤销", "Ctrl+Z"],
                ["重做", "Ctrl+Y"],
              ].map(([label, key]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                    {label}
                  </span>
                  <kbd
                    className={`px-2 py-1 rounded ${isDark ? "bg-zinc-800 text-gray-300" : "bg-gray-100 text-gray-700"}`}
                  >
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={assetInputRef}
        hidden
        accept="image/*,video/*"
        onChange={handleImportAsset}
      />
      <input
        type="file"
        ref={replaceImageRef}
        hidden
        accept="image/*"
        onChange={handleReplaceImage}
      />
      <div
        ref={containerRef}
        className={`flex-1 w-full h-full relative grid-pattern select-none ${getCanvasCursor()}`}
        style={
          {
            backgroundColor: canvasBg,
            "--grid-color": isDark ? "#27272a" : "#E4E4E7",
          } as React.CSSProperties
        }
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleCanvasContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className="absolute origin-top-left will-change-transform"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          }}
        >
          <ConnectionRenderer
            connections={connections}
            nodes={nodes}
            selectedConnectionId={selectedConnectionId}
            hoveredConnectionId={hoveredConnectionId}
            isDark={isDark}
            setHoveredConnectionId={setHoveredConnectionId}
            setSelectedConnectionId={setSelectedConnectionId}
            removeConnection={removeConnection}
            dragMode={dragMode}
            connectionStartRef={connectionStartRef}
            tempConnection={tempConnection}
          />
          {nodes.map((node) => {
            if (node.type === ("GROUP" as string)) {
              return (
                <GroupNode
                  key={node.id}
                  data={node}
                  selected={selectedNodeIds.has(node.id)}
                  isDark={isDark}
                  onUpdateData={updateNodeData}
                  onUnGroup={handleUnGroup}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onResizeStart={handleResizeStart}
                />
              );
            }
            return (
            <BaseNode
              key={node.id}
              data={node}
              selected={selectedNodeIds.has(node.id)}
              onMouseDown={handleNodeMouseDown}
              onContextMenu={handleNodeContextMenu}
              onConnectStart={handleConnectStart}
              onPortMouseUp={handlePortMouseUp}
              onResizeStart={handleResizeStart}
              scale={transform.k}
              isDark={isDark}
            >
              <NodeContent
                data={node}
                updateData={updateNodeData}
                onGenerate={handleGenerate}
                selected={selectedNodeIds.has(node.id)}
                showControls={selectedNodeIds.size === 1}
                inputs={getInputImages(node.id)}
                onMaximize={handleMaximize}
                onDownload={handleDownload}
                onUpload={triggerReplaceImage}
                isSelecting={dragMode === "SELECT"}
                onDelete={deleteNode}
                isDark={isDark}
                onGridSplitCreateNodes={handleGridSplitCreateNodes}
                onAngleGenerate={handleAngleGenerate}
                onLightGenerate={handleLightGenerate}
                onCrop={handleCrop}
                onExpandImageGenerate={handleExpandImageGenerate}
                onPanoramaEdit={handlePanoramaEdit}
                onPanoramaScreenshot={handlePanoramaScreenshot}
              />
            </BaseNode>
            );
          })}
          <MultiSelectBox
            selectedNodeIds={selectedNodeIds}
            nodes={nodes}
            onGroupMouseDown={handleGroupBoxMouseDown}
          />
        </div>
        {dragMode === "CONNECT" &&
          suggestedNodes.length > 0 &&
          lastMousePosRef.current && (
            <div
              className={`fixed z-50 border rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-48 pointer-events-auto ${isDark ? "bg-[#1A1D21] border-zinc-700" : "bg-white border-gray-200"}`}
              style={{
                left: lastMousePosRef.current.x + 20,
                top: lastMousePosRef.current.y,
              }}
            >
              <div
                className={`text-[10px] uppercase font-bold px-2 py-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                Quick Connect
              </div>
              {suggestedNodes.map((node) => (
                <button
                  key={node.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${isDark ? "hover:bg-zinc-800 text-gray-300 hover:text-yellow-400" : "hover:bg-gray-100 text-gray-700 hover:text-yellow-600"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectionStartRef.current)
                      createConnection(
                        connectionStartRef.current.nodeId,
                        node.id,
                      );
                  }}
                >
                  {node.type === NodeType.TEXT_TO_VIDEO ? (
                    <Icons.Video size={12} />
                  ) : (
                    <Icons.Image size={12} />
                  )}
                  <span className="truncate">{node.title}</span>
                </button>
              ))}
            </div>
          )}
        <SelectionBox selectionBox={selectionBox} containerRef={containerRef} />

        <MultiSelectToolbar
          selectedNodeIds={selectedNodeIds}
          nodes={nodes}
          transform={transform}
          isDark={isDark}
          onEdgeAlign={(direction) => handleEdgeAlign(direction, selectedNodeIds)}
          onDistribute={(direction) => handleDistribute(direction, selectedNodeIds)}
          onDelete={() =>
            deleteSelectedNodesHelper(
              nodes,
              connections,
              selectedNodeIds,
              setNodes,
              setConnections,
              setSelectedNodeIds,
              setDeletedNodes,
              saveToHistory,
            )
          }
          onGroup={() => handleGroup(selectedNodeIds)}
          onUnGroup={() => {
            const groupNode = nodes.find(
              (n) => selectedNodeIds.has(n.id) && n.type === ("GROUP" as string),
            );
            if (groupNode) handleUnGroup(groupNode.id);
          }}
          hasGroupInSelection={hasGroupInSelection(selectedNodeIds)}
        />

        {transform.k < 0.5 && (
          <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs backdrop-blur-xl border z-[999] pointer-events-none ${
              isDark
                ? "bg-zinc-800/90 border-zinc-700 text-gray-400"
                : "bg-white/90 border-gray-200 text-gray-500"
            }`}
          >
            按住鼠标中键或空格键拖动画布 · 滚轮缩放
          </div>
        )}

        {showStorageWarning && (
          <div className="absolute top-20 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div
              className={`px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg ${
                isDark
                  ? "bg-red-900/40 border-red-700/60"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={
                    isDark
                      ? "text-red-400 shrink-0 mt-0.5"
                      : "text-red-500 shrink-0 mt-0.5"
                  }
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span
                  className={`text-xs font-medium ${isDark ? "text-red-300" : "text-red-600"}`}
                >
                  请先完成api设置，才能正常使用!!!
                  <br />
                  数据仅保存在本地浏览器·换浏览器或清缓存会丢失！
                </span>
              </div>
            </div>
          </div>
        )}

        <div
          className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-lg text-xs backdrop-blur-xl border z-50 ${
            isDark
              ? "bg-zinc-800/90 border-zinc-700 text-gray-400"
              : "bg-white/90 border-gray-200 text-gray-500"
          }`}
        >
          {Math.round(transform.k * 100)}%
        </div>

        <div className="absolute top-4 left-4 z-50">
          <div
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
              isDark
                ? "bg-[#18181b]/90 border-zinc-800 shadow-xl"
                : "bg-white/90 border-gray-200 shadow-lg"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center ${
                isDark
                  ? "text-yellow-400"
                  : "text-yellow-600"
              }`}
            >
              <img
                src="https://lxj-picgo.oss-cn-chengdu.aliyuncs.com/20260425224119523.png"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            {isEditingProjectName ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingProjectName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingProjectName(false);
                  if (e.key === "Escape") setIsEditingProjectName(false);
                }}
                autoFocus
                className={`w-36 px-2 py-1 rounded-lg text-sm font-medium border-0 outline-none bg-transparent ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
                placeholder="项目名称..."
              />
            ) : (
              <button
                onClick={() => setIsEditingProjectName(true)}
                className={`text-sm font-medium max-w-[140px] truncate transition-colors ${
                  isDark
                    ? "text-gray-200 hover:text-white"
                    : "text-gray-800 hover:text-black"
                }`}
              >
                {projectName}
              </button>
            )}
          </div>
        </div>

        <div className="absolute top-4 right-4 z-50 flex items-start gap-2">
          <div className="relative group">
            <div
              className={`flex items-center gap-1 px-2 py-1.5 rounded-2xl backdrop-blur-xl border transition-all cursor-pointer ${
                isDark
                  ? "bg-[#18181b]/90 border-zinc-800 shadow-xl"
                  : "bg-white/90 border-gray-200 shadow-lg"
              }`}
            >
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isDark
                    ? "text-gray-400 hover:text-white hover:bg-white/5"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                title="社区"
              >
                <Icons.User size={15} />
                <span>社区</span>
              </button>
            </div>
            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 rounded-2xl backdrop-blur-xl border shadow-xl transition-all opacity-0 invisible group-hover:opacity-100 group-hover:visible ${isDark ? "bg-[#18181b]/95 border-zinc-800" : "bg-white/95 border-gray-200"}`}
            >
              <div
                className={`text-sm font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
              >
                社区
              </div>
              <div
                className={`p-3 rounded-xl border ${isDark ? "border-zinc-800 bg-zinc-800/30" : "border-gray-100 bg-gray-50"}`}
              >
                <div
                  className={`text-xs font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  微信群
                </div>
                <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src="https://lxj-picgo.oss-cn-chengdu.aliyuncs.com/20260425151212856.png"
                    alt="微信群二维码"
                    className="w-full h-auto"
                  />
                </div>
                <p className={`text-[11px] text-gray-500 mt-2 text-center`}>
                  扫码加入微信群，获取更多福利
                </p>
              </div>
              <a
                href="https://ucnuixcl6oxb.feishu.cn/share/base/form/shrcnqq90Z3wS7Y2wntCGrTnIpG"
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isDark
                    ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20"
                    : "bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200"
                }`}
              >
                <Icons.MessageCircle size={14} />
                <span>意见反馈</span>
              </a>
            </div>
          </div>

          <div className="relative">
            <div
              className={`flex items-center gap-1 px-2 py-1.5 rounded-2xl backdrop-blur-xl border transition-all ${
                isDark
                  ? "bg-[#18181b]/90 border-zinc-800 shadow-xl"
                  : "bg-white/90 border-gray-200 shadow-lg"
              }`}
            >
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  showAIPanel
                    ? isDark
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-yellow-50 text-yellow-600"
                    : isDark
                      ? "text-gray-400 hover:text-white hover:bg-white/5"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                title="AI 助手"
              >
                <Icons.Sparkles size={15} />
                <span>AI 助手</span>
              </button>
              <div
                className={`w-px h-5 ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}
              />
              <button
                onClick={() => setIsExportImportOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isDark
                    ? "text-gray-400 hover:text-white hover:bg-white/5"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icons.Folder size={15} />
                <span>项目</span>
              </button>
              <div
                className={`w-px h-5 ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}
              />
              <button
                onClick={() => toggleTheme(!isDark)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isDark
                    ? "text-gray-400 hover:text-white hover:bg-white/5"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {isDark ? <Icons.Moon size={15} /> : <Icons.Sun size={15} />}
                <span>{isDark ? "暗色" : "亮色"}</span>
              </button>
              <button
                onClick={handleNewWorkflow}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isDark
                    ? "text-gray-400 hover:text-white hover:bg-white/5"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <span>清空</span>
              </button>
              <div
                className={`w-px h-5 ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}
              />
              <button
                onClick={() => setIsStorageOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  storageDirName
                    ? isDark
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : "text-emerald-600 hover:bg-emerald-50"
                    : isDark
                      ? "text-gray-400 hover:text-white hover:bg-white/5"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icons.FolderOpen size={15} />
                <span>存储</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isDark
                    ? "text-gray-400 hover:text-white hover:bg-white/5"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icons.Settings size={15} />
                <span>API 设置</span>
              </button>
            </div>
            {showAIPanel && (
              <div
                className={`absolute top-full right-0 mt-2 w-80 p-4 rounded-2xl backdrop-blur-xl border shadow-xl animate-in slide-in-from-top-2 duration-200 ${isDark ? "bg-[#18181b]/95 border-zinc-800" : "bg-white/95 border-gray-200"}`}
              >
                <div
                  className={`text-sm font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  AI 助手快捷键
                </div>
                <div className="space-y-3">
                  {[
                    ["快速生图", "添加节点 → 输入提示词 → 点击生成"],
                    ["快速生视频", "添加视频节点 → 连接图片节点 → 生成"],
                    ["节点连接", "拖拽节点端口 → 连接到下一个节点"],
                  ].map(([title, desc]) => (
                    <div
                      key={title}
                      className={`p-3 rounded-xl border ${isDark ? "border-zinc-800 bg-zinc-800/30" : "border-gray-100 bg-gray-50"}`}
                    >
                      <div
                        className={`text-xs font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                      >
                        {title}
                      </div>
                      <div className="text-[11px] text-gray-500">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <ContextMenu
          contextMenu={contextMenu}
          isDark={isDark}
          nodes={nodes}
          internalClipboard={internalClipboard}
          onCopy={performCopy}
          onPaste={performPaste}
          onDelete={deleteNode}
          onAddNode={addNode}
          onReplaceImage={triggerReplaceImage}
          onCopyImageToClipboard={copyImageToClipboard}
          onGroup={() => handleGroup(selectedNodeIds)}
          onUnGroup={handleUnGroup}
          selectedNodeIds={selectedNodeIds}
          onClose={() => setContextMenu(null)}
        />
        <AIPanel
          isOpen={showAIPanel}
          onClose={() => setShowAIPanel(false)}
          isDark={isDark}
        />
        <QuickAddMenu
          quickAddMenu={quickAddMenu}
          isDark={isDark}
          onAddNode={handleQuickAddNode}
        />
        <NewWorkflowDialog
          isOpen={showNewWorkflowDialog}
          isDark={isDark}
          onCancel={() => setShowNewWorkflowDialog(false)}
          onConfirm={handleConfirmNew}
        />
        <PreviewMedia
          previewMedia={previewMedia}
          onClose={() => setPreviewMedia(null)}
        />
        <Minimap
          nodes={nodes}
          transform={transform}
          containerWidth={containerRef.current?.clientWidth || 800}
          containerHeight={containerRef.current?.clientHeight || 600}
          isDark={isDark}
        />
        <ToastContainer
          toasts={toasts}
          isDark={isDark}
          onRemove={removeToast}
        />
      </div>
    </div>
  );
};

export default App;
