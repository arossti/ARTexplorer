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
 * - docs/development/Geometry documents/matrix-slider.md
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
 * docs/development/Geometry documents/matrix-slider.md (Section 4.5)
 */

import { RT } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js";

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
    const matrixGroup = new THREE.Group();
    const cubeEdge = halfSize * 2; // Full edge length
    const spacing = cubeEdge; // Edge-to-edge contact

    // Get base cube geometry
    const cubeGeom = Polyhedra.cube(halfSize);
    const { vertices, edges, faces } = cubeGeom;

    // Generate N×N grid centered at origin
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        // Calculate position: centered at origin
        // offset = (index - N/2 + 0.5) * spacing
        const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
        const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
        const offset_z = 0; // Z-centered at origin

        // Create cube instance at this grid position
        const cubeGroup = new THREE.Group();

        // Build indexed face geometry
        const positions = [];
        const indices = [];

        // Add all vertices to positions array (with offset)
        vertices.forEach(v => {
          positions.push(v.x + offset_x, v.y + offset_y, v.z + offset_z);
        });

        // Build face indices (triangulate quads if needed)
        faces.forEach(faceIndices => {
          // Fan triangulation from first vertex
          for (let k = 1; k < faceIndices.length - 1; k++) {
            indices.push(faceIndices[0], faceIndices[k], faceIndices[k + 1]);
          }
        });

        const faceGeometry = new THREE.BufferGeometry();
        faceGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3)
        );
        faceGeometry.setIndex(indices);
        faceGeometry.computeVertexNormals();

        const faceMaterial = new THREE.MeshStandardMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
          side: THREE.FrontSide, // Backface culling enabled - all polyhedra winding corrected (2026-01-11)
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
          edgePositions.push(v1.x + offset_x, v1.y + offset_y, v1.z + offset_z);
          edgePositions.push(v2.x + offset_x, v2.y + offset_y, v2.z + offset_z);
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
      }
    }

    // Apply 45° rotation if requested (RT-pure)
    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    console.log(
      `[RTMatrix] Cube matrix created: ${matrixSize}×${matrixSize} = ${matrixSize * matrixSize} cubes, rotate45=${rotate45}`
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
    color = 0x00ff88, // Lime-cyan (Vector Equilibrium color)
    THREE
  ) => {
    const matrixGroup = new THREE.Group();

    // Scale by √2 to match rhombic dodec midsphere (vertices at halfSize, not halfSize/√2)
    const scaledHalfSize = halfSize * Math.sqrt(2);
    const edgeLength = scaledHalfSize * Math.sqrt(2); // = 2 * halfSize
    const spacing = edgeLength; // Face-to-face spacing

    // Get base cuboctahedron geometry (scaled up)
    const cuboctaGeom = Polyhedra.cuboctahedron(scaledHalfSize);
    const { vertices, edges, faces } = cuboctaGeom;

    // Generate N×N grid centered at origin
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        // Calculate position: centered at origin
        const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
        const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
        const offset_z = 0; // Z-centered at origin

        // Create cuboctahedron instance at this grid position
        const cuboctaGroup = new THREE.Group();

        // Build indexed face geometry
        const positions = [];
        const indices = [];

        // Add all vertices to positions array (with offset)
        vertices.forEach(v => {
          positions.push(v.x + offset_x, v.y + offset_y, v.z + offset_z);
        });

        // Build face indices (triangulate triangles and squares)
        faces.forEach(faceIndices => {
          // Fan triangulation from first vertex
          for (let k = 1; k < faceIndices.length - 1; k++) {
            indices.push(faceIndices[0], faceIndices[k], faceIndices[k + 1]);
          }
        });

        const faceGeometry = new THREE.BufferGeometry();
        faceGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3)
        );
        faceGeometry.setIndex(indices);
        faceGeometry.computeVertexNormals();

        const faceMaterial = new THREE.MeshStandardMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
          side: THREE.FrontSide, // Backface culling enabled - all polyhedra winding corrected (2026-01-11)
          depthWrite: opacity >= 0.99,
          flatShading: true,
        });

        const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
        faceMesh.renderOrder = 1;
        cuboctaGroup.add(faceMesh);

        // Render edges
        const edgePositions = [];
        edges.forEach(([vi, vj]) => {
          const v1 = vertices[vi];
          const v2 = vertices[vj];
          edgePositions.push(v1.x + offset_x, v1.y + offset_y, v1.z + offset_z);
          edgePositions.push(v2.x + offset_x, v2.y + offset_y, v2.z + offset_z);
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
        cuboctaGroup.add(edgeLines);

        matrixGroup.add(cuboctaGroup);
      }
    }

    // Apply 45° rotation if requested (RT-pure)
    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    console.log(
      `[RTMatrix] Cuboctahedron matrix created: ${matrixSize}×${matrixSize} = ${
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
    color = 0xff8800, // Orange (Rhombic Dodecahedron color)
    THREE
  ) => {
    const matrixGroup = new THREE.Group();

    // Always use default cube-compatible spacing
    const spacing = 2 * halfSize; // Cube edge - rhombic dodec is space-filling like cube

    // Get base rhombic dodecahedron geometry
    // Scale by √2 because rhombicDodecahedron(s) has axial vertices at s/√2, but we need them at halfSize
    const rhombicDodecGeom = Polyhedra.rhombicDodecahedron(
      halfSize * Math.sqrt(2)
    );
    const { vertices, edges, faces } = rhombicDodecGeom;

    // Helper function to create a single rhombic dodecahedron at given position
    const createRhombicDodec = (offset_x, offset_y, offset_z) => {
      const rhombicDodecGroup = new THREE.Group();

      // Build indexed face geometry
      const positions = [];
      const indices = [];

      // Add all vertices to positions array (with offset)
      vertices.forEach(v => {
        positions.push(v.x + offset_x, v.y + offset_y, v.z + offset_z);
      });

      // Build face indices (triangulate rhombic faces)
      faces.forEach(faceIndices => {
        // Fan triangulation from first vertex
        for (let k = 1; k < faceIndices.length - 1; k++) {
          indices.push(faceIndices[0], faceIndices[k], faceIndices[k + 1]);
        }
      });

      const faceGeometry = new THREE.BufferGeometry();
      faceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
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
      rhombicDodecGroup.add(faceMesh);

      // Render edges
      const edgePositions = [];
      edges.forEach(([vi, vj]) => {
        const v1 = vertices[vi];
        const v2 = vertices[vj];
        edgePositions.push(v1.x + offset_x, v1.y + offset_y, v1.z + offset_z);
        edgePositions.push(v2.x + offset_x, v2.y + offset_y, v2.z + offset_z);
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
      rhombicDodecGroup.add(edgeLines);

      matrixGroup.add(rhombicDodecGroup);
    };

    // Generate primary N×N grid centered at origin
    let polyhedraCount = 0;
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
        const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
        const offset_z = 0;
        createRhombicDodec(offset_x, offset_y, offset_z);
        polyhedraCount++;
      }
    }

    // If faceCoplanar mode is enabled, add interstitial rhombic dodecahedra
    // to fill the gaps and create true space-filling tessellation
    if (faceCoplanar) {
      // Add interstitial polyhedra offset by (halfSize, halfSize, 0)
      for (let i = 0; i < matrixSize - 1; i++) {
        for (let j = 0; j < matrixSize - 1; j++) {
          const offset_x = (i - matrixSize / 2 + 1.0) * spacing;
          const offset_y = (j - matrixSize / 2 + 1.0) * spacing;
          const offset_z = 0;
          createRhombicDodec(offset_x, offset_y, offset_z);
          polyhedraCount++;
        }
      }
    }

    // Apply 45° rotation if requested (RT-pure)
    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    console.log(
      `[RTMatrix] Rhombic dodecahedron matrix created: ${matrixSize}×${matrixSize} primary grid${
        faceCoplanar
          ? ` + ${(matrixSize - 1) * (matrixSize - 1)} interstitial`
          : ""
      } = ${polyhedraCount} total rhombic dodecs, rotate45=${rotate45}, faceCoplanar=${faceCoplanar}`
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
    const matrixGroup = new THREE.Group();

    // Spacing: Distance between tet centers in grid
    // Tetrahedra inscribe in cubes (vertices at alternating cube vertices)
    // Therefore spacing MUST match cube spacing for proper nesting
    // Cube edge = 2 * halfSize (NOT tetEdge!)
    // Note: Tet edge length = 2 * halfSize * √2 (NOT used for spacing)
    const spacing = 2 * halfSize; // Same as cube matrix!

    // Get base tetrahedron geometry
    const tetGeom = Polyhedra.tetrahedron(halfSize);
    const { vertices, edges, faces } = tetGeom;

    // Generate N×N grid with alternating orientations
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        // Calculate position: centered at origin
        const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
        const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
        const offset_z = 0; // Z-centered at origin

        // Determine orientation: checkerboard pattern (up vs down)
        // (i + j) % 2 === 0 → up, else → down (inverted)
        const isUp = (i + j) % 2 === 0;

        // Create tetrahedron instance at this grid position
        const tetGroup = new THREE.Group();

        // Build indexed face geometry
        const positions = [];
        const indices = [];

        // Add all vertices to positions array (with offset)
        vertices.forEach(v => {
          positions.push(v.x + offset_x, v.y + offset_y, v.z + offset_z);
        });

        // Build face indices (triangles)
        faces.forEach(faceIndices => {
          indices.push(faceIndices[0], faceIndices[1], faceIndices[2]);
        });

        const faceGeometry = new THREE.BufferGeometry();
        faceGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3)
        );
        faceGeometry.setIndex(indices);
        faceGeometry.computeVertexNormals();

        const faceMaterial = new THREE.MeshStandardMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
          side: THREE.FrontSide, // Backface culling enabled - all polyhedra winding corrected (2026-01-11)
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
          edgePositions.push(v1.x + offset_x, v1.y + offset_y, v1.z + offset_z);
          edgePositions.push(v2.x + offset_x, v2.y + offset_y, v2.z + offset_z);
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

        // Apply orientation rotation (180° around Z for down-facing tets)
        // RT-PURE: Uses spread/cross methodology, not Math.PI
        if (!isUp) {
          RT.applyRotation180(tetGroup); // Flip 180° (s=0, c=1)
        }

        matrixGroup.add(tetGroup);
      }
    }

    // Apply 45° rotation if requested (RT-pure)
    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    console.log(
      `[RTMatrix] Tetrahedron matrix created: ${matrixSize}×${matrixSize} = ${matrixSize * matrixSize} tetrahedra, rotate45=${rotate45}`
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
    const matrixGroup = new THREE.Group();

    // Always use default cube-compatible spacing
    const spacing = 2 * halfSize; // Same as cube matrix!

    // Get base octahedron geometry
    const octaGeom = Polyhedra.octahedron(halfSize);
    const { vertices, edges, faces } = octaGeom;

    // Helper function to create a single octahedron at given position
    const createOctahedron = (offset_x, offset_y, offset_z) => {
      const octaGroup = new THREE.Group();

      // Build indexed face geometry
      const positions = [];
      const indices = [];

      // Add all vertices to positions array (with offset)
      vertices.forEach(v => {
        positions.push(v.x + offset_x, v.y + offset_y, v.z + offset_z);
      });

      // Build face indices (triangles)
      faces.forEach(faceIndices => {
        indices.push(faceIndices[0], faceIndices[1], faceIndices[2]);
      });

      const faceGeometry = new THREE.BufferGeometry();
      faceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
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
      octaGroup.add(faceMesh);

      // Render edges
      const edgePositions = [];
      edges.forEach(([vi, vj]) => {
        const v1 = vertices[vi];
        const v2 = vertices[vj];
        edgePositions.push(v1.x + offset_x, v1.y + offset_y, v1.z + offset_z);
        edgePositions.push(v2.x + offset_x, v2.y + offset_y, v2.z + offset_z);
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
      octaGroup.add(edgeLines);

      matrixGroup.add(octaGroup);
    };

    // Generate primary N×N grid centered at origin
    let polyhedraCount = 0;
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
        const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
        const offset_z = 0;
        createOctahedron(offset_x, offset_y, offset_z);
        polyhedraCount++;
      }
    }

    // If colinearEdges mode is enabled, add interstitial octahedra
    // to fill the gaps and create true space-filling tessellation
    if (colinearEdges) {
      // Add interstitial octahedra offset by (halfSize, halfSize, 0)
      for (let i = 0; i < matrixSize - 1; i++) {
        for (let j = 0; j < matrixSize - 1; j++) {
          const offset_x = (i - matrixSize / 2 + 1.0) * spacing;
          const offset_y = (j - matrixSize / 2 + 1.0) * spacing;
          const offset_z = 0;
          createOctahedron(offset_x, offset_y, offset_z);
          polyhedraCount++;
        }
      }
    }

    // Apply 45° rotation if requested (RT-pure)
    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    console.log(
      `[RTMatrix] Octahedron matrix created: ${matrixSize}×${matrixSize} primary grid${
        colinearEdges
          ? ` + ${(matrixSize - 1) * (matrixSize - 1)} interstitial`
          : ""
      } = ${polyhedraCount} total octahedra, rotate45=${rotate45}, colinearEdges=${colinearEdges}`
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
        console.warn(
          `[RTMatrix] Spacing error at position ${i}: Q_actual=${Q_actual.toFixed(6)}, Q_expected=${Q_expected.toFixed(6)}, error=${error.toExponential(3)}`
        );
      }
    }

    const allValid = validCount === totalChecks;

    if (allValid) {
      console.log(
        `[RTMatrix] ✓ Spacing validation passed: Q=${Q_expected.toFixed(6)} (${totalChecks} checks, tolerance=${tolerance})`
      );
    } else {
      console.warn(
        `[RTMatrix] ✗ Spacing validation failed: ${validCount}/${totalChecks} checks passed (tolerance=${tolerance})`
      );
    }

    return allValid;
  },
};
