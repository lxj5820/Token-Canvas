
export enum NodeType {
  TEXT_TO_IMAGE = 'TEXT_TO_IMAGE',
  TEXT_TO_VIDEO = 'TEXT_TO_VIDEO',
  TEXT_TO_AUDIO = 'TEXT_TO_AUDIO',
  IMAGE_TO_IMAGE = 'IMAGE_TO_IMAGE',
  IMAGE_TO_VIDEO = 'IMAGE_TO_VIDEO',
  START_END_TO_VIDEO = 'START_END_TO_VIDEO',
  CREATIVE_DESC = 'CREATIVE_DESC',
  ORIGINAL_IMAGE = 'ORIGINAL_IMAGE',
}

export interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  
  // 状态
  prompt?: string;
  imageSrc?: string; // 结果或输入（活动选择）
  videoSrc?: string; // 结果（活动选择）
  audioSrc?: string; // 结果（音频）
  outputArtifacts?: string[]; // 历史/批量结果
  isLoading?: boolean;
  isStackOpen?: boolean; // 展开画廊的UI状态
  
  // 配置
  aspectRatio?: string;
  resolution?: string;
  duration?: string; // 视频时长（5s, 10s, 15s）/ 音频时长（30s, 60s, 120s）
  count?: number;
  model?: string;
  promptOptimize?: boolean; // 提示词扩展/优化开关
  swapFrames?: boolean; // 对于START_END_TO_VIDEO：交换首尾帧顺序
  style?: string; // 对于TEXT_TO_AUDIO：音乐风格
  
  // 创意描述特定
  optimizedPrompt?: string;

  // UI状态
  activeToolbarItem?: string;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface CanvasTransform {
  x: number;
  y: number;
  k: number; // Scale
}

export type DragMode = 'NONE' | 'PAN' | 'DRAG_NODE' | 'SELECT' | 'CONNECT' | 'RESIZE_NODE';

export interface Point {
  x: number;
  y: number;
}
