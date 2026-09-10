import { isCustomTerrain } from "../core/grid";
import type { Coordinate, Grid } from "../core/types";

export const DEFAULT_MAX_HISTORY = 60;

export interface BoardHistorySnapshot {
  grid: Grid;
  scenarioLabel: string;
  selectedCoordinate: Coordinate | null;
}

export interface BoardHistoryState {
  past: BoardHistorySnapshot[];
  present: BoardHistorySnapshot;
  future: BoardHistorySnapshot[];
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  if (a === b) return true;
  if (a.rows !== b.rows || a.cols !== b.cols) return false;
  if (a.start.row !== b.start.row || a.start.col !== b.start.col) return false;
  if (a.target.row !== b.target.row || a.target.col !== b.target.col) return false;
  if (a.terrain === b.terrain) return true;
  if (a.terrain.length !== b.terrain.length) return false;

  for (let i = 0; i < a.terrain.length; i += 1) {
    const tA = a.terrain[i];
    const tB = b.terrain[i];
    if (tA === tB) continue;
    if (isCustomTerrain(tA) && isCustomTerrain(tB) && tA.cost === tB.cost) continue;
    return false;
  }
  return true;
}

export function createBoardHistory(
  initialSnapshot: BoardHistorySnapshot,
): BoardHistoryState {
  return {
    past: [],
    present: initialSnapshot,
    future: [],
  };
}

export function pushBoardAction(
  state: BoardHistoryState,
  newSnapshot: BoardHistorySnapshot,
  maxHistory = DEFAULT_MAX_HISTORY,
): BoardHistoryState {
  // If the new snapshot grid is identical to the present grid, ignore
  if (gridsEqual(state.present.grid, newSnapshot.grid)) {
    return state;
  }

  const past = [...state.past, state.present];
  if (past.length > maxHistory) {
    past.splice(0, past.length - maxHistory);
  }

  return {
    past,
    present: newSnapshot,
    future: [], // New action clears redo stack
  };
}

export function undoBoardAction(
  state: BoardHistoryState,
): { state: BoardHistoryState; restored: BoardHistorySnapshot } | null {
  if (state.past.length === 0) return null;

  const previous = state.past[state.past.length - 1];
  const newPast = state.past.slice(0, -1);
  const newFuture = [state.present, ...state.future];

  const newState: BoardHistoryState = {
    past: newPast,
    present: previous,
    future: newFuture,
  };

  return { state: newState, restored: previous };
}

export function redoBoardAction(
  state: BoardHistoryState,
): { state: BoardHistoryState; restored: BoardHistorySnapshot } | null {
  if (state.future.length === 0) return null;

  const next = state.future[0];
  const newFuture = state.future.slice(1);
  const newPast = [...state.past, state.present];

  const newState: BoardHistoryState = {
    past: newPast,
    present: next,
    future: newFuture,
  };

  return { state: newState, restored: next };
}

export function canUndo(state: BoardHistoryState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: BoardHistoryState): boolean {
  return state.future.length > 0;
}
