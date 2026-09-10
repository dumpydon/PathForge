import { describe, expect, it } from "vitest";
import { bfs } from "../algorithms/bfs";
import { coordinateKey } from "../core/types";
import {
  applySearchEvents,
  createPlaybackSnapshot,
  nextExpansionBoundary,
  previousExpansionBoundary,
} from "../playback/reducer";
import { gridFromRows } from "./fixtures";

describe("playback reducer", () => {
  it("reconstructs the final visible search state from events", () => {
    const result = bfs(gridFromRows(["S..T"]));
    const snapshot = applySearchEvents(createPlaybackSnapshot(), result.events);

    for (const coordinate of result.path) {
      expect(snapshot.nodes.get(coordinateKey(coordinate))?.state).toBe("path");
    }
    expect(snapshot.frontierSize).toBe(0);
  });

  it("steps through a complete expansion rather than one arbitrary event", () => {
    const result = bfs(gridFromRows(["S.T"]));
    const boundary = nextExpansionBoundary(result.events, 0);
    const stepEvents = result.events.slice(0, boundary);

    expect(stepEvents.some((event) => event.type === "expanded")).toBe(true);
    expect(stepEvents[stepEvents.length - 1].type).toBe("closed");
    expect(boundary).toBeLessThan(result.events.length);
  });

  it("rewinds to the previous expansion boundary", () => {
    const result = bfs(gridFromRows(["S..T"]));
    const firstBoundary = nextExpansionBoundary(result.events, 0);
    const secondBoundary = nextExpansionBoundary(result.events, firstBoundary);

    expect(secondBoundary).toBeGreaterThan(firstBoundary);
    expect(previousExpansionBoundary(result.events, secondBoundary)).toBe(firstBoundary);
    expect(previousExpansionBoundary(result.events, firstBoundary)).toBe(0);
  });
});

