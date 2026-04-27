import React, { memo } from "react";
import { NodeData, NodeType } from "../../types";
import { TextToImageNode } from "./TextToImageNode";
import { TextToVideoNode } from "./TextToVideoNode";
import { TextToAudioNode } from "./TextToAudioNode";
import { StartEndToVideoNode } from "./StartEndToVideoNode";
import { OriginalImageNode } from "./OriginalImageNode";
import { CreativeDescNode } from "./CreativeDescNode";
import { AngleGenerateParams } from "../AngleEditor";
import { LightingGenerateParams } from "../LightingEditor";
import { ExpandImageGenerateParams } from "../ExpandImageEditor";

interface NodeContentProps {
  data: NodeData;
  updateData: (id: string, updates: Partial<NodeData>) => void;
  onGenerate: (id: string) => void;
  selected?: boolean;
  showControls?: boolean;
  inputs?: string[];
  onMaximize?: (id: string) => void;
  onDownload?: (id: string) => void;
  onUpload?: (nodeId: string) => void;
  isSelecting?: boolean;
  onDelete?: (id: string) => void;
  isDark?: boolean;
  onGridSplitCreateNodes?: (
    sourceNodeId: string,
    cells: { dataUrl: string; label: string; row: number; col: number }[],
  ) => void;
  onAngleGenerate?: (id: string, params: AngleGenerateParams) => void;
  onLightGenerate?: (id: string, params: LightingGenerateParams) => void;
  onCrop?: (id: string, dataUrl: string, outputWidth: number, outputHeight: number) => void;
  onExpandImageGenerate?: (id: string, params: ExpandImageGenerateParams) => void;
}

const NodeContentComponent: React.FC<NodeContentProps> = (props) => {
  const { data } = props;

  switch (data.type) {
    case NodeType.TEXT_TO_IMAGE:
      return <TextToImageNode {...props} />;
    case NodeType.TEXT_TO_VIDEO:
      return <TextToVideoNode {...props} />;
    case NodeType.TEXT_TO_AUDIO:
      return <TextToAudioNode {...props} />;
    case NodeType.START_END_TO_VIDEO:
      return <StartEndToVideoNode {...props} />;
    case NodeType.IMAGE_TO_VIDEO:
    case NodeType.ORIGINAL_IMAGE:
      return <OriginalImageNode {...props} />;
    case NodeType.CREATIVE_DESC:
      return <CreativeDescNode {...props} />;
    default:
      return null;
  }
};

export const NodeContent = memo(NodeContentComponent, (prev, next) => {
  if (prev.isSelecting !== next.isSelecting) return false;
  if (prev.isDark !== next.isDark) return false;

  // 检查输入端口是否变化
  if (prev.inputs !== next.inputs) {
    if (prev.inputs?.length !== next.inputs?.length) return false;
    if (prev.inputs && next.inputs) {
      for (let i = 0; i < prev.inputs.length; i++) {
        if (prev.inputs[i] !== next.inputs[i]) return false;
      }
    }
  }

  // 检查选择状态是否变化
  if (
    prev.selected !== next.selected ||
    prev.showControls !== next.showControls
  )
    return false;

  // 检查数据是否变化，排除 X/Y 坐标
  if (prev.data === next.data) return true;

  const keys = Object.keys(prev.data) as (keyof NodeData)[];
  // 检查键名数量是否变化（罕见但可能）
  if (keys.length !== Object.keys(next.data).length) return false;

  for (const key of keys) {
    if (key === "x" || key === "y") continue;
    if (prev.data[key] !== next.data[key]) return false;
  }

  return true;
});
