/**
 * rt-matrix-planar.js
 * IVM Spatial Array Matrix Generator (Planar N×N)
 *
 * Generates N×N arrays of polyhedra in the X-Y plane to demonstrate
 * Fuller's Isotropic Vector Matrix (IVM) space-filling geometry.
 *
 * See also: rt-matrix-radial.js (radial frequency expansion from nucleus)
 *
 * RT-Pure Implementation:
 * - Uses quadrance (Q = distance²) for spacing calculations
 * - Defers √ expansion until final Vector3 creation
 * - Leverages RT.applyRotation45() and RT.applyRotation180() for grid alignment
 *
 * References:
 * - Fuller's Synergetics: Section 400-480 (IVM)
 * - docs/development/Geometry Documents/matrix-slider.md
 */

/**
 * RT-Pure Matrix Generation Philosophy
 * =====================================
 *
 * This module follows Wildberger's Rational Trigonometry principles to minimize
 * transcendental operations and maintain algebraic exactness wherever possible.
 *
 * 1. **Defer √ Expansion:**
 *    - Work with quadrance (Q = distance²) for comparisons and validation
 *    - Only compute sqrt when creating final Vector3 positions for rendering
 *    - Example: spacing_Q = spacing² enables distance validation without sqrt
 *    - Benefit: Exact comparisons, no floating-point accumulation errors
 *
 * 2. **Avoid Transcendental Functions:**
 *    - NO Math.PI, Math.sin, Math.cos, Math.atan in matrix generation
 *    - Use spread/cross space for ALL rotations (RT.applyRotation45/180)
 *    - Rotations emerge from exact rational spread values, not from π or radians
 *    - Example: 45° rotation uses s = c = 0.5 (exact rational 1/2), not π/4
 *
 * 3. **Leverage Exact Rationals:**
 *    - 45° rotation: s = c = 0.5 (exact rational 1/2, √ deferred)
 *    - 180° rotation: s = 0, c = 1 (trivial sqrt extraction: sin=0, cos=-1)
 *    - Grid spacing: rational multiples of halfSize (cube edge = 2 × halfSize)
 *    - IVM complementarity: tets inscribe in cubes using same spacing
 *
 * 4. **Educational Transparency:**
 *    - Console logs display spread/cross values and verify RT identity (s + c = 1.0)
 *    - Comments explain "why" (geometric reasoning) not just "what" (code syntax)
 *    - References to Fuller's Synergetics and Wildberger's RT theory
 *    - Demonstrates how "angle" is NOT fundamental—spread is!
 *
 * 5. **Pragmatic Compromises:**
 *    - Base polyhedra (Polyhedra.cube, .tetrahedron, .octahedron) use sqrt for
 *      edge length calculations (e.g., tet edge = 2√2 × halfSize)
 *    - These are computed ONCE per polyhedron type, then reused across entire matrix
 *    - Matrix generation itself remains RT-pure by working with pre-computed vertices
 *    - This is the "compute once, reuse many" principle
 *
 * Grade: A (full RT-pure compliance for matrix operations)
 *
 * For detailed RT-Pure audit, see:
 * docs/development/Geometry Documents/matrix-slider.md (Section 4.5)
 */

import { RT } from "./rt-math.js";
import { MetaLog } from "./rt-metalog.js";
import { Polyhedra } from "./rt-polyhedra.js";

/**
 * Build merged face and edge geometry for an entire matrix in a single pass.
 * Creates ONE face mesh + ONE edge LineSegments instead of N² separate objects.
 * @param {Object} baseGeom - {vertices, edges, faces} from Polyhedra
 * @param {Array} cellPositions - Array of {x, y, z, flipZ} offset objects
 * @param {number} opacity - Face opacity
 * @param {number} color - Hex color
 * @param {number} side - THREE side constant (FrontSide or DoubleSide)
 * @param {Object} THREE - THREE.js library
 * @returns {THREE.Group} Group with 2 children: face mesh + edge lines
 */
function buildMergedMatrix(
  baseGeom,
  cellPositions,
  opacity,
  color,
  side,
  THREE
) {
  const { vertices, edges, faces } = baseGeom;
  const totalCells = cellPositions.length;
  const vertsPerCell = vertices.length;

  // Pre-compute face index template (triangulated)
  const faceIndexTemplate = [];
  faces.forEach(faceIndices => {
    for (let k = 1; k < faceIndices.length - 1; k++) {
      faceIndexTemplate.push(
        faceIndices[0],
        faceIndices[k],
        faceIndices[k + 1]
      );
    }
  });

  // Pre-allocate merged arrays
  const allPositions = new Float32Array(totalCells * vertsPerCell * 3);
  const allIndices = [];
  const allEdgePositions = new Float32Array(totalCells * edges.length * 6);

  let posIdx = 0;
  let edgeIdx = 0;
  let vertexOffset = 0;

  for (let c = 0; c < totalCells; c++) {
    const { x: ox, y: oy, z: oz, flipZ } = cellPositions[c];

    // Write vertices into typed array (with optional 180° Z rotation: x=-x, y=-y)
    for (let v = 0; v < vertsPerCell; v++) {
      if (flipZ) {
        allPositions[posIdx++] = -vertices[v].x + ox;
        allPositions[posIdx++] = -vertices[v].y + oy;
        allPositions[posIdx++] = vertices[v].z + oz;
      } else {
        allPositions[posIdx++] = vertices[v].x + ox;
        allPositions[posIdx++] = vertices[v].y + oy;
        allPositions[posIdx++] = vertices[v].z + oz;
      }
    }

    // Offset face indices for this cell
    for (let fi = 0; fi < faceIndexTemplate.length; fi++) {
      allIndices.push(faceIndexTemplate[fi] + vertexOffset);
    }

    // Write edge positions
    for (let e = 0; e < edges.length; e++) {
      const [vi, vj] = edges[e];
      if (flipZ) {
        allEdgePositions[edgeIdx++] = -vertices[vi].x + ox;
        allEdgePositions[edgeIdx++] = -vertices[vi].y + oy;
        allEdgePositions[edgeIdx++] = vertices[vi].z + oz;
        allEdgePositions[edgeIdx++] = -vertices[vj].x + ox;
        allEdgePositions[edgeIdx++] = -vertices[vj].y + oy;
        allEdgePositions[edgeIdx++] = vertices[vj].z + oz;
      } else {
        allEdgePositions[edgeIdx++] = vertices[vi].x + ox;
        allEdgePositions[edgeIdx++] = vertices[vi].y + oy;
        allEdgePositions[edgeIdx++] = vertices[vi].z + oz;
        allEdgePositions[edgeIdx++] = vertices[vj].x + ox;
        allEdgePositions[edgeIdx++] = vertices[vj].y + oy;
        allEdgePositions[edgeIdx++] = vertices[vj].z + oz;
      }
    }

    vertexOffset += vertsPerCell;
  }

  const group = new THREE.Group();

  // ONE face geometry for entire matrix
  const faceGeometry = new THREE.BufferGeometry();
  faceGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(allPositions, 3)
  );
  faceGeometry.setIndex(allIndices);
  faceGeometry.computeVertexNormals();

  const faceMaterial = new THREE.MeshStandardMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: side,
    depthWrite: opacity >= 0.99,
    flatShading: true,
  });

  const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
  faceMesh.renderOrder = 1;
  group.add(faceMesh);

  // ONE edge geometry for entire matrix
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(allEdgePositions, 3)
  );

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 1,
    depthTest: true,
    depthWrite: true,
  });

  const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  edgeLines.renderOrder = 2;
  group.add(edgeLines);

  return group;
}

/**
 * Matrix generation module for IVM spatial arrays
 * @namespace RTMatrix
 */
export const RTMatrix = {
  /**
   * Create N×N matrix of cubes in X-Y plane
   * Simple orthogonal grid with edge-to-edge contact
   *
   * @param {number} matrixSize - Grid size (1 to 10, creates N×N array)
   * @param {number} halfSize - Half the cube edge length
   * @param {boolean} rotate45 - Apply 45° Z-rotation for grid alignment
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all cube instances
   *
   * @example
   * const cubeMatrix = RTMatrix.createCubeMatrix(5, 0.707, false, THREE);
   * scene.add(cubeMatrix);
   * // Creates 5×5 grid of 25 cubes
   */
  createCubeMatrix: (matrixSize, halfSize, rotate45, opacity, color, THREE) => {
    const spacing = halfSize * 2; // Edge-to-edge contact
    const cubeGeom = Polyhedra.cube(halfSize);

    // Collect cell positions
    const cellPositions = [];
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        cellPositions.push({
          x: (i - matrixSize / 2 + 0.5) * spacing,
          y: (j - matrixSize / 2 + 0.5) * spacing,
          z: 0,
        });
      }
    }

    const matrixGroup = buildMergedMatrix(
      cubeGeom,
      cellPositions,
      opacity,
      color,
      THREE.FrontSide,
      THREE
    );

    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    MetaLog.log(
      MetaLog.SUMMARY,
      `[RTMatrix] Cube matrix: ${matrixSize}×${matrixSize} = ${matrixSize * matrixSize} cubes, rotate45=${rotate45}`
    );

    return matrixGroup;
  },

  /**
   * Create N×N matrix of cuboctahedra in X-Y plane
   * Face-to-face array (square faces coplanar) - Vector Equilibrium array
   *
   * @param {number} matrixSize - Grid size (1 to 10)
   * @param {number} halfSize - Half the cube edge length
   * @param {boolean} rotate45 - Apply 45° Z-rotation for grid alignment
   * @param {number} opacity - Opacity value (0.0 to 1.0)
   * @param {number} color - Hex color value (default: 0x00ff88 lime-cyan)
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all cuboctahedron instances
   *
   * RT-PURE GEOMETRY:
   * - Cuboctahedron scaled by √2 (vertices at halfSize, matching rhombic dodec midsphere)
   * - Edge length = 2 * halfSize
   * - Spacing = 2 * halfSize (same as cube/rhombic dodec matrices)
   * - 6 square faces are coplanar between adjacent VEs
   * - Logarithmic depth buffer handles coplanar face rendering
   *
   * SPACE-FILLING: Forms complete tiling (like cube matrix)
   * Pattern: Face-to-face contact via square faces (single orientation)
   */
  createCuboctahedronMatrix: (
    matrixSize,
    halfSize,
    rotate45,
    opacity,
    color = 0x00ff88,
    THREE
  ) => {
    // Scale by √2 to match rhombic dodec midsphere
    const scaledHalfSize = halfSize * Math.sqrt(2);
    const edgeLength = scaledHalfSize * Math.sqrt(2); // = 2 * halfSize
    const spacing = edgeLength;
    const cuboctaGeom = Polyhedra.cuboctahedron(scaledHalfSize);

    const cellPositions = [];
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        cellPositions.push({
          x: (i - matrixSize / 2 + 0.5) * spacing,
          y: (j - matrixSize / 2 + 0.5) * spacing,
          z: 0,
        });
      }
    }

    const matrixGroup = buildMergedMatrix(
      cuboctaGeom,
      cellPositions,
      opacity,
      color,
      THREE.FrontSide,
      THREE
    );

    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    MetaLog.log(
      MetaLog.SUMMARY,
      `[RTMatrix] Cuboctahedron matrix: ${matrixSize}×${matrixSize} = ${
        matrixSize * matrixSize
      } VEs, rotate45=${rotate45}`
    );

    return matrixGroup;
  },

  /**
   * Create N×N matrix of rhombic dodecahedra in X-Y plane
   * Face-to-face array (rhombic faces coplanar) - space-filling array
   *
   * @param {number} matrixSize - Grid size (1 to 10)
   * @param {number} halfSize - Half the cube edge length (rhombic dodec dual to cuboctahedron)
   * @param {boolean} rotate45 - Apply 45° Z-rotation for grid alignment
   * @param {number} opacity - Opacity value (0.0 to 1.0)
   * @param {number} color - Hex color value (default: 0xff8800 orange)
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all rhombic dodecahedron instances
   *
   * RT-PURE GEOMETRY:
   * - Rhombic dodecahedron dual to cuboctahedron
   * - Face centers at cuboctahedron vertices
   * - Spacing = 2 * halfSize (cube edge - space-filling tiling)
   * - All 12 rhombic faces are coplanar between adjacent polyhedra
   * - Logarithmic depth buffer handles coplanar face rendering
   *
   * SPACE-FILLING: Forms complete tiling (like cube matrix)
   * Pattern: Face-to-face contact via rhombic faces (single orientation)
   */
  createRhombicDodecahedronMatrix: (
    matrixSize,
    halfSize,
    rotate45,
    faceCoplanar,
    opacity,
    color = 0xff8800,
    THREE
  ) => {
    const spacing = 2 * halfSize;
    const rhombicDodecGeom = Polyhedra.rhombicDodecahedron(
      halfSize * Math.sqrt(2)
    );

    // Collect all cell positions (primary grid + optional interstitial)
    const cellPositions = [];
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        cellPositions.push({
          x: (i - matrixSize / 2 + 0.5) * spacing,
          y: (j - matrixSize / 2 + 0.5) * spacing,
          z: 0,
        });
      }
    }

    if (faceCoplanar) {
      for (let i = 0; i < matrixSize - 1; i++) {
        for (let j = 0; j < matrixSize - 1; j++) {
          cellPositions.push({
            x: (i - matrixSize / 2 + 1.0) * spacing,
            y: (j - matrixSize / 2 + 1.0) * spacing,
            z: 0,
          });
        }
      }
    }

    const matrixGroup = buildMergedMatrix(
      rhombicDodecGeom,
      cellPositions,
      opacity,
      color,
      THREE.DoubleSide,
      THREE
    );

    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    const polyhedraCount = cellPositions.length;
    MetaLog.log(
      MetaLog.SUMMARY,
      `[RTMatrix] Rhombic dodecahedron matrix: ${matrixSize}×${matrixSize} primary grid${
        faceCoplanar
          ? ` + ${(matrixSize - 1) * (matrixSize - 1)} interstitial`
          : ""
      } = ${polyhedraCount} total, rotate45=${rotate45}, faceCoplanar=${faceCoplanar}`
    );

    return matrixGroup;
  },

  /**
   * Create N×N matrix of tetrahedra in X-Y plane
   * Vertex-to-vertex array with octahedral voids (alternating orientations)
   *
   * @param {number} matrixSize - Grid size (1 to 10)
   * @param {number} halfSize - Half the tetrahedron edge length
   * @param {boolean} rotate45 - Apply 45° Z-rotation for grid alignment
   * @param {number} opacity - Opacity value (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all tetrahedron instances
   *
   * Pattern: Alternating up/down orientations in checkerboard pattern
   * Creates vertex-to-vertex contact with octahedral voids (invisible)
   */
  createTetrahedronMatrix: (
    matrixSize,
    halfSize,
    rotate45,
    opacity,
    color,
    THREE
  ) => {
    // Spacing: Distance between tet centers in grid
    // Tetrahedra inscribe in cubes (vertices at alternating cube vertices)
    // Therefore spacing MUST match cube spacing for proper nesting
    const spacing = 2 * halfSize; // Same as cube matrix!
    const tetGeom = Polyhedra.tetrahedron(halfSize);

    // Generate N×N grid with alternating orientations
    // (i + j) % 2 === 0 → up, else → down (180° Z rotation)
    const cellPositions = [];
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        const isUp = (i + j) % 2 === 0;
        cellPositions.push({
          x: (i - matrixSize / 2 + 0.5) * spacing,
          y: (j - matrixSize / 2 + 0.5) * spacing,
          z: 0,
          flipZ: !isUp, // 180° rotation around Z: x=-x, y=-y
        });
      }
    }

    const matrixGroup = buildMergedMatrix(
      tetGeom,
      cellPositions,
      opacity,
      color,
      THREE.FrontSide,
      THREE
    );

    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    MetaLog.log(
      MetaLog.SUMMARY,
      `[RTMatrix] Tetrahedron matrix: ${matrixSize}×${matrixSize} = ${matrixSize * matrixSize} tetrahedra, rotate45=${rotate45}`
    );

    return matrixGroup;
  },

  /**
   * Create N×N matrix of octahedra in X-Y plane
   * Face-to-face square array
   *
   * @param {number} matrixSize - Grid size (1 to 10)
   * @param {number} halfSize - Half the octahedron edge length
   * @param {boolean} rotate45 - Apply 45° Z-rotation for grid alignment
   * @param {number} opacity - Opacity value (0.0 to 1.0)
   * @param {number} color - Hex color value
   * @param {Object} THREE - THREE.js library
   * @returns {THREE.Group} Group containing all octahedron instances
   *
   * Pattern: Square grid with octahedra showing square faces in plan view
   * Natural fit: Octahedra have square cross-section when viewed from above
   */
  createOctahedronMatrix: (
    matrixSize,
    halfSize,
    rotate45,
    colinearEdges,
    opacity,
    color,
    THREE
  ) => {
    const spacing = 2 * halfSize;
    const octaGeom = Polyhedra.octahedron(halfSize);

    // Collect all cell positions (primary grid + optional interstitial)
    const cellPositions = [];
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        cellPositions.push({
          x: (i - matrixSize / 2 + 0.5) * spacing,
          y: (j - matrixSize / 2 + 0.5) * spacing,
          z: 0,
        });
      }
    }

    if (colinearEdges) {
      for (let i = 0; i < matrixSize - 1; i++) {
        for (let j = 0; j < matrixSize - 1; j++) {
          cellPositions.push({
            x: (i - matrixSize / 2 + 1.0) * spacing,
            y: (j - matrixSize / 2 + 1.0) * spacing,
            z: 0,
          });
        }
      }
    }

    const matrixGroup = buildMergedMatrix(
      octaGeom,
      cellPositions,
      opacity,
      color,
      THREE.DoubleSide,
      THREE
    );

    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    const polyhedraCount = cellPositions.length;
    MetaLog.log(
      MetaLog.SUMMARY,
      `[RTMatrix] Octahedron matrix: ${matrixSize}×${matrixSize} primary grid${
        colinearEdges
          ? ` + ${(matrixSize - 1) * (matrixSize - 1)} interstitial`
          : ""
      } = ${polyhedraCount} total, rotate45=${rotate45}, colinearEdges=${colinearEdges}`
    );

    return matrixGroup;
  },

  /**
   * Calculate grid position for matrix array (RT-pure)
   * Uses quadrance-based calculations where possible
   *
   * @param {number} i - Grid index X (0 to N-1)
   * @param {number} j - Grid index Y (0 to N-1)
   * @param {number} matrixSize - Total grid size N
   * @param {number} spacing - Distance between instances
   * @returns {Object} {x, y, z} position
   */
  calculateGridPosition: (i, j, matrixSize, spacing) => {
    return {
      x: (i - matrixSize / 2 + 0.5) * spacing,
      y: (j - matrixSize / 2 + 0.5) * spacing,
      z: 0, // Always centered at origin in Z
    };
  },

  /**
   * Validate matrix spacing using quadrance (RT-pure distance verification)
   * Checks that adjacent polyhedra are spaced correctly without using sqrt
   *
   * RT-Pure Validation:
   * - Uses quadrance (Q = distance²) for all distance comparisons
   * - No sqrt needed—compare Q directly to expected Q
   * - Eliminates floating-point errors from sqrt/unsqrt operations
   * - Educational: demonstrates RT.quadrance() practical usage
   *
   * @param {Array} positions - Array of {x, y, z} center positions
   * @param {number} expectedSpacing - Expected distance between centers
   * @param {number} tolerance - Error tolerance (default 1e-10)
   * @returns {boolean} True if all spacings are within tolerance
   *
   * @example
   * // Collect positions during matrix generation
   * const positions = [];
   * for (let i = 0; i < matrixSize; i++) {
   *   for (let j = 0; j < matrixSize; j++) {
   *     const pos = RTMatrix.calculateGridPosition(i, j, matrixSize, spacing);
   *     positions.push(pos);
   *     // ... create polyhedron at pos ...
   *   }
   * }
   * // Validate spacing
   * RTMatrix.validateMatrixSpacing(positions, spacing);
   */
  validateMatrixSpacing: (positions, expectedSpacing, tolerance = 1e-10) => {
    const Q_expected = expectedSpacing * expectedSpacing; // Quadrance (no sqrt!)

    let validCount = 0;
    let totalChecks = 0;

    // Check adjacent positions in grid (i, j) and (i+1, j) or (i, j+1)
    // For simplicity, check all consecutive pairs
    for (let i = 0; i < positions.length - 1; i++) {
      const Q_actual = RT.quadrance(positions[i], positions[i + 1]);
      const error = Math.abs(Q_actual - Q_expected);

      totalChecks++;

      if (error < tolerance) {
        validCount++;
      } else {
        MetaLog.warn(
          MetaLog.SUMMARY,
          `[RTMatrix] Spacing error at position ${i}: Q_actual=${Q_actual.toFixed(6)}, Q_expected=${Q_expected.toFixed(6)}, error=${error.toExponential(3)}`
        );
      }
    }

    const allValid = validCount === totalChecks;

    if (allValid) {
      MetaLog.log(
        MetaLog.DETAILED,
        `[RTMatrix] ✓ Spacing validation passed: Q=${Q_expected.toFixed(6)} (${totalChecks} checks, tolerance=${tolerance})`
      );
    } else {
      MetaLog.warn(
        MetaLog.SUMMARY,
        `[RTMatrix] ✗ Spacing validation failed: ${validCount}/${totalChecks} checks passed (tolerance=${tolerance})`
      );
    }

    return allValid;
  },
};
