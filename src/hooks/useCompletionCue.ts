import { useEffect, useState, useSyncExternalStore } from "react";

export interface UseCompletionCueOptions {
  delayMs?: number;
  durationMs?: number;
}

/**
 * CompletionCueController
 *
 * Encapsulates the state machine for triggering a temporary completion cue.
 * Detects natural transition: previous !== complete && current === complete.
 *
 * Behaviors:
 * 1. Does not activate on initial component mount/page load.
 * 2. Activates only on rising edge: (!wasComplete && isComplete).
 * 3. Does not re-trigger while remaining complete across re-renders.
 * 4. Resets immediately when isComplete transitions back to false (reset, rewind).
 * 5. Re-arms so subsequent completions trigger the cue again.
 */
export class CompletionCueController {
  private isActive = false;
  private hasMounted = false;
  private prevIsComplete = false;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  public delayMs: number;
  public durationMs: number;

  constructor(options?: UseCompletionCueOptions) {
    this.delayMs = options?.delayMs ?? 100;
    this.durationMs = options?.durationMs ?? 2250;
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  public update(isComplete: boolean): void {
    if (!this.hasMounted) {
      this.hasMounted = true;
      this.prevIsComplete = isComplete;
      return;
    }

    const wasComplete = this.prevIsComplete;
    this.prevIsComplete = isComplete;

    if (!wasComplete && isComplete) {
      this.clearTimers();

      this.startTimer = setTimeout(() => {
        this.isActive = true;
        this.notify();
      }, this.delayMs);

      this.endTimer = setTimeout(() => {
        this.isActive = false;
        this.notify();
      }, this.delayMs + this.durationMs);
    } else if (!isComplete) {
      this.clearTimers();
      if (this.isActive) {
        this.isActive = false;
        this.notify();
      }
    }
  }

  public getIsActive = (): boolean => {
    return this.isActive;
  };

  public destroy(): void {
    this.clearTimers();
    this.listeners.clear();
  }

  private clearTimers(): void {
    if (this.startTimer) clearTimeout(this.startTimer);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.startTimer = null;
    this.endTimer = null;
  }
}

/**
 * useCompletionCue
 *
 * React hook to drive completion cues (e.g. glare sweep) on action buttons.
 */
export function useCompletionCue(
  isComplete: boolean,
  options?: UseCompletionCueOptions,
): boolean {
  const [controller] = useState(() => new CompletionCueController(options));

  useEffect(() => {
    controller.update(isComplete);
  }, [controller, isComplete]);

  useEffect(() => {
    return () => {
      controller.destroy();
    };
  }, [controller]);

  return useSyncExternalStore(
    controller.subscribe,
    controller.getIsActive,
    () => false,
  );
}
