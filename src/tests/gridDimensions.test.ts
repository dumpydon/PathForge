import { describe, expect, it } from "vitest";
import { runAlgorithm } from "../algorithms";
import { bfs } from "../algorithms/bfs";
import { createGrid, isInBounds, setTerrain } from "../core/grid";
import {
  GRID_SIZE_PRESETS,
  MAX_GRID_DIMENSION,
  MIN_GRID_DIMENSION,
  gridDimensionError,
  isBenchmarkGrid,
} from "../core/gridDimensions";
import { validatePath } from "../core/path";
import { createBoardSession, resizeBoard } from "../state/boardSession";

describe("grid dimensions", () => {
  it("accepts the minimum supported dimensions", () => {
    const grid = createGrid(MIN_GRID_DIMENSION, MIN_GRID_DIMENSION);

    expect(grid.terrain).toHaveLength(25);
    expect(grid.start).toEqual({ row: 2, col: 1 });
    expect(grid.target).toEqual({ row: 2, col: 3 });
  });

  it("accepts the maximum supported dimensions", () => {
    const grid = createGrid(MAX_GRID_DIMENSION, MAX_GRID_DIMENSION);

    expect(grid.terrain).toHaveLength(90_000);
    expect(isInBounds(grid, grid.start)).toBe(true);
    expect(isInBounds(grid, grid.target)).toBe(true);
  });

  it.each([
    [0, 10],
    [-1, 10],
    [4, 10],
    [10, 4],
    [301, 10],
    [10, 301],
    [10.5, 10],
    [Number.NaN, 10],
    [Number.POSITIVE_INFINITY, 10],
  ])("rejects invalid dimensions (%s, %s)", (rows, cols) => {
    expect(gridDimensionError(rows, cols)).not.toBeNull();
    expect(() => createGrid(rows, cols)).toThrow();
  });

  it("returns the exact warning for out-of-range dimensions or >10000 vertices", () => {
    const expectedError = "(Use 5–300 for row and col and <=10000 row*col )";
    expect(gridDimensionError(330, 39)).toBe(expectedError);
    expect(gridDimensionError(50, 225)).toBe(expectedError);
    expect(gridDimensionError(80, 200)).toBe(expectedError);
    expect(gridDimensionError(100, 150)).toBe(expectedError);
    expect(gridDimensionError(200, 100)).toBe(expectedError);
    expect(gridDimensionError(4, 25)).toBe(expectedError);
    expect(gridDimensionError(25, 4)).toBe(expectedError);
    expect(gridDimensionError(301, 25)).toBe(expectedError);
    expect(gridDimensionError(25, 301)).toBe(expectedError);
    expect(gridDimensionError(100, 100)).toBeNull();
    expect(gridDimensionError(50, 200)).toBeNull();
    expect(gridDimensionError(21, 39)).toBeNull();
  });

  it("provides deterministic size presets", () => {
    expect(GRID_SIZE_PRESETS.map(({ label, rows, cols }) => [label, rows, cols])).toEqual([
      ["Small", 15, 25],
      ["Default", 21, 39],
      ["Medium", 30, 50],
      ["Expanded", 40, 70],
      ["Large", 50, 80],
      ["Huge", 70, 100],
      ["Stress", 100, 100],
    ]);
  });

  it("uses benchmark mode only above 10,000 vertices", () => {
    expect(isBenchmarkGrid({ rows: 100, cols: 100 })).toBe(false);
    expect(isBenchmarkGrid({ rows: 100, cols: 101 })).toBe(true);
    expect(isBenchmarkGrid({ rows: 100, cols: 150 })).toBe(true);
  });
});

describe("board resizing", () => {
  it("creates a clean board and clears search and comparison state", () => {
    const originalGrid = setTerrain(createGrid(), { row: 0, col: 0 }, "wall");
    const previousResult = bfs(originalGrid);
    const session = {
      ...createBoardSession(originalGrid, "Edited"),
      activeResult: previousResult,
      comparisonResults: { bfs: previousResult },
      selectedCoordinate: { row: 0, col: 0 },
    };

    const resized = resizeBoard(session, 15, 25);

    expect(resized.grid.rows).toBe(15);
    expect(resized.grid.cols).toBe(25);
    expect(resized.grid.terrain.every((terrain) => terrain === "normal")).toBe(true);
    expect(resized.activeResult).toBeNull();
    expect(resized.comparisonResults).toEqual({});
    expect(resized.selectedCoordinate).toEqual(resized.grid.start);
    expect(isInBounds(resized.grid, resized.grid.start)).toBe(true);
    expect(isInBounds(resized.grid, resized.grid.target)).toBe(true);
  });

  it("runs every algorithm correctly after resizing", () => {
    const session = resizeBoard(createBoardSession(createGrid(), "Open Field"), 50, 80);

    for (const algorithm of ["bfs", "dfs", "dijkstra", "astar"] as const) {
      const result = runAlgorithm(algorithm, session.grid, { recordEvents: false });
      expect(result.found).toBe(true);
      expect(validatePath(session.grid, result.path)).toBe(true);
    }
  });

  it("does not record playback objects during a large-grid benchmark run", () => {
    const grid = createGrid(100, 150);

    for (const algorithm of ["bfs", "dfs", "dijkstra", "astar"] as const) {
      const result = runAlgorithm(algorithm, grid, {
        heuristic: "manhattan",
        recordEvents: false,
      });

      expect(result.found).toBe(true);
      expect(result.events).toEqual([]);
      expect(result.eventRecordingEnabled).toBe(false);
      expect(result.discoveredCount).toBeGreaterThan(0);
      expect(result.expandedCount).toBeGreaterThan(0);
      expect(result.maxFrontierSize).toBeGreaterThan(0);
    }
  });
});

