import { Queue } from "../../structures/Queue";
import { buildAdjacencyList } from "../domain/adjacency";
import type { GraphDocument } from "../domain/types";
import { appendPathEvents, createEmptySearchResult, reconstructGraphPath, type ParentRecord } from "./shared";
import type { GraphSearchEvent, GraphSearchOptions, GraphSearchResult } from "./types";

export function graphBfs(
  doc: GraphDocument,
  options: GraphSearchOptions = {},
): GraphSearchResult {
  const startedAt = performance.now();
  const recordEvents = options.recordEvents ?? true;

  if (!doc.startNodeId || !doc.targetNodeId) {
    return createEmptySearchResult("bfs");
  }

  const startId = doc.startNodeId;
  const targetId = doc.targetNodeId;

  if (!doc.nodes.some((n) => n.id === startId) || !doc.nodes.some((n) => n.id === targetId)) {
    return createEmptySearchResult("bfs");
  }

  const events: GraphSearchEvent[] = [];

  if (startId === targetId) {
    if (recordEvents) {
      events.push({
        type: "discovered",
        nodeId: startId,
        frontierSize: 1,
        values: { parent: null, level: 0, discoveryOrder: 1 },
      });
      events.push({
        type: "expanded",
        nodeId: startId,
        frontierSize: 0,
        values: { parent: null, level: 0, expansionOrder: 1 },
      });
      events.push({
        type: "closed",
        nodeId: startId,
        frontierSize: 0,
      });
      appendPathEvents(events, [startId], []);
    }

    return {
      algorithm: "bfs",
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
  const queue = new Queue<string>();
  const discovered = new Set<string>([startId]);
  const parents = new Map<string, ParentRecord>();
  const levels = new Map<string, number>([[startId, 0]]);

  let discoveredCount = 1;
  let expandedCount = 0;
  let maxFrontierSize = 1;
  let found = false;

  queue.enqueue(startId);
  if (recordEvents) {
    events.push({
      type: "discovered",
      nodeId: startId,
      frontierSize: 1,
      values: { parent: null, level: 0, discoveryOrder: 1 },
    });
  }

  while (!queue.isEmpty) {
    const current = queue.dequeue();
    if (!current) break;

    const currentLevel = levels.get(current) ?? 0;
    const currentParent = parents.get(current)?.parentNodeId ?? null;
    expandedCount += 1;

    if (recordEvents) {
      events.push({
        type: "expanded",
        nodeId: current,
        frontierSize: queue.size,
        values: {
          parent: currentParent,
          level: currentLevel,
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
          frontierSize: queue.size,
        });
      }
      break;
    }

    const neighbors = adj.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (discovered.has(neighbor.nodeId)) continue;

      discovered.add(neighbor.nodeId);
      parents.set(neighbor.nodeId, {
        parentNodeId: current,
        edgeId: neighbor.edgeId,
        weight: neighbor.weight,
      });
      levels.set(neighbor.nodeId, currentLevel + 1);
      queue.enqueue(neighbor.nodeId);
      discoveredCount += 1;
      maxFrontierSize = Math.max(maxFrontierSize, queue.size);

      if (recordEvents) {
        events.push({
          type: "edgeExamined",
          edgeId: neighbor.edgeId,
          fromNodeId: current,
          toNodeId: neighbor.nodeId,
          frontierSize: queue.size,
        });
        events.push({
          type: "discovered",
          nodeId: neighbor.nodeId,
          frontierSize: queue.size,
          values: {
            parent: current,
            level: currentLevel + 1,
            discoveryOrder: discoveredCount,
          },
        });
      }
    }

    if (recordEvents) {
      events.push({
        type: "closed",
        nodeId: current,
        frontierSize: queue.size,
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
    algorithm: "bfs",
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
