import type { GraphDocument, GraphEdge, GraphNode } from "../domain/types";

export function createDenseNetworkPreset(): GraphDocument {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Create a 4x6 lattice-like network with cross diagonals and randomized weights
  const rows = 4;
  const cols = 6;
  const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const id = `dense-${r}-${c}`;
      nodes.push({
        id,
        label: labels[idx % labels.length] + (idx >= labels.length ? String(Math.floor(idx / labels.length)) : ""),
        position: { x: 80 + c * 150, y: 60 + r * 110 },
        color: "neutral",
      });
    }
  }

  let edgeCounter = 1;
  const addE = (r1: number, c1: number, r2: number, c2: number, weight: number) => {
    edges.push({
      id: `dense-e-${edgeCounter++}`,
      source: `dense-${r1}-${c1}`,
      target: `dense-${r2}-${c2}`,
      weight,
    });
  };

  // Horizontal edges
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const weight = ((r + c * 2) % 7) + 1;
      addE(r, c, r, c + 1, weight);
    }
  }

  // Vertical edges
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const weight = ((r * 3 + c) % 6) + 1;
      addE(r, c, r + 1, c, weight);
    }
  }

  // Selective diagonals to create interesting shortcut cycles
  addE(0, 0, 1, 1, 3);
  addE(1, 1, 2, 2, 4);
  addE(2, 2, 3, 3, 2);
  addE(0, 2, 1, 3, 5);
  addE(1, 3, 2, 4, 3);
  addE(2, 4, 3, 5, 2);
  addE(1, 0, 2, 1, 4);
  addE(2, 1, 3, 2, 3);
  addE(0, 3, 1, 4, 4);
  addE(1, 4, 2, 5, 2);

  return {
    nodes,
    edges,
    directed: false,
    startNodeId: "dense-0-0",
    targetNodeId: `dense-${rows - 1}-${cols - 1}`,
    scenarioLabel: "Dense Network",
  };
}
