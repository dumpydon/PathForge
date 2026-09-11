import type { GraphSearchEvent } from "../algorithms/types";
import { applyGraphSearchEvents, createGraphPlaybackSnapshot } from "./reducer";
import type { GraphPlaybackSnapshot, GraphPlaybackTimeline } from "./types";

const CHECKPOINT_INTERVAL = 20;

export function computeGraphStepBoundaries(events: readonly GraphSearchEvent[]): number[] {
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

  // Final step boundary for path events (pathNode/pathEdge)
  if (events.length > lastBoundary) {
    boundaries.push(events.length);
  }

  return boundaries;
}

export function createGraphPlaybackTimeline(
  events: readonly GraphSearchEvent[],
): GraphPlaybackTimeline {
  const stepBoundaries = computeGraphStepBoundaries(events);
  const totalSteps = Math.max(0, stepBoundaries.length - 1);

  const snapshotCache = new Map<number, GraphPlaybackSnapshot>();
  snapshotCache.set(0, createGraphPlaybackSnapshot());

  const getSnapshotForStep = (stepIndex: number): GraphPlaybackSnapshot => {
    const targetStep = Math.max(0, Math.min(totalSteps, stepIndex));
    if (snapshotCache.has(targetStep)) {
      return snapshotCache.get(targetStep)!;
    }

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

      currentSnapshot = applyGraphSearchEvents(
        currentSnapshot,
        events.slice(fromCursor, toCursor),
      );
      currentStep = nextStep;

      if (currentStep % CHECKPOINT_INTERVAL === 0 || currentStep === targetStep) {
        snapshotCache.set(currentStep, currentSnapshot);
      }
    }

    return currentSnapshot;
  };

  const getStepIndexForCursor = (cursor: number): number => {
    if (cursor <= 0) return 0;
    if (cursor >= events.length) return totalSteps;

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

  const getSnapshotForCursor = (cursor: number): GraphPlaybackSnapshot => {
    const clampedCursor = Math.max(0, Math.min(events.length, cursor));
    if (clampedCursor === 0) return snapshotCache.get(0)!;

    const baseStep = getStepIndexForCursor(clampedCursor);
    const baseSnapshot = getSnapshotForStep(baseStep);
    const baseCursor = stepBoundaries[baseStep];

    if (baseCursor === clampedCursor) {
      return baseSnapshot;
    }

    return applyGraphSearchEvents(
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
