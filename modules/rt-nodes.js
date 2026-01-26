/**
 * rt-nodes.js - Vertex Node Management Module
 *
 * Extracted from rt-rendering.js (Phase 3 of JAN26-EXTRACT workplan)
 *
 * Contains:
 * - getPolyhedronEdgeQuadrance() - RT-pure edge Q for each polyhedron type
 * - getClosePackedRadius() - Universal r = √(Q/4) formula
 * - getCachedNodeGeometry() - Geometry cache management
 * - addMatrixNodes() - Planar matrix node generation
 * - addRadialMatrixNodes() - Radial matrix node generation
 * - Node configuration setters
 *
 * Dependencies:
 * - rt-math.js (RT.Phi for φ calculations)
 * - rt-polyhedra.js (for geometry generation)
 * - performance-clock.js (for triangle counting)
 * - THREE.js
 */

import { RT } from "./rt-math.js";

// ============================================================================
// MODULE-LEVEL STATE
// ============================================================================

/** Cache for node geometries to avoid regeneration */
const nodeGeometryCache = new Map();

/** Current node geometry type: true = RT Geodesic, false = Classical Sphere */
let useRTNodeGeometry = true;

/** Current geodesic frequency for RT node geometry (1-4) */
let geodesicFrequency = 3;

/** Current node opacity (0-1) */
let nodeOpacity = 0.6;

// ============================================================================
// EDGE QUADRANCE CALCULATIONS (RT-PURE)
// ============================================================================

/**
 * Get edge quadrance for a polyhedron type using RT-pure calculations
 *
 * RATIONAL TRIGONOMETRY: Returns Q = a² (edge quadrance), NOT edge length!
 * This allows downstream calculations to stay in quadrance space.
 *
 * @param {string} type - Polyhedron type (tetrahedron, cube, octahedron, etc.)
 * @param {number} scale - halfSize parameter (s)
 * @param {Object} options - Optional parameters (e.g., {sides: 3} for polygon)
 * @returns {number} Edge quadrance Q = a² (NOT edge length!)
 */
function getPolyhedronEdgeQuadrance(type, scale, options = {}) {
  const s2 = scale * scale; // Pre-compute s² for RT calculations

  switch (type) {
    case "point":
      // Points have no edges - packed sizing not applicable
      return null;

    case "line":
      // Line edge quadrance is the line's quadrance parameter
      // Stored in group.userData.parameters.quadrance
      // For close-packing: r = √Q / 2, so Q_vertex = Q_edge / 4
      return scale; // scale IS the quadrance for line primitive

    case "polygon": {
      // RT-PURE: Polygon edge quadrance from circumradius quadrance
      // Q_edge = 4·Q_R·spread(π/n) where spread = sin²(θ)
      // Math.sin justified: arbitrary n-gon spread requires classical trig
      // scale = circumradius quadrance (Q_R), sides from options parameter
      const sides = options.sides || 3;
      const centralAngle = Math.PI / sides;
      const spread = Math.pow(Math.sin(centralAngle), 2);
      return 4 * scale * spread; // RT-pure quadrance result
    }

    case "tetrahedron":
      // Edge quadrance Q = 8s² (edge = 2s√2)
      return 8 * s2;

    case "dualTetrahedron":
      // Edge quadrance Q = 8s² (edge = 2s√2, SAME as regular tetrahedron!)
      // Vertices: (±s, ∓s, ∓s) - same as tet, just different vertex selection
      // Edge: (s,-s,-s) → (-s,s,-s): Q = (2s)² + (2s)² + 0² = 8s²
      return 8 * s2;

    case "cube":
      // Edge quadrance Q = 4s² (edge = 2s)
      return 4 * s2;

    case "octahedron":
      // Edge quadrance Q = 2s² (edge = s√2)
      return 2 * s2;

    case "icosahedron": {
      // RT-PURE: Edge quadrance using algebraic φ expression (NO hardcoded decimals!)
      // Vertices: a = s/√(1 + φ²), edge Q = 4a² = 4s²/(1 + φ²)
      // Since φ² = φ + 1 (from φ² - φ - 1 = 0):
      // Q = 4s²/(φ + 2) = 4s²/((1+√5)/2 + 2) = 8s²/(5 + √5)
      // This defers √5 expansion to RT.Phi.sqrt5() - algebraic until last step
      const Q_coefficient = 8 / (5 + RT.Phi.sqrt5());
      return Q_coefficient * s2;
    }

    case "dodecahedron": {
      // RT-PURE: Dodecahedron edge quadrance using algebraic φ (NO decimals!)
      // Vertices: cube corners (±s,±s,±s) + phi vertices (0,±s/φ,±sφ) and permutations
      // Sample edge [0,8]: (s,s,s) → (0,s/φ,sφ)
      // Q = s² + s²(1-1/φ)² + s²(1-φ)²
      // Using 1/φ = φ-1 and φ² = φ+1:
      //   = s²[1 + (2-φ)² + (1-φ)²] = s²[1 + (5-3φ) + (2-φ)] = s²(8-4φ)
      //   = 4s²(2-φ) = 2s²(4-2φ) = 2s²(4-(1+√5)) = 2s²(3-√5)
      const Q_coefficient = 2 * (3 - RT.Phi.sqrt5());
      return Q_coefficient * s2;
    }

    case "dualIcosahedron": {
      // RT-PURE: Dual icosa edge Q = base icosa Q × φ²
      // dualRadius = φ × halfSize, so all quadrances scale by φ²
      // Q_dual = Q_base × φ² = [8/(5+√5)] × (φ+1) using φ²=φ+1
      const phi_squared = RT.Phi.squared(); // φ² = φ + 1 (algebraic!)
      const Q_base_coefficient = 8 / (5 + RT.Phi.sqrt5());
      return Q_base_coefficient * phi_squared * s2;
    }

    case "cuboctahedron":
      // Edge quadrance Q = 2s² (scaled by √2 to match matrix geometry)
      // UPDATED: Single and matrix polyhedra both use scale * √2
      // Vertices at scale (not scale/√2): (±s,±s,0), (±s,0,±s), (0,±s,±s)
      // Edge: (s,s,0) → (s,0,s): Q = 0² + s² + s² = 2s²
      // Original formula was Q = s² for vertices at s/√2, now Q = 2s² for vertices at s
      return 2 * s2;

    case "rhombicDodecahedron":
      // Edge quadrance Q = 3s²/4 (scaled by √2 to match matrix geometry)
      // UPDATED: Single and matrix polyhedra both use scale * √2
      // With vertices at scale (not scale/√2):
      // Axial vertices at s: (±s,0,0), (0,±s,0), (0,0,±s)
      // Octant vertices at s/2: (±s/2,±s/2,±s/2)
      // Edge: (s,0,0) → (s/2,s/2,s/2): Q = (s/2)² + (s/2)² + (s/2)² = 3s²/4
      // Original formula was Q = 3s²/8 for vertices at s/√2, now Q = 3s²/4 for vertices at s
      return (3 / 4) * s2;

    case "geodesicTetrahedron":
    case "geodesicOctahedron":
    case "geodesicIcosahedron": {
      // Geodesics subdivide base edges - use base polyhedron quadrance
      const baseType = type.replace("geodesic", "").toLowerCase();
      return getPolyhedronEdgeQuadrance(baseType, scale);
    }

    case "quadrayTetrahedron":
      // RT-PURE Quadray Tetrahedron: Edge Q = 8s² (matches standard tetrahedron)
      // Raw basis vectors (1,1,1), (1,-1,-1), (-1,1,-1), (-1,-1,1) without .normalize()
      // Zero-sum normalized coords (0.75,-0.25,-0.25,-0.25) → Cartesian (1,1,1)
      // Edge Q = |(1,1,1) - (1,-1,-1)|² = |0,2,2|² = 8
      return 8 * s2;

    case "quadrayTetraDeformed": {
      // Deformed Quadray Tetrahedron: Variable edge lengths
      // Z vertex stretched by zStretch factor (default 2)
      // For close-packing, use SHORTEST edge (between W,X,Y vertices) = Q = 8s²
      // Edges to Z vertex are longer: Q = 8s² * zStretch (approximately)
      // Conservative approach: use base edge Q = 8s² for tight packing on shorter edges
      return 8 * s2;
    }

    case "quadrayCuboctahedron":
      // Quadray Cuboctahedron (Vector Equilibrium): {2,1,1,0} permutations
      // 12 vertices from sphere packing - matches XYZ cuboctahedron geometry
      // The Quadray VE is rendered at scale/2 to match XYZ cuboctahedron size
      // Edge quadrance matches regular cuboctahedron: Q = 2s²
      // This ensures packed nodes are correctly sized for the actual geometry
      return 2 * s2;

    default:
      console.warn(
        `Unknown polyhedron type: ${type}, using default cube Q=4s²`
      );
      return 4 * s2;
  }
}

// ============================================================================
// CLOSE-PACKED RADIUS (RT-PURE)
// ============================================================================

/**
 * Calculate close-packed vertex sphere radius using RT-pure quadrance formula
 *
 * RATIONAL TRIGONOMETRY: Q_vertex = Q_edge / 4 (pure algebra!)
 * Stay in quadrance space as long as possible, only sqrt at final step.
 *
 * UNIVERSAL FORMULA: When spheres at adjacent vertices are mutually tangent,
 * the vertex sphere quadrance is exactly 1/4 of the edge quadrance.
 * Classical equivalent: r = a/2, but we work with Q = a²/4 directly.
 *
 * @param {string} type - Polyhedron type
 * @param {number} scale - halfSize parameter
 * @param {Object} options - Optional parameters (e.g., {sides: 3} for polygon)
 * @returns {number} Vertex sphere radius for close-packing
 */
function getClosePackedRadius(type, scale, options = {}) {
  // RT-PURE: Work in quadrance space (no sqrt until final step!)
  const Q_edge = getPolyhedronEdgeQuadrance(type, scale, options);

  // Handle forms without edges (e.g., Point)
  if (Q_edge === null || Q_edge === 0) {
    console.log(`⚠️ Close-pack not available for ${type} (no edges)`);
    return null; // Signal packed sizing not available
  }

  // UNIVERSAL CLOSE-PACKING LAW (Rational Trigonometry form):
  // Q_vertex = Q_edge / 4
  // Pure algebraic relationship - no transcendental functions!
  const Q_vertex = Q_edge / 4;

  // Only NOW do we take sqrt for final radius (rendering requirement)
  const radius = Math.sqrt(Q_vertex);

  // DIAGNOSTIC: RT validation logging (matches rt-polyhedra.js pattern)
  console.log(`🔵 Close-pack RT for ${type} (halfSize=${scale.toFixed(4)}):`);
  console.log(`  Edge quadrance Q_edge: ${Q_edge.toFixed(6)}`);
  console.log(`  Vertex quadrance Q_vertex = Q_edge/4: ${Q_vertex.toFixed(6)}`);
  console.log(`  Vertex radius r = √Q_vertex: ${radius.toFixed(6)}`);
  console.log(`  ✓ RT-PURE: Stayed in quadrance space until final sqrt`);

  return radius;
}

// ============================================================================
// NODE GEOMETRY CACHE
// ============================================================================

/**
 * Get cached node geometry (prevents repeated generation)
 * @param {boolean} useRT - Use RT geodesic icosahedron (true) or classical sphere (false)
 * @param {string} nodeSize - Size ('sm', 'md', 'lg', 'packed', 'off')
 * @param {string} polyhedronType - Type for close-pack calculations
 * @param {number} scale - halfSize for close-pack calculations
 * @param {Object} options - Optional parameters (e.g., {sides: 3} for polygon)
 * @returns {Object} {geometry: THREE.BufferGeometry, triangles: number}
 */
function getCachedNodeGeometry(
  useRT,
  nodeSize,
  polyhedronType,
  scale,
  options = {}
) {
  // Include options.sides in cache key for polygon (different n-gons have different edge quadrance)
  const sidesKey = options.sides ? `-n${options.sides}` : "";
  const cacheKey = `${useRT ? "rt" : "classical"}-${nodeSize}-${polyhedronType || "default"}-${scale || 1}${sidesKey}`;

  if (nodeGeometryCache.has(cacheKey)) {
    return nodeGeometryCache.get(cacheKey);
  }

  let nodeGeometry;
  let trianglesPerNode = 0;
  let radius;

  if (nodeSize === "packed") {
    // CLOSE-PACKED MODE: Calculate from edge length using universal formula
    if (!polyhedronType || !scale) {
      console.warn(
        "⚠️ Packed mode requires polyhedronType and scale parameters"
      );
      radius = 0.04; // Fallback to medium size
    } else {
      radius = getClosePackedRadius(polyhedronType, scale, options);
      // Fallback if packed not available (e.g., Point has no edges)
      if (radius === null) {
        radius = 0.04; // "md" size fallback
      }
    }
  } else {
    // FIXED SIZE MODE: Use predefined sizes
    const nodeSizes = {
      sm: 0.02,
      md: 0.04,
      lg: 0.08,
    };
    radius = nodeSizes[nodeSize] || 0.04;
  }

  if (useRT) {
    // RT Geodesic Icosahedron with user-selected frequency
    const polyData = window.RTPolyhedra.geodesicIcosahedron(
      radius,
      geodesicFrequency,
      "out"
    );

    nodeGeometry = new THREE.BufferGeometry();
    const positions = [];
    const indices = [];

    polyData.vertices.forEach(v => {
      positions.push(v.x, v.y, v.z);
    });

    polyData.faces.forEach(faceIndices => {
      for (let i = 1; i < faceIndices.length - 1; i++) {
        indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
      }
    });

    nodeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    nodeGeometry.setIndex(indices);
    nodeGeometry.computeVertexNormals();

    trianglesPerNode = indices.length / 3;
  } else {
    // Classical THREE.js Sphere
    nodeGeometry = new THREE.SphereGeometry(radius, 16, 16);
    trianglesPerNode = 16 * 16 * 2; // 512 triangles
  }

  const result = { geometry: nodeGeometry, triangles: trianglesPerNode };
  nodeGeometryCache.set(cacheKey, result);
  return result;
}

// ============================================================================
// MATRIX NODE GENERATION
// ============================================================================

/**
 * Add vertex nodes to a matrix group
 * Generates unique vertex positions for matrix arrays
 * Supports alternating orientations for tetrahedra
 *
 * @param {THREE.Group} matrixGroup - Group to add nodes to
 * @param {number} matrixSize - Grid size (N×N)
 * @param {number} scale - Polyhedron scale (halfSize)
 * @param {boolean} rotate45 - Apply 45° rotation
 * @param {number} color - Node color (hex)
 * @param {string} nodeSize - Node size ("sm", "md", "lg", "packed", "off")
 * @param {string} polyhedronType - "cube", "tetrahedron", "octahedron", etc.
 * @param {boolean} faceCoplanar - Add interstitial vertices for face-coplanar modes
 */
function addMatrixNodes(
  matrixGroup,
  matrixSize,
  scale,
  rotate45,
  color,
  nodeSize,
  polyhedronType = "cube",
  faceCoplanar = false
) {
  // Get node geometry settings
  // useRTNodeGeometry is read from module-level variable set by button toggles
  const useFlatShading =
    document.getElementById("nodeFlatShading")?.checked || false;

  // Get cached node geometry AND triangle count
  const { geometry: nodeGeometry, triangles: trianglesPerNode } =
    getCachedNodeGeometry(useRTNodeGeometry, nodeSize, polyhedronType, scale);

  // Update PerformanceClock with node triangle count (for matrix nodes)
  if (window.PerformanceClock) {
    window.PerformanceClock.timings.lastNodeTriangles =
      Math.round(trianglesPerNode);
  }

  // Calculate node radius for userData (same logic as getCachedNodeGeometry)
  let nodeRadius;
  if (nodeSize === "packed") {
    nodeRadius = getClosePackedRadius(polyhedronType, scale);
  } else {
    const nodeSizes = { sm: 0.02, md: 0.04, lg: 0.08 };
    nodeRadius = nodeSizes[nodeSize] || 0.04;
  }

  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.2,
    flatShading: useFlatShading,
    transparent: nodeOpacity < 1,
    opacity: nodeOpacity,
    side: THREE.FrontSide, // Backface culling enabled - all polyhedra winding corrected (2026-01-11)
  });

  // Collect all unique vertex positions from matrix
  const vertexPositions = new Set();

  // Calculate spacing based on polyhedron type
  // - All matrices use 2 * halfSize spacing (cube-compatible)
  const spacing = scale * 2;

  // Generate polyhedron vertices at each grid position
  import("./rt-polyhedra.js").then(PolyModule => {
    const { Polyhedra } = PolyModule;

    // Get the appropriate polyhedron geometry
    let polyGeom;
    if (polyhedronType === "cube") {
      polyGeom = Polyhedra.cube(scale);
    } else if (polyhedronType === "tetrahedron") {
      polyGeom = Polyhedra.tetrahedron(scale);
    } else if (polyhedronType === "octahedron") {
      polyGeom = Polyhedra.octahedron(scale);
    } else if (polyhedronType === "cuboctahedron") {
      // Scale by √2 to match matrix geometry (vertices at scale, not scale/√2)
      polyGeom = Polyhedra.cuboctahedron(scale * Math.sqrt(2));
    } else if (polyhedronType === "rhombicDodecahedron") {
      // Scale by √2 to match matrix geometry (rhombic dodec axial vertices at scale, not scale/√2)
      polyGeom = Polyhedra.rhombicDodecahedron(scale * Math.sqrt(2));
    }

    const { vertices } = polyGeom;

    // For each grid position, add transformed vertices
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
        const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
        const offset_z = 0;

        // For tetrahedra, handle alternating orientations
        const isUp =
          polyhedronType === "tetrahedron" ? (i + j) % 2 === 0 : true;

        vertices.forEach(v => {
          let x = v.x + offset_x;
          let y = v.y + offset_y;
          let z = v.z + offset_z;

          // Apply 180° rotation for down-facing tets
          if (polyhedronType === "tetrahedron" && !isUp) {
            // Rotate 180° around Z-axis
            x = -(v.x + offset_x);
            y = -(v.y + offset_y);
          }

          // Apply 45° rotation if enabled
          if (rotate45) {
            const cos45 = Math.sqrt(0.5);
            const sin45 = Math.sqrt(0.5);
            const x_rot = cos45 * x - sin45 * y;
            const y_rot = sin45 * x + cos45 * y;
            x = x_rot;
            y = y_rot;
          }

          // Use string key for deduplication
          const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
          vertexPositions.add(key);
        });
      }
    }

    // For rhombic dodecahedra with faceCoplanar mode, add interstitial vertices
    if (polyhedronType === "rhombicDodecahedron" && faceCoplanar) {
      for (let i = 0; i < matrixSize - 1; i++) {
        for (let j = 0; j < matrixSize - 1; j++) {
          const offset_x = (i - matrixSize / 2 + 1.0) * spacing;
          const offset_y = (j - matrixSize / 2 + 1.0) * spacing;
          const offset_z = 0;

          vertices.forEach(v => {
            let x = v.x + offset_x;
            let y = v.y + offset_y;
            let z = v.z + offset_z;

            // Apply 45° rotation if enabled
            if (rotate45) {
              const cos45 = Math.sqrt(0.5);
              const sin45 = Math.sqrt(0.5);
              const x_rot = cos45 * x - sin45 * y;
              const y_rot = sin45 * x + cos45 * y;
              x = x_rot;
              y = y_rot;
            }

            // Use string key for deduplication
            const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
            vertexPositions.add(key);
          });
        }
      }
    }

    // For octahedra with colinearEdges mode, add interstitial vertices
    if (polyhedronType === "octahedron" && faceCoplanar) {
      for (let i = 0; i < matrixSize - 1; i++) {
        for (let j = 0; j < matrixSize - 1; j++) {
          const offset_x = (i - matrixSize / 2 + 1.0) * spacing;
          const offset_y = (j - matrixSize / 2 + 1.0) * spacing;
          const offset_z = 0;

          vertices.forEach(v => {
            let x = v.x + offset_x;
            let y = v.y + offset_y;
            let z = v.z + offset_z;

            // Apply 45° rotation if enabled
            if (rotate45) {
              const cos45 = Math.sqrt(0.5);
              const sin45 = Math.sqrt(0.5);
              const x_rot = cos45 * x - sin45 * y;
              const y_rot = sin45 * x + cos45 * y;
              x = x_rot;
              y = y_rot;
            }

            // Use string key for deduplication
            const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
            vertexPositions.add(key);
          });
        }
      }
    }

    // Create nodes at unique positions
    vertexPositions.forEach(key => {
      const [x, y, z] = key.split(",").map(parseFloat);
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
      node.position.set(x, y, z);
      node.renderOrder = 3;

      // Mark as vertex node for Papercut section cut detection
      node.userData.isVertexNode = true;
      node.userData.nodeType = "sphere"; // "sphere" (current) vs "polyhedron" (future)
      node.userData.nodeRadius = nodeRadius;
      node.userData.nodeGeometry = useRTNodeGeometry ? "rt" : "classical";

      matrixGroup.add(node);
    });

    console.log(
      `[Matrix Nodes] Added ${vertexPositions.size} nodes to ${matrixSize}×${matrixSize} ${polyhedronType} matrix`
    );
  });
}

/**
 * Add vertex nodes to a radial matrix group
 * Takes pre-computed center positions rather than N×N grid
 * @param {THREE.Group} matrixGroup - Group to add nodes to
 * @param {Array} centerPositions - Array of {x, y, z} center positions
 * @param {number} scale - Polyhedron scale (halfSize)
 * @param {number} color - Node color
 * @param {string} nodeSize - Node size ("sm", "md", "lg", "packed", "off")
 * @param {string} polyhedronType - "cube", "rhombicDodecahedron", "tetrahedron", "octahedron", "cuboctahedron"
 * @param {boolean} ivmRotation - If true, apply 45° rotation to vertices (for IVM octahedra)
 */
function addRadialMatrixNodes(
  matrixGroup,
  centerPositions,
  scale,
  color,
  nodeSize,
  polyhedronType = "cube",
  ivmRotation = false
) {
  // Get node geometry settings
  const useFlatShading =
    document.getElementById("nodeFlatShading")?.checked || false;

  // Get cached node geometry AND triangle count
  const { geometry: nodeGeometry, triangles: trianglesPerNode } =
    getCachedNodeGeometry(useRTNodeGeometry, nodeSize, polyhedronType, scale);

  // Update PerformanceClock with node triangle count
  if (window.PerformanceClock) {
    window.PerformanceClock.timings.lastNodeTriangles =
      Math.round(trianglesPerNode);
  }

  // Calculate node radius for userData
  let nodeRadius;
  if (nodeSize === "packed") {
    nodeRadius = getClosePackedRadius(polyhedronType, scale);
  } else {
    const nodeSizes = { sm: 0.02, md: 0.04, lg: 0.08 };
    nodeRadius = nodeSizes[nodeSize] || 0.04;
  }

  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.2,
    flatShading: useFlatShading,
    transparent: nodeOpacity < 1,
    opacity: nodeOpacity,
    side: THREE.FrontSide,
  });

  // Collect all unique vertex positions from matrix
  const vertexPositions = new Set();

  // Generate polyhedron vertices at each center position
  import("./rt-polyhedra.js").then(PolyModule => {
    const { Polyhedra } = PolyModule;

    // Get the appropriate polyhedron geometry
    let polyGeom;
    if (polyhedronType === "cube") {
      polyGeom = Polyhedra.cube(scale);
    } else if (polyhedronType === "rhombicDodecahedron") {
      // Scale by √2 to match matrix geometry
      polyGeom = Polyhedra.rhombicDodecahedron(scale * Math.sqrt(2));
    } else if (polyhedronType === "tetrahedron") {
      polyGeom = Polyhedra.tetrahedron(scale);
    } else if (polyhedronType === "octahedron") {
      polyGeom = Polyhedra.octahedron(scale);
    } else if (polyhedronType === "cuboctahedron") {
      // Scale by √2 to match matrix geometry (vertices at scale from center)
      polyGeom = Polyhedra.cuboctahedron(scale * Math.sqrt(2));
    }

    // For each center position, add transformed vertices
    // Tetrahedra have orientation ("up" or "down") that affects vertex positions
    // IVM octahedra need 45° rotation applied to both vertices and positions

    // 45° rotation matrix (RT-pure: s=0.5, c=0.5 → cos=sin=√0.5)
    // [cos, -sin, 0]   [√0.5, -√0.5, 0]
    // [sin,  cos, 0] = [√0.5,  √0.5, 0]
    // [0,    0,   1]   [0,     0,    1]
    const sqrt05 = Math.sqrt(0.5);
    const rotate45 = (x, y, z) => ({
      x: x * sqrt05 - y * sqrt05,
      y: x * sqrt05 + y * sqrt05,
      z: z,
    });

    centerPositions.forEach(pos => {
      let vertices;
      if (polyhedronType === "tetrahedron" && pos.orientation) {
        // Use base or dual tetrahedron based on orientation
        const tetGeom =
          pos.orientation === "up"
            ? Polyhedra.tetrahedron(scale)
            : Polyhedra.dualTetrahedron(scale);
        vertices = tetGeom.vertices;
      } else {
        vertices = polyGeom.vertices;
      }

      vertices.forEach(v => {
        let vx = v.x,
          vy = v.y,
          vz = v.z;
        let px = pos.x,
          py = pos.y,
          pz = pos.z;

        if (ivmRotation) {
          // For IVM octahedra: rotate vertex 45°, then translate, then rotate result 45°
          // Step 1: Rotate vertex around origin
          const rv = rotate45(vx, vy, vz);
          // Step 2: Add position (position is in pre-rotated coords)
          const tx = rv.x + px;
          const ty = rv.y + py;
          const tz = rv.z + pz;
          // Step 3: Rotate the whole thing (constellation rotation)
          const final = rotate45(tx, ty, tz);
          vx = final.x;
          vy = final.y;
          vz = final.z;
        } else {
          vx = v.x + pos.x;
          vy = v.y + pos.y;
          vz = v.z + pos.z;
        }

        // Use string key for deduplication
        const key = `${vx.toFixed(6)},${vy.toFixed(6)},${vz.toFixed(6)}`;
        vertexPositions.add(key);
      });
    });

    // Create nodes at unique positions
    vertexPositions.forEach(key => {
      const [x, y, z] = key.split(",").map(parseFloat);
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
      node.position.set(x, y, z);
      node.renderOrder = 3;

      // Mark as vertex node for Papercut section cut detection
      node.userData.isVertexNode = true;
      node.userData.nodeType = "sphere";
      node.userData.nodeRadius = nodeRadius;
      node.userData.nodeGeometry = useRTNodeGeometry ? "rt" : "classical";

      matrixGroup.add(node);
    });

    console.log(
      `[Radial Matrix Nodes] Added ${vertexPositions.size} nodes to ${centerPositions.length} ${polyhedronType} radial matrix`
    );
  });
}

// ============================================================================
// NODE CONFIGURATION SETTERS
// ============================================================================

/**
 * Set node geometry type (Classical Sphere vs RT Geodesic)
 * @param {boolean} useRT - true for RT Geodesic, false for Classical Sphere
 */
function setNodeGeometryType(useRT) {
  useRTNodeGeometry = useRT;
  nodeGeometryCache.clear();
}

/**
 * Set geodesic frequency for RT node geometry
 * @param {number} frequency - Geodesic frequency (1-4)
 */
function setGeodesicFrequency(frequency) {
  geodesicFrequency = frequency;
  nodeGeometryCache.clear();
}

/**
 * Set node opacity
 * @param {number} opacity - Opacity value (0-1)
 */
function setNodeOpacity(opacity) {
  nodeOpacity = opacity;
}

/**
 * Clear the node geometry cache
 * Called when node rendering settings change
 */
function clearNodeCache() {
  nodeGeometryCache.clear();
}

/**
 * Get current node configuration state
 * @returns {Object} Current node configuration
 */
function getNodeConfig() {
  return {
    useRTNodeGeometry,
    geodesicFrequency,
    nodeOpacity,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const Nodes = {
  // Edge quadrance calculations (RT-pure)
  getPolyhedronEdgeQuadrance,
  getClosePackedRadius,

  // Geometry cache
  getCachedNodeGeometry,
  clearNodeCache,

  // Matrix node generation
  addMatrixNodes,
  addRadialMatrixNodes,

  // Configuration setters
  setNodeGeometryType,
  setGeodesicFrequency,
  setNodeOpacity,

  // State getter
  getNodeConfig,
};
