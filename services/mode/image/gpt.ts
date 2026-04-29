import type { ModelConfig, ModelDef } from "../types";
import { fetchThirdParty, constructUrl } from "../network";
import { calculateImageSize } from "./rules";
import { logger } from "../../logger";

const toDataUrl = (
  base64Str: string,
  defaultMimeType = "image/png",
): string => {
  if (!base64Str) return "";
  if (base64Str.startsWith("data:")) return base64Str;
  return `data:${defaultMimeType};base64,${base64Str}`;
};

const GPT_IMAGE_SIZES = ["auto", "1:1", "2:3", "3:2"];

const summarizeGptImageRequest = (
  payload: Record<string, any>,
  inputImageCount: number,
) => ({
  model: payload.model,
  n: payload.n,
  size: payload.size,
  quality: payload.quality,
  background: payload.background,
  output_format: payload.output_format,
  moderation: payload.moderation,
  hasPrompt: Boolean(payload.prompt),
  inputImageCount,
});

export type GptImageQuality = "auto" | "low" | "medium" | "high";
export type GptImageBackground = "transparent" | "opaque" | "auto";
export type GptImageOutputFormat = "png" | "jpeg" | "webp";
export type GptImageModeration = "low" | "auto";

export interface GptImageOptions {
  quality?: GptImageQuality;
  background?: GptImageBackground;
  outputFormat?: GptImageOutputFormat;
  outputCompression?: number;
  moderation?: GptImageModeration;
  partialImages?: number;
  stream?: boolean;
  size?: string;
}

export interface GptImageGenerationParams {
  aspectRatio: string;
  resolution: string;
  inputImages: string[];
  count: number;
  promptOptimize?: boolean;
  options?: GptImageOptions;
}

const DEFAULT_GPT_IMAGE_OPTIONS: Required<GptImageOptions> = {
  quality: "auto",
  background: "auto",
  outputFormat: "png",
  outputCompression: 100,
  moderation: "auto",
  partialImages: 0,
  stream: false,
  size: "auto",
};

function createGptImageHandler(modelId: string) {
  return {
    rules: { resolutions: ["1k"], ratios: GPT_IMAGE_SIZES },
    generate: async (
      cfg: ModelConfig,
      prompt: string,
      params: GptImageGenerationParams,
    ) => {
      const resolvedOptions: Required<GptImageOptions> = {
        ...DEFAULT_GPT_IMAGE_OPTIONS,
        ...params.options,
      };
      const size =
        resolvedOptions.size === "auto"
          ? calculateImageSize(params.aspectRatio, params.resolution, modelId)
          : resolvedOptions.size;
      return await generateGptImage(
        cfg,
        { id: modelId, name: modelId, type: "IMAGE_GEN" } as ModelDef,
        prompt,
        params.aspectRatio,
        params.resolution,
        size,
        params.inputImages,
        params.count,
        params.promptOptimize,
        resolvedOptions,
      );
    },
  };
}

export const GPTImage2Handler = createGptImageHandler("gpt-image-2");

export const GPTImage2AllHandler = createGptImageHandler("gpt-image-2-all");

export const GPTImage15Handler = createGptImageHandler("gpt-image-1.5");

export const GPT_IMAGE_CONFIG = {
  supportedRatios: GPT_IMAGE_SIZES,
  supportedResolutions: ["1k"],
  defaultParams: {
    responseFormat: "b64_json",
    quality: "auto",
  },
  supportedQualities: ["auto", "low", "medium", "high"],
  supportedBackgrounds: ["transparent", "opaque", "auto"],
  supportedOutputFormats: ["png", "jpeg", "webp"],
  supportedSizes: ["auto", "1024x1024", "1536x1024", "1024x1536"],
  maxInputImages: 16,
  maxPartialImages: 3,
};

export const generateGptImage = async (
  config: ModelConfig,
  modelDef: ModelDef,
  prompt: string,
  aspectRatio: string,
  resolution: string,
  calculatedSize: string,
  inputImages: string[],
  n: number,
  promptOptimize?: boolean,
  options: Required<GptImageOptions> = DEFAULT_GPT_IMAGE_OPTIONS,
): Promise<string[]> => {
  const endpoint =
    config.endpoint && config.endpoint !== "/images/generations"
      ? config.endpoint
      : "/images/generations";
  const targetUrl = constructUrl(config.baseUrl, endpoint);

  const hasInputImage = inputImages.length > 0;

  const payload: Record<string, any> = {
    model: config.modelId,
    prompt: prompt,
    n: n || 1,
    size: calculatedSize,
    background: options.background,
    moderation: options.moderation,
    output_format: options.outputFormat,
    quality: options.quality,
  };

  if (
    options.outputCompression < 100 &&
    (options.outputFormat === "jpeg" || options.outputFormat === "webp")
  ) {
    payload.output_compression = options.outputCompression;
  }

  if (options.partialImages > 0) {
    payload.partial_images = Math.min(Math.max(0, options.partialImages), 3);
  }

  if (options.stream) {
    payload.stream = true;
  }

  if (hasInputImage) {
    payload.image = inputImages[0];
  }

  logger.debug(
    "[GPT Image] Creating image task",
    summarizeGptImageRequest(payload, inputImages.length),
    { url: targetUrl },
  );

  const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
    timeout: 300000,
  });

  logger.debug("[GPT Image] Response received", {
    hasDataArray: Array.isArray(res.data),
    dataCount: Array.isArray(res.data) ? res.data.length : undefined,
    hasB64Json: Boolean(res.b64_json || res.data?.b64_json),
    hasUrl: Boolean(res.url || res.image_url),
    event: res.event,
  });

  if (res.data && Array.isArray(res.data)) {
    return res.data
      .map((item: any) => {
        if (item.b64_json) return toDataUrl(item.b64_json);
        if (item.url) return item.url;
        if (item.image_url) return item.image_url;
        return "";
      })
      .filter((url: string) => !!url);
  }

  if (res.b64_json) return [toDataUrl(res.b64_json)];
  if (res.url) return [res.url];
  if (res.image_url) return [res.image_url];

  if (
    res.event &&
    res.event === "image_generation.completed" &&
    res.data?.b64_json
  ) {
    return [toDataUrl(res.data.b64_json)];
  }

  logger.error("[GPT Image] No valid response format found:", res);
  throw new Error("GPT Image API returned an unrecognized response format");
};

export interface GptImageEditParams {
  aspectRatio?: string;
  resolution?: string;
  inputImages: string[];
  count?: number;
  promptOptimize?: boolean;
  options?: GptImageOptions & { inputFidelity?: "high" | "low" };
}

export const generateGptImageEdit = async (
  config: ModelConfig,
  modelDef: ModelDef,
  prompt: string,
  inputImages: string[],
  n: number = 1,
  params?: GptImageEditParams,
): Promise<string[]> => {
  const resolvedOptions: Required<GptImageOptions> = {
    ...DEFAULT_GPT_IMAGE_OPTIONS,
    ...params?.options,
  };

  const endpoint =
    config.endpoint && config.endpoint !== "/images/edits"
      ? config.endpoint
      : "/images/edits";
  const targetUrl = constructUrl(config.baseUrl, endpoint);

  const payload: Record<string, any> = {
    model: config.modelId,
    prompt: prompt,
    images: inputImages.map((img) => ({ image_url: img })),
    n: n,
    size: "1024x1024",
    background: resolvedOptions.background,
    moderation: resolvedOptions.moderation,
    output_format: resolvedOptions.outputFormat,
    quality: resolvedOptions.quality,
  };

  if (params?.options?.inputFidelity) {
    payload.input_fidelity = params.options.inputFidelity;
  }

  if (
    resolvedOptions.outputCompression < 100 &&
    (resolvedOptions.outputFormat === "jpeg" ||
      resolvedOptions.outputFormat === "webp")
  ) {
    payload.output_compression = resolvedOptions.outputCompression;
  }

  if (resolvedOptions.partialImages > 0) {
    payload.partial_images = Math.min(
      Math.max(0, resolvedOptions.partialImages),
      3,
    );
  }

  if (resolvedOptions.stream) {
    payload.stream = true;
  }

  logger.debug(
    "[GPT Image Edit] Creating edit task",
    summarizeGptImageRequest(payload, inputImages.length),
    { url: targetUrl },
  );

  const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
    timeout: 300000,
  });

  logger.debug("[GPT Image Edit] Response received", {
    hasDataArray: Array.isArray(res.data),
    dataCount: Array.isArray(res.data) ? res.data.length : undefined,
    hasB64Json: Boolean(res.b64_json || res.data?.b64_json),
    hasUrl: Boolean(res.url || res.image_url),
    event: res.event,
  });

  if (res.data && Array.isArray(res.data)) {
    return res.data
      .map((item: any) => {
        if (item.b64_json) return toDataUrl(item.b64_json);
        if (item.url) return item.url;
        if (item.image_url) return item.image_url;
        return "";
      })
      .filter((url: string) => !!url);
  }

  if (res.b64_json) return [toDataUrl(res.b64_json)];
  if (res.url) return [res.url];
  if (res.image_url) return [res.image_url];

  if (res.event && res.event === "image_edit.completed" && res.data?.b64_json) {
    return [toDataUrl(res.data.b64_json)];
  }

  logger.error("[GPT Image Edit] No valid response format found:", res);
  throw new Error(
    "GPT Image Edit API returned an unrecognized response format",
  );
};

export const isGptImageModel = (modelId: string): boolean => {
  return modelId.includes("gpt-image");
};

export const isGptImageModelSupported = (modelId: string): boolean => {
  const supportedModels = [
    "gpt-image-1",
    "gpt-image-1-mini",
    "gpt-image-1.5",
    "gpt-image-2",
    "gpt-image-2-all",
  ];
  return supportedModels.some((m) => modelId.includes(m));
};

export const getGptImageModelDefaults = (
  modelId: string,
): Partial<GptImageOptions> => {
  if (modelId.includes("gpt-image-2") || modelId.includes("gpt-image-1.5")) {
    return {
      quality: "auto",
      background: "auto",
      outputFormat: "png",
      outputCompression: 100,
      moderation: "auto",
    };
  }
  return {
    quality: "auto",
    background: "auto",
    outputFormat: "png",
    moderation: "auto",
  };
};
