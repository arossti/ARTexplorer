# Gravity Grids 2 — Remaining Work & Future Directions

> **Previous document:** `Gravity-Grids.md` covers Phases 0–3, 5a and the full development history.
> This document focuses on **what's next**.

---

## Status Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Mathematical model + Gravity Numberline demo | **Done** (PR #93) |
| 1 | G-Quadray grids: gravity-warped Central Angle tessellation | **Done** |
| 1b | G-Cartesian: Weierstrass polar circles on XYZ planes | **Done** |
| 2 | Quadrance-based shell spacing | Pending |
| 3 | Quadray polar: 4 face planes with Weierstrass circles | **Done** (`df49fb3`) |
| 4 | Distorted polyhedra: vertex remapping through gravity metric | Pending |
| 5a | IK rigid link in Gravity Numberline demo | **Done** (`df0faf0`) |
| 5b–d | Pin joints, hinges, elastic, tension, pneumatic | Planned |
| 6a | N-gon generator: `RT.nGonVertices()` Wildberger reflection method | **Done** |
| 6a+ | Primitives refactor: unified `polygon()` via `RT.nGonVertices()` | **Done** |
| 6b | Grid integration: `nGon` parameter in polar planes | **Done** |
| 6c | UI slider (3–128) in Grid controls panel | **Done** |
| 7 | 4D± Gravity + Inversion demo: Quadray Janus drop | **Done** (core) |
| 7b | Cell slider: manual scrubbing +144 to −144 | **Done** |
| 7c | Circumsphere boundary visualization (7F wireframe) | **Done** |

### Key Files

| File | Purpose |
|------|---------|
| `modules/rt-grids.js` | `createGravityCartesianPlane()`, `createQuadrayPolarPlane()`, `createIVMGrid()` (uniform only) |
| `modules/rt-math.js` | `RT.Gravity` namespace — `computeGravityCumulativeDistances()`, `rationalArc()` |
| `modules/rt-init.js` | Grid mode button handlers (now scoped per section: `data-cartesian-mode`, `data-quadray-mode`) |
| `modules/rt-rendering.js` | Grid group visibility API: `setCartesianGridVisible()`, `setQuadrayGridVisible()` |
| `modules/rt-ik-solvers.js` | `solveRigid2D()`, `linkAngle2D()`, `linkSpread2D()` |
| `demos/4D-Drop.js` | `Drop4DDemo` class — 4D± Gravity + Inversion demo |
| `index.html` | Cartesian: Uniform/Polar. Central Angle: Uniform/Polar. 4D± demo link |

### Recent Fixes (PR #97)

- Ortho camera near-plane clipping fixed (`near = -10000`)
- Ortho camera `onWindowResize` properly updates frustum bounds
- Grid mode toggles scoped per section (no cross-contamination)
- Section collapse hides entire THREE.Group (fixes polar face plane cleanup)

---

## Phase 2: Distance vs. Time — Two Grid Interpretations

The gravity grid admits two physically distinct interpretations that produce **opposite** shell compression patterns. The choice between them is the choice between encoding acceleration in the **metric** (the space) or in the **trajectory** (the body). This is the "shape vs. dynamics" question applied to grid construction.

### Metric Spacing (Current): The Grid Is the Physics

```
r_k = E × (1 - √(1 - k/N))        k = 0..N, origin to edge
```

**Physical model:** The grid represents the gravitational **field itself** — dense where the field is strong (near origin), sparse where it is weak (at the periphery). Cells are **not** equal in physical distance, nor equal in time — they are unequal in both. Wide cells at the edge, narrow cells at the center.

**Grid compression:** Dense near origin, sparse at edge.

**Animation:** Constant spatial velocity `r = extent × (1 - f)`. The body lingers in wide outer cells (appearing slow) and crosses narrow inner cells rapidly (appearing fast) → visual acceleration toward origin.

**Where the physics lives:** In the space. The grid IS the gravitational metric. The body has no dynamics — it moves at constant coordinate velocity through a warped space. This is the metric interpretation described in the Janus paper (Section 8).

**√ cost:** N `Math.sqrt()` calls, cached once in `cumDist[]`. Never repeated.

**Shell gaps** (increase from origin to edge — field density decreases outward):
- Near origin: `Δr ≈ E/(2N)` — narrow, body crosses quickly
- Near edge: `Δr ≈ E/√N` — wide, body lingers

### Time Spacing (Galileo): The Grid Marks Equal Clock Ticks

```
r_j = E × j(2N - j) / N²            j = 0..N, origin to edge
```

**Physical model:** Each cell represents one tick of the clock (equal Δt). Under uniform gravity, the body covers more distance per tick as it accelerates. First tick (near edge): body barely moves → narrow cell. Last tick (near origin): body is fast → wide cell.

**Grid compression:** Sparse near origin, dense at edge.

**Animation:** Constant cell-crossing rate (one cell per Δt). The body covers wider cells near origin → appears to accelerate.

**Where the physics lives:** In the trajectory. The grid records where the body has been at equal time intervals. The cells are a discrete decomposition of the fall, not a continuous metric.

**√ cost:** ZERO — purely polynomial (add, multiply, divide). Fully RT-compliant.

**Shell gaps** follow Galileo's odd-number sequence:
```
gap_j = E × (2(N - j) + 1) / N²
```
From edge inward: 1, 3, 5, 7, ... (sum = N²). This is Galileo's law of odd numbers — the distances covered in successive equal time intervals under uniform acceleration.

### Comparison

| Property | Metric Spacing (current) | Time Spacing (Galileo) |
|---|---|---|
| Formula | `E(1 - √(1 - k/N))` | `E × j(2N-j) / N²` |
| Cells represent | Field strength (unequal d, unequal t) | Equal clock ticks (unequal d, equal t) |
| Dense shells at | Origin (strong field) | Edge (body slow) |
| Sparse shells at | Edge (weak field) | Origin (body fast) |
| Animation model | Constant spatial velocity | Constant cell-crossing rate |
| Physics encoded in | Grid metric (shape) | Body trajectory (dynamics) |
| √ per shell | 1 (cached) | 0 |
| RT compliance | √ inherent in formula | Fully algebraic |
| Galileo sequence | Not directly visible | Gaps ∝ 1, 3, 5, 7... |

### The Duality

The two approaches produce the **same observable** — a body that appears to accelerate toward the origin — through opposite mechanisms:

- **Speed spacing + linear animation** = acceleration from metric compression
- **Time spacing + cell-rate animation** = acceleration from widening cells

They are mathematically dual. A third option — uniform grid + quadratic animation `r = E(1 - (k/N)²)` — produces the same visual through pure dynamics, with no metric encoding at all. The three approaches are equivalent for the observer but differ in where the physics lives: in the space, in the discrete cell structure, or in the continuous motion.

### Decision

The current speed-spacing approach aligns with the Janus paper's principle: **shape over dynamics**. The grid IS the gravitational field — a geometric object, not a trajectory record. The body moves without force, without momentum, without dynamics. Acceleration is not something that happens to the body; it is a property of the space.

The √ cost (N calls, cached once) is computationally negligible and mathematically irreducible — the formula `E(1 - √(1 - k/N))` cannot be algebraically simplified to eliminate the root. This is not an RT compliance failure; it is the honest √ boundary where the metric crosses from algebraic description to spatial realization.

The Galileo time-spacing remains a candidate for a future **alternative grid mode** ("time cells") that would offer a complementary visualization and a fully √-free pipeline.

### Previous Phase 2 Proposal (Retired)

The earlier proposal `Q_k = E² × k/N` ("uniform in quadrance") assumed this was the quadrance-native form of the current spacing. It is not — `E√(k/N)` produces a third distribution (compressed at edge, expanded at origin) that matches neither the metric nor the Galileo interpretation. This misidentification conflated "working in quadrance space" with "changing to a quadrance-uniform distribution." The proposal is retired in favor of the two formally distinct approaches documented above.

---

## Phase 4: Distorted Polyhedra — Geometry in Curved Space

**Goal:** Render polyhedra with vertices remapped through the gravity metric, showing tidal distortion.

### The Approach

Each vertex is radially displaced according to the gravity interval mapping:

```javascript
function gravityWarp(vertex, gravityCenter, intervals) {
    const r = vertex.distanceTo(gravityCenter);
    const R = mapToGravityRadius(r, intervals);
    const direction = vertex.clone().sub(gravityCenter).normalize();
    return gravityCenter.clone().add(direction.multiplyScalar(R));
}
```

### Visual Effect

- **Far from origin**: nearly normal (shells widely spaced, close to uniform)
- **Near origin**: radially compressed, tangentially stretched (tidal distortion)
- **At origin**: collapses toward a point — the Janus Point / singularity

### Mesh Strategy

Subdivide polyhedron faces before warping (a triangle with 3 vertices maps poorly to curved space). Subdivide each face into ~16 sub-triangles, warp each vertex, and the curved surface emerges.

### Dependencies

- Phase 2 (body selector UI) for choosing which gravity field to apply
- Existing polyhedra generation pipeline in `rt-polyhedra.js`

---

## Phase 5b–d: Extended IK Solvers

Building on `rt-ik-solvers.js` (Phase 5a: rigid link).

| Phase | Type | Behavior | DOF |
|-------|------|----------|-----|
| 5b | Pin Joint | Two members sharing a point, each rotates freely | 2 |
| 5b | Hinge | Rotation constrained to a single axis | 1 |
| 5c | Elastic | Length varies under tension/compression, spring constant k | 1 |
| 5c | Tension-only | Resists extension (cable/rope), zero compression resistance | 1 |
| 5c | Compression-only | Resists compression (strut), zero tension resistance | 1 |
| 5d | Pneumatic | Soft compression with nonlinear resistance (gas law) | 1 |

### Future Extensions

- **Tensegrity structures**: tension + compression members in 3D (the classic Fuller application)
- **Polyhedra edge constraints**: each edge is a rigid member; gravity warping + IK resolves the constrained shape
- **Multi-body chains**: FABRIK or CCD solvers for longer chains
- **Pneumatic soft bodies**: deformable volumes resisting compression per PV = nRT

---

## Phase 6: Great-Circle-as-N-gon — Polygonal Geodesic Generation

**Goal:** Replace the fixed 64-segment circle approximation with explicit N-gon inscriptions, opening a family of geodesic constructions. User-facing slider (3–128) controls polygon resolution per great circle.

### The Family

| N | Shape | Radial Lines | Pattern |
|---|-------|-------------|---------|
| 3 | Triangle | 3 per plane | Triangulated disc — natural match for tetrahedral face planes |
| 4 | Square | 4 per plane | Current radial crosshair, but explicit |
| 6 | Hexagon | 6 per plane | Hexagonal tessellation disc — IVM-like pattern |
| 12 | Dodecagon | 12 per plane | High-resolution polygonal |
| 64 | 64-gon | 64 per plane | Visually smooth circle (current rendering) |
| 128 | 128-gon | 128 per plane | Maximum resolution |

### Geodesic Generation via N-gon Subdivision

The key insight: geodesic frequency can be generated NOT by projecting polyhedron edges onto a sphere, but by **subdividing great circles with N-gons and connecting their vertices**:

1. Take a great circle on a tetrahedral face plane
2. Inscribe an N-gon (vertices at equal angular spacing)
3. Take the concentric circle at the next gravity shell
4. Inscribe the same N-gon, possibly rotated by half a vertex angle
5. Connect corresponding and adjacent vertices between shells

This produces geodesic-like triangulations that:
- Work on **any** plane (not just icosahedral symmetry)
- Naturally adapt to gravity-spaced shells (non-uniform radial distribution)
- Are conformal to the polar grid structure
- Can use any polygon — hexagonal, pentagonal, etc.

### Wildberger Reflection Method (Chapter 14, §14.5)

**Supersedes the hybrid Weierstrass/algebraic u-value strategy.**

The unified `RT.nGonVertices(N, R)` function generates regular N-gon vertices for **any** N using Wildberger's successive reflection construction:

1. **Star spread** `s = sin²(π/N)` — algebraic for N=3,4,5,6,8,10,12, cubic-cached for 7,9, transcendental fallback otherwise
2. **ONE √**: `m₁ = tan(π/N) = √(s/(1−s))` — the only irrational operation
3. **Tangent addition recurrence**: `m_{k+1} = (mₖ + m₁) / (1 − mₖ·m₁)` — purely rational
4. **Weierstrass at slopes**: vertex k = `(R(1−mₖ²)/(1+mₖ²), R·2mₖ/(1+mₖ²))` — rational in mₖ
5. **Symmetry**: lower-half vertices by y → −y

**Key identity**: reflecting (R, 0) across a line with slope m gives exactly `R · circleParam(m)`. The reflection construction IS the Weierstrass parameterization evaluated at successive tangent slopes.

**√ count comparison**:
| Method | √ per N-gon | Notes |
|--------|-------------|-------|
| Gauss-Wantzel (old generators) | O(N) | Each vertex needs independent √ |
| Classical trig | 0 √, N transcendentals | sin/cos are infinitely irrational |
| **Wildberger reflection** | **1** | Same for any N |

This single function serves **both** the Primitives polygon panel AND great circle grids — full code reuse.

**Symbolic upgrade (Feb 2026)**: For N ∈ {3, 4, 6, 8, 12}, `RT.nGonVerticesSymbolic()` now
computes vertices in exact Q(√D) arithmetic with zero intermediate float expansion. The
Weierstrass slopes are expressed as `SymbolicCoord` values — e.g., octagon m₁ = √2−1 via
the denesting identity √(3−2√2) = √2−1. GCD reduction keeps all coefficients ≤ 2.
`Primitives.polygon()` uses this symbolic path first, with `nGonVertices()` as float
fallback for other N. See `Geometry documents/Pure-Polygon.md` for derivation.

### Implementation

#### 6a: Core N-gon generator — `RT.nGonVertices(N, R)` [DONE]

Added to `rt-math.js`. Also added supporting primitives:
- `RT.reflectInLine(x, y, m)` — rational 2D reflection
- `RT.slopeFromSpread(s)` — the ONE √ boundary
- Extended `RT.StarSpreads.forN()` to include N=7,9 from PureCubics

#### 6a+: Primitives refactor [DONE]

Replaced 9 hand-coded polygon generators + classical trig fallback in `rt-primitives.js` (~636 lines) with a single unified `polygon()` that calls `RT.nGonVertices()`. Prism, cone, cylinder inherit the improvement automatically.

#### 6b: Grid integration [DONE]

Both `createGravityCartesianPlane()` and `createQuadrayPolarPlane()` in `rt-grids.js` now accept `nGon` parameter (default 64 for backward compatibility) and use `RT.nGonVertices()` instead of the hardcoded SPQ=16 Weierstrass quadrant loop.

#### 6c: UI slider + radial lines [DONE]

Added "Circle N-gon (Polar mode)" slider to Central Angle section in `index.html`:
- Range: 3–128, step 1, default 64 (backward compatible)
- `nGon` parameter threaded through full chain: `index.html` → `rt-ui-binding-defs.js` / `rt-init.js` → `rt-rendering.js` → `rt-grids.js` → `buildQuadrayPlanes()` / `buildCartesianPlanes()` → `createQuadrayPolarPlane()` / `createGravityCartesianPlane()`
- Changing the slider rebuilds both Quadray and Cartesian grids
- Radial lines: N-gon vertex-aligned radials from origin to outermost shell (replaces hardcoded ±X/±Z crosshair on Cartesian, adds radials to Quadray which had none)
- `4D-Drop.js` saves/restores nGon slider state

### Verification

- **N=64**: Visually identical to current rendering
- **N=3 on QW plane**: Equilateral triangle per shell, 3 radial lines — should align with tet face geometry
- **N=6 on QW plane**: Hexagonal rings — should produce IVM-like pattern
- **N=4 on XYZ plane**: Square rings — should align with Cartesian crosshair

### Radial Lines

Currently removed from Quadray polar planes (the XYZ "+" crosshair didn't align with basis vectors). N-gon inscriptions generate radial lines naturally by connecting corresponding vertices between concentric N-gons — no arbitrary axis alignment needed.

### Dual Tet Planes

The 4 face planes are parallel to the base tetrahedron's faces. Rotating 180° gives the dual tetrahedron's face planes (8 planes total). These are NOT coplanar with the 6 Central Angle planes. Future option once N-gon generation is working.

---

## Phase 7: 4D± Gravity + Inversion Demo

**Goal:** Extend the 2D Gravity Numberline demo into 3D/4D Quadray space. Four polyhedra fall along the four Quadray basis vectors through a gravity-spherical (Polar great circles) grid, collide at the origin (Janus Singularity), invert into negative Quadray space, and oscillate continuously.

### Implementation Status

Core demo is **functional** (`demos/4D-Drop.js`, ~750 lines). Remaining work is visual aids for spatial comprehension (see §7b–7c below).

| Component | Status |
|-----------|--------|
| Class `Drop4DDemo` with full lifecycle | **Done** |
| Floating panel (draggable, body selector, shape toggle, status) | **Done** |
| Save/restore scene state on enable/disable | **Done** |
| Falling bodies: Tetrahedra + 3F Geodesic Icosahedra with toggle | **Done** |
| 4-phase animation with continuous global time | **Done** |
| Janus flash + background inversion at origin crossings | **Done** |
| Seamless oscillation (no pause at origin) | **Done** |
| Cell slider for manual scrubbing (+144 to −144), steps of 12 | **Done** (§7b) |
| Circumsphere boundary: 7F geodesic icosahedron wireframe, toggleable | **Done** (§7c) |

### Architecture

Follows the **in-scene floating panel** pattern from the Rotor demo (`rt-rotor-demo.js`). Class `Drop4DDemo` with constructor `(scene, THREE, camera, controls)`.

| File | Action |
|------|--------|
| `demos/4D-Drop.js` | **Done** — full demo module (~750 lines) |
| `index.html` | **Done** — list item in Math Demos section |
| `modules/rt-init.js` | **Done** — import + event handler |

### Lifecycle

- `enable()` → saveSceneState → configureSceneForDemo → createDemoObjects → createInfoPanel
- `disable()` → stopAnimation → removeDemoObjects → removeInfoPanel → restoreSceneState
- `toggle()` → enable/disable, returns `this.enabled`

### Scene Configuration

On enable, the demo saves all current checkbox/slider state and configures:
- Quadray basis vectors visible, grids in **gravity-spherical** (Polar) mode
- Tessellation slider set to **144** divisions
- All 4 IVM face plane checkboxes enabled
- Distractions hidden (Cube, Dual Tet, Cartesian basis/grid)

### Demo Objects — The Circumsphere

4 polyhedra (Tetrahedra by default, toggle to 3F Geodesic Icosahedra) placed at the outermost extent of each Quadray basis axis:
- **QX** (A axis): Red
- **QZ** (B axis): Green
- **QY** (C axis): Blue
- **QW** (D axis): Yellow

Axis extent = `cumDist[144]` from `RT.Gravity.computeGravityCumulativeDistances(144, 72)` = **72.0** (the outermost shell radius).

**Critical geometric insight:** The 4 Quadray basis vectors point to the vertices of a regular tetrahedron. The bodies at `extent × basis[i]` therefore sit on the **circumsphere** of this tetrahedron (radius 72). The gravity grid's great circles, however, are drawn on the 4 **face planes** through the origin. These face planes do not pass through the tetrahedral vertices — a vertex is at distance `extent/3 = 24` from the opposite face plane, and projects onto adjacent face planes at reduced radii.

This means **from most camera angles, the bodies appear to be at a different distance than the outermost visible circle**, even though both are at radius 72 from the origin. The circles are 2D cross-sections of the sphere on specific planes; the bodies are on the sphere itself at directions that don't lie in those planes.

### Physics (reused from `rt-gravity-demo.js`)

- Surface gravity: `RT.Gravity.BODIES[selectedBody].surfaceG`
- Fall time: `T = √(2H/g)`
- Constant velocity on gravity grid = acceleration in physical space (the grid encodes the metric)

### Animation — 4-Phase State Machine

Uses **continuous global time**: a single `animationStartTime` drives all timing. Phase and fraction are derived mathematically — no per-phase timers, no overflow carry. Each phase takes `T = √(2H/g)` seconds. Bodies move at constant velocity (linear fraction `f`):

| Phase | Start | End | Node position |
|-------|-------|-----|---------------|
| `pos_to_origin` | +extent×basis[i] | origin | `(1-f) × extent × basis[i]` |
| `origin_to_neg` | origin | −extent×basis[i] | `−f × extent × basis[i]` |
| `neg_to_origin` | −extent×basis[i] | origin | `−(1-f) × extent × basis[i]` |
| `origin_to_pos` | origin | +extent×basis[i] | `+f × extent × basis[i]` |

At origin arrivals (end of `pos_to_origin` and `neg_to_origin`): `createJanusFlash()` at origin + background inversion (white for negative space, dark for positive). Seamless transition — no pause.

### Control Panel

Fixed-position DOM panel (top-left, `rgba(0,0,0,0.85)`, z-index 1000, draggable header):
- Title: "4D± Gravity + Inversion"
- Body selector dropdown (populated from `RT.Gravity.BODIES`)
- Shape toggle: Tetrahedron / 3F Icosahedron (button pair, matching Rotor demo pattern)
- Drop/Stop toggle button
- Status readout: phase, elapsed time, current cell, surface g, fall time T
- Per-axis readout: QX/QZ/QY/QW with +extent/−extent/origin status

### Key Reuse

| What | From |
|------|------|
| Scene access | `rt-init.js` constructor params |
| Floating panel + drag | `rt-rotor-demo.js` pattern |
| Save/restore scene state | `rt-rotor-demo.js` checkpoint approach |
| Body geometry | `rt-polyhedra.js` `Polyhedra.tetrahedron()` / `Polyhedra.geodesicIcosahedron()` |
| Physics constants | `RT.Gravity.BODIES` from `rt-math.js` |
| Grid configuration | UI button click `[data-quadray-mode="gravity-spherical"]` |
| Janus flash + background | `rt-janus.js` `createJanusFlash()`, `animateBackgroundColor()` |
| Quadray basis vectors | `Quadray.basisVectors[0..3]` from `rt-math.js` |
| Gravity shell radii | `RT.Gravity.computeGravityCumulativeDistances()` |

---

### Phase 7b: Cell Slider — Manual Scrubbing

**Goal:** Let the user manually drag the bodies from +144 through 0 (origin/Janus Point) to −144, controlling position directly.

When the animation is stopped, a **range slider** on the control panel maps cell position:
- Range: **−144** to **+144** (0 = origin)
- Steps of **12** (to fit the limited panel width — 24 discrete positions: −144, −132, ..., −12, 0, +12, ..., +132, +144)
- Positive values: bodies at `(cell/144) × extent × basis[i]`
- Negative values: bodies at `(cell/144) × extent × basis[i]` (negative cell flips sign)
- At cell 0: bodies at origin — Janus Point
- Background inversion triggers when crossing 0 (positive→negative or vice versa)

The slider provides tactile control, letting the user observe the gravity grid spacing at each cell and see how the Janus inversion works at their own pace.

### Phase 7c: Circumsphere Boundary Visualization

**Goal:** Make the outer boundary visible from all camera angles by drawing the circumsphere itself, not just its face-plane cross-sections.

**Approach:** Render a **7F Geodesic Icosahedron** (`Polyhedra.geodesicIcosahedron(extent, 7, "out")`) as a wireframe or edge-only mesh at radius 72 (= extent). This shows the spherical boundary that the bodies drop from, visible from any viewing angle. No nodes — edges only.

**Visual properties:**
- Very thin lines or wireframe mesh
- Low opacity (0.15–0.25) so it doesn't obscure the gravity grid
- Neutral color (white or light grey) to distinguish from the colored grid circles
- Toggle on/off from the control panel

**Why 7F:** High enough frequency to read as spherical from any angle, available in the existing `Polyhedra.geodesicIcosahedron()` pipeline without new code.

**Geometric significance:** This sphere is the circumsphere of the tetrahedron whose 4 vertices are the drop positions. The great circles on the face planes are the intersections of this sphere with those planes — but they're **small circles** of the sphere (not great circles of the sphere), because the face planes don't pass through the sphere's center at the tetrahedral face distance. The grid circles DO pass through the origin (the planes pass through the origin), so they are actually great circles. But the key point stands: the body positions are on the sphere at directions that don't intersect any face plane at max radius.

---

## Open Questions

1. **Quadrance-based spacing** (Phase 2): Does storing Q_k instead of r_k require changes downstream in the Weierstrass parameterization, which currently takes radius r directly?

2. **Gravity center mobility**: Initially at origin. Could the gravity center be attached to a polyhedron or draggable point?

3. **Multiple gravity sources**: The interval formula assumes a single source. Two sources would require summing fields.

4. **Body selector UI** (Phase 2): Dropdown for GM presets (Earth, Moon, Mars, Jupiter, Sun, Black Hole, Custom). Currently only the Gravity Numberline demo has this. Should the 3D grid also get a body selector?

5. **Performance budget**: N-gon generation (Phase 6) and subdivided warped polyhedra (Phase 4) multiply vertex count. Profile and set limits.

6. **Basis vectors in gravity space**: The four tetrahedral basis directions remain angular constants, but their lengths now vary with the gravity metric. Variable thickness or curvature to indicate local distortion?

---

## RT Compliance Review

All gravity modules should follow the RT deferred-√ pattern: work in quadrance space, take √ only at GPU/animation boundary. Current status:

| Module | Item | Status |
|--------|------|--------|
| `4D-Drop.js` | Fall time `T = √(2H/g)` | **Fixed** — `computePhysics()` caches `Q_T = 2H/g` (quadrance), single deferred `√` |
| `4D-Drop.js` | Position calculations | **Clean** — pure Quadray vector algebra, no trig |
| `rt-gravity-demo.js` | Fall time `T = √(2H/g)` | TODO — adopt `computePhysics()` caching pattern |
| `rt-gravity-demo.js` | Link angle: `Math.asin(Math.sqrt(s)) × 180/π` | TODO — display spread directly, use `RT.spreadToDegrees()` for annotation only |
| `rt-gravity-demo.js` | Gravity gap: two `Math.sqrt()` calls | TODO — defer to quadrance |
| `rt-math.js` | `computeGravityCumulativeDistances()`: one `√` per shell | **Accepted** — √ inherent in speed-spacing metric formula, cached once (see Phase 2 analysis) |
| `rt-grids.js` | Consumers of cumDist use cached radii directly | **Clean** — no additional √, Weierstrass arcs are RT-pure |

### Principle

From the README: *"Compute all relationships in quadrance space. Only take √ at final THREE.Vector3 creation."* The physics analogue: compute in time-quadrance space (`Q_T = 2H/g`), take √ once at the animation-boundary where real seconds are needed for `requestAnimationFrame` timing.

---

## Immediate TODOs

- [x] **Phase 7: `demos/4D-Drop.js`** — core demo implemented (`55e730c`–`8dcc616`)
- [x] **Phase 7b: Cell slider** — manual scrubbing +144 to −144, steps of 12
- [x] **Phase 7c: Circumsphere boundary** — 7F geodesic icosahedron wireframe at extent radius
- [x] **Phase 6c: N-gon slider + radial lines** — `nGon` parameter threaded through full chain, slider in Central Angle section (3–128), radial lines from N-gon vertices
- [x] **Radial line generation** via N-gon vertex-aligned radials on both Cartesian and Quadray polar planes
- [x] **Phase 2: Distance vs. Time analysis** — speed spacing (current, metric) vs. Galileo time spacing (√-free) formalized; previous `Q_k = E²·k/N` proposal retired
- [ ] **Body selector UI** for the 3D gravity grids (port from Gravity Numberline demo)
- [ ] **Phase 4: Gravity-warped polyhedra** — vertex remapping prototype
- [ ] **Phase 5b: Pin joints and hinges** in `rt-ik-solvers.js`
