import { useState, useCallback } from "react";
import { NodeData, AnnotationItem, AnnotationTool } from "../types";

interface UseAnnotationWithUndoParams {
  data: NodeData;
  handleAnnotationsChange: (annotations: AnnotationItem[]) => void;
}

export const useAnnotationWithUndo = ({
  data,
  handleAnnotationsChange,
}: UseAnnotationWithUndoParams) => {
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>("pen");
  const [annotationColor, setAnnotationColor] = useState("#FFD700");
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState(3);
  const [undoneAnnotations, setUndoneAnnotations] = useState<AnnotationItem[]>(
    [],
  );

  const handleAnnotationsChangeWithRedo = useCallback(
    (annotations: AnnotationItem[]) => {
      const currentAnnotations = data.annotations || [];
      if (annotations.length < currentAnnotations.length) {
        const removed = currentAnnotations.slice(annotations.length);
        setUndoneAnnotations((prev) => [...prev, ...removed]);
      } else {
        setUndoneAnnotations([]);
      }
      handleAnnotationsChange(annotations);
    },
    [data.annotations, handleAnnotationsChange],
  );

  const handleAnnotationUndo = useCallback(() => {
    const currentAnnotations = data.annotations || [];
    if (currentAnnotations.length > 0) {
      const lastItem = currentAnnotations[currentAnnotations.length - 1];
      setUndoneAnnotations((prev) => [...prev, lastItem]);
      handleAnnotationsChange(currentAnnotations.slice(0, -1));
    }
  }, [data.annotations, handleAnnotationsChange]);

  const handleAnnotationRedo = useCallback(() => {
    if (undoneAnnotations.length > 0) {
      const lastUndone = undoneAnnotations[undoneAnnotations.length - 1];
      setUndoneAnnotations((prev) => prev.slice(0, -1));
      handleAnnotationsChange([...(data.annotations || []), lastUndone]);
    }
  }, [undoneAnnotations, data.annotations, handleAnnotationsChange]);

  const handleAnnotationClear = useCallback(() => {
    setUndoneAnnotations([]);
    handleAnnotationsChange([]);
  }, [handleAnnotationsChange]);

  return {
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
  };
};
