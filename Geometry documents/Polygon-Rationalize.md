# Polygon Rationalization Workplan

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
| 5 | (5+√5)/8 | β | φ-Rational |
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

## References

- Wildberger, N.J. "Divine Proportions" Chapter 14 (Spread Polynomials)
- Gauss-Wantzel Theorem on constructible polygons
- `modules/rt-math.js` - RT.StarSpreads, RT.PurePhi, RT.QuadrayRotation
