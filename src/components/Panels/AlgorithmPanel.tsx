import type { AlgorithmId, HeuristicName } from "../../algorithms/types";
import { HEURISTIC_LABELS } from "../../algorithms/heuristics";
import type { MovementMode } from "../../core/types";
import { ALGORITHM_INFO } from "../../data/algorithmInfo";

interface AlgorithmPanelProps {
  algorithm: AlgorithmId;
  heuristic: HeuristicName;
  movementMode: MovementMode;
}

export function AlgorithmPanel({ algorithm, heuristic, movementMode }: AlgorithmPanelProps) {
  const info = ALGORITHM_INFO[algorithm];

  return (
    <section className="panel-section algorithm-panel">
      <div className="section-heading">
        <h2>{info.name}</h2>
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
        <div className="formula-block">
          <code>f(n) = g(n) + h(n)</code>
          <span>{HEURISTIC_LABELS[heuristic]} · {movementMode} movement</span>
          <dl>
            <div><dt>g</dt><dd>accumulated movement cost</dd></div>
            <div><dt>h</dt><dd>estimated remaining distance</dd></div>
            <div><dt>f</dt><dd>frontier priority</dd></div>
          </dl>
        </div>
      )}
    </section>
  );
}
