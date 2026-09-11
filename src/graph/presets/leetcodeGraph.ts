import type { GraphDocument } from "../domain/types";

/**
 * LeetCode Graph Preset:
 * A 14-node interview-style adjacency graph with numeric values 0–13,
 * containing multiple paths, branches, cycles, and alternative routes.
 *
 * Topology:
 * - Start: 0
 * - Target: 13
 * - Weights: Primarily 1, with select small weights for optimal vs edge-count routing.
 */
export function createLeetcodeGraphPreset(): GraphDocument {
  return {
    scenarioLabel: "LeetCode Graph",
    directed: false,
    startNodeId: "lc-0",
    targetNodeId: "lc-13",
    nodes: [
      { id: "lc-0", label: "0", value: "0", position: { x: 80, y: 260 }, color: "neutral" },
      { id: "lc-1", label: "1", value: "1", position: { x: 260, y: 120 }, color: "neutral" },
      { id: "lc-2", label: "2", value: "2", position: { x: 260, y: 260 }, color: "neutral" },
      { id: "lc-3", label: "3", value: "3", position: { x: 260, y: 400 }, color: "neutral" },
      { id: "lc-4", label: "4", value: "4", position: { x: 440, y: 60 }, color: "neutral" },
      { id: "lc-5", label: "5", value: "5", position: { x: 440, y: 160 }, color: "neutral" },
      { id: "lc-6", label: "6", value: "6", position: { x: 440, y: 260 }, color: "neutral" },
      { id: "lc-7", label: "7", value: "7", position: { x: 440, y: 360 }, color: "neutral" },
      { id: "lc-8", label: "8", value: "8", position: { x: 440, y: 460 }, color: "neutral" },
      { id: "lc-9", label: "9", value: "9", position: { x: 620, y: 110 }, color: "neutral" },
      { id: "lc-10", label: "10", value: "10", position: { x: 620, y: 210 }, color: "neutral" },
      { id: "lc-11", label: "11", value: "11", position: { x: 620, y: 310 }, color: "neutral" },
      { id: "lc-12", label: "12", value: "12", position: { x: 620, y: 410 }, color: "neutral" },
      { id: "lc-13", label: "13", value: "13", position: { x: 800, y: 260 }, color: "neutral" },
    ],
    edges: [
      // Cluster 0 outputs
      { id: "le-0-1", source: "lc-0", target: "lc-1", weight: 1 },
      { id: "le-0-2", source: "lc-0", target: "lc-2", weight: 2 },
      { id: "le-0-3", source: "lc-0", target: "lc-3", weight: 1 },

      // Cross-connects & cycles in layer 1
      { id: "le-1-2", source: "lc-1", target: "lc-2", weight: 1 },
      { id: "le-2-3", source: "lc-2", target: "lc-3", weight: 2 },

      // Layer 1 to Layer 2
      { id: "le-1-4", source: "lc-1", target: "lc-4", weight: 1 },
      { id: "le-1-5", source: "lc-1", target: "lc-5", weight: 1 },
      { id: "le-2-5", source: "lc-2", target: "lc-5", weight: 1 },
      { id: "le-2-6", source: "lc-2", target: "lc-6", weight: 1 },
      { id: "le-2-7", source: "lc-2", target: "lc-7", weight: 2 },
      { id: "le-3-7", source: "lc-3", target: "lc-7", weight: 1 },
      { id: "le-3-8", source: "lc-3", target: "lc-8", weight: 3 },

      // Layer 2 cross-edges
      { id: "le-5-6", source: "lc-5", target: "lc-6", weight: 1 },
      { id: "le-7-8", source: "lc-7", target: "lc-8", weight: 1 },

      // Layer 2 to Layer 3
      { id: "le-4-9", source: "lc-4", target: "lc-9", weight: 2 },
      { id: "le-5-9", source: "lc-5", target: "lc-9", weight: 1 },
      { id: "le-5-10", source: "lc-5", target: "lc-10", weight: 1 },
      { id: "le-6-10", source: "lc-6", target: "lc-10", weight: 2 },
      { id: "le-6-11", source: "lc-6", target: "lc-11", weight: 1 },
      { id: "le-7-11", source: "lc-7", target: "lc-11", weight: 1 },
      { id: "le-8-12", source: "lc-8", target: "lc-12", weight: 1 },

      // Layer 3 cross-edges
      { id: "le-10-11", source: "lc-10", target: "lc-11", weight: 1 },
      { id: "le-11-12", source: "lc-11", target: "lc-12", weight: 2 },

      // Layer 3 to Target (13)
      { id: "le-9-13", source: "lc-9", target: "lc-13", weight: 2 },
      { id: "le-10-13", source: "lc-10", target: "lc-13", weight: 1 },
      { id: "le-11-13", source: "lc-11", target: "lc-13", weight: 2 },
      { id: "le-12-13", source: "lc-12", target: "lc-13", weight: 1 },
    ],
  };
}
