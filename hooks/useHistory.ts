import { useReducer, useCallback } from 'react';
import { NodeData, Connection } from '../types';

const MAX_HISTORY = 50;

interface HistoryState {
  entries: { nodes: NodeData[]; connections: Connection[] }[];
  index: number;
}

type HistoryAction =
  | { type: 'PUSH'; nodes: NodeData[]; connections: Connection[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_INITIAL'; entry: { nodes: NodeData[]; connections: Connection[] } };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'PUSH': {
      // 截断到当前位置，追加新记录
      const newEntries = state.entries.slice(0, state.index + 1);
      newEntries.push({
        nodes: JSON.parse(JSON.stringify(action.nodes)),
        connections: JSON.parse(JSON.stringify(action.connections)),
      });
      // 超出限制则移除最早的记录
      if (newEntries.length > MAX_HISTORY) {
        newEntries.shift();
        return { entries: newEntries, index: newEntries.length - 1 };
      }
      return { entries: newEntries, index: state.index + 1 };
    }
    case 'UNDO': {
      if (state.index <= 0) return state;
      return { ...state, index: state.index - 1 };
    }
    case 'REDO': {
      if (state.index >= state.entries.length - 1) return state;
      return { ...state, index: state.index + 1 };
    }
    case 'SET_INITIAL': {
      return {
        entries: [{ nodes: action.entry.nodes, connections: action.entry.connections }],
        index: 0,
      };
    }
    default:
      return state;
  }
}

const initialState: HistoryState = {
  entries: [],
  index: -1,
};

export interface UseHistoryReturn {
  history: { nodes: NodeData[]; connections: Connection[] }[];
  historyIndex: number;
  saveToHistory: (nodes: NodeData[], connections: Connection[]) => void;
  handleUndo: (
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
  ) => void;
  handleRedo: (
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
  ) => void;
  setInitialHistory: (entry: { nodes: NodeData[]; connections: Connection[] }) => void;
  /** @deprecated 仅用于向后兼容 useLoadWorkflow */
  setHistory: React.Dispatch<React.SetStateAction<{ nodes: NodeData[]; connections: Connection[] }[]>>;
  /** @deprecated 仅用于向后兼容 useLoadWorkflow */
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const useHistory = (): UseHistoryReturn => {
  const [state, dispatch] = useReducer(historyReducer, initialState);

  const saveToHistory = useCallback((nodes: NodeData[], connections: Connection[]) => {
    dispatch({ type: 'PUSH', nodes, connections });
  }, []);

  const handleUndo = useCallback((
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
  ) => {
    dispatch({ type: 'UNDO' });
    // 注意：reducer 已经更新了 index，但 React 会批量更新
    // 我们需要在 dispatch 之后手动获取目标状态
    // 由于 useReducer 是同步的，我们可以直接计算目标 index
    const targetIndex = state.index - 1;
    if (targetIndex >= 0 && targetIndex < state.entries.length) {
      setNodes(state.entries[targetIndex].nodes);
      setConnections(state.entries[targetIndex].connections);
    }
  }, [state.entries, state.index]);

  const handleRedo = useCallback((
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
  ) => {
    dispatch({ type: 'REDO' });
    const targetIndex = state.index + 1;
    if (targetIndex >= 0 && targetIndex < state.entries.length) {
      setNodes(state.entries[targetIndex].nodes);
      setConnections(state.entries[targetIndex].connections);
    }
  }, [state.entries, state.index]);

  const setInitialHistory = useCallback((entry: { nodes: NodeData[]; connections: Connection[] }) => {
    dispatch({ type: 'SET_INITIAL', entry });
  }, []);

  // 向后兼容：useLoadWorkflow 仍使用 setHistory/setHistoryIndex
  // 这些通过直接操作 state 实现，后续重构 useLoadWorkflow 时可移除
  const setHistory = useCallback((
    action: React.SetStateAction<{ nodes: NodeData[]; connections: Connection[] }[]>
  ) => {
    // 无法直接与 useReducer 交互，标记为 deprecated
    console.warn('[useHistory] setHistory is deprecated, use setInitialHistory instead');
  }, []);

  const setHistoryIndex = useCallback((
    action: React.SetStateAction<number>
  ) => {
    console.warn('[useHistory] setHistoryIndex is deprecated, use setInitialHistory instead');
  }, []);

  return {
    history: state.entries,
    historyIndex: state.index,
    saveToHistory,
    handleUndo,
    handleRedo,
    setInitialHistory,
    setHistory,
    setHistoryIndex,
  };
};
