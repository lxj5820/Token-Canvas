import type { VideoModelRules, ModelConfig, IModelHandler } from "../types";
import {
  generateGenericVideo,
  generateVeo3Video,
  generateGrokVideo,
  generateSoraVideo,
} from "./veo";
import { generateMinimaxVideo } from "./minimax";
import { generateSeedanceVideo } from "./seedance";
import { generateKlingO1Video, generateKlingStandardVideo } from "./kling";
import { generateAlibailianVideo } from "./alibailian";
import { fetchThirdParty, constructUrl } from "../network";
import { logger } from "../../logger";

// --- 基础规则 ---
const BASE_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];
const EXTENDED_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9", "21:9", "9:21"];
const DURATIONS_STD = ["5s", "10s"];
const RESOLUTIONS_STD = ["720p", "1080p"];

// --- 基于聊天的视频助手（Doubao/KlingO1）---
const generateChatVideo = async (config: ModelConfig, prompt: string) => {
  const messages = [{ role: "user", content: `Generate a video: ${prompt}` }];
  const payload = { model: config.modelId, messages, stream: false };
  const url = constructUrl(config.baseUrl, config.endpoint);
  const res = await fetchThirdParty(url, "POST", payload, config, {
    timeout: 600000,
  });
  return res.choices?.[0]?.message?.content;
};

// --- 模型特定实现 ---

export const Sora2Handler = {
  rules: {
    resolutions: ["720p", "1080p"],
    durations: ["4s", "8s", "12s"],
    ratios: ["16:9", "9:16"],
    maxInputImages: 2,
  },
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    const {
      inputImages = [],
      aspectRatio = "16:9",
      resolution = "720p",
      duration = "8s",
    } = params;

    // 映射 duration 到 Sora 的参数格式
    const durationMap: Record<string, string> = {
      "4s": "4",
      "8s": "8",
      "12s": "12",
    };
    const durationValue = durationMap[duration] || "8";

    // 映射分辨率到 Sora 的 size 参数
    const sizeMap: Record<string, string> = {
      "16:9-720p": "1280x720",
      "16:9-1080p": "1792x1024",
      "9:16-720p": "720x1280",
      "9:16-1080p": "1024x1792",
    };
    const sizeKey = `${aspectRatio}-${resolution}`;
    const sizeValue = sizeMap[sizeKey] || "1280x720";

    const messages: any[] = [];

    if (inputImages.length > 0) {
      const content: any[] = [];

      // 添加提示词
      content.push({
        type: "text",
        text: prompt || "Generate a video from these images",
      });

      // 添加图片
      inputImages.forEach((img: string) => {
        content.push({ type: "image_url", image_url: { url: img } });
      });
      messages.push({ role: "user", content });
    } else {
      const effectivePrompt = prompt || "Generate a video";
      messages.push({ role: "user", content: effectivePrompt });
    }

    // 将参数放在 payload 的顶层
    const payload: any = {
      model: cfg.modelId,
      messages,
      stream: false,
      duration: durationValue,
      size: sizeValue,
      images: inputImages.length > 0 ? inputImages : undefined,
    };

    const url = constructUrl(cfg.baseUrl, cfg.endpoint);
    logger.log("[Sora 2] Request URL:", url);
    logger.log(
      "[Sora 2] Duration input:",
      duration,
      "=> Duration value:",
      durationValue,
    );
    logger.log("[Sora 2] Size key:", sizeKey, "=> Size value:", sizeValue);
    logger.log("[Sora 2] Payload:", JSON.stringify(payload, null, 2));

    const res = await fetchThirdParty(url, "POST", payload, cfg, {
      timeout: 600000,
    });

    logger.log("[Sora 2] Response:", JSON.stringify(res, null, 2));

    const content = res.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[Sora 2] No content in response:", res);
      throw new Error("No video URL returned from Sora 2");
    }

    return content;
  },
};

// Veo 3.1 基础 Handler 生成器
const createVeoHandler = (
  baseModelId: string,
  maxInputImages: number,
  fastModelId?: string,
  componentModelId?: string,
  resolutions?: string[],
) => {
  return {
    rules: {
      resolutions: resolutions || ["720p", "1080p"],
      durations: ["8s"],
      ratios: ["16:9", "9:16"],
      maxInputImages,
    },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
      let modelId = baseModelId;
      let images = params.inputImages || [];

      // 如果有输入图片，使用适当的组件模型（如果提供了）
      if (images.length > 0 && componentModelId) {
        modelId = componentModelId;
      } else if (fastModelId) {
        modelId = fastModelId;
      }

      // 限制输入图片数量
      if (images.length > maxInputImages) {
        images = images.slice(0, maxInputImages);
      }

      const endpoint =
        cfg.endpoint && cfg.endpoint !== "/v1/video/create"
          ? cfg.endpoint
          : "/v1/video/create";
      const newCfg = { ...cfg, modelId, endpoint };
      return await generateVeo3Video(
        newCfg,
        prompt,
        params.aspectRatio,
        images,
      );
    },
  };
};

export const Veo31Handler = createVeoHandler("veo3.1", 0);
export const VeoFastHandler = createVeoHandler(
  "veo3.1-fast",
  3,
  "veo3.1-fast",
  "veo3.1-fast-components",
);
export const VeoProHandler = createVeoHandler(
  "veo3.1-pro",
  1,
  "veo3.1-pro",
  "veo3.1-components",
);
export const Veo314KHandler = createVeoHandler(
  "veo3.1-4k",
  0,
  undefined,
  undefined,
  ["720p", "1080p", "4K"],
);
export const Veo31Pro4KHandler = createVeoHandler(
  "veo3.1-pro-4k",
  0,
  undefined,
  undefined,
  ["720p", "1080p", "4K"],
);
export const Veo31FastComponentsHandler = createVeoHandler(
  "veo3.1-fast-components",
  3,
);
export const Veo31ComponentsHandler = createVeoHandler("veo3.1-components", 3);

export const HailuoHandler = {
  rules: {
    resolutions: ["768p", "1080p"],
    durations: ["6s"],
    ratios: ["16:9", "9:16", "1:1"],
    maxInputImages: 2,
    hasPromptExtend: true,
  },
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateMinimaxVideo(
      cfg,
      prompt,
      params.aspectRatio,
      params.inputImages,
      params.isStartEndMode,
      params.promptOptimize,
    );
  },
};

export const KlingO1Handler = {
  rules: {
    resolutions: ["1080p"],
    durations: ["5s", "10s"],
    ratios: ["16:9", "9:16", "1:1"],
    maxInputImages: 2,
  },
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateKlingO1Video(
      cfg,
      params.modelName || "Kling O1 Std",
      prompt,
      params.aspectRatio,
      params.resolution,
      params.duration,
      params.inputImages,
      params.isStartEndMode,
    );
  },
};

export const KlingO1StdHandler = {
  ...KlingO1Handler,
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateKlingO1Video(
      cfg,
      "Kling O1 Std",
      prompt,
      params.aspectRatio,
      params.resolution,
      params.duration,
      params.inputImages,
      params.isStartEndMode,
    );
  },
};

export const KlingO1ProHandler = {
  ...KlingO1Handler,
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateKlingO1Video(
      cfg,
      "Kling O1 Pro",
      prompt,
      params.aspectRatio,
      params.resolution,
      params.duration,
      params.inputImages,
      params.isStartEndMode,
    );
  },
};

export const KlingStandardHandler = {
  rules: {
    resolutions: ["720p", "1080p"],
    durations: ["5s", "10s"],
    ratios: ["16:9", "9:16"],
    maxInputImages: 2,
  },
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    // 备用默认值
    return await generateKlingStandardVideo(
      cfg,
      "Kling 2.5 Std",
      prompt,
      params.aspectRatio,
      params.duration,
      params.inputImages,
      params.isStartEndMode,
    );
  },
};

export const Kling25StdHandler = {
  ...KlingStandardHandler,
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateKlingStandardVideo(
      cfg,
      "Kling 2.5 Std",
      prompt,
      params.aspectRatio,
      params.duration,
      params.inputImages,
      params.isStartEndMode,
    );
  },
};

export const Kling25ProHandler = {
  ...KlingStandardHandler,
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateKlingStandardVideo(
      cfg,
      "Kling 2.5 Pro",
      prompt,
      params.aspectRatio,
      params.duration,
      params.inputImages,
      params.isStartEndMode,
    );
  },
};

export const Kling26ProNSHandler = {
  ...KlingStandardHandler,
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateKlingStandardVideo(
      cfg,
      "Kling 2.6 ProNS",
      prompt,
      params.aspectRatio,
      params.duration,
      params.inputImages,
      params.isStartEndMode,
    );
  },
};

export const Kling26ProYSHandler = {
  ...KlingStandardHandler,
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateKlingStandardVideo(
      cfg,
      "Kling 2.6 ProYS",
      prompt,
      params.aspectRatio,
      params.duration,
      params.inputImages,
      params.isStartEndMode,
    );
  },
};

export const SeedanceHandler = {
  rules: {
    resolutions: ["480p", "720p", "1080p"],
    durations: ["5s", "7s", "10s"],
    ratios: EXTENDED_RATIOS,
    maxInputImages: 2,
  },
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateSeedanceVideo(
      cfg,
      prompt,
      params.aspectRatio,
      params.resolution,
      params.duration,
      params.inputImages,
      params.isStartEndMode,
    );
  },
};

export const WanHandler = {
  rules: {
    resolutions: ["720p", "1080p", "480p"],
    durations: ["5s", "10s"],
    ratios: BASE_RATIOS,
    maxInputImages: 1,
  },
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateAlibailianVideo(
      cfg,
      prompt,
      params.resolution,
      params.duration,
      params.inputImages,
    );
  },
};

export const Grok3Handler = {
  rules: {
    resolutions: ["720p"],
    durations: ["6s"],
    ratios: ["1:1", "3:2", "2:3"],
    maxInputImages: 1,
  },
  generate: async (cfg: ModelConfig, prompt: string, params: any) => {
    return await generateGrokVideo(
      cfg,
      prompt,
      params.aspectRatio,
      params.resolution,
      params.inputImages,
    );
  },
};

export const VIDEO_HANDLERS: Record<string, IModelHandler<VideoModelRules>> = {
  "Sora 2": Sora2Handler,
  "Veo 3.1": Veo31Handler,
  "Veo 3.1 Fast": VeoFastHandler,
  "Veo 3.1 Pro": VeoProHandler,
  "Veo 3.1 4K": Veo314KHandler,
  "Veo 3.1 Pro 4K": Veo31Pro4KHandler,
  "Veo 3.1 Fast Components": Veo31FastComponentsHandler,
  "Veo 3.1 Components": Veo31ComponentsHandler,
  "海螺2.0": HailuoHandler,
  "海螺2.3": HailuoHandler,

  // Kling O1
  "Kling O1 Std": KlingO1StdHandler,
  "Kling O1 Pro": KlingO1ProHandler,

  // Kling 2.5
  "Kling 2.5 Std": Kling25StdHandler,
  "Kling 2.5 Pro": Kling25ProHandler,

  // Kling 2.6
  "Kling 2.6 ProNS": Kling26ProNSHandler,
  "Kling 2.6 ProYS": Kling26ProYSHandler,

  "即梦 3.5": SeedanceHandler,

  "Wan2.6": WanHandler,
  "Wan2.5": WanHandler,
  "Wan2.6-i2v": WanHandler,
  "Wan2.5-i2v-preview": WanHandler,

  "Grok video 3": Grok3Handler,
};
