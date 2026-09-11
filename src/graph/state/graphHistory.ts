import { graphDocumentsEqual } from "../domain/graph";
import type { GraphDocument } from "../domain/types";

export const MAX_GRAPH_HISTORY_ENTRIES = 60;

export interface GraphHistoryState {
  past: GraphDocument[];
  present: GraphDocument;
  future: GraphDocument[];
}

export function createGraphHistory(initial: GraphDocument): GraphHistoryState {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function pushGraphAction(
  history: GraphHistoryState,
  nextDoc: GraphDocument,
): GraphHistoryState {
  if (graphDocumentsEqual(history.present, nextDoc)) {
    return history;
  }

  const nextPast = [...history.past, history.present];
  if (nextPast.length > MAX_GRAPH_HISTORY_ENTRIES) {
    nextPast.shift();
  }

  return {
    past: nextPast,
    present: nextDoc,
    future: [],
  };
}

export function undoGraphAction(
  history: GraphHistoryState,
): { state: GraphHistoryState; restored: GraphDocument } | null {
  if (history.past.length === 0) return null;

  const nextPast = [...history.past];
  const restored = nextPast.pop()!;

  return {
    state: {
      past: nextPast,
      present: restored,
      future: [history.present, ...history.future],
    },
    restored,
  };
}

export function redoGraphAction(
  history: GraphHistoryState,
): { state: GraphHistoryState; restored: GraphDocument } | null {
  if (history.future.length === 0) return null;

  const nextFuture = [...history.future];
  const restored = nextFuture.shift()!;

  return {
    state: {
      past: [...history.past, history.present],
      present: restored,
      future: nextFuture,
    },
    restored,
  };
}

export function canUndoGraph(history: GraphHistoryState): boolean {
  return history.past.length > 0;
}

export function canRedoGraph(history: GraphHistoryState): boolean {
  return history.future.length > 0;
}
