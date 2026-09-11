import type { GraphNodeSearchValues, GraphSearchEvent } from "../algorithms/types";

export type GraphPlaybackNodeState = "unvisited" | "frontier" | "current" | "closed" | "path";
export type GraphPlaybackEdgeState = "default" | "examined" | "relaxed" | "path";

export interface GraphPlaybackNode extends GraphNodeSearchValues {
  state: GraphPlaybackNodeState;
}

export interface GraphPlaybackEdge {
  state: GraphPlaybackEdgeState;
}

export interface GraphPlaybackSnapshot {
  nodes: Map<string, GraphPlaybackNode>;
  edges: Map<string, GraphPlaybackEdge>;
  currentNodeId: string | null;
  frontierSize: number;
  visitedCount: number;
  lastEvent: GraphSearchEvent | null;
}

export interface GraphPlaybackTimeline {
  readonly events: readonly GraphSearchEvent[];
  readonly stepBoundaries: readonly number[];
  readonly totalSteps: number;
  getSnapshotForStep: (stepIndex: number) => GraphPlaybackSnapshot;
  getSnapshotForCursor: (cursor: number) => GraphPlaybackSnapshot;
  getStepIndexForCursor: (cursor: number) => number;
}
