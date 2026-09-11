import { describe, expect, it } from "vitest";
import {
  addNode,
  addEdge,
  createEmptyGraphDocument,
  setStartNode,
  setTargetNode,
} from "../graph/domain/graph";
import { graphDfs } from "../graph/algorithms/dfs";
import { createCyclicNetworkPreset } from "../graph/presets/cyclicNetwork";
import { createDisconnectedGraphPreset } from "../graph/presets/disconnectedGraph";

describe("Graph DFS Algorithm", () => {
  it("returns empty result when start or target is missing", () => {
    const doc = createEmptyGraphDocument();
    const res = graphDfs(doc);
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

    const res = graphDfs(doc);
    expect(res.found).toBe(true);
    expect(res.pathNodeIds).toEqual([newNode.id]);
    expect(res.pathEdgeIds).toEqual([]);
    expect(res.pathCost).toBe(0);
    expect(res.pathLength).toBe(0);
    expect(res.expandedCount).toBe(1);
  });

  it("traverses deterministically in alphabetical neighbor order", () => {
    // Start node S connected to A and B. A and B both connect to target T.
    const doc = createEmptyGraphDocument();
    const { doc: d1, newNode: nS } = addNode(doc, { x: 0, y: 0 }, "S");
    const { doc: d2, newNode: nA } = addNode(d1, { x: 50, y: 0 }, "A");
    const { doc: d3, newNode: nB } = addNode(d2, { x: 50, y: 50 }, "B");
    const { doc: d4, newNode: nT } = addNode(d3, { x: 100, y: 0 }, "T");

    let d = addEdge(d4, nS.id, nB.id, 1).doc;
    d = addEdge(d, nS.id, nA.id, 1).doc;
    d = addEdge(d, nA.id, nT.id, 1).doc;
    d = addEdge(d, nB.id, nT.id, 1).doc;

    d = setStartNode(d, nS.id);
    d = setTargetNode(d, nT.id);

    const res = graphDfs(d);
    expect(res.found).toBe(true);
    // Neighbors of S are sorted lexicographically by ID.
    // If nA.id < nB.id, A is pushed after B, so A is popped first, leading to path S -> A -> T.
    expect(res.pathNodeIds[0]).toBe(nS.id);
    expect(res.pathNodeIds[res.pathNodeIds.length - 1]).toBe(nT.id);
  });

  it("handles complex cycles without infinite loops", () => {
    // createCyclicNetworkPreset has multiple cycles and loops
    const preset = createCyclicNetworkPreset();
    const res = graphDfs(preset);
    expect(res.found).toBe(true);
    expect(res.pathNodeIds.length).toBeGreaterThanOrEqual(2);
    expect(res.pathNodeIds[0]).toBe(preset.startNodeId);
    expect(res.pathNodeIds[res.pathNodeIds.length - 1]).toBe(preset.targetNodeId);
  });

  it("handles disconnected target gracefully", () => {
    // createDisconnectedGraphPreset has isolated clusters with target unreachable
    const preset = createDisconnectedGraphPreset();
    const res = graphDfs(preset);
    expect(res.found).toBe(false);
    expect(res.pathNodeIds).toHaveLength(0);
    expect(res.pathEdgeIds).toHaveLength(0);
    expect(res.pathCost).toBeNull();
    expect(res.discoveredCount).toBeGreaterThan(0);
    expect(res.expandedCount).toBeGreaterThan(0);
  });

  it("ignores edge weights completely", () => {
    // S -> A (weight 100) -> T (weight 100) vs S -> B (weight 1) -> C (weight 1) -> T (weight 1)
    const doc = createEmptyGraphDocument();
    const { doc: d1, newNode: nS } = addNode(doc, { x: 0, y: 0 }, "S");
    const { doc: d2, newNode: nA } = addNode(d1, { x: 50, y: -50 }, "A");
    const { doc: d3, newNode: nB } = addNode(d2, { x: 50, y: 50 }, "B");
    const { doc: d4, newNode: nT } = addNode(d3, { x: 100, y: 0 }, "T");

    // Force deterministic ordering: ensure A's id is lexicographically smaller than B's id
    const [firstNode, secondNode] = nA.id < nB.id ? [nA, nB] : [nB, nA];

    let d = addEdge(d4, nS.id, firstNode.id, 500).doc;
    d = addEdge(d, firstNode.id, nT.id, 500).doc;
    d = addEdge(d, nS.id, secondNode.id, 1).doc;
    d = addEdge(d, secondNode.id, nT.id, 1).doc;

    d = setStartNode(d, nS.id);
    d = setTargetNode(d, nT.id);

    const res = graphDfs(d);
    expect(res.found).toBe(true);
    // DFS will dive down firstNode branch despite weight 500
    expect(res.pathNodeIds).toEqual([nS.id, firstNode.id, nT.id]);
    expect(res.pathCost).toBe(1000);
  });

  it("records valid events and reconstructs path matching parent pointers", () => {
    const doc = createEmptyGraphDocument();
    const { doc: d1, newNode: n1 } = addNode(doc, { x: 0, y: 0 });
    const { doc: d2, newNode: n2 } = addNode(d1, { x: 10, y: 0 });
    const { doc: d3, newNode: n3 } = addNode(d2, { x: 20, y: 0 });
    let d = addEdge(d3, n1.id, n2.id, 2).doc;
    d = addEdge(d, n2.id, n3.id, 3).doc;
    d = setStartNode(d, n1.id);
    d = setTargetNode(d, n3.id);

    const res = graphDfs(d, { recordEvents: true });
    expect(res.found).toBe(true);
    expect(res.events.length).toBeGreaterThan(0);

    const eventTypes = res.events.map((e) => e.type);
    expect(eventTypes).toContain("discovered");
    expect(eventTypes).toContain("expanded");
    expect(eventTypes).toContain("closed");
    expect(eventTypes).toContain("pathNode");
    expect(eventTypes).toContain("pathEdge");
  });
});
