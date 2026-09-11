export type GraphNodeColor = "neutral" | "blue" | "cyan" | "amber" | "violet" | "rose";

export interface GraphNodePosition {
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  label: string;
  value?: string;
  position: GraphNodePosition;
  color?: GraphNodeColor;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface GraphDocument {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
  startNodeId: string | null;
  targetNodeId: string | null;
  scenarioLabel: string;
}

export interface GraphNeighbor {
  nodeId: string;
  edgeId: string;
  weight: number;
}

export type GraphAdjacencyList = Map<string, GraphNeighbor[]>;
