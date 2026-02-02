/**
 * rt-helices.js
 * Helical Geometry Generators for ARTexplorer
 *
 * Generates helical chains of polyhedra using face-sharing algorithms.
 * RT-Pure: Uses quadrance and spread throughout.
 *
 * Variants:
 * - tetrahelix1: Toroidal (left-handed, max 48, approaches torus closure)
 * - tetrahelix2: Linear (stub - for experimentation with non-toroidal extension)
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
    // Cap at 48 for torus near-closure (right-handed self-intersects at 12)
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

    console.log(`[RT] Tetrahelix1 (Toroidal): count=${count}, halfSize=${halfSize}`);
    console.log(
      `  Vertices: ${allVertices.length}, Edges: ${edges.length}, Faces: ${allFaces.length}`
    );
    console.log(
      `  Edge Q: ${expectedQ.toFixed(6)}, max error: ${maxError.toExponential(2)}`
    );
    console.log(`  Chirality: left-handed (fixed)`);
    console.log(`  Start face: ${startFace}`);

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
   * straight line rather than curving back into a torus.
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
   * @param {number} options.count - Number of tetrahedra per strand (default: 10, max: 96)
   * @param {string} options.startFace - Initial face: 'A', 'B', 'C', or 'D' (default: 'A')
   * @param {number} options.strands - Number of parallel strands: 1-4 (default: 1)
   * @param {string} options.bondMode - 'zipped' (radial spines) or 'unzipped' (parallel chains)
   * @returns {Object} { vertices, edges, faces, metadata }
   */
  tetrahelix2: (halfSize = 1, options = {}) => {
    const count = Math.min(Math.max(options.count || 10, 1), 96);
    const startFace = options.startFace || "A";
    const strands = Math.min(Math.max(options.strands || 1, 1), 4);
    const bondMode = options.bondMode || "zipped";

    // Generate seed tetrahedron
    const s = halfSize;
    const seedVertices = [
      new THREE.Vector3(-s, -s, -s), // V0
      new THREE.Vector3(s, s, -s), // V1
      new THREE.Vector3(s, -s, s), // V2
      new THREE.Vector3(-s, s, s), // V3
    ];

    const allVertices = [...seedVertices];
    const tetrahedra = [[0, 1, 2, 3]];

    const expectedQ = 8 * halfSize * halfSize;
    const apexDistanceQ = (2 / 3) * expectedQ;
    const apexDistance = Math.sqrt(apexDistanceQ);

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

    const FACE_LABEL_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

    let currentVerts = [...seedVertices];
    let currentIndices = [0, 1, 2, 3];
    let exitFaceLocalIdx = FACE_LABEL_TO_INDEX[startFace] ?? 0;

    // Generate chain - LINEAR pattern
    // Always exit through face 0 to create zigzag linear extension
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

      // LINEAR: Always exit through face 0 (creates zigzag extending pattern)
      // Face 3 is entry (shared), so we pick face 0 consistently
      exitFaceLocalIdx = 0;
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
            const faceNormal = calculateFaceNormal(fv0, fv1, fv2, tetraCentroid);

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
        const startingFaces = [];
        if (strands >= 2) startingFaces.push(1);
        if (strands >= 3) startingFaces.push(2);
        if (strands >= 4) startingFaces.push(3);

        for (const seedFaceIdx of startingFaces) {
          // Get the face vertices (face N is opposite vertex N)
          const seedFaceVertIndices = [0, 1, 2, 3].filter(j => j !== seedFaceIdx);

          const sfv0 = seedVerts[seedFaceVertIndices[0]];
          const sfv1 = seedVerts[seedFaceVertIndices[1]];
          const sfv2 = seedVerts[seedFaceVertIndices[2]];

          const seedFaceCentroid = calculateCentroid(sfv0, sfv1, sfv2);
          const seedFaceNormal = calculateFaceNormal(sfv0, sfv1, sfv2, seedTetraCentroid);

          // First tetrahedron of secondary strand
          let secApex = seedFaceCentroid
            .clone()
            .add(seedFaceNormal.multiplyScalar(apexDistance));
          let secApexIndex = allVertices.length;
          allVertices.push(secApex);

          const secSharedGlobalIndices = seedFaceVertIndices.map(li => seedTet[li]);
          let secTetIndices = [...secSharedGlobalIndices, secApexIndex];
          tetrahedra.push(secTetIndices);

          // Current state for this secondary strand
          let secCurrentVerts = [sfv0, sfv1, sfv2, secApex];
          let secCurrentIndices = secTetIndices;
          // Use the SAME exit pattern as primary: always exit face 0
          let secExitFaceLocalIdx = 0;

          // Continue the secondary chain for (count - 1) more tetrahedra
          // Using identical algorithm to primary strand
          for (let i = 1; i < count; i++) {
            const secFaceLocalIndices = [0, 1, 2, 3].filter(j => j !== secExitFaceLocalIdx);

            const secFv0 = secCurrentVerts[secFaceLocalIndices[0]];
            const secFv1 = secCurrentVerts[secFaceLocalIndices[1]];
            const secFv2 = secCurrentVerts[secFaceLocalIndices[2]];

            const secTetraCentroid = getTetraCentroid(secCurrentVerts);
            const secFaceCentroid = calculateCentroid(secFv0, secFv1, secFv2);
            const secFaceNormal = calculateFaceNormal(secFv0, secFv1, secFv2, secTetraCentroid);

            const secNewApex = secFaceCentroid
              .clone()
              .add(secFaceNormal.multiplyScalar(apexDistance));
            const secNewApexIndex = allVertices.length;
            allVertices.push(secNewApex);

            const secNewSharedGlobalIndices = secFaceLocalIndices.map(
              li => secCurrentIndices[li]
            );
            const secNewTetIndices = [...secNewSharedGlobalIndices, secNewApexIndex];
            tetrahedra.push(secNewTetIndices);

            secCurrentVerts = [secFv0, secFv1, secFv2, secNewApex];
            secCurrentIndices = secNewTetIndices;

            // Same linear pattern as primary: always exit face 0
            secExitFaceLocalIdx = 0;
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

    console.log(`[RT] Tetrahelix2 (Linear): count=${count}, strands=${strands}, bondMode=${bondMode}, halfSize=${halfSize}`);
    console.log(
      `  Vertices: ${allVertices.length}, Edges: ${edges.length}, Faces: ${allFaces.length}`
    );
    console.log(
      `  Edge Q: ${expectedQ.toFixed(6)}, max error: ${maxError.toExponential(2)}`
    );
    console.log(`  Pattern: Always exit face 0 (linear zigzag)`);
    console.log(`  Start face: ${startFace}, Strands: ${strands}, Mode: ${bondMode}`);
    console.log(`  Total tetrahedra: ${tetrahedra.length}`);

    return {
      vertices: allVertices,
      edges,
      faces: allFaces,
      faceSpread,
      metadata: {
        variant: "tetrahelix2",
        count,
        startFace,
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
};
