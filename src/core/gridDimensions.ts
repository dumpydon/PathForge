export const MIN_GRID_DIMENSION = 5;
export const MAX_GRID_DIMENSION = 300;
export const DEFAULT_GRID_ROWS = 21;
export const DEFAULT_GRID_COLS = 39;
export const MAX_INTERACTIVE_VERTICES = 10_000;

export interface GridDimensions {
  rows: number;
  cols: number;
}

export interface GridSizePreset extends GridDimensions {
  id: "small" | "default" | "medium" | "expanded" | "large" | "huge" | "stress" | string;
  label: string;
}

export const GRID_SIZE_PRESETS: readonly GridSizePreset[] = [
  { id: "small", label: "Small", rows: 15, cols: 25 },
  { id: "default", label: "Default", rows: DEFAULT_GRID_ROWS, cols: DEFAULT_GRID_COLS },
  { id: "medium", label: "Medium", rows: 30, cols: 50 },
  { id: "expanded", label: "Expanded", rows: 40, cols: 70 },
  { id: "large", label: "Large", rows: 50, cols: 80 },
  { id: "huge", label: "Huge", rows: 70, cols: 100 },
  { id: "stress", label: "Stress", rows: 100, cols: 100 },
];

export function gridDimensionError(rows: number, cols: number): string | null {
  if (!Number.isFinite(rows) || !Number.isFinite(cols)) {
    return "Rows and columns must be numbers.";
  }

  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    return "Rows and columns must be whole numbers.";
  }

  if (
    rows < MIN_GRID_DIMENSION ||
    cols < MIN_GRID_DIMENSION ||
    rows > MAX_GRID_DIMENSION ||
    cols > MAX_GRID_DIMENSION ||
    rows * cols > MAX_INTERACTIVE_VERTICES
  ) {
    return `(Use ${MIN_GRID_DIMENSION}–${MAX_GRID_DIMENSION} for row and col and <=${MAX_INTERACTIVE_VERTICES} row*col )`;
  }

  return null;
}

export function assertSupportedGridDimensions(rows: number, cols: number): void {
  if (!Number.isFinite(rows) || !Number.isFinite(cols)) {
    throw new Error("Rows and columns must be numbers.");
  }

  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    throw new Error("Rows and columns must be whole numbers.");
  }

  if (
    rows < MIN_GRID_DIMENSION ||
    cols < MIN_GRID_DIMENSION ||
    rows > MAX_GRID_DIMENSION ||
    cols > MAX_GRID_DIMENSION
  ) {
    throw new Error(`Use ${MIN_GRID_DIMENSION}–${MAX_GRID_DIMENSION} rows and columns.`);
  }
}

export function isBenchmarkGrid(dimensions: GridDimensions): boolean {
  return dimensions.rows * dimensions.cols > MAX_INTERACTIVE_VERTICES;
}

