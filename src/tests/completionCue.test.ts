import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CompletionCueController } from "../hooks/useCompletionCue";
import { Toolbar } from "../components/Toolbar/Toolbar";
import { GraphToolbar } from "../graph/components/GraphToolbar";

describe("Completion Cue Controller & Toolbars", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("CompletionCueController state machine", () => {
    it("is inactive initially and does not fire on initial mount when not complete", () => {
      const listener = vi.fn();
      const controller = new CompletionCueController({ delayMs: 100, durationMs: 1500 });
      controller.subscribe(listener);

      controller.update(false);

      expect(controller.getIsActive()).toBe(false);
      expect(listener).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);
      expect(controller.getIsActive()).toBe(false);
      expect(listener).not.toHaveBeenCalled();
    });

    it("does not fire on initial mount even if already complete (e.g. page load or lab switch)", () => {
      const listener = vi.fn();
      const controller = new CompletionCueController({ delayMs: 100, durationMs: 1500 });
      controller.subscribe(listener);

      controller.update(true);

      expect(controller.getIsActive()).toBe(false);
      expect(listener).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);
      expect(controller.getIsActive()).toBe(false);
      expect(listener).not.toHaveBeenCalled();
    });

    it("activates on natural transition from not-complete to complete after delay", () => {
      const listener = vi.fn();
      const controller = new CompletionCueController({ delayMs: 100, durationMs: 2250 });
      controller.subscribe(listener);

      // Mount while not complete
      controller.update(false);
      expect(controller.getIsActive()).toBe(false);

      // Natural completion transition
      controller.update(true);

      // Before delay (e.g. 50ms), cue has not started yet
      vi.advanceTimersByTime(50);
      expect(controller.getIsActive()).toBe(false);
      expect(listener).not.toHaveBeenCalled();

      // At delay (100ms), cue activates
      vi.advanceTimersByTime(50);
      expect(controller.getIsActive()).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);

      // During duration (1500ms), remains active
      vi.advanceTimersByTime(1500);
      expect(controller.getIsActive()).toBe(true);

      // At total time (100ms + 2250ms = 2350ms), cue deactivates
      vi.advanceTimersByTime(750);
      expect(controller.getIsActive()).toBe(false);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("does not repeatedly fire while state remains complete across re-renders", () => {
      const listener = vi.fn();
      const controller = new CompletionCueController({ delayMs: 100, durationMs: 2250 });
      controller.subscribe(listener);

      controller.update(false);
      controller.update(true);

      // Advance past delay and duration so cue finishes
      vi.advanceTimersByTime(2350);
      expect(controller.getIsActive()).toBe(false);
      expect(listener).toHaveBeenCalledTimes(2); // activated at 100ms, deactivated at 2350ms

      // Redundant update while still complete
      controller.update(true);
      vi.advanceTimersByTime(3000);

      // Should NOT have triggered again
      expect(controller.getIsActive()).toBe(false);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("immediately cancels active cue when reset or scrubbed backwards", () => {
      const listener = vi.fn();
      const controller = new CompletionCueController({ delayMs: 100, durationMs: 2250 });
      controller.subscribe(listener);

      controller.update(false);
      controller.update(true);

      // Advance to active state (100ms)
      vi.advanceTimersByTime(100);
      expect(controller.getIsActive()).toBe(true);

      // User resets search or scrubs back at 300ms
      vi.advanceTimersByTime(200);
      controller.update(false);

      // Must be deactivated immediately
      expect(controller.getIsActive()).toBe(false);
      expect(listener).toHaveBeenCalledTimes(2); // activated at 100ms, deactivated at 300ms

      // Advance further; no unexpected timer fires
      vi.advanceTimersByTime(3000);
      expect(controller.getIsActive()).toBe(false);
    });

    it("re-arms so that a subsequent completion triggers the cue again", () => {
      const listener = vi.fn();
      const controller = new CompletionCueController({ delayMs: 100, durationMs: 2250 });
      controller.subscribe(listener);

      // Run 1: completes
      controller.update(false);
      controller.update(true);
      vi.advanceTimersByTime(2350);
      expect(controller.getIsActive()).toBe(false);

      // Reset
      controller.update(false);

      // Run 2: completes again
      controller.update(true);
      vi.advanceTimersByTime(100);
      expect(controller.getIsActive()).toBe(true);

      vi.advanceTimersByTime(2250);
      expect(controller.getIsActive()).toBe(false);
    });

    it("cleans up pending timers on destroy", () => {
      const listener = vi.fn();
      const controller = new CompletionCueController({ delayMs: 100, durationMs: 2250 });
      controller.subscribe(listener);

      controller.update(false);
      controller.update(true);

      // Destroy before delay fires
      controller.destroy();

      vi.advanceTimersByTime(3000);
      expect(controller.getIsActive()).toBe(false);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Grid Lab Toolbar markup integration", () => {
    const defaultGridToolbarProps = {
      algorithm: "bfs" as const,
      heuristic: "manhattan" as const,
      movementMode: "four-way" as const,
      paintTool: "wall" as const,
      customTerrainCost: 3,
      isPlaying: false,
      isComplete: false,
      stepIndex: 0,
      totalSteps: 10,
      hasResult: true,
      playbackEnabled: true,
      editingEnabled: true,
      canUndo: false,
      canRedo: false,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      rows: 20,
      cols: 20,
      speed: 50,
      onAlgorithmChange: vi.fn(),
      onHeuristicChange: vi.fn(),
      onPaintToolChange: vi.fn(),
      onCustomTerrainCostChange: vi.fn(),
      onRun: vi.fn(),
      onPause: vi.fn(),
      onResume: vi.fn(),
      onStep: vi.fn(),
      onPrevious: vi.fn(),
      onSeek: vi.fn(),
      onReset: vi.fn(),
      onClear: vi.fn(),
      onRunAll: vi.fn(),
      onPreset: vi.fn(),
      onRandom: vi.fn(),
      onRecursiveDivision: vi.fn(),
      onSpeedChange: vi.fn(),
      onResize: vi.fn(),
    };

    it("renders Reset search and Clear board without completion-glare when not complete", () => {
      const html = renderToStaticMarkup(
        React.createElement(Toolbar, {
          ...defaultGridToolbarProps,
          isComplete: false,
        }),
      );

      // Verify both buttons exist with base classes
      expect(html).toContain("Reset search");
      expect(html).toContain("Clear board");

      // Verify completion-glare is not present on initial render
      expect(html).not.toContain("completion-glare");
    });

    it("renders Reset search and Clear board without completion-glare on initial render even if isComplete is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(Toolbar, {
          ...defaultGridToolbarProps,
          isComplete: true,
        }),
      );

      // Initial mount must not trigger completion-glare
      expect(html).not.toContain("completion-glare");
    });
  });

  describe("Graph Lab GraphToolbar markup integration", () => {
    const defaultGraphToolbarProps = {
      algorithm: "dfs" as const,
      activeTool: "select" as const,
      isPlaying: false,
      isComplete: false,
      stepIndex: 0,
      totalSteps: 5,
      hasResult: true,
      canUndo: false,
      canRedo: false,
      speed: 50,
      scenarioLabel: "Default",
      onAlgorithmChange: vi.fn(),
      onToolChange: vi.fn(),
      onRun: vi.fn(),
      onPause: vi.fn(),
      onResume: vi.fn(),
      onStep: vi.fn(),
      onPrevious: vi.fn(),
      onSeek: vi.fn(),
      onReset: vi.fn(),
      onClearGraph: vi.fn(),
      onPreset: vi.fn(),
      onAutoLayout: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onSpeedChange: vi.fn(),
      onRunAll: vi.fn(),
    };

    it("renders Reset search and Clear graph without completion-glare when not complete", () => {
      const html = renderToStaticMarkup(
        React.createElement(GraphToolbar, {
          ...defaultGraphToolbarProps,
          isComplete: false,
        }),
      );

      expect(html).toContain("Reset search");
      expect(html).toContain("Clear graph");
      expect(html).not.toContain("completion-glare");
    });

    it("renders Reset search and Clear graph without completion-glare on initial render even if isComplete is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(GraphToolbar, {
          ...defaultGraphToolbarProps,
          isComplete: true,
        }),
      );

      expect(html).not.toContain("completion-glare");
    });
  });
});
