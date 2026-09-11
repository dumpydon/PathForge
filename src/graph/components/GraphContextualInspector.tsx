"use client";

import { useState } from "react";
import type {
  GraphDocument,
  GraphEdge,
  GraphNode,
  GraphNodeColor,
} from "../domain/types";
import { isValidEdgeWeight } from "../domain/validation";

const COLOR_OPTIONS: Array<{ id: GraphNodeColor; label: string; colorHex: string }> = [
  { id: "neutral", label: "Neutral", colorHex: "#34404f" },
  { id: "blue", label: "Blue", colorHex: "#58a6ff" },
  { id: "cyan", label: "Cyan", colorHex: "#39c5bb" },
  { id: "amber", label: "Amber", colorHex: "#d29922" },
  { id: "violet", label: "Violet", colorHex: "#bc8cff" },
  { id: "rose", label: "Rose", colorHex: "#f47067" },
];

interface NodeCanvasInspectorProps {
  node: GraphNode;
  doc: GraphDocument;
  onUpdateNodeLabel: (nodeId: string, label: string) => void;
  onUpdateNodeValue: (nodeId: string, value: string) => void;
  onUpdateNodeColor: (nodeId: string, color: GraphNodeColor) => void;
  onSetStartNode: (nodeId: string | null) => void;
  onSetTargetNode: (nodeId: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

function NodeCanvasInspector({
  node,
  doc,
  onUpdateNodeLabel,
  onUpdateNodeValue,
  onUpdateNodeColor,
  onSetStartNode,
  onSetTargetNode,
  onDeleteNode,
  onClose,
}: NodeCanvasInspectorProps) {
  const [prevValue, setPrevValue] = useState(node.value);
  const [valueDraft, setValueDraft] = useState(node.value ?? "");
  if (prevValue !== node.value) {
    setPrevValue(node.value);
    setValueDraft(node.value ?? "");
  }

  const [prevLabel, setPrevLabel] = useState(node.label);
  const [labelDraft, setLabelDraft] = useState(node.label);
  if (prevLabel !== node.label) {
    setPrevLabel(node.label);
    setLabelDraft(node.label);
  }

  const isStart = doc.startNodeId === node.id;
  const isTarget = doc.targetNodeId === node.id;
  const incidentEdges = doc.edges.filter(
    (e) => e.source === node.id || e.target === node.id,
  );
  const inEdges = doc.edges.filter((e) => e.target === node.id);
  const outEdges = doc.edges.filter((e) => e.source === node.id);

  const handleValueBlur = () => {
    const trimmed = valueDraft.trim();
    if (trimmed !== (node.value ?? "")) {
      onUpdateNodeValue(node.id, trimmed);
    }
  };

  const handleLabelBlur = () => {
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== node.label) {
      onUpdateNodeLabel(node.id, trimmed);
    } else {
      setLabelDraft(node.label);
    }
  };

  return (
    <div
      className="pf-contextual-canvas-inspector nodrag nopan nowheel"
      data-testid="node-canvas-inspector"
      aria-label="Node inspector overlay"
    >
      <div className="canvas-inspector-header">
        <span className="canvas-inspector-type">NODE</span>
        <div className="canvas-inspector-header-right">
          <code className="canvas-inspector-badge">{node.value || node.label}</code>
          <button
            type="button"
            className="canvas-inspector-close-btn"
            onClick={onClose}
            aria-label="Close inspector"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="canvas-inspector-body">
        <label className="canvas-inspector-field">
          <span className="field-title">Value</span>
          <input
            type="text"
            className="canvas-inspector-input"
            value={valueDraft}
            placeholder="e.g. 7"
            onChange={(e) => setValueDraft(e.target.value)}
            onBlur={handleValueBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            maxLength={24}
          />
        </label>

        <label className="canvas-inspector-field">
          <span className="field-title">Label</span>
          <input
            type="text"
            className="canvas-inspector-input"
            value={labelDraft}
            placeholder="optional label"
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            maxLength={16}
          />
        </label>

        <div className="canvas-inspector-field">
          <span className="field-title">Role</span>
          <div className="canvas-inspector-role-row">
            <button
              type="button"
              className={`role-toggle-btn ${isStart ? "is-start" : ""}`}
              onClick={() => onSetStartNode(isStart ? null : node.id)}
            >
              {isStart ? "✓ Start Node" : "Set Start"}
            </button>
            <button
              type="button"
              className={`role-toggle-btn ${isTarget ? "is-target" : ""}`}
              onClick={() => onSetTargetNode(isTarget ? null : node.id)}
            >
              {isTarget ? "✓ Target Node" : "Set Target"}
            </button>
          </div>
        </div>

        <div className="canvas-inspector-field">
          <span className="field-title">Color</span>
          <div className="canvas-inspector-color-row">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`color-dot ${(node.color ?? "neutral") === c.id ? "is-selected" : ""}`}
                style={{ backgroundColor: c.colorHex }}
                onClick={() => onUpdateNodeColor(node.id, c.id)}
                aria-label={`Color ${c.label}`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="canvas-inspector-stats">
          <div className="stats-row">
            <span className="stats-label">Connections</span>
            <span className="stats-value">{incidentEdges.length}</span>
          </div>
          {doc.directed && (
            <div className="stats-row">
              <span className="stats-label">In / Out</span>
              <span className="stats-value">
                {inEdges.length} / {outEdges.length}
              </span>
            </div>
          )}
        </div>

        <div className="canvas-inspector-footer">
          <button
            type="button"
            className="canvas-inspector-delete-btn"
            onClick={() => onDeleteNode(node.id)}
          >
            Delete node
          </button>
        </div>
      </div>
    </div>
  );
}

interface EdgeCanvasInspectorProps {
  edge: GraphEdge;
  doc: GraphDocument;
  onUpdateEdgeWeight: (edgeId: string, weight: number) => void;
  onDeleteEdge: (edgeId: string) => void;
  onClose: () => void;
}

function EdgeCanvasInspector({
  edge,
  doc,
  onUpdateEdgeWeight,
  onDeleteEdge,
  onClose,
}: EdgeCanvasInspectorProps) {
  const [prevWeight, setPrevWeight] = useState(edge.weight);
  const [weightDraft, setWeightDraft] = useState(String(edge.weight));
  if (prevWeight !== edge.weight) {
    setPrevWeight(edge.weight);
    setWeightDraft(String(edge.weight));
  }

  const sourceNode = doc.nodes.find((n) => n.id === edge.source);
  const targetNode = doc.nodes.find((n) => n.id === edge.target);

  const handleWeightBlur = () => {
    const parsed = parseInt(weightDraft, 10);
    if (isValidEdgeWeight(parsed)) {
      if (parsed !== edge.weight) {
        onUpdateEdgeWeight(edge.id, parsed);
      }
    } else {
      setWeightDraft(String(edge.weight));
    }
  };

  const parsedWeight = parseInt(weightDraft, 10);
  const isInvalid = !isValidEdgeWeight(parsedWeight);

  const sourceName = sourceNode?.value || sourceNode?.label || "?";
  const targetName = targetNode?.value || targetNode?.label || "?";
  const edgeSummary = doc.directed
    ? `${sourceName} → ${targetName}`
    : `${sourceName} — ${targetName}`;

  return (
    <div
      className="pf-contextual-canvas-inspector nodrag nopan nowheel"
      data-testid="edge-canvas-inspector"
      aria-label="Edge inspector overlay"
    >
      <div className="canvas-inspector-header">
        <span className="canvas-inspector-type">EDGE</span>
        <div className="canvas-inspector-header-right">
          <code className="canvas-inspector-badge">{edgeSummary}</code>
          <button
            type="button"
            className="canvas-inspector-close-btn"
            onClick={onClose}
            aria-label="Close inspector"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="canvas-inspector-body">
        <label className="canvas-inspector-field">
          <span className="field-title">Weight (0–999)</span>
          <input
            type="number"
            min={0}
            max={999}
            step={1}
            className={`canvas-inspector-input ${isInvalid ? "is-invalid" : ""}`}
            value={weightDraft}
            onChange={(e) => setWeightDraft(e.target.value)}
            onBlur={handleWeightBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          {isInvalid && (
            <span className="field-error-hint">Weight must be between 0 and 999.</span>
          )}
        </label>

        <div className="canvas-inspector-stats">
          <div className="stats-row">
            <span className="stats-label">From</span>
            <span className="stats-value">{sourceName}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">To</span>
            <span className="stats-value">{targetName}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Mode</span>
            <span className="stats-value">{doc.directed ? "Directed" : "Undirected"}</span>
          </div>
        </div>

        <div className="canvas-inspector-footer">
          <button
            type="button"
            className="canvas-inspector-delete-btn"
            onClick={() => onDeleteEdge(edge.id)}
          >
            Delete edge
          </button>
        </div>
      </div>
    </div>
  );
}

export interface GraphContextualInspectorProps {
  doc: GraphDocument;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onUpdateNodeLabel: (nodeId: string, label: string) => void;
  onUpdateNodeValue: (nodeId: string, value: string) => void;
  onUpdateNodeColor: (nodeId: string, color: GraphNodeColor) => void;
  onSetStartNode: (nodeId: string | null) => void;
  onSetTargetNode: (nodeId: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateEdgeWeight: (edgeId: string, weight: number) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDeselect: () => void;
}

export function GraphContextualInspector({
  doc,
  selectedNodeId,
  selectedEdgeId,
  onUpdateNodeLabel,
  onUpdateNodeValue,
  onUpdateNodeColor,
  onSetStartNode,
  onSetTargetNode,
  onDeleteNode,
  onUpdateEdgeWeight,
  onDeleteEdge,
  onDeselect,
}: GraphContextualInspectorProps) {
  const selectedNode = selectedNodeId
    ? doc.nodes.find((n) => n.id === selectedNodeId)
    : null;
  const selectedEdge = selectedEdgeId
    ? doc.edges.find((e) => e.id === selectedEdgeId)
    : null;

  if (selectedNode) {
    return (
      <NodeCanvasInspector
        key={selectedNode.id}
        node={selectedNode}
        doc={doc}
        onUpdateNodeLabel={onUpdateNodeLabel}
        onUpdateNodeValue={onUpdateNodeValue}
        onUpdateNodeColor={onUpdateNodeColor}
        onSetStartNode={onSetStartNode}
        onSetTargetNode={onSetTargetNode}
        onDeleteNode={onDeleteNode}
        onClose={onDeselect}
      />
    );
  }

  if (selectedEdge) {
    return (
      <EdgeCanvasInspector
        key={selectedEdge.id}
        edge={selectedEdge}
        doc={doc}
        onUpdateEdgeWeight={onUpdateEdgeWeight}
        onDeleteEdge={onDeleteEdge}
        onClose={onDeselect}
      />
    );
  }

  return null;
}
