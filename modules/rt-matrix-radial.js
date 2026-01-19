/**
 * rt-matrix-radial.js
 * Radial Frequency Matrix Generator (Concentric Shell Expansion)
 *
 * Generates radial/concentric arrays of polyhedra expanding outward from a
 * central nucleus, following crystallographic growth patterns.
 *
 * See also: rt-matrix-planar.js (planar N×N grid arrays)
 *
 * RT-Pure Implementation:
 * - Uses quadrance (Q = distance²) for spacing calculations
 * - Defers √ expansion until final Vector3 creation
 * - Leverages RT rotation functions for orientation
 *
 * References:
 * - Fuller's Synergetics: Section 400-480 (IVM), 950-954 (Closest Packing)
 * - Geometry documents/Matrix-Radial.md (workplan)
 */

import { RT } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js";

/**
 * Radial Matrix generation module for concentric shell expansion
 * @namespace RTRadialMatrix
 */
export const RTRadialMatrix = {
  /**
   * Shell count formulas for space-filling polyhedra
   * Returns total count of polyhedra for a given frequency
   */
  shellCounts: {
    /**
     * Cube shell count: (2f-1)³ for solid cube-of-cubes
     * F1=1, F2=7, F3=25, F4=63, F5=125
     */
    cube: frequency => Math.pow(2 * frequency - 1, 3),

    /**
     * Rhombic Dodecahedron shell count (FCC lattice)
     * Formula: (10f³ - 15f² + 11f - 3) / 3
     * F1=1, F2=13, F3=55, F4=147, F5=309
     */
    rhombicDodec: frequency => {
      const f = frequency;
      return (10 * f * f * f - 15 * f * f + 11 * f - 3) / 3;
    },
  },

  /**
   * Generate positions for radial cube matrix at given frequency
   * Uses simple cubic lattice - cubes tile perfectly in 3D
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between cube centers (2 × halfSize)
   * @param {boolean} spaceFilling - If true, fill all positions; if false, shell only
   * @returns {Array} Array of {x, y, z} positions
   */
  getCubePositions: (frequency, spacing, spaceFilling = true) => {
    const positions = [];

    if (spaceFilling) {
      // Fill entire (2f-1)³ volume
      const extent = frequency - 1; // Range: -extent to +extent
      for (let x = -extent; x <= extent; x++) {
        for (let y = -extent; y <= extent; y++) {
          for (let z = -extent; z <= extent; z++) {
            positions.push({
              x: x * spacing,
              y: y * spacing,
              z: z * spacing,
            });
          }
        }
      }
    } else {
      // Shell only - positions where at least one coordinate is at max extent
      const extent = frequency - 1;
      for (let x = -extent; x <= extent; x++) {
        for (let y = -extent; y <= extent; y++) {
          for (let z = -extent; z <= extent; z++) {
            // Include only if on the outer shell
            if (
              Math.abs(x) === extent ||
              Math.abs(y) === extent ||
              Math.abs(z) === extent
            ) {
              positions.push({
                x: x * spacing,
                y: y * spacing,
                z: z * spacing,
              });
            }
          }
        }
      }
    }

    return positions;
  },

  /**
   * Generate positions for radial rhombic dodecahedron matrix at given frequency
   * Uses FCC (face-centered cubic) lattice - rhombic dodecs tile perfectly
   *
   * The 12 neighbor directions from F1 to F2:
   * - 6 along cubic axes: (±1,0,0), (0,±1,0), (0,0,±1)
   * - 6 along face diagonals: (±0.5,±0.5,0), (±0.5,0,±0.5), (0,±0.5,±0.5)
   *   But normalized to spacing, the diagonal positions are at (±s,±s,0)/√2 etc.
   *   Actually for rhombic dodec, the 12 neighbors are at:
   *   - 6 at (±s,0,0), (0,±s,0), (0,0,±s) - face-to-face via square-type rhombi
   *   - 6 at (±s/2,±s/2,±s/2) combinations where exactly 2 signs match
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between centers for cubic directions (2 × halfSize)
   * @param {boolean} spaceFilling - If true, fill all positions; if false, shell only
   * @returns {Array} Array of {x, y, z} positions
   */
  getRhombicDodecPositions: (frequency, spacing, spaceFilling = true) => {
    const positions = [];
    const visited = new Set();

    // Helper to add position if not visited
    const addPosition = (x, y, z) => {
      const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
      if (!visited.has(key)) {
        visited.add(key);
        positions.push({ x, y, z });
      }
    };

    // FCC lattice: positions at (i,j,k) where i+j+k is even
    // Scale: spacing is the cubic cell size
    // For rhombic dodec, we need half-integer positions too

    if (spaceFilling) {
      // Generate FCC lattice positions up to frequency
      // FCC has basis: (0,0,0), (0.5,0.5,0), (0.5,0,0.5), (0,0.5,0.5)
      const extent = frequency - 1;
      const halfSpacing = spacing / 2;

      for (let i = -extent; i <= extent; i++) {
        for (let j = -extent; j <= extent; j++) {
          for (let k = -extent; k <= extent; k++) {
            // Primary cubic positions
            addPosition(i * spacing, j * spacing, k * spacing);

            // FCC interstitial positions (if within extent)
            if (Math.abs(i) < extent || Math.abs(j) < extent) {
              addPosition(
                i * spacing + halfSpacing,
                j * spacing + halfSpacing,
                k * spacing
              );
            }
            if (Math.abs(i) < extent || Math.abs(k) < extent) {
              addPosition(
                i * spacing + halfSpacing,
                j * spacing,
                k * spacing + halfSpacing
              );
            }
            if (Math.abs(j) < extent || Math.abs(k) < extent) {
              addPosition(
                i * spacing,
                j * spacing + halfSpacing,
                k * spacing + halfSpacing
              );
            }
          }
        }
      }
    } else {
      // Shell only mode - just the outermost layer
      // For F1, just origin
      if (frequency === 1) {
        addPosition(0, 0, 0);
      } else {
        // TODO: Implement shell-only for higher frequencies
        // For now, fall back to space-filling
        return RTRadialMatrix.getRhombicDodecPositions(
          frequency,
          spacing,
          true
        );
      }
    }

    return positions;
  },

  /**
   * Create radial cube matrix expanding from central nucleus
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} halfSize - Half the cube edge length
   * @param {boolean} spaceFilling - Fill all positions vs shell only
   * @param {number} opacity - Face opacity (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all cube instances
   */
  createRadialCubeMatrix: (
    frequency,
    halfSize,
    spaceFilling,
    opacity,
    color,
    THREE
  ) => {
    const matrixGroup = new THREE.Group();
    const spacing = halfSize * 2; // Edge-to-edge contact

    // Get positions for this frequency
    const positions = RTRadialMatrix.getCubePositions(
      frequency,
      spacing,
      spaceFilling
    );

    // Get base cube geometry
    const cubeGeom = Polyhedra.cube(halfSize);
    const { vertices, edges, faces } = cubeGeom;

    // Create cube at each position
    positions.forEach(pos => {
      const cubeGroup = new THREE.Group();

      // Build face geometry
      const positionsArray = [];
      const indices = [];

      vertices.forEach(v => {
        positionsArray.push(v.x + pos.x, v.y + pos.y, v.z + pos.z);
      });

      faces.forEach(faceIndices => {
        for (let k = 1; k < faceIndices.length - 1; k++) {
          indices.push(faceIndices[0], faceIndices[k], faceIndices[k + 1]);
        }
      });

      const faceGeometry = new THREE.BufferGeometry();
      faceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positionsArray, 3)
      );
      faceGeometry.setIndex(indices);
      faceGeometry.computeVertexNormals();

      const faceMaterial = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.FrontSide,
        depthWrite: opacity >= 0.99,
        flatShading: true,
      });

      const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
      faceMesh.renderOrder = 1;
      cubeGroup.add(faceMesh);

      // Render edges
      const edgePositions = [];
      edges.forEach(([vi, vj]) => {
        const v1 = vertices[vi];
        const v2 = vertices[vj];
        edgePositions.push(v1.x + pos.x, v1.y + pos.y, v1.z + pos.z);
        edgePositions.push(v2.x + pos.x, v2.y + pos.y, v2.z + pos.z);
      });

      const edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(edgePositions, 3)
      );

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 1,
        depthTest: true,
        depthWrite: true,
      });

      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edgeLines.renderOrder = 2;
      cubeGroup.add(edgeLines);

      matrixGroup.add(cubeGroup);
    });

    const expectedCount = RTRadialMatrix.shellCounts.cube(frequency);
    console.log(
      `[RTRadialMatrix] Radial Cube matrix created: F${frequency}, spaceFilling=${spaceFilling}, count=${positions.length} (expected=${expectedCount})`
    );

    return matrixGroup;
  },

  /**
   * Create radial rhombic dodecahedron matrix expanding from central nucleus
   * Perfect space-filling - rhombic dodecahedra tile 3D space
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} halfSize - Half the cube edge length (rhombic dodec scale)
   * @param {boolean} spaceFilling - Fill all positions vs shell only
   * @param {number} opacity - Face opacity (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all rhombic dodecahedron instances
   */
  createRadialRhombicDodecMatrix: (
    frequency,
    halfSize,
    spaceFilling,
    opacity,
    color,
    THREE
  ) => {
    const matrixGroup = new THREE.Group();
    const spacing = halfSize * 2; // Same spacing as cube matrix

    // Get positions for this frequency
    const positions = RTRadialMatrix.getRhombicDodecPositions(
      frequency,
      spacing,
      spaceFilling
    );

    // Get base rhombic dodecahedron geometry
    // Scale by √2 because rhombicDodecahedron(s) has axial vertices at s/√2
    const rhombicDodecGeom = Polyhedra.rhombicDodecahedron(
      halfSize * Math.sqrt(2)
    );
    const { vertices, edges, faces } = rhombicDodecGeom;

    // Create rhombic dodec at each position
    positions.forEach(pos => {
      const polyGroup = new THREE.Group();

      // Build face geometry
      const positionsArray = [];
      const indices = [];

      vertices.forEach(v => {
        positionsArray.push(v.x + pos.x, v.y + pos.y, v.z + pos.z);
      });

      faces.forEach(faceIndices => {
        for (let k = 1; k < faceIndices.length - 1; k++) {
          indices.push(faceIndices[0], faceIndices[k], faceIndices[k + 1]);
        }
      });

      const faceGeometry = new THREE.BufferGeometry();
      faceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positionsArray, 3)
      );
      faceGeometry.setIndex(indices);
      faceGeometry.computeVertexNormals();

      const faceMaterial = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: opacity >= 0.99,
        flatShading: true,
      });

      const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
      faceMesh.renderOrder = 1;
      polyGroup.add(faceMesh);

      // Render edges
      const edgePositions = [];
      edges.forEach(([vi, vj]) => {
        const v1 = vertices[vi];
        const v2 = vertices[vj];
        edgePositions.push(v1.x + pos.x, v1.y + pos.y, v1.z + pos.z);
        edgePositions.push(v2.x + pos.x, v2.y + pos.y, v2.z + pos.z);
      });

      const edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(edgePositions, 3)
      );

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 1,
        depthTest: true,
        depthWrite: true,
      });

      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edgeLines.renderOrder = 2;
      polyGroup.add(edgeLines);

      matrixGroup.add(polyGroup);
    });

    const expectedCount = RTRadialMatrix.shellCounts.rhombicDodec(frequency);
    console.log(
      `[RTRadialMatrix] Radial Rhombic Dodec matrix created: F${frequency}, spaceFilling=${spaceFilling}, count=${positions.length} (expected=${expectedCount})`
    );

    return matrixGroup;
  },

  /**
   * Validate radial matrix spacing using quadrance (RT-pure)
   *
   * @param {Array} positions - Array of {x, y, z} positions
   * @param {number} expectedSpacing - Expected minimum distance between neighbors
   * @returns {Object} Validation result with min/max/avg spacing info
   */
  validateRadialSpacing: (positions, expectedSpacing) => {
    if (positions.length < 2) {
      return { valid: true, minSpacing: 0, maxSpacing: 0, avgSpacing: 0 };
    }

    const Q_expected = expectedSpacing * expectedSpacing;
    let minQ = Infinity;
    let maxQ = 0;
    let sumQ = 0;
    let count = 0;

    // Check spacing between nearby positions
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const Q = RT.quadrance(positions[i], positions[j]);
        // Only consider positions that are neighbors (within 1.5× expected spacing)
        if (Q < Q_expected * 2.25) {
          minQ = Math.min(minQ, Q);
          maxQ = Math.max(maxQ, Q);
          sumQ += Q;
          count++;
        }
      }
    }

    const avgQ = count > 0 ? sumQ / count : 0;
    const minSpacing = Math.sqrt(minQ);
    const maxSpacing = Math.sqrt(maxQ);
    const avgSpacing = Math.sqrt(avgQ);

    console.log(
      `[RTRadialMatrix] Spacing validation: expected=${expectedSpacing.toFixed(4)}, ` +
        `min=${minSpacing.toFixed(4)}, max=${maxSpacing.toFixed(4)}, avg=${avgSpacing.toFixed(4)}`
    );

    return {
      valid: Math.abs(minSpacing - expectedSpacing) < 0.01,
      minSpacing,
      maxSpacing,
      avgSpacing,
      Q_expected,
    };
  },
};
