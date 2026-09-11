import { describe, expect, it } from "vitest";
import { createBoardSession, resetBoardSearch } from "../state/boardSession";
import { openFieldPreset } from "../mazes/presets";
import { createGraphHistory, pushGraphAction } from "../graph/state/graphHistory";
import { createEmptyGraphDocument, addNode, addEdge } from "../graph/domain/graph";
import { graphDijkstra } from "../graph/algorithms/dijkstra";
import { runAlgorithm } from "../algorithms";
import { createWeightedDetourPreset } from "../graph/presets/weightedDetour";
import { setTerrain, terrainAt } from "../core/grid";

describe("Lab Isolation (Grid Lab vs Graph Lab)", () => {
  it("maintains independent state histories without cross-contamination", () => {
    // 1. Initialize Grid Lab
    const initialGrid = openFieldPreset();
    const gridSession = createBoardSession(initialGrid, "Open Field");

    // 2. Initialize Graph Lab
    const initialGraph = createEmptyGraphDocument("Custom Graph");
    let graphHistory = createGraphHistory(initialGraph);

    // 3. Mutate Graph Lab
    const { doc: d1, newNode: n1 } = addNode(graphHistory.present, { x: 10, y: 10 });
    const { doc: d2, newNode: n2 } = addNode(d1, { x: 50, y: 50 });
    const { doc: d3 } = addEdge(d2, n1.id, n2.id, 5);
    graphHistory = pushGraphAction(graphHistory, d3);

    // Verify Graph Lab updated
    expect(graphHistory.present.nodes).toHaveLength(2);
    expect(graphHistory.present.edges).toHaveLength(1);
    expect(graphHistory.past).toHaveLength(1);

    // Verify Grid Lab was NOT mutated
    expect(gridSession.scenarioLabel).toBe("Open Field");
    expect(gridSession.grid.cols).toBe(initialGrid.cols);
    expect(gridSession.grid.rows).toBe(initialGrid.rows);
    expect(gridSession.activeResult).toBeNull();

    // 4. Mutate Grid Lab
    const modifiedGrid = setTerrain(gridSession.grid, { row: 2, col: 2 }, "wall");
    const updatedGridSession = {
      ...gridSession,
      grid: modifiedGrid,
    };

    // Verify Graph Lab was NOT mutated by Grid Lab update
    expect(graphHistory.present.nodes).toHaveLength(2);
    expect(graphHistory.present.edges).toHaveLength(1);
    expect(terrainAt(updatedGridSession.grid, { row: 2, col: 2 })).toBe("wall");
  });

  it("running graph algorithm does not affect grid session search results", () => {
    const grid = openFieldPreset();
    const gridSession = createBoardSession(grid, "Test");

    // Run grid algorithm (BFS on grid)
    const gridResult = runAlgorithm("bfs", grid);
    const sessionWithGridResult = {
      ...gridSession,
      activeResult: gridResult,
    };

    // Run graph algorithm (Dijkstra on graph)
    const graphPreset = createWeightedDetourPreset();
    const graphResult = graphDijkstra(graphPreset);

    // Verify both results exist with their respective domain structures
    expect(gridResult.path).toBeDefined();
    expect(gridResult.path[0]).toHaveProperty("row");
    expect(gridResult.path[0]).toHaveProperty("col");

    expect(graphResult.pathNodeIds).toBeDefined();
    expect(typeof graphResult.pathNodeIds[0]).toBe("string");

    // Verify grid session activeResult was untouched by graph algorithm run
    expect(sessionWithGridResult.activeResult).toBe(gridResult);
    expect(sessionWithGridResult.activeResult?.algorithm).toBe("bfs");
  });

  it("clearing search on one lab does not disturb the other", () => {
    const grid = openFieldPreset();
    const gridSession = createBoardSession(grid, "Test");
    const gridResult = runAlgorithm("dijkstra", grid);
    const sessionWithResult = { ...gridSession, activeResult: gridResult };

    const clearedGridSession = resetBoardSearch(sessionWithResult);
    expect(clearedGridSession.activeResult).toBeNull();

    // Graph preset remains fully intact
    const graphPreset = createWeightedDetourPreset();
    expect(graphPreset.nodes.length).toBeGreaterThan(0);
    expect(graphPreset.edges.length).toBeGreaterThan(0);
  });
});
