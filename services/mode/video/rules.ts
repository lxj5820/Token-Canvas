import { VideoModelRules, VideoConstraints } from "../types";

export const videoModels = [
  "Sora 2",
  "Veo 3.1",
  "Veo 3.1 Fast",
  "Veo 3.1 Pro",
  "Veo 3.1 4K",
  "Veo 3.1 Pro 4K",
  "Veo 3.1 Fast Components",
  "Veo 3.1 Components",
  "海螺2.0",
  "海螺2.3",
  "Kling O1 Std",
  "Kling O1 Pro",
  "即梦 3.5",
  "Kling 2.6 ProNS",
  "Kling 2.6 ProYS",
  "Kling 2.5 Std",
  "Kling 2.5 Pro",
  "Wan2.6",
  "Wan2.5",
  "Doubao Video",
  "Grok video 3",
];
export const videoDurations = [
  "3s",
  "4s",
  "5s",
  "6s",
  "7s",
  "8s",
  "10s",
  "12s",
  "15s",
  "25s",
];

export const getVideoConstraints = (
  modelName: string,
  resolution: string | undefined,
  duration: string | undefined,
  inputCount: number,
): VideoConstraints => {
  const isDoubaoVideo = modelName === "Doubao Video";
  const isHailuo = modelName === "海螺2.0" || modelName === "海螺2.3";
  const isVeo = modelName.startsWith("Veo 3.1");
  const isSeedance = modelName === "即梦 3.5";
  const isKlingO1 =
    modelName === "Kling O1 Std" || modelName === "Kling O1 Pro";
  const isKlingStd = modelName.includes("Kling 2.");
  const isGrok = modelName === "Grok Video" || modelName === "Grok video 3";
  const isSora = modelName === "Sora 2";
  const isWan = modelName.includes("Wan");

  let resOptions = ["480p", "720p", "1080p"];
  let disabledRes: string[] = [];
  let disabledRatios: string[] = [];
  let disabledDurations: string[] = [];

  if (isDoubaoVideo) {
    disabledRes = ["480p", ...(inputCount > 0 ? ["1080p"] : [])];
    disabledRatios = ["3:4", "4:3"];
    disabledDurations = videoDurations.filter(
      (d) => !["4s", "6s", "8s"].includes(d),
    );
  } else if (isHailuo) {
    resOptions = ["768p", "1080p"];
    disabledRes = ["480p", "720p"];
    disabledRatios = ["3:4", "4:3"];
    const allowed = ["6s", "10s"];
    disabledDurations = videoDurations.filter((d) => !allowed.includes(d));
    if (resolution === "1080p" && inputCount > 0) {
      disabledDurations = videoDurations.filter((d) => d !== "6s");
    }
  } else if (isVeo) {
    // Veo: 禁用480p，禁用1:1/3:4/4:3（仅保留16:9, 9:16），仅支持8秒时长
    // 4K 模型支持 4K 分辨率
    if (modelName.includes("4K")) {
      resOptions = ["720p", "1080p", "4K"];
    }
    disabledRes = ["480p"];
    disabledRatios = ["1:1", "3:4", "4:3"];
    disabledDurations = videoDurations.filter((d) => d !== "8s");
  } else if (isSeedance) {
    disabledRes = [];
    const allowed = ["5s", "7s", "10s"];
    disabledDurations = videoDurations.filter((d) => !allowed.includes(d));
  } else if (isKlingO1) {
    // Kling O1: 仅支持1080p。比例16:9, 9:16, 1:1。时长5秒, 10秒。
    resOptions = ["1080p"];
    disabledRes = ["480p", "720p"];
    disabledRatios = ["3:4", "4:3"];
    const allowed = ["5s", "10s"];
    disabledDurations = videoDurations.filter((d) => !allowed.includes(d));
  } else if (isKlingStd) {
    // Kling 2.5 / 2.6
    resOptions = ["720p", "1080p"];
    disabledRes = ["480p"];
    disabledRatios = ["1:1", "3:4", "4:3"]; // 仅16:9, 9:16
    const allowed = ["5s", "10s"];
    disabledDurations = videoDurations.filter((d) => !allowed.includes(d));
  } else if (isGrok) {
    resOptions = ["720p"];
    disabledRes = ["480p", "1080p"];
    disabledRatios = [];
    const allowed = ["6s"];
    disabledDurations = videoDurations.filter((d) => !allowed.includes(d));
  } else if (isSora) {
    // Sora 2: 720p (small), 1080p (large)。比例16:9, 9:16。时长4秒, 8秒, 12秒。
    resOptions = ["720p", "1080p"];
    disabledRes = ["480p"];
    disabledRatios = ["1:1", "3:4", "4:3"];
    const allowed = ["4s", "8s", "12s"];
    disabledDurations = videoDurations.filter((d) => !allowed.includes(d));
  } else if (isWan) {
    // Wan: 720p, 1080p。时长5秒, 10秒。
    resOptions = ["720p", "1080p"];
    disabledRes = ["480p"];
    const allowed = ["5s", "10s"];
    disabledDurations = videoDurations.filter((d) => !allowed.includes(d));
  }

  return { resOptions, disabledRes, disabledRatios, disabledDurations };
};

export const getAutoCorrectedVideoSettings = (
  modelName: string,
  resolution: string | undefined,
  duration: string | undefined,
  inputCount: number,
): { resolution?: string; duration?: string; aspectRatio?: string } => {
  const isHailuo = modelName === "海螺2.0" || modelName === "海螺2.3";
  const isVeo = modelName.startsWith("Veo 3.1");
  const isSeedance = modelName === "即梦 3.5";
  const isKlingO1 =
    modelName === "Kling O1 Std" || modelName === "Kling O1 Pro";
  const isKlingStd = modelName.includes("Kling 2.");
  const isGrok = modelName === "Grok Video" || modelName === "Grok video 3";
  const isSora = modelName === "Sora 2";
  const isWan = modelName.includes("Wan");

  let updates: {
    resolution?: string;
    duration?: string;
    aspectRatio?: string;
  } = {};

  if (isHailuo) {
    if (resolution === "480p" || resolution === "720p") {
      updates.resolution = "768p";
    }
    const currentDur = duration || "5s";
    if (resolution === "1080p" && inputCount > 0) {
      if (currentDur !== "6s") updates.duration = "6s";
    } else {
      if (!["6s", "10s"].includes(currentDur)) updates.duration = "6s";
    }
  } else if (isVeo) {
    if (resolution === "480p") updates.resolution = "720p";
    if (duration !== "8s") updates.duration = "8s";
  } else if (isSeedance) {
    if (!["5s", "7s", "10s"].includes(duration || "")) updates.duration = "5s";
  } else if (isKlingO1) {
    if (resolution !== "1080p") updates.resolution = "1080p";
    if (!["5s", "10s"].includes(duration || "")) updates.duration = "5s";
  } else if (isKlingStd) {
    if (!["5s", "10s"].includes(duration || "")) updates.duration = "5s";
    if (resolution === "480p") updates.resolution = "720p";
  } else if (isGrok) {
    if (resolution !== "720p") updates.resolution = "720p";
    if (duration !== "6s") updates.duration = "6s";
  } else if (isSora) {
    if (!["4s", "8s", "12s"].includes(duration || "")) updates.duration = "8s";
    if (resolution === "480p") updates.resolution = "720p";
  } else if (isWan) {
    if (resolution === "480p") updates.resolution = "720p";
    if (!["5s", "10s"].includes(duration || "")) updates.duration = "5s";
  }
  return updates;
};
