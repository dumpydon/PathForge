import type { GraphDocument } from "../domain/types";

export type GraphPresetId =
  | "weighted-detour"
  | "balanced-tree"
  | "leetcode-graph"
  | "cyclic-network"
  | "disconnected-graph"
  | "dense-network"
  | "dependency-dag"
  | "large-network";

export interface GraphPreset {
  id: GraphPresetId;
  name: string;
  description: string;
  create: () => GraphDocument;
}
