
import type { ModelConfig } from "../types";
import { fetchThirdParty, constructUrl } from "../network";

export const generateKlingO1Video = async (
    config: ModelConfig,
    modelName: string, // "Kling O1 Std" or "Kling O1 Pro"
    prompt: string,
    aspectRatio: string,
    resolution: string,
    duration: string,
    inputImages: string[],
    isStartEndMode: boolean
): Promise<string> => {
    const targetUrl = constructUrl(config.baseUrl, config.endpoint);
    
    const mode = modelName.includes('Pro') ? 'pro' : 'std';
    const durationInt = parseInt(duration.replace('s', '')) || 5;

    const payload: any = {
        model: config.modelId, // 'kling-omni-video'
        prompt: prompt,
        aspect_ratio: aspectRatio,
        mode: mode,
        duration: durationInt
    };

    // 处理输入图像
    if (inputImages.length > 0) {
        if (isStartEndMode && inputImages.length > 1) {
             // 首尾帧模式
             payload.image_list = [
                 { image_url: inputImages[0], type: "first_frame" },
                 { image_url: inputImages[inputImages.length - 1], type: "end_frame" }
             ];
        } else {
             // 参考图像模式（不传递类型）
             payload.image_list = inputImages.map(url => ({ image_url: url }));
             // 如果需要，参考模式强制最多1张图像，通常只使用第一张
             if (payload.image_list.length > 1) {
                 payload.image_list = [payload.image_list[0]];
             }
        }
    }

    const res = await fetchThirdParty(targetUrl, 'POST', payload, config, { timeout: 120000 });

    const taskId = res.task_id || res.id || res.data?.task_id || res.data?.id;
    if (!taskId) {
        throw new Error(`No Task ID returned from Kling O1: ${JSON.stringify(res)}`);
    }

    // 轮询
    const qUrl = config.queryEndpoint 
        ? constructUrl(config.baseUrl, config.queryEndpoint)
        : `${targetUrl}/${taskId}`;

    let attempts = 0;
    while (attempts < 120) {
        await new Promise(r => setTimeout(r, 5000));
        
        // 如果queryEndpoint中包含{id}，则替换为任务ID
        const finalUrl = qUrl.replace('{id}', taskId);

        try {
            const check = await fetchThirdParty(finalUrl, 'GET', null, config, { timeout: 10000 });
            
            // 如果有内部task_status，优先使用（在代理中常见，根级status是API状态）
            // 结构可能是check.data.data.task_status或check.data.task_status
            const innerStatus = check.data?.data?.task_status || check.data?.task_status || check.task_result?.task_status;
            const rootStatus = check.task_status || check.status;
            const status = (innerStatus || rootStatus || '').toString().toLowerCase();

            if (['succeed', 'success', 'completed'].includes(status)) {
                // 返回结果
                
                // 1. 尝试最深层嵌套（Wrapper -> Data -> TaskResult）
                // 匹配用户提供的格式：data.data.task_result.videos[0].url
                const videos = check.data?.data?.task_result?.videos || check.data?.task_result?.videos || check.task_result?.videos;
                if (videos && videos[0]?.url) return videos[0].url;

                const images = check.data?.data?.task_result?.images || check.data?.task_result?.images || check.task_result?.images;
                if (images && images[0]?.url) return images[0].url;
                
                // 2. 其他结构的备用方案
                if (check.data?.url) return check.data.url;
                if (check.url) return check.url;
                
                // 如果需要，记录内容用于调试，但抛出错误以保持流程标准
                throw new Error("Kling O1 succeeded but no URL found in response.");
            } else if (['failed', 'failure'].includes(status)) {
                 const msg = check.data?.data?.task_status_msg || check.task_status_msg || check.fail_reason || 'Unknown error';
                 throw new Error(`Kling O1 failed: ${msg}`);
            }
        } catch (e: any) {
            if (attempts > 110) throw e;
        }
        attempts++;
    }
    throw new Error("Kling O1 timed out");
};

export const generateKlingStandardVideo = async (
    config: ModelConfig,
    modelName: string, // "Kling 2.5 Std", "Kling 2.6 ProNS", "Kling 2.6 ProYS"
    prompt: string,
    aspectRatio: string,
    duration: string,
    inputImages: string[],
    isStartEndMode: boolean
): Promise<string> => {
    const isImage2Video = inputImages.length > 0;
    const endpointSuffix = isImage2Video ? '/image2video' : '/text2video';
    // 清理基础端点
    const baseEndpoint = config.endpoint.replace(/\/$/, '');
    const targetUrl = constructUrl(config.baseUrl, baseEndpoint + endpointSuffix);

    // Kling 2.6 ID: kling-v2-6, Kling 2.5 ID: kling-v2-5-turbo
    const isV2_6 = config.modelId.includes('v2-6');

    // 确定模式
    let mode = modelName.includes('Pro') ? 'pro' : 'std';
    if (isV2_6) {
        mode = 'pro'; // Kling 2.6 仅支持pro模式
    }

    const durationInt = parseInt(duration.replace('s', '')) || 5;
    
    const payload: any = {
        model_name: config.modelId,
        prompt: prompt || '',
        mode: mode,
        duration: durationInt,
        cfg_scale: 0.5,
        aspect_ratio: aspectRatio
    };

    if (isV2_6) {
        // 处理Kling 2.6的声音
        if (modelName.includes('ProYS')) {
            payload.sound = 'on';
        } else if (modelName.includes('ProNS')) {
            payload.sound = 'off';
        } else {
            // 如果后缀不匹配，默认为关闭，以确保安全
            payload.sound = 'off';
        }
    }
    // 对于2.5版本，省略声音参数

    if (isImage2Video) {
        payload.image = inputImages[0];
        
        // 仅当首尾帧模式激活时传递image_tail
        if (isStartEndMode && inputImages.length > 1) {
             payload.image_tail = inputImages[inputImages.length - 1];
        }
    }

    const res = await fetchThirdParty(targetUrl, 'POST', payload, config, { timeout: 120000 });

    const taskId = res.data?.data?.task_id || res.data?.task_id || res.task_id || res.id;
    if (!taskId) {
        throw new Error(`No Task ID returned from Kling: ${JSON.stringify(res)}`);
    }

    // 修复：正确构建轮询URL，确保在没有自定义queryEndpoint时添加后缀
    // 默认：/kling/v1/videos/text2video/{id}
    let relativePollPath: string;
    if (config.queryEndpoint) {
        relativePollPath = config.queryEndpoint;
    } else {
        relativePollPath = `${baseEndpoint}${endpointSuffix}/${taskId}`;
    }
    
    const finalPollUrlTemplate = constructUrl(config.baseUrl, relativePollPath);

    let attempts = 0;
    while (attempts < 120) {
        await new Promise(r => setTimeout(r, 5000));
        
        // 如果存在{id}，则进行替换
        const currentUrl = finalPollUrlTemplate.replace('{id}', taskId);

        try {
            const check = await fetchThirdParty(currentUrl, 'GET', null, config, { timeout: 10000 });
            
            const innerStatus = check.data?.data?.task_status || check.data?.task_status || check.task_result?.task_status;
            const rootStatus = check.task_status || check.status;
            const status = (innerStatus || rootStatus || '').toString().toLowerCase();

            if (['succeed', 'success', 'completed'].includes(status)) {
                // 1. 尝试最深层嵌套
                const videos = check.data?.data?.task_result?.videos || check.data?.task_result?.videos || check.task_result?.videos;
                if (videos && videos[0]?.url) return videos[0].url;

                // 2. 备用方案
                if (check.data?.url) return check.data.url;
                if (check.url) return check.url;
                
                throw new Error("Kling succeeded but no URL found.");
            } else if (['failed', 'failure'].includes(status)) {
                 const msg = check.data?.data?.task_status_msg || check.task_status_msg || check.fail_reason || 'Unknown error';
                 throw new Error(`Kling failed: ${msg}`);
            }
        } catch (e: any) {
            if (attempts > 110) throw e;
        }
        attempts++;
    }
    throw new Error("Kling timed out");
};
