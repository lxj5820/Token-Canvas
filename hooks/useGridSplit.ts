import { useState, useCallback, useRef } from 'react';
import { NodeData } from '../types';

export interface GridSplitState {
  rows: number;
  cols: number;
  selectedCells: string[];
}

interface UseGridSplitReturn {
  gridSplit: GridSplitState | null;
  isGridSplitting: boolean;
  enterGridSplit: (rows: number, cols: number) => void;
  exitGridSplit: () => void;
  setGridSize: (rows: number, cols: number) => void;
  toggleCell: (cellId: string) => void;
  selectAllCells: () => void;
  deselectAllCells: () => void;
}

export const useGridSplit = (
  data: NodeData,
  updateData: (id: string, updates: Partial<NodeData>) => void
): UseGridSplitReturn => {
  const gridSplitRef = useRef<GridSplitState | null>(null);

  const isGridSplitting = !!data.gridSplit;
  
  // 归一化 selectedCells：确保始终为 string[]
  const normalizeSelectedCells = (cells: string[] | Set<string> | undefined): string[] => {
    if (!cells) return [];
    if (Array.isArray(cells)) return cells;
    if (cells instanceof Set) return Array.from(cells);
    return [];
  };

  const gridSplit: GridSplitState | null = data.gridSplit
    ? {
        rows: data.gridSplit.rows,
        cols: data.gridSplit.cols,
        selectedCells: normalizeSelectedCells(data.gridSplit.selectedCells as string[] | undefined),
      }
    : null;

  const enterGridSplit = useCallback((rows: number, cols: number) => {
    const allCells: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        allCells.push(`${r}-${c}`);
      }
    }
    gridSplitRef.current = { rows, cols, selectedCells: allCells };
    updateData(data.id, {
      gridSplit: { rows, cols, selectedCells: allCells },
    });
  }, [data.id, updateData]);

  const exitGridSplit = useCallback(() => {
    gridSplitRef.current = null;
    updateData(data.id, { gridSplit: undefined });
  }, [data.id, updateData]);

  const setGridSize = useCallback((rows: number, cols: number) => {
    const allCells: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        allCells.push(`${r}-${c}`);
      }
    }
    gridSplitRef.current = { rows, cols, selectedCells: allCells };
    updateData(data.id, {
      gridSplit: { rows, cols, selectedCells: allCells },
    });
  }, [data.id, updateData]);

  const toggleCell = useCallback((cellId: string) => {
    if (!data.gridSplit) return;
    const current = normalizeSelectedCells(data.gridSplit.selectedCells as string[] | undefined);
    const newSelected = current.includes(cellId)
      ? current.filter(id => id !== cellId)
      : [...current, cellId];
    updateData(data.id, {
      gridSplit: { ...data.gridSplit, selectedCells: newSelected },
    });
  }, [data.id, data.gridSplit, updateData]);

  const selectAllCells = useCallback(() => {
    if (!data.gridSplit) return;
    const allCells: string[] = [];
    for (let r = 0; r < data.gridSplit.rows; r++) {
      for (let c = 0; c < data.gridSplit.cols; c++) {
        allCells.push(`${r}-${c}`);
      }
    }
    updateData(data.id, {
      gridSplit: { ...data.gridSplit, selectedCells: allCells },
    });
  }, [data.id, data.gridSplit, updateData]);

  const deselectAllCells = useCallback(() => {
    if (!data.gridSplit) return;
    updateData(data.id, {
      gridSplit: { ...data.gridSplit, selectedCells: [] },
    });
  }, [data.id, data.gridSplit, updateData]);

  return {
    gridSplit,
    isGridSplitting,
    enterGridSplit,
    exitGridSplit,
    setGridSize,
    toggleCell,
    selectAllCells,
    deselectAllCells,
  };
};
