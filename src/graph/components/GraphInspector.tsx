"use client";

import type { GraphDocument } from "../domain/types";

export interface GraphSummaryPanelProps {
  doc: GraphDocument;
}

export function GraphSummaryPanel({ doc }: GraphSummaryPanelProps) {
  const startNode = doc.startNodeId
    ? doc.nodes.find((n) => n.id === doc.startNodeId)
    : null;
  const targetNode = doc.targetNodeId
    ? doc.nodes.find((n) => n.id === doc.targetNodeId)
    : null;

  const startDisplay = startNode
    ? (startNode.value || startNode.label)
    : "None";
  const targetDisplay = targetNode
    ? (targetNode.value || targetNode.label)
    : "None";

  return (
    <section className="panel-section inspector-panel graph-summary-panel" aria-label="Graph summary">
      <div className="section-heading compact-heading">
        <h2>Graph</h2>
        <code>{doc.scenarioLabel}</code>
      </div>

      <dl className="inspector-list">
        <div>
          <dt>Structure</dt>
          <dd>
            {doc.nodes.length} {doc.nodes.length === 1 ? "node" : "nodes"} · {doc.edges.length} {doc.edges.length === 1 ? "edge" : "edges"}
          </dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{doc.directed ? "Directed" : "Undirected"}</dd>
        </div>
        <div>
          <dt>Start</dt>
          <dd>{startDisplay}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{targetDisplay}</dd>
        </div>
      </dl>
    </section>
  );
}

// Retain GraphInspector export as alias for GraphSummaryPanel
export const GraphInspector = GraphSummaryPanel;
