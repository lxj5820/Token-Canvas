import { useEffect } from "react";
import { NodeData, Connection, CanvasTransform } from "../types";
import { indexedDbService } from "../services/indexedDbService";
import { logger } from "../services/logger";

export interface UseAutoSaveOptions {
  nodes: NodeData[];
  connections: Connection[];
  transform: CanvasTransform;
  projectName: string;
  enabled?: boolean;
}

export const useAutoSave = ({
  nodes,
  connections,
  transform,
  projectName,
  enabled = true,
}: UseAutoSaveOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const saveWorkflow = async () => {
      try {
        const data = {
          nodes,
          connections,
          transform,
          projectName,
          savedAt: Date.now(),
        };
        await indexedDbService.saveWorkflow(data);
      } catch (e) {
        console.warn("[App] 保存工作流失败:", e);
      }
    };

    const timeoutId = setTimeout(saveWorkflow, 500);
    return () => clearTimeout(timeoutId);
  }, [nodes, connections, transform, projectName, enabled]);
};

const restoreBlobUrls = (
  nodes: NodeData[],
  assets: { url: string; data: string; type: string }[],
): NodeData[] => {
  const assetMap = new Map<string, string>();
  for (const asset of assets) {
    if (asset.url && asset.data) {
      assetMap.set(asset.url, asset.data);
    }
  }

  if (assetMap.size === 0) return nodes;

  let changed = false;
  const patched = nodes.map((node) => {
    const patches: Partial<NodeData> = {};
    if (node.imageSrc && node.imageSrc.startsWith("blob:")) {
      const data = assetMap.get(node.imageSrc);
      if (data) {
        patches.imageSrc = data;
        changed = true;
      }
    }
    if (node.videoSrc && node.videoSrc.startsWith("blob:")) {
      const data = assetMap.get(node.videoSrc);
      if (data) {
        patches.videoSrc = data;
        changed = true;
      }
    }
    if (node.annotatedImageSrc && node.annotatedImageSrc.startsWith("blob:")) {
      const data = assetMap.get(node.annotatedImageSrc);
      if (data) {
        patches.annotatedImageSrc = data;
        changed = true;
      }
    }
    if (node.outputArtifacts && node.outputArtifacts.length > 0) {
      const patchedArtifacts = node.outputArtifacts.map((src) => {
        if (src.startsWith("blob:")) {
          const data = assetMap.get(src);
          if (data) {
            changed = true;
            return data;
          }
        }
        return src;
      });
      if (changed) {
        patches.outputArtifacts = patchedArtifacts;
      }
    }
    return changed ? { ...node, ...patches } : node;
  });

  return patched;
};

export const useLoadWorkflow = (
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  setTransform: React.Dispatch<React.SetStateAction<CanvasTransform>>,
  setProjectName: React.Dispatch<React.SetStateAction<string>>,
  setInitialHistory: (entry: {
    nodes: NodeData[];
    connections: Connection[];
  }) => void,
) => {
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const saved = await indexedDbService.getWorkflow();
        if (saved && saved.nodes && saved.connections) {
          let nodes = saved.nodes as NodeData[];

          const hasBlobUrls = nodes.some(
            (n: NodeData) =>
              (n.imageSrc && n.imageSrc.startsWith("blob:")) ||
              (n.videoSrc && n.videoSrc.startsWith("blob:")) ||
              (n.annotatedImageSrc &&
                n.annotatedImageSrc.startsWith("blob:")) ||
              (n.outputArtifacts &&
                n.outputArtifacts.some((a: string) => a.startsWith("blob:"))),
          );

          if (hasBlobUrls) {
            try {
              const assets = await indexedDbService.getAssetsByWorkflow(
                "current",
              );
              if (assets && assets.length > 0) {
                nodes = restoreBlobUrls(nodes, assets);
                logger.debug(
                  "[useAutoSave] 已从assets存储恢复blob URL",
                );
              }
            } catch (assetErr) {
              logger.warn(
                "[useAutoSave] 从assets存储恢复blob URL失败:",
                assetErr,
              );
            }
          }

          setNodes(nodes);
          setConnections(saved.connections);
          if (saved.transform) setTransform(saved.transform);
          if (saved.projectName) setProjectName(saved.projectName);
          logger.debug("[useAutoSave] 已从IndexedDB加载工作流");
          setInitialHistory({
            nodes,
            connections: saved.connections,
          });
        }
      } catch (e) {
        console.warn("[App] 加载工作流失败:", e);
      }
    };
    loadWorkflow();
  }, []);
};
