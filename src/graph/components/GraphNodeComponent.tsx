"use client";

import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { GraphNodeColor } from "../domain/types";
import type { GraphNodeSearchValues } from "../algorithms/types";
import type { GraphPlaybackNodeState } from "../playback/types";

export interface GraphNodeData extends Record<string, unknown> {
  nodeId: string;
  label: string;
  value?: string;
  color?: GraphNodeColor;
  isStart: boolean;
  isTarget: boolean;
  playbackState?: GraphPlaybackNodeState;
  playbackValues?: GraphNodeSearchValues;
  isConnectMode?: boolean;
  onUpdateNodeValue?: (nodeId: string, value: string) => void;
}

const COLOR_CLASSES: Record<GraphNodeColor, string> = {
  neutral: "node-color-neutral",
  blue: "node-color-blue",
  cyan: "node-color-cyan",
  amber: "node-color-amber",
  violet: "node-color-violet",
  rose: "node-color-rose",
};

export const GraphNodeComponent = memo(function GraphNodeComponent({
  id,
  data,
  selected,
}: {
  id: string;
  data: GraphNodeData;
  selected?: boolean;
}) {
  const {
    label,
    value,
    color = "neutral",
    isStart,
    isTarget,
    playbackState = "unvisited",
    isConnectMode,
    onUpdateNodeValue,
  } = data;

  const primaryDisplay = value !== undefined && value.trim() !== "" ? value : label;
  const [prevPrimary, setPrevPrimary] = useState(primaryDisplay);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(primaryDisplay);

  if (prevPrimary !== primaryDisplay && !isEditing) {
    setPrevPrimary(primaryDisplay);
    setDraftValue(primaryDisplay);
  }

  const colorClass = COLOR_CLASSES[color] ?? COLOR_CLASSES.neutral;
  const stateClass = playbackState !== "unvisited" ? `is-playback-${playbackState}` : "";
  const roleClass = isStart ? "is-start-node" : isTarget ? "is-target-node" : "";
  const selectedClass = selected ? "is-selected" : "";
  const connectClass = isConnectMode ? "connect-active" : "";

  const tooltipText =
    value && label && value !== label
      ? `${label} (Value: ${value})`
      : `Node ${primaryDisplay}`;

  const commitValue = () => {
    const trimmed = draftValue.trim();
    if (trimmed !== (value ?? "")) {
      onUpdateNodeValue?.(id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitValue();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraftValue(primaryDisplay);
      setIsEditing(false);
    }
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsEditing(true);
    setDraftValue(primaryDisplay);
  };

  return (
    <div
      className={`pf-graph-node ${colorClass} ${stateClass} ${roleClass} ${selectedClass} ${connectClass}`}
      data-node-id={id}
      tabIndex={0}
      role="button"
      aria-label={`Node ${primaryDisplay}${isStart ? " (Start)" : isTarget ? " (Target)" : ""}${label && label !== primaryDisplay ? `, label ${label}` : ""}`}
    >
      {/* 4 Connection Handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="pf-node-handle handle-top"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="pf-node-handle handle-top"
      />

      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="pf-node-handle handle-right"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="pf-node-handle handle-right"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="pf-node-handle handle-bottom"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="pf-node-handle handle-bottom"
      />

      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="pf-node-handle handle-left"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="pf-node-handle handle-left"
      />

      {/* Role Badges */}
      {isStart && (
        <span className="pf-node-role-badge start-badge" aria-hidden="true" title="Start Node">
          S
        </span>
      )}
      {isTarget && (
        <span className="pf-node-role-badge target-badge" aria-hidden="true" title="Target Node">
          T
        </span>
      )}

      {/* Primary Value / Label */}
      {isEditing ? (
        <input
          type="text"
          ref={(el) => el?.focus()}
          maxLength={24}
          className="pf-inline-node-value-input nodrag nopan nowheel"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={commitValue}
          onKeyDown={handleKeyDown}
          aria-label="Edit node value"
        />
      ) : (
        <span
          className="pf-node-label"
          title={tooltipText}
          onDoubleClick={handleDoubleClick}
        >
          {primaryDisplay}
        </span>
      )}
    </div>
  );
});
