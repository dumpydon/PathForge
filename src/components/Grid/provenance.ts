import type { AlgorithmId } from "../../algorithms/types";
import { coordinateKey, type Coordinate, type Grid } from "../../core/types";
import type { PlaybackNode, PlaybackSnapshot } from "../../playback/types";
import {
  getSearchStateColor,
  type SearchStateColor,
  type SearchVisualBounds,
} from "./searchEnergy";

export interface ProvenanceMetricInfo {
  name: string;
  value: number;
  badgeLabel: string;
  details: string;
}

export interface ProvenanceTrace {
  hoveredCoordinate: Coordinate;
  chain: Coordinate[];
  algorithm: AlgorithmId;
  metric: ProvenanceMetricInfo;
  color: SearchStateColor;
}

/**
 * Formats algorithm-specific metric details for the hovered frontier node.
 */
export function formatProvenanceMetric(
  algorithm: AlgorithmId,
  node: PlaybackNode,
): ProvenanceMetricInfo {
  switch (algorithm) {
    case "bfs": {
      const level = node.level ?? 0;
      return {
        name: "BFS level",
        value: level,
        badgeLabel: `Level ${level}`,
        details: `Distance from Start: ${level}`,
      };
    }
    case "dfs": {
      const depth = node.level ?? 0;
      return {
        name: "Search depth",
        value: depth,
        badgeLabel: `Depth ${depth}`,
        details: `Search-tree depth: ${depth}`,
      };
    }
    case "dijkstra": {
      const g = node.g ?? 0;
      const gDisplay = Number.isInteger(g) ? `${g}` : g.toFixed(1);
      return {
        name: "Path cost",
        value: g,
        badgeLabel: `Cost ${gDisplay}`,
        details: `Accumulated cost g(n): ${gDisplay}`,
      };
    }
    case "astar": {
      const g = node.g ?? 0;
      const h = node.h ?? 0;
      const f = node.f ?? g + h;
      const progress = g + h > 0 ? g / (g + h) : 1;
      const pct = Math.round(progress * 100);
      const gDisplay = Number.isInteger(g) ? `${g}` : g.toFixed(1);
      const fDisplay = Number.isInteger(f) ? `${f}` : f.toFixed(1);
      return {
        name: "Goal progress",
        value: progress,
        badgeLabel: `g: ${gDisplay} · f: ${fDisplay} (${pct}%)`,
        details: `Cost: ${gDisplay}, Heuristic: ${h.toFixed(1)}, Total: ${fDisplay}`,
      };
    }
  }
}

/**
 * Extracts the authentic predecessor provenance chain and metadata
 * for a hovered coordinate at the current playback snapshot.
 * Returns null if the coordinate is not an active frontier cell.
 */
export function extractProvenanceTrace(
  coordinate: Coordinate | null | undefined,
  snapshot: PlaybackSnapshot | null | undefined,
  grid: Grid,
  algorithm: AlgorithmId = "bfs",
  bounds: SearchVisualBounds,
): ProvenanceTrace | null {
  if (!coordinate || !snapshot) {
    return null;
  }

  const key = coordinateKey(coordinate);
  const targetNode = snapshot.nodes.get(key);

  // Provenance trace is active for frontier cells and currently expanding node
  if (!targetNode || (targetNode.state !== "frontier" && targetNode.state !== "current")) {
    return null;
  }

  const chain: Coordinate[] = [coordinate];
  const visited = new Set<string>([key]);
  let currentCoord = coordinate;
  const maxChainLength = grid.rows * grid.cols;

  while (chain.length < maxChainLength) {
    const currentKey = coordinateKey(currentCoord);
    const node = snapshot.nodes.get(currentKey);
    if (!node || !node.parent) {
      break;
    }

    const parentCoord = node.parent;
    const parentKey = coordinateKey(parentCoord);

    // Defensive cycle prevention
    if (visited.has(parentKey)) {
      break;
    }

    visited.add(parentKey);
    chain.unshift(parentCoord);
    currentCoord = parentCoord;
  }

  const metric = formatProvenanceMetric(algorithm, targetNode);
  const color = getSearchStateColor(algorithm, targetNode, bounds);

  return {
    hoveredCoordinate: coordinate,
    chain,
    algorithm,
    metric,
    color,
  };
}

/**
 * Calculates sub-pixel exact cell center in screen/SVG board pixels.
 * Uses exact CSS grid layout pitch with 1px border and 1px gap:
 *   pitch_x = (W - 1) / cols
 *   center_x = 0.5 + (c + 0.5) * pitch_x
 */
export function computeCellCenter(
  coordinate: Coordinate,
  boardWidth: number,
  boardHeight: number,
  rows: number,
  cols: number,
): { x: number; y: number } {
  if (boardWidth <= 0 || boardHeight <= 0 || rows <= 0 || cols <= 0) {
    return { x: 0, y: 0 };
  }

  const pitchX = (boardWidth - 1) / cols;
  const pitchY = (boardHeight - 1) / rows;

  return {
    x: 0.5 + (coordinate.col + 0.5) * pitchX,
    y: 0.5 + (coordinate.row + 0.5) * pitchY,
  };
}

/**
 * Generates continuous SVG path 'd' string connecting cell centers.
 * Handles both 4-way orthogonal and 8-way diagonal steps seamlessly.
 */
export function buildSvgPathD(
  chain: readonly Coordinate[],
  boardWidth: number,
  boardHeight: number,
  rows: number,
  cols: number,
): string {
  if (chain.length < 2 || boardWidth <= 0 || boardHeight <= 0) {
    return "";
  }

  const points = chain.map((coord) =>
    computeCellCenter(coord, boardWidth, boardHeight, rows, cols),
  );

  return points
    .map((pt, index) => `${index === 0 ? "M" : "L"} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
    .join(" ");
}
