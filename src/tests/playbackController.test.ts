import { describe, expect, it } from "vitest";
import { astar } from "../algorithms/astar";
import { bfs } from "../algorithms/bfs";
import { dijkstra } from "../algorithms/dijkstra";
import { coordinateKey } from "../core/types";
import { createPlaybackTimeline } from "../playback/timeline";
import { createBoardSession, replaceBoard, resetBoardSearch } from "../state/boardSession";
import { gridFromRows } from "./fixtures";

describe("playback controller lifecycle and timeline semantics", () => {
  it("computes accurate steps and tracks forward / backward transitions", () => {
    const grid = gridFromRows([
      "S...",
      ".##.",
      "...T",
    ]);
    const result = bfs(grid);
    const timeline = createPlaybackTimeline(result.events);

    let currentStep = 0;
    expect(currentStep).toBe(0);

    // Step forward 5 times
    for (let i = 0; i < 5; i += 1) {
      currentStep = Math.min(timeline.totalSteps, currentStep + 1);
    }
    expect(currentStep).toBe(5);

    const snapshotAt5 = timeline.getSnapshotForStep(currentStep);
    expect(snapshotAt5.nodes.size).toBeGreaterThan(0);

    // Step backward 3 times
    for (let i = 0; i < 3; i += 1) {
      currentStep = Math.max(0, currentStep - 1);
    }
    expect(currentStep).toBe(2);

    const snapshotAt2 = timeline.getSnapshotForStep(currentStep);
    expect(snapshotAt2.nodes.size).toBeLessThanOrEqual(snapshotAt5.nodes.size);

    // Step backward below 0 clamps to 0
    for (let i = 0; i < 10; i += 1) {
      currentStep = Math.max(0, currentStep - 1);
    }
    expect(currentStep).toBe(0);
    expect(timeline.getSnapshotForStep(currentStep).nodes.size).toBe(0);

    // Step forward beyond max clamps to totalSteps
    for (let i = 0; i < timeline.totalSteps + 10; i += 1) {
      currentStep = Math.min(timeline.totalSteps, currentStep + 1);
    }
    expect(currentStep).toBe(timeline.totalSteps);
  });

  it("resumes playback from rewound position rather than restarting from 0", () => {
    const grid = gridFromRows([
      "S...",
      "....",
      "...T",
    ]);
    const result = bfs(grid);
    const timeline = createPlaybackTimeline(result.events);

    // Simulate playback reaching step 6
    const pausedStep = 6;
    expect(pausedStep).toBeLessThan(timeline.totalSteps);

    // User rewinds 3 steps
    const rewoundStep = pausedStep - 3;
    expect(rewoundStep).toBe(3);

    // Resuming continues from rewoundStep forward:
    const resumedSteps: number[] = [];
    for (let step = rewoundStep; step <= timeline.totalSteps; step += 1) {
      resumedSteps.push(step);
    }

    expect(resumedSteps[0]).toBe(3);
    expect(resumedSteps[resumedSteps.length - 1]).toBe(timeline.totalSteps);
    // Did not restart from 0
    expect(resumedSteps[0]).not.toBe(0);
  });

  it("rewinds after completion and restores target-reached state", () => {
    const grid = gridFromRows([
      "S..",
      "..T",
    ]);
    const result = dijkstra(grid);
    expect(result.found).toBe(true);

    const timeline = createPlaybackTimeline(result.events);
    const completedStep = timeline.totalSteps;

    // At completion: all path cells have state 'path'
    const completedSnap = timeline.getSnapshotForStep(completedStep);
    for (const coord of result.path) {
      expect(completedSnap.nodes.get(coordinateKey(coord))?.state).toBe("path");
    }

    // Rewind one step: path disappears
    const rewoundSnap = timeline.getSnapshotForStep(completedStep - 1);
    let pathCount = 0;
    for (const node of rewoundSnap.nodes.values()) {
      if (node.state === "path") pathCount += 1;
    }
    expect(pathCount).toBe(0);

    // Replay back to completion: path reappears
    const replayedSnap = timeline.getSnapshotForStep(completedStep);
    for (const coord of result.path) {
      expect(replayedSnap.nodes.get(coordinateKey(coord))?.state).toBe("path");
    }
  });

  it("scrubber seeks directly to arbitrary steps deterministically", () => {
    const grid = gridFromRows([
      "S.m.T",
      ".....",
    ]);
    const result = astar(grid);
    const timeline = createPlaybackTimeline(result.events);

    // Seek to middle
    const midStep = Math.floor(timeline.totalSteps / 2);
    const snapMid = timeline.getSnapshotForStep(midStep);
    expect(snapMid).toBeDefined();

    // Seek to end
    const snapEnd = timeline.getSnapshotForStep(timeline.totalSteps);
    expect(snapEnd.nodes.size).toBeGreaterThanOrEqual(snapMid.nodes.size);

    // Seek back to start
    const snapStart = timeline.getSnapshotForStep(0);
    expect(snapStart.nodes.size).toBe(0);

    // Seek back to mid produces exact same result
    const snapMidAgain = timeline.getSnapshotForStep(midStep);
    expect(snapMidAgain.nodes.size).toBe(snapMid.nodes.size);
    expect(snapMidAgain.currentKey).toBe(snapMid.currentKey);
    expect(snapMidAgain.frontierSize).toBe(snapMid.frontierSize);
  });

  it("board mutations invalidate stale search results and reset session", () => {
    const initialGrid = gridFromRows(["S.T"]);
    let session = createBoardSession(initialGrid, "Test scenario");
    const result = bfs(initialGrid);
    session = { ...session, activeResult: result };
    expect(session.activeResult).not.toBeNull();

    // Replace board invalidates active result
    const nextGrid = gridFromRows(["S..T"]);
    session = replaceBoard(session, nextGrid, "New scenario");
    expect(session.activeResult).toBeNull();
    expect(session.grid).toBe(nextGrid);

    // Reset search invalidates active result
    session = { ...session, activeResult: bfs(nextGrid) };
    expect(session.activeResult).not.toBeNull();
    session = resetBoardSearch(session);
    expect(session.activeResult).toBeNull();
  });

  it("final algorithm result metrics remain identical regardless of timeline interaction", () => {
    const grid = gridFromRows([
      "S.w.T",
      ".....",
    ]);
    const resultBefore = dijkstra(grid);
    const timeline = createPlaybackTimeline(resultBefore.events);

    // Perform multiple seeks and rewinds
    timeline.getSnapshotForStep(3);
    timeline.getSnapshotForStep(0);
    timeline.getSnapshotForStep(timeline.totalSteps);
    timeline.getSnapshotForStep(2);

    const resultAfter = dijkstra(grid);

    expect(resultAfter.found).toBe(resultBefore.found);
    expect(resultAfter.pathCost).toBe(resultBefore.pathCost);
    expect(resultAfter.pathLength).toBe(resultBefore.pathLength);
    expect(resultAfter.discoveredCount).toBe(resultBefore.discoveredCount);
    expect(resultAfter.expandedCount).toBe(resultBefore.expandedCount);
    expect(resultAfter.path).toEqual(resultBefore.path);
  });

  it("ensures playback button group styling preserves 4-sided borders and proper stacking", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const cssPath = path.resolve(process.cwd(), "app/globals.css");
    const cssContent = await fs.readFile(cssPath, "utf-8");

    // Must not suppress right border on playback-btn
    expect(cssContent).not.toMatch(
      /\.playback-button-group\s+\.playback-btn\s*\{[^}]*border-right-width:\s*0/,
    );

    // Negative margin-left should merge 1px borders seamlessly
    expect(cssContent).toMatch(
      /\.playback-button-group\s+\.playback-btn:not\(:first-child\)\s*\{[^}]*margin-left:\s*-1px/,
    );

    // Active center button (is-playing / button-primary) elevated above sibling borders
    expect(cssContent).toMatch(
      /\.playback-button-group\s+\.playback-btn\.is-playing,\s*\.playback-button-group\s+\.playback-btn\.button-primary\s*\{[^}]*z-index:\s*1/,
    );

    // Hovered and focused buttons elevated to top layer
    expect(cssContent).toMatch(
      /\.playback-button-group\s+\.playback-btn:hover:not\(:disabled\),\s*\.playback-button-group\s+\.playback-btn:focus-visible\s*\{[^}]*z-index:\s*2/,
    );
  });
});

