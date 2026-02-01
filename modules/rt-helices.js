/**
 * rt-helices.js
 * Helical Geometry Generators for ARTexplorer
 *
 * Generates helical chains of polyhedra using face-sharing algorithms.
 * RT-Pure: Uses quadrance and spread throughout.
 *
 * See: Geometry documents/Tetrahelix.md for specification
 *
 * @requires THREE.js
 * @requires rt-math.js
 */

import { RT } from "./rt-math.js";

// Access THREE.js from global scope (set by main HTML)

/**
 * Helices generator functions
 * @namespace Helices
 */
export const Helices = {
  /**
   * Generate a tetrahelix (chain of face-sharing tetrahedra)
   *
   * Uses face-normal driven generation: the outward normal of the chosen face
   * points to the apex of the next tetrahedron, while the 3 face vertices are shared.
   *
   * The tetrahelix spirals because of the tetrahedral dihedral angle (~70.53°).
   * Each new tetrahedron shares one face with the previous, and the exit face
   * cycles through the three non-shared faces (those containing the apex).
   *
   * @param {number} halfSize - Half-size of base tetrahedron (same as Polyhedra.tetrahedron)
   * @param {Object} options
   * @param {number} options.count - Number of tetrahedra in chain (default: 10, max: 144)
   * @param {string} options.startFace - Initial face to grow from: 'A', 'B', 'C', or 'D' (default: 'A')
   * @param {boolean} options.leftHanded - Chirality (default: false = right-handed)
   * @returns {Object} { vertices, edges, faces, metadata }
   */
  tetrahelix: (halfSize = 1, options = {}) => {
    const count = Math.min(Math.max(options.count || 10, 1), 144);
    const startFace = options.startFace || "A";
    const leftHanded = options.leftHanded || false;

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
    // For equilateral triangle face with edge L, centroid-to-apex = L * sqrt(2/3)
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

      // Ensure normal points outward (away from tetrahedron centroid)
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

    // Face definitions for seed tetrahedron (opposite vertex index)
    // Face 0 (opposite V0): vertices [1, 2, 3]
    // Face 1 (opposite V1): vertices [0, 2, 3]
    // Face 2 (opposite V2): vertices [0, 1, 3]
    // Face 3 (opposite V3): vertices [0, 1, 2]
    const SEED_FACES = [
      [1, 2, 3], // Face 0 (A) - opposite V0
      [0, 2, 3], // Face 1 (B) - opposite V1
      [0, 1, 3], // Face 2 (C) - opposite V2
      [0, 1, 2], // Face 3 (D) - opposite V3
    ];

    // Map user-facing labels to face indices
    const FACE_LABEL_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

    // Current state: track the 4 vertices of current tetrahedron and which face to exit
    let currentVerts = [...seedVertices]; // The 4 Vector3 positions
    let currentIndices = [0, 1, 2, 3]; // Global vertex indices

    // Determine initial exit face from startFace parameter
    let exitFaceLocalIdx = FACE_LABEL_TO_INDEX[startFace] ?? 0;

    // Generate chain
    for (let i = 1; i < count; i++) {
      // Get the 3 vertex indices (local 0-3) of the exit face
      // Exit face is opposite vertex exitFaceLocalIdx
      const faceLocalIndices = [0, 1, 2, 3].filter(j => j !== exitFaceLocalIdx);

      // Get actual vertex positions for the exit face
      const fv0 = currentVerts[faceLocalIndices[0]];
      const fv1 = currentVerts[faceLocalIndices[1]];
      const fv2 = currentVerts[faceLocalIndices[2]];

      // Calculate face centroid and outward normal
      const tetraCentroid = getTetraCentroid(currentVerts);
      const faceCentroid = calculateCentroid(fv0, fv1, fv2);
      const faceNormal = calculateFaceNormal(fv0, fv1, fv2, tetraCentroid);

      // New apex position: centroid + normal * apexDistance
      const newApex = faceCentroid
        .clone()
        .add(faceNormal.multiplyScalar(apexDistance));
      const newApexIndex = allVertices.length;
      allVertices.push(newApex);

      // Global indices of shared vertices
      const sharedGlobalIndices = faceLocalIndices.map(
        li => currentIndices[li]
      );

      // Create new tetrahedron
      // Order: [shared0, shared1, shared2, newApex] where newApex is at local index 3
      const newTetIndices = [...sharedGlobalIndices, newApexIndex];
      tetrahedra.push(newTetIndices);

      // Update current state for next iteration
      // The new tetrahedron's vertices in local order [0,1,2,3]
      currentVerts = [fv0, fv1, fv2, newApex];
      currentIndices = newTetIndices;

      // Determine next exit face
      // The entry face (shared with previous) is face 3 (opposite apex at local index 3)
      // We must exit through one of faces 0, 1, or 2 (the faces containing the apex)
      // Cycle through 0 -> 1 -> 2 -> 0 for right-handed helix
      // Cycle through 0 -> 2 -> 1 -> 0 for left-handed helix
      if (leftHanded) {
        // 0 -> 2 -> 1 -> 0
        exitFaceLocalIdx =
          exitFaceLocalIdx === 0 ? 2 : exitFaceLocalIdx === 2 ? 1 : 0;
      } else {
        // 0 -> 1 -> 2 -> 0
        exitFaceLocalIdx = (exitFaceLocalIdx + 1) % 3;
      }
    }

    // Build edges (6 per tetrahedron, but shared edges only counted once)
    const edgeSet = new Set();
    const addEdge = (a, b) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edgeSet.add(key);
    };

    tetrahedra.forEach(tet => {
      // All 6 edges of tetrahedron
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

    // Build external faces (4 per tetrahedron minus internal shared faces)
    // For now, include all faces and let rendering handle visibility
    const allFaces = [];
    tetrahedra.forEach((tet, tetIdx) => {
      // 4 faces per tetrahedron
      const faces = [
        [tet[1], tet[2], tet[3]], // Face A (opposite tet[0])
        [tet[0], tet[2], tet[3]], // Face B (opposite tet[1])
        [tet[0], tet[1], tet[3]], // Face C (opposite tet[2])
        [tet[0], tet[1], tet[2]], // Face D (opposite tet[3])
      ];

      // Fix winding for outward normals
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
          // Reverse winding
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
    const faceSpread = RT.FaceSpreads.tetrahedron(); // S = 8/9

    console.log(`[RT] Tetrahelix: count=${count}, halfSize=${halfSize}`);
    console.log(
      `  Vertices: ${allVertices.length}, Edges: ${edges.length}, Faces: ${allFaces.length}`
    );
    console.log(
      `  Edge Q: ${expectedQ.toFixed(6)}, max error: ${maxError.toExponential(2)}`
    );
    console.log(`  Chirality: ${leftHanded ? "left" : "right"}-handed`);
    console.log(`  Start face: ${startFace}`);

    return {
      vertices: allVertices,
      edges,
      faces: allFaces,
      faceSpread,
      metadata: {
        count,
        startFace,
        leftHanded,
        tetrahedra: tetrahedra.length,
        expectedQ,
      },
    };
  },
};
