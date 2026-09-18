import type { AlgorithmId, SearchResult } from "../../algorithms/types";
import {
  getCurrentSearchTelemetry,
  getSearchEnergyScaleConfig,
  SEARCH_ENERGY_GRADIENT,
  type SearchVisualBounds,
} from "./searchEnergy";

interface GridLegendProps {
  customTerrainCost: number;
  algorithm?: AlgorithmId;
  searchBounds?: SearchVisualBounds | null;
  hasResult?: boolean;
  cursor?: number;
  activeResult?: SearchResult | null;
}

export function GridLegend({
  customTerrainCost,
  algorithm,
  searchBounds,
  hasResult = false,
  cursor = 0,
  activeResult = null,
}: GridLegendProps) {
  const scale = algorithm
    ? getSearchEnergyScaleConfig(algorithm, searchBounds, hasResult)
    : null;

  const telemetry = algorithm
    ? getCurrentSearchTelemetry(algorithm, activeResult, cursor, searchBounds)
    : null;

  const hasLiveTelemetry =
    hasResult &&
    telemetry !== null &&
    telemetry.normalizedProgress !== null &&
    telemetry.color !== null;

  const progress = hasLiveTelemetry ? telemetry.normalizedProgress! : 0;

  return (
    <div className="grid-legend" aria-label="Grid legend">
      <div className="legend-swatches">
        <span><i className="legend-swatch swatch-start">S</i>Start</span>
        <span><i className="legend-swatch swatch-target">T</i>Target</span>
        <span><i className="legend-swatch swatch-frontier" />Frontier</span>
        <span><i className="legend-swatch swatch-closed" />Closed</span>
        <span><i className="legend-swatch swatch-path" />Path</span>
        <span><i className="legend-swatch swatch-mud" />Mud 3</span>
        <span><i className="legend-swatch swatch-water" />Water 5</span>
        <span><i className="legend-swatch swatch-custom" />Custom {customTerrainCost}</span>
        <span><i className="legend-swatch swatch-wall" />Wall</span>
      </div>

      {scale && (
        <div
          className={`search-energy-scale${scale.hasActiveBounds ? " is-active" : " is-idle"}${
            hasLiveTelemetry ? " is-telemetry-active" : ""
          }`}
          title={scale.tooltip}
          aria-label={
            hasLiveTelemetry && telemetry
              ? `Current ${scale.label}: ${telemetry.displayValue}. Scale range: ${scale.minLabel} to ${scale.maxLabel}. ${scale.tooltip}`
              : `${scale.label} scale: ${scale.minLabel} to ${scale.maxLabel}. ${scale.tooltip}`
          }
        >
          <span className="scale-label">{scale.label}</span>
          <span className="scale-bound">{scale.minLabel}</span>
          <div className="scale-track-container" aria-hidden="true">
            <div className="scale-track">
              <div
                className="scale-gradient"
                style={{ background: SEARCH_ENERGY_GRADIENT }}
              />
            </div>
            {hasLiveTelemetry && telemetry && telemetry.color && (
              <div
                className="scale-marker"
                data-testid="search-energy-marker"
                style={{
                  left: `${progress * 100}%`,
                  ["--marker-color" as string]: telemetry.color.accentHex,
                  ["--marker-glow" as string]: telemetry.color.glow,
                }}
              >
                <div className="scale-marker-notch" />
                <div className="scale-marker-stem" />
                <span
                  className="scale-marker-value"
                  style={{
                    transform: `translateX(-${progress * 100}%)`,
                  }}
                >
                  {telemetry.displayValue}
                </span>
              </div>
            )}
          </div>
          <span className="scale-bound">{scale.maxLabel}</span>
        </div>
      )}
    </div>
  );
}
