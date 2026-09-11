import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GraphCanvas } from "../graph/components/GraphCanvas";
import { GraphContextualInspector } from "../graph/components/GraphContextualInspector";
import { GraphSummaryPanel } from "../graph/components/GraphInspector";
import {
  addNode,
  addEdge,
  deleteNode,
  deleteEdge,
  setStartNode,
  setTargetNode,
  updateEdgeWeight,
  updateNode,
  createEmptyGraphDocument,
} from "../graph/domain/graph";
import { isValidEdgeWeight } from "../graph/domain/validation";
import {
  createGraphHistory,
  pushGraphAction,
  undoGraphAction,
  redoGraphAction,
} from "../graph/state/graphHistory";
import { runGraphAlgorithm } from "../graph/algorithms";

describe("Graph Contextual Editing & Inspector", () => {
  const setupTestGraph = () => {
    let doc = createEmptyGraphDocument("Test Graph");
    const n1 = addNode(doc, { x: 0, y: 0 });
    doc = n1.doc;
    const n2 = addNode(doc, { x: 100, y: 0 });
    doc = n2.doc;
    const e1 = addEdge(doc, n1.newNode.id, n2.newNode.id, 5);
    doc = e1.doc;
    return { doc, node1: n1.newNode, node2: n2.newNode, edge1: e1.newEdge! };
  };

  describe("GraphContextualInspector Overlay", () => {
    it("renders nothing (empty HTML string) when neither node nor edge is selected", () => {
      const { doc } = setupTestGraph();
      const html = renderToStaticMarkup(
        React.createElement(GraphContextualInspector, {
          doc,
          selectedNodeId: null,
          selectedEdgeId: null,
          onUpdateNodeLabel: vi.fn(),
          onUpdateNodeValue: vi.fn(),
          onUpdateNodeColor: vi.fn(),
          onSetStartNode: vi.fn(),
          onSetTargetNode: vi.fn(),
          onDeleteNode: vi.fn(),
          onUpdateEdgeWeight: vi.fn(),
          onDeleteEdge: vi.fn(),
          onDeselect: vi.fn(),
        }),
      );

      expect(html).toBe("");
    });

    it("renders Node Canvas Inspector when a node is explicitly selected", () => {
      const { doc, node1, node2 } = setupTestGraph();
      // Test node1 (isStart = true)
      const html1 = renderToStaticMarkup(
        React.createElement(GraphContextualInspector, {
          doc,
          selectedNodeId: node1.id,
          selectedEdgeId: null,
          onUpdateNodeLabel: vi.fn(),
          onUpdateNodeValue: vi.fn(),
          onUpdateNodeColor: vi.fn(),
          onSetStartNode: vi.fn(),
          onSetTargetNode: vi.fn(),
          onDeleteNode: vi.fn(),
          onUpdateEdgeWeight: vi.fn(),
          onDeleteEdge: vi.fn(),
          onDeselect: vi.fn(),
        }),
      );

      expect(html1).toContain("pf-contextual-canvas-inspector");
      expect(html1).toContain("data-testid=\"node-canvas-inspector\"");
      expect(html1).toContain("NODE");
      expect(html1).toContain("Value");
      expect(html1).toContain("Label");
      expect(html1).toContain("Role");
      expect(html1).toContain("✓ Start Node");
      expect(html1).toContain("Set Target");
      expect(html1).toContain("Color");
      expect(html1).toContain("Connections");
      expect(html1).toContain("Delete node");
      expect(html1).toContain("nodrag nopan nowheel");

      // Test node2 (isTarget = true)
      const html2 = renderToStaticMarkup(
        React.createElement(GraphContextualInspector, {
          doc,
          selectedNodeId: node2.id,
          selectedEdgeId: null,
          onUpdateNodeLabel: vi.fn(),
          onUpdateNodeValue: vi.fn(),
          onUpdateNodeColor: vi.fn(),
          onSetStartNode: vi.fn(),
          onSetTargetNode: vi.fn(),
          onDeleteNode: vi.fn(),
          onUpdateEdgeWeight: vi.fn(),
          onDeleteEdge: vi.fn(),
          onDeselect: vi.fn(),
        }),
      );
      expect(html2).toContain("Set Start");
      expect(html2).toContain("✓ Target Node");
    });

    it("renders Edge Canvas Inspector when an edge is explicitly selected", () => {
      const { doc, edge1 } = setupTestGraph();
      const html = renderToStaticMarkup(
        React.createElement(GraphContextualInspector, {
          doc,
          selectedNodeId: null,
          selectedEdgeId: edge1.id,
          onUpdateNodeLabel: vi.fn(),
          onUpdateNodeValue: vi.fn(),
          onUpdateNodeColor: vi.fn(),
          onSetStartNode: vi.fn(),
          onSetTargetNode: vi.fn(),
          onDeleteNode: vi.fn(),
          onUpdateEdgeWeight: vi.fn(),
          onDeleteEdge: vi.fn(),
          onDeselect: vi.fn(),
        }),
      );

      expect(html).toContain("pf-contextual-canvas-inspector");
      expect(html).toContain("data-testid=\"edge-canvas-inspector\"");
      expect(html).toContain("EDGE");
      expect(html).toContain("Weight (0–999)");
      expect(html).toContain("From");
      expect(html).toContain("To");
      expect(html).toContain("Mode");
      expect(html).toContain("Delete edge");
      expect(html).toContain("nodrag nopan nowheel");
    });
  });

  describe("Edge Weight Validation", () => {
    it("accepts valid weights between 0 and 999", () => {
      expect(isValidEdgeWeight(0)).toBe(true);
      expect(isValidEdgeWeight(1)).toBe(true);
      expect(isValidEdgeWeight(42)).toBe(true);
      expect(isValidEdgeWeight(999)).toBe(true);
    });

    it("rejects invalid weights", () => {
      expect(isValidEdgeWeight(-1)).toBe(false);
      expect(isValidEdgeWeight(-100)).toBe(false);
      expect(isValidEdgeWeight(1000)).toBe(false);
      expect(isValidEdgeWeight(9999)).toBe(false);
      expect(isValidEdgeWeight(NaN)).toBe(false);
      expect(isValidEdgeWeight(3.14)).toBe(false);
    });
  });

  describe("Search Invalidation & History Atomicity", () => {
    it("preserves search results across display metadata changes (value, label, color)", () => {
      const { doc, node1 } = setupTestGraph();
      const initialResult = runGraphAlgorithm("bfs", doc);
      expect(initialResult.found).toBe(true);

      // Value update
      const updatedValueDoc = updateNode(doc, node1.id, { value: "777" });
      const valueResult = runGraphAlgorithm("bfs", updatedValueDoc);
      expect(valueResult.pathNodeIds).toEqual(initialResult.pathNodeIds);

      // Label update
      const updatedLabelDoc = updateNode(doc, node1.id, { label: "CustomNode" });
      const labelResult = runGraphAlgorithm("bfs", updatedLabelDoc);
      expect(labelResult.pathNodeIds).toEqual(initialResult.pathNodeIds);

      // Color update
      const updatedColorDoc = updateNode(doc, node1.id, { color: "cyan" });
      const colorResult = runGraphAlgorithm("bfs", updatedColorDoc);
      expect(colorResult.pathNodeIds).toEqual(initialResult.pathNodeIds);
    });

    it("requires search invalidation when edge weights change", () => {
      let doc = createEmptyGraphDocument();
      const nA = addNode(doc, { x: 0, y: 0 }); doc = nA.doc;
      const nB = addNode(doc, { x: 100, y: 0 }); doc = nB.doc;
      const nC = addNode(doc, { x: 50, y: 50 }); doc = nC.doc;
      const eAB = addEdge(doc, nA.newNode.id, nB.newNode.id, 10); doc = eAB.doc;
      const eAC = addEdge(doc, nA.newNode.id, nC.newNode.id, 1); doc = eAC.doc;
      const eCB = addEdge(doc, nC.newNode.id, nB.newNode.id, 1); doc = eCB.doc;
      doc = setStartNode(doc, nA.newNode.id);
      doc = setTargetNode(doc, nB.newNode.id);

      const dijkstraBefore = runGraphAlgorithm("dijkstra", doc);
      expect(dijkstraBefore.pathNodeIds).toEqual([nA.newNode.id, nC.newNode.id, nB.newNode.id]);
      expect(dijkstraBefore.pathCost).toBe(2);

      // Mutate edge weight: make direct path cheaper
      const nextDoc = updateEdgeWeight(doc, eAB.newEdge!.id, 1);
      const dijkstraAfter = runGraphAlgorithm("dijkstra", nextDoc);
      expect(dijkstraAfter.pathNodeIds).toEqual([nA.newNode.id, nB.newNode.id]);
      expect(dijkstraAfter.pathCost).toBe(1);
    });

    it("requires search invalidation when roles (Start/Target) or topology changes", () => {
      const { doc, node2, edge1 } = setupTestGraph();

      // Swapping target invalidates search target
      const docWithNoTarget = setTargetNode(doc, null);
      expect(docWithNoTarget.targetNodeId).toBeNull();

      // Deleting edge disconnects graph
      const docNoEdge = deleteEdge(doc, edge1.id);
      const resultNoEdge = runGraphAlgorithm("bfs", docNoEdge);
      expect(resultNoEdge.found).toBe(false);

      // Deleting node removes it
      const docNoNode = deleteNode(doc, node2.id);
      expect(docNoNode.nodes.some((n) => n.id === node2.id)).toBe(false);
    });

    it("handles history actions atomically with undo and redo", () => {
      const { doc, node1 } = setupTestGraph();
      let history = createGraphHistory(doc);
      const initialVal = node1.value;

      // Commit edit 1
      const doc1 = updateNode(doc, node1.id, { value: "42" });
      history = pushGraphAction(history, doc1);
      expect(history.present.nodes.find((n) => n.id === node1.id)?.value).toBe("42");

      // Commit edit 2
      const doc2 = updateNode(doc1, node1.id, { value: "99" });
      history = pushGraphAction(history, doc2);
      expect(history.present.nodes.find((n) => n.id === node1.id)?.value).toBe("99");

      // Undo edit 2 -> restores edit 1
      const undoRes1 = undoGraphAction(history);
      expect(undoRes1).not.toBeNull();
      history = undoRes1!.state;
      expect(history.present.nodes.find((n) => n.id === node1.id)?.value).toBe("42");

      // Undo edit 1 -> restores initial
      const undoRes2 = undoGraphAction(history);
      expect(undoRes2).not.toBeNull();
      history = undoRes2!.state;
      expect(history.present.nodes.find((n) => n.id === node1.id)?.value).toBe(initialVal);

      // Redo edit 1 -> restores edit 1
      const redoRes1 = redoGraphAction(history);
      expect(redoRes1).not.toBeNull();
      history = redoRes1!.state;
      expect(history.present.nodes.find((n) => n.id === node1.id)?.value).toBe("42");
    });
  });

  describe("GraphSummaryPanel in Right Sidebar", () => {
    it("renders read-only graph information without editable forms or delete buttons", () => {
      const { doc } = setupTestGraph();
      const html = renderToStaticMarkup(React.createElement(GraphSummaryPanel, { doc }));

      expect(html).toContain("graph-summary-panel");
      expect(html).toContain("Graph");
      expect(html).toContain("Test Graph");
      expect(html).toContain("2 nodes · 1 edge");
      expect(html).toContain("Undirected");
      expect(html).toContain("Start");
      expect(html).toContain("Target");

      // Verify NO editable forms or delete buttons
      expect(html).not.toContain("<input");
      expect(html).not.toContain("Delete node");
      expect(html).not.toContain("Delete edge");
      expect(html).not.toContain("color-palette");
    });
  });

  describe("GraphCanvas Shell & Sizing Robustness", () => {
    it("renders the canvas wrapper with region role and ReactFlow root whether elements are selected or not", () => {
      const { doc, node1, edge1 } = setupTestGraph();
      const mockSnapshot = {
        nodes: new Map(),
        edges: new Map(),
        currentNodeId: null,
        frontierSize: 0,
        visitedCount: 0,
        lastEvent: null,
      };

      // 1. Nothing selected: canvas renders, inspector unmounted
      const htmlDeselected = renderToStaticMarkup(
        React.createElement(GraphCanvas, {
          doc,
          playbackSnapshot: mockSnapshot,
          activeTool: "select",
          selectedNodeId: null,
          selectedEdgeId: null,
          connectSourceNodeId: null,
          onSelectNode: vi.fn(),
          onSelectEdge: vi.fn(),
          onAddNodeAt: vi.fn(),
          onConnectNodes: vi.fn(),
          onDeleteNode: vi.fn(),
          onDeleteEdge: vi.fn(),
          onNodeDragStart: vi.fn(),
          onNodeDragStop: vi.fn(),
          onConnectSourceSelect: vi.fn(),
          onAutoLayout: vi.fn(),
          onUpdateNodeLabel: vi.fn(),
          onUpdateNodeValue: vi.fn(),
          onUpdateNodeColor: vi.fn(),
          onSetStartNode: vi.fn(),
          onSetTargetNode: vi.fn(),
          onUpdateEdgeWeight: vi.fn(),
        }),
      );
      expect(htmlDeselected).toContain("pf-graph-canvas-wrapper");
      expect(htmlDeselected).toContain("pf-react-flow-root");
      expect(htmlDeselected).toContain("pf-canvas-viewport-controls");
      expect(htmlDeselected).not.toContain("pf-contextual-canvas-inspector");

      // 2. Node selected: canvas renders, contextual inspector mounted
      const htmlNodeSelected = renderToStaticMarkup(
        React.createElement(GraphCanvas, {
          doc,
          playbackSnapshot: mockSnapshot,
          activeTool: "select",
          selectedNodeId: node1.id,
          selectedEdgeId: null,
          connectSourceNodeId: null,
          onSelectNode: vi.fn(),
          onSelectEdge: vi.fn(),
          onAddNodeAt: vi.fn(),
          onConnectNodes: vi.fn(),
          onDeleteNode: vi.fn(),
          onDeleteEdge: vi.fn(),
          onNodeDragStart: vi.fn(),
          onNodeDragStop: vi.fn(),
          onConnectSourceSelect: vi.fn(),
          onAutoLayout: vi.fn(),
          onUpdateNodeLabel: vi.fn(),
          onUpdateNodeValue: vi.fn(),
          onUpdateNodeColor: vi.fn(),
          onSetStartNode: vi.fn(),
          onSetTargetNode: vi.fn(),
          onUpdateEdgeWeight: vi.fn(),
        }),
      );
      expect(htmlNodeSelected).toContain("pf-graph-canvas-wrapper");
      expect(htmlNodeSelected).toContain("pf-react-flow-root");
      expect(htmlNodeSelected).toContain("pf-contextual-canvas-inspector");

      // 3. Edge selected: canvas renders, contextual inspector mounted
      const htmlEdgeSelected = renderToStaticMarkup(
        React.createElement(GraphCanvas, {
          doc,
          playbackSnapshot: mockSnapshot,
          activeTool: "select",
          selectedNodeId: null,
          selectedEdgeId: edge1.id,
          connectSourceNodeId: null,
          onSelectNode: vi.fn(),
          onSelectEdge: vi.fn(),
          onAddNodeAt: vi.fn(),
          onConnectNodes: vi.fn(),
          onDeleteNode: vi.fn(),
          onDeleteEdge: vi.fn(),
          onNodeDragStart: vi.fn(),
          onNodeDragStop: vi.fn(),
          onConnectSourceSelect: vi.fn(),
          onAutoLayout: vi.fn(),
          onUpdateNodeLabel: vi.fn(),
          onUpdateNodeValue: vi.fn(),
          onUpdateNodeColor: vi.fn(),
          onSetStartNode: vi.fn(),
          onSetTargetNode: vi.fn(),
          onUpdateEdgeWeight: vi.fn(),
        }),
      );
      expect(htmlEdgeSelected).toContain("pf-graph-canvas-wrapper");
      expect(htmlEdgeSelected).toContain("pf-react-flow-root");
      expect(htmlEdgeSelected).toContain("pf-contextual-canvas-inspector");
    });
  });
});
