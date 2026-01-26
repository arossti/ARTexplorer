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
       * Edge-to-diagonal ratio = φ (golden ratio)
       * In a regular pentagon: diagonal/edge = φ
       * @returns {number} φ ≈ 1.618033988749895
       */
      edgeToDiagonalRatio: () => RT.PurePhi.value(),
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
   * 4 basis vectors pointing to tetrahedral vertices inscribed in cube
   * These are the face normals of a regular tetrahedron
   *
   * Z-up convention: Z coordinate indicates height
   * A: ( 1,  1,  1)  // top-front-right
   * B: ( 1, -1, -1)  // bottom-back-right
   * C: (-1,  1, -1)  // bottom-front-left
   * D: (-1, -1,  1)  // top-back-left
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
};
