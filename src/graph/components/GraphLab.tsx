"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AlgorithmPanel } from "../../components/Panels/AlgorithmPanel";
import { MetricsPanel } from "../../components/Panels/MetricsPanel";
import {
  runAllGraphAlgorithms,
  runGraphAlgorithm,
  type GraphAlgorithmId,
  type GraphComparisonResults,
  type GraphSearchResult,
} from "../algorithms";
import {
  addEdge,
  addNode,
  clearGraph as clearGraphDoc,
  deleteEdge,
  deleteNode,
  setStartNode,
  setTargetNode,
  updateEdgeWeight,
  updateNode,
} from "../domain/graph";
import type {
  GraphDocument,
  GraphNodeColor,
  GraphNodePosition,
} from "../domain/types";
import { layoutGraph } from "../layout/autoLayout";
import { useGraphPlayback } from "../playback/useGraphPlayback";
import {
  DEFAULT_GRAPH_PRESET,
  getGraphPreset,
  type GraphPresetId,
} from "../presets";
import {
  canRedoGraph,
  canUndoGraph,
  createGraphHistory,
  pushGraphAction,
  redoGraphAction,
  undoGraphAction,
  type GraphHistoryState,
} from "../state/graphHistory";
import { GraphCanvas, type GraphEditorTool } from "./GraphCanvas";
import { GraphComparisonPanel } from "./GraphComparisonPanel";
import { GraphSummaryPanel } from "./GraphInspector";
import { GraphToolbar } from "./GraphToolbar";

export interface GraphLabProps {
  onLogoAnimation?: () => void;
  directed: boolean;
  onToggleDirected: (directed: boolean) => void;
  history?: GraphHistoryState;
  onHistoryChange?: Dispatch<SetStateAction<GraphHistoryState>>;
}

export function GraphLab({
  onLogoAnimation,
  directed,
  onToggleDirected,
  history: propsHistory,
  onHistoryChange,
}: GraphLabProps) {
  // Session Document & History
  const [internalHistory, setInternalHistory] = useState<GraphHistoryState>(() => {
    const initialDoc = { ...DEFAULT_GRAPH_PRESET, directed };
    return createGraphHistory(initialDoc);
  });

  const history = propsHistory ?? internalHistory;
  const setHistory = onHistoryChange ?? setInternalHistory;

  const doc = history.present;
  const docRef = useRef(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // Selected tool & entities
  const [activeTool, setActiveTool] = useState<GraphEditorTool>("select");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);
  const [inlineErrorMessage, setInlineErrorMessage] = useState<string | null>(null);

  // Search & Playback state
  const [algorithm, setAlgorithm] = useState<GraphAlgorithmId>("dijkstra");
  const [activeResult, setActiveResult] = useState<GraphSearchResult | null>(null);
  const [comparisonResults, setComparisonResults] = useState<GraphComparisonResults>({});
  const [statusRevealToken, setStatusRevealToken] = useState(0);

  const playback = useGraphPlayback(activeResult);
  const {
    load: loadPlayback,
    pause: pausePlayback,
    play: playPlayback,
    reset: resetPlayback,
    setSpeed: setPlaybackSpeed,
    step: stepPlayback,
    previousStep,
    seekStep,
  } = playback;

  const dragStartDocRef = useRef<GraphDocument | null>(null);

  const clearSearch = useCallback(() => {
    resetPlayback();
    setActiveResult(null);
    setInlineErrorMessage(null);
  }, [resetPlayback]);

  const resumePlayback = useCallback(() => {
    onLogoAnimation?.();
    playPlayback();
  }, [onLogoAnimation, playPlayback]);

  // When directed changes externally, reset search
  const prevDirectedRef = useRef(doc.directed);
  useEffect(() => {
    if (prevDirectedRef.current !== doc.directed) {
      prevDirectedRef.current = doc.directed;
      clearSearch();
    }
  }, [clearSearch, doc.directed]);

  // Contextual help strip
  const toolHelpText = useMemo(() => {
    switch (activeTool) {
      case "select":
        return "Drag nodes to move · Click to inspect · Scroll to zoom";
      case "node":
        return "Click canvas to add a node";
      case "connect":
        return "Drag from one node to another to connect";
      case "delete":
        return "Click a node or edge to remove it";
      default:
        return "Drag nodes to move · Click to inspect · Scroll to zoom";
    }
  }, [activeTool]);

  // Contextual algorithm weight notice
  const hasNonUnitWeights = useMemo(
    () => doc.edges.some((e) => e.weight !== 1),
    [doc.edges],
  );

  const algorithmWeightNotice = useMemo(() => {
    if (!hasNonUnitWeights) return null;
    if (algorithm === "bfs") {
      return "BFS treats every edge as one step; edge weights do not affect its path.";
    }
    if (algorithm === "dfs") {
      return "DFS treats all edges equally and ignores edge weights when choosing its path.";
    }
    if (algorithm === "dijkstra") {
      return "Dijkstra uses edge weights to minimize total path cost.";
    }
    return null;
  }, [algorithm, hasNonUnitWeights]);

  // Mutate graph document and push to history
  const commitGraphChange = useCallback(
    (nextDoc: GraphDocument) => {
      clearSearch();
      setHistory((current) => pushGraphAction(current, nextDoc));
    },
    [clearSearch, setHistory],
  );

  // Run Selected Algorithm
  const runSelected = useCallback(() => {
    setInlineErrorMessage(null);
    if (!doc.startNodeId || !doc.targetNodeId) {
      setInlineErrorMessage("Choose a start and target node to run graph search.");
      return;
    }

    onLogoAnimation?.();
    const result = runGraphAlgorithm(algorithm, doc, { recordEvents: true });
    setStatusRevealToken((t) => t + 1);
    setActiveResult(result);
    loadPlayback(result, true);
  }, [algorithm, doc, loadPlayback, onLogoAnimation]);

  const step = useCallback(() => {
    if (activeResult) {
      stepPlayback();
      return;
    }
    setInlineErrorMessage(null);
    if (!doc.startNodeId || !doc.targetNodeId) {
      setInlineErrorMessage("Choose a start and target node to run graph search.");
      return;
    }
    const result = runGraphAlgorithm(algorithm, doc, { recordEvents: true });
    setStatusRevealToken((t) => t + 1);
    setActiveResult(result);
    loadPlayback(result, false);
    stepPlayback();
  }, [activeResult, algorithm, doc, loadPlayback, stepPlayback]);

  const runAll = useCallback(() => {
    setInlineErrorMessage(null);
    if (!doc.startNodeId || !doc.targetNodeId) {
      setInlineErrorMessage("Choose a start and target node to run graph search.");
      return;
    }

    onLogoAnimation?.();
    const results = runAllGraphAlgorithms(doc, { recordEvents: true });
    const selected = results[algorithm]!;
    setStatusRevealToken((t) => t + 1);
    setComparisonResults(results);
    setActiveResult(selected);
    loadPlayback(selected, false);
  }, [algorithm, doc, loadPlayback, onLogoAnimation]);

  const replay = useCallback(
    (alg: GraphAlgorithmId) => {
      const result = comparisonResults[alg];
      if (!result) return;
      onLogoAnimation?.();
      setAlgorithm(alg);
      setStatusRevealToken((t) => t + 1);
      setActiveResult(result);
      loadPlayback(result, true);
    },
    [comparisonResults, loadPlayback, onLogoAnimation],
  );

  // History operations
  const undo = useCallback(() => {
    setHistory((curr) => {
      const res = undoGraphAction(curr);
      if (!res) return curr;
      clearSearch();
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      return res.state;
    });
  }, [clearSearch, setHistory]);

  const redo = useCallback(() => {
    setHistory((curr) => {
      const res = redoGraphAction(curr);
      if (!res) return curr;
      clearSearch();
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      return res.state;
    });
  }, [clearSearch, setHistory]);

  // Node & Edge Editing
  const handleAddNodeAt = useCallback(
    (position: GraphNodePosition) => {
      const { doc: nextDoc, newNode } = addNode(doc, position);
      commitGraphChange(nextDoc);
      setSelectedNodeId(newNode.id);
      setSelectedEdgeId(null);
    },
    [commitGraphChange, doc],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nextDoc = deleteNode(doc, nodeId);
      commitGraphChange(nextDoc);
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [commitGraphChange, doc, selectedNodeId],
  );

  const handleConnectNodes = useCallback(
    (sourceId: string, targetId: string) => {
      const { doc: nextDoc, error } = addEdge(doc, sourceId, targetId, 1);
      if (error) {
        setInlineErrorMessage(error);
        return;
      }
      setInlineErrorMessage(null);
      commitGraphChange(nextDoc);
    },
    [commitGraphChange, doc],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      const nextDoc = deleteEdge(doc, edgeId);
      commitGraphChange(nextDoc);
      if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
    },
    [commitGraphChange, doc, selectedEdgeId],
  );

  const handleNodeDragStart = useCallback(() => {
    dragStartDocRef.current = docRef.current;
  }, []);

  const handleNodeDragStop = useCallback(
    (nodeId: string, position: GraphNodePosition) => {
      const beforeDoc = dragStartDocRef.current;
      dragStartDocRef.current = null;
      if (!beforeDoc) return;

      const currentNode = beforeDoc.nodes.find((n) => n.id === nodeId);
      if (
        currentNode &&
        currentNode.position.x === position.x &&
        currentNode.position.y === position.y
      ) {
        return;
      }

      const nextDoc = updateNode(beforeDoc, nodeId, { position });
      setHistory((current) => pushGraphAction(current, nextDoc));
    },
    [setHistory],
  );

  const handleUpdateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      const nextDoc = updateNode(doc, nodeId, { label });
      setHistory((current) => pushGraphAction(current, nextDoc));
    },
    [doc, setHistory],
  );

  const handleUpdateNodeValue = useCallback(
    (nodeId: string, value: string) => {
      const nextDoc = updateNode(doc, nodeId, { value });
      setHistory((current) => pushGraphAction(current, nextDoc));
    },
    [doc, setHistory],
  );

  const handleUpdateNodeColor = useCallback(
    (nodeId: string, color: GraphNodeColor) => {
      const nextDoc = updateNode(doc, nodeId, { color });
      setHistory((current) => pushGraphAction(current, nextDoc));
    },
    [doc, setHistory],
  );

  const handleSetStartNode = useCallback(
    (nodeId: string | null) => {
      const nextDoc = setStartNode(doc, nodeId);
      commitGraphChange(nextDoc);
    },
    [commitGraphChange, doc],
  );

  const handleSetTargetNode = useCallback(
    (nodeId: string | null) => {
      const nextDoc = setTargetNode(doc, nodeId);
      commitGraphChange(nextDoc);
    },
    [commitGraphChange, doc],
  );

  const handleUpdateEdgeWeight = useCallback(
    (edgeId: string, weight: number) => {
      const nextDoc = updateEdgeWeight(doc, edgeId, weight);
      commitGraphChange(nextDoc);
    },
    [commitGraphChange, doc],
  );

  const handleClearGraph = useCallback(() => {
    const nextDoc = clearGraphDoc(doc);
    commitGraphChange(nextDoc);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [commitGraphChange, doc]);

  const handlePreset = useCallback(
    (presetId: GraphPresetId) => {
      const preset = getGraphPreset(presetId);
      if (preset) {
        const nextDoc = preset.create();
        commitGraphChange(nextDoc);
        if (nextDoc.directed !== directed) {
          onToggleDirected(nextDoc.directed);
        }
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    },
    [commitGraphChange, directed, onToggleDirected],
  );

  const handleAutoLayout = useCallback(async () => {
    try {
      const nextDoc = await layoutGraph(doc);
      commitGraphChange(nextDoc);
    } catch {
      // Fallback gracefully if layout engine errors
    }
  }, [commitGraphChange, doc]);

  // Keyboard Shortcuts (Section 57, 56)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }

      const isModifier = event.metaKey || event.ctrlKey;

      if (isModifier && !event.altKey && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (
        (isModifier && !event.altKey && event.key.toLowerCase() === "z" && event.shiftKey) ||
        (isModifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "y")
      ) {
        event.preventDefault();
        redo();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (playback.isPlaying) pausePlayback();
        else if (playback.isComplete) {
          // Completed final state: do not restart
        } else if (activeResult) resumePlayback();
        else runSelected();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousStep();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step();
      } else if (event.key.toLowerCase() === "r") {
        clearSearch();
      } else if (event.key.toLowerCase() === "c") {
        handleClearGraph();
      } else if (event.key.toLowerCase() === "s") {
        step();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedNodeId) {
          event.preventDefault();
          handleDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          event.preventDefault();
          handleDeleteEdge(selectedEdgeId);
        }
      } else if (event.key === "Escape") {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setConnectSourceNodeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeResult,
    handleClearGraph,
    handleDeleteEdge,
    handleDeleteNode,
    pausePlayback,
    playback.isComplete,
    playback.isPlaying,
    previousStep,
    redo,
    resumePlayback,
    runSelected,
    selectedEdgeId,
    selectedNodeId,
    step,
    undo,
    clearSearch,
  ]);

  const eventProgress = activeResult
    ? `${Math.min(playback.cursor, activeResult.events.length)} / ${activeResult.events.length}`
    : "0 / 0";

  return (
    <>
      <GraphToolbar
        algorithm={algorithm}
        activeTool={activeTool}
        isPlaying={playback.isPlaying}
        isComplete={playback.isComplete}
        stepIndex={playback.stepIndex}
        totalSteps={playback.totalSteps}
        hasResult={Boolean(activeResult)}
        canUndo={canUndoGraph(history)}
        canRedo={canRedoGraph(history)}
        speed={playback.speed}
        scenarioLabel={doc.scenarioLabel}
        onAlgorithmChange={(alg) => {
          setAlgorithm(alg);
          clearSearch();
        }}
        onToolChange={setActiveTool}
        onRun={runSelected}
        onPause={pausePlayback}
        onResume={resumePlayback}
        onStep={step}
        onPrevious={previousStep}
        onSeek={seekStep}
        onReset={clearSearch}
        onClearGraph={handleClearGraph}
        onPreset={handlePreset}
        onAutoLayout={handleAutoLayout}
        onUndo={undo}
        onRedo={redo}
        onSpeedChange={setPlaybackSpeed}
        onRunAll={runAll}
      />

      {/* Scenario metadata strip */}
      <div className="workspace-meta">
        <div>
          <span className="meta-label">Scenario</span>
          <strong>{doc.scenarioLabel}</strong>
          <span>
            {doc.nodes.length} nodes · {doc.edges.length} edges ·{" "}
            {doc.directed ? "Directed" : "Undirected"}
          </span>
        </div>
        <div className="playback-progress">
          <span className={`activity-dot ${playback.isPlaying ? "is-running" : ""}`} />
          <span>
            {playback.isPlaying
              ? "Playing"
              : playback.isComplete
              ? "Complete"
              : activeResult
              ? `Step ${playback.stepIndex} of ${playback.totalSteps}`
              : "Paused"}
          </span>
          <code>{eventProgress} events</code>
        </div>
      </div>

      {inlineErrorMessage && (
        <div className="graph-inline-alert" role="alert">
          <span>{inlineErrorMessage}</span>
          <button
            type="button"
            className="alert-dismiss-btn"
            onClick={() => setInlineErrorMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="workspace-layout">
        <section className="grid-workspace graph-workspace" aria-label="Graph workspace">
          <GraphCanvas
            doc={doc}
            playbackSnapshot={playback.snapshot}
            activeTool={activeTool}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            connectSourceNodeId={connectSourceNodeId}
            onSelectNode={setSelectedNodeId}
            onSelectEdge={setSelectedEdgeId}
            onAddNodeAt={handleAddNodeAt}
            onConnectNodes={handleConnectNodes}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            onConnectSourceSelect={setConnectSourceNodeId}
            onAutoLayout={handleAutoLayout}
            onUpdateNodeLabel={handleUpdateNodeLabel}
            onUpdateNodeValue={handleUpdateNodeValue}
            onUpdateNodeColor={handleUpdateNodeColor}
            onSetStartNode={handleSetStartNode}
            onSetTargetNode={handleSetTargetNode}
            onUpdateEdgeWeight={handleUpdateEdgeWeight}
          />
          <div className="workspace-note">
            <span>{toolHelpText}</span>
            {algorithmWeightNotice && <strong>{algorithmWeightNotice}</strong>}
          </div>
        </section>

        <aside className="side-panel" aria-label="Algorithm details and run state">
          <AlgorithmPanel
            algorithm={algorithm}
            heuristic="zero"
            movementMode="four-way"
          />
          <MetricsPanel
            result={activeResult}
            frontierSize={playback.snapshot.frontierSize}
            visitedCount={playback.snapshot.visitedCount}
            stepIndex={playback.stepIndex}
            totalSteps={playback.totalSteps}
            isComplete={playback.isComplete}
            isPlaying={playback.isPlaying}
            playbackEnabled={true}
            statusRevealToken={statusRevealToken}
          />
          <GraphSummaryPanel doc={doc} />
        </aside>
      </div>

      <div id="comparison">
        <GraphComparisonPanel
          results={comparisonResults}
          activeAlgorithm={algorithm}
          onReplay={replay}
        />
      </div>
    </>
  );
}
