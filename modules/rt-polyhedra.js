/**
 * rt-polyhedra.js
 * 3D Polyhedra Generators for ARTexplorer
 *
 * All Platonic solids, Archimedean solids, and geodesic subdivisions.
 * Uses Rational Trigonometry (RT) for exact calculations.
 *
 * 2D primitives (point, line, polygon) extracted to rt-primitives.js (Jan 2026)
 *
 * @requires THREE.js
 * @requires rt-math.js
 * @requires rt-primitives.js
 */

import { RT } from "./rt-math.js";
import { Primitives } from "./rt-primitives.js";
import { QuadrayPolyhedra } from "./rt-quadray-polyhedra.js";
import { MetaLog } from "./rt-metalog.js";

// Access THREE.js from global scope (set by main HTML)

/**
 * Polyhedra generator functions
 * All functions return {vertices, edges, faces}
 * @namespace Polyhedra
 */
export const Polyhedra = {
  // ═══════════════════════════════════════════════════════════════════════════
  // 2D PRIMITIVES (delegated to rt-primitives.js for backwards compatibility)
  // ═══════════════════════════════════════════════════════════════════════════
  point: Primitives.point,
  line: Primitives.line,
  polygon: Primitives.polygon,

  // Private polygon generators (exposed for testing)
  _polygonClassical: Primitives._polygonClassical,
  _polygonTriangle: Primitives._polygonTriangle,
  _polygonSquare: Primitives._polygonSquare,
  _polygonPentagon: Primitives._polygonPentagon,
  _polygonHexagon: Primitives._polygonHexagon,
  _polygonOctagon: Primitives._polygonOctagon,
  _polygonNonagon: Primitives._polygonNonagon,
  _polygonDecagon: Primitives._polygonDecagon,
  _polygonDodecagon: Primitives._polygonDodecagon,

  // ═══════════════════════════════════════════════════════════════════════════
  // 3D POLYHEDRA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Hexahedron (Cube) - vertices at (±1, ±1, ±1)
   * Edge quadrance Q = 4 (edge length = 2)
   * Z-up convention: Z is vertical axis
   */
  cube: (halfSize = 1, options = {}) => {
    const s = halfSize;
    const vertices = [
      // Bottom face (Z = -s)
      new THREE.Vector3(-s, -s, -s), // 0: left-back-bottom
      new THREE.Vector3(s, -s, -s), // 1: right-back-bottom
      new THREE.Vector3(s, s, -s), // 2: right-front-bottom
      new THREE.Vector3(-s, s, -s), // 3: left-front-bottom
      // Top face (Z = +s)
      new THREE.Vector3(-s, -s, s), // 4: left-back-top
      new THREE.Vector3(s, -s, s), // 5: right-back-top
      new THREE.Vector3(s, s, s), // 6: right-front-top
      new THREE.Vector3(-s, s, s), // 7: left-front-top
    ];

    // 12 edges (3 groups of 4 parallel edges)
    const edges = [
      // Bottom face (Z = -s)
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      // Top face (Z = +s)
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      // Vertical edges (parallel to Z-axis)
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];

    // 6 square faces
    // Winding order corrected to ensure all normals point outward (CCW from outside)
    const faces = [
      [0, 3, 2, 1], // Bottom (Z = -s) (corrected winding)
      [4, 5, 6, 7], // Top (Z = +s)
      [0, 1, 5, 4], // Back (Y = -s)
      [2, 3, 7, 6], // Front (Y = +s)
      [0, 4, 7, 3], // Left (X = -s) (corrected winding)
      [1, 2, 6, 5], // Right (X = +s)
    ];

    // RT VALIDATION: Check edge quadrance uniformity
    const expectedQ = 4 * halfSize * halfSize; // Q = (2s)² = 4s²
    const validation = RT.validateEdges(vertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const faceSpread = RT.FaceSpreads.cube(); // S = 1 (perpendicular faces)
    MetaLog.polyhedron("Cube", "{4,3}", {
      V: 8, E: 12, F: 6,
      edgeQ: expectedQ,
      maxError,
      faceSpread,
      faceSpreadFraction: "1 (perpendicular)",
    });

    return { vertices, edges, faces, faceSpread };
  },

  /**
   * Tetrahedron inscribed in cube
   * Uses alternating vertices (every other corner)
   * Edge quadrance Q = 8 (edge length = 2√2)
   * @param {number} halfSize - Half the edge length of bounding cube
   * @param {Object} options - Optional configuration
   */
  tetrahedron: (halfSize = 1, options = {}) => {
    const s = halfSize;
    // Select 4 vertices of cube such that no two share an edge
    // These form a regular tetrahedron
    const vertices = [
      new THREE.Vector3(-s, -s, -s), // 0: (-, -, -)
      new THREE.Vector3(s, s, -s), // 2: (+, +, -)
      new THREE.Vector3(s, -s, s), // 5: (+, -, +)
      new THREE.Vector3(-s, s, s), // 7: (-, +, +)
    ];

    // 6 edges (all pairs - complete graph K4)
    const edges = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ];

    // 4 triangular faces (CCW winding for outward normals)
    const faces = [
      [0, 1, 2], // Face 0: correct
      [0, 3, 1], // Face 1: FIXED (was [0,1,3])
      [0, 2, 3], // Face 2: correct
      [1, 3, 2], // Face 3: FIXED (was [1,2,3])
    ];

    // RT VALIDATION: Check edge quadrance uniformity
    const expectedQ = 8 * halfSize * halfSize; // Q = (2√2·s)² = 8s²
    const validation = RT.validateEdges(vertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const faceSpread = RT.FaceSpreads.tetrahedron(); // S = 8/9 (Wildberger Ch.26)
    MetaLog.polyhedron("Tetrahedron", "{3,3}", {
      V: 4, E: 6, F: 4,
      edgeQ: expectedQ,
      maxError,
      faceSpread,
      faceSpreadFraction: "8/9",
    });

    return { vertices, edges, faces, faceSpread };
  },

  /**
   * Dual Tetrahedron (opposite alternating vertices)
   * Forms stella octangula (compound of two tetrahedra) when overlaid with base
   *
   * DRY REFACTOR: Derives from base tetrahedron via inversion
   * - Geometric relationship: Multiply all vertices by -1 (180° rotation)
   * - Face winding: Reverse to maintain outward normals
   * - Inherits geodesic subdivision capability from base
   * - Color scheme: Uses reciprocal complementary colors
   *   - Dual solid uses base's geodesic color
   *   - Dual geodesic uses base's solid color
   *   - Creates perfect visual symmetry in stella octangula display
   *
   * @param {number} halfSize - Half the edge length of bounding cube
   * @param {Object} options - Optional configuration (e.g., WXYZ basis arrows)
   */
  dualTetrahedron: (halfSize = 1, options = {}) => {
    // Get base tetrahedron geometry
    MetaLog.suppress();
    const base = Polyhedra.tetrahedron(halfSize);
    MetaLog.unsuppress();

    // Invert all vertices (multiply by -1)
    const vertices = base.vertices.map(v => v.clone().multiplyScalar(-1));

    // Reverse face winding to maintain outward normals after inversion
    const faces = base.faces.map(face => [...face].reverse());

    // Edges remain topologically identical
    const edges = base.edges;

    // RT VALIDATION: Check edge quadrance uniformity
    const expectedQ = 8 * halfSize * halfSize; // Q = (2√2·s)² = 8s²
    const validation = RT.validateEdges(vertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    MetaLog.polyhedron("Dual Tetrahedron", "{3,3}", {
      V: 4, E: 6, F: 4,
      edgeQ: expectedQ,
      maxError,
    });

    return { vertices, edges, faces };
  },

  /**
   * Truncated Tetrahedron with parametric truncation
   * Single source of truth for Python/JavaScript parity in prime polygon search.
   *
   * Truncation parameter t ∈ [0, 0.5]:
   * - t = 0: Base tetrahedron (4 vertices)
   * - t = 1/3: Standard truncated tetrahedron (12 vertices)
   * - t = 0.5: Octahedron limit (6 vertices)
   *
   * GEOMETRY:
   * Each tetrahedron vertex is cut by a plane, creating a triangular face.
   * The cut points lie at distance t along each edge from the original vertex.
   * At t=1/3, the triangular cut faces are equilateral and meet the original
   * faces (now hexagons) at their midpoints.
   *
   * TOPOLOGY:
   * - t < 1/3: 4 vertices (small cuts, still tetrahedron topology)
   * - t = 1/3: 12 vertices, 8 faces (4 triangles + 4 hexagons), 18 edges
   * - t = 0.5: 6 vertices (cuts meet at edge midpoints = octahedron)
   *
   * @param {number} halfSize - Scale factor (base tetrahedron bounding cube half-size)
   * @param {number} truncation - Truncation parameter t ∈ [0, 0.5] (default: 1/3)
   * @param {Object} options - Optional configuration
   * @returns {Object} - {vertices, edges, faces}
   */
  truncatedTetrahedron: (halfSize = 1, truncation = 1 / 3, options = {}) => {
    const t = Math.max(0, Math.min(0.5, truncation)); // Clamp to valid range
    const s = halfSize;

    // Base tetrahedron vertices (inscribed in cube)
    const baseVerts = [
      [-s, -s, -s], // V0
      [s, s, -s], // V1
      [s, -s, s], // V2
      [-s, s, s], // V3
    ];

    // Edge connectivity (all pairs for complete graph K4)
    const baseEdges = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ];

    // Special case: t = 0 returns base tetrahedron
    if (t < 0.001) {
      const vertices = baseVerts.map(v => new THREE.Vector3(v[0], v[1], v[2]));
      const edges = baseEdges;
      const faces = [
        [0, 1, 2],
        [0, 3, 1],
        [0, 2, 3],
        [1, 3, 2],
      ];
      MetaLog.log(MetaLog.SUMMARY, `  Truncated Tetrahedron: t=0 (base tetrahedron), 4 vertices`);
      return { vertices, edges, faces };
    }

    // Special case: t = 0.5 returns octahedron
    if (t > 0.499) {
      // Edge midpoints become octahedron vertices
      const vertices = baseEdges.map(([i, j]) => {
        const v1 = baseVerts[i];
        const v2 = baseVerts[j];
        return new THREE.Vector3(
          (v1[0] + v2[0]) / 2,
          (v1[1] + v2[1]) / 2,
          (v1[2] + v2[2]) / 2
        );
      });

      // Octahedron topology (each original tet face becomes an oct face)
      const edges = [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [1, 2],
        [1, 3],
        [1, 5],
        [2, 4],
        [2, 5],
        [3, 4],
        [3, 5],
        [4, 5],
      ];
      const faces = [
        [0, 1, 2],
        [0, 2, 4],
        [0, 4, 3],
        [0, 3, 1],
        [5, 2, 1],
        [5, 4, 2],
        [5, 3, 4],
        [5, 1, 3],
      ];

      MetaLog.log(MetaLog.SUMMARY, `  Truncated Tetrahedron: t=0.5 (octahedron limit), 6 vertices`);
      return { vertices, edges, faces };
    }

    // General case: truncated tetrahedron with 12 vertices
    // For each edge, place two cut points at t and (1-t) from each endpoint
    const vertices = [];
    const vertexMap = new Map(); // Map edge+position to vertex index

    // Helper to get or create a truncation vertex
    const getVertex = (edgeIdx, fromEnd) => {
      // fromEnd: 0 means at t from start, 1 means at t from end
      const key = `${edgeIdx}-${fromEnd}`;
      if (vertexMap.has(key)) return vertexMap.get(key);

      const [i, j] = baseEdges[edgeIdx];
      const v1 = fromEnd === 0 ? baseVerts[i] : baseVerts[j];
      const v2 = fromEnd === 0 ? baseVerts[j] : baseVerts[i];

      const vertex = new THREE.Vector3(
        v1[0] + t * (v2[0] - v1[0]),
        v1[1] + t * (v2[1] - v1[1]),
        v1[2] + t * (v2[2] - v1[2])
      );

      const idx = vertices.length;
      vertices.push(vertex);
      vertexMap.set(key, idx);
      return idx;
    };

    // Create vertices: for each base vertex, get the 3 truncation points
    // Vertex adjacency in K4: each vertex connects to all others
    const vertexEdges = [
      [0, 1, 2], // V0 connects via edges 0, 1, 2
      [0, 3, 4], // V1 connects via edges 0, 3, 4
      [1, 3, 5], // V2 connects via edges 1, 3, 5
      [2, 4, 5], // V3 connects via edges 2, 4, 5
    ];

    // For each base vertex, which end of each edge is it?
    const vertexEnds = [
      [0, 0, 0], // V0 is start of edges 0, 1, 2
      [1, 0, 0], // V1 is end of edge 0, start of edges 3, 4
      [1, 1, 0], // V2 is end of edges 1, 3, start of edge 5
      [1, 1, 1], // V3 is end of edges 2, 4, 5
    ];

    // Create the 12 truncation vertices (3 per base vertex)
    const truncVerts = [];
    for (let v = 0; v < 4; v++) {
      truncVerts[v] = [];
      for (let e = 0; e < 3; e++) {
        const edgeIdx = vertexEdges[v][e];
        const fromEnd = vertexEnds[v][e];
        truncVerts[v][e] = getVertex(edgeIdx, fromEnd);
      }
    }

    // Build faces:
    // - 4 triangular faces (one per original vertex, from truncation cuts)
    // - 4 hexagonal faces (one per original face, modified by truncation)

    // Triangular faces at each truncated vertex
    const triangleFaces = [
      [truncVerts[0][0], truncVerts[0][1], truncVerts[0][2]], // At V0
      [truncVerts[1][0], truncVerts[1][2], truncVerts[1][1]], // At V1 (reversed for outward normal)
      [truncVerts[2][0], truncVerts[2][1], truncVerts[2][2]], // At V2
      [truncVerts[3][0], truncVerts[3][2], truncVerts[3][1]], // At V3 (reversed for outward normal)
    ];

    // Hexagonal faces (original tetrahedron faces, now hexagons)
    // Original tet faces: [0,1,2], [0,3,1], [0,2,3], [1,3,2]
    // Each hexagon connects truncation points around the original face

    // Face 0-1-2: connects truncation points from V0, V1, V2
    // V0's points on edges to V1, V2 = truncVerts[0][0], truncVerts[0][1]
    // V1's points on edges to V0, V2 = truncVerts[1][0], truncVerts[1][1]
    // V2's points on edges to V0, V1 = truncVerts[2][0], truncVerts[2][1]
    const hexFace012 = [
      truncVerts[0][0], // V0→V1
      truncVerts[1][0], // V1→V0
      truncVerts[1][1], // V1→V2
      truncVerts[2][1], // V2→V1
      truncVerts[2][0], // V2→V0
      truncVerts[0][1], // V0→V2
    ];

    // Face 0-3-1: V0, V3, V1
    const hexFace031 = [
      truncVerts[0][2], // V0→V3
      truncVerts[3][0], // V3→V0
      truncVerts[3][1], // V3→V1
      truncVerts[1][2], // V1→V3
      truncVerts[1][0], // V1→V0
      truncVerts[0][0], // V0→V1
    ];

    // Face 0-2-3: V0, V2, V3
    const hexFace023 = [
      truncVerts[0][1], // V0→V2
      truncVerts[2][0], // V2→V0
      truncVerts[2][2], // V2→V3
      truncVerts[3][2], // V3→V2
      truncVerts[3][0], // V3→V0
      truncVerts[0][2], // V0→V3
    ];

    // Face 1-3-2: V1, V3, V2
    const hexFace132 = [
      truncVerts[1][2], // V1→V3
      truncVerts[3][1], // V3→V1
      truncVerts[3][2], // V3→V2
      truncVerts[2][2], // V2→V3
      truncVerts[2][1], // V2→V1
      truncVerts[1][1], // V1→V2
    ];

    const faces = [
      ...triangleFaces,
      hexFace012,
      hexFace031,
      hexFace023,
      hexFace132,
    ];

    // Build edges from face perimeters
    const edgeSet = new Set();
    const addEdge = (a, b) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      edgeSet.add(key);
    };

    faces.forEach(face => {
      for (let i = 0; i < face.length; i++) {
        addEdge(face[i], face[(i + 1) % face.length]);
      }
    });

    const edges = Array.from(edgeSet).map(e => e.split(",").map(Number));

    // RT VALIDATION
    const sampleQ = RT.quadrance(
      vertices[edges[0][0]],
      vertices[edges[0][1]]
    );
    const validation = RT.validateEdges(vertices, edges, sampleQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    MetaLog.polyhedron("Truncated Tetrahedron", "", {
      V: vertices.length, E: edges.length, F: faces.length,
      maxError,
      constructionLines: [`t=${t.toFixed(4)}`],
    });

    return { vertices, edges, faces };
  },

  /**
   * Truncated Dual Tetrahedron with parametric truncation
   * DRY: Derives from truncatedTetrahedron via vertex inversion (×-1)
   * Same geometric relationship as dualTetrahedron → tetrahedron
   *
   * @param {number} halfSize - Scale factor (base tetrahedron bounding cube half-size)
   * @param {number} truncation - Truncation parameter t ∈ [0, 0.5] (default: 1/3)
   * @param {Object} options - Optional configuration
   * @returns {Object} - {vertices, edges, faces}
   */
  truncatedDualTetrahedron: (halfSize = 1, truncation = 1 / 3, options = {}) => {
    MetaLog.suppress();
    const base = Polyhedra.truncatedTetrahedron(halfSize, truncation);
    MetaLog.unsuppress();

    // Invert all vertices (multiply by -1) — same as dualTetrahedron pattern
    const vertices = base.vertices.map(v => v.clone().multiplyScalar(-1));

    // Reverse face winding to maintain outward normals after inversion
    const faces = base.faces.map(face => [...face].reverse());

    // Edges remain topologically identical
    const edges = base.edges;

    MetaLog.log(MetaLog.SUMMARY,
      `  Truncated Dual Tetrahedron: t=${Math.max(0, Math.min(0.5, truncation)).toFixed(4)}, ${vertices.length} vertices`
    );

    return { vertices, edges, faces };
  },

  /**
   * Geodesic Dual Tetrahedron with projection options
   * Derives from base tetrahedron via inversion, then applies geodesic subdivision
   * Implements reciprocal complementary color scheme (uses base solid color for geodesic)
   *
   * @param {number} halfSize - Radius of geodesic sphere
   * @param {number} frequency - Subdivision frequency (1-7)
   * @param {string} projection - Projection mode: "off", "in", "mid", "out"
   * @returns {Object} - {vertices, edges, faces}
   */
  geodesicDualTetrahedron: (
    halfSize = 1,
    frequency = 1,
    projection = "out",
    options = {}
  ) => {
    // Get base geodesic tetrahedron (subdivided and projected)
    MetaLog.suppress();
    const base = Polyhedra.geodesicTetrahedron(halfSize, frequency, projection);
    MetaLog.unsuppress();

    // Invert all vertices (multiply by -1) to create dual
    const vertices = base.vertices.map(v => v.clone().multiplyScalar(-1));

    // Reverse face winding to maintain outward normals after inversion
    const faces = base.faces.map(face => [...face].reverse());

    // Edges remain topologically identical
    const edges = base.edges;

    MetaLog.identity("Geodesic Dual Tetrahedron", "", {
      construction: `freq=${frequency}, projection=${projection}, V=${vertices.length}`,
    });

    return { vertices, edges, faces };
  },

  /**
   * Octahedron (dual of cube)
   * Vertices at face centers of cube: (±1,0,0), (0,±1,0), (0,0,±1)
   * Edge quadrance Q = 2 (edge length = √2)
   * Bounded by stella octangula (intersection of dual tetrahedra)
   * Z-up convention: Z is vertical axis
   */
  octahedron: (halfSize = 1, options = {}) => {
    const s = halfSize;
    // 6 vertices at cube face centers
    const vertices = [
      new THREE.Vector3(s, 0, 0), // 0: Right (+X)
      new THREE.Vector3(-s, 0, 0), // 1: Left (-X)
      new THREE.Vector3(0, s, 0), // 2: Front (+Y)
      new THREE.Vector3(0, -s, 0), // 3: Back (-Y)
      new THREE.Vector3(0, 0, s), // 4: Top (+Z) ← Vertical!
      new THREE.Vector3(0, 0, -s), // 5: Bottom (-Z)
    ];

    // 12 edges (each vertex connects to 4 others, excluding opposite)
    const edges = [
      // Right (0) connects to: front, back, top, bottom
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      // Left (1) connects to: front, back, top, bottom
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      // Front (2) connects to: top, bottom (already connected to left/right)
      [2, 4],
      [2, 5],
      // Back (3) connects to: top, bottom
      [3, 4],
      [3, 5],
    ];

    // 8 triangular faces (4 above XY-plane, 4 below)
    // Winding order corrected to ensure all normals point outward (CCW from outside)
    const faces = [
      // Upper hemisphere (Z > 0)
      [0, 2, 4], // Right-Front-Top
      [0, 4, 3], // Right-Back-Top (corrected winding)
      [1, 4, 2], // Left-Front-Top (corrected winding)
      [1, 3, 4], // Left-Back-Top
      // Lower hemisphere (Z < 0)
      [0, 5, 2], // Right-Front-Bottom (corrected winding)
      [0, 3, 5], // Right-Back-Bottom
      [1, 2, 5], // Left-Front-Bottom
      [1, 5, 3], // Left-Back-Bottom (corrected winding)
    ];

    // RT VALIDATION: Check edge quadrance uniformity
    const expectedQ = 2 * halfSize * halfSize; // Q = (√2·s)² = 2s²
    const validation = RT.validateEdges(vertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const faceSpread = RT.FaceSpreads.octahedron(); // S = 8/9 (same as tetrahedron!)
    MetaLog.polyhedron("Octahedron", "{3,4}", {
      V: 6, E: 12, F: 8,
      edgeQ: expectedQ,
      maxError,
      faceSpread,
      faceSpreadFraction: "8/9",
    });

    return { vertices, edges, faces, faceSpread };
  },

  /**
   * Icosahedron (20 triangular faces, 12 vertices, 30 edges)
   * Rational Trigonometry construction: vertices derived from edge midpoints
   * Alternative to golden ratio: use quadrance relationships
   * For RT purity: coordinates (0, ±a, ±b) where b²/a² = 5 (golden rectangle ratio)
   * This gives edge quadrance Q = 4a² for all 30 edges
   */
  icosahedron: (halfSize = 1, options = {}) => {
    // RT approach: Use (0, ±a, ±b) where b²/a² = 5 (golden rectangle ratio)
    // Quadrance from (0,1,√5) to (1,√5,0) = 1² + (√5-1)² + 5 = 1 + (6-2√5) + 5 = 12-2√5
    //
    // RATIONAL TRIGONOMETRY + PUREPHI: Maximum precision symbolic algebra
    // For icosahedron: Three orthogonal golden rectangles (aspect ratio 1:φ)
    // Vertices at (0, ±1, ±φ) and cyclic permutations
    //
    // PurePhi Method 2: Work symbolically in (a + b√5)/c form until GPU boundary
    // Only expand √5 once (cached) when creating THREE.Vector3 coordinates
    // Preserves exact algebraic relationships: φ² = φ + 1 (EXACT!)

    // Symbolic constants - NO expansion yet!
    const phi = RT.PurePhi.constants.phi; // (1 + √5)/2 symbolic
    const phiSq = RT.PurePhi.constants.phiSq; // (3 + √5)/2 symbolic (EXACT: φ² = φ + 1)
    const one = RT.PurePhi.constants.one; // 1 symbolic

    // Normalization: 1/√(1 + φ²)
    // Symbolic: 1 + φ² = 1 + (3 + √5)/2 = (5 + √5)/2 (EXACT!)
    const onePlusPhiSq = one.add(phiSq); // (5 + √5)/2 symbolic - no expansion!

    // Expand only for square root (unavoidable)
    const normFactor = 1 / Math.sqrt(onePlusPhiSq.toDecimal());

    // Symbolic scaled coordinates - still exact!
    const aSym = one.scale(halfSize * normFactor); // (halfSize * normFactor) symbolic
    const bSym = phi.scale(halfSize * normFactor); // φ * (halfSize * normFactor) symbolic

    // Final expansion at GPU boundary (THREE.Vector3 creation)
    const a = aSym.toDecimal(); // Only now do we expand to decimal
    const b = bSym.toDecimal(); // Only now do we expand to decimal

    // Educational console output showing symbolic algebra
    MetaLog.identity("Icosahedron", "{3,5}", {
      construction: "PurePhi symbolic (high-precision)",
      halfSize,
    });
    MetaLog.construction([
      `φ = ${phi.toString()} = ${phi.toDecimal().toFixed(15)}`,
      `φ² = ${phiSq.toString()} = ${phiSq.toDecimal().toFixed(15)} (identity: φ + 1)`,
      `1 + φ² = ${onePlusPhiSq.toString()} = ${onePlusPhiSq.toDecimal().toFixed(15)}`,
      `Normalization: 1/√(1 + φ²) = ${normFactor.toFixed(15)}`,
      `a = 1·norm = ${a.toFixed(15)}`,
      `b = φ·norm = ${b.toFixed(15)}`,
      `Identity check: |φ² - (φ + 1)| = ${Math.abs(phiSq.toDecimal() - (phi.toDecimal() + 1)).toExponential()} (should be ~0)`,
    ]);

    // Z-up convention: Three orthogonal golden rectangles
    // Note: Vertex order unchanged (maintains edge/face topology)
    const vertices = [
      // Rectangle 1: XZ plane (Y = ±a) - VERTICAL front/back wall in Z-up
      new THREE.Vector3(0, a, b), // 0
      new THREE.Vector3(0, a, -b), // 1
      new THREE.Vector3(0, -a, b), // 2
      new THREE.Vector3(0, -a, -b), // 3
      // Rectangle 2: YZ plane (X = ±a) - VERTICAL left/right wall in Z-up
      new THREE.Vector3(a, b, 0), // 4
      new THREE.Vector3(a, -b, 0), // 5
      new THREE.Vector3(-a, b, 0), // 6
      new THREE.Vector3(-a, -b, 0), // 7
      // Rectangle 3: XY plane (Z = ±a) - HORIZONTAL ground plane in Z-up
      new THREE.Vector3(b, 0, a), // 8
      new THREE.Vector3(b, 0, -a), // 9
      new THREE.Vector3(-b, 0, a), // 10
      new THREE.Vector3(-b, 0, -a), // 11
    ];

    // 30 edges (each vertex connects to 5 others in pentagonal symmetry)
    const edges = [
      // Vertex 0 connections
      [0, 2],
      [0, 4],
      [0, 6],
      [0, 8],
      [0, 10],
      // Vertex 1 connections
      [1, 3],
      [1, 4],
      [1, 6],
      [1, 9],
      [1, 11],
      // Vertex 2 connections
      [2, 5],
      [2, 7],
      [2, 8],
      [2, 10],
      // Vertex 3 connections
      [3, 5],
      [3, 7],
      [3, 9],
      [3, 11],
      // Vertex 4 connections
      [4, 6],
      [4, 8],
      [4, 9],
      // Vertex 5 connections
      [5, 7],
      [5, 8],
      [5, 9],
      // Vertex 6 connections
      [6, 10],
      [6, 11],
      // Vertex 7 connections
      [7, 10],
      [7, 11],
      // Vertex 8-9 connection
      [8, 9],
      // Vertex 10-11 connection
      [10, 11],
    ];

    // 20 equilateral triangular faces (winding corrected 2026-01-10)
    const faces = [
      // Top cap (5 faces around +Y axis)
      [8, 4, 0],
      [4, 6, 0],
      [6, 10, 0],
      [2, 8, 0],
      [10, 2, 0],
      // Upper belt (5 faces)
      [9, 1, 4],
      [8, 9, 4],
      [4, 1, 6],
      [1, 11, 6],
      [11, 10, 6],
      // Lower belt (5 faces)
      [5, 8, 2],
      [5, 9, 8],
      [7, 2, 10],
      [7, 5, 2],
      [11, 7, 10],
      // Bottom cap (5 faces around -Y axis)
      [1, 9, 3],
      [9, 5, 3],
      [7, 11, 3],
      [5, 7, 3],
      [11, 1, 3],
    ];

    // RT VALIDATION: Check edge quadrance uniformity
    // For normalized icosahedron scaled to halfSize, edge Q = 4a²
    const expectedQ = 4 * a * a;
    const validation = RT.validateEdges(vertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const faceSpread = RT.FaceSpreads.icosahedron(); // S = 4/9 (Wildberger Ch.26)
    MetaLog.rtMetrics({
      V: 12, E: 30, F: 20,
      edgeQ: expectedQ,
      maxError,
      faceSpread,
      faceSpreadFraction: "4/9",
    });

    return { vertices, edges, faces, faceSpread };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOUND POLYHEDRA FOR PRIME PROJECTIONS
  // Single source of truth using base Polyhedra functions
  // Matches Python rt_polyhedra.py for Python/JavaScript parity
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * TruncTet + Tetrahedron compound (16 vertices)
   * Used for 7-gon projections
   *
   * Combines truncated tetrahedron (12v) + tetrahedron (4v)
   * Both at half_size=3 with t=1/3 truncation produces [±1,±1,±3] vertices
   *
   * @param {number} scale - Scale factor (default 1.0, use 3.0 for canonical coords)
   * @param {number} truncation - Truncation parameter (default 1/3)
   * @returns {Object} {vertices, edges, faces, components}
   */
  compoundTruncTetTet: (scale = 3, truncation = 1 / 3) => {
    // Suppress internal component logs — compound logs its own identity
    MetaLog.suppress();
    // Get truncated tetrahedron vertices
    const truncTet = Polyhedra.truncatedTetrahedron(scale, truncation);
    const truncTetVertices = truncTet.vertices;

    // Get tetrahedron vertices at same scale
    const tet = Polyhedra.tetrahedron(scale);
    const tetVertices = tet.vertices;
    MetaLog.unsuppress();

    // Combine vertices: TruncTet (0-11) + Tet (12-15)
    const vertices = [...truncTetVertices, ...tetVertices];

    // Combine edges with offset for tetrahedron indices
    const truncTetEdges = truncTet.edges;
    const tetEdgesOffset = tet.edges.map(([i, j]) => [
      i + truncTetVertices.length,
      j + truncTetVertices.length,
    ]);
    const edges = [...truncTetEdges, ...tetEdgesOffset];

    // Combine faces with offset for tetrahedron indices
    const truncTetFaces = truncTet.faces;
    const tetFacesOffset = tet.faces.map(face =>
      face.map(i => i + truncTetVertices.length)
    );
    const faces = [...truncTetFaces, ...tetFacesOffset];

    return {
      vertices,
      edges,
      faces,
      components: {
        truncatedTetrahedron: {
          vertices: truncTetVertices,
          edges: truncTetEdges,
          faces: truncTetFaces,
          vertexOffset: 0,
        },
        tetrahedron: {
          vertices: tetVertices,
          edges: tet.edges,
          faces: tet.faces,
          vertexOffset: truncTetVertices.length,
        },
      },
      metadata: {
        totalVertices: 16,
        scale: scale,
        truncation: truncation,
        primeProjections: {
          heptagon: {
            spreads: [0, 0.01, 0.14],
            expectedHull: 7,
            verified: "2026-02-07",
          },
        },
      },
    };
  },

  /**
   * TruncTet + Dual Tetrahedron compound (16 vertices, unit-sphere normalized)
   * Used for robust 7-gon projections
   *
   * Key difference from compoundTruncTetTet:
   * - Uses DUAL (even parity) tetrahedron instead of base (odd parity)
   * - All 16 vertices normalized to unit sphere then scaled
   * - This breaks the degeneracy that causes same-parity compound to fail
   *
   * Why dual tet works:
   * - Base tet vertices: (-,-,-), (+,+,-), (+,-,+), (-,+,+) [ODD parity]
   * - Dual tet vertices: (+,+,+), (-,-,+), (-,+,-), (+,-,-) [EVEN parity]
   * - TruncTet is derived from base tet, so same-parity tet shares symmetry planes
   * - Dual tet breaks those shared symmetry planes → robust prime hull counts
   *
   * Unit-sphere normalization ensures:
   * - All vertices equidistant from origin → robust convex hull
   * - Scale-invariant hull counts (no Float32 sensitivity)
   * - Matches the original verified 7-gon pipeline
   *
   * @param {number} scale - Output radius (default 1.0)
   * @param {number} truncation - Truncation parameter (default 1/3)
   * @returns {Object} {vertices, edges, faces, components}
   */
  compoundTruncTetDualTet: (scale = 1, truncation = 1 / 3) => {
    // Suppress internal component logs — compound logs its own identity
    MetaLog.suppress();
    // Get canonical geometries (half_size=3 gives integer-like [±1,±1,±3] coords)
    const truncTet = Polyhedra.truncatedTetrahedron(3, truncation);
    const dualTet = Polyhedra.dualTetrahedron(1);
    MetaLog.unsuppress();

    // Normalize all vertices to unit sphere, then scale to desired radius
    // This ensures both components have equal reach from origin
    const normalizeAndScale = v => v.clone().normalize().multiplyScalar(scale);

    const truncTetVertices = truncTet.vertices.map(normalizeAndScale);
    const dualTetVertices = dualTet.vertices.map(normalizeAndScale);

    // Combine vertices: TruncTet (0-11) + DualTet (12-15)
    const vertices = [...truncTetVertices, ...dualTetVertices];

    // Combine edges with offset for dual tet indices
    const truncTetEdges = truncTet.edges;
    const dualTetEdgesOffset = dualTet.edges.map(([i, j]) => [
      i + truncTetVertices.length,
      j + truncTetVertices.length,
    ]);
    const edges = [...truncTetEdges, ...dualTetEdgesOffset];

    // Combine faces with offset for dual tet indices
    const truncTetFaces = truncTet.faces;
    const dualTetFacesOffset = dualTet.faces.map(face =>
      face.map(i => i + truncTetVertices.length)
    );
    const faces = [...truncTetFaces, ...dualTetFacesOffset];

    return {
      vertices,
      edges,
      faces,
      components: {
        truncatedTetrahedron: {
          vertices: truncTetVertices,
          edges: truncTetEdges,
          faces: truncTetFaces,
          vertexOffset: 0,
        },
        dualTetrahedron: {
          vertices: dualTetVertices,
          edges: dualTet.edges,
          faces: dualTet.faces,
          vertexOffset: truncTetVertices.length,
        },
      },
      metadata: {
        totalVertices: 16,
        scale: scale,
        truncation: truncation,
        normalized: true,
        primeProjections: {
          heptagon: {
            spreads: [0, 0, 0.5],
            expectedHull: 7,
            verified: "2026-02-08",
          },
        },
      },
    };
  },

  /**
   * TruncTet + Icosahedron compound (24 vertices)
   * Used for 11-gon and 13-gon projections
   *
   * Combines truncated tetrahedron (12v) + icosahedron (12v)
   * Icosahedron is scaled to match truncated tetrahedron bounding sphere
   *
   * Why 24 vertices enable prime hulls:
   * - TruncTet (12v) has 3-fold tetrahedral symmetry
   * - Icosahedron (12v) has 5-fold icosahedral symmetry
   * - 3-fold and 5-fold are incommensurate (gcd(3,5)=1)
   * - This symmetry breaking enables prime hull counts (11, 13)
   *
   * @param {number} scale - Scale factor (default 3.0 for canonical coords)
   * @param {number} truncation - Truncation parameter (default 1/3)
   * @returns {Object} {vertices, edges, faces, components}
   */
  compoundTruncTetIcosa: (scale = 3, truncation = 1 / 3) => {
    // Suppress internal component logs — compound logs its own identity
    MetaLog.suppress();
    // Get truncated tetrahedron vertices
    const truncTet = Polyhedra.truncatedTetrahedron(scale, truncation);
    const truncTetVertices = truncTet.vertices;

    // Calculate truncated tetrahedron bounding radius
    // With scale=3 and t=1/3: vertices at [1,1,3] → radius = sqrt(11)
    let truncTetRadius = 0;
    truncTetVertices.forEach(v => {
      const r = v.length();
      if (r > truncTetRadius) truncTetRadius = r;
    });

    // Get icosahedron at unit scale
    // Icosahedron with halfSize=1 has circumradius = 1.0
    // (verified: vertex [0, a, b] has distance sqrt(a² + b²) = 1.0)
    const icosa = Polyhedra.icosahedron(1.0);
    const icosaRadius = 1.0;
    MetaLog.unsuppress();

    // Scale icosahedron to match truncated tetrahedron bounding sphere
    const icosaScale = truncTetRadius / icosaRadius;
    const icosaVertices = icosa.vertices.map(v =>
      v.clone().multiplyScalar(icosaScale)
    );

    // Combine vertices: TruncTet (0-11) + Icosa (12-23)
    const vertices = [...truncTetVertices, ...icosaVertices];

    // Combine edges with offset for icosahedron indices
    const truncTetEdges = truncTet.edges;
    const icosaEdgesOffset = icosa.edges.map(([i, j]) => [
      i + truncTetVertices.length,
      j + truncTetVertices.length,
    ]);
    const edges = [...truncTetEdges, ...icosaEdgesOffset];

    // Combine faces with offset for icosahedron indices
    const truncTetFaces = truncTet.faces;
    const icosaFacesOffset = icosa.faces.map(face =>
      face.map(i => i + truncTetVertices.length)
    );
    const faces = [...truncTetFaces, ...icosaFacesOffset];

    return {
      vertices,
      edges,
      faces,
      components: {
        truncatedTetrahedron: {
          vertices: truncTetVertices,
          edges: truncTetEdges,
          faces: truncTetFaces,
          vertexOffset: 0,
        },
        icosahedron: {
          vertices: icosaVertices,
          edges: icosa.edges,
          faces: icosa.faces,
          vertexOffset: truncTetVertices.length,
        },
      },
      metadata: {
        totalVertices: 24,
        scale: scale,
        truncation: truncation,
        truncTetRadius: truncTetRadius,
        icosaScale: icosaScale,
        primeProjections: {
          hendecagon: {
            spreads: [0, 0.01, 0.1],
            expectedHull: 11,
            verified: "2026-02-07",
          },
          tridecagon: {
            spreads: [0, 0.01, 0.14],
            expectedHull: 13,
            verified: "2026-02-07",
          },
        },
      },
    };
  },

  /**
   * Dual Icosahedron (face dual of dodecahedron)
   * Vertices positioned at dodecahedron face centers
   * Each icosahedron vertex points to center of dodecahedron pentagonal face
   *
   * DRY REFACTOR: Derives from base icosahedron via scale + RT-pure rotation
   * - Scale factor: φ (golden ratio) to align with dodecahedron face centers
   * - RT-pure rotation: -90° Z-axis (spread s=1, cross c=0 - exact integers!)
   * - Transformation: (x,y,z) → (y,-x,z) using only {-1, 0, 1} multiplication
   * - Inherits geodesic subdivision capability from base
   * - Color scheme: Uses reciprocal complementary colors
   *   - Dual solid uses base's geodesic color
   *   - Dual geodesic uses base's solid color
   *   - Perfect visual symmetry when displayed with dodecahedron
   *
   * This represents the GOLD STANDARD for RT: exact integer spread values
   * eliminate ALL transcendental functions - pure algebraic geometry!
   */
  dualIcosahedron: (halfSize = 1, options = {}) => {
    // PurePhi Method 2: High-precision symbolic constant for consistency
    const phi = RT.PurePhi.constants.phi; // φ = (1 + √5)/2 - 15 decimal precision

    // GPU boundary: expand symbolic constant to decimal for arithmetic
    const phiVal = phi.toDecimal();

    // Dodecahedron face centers are at radius φ × halfSize from origin
    // Scale icosahedron to match this radius for face dual alignment
    const dualRadius = phiVal * halfSize;

    MetaLog.identity("Dual Icosahedron", "", {
      construction: "PurePhi Method 2 + RT rotation",
      halfSize,
    });
    MetaLog.construction([
      `Dodecahedron halfSize: ${halfSize.toFixed(3)}`,
      `Dodecahedron inradius (face center): φ·s = ${dualRadius.toFixed(15)}`,
      `[PurePhi] φ = ${phi.toString()} = ${phiVal.toFixed(15)}`,
      `Icosahedron vertex radius: ${dualRadius.toFixed(15)} (matches dodec inradius)`,
      `RT ROTATION: Spread s=1, Cross c=0 (exact integers!)`,
      `Transform: (x,y,z) → (y,-x,z) - pure integer matrix`,
    ]);

    // Get base icosahedron geometry at dual scale
    MetaLog.suppress();
    const base = Polyhedra.icosahedron(dualRadius);
    MetaLog.unsuppress();

    // Apply RT-pure Z-rotation: -90° clockwise
    // Spread s = sin²(-π/2) = 1 (exact integer!)
    // Cross c = cos²(-π/2) = 0 (exact integer!)
    // Transform: (x,y,z) → (y,-x,z) using ONLY multiplication by {-1, 0, 1}
    const vertices = base.vertices.map(v => new THREE.Vector3(v.y, -v.x, v.z));

    // Topology remains identical (rotation preserves face winding)
    const edges = base.edges;
    const faces = base.faces;

    // RT VALIDATION: Check edge quadrance uniformity
    // Calculate expected Q from base icosahedron parameters
    // Use identity φ² = φ + 1 (already expanded to decimal in phiVal)
    const phi_squared = phiVal * phiVal;
    const normFactor = 1 / Math.sqrt(1 + phi_squared);
    const a = dualRadius * normFactor;
    const expectedQ = 4 * a * a;

    const validation = RT.validateEdges(vertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    MetaLog.rtMetrics({ V: 12, E: 30, F: 20, edgeQ: expectedQ, maxError });

    return { vertices, edges, faces };
  },

  /**
   * Geodesic Dual Icosahedron with projection options
   * Derives from base icosahedron via φ-scale + RT-pure rotation, then applies geodesic subdivision
   * Implements reciprocal complementary color scheme (uses base solid color for geodesic)
   *
   * @param {number} halfSize - Base scale (dodecahedron halfSize)
   * @param {number} frequency - Subdivision frequency (1-7)
   * @param {string} projection - Projection mode: "off", "in", "mid", "out"
   * @returns {Object} - {vertices, edges, faces}
   */
  geodesicDualIcosahedron: (
    halfSize = 1,
    frequency = 1,
    projection = "out",
    options = {}
  ) => {
    // PurePhi Method 2: High-precision symbolic constant for consistency
    const phi = RT.PurePhi.constants.phi; // φ = (1 + √5)/2 - 15 decimal precision
    // GPU boundary: expand to decimal for arithmetic
    const dualRadius = phi.toDecimal() * halfSize;

    // Get base geodesic icosahedron (subdivided and projected)
    MetaLog.suppress();
    const base = Polyhedra.geodesicIcosahedron(
      dualRadius,
      frequency,
      projection,
    );
    MetaLog.unsuppress();

    // Apply RT-pure Z-rotation: -90° clockwise
    // Transform: (x,y,z) → (y,-x,z) using ONLY multiplication by {-1, 0, 1}
    const vertices = base.vertices.map(v => new THREE.Vector3(v.y, -v.x, v.z));

    // Topology remains identical (rotation preserves face winding)
    const edges = base.edges;
    const faces = base.faces;

    MetaLog.identity("Geodesic Dual Icosahedron", "", {
      construction: `freq=${frequency}, projection=${projection}, V=${vertices.length}`,
    });

    return { vertices, edges, faces };
  },

  /**
   * RT-PURE GEODESIC SUBDIVISION (Phase 2.7a)
   * Subdivide triangular face into smaller triangles for geodesic domes
   * IMPORTANT: Subdivision happens in ALGEBRAIC SPACE before sphere projection
   *
   * @param {Array} vertices - Original polyhedron vertices
   * @param {Array} faces - Original triangular faces
   * @param {number} frequency - Subdivision frequency (1-6)
   * @returns {Object} - {vertices, edges, faces} for subdivided polyhedron
   */
  subdivideTriangles: (vertices, faces, frequency, options = {}) => {
    if (frequency === 0) {
      // Frequency 0 = base polyhedron (no subdivision)
      const edges = [];
      faces.forEach(([a, b, c]) => {
        edges.push([a, b], [b, c], [c, a]);
      });
      return { vertices, edges, faces };
    }

    // Class I geodesic subdivision (Fuller frequency notation)
    // Frequency = number of equal edge divisions (1 = base polyhedron, 2 = bisected edges, etc.)
    // Each edge divided into 'frequency' segments (not 2^frequency)
    // Each triangular face becomes frequency² smaller triangles
    const divisions = frequency; // Edge segments = frequency (Fuller definition)

    const newVertices = [...vertices]; // Start with original vertices
    const vertexMap = new Map(); // Cache division points to avoid duplicates

    // Helper: Get or create division point along edge
    // t = parameter from 0 to 1 along edge from vi to vj
    const getEdgePoint = (i, j, t) => {
      // Create canonical key (smaller index first, then t value)
      const [i0, j0, t0] = i < j ? [i, j, t] : [j, i, 1 - t];
      const key = `${i0},${j0},${t0.toFixed(6)}`;

      if (vertexMap.has(key)) {
        return vertexMap.get(key);
      }

      const v1 = newVertices[i];
      const v2 = newVertices[j];

      // RT-PURE: Linear interpolation in algebraic space
      // Preserves golden ratio relationships for icosahedron
      const point = new THREE.Vector3(
        v1.x + t * (v2.x - v1.x),
        v1.y + t * (v2.y - v1.y),
        v1.z + t * (v2.z - v1.z)
      );

      const idx = newVertices.length;
      newVertices.push(point);
      vertexMap.set(key, idx);
      return idx;
    };

    const newFaces = [];

    // Subdivide each triangular face using barycentric grid
    faces.forEach(([v0, v1, v2]) => {
      // Create uniform triangular grid on this face
      // Grid points use barycentric coordinates (u, v, w) where u+v+w=1
      // u,v,w are multiples of 1/divisions

      // Build grid of vertex indices
      const grid = [];
      for (let row = 0; row <= divisions; row++) {
        grid[row] = [];
        for (let col = 0; col <= divisions - row; col++) {
          // Barycentric coordinates
          const u = row / divisions; // Weight for v0
          const v = col / divisions; // Weight for v1
          const w = 1 - u - v; // Weight for v2

          if (row === 0 && col === 0) {
            // Corner v0
            grid[row][col] = v0;
          } else if (row === 0 && col === divisions) {
            // Corner v1
            grid[row][col] = v1;
          } else if (row === divisions && col === 0) {
            // Corner v2
            grid[row][col] = v2;
          } else if (row === 0) {
            // Edge v0-v1
            grid[row][col] = getEdgePoint(v0, v1, v);
          } else if (col === 0) {
            // Edge v0-v2
            grid[row][col] = getEdgePoint(v0, v2, u);
          } else if (row + col === divisions) {
            // Edge v1-v2
            grid[row][col] = getEdgePoint(v1, v2, row / divisions);
          } else {
            // Interior point - create using barycentric interpolation
            const key = `${v0},${v1},${v2},${u.toFixed(6)},${v.toFixed(6)}`;

            if (vertexMap.has(key)) {
              grid[row][col] = vertexMap.get(key);
            } else {
              const p0 = newVertices[v0];
              const p1 = newVertices[v1];
              const p2 = newVertices[v2];

              const point = new THREE.Vector3(
                w * p0.x + v * p1.x + u * p2.x,
                w * p0.y + v * p1.y + u * p2.y,
                w * p0.z + v * p1.z + u * p2.z
              );

              const idx = newVertices.length;
              newVertices.push(point);
              vertexMap.set(key, idx);
              grid[row][col] = idx;
            }
          }
        }
      }

      // Create faces from grid
      // ✅ RESOLVED (2026-01-11): All base polyhedra winding corrected - geodesics automatically inherit correct winding
      // Geodesic faces now use consistent CCW winding (right-hand rule) for outward normals
      // THREE.FrontSide backface culling now enabled across all materials
      for (let row = 0; row < divisions; row++) {
        for (let col = 0; col < divisions - row; col++) {
          // Upward-pointing triangle
          const a = grid[row][col];
          const b = grid[row][col + 1];
          const c = grid[row + 1][col];
          newFaces.push([a, b, c]);

          // Downward-pointing triangle (if not at edge)
          if (col < divisions - row - 1) {
            const d = grid[row][col + 1];
            const e = grid[row + 1][col + 1];
            const f = grid[row + 1][col];
            newFaces.push([d, e, f]);
          }
        }
      }
    });

    // Generate edges from faces
    const edgeSet = new Set();
    newFaces.forEach(([a, b, c]) => {
      const e1 = a < b ? `${a},${b}` : `${b},${a}`;
      const e2 = b < c ? `${b},${c}` : `${c},${b}`;
      const e3 = c < a ? `${c},${a}` : `${a},${c}`;
      edgeSet.add(e1);
      edgeSet.add(e2);
      edgeSet.add(e3);
    });

    const newEdges = Array.from(edgeSet).map(e => e.split(",").map(Number));

    MetaLog.log(MetaLog.SUMMARY,
      `  Geodesic subdivision: freq=${frequency}, divisions=${divisions}, faces=${newFaces.length} (expected: ${faces.length * divisions * divisions})`
    );

    return { vertices: newVertices, edges: newEdges, faces: newFaces };
  },

  /**
   * Geodesic Icosahedron (Phase 2.7a)
   * RT-pure implementation: Subdivision in algebraic space, then sphere projection
   *
   * @param {number} halfSize - Radius of geodesic sphere
   * @param {number} frequency - Subdivision frequency (1-6)
   * @returns {Object} - {vertices, edges, faces}
   */
  geodesicIcosahedron: (halfSize = 1, frequency = 1, projection = "out", options = {}) => {
    // Phase 2.9: RT-Pure Geodesic with InSphere/MidSphere/OutSphere options
    // Fuller frequency notation: 1 = base polyhedron (undivided edges)
    //                            2 = each edge bisected (2 segments)
    //                            3 = each edge trisected (3 segments), etc.

    // 1. Start with pure algebraic icosahedron
    MetaLog.suppress();
    const base = Polyhedra.icosahedron(halfSize);
    MetaLog.unsuppress();

    MetaLog.identity("Geodesic Icosahedron", "", {
      construction: `freq=${frequency}, projection=${projection}`,
    });
    MetaLog.log(MetaLog.SUMMARY,
      `  Base vertices: ${base.vertices.length}, faces: ${base.faces.length}`
    );

    // Frequency 1 = return base icosahedron (no subdivision, no sphere projection)
    if (frequency === 1) {
      MetaLog.log(MetaLog.SUMMARY, `  Frequency 1: Returning base icosahedron (20 faces, undivided edges)`);
      return base;
    }

    // 2. Subdivide in algebraic space (preserves golden ratio relationships)
    const subdivided = Polyhedra.subdivideTriangles(
      base.vertices,
      base.faces,
      frequency
    );

    MetaLog.log(MetaLog.SUMMARY,
      `  Subdivided vertices: ${subdivided.vertices.length}, faces: ${subdivided.faces.length}`
    );

    // Phase 2.9: RT-PURE Projection options (Off, InSphere, MidSphere, OutSphere)
    // NO TRIG! Pure quadrance relationships using golden ratio φ
    let Q_target;

    if (projection === "off") {
      // No sphere projection - return flat subdivided mesh
      MetaLog.log(MetaLog.SUMMARY, `  Projection: OFF (flat subdivided mesh)`);
      return {
        vertices: subdivided.vertices,
        edges: subdivided.edges,
        faces: subdivided.faces,
      };
    } else if (projection === "in") {
      // RT-PURE + PUREPHI InSphere: Perpendicular distance to face planes
      // Face normal is (1,1,1)/√3, distance = (a+b)/√3 where a+b = φ²/√(φ+2)
      // Q_in = [(a+b)/√3]² = φ⁴/[3(φ+2)] = (3φ+2)/[3(φ+2)] using φ⁴=3φ+2

      // PurePhi symbolic algebra - no premature expansion!
      const phi = RT.PurePhi.constants.phi; // (1 + √5)/2
      const two = RT.PurePhi.constants.one.scale(2); // 2

      // Numerator: 3φ + 2 (exact symbolic, equivalent to φ⁴ using φ⁴ = 3φ + 2)
      const threePhi = phi.scale(3);
      const numerator = threePhi.add(two); // (3φ + 2) symbolic

      // Denominator: 3(φ + 2) (exact symbolic)
      const phiPlusTwo = phi.add(two);
      const denominator = phiPlusTwo.scale(3); // 3(φ + 2) symbolic

      // Expand only at division
      const ratio_in_sq = numerator.toDecimal() / denominator.toDecimal();
      Q_target = halfSize * halfSize * ratio_in_sq;

      MetaLog.spheres({ projection: "InSphere (RT-pure + PurePhi)", targetQ: Q_target, targetRadius: Math.sqrt(Q_target) });
      MetaLog.construction([
        `[PurePhi] Numerator: ${numerator.toString()} = ${numerator.toDecimal().toFixed(15)}`,
        `[PurePhi] Denominator: ${denominator.toString()} = ${denominator.toDecimal().toFixed(15)}`,
        `RT: Q_in/Q_out = (3φ+2)/[3(φ+2)] = ${ratio_in_sq.toFixed(15)}`,
      ]);
    } else if (projection === "mid") {
      // RT-PURE + PUREPHI MidSphere: Distance to edge midpoints
      // For icosahedron: Q_mid = Q_out · φ²/(φ+2) = Q_out · (φ+1)/(φ+2)

      // PurePhi symbolic algebra - uses exact identity!
      const phi = RT.PurePhi.constants.phi; // (1 + √5)/2
      const phiSq = RT.PurePhi.constants.phiSq; // (3 + √5)/2 = φ² (EXACT via identity!)
      const two = RT.PurePhi.constants.one.scale(2);

      // Numerator: φ² = φ + 1 (exact identity, not multiplication!)
      // Denominator: φ + 2
      const phiPlusTwo = phi.add(two);

      // Expand only at division
      const ratio_mid_sq = phiSq.toDecimal() / phiPlusTwo.toDecimal();
      Q_target = halfSize * halfSize * ratio_mid_sq;

      MetaLog.spheres({ projection: "MidSphere (RT-pure + PurePhi)", targetQ: Q_target, targetRadius: Math.sqrt(Q_target) });
      MetaLog.construction([
        `[PurePhi] φ² = ${phiSq.toString()} = ${phiSq.toDecimal().toFixed(15)} (identity: φ + 1)`,
        `[PurePhi] φ + 2 = ${phiPlusTwo.toString()} = ${phiPlusTwo.toDecimal().toFixed(15)}`,
        `RT: Q_mid/Q_out = φ²/(φ+2) = (φ+1)/(φ+2) = ${ratio_mid_sq.toFixed(15)}`,
      ]);
    } else if (projection === "out") {
      // OutSphere: Through vertices (Fuller's true geodesic)
      Q_target = halfSize * halfSize;
      MetaLog.spheres({ projection: "OutSphere (Fuller geodesic)", targetQ: Q_target, targetRadius: Math.sqrt(Q_target) });
    }

    const r_target = Math.sqrt(Q_target);
    MetaLog.log(MetaLog.SUMMARY,
      `  Target quadrance: Q = ${Q_target.toFixed(6)}, r = ${r_target.toFixed(6)}`
    );

    // 3. Project to sphere - ONLY NOW do we normalize
    const projected = subdivided.vertices.map(v => {
      const normalized = v.clone().normalize();
      return normalized.multiplyScalar(r_target);
    });

    // 4. Validate edge quadrance uniformity
    const sampleQ = RT.quadrance(
      projected[subdivided.edges[0][0]],
      projected[subdivided.edges[0][1]]
    );
    const validation = RT.validateEdges(projected, subdivided.edges, sampleQ);
    // Use reduce instead of spread operator to avoid stack overflow with large arrays
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const avgQ =
      validation.reduce((sum, v) => sum + v.Q, 0) / validation.length;

    MetaLog.rtMetrics({ edgeQ: avgQ, maxError });
    MetaLog.log(MetaLog.DETAILED, `  RT PURITY: Normalization deferred until final step`);

    return {
      vertices: projected,
      edges: subdivided.edges,
      faces: subdivided.faces,
    };
  },

  /**
   * Geodesic Tetrahedron (Phase 2.7c)
   * RT-pure implementation: Subdivision in algebraic space, then sphere projection
   * Simplest geodesic case - excellent for learning subdivision algorithms
   *
   * @param {number} halfSize - Radius of geodesic sphere
   * @param {number} frequency - Subdivision frequency (1-6)
   * @returns {Object} - {vertices, edges, faces}
   */
  geodesicTetrahedron: (halfSize = 1, frequency = 1, projection = "out", options = {}) => {
    // Phase 2.9: RT-Pure Geodesic with InSphere/MidSphere/OutSphere options
    // Fuller frequency notation: 1 = base polyhedron (undivided edges)
    //                            2 = each edge bisected (2 segments)
    //                            3 = each edge trisected (3 segments), etc.

    // 1. Start with pure algebraic tetrahedron
    MetaLog.suppress();
    const base = Polyhedra.tetrahedron(halfSize);
    MetaLog.unsuppress();

    MetaLog.identity("Geodesic Tetrahedron", "", {
      construction: `freq=${frequency}, projection=${projection}`,
    });
    MetaLog.log(MetaLog.SUMMARY,
      `  Base vertices: ${base.vertices.length}, faces: ${base.faces.length}`
    );

    // Frequency 1 = return base tetrahedron (no subdivision, no sphere projection)
    if (frequency === 1) {
      MetaLog.log(MetaLog.SUMMARY, `  Frequency 1: Returning base tetrahedron (4 faces, undivided edges)`);
      return base;
    }

    // 2. Subdivide in algebraic space
    const subdivided = Polyhedra.subdivideTriangles(
      base.vertices,
      base.faces,
      frequency
    );

    MetaLog.log(MetaLog.SUMMARY,
      `  Subdivided vertices: ${subdivided.vertices.length}, faces: ${subdivided.faces.length}`
    );

    // 3. Projection options (Phase 2.9)
    let finalVertices;
    let Q_target;

    if (projection === "off") {
      // No projection - return flat subdivided mesh
      MetaLog.log(MetaLog.SUMMARY, `  Projection: OFF (flat subdivided faces)`);
      return {
        vertices: subdivided.vertices,
        edges: subdivided.edges,
        faces: subdivided.faces,
      };
    } else if (projection === "in") {
      // InSphere: tangent to face centers, Q = s²/3
      Q_target = (halfSize * halfSize) / 3;
      MetaLog.spheres({ projection: "InSphere", targetQ: Q_target, targetRadius: Math.sqrt(Q_target) });
    } else if (projection === "mid") {
      // MidSphere: tangent to edge centers, Q = s²
      Q_target = halfSize * halfSize;
      MetaLog.spheres({ projection: "MidSphere", targetQ: Q_target, targetRadius: Math.sqrt(Q_target) });
    } else if (projection === "out") {
      // OutSphere: through vertices, Q = 3s² (Fuller's geodesic)
      Q_target = 3 * halfSize * halfSize;
      MetaLog.spheres({ projection: "OutSphere (Fuller geodesic)", targetQ: Q_target, targetRadius: Math.sqrt(Q_target) });
    }

    // Project to target sphere
    const r_target = Math.sqrt(Q_target);
    finalVertices = subdivided.vertices.map(v => {
      const normalized = v.clone().normalize();
      return normalized.multiplyScalar(r_target);
    });

    // 4. Validate edge quadrance uniformity
    const sampleQ = RT.quadrance(
      finalVertices[subdivided.edges[0][0]],
      finalVertices[subdivided.edges[0][1]]
    );
    const validation = RT.validateEdges(
      finalVertices,
      subdivided.edges,
      sampleQ
    );
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const avgQ =
      validation.reduce((sum, v) => sum + v.Q, 0) / validation.length;

    MetaLog.rtMetrics({ edgeQ: avgQ, maxError });
    MetaLog.log(MetaLog.DETAILED, `  RT PURITY: Quadrance calculated algebraically, √ only at final projection`);

    return {
      vertices: finalVertices,
      edges: subdivided.edges,
      faces: subdivided.faces,
    };
  },

  /**
   * Geodesic Octahedron (Phase 2.7b)
   * RT-pure implementation: Subdivision in algebraic space, then sphere projection
   * 8 triangular faces - simpler than icosahedron, more complex than tetrahedron
   *
   * @param {number} halfSize - Radius of geodesic sphere
   * @param {number} frequency - Subdivision frequency (1-6)
   * @returns {Object} - {vertices, edges, faces}
   */
  geodesicOctahedron: (halfSize = 1, frequency = 1, projection = "out", options = {}) => {
    // Phase 2.9: RT-Pure Geodesic with InSphere/MidSphere/OutSphere options
    // Fuller frequency notation: 1 = base polyhedron (undivided edges)
    //                            2 = each edge bisected (2 segments)
    //                            3 = each edge trisected (3 segments), etc.

    // 1. Start with pure algebraic octahedron
    MetaLog.suppress();
    const base = Polyhedra.octahedron(halfSize);
    MetaLog.unsuppress();

    MetaLog.identity("Geodesic Octahedron", "", {
      construction: `freq=${frequency}, projection=${projection}`,
    });
    MetaLog.log(MetaLog.SUMMARY,
      `  Base vertices: ${base.vertices.length}, faces: ${base.faces.length}`
    );

    // Frequency 1 = return base octahedron (no subdivision, no sphere projection)
    if (frequency === 1) {
      MetaLog.log(MetaLog.SUMMARY, `  Frequency 1: Returning base octahedron (8 faces, undivided edges)`);
      return base;
    }

    // 2. Subdivide in algebraic space
    const subdivided = Polyhedra.subdivideTriangles(
      base.vertices,
      base.faces,
      frequency
    );

    MetaLog.log(MetaLog.SUMMARY,
      `  Subdivided vertices: ${subdivided.vertices.length}, faces: ${subdivided.faces.length}`
    );

    // 3. Projection options (Phase 2.9)
    let finalVertices;
    let Q_target;

    if (projection === "off") {
      MetaLog.log(MetaLog.SUMMARY, `  Projection: OFF (flat subdivided faces)`);
      return {
        vertices: subdivided.vertices,
        edges: subdivided.edges,
        faces: subdivided.faces,
      };
    } else if (projection === "in") {
      // InSphere: tangent to face centers, Q = s²/3
      Q_target = (halfSize * halfSize) / 3;
      MetaLog.spheres({ projection: "InSphere", targetQ: Q_target, targetRadius: Math.sqrt(Q_target) });
    } else if (projection === "mid") {
      // MidSphere: tangent to edge centers, Q = s²/2
      Q_target = (halfSize * halfSize) / 2;
      MetaLog.spheres({ projection: "MidSphere", targetQ: Q_target, targetRadius: Math.sqrt(Q_target) });
    } else if (projection === "out") {
      // OutSphere: through vertices, Q = s² (Fuller's geodesic)
      Q_target = halfSize * halfSize;
      MetaLog.spheres({ projection: "OutSphere (Fuller geodesic)", targetQ: Q_target, targetRadius: Math.sqrt(Q_target) });
    }

    // Project to target sphere
    const r_target = Math.sqrt(Q_target);
    finalVertices = subdivided.vertices.map(v => {
      const normalized = v.clone().normalize();
      return normalized.multiplyScalar(r_target);
    });

    // 4. Validate edge quadrance uniformity
    const sampleQ = RT.quadrance(
      finalVertices[subdivided.edges[0][0]],
      finalVertices[subdivided.edges[0][1]]
    );
    const validation = RT.validateEdges(
      finalVertices,
      subdivided.edges,
      sampleQ
    );
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const avgQ =
      validation.reduce((sum, v) => sum + v.Q, 0) / validation.length;

    MetaLog.rtMetrics({ edgeQ: avgQ, maxError });
    MetaLog.log(MetaLog.DETAILED, `  RT PURITY: Quadrance calculated algebraically, √ only at final projection`);

    return {
      vertices: finalVertices,
      edges: subdivided.edges,
      faces: subdivided.faces,
    };
  },

  /**
   * Dodecahedron (12 pentagonal faces, 20 vertices, 30 edges)
   * RT construction: "hip roof pup tent" on each cube face
   * Following Section19.js hip roof solver pattern - quadrance-based
   *
   * Each pentagon has TWO vertices SHARED with cube corners (the "shoulders")
   * The line between shoulders LIES ON the cube edge
   * Three additional vertices complete the pentagon (forming the "hip roof")
   *
   * Standard construction uses (0, ±1, ±φ) permutations where φ = golden ratio
   * RT approach: derive from quadrance relationships
   *
   * Schläfli: {5,3}
   */
  dodecahedron: (halfSize = 1, options = {}) => {
    const s = halfSize;

    // RATIONAL TRIGONOMETRY: Defer sqrt(5) expansion following Wildberger principles
    // For dodecahedron: φ² = φ + 1 → φ² - φ - 1 = 0
    // Quadrance relationship: φ² - φ - 1 = 0 means Q_phi/Q_1 = (φ²)/1
    //
    // Use RT.Phi library for symbolic golden ratio operations
    // φ = (1 + √5)/2, and 1/φ = φ - 1 (algebraic identity!)

    // PurePhi Method 2: High-precision symbolic constants
    const phi = RT.PurePhi.constants.phi; // φ = (1 + √5)/2 - 15 decimal precision
    const invPhi = RT.PurePhi.constants.invPhi; // 1/φ = φ - 1 (algebraic identity!)

    MetaLog.identity("Dodecahedron", "{5,3}", {
      construction: "PurePhi Method 2 (hip roof on cube)",
      halfSize,
    });
    MetaLog.construction([
      `Cube half-size: ${s.toFixed(3)}`,
      `[PurePhi] φ = ${phi.toString()} = ${phi.toDecimal().toFixed(15)}`,
      `[PurePhi] 1/φ = ${invPhi.toString()} = ${invPhi.toDecimal().toFixed(15)} (algebraic identity)`,
    ]);

    // GPU boundary: expand symbolic constants to decimals for THREE.Vector3 creation
    const phiVal = phi.toDecimal();
    const invPhiVal = invPhi.toDecimal();

    // 20 vertices: 8 at (±1, ±1, ±1) + 12 at permutations of (0, ±1/φ, ±φ)
    // Scaled by s to fit cube of size ±s
    const vertices = [
      // 8 cube corner vertices (±s, ±s, ±s)
      new THREE.Vector3(s, s, s), // 0: (+,+,+)
      new THREE.Vector3(s, s, -s), // 1: (+,+,-)
      new THREE.Vector3(s, -s, s), // 2: (+,-,+)
      new THREE.Vector3(s, -s, -s), // 3: (+,-,-)
      new THREE.Vector3(-s, s, s), // 4: (-,+,+)
      new THREE.Vector3(-s, s, -s), // 5: (-,+,-)
      new THREE.Vector3(-s, -s, s), // 6: (-,-,+)
      new THREE.Vector3(-s, -s, -s), // 7: (-,-,-)

      // 12 additional vertices at (0, ±invPhi, ±phi) * s and cyclic permutations
      // These form the "ridge" vertices of the hip roof pentagons

      // Permutation 1: (0, ±1/φ, ±φ) * s
      new THREE.Vector3(0, s * invPhiVal, s * phiVal), // 8
      new THREE.Vector3(0, s * invPhiVal, -s * phiVal), // 9
      new THREE.Vector3(0, -s * invPhiVal, s * phiVal), // 10
      new THREE.Vector3(0, -s * invPhiVal, -s * phiVal), // 11

      // Permutation 2: (±1/φ, ±φ, 0) * s
      new THREE.Vector3(s * invPhiVal, s * phiVal, 0), // 12
      new THREE.Vector3(s * invPhiVal, -s * phiVal, 0), // 13
      new THREE.Vector3(-s * invPhiVal, s * phiVal, 0), // 14
      new THREE.Vector3(-s * invPhiVal, -s * phiVal, 0), // 15

      // Permutation 3: (±φ, 0, ±1/φ) * s
      new THREE.Vector3(s * phiVal, 0, s * invPhiVal), // 16
      new THREE.Vector3(s * phiVal, 0, -s * invPhiVal), // 17
      new THREE.Vector3(-s * phiVal, 0, s * invPhiVal), // 18
      new THREE.Vector3(-s * phiVal, 0, -s * invPhiVal), // 19
    ];

    // 30 edges - standard dodecahedron topology
    // Each cube corner connects to 3 phi-vertices
    // Cube corners: 0-7, Phi vertices: 8-19
    const edges = [
      // Edges from cube corner 0 (+,+,+)
      [0, 8],
      [0, 12],
      [0, 16],
      // Edges from cube corner 1 (+,+,-)
      [1, 9],
      [1, 12],
      [1, 17],
      // Edges from cube corner 2 (+,-,+)
      [2, 10],
      [2, 13],
      [2, 16],
      // Edges from cube corner 3 (+,-,-)
      [3, 11],
      [3, 13],
      [3, 17],
      // Edges from cube corner 4 (-,+,+)
      [4, 8],
      [4, 14],
      [4, 18],
      // Edges from cube corner 5 (-,+,-)
      [5, 9],
      [5, 14],
      [5, 19],
      // Edges from cube corner 6 (-,-,+)
      [6, 10],
      [6, 15],
      [6, 18],
      // Edges from cube corner 7 (-,-,-)
      [7, 11],
      [7, 15],
      [7, 19],

      // Edges between phi-vertices (6 edges, completing the 30 total)
      // These connect phi-vertices within the same permutation group
      [8, 10], // (0, +invPhi, +phi) to (0, -invPhi, +phi) - YZ group
      [9, 11], // (0, +invPhi, -phi) to (0, -invPhi, -phi) - YZ group
      [12, 14], // (+invPhi, +phi, 0) to (-invPhi, +phi, 0) - XY group
      [13, 15], // (+invPhi, -phi, 0) to (-invPhi, -phi, 0) - XY group
      [16, 17], // (+phi, 0, +invPhi) to (+phi, 0, -invPhi) - XZ group
      [18, 19], // (-phi, 0, +invPhi) to (-phi, 0, -invPhi) - XZ group
    ];

    // 12 pentagonal faces - standard dodecahedron topology (winding corrected 2026-01-10)
    // Vertices: 0-7 (cube), 8-11 (YZ permutation), 12-15 (XY permutation), 16-19 (XZ permutation)
    // Each face verified to follow edge connectivity
    const faces = [
      // Three faces meeting at vertex 0 (+,+,+) - REVERSED
      [12, 14, 4, 8, 0], // was [0, 8, 4, 14, 12]
      [16, 17, 1, 12, 0], // was [0, 12, 1, 17, 16]
      [8, 10, 2, 16, 0], // was [0, 16, 2, 10, 8]

      // Three faces meeting at vertex 7 (-,-,-) - CORRECT (no change)
      [7, 11, 3, 13, 15], // 7→11→3→13→15→7
      [7, 15, 6, 18, 19], // 7→15→6→18→19→7
      [7, 19, 5, 9, 11], // 7→19→5→9→11→7

      // Six remaining faces (belt) - REVERSED
      [9, 5, 14, 12, 1], // was [1, 12, 14, 5, 9]
      [17, 3, 11, 9, 1], // was [1, 9, 11, 3, 17]
      [13, 3, 17, 16, 2], // was [2, 16, 17, 3, 13]
      [10, 6, 15, 13, 2], // was [2, 13, 15, 6, 10]
      [18, 6, 10, 8, 4], // was [4, 8, 10, 6, 18]
      [14, 5, 19, 18, 4], // was [4, 18, 19, 5, 14]
    ];

    // RT VALIDATION: Check edge quadrance uniformity
    // Sample first edge to get actual quadrance, then validate all edges match
    const sampleQ = RT.quadrance(vertices[edges[0][0]], vertices[edges[0][1]]);
    const validation = RT.validateEdges(vertices, edges, sampleQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const faceSpread = RT.FaceSpreads.dodecahedron(); // S = 4/5 (Wildberger Ch.26)
    MetaLog.rtMetrics({
      V: 20, E: 30, F: 12,
      edgeQ: sampleQ,
      maxError,
      faceSpread,
      faceSpreadFraction: "4/5",
    });

    return { vertices, edges, faces, faceSpread };
  },

  /**
   * Rhombic Dodecahedron - Dual of Cuboctahedron (Vector Equilibrium)
   * 14 vertices (at cuboctahedron face centers)
   * 24 edges (connecting adjacent face centers)
   * 12 rhombic faces (corresponding to cuboctahedron vertices)
   *
   * RATIONAL TRIGONOMETRY: Defer √2 and √3 expansion following Wildberger principles
   * Vertices derived from cuboctahedron face centers (6 squares + 8 triangles)
   *
   * DUAL RELATIONSHIP:
   * - Cuboctahedron 14 faces → Rhombic dodec 14 vertices
   * - Cuboctahedron 12 vertices → Rhombic dodec 12 faces
   * - This ensures coplanar rhombic faces (no saddle distortion)
   */
  rhombicDodecahedron: (halfSize = 1, options = {}) => {
    const s = halfSize;

    // RT-PURE + PureRadicals: Use cached √2 for consistency
    const sqrt2 = RT.PureRadicals.sqrt2();
    const t = s / sqrt2; // Cuboctahedron vertex distance: s/√2
    const u = t / 2; // Rhombic dodec octant vertex distance: (s/√2)/2 = s/(2√2)

    MetaLog.identity("Rhombic Dodecahedron", "", {
      construction: "Dual of cuboctahedron (PureRadicals √2)",
      halfSize,
    });
    MetaLog.construction([
      `√2 = ${sqrt2.toFixed(6)} (cached, PureRadicals)`,
      `Cuboctahedron vertex distance: t = s/√2 = ${t.toFixed(6)}`,
      `Rhombic dodec octant vertices: u = t/2 = s/(2√2) = ${u.toFixed(6)}`,
    ]);

    // 14 vertices positioned to create planar rhombic faces
    const vertices = [
      // 6 vertices at SQUARE face centers (on coordinate axes) - degree 4
      // These are at distance t from origin, matching cuboctahedron square face centers
      new THREE.Vector3(t, 0, 0), // 0: +X square (degree 4)
      new THREE.Vector3(-t, 0, 0), // 1: -X square (degree 4)
      new THREE.Vector3(0, t, 0), // 2: +Y square (degree 4)
      new THREE.Vector3(0, -t, 0), // 3: -Y square (degree 4)
      new THREE.Vector3(0, 0, t), // 4: +Z square (degree 4)
      new THREE.Vector3(0, 0, -t), // 5: -Z square (degree 4)

      // 8 vertices at body diagonals (one per octant) - degree 3
      // CRITICAL: NOT at triangle centroids (2t/3), but at t/2 to ensure planar rhombic faces
      // This is the proper geometric dual relationship
      new THREE.Vector3(u, u, u), // 6: (+,+,+) octant (degree 3)
      new THREE.Vector3(u, u, -u), // 7: (+,+,-) octant (degree 3)
      new THREE.Vector3(u, -u, u), // 8: (+,-,+) octant (degree 3)
      new THREE.Vector3(u, -u, -u), // 9: (+,-,-) octant (degree 3)
      new THREE.Vector3(-u, u, u), // 10: (-,+,+) octant (degree 3)
      new THREE.Vector3(-u, u, -u), // 11: (-,+,-) octant (degree 3)
      new THREE.Vector3(-u, -u, u), // 12: (-,-,+) octant (degree 3)
      new THREE.Vector3(-u, -u, -u), // 13: (-,-,-) octant (degree 3)
    ];

    // 24 edges connecting adjacent face centers
    // Each square face center connects to 4 triangular face centers in same quadrant
    const edges = [
      // From +X square (0) to 4 adjacent triangles
      [0, 6],
      [0, 7],
      [0, 8],
      [0, 9],
      // From -X square (1) to 4 adjacent triangles
      [1, 10],
      [1, 11],
      [1, 12],
      [1, 13],
      // From +Y square (2) to 4 adjacent triangles
      [2, 6],
      [2, 7],
      [2, 10],
      [2, 11],
      // From -Y square (3) to 4 adjacent triangles
      [3, 8],
      [3, 9],
      [3, 12],
      [3, 13],
      // From +Z square (4) to 4 adjacent triangles
      [4, 6],
      [4, 8],
      [4, 10],
      [4, 12],
      // From -Z square (5) to 4 adjacent triangles
      [5, 7],
      [5, 9],
      [5, 11],
      [5, 13],
    ];

    // 12 rhombic faces (one per cuboctahedron vertex)
    // Each rhombus connects 2 square centers to 2 triangular centers
    // Proper cyclic winding order ensures coplanarity (winding corrected 2026-01-11)
    const faces = [
      // Rhombi corresponding to cuboctahedron XY plane vertices (indices 0-3)
      [7, 2, 6, 0], // Rhombus at cuboctahedron vertex 0 ( t, t, 0) - REVERSED (was [0, 6, 2, 7])
      [0, 8, 3, 9], // Rhombus at cuboctahedron vertex 1 ( t,-t, 0) - CORRECT
      [1, 10, 2, 11], // Rhombus at cuboctahedron vertex 2 (-t, t, 0) - CORRECT
      [13, 3, 12, 1], // Rhombus at cuboctahedron vertex 3 (-t,-t, 0) - REVERSED (was [1, 12, 3, 13])

      // Rhombi corresponding to cuboctahedron XZ plane vertices (indices 4-7)
      [0, 6, 4, 8], // Rhombus at cuboctahedron vertex 4 ( t, 0, t) - CORRECT
      [9, 5, 7, 0], // Rhombus at cuboctahedron vertex 5 ( t, 0,-t) - REVERSED (was [0, 7, 5, 9])
      [12, 4, 10, 1], // Rhombus at cuboctahedron vertex 6 (-t, 0, t) - REVERSED (was [1, 10, 4, 12])
      [1, 11, 5, 13], // Rhombus at cuboctahedron vertex 7 (-t, 0,-t) - CORRECT

      // Rhombi corresponding to cuboctahedron YZ plane vertices (indices 8-11)
      [10, 4, 6, 2], // Rhombus at cuboctahedron vertex 8 ( 0, t, t) - REVERSED (was [2, 6, 4, 10])
      [2, 7, 5, 11], // Rhombus at cuboctahedron vertex 9 ( 0, t,-t) - CORRECT
      [3, 8, 4, 12], // Rhombus at cuboctahedron vertex 10 ( 0,-t, t) - CORRECT
      [13, 5, 9, 3], // Rhombus at cuboctahedron vertex 11 ( 0,-t,-t) - REVERSED (was [3, 9, 5, 13])
    ];

    // RT VALIDATION: All edges have uniform quadrance
    // All 24 edges connect a square center to an adjacent triangle center
    // Example: (t,0,0) to (u,u,u) where u = t/2 (CORRECT for planar rhombic faces!)
    // Q = (t-u)² + (0-u)² + (0-u)² = (t/2)² + (t/2)² + (t/2)² = 3t²/4 = 3s²/8
    const expectedQ = (3 * t * t) / 4; // All edges have quadrance = 3t²/4 = 3s²/8
    const validation = RT.validateEdges(vertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    MetaLog.rtMetrics({ V: 14, E: 24, F: 12, edgeQ: expectedQ, maxError });

    return { vertices, edges, faces };
  },

  /**
   * Cuboctahedron (Vector Equilibrium in Fuller's terminology)
   * 12 vertices at edge midpoints of cube/octahedron
   * 14 faces: 8 triangular + 6 square
   * 24 edges (all equal length)
   *
   * RATIONAL TRIGONOMETRY: Defer √2 expansion following Wildberger principles
   * Vertices at (±1, ±1, 0), (±1, 0, ±1), (0, ±1, ±1) scaled by s/√2
   *
   * The cuboctahedron is self-dual with the rhombic dodecahedron:
   * - Cuboctahedron vertices → Rhombic dodec face centers
   * - Cuboctahedron faces → Rhombic dodec vertices
   */
  cuboctahedron: (halfSize = 1, options = {}) => {
    const s = halfSize;

    // RT-PURE + PureRadicals: Use cached √2 for consistency
    const sqrt2 = RT.PureRadicals.sqrt2();
    const t = s / sqrt2; // Edge midpoint distance from origin: s/√2

    MetaLog.identity("Cuboctahedron", "", {
      construction: "Vector Equilibrium (PureRadicals √2)",
      halfSize,
    });
    MetaLog.construction([
      `√2 = ${sqrt2.toFixed(6)} (cached, PureRadicals)`,
      `Vertex distance from origin: s/√2 = ${t.toFixed(6)} (rationalized!)`,
    ]);

    // 12 vertices at edge midpoints of cube (alternating coordinates)
    // Pattern: two coords ±t, one coord 0 (all permutations)
    const vertices = [
      // XY plane (Z = 0) - 4 vertices
      new THREE.Vector3(t, t, 0), // 0
      new THREE.Vector3(t, -t, 0), // 1
      new THREE.Vector3(-t, t, 0), // 2
      new THREE.Vector3(-t, -t, 0), // 3
      // XZ plane (Y = 0) - 4 vertices
      new THREE.Vector3(t, 0, t), // 4
      new THREE.Vector3(t, 0, -t), // 5
      new THREE.Vector3(-t, 0, t), // 6
      new THREE.Vector3(-t, 0, -t), // 7
      // YZ plane (X = 0) - 4 vertices
      new THREE.Vector3(0, t, t), // 8
      new THREE.Vector3(0, t, -t), // 9
      new THREE.Vector3(0, -t, t), // 10
      new THREE.Vector3(0, -t, -t), // 11
    ];

    // 24 edges (all equal length) - derived from face perimeters
    const edges = [
      // Edges from XY plane vertices
      [0, 4],
      [0, 5],
      [0, 8],
      [0, 9], // From vertex 0
      [1, 4],
      [1, 5],
      [1, 10],
      [1, 11], // From vertex 1
      [2, 6],
      [2, 7],
      [2, 8],
      [2, 9], // From vertex 2
      [3, 6],
      [3, 7],
      [3, 10],
      [3, 11], // From vertex 3
      // Edges between XZ and YZ plane vertices
      [4, 8],
      [4, 10], // From vertex 4
      [5, 9],
      [5, 11], // From vertex 5
      [6, 8],
      [6, 10], // From vertex 6
      [7, 9],
      [7, 11], // From vertex 7
    ];

    // 14 faces: 8 triangular + 6 square (winding corrected 2026-01-11)
    const faces = [
      // 6 square faces (corresponding to cube faces)
      [0, 4, 1, 5], // +X face (x > 0) - CORRECT
      [7, 3, 6, 2], // -X face (x < 0) - REVERSED (was [2, 6, 3, 7])
      [9, 2, 8, 0], // +Y face (y > 0) - REVERSED (was [0, 8, 2, 9])
      [1, 10, 3, 11], // -Y face (y < 0) - CORRECT
      [4, 8, 6, 10], // +Z face (z > 0) - CORRECT
      [11, 7, 9, 5], // -Z face (z < 0) - REVERSED (was [5, 9, 7, 11])

      // 8 triangular faces (corresponding to octahedron faces, one per octant)
      [8, 4, 0], // (+,+,+) octant - REVERSED (was [0, 4, 8])
      [0, 5, 9], // (+,+,-) octant - CORRECT
      [1, 4, 10], // (+,-,+) octant - CORRECT
      [11, 5, 1], // (+,-,-) octant - REVERSED (was [1, 5, 11])
      [2, 6, 8], // (-,+,+) octant - CORRECT
      [9, 7, 2], // (-,+,-) octant - REVERSED (was [2, 7, 9])
      [10, 6, 3], // (-,-,+) octant - REVERSED (was [3, 6, 10])
      [3, 7, 11], // (-,-,-) octant - CORRECT
    ];

    // RT VALIDATION: All edges should have same quadrance
    const expectedQ = 2 * t * t; // Two perpendicular components of length t
    const validation = RT.validateEdges(vertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    MetaLog.rtMetrics({ V: 12, E: 24, F: 14, edgeQ: expectedQ, maxError });

    return { vertices, edges, faces };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUADRAY-NATIVE POLYHEDRA (delegated to rt-quadray-polyhedra.js)
  // ═══════════════════════════════════════════════════════════════════════════

  // Re-export for backwards compatibility
  quadrayTetrahedron: QuadrayPolyhedra.tetrahedron,
  quadrayTetrahedronDeformed: QuadrayPolyhedra.tetrahedronDeformed,
  quadrayDualTetrahedron: QuadrayPolyhedra.dualTetrahedron,
  quadrayCuboctahedron: QuadrayPolyhedra.cuboctahedron,

  // NEW Quadray forms (for prime projection visualization)
  quadrayOctahedron: QuadrayPolyhedra.octahedron,
  quadrayTruncatedTetrahedron: QuadrayPolyhedra.truncatedTetrahedron,
  quadrayStellaOctangula: QuadrayPolyhedra.stellaOctangula,
};

/**
 * Validate face winding order
 * Check if all face normals point outward (away from center)
 *
 * @param {THREE.Vector3[]} vertices - Array of vertex positions
 * @param {number[][]} faces - Array of face vertex indices
 * @param {THREE.Vector3} center - Polyhedron center (default: origin)
 * @returns {Object} Validation results with errors array
 */
export function validateFaceWinding(
  vertices,
  faces,
  center = new THREE.Vector3(0, 0, 0)
) {
  const errors = [];
  const warnings = [];

  faces.forEach((faceIndices, faceIdx) => {
    // Need at least 3 vertices for a face
    if (faceIndices.length < 3) {
      errors.push({
        faceIndex: faceIdx,
        vertices: faceIndices,
        error: "Face has fewer than 3 vertices",
      });
      return;
    }

    // Get first 3 vertices of face
    const v0 = vertices[faceIndices[0]];
    const v1 = vertices[faceIndices[1]];
    const v2 = vertices[faceIndices[2]];

    // Compute face normal using cross product (right-hand rule)
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const faceNormal = new THREE.Vector3().crossVectors(edge1, edge2);

    const normalMagnitude = faceNormal.length();
    if (normalMagnitude < 1e-10) {
      warnings.push({
        faceIndex: faceIdx,
        vertices: faceIndices,
        warning: "Degenerate face (zero-area triangle)",
      });
      return;
    }

    faceNormal.normalize();

    // Get face center (average of all vertices)
    const faceCenter = new THREE.Vector3();
    faceIndices.forEach(idx => {
      if (vertices[idx]) {
        faceCenter.add(vertices[idx]);
      } else {
        errors.push({
          faceIndex: faceIdx,
          vertices: faceIndices,
          error: `Invalid vertex index ${idx}`,
        });
      }
    });
    faceCenter.divideScalar(faceIndices.length);

    // Outward direction from polyhedron center to face center
    const outwardDir = new THREE.Vector3().subVectors(faceCenter, center);
    const outwardMagnitude = outwardDir.length();

    if (outwardMagnitude < 1e-10) {
      warnings.push({
        faceIndex: faceIdx,
        vertices: faceIndices,
        warning: "Face center coincides with polyhedron center",
      });
      return;
    }

    outwardDir.normalize();

    // Dot product should be positive for correct winding (outward normal)
    const dot = faceNormal.dot(outwardDir);

    if (dot < -0.01) {
      // Significantly inward-pointing (wrong winding)
      errors.push({
        faceIndex: faceIdx,
        vertices: faceIndices,
        dotProduct: dot,
        faceNormal: faceNormal.clone(),
        outwardDir: outwardDir.clone(),
        message: `Face ${faceIdx} has INWARD-pointing normal (dot=${dot.toFixed(4)})`,
      });
    } else if (dot < 0.01) {
      // Nearly perpendicular (suspicious)
      warnings.push({
        faceIndex: faceIdx,
        vertices: faceIndices,
        dotProduct: dot,
        warning: `Face ${faceIdx} has nearly perpendicular normal (dot=${dot.toFixed(4)})`,
      });
    }
  });

  const totalFaces = faces.length;
  const errorCount = errors.length;
  const warningCount = warnings.length;
  const correctCount = totalFaces - errorCount - warningCount;

  return {
    totalFaces,
    correctCount,
    errorCount,
    warningCount,
    errors,
    warnings,
    isValid: errorCount === 0,
  };
}
