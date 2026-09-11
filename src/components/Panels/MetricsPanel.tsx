export interface MetricSummaryResult {
  found: boolean;
  pathCost: number | null;
  pathLength: number;
  discoveredCount: number;
  expandedCount: number;
  maxFrontierSize: number;
  executionTimeMs: number;
}

interface MetricsPanelProps {
  result: MetricSummaryResult | null;
  frontierSize: number;
  visitedCount?: number;
  stepIndex?: number;
  totalSteps?: number;
  isComplete?: boolean;
  isPlaying?: boolean;
  playbackEnabled: boolean;
  statusRevealToken: number;
}

function formatRuntime(milliseconds: number): string {
  if (milliseconds < 0.01) return "<0.01 ms";
  if (milliseconds < 10) return `${milliseconds.toFixed(2)} ms`;
  return `${milliseconds.toFixed(1)} ms`;
}

function formatPathCost(cost: number | null): string {
  if (cost === null) return "—";
  const nearestInteger = Math.round(cost);
  if (Math.abs(cost - nearestInteger) < 1e-9) return String(nearestInteger);
  return cost.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function MetricsPanel({
  result,
  frontierSize,
  visitedCount,
  stepIndex,
  totalSteps,
  isComplete,
  isPlaying,
  playbackEnabled,
  statusRevealToken,
}: MetricsPanelProps) {
  let badgeText = "";
  let badgeClass = "";

  if (result) {
    if (!playbackEnabled || isComplete) {
      badgeText = result.found ? "Path Found" : "No Path Found";
      badgeClass = result.found ? "status-found" : "status-missing";
    } else if (isPlaying) {
      badgeText = "Searching…";
      badgeClass = "status-running";
    } else if (stepIndex !== undefined && totalSteps !== undefined) {
      badgeText = `Step ${stepIndex} / ${totalSteps}`;
      badgeClass = "status-paused";
    }
  }

  return (
    <section className="panel-section metrics-panel">
      <div className="section-heading compact-heading">
        <h2>Run metrics</h2>
        {result && (
          <span
            key={`${statusRevealToken}-${badgeText}`}
            className={`status-badge metrics-status ${badgeClass}`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {result ? (
        <dl className="metric-grid">
          <div><dt>Path cost</dt><dd>{formatPathCost(result.pathCost)}</dd></div>
          <div><dt>Path steps</dt><dd>{result.found ? result.pathLength : "—"}</dd></div>
          <div><dt>Discovered</dt><dd>{result.discoveredCount}</dd></div>
          <div><dt>Expanded</dt><dd>{result.expandedCount}</dd></div>
          <div><dt>Max frontier</dt><dd>{result.maxFrontierSize}</dd></div>
          <div><dt>Execution</dt><dd>{formatRuntime(result.executionTimeMs)}</dd></div>
        </dl>
      ) : (
        <p className="empty-copy">Run an algorithm to populate structural metrics.</p>
      )}

      <div className="live-metrics-row">
        <div className="live-frontier">
          <span>{playbackEnabled ? "Live frontier" : "Playback events"}</span>
          <strong>{playbackEnabled ? frontierSize : "Not recorded"}</strong>
        </div>
        {playbackEnabled && visitedCount !== undefined && (
          <div className="live-frontier">
            <span>Live visited</span>
            <strong>{visitedCount}</strong>
          </div>
        )}
      </div>
    </section>
  );
}

export { formatPathCost, formatRuntime };
