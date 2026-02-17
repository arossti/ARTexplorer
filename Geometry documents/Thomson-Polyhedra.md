# Thomson Polyhedra — Great-Circle Shells

Working document for the Thomson Polyhedra feature in ARTExplorer.

---

## Completed Work

### Commits (branch: `Thomson-Polyhedra`)
1. `8f873ad` — Feat: Thomson Polyhedra — rt-thomson.js module + full UI wiring
2. `d5b1de9` — Fix: Thomson slider state persistence + docs
3. `cbd4993` — Feat: Thomson great-circle shells — vertex nodes + plane toggles
4. `d1a7616` — Docs: Move 10 completed docs to Geometry Archived subfolder
5. `aa82029` — Fix: Apply 3021 Rule to Thomson face plane color/label mapping
6. `248a9d5` — Feat: Great circle rotation sliders + coincident node counter

### What's Built

**rt-thomson.js** — Great-circle generation module:
- `buildPlaneBasis(normal)` — orthonormal basis from plane normal
- `makeCircle(normal, radius, nGon, rotationDeg)` — N-gon via `RT.nGonVertices()`, 2D rotation via `RT.reflectInLine()` double-reflection, 2D→3D transform
- `collectCircleVertices(circles, nGon)` — nodes at each circle's N-gon vertices with quadrance-based dedup
- Plane definitions: `TET_FACE_PLANES` (4, 3021-corrected), `TET_EDGE_PLANES` (6), `OCT_COORD_PLANES` (3)
- Public API: `Thomson.tetrahedron()`, `Thomson.octahedron()` returning `{circles, nodes, nGon, planeCount, coincidentCount}`

**rt-rendering.js** — `renderThomsonCircles()` renderer with per-plane colored LineSegments + vertex nodes.

**index.html** — N-gon sliders (3-12), rotation sliders (0-120° tet, 0-90° oct), face/edge plane checkboxes.

**rt-ui-binding-defs.js** — Slider and checkbox bindings with degree formatting.

### Node Strategy Evolution
- v1: Theoretical plane-pair intersection points → too many floating nodes
- v2: Segment-segment crossing detection → still spurious at low N
- v3 (current): **Nodes at each circle's N-gon vertices** — clean, predictable, N nodes per circle with quadrance-based dedup for shared positions

### 3021 Rule Fix (commit `aa82029`)
`TET_FACE_PLANES` originally had wrong color/label mapping. Fixed per 3021 Rule:
- QW→D(-1,-1,1) Yellow, QX→A(1,1,1) Red, QY→C(-1,1,-1) Cyan, QZ→B(1,-1,-1) Green

Now matches Quadray polar grid colors when both are visible.

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

## Phase 2: Cube (Hexahedron)

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

  const { nodes, coincidentCount } = collectCircleVertices(circles, nGon);
  return { circles, nodes, nGon, planeCount: activePlanes.length, coincidentCount };
}
```

### UI Controls
- N-gon slider: 3–12
- Rotation slider: 0–90° (4-fold dominant symmetry)
- Checkboxes: Coordinate Planes (3), Diagonal Planes (6)

### Verification
- N=4 on 3 coord planes → 6 nodes at octahedron vertices (coord planes = oct symmetry)
- N=4 on all 9 planes → cube vertices recoverable with rotation
- N=8 on all 9 → maximum coincidence (4 | 8 and 2 | 8)

---

## Phase 3: Icosahedron

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
- Rotation slider range: 0–72° (360/5)
- Best N-gons: multiples of 5 (N=5, 10)
- N=5 on 15 planes → the Thomson solution itself (12 icosahedron vertices)

### Circumsphere
From the normalization in rt-polyhedra.js: circumsphere radius = halfSize (vertices are normalized to the sphere).

### Implementation Notes
- Will need `ICOSA_PLANES` constant with 15 entries
- Normals for the 12 non-coordinate planes must be computed from vertex data
- Colors: coordinate planes could use RGB, additional planes could use a 5-fold color scheme
- Checkboxes: "Coordinate Planes (3)" + "Edge Mirror Planes (12)" or by golden-rectangle group

---

## RT-Purity Audit: rt-thomson.js

### Classical Trig Usage (4 occurrences)

| Line | Code | Verdict |
|---|---|---|
| 32 | `Math.sqrt()` in `normalize()` | **Justified** — unavoidable for unit vectors in orthonormal basis construction |
| 101 | `Math.PI` in rotation deg→rad | **Boundary** — degree-to-rational conversion, see below |
| 102 | `Math.tan()` in rotation slope | **Boundary** — part of deg→slope conversion, see below |
| 193 | `Math.sqrt(3)` for tet circumsphere | **Fix**: use `RT.PureRadicals.sqrt3()` |

### Rotation: Math.PI + Math.tan (lines 101–102)

Current code:
```javascript
const halfRad = ((rotationDeg / 2) * Math.PI) / 180;
const m = Math.tan(halfRad);
```

This converts degrees → radians → slope for the double-reflection rotation. The actual rotation (`RT.reflectInLine`) is RT-pure. The `Math.PI/Math.tan` usage is the **degree-to-rational boundary** — analogous to how THREE.js grid rotation uses `Math.PI`.

**Why not RT.slopeFromSpread?** The slider parameter is degrees (user-friendly), and converting degrees → spread → half-angle spread → slope requires solving a half-angle identity that itself involves √. The current approach is the most direct path from degrees to the slope parameter that `reflectInLine` needs.

**Recommendation**: Add a justification comment and keep the current approach. The Math.PI/Math.tan are at the UX boundary (degree input → rational computation), not in the geometry engine.

### Math.sqrt(3) Fix (line 193)

```javascript
// Current:
const radius = halfSize * Math.sqrt(3);

// Should be:
const radius = halfSize * RT.PureRadicals.sqrt3();
```

This uses the cached √3 value from rt-math.js, maintaining consistency with the rest of the codebase.

### Plane Optimization

**No duplicate planes** — all plane sets are minimal:
- `TET_FACE_PLANES`: 4 unique normals (antipodal pairs define the same plane — (1,1,1) and (-1,-1,-1) are the same plane. But we only list one per plane, so no duplication.)
- `TET_EDGE_PLANES`: 6 unique normals (each edge midpoint direction is unique)
- `OCT_COORD_PLANES`: 3 unique normals (coordinate axes)

Verified: no two normals in any set are parallel (no n₁ = ±k·n₂), so all planes are distinct.

For the **cube implementation**: reuse `OCT_COORD_PLANES` + `TET_EDGE_PLANES` directly — do NOT create a duplicate `CUBE_COORD_PLANES` array.

### Code Quality Summary

- **236 lines** — well within function/file size guidelines
- **No console.log** statements
- **No commented-out code**
- **No duplicate logic** — `makeCircle()` is shared by both Thomson types
- **Clear module boundaries** — pure math, no THREE.js dependency, returns plain objects
- **Function ordering**: helpers (cross, normalize) → core (buildPlaneBasis, makeCircle, collectCircleVertices) → public API (Thomson.tetrahedron, Thomson.octahedron) ✓
- **O(n²) dedup** in `collectCircleVertices` — acceptable for max ~180 vertices (15 planes × 12-gon)

---

## Action Items

### Quick Fixes
1. **Line 193**: Replace `Math.sqrt(3)` with `RT.PureRadicals.sqrt3()`
2. **Lines 101–102**: Add justification comment for Math.PI/Math.tan at degree boundary

### Implementation Queue
3. **Thomson.cube()** — Compose from existing plane arrays (OCT_COORD + TET_EDGE)
4. **Icosahedron plane computation** — Derive 15 normals from rt-polyhedra.js vertex data
5. **Thomson.icosahedron()** — 15 planes, 5-fold symmetry, φ-based normals
6. **Edge drawing** — Convex hull or nearest-neighbor mode (experimental)

### Verification Targets
- Thomson Oct at N=4 → 6 coincident nodes at octahedron vertices ✓ (already works)
- Thomson Tet at N=3 with rotation → discoverable coincident orientation ✓ (already works)
- Thomson Cube at N=4 on 9 planes → cube vertices recoverable
- Thomson Icosa at N=5 on 15 planes → 12 icosahedron vertices recoverable
