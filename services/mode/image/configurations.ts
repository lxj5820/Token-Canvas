
import type { ImageModelRules, ModelConfig } from "../types";
import { generateBananaChatImage, generateBananaEdit } from "./banana";
import { generateStandardImage, generateMjModal } from "./flux";
import { calculateImageSize } from "./rules";

// --- 基础规则配置 ---
// 基础比例列表
const BASE_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
// 扩展比例列表（包含更多比例选项）
const EXTENDED_RATIOS = ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'];

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
        return await generateBananaEdit(cfg, prompt, params.aspectRatio, params.resolution, params.inputImages);
    }
};

/**
 * Banana 模型处理器
 * 仅支持 1k 分辨率
 * 使用基础比例列表
 */
export const BananaHandler = {
    rules: { resolutions: ['1k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, '1k', 'Banana');
        return await generateBananaChatImage(cfg, prompt, params.aspectRatio, '1k', size, params.inputImages);
    }
};

/**
 * Flux 2 模型处理器
 * 支持 1k、2k 分辨率
 * 使用基础比例列表
 */
export const Flux2Handler = {
    rules: { resolutions: ['1k', '2k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'Flux2');
        return await generateStandardImage(cfg, { id: 'flux', name: 'Flux', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
};

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
 * 即梦 4 模型处理器
 * 仅支持 1k 分辨率
 * 使用基础比例列表
 */
export const Jimeng4Handler = {
    rules: { resolutions: ['1k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        // 原为 Doubao3，现在为 Jimeng 4
        const size = calculateImageSize(params.aspectRatio, '1k', '即梦 4');
        return await generateStandardImage(cfg, { id: 'doubao', name: 'Doubao', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, '1k', size, params.inputImages, params.count, params.promptOptimize);
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
        const size = calculateImageSize(params.aspectRatio, '1k', 'Zimage');
        return await generateStandardImage(cfg, { id: 'z-image', name: 'Zimage', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, '1k', size, params.inputImages, params.count, params.promptOptimize);
    }
};

/**
 * Qwen Edit 模型处理器
 * 仅支持 1k 分辨率
 * 使用基础比例列表
 */
export const QwenEditHandler = {
    rules: { resolutions: ['1k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, '1k', 'Qwen');
        return await generateStandardImage(cfg, { id: 'qwen', name: 'Qwen', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, '1k', size, params.inputImages, params.count, params.promptOptimize);
    }
};

/**
 * 即梦 5 模型处理器
 * 支持 1k、2k、4k 分辨率
 * 使用基础比例列表
 */
export const Jimeng5Handler = {
    rules: { resolutions: ['1k', '2k', '4k'], ratios: BASE_RATIOS },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, '即梦5');
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
    'Banana': BananaHandler,
    'Flux2': Flux2Handler,
    'Fluxpro': FluxProHandler,
    '即梦 4.5': Jimeng45Handler,
    '即梦 4': Jimeng4Handler,
    'doubao 5': Jimeng5Handler,
    'MJ': MJHandler,
    'Zimage': ZimageHandler,
    'Qwenedit': QwenEditHandler,
    'kling image': KlingImageHandler
};
