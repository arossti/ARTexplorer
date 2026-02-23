# 4D Gimbal Lock Avoidance: Quadray Rotors

**Branch:** `Tetrahelix`
**Date:** 2026-02-03
**Status:** Active Research
**Related:** [4D-COORDINATES.md](4D-COORDINATES.md), [rt-math.js](../modules/rt-math.js)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [The Gimbal Lock Problem](#2-the-gimbal-lock-problem)
3. [Topological Foundations](#3-topological-foundations)
4. [Quadray vs Quaternion Topology](#4-quadray-vs-quaternion-topology)
5. [Spread-Quadray Rotors: A Novel Approach](#5-spread-quadray-rotors-a-novel-approach)
6. [RT-Pure Rotation Mathematics](#6-rt-pure-rotation-mathematics)
7. [The Tetrahedral Rotation Matrix](#7-the-tetrahedral-rotation-matrix)
8. [Exact Rational Rotations](#8-exact-rational-rotations)
9. [The Janus Polarity Extension](#9-the-janus-polarity-extension)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [References](#11-references)

---

## 1. Introduction

This document explores a potentially novel approach to 3D rotation representation: **Spread-Quadray Rotors**. By combining:

- **Full 4D Quadray coordinates** (without zero-sum constraint)
- **Rational Trigonometry** (spread/cross instead of sin/cos)
- **Weierstrass parametrization** (algebraic circle points)
- **Janus polarity** (discrete dimensional state)

...we may arrive at a rotation system that is:

1. **Gimbal-lock free** (like quaternions)
2. **Algebraically exact** (unlike quaternions for most angles)
3. **Geometrically native** to tetrahedral structures
4. **Topologically explicit** about its double-cover

This is not merely "quaternions in different clothing" but a fundamentally different algebraic structure arising from tetrahedral geometry and Rational Trigonometry principles.

---

## 2. The Gimbal Lock Problem

### 2.1 What is Gimbal Lock?

Gimbal lock occurs when two rotation axes align, causing a **loss of one degree of freedom**. In Euler angle representation (pitch, yaw, roll), this happens at ±90° pitch — the system loses the ability to distinguish yaw from roll.

**Physical Analogy:** A camera gimbal with three nested rings. When the middle ring rotates 90°, the inner and outer rings become parallel — you can no longer independently control two of the three rotations.

### 2.2 Why It Matters

- **Animation:** Interpolating between orientations near gimbal lock produces erratic motion
- **Robotics:** Control systems can become unstable
- **Aerospace:** Apollo 11's guidance computer nearly encountered gimbal lock
- **3D Graphics:** SLERP (spherical linear interpolation) requires quaternions to avoid artifacts

### 2.3 Gimbal Lock Depends on Rotation Order

Gimbal lock occurs when the **middle axis** of a rotation order reaches ±90°. Different Euler angle conventions have singularities at different locations:

| Rotation Order | Lock Occurs When | Singularity Location |
|---------------|------------------|---------------------|
| XYZ, ZYX | Y = ±90° | ±Y poles |
| YXZ, ZXY | X = ±90° | ±X poles |
| XZY, YZX | Z = ±90° | ±Z poles |

A complete visualization of all Euler singularities would show **six regions**—one at each face center of an inscribed cube. The current ARTexplorer demo shows Y-axis poles (XYZ order), but a future enhancement could display all six zones with selectable rotation orders.

### 2.3 The Standard Solution: Quaternions

Quaternions avoid gimbal lock by using **4 parameters** constrained to a **3-sphere** (S³):

```
q = q₀ + q₁i + q₂j + q₃k
where: q₀² + q₁² + q₂² + q₃² = 1
```

This works because S³ is a **simply connected** manifold — any two orientations can be connected by a continuous path without passing through a singularity.

**But quaternions have limitations:**
- Require transcendental functions (sin, cos) for most angle values
- The unit norm constraint requires renormalization after composition
- The double-cover (q and -q represent same rotation) is implicit, not explicit

---

## 3. Topological Foundations

### 3.1 Why 3 Parameters Aren't Enough

The space of 3D rotations is **SO(3)** — a 3-dimensional manifold that is **not simply connected**. Topologically, SO(3) is equivalent to RP³ (real projective 3-space), which has a "twist" that prevents global singularity-free parameterization with only 3 numbers.

**The Hairy Ball Theorem** (generalized): You cannot comb a hairy ball flat without creating at least one cowlick. Similarly, you cannot parameterize SO(3) with 3 continuous parameters without creating at least one singularity.

### 3.2 The Lift to 4D

The solution is to **lift** from SO(3) to a higher-dimensional space:

| Space | Dimension | Topology | Singularities |
|-------|-----------|----------|---------------|
| SO(3) | 3 | RP³ (twisted) | Unavoidable |
| S³ | 3-sphere in ℝ⁴ | Simply connected | None |
| ℝ⁴ | 4D Euclidean | Simply connected | None |

Both S³ (quaternions) and ℝ⁴ (full Quadray) provide this lift, but with different geometric structures.

### 3.3 The Key Insight

> *"Canonical singularity-free orientation representation requires 4 free parameters, not just 3."*

The question is not **whether** to use 4 parameters, but **how** to structure them:
- Quaternions: 4 parameters on S³ (unit sphere constraint)
- Full Quadray: 4 parameters in ℝ⁴ (no constraint)

---

## 4. Quadray vs Quaternion Topology

### 4.1 Comparison Table

| Representation | Scalars | Constraint | Manifold | Composition | Lift | Gimbal Lock |
|----------------|---------|------------|----------|-------------|------|-------------|
| Euler angles | 3 | None | SO(3) chart | Sequential | None | **Yes** |
| Quadray (zero-sum) | 4→3 | w+x+y+z = k | SO(3) chart | Sequential | None | **Yes** |
| **Quadray (full 4D)** | 4 | None | ℝ⁴ | Algebraic | Implicit ℝ⁴ | **No**\* |
| Quaternions | 4 | ‖q‖ = 1 | S³ | Hamilton product | Explicit Spin(3) | **No** |

\* *Gimbal lock avoided provided the 4 scalars parameterize orientation directly and are not reduced back to a 3-parameter chart.*

### 4.2 The Zero-Sum Trap

**Critical distinction:** When we enforce W + X + Y + Z = constant, we **project** 4D Quadray back to 3D. This projection reintroduces the SO(3) topology and its inherent singularities.

```
Full Quadray (ℝ⁴)  ──[zero-sum constraint]──>  Projected Quadray (ℝ³) ≅ SO(3)
      ↓                                                    ↓
  No gimbal lock                                      Gimbal lock!
```

**The zero-sum constraint is a projection, not a necessity.** To avoid gimbal lock, we must work in the full 4D space.

### 4.3 Why Full Quadray Differs from Quaternions

| Aspect | Quaternions | Full Quadray |
|--------|-------------|--------------|
| Basis geometry | Orthogonal (90° between i,j,k) | Tetrahedral (109.47° between W,X,Y,Z) |
| Constraint | Unit norm (forces onto S³) | None (free in ℝ⁴) |
| Double-cover | Implicit (q ≡ -q) | Explicit (Janus polarity bit) |
| Composition | Hamilton product | Tetrahedral rotation matrices |
| Interpolation | SLERP on S³ | Linear in ℝ⁴ (simpler!) |

---

## 5. Spread-Quadray Rotors: A Novel Approach

### 5.1 The Core Concept

Instead of using angle θ with sin/cos, we use:

- **Spread** s = sin²(θ) — a rational value for many useful angles
- **Cross** c = cos²(θ) = 1 - s — the complementary measure
- **Weierstrass parameter** t — generates exact rational sin/cos values

### 5.2 Definition: Spread-Quadray Rotor

A **Spread-Quadray Rotor** R is defined as:

```
R = (W, X, Y, Z, ±) ∈ ℝ⁴ × Z₂
```

Where:
- (W, X, Y, Z) are four independent scalars (no zero-sum constraint)
- ± is the **Janus polarity** (discrete: positive or negative dimensional space)

**Rotor parameters derived from spread:**
```
Given spread s and Weierstrass parameter t:

  t = √(s / (1-s))           (parameter from spread)
  cos(θ) = (1 - t²)/(1 + t²)  (algebraic, no transcendentals!)
  sin(θ) = 2t/(1 + t²)        (algebraic, no transcendentals!)
```

### 5.3 Why "Rotor" Not "Quaternion"

We deliberately avoid calling these "Quadray quaternions" because:

1. **Different algebra:** Quaternions use Hamilton multiplication (ij = k, etc.). Quadray rotors use tetrahedral rotation matrices.

2. **Different constraint:** Quaternions require ‖q‖ = 1. Quadray rotors have no norm constraint.

3. **Different topology:** Quaternions live on S³. Quadray rotors live in ℝ⁴ × Z₂.

4. **Different exactness:** Quaternions require transcendentals for most angles. Quadray rotors can be exact rational for many useful rotations.

---

## 6. RT-Pure Rotation Mathematics

### 6.1 Spread and Cross

From Wildberger's Rational Trigonometry:

```
Spread:  s = sin²(θ)     (measures "perpendicularity": 0=parallel, 1=perpendicular)
Cross:   c = cos²(θ)     (complementary measure)

Fundamental identity: s + c = 1
```

**Key insight:** Spread is often a **rational number** even when sin(θ) is irrational.

| Angle θ | sin(θ) | cos(θ) | Spread s | Cross c |
|---------|--------|--------|----------|---------|
| 0° | 0 | 1 | 0 | 1 |
| 30° | 1/2 | √3/2 | **1/4** | **3/4** |
| 45° | √2/2 | √2/2 | **1/2** | **1/2** |
| 60° | √3/2 | 1/2 | **3/4** | **1/4** |
| 90° | 1 | 0 | **1** | **0** |

### 6.2 Weierstrass Parametrization

The Weierstrass substitution provides **algebraic** circle points:

```
t = tan(θ/2)  — the parameter

cos(θ) = (1 - t²) / (1 + t²)
sin(θ) = 2t / (1 + t²)
```

**RT-Pure benefit:** For any **rational t**, both cos(θ) and sin(θ) are **exact rational values**.

From `rt-math.js`:
```javascript
RT.circleParam = t => {
  const tSquared = t * t;
  const denominator = 1 + tSquared;
  return {
    x: (1 - tSquared) / denominator,  // cos(θ) — algebraic!
    y: (2 * t) / denominator,         // sin(θ) — algebraic!
  };
};
```

### 6.3 From Spread to Weierstrass Parameter

```
Given spread s, find parameter t:

  s = sin²(θ) = [2t/(1+t²)]² = 4t²/(1+t²)²

Solving for t:
  s(1 + t²)² = 4t²
  s·t⁴ + (2s - 4)t² + s = 0

Using quadratic formula with u = t²:
  u = [4 - 2s ± √(16 - 16s)] / (2s)
  u = [2 - s ± 2√(1-s)] / s

Therefore:
  t = √u = √[(2 - s + 2√(1-s)) / s]  (taking positive root)
```

For exact rational spreads, this often simplifies beautifully.

---

## 7. The Tetrahedral Rotation Matrix

### 7.1 Tom Ace's Quadray Rotation Formula

Rotation about a Quadray axis uses coefficients F, G, H:

```
Classical form (using angle θ):
  F = (2·cos(θ) + 1) / 3
  G = (2·cos(θ - 120°) + 1) / 3
  H = (2·cos(θ + 120°) + 1) / 3
```

### 7.2 RT-Pure Form (using spread)

```javascript
function rotationCoeffsFromSpread(s) {
  // Get cos/sin from spread via Weierstrass
  const c = 1 - s;  // cross = cos²(θ)
  const cosTheta = Math.sqrt(c);  // Deferred √ until needed
  const sinTheta = Math.sqrt(s);

  // 120° offsets (exact rationals!)
  const cos120 = -0.5;       // -1/2 exactly
  const sin120 = Math.sqrt(0.75);  // √(3/4)

  // Compute F, G, H
  const F = (2 * cosTheta + 1) / 3;
  const G = (2 * (cosTheta * cos120 + sinTheta * sin120) + 1) / 3;
  const H = (2 * (cosTheta * cos120 - sinTheta * sin120) + 1) / 3;

  return { F, G, H };
}
```

### 7.3 The 4×4 Rotation Matrix

Rotation about the W-axis by spread s:

```
     | 1  0  0  0 |
R =  | 0  F  H  G |
     | 0  G  F  H |
     | 0  H  G  F |
```

**Note the circulant structure** — this reflects the tetrahedral symmetry where all non-axis coordinates are treated equivalently.

### 7.4 Rotation Application

```javascript
function rotateAboutW(point, spread) {
  const { F, G, H } = rotationCoeffsFromSpread(spread);

  return [
    point[0],  // W unchanged (rotation axis)
    F * point[1] + H * point[2] + G * point[3],
    G * point[1] + F * point[2] + H * point[3],
    H * point[1] + G * point[2] + F * point[3],
  ];
}
```

---

## 8. Exact Rational Rotations

### 8.1 The Gold Standard: Integer Spread Rotations

For certain angles, spread and cross are **exact rationals**, enabling algebraically exact rotation:

| Rotation | Spread (s) | Cross (c) | F | G | H | Notes |
|----------|------------|-----------|---|---|---|-------|
| 0° | 0 | 1 | 1 | 0 | 0 | Identity |
| 30° | 1/4 | 3/4 | (√3+1)/3 | ... | ... | — |
| 45° | 1/2 | 1/2 | (√2+1)/3 | ... | ... | Exact spread! |
| 60° | 3/4 | 1/4 | 2/3 | (√3+1)/6 | (1-√3)/6 | Tetrahedral |
| 90° | 1 | 0 | 1/3 | (√3+1)/3 | (1-√3)/3 | Quarter turn |
| 120° | 3/4 | 1/4 | 0 | 1/3 | 1/3 | **All rational!** |
| 180° | 0 | 1 | -1/3 | 2/3 | 2/3 | **All rational!** |

### 8.2 Special Case: 120° Rotation (Tetrahedral Symmetry)

At 120°, the rotation coefficients become beautifully simple:

```
F = 0, G = 1/3, H = 1/3

Matrix:
| 1  0    0    0   |
| 0  0    1/3  1/3 |
| 0  1/3  0    1/3 |
| 0  1/3  1/3  0   |
```

This is a **cyclic permutation** of the non-axis coordinates — pure tetrahedral symmetry!

### 8.3 Special Case: 180° Rotation (Janus Inversion)

At 180°, we get another exact rational matrix:

```
F = -1/3, G = 2/3, H = 2/3
```

This represents the **Janus Point passage** — inversion through the origin from 4D+ to 4D- space.

---

## 9. The Janus Polarity Extension

### 9.1 Beyond Continuous Parameters

Quaternions have an implicit double-cover: both q and -q represent the same rotation. This is mathematically elegant but can cause confusion (interpolation taking the "long way around").

Quadray rotors make this **explicit** with a discrete polarity bit:

```
Full specification: (W, X, Y, Z, ±)
                    ↑____________↑  ↑
                    4 continuous    1 discrete (Janus polarity)
```

### 9.2 Physical Interpretation

From [4D-COORDINATES.md](4D-COORDINATES.md):

| Polarity | Dimensional Space | Interpretation |
|----------|------------------|----------------|
| + | 4D+ | "Positive" dimensional space (outward from origin) |
| − | 4D− | "Negative" dimensional space (through origin, inverted) |

The Janus Point (origin) is the **transition** between these spaces — passing through it flips the polarity.

### 9.3 Advantages of Explicit Polarity

1. **Unambiguous interpolation:** Always know which "sheet" you're on
2. **Cleaner animation:** No sudden flips when q crosses -q boundary
3. **Physical meaning:** Connects to Fuller's "inside-outing" and cosmological Janus Point theories
4. **Explicit topology:** The Z₂ factor makes the double-cover visible

---

## 10. Implementation Roadmap

### 10.1 Current State (rt-math.js)

ARTexplorer already implements key building blocks:

- `RT.spread(v1, v2)` — Spread between vectors
- `RT.circleParam(t)` — Weierstrass parametrization
- `RT.spreadToParam(s)` — Convert spread to Weierstrass t
- `Quadray.toCartesian()` — Conversion (but uses zero-sum)
- `Quadray.fromCartesian()` — Reverse conversion

### 10.2 Needed Extensions

#### Phase 1: Full 4D Quadray Storage
```javascript
// Store orientation without zero-sum constraint
class QuadrayRotor {
  constructor(w, x, y, z, polarity = '+') {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
    this.polarity = polarity;  // '+' or '-'
  }
}
```

#### Phase 2: RT-Pure Rotation
```javascript
// Rotate by spread (not angle!)
QuadrayRotor.prototype.rotateAboutW = function(spread) {
  const { F, G, H } = RT.rotationCoeffsFromSpread(spread);
  return new QuadrayRotor(
    this.w,
    F * this.x + H * this.y + G * this.z,
    G * this.x + F * this.y + H * this.z,
    H * this.x + G * this.y + F * this.z,
    this.polarity
  );
};
```

#### Phase 3: Composition
```javascript
// Compose two rotors (tetrahedral matrix multiplication)
QuadrayRotor.prototype.compose = function(other) {
  // Matrix multiplication in 4D
  // Polarity: (+)(+) = +, (+)(-) = -, (-)(+) = -, (-)(-) = +
  const newPolarity = (this.polarity === other.polarity) ? '+' : '-';
  // ... matrix math ...
};
```

#### Phase 4: Interpolation
```javascript
// Linear interpolation in ℝ⁴ (simpler than SLERP!)
QuadrayRotor.lerp = function(r1, r2, t) {
  return new QuadrayRotor(
    r1.w + t * (r2.w - r1.w),
    r1.x + t * (r2.x - r1.x),
    r1.y + t * (r2.y - r1.y),
    r1.z + t * (r2.z - r1.z),
    t < 0.5 ? r1.polarity : r2.polarity
  );
};
```

### 10.3 Integration with THREE.js

At the GPU boundary, convert to THREE.js quaternion or matrix:

```javascript
QuadrayRotor.prototype.toThreeQuaternion = function() {
  // Project full 4D Quadray to unit quaternion
  // This is where we "pay" for the transcendentals
  const euler = this.toEulerAngles();  // Intermediate
  return new THREE.Quaternion().setFromEuler(euler);
};

// Or: direct matrix construction (preferred)
QuadrayRotor.prototype.toThreeMatrix4 = function() {
  // Build rotation matrix from tetrahedral coefficients
  // Single conversion, no intermediate Euler angles
};
```

---

## 11. References

### 11.1 Rational Trigonometry
- Wildberger, N.J. (2005). *Divine Proportions: Rational Trigonometry to Universal Geometry*
- [YouTube: Rational Trigonometry](https://www.youtube.com/watch?v=GJPJKPNb2Zg)

### 11.2 Quadray Coordinates
- Urner, K. (1997). [Quadray Introduction](http://www.grunch.net/synergetics/quadintro.html)
- Ace, T. — Original Quadray rotation formulas

### 11.3 Quaternions and Rotation
- Shoemake, K. (1985). "Animating Rotation with Quaternion Curves." *SIGGRAPH*
- Hanson, A.J. (2006). *Visualizing Quaternions*

### 11.4 Synergetics
- Fuller, R.B. (1975). *Synergetics: Explorations in the Geometry of Thinking*
- [Synergetics on Wikipedia](https://en.wikipedia.org/wiki/Synergetics_(Fuller))

### 11.5 Janus Point Cosmology
- Barbour, J. (2020). *The Janus Point: A New Theory of Time*

### 11.6 ARTexplorer Implementation
- [rt-math.js](../modules/rt-math.js) — RT library with spread, Weierstrass, Quadray
- [4D-COORDINATES.md](4D-COORDINATES.md) — Comprehensive Quadray reference

---

## Appendix A: Summary Comparison

| Feature | Euler Angles | Quaternions | **Quadray Rotors** |
|---------|--------------|-------------|-------------------|
| Parameters | 3 | 4 (constrained) | 4 + 1 discrete |
| Manifold | SO(3) | S³ | ℝ⁴ × Z₂ |
| Gimbal lock | Yes | No | No |
| Exact rationals | Rarely | Rarely | Often |
| Transcendentals | Always | Usually | Deferred |
| Interpolation | Problematic | SLERP | Linear |
| Double-cover | N/A | Implicit | Explicit |
| Native geometry | Orthogonal | Orthogonal | **Tetrahedral** |

---

## Appendix B: Open Questions

1. **Composition algebra:** Is there a "Hamilton-like" product for Quadray rotors, or must we use matrix multiplication?

2. **Normalization:** Should we impose any constraint (analogous to unit quaternions) for numerical stability?

3. **Optimal interpolation:** Is linear interpolation in ℝ⁴ truly sufficient, or do we need something more sophisticated?

4. **Physical interpretation:** What does a "rotation by spread 3/4" mean geometrically in tetrahedral terms?

5. **Performance:** Can RT-pure rotations be made GPU-efficient, or is conversion to quaternions at the boundary always necessary?

---

## Appendix C: Future Visualization Enhancements

### C.1 Full Gimbal Lock Zone Visualization

The current demo displays gimbal lock zones for Euler XYZ order only (Y-axis poles). A more complete visualization would show all six potential singularity regions:

```
          +Y (XYZ, ZYX)
             ↑
             │
   +X ←──────┼──────→ -X (YXZ, ZXY)
  (YXZ)      │       (YXZ)
             │
             ↓
          -Y (XYZ, ZYX)

   +Z, -Z (XZY, YZX) perpendicular to this view
```

**Proposed Implementation:**

1. Render an inscribed cube with semi-transparent faces
2. Each face pair represents one gimbal lock singularity region
3. Color-code by Euler order: Red=XYZ/ZYX, Green=YXZ/ZXY, Blue=XZY/YZX
4. Add dropdown to select active Euler order (highlights corresponding faces)
5. Warning rings radiate from the appropriate poles based on selected order

This would demonstrate that gimbal lock is not a property of 3D rotation itself, but of the specific 3-parameter representation chosen.

---

*Document generated as part of ARTexplorer research into RT-pure geometric operations.*

*Co-Authored-By: Andy & Claude*
