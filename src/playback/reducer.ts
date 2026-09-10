import type { SearchEvent } from "../algorithms/types";
import { coordinateKey } from "../core/types";
import type { PlaybackNode, PlaybackSnapshot } from "./types";

export function createPlaybackSnapshot(): PlaybackSnapshot {
  return {
    nodes: new Map(),
    currentKey: null,
    frontierSize: 0,
    lastEvent: null,
  };
}

function updateNode(
  nodes: Map<string, PlaybackNode>,
  key: string,
  update: Partial<PlaybackNode>,
): void {
  const previous = nodes.get(key);
  nodes.set(key, {
    state: previous?.state ?? "frontier",
    parent: previous?.parent ?? null,
    ...previous,
    ...update,
  });
}

export function applySearchEvent(
  snapshot: PlaybackSnapshot,
  event: SearchEvent,
): PlaybackSnapshot {
  const nodes = new Map(snapshot.nodes);
  const key = coordinateKey(event.coordinate);
  let currentKey = snapshot.currentKey;

  switch (event.type) {
    case "discovered":
      updateNode(nodes, key, { ...event.values, state: "frontier" });
      break;
    case "expanded":
      if (currentKey && currentKey !== key) {
        updateNode(nodes, currentKey, { state: "closed" });
      }
      updateNode(nodes, key, { ...event.values, state: "current" });
      currentKey = key;
      break;
    case "relaxed":
      updateNode(nodes, key, { ...event.values, state: "frontier" });
      break;
    case "closed":
      updateNode(nodes, key, { state: "closed" });
      if (currentKey === key) currentKey = null;
      break;
    case "path":
      updateNode(nodes, key, { state: "path" });
      if (currentKey === key) currentKey = null;
      break;
  }

  return {
    nodes,
    currentKey,
    frontierSize: event.frontierSize,
    lastEvent: event,
  };
}

export function applySearchEvents(
  snapshot: PlaybackSnapshot,
  events: readonly SearchEvent[],
): PlaybackSnapshot {
  return events.reduce(applySearchEvent, snapshot);
}

export function nextExpansionBoundary(events: readonly SearchEvent[], cursor: number): number {
  let expansionSeen = false;

  for (let index = cursor; index < events.length; index += 1) {
    if (events[index].type === "expanded") expansionSeen = true;
    if (expansionSeen && events[index].type === "closed") return index + 1;
  }

  return events.length;
}

export function previousExpansionBoundary(events: readonly SearchEvent[], cursor: number): number {
  if (cursor <= 0) return 0;
  // If cursor is beyond the end, clamp to events.length
  const currentCursor = Math.min(cursor, events.length);

  // Scan backwards from currentCursor - 1 to find the closed event of the preceding expansion
  let foundClosedOfCurrent = false;

  for (let index = currentCursor - 1; index >= 0; index -= 1) {
    // If the cursor was right after a closed event, the first closed event we see going backwards is that current boundary
    if (!foundClosedOfCurrent && events[index].type === "closed" && index + 1 === currentCursor) {
      foundClosedOfCurrent = true;
      continue;
    }

    // The next closed event we encounter marks the boundary of the previous expansion
    if (events[index].type === "closed") {
      return index + 1;
    }
  }

  return 0;
}

