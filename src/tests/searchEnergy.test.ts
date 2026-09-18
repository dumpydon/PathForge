import { describe, expect, it } from "vitest";
import { astar } from "../algorithms/astar";
import { bfs } from "../algorithms/bfs";
import { dfs } from "../algorithms/dfs";
import { dijkstra } from "../algorithms/dijkstra";
import {
  computeSearchVisualBounds,
  getSearchStateColor,
  getSearchVisualMetric,
  normalizeSearchMetric,
  type SearchVisualBounds,
} from "../components/Grid/searchEnergy";
import { createCustomTerrain, setTerrain } from "../core/grid";
import { gridFromRows } from "./fixtures";

describe("searchEnergy", () => {
  describe("computeSearchVisualBounds", () => {
    it("returns safe non-zero bounds for null or empty search results", () => {
      const bounds = computeSearchVisualBounds(null);
      expect(bounds.maxLevel).toBeGreaterThanOrEqual(1);
      expect(bounds.maxCost).toBeGreaterThanOrEqual(1);
      expect(bounds.maxDepth).toBeGreaterThanOrEqual(1);
      expect(bounds.maxF).toBeGreaterThanOrEqual(1);
    });

    it("correctly computes maxLevel for BFS runs", () => {
      const grid = gridFromRows(["S...", "....", "...T"]);
      const result = bfs(grid);
      const bounds = computeSearchVisualBounds(result);
      expect(bounds.algorithm).toBe("bfs");
      expect(bounds.maxLevel).toBeGreaterThanOrEqual(3);
    });

    it("correctly computes maxDepth for DFS runs", () => {
      const grid = gridFromRows(["S...", "....", "...T"]);
      const result = dfs(grid);
      const bounds = computeSearchVisualBounds(result);
      expect(bounds.algorithm).toBe("dfs");
      expect(bounds.maxDepth).toBeGreaterThanOrEqual(3);
    });

    it("correctly computes maxCost for Dijkstra runs with weighted terrain", () => {
      let grid = gridFromRows(["S..", "...", "..T"]);
      grid = setTerrain(grid, { row: 1, col: 1 }, "water"); // cost 5
      const result = dijkstra(grid);
      const bounds = computeSearchVisualBounds(result);
      expect(bounds.algorithm).toBe("dijkstra");
      expect(bounds.maxCost).toBeGreaterThanOrEqual(4);
    });

    it("correctly computes maxF for A* runs", () => {
      const grid = gridFromRows(["S...", "....", "...T"]);
      const result = astar(grid);
      const bounds = computeSearchVisualBounds(result);
      expect(bounds.algorithm).toBe("astar");
      expect(bounds.maxF).toBeGreaterThanOrEqual(result.pathCost ?? 1);
    });
  });

  describe("getSearchVisualMetric", () => {
    it("extracts BFS level metric", () => {
      const metric = getSearchVisualMetric("bfs", { parent: null, level: 5 });
      expect(metric.value).toBe(5);
      expect(metric.label).toBe("Level 5");
    });

    it("extracts DFS depth metric", () => {
      const metric = getSearchVisualMetric("dfs", { parent: null, level: 12 });
      expect(metric.value).toBe(12);
      expect(metric.label).toBe("Depth 12");
    });

    it("extracts Dijkstra accumulated cost metric", () => {
      const metric = getSearchVisualMetric("dijkstra", { parent: null, g: 27 });
      expect(metric.value).toBe(27);
      expect(metric.label).toBe("Cost 27");
    });

    it("extracts A* goal progress ratio metric", () => {
      // Halfway to goal: g = 10, h = 10 -> ratio = 0.5
      const metric = getSearchVisualMetric("astar", { parent: null, g: 10, h: 10, f: 20 });
      expect(metric.value).toBe(0.5);
      expect(metric.label).toBe("Progress 50%");
    });

    it("handles safe fallbacks for undefined values", () => {
      const metric = getSearchVisualMetric("bfs", null);
      expect(metric.value).toBe(0);
      expect(metric.label).toBe("0");
    });
  });

  describe("normalizeSearchMetric", () => {
    const dummyBounds: SearchVisualBounds = {
      algorithm: "bfs",
      maxLevel: 20,
      maxCost: 100,
      maxDepth: 50,
      maxF: 30,
    };

    it("normalizes BFS level linearly against maxLevel", () => {
      expect(normalizeSearchMetric("bfs", 0, dummyBounds)).toBe(0);
      expect(normalizeSearchMetric("bfs", 10, dummyBounds)).toBe(0.5);
      expect(normalizeSearchMetric("bfs", 20, dummyBounds)).toBe(1.0);
      expect(normalizeSearchMetric("bfs", 30, dummyBounds)).toBe(1.0); // Clamped
    });

    it("normalizes DFS depth linearly against maxDepth", () => {
      expect(normalizeSearchMetric("dfs", 0, dummyBounds)).toBe(0);
      expect(normalizeSearchMetric("dfs", 25, dummyBounds)).toBe(0.5);
      expect(normalizeSearchMetric("dfs", 50, dummyBounds)).toBe(1.0);
    });

    it("normalizes Dijkstra cost linearly against maxCost", () => {
      expect(normalizeSearchMetric("dijkstra", 0, dummyBounds)).toBe(0);
      expect(normalizeSearchMetric("dijkstra", 50, dummyBounds)).toBe(0.5);
      expect(normalizeSearchMetric("dijkstra", 100, dummyBounds)).toBe(1.0);
    });

    it("normalizes A* goal progress ratio within [0, 1]", () => {
      expect(normalizeSearchMetric("astar", 0, dummyBounds, { parent: null, g: 0, h: 15 })).toBe(0);
      expect(normalizeSearchMetric("astar", 0, dummyBounds, { parent: null, g: 15, h: 0 })).toBe(1.0);
      expect(normalizeSearchMetric("astar", 0, dummyBounds, { parent: null, g: 15, h: 15 })).toBe(0.5);
    });
  });

  describe("getSearchStateColor", () => {
    const bounds: SearchVisualBounds = {
      algorithm: "bfs",
      maxLevel: 10,
      maxCost: 50,
      maxDepth: 20,
      maxF: 30,
    };

    it("produces electric cyan at progress 0.0", () => {
      const color = getSearchStateColor("bfs", { parent: null, level: 0 }, bounds);
      expect(color.progress).toBe(0);
      expect(color.accentHex.toLowerCase()).toBe("#22d3ee");
      expect(color.background).toContain("rgba(34, 211, 238");
      expect(color.glow).toContain("rgba(34, 211, 238");
      expect(color.metricLabel).toBe("Level 0");
    });

    it("produces lime at progress 0.5", () => {
      const color = getSearchStateColor("bfs", { parent: null, level: 5 }, bounds);
      expect(color.progress).toBe(0.5);
      expect(color.accentHex.toLowerCase()).toBe("#84cc16");
      expect(color.background).toContain("rgba(132, 204, 22");
    });

    it("produces coral orange at progress 1.0", () => {
      const color = getSearchStateColor("bfs", { parent: null, level: 10 }, bounds);
      expect(color.progress).toBe(1);
      expect(color.accentHex.toLowerCase()).toBe("#f97316");
      expect(color.background).toContain("rgba(249, 115, 22");
    });

    it("caches identical queries for high rendering performance", () => {
      const color1 = getSearchStateColor("bfs", { parent: null, level: 3 }, bounds);
      const color2 = getSearchStateColor("bfs", { parent: null, level: 3 }, bounds);
      expect(color1).toBe(color2); // Reference equality from cache
    });
  });

  describe("Algorithmic Differentiation Verification", () => {
    it("ensures all four algorithms have distinct semantic metrics on the same grid", () => {
      const grid = gridFromRows([
        "S...",
        ".##.",
        "....",
        "...T",
      ]);

      const bfsResult = bfs(grid);
      const dfsResult = dfs(grid);
      const dijkstraResult = dijkstra(grid);
      const astarResult = astar(grid);

      // Verify all algorithms emit events with their respective values
      const bfsEvents = bfsResult.events.filter((e) => e.type === "discovered" && e.values);
      const dfsEvents = dfsResult.events.filter((e) => e.type === "discovered" && e.values);
      const dijkstraEvents = dijkstraResult.events.filter((e) => e.type === "discovered" && e.values);
      const astarEvents = astarResult.events.filter((e) => e.type === "discovered" && e.values);

      expect(bfsEvents.length).toBeGreaterThan(0);
      expect(dfsEvents.length).toBeGreaterThan(0);
      expect(dijkstraEvents.length).toBeGreaterThan(0);
      expect(astarEvents.length).toBeGreaterThan(0);

      // BFS events have level
      expect(bfsEvents.every((e) => "values" in e && typeof e.values?.level === "number")).toBe(true);

      // DFS events have level representing branch depth
      expect(dfsEvents.every((e) => "values" in e && typeof e.values?.level === "number")).toBe(true);

      // Dijkstra events have g representing accumulated cost
      expect(dijkstraEvents.every((e) => "values" in e && typeof e.values?.g === "number")).toBe(true);

      // A* events have g, h, and f
      expect(astarEvents.every((e) => "values" in e && typeof e.values?.g === "number" && typeof e.values?.h === "number")).toBe(true);
    });

    it("verifies Dijkstra wavefront warps on high-cost terrain", () => {
      let grid = gridFromRows([
        "S...",
        "....",
        "....",
        "...T",
      ]);
      // Place custom heavy terrain on one branch
      grid = setTerrain(grid, { row: 0, col: 1 }, createCustomTerrain(10));
      const result = dijkstra(grid);
      const customCellEvent = result.events.find(
        (e) => "values" in e && e.coordinate.row === 0 && e.coordinate.col === 1 && e.type === "discovered",
      );
      const unweightedCellEvent = result.events.find(
        (e) => "values" in e && e.coordinate.row === 1 && e.coordinate.col === 0 && e.type === "discovered",
      );

      expect(customCellEvent && "values" in customCellEvent ? customCellEvent.values.g : 0).toBe(10);
      expect(unweightedCellEvent && "values" in unweightedCellEvent ? unweightedCellEvent.values.g : 0).toBe(1);
    });

    it("verifies DFS tracks authentic tree branch depth across deepening and backtracking", () => {
      const grid = gridFromRows([
        "S..",
        "###",
        "T..",
      ]);
      const result = dfs(grid);
      const startEvent = result.events.find((e) => e.coordinate.row === 0 && e.coordinate.col === 0 && e.type === "discovered");
      const deepEvent = result.events.find((e) => e.coordinate.row === 0 && e.coordinate.col === 2 && e.type === "discovered");

      expect(startEvent && "values" in startEvent ? startEvent.values.level : -1).toBe(0);
      expect(deepEvent && "values" in deepEvent ? deepEvent.values.level : -1).toBe(2);
    });
  });
});
