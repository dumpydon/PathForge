import { describe, expect, it } from "vitest";
import {
  addNode,
  addEdge,
  createEmptyGraphDocument,
  setStartNode,
  setTargetNode,
} from "../graph/domain/graph";
import { graphBfs } from "../graph/algorithms/bfs";
import { createCyclicNetworkPreset } from "../graph/presets/cyclicNetwork";
import { createDisconnectedGraphPreset } from "../graph/presets/disconnectedGraph";
import { createWeightedDetourPreset } from "../graph/presets/weightedDetour";

describe("Graph BFS Algorithm", () => {
  it("returns empty result when start or target is missing", () => {
    const doc = createEmptyGraphDocument();
    const res = graphBfs(doc);
    expect(res.found).toBe(false);
    expect(res.pathNodeIds).toHaveLength(0);
  });

  it("handles start equals target immediately", () => {
    const { newNode } = addNode(createEmptyGraphDocument(), { x: 0, y: 0 });
    const doc = {
      ...createEmptyGraphDocument(),
      nodes: [newNode],
      startNodeId: newNode.id,
      targetNodeId: newNode.id,
    };

    const res = graphBfs(doc);
    expect(res.found).toBe(true);
    expect(res.pathNodeIds).toEqual([newNode.id]);
    expect(res.pathEdgeIds).toEqual([]);
    expect(res.pathCost).toBe(0);
    expect(res.pathLength).toBe(0);
    expect(res.expandedCount).toBe(1);
  });

  it("traverses level-by-level in FIFO order", () => {
    // S connected to A and B (level 1). A connected to C, B connected to D (level 2).
    const doc = createEmptyGraphDocument();
    const { doc: d1, newNode: nS } = addNode(doc, { x: 0, y: 0 }, "S");
    const { doc: d2, newNode: nA } = addNode(d1, { x: 50, y: -50 }, "A");
    const { doc: d3, newNode: nB } = addNode(d2, { x: 50, y: 50 }, "B");
    const { doc: d4, newNode: nC } = addNode(d3, { x: 100, y: -50 }, "C");
    const { doc: d5, newNode: nD } = addNode(d4, { x: 100, y: 50 }, "D");

    let d = addEdge(d5, nS.id, nA.id, 1).doc;
    d = addEdge(d, nS.id, nB.id, 1).doc;
    d = addEdge(d, nA.id, nC.id, 1).doc;
    d = addEdge(d, nB.id, nD.id, 1).doc;

    d = setStartNode(d, nS.id);
    d = setTargetNode(d, nD.id);

    const res = graphBfs(d, { recordEvents: true });
    expect(res.found).toBe(true);

    // Filter expansion events
    const expandedNodes = res.events
      .filter((e) => e.type === "expanded")
      .map((e) => e.nodeId);

    // S is expanded first, then level 1 nodes (A and B) before any level 2 nodes (C or D)
    expect(expandedNodes[0]).toBe(nS.id);
    expect(expandedNodes.slice(1, 3)).toEqual(expect.arrayContaining([nA.id, nB.id]));
  });

  it("guarantees shortest path by edge count regardless of edge weights", () => {
    // Weighted Detour preset:
    // Upper route has 3 edges with high total weight (25)
    // Lower route has 5 edges with low total weight (6)
    // BFS must pick the upper route because it has fewer edge hops (3 edges vs 5 edges)
    const preset = createWeightedDetourPreset();
    const res = graphBfs(preset);

    expect(res.found).toBe(true);
    // BFS picks fewer hops (upper route = 3 edges, 4 nodes)
    expect(res.pathLength).toBe(3);
    expect(res.pathNodeIds).toHaveLength(4);
    expect(res.pathCost).toBe(25); // high weight route
  });

  it("handles complex cyclic networks without looping", () => {
    const preset = createCyclicNetworkPreset();
    const res = graphBfs(preset);

    expect(res.found).toBe(true);
    expect(res.pathNodeIds[0]).toBe(preset.startNodeId);
    expect(res.pathNodeIds[res.pathNodeIds.length - 1]).toBe(preset.targetNodeId);
  });

  it("handles disconnected target gracefully", () => {
    const preset = createDisconnectedGraphPreset();
    const res = graphBfs(preset);

    expect(res.found).toBe(false);
    expect(res.pathNodeIds).toHaveLength(0);
    expect(res.pathCost).toBeNull();
    expect(res.discoveredCount).toBeGreaterThan(0);
    expect(res.expandedCount).toBeGreaterThan(0);
  });

  it("records comprehensive events including discovered, expanded, and path events", () => {
    const doc = createEmptyGraphDocument();
    const { doc: d1, newNode: n1 } = addNode(doc, { x: 0, y: 0 });
    const { doc: d2, newNode: n2 } = addNode(d1, { x: 50, y: 0 });
    let d = addEdge(d2, n1.id, n2.id, 1).doc;
    d = setStartNode(d, n1.id);
    d = setTargetNode(d, n2.id);

    const res = graphBfs(d, { recordEvents: true });
    expect(res.found).toBe(true);
    const types = res.events.map((e) => e.type);
    expect(types).toContain("discovered");
    expect(types).toContain("expanded");
    expect(types).toContain("closed");
    expect(types).toContain("pathNode");
    expect(types).toContain("pathEdge");
  });
});
