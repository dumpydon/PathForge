import type { GraphSearchEvent, GraphSearchResult } from "./types";

export interface ParentRecord {
  parentNodeId: string;
  edgeId: string;
  weight: number;
}

export function reconstructGraphPath(
  parents: Map<string, ParentRecord>,
  startNodeId: string,
  targetNodeId: string,
): { pathNodeIds: string[]; pathEdgeIds: string[]; pathCost: number } {
  if (startNodeId === targetNodeId) {
    return {
      pathNodeIds: [startNodeId],
      pathEdgeIds: [],
      pathCost: 0,
    };
  }

  const pathNodeIds: string[] = [];
  const pathEdgeIds: string[] = [];
  let pathCost = 0;

  let current = targetNodeId;
  pathNodeIds.push(current);

  while (current !== startNodeId) {
    const parentRecord = parents.get(current);
    if (!parentRecord) {
      return { pathNodeIds: [], pathEdgeIds: [], pathCost: 0 };
    }

    pathEdgeIds.push(parentRecord.edgeId);
    pathCost += parentRecord.weight;
    current = parentRecord.parentNodeId;
    pathNodeIds.push(current);
  }

  pathNodeIds.reverse();
  pathEdgeIds.reverse();

  return { pathNodeIds, pathEdgeIds, pathCost };
}

export function appendPathEvents(
  events: GraphSearchEvent[],
  pathNodeIds: string[],
  pathEdgeIds: string[],
): void {
  const totalLength = pathNodeIds.length;
  for (let i = 0; i < pathNodeIds.length; i++) {
    events.push({
      type: "pathNode",
      nodeId: pathNodeIds[i],
      pathIndex: i,
      pathLength: totalLength,
      frontierSize: 0,
    });
    if (i < pathEdgeIds.length) {
      events.push({
        type: "pathEdge",
        edgeId: pathEdgeIds[i],
        fromNodeId: pathNodeIds[i],
        toNodeId: pathNodeIds[i + 1],
        pathIndex: i,
        pathLength: pathEdgeIds.length,
        frontierSize: 0,
      });
    }
  }
}

export function createEmptySearchResult(
  algorithm: "dfs" | "bfs" | "dijkstra",
  executionTimeMs = 0,
): GraphSearchResult {
  return {
    algorithm,
    found: false,
    pathNodeIds: [],
    pathEdgeIds: [],
    pathCost: null,
    pathLength: 0,
    discoveredCount: 0,
    expandedCount: 0,
    maxFrontierSize: 0,
    executionTimeMs,
    events: [],
  };
}
