import { useState, useEffect, useCallback } from "react";
import { NodeData, AnnotationItem } from "../types";
import { bakeAnnotationsToImage } from "../services/bakeAnnotations";

/**
 * 标注功能可复用 Hook
 * 提供标注模式的切换、数据变更、关闭烘焙等完整逻辑
 * 任何有图片的节点都可以使用此 Hook 添加标注功能
 */
export const useAnnotation = (
  data: NodeData,
  updateData: (id: string, updates: Partial<NodeData>) => void,
) => {
  const [isAnnotating, setIsAnnotating] = useState(!!data.isAnnotating);

  // 同步外部 isAnnotating 变化
  useEffect(() => {
    setIsAnnotating(!!data.isAnnotating);
  }, [data.isAnnotating]);

  // 获取当前图片源（优先用原始 imageSrc，因为标注是画在原图上的）
  const imageSrc = data.imageSrc || data.videoSrc || "";

  // 标注模式切换
  const toggleAnnotate = useCallback(() => {
    setIsAnnotating((prev) => {
      if (prev) {
        // 退出标注模式时，烘焙标注到图片
        const currentAnnotations = data.annotations || [];
        if (currentAnnotations.length > 0 && imageSrc) {
          bakeAnnotationsToImage(
            imageSrc,
            currentAnnotations,
            data.width,
            data.height,
          )
            .then((bakedSrc) => {
              queueMicrotask(() => {
                updateData(data.id, {
                  isAnnotating: false,
                  annotatedImageSrc: bakedSrc,
                });
              });
            })
            .catch((err) => {
              console.warn(
                "[Annotation] 烘焙失败，保留标注数据但跳过烘焙:",
                err,
              );
              queueMicrotask(() => {
                updateData(data.id, { isAnnotating: false });
              });
            });
        } else {
          updateData(data.id, {
            isAnnotating: false,
            annotatedImageSrc: undefined,
          });
        }
      } else {
        updateData(data.id, { isAnnotating: true });
      }
      return !prev;
    });
  }, [
    data.id,
    data.annotations,
    imageSrc,
    data.width,
    data.height,
    updateData,
  ]);

  // 标注数据变更
  const handleAnnotationsChange = useCallback(
    (annotations: AnnotationItem[]) => {
      const updates: Partial<NodeData> = { annotations };
      if (annotations.length === 0) {
        updates.annotatedImageSrc = undefined;
      }
      updateData(data.id, updates);
    },
    [data.id, updateData],
  );

  // 关闭标注
  const handleCloseAnnotation = useCallback(() => {
    const currentAnnotations = data.annotations || [];
    if (currentAnnotations.length > 0 && imageSrc) {
      bakeAnnotationsToImage(
        imageSrc,
        currentAnnotations,
        data.width,
        data.height,
      )
        .then((bakedSrc) => {
          queueMicrotask(() => {
            setIsAnnotating(false);
            updateData(data.id, {
              isAnnotating: false,
              annotatedImageSrc: bakedSrc,
            });
          });
        })
        .catch((err) => {
          console.warn("[Annotation] 烘焙失败，保留标注数据但跳过烘焙:", err);
          queueMicrotask(() => {
            setIsAnnotating(false);
            updateData(data.id, { isAnnotating: false });
          });
        });
    } else {
      setIsAnnotating(false);
      updateData(data.id, {
        isAnnotating: false,
        annotatedImageSrc: undefined,
      });
    }
  }, [
    data.id,
    data.annotations,
    imageSrc,
    data.width,
    data.height,
    updateData,
  ]);

  return {
    isAnnotating,
    toggleAnnotate,
    handleAnnotationsChange,
    handleCloseAnnotation,
  };
};
