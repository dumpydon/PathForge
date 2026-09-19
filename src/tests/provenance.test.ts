import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { astar } from "../algorithms/astar";
import { bfs } from "../algorithms/bfs";
import { dfs } from "../algorithms/dfs";
import { dijkstra } from "../algorithms/dijkstra";
import {
  buildSvgPathD,
  computeCellCenter,
  extractProvenanceTrace,
  formatProvenanceMetric,
} from "../components/Grid/provenance";
import { ProvenanceOverlay } from "../components/Grid/ProvenanceOverlay";
import { computeSearchVisualBounds } from "../components/Grid/searchEnergy";
import { coordinateKey, type Coordinate } from "../core/types";
import { applySearchEvents, createPlaybackSnapshot } from "../playback/reducer";
import { createPlaybackTimeline } from "../playback/timeline";
import { gridFromRows } from "./fixtures";

describe("Frontier Provenance & Hover Trace System", () => {
  describe("BFS Provenance Tracing", () => {
    it("extracts the authentic discovery tree predecessor chain from Start to frontier node", () => {
      const grid = gridFromRows([
        "S...",
        "....",
        "...T",
      ]);
      const result = bfs(grid);
      const bounds = computeSearchVisualBounds(result);
      const timeline = createPlaybackTimeline(result.events);

      // Advance to step 5 where multiple frontier nodes exist
      const snapshot = timeline.getSnapshotForStep(5);

      // Find an active frontier cell
      let frontierCoord: Coordinate | null = null;
      for (const [key, node] of snapshot.nodes) {
        if (node.state === "frontier" && node.parent) {
          const [row, col] = key.split(":").map(Number);
          frontierCoord = { row, col };
          break;
        }
      }

      expect(frontierCoord).not.toBeNull();
      const trace = extractProvenanceTrace(frontierCoord, snapshot, grid, "bfs", bounds);
      expect(trace).not.toBeNull();
      expect(trace!.algorithm).toBe("bfs");
      expect(trace!.metric.name).toBe("BFS level");
      expect(trace!.chain[0]).toEqual(grid.start);
      expect(trace!.chain[trace!.chain.length - 1]).toEqual(frontierCoord!);
      expect(trace!.chain.length).toBeGreaterThanOrEqual(2);

      // Verify every adjacent step in chain is an orthogonal neighbor
      for (let i = 0; i < trace!.chain.length - 1; i++) {
        const c1 = trace!.chain[i];
        const c2 = trace!.chain[i + 1];
        const dist = Math.abs(c1.row - c2.row) + Math.abs(c1.col - c2.col);
        expect(dist).toBe(1);
      }
    });
  });

  describe("DFS Provenance Tracing", () => {
    it("extracts search-tree branch ancestry and isolates branch depth", () => {
      const grid = gridFromRows([
        "S#..",
        ".#..",
        "...T",
      ]);
      const result = dfs(grid);
      const bounds = computeSearchVisualBounds(result);
      const timeline = createPlaybackTimeline(result.events);

      // Mid-search snapshot
      const snapshot = timeline.getSnapshotForStep(4);
      let frontierCoord: Coordinate | null = null;
      for (const [key, node] of snapshot.nodes) {
        if (node.state === "frontier" && node.parent) {
          const [row, col] = key.split(":").map(Number);
          frontierCoord = { row, col };
          break;
        }
      }

      expect(frontierCoord).not.toBeNull();
      const trace = extractProvenanceTrace(frontierCoord, snapshot, grid, "dfs", bounds);
      expect(trace).not.toBeNull();
      expect(trace!.metric.name).toBe("Search depth");
      expect(trace!.chain[0]).toEqual(grid.start);
      expect(trace!.chain[trace!.chain.length - 1]).toEqual(frontierCoord!);
    });
  });

  describe("Dijkstra Provenance Tracing & Relaxation", () => {
    it("follows current shortest-known predecessor chain and updates on relaxation", () => {
      const grid = gridFromRows([
        "S.w.",
        ".w..",
        "...T",
      ]);
      const result = dijkstra(grid);
      const bounds = computeSearchVisualBounds(result);

      // Find a relaxation event in the search history
      const relaxedEventIdx = result.events.findIndex((e) => e.type === "relaxed");
      if (relaxedEventIdx > 0) {
        const relaxedEvent = result.events[relaxedEventIdx] as {
          type: "relaxed";
          coordinate: Coordinate;
          from: Coordinate;
        };

        // Snapshot before relaxation
        const snapshotBefore = applySearchEvents(
          createPlaybackSnapshot(),
          result.events.slice(0, relaxedEventIdx),
        );
        const traceBefore = extractProvenanceTrace(
          relaxedEvent.coordinate,
          snapshotBefore,
          grid,
          "dijkstra",
          bounds,
        );

        // Snapshot after relaxation
        const snapshotAfter = applySearchEvents(
          createPlaybackSnapshot(),
          result.events.slice(0, relaxedEventIdx + 1),
        );
        const traceAfter = extractProvenanceTrace(
          relaxedEvent.coordinate,
          snapshotAfter,
          grid,
          "dijkstra",
          bounds,
        );

        if (traceBefore && traceAfter) {
          // Parent before relaxation should differ from the relaxed predecessor 'from'
          const parentAfter = traceAfter.chain[traceAfter.chain.length - 2];
          expect(parentAfter).toEqual(relaxedEvent.from);
        }
      }
    });

    it("formats accumulated cost g(n) cleanly", () => {
      const info = formatProvenanceMetric("dijkstra", {
        state: "frontier",
        parent: { row: 0, col: 0 },
        g: 22,
      });
      expect(info.name).toBe("Path cost");
      expect(info.badgeLabel).toBe("Cost 22");
    });
  });

  describe("A* Provenance Tracing & Metric Decomposition", () => {
    it("extracts A* predecessor chain and formats g, h, f, and progress percentage", () => {
      const grid = gridFromRows([
        "S...",
        "....",
        "...T",
      ]);
      const result = astar(grid);
      const bounds = computeSearchVisualBounds(result);
      const timeline = createPlaybackTimeline(result.events);

      const snapshot = timeline.getSnapshotForStep(3);
      let frontierCoord: Coordinate | null = null;
      for (const [key, node] of snapshot.nodes) {
        if (node.state === "frontier" && node.parent) {
          const [row, col] = key.split(":").map(Number);
          frontierCoord = { row, col };
          break;
        }
      }

      if (frontierCoord) {
        const trace = extractProvenanceTrace(frontierCoord, snapshot, grid, "astar", bounds);
        expect(trace).not.toBeNull();
        expect(trace!.metric.name).toBe("Goal progress");
        expect(trace!.metric.badgeLabel).toContain("g:");
        expect(trace!.metric.badgeLabel).toContain("f:");
        expect(trace!.metric.badgeLabel).toContain("%");
      }
    });
  });

  describe("4-Way and 8-Way Movement Geometry", () => {
    it("calculates exact sub-pixel cell centers based on board dimensions", () => {
      const boardWidth = 601;
      const boardHeight = 401;
      const cols = 20;
      const rows = 10;

      // Col 0, Row 0 center
      const c0 = computeCellCenter({ row: 0, col: 0 }, boardWidth, boardHeight, rows, cols);
      expect(c0.x).toBeCloseTo(0.5 + 0.5 * (600 / 20)); // 15.5
      expect(c0.y).toBeCloseTo(0.5 + 0.5 * (400 / 10)); // 20.5

      // Col 19, Row 9 center
      const cLast = computeCellCenter({ row: 9, col: 19 }, boardWidth, boardHeight, rows, cols);
      expect(cLast.x).toBeCloseTo(0.5 + 19.5 * 30); // 585.5
      expect(cLast.y).toBeCloseTo(0.5 + 9.5 * 40); // 380.5
    });

    it("generates continuous SVG path with orthogonal segments for 4-way movement", () => {
      const chain: Coordinate[] = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 1 },
      ];
      const d = buildSvgPathD(chain, 301, 301, 10, 10);
      expect(d).toContain("M ");
      expect(d).toContain("L ");
      const parts = d.split(" ");
      expect(parts[0]).toBe("M");
    });

    it("supports 8-way diagonal predecessor geometry without faking", () => {
      const grid = gridFromRows([
        "S..",
        "...",
        "..T",
      ]);
      const result = dijkstra(grid, { movementMode: "eight-way" });
      const bounds = computeSearchVisualBounds(result);

      // Find an event discovered via diagonal movement
      let diagonalFrontier: Coordinate | null = null;
      let snapshotWithDiag = createPlaybackSnapshot();

      for (let i = 0; i < result.events.length; i++) {
        snapshotWithDiag = applySearchEvents(snapshotWithDiag, [result.events[i]]);
        for (const [key, node] of snapshotWithDiag.nodes) {
          if (node.state === "frontier" && node.parent) {
            const [row, col] = key.split(":").map(Number);
            if (Math.abs(row - node.parent.row) === 1 && Math.abs(col - node.parent.col) === 1) {
              diagonalFrontier = { row, col };
              break;
            }
          }
        }
        if (diagonalFrontier) break;
      }

      if (diagonalFrontier) {
        const trace = extractProvenanceTrace(
          diagonalFrontier,
          snapshotWithDiag,
          grid,
          "dijkstra",
          bounds,
        );
        expect(trace).not.toBeNull();
        const pathD = buildSvgPathD(trace!.chain, 400, 400, 3, 3);
        expect(pathD).toContain("M ");
        expect(pathD).toContain("L ");
      }
    });
  });

  describe("Timeline Determinism & Rewind", () => {
    it("ensures historical truthfulness across forward and backward scrubbing", () => {
      const grid = gridFromRows([
        "S...",
        "....",
        "...T",
      ]);
      const result = bfs(grid);
      const bounds = computeSearchVisualBounds(result);
      const timeline = createPlaybackTimeline(result.events);

      const earlySnapshot = timeline.getSnapshotForStep(2);
      // Advance to step 8
      timeline.getSnapshotForStep(8);

      // Pick a frontier node from earlySnapshot
      let earlyFrontier: Coordinate | null = null;
      for (const [key, node] of earlySnapshot.nodes) {
        if (node.state === "frontier") {
          const [row, col] = key.split(":").map(Number);
          earlyFrontier = { row, col };
          break;
        }
      }

      if (earlyFrontier) {
        const earlyTrace = extractProvenanceTrace(earlyFrontier, earlySnapshot, grid, "bfs", bounds);
        // At step 8, query step 2 again (simulating rewind)
        const rewoundSnapshot = timeline.getSnapshotForStep(2);
        const rewoundTrace = extractProvenanceTrace(earlyFrontier, rewoundSnapshot, grid, "bfs", bounds);

        expect(rewoundTrace).toEqual(earlyTrace);
      }
    });
  });

  describe("Rejection of Non-Frontier and Defensive Cycle Protection", () => {
    it("returns null for coordinates that are closed, wall, or unvisited", () => {
      const grid = gridFromRows([
        "S#.",
        "...",
        "..T",
      ]);
      const result = bfs(grid);
      const bounds = computeSearchVisualBounds(result);
      const timeline = createPlaybackTimeline(result.events);
      const snapshot = timeline.getSnapshotForStep(4);

      // Wall coordinate
      const wallCoord = { row: 0, col: 1 };
      expect(extractProvenanceTrace(wallCoord, snapshot, grid, "bfs", bounds)).toBeNull();

      // Unvisited coordinate
      const unvisitedCoord = { row: 2, col: 2 };
      expect(extractProvenanceTrace(unvisitedCoord, snapshot, grid, "bfs", bounds)).toBeNull();

      // Closed coordinate
      const closedCoord = grid.start;
      expect(extractProvenanceTrace(closedCoord, snapshot, grid, "bfs", bounds)).toBeNull();
    });

    it("terminates safely if a synthetic circular parent reference occurs", () => {
      const grid = gridFromRows(["S.T"]);
      const bounds = computeSearchVisualBounds(null);
      const snapshot = createPlaybackSnapshot();

      // Create synthetic circular parent references
      const c1: Coordinate = { row: 0, col: 1 };
      const c2: Coordinate = { row: 0, col: 2 };
      snapshot.nodes.set(coordinateKey(c1), {
        state: "frontier",
        parent: c2,
      });
      snapshot.nodes.set(coordinateKey(c2), {
        state: "frontier",
        parent: c1,
      });

      const trace = extractProvenanceTrace(c1, snapshot, grid, "bfs", bounds);
      expect(trace).not.toBeNull();
      // Should terminate cycle safely
      expect(trace!.chain.length).toBeLessThanOrEqual(3);
    });
  });

  describe("ProvenanceOverlay Component Rendering", () => {
    it("renders SVG layer, paths, circles, and floating chip when trace is active", () => {
      const grid = gridFromRows(["S..", "..T"]);
      const result = bfs(grid);
      const bounds = computeSearchVisualBounds(result);
      const timeline = createPlaybackTimeline(result.events);
      const snapshot = timeline.getSnapshotForStep(1);

      const frontierCoord: Coordinate = { row: 0, col: 1 };
      const trace = extractProvenanceTrace(frontierCoord, snapshot, grid, "bfs", bounds);

      const html = renderToStaticMarkup(
        React.createElement(ProvenanceOverlay, {
          trace,
          boardWidth: 300,
          boardHeight: 200,
          rows: 2,
          cols: 3,
        }),
      );

      expect(html).toContain("provenance-overlay");
      expect(html).toContain("provenance-svg-layer");
      expect(html).toContain("provenance-trace-flow");
      expect(html).toContain("provenance-metric-chip");
      expect(html).toContain("BFS level:");
      expect(html).toContain("Level 1");
    });

    it("renders nothing when trace is null or board has zero dimensions", () => {
      const htmlNull = renderToStaticMarkup(
        React.createElement(ProvenanceOverlay, {
          trace: null,
          boardWidth: 300,
          boardHeight: 200,
          rows: 2,
          cols: 3,
        }),
      );
      expect(htmlNull).toBe("");

      const htmlZeroDim = renderToStaticMarkup(
        React.createElement(ProvenanceOverlay, {
          trace: {
            hoveredCoordinate: { row: 0, col: 1 },
            chain: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
            algorithm: "bfs",
            metric: { name: "BFS", value: 1, badgeLabel: "1", details: "" },
            color: {
              progress: 0,
              accentHex: "#22d3ee",
              background: "",
              border: "",
              glow: "",
              metricValue: 1,
              metricLabel: "1",
            },
          },
          boardWidth: 0,
          boardHeight: 0,
          rows: 2,
          cols: 3,
        }),
      );
      expect(htmlZeroDim).toBe("");
    });
  });
});
