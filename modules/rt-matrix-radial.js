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
   * RT-Pure integer division with assertion
   * Performs exact integer division, throwing if result is not exact.
   * This ensures we catch any mathematical errors immediately rather than
   * silently rounding.
   *
   * @param {number} numerator - The dividend (must be divisible by divisor)
   * @param {number} divisor - The divisor
   * @param {string} context - Description for error message
   * @returns {number} Exact integer quotient
   * @throws {Error} If division is not exact
   */
  exactDiv: (numerator, divisor, context = "division") => {
    const result = numerator / divisor;
    if (!Number.isInteger(result)) {
      throw new Error(
        `RT-Pure violation in ${context}: ${numerator}/${divisor} = ${result} (not an integer)`
      );
    }
    return result;
  },

  /**
   * Shell count formulas for space-filling polyhedra
   * Returns total count of polyhedra for a given frequency
   *
   * RT-Pure Implementation:
   * All formulas produce exact integers by mathematical proof.
   * We use exactDiv() instead of Math.round() to assert correctness
   * and catch any implementation errors immediately.
   */
  shellCounts: {
    /**
     * Cube total count (space-filling): (2f-1)³
     * Solid cube-of-cubes at each frequency level
     * F1=1, F2=27 (3³), F3=125 (5³), F4=343 (7³), F5=729 (9³)
     *
     * Mathematical proof: (2f-1) is odd integer, odd³ is integer ✓
     */
    cube: frequency => Math.pow(2 * frequency - 1, 3),

    /**
     * Cube radial stellation count (face-neighbors only, octahedral growth)
     * Uses taxicab/Manhattan distance: |x| + |y| + |z| <= (f-1)
     * This creates octahedral shape, not cubic
     * F1=1, F2=7, F3=25, F4=63, F5=129
     * Formula: (2f-1)(2f²-2f+3)/3 = centered octahedral numbers (OEIS A001845)
     *
     * Mathematical proof of divisibility by 3:
     * - f ≡ 0 (mod 3): 2f²-2f+3 ≡ 0+0+0 ≡ 0 (mod 3)
     * - f ≡ 1 (mod 3): 2f²-2f+3 ≡ 2-2+0 ≡ 0 (mod 3)
     * - f ≡ 2 (mod 3): 2f-1 ≡ 4-1 ≡ 0 (mod 3)
     */
    cubeStellation: frequency => {
      const f = frequency;
      const numerator = (2 * f - 1) * (2 * f * f - 2 * f + 3);
      return RTRadialMatrix.exactDiv(numerator, 3, "cubeStellation");
    },

    /**
     * Rhombic Dodecahedron total count (FCC lattice, space-filling)
     * Formula: (10f³ - 15f² + 11f - 3) / 3
     * F1=1, F2=13, F3=55, F4=147, F5=309
     *
     * Mathematical proof of divisibility by 3:
     * 10f³ - 15f² + 11f - 3 ≡ f³ + 0 + 2f + 0 ≡ f(f² + 2) (mod 3)
     * For f ≡ 0: 0 ≡ 0 (mod 3) ✓
     * For f ≡ 1: 1(1+2) = 3 ≡ 0 (mod 3) ✓
     * For f ≡ 2: 2(4+2) = 12 ≡ 0 (mod 3) ✓
     */
    rhombicDodec: frequency => {
      const f = frequency;
      const numerator = 10 * f * f * f - 15 * f * f + 11 * f - 3;
      return RTRadialMatrix.exactDiv(numerator, 3, "rhombicDodec");
    },

    /**
     * Rhombic Dodecahedron shell-only count (outer layer of FCC)
     * F1=1, F2=12, F3=42, F4=92, F5=162
     * Shell(f) = Total(f) - Total(f-1)
     *
     * Difference of two exact integers is exact ✓
     */
    rhombicDodecShell: frequency => {
      if (frequency === 1) return 1;
      const f = frequency;
      const totalNum = 10 * f * f * f - 15 * f * f + 11 * f - 3;
      const g = f - 1;
      const innerNum = 10 * g * g * g - 15 * g * g + 11 * g - 3;
      const total = RTRadialMatrix.exactDiv(totalNum, 3, "rhombicDodecShell total");
      const inner = RTRadialMatrix.exactDiv(innerNum, 3, "rhombicDodecShell inner");
      return total - inner;
    },

    /**
     * Tetrahedron stellation count (face-connected only, no IVM fill)
     * F1=1, F2=4, F3=10, F4=20, F5=35
     * Formula: f(f+1)(f+2)/6 = tetrahedral numbers (OEIS A000292)
     *
     * Mathematical proof of divisibility by 6:
     * Product of 3 consecutive integers f, f+1, f+2:
     * - At least one is divisible by 2 (consecutive integers)
     * - At least one is divisible by 3 (consecutive integers)
     * Therefore product is divisible by 2×3 = 6 ✓
     *
     * Note: These are standard tetrahedral numbers, not centered.
     */
    tetrahedron: frequency => {
      const f = frequency;
      const numerator = f * (f + 1) * (f + 2);
      return RTRadialMatrix.exactDiv(numerator, 6, "tetrahedron");
    },

    /**
     * Octahedron count (vertex-to-vertex stellation)
     * Each oct has 6 vertices; F2 adds 6 octs at vertex directions
     * F1=1, F2=7, F3=25, F4=63, F5=129
     * Same as cube stellation (centered octahedral numbers)
     *
     * See cubeStellation for divisibility proof.
     */
    octahedron: frequency => {
      const f = frequency;
      const numerator = (2 * f - 1) * (2 * f * f - 2 * f + 3);
      return RTRadialMatrix.exactDiv(numerator, 3, "octahedron");
    },

    /**
     * Cuboctahedron (VE) count - FCC-like close packing
     * Each VE has 12 vertices = 12 neighbors at F2
     * F1=1, F2=13, F3=55, F4=147, F5=309
     * Same as RD (both are FCC lattice)
     *
     * See rhombicDodec for divisibility proof.
     */
    cuboctahedron: frequency => {
      const f = frequency;
      const numerator = 10 * f * f * f - 15 * f * f + 11 * f - 3;
      return RTRadialMatrix.exactDiv(numerator, 3, "cuboctahedron");
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
   * Two modes:
   * - ivmMode=false: Taxicab stellation (Stella Octangula pattern)
   * - ivmMode=true: FCC lattice ODD parity (fills voids between IVM octahedra)
   *
   * The tetrahedra exist on TWO interleaved lattices (like tet + dual tet)
   * - "Up" tets at positions where (i+j+k) mod 4 = 1
   * - "Down" tets at positions where (i+j+k) mod 4 = 3
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between tet centers
   * @param {boolean} ivmMode - If true, use FCC ODD positions for IVM void filling
   * @returns {Array} Array of {x, y, z, orientation} positions
   */
  getTetrahedronPositions: (frequency, spacing, ivmMode = false) => {
    const positions = [];

    if (!ivmMode) {
      // Standard mode: taxicab stellation
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
    } else {
      // IVM mode: Tetrahedra sit on the 8 faces of the central octahedron
      //
      // Geometry: The octahedron has 8 triangular faces - 4 pointing up (+Z),
      // 4 pointing down (-Z). Tetrahedra rest on these faces with their bases
      // coplanar with the octahedron faces.
      //
      // CRITICAL: Tetrahedra are NOT centered at origin - they're offset
      // vertically so their bases rest on the octahedron faces.
      //
      // Upper layer (4 tetrahedra, Z > 0):
      // - 2 base tetrahedra with parallel top edges (2 opposite sides of square)
      // - 2 dual tetrahedra with perpendicular top edges (other 2 sides)
      // - Together, top edges form a complete square
      //
      // Lower layer (4 tetrahedra, Z < 0):
      // - Inverted arrangement (apexes pointing down)
      //
      // The base tetrahedron vertices are at: (-s,-s,-s), (s,s,-s), (s,-s,s), (-s,s,s)
      // The dual tetrahedron is the 180° rotation (multiply by -1)
      //
      // For IVM octahedra at 2× scale with 4× spacing:
      // - Octahedron halfSize = 2 × base halfSize
      // - Tetrahedron uses base halfSize (edges match oct faces)

      // Tetrahedra positioned at octahedron face centers
      // For octahedron with vertices at (±oct_s, 0, 0), (0, ±oct_s, 0), (0, 0, ±oct_s)
      // Face centroids are at (±oct_s/3, ±oct_s/3, ±oct_s/3) in each octant
      //
      // But for IVM, we use spacing/4 as the offset (same as oct_halfSize/2)
      const offset = spacing / 4;

      // Upper 4 faces (+Z hemisphere): tetrahedra with apex UP
      // Face centroids have Z > 0: (+,+,+), (+,-,+), (-,+,+), (-,-,+)
      // But we need to pair base/dual tets to form square edges at top
      //
      // Looking down Z-axis at the upper square formed by top edges:
      // - Base tet top edge runs along one diagonal direction
      // - Dual tet top edge runs along perpendicular diagonal
      //
      // Upper layer positions (dz = +1):
      // Two base tets at (+,+,+) and (-,-,+) - edges parallel
      // Two dual tets at (+,-,+) and (-,+,+) - edges perpendicular
      const upperLayer = [
        { dx: 1, dy: 1, dz: 1, orientation: "up" },    // base tet
        { dx: -1, dy: -1, dz: 1, orientation: "up" },  // base tet (parallel edge)
        { dx: 1, dy: -1, dz: 1, orientation: "down" }, // dual tet
        { dx: -1, dy: 1, dz: 1, orientation: "down" }, // dual tet (parallel edge)
      ];

      // Lower 4 faces (-Z hemisphere): tetrahedra with apex DOWN
      // Mirror of upper layer with inverted orientations
      const lowerLayer = [
        { dx: 1, dy: 1, dz: -1, orientation: "down" },   // dual tet (apex down)
        { dx: -1, dy: -1, dz: -1, orientation: "down" }, // dual tet
        { dx: 1, dy: -1, dz: -1, orientation: "up" },    // base tet
        { dx: -1, dy: 1, dz: -1, orientation: "up" },    // base tet
      ];

      // The 8 tetrahedral void directions (octant pattern)
      const tetVoidDirs = [...upperLayer, ...lowerLayer];

      // Get all octahedron positions for this frequency
      // Tetrahedra fill voids around EACH octahedron in the FCC lattice
      const octPositions = RTRadialMatrix.getOctahedronPositions(frequency, spacing, true);

      // Use a Set to deduplicate positions (shared voids between adjacent octs)
      const positionSet = new Set();

      octPositions.forEach(octPos => {
        tetVoidDirs.forEach(dir => {
          const x = octPos.x + dir.dx * offset;
          const y = octPos.y + dir.dy * offset;
          const z = octPos.z + dir.dz * offset;

          // Create unique key for deduplication (round to avoid floating point issues)
          const key = `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;

          if (!positionSet.has(key)) {
            positionSet.add(key);
            positions.push({
              x,
              y,
              z,
              orientation: dir.orientation,
            });
          }
        });
      });
    }

    return positions;
  },

  /**
   * Generate positions for radial octahedron matrix at given frequency
   *
   * Two modes:
   * - ivmMode=false: Taxicab stellation (octahedral growth pattern)
   * - ivmMode=true: FCC lattice for edge-to-edge colinearity
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between oct centers
   * @param {boolean} ivmMode - If true, use FCC lattice for edge colinearity
   * @returns {Array} Array of {x, y, z} positions
   */
  getOctahedronPositions: (frequency, spacing, ivmMode = false) => {
    const positions = [];

    if (!ivmMode) {
      // Standard mode: taxicab/Manhattan distance (octahedral growth)
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
    } else {
      // IVM mode: FCC lattice positions for edge-to-edge colinearity
      // FCC has positions at integer coords where sum of coords is even
      // This gives center + 12 neighbors (not 6) for proper edge contact
      const maxShell = frequency - 1;

      for (let i = -maxShell * 2; i <= maxShell * 2; i++) {
        for (let j = -maxShell * 2; j <= maxShell * 2; j++) {
          for (let k = -maxShell * 2; k <= maxShell * 2; k++) {
            // FCC constraint: i+j+k must be even
            if ((i + j + k) % 2 !== 0) continue;

            // Shell metric for FCC: (|i|+|j|+|k|)/2
            const shell = (Math.abs(i) + Math.abs(j) + Math.abs(k)) / 2;
            if (shell <= maxShell) {
              positions.push({
                x: i * (spacing / 2),
                y: j * (spacing / 2),
                z: k * (spacing / 2),
              });
            }
          }
        }
      }
    }

    return positions;
  },

  /**
   * Generate positions for a single XY layer of IVM octahedra (geodesic frequency pattern)
   *
   * Grid pattern alternates based on frequency:
   * - Odd frequency (F1, F3, F5): n×n grid WITH center octahedron (1×1, 3×3, 5×5)
   * - Even frequency (F2, F4): n×n grid with shared VERTEX at origin (2×2, 4×4)
   *
   * The 45° rotation applied later aligns octahedron edges for colinear contact.
   *
   * @param {number} frequency - Frequency for this layer (determines grid size and pattern)
   * @param {number} unit - Grid spacing unit (spacing × SQRT1_2 after rotation)
   * @param {number} z - Z-height for this layer
   * @returns {Array} Array of {x, y, z} positions
   */
  getIVMOctahedronLayer: (frequency, unit, z) => {
    const positions = [];

    if (frequency % 2 === 1) {
      // Odd frequency: n×n grid WITH center (1×1, 3×3, 5×5)
      // Grid coords: 0, ±2, ±4, ... (even integers, including 0)
      const extent = frequency - 1; // F1→0, F3→2, F5→4
      for (let i = -extent; i <= extent; i += 2) {
        for (let j = -extent; j <= extent; j += 2) {
          positions.push({ x: i * unit, y: j * unit, z: z });
        }
      }
    } else {
      // Even frequency: n×n grid with vertex at origin (2×2, 4×4)
      // Grid coords: ±1, ±3, ±5, ... (odd integers, NO zero)
      const extent = frequency - 1; // F2→1, F4→3
      for (let i = -extent; i <= extent; i += 2) {
        if (i === 0) continue; // Skip zero for even frequencies
        for (let j = -extent; j <= extent; j += 2) {
          if (j === 0) continue;
          positions.push({ x: i * unit, y: j * unit, z: z });
        }
      }
    }

    return positions;
  },

  /**
   * Generate all IVM octahedra positions (geodesic frequency expansion)
   *
   * Builds stacked layers following geodesic frequency pattern:
   * - F1: 1 octahedron at origin (odd freq, has center)
   * - F2: 4 on XY (even, vertex at origin) + 1 apex + 1 nadir = 6 total
   * - F3: 9 on XY (3×3, odd, has center) + 4 above + 4 below + 1 top + 1 bottom = 19 total
   * - F4: 16 on XY (4×4, even) + 9 + 9 + 4 + 4 + 1 + 1 = 44 total
   *
   * Each tier up/down decreases frequency by 1, maintaining odd/even alternation.
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Octahedron size (2 × halfSize for IVM scale)
   * @returns {Array} Array of {x, y, z} positions
   */
  getIVMOctahedronPositions: (frequency, spacing) => {
    const positions = [];
    // octSize = spacing/2 (the actual octahedron size = outsphere radius)
    const octSize = spacing / 2;
    // XY unit: Perimeter octahedra at (±1,±1)*unit should be at distance octSize from origin
    // Distance from origin = √2 * unit, so unit = octSize / √2
    // RT-Pure: Use cached √2 from PureRadicals for consistency
    const sqrt2 = RT.PureRadicals.sqrt2();
    const unit = octSize / sqrt2;
    // Z-distance between tiers: apex/nadir at distance octSize from origin
    const zStep = octSize;

    // Build layers from primary (z=0) outward
    // Each tier up/down has frequency-1, frequency-2, etc.
    for (let tier = 0; tier < frequency; tier++) {
      const layerFreq = frequency - tier;
      const z = tier * zStep;

      // Add this layer (and its mirror below for tier > 0)
      positions.push(...RTRadialMatrix.getIVMOctahedronLayer(layerFreq, unit, z));
      if (tier > 0) {
        positions.push(...RTRadialMatrix.getIVMOctahedronLayer(layerFreq, unit, -z));
      }
    }

    return positions;
  },

  /**
   * Generate positions for radial cuboctahedron (VE) matrix at given frequency
   *
   * Cuboctahedra pack by sharing square faces (like cubes), NOT on FCC lattice.
   * Pattern: Stacked n×n grids, with grid size = frequency at each Z level.
   *
   * F1: 1×1 at Z=0 → 1 total
   * F2: 2×2 at Z=0, 1×1 at Z=±spacing → 4 + 2 = 6 total
   * F3: 3×3 at Z=0, 2×2 at Z=±spacing, 1×1 at Z=±2×spacing → 9 + 8 + 2 = 19 total
   *
   * Same stacking logic as planar matrix, extended radially in all directions.
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} spacing - Distance between VE centers (edge length = 2 * halfSize)
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

    // Build stacked layers: each Z level gets an n×n grid
    // Z=0: frequency × frequency grid
    // Z=±spacing: (frequency-1) × (frequency-1) grid
    // Z=±2×spacing: (frequency-2) × (frequency-2) grid
    // etc.

    for (let tier = 0; tier < frequency; tier++) {
      const gridSize = frequency - tier;
      const z = tier * spacing;

      // Generate n×n grid at this Z level (centered at origin)
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const x = (i - gridSize / 2 + 0.5) * spacing;
          const y = (j - gridSize / 2 + 0.5) * spacing;

          addPosition(x, y, z);
          // Mirror to negative Z (except for Z=0)
          if (tier > 0) {
            addPosition(x, y, -z);
          }
        }
      }
    }

    return positions;
  },

  /**
   * Create radial tetrahedron matrix expanding from central nucleus
   *
   * IVM Mode: When ivmMode=true, tetrahedra are positioned to fill voids
   * between IVM octahedra (FCC ODD positions vs octahedra EVEN positions).
   * Uses 4× spacing to match IVM octahedra spacing.
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} halfSize - Half the cube edge that inscribes the tet
   * @param {number} opacity - Face opacity (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @param {boolean} ivmMode - If true, position for IVM void filling
   * @returns {THREE.Group} Group containing all tetrahedron instances
   */
  createRadialTetrahedronMatrix: (
    frequency,
    halfSize,
    opacity,
    color,
    THREE,
    ivmMode = false
  ) => {
    const matrixGroup = new THREE.Group();
    // IVM mode: use 4× spacing to match IVM octahedra
    // Standard: use 2× spacing (cube edge)
    const spacing = ivmMode ? halfSize * 4 : halfSize * 2;

    const positions = RTRadialMatrix.getTetrahedronPositions(frequency, spacing, ivmMode);

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

    // In IVM mode, count differs from standard stellation
    const expectedCount = ivmMode
      ? positions.length  // IVM positions computed, not formula-based yet
      : RTRadialMatrix.shellCounts.tetrahedron(frequency);

    console.log(`[RTRadialMatrix] ========== TETRAHEDRON RADIAL MATRIX ==========`);
    console.log(`[RTRadialMatrix] Frequency: F${frequency}`);
    console.log(`[RTRadialMatrix] Mode: ${ivmMode ? 'IVM (FCC ODD, void filling)' : 'Standard (taxicab)'}`);
    console.log(`[RTRadialMatrix] Spacing: ${spacing} (${ivmMode ? '4×' : '2×'} halfSize)`);
    console.log(`[RTRadialMatrix] Center positions generated: ${positions.length}`);
    if (!ivmMode) {
      console.log(`[RTRadialMatrix] Expected polyhedra count: ${expectedCount}`);
      console.log(`[RTRadialMatrix] Match: ${positions.length === expectedCount ? '✓' : '✗ MISMATCH'}`);
    }
    console.log(`[RTRadialMatrix] Polyhedra in THREE.Group: ${matrixGroup.children.length}`);
    console.log(`[RTRadialMatrix] ================================================`);

    return matrixGroup;
  },

  /**
   * Create radial octahedron matrix expanding from central nucleus
   *
   * Scale options:
   * - ivmScale=false: Standard size (halfSize), taxicab positioning
   * - ivmScale=true: 2× size, FCC lattice, 4× spacing (full IVM mode)
   * - ivmScaleOnly=true: 2× size, geodesic frequency layers (for nesting into tet IVM)
   *
   * Geometry relationship:
   * - Tetrahedron edge = 2√2 × halfSize (inscribed in cube of edge 2×halfSize)
   * - Octahedron edge = √2 × halfSize (vertices at ±halfSize on axes)
   * - To match: scale octahedron by 2 → edge = 2√2 × halfSize
   *
   * IVM Nesting (ivmScaleOnly) - Geodesic Frequency Pattern:
   * - Odd freq (F1, F3, F5): Octahedron at origin (n×n grid with center)
   * - Even freq (F2, F4): Shared vertex at origin (n×n grid, no center)
   * - Each tier up/down decreases frequency by 1, maintaining alternation
   * - 45° rotation aligns edges for colinear contact
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} halfSize - Half the octahedron span (vertex to center)
   * @param {number} opacity - Face opacity (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @param {boolean} ivmScale - If true, full IVM mode (2× size + FCC lattice + 4× spacing)
   * @param {boolean} ivmScaleOnly - If true, 2× size + geodesic layers (for nesting into tet IVM)
   * @returns {THREE.Group} Group containing all octahedron instances
   */
  createRadialOctahedronMatrix: (
    frequency,
    halfSize,
    opacity,
    color,
    THREE,
    ivmScale = false,
    ivmScaleOnly = false
  ) => {
    const matrixGroup = new THREE.Group();

    // Size scaling: 2× when ivmScale OR ivmScaleOnly is true
    const useScaledSize = ivmScale || ivmScaleOnly;
    const octSize = useScaledSize ? halfSize * 2 : halfSize;

    // Spacing depends on mode
    // Standard: 2× halfSize with taxicab positioning
    // Full IVM: 4× halfSize with FCC lattice
    // ivmScaleOnly: 4× halfSize with geodesic frequency layers
    const spacing = (ivmScale || ivmScaleOnly) ? halfSize * 4 : halfSize * 2;

    // Choose position generator based on mode
    let positions;
    if (ivmScaleOnly) {
      // Geodesic frequency layers (odd/even alternation)
      positions = RTRadialMatrix.getIVMOctahedronPositions(frequency, spacing);
    } else {
      // Standard taxicab or full IVM (FCC lattice)
      positions = RTRadialMatrix.getOctahedronPositions(frequency, spacing, ivmScale);
    }

    const octGeom = Polyhedra.octahedron(octSize);
    const { vertices, edges, faces } = octGeom;

    positions.forEach(pos => {
      const octGroup = new THREE.Group();

      // Build face geometry AT ORIGIN (for proper in-place rotation)
      const positionsArray = [];
      const indices = [];

      vertices.forEach(v => {
        positionsArray.push(v.x, v.y, v.z);
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

      // Render edges AT ORIGIN
      const edgePositions = [];
      edges.forEach(([vi, vj]) => {
        const v1 = vertices[vi];
        const v2 = vertices[vj];
        edgePositions.push(v1.x, v1.y, v1.z);
        edgePositions.push(v2.x, v2.y, v2.z);
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

      // Apply 45° in-place rotation for ivmScaleOnly (RT-pure)
      // This aligns octahedron edges for colinear edge contact
      if (ivmScaleOnly) {
        RT.applyRotation45(octGroup);
      }

      // Translate to final position
      octGroup.position.set(pos.x, pos.y, pos.z);

      matrixGroup.add(octGroup);
    });

    console.log(`[RTRadialMatrix] ========== OCTAHEDRON RADIAL MATRIX ==========`);
    console.log(`[RTRadialMatrix] Frequency: F${frequency}`);
    const modeDesc = ivmScale
      ? '2× size, 4× spacing, FCC lattice (full IVM)'
      : ivmScaleOnly
        ? '2× size, geodesic frequency layers (IVM nesting)'
        : '1× size, 2× spacing, taxicab (standard)';
    console.log(`[RTRadialMatrix] Mode: ${modeDesc}`);
    console.log(`[RTRadialMatrix] Octahedron size: ${octSize} (${useScaledSize ? '2×' : '1×'} halfSize)`);
    console.log(`[RTRadialMatrix] Spacing: ${spacing}`);
    if (ivmScaleOnly) {
      console.log(`[RTRadialMatrix] Pattern: ${frequency % 2 === 1 ? 'Odd (oct at origin)' : 'Even (vertex at origin)'}`);
    }
    console.log(`[RTRadialMatrix] Center positions generated: ${positions.length}`);
    console.log(`[RTRadialMatrix] Polyhedra in THREE.Group: ${matrixGroup.children.length}`);
    console.log(`[RTRadialMatrix] ==============================================`);

    // Apply 45° constellation rotation for ivmScaleOnly
    // This rotates the entire octahedra group to align with tetrahedra IVM lattice
    if (ivmScaleOnly) {
      RT.applyRotation45(matrixGroup);
    }

    return matrixGroup;
  },

  /**
   * Create radial cuboctahedron (VE) matrix expanding from central nucleus
   *
   * Scaling: Cuboctahedron scaled by √2 so vertices are at `halfSize` from center
   * (matching octahedron vertex distance for IVM compatibility)
   *
   * From rt-polyhedra.js: cuboctahedron(s) has vertices at s/√2 from origin
   * So cuboctahedron(halfSize * √2) has vertices at halfSize from origin
   * This makes triangular faces match octahedron triangular faces in size
   *
   * @param {number} frequency - Shell frequency (1-5)
   * @param {number} halfSize - Base scale (same as octahedron halfSize)
   * @param {number} opacity - Face opacity (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all cuboctahedron instances
   */
  createRadialCuboctahedronMatrix: (frequency, halfSize, opacity, color, THREE) => {
    const matrixGroup = new THREE.Group();

    // Scale cuboctahedron by √2 so vertices are at halfSize (matching octahedron)
    // This makes triangular faces the same size as octahedron faces
    const scaledHalfSize = halfSize * Math.sqrt(2);

    // Edge length = scaledHalfSize * √2 = 2 * halfSize
    // For face-to-face contact, spacing = edge length
    const spacing = halfSize * 2;

    const positions = RTRadialMatrix.getCuboctahedronPositions(frequency, spacing);

    const veGeom = Polyhedra.cuboctahedron(scaledHalfSize);
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
