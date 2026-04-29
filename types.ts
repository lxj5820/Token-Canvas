export enum NodeType {
  TEXT_TO_IMAGE = "TEXT_TO_IMAGE",
  TEXT_TO_VIDEO = "TEXT_TO_VIDEO",
  TEXT_TO_AUDIO = "TEXT_TO_AUDIO",
  IMAGE_TO_IMAGE = "IMAGE_TO_IMAGE",
  IMAGE_TO_VIDEO = "IMAGE_TO_VIDEO",
  START_END_TO_VIDEO = "START_END_TO_VIDEO",
  CREATIVE_DESC = "CREATIVE_DESC",
  ORIGINAL_IMAGE = "ORIGINAL_IMAGE",
}

export interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;

  prompt?: string;
  imageSrc?: string;
  videoSrc?: string;
  audioSrc?: string;
  outputArtifacts?: string[];
  isLoading?: boolean;
  isStackOpen?: boolean;

  aspectRatio?: string;
  resolution?: string;
  duration?: string;
  count?: number;
  model?: string;
  promptOptimize?: boolean;
  isOptimizing?: boolean;
  swapFrames?: boolean;
  style?: string;
  mode?: string;
  seed?: number;

  optimizedPrompt?: string;

  activeToolbarItem?: string;
  annotations?: AnnotationItem[];
  isAnnotating?: boolean;
  annotatedImageSrc?: string;

  gridSplit?: { rows: number; cols: number; selectedCells: string[] };

  isAngleEditing?: boolean;

  isLightEditing?: boolean;

  isCropEditing?: boolean;

  isExpandImageEditing?: boolean;
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

export type DragMode =
  | "NONE"
  | "PAN"
  | "DRAG_NODE"
  | "SELECT"
  | "CONNECT"
  | "RESIZE_NODE";

export interface Point {
  x: number;
  y: number;
}

// 标注工具类型
export type AnnotationTool = "pen" | "eraser" | "rect" | "text";

// 单条标注数据
export interface AnnotationItem {
  id: string;
  tool: AnnotationTool;
  // 画笔/橡皮：路径点集
  points?: Point[];
  // 矩形：左上角 + 宽高
  rect?: { x: number; y: number; width: number; height: number };
  // 文字：位置 + 内容
  text?: { x: number; y: number; content: string };
  // 样式
  color: string;
  strokeWidth: number;
  fontSize?: number;
}
