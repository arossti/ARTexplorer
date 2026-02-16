/**
 * rt-grids.js
 * Grid and Basis Vector Generators for ARTexplorer
 *
 * Cartesian (XYZ) and Quadray (WXYZ) coordinate grids and basis vectors.
 * Uses Rational Trigonometry (RT) for exact interval calculations.
 *
 * Extracted from rt-rendering.js (Jan 2026) for modularity.
 *
 * CODE QUALITY AUDIT NOTE (2026-02-14):
 * Math.PI used only for THREE.GridHelper/Object3D rotation (Z-up convention).
 * Justified: THREE.js interface requirement, not geometry calculation.
 * All geometry (Weierstrass arcs, hexagon vertices, etc.) is RT-pure.
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

// Module constants
const GRID_LINE_OPACITY = 0.4; // Dimmed to match Quadray IVM grid intensity

// Module-level flag (avoids window.* global pollution)
let gridIntervalLogged = false;

// Per-plane colors: additive mix of the two axis colors each plane contains
// X=Red, Y=Green, Z=Blue → XY=Yellow, XZ=Magenta, YZ=Cyan
const COLOR_XY = 0xffff00;
const COLOR_XZ = 0xff00ff;
const COLOR_YZ = 0x00ffff;

// Quadray face-perpendicular plane colors: match the Quadray axis color convention
// Each plane is ⊥ to one Quadray basis vector → colored by that axis
const COLOR_FACE_W = 0xffff00; // Yellow (QW axis)
const COLOR_FACE_X = 0xff0000; // Red    (QX axis)
const COLOR_FACE_Y = 0x00ffff; // Cyan   (QY axis)
const COLOR_FACE_Z = 0x00ff00; // Green  (QZ axis)

/**
 * Build Cartesian grid planes (3 planes: XY, XZ, YZ) for a given mode.
 * Shared by createCartesianGrid and rebuildCartesianGrids.
 * @param {number} divisions - Number of grid divisions
 * @param {string} gridMode - 'uniform', 'gravity-chordal', or 'gravity-spherical'
 * @returns {{ gridXY: THREE.Object3D, gridXZ: THREE.Object3D, gridYZ: THREE.Object3D }}
 */
function buildCartesianPlanes(divisions, gridMode) {
  const gridSize = divisions;
  let gridXY, gridXZ, gridYZ;

  if (gridMode === "gravity-chordal" || gridMode === "gravity-spherical") {
    // Cartesian gravity is strictly polar: concentric circles at gravity-spaced
    // radii. Gravity converges to a point (origin), not an axis.
    gridXY = Grids.createGravityCartesianPlane(
      divisions,
      COLOR_XY,
      "gravity-spherical"
    );
    gridXY.rotation.x = Math.PI / 2;
    gridXZ = Grids.createGravityCartesianPlane(
      divisions,
      COLOR_XZ,
      "gravity-spherical"
    );
    gridYZ = Grids.createGravityCartesianPlane(
      divisions,
      COLOR_YZ,
      "gravity-spherical"
    );
    gridYZ.rotation.z = Math.PI / 2;
  } else {
    // Uniform mode: standard THREE.GridHelper
    gridXY = new THREE.GridHelper(gridSize, divisions, COLOR_XY, COLOR_XY);
    gridXY.material.transparent = true;
    gridXY.material.opacity = GRID_LINE_OPACITY;
    gridXY.rotation.x = Math.PI / 2;
    gridXZ = new THREE.GridHelper(gridSize, divisions, COLOR_XZ, COLOR_XZ);
    gridXZ.material.transparent = true;
    gridXZ.material.opacity = GRID_LINE_OPACITY;
    gridYZ = new THREE.GridHelper(gridSize, divisions, COLOR_YZ, COLOR_YZ);
    gridYZ.material.transparent = true;
    gridYZ.material.opacity = GRID_LINE_OPACITY;
    gridYZ.rotation.z = Math.PI / 2;
  }

  return { gridXY, gridXZ, gridYZ };
}

/**
 * Build the 6 Quadray Central Angle planes for a given mode.
 * Shared by createIVMPlanes and rebuildQuadrayGrids.
 * @param {number} tessellations - Triangle copies per direction
 * @param {string} gridMode - 'uniform' or 'gravity-spherical'
 * @returns {Object} Keyed plane objects (6 Central Angle planes for uniform, 4 face planes for polar)
 */
function buildQuadrayPlanes(tessellations, gridMode) {
  if (gridMode === "gravity-spherical") {
    // Polar mode: 4 planes ⊥ to Quadray basis vectors (tetrahedral face planes)
    // Concentric Weierstrass circles — same algorithm as Cartesian polar
    const axisConfigs = [
      {
        key: "faceW",
        axisName: "qw",
        color: COLOR_FACE_W,
        name: "QuadrayPolar_W",
      },
      {
        key: "faceX",
        axisName: "qx",
        color: COLOR_FACE_X,
        name: "QuadrayPolar_X",
      },
      {
        key: "faceY",
        axisName: "qy",
        color: COLOR_FACE_Y,
        name: "QuadrayPolar_Y",
      },
      {
        key: "faceZ",
        axisName: "qz",
        color: COLOR_FACE_Z,
        name: "QuadrayPolar_Z",
      },
    ];

    const result = {};
    for (const cfg of axisConfigs) {
      const normal = Quadray.getAxisVector(cfg.axisName);
      const plane = Grids.createQuadrayPolarPlane(
        normal,
        tessellations,
        cfg.color
      );
      plane.name = cfg.name;
      result[cfg.key] = plane;
    }
    return result;
  }

  // Uniform mode: 6 Central Angle planes from pairs of basis vectors
  // Color scheme: W=Yellow, X=Red, Y=Blue, Z=Green → RGB two-color mixes
  const planeConfigs = [
    { key: "ivmWX", b1: 0, b2: 1, color: 0xffaa00, name: "CentralAngle_WX" },
    { key: "ivmWY", b1: 0, b2: 2, color: 0xaaaaff, name: "CentralAngle_WY" },
    { key: "ivmWZ", b1: 0, b2: 3, color: 0xaaff00, name: "CentralAngle_WZ" },
    { key: "ivmXY", b1: 1, b2: 2, color: 0xff00ff, name: "CentralAngle_XY" },
    { key: "ivmXZ", b1: 1, b2: 3, color: 0xffff00, name: "CentralAngle_XZ" },
    { key: "ivmYZ", b1: 2, b2: 3, color: 0x00ffff, name: "CentralAngle_YZ" },
  ];

  const result = {};
  for (const cfg of planeConfigs) {
    const plane = Grids.createIVMGrid(
      Quadray.basisVectors[cfg.b1],
      Quadray.basisVectors[cfg.b2],
      tessellations,
      cfg.color
    );
    plane.name = cfg.name;
    result[cfg.key] = plane;
  }
  return result;
}

/**
 * Grid generator functions
 * @namespace Grids
 */
export const Grids = {
  /**
   * Build Cartesian basis arrows (XYZ) with tetrahedral heads.
   * @param {number} shaftLength - Arrow shaft length
   * @param {number} headSize - Tetrahedral head scale
   * @returns {THREE.Group}
   */
  _buildCartesianBasis: (shaftLength, headSize) => {
    const basis = new THREE.Group();
    const axes = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000 },
      { dir: new THREE.Vector3(0, 1, 0), color: 0x00ff00 },
      { dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff },
    ];
    for (const { dir, color } of axes) {
      basis.add(
        Grids.createCartesianTetraArrow(dir, shaftLength, headSize, color)
      );
    }
    return basis;
  },

  /**
   * Create a single gravity-warped Cartesian plane as LineSegments.
   * Chordal: rectangular grid with gravity-spaced lines (kept for Quadray refinement).
   * Polar (gravity-spherical): concentric N-gon circles at gravity-spaced radii + 4 radial
   * lines. Gravity converges to a point — polar is the only correct XYZ representation.
   * Circles via RT.nGonVertices() — Wildberger reflection method (1√, no trig).
   *
   * @param {number} divisions - Total number of grid divisions
   * @param {number} color - Line color (hex)
   * @param {string} gridMode - 'gravity-chordal' or 'gravity-spherical'
   * @param {number} nGon - Polygon resolution per circle (default 64, range 3–128)
   * @returns {THREE.LineSegments} The grid plane (in XZ plane, like GridHelper)
   */
  createGravityCartesianPlane: (
    divisions,
    color,
    gridMode = "gravity-chordal",
    nGon = 64
  ) => {
    const halfExtent = Math.floor(divisions / 2);
    const vertices = [];

    if (gridMode === "gravity-spherical") {
      // Polar grid: concentric circles at gravity-spaced radii + radial lines.
      // Gravity converges to a POINT (origin), not an axis — polar topology
      // correctly shows spherical shell cross-sections.
      // Circle count = full divisions (slider value), extent = halfExtent.
      const numCircles = divisions;
      const cumDist = RT.Gravity.computeGravityCumulativeDistances(
        numCircles,
        halfExtent
      );
      const extent = cumDist[numCircles];

      // Circles via RT.nGonVertices() — Wildberger reflection method.
      // nGon parameter controls polygon resolution (default 64 for backward compat).
      for (let k = 1; k <= numCircles; k++) {
        const r = cumDist[k];
        const circleVerts = RT.nGonVertices(nGon, r).vertices;
        for (let i = 0; i < nGon; i++) {
          const curr = circleVerts[i];
          const next = circleVerts[(i + 1) % nGon];
          // XZ plane (Y = 0): 2D x → 3D x, 2D y → 3D z
          vertices.push(curr.x, 0, curr.y, next.x, 0, next.y);
        }
      }

      // Radial lines along ±X and ±Z from origin to outer extent
      vertices.push(0, 0, 0, extent, 0, 0);
      vertices.push(0, 0, 0, -extent, 0, 0);
      vertices.push(0, 0, 0, 0, 0, extent);
      vertices.push(0, 0, 0, 0, 0, -extent);
    } else {
      // Rectangular gravity grid: straight lines at gravity-spaced positions.
      // GridHelper convention: XZ plane, Y=0. halfDiv lines each side of center.
      const halfDiv = halfExtent;
      const cumDist = RT.Gravity.computeGravityCumulativeDistances(
        halfDiv,
        halfExtent
      );
      const extent = cumDist[halfDiv];

      for (let k = 0; k <= halfDiv; k++) {
        const pos = cumDist[k];

        vertices.push(-extent, 0, pos, extent, 0, pos);
        if (k > 0) {
          vertices.push(-extent, 0, -pos, extent, 0, -pos);
        }

        vertices.push(pos, 0, -extent, pos, 0, extent);
        if (k > 0) {
          vertices.push(-pos, 0, -extent, -pos, 0, extent);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: GRID_LINE_OPACITY,
      })
    );
  },

  /**
   * Create a polar grid (concentric circles + radial lines) on a plane
   * perpendicular to a Quadray basis vector. Each plane is a tetrahedral
   * face plane — ⊥QW, ⊥QX, ⊥QY, or ⊥QZ.
   *
   * Uses RT.nGonVertices() (Wildberger reflection) — same math as
   * createGravityCartesianPlane() but generates 3D vertices directly
   * via in-plane orthonormal basis (no axis rotation needed).
   *
   * @param {THREE.Vector3} normal - Unit normal to the plane (a Quadray basis vector)
   * @param {number} divisions - Number of concentric circles (from tessellation slider)
   * @param {number} color - Line color (hex)
   * @param {number} nGon - Polygon resolution per circle (default 64)
   * @returns {THREE.LineSegments} Polar grid geometry centered at origin
   */
  createQuadrayPolarPlane: (normal, divisions, color, nGon = 64) => {
    // Construct orthonormal basis in the plane ⊥ normal
    const n = normal.clone().normalize();
    const ref =
      Math.abs(n.y) < 0.9
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
    const localX = new THREE.Vector3().crossVectors(ref, n).normalize();
    const localZ = new THREE.Vector3().crossVectors(n, localX).normalize();

    // Precompute basis components for inline vertex math
    const lxx = localX.x,
      lxy = localX.y,
      lxz = localX.z;
    const lzx = localZ.x,
      lzy = localZ.y,
      lzz = localZ.z;

    const halfExtent = Math.floor(divisions / 2);
    const numCircles = divisions;
    const cumDist = RT.Gravity.computeGravityCumulativeDistances(
      numCircles,
      halfExtent
    );
    const vertices = [];

    // Circles via RT.nGonVertices() — Wildberger reflection method.
    // nGon parameter controls polygon resolution (default 64 for backward compat).
    for (let k = 1; k <= numCircles; k++) {
      const r = cumDist[k];
      const circleVerts = RT.nGonVertices(nGon, r).vertices;

      for (let i = 0; i < nGon; i++) {
        const curr = circleVerts[i];
        const next = circleVerts[(i + 1) % nGon];

        // 2D → 3D via local basis: localX * x2d + localZ * y2d
        const cx = lxx * curr.x + lzx * curr.y;
        const cy = lxy * curr.x + lzy * curr.y;
        const cz = lxz * curr.x + lzz * curr.y;
        const nx = lxx * next.x + lzx * next.y;
        const ny = lxy * next.x + lzy * next.y;
        const nz = lxz * next.x + lzz * next.y;

        vertices.push(cx, cy, cz, nx, ny, nz);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: GRID_LINE_OPACITY,
      })
    );
  },

  /**
   * Create Cartesian grid (XYZ) - grey hairlines
   * Z-up coordinate system: Z is vertical, XY is horizontal ground plane
   *
   * @param {THREE.Scene} scene - Scene to add grids to
   * @param {number} divisions - Number of grid divisions (from slider)
   * @param {string} gridMode - Grid mode: 'uniform' or 'gravity-chordal'
   * @returns {Object} { cartesianGrid, cartesianBasis, gridXY, gridXZ, gridYZ }
   */
  createCartesianGrid: (scene, divisions = 10, gridMode = "uniform") => {
    const cartesianGrid = new THREE.Group();
    const { gridXY, gridXZ, gridYZ } = buildCartesianPlanes(
      divisions,
      gridMode
    );

    // Z-UP CONVENTION: XY is horizontal ground, XZ/YZ are vertical walls
    gridXY.visible = false;
    gridXZ.visible = false;
    gridYZ.visible = false;
    cartesianGrid.add(gridXY, gridXZ, gridYZ);
    scene.add(cartesianGrid);

    // Create Cartesian basis vectors with tetrahedral heads (matches move handles)
    // RT-PURE: Base length for unit scaling (will be scaled to cubeEdge in updateGeometry)
    const cartesianBasis = Grids._buildCartesianBasis(1.0, 0.15);
    cartesianBasis.visible = false;
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

    // Suppress MetaLog — arrowhead dualTetrahedra are utility geometry
    MetaLog.suppress();
    Quadray.basisVectors.forEach((vec, i) => {
      const arrow = Grids.createTetrahedralArrow(
        vec,
        shaftLength,
        headSize,
        colors[i]
      );
      quadrayBasis.add(arrow);
    });
    MetaLog.unsuppress();

    quadrayBasis.visible = true; // Visible by default
    scene.add(quadrayBasis);

    return quadrayBasis;
  },

  /**
   * Create Central Angle Grid (Corrected Tessellation Method)
   * Tessellates triangular faces vertex-to-vertex - NO extraneous lines!
   * RT-PURE: Uses tetrahedron edge length as unit increment
   *
   * Uniform mode only. Polar/gravity modes use createQuadrayPolarPlane() instead.
   *
   * @param {THREE.Vector3} basis1 - First basis vector (e.g., W)
   * @param {THREE.Vector3} basis2 - Second basis vector (e.g., X)
   * @param {number} tessellations - Number of triangle copies in each direction
   * @param {number} color - Grid line color
   * @returns {THREE.LineSegments} Central Angle grid geometry
   */
  createIVMGrid: (basis1, basis2, tessellations, color) => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    // RT-PURE + PureRadicals: Unit tetrahedron grid interval
    const edgeLength = RT.PureRadicals.QUADRAY_GRID_INTERVAL;

    // DIAGNOSTIC: Log grid interval with full precision (first plane only)
    if (!gridIntervalLogged) {
      MetaLog.log(MetaLog.SUMMARY, "=== QUADRAY GRID INTERVAL (FIXED) ===");
      MetaLog.log(
        MetaLog.SUMMARY,
        `Grid interval (√6/4): ${edgeLength.toFixed(16)}`
      );
      MetaLog.log(MetaLog.SUMMARY, `Exact value: ${edgeLength}`);
      gridIntervalLogged = true;
    }

    // Extract basis components for inline vertex math (avoids .clone() per vertex)
    const b1x = basis1.x,
      b1y = basis1.y,
      b1z = basis1.z;
    const b2x = basis2.x,
      b2y = basis2.y,
      b2z = basis2.z;

    // cumDist[k] = k × edgeLength (constant intervals)
    const cumDist = [];
    for (let k = 0; k <= tessellations + 1; k++) {
      cumDist.push(k * edgeLength);
    }

    for (let i = 0; i <= tessellations; i++) {
      for (let j = 0; j <= tessellations - i; j++) {
        const di = cumDist[i],
          di1 = cumDist[i + 1];
        const dj = cumDist[j],
          dj1 = cumDist[j + 1];

        // P(i,j) = basis1 × cumDist[i] + basis2 × cumDist[j]
        const p0x = b1x * di + b2x * dj;
        const p0y = b1y * di + b2y * dj;
        const p0z = b1z * di + b2z * dj;

        // P(i+1,j)
        const p1x = b1x * di1 + b2x * dj;
        const p1y = b1y * di1 + b2y * dj;
        const p1z = b1z * di1 + b2z * dj;

        // P(i,j+1)
        const p2x = b1x * di + b2x * dj1;
        const p2y = b1y * di + b2y * dj1;
        const p2z = b1z * di + b2z * dj1;

        // Three edges (triangle outline)
        vertices.push(p0x, p0y, p0z, p1x, p1y, p1z);
        vertices.push(p1x, p1y, p1z, p2x, p2y, p2z);
        vertices.push(p2x, p2y, p2z, p0x, p0y, p0z);
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
        opacity: GRID_LINE_OPACITY,
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
  createIVMPlanes: (scene, tessellations = 12, gridMode = "uniform") => {
    const ivmPlanes = new THREE.Group();
    const planes = buildQuadrayPlanes(tessellations, gridMode);

    for (const key of Object.keys(planes)) {
      planes[key].visible = true;
      ivmPlanes.add(planes[key]);
    }

    const planeCount = Object.keys(planes).length;
    MetaLog.log(
      MetaLog.SUMMARY,
      `✅ Quadray grids created (${planeCount} planes, mode: ${gridMode})`
    );

    scene.add(ivmPlanes);

    return { ivmPlanes, ...planes };
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
    visibilityState = {},
    gridMode = "uniform"
  ) => {
    if (existingIvmPlanes) {
      scene.remove(existingIvmPlanes);
    }

    const ivmPlanes = new THREE.Group();
    const planes = buildQuadrayPlanes(tessellations, gridMode);

    for (const key of Object.keys(planes)) {
      planes[key].visible = visibilityState[key] ?? true;
      ivmPlanes.add(planes[key]);
    }

    scene.add(ivmPlanes);

    MetaLog.log(
      MetaLog.DETAILED,
      `Rebuilt Central Angle grids: tessellation=${tessellations}, mode=${gridMode}`
    );

    return { ivmPlanes, ...planes };
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
    visibilityState = {},
    gridMode = "uniform"
  ) => {
    if (existingCartesianGrid) {
      scene.remove(existingCartesianGrid);
    }
    if (existingCartesianBasis) {
      scene.remove(existingCartesianBasis);
    }

    const cartesianGrid = new THREE.Group();
    const { gridXY, gridXZ, gridYZ } = buildCartesianPlanes(
      divisions,
      gridMode
    );

    gridXY.visible = visibilityState.gridXY ?? false;
    gridXZ.visible = visibilityState.gridXZ ?? false;
    gridYZ.visible = visibilityState.gridYZ ?? false;
    cartesianGrid.add(gridXY, gridXZ, gridYZ);
    scene.add(cartesianGrid);

    const cartesianBasis = Grids._buildCartesianBasis(2.0, 0.25);
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
    MetaLog.log(
      MetaLog.DETAILED,
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
    MetaLog.log(
      MetaLog.DETAILED,
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
      MetaLog.log(
        MetaLog.SUMMARY,
        `⚠️ Pentagon array: Gen ${generations} requested, capped at 3 (proper extension requires Penrose research)`
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

    MetaLog.log(
      MetaLog.DETAILED,
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

    // RT-PURE: Exact algebraic hexagon vertices (no trig needed)
    // Regular hexagon at circumradius R: vertices at 60° intervals.
    // cos/sin of 0°,60°,120°,180°,240°,300° are all rational in √3.
    const h = (R * Math.sqrt(3)) / 2; // √ deferred to GPU boundary
    const hexagonVerts = [
      new THREE.Vector3(R, 0, 0), // 0°:   (1, 0)
      new THREE.Vector3(R / 2, h, 0), // 60°:  (1/2, √3/2)
      new THREE.Vector3(-R / 2, h, 0), // 120°: (-1/2, √3/2)
      new THREE.Vector3(-R, 0, 0), // 180°: (-1, 0)
      new THREE.Vector3(-R / 2, -h, 0), // 240°: (-1/2, -√3/2)
      new THREE.Vector3(R / 2, -h, 0), // 300°: (1/2, -√3/2)
    ];

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
    MetaLog.log(
      MetaLog.DETAILED,
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
