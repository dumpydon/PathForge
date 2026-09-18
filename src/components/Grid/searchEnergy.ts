import type { AlgorithmId, NodeSearchValues, SearchResult } from "../../algorithms/types";
import type { PlaybackNode } from "../../playback/types";

export interface SearchVisualBounds {
  algorithm: AlgorithmId;
  maxLevel: number;
  maxCost: number;
  maxDepth: number;
  maxF: number;
}

export interface SearchStateColor {
  /** Normalized progress in [0, 1] */
  progress: number;
  /** Primary accent color in hex format (e.g. #22d3ee) */
  accentHex: string;
  /** CSS background fill (rich translucent tint on dark canvas) */
  background: string;
  /** CSS luminous border stroke */
  border: string;
  /** CSS glow shadow color */
  glow: string;
  /** Extracted raw metric value */
  metricValue: number;
  /** Human-readable metric label (e.g. "Level 6", "Cost 15", "Depth 24", "Progress 75%") */
  metricLabel: string;
}

interface ColorStop {
  t: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Shared PathForge search spectrum:
 * 0.00: Cyan (#22d3ee)
 * 0.25: Teal (#2dd4bf)
 * 0.50: Lime (#84cc16)
 * 0.75: Amber / Gold (#f59e0b)
 * 1.00: Coral Orange (#f97316)
 */
const PALETTE_STOPS: readonly ColorStop[] = [
  { t: 0.0, r: 34, g: 211, b: 238 }, // #22d3ee Cyan
  { t: 0.25, r: 45, g: 212, b: 191 }, // #2dd4bf Teal
  { t: 0.5, r: 132, g: 204, b: 22 }, // #84cc16 Lime
  { t: 0.75, r: 245, g: 158, b: 11 }, // #f59e0b Gold/Amber
  { t: 1.0, r: 249, g: 115, b: 22 }, // #f97316 Coral Orange
] as const;

function interpolateRgb(t: number): { r: number; g: number; b: number } {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < PALETTE_STOPS.length - 1; i++) {
    const s0 = PALETTE_STOPS[i];
    const s1 = PALETTE_STOPS[i + 1];
    if (clamped >= s0.t && clamped <= s1.t) {
      const local = (clamped - s0.t) / (s1.t - s0.t);
      return {
        r: Math.round(s0.r + (s1.r - s0.r) * local),
        g: Math.round(s0.g + (s1.g - s0.g) * local),
        b: Math.round(s0.b + (s1.b - s0.b) * local),
      };
    }
  }
  const last = PALETTE_STOPS[PALETTE_STOPS.length - 1];
  return { r: last.r, g: last.g, b: last.b };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Computes run-level bounds from a completed SearchResult.
 * Guaranteed immutable throughout playback and scrubbing.
 */
export function computeSearchVisualBounds(
  result: SearchResult | null | undefined,
): SearchVisualBounds {
  if (!result || !result.events || result.events.length === 0) {
    return {
      algorithm: result?.algorithm ?? "bfs",
      maxLevel: 1,
      maxCost: 1,
      maxDepth: 1,
      maxF: 1,
    };
  }

  let maxLevel = 0;
  let maxCost = 0;
  let maxDepth = 0;
  let maxF = 0;

  for (const event of result.events) {
    if ("values" in event && event.values) {
      const v = event.values;
      if (typeof v.level === "number" && v.level > maxLevel) {
        maxLevel = v.level;
      }
      if (typeof v.g === "number" && v.g > maxCost) {
        maxCost = v.g;
      }
      if (typeof v.f === "number" && v.f > maxF) {
        maxF = v.f;
      }
    }
  }

  if (result.algorithm === "dfs") {
    maxDepth = maxLevel;
  }

  return {
    algorithm: result.algorithm,
    maxLevel: Math.max(1, maxLevel),
    maxCost: Math.max(1, maxCost),
    maxDepth: Math.max(1, maxDepth),
    maxF: Math.max(1, maxF),
  };
}

/**
 * Extracts the algorithm-specific raw metric from a node or event values:
 * - BFS: level (unweighted graph distance from Start)
 * - DFS: depth / level (branch depth in traversal tree)
 * - Dijkstra: g (accumulated shortest path cost)
 * - A*: path completion ratio g / (g + h)
 */
export function getSearchVisualMetric(
  algorithm: AlgorithmId,
  values: NodeSearchValues | undefined | null,
): { value: number; label: string } {
  if (!values) {
    return { value: 0, label: "0" };
  }

  switch (algorithm) {
    case "bfs": {
      const level = values.level ?? 0;
      return { value: level, label: `Level ${level}` };
    }
    case "dfs": {
      const depth = values.level ?? 0;
      return { value: depth, label: `Depth ${depth}` };
    }
    case "dijkstra": {
      const g = values.g ?? 0;
      return { value: g, label: `Cost ${g}` };
    }
    case "astar": {
      const g = values.g ?? 0;
      const h = values.h ?? 0;
      const ratio = g + h > 0 ? g / (g + h) : 1;
      return { value: ratio, label: `Progress ${Math.round(ratio * 100)}%` };
    }
  }
}

/**
 * Normalizes an algorithm metric into a stable [0, 1] progress value using the run bounds.
 */
export function normalizeSearchMetric(
  algorithm: AlgorithmId,
  metricValue: number,
  bounds: SearchVisualBounds,
  values?: NodeSearchValues | null,
): number {
  switch (algorithm) {
    case "bfs": {
      const max = bounds.maxLevel > 0 ? bounds.maxLevel : 1;
      return Math.max(0, Math.min(1, metricValue / max));
    }
    case "dfs": {
      const max = bounds.maxDepth > 0 ? bounds.maxDepth : 1;
      return Math.max(0, Math.min(1, metricValue / max));
    }
    case "dijkstra": {
      const max = bounds.maxCost > 0 ? bounds.maxCost : 1;
      return Math.max(0, Math.min(1, metricValue / max));
    }
    case "astar": {
      if (values) {
        const g = values.g ?? 0;
        const h = values.h ?? 0;
        if (g + h <= 0) return 1;
        return Math.max(0, Math.min(1, g / (g + h)));
      }
      return Math.max(0, Math.min(1, metricValue));
    }
  }
}

// Memoization cache for computed color representations
const colorCache = new Map<string, SearchStateColor>();

/**
 * Maps an algorithm and node's search values to its complete SearchStateColor.
 * Pure, deterministic, and easily consumable by both grid cells and future queue/stack/heap panels.
 */
export function getSearchStateColor(
  algorithm: AlgorithmId,
  nodeOrValues: NodeSearchValues | PlaybackNode | undefined | null,
  bounds: SearchVisualBounds,
): SearchStateColor {
  const metric = getSearchVisualMetric(algorithm, nodeOrValues);
  const progress = normalizeSearchMetric(algorithm, metric.value, bounds, nodeOrValues);

  // Quantize progress to 3 decimal places for efficient caching and stable renders
  const quantized = Math.round(progress * 1000) / 1000;
  const cacheKey = `${algorithm}:${metric.label}:${quantized}`;

  const cached = colorCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rgb = interpolateRgb(quantized);
  const accentHex = rgbToHex(rgb.r, rgb.g, rgb.b);

  // Luminous border: slightly brighter edge highlighting the perimeter
  const borderR = Math.min(255, Math.round(0.82 * rgb.r + 0.18 * 255));
  const borderG = Math.min(255, Math.round(0.82 * rgb.g + 0.18 * 255));
  const borderB = Math.min(255, Math.round(0.82 * rgb.b + 0.18 * 255));
  const border = rgbToHex(borderR, borderG, borderB);

  // Background: rich translucent tint on top of PathForge dark canvas
  const background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;

  // Subtle outer glow
  const glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;

  const result: SearchStateColor = {
    progress: quantized,
    accentHex,
    background,
    border,
    glow,
    metricValue: metric.value,
    metricLabel: metric.label,
  };

  colorCache.set(cacheKey, result);
  return result;
}
