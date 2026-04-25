import type { ModelConfig } from "../types";
import { fetchThirdParty, constructUrl } from "../network";

export const generateAlibailianVideo = async (
  config: ModelConfig,
  prompt: string,
  resolution: string,
  duration: string,
  inputImages: string[],
): Promise<string> => {
  // 使用正确的端点
  const endpoint =
    config.endpoint &&
    config.endpoint !==
      "/alibailian/api/v1/services/aigc/video-generation/video-synthesis"
      ? config.endpoint
      : "/alibailian/api/v1/services/aigc/video-generation/video-synthesis";
  const targetUrl = constructUrl(config.baseUrl, endpoint);

  // 分辨率：720p -> 720P
  const resParam = (resolution || "720p").toUpperCase();
  // 时长：5s -> 5
  const durParam = parseInt(duration.replace("s", "")) || 5;

  const payload: any = {
    model: config.modelId,
    input: {
      prompt: prompt,
      negative_prompt: "", // 可选，设置为空字符串
      img_url: inputImages[0] || "", // 必选，即使为空也需要提供
      audio_url: "", // 可选，设置为空字符串
      template: "", // 可选，设置为空字符串
    },
    parameters: {
      resolution: resParam,
      duration: durParam,
      prompt_extend: true, // 开启智能改写
      watermark: false, // 不添加水印
      audio: true, // 自动添加音频
      seed: 0, // 随机数种子，0表示随机
    },
  };

  // 只有当有输入图片时才设置 img_url
  if (inputImages.length === 0) {
    payload.input.img_url = "";
  } else {
    payload.input.img_url = inputImages[0];
  }

  console.log("[Alibailian] Creating video task...");
  console.log("[Alibailian] URL:", targetUrl);
  console.log("[Alibailian] Model:", config.modelId);
  console.log("[Alibailian] Payload:", JSON.stringify(payload, null, 2));

  const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
    timeout: 120000,
  });

  console.log("[Alibailian] Create Response:", JSON.stringify(res, null, 2));

  // 响应通常为 { output: { task_id: "..." }, request_id: "..." }
  const taskId = res.output?.task_id || res.task_id;
  if (!taskId)
    throw new Error(
      `No Task ID returned from Alibailian: ${JSON.stringify(res)}`,
    );

  const queryEndpoint =
    config.queryEndpoint || "/alibailian/api/v1/tasks/{task_id}";
  const pollUrlTemplate = constructUrl(config.baseUrl, queryEndpoint);

  let attempts = 0;
  while (attempts < 120) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollUrl = pollUrlTemplate
      .replace("{id}", taskId)
      .replace("{task_id}", taskId);

    try {
      const check = await fetchThirdParty(pollUrl, "GET", null, config, {
        timeout: 10000,
      });
      const status = (
        check.output?.task_status ||
        check.status ||
        ""
      ).toUpperCase();

      console.log(
        `[Alibailian] Poll #${attempts + 1}, Status: "${status}", Response:`,
        JSON.stringify(check, null, 2),
      );

      if (status === "SUCCEEDED") {
        if (check.output?.video_url) {
          console.log(
            "[Alibailian] Video completed! URL:",
            check.output.video_url,
          );
          return check.output.video_url;
        }
        throw new Error("Alibailian task succeeded but no video_url found.");
      } else if (status === "FAILED") {
        const errorMessage =
          check.output?.message || check.message || "Unknown error";
        console.error("[Alibailian] Generation failed:", errorMessage);
        throw new Error(`Alibailian failed: ${errorMessage}`);
      }
    } catch (e: any) {
      if (attempts > 110) throw e;
      console.warn(`[Alibailian] Poll error #${attempts + 1}:`, e.message);
    }
    attempts++;
  }
  throw new Error("Alibailian generation timed out");
};
