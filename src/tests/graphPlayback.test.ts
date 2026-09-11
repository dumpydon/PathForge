import { describe, expect, it } from "vitest";
import {
  computeGraphStepBoundaries,
  createGraphPlaybackTimeline,
} from "../graph/playback/timeline";
import { graphDijkstra } from "../graph/algorithms/dijkstra";
import { createWeightedDetourPreset } from "../graph/presets/weightedDetour";
import type { GraphSearchEvent } from "../graph/algorithms/types";

describe("Graph Playback & Timeline", () => {
  it("computes monotonic step boundaries for empty and populated event lists", () => {
    expect(computeGraphStepBoundaries([])).toEqual([0]);

    const mockEvents: GraphSearchEvent[] = [
      { type: "discovered", nodeId: "a", frontierSize: 1 },
      { type: "expanded", nodeId: "a", frontierSize: 0 },
      { type: "closed", nodeId: "a", frontierSize: 0 },
      { type: "discovered", nodeId: "b", frontierSize: 1 },
      { type: "expanded", nodeId: "b", frontierSize: 0 },
      { type: "closed", nodeId: "b", frontierSize: 0 },
      { type: "pathNode", nodeId: "a", frontierSize: 0 },
      { type: "pathEdge", edgeId: "e1", frontierSize: 0 },
      { type: "pathNode", nodeId: "b", frontierSize: 0 },
    ];

    const boundaries = computeGraphStepBoundaries(mockEvents);
    // Boundary at 0, after first closed (index 3), after second closed (index 6), and after path (index 9)
    expect(boundaries).toEqual([0, 3, 6, 9]);
  });

  it("builds a timeline and handles forward, backward, seek, and rewind correctly", () => {
    const preset = createWeightedDetourPreset();
    const result = graphDijkstra(preset, { recordEvents: true });
    expect(result.events.length).toBeGreaterThan(0);

    const timeline = createGraphPlaybackTimeline(result.events);
    expect(timeline.totalSteps).toBeGreaterThan(0);

    // Initial snapshot at step 0
    const snap0 = timeline.getSnapshotForStep(0);
    expect(snap0.visitedCount).toBe(0);
    expect(snap0.frontierSize).toBe(0);
    expect(snap0.currentNodeId).toBeNull();

    // Step forward to step 1
    const snap1 = timeline.getSnapshotForStep(1);
    expect(snap1.visitedCount).toBe(1);
    expect(snap1.nodes.size).toBeGreaterThan(0);

    // Step forward to end
    const snapFinal = timeline.getSnapshotForStep(timeline.totalSteps);
    expect(snapFinal.visitedCount).toBeGreaterThanOrEqual(snap1.visitedCount);

    // Verify path nodes are highlighted in the final snapshot
    const pathNodeStates = result.pathNodeIds.map(
      (id) => snapFinal.nodes.get(id)?.state,
    );
    expect(pathNodeStates).toEqual(
      expect.arrayContaining(["path"]),
    );

    // Step backwards to step 0 reproduces the initial state
    const rewoundSnap = timeline.getSnapshotForStep(0);
    expect(rewoundSnap.visitedCount).toBe(0);
    expect(rewoundSnap.frontierSize).toBe(0);

    // Arbitrary seek reproduces consistent states
    const midStep = Math.floor(timeline.totalSteps / 2);
    const snapMid1 = timeline.getSnapshotForStep(midStep);
    const snapMid2 = timeline.getSnapshotForStep(midStep);
    expect(snapMid1).toBe(snapMid2); // Cached reference
    expect(snapMid1.visitedCount).toBeLessThanOrEqual(snapFinal.visitedCount);
  });

  it("maps cursor positions accurately to step indices and sub-step snapshots", () => {
    const preset = createWeightedDetourPreset();
    const result = graphDijkstra(preset, { recordEvents: true });
    const timeline = createGraphPlaybackTimeline(result.events);

    expect(timeline.getStepIndexForCursor(0)).toBe(0);
    expect(timeline.getStepIndexForCursor(result.events.length)).toBe(timeline.totalSteps);

    const snapCursor0 = timeline.getSnapshotForCursor(0);
    expect(snapCursor0.visitedCount).toBe(0);

    const snapCursorEnd = timeline.getSnapshotForCursor(result.events.length);
    const snapStepEnd = timeline.getSnapshotForStep(timeline.totalSteps);
    expect(snapCursorEnd.visitedCount).toBe(snapStepEnd.visitedCount);
  });
});
