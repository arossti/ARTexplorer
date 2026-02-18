# Thomson Polyhedra — Great-Circle Shells

Working document for the Thomson Polyhedra feature in ARTExplorer.

---

## Completed Work

### Commits

**Branch `Thomson-Polyhedra` (merged as PR #102):**
1. `1a6a86f` — Feat: UI scaffolding — Experimental Polyhedra section + Thomson stubs
2. `8f873ad` — Feat: Thomson Polyhedra — rt-thomson.js module + full UI wiring
3. `d5b1de9` — Fix: Thomson slider state persistence + docs
4. `cbd4993` — Feat: Thomson great-circle shells — vertex nodes + plane toggles
5. `aa82029` — Fix: Apply 3021 Rule to Thomson face plane color/label mapping
6. `248a9d5` — Feat: Great circle rotation sliders + coincident node counter
7. `e33cdfe` — Improve: RT-purity audit fixes + Thomson-Polyhedra.md working doc
8. `cd1e8ba` — Feat: Convex hull face rendering + edge pairs for Thomson polyhedra
9. `d0792a2` — Feat: Thomson Tet rotation slider 0–360° with spread display
10. `810c424` — Feat: Thomson Oct slider 360° + vibrant colors + color theory modal
11. `c29c679` — Fix: Add Thomson polyhedra to view system state capture/restore

**Branch `Thomson-Polyhedra2` (PRs #103, #104):**
12. `05894d3` — Feat: Add Coordinate System controls to view/animation state system
13. `b07dad8` — Fix: Grid plane sync + dissolve transitions for view animations
14. `e0a537e` — Clean: Replace .artview extension with .json for view exports

### What's Built

**rt-thomson.js** — Great-circle generation module:
- `buildPlaneBasis(normal)` — orthonormal basis from plane normal
- `makeCircle(normal, radius, nGon, rotationDeg)` — N-gon via `RT.nGonVertices()`, 2D rotation via `RT.reflectInLine()` double-reflection, 2D→3D transform
- `collectCircleVertices(circles, nGon)` — nodes at each circle's N-gon vertices with quadrance-based dedup; returns `{ nodes, edges, coincidentCount }`
- `getIcosaEdgePlanes()` — lazy-cached derivation of 12 edge-mirror plane normals from icosahedron vertex/edge data using `RT.PurePhi.value()`
- **Edge pair tracking**: Each circle's N-gon edges mapped to deduplicated node indices as `[nodeIndex_a, nodeIndex_b]` pairs (needed for IK constraints)
- Plane definitions: `TET_FACE_PLANES` (4, 3021-corrected), `TET_EDGE_PLANES` (6), `OCT_COORD_PLANES` (3), + 12 icosa edge-mirror planes (computed)
- Public API: `Thomson.tetrahedron()`, `Thomson.octahedron()`, `Thomson.cube()`, `Thomson.icosahedron()` returning `{circles, nodes, edges, nGon, planeCount, coincidentCount}`

**rt-rendering.js** — `renderThomsonCircles()` renderer:
- Per-plane colored LineSegments for great circles
- Vertex nodes with configurable size/geometry (RT or classical)
- **Convex hull face mesh** via `ConvexGeometry` (THREE.js addon) — semi-transparent, flatShading, FrontSide culling with CCW winding, renderOrder=1 behind lines/nodes
- **Hull edges** via `THREE.EdgesGeometry` — white wireframe of triangulated hull
- Dissolve opacity support throughout (circles, nodes, faces, edges)

**index.html** — UI controls per Thomson type:
- N-gon slider: 3–12
- Rotation slider: 0–360° (full circle, symmetry fold determines snap points)
- Tet: Face Planes (4) checkbox (default on), Edge Planes (6) checkbox
- Both: Show Faces checkbox, Hull Edges checkbox

**rt-ui-binding-defs.js** — Slider and checkbox bindings:
- Rotation value formatted as `{deg}° s={spread}` where spread = sin²(θ) — the RT measure
- 4 spread intervals per 360°: 0→1→0→1→0

**color-theory-modal.js** — Thomson Polyhedra section:
- `thomson-tetra`: Nodes & Faces color (default `0xFF5500` orange)
- `thomson-octa`: Nodes & Faces color (default `0xAA44FF` violet)
- `thomson-cube`: Nodes & Faces color (default `0x00CCFF` cyan-blue)
- `thomson-icosa`: Nodes & Faces color (default `0x44FF88` spring green)
- Mapped to `colorPalette.thomsonTetrahedron` / `.thomsonOctahedron` / `.thomsonCube` / `.thomsonIcosahedron` in rendering

**rt-delta.js** — View/animation state integration:
- Thomson checkboxes captured/restored: all show/hide, plane toggles, face/hull toggles, jitterbug bounce for all 4 Thomson types
- Thomson sliders captured/restored: `thomsonTetraNGon`, `thomsonTetraRotation`, `thomsonOctaNGon`, `thomsonOctaRotation`, `thomsonCubeNGon`, `thomsonCubeRotation`, `thomsonIcosaNGon`, `thomsonIcosaRotation`
- Sub-control panel visibility mapped for all 4 types
- Coordinate system controls (grid planes, tessellation sliders, toggle buttons) also added

**rt-animate.js** — Grid dissolve transitions:
- `_setupGridDissolve()` detects grid group visibility transitions between views
- Direct material traversal for opacity lerp (grids bypass `renderPolyhedron()` path)
- Smooth fade-in/fade-out during animated view transitions

### Node Strategy Evolution
- v1: Theoretical plane-pair intersection points → too many floating nodes
- v2: Segment-segment crossing detection → still spurious at low N
- v3 (current): **Nodes at each circle's N-gon vertices** — clean, predictable, N nodes per circle with quadrance-based dedup for shared positions

### 3021 Rule Fix (commit `aa82029`)
`TET_FACE_PLANES` originally had wrong color/label mapping. Fixed per 3021 Rule:
- QW→D(-1,-1,1) Yellow, QX→A(1,1,1) Red, QY→C(-1,1,-1) Cyan, QZ→B(1,-1,-1) Green

Now matches Quadray polar grid colors when both are visible.

### Rotation Slider: 360° with Spread Display
Originally: Tet 0–120° (3-fold), Oct 0–90° (4-fold). Extended to full 360° for both, since:
- Exploring rotations beyond the symmetry fold reveals frustrated configurations
- The spread display `s = sin²(θ)` shows the RT angular measure alongside degrees
- 4 spread intervals per full rotation: 0→1→0→1→0

### Convex Hull Face Rendering (commit `cd1e8ba`)
All Thomson nodes lie on the circumsphere → every node is on the convex hull → the 3D convex hull triangulation = the polyhedron we want, for ANY rotation angle.

- **ConvexGeometry** from `three/addons/geometries/ConvexGeometry.js` — takes Vector3[], returns triangulated BufferGeometry with correct CCW winding and outward normals
- **renderThomsonCircles()** extended with optional hull face mesh (opacity 0.3, flatShading, depthWrite false)
- **Hull edges** via `THREE.EdgesGeometry(hullGeometry, 1)` — threshold angle 1° for edge detection
- **Minimum 4 nodes** required for hull (gracefully skipped below that)

### Jitterbug Connection
The rotation slider implements the Jitterbug motion. Thomson Oct at N=4:
- **0°**: 12 distinct nodes = cuboctahedron configuration
- **45°**: Nodes coincide pairwise → 6 nodes = octahedron (doubled edges)
- With faces enabled, this visualizes the cuboctahedron→octahedron collapse in real time

---

## Number Theory: Symmetry Fold vs N-gon Divisibility

This is fundamentally a **number theory** constraint. The symmetry fold of each Thomson solution determines which N-gon generations can produce complete polyhedra with maximum coincident nodes:

| Thomson Type | Planes | Fold | Best N-gons | Rotation Range |
|---|---|---|---|---|
| Tetrahedron | 4 face | 3-fold | 3, 6, 9, 12 | 0–120° (360/3) |
| Tetrahedron | 6 edge | 2-fold | 2, 4, 6, 8, 10, 12 | 0–180° (360/2) |
| Octahedron | 3 coord | 4-fold | 4, 8, 12 | 0–90° (360/4) |
| **Cube** | 3 coord + 6 diag | 4/2-fold | 4, 8, 12 | 0–90° |
| **Icosahedron** | 15 mirror | 5-fold | 5, 10 | 0–72° (360/5) |

**Odd N on even-fold planes and vice versa → irregular polyhedra.** These are Thomson's *frustrated* configurations, analogous to incommensurate lattice ratios.

---

## RT-Purity Audit: rt-thomson.js

### Classical Trig Usage (3 occurrences — after audit fixes)

| Line | Code | Verdict |
|---|---|---|
| 32 | `Math.sqrt()` in `normalize()` | **Justified** — unavoidable for unit vectors in orthonormal basis construction |
| 102 | `Math.PI` in rotation deg→rad | **Boundary** — degree-to-slope UX boundary; justified in code comment |
| 103 | `Math.tan()` in rotation slope | **Boundary** — part of deg→slope conversion; justified in code comment |

~~Line 193: `Math.sqrt(3)` for tet circumsphere~~ → **Fixed** (commit `e33cdfe`): now uses `RT.PureRadicals.sqrt3()`

### Rotation: Math.PI + Math.tan (lines 102–103)

```javascript
// Math.PI/Math.tan justified: degree-to-slope UX boundary; rotation itself is RT-pure.
const halfRad = ((rotationDeg / 2) * Math.PI) / 180;
const m = Math.tan(halfRad);
```

This converts degrees → radians → slope for the double-reflection rotation. The actual rotation (`RT.reflectInLine`) is RT-pure. The `Math.PI/Math.tan` usage is the **degree-to-rational boundary** — analogous to how THREE.js grid rotation uses `Math.PI`.

### Plane Optimization

**No duplicate planes** — all plane sets are minimal:
- `TET_FACE_PLANES`: 4 unique normals (antipodal pairs define the same plane — (1,1,1) and (-1,-1,-1) are the same plane. But we only list one per plane, so no duplication.)
- `TET_EDGE_PLANES`: 6 unique normals (each edge midpoint direction is unique)
- `OCT_COORD_PLANES`: 3 unique normals (coordinate axes)

Verified: no two normals in any set are parallel (no n₁ = ±k·n₂), so all planes are distinct.

For the **cube implementation**: reuse `OCT_COORD_PLANES` + `TET_EDGE_PLANES` directly — do NOT create a duplicate `CUBE_COORD_PLANES` array.

### Code Quality Summary

- **251 lines** — well within function/file size guidelines
- **No console.log** statements
- **No commented-out code**
- **No duplicate logic** — `makeCircle()` is shared by both Thomson types
- **Clear module boundaries** — pure math, no THREE.js dependency, returns plain objects
- **Function ordering**: helpers (cross, normalize) → core (buildPlaneBasis, makeCircle, collectCircleVertices) → public API (Thomson.tetrahedron, Thomson.octahedron) ✓
- **O(n²) dedup** in `collectCircleVertices` — acceptable for max ~180 vertices (15 planes × 12-gon)

---

## Action Items

### Completed
1. ~~Line 193: Replace Math.sqrt(3) with RT.PureRadicals.sqrt3()~~ (commit `e33cdfe`)
2. ~~Lines 101–102: Add justification comment~~ (commit `e33cdfe`)
3. ~~Face rendering via ConvexGeometry~~ (commit `cd1e8ba`)
4. ~~Edge pair tracking in collectCircleVertices()~~ (commit `cd1e8ba`)
5. ~~Rotation sliders extended to 360° with spread display~~ (commits `d0792a2`, `810c424`)
6. ~~Thomson colors in color-theory-modal.js~~ (commit `810c424`)
7. ~~View system state capture/restore~~ (commit `c29c679`)
8. ~~Coordinate system controls in view/animation state~~ (commit `05894d3`)
9. ~~Grid dissolve transitions~~ (commit `b07dad8`)

### Implementation Queue
10. ~~**Thomson.cube()** — Compose from existing plane arrays (OCT_COORD + TET_EDGE)~~ ✓ (Thomson-Polyhedra2 branch)
11. ~~**Icosahedron plane computation** — Derive 12 edge-mirror normals via `getIcosaEdgePlanes()`~~ ✓
12. ~~**Thomson.icosahedron()** — 15 planes, 5-fold symmetry, φ-based normals~~ ✓
13. ~~**Jitterbug animation** — Play/Pause button + Bounce mode in Thomson Oct controls~~ ✓
14. ~~**Generalized Jitterbug** — Data-driven controller for all 4 Thomson forms with HiFi styling~~ ✓

### Verification Targets
- Thomson Oct at N=4 → 6 coincident nodes at octahedron vertices ✓
- Thomson Tet at N=3 with rotation → discoverable coincident orientation ✓
- Thomson Oct at N=4 + Show Faces → 8 triangular faces = octahedron ✓
- Thomson Oct at N=4, rotation 0→45° + faces → Jitterbug cuboctahedron→octahedron ✓
- Irregular case (N=5, any rotation) → fully closed triangulated hull, no holes ✓
- Thomson Cube at N=4 on 9 planes → cube vertices recoverable (pending browser test)
- Thomson Icosa at N=5 on 15 planes → 12 icosahedron vertices recoverable (pending browser test)
- Jitterbug Play/Pause → smooth 0°-90° oscillation with real-time slider update (pending browser test)
- Jitterbug on all 4 forms: Tet, Oct, Cube, Icosa — each with HiFi Play button + Bounce (pending browser test)
- `getIcosaEdgePlanes().length === 12` (pending browser console verification)

---

## Phase 2: Cube (Hexahedron) — IMPLEMENTED

### Key Insight: Plane Reuse

The cube's 9 symmetry planes are exactly the union of two existing sets:

```
CUBE_PLANES = OCT_COORD_PLANES (3) + TET_EDGE_PLANES (6)
```

- **3 coordinate planes** (through opposite face centers): normals (1,0,0), (0,1,0), (0,0,1) — 4-fold symmetry. Already defined as `OCT_COORD_PLANES`.
- **6 diagonal planes** (through opposite edge midpoints): normals (0,1,1), (1,0,1), (1,1,0), (1,-1,0), (1,0,-1), (0,1,-1) — 2-fold symmetry. Already defined as `TET_EDGE_PLANES`.

This means `Thomson.cube()` can compose existing plane arrays — no new geometry needed.

### Circumsphere
For a cube with vertices at (±s, ±s, ±s): circumsphere radius = s√3.
Same as the tetrahedron inscribed in the same cube.

### Implementation

```javascript
// In rt-thomson.js — reuses existing plane definitions
cube(halfSize = 1, options = {}) {
  const nGon = options.nGon || 5;
  const rotation = options.rotation || 0;
  const coordPlanes = options.coordPlanes ?? true;   // 3 face-center planes
  const diagPlanes = options.diagPlanes ?? true;      // 6 edge-diagonal planes
  const radius = halfSize * RT.PureRadicals.sqrt3();  // circumsphere

  const activePlanes = [];
  if (coordPlanes) activePlanes.push(...OCT_COORD_PLANES);
  if (diagPlanes)  activePlanes.push(...TET_EDGE_PLANES);

  const circles = activePlanes.map(p => ({
    positions: makeCircle(p.normal, radius, nGon, rotation),
    color: p.color,
    label: p.label,
  }));

  const { nodes, edges, coincidentCount } = collectCircleVertices(circles, nGon);
  return { circles, nodes, edges, nGon, planeCount: activePlanes.length, coincidentCount };
}
```

### UI Controls
- N-gon slider: 3–12
- Rotation slider: 0–360° with spread display
- Checkboxes: Coordinate Planes (3), Diagonal Planes (6), Show Faces, Hull Edges

### Verification
- N=4 on 3 coord planes → 6 nodes at octahedron vertices (coord planes = oct symmetry)
- N=4 on all 9 planes → cube vertices recoverable with rotation
- N=8 on all 9 → maximum coincidence (4 | 8 and 2 | 8)

---

## Phase 3: Icosahedron — IMPLEMENTED

### Symmetry Analysis

The icosahedron has **15 mirror planes** (Ih symmetry group). Each plane passes through one edge, the center, and the antipodal edge.

From `rt-polyhedra.js`, the icosahedron vertices are 3 orthogonal golden rectangles:
- Rectangle 1 (YZ plane, x=0): vertices 0–3 at (0, ±a, ±b)
- Rectangle 2 (XZ plane, y=0?): vertices 4–7 at (±a, ±b, 0)
- Rectangle 3 (XY plane, z=0?): vertices 8–11 at (±b, 0, ±a)

Where `a = halfSize/√(1+φ²)`, `b = φ·a`, and circumsphere radius = halfSize.

### The 15 Planes

**Group A: 3 coordinate planes** (each contains one golden rectangle = 4 vertices):
- YZ plane: normal (1, 0, 0) — contains vertices 0–3 at (0, ±a, ±b), x=0
- XZ plane: normal (0, 1, 0) — contains vertices 8–11 at (±b, 0, ±a), y=0
- XY plane: normal (0, 0, 1) — contains vertices 4–7 at (±a, ±b, 0), z=0

**Group B: 12 additional planes** (each through an edge pair):
Each of the remaining 12 mirror planes passes through exactly 2 vertices (one edge) and the 2 antipodal vertices (the opposite edge). These 12 planes involve normals with golden-ratio components.

The normals can be derived from edge midpoints. For each antipodal edge pair, the mirror plane contains both edges and the center. The plane normal is perpendicular to both edges.

**TODO**: Compute the 12 additional normals from vertex coordinates. They should involve φ-based components, connecting directly to `RT.PurePhi`.

### Symmetry Fold
Each mirror plane has **5-fold** rotational symmetry (pentagonal), so:
- Rotation slider range: 0–72° (360/5), but slider will be 0–360° with spread display
- Best N-gons: multiples of 5 (N=5, 10)
- N=5 on 15 planes → the Thomson solution itself (12 icosahedron vertices)

### Circumsphere
From the normalization in rt-polyhedra.js: circumsphere radius = halfSize (vertices are normalized to the sphere).

### Implementation Notes (as-built)
- `getIcosaEdgePlanes()` — lazy-cached function computes 12 edge-mirror plane normals at first call
- Algorithm: for each of 30 edges, compute `normalize(cross(midpoint, edgeDir))`, deduplicate antipodal pairs, filter coordinate planes → exactly 12
- Uses `RT.PurePhi.value()` for φ — icosahedron vertices at (0, ±1, ±φ) and cyclic permutations
- Edge-mirror plane color: `0xcc66ff` (lavender), coordinate planes reuse RGB from `OCT_COORD_PLANES`
- Checkboxes: "Coord Planes (3)" + "Edge Mirror Planes (12)"
- Color modal entry: `thomson-icosa` → `colorPalette.thomsonIcosahedron` (default `0x44FF88` spring green)
- Full 8-file integration: rt-thomson.js, rt-rendering.js, index.html, rt-ui-binding-defs.js, rt-init.js, rt-delta.js, rt-filehandler.js, color-theory-modal.js

---

## Phase 4: Jitterbug Animation — GENERALIZED

### Design
The Jitterbug transformation (N=4 squares rotating on symmetry planes) is a universal property of all Thomson forms, not just the Octahedron. A data-driven controller (`JITTERBUG_FORMS` config table in `rt-init.js`) drives all 4 forms through a single `requestAnimationFrame` loop.

### UI (inside each form's controls)
Each Thomson form (Tet, Oct, Cube, Icosa) has a Jitterbug section with:
- **Play/Pause button** (`thomson{Form}JitterbugToggle`) — HiFi `.toggle-btn.variant-standard` styling with `.active` state
- **Bounce checkbox** (`thomson{Form}JitterbugBounce`, default checked)
  - Bounce: oscillate 0° → 90° → 0° (2 full fold cycles)
  - Unchecked: continuous 0° → 360° loop

### On Play — Auto-Setup
- Forces **N-gon to 4** (the Jitterbug requires squares)
- Enables **Show Faces** + **Hull Edges** checkboxes
- Auto-enables the form's main checkbox if not checked

### Animation Logic (rt-init.js)
- Single `requestAnimationFrame` loop drives all active forms simultaneously
- 0.5°/frame (~30°/sec at 60fps), bounce range 0°→90°
- Updates each form's rotation slider + spread display in real time
- Calls `renderingAPI.updateGeometry()` once per frame for all active forms
- Loop auto-stops when no forms are active
- Animation state (play/pause) intentionally NOT persisted — resets to paused on load
- Bounce checkboxes ARE persisted through rt-delta.js checkbox system

### ID Convention
| Form | Button ID | Bounce ID |
|------|-----------|-----------|
| Tet | `thomsonTetJitterbugToggle` | `thomsonTetJitterbugBounce` |
| Oct | `thomsonOctaJitterbugToggle` | `thomsonOctaJitterbugBounce` |
| Cube | `thomsonCubeJitterbugToggle` | `thomsonCubeJitterbugBounce` |
| Icosa | `thomsonIcosaJitterbugToggle` | `thomsonIcosaJitterbugBounce` |
