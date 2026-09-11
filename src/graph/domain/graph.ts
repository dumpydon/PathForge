import type { GraphDocument, GraphEdge, GraphNode, GraphNodePosition } from "./types";
import { canConnect, isValidEdgeWeight, sanitizeEdgeWeight, sanitizeNodeValue } from "./validation";

export function createEmptyGraphDocument(scenarioLabel = "Custom graph"): GraphDocument {
  return {
    nodes: [],
    edges: [],
    directed: false,
    startNodeId: null,
    targetNodeId: null,
    scenarioLabel,
  };
}

let nextIdCounter = 1;
export function generateId(prefix = "node"): string {
  return `${prefix}-${Date.now().toString(36)}-${(nextIdCounter++).toString(36)}`;
}

export function getNextNodeLabel(existingNodes: readonly GraphNode[]): string {
  const existingValues = new Set<string>();
  for (const n of existingNodes) {
    if (n.value !== undefined && n.value.trim() !== "") {
      existingValues.add(n.value.trim());
    }
    if (n.label) {
      existingValues.add(n.label.trim());
    }
  }

  let index = 0;
  while (true) {
    const candidate = String(index);
    if (!existingValues.has(candidate)) {
      return candidate;
    }
    index++;
  }
}

export function addNode(
  doc: GraphDocument,
  position: GraphNodePosition,
  customLabel?: string,
  customValue?: string,
): { doc: GraphDocument; newNode: GraphNode } {
  const defaultVal = getNextNodeLabel(doc.nodes);
  const label = customLabel ?? defaultVal;
  const value = customValue !== undefined ? customValue : (customLabel ? undefined : defaultVal);
  const newNode: GraphNode = {
    id: generateId("node"),
    label,
    value,
    position,
    color: "neutral",
  };

  const nextDoc: GraphDocument = {
    ...doc,
    nodes: [...doc.nodes, newNode],
    // If no start node exists yet, assign this first node as start
    startNodeId: doc.startNodeId === null ? newNode.id : doc.startNodeId,
    // If start is set but target is not, and this is the second node, assign as target
    targetNodeId:
      doc.startNodeId !== null && doc.targetNodeId === null && doc.startNodeId !== newNode.id
        ? newNode.id
        : doc.targetNodeId,
  };

  return { doc: nextDoc, newNode };
}

export function deleteNode(doc: GraphDocument, nodeId: string): GraphDocument {
  const nodes = doc.nodes.filter((n) => n.id !== nodeId);
  const edges = doc.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);

  return {
    ...doc,
    nodes,
    edges,
    startNodeId: doc.startNodeId === nodeId ? null : doc.startNodeId,
    targetNodeId: doc.targetNodeId === nodeId ? null : doc.targetNodeId,
  };
}

export function addEdge(
  doc: GraphDocument,
  source: string,
  target: string,
  weight = 1,
): { doc: GraphDocument; newEdge: GraphEdge | null; error?: string } {
  const check = canConnect(doc, source, target);
  if (!check.allowed) {
    return { doc, newEdge: null, error: check.reason };
  }

  const validWeight = isValidEdgeWeight(weight) ? weight : sanitizeEdgeWeight(weight);
  const newEdge: GraphEdge = {
    id: generateId("edge"),
    source,
    target,
    weight: validWeight,
  };

  return {
    doc: {
      ...doc,
      edges: [...doc.edges, newEdge],
    },
    newEdge,
  };
}

export function deleteEdge(doc: GraphDocument, edgeId: string): GraphDocument {
  return {
    ...doc,
    edges: doc.edges.filter((e) => e.id !== edgeId),
  };
}

export function updateEdgeWeight(
  doc: GraphDocument,
  edgeId: string,
  weight: number,
): GraphDocument {
  const sanitized = sanitizeEdgeWeight(weight);
  return {
    ...doc,
    edges: doc.edges.map((e) => (e.id === edgeId ? { ...e, weight: sanitized } : e)),
  };
}

export function updateNode(
  doc: GraphDocument,
  nodeId: string,
  updates: Partial<Pick<GraphNode, "label" | "value" | "color" | "position">>,
): GraphDocument {
  return {
    ...doc,
    nodes: doc.nodes.map((node) => {
      if (node.id !== nodeId) return node;
      return {
        ...node,
        ...(updates.label !== undefined ? { label: updates.label.trim() || node.label } : {}),
        ...(updates.value !== undefined ? { value: sanitizeNodeValue(updates.value) } : {}),
        ...(updates.color !== undefined ? { color: updates.color } : {}),
        ...(updates.position !== undefined ? { position: updates.position } : {}),
      };
    }),
  };
}

export function setStartNode(doc: GraphDocument, nodeId: string | null): GraphDocument {
  if (nodeId !== null && !doc.nodes.some((n) => n.id === nodeId)) return doc;
  return {
    ...doc,
    startNodeId: nodeId,
    targetNodeId: doc.targetNodeId === nodeId ? null : doc.targetNodeId,
  };
}

export function setTargetNode(doc: GraphDocument, nodeId: string | null): GraphDocument {
  if (nodeId !== null && !doc.nodes.some((n) => n.id === nodeId)) return doc;
  return {
    ...doc,
    targetNodeId: nodeId,
    startNodeId: doc.startNodeId === nodeId ? null : doc.startNodeId,
  };
}

export function setGraphDirected(doc: GraphDocument, directed: boolean): GraphDocument {
  if (doc.directed === directed) return doc;
  return {
    ...doc,
    directed,
  };
}

export function clearGraph(doc: GraphDocument): GraphDocument {
  return {
    ...doc,
    nodes: [],
    edges: [],
    startNodeId: null,
    targetNodeId: null,
    scenarioLabel: "Empty graph",
  };
}

export function graphDocumentsEqual(a: GraphDocument, b: GraphDocument): boolean {
  if (
    a.directed !== b.directed ||
    a.startNodeId !== b.startNodeId ||
    a.targetNodeId !== b.targetNodeId ||
    a.scenarioLabel !== b.scenarioLabel ||
    a.nodes.length !== b.nodes.length ||
    a.edges.length !== b.edges.length
  ) {
    return false;
  }

  for (let i = 0; i < a.nodes.length; i++) {
    const na = a.nodes[i];
    const nb = b.nodes[i];
    if (
      na.id !== nb.id ||
      na.label !== nb.label ||
      na.value !== nb.value ||
      na.color !== nb.color ||
      na.position.x !== nb.position.x ||
      na.position.y !== nb.position.y
    ) {
      return false;
    }
  }

  for (let i = 0; i < a.edges.length; i++) {
    const ea = a.edges[i];
    const eb = b.edges[i];
    if (
      ea.id !== eb.id ||
      ea.source !== eb.source ||
      ea.target !== eb.target ||
      ea.weight !== eb.weight
    ) {
      return false;
    }
  }

  return true;
}
