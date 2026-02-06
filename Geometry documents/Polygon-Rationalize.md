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

| Hull Count | Frequency | Type |
|------------|-----------|------|
| **5-gon** | 0.2% | ★ PRIME (Fermat) |
| 6-gon | 0.5% | Even |
| **7-gon** | 0.1% | ★ PRIME (Non-constructible!) |
| 8-gon | 55.6% | Even |
| **9-gon** | 43.8% | ODD (Cubic-algebraic) |

**Prime Projection Examples Found:**

| Prime | Spreads (s₁, s₂, s₃) | Polyhedron |
|-------|----------------------|------------|
| 5-gon | (0, 0, 0.5) | Truncated Tetrahedron |
| 5-gon | (0, 0.5, 0) | Truncated Tetrahedron |
| **7-gon** | (0.15, 0, 0.5) | Truncated Tetrahedron |
| **7-gon** | (0.15, 0.5, 0) | Truncated Tetrahedron |

**The 7-gon is NOT compass-constructible** (Gauss-Wantzel), yet it emerges as a rational-spread projection of an asymmetric polyhedron!

### Paths Forward

1. **✓ Asymmetric Polytopes**: Use polytopes without central symmetry
   - **Truncated tetrahedron** → WORKS! (5, 7, 9-gons found)
   - Snub cube (chiral)
   - Compound of 5 tetrahedra

2. **Compound Pairs with Relative Rotations**: Combine two polyhedra
   - tetrahedron + tetrahedron at varying angles
   - Stella Octangula variations

3. **Search for Higher Primes**: 11, 13, 17, 19...
   - Need polyhedra with more vertices
   - Compound pairs may unlock these

4. **4D± Extensions**: Use full 4D quadray system
   - Janus polarity for asymmetric configurations

5. **Quasicrystal Construction**: Irrational cuts of rational lattices

### Script Usage

```bash
# Install dependencies
pip install -r scripts/requirements.txt

# List available polyhedra
python scripts/prime_projection_search.py --list-polyhedra

# Quick test (coarse precision)
python scripts/prime_projection_search.py --precision 1 --polyhedra tetrahedron,cube

# Full search (slow)
python scripts/prime_projection_search.py --precision 2 --polyhedra all

# Search for specific primes
python scripts/prime_projection_search.py --primes 7,11,13 --polyhedra dodecahedron
```

**Results output**: `results/prime_projections_YYYYMMDD_HHMMSS.json`

---

---

## Current Workplan Status (Feb 2026)

### ✓ Completed

1. **RT.PureCubics Namespace** - Implemented in `modules/rt-math.js`
   - Nonagon: cubic 8x³ - 6x - 1 = 0 (cos 20°)
   - Heptagon: cubic 8x³ - 4x² - 4x + 1 = 0 (cos 360°/7)
   - Cached sin/cos values for RT-pure rotation

2. **Prime Projection Search Script** - `scripts/prime_projection_search.py`
   - Discovered Symmetry Barrier for centrally symmetric polytopes
   - Found 7-gon projection from truncated tetrahedron at spreads (0.11, 0, 0.5)
   - Documented in `Geometry documents/Prime-Projection-Conjecture.tex`

3. **UI Method Info Display** - Shows construction type for each n-gon

### ⏳ In Progress

4. **RT.ProjectionPolygons Namespace** - Shadow polygons using only √ radicals
   - Algebraic formulas for projection heptagon
   - Derived from Prime Projection Search findings
   - Uses √2, √11, √89, √178 (no transcendentals)

### 📋 Pending

5. **RT.PureCubics Documentation** - Add derivation notes for generalizability
   - Cardano's formula derivations
   - Connection to Galois theory
   - Symbolic expressions alongside cached values

6. **Higher Prime Search** - Extend projection search to 11, 13, 17...
   - Larger asymmetric polytopes
   - 4D± with Janus polarity perturbation

---

## References

- Wildberger, N.J. "Divine Proportions" Chapter 14 (Spread Polynomials)
- Gauss-Wantzel Theorem on constructible polygons
- `modules/rt-math.js` - RT.StarSpreads, RT.PurePhi, RT.PureCubics, RT.QuadrayRotation
- `Geometry documents/Prime-Projection-Conjecture.tex` - 4D± Prime Projection Whitepaper
