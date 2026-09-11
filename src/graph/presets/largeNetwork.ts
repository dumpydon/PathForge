import type { GraphDocument, GraphEdge, GraphNode } from "../domain/types";

/**
 * Large Network Preset:
 * A structured 60-node scale and algorithm comparison showcase.
 *
 * Topology:
 * - 60 nodes (0–59) organized into 6 distinct functional clusters:
 *   1. Cluster 0: Ingress Zone (0–9)
 *   2. Cluster 1: North Compute Cluster (10–19)
 *   3. Cluster 2: Central Core Mesh (20–29)
 *   4. Cluster 3: South Storage Ring (30–39)
 *   5. Cluster 4: East Aggregation Grid (40–49)
 *   6. Cluster 5: Delivery & Egress Hub (50–59)
 * - 96 edges containing dense intra-cluster links and inter-cluster bridges.
 * - Divergence demonstration:
 *   - Expensive Express Bridge: 0 -> 20 -> 50 -> 59 (3 edges, total weight = 18 + 20 + 16 = 54)
 *   - Low-Cost Distributed Route: 0 -> 2 -> 11 -> 15 -> 41 -> 46 -> 52 -> 59 (7 edges, total weight = 1 + 2 + 1 + 1 + 2 + 1 + 2 = 10)
 *   - BFS chooses the 3-edge express bridge; Dijkstra chooses the 7-edge optimal cost route.
 */
export function createLargeNetworkPreset(): GraphDocument {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Helper to add node
  const addN = (idNum: number, x: number, y: number) => {
    nodes.push({
      id: `ln-${idNum}`,
      label: String(idNum),
      value: String(idNum),
      position: { x, y },
      color: "neutral",
    });
  };

  // Helper to add edge
  const addE = (src: number, tgt: number, weight: number) => {
    edges.push({
      id: `le-${src}-${tgt}`,
      source: `ln-${src}`,
      target: `ln-${tgt}`,
      weight,
    });
  };

  // ----------------------------------------------------
  // Cluster 0: Ingress Zone (Nodes 0..9)
  // ----------------------------------------------------
  addN(0, 60, 360);   // START
  addN(1, 140, 240);
  addN(2, 140, 360);
  addN(3, 140, 480);
  addN(4, 220, 180);
  addN(5, 220, 300);
  addN(6, 220, 420);
  addN(7, 220, 540);
  addN(8, 290, 240);
  addN(9, 290, 440);

  addE(0, 1, 2);
  addE(0, 2, 1);
  addE(0, 3, 2);
  addE(1, 4, 2);
  addE(1, 5, 3);
  addE(2, 5, 2);
  addE(2, 6, 2);
  addE(3, 6, 2);
  addE(3, 7, 3);
  addE(4, 8, 2);
  addE(5, 8, 2);
  addE(6, 9, 2);
  addE(7, 9, 2);
  addE(8, 9, 4); // internal cross-link

  // ----------------------------------------------------
  // Cluster 1: North Compute Cluster (Nodes 10..19)
  // ----------------------------------------------------
  addN(10, 380, 80);
  addN(11, 460, 40);
  addN(12, 460, 140);
  addN(13, 540, 60);
  addN(14, 540, 160);
  addN(15, 620, 80);
  addN(16, 620, 180);
  addN(17, 700, 60);
  addN(18, 700, 160);
  addN(19, 780, 120);

  addE(10, 11, 1);
  addE(10, 12, 2);
  addE(11, 13, 2);
  addE(12, 14, 2);
  addE(13, 15, 1);
  addE(14, 16, 2);
  addE(15, 17, 2);
  addE(16, 18, 2);
  addE(17, 19, 1);
  addE(18, 19, 2);
  addE(13, 14, 2); // vertical cross-links
  addE(15, 16, 2);

  // Bridges Cluster 0 -> Cluster 1
  addE(4, 10, 2);
  addE(8, 12, 2);
  addE(2, 11, 2); // Cheap bridge for Dijkstra

  // ----------------------------------------------------
  // Cluster 2: Central Core Mesh (Nodes 20..29)
  // ----------------------------------------------------
  addN(20, 390, 320); // Bridgehead for express route
  addN(21, 390, 440);
  addN(22, 480, 280);
  addN(23, 480, 380);
  addN(24, 480, 480);
  addN(25, 570, 280);
  addN(26, 570, 380);
  addN(27, 570, 480);
  addN(28, 660, 320);
  addN(29, 660, 440);

  addE(20, 21, 3);
  addE(20, 22, 3);
  addE(20, 23, 4);
  addE(21, 24, 3);
  addE(22, 25, 3);
  addE(23, 26, 2);
  addE(24, 27, 3);
  addE(25, 28, 3);
  addE(26, 28, 2);
  addE(26, 29, 2);
  addE(27, 29, 3);
  addE(28, 29, 3);
  addE(22, 23, 3);
  addE(23, 24, 3);

  // Bridges Cluster 0 -> Cluster 2
  addE(0, 20, 18); // Express high-cost shortcut
  addE(5, 20, 4);
  addE(6, 21, 4);

  // Bridges Cluster 1 <-> Cluster 2
  addE(12, 22, 4);
  addE(14, 25, 4);
  addE(16, 28, 4);

  // ----------------------------------------------------
  // Cluster 3: South Storage Ring (Nodes 30..39)
  // ----------------------------------------------------
  addN(30, 380, 600);
  addN(31, 460, 560);
  addN(32, 460, 680);
  addN(33, 540, 580);
  addN(34, 540, 700);
  addN(35, 620, 600);
  addN(36, 620, 720);
  addN(37, 700, 600);
  addN(38, 700, 700);
  addN(39, 780, 640);

  addE(30, 31, 2);
  addE(30, 32, 2);
  addE(31, 33, 3);
  addE(32, 34, 3);
  addE(33, 35, 2);
  addE(34, 36, 2);
  addE(35, 37, 3);
  addE(36, 38, 3);
  addE(37, 39, 2);
  addE(38, 39, 2);
  addE(31, 32, 3);
  addE(33, 34, 3);

  // Bridges Cluster 0 -> Cluster 3
  addE(7, 30, 3);
  addE(9, 32, 3);

  // Bridges Cluster 2 <-> Cluster 3
  addE(24, 31, 4);
  addE(27, 35, 4);
  addE(29, 37, 4);

  // ----------------------------------------------------
  // Cluster 4: East Aggregation Grid (Nodes 40..49)
  // ----------------------------------------------------
  addN(40, 840, 180);
  addN(41, 840, 300);
  addN(42, 840, 440);
  addN(43, 840, 560);
  addN(44, 920, 240);
  addN(45, 920, 360);
  addN(46, 920, 480);
  addN(47, 1000, 240);
  addN(48, 1000, 360);
  addN(49, 1000, 480);

  addE(40, 41, 2);
  addE(41, 42, 3);
  addE(42, 43, 2);
  addE(40, 44, 2);
  addE(41, 44, 2);
  addE(41, 45, 2);
  addE(42, 46, 2);
  addE(43, 46, 3);
  addE(44, 47, 2);
  addE(45, 48, 2);
  addE(46, 49, 2);
  addE(47, 48, 2);
  addE(48, 49, 2);

  // Bridges into Cluster 4
  addE(19, 40, 2);
  addE(15, 41, 1); // Key low-cost highway connection
  addE(28, 41, 3);
  addE(29, 42, 3);
  addE(39, 43, 3);

  // ----------------------------------------------------
  // Cluster 5: Delivery & Egress Hub (Nodes 50..59)
  // ----------------------------------------------------
  addN(50, 1080, 200); // Express endpoint
  addN(51, 1080, 300);
  addN(52, 1080, 420);
  addN(53, 1080, 520);
  addN(54, 1160, 240);
  addN(55, 1160, 360);
  addN(56, 1160, 480);
  addN(57, 1240, 280);
  addN(58, 1240, 440);
  addN(59, 1320, 360); // TARGET

  addE(50, 51, 3);
  addE(51, 52, 2);
  addE(52, 53, 3);
  addE(50, 54, 2);
  addE(51, 55, 2);
  addE(52, 55, 1);
  addE(53, 56, 2);
  addE(54, 57, 2);
  addE(56, 58, 2);
  addE(57, 59, 2);
  addE(58, 59, 2);
  addE(52, 59, 2); // direct link to 59 for low-cost route

  // High-cost Express Bridge across Core to Egress
  addE(20, 50, 20); // Express bridge: 0 -> 20 -> 50 -> 59
  addE(50, 59, 16);

  // Bridges from Cluster 4 -> Cluster 5
  addE(47, 50, 3);
  addE(47, 51, 2);
  addE(45, 51, 2);
  addE(46, 52, 1);
  addE(48, 52, 2);
  addE(49, 53, 3);

  return {
    scenarioLabel: "Large Network",
    directed: false,
    startNodeId: "ln-0",
    targetNodeId: "ln-59",
    nodes,
    edges,
  };
}
