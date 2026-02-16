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
import { MetaLog } from "./rt-metalog.js";

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

    MetaLog.identity("Point", "", { construction: "Single vertex at origin" });

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

    MetaLog.identity("Line", "");
    MetaLog.rtMetrics({ edgeQ: quadrance, edgeLength: length });

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
   * POLYGON GENERATION — Wildberger Reflection Method
   * ═══════════════════════════════════════════════════════════════════════════
   * Unified polygon generator using RT.nGonVertices() (Chapter 14, §14.5).
   *
   * ONE √ total: m₁ = tan(π/N) = √(s/(1-s)) from star spread.
   * All N vertices generated via rational tangent addition recurrence.
   *
   * Replaces 9 hand-coded generators (Jan 2026) and the classical trig
   * fallback. Same RT.nGonVertices() also serves great circle N-gon grids.
   *
   * History:
   *   v1 (Jan 2026): Individual RT-pure generators per N + classical fallback
   *   v2 (Feb 2026): Unified Wildberger reflection — 1√ for any N
   *
   * See: Wildberger "Divine Proportions" Chapter 14, pp. 159-166
   * ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Polygon (n-gon) - Regular polygon in XY plane
   * Unified Wildberger reflection construction for ALL n ≥ 3
   *
   * Uses RT.nGonVertices() which implements Chapter 14, §14.5:
   *   ONE √ to get m₁ = tan(π/N), then N vertices via rational tangent recurrence.
   *
   * Method selection (automatic):
   *   algebraic: N = 3,4,5,6,8,10,12 (Gauss-Wantzel constructible, exact star spreads)
   *   cubic:     N = 7,9 (cached cubic solutions from RT.PureCubics)
   *   transcendental: all other N (sin²(π/N) fallback for star spread)
   *
   * Edge quadrance: Q_edge = 4·s·Q_R where s = star spread (Theorem 98)
   *
   * @param {number} quadrance - The circumradius quadrance (R²)
   * @param {Object} options - Configuration: sides, showFace
   * @returns {Object} {vertices, edges, faces, metadata}
   * @see RT.nGonVertices — Wildberger reflection vertex generator
   * @see RT.StarSpreads — exact spread values for each n
   * @see Wildberger "Divine Proportions" Chapter 14, pp. 159-166
   */
  polygon: (quadrance = 1, options = {}) => {
    const n = options.sides || 3;
    const showFace = options.showFace !== false;
    const R = Math.sqrt(quadrance); // circumradius √ (GPU boundary)

    // Unified vertex generation via Wildberger reflection
    const { vertices: verts2D, starSpread, method } = RT.nGonVertices(n, R);

    // Convert to THREE.Vector3 (z=0 for flat polygon)
    const vertices = verts2D.map(v => new THREE.Vector3(v.x, v.y, 0));

    // Edges and faces (identical for all N)
    const edges = [];
    for (let i = 0; i < n; i++) edges.push([i, (i + 1) % n]);
    const faces = showFace ? [Array.from({ length: n }, (_, i) => i)] : [];
    const Q_edge = 4 * starSpread * quadrance;

    const rtPure =
      method === "algebraic" ? true : method === "cubic" ? "cubic" : false;
    const names = {
      3: "Triangle",
      4: "Square",
      5: "Pentagon",
      6: "Hexagon",
      7: "Heptagon",
      8: "Octagon",
      9: "Nonagon",
      10: "Decagon",
      12: "Dodecagon",
    };

    MetaLog.polyhedron(names[n] || `${n}-gon`, n <= 12 ? `{${n}}` : "", {
      construction: `Wildberger reflection (${method})`,
      edgeQ: Q_edge,
      edgeLength: Math.sqrt(Q_edge),
      constructionLines: [
        `Q_R: ${quadrance.toFixed(6)}, R: ${R.toFixed(6)}`,
        `Star spread s: ${starSpread.toFixed(6)} (${method})`,
        `√ count: 1 (slope from spread)`,
      ],
    });

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
        starSpread,
        showFace,
        rtPure,
      },
    };
  },

  /* ═══════════════════════════════════════════════════════════════════════════
   * 3D PRIMITIVES: PRISM & CONE
   * ═══════════════════════════════════════════════════════════════════════════
   * 3D solids using polygon() as base — inherits Wildberger reflection method.
   * These are proper 3D forms that do NOT rotate to camera (unlike Line lineweight).
   *
   * Prism: Two parallel N-gon caps connected by rectangular side faces
   * Cone: N-gon base with point apex
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

    MetaLog.polyhedron(`Prism (${n}-gon)`, "", {
      V: vertices.length,
      E: edges.length,
      F: showFaces ? n + 2 : 0,
      edgeQ: baseEdgeQ,
      constructionLines: [
        `Q_R: ${baseQuadrance.toFixed(6)}, Q_H: ${heightQuadrance.toFixed(6)}`,
        `RT-pure: ${basePolygon.metadata.rtPure}`,
      ],
    });

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

    MetaLog.polyhedron(`Cone (${n}-gon)`, "", {
      V: vertices.length,
      E: edges.length,
      F: showFaces ? n + 1 : 0,
      edgeQ: baseEdgeQ,
      constructionLines: [
        `Q_R: ${baseQuadrance.toFixed(6)}, Q_H: ${heightQuadrance.toFixed(6)}, Q_slant: ${slantQuadrance.toFixed(6)}`,
      ],
    });

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

    MetaLog.log(
      MetaLog.SUMMARY,
      `  Cylinder (${sides}-gon prism): resolution=${resolution}, rtPure=false`
    );

    return result;
  },
};
