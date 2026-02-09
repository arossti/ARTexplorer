# Rational Prime Polygons: Beyond Gauss-Wantzel

> **The premise**: Gauss-Wantzel tells us which regular n-gons are constructible with compass and straightedge. It does NOT tell us which n-gons can emerge from rational projections of algebraically-defined polyhedra. Our prime polygon projections (5, 7, 11, 13) demonstrate a completely different pathway to prime polygons — one that uses spreads, quadrances, and algebraic identities rather than transcendental functions.

---

## Path A Results: All Four Primes at Rational Spreads

**Confirmed 2026-02-08** via `prime_search_streamlined.py --rational` (Tiers 1–3).

All four prime polygon projections exist at algebraically significant rational spreads:

| Prime | Rational Spreads | Tier | Denominators | Regularity | Radical Family |
|-------|-----------------|------|--------------|------------|----------------|
| **5** | **(0, 1/2, 0)** | 1 | {2} | 0.423 | √2 |
| **7** | **(1/2, 1/2, 1/2)** | 1 | {2} | 0.861 | √2 |
| **11** | **(3/4, 1/4, 1/2)** | 1 | {2, 4} | 0.490 | √2, √3 |
| **13** | **(9/10, 24/25, 19/20)** | 3 | {10, 25, 20} | 0.346 | √5 family |

### The Showcase: 5, 7, and 11 at Tier 1

The 5-gon, 7-gon, and 11-gon all emerge at **Tier 1 rationals** — denominators from {2, 3, 4} only. Their rotation matrices require only √2 and √3, both cached in `RT.PureRadicals`.

**7-gon at s = (1/2, 1/2, 1/2)** is the most elegant result: all three spreads identical, the rotation matrix is pure √2/2 throughout. Regularity 0.861, significantly better than the previous (0, 0, 0.5) at 0.757.

**11-gon at s = (3/4, 1/4, 1/2)** is the surprise. Gauss-Wantzel says the 11-gon is non-constructible, yet it emerges from the simplest possible rational spreads — the same √2/√3 family as the 5-gon and 7-gon. The rotation matrix entries are:
- √(1/4) = 1/2, √(3/4) = √3/2 — exact, cached
- √(1/2) = √2/2 — exact, cached

Alternative 11-gon results at higher tiers with better regularity:
- s = (1/3, 1/2, 1/4) — Tier 1, reg=0.487
- s = (1/2, 9/20, 1/3) — Tier 3, reg=0.504 (nearly matches decimal search best of 0.505)

### 13-gon: Requires Tier 2+

The 13-gon does not appear at Tier 1 rationals but emerges at:
- **Tier 2**: s = (4/5, 9/10, 9/10) — reg=0.301, denominators {5, 10}
- **Tier 3**: s = (9/10, 24/25, 19/20) — reg=0.346, close to decimal best of 0.352

This is itself a meaningful result: the 13-gon requires the √5 (golden ratio) family of radicals, while 5, 7, and 11 need only √2 and √3.

### Key Properties

- The spread 1/2 is exactly representable in IEEE 754 — zero floating-point error
- The rotation matrix entries are algebraic in √2, √3, √5 — all cached in `RT.PureRadicals`
- The source polyhedra have integer Quadray coordinates: TruncTet = `(2,1,0,0)/3`, DualTet = `(±1,±1,±1)`
- The entire pipeline from vertex definition through projection is algebraic — no transcendentals

No sin, cos, tan, or π appears anywhere in the chain.

### 5-gon Geometric Invariant

**Discovered 2026-02-08**: The truncated tetrahedron's 5-gon projection is a **geometric invariant** — every single 5-gon hit across both Tier 3 rational (53 hits) and decimal precision-2 (70 hits) searches produces **identical geometry**:

- **Regularity**: 0.4231 (invariant)
- **Angle variance**: 20.02° (invariant)
- **Edge variance**: 32.71% (invariant)
- **3 distinct angles**: 70.5°, 109.5°, 125.3° (regular pentagon = 108.0°)
- **3 distinct edge lengths**: 0.8165, 0.9428, 1.6330

Not one result is better or worse — whichever 5 vertices land on the hull, they always form the same shape. The s2 parameter is often free (many hits at s=(1/2, *, 1)), confirming this is a structural property of the TruncTet's Td symmetry, not an optimizable parameter.

**The truncated tetrahedron alone cannot produce an equiangular pentagon.**

### Variable Stella Octangula Search

**Tested 2026-02-08** via `prime_search_streamlined.py --stella --rational 2`.

To search beyond the TruncTet alone, we implemented a **variable stella octangula compound**: two independently truncated tetrahedra (base + dual) with parameters `(t1, t2)`, unit-sphere normalized. This creates a family of even-vertex polyhedra:

| (t1, t2) | Vertices | Description |
|-----------|----------|-------------|
| (0, 0) | 4+4 = **8** | Raw stella octangula |
| (1/3, 0) | 12+4 = **16** | Current 7-gon compound |
| (1/4, 5/12) | 12+12 = **24** | Asymmetric double truncation |
| (1/3, 1/3) | 12+12 = **24** | Symmetric double truncation |
| (1/2, 1/2) | 6+6 = **12** | Double octahedron limit |

Key insight: vertex counts are always **even** — "finding primes from non-primes."

**Results** (Tier 2 rational, 246,924 configurations):

| Prime | Best from Stella | Reg | vs Current Best | Genuine? |
|-------|-----------------|-----|-----------------|----------|
| **5** | t=(0,0) 8v, s=(3/8, 5/8, 1) | 0.278 | Worse (0.423 from TruncTet) | Yes |
| **7** | t=(1/3,0) 16v, s=(9/10, 1/3, 3/5) | 0.877 | Better (was 0.861) | **Yes** |
| **11** | t=(1/4,5/12) 24v, s=(1/2, 0, 1/3) | 0.591 | — | **No** (180° vertex) |
| **13** | t=(1/3,5/12) 24v, s=(7/8, 7/8, 9/10) | 0.280 | Worse (0.346 from TruncTet+Icosa) | Mixed |

**Critical finding**: ALL stella 11-gon results have a **degenerate 180° interior angle** — a collinear point the hull algorithm kept due to floating-point. These are actually 10-gons, not genuine 11-gons. The TruncTet+Icosa compound was the only genuine source of 11-gon and 13-gon projections — until the single-polyhedra search (see below).

**7-gon improvement**: The stella search found s=(9/10, 1/3, 3/5) at reg=0.877, slightly better than our current s=(1/2, 1/2, 1/2) at reg=0.861. However, the new spreads are Tier 2 (denominator 10), while the current result is Tier 1. This is a regularity-vs-algebraic-simplicity trade-off.

**Implementation**: `variable_stella_compound(t1, t2)` in `rt_polyhedra.py`; `--stella` flag in `prime_search_streamlined.py`. Searches over `(t1, t2, s1, s2, s3)` with configurable truncation and spread grids.

### Single-Polyhedra Prime Search (Path C Exact)

**Tested 2026-02-08** via `prime_search_streamlined.py --poly ... --exact --rational 1`.

A more elegant result than compound polyhedra: finding prime polygon hulls from **single, non-compound rational polyhedra**. No combining two polyhedra to break symmetry — just one algebraically-defined solid, viewed at a rational spread angle, producing a prime hull.

Four new search polyhedra, all in the √2 radical family (no golden ratio):

| Polyhedra | Vertices | Radical Family | Vertex-Transitive |
|-----------|----------|----------------|-------------------|
| Cuboctahedron | 12 | √2 | Yes |
| Rhombic Dodecahedron | 14 | √2 | No (2 orbits) |
| Geodesic Tet freq=2 | 10 | √2, √3 | Yes (on sphere) |
| Geodesic Oct freq=2 | 18 | √2 | Yes (on sphere) |

**Results** (Tier 1 rational, `--exact`, all four polyhedra × primes 5/7/11/13):

| Prime | Source | Best Spreads | Reg | Hits | Note |
|-------|--------|-------------|-----|------|------|
| **7** | Rhombic Dodecahedron (14v) | (1/2, 1/3, 1) | 0.521 | 3 | Single solid, √2 only |
| **7** | Cuboctahedron (12v) | (1/3, 2/3, 1/4) | 0.421 | 7 | Vector Equilibrium! |
| **7** | Geodesic Tet freq=2 (10v) | (0, 1/3, 1/3) | 0.419 | 97 | Richest source |
| **11** | Geodesic Oct freq=2 (18v) | **(1/3, 3/4, 3/4)** | 0.354 | 1 | **√2 only — no φ!** |

**Key findings**:

1. **11-gon from a single geodesic octahedron** at Tier 1 rational spreads. This is the first 11-gon that requires only √2 radicals — the TruncTet+Icosa compound needed √5 (golden ratio). The geodesic octahedron is purely rational (vertices at permutations of (±1, 0, 0) projected to sphere).

2. **7-gon from 10 vertices** (geodesic tet). The geodesic tetrahedron at frequency 2 has only 10 vertices — the fewest of any source — yet produces 97 heptagon hits at Tier 1 rationals. Finding primes from non-primes: 10 is even, yet the hull is prime.

3. **No 5-gon or 13-gon** from these polyhedra at Tier 1. Higher tiers and frequencies may reveal them. The 5-gon may require truncation structure (the TruncTet's hexagonal faces naturally create pentagons under projection). The 13-gon may need more vertices (geodesic oct freq=3 has 38v).

**The elegance argument**: A single, rationally-constructed polyhedron viewed at a rational angle producing a prime polygon is far more compelling than a compound polyhedron engineered to break symmetry. The cuboctahedron (Fuller's "Vector Equilibrium") producing heptagons at Tier 1 spreads connects prime projections directly to the most fundamental polyhedron in Synergetics.

**Next**: Tier 2/3 searches, higher geodesic frequencies (freq=3,4), and verification that the geodesic oct 11-gon is not degenerate (no 180° angles).

---

## Workplan: Math Demo Buttons + Prime Leaderboard

### Concept

The Math Demo floating panel (`PROJECTION_PRESETS` in `rt-prime-cuts.js`) currently has 4 buttons: 5-gon, 7-gon, 11-gon, 13-gon. All use compound polyhedra (TruncTet alone or TruncTet+DualTet/Icosa). The single-polyhedra search has found new results from geodesics, cuboctahedron, and rhombic dodecahedron that should be added as **additional preset buttons** alongside the existing ones.

The **Leaderboard** tracks the best result for each prime across all sources, ranked by regularity and elegance:

### Prime Polygon Leaderboard (Verified — degeneracy-checked)

**Degeneracy**: A hull vertex at 180° interior angle contributes nothing geometrically. All results below are verified non-degenerate (max angle < 179°) via Path C exact arithmetic.

| Prime | Best Source | Type | V | Spreads | Reg | Max∠ | Tier | Status |
|-------|-----------|------|---|---------|-----|------|------|--------|
| **5** | Trunc Tetrahedron | Single | 12 | (0, 1/2, 0) | 0.423 | 144° | 1 | CLEAN |
| **7** | TruncTet+DualTet | Compound | 16 | (1/2, 1/2, 1/2) | 0.861 | 136° | 1 | CLEAN |
| **7** | Geodesic Tet f=2 | **Single** | 10 | (0, 1/3, 1/3) | 0.419 | 152° | 1 | CLEAN |
| **11** | TruncTet+Icosa | Compound | 24 | (3/4, 1/4, 1/2) | 0.490 | 165° | 1 | CLEAN |
| **11** | Geodesic Tet f=4 | **Single** | 34 | (3/4, 1/3, 1/3) | 0.432 | 170° | 1 | CLEAN |
| **11** | Geodesic Tet f=3 | **Single** | 20 | (1/4, 1/4, 1/2) | 0.239 | 170° | 1 | CLEAN |
| **13** | Geodesic Tet f=4 | **Single** | 34 | (1/2, 3/4, 3/4) | 0.448 | 173° | 1 | CLEAN |
| **13** | Geodesic Tet f=4 | **Single** | 34 | (1/3, 2/3, 3/4) | 0.443 | 171° | 1 | CLEAN |
| **13** | TruncTet+Icosa | Compound | 24 | (9/10, 24/25, 19/20) | 0.346 | 179° | 3 | BORDERLINE |

**Breakthrough (freq=4 search)**: The geodesic tetrahedron at frequency 4 (34 vertices) produces the **first single-polyhedra 13-gon** at Tier 1 with reg=0.448 — beating the compound result (Tier 3, reg=0.346, borderline 179°) in every metric. The 13-gon at s=(1/2, 3/4, 3/4) uses only √2 radicals, same family as the 5-gon and 7-gon.

#### Degenerate Results (180° — excluded from leaderboard)

These hull counts are mathematically correct (Path C exact cross product is positive but ~1e-17) but geometrically meaningless — one or more vertices lie exactly on the line between their neighbors.

| Prime | Source | Spreads | Hull | Max∠ | Note |
|-------|--------|---------|------|------|------|
| 7 | Cuboctahedron | (1/3, 2/3, 1/4) | 7 | 180° | Central symmetry artifact |
| 7 | Rhombic Dodec | (1/2, 1/3, 1) | 7 | 180° | ALL rhombic dodec 7-gons degenerate |
| 11 | Geodesic Oct f=2 | (1/3, 3/4, 3/4) | 11 | 180° | ALL geodesic oct f=2 11-gons degenerate |

**Key insight**: Centrally symmetric polyhedra (cuboctahedron, rhombic dodecahedron, geodesic octahedron) produce exclusively degenerate odd-gon projections. Only the **asymmetric geodesic tetrahedron** yields clean single-poly primes — this is the Symmetry Barrier in action. The geodesic tet inherits the tetrahedron's lack of central symmetry, which is precisely what allows odd hull counts to emerge cleanly.

**Elegance ranking** (most to least compelling):
1. Single polyhedra at Tier 1 > Single at Tier 2+ > Compound at Tier 1 > Compound at Tier 2+
2. Fewer vertices > more vertices (7 from 10v geodesic tet is more elegant than 7 from 16v compound)
3. √2-only > √2+√3 > √5/φ (simpler radical family)
4. **Non-degenerate only** — 180° hull vertices disqualify results from the leaderboard

### Implementation Steps

#### Phase 1: Verify + Run Extended Searches

Before adding buttons, complete the search catalogue:

1. **Verify geodesic oct 11-gon** — confirm no 180° interior angle at s=(1/3, 3/4, 3/4)
2. **Search Tier 2/3** — run `--poly cuboctahedron,rhombicdodec,geodtet,geodoct --rational 2 --exact` and `--rational 3`
3. **Search higher geodesic frequencies** — `--freq 3` (geodtet=20v, geodoct=38v) and `--freq 4` (34v, 66v)
4. **Hunt 5-gon and 13-gon** from single polyhedra — the missing gaps in the leaderboard
5. **Rank all results** by regularity AND equiangularity (max interior angle, angle variance)

#### Phase 2: Add New Preset Entries to `rt-prime-cuts.js`

For each single-polyhedra result that passes verification (no degenerate angles), add a new `PROJECTION_PRESETS` entry. The existing infrastructure already supports this — buttons are built dynamically from the registry.

New presets (pending search completion):

```
PROJECTION_PRESETS = {
  pentagon:    { ... },  // existing — TruncTet (single, only source)
  heptagon:    { ... },  // existing — TruncTet+DualTet compound (best regularity)
  hendecagon:  { ... },  // existing — TruncTet+Icosa compound (best regularity)
  tridecagon:  { ... },  // existing — TruncTet+Icosa compound (only source)

  // --- NEW: Single-polyhedra presets ---
  heptagonRhombicDodec: {
    name: "Heptagon (Rhombic Dodec)",
    n: 7,
    polyhedronType: "primeRhombicDodec",
    polyhedronCheckbox: "showPrimeRhombicDodec",
    compound: "rhombicDodecahedron",
    vertexCount: 14,
    spreads: [0.5, 1/3, 1.0],
    ...
  },
  heptagonGeodesicTet: {
    name: "Heptagon (Geodesic Tet)",
    n: 7,
    polyhedronType: "primeGeodesicTet",
    polyhedronCheckbox: "showPrimeGeodesicTet",
    compound: "geodesicTetrahedron",
    vertexCount: 10,
    spreads: [0, 1/3, 1/3],
    ...
  },
  hendecagonGeodesicOct: {
    name: "Hendecagon (Geodesic Oct)",
    n: 11,
    polyhedronType: "primeGeodesicOct",
    polyhedronCheckbox: "showPrimeGeodesicOct",
    compound: "geodesicOctahedron",
    vertexCount: 18,
    spreads: [1/3, 0.75, 0.75],
    ...
  },
}
```

#### Phase 3: Wire New Polyhedra Groups in Rendering Pipeline

For each new preset, add to the rendering pipeline following the established pattern:

1. **`rt-rendering.js`**: Declare new THREE.Group (e.g. `primeRhombicDodecGroup`), initialize in scene setup, add rendering logic in update loop using existing `Polyhedra.rhombicDodecahedron()`, `Polyhedra.geodesicTetrahedron()`, `Polyhedra.geodesicOctahedron()`
2. **`rt-ui-binding-defs.js`**: Add checkbox-controls binding for new checkbox IDs
3. **`rt-init.js`**: Projection candidates whitelist already includes `"rhombicDodecahedron"` and types starting with `"geodesic"` — no changes needed
4. **`rt-prime-cuts.js`**: Add disable/enable logic in `_applyPresetFromPanel()` for new checkbox IDs

All JS polyhedra functions already exist: `Polyhedra.cuboctahedron()`, `Polyhedra.rhombicDodecahedron()`, `Polyhedra.geodesicTetrahedron()`, `Polyhedra.geodesicOctahedron()`. No new math code required.

#### Phase 4: Update Panel UI

The floating panel currently uses a 2-column grid for 4 buttons. With ~7 buttons, consider:

- **Sectioned layout**: "Compound" section (existing 4) + "Single Polyhedra" section (new 3+)
- **Color coding**: Green=constructible (5-gon), Red/Yellow=non-constructible compound, Blue=single-polyhedra
- **Tooltip**: Show source polyhedron, vertex count, regularity, and radical family on hover
- **Leaderboard star**: Mark the best result for each prime with a star/crown indicator

#### Phase 5: Extended Search Programme

Ongoing searches to fill gaps in the leaderboard:

| Search | Command | Goal |
|--------|---------|------|
| Tier 2 all polys | `--poly all --rational 2 --exact` | Find 5-gon and 13-gon from single polyhedra |
| Geodesic freq=3 | `--poly geodtet,geodoct --freq 3 --rational 1 --exact` | More vertices = more prime opportunities |
| Geodesic freq=4 | `--poly geodtet,geodoct --freq 4 --rational 1 --exact` | 34v tet, 66v oct — rich hull landscapes |
| Cuboctahedron deep | `--poly cuboctahedron --rational 3 --exact --primes 5,11,13` | Fuller's VE producing all primes? |
| All primes 17,19,23 | `--poly all --rational 1 --exact --primes 17,19,23` | Beyond the initial four |

### Success Criteria

The workplan is complete when:
- [ ] Every prime 5, 7, 11, 13 has at least one single-polyhedra result in the leaderboard (or is proven to require compounds)
- [ ] All leaderboard results are verified with `--exact` (no degenerate 180° angles)
- [ ] New preset buttons appear in the Math Demo panel for the best single-polyhedra results
- [ ] The panel visually distinguishes compound vs single-polyhedra sources
- [ ] Results are documented in this file with complete search provenance

---

## The Historical Argument

As Wildberger argues in *Divine Proportions* and Barbour in his work on absolute geometry: the reason mathematics papers over geometric relationships with sin/cos/tan is historical, not mathematical. The Greeks developed geometry without algebra — they had no notation for equations, no concept of variables, no polynomial theory. When Islamic and European mathematicians inherited Greek geometry, they grafted algebraic methods onto it, but kept the fundamentally transcendental framework (circular functions, π, angular measure).

Rational Trigonometry reverses this: it starts from **algebraic** foundations (quadrance, spread) and recovers all of classical geometry without ever introducing transcendentals. The Gauss-Wantzel theorem is stated in terms of compass-and-straightedge constructibility — a framework rooted in Greek geometric constraints. It tells us what can be done with those specific tools. It says nothing about what algebraic projections can achieve.

**Our claim**: Prime n-gons (7, 11, 13, ...) that are "impossible" under Gauss-Wantzel emerge naturally as projections of algebraically-defined 3D polyhedra at rational viewing spreads. This is not a bypass or a hack — it is a genuinely different mathematical pathway that becomes visible only when you abandon the transcendental framework.

---

## Three Pathways to a Fully Rational Pipeline

### Current State (Post–Path A)

Path A is **complete**. All four primes now use rational spreads in `PROJECTION_PRESETS`:

```
Python Search (Float64)              JavaScript Rendering (Float32)
───────────────────────────          ──────────────────────────────
--rational TIER grid search          Apply rational spreads to rotation matrix
→ count hull vertices                → project polyhedron vertices
→ rank by regularity                 → render convex hull (yellow hull / cyan ideal)
```

The pipeline is now algebraically rational for 5, 7, and 11 (Tier 1 spreads with √2/√3 radicals). The 13-gon uses Tier 3 rationals (√5 family). Paths B and C remain as future refinements.

### Path A: Search Over Algebraically Significant Rationals

**Goal**: Find prime projections at spreads with small-denominator rational values.

Instead of searching over `{0.00, 0.01, 0.02, ..., 1.00}` (precision=2), search over rationals `p/q` where q is drawn from algebraically significant denominators:

```
Tier 1 (RT-pure): q ∈ {2, 3, 4}
  → s = 0, 1/4, 1/3, 1/2, 2/3, 3/4, 1

Tier 2 (φ-rational): q ∈ {5, 8, 10}
  → s = 1/5, 2/5, 3/5, 4/5, 1/8, 3/8, 5/8, 7/8, ...

Tier 3 (algebraic): q ∈ {6, 9, 12, 16, 20, 25}
  → finer grid but still algebraically meaningful
```

**Why this matters**: A spread of 1/3 produces rotation matrix entries involving √(1/3) = √3/3 and √(2/3) = √6/3 — both expressible in cached radicals. A spread of 17/50 also works algebraically but requires √(17/50) and √(33/50), which have no natural caching.

If the 11-gon exists at s = (1/3, 1/2, 1/5) rather than (0.34, 0.54, 0.2), that's profoundly more meaningful — and the entire rotation pipeline becomes expressible in `RT.PureRadicals`.

**Implementation**: **DONE.** `generate_rational_spread_grid()` added to `prime_search_streamlined.py`. Usage: `--rational TIER` flag (1=RT-pure, 2=φ-rational, 3=algebraic). Results carry rational labels (e.g. "3/4") in JSON output.

**Key question answered**: YES — all four primes exist at nice rational spreads. 5, 7, and 11 at Tier 1 (denominators 2, 3, 4). 13 requires Tier 2+ (denominators 5, 10, 20, 25). This means the prime projection pipeline is naturally rational — not a numerical coincidence.

### Path B: Quadray-Native Projection

**Goal**: Eliminate Cartesian intermediaries entirely from the search.

We already have the building blocks:

| Component | Quadray Form | Status |
|-----------|-------------|--------|
| Tetrahedron | `(1,0,0,0)` — integer | Defined in `RT.QuadrayPolyhedra` |
| Truncated Tet | `(2,1,0,0)/3` — rational | Defined in `RT.QuadrayPolyhedra` |
| Basis vector spread | 8/9 — exact rational | Used throughout RT system |
| Rotation coefficients | F, G, H from spread | Defined in `RT.QuadrayRotation.fghCoeffsFromSpread()` |

The current pipeline converts Quadray → Cartesian → rotate → project. A Quadray-native pipeline would:

1. **Start in Quadray**: Use integer/rational WXYZ vertex coordinates
2. **Rotate in Quadray**: Apply F, G, H coefficients (algebraic in √s)
3. **Project in Quadray**: Define projection plane via Quadray basis vectors
4. **Convert to 2D only at the final step** (the "GPU boundary")

This preserves rationality through the entire geometric pipeline. The only irrationals introduced are √s (from the spread) and √3 (from Quadray-to-Cartesian conversion at the boundary) — both of which are algebraic, cached, and exact.

**Implementation**: Requires a new `quadray_project_to_plane()` function in `rt_math.py` that operates natively in WXYZ coordinates. The F, G, H rotation framework is already defined in JavaScript (`rt-math.js:QuadrayRotation`); it needs porting to Python.

**What this unlocks**: A search where vertices never leave rational Quadray space until the final 2D projection. Combined with Path A (rational spreads), the entire pipeline becomes: **rational vertices × algebraic rotation → algebraic 2D points → exact hull**.

### Path C: Exact Arithmetic Hull Computation

**Goal**: Eliminate all floating-point ambiguity from hull counting.

The convex hull cross product `(a-o) × (b-o)` determines whether three points are collinear (=0), left turn (>0), or right turn (<0). In floating-point, "nearly zero" cross products cause the bugs we've seen (the same-parity tet degeneracy, Float32 vs Float64 discrepancies).

For vertices that are rational or algebraic, the cross product can be computed **exactly**:

- If vertices are `(p₁/q₁, p₂/q₂)` with integer p, q, multiply through by denominators
- The cross product becomes an integer expression — exactly zero or not
- No floating-point comparison, no epsilon tolerance, no "nearly collinear" ambiguity

Python's `fractions.Fraction` provides this for free. The search would be slower but **provably correct** — every hull count would be mathematically exact.

**Implementation**: **DONE.** `convex_hull_2d_exact()` in `rt_math.py` uses `Fraction(float)` to convert Float64 projected coordinates to their exact IEEE 754 rational representations, then computes cross products with arbitrary-precision integer arithmetic. The `--exact` flag in `prime_search_streamlined.py` activates this for any search mode.

**What this proves**: When the search reports hull=7 at s=1/2 with `--exact`, the cross products are computed with unlimited precision. Points that are exactly collinear in Float64 produce cross=0 (exactly), and are deterministically excluded. No epsilon, no platform-dependent rounding — the hull count is provably correct within the Float64 projection.

---

## Established Infrastructure

We are not starting from scratch. The ARTexplorer codebase already provides:

**JavaScript (`modules/rt-math.js`)**:
- `RT.PureRadicals` — cached √2, √3, √6 with derived identities
- `RT.PurePhi` — symbolic golden ratio algebra `(a + b√5)/c`
- `RT.PureCubics` — cached cubic solutions for 7-gon and 9-gon
- `RT.StarSpreads` — exact star spreads for constructible n-gons
- `RT.QuadrayRotation` — F, G, H rotation coefficients from spread
- `RT.QuadrayPolyhedra` — integer/rational Quadray vertex definitions

**JavaScript (`modules/rt-polyhedra.js`)**:
- `truncatedTetrahedron()` — 12 vertices, parametric truncation t ∈ [0, 0.5]
- `truncatedDualTetrahedron()` — 12 vertices, parametric truncation (negated)
- `dualTetrahedron()` — 4 vertices, integer (±1, ±1, ±1)
- `compoundTruncTetDualTet()` — 16 vertices, unit-sphere normalized
- `compoundTruncTetIcosa()` — 24 vertices for 11/13-gon

**Python (`scripts/`)**:
- `rt_math.py` — direct port of JS RT functions including `project_to_plane()`
  - `convex_hull_2d_exact()` — **Path C** exact Fraction-based hull (no FP ambiguity)
- `rt_polyhedra.py` — direct port of JS polyhedra with identical vertex definitions
  - `variable_stella_compound(t1, t2)` — variable stella octangula with independent truncation
  - `truncated_dual_tetrahedron()` — port of JS `truncatedDualTetrahedron()`
  - `cuboctahedron()` — 12 vertices, √2 only, vertex-transitive
  - `rhombic_dodecahedron()` — 14 vertices, √2 only, non-vertex-transitive
  - `geodesic_tetrahedron(freq)` — subdivided tet projected to sphere (10/20/34/52/74v)
  - `geodesic_octahedron(freq)` — subdivided oct projected to sphere (18/38/66/102v)
  - `subdivide_triangles()` — barycentric geodesic subdivision (Fuller frequency notation)
- `prime_search_streamlined.py` — grid search with regularity scoring
  - `--stella` flag: 5-parameter search over `(t1, t2, s1, s2, s3)`
  - `--rational TIER`: algebraically significant spread grid
  - `--poly NAME,...`: search any polyhedron for any prime (cuboctahedron, rhombicdodec, geodtet, geodoct, etc.)
  - `--exact`: **Path C** exact hull computation
  - `--freq N`: geodesic subdivision frequency (default 2)

**Visualization (`modules/rt-projections.js`, `rt-prime-cuts.js`)**:
- `PROJECTION_PRESETS` registry — single source of truth for all presets
- Floating modal from Math Demos menu — 4 preset buttons
- Yellow hull / cyan ideal / green rays visualization

All of this infrastructure was designed for rational computation. The irony is that the prime projection search — the most mathematically novel feature — is currently the least rational part of the system.

---

## Design Decision: Graham Scan Collinearity

**Discovered 2026-02-08** while testing cuboctahedron and rhombic dodecahedron projections.

### The Problem

The Graham scan convex hull algorithm (`_computeConvexHull2D()` in `rt-projections.js`) uses `cross <= 0` to exclude collinear points from the hull:

```javascript
const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
if (cross <= 0) hull.pop();  // Excludes collinear points
```

For vertex-transitive polyhedra like the cuboctahedron, some projected vertices land exactly on hull edges (mathematically collinear). Under Float32 arithmetic, some of these collinear points produce `cross ≈ 0` with sign depending on rounding — creating **inconsistent hull counts**.

**Cuboctahedron Z-axis projection example:**
- 12 vertices → 8 unique 2D points: 4 corners at (±t, ±t) + 4 edge midpoints at (±t, 0), (0, ±t)
- Edge midpoints are mathematically collinear with the square hull edges (u + u = t exactly)
- Float32: 2 of 4 midpoints appear non-collinear → **6-gon** instead of expected 4-gon or 8-gon
- Visually: "stray rays" that don't connect to the hull outline

### Implications for Prime Polygon Searches

When expanding searches to geodesic and Archimedean solids (Geodesic Tet, Geodesic Oct, Cuboctahedron, Rhombic Dodecahedron), the collinearity handling directly affects hull vertex counts — the very metric we use to identify prime polygons.

Three options:

| Option | Behavior | Effect on Hull Count |
|--------|----------|---------------------|
| `cross <= 0` (current) | Exclude collinear | Float32-dependent, inconsistent |
| `cross < -ε` (tolerance) | Include near-collinear | Consistent but adds "false" vertices |
| `cross < 0` (strict left-turn) | Include collinear | Deterministic but inflates counts |

**Recommendation**: Path C (exact arithmetic) resolves this definitively — integer cross products are exactly zero or not. For Float32/64 searches, the current `cross <= 0` is acceptable as long as results are validated with exact arithmetic.

### Vertex Transitivity Matters

Not all polyhedra behave the same under projection:

- **Vertex-transitive** (Platonic solids, Cuboctahedron): All vertices equidistant from origin → all project to hull boundary → collinearity is the main ambiguity source
- **Non-vertex-transitive** (Rhombic Dodecahedron): Vertices at different radii → some project to hull interior → these are geometrically legitimate interior points, not algorithm artifacts

When selecting search polyhedra, vertex transitivity determines whether interior projected points indicate a genuine geometric property or a collinearity algorithm issue. The Rhombic Dodecahedron's two vertex orbits (6 axial at radius r, 8 cuboid at radius r√3/2) will always produce interior projections regardless of hull algorithm — this is geometry, not numerics.

---

## The Goal

**Immediate**: ~~Determine whether 11-gon and 13-gon projections exist at "nice" rational spreads (Path A).~~ **DONE** — yes, they do. See results table above. ~~Path C exact hull.~~ **DONE** — `--exact` flag with `fractions.Fraction`.

**Medium-term**: ~~Search single rational polyhedra for prime projections.~~ **IN PROGRESS** — 11-gon found from geodesic octahedron (√2 only), 7-gon from cuboctahedron/rhombic dodec/geodesic tet. Need Tier 2/3 and higher geodesic frequencies for 5-gon and 13-gon. Port the Quadray rotation framework to Python (Path B).

**Ultimate**: Establish that prime n-gon projections from algebraically-defined polyhedra at rational spreads constitute a **general method** — not isolated numerical coincidences. If prime hulls consistently emerge at rational spreads from integer-coordinate polyhedra, this is a new theorem-class result: *prime polygons exist as rational projections of tetrahedral compounds*.

This would offer the mathematical community a genuinely novel pathway to prime polygons — one that doesn't require compass and straightedge, doesn't require transcendental functions, and doesn't violate Gauss-Wantzel (because it operates in a different mathematical framework entirely). Just as Penrose tilings revealed "impossible" 5-fold symmetry through higher-dimensional projection, our prime projections reveal "non-constructible" prime polygons through rational-spread viewing angles of algebraic polyhedra.

The Greeks didn't have algebra. We do.

---

## References

- Wildberger, N.J. *Divine Proportions: Rational Trigonometry to Universal Geometry* (2005)
- Barbour, J. *The Discovery of Dynamics* — on Greek geometric foundations
- Gauss, C.F. *Disquisitiones Arithmeticae* (1801) — constructibility of regular polygons
- `Geometry documents/Polygon-Rationalize.md` — detailed workplan and search history
- `Geometry documents/Prime-Projection-Conjecture.tex` — 4D± projection whitepaper
- `modules/rt-math.js` — RT library with PurePhi, PureRadicals, PureCubics, QuadrayRotation
