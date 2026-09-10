"use client";

import { useEffect, useState, type CSSProperties, type PointerEvent } from "react";
import { isCustomTerrain, terrainAt, terrainKind } from "../../core/grid";
import { coordinateKey, coordinatesEqual, type Coordinate, type Grid } from "../../core/types";
import type { PlaybackSnapshot } from "../../playback/types";
import { GridLegend } from "./GridLegend";
import { customTerrainColor } from "./terrainPresentation";

export type PaintTool = "wall" | "mud" | "water" | "custom" | "erase";

interface GridBoardProps {
  grid: Grid;
  snapshot: PlaybackSnapshot;
  customTerrainCost: number;
  selectedCoordinate: Coordinate | null;
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
  onInspect,
  onPaint,
  onMoveEndpoint,
  onInteractionStart,
  onInteractionEnd,
}: GridBoardProps) {
  const [dragMode, setDragMode] = useState<DragMode>(null);

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
        className={[
          "grid-board",
          dragMode === "start" || dragMode === "target" ? "is-dragging-endpoint" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ "--grid-cols": grid.cols } as CSSProperties}
        role="grid"
        aria-label={`${grid.rows} by ${grid.cols} pathfinding grid`}
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
              ]
                .filter(Boolean)
                .join(" ")}
              role="gridcell"
              style={isCustomTerrain(terrain)
                ? { backgroundColor: customTerrainColor(terrain.cost) }
                : undefined}
              aria-label={`Row ${coordinate.row + 1}, column ${coordinate.col + 1}, ${
                isCustomTerrain(terrain) ? `custom terrain, cost ${terrain.cost}` : terrain
              }${stateLabel}${
                endpointLabel ? `, ${endpointLabel === "S" ? "start" : endpointLabel === "T" ? "target" : "start and target"}` : ""
              }`}
              onPointerDown={(event) => beginInteraction(event, coordinate)}
              onPointerEnter={() => continueInteraction(coordinate)}
              onDoubleClick={() => onInspect(coordinate)}
            >
              {endpointLabel && <span className="endpoint-label">{endpointLabel}</span>}
            </button>
          );
        })}
      </div>
      <GridLegend customTerrainCost={customTerrainCost} />
    </div>
  );
}
