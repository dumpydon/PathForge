import { describe, expect, it } from "vitest";
import {
  addNode,
  deleteNode,
  addEdge,
  deleteEdge,
  updateEdgeWeight,
  updateNode,
  setStartNode,
  setTargetNode,
  createEmptyGraphDocument,
  graphDocumentsEqual,
} from "../graph/domain/graph";
import {
  isValidEdgeWeight,
  sanitizeEdgeWeight,
  isSelfLoop,
} from "../graph/domain/validation";
import { buildAdjacencyList } from "../graph/domain/adjacency";

describe("Graph Domain & Validation", () => {
  describe("Node CRUD", () => {
    it("creates an empty document with defaults", () => {
      const doc = createEmptyGraphDocument("Custom");
      expect(doc.nodes).toHaveLength(0);
      expect(doc.edges).toHaveLength(0);
      expect(doc.directed).toBe(false);
      expect(doc.startNodeId).toBeNull();
      expect(doc.targetNodeId).toBeNull();
      expect(doc.scenarioLabel).toBe("Custom");
    });

    it("adds nodes and automatically designates first node as start, second as target with numeric defaults", () => {
      let doc = createEmptyGraphDocument();
      const res1 = addNode(doc, { x: 100, y: 100 });
      doc = res1.doc;
      expect(doc.nodes).toHaveLength(1);
      expect(doc.startNodeId).toBe(res1.newNode.id);
      expect(doc.targetNodeId).toBeNull();
      expect(res1.newNode.label).toBe("0");
      expect(res1.newNode.value).toBe("0");

      const res2 = addNode(doc, { x: 200, y: 100 });
      doc = res2.doc;
      expect(doc.nodes).toHaveLength(2);
      expect(doc.startNodeId).toBe(res1.newNode.id);
      expect(doc.targetNodeId).toBe(res2.newNode.id);
      expect(res2.newNode.label).toBe("1");
      expect(res2.newNode.value).toBe("1");

      const res3 = addNode(doc, { x: 300, y: 100 });
      doc = res3.doc;
      expect(doc.nodes).toHaveLength(3);
      expect(doc.startNodeId).toBe(res1.newNode.id);
      expect(doc.targetNodeId).toBe(res2.newNode.id);
      expect(res3.newNode.label).toBe("2");
      expect(res3.newNode.value).toBe("2");
    });

    it("generates deterministic numeric node labels and values sequentially", () => {
      let doc = createEmptyGraphDocument();
      for (let i = 0; i < 30; i++) {
        doc = addNode(doc, { x: i * 10, y: 0 }).doc;
      }
      expect(doc.nodes[0].label).toBe("0");
      expect(doc.nodes[0].value).toBe("0");
      expect(doc.nodes[29].label).toBe("29");
      expect(doc.nodes[29].value).toBe("29");

      // Next candidate will be 30
      const res31 = addNode(doc, { x: 300, y: 0 });
      expect(res31.newNode.label).toBe("30");
      expect(res31.newNode.value).toBe("30");
    });

    it("updates node label, value, color, and position", () => {
      let doc = createEmptyGraphDocument();
      const { doc: d1, newNode } = addNode(doc, { x: 50, y: 50 });
      doc = d1;

      doc = updateNode(doc, newNode.id, {
        label: "Node 1",
        value: "42",
        color: "amber",
        position: { x: 80, y: 120 },
      });

      const updated = doc.nodes.find((n) => n.id === newNode.id)!;
      expect(updated.label).toBe("Node 1");
      expect(updated.value).toBe("42");
      expect(updated.color).toBe("amber");
      expect(updated.position).toEqual({ x: 80, y: 120 });
    });

    it("deletes a node and cascades to connected edges and start/target references", () => {
      const doc = createEmptyGraphDocument();
      const { doc: d1, newNode: nA } = addNode(doc, { x: 0, y: 0 });
      const { doc: d2, newNode: nB } = addNode(d1, { x: 100, y: 0 });
      const { doc: d3 } = addEdge(d2, nA.id, nB.id, 5);

      expect(d3.edges).toHaveLength(1);
      expect(d3.startNodeId).toBe(nA.id);
      expect(d3.targetNodeId).toBe(nB.id);

      const d4 = deleteNode(d3, nA.id);
      expect(d4.nodes).toHaveLength(1);
      expect(d4.edges).toHaveLength(0); // Cascade removed
      expect(d4.startNodeId).toBeNull(); // Cleared
      expect(d4.targetNodeId).toBe(nB.id);
    });
  });

  describe("Edge CRUD & Validation", () => {
    it("validates edge weights strictly within 0..999", () => {
      expect(isValidEdgeWeight(0)).toBe(true);
      expect(isValidEdgeWeight(1)).toBe(true);
      expect(isValidEdgeWeight(999)).toBe(true);
      expect(isValidEdgeWeight(-1)).toBe(false);
      expect(isValidEdgeWeight(1000)).toBe(false);
      expect(isValidEdgeWeight(2.5)).toBe(false);
      expect(isValidEdgeWeight(NaN)).toBe(false);
      expect(isValidEdgeWeight(Infinity)).toBe(false);

      expect(sanitizeEdgeWeight(0)).toBe(0);
      expect(sanitizeEdgeWeight(500)).toBe(500);
      expect(sanitizeEdgeWeight(1200)).toBe(999);
      expect(sanitizeEdgeWeight(-50)).toBe(0);
      expect(sanitizeEdgeWeight(4.7)).toBe(5);
    });

    it("prevents self-loops", () => {
      expect(isSelfLoop("node-1", "node-1")).toBe(true);
      expect(isSelfLoop("node-1", "node-2")).toBe(false);

      const doc = createEmptyGraphDocument();
      const { doc: d1, newNode } = addNode(doc, { x: 0, y: 0 });
      const res = addEdge(d1, newNode.id, newNode.id, 1);
      expect(res.newEdge).toBeNull();
      expect(res.error).toBe("Self-loops are not permitted.");
    });

    it("prevents duplicate edges in undirected mode", () => {
      const doc = createEmptyGraphDocument();
      doc.directed = false;
      const { doc: d1, newNode: nA } = addNode(doc, { x: 0, y: 0 });
      const { doc: d2, newNode: nB } = addNode(d1, { x: 100, y: 0 });

      const res1 = addEdge(d2, nA.id, nB.id, 3);
      expect(res1.newEdge).not.toBeNull();
      expect(res1.doc.edges).toHaveLength(1);

      // Attempt reverse connection in undirected mode
      const res2 = addEdge(res1.doc, nB.id, nA.id, 4);
      expect(res2.newEdge).toBeNull();
      expect(res2.error).toBe("That connection already exists.");
      expect(res2.doc.edges).toHaveLength(1);
    });

    it("allows reverse edge in directed mode but prevents exact duplicates", () => {
      const doc = createEmptyGraphDocument();
      doc.directed = true;
      const { doc: d1, newNode: nA } = addNode(doc, { x: 0, y: 0 });
      const { doc: d2, newNode: nB } = addNode(d1, { x: 100, y: 0 });

      const res1 = addEdge(d2, nA.id, nB.id, 5);
      expect(res1.newEdge).not.toBeNull();

      // Reverse edge is valid in directed mode
      const res2 = addEdge(res1.doc, nB.id, nA.id, 7);
      expect(res2.newEdge).not.toBeNull();
      expect(res2.doc.edges).toHaveLength(2);

      // Duplicate forward edge is rejected
      const res3 = addEdge(res2.doc, nA.id, nB.id, 10);
      expect(res3.newEdge).toBeNull();
      expect(res3.error).toBe("That connection already exists.");
    });

    it("updates edge weight with sanitization", () => {
      const doc = createEmptyGraphDocument();
      const { doc: d1, newNode: nA } = addNode(doc, { x: 0, y: 0 });
      const { doc: d2, newNode: nB } = addNode(d1, { x: 100, y: 0 });
      const { doc: d3, newEdge } = addEdge(d2, nA.id, nB.id, 10);

      const updated = updateEdgeWeight(d3, newEdge!.id, 45);
      expect(updated.edges[0].weight).toBe(45);

      const clamped = updateEdgeWeight(d3, newEdge!.id, 1500);
      expect(clamped.edges[0].weight).toBe(999);
    });

    it("deletes an edge cleanly", () => {
      const doc = createEmptyGraphDocument();
      const { doc: d1, newNode: nA } = addNode(doc, { x: 0, y: 0 });
      const { doc: d2, newNode: nB } = addNode(d1, { x: 100, y: 0 });
      const { doc: d3, newEdge } = addEdge(d2, nA.id, nB.id, 10);

      const removed = deleteEdge(d3, newEdge!.id);
      expect(removed.edges).toHaveLength(0);
    });
  });

  describe("Adjacency List & Determinism", () => {
    it("builds deterministic adjacency list sorted lexicographically by neighbor nodeId", () => {
      const doc = createEmptyGraphDocument();
      const { doc: d1, newNode: nC } = addNode(doc, { x: 0, y: 0 }, "C");
      const { doc: d2, newNode: nA } = addNode(d1, { x: 0, y: 0 }, "A");
      const { doc: d3, newNode: nB } = addNode(d2, { x: 0, y: 0 }, "B");
      const { doc: d4, newNode: nRoot } = addNode(d3, { x: 0, y: 0 }, "Root");

      // Connect Root to B, C, A in arbitrary order
      let d = addEdge(d4, nRoot.id, nC.id, 1).doc;
      d = addEdge(d, nRoot.id, nA.id, 1).doc;
      d = addEdge(d, nRoot.id, nB.id, 1).doc;

      const adj = buildAdjacencyList(d);
      const rootNeighbors = adj.get(nRoot.id)!;
      expect(rootNeighbors).toHaveLength(3);

      // Verify sorted order by nodeId
      const sortedIds = [nA.id, nB.id, nC.id].sort((x, y) => x.localeCompare(y));
      expect(rootNeighbors.map((n) => n.nodeId)).toEqual(sortedIds);
    });

    it("respects directed mode when building adjacency list", () => {
      const doc = createEmptyGraphDocument();
      doc.directed = true;
      const { doc: d1, newNode: nA } = addNode(doc, { x: 0, y: 0 });
      const { doc: d2, newNode: nB } = addNode(d1, { x: 100, y: 0 });
      const d3 = addEdge(d2, nA.id, nB.id, 5).doc;

      const adj = buildAdjacencyList(d3);
      expect(adj.get(nA.id)!.map((n) => n.nodeId)).toEqual([nB.id]);
      expect(adj.get(nB.id)!).toHaveLength(0); // Not bidirectional
    });

    it("includes isolated nodes with empty neighbor lists", () => {
      const doc = createEmptyGraphDocument();
      const { doc: d1, newNode: nA } = addNode(doc, { x: 0, y: 0 });
      const adj = buildAdjacencyList(d1);
      expect(adj.has(nA.id)).toBe(true);
      expect(adj.get(nA.id)).toEqual([]);
    });
  });

  describe("Start and Target Rules & Equality", () => {
    it("sets start and target without allowing collision", () => {
      const doc = createEmptyGraphDocument();
      const { doc: d1, newNode: nA } = addNode(doc, { x: 0, y: 0 });
      const { doc: d2, newNode: nB } = addNode(d1, { x: 100, y: 0 });

      let current = setStartNode(d2, nA.id);
      current = setTargetNode(current, nB.id);
      expect(current.startNodeId).toBe(nA.id);
      expect(current.targetNodeId).toBe(nB.id);

      // Setting start to target clears target
      current = setStartNode(current, nB.id);
      expect(current.startNodeId).toBe(nB.id);
      expect(current.targetNodeId).toBeNull();
    });

    it("detects document equality correctly", () => {
      const doc1 = createEmptyGraphDocument();
      const { doc: d1, newNode: nA } = addNode(doc1, { x: 0, y: 0 });
      const doc2 = JSON.parse(JSON.stringify(d1));

      expect(graphDocumentsEqual(d1, doc2)).toBe(true);

      const modified = updateNode(d1, nA.id, { label: "Changed" });
      expect(graphDocumentsEqual(d1, modified)).toBe(false);
    });
  });
});
