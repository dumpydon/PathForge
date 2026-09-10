import type { SearchEvent } from "../algorithms/types";
import { applySearchEvents, createPlaybackSnapshot } from "./reducer";
import type { PlaybackSnapshot, PlaybackTimeline } from "./types";

const CHECKPOINT_INTERVAL = 20;

/**
 * Computes deterministic step boundaries for an array of SearchEvents.
 * Step 0: cursor = 0 (initial unexpanded state).
 * Step 1..N: after each 'closed' event (each completed expansion).
 * Step N+1: after path events (if path events exist).
 */
export function computeStepBoundaries(events: readonly SearchEvent[]): number[] {
  if (events.length === 0) return [0];

  const boundaries: number[] = [0];
  let lastBoundary = 0;

  for (let i = 0; i < events.length; i += 1) {
    if (events[i].type === "closed") {
      const boundary = i + 1;
      if (boundary > lastBoundary) {
        boundaries.push(boundary);
        lastBoundary = boundary;
      }
    }
  }

  // If there are remaining events (e.g. path reconstruction events), add the final boundary
  if (events.length > lastBoundary) {
    boundaries.push(events.length);
  }

  return boundaries;
}

export function createPlaybackTimeline(events: readonly SearchEvent[]): PlaybackTimeline {
  const stepBoundaries = computeStepBoundaries(events);
  const totalSteps = stepBoundaries.length - 1;

  // Cache snapshots at checkpoint steps for O(1) jump and low memory
  const snapshotCache = new Map<number, PlaybackSnapshot>();
  snapshotCache.set(0, createPlaybackSnapshot());

  const getSnapshotForStep = (stepIndex: number): PlaybackSnapshot => {
    const targetStep = Math.max(0, Math.min(totalSteps, stepIndex));
    if (snapshotCache.has(targetStep)) {
      return snapshotCache.get(targetStep)!;
    }

    // Find the nearest preceding cached step
    let nearestStep = 0;
    for (const cachedStep of snapshotCache.keys()) {
      if (cachedStep <= targetStep && cachedStep > nearestStep) {
        nearestStep = cachedStep;
      }
    }

    let currentSnapshot = snapshotCache.get(nearestStep)!;
    let currentStep = nearestStep;

    while (currentStep < targetStep) {
      const nextStep = Math.min(targetStep, currentStep + 1);
      const fromCursor = stepBoundaries[currentStep];
      const toCursor = stepBoundaries[nextStep];

      currentSnapshot = applySearchEvents(
        currentSnapshot,
        events.slice(fromCursor, toCursor),
      );
      currentStep = nextStep;

      // Cache if it's a checkpoint step or the target step
      if (currentStep % CHECKPOINT_INTERVAL === 0 || currentStep === targetStep) {
        snapshotCache.set(currentStep, currentSnapshot);
      }
    }

    return currentSnapshot;
  };

  const getStepIndexForCursor = (cursor: number): number => {
    if (cursor <= 0) return 0;
    if (cursor >= events.length) return totalSteps;

    // Binary search to find the largest stepIndex where stepBoundaries[stepIndex] <= cursor
    let low = 0;
    let high = totalSteps;
    let result = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (stepBoundaries[mid] <= cursor) {
        result = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return result;
  };

  const getSnapshotForCursor = (cursor: number): PlaybackSnapshot => {
    const clampedCursor = Math.max(0, Math.min(events.length, cursor));
    if (clampedCursor === 0) return snapshotCache.get(0)!;

    const baseStep = getStepIndexForCursor(clampedCursor);
    const baseSnapshot = getSnapshotForStep(baseStep);
    const baseCursor = stepBoundaries[baseStep];

    if (baseCursor === clampedCursor) {
      return baseSnapshot;
    }

    // Apply the intermediate events between baseStep and cursor
    return applySearchEvents(
      baseSnapshot,
      events.slice(baseCursor, clampedCursor),
    );
  };

  return {
    events,
    stepBoundaries,
    totalSteps,
    getSnapshotForStep,
    getSnapshotForCursor,
    getStepIndexForCursor,
  };
}
