import React, { useState, useEffect, useCallback, useMemo } from "react";
import { NodeData } from "../../types";
import { Icons } from "../Icons";
import {
  getModelConfig,
  MODEL_REGISTRY,
  getVisibleModels,
} from "../../services/geminiService";
import { AUDIO_HANDLERS } from "../../services/mode/audio/configurations";
import {
  LocalEditableTitle,
  LocalCustomDropdown,
  LocalInputThumbnails,
} from "./Shared/LocalNodeComponents";

interface TextToAudioNodeProps {
  data: NodeData;
  updateData: (id: string, updates: Partial<NodeData>) => void;
  onGenerate: (id: string) => void;
  selected?: boolean;
  showControls?: boolean;
  inputs?: string[];
  onDownload?: (id: string) => void;
  isDark?: boolean;
  isSelecting?: boolean;
}

const AUDIO_STYLES = [
  "pop",
  "rock",
  "electronic",
  "jazz",
  "classical",
  "folk",
  "rap",
  "ambient",
  "R&B",
  "metal",
  "blues",
  "country",
];
const AUDIO_DURATIONS = ["30s", "60s", "120s"];
const AUDIO_MODES = ["fast", "extended"];
const AUDIO_QUALITIES = ["standard", "high"];

export const TextToAudioNode: React.FC<TextToAudioNodeProps> = ({
  data,
  updateData,
  onGenerate,
  selected,
  showControls,
  inputs = [],
  onDownload,
  isDark = true,
  isSelecting,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [deferredInputs, setDeferredInputs] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isConfigured, setIsConfigured] = useState(true);
  const [audioModels, setAudioModels] = useState<string[]>([]);
  const [seedInput, setSeedInput] = useState("");

  const isSelectedAndStable = selected && !isSelecting;

  const checkConfig = useCallback(() => {
    const mName = data.model || "Suno";
    const cfg = getModelConfig(mName);
    setIsConfigured(!!cfg.key);
  }, [data.model]);

  const updateModels = useCallback(() => {
    const visibleModels = getVisibleModels();
    const models = visibleModels.filter(
      (k) => MODEL_REGISTRY[k]?.category === "AUDIO",
    );
    setAudioModels(models.length > 0 ? models : ["Suno", "Suno 3.5"]);
  }, []);

  useEffect(() => {
    checkConfig();
    updateModels();
    window.addEventListener("modelConfigUpdated", checkConfig);
    window.addEventListener("modelRegistryUpdated", updateModels);
    return () => {
      window.removeEventListener("modelConfigUpdated", checkConfig);
      window.removeEventListener("modelRegistryUpdated", updateModels);
    };
  }, [checkConfig, updateModels]);

  // Update seed when data changes
  useEffect(() => {
    if (data.seed !== undefined && data.seed !== -1) {
      setSeedInput(String(data.seed));
    }
  }, [data.seed]);

  useEffect(() => {
    if (isSelectedAndStable && showControls) {
      const t = setTimeout(() => setDeferredInputs(true), 100);
      return () => clearTimeout(t);
    } else setDeferredInputs(false);
  }, [isSelectedAndStable, showControls]);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (data.isLoading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) =>
          prev >= 95 ? 95 : prev + Math.max(0.5, (95 - prev) / 20),
        );
      }, 200);
    } else setProgress(0);
    return () => clearInterval(interval);
  }, [data.isLoading]);

  const currentModel = data.model || "Suno";
  const handler = AUDIO_HANDLERS[currentModel] || AUDIO_HANDLERS["Suno"];
  const rules = handler.rules;

  const styleOptions = rules.styles || AUDIO_STYLES;
  const durationOptions = rules.durations || AUDIO_DURATIONS;
  const modeOptions = rules.modes || AUDIO_MODES;
  const qualityOptions = rules.qualities || AUDIO_QUALITIES;

  const handleSeedChange = (value: string) => {
    setSeedInput(value);
    const num = parseInt(value);
    if (value === "") {
      updateData(data.id, { seed: -1 });
    } else if (!isNaN(num)) {
      updateData(data.id, { seed: num });
    }
  };

  const containerBg = isDark ? "bg-[#1a1a1a]" : "bg-white";
  const containerBorder = selected
    ? "border-yellow-400/80 node-selected-glow"
    : isDark
      ? "border-zinc-700/50"
      : "border-gray-200";
  const controlPanelBg = isDark
    ? "bg-[#1a1a1a]/95 backdrop-blur-xl border-zinc-700/50"
    : "bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl";
  const inputBg = isDark
    ? "bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 focus:border-green-500 text-white placeholder-zinc-500"
    : "bg-gray-50 hover:bg-white border-gray-200 focus:border-green-500 text-gray-900 placeholder-gray-400";
  const emptyStateIconColor = isDark
    ? "bg-zinc-800/50 text-zinc-500"
    : "bg-gray-100 text-gray-400";
  const emptyStateTextColor = isDark ? "text-zinc-500" : "text-gray-400";
  const hasResult = !!data.audioSrc && !data.isLoading;

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const handlePlayPause = () => {
    const audio = document.getElementById(
      `audio-${data.id}`,
    ) as HTMLAudioElement;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    const audio = document.getElementById(
      `audio-${data.id}`,
    ) as HTMLAudioElement;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = document.getElementById(
      `audio-${data.id}`,
    ) as HTMLAudioElement;
    if (audio) {
      setAudioDuration(audio.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = () => {
    if (data.audioSrc) {
      const link = document.createElement("a");
      link.href = data.audioSrc;
      link.download = `audio_${Date.now()}.mp3`;
      link.click();
    }
  };

  return (
    <>
      <div
        className={`w-full h-full relative rounded-2xl border ${containerBorder} ${containerBg} overflow-hidden shadow-xl group transition-all duration-200`}
      >
        {hasResult ? (
          <>
            {/* Audio Player */}
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              {/* Audio Visualizer Placeholder */}
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDark ? "bg-green-500/20" : "bg-green-100"}`}
              >
                <Icons.Music
                  size={32}
                  className={isDark ? "text-green-400" : "text-green-600"}
                />
              </div>

              {/* Song Title */}
              <div className="text-center mb-3">
                <p
                  className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {data.title}
                </p>
                <p
                  className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}
                >
                  {data.model || "Suno"} · {data.style || "pop"}
                </p>
              </div>

              {/* Progress Bar */}
              <div
                className={`w-full h-1 rounded-full mb-2 ${isDark ? "bg-zinc-700" : "bg-gray-200"}`}
              >
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width:
                      audioDuration > 0
                        ? `${(currentTime / audioDuration) * 100}%`
                        : "0%",
                  }}
                />
              </div>

              {/* Time */}
              <div
                className={`w-full flex justify-between text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(audioDuration)}</span>
              </div>

              {/* Play Controls */}
              <div className="flex items-center gap-4 mt-4">
                <button
                  onClick={handlePlayPause}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isDark
                      ? "bg-green-500 hover:bg-green-400 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {isPlaying ? (
                    <Icons.Pause size={20} />
                  ) : (
                    <Icons.Play size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Hover Overlay with Title & Actions */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              {/* Top Gradient */}
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />

              {/* Title */}
              <div className="absolute top-3 left-3 pointer-events-auto">
                <LocalEditableTitle
                  title={data.title}
                  onUpdate={(t) => updateData(data.id, { title: t })}
                  isDark={true}
                />
              </div>

              {/* Action Buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-auto">
                <button
                  title="下载"
                  className="w-8 h-8 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-md text-white/80 hover:text-white flex items-center justify-center transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                >
                  <Icons.Download size={16} />
                </button>
              </div>
            </div>

            {/* Hidden Audio Element */}
            <audio
              id={`audio-${data.id}`}
              src={data.audioSrc}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleAudioEnded}
            />
          </>
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center ${emptyStateTextColor}`}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${emptyStateIconColor}`}
            >
              <Icons.Music size={28} className="opacity-60" />
            </div>
            <span className="text-sm font-medium opacity-60">生音频</span>
            <span className="text-xs opacity-40 mt-1">选中节点开始创作</span>
          </div>
        )}

        {/* Loading Overlay with Progress */}
        {data.isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div className="relative w-16 h-16 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={isDark ? "#3f3f46" : "#e5e7eb"}
                  strokeWidth="4"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 1.76} 176`}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm tabular-nums">
                  {Math.floor(progress)}%
                </span>
              </div>
            </div>
            <span className="text-white/80 text-sm font-medium">
              音频生成中...
            </span>
          </div>
        )}
      </div>

      {/* Control Panel */}
      {isSelectedAndStable && showControls && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 min-w-[620px] pt-4 z-[70] pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {inputs.length > 0 && (
            <LocalInputThumbnails
              inputs={inputs}
              ready={deferredInputs}
              isDark={isDark}
            />
          )}
          <div
            className={`${controlPanelBg} rounded-2xl p-4 flex flex-col gap-3 border`}
          >
            {/* Prompt Input */}
            <textarea
              className={`w-full border rounded-xl px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 min-h-[72px] no-scrollbar transition-all ${inputBg}`}
              placeholder="描述你想要生成的音乐风格、内容、情绪..."
              value={data.prompt || ""}
              onChange={(e) => updateData(data.id, { prompt: e.target.value })}
              onWheel={(e) => e.stopPropagation()}
            />

            {/* Parameters Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Model Selector */}
              <LocalCustomDropdown
                options={audioModels}
                value={data.model || "Suno"}
                onChange={(val: string) => updateData(data.id, { model: val })}
                isOpen={activeDropdown === "model"}
                onToggle={() =>
                  setActiveDropdown(activeDropdown === "model" ? null : "model")
                }
                onClose={() => setActiveDropdown(null)}
                align="left"
                width="w-[110px]"
                isDark={isDark}
              />

              {/* Duration */}
              <LocalCustomDropdown
                icon={Icons.Clock}
                options={durationOptions}
                value={data.duration || "30s"}
                onChange={(val: string) => updateData(data.id, { duration: val })}
                isOpen={activeDropdown === "duration"}
                onToggle={() =>
                  setActiveDropdown(
                    activeDropdown === "duration" ? null : "duration",
                  )
                }
                onClose={() => setActiveDropdown(null)}
                isDark={isDark}
              />

              {/* Style */}
              <LocalCustomDropdown
                icon={Icons.Layers}
                options={styleOptions}
                value={data.style || "pop"}
                onChange={(val: string) => updateData(data.id, { style: val })}
                isOpen={activeDropdown === "style"}
                onToggle={() =>
                  setActiveDropdown(activeDropdown === "style" ? null : "style")
                }
                onClose={() => setActiveDropdown(null)}
                isDark={isDark}
              />

              {/* Mode (if supported) */}
              {modeOptions.length > 1 && (
                <LocalCustomDropdown
                  options={modeOptions}
                  value={data.mode || "fast"}
                  onChange={(val: string) => updateData(data.id, { mode: val })}
                  isOpen={activeDropdown === "mode"}
                  onToggle={() =>
                    setActiveDropdown(activeDropdown === "mode" ? null : "mode")
                  }
                  onClose={() => setActiveDropdown(null)}
                  align="left"
                  width="w-[90px]"
                  isDark={isDark}
                />
              )}

              {/* Count */}
              <LocalCustomDropdown
                icon={Icons.Images}
                options={[1, 2, 3, 4]}
                value={data.count || 1}
                onChange={(val: string) => updateData(data.id, { count: val })}
                isOpen={activeDropdown === "count"}
                onToggle={() =>
                  setActiveDropdown(activeDropdown === "count" ? null : "count")
                }
                onClose={() => setActiveDropdown(null)}
                isDark={isDark}
              />

              {/* Seed Input */}
              <div
                className={`flex items-center h-8 px-2 rounded-lg border ${isDark ? "bg-zinc-800/80 border-zinc-700" : "bg-gray-50 border-gray-200"}`}
              >
                <Icons.Hash
                  size={14}
                  className={isDark ? "text-zinc-500" : "text-gray-400"}
                />
                <input
                  type="text"
                  value={seedInput}
                  onChange={(e) => handleSeedChange(e.target.value)}
                  placeholder="随机"
                  className={`w-[50px] bg-transparent text-xs text-center focus:outline-none ${isDark ? "text-white placeholder-zinc-500" : "text-gray-900 placeholder-gray-400"}`}
                />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Generate Button */}
              <button
                onClick={() => onGenerate(data.id)}
                disabled={data.isLoading || !isConfigured}
                title={!isConfigured ? "请在设置中配置 API Key" : "开始生成"}
                className={`shrink-0 h-8 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-all active:scale-[0.98] ${
                  data.isLoading || !isConfigured
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
                }`}
              >
                {data.isLoading ? (
                  <Icons.Loader2 className="animate-spin" size={15} />
                ) : (
                  <Icons.Wand2 size={15} />
                )}
                <span>
                  {data.isLoading ? `${Math.floor(progress)}%` : "生成"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
