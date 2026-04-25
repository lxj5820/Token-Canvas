import { useEffect } from "react";
import { NodeData, Connection, CanvasTransform } from "../types";
import { indexedDbService } from "../services/indexedDbService";

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

    // 500ms 防抖，避免拖拽时疯狂写 IndexedDB
    const timeoutId = setTimeout(saveWorkflow, 500);
    return () => clearTimeout(timeoutId);
  }, [nodes, connections, transform, projectName, enabled]);
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
          setNodes(saved.nodes);
          setConnections(saved.connections);
          if (saved.transform) setTransform(saved.transform);
          if (saved.projectName) setProjectName(saved.projectName);
          console.log("[App] 已从IndexedDB加载工作流");
          setInitialHistory({
            nodes: saved.nodes,
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
