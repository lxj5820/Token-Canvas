
import type { ImageModelRules, ModelConfig } from "../types";
import { generateBananaChatImage, generateBananaEdit } from "./banana";
import { generateStandardImage, generateMjModal } from "./flux";
import { calculateImageSize } from "./rules";

// --- 基础规则配置 ---
// 基础比例列表
const BASE_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
// 扩展比例列表（包含更多比例选项）
const EXTENDED_RATIOS = ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'];
// GPT Image 模型特定尺寸
const GPT_IMAGE_SIZES = ['1:1', '16:9', '9:16'];

// --- 模型特定实现 ---

/**
 * Banana Pro 模型处理器
 * 支持 1k、2k、4k 分辨率
 * 使用基础比例列表
 */
export const BananaProHandler = {
    rules: { resolutions: ['1k', '2k', '4k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'BananaPro');
        return await generateBananaChatImage(cfg, prompt, params.aspectRatio, params.resolution, size, params.inputImages);
    }
};

/**
 * Banana 2 模型处理器
 * 支持 1k、2k、4k 分辨率
 * 使用扩展比例列表，支持图像编辑
 */
export const Banana2 = {
    rules: { resolutions: ['1k', '2k', '4k'], ratios: EXTENDED_RATIOS, supportsEdit: true },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'Banana 2');
        return await generateBananaChatImage(cfg, prompt, params.aspectRatio, params.resolution, size, params.inputImages);
    }
};

/**
 * GPT Image 2 模型处理器
 * 支持特定尺寸：1024x1024、1792x1024、1024x1792
 * 使用基础比例列表
 */
export const GPTImage2Handler = {
    rules: { resolutions: ['1k'], ratios: GPT_IMAGE_SIZES },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'gpt-image-2');
        return await generateStandardImage(cfg, { id: 'gpt-image-2', name: 'gpt-image-2', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
}

/**
 * GPT Image 1.5 模型处理器
 * 支持特定尺寸：1024x1024、1792x1024、1024x1792
 * 使用 GPT Image 模型特定尺寸比例
 */
export const GPTImage15Handler = {
    rules: { resolutions: ['1k'], ratios: GPT_IMAGE_SIZES },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'gpt-image-1.5');
        return await generateStandardImage(cfg, { id: 'gpt-image-1.5', name: 'gpt-image-1.5', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
}



/**
 * 即梦 4.5 模型处理器
 * 支持 1k、2k、4k 分辨率
 * 使用基础比例列表
 */
export const Jimeng45Handler = {
    rules: { resolutions: ['1k', '2k', '4k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        // 原为 Doubao4.5，现在为 Jimeng 4.5
        const size = calculateImageSize(params.aspectRatio, params.resolution, '即梦4.5');
        return await generateStandardImage(cfg, { id: 'doubao', name: 'Doubao', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
};

/**
 * Midjourney 模型处理器
 * 仅支持 1k 分辨率
 * 使用基础比例列表
 */
export const MJHandler = {
    rules: { resolutions: ['1k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        return await generateMjModal(cfg, prompt, params.aspectRatio);
    }
};

/**
 * Zimage 模型处理器
 * 仅支持 1k 分辨率
 * 使用基础比例列表
 */
export const ZimageHandler = {
    rules: { resolutions: ['1k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, '1k', 'Zimage Turbo');
        return await generateStandardImage(cfg, { id: 'z-image-turbo', name: 'Zimage Turbo', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, '1k', size, params.inputImages, params.count, params.promptOptimize);                              
    }
};

/**
 * doubao 4 模型处理器
 * 支持 1k、2k、4k 分辨率
 * 使用基础比例列表
 */
export const Doubao4Handler = {
    rules: { resolutions: ['1k', '2k', '4k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'doubao 4');
        return await generateStandardImage(cfg, { id: 'doubao', name: 'Doubao', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
};


/**
 * doubao 4.5 模型处理器
 * 支持 2k、4k 分辨率
 * 使用基础比例列表
 */
export const Doubao45Handler = {
    rules: { resolutions: ['2k', '4k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'doubao 4.5');
        return await generateStandardImage(cfg, { id: 'doubao', name: 'Doubao', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
};


/**
 * doubao 5 模型处理器
 * 支持 2k、3k 分辨率
 * 使用基础比例列表
 */
export const Doubao5Handler = {
    rules: { resolutions: [ '2k', '3k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'doubao 5');
        return await generateStandardImage(cfg, { id: 'doubao', name: 'Doubao', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
};

/**
 * Flux Pro 模型处理器
 * 支持 1k、2k 分辨率
 * 使用基础比例列表
 */
export const FluxProHandler = {
    rules: { resolutions: ['1k', '2k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'Fluxpro');
        return await generateStandardImage(cfg, { id: 'flux-pro', name: 'Flux Pro', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
};

/**
 * Kling Image 模型处理器
 * 仅支持 1k 分辨率
 * 使用基础比例列表
 */
export const KlingImageHandler = {
    rules: { resolutions: ['1k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, '1k', 'Kling');
        return await generateStandardImage(cfg, { id: 'kling-image', name: 'Kling Image', type: 'KLING_OMNI' } as any, prompt, params.aspectRatio, '1k', size, params.inputImages, params.count, params.promptOptimize);
    }
};

/**
 * 图像模型处理器映射表
 * 键为模型名称，值为对应的处理器
 */
export const IMAGE_HANDLERS: Record<string, any> = {
    'BananaPro': BananaProHandler,
    'Banana 2': Banana2,
    'Fluxpro': FluxProHandler,
    'doubao 4': Doubao4Handler,
    'doubao 4.5': Doubao45Handler,
    'doubao 5': Doubao5Handler,
    'MJ': MJHandler,
    'Zimage': ZimageHandler,
    'kling image': KlingImageHandler,
    'gpt-image-2': GPTImage2Handler,
    'gpt-image-1.5': GPTImage15Handler
};

export const BananaHandler = BananaProHandler;
export const Flux2Handler = FluxProHandler;
