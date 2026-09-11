import { describe, expect, it } from "vitest";
import {
  createGraphHistory,
  pushGraphAction,
  undoGraphAction,
  redoGraphAction,
  canUndoGraph,
  canRedoGraph,
  MAX_GRAPH_HISTORY_ENTRIES,
} from "../graph/state/graphHistory";
import {
  addNode,
  deleteNode,
  addEdge,
  deleteEdge,
  updateEdgeWeight,
  updateNode,
  setStartNode,
  setTargetNode,
  clearGraph,
  createEmptyGraphDocument,
} from "../graph/domain/graph";

describe("Graph History & Undo / Redo", () => {
  it("initializes with empty past and future and can neither undo nor redo", () => {
    const doc = createEmptyGraphDocument();
    const history = createGraphHistory(doc);
    expect(canUndoGraph(history)).toBe(false);
    expect(canRedoGraph(history)).toBe(false);
    expect(undoGraphAction(history)).toBeNull();
    expect(redoGraphAction(history)).toBeNull();
  });

  it("does not push identical document to history", () => {
    const doc = createEmptyGraphDocument();
    let history = createGraphHistory(doc);
    history = pushGraphAction(history, doc);
    expect(history.past).toHaveLength(0);
  });

  it("supports undo and redo for adding and deleting nodes", () => {
    let history = createGraphHistory(createEmptyGraphDocument());

    const { doc: d1 } = addNode(history.present, { x: 10, y: 10 });
    history = pushGraphAction(history, d1);
    expect(history.present.nodes).toHaveLength(1);
    expect(canUndoGraph(history)).toBe(true);

    // Undo add
    const undoAdd = undoGraphAction(history);
    expect(undoAdd).not.toBeNull();
    history = undoAdd!.state;
    expect(history.present.nodes).toHaveLength(0);
    expect(canRedoGraph(history)).toBe(true);

    // Redo add
    const redoAdd = redoGraphAction(history);
    expect(redoAdd).not.toBeNull();
    history = redoAdd!.state;
    expect(history.present.nodes).toHaveLength(1);

    // Delete node
    const nodeId = history.present.nodes[0].id;
    const d2 = deleteNode(history.present, nodeId);
    history = pushGraphAction(history, d2);
    expect(history.present.nodes).toHaveLength(0);

    // Undo delete
    const undoDel = undoGraphAction(history);
    history = undoDel!.state;
    expect(history.present.nodes).toHaveLength(1);
  });

  it("supports undo and redo for adding and deleting edges", () => {
    let history = createGraphHistory(createEmptyGraphDocument());
    const { doc: d1, newNode: nA } = addNode(history.present, { x: 0, y: 0 });
    const { doc: d2, newNode: nB } = addNode(d1, { x: 50, y: 0 });
    history = pushGraphAction(history, d2);

    const { doc: d3, newEdge } = addEdge(history.present, nA.id, nB.id, 5);
    history = pushGraphAction(history, d3);
    expect(history.present.edges).toHaveLength(1);

    // Undo edge addition
    const undoEdge = undoGraphAction(history);
    history = undoEdge!.state;
    expect(history.present.edges).toHaveLength(0);

    // Redo edge addition
    const redoEdge = redoGraphAction(history);
    history = redoEdge!.state;
    expect(history.present.edges).toHaveLength(1);

    // Delete edge
    const d4 = deleteEdge(history.present, newEdge!.id);
    history = pushGraphAction(history, d4);
    expect(history.present.edges).toHaveLength(0);

    // Undo edge deletion
    const undoDeleteEdge = undoGraphAction(history);
    history = undoDeleteEdge!.state;
    expect(history.present.edges).toHaveLength(1);
  });

  it("supports undo and redo for edge weight modifications", () => {
    let history = createGraphHistory(createEmptyGraphDocument());
    const { doc: d1, newNode: nA } = addNode(history.present, { x: 0, y: 0 });
    const { doc: d2, newNode: nB } = addNode(d1, { x: 50, y: 0 });
    const { doc: d3, newEdge } = addEdge(d2, nA.id, nB.id, 5);
    history = pushGraphAction(history, d3);

    const d4 = updateEdgeWeight(history.present, newEdge!.id, 42);
    history = pushGraphAction(history, d4);
    expect(history.present.edges[0].weight).toBe(42);

    // Undo weight change
    const undoWeight = undoGraphAction(history);
    history = undoWeight!.state;
    expect(history.present.edges[0].weight).toBe(5);

    // Redo weight change
    const redoWeight = redoGraphAction(history);
    history = redoWeight!.state;
    expect(history.present.edges[0].weight).toBe(42);
  });

  it("supports undo and redo for node properties, start/target assignment, and clear graph", () => {
    let history = createGraphHistory(createEmptyGraphDocument());
    const { doc: d1, newNode: nA } = addNode(history.present, { x: 0, y: 0 });
    const { doc: d2, newNode: nB } = addNode(d1, { x: 50, y: 0 });
    history = pushGraphAction(history, d2);

    // Node label and color change
    const d3 = updateNode(history.present, nA.id, { label: "Alpha", color: "cyan" });
    history = pushGraphAction(history, d3);
    expect(history.present.nodes[0].label).toBe("Alpha");
    expect(history.present.nodes[0].color).toBe("cyan");

    // Set start node
    const dStart = setStartNode(history.present, nB.id);
    history = pushGraphAction(history, dStart);
    expect(history.present.startNodeId).toBe(nB.id);

    // Set target node
    const dTarget = setTargetNode(history.present, nA.id);
    history = pushGraphAction(history, dTarget);
    expect(history.present.targetNodeId).toBe(nA.id);

    // Undo target
    history = undoGraphAction(history)!.state;
    expect(history.present.targetNodeId).not.toBe(nA.id);

    // Clear graph
    const d4 = clearGraph(history.present);
    history = pushGraphAction(history, d4);
    expect(history.present.nodes).toHaveLength(0);

    // Undo clear
    const undoClear = undoGraphAction(history);
    history = undoClear!.state;
    expect(history.present.nodes).toHaveLength(2);
    expect(history.present.nodes[0].label).toBe("Alpha");
  });

  it("clears future redo stack when a new action is pushed after undo", () => {
    let history = createGraphHistory(createEmptyGraphDocument());
    const { doc: d1 } = addNode(history.present, { x: 10, y: 10 });
    history = pushGraphAction(history, d1);

    const { doc: d2 } = addNode(history.present, { x: 20, y: 20 });
    history = pushGraphAction(history, d2);

    // Undo second node
    history = undoGraphAction(history)!.state;
    expect(canRedoGraph(history)).toBe(true);
    expect(history.future).toHaveLength(1);

    // Push new third node instead
    const { doc: d3 } = addNode(history.present, { x: 99, y: 99 });
    history = pushGraphAction(history, d3);

    // Future stack should be discarded
    expect(canRedoGraph(history)).toBe(false);
    expect(history.future).toHaveLength(0);
  });

  it("enforces the MAX_GRAPH_HISTORY_ENTRIES (60) bound and drops the oldest entry", () => {
    let history = createGraphHistory(createEmptyGraphDocument());

    for (let i = 0; i < MAX_GRAPH_HISTORY_ENTRIES + 15; i++) {
      const { doc } = addNode(history.present, { x: i * 5, y: 0 });
      history = pushGraphAction(history, doc);
    }

    expect(history.past.length).toBe(MAX_GRAPH_HISTORY_ENTRIES);
  });
});
