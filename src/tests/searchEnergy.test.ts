import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { astar } from "../algorithms/astar";
import { bfs } from "../algorithms/bfs";
import { dfs } from "../algorithms/dfs";
import { dijkstra } from "../algorithms/dijkstra";
import { GridBoard } from "../components/Grid/GridBoard";
import { GridLegend } from "../components/Grid/GridLegend";
import {
  computeSearchVisualBounds,
  getCurrentSearchTelemetry,
  getSearchEnergyScaleConfig,
  getSearchStateColor,
  getSearchVisualMetric,
  normalizeSearchMetric,
  SEARCH_ENERGY_GRADIENT,
  type SearchVisualBounds,
} from "../components/Grid/searchEnergy";
import { createCustomTerrain, setTerrain } from "../core/grid";
import { createPlaybackSnapshot } from "../playback/reducer";
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

  describe("Search Energy Scale & Legend", () => {
    it("exports a continuous CSS linear-gradient string matching all palette stops", () => {
      expect(SEARCH_ENERGY_GRADIENT).toContain("linear-gradient(90deg");
      expect(SEARCH_ENERGY_GRADIENT).toContain("#22d3ee 0%");
      expect(SEARCH_ENERGY_GRADIENT).toContain("#2dd4bf 25%");
      expect(SEARCH_ENERGY_GRADIENT).toContain("#84cc16 50%");
      expect(SEARCH_ENERGY_GRADIENT).toContain("#f59e0b 75%");
      expect(SEARCH_ENERGY_GRADIENT).toContain("#f97316 100%");
    });

    it("generates correct algorithm-specific scale config when a valid run exists", () => {
      const bounds: SearchVisualBounds = {
        algorithm: "bfs",
        maxLevel: 42,
        maxCost: 110,
        maxDepth: 88,
        maxF: 50,
      };

      const bfsConfig = getSearchEnergyScaleConfig("bfs", bounds, true);
      expect(bfsConfig.label).toBe("BFS level");
      expect(bfsConfig.minLabel).toBe("0");
      expect(bfsConfig.maxLabel).toBe("42");
      expect(bfsConfig.hasActiveBounds).toBe(true);
      expect(bfsConfig.tooltip).toContain("BFS level");

      const dfsConfig = getSearchEnergyScaleConfig("dfs", bounds, true);
      expect(dfsConfig.label).toBe("Search depth");
      expect(dfsConfig.minLabel).toBe("0");
      expect(dfsConfig.maxLabel).toBe("88");
      expect(dfsConfig.hasActiveBounds).toBe(true);
      expect(dfsConfig.tooltip).toContain("search-tree branch depth");

      const dijkstraConfig = getSearchEnergyScaleConfig("dijkstra", bounds, true);
      expect(dijkstraConfig.label).toBe("Path cost");
      expect(dijkstraConfig.minLabel).toBe("0");
      expect(dijkstraConfig.maxLabel).toBe("110");
      expect(dijkstraConfig.hasActiveBounds).toBe(true);
      expect(dijkstraConfig.tooltip).toContain("accumulated path cost");

      const astarConfig = getSearchEnergyScaleConfig("astar", bounds, true);
      expect(astarConfig.label).toBe("Goal progress");
      expect(astarConfig.minLabel).toBe("0%");
      expect(astarConfig.maxLabel).toBe("100%");
      expect(astarConfig.hasActiveBounds).toBe(true);
      expect(astarConfig.tooltip).toContain("goal progress ratio");
    });

    it("de-emphasizes bounds when no search result exists", () => {
      const bounds: SearchVisualBounds = {
        algorithm: "bfs",
        maxLevel: 1,
        maxCost: 1,
        maxDepth: 1,
        maxF: 1,
      };

      const bfsIdle = getSearchEnergyScaleConfig("bfs", bounds, false);
      expect(bfsIdle.maxLabel).toBe("—");
      expect(bfsIdle.hasActiveBounds).toBe(false);

      const dfsIdle = getSearchEnergyScaleConfig("dfs", bounds, false);
      expect(dfsIdle.maxLabel).toBe("—");
      expect(dfsIdle.hasActiveBounds).toBe(false);

      const dijkstraIdle = getSearchEnergyScaleConfig("dijkstra", bounds, false);
      expect(dijkstraIdle.maxLabel).toBe("—");
      expect(dijkstraIdle.hasActiveBounds).toBe(false);

      // A* is naturally normalized 0% -> 100%
      const astarIdle = getSearchEnergyScaleConfig("astar", bounds, false);
      expect(astarIdle.minLabel).toBe("0%");
      expect(astarIdle.maxLabel).toBe("100%");
    });
  });

  describe("GridLegend and GridBoard Component Rendering", () => {
    it("renders GridLegend with the algorithm-specific scale and swatches", () => {
      const bounds: SearchVisualBounds = {
        algorithm: "bfs",
        maxLevel: 35,
        maxCost: 1,
        maxDepth: 1,
        maxF: 1,
      };

      const html = renderToStaticMarkup(
        React.createElement(GridLegend, {
          customTerrainCost: 7,
          algorithm: "bfs",
          searchBounds: bounds,
          hasResult: true,
        }),
      );

      expect(html).toContain("BFS level");
      expect(html).toContain(">0<");
      expect(html).toContain(">35<");
      expect(html).toContain("is-active");
      expect(html).toContain("scale-gradient");
      expect(html).toContain("Frontier");
    });

    it("renders GridLegend in idle state before search runs", () => {
      const html = renderToStaticMarkup(
        React.createElement(GridLegend, {
          customTerrainCost: 7,
          algorithm: "dijkstra",
          searchBounds: null,
          hasResult: false,
        }),
      );

      expect(html).toContain("Path cost");
      expect(html).toContain(">—<");
      expect(html).toContain("is-idle");
    });

    it("applies is-complete class on GridBoard when playback is complete", () => {
      const grid = gridFromRows(["S..", "...", "..T"]);
      const snapshot = createPlaybackSnapshot();

      const completeHtml = renderToStaticMarkup(
        React.createElement(GridBoard, {
          grid,
          snapshot,
          customTerrainCost: 5,
          selectedCoordinate: null,
          isComplete: true,
          onInspect: () => {},
          onPaint: () => {},
          onMoveEndpoint: () => {},
        }),
      );
      expect(completeHtml).toContain("grid-board");
      expect(completeHtml).toContain("is-complete");

      const midSearchHtml = renderToStaticMarkup(
        React.createElement(GridBoard, {
          grid,
          snapshot,
          customTerrainCost: 5,
          selectedCoordinate: null,
          isComplete: false,
          onInspect: () => {},
          onPaint: () => {},
          onMoveEndpoint: () => {},
        }),
      );
      expect(midSearchHtml).toContain("grid-board");
      expect(midSearchHtml).not.toContain("is-complete");
    });
  });

  describe("Live Search Energy Telemetry Cursor", () => {
    it("1. extracts BFS current level metric accurately during playback", () => {
      const grid = gridFromRows([
        "S...",
        "....",
        "...T",
      ]);
      const result = bfs(grid);
      const bounds = computeSearchVisualBounds(result);

      // Early search: Start node
      const tEarly = getCurrentSearchTelemetry("bfs", result, 1, bounds);
      expect(tEarly.currentMetricValue).toBe(0);
      expect(tEarly.displayValue).toBe("0");
      expect(tEarly.normalizedProgress).toBe(0);
      expect(tEarly.color?.accentHex).toBe("#22d3ee"); // Cyan at 0%

      // Mid search: find an expanded event with level > 0
      const expandedIdx = result.events.findIndex(
        (e) => e.type === "expanded" && e.values && (e.values.level ?? 0) >= 2,
      );
      expect(expandedIdx).toBeGreaterThan(0);
      const tMid = getCurrentSearchTelemetry("bfs", result, expandedIdx + 1, bounds);
      expect(tMid.currentMetricValue).toBeGreaterThanOrEqual(2);
      expect(tMid.displayValue).toBe(`${tMid.currentMetricValue}`);
      expect(tMid.normalizedProgress).toBeGreaterThan(0);
      expect(tMid.color).not.toBeNull();
    });

    it("2. extracts DFS depth and naturally advances and retracts on backtrack", () => {
      // Create a grid where DFS must explore a branch, hit a wall, and backtrack
      const grid = gridFromRows([
        "S#..",
        ".#..",
        "...T",
      ]);
      const result = dfs(grid);
      const bounds = computeSearchVisualBounds(result);

      let maxObservedDepth = 0;
      let observedBacktrack = false;
      let prevDepth = 0;

      for (let c = 1; c <= result.events.length; c++) {
        const t = getCurrentSearchTelemetry("dfs", result, c, bounds);
        if (t.currentMetricValue !== null) {
          if (t.currentMetricValue > maxObservedDepth) {
            maxObservedDepth = t.currentMetricValue;
          }
          if (t.currentMetricValue < prevDepth) {
            observedBacktrack = true;
          }
          prevDepth = t.currentMetricValue;
        }
      }

      expect(maxObservedDepth).toBeGreaterThan(0);
      expect(observedBacktrack).toBe(true);
    });

    it("3. extracts Dijkstra current g-cost monotonically from min-heap pops", () => {
      const grid = gridFromRows([
        "S.w.",
        ".w..",
        "...T",
      ]);
      const result = dijkstra(grid);
      const bounds = computeSearchVisualBounds(result);

      let lastPoppedCost = 0;
      for (let c = 1; c <= result.events.length; c++) {
        const event = result.events[c - 1];
        if (event.type === "expanded" && event.values?.g !== undefined) {
          const t = getCurrentSearchTelemetry("dijkstra", result, c, bounds);
          expect(t.currentMetricValue).toBe(event.values.g);
          expect(t.currentMetricValue!).toBeGreaterThanOrEqual(lastPoppedCost);
          lastPoppedCost = t.currentMetricValue!;
        }
      }
    });

    it("4. extracts A* goal-progress ratio as an integer percentage", () => {
      const grid = gridFromRows([
        "S...",
        "....",
        "...T",
      ]);
      const result = astar(grid);
      const bounds = computeSearchVisualBounds(result);

      // Start node
      const tStart = getCurrentSearchTelemetry("astar", result, 1, bounds);
      expect(tStart.displayValue).toBe("0%");
      expect(tStart.normalizedProgress).toBe(0);

      // At Target expansion (when Target is popped)
      const targetExpandedIdx = result.events.findIndex(
        (e) => e.type === "expanded" && e.values && (e.values.h === 0 || e.coordinate.row === 2 && e.coordinate.col === 3),
      );
      if (targetExpandedIdx !== -1) {
        const tTarget = getCurrentSearchTelemetry("astar", result, targetExpandedIdx + 1, bounds);
        expect(tTarget.displayValue).toBe("100%");
        expect(tTarget.normalizedProgress).toBe(1);
      }
    });

    it("5. normalizes metric to marker position accurately", () => {
      const bounds: SearchVisualBounds = {
        algorithm: "bfs",
        maxLevel: 20,
        maxCost: 1,
        maxDepth: 1,
        maxF: 1,
      };

      const normStart = normalizeSearchMetric("bfs", 0, bounds);
      expect(normStart).toBe(0);

      const normMid = normalizeSearchMetric("bfs", 10, bounds);
      expect(normMid).toBe(0.5);

      const normEnd = normalizeSearchMetric("bfs", 20, bounds);
      expect(normEnd).toBe(1);
    });

    it("6. clamps position strictly within [0, 1]", () => {
      const bounds: SearchVisualBounds = {
        algorithm: "dijkstra",
        maxLevel: 1,
        maxCost: 50,
        maxDepth: 1,
        maxF: 1,
      };

      expect(normalizeSearchMetric("dijkstra", -10, bounds)).toBe(0);
      expect(normalizeSearchMetric("dijkstra", 75, bounds)).toBe(1);
    });

    it("7. handles reset / no-result / cursor <= 0 gracefully with dormant state", () => {
      const tNullResult = getCurrentSearchTelemetry("bfs", null, 10, null);
      expect(tNullResult.currentMetricValue).toBeNull();
      expect(tNullResult.displayValue).toBe("—");
      expect(tNullResult.normalizedProgress).toBeNull();
      expect(tNullResult.color).toBeNull();

      const grid = gridFromRows(["S.T"]);
      const result = bfs(grid);
      const bounds = computeSearchVisualBounds(result);

      const tZeroCursor = getCurrentSearchTelemetry("bfs", result, 0, bounds);
      expect(tZeroCursor.currentMetricValue).toBeNull();
      expect(tZeroCursor.displayValue).toBe("—");
      expect(tZeroCursor.normalizedProgress).toBeNull();
      expect(tZeroCursor.color).toBeNull();
    });

    it("8. stably preserves authentic final processed metric upon search completion", () => {
      const grid = gridFromRows([
        "S...",
        "....",
        "...T",
      ]);
      const result = dijkstra(grid);
      const bounds = computeSearchVisualBounds(result);

      // Query at final step
      const tEnd = getCurrentSearchTelemetry("dijkstra", result, result.events.length, bounds);
      expect(tEnd.currentMetricValue).not.toBeNull();
      expect(tEnd.displayValue).not.toBe("—");
      expect(tEnd.normalizedProgress).toBeGreaterThan(0);
      expect(tEnd.normalizedProgress).toBeLessThanOrEqual(1);

      // Verify it did NOT artificially snap to 100% if target cost is less than max bound
      const lastExpanded = [...result.events].reverse().find((e) => e.type === "expanded");
      if (lastExpanded && lastExpanded.values?.g !== undefined) {
        expect(tEnd.currentMetricValue).toBe(lastExpanded.values.g);
      }
    });

    it("9. stably maintains target metric throughout path-reconstruction events", () => {
      const grid = gridFromRows([
        "S..",
        "..T",
      ]);
      const result = astar(grid);
      const bounds = computeSearchVisualBounds(result);

      // Find first path event
      const pathEventIdx = result.events.findIndex((e) => e.type === "path");
      expect(pathEventIdx).toBeGreaterThan(0);

      const tAtFirstPath = getCurrentSearchTelemetry("astar", result, pathEventIdx + 1, bounds);
      const tAtEnd = getCurrentSearchTelemetry("astar", result, result.events.length, bounds);

      // During path reconstruction, telemetry remains constant at the Target node metric
      expect(tAtFirstPath.displayValue).toBe(tAtEnd.displayValue);
      expect(tAtFirstPath.normalizedProgress).toBe(tAtEnd.normalizedProgress);
      expect(tAtFirstPath.color?.accentHex).toBe(tAtEnd.color?.accentHex);
    });

    it("10. delivers deterministic telemetry on backward scrub", () => {
      const grid = gridFromRows([
        "S...",
        "....",
        "...T",
      ]);
      const result = bfs(grid);
      const bounds = computeSearchVisualBounds(result);

      const targetStep = 8;
      const forwardT = getCurrentSearchTelemetry("bfs", result, targetStep, bounds);

      // Jump forward to step 15, then query step 8 (backward scrub)
      getCurrentSearchTelemetry("bfs", result, 15, bounds);
      const backwardT = getCurrentSearchTelemetry("bfs", result, targetStep, bounds);

      expect(backwardT).toEqual(forwardT);
    });

    it("11. delivers deterministic telemetry on forward scrub", () => {
      const grid = gridFromRows([
        "S..",
        "...",
        "..T",
      ]);
      const result = dijkstra(grid);
      const bounds = computeSearchVisualBounds(result);

      const scrubStep = 12;
      const scrubT = getCurrentSearchTelemetry("dijkstra", result, scrubStep, bounds);

      // Step-by-step query
      let stepT;
      for (let i = 1; i <= scrubStep; i++) {
        stepT = getCurrentSearchTelemetry("dijkstra", result, i, bounds);
      }

      expect(scrubT).toEqual(stepT);
    });

    it("12. renders live telemetry marker and readout in GridLegend markup", () => {
      const grid = gridFromRows(["S..", "..T"]);
      const result = bfs(grid);
      const bounds = computeSearchVisualBounds(result);

      const activeHtml = renderToStaticMarkup(
        React.createElement(GridLegend, {
          customTerrainCost: 5,
          algorithm: "bfs",
          searchBounds: bounds,
          hasResult: true,
          cursor: 5,
          activeResult: result,
        }),
      );

      expect(activeHtml).toContain("is-telemetry-active");
      expect(activeHtml).toContain('data-testid="search-energy-marker"');
      expect(activeHtml).toContain("scale-marker-notch");
      expect(activeHtml).toContain("scale-marker-stem");
      expect(activeHtml).toContain("scale-marker-value");
      expect(activeHtml).toContain("Current BFS level:");

      const idleHtml = renderToStaticMarkup(
        React.createElement(GridLegend, {
          customTerrainCost: 5,
          algorithm: "bfs",
          searchBounds: bounds,
          hasResult: true,
          cursor: 0,
          activeResult: result,
        }),
      );

      expect(idleHtml).not.toContain("is-telemetry-active");
      expect(idleHtml).not.toContain('data-testid="search-energy-marker"');
      expect(idleHtml).toContain("scale-bound");
    });
  });
});
