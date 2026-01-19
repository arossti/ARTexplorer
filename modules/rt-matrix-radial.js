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
     * Cube total count (space-filling): (2f-1)³
     * Solid cube-of-cubes at each frequency level
     * F1=1, F2=27 (3³), F3=125 (5³), F4=343 (7³), F5=729 (9³)
     */
    cube: frequency => Math.pow(2 * frequency - 1, 3),

    /**
     * Cube radial stellation count (face-neighbors only, octahedral growth)
     * Uses taxicab/Manhattan distance: |x| + |y| + |z| <= (f-1)
     * This creates octahedral shape, not cubic
     * F1=1, F2=7, F3=25, F4=63, F5=129
     * Formula: (2f-1)(2f²-2f+3)/3 = centered octahedral numbers
     */
    cubeStellation: frequency => {
      const f = frequency;
      // Centered octahedral numbers: (2n-1)(2n²-2n+3)/3
      return Math.round(((2 * f - 1) * (2 * f * f - 2 * f + 3)) / 3);
    },

    /**
     * Rhombic Dodecahedron total count (FCC lattice, space-filling)
     * Formula: (10f³ - 15f² + 11f - 3) / 3
     * F1=1, F2=13, F3=55, F4=147, F5=309
     */
    rhombicDodec: frequency => {
      const f = frequency;
      return Math.round((10 * f * f * f - 15 * f * f + 11 * f - 3) / 3);
    },

    /**
     * Rhombic Dodecahedron shell-only count (outer layer of FCC)
     * F1=1, F2=12, F3=42, F4=92, F5=162
     * Shell(f) = Total(f) - Total(f-1)
     */
    rhombicDodecShell: frequency => {
      if (frequency === 1) return 1;
      const f = frequency;
      const total = Math.round((10 * f * f * f - 15 * f * f + 11 * f - 3) / 3);
      const inner = Math.round(
        (10 * (f - 1) * (f - 1) * (f - 1) -
          15 * (f - 1) * (f - 1) +
          11 * (f - 1) -
          3) /
          3
      );
      return total - inner;
    },

    /**
     * Tetrahedron stellation count (face-connected only, no IVM fill)
     * Each tet has 4 faces; F2 adds 4 tets (stella octangula core)
     * Growth follows tetrahedral numbers pattern
     * F1=1, F2=5, F3=15, F4=35, F5=70
     * Formula: f(f+1)(f+2)/6 = tetrahedral numbers
     */
    tetrahedron: frequency => {
      const f = frequency;
      return Math.round((f * (f + 1) * (f + 2)) / 6);
    },

    /**
     * Octahedron count (vertex-to-vertex stellation)
     * Each oct has 6 vertices; F2 adds 6 octs at vertex directions
     * F1=1, F2=7, F3=25, F4=63, F5=129
     * Same as cube stellation (centered octahedral numbers)
     */
    octahedron: frequency => {
      const f = frequency;
      return Math.round(((2 * f - 1) * (2 * f * f - 2 * f + 3)) / 3);
    },

    /**
     * Cuboctahedron (VE) count - FCC-like close packing
     * Each VE has 12 vertices = 12 neighbors at F2
     * F1=1, F2=13, F3=55, F4=147, F5=309
     * Same as RD (both are FCC lattice)
     */
    cuboctahedron: frequency => {
      const f = frequency;
      return Math.round((10 * f * f * f - 15 * f * f + 11 * f - 3) / 3);
    },
  },

  /**
   * Generate positions for radial cube matrix at given frequency
   *
   * Two modes:
   * - spaceFilling=true: Solid (2f-1)³ cube-of-cubes (F2=27, F3=125)
   * - spaceFilling=false: Face-connected stellation only (F2=7, F3=25)
   *
   * Stellation uses octahedral growth pattern - only face-neighbors, no corner/edge fill
   * This creates a 3D cross/octahedral shape rather than a solid cube
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between cube centers (2 × halfSize)
   * @param {boolean} spaceFilling - If true, solid cube; if false, octahedral stellation
   * @returns {Array} Array of {x, y, z} positions
   */
  getCubePositions: (frequency, spacing, spaceFilling = true) => {
    const positions = [];

    if (spaceFilling) {
      // Fill entire (2f-1)³ volume - solid cube-of-cubes
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
      // Stellation: Face-connected octahedral growth
      // Only include positions where |x| + |y| + |z| <= (frequency - 1)
      // This is the taxicab/Manhattan distance constraint (octahedral shape)
      const maxDist = frequency - 1;
      for (let x = -maxDist; x <= maxDist; x++) {
        for (let y = -maxDist; y <= maxDist; y++) {
          for (let z = -maxDist; z <= maxDist; z++) {
            // Octahedral constraint: sum of absolute values <= max distance
            if (Math.abs(x) + Math.abs(y) + Math.abs(z) <= maxDist) {
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
   * FCC lattice structure:
   * - Primitive positions: (0,0,0) and face-centers of cubic cell
   * - Each site has 12 nearest neighbors at distance spacing/√2
   * - Neighbors at: (±1,±1,0), (±1,0,±1), (0,±1,±1) × spacing/2
   *
   * Shell counting uses FCC coordination shells:
   * - Shell 0 (F1): origin only → 1 total
   * - Shell 1 (F2): 12 neighbors → 13 total
   * - Shell 2 (F3): 42 more → 55 total
   * - Shell 3 (F4): 92 more → 147 total
   * - Shell 4 (F5): 162 more → 309 total
   *
   * FCC shell n contains points where the "FCC norm" = n
   * FCC norm: For half-integer coords (i,j,k) where i+j+k is even,
   *           norm = (|i| + |j| + |k|) / 2
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between RD centers along cubic axis
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

    // FCC shell metric: sum of absolute half-integer coordinates / 2
    // This gives the minimum number of nearest-neighbor hops from origin
    // Shell 0: origin (0,0,0)
    // Shell 1: 12 neighbors at (±1,±1,0) permutations → sum=2 → shell=1
    // Shell 2: next layer at (±2,0,0), (±2,±2,0), (±1,±1,±2) etc → sum=2,4 → shell=1,2

    const halfSpacing = spacing / 2;
    const maxShell = frequency - 1;
    // Search extent: FCC points can reach sum = 2*maxShell with coords up to 2*maxShell
    const maxCoord = maxShell * 2;

    for (let i = -maxCoord; i <= maxCoord; i++) {
      for (let j = -maxCoord; j <= maxCoord; j++) {
        for (let k = -maxCoord; k <= maxCoord; k++) {
          // FCC condition: i + j + k must be even
          if ((i + j + k) % 2 !== 0) continue;

          // FCC shell number = taxicab distance / 2 in half-integer coords
          // This equals the minimum number of nearest-neighbor hops
          const shell = (Math.abs(i) + Math.abs(j) + Math.abs(k)) / 2;

          if (shell > maxShell) continue; // Outside frequency range

          // For shell-only (stellation) mode, only include positions in outermost shell
          if (!spaceFilling && shell !== maxShell && frequency > 1) continue;

          addPosition(i * halfSpacing, j * halfSpacing, k * halfSpacing);
        }
      }
    }

    // Debug: log shell distribution
    console.log(`[RTRadialMatrix] RD positions debug: frequency=${frequency}, spaceFilling=${spaceFilling}, maxShell=${maxShell}, total=${positions.length}`);

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

    const expectedCount = spaceFilling
      ? RTRadialMatrix.shellCounts.cube(frequency)
      : RTRadialMatrix.shellCounts.cubeStellation(frequency);

    // Detailed logging for debugging
    console.log(`[RTRadialMatrix] ========== CUBE RADIAL MATRIX ==========`);
    console.log(`[RTRadialMatrix] Frequency: F${frequency}`);
    console.log(`[RTRadialMatrix] Mode: ${spaceFilling ? 'SPACE-FILLING' : 'SHELL-ONLY'}`);
    console.log(`[RTRadialMatrix] Center positions generated: ${positions.length}`);
    console.log(`[RTRadialMatrix] Expected polyhedra count: ${expectedCount}`);
    console.log(`[RTRadialMatrix] Match: ${positions.length === expectedCount ? '✓' : '✗ MISMATCH'}`);
    console.log(`[RTRadialMatrix] Polyhedra in THREE.Group: ${matrixGroup.children.length}`);
    console.log(`[RTRadialMatrix] =========================================`);

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

    const expectedCount = spaceFilling
      ? RTRadialMatrix.shellCounts.rhombicDodec(frequency)
      : RTRadialMatrix.shellCounts.rhombicDodecShell(frequency);

    // Detailed logging for debugging
    console.log(`[RTRadialMatrix] ========== RHOMBIC DODEC RADIAL MATRIX ==========`);
    console.log(`[RTRadialMatrix] Frequency: F${frequency}`);
    console.log(`[RTRadialMatrix] Mode: ${spaceFilling ? 'SPACE-FILLING' : 'SHELL-ONLY'}`);
    console.log(`[RTRadialMatrix] Center positions generated: ${positions.length}`);
    console.log(`[RTRadialMatrix] Expected polyhedra count: ${expectedCount}`);
    console.log(`[RTRadialMatrix] Match: ${positions.length === expectedCount ? '✓' : '✗ MISMATCH'}`);
    console.log(`[RTRadialMatrix] Polyhedra in THREE.Group: ${matrixGroup.children.length}`);
    console.log(`[RTRadialMatrix] ================================================`);

    return matrixGroup;
  },

  // ============================================================
  // PHASE 3: IVM POLYHEDRA (Tetrahedron, Octahedron, Cuboctahedron)
  // ============================================================

  /**
   * Generate positions for radial tetrahedron matrix at given frequency
   *
   * Tetrahedra grow via face-connected stellation (Stella Octangula pattern)
   * Each face of center tet gets a 180° rotated tet attached
   *
   * The tetrahedra exist on TWO interleaved lattices (like tet + dual tet)
   * - "Up" tets at positions where (i+j+k) mod 2 = 0
   * - "Down" tets at positions where (i+j+k) mod 2 = 1
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between tet centers
   * @returns {Array} Array of {x, y, z, orientation} positions
   */
  getTetrahedronPositions: (frequency, spacing) => {
    const positions = [];

    // Tetrahedra fill space on a BCC-like dual lattice
    // For stellation, use taxicab distance like octahedron
    const maxDist = frequency - 1;

    for (let i = -maxDist; i <= maxDist; i++) {
      for (let j = -maxDist; j <= maxDist; j++) {
        for (let k = -maxDist; k <= maxDist; k++) {
          // Taxicab constraint for tetrahedral growth
          if (Math.abs(i) + Math.abs(j) + Math.abs(k) <= maxDist) {
            // Orientation alternates based on parity
            const orientation = (i + j + k) % 2 === 0 ? "up" : "down";
            positions.push({
              x: i * spacing,
              y: j * spacing,
              z: k * spacing,
              orientation,
            });
          }
        }
      }
    }

    return positions;
  },

  /**
   * Generate positions for radial octahedron matrix at given frequency
   *
   * Standard vertex-to-vertex stellation using taxicab/Manhattan distance.
   * Same lattice as cube stellation - centered octahedral numbers.
   *
   * NOTE: IVM close-packing with proper outsphere radius spacing and
   * layer offsets is a future enhancement - requires different lattice logic.
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between oct centers
   * @returns {Array} Array of {x, y, z} positions
   */
  getOctahedronPositions: (frequency, spacing) => {
    const positions = [];

    // Standard mode: same as cube stellation - octahedral growth pattern
    const maxDist = frequency - 1;

    for (let x = -maxDist; x <= maxDist; x++) {
      for (let y = -maxDist; y <= maxDist; y++) {
        for (let z = -maxDist; z <= maxDist; z++) {
          if (Math.abs(x) + Math.abs(y) + Math.abs(z) <= maxDist) {
            positions.push({
              x: x * spacing,
              y: y * spacing,
              z: z * spacing,
            });
          }
        }
      }
    }

    return positions;
  },

  /**
   * Generate positions for radial cuboctahedron (VE) matrix at given frequency
   *
   * VEs pack on FCC lattice (same as rhombic dodecahedra)
   * 12 neighbors at vertex directions
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between VE centers
   * @returns {Array} Array of {x, y, z} positions
   */
  getCuboctahedronPositions: (frequency, spacing) => {
    const positions = [];
    const visited = new Set();

    const addPosition = (x, y, z) => {
      const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
      if (!visited.has(key)) {
        visited.add(key);
        positions.push({ x, y, z });
      }
    };

    // FCC lattice - same as RD positions
    const halfSpacing = spacing / 2;
    const maxShell = frequency - 1;
    const maxCoord = maxShell * 2;

    for (let i = -maxCoord; i <= maxCoord; i++) {
      for (let j = -maxCoord; j <= maxCoord; j++) {
        for (let k = -maxCoord; k <= maxCoord; k++) {
          if ((i + j + k) % 2 !== 0) continue;

          const shell = (Math.abs(i) + Math.abs(j) + Math.abs(k)) / 2;
          if (shell > maxShell) continue;

          addPosition(i * halfSpacing, j * halfSpacing, k * halfSpacing);
        }
      }
    }

    return positions;
  },

  /**
   * Create radial tetrahedron matrix expanding from central nucleus
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} halfSize - Half the cube edge that inscribes the tet
   * @param {number} opacity - Face opacity (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all tetrahedron instances
   */
  createRadialTetrahedronMatrix: (frequency, halfSize, opacity, color, THREE) => {
    const matrixGroup = new THREE.Group();
    // Spacing for face-to-face contact: 2 * (2/3) * height = 4√6/3 * halfSize
    // But for IVM lattice, use 2 * halfSize (cube edge)
    const spacing = halfSize * 2;

    const positions = RTRadialMatrix.getTetrahedronPositions(frequency, spacing);

    positions.forEach(pos => {
      const tetGroup = new THREE.Group();

      // Get geometry based on orientation
      const tetGeom =
        pos.orientation === "up"
          ? Polyhedra.tetrahedron(halfSize)
          : Polyhedra.dualTetrahedron(halfSize);

      const { vertices, edges, faces } = tetGeom;

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
      tetGroup.add(faceMesh);

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
      tetGroup.add(edgeLines);

      matrixGroup.add(tetGroup);
    });

    const expectedCount = RTRadialMatrix.shellCounts.tetrahedron(frequency);

    console.log(`[RTRadialMatrix] ========== TETRAHEDRON RADIAL MATRIX ==========`);
    console.log(`[RTRadialMatrix] Frequency: F${frequency}`);
    console.log(`[RTRadialMatrix] Center positions generated: ${positions.length}`);
    console.log(`[RTRadialMatrix] Expected polyhedra count: ${expectedCount}`);
    console.log(`[RTRadialMatrix] Match: ${positions.length === expectedCount ? '✓' : '✗ MISMATCH'}`);
    console.log(`[RTRadialMatrix] Polyhedra in THREE.Group: ${matrixGroup.children.length}`);
    console.log(`[RTRadialMatrix] ================================================`);

    return matrixGroup;
  },

  /**
   * Create radial octahedron matrix expanding from central nucleus
   *
   * IVM Scale option: When ivmScale=true, octahedra are scaled 2× so their
   * triangular faces match the tetrahedron face size. This enables IVM
   * (octet truss) complementary space-filling when combined with tet matrix.
   *
   * Geometry relationship:
   * - Tetrahedron edge = 2√2 × halfSize (inscribed in cube of edge 2×halfSize)
   * - Octahedron edge = √2 × halfSize (vertices at ±halfSize on axes)
   * - To match: scale octahedron by 2 → edge = 2√2 × halfSize
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} halfSize - Half the octahedron span (vertex to center)
   * @param {number} opacity - Face opacity (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @param {boolean} ivmScale - If true, scale 2× to match tetrahedron faces
   * @returns {THREE.Group} Group containing all octahedron instances
   */
  createRadialOctahedronMatrix: (
    frequency,
    halfSize,
    opacity,
    color,
    THREE,
    ivmScale = false
  ) => {
    const matrixGroup = new THREE.Group();

    // IVM scale: double the octahedron size to match tetrahedron face size
    const octSize = ivmScale ? halfSize * 2 : halfSize;
    // Spacing remains based on original halfSize for lattice alignment
    const spacing = halfSize * 2;

    // Standard integer lattice positions (IVM close-packing is a future enhancement)
    const positions = RTRadialMatrix.getOctahedronPositions(frequency, spacing);

    const octGeom = Polyhedra.octahedron(octSize);
    const { vertices, edges, faces } = octGeom;

    positions.forEach(pos => {
      const octGroup = new THREE.Group();

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
      octGroup.add(faceMesh);

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
      octGroup.add(edgeLines);

      matrixGroup.add(octGroup);
    });

    const expectedCount = RTRadialMatrix.shellCounts.octahedron(frequency);

    console.log(`[RTRadialMatrix] ========== OCTAHEDRON RADIAL MATRIX ==========`);
    console.log(`[RTRadialMatrix] Frequency: F${frequency}`);
    console.log(`[RTRadialMatrix] IVM Scale: ${ivmScale ? '2× (match tet faces)' : '1× (standard)'}`);
    console.log(`[RTRadialMatrix] Center positions generated: ${positions.length}`);
    console.log(`[RTRadialMatrix] Expected polyhedra count: ${expectedCount}`);
    console.log(`[RTRadialMatrix] Match: ${positions.length === expectedCount ? '✓' : '✗ MISMATCH'}`);
    console.log(`[RTRadialMatrix] Polyhedra in THREE.Group: ${matrixGroup.children.length}`);
    console.log(`[RTRadialMatrix] ==============================================`);

    return matrixGroup;
  },

  /**
   * Create radial cuboctahedron (VE) matrix expanding from central nucleus
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} halfSize - Half the cuboctahedron span
   * @param {number} opacity - Face opacity (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all cuboctahedron instances
   */
  createRadialCuboctahedronMatrix: (frequency, halfSize, opacity, color, THREE) => {
    const matrixGroup = new THREE.Group();
    // VEs pack on FCC lattice with spacing = 2 * halfSize
    const spacing = halfSize * 2;

    const positions = RTRadialMatrix.getCuboctahedronPositions(frequency, spacing);

    const veGeom = Polyhedra.cuboctahedron(halfSize);
    const { vertices, edges, faces } = veGeom;

    positions.forEach(pos => {
      const veGroup = new THREE.Group();

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
      veGroup.add(faceMesh);

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
      veGroup.add(edgeLines);

      matrixGroup.add(veGroup);
    });

    const expectedCount = RTRadialMatrix.shellCounts.cuboctahedron(frequency);

    console.log(`[RTRadialMatrix] ========== CUBOCTAHEDRON RADIAL MATRIX ==========`);
    console.log(`[RTRadialMatrix] Frequency: F${frequency}`);
    console.log(`[RTRadialMatrix] Center positions generated: ${positions.length}`);
    console.log(`[RTRadialMatrix] Expected polyhedra count: ${expectedCount}`);
    console.log(`[RTRadialMatrix] Match: ${positions.length === expectedCount ? '✓' : '✗ MISMATCH'}`);
    console.log(`[RTRadialMatrix] Polyhedra in THREE.Group: ${matrixGroup.children.length}`);
    console.log(`[RTRadialMatrix] =================================================`);

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
