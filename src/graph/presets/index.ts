import { createBalancedTreePreset } from "./balancedTree";
import { createCyclicNetworkPreset } from "./cyclicNetwork";
import { createDenseNetworkPreset } from "./denseNetwork";
import { createDependencyDagPreset } from "./dependencyDag";
import { createDisconnectedGraphPreset } from "./disconnectedGraph";
import { createLargeNetworkPreset } from "./largeNetwork";
import { createLeetcodeGraphPreset } from "./leetcodeGraph";
import type { GraphPreset, GraphPresetId } from "./types";
import { createWeightedDetourPreset } from "./weightedDetour";

export * from "./types";

export const GRAPH_PRESETS: GraphPreset[] = [
  {
    id: "weighted-detour",
    name: "Weighted Detour",
    description: "Pedagogical network contrasting edge-count vs cost-optimal paths",
    create: createWeightedDetourPreset,
  },
  {
    id: "balanced-tree",
    name: "Balanced Tree",
    description: "15-node hierarchical tree contrasting DFS depth vs BFS levels",
    create: createBalancedTreePreset,
  },
  {
    id: "leetcode-graph",
    name: "LeetCode Graph",
    description: "Interview-style 14-node adjacency graph with numeric values and alternative routes",
    create: createLeetcodeGraphPreset,
  },
  {
    id: "cyclic-network",
    name: "Cyclic Network",
    description: "Multi-loop interconnected graph demonstrating cycle avoidance",
    create: createCyclicNetworkPreset,
  },
  {
    id: "disconnected-graph",
    name: "Disconnected Graph",
    description: "Multi-component graph with isolated clusters demonstrating unreachable targets",
    create: createDisconnectedGraphPreset,
  },
  {
    id: "dense-network",
    name: "Dense Network",
    description: "Lattice-based dense network with weighted shortcuts",
    create: createDenseNetworkPreset,
  },
  {
    id: "dependency-dag",
    name: "Dependency DAG",
    description: "Directed acyclic pipeline demonstrating directional edge flow",
    create: createDependencyDagPreset,
  },
  {
    id: "large-network",
    name: "Large Network",
    description: "60-node multi-cluster network demonstrating scale, clustering, and path divergence",
    create: createLargeNetworkPreset,
  },
];

export function getGraphPreset(id: GraphPresetId): GraphPreset | undefined {
  return GRAPH_PRESETS.find((p) => p.id === id);
}

export const DEFAULT_GRAPH_PRESET = createWeightedDetourPreset();
