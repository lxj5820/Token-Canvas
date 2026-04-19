
import type { ModelConfig } from "../types";
import { fetchThirdParty, constructUrl } from "../network";

export const generateSeedanceVideo = async (
    config: ModelConfig,
    prompt: string,
    aspectRatio: string,
    resolution: string,
    duration: string,
    inputImages: string[],
    isStartEndMode: boolean
): Promise<string> => {
    // 1. 构建端点
    const targetUrl = constructUrl(config.baseUrl, config.endpoint);
    
    // 2. 确定模型ID（根据文档严格要求后缀）
    // 示例：doubao-seedance-1-5-pro_480p, doubao-seedance-1-5-pro_720p
    let suffix = '_720p'; // 默认
    if (resolution === '1080p') suffix = '_1080p';
    else if (resolution === '480p') suffix = '_480p';
    
    // 基础ID通常配置为'doubao-seedance-1-5-pro'，确保如果配置中已包含后缀，不会重复添加
    const baseId = config.modelId.replace(/_\d+p$/, ''); 
    const modelId = `${baseId}${suffix}`;

    // 3. 解析时长（必须是整数，且≥4且<12）
    const secondsInt = parseInt(duration.replace('s', '')) || 5;
    const seconds = secondsInt.toString();

    // 4. 构建FormData格式的负载（严格按照文档要求）
    const payload = new FormData();
    payload.append('model', modelId);
    payload.append('prompt', prompt);
    payload.append('size', aspectRatio); // "16:9", "4:3" 等
    payload.append('seconds', seconds); // 必须是字符串

    if (inputImages.length > 0) {
        // first_frame_image需要字符串（URL或base64）
        payload.append('first_frame_image', inputImages[0]);
        
        if (isStartEndMode && inputImages.length > 1) {
             payload.append('last_frame_image', inputImages[inputImages.length - 1]);
        }
    }

    // 5. 发送POST请求，设置isFormData: true
    // 这确保浏览器将Content-Type设置为multipart/form-data并使用正确的边界
    const res = await fetchThirdParty(targetUrl, 'POST', payload, config, { timeout: 120000, isFormData: true });

    // 6. 处理POST响应
    // 预期：{ id: "task_id", status: "queued", ... } 或 { data: { id: "..." } }
    const taskId = res.id || res.data?.id || res.task_id; 
    if (!taskId) {
        throw new Error(`No Task ID returned: ${JSON.stringify(res)}`);
    }

    // 7. 轮询状态
    // 端点：/v1/videos/{task_id}
    const qUrl = `${targetUrl}/${taskId}`;
    
    let attempts = 0;
    while (attempts < 120) { // 轮询最多6分钟（120 * 3s）
        await new Promise(r => setTimeout(r, 3000));
        
        try {
            const check = await fetchThirdParty(qUrl, 'GET', null, config, { timeout: 10000 });
            
            // 标准化状态提取（检查根级和data字段）
            const statusRaw = check.status || check.data?.status;
            const status = (statusRaw || '').toString().toLowerCase();

            if (['completed', 'succeeded', 'success'].includes(status)) {
                // 稳健提取video_url
                if (check.video_url) return check.video_url;
                if (check.data?.video_url) return check.data.video_url;
                
                // 备用方案
                if (check.url) return check.url;
                if (check.data?.url) return check.data.url;
                if (check.data?.video?.url) return check.data.video.url;
                if (check.output?.url) return check.output.url;
                if (check.result?.url) return check.result.url;

                // 如果URL缺失，记录完整响应以帮助调试
                console.error("Doubao video generation succeeded but URL is missing. Response:", check);
                throw new Error("Video generation completed but no video_url found in response");
            } else if (['failed', 'failure'].includes(status)) {
                const errorDetail = check.error?.message || check.error || check.data?.error?.message || check.data?.error || 'Unknown error';
                throw new Error(`Generation failed: ${errorDetail}`);
            } else if (status === 'cancelled') {
                throw new Error("Generation was cancelled");
            }
        } catch (e: any) {
            // 轮询期间忽略临时网络错误，除非达到最大尝试次数
            if (attempts > 110) throw e;
            console.warn("Polling error (retrying):", e);
        }
        
        attempts++;
    }
    throw new Error("Video generation timed out");
};
