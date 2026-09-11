import type { GraphDocument, GraphEdge } from "./types";

export const MIN_EDGE_WEIGHT = 0;
export const MAX_EDGE_WEIGHT = 999;
export const MAX_NODE_VALUE_LENGTH = 24;

export function isValidEdgeWeight(weight: number): boolean {
  return (
    Number.isInteger(weight) &&
    weight >= MIN_EDGE_WEIGHT &&
    weight <= MAX_EDGE_WEIGHT
  );
}

export function sanitizeEdgeWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 1;
  const intVal = Math.round(weight);
  return Math.max(MIN_EDGE_WEIGHT, Math.min(MAX_EDGE_WEIGHT, intVal));
}

export function sanitizeNodeValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_NODE_VALUE_LENGTH);
}

export function isSelfLoop(source: string, target: string): boolean {
  return source === target;
}

export function isDuplicateEdge(
  edges: readonly GraphEdge[],
  source: string,
  target: string,
  directed: boolean,
  ignoreEdgeId?: string,
): boolean {
  for (const edge of edges) {
    if (ignoreEdgeId && edge.id === ignoreEdgeId) continue;
    if (directed) {
      if (edge.source === source && edge.target === target) {
        return true;
      }
    } else {
      if (
        (edge.source === source && edge.target === target) ||
        (edge.source === target && edge.target === source)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function canConnect(
  doc: GraphDocument,
  source: string,
  target: string,
): { allowed: boolean; reason?: string } {
  if (isSelfLoop(source, target)) {
    return { allowed: false, reason: "Self-loops are not permitted." };
  }
  const sourceExists = doc.nodes.some((n) => n.id === source);
  const targetExists = doc.nodes.some((n) => n.id === target);
  if (!sourceExists || !targetExists) {
    return { allowed: false, reason: "Source or target node not found." };
  }
  if (isDuplicateEdge(doc.edges, source, target, doc.directed)) {
    return { allowed: false, reason: "That connection already exists." };
  }
  return { allowed: true };
}
