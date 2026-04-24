import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationItem, AnnotationTool, Point } from '../../types';

interface AnnotationOverlayProps {
  width: number;
  height: number;
  annotations: AnnotationItem[];
  onAnnotationsChange: (annotations: AnnotationItem[]) => void;
  onClose: () => void;
  isDark?: boolean;
  // 工具栏状态（由外部控制，工具栏已移到外部定位）
  activeTool?: AnnotationTool;
  onActiveToolChange?: (tool: AnnotationTool) => void;
  currentColor?: string;
  onCurrentColorChange?: (color: string) => void;
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
  onUndo?: () => void;
  onClear?: () => void;
}

const DEFAULT_COLOR = '#FFD700'; // 黄色标注
const DEFAULT_STROKE_WIDTH = 3;
const DEFAULT_FONT_SIZE = 16;

const generateId = (): string => {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).substr(2, 9); }
};

export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  width,
  height,
  annotations,
  onAnnotationsChange,
  onClose,
  isDark = true,
  activeTool: externalActiveTool,
  onActiveToolChange,
  currentColor: externalCurrentColor,
  onCurrentColorChange,
  strokeWidth: externalStrokeWidth,
  onStrokeWidthChange,
  onUndo,
  onClear,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 工具栏状态：外部可控，无外部时回退到内部默认
  const [internalActiveTool, setInternalActiveTool] = useState<AnnotationTool>('pen');
  const [internalCurrentColor, setInternalCurrentColor] = useState(DEFAULT_COLOR);
  const [internalStrokeWidth, setInternalStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const activeTool = externalActiveTool ?? internalActiveTool;
  const setActiveTool = onActiveToolChange ?? setInternalActiveTool;
  const currentColor = externalCurrentColor ?? internalCurrentColor;
  const setCurrentColor = onCurrentColorChange ?? setInternalCurrentColor;
  const strokeWidth = externalStrokeWidth ?? internalStrokeWidth;
  const setStrokeWidth = onStrokeWidthChange ?? setInternalStrokeWidth;

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [rectStart, setRectStart] = useState<Point | null>(null);
  const [rectPreview, setRectPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; id: string } | null>(null);
  const [textValue, setTextValue] = useState('');
  const [eraserCursorPos, setEraserCursorPos] = useState<Point | null>(null);

  // 绘制所有标注到 canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 按顺序渲染所有标注，橡皮擦用 destination-out 擦除之前绘制的内容
    annotations.forEach(item => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (item.tool) {
        case 'pen':
          ctx.strokeStyle = item.color;
          ctx.fillStyle = item.color;
          ctx.lineWidth = item.strokeWidth;
          if (item.points && item.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(item.points[0].x, item.points[0].y);
            for (let i = 1; i < item.points.length; i++) {
              ctx.lineTo(item.points[i].x, item.points[i].y);
            }
            ctx.stroke();
          } else if (item.points && item.points.length === 1) {
            ctx.beginPath();
            ctx.arc(item.points[0].x, item.points[0].y, item.strokeWidth / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case 'eraser':
          // 像素级擦除：和画笔使用完全相同的坐标，只是用 destination-out 合成模式
          if (item.points && item.points.length > 0) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = item.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(item.points[0].x, item.points[0].y);
            for (let i = 1; i < item.points.length; i++) {
              ctx.lineTo(item.points[i].x, item.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'rect':
          if (item.rect) {
            ctx.strokeStyle = item.color;
            ctx.fillStyle = item.color;
            ctx.lineWidth = item.strokeWidth;
            // 半透明填充高亮区域
            ctx.fillStyle = item.color + '20';
            ctx.fillRect(item.rect.x, item.rect.y, item.rect.width, item.rect.height);
            ctx.beginPath();
            ctx.rect(item.rect.x, item.rect.y, item.rect.width, item.rect.height);
            ctx.stroke();
          }
          break;

        case 'text':
          if (item.text) {
            const fontSize = item.fontSize || DEFAULT_FONT_SIZE;
            ctx.fillStyle = item.color;
            ctx.font = `bold ${fontSize}px "Inter", "SF Pro", system-ui, sans-serif`;
            ctx.fillText(item.text.content, item.text.x, item.text.y + fontSize);
          }
          break;
      }
      ctx.restore();
    });

    // 绘制当前正在画的路径（和画笔逻辑完全一致）
    if (isDrawing && currentPath.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (activeTool === 'pen') {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        ctx.stroke();
      } else if (activeTool === 'eraser') {
        // 和画笔完全相同的路径，只是用 destination-out 擦除
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 绘制矩形预览
    if (rectPreview) {
      ctx.save();
      ctx.fillStyle = currentColor + '15';
      ctx.fillRect(rectPreview.x, rectPreview.y, rectPreview.w, rectPreview.h);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rectPreview.x, rectPreview.y, rectPreview.w, rectPreview.h);
      ctx.restore();
    }
  }, [annotations, isDrawing, currentPath, activeTool, currentColor, strokeWidth, rectPreview]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // 获取 canvas 坐标（和画笔完全一致）
  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  // 将 canvas 坐标转换为容器本地 CSS 坐标（不受 ReactFlow 缩放影响）
  const getCSSPoint = (canvasPoint: Point): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    // 用 offsetWidth/offsetHeight（本地 CSS 尺寸），不用 getBoundingClientRect（屏幕尺寸含缩放）
    return {
      x: canvasPoint.x * (canvas.offsetWidth / canvas.width),
      y: canvasPoint.y * (canvas.offsetHeight / canvas.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (activeTool === 'text') {
      const point = getCanvasPoint(e);
      const id = generateId();
      setTextInput({ x: point.x, y: point.y, id });
      setTextValue('');
      return;
    }

    const point = getCanvasPoint(e);
    setIsDrawing(true);

    if (activeTool === 'pen' || activeTool === 'eraser') {
      setCurrentPath([point]);
    } else if (activeTool === 'rect') {
      setRectStart(point);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    // 更新橡皮擦光标位置（需要从屏幕坐标转换为容器本地坐标）
    if (activeTool === 'eraser') {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      // ReactFlow 缩放导致 rect（屏幕空间）和 offsetWidth（本地空间）不同
      const zoomX = rect.width / canvas.offsetWidth;
      const zoomY = rect.height / canvas.offsetHeight;
      setEraserCursorPos({
        x: (e.clientX - rect.left) / zoomX,
        y: (e.clientY - rect.top) / zoomY,
      });
    }
    if (!isDrawing) return;

    if (activeTool === 'pen' || activeTool === 'eraser') {
      setCurrentPath(prev => [...prev, point]);
    } else if (activeTool === 'rect' && rectStart) {
      setRectPreview({
        x: Math.min(rectStart.x, point.x),
        y: Math.min(rectStart.y, point.y),
        w: Math.abs(point.x - rectStart.x),
        h: Math.abs(point.y - rectStart.y),
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(e);
    setIsDrawing(false);

    if (activeTool === 'pen') {
      const newPath = [...currentPath, point];
      if (newPath.length > 0) {
        onAnnotationsChange([
          ...annotations,
          { id: generateId(), tool: 'pen', points: newPath, color: currentColor, strokeWidth },
        ]);
      }
      setCurrentPath([]);
    } else if (activeTool === 'eraser') {
      // 像素级橡皮擦：和画笔完全相同的坐标，保存为 eraser 记录，渲染时用 destination-out
      const eraserPath = [...currentPath, point];
      if (eraserPath.length > 0) {
        onAnnotationsChange([
          ...annotations,
          { id: generateId(), tool: 'eraser', points: eraserPath, color: currentColor, strokeWidth },
        ]);
      }
      setCurrentPath([]);
    } else if (activeTool === 'rect' && rectStart) {
      const rect = {
        x: Math.min(rectStart.x, point.x),
        y: Math.min(rectStart.y, point.y),
        width: Math.abs(point.x - rectStart.x),
        height: Math.abs(point.y - rectStart.y),
      };
      if (rect.width > 2 && rect.height > 2) {
        onAnnotationsChange([
          ...annotations,
          { id: generateId(), tool: 'rect', rect, color: currentColor, strokeWidth },
        ]);
      }
      setRectStart(null);
      setRectPreview(null);
    }
  };

  // 确认文字输入
  const confirmText = () => {
    if (textInput && textValue.trim()) {
      onAnnotationsChange([
        ...annotations,
        {
          id: textInput.id,
          tool: 'text',
          text: { x: textInput.x, y: textInput.y, content: textValue.trim() },
          color: currentColor,
          strokeWidth,
          fontSize: DEFAULT_FONT_SIZE,
        },
      ]);
    }
    setTextInput(null);
    setTextValue('');
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmText();
    } else if (e.key === 'Escape') {
      setTextInput(null);
      setTextValue('');
    }
    e.stopPropagation();
  };

  // 光标样式
  const cursorClass = activeTool === 'pen' ? 'cursor-crosshair'
    : activeTool === 'eraser' ? 'cursor-none'
    : activeTool === 'rect' ? 'cursor-crosshair'
    : 'cursor-text';

  // 橡皮擦光标尺寸：strokeWidth 在 canvas 坐标系中，映射到容器本地 CSS 像素
  // 用 offsetWidth（本地 CSS 尺寸，不受 ReactFlow 缩放影响）
  const getEraserCursorSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return strokeWidth;
    return strokeWidth * (canvas.offsetWidth / canvas.width);
  };
  const eraserCursorSize = getEraserCursorSize();
  const eraserCursorRadius = eraserCursorSize / 2;

  return (
    <div
      className="absolute inset-0 z-[1000]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 绘制画布 */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`absolute inset-0 w-full h-full ${cursorClass}`}
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setEraserCursorPos(null);
          if (isDrawing) {
            setIsDrawing(false);
            setCurrentPath([]);
            setRectStart(null);
            setRectPreview(null);
          }
        }}
      />

      {/* 橡皮擦自定义光标 */}
      {activeTool === 'eraser' && eraserCursorPos && (
        <div
          className="absolute pointer-events-none border-2 border-white/60 rounded-full"
          style={{
            left: eraserCursorPos.x - eraserCursorRadius,
            top: eraserCursorPos.y - eraserCursorRadius,
            width: eraserCursorSize,
            height: eraserCursorSize,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
          }}
        />
      )}

      {/* 文字输入框 */}
      {textInput && (
        <textarea
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={handleTextKeyDown}
          onBlur={confirmText}
          className="absolute bg-transparent border border-dashed text-sm font-bold outline-none resize-none p-0.5"
          style={{
            left: getCSSPoint({ x: textInput.x, y: textInput.y }).x,
            top: getCSSPoint({ x: textInput.x, y: textInput.y }).y,
            minWidth: 60,
            minHeight: 24,
            color: currentColor,
            borderColor: currentColor,
            caretColor: currentColor,
          }}
          placeholder="输入文字..."
        />
      )}
    </div>
  );
};
