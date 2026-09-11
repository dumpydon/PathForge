# PathForge V2

PathForge is an interactive algorithm visualization laboratory for exploring, testing, and comparing graph search algorithms across spatial grids and free-form topological graphs.

**[Live Demo](https://pathforge.dumpydon.workers.dev)**

PathForge V2 introduces a dual-lab architecture featuring two specialized environments side-by-side:
1. **Grid Lab**: 2D weighted spatial grids, obstacle mazes, 4-way / 8-way movement, and A* heuristic exploration up to 90,000 cells.
2. **Graph Lab**: Free-form topological node/edge laboratory supporting directed and undirected graphs, weighted edges (0–999), deterministic DFS / BFS / Dijkstra search, ELK auto-layout, playback scrubber, and side-by-side comparison.

PathForge is 100% client-side, zero-backend, and deployed on Cloudflare Workers.

---

## The Two Labs

### 1. Grid Lab
- **Topologies**: 4-way orthogonal movement and 8-way movement with corner cutting prevention.
- **Terrain**: Normal (cost 1), Mud (cost 3), Water (cost 5), Impassable Walls, and Custom terrain weights (1–100).
- **Algorithms**: BFS, DFS, Dijkstra, and A* Search.
- **A\* Heuristics**: Manhattan and Euclidean (4-way); Octile and Euclidean (8-way). Admissibility guarantees and live formula visualization.
- **Scenarios & Generators**: Open Field, Weighted Detour, Narrow Maze, Dense Obstacles, No Path, Random Obstacles, and Recursive Division mazes.
- **Benchmark Mode**: Seamlessly scales from 5 × 5 to 300 × 300 (90,000 cells), automatically switching to high-performance canvas rendering above 10,000 vertices.

### 2. Graph Lab
- **Free-Form Canvas**: Interactive infinite-canvas graph editor powered by `@xyflow/react` with dot grid, smooth panning, and responsive zooming.
- **Node & Edge CRUD**:
  - Add nodes by double-clicking canvas or via the Node tool.
  - Connect nodes with interactive bezier handles.
  - Delete nodes/edges with backspace/delete or the Delete tool.
  - Set custom node values and color accents (neutral, blue, cyan, amber, violet, rose).
  - Designate Start (S) and Target (T) nodes with distinctive visual badges.
  - Edit edge weights directly in-canvas or via the Inspector (integers 0–999).
- **Graph Topologies**: Switch dynamically between **Undirected** and **Directed** edge modes.
- **Algorithms Supported**:
  - **DFS**: Explicit stack, depth-first reachability traversal with deterministic neighbor ordering.
  - **BFS**: FIFO queue traversal with guaranteed fewest edge hops.
  - **Dijkstra**: Binary min-heap optimal weighted search with non-negative edge relaxation and tie-breaking.
- **Auto-Layout**: Automatic hierarchical layout engine powered by `elkjs` (`layered` algorithm).
- **Deterministic Presets**:
  - *Weighted Detour*: Educational scenario contrasting BFS (fewest edges, higher cost) vs Dijkstra (more edges, lowest cost).
  - *Balanced Tree*: 15-node binary tree contrasting DFS depth traversal vs BFS level-by-level queue expansion.
  - *Cyclic Network*: Multi-loop interconnected graph demonstrating cycle avoidance and visited set efficiency.
  - *Disconnected Graph*: Multi-component graph with isolated clusters demonstrating unreachable targets.
  - *Dense Network*: Lattice-based dense network with weighted shortcuts.
  - *Dependency DAG*: Directed build, test, and deploy workflow graph.
- **Timeline & Playback**:
  - Play, Pause, Next Step, Previous Step, Reset, and Speed controls (0.25× to 5×).
  - Interactive Scrubber slider with real-time state visualization.
  - Search snapshots cached every 20 steps with binary search lookup.
- **Multi-Algorithm Comparison**:
  - Run all algorithms simultaneously on the identical graph document.
  - Compare path found, cost, length, discovered count, expanded count, max frontier size, and execution time.
  - Instant replay of any algorithm's recorded execution.
- **Undo / Redo**: 60-action bounded history across all node/edge operations, weights, layouts, and clear operations.

---

## Comparison of Algorithms

| Algorithm | Frontier Structure | Time Complexity | Spatial / Graph Guarantee |
| --- | --- | --- | --- |
| **BFS** | FIFO Queue | `O(V + E)` | Guaranteed shortest path in edge hops (unweighted) |
| **DFS** | Explicit Stack | `O(V + E)` | Reachability traversal; no shortest path guarantee |
| **Dijkstra** | Binary Min-Heap | `O((V + E) log V)` | Guaranteed minimum cost path for non-negative weights |
| **A\*** | Binary Min-Heap | Worst case `O((V + E) log V)` | Guaranteed minimum cost path using admissible heuristics |

---

## Architecture

```text
               ┌───────────────────────┐
               │    PathForge V2 UI    │
               │  [Grid Lab | Graph Lab]│
               └───────────┬───────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │  Grid Session   │         │  Graph History  │
    │  - Flat Terrain │         │  - GraphDoc     │
    │  - Grid Heuristics│       │  - Bounded undo │
    └────────┬────────┘         └────────┬────────┘
             │                           │
             ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │  Grid Engine    │         │  Graph Engine   │
    │  (BFS,DFS,      │         │  (DFS,BFS,      │
    │   Dijkstra, A*) │         │   Dijkstra)     │
    └────────┬────────┘         └────────┬────────┘
             │                           │
             ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │  Grid Playback  │         │  Graph Playback │
    │  - Cell batches │         │  - Checkpoints  │
    │  - Time cursor  │         │  - Node/Edge Map│
    └─────────────────┘         └─────────────────┘
```

- **Clean Lab Separation**: Grid Lab and Graph Lab maintain completely decoupled state trees. Switching between labs never destroys or mutates the other lab's state or history.
- **Zero Backend / Serverless**: 100% client-side computation. All algorithms, ELK auto-layout, and timeline reducers execute locally in the browser.
- **Direct Cloudflare Workers Deployment**: Built using Vite and Vinext without any external cloud database, websocket, or authentication dependencies.

---

## Keyboard Shortcuts

### Grid Lab
- `Space`: Run / Pause playback
- `S`: Single step forward
- `R`: Reset active search
- `C`: Clear board terrain

### Graph Lab
- `Space`: Run / Pause search playback
- `S` or `ArrowRight`: Step forward
- `ArrowLeft`: Step backward
- `R`: Reset active search
- `Cmd+Z` / `Ctrl+Z`: Undo graph modification
- `Cmd+Shift+Z` / `Ctrl+Shift+Z`: Redo graph modification
- `Delete` / `Backspace`: Delete selected node or edge

---

## Local Development

Requires Node.js 22.13 or newer.

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

### Verification & Quality Gates

```bash
# Run unit test suite (159+ tests)
npm test

# Run TypeScript typecheck
npm run typecheck

# Run ESLint check
npm run lint

# Build production bundle for Cloudflare Workers
npm run build
```
