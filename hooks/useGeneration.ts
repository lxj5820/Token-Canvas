import { useCallback } from "react";
import { NodeData, Connection, NodeType } from "../types";
import {
  generateCreativeDescription,
  generateImage,
  generateVideo,
  generateAudio,
} from "../services/geminiService";
import { generateId } from "../services/canvasConstants";
import { saveAssetToIndexedDB } from "../services/saveAssetToIndexedDB";

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
  const handleGenerate = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      updateNodeData(nodeId, { isLoading: true });
      const inputs = getInputImages(nodeId);
      try {
        if (node.type === NodeType.CREATIVE_DESC) {
          const res = await generateCreativeDescription(
            node.prompt || "",
            node.model === "TEXT_TO_VIDEO" ? "VIDEO" : "IMAGE",
          );
          updateNodeData(nodeId, { optimizedPrompt: res, isLoading: false });
        } else {
          let results: string[] = [];
          if (node.type === NodeType.TEXT_TO_IMAGE) {
            results = await generateImage(
              node.prompt || "",
              node.aspectRatio,
              node.model,
              node.resolution,
              node.count || 1,
              inputs,
              node.promptOptimize,
            );
          } else if (node.type === NodeType.TEXT_TO_VIDEO) {
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
            if (node.type === NodeType.TEXT_TO_IMAGE) {
              updates.imageSrc = results[0];
              updates.annotations = [];
              updates.annotatedImageSrc = undefined;
              updates.isAnnotating = false;
              await saveAssetToIndexedDB(nodeId, results[0], "image");
            } else if (
              node.type === NodeType.TEXT_TO_VIDEO ||
              node.type === NodeType.START_END_TO_VIDEO
            ) {
              updates.videoSrc = results[0];
              await saveAssetToIndexedDB(nodeId, results[0], "video");
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
    },
    [nodes, updateNodeData, getInputImages],
  );

  const handleAngleGenerate = useCallback(
    async (nodeId: string, params: any) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

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

      updateNodeData(nodeId, { isLoading: true });

      try {
        const results = await generateImage(
          anglePrompt,
          node.aspectRatio,
          node.model,
          node.resolution,
          params.count || 1,
          inputs,
          node.promptOptimize,
        );

        if (results.length > 0) {
          const currentArtifacts = node.outputArtifacts || [];
          if (node.imageSrc && !currentArtifacts.includes(node.imageSrc))
            currentArtifacts.push(node.imageSrc);
          const newArtifacts = [...results, ...currentArtifacts];
          updateNodeData(nodeId, {
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
        console.error(e);
        alert(`生成失败: ${(e as Error).message}`);
        updateNodeData(nodeId, { isLoading: false });
      }
    },
    [nodes, updateNodeData],
  );

  const handleLightGenerate = useCallback(
    async (nodeId: string, params: any) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

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

      let lightPrompt = `主光：${mainAz}°${mainEl}，强度${mainIntensity}%，${mainColor}色光`;

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

      updateNodeData(nodeId, { isLoading: true });

      try {
        const results = await generateImage(
          fullPrompt,
          node.aspectRatio,
          node.model,
          node.resolution,
          params.count || 1,
          inputs,
          node.promptOptimize,
        );

        if (results.length > 0) {
          const currentArtifacts = node.outputArtifacts || [];
          if (node.imageSrc && !currentArtifacts.includes(node.imageSrc))
            currentArtifacts.push(node.imageSrc);

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

            setNodes((prev) => [...prev, ...extraNodes]);
            setConnections((prev) => [...prev, ...extraConns]);

            for (let i = 1; i < results.length; i++) {
              await saveAssetToIndexedDB(
                extraNodes[i - 1].id,
                results[i],
                "image",
              );
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
            await saveAssetToIndexedDB(nodeId, results[0], "image");
          }
        } else {
          throw new Error("未返回结果");
        }
      } catch (e) {
        console.error(e);
        alert(`生成失败: ${(e as Error).message}`);
        updateNodeData(nodeId, { isLoading: false });
      }
    },
    [nodes, updateNodeData, setNodes, setConnections],
  );

  const handleGridSplitCreateNodes = useCallback(
    (
      sourceNodeId: string,
      cells: { dataUrl: string; label: string; row?: number; col?: number }[],
    ) => {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

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

      setNodes((prev) => [...prev, ...newNodes]);
      setConnections((prev) => [...prev, ...newConns]);
    },
    [nodes, setNodes, setConnections],
  );

  return {
    handleGenerate,
    handleAngleGenerate,
    handleLightGenerate,
    handleGridSplitCreateNodes,
  };
};
