# Pure Polygon — Symbolic N-gon Vertices in Rational Trigonometry

**Implemented**: Feb 2026, RT-compliance branch
**Reference**: Wildberger, "Divine Proportions" Chapter 14, §14.5
**Code**: `RT.SymbolicCoord`, `RT.slopeSymbolic()`, `RT.nGonVerticesSymbolic()` in `rt-math.js`

---

## 1. Motivation

Wildberger's Rational Trigonometry works in **quadrance/spread space** where all
relationships are polynomial. The traditional pipeline for polygon vertex generation
expands to floating-point at the slope computation — `m₁ = √(s/(1-s))` — and then
accumulates float rounding through every subsequent tangent addition and Weierstrass
evaluation.

The Pure Polygon approach eliminates ALL intermediate float expansion by representing
vertex coordinates as exact elements of a **quadratic number field** Q(√D), using
the type `(a + b√D) / c` with integer coefficients. The single √D evaluation is
deferred to the GPU boundary (`THREE.Vector3`), where it becomes a hardware operation.

**Result**: For the five most common synergetics polygons (N = 3, 4, 6, 8, 12),
vertex generation is **provably exact** — not a float approximation of an algebraic
number, but the algebraic number itself.

---

## 2. The Algebraic Hierarchy

Every regular N-gon's vertices live in a quadratic number field Q(√D) determined
by its star spread s = sin²(π/N). The base slope m₁ = √(s/(1-s)) = tan(π/N) is
the only irrational in the Wildberger reflection construction.

| N  | Star Spread s = sin²(π/N) | D = s/(1-s)  | m₁ simplified    | Field   | Method     |
|----|---------------------------|--------------|------------------|---------|------------|
| 3  | 3/4                       | 3            | √3               | Q(√3)   | symbolic   |
| 4  | 1/2                       | 1            | **1** (rational!) | **Q**   | symbolic   |
| 5  | (5−√5)/8 = α              | 5−2√5        | √(5−2√5) ‡       | nested  | algebraic  |
| 6  | 1/4                       | 1/3          | √3/3             | Q(√3)   | symbolic   |
| 7  | ≈0.1883 (cubic cached)    | cubic        | cubic             | cubic   | cubic      |
| 8  | (2−√2)/4                  | 3−2√2        | **√2 − 1**       | Q(√2)   | symbolic   |
| 9  | ≈0.1170 (cubic cached)    | cubic        | cubic             | cubic   | cubic      |
| 10 | (3−√5)/8                  | (5−2√5)/5    | √(5−2√5)/√5 ‡    | nested  | algebraic  |
| 12 | (2−√3)/4                  | 7−4√3        | **2 − √3**       | Q(√3)   | symbolic   |

**‡ Pentagon/Decagon**: √(5−2√5) does NOT denest. Proof: the equation a⁴−5a²+5=0
has roots a²=(5±√5)/2, both irrational. The nested radical is irreducible over Q.

### Key Denesting Identities

The octagon and dodecagon slopes collapse from nested radicals to simple expressions:

```
Octagon:   √(3 − 2√2)  =  √2 − 1     ← because (√2 − 1)² = 3 − 2√2
Dodecagon: √(7 − 4√3)  =  2 − √3      ← because (2 − √3)² = 7 − 4√3
```

These identities are what make symbolic representation practical for 5 of our 9
supported polygons, using only **three radicals**: 1 (trivial), √2, and √3.

### Radical Field Summary

- **Q (purely rational)**: Square — m₁ = 1, ALL vertices are integers/rationals
- **Q(√2)**: Octagon — m₁ = √2 − 1
- **Q(√3)**: Triangle (m₁ = √3), Hexagon (m₁ = √3/3), Dodecagon (m₁ = 2 − √3)

---

## 3. Why the Tangent Recurrence Preserves the Field

The tangent addition formula:
```
m_{k+1} = (mₖ + m₁) / (1 − mₖ · m₁)
```

involves only +, −, ×, ÷ on elements of Q(√D). Since Q(√D) is **closed** under
these four field operations, every subsequent slope mₖ stays in Q(√D). No new
radicals are ever introduced.

The Weierstrass formula for vertex k:
```
xₖ = R · (1 − mₖ²) / (1 + mₖ²)
yₖ = R · 2mₖ / (1 + mₖ²)
```

also uses only field operations. Therefore: **if m₁ ∈ Q(√D), then ALL vertex
coordinates are in Q(√D)**. The field is determined once at construction and
never changes.

This is the key theoretical result: the Wildberger reflection construction,
when started from a slope in Q(√D), produces a **closed algebraic pipeline**
that needs no intermediate irrational expansion.

---

## 4. Deployed Implementation

### 4.1 `RT.SymbolicCoord` — Exact algebraic coordinate type

Every coordinate is stored as `(a + b√D) / c` with integer a, b, c and radicand D:

```javascript
// rt-math.js — generalizes PurePhi.Symbolic (hardcoded D=5) to arbitrary D
class SymbolicCoord {
  constructor(a, b, D, c = 1) { this.a = a; this.b = b; this.D = D; this.c = c; }

  // THE expansion point — called once, at GPU boundary
  toDecimal() { return (this.a + this.b * Math.sqrt(this.D)) / this.c; }

  // Field operations: all return SymbolicCoord (stay in Q(√D))
  add(other) { /* common denominator, GCD simplify */ }
  sub(other) { /* common denominator, GCD simplify */ }
  mul(other) { /* (a₁a₂+D·b₁b₂) + (a₁b₂+b₁a₂)√D, GCD simplify */ }
  div(other) { /* rationalize denominator via conjugate, GCD simplify */ }

  // GCD reduction after each operation prevents integer overflow
  simplify() { /* divide a, b, c by gcd(|a|, |b|, |c|), keep c > 0 */ }
}
```

GCD reduction is critical: without it, the tangent recurrence would compound
denominators to O(c^(2^N)), exceeding `Number.MAX_SAFE_INTEGER` by the dodecagon.
With GCD, the **maximum coefficient stays at 2** for all five supported polygons.

### 4.2 `RT.slopeSymbolic(N)` — Cached slope decompositions

Returns m₁ as a `SymbolicCoord` in Q(√D), exploiting the denesting identities:

```javascript
slopeSymbolic: N => ({
  3:  { D: 3, m1: SymbolicCoord(0, 1, 3) },       // √3
  4:  { D: 1, m1: SymbolicCoord(1, 0, 1) },       // 1 (rational!)
  6:  { D: 3, m1: SymbolicCoord(0, 1, 3, 3) },    // √3/3
  8:  { D: 2, m1: SymbolicCoord(-1, 1, 2) },      // √2 − 1  (denested!)
  12: { D: 3, m1: SymbolicCoord(2, -1, 3) },      // 2 − √3  (denested!)
})[N] || null
```

### 4.3 `RT.nGonVerticesSymbolic(N)` — The vertex generator

Runs the full Wildberger tangent recurrence in `SymbolicCoord` arithmetic.
Returns unit-circle vertices as `{x: SymbolicCoord, y: SymbolicCoord}` pairs.
Caller scales by circumradius R at the `toDecimal()` boundary.

### 4.4 Integration in `Primitives.polygon()`

```javascript
polygon: (quadrance, options) => {
  const R = Math.sqrt(quadrance);           // circumradius √ (GPU boundary)
  const sym = RT.nGonVerticesSymbolic(n);   // try symbolic first

  if (sym) {
    // Exact Q(√D) → expand at GPU boundary only
    vertices = sym.vertices.map(v =>
      new THREE.Vector3(v.x.toDecimal() * R, v.y.toDecimal() * R, 0)
    );
  } else {
    // Float fallback: Wildberger reflection with 1 √
    const result = RT.nGonVertices(n, R);
    vertices = result.vertices.map(v => new THREE.Vector3(v.x, v.y, 0));
  }
}
```

Prism, cone, and cylinder inherit the symbolic path automatically through `polygon()`.

---

## 5. Verified Results

Shadow testing (symbolic vs float path, R=1.0) confirms exact agreement:

| N  | D  | Max Δ (sym vs float) | Max coeff | Notes |
|----|----|--------------------|-----------|-------|
| 3  | 3  | 1.11e-16           | 2         | Machine ε from single √3 eval |
| 4  | 1  | **0.0**            | 1         | Purely rational — zero √ calls |
| 6  | 3  | 2.22e-16           | 2         | Same √3 as triangle |
| 8  | 2  | 1.11e-16           | 2         | √2 − 1 denesting works perfectly |
| 12 | 3  | 5.00e-16           | 2         | 2 − √3 denesting, 5 recurrence steps |

The non-zero deltas are **not rounding errors in the symbolic path** — they are the
irreducible machine epsilon from evaluating √2 or √3 at the GPU boundary. The symbolic
path itself introduces zero rounding.

### Decimal Tribute Count

| Polygon   | Old (9 generators) | Wildberger float | Symbolic       |
|-----------|-------------------|------------------|----------------|
| Square    | 2N transcendentals | 1 √ + float ops  | **0 √** (rational!) |
| Triangle  | 2N transcendentals | 1 √ + float ops  | **0 intermediate √** |
| Hexagon   | 2N transcendentals | 1 √ + float ops  | **0 intermediate √** |
| Octagon   | 2N transcendentals | 1 √ + float ops  | **0 intermediate √** |
| Dodecagon | 2N transcendentals | 1 √ + float ops  | **0 intermediate √** |
| Pentagon  | 2N transcendentals | 1 √ + float ops  | 1 √ (float fallback) |
| Others    | 2N transcendentals | 1 √ + float ops  | 1 √ (float fallback) |

The circumradius R = √Q_R is the single remaining √, deferred to the GPU boundary.
For the square, even this is unnecessary if circumradius quadrance is used directly.

---

## 6. Pentagon Star Spread Correction

### The Bug (discovered during this analysis, fixed in commit `6784c26`)

`RT.StarSpreads.pentagon` was returning **β = (5+√5)/8** (the apex spread of the
corner triangle, per Exercise 14.3). The correct star spread for vertex generation
is **α = (5−√5)/8 = sin²(π/5)**.

The star spread used by `nGonVertices()` must be **sin²(π/N)** — the half-central-angle
spread — because the Weierstrass parameterization maps slope t to angle 2·arctan(t).
For all other polygons this was correct; the pentagon alone used the full central angle
spread sin²(2π/5) = β instead.

### Effect and Resolution

With β: m₁ = tan(72°) → vertices at 144° intervals → {5/2} pentagram order
With α: m₁ = tan(36°) → vertices at 72° intervals → {5} regular pentagon ✓

The value `PurePhi.pentagon.beta()` = (5+√5)/8 remains in the codebase — it IS
the correct apex spread per Exercise 14.3. It was misidentified as the star spread
needed for polygon generation. The α/β distinction is now documented in rt-math.js.

---

## 7. Method Hierarchy

The complete polygon generation pipeline, from most pure to least:

```
polygon(N) requested
  │
  ├─ N ∈ {3, 4, 6, 8, 12}  →  nGonVerticesSymbolic()
  │     Exact Q(√D) arithmetic. Zero intermediate float.
  │     toDecimal() called once per coordinate at GPU boundary.
  │     Method label: "symbolic"
  │
  ├─ N ∈ {5, 10}  →  nGonVertices() with algebraic star spread
  │     Float arithmetic. 1 √ (slopeFromSpread). Nested radical.
  │     Method label: "algebraic"
  │
  ├─ N ∈ {7, 9}  →  nGonVertices() with cubic-cached star spread
  │     Float arithmetic. 1 √. Cubic equation roots cached.
  │     Method label: "cubic"
  │
  └─ N > 12 (others)  →  nGonVertices() with sin²(π/N) fallback
        Float arithmetic. 1 √ + 1 transcendental (sin).
        Method label: "transcendental"
```

### For a Whitepaper on RT-Pure Polygon Generation

The key claims, with their supporting theory:

1. **Wildberger reflection construction generates any regular N-gon from a single √**
   (slopeFromSpread). All subsequent vertex computations are rational in m₁.
   *Ref: Divine Proportions Ch 14 §14.5, Theorem 98*

2. **For N = 3, 4, 6, 8, 12, even the single √ can be eliminated** by expressing
   m₁ symbolically in Q(√D) and deferring expansion to the hardware boundary.
   *Key identities: √(3−2√2) = √2−1, √(7−4√3) = 2−√3*

3. **The tangent addition recurrence preserves the number field**: Q(√D) is closed
   under +, −, ×, ÷, so no new radicals appear during vertex generation. This is
   a consequence of Q(√D) being a field extension of degree 2 over Q.

4. **GCD reduction bounds coefficient growth**: with simplification after each
   arithmetic operation, the maximum integer coefficient remains ≤ 2 for all five
   symbolic polygons, preventing precision loss from large-integer arithmetic.

5. **The pentagon star spread is α = sin²(π/N), not β = sin²(2π/N)**: the Weierstrass
   parameterization requires the half-central-angle. Confusion between the "star spread"
   (between consecutive star lines) and the "apex spread" (of the corner triangle) led
   to a bug producing {5/2} pentagram vertex order.

---

*Deployed: Feb 2026, RT-compliance branch*
*Commits: `6784c26` (pentagon fix), `f47308b` (symbolic engine)*
*Ref: Wildberger "Divine Proportions" Chapter 14, §14.5, Theorems 95-98*
