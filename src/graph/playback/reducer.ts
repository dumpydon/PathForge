import type { GraphSearchEvent } from "../algorithms/types";
import type {
  GraphPlaybackEdge,
  GraphPlaybackNode,
  GraphPlaybackSnapshot,
} from "./types";

export function createGraphPlaybackSnapshot(): GraphPlaybackSnapshot {
  return {
    nodes: new Map(),
    edges: new Map(),
    currentNodeId: null,
    frontierSize: 0,
    visitedCount: 0,
    lastEvent: null,
  };
}

function updatePlaybackNode(
  nodes: Map<string, GraphPlaybackNode>,
  nodeId: string,
  update: Partial<GraphPlaybackNode>,
): void {
  const previous = nodes.get(nodeId);
  nodes.set(nodeId, {
    state: previous?.state ?? "unvisited",
    parent: previous?.parent ?? null,
    ...previous,
    ...update,
  });
}

function updatePlaybackEdge(
  edges: Map<string, GraphPlaybackEdge>,
  edgeId: string,
  update: Partial<GraphPlaybackEdge>,
): void {
  const previous = edges.get(edgeId);
  edges.set(edgeId, {
    state: previous?.state ?? "default",
    ...previous,
    ...update,
  });
}

export function applyGraphSearchEvent(
  snapshot: GraphPlaybackSnapshot,
  event: GraphSearchEvent,
): GraphPlaybackSnapshot {
  const nodes = new Map(snapshot.nodes);
  const edges = new Map(snapshot.edges);
  let currentNodeId = snapshot.currentNodeId;

  switch (event.type) {
    case "discovered":
      if (event.nodeId) {
        updatePlaybackNode(nodes, event.nodeId, {
          ...event.values,
          state: "frontier",
        });
      }
      break;

    case "expanded":
      if (event.nodeId) {
        if (currentNodeId && currentNodeId !== event.nodeId) {
          const prev = nodes.get(currentNodeId);
          if (prev && prev.state === "current") {
            updatePlaybackNode(nodes, currentNodeId, { state: "closed" });
          }
        }
        updatePlaybackNode(nodes, event.nodeId, {
          ...event.values,
          state: "current",
        });
        currentNodeId = event.nodeId;
      }
      break;

    case "relaxed":
      if (event.nodeId) {
        updatePlaybackNode(nodes, event.nodeId, {
          ...event.values,
          state: "frontier",
        });
      }
      if (event.edgeId) {
        updatePlaybackEdge(edges, event.edgeId, { state: "relaxed" });
      }
      break;

    case "edgeExamined":
      if (event.edgeId) {
        const currentEdge = edges.get(event.edgeId);
        if (!currentEdge || currentEdge.state === "default") {
          updatePlaybackEdge(edges, event.edgeId, { state: "examined" });
        }
      }
      break;

    case "closed":
      if (event.nodeId) {
        updatePlaybackNode(nodes, event.nodeId, { state: "closed" });
        if (currentNodeId === event.nodeId) {
          currentNodeId = null;
        }
      }
      break;

    case "pathNode":
      if (event.nodeId) {
        updatePlaybackNode(nodes, event.nodeId, { state: "path" });
        if (currentNodeId === event.nodeId) {
          currentNodeId = null;
        }
      }
      break;

    case "pathEdge":
      if (event.edgeId) {
        updatePlaybackEdge(edges, event.edgeId, { state: "path" });
      }
      break;
  }

  let visitedCount = 0;
  for (const node of nodes.values()) {
    if (node.state === "closed" || node.state === "path") {
      visitedCount += 1;
    }
  }

  return {
    nodes,
    edges,
    currentNodeId,
    frontierSize: event.frontierSize,
    visitedCount,
    lastEvent: event,
  };
}

export function applyGraphSearchEvents(
  snapshot: GraphPlaybackSnapshot,
  events: readonly GraphSearchEvent[],
): GraphPlaybackSnapshot {
  return events.reduce(applyGraphSearchEvent, snapshot);
}
