"use client";

import { useCallback, useEffect, useMemo, type MouseEvent } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type OnConnect,
  type Edge as ReactFlowEdge,
  type Node as ReactFlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { GraphDocument, GraphNodeColor } from "../domain/types";
import { canConnect } from "../domain/validation";
import type { GraphPlaybackSnapshot } from "../playback/types";
import { GraphContextualInspector } from "./GraphContextualInspector";
import { GraphEdgeComponent, type GraphEdgeData } from "./GraphEdgeComponent";
import { GraphNodeComponent, type GraphNodeData } from "./GraphNodeComponent";

export type GraphEditorTool = "select" | "node" | "connect" | "delete";

interface GraphCanvasProps {
  doc: GraphDocument;
  playbackSnapshot: GraphPlaybackSnapshot;
  activeTool: GraphEditorTool;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  connectSourceNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onAddNodeAt: (position: { x: number; y: number }) => void;
  onConnectNodes: (sourceId: string, targetId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onNodeDragStart: () => void;
  onNodeDragStop: (nodeId: string, position: { x: number; y: number }) => void;
  onConnectSourceSelect: (nodeId: string | null) => void;
  onAutoLayout: () => void;
  onUpdateNodeLabel: (nodeId: string, label: string) => void;
  onUpdateNodeValue: (nodeId: string, value: string) => void;
  onUpdateNodeColor: (nodeId: string, color: GraphNodeColor) => void;
  onSetStartNode: (nodeId: string | null) => void;
  onSetTargetNode: (nodeId: string | null) => void;
  onUpdateEdgeWeight: (edgeId: string, weight: number) => void;
}

const nodeTypes = {
  pathforgeNode: GraphNodeComponent,
};

const edgeTypes = {
  pathforgeEdge: GraphEdgeComponent,
};

function GraphCanvasInner(props: GraphCanvasProps) {
  const {
    doc,
    playbackSnapshot,
    activeTool,
    selectedNodeId,
    selectedEdgeId,
    connectSourceNodeId,
    onSelectNode,
    onSelectEdge,
    onAddNodeAt,
    onConnectNodes,
    onDeleteNode,
    onDeleteEdge,
    onNodeDragStart,
    onNodeDragStop,
    onConnectSourceSelect,
    onUpdateNodeLabel,
    onUpdateNodeValue,
    onUpdateNodeColor,
    onSetStartNode,
    onSetTargetNode,
    onUpdateEdgeWeight,
  } = props;

  const reactFlowInstance = useReactFlow();

  // Convert domain nodes to React Flow nodes
  const rfNodes: ReactFlowNode<GraphNodeData>[] = useMemo(() => {
    return doc.nodes.map((node) => {
      const isStart = node.id === doc.startNodeId;
      const isTarget = node.id === doc.targetNodeId;
      const playbackNode = playbackSnapshot.nodes.get(node.id);

      return {
        id: node.id,
        type: "pathforgeNode",
        position: { x: node.position.x, y: node.position.y },
        selected: node.id === selectedNodeId,
        data: {
          nodeId: node.id,
          label: node.label,
          value: node.value,
          color: node.color,
          isStart,
          isTarget,
          playbackState: playbackNode?.state,
          playbackValues: playbackNode,
          isConnectMode: activeTool === "connect" || connectSourceNodeId === node.id,
          onUpdateNodeValue,
        },
      };
    });
  }, [
    doc.nodes,
    doc.startNodeId,
    doc.targetNodeId,
    playbackSnapshot.nodes,
    selectedNodeId,
    activeTool,
    connectSourceNodeId,
    onUpdateNodeValue,
  ]);

  // Convert domain edges to React Flow edges
  const rfEdges: ReactFlowEdge<GraphEdgeData>[] = useMemo(() => {
    return doc.edges.map((edge) => {
      const playbackEdge = playbackSnapshot.edges.get(edge.id);

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "pathforgeEdge",
        selected: edge.id === selectedEdgeId,
        data: {
          edgeId: edge.id,
          weight: edge.weight,
          directed: doc.directed,
          playbackState: playbackEdge?.state,
          onSelectEdge,
          onUpdateEdgeWeight,
        },
      };
    });
  }, [
    doc.edges,
    doc.directed,
    playbackSnapshot.edges,
    selectedEdgeId,
    onSelectEdge,
    onUpdateEdgeWeight,
  ]);

  // Handle connecting edges
  const handleConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      onConnectNodes(params.source, params.target);
    },
    [onConnectNodes],
  );

  const isValidConnection = useCallback(
    (connection: Connection | { source: string | null; target: string | null }) => {
      if (!connection.source || !connection.target) return false;
      return canConnect(doc, connection.source, connection.target).allowed;
    },
    [doc],
  );

  // Handle pane clicks
  const handlePaneClick = useCallback(
    (event: MouseEvent) => {
      if (activeTool === "node") {
        const clientPos = {
          x: event.clientX,
          y: event.clientY,
        };
        const projected = reactFlowInstance.screenToFlowPosition(clientPos);
        onAddNodeAt({
          x: Math.round(projected.x),
          y: Math.round(projected.y),
        });
        return;
      }

      onSelectNode(null);
      onSelectEdge(null);
      if (connectSourceNodeId) {
        onConnectSourceSelect(null);
      }
    },
    [
      activeTool,
      connectSourceNodeId,
      onAddNodeAt,
      onConnectSourceSelect,
      onSelectEdge,
      onSelectNode,
      reactFlowInstance,
    ],
  );

  // Double click pane -> add node
  const handlePaneDoubleClick = useCallback(
    (event: MouseEvent) => {
      const clientPos = {
        x: event.clientX,
        y: event.clientY,
      };
      const projected = reactFlowInstance.screenToFlowPosition(clientPos);
      onAddNodeAt({
        x: Math.round(projected.x),
        y: Math.round(projected.y),
      });
    },
    [onAddNodeAt, reactFlowInstance],
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: ReactFlowNode) => {
      if (activeTool === "delete") {
        onDeleteNode(node.id);
        return;
      }

      if (activeTool === "connect") {
        if (!connectSourceNodeId) {
          onConnectSourceSelect(node.id);
        } else if (connectSourceNodeId === node.id) {
          onConnectSourceSelect(null);
        } else {
          onConnectNodes(connectSourceNodeId, node.id);
          onConnectSourceSelect(null);
        }
        return;
      }

      onSelectNode(node.id);
      onSelectEdge(null);
    },
    [
      activeTool,
      connectSourceNodeId,
      onConnectNodes,
      onConnectSourceSelect,
      onDeleteNode,
      onSelectEdge,
      onSelectNode,
    ],
  );

  // Handle edge click
  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: ReactFlowEdge) => {
      if (activeTool === "delete") {
        onDeleteEdge(edge.id);
        return;
      }
      onSelectEdge(edge.id);
      onSelectNode(null);
    },
    [activeTool, onDeleteEdge, onSelectEdge, onSelectNode],
  );

  // Drag start
  const handleNodeDragStart = useCallback(() => {
    onNodeDragStart();
  }, [onNodeDragStart]);

  // Drag stop
  const handleNodeDragStop = useCallback(
    (_: unknown, node: ReactFlowNode) => {
      onNodeDragStop(node.id, {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      });
    },
    [onNodeDragStop],
  );

  // Auto-fit view when scenario changes
  useEffect(() => {
    if (doc.nodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 250 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [doc.scenarioLabel, doc.nodes.length, reactFlowInstance]);

  return (
    <div className="pf-graph-canvas-wrapper" role="region" aria-label="Graph Canvas">
      {/* SVG Defs for Directed Edge Arrows */}
      <svg className="pf-arrow-defs" aria-hidden="true">
        <defs>
          <marker
            id="pf-arrow-default"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#64748b" />
          </marker>
          <marker
            id="pf-arrow-selected"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
          </marker>
          <marker
            id="pf-arrow-examined"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
          </marker>
          <marker
            id="pf-arrow-relaxed"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
          </marker>
          <marker
            id="pf-arrow-path"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={handlePaneClick}
        onDoubleClick={handlePaneDoubleClick}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2.5}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: false }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        connectionLineStyle={{ stroke: "#38bdf8", strokeWidth: 1.8 }}
        className="pf-react-flow-root"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="#202a35"
        />

        {/* Custom Viewport Controls (Bottom-Left) */}
        <div className="pf-canvas-viewport-controls">
          <button
            type="button"
            className="viewport-btn"
            onClick={() => reactFlowInstance.zoomOut()}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="viewport-btn fit-btn"
            onClick={() => reactFlowInstance.fitView({ padding: 0.15, duration: 300 })}
            aria-label="Fit graph"
            title="Fit graph to canvas"
          >
            Fit
          </button>
          <button
            type="button"
            className="viewport-btn"
            onClick={() => reactFlowInstance.zoomIn()}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
        </div>

        {/* Contextual Canvas Inspector (Bottom-Right Overlay) */}
        <GraphContextualInspector
          doc={doc}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onUpdateNodeLabel={onUpdateNodeLabel}
          onUpdateNodeValue={onUpdateNodeValue}
          onUpdateNodeColor={onUpdateNodeColor}
          onSetStartNode={onSetStartNode}
          onSetTargetNode={onSetTargetNode}
          onDeleteNode={onDeleteNode}
          onUpdateEdgeWeight={onUpdateEdgeWeight}
          onDeleteEdge={onDeleteEdge}
          onDeselect={() => {
            onSelectNode(null);
            onSelectEdge(null);
          }}
        />

        {/* Empty Canvas Hint */}
        {doc.nodes.length === 0 && (
          <div className="pf-canvas-empty-hint" aria-live="polite">
            <h3 className="empty-hint-title">Create your first node</h3>
            <p className="empty-hint-primary">Double-click anywhere on the canvas</p>
            <p className="empty-hint-secondary">
              Connect nodes by dragging between handles
            </p>
          </div>
        )}
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
