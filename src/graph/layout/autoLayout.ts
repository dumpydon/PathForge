import ELK from "elkjs/lib/elk.bundled.js";
import type { GraphDocument, GraphNode } from "../domain/types";

let elkInstance: InstanceType<typeof ELK> | null = null;

function getElk(): InstanceType<typeof ELK> {
  if (!elkInstance) {
    elkInstance = new ELK();
  }
  return elkInstance;
}

export interface LayoutOptions {
  direction?: "DOWN" | "RIGHT";
  nodeSpacing?: number;
  layerSpacing?: number;
}

export async function layoutGraph(
  doc: GraphDocument,
  options: LayoutOptions = {},
): Promise<GraphDocument> {
  if (doc.nodes.length === 0) {
    return doc;
  }

  const elk = getElk();
  const direction = options.direction ?? (doc.directed ? "RIGHT" : "DOWN");
  const nodeSpacing = options.nodeSpacing ?? 64;
  const layerSpacing = options.layerSpacing ?? 80;

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.spacing.nodeNode": String(nodeSpacing),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(layerSpacing),
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.cycleBreaking.strategy": "GREEDY",
      "elk.spacing.edgeNode": "32",
      "elk.spacing.edgeEdge": "24",
    },
    children: doc.nodes.map((n) => ({
      id: n.id,
      width: 56,
      height: 56,
    })),
    edges: doc.edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layoutResult = await elk.layout(elkGraph);
  const positionMap = new Map<string, { x: number; y: number }>();

  if (layoutResult.children) {
    for (const child of layoutResult.children) {
      if (child.x !== undefined && child.y !== undefined) {
        positionMap.set(child.id, {
          x: Math.round(child.x),
          y: Math.round(child.y),
        });
      }
    }
  }

  const updatedNodes: GraphNode[] = doc.nodes.map((node) => {
    const newPos = positionMap.get(node.id);
    if (!newPos) return node;
    return {
      ...node,
      position: newPos,
    };
  });

  return {
    ...doc,
    nodes: updatedNodes,
  };
}
