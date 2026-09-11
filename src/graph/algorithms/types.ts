export type GraphAlgorithmId = "dfs" | "bfs" | "dijkstra";

export interface GraphNodeSearchValues {
  parent: string | null;
  level?: number;
  g?: number;
  discoveryOrder?: number;
  expansionOrder?: number;
}

export type GraphSearchEventType =
  | "discovered"
  | "expanded"
  | "relaxed"
  | "closed"
  | "edgeExamined"
  | "pathNode"
  | "pathEdge";

export interface GraphSearchEvent {
  type: GraphSearchEventType;
  nodeId?: string;
  edgeId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  frontierSize: number;
  values?: GraphNodeSearchValues;
  previousCost?: number | null;
  pathIndex?: number;
  pathLength?: number;
}

export interface GraphSearchResult {
  algorithm: GraphAlgorithmId;
  found: boolean;
  pathNodeIds: string[];
  pathEdgeIds: string[];
  pathCost: number | null;
  pathLength: number; // number of edges
  discoveredCount: number;
  expandedCount: number;
  maxFrontierSize: number;
  executionTimeMs: number;
  events: GraphSearchEvent[];
}

export interface GraphSearchOptions {
  recordEvents?: boolean;
}
