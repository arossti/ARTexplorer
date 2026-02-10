/**
 * rt-helices.js
 * Helical Geometry Generators for ARTexplorer
 *
 * Generates helical chains of polyhedra using face-sharing algorithms.
 * RT-Pure: Uses quadrance and spread throughout.
 *
 * Variants:
 * - tetrahelix1: Toroidal (left-handed, max 48, approaches torus closure)
 * - tetrahelix2: Linear with multi-strand (tetrahedral seed)
 * - tetrahelix3: Linear with multi-strand (octahedral seed)
 *
 * See: Geometry documents/Tetrahelix.md for specification
 *
 * @requires THREE.js
 * @requires rt-math.js
 */

import { RT } from "./rt-math.js";
import { MetaLog } from "./rt-metalog.js";

// Access THREE.js from global scope (set by main HTML)

// ============================================================================
// RT-PURE CONSTANTS FOR TETRAHEDRAL GEOMETRY
// ============================================================================
// These constants are derived algebraically without classical trigonometry.
// See Tetrahelix.md "RT-Pure Representation" for derivations.
//
// Key insight: The dihedral angle θ satisfies cos(θ) = 1/3, giving us
// spread s = sin²(θ) = 1 - cos²(θ) = 1 - 1/9 = 8/9
// ============================================================================

const RT_CONSTANTS = {
  // Spread values (s = sin²θ, algebraically derived)
  DIHEDRAL_SPREAD: 8 / 9, // Tetrahedral dihedral angle: arccos(1/3) ≈ 70.53°
  TETRAHEDRAL_SPREAD: 8 / 9, // Tetrahedral angle: arccos(-1/3) ≈ 109.47° (supplement)
  FACE_SPREAD: 3 / 4, // Equilateral triangle interior: sin²(60°) = 3/4

  // Quadrance ratios (algebraic relationships)
  APEX_Q_RATIO: 2 / 3, // Q_apex / Q_edge for regular tetrahedron
  FACE_CENTROID_Q_RATIO: 1 / 3, // Q_centroid_to_vertex / Q_edge for equilateral △

  // Golden ratio constants (for icosahedral applications)
  // φ = (1 + √5) / 2 ≈ 1.618033988749895
  // Use identities: φ² = φ + 1, 1/φ = φ - 1, φ³ = 2φ + 1
  PHI: (1 + Math.sqrt(5)) / 2,
  PHI_SQUARED: (1 + Math.sqrt(5)) / 2 + 1, // φ² = φ + 1 (identity, not multiplication)
  INV_PHI: (1 + Math.sqrt(5)) / 2 - 1, // 1/φ = φ - 1 (identity, not division)

  // Derived: Edge quadrance for standard tetrahedron with halfSize s
  // Dual tetrahedron: Q = 8s² (vertices at ±s)
  // Standard tetrahedron: Q = 8s² (same)
  edgeQuadrance: halfSize => 8 * halfSize * halfSize,

  // Derived: Apex distance quadrance from edge quadrance
  // Q_apex = (2/3) × Q_edge
  apexQuadrance: edgeQ => (2 / 3) * edgeQ,

  // Derived: Apex distance (√ deferred to final vertex creation)
  // Only call this at THREE.Vector3 boundary
  apexDistance: edgeQ => Math.sqrt((2 / 3) * edgeQ),
};

// Export for use in other modules (e.g., future icosahedral tetrahelix)
export { RT_CONSTANTS };

// ============================================================================
// SHARED HELPER FUNCTIONS
// ============================================================================
// These utilities are used by all tetrahelix variants for geometry calculations.
// ============================================================================

const HelixHelpers = {
  /**
   * Calculate centroid of a triangular face
   * @param {THREE.Vector3} v0
   * @param {THREE.Vector3} v1
   * @param {THREE.Vector3} v2
   * @returns {THREE.Vector3}
   */
  calculateCentroid: (v0, v1, v2) => {
    return new THREE.Vector3(
      (v0.x + v1.x + v2.x) / 3,
      (v0.y + v1.y + v2.y) / 3,
      (v0.z + v1.z + v2.z) / 3
    );
  },

  /**
   * Calculate outward-pointing normal for a triangular face
   * @param {THREE.Vector3} v0
   * @param {THREE.Vector3} v1
   * @param {THREE.Vector3} v2
   * @param {THREE.Vector3} solidCentroid - Centroid of the solid (to determine outward direction)
   * @returns {THREE.Vector3}
   */
  calculateFaceNormal: (v0, v1, v2, solidCentroid) => {
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    const faceCentroid = HelixHelpers.calculateCentroid(v0, v1, v2);
    const outwardDir = new THREE.Vector3().subVectors(
      faceCentroid,
      solidCentroid
    );
    if (normal.dot(outwardDir) < 0) {
      normal.negate();
    }
    return normal;
  },

  /**
   * Get centroid of a tetrahedron from 4 vertices (Vector3 array)
   * @param {THREE.Vector3[]} verts - Array of 4 vertices
   * @returns {THREE.Vector3}
   */
  getTetraCentroid: verts => {
    return new THREE.Vector3(
      (verts[0].x + verts[1].x + verts[2].x + verts[3].x) / 4,
      (verts[0].y + verts[1].y + verts[2].y + verts[3].y) / 4,
      (verts[0].z + verts[1].z + verts[2].z + verts[3].z) / 4
    );
  },

  /**
   * Get centroid of an octahedron from 6 vertices (Vector3 array)
   * @param {THREE.Vector3[]} verts - Array of 6 vertices
   * @returns {THREE.Vector3}
   */
  getOctaCentroid: verts => {
    return new THREE.Vector3(
      (verts[0].x +
        verts[1].x +
        verts[2].x +
        verts[3].x +
        verts[4].x +
        verts[5].x) /
        6,
      (verts[0].y +
        verts[1].y +
        verts[2].y +
        verts[3].y +
        verts[4].y +
        verts[5].y) /
        6,
      (verts[0].z +
        verts[1].z +
        verts[2].z +
        verts[3].z +
        verts[4].z +
        verts[5].z) /
        6
    );
  },

  /**
   * Build deduplicated edge list from tetrahedra array
   * @param {number[][]} tetrahedra - Array of 4-vertex-index arrays
   * @returns {number[][]} Array of [v1, v2] edge pairs
   */
  buildEdges: tetrahedra => {
    const edgeSet = new Set();
    const addEdge = (a, b) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edgeSet.add(key);
    };

    tetrahedra.forEach(tet => {
      addEdge(tet[0], tet[1]);
      addEdge(tet[0], tet[2]);
      addEdge(tet[0], tet[3]);
      addEdge(tet[1], tet[2]);
      addEdge(tet[1], tet[3]);
      addEdge(tet[2], tet[3]);
    });

    return Array.from(edgeSet).map(key => {
      const [a, b] = key.split("-").map(Number);
      return [a, b];
    });
  },

  /**
   * Build face list from tetrahedra with correct winding (outward normals)
   * @param {number[][]} tetrahedra - Array of 4-vertex-index arrays
   * @param {THREE.Vector3[]} allVertices - All vertices
   * @returns {number[][]} Array of [v0, v1, v2] face triples
   */
  buildFaces: (tetrahedra, allVertices) => {
    const allFaces = [];

    tetrahedra.forEach(tet => {
      const faces = [
        [tet[1], tet[2], tet[3]],
        [tet[0], tet[2], tet[3]],
        [tet[0], tet[1], tet[3]],
        [tet[0], tet[1], tet[2]],
      ];

      const tetVerts = tet.map(idx => allVertices[idx]);
      const tetraCentroid = HelixHelpers.getTetraCentroid(tetVerts);

      faces.forEach(face => {
        const v0 = allVertices[face[0]];
        const v1 = allVertices[face[1]];
        const v2 = allVertices[face[2]];
        const faceCentroid = HelixHelpers.calculateCentroid(v0, v1, v2);
        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2);
        const outwardDir = new THREE.Vector3().subVectors(
          faceCentroid,
          tetraCentroid
        );

        if (normal.dot(outwardDir) < 0) {
          const tmp = face[1];
          face[1] = face[2];
          face[2] = tmp;
        }

        allFaces.push(face);
      });
    });

    return allFaces;
  },

  /**
   * Calculate apex distance from edge quadrance (RT-pure)
   * Uses RT_CONSTANTS.APEX_Q_RATIO = 2/3
   * For regular tetrahedron: Q_apex = (2/3) × Q_edge
   * √ is deferred to this boundary function for THREE.js vertex creation
   * @param {number} edgeQ - Edge quadrance
   * @returns {number} Distance from face centroid to apex
   */
  apexDistanceFromQ: edgeQ => {
    return Math.sqrt(RT_CONSTANTS.APEX_Q_RATIO * edgeQ);
  },

  /**
   * Calculate apex quadrance from edge quadrance (RT-pure, no √)
   * Keeps calculation in quadrance space for maximum algebraic precision
   * @param {number} edgeQ - Edge quadrance
   * @returns {number} Quadrance from face centroid to apex
   */
  apexQuadranceFromQ: edgeQ => {
    return RT_CONSTANTS.APEX_Q_RATIO * edgeQ;
  },
};

/**
 * Helices generator functions
 * @namespace Helices
 */
export const Helices = {
  /**
   * Tetrahelix 1: Toroidal variant (left-handed)
   *
   * Uses face-normal driven generation with left-handed chirality.
   * Approaches torus closure at 48 tetrahedra with small gap.
   *
   * Note: Right-handed variant self-intersects at step 12, so only
   * left-handed is implemented. Chirality toggle commented out for
   * potential reuse in future variants.
   *
   * @param {number} halfSize - Half-size of base tetrahedron
   * @param {Object} options
   * @param {number} options.count - Number of tetrahedra (default: 10, max: 48)
   * @param {string} options.startFace - Initial face: 'A', 'B', 'C', or 'D' (default: 'A')
   * @returns {Object} { vertices, edges, faces, metadata }
   */
  tetrahelix1: (halfSize = 1, options = {}) => {
    // Cap at 48 cycles for torus near-closure (right-handed self-intersects at 12 cycles)
    const count = Math.min(Math.max(options.count || 10, 1), 48);
    const startFace = options.startFace || "A";
    // Left-handed only for this variant (right-handed self-intersects)
    const leftHanded = true;

    // Generate seed tetrahedron (same as Polyhedra.tetrahedron)
    const s = halfSize;
    const seedVertices = [
      new THREE.Vector3(-s, -s, -s), // V0
      new THREE.Vector3(s, s, -s), // V1
      new THREE.Vector3(s, -s, s), // V2
      new THREE.Vector3(-s, s, s), // V3
    ];

    // All vertices in the chain (start with seed)
    const allVertices = [...seedVertices];

    // Track tetrahedra as arrays of 4 vertex indices
    const tetrahedra = [[0, 1, 2, 3]];

    // Edge quadrance for regular tetrahedron: Q = 8s²
    const expectedQ = 8 * halfSize * halfSize;

    // Distance from face centroid to apex for regular tetrahedron
    // Q_apex = (2/3) * Q_edge
    const apexDistanceQ = (2 / 3) * expectedQ;
    const apexDistance = Math.sqrt(apexDistanceQ);

    /**
     * Calculate centroid of a triangular face
     */
    const calculateCentroid = (v0, v1, v2) => {
      return new THREE.Vector3(
        (v0.x + v1.x + v2.x) / 3,
        (v0.y + v1.y + v2.y) / 3,
        (v0.z + v1.z + v2.z) / 3
      );
    };

    /**
     * Calculate outward-pointing normal for a face
     */
    const calculateFaceNormal = (v0, v1, v2, tetraCentroid) => {
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      const faceCentroid = calculateCentroid(v0, v1, v2);
      const outwardDir = new THREE.Vector3().subVectors(
        faceCentroid,
        tetraCentroid
      );
      if (normal.dot(outwardDir) < 0) {
        normal.negate();
      }

      return normal;
    };

    /**
     * Get tetrahedron centroid from 4 vertices (Vector3 array)
     */
    const getTetraCentroid = verts => {
      return new THREE.Vector3(
        (verts[0].x + verts[1].x + verts[2].x + verts[3].x) / 4,
        (verts[0].y + verts[1].y + verts[2].y + verts[3].y) / 4,
        (verts[0].z + verts[1].z + verts[2].z + verts[3].z) / 4
      );
    };

    /**
     * Get tetrahedron centroid from 4 vertex indices
     */
    const getTetraCentroidByIndices = tetIndices => {
      const v0 = allVertices[tetIndices[0]];
      const v1 = allVertices[tetIndices[1]];
      const v2 = allVertices[tetIndices[2]];
      const v3 = allVertices[tetIndices[3]];
      return new THREE.Vector3(
        (v0.x + v1.x + v2.x + v3.x) / 4,
        (v0.y + v1.y + v2.y + v3.y) / 4,
        (v0.z + v1.z + v2.z + v3.z) / 4
      );
    };

    // Map user-facing labels to face indices
    const FACE_LABEL_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

    // Current state
    let currentVerts = [...seedVertices];
    let currentIndices = [0, 1, 2, 3];
    let exitFaceLocalIdx = FACE_LABEL_TO_INDEX[startFace] ?? 0;

    // Generate chain
    for (let i = 1; i < count; i++) {
      const faceLocalIndices = [0, 1, 2, 3].filter(j => j !== exitFaceLocalIdx);

      const fv0 = currentVerts[faceLocalIndices[0]];
      const fv1 = currentVerts[faceLocalIndices[1]];
      const fv2 = currentVerts[faceLocalIndices[2]];

      const tetraCentroid = getTetraCentroid(currentVerts);
      const faceCentroid = calculateCentroid(fv0, fv1, fv2);
      const faceNormal = calculateFaceNormal(fv0, fv1, fv2, tetraCentroid);

      const newApex = faceCentroid
        .clone()
        .add(faceNormal.multiplyScalar(apexDistance));
      const newApexIndex = allVertices.length;
      allVertices.push(newApex);

      const sharedGlobalIndices = faceLocalIndices.map(
        li => currentIndices[li]
      );

      const newTetIndices = [...sharedGlobalIndices, newApexIndex];
      tetrahedra.push(newTetIndices);

      currentVerts = [fv0, fv1, fv2, newApex];
      currentIndices = newTetIndices;

      // Left-handed face cycling: 0 -> 2 -> 1 -> 0
      exitFaceLocalIdx =
        exitFaceLocalIdx === 0 ? 2 : exitFaceLocalIdx === 2 ? 1 : 0;
    }

    // Build edges
    const edgeSet = new Set();
    const addEdge = (a, b) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edgeSet.add(key);
    };

    tetrahedra.forEach(tet => {
      addEdge(tet[0], tet[1]);
      addEdge(tet[0], tet[2]);
      addEdge(tet[0], tet[3]);
      addEdge(tet[1], tet[2]);
      addEdge(tet[1], tet[3]);
      addEdge(tet[2], tet[3]);
    });

    const edges = Array.from(edgeSet).map(key => {
      const [a, b] = key.split("-").map(Number);
      return [a, b];
    });

    // Build faces
    const allFaces = [];
    tetrahedra.forEach(tet => {
      const faces = [
        [tet[1], tet[2], tet[3]],
        [tet[0], tet[2], tet[3]],
        [tet[0], tet[1], tet[3]],
        [tet[0], tet[1], tet[2]],
      ];

      const tetraCentroid = getTetraCentroidByIndices(tet);
      faces.forEach(face => {
        const v0 = allVertices[face[0]];
        const v1 = allVertices[face[1]];
        const v2 = allVertices[face[2]];
        const faceCentroid = calculateCentroid(v0, v1, v2);
        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2);
        const outwardDir = new THREE.Vector3().subVectors(
          faceCentroid,
          tetraCentroid
        );

        if (normal.dot(outwardDir) < 0) {
          const tmp = face[1];
          face[1] = face[2];
          face[2] = tmp;
        }

        allFaces.push(face);
      });
    });

    // RT Validation
    const validation = RT.validateEdges(allVertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const faceSpread = RT.FaceSpreads.tetrahedron();

    MetaLog.identity("Tetrahelix1 (Toroidal)", "", {
      construction: `count=${count}, halfSize=${halfSize}`,
    });
    MetaLog.rtMetrics({
      V: allVertices.length,
      E: edges.length,
      F: allFaces.length,
      edgeQ: expectedQ,
      maxError,
    });
    MetaLog.construction([
      `Chirality: left-handed (fixed)`,
      `Start face: ${startFace}`,
    ]);

    return {
      vertices: allVertices,
      edges,
      faces: allFaces,
      faceSpread,
      metadata: {
        variant: "tetrahelix1",
        count,
        startFace,
        leftHanded: true,
        tetrahedra: tetrahedra.length,
        expectedQ,
      },
    };
  },

  /**
   * Tetrahelix 2: Linear variant with multi-strand support
   *
   * Extends tetrahedra in a zigzag pattern that travels in a roughly
   * straight line (javellin through origin analogy) rather than curving back into a torus.
   *
   * Strategy: Always exit through face 0 (relative to new tet's local ordering).
   * This creates an alternating pattern that extends linearly.
   *
   * Multi-strand: Each tetrahedron in the primary chain has exposed faces
   * that can bond with parallel secondary strands. With strands=2, one
   * secondary strand is bonded. With strands=3 or 4, additional strands
   * are bonded to the remaining exposed faces ("3 around 1" configuration).
   *
   * @param {number} halfSize - Half-size of base tetrahedron
   * @param {Object} options
   * @param {number} options.count - Number of tetrahedra per strand (default: 10, max: 145)
   * @param {string} options.startFace - Initial face: 'A', 'B', 'C', or 'D' (default: 'A')
   * @param {number} options.strands - Number of parallel strands: 1-4 (default: 1)
   * @param {string} options.bondMode - 'zipped' (radial spines) or 'unzipped' (parallel chains)
   * @param {Object} options.exitFaces - Per-strand exit face after first tet: { A: 0-2, B: 0-2, C: 0-2, D: 0-2 }
   * @returns {Object} { vertices, edges, faces, metadata }
   */
  tetrahelix2: (halfSize = 1, options = {}) => {
    const count = Math.min(Math.max(options.count || 10, 1), 145);
    const startFace = options.startFace || "A";
    // Direction flags for javelin model - both default to true for full javelin
    const dirPlus = options.dirPlus !== undefined ? options.dirPlus : true;
    const dirMinus = options.dirMinus !== undefined ? options.dirMinus : true;
    const strands = Math.min(Math.max(options.strands || 1, 1), 4);
    const bondMode = options.bondMode || "zipped";
    const exitFaces = options.exitFaces || { A: 0, B: 0, C: 0, D: 0 };

    // ========================================================================
    // DUAL TETRAHEDRON SEED MODEL
    // ========================================================================
    // Use dual tetrahedron at origin as the "hub" from which tetrahelix
    // chains grow in both + and - directions.
    //
    // Dual tetrahedron vertices point along Quadray axes:
    //   V0: (+s, +s, +s)  → QX axis (Red/A)
    //   V1: (+s, -s, -s)  → QZ axis (Green/B)
    //   V2: (-s, +s, -s)  → QY axis (Blue/C)
    //   V3: (-s, -s, +s)  → QW axis (Yellow/D)
    //
    // Each face is opposite one vertex, perpendicular to that axis.
    // ========================================================================

    const s = halfSize;

    // Dual tetrahedron vertices
    const seedVertices = [
      new THREE.Vector3(s, s, s), // V0: QX direction
      new THREE.Vector3(s, -s, -s), // V1: QZ direction
      new THREE.Vector3(-s, s, -s), // V2: QY direction
      new THREE.Vector3(-s, -s, s), // V3: QW direction
    ];

    // Face definitions (CCW winding, outward normals)
    // Each face is opposite one vertex
    const SEED_FACES = {
      A: [1, 2, 3], // Opposite V0 (QX)
      B: [0, 3, 2], // Opposite V1 (QZ)
      C: [0, 1, 3], // Opposite V2 (QY)
      D: [0, 2, 1], // Opposite V3 (QW)
    };

    // Map startFace to seed face indices
    const seedFaceIndices = SEED_FACES[startFace] || SEED_FACES.A;

    // Edge length and expected quadrance (dual tet edge = 2√2·s)
    const edgeLength = 2 * Math.sqrt(2) * halfSize;
    const expectedQ = edgeLength * edgeLength;

    // Apex distance for chain generation: h = L × √(2/3)
    const apexDistance = edgeLength * Math.sqrt(2 / 3);

    // Initialize with seed tetrahedron
    const allVertices = seedVertices.map(v => v.clone());
    const tetrahedra = [[0, 1, 2, 3]]; // Seed tetrahedron

    const calculateCentroid = (v0, v1, v2) => {
      return new THREE.Vector3(
        (v0.x + v1.x + v2.x) / 3,
        (v0.y + v1.y + v2.y) / 3,
        (v0.z + v1.z + v2.z) / 3
      );
    };

    const calculateFaceNormal = (v0, v1, v2, tetraCentroid) => {
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      const faceCentroid = calculateCentroid(v0, v1, v2);
      const outwardDir = new THREE.Vector3().subVectors(
        faceCentroid,
        tetraCentroid
      );
      if (normal.dot(outwardDir) < 0) {
        normal.negate();
      }
      return normal;
    };

    const getTetraCentroid = verts => {
      return new THREE.Vector3(
        (verts[0].x + verts[1].x + verts[2].x + verts[3].x) / 4,
        (verts[0].y + verts[1].y + verts[2].y + verts[3].y) / 4,
        (verts[0].z + verts[1].z + verts[2].z + verts[3].z) / 4
      );
    };

    const getTetraCentroidByIndices = tetIndices => {
      const v0 = allVertices[tetIndices[0]];
      const v1 = allVertices[tetIndices[1]];
      const v2 = allVertices[tetIndices[2]];
      const v3 = allVertices[tetIndices[3]];
      return new THREE.Vector3(
        (v0.x + v1.x + v2.x + v3.x) / 4,
        (v0.y + v1.y + v2.y + v3.y) / 4,
        (v0.z + v1.z + v2.z + v3.z) / 4
      );
    };

    // ========================================================================
    // IN-PLACE JAVELIN MODEL (Bi-directional from Center)
    // ========================================================================
    // Generate the center tetrahedron at origin, then spiral outward in both
    // + and - directions simultaneously. This eliminates the visual jumping
    // that occurs with the "generate-then-shift" approach.
    //
    // Key insight: Both directions use the SAME spiral chirality (same exit
    // face pattern). The - direction calculates "predecessors" by working
    // backwards from the center tetrahedron.
    //
    // For count=N tetrahedra total:
    // - Plus direction: floor(N/2) tetrahedra extending in + direction
    // - Minus direction: ceil(N/2) tetrahedra extending in - direction
    // - The center tetrahedron is shared (counted once)
    // ========================================================================

    // Helper: Generate chain in + direction (forward - apex calculation)
    const generateForwardChain = (
      startVerts,
      startIndices,
      numTets,
      exitFaceIdx
    ) => {
      const chainTets = [];
      let currentVerts = [...startVerts];
      let currentIndices = [...startIndices];

      for (let i = 0; i < numTets; i++) {
        // Face 3 is always entry face (shared with previous tet)
        // Exit through face 0, 1, or 2 based on exit face pattern
        const faceLocalIndices = [0, 1, 2, 3].filter(j => j !== 3);
        const exitFace = faceLocalIndices[exitFaceIdx % 3];
        const nextFaceLocalIndices = [0, 1, 2, 3].filter(j => j !== exitFace);

        const nfv0 = currentVerts[nextFaceLocalIndices[0]];
        const nfv1 = currentVerts[nextFaceLocalIndices[1]];
        const nfv2 = currentVerts[nextFaceLocalIndices[2]];

        const tetCentroid = getTetraCentroid(currentVerts);
        const nextFaceCentroid = calculateCentroid(nfv0, nfv1, nfv2);
        const nextFaceNormal = calculateFaceNormal(
          nfv0,
          nfv1,
          nfv2,
          tetCentroid
        );

        const newApex = nextFaceCentroid
          .clone()
          .add(nextFaceNormal.multiplyScalar(apexDistance));
        const newApexIndex = allVertices.length;
        allVertices.push(newApex);

        const sharedGlobalIndices = nextFaceLocalIndices.map(
          li => currentIndices[li]
        );

        const newTetIndices = [...sharedGlobalIndices, newApexIndex];
        tetrahedra.push(newTetIndices);
        chainTets.push(newTetIndices);

        currentVerts = [nfv0, nfv1, nfv2, newApex];
        currentIndices = newTetIndices;
      }

      return chainTets;
    };

    // FIXED exit face pattern for linear extension
    const chainExitFaceLocalIdx = 0;

    // Calculate how many tetrahedra in each direction
    // count is the number of tetrahedra in each arm (not including center)
    // So total tetrahedra = 2*count + 1 (center + count on each side)
    // But we want total tetrahedra to match count, so:
    // - plusCount = floor((count-1)/2)
    // - minusCount = ceil((count-1)/2)
    // This gives count total tetrahedra with center at origin
    const plusCount = Math.floor((count - 1) / 2);
    const minusCount = Math.ceil((count - 1) / 2);

    // ========================================================================
    // STEP 1: Position seed tetrahedron at origin
    // ========================================================================
    // The seed is already at origin (vertices at ±s). We use the seed as the
    // center tetrahedron of our javelin.

    const seedCentroid = getTetraCentroid(allVertices);
    const startFaceVertIndices = [...seedFaceIndices];

    // Get the + direction face (startFace) for forward chain
    const plusFv0 = allVertices[startFaceVertIndices[0]];
    const plusFv1 = allVertices[startFaceVertIndices[1]];
    const plusFv2 = allVertices[startFaceVertIndices[2]];

    // ========================================================================
    // STEP 2: Generate + direction chain (forward from seed)
    // ========================================================================
    // The + direction exits through startFace (e.g., face A = [1,2,3])
    // Each new tetrahedron shares this face with the previous one
    if (dirPlus && plusCount > 0) {
      const plusFaceCentroid = calculateCentroid(plusFv0, plusFv1, plusFv2);
      const plusFaceNormal = calculateFaceNormal(
        plusFv0,
        plusFv1,
        plusFv2,
        seedCentroid
      );

      // First tetrahedron in + direction
      const firstPlusApex = plusFaceCentroid
        .clone()
        .add(plusFaceNormal.multiplyScalar(apexDistance));
      const firstPlusApexIndex = allVertices.length;
      allVertices.push(firstPlusApex);

      const firstPlusTetIndices = [...startFaceVertIndices, firstPlusApexIndex];
      tetrahedra.push(firstPlusTetIndices);

      // Continue + chain if more tetrahedra needed
      if (plusCount > 1) {
        generateForwardChain(
          [plusFv0, plusFv1, plusFv2, firstPlusApex],
          firstPlusTetIndices,
          plusCount - 1,
          chainExitFaceLocalIdx
        );
      }
    }

    // ========================================================================
    // STEP 3: Generate - direction chain (REFLECTION-BASED BACKWARD GENERATION)
    // ========================================================================
    // Mathematical insight: The predecessor tetrahedron can be found by
    // REFLECTING the apex through the entry face centroid.
    //
    // In forward generation:
    //   newApex = faceCentroid + outwardNormal × apexDistance
    //
    // The predecessor's unique vertex is at:
    //   predApex = faceCentroid - outwardNormal × apexDistance
    //            = 2 × faceCentroid - currentApex  (reflection formula)
    //
    // This is the exact mathematical inverse of the forward step!
    //
    // For the seed tetrahedron [0, 1, 2, 3] with exit through startFace:
    // - Seed's local chain ordering: [V0, V1, V2, V3] where exit [V1,V2,V3] = startFace
    // - Entry face (from predecessor): [V0, V1, V2] = local indices [0, 1, 2]
    // - Current "apex" in chain sense: V3
    // - Predecessor apex: 2 × centroid(V0, V1, V2) - V3
    //
    // See Tetrahelix.md "TRUE BACKWARD GENERATION" section for full derivation.
    // ========================================================================

    // Helper: Generate backward chain using reflection
    const generateBackwardChain = (startVerts, startIndices, numTets) => {
      const chainTets = [];
      let currentVerts = [...startVerts]; // [v0, v1, v2, apex]
      let currentIndices = [...startIndices];

      for (let i = 0; i < numTets; i++) {
        // Entry face is [v0, v1, v2] at local indices [0, 1, 2]
        const v0 = currentVerts[0];
        const v1 = currentVerts[1];
        const v2 = currentVerts[2];
        const apex = currentVerts[3];

        // Calculate entry face centroid
        const entryCentroid = calculateCentroid(v0, v1, v2);

        // REFLECTION: predecessor apex = 2 × entryCentroid - apex
        const predApex = new THREE.Vector3(
          2 * entryCentroid.x - apex.x,
          2 * entryCentroid.y - apex.y,
          2 * entryCentroid.z - apex.z
        );

        const predApexIndex = allVertices.length;
        allVertices.push(predApex);

        // Predecessor tet: [predApex, v0, v1, v2]
        // This ordering makes [predApex, v0, v1] the new entry face
        const predTetIndices = [
          predApexIndex,
          currentIndices[0],
          currentIndices[1],
          currentIndices[2],
        ];
        tetrahedra.push(predTetIndices);
        chainTets.push(predTetIndices);

        // Update for next iteration
        // Predecessor's entry face: [predApex, v0, v1] = local [0, 1, 2]
        // Predecessor's apex: v2 = local [3]
        currentVerts = [predApex, v0, v1, v2];
        currentIndices = predTetIndices;
      }

      return chainTets;
    };

    if (dirMinus && minusCount > 0) {
      // For backward generation, the seed's local chain ordering is [V0, V1, V2, V3]
      // where startFace = [V1, V2, V3] is the exit face (to + direction)
      // The entry face (from predecessor) is [V0, V1, V2]
      //
      // startFace indices are [1, 2, 3] for face A, so:
      // - V0 is vertex 0 (the one NOT in startFace)
      // - Entry face [V0, V1, V2] = [0, startFace[0], startFace[1]] = [0, 1, 2]
      //
      // The "apex" in chain context is V3 = startFace[2]

      // Determine which vertex is NOT in startFace (that's the "local v0")
      const allVertIndices = [0, 1, 2, 3];
      const notInStartFace = allVertIndices.find(
        i => !startFaceVertIndices.includes(i)
      );

      // Seed's chain-local ordering: [notInStartFace, startFace[0], startFace[1], startFace[2]]
      const seedLocalOrdering = [
        notInStartFace,
        startFaceVertIndices[0],
        startFaceVertIndices[1],
        startFaceVertIndices[2],
      ];
      const seedLocalVerts = seedLocalOrdering.map(i => allVertices[i]);

      // Generate backward chain from seed
      generateBackwardChain(seedLocalVerts, seedLocalOrdering, minusCount);
    }

    // ========================================================================
    // MULTI-STRAND GENERATION
    // ========================================================================
    // Two bonding modes:
    // - ZIPPED: Single tetrahedra radiate outward from each primary tet (spinal)
    // - UNZIPPED: Secondary strands follow their own parallel chains (DNA-like)
    // ========================================================================

    if (strands >= 2) {
      const primaryStrandLength = tetrahedra.length;

      if (bondMode === "zipped") {
        // ====================================================================
        // ZIPPED MODE: Radial spines
        // Each secondary strand is a single tetrahedron bonded to each primary
        // ====================================================================
        for (let tetIdx = 0; tetIdx < primaryStrandLength; tetIdx++) {
          const tet = tetrahedra[tetIdx];
          const tetVerts = tet.map(idx => allVertices[idx]);
          const tetraCentroid = getTetraCentroid(tetVerts);

          const bondingFaces = [];
          if (strands >= 2) bondingFaces.push(1);
          if (strands >= 3) bondingFaces.push(2);
          if (strands >= 4 && tetIdx === 0) bondingFaces.push(3);

          for (const faceIdx of bondingFaces) {
            const faceVertIndices = [0, 1, 2, 3].filter(j => j !== faceIdx);
            const fv0 = tetVerts[faceVertIndices[0]];
            const fv1 = tetVerts[faceVertIndices[1]];
            const fv2 = tetVerts[faceVertIndices[2]];

            const faceCentroid = calculateCentroid(fv0, fv1, fv2);
            const faceNormal = calculateFaceNormal(
              fv0,
              fv1,
              fv2,
              tetraCentroid
            );

            const newApex = faceCentroid
              .clone()
              .add(faceNormal.multiplyScalar(apexDistance));
            const newApexIndex = allVertices.length;
            allVertices.push(newApex);

            const sharedGlobalIndices = faceVertIndices.map(li => tet[li]);
            const newTetIndices = [...sharedGlobalIndices, newApexIndex];
            tetrahedra.push(newTetIndices);
          }
        }
      } else {
        // ====================================================================
        // UNZIPPED MODE: Independent Strands from Seed Faces
        // Each secondary strand starts from a different face of the seed
        // tetrahedron and grows using the SAME algorithm as primary strand.
        //
        // The four faces of the seed point in tetrahedral directions
        // (~109.47° apart), so strands naturally radiate outward.
        // ====================================================================

        const seedTet = tetrahedra[0];
        const seedVerts = seedTet.map(idx => allVertices[idx]);
        const seedTetraCentroid = getTetraCentroid(seedVerts);

        // Determine which seed faces to start secondary strands from
        // Face 0 is used by primary strand, so secondary strands use faces 1, 2, 3
        // Map seed face index to strand label for exitFaces lookup
        const SEED_FACE_TO_STRAND = { 1: "B", 2: "C", 3: "D" };
        const startingFaces = [];
        if (strands >= 2) startingFaces.push(1);
        if (strands >= 3) startingFaces.push(2);
        if (strands >= 4) startingFaces.push(3);

        for (const seedFaceIdx of startingFaces) {
          const strandLabel = SEED_FACE_TO_STRAND[seedFaceIdx];
          // Get the face vertices (face N is opposite vertex N)
          const seedFaceVertIndices = [0, 1, 2, 3].filter(
            j => j !== seedFaceIdx
          );

          const sfv0 = seedVerts[seedFaceVertIndices[0]];
          const sfv1 = seedVerts[seedFaceVertIndices[1]];
          const sfv2 = seedVerts[seedFaceVertIndices[2]];

          const seedFaceCentroid = calculateCentroid(sfv0, sfv1, sfv2);
          const seedFaceNormal = calculateFaceNormal(
            sfv0,
            sfv1,
            sfv2,
            seedTetraCentroid
          );

          // First tetrahedron of secondary strand
          let secApex = seedFaceCentroid
            .clone()
            .add(seedFaceNormal.multiplyScalar(apexDistance));
          let secApexIndex = allVertices.length;
          allVertices.push(secApex);

          const secSharedGlobalIndices = seedFaceVertIndices.map(
            li => seedTet[li]
          );
          let secTetIndices = [...secSharedGlobalIndices, secApexIndex];
          tetrahedra.push(secTetIndices);

          // Current state for this secondary strand
          let secCurrentVerts = [sfv0, sfv1, sfv2, secApex];
          let secCurrentIndices = secTetIndices;
          // Use the configured exit face for this strand (B, C, or D)
          let secExitFaceLocalIdx = exitFaces[strandLabel] ?? 0;

          // Continue the secondary chain for (count - 1) more tetrahedra
          // Using identical algorithm to primary strand
          for (let i = 1; i < count; i++) {
            const secFaceLocalIndices = [0, 1, 2, 3].filter(
              j => j !== secExitFaceLocalIdx
            );

            const secFv0 = secCurrentVerts[secFaceLocalIndices[0]];
            const secFv1 = secCurrentVerts[secFaceLocalIndices[1]];
            const secFv2 = secCurrentVerts[secFaceLocalIndices[2]];

            const secTetraCentroid = getTetraCentroid(secCurrentVerts);
            const secFaceCentroid = calculateCentroid(secFv0, secFv1, secFv2);
            const secFaceNormal = calculateFaceNormal(
              secFv0,
              secFv1,
              secFv2,
              secTetraCentroid
            );

            const secNewApex = secFaceCentroid
              .clone()
              .add(secFaceNormal.multiplyScalar(apexDistance));
            const secNewApexIndex = allVertices.length;
            allVertices.push(secNewApex);

            const secNewSharedGlobalIndices = secFaceLocalIndices.map(
              li => secCurrentIndices[li]
            );
            const secNewTetIndices = [
              ...secNewSharedGlobalIndices,
              secNewApexIndex,
            ];
            tetrahedra.push(secNewTetIndices);

            secCurrentVerts = [secFv0, secFv1, secFv2, secNewApex];
            secCurrentIndices = secNewTetIndices;

            // Use the configured exit face for this strand consistently
            secExitFaceLocalIdx = exitFaces[strandLabel] ?? 0;
          }
        }
      }
    }

    // Build edges
    const edgeSet = new Set();
    const addEdge = (a, b) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edgeSet.add(key);
    };

    tetrahedra.forEach(tet => {
      addEdge(tet[0], tet[1]);
      addEdge(tet[0], tet[2]);
      addEdge(tet[0], tet[3]);
      addEdge(tet[1], tet[2]);
      addEdge(tet[1], tet[3]);
      addEdge(tet[2], tet[3]);
    });

    const edges = Array.from(edgeSet).map(key => {
      const [a, b] = key.split("-").map(Number);
      return [a, b];
    });

    // Build faces
    const allFaces = [];
    tetrahedra.forEach(tet => {
      const faces = [
        [tet[1], tet[2], tet[3]],
        [tet[0], tet[2], tet[3]],
        [tet[0], tet[1], tet[3]],
        [tet[0], tet[1], tet[2]],
      ];

      const tetraCentroid = getTetraCentroidByIndices(tet);
      faces.forEach(face => {
        const v0 = allVertices[face[0]];
        const v1 = allVertices[face[1]];
        const v2 = allVertices[face[2]];
        const faceCentroid = calculateCentroid(v0, v1, v2);
        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2);
        const outwardDir = new THREE.Vector3().subVectors(
          faceCentroid,
          tetraCentroid
        );

        if (normal.dot(outwardDir) < 0) {
          const tmp = face[1];
          face[1] = face[2];
          face[2] = tmp;
        }

        allFaces.push(face);
      });
    });

    // RT Validation
    const validation = RT.validateEdges(allVertices, edges, expectedQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const faceSpread = RT.FaceSpreads.tetrahedron();

    const directionLabel =
      (dirPlus ? "+" : "") + (dirMinus ? "-" : "") || "none";
    MetaLog.identity("Tetrahelix2 (Linear)", "", {
      construction: `count=${count}, strands=${strands}, bondMode=${bondMode}, directions=${directionLabel}, halfSize=${halfSize}`,
    });
    MetaLog.rtMetrics({
      V: allVertices.length,
      E: edges.length,
      F: allFaces.length,
      edgeQ: expectedQ,
      maxError,
    });
    MetaLog.construction([
      `Pattern: Javelin (axis-aligned exit face selection)`,
      `Start face: ${startFace}, Directions: ${directionLabel}, Strands: ${strands}, Mode: ${bondMode}`,
      `Total tetrahedra: ${tetrahedra.length}`,
    ]);

    return {
      vertices: allVertices,
      edges,
      faces: allFaces,
      faceSpread,
      metadata: {
        variant: "tetrahelix2",
        count,
        startFace,
        dirPlus,
        dirMinus,
        strands,
        bondMode,
        tetrahedra: tetrahedra.length,
        expectedQ,
      },
    };
  },

  // ========================================================================
  // CHIRALITY TOGGLE (commented out for reuse in future variants)
  // ========================================================================
  // To enable chirality selection, uncomment and add to options:
  //
  // const leftHanded = options.leftHanded || false;
  //
  // Then in the face cycling section:
  // if (leftHanded) {
  //   // 0 -> 2 -> 1 -> 0
  //   exitFaceLocalIdx =
  //     exitFaceLocalIdx === 0 ? 2 : exitFaceLocalIdx === 2 ? 1 : 0;
  // } else {
  //   // 0 -> 1 -> 2 -> 0 (self-intersects at step 12!)
  //   exitFaceLocalIdx = (exitFaceLocalIdx + 1) % 3;
  // }
  // ========================================================================

  /**
   * Tetrahelix 3: Linear variant with octahedral seed
   *
   * Starts from an octahedron instead of a tetrahedron. The octahedron has
   * 8 triangular faces (A-H), and each enabled strand bonds a tetrahelix
   * chain to that face, radiating outward.
   *
   * @param {number} halfSize - Half-size of base octahedron
   * @param {Object} options
   * @param {number} options.count - Number of tetrahedra per strand (default: 10, max: 145)
   * @param {Object} options.enabledStrands - Which faces have strands: { A: true/false, B: true/false, ... H: true/false }
   * @param {Object} options.strandChirality - Chirality per strand: { A: true/false, ... H: true/false } (true=RH, false=LH)
   * @returns {Object} { vertices, edges, faces, metadata }
   */
  // BUG (non-critical): Packed node sizing uses octahedron edge Q for tetrahelix3,
  // but the helix strands are tetrahedral chains with their own (smaller) edge Q.
  // Result: packed nodes on helix strands are slightly too large.
  // Fix would require passing per-strand edge Q to the node sizing system.
  tetrahelix3: (halfSize = 1, options = {}) => {
    const count = Math.min(Math.max(options.count || 10, 1), 145);
    // Default: only strand A enabled
    const enabledStrands = options.enabledStrands || {
      A: true,
      B: false,
      C: false,
      D: false,
      E: false,
      F: false,
      G: false,
      H: false,
    };
    // Default: all strands right-handed (true = RH, false = LH)
    const strandChirality = options.strandChirality || {
      A: true,
      B: true,
      C: true,
      D: true,
      E: true,
      F: true,
      G: true,
      H: true,
    };

    // Generate seed octahedron (6 vertices at ±s on each axis)
    const s = halfSize;
    const seedOctaVertices = [
      new THREE.Vector3(s, 0, 0), // V0: +X
      new THREE.Vector3(-s, 0, 0), // V1: -X
      new THREE.Vector3(0, s, 0), // V2: +Y
      new THREE.Vector3(0, -s, 0), // V3: -Y
      new THREE.Vector3(0, 0, s), // V4: +Z
      new THREE.Vector3(0, 0, -s), // V5: -Z
    ];

    // Octahedron has 8 triangular faces (each face is 3 vertices)
    // Face labeling: A-H, arranged as 4 upper hemisphere + 4 lower hemisphere
    // Upper hemisphere (+Y): faces sharing V2
    // Lower hemisphere (-Y): faces sharing V3
    const OCTA_FACES = {
      A: [0, 2, 4], // +X, +Y, +Z
      B: [4, 2, 1], // +Z, +Y, -X
      C: [1, 2, 5], // -X, +Y, -Z
      D: [5, 2, 0], // -Z, +Y, +X
      E: [0, 4, 3], // +X, +Z, -Y
      F: [4, 1, 3], // +Z, -X, -Y
      G: [1, 5, 3], // -X, -Z, -Y
      H: [5, 0, 3], // -Z, +X, -Y
    };

    const FACE_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

    const allVertices = [...seedOctaVertices];
    const tetrahedra = [];

    // Edge quadrance for octahedron with halfSize s: Q = 2s² (axis-aligned vertices)
    // But tetrahedra bonded to faces will have edge Q = 2s² (octahedron edge length)
    const octaEdgeQ = 2 * halfSize * halfSize;
    const apexDistance = HelixHelpers.apexDistanceFromQ(octaEdgeQ);

    const octaCentroid = HelixHelpers.getOctaCentroid(seedOctaVertices);

    // Build list of enabled strands from the enabledStrands object
    const activeStrands = FACE_LABELS.filter(label => enabledStrands[label]);

    // Generate strands for each enabled face
    for (const faceLabel of activeStrands) {
      const faceVertIndices = OCTA_FACES[faceLabel];

      const fv0 = seedOctaVertices[faceVertIndices[0]];
      const fv1 = seedOctaVertices[faceVertIndices[1]];
      const fv2 = seedOctaVertices[faceVertIndices[2]];

      const faceCentroid = HelixHelpers.calculateCentroid(fv0, fv1, fv2);
      const faceNormal = HelixHelpers.calculateFaceNormal(
        fv0,
        fv1,
        fv2,
        octaCentroid
      );

      // First tetrahedron of this strand (bonded to octahedron face)
      const firstApex = faceCentroid
        .clone()
        .add(faceNormal.multiplyScalar(apexDistance));
      const firstApexIndex = allVertices.length;
      allVertices.push(firstApex);

      // The first tetrahedron shares the 3 octahedron face vertices + new apex
      const firstTetIndices = [...faceVertIndices, firstApexIndex];
      tetrahedra.push(firstTetIndices);

      // Continue the chain for (count - 1) more tetrahedra
      let currentVerts = [fv0, fv1, fv2, firstApex];
      let currentIndices = firstTetIndices;

      // LH/RH twist controls which exit face is used for chain continuation
      // Exit face 0 = RH twist, Exit face 2 = LH twist
      const isRightHanded = strandChirality[faceLabel] !== false;
      const exitFaceLocalIdx = isRightHanded ? 0 : 2;

      for (let i = 1; i < count; i++) {
        // Face 3 is always the entry face (shared with previous tet)
        // So we exit through one of faces 0, 1, 2
        const faceLocalIndices = [0, 1, 2, 3].filter(j => j !== 3);
        // Select exit face from available (exclude entry face which is index 3)
        const exitFace = faceLocalIndices[exitFaceLocalIdx % 3];
        const nextFaceLocalIndices = [0, 1, 2, 3].filter(j => j !== exitFace);

        const nfv0 = currentVerts[nextFaceLocalIndices[0]];
        const nfv1 = currentVerts[nextFaceLocalIndices[1]];
        const nfv2 = currentVerts[nextFaceLocalIndices[2]];

        const tetraCentroid = HelixHelpers.getTetraCentroid(currentVerts);
        const nextFaceCentroid = HelixHelpers.calculateCentroid(
          nfv0,
          nfv1,
          nfv2
        );
        const nextFaceNormal = HelixHelpers.calculateFaceNormal(
          nfv0,
          nfv1,
          nfv2,
          tetraCentroid
        );

        const newApex = nextFaceCentroid
          .clone()
          .add(nextFaceNormal.multiplyScalar(apexDistance));
        const newApexIndex = allVertices.length;
        allVertices.push(newApex);

        const sharedGlobalIndices = nextFaceLocalIndices.map(
          li => currentIndices[li]
        );
        const newTetIndices = [...sharedGlobalIndices, newApexIndex];
        tetrahedra.push(newTetIndices);

        currentVerts = [nfv0, nfv1, nfv2, newApex];
        currentIndices = newTetIndices;
      }
    }

    // Build edges and faces
    const edges = HelixHelpers.buildEdges(tetrahedra);
    const allFaces = HelixHelpers.buildFaces(tetrahedra, allVertices);

    // Add octahedron edges (not part of tetrahedra)
    const octaEdges = [
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 4],
      [2, 5],
      [3, 4],
      [3, 5],
    ];
    const edgeSet = new Set(
      edges.map(e => (e[0] < e[1] ? `${e[0]}-${e[1]}` : `${e[1]}-${e[0]}`))
    );
    octaEdges.forEach(e => {
      const key = e[0] < e[1] ? `${e[0]}-${e[1]}` : `${e[1]}-${e[0]}`;
      if (!edgeSet.has(key)) {
        edges.push(e);
      }
    });

    // RT Validation
    const validation = RT.validateEdges(allVertices, edges, octaEdgeQ);
    const maxError = validation.reduce((max, v) => Math.max(max, v.error), 0);
    const faceSpread = RT.FaceSpreads.tetrahedron();

    // Build chirality summary for active strands
    const chiralitySummary = activeStrands
      .map(
        label => `${label}:${strandChirality[label] !== false ? "RH" : "LH"}`
      )
      .join(", ");

    MetaLog.identity("Tetrahelix3 (Octahedral)", "", {
      construction: `count=${count}, halfSize=${halfSize}`,
    });
    MetaLog.rtMetrics({
      V: allVertices.length,
      E: edges.length,
      F: allFaces.length,
      edgeQ: octaEdgeQ,
      maxError,
    });
    MetaLog.construction([
      `Enabled strands: ${activeStrands.join(", ") || "none"}`,
      `Chirality: ${chiralitySummary || "none"}`,
      `Total tetrahedra: ${tetrahedra.length}`,
    ]);

    return {
      vertices: allVertices,
      edges,
      faces: allFaces,
      faceSpread,
      metadata: {
        variant: "tetrahelix3",
        count,
        enabledStrands,
        strandChirality,
        activeStrands,
        tetrahedra: tetrahedra.length,
        expectedQ: octaEdgeQ,
      },
    };
  },
};
