import type {
  ModelConfig,
  ModelDef,
  ModelHandler,
  ModelRuleSet,
} from "./types";
import {
  GPTImage2Handler,
  GPTImage2AllHandler,
  GPTImage15Handler,
} from "./image/gpt";
import { GeminiImageHandler, GeminiImageProHandler } from "./image/gemini";
import { QwenImageHandler } from "./image/qwen";
import { DallE3Handler } from "./image/dall-e";
import { MidjourneyHandler } from "./image/midjourney";
import { Flux2Handler, FluxProHandler } from "./image/flux";
import { KlingImageHandler } from "./image/kling";

import {
  generateGenericVideo,
  generateGenericAudio,
  generateGenericText,
  generateGenericChat,
  generateGenericImage,
} from "./generic";
import { generateSoraVideo } from "./video/sora";
import {
  generateVeo3Video,
  generateVeo2Video,
  Veo2ComponentsHandler,
} from "./video/veo";
import {
  generateKlingVideo,
  generateKlingOmniVideo,
  KlingVideoHandler,
  KlingOmniVideoHandler,
} from "./video/kling";
import { generateAlibailianVideo, WanHandler } from "./video/alibailian";
import { generateMinimaxVideo } from "./video/minimax";
import { generateGrokVideo, GrokVideoHandler } from "./video/grok";

import {
  getImageModelRules,
  getVideoModelRules,
  getAudioModelRules,
} from "./rules";

// --- 图像模型处理器 ---
export const IMAGE_HANDLERS: Record<string, ModelHandler> = {
  "gpt-image-2": GPTImage2Handler,
  "gpt-image-2-all": GPTImage2AllHandler,
  "gpt-image-1.5": GPTImage15Handler,
  "Banana 2": GeminiImageHandler,
  BananaPro: GeminiImageProHandler,
  Zimage: QwenImageHandler,
  "doubao 5": QwenImageHandler, // 即梦 5
  "doubao 4.5": QwenImageHandler, // 即梦 4.5
  "doubao 4": QwenImageHandler, // 即梦 4
  MJ: MidjourneyHandler,
  Flux2: Flux2Handler,
  Fluxpro: FluxProHandler,
  "kling image": KlingImageHandler,
  "Kling Image": KlingImageHandler,
};

// --- 视频模型处理器 ---
export const VIDEO_HANDLERS: Record<string, ModelHandler> = {
  "Sora 2": {
    rules: getVideoModelRules("Sora 2"),
    generate: generateSoraVideo,
  },
  "Veo 3.1": {
    rules: getVideoModelRules("Veo 3.1"),
    generate: generateVeo3Video,
  },
  "Veo 3.1 Fast": {
    rules: getVideoModelRules("Veo 3.1 Fast"),
    generate: generateVeo3Video,
  },
  "Veo 3.1 Pro": {
    rules: getVideoModelRules("Veo 3.1 Pro"),
    generate: generateVeo3Video,
  },
  "Veo 3.1 4K": {
    rules: getVideoModelRules("Veo 3.1 4K"),
    generate: generateVeo3Video,
  },
  "Veo 3.1 Pro 4K": {
    rules: getVideoModelRules("Veo 3.1 Pro 4K"),
    generate: generateVeo3Video,
  },
  "Veo 3.1 Fast Components": {
    rules: getVideoModelRules("Veo 3.1 Fast Components"),
    generate: generateVeo3Video,
  },
  "Veo 3.1 Components": {
    rules: getVideoModelRules("Veo 3.1 Components"),
    generate: generateVeo3Video,
  },
  "Grok video 3": GrokVideoHandler,
  "Kling 2.5 Pro": KlingVideoHandler,
  "Kling O1 Pro": KlingOmniVideoHandler,
  "Wan2.6": WanHandler,
  "Wan2.5": WanHandler,
  "即梦 3.5": {
    rules: getVideoModelRules("即梦 3.5"),
    generate: generateGenericVideo,
  },
  "海螺2.0": {
    rules: getVideoModelRules("海螺2.0"),
    generate: generateMinimaxVideo,
  },
  "海螺2.3": {
    rules: getVideoModelRules("海螺2.3"),
    generate: generateMinimaxVideo,
  },
};

// --- 音频模型处理器 ---
export const AUDIO_HANDLERS: Record<string, ModelHandler> = {
  suno_music: {
    rules: getAudioModelRules("suno_music"),
    generate: generateGenericAudio,
  },
};

// --- 文本模型处理器 ---
export const TEXT_HANDLERS: Record<string, ModelHandler> = {
  Default: { rules: {}, generate: generateGenericText },
};

// --- 聊天模型处理器 ---
export const CHAT_HANDLERS: Record<string, ModelHandler> = {
  Default: { rules: {}, generate: generateGenericChat },
};

// --- 通用模型处理器 ---
export const getGenericHandler = (type: string): ModelHandler => {
  switch (type) {
    case "IMAGE_GEN":
      return {
        rules: getImageModelRules("Default"),
        generate: generateGenericImage,
      };
    case "VIDEO_GEN":
    case "VIDEO_GEN_STD":
    case "VIDEO_GEN_CHAT":
    case "VIDEO_GEN_MINIMAX":
      return {
        rules: getVideoModelRules("Default"),
        generate: generateGenericVideo,
      };
    case "AUDIO_GEN":
      return {
        rules: getAudioModelRules("Default"),
        generate: generateGenericAudio,
      };
    case "TEXT_GEN":
      return { rules: {}, generate: generateGenericText };
    case "CHAT":
      return { rules: {}, generate: generateGenericChat };
    default:
      return { rules: {}, generate: generateGenericText };
  }
};

// --- 处理器工厂 ---
export const getModelHandler = (
  modelName: string,
  modelType: string,
): ModelHandler => {
  switch (modelType) {
    case "IMAGE_GEN":
      return IMAGE_HANDLERS[modelName] || getGenericHandler("IMAGE_GEN");
    case "VIDEO_GEN":
    case "VIDEO_GEN_STD":
    case "VIDEO_GEN_CHAT":
    case "VIDEO_GEN_MINIMAX":
    case "KLING":
    case "KLING_OMNI":
    case "MJ_VIDEO":
      return VIDEO_HANDLERS[modelName] || getGenericHandler("VIDEO_GEN");
    case "AUDIO_GEN":
      return AUDIO_HANDLERS[modelName] || getGenericHandler("AUDIO_GEN");
    case "TEXT_GEN":
      return TEXT_HANDLERS[modelName] || getGenericHandler("TEXT_GEN");
    case "CHAT":
      return CHAT_HANDLERS[modelName] || getGenericHandler("CHAT");
    default:
      return getGenericHandler("TEXT_GEN");
  }
};

// --- 模型能力检查 ---
export const checkModelCapability = (
  modelName: string,
  capability: string,
): boolean => {
  const handler =
    IMAGE_HANDLERS[modelName] ||
    VIDEO_HANDLERS[modelName] ||
    AUDIO_HANDLERS[modelName];
  if (!handler) return false;

  // 检查处理器是否支持特定能力
  switch (capability) {
    case "imageInput":
      return handler.rules?.supportsEdit || false;
    case "promptOptimize":
      return handler.rules?.hasPromptExtend || false;
    default:
      return false;
  }
};

// --- 工具函数 ---
export const isImageModel = (modelType: string): boolean => {
  return modelType === "IMAGE_GEN";
};

export const isVideoModel = (modelType: string): boolean => {
  return [
    "VIDEO_GEN",
    "VIDEO_GEN_STD",
    "VIDEO_GEN_CHAT",
    "VIDEO_GEN_MINIMAX",
    "KLING",
    "KLING_OMNI",
    "MJ_VIDEO",
  ].includes(modelType);
};

export const isAudioModel = (modelType: string): boolean => {
  return modelType === "AUDIO_GEN";
};

export const isTextModel = (modelType: string): boolean => {
  return modelType === "TEXT_GEN";
};

export const isChatModel = (modelType: string): boolean => {
  return modelType === "CHAT";
};
