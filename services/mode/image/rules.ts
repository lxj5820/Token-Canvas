/**
 * 图像模型规则配置
 * 包含图像模型的能力配置和尺寸计算逻辑
 */

import { ImageModelRules } from "../types";
import { GPT_IMAGE_CONFIG } from "./gpt";

/**
 * 默认比例列表
 * 包含常用的图像比例
 */
const DEFAULT_RATIOS = [
  "auto",
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "9:16",
  "16:9",
];

const SEEDREAM_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "9:16",
  "16:9",
  "21:9",
];

const SEEDREAM_SIZE_MAP: Record<string, Record<string, Record<string, string>>> = {
  "seedream 4": {
    "1k": {
      "1:1": "1024x1024",
      "4:3": "864x1152",
      "3:4": "1152x864",
      "16:9": "1280x720",
      "9:16": "720x1280",
      "3:2": "832x1248",
      "2:3": "1248x832",
      "21:9": "1512x648",
    },
    "2k": {
      "1:1": "2048x2048",
      "4:3": "2304x1728",
      "3:4": "1728x2304",
      "16:9": "2848x1600",
      "9:16": "1600x2848",
      "3:2": "2496x1664",
      "2:3": "1664x2496",
      "21:9": "3136x1344",
    },
    "4k": {
      "1:1": "4096x4096",
      "4:3": "4704x3520",
      "3:4": "3520x4704",
      "16:9": "5504x3040",
      "9:16": "3040x5504",
      "3:2": "4992x3328",
      "2:3": "3328x4992",
      "21:9": "6240x2656",
    },
  },
  "seedream 4.5": {
    "2k": {
      "1:1": "2048x2048",
      "4:3": "2304x1728",
      "3:4": "1728x2304",
      "16:9": "2848x1600",
      "9:16": "1600x2848",
      "3:2": "2496x1664",
      "2:3": "1664x2496",
      "21:9": "3136x1344",
    },
    "4k": {
      "1:1": "4096x4096",
      "4:3": "4704x3520",
      "3:4": "3520x4704",
      "16:9": "5504x3040",
      "9:16": "3040x5504",
      "3:2": "4992x3328",
      "2:3": "3328x4992",
      "21:9": "6240x2656",
    },
  },
  "seedream 5": {
    "2k": {
      "1:1": "2048x2048",
      "4:3": "2304x1728",
      "3:4": "1728x2304",
      "16:9": "2848x1600",
      "9:16": "1600x2848",
      "3:2": "2496x1664",
      "2:3": "1664x2496",
      "21:9": "3136x1344",
    },
    "3k": {
      "1:1": "3072x3072",
      "4:3": "3456x2592",
      "3:4": "2592x3456",
      "16:9": "4096x2304",
      "9:16": "2304x4096",
      "3:2": "3744x2496",
      "2:3": "2496x3744",
      "21:9": "4704x2016",
    },
  },
};

/**
 * 图像模型能力配置
 * 定义了每个模型支持的分辨率和比例
 */
export const IMAGE_MODEL_CAPABILITIES: Record<string, ImageModelRules> = {
  BananaPro: {
    resolutions: ["1k", "2k", "4k"],
    ratios: [
      "auto",
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9",
    ],
  },
  "Banana Pro Edit": {
    resolutions: ["1k", "2k", "4k"],
    ratios: ["auto", "1:1", "3:4", "4:3", "9:16", "16:9", "21:9", "9:21"],
    supportsEdit: true,
  },
  Banana: { resolutions: ["1k"], ratios: DEFAULT_RATIOS },
  Flux2: { resolutions: ["1k", "2k"], ratios: DEFAULT_RATIOS },
  Fluxpro: { resolutions: ["1k", "2k"], ratios: DEFAULT_RATIOS },
  "seedream 4.5": { resolutions: ["2k", "4k"], ratios: SEEDREAM_RATIOS },
  "seedream 4": { resolutions: ["1k", "2k", "4k"], ratios: SEEDREAM_RATIOS },
  "seedream 5": { resolutions: ["2k", "3k"], ratios: SEEDREAM_RATIOS },
  MJ: { resolutions: ["1k"], ratios: DEFAULT_RATIOS },
  Zimage: {
    resolutions: ["1k"],
    ratios: DEFAULT_RATIOS,
    hasPromptExtend: true,
  },
  Qwenedit: { resolutions: ["1k"], ratios: DEFAULT_RATIOS },
  "kling image": { resolutions: ["1k"], ratios: DEFAULT_RATIOS },
  "gpt-image-2": {
    resolutions: GPT_IMAGE_CONFIG.supportedResolutions,
    ratios: GPT_IMAGE_CONFIG.supportedRatios,
    supportsEdit: true,
  },
  "gpt-image-2-all": {
    resolutions: GPT_IMAGE_CONFIG.supportedResolutions,
    ratios: GPT_IMAGE_CONFIG.supportedRatios,
  },
  "gpt-image-1.5": {
    resolutions: GPT_IMAGE_CONFIG.supportedResolutions,
    ratios: GPT_IMAGE_CONFIG.supportedRatios,
    supportsEdit: true,
  },
};

/**
 * 获取图像模型规则
 * @param modelName 模型名称
 * @returns 模型的规则配置
 */
export const getImageModelRules = (modelName: string): ImageModelRules => {
  // 如果找不到模型配置，返回默认配置
  return (
    IMAGE_MODEL_CAPABILITIES[modelName] || {
      resolutions: ["1k"],
      ratios: DEFAULT_RATIOS,
    }
  );
};

/**
 * 计算图像尺寸
 * @param aspectRatio 图像比例
 * @param resolution 分辨率级别
 * @param modelName 模型名称
 * @returns 计算后的图像尺寸，格式为 "宽度x高度"
 */
export const calculateImageSize = (
  aspectRatio: string,
  resolution: string,
  modelName: string,
): string => {
  if (modelName.startsWith("seedream")) {
    const modelMap = SEEDREAM_SIZE_MAP[modelName];
    if (modelMap) {
      const resMap = modelMap[resolution];
      if (resMap && resMap[aspectRatio]) {
        return resMap[aspectRatio];
      }
    }
  }

  // Zimage 模型特殊处理
  if (modelName === "Zimage" && resolution === "1k") {
    if (aspectRatio === "16:9") return "1280x720";
    if (aspectRatio === "9:16") return "720x1280";
  }

  // GPT Image 模型特殊处理
  // 支持尺寸：1024x1024、1536x1024（横版）、1024x1536（竖版）
  if (modelName.includes("gpt-image")) {
    if (aspectRatio === "auto") return "auto";
    if (aspectRatio === "1:1") return "1024x1024";
    if (aspectRatio === "3:2") return "1536x1024";
    if (aspectRatio === "4:3") return "1024x768";
    if (aspectRatio === "16:9") return "1280x720";
    if (aspectRatio === "2:3") return "1024x1536";
    if (aspectRatio === "3:4") return "768x1024";
    if (aspectRatio === "9:16") return "720x1280";
    return "1024x1024";
  }

  // Flux2 模型特殊处理
  if (modelName === "Flux2") {
    const is2k = resolution === "2k";
    if (aspectRatio === "1:1") return is2k ? "2048x2048" : "1024x1024";
    if (aspectRatio === "16:9") return is2k ? "2048x1152" : "1920x1080";
    if (aspectRatio === "9:16") return is2k ? "1152x2048" : "1080x1920";
    if (aspectRatio === "4:3") return is2k ? "2048x1536" : "1600x1200";
    if (aspectRatio === "3:4") return is2k ? "1536x2048" : "1200x1600";
    return is2k ? "2048x2048" : "1024x1024";
  }

  // Banana 系列模型 1k 分辨率特殊处理
  if (
    (modelName.includes("Banana") || modelName.includes("banana")) &&
    resolution === "1k"
  ) {
    if (aspectRatio === "16:9") return "1280x720";
    if (aspectRatio === "9:16") return "720x1280";
    if (aspectRatio === "4:3") return "1024x768";
    if (aspectRatio === "3:4") return "768x1024";
  }

  // 如果是 auto，返回 auto 让 API 决定
  if (aspectRatio === "auto") {
    return "auto";
  }

  // 通用尺寸计算逻辑
  // 1k 分辨率：约 1000 像素
  // 2k 分辨率：约 2000 像素
  // 4k 分辨率：约 4000 像素
  const baseSize =
    resolution === "1k"
      ? 1024
      : resolution === "2k"
        ? 2048
        : resolution === "3k"
          ? 3072
          : 4096;

  // 解析比例
  const [widthRatio, heightRatio] = aspectRatio.split(":").map(Number);
  if (widthRatio && heightRatio) {
    // 计算宽度和高度，保持比例
    if (widthRatio > heightRatio) {
      // 横版
      const width = baseSize;
      const height = Math.round((baseSize * heightRatio) / widthRatio);
      return `${width}x${height}`;
    } else {
      // 竖版或正方形
      const height = baseSize;
      const width = Math.round((baseSize * widthRatio) / heightRatio);
      return `${width}x${height}`;
    }
  }

  // 默认返回 1024x1024
  return "1024x1024";
};
