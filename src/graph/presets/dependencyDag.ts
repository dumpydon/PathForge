import type { GraphDocument } from "../domain/types";

export function createDependencyDagPreset(): GraphDocument {
  return {
    nodes: [
      { id: "dag-1", label: "Repo", position: { x: 80, y: 220 }, color: "neutral" },

      { id: "dag-2", label: "Lint", position: { x: 240, y: 100 }, color: "neutral" },
      { id: "dag-3", label: "Typecheck", position: { x: 240, y: 220 }, color: "neutral" },
      { id: "dag-4", label: "Deps", position: { x: 240, y: 340 }, color: "neutral" },

      { id: "dag-5", label: "Unit Test", position: { x: 400, y: 100 }, color: "neutral" },
      { id: "dag-6", label: "Integration", position: { x: 400, y: 220 }, color: "neutral" },
      { id: "dag-7", label: "Security", position: { x: 400, y: 340 }, color: "neutral" },

      { id: "dag-8", label: "Client Build", position: { x: 560, y: 80 }, color: "neutral" },
      { id: "dag-9", label: "Server Build", position: { x: 560, y: 220 }, color: "neutral" },
      { id: "dag-10", label: "Worker Build", position: { x: 560, y: 360 }, color: "neutral" },

      { id: "dag-11", label: "Bundle Check", position: { x: 720, y: 150 }, color: "neutral" },
      { id: "dag-12", label: "E2E Test", position: { x: 720, y: 290 }, color: "neutral" },

      { id: "dag-13", label: "Release Gate", position: { x: 860, y: 220 }, color: "neutral" },
      { id: "dag-14", label: "Deploy", position: { x: 1000, y: 220 }, color: "neutral" },
    ],
    edges: [
      { id: "dage-1", source: "dag-1", target: "dag-2", weight: 1 },
      { id: "dage-2", source: "dag-1", target: "dag-3", weight: 2 },
      { id: "dage-3", source: "dag-1", target: "dag-4", weight: 1 },

      { id: "dage-4", source: "dag-2", target: "dag-5", weight: 2 },
      { id: "dage-5", source: "dag-3", target: "dag-5", weight: 1 },
      { id: "dage-6", source: "dag-3", target: "dag-6", weight: 3 },
      { id: "dage-7", source: "dag-4", target: "dag-7", weight: 2 },

      { id: "dage-8", source: "dag-5", target: "dag-8", weight: 2 },
      { id: "dage-9", source: "dag-6", target: "dag-9", weight: 2 },
      { id: "dage-10", source: "dag-7", target: "dag-10", weight: 1 },

      { id: "dage-11", source: "dag-8", target: "dag-11", weight: 1 },
      { id: "dage-12", source: "dag-9", target: "dag-11", weight: 1 },
      { id: "dage-13", source: "dag-9", target: "dag-12", weight: 4 },
      { id: "dage-14", source: "dag-10", target: "dag-12", weight: 2 },

      { id: "dage-15", source: "dag-11", target: "dag-13", weight: 1 },
      { id: "dage-16", source: "dag-12", target: "dag-13", weight: 1 },
      { id: "dage-17", source: "dag-13", target: "dag-14", weight: 1 },
    ],
    directed: true,
    startNodeId: "dag-1",
    targetNodeId: "dag-14",
    scenarioLabel: "Dependency DAG",
  };
}
