import { describe, expect, it } from "vitest";
import {
  addNode,
  addEdge,
  createEmptyGraphDocument,
  setStartNode,
  setTargetNode,
} from "../graph/domain/graph";
import { graphDijkstra } from "../graph/algorithms/dijkstra";
import { graphBfs } from "../graph/algorithms/bfs";
import { createWeightedDetourPreset } from "../graph/presets/weightedDetour";
import { createCyclicNetworkPreset } from "../graph/presets/cyclicNetwork";
import { createDisconnectedGraphPreset } from "../graph/presets/disconnectedGraph";

describe("Graph Dijkstra Algorithm", () => {
  it("returns empty result when start or target is missing", () => {
    const doc = createEmptyGraphDocument();
    const res = graphDijkstra(doc);
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

    const res = graphDijkstra(doc);
    expect(res.found).toBe(true);
    expect(res.pathCost).toBe(0);
    expect(res.pathLength).toBe(0);
    expect(res.pathNodeIds).toEqual([newNode.id]);
  });

  it("contrasts with BFS on Weighted Detour: Dijkstra finds lowest cost, BFS finds fewest edges", () => {
    const preset = createWeightedDetourPreset();
    const dijkstraRes = graphDijkstra(preset);
    const bfsRes = graphBfs(preset);

    expect(dijkstraRes.found).toBe(true);
    expect(bfsRes.found).toBe(true);

    // BFS takes 3 edges with total cost 25
    expect(bfsRes.pathLength).toBe(3);
    expect(bfsRes.pathCost).toBe(25);

    // Dijkstra takes 5 edges with total cost 6
    expect(dijkstraRes.pathLength).toBe(5);
    expect(dijkstraRes.pathCost).toBe(6);

    expect(dijkstraRes.pathCost).toBeLessThan(bfsRes.pathCost!);
    expect(bfsRes.pathLength).toBeLessThan(dijkstraRes.pathLength);
  });

  it("supports zero-weight edges correctly", () => {
    const doc = createEmptyGraphDocument();
    const { doc: d1, newNode: nS } = addNode(doc, { x: 0, y: 0 }, "S");
    const { doc: d2, newNode: nA } = addNode(d1, { x: 50, y: 0 }, "A");
    const { doc: d3, newNode: nT } = addNode(d2, { x: 100, y: 0 }, "T");

    let d = addEdge(d3, nS.id, nA.id, 0).doc;
    d = addEdge(d, nA.id, nT.id, 0).doc;
    d = setStartNode(d, nS.id);
    d = setTargetNode(d, nT.id);

    const res = graphDijkstra(d);
    expect(res.found).toBe(true);
    expect(res.pathCost).toBe(0);
    expect(res.pathLength).toBe(2);
  });

  it("handles complex cycles and finds cheapest path", () => {
    const preset = createCyclicNetworkPreset();
    const res = graphDijkstra(preset);

    expect(res.found).toBe(true);
    expect(res.pathNodeIds[0]).toBe(preset.startNodeId);
    expect(res.pathNodeIds[res.pathNodeIds.length - 1]).toBe(preset.targetNodeId);
    expect(res.pathCost).toBeGreaterThan(0);
  });

  it("handles disconnected target gracefully", () => {
    const preset = createDisconnectedGraphPreset();
    const res = graphDijkstra(preset);

    expect(res.found).toBe(false);
    expect(res.pathCost).toBeNull();
    expect(res.pathNodeIds).toHaveLength(0);
  });

  it("correctly handles stale heap entries during edge relaxation", () => {
    // S -> A (weight 10) -> T (weight 10)
    // S -> B (weight 1) -> A (weight 2)
    // When expanding S, A is pushed with distance 10.
    // When expanding B, A is pushed with distance 3 (better!).
    // The heap pop of A with distance 3 will relax and close A.
    // The later pop of A with distance 10 must be discarded as stale.
    const doc = createEmptyGraphDocument();
    doc.directed = true;
    const { doc: d1, newNode: nS } = addNode(doc, { x: 0, y: 0 }, "S");
    const { doc: d2, newNode: nA } = addNode(d1, { x: 50, y: -50 }, "A");
    const { doc: d3, newNode: nB } = addNode(d2, { x: 50, y: 50 }, "B");
    const { doc: d4, newNode: nT } = addNode(d3, { x: 100, y: 0 }, "T");

    let d = addEdge(d4, nS.id, nA.id, 10).doc;
    d = addEdge(d, nS.id, nB.id, 1).doc;
    d = addEdge(d, nB.id, nA.id, 2).doc;
    d = addEdge(d, nA.id, nT.id, 1).doc;

    d = setStartNode(d, nS.id);
    d = setTargetNode(d, nT.id);

    const res = graphDijkstra(d);
    expect(res.found).toBe(true);
    expect(res.pathNodeIds).toEqual([nS.id, nB.id, nA.id, nT.id]);
    expect(res.pathCost).toBe(4); // 1 + 2 + 1
  });

  it("throws an error when encountering negative edge weights", () => {
    const doc = createEmptyGraphDocument();
    const { doc: d1, newNode: n1 } = addNode(doc, { x: 0, y: 0 });
    const { doc: d2, newNode: n2 } = addNode(d1, { x: 50, y: 0 });
    // Manually inject negative weight
    const invalidDoc = {
      ...d2,
      startNodeId: n1.id,
      targetNodeId: n2.id,
      edges: [{ id: "bad-e", source: n1.id, target: n2.id, weight: -5 }],
    };

    expect(() => graphDijkstra(invalidDoc)).toThrow(/non-negative weights/);
  });

  it("records valid events and g-values", () => {
    const doc = createEmptyGraphDocument();
    const { doc: d1, newNode: n1 } = addNode(doc, { x: 0, y: 0 });
    const { doc: d2, newNode: n2 } = addNode(d1, { x: 50, y: 0 });
    let d = addEdge(d2, n1.id, n2.id, 7).doc;
    d = setStartNode(d, n1.id);
    d = setTargetNode(d, n2.id);

    const res = graphDijkstra(d, { recordEvents: true });
    expect(res.found).toBe(true);

    const expandedN2 = res.events.find((e) => e.type === "expanded" && e.nodeId === n2.id);
    expect(expandedN2?.values?.g).toBe(7);
  });
});
