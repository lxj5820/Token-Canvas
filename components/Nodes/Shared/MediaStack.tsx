import React, { useRef, useEffect, useState } from "react";
import { NodeData } from "../../../types";
import { Icons } from "../../Icons";
import { VideoPreview, safeDownload } from "./NodeComponents";

interface MediaStackProps {
  data: NodeData;
  updateData: (id: string, updates: Partial<NodeData>) => void;
  currentSrc: string | undefined;
  type: "image" | "video";
  onMaximize?: (id: string) => void;
  isDark?: boolean;
  selected?: boolean;
}

const STACK_LAYERS = 3;
const OFFSET_X = 10;
const OFFSET_Y = 4;
const SCALE_STEP = 0.03;
const ROTATE_STEP = 2;

export const MediaStack: React.FC<MediaStackProps> = ({
  data,
  updateData,
  currentSrc,
  type,
  onMaximize,
  isDark = true,
  selected,
}) => {
  const stackRef = useRef<HTMLDivElement>(null);
  const [isHoveringStack, setIsHoveringStack] = useState(false);
  const artifacts = data.outputArtifacts || [];
  const sortedArtifacts = currentSrc
    ? [currentSrc, ...artifacts.filter((a) => a !== currentSrc)]
    : artifacts;
  const hasMultipleImages = !data.isStackOpen && artifacts.length > 1;

  const [browseIndex, setBrowseIndex] = useState(0);

  useEffect(() => {
    setBrowseIndex(0);
  }, [currentSrc]);

  const browseSrc = sortedArtifacts[browseIndex] || currentSrc;
  const totalImages = sortedArtifacts.length;

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBrowseIndex((prev) => (prev > 0 ? prev - 1 : totalImages - 1));
  };
  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBrowseIndex((prev) => (prev < totalImages - 1 ? prev + 1 : 0));
  };
  const setAsMain = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (browseSrc && browseSrc !== currentSrc) {
      const update =
        type === "image" ? { imageSrc: browseSrc } : { videoSrc: browseSrc };
      updateData(data.id, update);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        data.isStackOpen &&
        stackRef.current &&
        !stackRef.current.contains(event.target as Node)
      ) {
        updateData(data.id, { isStackOpen: false });
      }
    };
    if (data.isStackOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [data.isStackOpen, data.id, updateData]);

  useEffect(() => {
    if (!selected && data.isStackOpen)
      updateData(data.id, { isStackOpen: false });
  }, [selected, data.isStackOpen, data.id, updateData]);

  if (data.isStackOpen) {
    return (
      <div
        ref={stackRef}
        className="absolute top-0 left-0 h-full flex gap-4 z-[100] animate-in fade-in zoom-in-95 duration-200"
      >
        {sortedArtifacts.map((src, index) => {
          const isMain = src === currentSrc;
          return (
            <div
              key={src + index}
              className={`relative h-full rounded-xl border ${isDark ? "border-zinc-800 bg-black" : "border-gray-200 bg-white"} overflow-hidden shadow-2xl flex-shrink-0 group/card ${isMain ? "ring-2 ring-cyan-500/50" : ""}`}
              style={{ width: data.width }}
            >
              {type === "image" ? (
                <img
                  src={src}
                  className={`w-full h-full object-contain ${isDark ? "bg-[#09090b]" : "bg-gray-50"}`}
                  draggable={false}
                  onMouseDown={(e) => e.preventDefault()}
                />
              ) : (
                <video
                  src={src}
                  className="w-full h-full object-cover"
                  controls={isMain}
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              )}

              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-20 pointer-events-auto">
                {!isMain && (
                  <button
                    className="h-6 px-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-md text-[9px] font-bold text-white transition-colors flex items-center gap-1 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const update =
                        type === "image"
                          ? { imageSrc: src }
                          : { videoSrc: src };
                      updateData(data.id, { ...update, isStackOpen: false });
                    }}
                  >
                    <Icons.Check size={10} className="text-cyan-400" />
                    <span>Main</span>
                  </button>
                )}
                <button
                  className="w-6 h-6 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-md text-white transition-colors shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMaximize?.(data.id);
                  }}
                >
                  <Icons.Maximize2 size={12} />
                </button>
                <button
                  className="w-6 h-6 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-md text-white transition-colors shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    safeDownload(src, type);
                  }}
                >
                  <Icons.Download size={12} />
                </button>
              </div>

              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] text-white font-mono border border-white/10 select-none">
                #{index + 1}
              </div>
            </div>
          );
        })}
        <div className="flex flex-col justify-center h-full pl-2 pr-6">
          <button
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800" : "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
            onClick={(e) => {
              e.stopPropagation();
              updateData(data.id, { isStackOpen: false });
            }}
          >
            <Icons.X size={20} />
          </button>
        </div>
      </div>
    );
  }

  const isVideo =
    type === "video" ||
    data.type === "TEXT_TO_VIDEO" ||
    (currentSrc && /\.(mp4|webm|mov|mkv)(\?|$)/i.test(currentSrc));

  const getStackCardStyle = (
    reverseIndex: number,
    isTop: boolean,
    hovering: boolean,
  ): React.CSSProperties => {
    const hoverSpread = hovering ? 1.6 : 1;
    const baseOffsetX = reverseIndex * OFFSET_X * hoverSpread;
    const baseOffsetY = reverseIndex * OFFSET_Y * hoverSpread;
    const baseScale = 1 - reverseIndex * SCALE_STEP;
    const baseRotate = reverseIndex * ROTATE_STEP;
    const hoverRotate = hovering ? reverseIndex * 0.5 : 0;

    return {
      left: isTop ? "0px" : `${baseOffsetX}px`,
      top: isTop ? "0px" : `${baseOffsetY}px`,
      width: "100%",
      height: "100%",
      zIndex: Math.min(sortedArtifacts.length, STACK_LAYERS) - reverseIndex,
      border: isDark
        ? "1px solid rgba(63, 63, 70, 0.6)"
        : "1px solid rgba(229, 231, 235, 0.8)",
      cursor: isTop ? "default" : "pointer",
      background: isDark ? "#171717" : "#ffffff",
      transform: isTop
        ? "scale(1) rotate(0deg)"
        : `scale(${baseScale}) rotate(${baseRotate + hoverRotate}deg)`,
      boxShadow: isTop
        ? "rgba(0, 0, 0, 0.24) 0px 8px 20px"
        : `rgba(0, 0, 0, ${0.2 + reverseIndex * 0.08}) 0px ${6 + reverseIndex * 4}px ${16 + reverseIndex * 6}px`,
      transition:
        "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.35s ease, left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    };
  };

  if (hasMultipleImages) {
    const visibleCount = Math.min(sortedArtifacts.length, STACK_LAYERS);
    const cards = sortedArtifacts.slice(0, visibleCount);

    return (
      <div
        className="absolute inset-0 overflow-visible rounded-xl"
        onMouseEnter={() => setIsHoveringStack(true)}
        onMouseLeave={() => setIsHoveringStack(false)}
      >
        {cards
          .slice()
          .reverse()
          .map((src, index) => {
            const reverseIndex = visibleCount - 1 - index;
            const isTop = reverseIndex === 0;
            return (
              <div
                key={src + index}
                className="absolute overflow-hidden rounded-xl"
                style={getStackCardStyle(reverseIndex, isTop, isHoveringStack)}
                onClick={
                  isTop
                    ? undefined
                    : (e: React.MouseEvent) => {
                        e.stopPropagation();
                        updateData(data.id, { isStackOpen: true });
                      }
                }
              >
                {type === "image" ? (
                  <img
                    src={src}
                    className={`w-full h-full object-contain ${isDark ? "bg-[#09090b]" : "bg-gray-50"}`}
                    draggable={false}
                    onMouseDown={(e) => e.preventDefault()}
                  />
                ) : (
                  <VideoPreview src={src} isDark={isDark || false} />
                )}

                {isTop && (
                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-auto"
                    style={{ zIndex: 10 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors shrink-0"
                      onClick={goToPrev}
                    >
                      <Icons.ChevronLeft size={14} />
                    </button>

                    <div className="flex items-center gap-1 overflow-x-auto max-w-[60%] px-1">
                      {sortedArtifacts.map((s, i) => (
                        <button
                          key={s + i}
                          className={`w-6 h-6 rounded border-2 shrink-0 overflow-hidden transition-all ${
                            i === browseIndex
                              ? "border-cyan-400 ring-1 ring-cyan-400/50 scale-110"
                              : "border-white/20 hover:border-white/50 opacity-60 hover:opacity-100"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setBrowseIndex(i);
                          }}
                        >
                          <img
                            src={s}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </button>
                      ))}
                    </div>

                    <button
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors shrink-0"
                      onClick={goToNext}
                    >
                      <Icons.ChevronRight size={14} />
                    </button>

                    <div className="flex items-center gap-1.5 ml-1 shrink-0">
                      <span className="text-[10px] text-white/70 font-mono tabular-nums select-none">
                        {browseIndex + 1}/{totalImages}
                      </span>
                      {browseSrc !== currentSrc && (
                        <button
                          className="h-5 px-1.5 bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-400/40 rounded text-[8px] font-bold text-cyan-300 transition-colors flex items-center gap-0.5 shrink-0"
                          onClick={setAsMain}
                        >
                          <Icons.Check size={8} />
                          <span>主图</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        <div
          className="absolute top-2 right-2 pointer-events-auto"
          style={{ zIndex: STACK_LAYERS + 1 }}
        >
          <button
            className="flex items-center gap-1 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white text-[10px] px-2.5 py-1.5 rounded-lg border border-white/10 shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              updateData(data.id, { isStackOpen: true });
            }}
          >
            <Icons.Layers size={11} className="text-cyan-400" />
            <span className="font-bold tabular-nums">
              {sortedArtifacts.length}
            </span>
            <Icons.ChevronRight size={10} className="text-zinc-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isVideo ? (
        currentSrc && <VideoPreview src={currentSrc} isDark={isDark || false} />
      ) : (
        <img
          src={browseSrc || currentSrc}
          className={`w-full h-full object-contain pointer-events-none ${isDark ? "bg-[#09090b]" : "bg-gray-50"}`}
          alt="Generated"
          draggable={false}
        />
      )}
    </>
  );
};
