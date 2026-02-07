/**
 * rt-primitives.js
 * 2D Primitive Generators for ARTexplorer
 *
 * Point (0D), Line (1D), and Polygon (2D) generators.
 * Uses Rational Trigonometry (RT) for exact calculations where possible.
 *
 * Extracted from rt-polyhedra.js (Jan 2026) for modularity.
 *
 * @requires THREE.js
 * @requires rt-math.js
 */

import { RT } from "./rt-math.js";

// Access THREE.js from global scope (set by main HTML)

/**
 * Primitive generator functions
 * All functions return {vertices, edges, faces}
 * @namespace Primitives
 */
export const Primitives = {
  /**
   * Point - simplest form: single vertex at origin
   * No edges, no faces - purely a coordinate exploration tool
   * Responds to Sm/Md/Lg node sizes, NOT Packed (no edge quadrance)
   */
  point: (_halfSize = 1) => {
    // A point has a single vertex at origin (positioned via gumball)
    const vertices = [new THREE.Vector3(0, 0, 0)];
    const edges = []; // No edges
    const faces = []; // No faces

    console.log("[RT] Point: single vertex at origin");

    return { vertices, edges, faces };
  },

  /**
   * Line - 1D primitive: two vertices connected by a single edge
   * Parameterized by quadrance (Q = length²) for RT purity
   * Packed nodes: r = √Q / 2 (half edge length)
   * Euler: V - E + F = 2 - 1 + 0 = 1 (open form, doesn't satisfy χ=2)
   * @param {number} quadrance - The quadrance (squared length) of the line
   * @param {Object} options - Optional configuration
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  line: (quadrance = 1, _options = {}) => {
    // Length = √Q (only compute sqrt when needed for geometry)
    const length = Math.sqrt(quadrance);
    const halfLength = length / 2;

    // Two vertices along Z-axis (vertical by default)
    const vertices = [
      new THREE.Vector3(0, 0, -halfLength), // Bottom vertex
      new THREE.Vector3(0, 0, halfLength), // Top vertex
    ];

    // Single edge connecting the two vertices
    const edges = [[0, 1]];

    // No faces (1D primitive)
    const faces = [];

    console.log(
      `[RT] Line: Q=${quadrance.toFixed(6)}, length=${length.toFixed(6)}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        quadrance,
        length,
      },
    };
  },

  /* ═══════════════════════════════════════════════════════════════════════════
   * CLASSICAL TRIG REFERENCE (preserved for researchers)
   * ═══════════════════════════════════════════════════════════════════════════
   * The following was the original arbitrary n-gon implementation using
   * classical trigonometry. Replaced Jan 2026 with RT-pure generators.
   *
   * polygon_CLASSICAL: (quadrance = 1, options = {}) => {
   *   const n = options.sides || 3;
   *   const showFace = options.showFace !== false;
   *   const R = Math.sqrt(quadrance);
   *
   *   // Classical trig for spread and edge quadrance
   *   // spread(π/n) = sin²(π/n) - transcendental for arbitrary n
   *   const centralAngle = Math.PI / n;
   *   const spread = Math.pow(Math.sin(centralAngle), 2);
   *   const Q_edge = 4 * quadrance * spread;
   *   const edgeLength = Math.sqrt(Q_edge);
   *
   *   // Generate vertices using transcendental sin/cos
   *   const vertices = [];
   *   for (let i = 0; i < n; i++) {
   *     const angle = (2 * Math.PI * i) / n;
   *     vertices.push(
   *       new THREE.Vector3(R * Math.cos(angle), R * Math.sin(angle), 0)
   *     );
   *   }
   *
   *   // Edges connect consecutive vertices (closed loop)
   *   const edges = [];
   *   for (let i = 0; i < n; i++) edges.push([i, (i + 1) % n]);
   *
   *   // Face: single n-gon with CCW winding for +Z normal
   *   const faces = showFace ? [Array.from({ length: n }, (_, i) => i)] : [];
   *
   *   return {
   *     vertices,
   *     edges,
   *     faces,
   *     metadata: {
   *       sides: n,
   *       quadrance,
   *       circumradius: R,
   *       edgeQuadrance: Q_edge,
   *       edgeLength,
   *       spread,
   *       showFace,
   *       rtPure: false,  // Uses transcendental Math.sin/cos
   *     },
   *   };
   * },
   *
   * RATIONALE FOR REPLACEMENT:
   * - Math.sin/cos are transcendental (irrational by definition)
   * - Gauss-Wantzel theorem: only n = 2^k × (distinct Fermat primes) constructible
   * - RT-pure approach uses cached algebraic radicals (√2, √3, φ)
   * - See: Wildberger "Divine Proportions" Chapter 14, pp. 159-166
   * ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Polygon (n-gon) - Regular polygon in XY plane
   * RT-PURE and CUBIC-ALGEBRAIC implementation using Wildberger's Regular Stars theory
   *
   * Supported n values:
   *   RT-Pure (√ radicals only): 3, 4, 5, 6, 8, 10, 12
   *   Cubic-Algebraic (cached cubic solutions): 7, 9
   *
   * Classical trig fallback for non-supported n (11, 13, 14, 17, 18, 19, 21, 22, 23...)
   *
   * The 7-gon (heptagon) and 9-gon (nonagon) use RT.PureCubics namespace:
   *   7: cubic 8x³ - 4x² - 4x + 1 = 0 (cos 2π/7)
   *   9: cubic 8x³ - 6x - 1 = 0 (cos 20°), built from 3×Triangle @ 40°
   *
   * Parameterized by circumradius quadrance (Q_R = R²) for RT purity.
   * Edge quadrance: Q_edge = 4·s·Q_R where s = star spread (Theorem 98)
   *
   * @param {number} quadrance - The circumradius quadrance (R²)
   * @param {Object} options - Configuration: sides, showFace
   * @returns {Object} {vertices, edges, faces, metadata}
   * @see RT.StarSpreads - Exact spread values for each n
   * @see RT.PureCubics - Cached cubic solutions for 7, 9
   * @see RT.SpreadPolynomials - Diagonal quadrance calculations
   * @see Wildberger "Divine Proportions" Chapter 14, pp. 159-166
   */
  polygon: (quadrance = 1, options = {}) => {
    const n = options.sides || 3;
    const showFace = options.showFace !== false;

    // Dispatch to RT-pure and cubic-algebraic generators
    // Each uses cached radicals from RT.PureRadicals, RT.PurePhi, or RT.PureCubics
    const generators = {
      3: Primitives._polygonTriangle,
      4: Primitives._polygonSquare,
      5: Primitives._polygonPentagon,
      6: Primitives._polygonHexagon,
      7: Primitives._polygonHeptagon, // Cubic: 8x³ - 4x² - 4x + 1 = 0
      8: Primitives._polygonOctagon,
      9: Primitives._polygonNonagon, // Cubic: 3×Triangle @ 40°
      10: Primitives._polygonDecagon,
      12: Primitives._polygonDodecagon,
    };

    const generator = generators[n];
    if (generator) {
      // RT-pure path: use algebraic radicals
      return generator(quadrance, { showFace });
    }

    // Classical trig fallback for n values without algebraic/cubic solutions
    // (11, 13, 14, 17, 18, 19, 21, 22, 23...) require transcendental sin(π/n)
    console.log(
      `[RT] ${n}-gon using classical trig (sin π/${n}). ` +
        `RT-pure: 3,4,5,6,8,10,12 | Cubic: 7,9`
    );
    return Primitives._polygonClassical(quadrance, { sides: n, showFace });
  },

  /**
   * Classical trig fallback for arbitrary n-gons
   * Used when n is not RT-constructible (Gauss-Wantzel theorem)
   * @private
   */
  _polygonClassical: (quadrance, options) => {
    const n = options.sides;
    const showFace = options.showFace;
    const R = Math.sqrt(quadrance);

    // Classical trig for spread and edge quadrance
    const centralAngle = Math.PI / n;
    const spread = Math.pow(Math.sin(centralAngle), 2);
    const Q_edge = 4 * quadrance * spread;

    // Generate vertices using transcendental sin/cos
    const vertices = [];
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n;
      vertices.push(
        new THREE.Vector3(R * Math.cos(angle), R * Math.sin(angle), 0)
      );
    }

    const edges = [];
    for (let i = 0; i < n; i++) edges.push([i, (i + 1) % n]);
    const faces = showFace ? [Array.from({ length: n }, (_, i) => i)] : [];

    console.log(
      `[RT] ${n}-gon (classical): Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `spread=${spread.toFixed(6)}, Q_edge=${Q_edge.toFixed(6)}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: n,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        spread,
        showFace,
        rtPure: false, // Classical trig - not RT-pure
      },
    };
  },

  /**
   * Triangle (n=3) - RT-pure using √3
   * Star spread: s = 3/4 (Theorem 95, p.160)
   * Edge quadrance: Q_edge = 4·(3/4)·Q = 3Q
   * @private
   */
  _polygonTriangle: (quadrance, options) => {
    const R = Math.sqrt(quadrance);
    const sqrt3 = RT.PureRadicals.sqrt3();
    const starSpread = RT.StarSpreads.triangle(); // 3/4

    // Vertices using exact √3 (first vertex at +X axis)
    const vertices = [
      new THREE.Vector3(R, 0, 0),
      new THREE.Vector3(-R / 2, (R * sqrt3) / 2, 0),
      new THREE.Vector3(-R / 2, (-R * sqrt3) / 2, 0),
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 0],
    ];
    const faces = options.showFace ? [[0, 1, 2]] : [];
    const Q_edge = 4 * starSpread * quadrance; // = 3Q

    console.log(
      `[RT] Triangle: Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `s=3/4, Q_edge=${Q_edge.toFixed(6)}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: 3,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        starSpread,
        showFace: options.showFace,
        rtPure: true,
      },
    };
  },

  /**
   * Square (n=4) - RT-pure using √2
   * Star spread: s = 1/2 (trivial case)
   * Edge quadrance: Q_edge = 4·(1/2)·Q = 2Q
   * @private
   */
  _polygonSquare: (quadrance, options) => {
    const R = Math.sqrt(quadrance);
    const sqrt2over2 = RT.PureRadicals.sqrt2Values.half;
    const starSpread = RT.StarSpreads.square(); // 1/2

    // Vertices at 45° using exact √2/2
    const vertices = [
      new THREE.Vector3(R * sqrt2over2, R * sqrt2over2, 0),
      new THREE.Vector3(-R * sqrt2over2, R * sqrt2over2, 0),
      new THREE.Vector3(-R * sqrt2over2, -R * sqrt2over2, 0),
      new THREE.Vector3(R * sqrt2over2, -R * sqrt2over2, 0),
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ];
    const faces = options.showFace ? [[0, 1, 2, 3]] : [];
    const Q_edge = 4 * starSpread * quadrance; // = 2Q

    console.log(
      `[RT] Square: Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `s=1/2, Q_edge=${Q_edge.toFixed(6)}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: 4,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        starSpread,
        showFace: options.showFace,
        rtPure: true,
      },
    };
  },

  /**
   * Pentagon (n=5) - RT-pure using φ (golden ratio)
   * Star spread: s = (5+√5)/8 = β ≈ 0.9045 (Theorem 96, p.161)
   * Uses cached cos/sin values from RT.PurePhi.pentagon
   * @private
   */
  _polygonPentagon: (quadrance, options) => {
    const R = Math.sqrt(quadrance);
    const starSpread = RT.StarSpreads.pentagon();

    // Exact trigonometric values using golden ratio identities
    const cos72 = RT.PurePhi.pentagon.cos72();
    const sin72 = RT.PurePhi.pentagon.sin72();
    const cos144 = RT.PurePhi.pentagon.cos144();
    const sin144 = RT.PurePhi.pentagon.sin144();

    // Vertices at 0°, 72°, 144°, 216°, 288°
    const vertices = [
      new THREE.Vector3(R, 0, 0), // 0°
      new THREE.Vector3(R * cos72, R * sin72, 0), // 72°
      new THREE.Vector3(R * cos144, R * sin144, 0), // 144°
      new THREE.Vector3(R * cos144, -R * sin144, 0), // 216° = -144°
      new THREE.Vector3(R * cos72, -R * sin72, 0), // 288° = -72°
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
    ];
    const faces = options.showFace ? [[0, 1, 2, 3, 4]] : [];
    const Q_edge = 4 * starSpread * quadrance;

    console.log(
      `[RT] Pentagon: Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `s=${starSpread.toFixed(6)}, Q_edge=${Q_edge.toFixed(6)}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: 5,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        starSpread,
        alpha: RT.PurePhi.pentagon.alpha(),
        beta: RT.PurePhi.pentagon.beta(),
        showFace: options.showFace,
        rtPure: true,
      },
    };
  },

  /**
   * Hexagon (n=6) - RT-pure using √3
   * Star spread: s = 1/4
   * Edge quadrance: Q_edge = 4·(1/4)·Q = Q (edge = circumradius!)
   * @private
   */
  _polygonHexagon: (quadrance, options) => {
    const R = Math.sqrt(quadrance);
    const sqrt3over2 = RT.PureRadicals.sqrt3Values.half;
    const starSpread = RT.StarSpreads.hexagon(); // 1/4

    // Vertices at 0°, 60°, 120°, 180°, 240°, 300°
    const vertices = [
      new THREE.Vector3(R, 0, 0), // 0°
      new THREE.Vector3(R / 2, R * sqrt3over2, 0), // 60°
      new THREE.Vector3(-R / 2, R * sqrt3over2, 0), // 120°
      new THREE.Vector3(-R, 0, 0), // 180°
      new THREE.Vector3(-R / 2, -R * sqrt3over2, 0), // 240°
      new THREE.Vector3(R / 2, -R * sqrt3over2, 0), // 300°
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
    ];
    const faces = options.showFace ? [[0, 1, 2, 3, 4, 5]] : [];
    const Q_edge = 4 * starSpread * quadrance; // = Q (edge = circumradius)

    console.log(
      `[RT] Hexagon: Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `s=1/4, Q_edge=${Q_edge.toFixed(6)} (edge=R)`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: 6,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        starSpread,
        showFace: options.showFace,
        rtPure: true,
      },
    };
  },

  /**
   * Octagon (n=8) - RT-pure using √2
   * Star spread: s = (2-√2)/4 ≈ 0.1464
   * Vertices at 22.5° intervals using nested √2 expressions
   * @private
   */
  _polygonOctagon: (quadrance, options) => {
    const R = Math.sqrt(quadrance);
    const sqrt2 = RT.PureRadicals.sqrt2();
    const starSpread = RT.StarSpreads.octagon();

    // cos(22.5°) = √((2 + √2)/4), sin(22.5°) = √((2 - √2)/4)
    // Derived from half-angle formulas using exact √2
    const cos22_5 = Math.sqrt((2 + sqrt2) / 4);
    const sin22_5 = Math.sqrt((2 - sqrt2) / 4);

    // Vertices at 22.5°, 67.5°, 112.5°, ... (8 vertices, 45° apart)
    // Starting at 22.5° to align with our convention
    const vertices = [
      new THREE.Vector3(R * cos22_5, R * sin22_5, 0), // 22.5°
      new THREE.Vector3(R * sin22_5, R * cos22_5, 0), // 67.5°
      new THREE.Vector3(-R * sin22_5, R * cos22_5, 0), // 112.5°
      new THREE.Vector3(-R * cos22_5, R * sin22_5, 0), // 157.5°
      new THREE.Vector3(-R * cos22_5, -R * sin22_5, 0), // 202.5°
      new THREE.Vector3(-R * sin22_5, -R * cos22_5, 0), // 247.5°
      new THREE.Vector3(R * sin22_5, -R * cos22_5, 0), // 292.5°
      new THREE.Vector3(R * cos22_5, -R * sin22_5, 0), // 337.5°
    ];

    const edges = [];
    for (let i = 0; i < 8; i++) edges.push([i, (i + 1) % 8]);
    const faces = options.showFace ? [[0, 1, 2, 3, 4, 5, 6, 7]] : [];
    const Q_edge = 4 * starSpread * quadrance;

    console.log(
      `[RT] Octagon: Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `s=${starSpread.toFixed(6)}, Q_edge=${Q_edge.toFixed(6)}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: 8,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        starSpread,
        showFace: options.showFace,
        rtPure: true,
      },
    };
  },

  /**
   * Nonagon (n=9) - Cubic-Algebraic via TRIANGLE SUBDIVISION
   *
   * Gauss-Wantzel: 9 = 3² is NOT constructible (3 is used twice).
   * HOWEVER: We can build it from 3×Triangle rotated by 40° intervals.
   *
   * The 40° rotation requires solving cubic 8x³ - 6x - 1 = 0 (for cos 20°).
   * We solve this ONCE and cache all derived values in RT.PureCubics.nonagon.
   *
   * Construction:
   * - Triangle 1 @ 0°:   vertices at 0°, 120°, 240° (RT-pure √3)
   * - Triangle 2 @ 40°:  vertices at 40°, 160°, 280° (cached cubic)
   * - Triangle 3 @ 80°:  vertices at 80°, 200°, 320° (cached cubic)
   *
   * @private
   */
  _polygonNonagon: (quadrance, options) => {
    const R = Math.sqrt(quadrance);
    const sqrt3 = RT.PureRadicals.sqrt3();

    // Cached cubic-derived values from RT.PureCubics.nonagon
    const cos20 = RT.PureCubics.nonagon.cos20();
    const sin20 = RT.PureCubics.nonagon.sin20();
    const cos40 = RT.PureCubics.nonagon.cos40();
    const sin40 = RT.PureCubics.nonagon.sin40();
    const cos80 = RT.PureCubics.nonagon.cos80();
    const sin80 = RT.PureCubics.nonagon.sin80();

    // 9 vertices at 40° intervals: 0°, 40°, 80°, 120°, 160°, 200°, 240°, 280°, 320°
    // Angles derived from cubic 8x³ - 6x - 1 = 0 (cos 20°)
    const vertices = [
      new THREE.Vector3(R, 0, 0),                      // 0°
      new THREE.Vector3(R * cos40, R * sin40, 0),     // 40°
      new THREE.Vector3(R * cos80, R * sin80, 0),     // 80°
      new THREE.Vector3(-R / 2, (R * sqrt3) / 2, 0),  // 120° (RT-pure √3)
      new THREE.Vector3(-R * cos20, R * sin20, 0),    // 160° = 180° - 20°
      new THREE.Vector3(-R * cos20, -R * sin20, 0),   // 200° = 180° + 20°
      new THREE.Vector3(-R / 2, (-R * sqrt3) / 2, 0), // 240° (RT-pure √3)
      new THREE.Vector3(R * cos80, -R * sin80, 0),    // 280° = 360° - 80°
      new THREE.Vector3(R * cos40, -R * sin40, 0),    // 320° = 360° - 40°
    ];

    const edges = [];
    for (let i = 0; i < 9; i++) edges.push([i, (i + 1) % 9]);
    const faces = options.showFace ? [[0, 1, 2, 3, 4, 5, 6, 7, 8]] : [];

    // Star spread for 9-gon from cached value
    const starSpread = RT.PureCubics.nonagon.starSpread();
    const Q_edge = 4 * starSpread * quadrance;

    console.log(
      `[RT] Nonagon: Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `s=${starSpread.toFixed(6)} (3×Triangle @ 40°, cubic-cached)`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: 9,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        starSpread,
        showFace: options.showFace,
        rtPure: "cubic", // Triangle vertices RT-pure, rotations cubic-cached
        method: "3×triangle-40°-cubic",
        cubic: "8x³ - 6x - 1 = 0",
      },
    };
  },

  /**
   * Heptagon (n=7) - Cubic-Algebraic (direct construction)
   *
   * Gauss-Wantzel: 7 is NOT a Fermat prime, so heptagon is not constructible.
   * Requires solving cubic 8x³ - 4x² - 4x + 1 = 0 (for cos 2π/7).
   *
   * Unlike nonagon (which builds from triangles), heptagon must be
   * constructed directly using cached cubic solutions.
   *
   * Vertices at 0°, 51.43°, 102.86°, 154.29°, 205.71°, 257.14°, 308.57°
   * (angles = k × 360°/7 for k = 0..6)
   *
   * @private
   */
  _polygonHeptagon: (quadrance, options) => {
    const R = Math.sqrt(quadrance);

    // Cached cubic-derived values from RT.PureCubics.heptagon
    const cos1 = RT.PureCubics.heptagon.cos1(); // cos(2π/7)
    const sin1 = RT.PureCubics.heptagon.sin1(); // sin(2π/7)
    const cos2 = RT.PureCubics.heptagon.cos2(); // cos(4π/7)
    const sin2 = RT.PureCubics.heptagon.sin2(); // sin(4π/7)
    const cos3 = RT.PureCubics.heptagon.cos3(); // cos(6π/7)
    const sin3 = RT.PureCubics.heptagon.sin3(); // sin(6π/7)

    // 7 vertices at 360°/7 intervals
    // Using symmetry: cos(-θ) = cos(θ), sin(-θ) = -sin(θ)
    const vertices = [
      new THREE.Vector3(R, 0, 0), // 0° (exact)
      new THREE.Vector3(R * cos1, R * sin1, 0), // 2π/7 ≈ 51.43°
      new THREE.Vector3(R * cos2, R * sin2, 0), // 4π/7 ≈ 102.86°
      new THREE.Vector3(R * cos3, R * sin3, 0), // 6π/7 ≈ 154.29°
      new THREE.Vector3(R * cos3, -R * sin3, 0), // 8π/7 ≈ 205.71° (= -6π/7)
      new THREE.Vector3(R * cos2, -R * sin2, 0), // 10π/7 ≈ 257.14° (= -4π/7)
      new THREE.Vector3(R * cos1, -R * sin1, 0), // 12π/7 ≈ 308.57° (= -2π/7)
    ];

    const edges = [];
    for (let i = 0; i < 7; i++) edges.push([i, (i + 1) % 7]);
    const faces = options.showFace ? [[0, 1, 2, 3, 4, 5, 6]] : [];

    // Star spread for 7-gon from cached value
    const starSpread = RT.PureCubics.heptagon.starSpread();
    const Q_edge = 4 * starSpread * quadrance;

    console.log(
      `[RT] Heptagon: Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `s=${starSpread.toFixed(6)} (cubic-cached)`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: 7,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        starSpread,
        showFace: options.showFace,
        rtPure: "cubic", // Direct cubic construction
        method: "direct-cubic",
        cubic: "8x³ - 4x² - 4x + 1 = 0",
      },
    };
  },

  /**
   * Decagon (n=10) - RT-pure using φ (golden ratio)
   * Star spread: s = (3-√5)/8 = α ≈ 0.0955 (complement of pentagon β)
   * Vertices at 36° intervals
   * @private
   */
  _polygonDecagon: (quadrance, options) => {
    const R = Math.sqrt(quadrance);
    const starSpread = RT.StarSpreads.decagon();

    // Decagon vertices at 0°, 36°, 72°, 108°, 144°, 180°, 216°, 252°, 288°, 324°
    // Exact values using √5:
    // cos(36°) = (1+√5)/4 = φ/2, sin(36°) = √(10-2√5)/4
    // cos(72°) = (√5-1)/4,       sin(72°) = √(10+2√5)/4
    // cos(108°) = -cos(72°),     sin(108°) = sin(72°)
    // cos(144°) = -cos(36°),     sin(144°) = sin(36°)

    const sqrt5 = RT.PurePhi.sqrt5();
    const c36 = (1 + sqrt5) / 4;
    const s36 = Math.sqrt(10 - 2 * sqrt5) / 4;
    const c72 = (sqrt5 - 1) / 4;
    const s72 = Math.sqrt(10 + 2 * sqrt5) / 4;

    const vertices = [
      new THREE.Vector3(R, 0, 0), // 0°
      new THREE.Vector3(R * c36, R * s36, 0), // 36°
      new THREE.Vector3(R * c72, R * s72, 0), // 72°
      new THREE.Vector3(-R * c72, R * s72, 0), // 108°
      new THREE.Vector3(-R * c36, R * s36, 0), // 144°
      new THREE.Vector3(-R, 0, 0), // 180°
      new THREE.Vector3(-R * c36, -R * s36, 0), // 216°
      new THREE.Vector3(-R * c72, -R * s72, 0), // 252°
      new THREE.Vector3(R * c72, -R * s72, 0), // 288°
      new THREE.Vector3(R * c36, -R * s36, 0), // 324°
    ];

    const edges = [];
    for (let i = 0; i < 10; i++) edges.push([i, (i + 1) % 10]);
    const faces = options.showFace ? [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]] : [];
    const Q_edge = 4 * starSpread * quadrance;

    console.log(
      `[RT] Decagon: Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `s=${starSpread.toFixed(6)}, Q_edge=${Q_edge.toFixed(6)}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: 10,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        starSpread,
        showFace: options.showFace,
        rtPure: true,
      },
    };
  },

  /**
   * Dodecagon (n=12) - RT-pure using √2 and √3
   * Star spread: s = (2-√3)/4 ≈ 0.0670
   * Vertices at 30° intervals, combining square and hexagon geometry
   * @private
   */
  _polygonDodecagon: (quadrance, options) => {
    const R = Math.sqrt(quadrance);
    const sqrt3 = RT.PureRadicals.sqrt3();
    const starSpread = RT.StarSpreads.dodecagon();

    // Exact values for 30° intervals:
    // cos(30°) = √3/2, sin(30°) = 1/2
    // cos(60°) = 1/2, sin(60°) = √3/2
    // cos(90°) = 0, sin(90°) = 1
    const c30 = sqrt3 / 2;
    const s30 = 0.5;
    const c60 = 0.5;
    const s60 = sqrt3 / 2;

    // Vertices at 0°, 30°, 60°, 90°, ... (12 vertices)
    const vertices = [
      new THREE.Vector3(R, 0, 0), // 0°
      new THREE.Vector3(R * c30, R * s30, 0), // 30°
      new THREE.Vector3(R * c60, R * s60, 0), // 60°
      new THREE.Vector3(0, R, 0), // 90°
      new THREE.Vector3(-R * c60, R * s60, 0), // 120°
      new THREE.Vector3(-R * c30, R * s30, 0), // 150°
      new THREE.Vector3(-R, 0, 0), // 180°
      new THREE.Vector3(-R * c30, -R * s30, 0), // 210°
      new THREE.Vector3(-R * c60, -R * s60, 0), // 240°
      new THREE.Vector3(0, -R, 0), // 270°
      new THREE.Vector3(R * c60, -R * s60, 0), // 300°
      new THREE.Vector3(R * c30, -R * s30, 0), // 330°
    ];

    const edges = [];
    for (let i = 0; i < 12; i++) edges.push([i, (i + 1) % 12]);
    const faces = options.showFace
      ? [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]
      : [];
    const Q_edge = 4 * starSpread * quadrance;

    console.log(
      `[RT] Dodecagon: Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, ` +
        `s=${starSpread.toFixed(6)}, Q_edge=${Q_edge.toFixed(6)}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        sides: 12,
        quadrance,
        circumradius: R,
        edgeQuadrance: Q_edge,
        edgeLength: Math.sqrt(Q_edge),
        starSpread,
        showFace: options.showFace,
        rtPure: true,
      },
    };
  },

  /* ═══════════════════════════════════════════════════════════════════════════
   * 3D PRIMITIVES: PRISM & CONE
   * ═══════════════════════════════════════════════════════════════════════════
   * RT-pure 3D solids using the polygon generators as base.
   * These are proper 3D forms that do NOT rotate to camera (unlike Line lineweight).
   *
   * Prism: Two parallel N-gon caps connected by rectangular side faces
   * Cone: N-gon base with point apex
   *
   * RT-pure for n = 3, 4, 5, 6, 8, 10, 12 (Gauss-Wantzel constructible polygons)
   * ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Prism - 3D solid with two parallel N-gon caps
   * RT-pure for n = 3, 4, 5, 6, 8, 10, 12
   *
   * Euler: V - E + F = 2n - 3n + (n+2) = 2 ✓
   *
   * @param {number} baseQuadrance - Circumradius Q of the N-gon caps (R²)
   * @param {number} heightQuadrance - Height Q (h²)
   * @param {Object} options - {sides: n, showFaces: boolean}
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  prism: (baseQuadrance = 1, heightQuadrance = 1, options = {}) => {
    const n = options.sides || 6;
    const showFaces = options.showFaces !== false;

    // Generate base polygon using RT-pure generator
    const basePolygon = Primitives.polygon(baseQuadrance, {
      sides: n,
      showFace: false,
    });
    const baseVertices = basePolygon.vertices;

    // Height calculation (deferred √)
    const height = Math.sqrt(heightQuadrance);
    const halfHeight = height / 2;

    // Create prism vertices (bottom cap at -h/2, top cap at +h/2)
    const vertices = [];

    // Bottom cap vertices (indices 0 to n-1)
    for (let i = 0; i < n; i++) {
      const v = baseVertices[i];
      vertices.push(new THREE.Vector3(v.x, v.y, -halfHeight));
    }

    // Top cap vertices (indices n to 2n-1)
    for (let i = 0; i < n; i++) {
      const v = baseVertices[i];
      vertices.push(new THREE.Vector3(v.x, v.y, halfHeight));
    }

    // Edges: 3n total
    const edges = [];

    // Bottom cap edges (n edges)
    for (let i = 0; i < n; i++) {
      edges.push([i, (i + 1) % n]);
    }

    // Top cap edges (n edges)
    for (let i = 0; i < n; i++) {
      edges.push([n + i, n + ((i + 1) % n)]);
    }

    // Vertical edges (n edges)
    for (let i = 0; i < n; i++) {
      edges.push([i, n + i]);
    }

    // Faces: n+2 total (but side faces split into triangles = 2n triangles)
    const faces = [];

    if (showFaces) {
      // Bottom cap (CW winding for -Z normal when viewed from outside)
      const bottomFace = [];
      for (let i = n - 1; i >= 0; i--) {
        bottomFace.push(i);
      }
      faces.push(bottomFace);

      // Top cap (CCW winding for +Z normal)
      const topFace = [];
      for (let i = 0; i < n; i++) {
        topFace.push(n + i);
      }
      faces.push(topFace);

      // Side faces (rectangles split into 2 triangles each)
      // CCW winding for outward-facing normals
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        // Two triangles per rectangular side face
        // Triangle 1: bottom[i] → bottom[next] → top[next]
        faces.push([i, next, n + next]);
        // Triangle 2: bottom[i] → top[next] → top[i]
        faces.push([i, n + next, n + i]);
      }
    }

    // Vertical edge quadrance = heightQuadrance
    // Base edge quadrance from polygon metadata
    const baseEdgeQ = basePolygon.metadata.edgeQuadrance;

    console.log(
      `[RT] Prism (${n}-gon): Q_R=${baseQuadrance.toFixed(6)}, Q_H=${heightQuadrance.toFixed(6)}, ` +
        `V=${vertices.length}, E=${edges.length}, F=${showFaces ? n + 2 : 0}, rtPure=${basePolygon.metadata.rtPure}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "prism",
        sides: n,
        baseQuadrance,
        heightQuadrance,
        height,
        baseCircumradius: basePolygon.metadata.circumradius,
        baseEdgeQuadrance: baseEdgeQ,
        verticalEdgeQuadrance: heightQuadrance,
        showFaces,
        rtPure: basePolygon.metadata.rtPure,
      },
    };
  },

  /**
   * Cone - 3D solid with N-gon base and point apex
   * RT-pure for n = 3, 4, 5, 6, 8, 10, 12
   *
   * Euler: V - E + F = (n+1) - 2n + (n+1) = 2 ✓
   *
   * @param {number} baseQuadrance - Circumradius Q of the base N-gon (R²)
   * @param {number} heightQuadrance - Height Q (h²)
   * @param {Object} options - {sides: n, showFaces: boolean}
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  cone: (baseQuadrance = 1, heightQuadrance = 1, options = {}) => {
    const n = options.sides || 6;
    const showFaces = options.showFaces !== false;

    // Generate base polygon using RT-pure generator
    const basePolygon = Primitives.polygon(baseQuadrance, {
      sides: n,
      showFace: false,
    });
    const baseVertices = basePolygon.vertices;

    // Height calculation (deferred √)
    const height = Math.sqrt(heightQuadrance);

    // Create cone vertices
    const vertices = [];

    // Base vertices at z = 0 (indices 0 to n-1)
    for (let i = 0; i < n; i++) {
      const v = baseVertices[i];
      vertices.push(new THREE.Vector3(v.x, v.y, 0));
    }

    // Apex at z = height (index n)
    vertices.push(new THREE.Vector3(0, 0, height));
    const apexIndex = n;

    // Edges: 2n total
    const edges = [];

    // Base perimeter edges (n edges)
    for (let i = 0; i < n; i++) {
      edges.push([i, (i + 1) % n]);
    }

    // Edges from base to apex (n edges)
    for (let i = 0; i < n; i++) {
      edges.push([i, apexIndex]);
    }

    // Faces: n+1 total (1 base + n triangular sides)
    const faces = [];

    if (showFaces) {
      // Base face (CW winding for -Z normal when viewed from outside)
      const baseFace = [];
      for (let i = n - 1; i >= 0; i--) {
        baseFace.push(i);
      }
      faces.push(baseFace);

      // Triangular side faces (CCW winding for outward normals)
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        // Triangle: base[i] → base[next] → apex
        faces.push([i, next, apexIndex]);
      }
    }

    // Slant quadrance: Q_slant = Q_R + Q_H (Pythagorean for apex-to-circumradius)
    const slantQuadrance = baseQuadrance + heightQuadrance;
    const baseEdgeQ = basePolygon.metadata.edgeQuadrance;

    console.log(
      `[RT] Cone (${n}-gon): Q_R=${baseQuadrance.toFixed(6)}, Q_H=${heightQuadrance.toFixed(6)}, ` +
        `Q_slant=${slantQuadrance.toFixed(6)}, V=${vertices.length}, E=${edges.length}, F=${showFaces ? n + 1 : 0}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "cone",
        sides: n,
        baseQuadrance,
        heightQuadrance,
        height,
        slantQuadrance,
        baseCircumradius: basePolygon.metadata.circumradius,
        baseEdgeQuadrance: baseEdgeQ,
        showFaces,
        rtPure: basePolygon.metadata.rtPure,
      },
    };
  },

  /**
   * Cylinder - Prism approximation with high N
   * Convenience wrapper around prism() with n=24 or n=36
   *
   * @param {number} radiusQuadrance - Radius Q (R²)
   * @param {number} heightQuadrance - Height Q (h²)
   * @param {Object} options - {resolution: 'standard'|'high', showFaces: boolean}
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  cylinder: (radiusQuadrance = 1, heightQuadrance = 1, options = {}) => {
    const resolution = options.resolution || "standard";
    const sides = resolution === "high" ? 36 : 24;

    const result = Primitives.prism(radiusQuadrance, heightQuadrance, {
      sides,
      showFaces: options.showFaces,
    });

    result.metadata.type = "cylinder";
    result.metadata.resolution = resolution;
    // Note: n=24 and n=36 are NOT RT-pure (not Gauss-Wantzel constructible)
    result.metadata.rtPure = false;

    console.log(
      `[RT] Cylinder (${sides}-gon prism): resolution=${resolution}, rtPure=false`
    );

    return result;
  },
};
