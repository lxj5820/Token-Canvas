import { AnnotationItem } from "../types";

const DEFAULT_FONT_SIZE = 16;

/**
 * 将图片和标注合成为一张带标注的 dataURL
 * 用于把标注"烘焙"进图片，使下游节点能接收到带标注的图片
 *
 * 橡皮擦只擦除标注内容，不影响原图——使用双层 canvas 方案：
 * 1. 在临时 canvas 上渲染所有标注（橡皮擦用 destination-out 擦除标注像素）
 * 2. 在主 canvas 上先绘制原图，再将标注 canvas 叠加到原图上方
 */
export const bakeAnnotationsToImage = (
  imageSrc: string,
  annotations: AnnotationItem[],
  width: number,
  height: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!annotations || annotations.length === 0) {
      resolve(imageSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvasW = img.naturalWidth || width;
      const canvasH = img.naturalHeight || height;

      // 缩放比例（canvas 像素 vs 逻辑坐标）
      const scaleX = canvasW / width;
      const scaleY = canvasH / height;

      // === 第一层：在临时 canvas 上渲染标注 ===
      const annotCanvas = document.createElement("canvas");
      annotCanvas.width = canvasW;
      annotCanvas.height = canvasH;
      const actx = annotCanvas.getContext("2d");
      if (!actx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      actx.scale(scaleX, scaleY);
      annotations.forEach((item) => {
        actx.save();
        actx.lineCap = "round";
        actx.lineJoin = "round";

        switch (item.tool) {
          case "eraser":
            // 在标注层上用 destination-out 擦除之前绘制的标注像素
            if (item.points && item.points.length > 0) {
              actx.globalCompositeOperation = "destination-out";
              actx.strokeStyle = "rgba(0,0,0,1)";
              actx.lineWidth = item.strokeWidth;
              actx.beginPath();
              actx.moveTo(item.points[0].x, item.points[0].y);
              for (let i = 1; i < item.points.length; i++) {
                actx.lineTo(item.points[i].x, item.points[i].y);
              }
              actx.stroke();
            }
            break;

          case "pen":
            actx.strokeStyle = item.color;
            actx.fillStyle = item.color;
            actx.lineWidth = item.strokeWidth;
            if (item.points && item.points.length > 1) {
              actx.beginPath();
              actx.moveTo(item.points[0].x, item.points[0].y);
              for (let i = 1; i < item.points.length; i++) {
                actx.lineTo(item.points[i].x, item.points[i].y);
              }
              actx.stroke();
            } else if (item.points && item.points.length === 1) {
              actx.beginPath();
              actx.arc(
                item.points[0].x,
                item.points[0].y,
                item.strokeWidth / 2,
                0,
                Math.PI * 2,
              );
              actx.fill();
            }
            break;

          case "rect":
            if (item.rect) {
              actx.strokeStyle = item.color;
              actx.fillStyle = item.color;
              actx.lineWidth = item.strokeWidth;
              actx.fillStyle = item.color + "20";
              actx.fillRect(
                item.rect.x,
                item.rect.y,
                item.rect.width,
                item.rect.height,
              );
              actx.beginPath();
              actx.rect(
                item.rect.x,
                item.rect.y,
                item.rect.width,
                item.rect.height,
              );
              actx.stroke();
            }
            break;

          case "text":
            if (item.text) {
              const fontSize = item.fontSize || DEFAULT_FONT_SIZE;
              actx.fillStyle = item.color;
              actx.font = `bold ${fontSize}px "Inter", "SF Pro", system-ui, sans-serif`;
              actx.fillText(
                item.text.content,
                item.text.x,
                item.text.y + fontSize,
              );
            }
            break;
        }
        actx.restore();
      });

      // === 第二层：主 canvas = 原图 + 标注叠加 ===
      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // 先绘制原图（完整保留，不受橡皮擦影响）
      ctx.drawImage(img, 0, 0, canvasW, canvasH);
      // 再叠加标注层（橡皮擦已在标注层中生效，只擦除了标注像素）
      ctx.drawImage(annotCanvas, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image for baking"));
    img.src = imageSrc;
  });
};
