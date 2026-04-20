

import { MODEL_REGISTRY, getModelConfig, saveModelConfig, registerCustomModel, deleteModel, isCustomModel, getVisibleModels } from "./mode/config";
import type { ModelConfig } from "./mode/config";
import { IMAGE_HANDLERS, BananaHandler, Flux2Handler } from "./mode/image/configurations";
import { VIDEO_HANDLERS, Sora2Handler, KlingStandardHandler } from "./mode/video/configurations";
import { AUDIO_HANDLERS, SunoHandler } from "./mode/audio/configurations";
import { constructUrl, fetchThirdParty } from "./mode/network";

// Re-export for UI
export { MODEL_REGISTRY, getModelConfig, saveModelConfig, registerCustomModel, deleteModel, isCustomModel, getVisibleModels };
export type { ModelConfig };

// --- Generators ---

export const generateCreativeDescription = async (input: string, mode: 'IMAGE' | 'VIDEO'): Promise<string> => {
  const config = getModelConfig('Banana 2'); 
  if (!config.key) return input;
  const prompt = `Optimize this ${mode.toLowerCase()} description for professional AI generation. Input: "${input}". Provide ONLY the optimized prompt text.`;
  try {
     const payload = { model: 'gemini-2.0-flash-exp', messages: [{ role: 'user', content: prompt }], stream: false };
     const url = constructUrl(config.baseUrl, '/v1/chat/completions');
     const res = await fetchThirdParty(url, 'POST', payload, config);
     return res.choices?.[0]?.message?.content || input;
  } catch (e) {
    return input;
  }
};

export const generateImage = async (
    prompt: string, 
    aspectRatio: string = "1:1", 
    modelName: string = "Banana 2", 
    resolution: string = "1k", 
    count: number = 1,
    inputImages: string[] = [],
    promptOptimize: boolean = false
): Promise<string[]> => {
  let handler = IMAGE_HANDLERS[modelName];
  
  // Fallback for custom models
  if (!handler) {
      const def = MODEL_REGISTRY[modelName];
      if (def) {
          if (def.type === 'CHAT') handler = BananaHandler;
          else handler = Flux2Handler; // Default to Generic Image Gen
      }
  }
  
  if (!handler) handler = IMAGE_HANDLERS['Banana 2'];

  const config = getModelConfig(modelName);
  
  // Debug: Log image generation parameters
  console.log(`[Image Gen] Model: ${modelName}, Input Images: ${inputImages.length}, Prompt Optimize: ${promptOptimize}`);
  
  try {
      const result = await handler.generate(config, prompt, { aspectRatio, resolution, inputImages, count, promptOptimize });
      return Array.isArray(result) ? result : [result];
  } catch (e) {
    console.error(`Error generating image with ${modelName}`, e);
    throw e;
  }
};

export const generateVideo = async (
    prompt: string, 
    inputImages: string[] = [], 
    aspectRatio: string = "16:9", 
    modelName: string = "Sora2", 
    resolution: string = "720p", 
    duration: string = "5s",
    count: number = 1,
    promptOptimize: boolean = false
): Promise<string[]> => {
    let realModelName = modelName;
    const isStartEndMode = modelName.endsWith('_FL');
    if (isStartEndMode) realModelName = modelName.replace('_FL', '');

    let handler = VIDEO_HANDLERS[realModelName];
    
    // Fallback for custom models
    if (!handler) {
        const def = MODEL_REGISTRY[realModelName];
        if (def) {
            if (def.type === 'VIDEO_GEN_CHAT') handler = Sora2Handler;
            else handler = KlingStandardHandler; // Default to Generic Video Gen
        }
    }

    if (!handler) handler = VIDEO_HANDLERS['Sora2'];

    const config = getModelConfig(realModelName);
    
    // Debug: Log video generation parameters
    console.log(`[Video Gen] Model: ${realModelName}, Input Images: ${inputImages.length}, Start-End Mode: ${isStartEndMode}, Prompt Optimize: ${promptOptimize}`);
    console.log(`[Video Gen] Config:`, { baseUrl: config.baseUrl, endpoint: config.endpoint, queryEndpoint: config.queryEndpoint, modelId: config.modelId, hasKey: !!config.key });
    
    try {
        const result = await handler.generate(config, prompt, { 
            aspectRatio, resolution, duration, inputImages, isStartEndMode, count, promptOptimize 
        });
        return Array.isArray(result) ? result : [result];
    } catch (e) {
        console.error(`Error generating video with ${modelName}`, e);
        throw e;
    }
};

export const generateAudio = async (
    prompt: string, 
    modelName: string = "Suno",
    duration: string = "30s",
    style: string = "pop"
): Promise<string[]> => {
    let handler = AUDIO_HANDLERS[modelName];
    
    // Fallback for custom models
    if (!handler) {
        handler = SunoHandler;
    }

    const config = getModelConfig(modelName);
    
    // Debug: Log audio generation parameters
    console.log(`[Audio Gen] Model: ${modelName}, Duration: ${duration}, Style: ${style}`);
    console.log(`[Audio Gen] Config:`, { baseUrl: config.baseUrl, endpoint: config.endpoint, modelId: config.modelId, hasKey: !!config.key });
    
    try {
        const result = await handler.generate(config, prompt, { duration, style });
        return Array.isArray(result) ? result : [result];
    } catch (e) {
        console.error(`Error generating audio with ${modelName}`, e);
        throw e;
    }
};
