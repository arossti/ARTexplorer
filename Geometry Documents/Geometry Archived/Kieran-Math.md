# ARTexplorer RT-Pure Formulas - Mathematical Review

**Purpose:** Reference document for mathematical review and optimization
**Reviewer:** Kieran Thomson
**Date Created:** 2025-12-26

**Task:** Check all formulas for potential algebraic simplifications or optimizations using golden ratio identities.

---

## Core Constants & Identities

### Golden Ratio φ (phi)

```javascript
const phi = 0.5 * (1 + Math.sqrt(5)); // φ ≈ 1.618033988749...
```

### Fundamental Golden Ratio Identities

```
φ² = φ + 1                    // Primary identity
φ³ = 2φ + 1                   // Derived from φ² = φ + 1
φ⁴ = 3φ + 2                   // Derived from φ³ = 2φ + 1
φ⁵ = 5φ + 3                   // Fibonacci pattern emerges

1/φ = φ - 1                   // Reciprocal identity
φ - 1/φ = 1                   // Related identity
φ + 1/φ = √5                  // Sum identity
```

**Note:** Any expression with φ can potentially be simplified using these identities.

---

## Rational Trigonometry Foundations

### Core RT Concepts

**Quadrance (Q):** Replaces "distance squared"

```
Q = (x₂ - x₁)² + (y₂ - y₁)² + (z₂ - z₁)²
```

**Spread (s):** Replaces "sin²θ"

```
s = 1 - ((v₁ · v₂)² / (Q₁ · Q₂))
```

### RT Principles Applied

1. ✅ Work in quadrance space (Q) throughout calculations
2. ✅ Only use √ for final visualization (deferred sqrt expansion)
3. ✅ Express all relationships algebraically (no trig functions)
4. ❌ NO Math.PI, Math.sin, Math.cos, Math.tan, Math.atan, etc.
5. ✅ Resolve rotations with Spread first vs. Angles for better rational results

---

## Rational Circle Parameterization

### Wildberger's Alternative to Sin/Cos

**Formula:** `Circle(t) = ((1 - t²) / (1 + t²), 2t / (1 + t²))`

**Key Properties:**

- Parameter `t` represents **angle/turns** (input parameter, NOT spread)
- Based on Weierstrass substitution: `t = tan(θ/2)` in traditional trigonometry
- Generates all points on the unit circle using **only rational operations** (addition, multiplication, division)
- Avoids transcendental functions entirely (no sin, cos, tan, atan)
- Maps all real numbers to the full circle: `t ∈ (-∞, ∞)` → full circle
- At `t = 0`: point is `(1, 0)` (positive x-axis)
- As `t → ∞`: point approaches `(-1, 0)` (negative x-axis)

### Distinguishing 't' from Spread

**IMPORTANT:** The parameter `t` is NOT the same as spread!

| Concept       | Symbol | Definition                       | Range             | Role                  |
| ------------- | ------ | -------------------------------- | ----------------- | --------------------- |
| **Parameter** | `t`    | Angle input (tan(θ/2))           | All reals (-∞, ∞) | INPUT to trace circle |
| **Spread**    | `s`    | Perpendicularity measure (sin²θ) | [0, 1]            | OUTPUT from geometry  |

**Example:**

```javascript
// Parameter t traces the circle
const t = 1.0;
const x = (1 - t * t) / (1 + t * t); // = 0
const y = (2 * t) / (1 + t * t); // = 1
// Point: (0, 1) - top of circle

// Spread measures perpendicularity from x-axis
const spread = 1 - x * x; // = 1 - 0 = 1 (perpendicular)
```

### Application to Rotation in ARTexplorer

**Current Problem:** Rotation code uses transcendental functions, violating RT principles.

**Current Implementation (ARTexplorer.html ~lines 3812-3813):**

```javascript
// ❌ NOT RT-PURE - Uses sin, asin, sqrt
const spreadValue = Math.sin(signedAngleRadians) * Math.sin(signedAngleRadians);
const snappedAngleRadians =
  Math.asin(Math.sqrt(Math.abs(snappedSpread))) * Math.sign(snappedSpread);
```

**RT-Pure Alternative Using Parameterization:**

**Option 1: Screen-space rotation (current approach - unavoidable atan2)**

```javascript
// Screen-space rotation inherently requires atan2 for angle calculation
// This is acceptable as it's at the UI boundary, not core geometry
const screenAngle = Math.atan2(screenDeltaY, screenDeltaX); // Unavoidable
```

**Option 2: Rational rotation for geometric calculations**

```javascript
// For purely algebraic rotation calculations (future use)
// Use parameter t instead of angle

// Given parameter t, get point on circle
const t = rotationParameter; // Input from user or calculation
const x = (1 - t * t) / (1 + t * t);
const y = (2 * t) / (1 + t * t);

// Extract spread directly from coordinates (no inverse trig!)
const spread = 1 - x * x; // Or: spread = y*y / (1 + y*y)

// This avoids: Math.sin(), Math.asin(), Math.sqrt() in spread calculations
```

**Benefits of Rational Approach:**

1. ✅ No transcendental functions (sin, cos, asin, sqrt)
2. ✅ Purely algebraic operations (multiply, add, divide)
3. ✅ Maintains RT purity for geometric calculations
4. ✅ Can work directly with spread values without angle conversion

**Limitation:**

- Initial angle extraction from screen coordinates still requires `atan2()` at UI boundary
- However, once we have parameter `t`, all subsequent calculations can be RT-pure

### Mathematical Derivation

**Why this works:**

Starting from traditional trigonometry with `t = tan(θ/2)`:

```
x = cos(θ) = (1 - tan²(θ/2)) / (1 + tan²(θ/2)) = (1 - t²) / (1 + t²)
y = sin(θ) = 2tan(θ/2) / (1 + tan²(θ/2)) = 2t / (1 + t²)
```

**Verify it traces a circle:**

```
x² + y² = [(1 - t²) / (1 + t²)]² + [2t / (1 + t²)]²
        = [(1 - t²)² + (2t)²] / (1 + t²)²
        = [1 - 2t² + t⁴ + 4t²] / (1 + t²)²
        = [1 + 2t² + t⁴] / (1 + t²)²
        = [(1 + t²)²] / (1 + t²)²
        = 1  ✓
```

**Extract spread from coordinates:**

```
spread = sin²(θ) = y² = [2t / (1 + t²)]² = 4t² / (1 + t²)²
```

Or equivalently:

```
spread = 1 - cos²(θ) = 1 - x² = 1 - [(1 - t²) / (1 + t²)]²
```

**Key Insight:** Once we have `(x, y)` from the rational parameterization, we can calculate spread directly from the coordinates without any inverse trigonometric functions!

### Future Integration Opportunities

**Where this could improve ARTexplorer:**

1. **Snap-to-spread calculations** (currently uses `Math.asin(Math.sqrt(spread))`)
   - Could use rational parameterization to find nearest `t` value for target spread
   - Requires solving: `4t² / (1 + t²)² = spread_target` for `t`

2. **Spread-based rotation constraints**
   - Work directly in `t` parameter space instead of angle/spread conversions
   - No transcendental functions needed for calculations

3. **Quaternion rotation from spread**
   - Convert spread → parameter `t` → quaternion components
   - Avoids sin/cos in quaternion construction

**Note:** Full integration would require refactoring rotation system to work with parameter `t` instead of angles. Current screen-space approach with `atan2()` is acceptable for UI interaction, but geometric calculations could be made RT-pure.

---

## Icosahedron Geometry

### Base Construction

**Vertices:** Located at cyclic permutations of `(0, ±a, ±b)` where:

```javascript
// Given OutSphere radius r_out (what user specifies as halfSize):
const phi = 0.5 * (1 + Math.sqrt(5));

a = r_out / Math.sqrt(phi + 2);
b = phi * a = (phi * r_out) / Math.sqrt(phi + 2);
```

**Simplification Check:**
Can `√(φ + 2)` be expressed using golden ratio identities?

```
φ + 2 = φ + 2
      = (φ² + φ + 1) - φ   // Since φ² = φ + 1
      = φ² + 1
```

So: `√(φ + 2) = √(φ² + 1)`

**Question:** Is there a simpler form?

### Vertex Quadrance Validation - uses for grid tesselation lock for all scaling polyhedra

```
Q_vertex = a² + b²
         = a²(1 + φ²)
         = a²(φ + 2)          // Using φ² = φ + 1
         = [r_out²/(φ+2)] · (φ+2)
         = r_out²             // ✓ Confirms OutSphere
```

---

## Geodesic Sphere Projections - CRITICAL FORMULAS

### Icosahedron: OutSphere (Circumsphere)

**Passes through all vertices.**

```javascript
// User specifies this radius as halfSize
Q_out = halfSize * halfSize;
```

**Quadrance Ratio:** `Q_out/Q_out = 1` (trivial)

---

### Icosahedron: MidSphere (Midsphere)

**Tangent to all edge midpoints.**

**Current Implementation:**

```javascript
const phi = 0.5 * (1 + Math.sqrt(5));
const ratio_mid_sq = (phi + 1) / (phi + 2);
Q_mid = Q_out * ratio_mid_sq;
```

**Derivation:**

```
Edge midpoint example: midpoint of vertices (0, a, b) and (a, b, 0)
Midpoint = (a/2, (a+b)/2, b/2)

Q_mid = (a/2)² + ((a+b)/2)² + (b/2)²
      = (a² + (a+b)² + b²) / 4
      = (a² + a² + 2ab + b² + b²) / 4
      = (2a² + 2ab + 2b²) / 4
      = (a² + ab + b²) / 2

Substitute b = φ·a:
Q_mid = (a² + a·φa + φ²a²) / 2
      = a²(1 + φ + φ²) / 2

Using φ² = φ + 1:
Q_mid = a²(1 + φ + φ + 1) / 2
      = a²(2φ + 2) / 2
      = a²(φ + 1)

Since a² = r_out² / (φ + 2):
Q_mid = r_out² · (φ + 1) / (φ + 2)
```

**Quadrance Ratio:**

```
Q_mid/Q_out = (φ + 1) / (φ + 2)
            = φ² / (φ + 2)      // Using φ² = φ + 1
```

**Numerical Check:**

```
φ ≈ 1.618
φ + 1 ≈ 2.618
φ + 2 ≈ 3.618
Ratio ≈ 2.618/3.618 ≈ 0.7236
√0.7236 ≈ 0.8507 (radius ratio)
```

**QUESTION FOR KIERAN:**
Can `(φ + 1) / (φ + 2)` be simplified further? Or is `φ² / (φ + 2)` the canonical form?

---

### Icosahedron: InSphere (Insphere)

**Tangent to all face planes (perpendicular distance from origin to faces).**

**Current Implementation:**

```javascript
const phi = 0.5 * (1 + Math.sqrt(5));
const ratio_in_sq = (3 * phi + 2) / (3 * (phi + 2));
Q_in = Q_out * ratio_in_sq;
```

**Derivation:**

Sample face with vertices: `v0 = (0, a, b)`, `v4 = (a, b, 0)`, `v8 = (b, 0, a)`

**Step 1: Face normal (cross product)**

```
v1 - v0 = (a, b-a, -b)
v2 - v0 = (b, -a, a-b)

Normal n = (v1-v0) × (v2-v0)
         = |  i      j      k    |
           |  a    b-a    -b     |
           |  b    -a    a-b     |

n_x = (b-a)(a-b) - (-b)(-a) = -(b-a)² - ab
n_y = (-b)(b) - (a)(a-b) = -b² - a(a-b) = -b² - a² + ab
n_z = (a)(-a) - (b-a)(b) = -a² - b(b-a) = -a² - b² + ab

By symmetry of regular icosahedron, face normal direction is (1, 1, 1).
Normalized: n̂ = (1, 1, 1) / √3
```

**Step 2: Perpendicular distance to face plane**

```
Face center = (v0 + v1 + v2) / 3
            = ((a+b)/3, (a+b)/3, (a+b)/3)
            = (a+b)/3 · (1, 1, 1)

Distance d = |face_center · n̂|
           = |(a+b)/3 · (1,1,1) · (1,1,1)/√3|
           = |(a+b)/3 · 3/√3|
           = (a+b) / √3

Q_in = d²
     = [(a+b) / √3]²
     = (a+b)² / 3
```

**Step 3: Substitute b = φ·a**

```
Q_in = (a + φa)² / 3
     = a²(1 + φ)² / 3
     = a²φ⁴ / 3         // Using (1 + φ)² = φ² · φ² = φ⁴

Wait, let me verify: (1 + φ)² = 1 + 2φ + φ²
                              = 1 + 2φ + φ + 1    // Using φ² = φ + 1
                              = 2 + 3φ

So:
Q_in = a²(2 + 3φ) / 3
```

**Step 4: Substitute a² = r_out² / (φ + 2)**

```
Q_in = [r_out² / (φ + 2)] · (2 + 3φ) / 3
     = r_out² · (2 + 3φ) / [3(φ + 2)]
```

**Quadrance Ratio:**

```
Q_in/Q_out = (2 + 3φ) / [3(φ + 2)]
           = (3φ + 2) / [3(φ + 2)]    // Reordered terms
```

**Alternative form using φ⁴:**

```
Since (1 + φ)² = φ² · φ² and we need to express (3φ + 2):
φ⁴ = 3φ + 2              // From identity list

So: Q_in/Q_out = φ⁴ / [3(φ + 2)]
```

**Numerical Check:**

```
φ ≈ 1.618
3φ + 2 ≈ 3(1.618) + 2 = 4.854 + 2 = 6.854
3(φ + 2) ≈ 3(3.618) = 10.854
Ratio ≈ 6.854/10.854 ≈ 0.6315
√0.6315 ≈ 0.7947 (radius ratio)
```

**CRITICAL QUESTION FOR KIERAN:**

You suggested simplifications during our conversation:

1. First attempt: `9 / (7φ)`
2. Second attempt: `9 / 7`

Let me check these numerically:

```
9/(7φ) ≈ 9/(7·1.618) ≈ 9/11.326 ≈ 0.7947   // This is the RADIUS ratio!
(9/(7φ))² ≈ 0.6316                          // This is the QUADRANCE ratio!

Our formula: (3φ + 2) / [3(φ + 2)] ≈ 0.6315  // Matches!
```

**So the question is:** Can we prove algebraically that:

```
(3φ + 2) / [3(φ + 2)] = (9 / (7φ))²
```

Or equivalently (for radius):

```
√[(3φ + 2) / [3(φ + 2)]] = 9 / (7φ)
```

**ANSWER (2025-12-28):**

❌ **NO - These expressions are NOT algebraically equal.**

**Proof by algebraic expansion:**

Starting with right side:

```
(9 / (7φ))² = 81 / (49φ²)
```

Using φ² = φ + 1:

```
= 81 / (49(φ + 1))
= 81 / (49φ + 49)
```

Left side:

```
(3φ + 2) / [3(φ + 2)] = (3φ + 2) / (3φ + 6)
```

Testing equality by cross-multiplication:

```
81(3φ + 6) ≟ (3φ + 2)(49φ + 49)
243φ + 486 ≟ 147φ² + 147φ + 98φ + 98
243φ + 486 ≟ 147φ² + 245φ + 98
```

Substituting φ² = φ + 1:

```
243φ + 486 ≟ 147(φ + 1) + 245φ + 98
243φ + 486 ≟ 147φ + 147 + 245φ + 98
243φ + 486 ≟ 392φ + 245
```

**Result:**

```
243φ + 486 ≠ 392φ + 245
```

The numerical similarity (both ≈ 0.6315) was **coincidental**. The correct formula remains:

✅ **`Q_in/Q_out = (3φ + 2) / [3(φ + 2)]`**

No code simplification possible. Current implementation is correct.

---

### Tetrahedron Sphere Projections

**Tetrahedron vertices:** Alternating corners of cube at `(±s, ±s, ±s)` where signs follow pattern:

```
(-s, -s, -s)  // vertex 0: (-, -, -)
( s,  s, -s)  // vertex 1: (+, +, -)
( s, -s,  s)  // vertex 2: (+, -, +)
(-s,  s,  s)  // vertex 3: (-, +, +)
```

**CRITICAL:** NOT `(1,1,1), (1,1,-1), (1,-1,1), (-1,1,1)` - that would contain 90° angles!

#### Tetrahedron: Vertex Quadrance (OutSphere)

**For unit cube (s = 1):**

```
Q_vertex = (-1)² + (-1)² + (-1)² = 3
r_vertex = √3
```

**For halfSize = s:**

```
Q_out = 3s²
r_out = s√3
```

#### Tetrahedron: Edge Quadrance

**Edge example:** From `(-s, -s, -s)` to `(s, s, -s)`

```
Δx = s - (-s) = 2s
Δy = s - (-s) = 2s
Δz = -s - (-s) = 0

Q_edge = (2s)² + (2s)² + 0² = 8s²
edge_length = 2s√2
```

**All 6 edges have Q_edge = 8s² (regular tetrahedron)**

#### Tetrahedron: MidSphere (Tangent to Edge Midpoints)

**Edge midpoint example:** Midpoint of `(-s,-s,-s)` and `(s,s,-s)`:

```
midpoint = (0, 0, -s)

Q_mid = 0² + 0² + (-s)² = s²
r_mid = s
```

**Ratio:**

```
Q_mid/Q_out = s² / (3s²) = 1/3
r_mid/r_out = s / (s√3) = 1/√3
```

```javascript
const ratio_mid_sq = 1 / 3;
Q_mid = 3 * halfSize * halfSize * ratio_mid_sq;
// Simplifies to: Q_mid = halfSize²
```

#### Tetrahedron: InSphere (Tangent to Face Planes)

**Face example:** Triangle with vertices `[(-s,-s,-s), (s,s,-s), (s,-s,s)]`

**Face center (centroid):**

```
center = [(-s+s+s)/3, (-s+s-s)/3, (-s-s+s)/3]
       = (s/3, -s/3, -s/3)

Q_center = (s/3)² + (-s/3)² + (-s/3)²
         = 3(s/3)²
         = s²/3

r_center = s/√3
```

But this is distance to face CENTER, not perpendicular distance to face PLANE.

**Perpendicular distance to face (InSphere radius):**
For regular tetrahedron: `r_in/r_out = 1/3`

```
r_in = (s√3) / 3 = s/√3 · (1/3) = s√3/3
Q_in = (s√3/3)² = 3s²/9 = s²/3
```

**Ratio:**

```
Q_in/Q_out = (s²/3) / (3s²) = 1/9
r_in/r_out = (s√3/3) / (s√3) = 1/3
```

```javascript
const ratio_in_sq = 1 / 9;
Q_in = 3 * halfSize * halfSize * ratio_in_sq;
// Simplifies to: Q_in = (1/3) * halfSize²
```

**Ratios Summary:**

```
Q_out : Q_mid : Q_in = 3s² : s² : (s²/3)
                     = 3 : 1 : (1/3)
                     = 9 : 3 : 1      // Integer ratio!

r_out : r_mid : r_in = s√3 : s : (s√3/3)
                     = √3 : 1 : (√3/3)
                     = √3 : 1 : (1/√3)
```

**QUESTION FOR KIERAN:**
Tetrahedron ratios are purely rational (9:3:1 for quadrances). No golden ratio involvement - correct?

---

### Octahedron Sphere Projections

**Octahedron vertices:** `(±s, 0, 0)`, `(0, ±s, 0)`, `(0, 0, ±s)`

#### Octahedron: OutSphere

```javascript
// Circumsphere through vertices
// Q_vertex = s² (each vertex is distance s from origin)
Q_out = halfSize * halfSize; // s²
```

#### Octahedron: MidSphere

```javascript
// Midsphere tangent to edge midpoints
// Edge midpoint example: midpoint of (s,0,0) and (0,s,0) = (s/2, s/2, 0)
// Q_mid = (s/2)² + (s/2)² = s²/2
// Ratio: Q_mid/Q_out = (s²/2) / s² = 1/2
const ratio_mid_sq = 1 / 2;
Q_mid = Q_out * ratio_mid_sq;
```

#### Octahedron: InSphere

```javascript
// Insphere tangent to face planes
// For regular octahedron: r_in/r_out = 1/√3
// Q_in/Q_out = (1/√3)² = 1/3
const ratio_in_sq = 1 / 3;
Q_in = Q_out * ratio_in_sq;
```

**Ratios Summary:**

```
Q_out : Q_mid : Q_in = 1 : (1/2) : (1/3)
                     = 6 : 3 : 2      // Integer ratio!
```

**QUESTION FOR KIERAN:**
Octahedron ratios are all simple fractions. Any connection to φ, or purely rational?

---

## Edge Quadrance Calculations

### Edge Quadrance Formula (3D)

```javascript
// RT.edgeQuadrance(v1, v2)
const dx = v2.x - v1.x;
const dy = v2.y - v1.y;
const dz = v2.z - v1.z;
return dx * dx + dy * dy + dz * dz;
```

### Expected Edge Quadrances

**Cube (halfSize = s):**

```
Q_edge = 4s²              // Edge length = 2s
```

**Tetrahedron (halfSize = s):**

```
Vertices at (±1, ±1, ±1) scaled to circumsphere radius s√3
Edge example: (1,1,1) to (1,-1,-1)
Q_edge = (0)² + (2)² + (2)² = 8
Scaled: Q_edge = 8s² for circumsphere radius s√3
        Q_edge = 8·(s²/3) for halfSize s
```

**Icosahedron (halfSize = s):**

```
Edge quadrance in terms of a, b:
Q_edge = (varies, but should be constant for regular icosahedron)

Need to verify: What is Q_edge for icosahedron with r_out = s?
```

**QUESTION FOR KIERAN:**
What is the edge quadrance for a regular icosahedron in terms of OutSphere radius?

---

## Geodesic Subdivision

### Barycentric Subdivision (Frequency f)

**Subdivides each triangular face into f² smaller triangles.**

```javascript
// For each face triangle with vertices v0, v1, v2:
// Generate grid of points using barycentric coordinates

for (let i = 0; i <= freq; i++) {
  for (let j = 0; j <= freq - i; j++) {
    const k = freq - i - j;

    // Barycentric weights (sum to freq)
    const u = i / freq; // Weight for v0
    const v = j / freq; // Weight for v1
    const w = k / freq; // Weight for v2

    // Interpolated vertex
    const x = u * v0.x + v * v1.x + w * v2.x;
    const y = u * v0.y + v * v1.y + w * v2.y;
    const z = u * v0.z + v * v1.z + w * v2.z;
  }
}
```

**No optimization needed here - purely linear interpolation (RT-pure by nature).**

---

## Sphere Projection (Normalization)

### Current Implementation

```javascript
// Given target quadrance Q_target and subdivided vertex v:
const Q_current = v.x * v.x + v.y * v.y + v.z * v.z;
const scale = Math.sqrt(Q_target / Q_current);

v_projected = {
  x: v.x * scale,
  y: v.y * scale,
  z: v.z * scale,
};
```

### RT-Pure Verification

**Is this RT-pure?**

- ✅ Q_current calculated directly (no sqrt)
- ✅ Q_target calculated from algebraic formula
- ⚠️ Uses ONE sqrt for final projection (deferred sqrt expansion - acceptable in RT)

**Alternative formulation (avoid normalization language):**

```javascript
// Scale vertex to target quadrance
const Q_current = v.x² + v.y² + v.z²;
const scale_squared = Q_target / Q_current;
const scale = Math.sqrt(scale_squared);  // Deferred sqrt - only used once
```

---

## Optimization Review - COMPLETED (2025-12-26)

### Kieran's Analysis & Recommendations:

1. **Icosahedron InSphere Formula:**
   - Current: `Q_in/Q_out = (3φ + 2) / [3(φ + 2)]`
   - Proposed: `Q_in/Q_out = (9/(7φ))²` or equivalent
   - **✅ VERIFIED:** Formulas are **NOT equal**. Keep current form `(3φ + 2) / [3(φ + 2)]`
   - **Rationale:** Maintains computational accuracy and avoids unnecessary algebraic complexity

2. **Icosahedron MidSphere Formula:**
   - Current: `Q_mid/Q_out = (φ + 1) / (φ + 2)`
   - Alternative: `Q_mid/Q_out = φ² / (φ + 2)`
   - **✅ OPTIMAL:** Current formula `(φ + 1) / (φ + 2)` is best
   - **Rationale:** Avoids error induced by squaring φ; lower order in φ is computationally optimal

3. **Icosahedron Base Construction:**
   - Current: `a = r_out / √(φ + 2)` and `b = φ·a`
   - Alternative: `a = r_out / √(φ² + 1)`
   - **✅ OPTIMAL:** Keep as `√(φ + 2)`
   - **Rationale:** Lower order in φ; square root cannot be cancelled due to the constant term

4. **Golden Ratio Higher Powers:**
   - We use: `φ² = φ + 1`, `φ⁴ = 3φ + 2`
   - Question: Can identities simplify expressions like `(3φ + 2) / (3φ + 6)`?
   - **✅ NO SIMPLIFICATION:** Provided identities do not simplify these ratios
   - **Rationale:** Would increase the order in φ without potential for cancellation; not computationally optimal

5. **Tetrahedron & Octahedron:**
   - Currently use simple rational fractions (1/2, 1/3, 1/9, etc.)
   - **✅ CORRECT:** These are purely integer ratios, no golden ratio involvement
   - **Rationale:** Radius to face, edge, and vertex of any single polyhedron can be related using midpoint formulas without invoking φ

6. **Denesting Square Roots:**
   - Question: Can expressions like `√(φ + 2)` be denested?
   - **✅ NO DENESTING:** Choose lowest order in φ
   - **Rationale:** Square root cannot be cancelled due to the constant; lower order minimizes numerical error

### Summary of Recommendations:

**ALL CURRENT FORMULAS ARE OPTIMAL - NO CHANGES NEEDED**

The implementation in ARTexplorer.html uses the most computationally efficient forms:

- ✅ Lowest order in golden ratio φ
- ✅ Minimal numerical error propagation
- ✅ Avoids unnecessary algebraic complexity
- ✅ Maintains RT purity (quadrance-based calculations)

**Key Principle:** When working with φ expressions, prefer **lowest order** forms (e.g., `φ + 1` over `φ²`) to minimize:

1. Floating-point error accumulation
2. Computational complexity
3. Expression evaluation cost

---

## Code Implementation Locations

### Current Formulas in ARTexplorer.html

**Icosahedron Geodesic (lines 1273-1294):**

```javascript
} else if (projection === 'in') {
  const phi = 0.5 * (1 + Math.sqrt(5));
  const ratio_in_sq = (3 * phi + 2) / (3 * (phi + 2));
  Q_target = (halfSize * halfSize) * ratio_in_sq;
} else if (projection === 'mid') {
  const phi = 0.5 * (1 + Math.sqrt(5));
  const ratio_mid_sq = (phi + 1) / (phi + 2);
  Q_target = (halfSize * halfSize) * ratio_mid_sq;
}
```

**Tetrahedron Geodesic (lines ~1314-1381)**
**Octahedron Geodesic (lines ~1382-1450)**

---

## Testing & Validation

### Numerical Verification Values

**Icosahedron (OutSphere radius = 1):**

```
φ ≈ 1.6180339887
φ + 1 ≈ 2.6180339887
φ + 2 ≈ 3.6180339887
3φ + 2 ≈ 6.8541019662

Q_mid/Q_out ≈ 2.618/3.618 ≈ 0.7236
Q_in/Q_out ≈ 6.854/10.854 ≈ 0.6315

r_mid/r_out ≈ √0.7236 ≈ 0.8507
r_in/r_out ≈ √0.6315 ≈ 0.7947
```

**Tetrahedron (halfSize s = 1, OutSphere radius = √3):**

```
Vertices: Alternating cube corners (±1, ±1, ±1) with sign pattern
Q_out = 3s² = 3
Q_mid = s² = 1
Q_in = s²/3 = 1/3

r_out = s√3 = √3 ≈ 1.7321
r_mid = s = 1
r_in = s/√3 ≈ 0.5774

Q_mid/Q_out = 1/3
Q_in/Q_out = 1/9

r_mid/r_out = 1/√3 ≈ 0.5774
r_in/r_out = 1/3 ≈ 0.3333
```

**Octahedron (OutSphere radius = 1):**

```
Q_out = 1
Q_mid = 1/2
Q_in = 1/3

r_mid/r_out = 1/√2 ≈ 0.7071
r_in/r_out = 1/√3 ≈ 0.5774
```

---

## Review Completion Summary

**Reviewer:** Kieran Thomson
**Date:** 2025-12-26
**Status:** ✅ ALL QUESTIONS ANSWERED

### Questions & Answers:

1. **Can you prove algebraically that `(3φ + 2) / [3(φ + 2)] = (9/(7φ))²`?**
   - ❌ **NOT EQUAL** - Keep current formula `(3φ + 2) / [3(φ + 2)]`

2. **Is `(φ + 1) / (φ + 2)` or `φ² / (φ + 2)` the better form for MidSphere?**
   - ✅ **`(φ + 1) / (φ + 2)` is optimal** - Avoids error from squaring φ

3. **Can `√(φ + 2)` be simplified using golden ratio identities?**
   - ✅ **Keep as `√(φ + 2)`** - Lower order in φ minimizes numerical error

4. **Are there any denesting opportunities?**
   - ✅ **No denesting possible** - Lowest order forms are already optimal

5. **General optimization suggestions?**
   - ✅ **All current formulas are optimal** - No changes needed

### Key Finding:

**"Choose lowest order in φ for optimal computation"**

When multiple equivalent forms exist (e.g., `φ + 1` vs `φ²`), always prefer the form with the lowest power of φ to:

- Minimize floating-point error accumulation
- Reduce computational complexity
- Improve numerical stability

---

**END OF MATHEMATICAL REFERENCE - REVIEW COMPLETE**

**Conclusion:**
All formulas in ARTexplorer.html are mathematically optimal and computationally efficient. No code changes required.
