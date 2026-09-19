"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { isCustomTerrain, terrainAt, terrainKind } from "../../core/grid";
import type { AlgorithmId, SearchResult } from "../../algorithms/types";
import { coordinateKey, coordinatesEqual, type Coordinate, type Grid } from "../../core/types";
import type { PlaybackSnapshot } from "../../playback/types";
import { GridLegend } from "./GridLegend";
import { extractProvenanceTrace } from "./provenance";
import { ProvenanceOverlay } from "./ProvenanceOverlay";
import { getSearchStateColor, type SearchVisualBounds } from "./searchEnergy";
import { customTerrainColor } from "./terrainPresentation";

export type PaintTool = "wall" | "mud" | "water" | "custom" | "erase";

interface GridBoardProps {
  grid: Grid;
  snapshot: PlaybackSnapshot;
  customTerrainCost: number;
  selectedCoordinate: Coordinate | null;
  algorithm?: AlgorithmId;
  searchBounds?: SearchVisualBounds | null;
  hasResult?: boolean;
  isComplete?: boolean;
  cursor?: number;
  activeResult?: SearchResult | null;
  onInspect: (coordinate: Coordinate) => void;
  onPaint: (coordinate: Coordinate) => void;
  onMoveEndpoint: (endpoint: "start" | "target", coordinate: Coordinate) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

type DragMode = "paint" | "start" | "target" | null;

export function GridBoard({
  grid,
  snapshot,
  customTerrainCost,
  selectedCoordinate,
  algorithm,
  searchBounds,
  hasResult = false,
  isComplete = false,
  cursor = 0,
  activeResult = null,
  onInspect,
  onPaint,
  onMoveEndpoint,
  onInteractionStart,
  onInteractionEnd,
}: GridBoardProps) {
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [hoveredCoordinate, setHoveredCoordinate] = useState<Coordinate | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardDimensions, setBoardDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const activeBounds: SearchVisualBounds = useMemo(() => {
    return (
      searchBounds ?? {
        algorithm: algorithm ?? "bfs",
        maxLevel: 1,
        maxCost: 1,
        maxDepth: 1,
        maxF: 1,
      }
    );
  }, [searchBounds, algorithm]);

  useEffect(() => {
    const element = boardRef.current;
    if (!element) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setBoardDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(element);
    return () => ro.disconnect();
  }, []);

  const provenanceTrace = useMemo(() => {
    if (!hoveredCoordinate || dragMode !== null) return null;
    return extractProvenanceTrace(
      hoveredCoordinate,
      snapshot,
      grid,
      algorithm ?? "bfs",
      activeBounds,
    );
  }, [hoveredCoordinate, dragMode, snapshot, grid, algorithm, activeBounds]);

  useEffect(() => {
    const stopDragging = () => {
      setDragMode((currentMode) => {
        if (currentMode !== null) {
          onInteractionEnd?.();
        }
        return null;
      });
    };
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [onInteractionEnd]);

  const beginInteraction = (event: PointerEvent, coordinate: Coordinate): void => {
    event.preventDefault();
    setHoveredCoordinate(null);
    onInteractionStart?.();
    onInspect(coordinate);
    if (coordinatesEqual(coordinate, grid.start)) {
      setDragMode("start");
    } else if (coordinatesEqual(coordinate, grid.target)) {
      setDragMode("target");
    } else {
      setDragMode("paint");
      onPaint(coordinate);
    }
  };

  const continueInteraction = (coordinate: Coordinate): void => {
    if (dragMode === "paint") onPaint(coordinate);
    if (dragMode === "start" || dragMode === "target") {
      onMoveEndpoint(dragMode, coordinate);
      onInspect(coordinate);
    }
  };

  return (
    <div className="grid-frame">
      <div
        ref={boardRef}
        className={[
          "grid-board",
          dragMode === "start" || dragMode === "target" ? "is-dragging-endpoint" : "",
          isComplete ? "is-complete" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ "--grid-cols": grid.cols } as CSSProperties}
        role="grid"
        aria-label={`${grid.rows} by ${grid.cols} pathfinding grid`}
        onPointerLeave={() => setHoveredCoordinate(null)}
      >
        {grid.terrain.map((_, index) => {
          const coordinate = { row: Math.floor(index / grid.cols), col: index % grid.cols };
          const key = coordinateKey(coordinate);
          const terrain = terrainAt(grid, coordinate);
          const kind = terrainKind(terrain);
          const playbackNode = snapshot.nodes.get(key);
          const isStart = coordinatesEqual(coordinate, grid.start);
          const isTarget = coordinatesEqual(coordinate, grid.target);
          const isSelected = selectedCoordinate
            ? coordinatesEqual(coordinate, selectedCoordinate)
            : false;
          const endpointLabel = isStart && isTarget ? "ST" : isStart ? "S" : isTarget ? "T" : "";
          const stateLabel = playbackNode?.state ? `, ${playbackNode.state}` : "";
          const isFrontier = playbackNode?.state === "frontier";
          let cellStyle: CSSProperties | undefined = undefined;

          const isHoveredProvenance = Boolean(
            provenanceTrace && coordinatesEqual(coordinate, provenanceTrace.hoveredCoordinate),
          );

          if (isFrontier) {
            const energy = getSearchStateColor(algorithm ?? "bfs", playbackNode, activeBounds);
            cellStyle = {
              "--cell-frontier-bg": energy.background,
              "--cell-frontier-border": energy.border,
              "--cell-frontier-glow": energy.glow,
            } as CSSProperties;
          } else if (isCustomTerrain(terrain) && !playbackNode) {
            cellStyle = { backgroundColor: customTerrainColor(terrain.cost) };
          }

          return (
            <button
              key={key}
              type="button"
              className={[
                "grid-cell",
                `terrain-${kind}`,
                playbackNode ? `search-${playbackNode.state}` : "",
                isStart ? "is-start" : "",
                isTarget ? "is-target" : "",
                isSelected ? "is-selected" : "",
                isHoveredProvenance ? "is-provenance-hovered" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="gridcell"
              style={cellStyle}
              aria-label={`Row ${coordinate.row + 1}, column ${coordinate.col + 1}, ${
                isCustomTerrain(terrain) ? `custom terrain, cost ${terrain.cost}` : terrain
              }${stateLabel}${
                endpointLabel ? `, ${endpointLabel === "S" ? "start" : endpointLabel === "T" ? "target" : "start and target"}` : ""
              }`}
              onPointerDown={(event) => beginInteraction(event, coordinate)}
              onPointerEnter={() => {
                if (dragMode === null) {
                  setHoveredCoordinate(coordinate);
                } else {
                  continueInteraction(coordinate);
                }
              }}
              onDoubleClick={() => onInspect(coordinate)}
            >
              {endpointLabel && <span className="endpoint-label">{endpointLabel}</span>}
            </button>
          );
        })}
        <ProvenanceOverlay
          trace={provenanceTrace}
          boardWidth={boardDimensions.width}
          boardHeight={boardDimensions.height}
          rows={grid.rows}
          cols={grid.cols}
        />
      </div>
      <GridLegend
        customTerrainCost={customTerrainCost}
        algorithm={algorithm}
        searchBounds={searchBounds}
        hasResult={hasResult}
        cursor={cursor}
        activeResult={activeResult}
      />
    </div>
  );
}
