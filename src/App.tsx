"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runAlgorithm, runAllAlgorithms } from "./algorithms";
import type { AlgorithmId, HeuristicName } from "./algorithms/types";
import {
  isHeuristicCompatible,
  resolveHeuristicForMovement,
} from "./algorithms/heuristics";
import { PathForgeLogo } from "./components/Brand/PathForgeLogo";
import { BenchmarkGrid } from "./components/Grid/BenchmarkGrid";
import { GridBoard, type PaintTool } from "./components/Grid/GridBoard";
import { computeSearchVisualBounds } from "./components/Grid/searchEnergy";
import { AlgorithmPanel } from "./components/Panels/AlgorithmPanel";
import { ComparisonPanel } from "./components/Panels/ComparisonPanel";
import { MetricsPanel } from "./components/Panels/MetricsPanel";
import { NodeInspector } from "./components/Panels/NodeInspector";
import { Toolbar } from "./components/Toolbar/Toolbar";
import {
  clearTerrain,
  createCustomTerrain,
  createGrid,
  moveEndpoint,
  setTerrain,
  terrainCost,
} from "./core/grid";
import { isBenchmarkGrid } from "./core/gridDimensions";
import {
  coordinateKey,
  DEFAULT_CUSTOM_TERRAIN_COST,
  type Coordinate,
  type Grid,
  type MovementMode,
  type Terrain,
} from "./core/types";
import { ALGORITHM_INFO } from "./data/algorithmInfo";
import { usePlayback } from "./hooks/usePlayback";
import { randomObstacles } from "./mazes/random";
import { PRESETS, openFieldPreset, type PresetId } from "./mazes/presets";
import { recursiveDivision } from "./mazes/recursiveDivision";
import {
  createBoardSession,
  replaceBoard,
  resetBoardSearch,
  resizeBoard,
  type ComparisonResults,
} from "./state/boardSession";
import {
  canRedo,
  canUndo,
  createBoardHistory,
  gridsEqual,
  pushBoardAction,
  redoBoardAction,
  undoBoardAction,
  type BoardHistorySnapshot,
  type BoardHistoryState,
} from "./state/boardHistory";
import { GraphLab } from "./graph/components/GraphLab";
import { DEFAULT_GRAPH_PRESET } from "./graph/presets";
import {
  createGraphHistory,
  pushGraphAction,
  type GraphHistoryState,
} from "./graph/state/graphHistory";

export type LabMode = "grid" | "graph";

export default function App() {
  const [session, setSession] = useState(() =>
    createBoardSession(openFieldPreset(), "Random obstacles"),
  );
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const [boardHistory, setBoardHistory] = useState<BoardHistoryState>(() =>
    createBoardHistory({
      grid: openFieldPreset(),
      scenarioLabel: "Random obstacles",
      selectedCoordinate: openFieldPreset().start,
    }),
  );
  const dragStartSnapshotRef = useRef<BoardHistorySnapshot | null>(null);

  const [isInitialGridReady, setIsInitialGridReady] = useState(false);
  const hasGeneratedInitialGrid = useRef(false);
  const [algorithm, setAlgorithm] = useState<AlgorithmId>("astar");
  const [heuristic, setHeuristic] = useState<HeuristicName>("manhattan");
  const [movementMode, setMovementMode] = useState<MovementMode>("four-way");
  const [paintTool, setPaintTool] = useState<PaintTool>("wall");
  const [customTerrainCost, setCustomTerrainCost] = useState(DEFAULT_CUSTOM_TERRAIN_COST);
  const [logoReplayToken, setLogoReplayToken] = useState(0);
  const [statusRevealToken, setStatusRevealToken] = useState(0);

  // PathForge V2 — Lab Mode & Graph State
  const [labMode, setLabMode] = useState<LabMode>("grid");
  const [graphDirected, setGraphDirected] = useState(false);
  const [graphHistory, setGraphHistory] = useState<GraphHistoryState>(() =>
    createGraphHistory({ ...DEFAULT_GRAPH_PRESET, directed: false }),
  );

  const toggleGraphDirected = useCallback((nextDirected: boolean) => {
    setGraphDirected(nextDirected);
    setGraphHistory((curr) => {
      if (curr.present.directed === nextDirected) return curr;
      const nextDoc = { ...curr.present, directed: nextDirected };
      return pushGraphAction(curr, nextDoc);
    });
  }, []);

  useEffect(() => {
    if (hasGeneratedInitialGrid.current) return;
    hasGeneratedInitialGrid.current = true;

    const initialGrid = randomObstacles(openFieldPreset());
    const initialSession = createBoardSession(initialGrid, "Random obstacles");
    sessionRef.current = initialSession;
    setSession(initialSession);
    setBoardHistory(
      createBoardHistory({
        grid: initialGrid,
        scenarioLabel: "Random obstacles",
        selectedCoordinate: initialGrid.start,
      }),
    );
    setIsInitialGridReady(true);
  }, []);

  const { grid, activeResult, comparisonResults, selectedCoordinate, scenarioLabel } = session;
  const benchmarkMode = isBenchmarkGrid(grid);
  const searchBounds = useMemo(() => computeSearchVisualBounds(activeResult), [activeResult]);
  const playback = usePlayback(activeResult);
  const {
    load: loadPlayback,
    pause: pausePlayback,
    play: playPlayback,
    reset: resetPlayback,
    setSpeed: setPlaybackSpeed,
    step: stepPlayback,
  } = playback;

  const clearSearch = useCallback(() => {
    resetPlayback();
    setSession((current) => ({ ...current, activeResult: null }));
  }, [resetPlayback]);

  const resumePlayback = useCallback(() => {
    setLogoReplayToken((token) => token + 1);
    playPlayback();
  }, [playPlayback]);

  const replaceGrid = useCallback(
    (nextGrid: Grid, label: string) => {
      resetPlayback();
      dragStartSnapshotRef.current = null;
      const nextSnapshot: BoardHistorySnapshot = {
        grid: nextGrid,
        scenarioLabel: label,
        selectedCoordinate: nextGrid.start,
      };
      setBoardHistory((current) => pushBoardAction(current, nextSnapshot));
      setSession((current) => {
        const next = replaceBoard(current, nextGrid, label);
        sessionRef.current = next;
        return next;
      });
    },
    [resetPlayback],
  );

  const activateResult = useCallback(
    (result: ReturnType<typeof runAlgorithm>, autoplay: boolean) => {
      setStatusRevealToken((token) => token + 1);
      setSession((current) => ({ ...current, activeResult: result }));
      if (benchmarkMode) resetPlayback();
      else loadPlayback(result, autoplay);
    },
    [benchmarkMode, loadPlayback, resetPlayback],
  );

  const runSelected = useCallback(() => {
    setLogoReplayToken((token) => token + 1);
    const result = runAlgorithm(algorithm, grid, {
      heuristic,
      movementMode,
      recordEvents: !benchmarkMode,
    });
    activateResult(result, true);
  }, [activateResult, algorithm, benchmarkMode, grid, heuristic, movementMode]);

  const step = useCallback(() => {
    if (benchmarkMode) return;
    if (activeResult) {
      stepPlayback();
      return;
    }
    const result = runAlgorithm(algorithm, grid, {
      heuristic,
      movementMode,
      recordEvents: true,
    });
    setStatusRevealToken((token) => token + 1);
    setSession((current) => ({ ...current, activeResult: result }));
    loadPlayback(result, false);
    stepPlayback();
  }, [activeResult, algorithm, benchmarkMode, grid, heuristic, loadPlayback, movementMode, stepPlayback]);

  const previous = useCallback(() => {
    if (benchmarkMode) return;
    playback.previousStep();
  }, [benchmarkMode, playback]);

  const seek = useCallback(
    (stepIndex: number) => {
      if (benchmarkMode) return;
      playback.seekStep(stepIndex);
    },
    [benchmarkMode, playback],
  );

  const runAll = useCallback(() => {
    setLogoReplayToken((token) => token + 1);
    const results: ComparisonResults = runAllAlgorithms(grid, {
      heuristic,
      movementMode,
      recordEvents: !benchmarkMode,
    });
    const selected = results[algorithm]!;
    setStatusRevealToken((token) => token + 1);
    setSession((current) => ({ ...current, comparisonResults: results, activeResult: selected }));
    if (benchmarkMode) resetPlayback();
    else loadPlayback(selected, false);
  }, [algorithm, benchmarkMode, grid, heuristic, loadPlayback, movementMode, resetPlayback]);

  const replay = useCallback(
    (id: AlgorithmId) => {
      const result = comparisonResults[id];
      if (!result) return;
      setLogoReplayToken((token) => token + 1);
      setAlgorithm(id);
      activateResult(result, true);
    },
    [activateResult, comparisonResults],
  );

  const changeAlgorithm = useCallback(
    (nextAlgorithm: AlgorithmId) => {
      setAlgorithm(nextAlgorithm);
      clearSearch();
    },
    [clearSearch],
  );

  const changeHeuristic = useCallback((nextHeuristic: HeuristicName) => {
    if (isHeuristicCompatible(nextHeuristic, movementMode)) setHeuristic(nextHeuristic);
  }, [movementMode]);

  const changeMovementMode = useCallback((nextMovementMode: MovementMode) => {
    if (nextMovementMode === movementMode) return;

    resetPlayback();
    setMovementMode(nextMovementMode);
    setHeuristic((current) => resolveHeuristicForMovement(current, nextMovementMode));
    setSession(resetBoardSearch);
  }, [movementMode, resetPlayback]);

  const handleInteractionStart = useCallback(() => {
    if (dragStartSnapshotRef.current === null) {
      const currentSession = sessionRef.current;
      dragStartSnapshotRef.current = {
        grid: currentSession.grid,
        scenarioLabel: currentSession.scenarioLabel,
        selectedCoordinate: currentSession.selectedCoordinate,
      };
    }
  }, []);

  const handleInteractionEnd = useCallback(() => {
    const startSnapshot = dragStartSnapshotRef.current;
    dragStartSnapshotRef.current = null;
    if (!startSnapshot) return;

    const currentSession = sessionRef.current;
    if (!gridsEqual(startSnapshot.grid, currentSession.grid)) {
      setBoardHistory((current) =>
        pushBoardAction(
          { ...current, present: startSnapshot },
          {
            grid: currentSession.grid,
            scenarioLabel: currentSession.scenarioLabel,
            selectedCoordinate: currentSession.selectedCoordinate,
          },
        ),
      );
    }
  }, []);

  const paint = useCallback(
    (coordinate: Coordinate) => {
      const terrain: Terrain = paintTool === "erase"
        ? "normal"
        : paintTool === "custom"
        ? createCustomTerrain(customTerrainCost)
        : paintTool;
      resetPlayback();
      setSession((current) => {
        const nextGrid = setTerrain(current.grid, coordinate, terrain);
        const nextSession = {
          ...current,
          grid: nextGrid,
          scenarioLabel: "Custom board",
          comparisonResults: {},
          activeResult: null,
        };
        sessionRef.current = nextSession;

        if (dragStartSnapshotRef.current === null && !gridsEqual(current.grid, nextGrid)) {
          setBoardHistory((hist) =>
            pushBoardAction(hist, {
              grid: nextGrid,
              scenarioLabel: "Custom board",
              selectedCoordinate: coordinate,
            }),
          );
        }
        return nextSession;
      });
    },
    [customTerrainCost, paintTool, resetPlayback],
  );

  const moveGridEndpoint = useCallback(
    (endpoint: "start" | "target", coordinate: Coordinate) => {
      resetPlayback();
      setSession((current) => {
        const nextGrid = moveEndpoint(current.grid, endpoint, coordinate);
        const nextSession = {
          ...current,
          grid: nextGrid,
          selectedCoordinate: coordinate,
          scenarioLabel: "Custom board",
          comparisonResults: {},
          activeResult: null,
        };
        sessionRef.current = nextSession;

        if (dragStartSnapshotRef.current === null && !gridsEqual(current.grid, nextGrid)) {
          setBoardHistory((hist) =>
            pushBoardAction(hist, {
              grid: nextGrid,
              scenarioLabel: "Custom board",
              selectedCoordinate: coordinate,
            }),
          );
        }
        return nextSession;
      });
    },
    [resetPlayback],
  );

  const inspectCoordinate = useCallback((coordinate: Coordinate) => {
    setSession((current) => {
      const nextSession = { ...current, selectedCoordinate: coordinate };
      sessionRef.current = nextSession;
      return nextSession;
    });
  }, []);

  const resizeGrid = useCallback(
    (rows: number, cols: number) => {
      resetPlayback();
      dragStartSnapshotRef.current = null;
      const newGrid = createGrid(rows, cols);
      const label = `Custom · ${rows} × ${cols}`;
      const nextSnapshot: BoardHistorySnapshot = {
        grid: newGrid,
        scenarioLabel: label,
        selectedCoordinate: newGrid.start,
      };
      setBoardHistory((current) => pushBoardAction(current, nextSnapshot));
      setSession((current) => {
        const next = resizeBoard(current, rows, cols);
        sessionRef.current = next;
        return next;
      });
    },
    [resetPlayback],
  );

  const undo = useCallback(() => {
    if (benchmarkMode) return;
    dragStartSnapshotRef.current = null;
    setBoardHistory((current) => {
      const result = undoBoardAction(current);
      if (!result) return current;

      resetPlayback();
      const nextSession = {
        ...sessionRef.current,
        grid: result.restored.grid,
        scenarioLabel: result.restored.scenarioLabel,
        selectedCoordinate: result.restored.selectedCoordinate ?? result.restored.grid.start,
        activeResult: null,
        comparisonResults: {},
      };
      sessionRef.current = nextSession;
      setSession(nextSession);

      return result.state;
    });
  }, [benchmarkMode, resetPlayback]);

  const redo = useCallback(() => {
    if (benchmarkMode) return;
    dragStartSnapshotRef.current = null;
    setBoardHistory((current) => {
      const result = redoBoardAction(current);
      if (!result) return current;

      resetPlayback();
      const nextSession = {
        ...sessionRef.current,
        grid: result.restored.grid,
        scenarioLabel: result.restored.scenarioLabel,
        selectedCoordinate: result.restored.selectedCoordinate ?? result.restored.grid.start,
        activeResult: null,
        comparisonResults: {},
      };
      sessionRef.current = nextSession;
      setSession(nextSession);

      return result.state;
    });
  }, [benchmarkMode, resetPlayback]);

  const clearBoard = useCallback(() => {
    replaceGrid(clearTerrain(grid), "Open field");
  }, [grid, replaceGrid]);

  const loadPreset = useCallback(
    (id: PresetId) => {
      const preset = PRESETS.find((candidate) => candidate.id === id);
      if (preset) replaceGrid(preset.create(), preset.name);
    },
    [replaceGrid],
  );

  const generateRandom = useCallback(() => {
    replaceGrid(randomObstacles(clearTerrain(grid)), "Random obstacles");
  }, [grid, replaceGrid]);

  const generateDivisionMaze = useCallback(() => {
    replaceGrid(recursiveDivision(clearTerrain(grid)), "Recursive Maze");
  }, [grid, replaceGrid]);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (labMode !== "grid") return;

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
        if (benchmarkMode) runSelected();
        else if (playback.isPlaying) pausePlayback();
        else if (playback.isComplete) {
          // Completed final state: do not restart
        } else if (activeResult) resumePlayback();
        else runSelected();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step();
      } else if (event.key.toLowerCase() === "r") {
        clearSearch();
      } else if (event.key.toLowerCase() === "c") {
        clearBoard();
      } else if (event.key.toLowerCase() === "s") {
        step();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [activeResult, benchmarkMode, clearBoard, clearSearch, labMode, pausePlayback, playback.isComplete, playback.isPlaying, previous, redo, resumePlayback, runSelected, step, undo]);

  const selectedNode = selectedCoordinate
    ? playback.snapshot.nodes.get(coordinateKey(selectedCoordinate))
    : undefined;
  const visitedCount = useMemo(() => {
    let count = 0;
    for (const node of playback.snapshot.nodes.values()) {
      if (node.state === "closed" || node.state === "path") {
        count += 1;
      }
    }
    return count;
  }, [playback.snapshot.nodes]);
  const hasWeightedTerrain = useMemo(
    () => grid.terrain.some((terrain) => terrain !== "wall" && terrainCost(terrain) > 1),
    [grid.terrain],
  );
  const eventProgress = benchmarkMode
    ? "not recorded"
    : activeResult
    ? `${Math.min(playback.cursor, activeResult.events.length)} / ${activeResult.events.length}`
    : "0 / 0";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <PathForgeLogo replayToken={logoReplayToken} />
          <div>
            <div className="brand-line">
              <h1 className="pathforge-wordmark">PathForge</h1>
              <span className="version-tag">v2.0</span>
            </div>
            <p>Interactive graph-search laboratory</p>
          </div>
        </div>
        <div className="topbar-context">
          <div className="lab-switcher" aria-label="Lab mode">
            <span>Lab</span>
            <div className="movement-toggle">
              {(["grid", "graph"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={labMode === mode ? "is-active" : ""}
                  aria-pressed={labMode === mode}
                  onClick={() => setLabMode(mode)}
                >
                  {mode === "grid" ? (
                    <span className="grid-lab-label">Grid Lab</span>
                  ) : (
                    <span className="graph-lab-label">Graph Lab</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {labMode === "grid" ? (
            <div className="movement-control" aria-label="Movement">
              <span>Movement</span>
              <div className="movement-toggle">
                {(["four-way", "eight-way"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={movementMode === mode ? "is-active" : ""}
                    aria-pressed={movementMode === mode}
                    onClick={() => changeMovementMode(mode)}
                  >
                    {mode === "four-way" ? "4-way" : "8-way"}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="graph-edge-mode-control" aria-label="Graph edges">
              <span>Edges</span>
              <div className="movement-toggle">
                <button
                  type="button"
                  className={!graphDirected ? "is-active" : ""}
                  aria-pressed={!graphDirected}
                  onClick={() => toggleGraphDirected(false)}
                >
                  Undirected
                </button>
                <button
                  type="button"
                  className={graphDirected ? "is-active" : ""}
                  aria-pressed={graphDirected}
                  onClick={() => toggleGraphDirected(true)}
                >
                  Directed
                </button>
              </div>
            </div>
          )}

          <span className="topbar-meta">non-negative weights</span>
          <a href="#comparison">comparison</a>
        </div>
      </header>

      {labMode === "grid" ? (
        <>
          <Toolbar
        algorithm={algorithm}
        heuristic={heuristic}
        movementMode={movementMode}
        paintTool={paintTool}
        customTerrainCost={customTerrainCost}
        isPlaying={playback.isPlaying}
        isComplete={playback.isComplete}
        stepIndex={playback.stepIndex}
        totalSteps={playback.totalSteps}
        hasResult={Boolean(activeResult)}
        playbackEnabled={!benchmarkMode}
        editingEnabled={!benchmarkMode}
        canUndo={canUndo(boardHistory) && !benchmarkMode}
        canRedo={canRedo(boardHistory) && !benchmarkMode}
        onUndo={undo}
        onRedo={redo}
        rows={grid.rows}
        cols={grid.cols}
        speed={playback.speed}
        onAlgorithmChange={changeAlgorithm}
        onHeuristicChange={changeHeuristic}
        onPaintToolChange={setPaintTool}
        onCustomTerrainCostChange={setCustomTerrainCost}
        onRun={runSelected}
        onPause={pausePlayback}
        onResume={resumePlayback}
        onStep={step}
        onPrevious={previous}
        onSeek={seek}
        onReset={clearSearch}
        onClear={clearBoard}
        onRunAll={runAll}
        onPreset={loadPreset}
        onRandom={generateRandom}
        onRecursiveDivision={generateDivisionMaze}
        onSpeedChange={setPlaybackSpeed}
        onResize={resizeGrid}
        scenarioLabel={scenarioLabel}
      />

      <div className="workspace-meta">
        <div>
          <span className="meta-label">Scenario</span>
          <strong>{scenarioLabel}</strong>
          <span>{grid.rows} × {grid.cols} · {grid.rows * grid.cols} vertices</span>
        </div>
        <div className="playback-progress">
          <span className={`activity-dot ${playback.isPlaying ? "is-running" : ""}`} />
          <span>
            {benchmarkMode
              ? "Benchmark"
              : playback.isPlaying
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

      <div className="workspace-layout">
        <section className="grid-workspace" aria-label="Grid workspace">
          {benchmarkMode && (
            <div className="benchmark-notice" role="status">
              <strong>Large grid — benchmark mode enabled.</strong>
              <span>Event playback and cell-level editing are disabled to avoid excessive rendering and event-history overhead.</span>
            </div>
          )}
          <div
            className={`initial-grid-stage${isInitialGridReady ? "" : " is-pending"}`}
            aria-busy={!isInitialGridReady}
          >
            {benchmarkMode ? (
              <BenchmarkGrid
                grid={grid}
                result={activeResult}
                customTerrainCost={customTerrainCost}
                selectedCoordinate={selectedCoordinate}
                onInspect={inspectCoordinate}
              />
            ) : (
              <GridBoard
                grid={grid}
                snapshot={playback.snapshot}
                customTerrainCost={customTerrainCost}
                selectedCoordinate={selectedCoordinate}
                algorithm={algorithm}
                searchBounds={searchBounds}
                hasResult={Boolean(activeResult)}
                isComplete={playback.isComplete}
                cursor={playback.cursor}
                activeResult={activeResult}
                onInspect={inspectCoordinate}
                onPaint={paint}
                onMoveEndpoint={moveGridEndpoint}
                onInteractionStart={handleInteractionStart}
                onInteractionEnd={handleInteractionEnd}
              />
            )}
          </div>
          <div className="workspace-note">
            <span>{benchmarkMode
              ? "Canvas overview shows terrain, endpoints, and the final path. Use generators to create large benchmark maps."
              : "Drag S or T to reposition endpoints. Paint terrain with the active edit tool."}</span>
            {hasWeightedTerrain && (algorithm === "bfs" || algorithm === "dfs") && (
              <strong>{ALGORITHM_INFO[algorithm].name} ignores terrain cost when choosing its path.</strong>
            )}
          </div>
        </section>

        <aside className="side-panel" aria-label="Algorithm details and run state">
          <AlgorithmPanel
            algorithm={algorithm}
            heuristic={heuristic}
            movementMode={movementMode}
          />
          <MetricsPanel
            result={activeResult}
            frontierSize={playback.snapshot.frontierSize}
            visitedCount={visitedCount}
            stepIndex={playback.stepIndex}
            totalSteps={playback.totalSteps}
            isComplete={playback.isComplete}
            isPlaying={playback.isPlaying}
            playbackEnabled={!benchmarkMode}
            statusRevealToken={statusRevealToken}
          />
          <NodeInspector
            algorithm={algorithm}
            grid={grid}
            coordinate={selectedCoordinate}
            node={selectedNode}
            playbackEnabled={!benchmarkMode}
          />
        </aside>
      </div>

      <div id="comparison">
        <ComparisonPanel
          results={comparisonResults}
          activeAlgorithm={algorithm}
          hasWeightedTerrain={hasWeightedTerrain}
          playbackEnabled={!benchmarkMode}
          onReplay={replay}
        />
      </div>
        </>
      ) : (
        <GraphLab
          onLogoAnimation={() => setLogoReplayToken((token) => token + 1)}
          directed={graphDirected}
          onToggleDirected={toggleGraphDirected}
          history={graphHistory}
          onHistoryChange={setGraphHistory}
        />
      )}

      <footer className="app-footer">
        <p>Execution timing excludes animation and rendering. On small browser workloads, expanded-node counts are usually the more useful comparison.</p>
        <div className="shortcut-list" aria-label="Keyboard shortcuts">
          <span><kbd>Space</kbd> play / pause</span>
          <span><kbd>←</kbd> / <kbd>→</kbd> step back / forward</span>
          <span><kbd>Cmd/Ctrl+Z</kbd> undo</span>
          <span><kbd>Cmd/Ctrl+Shift+Z</kbd> redo</span>
          <span><kbd>S</kbd> step</span>
          <span><kbd>R</kbd> reset</span>
          <span><kbd>C</kbd> clear</span>
        </div>
      </footer>
    </main>
  );
}
