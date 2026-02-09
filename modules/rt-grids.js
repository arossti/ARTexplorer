/**
 * rt-grids.js
 * Grid and Basis Vector Generators for ARTexplorer
 *
 * Cartesian (XYZ) and Quadray (WXYZ) coordinate grids and basis vectors.
 * Uses Rational Trigonometry (RT) for exact interval calculations.
 *
 * Extracted from rt-rendering.js (Jan 2026) for modularity.
 *
 * CODE QUALITY AUDIT NOTE (2026-01-29):
 * This module uses Math.PI for THREE.GridHelper rotation (lines 54, 75, 611, 632).
 * This is justified as a THREE.js interface requirement - GridHelper is oriented
 * in Y-up by default and requires rotation.x/z = Math.PI/2 for Z-up convention.
 *
 * FUTURE IMPROVEMENT: Replace THREE.GridHelper with custom RT-pure grid geometry
 * that generates lines directly in the correct orientation without rotation.
 * This would eliminate all Math.PI usage in this module.
 * See: Geometry documents/CODE-QUALITY-AUDIT.md for RT-purity guidelines.
 *
 * @requires THREE.js
 * @requires rt-math.js
 * @requires rt-polyhedra.js
 */

import { RT, Quadray } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js";
import { MetaLog } from "./rt-metalog.js";

// Access THREE.js from global scope (set by main HTML)

/**
 * Grid generator functions
 * @namespace Grids
 */
export const Grids = {
  /**
   * Create Cartesian grid (XYZ) - grey hairlines
   * Z-up coordinate system: Z is vertical, XY is horizontal ground plane
   *
   * @param {THREE.Scene} scene - Scene to add grids to
   * @param {number} divisions - Number of grid divisions (from slider)
   * @returns {Object} { cartesianGrid, cartesianBasis, gridXY, gridXZ, gridYZ }
   */
  createCartesianGrid: (scene, divisions = 10) => {
    const cartesianGrid = new THREE.Group();

    // Grid size scales with divisions to maintain 1.0×1.0 unit squares
    // This makes grid EXTEND (like Quadray grids) rather than subdivide
    // divisions=10 → 10-unit extent (-5 to +5) with 1.0 unit squares
    const gridSize = divisions;

    // Simple grey grid color - subtle and non-distracting
    const gridColor = 0x444444;

    // Z-UP CONVENTION: Notation swap from Y-up
    // In Z-up: XY is horizontal, XZ is vertical, YZ is vertical

    // XY plane (Z = 0) - HORIZONTAL ground plane in Z-up
    const gridXY = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    gridXY.rotation.x = Math.PI / 2;
    gridXY.visible = false; // Hidden by default
    cartesianGrid.add(gridXY);

    // XZ plane (Y = 0) - VERTICAL wall in Z-up (front/back)
    const gridXZ = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    gridXZ.visible = false; // Hidden by default
    cartesianGrid.add(gridXZ);

    // YZ plane (X = 0) - VERTICAL wall in Z-up (left/right)
    const gridYZ = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    gridYZ.rotation.z = Math.PI / 2;
    gridYZ.visible = false; // Hidden by default
    cartesianGrid.add(gridYZ);

    scene.add(cartesianGrid);

    // Create Cartesian basis vectors with tetrahedral heads (matches move handles)
    const cartesianBasis = new THREE.Group();

    // RT-PURE: Base length for unit scaling (will be scaled to cubeEdge in updateGeometry)
    const shaftLength = 1.0;
    const headSize = 0.15;

    // X-axis (Red)
    const xAxis = Grids.createCartesianTetraArrow(
      new THREE.Vector3(1, 0, 0),
      shaftLength,
      headSize,
      0xff0000
    );
    cartesianBasis.add(xAxis);

    // Y-axis (Green)
    const yAxis = Grids.createCartesianTetraArrow(
      new THREE.Vector3(0, 1, 0),
      shaftLength,
      headSize,
      0x00ff00
    );
    cartesianBasis.add(yAxis);

    // Z-axis (Blue) - vertical in Z-up convention
    const zAxis = Grids.createCartesianTetraArrow(
      new THREE.Vector3(0, 0, 1),
      shaftLength,
      headSize,
      0x0000ff
    );
    cartesianBasis.add(zAxis);

    cartesianBasis.visible = false; // Hidden by default
    scene.add(cartesianBasis);

    return { cartesianGrid, cartesianBasis, gridXY, gridXZ, gridYZ };
  },

  /**
   * Create tetrahedral arrowhead for WXYZ basis vectors
   * Uses dual tetrahedron geometry with one vertex pointing along the axis
   * Distinguishes WXYZ (tetrahedral heads) from XYZ (cone heads)
   *
   * @param {THREE.Vector3} direction - Normalized direction vector
   * @param {number} shaftLength - Length of arrow shaft
   * @param {number} headSize - Scale of tetrahedral head
   * @param {number} color - Hex color for the arrow
   * @returns {THREE.Group} Arrow with shaft and tetrahedral head
   */
  createTetrahedralArrow: (direction, shaftLength, headSize, color) => {
    const arrowGroup = new THREE.Group();

    // 1. Create hairline shaft (matches XYZ basis and edit handle lines)
    const shaftPoints = [
      new THREE.Vector3(0, 0, 0),
      direction.clone().multiplyScalar(shaftLength),
    ];
    const shaftGeometry = new THREE.BufferGeometry().setFromPoints(shaftPoints);
    const shaftMaterial = new THREE.LineBasicMaterial({ color });
    const shaft = new THREE.Line(shaftGeometry, shaftMaterial);
    arrowGroup.add(shaft);

    // 2. Create tetrahedral arrowhead using dualTetrahedron
    // Use silent option to skip RT validation logging for utility geometry
    const tetraGeom = Polyhedra.dualTetrahedron(headSize, { silent: true });

    // Find which vertex is closest to pointing in our direction
    let bestVertex = 0;
    let maxDot = -Infinity;
    tetraGeom.vertices.forEach((v, idx) => {
      const dot = v.clone().normalize().dot(direction);
      if (dot > maxDot) {
        maxDot = dot;
        bestVertex = idx;
      }
    });

    // Create mesh for tetrahedral head
    const headGeometry = new THREE.BufferGeometry();
    const positions = [];
    const indices = [];

    tetraGeom.vertices.forEach(v => {
      positions.push(v.x, v.y, v.z);
    });
    tetraGeom.faces.forEach(face => {
      indices.push(face[0], face[1], face[2]);
    });

    headGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    headGeometry.setIndex(indices);
    headGeometry.computeVertexNormals();

    const headMaterial = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);

    // Position head at end of shaft
    head.position.copy(direction.clone().multiplyScalar(shaftLength));

    // Orient head so the identified vertex points along direction
    const currentDir = tetraGeom.vertices[bestVertex].clone().normalize();
    head.quaternion.setFromUnitVectors(currentDir, direction);

    arrowGroup.add(head);

    return arrowGroup;
  },

  /**
   * Create Cartesian basis arrow with THREE.js tetrahedron head
   * (matches the move handle tetrahedra for visual consistency)
   *
   * @param {THREE.Vector3} direction - Normalized direction vector
   * @param {number} shaftLength - Length of arrow shaft
   * @param {number} headSize - Size of tetrahedral head
   * @param {number} color - Hex color for the arrow
   * @returns {THREE.Group} Arrow with shaft and tetrahedral head
   */
  createCartesianTetraArrow: (direction, shaftLength, headSize, color) => {
    const arrowGroup = new THREE.Group();

    // 1. Create hairline shaft (matches ArrowHelper line style from edit handles)
    const shaftPoints = [
      new THREE.Vector3(0, 0, 0),
      direction.clone().multiplyScalar(shaftLength),
    ];
    const shaftGeometry = new THREE.BufferGeometry().setFromPoints(shaftPoints);
    const shaftMaterial = new THREE.LineBasicMaterial({ color });
    const shaft = new THREE.Line(shaftGeometry, shaftMaterial);
    arrowGroup.add(shaft);

    // 2. Create tetrahedral arrowhead using THREE.js TetrahedronGeometry
    const tetraGeom = new THREE.TetrahedronGeometry(headSize);
    const headMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });
    const head = new THREE.Mesh(tetraGeom, headMaterial);

    // Position head at end of shaft
    head.position.copy(direction.clone().multiplyScalar(shaftLength));

    // Orient tetrahedron so one VERTEX points along the axis direction
    // Find the vertex closest to pointing in our axis direction
    const posAttr = tetraGeom.getAttribute("position");
    let bestVertex = new THREE.Vector3();
    let maxDot = -Infinity;
    for (let vi = 0; vi < posAttr.count; vi++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, vi);
      const dot = v.clone().normalize().dot(direction);
      if (dot > maxDot) {
        maxDot = dot;
        bestVertex.copy(v);
      }
    }
    // Orient so that vertex points along our axis
    const currentDir = bestVertex.clone().normalize();
    head.quaternion.setFromUnitVectors(currentDir, direction);

    arrowGroup.add(head);

    return arrowGroup;
  },

  /**
   * Create SYMBOLIC Quadray basis vectors (WXYZ) with tetrahedral arrowheads
   *
   * SYSTEM 1 OF 4: Non-interactive coordinate reference (user-toggleable visibility)
   *
   * RT-PURE ALIGNMENT: Base length calculated to reach 3x grid intervals AFTER scaling
   * - Grid interval: √6/4 ≈ 0.612 (centroid-to-vertex for unit tetrahedron)
   * - Target after scaling: 3 × √6/4 ≈ 1.837 (reaches 3rd grid intersection)
   *
   * @param {THREE.Scene} scene - Scene to add basis to
   * @returns {THREE.Group} quadrayBasis group
   */
  createQuadrayBasis: scene => {
    const quadrayBasis = new THREE.Group();

    // RT-PURE: Basis vectors reach (tetEdge + 1) grid intervals
    const gridInterval = RT.PureRadicals.QUADRAY_GRID_INTERVAL; // √6/4 ≈ 0.612
    const defaultTetEdge = 2.0;
    const scaleDenominator = 2 * Math.sqrt(2); // 2√2 ≈ 2.828

    const totalBasisLength =
      (defaultTetEdge + gridInterval) * (scaleDenominator / defaultTetEdge);

    const headSize = 0.15; // Scale of tetrahedral arrowhead

    // RT-PURE: Tetrahedral head tip extends headSize * √3 beyond its center
    const headTipExtension = headSize * Math.sqrt(3);
    const shaftLength = totalBasisLength - headTipExtension;

    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]; // R, G, B, Y

    Quadray.basisVectors.forEach((vec, i) => {
      const arrow = Grids.createTetrahedralArrow(
        vec,
        shaftLength,
        headSize,
        colors[i]
      );
      quadrayBasis.add(arrow);
    });

    quadrayBasis.visible = true; // Visible by default
    scene.add(quadrayBasis);

    return quadrayBasis;
  },

  /**
   * Create Central Angle Grid (Corrected Tessellation Method)
   * Tessellates triangular faces vertex-to-vertex - NO extraneous lines!
   * RT-PURE: Uses tetrahedron edge length as unit increment
   *
   * @param {THREE.Vector3} basis1 - First basis vector (e.g., W)
   * @param {THREE.Vector3} basis2 - Second basis vector (e.g., X)
   * @param {number} halfSize - Tetrahedron halfSize (s)
   * @param {number} tessellations - Number of triangle copies in each direction
   * @param {number} color - Grid line color
   * @returns {THREE.LineSegments} Central Angle grid geometry
   */
  createIVMGrid: (basis1, basis2, halfSize, tessellations, color) => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    // RT-PURE + PureRadicals: Unit tetrahedron grid interval
    const edgeLength = RT.PureRadicals.QUADRAY_GRID_INTERVAL;

    // DIAGNOSTIC: Log grid interval with full precision (first plane only)
    if (!window.gridIntervalLogged) {
      MetaLog.log(MetaLog.SUMMARY, "=== QUADRAY GRID INTERVAL (FIXED) ===");
      MetaLog.log(MetaLog.SUMMARY, `Grid interval (√6/4): ${edgeLength.toFixed(16)}`);
      MetaLog.log(MetaLog.SUMMARY, `Exact value: ${edgeLength}`);
      window.gridIntervalLogged = true;
    }

    // Base triangle edge vectors
    const v1 = basis1.clone().multiplyScalar(edgeLength);
    const v2 = basis2.clone().multiplyScalar(edgeLength);

    // Tessellate triangle outward
    for (let i = 0; i <= tessellations; i++) {
      for (let j = 0; j <= tessellations - i; j++) {
        // Calculate the "origin" of this triangle copy
        const triOrigin = v1
          .clone()
          .multiplyScalar(i)
          .add(v2.clone().multiplyScalar(j));

        // Three vertices of this triangle
        const p0 = triOrigin.clone();
        const p1 = triOrigin.clone().add(v1);
        const p2 = triOrigin.clone().add(v2);

        // Draw three edges (triangle outline)
        vertices.push(p0.x, p0.y, p0.z);
        vertices.push(p1.x, p1.y, p1.z);

        vertices.push(p1.x, p1.y, p1.z);
        vertices.push(p2.x, p2.y, p2.z);

        vertices.push(p2.x, p2.y, p2.z);
        vertices.push(p0.x, p0.y, p0.z);
      }
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
      })
    );
  },

  /**
   * Create Central Angle Grids (6 Quadray planes)
   * Uses vertex-to-vertex triangular tessellation
   *
   * @param {THREE.Scene} scene - Scene to add grids to
   * @param {number} tessellations - Number of triangle copies in each direction
   * @returns {Object} { ivmPlanes, ivmWX, ivmWY, ivmWZ, ivmXY, ivmXZ, ivmYZ }
   */
  createIVMPlanes: (scene, tessellations = 12) => {
    const ivmPlanes = new THREE.Group();
    const halfSize = 1.0;

    // 6 planes from 6 combinations of 4 basis vectors
    // Color scheme: W=Yellow, X=Red, Y=Blue, Z=Green → RGB two-color mixes

    // WX plane (basis 0, 1) - Yellow+Red = Orange-Yellow
    const ivmWX = Grids.createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[1],
      halfSize,
      tessellations,
      0xffaa00
    );
    ivmWX.visible = true;
    ivmWX.name = "CentralAngle_WX";
    ivmPlanes.add(ivmWX);

    // WY plane (basis 0, 2) - Yellow+Blue = Light Purple/Lavender
    const ivmWY = Grids.createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[2],
      halfSize,
      tessellations,
      0xaaaaff
    );
    ivmWY.visible = true;
    ivmWY.name = "CentralAngle_WY";
    ivmPlanes.add(ivmWY);

    // WZ plane (basis 0, 3) - Yellow+Green = Yellow-Green/Lime
    const ivmWZ = Grids.createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0xaaff00
    );
    ivmWZ.visible = true;
    ivmWZ.name = "CentralAngle_WZ";
    ivmPlanes.add(ivmWZ);

    // XY plane (basis 1, 2) - Red+Blue = Magenta
    const ivmXY = Grids.createIVMGrid(
      Quadray.basisVectors[1],
      Quadray.basisVectors[2],
      halfSize,
      tessellations,
      0xff00ff
    );
    ivmXY.visible = true;
    ivmXY.name = "CentralAngle_XY";
    ivmPlanes.add(ivmXY);

    // XZ plane (basis 1, 3) - Red+Green = Yellow
    const ivmXZ = Grids.createIVMGrid(
      Quadray.basisVectors[1],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0xffff00
    );
    ivmXZ.visible = true;
    ivmXZ.name = "CentralAngle_XZ";
    ivmPlanes.add(ivmXZ);

    // YZ plane (basis 2, 3) - Blue+Green = Cyan
    const ivmYZ = Grids.createIVMGrid(
      Quadray.basisVectors[2],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0x00ffff
    );
    ivmYZ.visible = true;
    ivmYZ.name = "CentralAngle_YZ";
    ivmPlanes.add(ivmYZ);

    MetaLog.log(
      MetaLog.SUMMARY,
      "✅ Central Angle grids created (corrected tessellation, 6 planes) with edge length:",
      (2 * halfSize * Math.sqrt(2)).toFixed(4)
    );

    scene.add(ivmPlanes);

    return { ivmPlanes, ivmWX, ivmWY, ivmWZ, ivmXY, ivmXZ, ivmYZ };
  },

  /**
   * Rebuild Quadray grids with new tessellation value
   * @param {THREE.Scene} scene - Scene to update
   * @param {THREE.Group} existingIvmPlanes - Existing ivmPlanes group to remove
   * @param {number} tessellations - Number of triangle copies in each direction
   * @param {Object} visibilityState - Object mapping plane names to visibility state
   * @returns {Object} { ivmPlanes, ivmWX, ivmWY, ivmWZ, ivmXY, ivmXZ, ivmYZ }
   */
  rebuildQuadrayGrids: (
    scene,
    existingIvmPlanes,
    tessellations,
    visibilityState = {}
  ) => {
    // Remove existing grids
    if (existingIvmPlanes) {
      scene.remove(existingIvmPlanes);
    }

    // Recreate with new tessellation
    const ivmPlanes = new THREE.Group();
    const halfSize = 1.0;

    // WX plane
    const ivmWX = Grids.createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[1],
      halfSize,
      tessellations,
      0xffaa00
    );
    ivmWX.visible = visibilityState.ivmWX ?? true;
    ivmWX.name = "CentralAngle_WX";
    ivmPlanes.add(ivmWX);

    // WY plane
    const ivmWY = Grids.createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[2],
      halfSize,
      tessellations,
      0xaaaaff
    );
    ivmWY.visible = visibilityState.ivmWY ?? true;
    ivmWY.name = "CentralAngle_WY";
    ivmPlanes.add(ivmWY);

    // WZ plane
    const ivmWZ = Grids.createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0xaaff00
    );
    ivmWZ.visible = visibilityState.ivmWZ ?? true;
    ivmWZ.name = "CentralAngle_WZ";
    ivmPlanes.add(ivmWZ);

    // XY plane
    const ivmXY = Grids.createIVMGrid(
      Quadray.basisVectors[1],
      Quadray.basisVectors[2],
      halfSize,
      tessellations,
      0xff00ff
    );
    ivmXY.visible = visibilityState.ivmXY ?? true;
    ivmXY.name = "CentralAngle_XY";
    ivmPlanes.add(ivmXY);

    // XZ plane
    const ivmXZ = Grids.createIVMGrid(
      Quadray.basisVectors[1],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0xffff00
    );
    ivmXZ.visible = visibilityState.ivmXZ ?? true;
    ivmXZ.name = "CentralAngle_XZ";
    ivmPlanes.add(ivmXZ);

    // YZ plane
    const ivmYZ = Grids.createIVMGrid(
      Quadray.basisVectors[2],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0x00ffff
    );
    ivmYZ.visible = visibilityState.ivmYZ ?? true;
    ivmYZ.name = "CentralAngle_YZ";
    ivmPlanes.add(ivmYZ);

    scene.add(ivmPlanes);

    console.log(
      `✅ Rebuilt Central Angle grids with tessellation=${tessellations}`
    );

    return { ivmPlanes, ivmWX, ivmWY, ivmWZ, ivmXY, ivmXZ, ivmYZ };
  },

  /**
   * Rebuild Cartesian grids with new tessellation value
   * @param {THREE.Scene} scene - Scene to update
   * @param {THREE.Group} existingCartesianGrid - Existing grid to remove
   * @param {THREE.Group} existingCartesianBasis - Existing basis to remove
   * @param {number} divisions - Number of grid divisions
   * @param {Object} visibilityState - Object with grid and basis visibility states
   * @returns {Object} { cartesianGrid, cartesianBasis, gridXY, gridXZ, gridYZ }
   */
  rebuildCartesianGrids: (
    scene,
    existingCartesianGrid,
    existingCartesianBasis,
    divisions,
    visibilityState = {}
  ) => {
    // Remove existing grids and basis
    if (existingCartesianGrid) {
      scene.remove(existingCartesianGrid);
    }
    if (existingCartesianBasis) {
      scene.remove(existingCartesianBasis);
    }

    // Recreate grid
    const cartesianGrid = new THREE.Group();
    const gridSize = divisions;
    const gridColor = 0x444444;

    // XY plane (Z = 0) - HORIZONTAL ground plane in Z-up
    const gridXY = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    gridXY.rotation.x = Math.PI / 2;
    gridXY.visible = visibilityState.gridXY ?? false;
    cartesianGrid.add(gridXY);

    // XZ plane (Y = 0) - VERTICAL wall in Z-up (front/back)
    const gridXZ = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    gridXZ.visible = visibilityState.gridXZ ?? false;
    cartesianGrid.add(gridXZ);

    // YZ plane (X = 0) - VERTICAL wall in Z-up (left/right)
    const gridYZ = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    gridYZ.rotation.z = Math.PI / 2;
    gridYZ.visible = visibilityState.gridYZ ?? false;
    cartesianGrid.add(gridYZ);

    scene.add(cartesianGrid);

    // Recreate basis vectors with tetrahedral heads (matches move handles)
    const cartesianBasis = new THREE.Group();
    const shaftLength = 2.0;
    const headSize = 0.25;

    // X-axis (Red)
    const xAxis = Grids.createCartesianTetraArrow(
      new THREE.Vector3(1, 0, 0),
      shaftLength,
      headSize,
      0xff0000
    );
    cartesianBasis.add(xAxis);

    // Y-axis (Green)
    const yAxis = Grids.createCartesianTetraArrow(
      new THREE.Vector3(0, 1, 0),
      shaftLength,
      headSize,
      0x00ff00
    );
    cartesianBasis.add(yAxis);

    // Z-axis (Blue)
    const zAxis = Grids.createCartesianTetraArrow(
      new THREE.Vector3(0, 0, 1),
      shaftLength,
      headSize,
      0x0000ff
    );
    cartesianBasis.add(zAxis);

    cartesianBasis.visible = visibilityState.cartesianBasis ?? false;
    scene.add(cartesianBasis);

    return { cartesianGrid, cartesianBasis, gridXY, gridXZ, gridYZ };
  },

  /* ═══════════════════════════════════════════════════════════════════════════
   * POLYGON TILING GRIDS
   * ═══════════════════════════════════════════════════════════════════════════
   * Functions for subdividing regular polygons into smaller tiles.
   * Used for: Polygon primitive tiling, Geodesic face tiling, Penrose scaffold.
   * ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Generate a triangular grid by subdividing an equilateral triangle
   * Each generation divides each triangle into 4 smaller triangles.
   * Similar to geodesic Class I subdivision.
   *
   * @param {number} quadrance - Circumradius quadrance of the original triangle (Q = R²)
   * @param {number} generations - Number of subdivision generations (1 = original, 2 = 4 tiles)
   * @param {Object} options - Configuration options
   * @param {boolean} options.showFace - Whether to include faces (default true)
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  triangularTiling: (quadrance, generations = 1, options = {}) => {
    const showFace = options.showFace !== false;
    const R = Math.sqrt(quadrance);
    const n = Math.pow(2, generations - 1); // Divisions per edge

    // Equilateral triangle vertices (centered, pointing up)
    const sqrt3 = Math.sqrt(3);
    const A = new THREE.Vector3(0, R, 0); // Top
    const B = new THREE.Vector3((-R * sqrt3) / 2, -R / 2, 0); // Bottom left
    const C = new THREE.Vector3((R * sqrt3) / 2, -R / 2, 0); // Bottom right

    // Generate vertices using barycentric interpolation
    const vertices = [];
    const vertexMap = {};

    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n - i; j++) {
        const k = n - i - j;
        const x = (i * A.x + j * B.x + k * C.x) / n;
        const y = (i * A.y + j * B.y + k * C.y) / n;
        vertices.push(new THREE.Vector3(x, y, 0));
        vertexMap[`${i},${j}`] = vertices.length - 1;
      }
    }

    // Generate edges and faces
    const edges = [];
    const edgeSet = new Set();
    const faces = [];

    const addEdge = (v1, v2) => {
      const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([v1, v2]);
      }
    };

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i; j++) {
        // Upward triangle
        const v0 = vertexMap[`${i},${j}`];
        const v1 = vertexMap[`${i},${j + 1}`];
        const v2 = vertexMap[`${i + 1},${j}`];

        addEdge(v0, v1);
        addEdge(v1, v2);
        addEdge(v2, v0);
        // CCW winding for +Z normal (faces visible from above)
        if (showFace) faces.push([v0, v2, v1]);

        // Downward triangle (if valid)
        if (j + 1 <= n - i - 1) {
          const v3 = vertexMap[`${i + 1},${j + 1}`];
          if (v3 !== undefined) {
            addEdge(v1, v3);
            addEdge(v3, v2);
            // CCW winding for +Z normal
            if (showFace) faces.push([v1, v2, v3]);
          }
        }
      }
    }

    const tileCount = n * n;
    console.log(
      `[RT] Triangular tiling: gen=${generations}, n=${n}, ` +
        `V=${vertices.length}, E=${edges.length}, F=${faces.length}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "triangular-tiling",
        generations,
        divisionsPerEdge: n,
        tileCount,
        circumradiusQuadrance: quadrance,
        rtPure: true,
      },
    };
  },

  /**
   * Generate a square grid by subdividing a square
   * Each generation divides each square into 4 smaller squares.
   *
   * @param {number} quadrance - Circumradius quadrance of the original square (Q = R²)
   * @param {number} generations - Number of subdivision generations
   * @param {Object} options - Configuration options
   * @param {boolean} options.showFace - Whether to include faces (default true)
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  squareTiling: (quadrance, generations = 1, options = {}) => {
    const showFace = options.showFace !== false;
    const R = Math.sqrt(quadrance);
    const n = Math.pow(2, generations - 1); // Divisions per edge
    const halfSize = R / Math.sqrt(2); // Half-diagonal for inscribed square

    const vertices = [];
    const vertexMap = {};

    // Grid of (n+1) × (n+1) vertices
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const x = -halfSize + (2 * halfSize * i) / n;
        const y = -halfSize + (2 * halfSize * j) / n;
        vertices.push(new THREE.Vector3(x, y, 0));
        vertexMap[`${i},${j}`] = vertices.length - 1;
      }
    }

    const edges = [];
    const edgeSet = new Set();
    const faces = [];

    const addEdge = (v1, v2) => {
      const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([v1, v2]);
      }
    };

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v0 = vertexMap[`${i},${j}`];
        const v1 = vertexMap[`${i + 1},${j}`];
        const v2 = vertexMap[`${i + 1},${j + 1}`];
        const v3 = vertexMap[`${i},${j + 1}`];

        addEdge(v0, v1);
        addEdge(v1, v2);
        addEdge(v2, v3);
        addEdge(v3, v0);
        if (showFace) faces.push([v0, v1, v2, v3]);
      }
    }

    const tileCount = n * n;
    console.log(
      `[RT] Square tiling: gen=${generations}, n=${n}, ` +
        `V=${vertices.length}, E=${edges.length}, F=${faces.length}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "square-tiling",
        generations,
        divisionsPerEdge: n,
        tileCount,
        circumradiusQuadrance: quadrance,
        rtPure: true,
      },
    };
  },

  /**
   * Generate a pentagonal array pattern for Penrose guidance grid
   *
   * Creates an array of regular pentagons arranged with 5-fold symmetry.
   * Pentagons don't tile the plane - the gaps between them form the
   * characteristic star shapes seen in Penrose tilings.
   *
   * Pattern structure:
   * - Gen 1: Single central pentagon
   * - Gen 2: 5 inner pentagons arranged around a central star gap
   * - Gen 3: 5 inner + 5 outer pentagons (10 total)
   * - Gen 4+: Additional outer rings
   *
   * @param {number} quadrance - Circumradius quadrance of the overall pattern (Q = R²)
   * @param {number} generations - Number of rings (1 = single, 2 = inner ring, 3 = inner+outer)
   * @param {Object} options - Configuration options
   * @param {boolean} options.showFace - Whether to include faces (default true)
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  pentagonalTiling: (quadrance, generations = 1, options = {}) => {
    const showFace = options.showFace !== false;
    const R = Math.sqrt(quadrance); // Overall pattern radius (sqrt at GPU boundary only)

    // Cap generations at 3 (see TODO comment below for Gen 4+ research)
    const maxGen = Math.min(generations, 3);
    if (generations > 3) {
      console.warn(
        `[RT] Pentagon array: Gen ${generations} requested, capped at 3 (proper extension requires Penrose research)`
      );
    }

    // RT-pure golden ratio constants
    const phi = RT.PurePhi.value(); // φ = (1 + √5)/2
    const invPhi = RT.PurePhi.inverse(); // 1/φ = φ - 1

    const vertices = [];
    const vertexMap = {};
    const edges = [];
    const edgeSet = new Set();
    const faces = [];

    // Helper to get or create vertex
    const getVertex = (x, y, z = 0) => {
      const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
      if (vertexMap[key] !== undefined) {
        return vertexMap[key];
      }
      const idx = vertices.length;
      vertices.push(new THREE.Vector3(x, y, z));
      vertexMap[key] = idx;
      return idx;
    };

    const addEdge = (v1, v2) => {
      const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([v1, v2]);
      }
    };

    /**
     * RT-pure rotation by n×36° using cached trig values
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} n - Number of 36° rotations
     * @returns {{x: number, y: number}} Rotated point
     */
    const rotateN36 = (x, y, n) => {
      return RT.PurePhi.penrose.rotateN36(x, y, n);
    };

    /**
     * Add a pentagon at given center with vertices computed RT-pure
     * Pentagon has one vertex pointing toward origin
     * @param {number} cx - Center x
     * @param {number} cy - Center y
     * @param {number} r - Circumradius
     * @param {number} rotationSteps - Rotation in 36° increments (integer)
     */
    const addPentagon = (cx, cy, r, rotationSteps) => {
      const pentVerts = [];
      // Start with vertex pointing down (toward center when pentagon is above origin)
      // Base vertex at (0, -r), then rotate for each vertex
      for (let i = 0; i < 5; i++) {
        // Each vertex is 72° = 2×36° apart
        // Rotation: rotationSteps × 36° + i × 72°
        const totalSteps = rotationSteps + i * 2;
        const rotated = rotateN36(0, -r, totalSteps);
        const x = cx + rotated.x;
        const y = cy + rotated.y;
        pentVerts.push(getVertex(x, y, 0));
      }
      // Add edges
      for (let i = 0; i < 5; i++) {
        addEdge(pentVerts[i], pentVerts[(i + 1) % 5]);
      }
      // Add face (pentagon as 5-vertex face)
      if (showFace) {
        faces.push([...pentVerts]);
      }
    };

    let pentagonCount = 0;

    if (maxGen === 1) {
      // Single central pentagon with vertex pointing up
      addPentagon(0, 0, R, 5); // 5×36° = 180° rotation so vertex points up
      pentagonCount = 1;
    } else {
      // Penrose-compatible pentagon array geometry:
      // Inner pentagons have inward vertices nearly meeting at center
      // This creates the characteristic 5-pointed star gap

      // Pentagon circumradius - sized to fit the pattern
      // R × φ/(φ+1) = R × φ/φ² = R/φ using RT-pure identity
      const pentRadius = R * invPhi;

      // Inner ring: position pentagon centers so adjacent pentagons don't overlap
      // For 5 pentagons at 72° spacing, centers must be at least pentRadius/sin(36°) apart
      // Using φ as multiplier provides good spacing with RT-pure relationship
      // innerRingRadius = pentRadius × φ ensures vertices nearly meet at center
      const innerRingRadius = pentRadius * phi;

      // Inner ring: 5 pentagons at 72° = 2×36° intervals, starting at top
      for (let i = 0; i < 5; i++) {
        // Position at (0, innerRingRadius) rotated by i×72° (starting from top)
        const pos = rotateN36(0, innerRingRadius, i * 2); // i×72° = i×2×36°
        // Pentagon base vertex at (0, -r) points toward origin when rotation matches position
        // No 180° offset needed - base vertex naturally points inward
        addPentagon(pos.x, pos.y, pentRadius, i * 2);
        pentagonCount++;
      }

      if (maxGen >= 3) {
        // Outer ring: 5 pentagons positioned to interlock with inner ring
        // Offset by 36° from inner ring and scaled by φ
        const outerRingRadius = innerRingRadius * phi;

        for (let i = 0; i < 5; i++) {
          // Position offset by 36° (1 step) from inner ring positions
          const pos = rotateN36(0, outerRingRadius, i * 2 + 1); // (i×72° + 36°)
          // Rotate so vertex points toward center
          addPentagon(pos.x, pos.y, pentRadius, i * 2 + 1);
          pentagonCount++;
        }
      }

      // TODO: Gen 4+ pentagon extension requires research into proper Penrose P3 tiling rules.
      // Current implementation caps at Gen 3 (inner 5 + outer 5 = 10 pentagons).
      // For deeper nesting, consider:
      // 1. Geodesic frequency as parent multiplier for face tiling (polygons as children)
      // 2. True Penrose P3 deflation rules for kites/darts → pentagon subdivision
      // 3. Research how pentagons properly nest in Penrose patterns
      // See: Geometry documents/Penrose-Spheres.md for context
    }

    console.log(
      `[RT] Pentagonal array: gen=${maxGen}, ` +
        `pentagons=${pentagonCount}, V=${vertices.length}, E=${edges.length}, F=${faces.length}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "pentagonal-array",
        generations,
        pentagonCount,
        circumradiusQuadrance: quadrance,
        rtPure: true,
      },
    };
  },

  /**
   * Generate a hexagonal tiling by subdividing a regular hexagon
   * Subdivides into 6 equilateral triangular sectors from center,
   * then each sector is subdivided like triangular tiling.
   *
   * @param {number} quadrance - Circumradius quadrance of the original hexagon (Q = R²)
   * @param {number} generations - Number of subdivision generations
   * @param {Object} options - Configuration options
   * @param {boolean} options.showFace - Whether to include faces (default true)
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  hexagonalTiling: (quadrance, generations = 1, options = {}) => {
    const showFace = options.showFace !== false;
    const R = Math.sqrt(quadrance);
    const n = Math.pow(2, generations - 1); // Divisions per radial edge

    // Hexagon vertices (6-fold symmetry, first vertex at right)
    const hexagonVerts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3; // 60° increments, start at right
      hexagonVerts.push(
        new THREE.Vector3(R * Math.cos(angle), R * Math.sin(angle), 0)
      );
    }

    const center = new THREE.Vector3(0, 0, 0);
    const vertices = [center]; // Index 0 is center
    const vertexMap = { "0,0,0": 0 }; // Center at origin

    // Helper to get or create vertex
    const getVertex = (x, y, z) => {
      const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
      if (vertexMap[key] !== undefined) {
        return vertexMap[key];
      }
      const idx = vertices.length;
      vertices.push(new THREE.Vector3(x, y, z));
      vertexMap[key] = idx;
      return idx;
    };

    const edges = [];
    const edgeSet = new Set();
    const faces = [];

    const addEdge = (v1, v2) => {
      const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([v1, v2]);
      }
    };

    // For each of the 6 sectors (center to edge)
    for (let sector = 0; sector < 6; sector++) {
      const A = center;
      const B = hexagonVerts[sector];
      const C = hexagonVerts[(sector + 1) % 6];

      // Subdivide this triangle using barycentric coords
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n - i; j++) {
          const k = n - i - j;
          // Barycentric interpolation
          const x = (i * A.x + j * B.x + k * C.x) / n;
          const y = (i * A.y + j * B.y + k * C.y) / n;
          getVertex(x, y, 0);
        }
      }
    }

    // Generate edges and faces for each sector
    for (let sector = 0; sector < 6; sector++) {
      const A = center;
      const B = hexagonVerts[sector];
      const C = hexagonVerts[(sector + 1) % 6];

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i; j++) {
          const k = n - i - j;
          // Current triangle vertices (barycentric)
          const p0 = {
            x: (i * A.x + j * B.x + k * C.x) / n,
            y: (i * A.y + j * B.y + k * C.y) / n,
          };
          const p1 = {
            x: (i * A.x + (j + 1) * B.x + (k - 1) * C.x) / n,
            y: (i * A.y + (j + 1) * B.y + (k - 1) * C.y) / n,
          };
          const p2 = {
            x: ((i + 1) * A.x + j * B.x + (k - 1) * C.x) / n,
            y: ((i + 1) * A.y + j * B.y + (k - 1) * C.y) / n,
          };

          const v0 = getVertex(p0.x, p0.y, 0);
          const v1 = getVertex(p1.x, p1.y, 0);
          const v2 = getVertex(p2.x, p2.y, 0);

          addEdge(v0, v1);
          addEdge(v1, v2);
          addEdge(v2, v0);
          if (showFace) faces.push([v0, v2, v1]); // CCW for +Z normal

          // Downward triangle (if valid)
          if (j + 1 <= n - i - 1) {
            const p3 = {
              x: ((i + 1) * A.x + (j + 1) * B.x + (k - 2) * C.x) / n,
              y: ((i + 1) * A.y + (j + 1) * B.y + (k - 2) * C.y) / n,
            };
            const v3 = getVertex(p3.x, p3.y, 0);
            addEdge(v1, v3);
            addEdge(v3, v2);
            if (showFace) faces.push([v1, v2, v3]); // CCW for +Z normal
          }
        }
      }
    }

    const tileCount = 6 * n * n; // 6 sectors × n² triangles each
    console.log(
      `[RT] Hexagonal tiling: gen=${generations}, n=${n}, ` +
        `V=${vertices.length}, E=${edges.length}, F=${faces.length}`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "hexagonal-tiling",
        generations,
        divisionsPerEdge: n,
        tileCount,
        circumradiusQuadrance: quadrance,
        rtPure: true,
      },
    };
  },
};
