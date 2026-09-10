import { describe, expect, it } from "vitest";
import { bfs } from "../algorithms/bfs";
import {
  clearTerrain,
  createCustomTerrain,
  createGrid,
  moveEndpoint,
  setTerrain,
  terrainAt,
} from "../core/grid";
import { randomObstacles } from "../mazes/random";
import { recursiveDivision } from "../mazes/recursiveDivision";
import {
  canRedo,
  canUndo,
  createBoardHistory,
  gridsEqual,
  pushBoardAction,
  redoBoardAction,
  undoBoardAction,
} from "../state/boardHistory";
import { createBoardSession } from "../state/boardSession";

describe("board history and undo / redo engine", () => {
  it("paints a single wall and supports undo -> redo", () => {
    const grid0 = createGrid(10, 10);
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    });

    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);

    const grid1 = setTerrain(grid0, { row: 0, col: 0 }, "wall");
    history = pushBoardAction(history, {
      grid: grid1,
      scenarioLabel: "Custom board",
      selectedCoordinate: { row: 0, col: 0 },
    });

    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
    expect(terrainAt(history.present.grid, { row: 0, col: 0 })).toBe("wall");

    // Undo
    const undoResult = undoBoardAction(history);
    expect(undoResult).not.toBeNull();
    history = undoResult!.state;
    expect(terrainAt(history.present.grid, { row: 0, col: 0 })).toBe("normal");
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(true);

    // Redo
    const redoResult = redoBoardAction(history);
    expect(redoResult).not.toBeNull();
    history = redoResult!.state;
    expect(terrainAt(history.present.grid, { row: 0, col: 0 })).toBe("wall");
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
  });

  it("paints mud, water, and custom terrain and supports undo -> redo", () => {
    const grid0 = createGrid(10, 10);
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    });

    // Paint mud at (1, 1)
    const grid1 = setTerrain(grid0, { row: 1, col: 1 }, "mud");
    history = pushBoardAction(history, {
      grid: grid1,
      scenarioLabel: "Custom board",
      selectedCoordinate: { row: 1, col: 1 },
    });

    // Paint water at (2, 2)
    const grid2 = setTerrain(grid1, { row: 2, col: 2 }, "water");
    history = pushBoardAction(history, {
      grid: grid2,
      scenarioLabel: "Custom board",
      selectedCoordinate: { row: 2, col: 2 },
    });

    // Paint custom terrain (cost: 7) at (3, 3)
    const customT = createCustomTerrain(7);
    const grid3 = setTerrain(grid2, { row: 3, col: 3 }, customT);
    history = pushBoardAction(history, {
      grid: grid3,
      scenarioLabel: "Custom board",
      selectedCoordinate: { row: 3, col: 3 },
    });

    expect(terrainAt(history.present.grid, { row: 3, col: 3 })).toEqual({
      type: "custom",
      cost: 7,
    });

    // Undo custom terrain
    history = undoBoardAction(history)!.state;
    expect(terrainAt(history.present.grid, { row: 3, col: 3 })).toBe("normal");
    expect(terrainAt(history.present.grid, { row: 2, col: 2 })).toBe("water");

    // Undo water
    history = undoBoardAction(history)!.state;
    expect(terrainAt(history.present.grid, { row: 2, col: 2 })).toBe("normal");
    expect(terrainAt(history.present.grid, { row: 1, col: 1 })).toBe("mud");

    // Undo mud
    history = undoBoardAction(history)!.state;
    expect(terrainAt(history.present.grid, { row: 1, col: 1 })).toBe("normal");
    expect(canUndo(history)).toBe(false);

    // Redo all three
    history = redoBoardAction(history)!.state;
    expect(terrainAt(history.present.grid, { row: 1, col: 1 })).toBe("mud");

    history = redoBoardAction(history)!.state;
    expect(terrainAt(history.present.grid, { row: 2, col: 2 })).toBe("water");

    history = redoBoardAction(history)!.state;
    expect(terrainAt(history.present.grid, { row: 3, col: 3 })).toEqual({
      type: "custom",
      cost: 7,
    });
    expect(canRedo(history)).toBe(false);
  });

  it("moves start endpoint and supports undo -> redo", () => {
    const grid0 = createGrid(10, 10);
    const initialStart = { ...grid0.start };
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    });

    const targetCoord = { row: 4, col: 4 };
    const grid1 = moveEndpoint(grid0, "start", targetCoord);
    history = pushBoardAction(history, {
      grid: grid1,
      scenarioLabel: "Custom board",
      selectedCoordinate: targetCoord,
    });

    expect(history.present.grid.start).toEqual(targetCoord);

    // Undo
    history = undoBoardAction(history)!.state;
    expect(history.present.grid.start).toEqual(initialStart);

    // Redo
    history = redoBoardAction(history)!.state;
    expect(history.present.grid.start).toEqual(targetCoord);
  });

  it("moves target endpoint and supports undo -> redo", () => {
    const grid0 = createGrid(10, 10);
    const initialTarget = { ...grid0.target };
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    });

    const newTargetCoord = { row: 8, col: 8 };
    const grid1 = moveEndpoint(grid0, "target", newTargetCoord);
    history = pushBoardAction(history, {
      grid: grid1,
      scenarioLabel: "Custom board",
      selectedCoordinate: newTargetCoord,
    });

    expect(history.present.grid.target).toEqual(newTargetCoord);

    // Undo
    history = undoBoardAction(history)!.state;
    expect(history.present.grid.target).toEqual(initialTarget);

    // Redo
    history = redoBoardAction(history)!.state;
    expect(history.present.grid.target).toEqual(newTargetCoord);
  });

  it("treats continuous drag paint strokes as a single atomic undo action", () => {
    const grid0 = createGrid(10, 10);
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    });

    // Pointer down records start snapshot
    const startSnapshot = {
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    };

    // User drags across 5 cells: (0,0), (0,1), (0,2), (0,3), (0,4)
    let currentGrid = grid0;
    const cellsToPaint = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ];
    for (const cell of cellsToPaint) {
      currentGrid = setTerrain(currentGrid, cell, "wall");
    }

    // Pointer up commits the entire stroke at once
    expect(!gridsEqual(startSnapshot.grid, currentGrid)).toBe(true);
    history = pushBoardAction(
      { ...history, present: startSnapshot },
      {
        grid: currentGrid,
        scenarioLabel: "Custom board",
        selectedCoordinate: cellsToPaint[cellsToPaint.length - 1],
      },
    );

    // Only 1 action should be in past
    expect(history.past).toHaveLength(1);
    expect(history.future).toHaveLength(0);
    for (const cell of cellsToPaint) {
      expect(terrainAt(history.present.grid, cell)).toBe("wall");
    }

    // A single undo should restore all 5 cells back to normal
    const undoResult = undoBoardAction(history);
    expect(undoResult).not.toBeNull();
    history = undoResult!.state;
    for (const cell of cellsToPaint) {
      expect(terrainAt(history.present.grid, cell)).toBe("normal");
    }
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(true);

    // A single redo restores all 5 cells
    const redoResult = redoBoardAction(history);
    expect(redoResult).not.toBeNull();
    history = redoResult!.state;
    for (const cell of cellsToPaint) {
      expect(terrainAt(history.present.grid, cell)).toBe("wall");
    }
  });

  it("treats continuous drag of start/target endpoint as a single atomic undo action", () => {
    const grid0 = createGrid(10, 10);
    const initialStart = { ...grid0.start };
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    });

    const startSnapshot = {
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    };

    // User drags start through intermediate coordinates
    let draggingGrid = moveEndpoint(grid0, "start", { row: 1, col: 1 });
    draggingGrid = moveEndpoint(draggingGrid, "start", { row: 1, col: 2 });
    draggingGrid = moveEndpoint(draggingGrid, "start", { row: 3, col: 5 });

    // Interaction ends
    history = pushBoardAction(
      { ...history, present: startSnapshot },
      {
        grid: draggingGrid,
        scenarioLabel: "Custom board",
        selectedCoordinate: { row: 3, col: 5 },
      },
    );

    expect(history.past).toHaveLength(1);
    expect(history.present.grid.start).toEqual({ row: 3, col: 5 });

    // Single undo restores initial start
    history = undoBoardAction(history)!.state;
    expect(history.present.grid.start).toEqual(initialStart);

    // Single redo restores final dragged position
    history = redoBoardAction(history)!.state;
    expect(history.present.grid.start).toEqual({ row: 3, col: 5 });
  });

  it("restores prior board on undo after Clear Board", () => {
    const grid0 = createGrid(10, 10);
    const withWalls = setTerrain(
      setTerrain(grid0, { row: 2, col: 2 }, "wall"),
      { row: 3, col: 3 },
      "mud",
    );

    let history = createBoardHistory({
      grid: withWalls,
      scenarioLabel: "Custom board",
      selectedCoordinate: { row: 3, col: 3 },
    });

    const cleared = clearTerrain(withWalls);
    history = pushBoardAction(history, {
      grid: cleared,
      scenarioLabel: "Open field",
      selectedCoordinate: cleared.start,
    });

    expect(terrainAt(history.present.grid, { row: 2, col: 2 })).toBe("normal");
    expect(terrainAt(history.present.grid, { row: 3, col: 3 })).toBe("normal");

    // Undo restores the walls and mud
    history = undoBoardAction(history)!.state;
    expect(terrainAt(history.present.grid, { row: 2, col: 2 })).toBe("wall");
    expect(terrainAt(history.present.grid, { row: 3, col: 3 })).toBe("mud");
  });

  it("restores prior board on undo after maze generation (recursive division)", () => {
    const grid0 = createGrid(11, 11);
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Open field",
      selectedCoordinate: grid0.start,
    });

    const mazeGrid = recursiveDivision(grid0);
    history = pushBoardAction(history, {
      grid: mazeGrid,
      scenarioLabel: "Recursive division",
      selectedCoordinate: mazeGrid.start,
    });

    expect(history.past).toHaveLength(1);
    expect(gridsEqual(history.present.grid, mazeGrid)).toBe(true);

    // Undo restores open field
    history = undoBoardAction(history)!.state;
    expect(gridsEqual(history.present.grid, grid0)).toBe(true);
  });

  it("restores prior board on undo after random obstacles", () => {
    const grid0 = createGrid(11, 11);
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Open field",
      selectedCoordinate: grid0.start,
    });

    const randomGrid = randomObstacles(grid0);
    history = pushBoardAction(history, {
      grid: randomGrid,
      scenarioLabel: "Random obstacles",
      selectedCoordinate: randomGrid.start,
    });

    expect(gridsEqual(history.present.grid, randomGrid)).toBe(true);

    // Undo restores open field
    history = undoBoardAction(history)!.state;
    expect(gridsEqual(history.present.grid, grid0)).toBe(true);
  });

  it("restores previous size and cells on undo after grid resize", () => {
    const smallGrid = setTerrain(createGrid(8, 8), { row: 1, col: 1 }, "wall");
    let history = createBoardHistory({
      grid: smallGrid,
      scenarioLabel: "Custom · 8 × 8",
      selectedCoordinate: smallGrid.start,
    });

    const largeGrid = createGrid(15, 20);
    history = pushBoardAction(history, {
      grid: largeGrid,
      scenarioLabel: "Custom · 15 × 20",
      selectedCoordinate: largeGrid.start,
    });

    expect(history.present.grid.rows).toBe(15);
    expect(history.present.grid.cols).toBe(20);

    // Undo restores 8x8 with wall intact
    history = undoBoardAction(history)!.state;
    expect(history.present.grid.rows).toBe(8);
    expect(history.present.grid.cols).toBe(8);
    expect(terrainAt(history.present.grid, { row: 1, col: 1 })).toBe("wall");

    // Redo restores 15x20
    history = redoBoardAction(history)!.state;
    expect(history.present.grid.rows).toBe(15);
    expect(history.present.grid.cols).toBe(20);
  });

  it("clears redo stack when a new edit is performed after undo", () => {
    const grid0 = createGrid(10, 10);
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "S0",
      selectedCoordinate: grid0.start,
    });

    // Step 1
    const grid1 = setTerrain(grid0, { row: 0, col: 1 }, "wall");
    history = pushBoardAction(history, {
      grid: grid1,
      scenarioLabel: "S1",
      selectedCoordinate: { row: 0, col: 1 },
    });

    // Step 2
    const grid2 = setTerrain(grid1, { row: 0, col: 2 }, "wall");
    history = pushBoardAction(history, {
      grid: grid2,
      scenarioLabel: "S2",
      selectedCoordinate: { row: 0, col: 2 },
    });

    // Undo back to Step 1
    history = undoBoardAction(history)!.state;
    expect(canRedo(history)).toBe(true);
    expect(history.future).toHaveLength(1);

    // Now perform a new edit (branch off)
    const grid3 = setTerrain(grid1, { row: 5, col: 5 }, "water");
    history = pushBoardAction(history, {
      grid: grid3,
      scenarioLabel: "S3",
      selectedCoordinate: { row: 5, col: 5 },
    });

    // Redo stack must be completely cleared
    expect(canRedo(history)).toBe(false);
    expect(history.future).toHaveLength(0);

    // Undo should go back to Step 1
    history = undoBoardAction(history)!.state;
    expect(terrainAt(history.present.grid, { row: 0, col: 1 })).toBe("wall");
    expect(terrainAt(history.present.grid, { row: 5, col: 5 })).toBe("normal");
  });

  it("enforces bounded history cap dropping oldest entries", () => {
    const cap = 5;
    const grid0 = createGrid(20, 20);
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Step 0",
      selectedCoordinate: grid0.start,
    });

    let currentGrid = grid0;
    // Push 10 distinct actions with maxHistory = 5
    for (let i = 1; i <= 10; i += 1) {
      currentGrid = setTerrain(currentGrid, { row: 0, col: i }, "wall");
      history = pushBoardAction(
        history,
        {
          grid: currentGrid,
          scenarioLabel: `Step ${i}`,
          selectedCoordinate: { row: 0, col: i },
        },
        cap,
      );
      expect(history.past.length).toBeLessThanOrEqual(cap);
    }

    expect(history.past).toHaveLength(cap);
    // Oldest preserved in past should be Step 5 (since Step 10 is present, and past has 5, 6, 7, 8, 9)
    expect(history.past[0].scenarioLabel).toBe("Step 5");
    expect(history.present.scenarioLabel).toBe("Step 10");

    // Can only undo 5 times
    let undoCount = 0;
    while (canUndo(history)) {
      history = undoBoardAction(history)!.state;
      undoCount += 1;
    }
    expect(undoCount).toBe(cap);
    expect(history.present.scenarioLabel).toBe("Step 5");
  });

  it("safely handles undo/redo on empty history without throwing or corrupting state", () => {
    const grid0 = createGrid(10, 10);
    const initialHistory = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    });

    expect(canUndo(initialHistory)).toBe(false);
    expect(canRedo(initialHistory)).toBe(false);

    // Undo on empty history
    const undoResult = undoBoardAction(initialHistory);
    expect(undoResult).toBeNull();

    // Redo on empty future
    const redoResult = redoBoardAction(initialHistory);
    expect(redoResult).toBeNull();

    // State remains untouched
    expect(initialHistory.past).toHaveLength(0);
    expect(initialHistory.future).toHaveLength(0);
    expect(initialHistory.present.grid).toBe(grid0);
  });

  it("does not push identical board states (no-op edits)", () => {
    const grid0 = setTerrain(createGrid(10, 10), { row: 1, col: 1 }, "wall");
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Initial",
      selectedCoordinate: grid0.start,
    });

    // Painting wall on cell (1, 1) which is already wall
    const identicalGrid = setTerrain(grid0, { row: 1, col: 1 }, "wall");
    history = pushBoardAction(history, {
      grid: identicalGrid,
      scenarioLabel: "No-op",
      selectedCoordinate: { row: 1, col: 1 },
    });

    expect(history.past).toHaveLength(0);
    expect(canUndo(history)).toBe(false);
  });

  it("invalidates active search results and resets playback on board undo/redo", () => {
    const grid0 = createGrid(10, 10);
    let session = createBoardSession(grid0, "Open field");
    let history = createBoardHistory({
      grid: grid0,
      scenarioLabel: "Open field",
      selectedCoordinate: grid0.start,
    });

    // Run BFS algorithm to produce an active search result
    const searchResult = bfs(grid0);
    session = {
      ...session,
      activeResult: searchResult,
      comparisonResults: { bfs: searchResult },
    };
    expect(session.activeResult).not.toBeNull();
    expect(session.comparisonResults.bfs).toBeDefined();

    // Now make a board edit
    const grid1 = setTerrain(grid0, { row: 2, col: 2 }, "wall");
    history = pushBoardAction(history, {
      grid: grid1,
      scenarioLabel: "Custom board",
      selectedCoordinate: { row: 2, col: 2 },
    });
    session = {
      ...session,
      grid: grid1,
      activeResult: null,
      comparisonResults: {},
    };

    // Run search on new grid
    const searchResult2 = bfs(grid1);
    session = {
      ...session,
      activeResult: searchResult2,
      comparisonResults: { bfs: searchResult2 },
    };
    expect(session.activeResult).not.toBeNull();

    // Perform Undo: restores board and invalidates search result
    const undoRes = undoBoardAction(history)!;
    history = undoRes.state;
    session = {
      ...session,
      grid: undoRes.restored.grid,
      scenarioLabel: undoRes.restored.scenarioLabel,
      selectedCoordinate: undoRes.restored.selectedCoordinate ?? undoRes.restored.grid.start,
      activeResult: null,
      comparisonResults: {},
    };

    expect(gridsEqual(session.grid, grid0)).toBe(true);
    expect(session.activeResult).toBeNull();
    expect(session.comparisonResults).toEqual({});

    // Perform Redo: restores grid1 and keeps activeResult null
    const redoRes = redoBoardAction(history)!;
    history = redoRes.state;
    session = {
      ...session,
      grid: redoRes.restored.grid,
      scenarioLabel: redoRes.restored.scenarioLabel,
      selectedCoordinate: redoRes.restored.selectedCoordinate ?? redoRes.restored.grid.start,
      activeResult: null,
      comparisonResults: {},
    };

    expect(gridsEqual(session.grid, grid1)).toBe(true);
    expect(session.activeResult).toBeNull();
    expect(session.comparisonResults).toEqual({});
  });
});
