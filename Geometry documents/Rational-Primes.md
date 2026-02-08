# Rational Prime Polygons: Beyond Gauss-Wantzel

> **The premise**: Gauss-Wantzel tells us which regular n-gons are constructible with compass and straightedge. It does NOT tell us which n-gons can emerge from rational projections of algebraically-defined polyhedra. Our prime polygon projections (5, 7, 11, 13) demonstrate a completely different pathway to prime polygons — one that uses spreads, quadrances, and algebraic identities rather than transcendental functions.

---

## The Showcase: 5-gon and 7-gon at s = 1/2

The strongest evidence that this approach has algebraic depth:

| Prime | Viewing Spread | Rational Form | Rotation Matrix Entries | Polyhedron |
|-------|---------------|---------------|------------------------|------------|
| **5** | s₂ = 0.5 | **1/2** (exact) | √(1/2) = √2/2 (cached in `RT.PureRadicals`) | TruncTet (12v) |
| **7** | s₃ = 0.5 | **1/2** (exact) | √(1/2) = √2/2 (cached in `RT.PureRadicals`) | TruncTet+DualTet (16v) |

Both primes emerge at **the same rational spread**: s = 1/2. This is not a coincidence we can ignore.

- The spread 1/2 is exactly representable in IEEE 754 — zero floating-point error
- The rotation matrix entries are algebraic in √2, already cached in `RT.PureRadicals.sqrt2Values.half`
- The source polyhedra have integer Quadray coordinates: TruncTet = `(2,1,0,0)/3`, DualTet = `(±1,±1,±1)`
- The entire pipeline from vertex definition through projection is algebraic — no transcendentals

This means the 5-gon and 7-gon projections are **already RT-pure** in practice. The pipeline uses only:
- Integer/rational vertex coordinates
- A rational spread (1/2)
- Algebraic rotation entries (√2/2)
- Linear projection (dot products)
- Convex hull (cross products of algebraic numbers)

No sin, cos, tan, or π appears anywhere in the chain.

---

## The Historical Argument

As Wildberger argues in *Divine Proportions* and Barbour in his work on absolute geometry: the reason mathematics papers over geometric relationships with sin/cos/tan is historical, not mathematical. The Greeks developed geometry without algebra — they had no notation for equations, no concept of variables, no polynomial theory. When Islamic and European mathematicians inherited Greek geometry, they grafted algebraic methods onto it, but kept the fundamentally transcendental framework (circular functions, π, angular measure).

Rational Trigonometry reverses this: it starts from **algebraic** foundations (quadrance, spread) and recovers all of classical geometry without ever introducing transcendentals. The Gauss-Wantzel theorem is stated in terms of compass-and-straightedge constructibility — a framework rooted in Greek geometric constraints. It tells us what can be done with those specific tools. It says nothing about what algebraic projections can achieve.

**Our claim**: Prime n-gons (7, 11, 13, ...) that are "impossible" under Gauss-Wantzel emerge naturally as projections of algebraically-defined 3D polyhedra at rational viewing spreads. This is not a bypass or a hack — it is a genuinely different mathematical pathway that becomes visible only when you abandon the transcendental framework.

---

## Three Pathways to a Fully Rational Pipeline

### Current State

The search-to-render pipeline currently works but is not fully rationalized:

```
Python Search (Float64)              JavaScript Rendering (Float32)
───────────────────────────          ──────────────────────────────
Grid search over decimal spreads     Apply spreads to rotation matrix
→ count hull vertices                → project polyhedron vertices
→ rank by regularity                 → render convex hull
```

The 5-gon and 7-gon are already effectively rational (s=1/2). The 11-gon and 13-gon use decimal spreads (0.34, 0.54, 0.2) and (0.96, 0.99, 0.99) — found by brute-force grid search, not algebraic derivation.

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

**Implementation**: Modify `generate_spread_grid()` in `prime_search_streamlined.py` to emit rationals with specified denominators. Small code change, potentially deep mathematical results.

**Key question this answers**: Do prime hulls exist at "nice" rational spreads, or do they inherently require "messy" ones? If the former, the pipeline is naturally rational. If the latter, that itself is a Gauss-Wantzel-like impossibility result for the projection pathway.

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

**Implementation**: Add a `--exact` flag to `prime_search_streamlined.py` that uses `Fraction`-based arithmetic for the hull computation. Combined with Path A (rational spreads), this gives exact integer cross products.

**What this proves**: When the search reports hull=7 at s=1/2, it's not "7 within floating-point tolerance" — it's mathematically 7. Period. This is the standard of proof that a mathematical claim about prime polygons requires.

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
- `truncatedTetrahedron()` — 12 vertices, Cartesian (integer at half_size=3)
- `dualTetrahedron()` — 4 vertices, integer (±1, ±1, ±1)
- `compoundTruncTetDualTet()` — 16 vertices, unit-sphere normalized
- `compoundTruncTetIcosa()` — 24 vertices for 11/13-gon

**Python (`scripts/`)**:
- `rt_math.py` — direct port of JS RT functions including `project_to_plane()`
- `rt_polyhedra.py` — direct port of JS polyhedra with identical vertex definitions
- `prime_search_streamlined.py` — grid search with regularity scoring

**Visualization (`modules/rt-projections.js`, `rt-prime-cuts.js`)**:
- `PROJECTION_PRESETS` registry — single source of truth for all presets
- Floating modal from Math Demos menu — 4 preset buttons
- Yellow hull / cyan ideal / green rays visualization

All of this infrastructure was designed for rational computation. The irony is that the prime projection search — the most mathematically novel feature — is currently the least rational part of the system.

---

## The Goal

**Immediate**: Determine whether 11-gon and 13-gon projections exist at "nice" rational spreads (Path A). This is a targeted search that could run in hours and answer a fundamental question.

**Medium-term**: Port the Quadray rotation framework to Python (Path B) and add exact arithmetic hull counting (Path C). This creates a provably correct, algebraically exact search pipeline.

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
