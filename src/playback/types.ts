import type { NodeSearchValues, SearchEvent } from "../algorithms/types";

export type PlaybackNodeState = "frontier" | "current" | "closed" | "path";

export interface PlaybackNode extends NodeSearchValues {
  state: PlaybackNodeState;
}

export interface PlaybackSnapshot {
  nodes: Map<string, PlaybackNode>;
  currentKey: string | null;
  frontierSize: number;
  lastEvent: SearchEvent | null;
}

export type PlaybackStatus = "idle" | "running" | "paused" | "completed";

export interface PlaybackTimeline {
  readonly events: readonly SearchEvent[];
  readonly stepBoundaries: readonly number[];
  readonly totalSteps: number;
  getSnapshotForStep: (stepIndex: number) => PlaybackSnapshot;
  getSnapshotForCursor: (cursor: number) => PlaybackSnapshot;
  getStepIndexForCursor: (cursor: number) => number;
}

