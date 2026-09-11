import type { GraphDocument } from "../domain/types";

export function createBalancedTreePreset(): GraphDocument {
  return {
    nodes: [
      // Level 0 (Root)
      { id: "tree-1", label: "A", position: { x: 400, y: 50 }, color: "neutral" },

      // Level 1
      { id: "tree-2", label: "B", position: { x: 200, y: 150 }, color: "neutral" },
      { id: "tree-3", label: "C", position: { x: 600, y: 150 }, color: "neutral" },

      // Level 2
      { id: "tree-4", label: "D", position: { x: 100, y: 260 }, color: "neutral" },
      { id: "tree-5", label: "E", position: { x: 300, y: 260 }, color: "neutral" },
      { id: "tree-6", label: "F", position: { x: 500, y: 260 }, color: "neutral" },
      { id: "tree-7", label: "G", position: { x: 700, y: 260 }, color: "neutral" },

      // Level 3
      { id: "tree-8", label: "H", position: { x: 50, y: 380 }, color: "neutral" },
      { id: "tree-9", label: "I", position: { x: 150, y: 380 }, color: "neutral" },
      { id: "tree-10", label: "J", position: { x: 250, y: 380 }, color: "neutral" },
      { id: "tree-11", label: "K", position: { x: 350, y: 380 }, color: "neutral" },
      { id: "tree-12", label: "L", position: { x: 450, y: 380 }, color: "neutral" },
      { id: "tree-13", label: "M", position: { x: 550, y: 380 }, color: "neutral" },
      { id: "tree-14", label: "N", position: { x: 650, y: 380 }, color: "neutral" },
      { id: "tree-15", label: "O", position: { x: 750, y: 380 }, color: "neutral" },
    ],
    edges: [
      { id: "te-1", source: "tree-1", target: "tree-2", weight: 1 },
      { id: "te-2", source: "tree-1", target: "tree-3", weight: 1 },

      { id: "te-3", source: "tree-2", target: "tree-4", weight: 1 },
      { id: "te-4", source: "tree-2", target: "tree-5", weight: 1 },
      { id: "te-5", source: "tree-3", target: "tree-6", weight: 1 },
      { id: "te-6", source: "tree-3", target: "tree-7", weight: 1 },

      { id: "te-7", source: "tree-4", target: "tree-8", weight: 1 },
      { id: "te-8", source: "tree-4", target: "tree-9", weight: 1 },
      { id: "te-9", source: "tree-5", target: "tree-10", weight: 1 },
      { id: "te-10", source: "tree-5", target: "tree-11", weight: 1 },
      { id: "te-11", source: "tree-6", target: "tree-12", weight: 1 },
      { id: "te-12", source: "tree-6", target: "tree-13", weight: 1 },
      { id: "te-13", source: "tree-7", target: "tree-14", weight: 1 },
      { id: "te-14", source: "tree-7", target: "tree-15", weight: 1 },
    ],
    directed: false,
    startNodeId: "tree-1",
    targetNodeId: "tree-15",
    scenarioLabel: "Balanced Tree",
  };
}
