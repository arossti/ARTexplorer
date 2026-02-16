# Pure Polygon — Symbolic N-gon Vertices in RT Space

**Goal**: Keep ALL polygon vertex coordinates in exact algebraic form `(a + b√D)/c`
until the final GPU boundary (`THREE.Vector3`). Zero intermediate float expansions.

**Status**: Analysis complete, implementation planned (Feb 2026)

---

## 1. The Algebraic Hierarchy

Every regular N-gon's vertices live in a **quadratic number field** Q(√D) determined
by its star spread. The base slope m₁ = √(s/(1-s)) is the ONLY irrational in the
entire construction — and for many N, it simplifies to a known cached radical.

| N  | Star Spread s = sin²(π/N) | D = s/(1-s)  | m₁ = √D         | Field   |
|----|---------------------------|--------------|------------------|---------|
| 3  | 3/4                       | 3            | √3               | Q(√3)   |
| 4  | 1/2                       | 1            | **1** (rational!) | **Q**   |
| 5  | (5-√5)/8 = α              | 5-2√5        | √(5-2√5) ‡       | nested  |
| 6  | 1/4                       | 1/3          | √3/3             | Q(√3)   |
| 7  | ≈0.1883 (cubic)           | cubic        | cubic             | cubic   |
| 8  | (2-√2)/4                  | 3-2√2        | **√2 - 1**       | Q(√2)   |
| 9  | ≈0.1170 (cubic)           | cubic        | cubic             | cubic   |
| 10 | (3-√5)/8                  | (5-2√5)/5    | √(5-2√5)/√5 ‡    | nested  |
| 12 | (2-√3)/4                  | 7-4√3        | **2 - √3**       | Q(√3)   |

**‡ Pentagon/Decagon**: √(5-2√5) does NOT denest. Proof: requires a⁴-5a²+5=0
which has roots a²=(5±√5)/2 (irrational). These remain nested radicals.

### Key Denesting Identities

These are the big wins — nested radicals that collapse to simple expressions:

```
Octagon:   √(3 - 2√2)  =  √2 - 1     ← because (√2-1)² = 3-2√2
Dodecagon: √(7 - 4√3)  =  2 - √3      ← because (2-√3)² = 7-4√3
```

With these, 7 of our 9 supported polygons have m₁ expressible in Q ∪ Q(√2) ∪ Q(√3):

- **Q (purely rational)**: Square — m₁ = 1, ALL vertices rational
- **Q(√2)**: Octagon — m₁ = √2 - 1
- **Q(√3)**: Triangle (m₁ = √3), Hexagon (m₁ = √3/3), Dodecagon (m₁ = 2 - √3)

Only Pentagon/Decagon (nested) and Heptagon/Nonagon (cubic) fall outside this.

---

## 2. Why the Tangent Recurrence Preserves the Field

The tangent addition formula:
```
m_{k+1} = (mₖ + m₁) / (1 - mₖ · m₁)
```

involves only +, -, ×, ÷ on elements of Q(√D). Since Q(√D) is **closed** under
these four operations, every mₖ stays in Q(√D). No new radicals are introduced.

Therefore: if m₁ ∈ Q(√D), then ALL vertex coordinates are in Q(√D).

The Weierstrass formula for vertex k:
```
xₖ = R · (1 - mₖ²) / (1 + mₖ²)
yₖ = R · 2mₖ / (1 + mₖ²)
```

also uses only +, -, ×, ÷. The ENTIRE pipeline from star spread to vertices is
closed in Q(√D). The field is determined once at the start and never changes.

---

## 3. Symbolic Vertex Representation

### The Type: `SymbolicCoord`

Every coordinate is stored as **(a + b√D) / c** with rational a, b, c, D:

```javascript
class SymbolicCoord {
  constructor(a, b, D, c = 1) {
    this.a = a;  // rational part (integer or fraction)
    this.b = b;  // radical coefficient
    this.D = D;  // radicand (the number under √)
    this.c = c;  // denominator
  }

  toDecimal() {
    return (this.a + this.b * Math.sqrt(this.D)) / this.c;
  }
}
```

This is a generalization of `PurePhi.Symbolic` (which is hardcoded to D=5).

### Worked Examples

**Square (D=1, m₁=1)** — Zero radicals:
```
v0 = (R, 0)         →  x: {a:1, b:0, D:1, c:1}·R,  y: {a:0, b:0, D:1, c:1}·R
v1 = (0, R)          →  x: {a:0, b:0, D:1, c:1}·R,  y: {a:1, b:0, D:1, c:1}·R
v2 = (-R, 0)         →  x: {a:-1,b:0, D:1, c:1}·R,  y: {a:0, b:0, D:1, c:1}·R
v3 = (0, -R)         →  x: {a:0, b:0, D:1, c:1}·R,  y: {a:-1,b:0, D:1, c:1}·R
```
All coefficients are integers. Trivially exact. No √ call ever.

**Triangle (D=3, m₁=√3)** — One radical √3:
```
v0 = (R, 0)              →  x: (1 + 0·√3)/1,  y: (0 + 0·√3)/1
v1 = (-R/2, R√3/2)       →  x: (-1 + 0·√3)/2, y: (0 + 1·√3)/2
v2 = (-R/2, -R√3/2)      →  x: (-1 + 0·√3)/2, y: (0 - 1·√3)/2
```
Only ONE √3 evaluation needed at GPU boundary. All arithmetic is on integers.

**Octagon (D=2, m₁=√2-1)** — One radical √2:
```
m₁ = (-1 + 1·√2)/1

Tangent recurrence (all symbolic in Q(√2)):
  m₂ = 2(√2-1)/(1-(3-2√2)) = 2(√2-1)/(2√2-2) = 1   (rational!)
  m₃ = (1 + √2-1)/(1 - 1·(√2-1)) = √2/(2-√2) = (√2(2+√2))/2 = (2√2+2)/2 = √2+1

Vertex 1: x = R·(0 + 1·√2)/2, y = R·(0 + 1·√2)/2     [angle = 45°]
Vertex 2: x = R·(0 + 0·√2)/1, y = R·(1 + 0·√2)/1       [angle = 90°, exact!]
Vertex 3: x = R·(0 - 1·√2)/2, y = R·(0 + 1·√2)/2       [angle = 135°]
...
```
The even vertices (90°, 180°, 270°) are purely rational. Odd vertices need √2.

---

## 4. Implementation Strategy

### Phase 1: Symbolic Tangent Recurrence (the core engine)

Add `RT.nGonVerticesSymbolic(N, Q_R)` that returns vertices as `SymbolicCoord` pairs.
Takes circumradius QUADRANCE (not radius) to stay fully in Q-space.

```javascript
nGonVerticesSymbolic: (N, Q_R) => {
  const s = RT.StarSpreads.forN(N);
  if (s === null) return null;  // transcendental — not symbolizable

  // Determine D and express m₁ = (a + b√D)/c
  const { D, m1 } = RT.slopeSymbolic(N, s);
  if (D === null) return null;  // cubic — not symbolizable

  // Tangent recurrence in SymbolicCoord arithmetic
  // ...returns SymbolicCoord[][] for all N vertices
}
```

**Scope**: N = 3, 4, 6, 8, 12 (the 5 polygons with clean Q(√D) forms).

### Phase 2: `slopeSymbolic(N, s)` — Cached slope decompositions

Returns m₁ in symbolic form for each polygon:

```javascript
slopeSymbolic: (N, s) => {
  const table = {
    3:  { D: 3, m1: { a: 0, b: 1, c: 1 } },      // √3
    4:  { D: 1, m1: { a: 1, b: 0, c: 1 } },      // 1  (rational)
    6:  { D: 3, m1: { a: 0, b: 1, c: 3 } },      // √3/3
    8:  { D: 2, m1: { a: -1, b: 1, c: 1 } },     // √2 - 1
    12: { D: 3, m1: { a: 2, b: -1, c: 1 } },     // 2 - √3
  };
  return table[N] || null;
}
```

### Phase 3: SymbolicCoord Arithmetic

Extend the existing `PurePhi.Symbolic` pattern to general D:

```javascript
class SymbolicCoord {
  // (a + b√D) / c
  constructor(a, b, D, c = 1) { ... }

  add(other)      { /* same D required */ }
  subtract(other) { /* same D required */ }
  multiply(other) { /* (a₁+b₁√D)(a₂+b₂√D) = (a₁a₂+Db₁b₂) + (a₁b₂+b₁a₂)√D */ }
  divide(other)   { /* rationalize denominator */ }
  toDecimal()     { return (this.a + this.b * Math.sqrt(this.D)) / this.c; }
}
```

The multiply rule generalizes PurePhi.Symbolic (which has D=5):
```
(a₁ + b₁√D)(a₂ + b₂√D) = (a₁a₂ + D·b₁b₂) + (a₁b₂ + b₁a₂)√D
```

### Phase 4: GPU Boundary — Single toDecimal() Call

```javascript
// In rt-primitives.js polygon():
const symVerts = RT.nGonVerticesSymbolic(n, quadrance);
if (symVerts) {
  // Symbolic path: exact until this line
  vertices = symVerts.map(v =>
    new THREE.Vector3(v.x.toDecimal(), v.y.toDecimal(), 0)  // THE expansion
  );
} else {
  // Fallback to current nGonVertices() for pentagon, cubics, transcendentals
  const R = Math.sqrt(quadrance);
  const { vertices: verts2D } = RT.nGonVertices(n, R);
  vertices = verts2D.map(v => new THREE.Vector3(v.x, v.y, 0));
}
```

---

## 5. Performance Analysis

### Operations per vertex (current vs symbolic)

| Step | Current (float) | Symbolic |
|------|----------------|----------|
| slopeFromSpread | 1 √ | 0 (table lookup) |
| tangent addition | 3 float ops | 3 SymbolicCoord ops (~12 int muls) |
| Weierstrass x,y | 5 float ops | 5 SymbolicCoord ops (~20 int muls) |
| GPU expansion | 0 | 2 √ calls (x + y) |

**Net**: ~4× more integer arithmetic, but **zero float rounding** until GPU.
For N ≤ 12 (max 12 vertices), the overhead is negligible (~200 int ops total).

### When symbolic is NOT worth it

- **N = 5, 10**: Nested radical √(5-2√5). Would need two-level symbolic type.
  Better to use current float path (1 √ gives 15-digit precision).
- **N = 7, 9**: Cubic roots. Not expressible as (a+b√D)/c at all.
- **N > 12**: Transcendental star spread. Not symbolizable.

### Recommendation

Use symbolic for **N = 3, 4, 6, 8, 12** (the 5 Gauss-Wantzel constructible
polygons with rational D). These cover the most common use cases and share
just 3 radicals: **1** (trivial), **√2**, **√3**.

---

## 6. CRITICAL BUG: Pentagon Star Spread

### Discovery

During this analysis, a star spread error was found in `RT.StarSpreads.pentagon`:

**Current code** (WRONG):
```javascript
pentagon: () => (5 + RT.PurePhi.sqrt5()) / 8,   // β ≈ 0.9045
```

**Correct value**:
```javascript
pentagon: () => (5 - RT.PurePhi.sqrt5()) / 8,   // α ≈ 0.3455
```

### What's wrong

The star spread for vertex generation must be **sin²(π/N)** (the half-central-angle).
For all other polygons, this is correct:

| N  | Code value | sin²(π/N) | Correct? |
|----|-----------|-----------|----------|
| 3  | 3/4       | sin²(60°) = 3/4 | ✓ |
| 4  | 1/2       | sin²(45°) = 1/2 | ✓ |
| 5  | **(5+√5)/8 ≈ 0.905** | **sin²(36°) = (5-√5)/8 ≈ 0.345** | **✗** |
| 6  | 1/4       | sin²(30°) = 1/4 | ✓ |
| 8  | (2-√2)/4  | sin²(22.5°) ≈ 0.146 | ✓ |
| 10 | (3-√5)/8  | sin²(18°) ≈ 0.095 | ✓ |
| 12 | (2-√3)/4  | sin²(15°) ≈ 0.067 | ✓ |

The pentagon uses **β = sin²(72°)** instead of **α = sin²(36°)**.

### Effect

With β, m₁ = tan(72°) ≈ 3.078 instead of m₁ = tan(36°) ≈ 0.727.

This produces vertices at angular step of **144°** (= 2×72°) instead of **72°**:
```
Current (β):   0°, 144°, 288°, 72°, 216°   → {5/2} pentagram order
Correct (α):   0°,  72°, 144°, 216°, 288°  → {5} pentagon order
```

The same 5 points exist on the circle, but edges connect every 2nd vertex,
drawing a **pentagram** instead of a regular pentagon. The edge quadrance is
also wrong: 3.618·Q_R (diagonal) instead of 1.382·Q_R (edge).

### Fix

One-line change in `RT.StarSpreads`:
```javascript
pentagon: () => (5 - RT.PurePhi.sqrt5()) / 8,   // α = sin²(π/5) = sin²(36°)
```

The `PurePhi.pentagon.beta` value (5+√5)/8 should remain — it IS the correct
"apex spread" per Exercise 14.3. It was just misidentified as the star spread
needed by nGonVertices.

### Impact

- **Prism/Cone with 5-gon base**: Also affected (they call polygon() → nGonVertices)
- **Grid circles**: NOT affected (use nGon=64, not 5)
- **MetaLog edge quadrance**: Currently reports wrong Q_edge for pentagons

---

## 7. Summary of Changes Needed

| Priority | Change | Files |
|----------|--------|-------|
| **P0 (bug)** | Fix pentagon star spread: β → α | rt-math.js:1463 |
| **P1 (core)** | Add `SymbolicCoord` class | rt-math.js |
| **P1 (core)** | Add `slopeSymbolic()` lookup table | rt-math.js |
| **P1 (core)** | Add `nGonVerticesSymbolic(N, Q_R)` | rt-math.js |
| **P2 (integration)** | Symbolic path in `Primitives.polygon()` | rt-primitives.js |
| **P3 (nice-to-have)** | Unify with `PurePhi.Symbolic` (D=5) | rt-math.js |

### Decimal Tribute Count (before → after)

| Polygon | Current √ calls | After symbolic |
|---------|-----------------|----------------|
| Square  | 1 (slopeFromSpread) + 1 (circumradius) | **0** + 1 (circumradius via Q_R) |
| Triangle | 1 + 1 | **0** + 1 |
| Hexagon | 1 + 1 | **0** + 1 |
| Octagon | 1 + 1 | **0** + 1 |
| Dodecagon | 1 + 1 | **0** + 1 |
| Pentagon | 1 + 1 | 1 + 1 (float fallback) |
| Others | 1 + 1 | 1 + 1 (float fallback) |

The circumradius √ (R = √Q_R) is deferred into the toDecimal() call at
GPU boundary. The symbolic path eliminates the slopeFromSpread √ entirely
by using the cached slope decompositions.

---

*Analysis: Feb 2026, RT-compliance branch*
*Ref: Wildberger "Divine Proportions" Chapter 14, §14.5*
