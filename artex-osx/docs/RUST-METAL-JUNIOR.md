# ARTexplorer: The Junior Phase

**From Baby Steps foundation to feature-complete explorer app.**

> Baby Steps (P0/P1) established the Rust/Metal engine: all 6 Platonic solids (Quadray-native),
> geodesic subdivision, node rendering, coordinate bar V2, camera presets, grids, face/node
> pipelines — 181 tests passing. Junior phase builds out the full geometry feature set and
> infrastructure to reach parity with the JS app, feature by feature, each independently verifiable.
>
> Written February 2026. Current state: scaffold committed, stubs wired, 181 tests green.

---

## Agent Handoff: RT-Purity in Junior Phase Code

The same rules as Baby Steps apply — read [RUST-METAL-BABYSTEPS.md §Agent Handoff](RUST-METAL-BABYSTEPS.md) first.

Additional Junior-phase guidance:

- **Primitives** (J1): N-gon polygon reuses `rt_math/polygon.rs` Wildberger reflection. Penrose uses `rt_math/phi.rs` PurePhi. No `f64::sin()` for geometry.
- **Matrices** (J1): Spacing is rational multiples of edge quadrance. 45° rotation = `s = c = 0.5` (exact rational). NO `Math.PI`.
- **Helices** (J1): Face-sharing propagates via `spread = 8/9` (dihedral of tet). Apex Q ratio = `2/3`. No `cos(dihedral)`.
- **Controls/Gumball** (J2): Rotate arcs are N-gon polygon geometry (RT-pure circles). No `atan2()` for handle hit detection.
- **Thomson** (J6): Circle geometry via `polygon.rs` reflection. Gram-Schmidt basis = pure dot/cross products. Degree→slope only at UX rotation boundary.
- **Animation** (J7): Smoothstep `t² × (3 - 2t)` — pure polynomial, no trig. Slerp = angle-based, only `f64::acos()` justified (camera, not geometry).

---

## Status Table

| Feature | Status |
|---------|--------|
| **J1: Geometry Expansion** | |
| Cuboctahedron / Vector Equilibrium | Pending |
| Rhombic Dodecahedron | Pending |
| Primitives (Point, Line, N-gon, Prism, Cone, Penrose) | Pending |
| IVM Matrices (Planar N×N + Radial) | Pending |
| Tetrahelixes (Toroidal + Linear ×2) | Pending |
| **J2: Selection & Gumball Controls** | |
| Instance system (deposit, select, undo/redo) | Pending |
| Ray-mesh picking + click-to-select | Pending |
| Gumball translate/scale/rotate handles | Pending |
| **J3: Logging + State Persistence** | |
| Debug logging (ring buffer + UI toggle) | Pending |
| JSON save/load (serde) | Pending |
| Native file dialogs (rfd) | Pending |
| Auto-save | Pending |
| **J4: Geometry Info Section** | |
| Per-form V/E/F stats + Euler indicator | **Done (2026-02-21)** |
| Edge quadrance + face spread display | **Done (2026-02-21)** |
| Scene budget (total vertices/triangles) | **Done (2026-02-21)** |
| **J5: Math Demos** | |
| Quadrance Demo (Plimpton 322) | Pending |
| Spread/Cross Demo | Pending |
| Weierstrass Circle Parametrization | Pending |
| **J6: Thomson Great-Circle Shells** | |
| Tetrahedron (10 circles) | Pending |
| Octahedron (3 circles) | Pending |
| Cube (9 circles) | Pending |
| Icosahedron (15 circles, φ-based) | Pending |
| **J7: View Management & Animation** | |
| ViewSnapshot + ViewManager | Pending |
| RTDelta equivalent (capture/apply) | Pending |
| animate_to_view (slerp + smoothstep) | Pending |
| Dissolve + stepped tick | Pending |
| **J8: Papercut System** | |
| Dynamic section cut plane | Pending |
| Section circles at intersections | Pending |
| **J9: Projection System** | |
| Generalized polyhedron projection | Pending |
| Prime n-gon presets (5, 7, 11, 13-gon) | Pending |
| SVG export | Pending |
| **P3: Architecture Research** | |
| Rotor-based orbit camera (eliminate polar singularity) | Research |
| ABCD-to-clip pipeline (eliminate XYZ from shader) | Research |
| Cutplane + projection as ABCD dot products | Research |
| Wireframe painter's algorithm (depth-sorted 2D, no GPU 3D pipeline) | Research |

---

## File Inventory

### Stub files created (all phases)

```
src/
├── animation.rs        J7  camera slerp, dissolve, view transitions
├── controls.rs         J2  gumball translate/scale/rotate handles
├── demos.rs            J5  math demo sub-windows
├── file_handler.rs     J3  JSON save/load, native file dialogs (rfd)
├── log_console.rs      J3  debug logging + ring buffer
├── papercut.rs         J8  section cut plane + section circles
├── projections.rs      J9  generalized projection + prime n-gon presets
├── state_manager.rs    J2  instance lifecycle, selection, undo/redo
└── view_manager.rs     J7  named view snapshots, export/import

src/rt_polyhedra/
├── helices.rs          J1  Tetrahelix1/2/3 face-sharing chains
├── matrices.rs         J1  Planar N×N + radial IVM arrays
├── primitives.rs       J1  Point, Line, N-gon, Prism, Cone, Penrose
└── thomson.rs          J6  great-circle shells on Platonic frames
```

### Dependencies added (Cargo.toml)

```toml
serde = { version = "1", features = ["derive"] }  # Serialization
serde_json = "1"                                   # JSON I/O
rfd = "0.15"                                       # Native macOS file dialogs
```

---

## Phase Detail

### J1: Geometry Expansion

**Gate:** 181 tests passing ✓

#### J1a: Additional Platonic-family polyhedra
Additions to `src/rt_polyhedra/platonic.rs`:

- **Cuboctahedron (VE)**: 12 vertices at edge midpoints of cube: permutations of `(±1, ±1, 0)`.
  In Quadray: midpoints of tet and dual tet edges. 14 faces (8 tri + 6 sq). Euler: V=12, E=24, F=14.
  Face spread: triangular faces = 8/9, square faces = 1 (perpendicular).
- **Rhombic Dodecahedron**: Dual of cuboctahedron. 14 vertices (8 cube + 6 octahedron), 12 rhombic faces.
  All faces have same edge spread. Fills space (IVM dual lattice).

#### J1b: Primitives (`rt_polyhedra/primitives.rs`)
- **Point**: single Quadray vertex, no edges/faces
- **Line**: 2 vertices at ±√(Q/4) along chosen axis (Q = quadrance = length²)
- **N-gon Polygon**: reuses `rt_math/polygon.rs` — exact Wildberger reflection, 1 √ only
- **Prism**: N-gon base + top (offset by Q_height), lateral rectangular faces (fan-triangulated)
- **Cone**: N-gon base + apex; all lateral edges meet at apex
- **Penrose Tiling**: thick/thin rhombi (kite/dart); φ-rational via `rt_math/phi.rs`
  Deflation rules: thick → 1 thick + 2 thin, thin → 1 thick + 1 thin (no sin/cos)

#### J1c: IVM Matrices (`rt_polyhedra/matrices.rs`)
- **Planar N×N**: grid of polyhedra with rational spacing `d = √(Q_edge)`.
  45° rotation: reflection matrix with `s = c = 0.5` (exact rational). NO `sin(π/4)`.
- **Radial**: concentric shells at `Q_n = n² × Q_base`. Shell count determines depth.

#### J1d: Tetrahelixes (`rt_polyhedra/helices.rs`)
Face-sharing algorithm: given current tet and shared face, next tet is reflected through
that face (spread = 8/9 dihedral constraint). Orientation tracked as Quadray face normal.

- **Tetrahelix1 (Toroidal)**: 48-tet chain closes to torus. Left-handed chirality.
- **Tetrahelix2 (Linear, tet seed)**: multi-strand, each strand adds one tet per step
- **Tetrahelix3 (Linear, octa seed)**: octa seed allows denser packing patterns

#### J1 UI additions (`src/ui.rs`)
- Polyhedra section: Cuboctahedron + Rhombic Dodecahedron checkboxes
- NEW "Primitives" collapsible section (mirrors JS index.html §3)
- NEW "IVM Matrices" collapsible section
- NEW "Tetrahelixes" collapsible section (type selector + count slider)

---

### J2: Selection & Gumball Controls

**Gate:** J1 complete

#### Instance System (`src/state_manager.rs`)
```rust
pub struct Instance {
    pub id: u64,                          // unique monotonic ID
    pub polyhedron_type: String,          // "tetrahedron", "cube", etc.
    pub transform: Transform,             // position, rotation, scale
    pub metadata: InstanceMetadata,       // label, tags, notes
}
pub struct Transform { position: [f64; 3], rotation: [f64; 4], scale: f64 }
```
Undo/redo: `VecDeque<HistoryEntry>` capped at 50. Each entry = (action, pre-state, post-state).

#### Ray-Mesh Picking
Extend `main.rs` click handler: on left-click, cast ray, test against AABB of each visible
polyhedron (bounding sphere already tracked as `bounding_radius`). On hit → `state_manager.select(id)`.

#### Gumball (`src/controls.rs`)
Translate handles: axis arrows reusing `basis_arrows::build_arrow()` geometry.
Scale handles: thin cube at axis tip (box = 6 quads, fan-triangulated).
Rotate handles: N-gon arc (partial circle) via `polygon::n_gon_vertices()` — RT-pure.
Drag logic: project mouse delta onto handle axis using camera inverse (no trig needed beyond
what camera.rs already has for view/proj matrix inversion).

---

### J3: Logging + State Persistence

**Gate:** J1 complete (parallel with J2)

#### Debug Console (`src/log_console.rs`)
```rust
#[derive(Clone, Copy, PartialEq)]
pub enum LogLevel { Off, Info, Debug, Verbose }

pub struct AppLog {
    entries: VecDeque<LogEntry>,  // cap = 200
    level: LogLevel,
}
```
`artex_log!(level, fmt, ...)` macro: zero-cost when inactive (level comparison before format!).

#### State Persistence (`src/file_handler.rs`)
`AppStateSnapshot` mirrors `AppState` with `#[derive(Serialize, Deserialize)]`.
`save_to_json()` / `load_from_json()` via `serde_json::to_writer_pretty()`.
Native file dialogs via `rfd::FileDialog::new().save_file()` (returns `Option<PathBuf>`).
Auto-save: write to `dirs::home_dir()/.artexplorer/autosave.json` after every 10 geometry rebuilds.

---

### J4: Geometry Info Section

**Gate:** J1 complete

Expand `ui.rs` Info collapsible:
```
Tetrahedron:      4V  6E  4F  Q=8  s=8/9  ✓
Dual Tet:         4V  6E  4F  Q=3  s=8/9  ✓
Cube:             8V 12E  6F  Q=4  s=1    ✓
Octahedron:       6V 12E  8F  Q=4  s=8/9  ✓
Icosahedron:     12V 30E 20F  Q=?  s=4/9  ✓
─────────────────────────────────────────
Scene total:   ...V  ...E  ...F  ~...KB GPU
```
Face spread constants are hardcoded (exact rationals per Wildberger §26).
Euler ✓/✗ computed via `rt_polyhedra::mod::verify_euler()` — already implemented.

---

### J5: Math Demos

**Gate:** J3 complete

Each demo is an `egui::Window` that floats over the 3D viewport.
Three demos from JS app ported:

1. **Quadrance Demo**: slider for Δx, Δy. Show Q = Δx² + Δy² vs d = √Q side by side.
   Bonus: Plimpton 322 table (Babylonian triples, all Q-rational).
2. **Spread/Cross Demo**: two vector inputs → compute s = 1 - (v₁·v₂)²/(Q₁·Q₂).
   Show s → degrees via `acos(1-2s)` at display boundary only.
3. **Weierstrass Circle**: slider t. Show (1-t²)/(1+t²), 2t/(1+t²) → rational point on unit circle.
   Verify x² + y² = 1 exactly (rational identity, no floating error).

---

### J6: Thomson Great-Circle Shells

**Gate:** J1 + J3 complete

Port of `rt-thomson.js` (~470 lines). All circle geometry RT-pure.

**Algorithm:**
1. For each symmetry plane normal `n` of the polyhedron:
   - `build_plane_basis(n)` → Gram-Schmidt: `u = n × [0,1,0]`, `v = u × n` (pure dot/cross)
   - `make_circle(n, r, n_gon)` → N-gon vertices via `polygon::n_gon_vertices()`, transform 2D→3D via `u, v` basis
2. `collect_circle_vertices()` → quadrance dedup (Q < 1e-8), build edge list
3. Output: `ThomsonOutput { circles, nodes, edges, plane_count, coincident_count }`

**Plane counts per polyhedron:**
- Tetrahedron: 4 face planes + 6 edge-midpoint planes = 10
- Octahedron: 3 coordinate planes = 3
- Cube: 3 face + 6 diagonal = 9
- Icosahedron: 15 planes (φ-based edge mirrors, PurePhi required)

---

### J7: View Management & Animation

**Gate:** J3 + J2 complete

**ViewSnapshot** = camera state + full `AppState` clone + name + ISO timestamp.
`ViewManager`: `Vec<ViewSnapshot>` (max 20), index by id. Export = `serde_json` array.

**RTDelta equivalent:**
```rust
pub struct StateSnapshot { polyhedra: [bool; 8], sliders: HashMap<&'static str, f32>, ... }
pub fn capture_snapshot(state: &AppState) -> StateSnapshot
pub fn compute_delta(from: &StateSnapshot, to: &StateSnapshot) -> StateDelta
pub fn apply_delta(delta: &StateDelta, state: &mut AppState)
```

**Animation:**
`smoothstep(t: f32) -> f32` = `t * t * (3.0 - 2.0 * t)` — pure polynomial (no sin/cos).
Slerp: `acos(dot(a, b))` is justified (camera direction, not geometry).
Stepped tick: for integer sliders, use `raw_t` (linear) to find current step index → snap value.

---

### J8: Papercut System

**Gate:** J2 complete

Section cut plane: `CutplaneAxis` enum selects which axis; slider 0.0–1.0 maps to
`[-bounding_radius, +bounding_radius]`. Section circles via `rt_math::sphere_plane_circle_radius()`.

---

### J9: Projection System

**Gate:** J1 + J6 complete

Project vertices onto view plane (camera's near plane), compute 2D convex hull
(Graham scan — uses cross product sign, RT-pure), display as overlay polygon.
Prime n-gon presets: hardcoded `(polyhedron, view_preset, expected_vertex_count)` triples
derived from `Geometry Documents/Whitepaper LaTEX/Prime-Projection-Conjecture.tex`.

---

### P3: Architecture Research

**Gate:** Junior phase features stable (no hard dependency — pursue when infrastructure is settled)

These items fundamentally rethink the rendering pipeline to be RT-pure all the way to the GPU.
They are research-grade: each has an open design question before implementation begins.

#### P3a: Rotor-Based Orbit Camera
**Reference:** [ARTEX-HAIRYBALL.md](ARTEX-HAIRYBALL.md)

Current `OrbitCamera` uses yaw/pitch/distance — a spherical coordinate system with a polar
singularity patched by the up-vector flip near ±90°. The topologically correct fix is a
`QuadrayRotor` orientation in R⁴ × Z₂ — no Hairy Ball singularity, no up-vector patch needed.

**Open question:** Define the `QuadrayRotor` multiply and slerp without introducing `f64::acos()`
in the orientation update loop. Slerp at camera level is justified (not geometry), but investigate
whether geometric-algebra double reflection eliminates even this.

#### P3b: ABCD-to-Clip Pipeline
**Reference:** `ARTEX-RATIONALE.md` §4, §8, §10

The current shader has a `BASIS` matrix converting ABCD→XYZ, then standard view_proj. The goal:
fold the Tom Ace basis into the camera matrix → single `ABCD_to_clip = view_proj * [BASIS * Normalize]`
multiply, computed once per frame. The shader reduces to `clip_position = abcd_to_clip * quadray`.
XYZ eliminated from the GPU pipeline.

**Open question:** How do the 7 camera presets (stored as yaw/pitch) map to stored ABCD 4-vector
triplets? Each preset already has the triplet annotated in `camera.rs` comments (from P1).

#### P3c: Cutplane + Projection as ABCD Dot Products
**Reference:** `ARTEX-RATIONALE.md` §10

Section cut planes and prime projections are currently post-process operations in Cartesian space.
In the ABCD pipeline, a cutplane is a half-space defined by `dot(vertex_abcd, plane_normal_abcd) > 0`.
The GPU can evaluate this per-vertex in the shader with no Cartesian conversion.

**Open question:** How do the 8 ABCD plane normals map to the IVM symmetry planes used by Thomson?
Answer this before implementing — the intersection may yield the papercut circles for free.

#### P3d: Wireframe Painter's Algorithm
**Reference:** `ARTEX-RATIONALE.md` §8

The Platonic solids have small vertex counts (4–20). A CPU-side depth sort + 2D overlay render
(painter's algorithm) would eliminate the GPU depth buffer for edge rendering entirely.
RT-pure 2D: edges are line segments, depth order = ABCD dot products against view normal.

**Open question:** At what vertex count does the CPU sort become slower than GPU rasterization?
Benchmark for geodesic icosahedra at F4 (492 vertices) before committing to this path.

---

## Build Commands

```bash
cd artex-osx

# After any feature implementation:
cargo test                    # All tests must pass
cargo build --release         # Zero errors
cp target/release/artexplorer-native target/ARTexplorer.app/Contents/MacOS/ARTexplorer

# Verify test count grows with each feature
cargo test 2>&1 | grep "test result"
```

---

## Guiding Principle

> *"Baby steps in Rust. Junior years in features. The geometry engine stays RT-pure through it all."*
>
> Each Junior phase feature is implemented one at a time, independently tested, and committed
> before starting the next. The stub files are navigation markers — they don't compile to
> functionality, but they tell the story of what's coming.
