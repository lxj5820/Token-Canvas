import { useCallback } from "react";
import { NodeData, Connection, CanvasTransform } from "../types";
import { indexedDbService } from "../services/indexedDbService";
import { saveAssetToIndexedDB } from "../services/saveAssetToIndexedDB";
import { validateWorkflow } from "../services/workflowValidator";
import { logger } from "../services/logger";
import { storageService } from "../services/storageService";

interface UseWorkflowIOParams {
  nodes: NodeData[];
  connections: Connection[];
  transform: CanvasTransform;
  projectName: string;
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setTransform: React.Dispatch<React.SetStateAction<CanvasTransform>>;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectionBox: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; w: number; h: number } | null>
  >;
  setDeletedNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  saveToHistory: (nodes: NodeData[], connections: Connection[]) => void;
}

export const useWorkflowIO = ({
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
}: UseWorkflowIOParams) => {
  const handleSaveWorkflow = useCallback(() => {
    const workflowData = {
      nodes,
      connections,
      transform,
      projectName,
      version: "1.0",
    };
    const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName =
      projectName.replace(/[<>:"/\\|?*]/g, "_").trim() || "未命名项目";
    link.download = `${safeName}.aistudio-flow`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nodes, connections, transform, projectName]);

  const handleLoadWorkflow = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const rawData = JSON.parse(event.target?.result as string);
          const result = validateWorkflow(rawData);
          if (!result.valid) {
            alert(`工作流文件校验失败:\n${result.errors.join("\n")}`);
            return;
          }
          if (result.errors.length > 0) {
            logger.warn("[App] 工作流导入部分数据有问题:", result.errors);
          }
          setNodes(result.data!.nodes);
          setConnections(result.data!.connections);
          if (result.data!.transform) setTransform(result.data!.transform);
          if (result.data!.projectName) setProjectName(result.data!.projectName);
        } catch (err) {
          console.error(err);
          alert("Invalid workflow file");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [],
  );

  const handleConfirmNew = useCallback(
    async (shouldSave: boolean) => {
      if (shouldSave) handleSaveWorkflow();
      const withContent = nodes.filter((n) => n.imageSrc || n.videoSrc);
      if (withContent.length > 0)
        setDeletedNodes((prev) => [...prev, ...withContent]);
      setNodes([]);
      setConnections([]);
      setTransform({ x: 0, y: 0, k: 1 });
      setProjectName("未命名项目");
      setSelectedNodeIds(new Set());
      setSelectionBox(null);
      await indexedDbService.deleteWorkflow("current");
    },
    [nodes, handleSaveWorkflow],
  );

  const handleDownload = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const url = node.videoSrc || node.annotatedImageSrc || node.imageSrc;
      if (!url) {
        alert("No content to download.");
        return;
      }
      const ext = node.videoSrc ? "mp4" : "png";
      const filename = `${node.title.replace(/\s+/g, "_")}_${Date.now()}.${ext}`;
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const saved = await storageService.saveFile(blob, filename);
        if (saved) return;
        const blobUrl = URL.createObjectURL(blob as Blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [nodes],
  );

  const handleImportWorkflow = useCallback(
    async (rawData: {
      nodes: NodeData[];
      connections: Connection[];
      transform?: CanvasTransform;
      projectName?: string;
    }) => {
      const result = validateWorkflow(rawData);
      if (!result.valid) {
        alert(`导入数据校验失败:\n${result.errors.join("\n")}`);
        return;
      }
      if (result.errors.length > 0) {
        logger.warn("[App] 导入部分数据有问题:", result.errors);
      }
      const data = result.data!;
      const withContent = nodes.filter((n) => n.imageSrc || n.videoSrc);
      if (withContent.length > 0)
        setDeletedNodes((prev) => [...prev, ...withContent]);
      let processedNodes = [...data.nodes];
      const resourcePromises: Promise<void>[] = [];
      const timestamp = Date.now();
      processedNodes.forEach((node, index) => {
        // 图片资源导入（非致命，失败时记录日志并继续）
        if (node.imageSrc && node.imageSrc.startsWith("data:")) {
          resourcePromises.push(
            (async () => {
              try {
                const assetId = `imported_img_${node.id}_${timestamp}_${index}`;
                await indexedDbService.saveAsset("current", {
                  id: assetId,
                  url: node.imageSrc,
                  type: "image",
                  data: node.imageSrc,
                });
              } catch (e) {
                logger.warn(
                  `importNodesFromFile: image asset import failed for node ${node.id}`,
                  e,
                );
              }
            })(),
          );
        }

        // 视频资源导入（非致命，失败时记录日志并继续）
        if (
          node.videoSrc &&
          (node.videoSrc.startsWith("data:") ||
            node.videoSrc.startsWith("blob:"))
        ) {
          resourcePromises.push(
            (async () => {
              try {
                let base64Data = node.videoSrc!;
                if (node.videoSrc!.startsWith("blob:")) {
                  try {
                    const response = await fetch(node.videoSrc!);
                    const blob = await response.blob();
                    base64Data = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                  } catch (fetchError) {
                    // blob URL fetch failed — skip this asset, non-fatal
                    logger.warn(
                      `importNodesFromFile: blob fetch failed for node ${node.id}`,
                      fetchError,
                    );
                    return;
                  }
                }
                const assetId = `imported_vid_${node.id}_${timestamp}_${index}`;
                await indexedDbService.saveAsset("current", {
                  id: assetId,
                  url: base64Data,
                  type: "video",
                  data: base64Data,
                });
              } catch (e) {
                logger.warn(
                  `importNodesFromFile: video asset import failed for node ${node.id}`,
                  e,
                );
              }
            })(),
          );
        }
      });
      if (resourcePromises.length > 0) {
        try {
          await Promise.all(resourcePromises);
        } catch (e) {
          // Some resource imports failed — they are already logged individually;
          // this outer catch prevents the error from propagating
          logger.warn(
            "importNodesFromFile: some resource promises rejected",
            e,
          );
        }
      }
      setNodes(processedNodes);
      setConnections(data.connections);
      if (data.transform) setTransform(data.transform);
      if (data.projectName) setProjectName(data.projectName);
      setSelectedNodeIds(new Set());
    },
    [nodes],
  );

  return {
    handleSaveWorkflow,
    handleLoadWorkflow,
    handleConfirmNew,
    handleDownload,
    handleImportWorkflow,
  };
};
