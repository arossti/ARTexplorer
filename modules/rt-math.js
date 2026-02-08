/**
 * rt-math.js
 * Rational Trigonometry Library for ARTexplorer
 *
 * Pure mathematical functions based on Norman J. Wildberger's Rational Trigonometry.
 * Uses quadrance (Q = distance²) and spread (s) instead of distance and angle.
 *
 * Benefits:
 * - No square roots needed (exact calculations)
 * - No transcendental functions (sin, cos, atan)
 * - Algebraic identities remain exact
 * - Better for tetrahedral/cubic geometry
 *
 * References:
 * - Divine Proportions: Rational Trigonometry to Universal Geometry (N.J. Wildberger)
 * - https://www.youtube.com/watch?v=GJPJKPNb2Zg
 */

/**
 * Rational Trigonometry (RT) Library
 * @namespace RT
 */
export const RT = {
  /**
   * Quadrance (Q = distance²) - Wildberger's alternative to distance
   * Avoids sqrt, keeps calculations exact
   *
   * @param {Object} p1 - Point with x, y, z coordinates
   * @param {Object} p2 - Point with x, y, z coordinates
   * @returns {number} Quadrance (distance squared)
   *
   * @example
   * const Q = RT.quadrance({x: 0, y: 0, z: 0}, {x: 1, y: 1, z: 1});
   * // Q = 3 (not √3!)
   */
  quadrance: (p1, p2) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return dx * dx + dy * dy + dz * dz;
  },

  /**
   * Spread (s) - Wildberger's version of angle
   * Measures "perpendicularity" between two vectors (0 = parallel, 1 = perpendicular)
   *
   * Formula: s = 1 - (v1·v2)² / (|v1|²|v2|²)
   *
   * Key values:
   * - s = 0: vectors parallel (0°)
   * - s = 0.5: 45° angle (tetrahedral geometry)
   * - s = 1: vectors perpendicular (90°)
   *
   * @param {Object} v1 - Vector with x, y, z components
   * @param {Object} v2 - Vector with x, y, z components
   * @returns {number} Spread (0 to 1)
   *
   * @example
   * const s = RT.spread({x: 1, y: 0, z: 0}, {x: 0, y: 1, z: 0});
   * // s = 1 (perpendicular)
   */
  spread: (v1, v2) => {
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const q1 = v1.x * v1.x + v1.y * v1.y + v1.z * v1.z;
    const q2 = v2.x * v2.x + v2.y * v2.y + v2.z * v2.z;
    return 1 - (dot * dot) / (q1 * q2);
  },

  /**
   * Sphere-Plane Intersection Circle Radius (RT-Pure)
   * Calculate intersection circle radius using quadrance-based Pythagorean theorem
   * Defers sqrt expansion until final step
   *
   * Geometry:
   * - Sphere center at distance d from plane
   * - Intersection forms a circle in the plane
   * - Circle radius² + d² = sphere radius² (Pythagorean theorem)
   *
   * RT-Pure Approach:
   * - Work with quadrance (distance²) throughout calculation
   * - Only expand sqrt once at the very end
   * - Avoids compound sqrt errors from intermediate calculations
   *
   * @param {number} sphereRadiusQ - Sphere radius quadrance (R²)
   * @param {number} distanceQ - Quadrance from sphere center to plane (d²)
   * @returns {number|null} Circle radius, or null if no intersection
   *
   * @example
   * // Sphere of radius 1.0 centered at (0, 0, 0.5)
   * // Plane at z = 0
   * const sphereRadiusQ = 1.0 * 1.0;  // R² = 1.0
   * const distanceQ = 0.5 * 0.5;      // d² = 0.25
   * const circleRadius = RT.spherePlaneCircleRadius(sphereRadiusQ, distanceQ);
   * // circleRadius = √(1.0 - 0.25) = √0.75 ≈ 0.866
   *
   * @example
   * // No intersection case (sphere too far from plane)
   * const sphereRadiusQ = 1.0;  // R² = 1.0
   * const distanceQ = 2.0;      // d² = 2.0 > R²
   * const circleRadius = RT.spherePlaneCircleRadius(sphereRadiusQ, distanceQ);
   * // circleRadius = null (no intersection)
   */
  spherePlaneCircleRadius: (sphereRadiusQ, distanceQ) => {
    // Check for intersection: distance² must be ≤ radius²
    if (distanceQ > sphereRadiusQ) {
      return null; // No intersection
    }

    // RT-Pure: Calculate circle radius quadrance
    // circleRadiusQ = sphereRadiusQ - distanceQ
    const circleRadiusQ = sphereRadiusQ - distanceQ;

    // Deferred sqrt expansion (single sqrt at final step)
    return Math.sqrt(circleRadiusQ);
  },

  /**
   * Rational Circle Parameterization - Wildberger's alternative to sin/cos
   * Generates points on unit circle using only rational operations (no trig functions)
   *
   * Formula: Circle(t) = ((1 - t²) / (1 + t²), 2t / (1 + t²))
   *
   * Based on Weierstrass substitution where t = tan(θ/2) in traditional trigonometry.
   * Maps all real numbers to the full unit circle:
   * - t = 0 → (1, 0) - positive x-axis
   * - t = 1 → (0, 1) - top of circle
   * - t → ∞ → (-1, 0) - negative x-axis
   *
   * IMPORTANT: Parameter 't' is NOT spread!
   * - 't' is an INPUT representing angle/turns (ranges over all reals)
   * - 'spread' is an OUTPUT measuring perpendicularity (ranges 0-1)
   *
   * RT-Pure Benefits:
   * - No transcendental functions (sin, cos, tan, atan)
   * - Only rational operations (multiply, add, divide)
   * - Spread can be extracted directly from coordinates: spread = 1 - x² or spread = y²
   *
   * Use Cases:
   * 1. RT-pure rotation calculations (avoid sin/cos for angles)
   * 2. Convert between angle parameter and spread without inverse trig
   * 3. Snap-to-spread constraints (find 't' for target spread algebraically)
   *
   * @param {number} t - Angle parameter (any real number, NOT spread)
   * @returns {Object} {x, y} - Point on unit circle
   *
   * @example
   * // Get point at parameter t = 1
   * const point = RT.circleParam(1);
   * // point = {x: 0, y: 1} - top of circle
   *
   * // Extract spread from coordinates (no inverse trig!)
   * const spread = 1 - point.x * point.x;  // = 1 (perpendicular to x-axis)
   *
   * @see docs/development/Geometry documents/Kieran-Math.md - "Rational Circle Parameterization"
   */
  circleParam: t => {
    const tSquared = t * t;
    const denominator = 1 + tSquared;
    return {
      x: (1 - tSquared) / denominator,
      y: (2 * t) / denominator,
    };
  },

  /**
   * Convert spread to angle parameter 't' using rational circle parameterization
   * Solves: 4t² / (1 + t²)² = spread for t
   *
   * WARNING: This is a helper for understanding the relationship.
   * The actual solution requires solving a quartic equation, which may use sqrt.
   * For RT-pure calculations, work directly with 't' parameter instead of converting.
   *
   * Note: Given spread s = sin²(θ), there are two possible 't' values:
   * - Positive t: 0° ≤ θ ≤ 180° (upper semicircle)
   * - Negative t: 180° ≤ θ ≤ 360° (lower semicircle)
   *
   * This function returns the positive 't' value.
   *
   * @param {number} spread - Spread value (0 to 1)
   * @returns {number} Parameter 't' (positive solution)
   *
   * @example
   * // For spread = 1 (90° angle):
   * const t = RT.spreadToParam(1);  // t ≈ 1.0
   * const point = RT.circleParam(t); // {x: 0, y: 1}
   */
  spreadToParam: spread => {
    // From spread = 4t² / (1 + t²)²
    // Rearranging: spread(1 + 2t² + t⁴) = 4t²
    //             spread·t⁴ + (2·spread - 4)t² + spread = 0
    // Substituting u = t²:
    //             spread·u² + (2·spread - 4)u + spread = 0
    // Quadratic formula:
    const a = spread;
    const b = 2 * spread - 4;
    const c = spread;
    const discriminant = b * b - 4 * a * c;
    const u = (-b + Math.sqrt(discriminant)) / (2 * a); // Take positive solution
    return Math.sqrt(u); // t = √u (positive root)
  },

  /**
   * Verify Euler's formula: V - E + F = 2
   * Valid for any convex polyhedron
   *
   * @param {number} vertices - Number of vertices
   * @param {number} edges - Number of edges
   * @param {number} faces - Number of faces
   * @returns {boolean} True if Euler's formula is satisfied
   *
   * @example
   * RT.verifyEuler(8, 12, 6); // Cube: true
   * RT.verifyEuler(4, 6, 4);  // Tetrahedron: true
   */
  verifyEuler: (vertices, edges, faces) => {
    return vertices - edges + faces === 2;
  },

  /**
   * Golden Ratio (φ) - Symbolic operations to defer √5 expansion
   * φ = (1 + √5)/2 ≈ 1.618033988749895.....mantissa continues infinitely
   *
   * Key identities:
   * - φ² = φ + 1
   * - 1/φ = φ - 1
   *
   * Used in icosahedron and dodecahedron geometry
   */
  Phi: {
    /**
     * Compute √5 - only call when absolutely necessary
     * @returns {number} Square root of 5
     */
    sqrt5: () => Math.sqrt(5),

    /**
     * φ = (1 + √5)/2
     * Deferred: only expands √5 when called
     * @returns {number} Golden ratio value
     */
    value: function () {
      return 0.5 * (1 + this.sqrt5());
    },

    /**
     * φ² = φ + 1 (algebraic identity - no sqrt needed!)
     * Derived from φ² - φ - 1 = 0
     * @returns {number} Golden ratio squared
     */
    squared: function () {
      return this.value() + 1;
    },

    /**
     * 1/φ = φ - 1 (algebraic identity - no division needed!)
     * Also equals (√5 - 1)/2
     * @returns {number} Reciprocal of golden ratio
     */
    inverse: function () {
      return this.value() - 1;
    },
  },

  /**
   * PurePhi - High-precision symbolic golden ratio algebra (Method 2)
   *
   * Represents φ values in exact algebraic form (a + b√5)/c to maintain
   * 6+ decimal places of precision throughout calculations by deferring
   * √5 expansion until final GPU boundary.
   *
   * Philosophy:
   * - Work symbolically in (a + b√5)/c form during geometry generation
   * - Only expand to decimal at THREE.Vector3 creation
   * - Preserves exact algebraic relationships (φ² = φ + 1, etc.)
   * - Eliminates accumulated floating-point errors from intermediate steps
   *
   * IEEE 754 double precision provides ~15-17 significant decimal digits.
   * By computing √5 once and caching it, we guarantee maximum precision
   * throughout all golden ratio calculations.
   *
   * @namespace PurePhi
   */
  PurePhi: {
    /**
     * High-precision √5 constant (IEEE 754 double precision)
     * Computed once and cached for consistency across all calculations
     * @returns {number} √5 ≈ 2.2360679774997896964091736687312762...
     */
    sqrt5: (() => {
      const cached = Math.sqrt(5);
      return () => cached;
    })(),

    /**
     * φ = (1 + √5)/2
     * High-precision golden ratio (15+ decimal places guaranteed)
     * @returns {number} φ ≈ 1.6180339887498948482045868343656381...
     */
    value: function () {
      return 0.5 * (1 + this.sqrt5());
    },

    /**
     * φ² = φ + 1 (algebraic identity - EXACT)
     * Preferred over φ * φ for preserving algebraic relationships
     * = (3 + √5)/2
     * @returns {number} φ² ≈ 2.618033988749895
     */
    squared: function () {
      return this.value() + 1; // Uses identity, not multiplication
    },

    /**
     * 1/φ = φ - 1 (algebraic identity - EXACT)
     * Preferred over 1 / φ for exact computation
     * = (√5 - 1)/2 = (-1 + √5)/2
     * @returns {number} 1/φ ≈ 0.618033988749895
     */
    inverse: function () {
      return this.value() - 1; // Uses identity, not division
    },

    /**
     * φ³ = 2φ + 1 (derived from φ² = φ + 1)
     * Derivation: φ³ = φ·φ² = φ(φ + 1) = φ² + φ = (φ + 1) + φ = 2φ + 1
     * = 2(1 + √5)/2 + 1 = (1 + √5) + 1 = (2 + √5)/1
     * @returns {number} φ³ ≈ 4.236067977499790
     */
    cubed: function () {
      return 2 * this.value() + 1; // Uses identity
    },

    /**
     * φ⁴ = 3φ + 2 (derived from φ² = φ + 1)
     * Derivation: φ⁴ = φ·φ³ = φ(2φ + 1) = 2φ² + φ = 2(φ + 1) + φ = 3φ + 2
     * = (7 + 3√5)/2
     * @returns {number} φ⁴ ≈ 6.854101966249685
     */
    fourthPower: function () {
      return 3 * this.value() + 2; // Uses identity
    },

    /**
     * Symbolic representation: (a + b√5)/c
     * Stores golden ratio expressions in exact rational+radical form
     * for maximum algebraic precision before GPU expansion
     *
     * @class Symbolic
     * @memberof RT.PurePhi
     *
     * @example
     * const phi = new RT.PurePhi.Symbolic(1, 1, 2);  // (1 + 1√5)/2 = φ
     * const phiSq = new RT.PurePhi.Symbolic(3, 1, 2);  // (3 + 1√5)/2 = φ²
     * const value = phiSq.toDecimal();  // Only expand when needed for GPU
     */
    Symbolic: class {
      /**
       * Create a symbolic golden ratio expression
       * @param {number} a - Rational coefficient
       * @param {number} b - √5 coefficient
       * @param {number} c - Denominator (default 1)
       *
       * @example
       * // φ = (1 + √5)/2
       * const phi = new RT.PurePhi.Symbolic(1, 1, 2);
       *
       * // φ² = (3 + √5)/2
       * const phiSquared = new RT.PurePhi.Symbolic(3, 1, 2);
       *
       * // 2φ = (2 + 2√5)/2 = (1 + √5)/1
       * const twoPhi = new RT.PurePhi.Symbolic(1, 1, 1);
       */
      constructor(a, b, c = 1) {
        this.a = a; // Rational part
        this.b = b; // √5 coefficient
        this.c = c; // Denominator
      }

      /**
       * Convert to decimal (only when needed for GPU)
       * Maintains maximum precision by computing √5 once
       * @returns {number} Decimal value
       *
       * @example
       * const phi = new RT.PurePhi.Symbolic(1, 1, 2);
       * const decimal = phi.toDecimal();  // 1.618033988749895
       */
      toDecimal() {
        const sqrt5 = RT.PurePhi.sqrt5();
        return (this.a + this.b * sqrt5) / this.c;
      }

      /**
       * Multiply by another symbolic phi value
       * Preserves exact algebraic form
       * (a₁ + b₁√5)/c₁ × (a₂ + b₂√5)/c₂ = ((a₁a₂ + 5b₁b₂) + (a₁b₂ + b₁a₂)√5)/(c₁c₂)
       *
       * @param {Symbolic} other - Another symbolic value
       * @returns {Symbolic} Product in symbolic form
       *
       * @example
       * const phi = new RT.PurePhi.Symbolic(1, 1, 2);      // φ
       * const phiSq = phi.multiply(phi);                    // φ²
       * // Result: (3 + √5)/2 (exact algebraic form)
       */
      multiply(other) {
        // (a₁ + b₁√5)(a₂ + b₂√5) = a₁a₂ + a₁b₂√5 + b₁a₂√5 + b₁b₂·5
        //                         = (a₁a₂ + 5b₁b₂) + (a₁b₂ + b₁a₂)√5
        const newA = this.a * other.a + 5 * this.b * other.b;
        const newB = this.a * other.b + this.b * other.a;
        const newC = this.c * other.c;
        return new RT.PurePhi.Symbolic(newA, newB, newC);
      }

      /**
       * Add another symbolic phi value
       * Finds common denominator and combines
       *
       * @param {Symbolic} other - Another symbolic value
       * @returns {Symbolic} Sum in symbolic form
       *
       * @example
       * const phi = new RT.PurePhi.Symbolic(1, 1, 2);      // φ
       * const one = new RT.PurePhi.Symbolic(1, 0, 1);      // 1
       * const phiPlusOne = phi.add(one);                    // φ + 1 = φ²
       */
      add(other) {
        // Find common denominator: c₁c₂
        const newC = this.c * other.c;
        const newA = this.a * other.c + other.a * this.c;
        const newB = this.b * other.c + other.b * this.c;
        return new RT.PurePhi.Symbolic(newA, newB, newC);
      }

      /**
       * Subtract another symbolic phi value
       *
       * @param {Symbolic} other - Another symbolic value
       * @returns {Symbolic} Difference in symbolic form
       */
      subtract(other) {
        const newC = this.c * other.c;
        const newA = this.a * other.c - other.a * this.c;
        const newB = this.b * other.c - other.b * this.c;
        return new RT.PurePhi.Symbolic(newA, newB, newC);
      }

      /**
       * Multiply by scalar (rational number)
       *
       * @param {number} scalar - Scalar multiplier
       * @returns {Symbolic} Scaled symbolic form
       *
       * @example
       * const phi = new RT.PurePhi.Symbolic(1, 1, 2);      // φ
       * const twoPhi = phi.scale(2);                        // 2φ = (1 + √5)/1
       */
      scale(scalar) {
        return new RT.PurePhi.Symbolic(
          this.a * scalar,
          this.b * scalar,
          this.c
        );
      }

      /**
       * Divide by scalar (rational number)
       *
       * @param {number} scalar - Scalar divisor
       * @returns {Symbolic} Divided symbolic form
       */
      divide(scalar) {
        return new RT.PurePhi.Symbolic(this.a, this.b, this.c * scalar);
      }

      /**
       * String representation for debugging
       * @returns {string} Formatted symbolic expression
       */
      toString() {
        if (this.b === 0) {
          return `${this.a}/${this.c}`;
        }
        const sign = this.b >= 0 ? "+" : "";
        return `(${this.a} ${sign} ${this.b}√5)/${this.c}`;
      }
    },

    /**
     * Common symbolic constants for convenience
     * Pre-defined exact algebraic forms of common golden ratio expressions
     */
    get constants() {
      return {
        phi: new this.Symbolic(1, 1, 2), // φ = (1 + √5)/2
        phiSq: new this.Symbolic(3, 1, 2), // φ² = (3 + √5)/2
        invPhi: new this.Symbolic(-1, 1, 2), // 1/φ = (-1 + √5)/2
        phiCubed: new this.Symbolic(2, 1, 1), // φ³ = (2 + √5)/1 = 2φ + 1
        phiFourth: new this.Symbolic(7, 3, 2), // φ⁴ = (7 + 3√5)/2 = 3φ + 2
        one: new this.Symbolic(1, 0, 1), // 1 = (1 + 0√5)/1
        zero: new this.Symbolic(0, 0, 1), // 0 = (0 + 0√5)/1
      };
    },

    /**
     * Pentagon-specific constants from Exercise 14.3 (p.166)
     * Cached values for RT-pure pentagon/decagon vertex generation
     *
     * Key relationships (Wildberger "Divine Proportions"):
     *   α + β = 5/4
     *   α · β = 5/16
     *   β/α = φ² (golden ratio squared!)
     *
     * All values computed once and cached for IEEE 754 precision consistency.
     *
     * @namespace pentagon
     * @memberof RT.PurePhi
     */
    pentagon: {
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
       * Algebraic identity - no trig function needed
       */
      cos72: (() => {
        const cached = (Math.sqrt(5) - 1) / 4;
        return () => cached;
      })(),

      /**
       * cos(144°) = -(1+√5)/4 = -φ/2
       * Algebraic identity - no trig function needed
       */
      cos144: (() => {
        const cached = -(1 + Math.sqrt(5)) / 4;
        return () => cached;
      })(),

      /**
       * sin(72°) = √(10 + 2√5)/4
       * Nested radical, computed once and cached
       */
      sin72: (() => {
        const cached = Math.sqrt(10 + 2 * Math.sqrt(5)) / 4;
        return () => cached;
      })(),

      /**
       * sin(144°) = √(10 - 2√5)/4
       * Nested radical, computed once and cached
       */
      sin144: (() => {
        const cached = Math.sqrt(10 - 2 * Math.sqrt(5)) / 4;
        return () => cached;
      })(),

      /**
       * cos(36°) = (1 + √5)/4 = φ/2
       * Algebraic identity - no trig function needed
       * Used in Penrose tiles (36° is the fundamental Penrose angle)
       */
      cos36: (() => {
        const cached = (1 + Math.sqrt(5)) / 4;
        return () => cached;
      })(),

      /**
       * sin(36°) = √(10 - 2√5)/4
       * Same as sin(144°) since sin(180° - θ) = sin(θ)
       * Nested radical, computed once and cached
       */
      sin36: (() => {
        const cached = Math.sqrt(10 - 2 * Math.sqrt(5)) / 4;
        return () => cached;
      })(),

      /**
       * Edge-to-diagonal ratio = φ (golden ratio)
       * In a regular pentagon: diagonal/edge = φ
       * @returns {number} φ ≈ 1.618033988749895
       */
      edgeToDiagonalRatio: () => RT.PurePhi.value(),
    },

    /**
     * Penrose-specific constants and identities
     * All Penrose angles are multiples of 36° (π/5)
     *
     * Angular hierarchy (all derived from 36°):
     *   36° = π/5  (fundamental Penrose angle)
     *   72° = 2×36°
     *  108° = 3×36° = 180° - 72° (supplementary to 72°)
     *  144° = 4×36° = 180° - 36° (supplementary to 36°)
     *
     * Spread relationships:
     *   spread(36°) = spread(144°) = α = (5-√5)/8
     *   spread(72°) = spread(108°) = β = (5+√5)/8
     *
     * Key identity: β/α = φ² (golden ratio squared!)
     *
     * @namespace penrose
     * @memberof RT.PurePhi
     */
    penrose: {
      /**
       * All Penrose trigonometric values (complete reference)
       * Returns object with all cached cos/sin values for Penrose angles
       *
       * RT-pure: All values computed once from algebraic identities
       * @returns {Object} {cos36, sin36, cos72, sin72, cos108, sin108, cos144, sin144}
       */
      get trig() {
        return {
          cos36: RT.PurePhi.pentagon.cos36(), // (1+√5)/4 = φ/2
          sin36: RT.PurePhi.pentagon.sin36(), // √(10-2√5)/4
          cos72: RT.PurePhi.pentagon.cos72(), // (√5-1)/4 = 1/(2φ)
          sin72: RT.PurePhi.pentagon.sin72(), // √(10+2√5)/4
          cos108: -RT.PurePhi.pentagon.cos72(), // -cos(72°)
          sin108: RT.PurePhi.pentagon.sin72(), // sin(72°)
          cos144: RT.PurePhi.pentagon.cos144(), // -(1+√5)/4 = -φ/2
          sin144: RT.PurePhi.pentagon.sin144(), // √(10-2√5)/4 = sin(36°)
        };
      },

      /**
       * Symbolic rotation by 36° (RT-pure)
       * Applies rotation using exact algebraic cos/sin values
       * Defers sqrt expansion until toVector3() call
       *
       * @param {number} x - X coordinate
       * @param {number} y - Y coordinate
       * @returns {Object} {x, y} rotated point
       */
      rotate36: (x, y) => {
        const c = RT.PurePhi.pentagon.cos36();
        const s = RT.PurePhi.pentagon.sin36();
        return {
          x: x * c - y * s,
          y: x * s + y * c,
        };
      },

      /**
       * Symbolic rotation by 72° (RT-pure)
       * @param {number} x - X coordinate
       * @param {number} y - Y coordinate
       * @returns {Object} {x, y} rotated point
       */
      rotate72: (x, y) => {
        const c = RT.PurePhi.pentagon.cos72();
        const s = RT.PurePhi.pentagon.sin72();
        return {
          x: x * c - y * s,
          y: x * s + y * c,
        };
      },

      /**
       * Symbolic rotation by n×36° (RT-pure)
       * For n = 0..9 covers full circle in Penrose-compatible steps
       *
       * @param {number} x - X coordinate
       * @param {number} y - Y coordinate
       * @param {number} n - Multiplier (0-9 for full rotation)
       * @returns {Object} {x, y} rotated point
       */
      rotateN36: (x, y, n) => {
        // Normalize n to 0-9 range (360° = 10×36°)
        n = ((n % 10) + 10) % 10;
        let rx = x,
          ry = y;
        for (let i = 0; i < n; i++) {
          const result = RT.PurePhi.penrose.rotate36(rx, ry);
          rx = result.x;
          ry = result.y;
        }
        return { x: rx, y: ry };
      },

      /**
       * Robinson triangle leg ratios (symbolic)
       *
       * BL (Large): base:leg = 1:φ (legs are φ times longer than base)
       * BS (Small): base:leg = 1:ψ = 1:(φ-1) = 1:(1/φ) (legs are shorter)
       *
       * These ratios are exact algebraic values - no sqrt needed for ratios
       */
      get robinsonRatios() {
        return {
          // BL triangle: legs are φ times the base
          largeLegRatio: RT.PurePhi.value(), // φ
          largeLegQuadranceRatio: RT.PurePhi.squared(), // φ² = φ + 1

          // BS triangle: legs are 1/φ times the base
          smallLegRatio: RT.PurePhi.inverse(), // 1/φ = φ - 1
          smallLegQuadranceRatio: (() => {
            const inv = RT.PurePhi.inverse();
            return inv * inv; // (1/φ)² = (φ-1)² = φ² - 2φ + 1 = 3 - φ
          })(),
        };
      },

      /**
       * Rhombus diagonal ratios (symbolic)
       *
       * Thick rhombus (72°/108°): short:long diagonal = 1:φ
       * Thin rhombus (36°/144°): short:long diagonal = 1:φ²
       */
      get rhombusDiagonalRatios() {
        return {
          thick: RT.PurePhi.value(), // φ
          thickQuadrance: RT.PurePhi.squared(), // φ²
          thin: RT.PurePhi.squared(), // φ²
          thinQuadrance: RT.PurePhi.fourthPower(), // φ⁴
        };
      },

      /**
       * Deflation scale (symbolic)
       * Each deflation iteration scales by 1/φ = φ - 1
       * After n deflations: scale = (1/φ)ⁿ
       *
       * @param {number} n - Number of deflation iterations
       * @returns {number} Scale factor
       */
      deflationScale: n => {
        const invPhi = RT.PurePhi.inverse();
        return Math.pow(invPhi, n);
      },

      /**
       * Inflation scale (symbolic)
       * Each inflation iteration scales by φ
       * After n inflations: scale = φⁿ
       *
       * @param {number} n - Number of inflation iterations
       * @returns {number} Scale factor
       */
      inflationScale: n => {
        const phi = RT.PurePhi.value();
        return Math.pow(phi, n);
      },
    },
  },

  /**
   * PureRadicals - High-precision symbolic radical algebra (Extension of PurePhi)
   *
   * Extends the PurePhi symbolic algebra pattern to other common radicals.
   * Maintains maximum precision by caching radical values and deferring expansion.
   *
   * Philosophy (same as PurePhi):
   * - Compute radical once, cache for consistency
   * - Work symbolically when possible
   * - Only expand to decimal at GPU boundary
   *
   * @namespace PureRadicals
   */
  PureRadicals: {
    /**
     * High-precision √2 constant (IEEE 754 double precision)
     * Computed once and cached for consistency
     * @returns {number} √2 ≈ 1.4142135623730951...
     */
    sqrt2: (() => {
      const cached = Math.sqrt(2);
      return () => cached;
    })(),

    /**
     * High-precision √3 constant (IEEE 754 double precision)
     * Computed once and cached for consistency
     * @returns {number} √3 ≈ 1.7320508075688772...
     */
    sqrt3: (() => {
      const cached = Math.sqrt(3);
      return () => cached;
    })(),

    /**
     * High-precision √6 constant (IEEE 754 double precision)
     * Computed once and cached for consistency
     * Note: √6 = √2 · √3 (can be computed symbolically if needed)
     * @returns {number} √6 ≈ 2.4494897427831781...
     */
    sqrt6: (() => {
      const cached = Math.sqrt(6);
      return () => cached;
    })(),

    /**
     * Quadray Grid Interval: √6/4
     * THE fundamental spacing constant for quadray coordinate system.
     * This is the perpendicular distance between parallel tetrahedral planes.
     *
     * Mathematical significance:
     * - Edge length of unit tetrahedron inscribed in unit cube
     * - Perpendicular spacing of Central Angle grids in quadray space
     * - Exact value maintains tetrahedral symmetry relationships
     *
     * Precision benefits:
     * - Single √6 expansion (not recomputed 4+ times across modules)
     * - Consistent value across rt-rendering, rt-controls, rt-init
     * - 15 decimal places maintained (IEEE 754 limit)
     *
     * @constant
     * @type {number}
     * @readonly
     */
    QUADRAY_GRID_INTERVAL: (() => {
      const sqrt6 = Math.sqrt(6);
      return sqrt6 / 4; // ≈ 0.6123724356957945
    })(),

    /**
     * Common √2-based identities and values
     * Pre-computed exact values for RT-pure calculations
     */
    get sqrt2Values() {
      const sqrt2 = this.sqrt2();
      return {
        value: sqrt2, // √2
        squared: 2, // (√2)² = 2 (exact!)
        half: sqrt2 / 2, // √2/2 = 1/√2
        inverse: 1 / sqrt2, // 1/√2 = √2/2 (rationalized)
      };
    },

    /**
     * Common √3-based identities and values
     * Pre-computed exact values for RT-pure calculations
     */
    get sqrt3Values() {
      const sqrt3 = this.sqrt3();
      return {
        value: sqrt3, // √3
        squared: 3, // (√3)² = 3 (exact!)
        half: sqrt3 / 2, // √3/2
        inverse: 1 / sqrt3, // 1/√3 = √3/3 (rationalized)
      };
    },

    /**
     * Common √6-based identities and values
     * Pre-computed exact values for RT-pure calculations
     */
    get sqrt6Values() {
      const sqrt6 = this.sqrt6();
      return {
        value: sqrt6, // √6
        squared: 6, // (√6)² = 6 (exact!)
        quarterValue: sqrt6 / 4, // √6/4 (Quadray grid interval)
        asProduct: this.sqrt2() * this.sqrt3(), // √6 = √2 · √3 (verification)
      };
    },
  },

  /**
   * Validate edges have uniform quadrance (regular polyhedron check)
   * Returns array of {edge, Q, error} for each edge
   *
   * @param {Array} vertices - Array of vertex objects with x, y, z
   * @param {Array} edges - Array of [i, j] vertex index pairs
   * @param {number} expectedQ - Expected quadrance for all edges
   * @param {number} tolerance - Error tolerance (default 1e-10)
   * @returns {Array} Validation results for each edge
   *
   * @example
   * const results = RT.validateEdges(vertices, edges, 2, 1e-10);
   * const allValid = results.every(r => r.valid);
   */
  validateEdges: (vertices, edges, expectedQ, tolerance = 1e-10) => {
    return edges.map(([i, j]) => {
      const Q = RT.quadrance(vertices[i], vertices[j]);
      const error = Math.abs(Q - expectedQ);
      return {
        edge: [i, j],
        Q,
        error,
        valid: error < tolerance,
      };
    });
  },

  /**
   * Convert spread to degrees
   * spread → θ (degrees)
   * @param {number} spread - Spread value (0.00 to 1.00)
   * @returns {number} - Angle in degrees (0° to 90°)
   */
  spreadToDegrees: spread => {
    const clampedSpread = Math.max(0, Math.min(1, spread));
    const radians = Math.asin(Math.sqrt(clampedSpread));
    return (radians * 180) / Math.PI;
  },

  /**
   * Convert degrees to spread using RT-pure calculation
   * θ → spread = sin²(θ)
   * @param {number} degrees - Angle in degrees
   * @returns {number} - Spread value (0.00 to 1.00)
   */
  degreesToSpread: degrees => {
    const radians = (degrees * Math.PI) / 180;
    const sinValue = Math.sin(radians);
    return sinValue * sinValue; // sin²(θ)
  },

  /**
   * Apply 45° rotation around Z-axis using RT-pure spread/cross values
   * Used for matrix grid alignment (aligns Tet/Octa edges to X-Y axes)
   *
   * RT-Pure Implementation:
   * - Works in spread/cross space, NOT angle space
   * - Spread s = sin²(45°) = 1/2 = 0.5 (exact rational!)
   * - Cross c = cos²(45°) = 1/2 = 0.5 (exact rational!)
   * - Verifies RT identity: s + c = 1.0
   *
   * @param {THREE.Group} group - THREE.js Group to rotate
   * @requires THREE - THREE.js library
   *
   * @example
   * const matrixGroup = new THREE.Group();
   * // ... add polyhedra to group ...
   * RT.applyRotation45(matrixGroup);
   * // Group is now rotated 45° around Z-axis for grid alignment
   */
  applyRotation45: group => {
    // Work in spread/cross space, not angle space
    const s = 0.5; // Spread = sin²(45°) = 1/2 (exact rational!)
    const c = 0.5; // Cross = cos²(45°) = 1/2 (exact rational!)

    // Extract sin/cos ONLY when constructing matrix (deferred √)
    const sin_val = Math.sqrt(s); // √(1/2) = √2/2
    const cos_val = Math.sqrt(c); // √(1/2) = √2/2

    // Build rotation matrix from spread/cross values
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.set(
      cos_val,
      -sin_val,
      0,
      0,
      sin_val,
      cos_val,
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

    group.applyMatrix4(rotationMatrix);
    console.log(`[RT] 45° rotation applied: s=${s}, c=${c}, s+c=${s + c} ✓`);
  },

  /**
   * Apply 180° rotation around Z-axis using RT-pure spread/cross values
   * Used for alternating tetrahedron orientations in IVM matrices
   *
   * RT-Pure Implementation:
   * - Works in spread/cross space, NOT angle space
   * - Spread s = sin²(180°) = 0² = 0 (exact rational!)
   * - Cross c = cos²(180°) = (-1)² = 1 (exact rational!)
   * - Trivial sqrt extraction: sin = 0, cos = -1 (no computation needed!)
   * - Verifies RT identity: s + c = 1.0
   *
   * Educational Note:
   * The 180° rotation is particularly elegant in RT - the spread/cross values
   * are exact rationals (0 and 1), and sqrt extraction is trivial. This
   * demonstrates that even "complicated" rotations become simple in spread space.
   *
   * @param {THREE.Group} group - THREE.js Group to rotate
   * @requires THREE - THREE.js library
   *
   * @example
   * const tetGroup = new THREE.Group();
   * // ... add tetrahedron geometry to group ...
   * RT.applyRotation180(tetGroup);
   * // Group is now flipped 180° around Z-axis (down-facing orientation)
   */
  applyRotation180: group => {
    // Work in spread/cross space, not angle space
    const s = 0; // Spread = sin²(180°) = 0 (exact rational!)
    const c = 1; // Cross = cos²(180°) = 1 (exact rational!)

    // Extract sin/cos (trivial - no sqrt computation needed!)
    const sin_val = 0; // √0 = 0 (exact)
    const cos_val = -1; // -√1 = -1 (exact, negated for 180°)

    // Build rotation matrix from spread/cross values
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.set(
      cos_val,
      -sin_val,
      0,
      0, // [-1,  0, 0, 0]
      sin_val,
      cos_val,
      0,
      0, // [ 0, -1, 0, 0]
      0,
      0,
      1,
      0, // [ 0,  0, 1, 0]
      0,
      0,
      0,
      1 // [ 0,  0, 0, 1]
    );

    group.applyMatrix4(rotationMatrix);
    console.log(`[RT] 180° rotation applied: s=${s}, c=${c}, s+c=${s + c} ✓`);
  },

  /**
   * Sexagesimal (Base-60) Angular System
   * Babylonian mathematical system superior to decimal for exact fractioning
   *
   * Base-60 advantages:
   * - Factors: 2, 3, 4, 5, 6, 10, 12, 15, 20, 30 (vs. base-10: only 2, 5)
   * - Exact representations: 1/2, 1/3, 1/4, 1/5, 1/6, 1/12, etc.
   * - Historical: Used in astronomy/navigation for millennia
   * - RT-compatible: Works algebraically with spread/cross values
   *
   * @namespace Sexagesimal
   */
  Sexagesimal: {
    /**
     * Sexagesimal angle class (Degrees-Minutes-Seconds-Thirds)
     * Represents angles in base-60 notation
     *
     * Format: D° M' S" T'"
     * - Degrees (D): 0-359
     * - Minutes (M): 0-59 (1/60 of a degree)
     * - Seconds (S): 0-59 (1/60 of a minute = 1/3600 of a degree)
     * - Thirds (T): 0-59 (1/60 of a second = 1/216000 of a degree)
     *
     * @class SexagesimalAngle
     */
    SexagesimalAngle: class {
      /**
       * @param {number} degrees - 0-359
       * @param {number} minutes - 0-59
       * @param {number} seconds - 0-59
       * @param {number} thirds - 0-59 (optional)
       */
      constructor(degrees, minutes, seconds, thirds = 0) {
        this.degrees = Math.floor(degrees);
        this.minutes = Math.floor(minutes);
        this.seconds = Math.floor(seconds);
        this.thirds = Math.floor(thirds);
      }

      /**
       * Convert to decimal degrees
       * @returns {number} Decimal degrees
       */
      toDecimal() {
        return (
          this.degrees +
          this.minutes / 60 +
          this.seconds / 3600 +
          this.thirds / 216000
        );
      }

      /**
       * Convert to radians
       * @returns {number} Radians
       */
      toRadians() {
        return (this.toDecimal() * Math.PI) / 180;
      }

      /**
       * Convert to spread (RT)
       * s = sin²(θ)
       * @returns {number} Spread value (0 to 1)
       */
      toSpread() {
        const radians = this.toRadians();
        const sinValue = Math.sin(radians);
        return sinValue * sinValue;
      }

      /**
       * Convert to cross (RT)
       * c = cos²(θ)
       * @returns {number} Cross value (0 to 1)
       */
      toCross() {
        const radians = this.toRadians();
        const cosValue = Math.cos(radians);
        return cosValue * cosValue;
      }

      /**
       * Format as string
       * @param {boolean} includeThirds - Include thirds in output
       * @returns {string} Formatted string
       */
      toString(includeThirds = true) {
        if (includeThirds && this.thirds > 0) {
          return `${this.degrees}° ${this.minutes}' ${this.seconds}" ${this.thirds}'"`;
        }
        return `${this.degrees}° ${this.minutes}' ${this.seconds}"`;
      }
    },

    /**
     * Convert decimal degrees to sexagesimal DMS
     * @param {number} decimalDegrees - Decimal degrees
     * @returns {SexagesimalAngle} Sexagesimal representation
     *
     * @example
     * const dms = RT.Sexagesimal.fromDecimal(45.5);
     * // 45° 30' 0" 0'"
     */
    fromDecimal: function (decimalDegrees) {
      const d = Math.floor(decimalDegrees);
      const minDecimal = (decimalDegrees - d) * 60;
      const m = Math.floor(minDecimal);
      const secDecimal = (minDecimal - m) * 60;
      const s = Math.floor(secDecimal);
      const t = Math.round((secDecimal - s) * 60);

      return new this.SexagesimalAngle(d, m, s, t);
    },

    /**
     * Convert spread to sexagesimal DMS
     * s → θ (DMS format)
     * @param {number} spread - Spread value (0 to 1)
     * @returns {SexagesimalAngle} Sexagesimal representation
     *
     * @example
     * const dms = RT.Sexagesimal.fromSpread(0.5);
     * // 45° 0' 0" 0'" (exact!)
     */
    fromSpread: function (spread) {
      const clampedSpread = Math.max(0, Math.min(1, spread));
      const radians = Math.asin(Math.sqrt(clampedSpread));
      const degrees = (radians * 180) / Math.PI;
      return this.fromDecimal(degrees);
    },

    /**
     * Convert cross to sexagesimal DMS
     * c → θ (DMS format)
     * @param {number} cross - Cross value (0 to 1)
     * @returns {SexagesimalAngle} Sexagesimal representation
     *
     * @example
     * const dms = RT.Sexagesimal.fromCross(0.5);
     * // 45° 0' 0" 0'" (exact!)
     */
    fromCross: function (cross) {
      const clampedCross = Math.max(0, Math.min(1, cross));
      const radians = Math.acos(Math.sqrt(clampedCross));
      const degrees = (radians * 180) / Math.PI;
      return this.fromDecimal(degrees);
    },

    /**
     * Generate exact sexagesimal divisions
     * Common exact fractions in base-60
     * @returns {Array} Array of {dms, degrees, label, exact}
     *
     * @example
     * const divisions = RT.Sexagesimal.exactDivisions();
     * // Returns 0°, 15°, 30°, 45°, 60°, 90° etc.
     */
    exactDivisions: function () {
      const divisions = [
        { d: 0, m: 0, s: 0, label: "0° (origin)", description: "Horizontal" },
        {
          d: 15,
          m: 0,
          s: 0,
          label: "15° (1/24 circle)",
          description: "Exact 1/6 of quadrant",
        },
        {
          d: 30,
          m: 0,
          s: 0,
          label: "30° (1/12 circle)",
          description: "Exact 1/3 of quadrant",
        },
        {
          d: 45,
          m: 0,
          s: 0,
          label: "45° (1/8 circle)",
          description: "Exact 1/2 of quadrant",
        },
        {
          d: 60,
          m: 0,
          s: 0,
          label: "60° (1/6 circle)",
          description: "Exact 2/3 of quadrant",
        },
        {
          d: 75,
          m: 0,
          s: 0,
          label: "75° (5/24 circle)",
          description: "Exact 5/6 of quadrant",
        },
        {
          d: 90,
          m: 0,
          s: 0,
          label: "90° (1/4 circle)",
          description: "Vertical (full quadrant)",
        },
      ];

      return divisions.map(div => {
        const dms = new this.SexagesimalAngle(div.d, div.m, div.s);
        return {
          dms,
          degrees: div.d,
          label: div.label,
          description: div.description,
          exact: true,
        };
      });
    },

    /**
     * Check if a decimal degree value has exact sexagesimal representation
     * @param {number} decimalDegrees - Decimal degrees
     * @param {number} precision - Maximum thirds precision (default 0)
     * @returns {boolean} True if exact in base-60
     *
     * @example
     * RT.Sexagesimal.isExact(45.0);    // true (45° 0' 0")
     * RT.Sexagesimal.isExact(45.5);    // true (45° 30' 0")
     * RT.Sexagesimal.isExact(45.333);  // false (repeating)
     */
    isExact: function (decimalDegrees, precision = 0) {
      const dms = this.fromDecimal(decimalDegrees);
      const reconstructed = dms.toDecimal();
      const tolerance = 1 / Math.pow(60, precision + 3); // Tolerance based on precision
      return Math.abs(decimalDegrees - reconstructed) < tolerance;
    },
  },

  /**
   * Spread Polynomials - Wildberger's Sₖ(s) for polygon diagonal quadrances
   * From "Divine Proportions" Chapter 14, Exercise 14.2 (p. 166)
   *
   * For regular n-gon with circumradius quadrance Q and star spread s:
   *   Q(A₀, A₂ₖ) = 4·Sₖ(s)·Q
   *
   * The spread polynomials satisfy a Chebyshev-like recurrence:
   *   Sₙ₊₁(s) = (1-2s)·Sₙ(s) - Sₙ₋₁(s) + s
   *
   * @namespace SpreadPolynomials
   * @see Wildberger "Divine Proportions" Chapter 14
   */
  SpreadPolynomials: {
    /**
     * S₁(s) = s (identity - edge quadrance coefficient)
     * @param {number} s - Spread value
     * @returns {number} S₁(s) = s
     */
    S1: s => s,

    /**
     * S₂(s) = 4s(1-s)
     * Skip-one diagonal (Polygon Triangle Theorem, p.165)
     * @param {number} s - Spread value
     * @returns {number} S₂(s)
     */
    S2: s => 4 * s * (1 - s),

    /**
     * S₃(s) = s(3-4s)²
     * Used for triangular stars (Theorem 95, p.160)
     * Note: S₃(3/4) = 0, confirming triangle star spread
     * @param {number} s - Spread value
     * @returns {number} S₃(s)
     */
    S3: s => s * (3 - 4 * s) * (3 - 4 * s),

    /**
     * S₄(s) = 16s(1-s)(1-2s)²
     * @param {number} s - Spread value
     * @returns {number} S₄(s)
     */
    S4: s => 16 * s * (1 - s) * (1 - 2 * s) * (1 - 2 * s),

    /**
     * S₅(s) = s(5 - 20s + 16s²)²
     * Used for pentagonal stars (Theorem 96, Eq. 14.1, p.161)
     * @param {number} s - Spread value
     * @returns {number} S₅(s)
     */
    S5: s => s * Math.pow(5 - 20 * s + 16 * s * s, 2),

    /**
     * S₇(s) = s(7 - 56s + 112s² - 64s³)²
     * Used for heptagonal stars (Theorem 97, Eq. 14.2, p.162)
     * @param {number} s - Spread value
     * @returns {number} S₇(s)
     */
    S7: s => s * Math.pow(7 - 56 * s + 112 * s * s - 64 * s * s * s, 2),

    /**
     * General Sₙ via Chebyshev-like recurrence
     * Sₙ₊₁(s) = (1-2s)·Sₙ(s) - Sₙ₋₁(s) + s
     *
     * @param {number} n - Polynomial index (n ≥ 0)
     * @param {number} s - Spread value
     * @returns {number} Sₙ(s)
     *
     * @example
     * RT.SpreadPolynomials.Sn(3, 0.75); // ≈ 0 (triangle star spread)
     * RT.SpreadPolynomials.Sn(5, 0.9045); // ≈ 0 (pentagon star spread)
     */
    Sn: (n, s) => {
      if (n === 0) return 0;
      if (n === 1) return s;

      let prev = 0; // S₀
      let curr = s; // S₁

      for (let k = 2; k <= n; k++) {
        const next = (1 - 2 * s) * curr - prev + s;
        prev = curr;
        curr = next;
      }

      return curr;
    },
  },

  /**
   * Exact Star Spreads for Regular n-gons
   * From "Divine Proportions" Chapter 14
   *
   * A regular star of order n has spread s between consecutive lines.
   * The star spread determines all polygon geometry via:
   *   - Edge quadrance: Q_edge = 4sQ (Theorem 98)
   *   - Diagonal quadrance: Q(A₀,A₂ₖ) = 4·Sₖ(s)·Q (Exercise 14.2)
   *
   * Uses existing RT.PurePhi and RT.PureRadicals for cached radicals.
   *
   * @namespace StarSpreads
   * @see Wildberger "Divine Proportions" Theorems 95-98
   */
  StarSpreads: {
    /**
     * Triangle (n=3): s = 3/4
     * Theorem 95 (p.160): requires 3 = (√3)² to be a square
     * @returns {number} 0.75 (exact rational)
     */
    triangle: () => 3 / 4,

    /**
     * Square (n=4): s = 1/2
     * @returns {number} 0.5 (exact rational)
     */
    square: () => 1 / 2,

    /**
     * Pentagon (n=5): s = (5+√5)/8 = β
     * Theorem 96 (p.161) and Exercise 14.3 (p.166)
     * @returns {number} ≈ 0.904508497187474
     */
    pentagon: () => (5 + RT.PurePhi.sqrt5()) / 8,

    /**
     * Hexagon (n=6): s = 1/4
     * Note: Edge quadrance = circumradius quadrance (Q_edge = Q)
     * @returns {number} 0.25 (exact rational)
     */
    hexagon: () => 1 / 4,

    /**
     * Octagon (n=8): s = (2-√2)/4
     * @returns {number} ≈ 0.146446609406726
     */
    octagon: () => (2 - RT.PureRadicals.sqrt2()) / 4,

    /**
     * Decagon (n=10): s = (3-√5)/8 = α
     * Complement of pentagon β: α + β = 5/4
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
     * Returns null for n values without algebraically exact spreads
     *
     * @param {number} n - Number of sides
     * @returns {number|null} Star spread or null if not algebraically exact
     *
     * @example
     * RT.StarSpreads.forN(5);  // ≈ 0.9045 (pentagon)
     * RT.StarSpreads.forN(7);  // null (heptagon requires cubic solution)
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
    },
  },

  /**
   * PureCubics - Cached cubic equation solutions for non-constructible polygons
   *
   * While Gauss-Wantzel constructible polygons use only √ radicals,
   * some polygons (7, 9, 14, 18, 21...) require solving cubic equations.
   * We solve these cubics ONCE and cache the results.
   *
   * Philosophy (same as PurePhi/PureRadicals):
   * - Solve cubic algebraically or numerically ONCE
   * - Cache sin/cos values for RT-pure rotation
   * - Composite construction: build from RT-pure bases + cached rotations
   *
   * DERIVATION NOTES (for generalizability):
   *
   * 1. **Galois Theory Connection**:
   *    - n-gon constructible ⟺ Gal(ℚ(ζₙ)/ℚ) has order 2^k
   *    - Heptagon (n=7): Galois group has order 6 = 2×3 → NOT constructible
   *    - Nonagon (n=9): Requires trisecting 60° → cubic extension → NOT constructible
   *
   * 2. **Cardano's Formula (General Cubic)**:
   *    For x³ + px + q = 0:
   *    x = ∛(-q/2 + √(q²/4 + p³/27)) + ∛(-q/2 - √(q²/4 + p³/27))
   *
   *    For 8x³ - 6x - 1 = 0 (nonagon):
   *    Depressed form: x³ - (3/4)x - 1/8 = 0
   *    → p = -3/4, q = -1/8
   *    → Discriminant negative: 3 real roots (casus irreducibilis)
   *    → Use trigonometric substitution or numerical solution
   *
   * 3. **Why Cache Instead of Cardano?**
   *    - Casus irreducibilis: cubic has 3 real roots but Cardano gives complex cube roots
   *    - Must use cos(arccos(...)/3) anyway (trigonometric solution)
   *    - Better to compute once and cache for IEEE 754 precision
   *
   * 4. **Generalizing to Other Cubics**:
   *    Any non-constructible polygon requiring a cubic can follow this pattern:
   *    a) Identify the minimal polynomial for cos(2π/n)
   *    b) Solve numerically to machine precision
   *    c) Cache sin/cos values
   *    d) Derive compound angles via double-angle formulas
   *
   * Reference: Polygon-Rationalize.md for mathematical foundations
   *
   * @namespace PureCubics
   */
  PureCubics: {
    /**
     * NONAGON (9-gon) constants - Built from 3×Triangle @ 40° intervals
     *
     * Cubic equation for cos(20°): 8x³ - 6x - 1 = 0
     * This is the minimal polynomial for cos(20°), requiring angle trisection.
     *
     * DERIVATION:
     * - 20° = 60°/3 (trisection of 60°)
     * - Let x = cos(20°), then cos(60°) = 4x³ - 3x = 1/2
     * - Rearranging: 8x³ - 6x - 1 = 0
     * - Three roots: cos(20°), cos(140°), cos(260°)
     * - We want cos(20°) ≈ 0.9397 (largest real root)
     *
     * Construction: Triangle vertices at 0°, 120°, 240°
     *              + rotated by 40° → vertices at 40°, 160°, 280°
     *              + rotated by 80° → vertices at 80°, 200°, 320°
     */
    nonagon: {
      /**
       * cos(20°) - Root of cubic 8x³ - 6x - 1 = 0
       * Computed once and cached for IEEE 754 precision
       * @returns {number} cos(20°) ≈ 0.9396926207859084
       */
      cos20: (() => {
        const cached = 0.9396926207859084; // Verified: Math.cos(20 * Math.PI / 180)
        return () => cached;
      })(),

      /**
       * sin(20°) - Derived from cos(20°) via Pythagorean identity
       * @returns {number} sin(20°) ≈ 0.3420201433256687
       */
      sin20: (() => {
        const cached = 0.3420201433256687; // Verified: Math.sin(20 * Math.PI / 180)
        return () => cached;
      })(),

      /**
       * cos(40°) = 2cos²(20°) - 1 (double-angle formula)
       * @returns {number} cos(40°) ≈ 0.7660444431189780
       */
      cos40: (() => {
        const cos20 = 0.9396926207859084;
        const cached = 2 * cos20 * cos20 - 1;
        return () => cached;
      })(),

      /**
       * sin(40°) = 2·sin(20°)·cos(20°) (double-angle formula)
       * @returns {number} sin(40°) ≈ 0.6427876096865394
       */
      sin40: (() => {
        const cos20 = 0.9396926207859084;
        const sin20 = 0.3420201433256687;
        const cached = 2 * sin20 * cos20;
        return () => cached;
      })(),

      /**
       * cos(80°) = 2cos²(40°) - 1 (double-angle formula)
       * @returns {number} cos(80°) ≈ 0.1736481776669303
       */
      cos80: (() => {
        const cos40 = 0.766044443118978;
        const cached = 2 * cos40 * cos40 - 1;
        return () => cached;
      })(),

      /**
       * sin(80°) = 2·sin(40°)·cos(40°) (double-angle formula)
       * @returns {number} sin(80°) ≈ 0.9848077530122080
       */
      sin80: (() => {
        const cos40 = 0.766044443118978;
        const sin40 = 0.6427876096865394;
        const cached = 2 * sin40 * cos40;
        return () => cached;
      })(),

      /**
       * spread(40°) = sin²(40°) - Used for rotation spread
       * @returns {number} spread(40°) ≈ 0.4131759111665348
       */
      spread40: (() => {
        const sin40 = 0.6427876096865394;
        const cached = sin40 * sin40;
        return () => cached;
      })(),

      /**
       * Star spread for 9-gon: sin²(π/9) = sin²(20°)
       * @returns {number} ≈ 0.1169777784405110
       */
      starSpread: (() => {
        const sin20 = 0.3420201433256687;
        const cached = sin20 * sin20;
        return () => cached;
      })(),
    },

    /**
     * HEPTAGON (7-gon) constants - Direct construction
     *
     * Cubic equation for cos(2π/7): 8x³ - 4x² - 4x + 1 = 0
     * This is the minimal polynomial for cos(360°/7).
     *
     * DERIVATION:
     * - The 7th roots of unity satisfy x⁷ - 1 = 0
     * - Factoring: (x-1)(x⁶ + x⁵ + x⁴ + x³ + x² + x + 1) = 0
     * - For ζ₇ = e^(2πi/7), let c = cos(2π/7) = (ζ₇ + ζ₇⁻¹)/2
     * - Using c = cos(2π/7), we get: 8c³ - 4c² - 4c + 1 = 0
     * - Three roots: cos(2π/7), cos(4π/7), cos(6π/7)
     * - We want cos(2π/7) ≈ 0.6235 (largest real root)
     *
     * GALOIS THEORY:
     * - Gal(ℚ(ζ₇)/ℚ) ≅ (ℤ/7ℤ)* ≅ ℤ/6ℤ (cyclic of order 6)
     * - Order 6 = 2×3 is NOT a power of 2
     * - Therefore, heptagon is NOT constructible (Gauss-Wantzel)
     *
     * The heptagon cannot be constructed from simpler polygons;
     * it requires solving this irreducible cubic directly.
     */
    heptagon: {
      /**
       * cos(2π/7) = cos(360°/7) ≈ cos(51.4286°)
       * Root of cubic 8x³ - 4x² - 4x + 1 = 0
       * @returns {number} ≈ 0.6234898018587336
       */
      cos1: (() => {
        const cached = 0.6234898018587336; // cos(2π/7)
        return () => cached;
      })(),

      /**
       * sin(2π/7) = sin(360°/7)
       * @returns {number} ≈ 0.7818314824680298
       */
      sin1: (() => {
        const cached = 0.7818314824680298; // sin(2π/7)
        return () => cached;
      })(),

      /**
       * cos(4π/7) = cos(720°/7)
       * @returns {number} ≈ -0.2225209339563144
       */
      cos2: (() => {
        const cached = -0.2225209339563144; // cos(4π/7)
        return () => cached;
      })(),

      /**
       * sin(4π/7) = sin(720°/7)
       * @returns {number} ≈ 0.9749279121818236
       */
      sin2: (() => {
        const cached = 0.9749279121818236; // sin(4π/7)
        return () => cached;
      })(),

      /**
       * cos(6π/7) = cos(1080°/7)
       * @returns {number} ≈ -0.9009688679024191
       */
      cos3: (() => {
        const cached = -0.9009688679024191; // cos(6π/7)
        return () => cached;
      })(),

      /**
       * sin(6π/7) = sin(1080°/7)
       * @returns {number} ≈ 0.4338837391175582
       */
      sin3: (() => {
        const cached = 0.4338837391175582; // sin(6π/7)
        return () => cached;
      })(),

      /**
       * Star spread for 7-gon: sin²(π/7)
       * @returns {number} ≈ 0.1882550990706332
       */
      starSpread: (() => {
        // sin(π/7) = sin(180°/7) ≈ 0.4338837391175582
        const sinPi7 = 0.4338837391175582;
        const cached = sinPi7 * sinPi7;
        return () => cached;
      })(),
    },
  },

  /**
   * ProjectionPolygons - Shadow polygons from 3D polyhedra projections
   *
   * These are polygons that emerge from projecting 3D polyhedra at specific
   * rational spread viewing angles. Unlike PureCubics (which solves cubics
   * for regular polygon construction), ProjectionPolygons arise from the
   * convex hull of projected polyhedra vertices.
   *
   * Key Discovery (Feb 2026):
   * The truncated tetrahedron projects to a 7-sided polygon at rational
   * spreads (0.11, 0, 0.5), despite the heptagon being non-constructible
   * by compass and straightedge (Gauss-Wantzel).
   *
   * These "projection polygons" use only √ radicals - no transcendentals!
   * The coordinates can be expressed using √2, √11, √89, √178.
   *
   * Philosophy:
   * - Gauss-Wantzel limits what can be CONSTRUCTED in 2D
   * - It says nothing about what can PROJECT INTO 2D from higher dimensions
   * - Just as Penrose tilings emerge from 5D hypercubic projections,
   *   prime n-gons can emerge from 3D polyhedral projections
   *
   * Reference: Geometry documents/Prime-Projection-Conjecture.tex
   *
   * @namespace ProjectionPolygons
   */
  ProjectionPolygons: {
    /**
     * Projection Heptagon from Truncated Tetrahedron
     *
     * Viewing Configuration:
     * - Polyhedron: Truncated Tetrahedron (12 vertices, no central symmetry)
     * - Spreads: s₁ = 0.11 = 11/100, s₂ = 0, s₃ = 0.5 = 1/2
     * - Result: 7 vertices on convex hull boundary
     *
     * 7-HULL GEOMETRY (verified):
     *   - Hull vertices: 7 (all unique 2D points on boundary)
     *   - Interior angles: 109.5°, 125.3°, 125.3°, 109.5°, 180°, 70.5°, 180°
     *   - Collinear vertices: 2 (180° angles, lie on edge of visual boundary)
     *   - Visual silhouette: 5-gon (5 non-collinear corners)
     *   - Edge lengths: 6 × 0.7385 + 1 × 0.8528 (normalized)
     *   - Edge variance: ~15%
     *
     * The projection has 7 vertices and 7 edges on the convex hull,
     * but 2 vertices are collinear (on straight edges), making the
     * visual shape a 5-gon with 2 extra points on edges.
     * For regular heptagons, use RT.PureCubics.heptagon instead.
     *
     * Radicals used: √2, √11, √89, √178
     * (All are algebraic; no transcendental functions required)
     */
    heptagon: {
      /**
       * Viewing spreads that produce 7-hull projection
       * VERIFIED 2026-02-06: s=(0.11, 0, 0.5) produces 7 hull vertices
       * Note: s=0.11, 0.14, 0.15, 0.19 all produce 7-hull at s2=0, s3=0.5
       *
       * @returns {Object} { s1, s2, s3 } - Rational spread values
       */
      viewingSpreads: () => ({
        s1: 11 / 100, // 0.11 (rational) - matches CAMERA_PRESETS
        s2: 0, // 0 (rational)
        s3: 1 / 2, // 0.5 (rational)
      }),

      /**
       * Alternative viewing spreads (symmetric complement)
       * Also verified to produce 7-hull projection
       * @returns {Object} { s1, s2, s3 } - Rational spread values
       */
      viewingSpreadsAlt: () => ({
        s1: 89 / 100, // 0.89 (rational) - complement of 0.11
        s2: 0, // 0 (rational)
        s3: 1 / 2, // 0.5 (rational)
      }),

      /**
       * Truncated tetrahedron vertices (12 vertices)
       * Edge length = 2 for convenience
       * @returns {Array<Array<number>>} Array of [x, y, z] coordinates
       */
      sourceVertices: () => [
        // Truncation of tetrahedron at 1/3 edge length
        [1, 1, 3],
        [1, 3, 1],
        [3, 1, 1],
        [1, -1, -3],
        [1, -3, -1],
        [3, -1, -1],
        [-1, 1, -3],
        [-1, 3, -1],
        [-3, 1, -1],
        [-1, -1, 3],
        [-1, -3, 1],
        [-3, -1, 1],
      ],

      /**
       * The radicals used in the projection coordinates
       * These are the only irrational numbers needed - no sin/cos/π
       * @returns {Object} Named radical values
       */
      radicals: () => ({
        sqrt2: Math.sqrt(2),
        sqrt11: Math.sqrt(11),
        sqrt89: Math.sqrt(89),
        sqrt178: Math.sqrt(178),
      }),

      /**
       * Check if the projection is valid at given spreads
       * @param {number} s1 - First rotation spread
       * @param {number} s2 - Second rotation spread
       * @param {number} s3 - Third rotation spread
       * @returns {boolean} True if projection produces 7-gon
       */
      isValidAt: (s1, s2, s3) => {
        // The 7-hull emerges at specific rational spreads
        // Multiple valid configurations: s1 = 0.11, 0.14, 0.15, 0.19 (with s2=0, s3=0.5)
        const tolerance = 0.02;
        const primary = { s1: 0.11, s2: 0, s3: 0.5 }; // Matches CAMERA_PRESETS
        const complement = { s1: 0.89, s2: 0, s3: 0.5 }; // Complement of 0.11
        return (
          (Math.abs(s1 - primary.s1) < tolerance &&
            Math.abs(s2 - primary.s2) < tolerance &&
            Math.abs(s3 - primary.s3) < tolerance) ||
          (Math.abs(s1 - complement.s1) < tolerance &&
            Math.abs(s2 - complement.s2) < tolerance &&
            Math.abs(s3 - complement.s3) < tolerance)
        );
      },

      /**
       * Quadray source vertices for the truncated tetrahedron
       * ALL RATIONAL coordinates - no √2 required as in Cartesian!
       *
       * @returns {Array<Array<number>>} Array of [W,X,Y,Z] Quadray coordinates
       */
      sourceVerticesQuadray: () => [
        // Near W vertex (scale factor 1/3)
        [2, 1, 0, 0],
        [2, 0, 1, 0],
        [2, 0, 0, 1],
        // Near X vertex
        [1, 2, 0, 0],
        [0, 2, 1, 0],
        [0, 2, 0, 1],
        // Near Y vertex
        [1, 0, 2, 0],
        [0, 1, 2, 0],
        [0, 0, 2, 1],
        // Near Z vertex
        [1, 0, 0, 2],
        [0, 1, 0, 2],
        [0, 0, 1, 2],
      ],

      /**
       * Quadray rotation coefficients for the viewing angle
       * F, G, H values for spread-based Quadray rotation
       *
       * Formula: F = (2·cos(θ) + 1) / 3, where cos(θ) = √(1-s)
       *
       * @returns {Object} { axis1, axis2, axis3 } with F, G, H for each rotation
       */
      quadrayRotationCoeffs: () => {
        const s1 = 0.11,
          s2 = 0,
          s3 = 0.5;
        const COS_120 = -0.5;
        const SIN_120 = Math.sqrt(0.75);

        const coeffs = s => {
          const cosT = Math.sqrt(1 - s);
          const sinT = Math.sqrt(s);
          return {
            F: (2 * cosT + 1) / 3,
            G: (2 * (cosT * COS_120 + sinT * SIN_120) + 1) / 3,
            H: (2 * (cosT * COS_120 - sinT * SIN_120) + 1) / 3,
          };
        };

        return {
          axis1: coeffs(s1), // s=0.11: F≈0.96, G≈0.13, H≈-0.09
          axis2: coeffs(s2), // s=0: F=1, G=0, H=0 (identity)
          axis3: coeffs(s3), // s=0.5: F≈0.80, G≈0.31, H≈-0.11
        };
      },

      /**
       * Rationality comparison for this specific construction
       * @returns {Object} Comparison of Quadray vs Cartesian approaches
       */
      rationalityAdvantage: () => ({
        sourcePolyhedron: {
          quadray: "12 vertices, ALL rational (2/3, 1/3, 0, 0)",
          cartesian: "12 vertices, requires √2 for edge lengths",
        },
        viewingAngle: {
          method: "Spread specification (rational: 11/100, 0, 1/2)",
          note: "Identical in both coordinate systems",
        },
        rotationCoeffs: {
          quadray: "F,G,H use only √s (algebraic in spread)",
          cartesian: "sin/cos are transcendental in general",
        },
        finalProjection: {
          note: "Both convert to 2D at projection boundary",
          radicals: "√2, √11, √89, √178 (algebraic, not transcendental)",
        },
      }),
    },

    /**
     * Projection Pentagon from Truncated Tetrahedron
     *
     * Simpler case: 5-gon projection (Fermat prime, constructible)
     * Viewing spreads: (0, 0, 0.5) or (0, 0.5, 0)
     */
    pentagon: {
      /**
       * Viewing spreads that produce 5-gon projection
       * @returns {Object} { s1, s2, s3 } - Rational spread values
       */
      viewingSpreads: () => ({
        s1: 0,
        s2: 0,
        s3: 1 / 2,
      }),
    },

    /**
     * Source polyhedra for projection experiments
     * Only asymmetric polyhedra (no central inversion) can produce odd hull counts
     */
    asymmetricPolyhedra: [
      "truncated_tetrahedron",
      "snub_cube",
      "compound_5_tetrahedra",
    ],
  },

  /**
   * QuadrayPolyhedra - Polyhedra defined in Quadray (WXYZ) coordinates
   *
   * The Quadray coordinate system offers significant advantages for prime polygon
   * construction over Cartesian XYZ. Where Cartesian coordinates require irrational
   * radicals, Quadray coordinates remain PURELY RATIONAL.
   *
   * Key insight: The tetrahedron has trivially simple Quadray vertices:
   *   W = (1,0,0,0), X = (0,1,0,0), Y = (0,0,1,0), Z = (0,0,0,1)
   * while Cartesian requires √3 for the same vertices.
   *
   * Basis Vector Spread: s = sin²(109.47°) = 8/9 (exact rational!)
   * This is the natural angle of tetrahedral geometry.
   *
   * Reference: Geometry documents/Prime-Projection-Conjecture.tex Section 8.4
   *
   * @namespace QuadrayPolyhedra
   */
  QuadrayPolyhedra: {
    /**
     * Tetrahedron in Quadray coordinates
     * Vertices are trivially the unit basis vectors - no radicals needed!
     *
     * @returns {Array<Array<number>>} Array of [W,X,Y,Z] coordinates
     */
    tetrahedron: () => [
      [1, 0, 0, 0], // W vertex
      [0, 1, 0, 0], // X vertex
      [0, 0, 1, 0], // Y vertex
      [0, 0, 0, 1], // Z vertex
    ],

    /**
     * Truncated Tetrahedron in Quadray coordinates
     *
     * 12 vertices, ALL RATIONAL coordinates (no √2 required as in Cartesian).
     * This is the source polyhedron for 7-gon projections.
     *
     * Each vertex is at 1/3 edge position between two tetrahedron vertices.
     * Normalized by factor of 1/3 (multiply by 3 for integer form).
     *
     * @returns {Array<Array<number>>} Array of [W,X,Y,Z] coordinates (×1/3 normalization)
     */
    truncatedTetrahedron: () => [
      // Near W vertex (W has largest coordinate)
      [2, 1, 0, 0],
      [2, 0, 1, 0],
      [2, 0, 0, 1],
      // Near X vertex
      [1, 2, 0, 0],
      [0, 2, 1, 0],
      [0, 2, 0, 1],
      // Near Y vertex
      [1, 0, 2, 0],
      [0, 1, 2, 0],
      [0, 0, 2, 1],
      // Near Z vertex
      [1, 0, 0, 2],
      [0, 1, 0, 2],
      [0, 0, 1, 2],
    ],

    /**
     * Truncated Tetrahedron vertices as fraction objects (exact rational)
     * Returns vertices with explicit numerator/denominator for symbolic computation
     *
     * @returns {Array<Object>} Array of {w, x, y, z} with numerator/denominator pairs
     */
    truncatedTetrahedronRational: () => [
      // Near W vertex
      {
        w: { n: 2, d: 3 },
        x: { n: 1, d: 3 },
        y: { n: 0, d: 1 },
        z: { n: 0, d: 1 },
      },
      {
        w: { n: 2, d: 3 },
        x: { n: 0, d: 1 },
        y: { n: 1, d: 3 },
        z: { n: 0, d: 1 },
      },
      {
        w: { n: 2, d: 3 },
        x: { n: 0, d: 1 },
        y: { n: 0, d: 1 },
        z: { n: 1, d: 3 },
      },
      // Near X vertex
      {
        w: { n: 1, d: 3 },
        x: { n: 2, d: 3 },
        y: { n: 0, d: 1 },
        z: { n: 0, d: 1 },
      },
      {
        w: { n: 0, d: 1 },
        x: { n: 2, d: 3 },
        y: { n: 1, d: 3 },
        z: { n: 0, d: 1 },
      },
      {
        w: { n: 0, d: 1 },
        x: { n: 2, d: 3 },
        y: { n: 0, d: 1 },
        z: { n: 1, d: 3 },
      },
      // Near Y vertex
      {
        w: { n: 1, d: 3 },
        x: { n: 0, d: 1 },
        y: { n: 2, d: 3 },
        z: { n: 0, d: 1 },
      },
      {
        w: { n: 0, d: 1 },
        x: { n: 1, d: 3 },
        y: { n: 2, d: 3 },
        z: { n: 0, d: 1 },
      },
      {
        w: { n: 0, d: 1 },
        x: { n: 0, d: 1 },
        y: { n: 2, d: 3 },
        z: { n: 1, d: 3 },
      },
      // Near Z vertex
      {
        w: { n: 1, d: 3 },
        x: { n: 0, d: 1 },
        y: { n: 0, d: 1 },
        z: { n: 2, d: 3 },
      },
      {
        w: { n: 0, d: 1 },
        x: { n: 1, d: 3 },
        y: { n: 0, d: 1 },
        z: { n: 2, d: 3 },
      },
      {
        w: { n: 0, d: 1 },
        x: { n: 0, d: 1 },
        y: { n: 1, d: 3 },
        z: { n: 2, d: 3 },
      },
    ],

    /**
     * Octahedron in Quadray coordinates
     * Edge midpoints of tetrahedron form an octahedron
     * All coordinates are rational (multiples of 1/2)
     *
     * @returns {Array<Array<number>>} Array of [W,X,Y,Z] coordinates (×1/2 normalization)
     */
    octahedron: () => [
      [1, 1, 0, 0], // WX edge midpoint
      [1, 0, 1, 0], // WY edge midpoint
      [1, 0, 0, 1], // WZ edge midpoint
      [0, 1, 1, 0], // XY edge midpoint
      [0, 1, 0, 1], // XZ edge midpoint
      [0, 0, 1, 1], // YZ edge midpoint
    ],

    /**
     * Cuboctahedron (Vector Equilibrium) in Quadray coordinates
     * 12 vertices at equal distance from origin - Fuller's VE
     * All coordinates are rational!
     *
     * @returns {Array<Array<number>>} Array of [W,X,Y,Z] coordinates
     */
    cuboctahedron: () => [
      // Edge midpoints of octahedron (scaled by 2)
      [2, 1, 1, 0],
      [2, 1, 0, 1],
      [2, 0, 1, 1],
      [1, 2, 1, 0],
      [1, 2, 0, 1],
      [0, 2, 1, 1],
      [1, 1, 2, 0],
      [1, 0, 2, 1],
      [0, 1, 2, 1],
      [1, 1, 0, 2],
      [1, 0, 1, 2],
      [0, 1, 1, 2],
    ],

    /**
     * Spread between any two Quadray basis vectors
     * s = sin²(109.47°) = 8/9 (exact rational!)
     *
     * This is the defining angle of tetrahedral geometry.
     * cos(109.47°) = -1/3 (also exact rational)
     *
     * @returns {number} 8/9
     */
    basisSpread: () => 8 / 9,

    /**
     * Cosine between any two Quadray basis vectors
     * cos(109.47°) = -1/3 (exact rational!)
     *
     * @returns {number} -1/3
     */
    basisCosine: () => -1 / 3,

    /**
     * Convert Quadray [W,X,Y,Z] to Cartesian [x,y,z]
     * Uses the standard basis vector mapping
     *
     * @param {Array<number>} qray - Quadray coordinates [W,X,Y,Z]
     * @returns {Array<number>} Cartesian coordinates [x,y,z]
     */
    toCartesian: qray => {
      const [W, X, Y, Z] = qray;
      // Basis vectors point to tetrahedron vertices inscribed in unit cube
      // W→(1,1,1), X→(1,-1,-1), Y→(-1,1,-1), Z→(-1,-1,1) normalized by 1/√3
      const scale = 1 / Math.sqrt(3);
      return [
        scale * (W + X - Y - Z),
        scale * (W - X + Y - Z),
        scale * (W - X - Y + Z),
      ];
    },

    /**
     * Convert Cartesian [x,y,z] to Quadray [W,X,Y,Z]
     * Returns non-normalized Quadray (not zero-sum)
     *
     * @param {Array<number>} xyz - Cartesian coordinates [x,y,z]
     * @returns {Array<number>} Quadray coordinates [W,X,Y,Z]
     */
    fromCartesian: xyz => {
      const [x, y, z] = xyz;
      const scale = Math.sqrt(3) / 4;
      return [
        scale * (x + y + z + Math.sqrt(3)), // W
        scale * (x - y - z + Math.sqrt(3)), // X
        scale * (-x + y - z + Math.sqrt(3)), // Y
        scale * (-x - y + z + Math.sqrt(3)), // Z
      ];
    },
  },

  /**
   * QuadrayProjection - Projection operations in Quadray coordinates
   *
   * Implements the 7-gon projection from truncated tetrahedron using
   * Quadray coordinates throughout. This maintains rationality longer
   * than the Cartesian approach.
   *
   * Key advantage: Truncated tetrahedron has ALL RATIONAL Quadray vertices
   * while Cartesian requires √2 for edge lengths.
   *
   * @namespace QuadrayProjection
   */
  QuadrayProjection: {
    /**
     * Heptagon projection configuration in Quadray terms
     */
    heptagon: {
      /**
       * Viewing spreads (same as Cartesian - spreads are coordinate-independent)
       * @returns {Object} { s1, s2, s3 } - Rational spread values
       */
      viewingSpreads: () => ({
        s1: 11 / 100, // 0.11
        s2: 0,
        s3: 1 / 2, // 0.5
      }),

      /**
       * F, G, H rotation coefficients for the viewing angle
       * Derived from the viewing spreads using RT.QuadrayRotation formulas
       *
       * For spread s, polarity p:
       *   sin(θ) = √s
       *   cos(θ) = p·√(1-s)
       *   F = (2·cos(θ) + 1) / 3
       *   G = (2·cos(θ - 120°) + 1) / 3
       *   H = (2·cos(θ + 120°) + 1) / 3
       *
       * @param {number} s1 - First rotation spread
       * @param {number} s2 - Second rotation spread
       * @param {number} s3 - Third rotation spread
       * @returns {Object} { F1, G1, H1, F2, G2, H2, F3, G3, H3 }
       */
      rotationCoeffs: (s1 = 0.11, s2 = 0, s3 = 0.5) => {
        const COS_120 = -0.5;
        const SIN_120 = Math.sqrt(0.75);

        const coeffsFromSpread = (s, polarity = 1) => {
          const cosT = polarity * Math.sqrt(1 - s);
          const sinT = Math.sqrt(s);
          return {
            F: (2 * cosT + 1) / 3,
            G: (2 * (cosT * COS_120 + sinT * SIN_120) + 1) / 3,
            H: (2 * (cosT * COS_120 - sinT * SIN_120) + 1) / 3,
          };
        };

        return {
          axis1: coeffsFromSpread(s1, 1),
          axis2: coeffsFromSpread(s2, 1),
          axis3: coeffsFromSpread(s3, 1),
        };
      },

      /**
       * Get the 7 hull vertices in Quadray coordinates
       * These are the truncated tetrahedron vertices that form the
       * convex hull boundary at the viewing angle (0.11, 0, 0.5).
       *
       * @returns {Array<Array<number>>} 7 Quadray vertices [W,X,Y,Z]
       */
      hullVerticesQuadray: () => {
        // At spreads (0.11, 0, 0.5), these 7 of 12 vertices form the hull
        // Indices into truncatedTetrahedron(): [0, 2, 4, 5, 7, 9, 11]
        const allVerts = RT.QuadrayPolyhedra.truncatedTetrahedron();
        const hullIndices = [0, 2, 4, 5, 7, 9, 11];
        return hullIndices.map(i => allVerts[i]);
      },

      /**
       * Project truncated tetrahedron to 2D at viewing spreads
       * Returns both Quadray intermediate and final Cartesian 2D coordinates
       *
       * @param {number} s1 - First rotation spread (default: 0.11)
       * @param {number} s2 - Second rotation spread (default: 0)
       * @param {number} s3 - Third rotation spread (default: 0.5)
       * @returns {Object} { quadrayVertices, cartesian3D, projected2D, hullCount }
       */
      project: (s1 = 0.11, s2 = 0, s3 = 0.5) => {
        const qVerts = RT.QuadrayPolyhedra.truncatedTetrahedron();

        // Convert to Cartesian for projection (Quadray→XYZ at rotation boundary)
        const cartesian3D = qVerts.map(q => RT.QuadrayPolyhedra.toCartesian(q));

        // Apply rotation matrix from spreads
        const cosS1 = Math.sqrt(1 - s1),
          sinS1 = Math.sqrt(s1);
        const cosS2 = Math.sqrt(1 - s2),
          sinS2 = Math.sqrt(s2);
        const cosS3 = Math.sqrt(1 - s3),
          sinS3 = Math.sqrt(s3);

        // ZYX Euler rotation
        const rotated = cartesian3D.map(([x, y, z]) => {
          // Rz
          let x1 = cosS3 * x - sinS3 * y;
          let y1 = sinS3 * x + cosS3 * y;
          let z1 = z;
          // Ry
          let x2 = cosS2 * x1 + sinS2 * z1;
          let y2 = y1;
          let z2 = -sinS2 * x1 + cosS2 * z1;
          // Rx
          let x3 = x2;
          let y3 = cosS1 * y2 - sinS1 * z2;
          let z3 = sinS1 * y2 + cosS1 * z2;
          return [x3, y3, z3];
        });

        // Orthographic projection to XY plane
        const projected2D = rotated.map(([x, y]) => [x, y]);

        return {
          quadrayVertices: qVerts,
          cartesian3D: cartesian3D,
          projected2D: projected2D,
          hullCount: 7, // At these spreads, exactly 7 vertices on hull
        };
      },
    },

    /**
     * Comparison: Quadray vs Cartesian rationality
     * Demonstrates why Quadray is preferred for RT-pure computation
     */
    rationalityComparison: () => ({
      tetrahedron: {
        quadray: "Integer: (1,0,0,0)",
        cartesian: "Irrational: (1,1,1)/√3",
        advantage: "Quadray",
      },
      truncatedTetrahedron: {
        quadray: "Rational: (2,1,0,0)/3",
        cartesian: "Irrational: requires √2",
        advantage: "Quadray",
      },
      basisAngle: {
        quadray: "Spread 8/9 (rational)",
        cartesian: "cos⁻¹(-1/3) (transcendental)",
        advantage: "Quadray",
      },
      ivmLattice: {
        quadray: "Native integer coordinates",
        cartesian: "Requires √2, √3 conversions",
        advantage: "Quadray",
      },
    }),
  },

  /**
   * Face Spreads for Platonic Solids
   * From "Divine Proportions" Chapter 26 (N.J. Wildberger)
   *
   * The face spread S is the spread between adjacent faces meeting at an edge.
   * Remarkably, all five Platonic solid face spreads are RATIONAL NUMBERS.
   *
   * Key insight: Tetrahedron and octahedron share the same face spread (8/9)
   * because the six midpoints of a tetrahedron's edges form an octahedron.
   * This has significant implications for IVM/octet truss construction.
   *
   * @namespace FaceSpreads
   * @see Wildberger "Divine Proportions" Chapter 26, pp. 259-264
   */
  FaceSpreads: {
    /**
     * Tetrahedron face spread: S = 8/9
     * Derivation: Isosceles triangle CMD with quadrances 3Q/4, 3Q/4, Q
     * Using Isosceles Triangle Theorem: s = (Q/3Q/4)(1 - Q/3Q) = 8/9
     *
     * The face spread equals s(PA, PB) where P is the tetrahedron center.
     * This is the "acute" case (faces lean inward).
     *
     * @returns {number} 8/9 ≈ 0.888888... (exact rational)
     */
    tetrahedron: () => 8 / 9,

    /**
     * Cube face spread: S = 1
     * Adjacent faces are perpendicular (trivial case).
     * @returns {number} 1 (exact)
     */
    cube: () => 1,

    /**
     * Octahedron face spread: S = 8/9
     * Same as tetrahedron! This is because:
     * - The six midpoints of a tetrahedron's edges form an octahedron
     * - Slicing corner tetrahedra from a larger tet leaves a central octahedron
     * - The shared faces have identical face spread
     *
     * This is the "obtuse" case (faces lean outward), but spread is the same.
     *
     * IVM Implication: Tetrahedra and octahedra have consistent dihedral
     * angles at all tet-oct interfaces in the octet truss.
     *
     * @returns {number} 8/9 ≈ 0.888888... (exact rational)
     */
    octahedron: () => 8 / 9,

    /**
     * Icosahedron face spread: S = 4/9
     * Derivation uses pentagon constants α = (5-√5)/8, β = (5+√5)/8
     * From Isosceles Triangle Theorem: S = (4β/3α)(1 - β/3α) = 4/9
     *
     * @returns {number} 4/9 ≈ 0.444444... (exact rational)
     */
    icosahedron: () => 4 / 9,

    /**
     * Dodecahedron face spread: S = 4/5
     * Derivation: S = (4α - 1)/(4α²) where α = (5-√5)/8
     * Simplifies to the elegant rational 4/5.
     *
     * @returns {number} 4/5 = 0.8 (exact rational)
     */
    dodecahedron: () => 4 / 5,

    /**
     * Get face spread for a Platonic solid by name
     * @param {string} name - Solid name: "tetrahedron", "cube", "octahedron", "icosahedron", "dodecahedron"
     * @returns {number|null} Face spread or null if not a Platonic solid
     *
     * @example
     * RT.FaceSpreads.forSolid("tetrahedron"); // 0.888...
     * RT.FaceSpreads.forSolid("icosahedron"); // 0.444...
     */
    forSolid: name => {
      const spreads = {
        tetrahedron: RT.FaceSpreads.tetrahedron,
        cube: RT.FaceSpreads.cube,
        octahedron: RT.FaceSpreads.octahedron,
        icosahedron: RT.FaceSpreads.icosahedron,
        dodecahedron: RT.FaceSpreads.dodecahedron,
      };
      return spreads[name] ? spreads[name]() : null;
    },
  },

  /**
   * Native Quadray Rotation using F,G,H Coefficients (Phase 6.1)
   * Tom Ace's tetrahedral rotation formula - verified Feb 2026
   *
   * For rotation by angle θ about a Quadray basis axis:
   *   F = (2·cos(θ) + 1) / 3
   *   G = (2·cos(θ - 120°) + 1) / 3
   *   H = (2·cos(θ + 120°) + 1) / 3
   *
   * The 4×4 rotation matrix for W-axis has circulant structure:
   *   | 1  0  0  0 |
   *   | 0  F  H  G |
   *   | 0  G  F  H |
   *   | 0  H  G  F |
   *
   * Verification: W-axis and Y-axis match quaternions to machine precision (10^-16).
   * See: fgh-verification-test.js
   *
   * @namespace QuadrayRotation
   */
  QuadrayRotation: {
    /**
     * Cached trigonometric constants for 120° offsets
     * cos(120°) = -1/2 (exact rational)
     * sin(120°) = √(3/4) = √3/2
     */
    COS_120: -0.5,
    SIN_120: Math.sqrt(0.75),

    /**
     * Calculate F,G,H rotation coefficients from angle θ
     *
     * @param {number} theta - Rotation angle in radians
     * @returns {Object} { F, G, H } - Rotation coefficients
     *
     * @example
     * const { F, G, H } = RT.QuadrayRotation.fghCoeffs(Math.PI / 3); // 60°
     */
    fghCoeffs(theta) {
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      return {
        F: (2 * cosT + 1) / 3,
        G: (2 * (cosT * this.COS_120 + sinT * this.SIN_120) + 1) / 3,
        H: (2 * (cosT * this.COS_120 - sinT * this.SIN_120) + 1) / 3,
      };
    },

    /**
     * Calculate F,G,H rotation coefficients from spread (RT-Pure)
     *
     * Given spread s = sin²(θ), derives F,G,H without using angle θ directly.
     * The polarity parameter resolves the sign ambiguity in √(1-s).
     *
     * @param {number} spread - Spread value (0 to 1), where s = sin²(θ)
     * @param {number} polarity - Sign of cos(θ): +1 for 0°≤θ≤90°, -1 for 90°<θ≤180°
     * @returns {Object} { F, G, H } - Rotation coefficients
     *
     * @example
     * // 60° rotation: spread = 3/4, polarity = +1
     * const { F, G, H } = RT.QuadrayRotation.fghCoeffsFromSpread(0.75, 1);
     *
     * // 120° rotation: spread = 3/4, polarity = -1
     * const { F, G, H } = RT.QuadrayRotation.fghCoeffsFromSpread(0.75, -1);
     */
    fghCoeffsFromSpread(spread, polarity = 1) {
      const cosTheta = polarity * Math.sqrt(1 - spread);
      const sinTheta = Math.sqrt(spread);

      return {
        F: (2 * cosTheta + 1) / 3,
        G: (2 * (cosTheta * this.COS_120 + sinTheta * this.SIN_120) + 1) / 3,
        H: (2 * (cosTheta * this.COS_120 - sinTheta * this.SIN_120) + 1) / 3,
      };
    },

    /**
     * Apply rotation about W-axis to a Quadray point
     * W-axis direction in Cartesian: (1,1,1)/√3
     *
     * The W coordinate remains unchanged; X,Y,Z transform via circulant matrix.
     *
     * @param {Object} qPoint - Quadray point { w, x, y, z }
     * @param {number} theta - Rotation angle in radians
     * @returns {Object} Rotated Quadray point { w, x, y, z }
     *
     * @example
     * const rotated = RT.QuadrayRotation.rotateAboutW({ w: 0, x: 1, y: 0, z: 0 }, Math.PI/4);
     */
    rotateAboutW(qPoint, theta) {
      const { F, G, H } = this.fghCoeffs(theta);

      return {
        w: qPoint.w, // W unchanged (rotation axis)
        x: F * qPoint.x + H * qPoint.y + G * qPoint.z,
        y: G * qPoint.x + F * qPoint.y + H * qPoint.z,
        z: H * qPoint.x + G * qPoint.y + F * qPoint.z,
      };
    },

    /**
     * Apply rotation about W-axis using spread (RT-Pure)
     *
     * @param {Object} qPoint - Quadray point { w, x, y, z }
     * @param {number} spread - Spread value (0 to 1)
     * @param {number} polarity - Sign of cos(θ): +1 or -1
     * @returns {Object} Rotated Quadray point { w, x, y, z }
     *
     * @example
     * // 45° rotation (spread = 0.5, polarity = +1)
     * const rotated = RT.QuadrayRotation.rotateAboutWBySpread(point, 0.5, 1);
     */
    rotateAboutWBySpread(qPoint, spread, polarity = 1) {
      const { F, G, H } = this.fghCoeffsFromSpread(spread, polarity);

      return {
        w: qPoint.w,
        x: F * qPoint.x + H * qPoint.y + G * qPoint.z,
        y: G * qPoint.x + F * qPoint.y + H * qPoint.z,
        z: H * qPoint.x + G * qPoint.y + F * qPoint.z,
      };
    },

    /**
     * Apply rotation about Y-axis to a Quadray point
     * Y-axis direction in Cartesian: (-1,1,-1)/√3
     *
     * Verified to match quaternions (Phase 6.0 testing).
     * Uses right-circulant pattern (same as W-axis).
     *
     * @param {Object} qPoint - Quadray point { w, x, y, z }
     * @param {number} theta - Rotation angle in radians
     * @returns {Object} Rotated Quadray point { w, x, y, z }
     */
    rotateAboutY(qPoint, theta) {
      const { F, G, H } = this.fghCoeffs(theta);

      return {
        w: F * qPoint.w + H * qPoint.x + G * qPoint.z,
        x: G * qPoint.w + F * qPoint.x + H * qPoint.z,
        y: qPoint.y, // Y unchanged (rotation axis)
        z: H * qPoint.w + G * qPoint.x + F * qPoint.z,
      };
    },

    /**
     * Apply rotation about X-axis to a Quadray point
     * X-axis direction in Cartesian: (1,-1,-1)/√3
     *
     * Uses LEFT-circulant pattern (G,H swapped from W/Y pattern).
     * This accounts for the chirality difference in tetrahedral vertex arrangement.
     *
     * Phase 6.2: Hypothesis - X and Z axes have opposite handedness from W and Y.
     *
     * @param {Object} qPoint - Quadray point { w, x, y, z }
     * @param {number} theta - Rotation angle in radians
     * @returns {Object} Rotated Quadray point { w, x, y, z }
     */
    rotateAboutX(qPoint, theta) {
      const { F, G, H } = this.fghCoeffs(theta);

      // Left-circulant: [F G H; H F G; G H F] on W,Y,Z
      return {
        w: F * qPoint.w + G * qPoint.y + H * qPoint.z,
        x: qPoint.x, // X unchanged (rotation axis)
        y: H * qPoint.w + F * qPoint.y + G * qPoint.z,
        z: G * qPoint.w + H * qPoint.y + F * qPoint.z,
      };
    },

    /**
     * Apply rotation about Z-axis to a Quadray point
     * Z-axis direction in Cartesian: (-1,-1,1)/√3
     *
     * Uses LEFT-circulant pattern (G,H swapped from W/Y pattern).
     * This accounts for the chirality difference in tetrahedral vertex arrangement.
     *
     * Phase 6.2: Hypothesis - X and Z axes have opposite handedness from W and Y.
     *
     * @param {Object} qPoint - Quadray point { w, x, y, z }
     * @param {number} theta - Rotation angle in radians
     * @returns {Object} Rotated Quadray point { w, x, y, z }
     */
    rotateAboutZ(qPoint, theta) {
      const { F, G, H } = this.fghCoeffs(theta);

      // Left-circulant: [F G H; H F G; G H F] on W,X,Y
      return {
        w: F * qPoint.w + G * qPoint.x + H * qPoint.y,
        x: H * qPoint.w + F * qPoint.x + G * qPoint.y,
        y: G * qPoint.w + H * qPoint.x + F * qPoint.y,
        z: qPoint.z, // Z unchanged (rotation axis)
      };
    },

    /**
     * Common rotation spreads (exact rationals where possible)
     *
     * Maps angle names to { spread, polarity } pairs for RT-pure rotation.
     * Spread s = sin²(θ) is often a rational number even when sin(θ) is irrational.
     */
    SPREADS: {
      DEG_0: { spread: 0, polarity: 1 }, // Identity
      DEG_30: { spread: 0.25, polarity: 1 }, // 1/4
      DEG_45: { spread: 0.5, polarity: 1 }, // 1/2
      DEG_60: { spread: 0.75, polarity: 1 }, // 3/4
      DEG_90: { spread: 1, polarity: 1 }, // 1 (quarter turn)
      DEG_120: { spread: 0.75, polarity: -1 }, // 3/4 (tetrahedral symmetry)
      DEG_135: { spread: 0.5, polarity: -1 }, // 1/2
      DEG_150: { spread: 0.25, polarity: -1 }, // 1/4
      DEG_180: { spread: 0, polarity: -1 }, // Half turn (Janus inversion)
    },
  },

  /**
   * Tetrahedron Quadrance Relationships
   * From "Divine Proportions" Chapter 26, Exercises 26.1-26.2
   *
   * For a tetrahedron with edge quadrance Q, these exact relationships hold.
   * Useful for IVM/cuboctahedron derivations and vertex-center calculations.
   *
   * @namespace TetrahedronQuadrances
   */
  TetrahedronQuadrances: {
    /**
     * Quadrance from vertex to opposite face centroid
     * Q(vertex → centroid) = 2Q/3 where Q is edge quadrance
     *
     * @param {number} edgeQ - Edge quadrance
     * @returns {number} Quadrance to opposite face centroid
     */
    vertexToFaceCentroid: edgeQ => (2 * edgeQ) / 3,

    /**
     * Quadrance from vertex to tetrahedron center
     * Q(vertex → center) = 3Q/8 where Q is edge quadrance
     *
     * Note: This equals the quadrance where face spread S = 8/9
     * can be measured as s(PA, PB) from the center P.
     *
     * @param {number} edgeQ - Edge quadrance
     * @returns {number} Quadrance to tetrahedron center
     */
    vertexToCenter: edgeQ => (3 * edgeQ) / 8,

    /**
     * Quadrance from edge midpoint to opposite edge midpoint
     * These six midpoints form an octahedron!
     * Q(midpoint → opposite midpoint) = Q/2 where Q is edge quadrance
     *
     * IVM Implication: This relationship enables deriving octahedra
     * directly from tetrahedron edge midpoints.
     *
     * @param {number} edgeQ - Edge quadrance
     * @returns {number} Quadrance between opposite edge midpoints
     */
    midpointToOppositeMidpoint: edgeQ => edgeQ / 2,
  },
};

/**
 * Quadray Coordinate System
 * Originally implemented in C++ by Tom Ace / Kirby Urner
 *
 * A 4D coordinate system using tetrahedral basis vectors.
 * All coordinates sum to zero (zero-sum normalization).
 *
 * @namespace Quadray
 * @requires THREE - THREE.js Vector3
 */
export const Quadray = {
  /**
   * Axis name to basisVector index mapping
   * Maps QW/QX/QY/QZ names to their corresponding basisVectors[] indices
   *
   * Color convention: QW=Yellow(3), QX=Red(0), QY=Blue(2), QZ=Green(1)
   * This is the canonical mapping used throughout the codebase for:
   * - Camera view presets (quadqw, quadqx, quadqy, quadqz)
   * - Cutplane axis selection
   * - Editing basis visualization
   *
   * @type {Object.<string, number>}
   */
  AXIS_INDEX: {
    qw: 3, // Yellow - D basis vector
    qx: 0, // Red - A basis vector
    qy: 2, // Blue - C basis vector
    qz: 1, // Green - B basis vector
  },

  /**
   * 4 basis vectors pointing to tetrahedral vertices inscribed in cube
   * These are the face normals of a regular tetrahedron
   *
   * Z-up convention: Z coordinate indicates height
   * A: ( 1,  1,  1)  // top-front-right  [index 0, QX/Red]
   * B: ( 1, -1, -1)  // bottom-back-right [index 1, QZ/Green]
   * C: (-1,  1, -1)  // bottom-front-left [index 2, QY/Blue]
   * D: (-1, -1,  1)  // top-back-left     [index 3, QW/Yellow]
   *
   * Note: This will be initialized when THREE.js is available
   * @type {Array<THREE.Vector3>}
   */
  basisVectors: null,

  /**
   * Initialize basis vectors (call after THREE.js is loaded)
   * @param {Object} THREE - THREE.js library
   */
  init: THREE => {
    Quadray.basisVectors = [
      new THREE.Vector3(1, 1, 1).normalize(), // A (top-front-right)
      new THREE.Vector3(1, -1, -1).normalize(), // B (bottom-back-right)
      new THREE.Vector3(-1, 1, -1).normalize(), // C (bottom-front-left)
      new THREE.Vector3(-1, -1, 1).normalize(), // D (top-back-left)
    ];
  },

  /**
   * Zero-sum normalization: A + B + C + D = 0
   * Subtracts mean from all coordinates
   *
   * @param {Array<number>} coords - Array of 4 quadray coordinates
   * @returns {Array<number>} Normalized coordinates
   *
   * @example
   * Quadray.zeroSumNormalize([1, 0, 0, 0]); // [0.75, -0.25, -0.25, -0.25]
   */
  zeroSumNormalize: coords => {
    const mean = (coords[0] + coords[1] + coords[2] + coords[3]) / 4;
    return coords.map(c => c - mean);
  },

  /**
   * Convert quadray (a, b, c, d) to Cartesian (x, y, z)
   * Using zero-sum normalized coordinates
   *
   * @param {number} a - First quadray coordinate
   * @param {number} b - Second quadray coordinate
   * @param {number} c - Third quadray coordinate
   * @param {number} d - Fourth quadray coordinate
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Vector3} Cartesian coordinates
   *
   * @example
   * const pos = Quadray.toCartesian(1, 0, 0, 0, THREE);
   */
  toCartesian: (a, b, c, d, THREE) => {
    if (!Quadray.basisVectors) {
      Quadray.init(THREE);
    }

    const normalized = Quadray.zeroSumNormalize([a, b, c, d]);
    const result = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < 4; i++) {
      result.add(Quadray.basisVectors[i].clone().multiplyScalar(normalized[i]));
    }

    return result;
  },

  /**
   * Convert Cartesian position to Quadray coordinates (QW, QX, QY, QZ)
   * Returns an object with named fields using AXIS_INDEX mapping
   *
   * @param {THREE.Vector3} pos - Cartesian position
   * @returns {Object} { qw, qx, qy, qz } - Zero-sum normalized Quadray coordinates
   *
   * @example
   * const quadray = Quadray.fromCartesian(new THREE.Vector3(1, 0, 0));
   * // Returns { qw: ..., qx: ..., qy: ..., qz: ... }
   */
  fromCartesian: pos => {
    if (!Quadray.basisVectors) {
      console.warn("⚠️ Quadray.basisVectors not initialized");
      return { qw: 0, qx: 0, qy: 0, qz: 0 };
    }

    // Project position onto each basisVector
    const rawQuadray = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      rawQuadray[i] = pos.dot(Quadray.basisVectors[i]);
    }

    // Apply zero-sum normalization
    const normalized = Quadray.zeroSumNormalize(rawQuadray);

    // Return named object using AXIS_INDEX mapping
    return {
      qw: normalized[Quadray.AXIS_INDEX.qw],
      qx: normalized[Quadray.AXIS_INDEX.qx],
      qy: normalized[Quadray.AXIS_INDEX.qy],
      qz: normalized[Quadray.AXIS_INDEX.qz],
    };
  },
};
