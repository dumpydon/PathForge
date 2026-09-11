"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphSearchResult } from "../algorithms/types";
import { applyGraphSearchEvents, createGraphPlaybackSnapshot } from "./reducer";
import { createGraphPlaybackTimeline } from "./timeline";
import type { GraphPlaybackSnapshot } from "./types";

export type PlaybackStatus = "idle" | "running" | "paused" | "completed";

export interface GraphPlaybackController {
  status: PlaybackStatus;
  snapshot: GraphPlaybackSnapshot;
  cursor: number;
  stepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  isComplete: boolean;
  speed: number;
  setSpeed: (speed: number) => void;
  load: (result: GraphSearchResult, autoplay?: boolean) => void;
  play: () => void;
  pause: () => void;
  step: () => void;
  nextStep: () => void;
  previousStep: () => void;
  seekStep: (stepIndex: number) => void;
  reset: () => void;
}

export function useGraphPlayback(
  activeResult: GraphSearchResult | null,
): GraphPlaybackController {
  const [snapshot, setSnapshot] = useState(createGraphPlaybackSnapshot);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(55);
  const timerRef = useRef<number | null>(null);
  const resultRef = useRef<GraphSearchResult | null>(activeResult);

  useEffect(() => {
    resultRef.current = activeResult;
  }, [activeResult]);

  const timeline = useMemo(() => {
    return activeResult && activeResult.events.length > 0
      ? createGraphPlaybackTimeline(activeResult.events)
      : null;
  }, [activeResult]);

  const clearActiveTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearActiveTimer();
    setIsPlaying(false);
    setCursor(0);
    setSnapshot(createGraphPlaybackSnapshot());
  }, [clearActiveTimer]);

  const load = useCallback(
    (result: GraphSearchResult, autoplay = true) => {
      clearActiveTimer();
      resultRef.current = result;
      setSnapshot(createGraphPlaybackSnapshot());
      setCursor(0);
      setIsPlaying(autoplay && result.events.length > 0);
    },
    [clearActiveTimer],
  );

  const play = useCallback(() => {
    const result = resultRef.current;
    if (!result || result.events.length === 0) return;
    if (cursor >= result.events.length) return;

    clearActiveTimer();
    setIsPlaying(true);
  }, [clearActiveTimer, cursor]);

  const pause = useCallback(() => {
    clearActiveTimer();
    setIsPlaying(false);
  }, [clearActiveTimer]);

  const previousStep = useCallback(() => {
    if (!timeline) return;
    clearActiveTimer();
    setIsPlaying(false);

    const currentStep = timeline.getStepIndexForCursor(cursor);
    const baseCursor = timeline.stepBoundaries[currentStep];

    const targetStep =
      cursor > baseCursor ? currentStep : Math.max(0, currentStep - 1);

    const targetCursor = timeline.stepBoundaries[targetStep];
    const targetSnapshot = timeline.getSnapshotForStep(targetStep);

    setCursor(targetCursor);
    setSnapshot(targetSnapshot);
  }, [clearActiveTimer, cursor, timeline]);

  const nextStep = useCallback(() => {
    if (!timeline) return;
    clearActiveTimer();
    setIsPlaying(false);

    const currentStep = timeline.getStepIndexForCursor(cursor);
    const targetStep = Math.min(timeline.totalSteps, currentStep + 1);

    const targetCursor = timeline.stepBoundaries[targetStep];
    const targetSnapshot = timeline.getSnapshotForStep(targetStep);

    setCursor(targetCursor);
    setSnapshot(targetSnapshot);
  }, [clearActiveTimer, cursor, timeline]);

  const seekStep = useCallback(
    (stepIndex: number) => {
      if (!timeline) return;
      clearActiveTimer();
      setIsPlaying(false);

      const targetStep = Math.max(0, Math.min(timeline.totalSteps, stepIndex));
      const targetCursor = timeline.stepBoundaries[targetStep];
      const targetSnapshot = timeline.getSnapshotForStep(targetStep);

      setCursor(targetCursor);
      setSnapshot(targetSnapshot);
    },
    [clearActiveTimer, timeline],
  );

  useEffect(() => {
    if (
      !isPlaying ||
      !activeResult ||
      !timeline ||
      cursor >= activeResult.events.length
    ) {
      clearActiveTimer();
      return;
    }

    const eventsPerFrame = Math.max(1, Math.round(speed / 14));
    const frameDelay = Math.max(12, 78 - speed * 0.65);

    timerRef.current = window.setTimeout(() => {
      const nextCursor = Math.min(
        activeResult.events.length,
        cursor + eventsPerFrame,
      );
      setSnapshot((current) =>
        applyGraphSearchEvents(
          current,
          activeResult.events.slice(cursor, nextCursor),
        ),
      );
      setCursor(nextCursor);
      if (nextCursor >= activeResult.events.length) {
        setIsPlaying(false);
      }
    }, frameDelay);

    return () => clearActiveTimer();
  }, [activeResult, clearActiveTimer, cursor, isPlaying, speed, timeline]);

  const setSpeed = useCallback((nextSpeed: number) => {
    setSpeedState(Math.min(100, Math.max(1, nextSpeed)));
  }, []);

  const totalSteps = timeline ? timeline.totalSteps : 0;
  const stepIndex = timeline ? timeline.getStepIndexForCursor(cursor) : 0;
  const isComplete = Boolean(
    activeResult &&
      cursor >= activeResult.events.length &&
      activeResult.events.length > 0,
  );
  const effectiveIsPlaying = isPlaying && !isComplete;

  const status: PlaybackStatus = !activeResult
    ? "idle"
    : effectiveIsPlaying
    ? "running"
    : isComplete
    ? "completed"
    : "paused";

  return {
    status,
    snapshot,
    cursor,
    stepIndex,
    totalSteps,
    isPlaying: effectiveIsPlaying,
    isComplete,
    speed,
    setSpeed,
    load,
    play,
    pause,
    step: nextStep,
    nextStep,
    previousStep,
    seekStep,
    reset,
  };
}
