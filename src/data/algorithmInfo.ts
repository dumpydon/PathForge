import type { AlgorithmId } from "../algorithms/types";

export interface AlgorithmInfo {
  name: string;
  structure: string;
  time: string;
  timeNote?: string;
  space: string;
  spaceNote?: string;
  guaranteeLabel: string;
  guaranteeValue: string;
  summary: string;
  summaryHighlight?: string;
}

export const ALGORITHM_ORDER: AlgorithmId[] = ["dfs", "bfs", "dijkstra", "astar"];

export const ALGORITHM_INFO: Record<AlgorithmId, AlgorithmInfo> = {
  bfs: {
    name: "BFS",
    structure: "Queue",
    time: "O(V+E)",
    timeNote: "O(N) Each vertex is visited once and each edge is explored once.",
    space: "O(V)",
    spaceNote: "O(N) from the visited array and queue space",
    guaranteeLabel: "Shortest path",
    guaranteeValue: "Equal-cost edges only",
    summary:
      "Breadth-First Search explores the graph level by level, visiting all neighbors at the current distance before moving deeper. It keeps track of visited nodes to avoid visiting them again. BFS guarantees the shortest path on unweighted or equal-cost graphs.",
    summaryHighlight: "BFS guarantees the shortest path on unweighted or equal-cost graphs.",
  },
  dfs: {
    name: "DFS",
    structure: "Stack",
    time: "O(V+E)",
    timeNote: "O(N) Each vertex is visited once and each edge is explored once.",
    space: "O(V)",
    spaceNote: "O(N) from the visited array and recursion stack space",
    guaranteeLabel: "Shortest path",
    guaranteeValue: "Not guaranteed",
    summary:
      "Depth-First Search explores one path as far as possible before backtracking and trying another path. It keeps track of visited nodes to avoid visiting them again. DFS does not guarantee the shortest path.",
  },
  dijkstra: {
    name: "Dijkstra",
    structure: "Min-heap",
    time: "O((V+E) log V)",
    timeNote: "O(N log N) Each vertex extracted from min-heap and incident edges relaxed.",
    space: "O(V+E)",
    spaceNote: "O(N) from the distances array, visited set, and min-heap space",
    guaranteeLabel: "Shortest path",
    guaranteeValue: "Non-negative weights",
    summary:
      "Dijkstra's Algorithm explores the graph by always visiting the unvisited node with the smallest accumulated distance. It relaxes edges along the frontier to update the shortest known path to neighboring nodes. Dijkstra guarantees the shortest path on graphs with non-negative edge weights.",
    summaryHighlight: "Dijkstra guarantees the shortest path on graphs with non-negative edge weights.",
  },
  astar: {
    name: "A*",
    structure: "Binary min heap",
    time: "Worst case O((V + E) log V)",
    space: "O(V + E)",
    guaranteeLabel: "Minimum cost",
    guaranteeValue: "Admissible heuristic",
    summary: "Orders the frontier by accumulated cost plus an estimate to the target.",
  },
};

