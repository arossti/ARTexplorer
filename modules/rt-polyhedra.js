/**
 * rt-polyhedra.js
 * Polyhedra Generators for ARTexplorer
 *
 * All Platonic solids, Archimedean solids, and geodesic subdivisions.
 * Uses Rational Trigonometry (RT) for exact calculations.
 *
 * @requires THREE.js
 * @requires rt-math.js
 */

import { RT } from "./rt-math.js";

// Access THREE.js from global scope (set by main HTML)

/**
 * Polyhedra generator functions
 * All functions return {vertices, edges, faces}
 * @namespace Polyhedra
 */
export const Polyhedra = {
  /**
   * Hexahedron (Cube) - vertices at (±1, ±1, ±1)
   * Edge quadrance Q = 4 (edge length = 2)
   * Z-up convention: Z is vertical axis
   */
  cube: (halfSize = 1) => {
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
    console.log(
      `Cube: Expected Q=${expectedQ.toFixed(6)}, Max error=${maxError.toExponential(2)}`
    );

    return { vertices, edges, faces };
  },

  /**
   * Tetrahedron inscribed in cube
   * Uses alternating vertices (every other corner)
   * Edge quadrance Q = 8 (edge length = 2√2)
   */
  tetrahedron: (halfSize = 1) => {
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
    console.log(
      `Tetrahedron: Expected Q=${expectedQ.toFixed(6)}, Max error=${maxError.toExponential(2)}`
    );

    return { vertices, edges, faces };
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
   */
  dualTetrahedron: (halfSize = 1) => {
    // Get base tetrahedron geometry
    const base = Polyhedra.tetrahedron(halfSize);

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
    console.log(
      `Dual Tetrahedron: Expected Q=${expectedQ.toFixed(6)}, Max error=${maxError.toExponential(2)}`
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
    projection = "out"
  ) => {
    // Get base geodesic tetrahedron (subdivided and projected)
    const base = Polyhedra.geodesicTetrahedron(halfSize, frequency, projection);

    // Invert all vertices (multiply by -1) to create dual
    const vertices = base.vertices.map(v => v.clone().multiplyScalar(-1));

    // Reverse face winding to maintain outward normals after inversion
    const faces = base.faces.map(face => [...face].reverse());

    // Edges remain topologically identical
    const edges = base.edges;

    console.log(
      `[RT] Geodesic Dual Tetrahedron: frequency=${frequency}, projection=${projection}, vertices=${vertices.length}`
    );

    return { vertices, edges, faces };
  },

  /**
   * Octahedron (dual of cube)
   * Vertices at face centers of cube: (±1,0,0), (0,±1,0), (0,0,±1)
   * Edge quadrance Q = 2 (edge length = √2)
   * Bounded by stella octangula (intersection of dual tetrahedra)
   * Z-up convention: Z is vertical axis
   */
  octahedron: (halfSize = 1) => {
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
    console.log(
      `Octahedron: Expected Q=${expectedQ.toFixed(6)}, Max error=${maxError.toExponential(2)}`
    );

    return { vertices, edges, faces };
  },

  /**
   * Icosahedron (20 triangular faces, 12 vertices, 30 edges)
   * Rational Trigonometry construction: vertices derived from edge midpoints
   * Alternative to golden ratio: use quadrance relationships
   * For RT purity: coordinates (0, ±a, ±b) where b²/a² = 5 (golden rectangle ratio)
   * This gives edge quadrance Q = 4a² for all 30 edges
   */
  icosahedron: (halfSize = 1) => {
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
    console.log(
      `[PurePhi] Icosahedron - High-precision symbolic construction:`
    );
    console.log(`  φ = ${phi.toString()} = ${phi.toDecimal().toFixed(15)}`);
    console.log(
      `  φ² = ${phiSq.toString()} = ${phiSq.toDecimal().toFixed(15)} (identity: φ + 1)`
    );
    console.log(
      `  1 + φ² = ${onePlusPhiSq.toString()} = ${onePlusPhiSq.toDecimal().toFixed(15)}`
    );
    console.log(`  Normalization: 1/√(1 + φ²) = ${normFactor.toFixed(15)}`);
    console.log(`  a = 1·norm = ${a.toFixed(15)}`);
    console.log(`  b = φ·norm = ${b.toFixed(15)}`);
    console.log(
      `  Precision: 15 decimal places maintained via symbolic algebra`
    );

    // Verify algebraic identity: φ² = φ + 1
    const phi_decimal = phi.toDecimal();
    const phiSq_decimal = phiSq.toDecimal();
    const identity_error = Math.abs(phiSq_decimal - (phi_decimal + 1));
    console.log(
      `  Identity check: |φ² - (φ + 1)| = ${identity_error.toExponential()} (should be ~0)`
    );

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
    console.log(
      `Icosahedron: Expected Q=${expectedQ.toFixed(6)}, Max error=${maxError.toExponential(2)}`
    );

    return { vertices, edges, faces };
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
  dualIcosahedron: (halfSize = 1) => {
    // PurePhi Method 2: High-precision symbolic constant for consistency
    const phi = RT.PurePhi.constants.phi; // φ = (1 + √5)/2 - 15 decimal precision

    // GPU boundary: expand symbolic constant to decimal for arithmetic
    const phiVal = phi.toDecimal();

    // Dodecahedron face centers are at radius φ × halfSize from origin
    // Scale icosahedron to match this radius for face dual alignment
    const dualRadius = phiVal * halfSize;

    console.log(
      `[ThreeRT] Dual Icosahedron RT construction (PurePhi Method 2):`
    );
    console.log(`  Dodecahedron halfSize: ${halfSize.toFixed(3)}`);
    console.log(
      `  Dodecahedron inradius (face center): φ·s = ${dualRadius.toFixed(15)}`
    );
    console.log(
      `  [PurePhi] φ = ${phi.toString()} = ${phiVal.toFixed(15)} (symbolic constant)`
    );
    console.log(
      `  Icosahedron vertex radius: ${dualRadius.toFixed(15)} (matches dodec inradius)`
    );
    console.log(`  RT ROTATION: Spread s=1, Cross c=0 (exact integers!)`);
    console.log(`  Transform: (x,y,z) → (y,-x,z) - pure integer matrix`);

    // Get base icosahedron geometry at dual scale
    const base = Polyhedra.icosahedron(dualRadius);

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
    console.log(
      `Dual Icosahedron: Expected Q=${expectedQ.toFixed(6)}, Max error=${maxError.toExponential(2)}`
    );

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
    projection = "out"
  ) => {
    // PurePhi Method 2: High-precision symbolic constant for consistency
    const phi = RT.PurePhi.constants.phi; // φ = (1 + √5)/2 - 15 decimal precision
    // GPU boundary: expand to decimal for arithmetic
    const dualRadius = phi.toDecimal() * halfSize;

    // Get base geodesic icosahedron (subdivided and projected)
    const base = Polyhedra.geodesicIcosahedron(
      dualRadius,
      frequency,
      projection
    );

    // Apply RT-pure Z-rotation: -90° clockwise
    // Transform: (x,y,z) → (y,-x,z) using ONLY multiplication by {-1, 0, 1}
    const vertices = base.vertices.map(v => new THREE.Vector3(v.y, -v.x, v.z));

    // Topology remains identical (rotation preserves face winding)
    const edges = base.edges;
    const faces = base.faces;

    console.log(
      `[RT] Geodesic Dual Icosahedron: frequency=${frequency}, projection=${projection}, vertices=${vertices.length}`
    );

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
  subdivideTriangles: (vertices, faces, frequency) => {
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

    console.log(
      `[RT] Geodesic subdivision: freq=${frequency}, divisions=${divisions}, faces=${newFaces.length} (expected: ${faces.length * divisions * divisions})`
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
  geodesicIcosahedron: (halfSize = 1, frequency = 1, projection = "out") => {
    // Phase 2.9: RT-Pure Geodesic with InSphere/MidSphere/OutSphere options
    // Fuller frequency notation: 1 = base polyhedron (undivided edges)
    //                            2 = each edge bisected (2 segments)
    //                            3 = each edge trisected (3 segments), etc.

    // 1. Start with pure algebraic icosahedron
    const base = Polyhedra.icosahedron(halfSize);

    console.log(
      `[RT] Geodesic Icosahedron: frequency=${frequency}, projection=${projection}`
    );
    console.log(
      `  Base vertices: ${base.vertices.length}, faces: ${base.faces.length}`
    );

    // Frequency 1 = return base icosahedron (no subdivision, no sphere projection)
    if (frequency === 1) {
      console.log(
        `  Frequency 1: Returning base icosahedron (20 faces, undivided edges)`
      );
      return base;
    }

    // 2. Subdivide in algebraic space (preserves golden ratio relationships)
    const subdivided = Polyhedra.subdivideTriangles(
      base.vertices,
      base.faces,
      frequency
    );

    console.log(
      `  Subdivided vertices: ${subdivided.vertices.length}, faces: ${subdivided.faces.length}`
    );

    // Phase 2.9: RT-PURE Projection options (Off, InSphere, MidSphere, OutSphere)
    // NO TRIG! Pure quadrance relationships using golden ratio φ
    let Q_target;

    if (projection === "off") {
      // No sphere projection - return flat subdivided mesh
      console.log(`  Projection: OFF (flat subdivided mesh)`);
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

      console.log(
        `  Projection: InSphere (perpendicular to face planes, RT-pure + PurePhi)`
      );
      console.log(
        `  [PurePhi] Numerator: ${numerator.toString()} = ${numerator.toDecimal().toFixed(15)}`
      );
      console.log(
        `  [PurePhi] Denominator: ${denominator.toString()} = ${denominator.toDecimal().toFixed(15)}`
      );
      console.log(
        `  RT: Q_in/Q_out = (3φ+2)/[3(φ+2)] = ${ratio_in_sq.toFixed(15)}`
      );
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

      console.log(
        `  Projection: MidSphere (distance to edge midpoints, RT-pure + PurePhi)`
      );
      console.log(
        `  [PurePhi] φ² = ${phiSq.toString()} = ${phiSq.toDecimal().toFixed(15)} (identity: φ + 1)`
      );
      console.log(
        `  [PurePhi] φ + 2 = ${phiPlusTwo.toString()} = ${phiPlusTwo.toDecimal().toFixed(15)}`
      );
      console.log(
        `  RT: Q_mid/Q_out = φ²/(φ+2) = (φ+1)/(φ+2) = ${ratio_mid_sq.toFixed(15)}`
      );
    } else if (projection === "out") {
      // OutSphere: Through vertices (Fuller's true geodesic)
      Q_target = halfSize * halfSize;
      console.log(
        `  Projection: OutSphere (through vertices - Fuller geodesic)`
      );
    }

    const r_target = Math.sqrt(Q_target);
    console.log(
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

    console.log(
      `  Edge quadrance: avg=${avgQ.toFixed(6)}, max error=${maxError.toExponential(2)}`
    );
    console.log(`  RT PURITY: Normalization deferred until final step ✓`);

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
  geodesicTetrahedron: (halfSize = 1, frequency = 1, projection = "out") => {
    // Phase 2.9: RT-Pure Geodesic with InSphere/MidSphere/OutSphere options
    // Fuller frequency notation: 1 = base polyhedron (undivided edges)
    //                            2 = each edge bisected (2 segments)
    //                            3 = each edge trisected (3 segments), etc.

    // 1. Start with pure algebraic tetrahedron
    const base = Polyhedra.tetrahedron(halfSize);

    console.log(
      `[RT] Geodesic Tetrahedron: frequency=${frequency}, projection=${projection}`
    );
    console.log(
      `  Base vertices: ${base.vertices.length}, faces: ${base.faces.length}`
    );

    // Frequency 1 = return base tetrahedron (no subdivision, no sphere projection)
    if (frequency === 1) {
      console.log(
        `  Frequency 1: Returning base tetrahedron (4 faces, undivided edges)`
      );
      return base;
    }

    // 2. Subdivide in algebraic space
    const subdivided = Polyhedra.subdivideTriangles(
      base.vertices,
      base.faces,
      frequency
    );

    console.log(
      `  Subdivided vertices: ${subdivided.vertices.length}, faces: ${subdivided.faces.length}`
    );

    // 3. Projection options (Phase 2.9)
    let finalVertices;
    let Q_target;

    if (projection === "off") {
      // No projection - return flat subdivided mesh
      console.log(`  Projection: OFF (flat subdivided faces)`);
      return {
        vertices: subdivided.vertices,
        edges: subdivided.edges,
        faces: subdivided.faces,
      };
    } else if (projection === "in") {
      // InSphere: tangent to face centers, Q = s²/3
      Q_target = (halfSize * halfSize) / 3;
      console.log(`  Projection: InSphere (Q = s²/3 = ${Q_target.toFixed(6)})`);
    } else if (projection === "mid") {
      // MidSphere: tangent to edge centers, Q = s²
      Q_target = halfSize * halfSize;
      console.log(`  Projection: MidSphere (Q = s² = ${Q_target.toFixed(6)})`);
    } else if (projection === "out") {
      // OutSphere: through vertices, Q = 3s² (Fuller's geodesic)
      Q_target = 3 * halfSize * halfSize;
      console.log(
        `  Projection: OutSphere (Q = 3s² = ${Q_target.toFixed(6)}) - Fuller geodesic`
      );
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

    console.log(`  Target radius: r = √Q = ${r_target.toFixed(6)}`);
    console.log(
      `  Edge quadrance: avg=${avgQ.toFixed(6)}, max error=${maxError.toExponential(2)}`
    );
    console.log(
      `  RT PURITY: Quadrance calculated algebraically, √ only at final projection ✓`
    );

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
  geodesicOctahedron: (halfSize = 1, frequency = 1, projection = "out") => {
    // Phase 2.9: RT-Pure Geodesic with InSphere/MidSphere/OutSphere options
    // Fuller frequency notation: 1 = base polyhedron (undivided edges)
    //                            2 = each edge bisected (2 segments)
    //                            3 = each edge trisected (3 segments), etc.

    // 1. Start with pure algebraic octahedron
    const base = Polyhedra.octahedron(halfSize);

    console.log(
      `[RT] Geodesic Octahedron: frequency=${frequency}, projection=${projection}`
    );
    console.log(
      `  Base vertices: ${base.vertices.length}, faces: ${base.faces.length}`
    );

    // Frequency 1 = return base octahedron (no subdivision, no sphere projection)
    if (frequency === 1) {
      console.log(
        `  Frequency 1: Returning base octahedron (8 faces, undivided edges)`
      );
      return base;
    }

    // 2. Subdivide in algebraic space
    const subdivided = Polyhedra.subdivideTriangles(
      base.vertices,
      base.faces,
      frequency
    );

    console.log(
      `  Subdivided vertices: ${subdivided.vertices.length}, faces: ${subdivided.faces.length}`
    );

    // 3. Projection options (Phase 2.9)
    let finalVertices;
    let Q_target;

    if (projection === "off") {
      console.log(`  Projection: OFF (flat subdivided faces)`);
      return {
        vertices: subdivided.vertices,
        edges: subdivided.edges,
        faces: subdivided.faces,
      };
    } else if (projection === "in") {
      // InSphere: tangent to face centers, Q = s²/3
      Q_target = (halfSize * halfSize) / 3;
      console.log(`  Projection: InSphere (Q = s²/3 = ${Q_target.toFixed(6)})`);
    } else if (projection === "mid") {
      // MidSphere: tangent to edge centers, Q = s²/2
      Q_target = (halfSize * halfSize) / 2;
      console.log(
        `  Projection: MidSphere (Q = s²/2 = ${Q_target.toFixed(6)})`
      );
    } else if (projection === "out") {
      // OutSphere: through vertices, Q = s² (Fuller's geodesic)
      Q_target = halfSize * halfSize;
      console.log(
        `  Projection: OutSphere (Q = s² = ${Q_target.toFixed(6)}) - Fuller geodesic`
      );
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

    console.log(`  Target radius: r = √Q = ${r_target.toFixed(6)}`);
    console.log(
      `  Edge quadrance: avg=${avgQ.toFixed(6)}, max error=${maxError.toExponential(2)}`
    );
    console.log(
      `  RT PURITY: Quadrance calculated algebraically, √ only at final projection ✓`
    );

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
  dodecahedron: (halfSize = 1) => {
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

    console.log(`[ThreeRT] Dodecahedron RT construction (PurePhi Method 2):`);
    console.log(`  Cube half-size: ${s.toFixed(3)}`);
    console.log(
      `  [PurePhi] φ = ${phi.toString()} = ${phi.toDecimal().toFixed(15)} (symbolic constant)`
    );
    console.log(
      `  [PurePhi] 1/φ = ${invPhi.toString()} = ${invPhi.toDecimal().toFixed(15)} (algebraic identity - no division!)`
    );

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
    console.log(
      `Dodecahedron: Edge Q=${sampleQ.toFixed(6)}, Max error=${maxError.toExponential(2)}`
    );

    return { vertices, edges, faces };
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
  rhombicDodecahedron: (halfSize = 1) => {
    const s = halfSize;

    // RT-PURE + PureRadicals: Use cached √2 for consistency
    const sqrt2 = RT.PureRadicals.sqrt2();
    const t = s / sqrt2; // Cuboctahedron vertex distance: s/√2
    const u = t / 2; // Rhombic dodec octant vertex distance: (s/√2)/2 = s/(2√2)

    console.log(
      `[ThreeRT] Rhombic Dodecahedron RT construction (dual of cuboctahedron):`
    );
    console.log(`  HalfSize: s = ${s.toFixed(6)}`);
    console.log(`  √2 = ${sqrt2.toFixed(6)} (cached, PureRadicals)`);
    console.log(`  Cuboctahedron vertex distance: t = s/√2 = ${t.toFixed(6)}`);
    console.log(
      `  Rhombic dodec octant vertices: u = t/2 = s/(2√2) = ${u.toFixed(6)}`
    );

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
    console.log(
      `Rhombic Dodecahedron (dual): Expected edge Q=${expectedQ.toFixed(6)} (= 3s²/8), Max error=${maxError.toExponential(2)}`
    );

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
  cuboctahedron: (halfSize = 1) => {
    const s = halfSize;

    // RT-PURE + PureRadicals: Use cached √2 for consistency
    const sqrt2 = RT.PureRadicals.sqrt2();
    const t = s / sqrt2; // Edge midpoint distance from origin: s/√2

    console.log(
      `[ThreeRT] Cuboctahedron (Vector Equilibrium) RT construction:`
    );
    console.log(`  HalfSize: s = ${s.toFixed(6)}`);
    console.log(`  √2 = ${sqrt2.toFixed(6)} (cached, PureRadicals)`);
    console.log(
      `  Vertex distance from origin: s/√2 = ${t.toFixed(6)} (rationalized!)`
    );

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
    console.log(
      `Cuboctahedron: Expected edge Q=${expectedQ.toFixed(6)}, Max error=${maxError.toExponential(2)}`
    );

    return { vertices, edges, faces };
  },

  /**
   * Quadray Tetrahedron (4D-Tetrahedron Demonstrator)
   * Defined NATIVELY in Quadray coordinates, converted to XYZ only at render time.
   *
   * This polyhedron demonstrates:
   * - Native WXYZ coordinate definition
   * - Optional zero-sum normalization
   * - The difference between standard Quadray and extended 4D± Quadray
   *
   * Reference: http://www.grunch.net/synergetics/quadintro.html
   * See also: Geometry documents/4D-COORDINATES.md §11.4-11.5
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @param {boolean} options.normalize - Apply zero-sum normalization (default: true)
   * @param {Array} options.wxyz - Custom vertex coordinates (default: unit tetrahedron)
   * @returns {Object} - {vertices, edges, faces, wxyz_raw, wxyz_normalized, metadata}
   */
  quadrayTetrahedron: (scale = 1, options = {}) => {
    const { normalize = true, wxyz = null } = options;

    // Default: unit tetrahedron in Quadray (single active coordinate per vertex)
    const wxyz_raw = wxyz || [
      [1, 0, 0, 0], // W-axis vertex
      [0, 1, 0, 0], // X-axis vertex
      [0, 0, 1, 0], // Y-axis vertex
      [0, 0, 0, 1], // Z-axis vertex
    ];

    // Optional: Apply zero-sum normalization
    // Standard: w + x + y + z = 0 (subtracts average from each coordinate)
    const wxyz_normalized = wxyz_raw.map(([w, x, y, z]) => {
      if (!normalize) return [w, x, y, z];
      const sum = w + x + y + z;
      const avg = sum / 4;
      return [w - avg, x - avg, y - avg, z - avg];
    });

    // RT-PURE: Use raw basis vectors (NOT normalized to unit Cartesian length)
    // This gives edge Q = 8 with zero-sum normalized coordinates, matching IVM grid exactly
    // The basis vectors point to alternating vertices of a cube inscribed in the tetrahedron
    const basisW = new THREE.Vector3(1, 1, 1);
    const basisX = new THREE.Vector3(1, -1, -1);
    const basisY = new THREE.Vector3(-1, 1, -1);
    const basisZ = new THREE.Vector3(-1, -1, 1);

    // Convert to Cartesian for THREE.js rendering
    const vertices = wxyz_normalized.map(([w, x, y, z]) => {
      return new THREE.Vector3()
        .addScaledVector(basisW, w * scale)
        .addScaledVector(basisX, x * scale)
        .addScaledVector(basisY, y * scale)
        .addScaledVector(basisZ, z * scale);
    });

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

    // Expected Q = 8 * scale² (matches IVM grid when scale=1)
    const expectedQ = 8 * scale * scale;
    console.log(
      `[RT] Quadray Tetrahedron: normalize=${normalize}, scale=${scale}`
    );
    console.log(`  WXYZ raw: [${wxyz_raw[0]}] → [${wxyz_raw[3]}]`);
    console.log(
      `  WXYZ normalized: [${wxyz_normalized[0].map(n => n.toFixed(3)).join(", ")}]`
    );
    console.log(
      `  Edge Q: expected=${expectedQ.toFixed(6)}, actual=${sampleQ.toFixed(6)}, error=${Math.abs(sampleQ - expectedQ).toExponential(2)}`
    );

    return {
      vertices,
      edges,
      faces,
      // Preserve Quadray coordinates for display/inspection
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
   * This is the key insight: the 4th coordinate is NOT redundant in native Quadray.
   *
   * @param {number} scale - Base scale
   * @param {number} zStretch - Stretch factor for Z vertex (default: 1 = regular)
   * @returns {Object} - Geometry with deformed tetrahedron
   */
  quadrayTetrahedronDeformed: (scale = 1, zStretch = 2) => {
    // Stretch the Z vertex while keeping W, X, Y at unit distance
    const wxyz = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, zStretch], // Stretched!
    ];

    console.log(
      `[RT] Deformed Quadray Tetrahedron: Z stretched by ${zStretch}x`
    );
    console.log(`  Standard: (1,0,0,0), (0,1,0,0), (0,0,1,0), (0,0,0,1)`);
    console.log(
      `  Deformed: (1,0,0,0), (0,1,0,0), (0,0,1,0), (0,0,0,${zStretch})`
    );
    console.log(
      `  With zero-sum: Z normalizes to (0,0,0,1) — deformation LOST`
    );
    console.log(
      `  Without zero-sum: Z stays at (0,0,0,${zStretch}) — deformation PRESERVED`
    );

    // Return WITHOUT normalization to preserve deformation
    return Polyhedra.quadrayTetrahedron(scale, {
      normalize: false,
      wxyz: wxyz,
    });
  },

  /**
   * Dual Quadray Tetrahedron
   * The inverted tetrahedron defined natively in Quadray space.
   *
   * Standard approach: vertices at (0,1,1,1) permutations (three active coordinates)
   * This is equivalent to adding (1,1,1,1) to the negative tetrahedron.
   *
   * @param {number} scale - Uniform scale factor
   * @param {Object} options - Configuration options
   * @returns {Object} - Dual tetrahedron geometry with Quadray metadata
   */
  quadrayDualTetrahedron: (scale = 1, options = {}) => {
    const { normalize = true } = options;

    // Dual tetrahedron: single INACTIVE coordinate per vertex
    // This is the +(1,1,1,1) normalized form of the negative tetrahedron
    const wxyz = [
      [0, 1, 1, 1], // W-axis inactive (opposite of W vertex)
      [1, 0, 1, 1], // X-axis inactive
      [1, 1, 0, 1], // Y-axis inactive
      [1, 1, 1, 0], // Z-axis inactive
    ];

    console.log(`[RT] Quadray Dual Tetrahedron: scale=${scale}`);
    console.log(
      `  Vertices: (0,1,1,1) permutations (single inactive coordinate)`
    );
    console.log(
      `  Relationship: dual = base inverted through origin + (1,1,1,1)`
    );

    return Polyhedra.quadrayTetrahedron(scale, {
      normalize: normalize,
      wxyz: wxyz,
    });
  },
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
