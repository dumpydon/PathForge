import type { GraphDocument } from "../domain/types";

export function createCyclicNetworkPreset(): GraphDocument {
  return {
    nodes: [
      { id: "cyc-1", label: "A", position: { x: 80, y: 220 }, color: "neutral" },
      { id: "cyc-2", label: "B", position: { x: 200, y: 120 }, color: "neutral" },
      { id: "cyc-3", label: "C", position: { x: 200, y: 320 }, color: "neutral" },
      { id: "cyc-4", label: "D", position: { x: 320, y: 80 }, color: "neutral" },
      { id: "cyc-5", label: "E", position: { x: 320, y: 220 }, color: "neutral" },
      { id: "cyc-6", label: "F", position: { x: 320, y: 360 }, color: "neutral" },
      { id: "cyc-7", label: "G", position: { x: 440, y: 120 }, color: "neutral" },
      { id: "cyc-8", label: "H", position: { x: 440, y: 320 }, color: "neutral" },
      { id: "cyc-9", label: "I", position: { x: 560, y: 80 }, color: "neutral" },
      { id: "cyc-10", label: "J", position: { x: 560, y: 220 }, color: "neutral" },
      { id: "cyc-11", label: "K", position: { x: 560, y: 360 }, color: "neutral" },
      { id: "cyc-12", label: "L", position: { x: 680, y: 120 }, color: "neutral" },
      { id: "cyc-13", label: "M", position: { x: 680, y: 320 }, color: "neutral" },
      { id: "cyc-14", label: "N", position: { x: 800, y: 220 }, color: "neutral" },
      { id: "cyc-15", label: "O", position: { x: 440, y: 20 }, color: "neutral" },
      { id: "cyc-16", label: "P", position: { x: 440, y: 420 }, color: "neutral" },
      { id: "cyc-17", label: "Q", position: { x: 680, y: 20 }, color: "neutral" },
      { id: "cyc-18", label: "R", position: { x: 920, y: 220 }, color: "neutral" },
    ],
    edges: [
      // Ring 1
      { id: "ce-1", source: "cyc-1", target: "cyc-2", weight: 2 },
      { id: "ce-2", source: "cyc-1", target: "cyc-3", weight: 3 },
      { id: "ce-3", source: "cyc-2", target: "cyc-3", weight: 2 }, // cycle 1-2-3

      // Ring 2
      { id: "ce-4", source: "cyc-2", target: "cyc-4", weight: 2 },
      { id: "ce-5", source: "cyc-2", target: "cyc-5", weight: 4 },
      { id: "ce-6", source: "cyc-3", target: "cyc-5", weight: 1 },
      { id: "ce-7", source: "cyc-3", target: "cyc-6", weight: 3 },
      { id: "ce-8", source: "cyc-4", target: "cyc-5", weight: 2 },
      { id: "ce-9", source: "cyc-5", target: "cyc-6", weight: 2 }, // cycles everywhere

      // Central Hub
      { id: "ce-10", source: "cyc-4", target: "cyc-7", weight: 3 },
      { id: "ce-11", source: "cyc-5", target: "cyc-7", weight: 2 },
      { id: "ce-12", source: "cyc-5", target: "cyc-8", weight: 2 },
      { id: "ce-13", source: "cyc-6", target: "cyc-8", weight: 3 },
      { id: "ce-14", source: "cyc-7", target: "cyc-8", weight: 4 },

      // Ring 3
      { id: "ce-15", source: "cyc-7", target: "cyc-9", weight: 2 },
      { id: "ce-16", source: "cyc-7", target: "cyc-10", weight: 3 },
      { id: "ce-17", source: "cyc-8", target: "cyc-10", weight: 2 },
      { id: "ce-18", source: "cyc-8", target: "cyc-11", weight: 3 },
      { id: "ce-19", source: "cyc-9", target: "cyc-10", weight: 1 },
      { id: "ce-20", source: "cyc-10", target: "cyc-11", weight: 2 },

      // Ring 4
      { id: "ce-21", source: "cyc-9", target: "cyc-12", weight: 3 },
      { id: "ce-22", source: "cyc-10", target: "cyc-12", weight: 2 },
      { id: "ce-23", source: "cyc-10", target: "cyc-13", weight: 2 },
      { id: "ce-24", source: "cyc-11", target: "cyc-13", weight: 3 },
      { id: "ce-25", source: "cyc-12", target: "cyc-13", weight: 4 },

      // Exit
      { id: "ce-26", source: "cyc-12", target: "cyc-14", weight: 2 },
      { id: "ce-27", source: "cyc-13", target: "cyc-14", weight: 2 },
      { id: "ce-28", source: "cyc-14", target: "cyc-18", weight: 1 },

      // Exterior chords
      { id: "ce-29", source: "cyc-4", target: "cyc-15", weight: 3 },
      { id: "ce-30", source: "cyc-15", target: "cyc-9", weight: 4 },
      { id: "ce-31", source: "cyc-6", target: "cyc-16", weight: 3 },
      { id: "ce-32", source: "cyc-16", target: "cyc-11", weight: 4 },
      { id: "ce-33", source: "cyc-9", target: "cyc-17", weight: 2 },
      { id: "ce-34", source: "cyc-17", target: "cyc-18", weight: 5 },
    ],
    directed: false,
    startNodeId: "cyc-1",
    targetNodeId: "cyc-18",
    scenarioLabel: "Cyclic Network",
  };
}
