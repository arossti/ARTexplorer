/**
 * Quadray-Native Polyhedra Module
 *
 * Polyhedra defined NATIVELY in Quadray (WXYZ) tetrahedral coordinates.
 * These forms maintain algebraic exactness (rational or radical coordinates)
 * until conversion to Cartesian for GPU rendering.
 *
 * Quadray Advantages over Cartesian:
 * - Tetrahedron: Integer coordinates (1,0,0,0) vs irrational (1,1,1)/sqrt(3)
 * - Truncated tetrahedron: ALL rational coordinates (2,1,0,0)/3
 * - Basis vector spread: 8/9 (exact rational)
 * - Native IVM lattice compatibility
 *
 * Reference: Kirby Urner's Quadray Coordinates
 * See also: modules/rt-math.js RT.QuadrayPolyhedra, RT.QuadrayRotation
 *
 * @module rt-quadray-polyhedra
 * @author Andy & Claude (2026)
 */

import * as THREE from "three";
import { RT } from "./rt-math.js";

// Lazy import to avoid circular dependency - Polyhedra imports QuadrayPolyhedra
let _Polyhedra = null;
const getPolyhedra = async () => {
  if (!_Polyhedra) {
    const module = await import("./rt-polyhedra.js");
    _Polyhedra = module.Polyhedra;
  }
  return _Polyhedra;
};

// ============================================================================
// SHARED UTILITIES
// ============================================================================

/**
 * Quadray basis vectors (NOT normalized to unit Cartesian length)
 * These point to alternating vertices of a cube inscribed in the tetrahedron.
 * Using raw vectors gives edge Q = 8 with zero-sum normalized coordinates.
 */
const QUADRAY_BASIS = {
  w: new THREE.Vector3(1, 1, 1),
  x: new THREE.Vector3(1, -1, -1),
  y: new THREE.Vector3(-1, 1, -1),
  z: new THREE.Vector3(-1, -1, 1),
};

/**
 * Apply zero-sum normalization to a WXYZ coordinate
 * Standard Quadray: w + x + y + z = 0 (subtracts average from each coordinate)
 *
 * @param {Array<number>} wxyz - [W, X, Y, Z] coordinates
 * @returns {Array<number>} Normalized [W, X, Y, Z]
 */
const zeroSumNormalize = ([w, x, y, z]) => {
  const sum = w + x + y + z;
  const avg = sum / 4;
  return [w - avg, x - avg, y - avg, z - avg];
};

/**
 * Convert a WXYZ coordinate to Cartesian Vector3
 *
 * @param {number} w - W coordinate
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} z - Z coordinate
 * @param {number} scale - Scale factor
 * @returns {THREE.Vector3} Cartesian position
 */
const wxyzToCartesian = (w, x, y, z, scale = 1) => {
  return new THREE.Vector3()
    .addScaledVector(QUADRAY_BASIS.w, w * scale)
    .addScaledVector(QUADRAY_BASIS.x, x * scale)
    .addScaledVector(QUADRAY_BASIS.y, y * scale)
    .addScaledVector(QUADRAY_BASIS.z, z * scale);
};

/**
 * Fix face winding order so normals point outward
 *
 * @param {Array<number>} faceIndices - Vertex indices for face
 * @param {Array<THREE.Vector3>} vertices - All vertices
 * @returns {Array<number>} Fixed face indices (possibly reversed)
 */
const fixWinding = (faceIndices, vertices) => {
  const v0 = vertices[faceIndices[0]];
  const v1 = vertices[faceIndices[1]];
  const v2 = vertices[faceIndices[2]];

  // Compute face normal using cross product (v1-v0) x (v2-v0)
  const edge1 = new THREE.Vector3().subVectors(v1, v0);
  const edge2 = new THREE.Vector3().subVectors(v2, v0);
  const normal = new THREE.Vector3().crossVectors(edge1, edge2);

  // Face center
  const center = new THREE.Vector3();
  faceIndices.forEach(idx => center.add(vertices[idx]));
  center.divideScalar(faceIndices.length);

  // Outward direction (from origin to face center)
  const outward = center.clone().normalize();

  // If normal points inward (dot < 0), reverse the winding
  if (normal.dot(outward) < 0) {
    return [...faceIndices].reverse();
  }
  return faceIndices;
};

// ============================================================================
// QUADRAY POLYHEDRA
// ============================================================================

/**
 * Quadray-Native Polyhedra
 * All forms defined in WXYZ coordinates, converted to Cartesian at render time.
 */
export const QuadrayPolyhedra = {
  /**
   * Quadray Tetrahedron (4D-Tetrahedron Demonstrator)
   * Defined NATIVELY in Quadray coordinates, converted to XYZ only at render time.
   *
   * This polyhedron demonstrates:
   * - Native WXYZ coordinate definition
   * - Optional zero-sum normalization
   * - The difference between standard Quadray and extended 4D+/- Quadray
   *
   * Reference: http://www.grunch.net/synergetics/quadintro.html
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @param {boolean} options.normalize - Apply zero-sum normalization (default: true)
   * @param {Array} options.wxyz - Custom vertex coordinates (default: unit tetrahedron)
   * @returns {Object} - {vertices, edges, faces, wxyz_raw, wxyz_normalized, metadata}
   */
  tetrahedron: (scale = 1, options = {}) => {
    const { normalize = true, wxyz = null } = options;

    // Default: unit tetrahedron in Quadray (single active coordinate per vertex)
    const wxyz_raw = wxyz || [
      [1, 0, 0, 0], // W-axis vertex
      [0, 1, 0, 0], // X-axis vertex
      [0, 0, 1, 0], // Y-axis vertex
      [0, 0, 0, 1], // Z-axis vertex
    ];

    // Optional: Apply zero-sum normalization
    const wxyz_normalized = wxyz_raw.map(coords =>
      normalize ? zeroSumNormalize(coords) : coords
    );

    // Convert to Cartesian for THREE.js rendering
    const vertices = wxyz_normalized.map(([w, x, y, z]) =>
      wxyzToCartesian(w, x, y, z, scale)
    );

    // Standard tetrahedron topology
    const edges = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ];

    // Faces with CCW winding for outward normals
    const faces = [
      [0, 1, 2],
      [0, 3, 1],
      [0, 2, 3],
      [1, 3, 2],
    ];

    // RT VALIDATION
    const sampleQ = RT.quadrance(vertices[0], vertices[1]);
    const expectedQ = 8 * scale * scale;

    console.log(
      `[RT] Quadray Tetrahedron: normalize=${normalize}, scale=${scale}`
    );
    console.log(`  WXYZ raw: [${wxyz_raw[0]}] -> [${wxyz_raw[3]}]`);
    console.log(
      `  WXYZ normalized: [${wxyz_normalized[0].map(n => n.toFixed(3)).join(", ")}]`
    );
    console.log(
      `  Edge Q: expected=${expectedQ.toFixed(6)}, actual=${sampleQ.toFixed(6)}`
    );

    return {
      vertices,
      edges,
      faces,
      wxyz_raw,
      wxyz_normalized,
      metadata: {
        coordinateSystem: "quadray",
        normalized: normalize,
        scale: scale,
      },
    };
  },

  /**
   * Deformed Quadray Tetrahedron
   * Demonstrates that the fourth coordinate carries real geometric information
   * when zero-sum normalization is NOT applied.
   *
   * With normalization ON: (1,1,1,6) collapses to same shape as (1,1,1,1)
   * With normalization OFF: (1,1,1,6) renders as stretched tetrahedron
   *
   * @param {number} scale - Base scale
   * @param {number} zStretch - Stretch factor for Z vertex (default: 2)
   * @returns {Object} - Geometry with deformed tetrahedron
   */
  tetrahedronDeformed: (scale = 1, zStretch = 2) => {
    const wxyz = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, zStretch], // Stretched!
    ];

    console.log(
      `[RT] Deformed Quadray Tetrahedron: Z stretched by ${zStretch}x`
    );
    console.log(`  With zero-sum: Z normalizes - deformation LOST`);
    console.log(
      `  Without zero-sum: Z stays at (0,0,0,${zStretch}) - PRESERVED`
    );

    // Return WITHOUT normalization to preserve deformation
    return QuadrayPolyhedra.tetrahedron(scale, {
      normalize: false,
      wxyz: wxyz,
    });
  },

  /**
   * Dual Quadray Tetrahedron
   * The inverted tetrahedron defined natively in Quadray space.
   *
   * Standard tetrahedron: single coordinate active (1,0,0,0)
   * Dual tetrahedron: single coordinate INactive (0,1,1,1)
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @returns {Object} - Geometry with dual tetrahedron
   */
  dualTetrahedron: (scale = 1, options = {}) => {
    const { normalize = true } = options;

    // Dual: three active coordinates per vertex
    const wxyz = [
      [0, 1, 1, 1], // W inactive
      [1, 0, 1, 1], // X inactive
      [1, 1, 0, 1], // Y inactive
      [1, 1, 1, 0], // Z inactive
    ];

    console.log(`[RT] Quadray Dual Tetrahedron: scale=${scale}`);
    console.log(
      `  Vertices: (0,1,1,1) permutations (single inactive coordinate)`
    );
    console.log(
      `  Relationship: dual = base inverted through origin + (1,1,1,1)`
    );

    return QuadrayPolyhedra.tetrahedron(scale, {
      normalize: normalize,
      wxyz: wxyz,
    });
  },

  /**
   * Quadray Octahedron
   * Edge midpoints of tetrahedron form an octahedron.
   * All coordinates are rational (multiples of 1/2).
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @returns {Object} - {vertices, edges, faces, wxyz_raw, wxyz_normalized, metadata}
   */
  octahedron: (scale = 1, options = {}) => {
    const { normalize = true } = options;

    // 6 vertices at tetrahedron edge midpoints
    // Each has exactly two coordinates equal to 1, others 0
    const wxyz_raw = [
      [1, 1, 0, 0], // WX edge midpoint
      [1, 0, 1, 0], // WY edge midpoint
      [1, 0, 0, 1], // WZ edge midpoint
      [0, 1, 1, 0], // XY edge midpoint
      [0, 1, 0, 1], // XZ edge midpoint
      [0, 0, 1, 1], // YZ edge midpoint
    ];

    const wxyz_normalized = wxyz_raw.map(coords =>
      normalize ? zeroSumNormalize(coords) : coords
    );

    const vertices = wxyz_normalized.map(([w, x, y, z]) =>
      wxyzToCartesian(w, x, y, z, scale)
    );

    // Octahedron edges: vertices are adjacent if they share exactly one coordinate
    const edges = [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4], // From WX
      [1, 2],
      [1, 3],
      [1, 5], // From WY
      [2, 4],
      [2, 5], // From WZ
      [3, 4],
      [3, 5], // From XY
      [4, 5], // From XZ to YZ
    ];

    // 8 triangular faces (all vertices with exactly one common coordinate)
    const faces = [
      [0, 1, 3],
      [0, 3, 4],
      [0, 4, 2],
      [0, 2, 1],
      [5, 1, 2],
      [5, 2, 4],
      [5, 4, 3],
      [5, 3, 1],
    ].map(f => fixWinding(f, vertices));

    console.log(
      `[RT] Quadray Octahedron: normalize=${normalize}, scale=${scale}`
    );
    console.log(
      `  WXYZ: {1,1,0,0} permutations - 6 vertices (tet edge midpoints)`
    );

    return {
      vertices,
      edges,
      faces,
      wxyz_raw,
      wxyz_normalized,
      metadata: {
        coordinateSystem: "quadray",
        pattern: "{1,1,0,0} permutations",
        normalized: normalize,
        scale: scale,
        physicalMeaning: "Tetrahedron edge midpoints",
      },
    };
  },

  /**
   * Quadray Truncated Tetrahedron (7-gon Projection Source)
   *
   * 12 vertices with ALL RATIONAL Quadray coordinates!
   * This is the key polyhedron for prime polygon projection discovery.
   *
   * At viewing spreads (0.11, 0, 0.5), exactly 7 vertices form the convex hull
   * boundary - producing a heptagonal silhouette from rational parameters.
   *
   * Reference: Geometry documents/Prime-Projection-Conjecture.tex
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @returns {Object} - {vertices, edges, faces, wxyz_raw, wxyz_normalized, metadata}
   */
  truncatedTetrahedron: (scale = 1, options = {}) => {
    const { normalize = true } = options;

    // 12 vertices - ALL RATIONAL in Quadray!
    // Each vertex is at 1/3 edge position between two tetrahedron vertices
    // Pattern: (2,1,0,0) permutations with one zero
    const wxyz_raw = [
      // Near W vertex (W has largest coordinate)
      [2, 1, 0, 0], // 0
      [2, 0, 1, 0], // 1
      [2, 0, 0, 1], // 2
      // Near X vertex
      [1, 2, 0, 0], // 3
      [0, 2, 1, 0], // 4
      [0, 2, 0, 1], // 5
      // Near Y vertex
      [1, 0, 2, 0], // 6
      [0, 1, 2, 0], // 7
      [0, 0, 2, 1], // 8
      // Near Z vertex
      [1, 0, 0, 2], // 9
      [0, 1, 0, 2], // 10
      [0, 0, 1, 2], // 11
    ];

    const wxyz_normalized = wxyz_raw.map(coords =>
      normalize ? zeroSumNormalize(coords) : coords
    );

    const vertices = wxyz_normalized.map(([w, x, y, z]) =>
      wxyzToCartesian(w, x, y, z, scale)
    );

    // Edges: connect vertices that share the same "dominant" vertex (same 2 position)
    // OR form edges of the hexagonal faces
    const edges = [
      // Triangular face edges (near each original tet vertex)
      [0, 1],
      [1, 2],
      [2, 0], // Near W
      [3, 4],
      [4, 5],
      [5, 3], // Near X
      [6, 7],
      [7, 8],
      [8, 6], // Near Y
      [9, 10],
      [10, 11],
      [11, 9], // Near Z
      // Hexagonal face edges (connecting triangles)
      [0, 3],
      [1, 6],
      [2, 9], // From W triangle
      [3, 7],
      [4, 1],
      [5, 10], // From X triangle
      [6, 4],
      [7, 11],
      [8, 2], // From Y triangle
      [9, 5],
      [10, 8],
      [11, 6], // From Z triangle - wait, need to verify
    ];

    // Actually, let me compute edges properly via adjacency
    // Two vertices are adjacent if they differ by (1, -1, 0, 0) permutation
    const computedEdges = [];
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        const vi = wxyz_raw[i];
        const vj = wxyz_raw[j];
        // Check if adjacent: exactly 2 coordinates differ, each by 1
        let diffs = 0;
        let diffSum = 0;
        for (let k = 0; k < 4; k++) {
          if (vi[k] !== vj[k]) {
            diffs++;
            diffSum += Math.abs(vi[k] - vj[k]);
          }
        }
        // Adjacent: 2 coords differ, total difference = 2 (each differs by 1)
        if (diffs === 2 && diffSum === 2) {
          computedEdges.push([i, j]);
        }
      }
    }

    // 4 triangular faces (one per original tet vertex)
    const triangleFaces = [
      [0, 1, 2], // Near W
      [3, 4, 5], // Near X
      [6, 7, 8], // Near Y
      [9, 10, 11], // Near Z
    ];

    // 4 hexagonal faces (one per original tet face)
    // Each hexagon lies on a plane where one Quadray coordinate is absent
    // Traced by following edges around each original tet face
    const hexagonFaces = [
      [0, 3, 4, 7, 6, 1], // WXY face (Z=0): edges WX→XY→YW
      [0, 3, 5, 10, 9, 2], // WXZ face (Y=0): edges WX→XZ→ZW
      [1, 6, 8, 11, 9, 2], // WYZ face (X=0): edges WY→YZ→ZW
      [4, 7, 8, 11, 10, 5], // XYZ face (W=0): edges XY→YZ→ZX
    ];

    // Apply winding fix to all faces (triangles + hexagons)
    const faces = [
      ...triangleFaces.map(f => fixWinding(f, vertices)),
      ...hexagonFaces.map(f => fixWinding(f, vertices)),
    ];

    // RT VALIDATION
    const sampleQ =
      vertices.length > 1 ? RT.quadrance(vertices[0], vertices[1]) : 0;

    console.log(
      `[RT] Quadray Truncated Tetrahedron: normalize=${normalize}, scale=${scale}`
    );
    console.log(`  WXYZ: {2,1,0,0} permutations - 12 vertices (ALL RATIONAL!)`);
    console.log(`  Edges: ${computedEdges.length} (expected 18)`);
    console.log(`  Prime projection: 7-gon at spreads (0.11, 0, 0.5)`);

    return {
      vertices,
      edges: computedEdges,
      faces,
      wxyz_raw,
      wxyz_normalized,
      metadata: {
        coordinateSystem: "quadray",
        pattern: "{2,1,0,0} permutations",
        normalized: normalize,
        scale: scale,
        physicalMeaning: "Archimedean solid, NO central symmetry",
        primeProjection: {
          spreads: [0.11, 0, 0.5], // Matches CAMERA_PRESETS in rt-rendering.js
          spreadsAlt: [0.89, 0, 0.5], // Symmetric complement
          hullCount: 7,
          discoveryDate: "2026-02-06",
          geometry: {
            hullVertices: 7,
            hullEdges: 7,
            collinearVertices: 2, // 180° interior angles
            visualCorners: 5, // Non-collinear vertices (visual silhouette is 5-gon)
            interiorAngles: [109.5, 125.3, 125.3, 109.5, 180, 70.5, 180], // degrees
            edgeVariance: 0.15, // 15% (6 equal edges + 1 different)
            note: "7-hull with 2 collinear vertices; visual silhouette is 5-gon",
          },
        },
      },
    };
  },

  /**
   * Quadray Stella Octangula (Star Tetrahedron / Compound of Two Tetrahedra)
   * The classic "merkaba" form - two interpenetrating tetrahedra.
   *
   * In Quadray coordinates:
   * - Base tetrahedron: (1,0,0,0), (0,1,0,0), (0,0,1,0), (0,0,0,1)
   * - Dual tetrahedron: (0,1,1,1), (1,0,1,1), (1,1,0,1), (1,1,1,0)
   *
   * Total: 8 vertices (pure integer Quadray coordinates)
   *
   * Used as base for compound projections with truncated tetrahedron.
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @returns {Object} - {vertices, edges, faces, wxyz_raw, wxyz_normalized, metadata}
   */
  stellaOctangula: (scale = 1, options = {}) => {
    const { normalize = true } = options;

    // Reuse existing tetrahedron and dualTetrahedron generators
    const baseTet = QuadrayPolyhedra.tetrahedron(scale, { normalize });
    const dualTet = QuadrayPolyhedra.dualTetrahedron(scale, { normalize });

    // Combine vertices (base: 0-3, dual: 4-7)
    const vertices = [...baseTet.vertices, ...dualTet.vertices];
    const wxyz_raw = [...baseTet.wxyz_raw, ...dualTet.wxyz_raw];
    const wxyz_normalized = [
      ...baseTet.wxyz_normalized,
      ...dualTet.wxyz_normalized,
    ];

    // Combine edges (offset dual edges by 4)
    const edges = [
      ...baseTet.edges,
      ...dualTet.edges.map(([a, b]) => [a + 4, b + 4]),
    ];

    // Combine faces (offset dual faces by 4)
    const faces = [
      ...baseTet.faces,
      ...dualTet.faces.map(f => f.map(idx => idx + 4)),
    ];

    console.log(
      `[RT] Quadray Stella Octangula: normalize=${normalize}, scale=${scale}`
    );
    console.log(`  Composed from tetrahedron + dualTetrahedron`);
    console.log(`  8 vertices, 12 edges, 8 faces`);

    return {
      vertices,
      edges,
      faces,
      wxyz_raw,
      wxyz_normalized,
      metadata: {
        coordinateSystem: "quadray",
        pattern: "tetrahedron + dualTetrahedron compound",
        normalized: normalize,
        scale: scale,
        physicalMeaning:
          "Star Tetrahedron (Merkaba) - compound of two tetrahedra",
        vertexCount: 8,
        note: "Composed from existing Quadray tetrahedron generators",
      },
    };
  },

  /**
   * Quadray Cuboctahedron (Vector Equilibrium - 4D Native)
   * Defined NATIVELY in integer Quadray coordinates per Kirby Urner's calibration.
   *
   * Key insight: The 12 vertices of a cuboctahedron are ALL unique permutations
   * of {2, 1, 1, 0} in Quadray space - pure positive integers!
   *
   * This represents the 12-around-1 closest sphere packing configuration.
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @returns {Object} - {vertices, edges, faces, wxyz_raw, wxyz_normalized, metadata}
   */
  cuboctahedron: (scale = 1, options = {}) => {
    const { normalize = true } = options;

    // All 12 unique permutations of {2, 1, 1, 0}
    const wxyz_raw = [
      // "2" in W position
      [2, 1, 1, 0],
      [2, 1, 0, 1],
      [2, 0, 1, 1],
      // "2" in X position
      [1, 2, 1, 0],
      [1, 2, 0, 1],
      [0, 2, 1, 1],
      // "2" in Y position
      [1, 1, 2, 0],
      [1, 0, 2, 1],
      [0, 1, 2, 1],
      // "2" in Z position
      [1, 1, 0, 2],
      [1, 0, 1, 2],
      [0, 1, 1, 2],
    ];

    const wxyz_normalized = wxyz_raw.map(coords =>
      normalize ? zeroSumNormalize(coords) : coords
    );

    const vertices = wxyz_normalized.map(([w, x, y, z]) =>
      wxyzToCartesian(w, x, y, z, scale)
    );

    // Build adjacency list
    const adjList = new Map();
    for (let i = 0; i < 12; i++) adjList.set(i, []);

    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        const vi = wxyz_raw[i];
        const vj = wxyz_raw[j];
        let matches = 0;
        for (let k = 0; k < 4; k++) {
          if (vi[k] === vj[k]) matches++;
        }
        if (matches === 2) {
          const pos2_i = vi.indexOf(2),
            pos2_j = vj.indexOf(2);
          const pos0_i = vi.indexOf(0),
            pos0_j = vj.indexOf(0);
          const bothSwap = pos2_i !== pos2_j && pos0_i !== pos0_j;
          if (!bothSwap) {
            adjList.get(i).push(j);
            adjList.get(j).push(i);
          }
        }
      }
    }

    // Extract edges
    const edges = [];
    for (let i = 0; i < 12; i++) {
      for (const j of adjList.get(i)) {
        if (i < j) edges.push([i, j]);
      }
    }

    // Find triangular faces
    const triangleFaces = [];
    for (let i = 0; i < 12; i++) {
      const neighbors = adjList.get(i);
      for (let j = 0; j < neighbors.length; j++) {
        for (let k = j + 1; k < neighbors.length; k++) {
          const n1 = neighbors[j],
            n2 = neighbors[k];
          if (adjList.get(n1).includes(n2)) {
            const tri = [i, n1, n2].sort((a, b) => a - b);
            const key = tri.join(",");
            if (
              !triangleFaces.some(
                f => f.sort((a, b) => a - b).join(",") === key
              )
            ) {
              triangleFaces.push([i, n1, n2]);
            }
          }
        }
      }
    }

    // Find square faces
    const squareFaces = [];
    for (let i = 0; i < 12; i++) {
      const iNeighbors = adjList.get(i);
      for (let j = i + 1; j < 12; j++) {
        if (iNeighbors.includes(j)) continue;
        const jNeighbors = adjList.get(j);
        const common = iNeighbors.filter(n => jNeighbors.includes(n));
        if (common.length === 2) {
          const sq = [common[0], i, common[1], j];
          const sorted = [...sq].sort((a, b) => a - b);
          const key = sorted.join(",");
          if (
            !squareFaces.some(
              f => [...f].sort((a, b) => a - b).join(",") === key
            )
          ) {
            squareFaces.push(sq);
          }
        }
      }
    }

    // Fix winding
    const faces = [
      ...triangleFaces.map(f => fixWinding(f, vertices)),
      ...squareFaces.map(f => fixWinding(f, vertices)),
    ];

    console.log(
      `[RT] Quadray Cuboctahedron (VE): normalize=${normalize}, scale=${scale}`
    );
    console.log(`  WXYZ: {2,1,1,0} permutations - 12 vertices`);
    console.log(
      `  Edges: ${edges.length}, Faces: ${faces.length} (8 tri + 6 sq)`
    );

    return {
      vertices,
      edges,
      faces,
      wxyz_raw,
      wxyz_normalized,
      metadata: {
        coordinateSystem: "quadray",
        pattern: "{2,1,1,0} permutations",
        normalized: normalize,
        scale: scale,
        physicalMeaning: "12-around-1 closest sphere packing (IVM lattice)",
        attribution: "Kirby Urner calibration, January 2026",
      },
    };
  },
  // ═══════════════════════════════════════════════════════════════════════
  // COMPOUND POLYHEDRA - For Prime Polygon Projections (Breakthrough Feb 2026)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Compound Polyhedra Generator
   * Combines truncated tetrahedron (12v) + icosahedron (12v) = 24 vertices
   * This asymmetric compound produces prime hull projections (11-gon, 13-gon)
   * that BYPASS Gauss-Wantzel constructibility theorem!
   *
   * Key insight: Centrally symmetric polytopes only produce even hull counts.
   * Asymmetric compounds can produce prime hulls.
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @returns {Object} - {vertices, edges, faces, metadata, primeProjections}
   */
  compoundTruncTetIcosahedron: async (scale = 1, options = {}) => {
    const { normalize = true } = options;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. TRUNCATED TETRAHEDRON VERTICES (12) - From Quadray {2,1,0,0} permutations
    // ═══════════════════════════════════════════════════════════════════════
    const truncTetWXYZ = [];
    const coordSets = [
      [2, 1, 0, 0],
      [2, 0, 1, 0],
      [2, 0, 0, 1], // W=2
      [1, 2, 0, 0],
      [0, 2, 1, 0],
      [0, 2, 0, 1], // X=2
      [1, 0, 2, 0],
      [0, 1, 2, 0],
      [0, 0, 2, 1], // Y=2
      [1, 0, 0, 2],
      [0, 1, 0, 2],
      [0, 0, 1, 2], // Z=2
    ];
    coordSets.forEach(c => truncTetWXYZ.push(c));

    const truncTetNormalized = truncTetWXYZ.map(coords =>
      normalize ? zeroSumNormalize(coords) : coords
    );

    // First pass: compute raw vertices to find circumradius
    const truncTetRaw = truncTetNormalized.map(
      ([w, x, y, z]) => wxyzToCartesian(w, x, y, z, 1.0) // Unit scale first
    );

    // Calculate truncated tet circumradius
    let truncTetCircumradius = 0;
    truncTetRaw.forEach(v => {
      const r = v.length();
      if (r > truncTetCircumradius) truncTetCircumradius = r;
    });

    // Normalize to unit circumradius, then apply user scale
    const truncTetVertices = truncTetRaw.map(v =>
      v.clone().multiplyScalar(scale / truncTetCircumradius)
    );

    // Edges for truncated tetrahedron (indices 0-11)
    const truncTetEdges = [];
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        const vi = truncTetWXYZ[i];
        const vj = truncTetWXYZ[j];
        let diffs = 0,
          diffSum = 0;
        for (let k = 0; k < 4; k++) {
          if (vi[k] !== vj[k]) {
            diffs++;
            diffSum += Math.abs(vi[k] - vj[k]);
          }
        }
        if (diffs === 2 && diffSum === 2) truncTetEdges.push([i, j]);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. ICOSAHEDRON (12 vertices) - Call actual Polyhedra.icosahedron()
    // Uses TESTED geometry from rt-polyhedra.js (golden ratio construction)
    // CRITICAL: Normalize to SAME circumradius as truncated tetrahedron!
    // ═══════════════════════════════════════════════════════════════════════
    const Polyhedra = await getPolyhedra();
    const icosaRaw = Polyhedra.icosahedron(1.0); // Unit scale first

    // Calculate icosahedron circumradius
    let icosaCircumradius = 0;
    icosaRaw.vertices.forEach(v => {
      const r = v.length();
      if (r > icosaCircumradius) icosaCircumradius = r;
    });

    // Normalize to unit circumradius, then apply user scale (SAME as trunc tet!)
    const icosaVertices = icosaRaw.vertices.map(v =>
      v.clone().multiplyScalar(scale / icosaCircumradius)
    );
    const icosaEdgesLocal = icosaRaw.edges;
    const icosaFacesLocal = icosaRaw.faces;

    console.log(
      `  [Compound Scale] TruncTet circumradius: ${truncTetCircumradius.toFixed(4)}, Icosa: ${icosaCircumradius.toFixed(4)}`
    );
    console.log(
      `  [Compound Scale] Both normalized to circumradius: ${scale.toFixed(4)}`
    );

    // ═══════════════════════════════════════════════════════════════════════
    // 3. COMBINE VERTEX SETS (24 total)
    // ═══════════════════════════════════════════════════════════════════════
    const vertices = [...truncTetVertices, ...icosaVertices];

    // Offset icosahedron edge indices by 12 (truncated tet has 12 vertices)
    const icosaEdges = icosaEdgesLocal.map(([a, b]) => [a + 12, b + 12]);

    const edges = [...truncTetEdges, ...icosaEdges];

    // ═══════════════════════════════════════════════════════════════════════
    // 4. FACES FOR BOTH COMPONENTS (with CCW winding for outward normals)
    // ═══════════════════════════════════════════════════════════════════════

    // Truncated tetrahedron faces (indices 0-11)
    // 4 triangular faces (one per original tet vertex)
    const truncTetTriangles = [
      [0, 1, 2], // Near W
      [3, 4, 5], // Near X
      [6, 7, 8], // Near Y
      [9, 10, 11], // Near Z
    ];

    // 4 hexagonal faces (one per original tet face)
    const truncTetHexagons = [
      [0, 3, 4, 7, 6, 1], // WXY face (Z=0)
      [0, 3, 5, 10, 9, 2], // WXZ face (Y=0)
      [1, 6, 8, 11, 9, 2], // WYZ face (X=0)
      [4, 7, 8, 11, 10, 5], // XYZ face (W=0)
    ];

    // Offset icosahedron face indices by 12
    const icosaFaces = icosaFacesLocal.map(f => f.map(idx => idx + 12));

    // Apply winding fix to all faces
    const truncTetFaces = [
      ...truncTetTriangles.map(f => fixWinding(f, vertices)),
      ...truncTetHexagons.map(f => fixWinding(f, vertices)),
    ];

    const faces = [
      ...truncTetFaces,
      ...icosaFaces.map(f => fixWinding(f, vertices)),
    ];

    console.log(
      `[RT] Compound Polyhedra (Trunc Tet + Icosahedron): ${vertices.length} vertices, ${edges.length} edges, ${faces.length} faces`
    );
    console.log(
      `  Truncated Tetrahedron: 12 vertices, 8 faces (4 tri + 4 hex)`
    );
    console.log(`  Icosahedron: 12 vertices, 20 faces (all triangular)`);
    console.log(
      `  Prime projection targets: 11-gon at s=(0,0.4,0.2), 13-gon at s=(0,0.6,0.8)`
    );

    return {
      vertices,
      edges,
      faces,
      // Component data for separate rendering with distinct colors
      components: {
        truncatedTetrahedron: {
          vertices: truncTetVertices,
          edges: truncTetEdges,
          faces: truncTetFaces,
        },
        icosahedron: {
          vertices: icosaVertices,
          edges: icosaEdgesLocal, // Local indices (0-11)
          faces: icosaFacesLocal, // Local indices (0-11)
        },
      },
      truncTetWXYZ,
      truncTetNormalized,
      metadata: {
        coordinateSystem: "mixed",
        componentNames: ["truncatedTetrahedron", "icosahedron"],
        totalVertices: 24,
        normalized: normalize,
        scale: scale,
        physicalMeaning: "Asymmetric compound for prime projections",
        discoveryDate: "2026-02-06",
        primeProjections: {
          hendecagon: {
            spreads: [0, 0.4, 0.2],
            hullCount: 11,
            note: "Hendecagon - requires quintic polynomial, NOT algebraically solvable",
          },
          tridecagon: {
            spreads: [0, 0.6, 0.8],
            hullCount: 13,
            note: "Tridecagon - requires sextic polynomial, NOT algebraically solvable",
          },
        },
      },
    };
  },

  /**
   * Compound Polyhedra: Truncated Tetrahedron + Tetrahedron (7-gon Projection)
   * Combines truncated tetrahedron (12v) + tetrahedron (4v) = 16 vertices
   *
   * This compound produces 7-hull projections at specific viewing angles,
   * providing an alternative to the 9-hull currently produced by truncated
   * tetrahedron alone (which has 2 collinear vertices creating visual 5-gon).
   *
   * Spread parameters: Python (0, 0.04, 0.4) → JS (0, 0.4, 0.04) (swap s2↔s3)
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @returns {Object} - {vertices, edges, faces, metadata, primeProjections}
   */
  compoundTruncTetTetrahedron: async (scale = 1, options = {}) => {
    const { normalize = true } = options;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. TRUNCATED TETRAHEDRON VERTICES (12) - From Quadray {2,1,0,0} permutations
    // ═══════════════════════════════════════════════════════════════════════
    const truncTetWXYZ = [];
    const coordSets = [
      [2, 1, 0, 0],
      [2, 0, 1, 0],
      [2, 0, 0, 1], // W=2
      [1, 2, 0, 0],
      [0, 2, 1, 0],
      [0, 2, 0, 1], // X=2
      [1, 0, 2, 0],
      [0, 1, 2, 0],
      [0, 0, 2, 1], // Y=2
      [1, 0, 0, 2],
      [0, 1, 0, 2],
      [0, 0, 1, 2], // Z=2
    ];
    coordSets.forEach(c => truncTetWXYZ.push(c));

    const truncTetNormalized = truncTetWXYZ.map(coords =>
      normalize ? zeroSumNormalize(coords) : coords
    );

    // First pass: compute raw vertices to find circumradius
    const truncTetRaw = truncTetNormalized.map(
      ([w, x, y, z]) => wxyzToCartesian(w, x, y, z, 1.0) // Unit scale first
    );

    // Calculate truncated tet circumradius
    let truncTetCircumradius = 0;
    truncTetRaw.forEach(v => {
      const r = v.length();
      if (r > truncTetCircumradius) truncTetCircumradius = r;
    });

    // Normalize to unit circumradius, then apply user scale
    const truncTetVertices = truncTetRaw.map(v =>
      v.clone().multiplyScalar(scale / truncTetCircumradius)
    );

    // Edges for truncated tetrahedron (indices 0-11)
    const truncTetEdges = [];
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        const vi = truncTetWXYZ[i];
        const vj = truncTetWXYZ[j];
        let diffs = 0,
          diffSum = 0;
        for (let k = 0; k < 4; k++) {
          if (vi[k] !== vj[k]) {
            diffs++;
            diffSum += Math.abs(vi[k] - vj[k]);
          }
        }
        if (diffs === 2 && diffSum === 2) truncTetEdges.push([i, j]);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. TETRAHEDRON (4 vertices) - Call actual Polyhedra.tetrahedron()
    // Uses TESTED geometry from rt-polyhedra.js
    // CRITICAL: Normalize to SAME circumradius as truncated tetrahedron!
    // ═══════════════════════════════════════════════════════════════════════
    const Polyhedra = await getPolyhedra();
    const tetRaw = Polyhedra.tetrahedron(1.0, { silent: true }); // Unit scale, suppress logging

    // Calculate tetrahedron circumradius
    let tetCircumradius = 0;
    tetRaw.vertices.forEach(v => {
      const r = v.length();
      if (r > tetCircumradius) tetCircumradius = r;
    });

    // Normalize to unit circumradius, then apply user scale (SAME as trunc tet!)
    const tetVertices = tetRaw.vertices.map(v =>
      v.clone().multiplyScalar(scale / tetCircumradius)
    );
    const tetEdgesLocal = tetRaw.edges;
    const tetFacesLocal = tetRaw.faces;

    console.log(
      `  [Compound Scale] TruncTet circumradius: ${truncTetCircumradius.toFixed(4)}, Tet: ${tetCircumradius.toFixed(4)}`
    );
    console.log(
      `  [Compound Scale] Both normalized to circumradius: ${scale.toFixed(4)}`
    );

    // ═══════════════════════════════════════════════════════════════════════
    // 3. COMBINE VERTEX SETS (16 total)
    // ═══════════════════════════════════════════════════════════════════════
    const vertices = [...truncTetVertices, ...tetVertices];

    // Offset tetrahedron edge indices by 12 (truncated tet has 12 vertices)
    const tetEdges = tetEdgesLocal.map(([a, b]) => [a + 12, b + 12]);

    const edges = [...truncTetEdges, ...tetEdges];

    // ═══════════════════════════════════════════════════════════════════════
    // 4. FACES FOR BOTH COMPONENTS (with CCW winding for outward normals)
    // ═══════════════════════════════════════════════════════════════════════

    // Truncated tetrahedron faces (indices 0-11)
    // 4 triangular faces (one per original tet vertex)
    const truncTetTriangles = [
      [0, 1, 2], // Near W
      [3, 4, 5], // Near X
      [6, 7, 8], // Near Y
      [9, 10, 11], // Near Z
    ];

    // 4 hexagonal faces (one per original tet face)
    const truncTetHexagons = [
      [0, 3, 4, 7, 6, 1], // WXY face (Z=0)
      [0, 3, 5, 10, 9, 2], // WXZ face (Y=0)
      [1, 6, 8, 11, 9, 2], // WYZ face (X=0)
      [4, 7, 8, 11, 10, 5], // XYZ face (W=0)
    ];

    // Offset tetrahedron face indices by 12
    const tetFaces = tetFacesLocal.map(f => f.map(idx => idx + 12));

    // Apply winding fix to all faces
    const truncTetFaces = [
      ...truncTetTriangles.map(f => fixWinding(f, vertices)),
      ...truncTetHexagons.map(f => fixWinding(f, vertices)),
    ];

    const faces = [
      ...truncTetFaces,
      ...tetFaces.map(f => fixWinding(f, vertices)),
    ];

    console.log(
      `[RT] Compound Polyhedra (Trunc Tet + Tetrahedron): ${vertices.length} vertices, ${edges.length} edges, ${faces.length} faces`
    );
    console.log(
      `  Truncated Tetrahedron: 12 vertices, 8 faces (4 tri + 4 hex)`
    );
    console.log(`  Tetrahedron: 4 vertices, 4 faces (all triangular)`);
    console.log(`  Prime projection target: 7-gon at s=(0, 0.4, 0.04)`);

    return {
      vertices,
      edges,
      faces,
      // Component data for separate rendering with distinct colors
      components: {
        truncatedTetrahedron: {
          vertices: truncTetVertices,
          edges: truncTetEdges,
          faces: truncTetFaces,
        },
        tetrahedron: {
          vertices: tetVertices,
          edges: tetEdgesLocal, // Local indices (0-3)
          faces: tetFacesLocal, // Local indices (0-3)
        },
      },
      truncTetWXYZ,
      truncTetNormalized,
      metadata: {
        coordinateSystem: "mixed",
        componentNames: ["truncatedTetrahedron", "tetrahedron"],
        totalVertices: 16,
        normalized: normalize,
        scale: scale,
        physicalMeaning: "Asymmetric compound for 7-gon projection",
        discoveryDate: "2026-02-06",
        primeProjections: {
          heptagon: {
            spreads: [0, 0.4, 0.04], // JS convention (swapped from Python)
            spreadsAlt: [0, 0.04, 0.4], // Python convention
            hullCount: 7,
            note: "Heptagon - BYPASSES Gauss-Wantzel via 3D→2D projection",
          },
        },
      },
    };
  },
};

// Export utilities for external use
export { QUADRAY_BASIS, zeroSumNormalize, wxyzToCartesian, fixWinding };
