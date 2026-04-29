import { useCallback, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { NodeData, Connection, NodeType } from "../types";
import {
  generateCreativeDescription,
  generateImage,
  generateVideo,
  generateAudio,
} from "../services/geminiService";
import { generateId } from "../services/canvasConstants";
import { saveAssetToIndexedDB } from "../services/saveAssetToIndexedDB";
import { logger } from "../services/logger";
import type { AngleGenerateParams } from "../components/AngleEditor";
import type { LightingGenerateParams } from "../components/LightingEditor";
import type { ExpandImageGenerateParams } from "../components/ExpandImageEditor";

interface UseGenerationParams {
  nodes: NodeData[];
  connections: Connection[];
  updateNodeData: (id: string, updates: Partial<NodeData>) => void;
  getInputImages: (nodeId: string) => string[];
  saveToHistory: (nodes: NodeData[], connections: Connection[]) => void;
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
}

export const useGeneration = ({
  nodes,
  connections,
  updateNodeData,
  getInputImages,
  saveToHistory,
  setNodes,
  setConnections,
}: UseGenerationParams) => {
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const updateNodeDataRef = useRef(updateNodeData);
  const getInputImagesRef = useRef(getInputImages);
  const saveToHistoryRef = useRef(saveToHistory);
  const setNodesRef = useRef(setNodes);
  const setConnectionsRef = useRef(setConnections);
  const generatingNodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    nodesRef.current = nodes;
    connectionsRef.current = connections;
    updateNodeDataRef.current = updateNodeData;
    getInputImagesRef.current = getInputImages;
    saveToHistoryRef.current = saveToHistory;
    setNodesRef.current = setNodes;
    setConnectionsRef.current = setConnections;
  });

  const handleGenerate = useCallback(
    async (nodeId: string) => {
      if (generatingNodesRef.current.has(nodeId)) {
        logger.warn(`handleGenerate: node ${nodeId} is already generating, skipping`);
        return;
      }

      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) {
        logger.warn(`handleGenerate: node ${nodeId} not found in nodesRef`);
        return;
      }

      generatingNodesRef.current.add(nodeId);
      flushSync(() => {
        updateNodeDataRef.current(nodeId, { isLoading: true });
      });
      const inputs = getInputImagesRef.current(nodeId);

      logger.log(`[Generate] Starting generation for node ${nodeId}, type: ${node.type}`);

      try {
        if (node.type === NodeType.CREATIVE_DESC) {
          const res = await generateCreativeDescription(
            node.prompt || "",
            node.model === "TEXT_TO_VIDEO" ? "VIDEO" : "IMAGE",
          );
          updateNodeDataRef.current(nodeId, { optimizedPrompt: res, isLoading: false });
        } else {
          let results: string[] = [];
          if (
            node.type === NodeType.TEXT_TO_IMAGE ||
            node.type === NodeType.IMAGE_TO_IMAGE
          ) {
            results = await generateImage(
              node.prompt || "",
              node.aspectRatio,
              node.model,
              node.resolution,
              node.count || 1,
              inputs,
              node.promptOptimize,
            );
          } else if (
            node.type === NodeType.TEXT_TO_VIDEO ||
            node.type === NodeType.IMAGE_TO_VIDEO
          ) {
            results = await generateVideo(
              node.prompt || "",
              inputs,
              node.aspectRatio,
              node.model,
              node.resolution,
              node.duration,
              node.count || 1,
              node.promptOptimize,
            );
          } else if (node.type === NodeType.START_END_TO_VIDEO) {
            const modelWithFL = (node.model || "Sora 2") + "_FL";
            const orderedInputs =
              node.swapFrames && inputs.length >= 2
                ? [inputs[1], inputs[0]]
                : inputs;
            results = await generateVideo(
              node.prompt || "",
              orderedInputs,
              node.aspectRatio,
              modelWithFL,
              node.resolution,
              node.duration,
              node.count || 1,
              node.promptOptimize,
            );
          } else if (node.type === NodeType.TEXT_TO_AUDIO) {
            results = await generateAudio(
              node.prompt || "",
              node.model,
              node.duration || "30s",
              node.style || "pop",
            );
          }
          if (results.length > 0) {
            const currentArtifacts = node.outputArtifacts || [];
            if (node.imageSrc && !currentArtifacts.includes(node.imageSrc))
              currentArtifacts.push(node.imageSrc);
            if (node.videoSrc && !currentArtifacts.includes(node.videoSrc))
              currentArtifacts.push(node.videoSrc);
            const newArtifacts = [...results, ...currentArtifacts];
            const updates: Partial<NodeData> = {
              isLoading: false,
              outputArtifacts: newArtifacts,
            };
            if (
              node.type === NodeType.TEXT_TO_IMAGE ||
              node.type === NodeType.IMAGE_TO_IMAGE
            ) {
              updates.imageSrc = results[0];
              updates.annotations = [];
              updates.annotatedImageSrc = undefined;
              updates.isAnnotating = false;
              await saveAssetToIndexedDB(nodeId, results[0], "image");
            } else if (
              node.type === NodeType.TEXT_TO_VIDEO ||
              node.type === NodeType.IMAGE_TO_VIDEO ||
              node.type === NodeType.START_END_TO_VIDEO
            ) {
              updates.videoSrc = results[0];
              await saveAssetToIndexedDB(nodeId, results[0], "video");
            } else if (node.type === NodeType.TEXT_TO_AUDIO) {
              updates.audioSrc = results[0];
            }
            updateNodeDataRef.current(nodeId, updates);
          } else {
            throw new Error("未返回结果");
          }
        }
      } catch (e) {
        logger.error("handleGenerate failed", e);
        alert(`生成失败: ${(e as Error).message}`);
        updateNodeDataRef.current(nodeId, { isLoading: false });
      } finally {
        generatingNodesRef.current.delete(nodeId);
      }
    },
    [],
  );

  const handleAngleGenerate = useCallback(
    async (nodeId: string, params: AngleGenerateParams) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) {
        logger.warn(`handleAngleGenerate: node ${nodeId} not found`);
        return;
      }

      const H_LABELS: Record<number, string> = {
        0: "正面",
        45: "右前方",
        90: "右侧",
        135: "右后方",
        180: "背面",
        225: "左后方",
        270: "左侧",
        315: "左前方",
      };
      const getVLabel = (v: number) => {
        if (v <= -30) return "仰视";
        if (v <= 0) return "平视";
        if (v <= 30) return "俯视";
        return "鸟瞰";
      };
      const ZOOM_LABELS: Record<number, string> = {
        0: "全景",
        5: "中景",
        10: "近景",
        15: "特写",
      };

      const hLabel =
        H_LABELS[params.horizontalAngle] || `${params.horizontalAngle}°`;
      const vLabel = getVLabel(params.verticalAngle);
      const zLabel = ZOOM_LABELS[params.zoom] || "全景";

      const anglePrompt = `从${hLabel}${vLabel}的角度重新创作，${zLabel}视角。`;
      const fullPrompt =
        params.includePrompt && node.prompt
          ? `${anglePrompt} 原始描述：${node.prompt}`
          : anglePrompt;

      const inputImage = node.annotatedImageSrc || node.imageSrc;
      const inputs = inputImage ? [inputImage] : [];

      const isOriginalImage = node.type === NodeType.ORIGINAL_IMAGE;
      const count = params.count || 1;

      if (isOriginalImage) {
        updateNodeDataRef.current(nodeId, { isAngleEditing: false });

        const gap = 30;
        const newNodeSize = 300;
        const spacing = newNodeSize + gap;
        const cols = Math.ceil(Math.sqrt(count));
        const newNodeIds: string[] = [];
        const newNodes: NodeData[] = [];
        const newConns: Connection[] = [];

        for (let i = 0; i < count; i++) {
          const newNodeId = `node_${Date.now()}_${i}`;
          newNodeIds.push(newNodeId);
          const r = Math.floor(i / cols);
          const c = i % cols;
          newNodes.push({
            id: newNodeId,
            type: NodeType.TEXT_TO_IMAGE,
            x: node.x + node.width + gap + 60 + c * spacing,
            y: node.y + r * spacing,
            width: newNodeSize,
            height: newNodeSize,
            title: `角度 #${i + 1}`,
            prompt: fullPrompt,
            isLoading: true,
            model: params.model || node.model,
            aspectRatio: params.aspectRatio || node.aspectRatio,
            resolution: params.resolution || node.resolution,
          });
          newConns.push({
            id: generateId(),
            sourceId: nodeId,
            targetId: newNodeId,
          });
        }

        setNodesRef.current((prev) => [...prev, ...newNodes]);
        setConnectionsRef.current((prev) => [...prev, ...newConns]);

        try {
          const results = await generateImage(
            anglePrompt,
            params.aspectRatio || node.aspectRatio,
            params.model || node.model,
            params.resolution || node.resolution,
            count,
            inputs,
            node.promptOptimize,
          );

          if (results.length > 0) {
            for (let i = 0; i < results.length && i < newNodeIds.length; i++) {
              updateNodeDataRef.current(newNodeIds[i], {
                isLoading: false,
                imageSrc: results[i],
                outputArtifacts: [results[i]],
              });
              await saveAssetToIndexedDB(newNodeIds[i], results[i], "image");
            }
            for (let i = results.length; i < newNodeIds.length; i++) {
              updateNodeDataRef.current(newNodeIds[i], { isLoading: false });
            }
          } else {
            throw new Error("未返回结果");
          }
        } catch (e) {
          logger.error("handleAngleGenerate: batch generate failed", e);
          alert(`生成失败: ${(e as Error).message}`);
          for (const nid of newNodeIds) {
            updateNodeDataRef.current(nid, { isLoading: false });
          }
        }
      } else {
        flushSync(() => {
          updateNodeDataRef.current(nodeId, { isLoading: true });
        });

        try {
          const results = await generateImage(
            anglePrompt,
            params.aspectRatio || node.aspectRatio,
            params.model || node.model,
            params.resolution || node.resolution,
            count,
            inputs,
            node.promptOptimize,
          );

          if (results.length > 0) {
            const currentArtifacts = node.outputArtifacts || [];
            if (node.imageSrc && !currentArtifacts.includes(node.imageSrc))
              currentArtifacts.push(node.imageSrc);
            const newArtifacts = [...results, ...currentArtifacts];
            updateNodeDataRef.current(nodeId, {
              isLoading: false,
              imageSrc: results[0],
              outputArtifacts: newArtifacts,
              annotations: [],
              annotatedImageSrc: undefined,
              isAngleEditing: false,
            });
            await saveAssetToIndexedDB(nodeId, results[0], "image");
          } else {
            throw new Error("未返回结果");
          }
        } catch (e) {
          logger.error("handleAngleGenerate: single generate failed", e);
          alert(`生成失败: ${(e as Error).message}`);
          updateNodeDataRef.current(nodeId, { isLoading: false });
        }
      }
    },
    [],
  );

  const handleLightGenerate = useCallback(
    async (nodeId: string, params: LightingGenerateParams) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) {
        logger.warn(`handleLightGenerate: node ${nodeId} not found`);
        return;
      }

      const getElevationLabel = (e: number) => {
        if (e <= -60) return "正下方";
        if (e <= -30) return "下方";
        if (e <= 10) return "水平";
        if (e <= 45) return "上方";
        if (e <= 80) return "斜上方";
        return "正上方";
      };

      const mainAz = params.mainLight.azimuth;
      const mainEl = getElevationLabel(params.mainLight.elevation);
      const mainIntensity = params.mainLight.intensity;
      const mainColor = params.mainLight.color;

      let lightPrompt = `重新打光图像，使其呈现设定的效果。保持主体和构图完全不变，但彻底改变光照，灯光参数为：主光：${mainAz}°${mainEl}，强度${mainIntensity}%，${mainColor}色光`;

      if (params.fillLight?.enabled) {
        const fillAz = params.fillLight.azimuth;
        const fillEl = getElevationLabel(params.fillLight.elevation);
        lightPrompt += ` | 辅光：${fillAz}°${fillEl}，强度${params.fillLight.intensity}%，${params.fillLight.color}光`;
      }

      const fullPrompt =
        params.includePrompt && node.prompt
          ? `${lightPrompt}。原始描述：${node.prompt}`
          : lightPrompt;

      const inputImage = node.annotatedImageSrc || node.imageSrc;
      const inputs = inputImage ? [inputImage] : [];

      const isOriginalImage = node.type === NodeType.ORIGINAL_IMAGE;
      const count = params.count || 1;

      if (isOriginalImage) {
        updateNodeDataRef.current(nodeId, { isLightEditing: false });

        const gap = 30;
        const newNodeSize = 300;
        const spacing = newNodeSize + gap;
        const cols = Math.ceil(Math.sqrt(count));
        const newNodeIds: string[] = [];
        const newNodes: NodeData[] = [];
        const newConns: Connection[] = [];

        for (let i = 0; i < count; i++) {
          const newNodeId = `node_${Date.now()}_${i}`;
          newNodeIds.push(newNodeId);
          const r = Math.floor(i / cols);
          const c = i % cols;
          newNodes.push({
            id: newNodeId,
            type: NodeType.TEXT_TO_IMAGE,
            x: node.x + node.width + gap + 60 + c * spacing,
            y: node.y + r * spacing,
            width: newNodeSize,
            height: newNodeSize,
            title: `灯光 #${i + 1}`,
            prompt: fullPrompt,
            isLoading: true,
            model: params.model || node.model,
            aspectRatio: params.aspectRatio || node.aspectRatio,
            resolution: params.resolution || node.resolution,
          });
          newConns.push({
            id: generateId(),
            sourceId: nodeId,
            targetId: newNodeId,
          });
        }

        setNodesRef.current((prev) => [...prev, ...newNodes]);
        setConnectionsRef.current((prev) => [...prev, ...newConns]);

        try {
          const results = await generateImage(
            fullPrompt,
            params.aspectRatio || node.aspectRatio,
            params.model || node.model,
            params.resolution || node.resolution,
            count,
            inputs,
            node.promptOptimize,
          );

          if (results.length > 0) {
            for (let i = 0; i < results.length && i < newNodeIds.length; i++) {
              updateNodeDataRef.current(newNodeIds[i], {
                isLoading: false,
                imageSrc: results[i],
                outputArtifacts: [results[i]],
              });
              await saveAssetToIndexedDB(newNodeIds[i], results[i], "image");
            }
            for (let i = results.length; i < newNodeIds.length; i++) {
              updateNodeDataRef.current(newNodeIds[i], { isLoading: false });
            }
          } else {
            throw new Error("未返回结果");
          }
        } catch (e) {
          logger.error("handleLightGenerate: batch generate failed", e);
          alert(`生成失败: ${(e as Error).message}`);
          for (const nid of newNodeIds) {
            updateNodeDataRef.current(nid, { isLoading: false });
          }
        }
      } else {
        flushSync(() => {
          updateNodeDataRef.current(nodeId, { isLoading: true });
        });

        try {
          const results = await generateImage(
            fullPrompt,
            params.aspectRatio || node.aspectRatio,
            params.model || node.model,
            params.resolution || node.resolution,
            count,
            inputs,
            node.promptOptimize,
          );

          if (results.length > 0) {
            const currentArtifacts = node.outputArtifacts || [];
            if (node.imageSrc && !currentArtifacts.includes(node.imageSrc))
              currentArtifacts.push(node.imageSrc);

            if (results.length > 1) {
              const newArtifacts = [results[0], ...currentArtifacts];
              updateNodeDataRef.current(nodeId, {
                isLoading: false,
                imageSrc: results[0],
                outputArtifacts: newArtifacts,
                annotations: [],
                annotatedImageSrc: undefined,
                isLightEditing: false,
              });
              await saveAssetToIndexedDB(nodeId, results[0], "image");

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
                  type: NodeType.TEXT_TO_IMAGE,
                  x: node.x + node.width + gap + 60 + c * spacing,
                  y: node.y + r * spacing,
                  width: newNodeSize,
                  height: newNodeSize,
                  title: `灯光 #${i + 1}`,
                  prompt: fullPrompt,
                  imageSrc: results[i],
                  outputArtifacts: [results[i]],
                  model: params.model || node.model,
                  aspectRatio: params.aspectRatio || node.aspectRatio,
                  resolution: params.resolution || node.resolution,
                });
                extraConns.push({
                  id: generateId(),
                  sourceId: nodeId,
                  targetId: newNodeId,
                });
              }

              setNodesRef.current((prev) => [...prev, ...extraNodes]);
              setConnectionsRef.current((prev) => [...prev, ...extraConns]);

              for (let i = 1; i < results.length; i++) {
                await saveAssetToIndexedDB(
                  extraNodes[i - 1].id,
                  results[i],
                  "image",
                );
              }
            } else {
              updateNodeDataRef.current(nodeId, {
                isLoading: false,
                imageSrc: results[0],
                outputArtifacts: [results[0], ...currentArtifacts],
                annotations: [],
                annotatedImageSrc: undefined,
                isLightEditing: false,
              });
              await saveAssetToIndexedDB(nodeId, results[0], "image");
            }
          } else {
            throw new Error("未返回结果");
          }
        } catch (e) {
          logger.error("handleLightGenerate: single generate failed", e);
          alert(`生成失败: ${(e as Error).message}`);
          updateNodeDataRef.current(nodeId, { isLoading: false });
        }
      }
    },
    [],
  );

  const handleGridSplitCreateNodes = useCallback(
    (
      sourceNodeId: string,
      cells: { dataUrl: string; label: string; row?: number; col?: number }[],
    ) => {
      const sourceNode = nodesRef.current.find((n) => n.id === sourceNodeId);
      if (!sourceNode) {
        logger.warn(`handleGridSplitCreateNodes: node ${sourceNodeId} not found`);
        return;
      }
      const newNodeSize = 300;
      const gap = 30;
      const spacing = newNodeSize + gap;

      let maxRow = 0,
        maxCol = 0;
      cells.forEach((cell) => {
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
          x = sourceNode.x + sourceNode.width + gap + 60 + cell.col * spacing;
          y = sourceNode.y + cell.row * spacing;
        } else {
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

      setNodesRef.current((prev) => [...prev, ...newNodes]);
      setConnectionsRef.current((prev) => [...prev, ...newConns]);
    },
    [],
  );

  const handleCrop = useCallback(
    (nodeId: string, dataUrl: string, outputWidth: number, outputHeight: number) => {
      const sourceNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!sourceNode) {
        logger.warn(`handleCrop: node ${nodeId} not found`);
        return;
      }

      updateNodeDataRef.current(nodeId, { isCropEditing: false });

      const newNodeId = `node_${Date.now()}`;
      const gap = 30;

      const newNode: NodeData = {
        id: newNodeId,
        type: NodeType.ORIGINAL_IMAGE,
        x: sourceNode.x + sourceNode.width + gap + 60,
        y: sourceNode.y,
        width: 300,
        height: 300,
        title: `裁剪 #${Date.now() % 1000}`,
        imageSrc: dataUrl,
      };

      const newConn: Connection = {
        id: generateId(),
        sourceId: nodeId,
        targetId: newNodeId,
      };

      setNodesRef.current((prev) => [...prev, newNode]);
      setConnectionsRef.current((prev) => [...prev, newConn]);

      saveAssetToIndexedDB(newNodeId, dataUrl, "image");
    },
    [],
  );

  const handleExpandImageGenerate = useCallback(
    async (nodeId: string, params: ExpandImageGenerateParams) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) {
        logger.warn(`handleExpandImageGenerate: node ${nodeId} not found`);
        return;
      }

      // 使用参考图作为输入，如果没有参考图则使用原始图片
      const inputImage = params.referenceImage || node.annotatedImageSrc || node.imageSrc;
      const inputs = inputImage ? [inputImage] : [];
      const count = params.count || 1;

      const directions: string[] = [];
      if (params.expandTop > 0) directions.push("上方");
      if (params.expandBottom > 0) directions.push("下方");
      if (params.expandLeft > 0) directions.push("左侧");
      if (params.expandRight > 0) directions.push("右侧");

      let expandPrompt = "扩展图像，保持主体和构图完全不变";
      if (directions.length > 0) {
        expandPrompt += `，向${directions.join("、")}方向自然扩展内容`;
      }
      if (params.outputWidth > 0 && params.outputHeight > 0) {
        expandPrompt += `，目标尺寸${params.outputWidth}×${params.outputHeight}`;
      }

      const fullPrompt =
        params.includePrompt && params.prompt
          ? `${expandPrompt}。原始描述：${params.prompt}`
          : expandPrompt;

      updateNodeDataRef.current(nodeId, { isExpandImageEditing: false });

      // 计算节点大小 - 与手动创建的生图节点一致
      const parseRatio = (ratio: string): number => {
        if (ratio === "原比例") return 1;
        const parts = ratio.split(":").map(Number);
        return parts[0] / parts[1];
      };
      
      const ratio = parseRatio(params.aspectRatio);
      const baseSize = 400;
      let nodeWidth: number, nodeHeight: number;
      
      if (ratio >= 1) {
        nodeHeight = baseSize;
        nodeWidth = Math.round(baseSize * ratio);
      } else {
        nodeWidth = baseSize;
        nodeHeight = Math.round(baseSize / ratio);
      }

      const gap = 30;
      const cols = Math.ceil(Math.sqrt(count));
      const newNodeIds: string[] = [];
      const newNodes: NodeData[] = [];
      const newConns: Connection[] = [];

      for (let i = 0; i < count; i++) {
        const newNodeId = `node_${Date.now()}_${i}`;
        newNodeIds.push(newNodeId);
        const r = Math.floor(i / cols);
        const c = i % cols;
        newNodes.push({
          id: newNodeId,
          type: NodeType.TEXT_TO_IMAGE,
          x: node.x + node.width + gap + 60 + c * (nodeWidth + gap),
          y: node.y + r * (nodeHeight + gap),
          width: nodeWidth,
          height: nodeHeight,
          title: `扩图 #${i + 1}`,
          prompt: fullPrompt,
          isLoading: true,
          model: params.model || node.model || "Banana 2",
          aspectRatio: params.aspectRatio,
          resolution: params.resolution,
          outputArtifacts: [],
        });
        newConns.push({
          id: generateId(),
          sourceId: nodeId,
          targetId: newNodeId,
        });
      }

      setNodesRef.current((prev) => [...prev, ...newNodes]);
      setConnectionsRef.current((prev) => [...prev, ...newConns]);

      try {
        const results = await generateImage(
          fullPrompt,
          params.aspectRatio,
          params.model || node.model || "Banana 2",
          params.resolution,
          count,
          inputs,
          node.promptOptimize,
        );

        if (results.length > 0) {
          for (let i = 0; i < results.length && i < newNodeIds.length; i++) {
            updateNodeDataRef.current(newNodeIds[i], {
              isLoading: false,
              imageSrc: results[i],
              outputArtifacts: [results[i]],
            });
            await saveAssetToIndexedDB(newNodeIds[i], results[i], "image");
          }
          for (let i = results.length; i < newNodeIds.length; i++) {
            updateNodeDataRef.current(newNodeIds[i], { isLoading: false });
          }
        } else {
          throw new Error("未返回结果");
        }
      } catch (e) {
        logger.error("handleExpandImageGenerate: batch generate failed", e);
        alert(`生成失败: ${(e as Error).message}`);
        for (const nid of newNodeIds) {
          updateNodeDataRef.current(nid, { isLoading: false });
        }
      }
    },
    [],
  );

  return {
    handleGenerate,
    handleAngleGenerate,
    handleLightGenerate,
    handleGridSplitCreateNodes,
    handleCrop,
    handleExpandImageGenerate,
  };
};
