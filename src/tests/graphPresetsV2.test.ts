import { describe, expect, it } from "vitest";
import { GRAPH_PRESETS } from "../graph/presets";
import { createLeetcodeGraphPreset } from "../graph/presets/leetcodeGraph";
import { createLargeNetworkPreset } from "../graph/presets/largeNetwork";
import { graphBfs } from "../graph/algorithms/bfs";
import { graphDfs } from "../graph/algorithms/dfs";
import { graphDijkstra } from "../graph/algorithms/dijkstra";

describe("Graph Presets V2 Polish", () => {
  describe("Preset Registry Uniqueness", () => {
    it("contains exactly 8 unique presets in the intended order", () => {
      expect(GRAPH_PRESETS).toHaveLength(8);

      const ids = GRAPH_PRESETS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(8);

      const names = GRAPH_PRESETS.map((p) => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(8);

      expect(ids).toEqual([
        "weighted-detour",
        "balanced-tree",
        "leetcode-graph",
        "cyclic-network",
        "disconnected-graph",
        "dense-network",
        "dependency-dag",
        "large-network",
      ]);
    });

    it("verifies every preset instantiates with valid start and target", () => {
      for (const preset of GRAPH_PRESETS) {
        const doc = preset.create();
        expect(doc.nodes.length).toBeGreaterThan(0);
        expect(doc.startNodeId).not.toBeNull();
        expect(doc.targetNodeId).not.toBeNull();
        expect(doc.startNodeId).not.toBe(doc.targetNodeId);

        const nodeIds = new Set(doc.nodes.map((n) => n.id));
        expect(nodeIds.has(doc.startNodeId!)).toBe(true);
        expect(nodeIds.has(doc.targetNodeId!)).toBe(true);
      }
    });
  });

  describe("LeetCode Graph Preset", () => {
    it("has 14 numeric nodes with intentional routing and valid weights", () => {
      const doc = createLeetcodeGraphPreset();
      expect(doc.nodes).toHaveLength(14);
      expect(doc.edges.length).toBeGreaterThanOrEqual(20);
      expect(doc.startNodeId).toBe("lc-0");
      expect(doc.targetNodeId).toBe("lc-13");

      // Verify numeric values
      for (let i = 0; i < 14; i++) {
        const node = doc.nodes.find((n) => n.id === `lc-${i}`);
        expect(node).toBeDefined();
        expect(node?.value).toBe(String(i));
      }

      // Verify edge weights
      for (const edge of doc.edges) {
        expect(edge.weight).toBeGreaterThanOrEqual(1);
        expect(edge.weight).toBeLessThanOrEqual(5);
      }
    });

    it("successfully runs DFS, BFS, and Dijkstra on LeetCode Graph", () => {
      const doc = createLeetcodeGraphPreset();

      const dfsRes = graphDfs(doc);
      expect(dfsRes.found).toBe(true);
      expect(dfsRes.pathNodeIds[0]).toBe("lc-0");
      expect(dfsRes.pathNodeIds[dfsRes.pathNodeIds.length - 1]).toBe("lc-13");

      const bfsRes = graphBfs(doc);
      expect(bfsRes.found).toBe(true);
      expect(bfsRes.pathNodeIds[0]).toBe("lc-0");
      expect(bfsRes.pathNodeIds[bfsRes.pathNodeIds.length - 1]).toBe("lc-13");

      const dijkstraRes = graphDijkstra(doc);
      expect(dijkstraRes.found).toBe(true);
      expect(dijkstraRes.pathNodeIds[0]).toBe("lc-0");
      expect(dijkstraRes.pathNodeIds[dijkstraRes.pathNodeIds.length - 1]).toBe("lc-13");
      expect(dijkstraRes.pathCost).toBeGreaterThan(0);
    });
  });

  describe("Large Network Preset", () => {
    it("satisfies scale constraints (60 nodes, 80-110 edges, valid weights)", () => {
      const doc = createLargeNetworkPreset();
      // Target range: 58-64 nodes
      expect(doc.nodes.length).toBe(60);
      // Target range: 80-110 edges
      expect(doc.edges.length).toBeGreaterThanOrEqual(80);
      expect(doc.edges.length).toBeLessThanOrEqual(110);

      expect(doc.startNodeId).toBe("ln-0");
      expect(doc.targetNodeId).toBe("ln-59");

      // All node values are 0 through 59
      for (let i = 0; i < 60; i++) {
        const node = doc.nodes.find((n) => n.id === `ln-${i}`);
        expect(node).toBeDefined();
        expect(node?.value).toBe(String(i));
      }

      // Weights within range
      for (const edge of doc.edges) {
        expect(edge.weight).toBeGreaterThanOrEqual(1);
        expect(edge.weight).toBeLessThanOrEqual(25);
      }
    });

    it("demonstrates meaningful divergence between BFS and Dijkstra", () => {
      const doc = createLargeNetworkPreset();

      const bfsRes = graphBfs(doc);
      const dijkstraRes = graphDijkstra(doc);

      expect(bfsRes.found).toBe(true);
      expect(dijkstraRes.found).toBe(true);

      // BFS picks the direct express route with fewer edges
      // Dijkstra navigates the cheaper distributed route
      expect(bfsRes.pathLength).toBeLessThan(dijkstraRes.pathLength);
      expect(dijkstraRes.pathCost!).toBeLessThan(bfsRes.pathCost!);

      // DFS successfully reaches the target
      const dfsRes = graphDfs(doc);
      expect(dfsRes.found).toBe(true);
      expect(dfsRes.pathNodeIds[0]).toBe("ln-0");
      expect(dfsRes.pathNodeIds[dfsRes.pathNodeIds.length - 1]).toBe("ln-59");
    });
  });
});
