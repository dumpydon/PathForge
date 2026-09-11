"use client";

import { useState, type CSSProperties } from "react";
import { ALGORITHM_INFO } from "../../data/algorithmInfo";
import type { GraphAlgorithmId } from "../algorithms/types";
import { GRAPH_PRESETS, type GraphPresetId } from "../presets";
import type { GraphEditorTool } from "./GraphCanvas";

const GRAPH_ALGORITHM_ORDER: GraphAlgorithmId[] = ["dfs", "bfs", "dijkstra"];

interface GraphToolbarProps {
  algorithm: GraphAlgorithmId;
  activeTool: GraphEditorTool;
  isPlaying: boolean;
  isComplete: boolean;
  stepIndex: number;
  totalSteps: number;
  hasResult: boolean;
  canUndo: boolean;
  canRedo: boolean;
  speed: number;
  scenarioLabel?: string;
  onAlgorithmChange: (algorithm: GraphAlgorithmId) => void;
  onToolChange: (tool: GraphEditorTool) => void;
  onRun: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onPrevious: () => void;
  onSeek: (stepIndex: number) => void;
  onReset: () => void;
  onClearGraph: () => void;
  onPreset: (presetId: GraphPresetId) => void;
  onAutoLayout: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSpeedChange: (speed: number) => void;
  onRunAll: () => void;
}

const TOOL_DEFINITIONS: Array<{ id: GraphEditorTool; label: string; icon: string; tooltip: string }> = [
  { id: "select", label: "Select", icon: "↖", tooltip: "Select and drag elements" },
  { id: "node", label: "Node", icon: "+", tooltip: "Add node" },
  { id: "connect", label: "Connect", icon: "⚯", tooltip: "Connect two nodes" },
  { id: "delete", label: "Delete", icon: "✕", tooltip: "Delete selected element" },
];

export function GraphToolbar(props: GraphToolbarProps) {
  const [playClickToken, setPlayClickToken] = useState(0);

  const selectedPreset = GRAPH_PRESETS.find(
    (p) => p.name.toLowerCase() === props.scenarioLabel?.toLowerCase(),
  );
  const selectedPresetId = selectedPreset ? selectedPreset.id : "";

  return (
    <section className="toolbar graph-toolbar" aria-label="Graph Lab controls">
      {/* Primary Row: Algorithm switcher & Playback engine */}
      <div className="toolbar-row toolbar-primary">
        <div className="control-group algorithm-switcher" aria-label="Algorithm">
          <div className="segmented-control">
            {GRAPH_ALGORITHM_ORDER.map((alg) => (
              <button
                key={alg}
                type="button"
                className={props.algorithm === alg ? "is-active" : ""}
                aria-pressed={props.algorithm === alg}
                onClick={() => props.onAlgorithmChange(alg)}
              >
                {ALGORITHM_INFO[alg].name}
              </button>
            ))}
          </div>
        </div>

        <div className="playback-actions" role="region" aria-label="Playback controls">
          {props.hasResult && props.totalSteps > 0 && (
            <div className="timeline-stepper">
              <span className="step-counter" aria-live="polite">
                Step {props.stepIndex} / {props.totalSteps}
              </span>
              <input
                type="range"
                className={`timeline-scrubber ${props.stepIndex >= props.totalSteps ? "is-complete" : ""}`}
                min={0}
                max={props.totalSteps}
                value={props.stepIndex}
                onChange={(e) => props.onSeek(Number(e.target.value))}
                style={
                  {
                    "--timeline-progress": `${Math.min(100, Math.max(0, (props.stepIndex / props.totalSteps) * 100))}%`,
                    "--timeline-progress-color":
                      props.stepIndex >= props.totalSteps ? "var(--path)" : "var(--accent)",
                  } as CSSProperties
                }
                aria-label="Graph visualization timeline scrubber"
                title={`Timeline scrubber (Step ${props.stepIndex} of ${props.totalSteps})`}
              />
            </div>
          )}

          <div className="playback-button-group" role="group" aria-label="Step and playback controls">
            <button
              type="button"
              className="button playback-btn"
              onClick={props.onPrevious}
              disabled={props.stepIndex <= 0 || !props.hasResult}
              aria-label="Previous step (Left Arrow)"
              title="Previous step (Left Arrow)"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              className={`button playback-btn ${props.isPlaying ? "is-playing" : "button-primary"}`}
              onClick={() => {
                if (!props.isPlaying) {
                  setPlayClickToken((t) => t + 1);
                }
                if (props.isPlaying) props.onPause();
                else if (props.hasResult) props.onResume();
                else props.onRun();
              }}
              disabled={props.isComplete && props.hasResult}
              aria-label={props.isPlaying ? "Pause (Space)" : "Play (Space)"}
              title={props.isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {playClickToken > 0 && (
                <span key={playClickToken} className="play-btn-ripple" aria-hidden="true" />
              )}
              <span aria-hidden="true">{props.isPlaying ? "⏸" : "▶"}</span>
              <span className="playback-btn-label">{props.isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              className="button playback-btn"
              onClick={props.onStep}
              disabled={props.hasResult && props.stepIndex >= props.totalSteps}
              aria-label="Next step (Right Arrow)"
              title="Next step (Right Arrow)"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <button
            type="button"
            className="button playback-action-btn"
            onClick={props.onReset}
          >
            <svg
              className="playback-btn-icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M 13.5 8.5 A 5.5 5.5 0 1 1 8 2.5 c 2.2 0 4.1 1.1 5.1 2.8" />
              <polyline points="13.5 2 13.5 5.5 10 5.5" />
            </svg>
            <span>Reset search</span>
          </button>
          <button
            type="button"
            className="button playback-action-btn"
            onClick={props.onClearGraph}
            title="Clear graph (C)"
          >
            <svg
              className="playback-btn-icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M 2.5 13.5 h 11" />
              <path d="M 4.8 13.5 L 2.8 11.5 a 1.2 1.2 0 0 1 0 -1.7 L 8.3 4.3 a 1.2 1.2 0 0 1 1.7 0 l 2.7 2.7 a 1.2 1.2 0 0 1 0 1.7 L 9 13.5 Z" />
              <line x1="6.2" y1="8.8" x2="9.4" y2="12" />
            </svg>
            <span>Clear graph</span>
          </button>
        </div>

        <label className="speed-control">
          <span className="control-label">Speed</span>
          <input
            type="range"
            min="1"
            max="100"
            value={props.speed}
            onChange={(e) => props.onSpeedChange(Number(e.target.value))}
            aria-label="Playback speed"
          />
        </label>
      </div>

      {/* Secondary Row: Graph Editor Tools */}
      <div className="toolbar-row toolbar-secondary">
        <div className="control-group">
          <div className="tool-buttons">
            {TOOL_DEFINITIONS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={props.activeTool === tool.id ? "is-active" : ""}
                aria-pressed={props.activeTool === tool.id}
                onClick={() => props.onToolChange(tool.id)}
                title={tool.tooltip}
              >
                <span aria-hidden="true">{tool.icon}</span>
                {tool.label}
              </button>
            ))}
          </div>
        </div>

        <div className="graph-preset-control" aria-label="Graph presets">
          <span className="preset-control-label">Presets</span>
          <label className="select-control preset-select">
            <span className="sr-only">Graph Presets</span>
            <select
              value={selectedPresetId}
              aria-label="Graph presets"
              onChange={(e) => {
                if (e.target.value) props.onPreset(e.target.value as GraphPresetId);
              }}
              title="Load a predefined graph preset"
            >
              <option value="" disabled>
                Select preset...
              </option>
              {GRAPH_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          className="button auto-layout-btn"
          onClick={props.onAutoLayout}
          title="Arrange graph automatically"
        >
          Auto layout
        </button>

        <div className="toolbar-spacer" />

        <div className="history-buttons" role="group" aria-label="Graph history">
          <button
            type="button"
            className="history-btn"
            onClick={props.onUndo}
            disabled={!props.canUndo}
            aria-label="Undo (Cmd/Ctrl + Z)"
            title="Undo (Cmd/Ctrl + Z)"
          >
            <svg
              className="history-btn-icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M 12 13.5 V 6 a 4 4 0 0 0 -8 0 v 7.5" />
              <polyline points="1.2 9.7 4 13.5 6.8 9.7" />
            </svg>
            <span className="history-btn-label">Undo</span>
          </button>
          <button
            type="button"
            className="history-btn"
            onClick={props.onRedo}
            disabled={!props.canRedo}
            aria-label="Redo (Cmd/Ctrl + Shift + Z / Ctrl + Y)"
            title="Redo (Cmd/Ctrl + Shift + Z / Ctrl + Y)"
          >
            <svg
              className="history-btn-icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M 4 13.5 V 6 a 4 4 0 0 1 8 0 v 7.5" />
              <polyline points="9.2 9.7 12 13.5 14.8 9.7" />
            </svg>
            <span className="history-btn-label">Redo</span>
          </button>
        </div>

        <button type="button" className="button" onClick={props.onRunAll}>
          Run all
        </button>
      </div>
    </section>
  );
}
