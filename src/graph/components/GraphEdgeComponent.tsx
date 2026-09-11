"use client";

import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useViewport,
  type EdgeProps,
} from "@xyflow/react";
import { isValidEdgeWeight } from "../domain/validation";
import type { GraphPlaybackEdgeState } from "../playback/types";

export interface GraphEdgeData extends Record<string, unknown> {
  edgeId: string;
  weight: number;
  directed: boolean;
  playbackState?: GraphPlaybackEdgeState;
  onSelectEdge?: (edgeId: string) => void;
  onUpdateEdgeWeight?: (edgeId: string, weight: number) => void;
}

export const GraphEdgeComponent = memo(function GraphEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const edgeData = data as unknown as GraphEdgeData | undefined;
  const weight = edgeData?.weight ?? 1;
  const directed = edgeData?.directed ?? false;
  const playbackState = edgeData?.playbackState ?? "default";

  const [prevWeight, setPrevWeight] = useState(weight);
  const [isEditing, setIsEditing] = useState(false);
  const [draftWeight, setDraftWeight] = useState(String(weight));

  if (prevWeight !== weight && !isEditing) {
    setPrevWeight(weight);
    setDraftWeight(String(weight));
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { zoom } = useViewport();
  const isZoomedOut = zoom < 0.6 && !selected && playbackState === "default";
  const zoomClass = isZoomedOut ? "is-zoomed-out" : "";

  const stateClass = playbackState !== "default" ? `is-edge-${playbackState}` : "";
  const selectedClass = selected ? "is-selected" : "";
  const markerId = directed
    ? playbackState === "path"
      ? "pf-arrow-path"
      : playbackState === "relaxed"
      ? "pf-arrow-relaxed"
      : playbackState === "examined"
      ? "pf-arrow-examined"
      : selected
      ? "pf-arrow-selected"
      : "pf-arrow-default"
    : undefined;

  const handleLabelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (edgeData?.onSelectEdge) {
      edgeData.onSelectEdge(id);
    }
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsEditing(true);
    setDraftWeight(String(weight));
  };

  const commitWeight = () => {
    const parsed = parseInt(draftWeight, 10);
    if (isValidEdgeWeight(parsed)) {
      if (parsed !== weight && edgeData?.onUpdateEdgeWeight) {
        edgeData.onUpdateEdgeWeight(id, parsed);
      }
    } else {
      setDraftWeight(String(weight));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitWeight();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraftWeight(String(weight));
      setIsEditing(false);
    }
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={`pf-graph-edge ${stateClass} ${selectedClass}`}
        markerEnd={markerId ? `url(#${markerId})` : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan nowheel"
        >
          {isEditing ? (
            <input
              type="number"
              min={0}
              max={999}
              step={1}
              ref={(el) => el?.focus()}
              className="pf-inline-edge-weight-input nodrag nopan nowheel"
              value={draftWeight}
              onChange={(e) => setDraftWeight(e.target.value)}
              onBlur={commitWeight}
              onKeyDown={handleKeyDown}
              aria-label="Edit edge weight"
            />
          ) : (
            <button
              type="button"
              className={`pf-edge-weight-label ${selected ? "is-selected" : ""} ${stateClass} ${zoomClass}`}
              onClick={handleLabelClick}
              onDoubleClick={handleDoubleClick}
              aria-label={`Edge weight ${weight}. Double click to edit.`}
              title={`Weight: ${weight} (Double click to edit)`}
            >
              {weight}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
