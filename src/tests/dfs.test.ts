import { describe, expect, it } from "vitest";
import { dfs } from "../algorithms/dfs";
import { validatePath } from "../core/path";
import { gridFromRows } from "./fixtures";

describe("DFS", () => {
  it("finds a reachable target", () => {
    const grid = gridFromRows(["S...", ".##.", "...T"]);
    const result = dfs(grid);
    expect(result.found).toBe(true);
    expect(validatePath(grid, result.path)).toBe(true);
  });

  it("terminates on a cyclic open grid", () => {
    const grid = gridFromRows(["S..", "...", "..T"]);
    const result = dfs(grid);
    expect(result.found).toBe(true);
    expect(result.expandedCount).toBeLessThanOrEqual(9);
  });

  it("uses diagonal topology in eight-way mode", () => {
    const grid = gridFromRows(["S#", ".T"]);
    const result = dfs(grid, { movementMode: "eight-way" });

    expect(result.found).toBe(true);
    expect(validatePath(grid, result.path, { movementMode: "eight-way" })).toBe(true);
  });

  it("reports an unreachable target", () => {
    const result = dfs(gridFromRows(["S#T", ".#."]));
    expect(result.found).toBe(false);
    expect(result.expandedCount).toBe(2);
  });

  it("emits branch depth level in discovered and expanded events", () => {
    const grid = gridFromRows(["S...", "....", "...T"]);
    const result = dfs(grid);
    const discoveredEvents = result.events.filter((e) => e.type === "discovered" && e.values);
    expect(discoveredEvents.length).toBeGreaterThan(0);
    expect(discoveredEvents.every((e) => "values" in e && typeof e.values?.level === "number")).toBe(true);

    const startEvent = discoveredEvents[0];
    expect("values" in startEvent && startEvent.values?.level).toBe(0);
  });
});
