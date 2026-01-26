/**
 * rt-grids.js
 * Grid and Basis Vector Generators for ARTexplorer
 *
 * Cartesian (XYZ) and Quadray (WXYZ) coordinate grids and basis vectors.
 * Uses Rational Trigonometry (RT) for exact interval calculations.
 *
 * Extracted from rt-rendering.js (Jan 2026) for modularity.
 *
 * @requires THREE.js
 * @requires rt-math.js
 * @requires rt-polyhedra.js
 */

import { RT, Quadray } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js";

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

    // Create Cartesian basis vectors
    const cartesianBasis = new THREE.Group();

    // RT-PURE: Base length for unit scaling (will be scaled to cubeEdge in updateGeometry)
    const totalBasisLength = 1.0;
    const headLength = 0.2;
    const arrowLength = totalBasisLength;

    // X-axis (Red)
    const xAxis = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0xff0000,
      headLength,
      0.15
    );
    cartesianBasis.add(xAxis);

    // Y-axis (Green)
    const yAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0x00ff00,
      headLength,
      0.15
    );
    cartesianBasis.add(yAxis);

    // Z-axis (Blue) - vertical in Z-up convention
    const zAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0x0000ff,
      headLength,
      0.15
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

    // 1. Create cylindrical shaft (match XYZ ArrowHelper visual weight)
    const shaftRadius = 0.005;
    const shaftGeometry = new THREE.CylinderGeometry(
      shaftRadius,
      shaftRadius,
      shaftLength,
      8
    );
    const shaftMaterial = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);

    // Position shaft: cylinder default is Y-up, translate to point in direction
    shaft.position.copy(direction.clone().multiplyScalar(shaftLength / 2));

    // Orient shaft along direction vector
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    arrowGroup.add(shaft);

    // 2. Create tetrahedral arrowhead using dualTetrahedron
    const tetraGeom = Polyhedra.dualTetrahedron(headSize);

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
  createQuadrayBasis: (scene) => {
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
      console.log("=== QUADRAY GRID INTERVAL (FIXED) ===");
      console.log(`Grid interval (√6/4): ${edgeLength.toFixed(16)}`);
      console.log(`Exact value: ${edgeLength}`);
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

    console.log(
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
  rebuildQuadrayGrids: (scene, existingIvmPlanes, tessellations, visibilityState = {}) => {
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
  rebuildCartesianGrids: (scene, existingCartesianGrid, existingCartesianBasis, divisions, visibilityState = {}) => {
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

    // Recreate basis vectors
    const cartesianBasis = new THREE.Group();
    const totalBasisLength = 2.0;
    const headLength = 0.3;
    const arrowLength = totalBasisLength;

    // X-axis (Red)
    const xAxis = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0xff0000,
      headLength,
      0.2
    );
    cartesianBasis.add(xAxis);

    // Y-axis (Green)
    const yAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0x00ff00,
      headLength,
      0.2
    );
    cartesianBasis.add(yAxis);

    // Z-axis (Blue)
    const zAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0x0000ff,
      headLength,
      0.2
    );
    cartesianBasis.add(zAxis);

    cartesianBasis.visible = visibilityState.cartesianBasis ?? false;
    scene.add(cartesianBasis);

    return { cartesianGrid, cartesianBasis, gridXY, gridXZ, gridYZ };
  },
};
