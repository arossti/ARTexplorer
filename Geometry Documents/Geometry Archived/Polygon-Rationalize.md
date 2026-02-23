# Polygon Rationalization Workplan

---

## QUICKSTART: Prime Polygon Search (Agent Handoff)

> **Mission**: Find rational-spread viewing angles where 3D polyhedra project to prime n-gon silhouettes (5, 7, 11, 13, 17, 19...). This bypasses Gauss-Wantzel impossibility via dimensional projection.
>
> **Ultimate Goal**: Find projections that are **equiangular** (all interior angles equal). If a projection is equiangular, we can normalize for unit R (radius) and have a true alternative for prime polygons that bypasses Gauss-Wantzel. Equilateral projections are also equiangular for convex polygons.

### Search Priority

| Priority | Target | Description | Why It Matters |
|----------|--------|-------------|----------------|
| **A** | **Equi-angular** | All interior angles equal ((n-2)×180°/n) | True regular n-gon from projection — bypasses Gauss-Wantzel! |
| **B** | **Equilateral** | All edges same length (implies equiangular for convex) | Equivalent to A for convex projections |
| **C** | **Prime hull count** | Convex hull has prime vertices | Basic discovery — refine for A or B |

### Current Pipeline (Single Source of Truth)

The search-to-render pipeline is now unified:

```
Python Search                    JavaScript Rendering
─────────────────────────────    ─────────────────────────────
rt_math.py        ←(ported from)→  modules/rt-math.js
rt_polyhedra.py   ←(ported from)→  modules/rt-polyhedra.js
prime_search_streamlined.py        modules/rt-prime-cuts.js
         ↓                                  ↑
    JSON results  ──(spreads)──→  PROJECTION_PRESETS registry
                                           ↓
                                  rt-projections.js (render)
```

**Key files:**

| File | Role |
|------|------|
| `scripts/prime_search_streamlined.py` | Python search — finds spread parameters |
| `scripts/rt_math.py` | RT functions (ported from rt-math.js) |
| `scripts/rt_polyhedra.py` | Polyhedra vertices (ported from rt-polyhedra.js) |
| `modules/rt-prime-cuts.js` | `PROJECTION_PRESETS` registry + floating demo modal |
| `modules/rt-projections.js` | Generalized projection visualization |
| `modules/rt-polyhedra.js` | Base polyhedra (single source for compounds) |
| `modules/rt-rendering.js` | Camera presets, polyhedra rendering |

**Deleted (Feb 2026):** Quadray compound functions in `rt-quadray-polyhedra.js` — base `Polyhedra.compoundTruncTetIcosa()` and `Polyhedra.compoundTruncTetDualTet()` are now the single source. The original `compoundTruncTetTet()` (same-parity tet) was superseded by `compoundTruncTetDualTet()` (dual/even-parity tet with unit-sphere normalization) for robust 7-gon hull counts.

### Current Status

| n-gon | Hull Status | Equiangularity | Spreads (s₁, s₂, s₃) | Polyhedron | Notes |
|-------|-------------|----------------|----------------------|------------|-------|
| **5** | ✅ Correct hull | reg=0.4231 | (0, 0.5, 0) | TruncTet (12v) | Irregular — needs equiangular search |
| **7** | ✅ Correct hull | reg=0.28 | (0, 0, 0.5) | TruncTet+DualTet (16v, normalized) | Dual tet compound, unit-sphere normalized |
| **11** | ✅ Correct hull | reg=0.5050 | (0.34, 0.54, 0.2) | TruncTet+Icosa (24v) | Column-projection search 2026-02-08 |
| **13** | ✅ Correct hull | reg=0.3516 | (0.96, 0.99, 0.99) | TruncTet+Icosa (24v) | Column-projection search 2026-02-08 |

All four presets now produce correct hull counts (verified 2026-02-08 via `prime_search_streamlined.py` at precision 2). The 7-gon uses a dual (even-parity) tetrahedron compound with unit-sphere normalization for Float32-robust hull counts. Regularity scores are low — all shapes are far from equiangular/equilateral. Next step: precision 3+ search for improved regularity.

### Planned Improvements

1. ~~**Enhance `prime_search_streamlined.py`**~~ — ✅ Done. Added `compute_hull_geometry()` with regularity scoring
2. ~~**Re-run search for 7, 11, 13-gon**~~ — ✅ Done. All presets updated with verified spreads (2026-02-08)
3. **Search for more equiangular solutions** — Fine-grid (precision 3+) around best-scoring spreads
4. **Algebraic analysis** — Derive exact spread values from the regularity-optimized results

### How to Add New Primes

1. Run `python scripts/prime_search_streamlined.py --primes N --precision 2 -v`
2. Take best-scoring spreads from JSON output (ranked by regularity)
3. Add to `PROJECTION_PRESETS` in `modules/rt-prime-cuts.js`
4. Modal buttons auto-generate from the registry

### Visualization in ARTexplorer

1. Open **"Prime Projections"** from **Math Demos** menu (floating modal)
2. Click preset button (5-gon, 7-gon, 11-gon, 13-gon)
3. Observe:
   - **YELLOW** = Actual projection hull (from 3D polyhedron vertices)
   - **CYAN** = Ideal regular n-gon (for comparison)
   - **GREEN** = Projection rays from polyhedron to plane
   - Sidebar checkboxes still independently toggle base polyhedra

### Symmetry Barrier (Critical!)

**Regular polytopes with central symmetry CANNOT produce odd-vertex hulls!**

- ❌ Dodecahedron, Icosahedron, Cube, Octahedron → Always even hulls
- ✅ **Truncated Tetrahedron** → Asymmetric, produces odd hulls (5, 7, 9)
- ✅ Snub Cube (chiral) → Asymmetric, may produce primes
- ✅ Compound of 5 Tetrahedra → Asymmetric, may produce primes

---

## Objective

Replace classical trigonometric methods (`sin(π/n)`, `cos(π/n)`) with RT-pure spread/cross calculations for as many n-gons as possible, leveraging:
1. **Composite construction**: Build n-gons from rotations of smaller constructible polygons
2. **Cached algebraic constants**: Use `RT.PurePhi`, `RT.PureRadicals`, `RT.StarSpreads`
3. **Spread-based rotation**: Use `RT.QuadrayRotation.fghCoeffsFromSpread()` for exact rotations

---

## Mathematical Foundation

### Gauss-Wantzel Constructibility

A regular n-gon is constructible with compass and straightedge iff n is:
- A power of 2: 2, 4, 8, 16, 32...
- A Fermat prime: 3, 5, 17, 257, 65537
- A product of distinct Fermat primes × powers of 2

**Constructible n ≤ 24**: 3, 4, 5, 6, 8, 10, 12, 15, 16, 17, 20, 24

### Available Exact Star Spreads (from `RT.StarSpreads`)

| n | Star Spread s | Formula | Type |
|---|---------------|---------|------|
| 3 | 3/4 | Rational | RT-Pure |
| 4 | 1/2 | Rational | RT-Pure |
| 5 | (5-√5)/8 | α = sin²(π/5) | φ-Rational |
| 6 | 1/4 | Rational | RT-Pure |
| 8 | (2-√2)/4 | | Algebraic |
| 10 | (3-√5)/8 | α | φ-Rational |
| 12 | (2-√3)/4 | | Algebraic |

### Rotation Spreads for Composite Construction

To build an n-gon from an m-gon (where n = k×m), rotate by θ = 360°/n:

| Rotation | Spread s = sin²(θ) | Cross c = cos²(θ) | Polarity |
|----------|-------------------|-------------------|----------|
| 30° | 1/4 | 3/4 | +1 |
| 36° | (5-√5)/8 = α | (3+√5)/8 | +1 |
| 45° | 1/2 | 1/2 | +1 |
| 60° | 3/4 | 1/4 | +1 |
| 72° | (5+√5)/8 = β | (3-√5)/8 | +1 |
| 90° | 1 | 0 | +1 |
| 120° | 3/4 | 1/4 | -1 |

### Cubic-Algebraic Rotations (Your Insight!)

Some n-gons can be built from RT-pure bases with rotations that require **cubic solutions**:

| n-gon | Base | Rotation | Why Cubic? |
|-------|------|----------|------------|
| **9 (Nonagon)** | 3×Triangle | 40° | 40° = 60° - 20°, and 20° = 60°/3 requires angle trisection |
| **18** | 6×Triangle | 20° | Same cubic as nonagon |
| **27** | 9×Triangle | 40°/3 | Nested trisection |

**The 40° Cubic:**
```
cos(20°) is a root of: 8x³ - 6x - 1 = 0
```

**Key Insight**: While 40° isn't compass-constructible, we CAN:
1. Solve the cubic algebraically (Cardano's formula) or numerically ONCE
2. Cache `sin²(40°)` and `cos²(40°)` as constants (like we cache φ)
3. Use composite construction: 3 triangles rotated by 0°, 40°, 80°

This makes nonagon "Cubic-Algebraic" rather than "Classical" - we compute the cubic root once instead of calling `sin(π/9)` repeatedly.

```javascript
// Proposed: RT.PureCubics namespace
RT.PureCubics = {
  // Cached from cubic 8x³ - 6x - 1 = 0
  cos20: (() => {
    // Cardano's formula or numerical solution
    const cached = 0.9396926207859084; // cos(20°)
    return () => cached;
  })(),

  sin20: (() => {
    const cached = 0.3420201433256687; // sin(20°)
    return () => cached;
  })(),

  // Derived spreads for nonagon construction
  spread40: (() => {
    const sin40 = 2 * 0.9396926207859084 * 0.3420201433256687; // 2·cos20·sin20
    return () => sin40 * sin40; // ≈ 0.4131759111665348
  })(),
};
```

---

## Phase 1: RT-Pure Polygons (Rational Spreads)

### 1.1 Direct Construction (Already Supported)

These use exact rational spreads from `RT.StarSpreads`:

- **3-gon (Triangle)**: s = 3/4
- **4-gon (Square)**: s = 1/2
- **6-gon (Hexagon)**: s = 1/4

### 1.2 Composite Construction via Rotation

**6-gon from 3-gon**: Rotate triangle by 60° (spread = 3/4)
```javascript
// Use existing triangle vertices, rotate each by 60°
const rotationSpread = 3/4;  // sin²(60°) = 3/4 (exact!)
const rotationCross = 1/4;   // cos²(60°) = 1/4 (exact!)
// Apply RT.QuadrayRotation.fghCoeffsFromSpread(3/4, +1)
```

**12-gon from 6-gon**: Rotate hexagon by 30° (spread = 1/4)
```javascript
const rotationSpread = 1/4;  // sin²(30°) = 1/4 (exact!)
// Combine original 6 vertices + 6 rotated vertices = 12-gon
```

**24-gon from 12-gon**: Rotate dodecagon by 15°
- spread(15°) = sin²(15°) = (2-√3)/4 (algebraic, uses √3)
- Uses `RT.PureRadicals.sqrt3()`

### 1.3 Multiples Analysis

| Target | Base | Rotation | Spread | Method |
|--------|------|----------|--------|--------|
| 6 | 3 | 60° | 3/4 | RT-Pure |
| 12 | 6 | 30° | 1/4 | RT-Pure |
| 12 | 3 | 30° | 1/4 | RT-Pure (2 rotations) |
| 24 | 12 | 15° | (2-√3)/4 | Algebraic |
| 24 | 6 | 15° | (2-√3)/4 | Algebraic (2 rotations) |

**Note**: 9-gon (3×3) requires 40° rotation, which is NOT algebraically simple.
The nonagon is not constructible (requires angle trisection).

---

## Phase 2: φ-Rational Polygons (Golden Ratio)

These use `RT.PurePhi.pentagon` cached constants.

### 2.1 Direct Construction

- **5-gon (Pentagon)**: s = β = (5+√5)/8
- **10-gon (Decagon)**: s = α = (3-√5)/8

### 2.2 Composite Construction

**10-gon from 5-gon**: Rotate pentagon by 36° (spread = α)
```javascript
// 36° is the fundamental Penrose angle!
const rotationSpread = RT.PurePhi.pentagon.alpha(); // (5-√5)/8
// Use cached sin36/cos36 from RT.PurePhi.pentagon
```

**20-gon from 10-gon**: Rotate decagon by 18°
- spread(18°) = sin²(18°) = (3-√5)/16 (φ-algebraic)
- Derivation: sin(18°) = (√5-1)/4 = 1/(2φ) → sin²(18°) = 1/(4φ²) = (3-√5)/8 × 1/2

**15-gon from 5-gon + 3-gon**: Use GCD construction
- 15 = lcm(3,5) is constructible since gcd(3,5) = 1
- Vertices at 0°, 24°, 48°, 72°, 96°, 120°, 144°, 168°, 192°, 216°, 240°, 264°, 288°, 312°, 336°
- Can derive from combined 3-gon and 5-gon vertex sets

### 2.3 Multiples Analysis

| Target | Base | Rotation | Spread | Method |
|--------|------|----------|--------|--------|
| 10 | 5 | 36° | α = (5-√5)/8 | φ-Rational |
| 20 | 10 | 18° | (3-√5)/16 | φ-Rational |
| 15 | 3+5 | GCD | Combined | φ-Rational |
| 30 | 15 | 12° | Complex | φ-Algebraic |

---

## Phase 3: Algebraic Polygons (√2, √3)

These use `RT.PureRadicals` cached constants.

### 3.1 Direct Construction

- **8-gon (Octagon)**: s = (2-√2)/4
- **12-gon (Dodecagon)**: s = (2-√3)/4

### 3.2 Composite Construction

**8-gon from 4-gon**: Rotate square by 45° (spread = 1/2)
```javascript
const rotationSpread = 1/2;  // sin²(45°) = 1/2 (exact!)
// Combine 4 original + 4 rotated = 8-gon
```

**16-gon from 8-gon**: Rotate octagon by 22.5°
- spread(22.5°) = sin²(22.5°) = (2-√2)/4 × something complex
- Requires nested radicals: √(2-√2)

### 3.3 Multiples Analysis

| Target | Base | Rotation | Spread | Method |
|--------|------|----------|--------|--------|
| 8 | 4 | 45° | 1/2 | RT-Pure! |
| 16 | 8 | 22.5° | (2-√(2+√2))/4 | Nested Algebraic |

---

## Phase 4: Cubic-Algebraic Polygons (Composite from RT-Pure Bases)

These use RT-pure base polygons with cached cubic solutions for rotation:

| n | Name | Construction | Cubic Required |
|---|------|--------------|----------------|
| **9** | Nonagon | 3 × Triangle @ 40° | 8x³ - 6x - 1 = 0 (cos 20°) |
| **18** | Octadecagon | 6 × Triangle @ 20° | Same cubic |
| **7** | Heptagon | Direct | 8x³ - 4x² - 4x + 1 = 0 (cos 360°/7) |
| **14** | Tetradecagon | 2 × Heptagon @ ~25.7° | Same cubic as 7 |
| **21** | Icosikaihenagon | 3 × Heptagon @ ~17.1° | Same cubic as 7 |

**Implementation**: Solve each cubic ONCE, cache results in `RT.PureCubics`.

---

## Phase 5: Higher-Degree Algebraic (Impractical)

These require degree-5+ polynomial solutions:

| n | Name | Polynomial Degree | Recommendation |
|---|------|-------------------|----------------|
| 11 | Hendecagon | 5 | Use classical sin(π/11) |
| 13 | Tridecagon | 6 | Use classical sin(π/13) |
| 17 | Heptadecagon | 16 | Gauss constructible but complex |
| 19 | Enneadecagon | 9 | Use classical sin(π/19) |
| 22 | Icosikadigon | 5 (from 11) | Use classical |
| 23 | Icosikaitrigon | 11 | Use classical |

**Note**: 17-gon IS compass-constructible (Gauss 1796) but requires a degree-16 polynomial. The algebraic form is impractical for code.

---

## Implementation Plan

### Priority 1: Update Method Info Display ✓
Already done - shows RT-Pure/φ-Rational/Classical for each n-gon.

### Priority 2: Composite Constructor Functions

Add to `rt-polyhedra.js` or new `rt-polygon-rational.js`:

```javascript
/**
 * Build n-gon from m-gon via rotation (where n = k×m)
 * @param {number} m - Base polygon sides
 * @param {number} k - Multiplier (n = k×m)
 * @param {number} rotationSpread - Spread for rotation angle
 * @param {number} polarity - +1 or -1 for rotation direction
 */
function buildCompositePolygon(m, k, rotationSpread, polarity) {
  // Get base m-gon vertices
  const baseVertices = generateRationalPolygon(m);

  // Generate k rotated copies
  const allVertices = [...baseVertices];
  for (let i = 1; i < k; i++) {
    const { F, G, H } = RT.QuadrayRotation.fghCoeffsFromSpread(
      rotationSpread * i, // Cumulative rotation
      polarity
    );
    // Apply rotation to each base vertex
    // ...
  }

  return allVertices;
}
```

### Priority 3: Lookup Table for Rational Constructions

```javascript
const RATIONAL_POLYGON_METHODS = {
  3:  { type: 'direct', spread: 3/4 },
  4:  { type: 'direct', spread: 1/2 },
  5:  { type: 'direct', spread: () => RT.StarSpreads.pentagon() },
  6:  { type: 'composite', base: 3, rotation: 3/4 },
  8:  { type: 'composite', base: 4, rotation: 1/2 },
  10: { type: 'composite', base: 5, rotation: () => RT.PurePhi.pentagon.alpha() },
  12: { type: 'composite', base: 6, rotation: 1/4 },
  15: { type: 'gcd', bases: [3, 5] },
  16: { type: 'composite', base: 8, rotation: 'nested-sqrt2' },
  20: { type: 'composite', base: 10, rotation: 'half-alpha' },
  24: { type: 'composite', base: 12, rotation: () => RT.StarSpreads.dodecagon() },
};
```

---

## Summary: Coverage by Method

| Method | n-gons Covered | Spreads Use | Notes |
|--------|----------------|-------------|-------|
| **RT-Pure** | 3, 4, 6 | Rationals only | Direct construction |
| **RT-Pure (Composite)** | 8, 12 | Rationals | 4×45°, 6×30° rotations |
| **φ-Rational** | 5, 10, 15, 20 | √5 | Pentagon α/β constants |
| **Algebraic** | 16, 24 | √2, √3 | Nested square roots |
| **Cubic** | 7, 9, 14, 18, 21 | ∛ (cube roots) | Solve cubic once, cache |
| **Classical** | 11, 13, 17, 19, 22, 23 | sin(π/n) | Degree 5+ polynomials |

### Naming Convention for UI Display

| Type | Display Text | Color | Example |
|------|--------------|-------|---------|
| RT-Pure | `RT-Pure (s = 3/4)` | Cyan | Triangle, Square, Hexagon |
| φ-Rational | `φ-Rational (Gauss-Wantzel)` | Cyan | Pentagon, Decagon |
| Algebraic | `Algebraic (s = 1/2^n)` | Cyan | Octagon, 16-gon |
| **Cubic** | `Cubic (3×Triangle)` | Cyan | **Nonagon**, Heptagon |
| Classical | `Classical (sin π/n)` | Cyan | 11-gon, 13-gon |

**Total Rationalized**: 17 out of 24 (for n ≤ 24)
**Classical Required**: 6 out of 24 (only 11, 13, 17, 19, 22, 23)


**Display Shows**
Updated both Polygon and Prism method info displays. Here's the complete classification now shown in the UI:

RT-Pure (rational spreads):

3: RT-Pure (s = 3/4)
4: RT-Pure (s = 1)
6: RT-Pure (2×3 @ 60°)
12: RT-Pure (2×6 @ 30°)
φ-Rational (golden ratio):

5: φ-Rational (s = β)
10: φ-Rational (2×5 @ 36°)
15: φ-Rational (3×5 GCD)
20: φ-Rational (2×10 @ 18°)
Algebraic (√2, √3):

8: Algebraic (2×4 @ 45°)
16: Algebraic (2×8 @ 22.5°)
24: Algebraic (2×12 @ 15°)
Cubic (cached cube roots):

7: Cubic (cos 360°/7)
9: Cubic (3×3 @ 40°)
14: Cubic (2×7 @ 25.7°)
18: Cubic (6×3 @ 20°)
21: Cubic (3×7 @ 17.1°)
Multiples of 9: Cubic (n/3×3)
Multiples of 7: Cubic (n/7×7)
Classical (sin π/n):

11, 13, 17, 19, 22, 23, etc.
The display now reveals the mathematical construction method to mathematicians!

---

## Future Research

### Quartic-Algebraic Polygons

The 17-gon (heptadecagon) is Gauss-constructible but requires solving a degree-16 polynomial. Could we cache these values like we do for cubics?

| n | Name | Polynomial Degree | Feasibility |
|---|------|-------------------|-------------|
| 17 | Heptadecagon | 16 | Possible but complex nested radicals |
| 257 | 257-gon | 256 | Theoretical only |
| 65537 | 65537-gon | 65536 | Theoretical only |

### Composite Cubic Generators (14, 18, 21)

Currently falling back to classical trig. Could implement as:
- **14-gon**: 2×Heptagon @ 360°/14 = 25.714...° (uses same cubic as 7)
- **18-gon**: 2×Nonagon @ 20° OR 6×Triangle @ 20° (uses same cubic as 9)
- **21-gon**: 3×Heptagon @ 360°/21 = 17.143...° (uses same cubic as 7)

```javascript
// Proposed additions to RT.PureCubics
RT.PureCubics.octadecagon = {
  // 18-gon: uses nonagon's cos20/sin20 directly
  // 20° rotation spread = sin²(20°) = nonagon.starSpread()
};

RT.PureCubics.tetradecagon = {
  // 14-gon: cos(π/7) and sin(π/7) for 25.714° rotation
  // Half-angle of heptagon values
};
```

### Quadray-Native Polygon Rotation

Current implementation uses Cartesian coordinates then converts. Could use `RT.QuadrayRotation.fghCoeffsFromSpread()` for pure quadray polygon construction:

```javascript
// Native quadray polygon rotation (conceptual)
function rotatePolygonQuadray(vertices, spread, polarity, axis = 'W') {
  const { F, G, H } = RT.QuadrayRotation.fghCoeffsFromSpread(spread, polarity);
  return vertices.map(v => RT.QuadrayRotation[`rotateAbout${axis}`](v, F, G, H));
}
```

### Symbolic Spread Algebra

Extend `RT.PurePhi.Symbolic` pattern to general spread operations:
- Spread addition: s₁ + s₂ - 2s₁s₂ + 2√(s₁s₂(1-s₁)(1-s₂))
- Spread multiplication (composition)
- Spread polynomial evaluation in symbolic form

### RT-Pure 3D Prism/Antiprism

Current prisms use polygon generators for bases. Could extend to:
- **Antiprisms**: Twisted prisms with triangular side faces
- **Cupolas**: Half-regular polyhedra
- **Rotundas**: Domed polyhedra

### Connection to Penrose Tilings

The 36°/72° angles in Penrose tilings are φ-rational. Could the cubic-algebraic approach extend to:
- **Nonagon-based tilings**: 40° angles
- **Heptagon-based tilings**: 360°/7 angles
- **Mixed cubic-φ tilings**: Combining heptagon and pentagon symmetries

---

## 4D± Prime Projection Conjecture

### The Quasicrystal Precedent

Penrose tilings exhibit 5-fold rotational symmetry — "impossible" in periodic 2D lattices. Yet this "forbidden" symmetry emerges naturally as a **2D projection of a 5D hypercubic lattice**. The symmetry exists in higher dimensions and projects down to what appears impossible in 2D alone.

### The Conjecture

**Prime n-gons (7, 11, 13, 19...) are non-constructible in 2D with compass and straightedge (Gauss-Wantzel). But they might exist as rational-spread projections of 4D± polytope structures in the Quadray system.**

Key insight:
- In 2D, we're constrained to Gauss-Wantzel constructibility
- In 4D±, we have an extra dimension of freedom (plus Janus polarity)
- **Projecting along a rational-spread axis** might "reveal" prime vertex arrangements invisible from standard axial views

### Mathematical Foundation

The ARTexplorer 4D± system provides:
- **Spread 8/9** between quadray basis vectors (rational!)
- **Full 4D coordinates** (no zero-sum constraint)
- **Janus polarity** (discrete ± dimensional state)
- **Gimbal-lock-free rotations** via Spread-Quadray Rotors

If we construct a polyhedron rationally in 4D and project to 2D at a carefully chosen **rational spread rotation**, the visible vertex silhouette might form a prime n-gon — even though that n-gon is "non-constructible" in purely 2D terms.

### The Search

Finding rational spread angles where 4D polytope projections yield prime vertex counts. The "trick" may be that primes have a hidden relationship to tetrahedral symmetry when viewed from the right angle — literally **"prime relationships from a rational angle."**

---

## Prime Projection Search Script

### Objective

Systematically search for rational-spread viewing angles where 3D/4D polyhedra project to 2D with **prime vertex counts** on the convex hull silhouette.

### Search Parameters

```javascript
/**
 * Prime Projection Search Configuration
 */
const SEARCH_CONFIG = {
  // Rational spread precision (4 decimal places = 10,001 values)
  spreadMin: 0.0000,
  spreadMax: 1.0000,
  spreadStep: 0.0001,

  // Polyhedra to test (RT-pure and cubic-algebraic)
  polyhedra: [
    'tetrahedron',    // 4 vertices
    'cube',           // 8 vertices
    'octahedron',     // 6 vertices
    'icosahedron',    // 12 vertices
    'dodecahedron',   // 20 vertices
    'cuboctahedron',  // 12 vertices (Vector Equilibrium)
    // Future: 4D polytopes
    // '5-cell',      // 5 vertices
    // '8-cell',      // 16 vertices (tesseract)
    // '24-cell',     // 24 vertices (unique to 4D!)
  ],

  // Projection planes
  cartesianPlanes: ['XY', 'XZ', 'YZ'],
  quadrayPlanes: ['QW', 'QX', 'QY', 'QZ'],  // Perpendicular to each basis

  // Prime targets (non-constructible)
  targetPrimes: [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47],

  // Vertex tolerance for counting unique hull vertices
  vertexTolerance: 1e-6,
};
```

### Algorithm

```javascript
/**
 * Prime Projection Search Algorithm
 * Uses ARTexplorer's camera/papercut axial view system
 */
async function searchPrimeProjections(config) {
  const results = [];
  const { spreadMin, spreadMax, spreadStep } = config;

  for (const polyhedronName of config.polyhedra) {
    // Generate polyhedron using RT-pure methods
    const polyhedron = generateRationalPolyhedron(polyhedronName);

    for (const plane of [...config.cartesianPlanes, ...config.quadrayPlanes]) {
      // Determine rotation axis perpendicular to projection plane
      const rotationAxis = getPerpendicularAxis(plane);

      for (let spread = spreadMin; spread <= spreadMax; spread += spreadStep) {
        // Apply rational-spread rotation
        const rotated = applySpreadRotation(polyhedron, spread, rotationAxis);

        // Project to 2D plane
        const projected = projectToPlane(rotated, plane);

        // Compute convex hull and count boundary vertices
        const hull = computeConvexHull(projected);
        const vertexCount = countUniqueHullVertices(hull, config.vertexTolerance);

        // Check if prime
        if (isPrime(vertexCount) && config.targetPrimes.includes(vertexCount)) {
          results.push({
            polyhedron: polyhedronName,
            plane,
            spread: spread.toFixed(4),
            vertexCount,
            hullVertices: hull,
            // Store for visualization
            rotationMatrix: getRotationMatrix(spread, rotationAxis),
          });

          console.log(
            `[PRIME FOUND] ${polyhedronName} @ spread=${spread.toFixed(4)} ` +
            `on ${plane} plane → ${vertexCount}-gon!`
          );
        }
      }
    }
  }

  return results;
}
```

### Helper Functions

```javascript
/**
 * Apply rotation using RT.QuadrayRotation spread-based coefficients
 */
function applySpreadRotation(polyhedron, spread, axis) {
  const polarity = spread <= 0.5 ? +1 : -1;  // Quadrant handling
  const { F, G, H } = RT.QuadrayRotation.fghCoeffsFromSpread(spread, polarity);

  return polyhedron.vertices.map(v => {
    // Convert to quadray, rotate, convert back
    const qv = Quadray.fromCartesian(v);
    const rotated = RT.QuadrayRotation[`rotateAbout${axis}`](qv, F, G, H);
    return Quadray.toCartesian(rotated.w, rotated.x, rotated.y, rotated.z, THREE);
  });
}

/**
 * Project 3D vertices to 2D plane
 * Uses existing papercut/camera axial view logic
 */
function projectToPlane(vertices, plane) {
  // Cartesian planes
  if (plane === 'XY') return vertices.map(v => ({ x: v.x, y: v.y }));
  if (plane === 'XZ') return vertices.map(v => ({ x: v.x, y: v.z }));
  if (plane === 'YZ') return vertices.map(v => ({ x: v.y, y: v.z }));

  // Quadray perpendicular planes
  // QW perpendicular: plane through origin normal to (1,1,1)
  // Project by removing component along basis vector
  const basisIndex = Quadray.AXIS_INDEX[plane.toLowerCase()];
  const basis = Quadray.basisVectors[basisIndex];

  return vertices.map(v => {
    const dot = v.x * basis.x + v.y * basis.y + v.z * basis.z;
    const projected = {
      x: v.x - dot * basis.x,
      y: v.y - dot * basis.y,
      z: v.z - dot * basis.z,
    };
    // Flatten to 2D using plane's local coordinates
    return flattenToPlaneCoords(projected, basis);
  });
}

/**
 * Count unique vertices on convex hull boundary
 * Handles near-coincident vertices from projection
 */
function countUniqueHullVertices(hull, tolerance) {
  const unique = [];
  for (const v of hull) {
    const isDuplicate = unique.some(u =>
      Math.abs(u.x - v.x) < tolerance &&
      Math.abs(u.y - v.y) < tolerance
    );
    if (!isDuplicate) unique.push(v);
  }
  return unique.length;
}

/**
 * Primality test
 */
function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}
```

### Output Format

```javascript
/**
 * Example search results
 */
const exampleResults = [
  {
    polyhedron: 'icosahedron',
    plane: 'QW',
    spread: '0.3827',
    vertexCount: 7,
    hullVertices: [/* 7 2D points */],
    note: 'Heptagon silhouette from icosahedron at rational spread!'
  },
  {
    polyhedron: 'dodecahedron',
    plane: 'QY',
    spread: '0.6180',  // Note: φ-1 ≈ 0.618!
    vertexCount: 11,
    hullVertices: [/* 11 2D points */],
    note: 'Hendecagon at golden ratio spread!'
  },
];
```

### Visualization Integration

```javascript
/**
 * Visualize discovered prime projections in ARTexplorer
 */
function visualizePrimeProjection(result) {
  // Set camera to axial view for the projection plane
  setCameraToAxialView(result.plane);

  // Apply the rotation that produces the prime
  const spread = parseFloat(result.spread);
  applyGlobalRotation(spread, getPerpendicularAxis(result.plane));

  // Enable papercut mode to show the projection
  enablePapercutMode(result.plane);

  // Highlight the prime-gon hull vertices
  highlightHullVertices(result.hullVertices);

  // Display method info
  updateMethodInfo(
    `${result.polyhedron} → ${result.vertexCount}-gon ` +
    `(spread=${result.spread}, plane=${result.plane})`
  );
}
```

### Search Statistics

| Search Space | Count |
|--------------|-------|
| Spread values (4dp) | 10,001 |
| Polyhedra | 6 (expandable) |
| Projection planes | 7 (3 Cartesian + 4 Quadray) |
| **Total projections** | **420,042** |

For each projection, we compute convex hull and check for prime vertex count. Parallelizable across polyhedra and planes.

### Future Extensions

1. **4D Polytopes**: Add 5-cell, 8-cell, 16-cell, 24-cell, 120-cell, 600-cell
2. **Compound Rotations**: Apply spreads on multiple axes simultaneously
3. **Janus Polarity**: Search in both 4D+ and 4D- spaces
4. **Machine Learning**: Train classifier to predict promising spread/plane combinations
5. **Symbolic Verification**: When prime found, attempt symbolic proof of the relationship

---

## Experimental Findings

### The Even Hull Count Phenomenon (Feb 2026)

**Python Search Script**: `scripts/prime_projection_search.py`

Initial computational experiments on regular polytopes revealed:

| Polytope | Vertices | Observed Hull Counts | Pattern |
|----------|----------|---------------------|---------|
| Dodecahedron | 20 | 10, 12 | All even |
| 600-cell | 216 | 12, 14, 16, 18, 20, 22, 24, 26 | All even |

Regular polytopes with **inversion symmetry** always produce even hull counts.

### The Symmetry Barrier (and How to Break It)

Regular polytopes have **inversion symmetry** (point reflection through center). When projected to 2D:
- Each hull vertex v has a paired vertex -v
- The convex hull boundary always has even vertex count
- **Prime hulls (except 2) are impossible for centrally symmetric polytopes!**

### ★ BREAKTHROUGH: Asymmetric Polytopes Work!

**Truncated Tetrahedron** (12 vertices, NO central symmetry) produces:

| Hull Count | Frequency | Type | Status |
|------------|-----------|------|--------|
| **5-gon** | 0.2% | ★ PRIME (Fermat) | ✓ Verified at s=(0,0,0.5) |
| 6-gon | 0.5% | Even | |
| **7-gon** | 0.1% | ★ PRIME (Non-constructible!) | Exact spread TBD |
| 8-gon | 55.6% | Even | |
| **9-gon** | 43.8% | ODD (Cubic-algebraic) | Current at s=(0.11,0,0.5) |

**Prime Projection Examples Found:**

| Prime | Spreads (s₁, s₂, s₃) | Polyhedron | Status |
|-------|----------------------|------------|--------|
| **5-gon** | (0, 0.5, 0) | TruncTet (12v) | ✅ Correct hull (reg=0.4231) |
| **7-gon** | (0, 0, 0.5) | TruncTet+DualTet (16v, normalized) | ✅ Correct hull (min_cross=0.353) |
| **11-gon** | (0.34, 0.54, 0.2) | TruncTet+Icosa (24v) | ✅ Correct hull (reg=0.5050) |
| **13-gon** | (0.96, 0.99, 0.99) | TruncTet+Icosa (24v) | ✅ Correct hull (reg=0.3516) |

**Note**: All presets verified 2026-02-08 using `prime_search_streamlined.py` at precision 2. The 7-gon uses dual (even-parity) tetrahedron with unit-sphere normalization — the original same-parity tet shared symmetry planes with TruncTet, causing degenerate hulls. All spreads verified against base `Polyhedra` functions matching the JS renderer.

### Paths Forward

1. **✓ Asymmetric Polytopes**: Use polytopes without central symmetry
   - **Truncated tetrahedron** → 5-gon verified!
   - Snub cube (chiral) - potential for higher primes
   - Compound of 5 tetrahedra

2. **✓ Compound Pairs**: Combine two polyhedra — demonstrated for 7, 11, 13-gon
   - **Trunc Tet + Dual Tet** (unit-sphere normalized) → 7-gon ✅ verified 2026-02-08 at s=(0, 0, 0.5) via `Polyhedra.compoundTruncTetDualTet()`
   - **Trunc Tet + Icosahedron** → 11-gon ✅ at s=(0.34, 0.54, 0.2) and 13-gon ✅ at s=(0.96, 0.99, 0.99) via `Polyhedra.compoundTruncTetIcosa()`
   - Stella Octangula variations

3. **Search for Higher Primes**: 17, 19, 23...
   - Need 3+ component compounds (30+ vertices)
   - Trunc Tet + Icosa + Dodecahedron (44 vertices)?

4. **4D± Extensions**: Use full 4D quadray system
   - Janus polarity for asymmetric configurations

5. **Quasicrystal Construction**: Irrational cuts of rational lattices

### Script Usage (Project-Streamline)

```bash
# Quick search for known primes
python scripts/prime_search_streamlined.py --primes 5,7 --precision 1

# Verified full search (uses unified JS-ported vertex definitions)
python scripts/prime_search_streamlined.py --primes 5,7,11,13 --precision 2 --verify

# Verbose output with progress
python scripts/prime_search_streamlined.py --primes 7 --precision 3 -v
```

**Results output**: `prime_projections_YYYYMMDD_HHMMSS.json` (spreads work directly in JavaScript)

---

---

## Current Workplan Status (Feb 2026)

### ✓ Completed

1. **RT.PureCubics Namespace** - Implemented in `modules/rt-math.js`
   - Nonagon: cubic 8x³ - 6x - 1 = 0 (cos 20°)
   - Heptagon: cubic 8x³ - 4x² - 4x + 1 = 0 (cos 360°/7)
   - Cached sin/cos values for RT-pure rotation

2. **Prime Projection Search Scripts**
   - `scripts/prime_projection_search.py` (v1) — Discovered Symmetry Barrier, equiangularity scoring
   - `scripts/prime_search_streamlined.py` (v2, active) — Unified search with JS-ported vertex defs
   - Documented in `Geometry Documents/Prime-Projection-Conjecture.tex`

3. **UI Method Info Display** - Shows construction type for each n-gon

4. **RTProjections Module Extraction** - `modules/rt-projections.js` (2026-02-07)
   - Generalized projection visualization for ANY polyhedron
   - Extracted generic functions from `rt-prime-cuts.js` using Shadow & Swap pattern
   - Provides `applyPreset()`, `showProjection()`, `hideProjection()` API
   - See: `Geometry Documents/Project-Projection.md` for implementation details

5. **RTPrimeCuts Simplification + Floating Modal** (2026-02-07/08)
   - `showPrimePolygon(n)` delegates to `RTProjections.applyPreset()`
   - Uses `PROJECTION_PRESETS` registry for all prime polygon configurations
   - Prime presets now in floating draggable modal from Math Demos menu
   - Old sidebar preset buttons removed

6. **Quadray Compound Code Removal** (2026-02-08)
   - Deleted `compoundTruncTetIcosahedron` and `compoundTruncTetTetrahedron` from `rt-quadray-polyhedra.js`
   - Base polyhedra `Polyhedra.compoundTruncTetIcosa()` and `Polyhedra.compoundTruncTetDualTet()` are now the single source
   - Removed all compound checkbox UI, bindings, rendering groups, imports, and re-export aliases
   - **Impact**: Old preset spreads found with Quadray compound vertices no longer match — 7/11/13-gon ALL BROKEN

7. **Re-search All Broken Presets** (2026-02-08) ✅
   - Discovered 7-gon was ALSO broken: old `(0, 0.01, 0.14)` returned 6-gon with base vertices
   - Ran `prime_search_streamlined.py --precision 2` for 7, 11, 13-gon
   - Updated `PROJECTION_PRESETS` in `rt-prime-cuts.js` with new verified spreads:
   - 5-gon: `s=(0, 0.5, 0)` from TruncTet (12v) ✅ correct hull (reg=0.4231)
   - 7-gon: `s=(0, 0, 0.5)` from TruncTet+DualTet (16v, normalized) ✅ correct hull (min_cross=0.353)
   - 11-gon: `s=(0.34, 0.54, 0.2)` from TruncTet+Icosa (24v) ✅ correct hull (reg=0.5050)
   - 13-gon: `s=(0.96, 0.99, 0.99)` from TruncTet+Icosa (24v) ✅ correct hull (reg=0.3516)

8. **Enhance Search for Equiangularity** ✅ — Added `compute_hull_geometry()` to `prime_search_streamlined.py`
   - Computes angle variance (std dev°), edge variance (CV%), regularity score (0-1)
   - Flags `is_equiangular` (<0.5° std dev), `is_equilateral` (<1% CV), GOLD (both)
   - Results ranked by regularity score (best first)

9. **Dual Tet Compound Fix for 7-gon** (2026-02-08) ✅
   - Original `compoundTruncTetTet()` used same-parity (ODD) tet — shared symmetry planes with TruncTet
   - Hull vertices became nearly collinear (cross products ~1e-16), causing degenerate/wrong hull counts
   - Created `compoundTruncTetDualTet()` using DUAL (even-parity) tet + unit-sphere normalization
   - All 16 vertices normalized to equal radius before scaling — eliminates Float32/scale sensitivity
   - Min cross product = 0.353 (robustly non-degenerate vs ~0 for same-parity)
   - Python parity: added `dual_tetrahedron()` and `trunc_tet_plus_dual_tet()` to `rt_polyhedra.py`

10. **Dual Tetrahedron Truncation UI** (2026-02-08) ✅
    - Added "Quadray Truncated Dual Tet" checkbox to sidebar (mirrors existing Truncated Tet toggle)
    - Added `truncatedDualTetrahedron()` to `rt-polyhedra.js` — internally truncates dual tet
    - Verified quadrance exactness: `Expected Q=4.000000, Max error=0.00e+0`

### 📋 Pending

11. **Precision 3+ Regularity Search** — Fine-grid around best-scoring spreads for all primes
   - Current regularity scores are low (0.28–0.51) — far from equiangular
   - No GOLD or equiangular results found at precision 2

12. **RT.ProjectionPolygons Namespace** - Shadow polygons using only √ radicals
   - Algebraic formulas for projection heptagon
   - Derived from Prime Projection Search findings
   - Uses √2, √11, √89, √178 (no transcendentals)

13. **Higher Prime Search** - Extend projection search to 17, 19, 23...
   - Larger compound polyhedra (3+ components)
   - 4D± with Janus polarity perturbation

---

## Workplan: Projection-Based Polygon Generation (Swap-Out Plan)

### Objective

Replace the current 5-gon and 7-gon generation methods in `rt-primitives.js` with **projection-based construction** from base polyhedra in `rt-polyhedra.js` and `rt-math.js`.

### Current Implementation (To Be Replaced)

| n-gon | Current Location | Current Method |
|-------|------------------|----------------|
| 5-gon | `rt-primitives.js:351-402` | `_polygonPentagon()` using `RT.PurePhi.pentagon` constants |
| 7-gon | `rt-primitives.js:608-661` | `_polygonHeptagon()` using `RT.PureCubics.heptagon` cached cubics |

**Prism generation** (`rt-primitives.js:814-918`) calls `Primitives.polygon()` for bases, so updating the polygon generators automatically updates prisms.

### Projection-Based Methods

| n-gon | Source Polyhedron | Viewing Spreads | Status |
|-------|-------------------|-----------------|--------|
| **5-gon** | TruncTet (12v) | s = (0, 0.5, 0) | ✅ Correct hull (reg=0.4231) |
| **7-gon** | TruncTet+DualTet (16v, normalized) | s = (0, 0, 0.5) | ✅ Correct hull (min_cross=0.353) |
| **11-gon** | TruncTet+Icosa (24v) | s = (0.34, 0.54, 0.2) | ✅ Correct hull (reg=0.5050) |
| **13-gon** | TruncTet+Icosa (24v) | s = (0.96, 0.99, 0.99) | ✅ Correct hull (reg=0.3516) |

**Source**: Base polyhedra from `Polyhedra.compoundTruncTetIcosa()` and `Polyhedra.compoundTruncTetDualTet()` in `rt-polyhedra.js`.
Spreads applied via `PROJECTION_PRESETS` in `rt-prime-cuts.js`.

---

### Prime Projection Visualization (Updated 2026-02-08)

The visualization is rendered by `rt-projections.js` using the `PROJECTION_PRESETS` registry in `rt-prime-cuts.js`. Access via **Math Demos → Prime Projections** floating modal.

#### Visualization Components

1. **Source Polyhedron** — base polyhedra from `rt-polyhedra.js`
   - TruncTet (12v), TruncTet+DualTet (16v, normalized), or TruncTet+Icosa (24v)
   - Displayed at its actual position/scale/orientation in the scene

2. **Projection Rays** (GREEN lines)
   - Rays from each polyhedron vertex in the viewing direction defined by spreads
   - Shows HOW vertices project to the 2D plane

3. **Projection Plane** (at configurable distance from polyhedron)
   - Oriented perpendicular to viewing direction
   - Shows where rays intersect the plane

4. **Actual Hull** (YELLOW polygon)
   - Convex hull of boundary vertices on the projection plane
   - All four primes (5, 7, 11, 13) produce correct hull counts (verified 2026-02-08)

5. **Ideal Comparison** (CYAN polygon)
   - Regular n-gon using classical trig, same circumradius
   - For visual comparison — shows deviation from "perfect" regularity

#### Key Insight: Projection ≠ Section Cut

**IMPORTANT**: The Papercut cutplane should NOT be activated for this visualization!
- **Projection** = viewing silhouette (convex hull of all vertices from a direction)
- **Section cut** = plane intersection with faces (different polygon entirely)

The prime hull emerges from PROJECTION, not from cutting.

---

**Key formulas already in `rt-math.js`:**
- Pentagon α spread: `RT.PurePhi.pentagon.alpha()` = (5-√5)/8
- Pentagon β spread: `RT.PurePhi.pentagon.beta()` = (5+√5)/8
- Spread-to-rotation: `rotation_matrix_from_spreads(s1, s2, s3)` → 3×3 rotation matrix
- Convex hull: `convex_hull_2d(points)` → Andrew's monotone chain
- Polyhedra vertices: `Polyhedra.truncatedTetrahedron()`, `Polyhedra.compoundTruncTetDualTet()`, `Polyhedra.compoundTruncTetIcosa()`

### Phase 1: Create Unified Projection Generator

Add to `rt-primitives.js` or create new `rt-projection-polygons.js`:

```javascript
/**
 * Generate polygon via 3D polyhedron projection
 * Uses Quadray-native vertices + rational spread rotation + 2D convex hull
 *
 * @param {number} n - Number of sides (currently 5 or 7)
 * @param {number} circumradiusQ - Circumradius quadrance for scaling
 * @returns {Object} {vertices, edges, metadata}
 */
function generateProjectionPolygon(n, circumradiusQ = 1) {
  const config = PROJECTION_POLYGON_CONFIG[n];
  if (!config) {
    throw new Error(`Projection polygon not available for n=${n}`);
  }

  // 1. Get source vertices from base polyhedra (Cartesian)
  const vertices = config.sourceVertices();

  // 2. Apply spread-based rotation
  const { s1, s2, s3 } = config.viewingSpreads();
  const rotated = applySpreadRotations(vertices, s1, s2, s3);

  // 3. Project to XY plane (drop Z)
  const projected2D = rotated.map(v => ({ x: v.x, y: v.y }));

  // 4. Compute convex hull → n vertices on boundary
  const hull = computeConvexHull(projected2D);

  // 5. Scale to match circumradius quadrance
  const scaled = scaleToCircumradius(hull, circumradiusQ);

  return {
    vertices: scaled,
    edges: generatePolygonEdges(n),
    metadata: {
      method: 'projection',
      sourcePolyhedron: config.name,
      spreads: { s1, s2, s3 },
      coordinateSystem: 'cartesian→rotated→2D',
      radicals: config.radicals(),
    }
  };
}

const PROJECTION_POLYGON_CONFIG = {
  5: {
    name: 'truncated_tetrahedron',
    sourceVertices: () => Polyhedra.truncatedTetrahedron(),  // 12 vertices
    viewingSpreads: () => ({ s1: 0, s2: 0.5, s3: 0 }),
    radicals: () => ({ sqrt5: Math.sqrt(5) }),
  },
  7: {
    name: 'trunc_tet_plus_dual_tet',
    sourceVertices: () => Polyhedra.compoundTruncTetDualTet(),   // 16 vertices (unit-sphere normalized)
    viewingSpreads: () => ({ s1: 0, s2: 0, s3: 0.5 }),
    radicals: () => ({ /* TBD */ }),
  },
};
```

### Phase 2: Update Polygon Dispatcher

Modify the `polygon()` dispatcher in `rt-primitives.js`:

```javascript
// BEFORE (current):
const generators = {
  5: Primitives._polygonPentagon,   // φ-Rational method
  7: Primitives._polygonHeptagon,   // Cubic method
  // ...
};

// AFTER (projection-based):
const generators = {
  5: (Q, opts) => generateProjectionPolygon(5, Q),  // Projection from Trunc Tet
  7: (Q, opts) => generateProjectionPolygon(7, Q),  // Projection from Trunc Tet
  // ... other n-gons unchanged
};
```

### Phase 3: Update Method Info Display

Modify `getPolygonMethodInfo()` in `rt-init.js`:

```javascript
// BEFORE:
case 5: return 'φ-Rational (s = β)';
case 7: return 'Cubic (cos 360°/7)';

// AFTER (Project-Streamline verified):
case 5: return 'Projection (TruncTet @ s=(0,0.5,0))';
case 7: return 'Projection (TruncTet+DualTet @ s=(0,0,0.5))';
```

### Phase 4: Prism Auto-Update (No Changes Needed!)

Since `Primitives.prism()` calls `Primitives.polygon()` internally:

```javascript
// From rt-primitives.js:819-823
const basePolygon = Primitives.polygon(baseQuadrance, { sides: n });
```

**Prisms automatically use the new projection-based polygons** once we update the polygon generator.

### Phase 5: Validation & Testing

1. **Visual Comparison**: Render old vs new 5-gon/7-gon side-by-side
2. **Vertex Count Check**: Confirm hull produces exactly n vertices
3. **Edge Regularity**: Measure edge length variance (projection polygons are NOT perfectly regular)
4. **Prism Check**: Verify prism bases match new polygon generation
5. **State Save/Load**: Ensure projection metadata persists correctly

### Implementation Checklist

- [ ] Add `generateProjectionPolygon()` to `rt-primitives.js`
- [ ] Add `PROJECTION_POLYGON_CONFIG` lookup table
- [ ] Implement `applySpreadRotations()` helper (3-axis rotation)
- [ ] Implement `computeConvexHull()` for 2D points
- [ ] Update polygon dispatcher to use projection for n=5,7
- [ ] Update method info display strings
- [ ] Add console logging for projection metadata
- [ ] Test in browser with various circumradii
- [ ] Verify prism generation inherits projection method
- [ ] Document edge length variance for non-regular projection polygons

### Trade-offs & Considerations

| Aspect | Current Method | Projection Method |
|--------|----------------|-------------------|
| **5-gon regularity** | Perfect (φ-constructible) | Irregular (~25% angular variance) |
| **7-gon regularity** | Perfect (cubic cached) | **Irregular** (~25% angular, ~15% edge) |
| **Computation** | Direct formula | Hull computation |
| **Rationality** | Cubic roots | Only √ radicals |
| **Educational value** | Shows cubic algebra | Shows projection emergence |
| **Gauss-Wantzel** | Bypasses via cached cubics | Demonstrates prime-from-projection |

**Critical distinction**: Projection method produces **irregular** n-gons with correct vertex count but unequal angles/edges. Use cubic-cached method when regularity is required.

**Recommendation**: Offer **both methods** via UI toggle:
- Default: Projection-based (demonstrates prime emergence from higher dimensions)
- Alternative: Cubic/φ-cached (maximally regular polygons)

```javascript
// Add to polygon options
const polygonOptions = {
  method: 'projection' | 'algebraic',  // User-selectable
  // ...
};
```

### Phase 6: Composite Multiples (5k, 7k polygons)

Once base 5-gon and 7-gon projection works, **all multiples inherit** via composite construction:

#### Multiples of 5 (10, 15, 20, 25, 30, 35...)

| n-gon | Construction | Rotation Spread | Method |
|-------|--------------|-----------------|--------|
| **10** | 2 × 5-gon @ 36° | α = (5-√5)/8 | Projection base + φ-rotation |
| **15** | 3 × 5-gon @ 24° | sin²(24°) | Projection base + GCD |
| **20** | 2 × 10-gon @ 18° | sin²(18°) = (3-√5)/16 | Projection chain |
| **25** | 5 × 5-gon @ 14.4° | sin²(72°/5) | Projection base + 5-fold |
| **30** | 2 × 15-gon @ 12° | complex | Projection chain |
| **35** | 5 × 7-gon @ 10.29° | sin²(360°/35) | Projection bases combined |

#### Multiples of 7 (14, 21, 28, 35...)

| n-gon | Construction | Rotation Spread | Method |
|-------|--------------|-----------------|--------|
| **14** | 2 × 7-gon @ 25.71° | sin²(180°/7) | Projection base + half-rotation |
| **21** | 3 × 7-gon @ 17.14° | sin²(360°/21) | Projection base + 3-fold |
| **28** | 2 × 14-gon @ 12.86° | sin²(180°/14) | Projection chain |
| **35** | 5 × 7-gon @ 10.29° | sin²(360°/35) | LCM of 5 and 7 |

#### Implementation Strategy

```javascript
/**
 * Generate composite polygon from projection base
 * @param {number} n - Target polygon sides
 * @param {number} base - Base polygon (5 or 7)
 * @param {number} k - Multiplier (n = base × k or n = base × k / gcd)
 */
function generateCompositeFromProjection(n, base, k) {
  // Get projection-based base polygon
  const basePolygon = generateProjectionPolygon(base, circumradiusQ);

  // Calculate rotation spread for k-fold multiplication
  const rotationAngle = 360 / n;  // degrees
  const rotationSpread = RT.degreesToSpread(rotationAngle);

  // Generate k rotated copies
  const allVertices = [];
  for (let i = 0; i < k; i++) {
    const cumulativeSpread = RT.degreesToSpread(rotationAngle * i);
    const rotated = rotatePolygon(basePolygon.vertices, cumulativeSpread);
    allVertices.push(...rotated);
  }

  return {
    vertices: allVertices,
    edges: generatePolygonEdges(n),
    metadata: {
      method: 'composite-projection',
      base: base,
      multiplier: k,
      baseMethod: 'projection',
    }
  };
}

// Extended dispatcher
const COMPOSITE_FROM_PROJECTION = {
  10: { base: 5, k: 2 },   // 2×5 @ 36°
  14: { base: 7, k: 2 },   // 2×7 @ 25.71°
  15: { base: 5, k: 3 },   // 3×5 @ 24°
  20: { base: 5, k: 4 },   // 4×5 @ 18° (or 2×10)
  21: { base: 7, k: 3 },   // 3×7 @ 17.14°
  25: { base: 5, k: 5 },   // 5×5 @ 14.4°
  28: { base: 7, k: 4 },   // 4×7 @ 12.86°
  35: { base: 7, k: 5 },   // 5×7 @ 10.29° (= LCM(5,7))
  // ... extensible to any 5k or 7k
};
```

#### GCD/LCM Special Cases

For n where gcd(5,7) divides n (like 35 = 5×7):

```javascript
// 35-gon can be built from EITHER base:
// - 5 × 7-gon @ 10.29° (seven copies of projection 7-gon)
// - 7 × 5-gon @ 10.29° (five copies of projection 5-gon)
// Both produce identical 35-gon!

const n35_from_7 = generateCompositeFromProjection(35, 7, 5);
const n35_from_5 = generateCompositeFromProjection(35, 5, 7);
// Verify: vertices should be identical (modulo ordering)
```

#### Rotation Spreads for Common Multiples

Pre-computed values to add to `RT.PureCubics` or `RT.CompositeRotations`:

| Angle | Spread s = sin²(θ) | Used For |
|-------|-------------------|----------|
| 36° | (5-√5)/8 = α | 10-gon from 5 |
| 25.71° | sin²(π/7) ≈ 0.1883 | 14-gon from 7 |
| 24° | sin²(24°) ≈ 0.1654 | 15-gon from 5 |
| 18° | (3-√5)/16 | 20-gon from 5 |
| 17.14° | sin²(π/21) ≈ 0.0857 | 21-gon from 7 |
| 14.4° | sin²(72°/5) ≈ 0.0618 | 25-gon from 5 |
| 12.86° | sin²(π/14) ≈ 0.0495 | 28-gon from 7 |
| 10.29° | sin²(π/35) ≈ 0.0255 | 35-gon from 5 or 7 |

**Note**: Rotation spreads for 7-multiples use the same heptagon cubic (already cached), while 5-multiples use φ-rational values (already in `RT.PurePhi`).

### ★ Higher Primes: Status Update (Feb 2026)

| Prime | Compound | Spreads | Search Status |
|-------|----------|---------|---------------|
| **5** | TruncTet (12v) | (0, 0.5, 0) | ✅ Correct hull (reg=0.4231) |
| **7** | TruncTet + DualTet (16v, normalized) | (0, 0, 0.5) | ✅ Correct hull (min_cross=0.353) |
| **11** | TruncTet + Icosa (24v) | (0.34, 0.54, 0.2) | ✅ Correct hull (reg=0.5050) |
| **13** | TruncTet + Icosa (24v) | (0.96, 0.99, 0.99) | ✅ Correct hull (reg=0.3516) |
| 17 | 3+ component compound? | - | 📋 Pending |
| 19 | 4D polytopes? | - | 📋 Pending |

**Now unlocked** (multiples of discovered primes):
- 11-multiples: 22, 33, 44, 55...
- 13-multiples: 26, 39, 52, 65...
- Combined: 77 (7×11), 91 (7×13), 143 (11×13)...

---

## Quadray Coordinate Solutions

The Quadray (WXYZ) tetrahedral coordinate system offers significant advantages for prime polygon construction over Cartesian XYZ. Where Cartesian coordinates require irrational radicals, Quadray coordinates remain **purely rational**.

### Tetrahedron: Maximally Simple

In Quadray, the regular tetrahedron has trivially simple vertices:

| Vertex | Quadray (W,X,Y,Z) | Cartesian (x,y,z) |
|--------|-------------------|-------------------|
| W | (1, 0, 0, 0) | (1, 1, 1)/√3 |
| X | (0, 1, 0, 0) | (1, -1, -1)/√3 |
| Y | (0, 0, 1, 0) | (-1, 1, -1)/√3 |
| Z | (0, 0, 0, 1) | (-1, -1, 1)/√3 |

**Key insight**: The Quadray coordinates are **integer** while Cartesian requires √3.

### Truncated Tetrahedron: All Rational Quadray Vertices

The truncated tetrahedron—source of the 7-gon projection—has 12 vertices. In Quadray, all coordinates are **rational fractions**:

```
Quadray Vertices (scale factor 1/3):
[2,1,0,0], [2,0,1,0], [2,0,0,1]   # Near W vertex
[1,2,0,0], [0,2,1,0], [0,2,0,1]   # Near X vertex
[1,0,2,0], [0,1,2,0], [0,0,2,1]   # Near Y vertex
[1,0,0,2], [0,1,0,2], [0,0,1,2]   # Near Z vertex
```

Compare with Cartesian (requires √2):
```
Cartesian Vertices:
(±1, ±1, ±3) permutations with sign constraints
```

### Spread Between Quadray Basis Vectors

The spread between any two Quadray basis vectors is:

```
s = sin²(109.47°) = 8/9  (exact rational!)
cos(109.47°) = -1/3     (exact rational!)
```

This is the **natural angle** of tetrahedral geometry—fully compatible with Rational Trigonometry.

### Rotation via F, G, H Coefficients

For a rotation by spread s in the Quadray system, define coefficients:

```javascript
F = (2·cos(θ) + 1) / 3     // derived from spread s = sin²(θ)
G = (1 - cos(θ) + √3·sin(θ)) / 3
H = (1 - cos(θ) - √3·sin(θ)) / 3

// From spread s, recover trig values:
sin(θ) = √s
cos(θ) = √(1-s)
```

For rational spreads, the rotation remains algebraically exact until the √ operation.

### Heptagon Projection in Quadray Terms

The 7-gon projection from TruncTet+DualTet compound (unit-sphere normalized) at verified spreads (s₁=0, s₂=0, s₃=0.5):

1. **Source polyhedron**: Truncated tetrahedron + dual (even-parity) tetrahedron, all 16 vertices normalized to unit sphere
2. **Viewing angle**: Specified by rational spreads (no transcendentals) — s₃=0.5 is exactly 1/2
3. **Rotation matrix**: Computed from F, G, H coefficients
4. **Result**: 7 hull vertices, each with algebraic coordinates
5. **Robustness**: Min cross product = 0.353 (well above Float32 threshold)

The dual tet breaks shared symmetry planes with the TruncTet (the original same-parity tet produced degenerate hulls). Unit-sphere normalization ensures all vertices have equal reach from origin, eliminating scale-dependent Float32 hull count changes.

The Quadray formulation maintains rationality longer than Cartesian, deferring radical evaluation until the final projection step.

### Comparison: Quadray vs Cartesian

| Property | Quadray WXYZ | Cartesian XYZ |
|----------|--------------|---------------|
| Tetrahedron vertices | Integer (1,0,0,0) | Irrational (√3) |
| Truncated tetrahedron | Rational (2,1,0,0)/3 | Irrational (√2) |
| Basis vector angle | Spread 8/9 (rational) | cos⁻¹(-1/3) (transcendental) |
| Rotation coefficients | Algebraic in √s | Transcendental sin/cos |
| Natural for IVM lattice | Yes | Requires conversion |

---

---

## Foundations: Projection Geometry of Polyhedra

> These results—analogous to Euler's V - E + F = 2 for polyhedral topology—constrain what regular polygons can emerge from orthographic projection. They are **established mathematical facts** that ground our prime projection search.

### The Shadow Bound (Euler for Projections)

**Definition (Projection Hull)**: For a convex polyhedron P with vertex set V and projection direction d̂, the projection hull H(P, d̂) is the convex hull of the projected vertices in 2D. The hull count h = |H| is the number of vertices on the hull boundary.

**Theorem (Shadow Bound)**: For a convex polyhedron with V vertices projected orthographically to 2D:

```
3 ≤ h ≤ V
```

- Lower bound (h ≥ 3): Any 2D convex hull has at least 3 vertices (triangle)
- Upper bound (h ≤ V): Achieved when all vertices project to the hull boundary (e.g., prism along axis)

### The Ring Stacking Theorem

When projecting along a rotational symmetry axis, vertices organize into "rings" that determine achievable regular polygons.

**Definition (Vertex Ring)**: For a polyhedron with k-fold rotational symmetry about axis â, a vertex ring is a set of k vertices related by 360°/k rotations about â, all at equal distance from the axis and equal height along it.

**Theorem (Ring Stacking)**: When projecting a polyhedron along a k-fold symmetry axis, the maximum regular n-gon achievable satisfies:

```
n = k × m
```

where m is the number of complete vertex rings offset by exactly 360°/(km) from each other.

**Key Insight**: Two rings of k vertices, offset by 180°/k, project to a regular 2k-gon. Three rings offset by 120°/k project to a regular 3k-gon.

### Maximum Regular Projections: Platonic Solids

| Solid | V | Best Axis | On Axis | Off Axis | Rings | Max Regular n |
|-------|---|-----------|---------|----------|-------|---------------|
| Tetrahedron | 4 | 3-fold (vertex) | 1 | 3 | 1×3 | **3** (triangle) |
| Cube | 8 | 3-fold (diagonal) | 2 | 6 | 2×3 @ 60° | **6** (hexagon) |
| Octahedron | 6 | 3-fold (face) | 0 | 6 | 2×3 @ 60° | **6** (hexagon) |
| Dodecahedron | 20 | 5-fold (face) | 0 | 20→10 hull | 2×5 @ 36° | **10** (decagon) |
| Icosahedron | 12 | 5-fold (vertex) | 2 | 10 | 2×5 @ 36° | **10** (decagon) |

**Note**: Dual pairs (cube↔octahedron, dodecahedron↔icosahedron) share max projection due to identical symmetry groups.

**Example: The Cube's Hexagonal Shadow**
- Cube (8 vertices) viewed along body diagonal [1,1,1]:
- 2 vertices on axis (opposite corners)
- 6 vertices form two staggered triangles at heights 1/3 and 2/3
- Triangles offset by 60° → project as regular hexagon
- **No viewing angle produces a regular polygon > 6 from the cube**

### Maximum Regular Projections: Archimedean Solids

| Solid | V | Symmetry | Best Axis | Max Regular n | Notes |
|-------|---|----------|-----------|---------------|-------|
| Truncated Tetrahedron | 12 | T_d | 3-fold | **6** | 2×3 rings, **NO central symmetry!** |
| Cuboctahedron | 12 | O_h | 4-fold | **8** | 2×4 @ 45° |
| Truncated Cube | 24 | O_h | 3-fold | **12** | 4×3 @ 30° |
| Truncated Octahedron | 24 | O_h | 3-fold | **12** | 4×3 @ 30° |
| Rhombicuboctahedron | 24 | O_h | 4-fold | **8** | 2×4 primary |
| Snub Cube | 24 | O (chiral) | 4-fold | **8** | **NO central symmetry!** |
| Icosidodecahedron | 30 | I_h | 5-fold | **10** | 2×5 primary |
| Truncated Dodecahedron | 60 | I_h | 5-fold | **20** | 4×5 @ 18° |
| Truncated Icosahedron | 60 | I_h | 5-fold | **20** | 4×5 @ 18° |
| Rhombicosidodecahedron | 60 | I_h | 5-fold | **10** | 2×5 primary |
| Great Rhombicosidodecahedron | 120 | I_h | 5-fold | **20** | 4×5 @ 18° |
| Snub Dodecahedron | 60 | I (chiral) | 5-fold | **10** | **NO central symmetry!** |

### Symmetry Ceiling Theorem

**Theorem**: For a polyhedron with rotational symmetry group G, let k_max be the maximum rotation order. Then the maximum regular n-gon achievable satisfies:

```
n ≤ k_max × ⌊(V - v_axis) / k_max⌋
```

where v_axis is the number of vertices on the k_max-fold axis.

| Symmetry Group | Polyhedra | k_max | Theoretical Max | Achieved |
|----------------|-----------|-------|-----------------|----------|
| Tetrahedral T_d | Tetrahedron, Trunc. Tet. | 3 | 6 | 6 |
| Octahedral O_h | Cube, Octahedron, Trunc. Cube | 4 | 12 | 12 |
| Icosahedral I_h | Dodeca., Icosa., Trunc. Icosa. | 5 | 20 | 20 |

### Critical Distinction: Regular n-gon vs n-Hull

> ⚠️ **The theorems above concern REGULAR n-gon projections** (equal angles, equal edges on a circle).
>
> **Hull count** is weaker—a projection can have n hull vertices without being regular:
> - **Regular n-gon**: All interior angles = (180° - 360°/n), all edges equal
> - **n-hull**: Convex hull has n vertices—possibly irregular
>
> Our prime projection search targets **hull counts**, not regular polygons. The 7-hull from truncated tetrahedron has angles from 70.5° to 180°—far from the regular heptagon's 128.57°.

### Central Symmetry Barrier (Formal Statement)

**Theorem**: If a polyhedron has central (inversion) symmetry, then **all** hull counts from orthographic projection are even.

**Proof**: For every hull vertex v, its antipode -v either:
1. Also lies on the hull (paired contribution), or
2. Projects collinear with v and center (symmetric exclusion)

In either case, hull vertices come in pairs → even count.

**Corollary**: Polyhedra with central symmetry cannot produce prime hull counts > 2.

This is why **truncated tetrahedron** (no central symmetry) and **chiral solids** (snub cube, snub dodecahedron) are key candidates for prime projection search.

### Summary: Foundational Bounds

> **Established facts constraining our search:**
>
> 1. **Shadow Bound**: 3 ≤ h ≤ V for any projection hull
> 2. **Ring Stacking**: Max regular n-gon = k × m (axis order × aligned rings)
> 3. **Symmetry Ceiling**: Max n bounded by rotation group order
> 4. **Central Symmetry Barrier**: Inversion symmetry ⇒ even hull counts only
> 5. **Hull ≠ Regular**: Prime hulls exist but are irregular projections
>
> These principles are as fundamental to projection geometry as Euler's V - E + F = 2 is to polyhedral topology.

---

## The Shadow Bound Theorem: Search Candidate Selection

### Motivation

When projecting a convex polyhedron to 2D, the convex hull of the projected vertices forms the "shadow boundary." Understanding the bounds on this hull count guides our search for prime n-gon projections.

### Empirical Hull Ranges

| Polyhedron | V | H_min | H_max | H_min/V | Notes |
|------------|---|-------|-------|---------|-------|
| Tetrahedron | 4 | 3 | 4 | 75% | Edge-on view gives triangle |
| Cube | 8 | 4 | 6 | 50% | Space diagonal → square |
| Octahedron | 6 | 4 | 6 | 67% | Vertex view → square |
| Icosahedron | 12 | 6 | 10 | 50% | 5-fold axis → decagon |
| Dodecahedron | 20 | 10 | 12 | 50% | Central symmetry limits |
| **Truncated Tet** | 12 | **5** | 9 | **42%** | Asymmetric! |
| **Trunc Tet + Icosa** | 24 | ~8 | ~14 | ~33% | Compound, asymmetric |

**Key insight**: The truncated tetrahedron can achieve H_min < V/2 because it lacks central symmetry. This is precisely what enables prime hull counts.

### The Search Candidate Theorem

**Theorem (Search Candidate Selection)**: To find an n-hull projection with n prime:

1. **Vertex Count**: Source polyhedron must have V ≥ n vertices
2. **Symmetry Barrier**: Source must lack central symmetry (for primes > 2)
3. **Headroom Principle**: For reliable n-hull discovery, prefer V ≥ 1.5n to 2n

**Corollary**: To search for a 17-hull (next prime target), we need:
- Minimum: V ≥ 17 vertices
- Preferred: V ≥ 26-34 vertices
- Symmetry: Asymmetric (or compound with broken symmetry)

**Candidates for 17-gon search**:
| Compound | V | Symmetry | Feasibility |
|----------|---|----------|-------------|
| Trunc Tet + Dodecahedron | 12 + 20 = 32 | Broken | ✓ Good candidate |
| 2× Trunc Tet + Tetrahedron | 24 + 4 = 28 | Broken | ✓ Possible |
| Snub Cube | 24 | Chiral (no central) | ✓ Single polyhedron |
| Trunc Tet + Snub Cube | 12 + 24 = 36 | Broken | ✓ Good headroom |

### Why Quadray Viewing Angles Matter

The WXYZ (Quadray) coordinate system offers **non-obvious viewing angles** that Cartesian XYZ naturally misses:

1. **Tetrahedral alignment**: WXYZ basis vectors point to tetrahedron vertices at (1,1,1), (1,-1,-1), (-1,1,-1), (-1,-1,1). These are NOT aligned with Cartesian axes.

2. **Rational spread relationships**: The spread between Quadray basis vectors is 8/9 (rational). Rotations within this framework preserve algebraic relationships.

3. **Central angle planes**: The 6 Quadray planes (WX, WY, WZ, XY, XZ, YZ) intersect at 60° angles, providing a tessellation of viewing directions distinct from Cartesian orthogonal planes.

4. **Asymmetric discovery**: The truncated tetrahedron's special relationship with Quadray coordinates (all vertices are rational: {2,1,0,0} permutations) suggests that Quadray viewing angles may reveal prime hulls invisible from Cartesian views.

### Systematic Search Strategy

**Phase 1: On-Axis Views** (Exhaustive)
```
For each candidate polyhedron/compound:
  For each Cartesian axis (±X, ±Y, ±Z):
    Project and count hull
  For each Quadray axis (QW, QX, QY, QZ):
    Project and count hull
  Record all prime hull counts
```

**Phase 2: Rational Spread Variants** (Grid search)
```
For promising on-axis results (hull near target prime):
  For s1 in [0, 0.1, 0.2, ..., 1.0]:
    For s2 in [0, 0.1, 0.2, ..., 1.0]:
      For s3 in [0, 0.1, 0.2, ..., 1.0]:
        Apply spread rotation
        Project and count hull
        If hull == target_prime: RECORD
```

**Phase 3: Fine Refinement** (Local search)
```
For each (s1, s2, s3) that produced target prime:
  Search neighborhood at precision 0.01
  Find spread values that maximize regularity score
```

### The Regularity Challenge

**Critical clarification**: Our projections produce n-HULL counts, not regular n-gons.

| Prime | Hull Found? | Equilateral? | Equiangular? | Regularity Score |
|-------|-------------|--------------|--------------|------------------|
| 5-hull | ✅ Correct | No (edge CV 32.7%) | No (angle std 20.0°) | 0.4231 |
| 7-hull | ✅ Correct | No | No | ~0.28 |
| 11-hull | ✅ Correct | No | No | 0.5050 |
| 13-hull | ✅ Correct | No | No | 0.3516 |

**The fundamental incompatibility**: A regular n-gon requires n-fold rotational symmetry. Our source polyhedra have tetrahedral (3-fold, 4-fold) or icosahedral (5-fold) symmetry. There is **no viewing angle** that can make vertices from these symmetry groups project to a regular prime polygon (for primes other than 3 or 5).

**What we CAN search for**:
1. **Prime hull counts** — Achieved ✓
2. **Minimized edge variance** — More equilateral-ish
3. **Minimized angle variance** — More equiangular-ish
4. **Maximum regularity score** — Closest approximation to regular

### Open Questions

1. **Does every asymmetric polyhedron with V ≥ n produce an n-hull at SOME viewing angle?**
   - Conjecture: Yes, for sufficiently generic polyhedra
   - Exception: Highly degenerate configurations may skip certain counts

2. **Is there a "most regular" n-hull for each prime?**
   - For 5-hull: Best edge variance? Best angle variance?
   - Systematic search for "optimal" spread parameters needed

3. **Do larger compounds improve regularity?**
   - More vertices = more hull candidates = potentially better fit?
   - Or does adding vertices just add noise?

4. **Can Janus polarity (4D±) break the regularity barrier?**
   - The discrete ± state adds asymmetry beyond 3D geometry
   - May enable configurations impossible in standard 3D

### A Note on Defeat and Discovery

The gap between "n-hull" and "regular n-gon" is real. Our projections are **distorted shadows**, not perfect polygons. But consider:

1. **Penrose tilings** also produce "impossible" 5-fold patterns through projection—they're not regular pentagons either, but they're mathematically profound.

2. **The Gauss-Wantzel barrier** remains unbroken in 2D. Our projections don't construct regular primes; they **reveal prime structure** hidden in higher-dimensional geometry.

3. **The search continues**: Every prime hull we find opens a family of multiples. Every compound we test narrows the parameter space. The path to 17-gon, 19-gon, and beyond is systematic, not random.

The truncated tetrahedron's Quadray rationality, the spread-based rotation framework, and the compound polyhedra strategy all suggest we've found a **method**, not just isolated results. The method deserves further exploration.

---

---

## Session Findings: 2026-02-07 (RESOLVED via Project-Streamline)

### Problem (Historical)

After 48+ hours debugging the prime projection pipeline, we discovered discrepancies between Python search results and JavaScript implementation due to different vertex constructions.

### Solution: Project-Streamline

**RESOLVED** by creating a unified single source of truth:

1. **Port JavaScript to Python** (not the other way around)
   - `scripts/rt_math.py` - Direct port of `modules/rt-math.js` RT functions
   - `scripts/rt_polyhedra.py` - Exact vertex copies from `modules/rt-polyhedra.js`
   - `scripts/prime_search_streamlined.py` - Unified search script

2. **Key Insight**: JavaScript definitions are battle-tested; Python should match them exactly

3. **Verified Results** (all four primes confirmed 2026-02-08 with base polyhedra):
   - 5-gon, 7-gon, 11-gon, and 13-gon all produce correct hull counts
   - Old spreads for 7/11/13-gon (found with Quadray compound vertices) were ALL broken after compound removal
   - Re-searched all three at precision 2, updated `PROJECTION_PRESETS` with new verified spreads
   - Spread values from Python work directly in JavaScript (same vertex definitions)
   - No translation or swap required

### Files Created

| File | Purpose |
|------|---------|
| `scripts/rt_math.py` | RT functions ported from rt-math.js |
| `scripts/rt_polyhedra.py` | Polyhedra vertices ported from rt-polyhedra.js |
| `scripts/prime_search_streamlined.py` | Unified search script |
| `prime_projections_verified.json` | All verified projections |

See `Geometry Documents/Project-Streamline.md` for full documentation.

---

## References

- Wildberger, N.J. "Divine Proportions" Chapter 14 (Spread Polynomials)
- Gauss-Wantzel Theorem on constructible polygons
- `modules/rt-math.js` - RT.StarSpreads, RT.PurePhi, RT.PureCubics, RT.QuadrayRotation
- `Geometry Documents/Prime-Projection-Conjecture.tex` - 4D± Prime Projection Whitepaper
