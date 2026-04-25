import React, { useState, useEffect, useCallback } from "react";
import { NodeData, AnnotationItem } from "../../types";
import { Icons } from "../Icons";
import { EditableTitle } from "./Shared/NodeComponents";
import { MediaStack } from "./Shared/MediaStack";
import { ImageNodeToolbar } from "./Shared/ImageToolbar";
import {
  AnnotationOverlay,
  AnnotationRenderer,
  AnnotationToolbar,
} from "../Annotation";
import { GridSplitOverlay, GridSplitToolbar } from "../GridSplit";
import { LightingEditor, LightingGenerateParams } from "../LightingEditor";
import { AngleEditor, AngleGenerateParams } from "../AngleEditor";
import { useAnnotation } from "../../hooks/useAnnotation";
import { useAnnotationWithUndo } from "../../hooks/useAnnotationWithUndo";
import { useGridSplit } from "../../hooks/useGridSplit";
import { useGridSplitActions } from "../../hooks/useGridSplitActions";

// 原始图片节点属性
interface OriginalImageNodeProps {
  data: NodeData;
  updateData: (id: string, updates: Partial<NodeData>) => void;
  onMaximize?: (id: string) => void;
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpload?: (id: string) => void;
  isDark?: boolean;
  selected?: boolean;
  showControls?: boolean;
  onGridSplitCreateNodes?: (
    sourceNodeId: string,
    cells: { dataUrl: string; label: string; row: number; col: number }[],
  ) => void;
  onLightGenerate?: (id: string, params: LightingGenerateParams) => void;
  onAngleGenerate?: (id: string, params: AngleGenerateParams) => void;
}

// 原始图片节点组件
export const OriginalImageNode: React.FC<OriginalImageNodeProps> = ({
  data,
  updateData,
  onMaximize,
  onDownload,
  onDelete,
  onUpload,
  isDark = true,
  selected,
  showControls,
  onGridSplitCreateNodes,
  onLightGenerate,
  onAngleGenerate,
}) => {
  const containerBg = isDark ? "bg-[#1a1a1a]" : "bg-white";
  const hasResult = !!(data.imageSrc || data.videoSrc);
  const isSelectedAndStable = selected;
  const containerBorder = selected
    ? "border-yellow-400/80 node-selected-glow"
    : isDark
      ? "border-zinc-800"
      : "border-gray-200";

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

  const {
    handleGridSplitCreateNodes: handleGridSplitCreateNodesAction,
    handleGridSplitDownload,
  } = useGridSplitActions({ data, gridSplit, onGridSplitCreateNodes });

  // 灯光编辑
  const isLightEditing = !!data.isLightEditing;
  const toggleLightEdit = useCallback(() => {
    updateData(data.id, { isLightEditing: !data.isLightEditing });
  }, [data.id, data.isLightEditing, updateData]);
  const closeLightEdit = useCallback(() => {
    updateData(data.id, { isLightEditing: false });
  }, [data.id, updateData]);

  // 多角度编辑
  const isAngleEditing = !!data.isAngleEditing;
  const toggleAngleEdit = useCallback(() => {
    updateData(data.id, { isAngleEditing: !data.isAngleEditing });
  }, [data.id, data.isAngleEditing, updateData]);
  const closeAngleEdit = useCallback(() => {
    updateData(data.id, { isAngleEditing: false });
  }, [data.id, updateData]);

  // 决定显示哪张图：
  // - 标注模式 → 显示原图（标注覆盖层叠在原图上方）
  // - 非标注模式 + 有烘焙图 → 显示烘焙图（标注已合成为图片）
  // - 非标注模式 + 无烘焙图 → 显示原图
  const displaySrc =
    isAnnotating || isGridSplitting || isLightEditing || isAngleEditing
      ? data.videoSrc || data.imageSrc
      : data.annotatedImageSrc || data.videoSrc || data.imageSrc;

  return (
    <>
      <div className="absolute bottom-full left-0 w-full mb-2 flex items-center justify-between pointer-events-auto">
        <EditableTitle
          title={data.title}
          onUpdate={(t) => updateData(data.id, { title: t })}
          isDark={isDark}
        />
      </div>

      <div
        className={`w-full h-full relative group rounded-xl border ${containerBorder} ${containerBg} ${data.isStackOpen || (hasResult && (data.outputArtifacts || []).length > 1) || isAnnotating || isGridSplitting || isLightEditing || isAngleEditing || (hasResult && isSelectedAndStable && showControls) ? "overflow-visible" : "overflow-hidden"} shadow-lg transition-all duration-200`}
      >
        {/* 顶部工具栏（标注/宫格切分/灯光编辑/多角度编辑模式下隐藏） */}
        {hasResult &&
          isSelectedAndStable &&
          showControls &&
          !isAnnotating &&
          !isGridSplitting &&
          !isLightEditing &&
          !isAngleEditing && (
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
              onCreateNodes={handleGridSplitCreateNodesAction}
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
            <MediaStack
              data={data}
              updateData={updateData}
              currentSrc={displaySrc}
              type={data.videoSrc ? "video" : "image"}
              onMaximize={onMaximize}
              isDark={isDark}
              selected={selected}
            />

            {/* 悬停覆盖层（标题） */}
            {!isAnnotating &&
              !isGridSplitting &&
              !isLightEditing &&
              !isAngleEditing && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
                </div>
              )}

            {/* 只读标注渲染（仅当有标注但没有烘焙图时才显示SVG叠加） */}
            {!isAnnotating &&
              !isGridSplitting &&
              !isLightEditing &&
              !isAngleEditing &&
              !data.annotatedImageSrc &&
              (data.annotations?.length || 0) > 0 && (
                <AnnotationRenderer
                  annotations={data.annotations || []}
                  width={data.width}
                  height={data.height}
                />
              )}

            {/* 标注覆盖层（标注模式下可编辑，叠在原图上方） */}
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
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
            <div
              className={`w-16 h-16 rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg group/icon ${isDark ? "bg-zinc-900 border-zinc-700 hover:bg-zinc-800" : "bg-gray-50 border-gray-200 hover:bg-gray-100"} hover:text-yellow-400 hover:border-yellow-500/50`}
              onClick={(e) => {
                e.stopPropagation();
                if (onUpload) onUpload(data.id);
              }}
            >
              <Icons.Upload
                size={28}
                className={`transition-colors ${isDark ? "text-zinc-500 group-hover/icon:text-yellow-400" : "text-gray-400 group-hover/icon:text-yellow-500"}`}
              />
            </div>
            <span
              className={`text-[11px] font-medium select-none ${isDark ? "text-zinc-500" : "text-gray-500"}`}
            >
              Click icon to Upload
            </span>
          </div>
        )}
      </div>

      {/* 灯光编辑器 - 与节点同级定位 */}
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
          />
        </div>
      )}

      {/* 多角度编辑器 - 与节点同级定位 */}
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
          />
        </div>
      )}
    </>
  );
};
