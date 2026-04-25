import { useCallback } from "react";
import { NodeData } from "../types";

interface GridSplitData {
  rows: number;
  cols: number;
  selectedCells: string[];
}

interface UseGridSplitActionsParams {
  data: NodeData;
  gridSplit: GridSplitData | undefined;
  onGridSplitCreateNodes?: (
    sourceNodeId: string,
    cells: { dataUrl: string; label: string; row: number; col: number }[],
  ) => void;
}

export const useGridSplitActions = ({
  data,
  gridSplit,
  onGridSplitCreateNodes,
}: UseGridSplitActionsParams) => {
  const handleGridSplitCreateNodes = useCallback(() => {
    if (!gridSplit || !data.imageSrc) return;
    const { rows, cols, selectedCells } = gridSplit;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cells: {
        dataUrl: string;
        label: string;
        row: number;
        col: number;
      }[] = [];
      const cellW = img.naturalWidth / cols;
      const cellH = img.naturalHeight / rows;
      selectedCells.forEach((cellId) => {
        const [r, c] = cellId.split("-").map(Number);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(cellW);
        canvas.height = Math.round(cellH);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            img,
            c * cellW,
            r * cellH,
            cellW,
            cellH,
            0,
            0,
            canvas.width,
            canvas.height,
          );
          cells.push({
            dataUrl: canvas.toDataURL("image/png"),
            label: `${data.title || "切分"} ${r + 1}-${c + 1}`,
            row: r,
            col: c,
          });
        }
      });
      if (cells.length > 0 && onGridSplitCreateNodes) {
        onGridSplitCreateNodes(data.id, cells);
      }
    };
    img.src = data.imageSrc;
  }, [gridSplit, data.imageSrc, data.title, data.id, onGridSplitCreateNodes]);

  const handleGridSplitDownload = useCallback(() => {
    if (!gridSplit || !data.imageSrc) return;
    const { rows, cols, selectedCells } = gridSplit;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cellW = img.naturalWidth / cols;
      const cellH = img.naturalHeight / rows;
      selectedCells.forEach((cellId) => {
        const [r, c] = cellId.split("-").map(Number);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(cellW);
        canvas.height = Math.round(cellH);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            img,
            c * cellW,
            r * cellH,
            cellW,
            cellH,
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const link = document.createElement("a");
          link.download = `${data.title || "切分"}_${r + 1}_${c + 1}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }
      });
    };
    img.src = data.imageSrc;
  }, [gridSplit, data.imageSrc, data.title]);

  return {
    handleGridSplitCreateNodes,
    handleGridSplitDownload,
  };
};
