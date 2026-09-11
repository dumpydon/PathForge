import { MinHeap } from "../../structures/MinHeap";
import { buildAdjacencyList } from "../domain/adjacency";
import type { GraphDocument } from "../domain/types";
import { appendPathEvents, createEmptySearchResult, reconstructGraphPath, type ParentRecord } from "./shared";
import type { GraphSearchEvent, GraphSearchOptions, GraphSearchResult } from "./types";

interface DijkstraHeapEntry {
  nodeId: string;
  distance: number;
  sequence: number;
}

export function graphDijkstra(
  doc: GraphDocument,
  options: GraphSearchOptions = {},
): GraphSearchResult {
  const startedAt = performance.now();
  const recordEvents = options.recordEvents ?? true;

  // Validate non-negative edge weights
  for (const edge of doc.edges) {
    if (edge.weight < 0) {
      throw new Error(`Dijkstra requires non-negative weights; found negative weight ${edge.weight} on edge ${edge.id}`);
    }
  }

  if (!doc.startNodeId || !doc.targetNodeId) {
    return createEmptySearchResult("dijkstra");
  }

  const startId = doc.startNodeId;
  const targetId = doc.targetNodeId;

  if (!doc.nodes.some((n) => n.id === startId) || !doc.nodes.some((n) => n.id === targetId)) {
    return createEmptySearchResult("dijkstra");
  }

  const events: GraphSearchEvent[] = [];

  if (startId === targetId) {
    if (recordEvents) {
      events.push({
        type: "discovered",
        nodeId: startId,
        frontierSize: 1,
        values: { parent: null, g: 0, discoveryOrder: 1 },
      });
      events.push({
        type: "expanded",
        nodeId: startId,
        frontierSize: 0,
        values: { parent: null, g: 0, expansionOrder: 1 },
      });
      events.push({
        type: "closed",
        nodeId: startId,
        frontierSize: 0,
      });
      appendPathEvents(events, [startId], []);
    }

    return {
      algorithm: "dijkstra",
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
  const distances = new Map<string, number>();
  for (const node of doc.nodes) {
    distances.set(node.id, Number.POSITIVE_INFINITY);
  }

  const parents = new Map<string, ParentRecord>();
  const closed = new Set<string>();
  const open = new Set<string>([startId]);

  let sequence = 0;
  const frontier = new MinHeap<DijkstraHeapEntry>((a, b) =>
    a.distance === b.distance ? a.sequence - b.sequence : a.distance - b.distance,
  );

  let discoveredCount = 1;
  let expandedCount = 0;
  let maxFrontierSize = 1;
  let found = false;

  distances.set(startId, 0);
  frontier.push({ nodeId: startId, distance: 0, sequence: sequence++ });

  if (recordEvents) {
    events.push({
      type: "discovered",
      nodeId: startId,
      frontierSize: 1,
      values: { parent: null, g: 0, discoveryOrder: 1 },
    });
  }

  while (!frontier.isEmpty) {
    const entry = frontier.pop();
    if (!entry) break;

    // Discard stale entries
    if (entry.distance !== distances.get(entry.nodeId) || closed.has(entry.nodeId)) {
      continue;
    }

    const current = entry.nodeId;
    open.delete(current);
    expandedCount += 1;

    const currentG = distances.get(current) ?? 0;
    const currentParent = parents.get(current)?.parentNodeId ?? null;

    if (recordEvents) {
      events.push({
        type: "expanded",
        nodeId: current,
        frontierSize: open.size,
        values: {
          parent: currentParent,
          g: currentG,
          expansionOrder: expandedCount,
        },
      });
    }

    closed.add(current);

    if (current === targetId) {
      found = true;
      if (recordEvents) {
        events.push({
          type: "closed",
          nodeId: current,
          frontierSize: open.size,
        });
      }
      break;
    }

    const neighbors = adj.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (closed.has(neighbor.nodeId)) continue;

      const candidateDistance = currentG + neighbor.weight;
      const currentNeighborDistance = distances.get(neighbor.nodeId) ?? Number.POSITIVE_INFINITY;

      if (candidateDistance >= currentNeighborDistance) continue;

      const previousDistance = Number.isFinite(currentNeighborDistance)
        ? currentNeighborDistance
        : null;
      const isFirstDiscovery = previousDistance === null;

      distances.set(neighbor.nodeId, candidateDistance);
      parents.set(neighbor.nodeId, {
        parentNodeId: current,
        edgeId: neighbor.edgeId,
        weight: neighbor.weight,
      });

      frontier.push({
        nodeId: neighbor.nodeId,
        distance: candidateDistance,
        sequence: sequence++,
      });
      open.add(neighbor.nodeId);
      maxFrontierSize = Math.max(maxFrontierSize, open.size);

      if (isFirstDiscovery) {
        discoveredCount += 1;
        if (recordEvents) {
          events.push({
            type: "discovered",
            nodeId: neighbor.nodeId,
            frontierSize: open.size,
            values: {
              parent: current,
              g: candidateDistance,
              discoveryOrder: discoveredCount,
            },
          });
        }
      }

      if (recordEvents) {
        events.push({
          type: "edgeExamined",
          edgeId: neighbor.edgeId,
          fromNodeId: current,
          toNodeId: neighbor.nodeId,
          frontierSize: open.size,
        });
        events.push({
          type: "relaxed",
          nodeId: neighbor.nodeId,
          fromNodeId: current,
          edgeId: neighbor.edgeId,
          previousCost: previousDistance,
          frontierSize: open.size,
          values: {
            parent: current,
            g: candidateDistance,
          },
        });
      }
    }

    if (recordEvents) {
      events.push({
        type: "closed",
        nodeId: current,
        frontierSize: open.size,
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
    algorithm: "dijkstra",
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
