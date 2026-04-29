import type { IModelHandler } from "./types";
import {
  IMAGE_HANDLERS,
  BananaHandler,
  Flux2Handler,
} from "./image/configurations";
import {
  VIDEO_HANDLERS,
  Sora2Handler,
  KlingStandardHandler,
} from "./video/configurations";
import { AUDIO_HANDLERS, SunoHandler } from "./audio/configurations";

export * from "./image/configurations";
export * from "./video/configurations";
export * from "./audio/configurations";
export * from "./image/rules";
export * from "./video/rules";

export type { IModelHandler as ModelHandler } from "./types";

export {
  IMAGE_HANDLERS,
  BananaHandler,
  Flux2Handler,
  VIDEO_HANDLERS,
  Sora2Handler,
  KlingStandardHandler,
  AUDIO_HANDLERS,
  SunoHandler,
};

type AnyHandler = IModelHandler<any>;

const TEXT_HANDLER: AnyHandler = {
  rules: {},
  generate: async () => {
    throw new Error("Text generation is not implemented in mode handlers");
  },
};

export const TEXT_HANDLERS: Record<string, AnyHandler> = {
  Default: TEXT_HANDLER,
};

export const CHAT_HANDLERS: Record<string, AnyHandler> = {
  Default: TEXT_HANDLER,
};

export const getGenericHandler = (type: string): AnyHandler => {
  if (isImageModel(type)) return BananaHandler;
  if (isVideoModel(type)) return Sora2Handler;
  if (isAudioModel(type)) return SunoHandler;
  return TEXT_HANDLER;
};

export const getModelHandler = (
  modelName: string,
  modelType: string,
): AnyHandler => {
  if (isImageModel(modelType)) {
    return IMAGE_HANDLERS[modelName] || getGenericHandler(modelType);
  }
  if (isVideoModel(modelType)) {
    return VIDEO_HANDLERS[modelName] || getGenericHandler(modelType);
  }
  if (isAudioModel(modelType)) {
    return AUDIO_HANDLERS[modelName] || getGenericHandler(modelType);
  }
  if (isChatModel(modelType)) {
    return CHAT_HANDLERS[modelName] || getGenericHandler(modelType);
  }
  return TEXT_HANDLERS[modelName] || getGenericHandler(modelType);
};

export const checkModelCapability = (
  modelName: string,
  capability: string,
): boolean => {
  const handler =
    IMAGE_HANDLERS[modelName] ||
    VIDEO_HANDLERS[modelName] ||
    AUDIO_HANDLERS[modelName];
  if (!handler) return false;

  switch (capability) {
    case "imageInput":
      return Boolean(handler.rules?.supportsEdit);
    case "promptOptimize":
      return Boolean(handler.rules?.hasPromptExtend);
    default:
      return false;
  }
};

export const isImageModel = (modelType: string): boolean =>
  modelType === "IMAGE_GEN" ||
  modelType === "BANANA_EDIT_ASYNC" ||
  modelType === "MJ_MODAL" ||
  modelType === "MJ_ACTION";

export const isVideoModel = (modelType: string): boolean =>
  [
    "VIDEO_GEN",
    "VIDEO_GEN_STD",
    "VIDEO_GEN_CHAT",
    "VIDEO_GEN_FORM",
    "VIDEO_GEN_MINIMAX",
    "KLING",
    "KLING_OMNI",
  ].includes(modelType);

export const isAudioModel = (modelType: string): boolean =>
  modelType === "AUDIO_GEN";

export const isTextModel = (modelType: string): boolean =>
  modelType === "TEXT_GEN";

export const isChatModel = (modelType: string): boolean =>
  modelType === "CHAT";
