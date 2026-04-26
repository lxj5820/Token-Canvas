import { NodeType } from "../types";

// ==================== 画布常量 ====================

export const DEFAULT_NODE_WIDTH = 320;
export const DEFAULT_NODE_HEIGHT = 240;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 5;
export const MAX_SIDE_IMPORT = 750;
export const OVERLAP_THRESHOLD = 10;
export const HORIZONTAL_GAP = 20;
export const VERTICAL_GAP = 60;
export const WORKFLOW_STORAGE_KEY = "CANVAS_WORKFLOW_DATA";

// ==================== 工具函数 ====================

/** 生成唯一 ID */
export const generateId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    // fallback for environments without crypto.randomUUID
    return Math.random().toString(36).substring(2, 11);
  }
};

/** 根据节点类型获取默认标题 */
export const getDefaultTitle = (type: NodeType): string => {
  switch (type) {
    case NodeType.TEXT_TO_IMAGE:
      return "生图";
    case NodeType.TEXT_TO_VIDEO:
      return "生视频";
    case NodeType.TEXT_TO_AUDIO:
      return "生音频";
    case NodeType.CREATIVE_DESC:
      return "创意描述";
    default:
      return `原始图片_${Date.now()}`;
  }
};

/** 根据节点类型获取默认模型 */
export const getDefaultModel = (type: NodeType): string => {
  switch (type) {
    case NodeType.TEXT_TO_IMAGE:
      return "Banana 2";
    case NodeType.TEXT_TO_VIDEO:
      return "Sora 2";
    case NodeType.TEXT_TO_AUDIO:
      return "Suno";
    default:
      return "";
  }
};

/** 计算导入资源的尺寸（等比缩放，最大边不超过 MAX_SIDE_IMPORT） */
export const calculateImportDimensions = (
  naturalWidth: number,
  naturalHeight: number,
) => {
  const ratio = naturalWidth / naturalHeight;
  let width = naturalWidth;
  let height = naturalHeight;

  if (width > height) {
    if (width > MAX_SIDE_IMPORT) {
      width = MAX_SIDE_IMPORT;
      height = width / ratio;
    }
  } else {
    if (height > MAX_SIDE_IMPORT) {
      height = MAX_SIDE_IMPORT;
      width = height * ratio;
    }
  }
  return { width, height, ratio };
};

/** 根据节点类型获取默认尺寸 */
export const getDefaultNodeSize = (
  type: NodeType,
  dataOverride?: Partial<{ width: number; height: number }>,
) => {
  let w = dataOverride?.width || DEFAULT_NODE_WIDTH;
  let h = dataOverride?.height || DEFAULT_NODE_HEIGHT;

  if (type === NodeType.ORIGINAL_IMAGE) {
    h = dataOverride?.height || 240;
  } else if (
    type === NodeType.TEXT_TO_VIDEO ||
    type === NodeType.IMAGE_TO_VIDEO ||
    type === NodeType.START_END_TO_VIDEO
  ) {
    if (!dataOverride?.width) w = 400 * (16 / 9);
    if (!dataOverride?.height) h = 400;
  } else if (type === NodeType.TEXT_TO_AUDIO) {
    if (!dataOverride?.width) w = 320;
    if (!dataOverride?.height) h = 280;
  } else if (
    type === NodeType.TEXT_TO_IMAGE ||
    type === NodeType.IMAGE_TO_IMAGE
  ) {
    if (!dataOverride?.width) w = 400;
    if (!dataOverride?.height) h = 400;
  }

  return { width: w, height: h };
};

/** 根据节点类型获取默认配置 */
export const getDefaultNodeConfig = (type: NodeType) => {
  const isVideoType = type === NodeType.TEXT_TO_VIDEO;
  return {
    title: getDefaultTitle(type),
    model: getDefaultModel(type),
    aspectRatio: isVideoType ? "16:9" : "1:1",
    resolution: isVideoType ? "720p" : "1k",
    duration: isVideoType ? "5s" : undefined,
    count: 1,
    prompt: "",
  };
};
