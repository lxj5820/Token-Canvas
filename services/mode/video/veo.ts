import type { ModelConfig, ModelDef } from "../types";
import { fetchThirdParty, constructUrl } from "../network";
import { logger } from "../../logger";

export const generateGenericVideo = async (
  config: ModelConfig,
  modelDef: ModelDef,
  modelName: string,
  prompt: string,
  aspectRatio: string,
  resolution: string,
  duration: string,
  inputImages: string[],
  isStartEndMode: boolean,
): Promise<string> => {
  const targetUrl = constructUrl(config.baseUrl, config.endpoint);
  const payload: any = {
    model: config.modelId,
    prompt: prompt,
    aspect_ratio: aspectRatio,
    resolution: resolution,
    duration: duration,
  };

  if (inputImages.length > 0) {
    if (isStartEndMode) {
      payload.image_url = inputImages[0];
      if (inputImages.length > 1) {
        payload.last_frame_image = inputImages[inputImages.length - 1];
        payload.tail_image = inputImages[inputImages.length - 1];
      }
    } else {
      payload.image_url = inputImages[0];
    }

    payload.image_urls = inputImages;

    if (modelDef.type === "KLING") {
      payload.src_image = inputImages[0];
      if (isStartEndMode && inputImages.length > 1) {
        payload.tail_image = inputImages[inputImages.length - 1];
      }
    }
  }

  if (modelName.includes("Veo") || modelName.includes("Sora")) {
    payload.quality = resolution;
    if (duration) payload.seconds = parseInt(duration);
  }

  const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
    timeout: 900000,
    retries: 3,
  });

  if (res.url || res.data?.[0]?.url || res.data?.url) {
    return res.url || res.data?.[0]?.url || res.data?.url;
  }

  const taskId = res.id || res.task_id || res.data?.id || res.data?.task_id;
  if (!taskId) throw new Error("No Task ID returned");

  const qUrl = config.queryEndpoint
    ? constructUrl(config.baseUrl, config.queryEndpoint)
    : `${targetUrl}/${taskId}`;

  let attempts = 0;
  while (attempts < 120) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const check = await fetchThirdParty(
        qUrl.includes(taskId) ||
          (config.queryEndpoint && config.queryEndpoint.includes("{id}"))
          ? qUrl
          : `${qUrl}?task_id=${taskId}`,
        "GET",
        null,
        config,
        { timeout: 10000 },
      );
      const status = (check.status || check.task_status || check.state || "")
        .toString()
        .toLowerCase();

      if (["success", "succeeded", "completed", "ok"].includes(status)) {
        if (check.url) return check.url;
        if (check.output?.url) return check.output.url;
        if (check.result?.url) return check.result.url;
        if (check.data?.url) return check.data.url;
        if (check.data?.video?.url) return check.data.video.url;
        if (check.video?.url) return check.video.url;
        if (Array.isArray(check.data) && check.data[0]?.url)
          return check.data[0].url;
        if (check.data?.video?.url) return check.data.video.url;
      } else if (["fail", "failed", "failure", "error"].includes(status)) {
        let errorMessage = "Unknown error";
        if (check.error?.message) {
          errorMessage = check.error.message;
        } else if (check.error) {
          errorMessage =
            typeof check.error === "string"
              ? check.error
              : JSON.stringify(check.error);
        } else if (check.fail_reason) {
          errorMessage = check.fail_reason;
        } else if (check.message) {
          errorMessage = check.message;
        }
        throw new Error(errorMessage);
      }
    } catch (e: any) {
      if (attempts > 10 && e.isNonRetryable) throw e;
      if (e.message && e.message !== "Unknown error") throw e;
    }
    attempts++;
  }
  throw new Error("Video generation timed out");
};

export const generateVeo3Video = async (
  config: ModelConfig,
  prompt: string,
  aspectRatio: string,
  inputImages: string[],
): Promise<string> => {
  const targetUrl = constructUrl(config.baseUrl, config.endpoint);

  const payload: any = {
    prompt: prompt,
    model: config.modelId,
    enhance_prompt: true,
    enable_upsample: true,
    aspect_ratio: aspectRatio,
  };

  if (inputImages.length > 0) {
    payload.images = inputImages;
  }

  const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
    timeout: 900000,
    retries: 2,
  });

  if (res.url || res.video_url || res.data?.url) {
    return res.url || res.video_url || res.data?.url;
  }

  const taskId = res.id || res.task_id || res.data?.id;
  if (!taskId) throw new Error("No Task ID returned from Veo3");

  const queryEndpoint = config.queryEndpoint || "/v1/video/query";
  const qUrl = constructUrl(config.baseUrl, queryEndpoint);

  let attempts = 0;
  while (attempts < 120) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const finalUrl = `${qUrl}?id=${taskId}`;

      const check = await fetchThirdParty(finalUrl, "GET", null, config, {
        timeout: 10000,
      });

      const status = (check.status || check.state || "")
        .toString()
        .toLowerCase();

      // Veo3.1 成功状态检查：
      // 1. status === 'video_downloading' - 视频正在下载中
      // 2. detail.video_generation_status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL' - 视频生成成功
      // 3. 标准成功状态
      const genStatus = check.detail?.video_generation_status || "";
      const isGenerationSuccessful = genStatus.includes(
        "MEDIA_GENERATION_STATUS_SUCCESSFUL",
      );
      const isVideoDownloading = status === "video_downloading";
      const isStandardSuccess = [
        "completed",
        "success",
        "succeeded",
        "ok",
      ].includes(status);

      if (isGenerationSuccessful || isVideoDownloading || isStandardSuccess) {
        // 优先检查 detail.video_download_url（Veo3.1 新格式）
        if (check.detail?.video_download_url) {
          logger.log(
            "[Veo3] Video download URL found:",
            check.detail.video_download_url,
          );
          return check.detail.video_download_url;
        }

        // 检查其他可能的 URL 字段
        if (check.video_url) return check.video_url;
        if (check.detail?.video_url) return check.detail.video_url;
        if (check.detail?.upsample_video_url)
          return check.detail.upsample_video_url;
        if (check.url) return check.url;
        if (check.data?.video_url) return check.data.video_url;

        // 如果是 video_downloading 但还没 URL，继续轮询
        if (isVideoDownloading && !check.detail?.video_download_url) {
          logger.log(
            "[Veo3] Video generation successful, waiting for download URL...",
          );
        }
      } else if (["failed", "failure", "error"].includes(status)) {
        let errorMessage = "Unknown error";
        if (check.error?.message) {
          errorMessage = check.error.message;
        } else if (check.error) {
          errorMessage =
            typeof check.error === "string"
              ? check.error
              : JSON.stringify(check.error);
        } else if (check.fail_reason) {
          errorMessage = check.fail_reason;
        } else if (check.message) {
          errorMessage = check.message;
        } else if (check.detail?.error_message) {
          errorMessage = check.detail.error_message;
        }
        throw new Error(errorMessage);
      }
    } catch (e: any) {
      if (attempts > 20 && e.isNonRetryable) throw e;
      if (e.message && e.message !== "Unknown error") throw e;
    }
    attempts++;
  }
  throw new Error("Veo3 generation timed out");
};

export const generateGrokVideo = async (
  config: ModelConfig,
  prompt: string,
  aspectRatio: string,
  resolution: string,
  inputImages: string[],
): Promise<string> => {
  const targetUrl = constructUrl(config.baseUrl, config.endpoint);

  const size = (resolution || "720p").toUpperCase();

  const payload: any = {
    model: config.modelId,
    prompt: prompt,
    aspect_ratio: aspectRatio,
    size: size,
  };

  if (inputImages.length > 0) {
    payload.images = inputImages;
  }

  const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
    timeout: 120000,
  });

  if (res.url || res.data?.url) {
    return res.url || res.data?.url;
  }

  const taskId = res.id || res.task_id || res.data?.id;
  if (!taskId) throw new Error("No Task ID returned from Grok");

  const queryEndpoint = config.queryEndpoint || "/v1/video/query";
  const qUrl = constructUrl(config.baseUrl, queryEndpoint);

  let attempts = 0;
  while (attempts < 120) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const finalUrl = `${qUrl}?id=${taskId}`;

      const check = await fetchThirdParty(finalUrl, "GET", null, config, {
        timeout: 10000,
      });

      const status = (check.status || check.data?.status || "")
        .toString()
        .toLowerCase();

      if (["success", "succeeded", "completed", "ok"].includes(status)) {
        if (check.url) return check.url;
        if (check.data?.url) return check.data.url;
        if (check.data?.video_url) return check.data.video_url;
        if (check.video_url) return check.video_url;
      } else if (["failed", "failure", "error"].includes(status)) {
        let errorMessage = "Unknown error";
        if (check.error?.message) {
          errorMessage = check.error.message;
        } else if (check.error) {
          errorMessage =
            typeof check.error === "string"
              ? check.error
              : JSON.stringify(check.error);
        } else if (check.fail_reason) {
          errorMessage = check.fail_reason;
        } else if (check.message) {
          errorMessage = check.message;
        }
        throw new Error(errorMessage);
      }
    } catch (e: any) {
      if (attempts > 20 && e.isNonRetryable) throw e;
      if (e.message && e.message !== "Unknown error") throw e;
    }
    attempts++;
  }
  throw new Error("Grok generation timed out");
};

export const generateSoraVideo = async (
  config: ModelConfig,
  prompt: string,
  aspectRatio: string,
  resolution: string,
  duration: string,
  inputImages: string[],
): Promise<string> => {
  const targetUrl = constructUrl(config.baseUrl, config.endpoint);

  const orientation = aspectRatio === "9:16" ? "portrait" : "landscape";
  const size = resolution === "1080p" ? "large" : "small";
  const durationInt = parseInt(duration.replace("s", "")) || 10;

  const payload: any = {
    model: config.modelId,
    prompt: prompt,
    orientation: orientation,
    size: size,
    duration: durationInt,
    watermark: false,
    private: true,
    images: inputImages,
  };

  logger.log("[Sora] Creating video task...");
  logger.log("[Sora] URL:", targetUrl);
  logger.log("[Sora] Payload:", JSON.stringify(payload).substring(0, 500));

  const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
    timeout: 120000,
  });

  logger.log("[Sora] Create Response:", JSON.stringify(res).substring(0, 500));

  if (res.url || res.data?.url) {
    logger.log("[Sora] Direct URL returned:", res.url || res.data?.url);
    return res.url || res.data?.url;
  }

  const taskId = res.id || res.task_id || res.data?.id;
  if (!taskId) {
    console.error("[Sora] No Task ID in response:", res);
    throw new Error("No Task ID returned from Sora");
  }

  logger.log("[Sora] Task ID:", taskId);

  const queryEndpoint = config.queryEndpoint || "/v1/video/query";
  const qUrl = constructUrl(config.baseUrl, queryEndpoint);

  let attempts = 0;
  while (attempts < 120) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const finalUrl = `${qUrl}?id=${taskId}`;

      const check = await fetchThirdParty(finalUrl, "GET", null, config, {
        timeout: 10000,
      });

      const status = (check.status || check.data?.status || check.state || "")
        .toString()
        .toLowerCase();

      logger.log(
        `[Sora] Poll #${attempts + 1}, Status: "${status}", Response:`,
        JSON.stringify(check).substring(0, 300),
      );

      if (["success", "succeeded", "completed", "ok"].includes(status)) {
        const videoUrl =
          check.url ||
          check.data?.url ||
          check.data?.video_url ||
          check.video_url;
        logger.log("[Sora] Video completed! URL:", videoUrl);
        if (videoUrl) return videoUrl;
      } else if (["failed", "failure", "error"].includes(status)) {
        console.error("[Sora] Generation failed:", check);
        let errorMessage = "Unknown error";
        if (check.error?.message) {
          errorMessage = check.error.message;
        } else if (check.error) {
          errorMessage =
            typeof check.error === "string"
              ? check.error
              : JSON.stringify(check.error);
        } else if (check.fail_reason) {
          errorMessage = check.fail_reason;
        } else if (check.message) {
          errorMessage = check.message;
        }
        throw new Error(errorMessage);
      }
    } catch (e: any) {
      logger.warn(`[Sora] Poll error #${attempts + 1}:`, e.message);
      if (attempts > 20 && e.isNonRetryable) throw e;
      if (e.message && e.message !== "Unknown error") throw e;
    }
    attempts++;
  }
  throw new Error("Sora generation timed out");
};
