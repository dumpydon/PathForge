import { describe, expect, it } from "vitest";
import { astar } from "../algorithms/astar";
import { bfs } from "../algorithms/bfs";
import { dfs } from "../algorithms/dfs";
import { dijkstra } from "../algorithms/dijkstra";
import { coordinateKey } from "../core/types";
import { applySearchEvents, createPlaybackSnapshot } from "../playback/reducer";
import { computeStepBoundaries, createPlaybackTimeline } from "../playback/timeline";
import { gridFromRows } from "./fixtures";

describe("playback timeline and step boundaries", () => {
  it("handles empty events safely", () => {
    const boundaries = computeStepBoundaries([]);
    expect(boundaries).toEqual([0]);

    const timeline = createPlaybackTimeline([]);
    expect(timeline.totalSteps).toBe(0);
    expect(timeline.getStepIndexForCursor(0)).toBe(0);
    expect(timeline.getSnapshotForStep(0).nodes.size).toBe(0);
  });

  it("computes accurate step boundaries for BFS run", () => {
    const grid = gridFromRows([
      "S...",
      ".##.",
      "...T",
    ]);
    const result = bfs(grid);
    const timeline = createPlaybackTimeline(result.events);

    expect(timeline.totalSteps).toBeGreaterThan(0);
    expect(timeline.stepBoundaries[0]).toBe(0);
    expect(timeline.stepBoundaries[timeline.totalSteps]).toBe(result.events.length);

    // Step boundaries must be strictly monotonically increasing
    for (let i = 1; i < timeline.stepBoundaries.length; i += 1) {
      expect(timeline.stepBoundaries[i]).toBeGreaterThan(timeline.stepBoundaries[i - 1]);
    }
  });

  it("allows stepping forward through execution states", () => {
    const grid = gridFromRows(["S..T"]);
    const result = bfs(grid);
    const timeline = createPlaybackTimeline(result.events);

    const step0Snapshot = timeline.getSnapshotForStep(0);
    expect(step0Snapshot.nodes.size).toBe(0);

    const step1Snapshot = timeline.getSnapshotForStep(1);
    expect(step1Snapshot.nodes.size).toBeGreaterThan(0);

    // Each forward step increases or preserves visited nodes
    let previousVisited = 0;
    for (let step = 0; step <= timeline.totalSteps; step += 1) {
      const snap = timeline.getSnapshotForStep(step);
      let closedCount = 0;
      for (const node of snap.nodes.values()) {
        if (node.state === "closed" || node.state === "path") closedCount += 1;
      }
      expect(closedCount).toBeGreaterThanOrEqual(previousVisited);
      previousVisited = closedCount;
    }
  });

  it("rewinds after completion and reverts the final path", () => {
    const grid = gridFromRows(["S..T"]);
    const result = bfs(grid);
    const timeline = createPlaybackTimeline(result.events);

    // Final completed step has the path visible
    const finalSnapshot = timeline.getSnapshotForStep(timeline.totalSteps);
    for (const coord of result.path) {
      expect(finalSnapshot.nodes.get(coordinateKey(coord))?.state).toBe("path");
    }

    // Step immediately before completion has the path reverted (not drawn yet)
    const beforeFinalSnapshot = timeline.getSnapshotForStep(timeline.totalSteps - 1);
    let pathCount = 0;
    for (const node of beforeFinalSnapshot.nodes.values()) {
      if (node.state === "path") pathCount += 1;
    }
    expect(pathCount).toBe(0);

    // Stepping forward again restores the path
    const restoredFinal = timeline.getSnapshotForStep(timeline.totalSteps);
    for (const coord of result.path) {
      expect(restoredFinal.nodes.get(coordinateKey(coord))?.state).toBe("path");
    }
  });

  it("clamps previous below step 0 and next beyond totalSteps", () => {
    const grid = gridFromRows(["S.T"]);
    const result = bfs(grid);
    const timeline = createPlaybackTimeline(result.events);

    // Negative step clamps to 0
    const belowZero = timeline.getSnapshotForStep(-5);
    const atZero = timeline.getSnapshotForStep(0);
    expect(belowZero.nodes.size).toBe(atZero.nodes.size);

    // Excess step clamps to totalSteps
    const beyondMax = timeline.getSnapshotForStep(timeline.totalSteps + 10);
    const atMax = timeline.getSnapshotForStep(timeline.totalSteps);
    expect(beyondMax.nodes.size).toBe(atMax.nodes.size);
  });

  it("produces deterministic snapshots identical to replaying from scratch", () => {
    const grid = gridFromRows([
      "S.m.T",
      ".....",
    ]);
    const result = dijkstra(grid);
    const timeline = createPlaybackTimeline(result.events);

    // Test multiple random/arbitrary steps
    for (let step = 0; step <= timeline.totalSteps; step += 1) {
      const timelineSnapshot = timeline.getSnapshotForStep(step);
      const cursor = timeline.stepBoundaries[step];
      const scratchSnapshot = applySearchEvents(
        createPlaybackSnapshot(),
        result.events.slice(0, cursor),
      );

      expect(timelineSnapshot.nodes.size).toBe(scratchSnapshot.nodes.size);
      expect(timelineSnapshot.frontierSize).toBe(scratchSnapshot.frontierSize);
      expect(timelineSnapshot.currentKey).toBe(scratchSnapshot.currentKey);

      for (const [key, node] of timelineSnapshot.nodes.entries()) {
        const scratchNode = scratchSnapshot.nodes.get(key);
        expect(scratchNode).toBeDefined();
        expect(scratchNode?.state).toBe(node.state);
        expect(scratchNode?.g).toBe(node.g);
      }
    }
  });

  it("maps arbitrary cursor positions to appropriate step indices", () => {
    const grid = gridFromRows(["S...T"]);
    const result = astar(grid);
    const timeline = createPlaybackTimeline(result.events);

    expect(timeline.getStepIndexForCursor(0)).toBe(0);
    expect(timeline.getStepIndexForCursor(result.events.length)).toBe(timeline.totalSteps);

    // Each boundary matches its exact step index
    for (let step = 0; step <= timeline.totalSteps; step += 1) {
      const boundary = timeline.stepBoundaries[step];
      expect(timeline.getStepIndexForCursor(boundary)).toBe(step);
    }
  });

  it("handles algorithms without path found", () => {
    const grid = gridFromRows([
      "S#T",
      ".#.",
    ]);
    const result = dfs(grid);
    expect(result.found).toBe(false);

    const timeline = createPlaybackTimeline(result.events);
    expect(timeline.totalSteps).toBeGreaterThan(0);

    const finalSnap = timeline.getSnapshotForStep(timeline.totalSteps);
    for (const node of finalSnap.nodes.values()) {
      expect(node.state).not.toBe("path");
    }
  });

  it("supports start === target edge case", () => {
    const grid = {
      rows: 1,
      cols: 1,
      terrain: ["normal" as const],
      start: { row: 0, col: 0 },
      target: { row: 0, col: 0 },
    };
    // S is start and target
    const result = bfs(grid);
    const timeline = createPlaybackTimeline(result.events);

    expect(timeline.totalSteps).toBe(2);
    expect(timeline.getSnapshotForStep(0).nodes.size).toBe(0);
    expect(timeline.getSnapshotForStep(1).nodes.get(coordinateKey(grid.start))?.state).toBe("closed");
    expect(timeline.getSnapshotForStep(2).nodes.get(coordinateKey(grid.start))?.state).toBe("path");
  });
});
