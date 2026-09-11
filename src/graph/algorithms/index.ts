import type { GraphDocument } from "../domain/types";
import { graphBfs } from "./bfs";
import { graphDfs } from "./dfs";
import { graphDijkstra } from "./dijkstra";
import type { GraphAlgorithmId, GraphSearchOptions, GraphSearchResult } from "./types";

export * from "./types";
export * from "./shared";
export { graphDfs } from "./dfs";
export { graphBfs } from "./bfs";
export { graphDijkstra } from "./dijkstra";

export function runGraphAlgorithm(
  algorithm: GraphAlgorithmId,
  doc: GraphDocument,
  options: GraphSearchOptions = {},
): GraphSearchResult {
  switch (algorithm) {
    case "dfs":
      return graphDfs(doc, options);
    case "bfs":
      return graphBfs(doc, options);
    case "dijkstra":
      return graphDijkstra(doc, options);
  }
}

export type GraphComparisonResults = Partial<Record<GraphAlgorithmId, GraphSearchResult>>;

export function runAllGraphAlgorithms(
  doc: GraphDocument,
  options: GraphSearchOptions = {},
): GraphComparisonResults {
  return {
    dfs: graphDfs(doc, options),
    bfs: graphBfs(doc, options),
    dijkstra: graphDijkstra(doc, options),
  };
}
