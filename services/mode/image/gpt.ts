import type { ModelConfig, ModelDef } from "../types";
import { fetchThirdParty, constructUrl } from "../network";
import { calculateImageSize } from "./rules";

// Helper: Convert base64 data to proper data URL, avoiding double-encoding
const toDataUrl = (base64Str: string, defaultMimeType = 'image/png'): string => {
    if (!base64Str) return '';
    if (base64Str.startsWith('data:')) return base64Str;
    return `data:${defaultMimeType};base64,${base64Str}`;
};

// GPT Image 模型特定尺寸
const GPT_IMAGE_SIZES = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9'];

/**
 * GPT Image 2 模型处理器
 * 支持尺寸：1024x1024、1536x1024（横版）、1024x1536（竖版）
 */
export const GPTImage2Handler = {
    rules: { resolutions: ['1k'], ratios: GPT_IMAGE_SIZES },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'gpt-image-2');
        return await generateGptImage(cfg, { id: 'gpt-image-2', name: 'gpt-image-2', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
};

/**
 * GPT Image 2 All (dall-e-3) 模型处理器
 * 使用与 gpt-image-2 相同的比例
 */
export const GPTImage2AllHandler = {
    rules: { resolutions: ['1k'], ratios: GPT_IMAGE_SIZES },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'gpt-image-2-all');
        return await generateGptImage(cfg, { id: 'gpt-image-2-all', name: 'gpt-image-2-all', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
};

/**
 * GPT Image 1.5 模型处理器
 * 支持尺寸：1024x1024、1536x1024（横版）、1024x1536（竖版）
 */
export const GPTImage15Handler = {
    rules: { resolutions: ['1k'], ratios: GPT_IMAGE_SIZES },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'gpt-image-1.5');
        return await generateGptImage(cfg, { id: 'gpt-image-1.5-all', name: 'gpt-image-1.5', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
    }
};

/**
 * GPT 图像模型配置
 */
export const GPT_IMAGE_CONFIG = {
    // GPT Image 模型支持的比例
    supportedRatios: GPT_IMAGE_SIZES,
    // GPT Image 模型支持的分辨率
    supportedResolutions: ['1k'],
    // GPT Image 模型的默认参数
    defaultParams: {
        responseFormat: 'b64_json',
        quality: 'standard'
    }
};

/**
 * GPT Image 模型专用生成函数
 * @param config 模型配置
 * @param modelDef 模型定义
 * @param prompt 提示词
 * @param aspectRatio 图像比例
 * @param resolution 分辨率
 * @param calculatedSize 计算后的尺寸
 * @param inputImages 输入图像
 * @param n 生成数量
 * @param promptOptimize 是否优化提示词
 * @returns 生成的图像URL数组
 */
export const generateGptImage = async (
    config: ModelConfig,
    modelDef: ModelDef,
    prompt: string,
    aspectRatio: string,
    resolution: string,
    calculatedSize: string,
    inputImages: string[],
    n: number,
    promptOptimize?: boolean
): Promise<string[]> => {
    // 使用正确的 API 端点
    const endpoint = config.endpoint && config.endpoint !== '/images/generations'
        ? config.endpoint
        : '/images/generations';
    const targetUrl = constructUrl(config.baseUrl, endpoint);

    const hasInputImage = inputImages.length > 0;

    // 构建请求参数
    const payload: any = {
        model: config.modelId,
        prompt: prompt,
        n: n || 1,
        size: calculatedSize,
        // GPT Image 模型特有参数
        background: 'auto', // 自动背景
        moderation: 'auto', // 自动内容审核
        output_format: 'png', // 默认输出格式
        quality: 'auto', // 自动质量
        user: 'user-1234' // 用户标识符
    };

    // 如果有输入图片，使用 image 字段
    if (hasInputImage) {
        payload.image = inputImages[0];
    }

    console.log('[GPT Image] Creating image task...');
    console.log('[GPT Image] URL:', targetUrl);
    console.log('[GPT Image] Model:', config.modelId);
    console.log('[GPT Image] Payload:', JSON.stringify(payload, null, 2));

    const res = await fetchThirdParty(targetUrl, 'POST', payload, config, { timeout: 300000 });

    console.log('[GPT Image] Create Response:', JSON.stringify(res, null, 2));

    // 处理响应
    if (res.data && Array.isArray(res.data)) {
        return res.data.map((item: any) => {
            if (item.b64_json) return toDataUrl(item.b64_json);
            if (item.url) return item.url;
            if (item.image_url) return item.image_url;
            return '';
        }).filter((url: string) => !!url);
    }

    // 处理其他响应格式
    if (res.b64_json) return [toDataUrl(res.b64_json)];
    if (res.url) return [res.url];
    if (res.image_url) return [res.image_url];

    // 处理流式响应
    if (res.event && res.event === 'image_generation.completed' && res.data?.b64_json) {
        return [toDataUrl(res.data.b64_json)];
    }

    // 如果没有任何有效响应，抛出错误
    console.error('[GPT Image] No valid response format found:', res);
    throw new Error('GPT Image API returned an unrecognized response format');
};

/**
 * GPT Image 模型编辑函数
 * @param config 模型配置
 * @param modelDef 模型定义
 * @param prompt 提示词
 * @param inputImages 输入图像
 * @param n 生成数量
 * @returns 生成的图像URL数组
 */
export const generateGptImageEdit = async (
    config: ModelConfig,
    modelDef: ModelDef,
    prompt: string,
    inputImages: string[],
    n: number = 1
): Promise<string[]> => {
    // 使用正确的 API 端点
    const endpoint = config.endpoint && config.endpoint !== '/images/edits'
        ? config.endpoint
        : '/images/edits';
    const targetUrl = constructUrl(config.baseUrl, endpoint);

    // 构建请求参数
    const payload: any = {
        model: config.modelId,
        prompt: prompt,
        images: inputImages.map((img, index) => ({
            image_url: img
        })),
        n: n,
        size: '1024x1024', // 默认尺寸
        background: 'auto',
        moderation: 'auto',
        output_format: 'png',
        quality: 'auto',
        user: 'user-1234'
    };

    console.log('[GPT Image Edit] Creating edit task...');
    console.log('[GPT Image Edit] URL:', targetUrl);
    console.log('[GPT Image Edit] Model:', config.modelId);
    console.log('[GPT Image Edit] Payload:', JSON.stringify(payload, null, 2));

    const res = await fetchThirdParty(targetUrl, 'POST', payload, config, { timeout: 300000 });

    console.log('[GPT Image Edit] Response:', JSON.stringify(res, null, 2));

    // 处理响应
    if (res.data && Array.isArray(res.data)) {
        return res.data.map((item: any) => {
            if (item.b64_json) return toDataUrl(item.b64_json);
            if (item.url) return item.url;
            if (item.image_url) return item.image_url;
            return '';
        }).filter((url: string) => !!url);
    }

    // 处理其他响应格式
    if (res.b64_json) return [toDataUrl(res.b64_json)];
    if (res.url) return [res.url];
    if (res.image_url) return [res.image_url];

    // 处理流式响应
    if (res.event && res.event === 'image_edit.completed' && res.data?.b64_json) {
        return [toDataUrl(res.data.b64_json)];
    }

    // 如果没有任何有效响应，抛出错误
    console.error('[GPT Image Edit] No valid response format found:', res);
    throw new Error('GPT Image Edit API returned an unrecognized response format');
};

/**
 * 检查是否为GPT Image模型
 * @param modelId 模型ID
 * @returns 是否为GPT Image模型
 */
export const isGptImageModel = (modelId: string): boolean => {
    return modelId.includes('gpt-image');
};