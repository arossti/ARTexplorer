# RT-Polygon-Generator Workplan

## Overview

This workplan rationalizes n-gon generation in ARTExplorer using Wildberger's Rational Trigonometry treatment of **Regular Stars and Polygons** (Divine Proportions, Chapter 14, pp. 159-166).

### Current State (rt-polyhedra.js)

The current `Polyhedra.polygon()` implementation uses classical trigonometry:
```javascript
// Current: Classical trig approach
const centralAngle = Math.PI / n;
const spread = Math.pow(Math.sin(centralAngle), 2);  // spread from sin²
const angle = (2 * Math.PI * i) / n;
vertices.push(new THREE.Vector3(R * Math.cos(angle), R * Math.sin(angle), 0));
```

**Problem**: For arbitrary n, sin/cos are unavoidable. But for **algebraically constructible** polygons (n = 3, 4, 5, 6, 8, 10, 12...), we can use RT-pure methods.

### Existing RT Infrastructure (rt-math.js)

We already have powerful tools available:

| Namespace | Purpose | Key Methods |
|-----------|---------|-------------|
| `RT.PurePhi` | Golden ratio algebra | `sqrt5()`, `value()`, `inverse()`, `squared()`, `cubed()`, `Symbolic` class |
| `RT.PureRadicals` | Cached radical constants | `sqrt2()`, `sqrt3()`, `sqrt6()`, `QUADRAY_GRID_INTERVAL` |
| `RT.spread()` | Spread between vectors | Measures perpendicularity (0-1) |
| `RT.quadrance()` | Distance squared | Avoids sqrt in calculations |
| `RT.circleParam()` | Rational circle points | Weierstrass parameterization |

---

## Part 1: Wildberger's Key Theorems

### 1.1 Regular Stars and Spread Sequences

From Chapter 14, a **regular star of order n** exists when the spread polynomial Sₙ(s) = 0 has valid spread number solutions.

**Critical Formula**: For a regular n-gon with circumradius quadrance Q:
```
Q(A₀, A₂ₖ) = 4·Sₖ(s)·Q
```
where s = spread between consecutive star lines, and Sₖ is the k-th spread polynomial.

### 1.2 The Polygon Triangle Theorem (Theorem 98, p.165)

For a regular n-gon constructed from a star with spread s and circumradius quadrance Q:

| Quantity | Formula |
|----------|---------|
| **Edge quadrance** R | R = Q(A₀,A₂) = 4sQ |
| **Diagonal quadrance** D | D = Q(A₀,A₄) = 16s(1-s)Q |
| **Corner spreads** | s(A₀A₄,A₀A₂) = s |
| **Vertex spread** | s(A₂A₀,A₂A₄) = 4s(1-s) |

### 1.3 Exact Spread Values for Common n-gons

| n | Star Spread s | Spread Formula | Radical Required |
|---|---------------|----------------|------------------|
| 3 | 3/4 | s = 3/4 (exact rational!) | `RT.PureRadicals.sqrt3()` |
| 4 | 1/2 | s = 1/2 (exact rational!) | `RT.PureRadicals.sqrt2()` |
| 5 | (5+√5)/8 | s = (5+√5)/8 ≈ 0.9045 | `RT.PurePhi.sqrt5()` |
| 6 | 1/4 | s = 1/4 (exact rational!) | `RT.PureRadicals.sqrt3()` |
| 8 | (2-√2)/4 | Nested radicals | `RT.PureRadicals.sqrt2()` |
| 10 | (3-√5)/8 | Uses golden ratio | `RT.PurePhi.sqrt5()` |
| 12 | (2-√3)/4 | Uses √3 | `RT.PureRadicals.sqrt3()` |

---

## Part 2: Leveraging Existing RT Infrastructure

### 2.1 RT.PurePhi for Pentagon/Decagon

The existing `RT.PurePhi` namespace (lines 283-504 of rt-math.js) provides everything needed for pentagon geometry:

```javascript
// Already available:
RT.PurePhi.sqrt5()      // Cached √5 ≈ 2.2360679774997896
RT.PurePhi.value()      // φ = (1+√5)/2 ≈ 1.6180339887498948
RT.PurePhi.inverse()    // 1/φ = φ-1 ≈ 0.618033988749895
RT.PurePhi.squared()    // φ² = φ+1 (algebraic identity!)
RT.PurePhi.cubed()      // φ³ = 2φ+1 (algebraic identity!)
RT.PurePhi.fourthPower() // φ⁴ = 3φ+2 (algebraic identity!)

// Symbolic algebra for exact computation:
const phi = new RT.PurePhi.Symbolic(1, 1, 2);  // (1 + 1√5)/2 = φ
const phiSq = phi.multiply(phi);               // Exact: (3 + √5)/2
```

### 2.2 RT.PureRadicals for Triangle/Square/Hexagon

The existing `RT.PureRadicals` namespace (lines 519-616 of rt-math.js) provides:

```javascript
// Already available:
RT.PureRadicals.sqrt2()  // Cached √2 ≈ 1.4142135623730951
RT.PureRadicals.sqrt3()  // Cached √3 ≈ 1.7320508075688772
RT.PureRadicals.sqrt6()  // Cached √6 ≈ 2.4494897427831781

// Pre-computed values:
RT.PureRadicals.sqrt2Values.half     // √2/2 = 1/√2
RT.PureRadicals.sqrt3Values.half     // √3/2
RT.PureRadicals.sqrt3Values.inverse  // 1/√3 = √3/3
```

### 2.3 RT.circleParam for Rational Points

The existing `RT.circleParam()` (lines 156-163) generates unit circle points without trig:

```javascript
// Weierstrass parameterization: t → ((1-t²)/(1+t²), 2t/(1+t²))
RT.circleParam(0)   // → {x: 1, y: 0}   (0°)
RT.circleParam(1)   // → {x: 0, y: 1}   (90°)
RT.circleParam(-1)  // → {x: 0, y: -1}  (270°)

// For specific angles, find t such that spread = 4t²/(1+t²)²
RT.spreadToParam(spread)  // Solves for t given target spread
```

---

## Part 3: Exact Vertex Formulas Using Existing Infrastructure

### 3.1 Triangle (n=3) — Uses RT.PureRadicals.sqrt3()

**Star spread**: s = 3/4 (Theorem 95)
**Edge quadrance**: Q_edge = 4sQ = 3Q

```javascript
function polygonTriangle(quadrance, options) {
  const R = Math.sqrt(quadrance);  // Circumradius (deferred √)
  const sqrt3 = RT.PureRadicals.sqrt3();  // Cached, computed once

  // RT-pure vertices using exact √3
  const vertices = [
    new THREE.Vector3(R, 0, 0),                    // A₀
    new THREE.Vector3(-R/2, R * sqrt3/2, 0),       // A₂
    new THREE.Vector3(-R/2, -R * sqrt3/2, 0),      // A₄
  ];

  // Verify using RT.spread() if desired
  // const starSpread = RT.spread(vertices[0], vertices[1]); // Should be 3/4

  return { vertices, edges: [[0,1],[1,2],[2,0]], faces: [[0,1,2]],
           metadata: { starSpread: 3/4, edgeQuadrance: 3 * quadrance } };
}
```

### 3.2 Square (n=4) — Uses RT.PureRadicals.sqrt2()

**Star spread**: s = 1/2 (trivial case)
**Edge quadrance**: Q_edge = 4sQ = 2Q

```javascript
function polygonSquare(quadrance, options) {
  const R = Math.sqrt(quadrance);
  const sqrt2over2 = RT.PureRadicals.sqrt2Values.half;  // Pre-computed √2/2

  // RT-pure vertices using exact √2
  const vertices = [
    new THREE.Vector3(R * sqrt2over2,  R * sqrt2over2, 0),   // A₀
    new THREE.Vector3(-R * sqrt2over2, R * sqrt2over2, 0),   // A₂
    new THREE.Vector3(-R * sqrt2over2, -R * sqrt2over2, 0),  // A₄
    new THREE.Vector3(R * sqrt2over2,  -R * sqrt2over2, 0),  // A₆
  ];

  return { vertices, edges: [[0,1],[1,2],[2,3],[3,0]], faces: [[0,1,2,3]],
           metadata: { starSpread: 1/2, edgeQuadrance: 2 * quadrance } };
}
```

### 3.3 Pentagon (n=5) — Uses RT.PurePhi

**Star spread** (Theorem 96): s = (5+√5)/8 = β (Exercise 14.3)

```javascript
function polygonPentagon(quadrance, options) {
  const R = Math.sqrt(quadrance);
  const sqrt5 = RT.PurePhi.sqrt5();  // Cached √5

  // Pentagon spreads from Exercise 14.3, p.166
  const alpha = (5 - sqrt5) / 8;  // ≈ 0.345491 (base spread)
  const beta = (5 + sqrt5) / 8;   // ≈ 0.904508 (star spread)

  // Exact cosines using algebraic identities (no trig!)
  // cos(72°) = (√5-1)/4 = inverse(φ)/2
  // cos(144°) = -(1+√5)/4 = -φ/2
  const cos72 = (sqrt5 - 1) / 4;           // = RT.PurePhi.inverse() / 2
  const cos144 = -(1 + sqrt5) / 4;         // = -RT.PurePhi.value() / 2

  // Sines require nested radicals (compute once, cache)
  // sin(72°) = √(10 + 2√5)/4
  // sin(144°) = √(10 - 2√5)/4
  const sin72 = Math.sqrt(10 + 2 * sqrt5) / 4;
  const sin144 = Math.sqrt(10 - 2 * sqrt5) / 4;

  const vertices = [
    new THREE.Vector3(R, 0, 0),                      // A₀ (0°)
    new THREE.Vector3(R * cos72, R * sin72, 0),      // A₂ (72°)
    new THREE.Vector3(R * cos144, R * sin144, 0),    // A₄ (144°)
    new THREE.Vector3(R * cos144, -R * sin144, 0),   // A₆ (216°)
    new THREE.Vector3(R * cos72, -R * sin72, 0),     // A₈ (288°)
  ];

  return { vertices, edges: [[0,1],[1,2],[2,3],[3,4],[4,0]],
           faces: [[0,1,2,3,4]],
           metadata: { starSpread: beta, alpha, beta,
                       edgeQuadrance: 4 * beta * quadrance } };
}
```

### 3.4 Hexagon (n=6) — Uses RT.PureRadicals.sqrt3()

**Star spread**: s = 1/4
**Edge quadrance**: Q_edge = 4sQ = Q (edge equals circumradius!)

```javascript
function polygonHexagon(quadrance, options) {
  const R = Math.sqrt(quadrance);
  const sqrt3over2 = RT.PureRadicals.sqrt3Values.half;  // Pre-computed √3/2

  const vertices = [
    new THREE.Vector3(R, 0, 0),                       // A₀
    new THREE.Vector3(R/2, R * sqrt3over2, 0),        // A₂
    new THREE.Vector3(-R/2, R * sqrt3over2, 0),       // A₄
    new THREE.Vector3(-R, 0, 0),                      // A₆
    new THREE.Vector3(-R/2, -R * sqrt3over2, 0),      // A₈
    new THREE.Vector3(R/2, -R * sqrt3over2, 0),       // A₁₀
  ];

  return { vertices, edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]],
           faces: [[0,1,2,3,4,5]],
           metadata: { starSpread: 1/4, edgeQuadrance: quadrance } };
}
```

---

## Part 4: Extensions to rt-math.js

### 4.1 Spread Polynomials Sₖ(s) — NEW

Add to `RT` namespace for computing diagonal quadrances:

```javascript
/**
 * Spread Polynomials - Wildberger's Sₖ(s) for polygon diagonal quadrances
 * From "Divine Proportions" Chapter 14, Exercise 14.2
 *
 * For regular n-gon with circumradius quadrance Q and star spread s:
 *   Q(A₀, A₂ₖ) = 4·Sₖ(s)·Q
 *
 * @namespace SpreadPolynomials
 */
RT.SpreadPolynomials = {
  /**
   * S₁(s) = s (identity - edge quadrance coefficient)
   */
  S1: s => s,

  /**
   * S₂(s) = 4s(1-s)
   * Skip-one diagonal (Polygon Triangle Theorem, p.165)
   */
  S2: s => 4 * s * (1 - s),

  /**
   * S₃(s) = s(3-4s)²
   * Used for triangular stars (Theorem 95)
   */
  S3: s => s * (3 - 4*s) * (3 - 4*s),

  /**
   * S₄(s) = 16s(1-s)(1-2s)²
   */
  S4: s => 16 * s * (1-s) * (1 - 2*s) * (1 - 2*s),

  /**
   * S₅(s) = s(5 - 20s + 16s²)²
   * Used for pentagonal stars (Theorem 96, Eq. 14.1)
   */
  S5: s => s * Math.pow(5 - 20*s + 16*s*s, 2),

  /**
   * S₇(s) = s(7 - 56s + 112s² - 64s³)²
   * Used for heptagonal stars (Theorem 97, Eq. 14.2)
   */
  S7: s => s * Math.pow(7 - 56*s + 112*s*s - 64*s*s*s, 2),

  /**
   * General Sₙ via Chebyshev-like recurrence
   * Sₙ₊₁(s) = (1-2s)·Sₙ(s) - Sₙ₋₁(s) + s
   *
   * @param {number} n - Polynomial index
   * @param {number} s - Spread value
   * @returns {number} Sₙ(s)
   */
  Sn: (n, s) => {
    if (n === 0) return 0;
    if (n === 1) return s;

    let prev = 0;       // S₀
    let curr = s;       // S₁

    for (let k = 2; k <= n; k++) {
      const next = (1 - 2*s) * curr - prev + s;
      prev = curr;
      curr = next;
    }

    return curr;
  }
};
```

### 4.2 Star Spreads — NEW (Uses Existing Radicals)

```javascript
/**
 * Exact Star Spreads for Regular n-gons
 * From "Divine Proportions" Chapter 14
 *
 * Uses existing RT.PurePhi and RT.PureRadicals for cached radicals.
 *
 * @namespace StarSpreads
 */
RT.StarSpreads = {
  /**
   * Triangle (n=3): s = 3/4
   * Theorem 95: requires 3 = (√3)² to be a square
   * @returns {number} 0.75 (exact rational)
   */
  triangle: () => 3/4,

  /**
   * Square (n=4): s = 1/2
   * @returns {number} 0.5 (exact rational)
   */
  square: () => 1/2,

  /**
   * Pentagon (n=5): s = (5+√5)/8 = β
   * Theorem 96 and Exercise 14.3
   * @returns {number} ≈ 0.904508497187474
   */
  pentagon: () => (5 + RT.PurePhi.sqrt5()) / 8,

  /**
   * Hexagon (n=6): s = 1/4
   * @returns {number} 0.25 (exact rational)
   */
  hexagon: () => 1/4,

  /**
   * Octagon (n=8): s = (2-√2)/4
   * @returns {number} ≈ 0.146446609406726
   */
  octagon: () => (2 - RT.PureRadicals.sqrt2()) / 4,

  /**
   * Decagon (n=10): s = (3-√5)/8 = α (complement of pentagon β)
   * @returns {number} ≈ 0.095491502812526
   */
  decagon: () => (3 - RT.PurePhi.sqrt5()) / 8,

  /**
   * Dodecagon (n=12): s = (2-√3)/4
   * @returns {number} ≈ 0.066987298107781
   */
  dodecagon: () => (2 - RT.PureRadicals.sqrt3()) / 4,

  /**
   * Get star spread for any supported n
   * @param {number} n - Number of sides
   * @returns {number|null} Star spread or null if not algebraically exact
   */
  forN: n => {
    const spreads = {
      3: RT.StarSpreads.triangle,
      4: RT.StarSpreads.square,
      5: RT.StarSpreads.pentagon,
      6: RT.StarSpreads.hexagon,
      8: RT.StarSpreads.octagon,
      10: RT.StarSpreads.decagon,
      12: RT.StarSpreads.dodecagon,
    };
    return spreads[n] ? spreads[n]() : null;
  }
};
```

### 4.3 Pentagon Constants — Extend RT.PurePhi

Add to existing `RT.PurePhi` namespace:

```javascript
/**
 * Pentagon-specific constants from Exercise 14.3 (p.166)
 * Extends RT.PurePhi with cached pentagon geometry values
 *
 * Key relationships:
 *   α + β = 5/4
 *   α · β = 5/16
 *   β/α = φ² (golden ratio squared!)
 */
RT.PurePhi.pentagon = {
  /**
   * α = (5-√5)/8 ≈ 0.345491502812526
   * Spread at base vertices of corner triangle
   */
  alpha: (() => {
    const cached = (5 - Math.sqrt(5)) / 8;
    return () => cached;
  })(),

  /**
   * β = (5+√5)/8 ≈ 0.904508497187474
   * Star spread (spread at apex of corner triangle)
   */
  beta: (() => {
    const cached = (5 + Math.sqrt(5)) / 8;
    return () => cached;
  })(),

  /**
   * cos(72°) = (√5-1)/4 = 1/(2φ)
   * Algebraic identity, no trig needed
   */
  cos72: (() => {
    const cached = (Math.sqrt(5) - 1) / 4;
    return () => cached;
  })(),

  /**
   * cos(144°) = -(1+√5)/4 = -φ/2
   */
  cos144: (() => {
    const cached = -(1 + Math.sqrt(5)) / 4;
    return () => cached;
  })(),

  /**
   * sin(72°) = √(10 + 2√5)/4
   * Nested radical, computed once
   */
  sin72: (() => {
    const cached = Math.sqrt(10 + 2 * Math.sqrt(5)) / 4;
    return () => cached;
  })(),

  /**
   * sin(144°) = √(10 - 2√5)/4
   */
  sin144: (() => {
    const cached = Math.sqrt(10 - 2 * Math.sqrt(5)) / 4;
    return () => cached;
  })(),

  /**
   * Edge-to-diagonal ratio = φ (golden ratio)
   * In a regular pentagon: diagonal/edge = φ
   */
  edgeToDiagonalRatio: () => RT.PurePhi.value(),
};
```

---

## Part 5: Implementation Status ✅ COMPLETED

### Phase 1: Extend rt-math.js ✅

- [x] Add `RT.SpreadPolynomials` namespace (S₁ through S₇ + general Sₙ)
- [x] Add `RT.StarSpreads` namespace (uses existing `RT.PurePhi.sqrt5()` and `RT.PureRadicals`)
- [x] Add `RT.PurePhi.pentagon` cached constants (cos/sin for 72°, 144°)
- [x] Add JSDoc references to Wildberger theorems

### Phase 2: Implement Exact Polygon Generators in rt-polyhedra.js ✅

- [x] `_polygonTriangle()` — RT-pure using `RT.PureRadicals.sqrt3()`
- [x] `_polygonSquare()` — RT-pure using integers (vertices at ±R)
- [x] `_polygonPentagon()` — RT-pure using `RT.PurePhi.pentagon.*`
- [x] `_polygonHexagon()` — RT-pure using `RT.PureRadicals.sqrt3()`
- [x] `_polygonOctagon()` — RT-pure using `RT.PureRadicals.sqrt2()`
- [x] `_polygonNonagon()` — Triangle subdivision (3×3 vertices via spread intervals)
- [x] `_polygonDecagon()` — RT-pure using `RT.PurePhi.pentagon.*`
- [x] `_polygonDodecagon()` — RT-pure using `RT.PureRadicals.sqrt3()`

### Phase 3: Refactor Polyhedra.polygon() ✅

- [x] Add dispatch logic to RT-pure implementations for n ∈ {3,4,5,6,8,9,10,12}
- [x] Implement `_polygonClassical()` as fallback for non-constructible n (7, 11, 13, etc.)
- [x] Add `metadata.rtPure` flag to indicate which engine was used
- [x] Update metadata to include `starSpread` from `RT.StarSpreads`
- [x] Preserve original classical implementation as commented reference block

### Phase 4: Validation ✅

- [x] Verify edge quadrance: `Q_edge = 4 * s * Q` — console logs confirm
- [x] Console validation logs for each polygon type
- [x] Dual-engine approach: RT-pure where constructible, classical fallback otherwise

### Implementation Summary

The polygon generator now uses a **dual-engine approach**:

| n | Engine | Method | Radicals |
|---|--------|--------|----------|
| 3 | RT-pure | `_polygonTriangle` | √3 |
| 4 | RT-pure | `_polygonSquare` | integers |
| 5 | RT-pure | `_polygonPentagon` | φ, √5 |
| 6 | RT-pure | `_polygonHexagon` | √3 |
| 8 | RT-pure | `_polygonOctagon` | √2 |
| 9 | RT-pure | `_polygonNonagon` | √3 (triangle subdivision) |
| 10 | RT-pure | `_polygonDecagon` | φ, √5 |
| 12 | RT-pure | `_polygonDodecagon` | √3 |
| 7, 11, 13+ | Classical | `_polygonClassical` | Math.sin/cos |

**Key Design Decisions**:
1. No errors for non-constructible n — seamless fallback to classical trig
2. `metadata.rtPure: true/false` flag indicates which path was taken
3. Console logs distinguish: `[RT] Triangle: ...` vs `[RT] 7-gon using classical trig...`
4. Original implementation preserved as commented reference block for researchers

---

## Part 6: RT-Purity Analysis

### What Makes This "RT-Pure"?

| Criterion | Implementation |
|-----------|----------------|
| Parameterization by quadrance | `quadrance` parameter (not radius) |
| Star spread defines geometry | `RT.StarSpreads.forN(n)` |
| Exact algebraic coordinates | Uses `RT.PurePhi`, `RT.PureRadicals` |
| Deferred √ expansion | Radicals cached, single computation |
| Spread polynomials | `RT.SpreadPolynomials.Sn(k, s)` for diagonals |

### Radical Usage Summary

| n | Primary Radical | Source |
|---|-----------------|--------|
| 3 | √3 | `RT.PureRadicals.sqrt3()` |
| 4 | √2 | `RT.PureRadicals.sqrt2()` |
| 5 | √5 | `RT.PurePhi.sqrt5()` |
| 6 | √3 | `RT.PureRadicals.sqrt3()` |
| 8 | √2 | `RT.PureRadicals.sqrt2()` |
| 10 | √5 | `RT.PurePhi.sqrt5()` |
| 12 | √3 | `RT.PureRadicals.sqrt3()` |

### Where Classical Trig Remains Necessary

For **arbitrary n** not in {3, 4, 5, 6, 8, 10, 12, ...}, classical sin/cos are mathematically necessary. However, we maintain RT semantics:

1. Compute `spread = sin²(π/n)` and work in spread space
2. Use `RT.SpreadPolynomials.Sn(k, s)` for diagonal quadrances
3. Parameterize everything by circumradius quadrance Q
4. Return `starSpread` in metadata for RT consistency

---

## References

### Wildberger Sources
- "Divine Proportions: Rational Trigonometry to Universal Geometry"
  - **Chapter 14**: Regular Stars and Polygons (pp. 159-166)
  - **Theorem 95**: Order three star — s = 3/4 (p. 160)
  - **Theorem 96**: Order five star — s = (5+√5)/8 (p. 161)
  - **Theorem 97**: Order seven star — cubic equation (p. 162)
  - **Theorem 98**: Polygon triangle — Q_edge = 4sQ (p. 165)
  - **Exercise 14.2**: Q(A₀,A₂ₖ) = 4Sₖ(s)Q (p. 166)
  - **Exercise 14.3**: Pentagon α = (5-√5)/8, β = (5+√5)/8 (p. 166)

### ARTExplorer Codebase
- [rt-math.js](../modules/rt-math.js) — RT library with PurePhi, PureRadicals
- [rt-polyhedra.js](../modules/rt-polyhedra.js) — Current polygon implementation

---

*Created: 2026-01-25*
*Revised: 2026-01-25 — Integrated with existing RT.PurePhi and RT.PureRadicals*
*Completed: 2026-01-25 — Full implementation with dual-engine approach*
*Status: ✅ IMPLEMENTED*
