
/**
 * 图像模型规则配置
 * 包含图像模型的能力配置和尺寸计算逻辑
 */

import { ImageModelRules } from "../types";

/**
 * 默认比例列表
 * 包含常用的图像比例
 */
const DEFAULT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];

/**
 * 图像模型能力配置
 * 定义了每个模型支持的分辨率和比例
 */
export const IMAGE_MODEL_CAPABILITIES: Record<string, ImageModelRules> = {
    'BananaPro': { resolutions: ['1k', '2k', '4k'], ratios: DEFAULT_RATIOS },
    'Banana Pro Edit': { resolutions: ['1k', '2k', '4k'], ratios: ['1:1', '3:4', '4:3', '9:16', '16:9', '21:9', '9:21'], supportsEdit: true },
    'Banana': { resolutions: ['1k'], ratios: DEFAULT_RATIOS },
    'Flux2': { resolutions: ['1k', '2k'], ratios: DEFAULT_RATIOS },
    'Fluxpro': { resolutions: ['1k', '2k'], ratios: DEFAULT_RATIOS },
    '即梦4.5': { resolutions: ['1k', '2k', '4k'], ratios: DEFAULT_RATIOS },
    '即梦 4': { resolutions: ['1k'], ratios: DEFAULT_RATIOS },
    'doubao 5': { resolutions: ['1k', '2k', '4k'], ratios: DEFAULT_RATIOS },
    'MJ': { resolutions: ['1k'], ratios: DEFAULT_RATIOS },
    'Zimage': { resolutions: ['1k'], ratios: DEFAULT_RATIOS, hasPromptExtend: true },
    'Qwenedit': { resolutions: ['1k'], ratios: DEFAULT_RATIOS },
    'kling image': { resolutions: ['1k'], ratios: DEFAULT_RATIOS },
    'gpt-image-2': { resolutions: ['1k'], ratios: ['1:1', '16:9', '9:16'], supportsEdit: true },
    'gpt-image-1.5': { resolutions: ['1k'], ratios: ['1:1', '16:9', '9:16'], supportsEdit: true }
};

/**
 * 获取图像模型规则
 * @param modelName 模型名称
 * @returns 模型的规则配置
 */
export const getImageModelRules = (modelName: string): ImageModelRules => {
    // 如果找不到模型配置，返回默认配置
    return IMAGE_MODEL_CAPABILITIES[modelName] || { resolutions: ['1k'], ratios: DEFAULT_RATIOS };
};

/**
 * 计算图像尺寸
 * @param aspectRatio 图像比例
 * @param resolution 分辨率级别
 * @param modelName 模型名称
 * @returns 计算后的图像尺寸，格式为 "宽度x高度"
 */
export const calculateImageSize = (aspectRatio: string, resolution: string, modelName: string): string => {
  // Zimage 模型特殊处理
  if (modelName === 'Zimage' && resolution === '1k') {
      if (aspectRatio === '16:9') return '1280x720';
      if (aspectRatio === '9:16') return '720x1280';
  }

  // GPT Image 模型特殊处理
  // 只支持三种尺寸：1024x1024、1792x1024、1024x1792
  if (modelName.includes('gpt-image')) {
      if (aspectRatio === '1:1') return '1024x1024';
      if (aspectRatio === '16:9') return '1792x1024';
      if (aspectRatio === '9:16') return '1024x1792';
      // 对于其他比例，默认使用 1:1
      return '1024x1024';
  }

  // Flux2 模型特殊处理
  if (modelName === 'Flux2') {
      const is2k = resolution === '2k';
      if (aspectRatio === '1:1') return is2k ? '2048x2048' : '1024x1024';
      if (aspectRatio === '16:9') return is2k ? '2048x1152' : '1920x1080';
      if (aspectRatio === '9:16') return is2k ? '1152x2048' : '1080x1920';
      if (aspectRatio === '4:3') return is2k ? '2048x1536' : '1600x1200';
      if (aspectRatio === '3:4') return is2k ? '1536x2048' : '1200x1600';
      return is2k ? '2048x2048' : '1024x1024';
  }

  // Banana 系列模型 1k 分辨率特殊处理
  if ((modelName === 'Banana' || modelName === 'BananaPro') && resolution === '1k') {
      if (aspectRatio === '1:1') return '1024x1024';
      if (aspectRatio === '4:3') return '1024x768';
      if (aspectRatio === '3:4') return '768x1024';
      if (aspectRatio === '16:9') return '1024x576';
      if (aspectRatio === '9:16') return '576x1024';
  }

  // 通用尺寸计算逻辑
  const [w, h] = aspectRatio.split(':').map(Number);
  
  let width = 1024;
  let height = 1024;

  // 检查常见比例
  const is1_1 = w === 1 && h === 1;
  const is4_3 = w === 4 && h === 3;
  const is3_4 = w === 3 && h === 4;
  const is16_9 = w === 16 && h === 9;
  const is9_16 = w === 9 && h === 16;
  const is21_9 = w === 21 && h === 9;
  const is9_21 = w === 9 && h === 21;

  // 根据比例设置基础尺寸
  if (is1_1) { width = 1024; height = 1024; }
  else if (is4_3) { width = 1024; height = 768; }
  else if (is3_4) { width = 768; height = 1024; }
  else if (is16_9) { width = 1024; height = 576; }
  else if (is9_16) { width = 576; height = 1024; }
  else if (is21_9) { width = 1536; height = 640; } 
  else if (is9_21) { width = 640; height = 1536; }
  else {
      // 处理自定义比例
      if (!isNaN(w) && !isNaN(h)) {
          if (w > h) { width = 1024; height = Math.round(1024 * (h/w)); }
          else { height = 1024; width = Math.round(1024 * (w/h)); }
      }
  }

  // 处理高分辨率
  const supportsHighRes = ['BananaPro', 'Banana Pro Edit', '即梦4.5', 'doubao 4.5'].includes(modelName);

  if (supportsHighRes) {
      if (resolution === '2k') {
          width *= 2; height *= 2;
      } else if (resolution === '4k') {
          if (is16_9) { width = 4096; height = 2160; }
          else if (is9_16) { width = 2160; height = 4096; }
          else {
            width *= 4; height *= 4;
          }
      }
  }

  // 四舍五入到整数
  width = Math.round(width);
  height = Math.round(height);

  // 返回尺寸字符串
  return `${width}x${height}`;
};
