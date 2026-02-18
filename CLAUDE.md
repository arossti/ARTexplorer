# ARTexplorer - Claude Code Instructions

> **First time on this project?** Read `README.md` for mathematical foundations, architecture overview, and RT principles.

## Project Overview

**ARTexplorer** (Algebraic Rational Trigonometry Explorer) - Interactive 3D geometry visualization combining R. Buckminster Fuller's Synergetics with N.J. Wildberger's Rational Trigonometry.

- **Live Site**: https://arossti.github.io/ARTexplorer/
- **Architecture**: Client-side JavaScript/WebGL (THREE.js)
- **Documentation**: See `README.md` for overview, `Geometry documents/` for detailed docs

### Logs.md (Human/Agent Communication)

`Geometry documents/Logs.md` is a **pasteboard for human/agent communication**:
- Used for cut/pasting console output, errors, and debug info
- Does NOT update automatically - content is manually pasted by the user
- Never needs to be committed (local working file only)
- Read this file when user references "see logs" or similar

## Git Workflow

**Standard flow**: Pull main → Branch → Work → Test → Commit → Push → PR → Merge

### Critical Rules

- **ALWAYS push before switching branches** (unpushed = can be lost!)
- **Branch from main only** (never from feature branches)
- **Test locally before commits** - User prefers to verify before committing
- **NEVER commit large binary files** (PDFs, images) - local resources only

### Commit Format

Always use HEREDOC syntax for commit messages:

```bash
git commit -m "$(cat <<'EOF'
Type: Brief description of the change

🤖 Co-Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Andy🤦‍♂️ & Claude🤖 <andy@openbuilding.ca>
EOF
)"
```

**Commit types**: `Feat`, `Fix`, `Refactor`, `Docs`, `Improve`, `Clean`

### Pull Requests

```bash
gh pr create --title "Type: Brief description" --body "$(cat <<'EOF'
## Summary
- Bullet point summary of changes

## Changes
- Detailed list of what was modified

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Andy🤦‍♂️ & Claude🤖 <andy@openbuilding.ca>
EOF
)"
```

## Key Technical Concepts

### Coordinate Systems

- **Cartesian XYZ**: Traditional 3D coordinates
- **Quadray WXYZ**: Tetrahedral coordinates (4 basis vectors)
- Conversion in `modules/rt-math.js`

### Rational Trigonometry

- **Quadrance**: Q = a² (replaces distance)
- **Spread**: s = sin²θ (replaces angle)
- Maintains algebraic exactness until GPU boundary

### Core Modules

| File | Purpose | Key Exports |
|---|---|---|
| `modules/rt-math.js` | Quadray coords, rational trig | `RT` (quadrance, spread, nGonVertices, reflectInLine, PureRadicals, PurePhi), `Quadray` |
| `modules/rt-polyhedra.js` | Polyhedra generation (RT-pure) | `Polyhedra.tetrahedron(halfSize)`, `.cube()`, `.octahedron()`, `.icosahedron()`, `.dodecahedron()`, geodesic variants |
| `modules/rt-rendering.js` | WebGL scene, camera, rendering | `Rendering.createScene(config)` factory → API object with `updateGeometry()`, `renderPolyhedron()`, `getGridGroups()` |
| `modules/rt-init.js` | App orchestration, UI events | Wires DOM to rendering; imports all modules |
| `modules/rt-state-manager.js` | State persistence, undo/redo | `StateManager` — forms/instances state |
| `modules/rt-thomson.js` | Thomson great-circle shells | `Thomson.tetrahedron()`, `.octahedron()` → `{circles, nodes, edges, nGon, planeCount, coincidentCount}` |
| `modules/rt-grids.js` | Grid rendering (Cartesian/IVM) | `Grids` — polar grids, basis vectors |
| `modules/rt-delta.js` | View snapshot diff/apply | `ViewDelta` — captures/computes/applies UI state deltas |
| `modules/rt-animate.js` | View transition animation | `AnimationEngine` — dissolve, lerp, stepped ticks |
| `modules/rt-viewmanager.js` | View sequence management | Save/load/export view sequences as JSON |
| `modules/rt-filehandler.js` | Full scene import/export | Export entire scene state as JSON |

### Module Data Flow

```
rt-math.js (pure math, no THREE.js)
    ↓ vertices, coordinates
rt-polyhedra.js / rt-thomson.js (pure geometry, no THREE.js)
    ↓ {vertices, edges, faces} / {circles, nodes, edges}
rt-rendering.js (THREE.js scene management)
    ↓ groups, meshes, materials
rt-init.js (DOM ↔ rendering wiring)
    ↓ UI state snapshots
rt-delta.js → rt-animate.js → rt-viewmanager.js (view system)
```

### RT Concept Glossary

| Concept | Definition | Usage |
|---|---|---|
| **Quadrance** | Q = d² (squared distance) | Replaces distance; stays algebraic until GPU boundary |
| **Spread** | s = sin²(angle) | Replaces angle; range [0,1], always rational for rational inputs |
| **Deferred sqrt** | Keep in Q-space, take sqrt only at THREE.Vector3 creation | Maintains algebraic exactness through computation chain |
| **3021 Rule** | Quadray axis mapping: QW→D, QX→A, QY→C, QZ→B | Determines color/label assignments for tetrahedral planes |
| **Circumsphere** | Sphere through all polyhedron vertices | Thomson nodes lie on circumsphere → convex hull = polyhedron |
| **N-gon vertices** | `RT.nGonVertices(n, radius)` — algebraic polygon vertices | Used by Thomson circles; exact for n=3,4,5,6,8,10,12 |
| **Double reflection** | Two reflections = rotation by 2x angle | `RT.reflectInLine()` used for RT-pure rotation in Thomson |

## Development Guidelines

### Workflow: Inspect → Reason → Act → Verify

For every code change, follow this loop:

1. **Inspect** — Read the relevant code and surrounding context
2. **Reason** — Identify what needs to change, consider alternatives for non-trivial changes
3. **Act** — Make the minimal edit
4. **Verify** — User tests in browser; check console, visual rendering, state save/load

For **trivial changes** (typos, doc updates, single-line fixes): fast-path through the loop.
For **structural changes** (new modules, coordinate systems, geometry pipelines): use plan mode, decompose into independently verifiable steps, consider alternatives explicitly.

### General Rules

1. **Read before modifying** — Never propose changes to code you haven't read
2. **Maintain rational exactness** — Avoid premature decimal conversion (see RT Concept Glossary)
3. **Test in browser** — Verify geometry changes visually
4. **User tests before commits** — Do not assume changes need immediate commit

### When Modifying Geometry

Each step should be verified independently before proceeding:

1. **Vertex generation** — Rational exactness (check console for "Max error")
2. **Face winding** — Counter-clockwise (outward normals) for backface culling
3. **Coordinate modes** — Test in both Cartesian and Quadray
4. **State persistence** — Test state saves/loads correctly
5. **View system** — If adding new controls, wire them into `rt-delta.js` for view capture/restore
