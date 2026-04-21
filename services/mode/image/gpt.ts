import type { ModelConfig, ModelDef } from "../types";
import { fetchThirdParty, constructUrl } from "../network";
import { calculateImageSize } from "./rules";

// Helper: Convert base64 data to proper data URL, avoiding double-encoding
const toDataUrl = (base64Str: string, defaultMimeType = 'image/png'): string => {
    if (!base64Str) return '';
    if (base64Str.startsWith('data:')) return base64Str;
    return `data:${defaultMimeType};base64,${base64Str}`;
};

// GPT Image 模型特定尺寸（符合API文档要求）
const GPT_IMAGE_SIZES = ['1:1', '3:2', '2:3'];

/**
 * GPT Image 2 模型处理器
 * 支持尺寸：1024x1024、1536x1024（横版）、1024x1536（竖版）
 */
export const GPTImage2Handler = {
    rules: { resolutions: ['1k'], ratios: GPT_IMAGE_SIZES },
    generate: async (cfg: ModelConfig, prompt: string, params: any) => {
        const size = calculateImageSize(params.aspectRatio, params.resolution, 'gpt-image-2');
        return await generateGptImage(cfg, { id: 'gpt-image-2-all', name: 'gpt-image-2', type: 'IMAGE_GEN' } as any, prompt, params.aspectRatio, params.resolution, size, params.inputImages, params.count, params.promptOptimize);
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
    const targetUrl = constructUrl(config.baseUrl, config.endpoint);
    const hasInputImage = inputImages.length > 0;

    if (n > 1) {
        const promises = Array(n).fill(null).map(async () => {
            const payload: any = {
                model: config.modelId,
                prompt,
                size: calculatedSize,
                n: 1
            };
            
            // GPT Image image-to-image support
            if (hasInputImage) {
                payload.image = inputImages[0];
            }

            const res = await fetchThirdParty(targetUrl, 'POST', payload, config, { timeout: 300000 });
            
            // 打印响应结构以便调试
            console.log('[GPT Image] Response structure:', Object.keys(res));
            console.log('[GPT Image] Response:', JSON.stringify(res).substring(0, 500));
            
            // API返回格式为chat.completion，图像在choices[0].message.content中
            if (res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content) {
                const content = res.choices[0].message.content;
                // content可能是base64编码的图像数据或URL
                if (content.startsWith('data:') || content.startsWith('http')) {
                    return content;
                } else if (content.length > 100) {
                    // 可能是纯base64数据，需要包装成data URL
                    return toDataUrl(content);
                }
            }
            
            // 备用解析方式
            const data = (res.data && Array.isArray(res.data)) ? res.data : (res.data ? [res.data] : [res]);
            return data.map((item: any) => {
                if (item.b64_json) return toDataUrl(item.b64_json);
                if (item.url) return item.url;
                if (item.image_url) return item.image_url;
                if (item.base64) return toDataUrl(item.base64);
                if (item.image_base64) return toDataUrl(item.image_base64);
                if (typeof item.image === 'string' && item.image.length > 100) return toDataUrl(item.image);
                if (typeof item.data === 'string' && item.data.length > 100) return toDataUrl(item.data);
                return '';
            }).filter((url: string) => !!url)[0];
        });
        const results = await Promise.all(promises);
        return results.filter(r => !!r);
    }

    const payload: any = {
        model: config.modelId,
        prompt,
        n: n,
        size: calculatedSize
    };

    // GPT Image image-to-image support
    if (hasInputImage) {
        payload.image = inputImages[0];
    }

    const res = await fetchThirdParty(targetUrl, 'POST', payload, config, { timeout: 300000 });
    
    // 打印响应结构以便调试
    console.log('[GPT Image] Response structure:', Object.keys(res));
    console.log('[GPT Image] Response:', JSON.stringify(res).substring(0, 500));
    
    // API返回格式为chat.completion，图像在choices[0].message.content中
    if (res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content) {
        const content = res.choices[0].message.content;
        // content可能是base64编码的图像数据或URL
        if (content.startsWith('data:') || content.startsWith('http')) {
            return [content];
        } else if (content.length > 100) {
            // 可能是纯base64数据，需要包装成data URL
            return [toDataUrl(content)];
        }
    }
    
    // 检查是否有错误响应
    if (res.error) {
        throw new Error(res.error.message || 'GPT Image API error');
    }
    
    // 检查标准图像响应格式
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((item: any) => {
            if (item.b64_json) return toDataUrl(item.b64_json);
            if (item.url) return item.url;
            if (item.image_url) return item.image_url;
            if (item.base64) return toDataUrl(item.base64);
            if (item.image_base64) return toDataUrl(item.image_base64);
            if (typeof item.image === 'string' && item.image.length > 100) return toDataUrl(item.image);
            if (typeof item.data === 'string' && item.data.length > 100) return toDataUrl(item.data);
            return '';
        }).filter((url: string) => !!url);
    }
    
    // 如果没有任何有效响应，抛出错误
    console.error('[GPT Image] No valid response format found:', res);
    throw new Error('GPT Image API returned an unrecognized response format');
};

/**
 * 检查是否为GPT Image模型
 * @param modelId 模型ID
 * @returns 是否为GPT Image模型
 */
export const isGptImageModel = (modelId: string): boolean => {
    return modelId.includes('gpt-image');
};
