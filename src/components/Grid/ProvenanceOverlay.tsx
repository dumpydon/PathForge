import type { FC } from "react";
import {
  buildSvgPathD,
  computeCellCenter,
  type ProvenanceTrace,
} from "./provenance";

interface ProvenanceOverlayProps {
  trace: ProvenanceTrace | null;
  boardWidth: number;
  boardHeight: number;
  rows: number;
  cols: number;
}

export const ProvenanceOverlay: FC<ProvenanceOverlayProps> = ({
  trace,
  boardWidth,
  boardHeight,
  rows,
  cols,
}) => {
  if (!trace || boardWidth <= 0 || boardHeight <= 0 || rows <= 0 || cols <= 0) {
    return null;
  }

  const { chain, hoveredCoordinate, color, metric } = trace;
  const hasMultipleNodes = chain.length >= 2;
  const pathD = hasMultipleNodes ? buildSvgPathD(chain, boardWidth, boardHeight, rows, cols) : "";

  const startPt = computeCellCenter(chain[0], boardWidth, boardHeight, rows, cols);
  const endPt = computeCellCenter(hoveredCoordinate, boardWidth, boardHeight, rows, cols);
  const cellHeight = (boardHeight - 1) / rows;
  const isNearTop = endPt.y < 38;

  const minChipMargin = Math.min(80, Math.max(32, Math.floor(boardWidth * 0.15)));
  const chipLeft = Math.max(minChipMargin, Math.min(boardWidth - minChipMargin, endPt.x));
  const chipTop = isNearTop
    ? endPt.y + cellHeight / 2 + 7
    : endPt.y - cellHeight / 2 - 7;

  return (
    <div className="provenance-overlay" aria-hidden="true">
      <svg
        className="provenance-svg-layer"
        width={boardWidth}
        height={boardHeight}
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      >
        <defs>
          <filter id="provenance-center-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.0" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {hasMultipleNodes && pathD && (
          <>
            {/* Luminous under-glow path (Search Energy accent) */}
            <path
              d={pathD}
              fill="none"
              stroke={color.accentHex}
              strokeWidth={4.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.28}
            />

            {/* Directional animated tracer flow (Search Energy colored trail, no moving white parts) */}
            <path
              d={pathD}
              fill="none"
              stroke={color.accentHex}
              strokeWidth={2.2}
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="provenance-trace-flow"
              style={{
                filter: "drop-shadow(0 0 3px rgba(0, 0, 0, 0.7))",
              }}
            />

            {/* Intermediate predecessor center circular dots with glowing halo */}
            {chain.slice(1, -1).map((coord, idx) => {
              const pt = computeCellCenter(coord, boardWidth, boardHeight, rows, cols);
              return (
                <g key={`prov-node-${idx}-${coord.row}-${coord.col}`} className="provenance-center-dot-group">
                  {/* Soft white halo around center circular dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={3.2}
                    fill="#ffffff"
                    opacity={0.38}
                    filter="url(#provenance-center-glow)"
                    className="provenance-center-dot-halo"
                  />
                  {/* Crisp white center circular dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={2.2}
                    fill="#f0f6fc"
                    opacity={0.95}
                    className="provenance-center-dot-core"
                    style={{
                      filter: "drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.8))",
                    }}
                  />
                </g>
              );
            })}

            {/* Start node anchor ring */}
            <circle
              cx={startPt.x}
              cy={startPt.y}
              r={4.5}
              fill="none"
              stroke="#3fb950"
              strokeWidth={1.8}
            />
            <circle cx={startPt.x} cy={startPt.y} r={2} fill="#3fb950" />
          </>
        )}

        {/* Hovered cell target ring */}
        <circle
          cx={endPt.x}
          cy={endPt.y}
          r={5.5}
          fill="none"
          stroke={color.accentHex}
          strokeWidth={1.8}
          className="provenance-target-halo"
        />
        <circle cx={endPt.x} cy={endPt.y} r={2.2} fill={color.accentHex} />
      </svg>

      {/* Floating algorithm-aware metric chip */}
      <div
        className={`provenance-metric-chip ${isNearTop ? "is-below" : "is-above"}`}
        style={{
          left: `${chipLeft}px`,
          top: `${chipTop}px`,
          ["--chip-color" as string]: color.accentHex,
          ["--chip-glow" as string]: color.glow,
        }}
      >
        <span className="chip-dot" />
        <span className="chip-name">{metric.name}:</span>
        <span className="chip-value">{metric.badgeLabel}</span>
      </div>
    </div>
  );
};
