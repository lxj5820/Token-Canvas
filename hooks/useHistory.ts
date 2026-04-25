import { useReducer, useCallback, useRef } from "react";
import { NodeData, Connection } from "../types";
import { logger } from "../services/logger";

const MAX_HISTORY = 50;

interface HistoryState {
  entries: { nodes: NodeData[]; connections: Connection[] }[];
  index: number;
}

type HistoryAction =
  | { type: "PUSH"; nodes: NodeData[]; connections: Connection[] }
  | { type: "UNDO" }
  | { type: "REDO" }
  | {
      type: "SET_INITIAL";
      entry: { nodes: NodeData[]; connections: Connection[] };
    };

function historyReducer(
  state: HistoryState,
  action: HistoryAction,
): HistoryState {
  switch (action.type) {
    case "PUSH": {
      const newEntries = state.entries.slice(0, state.index + 1);
      newEntries.push({
        nodes: structuredClone(action.nodes),
        connections: structuredClone(action.connections),
      });
      if (newEntries.length > MAX_HISTORY) {
        newEntries.shift();
        return { entries: newEntries, index: newEntries.length - 1 };
      }
      return { entries: newEntries, index: state.index + 1 };
    }
    case "UNDO": {
      if (state.index <= 0) return state;
      return { ...state, index: state.index - 1 };
    }
    case "REDO": {
      if (state.index >= state.entries.length - 1) return state;
      return { ...state, index: state.index + 1 };
    }
    case "SET_INITIAL": {
      return {
        entries: [
          { nodes: action.entry.nodes, connections: action.entry.connections },
        ],
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
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  ) => void;
  handleRedo: (
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  ) => void;
  setInitialHistory: (entry: {
    nodes: NodeData[];
    connections: Connection[];
  }) => void;
  /** @deprecated 仅用于向后兼容 useLoadWorkflow */
  setHistory: React.Dispatch<
    React.SetStateAction<{ nodes: NodeData[]; connections: Connection[] }[]>
  >;
  /** @deprecated 仅用于向后兼容 useLoadWorkflow */
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const useHistory = (): UseHistoryReturn => {
  const [state, dispatch] = useReducer(historyReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const saveToHistory = useCallback(
    (nodes: NodeData[], connections: Connection[]) => {
      dispatch({ type: "PUSH", nodes, connections });
    },
    [],
  );

  const handleUndo = useCallback(
    (
      setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
      setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
    ) => {
      const current = stateRef.current;
      const targetIndex = current.index - 1;
      if (targetIndex >= 0 && targetIndex < current.entries.length) {
        const target = current.entries[targetIndex];
        setNodes(target.nodes);
        setConnections(target.connections);
        dispatch({ type: "UNDO" });
      }
    },
    [],
  );

  const handleRedo = useCallback(
    (
      setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>,
      setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
    ) => {
      const current = stateRef.current;
      const targetIndex = current.index + 1;
      if (targetIndex >= 0 && targetIndex < current.entries.length) {
        const target = current.entries[targetIndex];
        setNodes(target.nodes);
        setConnections(target.connections);
        dispatch({ type: "REDO" });
      }
    },
    [],
  );

  const setInitialHistory = useCallback(
    (entry: { nodes: NodeData[]; connections: Connection[] }) => {
      dispatch({ type: "SET_INITIAL", entry });
    },
    [],
  );

  const setHistory = useCallback(
    (
      action: React.SetStateAction<
        { nodes: NodeData[]; connections: Connection[] }[]
      >,
    ) => {
      logger.warn(
        "[useHistory] setHistory is deprecated, use setInitialHistory instead",
      );
    },
    [],
  );

  const setHistoryIndex = useCallback(
    (action: React.SetStateAction<number>) => {
      logger.warn(
        "[useHistory] setHistoryIndex is deprecated, use setInitialHistory instead",
      );
    },
    [],
  );

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
