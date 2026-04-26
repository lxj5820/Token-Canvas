import React, { useState, useEffect, useCallback } from "react";
import { NodeData, AnnotationItem } from "../../types";
import { Icons } from "../Icons";
import {
  getModelConfig,
  MODEL_REGISTRY,
  getVisibleModels,
} from "../../services/geminiService";
import { IMAGE_HANDLERS } from "../../services/mode/image/configurations";
import {
  LocalEditableTitle,
  LocalCustomDropdown,
  LocalInputThumbnails,
  LocalMediaStack,
  safeDownload,
} from "./Shared/LocalNodeComponents";
import { ImageNodeToolbar } from "./Shared/ImageToolbar";
import {
  AnnotationOverlay,
  AnnotationRenderer,
  AnnotationToolbar,
} from "../Annotation";
import { GridSplitOverlay, GridSplitToolbar } from "../GridSplit";
import { AngleEditor, AngleGenerateParams } from "../AngleEditor";
import { LightingEditor, LightingGenerateParams } from "../LightingEditor";
import { useAnnotation } from "../../hooks/useAnnotation";
import { useAnnotationWithUndo } from "../../hooks/useAnnotationWithUndo";
import { useGridSplit } from "../../hooks/useGridSplit";
import { useGridSplitActions } from "../../hooks/useGridSplitActions";
import { getOptimizePrompt } from "../AIPanel";

// 文本到图片节点属性
interface TextToImageNodeProps {
  data: NodeData;
  updateData: (id: string, updates: Partial<NodeData>) => void;
  onGenerate: (id: string) => void;
  selected?: boolean;
  showControls?: boolean;
  inputs?: string[];
  onMaximize?: (id: string) => void;
  onDownload?: (id: string) => void;
  isDark?: boolean;
  isSelecting?: boolean;
  onGridSplitCreateNodes?: (
    sourceNodeId: string,
    cells: { dataUrl: string; label: string; row: number; col: number }[],
  ) => void;
  onAngleGenerate?: (id: string, params: AngleGenerateParams) => void;
  onLightGenerate?: (id: string, params: LightingGenerateParams) => void;
}

// 文本到图片节点组件
export const TextToImageNode: React.FC<TextToImageNodeProps> = ({
  data,
  updateData,
  onGenerate,
  selected,
  showControls,
  inputs = [],
  onMaximize,
  onDownload,
  isDark = true,
  isSelecting,
  onGridSplitCreateNodes,
  onAngleGenerate,
  onLightGenerate,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [deferredInputs, setDeferredInputs] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [imageModels, setImageModels] = useState<string[]>([]);

  // 标注功能
  const {
    isAnnotating,
    toggleAnnotate,
    handleAnnotationsChange,
    handleCloseAnnotation,
  } = useAnnotation(data, updateData);

  const {
    annotationTool,
    setAnnotationTool,
    annotationColor,
    setAnnotationColor,
    annotationStrokeWidth,
    setAnnotationStrokeWidth,
    handleAnnotationsChangeWithRedo,
    handleAnnotationUndo,
    handleAnnotationRedo,
    handleAnnotationClear,
    undoneAnnotations,
  } = useAnnotationWithUndo({ data, handleAnnotationsChange });

  const {
    gridSplit,
    isGridSplitting,
    enterGridSplit,
    exitGridSplit,
    setGridSize,
    toggleCell,
    selectAllCells,
    deselectAllCells,
  } = useGridSplit(data, updateData);

  const handleGridSplit = useCallback(
    (rows: number, cols: number) => {
      enterGridSplit(rows, cols);
    },
    [enterGridSplit],
  );

  const { handleGridSplitCreateNodes, handleGridSplitDownload } =
    useGridSplitActions({ data, gridSplit, onGridSplitCreateNodes });

  // 多角度编辑
  const isAngleEditing = !!data.isAngleEditing;
  const toggleAngleEdit = useCallback(() => {
    updateData(data.id, { isAngleEditing: !data.isAngleEditing });
  }, [data.id, data.isAngleEditing, updateData]);
  const closeAngleEdit = useCallback(() => {
    updateData(data.id, { isAngleEditing: false });
  }, [data.id, updateData]);

  // 灯光编辑
  const isLightEditing = !!data.isLightEditing;
  const toggleLightEdit = useCallback(() => {
    updateData(data.id, { isLightEditing: !data.isLightEditing });
  }, [data.id, data.isLightEditing, updateData]);
  const closeLightEdit = useCallback(() => {
    updateData(data.id, { isLightEditing: false });
  }, [data.id, updateData]);

  const isSelectedAndStable = selected && !isSelecting;

  // 检查模型配置已加载
  const checkConfig = useCallback(() => {
    const mName = data.model || "Banana 2";
    const cfg = getModelConfig(mName);
    setIsConfigured(!!cfg.key);
  }, [data.model]);

  // 更新可见模型列表
  const updateModels = useCallback(() => {
    const visibleModels = getVisibleModels();
    const models = visibleModels.filter(
      (k) => MODEL_REGISTRY[k]?.category === "IMAGE",
    );
    setImageModels(models);
  }, []);

  // 初始化时检查模型配置和注册
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

  useEffect(() => {
    if (isSelectedAndStable && showControls) {
      const t = setTimeout(() => setDeferredInputs(true), 100);
      return () => clearTimeout(t);
    } else setDeferredInputs(false);
  }, [isSelectedAndStable, showControls]);

  // 获取当前模型的规则配置
  const currentModel = data.model || "Banana 2";
  const handler = IMAGE_HANDLERS[currentModel] || IMAGE_HANDLERS["Banana 2"];
  const rules = handler.rules;
  const supportedResolutions = rules.resolutions || ["1k"];
  const supportedRatios = rules.ratios || ["1:1", "16:9"];
  const canOptimize = !!rules.hasPromptExtend;

  // 处理比例变化
  const handleRatioChange = (ratio: string) => {
    const currentShort = Math.min(data.width, data.height);
    const baseSize = Math.max(currentShort, 400);

    const sizeRatio = ratio === "auto" ? "1:1" : ratio;
    const [wStr, hStr] = sizeRatio.split(":");
    const wR = parseFloat(wStr);
    const hR = parseFloat(hStr);
    const r = wR / hR;

    let newW, newH;
    if (r >= 1) {
      newH = baseSize;
      newW = baseSize * r;
    } else {
      newW = baseSize;
      newH = baseSize / r;
    }
    updateData(data.id, {
      aspectRatio: ratio,
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  const hasResult = !!data.imageSrc && !data.isLoading;

  // 自动修正参数
  useEffect(() => {
    if (data.aspectRatio && !supportedRatios.includes(data.aspectRatio))
      updateData(data.id, { aspectRatio: "1:1" });
    if (data.resolution && !supportedResolutions.includes(data.resolution))
      updateData(data.id, { resolution: supportedResolutions[0] });
  }, [
    data.model,
    data.aspectRatio,
    data.resolution,
    data.id,
    updateData,
    supportedRatios,
    supportedResolutions,
  ]);

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
    ? "bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 focus:border-yellow-500 text-white placeholder-zinc-500"
    : "bg-gray-50 hover:bg-white border-gray-200 focus:border-yellow-500 text-gray-900 placeholder-gray-400";
  const emptyStateIconColor = isDark
    ? "bg-zinc-800/50 text-zinc-500"
    : "bg-gray-100 text-gray-400";
  const emptyStateTextColor = isDark ? "text-zinc-500" : "text-gray-400";

  return (
    <>
      <div
        className={`w-full h-full relative rounded-2xl border ${containerBorder} ${containerBg} ${data.isStackOpen || isAnnotating || isGridSplitting || isAngleEditing || isLightEditing || (hasResult && isSelectedAndStable && showControls) ? "overflow-visible" : "overflow-hidden"} shadow-xl group transition-all duration-200`}
      >
        {/* 顶部工具栏（标注/宫格切分/角度编辑/灯光编辑模式下隐藏） */}
        {hasResult &&
          isSelectedAndStable &&
          showControls &&
          !isAnnotating &&
          !isGridSplitting &&
          !isAngleEditing &&
          !isLightEditing && (
            <div
              className="absolute top-[-18px] left-1/2 -translate-x-1/2 -translate-y-full z-[1001] pointer-events-auto"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <ImageNodeToolbar
                imageSrc={data.annotatedImageSrc || data.imageSrc}
                nodeId={data.id}
                onMaximize={onMaximize}
                onAnnotate={toggleAnnotate}
                isAnnotating={isAnnotating}
                isDark={isDark}
                onGridSplit={handleGridSplit}
                onAngleEdit={toggleAngleEdit}
                isAngleEditing={isAngleEditing}
                onLightEdit={toggleLightEdit}
                isLightEditing={isLightEditing}
              />
            </div>
          )}

        {/* 宫格切分工具栏 */}
        {isGridSplitting && gridSplit && (
          <div
            className="absolute top-[-18px] left-1/2 -translate-x-1/2 -translate-y-full z-[1003] pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GridSplitToolbar
              rows={gridSplit.rows}
              cols={gridSplit.cols}
              selectedCount={gridSplit.selectedCells.length}
              totalCount={gridSplit.rows * gridSplit.cols}
              onSetSize={setGridSize}
              onClose={exitGridSplit}
              onSelectAll={selectAllCells}
              onDeselectAll={deselectAllCells}
              onCreateNodes={handleGridSplitCreateNodes}
              onDownload={handleGridSplitDownload}
              isDark={isDark}
            />
          </div>
        )}

        {/* 标注工具栏（与图片工具栏同位置） */}
        {isAnnotating && (
          <div
            className="absolute top-[-18px] left-1/2 -translate-x-1/2 -translate-y-full z-[1003] pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <AnnotationToolbar
              activeTool={annotationTool}
              onToolChange={setAnnotationTool}
              currentColor={annotationColor}
              onColorChange={setAnnotationColor}
              strokeWidth={annotationStrokeWidth}
              onStrokeWidthChange={setAnnotationStrokeWidth}
              onUndo={handleAnnotationUndo}
              onRedo={handleAnnotationRedo}
              onClear={handleAnnotationClear}
              canUndo={(data.annotations?.length || 0) > 0}
              canRedo={undoneAnnotations.length > 0}
              onClose={handleCloseAnnotation}
              isDark={isDark}
            />
          </div>
        )}

        {hasResult ? (
          <>
            {/* 标注模式/宫格切分/角度编辑/灯光编辑模式显示原图+覆盖层，非标注模式显示烘焙图 */}
            <LocalMediaStack
              data={data}
              updateData={updateData}
              currentSrc={
                isAnnotating ||
                isGridSplitting ||
                isAngleEditing ||
                isLightEditing
                  ? data.imageSrc
                  : data.annotatedImageSrc || data.imageSrc
              }
              onMaximize={onMaximize}
              isDark={isDark}
              selected={selected}
            />

            {/* 悬停覆盖层（标题和操作） */}
            {!isAnnotating &&
              !isGridSplitting &&
              !isAngleEditing &&
              !isLightEditing && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  {/* Top Gradient顶部渐变 */}
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />

                  {/* 标题 */}
                  <div className="absolute top-3 left-3 pointer-events-auto">
                    <LocalEditableTitle
                      title={data.title}
                      onUpdate={(t) => updateData(data.id, { title: t })}
                      isDark={true}
                    />
                  </div>
                </div>
              )}

            {/* 只读标注渲染（仅当有标注但没有烘焙图时才显示SVG叠加） */}
            {!isAnnotating &&
              !isGridSplitting &&
              !isAngleEditing &&
              !isLightEditing &&
              !data.annotatedImageSrc &&
              (data.annotations?.length || 0) > 0 && (
                <AnnotationRenderer
                  annotations={data.annotations || []}
                  width={data.width}
                  height={data.height}
                />
              )}

            {/* 标注覆盖层（标注模式下可编辑） */}
            {isAnnotating && (
              <AnnotationOverlay
                width={data.width}
                height={data.height}
                annotations={data.annotations || []}
                onAnnotationsChange={handleAnnotationsChangeWithRedo}
                onClose={handleCloseAnnotation}
                isDark={isDark}
                activeTool={annotationTool}
                onActiveToolChange={setAnnotationTool}
                currentColor={annotationColor}
                onCurrentColorChange={setAnnotationColor}
                strokeWidth={annotationStrokeWidth}
                onStrokeWidthChange={setAnnotationStrokeWidth}
              />
            )}

            {/* 宫格切分覆盖层 */}
            {isGridSplitting && gridSplit && (
              <GridSplitOverlay
                width={data.width}
                height={data.height}
                rows={gridSplit.rows}
                cols={gridSplit.cols}
                selectedCells={gridSplit.selectedCells}
                onToggleCell={toggleCell}
                isDark={isDark}
              />
            )}
          </>
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center ${emptyStateTextColor}`}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${emptyStateIconColor}`}
            >
              <Icons.Image size={28} className="opacity-60" />
            </div>
            <span className="text-sm font-medium opacity-60">生图</span>
            <span className="text-xs opacity-40 mt-1">选中节点开始创作</span>
          </div>
        )}

        {/* 加载覆盖层 */}
        {data.isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <Icons.Loader2
              size={32}
              className="text-yellow-500 animate-spin mb-3"
            />
            <span className="text-white/80 text-sm font-medium">生成中...</span>
          </div>
        )}
      </div>

      {/* 控制面板 */}
      {isSelectedAndStable &&
        showControls &&
        !isAnnotating &&
        !isGridSplitting &&
        !isAngleEditing &&
        !isLightEditing && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 min-w-[520px] pt-4 z-[70] pointer-events-auto"
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
              {/* 提示词输入框 */}
              <textarea
                className={`w-full border rounded-xl px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/20 min-h-[72px] no-scrollbar transition-all ${inputBg}`}
                placeholder="描述你想要生成的图片..."
                value={data.prompt || ""}
                onChange={(e) =>
                  updateData(data.id, { prompt: e.target.value })
                }
                onWheel={(e) => e.stopPropagation()}
              />

              {/* 参数行 - 全部在一行 */}
              <div className="flex items-center gap-2">
                <LocalCustomDropdown
                  options={imageModels}
                  value={data.model || "Banana 2"}
                  onChange={(val: string) => updateData(data.id, { model: val })}
                  isOpen={activeDropdown === "model"}
                  onToggle={() =>
                    setActiveDropdown(
                      activeDropdown === "model" ? null : "model",
                    )
                  }
                  onClose={() => setActiveDropdown(null)}
                  align="left"
                  width="w-[130px]"
                  isDark={isDark}
                />
                <LocalCustomDropdown
                  icon={Icons.Crop}
                  options={supportedRatios}
                  value={data.aspectRatio || "1:1"}
                  onChange={handleRatioChange}
                  isOpen={activeDropdown === "ratio"}
                  onToggle={() =>
                    setActiveDropdown(
                      activeDropdown === "ratio" ? null : "ratio",
                    )
                  }
                  onClose={() => setActiveDropdown(null)}
                  isDark={isDark}
                />
                <LocalCustomDropdown
                  icon={Icons.Monitor}
                  options={supportedResolutions}
                  value={data.resolution || "1k"}
                  onChange={(val: string) =>
                    updateData(data.id, { resolution: val })
                  }
                  isOpen={activeDropdown === "res"}
                  onToggle={() =>
                    setActiveDropdown(activeDropdown === "res" ? null : "res")
                  }
                  onClose={() => setActiveDropdown(null)}
                  disabledOptions={["1k", "2k", "4k"].filter(
                    (r) => !supportedResolutions.includes(r),
                  )}
                  isDark={isDark}
                />
                <LocalCustomDropdown
                  icon={Icons.Layers}
                  options={[1, 2, 3, 4]}
                  value={data.count || 1}
                  onChange={(val: string) => updateData(data.id, { count: val })}
                  isOpen={activeDropdown === "count"}
                  onToggle={() =>
                    setActiveDropdown(
                      activeDropdown === "count" ? null : "count",
                    )
                  }
                  onClose={() => setActiveDropdown(null)}
                  isDark={isDark}
                />
                <button
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
                    data.isOptimizing
                      ? isDark
                        ? "text-yellow-400 bg-yellow-500/20 border-yellow-500/30 animate-pulse"
                        : "text-yellow-600 bg-yellow-100 border-yellow-200 animate-pulse"
                      : data.promptOptimize
                        ? isDark
                          ? "text-yellow-400 bg-yellow-500/20 border-yellow-500/30"
                          : "text-yellow-600 bg-yellow-100 border-yellow-200"
                        : isDark
                          ? "text-zinc-400 hover:text-white border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700"
                          : "text-gray-400 hover:text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={async () => {
                    if (data.isOptimizing) return;
                    const optimizeFn = getOptimizePrompt();
                    if (!optimizeFn) {
                      alert("请先在 AI 助手中配置 API Key");
                      return;
                    }
                    if (!data.prompt?.trim()) {
                      alert("请先输入提示词");
                      return;
                    }
                    updateData(data.id, { isOptimizing: true });
                    try {
                      const optimized = await optimizeFn(data.prompt);
                      updateData(data.id, {
                        prompt: optimized,
                        isOptimizing: false,
                      });
                    } catch (e) {
                      alert(
                        `优化失败: ${e instanceof Error ? e.message : "未知错误"}`,
                      );
                      updateData(data.id, { isOptimizing: false });
                    }
                  }}
                  title={data.isOptimizing ? "优化中..." : "AI 优化提示词"}
                >
                  {data.isOptimizing ? (
                    <Icons.Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Icons.Sparkles
                      size={15}
                      fill={data.promptOptimize ? "currentColor" : "none"}
                    />
                  )}
                </button>

                {/* 占位符 */}
                <div className="flex-1" />

                {/* 生成按钮 */}
                <button
                  onClick={() => onGenerate(data.id)}
                  disabled={data.isLoading || !isConfigured}
                  title={!isConfigured ? "请在设置中配置 API Key" : "开始生成"}
                  className={`shrink-0 h-8 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-all active:scale-[0.98] ${
                    data.isLoading || !isConfigured
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40"
                  }`}
                >
                  {data.isLoading ? (
                    <Icons.Loader2 className="animate-spin" size={15} />
                  ) : (
                    <Icons.Wand2 size={15} />
                  )}
                  <span>{data.isLoading ? "生成中" : "生成"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* 多角度编辑器 - 与控制面板同级定位 */}
      {isAngleEditing && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 min-w-[520px] pt-4 z-[70] pointer-events-auto nodrag nowheel"
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <AngleEditor
            imageSrc={data.imageSrc || ""}
            onClose={closeAngleEdit}
            onGenerate={(params) => onAngleGenerate?.(data.id, params)}
            isDark={isDark}
            prompt={data.prompt}
            isLoading={data.isLoading}
            model={data.model || "Banana 2"}
            aspectRatio={data.aspectRatio || "1:1"}
            resolution={data.resolution || "1k"}
            imageModels={imageModels}
          />
        </div>
      )}

      {/* 灯光编辑器 - 与控制面板同级定位 */}
      {isLightEditing && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 min-w-[520px] pt-4 z-[70] pointer-events-auto nodrag nowheel"
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <LightingEditor
            imageSrc={data.imageSrc || ""}
            onClose={closeLightEdit}
            onGenerate={(params) => onLightGenerate?.(data.id, params)}
            isDark={isDark}
            prompt={data.prompt}
            isLoading={data.isLoading}
            model={data.model || "Banana 2"}
            aspectRatio={data.aspectRatio || "1:1"}
            resolution={data.resolution || "1k"}
            imageModels={imageModels}
          />
        </div>
      )}
    </>
  );
};
