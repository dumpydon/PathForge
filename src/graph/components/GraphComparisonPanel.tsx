"use client";

import { formatPathCost, formatRuntime } from "../../components/Panels/MetricsPanel";
import { ALGORITHM_INFO } from "../../data/algorithmInfo";
import type {
  GraphAlgorithmId,
  GraphComparisonResults,
} from "../algorithms";

const GRAPH_ALGORITHMS: GraphAlgorithmId[] = ["dfs", "bfs", "dijkstra"];

interface GraphComparisonPanelProps {
  results: GraphComparisonResults;
  activeAlgorithm: GraphAlgorithmId;
  onReplay: (algorithm: GraphAlgorithmId) => void;
}

export function GraphComparisonPanel({
  results,
  activeAlgorithm,
  onReplay,
}: GraphComparisonPanelProps) {
  const hasResults = Object.keys(results).length > 0;

  return (
    <section className="comparison-section graph-comparison-section" aria-label="Graph algorithm comparison">
      <div className="comparison-heading">
        <h2>Algorithm comparison</h2>
        <p className="weight-notice">
          BFS explores by fewest edges; Dijkstra optimizes total weighted cost.
        </p>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Algorithm</th>
              <th>Objective</th>
              <th>Found</th>
              <th>Path cost</th>
              <th>Steps</th>
              <th>Expanded</th>
              <th>Max frontier</th>
              <th>Execution</th>
              <th>
                <span className="sr-only">Replay</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {GRAPH_ALGORITHMS.map((alg) => {
              const result = results[alg];
              return (
                <tr
                  key={alg}
                  className={activeAlgorithm === alg && result ? "is-active" : ""}
                >
                  <th scope="row">{ALGORITHM_INFO[alg].name}</th>
                  <td>
                    {alg === "bfs"
                      ? "Fewest edges"
                      : alg === "dfs"
                      ? "Reachability"
                      : "Minimum weighted cost"}
                  </td>
                  <td>{result ? (result.found ? "Yes" : "No") : "—"}</td>
                  <td>{result ? formatPathCost(result.pathCost) : "—"}</td>
                  <td>{result ? (result.found ? result.pathLength : "—") : "—"}</td>
                  <td>{result ? result.expandedCount : "—"}</td>
                  <td>{result ? result.maxFrontierSize : "—"}</td>
                  <td>{result ? formatRuntime(result.executionTimeMs) : "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="replay-button"
                      disabled={!result}
                      onClick={() => onReplay(alg)}
                    >
                      Replay
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!hasResults && (
        <p className="comparison-empty">
          Run all to compare traversal objectives and path costs across graph algorithms.
        </p>
      )}
    </section>
  );
}
