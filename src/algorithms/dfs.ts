import { assertValidGrid, fromIndex, toIndex } from "../core/grid";
import { getNeighbors, resolveMovementOptions } from "../core/neighbors";
import { reconstructPath } from "../core/path";
import type { Grid } from "../core/types";
import { finishSearch } from "./shared";
import type { SearchEvent, SearchOptions, SearchResult } from "./types";

export function dfs(grid: Grid, options: SearchOptions = {}): SearchResult {
  assertValidGrid(grid);
  const recordEvents = options.recordEvents ?? true;
  const movement = resolveMovementOptions(options);
  const startedAt = performance.now();
  const startIndex = toIndex(grid, grid.start);
  const targetIndex = toIndex(grid, grid.target);
  const stack = [startIndex];
  const discovered = new Set<number>([startIndex]);
  const parents = new Map<number, number>();
  const depths = new Map<number, number>([[startIndex, 0]]);
  const events: SearchEvent[] = [];
  let discoveredCount = 1;
  let expandedCount = 0;
  let maxFrontierSize = 1;
  let found = false;

  if (recordEvents) events.push({
    type: "discovered",
    coordinate: grid.start,
    frontierSize: 1,
    values: { parent: null, level: 0, discoveryOrder: 1 },
  });

  while (stack.length > 0) {
    const current = stack.pop()!;
    const coordinate = fromIndex(grid, current);
    const depth = depths.get(current) ?? 0;
    expandedCount += 1;

    if (recordEvents) events.push({
      type: "expanded",
      coordinate,
      frontierSize: stack.length,
      values: {
        parent: parents.has(current) ? fromIndex(grid, parents.get(current)!) : null,
        level: depth,
        expansionOrder: expandedCount,
      },
    });

    if (current === targetIndex) {
      found = true;
      if (recordEvents) events.push({ type: "closed", coordinate, frontierSize: stack.length });
      break;
    }

    const neighbors = getNeighbors(grid, coordinate, movement);
    // Reverse push order so the first deterministic neighbor is popped first.
    for (let index = neighbors.length - 1; index >= 0; index -= 1) {
      const neighbor = neighbors[index];
      if (discovered.has(neighbor.index)) continue;

      discovered.add(neighbor.index);
      parents.set(neighbor.index, current);
      depths.set(neighbor.index, depth + 1);
      stack.push(neighbor.index);
      discoveredCount += 1;
      maxFrontierSize = Math.max(maxFrontierSize, stack.length);

      if (recordEvents) events.push({
        type: "discovered",
        coordinate: neighbor.coordinate,
        frontierSize: stack.length,
        values: {
          parent: coordinate,
          level: depth + 1,
          discoveryOrder: discoveredCount,
        },
      });
    }

    if (recordEvents) events.push({ type: "closed", coordinate, frontierSize: stack.length });
  }

  const path = found ? reconstructPath(grid, parents, targetIndex) : [];
  return finishSearch({
    algorithm: "dfs",
    grid,
    found,
    path,
    discoveredCount,
    expandedCount,
    maxFrontierSize,
    events,
    recordEvents,
    startedAt,
    movement,
  });
}
