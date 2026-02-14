# Gravity Grids — Workplan

**Branch:** `main` (Gravity Numberline demo merged via PR #93)
**Goal:** Build warped coordinate grids where intervals encode gravitational acceleration rather than equal spatial distance — so a freely falling object appears to traverse gridlines at constant visual speed.
**Status:** Phase 0 complete — Gravity Numberline demo deployed and verified

---

## The Core Idea

In a standard Cartesian or Quadray grid, gridlines are equally spaced. An object falling under gravity accelerates through these equal intervals — it crosses distant gridlines slowly, then near ones rapidly. The visual effect is acceleration.

**Gravity Grids invert this.** The grid is a series of concentric **spherical shells** centered on the gravity source (origin). Each shell represents one increment of gravitational acceleration (g = 9.8 m/s²). The shells **condense near the origin** where the gravitational field is strongest, and **spread apart far from the origin** where the field weakens. The shape of each shell remains a sphere — the warping is in the *spacing*, not the *shape*.

The arcs connecting intersection points on a given shell are **outward sweeps of the radius** — great-circle arcs along the spherical surface, curving away from the chord that would connect the points through the interior.

The result: an object falling inward crosses shells at a **constant visual rate**, because the shell density matches the object's increasing velocity. The acceleration is encoded in the grid geometry itself rather than in the object's motion.

This is a coordinate system where **the grid does the physics** — analogous to how curved spacetime in GR encodes gravity in the metric rather than as a force.

---

## Phase 0: The 1D Number Line — Mathematical Foundation

Before touching any rendering code, derive the shell radii on a simple radial number line.

### The Spherical Shell Model

The gravity grid is a set of concentric spherical shells centered on the gravity source (origin). Each shell boundary represents a surface of equal gravitational potential increment.

For a point mass M at the origin, the gravitational potential is:

```
Φ(r) = -GM/r
```

If we divide the total potential range into N equal increments ΔΦ, each shell boundary sits at:

```
r_k = GM / (k · ΔΦ)    for k = 1, 2, 3, ... N
```

### Shell Spacing

The gap between consecutive shells:

```
Δr_k = r_k - r_{k+1}
      = GM/ΔΦ · [1/k - 1/(k+1)]
      = GM/ΔΦ · 1/(k(k+1))
```

This is a **harmonic compression**: gaps shrink as 1/k² toward the origin.

- **Outermost shells** (small k): widely spaced — weak field, gentle gradient
- **Innermost shells** (large k): tightly packed — strong field, steep gradient

### Why This Produces Constant Visual Speed

An object falling from rest at shell 1 (outermost) toward the origin:

- Far from origin: **slow** (barely accelerating), but shells are **far apart** → crosses shells at moderate rate
- Near origin: **fast** (heavily accelerated), but shells are **tightly packed** → still crosses shells at moderate rate

The shell density compensates for the velocity. Each shell-crossing takes approximately equal time — the acceleration is absorbed by the grid.

### Concrete Example: N = 144 shells

Set GM = 1 and ΔΦ = 1/N (so total potential range spans the grid):

```
r_k = N/k = 144/k

k=1:   r = 144.000  (outermost shell)
k=2:   r = 72.000   (Δr = 72.000 — huge gap)
k=3:   r = 48.000   (Δr = 24.000)
k=10:  r = 14.400   (Δr = 1.600)
k=12:  r = 12.000   (Δr = 1.091)
k=72:  r = 2.000    (Δr = 0.028)
k=143: r = 1.007    (Δr = 0.005)
k=144: r = 1.000    (Δr = 0.005)
```

The grid is **dense near the origin** (strong field) and **sparse far out** (weak field). Each shell is a sphere at radius r_k.

### Alternative: Uniform-g Approximation (Near-Surface)

For a uniform field (constant g, like near Earth's surface), each shell represents equal velocity increments rather than equal potential increments:

```
r_k = H · (1 - k²/N²)
```

This produces a quadratic compression toward the origin. Useful for the simplified "object dropped from height H" scenario before introducing inverse-square fields.

### Choosing Between Models

| Model | Shell spacing | Best for |
|-------|--------------|----------|
| Inverse-square (1/r) | Harmonic: 1/k² | Realistic gravity, planetary scales |
| Uniform-g | Quadratic: (2k+1)/N² | Near-surface approximation, simpler math |

Phase 1 implements uniform-g first (simpler). Phase 2 upgrades to inverse-square.

---

## Phase 1: G-Cartesian Planes — Warped XYZ Grids

### Implementation Strategy

Extend `rt-grids.js` with a new function `createGravityCartesianGrid()` that replaces `THREE.GridHelper` with custom line geometry using the non-uniform interval sequence from Phase 0.

### Architecture

```
createGravityCartesianGrid(scene, divisions, gravityCenter)
├── computeGravityIntervals(divisions, totalExtent, g)  // Phase 0 formula
├── buildGravityPlane(intervals, axis1, axis2)           // Line geometry
│   ├── Lines along axis1 at gravity-spaced positions on axis2
│   └── Lines along axis2 at gravity-spaced positions on axis1
└── Assemble 3 planes (XY, XZ, YZ) into group
```

### Key Decisions

1. **Gravity center**: The origin (0,0,0) by default. All intervals compress toward the gravity center. Future: movable gravity source.

2. **Bidirectional intervals**: The grid extends in both directions from the gravity center. Intervals are symmetric (or asymmetric if gravity source is off-center).

3. **Grid extent**: Matches existing Cartesian grid — `divisions` parameter controls how many gridlines. The outermost gridline is at `divisions × baseUnit` (same total extent as the equal-spaced grid), but inner lines are redistributed.

4. **UI toggle**: Add "G-Cartesian Planes" option to the Coordinate Systems section. When toggled, replaces the standard Cartesian grid with the gravity-warped version. The existing plane visibility toggles (XY, XZ, YZ) still apply.

### Naming Convention

| Standard Grid     | Gravity Grid        |
|-------------------|---------------------|
| Cartesian Planes  | G-Cartesian Planes  |
| Quadray Grids     | G-Quadray Grids     |

### What Changes vs. Standard Grid

| Property         | Standard              | G-Grid                                    |
|------------------|-----------------------|-------------------------------------------|
| Shell/line shape | Flat planes           | Spherical shells (concentric)             |
| Interval spacing | Equal (1.0 units)     | Condensing toward origin (1/k² or quadratic) |
| Lines between points | Straight          | Straight (Phase 1) → Outward arcs (Phase 3) |
| Total extent     | Same                  | Same                                      |
| Shell/line count | Same (N)              | Same (N)                                  |
| Visual effect    | Acceleration visible  | Acceleration hidden in grid               |

---

## Phase 1: G-Quadray Grids — Gravity-Warped Central Angle Tessellation

**Status: In Progress**
**Approach: Modify existing `createIVMGrid()` with `gridMode` parameter**

### The Core Technique: cumDist Lookup Table

The existing `createIVMGrid()` computes each vertex as:
```
P(i,j) = basis1 × (i × edgeLength) + basis2 × (j × edgeLength)
```

The gravity variant replaces this with a **cumulative distance lookup**:
```
P(i,j) = basis1 × cumDist[i] + basis2 × cumDist[j]
```

Where `cumDist[k]` encodes the gravity-warped distance from origin to grid line k.

- **Uniform mode:** `cumDist[k] = k × edgeLength` (constant intervals, current behavior)
- **Gravity mode:** `cumDist[k] = reversed_radii[k] × scaleFactor` (harmonic compression — small steps near origin, large steps far out)

**Same loop body, same topology, same triangle count.** Only the spacing changes.

### Mathematical Derivation

From `computeGravityIntervals(N)`:
- `radii = [N/1, N/2, N/3, ..., N/N]` (outermost → innermost)
- Reverse for origin-outward: `[1, N/(N-1), ..., N]` (innermost → outermost)
- Scale to match uniform grid extent: `scaleFactor = (N × QUADRAY_GRID_INTERVAL) / N = QUADRAY_GRID_INTERVAL`
- `cumDist[k] = reversed_radii[k] × QUADRAY_GRID_INTERVAL`

Result: dense small triangles near origin (strong field), sparse large triangles far out (weak field).

### New Function: `RT.Gravity.computeGravityCumulativeDistances(N, totalExtent)`

Added to `rt-math.js` inside `RT.Gravity` namespace. Returns N+2 cumulative distances (extra element for boundary triangle safety — the tessellation loop accesses `cumDist[i+1]` where `i` can reach `tessellations`).

### Grid Mode UI

Three-button toggle in the Central Angle Grids section (same `toggle-btn variant-objsnap` pattern as coordinate mode):

| Button | Mode | Status |
|--------|------|--------|
| **Uniform** | Standard equal-interval tessellation | Active (default) |
| **Gravity** | Gravity-warped intervals, chordal (straight lines) | Phase 1 |
| **Spherical** | Gravity-warped intervals, great-circle arcs | Disabled (Phase 3 placeholder) |

Mode change triggers grid rebuild via existing `rebuildQuadrayGrids()` pattern. Tessellation slider controls number of intervals (N) in both modes.

### Threading `gridMode` Through the Call Chain

```
UI button click / slider change
  → rt-init.js reads active mode from data-grid-mode attribute
  → rt-ui-binding-defs.js passes gridMode to renderingAPI
  → rt-rendering.js wrapper forwards to Grids module
  → rt-grids.js: rebuildQuadrayGrids() → createIVMPlanes() → createIVMGrid()
  → createIVMGrid() branches on gridMode to build cumDist table
```

All parameters have `= 'uniform'` defaults — fully backward-compatible.

### Files Modified

| File | Changes |
|------|---------|
| `modules/rt-math.js` | +25 lines: `computeGravityCumulativeDistances()` in `RT.Gravity` |
| `modules/rt-grids.js` | ~30 lines: `gridMode` param + cumDist logic in 3 functions |
| `modules/rt-rendering.js` | ~5 lines: thread `gridMode` through wrapper |
| `index.html` | +15 lines: Grid Mode button group |
| `modules/rt-init.js` | +20 lines: grid mode button handler |
| `modules/rt-ui-binding-defs.js` | ~3 lines: slider reads/passes gridMode |

~100 lines total. No new files.

### RT Purity Consideration

The gravity intervals are inherently irrational (they involve the harmonic series N/k). This is acceptable because the gravity grid represents a **physical metric** (spacetime curvature), not a pure geometric construction. The base Quadray interval (√6/4) remains the RT-pure reference; the gravity warping is an applied distortion.

Document this distinction clearly in code comments: RT-pure geometry vs. physics-applied metric.

---

## Phase 3: Curved Gridlines — Outward Arcs

### The Problem with Straight Chords

Phases 1–2 connect grid intersection points with straight line segments. But two points on the same spherical shell, connected by a straight chord, cut *through* the interior — below the shell surface. This misrepresents the geometry: the actual path along the shell surface curves **outward** from the chord.

### The Solution: Great-Circle Arcs

Replace straight chords with **arc segments** that follow the spherical shell surface. Each segment between two points on shell k sweeps **outward** at radius r_k — a great-circle arc on the sphere.

#### Visualizing the Arcs

```
Straight chord (Phase 1):     A ———————— B     (cuts through interior)
Great-circle arc (Phase 3):   A ⌒⌒⌒⌒⌒⌒ B     (sweeps outward along shell)
```

The arc bulges outward from the origin. The "outward sweep" is the key visual: the grid is not just non-uniformly spaced, it is **curved** — each shell is visibly spherical.

#### For G-Cartesian Planes

Instead of straight horizontal/vertical lines, each "gridline" is a circular arc at radius r_k:

```
Standard grid:  y = k        (horizontal line)
Gravity grid:   |r| = r_k    (circular arc, centered on gravity source)
```

In a 2D plane slice, these are circles. In 3D, sections of spheres.

#### For G-Quadray Grids

Each tessellation ring's edges become geodesic arcs on the sphere at radius r_k. The triangular tessellation vertices remain at the same angular positions, but edges curve outward to follow the spherical surface. Visually, the triangular grid on each shell looks like a **spherical tiling** rather than a flat tessellation.

### Implementation: RT-Pure Rational Arcs (Not SLERP)

Classical SLERP computes intermediate arc points via:

```
slerp(A, B, t) = sin((1-t)θ)/sin(θ) · A + sin(tθ)/sin(θ) · B
```

Every sample point requires `sin` and `arccos` — transcendental functions that introduce irrational mantissas and accumulated truncation. This violates the RT design principle: *no square roots needed, no transcendental functions, algebraic identities remain exact*.

**Instead, use the Weierstrass rational circle parameterization (stereographic projection):**

A great-circle arc between two points on a sphere is a circular arc in the plane defined by those two points and the center. A circle can be parameterized *rationally*:

```
For parameter u:
  x(u) = r · (1 - u²) / (1 + u²)
  y(u) = r · (2u)     / (1 + u²)
```

This is purely rational in `u` — addition, multiplication, division only. No `sin`, no `cos`, no transcendentals. The parameter `u` is conceptually `tan(θ/2)`, but we never compute the `tan` — we work with `u` directly as a rational variable.

#### The Pipeline

1. **Great-circle plane** — Cross product of `(A−C)` and `(B−C)` gives the plane normal. Pure algebra.

2. **Spread between A and B** (as seen from center C):
   ```
   s = 1 − [(A−C)·(B−C)]² / [Q(A,C) · Q(B,C)]
   ```
   Quadrances and dot products — all rational on rational inputs.

3. **Arc parameter range** — Given spread `s`, the endpoint parameter `u_max` satisfies:
   ```
   s · (1 + u²)² = 4u²
   ```
   A polynomial in `u²`, solvable algebraically. One `√` at most — same boundary as everywhere else in RT.

4. **Intermediate points** — Subdivide `u ∈ [0, u_max]` into N steps. Each intermediate point is a rational function of `u` applied to the plane basis vectors. No trig at any step.

5. **Float conversion** — Only at the final step, when handing `(x,y,z)` to THREE.js's vertex buffer.

#### Implementation Sketch

```javascript
RT.Gravity.rationalArc = function(A, B, center, segments = 16) {
    // 1. Plane basis (algebraic)
    const e1 = A.clone().sub(center);
    const Q_r = e1.dot(e1);              // quadrance = radius²
    const e2_raw = B.clone().sub(center);

    // 2. Spread between A and B from center (rational)
    const dot = e1.dot(e2_raw);
    const s = 1 - (dot * dot) / (Q_r * e2_raw.dot(e2_raw));

    // 3. Orthogonal basis in arc plane (one √ per arc — the GPU boundary)
    const r = Math.sqrt(Q_r);
    e1.normalize();
    e2_raw.sub(e1.clone().multiplyScalar(dot / Q_r));
    e2_raw.normalize();

    // 4. u_max from spread polynomial: s(1+u²)² = 4u²
    //    Rearranges to: s·u⁴ + (2s-4)·u² + s = 0
    //    Solve quadratic in u²:
    const disc = (2*s - 4)*(2*s - 4) - 4*s*s;  // = 16 - 16s
    const u2 = (4 - 2*s - Math.sqrt(disc)) / (2*s);
    const u_max = Math.sqrt(u2);                 // second √ per arc

    // 5. Rational parameterization — NO TRIG
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const u = (i / segments) * u_max;
        const denom = 1 + u * u;
        const x = r * (1 - u * u) / denom;   // rational in u
        const y = r * (2 * u) / denom;        // rational in u
        points.push(center.clone()
            .add(e1.clone().multiplyScalar(x))
            .add(e2_raw.clone().multiplyScalar(y)));
    }
    return points;
};
```

#### Comparison: SLERP vs. RT Rational Arcs

| Aspect | Classical SLERP | RT Rational Arc |
|--------|----------------|-----------------|
| Trig calls per arc | 2N (sin, arccos per sample) | Zero |
| `√` calls per arc | 0 | 2 (one for radius, one for u_max) |
| Accumulated truncation | Grows with N samples | Single boundary conversion |
| Visual result | Identical | Identical |
| Performance | Identical (rational ops are cheap) | Identical |
| RT-purity | Broken | **Maintained** |

The key insight: 2 square roots per arc (at the GPU boundary) vs. 2N transcendental calls per arc. Same visual output, algebraically exact intermediate math.

### Implementation Notes

- Arc resolution: ~16 segments per arc should suffice visually. Configurable.
- Performance: More vertices per gridline (16× vs 2 for straight). Monitor frame rate.
- **Do NOT use THREE.js `slerp` utilities** — they use classical trig internally. Use `RT.Gravity.rationalArc()` instead.
- The arcs are the **true geometry** of the grid — they show the actual shell surface, not an approximation.
- The rational parameterization is the Weierstrass substitution (stereographic projection of the circle), a standard technique in algebraic geometry — fully consistent with Wildberger's RT framework.

---

## Phase 4: Distorted Polyhedra — Geometry in Curved Space

### The Question

If coordinates (1,1,1) represent a point in gravity-warped space, how do polyhedra render?

### The Approach

A polyhedron defined by its vertex coordinates in flat space gets **remapped** through the gravity metric:

```javascript
function gravityWarp(vertex, gravityCenter, intervals) {
    // 1. Find radial distance from gravity center
    const r = vertex.distanceTo(gravityCenter);

    // 2. Map through gravity interval function
    //    Equal-space radius r → gravity-warped radius R(r)
    const R = mapToGravityRadius(r, intervals);

    // 3. Scale vertex radially
    const direction = vertex.clone().sub(gravityCenter).normalize();
    return gravityCenter.clone().add(direction.multiplyScalar(R));
}
```

Each vertex is radially displaced according to the gravity interval mapping. Edges between vertices become curves (following the warped metric), not straight lines.

### Visual Effect

- A polyhedron **far from the origin** appears nearly normal (shells are widely spaced, close to uniform)
- A polyhedron **near the origin** appears **radially compressed** (shells are tightly packed) and **tangentially stretched** (shell surfaces curve more steeply)
- This mimics gravitational tidal distortion — objects are squeezed radially and stretched tangentially as they approach the gravity source
- A polyhedron **at** the origin collapses toward a point — the Janus Point / singularity

### Mesh Strategy

For visual fidelity, subdivide polyhedron faces before warping. A triangle with 3 vertices maps poorly to a curved space — subdivide each face into ~16 sub-triangles, warp each vertex, and the curved surface emerges.

Use `THREE.SubdivisionModifier` or manual tessellation before applying `gravityWarp()`.

---

## Integration with Existing Codebase

### Files to Modify

| File | Changes |
|------|---------|
| `modules/rt-grids.js` | New functions: `computeGravityIntervals()`, `createGravityCartesianGrid()`, `createGravityIVMGrid()`, `createGravityArcGrid()` |
| `modules/rt-init.js` | UI toggles for G-Cartesian and G-Quadray in Coordinate Systems section |
| `modules/rt-rendering.js` | `updateGeometry()` to handle gravity grid scaling |
| `modules/rt-state-manager.js` | Persist gravity grid on/off state and parameters |
| `modules/rt-math.js` | `RT.Gravity` namespace: body presets, `g_standard`, `getGM()`, `computeGravityIntervals(N, GM)` |

### UI Design

Add to the existing **Coordinate Systems** section:

```
┌─ Coordinate Systems ─────────────────────────┐
│  ○ Cartesian Planes    ○ G-Cartesian Planes   │
│  ○ Quadray Grids       ○ G-Quadray Grids      │
│                                                │
│  Body: [▼ Normalized ]  GM: 1.000             │
│  Shells: N = [144]                             │
│  [Curved gridlines ☐]                          │
└────────────────────────────────────────────────┘
```

The Body dropdown selects a gravitational body preset (see **Gravitational Bodies & GM Selection** section below for full dropdown design and available presets). "Normalized" (GM = 1) is the default — pure geometry with no physical units.

### Existing Infrastructure to Reuse

- **`RT.PureRadicals.QUADRAY_GRID_INTERVAL`** — base interval, becomes the unit that gravity warping distorts
- **`createIVMGrid(basis1, basis2, halfSize, tessellations, color)`** — tessellation logic, fork for variable intervals
- **`rebuildQuadrayGrids()`** — pattern for destroying/rebuilding grids on parameter change
- **`Grids.createCartesianTetraArrow()`** — basis vector arrows (unchanged by gravity warp)
- **Tessellation slider** — already controls grid extent; gravity warp adds interval redistribution on top

---

## Connection to Janus Inversion

The Gravity Grid concept connects directly to Section 5 of Janus10.tex (The Inversion Manifold):

> "Any point can serve as a local inversion locus through which a form contracts, inverts, and re-expands."

A gravity grid with its center at the origin **is** the Inversion Manifold made visible: intervals compress toward the singular point (the Janus Point / gravity center), and an object falling inward traces the path of contraction toward inversion. The grid doesn't just show *where* things are — it shows the **metric structure** of the space around an inversion locus.

If we extend the grid through the origin into negative radii (the "other side" of the Janus Point), the intervals **re-expand** symmetrically — a visual demonstration of the paired-space thesis: contraction → singularity → re-expansion into the dual arena.

---

## Gravitational Bodies & GM Selection

### G, M, and GM — What's Universal vs. Body-Specific

| Constant | Value | Nature |
|----------|-------|--------|
| **G** (Newton's gravitational constant) | 6.67430 × 10⁻¹¹ m³/(kg·s²) | Universal — same everywhere in the universe |
| **M** (mass of gravitating body) | Varies per body | Body-specific — Earth, Moon, Sun, etc. |
| **GM** (gravitational parameter) | G × M | Body-specific — combines universal law with specific mass |
| **g** (surface gravity) | GM/r² at surface | Body- *and* location-specific — depends on both mass and where you stand |

**Key insight:** G is universal, but the moment you multiply by a mass M, the result is specific to that body. This is exactly like ATM (standard atmosphere) — the gas law is universal, but 101.325 kPa is Earth at sea level.

The shell spacing formula `r_k = GM/(k·ΔΦ)` uses the body-specific GM. Different bodies produce **topologically identical grids** (same number of shells, same connectivity, same harmonic compression) at **different absolute scales**. The grid *structure* is universal; the grid *size* is body-specific.

### Default: GM = 1 (Normalized / Body-Agnostic)

When GM = 1, the grid shows the **pure structure** of an inverse-square field without reference to any particular body. This is the natural default for exploring the geometry itself — the same way our Cartesian and Quadray grids use unit intervals without claiming those intervals represent meters or miles.

GM = 1 means: "one unit of gravitational parameter." The shell radii are:

```
r_k = 1/(k·ΔΦ) = N/k    (when ΔΦ = 1/N)
```

Pure harmonic series. No physical constants needed.

### Body Presets

To connect the abstract grid to physical reality, offer a selection of gravitational bodies:

| Body | GM (m³/s²) | Surface g (m/s²) | Notes |
|------|-----------|-------------------|-------|
| **Normalized** | 1.0 | — | Default. Pure geometry, no physical units. |
| **Earth** | 3.986 × 10¹⁴ | 9.807 | Standard reference. g = 196133/20000 (exactly rational, 3rd CGPM 1901). |
| **Moon** | 4.905 × 10¹² | 1.625 | ~1/6 Earth surface g. |
| **Mars** | 4.283 × 10¹³ | 3.721 | ~0.38 Earth surface g. |
| **Sun** | 1.327 × 10²⁰ | 274.0 | ~28× Earth surface g. Shells extremely compressed near center. |
| **Jupiter** | 1.267 × 10¹⁷ | 24.79 | ~2.5× Earth surface g. |
| **Black Hole (1M☉)** | 1.327 × 10²⁰ | — | Same GM as Sun but no surface — shells compress all the way to the event horizon. The Janus connection at its most literal. |
| **Custom** | User-entered | Computed | For hypothetical bodies, exoplanets, or classroom exercises. |

### UI: Body Selection

Add a **Gravity Body** selector to the Coordinate Systems panel:

```
┌─ Gravity Grid Settings ──────────────────────┐
│                                                │
│  Body: [▼ Normalized          ]               │
│         ├── Normalized (GM=1)                  │
│         ├── Earth                               │
│         ├── Moon                                │
│         ├── Mars                                │
│         ├── Jupiter                             │
│         ├── Sun                                 │
│         ├── Black Hole (1M☉)                   │
│         └── Custom...                          │
│                                                │
│  GM:     [1.000000         ]  (read-only for   │
│  Surface g: [—             ]   presets, editable│
│  Radius: [—               ]   for Custom)      │
│                                                │
│  Shells: N = [144]                             │
│  [Curved gridlines ☐]                          │
│                                                │
└────────────────────────────────────────────────┘
```

**Behavior:**
- Selecting a preset fills in GM, surface g, and body radius automatically (read-only)
- Selecting "Custom" unlocks the GM field for direct entry
- Surface g and radius are informational only — the grid math uses GM directly
- Changing the body **rescales** the grid but preserves topology (same N shells, same harmonic compression)
- The "Normalized" default is always available to return to pure geometry

### Implementation: `RT.Gravity` Namespace

Add to `rt-math.js`:

```javascript
RT.Gravity = {
    // Standard gravity (exactly rational, defined by 3rd CGPM 1901)
    g_standard: 196133 / 20000,   // 9.80665 m/s²

    // Body presets: { name, GM, surfaceG, radius }
    BODIES: {
        normalized: { name: 'Normalized',      GM: 1.0,          surfaceG: null,  radius: null },
        earth:      { name: 'Earth',           GM: 3.986004e14,  surfaceG: 9.807, radius: 6.371e6 },
        moon:       { name: 'Moon',            GM: 4.9048695e12, surfaceG: 1.625, radius: 1.7374e6 },
        mars:       { name: 'Mars',            GM: 4.2828e13,    surfaceG: 3.721, radius: 3.3895e6 },
        jupiter:    { name: 'Jupiter',         GM: 1.26687e17,   surfaceG: 24.79, radius: 6.9911e7 },
        sun:        { name: 'Sun',             GM: 1.32712e20,   surfaceG: 274.0, radius: 6.957e8 },
        blackhole:  { name: 'Black Hole (1M☉)', GM: 1.32712e20,  surfaceG: null,  radius: null },
    },

    // Active body (default: normalized)
    activeBody: 'normalized',

    // Get current GM
    getGM() { return this.BODIES[this.activeBody].GM; }
};
```

---

## Open Questions

1. ~~**Normalize g or use physical units?**~~ **Resolved:** Default to GM = 1 (normalized). Body presets available for physical units. The grid structure is body-agnostic; only absolute scale changes per body.

2. **Gravity center mobility?** Initially at origin. Later: could the gravity center be attached to a polyhedron or draggable point?

3. **Multiple gravity sources?** The interval formula assumes a single source. Two sources would require summing fields — possible but a later-phase complexity.

4. **Inverse-square vs. constant g?** Phase 0 uses constant g (uniform field, like near Earth's surface). Phase 3's curved gridlines imply a point-source (inverse-square) field. These are different regimes — document which applies where.

5. **Performance budget?** Curved gridlines (Phase 3) and subdivided warped polyhedra (Phase 4) multiply vertex count significantly. Profile and set limits.

6. **What does a Quadray basis vector look like in gravity space?** The four tetrahedral basis directions remain angular constants, but their *lengths* now vary with the gravity metric. The basis "arrows" could be drawn with variable thickness or curvature to indicate the local metric distortion.

7. **Body-relative shell labeling?** When a physical body is selected, should shells be labeled with actual radii (km) and potential values (J/kg)? Or keep everything in grid units with a conversion factor displayed?

---

## Phased Delivery

| Phase | Deliverable | Depends On | Status |
|-------|-------------|------------|--------|
| 0     | Mathematical model + Gravity Numberline demo | Nothing | **Done** (PR #93) |
| 1     | G-Quadray Grids: gravity-warped Central Angle tessellation (chordal) | Phase 0 | **In Progress** |
| 1b    | G-Cartesian Planes: non-uniform straight-line grids in XYZ | Phase 1 patterns | Pending |
| 2     | G-Quadray + G-Cartesian with body selector UI | Phase 1 | Pending |
| 3     | Curved gridlines: arcs replacing straight lines | Phase 1 or 2 | Pending |
| 4     | Distorted polyhedra: vertex remapping through gravity metric | Phase 2 | Pending |
| 5a    | IK rigid link in Gravity Numberline demo | Phase 0 | **Done** (df0faf0) |
| 5b    | Pin joints and hinges | Phase 5a | Planned |
| 5c    | Elastic, tension, compression members | Phase 5a | Planned |
| 5d    | Pneumatic soft compression | Phase 5c | Planned |

---

## Discussion Log

| Date | Topic | Key Decisions |
|------|-------|---------------|
| Feb 13, 2026 | Initial concept | Warped grids encoding g = 9.8 m/s². Start with 1D number line. Name: G-Cartesian / G-Quadray. |
| | Spherical shells | Grid = concentric spherical shells. Shells condense near origin (strong field), spread far out (weak field). Shape remains spherical — warping is in spacing, not shape. |
| | Outward arcs | Arcs between grid points on the same shell sweep outward along the shell surface (great-circle arcs), not straight chords through the interior. |
| | Polyhedra | Later phase: render shapes with gravity distortion applied to vertices. Compressed near origin, normal far out. |
| | Janus connection | Gravity grid as visible Inversion Manifold — compression toward singular point, re-expansion on the other side. |
| | GM clarification | G is universal, M is body-specific, GM is body-specific (like ATM). Default GM = 1 (normalized, body-agnostic). Body presets: Earth, Moon, Mars, Jupiter, Sun, Black Hole, Custom. |
| | Body selection UI | Dropdown in Coordinate Systems panel. Presets fill GM/g/radius (read-only). Custom unlocks GM input. Topology invariant across bodies; only absolute scale changes. |
| | RT-pure arcs | Great-circle arcs via Weierstrass rational parameterization, NOT classical SLERP. Zero trig calls; 2√ per arc at GPU boundary. Spread replaces angle; quadrance replaces distance. Consistent with RT design rule. |
| Feb 14, 2026 | Gravity Numberline demo | Phase 0 complete. Demo deployed via PR #93. Two numberlines: uniform (acceleration) vs gravity (constant v). N=144, body selector, Drop/Stop animation, draggable handle. |
| | Black Hole body | Added to presets with computed Schwarzschild values: surfaceG = 1.52e13 m/s² (c⁴/4GM), radius = 2953 m (2GM/c²). |
| | IK solver planning | New module `rt-ik-solvers.js` planned. Rigid link between demo bodies as first consumer. Future: pin joints, hinges, elastic, tension, compression, pneumatic connections. |
| Feb 14, 2026 | Phase 5a complete | `rt-ik-solvers.js` created with `linkSpread2D()`, `linkAngle2D()`, `solveRigid2D()`, `solveRigid3D()`. Display-only rigid link added to Gravity Numberline demo. Committed as `df0faf0` on `Gravity` branch. |
| | Phase 1 planning | Decided to implement G-Quadray grids (Central Angle gravity intervals) before G-Cartesian, since the Central Angle tessellation is the more architecturally interesting target. Chordal (straight lines) first, Spherical (arcs) as Phase 3. |
| | cumDist technique | Key insight: replace constant `edgeLength × i` with a cumulative distance lookup `cumDist[i]` in `createIVMGrid()`. Same loop, same topology — only spacing changes. Thread `gridMode` parameter through the full call chain. ~100 lines across 6 files. |
| | Phase reordering | Phase 1 = G-Quadray (was Phase 2). Phase 1b = G-Cartesian (was Phase 1). Rationale: Quadray tessellation is the core geometry; Cartesian warping is a simpler derivative. |
| Feb 14, 2026 | Inward bowing bug | Per-axis cumDist (tensor product of 1D warping) pulls off-axis vertices inward. Midpoints at half the correct radius. Fix: radial warping — compute uniform-space direction, warp radius as continuous function, scale outward to spherical shell. Axis ticks unchanged; off-axis points inflate to shells. Renders Phase 3 (explicit arcs) less urgent since tessellation approximates shell arcs. |

---

## Deployed: Gravity Numberline Demo (Phase 0)

**PR #93** — merged to `main` on Feb 13, 2026.

The first integration test of `RT.Gravity` is live as an interactive 2D demo accessible from **Math Demos > Gravity Numberline** in the main app.

### What It Shows

Two horizontal numberlines stacked vertically:

- **Top line (UNIFORM GRID):** 144 equally-spaced tick marks. Body accelerates under gravity — quadratic position in time: `x = ½gt²`. Slow at left, fast at right.
- **Bottom line (GRAVITY GRID):** 144 non-uniformly spaced tick marks at `√(k/N)` screen fraction. Body travels at constant velocity — linear position in time: `x = vt`. Steady rate across compressed ticks.

Both bodies start at left and reach the right side at the same total time T. They diverge mid-flight: the accelerating body lags early, catches up late. Despite the visual separation, **both bodies are always in the same grid cell index** — because `f² ≥ k/N` iff `f ≥ √(k/N)`.

### Files Created/Modified

| File | Purpose |
|------|---------|
| `demos/rt-gravity-demo.js` | ~700 lines — the demo module |
| `modules/rt-math.js` | `RT.Gravity` namespace: `g_standard`, `BODIES`, `computeGravityIntervals()`, `uniformGPosition()`, `uniformGTime()` |
| `index.html` | UI link + modal HTML |
| `modules/rt-init.js` | Import + registration |
| `art.css` | Horizontal formula panel styles |

### Features

- **N = 144 intervals** matching Quadray tessellation max extent
- **Major/minor tick hierarchy**: major every 12th tick (12 major divisions)
- **Body selector dropdown**: Earth, Moon, Mars, Jupiter, Sun, Black Hole (1M☉)
- **Black Hole**: computed Schwarzschild values — `surfaceG = 1.52e13 m/s²`, `radius = 2953 m`
- **Drop/Stop animation**: real-time physics with looping, 500ms pause between loops
- **Draggable time handle**: horizontal-constrained with snap to quarter marks and major grid crossings
- **Horizontal formula panel**: time, accelerating body stats, constant-v body stats, grid cell, separation
- **Handle drag interrupts animation**, body change stops and resets

### Key Physics

```
f = t/T (time fraction, 0 to 1)

Top body (accelerating):   screen position = f² · LINE_LENGTH
Bottom body (constant v):  screen position = f · LINE_LENGTH

Gravity tick k at screen fraction √(k/N)
Both bodies always in same cell: uniformCell === gravityCell
```

### Verified Behavior

- `RT.Gravity.g_standard` → `9.80665` (exactly rational: 196133/20000)
- `RT.Gravity.BODIES.earth.GM` → `3.986004e14`
- `RT.Gravity.computeGravityIntervals(24)` → 24 radii with harmonic compression
- Bodies diverge visually, converge at endpoints, share cell index throughout
- Black Hole animation essentially instantaneous (T ≈ 3.6 µs for 100m drop)

---

## Phase 5: Inverse Kinematics — Connecting Bodies Across Grids

### The Idea

The Gravity Numberline demo shows two bodies on different grids diverging and reconverging. The natural next question: **what happens when they are connected?**

A rigid link between the accelerating body (top) and the constant-velocity body (bottom) creates differential rotation as the bodies separate and rejoin. This is the simplest possible IK (inverse kinematics) problem: two nodes, one rigid constraint, two different motion laws.

This extends naturally into a general-purpose **connection solver** for ARTexplorer — any two nodes (vertices, body markers, polyhedra vertices) connected by constraints of varying types.

### Module: `modules/rt-ik-solvers.js`

A new module providing constraint solvers for connected nodes. Designed to be consumed by demos (gravity numberline IK link), future gravity grid visualizations (connected shells), and eventually the main 3D scene (polyhedra joint systems).

### Connection Types (Phased)

| Type | Behavior | DOF | Phase |
|------|----------|-----|-------|
| **Rigid** | Fixed length, no deformation. Differential rotation only. | 1 (rotation) | 5a |
| **Pin Joint** | Two members sharing a point. Each rotates freely. | 2 (rotation per member) | 5b |
| **Hinge** | Rotation constrained to a single axis (like a door hinge). | 1 (axis rotation) | 5b |
| **Elastic** | Length varies under tension/compression. Spring constant k. | 1 (extension) | 5c |
| **Tension-only** | Resists extension (cable/rope). Zero compression resistance. | 1 (extension, clamped ≥ 0) | 5c |
| **Compression-only** | Resists compression (strut). Zero tension resistance. | 1 (compression, clamped ≤ 0) | 5c |
| **Pneumatic** | Soft compression with nonlinear resistance (gas law). | 1 (volume) | 5d |

### Architecture

```javascript
// modules/rt-ik-solvers.js

import { RT } from "./rt-math.js";

/**
 * RT.IK — Inverse kinematics constraint solvers.
 *
 * Each solver takes two node positions and a constraint definition,
 * and returns the resolved positions (or forces/torques for dynamic solvers).
 *
 * Design principle: solvers are pure functions (position in → position out).
 * They don't own the nodes. The caller (demo, renderer) owns node positions
 * and calls the solver each frame.
 */

/** Connection constraint definition */
// { type: "rigid"|"pin"|"hinge"|"elastic"|"tension"|"compression"|"pneumatic",
//   length: number,           // rest length (rigid, elastic, tension, compression)
//   stiffness: number,        // spring constant k (elastic, pneumatic)
//   axis: Vector3,            // hinge axis (hinge only)
//   damping: number,          // velocity damping (elastic, pneumatic)
//   pressureCoeff: number,    // PV = nRT coefficient (pneumatic)
// }

/** Solve a rigid constraint between two 2D points.
 *  Given anchor A (fixed) and target B (desired position),
 *  returns the resolved position of B on the circle of radius L around A.
 */
function solveRigid2D(anchorA, targetB, length) { ... }

/** Solve a rigid constraint between two 3D points.
 *  Same as 2D but in 3D space — B is placed on the sphere of radius L around A.
 */
function solveRigid3D(anchorA, targetB, length) { ... }

/** Solve an elastic constraint — returns force vector, not position.
 *  F = -k * (currentLength - restLength) * direction
 */
function solveElastic(nodeA, nodeB, restLength, stiffness) { ... }
```

### Phase 5a: Rigid Link in Gravity Numberline

The first consumer. Connect the two body markers with a rigid bar:

- **Anchor**: midpoint between the two bodies (or one body is anchor, the other follows)
- **Length**: fixed at the initial separation (or configurable)
- **Visual**: a line (or narrow rectangle) connecting the two dots, rotating as they separate
- **Physics**: the link constrains the system — neither body follows its pure trajectory. The actual positions are a compromise between the two motion laws and the rigid constraint.
- **Educational value**: shows how a rigid connection between two reference frames (uniform vs gravity grid) produces rotation — a mechanical analog of the grid warping

#### Solver Strategy for the Demo

Two approaches:

1. **Display-only (no physics feedback)**: Both bodies follow their pure trajectories. The link is drawn between them but doesn't affect their motion. The link stretches/compresses and rotates, showing the *differential* without enforcing the constraint. Simpler to implement.

2. **Constrained (IK feedback)**: One body is the "driver" (follows its trajectory), the other is constrained to stay at distance L from the driver. The constrained body slides along its numberline to satisfy the rigid constraint. More physically meaningful.

Start with approach 1 (display-only) to visualize the differential, then optionally add approach 2.

### Future Extensions

- **Tensegrity structures**: tension members (cables) and compression members (struts) in 3D. The classic Fuller application.
- **Polyhedra edge constraints**: each edge of a polyhedron is a rigid member. Apply gravity warping to vertices and use IK to resolve the constrained shape.
- **Multi-body chains**: chains of connected nodes with different constraint types. FABRIK or CCD solvers for longer chains.
- **Pneumatic soft bodies**: nodes connected by pneumatic constraints, creating deformable volumes that resist compression according to gas law (PV = nRT analog).

---

## Phase 5a Implementation: Rigid Link in Gravity Numberline

### Overview

Add a **display-only rigid link** between bodyA (top, accelerating) and bodyB (bottom, constant velocity). The link is a straight line connecting the two body positions — it rotates and changes angle as the bodies diverge, then returns to vertical as they reconverge at f=1.

**No physics feedback** — both bodies continue to follow their pure trajectories. The link visualizes the *differential* without enforcing the constraint. This is approach 1 from Phase 5 above.

### Files to Modify/Create

| File | Action | Change |
|------|--------|--------|
| `modules/rt-ik-solvers.js` | **CREATE** (~80 lines) | New module: `solveRigid2D()`, `linkAngle2D()`, `linkSpread2D()` |
| `demos/rt-gravity-demo.js` | **MODIFY** (~30 lines added) | Import solver, create link Line2, update in `updateVisualization()`, add link stats to formula panel |

### rt-ik-solvers.js — API

```javascript
import { RT } from "./rt-math.js";

/**
 * Compute the angle (in radians) of the line from A to B.
 * Returns atan2(dy, dx). For display/formula purposes.
 */
export function linkAngle2D(ax, ay, bx, by) { ... }

/**
 * Compute the spread (sin²θ) of the link relative to vertical.
 * RT-pure: no trig — uses the quadrance cross-ratio.
 *
 *   vertical = (0, 1)
 *   link     = (bx - ax, by - ay)
 *   spread   = 1 - (dot²) / (Q_link · Q_vert)
 *            = (dx²) / (dx² + dy²)
 *
 * Returns { spread, quadrance, dx, dy }
 */
export function linkSpread2D(ax, ay, bx, by) { ... }

/**
 * Solve rigid constraint: given anchor A (fixed), target B (desired),
 * return the position of B constrained to distance L from A.
 * B is projected onto the circle of radius L centered at A,
 * preserving the direction from A to B.
 *
 * For the display-only demo this isn't used yet, but it's the
 * foundation for Phase 5b (constrained mode).
 */
export function solveRigid2D(ax, ay, bx, by, length) { ... }
```

### Gravity Demo Integration

**New visual element:** `linkLine` — a `Line2` from `(topScreenX, TOP_Y)` to `(botScreenX, BOT_Y)`, colored white with partial opacity.

**In `updateVisualization()`:**
1. Compute link endpoints from body positions
2. Call `linkSpread2D()` to get spread and quadrance
3. Update `linkLine` geometry
4. Add link stats to formula panel: spread value, angle (from spread via arcsin), screen length

**Link behavior over time:**
- `f=0`: both bodies at LINE_LEFT → link is vertical (spread = 0)
- `f=0.5`: top body at 25% (f²=0.25), bottom at 50% → link angles backward (spread > 0)
- `f≈0.71`: maximum separation → maximum spread
- `f=1`: both at LINE_RIGHT → link is vertical again (spread = 0)

**Formula panel addition** (new section after Separation):
```
Link | s = 0.XXX (spread) | Q = X.XX | θ ≈ XX.X°
```

### Visual Design

- **Color**: white, 50% opacity — neutral between orange (top) and teal (bottom)
- **Width**: 1.5px (same as handle line)
- **Z-order**: behind bodies (z = 0.003), in front of trails

---

## Bug: Inward Bowing of Central Angle Gridlines (Phase 1)

**Status:** Open — identified Feb 14, 2026
**Symptom:** Gravity-mode gridlines on central angle planes bow **inward** toward the origin, producing a concave star-like shape. The correct behavior is either straight chords (Phase 1) or outward arcs along concentric spherical shells (Phase 3).

### Root Cause: Per-Axis Tensor Product vs. Radial Warping

The current `createIVMGrid()` computes each vertex as:

```
P(i,j) = basis1 × cumDist[i] + basis2 × cumDist[j]
```

Where `cumDist[k] = totalExtent × (k/N)²` (quadratic gravity spacing).

This applies the nonlinear warping **independently to each axis component** — a tensor product of two 1D gravity functions. For points on the axes (where one index is zero), this is correct: axis tick k sits at cumDist[k] from the origin. But for off-axis points (both i > 0 and j > 0), the independent application **double-compresses** the position toward the origin.

### Concrete Example

Consider the diagonal "ring" line connecting axis1-tick-k to axis2-tick-k (i+j = k). With E = totalExtent:

| Point | Grid formula | Distance from origin |
|-------|-------------|---------------------|
| Axis1 endpoint (i=k, j=0) | `basis1 × E·k²/N²` | `E·k²/N²` (correct) |
| Axis2 endpoint (i=0, j=k) | `basis2 × E·k²/N²` | `E·k²/N²` (correct) |
| **Midpoint (i=k/2, j=k/2)** | `(b1+b2) × E·k²/(4N²)` | **`E·k²/(4N²) × |b1+b2|`** |
| **Correct chord midpoint** | `(b1+b2) × E·k²/(2N²)` | **`E·k²/(2N²) × |b1+b2|`** |

The grid midpoint is at **half** the radial distance of the correct chord midpoint. The quadratic function satisfies `f(a) + f(b) ≤ f(a+b)` — it's subadditive — so splitting the index between two axes always yields a smaller total displacement than keeping it on one axis.

This is why the gridlines bow inward: intermediate points are pulled toward the origin by the independent quadratic compression on each component.

### Why the 1D Numberline Doesn't Show This

The gravity numberline demo is purely axial — all motion is along a single axis. The quadratic cumDist correctly spaces ticks along that one dimension. The bug only manifests when the same 1D gravity function is applied as a separable product across two axes in 2D.

### Proposed Fix: Radial Gravity Warping

Replace per-axis cumDist lookup with **radial** warping that preserves angular direction from the uniform grid:

```javascript
// CURRENT (buggy): per-axis tensor product
P(i,j) = basis1 × cumDist[i] + basis2 × cumDist[j]

// FIXED: radial warping
P_uniform = basis1 × (i × edgeLength) + basis2 × (j × edgeLength)
r_uniform = |P_uniform|
r_gravity = gravityWarp(r_uniform)
P_gravity = P_uniform × (r_gravity / r_uniform)
```

Where `gravityWarp(r)` maps a uniform-space radius to a gravity-warped radius:

```javascript
// For quadratic (uniform-g) model:
gravityWarp(r) = totalExtent × (r / uniformExtent)²

// Or equivalently, using the continuous form:
gravityWarp(r) = totalExtent × (r / (N × edgeLength))²
```

#### What This Produces

- **Every vertex lies on a spherical shell** at the gravity-warped radius
- **Axis ticks are unchanged** — on the axes, the uniform radius equals k × edgeLength, so gravityWarp gives exactly cumDist[k]
- **Off-axis points maintain their angular direction** from the uniform tessellation but are pushed out to the correct shell radius
- **Diagonal "ring" lines trace outward arcs** along the spherical shells — the gridlines inflate outward, creating the concentric shell geometry described in the Phase 0 derivation

This naturally produces the **spherical shell** behavior. The "chordal" (straight-line) variant would then be a separate mode that connects axis ticks with straight chords, skipping the intermediate tessellation points entirely on the ring lines.

#### Implementation Sketch

In `createIVMGrid()`, replace the vertex computation block:

```javascript
if (gridMode === "gravity-chordal") {
  // Radial warping: compute uniform position, warp radius
  const uniformExtent = tessellations * edgeLength;
  const uniformExtent2 = uniformExtent * uniformExtent;

  for (let i = 0; i <= tessellations; i++) {
    for (let j = 0; j <= tessellations - i; j++) {
      const ui  = i * edgeLength, ui1 = (i+1) * edgeLength;
      const uj  = j * edgeLength, uj1 = (j+1) * edgeLength;

      // Uniform-space vertex, then radially warp
      // P_uniform = basis1 × ui + basis2 × uj
      // r² = |P_uniform|² = ui² + uj² + 2·ui·uj·dot(b1,b2)
      // P_gravity = P_uniform × (totalExtent × r² / uniformExtent²) / r
      //           = P_uniform × totalExtent × r / uniformExtent²
      // (using gravityWarp(r) = totalExtent × r²/uniformExtent²)

      function warpVertex(ci, cj) {
        const px = b1x*ci + b2x*cj;
        const py = b1y*ci + b2y*cj;
        const pz = b1z*ci + b2z*cj;
        const r2 = px*px + py*py + pz*pz;
        if (r2 < 1e-12) return [0, 0, 0]; // origin stays at origin
        const r = Math.sqrt(r2);
        const scale = totalExtent * r / uniformExtent2;  // = r_gravity / r
        return [px*scale, py*scale, pz*scale];
      }

      const p0 = warpVertex(ui, uj);
      const p1 = warpVertex(ui1, uj);
      const p2 = warpVertex(ui, uj1);
      // ... emit triangle edges as before
    }
  }
}
```

#### Revisiting Phase 1 / Phase 3 Distinction

With radial warping, the "gravity-chordal" mode already produces outward-curving arcs (points lie on spherical shells, but edges are straight line segments between adjacent vertices). At high tessellation counts, these approximate the spherical shell surface closely. This may make the separate "Spherical" (Phase 3 rational arc) mode less urgent — the tessellation density already approximates arcs. The Phase 3 rational arcs would then be an optimization for visual quality at low tessellation counts, not a geometric correction.

---

## Next Steps

- [x] ~~Validate Phase 0 math: compute and plot 1D gravity intervals for N=144~~
- [x] ~~Prototype `computeGravityIntervals()` in `rt-math.js`~~
- [x] ~~Test visual effect: drop a marker and verify constant-rate gridline crossings~~
- [x] ~~Write Phase 5a workplan into Gravity-Grids.md~~
- [x] ~~Create `modules/rt-ik-solvers.js` with `solveRigid2D()` (Phase 5a)~~
- [x] ~~Add rigid link visual to Gravity Numberline demo (Phase 5a)~~
- [ ] **Phase 1: G-Quadray gravity grids (IN PROGRESS)**
  - [x] ~~Add `computeGravityCumulativeDistances()` to `RT.Gravity` namespace~~
  - [x] ~~Add `gridMode` param to `createIVMGrid()` with cumDist branching~~
  - [x] ~~Thread `gridMode` through `createIVMPlanes()`, `rebuildQuadrayGrids()`, rt-rendering.js wrapper~~
  - [x] ~~Add Grid Mode UI buttons (Uniform / Gravity / Spherical-disabled)~~
  - [x] ~~Wire buttons in rt-init.js and update tessellation slider binding~~
  - [ ] **BUG FIX: Replace per-axis cumDist with radial gravity warping** (see bug section above)
  - [ ] Browser verify: uniform regression, gravity visual (outward shell arcs), slider + checkboxes preserved
- [ ] Phase 1b: G-Cartesian Planes (non-uniform XYZ grids)
- [ ] Phase 3: Curved gridlines (Weierstrass rational arcs replacing straight chords)
- [ ] Extend IK solvers with elastic, tension, compression types (Phase 5c)
