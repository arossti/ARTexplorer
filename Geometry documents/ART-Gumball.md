# ART Gumball: Rational Trigonometry Transform System

**Version:** 1.0
**Status:** Specification
**Related:** [ARTexplorer.md](./ARTexplorer.md)

## Overview

The ART (Algebraic Rational Trigonometry) Gumball is a transform control system for manipulating polyhedra in 3D space using pure Rational Trigonometry principles. Unlike traditional CAD gumballs that use degrees and floating-point distances, ART Gumball operates **exclusively with quadrance and spread**, maintaining algebraic exactness throughout all transformations.

### Philosophical Foundation: "Nows" (Julian Barbour)

Following Julian Barbour's relational theory of time, each transform state is a "Now" - a snapshot in configuration space. Users don't "animate" objects through time; they **deposit instances** at specific configurations, building up a sequence of Nows that represent the object's trajectory through shape-space.

## Core Principles

### 1. RT-Pure Operations

**Traditional CAD Problems:**

- Angles in degrees → transcendental functions (sin, cos) → irrational numbers
- Floating-point accumulation errors in rotations
- Distance calculations using √ → decimal expansion issues
- Loss of precision in iterative transforms

**ART Gumball Solution:**

- **Spread** (s = Q_quad/R_quad) instead of angles → rational values
- **Quadrance** (Q = x² + y² + z²) instead of distance → exact algebraic values
- All calculations remain in rational/algebraic domain
- No transcendental functions required
- Perfect precision for trajectories, orbits, lattice placements

### 2. Coordinate System Awareness

The gumball operates in **dual mode**:

#### Cartesian Mode (XYZ)

- Move: Translate along X, Y, Z axes
- Rotate: Spread-based rotation in XY, XZ, YZ planes
- Units: Standard Cartesian coordinate increments

#### Quadray Mode (WXYZ)

- Move: Translate along tetrahedral basis vectors W, X, Y, Z
- Rotate: Spread-based rotation in tetrahedral planes (WX, WY, WZ, XY, XZ, YZ)
- Units: Quadray coordinate increments (tetrahedral lattice alignment)

## Transform Operations

### Scale (Universal)

**Parameters:**

- `scaleX`: Multiplicative scale factor for X dimension
- `scaleY`: Multiplicative scale factor for Y dimension
- `scaleZ`: Multiplicative scale factor for Z dimension
- `scaleUniform`: Single scale factor applied to all dimensions

**Implementation:**

```javascript
// Uniform scaling
polyhedron.scale.set(scaleUniform, scaleUniform, scaleUniform);

// Non-uniform scaling
polyhedron.scale.set(scaleX, scaleY, scaleZ);
```

**RT Considerations:**

- Scaling preserves quadrance ratios
- Spread values remain invariant under uniform scaling
- Non-uniform scaling changes spreads (must recalculate if needed)

### Move (Position)

#### Cartesian Mode

**Parameters:**

- `posX`: Position along X-axis (algebraic value)
- `posY`: Position along Y-axis (algebraic value)
- `posZ`: Position along Z-axis (algebraic value)

**Implementation:**

```javascript
polyhedron.position.set(posX, posY, posZ);
```

#### Quadray Mode

**Parameters:**

- `qW`: Coefficient for W basis vector
- `qX`: Coefficient for X basis vector
- `qY`: Coefficient for Y basis vector
- `qZ`: Coefficient for Z basis vector

**Implementation:**

```javascript
// Quadray coordinates (w, x, y, z)
// Convert to Cartesian for THREE.js positioning
const cartesianPos = quadrayToCartesian(qW, qX, qY, qZ);
polyhedron.position.copy(cartesianPos);
```

**Quadray to Cartesian Conversion:**

```javascript
function quadrayToCartesian(w, x, y, z) {
  // Using existing Quadray.basisVectors from ARTexplorer
  const position = new THREE.Vector3(0, 0, 0);

  position.add(Quadray.basisVectors[0].clone().multiplyScalar(w)); // W
  position.add(Quadray.basisVectors[1].clone().multiplyScalar(x)); // X
  position.add(Quadray.basisVectors[2].clone().multiplyScalar(y)); // Y
  position.add(Quadray.basisVectors[3].clone().multiplyScalar(z)); // Z

  return position;
}
```

**RT Advantages:**

- Quadray moves align perfectly with IVM lattice
- Natural for tetrahedral close-packing arrangements
- Exact lattice positions without floating-point drift

### Rotate (Spread-Based)

**Traditional Problem:**

- Rotation by θ degrees requires cos(θ) and sin(θ)
- Transcendental functions → irrationals
- Composition of rotations accumulates error

**RT Solution:**

- Define rotation by **spread** (s) in a specific plane
- Spread s = Q_quad/R_quad (ratio of quadrances, purely algebraic)
- Use **spread polynomials** for exact rotation matrices

#### Spread Definition

For two lines forming an angle:

- **Quadrance** of perpendicular from intersection to line: Q_quad
- **Quadrance** of radius (distance along line): R_quad
- **Spread**: s = Q_quad/R_quad

**Key Values:**

- s = 0: Lines parallel (0°)
- s = 0.5: 45° angle (most common in tetrahedral geometry)
- s = 1: Lines perpendicular (90°)

**Example from diagram:**

- R_q = 2, Q_q = 1 → s = 0.5 (45°)
- R_q = 5, Q_q = 1 → s = 0.2 (≈26.56...°)
- R_q = 10, Q_q = 1 → s = 0.1 (≈18.43...°)

#### Parameters

**Cartesian Mode:**

- `spreadXY`: Spread for rotation in XY plane (about Z-axis)
- `spreadXZ`: Spread for rotation in XZ plane (about Y-axis)
- `spreadYZ`: Spread for rotation in YZ plane (about X-axis)

**Quadray Mode:**

- `spreadWX`: Spread for rotation in WX plane
- `spreadWY`: Spread for rotation in WY plane
- `spreadWZ`: Spread for rotation in WZ plane
- `spreadXY`: Spread for rotation in XY plane
- `spreadXZ`: Spread for rotation in XZ plane
- `spreadYZ`: Spread for rotation in YZ plane

#### Implementation Strategy

**Spread to Rotation Matrix (RT-Pure):**

For a rotation in a plane with spread s:

```javascript
/**
 * Create rotation matrix from spread value (RT-Pure method)
 *
 * For spread s in a 2D plane, the rotation preserves quadrance and uses
 * the relationship: s = sin²(θ) where θ is the traditional angle
 *
 * Given spread s, we can derive:
 * - sin²(θ) = s
 * - cos²(θ) = 1 - s (from Pythagorean identity)
 * - sin(θ) = √s
 * - cos(θ) = √(1-s)
 *
 * While √s is irrational, for SPECIFIC algebraic spreads (s = 1/2, 1/4, 3/4, etc.)
 * we get exact algebraic values:
 * - s = 1/2 → sin = 1/√2, cos = 1/√2 (45°)
 * - s = 1 → sin = 1, cos = 0 (90°)
 * - s = 0 → sin = 0, cos = 1 (0°)
 *
 * @param {number} spread - Spread value (0 to 1)
 * @param {string} plane - Plane of rotation: 'XY', 'XZ', 'YZ'
 * @returns {THREE.Matrix4} Rotation matrix
 */
function spreadToRotationMatrix(spread, plane) {
  // Clamp spread to valid range [0, 1]
  const s = Math.max(0, Math.min(1, spread));

  // Calculate sin and cos from spread
  // Note: For exact algebraic spreads, these could be stored as exact values
  const sinTheta = Math.sqrt(s);
  const cosTheta = Math.sqrt(1 - s);

  const matrix = new THREE.Matrix4();

  // Rotation matrices by plane
  switch (plane) {
    case "XY": // Rotation about Z-axis
      matrix.set(
        cosTheta,
        -sinTheta,
        0,
        0,
        sinTheta,
        cosTheta,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      );
      break;

    case "XZ": // Rotation about Y-axis
      matrix.set(
        cosTheta,
        0,
        sinTheta,
        0,
        0,
        1,
        0,
        0,
        -sinTheta,
        0,
        cosTheta,
        0,
        0,
        0,
        0,
        1
      );
      break;

    case "YZ": // Rotation about X-axis
      matrix.set(
        1,
        0,
        0,
        0,
        0,
        cosTheta,
        -sinTheta,
        0,
        0,
        sinTheta,
        cosTheta,
        0,
        0,
        0,
        0,
        1
      );
      break;
  }

  return matrix;
}
```

**Exact Algebraic Spread Values (Preferred):**

For maximum RT purity, restrict spreads to algebraic values:

```javascript
// Common exact spreads in tetrahedral geometry
const EXACT_SPREADS = {
  PARALLEL: 0, // 0° - s = 0
  TETRAHEDRAL: 1 / 3, // ≈54.74° - tetrahedron dihedral angle
  OCTAHEDRAL: 1 / 2, // 45° - s = 1/2
  CUBE_DIAGONAL: 2 / 3, // ≈70.53° - cube diagonal to edge
  PERPENDICULAR: 1, // 90° - s = 1
};

// UI could provide these as preset buttons or snap-to values
```

**Composition of Rotations:**

For multiple rotations, apply sequentially:

```javascript
function applySpreadRotations(polyhedron, rotations) {
  // rotations = [{spread: 0.5, plane: 'XY'}, {spread: 0.25, plane: 'YZ'}, ...]

  const compositeMatrix = new THREE.Matrix4();

  rotations.forEach(rot => {
    const rotMatrix = spreadToRotationMatrix(rot.spread, rot.plane);
    compositeMatrix.multiply(rotMatrix);
  });

  polyhedron.setRotationFromMatrix(compositeMatrix);
}
```

**RT Advantages:**

- Spread values remain rational/algebraic
- No angle accumulation errors
- Exact lattice rotations for tetrahedral/cubic symmetries
- Reversible transforms (spread addition/subtraction is exact)

---

### Performance Analysis and Optimization Strategies

**Status:** Implementation Analysis (December 2024)

#### Current Implementation Architecture

The current rotation system in ARTexplorer.html (lines 3753-3874) performs the following operations per frame:

1. **Screen-space angle calculation** → Convert to radians using `atan2`
2. **Radians to spread conversion**: `spread = sin²(θ)`
3. **Snapping**: Round spread to 0.1 intervals
4. **Back to radians**: `θ = asin(√spread)`
5. **Create quaternion**: `setFromAxisAngle(axis, θ)`
6. **Apply rotation**:
   - Position: `offset.applyAxisAngle(axis, θ)` (matrix operation #1)
   - Orientation: `quaternion.multiplyQuaternions(newQuat, startQuat)` (matrix operation #2)

**Current Cost:** 2 matrix multiplications per object per frame

#### Optimization Strategy 1: Pre-multiply Transformation Matrices ✅

**Recommended for immediate implementation**

Currently, rotation involves separate operations for position and orientation. These can be combined into a single transformation matrix:

```javascript
// CURRENT APPROACH (2 operations):
const offset = poly.position.clone().sub(rotationCenter);
const rotatedOffset = offset.clone().applyAxisAngle(axis, angle);
poly.position.copy(rotationCenter.clone().add(rotatedOffset));
poly.quaternion.multiplyQuaternions(rotationQuat, dragStartQuat);

// OPTIMIZED APPROACH (1 operation):
// Pre-multiply: T⁻¹ · R · T (translate to origin, rotate, translate back)
const rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
const transformMatrix = new THREE.Matrix4()
  .makeTranslation(-rotationCenter.x, -rotationCenter.y, -rotationCenter.z)
  .multiply(rotationMatrix)
  .multiply(
    new THREE.Matrix4().makeTranslation(
      rotationCenter.x,
      rotationCenter.y,
      rotationCenter.z
    )
  );

poly.applyMatrix4(transformMatrix); // Single operation for both position and orientation
```

**Benefits:**

- Reduces from 2 matrix operations to 1 per object per frame
- Cleaner code (single transformation concept)
- Mathematically equivalent
- No loss of precision

**Implementation Note:** The transformation matrix can be computed once per drag event and applied to all selected objects.

#### Optimization Strategy 2: Weierstrass Substitution (RT-Pure Circle Parameterization) 🌟

**Recommended for RT-pure implementation**

Using the rational circle parameterization from `rt-math.js`:

**Current conversion path:**

```
spread → asin(√spread) → sin/cos lookup → rotation matrix
```

**RT-Pure path using Weierstrass substitution:**

```javascript
/**
 * Create rotation matrix directly from spread using rational circle parameterization
 * Avoids inverse trig functions for better numerical stability
 *
 * Based on Weierstrass substitution where spread = sin²(θ) and t = tan(θ/2):
 * - cos(θ) = (1 - t²) / (1 + t²)
 * - sin(θ) = 2t / (1 + t²)
 * - spread = 4t² / (1 + t²)²
 *
 * @param {number} spread - Spread value (0 to 1)
 * @param {THREE.Vector3} axis - Rotation axis (normalized)
 * @returns {THREE.Matrix4} Rotation matrix
 */
function spreadToRotationMatrixRTPure(spread, axis) {
  // Solve spread = 4t²/(1+t²)² for parameter t
  const t = RT.spreadToParam(spread); // Already implemented in rt-math.js!

  // Get cos/sin from rational circle parameterization (NO trig functions!)
  const { x: cosTheta, y: sinTheta } = RT.circleParam(t);

  // Build rotation matrix using Rodrigues' formula:
  // R = I + sin(θ)K + (1 - cos(θ))K²
  // where K is the skew-symmetric matrix for the axis

  const c = cosTheta;
  const s = sinTheta;
  const t = 1 - c;
  const [x, y, z] = [axis.x, axis.y, axis.z];

  const matrix = new THREE.Matrix4();
  matrix.set(
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    0,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    0,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
    0,
    0,
    0,
    0,
    1
  );

  return matrix;
}
```

**Benefits:**

- **Algebraically exact** for rational spreads (1/2, 1/3, 1/4, etc.)
- Only uses `sqrt` **once** (in `spreadToParam`), vs. twice in traditional approach (asin + sqrt)
- More numerically stable for small angles (avoids asin domain issues)
- Conceptually pure: works entirely with the parameter `t` instead of converting to/from angles
- Natural for UI: slider could control `t` directly, with spread computed as output

**Implementation Location:** Add as `RT.spreadToRotationMatrix(spread, axis)` in `modules/rt-math.js`

**Mathematical Insight:**

The Weierstrass substitution provides a **bijective mapping** between:

- Parameter `t` (rational numbers) ↔ Points on unit circle
- Spread `s = 4t²/(1+t²)²` ↔ Perpendicularity measure

This means:

- **Input:** Rational spread values (1/2, 1/3, 2/3, etc.)
- **Processing:** Rational parameter `t` (possibly irrational, but computed once)
- **Output:** cos/sin values computed using only rational operations on `t`
- **Result:** Rotation matrix with maximum algebraic precision

#### Optimization Strategy 3: Native Quadray Rotation Matrices 💡

**Deferred for future investigation**

**Theoretical Question:** Can rotations be expressed as linear transformations directly in 4D Quadray space (with zero-sum constraint)?

**Background:**

The Quadray basis vectors form a tetrahedral coordinate system:

```javascript
W = (1, 1, 1)/√3
X = (1, -1, -1)/√3
Y = (-1, 1, -1)/√3
Z = (-1, -1, 1)/√3
```

Currently, rotations follow this path:

```
Quadray coords → Cartesian → Rotate in Cartesian → Display (convert back to Quadray)
```

**Theoretical Approach:**

Given a 3D Cartesian rotation matrix R₃, find the equivalent 4×4 Quadray transformation R₄:

```
R₄ = B⁺ R₃ B
```

where:

- **B** = Quadray-to-Cartesian basis matrix (3×4, columns = basis vectors)
- **B⁺** = Moore-Penrose pseudoinverse (4×3, since B is not square)
- For orthonormal basis: B⁺ = Bᵀ

**Implementation Sketch:**

```javascript
// Precompute once at initialization (global basis transformation)
const quadrayBasisMatrix = new THREE.Matrix3(
  1/√3,  1/√3,  1/√3,    // Cartesian X components of W,X,Y,Z
  1/√3, -1/√3, -1/√3,    // Cartesian Y components
 -1/√3,  1/√3, -1/√3,    // Cartesian Z components
 -1/√3, -1/√3,  1/√3
);

// For each rotation operation:
function getQuadrayRotationMatrix(cartesianRotation3x3) {
  // R₄ = B⁺ R₃ B
  const pseudoInverse = quadrayBasisMatrix.transpose(); // For orthonormal basis
  const quadrayRotation = pseudoInverse
    .multiply(cartesianRotation3x3)
    .multiply(quadrayBasisMatrix);

  return quadrayRotation; // 4×4 matrix operating in Quadray space
}
```

**Special Cases - Exact Tetrahedral Symmetries:**

For **discrete tetrahedral symmetry rotations** (24 total), Quadray transformations are exact permutations:

```javascript
// Example: 120° rotation around tetrahedral axis permutes coordinates
// (W, X, Y, Z) → (W, Y, Z, X)  [cyclic permutation]

const TETRAHEDRAL_ROTATIONS = {
  // Identity
  IDENTITY: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],

  // 120° rotation around (1,1,1) axis
  ROT_120_111: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0],

  // ... (21 more symmetries)
};
```

These are **algebraically exact** - no floating-point errors, perfect for snapping to tetrahedral grid points.

**Evaluation:**

**Pros:**

- Conceptually elegant (work natively in Quadray space)
- Exact for tetrahedral symmetries
- Educational value (demonstrates coordinate system theory)

**Cons:**

- Still requires conversion to Cartesian for Three.js rendering
- Adds complexity without clear performance benefit for arbitrary rotations
- Better suited for a future **pure-Quadray rendering engine** (not Three.js-based)

**Recommendation:** Document the theory, implement tetrahedral symmetry presets, but defer full native Quadray rotations until building a custom renderer.

#### Optimization Strategy 4: Preset Rotation Matrix Cache 🚀

**Recommended for immediate implementation**

Pre-compute and cache rotation matrices for common exact spread values:

```javascript
/**
 * Precomputed rotation matrices for exact algebraic spreads
 * Computed once at initialization, reused for all rotations
 */
const EXACT_ROTATION_MATRICES = {
  // spread = 0 (0°)
  0: {
    cos: 1,
    sin: 0,
    matrices: {}, // Indexed by axis
  },

  // spread = 1/6 (≈30°)
  [1 / 6]: {
    cos: Math.sqrt(3) / 2,
    sin: 0.5,
    matrices: {},
  },

  // spread = 1/4 (≈36.87°)
  [1 / 4]: {
    cos: Math.sqrt(3) / 2,
    sin: 0.5,
    matrices: {},
  },

  // spread = 1/3 (≈54.74° - tetrahedral dihedral)
  [1 / 3]: {
    cos: Math.sqrt(2 / 3),
    sin: Math.sqrt(1 / 3),
    matrices: {},
  },

  // spread = 1/2 (45° - octahedral)
  [1 / 2]: {
    cos: 1 / Math.sqrt(2),
    sin: 1 / Math.sqrt(2),
    matrices: {},
  },

  // spread = 2/3 (≈70.53° - cube diagonal to edge)
  [2 / 3]: {
    cos: Math.sqrt(1 / 3),
    sin: Math.sqrt(2 / 3),
    matrices: {},
  },

  // spread = 3/4 (≈60°)
  [3 / 4]: {
    cos: 0.5,
    sin: Math.sqrt(3) / 2,
    matrices: {},
  },

  // spread = 1 (90° - perpendicular)
  1: {
    cos: 0,
    sin: 1,
    matrices: {},
  },
};

/**
 * Get rotation matrix for exact spread value, using cache
 * Falls back to RT-pure calculation for non-exact spreads
 */
function getRotationMatrix(spread, axis) {
  // Check if exact spread exists in cache
  const roundedSpread = Math.round(spread * 12) / 12; // Snap to 1/12 intervals

  if (EXACT_ROTATION_MATRICES[roundedSpread]) {
    const axisKey = `${axis.x},${axis.y},${axis.z}`;

    // Return cached matrix if exists
    if (EXACT_ROTATION_MATRICES[roundedSpread].matrices[axisKey]) {
      return EXACT_ROTATION_MATRICES[roundedSpread].matrices[axisKey].clone();
    }

    // Compute and cache
    const matrix = buildRotationMatrix(
      EXACT_ROTATION_MATRICES[roundedSpread].cos,
      EXACT_ROTATION_MATRICES[roundedSpread].sin,
      axis
    );
    EXACT_ROTATION_MATRICES[roundedSpread].matrices[axisKey] = matrix;
    return matrix.clone();
  }

  // Fall back to RT-pure calculation
  return spreadToRotationMatrixRTPure(spread, axis);
}
```

**Benefits:**

- **Zero runtime cost** for exact spread values (common case)
- Perfect numerical precision for tetrahedral/cubic geometries
- Graceful fallback for arbitrary spreads
- Memory cost negligible (8 spreads × ~6 common axes ≈ 48 matrices)

**UI Integration:**

Snap-to buttons in rotation mode:

```
[0°] [1/6] [1/4] [1/3·tet] [1/2·45°] [2/3] [3/4] [1·90°]
```

Clicking a preset = instant cached matrix lookup, perfect precision.

---

### Implementation Recommendations Summary

**Priority 1 - Immediate Implementation:**

1. ✅ **Pre-multiply transformation matrices** (Strategy 1)
   - Reduces operations from 2 to 1 per object
   - Straightforward, no risk
   - Clear performance win

2. ✅ **Preset rotation matrix cache** (Strategy 4)
   - Zero cost for common cases
   - Enhances RT-pure philosophy (exact algebraic values)
   - Small implementation effort

**Priority 2 - RT-Pure Enhancement:**

3. ✅ **Weierstrass substitution** (Strategy 2)
   - Add `RT.spreadToRotationMatrix()` in `modules/rt-math.js`
   - More numerically stable than traditional approach
   - Excellent for educational/demonstration purposes
   - Documents the RT-pure methodology

**Priority 3 - Future Research:**

4. ❌ **Native Quadray rotation matrices** (Strategy 3) - **Deferred**
   - Document theory in this file
   - Implement 24 tetrahedral symmetry presets for exact snapping
   - Full arbitrary rotation in Quadray space deferred until custom renderer development
   - Not critical for Three.js-based implementation

**Performance Impact Projection:**

- Current: **2 matrix ops** per object per frame
- After P1: **1 matrix op** per object per frame (50% reduction)
- After P1+P2: **0 matrix ops** for exact spreads (100% reduction in common case)
- After P1+P2+P3: Same as P1+P2 (no additional runtime benefit until custom renderer)

**Code Locations:**

- Rotation application: `ARTexplorer.html` lines 3753-3874
- RT math library: `modules/rt-math.js`
- Circle parameterization: `RT.circleParam()` and `RT.spreadToParam()`

---

## "Now" System: Configuration Snapshots

### Concept

Each "Now" is an **immutable snapshot** of a polyhedron's configuration at a moment in shape-space. Users manipulate a "working" polyhedron using the gumball, then press **"Now"** to deposit that configuration as a permanent instance, with position, scale, rotation noted in whatever system it was created in (XYZ/WXYZ) and stored in StateManager (able to export via CSV or other formats)

### Now Data Structure

```javascript
/**
 * A "Now" represents a single configuration snapshot
 * Stores ONLY the object state, NOT global environment
 */
const nowSchema = {
  id: String, // Unique identifier (UUID or timestamp-based)
  timestamp: Number, // Unix timestamp when "Now" was created

  // Polyhedron identity
  polyhedronType: String, // 'tetrahedron', 'cube', 'octahedron', 'icosahedron', etc.

  // Transform state (in Quadray space for RT purity)
  transform: {
    position: {
      mode: String, // 'cartesian' or 'quadray'

      // Quadray coordinates (preferred for RT)
      quadray: {
        w: Number, // Algebraic coefficient
        x: Number,
        y: Number,
        z: Number,
      },

      // Cartesian fallback
      cartesian: {
        x: Number,
        y: Number,
        z: Number,
      },
    },

    rotation: {
      mode: String, // 'spread' (RT-pure) or 'euler' (fallback)

      // Spread rotations (preferred for RT)
      spreads: [
        {
          plane: String, // 'XY', 'XZ', 'YZ', 'WX', 'WY', 'WZ'
          spread: Number, // Algebraic spread value (0-1)
          exact: String, // Optional: exact algebraic expression e.g., "1/2", "√2/2"
        },
      ],

      // Euler angles fallback (if needed for THREE.js)
      euler: {
        x: Number,
        y: Number,
        z: Number,
        order: String, // 'XYZ', 'YXZ', etc.
      },
    },

    scale: {
      x: Number, // Scale factors (algebraic)
      y: Number,
      z: Number,
      uniform: Boolean, // True if xyz are equal
    },
  },

  // Visual properties (optional)
  appearance: {
    color: Number, // Hex color
    opacity: Number, // 0-1
    wireframe: Boolean,
    visible: Boolean,
  },

  // Metadata (optional)
  metadata: {
    label: String, // User-defined name
    tags: [String], // Searchable tags
    notes: String, // User notes
  },
};
```

### "Now" Operations

#### Create Now

```javascript
/**
 * Capture current polyhedron state as a "Now"
 * @param {THREE.Object3D} polyhedron - The working polyhedron
 * @param {Object} gumballState - Current gumball transform settings
 * @returns {Object} Now snapshot
 */
function createNow(polyhedron, gumballState) {
  const now = {
    id: generateUUID(),
    timestamp: Date.now(),
    polyhedronType: polyhedron.userData.type,
    transform: {
      position: {
        mode: gumballState.coordinateMode,
        quadray: gumballState.quadrayPosition,
        cartesian: {
          x: polyhedron.position.x,
          y: polyhedron.position.y,
          z: polyhedron.position.z,
        },
      },
      rotation: {
        mode: "spread",
        spreads: gumballState.spreadRotations,
        euler: {
          x: polyhedron.rotation.x,
          y: polyhedron.rotation.y,
          z: polyhedron.rotation.z,
          order: polyhedron.rotation.order,
        },
      },
      scale: {
        x: polyhedron.scale.x,
        y: polyhedron.scale.y,
        z: polyhedron.scale.z,
        uniform:
          polyhedron.scale.x === polyhedron.scale.y &&
          polyhedron.scale.y === polyhedron.scale.z,
      },
    },
    appearance: {
      color: polyhedron.material.color.getHex(),
      opacity: polyhedron.material.opacity,
      wireframe: polyhedron.material.wireframe,
      visible: polyhedron.visible,
    },
    metadata: {
      label: gumballState.label || `Now_${Date.now()}`,
      tags: gumballState.tags || [],
      notes: gumballState.notes || "",
    },
  };

  return now;
}
```

#### Deposit Now Instance

```javascript
/**
 * Create a permanent instance from a "Now" snapshot
 * @param {Object} now - The Now snapshot
 * @returns {THREE.Object3D} Deposited polyhedron instance
 */
function depositNowInstance(now) {
  // Create polyhedron based on type
  const instance = createPolyhedron(now.polyhedronType);

  // Apply transform
  instance.position.set(
    now.transform.position.cartesian.x,
    now.transform.position.cartesian.y,
    now.transform.position.cartesian.z
  );

  instance.scale.set(
    now.transform.scale.x,
    now.transform.scale.y,
    now.transform.scale.z
  );

  // Apply rotation from spread or euler
  if (now.transform.rotation.mode === "spread") {
    applySpreadRotations(instance, now.transform.rotation.spreads);
  } else {
    instance.rotation.set(
      now.transform.rotation.euler.x,
      now.transform.rotation.euler.y,
      now.transform.rotation.euler.z
    );
  }

  // Apply appearance
  instance.material.color.setHex(now.appearance.color);
  instance.material.opacity = now.appearance.opacity;
  instance.material.wireframe = now.appearance.wireframe;
  instance.visible = now.appearance.visible;

  // Store Now reference
  instance.userData.nowId = now.id;
  instance.userData.nowTimestamp = now.timestamp;

  return instance;
}
```

#### Now Collection Management

```javascript
/**
 * Collection of all "Nows" in the current session
 */
const nowCollection = {
  nows: [], // Array of Now snapshots
  instances: [], // Array of deposited THREE.Object3D instances

  /**
   * Add a Now to the collection and deposit its instance
   */
  add(now) {
    this.nows.push(now);
    const instance = depositNowInstance(now);
    this.instances.push(instance);
    scene.add(instance);
    return instance;
  },

  /**
   * Remove a Now and its instance
   */
  remove(nowId) {
    const nowIndex = this.nows.findIndex(n => n.id === nowId);
    if (nowIndex === -1) return;

    // Remove instance from scene
    const instance = this.instances[nowIndex];
    scene.remove(instance);

    // Remove from collections
    this.nows.splice(nowIndex, 1);
    this.instances.splice(nowIndex, 1);
  },

  /**
   * Clear all Nows
   */
  clear() {
    // Remove all instances from scene
    this.instances.forEach(instance => scene.remove(instance));

    this.nows = [];
    this.instances = [];
  },

  /**
   * Export Nows to JSON
   */
  exportJSON() {
    return JSON.stringify(
      {
        version: "1.0",
        count: this.nows.length,
        nows: this.nows,
      },
      null,
      2
    );
  },

  /**
   * Import Nows from JSON
   */
  importJSON(jsonString) {
    const data = JSON.parse(jsonString);

    // Clear existing
    this.clear();

    // Import each Now
    data.nows.forEach(now => this.add(now));
  },
};
```

## User Interface

### Interactive Gumball Handles (3D Viewport)

The ART Gumball uses the **actual basis vectors as interactive handles** - similar to Maya, Blender, or Rhino gumballs. NO separate control panel needed.

#### Handle Types by Operation

**MOVE Handles** - Arrow tips at end of each basis vector

```
Quadray Mode (WXYZ):
  - 4 arrow handles (W, X, Y, Z directions)
  - Click + drag arrow = constrained move along that basis vector
  - Color-coded: W=Yellow, X=Red, Y=Blue, Z=Green

Cartesian Mode (XYZ):
  - 3 arrow handles (X, Y, Z directions)
  - Click + drag arrow = constrained move along that axis
  - Color-coded: X=Red, Y=Green, Z=Blue
```

**SCALE Handles** - Cubes at end of each basis vector

```
Quadray Mode (WXYZ):
  - 4 cube handles (W, X, Y, Z directions)
  - Click + drag cube = scale in that direction
  - Central sphere at origin = uniform scale all directions
  - Color-coded to match basis vectors

Cartesian Mode (XYZ):
  - 3 cube handles (X, Y, Z directions)
  - Click + drag cube = scale in that direction
  - Central sphere at origin = uniform scale all directions
  - Color-coded to match axes
```

**ROTATE Handles** - Hexagons (or polygons) around each basis vector axis

```
Quadray Mode (WXYZ):
  - 4 rotation handles (around W, X, Y, Z axes)
  - Each handle = hexagon perpendicular to its basis vector
  - Click + drag hexagon = rotation around that axis (spread-based)
  - Color-coded to match basis vector (W=Yellow, X=Red, Y=Blue, Z=Green)
  - Simpler than 6 Central Angle plane rings (reduces visual clutter)

Cartesian Mode (XYZ):
  - 3 rotation handles (around X, Y, Z axes)
  - Each handle = hexagon perpendicular to its axis
  - Click + drag hexagon = rotation around that axis (spread-based)
  - Color-coded to match axis (X=Red, Y=Green, Z=Blue)
```

**Design Rationale:**

- Hexagons preferred over circles for RT fidelity (polygonal geometry)
- 4 rotation axes (WXYZ) simpler than 6 Central Angle planes (WX, WY, WZ, XY, XZ, YZ)
- Less visual clutter while maintaining full rotational control
- Axis-aligned rotations easier to understand than plane-based rotations

#### Visual Design

```
QUADRAY GUMBALL (WXYZ Mode):

              Z (Green)
                ▲
                │ ●─── Z-scale cube (green)
                │/
                ◯  <── YZ rotation ring (cyan)
               /│
              / │
             /  │
    W (Yellow)  │
        ▲       │
        │\      │
        │ ●─────┼──────● X (Red)
        │  \    │     /│
        │   \   │    / │ ●─── X-scale cube (red)
        ●────\──┼───/──◯
       /|\    \ │  /  / <── XY rotation ring (magenta)
      / │ \    \│ /  /
     /  │  \    ◯  /
    ●───┼───────●─/
   /    │      / │/
  /     │     /  │
 ●      │    ●   │
W-cube  │  Y-cube│
        ▼        ▼
      Y (Blue)  Origin Sphere (uniform scale)


CARTESIAN GUMBALL (XYZ Mode):

              Z (Blue)
                ▲
                │ ●─── Z-scale cube (blue)
                │
                │
                ◯  <── YZ rotation ring (cyan)
                │
                │
                │
                ●─────────────────● Y (Green)
               /│                 │
              / │                 │ ●─── Y-scale cube (green)
             /  │                 │
            /   ◯  <── XY rotation ring (yellow)
           /    │
          ●─────┼─────●
         /│     │    /
        / │     │   /
       /  │     │  /
      ●   │     ● ●─── X-scale cube (red)
    X-cube│    Origin Sphere
          ▼
       X (Red)
```

### Status Bar / Streaming Console

**Location:** Top or bottom of viewport (user preference)

**Appears:** When user starts an operation (click on handle)

**Purpose:** Numeric input completion for precise control

```
┌─────────────────────────────────────────────────────────────────┐
│ MOVE W: [____] | TAB to accept | ESC to cancel | NOW to deposit │
└─────────────────────────────────────────────────────────────────┘
```

#### Interaction Flow

1. **User clicks arrow handle (e.g., W-axis move)**
   - Status bar appears: `MOVE W: [____]`
   - Polyhedron follows mouse in W direction
   - Real-time numeric display shows current value

2. **User types value** (e.g., `2.5`)
   - Status bar: `MOVE W: [2.5_]`
   - Polyhedron jumps to exact position
   - TAB or ENTER to accept

3. **User presses NOW button** (or keyboard shortcut `N`)
   - Current transform deposited as "Now" instance
   - Counter increments
   - Working polyhedron remains for next transform

#### Status Bar States

```
IDLE:
[No active operation]

MOVE (Quadray W):
MOVE W: [2.500] | TAB: accept | ESC: cancel | N: NOW

ROTATE (XY plane, spread):
ROTATE XY: s=[0.500] (45°) | TAB: accept | ESC: cancel | N: NOW
Exact spreads: [0] [1/6] [1/4] [1/3] [1/2] [2/3] [3/4] [1]

SCALE (Uniform):
SCALE UNIFORM: [1.414] | TAB: accept | ESC: cancel | N: NOW

NOW DEPOSITED:
✓ Now #5 deposited: Tet_001 at (W:2.5, X:0, Y:0, Z:0)
```

### Exact Spread Presets

When rotating (clicking rotation ring), status bar shows preset spread buttons:

```
ROTATE XY plane:
┌──────────────────────────────────────────────────────────────┐
│ s=[____] │ [0°] [1/6] [1/4] [1/3·tet] [1/2·45°] [2/3] [3/4] [1·90°] │
└──────────────────────────────────────────────────────────────┘
```

Click preset = instantly apply that spread value

### Minimal UI Elements

**Top-right corner (always visible):**

```
┌─────────────────────────────┐
│ Mode: [Quadray ▼]           │
│ Tool: [Move ▼]              │
│ Poly: [Tetrahedron ▼]       │
│                             │
│ [🕐 NOW] Deposited: 3      │
│                             │
│ [Export] [Import] [Clear]   │
└─────────────────────────────┘
```

**Mode dropdown:**

- Cartesian (XYZ)
- Quadray (WXYZ)

**Tool dropdown:**

- Move
- Rotate
- Scale

**Poly dropdown:**

- Tetrahedron
- Cube
- Octahedron
- Icosahedron
- Dodecahedron
- etc.

## Forms, Instances, and Localized Gumballs

### Conceptual Architecture

The ART Gumball system distinguishes between **Forms** (templates) and **Instances** ("Nows"):

#### Forms

**Forms** are polyhedra templates that always exist at the origin (0,0,0,0). They serve as:

- **Blueprints** for creating instances
- **Active editing objects** when selected
- **Reusable templates** that reset after instance creation

When a user selects a Form:

1. Form appears at origin with default properties
2. **Editing Basis** (localized gumball) appears at Form's center
3. User can transform the Form using gumball handles
4. Form remains "active" until released/deposited

#### Instances ("Nows")

**Instances** are deposited snapshots of Forms with stored transforms:

- **Immutable configurations** in shape-space (Julian Barbour's "Nows")
- **Fixed position, rotation, scale** stored in StateManager
- **Selectable objects** that can be edited or deleted
- **Independent from Forms** - Forms reset to origin after instance creation

When a user releases a transformed Form:

1. Instance is auto-created with current transform
2. Instance is deposited in scene with stored state
3. Form resets to origin (0,0,0,0)
4. Form ready for next transformation

#### Editing Basis vs. Origin Basis

**Origin Basis (Global Reference)**

- Always visible at world origin (0,0,0,0)
- Shows global coordinate frame (XYZ or WXYZ)
- Cannot be moved or hidden
- Provides spatial orientation reference

**Editing Basis (Localized Gumball)**

- Appears when Form or Instance is selected
- Centered on selected object's position
- Moves with object during transformations
- Hidden when nothing is selected
- Provides interactive transform handles

### Workflow: Forms → Instances

**Step 1: Select Form**

```
User clicks "Tetrahedron" in Forms list
→ Tetrahedron Form appears at origin
→ Editing Basis appears at Form center
→ Origin Basis remains at world origin
```

**Step 2: Transform Form**

```
User activates Move tool
→ Clicks/drags Editing Basis W-axis handle
→ Form moves along W-axis (grid snapping to 0.1)
→ Coordinate inputs update in real-time
→ Origin Basis stays at world origin (reference)
```

**Step 3: Release/Deposit**

```
User releases mouse button (or clicks NOW button)
→ Instance auto-created with Form's current transform
→ Instance deposited in scene at (W:2.5, X:0, Y:0, Z:0)
→ Form resets to origin (0,0,0,0)
→ Editing Basis disappears (nothing selected)
→ User can now select another Form or edit existing Instance
```

**Step 4: Select Instance (Edit Existing)**

```
User clicks on deposited Instance
→ Instance becomes selected (visual highlight/glow)
→ Editing Basis appears at Instance center
→ User can Move/Scale/Rotate the Instance
→ On release, Instance transform updates in StateManager
```

**Step 5: Delete Instance**

```
User selects Instance
→ Presses Delete key (or Delete button)
→ Instance removed from scene and StateManager
→ Action added to Undo stack
```

**Step 6: Undo/Redo**

```
User presses Cmd+Z (Undo)
→ Last action (create/move/delete) is reversed
→ StateManager reverts to previous state
→ Scene updates to match StateManager

User presses Cmd+Shift+Z (Redo)
→ Undone action is reapplied
→ StateManager advances forward
```

### StateManager Architecture

Following the proven TEUI/OBJECTIVE pattern (see [UI-Module.md](./UI-Module.md)), the `rt-state-manager.js` module manages all state:

#### State Structure

```javascript
/**
 * rt-state-manager.js
 * State management for ART Gumball system
 * Following TEUI/OBJECTIVE StateManager pattern
 */

const RTStateManager = {
  // Forms registry (templates at origin)
  forms: {
    tetrahedron: { type: 'tetrahedron', name: 'Tetrahedron', ... },
    cube: { type: 'cube', name: 'Hexahedron', ... },
    octahedron: { type: 'octahedron', name: 'Octahedron', ... },
    // ... all polyhedra types
  },

  // Active Form (currently being transformed)
  activeForm: null, // { type: 'tetrahedron', transform: {...}, threeObject: Group }

  // Deposited Instances (all "Nows")
  instances: [], // Array of Instance objects

  // Selection state
  selection: {
    type: null,      // 'form' or 'instance'
    id: null,        // Instance ID or null for Form
    object: null     // THREE.Object3D reference
  },

  // Undo/Redo stacks
  history: {
    undoStack: [],   // Past states
    redoStack: [],   // Future states (cleared on new action)
    maxHistory: 50   // Limit to prevent memory issues
  },

  // Gumball state
  gumball: {
    tool: null,           // 'move', 'scale', 'rotate', or null
    editingBasis: null,   // THREE.Group for localized gumball
    visible: false        // Show/hide editing basis
  }
};
```

#### Instance Data Structure

```javascript
const Instance = {
  id: String, // Unique UUID
  timestamp: Number, // Creation time
  type: String, // 'tetrahedron', 'cube', etc.

  transform: {
    position: {
      mode: String, // 'cartesian' or 'quadray'
      quadray: { w, x, y, z },
      cartesian: { x, y, z },
    },
    rotation: {
      mode: String, // 'spread' or 'euler'
      spreads: [{ plane, spread, exact }],
      euler: { x, y, z, order },
    },
    scale: { x, y, z, uniform },
  },

  appearance: {
    color: Number,
    opacity: Number,
    wireframe: Boolean,
    visible: Boolean,
  },

  metadata: {
    label: String,
    tags: [String],
    notes: String,
  },

  // THREE.js object reference (not serialized)
  threeObject: THREE.Group,
};
```

#### Core Functions

**Form Management**

```javascript
/**
 * Select a Form (load at origin with editing basis)
 */
function selectForm(formType) {
  // Clear previous selection
  if (RTStateManager.activeForm) {
    resetForm(RTStateManager.activeForm);
  }

  // Create Form at origin
  const form = {
    type: formType,
    transform: createDefaultTransform(),
    threeObject: createPolyhedronGroup(formType),
  };

  // Add to scene
  scene.add(form.threeObject);

  // Create editing basis at Form center
  createEditingBasis(form.threeObject.position);

  RTStateManager.activeForm = form;
  RTStateManager.selection = {
    type: "form",
    id: null,
    object: form.threeObject,
  };

  return form;
}

/**
 * Reset Form to origin (after instance creation)
 */
function resetForm(form) {
  form.threeObject.position.set(0, 0, 0);
  form.threeObject.rotation.set(0, 0, 0);
  form.threeObject.scale.set(1, 1, 1);
  form.transform = createDefaultTransform();
  hideEditingBasis();
}
```

**Instance Management**

```javascript
/**
 * Create Instance from active Form (auto-deposit on release)
 */
function createInstance() {
  if (!RTStateManager.activeForm) return null;

  const form = RTStateManager.activeForm;

  // Create Instance snapshot
  const instance = {
    id: generateUUID(),
    timestamp: Date.now(),
    type: form.type,
    transform: cloneTransform(form.transform),
    appearance: cloneAppearance(form.threeObject),
    metadata: { label: `${form.type}_${Date.now()}`, tags: [], notes: "" },
    threeObject: clonePolyhedronGroup(form.threeObject),
  };

  // Add to StateManager
  RTStateManager.instances.push(instance);

  // Add to scene
  scene.add(instance.threeObject);

  // Add to undo stack
  addToHistory({ action: "create", instance });

  // Reset Form to origin
  resetForm(form);

  return instance;
}

/**
 * Select an existing Instance (show editing basis)
 */
function selectInstance(instanceId) {
  const instance = RTStateManager.instances.find(i => i.id === instanceId);
  if (!instance) return;

  // Deselect Form if active
  if (RTStateManager.activeForm) {
    resetForm(RTStateManager.activeForm);
    RTStateManager.activeForm = null;
  }

  // Highlight Instance
  highlightObject(instance.threeObject);

  // Show editing basis at Instance center
  createEditingBasis(instance.threeObject.position);

  RTStateManager.selection = {
    type: "instance",
    id: instanceId,
    object: instance.threeObject,
  };
}

/**
 * Update Instance transform (after drag/edit)
 */
function updateInstance(instanceId, newTransform) {
  const instance = RTStateManager.instances.find(i => i.id === instanceId);
  if (!instance) return;

  // Store old transform for undo
  const oldTransform = cloneTransform(instance.transform);

  // Apply new transform
  instance.transform = newTransform;
  applyTransformToObject(instance.threeObject, newTransform);

  // Add to undo stack
  addToHistory({ action: "update", instanceId, oldTransform, newTransform });
}

/**
 * Delete Instance
 */
function deleteInstance(instanceId) {
  const index = RTStateManager.instances.findIndex(i => i.id === instanceId);
  if (index === -1) return;

  const instance = RTStateManager.instances[index];

  // Remove from scene
  scene.remove(instance.threeObject);

  // Remove from StateManager
  RTStateManager.instances.splice(index, 1);

  // Hide editing basis
  hideEditingBasis();

  // Clear selection
  RTStateManager.selection = { type: null, id: null, object: null };

  // Add to undo stack
  addToHistory({ action: "delete", instance, index });
}
```

**Selection & Highlighting**

```javascript
/**
 * Highlight selected object (outline glow effect)
 */
function highlightObject(object) {
  // Remove previous highlights
  clearHighlights();

  // Add outline pass or glow shader
  // Option 1: THREE.OutlinePass (post-processing)
  // Option 2: Edge glow shader on wireframe
  // Option 3: Colored outline geometry

  object.traverse(mesh => {
    if (mesh.isMesh) {
      mesh.userData.originalEmissive = mesh.material.emissive.clone();
      mesh.material.emissive.setHex(0x4a9eff); // Blue glow
      mesh.material.emissiveIntensity = 0.3;
    }
  });
}

/**
 * Clear all highlights
 */
function clearHighlights() {
  RTStateManager.instances.forEach(instance => {
    instance.threeObject.traverse(mesh => {
      if (mesh.isMesh && mesh.userData.originalEmissive) {
        mesh.material.emissive.copy(mesh.userData.originalEmissive);
        mesh.material.emissiveIntensity = 0;
      }
    });
  });
}

/**
 * Handle click on scene object (raycasting)
 */
function onSceneClick(event) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Check for Instance hits
  const instanceObjects = RTStateManager.instances.map(i => i.threeObject);
  const intersects = raycaster.intersectObjects(instanceObjects, true);

  if (intersects.length > 0) {
    // Find parent Instance
    let hitObject = intersects[0].object;
    while (hitObject.parent && !hitObject.userData.instanceId) {
      hitObject = hitObject.parent;
    }

    if (hitObject.userData.instanceId) {
      selectInstance(hitObject.userData.instanceId);
    }
  } else {
    // Clicked on empty space - deselect
    clearSelection();
  }
}
```

**Undo/Redo System**

```javascript
/**
 * Add action to history
 */
function addToHistory(action) {
  // Clear redo stack (new action invalidates future)
  RTStateManager.history.redoStack = [];

  // Add to undo stack
  RTStateManager.history.undoStack.push(action);

  // Limit history size
  if (
    RTStateManager.history.undoStack.length > RTStateManager.history.maxHistory
  ) {
    RTStateManager.history.undoStack.shift();
  }
}

/**
 * Undo last action
 */
function undo() {
  if (RTStateManager.history.undoStack.length === 0) return;

  const action = RTStateManager.history.undoStack.pop();

  switch (action.action) {
    case "create":
      // Remove Instance
      const index = RTStateManager.instances.findIndex(
        i => i.id === action.instance.id
      );
      if (index !== -1) {
        scene.remove(RTStateManager.instances[index].threeObject);
        RTStateManager.instances.splice(index, 1);
      }
      break;

    case "delete":
      // Re-add Instance
      RTStateManager.instances.splice(action.index, 0, action.instance);
      scene.add(action.instance.threeObject);
      break;

    case "update":
      // Revert transform
      updateInstance(action.instanceId, action.oldTransform);
      break;
  }

  // Add to redo stack
  RTStateManager.history.redoStack.push(action);
}

/**
 * Redo last undone action
 */
function redo() {
  if (RTStateManager.history.redoStack.length === 0) return;

  const action = RTStateManager.history.redoStack.pop();

  switch (action.action) {
    case "create":
      // Re-add Instance
      RTStateManager.instances.push(action.instance);
      scene.add(action.instance.threeObject);
      break;

    case "delete":
      // Remove Instance again
      const index = RTStateManager.instances.findIndex(
        i => i.id === action.instance.id
      );
      if (index !== -1) {
        scene.remove(RTStateManager.instances[index].threeObject);
        RTStateManager.instances.splice(index, 1);
      }
      break;

    case "update":
      // Re-apply new transform
      updateInstance(action.instanceId, action.newTransform);
      break;
  }

  // Add back to undo stack
  RTStateManager.history.undoStack.push(action);
}
```

**Editing Basis (Localized Gumball)**

```javascript
/**
 * Create editing basis at specified position
 */
function createEditingBasis(position) {
  // Remove existing editing basis
  if (RTStateManager.gumball.editingBasis) {
    scene.remove(RTStateManager.gumball.editingBasis);
  }

  // Create new basis group
  const editingBasis = new THREE.Group();
  editingBasis.position.copy(position);

  // Add basis vectors (same as origin basis, but localized)
  const basisVectors = createBasisVectors(currentCoordinateSystem); // 'XYZ' or 'WXYZ'
  editingBasis.add(basisVectors);

  // Add to scene
  scene.add(editingBasis);

  RTStateManager.gumball.editingBasis = editingBasis;
  RTStateManager.gumball.visible = true;
}

/**
 * Update editing basis position (follow selected object)
 */
function updateEditingBasisPosition(position) {
  if (RTStateManager.gumball.editingBasis) {
    RTStateManager.gumball.editingBasis.position.copy(position);
  }
}

/**
 * Hide editing basis (nothing selected)
 */
function hideEditingBasis() {
  if (RTStateManager.gumball.editingBasis) {
    scene.remove(RTStateManager.gumball.editingBasis);
    RTStateManager.gumball.editingBasis = null;
    RTStateManager.gumball.visible = false;
  }
}
```

### User Interactions

**Keyboard Shortcuts**

- `G` - Activate Move tool
- `S` - Activate Scale tool
- `R` - Activate Rotate tool
- `Esc` - Deactivate current tool / Deselect
- `Delete` / `Backspace` - Delete selected Instance
- `Cmd+Z` / `Ctrl+Z` - Undo
- `Cmd+Shift+Z` / `Ctrl+Shift+Z` - Redo
- `N` - Deposit Now (create Instance from active Form)

**Mouse Interactions**

- **Click on canvas (empty space)** - Deselect all
- **Click on Instance** - Select Instance (show editing basis + highlight)
- **Click on Form in list** - Select Form (load at origin with editing basis)
- **Click + Drag gumball handle** - Transform selected object (Form or Instance)
- **Release mouse** - Auto-deposit Instance if Form was moved

**UI Buttons**

- **Move / Scale / Rotate** - Toggle gumball tool mode
- **NOW** - Manually deposit Instance from active Form
- **Delete** - Delete selected Instance
- **Undo / Redo** - History navigation

## StateManager Integration

### Environment State (Captured Once)

The **global environment** is captured once as metadata, NOT in each Now:

```javascript
const environmentState = {
  version: "1.0",
  timestamp: Date.now(),

  // Global settings
  grids: {
    cartesian: {
      visible: Boolean,
      tessellation: Number,
    },
    quadray: {
      visible: Boolean,
      tessellation: Number,
    },
  },

  basis: {
    cartesian: Boolean,
    quadray: Boolean,
  },

  camera: {
    position: { x, y, z },
    target: { x, y, z },
    zoom: Number,
  },

  // RT Constants
  constants: {
    tetrahedronEdge: Number,
    cubeEdge: Number,
    gridUnit: Number,
  },
};
```

### Session Export Format

```javascript
const sessionExport = {
  meta: environmentState,
  nows: nowCollection.nows,
};
```

**CSV Export (for Now sequence):**

```csv
id,timestamp,polyhedron,mode,qW,qX,qY,qZ,spreadWX,spreadWY,spreadWZ,spreadXY,spreadXZ,spreadYZ,scaleX,scaleY,scaleZ,label
uuid1,1234567890,tetrahedron,quadray,1,0,0,0,0,0,0,0,0,0,1,1,1,Origin
uuid2,1234567891,tetrahedron,quadray,2,0,0,0,0,0,0,0.5,0,0,1,1,1,Lattice_01
uuid3,1234567892,cube,quadray,0,2,0,0,0,0,0,0,0,0,1.414,1.414,1.414,Cube_Center
...
```

## Implementation Roadmap

### Status Summary (Updated 2025-01-26)

| Phase                        | Status       | Key Features                                      |
| ---------------------------- | ------------ | ------------------------------------------------- |
| **Phase 1: Core Gumball**    | ✅ COMPLETED | Move/Scale/Rotate modes, XYZ+WXYZ handles         |
| **Phase 1.5: StateManager**  | ✅ COMPLETED | Forms/Instances, NOW button, reset workflow       |
| **Phase 1.6: Selection**     | ✅ PARTIAL   | Click-to-select, highlight glow (no multi-select) |
| **Phase 1.7: Polish**        | ✅ PARTIAL   | Scale/Rotate handles (no keyboard shortcuts)      |
| **Phase 2: Spread Rotation** | ✅ PARTIAL   | Rotation handles, Degrees↔Spread (no presets)     |
| **Phase 3: NOW System**      | ✅ PARTIAL   | Instance deposition (no full RT-pure schema)      |
| **Phase 4: Import/Export**   | ❌ PENDING   | JSON/CSV export                                   |
| **Phase 5: Advanced**        | ❌ PENDING   | Timeline, Undo/Redo, Trajectories                 |

**Branch:** `GUMBALL-REFINE`
**Primary Code Location:** `modules/rt-init.js`
**StateManager:** `modules/rt-state-manager.js`

---

### Phase 1: Core Gumball (MVP) - ✅ COMPLETED

- [x] Minimal UI controls (Controls section)
  - [x] ~~Coordinate mode toggle (Cartesian XYZ / Quadray WXYZ)~~ - Uses existing Coordinate System section
  - [x] Tool mode selector (Move / Scale / Rotate)
  - [x] ~~Polyhedron selection dropdown~~ - Works with currently selected polyhedra
  - [x] NOW button with deposited count (UI only, functionality pending)
  - [x] XYZ coordinate input fields (3 inputs with 4dp precision)
  - [x] WXYZ coordinate input fields (4 inputs with 4dp precision)
- [x] Interactive 3D gumball handles (basis vectors ARE the gumball)
  - [x] MOVE mode: Arrow handles at basis vector tips
    - [x] **Cartesian: 3 arrows (X, Y, Z) - ✅ IMPLEMENTED**
    - [x] **Quadray: 4 arrows (W, X, Y, Z) - ✅ IMPLEMENTED**
    - [x] **Click + drag arrow = constrained move along that axis - ✅ WORKING**
  - [x] **SCALE mode: Cube handles at basis vector tips - ✅ IMPLEMENTED**
    - [x] **Cartesian: 3 cubes + center sphere (uniform) - ✅ IMPLEMENTED**
    - [x] **Quadray: 4 cubes + center sphere (uniform) - ✅ IMPLEMENTED**
    - [x] **Click + drag cube = scale in that direction - ✅ WORKING**
  - [x] **Visual feedback: Real-time transform preview - ✅ WORKING**
  - [x] **Real-time coordinate updates during drag - ✅ WORKING**
- [ ] Status bar for numeric input - DEFERRED (using coordinate input fields instead)
  - [ ] Appears on handle click
  - [ ] Live value display
  - [ ] Keyboard input for precise values
  - [ ] TAB/ENTER to accept, ESC to cancel

**Implementation Notes (Phase 1):**

- **Date:** 2025-12-29
- **Commit:** `f4e30fe` - "Feat: Implement WXYZ Move gumball with grid snapping (MVP)"
- **Branch:** `Gumball`
- **Status:** MVP working with known limitations requiring architectural improvements

**Files Modified:**

- `ARTexplorer.html` (lines 1307-1321, 2311-2510): Gumball implementation
  - Added invisible hit spheres (0.3 radius) at basis vector tips
  - Tool mode buttons with toggle behavior (default off)
  - Raycasting and drag event listeners
  - Grid snapping to 0.1 increments
  - Real-time coordinate updates (XYZ and WXYZ)

**What's Working:**

- ✅ Invisible clickable handles at basis vector tips
- ✅ Constrained axis movement (drag along W, X, Y, Z)
- ✅ Grid snapping to 0.1 for RT precision
- ✅ Real-time coordinate display (4dp, text inputs without spinners)
- ✅ 5x sensitivity multiplier for responsive dragging
- ✅ Entire polyhedra groups move together

**Critical Issues Identified:**

1. **Orbit lock incomplete** - Camera still rotates during drag attempts
   - `controls.enabled = false` not fully preventing orbit
   - May need `event.stopPropagation()` at canvas level

2. **Basis vectors stationary** - Global basis stays at origin
   - Need **localized gumball** that follows selected polyhedra
   - Each selected object should have its own transform gizmo

3. **Instance management broken** - Only first selection works
   - Second polyhedra (icosahedron) loads at origin but won't move
   - Need proper instance/selection system
   - StateManager integration required

4. **Selection model unclear** - Multiple polyhedra vs. single active
   - Should moved polyhedra become "instances"?
   - How to select/deselect for subsequent moves?

**Architectural Decisions Needed:**

**Option A: Global Gumball (Current)**

- Single basis vector set at world origin
- Selected polyhedra move relative to global axes
- ❌ Basis doesn't follow objects
- ❌ Confusing UX when polyhedra far from origin

**Option B: Localized Gumball (Recommended)**

- Each selected polyhedra gets own gumball at its center
- Basis vectors move with the object
- ✅ Matches Maya/Blender/Rhino UX
- ✅ Clear visual feedback
- Need: Gumball attachment/detachment system

**Option C: Hybrid (Best for RT)**

- Global Quadray basis always visible (reference frame)
- Local gumball overlays on selected object
- Can toggle between local/global transform space
- Most powerful but most complex

**Next Steps:**

**Phase 1.5: Forms, Instances & StateManager (CRITICAL ARCHITECTURE)** - ✅ COMPLETED (2025-12-29)

- [x] **Localized editing basis (Option C: Hybrid approach) - ✅ IMPLEMENTED**
  - [x] **Global origin basis remains visible at (0,0,0) as reference frame** - we changed this to hide during edits: complete
  - [x] **Editing basis appears at selected Form center when Move tool activated**
  - [x] **Editing basis follows Forms during drag operations**
  - [x] **Hit spheres positioned correctly in WXYZ quadray coordinate system**
  - [x] **Semi-transparent debug spheres (0.5 radius, 30% opacity) at arrow tips**
- [x] **Orbit controls management - ✅ FIXED**
  - [x] **Orbit disabled when Move tool activated (not just during drag)**
  - [x] **Orbit re-enabled when Move tool deactivated**
  - [x] **Clean tool-level control prevents camera fighting**
- [x] Create `rt-state-manager.js` module following TEUI/OBJECTIVE pattern - DEFERRED
  - [x] RTStateManager object with forms registry, instances array, selection state
  - [ ] Form management: `selectForm()`, `resetForm()`
  - [x] Instance management: `createInstance()`, `selectInstance()`, `updateInstance()`, `deleteInstance()`
  - [ ] Undo/Redo: `addToHistory()`, `undo()`, `redo()` with action stacks
- [x] Integrate Forms/Instances workflow - PENDING Phase 2
  - [x] Auto-deposit Instance on mouseup (create from active Form)
  - [x] Reset Form to origin after Instance creation
  - [x] Track all instances in RTStateManager.instances array

**Phase 1.6: Selection & Deletion** - ✅ PARTIALLY COMPLETED (2025-01-26)

- [x] **Implement click-to-select for Forms and Instances - ✅ IMPLEMENTED**
  - [x] **Raycasting on canvas click (`onCanvasClick`, `selectPolyhedron`) - ✅ WORKING**
  - [x] **`selectPolyhedron()` shows editing basis + highlight - ✅ WORKING**
  - [x] **ESC key to deselect (click empty space preserves selection for orbit) - ✅ WORKING**
- [x] **Visual highlight for selected objects - ✅ IMPLEMENTED**
  - [x] **Option 2: Emissive material glow (`applyHighlight`, `clearHighlight`) - ✅ WORKING**
  - [x] **Cyan glow (0x00ffff) with 0.8 emissive intensity for meshes**
  - [x] **Line color change + width increase for edges**
- [ ] Multi-select functionality - PENDING
  - [ ] Shift+click to add to selection
  - [ ] `selectedPolyhedra` array instead of single `currentSelection`
- [x] Delete functionality - PENDING
  - [x] Delete key removes selected Instance
  - [ ] Delete button in UI
  - [x] Remove from scene and StateManager
  - [ ] Add to undo stack
- [ ] Undo/Redo keyboard shortcuts - PENDING
  - [ ] Cmd+Z / Ctrl+Z for Undo
  - [ ] Cmd+Shift+Z / Ctrl+Shift+Z for Redo
  - [ ] Undo/Redo buttons in UI (optional)

**Phase 1.7: Cartesian XYZ Support & Polish** - ✅ COMPLETED (2025-01-26)

- [x] **Add Cartesian XYZ arrow dragging (same pattern as WXYZ) - ✅ IMPLEMENTED**
  - [x] **Create XYZ basis vectors in editing basis (X=red, Y=green, Z=blue)**
  - [x] **Add hit spheres at XYZ arrow tips**
  - [x] **Implement constrained movement along X, Y, Z axes**
  - [x] **Checkbox-controlled visibility: UI checkboxes determine which systems appear**
  - [x] **User can enable WXYZ only, XYZ only, or both simultaneously**
- [x] **Implement Scale and Rotate modes (using same hit sphere/torus pattern) - ✅ IMPLEMENTED**
  - [x] **Scale mode: Cube handles at arrow tips, central sphere for uniform scale**
  - [x] **Rotate mode: Torus hit zones (hexagonal for WXYZ, circular for XYZ)**
- [ ] Add keyboard shortcuts (G=Move, S=Scale, R=Rotate, ESC=Cancel/Deselect, N=NOW) - PENDING
- [ ] Visual feedback when handle is hovered (change color/scale) - PENDING
- [ ] Visual feedback when handle is selected during drag - PENDING
- [x] **Hit spheres/tori semi-transparent for debugging (opacity 0.2-0.3) - ✅ WORKING**

**Testing Observations (2025-12-29):**

- ✅ Cube and Dual Tetrahedron move together correctly
- ✅ Grid snapping works (positions snap to 0.1, 0.2, 0.3, etc.)
- ✅ Coordinate inputs update in real-time (both XYZ and WXYZ)
- ✅ Tool toggle works (click to activate, click again to deactivate)
- ✅ Movement is visually apparent and responsive
- ✅ Editing basis follows Forms during drag operations
- ✅ Hit spheres correctly positioned at both WXYZ and XYZ arrow tips
- ✅ Orbit controls locked when Move tool active
- ✅ Can perform multiple moves on same Form (editing basis persists)
- ✅ Checkbox control works: uncheck XYZ/WXYZ to hide respective handles
- ✅ Cleaner workspace when using single coordinate system
- ✅ Both systems can be enabled simultaneously for maximum flexibility

**Known Issues & Blockers (Updated 2025-01-26):**

✅ **RESOLVED: Selection System Implemented** - No longer blocking Phase 1.6+

**What's Working:**

- ✅ Click-to-select raycasting implemented (`onCanvasClick`, `selectPolyhedron`)
- ✅ Visual highlight glow via emissive material (cyan 0x00ffff, 0.8 intensity)
- ✅ Forms and Instances can be selected independently
- ✅ Selection persists during orbit (click empty space doesn't deselect)
- ✅ ESC key or NOW button to deselect
- ✅ Only selected polyhedron moves when gumball tool is active

**Remaining Issues:**

⚠️ **Multi-Select Not Yet Implemented**

- Current implementation uses single `currentSelection` object
- `selectedPolyhedra` array exists but not wired to multi-select logic
- Shift+click to add to selection not implemented

⚠️ **Delete/Undo Not Yet Implemented**

- Delete key functionality pending
- Undo/Redo stack not implemented

**Architectural Notes:**

- Gumball code extracted from ARTexplorer.html to `modules/rt-init.js`
- RTStateManager in `modules/rt-state-manager.js` handles Forms/Instances
- Consider future extraction of gumball to dedicated `rt-controls.js` module

### Phase 2: Spread-Based Rotation - ✅ PARTIALLY COMPLETED (2025-01-26)

- [x] **ROTATE mode: Polygon handles - ✅ IMPLEMENTED**
  - [x] **Cartesian XYZ: 3 rotation handles around each axis (X, Y, Z) - ✅ WORKING**
    - [x] **Each handle = smooth circle (64 segments) perpendicular to rotation axis**
    - [x] **Color-coded to axis color (R, G, B)**
    - [x] **Torus hit zone for clicking (0.15 thickness)**
  - [x] **Quadray WXYZ: 4 rotation handles around each basis (W, X, Y, Z) - ✅ WORKING**
    - [x] **Each handle = hexagon (6 segments) perpendicular to basis vector**
    - [x] **Color-coded to basis (R, G, B, Y)**
- [x] **Bidirectional Degrees↔Spread conversion in input fields - ✅ IMPLEMENTED**
  - [x] **`RT.degreesToSpread()` and `RT.spreadToDegrees()` functions**
  - [x] **Real-time conversion as user types in either field**
- [x] **Rotation via input fields (Enter key applies rotation) - ✅ WORKING**
- [ ] Exact spread preset buttons in UI - PENDING
  - [ ] [0] [1/6] [1/4] [1/3·tet] [1/2·45°] [2/3] [3/4] [1·90°]
- [ ] Interactive drag-based rotation on handles - PENDING
- [ ] Visual feedback during rotation drag - PENDING

### Phase 3: "Now" System - ✅ PARTIALLY COMPLETED (2025-01-26)

- [x] **NOW button functionality - ✅ IMPLEMENTED**
  - [x] **`RTStateManager.createInstance()` deposits selected Form as Instance**
  - [x] **Form resets to origin after deposition (`RTStateManager.resetForm()`)**
  - [x] **Matrix forms trigger geometry update after deposition**
- [x] **Now counter display - ✅ WORKING**
  - [x] **`RTStateManager.getDepositedCount()` updates counter UI**
- [x] **Instance rendering in scene - ✅ WORKING**
  - [x] **Instances tracked in RTStateManager and visible in scene**
  - [x] **Instances selectable via click (same as Forms)**
- [ ] Now data structure (full RT-pure schema) - PARTIALLY IMPLEMENTED
  - [x] Basic transform data (position, rotation, scale) stored
  - [ ] Full quadray coordinates storage
  - [ ] Spread-based rotation storage (currently Euler)
  - [ ] Metadata (label, tags, notes)
- [ ] `createNow()` with full RT-pure data capture - PENDING
- [ ] Now collection management (add/remove/clear) - PARTIALLY IMPLEMENTED

### Phase 4: Import/Export

- [x] JSON export for Nows
- [ ] CSV export for Nows
- [x] Import functionality
- [x] Environment state capture
- [x] Session file format (.json)

### Phase 5: Advanced Features

- [ ] Now timeline visualization
- [ ] Now editing/deletion
- [ ] Instance ghosting/hiding
- [ ] Trajectory paths between Nows
- [ ] Animation interpolation (optional)
- [ ] Lattice snap-to-grid (Quadray mode)

## RT Purity Checklist

To maintain Rational Trigonometry principles:

- ✅ All positions stored as algebraic coordinates (Quadray preferred)
- ✅ All rotations defined by spread (not degrees)
- ✅ Exact algebraic spread values provided as presets
- ✅ Quadrance used internally (not distance)
- ✅ No transcendental functions in core logic
- ✅ Floating-point only for final rendering (THREE.js requirement)
- ✅ Reversible transforms (spread arithmetic is exact)

## Mathematical Foundations

### Spread Formula

For two lines L₁ and L₂ meeting at point P:

**Spread s = Q_quad / R_quad**

Where:

- **Q_quad**: Quadrance from P to closest point on opposite line (perpendicular distance²)
- **R_quad**: Quadrance from P along the line (radius²)

**Properties:**

- 0 ≤ s ≤ 1 (always bounded, unlike angles)
- s = 0: Parallel lines
- s = 1: Perpendicular lines
- s = 1/2: 45° angle (common in tetrahedral geometry)

### Spread Laws (Wildberger's RT)

**Spread Law (analog of sine rule):**

```
s₁/Q₁ = s₂/Q₂ = s₃/Q₃
```

**Cross Law (analog of cosine rule):**

```
(Q₁ + Q₂ + Q₃)² = 2(Q₁² + Q₂² + Q₃²) + 8Q₁Q₂Q₃(1-s₁)(1-s₂)(1-s₃)
```

**Triple Spread Formula:**

```
(s₁ + s₂ + s₃)² = 2(s₁² + s₂² + s₃²) + 4s₁s₂s₃
```

### Exact Algebraic Spreads

Common spreads in Platonic/Archimedean solids:

| Spread | Exact Value | Angle (approx) | Geometry                  |
| ------ | ----------- | -------------- | ------------------------- |
| 0      | 0           | 0°             | Parallel                  |
| 1/6    | 1/6         | ≈23.6°         | -                         |
| 1/4    | 1/4         | 30°            | -                         |
| 1/3    | 1/3         | ≈35.3°         | Tetrahedron dihedral      |
| 1/2    | 1/2         | 45°            | Octahedron, cube diagonal |
| 2/3    | 2/3         | ≈54.7°         | Cube diagonal to edge     |
| 3/4    | 3/4         | 60°            | -                         |
| 1      | 1           | 90°            | Perpendicular             |

## References

- **Rational Trigonometry**: N.J. Wildberger, "Divine Proportions: Rational Trigonometry to Universal Geometry" (2005)
- **Julian Barbour**: "The End of Time" - Timeless physics and configuration space
- **Quadray Coordinates**: R. Buckminster Fuller, "Synergetics" (1975)
- **ARTexplorer**: See [ARTexplorer.md](./ARTexplorer.md) for base implementation

## Future Research Directions

### Exact Trajectory Calculation

Using spread-based rotations, we can calculate **exact trajectories** without floating-point drift:

- Orbital paths in tetrahedral lattice
- Geodesic paths on polyhedra
- Lattice filling patterns

### Quantum Geometry Integration

RT's algebraic exactness may align with:

- Discrete spacetime models
- Loop quantum gravity (spin networks)
- Causal set theory

### Computational Advantages

- **GPU shaders**: Spread polynomials may be faster than sin/cos
- **Symbolic computation**: Keep transforms in algebraic form
- **Exact inverse kinematics**: No iterative solving needed

---

## Session Plan: 2025-12-30 - Selection System & StateManager (CRITICAL)

### Current State (as of 2025-12-29 EOD)

**Branch:** Gumball
**Commit:** 2cf2da1 - "Revert: Reset to working inline gumball version for analysis"

**What We Have:**

- ✅ Working inline gumball implementation in ARTexplorer.html
- ✅ Extracted rt-controls.js module saved for comparison
- ✅ Move tool with WXYZ and XYZ dual coordinate system support
- ✅ Grid snapping, real-time coordinate updates, editing basis following forms
- ✅ Backup branch `backup-broken-state` preserving broken extraction attempt

**What's Broken:**

- ❌ Previous hasty rt-controls.js extraction broke all axis movement except W-axis (partially)
- ❌ Cannot undo/redo, or isolate individual objects

### Priority 1: Analyze Failed Module Extraction (2-3 hours)

**Goal:** Understand what broke when extracting gumball code to rt-controls.js module

**Tasks:**

1. **Side-by-side comparison** - Compare inline gumball code in ARTexplorer.html with extracted rt-controls.js
2. **Identify broken dependencies:**
   - What global variables does inline code access?
   - Which THREE.js objects (scene, camera, renderer, controls) need proper passing?
   - How do event listeners differ between inline and module contexts?
   - Why does editing basis creation fail in module but work inline?
   - What causes X/Y/Z axes to break while W-axis works partially?
3. **Document findings** - Create detailed analysis of what dependencies must be preserved
4. **Plan systematic extraction** - Design incremental approach with testing at each step

**Key Questions to Answer:**

- Does inline code rely on global `scene`, `camera`, `renderer`, `controls` variables?
- Are there closure/scope issues with `this` binding in ES6 module class?
- Do event listeners lose context when moved to module?
- Is `editingBasis` reference lost between inline and module?
- What's different about W-axis that makes it partially work vs X/Y/Z total failure?

**Deliverable:** Analysis document outlining exact dependencies and extraction plan

---

### Priority 2: Implement Selection System (4-5 hours)

**Goal:** Enable click-to-select individual polyhedra/instances with visual feedback

**CRITICAL:** This is blocking all further progress. Without selection, we cannot:

- Distinguish Forms (templates at origin) from Instances (deposited snapshots)
- Edit individual objects without affecting everything globally
- Implement delete functionality
- Track state properly
- Have a functional Forms/Instances workflow

**Tasks:**

#### 2.1: Click-to-Select Raycasting

```javascript
/**
 * Handle canvas click for object selection
 * Add to ARTexplorer.html (inline for now, extract later)
 */
function onCanvasClick(event) {
  // Prevent selection during gumball drag operations
  if (isDragging) return;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Convert mouse position to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Check for polyhedra hits (all groups with userData.polyhedronType)
  const selectableObjects = [];
  scene.traverse(obj => {
    if (obj.userData && obj.userData.polyhedronType) {
      selectableObjects.push(obj);
    }
  });

  const intersects = raycaster.intersectObjects(selectableObjects, true);

  if (intersects.length > 0) {
    // Find parent group (traverse up from mesh to group)
    let hitObject = intersects[0].object;
    while (hitObject.parent && !hitObject.userData.polyhedronType) {
      hitObject = hitObject.parent;
    }

    selectPolyhedron(hitObject);
  } else {
    // Clicked empty space - deselect all
    deselectAll();
  }
}

// Attach listener
renderer.domElement.addEventListener("click", onCanvasClick);
```

#### 2.2: Visual Selection Highlight

```javascript
/**
 * Highlight selected polyhedron with emissive glow
 */
let currentSelection = null;

function selectPolyhedron(polyhedron) {
  // Deselect previous
  if (currentSelection) {
    clearHighlight(currentSelection);
  }

  // Highlight new selection
  currentSelection = polyhedron;
  applyHighlight(polyhedron);

  console.log(`✅ Selected: ${polyhedron.userData.polyhedronType}`);
}

function applyHighlight(polyhedron) {
  polyhedron.traverse(mesh => {
    if (mesh.isMesh) {
      // Store original emissive for restoration
      mesh.userData.originalEmissive = mesh.material.emissive.clone();
      mesh.userData.originalEmissiveIntensity = mesh.material.emissiveIntensity;

      // Apply blue glow
      mesh.material.emissive.setHex(0x4a9eff);
      mesh.material.emissiveIntensity = 0.3;
    }
  });
}

function clearHighlight(polyhedron) {
  polyhedron.traverse(mesh => {
    if (mesh.isMesh && mesh.userData.originalEmissive) {
      mesh.material.emissive.copy(mesh.userData.originalEmissive);
      mesh.material.emissiveIntensity = mesh.userData.originalEmissiveIntensity;
    }
  });
}

function deselectAll() {
  if (currentSelection) {
    clearHighlight(currentSelection);
    currentSelection = null;
  }
  console.log("✅ Deselected all");
}
```

#### 2.3: Integrate Selection with Gumball

```javascript
/**
 * Modify getSelectedPolyhedra() to return ONLY currently selected object
 * Replace the TEMPORARY workaround that selects all visible polyhedra
 */
function getSelectedPolyhedra() {
  // Return only the currently selected polyhedron
  if (currentSelection) {
    return [currentSelection];
  }
  return [];
}
```

**Testing Checklist:** ✅ ALL PASSING (2025-01-26)

- [x] Click on hexahedron → hexahedron glows cyan, becomes selected
- [x] Click on dual tetrahedron → tetrahedron glows, hexahedron deselects
- [x] Click on empty space → selection preserved (allows orbiting between transforms)
- [x] ESC key or NOW button → deselects all
- [x] Activate Move tool on selected object → only selected object moves
- [x] Deactivate Move tool → glow persists (selection separate from tool state)
- [x] Multiple clicks on same object → remains selected (no toggle)

**Deliverable:** Working click-to-select with visual feedback, only selected objects move

---

### Priority 3: Implement StateManager (3-4 hours)

**Goal:** Create `rt-state-manager.js` module following TEUI/OBJECTIVE pattern

**Why Critical:**

- Without StateManager, we cannot distinguish Forms from Instances
- Cannot track deposited instances for delete/undo/redo
- Cannot export/import sessions
- Cannot implement proper NOW button workflow

**Tasks:**

#### 3.1: Create rt-state-manager.js Module

```javascript
/**
 * rt-state-manager.js
 * State management for ART Gumball system
 * Following TEUI/OBJECTIVE StateManager pattern
 */

export const RTStateManager = {
  // Forms registry (templates - always at origin)
  forms: {
    tetrahedron: { type: "tetrahedron", name: "Tetrahedron" },
    cube: { type: "cube", name: "Hexahedron" },
    octahedron: { type: "octahedron", name: "Octahedron" },
    icosahedron: { type: "icosahedron", name: "Icosahedron" },
    dodecahedron: { type: "dodecahedron", name: "Dodecahedron" },
    dualTetrahedron: { type: "dualTetrahedron", name: "Dual Tetrahedron" },
  },

  // Active Form (currently being transformed, NOT yet deposited)
  activeForm: null,

  // Deposited Instances (all "Nows" - immutable snapshots)
  instances: [],

  // Selection state
  selection: {
    type: null, // 'form' or 'instance'
    id: null, // Instance ID or null for Form
    object: null, // THREE.Object3D reference
  },

  // Undo/Redo stacks
  history: {
    undoStack: [],
    redoStack: [],
    maxHistory: 50,
  },

  // Gumball state
  gumball: {
    tool: null, // 'move', 'scale', 'rotate', or null
    editingBasis: null, // THREE.Group for localized gumball
    visible: false,
  },
};

/**
 * Create Instance from current transform state
 */
export function createInstance(polyhedronGroup, scene) {
  const instance = {
    id: generateUUID(),
    timestamp: Date.now(),
    type: polyhedronGroup.userData.polyhedronType,
    transform: {
      position: {
        cartesian: {
          x: polyhedronGroup.position.x,
          y: polyhedronGroup.position.y,
          z: polyhedronGroup.position.z,
        },
      },
      rotation: {
        euler: {
          x: polyhedronGroup.rotation.x,
          y: polyhedronGroup.rotation.y,
          z: polyhedronGroup.rotation.z,
        },
      },
      scale: {
        x: polyhedronGroup.scale.x,
        y: polyhedronGroup.scale.y,
        z: polyhedronGroup.scale.z,
      },
    },
    threeObject: polyhedronGroup.clone(), // Deep clone for independence
  };

  // Add to instances array
  RTStateManager.instances.push(instance);

  // Add to scene
  scene.add(instance.threeObject);

  // Add to undo stack
  addToHistory({ action: "create", instance });

  console.log(
    `✅ Instance created: ${instance.type} #${RTStateManager.instances.length}`
  );

  return instance;
}

/**
 * Delete Instance by ID
 */
export function deleteInstance(instanceId, scene) {
  const index = RTStateManager.instances.findIndex(i => i.id === instanceId);
  if (index === -1) return;

  const instance = RTStateManager.instances[index];

  // Remove from scene
  scene.remove(instance.threeObject);

  // Remove from array
  RTStateManager.instances.splice(index, 1);

  // Add to undo stack
  addToHistory({ action: "delete", instance, index });

  console.log(`✅ Instance deleted: ${instance.type}`);
}

/**
 * Generate UUID for instances
 */
function generateUUID() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add action to undo stack
 */
function addToHistory(action) {
  RTStateManager.history.undoStack.push(action);
  RTStateManager.history.redoStack = []; // Clear redo on new action

  // Limit history size
  if (
    RTStateManager.history.undoStack.length > RTStateManager.history.maxHistory
  ) {
    RTStateManager.history.undoStack.shift();
  }
}
```

#### 3.2: Integrate StateManager with NOW Button

```javascript
/**
 * Update NOW button to use StateManager
 * ARTexplorer.html
 */
document.getElementById("now-btn").addEventListener("click", () => {
  const selectedPolyhedra = getSelectedPolyhedra();

  if (selectedPolyhedra.length === 0) {
    console.warn("⚠️ No polyhedra selected - cannot deposit instance");
    return;
  }

  // Deposit each selected polyhedron as instance
  selectedPolyhedra.forEach(poly => {
    const instance = createInstance(poly, scene);

    // Update counter
    document.getElementById("now-count").textContent =
      RTStateManager.instances.length;
  });
});
```

**Testing Checklist:** ✅ ALL PASSING (2025-01-26)

- [x] Import rt-state-manager.js into rt-init.js (modular architecture)
- [x] Select polyhedron, move it, click NOW → instance created and tracked
- [x] Instance counter increments correctly (`RTStateManager.getDepositedCount()`)
- [x] Multiple NOW clicks → multiple instances at same/different positions
- [x] Instances persist in scene independently
- [x] Console logs show instance creation with unique IDs

**Deliverable:** Functional StateManager tracking all instances with NOW button integration

---

### Priority 4: Forms vs Instances Workflow (2-3 hours)

**Goal:** Implement proper separation between Forms (templates at origin) and Instances (deposited snapshots)

**Current Problem:**

- When a polyhedron is moved and deposited via NOW, it remains in the moved position
- The "Form" (template) should reset to origin after deposition
- User should be able to create multiple instances from same Form without interference

**Proposed Workflow:**

#### 4.1: Reset Form After Instance Creation

```javascript
/**
 * After depositing instance, reset Form to origin
 */
function depositAndResetForm(formGroup, scene) {
  // Create instance at current transform
  const instance = createInstance(formGroup, scene);

  // Reset Form to origin
  formGroup.position.set(0, 0, 0);
  formGroup.rotation.set(0, 0, 0);
  formGroup.scale.set(1, 1, 1);

  // Update coordinate inputs
  updateCoordinateInputs(formGroup);

  console.log(`✅ Form reset to origin, instance deposited`);

  return instance;
}
```

#### 4.2: Mark Forms vs Instances in userData

```javascript
/**
 * When creating polyhedra groups in initScene()
 */
cubeGroup.userData.isForm = true; // Template at origin
cubeGroup.userData.polyhedronType = "cube";

// When depositing instance
instance.threeObject.userData.isForm = false; // Deposited snapshot
instance.threeObject.userData.instanceId = instance.id;
```

#### 4.3: Selection Logic Differentiates Forms vs Instances

```javascript
/**
 * Update selectPolyhedron to track selection type
 */
function selectPolyhedron(polyhedron) {
  // ... existing highlight code ...

  // Update StateManager selection
  if (polyhedron.userData.isForm) {
    RTStateManager.selection = {
      type: "form",
      id: null,
      object: polyhedron,
    };
    console.log(`✅ Form selected: ${polyhedron.userData.polyhedronType}`);
  } else {
    RTStateManager.selection = {
      type: "instance",
      id: polyhedron.userData.instanceId,
      object: polyhedron,
    };
    console.log(`✅ Instance selected: ${polyhedron.userData.instanceId}`);
  }
}
```

**Testing Checklist:** ✅ ALL PASSING (2025-01-26)

- [x] Select Form (hexahedron at origin) → marked as Form in StateManager
- [x] Move Form to (1, 1, 1) → Form moves, origin basis stays at (0,0,0)
- [x] Click NOW → Instance deposited at (1,1,1), Form resets to (0,0,0)
- [x] Move Form again to (2, 2, 2) → First instance stays at (1,1,1)
- [x] Click NOW again → Second instance at (2,2,2), Form resets to (0,0,0)
- [x] Select first instance → marked as Instance in StateManager
- [x] Move first instance → only that instance moves, Form stays at origin
- [x] Forms always at origin after deposition, Instances independent

**Deliverable:** Working Forms/Instances separation with proper reset behavior

---

### Priority 5: Delete & Undo/Redo (2-3 hours) - OPTIONAL

**Goal:** Implement delete key and undo/redo keyboard shortcuts

**Only proceed if Priorities 1-4 completed and tested**

#### 5.1: Delete Key Functionality

```javascript
/**
 * Delete selected instance
 */
document.addEventListener("keydown", event => {
  if (event.key === "Delete" || event.key === "Backspace") {
    if (RTStateManager.selection.type === "instance") {
      deleteInstance(RTStateManager.selection.id, scene);

      // Clear selection
      deselectAll();

      // Update counter
      document.getElementById("now-count").textContent =
        RTStateManager.instances.length;
    } else {
      console.warn("⚠️ Cannot delete Forms (templates), only Instances");
    }
  }
});
```

#### 5.2: Undo/Redo Implementation

```javascript
/**
 * Undo last action
 */
function undo(scene) {
  if (RTStateManager.history.undoStack.length === 0) return;

  const action = RTStateManager.history.undoStack.pop();

  switch (action.action) {
    case "create":
      // Remove instance
      const index = RTStateManager.instances.findIndex(
        i => i.id === action.instance.id
      );
      if (index !== -1) {
        scene.remove(RTStateManager.instances[index].threeObject);
        RTStateManager.instances.splice(index, 1);
      }
      break;

    case "delete":
      // Re-add instance
      RTStateManager.instances.splice(action.index, 0, action.instance);
      scene.add(action.instance.threeObject);
      break;
  }

  RTStateManager.history.redoStack.push(action);
  console.log(`✅ Undo: ${action.action}`);
}

/**
 * Keyboard shortcuts
 */
document.addEventListener("keydown", event => {
  // Cmd+Z or Ctrl+Z
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key === "z" &&
    !event.shiftKey
  ) {
    event.preventDefault();
    undo(scene);
    document.getElementById("now-count").textContent =
      RTStateManager.instances.length;
  }

  // Cmd+Shift+Z or Ctrl+Shift+Z
  if ((event.metaKey || event.ctrlKey) && event.key === "z" && event.shiftKey) {
    event.preventDefault();
    redo(scene);
    document.getElementById("now-count").textContent =
      RTStateManager.instances.length;
  }
});
```

**Deliverable:** Delete key removes instances, Cmd+Z/Ctrl+Z undo/redo working

---

### Success Criteria for Session - ✅ COMPLETED (2025-12-30)

**Minimum (Must Complete):**

1. ✅ Analysis document explaining why module extraction failed
2. ✅ Click-to-select working with visual highlight
3. ✅ StateManager tracking instances
4. ✅ Forms reset to origin after NOW button pressed

**Stretch Goals (If Time Permits):** 5. ✅ Delete key functionality 6. ✅ Undo/Redo keyboard shortcuts

**Additional Improvements:** 7. ✅ Enhanced selection visibility (bright cyan glow, 0.8 intensity, 3x line width) 8. ✅ ESC key deselection 9. ✅ Click empty space to deselect 10. ✅ Fixed NOW button deselection (removes highlight glow)

**Deferred:**

- ❌ Module extraction of rt-controls.js (keep inline until selection is rock-solid)
- ❌ Scale or Rotate modes (focus on Move perfection first)

---

### Session Outcomes (2025-12-30)

**Key Commits:**

1. `acdca9f` - Feat: Implement click-to-select system with visual highlight
2. `cb8e495` - Feat: Implement RTStateManager with Forms/Instances workflow and keyboard shortcuts
3. `88d5a33` - Improve: Enhance selection visibility and fix deselection issues
4. `3eaf7ea` - Fix: Clear highlight glow when NOW button deposits instances

**Files Modified:**

- `src/geometry/ARTexplorer.html` - Selection system, StateManager integration, keyboard shortcuts
- `src/geometry/modules/rt-state-manager.js` - New module (500+ lines)
- `docs/development/Geometry documents/Module-Extraction-Analysis.md` - New analysis document

**Working Features:**

- ✅ Click to select Forms/Instances (bright cyan highlight)
- ✅ ESC or click empty space to deselect
- ✅ Move tool with WXYZ and XYZ dual coordinate systems
- ✅ NOW button deposits instances and resets Forms to origin
- ✅ Delete key removes selected Instance
- ✅ Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo
- ✅ 50-action history stack
- ✅ Export to JSON/CSV (RTStateManager methods)

**Known Issues to Refine:**

- Selection sensitivity during camera orbit (minor - acceptable for now)
- Snap modes need UI refinement (currently working but need better documentation)

---

**Status:** Session COMPLETE - All 7 priorities achieved + 3 bonus improvements
**Next Steps:**

1. Refine snap mode UI/UX
2. Add keyboard shortcut documentation to UI

---

### Session: Scale Mode Implementation (2025-12-30)

**Objective:** Implement Scale mode functionality for ART Gumball system to enable scaling of both Forms and Instances using cube handles and central sphere.

**Key Commits:**

1. `fdbfbd5` - Feat: Add Scale mode gumball functionality with cube handles
2. `fbd043f` - Fix: Increase scale sensitivity from 0.1 to 15.0 for meaningful scaling
3. [pending] - Fix: Enable scaling of selected objects (Forms and Instances)

**Files Modified:**

- `src/geometry/ARTexplorer.html` - Visual handle switching, scale dragging logic, selection-based scaling

**Implemented Features:**

- ✅ Visual handle switching: Cube handles for Scale mode, sphere handles for Move mode
- ✅ Central white sphere for uniform scaling
- ✅ Scale dragging logic with appropriate sensitivity (15.0)
- ✅ Dual coordinate system support: Quadray handles (WXYZ) and Cartesian handles (XYZ)
- ✅ Selection-based scaling: Works on both Forms at origin AND deposited Instances
- ✅ Direct THREE.js scaling: Uses `scale.set()` instead of slider manipulation
- ✅ Scale state tracking: Stores `userData.currentScale` for cumulative changes
- ✅ Reasonable bounds: Clamps scale to 0.1 - 10.0 range

**Scale Mode Workflow:**

1. User selects Form or Instance → cyan highlight appears
2. Click Scale button → arrow handles convert to cubes, central white sphere appears
3. Drag cube handle (axis-constrained) or central sphere (uniform) → object scales in real-time
4. For Forms: Sliders update to reflect scale (optional visual feedback)
5. For Instances: Direct scaling without slider interference
6. Click NOW button → deposits scaled instance to RTStateManager, resets Form to origin

**Technical Implementation:**

- **Handle Geometry**: Cubes (0.4 size, 0.5 opacity) replace spheres in Scale mode
- **Arrow Heads**: Removed in Scale mode (`headLength = 0`) for cleaner visual
- **Sensitivity**: 15.0 (vs 5.0 for Move mode) for visible scaling
- **Scale Calculation**: Percentage-based multiplier (`1 + scaleDelta * 0.01`)
- **Cumulative Scaling**: Each drag multiplies current scale by delta
- **Uniform Scaling**: All three axes scaled equally (`scale.set(s, s, s)`)

**Future Refinements (Deferred):**

- ⏳ Rational scaling steps: Align scale increments with 0.1 slider steps for rational consistency
- ⏳ Cube=Rational vs Tetrahedron=Rational: Respect which polyhedron type uses rational edge lengths
- ⏳ Snap-aware scaling: Coordinate scaling with XYZ/WXYZ snap modes (0.100 steps)
- ⏳ Non-uniform scaling: Per-axis deformations (stretch/compress along individual axes)
- ⏳ Scale visualization: Display current scale value near gumball during drag

**Known Limitations:**

- Current implementation uses continuous floating-point scale multipliers rather than rational 0.1 steps
- Slider synchronization for Forms uses base edge lengths (1.4142 for cube, 2.0 for tet) - may need refinement
- No visual feedback of current scale value during drag (console only)

**Note:** The Scale mode now works correctly on both Forms and Instances. The rational scaling refinement is intentionally deferred to maintain clean, working code. When we return to implement rational scaling, we should:

1. Quantize scale deltas to 0.1 increments
2. Respect Cube=Rational vs Tetrahedron=Rational edge length conventions
3. Ensure scale steps align with XYZ/WXYZ snap grid intervals
4. Maintain algebraic precision throughout scaling operations

---

**Status:** Scale Mode FUNCTIONAL - Basic scaling complete, rational refinements deferred
**Next Steps:**

1. Return to rational scaling implementation (coordinate with snap modes)
2. Add Rotate mode functionality
3. Consider per-axis (non-uniform) scaling with deformation controls
4. Consider Scale and Rotate modes after Move is perfected

ADDED 2025.12.30:

1. Is the ART-Gumball.md specification detailed enough?
   YES, the specification is very detailed for rotation: ✅ Well-defined:
   Lines 118-277: Complete rotation specification
   Spread-to-rotation matrix conversion (lines 168-234)
   Exact algebraic spread values (lines 236-251)
   Hexagonal handles for WXYZ, circular for XYZ (lines 582-603)
   Rotation around each axis (perpendicular planes)
   ✅ Missing pieces YOU just clarified:
   Two numeric input fields (degrees AND spread) - NOT in current spec
   Selection → Rotate → Drag workflow - Matches Move/Scale pattern
   Spread snapping at 0.1 intervals - Already specified but needs UI fields
2. THREE.js Rotation Helpers:
   YES, THREE.js has built-in helpers we can leverage:

// THREE.js provides rotation helpers, but they use ANGLES, not spreads
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

// TransformControls has built-in rotation rings
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.attach(mesh);
transformControls.setMode('rotate'); // Built-in rotation gizmo!
scene.add(transformControls);
However, for RT-purity and your hexagon specification, I recommend:
Custom Implementation (Better for RT-purity):
Reasons:
THREE.TransformControls uses angles internally, not spreads
We want hexagonal handles for WXYZ (not circles)
We need spread-based snapping (0.1, 0.2, ... 1.0)
Must show both degrees AND spread in real-time
Leverage from THREE.js:

// We CAN use these THREE.js utilities:
THREE.TorusGeometry() // For circular XYZ handles
THREE.CylinderGeometry() // For hexagonal WXYZ handles (6 sides)
THREE.Matrix4 // For rotation matrix application
object.applyMatrix4() // Apply spread-based rotation
Implementation Plan for Rotation Mode:
Step 1: Add Numeric Input Fields (Controls Section)

<!-- Add to Controls section in ARTexplorer.html -->
<div class="control-group">
  <h4>Rotation</h4>
  
  <!-- Angle input (traditional degrees) -->
  <div class="control-item">
    <label>Angle (degrees)</label>
    <input type="number" id="rotAngle" step="1" value="0.00" style="width: 100px">°
  </div>
  
  <!-- Spread input (RT-pure) -->
  <div class="control-item">
    <label>Spread (RT)</label>
    <input type="number" id="rotSpread" step="0.01" min="0" max="1" value="0.00" style="width: 100px">
  </div>
  
  <!-- Bidirectional sync -->
  <script>
    // Angle → Spread conversion: s = sin²(θ)
    document.getElementById('rotAngle').addEventListener('input', (e) => {
      const degrees = parseFloat(e.target.value);
      const radians = degrees * (Math.PI / 180);
      const spread = Math.pow(Math.sin(radians), 2);
      document.getElementById('rotSpread').value = spread.toFixed(4);
    });
    
    // Spread → Angle conversion: θ = arcsin(√s)
    document.getElementById('rotSpread').addEventListener('input', (e) => {
      const spread = parseFloat(e.target.value);
      const radians = Math.asin(Math.sqrt(spread));
      const degrees = radians * (180 / Math.PI);
      document.getElementById('rotAngle').value = degrees.toFixed(2);
    });
  </script>
</div>
Step 2: Create Rotation Handles (Hexagons for WXYZ, Circles for XYZ)

/\*\*

- Create rotation handles in editing basis
- Lines 2900-3000 in ARTexplorer.html (after Move/Scale handle code)
  \*/
  function createRotationHandles(editingBasis, coordinateSystem) {
  const handleGroup = new THREE.Group();

if (coordinateSystem === 'WXYZ') {
// 4 hexagonal handles perpendicular to W, X, Y, Z axes
Quadray.basisVectors.forEach((vec, i) => {
const hexagon = new THREE.Mesh(
new THREE.CylinderGeometry(1.5, 1.5, 0.1, 6), // 6 sides = hexagon
new THREE.MeshBasicMaterial({
color: basisColors[i],
transparent: true,
opacity: 0.4
})
);

      // Orient hexagon perpendicular to basis vector
      hexagon.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        vec.clone().normalize()
      );

      hexagon.userData.rotationAxis = vec.clone().normalize();
      hexagon.userData.axisName = ['W', 'X', 'Y', 'Z'][i];

      handleGroup.add(hexagon);
    });

} else { // XYZ
// 3 circular (torus) handles around X, Y, Z axes
const axes = [
{ axis: new THREE.Vector3(1, 0, 0), color: 0xff0000, name: 'X' },
{ axis: new THREE.Vector3(0, 1, 0), color: 0x00ff00, name: 'Y' },
{ axis: new THREE.Vector3(0, 0, 1), color: 0x0000ff, name: 'Z' }
];

    axes.forEach(({axis, color, name}) => {
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.05, 16, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
      );

      // Orient torus perpendicular to rotation axis
      torus.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        axis
      );

      torus.userData.rotationAxis = axis;
      torus.userData.axisName = name;

      handleGroup.add(torus);
    });

}

editingBasis.add(handleGroup);
return handleGroup;
}
Step 3: Rotation Drag Logic (Spread-based)

/\*\*

- Handle rotation drag with spread snapping
  \*/
  function onRotationDrag(event, selectedHandle, selectedObject) {
  // Calculate rotation delta from mouse movement
  const mouseDelta = event.movementX + event.movementY; // Simplified

// Convert to spread delta (snap to 0.1 intervals)
const spreadDelta = Math.round((mouseDelta _ 0.001) _ 10) / 10; // Snap to 0.1
const newSpread = Math.max(0, Math.min(1, currentSpread + spreadDelta));

// Update spread input
document.getElementById('rotSpread').value = newSpread.toFixed(2);

// Trigger angle conversion
document.getElementById('rotSpread').dispatchEvent(new Event('input'));

// Apply rotation using spread-to-matrix conversion
const rotationAxis = selectedHandle.userData.rotationAxis;
const rotationMatrix = spreadToRotationMatrix(newSpread, rotationAxis);

selectedObject.applyMatrix4(rotationMatrix);

currentSpread = newSpread;
}

/\*\*

- Spread-to-rotation matrix (from ART-Gumball.md lines 191-233)
  \*/
  function spreadToRotationMatrix(spread, axis) {
  const s = Math.max(0, Math.min(1, spread));
  const sinTheta = Math.sqrt(s);
  const cosTheta = Math.sqrt(1 - s);

const matrix = new THREE.Matrix4();

// Rotation around arbitrary axis using Rodrigues' formula
const x = axis.x, y = axis.y, z = axis.z;
const c = cosTheta, s = sinTheta;
const t = 1 - c;

matrix.set(
t*x*x + c, t*x*y - s*z, t*x*z + s*y, 0,
t*x*y + s*z, t*y*y + c, t*y*z - s*x, 0,
t*x*z - s*y, t*y*z + s*x, t*z*z + c, 0,
0, 0, 0, 1
);

return matrix;
}

Answer to Your Questions:
Is the specification detailed enough?
✅ YES - with your additions:
Two numeric inputs (degrees + spread) ← YOU added this
Selection → Rotate → Drag workflow ← YOU clarified this
Spread snapping at 0.1 intervals ← Already in spec + YOU confirmed
Does THREE.js have rotation handles we can leverage?
✅ Partially:
TransformControls exists but uses angles (not RT-pure)
Better approach: Custom handles using THREE.js primitives
TorusGeometry for XYZ circles
CylinderGeometry(radius, radius, height, 6) for WXYZ hexagons
Matrix4 for spread-based rotation application
Tonight's Implementation Scope:
I recommend implementing in this order:
✅ Add numeric input fields (15 min)
Angle field (0.00°)
Spread field (0.00)
Bidirectional conversion sync
✅ Create rotation handle geometry (30 min)
Hexagons for WXYZ (6-sided cylinders)
Circles/Tori for XYZ
Color-coded to basis vectors
✅ Implement drag rotation (45 min)
Raycasting to detect handle clicks
Convert mouse movement → spread delta
Snap to 0.1 intervals
Apply spread-to-matrix conversion
Update both input fields
✅ Polish (20 min)
Visual feedback during rotation
ESC to cancel
Works on Forms and Instances
Total: ~2 hours for working Rotate mode Would you like me to start implementing this tonight?

---

## ✅ SOLVED: Full 360° Rotation Implementation (2025-12-31)

**Date Added:** 2025-12-30
**Date Solved:** 2025-12-31
**Status:** ✅ COMPLETE - Full smooth rotation working!
**Priority:** Resolved - Spread snapping deferred until polyhedral relationships are better understood

### Problem Statement

The current rotation implementation (ARTexplorer.html lines ~3812-3813 in rt-controls.js lines ~640-645) uses transcendental functions, violating Rational Trigonometry principles:

```javascript
// ❌ NOT RT-PURE - Uses sin, asin, sqrt
const spreadValue = Math.sin(signedAngleRadians) * Math.sin(signedAngleRadians);
const snappedAngleRadians =
  Math.asin(Math.sqrt(Math.abs(snappedSpread))) * Math.sign(snappedSpread);
```

**Issues:**

1. Uses `Math.sin()` to calculate spread from angle
2. Uses `Math.asin()` and `Math.sqrt()` to calculate angle from spread
3. Violates RT principle #4: "NO Math.sin, Math.cos, Math.tan, Math.atan"
4. Unnecessary transcendental functions for what should be algebraic calculations
5. **CRITICAL BUG:** `asin()` only returns [-90°, +90°], causing rotation reversals every 90° due to quadrant ambiguity

### Bug Fix History (2025-12-31)

**Session 1: Initial Drag State Bugs**

- ✅ Fixed: `dragStartPoint` was being updated every frame, breaking rotation accumulation
- ✅ Fixed: Store initial mouse position and quaternions at drag start
- ✅ Fixed: Prevent `dragStartPoint` update in rotation mode
- ✅ Result: Rotation now calculates from original drag start, not frame-to-frame

**Session 2: Quadrant Ambiguity Bug (Option A - Interim Fix)**

- ✅ **Problem Identified:** Spread = sin²(θ) loses quadrant information
  - sin(45°) = sin(135°) → same spread (0.5)
  - `asin()` can only return [-90°, +90°], so 135° becomes 45° (wrong!)
  - Rotation reverses direction every 90° as angle wraps
- ✅ **Interim Solution Implemented:** Preserve quadrant when snapping
  ```javascript
  // Quadrant-preserving spread-to-angle conversion
  const acuteAngle = Math.asin(Math.sqrt(snappedSpread));
  if (absOriginalAngle <= π / 2) {
    snappedAngle = sign * acuteAngle; // First quadrant
  } else if (absOriginalAngle <= π) {
    snappedAngle = sign * (π - acuteAngle); // Second quadrant (supplementary)
  }
  ```
- ✅ **Status:** Working rotation up to 180°, but still not RT-pure
- 🔲 **Next:** Implement full RT-pure solution (Option B below)

### Solution: Wildberger's Rational Circle Parameterization

**New Documentation Added (2025-12-30):**

- ✅ [Kieran-Math.md](Kieran-Math.md#L60-L192) - Full mathematical explanation
- ✅ [rt-math.js](../../src/geometry/modules/rt-math.js#L69-L152) - Implementation functions

**Key Formula:** `Circle(t) = ((1 - t²) / (1 + t²), 2t / (1 + t²))`

**Where:**

- `t` = angle parameter (NOT spread) - ranges over all real numbers
- `t = tan(θ/2)` in traditional trigonometry (Weierstrass substitution)
- Returns `(x, y)` point on unit circle using **only rational operations**

**Spread Extraction (RT-Pure):**

```javascript
// Once we have (x, y) from parameterization:
const spread = 1 - x * x; // Or: spread = y*y
// No inverse trig needed!
```

### Proposed Implementation

#### Option A: Quadrant-Preserving Interim Fix (✅ IMPLEMENTED 2025-12-31)

**Status:** Working solution that fixes rotation reversals while maintaining current architecture

**Problem:** Converting spread → angle loses quadrant information because:

- Spread = sin²(θ) is always positive
- Multiple angles have the same spread: sin(45°) = sin(135°)
- `asin()` only returns [-90°, +90°], can't represent angles beyond first quadrant

**Solution:** Use original angle to determine which quadrant, then calculate snapped angle in that quadrant

```javascript
// Calculate spread from current angle (still uses sin - not RT-pure yet)
const spreadValue = Math.sin(signedAngleRadians) * Math.sin(signedAngleRadians);

// Snap spread to 0.1 intervals
const snappedSpread = Math.round(spreadValue / 0.1) * 0.1;

// Preserve quadrant when converting back to angle
const acuteAngle = Math.asin(Math.sqrt(snappedSpread)); // Returns 0° to 90°
const absOriginalAngle = Math.abs(signedAngleRadians);

if (absOriginalAngle <= Math.PI / 2) {
  // First quadrant (0° to 90°) - use acute angle directly
  snappedAngleRadians = Math.sign(signedAngleRadians) * acuteAngle;
} else if (absOriginalAngle <= Math.PI) {
  // Second quadrant (90° to 180°) - use supplementary angle
  // Since sin(θ) = sin(180° - θ), we need π - acuteAngle
  snappedAngleRadians = Math.sign(signedAngleRadians) * (Math.PI - acuteAngle);
} else {
  // Beyond 180° - normalize to [-180°, 180°]
  snappedAngleRadians =
    ((signedAngleRadians + Math.PI) % (2 * Math.PI)) - Math.PI;
}
```

**Benefits:**

- ✅ Fixes rotation reversal bug
- ✅ Smooth continuous rotation up to 180°
- ✅ Minimal code change (drop-in fix)
- ✅ Preserves existing spread snapping behavior

**Limitations:**

- ❌ Still uses `Math.sin()` and `Math.asin()` (not RT-pure)
- ❌ Still transcendental functions in core rotation
- ❌ This is a **workaround**, not the ideal solution

**Implementation Location:**

- [ARTexplorer.html:3814-3841](../../src/geometry/ARTexplorer.html#L3814-L3841)

**Next Step:** Implement Option B (RT-pure) to eliminate transcendental functions entirely

---

#### Option B: Screen-Space Hybrid (RT-Pure - PLANNED)

**Keep atan2() at UI boundary** (unavoidable for screen-space rotation), but **replace spread/angle conversions** with rational parameterization:

```javascript
// Step 1: Get screen-space angle (unavoidable atan2)
const screenAngle = Math.atan2(screenDeltaY, screenDeltaX); // UI boundary

// Step 2: Convert angle to parameter 't' using rational formula
// Instead of: const spread = Math.sin(angle) * Math.sin(angle)
const t = Math.tan(screenAngle / 2); // Still uses tan, but only once

// Step 3: Get circle point using RT-pure parameterization
const point = RT.circleParam(t); // {x, y} - purely rational operations
const spread = 1 - point.x * point.x; // RT-pure spread extraction

// Step 4: Snap spread
const snappedSpread = Math.round(spread / 0.1) * 0.1;

// Step 5: Convert back to parameter 't' (RT-pure)
const snappedT = RT.spreadToParam(snappedSpread); // Uses sqrt, but algebraic

// Step 6: Get snapped angle from parameter
// Instead of: const angle = Math.asin(Math.sqrt(spread))
const snappedPoint = RT.circleParam(snappedT);
const snappedAngle = Math.atan2(snappedPoint.y, snappedPoint.x); // Only at end
```

**Benefits:**

- ✅ Removes `Math.sin()` from spread calculation
- ✅ Removes `Math.asin(Math.sqrt(...))` from angle recovery
- ✅ Works directly with spread values algebraically
- ✅ Only uses transcendental functions at UI boundaries (atan2)

**Limitation:**

- Still needs `atan2()` for screen-space interaction and final angle display
- This is acceptable - atan2 is at UI boundary, not core geometry

#### Option C: Full RT-Pure Rotation (Future - Beyond atan2)

**Eliminate screen-space angle entirely** by working in parameter space:

```javascript
// Track rotation in parameter 't' space instead of angle space
let currentT = 0; // Start at (1, 0) on circle

// During drag: increment 't' based on tangential movement
const deltaT = calculateDeltaT(movementVector, rotationRadius);
currentT += deltaT;

// Get current rotation state
const point = RT.circleParam(currentT); // {x, y} on unit circle
const spread = 1 - point.x * point.x; // Current spread

// Snap in 't' space for even spread intervals
const targetSpread = Math.round(spread / 0.1) * 0.1;
const snappedT = RT.spreadToParam(targetSpread);

// Apply rotation using parameter 't'
// Build rotation matrix directly from (x, y) = (cos θ, sin θ) coordinates
const rotationMatrix = buildRotationFromCirclePoint(point, axis);
```

**Benefits:**

- ✅ Zero transcendental functions in rotation calculations
- ✅ Works entirely in rational parameter space
- ✅ True RT-purity
- ✅ Potentially simpler code (no angle conversions)

**Challenges:**

- ⚠️ Requires rethinking UI interaction (no longer screen-angle-based)
- ⚠️ Need to calculate `deltaT` from mouse movement
- ⚠️ More complex quaternion/matrix construction

### Implementation Tasks

**Session 1: Bug Fixes (✅ COMPLETED 2025-12-31)**

1. ✅ Fix `dragStartPoint` update bug - store initial mouse position
2. ✅ Store initial quaternions for rotation accumulation
3. ✅ Prevent `dragStartPoint` update in rotation mode
4. ✅ Implement quadrant-preserving spread-to-angle conversion (Option A)
5. ✅ Test rotation continuity up to 180°
6. ✅ Update documentation with interim fix

**Session 2: RT-Pure Hybrid Approach (ATTEMPTED - REVERTED)**

1. ❌ Attempted: Update rotation code to use `RT.circleParam()` and `RT.spreadToParam()`
2. ❌ Result: Objects disappeared, rotation reversals returned
3. ❌ Issue: `RT.spreadToParam()` had mathematical edge cases (spread=0, negative discriminants)
4. ✅ Reverted: Back to working code (commit a9dbcea → 6360356)
5. 📝 Learning: RT-pure approach needs deeper mathematical analysis

**Session 3: Simplified Full Circle Rotation (✅ COMPLETED - SUCCESS!)**

1. ✅ Key insight: **Remove complexity, not add it**
2. ✅ Use `deltaAngle` directly (already calculated correctly from drag start)
3. ✅ Comment out spread snapping temporarily
4. ✅ Calculate spread for display only (not for rotation constraints)
5. ✅ Test: Full 360° rotation smooth and working perfectly!
6. ✅ Commit: b5d8c07 "Success: Full 360° rotation working smoothly!"

**Result:**

- ✅ Full 360° smooth rotation on all 7 axes (XYZ + WXYZ)
- ✅ No reversals, no jumps, objects stay visible
- ✅ Cleaner code: 50+ lines → 20 lines
- 📊 Spread values still calculated and displayed (for future use)

### References

**Documentation:**

- [Kieran-Math.md - Rational Circle Parameterization](Kieran-Math.md#L60-L192)
- [rt-math.js - RT.circleParam() and RT.spreadToParam()](../../src/geometry/modules/rt-math.js#L69-L152)
- [HTML-Refactor-Plan.md](HTML-Refactor-Plan.md) - File size reduction plan

**Current Implementation:**

- [rt-controls.js:640-645](../../src/geometry/modules/rt-controls.js#L640-L645) - Rotation code using transcendental functions

**RT Principles:**

- Principle #4: NO Math.PI, Math.sin, Math.cos, Math.tan, Math.atan
- Principle #5: Resolve rotations with Spread first vs. Angles

### Success Criteria (✅ ACHIEVED)

- ✅ Full 360° rotation working smoothly
- ✅ No rotation reversals or jumps
- ✅ Objects remain visible during rotation
- ✅ Works on all 7 axes (XYZ + WXYZ)
- ✅ Code is cleaner and simpler (removed 34 lines)
- ✅ Spread values calculated for future use
- 📊 RT-pure implementation: Deferred (not required for smooth rotation)

### Notes

**Why This Matters:**

- Current code works but violates RT philosophy
- Wildberger's parameterization provides algebraic alternative
- Demonstrates commitment to RT-pure methodology
- Educational value - shows how to avoid transcendental functions

**Acceptable Trade-offs:**

- `atan2()` at UI boundary is OK (screen-space interaction)
- `Math.tan()` for initial parameter conversion is acceptable
- Final angle display for user feedback uses atan2 (cosmetic only)

**Core Principle:**

> "Simplicity over complexity. The deltaAngle was already correct - we just needed to stop interfering with it."

---

### Future Work: Spread-Based Rotation Constraints

**Status:** Deferred until polyhedral relationships are better understood

**Current State:**

- Spread values are calculated and displayed in real-time
- No snapping applied - full continuous rotation freedom
- Spread formula: `spread = sin²(θ) = 1 - cos²(θ)`

**Why Deferred:**
We don't yet know which polyhedral relationships will benefit from spread constraints. Premature optimization led to bugs. Better to:

1. ✅ First: Get smooth rotation working (done!)
2. 🔮 Second: Discover meaningful polyhedral rotation relationships through use
3. 🔮 Third: Add constraints that support those relationships

**Potential Future Spread Snapping Approaches:**

**Option 1: Angle-based snapping that preserves spread intervals**

```javascript
// Snap to angles that give clean spread values (0.1 intervals)
// e.g., 0°, 18.43°, 30°, 45°, 60°, 71.57°, 90° for spreads 0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0
const spreadSnapAngles = [0, 0.3218, 0.5236, 0.7854, 1.0472, 1.249, 1.5708]; // radians
const snappedAngle = findNearestAngle(deltaAngle, spreadSnapAngles);
```

**Option 2: Toggle mode - snap on/off**

```javascript
// Hold Shift for spread snapping, free rotate otherwise
if (event.shiftKey) {
  // Apply spread snapping
} else {
  // Free rotation (current behavior)
}
```

**Option 3: RT-pure parameter-space snapping**

```javascript
// Work in parameter 't' space, snap there instead of angle space
// Requires solving RT.spreadToParam() edge cases first
const t = Math.tan(deltaAngle / 2);
const point = RT.circleParam(t);
const spread = 1 - point.x * point.x;
// ... snap spread, convert back without losing quadrant info
```

**Decision Point:**
Wait until we understand what polyhedral rotations are meaningful (e.g., face-to-face alignment, edge-to-edge, vertex-to-vertex). Then add constraints that help achieve those relationships, not arbitrary spread intervals.

---

**Last Updated:** 2025-12-31
**Status:** ✅ SOLVED - Full 360° rotation working smoothly
**Commits:**

- 2f7301e: Fix rotation reversals with quadrant-preserving logic
- a9dbcea: Attempt RT-pure rotation (broken, reverted)
- 6360356: Revert back to working rotation
- b5d8c07: **Success - Full 360° rotation working!** (current)

---

## Adaptive Handle Scaling for Object Bounds

**Status:** Planning
**Created:** 2026-01-26
**Issue:** Gumball handles do not scale relative to selected object size

### Problem Statement

When selecting polyhedra of varying sizes, the gumball edit handles (Move, Scale, Rotate) remain at a fixed size based on `tetEdge` from the slider. This causes:

1. **Small objects (icosahedron, single tetrahedron):** Handles extend well beyond the object - acceptable
2. **Medium objects (planar cubic matrix):** Handles become buried within the object geometry
3. **Large objects (octahedral VM matrix, geodesic subdivisions):** Handles are completely invisible inside the object, though still functional via raycasting

The screenshots demonstrate this progression:

- Image 1: Icosahedron - handles visible, hit zones (debug spheres) accessible
- Image 2: Planar cubic matrix - handles partially obscured by geometry
- Image 3: Octahedral VM matrix - handles entirely buried within the structure

### Current Implementation

**Location:** [rt-init.js:2105-2135](../modules/rt-init.js#L2105-L2135)

```javascript
function createEditingBasis(position, _selectedObject) {
  // Current: Uses tetEdge slider for ALL objects
  const tetEdge = parseFloat(document.getElementById("tetScaleSlider").value);
  const arrowLength = tetEdge;

  // ALTERNATIVE (commented out):
  // const boundingBox = new THREE.Box3().setFromObject(selectedObject);
  // const size = new THREE.Vector3();
  // boundingBox.getSize(size);
  // const outSphereRadius = Math.max(size.x, size.y, size.z) * Math.sqrt(3) / 2;
  // const arrowLength = outSphereRadius;
}
```

The `_selectedObject` parameter is already passed but unused (underscore prefix indicates intentionally ignored).

### Proposed Solution: Bounding Sphere Scaling

**Approach:** Calculate the object's bounding sphere radius and scale handles to extend just beyond it.

#### Algorithm

```javascript
function calculateHandleLength(selectedObject) {
  // 1. Compute bounding box of selected object(s)
  const boundingBox = new THREE.Box3().setFromObject(selectedObject);

  // 2. Get bounding box dimensions
  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  // 3. Calculate circumsphere radius (bounding sphere)
  // For a box, the circumsphere radius is half the diagonal
  const circumRadius = size.length() / 2;

  // 4. Add padding factor (handles extend beyond object)
  const paddingFactor = 1.15; // 15% beyond bounding sphere
  const handleLength = circumRadius * paddingFactor;

  // 5. Apply minimum size (for very small objects)
  const minHandleLength = 1.0; // Minimum handle visibility

  return Math.max(handleLength, minHandleLength);
}
```

#### Integration Points

**Move Handles:**

```javascript
const arrowLength = calculateHandleLength(selectedObject);
const arrow = new THREE.ArrowHelper(
  vec,
  origin,
  arrowLength,
  color,
  headLength,
  0.2
);
const tipPosition = vec.clone().multiplyScalar(arrowLength);
// Sphere handle at tipPosition
```

**Scale Handles:**

```javascript
const arrowLength = calculateHandleLength(selectedObject);
const tipPosition = vec.clone().multiplyScalar(arrowLength);
// Cube handle at tipPosition
// Uniform scale sphere at origin (no change needed)
```

**Rotate Handles:**

```javascript
const arrowLength = calculateHandleLength(selectedObject);
const circleRadius = arrowLength * 0.9; // Rotation ring slightly inside handle tips
// Torus/arc handle with circleRadius
```

### Design Considerations

#### 1. Performance

**Concern:** `Box3.setFromObject()` traverses all vertices - expensive for large geodesics.

**Mitigations:**

- Cache bounding box on object creation (`selectedObject.userData.boundingBox`)
- Invalidate cache only when object transforms change
- For multi-selection, compute union of cached boxes

```javascript
// Cache on object creation
polyhedron.userData.boundingBox = new THREE.Box3().setFromObject(polyhedron);
polyhedron.userData.boundingSphereRadius =
  polyhedron.userData.boundingBox.getBoundingSphere(new THREE.Sphere()).radius;

// Use cached value in handle creation
const radius =
  selectedObject.userData.boundingSphereRadius ||
  computeBoundingSphereRadius(selectedObject);
```

#### 2. Multi-Selection Behavior

When multiple polyhedra are selected:

- Compute union bounding box of all selected objects
- Handles sized to encompass entire selection
- Center position already handled by `getSelectionCenter()`

```javascript
function getSelectionBounds(selectedPolyhedra) {
  const unionBox = new THREE.Box3();
  selectedPolyhedra.forEach(poly => {
    const polyBox =
      poly.userData.boundingBox || new THREE.Box3().setFromObject(poly);
    unionBox.union(polyBox);
  });
  return unionBox;
}
```

#### 3. Hit Zone Scaling

Hit zones (invisible raycaster targets) should scale proportionally:

```javascript
// Current: Fixed 0.5 radius spheres
new THREE.SphereGeometry(0.5, 16, 16);

// Proposed: Scale relative to handle length
const hitZoneRadius = Math.max(0.3, arrowLength * 0.15);
new THREE.SphereGeometry(hitZoneRadius, 16, 16);
```

#### 4. Visual Balance

**Issue:** Very large objects could produce awkwardly long handles.

**Solution:** Apply maximum cap while maintaining usability:

```javascript
const handleLength = Math.min(
  Math.max(circumRadius * paddingFactor, minHandleLength),
  maxHandleLength // e.g., 20 units
);
```

### Implementation Checklist

1. [ ] Add `calculateHandleLength(selectedObject)` function to rt-init.js
2. [ ] Add bounding box caching to polyhedra creation functions
3. [ ] Modify `createEditingBasis()` to use calculated length instead of tetEdge
4. [ ] Update hit zone geometry to scale proportionally
5. [ ] Handle multi-selection case with union bounding box
6. [ ] Add minimum/maximum length constraints
7. [ ] Test with various object sizes:
   - [ ] Single tetrahedron (small)
   - [ ] Icosahedron (medium)
   - [ ] Planar matrix (large, flat)
   - [ ] Octahedral VM matrix (large, 3D)
   - [ ] 4V geodesic sphere (very large)
8. [ ] Verify handle visibility on all three modes (Move, Scale, Rotate)
9. [ ] Check performance with high-vertex geodesics

### Alternative Approaches Considered

#### A. Slider-Based Scaling (Current Approach)

- **Pros:** User control, simple implementation
- **Cons:** Requires manual adjustment per object, breaks workflow

#### B. Fixed Scale Categories

- Small objects: arrowLength = 1.5
- Medium objects: arrowLength = 3.0
- Large objects: arrowLength = 6.0
- **Pros:** Predictable
- **Cons:** Doesn't handle continuous size variation

#### C. Logarithmic Scaling

```javascript
const arrowLength = 1.5 + Math.log10(circumRadius + 1) * 2;
```

- **Pros:** Handles extreme size ranges gracefully
- **Cons:** Less intuitive relationship between object and handle size

**Chosen:** Direct bounding sphere approach (most intuitive and accurate)

### RT Considerations

This feature is primarily a UX improvement and does not affect RT principles:

- Handle positions use the same basis vectors (WXYZ/XYZ)
- Quadrance relationships preserved (handles at Q = arrowLength^2)
- No transcendental functions required for size calculation

### References

- **Current TODO:** [rt-init.js:2103](../modules/rt-init.js#L2103) - "Use selectedObject bounding box to scale handles for large matrices"
- **THREE.js Docs:** [Box3.setFromObject()](https://threejs.org/docs/#api/en/math/Box3.setFromObject)
- **Related:** Handle creation in [rt-controls.js:217-509](../modules/rt-controls.js#L217-L509)
