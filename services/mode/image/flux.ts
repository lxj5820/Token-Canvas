import type { ModelConfig, ModelDef } from "../types";
import { fetchThirdParty, constructUrl } from "../network";

// Helper: Extract base64 data from data URL
const extractBase64 = (dataUrl: string): string => {
  if (dataUrl.startsWith("data:")) {
    const parts = dataUrl.split(",");
    return parts.length > 1 ? parts[1] : dataUrl;
  }
  return dataUrl;
};

// Helper: Convert base64 data to proper data URL, avoiding double-encoding
const toDataUrl = (
  base64Str: string,
  defaultMimeType = "image/png",
): string => {
  if (!base64Str) return "";
  if (base64Str.startsWith("data:")) return base64Str;
  return `data:${defaultMimeType};base64,${base64Str}`;
};

export const generateStandardImage = async (
  config: ModelConfig,
  modelDef: ModelDef,
  prompt: string,
  aspectRatio: string,
  resolution: string,
  calculatedSize: string,
  inputImages: string[],
  n: number,
  promptOptimize?: boolean,
): Promise<string[]> => {
  const targetUrl = constructUrl(config.baseUrl, config.endpoint);
  const isFlux = modelDef.id.includes("flux");
  const isSeedream = modelDef.id.includes("seedream");
  const isZimage = modelDef.id.includes("z-image");
  const isQwen = modelDef.id.includes("qwen");
  const hasInputImage = inputImages.length > 0;

  if ((isFlux || isZimage || isSeedream) && n > 1) {
    const promises = Array(n)
      .fill(null)
      .map(async () => {
        const payload: any = {
          model: config.modelId,
          prompt,
          size: calculatedSize,
          n: 1,
        };
        if (isFlux) {
          if (resolution !== "1k") payload.quality = "hd";
          // Flux image-to-image support
          if (hasInputImage) {
            payload.image = inputImages[0];
            payload.image_url = inputImages[0];
          }
        } else if (isSeedream) {
          delete payload.n;
          payload.response_format = "b64_json";
          payload.watermark = false;
          payload.sequential_image_generation = "disabled";
          if (hasInputImage) {
            payload.image = inputImages.length === 1 ? inputImages[0] : inputImages;
          }
        } else if (isZimage) {
          payload.response_format = "b64_json";
          payload.watermark = false;
          payload.prompt_extend = !!promptOptimize;
          if (hasInputImage) payload.image = extractBase64(inputImages[0]);
        }
        const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
          timeout: 600000,
        });
        const data =
          res.data && Array.isArray(res.data)
            ? res.data
            : res.data
              ? [res.data]
              : [res];
        return data
          .map((item: any) => {
            if (item.b64_json) return toDataUrl(item.b64_json);
            if (item.url) return item.url;
            if (item.image_url) return item.image_url;
            if (item.base64) return toDataUrl(item.base64);
            if (item.image_base64) return toDataUrl(item.image_base64);
            if (typeof item.image === "string" && item.image.length > 100)
              return toDataUrl(item.image);
            if (typeof item.data === "string" && item.data.length > 100)
              return toDataUrl(item.data);
            return "";
          })
          .filter((url: string) => !!url)[0];
      });
    const settled = await Promise.allSettled(promises);
    return settled
      .filter(
        (r): r is PromiseFulfilledResult<string> =>
          r.status === "fulfilled" && !!r.value,
      )
      .map((r) => r.value);
  }

  const payload: any = {
    model: config.modelId,
    prompt,
    n: n,
    response_format: "b64_json",
  };

  if (isFlux) {
    payload.size = calculatedSize;
    if (resolution !== "1k") payload.quality = "hd";
    delete payload.response_format;
    // Flux image-to-image support
    if (hasInputImage) {
      payload.image = inputImages[0];
      payload.image_url = inputImages[0];
    }
  } else if (isSeedream) {
    delete payload.n;
    payload.size = calculatedSize;
    payload.watermark = false;
    payload.sequential_image_generation = "disabled";
  } else {
    payload.size = calculatedSize;
  }

  if (isZimage) {
    payload.watermark = false;
    payload.prompt_extend = !!promptOptimize;
    if (hasInputImage) payload.image = extractBase64(inputImages[0]);
  }

  if (isSeedream && hasInputImage) {
    payload.image = inputImages.length === 1 ? inputImages[0] : inputImages;
  }

  // Qwen image-to-image support
  if (isQwen && hasInputImage) {
    payload.image = inputImages[0];
    payload.image_url = inputImages[0];
    payload.ref_image = inputImages[0];
  }

  const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
    timeout: 600000,
  });
  const data =
    res.data && Array.isArray(res.data)
      ? res.data
      : res.data
        ? [res.data]
        : [res];

  return data
    .map((item: any) => {
      if (item.b64_json) return toDataUrl(item.b64_json);
      if (item.url) return item.url;
      if (item.image_url) return item.image_url;
      if (item.base64) return toDataUrl(item.base64);
      if (item.image_base64) return toDataUrl(item.image_base64);
      if (typeof item.image === "string" && item.image.length > 100)
        return toDataUrl(item.image);
      if (typeof item.data === "string" && item.data.length > 100)
        return toDataUrl(item.data);
      return "";
    })
    .filter((url: string) => !!url);
};

export const generateMjModal = async (
  config: ModelConfig,
  prompt: string,
  aspectRatio: string,
): Promise<string> => {
  const targetUrl = constructUrl(config.baseUrl, config.endpoint);
  const payload = {
    prompt: `${prompt} --ar ${aspectRatio}`,
    botType: "MID_JOURNEY",
  };
  const res = await fetchThirdParty(targetUrl, "POST", payload, config, {
    timeout: 600000,
  });
  return res.imageUrl || res.url;
};
