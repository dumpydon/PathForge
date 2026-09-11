import type { GraphAdjacencyList, GraphDocument, GraphNeighbor } from "./types";

/**
 * Builds a deterministic adjacency list from a GraphDocument.
 *
 * Determinism guarantees:
 * 1. For every node, neighbors are sorted primarily by neighbor nodeId (lexicographical order),
 *    and secondarily by edgeId. This ensures traversal order is 100% stable and completely
 *    independent of visual node coordinates or arbitrary render order.
 * 2. In undirected mode, an edge between A and B adds B to A's neighbors and A to B's neighbors.
 * 3. In directed mode, an edge from A to B adds B to A's neighbors only.
 */
export function buildAdjacencyList(doc: GraphDocument): GraphAdjacencyList {
  const adj: GraphAdjacencyList = new Map();

  // Initialize entry for all nodes to support isolated / disconnected nodes
  for (const node of doc.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of doc.edges) {
    if (!adj.has(edge.source) || !adj.has(edge.target)) {
      continue;
    }

    const neighborToTarget: GraphNeighbor = {
      nodeId: edge.target,
      edgeId: edge.id,
      weight: edge.weight,
    };
    adj.get(edge.source)!.push(neighborToTarget);

    if (!doc.directed) {
      const neighborToSource: GraphNeighbor = {
        nodeId: edge.source,
        edgeId: edge.id,
        weight: edge.weight,
      };
      adj.get(edge.target)!.push(neighborToSource);
    }
  }

  // Sort neighbors deterministically by nodeId, then edgeId
  for (const [, neighbors] of adj) {
    neighbors.sort((a, b) => {
      const cmp = a.nodeId.localeCompare(b.nodeId);
      if (cmp !== 0) return cmp;
      return a.edgeId.localeCompare(b.edgeId);
    });
  }

  return adj;
}
