import type { AlgorithmId, HeuristicName } from "../../algorithms/types";
import type { MovementMode } from "../../core/types";
import { ALGORITHM_INFO } from "../../data/algorithmInfo";

interface AlgorithmPanelProps {
  algorithm: AlgorithmId;
  heuristic: HeuristicName;
  movementMode: MovementMode;
}

interface HeuristicExplanation {
  title: string;
  description: string;
}

const HEURISTIC_EXPLANATIONS: Record<HeuristicName, HeuristicExplanation> = {
  manhattan: {
    title: "Manhattan distance",
    description:
      "A* estimates how far each node is from the target using horizontal and vertical movement.",
  },
  euclidean: {
    title: "Euclidean distance",
    description:
      "A* estimates how far each node is from the target using straight-line distance.",
  },
  octile: {
    title: "Octile distance",
    description:
      "A* estimates how far each node is from the target allowing diagonal and straight movement.",
  },
  zero: {
    title: "Zero heuristic",
    description:
      "A* treats remaining distance as zero, exploring equally in all directions like Dijkstra.",
  },
};

export function AlgorithmPanel({ algorithm, heuristic }: AlgorithmPanelProps) {
  const info = ALGORITHM_INFO[algorithm];
  const heading = info.heading ?? (algorithm === "astar" ? "A* Search" : info.name);
  const currentHeuristic = HEURISTIC_EXPLANATIONS[heuristic] ?? HEURISTIC_EXPLANATIONS.manhattan;

  return (
    <section className="panel-section algorithm-panel">
      <div className="section-heading">
        <h2>{heading}</h2>
        <span className="algorithm-chip">{info.structure}</span>
      </div>
      <p className="technical-summary">
        {info.summaryHighlight && info.summary.includes(info.summaryHighlight) ? (
          <>
            {info.summary.slice(0, info.summary.indexOf(info.summaryHighlight))}
            <span className="summary-highlight">{info.summaryHighlight}</span>
            {info.summary.slice(info.summary.indexOf(info.summaryHighlight) + info.summaryHighlight.length)}
          </>
        ) : (
          info.summary
        )}
      </p>
      <dl className="definition-grid">
        <div>
          <dt>Time</dt>
          <dd title={info.timeNote}>{info.time}</dd>
          {info.timeNote && <span className="definition-note">{info.timeNote}</span>}
        </div>
        <div>
          <dt>Space</dt>
          <dd title={info.spaceNote}>{info.space}</dd>
          {info.spaceNote && <span className="definition-note">{info.spaceNote}</span>}
        </div>
        <div className="definition-wide"><dt>{info.guaranteeLabel}</dt><dd>{info.guaranteeValue}</dd></div>
      </dl>
      {algorithm === "astar" && (
        <div className="astar-section">
          <h3 className="astar-title">How A* chooses</h3>
          <div className="astar-heuristic-flow">
            <span className="astar-heuristic-title">{currentHeuristic.title}</span>
            <p className="astar-heuristic-desc">{currentHeuristic.description}</p>
            <p className="astar-decision-desc">
              A* combines the cost already travelled with this estimated distance to decide which node to explore next.
            </p>
          </div>

          <div className="astar-diagram" aria-label="f = g + h formula diagram">
            <div className="astar-formula-row">
              <span className="astar-formula-sym">f</span>
              <span className="astar-formula-op">=</span>
              <span className="astar-formula-sym">g</span>
              <span className="astar-formula-op">+</span>
              <span className="astar-formula-sym">h</span>
            </div>

            <div className="astar-connectors">
              <svg className="astar-connector-svg" width={72} height={72} viewBox="0 0 72 72" fill="none" aria-hidden="true">
                <path d="M 61 0 L 61 8 Q 61 12 65 12 L 70 12" />
                <path d="M 34 0 L 34 32 Q 34 36 38 36 L 70 36" />
                <path d="M 7 0 L 7 56 Q 7 60 11 60 L 70 60" />
              </svg>

              <div className="astar-def-list">
                <div className="astar-def-row">
                  <span className="astar-def-var">h</span>
                  <span className="astar-def-dash">—</span>
                  <span className="astar-def-label">Estimated cost to target</span>
                </div>
                <div className="astar-def-row">
                  <span className="astar-def-var">g</span>
                  <span className="astar-def-dash">—</span>
                  <span className="astar-def-label">Cost travelled from start</span>
                </div>
                <div className="astar-def-row">
                  <span className="astar-def-var">f</span>
                  <span className="astar-def-dash">—</span>
                  <span className="astar-def-label">Total score used to choose next</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
