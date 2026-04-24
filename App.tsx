import React, { useRef, useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import { NodeData, Connection, CanvasTransform, Point, DragMode, NodeType } from './types';
import BaseNode from './components/Nodes/BaseNode';
import { NodeContent } from './components/Nodes/NodeContent';
import { Icons } from './components/Icons';
import { generateCreativeDescription, generateImage, generateVideo } from './services/geminiService';
import { indexedDbService } from './services/indexedDbService';
import Minimap from './components/Minimap';
import { SettingsModal } from './components/Settings/SettingsModal';
import { StorageModal } from './components/Settings/StorageModal';
import { ExportImportModal } from './components/Settings/ExportImportModal';
import { WelcomeModal, hasShownWelcome } from './components/Settings/WelcomeModal';
import { AIPanel } from './components/AIPanel';
import { toPng } from 'html-to-image';
import { useHistory } from './hooks/useHistory';
import { useAutoSave, useLoadWorkflow } from './hooks/useAutoSave';
import { useKeyboardShortcuts, deleteSelectedNodesHelper } from './hooks/useKeyboardShortcuts';
import { useCanvasState } from './hooks/useCanvasState';
import { ConnectionRenderer, SelectionBox, PreviewMedia } from './renderers';
import { NewWorkflowDialog, ContextMenu, QuickAddMenu } from './dialogs';
import { validateWorkflow } from './services/workflowValidator';
import {
  DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, ZOOM_MIN, ZOOM_MAX,
  generateId, calculateImportDimensions,
  getDefaultNodeSize, getDefaultNodeConfig, WORKFLOW_STORAGE_KEY
} from './services/canvasConstants';


const App: React.FC = () => {
  return <CanvasWithSidebar />;
};

const CanvasWithSidebar: React.FC = () => {
  // 核心画布状态 — 从 useCanvasState hook 提取
  const {
    nodes, setNodes,
    connections, setConnections,
    transform, setTransform,
    selectedNodeIds, setSelectedNodeIds,
    dragMode, setDragMode,
    hoveredConnectionId, setHoveredConnectionId,
    currentMode, setCurrentMode,
    canvasBg, setCanvasBg,
    projectName, setProjectName,
    selectionBox, setSelectionBox,
    selectedConnectionId, setSelectedConnectionId,
    isDark,
    inputsMap,
    getInputImages,
    screenToWorld,
  } = useCanvasState();

  const dragModeRef = useRef(dragMode);
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const saveToHistoryRef = useRef<(nodes: NodeData[], connections: Connection[]) => void>(undefined as any);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showCommunityPanel, setShowCommunityPanel] = useState(false);
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
  
  // 首次加载时显示社区气泡
  useEffect(() => {
    setShowCommunityPanel(true);
    const timer = setTimeout(() => {
      setShowCommunityPanel(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  const [showZoomPanel, setShowZoomPanel] = useState(false);
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => !hasShownWelcome());
  const [storageDirName, setStorageDirName] = useState<string | null>(null);
  const [deletedNodes, setDeletedNodes] = useState<NodeData[]>([]);
  const [showStorageWarning, setShowStorageWarning] = useState(true);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [quickAddMenu, setQuickAddMenu] = useState<{ sourceId: string; x: number; y: number; worldX: number; worldY: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: 'CANVAS' | 'NODE';
    nodeId?: string;
    nodeType?: NodeType;
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const [internalClipboard, setInternalClipboard] = useState<{ nodes: NodeData[]; connections: Connection[] } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; w?: number; h?: number; nodeId?: string }>({ x: 0, y: 0 });
  const initialTransformRef = useRef<CanvasTransform>({ x: 0, y: 0, k: 1 });
  const initialNodePositionsRef = useRef<{ id: string; x: number; y: number }[]>([]);
  const connectionStartRef = useRef<{ nodeId: string; type: 'source' | 'target' } | null>(null);
  const [tempConnection, setTempConnection] = useState<Point | null>(null);
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 });
  const workflowInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const replaceImageRef = useRef<HTMLInputElement>(null);
  const nodeToReplaceRef = useRef<string | null>(null);
  const [suggestedNodes, setSuggestedNodes] = useState<NodeData[]>([]);
  const spacePressed = useRef(false);

  const { history, historyIndex, saveToHistory, handleUndo, handleRedo, setInitialHistory } = useHistory();

  useLoadWorkflow(setNodes, setConnections, setTransform, setProjectName, setInitialHistory);

  useAutoSave({ nodes, connections, transform, projectName });

  useEffect(() => {
    dragModeRef.current = dragMode;
  }, [dragMode]);

  useEffect(() => {
    nodesRef.current = nodes;
    connectionsRef.current = connections;
    saveToHistoryRef.current = saveToHistory;
  }, [nodes, connections, saveToHistory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const sora2Key = `API_CONFIG_MODEL_Sora 2`;
        const stored = localStorage.getItem(sora2Key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.endpoint === '/v1/chat/completions') {
            localStorage.removeItem(sora2Key);
          }
        }
      } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
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
      const { storageService } = await import('./services/storageService');
      const name = await storageService.getDownloadDirectoryName();
      setStorageDirName(name);
    };
    loadStorageInfo();
    const handleGlobalMouseUp = () => {
      if (dragModeRef.current !== 'NONE') {
        // 拖拽/Resize 结束时保存历史（画布外释放鼠标的场景）
        if (dragModeRef.current === 'DRAG_NODE' || dragModeRef.current === 'RESIZE_NODE') {
          const startRef = dragStartRef.current;
          const hasMoved = startRef.x !== 0 || startRef.y !== 0;
          if (hasMoved && nodesRef.current && connectionsRef.current) {
            saveToHistoryRef.current(nodesRef.current, connectionsRef.current);
          }
        }
        setDragMode('NONE');
        setTempConnection(null);
        connectionStartRef.current = null;
        dragStartRef.current = { x: 0, y: 0 };
        setSuggestedNodes([]);
        setSelectionBox(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isStorageOpen]);

  const handleSelectMode = useCallback(() => {
    setCurrentMode('select');
    setDragMode('NONE');
  }, []);

  const handlePanMode = useCallback(() => {
    setCurrentMode('pan');
    setDragMode('PAN');
  }, []);

  const getZoomStep = (currentK: number) => 0.08 * (currentK / 1);

  const handleZoomIn = useCallback(() => {
    setTransform(prev => {
      const step = getZoomStep(prev.k);
      const newK = Math.min(prev.k + step, ZOOM_MAX);
      const container = containerRef.current;
      if (!container) return { ...prev, k: newK };
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const worldX = (centerX - prev.x) / prev.k;
      const worldY = (centerY - prev.y) / prev.k;
      return { x: centerX - worldX * newK, y: centerY - worldY * newK, k: newK };
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => {
      const step = getZoomStep(prev.k);
      const newK = Math.max(prev.k - step, ZOOM_MIN);
      const container = containerRef.current;
      if (!container) return { ...prev, k: newK };
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const worldX = (centerX - prev.x) / prev.k;
      const worldY = (centerY - prev.y) / prev.k;
      return { x: centerX - worldX * newK, y: centerY - worldY * newK, k: newK };
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    if (nodes.length === 0) {
      setTransform({ x: 0, y: 0, k: 1 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });
    const container = containerRef.current;
    if (!container) {
      setTransform({ x: 0, y: 0, k: 1 });
      return;
    }
    const padding = 50;
    const scaleX = (container.clientWidth - padding * 2) / (maxX - minX);
    const scaleY = (container.clientHeight - padding * 2) / (maxY - minY);
    const newScale = Math.min(scaleX, scaleY, 1);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setTransform({
      x: container.clientWidth / 2 - centerX * newScale,
      y: container.clientHeight / 2 - centerY * newScale,
      k: newScale
    });
  }, [nodes]);

  const handleAlign = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (selectedNodeIds.size < 2) return;
    saveToHistory(nodes, connections);
    setNodes(prevNodes => {
      const selected = prevNodes.filter(n => selectedNodeIds.has(n.id));
      const unselected = prevNodes.filter(n => !selectedNodeIds.has(n.id));
      const updatedNodes = selected.map(n => ({ ...n }));
      const isVerticalAlign = direction === 'UP' || direction === 'DOWN';
      const OVERLAP_THRESHOLD = 10;
      const isOverlap = (a: NodeData, b: NodeData) => {
        if (isVerticalAlign) {
          const overlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          return overlap > OVERLAP_THRESHOLD;
        } else {
          const overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
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
      const minTop = Math.min(...updatedNodes.map(n => n.y));
      const maxBottom = Math.max(...updatedNodes.map(n => n.y + n.height));
      const minLeft = Math.min(...updatedNodes.map(n => n.x));
      const maxRight = Math.max(...updatedNodes.map(n => n.x + n.width));
      const HORIZONTAL_GAP = 20;
      const VERTICAL_GAP = 60;
      clusters.forEach(cluster => {
        if (direction === 'UP') {
          cluster.sort((a, b) => (a.y - b.y) || a.id.localeCompare(b.id));
          let currentY = minTop;
          cluster.forEach(node => { node.y = currentY; currentY += node.height + VERTICAL_GAP; });
        } else if (direction === 'DOWN') {
          cluster.sort((a, b) => (b.y - a.y) || a.id.localeCompare(b.id));
          let currentBottom = maxBottom;
          cluster.forEach(node => { node.y = currentBottom - node.height; currentBottom -= (node.height + VERTICAL_GAP); });
        } else if (direction === 'LEFT') {
          cluster.sort((a, b) => (a.x - b.x) || a.id.localeCompare(b.id));
          let currentX = minLeft;
          cluster.forEach(node => { node.x = currentX; currentX += node.width + HORIZONTAL_GAP; });
        } else if (direction === 'RIGHT') {
          cluster.sort((a, b) => (b.x - a.x) || a.id.localeCompare(b.id));
          let currentRight = maxRight;
          cluster.forEach(node => { node.x = currentRight - node.width; currentRight -= (node.width + HORIZONTAL_GAP); });
        }
      });
      return [...unselected, ...updatedNodes];
    });
  }, [selectedNodeIds, nodes, connections, saveToHistory]);

  const performCopy = () => {
    if (selectedNodeIds.size === 0) return;
    const selectedNodes = nodes.filter(n => selectedNodeIds.has(n.id));
    const selectedConnections = connections.filter(c =>
      selectedNodeIds.has(c.sourceId) && selectedNodeIds.has(c.targetId)
    );
    setInternalClipboard({ nodes: selectedNodes, connections: selectedConnections });
  };

  const performPaste = (targetPos: Point) => {
    if (!internalClipboard || internalClipboard.nodes.length === 0) return;
    const { nodes: clipboardNodes, connections: clipboardConnections } = internalClipboard;
    let minX = Infinity, minY = Infinity;
    clipboardNodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
    });
    const idMap = new Map<string, string>();
    const newNodes: NodeData[] = [];
    clipboardNodes.forEach(node => {
      const newId = generateId();
      idMap.set(node.id, newId);
      newNodes.push({
        ...node,
        id: newId,
        x: targetPos.x + (node.x - minX),
        y: targetPos.y + (node.y - minY),
        title: node.title.endsWith('(Copy)') ? node.title : `${node.title} (Copy)`,
        isLoading: false,
      });
    });
    const newConnections: Connection[] = clipboardConnections.map(c => ({
      id: generateId(),
      sourceId: idMap.get(c.sourceId)!,
      targetId: idMap.get(c.targetId)!
    }));
    saveToHistory(nodes, connections);
    setNodes(prev => [...prev, ...newNodes]);
    setConnections(prev => [...prev, ...newConnections]);
    setSelectedNodeIds(new Set(newNodes.map(n => n.id)));
  };

  const addNode = (type: NodeType, x?: number, y?: number, dataOverride?: Partial<NodeData>) => {
    if (x === undefined || y === undefined) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const center = screenToWorld(rect.width / 2, rect.height / 2);
        x = center.x - DEFAULT_NODE_WIDTH / 2;
        y = center.y - DEFAULT_NODE_HEIGHT / 2;
      } else {
        x = 0; y = 0;
      }
    }
    const { width, height } = getDefaultNodeSize(type, dataOverride);
    const defaultConfig = getDefaultNodeConfig(type);
    const newNode: NodeData = {
      id: generateId(),
      type,
      x, y, width, height,
      title: dataOverride?.title || defaultConfig.title,
      aspectRatio: dataOverride?.aspectRatio || defaultConfig.aspectRatio,
      model: dataOverride?.model || defaultConfig.model,
      resolution: dataOverride?.resolution || defaultConfig.resolution,
      duration: dataOverride?.duration || defaultConfig.duration,
      count: dataOverride?.count || defaultConfig.count,
      prompt: dataOverride?.prompt || defaultConfig.prompt,
      imageSrc: dataOverride?.imageSrc,
      videoSrc: dataOverride?.videoSrc,
      outputArtifacts: dataOverride?.outputArtifacts || (dataOverride?.imageSrc || dataOverride?.videoSrc ? [dataOverride.imageSrc || dataOverride.videoSrc!] : [])
    };
    saveToHistory(nodes, connections);
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeIds(new Set([newNode.id]));
  };

  const handleQuickAddNode = (type: NodeType) => {
    if (!quickAddMenu) return;
    const { width, height } = getDefaultNodeSize(type);
    const defaultConfig = getDefaultNodeConfig(type);
    const newNode: NodeData = {
      id: generateId(),
      type,
      x: quickAddMenu.worldX,
      y: quickAddMenu.worldY - height / 2,
      width, height,
      title: defaultConfig.title,
      aspectRatio: defaultConfig.aspectRatio,
      model: defaultConfig.model,
      resolution: defaultConfig.resolution,
      duration: defaultConfig.duration,
      count: defaultConfig.count,
      prompt: defaultConfig.prompt,
      outputArtifacts: []
    };
    saveToHistory(nodes, connections);
    setNodes(prev => [...prev, newNode]);
    setConnections(prev => [...prev, { id: generateId(), sourceId: quickAddMenu.sourceId, targetId: newNode.id }]);
    setQuickAddMenu(null);
  };

  const updateNodeData = useCallback((id: string, updates: Partial<NodeData>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const saveAssetToIndexedDB = async (nodeId: string, url: string, type: 'image' | 'video') => {
    try {
      if (url.startsWith('data:')) {
        await indexedDbService.saveAsset('current', {
          id: `${nodeId}_${Date.now()}`,
          url, type, data: url
        });
      } else if (url.startsWith('blob:')) {
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Data = e.target?.result as string;
          await indexedDbService.saveAsset('current', {
            id: `${nodeId}_${Date.now()}`,
            url, type, data: base64Data
          });
        };
        reader.readAsDataURL(blob);
      }
    } catch (e) {
      console.warn('[App] 保存资产到IndexedDB失败:', e);
    }
  };

  const handleGenerate = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    updateNodeData(nodeId, { isLoading: true });
    const inputs = getInputImages(nodeId);
    try {
      if (node.type === NodeType.CREATIVE_DESC) {
        const res = await generateCreativeDescription(node.prompt || '', node.model === 'TEXT_TO_VIDEO' ? 'VIDEO' : 'IMAGE');
        updateNodeData(nodeId, { optimizedPrompt: res, isLoading: false });
      } else {
        let results: string[] = [];
        if (node.type === NodeType.TEXT_TO_IMAGE) {
          results = await generateImage(
            node.prompt || '', node.aspectRatio, node.model, node.resolution, node.count || 1, inputs, node.promptOptimize
          );
        } else if (node.type === NodeType.TEXT_TO_VIDEO) {
          results = await generateVideo(
            node.prompt || '', inputs, node.aspectRatio, node.model, node.resolution, node.duration, node.count || 1, node.promptOptimize
          );
        } else if (node.type === NodeType.START_END_TO_VIDEO) {
          const modelWithFL = (node.model || 'Sora 2') + '_FL';
          const orderedInputs = node.swapFrames && inputs.length >= 2 ? [inputs[1], inputs[0]] : inputs;
          results = await generateVideo(
            node.prompt || '', orderedInputs, node.aspectRatio, modelWithFL, node.resolution, node.duration, node.count || 1, node.promptOptimize
          );
        } else if (node.type === NodeType.TEXT_TO_AUDIO) {
          const { generateAudio } = await import('./services/geminiService');
          results = await generateAudio(
            node.prompt || '', node.model, node.duration || '30s', node.style || 'pop'
          );
        }
        if (results.length > 0) {
          const currentArtifacts = node.outputArtifacts || [];
          if (node.imageSrc && !currentArtifacts.includes(node.imageSrc)) currentArtifacts.push(node.imageSrc);
          if (node.videoSrc && !currentArtifacts.includes(node.videoSrc)) currentArtifacts.push(node.videoSrc);
          const newArtifacts = [...results, ...currentArtifacts];
          const updates: Partial<NodeData> = { isLoading: false, outputArtifacts: newArtifacts };
          if (node.type === NodeType.TEXT_TO_IMAGE) {
            updates.imageSrc = results[0];
            updates.annotations = [];
            updates.annotatedImageSrc = undefined;
            updates.isAnnotating = false;
            await saveAssetToIndexedDB(nodeId, results[0], 'image');
          } else if (node.type === NodeType.TEXT_TO_VIDEO || node.type === NodeType.START_END_TO_VIDEO) {
            updates.videoSrc = results[0];
            await saveAssetToIndexedDB(nodeId, results[0], 'video');
          } else if (node.type === NodeType.TEXT_TO_AUDIO) {
            updates.audioSrc = results[0];
          }
          updateNodeData(nodeId, updates);
        } else {
          throw new Error("未返回结果");
        }
      }
    } catch (e) {
      console.error(e);
      alert(`生成失败: ${(e as Error).message}`);
      updateNodeData(nodeId, { isLoading: false });
    }
  };

  // 多角度生成处理
  const handleAngleGenerate = async (nodeId: string, params: any) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const H_LABELS: Record<number, string> = {
      0: '正面', 45: '右前方', 90: '右侧', 135: '右后方',
      180: '背面', 225: '左后方', 270: '左侧', 315: '左前方',
    };
    const getVLabel = (v: number) => {
      if (v <= -30) return '仰视';
      if (v <= 0) return '平视';
      if (v <= 30) return '俯视';
      return '鸟瞰';
    };
    const ZOOM_LABELS: Record<number, string> = { 0: '全景', 5: '中景', 10: '近景', 15: '特写' };

    const hLabel = H_LABELS[params.horizontalAngle] || `${params.horizontalAngle}°`;
    const vLabel = getVLabel(params.verticalAngle);
    const zLabel = ZOOM_LABELS[params.zoom] || '全景';

    const anglePrompt = `从${hLabel}${vLabel}的角度重新创作，${zLabel}视角。`;
    const fullPrompt = params.includePrompt && node.prompt
      ? `${anglePrompt} 原始描述：${node.prompt}`
      : anglePrompt;

    const inputImage = node.annotatedImageSrc || node.imageSrc;
    const inputs = inputImage ? [inputImage] : [];

    updateNodeData(nodeId, { isLoading: true });

    try {
      const results = await generateImage(
        anglePrompt, node.aspectRatio, node.model, node.resolution, params.count || 1, inputs, node.promptOptimize
      );

      if (results.length > 0) {
        const currentArtifacts = node.outputArtifacts || [];
        if (node.imageSrc && !currentArtifacts.includes(node.imageSrc)) currentArtifacts.push(node.imageSrc);
        const newArtifacts = [...results, ...currentArtifacts];
        updateNodeData(nodeId, {
          isLoading: false,
          imageSrc: results[0],
          outputArtifacts: newArtifacts,
          annotations: [],
          annotatedImageSrc: undefined,
          isAngleEditing: false,
        });
        await saveAssetToIndexedDB(nodeId, results[0], 'image');
      } else {
        throw new Error("未返回结果");
      }
    } catch (e) {
      console.error(e);
      alert(`生成失败: ${(e as Error).message}`);
      updateNodeData(nodeId, { isLoading: false });
    }
  };

  // 灯光生成处理
  const handleLightGenerate = async (nodeId: string, params: any) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const getElevationLabel = (e: number) => {
      if (e <= -60) return '正下方';
      if (e <= -30) return '下方';
      if (e <= 10) return '水平';
      if (e <= 45) return '上方';
      if (e <= 80) return '斜上方';
      return '正上方';
    };

    const mainAz = params.mainLight.azimuth;
    const mainEl = getElevationLabel(params.mainLight.elevation);
    const mainIntensity = params.mainLight.intensity;
    const mainColor = params.mainLight.color;

    let lightPrompt = `主光：${mainAz}°${mainEl}，强度${mainIntensity}%，${mainColor}色光`;

    if (params.fillLight?.enabled) {
      const fillAz = params.fillLight.azimuth;
      const fillEl = getElevationLabel(params.fillLight.elevation);
      lightPrompt += ` | 辅光：${fillAz}°${fillEl}，强度${params.fillLight.intensity}%，${params.fillLight.color}光`;
    }

    const fullPrompt = params.includePrompt && node.prompt
      ? `${lightPrompt}。原始描述：${node.prompt}`
      : lightPrompt;

    const inputImage = node.annotatedImageSrc || node.imageSrc;
    const inputs = inputImage ? [inputImage] : [];

    updateNodeData(nodeId, { isLoading: true });

    try {
      const results = await generateImage(
        fullPrompt, node.aspectRatio, node.model, node.resolution, params.count || 1, inputs, node.promptOptimize
      );

      if (results.length > 0) {
        const currentArtifacts = node.outputArtifacts || [];
        if (node.imageSrc && !currentArtifacts.includes(node.imageSrc)) currentArtifacts.push(node.imageSrc);

        if (results.length > 1) {
          const newArtifacts = [results[0], ...currentArtifacts];
          updateNodeData(nodeId, {
            isLoading: false,
            imageSrc: results[0],
            outputArtifacts: newArtifacts,
            annotations: [],
            annotatedImageSrc: undefined,
            isLightEditing: false,
          });
          await saveAssetToIndexedDB(nodeId, results[0], 'image');

          const gap = 30;
          const newNodeSize = 300;
          const spacing = newNodeSize + gap;
          const cols = Math.ceil(Math.sqrt(results.length - 1));
          const extraNodes: NodeData[] = [];
          const extraConns: Connection[] = [];

          for (let i = 1; i < results.length; i++) {
            const newNodeId = `node_${Date.now()}_${i}`;
            const r = Math.floor((i - 1) / cols);
            const c = (i - 1) % cols;
            extraNodes.push({
              id: newNodeId,
              type: NodeType.ORIGINAL_IMAGE,
              x: node.x + node.width + gap + 60 + c * spacing,
              y: node.y + r * spacing,
              width: newNodeSize,
              height: newNodeSize,
              title: `灯光 #${i + 1}`,
              imageSrc: results[i],
              outputArtifacts: [results[i]],
            });
            extraConns.push({
              id: generateId(),
              sourceId: nodeId,
              targetId: newNodeId,
            });
          }

          setNodes(prev => [...prev, ...extraNodes]);
          setConnections(prev => [...prev, ...extraConns]);

          for (let i = 1; i < results.length; i++) {
            await saveAssetToIndexedDB(extraNodes[i - 1].id, results[i], 'image');
          }
        } else {
          updateNodeData(nodeId, {
            isLoading: false,
            imageSrc: results[0],
            outputArtifacts: [results[0], ...currentArtifacts],
            annotations: [],
            annotatedImageSrc: undefined,
            isLightEditing: false,
          });
          await saveAssetToIndexedDB(nodeId, results[0], 'image');
        }
      } else {
        throw new Error("未返回结果");
      }
    } catch (e) {
      console.error(e);
      alert(`生成失败: ${(e as Error).message}`);
      updateNodeData(nodeId, { isLoading: false });
    }
  };

  // 宫格切分创建节点
  const handleGridSplitCreateNodes = (sourceNodeId: string, cells: { dataUrl: string; label: string; row?: number; col?: number }[]) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    // 计算新节点的尺寸（保持与源节点同比例）
    const newNodeSize = 300;
    const gap = 30;
    const spacing = newNodeSize + gap;

    // 找出最大行列以确定网格
    let maxRow = 0, maxCol = 0;
    cells.forEach(cell => {
      if (cell.row !== undefined && cell.col !== undefined) {
        maxRow = Math.max(maxRow, cell.row);
        maxCol = Math.max(maxCol, cell.col);
      }
    });

    const newNodes: NodeData[] = [];
    const newConns: Connection[] = [];

    cells.forEach((cell, index) => {
      const newNodeId = `node_${Date.now()}_${index}`;
      
      let x: number, y: number;
      if (cell.row !== undefined && cell.col !== undefined) {
        // 按行列位置排列：在源节点右侧，按网格布局
        x = sourceNode.x + sourceNode.width + gap + 60 + cell.col * spacing;
        y = sourceNode.y + cell.row * spacing;
      } else {
        // 无行列信息时按索引从上到下排列
        const cols = maxCol + 1 || Math.ceil(Math.sqrt(cells.length));
        const r = Math.floor(index / cols);
        const c = index % cols;
        x = sourceNode.x + sourceNode.width + gap + 60 + c * spacing;
        y = sourceNode.y + r * spacing;
      }

      newNodes.push({
        id: newNodeId,
        type: NodeType.ORIGINAL_IMAGE,
        x,
        y,
        width: newNodeSize,
        height: newNodeSize,
        title: cell.label,
        imageSrc: cell.dataUrl,
      });

      newConns.push({
        id: `conn_${Date.now()}_${index}`,
        sourceId: sourceNodeId,
        targetId: newNodeId,
      });
    });

    setNodes(prev => [...prev, ...newNodes]);
    setConnections(prev => [...prev, ...newConns]);
  };

  const handleMaximize = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    // 优先使用带标注的烘焙图
    const displaySrc = node.annotatedImageSrc || node.imageSrc;
    if (node.videoSrc) setPreviewMedia({ url: node.videoSrc, type: 'video' });
    else if (displaySrc) setPreviewMedia({ url: displaySrc, type: 'image' });
    else alert("没有可预览的内容");
  };

  const copyImageToClipboard = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    // 优先复制带标注的烘焙图
    const src = node?.annotatedImageSrc || node?.imageSrc;
    if (src) {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob as Blob })]);
        alert("图片已复制到剪贴板");
      } catch (e) { console.error(e); alert("复制图片失败"); }
    }
  };

  const triggerReplaceImage = (nodeId: string) => {
    nodeToReplaceRef.current = nodeId;
    replaceImageRef.current?.click();
  };

  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const nodeId = nodeToReplaceRef.current;
    if (file && nodeId) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            const { width, height, ratio } = calculateImportDimensions(img.width, img.height);
            const src = event.target?.result as string;
            const currentArtifacts = node.outputArtifacts || [];
            const newArtifacts = [src, ...currentArtifacts];
            updateNodeData(nodeId, {
              imageSrc: src, width, height,
              aspectRatio: `${ratio}:1`,
              outputArtifacts: newArtifacts,
              // 清除旧标注（新图片不再适用旧标注）
              annotations: [],
              annotatedImageSrc: undefined,
              isAnnotating: false,
            });
            await saveAssetToIndexedDB(nodeId, src, 'image');
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    if (replaceImageRef.current) replaceImageRef.current.value = '';
    nodeToReplaceRef.current = null;
  };

  const handleSaveWorkflow = () => {
    const workflowData = { nodes, connections, transform, projectName, version: "1.0" };
    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim() || '未命名项目';
    link.download = `${safeName}.aistudio-flow`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNewWorkflow = () => setShowNewWorkflowDialog(true);

  const handleConfirmNew = async (shouldSave: boolean) => {
    if (shouldSave) handleSaveWorkflow();
    const withContent = nodes.filter(n => n.imageSrc || n.videoSrc);
    if (withContent.length > 0) setDeletedNodes(prev => [...prev, ...withContent]);
    setNodes([]);
    setConnections([]);
    setTransform({ x: 0, y: 0, k: 1 });
    setProjectName('未命名项目');
    setShowNewWorkflowDialog(false);
    setSelectedNodeIds(new Set());
    setSelectionBox(null);
    await indexedDbService.deleteWorkflow('current');
  };

  const handleLoadWorkflow = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawData = JSON.parse(event.target?.result as string);
        const result = validateWorkflow(rawData);
        if (!result.valid) {
          alert(`工作流文件校验失败:\n${result.errors.join('\n')}`);
          return;
        }
        if (result.errors.length > 0) {
          console.warn('[App] 工作流导入部分数据有问题:', result.errors);
        }
        setNodes(result.data!.nodes);
        setConnections(result.data!.connections);
        if (result.data!.transform) setTransform(result.data!.transform);
        if (result.data!.projectName) setProjectName(result.data!.projectName);
      } catch (err) { console.error(err); alert("Invalid workflow file"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownload = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    // 优先下载带标注的烘焙图
    const url = node.videoSrc || node.annotatedImageSrc || node.imageSrc;
    if (!url) { alert("No content to download."); return; }
    const ext = node.videoSrc ? 'mp4' : 'png';
    const filename = `${node.title.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const { storageService } = await import('./services/storageService');
      const saved = await storageService.saveFile(blob, filename);
      if (saved) return;
      const blobUrl = URL.createObjectURL(blob as Blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImportAsset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const center = rect ? screenToWorld(rect.width / 2, rect.height / 2) : { x: 0, y: 0 };
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const { width, height, ratio } = calculateImportDimensions(img.width, img.height);
          const src = event.target?.result as string;
          addNode(NodeType.ORIGINAL_IMAGE, center.x - width / 2, center.y - height / 2, {
            width, height, imageSrc: src, aspectRatio: `${ratio}:1`, outputArtifacts: [src]
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const { width, height, ratio } = calculateImportDimensions(video.videoWidth, video.videoHeight);
        addNode(NodeType.ORIGINAL_IMAGE, center.x - width / 2, center.y - height / 2, {
          width, height, videoSrc: url, title: file.name, aspectRatio: `${ratio}:1`, outputArtifacts: [url]
        });
      };
      video.src = url;
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const files: File[] = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const worldPos = screenToWorld(e.clientX, e.clientY);
    files.forEach((file, index) => {
      const offsetX = index * 20; const offsetY = index * 20;
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const src = event.target?.result as string;
          const img = new Image();
          img.onload = () => {
            const { width, height, ratio } = calculateImportDimensions(img.width, img.height);
            addNode(NodeType.ORIGINAL_IMAGE, worldPos.x - width / 2 + offsetX, worldPos.y - height / 2 + offsetY, {
              width, height, imageSrc: src, aspectRatio: `${ratio}:1`, outputArtifacts: [src]
            });
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const { width, height, ratio } = calculateImportDimensions(video.videoWidth, video.videoHeight);
          addNode(NodeType.ORIGINAL_IMAGE, worldPos.x - width / 2 + offsetX, worldPos.y - height / 2 + offsetY, {
            width, height, videoSrc: url, title: file.name, aspectRatio: `${ratio}:1`, outputArtifacts: [url]
          });
        };
        video.src = url;
      }
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
    const zoomIntensity = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    let newK = transform.k + direction * zoomIntensity;
    newK = Math.min(Math.max(0.2, newK), 5);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = (e.clientX - rect.left - transform.x) / transform.k;
    const worldY = (e.clientY - rect.top - transform.y) / transform.k;
    setTransform({ x: (e.clientX - rect.left) - worldX * newK, y: (e.clientY - rect.top) - worldY * newK, k: newK });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) setContextMenu(null);
    if (quickAddMenu) setQuickAddMenu(null);
    if (selectedConnectionId) setSelectedConnectionId(null);
    if (currentMode === 'pan' || e.button === 1 || (e.button === 0 && spacePressed.current)) {
      setDragMode('PAN');
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialTransformRef.current = { ...transform };
      e.preventDefault(); return;
    }
    if (e.target === containerRef.current && e.button === 0) {
      setDragMode('SELECT');
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setSelectionBox({ x: 0, y: 0, w: 0, h: 0 });
      if (!e.shiftKey) setSelectedNodeIds(new Set());
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (contextMenu) setContextMenu(null);
    if (quickAddMenu) setQuickAddMenu(null);
    if (selectedConnectionId) setSelectedConnectionId(null);
    if (e.button === 0) {
      setDragMode('DRAG_NODE');
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      const isAlreadySelected = selectedNodeIds.has(id);
      let newSelection = new Set(selectedNodeIds);
      if (e.shiftKey) {
        isAlreadySelected ? newSelection.delete(id) : newSelection.add(id);
      } else {
        if (!isAlreadySelected) { newSelection.clear(); newSelection.add(id); }
      }
      setSelectedNodeIds(newSelection);
      initialNodePositionsRef.current = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, id: string, type: NodeType) => {
    e.stopPropagation(); e.preventDefault();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setContextMenu({ type: 'NODE', nodeId: id, nodeType: type, x: e.clientX, y: e.clientY, worldX: worldPos.x, worldY: worldPos.y });
    if (!selectedNodeIds.has(id)) setSelectedNodeIds(new Set([id]));
  };

  const getCanvasCursor = () => {
    if (dragMode === 'PAN') return 'cursor-grabbing';
    if (dragMode === 'DRAG_NODE') return 'cursor-move';
    if (dragMode === 'SELECT') return 'cursor-default';
    if (dragMode === 'CONNECT') return 'cursor-crosshair';
    if (dragMode === 'RESIZE_NODE') return 'cursor-nwse-resize';
    if (currentMode === 'pan' || spacePressed.current) return 'cursor-grab';
    return 'cursor-default';
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setContextMenu({ type: 'CANVAS', x: e.clientX, y: e.clientY, worldX: worldPos.x, worldY: worldPos.y });
  };

  const handleResizeStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation(); e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragMode('RESIZE_NODE');
    dragStartRef.current = { x: e.clientX, y: e.clientY, w: node.width, h: node.height, nodeId: nodeId };
    setSelectedNodeIds(new Set([nodeId]));
  };

  const handleConnectStart = (e: React.MouseEvent, nodeId: string, type: 'source' | 'target') => {
    e.stopPropagation(); e.preventDefault();
    connectionStartRef.current = { nodeId, type };
    setDragMode('CONNECT');
    setTempConnection(screenToWorld(e.clientX, e.clientY));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    const worldPos = screenToWorld(e.clientX, e.clientY);
    if (dragMode !== 'NONE' && e.buttons === 0) { setDragMode('NONE'); dragStartRef.current = { x: 0, y: 0 }; return; }
    if (dragMode === 'PAN') {
      setTransform({ ...initialTransformRef.current, x: initialTransformRef.current.x + (e.clientX - dragStartRef.current.x), y: initialTransformRef.current.y + (e.clientY - dragStartRef.current.y) });
    } else if (dragMode === 'DRAG_NODE') {
      const dx = (e.clientX - dragStartRef.current.x) / transform.k;
      const dy = (e.clientY - dragStartRef.current.y) / transform.k;
      setNodes(prev => prev.map(n => {
        if (selectedNodeIds.has(n.id)) {
          const initial = initialNodePositionsRef.current.find(init => init.id === n.id);
          if (initial) return { ...n, x: initial.x + dx, y: initial.y + dy };
        }
        return n;
      }));
    } else if (dragMode === 'SELECT') {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      const x = Math.min(dragStartRef.current.x, e.clientX);
      const y = Math.min(dragStartRef.current.y, e.clientY);
      const w = Math.abs(e.clientX - dragStartRef.current.x);
      const h = Math.abs(e.clientY - dragStartRef.current.y);
      setSelectionBox({ x: x - containerRect.left, y: y - containerRect.top, w, h });
      const worldStartX = (x - containerRect.left - transform.x) / transform.k;
      const worldStartY = (y - containerRect.top - transform.y) / transform.k;
      const worldWidth = w / transform.k; const worldHeight = h / transform.k;
      const newSelection = new Set<string>();
      nodes.forEach(n => {
        if (n.x < worldStartX + worldWidth && n.x + n.width > worldStartX && n.y < worldStartY + worldHeight && n.y + n.height > worldStartY) {
          newSelection.add(n.id);
        }
      });
      setSelectedNodeIds(newSelection);
    } else if (dragMode === 'CONNECT') {
      setTempConnection(worldPos);
      if (connectionStartRef.current?.type === 'source') {
        const candidates = nodes.filter(n => n.id !== connectionStartRef.current?.nodeId).filter(n => n.type !== NodeType.ORIGINAL_IMAGE)
          .map(n => ({ node: n, dist: Math.sqrt(Math.pow(worldPos.x - (n.x + n.width / 2), 2) + Math.pow(worldPos.y - (n.y + n.height / 2), 2)) }))
          .filter(item => item.dist < 500).sort((a, b) => a.dist - b.dist).slice(0, 3).map(item => item.node);
        setSuggestedNodes(candidates);
      }
    } else if (dragMode === 'RESIZE_NODE') {
      const nodeId = dragStartRef.current.nodeId;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const dx = (e.clientX - dragStartRef.current.x) / transform.k;
        let ratio = 1.33;
        if (node.aspectRatio) {
          const ar = node.aspectRatio === 'auto' ? '1:1' : node.aspectRatio;
          const [w, h] = ar.split(':').map(Number);
          if (!isNaN(w) && !isNaN(h) && h !== 0) ratio = w / h;
        } else if (node.type === NodeType.ORIGINAL_IMAGE) {
          ratio = (dragStartRef.current.w || 1) / (dragStartRef.current.h || 1);
        }
        let minWidth = 150;
        if (node.type !== NodeType.CREATIVE_DESC) {
          const limit1 = ratio >= 1 ? 400 * ratio : 400;
          minWidth = Math.max(limit1, 400);
        } else minWidth = 280;
        let newWidth = Math.max(minWidth, (dragStartRef.current.w || 0) + dx);
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, width: newWidth, height: newWidth / ratio } : n));
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragMode === 'CONNECT' && connectionStartRef.current?.type === 'source') {
      setQuickAddMenu({ sourceId: connectionStartRef.current.nodeId, x: e.clientX, y: e.clientY, worldX: screenToWorld(e.clientX, e.clientY).x, worldY: screenToWorld(e.clientX, e.clientY).y });
    }
    // 拖拽/Resize 结束时保存历史（仅在有实际位移时）
    if (dragMode === 'DRAG_NODE' || dragMode === 'RESIZE_NODE') {
      const startRef = dragStartRef.current;
      const hasMoved = startRef.x !== 0 || startRef.y !== 0;
      if (hasMoved) {
        saveToHistory(nodes, connections);
      }
    }
    if (dragMode !== 'NONE') { setDragMode('NONE'); setTempConnection(null); connectionStartRef.current = null; setSuggestedNodes([]); setSelectionBox(null); }
  };

  const createConnection = (sourceId: string, targetId: string) => {
    if (!connections.some(c => c.sourceId === sourceId && c.targetId === targetId)) {
      saveToHistory(nodes, connections);
      setConnections(prev => [...prev, { id: generateId(), sourceId, targetId }]);
    }
    setDragMode('NONE'); setTempConnection(null); connectionStartRef.current = null; setSuggestedNodes([]);
  };

  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, type: 'source' | 'target') => {
    e.stopPropagation(); e.preventDefault();
    if (dragMode === 'CONNECT' && connectionStartRef.current && connectionStartRef.current.type === 'source' && type === 'target' && connectionStartRef.current.nodeId !== nodeId) {
      createConnection(connectionStartRef.current.nodeId, nodeId);
    }
  };

  const deleteNode = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node && (node.imageSrc || node.videoSrc)) setDeletedNodes(prev => [...prev, node]);
    saveToHistory(nodes, connections);
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.sourceId !== id && c.targetId !== id));
  };

  const removeConnection = (id: string) => {
    saveToHistory(nodes, connections);
    setConnections(prev => prev.filter(c => c.id !== id));
    setSelectedConnectionId(null);
  };

  const toggleTheme = (dark: boolean) => {
    setCanvasBg(dark ? '#0B0C0E' : '#F5F7FA');
  };

  const handleScreenshot = useCallback(async () => {
    const container = containerRef.current;
    if (!container || isScreenshotting) return;
    setIsScreenshotting(true);
    try {
      const rect = container.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      const dataUrl = await toPng(container, {
        width: rect.width,
        height: rect.height,
        pixelRatio: pixelRatio,
        backgroundColor: canvasBg,
        style: { transform: 'none' },
        filter: (node: HTMLElement) => {
          if (node.classList && (
            node.classList.contains('minimap-container') ||
            node.classList.contains('absolute') && node.closest('.minimap-container')
          )) {
            return false;
          }
          return true;
        }
      });
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `token-canvas-${timestamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('[Screenshot] Failed:', err);
    } finally {
      setIsScreenshotting(false);
    }
  }, [canvasBg, isScreenshotting]);



  const handleOpenStorageSettings = () => setIsStorageOpen(true);

  const handleImportWorkflow = async (rawData: { nodes: NodeData[]; connections: Connection[]; transform?: CanvasTransform; projectName?: string }) => {
    // 校验导入数据
    const result = validateWorkflow(rawData);
    if (!result.valid) {
      alert(`导入数据校验失败:\n${result.errors.join('\n')}`);
      return;
    }
    if (result.errors.length > 0) {
      console.warn('[App] 导入部分数据有问题:', result.errors);
    }
    const data = result.data!;
    const withContent = nodes.filter(n => n.imageSrc || n.videoSrc);
    if (withContent.length > 0) setDeletedNodes(prev => [...prev, ...withContent]);
    let processedNodes = [...data.nodes];
    const resourcePromises: Promise<void>[] = [];
    const timestamp = Date.now();
    processedNodes.forEach((node, index) => {
      if (node.imageSrc && node.imageSrc.startsWith('data:')) {
        resourcePromises.push(
          (async () => {
            try {
              const assetId = `imported_img_${node.id}_${timestamp}_${index}`;
              await indexedDbService.saveAsset('current', {
                id: assetId, url: node.imageSrc, type: 'image', data: node.imageSrc
              });
            } catch (e) { }
          })()
        );
      }
      if (node.videoSrc && (node.videoSrc.startsWith('data:') || node.videoSrc.startsWith('blob:'))) {
        resourcePromises.push(
          (async () => {
            try {
              let base64Data = node.videoSrc;
              if (node.videoSrc.startsWith('blob:')) {
                try {
                  const response = await fetch(node.videoSrc);
                  const blob = await response.blob();
                  base64Data = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                } catch (e) { return; }
              }
              const assetId = `imported_vid_${node.id}_${timestamp}_${index}`;
              await indexedDbService.saveAsset('current', {
                id: assetId, url: base64Data, type: 'video', data: base64Data
              });
            } catch (e) { }
          })()
        );
      }
    });
    if (resourcePromises.length > 0) {
      try { await Promise.all(resourcePromises); } catch (e) { }
    }
    setNodes(processedNodes);
    setConnections(data.connections);
    if (data.transform) setTransform(data.transform);
    if (data.projectName) setProjectName(data.projectName);
    setSelectedNodeIds(new Set());
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      if (isInputFocused) return;
      const items = e.clipboardData?.items;
      let hasSystemMedia = false;
      const mousePos = lastMousePosRef.current;
      const worldPos = screenToWorld(mousePos.x, mousePos.y);
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i] as DataTransferItem;
          if (item.type.indexOf('image') !== -1) {
            hasSystemMedia = true;
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                  const { width, height, ratio } = calculateImportDimensions(img.width, img.height);
                  const src = event.target?.result as string;
                  addNode(NodeType.ORIGINAL_IMAGE, worldPos.x, worldPos.y, {
                    width, height, imageSrc: src, aspectRatio: `${ratio}:1`, outputArtifacts: [src]
                  });
                };
                img.src = event.target?.result as string;
              };
              reader.readAsDataURL(file);
            }
          } else if (item.type.indexOf('video') !== -1) {
            hasSystemMedia = true;
            const file = item.getAsFile();
            if (file) {
              const url = URL.createObjectURL(file);
              const video = document.createElement('video');
              video.preload = 'metadata';
              video.onloadedmetadata = () => {
                const { width, height, ratio } = calculateImportDimensions(video.videoWidth, video.videoHeight);
                addNode(NodeType.ORIGINAL_IMAGE, worldPos.x, worldPos.y, {
                  width, height, videoSrc: url, title: file.name, aspectRatio: `${ratio}:1`, outputArtifacts: [url]
                });
              };
              video.src = url;
            }
          }
        }
      }
      if (!hasSystemMedia && internalClipboard) performPaste(worldPos);
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [transform, internalClipboard]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.getAttribute('role') === 'textbox';
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput && selectedNodeIds.size > 0) {
        console.debug('[Keyboard] Delete node(s):', selectedNodeIds.size, 'target:', target.tagName);
      }
      if (!isInput) {
        if (e.key === 'v' || e.key === 'V') handleSelectMode();
        if (e.key === 'h' || e.key === 'H') handlePanMode();
        if (e.key === '[') handleZoomIn();
        if (e.key === ']') handleZoomOut();
        if (e.key === '0') handleZoomReset();
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedNodeIds.size > 0) {
            deleteSelectedNodesHelper(nodes, connections, selectedNodeIds, setNodes, setConnections, setSelectedNodeIds, setDeletedNodes, saveToHistory);
          }
          if (selectedConnectionId) {
            saveToHistory(nodes, connections);
            setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
            setSelectedConnectionId(null);
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); performCopy(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(setNodes, setConnections); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(setNodes, setConnections); }
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
          if (showCommunityPanel) setShowCommunityPanel(false);
        }
      if (e.code === 'Space') spacePressed.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') spacePressed.current = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeIds, selectedConnectionId, previewMedia, contextMenu, quickAddMenu, showNewWorkflowDialog, isSettingsOpen, isStorageOpen, isExportImportOpen, handleAlign, history, historyIndex]);

  return (
    <div className="w-full h-screen overflow-hidden flex relative font-sans text-gray-800">
      <WelcomeModal isOpen={isWelcomeOpen} onClose={() => setIsWelcomeOpen(false)} isDark={isDark} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} isDark={isDark} />
      <StorageModal isOpen={isStorageOpen} onClose={() => setIsStorageOpen(false)} isDark={isDark} />
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
        onScreenshot={handleScreenshot}
        onSelectMode={handleSelectMode}
        onPanMode={handlePanMode}
        onAlignVertical={() => handleAlign('UP')}
        onAlignHorizontal={() => handleAlign('LEFT')}
        currentMode={currentMode}
      />

      <div className="absolute bottom-4 left-4 z-50">
        <div className={`flex items-center gap-1 px-2 py-1.5 rounded-2xl backdrop-blur-xl border transition-all ${
          isDark ? 'bg-[#18181b]/90 border-zinc-800 shadow-xl' : 'bg-white/90 border-gray-200 shadow-lg'
        }`}>
          <button onClick={handleZoomOut} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} title="缩小 ([)">
            <Icons.MinusCircle size={18} />
          </button>
          <button onClick={() => setShowZoomPanel(!showZoomPanel)} className={`px-3 py-1.5 text-sm font-medium tabular-nums rounded-lg transition-all ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`}>
            {Math.round(transform.k * 100)}%
          </button>
          <button onClick={handleZoomIn} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} title="放大 (])">
            <Icons.PlusCircle size={18} />
          </button>
          <div className={`w-px h-5 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
          <button onClick={handleZoomReset} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} title="重置缩放 (0)">
            <Icons.Maximize size={16} />
          </button>
          <div className={`w-px h-5 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
          <button onClick={() => handleUndo(setNodes, setConnections)} disabled={historyIndex <= 0} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${historyIndex <= 0 ? (isDark ? 'text-zinc-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed') : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}`} title="撤销 (Ctrl+Z)">
            <Icons.RotateCcw size={16} />
          </button>
          <button onClick={() => handleRedo(setNodes, setConnections)} disabled={historyIndex >= history.length - 1} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${historyIndex >= history.length - 1 ? (isDark ? 'text-zinc-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed') : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}`} title="重做 (Ctrl+Y)">
            <Icons.RotateCw size={16} />
          </button>
          <div className={`w-px h-5 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
          <button onClick={() => setShowShortcutsPanel(!showShortcutsPanel)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-all ${showShortcutsPanel ? (isDark ? 'bg-blue-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-600') : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}`} title="快捷键">
            <Icons.Keyboard size={15} />
            <span className="text-xs">快捷键</span>
          </button>
        </div>
        {showShortcutsPanel && (
          <div className={`absolute bottom-full left-20 mb-2 w-72 p-4 rounded-2xl backdrop-blur-xl border shadow-xl animate-in slide-in-from-bottom-2 duration-200 z-[100] ${isDark ? 'bg-[#18181b]/95 border-zinc-800' : 'bg-white/95 border-gray-200'}`}>
            <div className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>快捷键</div>
            <div className="space-y-2 text-xs">
              {[
                ['选择模式', 'V'], ['移动模式', 'H'], ['放大', '['], ['缩小', ']'],
                ['重置缩放', '0'], ['上下排列', '↑/↓'], ['左右排列', '←/→'],
                ['删除', 'Delete'], ['复制', 'Ctrl+C'], ['撤销', 'Ctrl+Z'], ['重做', 'Ctrl+Y']
              ].map(([label, key]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{label}</span>
                  <kbd className={`px-2 py-1 rounded ${isDark ? 'bg-zinc-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>



      <input type="file" ref={workflowInputRef} hidden accept=".aistudio-flow,.json" onChange={handleLoadWorkflow} />
      <input type="file" ref={assetInputRef} hidden accept="image/*,video/*" onChange={handleImportAsset} />
      <input type="file" ref={replaceImageRef} hidden accept="image/*" onChange={handleReplaceImage} />
      <div
        ref={containerRef}
        className={`flex-1 w-full h-full relative grid-pattern select-none ${getCanvasCursor()}`}
        style={{
          backgroundColor: canvasBg,
          '--grid-color': isDark ? '#27272a' : '#E4E4E7'
        } as React.CSSProperties}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleCanvasContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="absolute origin-top-left will-change-transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}>
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
          {nodes.map(node => (
            <BaseNode
              key={node.id}
              data={node}
              selected={selectedNodeIds.has(node.id)}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onContextMenu={(e) => handleNodeContextMenu(e, node.id, node.type)}
              onConnectStart={(e, type) => handleConnectStart(e, node.id, type)}
              onPortMouseUp={handlePortMouseUp}
              onResizeStart={(e) => handleResizeStart(e, node.id)}
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
                isSelecting={dragMode === 'SELECT'}
                onDelete={deleteNode}
                isDark={isDark}
                onGridSplitCreateNodes={handleGridSplitCreateNodes}
                onAngleGenerate={handleAngleGenerate}
                onLightGenerate={handleLightGenerate}
              />
            </BaseNode>
          ))}
        </div>
        {dragMode === 'CONNECT' && suggestedNodes.length > 0 && lastMousePosRef.current && (
          <div className={`fixed z-50 border rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-48 pointer-events-auto ${isDark ? 'bg-[#1A1D21] border-zinc-700' : 'bg-white border-gray-200'}`} style={{ left: lastMousePosRef.current.x + 20, top: lastMousePosRef.current.y }}>
            <div className={`text-[10px] uppercase font-bold px-2 py-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Quick Connect</div>
            {suggestedNodes.map(node => (
              <button key={node.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${isDark ? 'hover:bg-zinc-800 text-gray-300 hover:text-yellow-400' : 'hover:bg-gray-100 text-gray-700 hover:text-yellow-600'}`} onClick={(e) => { e.stopPropagation(); if (connectionStartRef.current) createConnection(connectionStartRef.current.nodeId, node.id); }}>
                {node.type === NodeType.TEXT_TO_VIDEO ? <Icons.Video size={12} /> : <Icons.Image size={12} />}
                <span className="truncate">{node.title}</span>
              </button>
            ))}
          </div>
        )}
        <SelectionBox selectionBox={selectionBox} containerRef={containerRef} />

        {transform.k < 0.5 && (
          <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs backdrop-blur-xl border z-[999] pointer-events-none ${
            isDark ? 'bg-zinc-800/90 border-zinc-700 text-gray-400' : 'bg-white/90 border-gray-200 text-gray-500'
          }`}>
            按住鼠标中键或空格键拖动画布 · 滚轮缩放
          </div>
        )}

        {showStorageWarning && (
          <div className="absolute top-20 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg ${
              isDark ? 'bg-red-900/40 border-red-700/60' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-red-400 shrink-0 mt-0.5' : 'text-red-500 shrink-0 mt-0.5'}>
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className={`text-xs font-medium ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                  请先完成api设置，才能正常使用!!!<br />
                  数据仅保存在本地浏览器·换浏览器或清缓存会丢失！
                </span>
              </div>
            </div>
          </div>
        )}

        <div className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-lg text-xs backdrop-blur-xl border z-50 ${
          isDark ? 'bg-zinc-800/90 border-zinc-700 text-gray-400' : 'bg-white/90 border-gray-200 text-gray-500'
        }`}>
          {Math.round(transform.k * 100)}%
        </div>

        <div className="absolute top-4 left-4 z-50">
          <div className={`flex items-center gap-2.5 px-2 py-1.5 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
            isDark ? 'bg-[#18181b]/90 border-zinc-800 shadow-xl' : 'bg-white/90 border-gray-200 shadow-lg'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-500/20 text-yellow-600'
            }`}>
              <Icons.Coins size={16} />
            </div>
            {isEditingProjectName ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingProjectName(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingProjectName(false);
                  if (e.key === 'Escape') setIsEditingProjectName(false);
                }}
                autoFocus
                className={`w-36 px-2 py-1 rounded-lg text-sm font-medium border-0 outline-none bg-transparent ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
                placeholder="项目名称..."
              />
            ) : (
              <button
                onClick={() => setIsEditingProjectName(true)}
                className={`text-sm font-medium max-w-[140px] truncate transition-colors ${
                  isDark ? 'text-gray-200 hover:text-white' : 'text-gray-800 hover:text-black'
                }`}
              >
                {projectName}
              </button>
            )}
          </div>
        </div>

        <div className="absolute top-4 right-4 z-50 flex items-start gap-2">
          {/* 社区按钮（独立按钮） */}
          <div 
            className="relative group" 
            onMouseEnter={() => setShowCommunityPanel(true)}
            onMouseLeave={() => setShowCommunityPanel(false)}
          >
            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-2xl backdrop-blur-xl border transition-all ${
              isDark ? 'bg-[#18181b]/90 border-zinc-800 shadow-xl' : 'bg-white/90 border-gray-200 shadow-lg'
            }`}>
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`} title="社区" onClick={() => setShowCommunityPanel(!showCommunityPanel)}>
                <Icons.User size={15} />
                <span>社区</span>
              </button>
            </div>
            {showCommunityPanel && (
              <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 p-4 rounded-2xl backdrop-blur-xl border shadow-xl ${isDark ? 'bg-[#18181b]/95 border-zinc-800' : 'bg-white/95 border-gray-200'}`}>
                <div className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>社区</div>
                
                {/* 微信群二维码区域 */}
                <div className={`p-4 rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-800/30' : 'border-gray-100 bg-gray-50'}`}>
                  <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>微信群</div>
                  <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                    <img 
                      src="https://raw.githubusercontent.com/lxj5820/nano-banana/refs/heads/main/%E7%A4%BE%E7%BE%A4.png" 
                      alt="微信群二维码" 
                      className="w-full h-auto"
                    />
                  </div>
                  <p className={`text-[11px] text-gray-500 mt-2 text-center`}>扫码加入微信群，获取更多福利</p>
                </div>
              </div>
            )}
          </div>

          {/* 其他按钮 */}
          <div className="relative">
            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-2xl backdrop-blur-xl border transition-all ${
              isDark ? 'bg-[#18181b]/90 border-zinc-800 shadow-xl' : 'bg-white/90 border-gray-200 shadow-lg'
            }`}>
              <button onClick={() => setShowAIPanel(!showAIPanel)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                showAIPanel ? (isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-600') : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
              }`} title="AI 助手">
                <Icons.Sparkles size={15} />
                <span>AI 助手</span>
              </button>
              <div className={`w-px h-5 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
              <button onClick={() => setIsExportImportOpen(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}>
                <Icons.Download size={15} />
                <span>下载</span>
              </button>
              <div className={`w-px h-5 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
              <button onClick={() => toggleTheme(!isDark)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}>
                {isDark ? <Icons.Moon size={15} /> : <Icons.Sun size={15} />}
                <span>{isDark ? '暗色' : '亮色'}</span>
              </button>
              <button onClick={handleNewWorkflow} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}>
                <span>清空</span>
              </button>
              <div className={`w-px h-5 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
              <button onClick={handleOpenStorageSettings} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                storageDirName ? (isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50') : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
              }`}>
                <Icons.FolderOpen size={15} />
                <span>存储</span>
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}>
                <Icons.Settings size={15} />
                <span>API 设置</span>
              </button>
            </div>
            {showAIPanel && (
              <div className={`absolute top-full right-0 mt-2 w-80 p-4 rounded-2xl backdrop-blur-xl border shadow-xl animate-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-[#18181b]/95 border-zinc-800' : 'bg-white/95 border-gray-200'}`}>
                <div className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>AI 助手快捷键</div>
                <div className="space-y-3">
                  {[
                    ['快速生图', '添加节点 → 输入提示词 → 点击生成'],
                    ['快速生视频', '添加视频节点 → 连接图片节点 → 生成'],
                    ['节点连接', '拖拽节点端口 → 连接到下一个节点']
                  ].map(([title, desc]) => (
                    <div key={title} className={`p-3 rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-800/30' : 'border-gray-100 bg-gray-50'}`}>
                      <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{title}</div>
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
          onClose={() => setContextMenu(null)}
        />
        <AIPanel isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} isDark={isDark} />
        <QuickAddMenu quickAddMenu={quickAddMenu} isDark={isDark} onAddNode={handleQuickAddNode} />
        <NewWorkflowDialog isOpen={showNewWorkflowDialog} isDark={isDark} onCancel={() => setShowNewWorkflowDialog(false)} onConfirm={handleConfirmNew} />
        <PreviewMedia previewMedia={previewMedia} onClose={() => setPreviewMedia(null)} />
        <Minimap
          nodes={nodes}
          transform={transform}
          containerWidth={containerRef.current?.clientWidth || 800}
          containerHeight={containerRef.current?.clientHeight || 600}
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default App;