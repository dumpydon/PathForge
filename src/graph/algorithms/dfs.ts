import { buildAdjacencyList } from "../domain/adjacency";
import type { GraphDocument } from "../domain/types";
import { appendPathEvents, createEmptySearchResult, reconstructGraphPath, type ParentRecord } from "./shared";
import type { GraphSearchEvent, GraphSearchOptions, GraphSearchResult } from "./types";

export function graphDfs(
  doc: GraphDocument,
  options: GraphSearchOptions = {},
): GraphSearchResult {
  const startedAt = performance.now();
  const recordEvents = options.recordEvents ?? true;

  if (!doc.startNodeId || !doc.targetNodeId) {
    return createEmptySearchResult("dfs");
  }

  const startId = doc.startNodeId;
  const targetId = doc.targetNodeId;

  // Verify start and target exist in doc
  if (!doc.nodes.some((n) => n.id === startId) || !doc.nodes.some((n) => n.id === targetId)) {
    return createEmptySearchResult("dfs");
  }

  const events: GraphSearchEvent[] = [];

  // Immediate match
  if (startId === targetId) {
    if (recordEvents) {
      events.push({
        type: "discovered",
        nodeId: startId,
        frontierSize: 1,
        values: { parent: null, discoveryOrder: 1 },
      });
      events.push({
        type: "expanded",
        nodeId: startId,
        frontierSize: 0,
        values: { parent: null, expansionOrder: 1 },
      });
      events.push({
        type: "closed",
        nodeId: startId,
        frontierSize: 0,
      });
      appendPathEvents(events, [startId], []);
    }

    return {
      algorithm: "dfs",
      found: true,
      pathNodeIds: [startId],
      pathEdgeIds: [],
      pathCost: 0,
      pathLength: 0,
      discoveredCount: 1,
      expandedCount: 1,
      maxFrontierSize: 1,
      executionTimeMs: performance.now() - startedAt,
      events,
    };
  }

  const adj = buildAdjacencyList(doc);
  const stack: string[] = [startId];
  const discovered = new Set<string>([startId]);
  const parents = new Map<string, ParentRecord>();

  let discoveredCount = 1;
  let expandedCount = 0;
  let maxFrontierSize = 1;
  let found = false;

  if (recordEvents) {
    events.push({
      type: "discovered",
      nodeId: startId,
      frontierSize: 1,
      values: { parent: null, discoveryOrder: 1 },
    });
  }

  while (stack.length > 0) {
    const current = stack.pop()!;
    expandedCount += 1;

    const currentParent = parents.get(current)?.parentNodeId ?? null;

    if (recordEvents) {
      events.push({
        type: "expanded",
        nodeId: current,
        frontierSize: stack.length,
        values: {
          parent: currentParent,
          expansionOrder: expandedCount,
        },
      });
    }

    if (current === targetId) {
      found = true;
      if (recordEvents) {
        events.push({
          type: "closed",
          nodeId: current,
          frontierSize: stack.length,
        });
      }
      break;
    }

    const neighbors = adj.get(current) ?? [];
    // Reverse iteration so the first deterministic neighbor is popped first from stack
    for (let index = neighbors.length - 1; index >= 0; index -= 1) {
      const neighbor = neighbors[index];
      if (discovered.has(neighbor.nodeId)) continue;

      discovered.add(neighbor.nodeId);
      parents.set(neighbor.nodeId, {
        parentNodeId: current,
        edgeId: neighbor.edgeId,
        weight: neighbor.weight,
      });
      stack.push(neighbor.nodeId);
      discoveredCount += 1;
      maxFrontierSize = Math.max(maxFrontierSize, stack.length);

      if (recordEvents) {
        events.push({
          type: "edgeExamined",
          edgeId: neighbor.edgeId,
          fromNodeId: current,
          toNodeId: neighbor.nodeId,
          frontierSize: stack.length,
        });
        events.push({
          type: "discovered",
          nodeId: neighbor.nodeId,
          frontierSize: stack.length,
          values: {
            parent: current,
            discoveryOrder: discoveredCount,
          },
        });
      }
    }

    if (recordEvents) {
      events.push({
        type: "closed",
        nodeId: current,
        frontierSize: stack.length,
      });
    }
  }

  const { pathNodeIds, pathEdgeIds, pathCost } = found
    ? reconstructGraphPath(parents, startId, targetId)
    : { pathNodeIds: [], pathEdgeIds: [], pathCost: 0 };

  if (found && recordEvents) {
    appendPathEvents(events, pathNodeIds, pathEdgeIds);
  }

  return {
    algorithm: "dfs",
    found,
    pathNodeIds,
    pathEdgeIds,
    pathCost: found ? pathCost : null,
    pathLength: pathEdgeIds.length,
    discoveredCount,
    expandedCount,
    maxFrontierSize,
    executionTimeMs: performance.now() - startedAt,
    events,
  };
}
