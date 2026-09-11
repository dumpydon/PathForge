import type { GraphDocument } from "../domain/types";

export function createDisconnectedGraphPreset(): GraphDocument {
  return {
    nodes: [
      // Component 1 (Cluster Alpha - Contains Start)
      { id: "disc-1", label: "A", position: { x: 80, y: 120 }, color: "neutral" },
      { id: "disc-2", label: "B", position: { x: 200, y: 80 }, color: "neutral" },
      { id: "disc-3", label: "C", position: { x: 200, y: 180 }, color: "neutral" },
      { id: "disc-4", label: "D", position: { x: 320, y: 80 }, color: "neutral" },
      { id: "disc-5", label: "E", position: { x: 320, y: 180 }, color: "neutral" },
      { id: "disc-6", label: "F", position: { x: 420, y: 130 }, color: "neutral" },

      // Component 2 (Cluster Beta - Contains Target)
      { id: "disc-7", label: "G", position: { x: 580, y: 120 }, color: "neutral" },
      { id: "disc-8", label: "H", position: { x: 700, y: 80 }, color: "neutral" },
      { id: "disc-9", label: "I", position: { x: 700, y: 180 }, color: "neutral" },
      { id: "disc-10", label: "J", position: { x: 820, y: 80 }, color: "neutral" },
      { id: "disc-11", label: "K", position: { x: 820, y: 180 }, color: "neutral" },
      { id: "disc-12", label: "L", position: { x: 920, y: 130 }, color: "neutral" },

      // Component 3 (Cluster Gamma - Isolated Island)
      { id: "disc-13", label: "M", position: { x: 300, y: 340 }, color: "neutral" },
      { id: "disc-14", label: "N", position: { x: 420, y: 300 }, color: "neutral" },
      { id: "disc-15", label: "O", position: { x: 420, y: 400 }, color: "neutral" },
      { id: "disc-16", label: "P", position: { x: 540, y: 300 }, color: "neutral" },
      { id: "disc-17", label: "Q", position: { x: 540, y: 400 }, color: "neutral" },
      { id: "disc-18", label: "R", position: { x: 660, y: 350 }, color: "neutral" },
    ],
    edges: [
      // Cluster 1 edges
      { id: "de-1", source: "disc-1", target: "disc-2", weight: 2 },
      { id: "de-2", source: "disc-1", target: "disc-3", weight: 3 },
      { id: "de-3", source: "disc-2", target: "disc-4", weight: 1 },
      { id: "de-4", source: "disc-3", target: "disc-5", weight: 2 },
      { id: "de-5", source: "disc-4", target: "disc-6", weight: 3 },
      { id: "de-6", source: "disc-5", target: "disc-6", weight: 1 },

      // Cluster 2 edges
      { id: "de-7", source: "disc-7", target: "disc-8", weight: 2 },
      { id: "de-8", source: "disc-7", target: "disc-9", weight: 2 },
      { id: "de-9", source: "disc-8", target: "disc-10", weight: 3 },
      { id: "de-10", source: "disc-9", target: "disc-11", weight: 1 },
      { id: "de-11", source: "disc-10", target: "disc-12", weight: 2 },
      { id: "de-12", source: "disc-11", target: "disc-12", weight: 2 },

      // Cluster 3 edges
      { id: "de-13", source: "disc-13", target: "disc-14", weight: 2 },
      { id: "de-14", source: "disc-13", target: "disc-15", weight: 2 },
      { id: "de-15", source: "disc-14", target: "disc-16", weight: 3 },
      { id: "de-16", source: "disc-15", target: "disc-17", weight: 1 },
      { id: "de-17", source: "disc-16", target: "disc-18", weight: 2 },
      { id: "de-18", source: "disc-17", target: "disc-18", weight: 2 },
    ],
    directed: false,
    startNodeId: "disc-1",
    targetNodeId: "disc-12",
    scenarioLabel: "Disconnected Graph",
  };
}
