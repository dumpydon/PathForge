import type { GraphDocument } from "../domain/types";

export function createWeightedDetourPreset(): GraphDocument {
  return {
    nodes: [
      { id: "n-start", label: "A", position: { x: 80, y: 220 }, color: "neutral" },
      // Upper highway (expensive weights, few edges)
      { id: "n-b", label: "B", position: { x: 280, y: 100 }, color: "neutral" },
      { id: "n-c", label: "C", position: { x: 500, y: 100 }, color: "neutral" },
      // Lower scenic detour (cheap weights, more edges)
      { id: "n-d", label: "D", position: { x: 220, y: 340 }, color: "neutral" },
      { id: "n-e", label: "E", position: { x: 360, y: 340 }, color: "neutral" },
      { id: "n-f", label: "F", position: { x: 500, y: 340 }, color: "neutral" },
      { id: "n-g", label: "G", position: { x: 640, y: 340 }, color: "neutral" },
      // Target
      { id: "n-target", label: "H", position: { x: 740, y: 220 }, color: "neutral" },
      // Contextual peripheral nodes
      { id: "n-p1", label: "P1", position: { x: 280, y: 20 }, color: "neutral" },
      { id: "n-p2", label: "P2", position: { x: 500, y: 20 }, color: "neutral" },
      { id: "n-p3", label: "P3", position: { x: 220, y: 440 }, color: "neutral" },
      { id: "n-p4", label: "P4", position: { x: 360, y: 440 }, color: "neutral" },
      { id: "n-p5", label: "P5", position: { x: 500, y: 440 }, color: "neutral" },
      { id: "n-p6", label: "P6", position: { x: 640, y: 440 }, color: "neutral" },
    ],
    edges: [
      // Upper path: 3 edges, cost = 8 + 9 + 8 = 25
      { id: "e-ab", source: "n-start", target: "n-b", weight: 8 },
      { id: "e-bc", source: "n-b", target: "n-c", weight: 9 },
      { id: "e-ct", source: "n-c", target: "n-target", weight: 8 },

      // Lower path: 5 edges, cost = 1 + 1 + 2 + 1 + 1 = 6
      { id: "e-ad", source: "n-start", target: "n-d", weight: 1 },
      { id: "e-de", source: "n-d", target: "n-e", weight: 1 },
      { id: "e-ef", source: "n-e", target: "n-f", weight: 2 },
      { id: "e-fg", source: "n-f", target: "n-g", weight: 1 },
      { id: "e-gt", source: "n-g", target: "n-target", weight: 1 },

      // Peripheral edges
      { id: "e-bp1", source: "n-b", target: "n-p1", weight: 4 },
      { id: "e-cp2", source: "n-c", target: "n-p2", weight: 4 },
      { id: "e-dp3", source: "n-d", target: "n-p3", weight: 3 },
      { id: "e-ep4", source: "n-e", target: "n-p4", weight: 3 },
      { id: "e-fp5", source: "n-f", target: "n-p5", weight: 3 },
      { id: "e-gp6", source: "n-g", target: "n-p6", weight: 3 },
      // Cross link between detours
      { id: "e-be", source: "n-b", target: "n-e", weight: 7 },
      { id: "e-cf", source: "n-c", target: "n-f", weight: 7 },
    ],
    directed: false,
    startNodeId: "n-start",
    targetNodeId: "n-target",
    scenarioLabel: "Weighted Detour",
  };
}
