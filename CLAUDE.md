# ARTexplorer - Claude Code Instructions

> **First time on this project?** Read `README.md` for mathematical foundations, architecture overview, and RT principles.

## Project Overview

**ARTexplorer** (Algebraic Rational Trigonometry Explorer) - Interactive 3D geometry visualization combining R. Buckminster Fuller's Synergetics with N.J. Wildberger's Rational Trigonometry.

- **Live Site**: https://arossti.github.io/ARTexplorer/
- **Architecture**: Client-side JavaScript/WebGL (THREE.js)
- **Documentation**: `README.md` (Sections 5.2–5.3: file tree, module overview), `Geometry Documents/` for feature docs
- **Adding new polyhedra?** Follow `Geometry Documents/Add-Polyhedra-Guide.md` — 7-step ecosystem checklist covering geometry → rendering → UI → bindings → init → filehandler → testing

### Project Documentation System

The project uses four types of documents, each serving a distinct role in the human-agent workflow:

| Document | Role | Lifecycle |
|---|---|---|
| **CLAUDE.md** (this file) | Static project instructions — read every session | Keep constant-sized; archive stale entries to feature docs |
| **MEMORY.md** (agent-private) | Persistent cross-session lessons learned | Actively prune and promote; record failures with provenance |
| **Feature docs** (`Geometry Documents/*.md`) | Per-feature living design docs (plan + execution trace) | Archive to `Geometry Archived/` when feature stabilizes |
| **Logs.md** | Human/agent communication pasteboard | Never committed; ephemeral per-session |

**Logs.md** (`Geometry Documents/Logs.md`):
- Used for cut/pasting console output, errors, and debug info
- Does NOT update automatically — content is manually pasted by the user
- Never needs to be committed (local working file only)
- Read this file when user references "see logs" or similar

**Feature docs** (e.g., `Thomson-Polyhedra.md`, `Polygon-Rationalize.md`):
- Record both the design plan AND the actual execution trace (commits, deviations, resolutions)
- Include verification targets with concrete pass/fail criteria
- When a cross-cutting lesson emerges, promote it to MEMORY.md
- Archive to `Geometry Documents/Geometry Archived/` when the feature is stable

**CODE-QUALITY-AUDIT.md** — Periodic quality gate and RT-purity enforcement (see `Geometry Documents/CODE-QUALITY-AUDIT.md`)

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

### RT-Purity: The Cardinal Rule

**This application is an RT and Quadray/Synergetics explorer.** Agents naturally default to classical trig (Pi, Sin, Cos, Tan, Theta, radicals) — this undermines the project's core purpose.

**`modules/rt-math.js` is our bible.** Before using any classical trig function, check what RT provides:

| Instead of... | Use RT equivalent | Source |
|---|---|---|
| `Math.sin(θ)` / `Math.cos(θ)` | `RT.nGonVertices(n, r)` — algebraic polygon vertices via Wildberger reflection | `rt-math.js` — `nGonVertices()` |
| `Math.atan2(y, x)` | `RT.slopeFromSpread()` or spread-based orientation | `rt-math.js` — slope/spread |
| `angle = arccos(dot)` | `spread = 1 - dot²/(Q₁·Q₂)` | `rt-math.js` — `RT.spread()` |
| `distance = √(dx²+dy²)` | `quadrance = dx²+dy²` — defer √ to THREE.Vector3 boundary | `rt-math.js` — `RT.quadrance()` |
| `rotation by θ` | Two reflections via `RT.reflectInLine(x, y, slope)` | `rt-math.js` — double reflection |
| `φ = (1+√5)/2` then `φ²` | `PurePhi.value()`, `.squared()` = φ+1, `.inverse()` = φ-1 | `rt-math.js` — `PurePhi` |
| `√2`, `√3`, `√6` | `PureRadicals.sqrt2()`, `.sqrt3()`, `.sqrt6()` (cached) | `rt-math.js` — `PureRadicals` |
| `cos(2π/7)` etc. | `PureCubics.heptagon()`, `.nonagon()` (cached cubic roots) | `rt-math.js` — `PureCubics` |
| Decimal polygon coords | `SymbolicCoord` — exact `(a+b√D)/c` for N=3,4,5,6,8,10,12 | `rt-math.js` — `SymbolicCoord` |

**When in doubt, consult source material:**
- N.J. Wildberger, *Divine Proportions* — available at `Geometry Documents/Wildberger References/`
- R.B. Fuller, *Synergetics* — available at `Geometry Documents/Wildberger References/`

**The sole justified boundary** is the **THREE.js rendering handoff** — camera, controls, `Vector3` creation, rotation matrices. Our 4D Quadray system squashes down to XYZ coordinate geometry only here, because THREE.js knows nothing about RT. Until we build a purpose-built 4D rendering pipeline (planned: Rust + Swift/Metal native macOS app), this is the necessary compromise. **All geometry upstream of this boundary must remain RT-pure.**

Specific cases at this boundary (each requires a `// Math.X justified:` comment):
- `Math.PI` / `Math.sin` / `Math.cos` in THREE.js rotation matrices and grid alignment
- `Math.sqrt()` at the final `Vector3` creation (deferred from quadrance space)
- UX degree↔radian conversion at slider boundaries (the rotation *itself* uses `RT.reflectInLine()`)
- **Demo modules** explicitly comparing RT vs classical results (educational only)

**Why this discipline matters beyond correctness:** RT-pure code ports cleanly to any future rendering backend. Classical trig leakage becomes migration debt.

### RT-Purity in the Rust/Native Codebase

The native macOS app (`artex-osx/`) has its own RT-pure engine: `rt_math/` (quadrance, spread, Quadray ABCD, Wildberger polygons, PurePhi, PureRadicals, PureCubics) and `rt_polyhedra/` (all 6 Platonics in Quadray coordinates). **The same RT-purity rules apply — no `f64::sin()`, `f64::cos()`, `std::f64::consts::PI` in geometry code.** The rendering boundary is wgpu/WGSL (not THREE.js). `glam` is used only for camera matrices. See `artex-osx/docs/RUST-METAL-BABYSTEPS.md` § "Agent Handoff" for the complete Rust-specific rules.

## Native App Build Workflow (artex-osx)

When working on the Rust/Metal native app (`artex-osx/`), follow this build-test-deploy cycle **automatically** after code changes — do not wait to be asked:

```bash
# 1. Test (must pass before proceeding)
cd artex-osx && cargo test

# 2. Build release binary
cargo build --release

# 3. Deploy to app bundle (user can double-click to test)
cp target/release/artexplorer-native target/ARTexplorer.app/Contents/MacOS/ARTexplorer

# 4. Commit (when user requests)
# Use project commit format from Git Workflow section above
```

**Key paths**:
- Source: `artex-osx/src/` (main.rs, geometry.rs, ui.rs, camera.rs, app_state.rs, basis_arrows.rs, grids.rs, shader.wgsl, rt_math/, rt_polyhedra/)
- App bundle: `artex-osx/target/ARTexplorer.app/` (not committed — local only)
- Documentation: `artex-osx/docs/RUST-METAL-BABYSTEPS.md` (living design doc — update after completing features)

**After completing a feature**:
1. Run `cargo test` — all tests must pass
2. Run `cargo build --release` — zero errors
3. Copy binary to app bundle
4. Update `RUST-METAL-BABYSTEPS.md` Phase 3 table + add completion section
5. Commit and push when user confirms

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

### Feedback Loop

The user acts as the primary validator. When changes are rejected or need revision:
- **Diagnostic feedback** (user explains what went wrong) → incorporate into next attempt
- **Binary feedback** (pass/fail from browser testing) → fix and re-present
- **Cross-session lessons** (patterns that recur across features) → record in MEMORY.md with context of when/where discovered

### When Modifying Geometry

Each step should be verified independently before proceeding:

1. **RT-purity check** — Does the math use `rt-math.js` primitives? (See RT-Purity table above)
2. **Vertex generation** — Rational exactness (check console for "Max error")
3. **Face winding** — Counter-clockwise (outward normals) for backface culling
4. **Coordinate modes** — Test in both Cartesian and Quadray
5. **State persistence** — Test state saves/loads correctly
6. **View system** — If adding new controls, wire them into `rt-delta.js` for view capture/restore

### When Adding New Polyhedra

New polyhedra touch **every layer** of the application. Follow `Geometry Documents/Add-Polyhedra-Guide.md` which covers:

1. Geometry generator in `rt-polyhedra.js` (RT-pure vertices/edges/faces)
2. Rendering setup in `rt-rendering.js` (10 sub-steps: group, materials, meshes, edges, nodes, labels)
3. UI controls in `index.html` + `rt-ui-binding-defs.js` (declarative binding system)
4. Event handlers in `rt-init.js`
5. State persistence in `rt-state-manager.js` + `rt-filehandler.js`
6. View system integration in `rt-delta.js`
7. Testing (visual, state round-trip, view capture/restore)
