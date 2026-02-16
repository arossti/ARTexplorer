/**
 * rt-rendering.js
 * THREE.js Rendering Module for ARTexplorer
 *
 * Manages scene setup, camera, lighting, and polyhedra rendering.
 * Handles all THREE.js rendering logic separate from geometry generation.
 *
 * Grid and basis vector creation extracted to rt-grids.js (Jan 2026)
 * Node generation and caching extracted to rt-nodes.js (Jan 2026)
 *
 * @requires THREE.js
 * @requires rt-math.js
 * @requires rt-polyhedra.js
 * @requires rt-grids.js
 * @requires rt-nodes.js
 */

import { RT, Quadray } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js";
import { Primitives } from "./rt-primitives.js";
import { PerformanceClock } from "./performance-clock.js";
import { RTPapercut } from "./rt-papercut.js";
import { RTPrimeCuts } from "./rt-prime-cuts.js";
import { Grids } from "./rt-grids.js";
import { Nodes } from "./rt-nodes.js";
import { RTMatrix } from "./rt-matrix-planar.js";
import { RTRadialMatrix } from "./rt-matrix-radial.js";
import { Helices } from "./rt-helices.js";
import { MetaLog } from "./rt-metalog.js";
import { PenroseTiles, PenroseTiling } from "./rt-penrose.js";

// Line2 addons for variable lineweight (cross-platform support)
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";

// Re-export PerformanceClock so rt-init.js can import it from here
export { PerformanceClock };

/**
 * N-gon method description for UI feedback — matches RT.nGonVertices() classification.
 * Wildberger reflection: 1√ for any N. Method depends on star spread source.
 *
 * @param {number} n - Number of polygon sides
 * @returns {string} Human-readable method description, e.g. "Pentagon: Algebraic (s = β)"
 */
const NGON_NAMES = [
  "",
  "Monogon",
  "Digon",
  "Triangle",
  "Square",
  "Pentagon",
  "Hexagon",
  "Heptagon",
  "Octagon",
  "Nonagon",
  "Decagon",
  "Hendecagon",
  "Dodecagon",
];
function nGonMethodText(n) {
  const name = NGON_NAMES[n] || `${n}-gon`;
  if (n < 3) return `${name}: Degenerate`;

  // Check if star spread is cached (algebraic or cubic)
  const exact = RT.StarSpreads.forN(n);
  if (exact !== null) {
    // Algebraic: Gauss-Wantzel constructible (exact radical spreads)
    const spreadLabels = {
      3: "s = 3/4",
      4: "s = 1/2",
      5: "s = (5−√5)/8",
      6: "s = 1/4",
      8: "s = (2−√2)/4",
      10: "s = (3−√5)/8",
      12: "s = (2−√3)/4",
    };
    if (spreadLabels[n]) {
      return `${name}: Algebraic (${spreadLabels[n]})`;
    }
    // Cubic-cached: 7, 9
    if (n === 7) return `${name}: Cubic (8x³ − 4x² − 4x + 1 = 0)`;
    if (n === 9) return `${name}: Cubic (8x³ − 6x − 1 = 0)`;
  }

  // Transcendental fallback — star spread from sin²(π/N)
  return `${name}: Transcendental (sin²π/${n})`;
}

/** Cached DOM element references — populated once during initScene() */
const el = {};

function cacheElements() {
  document.querySelectorAll("[id]").forEach(elem => {
    // Only cache camelCase IDs (valid JS identifiers)
    if (/^[a-zA-Z_]\w*$/.test(elem.id)) {
      el[elem.id] = elem;
    }
  });
}

/**
 * Camera view presets configuration
 * Spreads use RT notation: s = sin²(θ) for ZYX Euler rotation
 * Reference: Geometry documents/Prime-Projection-Conjecture.tex
 */
export const CAMERA_PRESETS = {
  // ═══════════════════════════════════════════════════════════════════════
  // PRIME PROJECTION VIEWS - Verified by Project-Streamline (2026-02-07)
  // Source: prime_projections_verified.json
  // ═══════════════════════════════════════════════════════════════════════
  pentagonProjection: {
    name: "5-gon Projection",
    description: "Truncated tetrahedron → 5-vertex hull",
    spreads: [0.01, 0.5, 0], // Verified Project-Streamline
    recommendedForm: "quadrayTruncatedTetrahedron",
    reference: "prime_projections_verified.json (Project-Streamline)",
    compound: ["truncatedTetrahedron"],
    totalVertices: 12,
    note: "Pentagon - Gauss-Wantzel constructible (Fermat prime)",
  },
  heptagonProjectionTet: {
    name: "7-gon Projection",
    description: "TruncTet+Tet compound → 7-vertex hull",
    spreads: [0, 0.01, 0.14], // Verified Project-Streamline
    recommendedForm: "primeCompoundTet",
    reference: "prime_projections_verified.json (Project-Streamline)",
    compound: ["truncatedTetrahedron", "tetrahedron"],
    totalVertices: 16,
    note: "Heptagon via tet-family compound - bypasses Gauss-Wantzel",
  },
  hendecagonProjection: {
    name: "11-gon Projection",
    description: "TruncTet+Icosa compound → 11-vertex hull",
    spreads: [0, 0, 0.5], // Corrected circumradius (Feb 2026)
    recommendedForm: "primeCompoundIcosa",
    reference: "prime_projections_corrected.json",
    compound: ["truncatedTetrahedron", "icosahedron"],
    totalVertices: 24,
    note: "Hendecagon requires quintic polynomial - bypassed via projection",
  },
  tridecagonProjection: {
    name: "13-gon Projection",
    description: "TruncTet+Icosa compound → 13-vertex hull",
    spreads: [0, 0.01, 0.96], // Corrected circumradius (Feb 2026)
    recommendedForm: "primeCompoundIcosa",
    reference: "prime_projections_corrected.json",
    compound: ["truncatedTetrahedron", "icosahedron"],
    totalVertices: 24,
    note: "Tridecagon requires sextic polynomial - bypassed via projection",
  },
};

// Module-level color palette (source of truth for all polyhedron colors)
const colorPalette = {
  cube: 0x0433ff,
  cubeMatrix: 0x00fdff,
  tetrahedron: 0xfffb00,
  geodesicTetrahedron: 0x00fdff,
  dualTetrahedron: 0xff40ff,
  geodesicDualTetrahedron: 0xfffb00,
  octahedron: 0x00f900,
  geodesicOctahedron: 0xff40ff,
  octahedronMatrix: 0xff6b6b,
  icosahedron: 0x00fdff,
  geodesicIcosahedron: 0xff9300,
  dodecahedron: 0xfffb00,
  dualIcosahedron: 0xff9300,
  geodesicDualIcosahedron: 0x00fdff,
  cuboctahedron: 0x00f900,
  rhombicDodecahedron: 0xff9900,
  // Radial matrices (concentric shell expansion)
  radialTetrahedron: 0xfffb00, // Yellow (matches base tetrahedron)
  radialOctahedron: 0xff6b6b, // Coral (matches planar octahedron matrix)
  radialCuboctahedron: 0x00f900, // Lime green (matches cuboctahedron)
  // Quadray demonstrators
  quadrayTetrahedron: 0x00ff88, // Bright teal/mint (distinct from other forms)
  quadrayTetraDeformed: 0xff5577, // Coral-pink (visually distinct for deformed)
  quadrayCuboctahedron: 0x88ff00, // Lime-yellow (VE in native Quadray)
  quadrayOctahedron: 0x66ffaa, // Sea green (Quadray octahedron)
  quadrayTruncatedTet: 0x9acd32, // Yellow-green (7-gon projection source)
  quadrayStellaOctangula: 0xff6b9d, // Pink-coral (Star Tetrahedron / Merkaba)
  // Primitives
  point: 0xff00ff, // Fuchsia/bright pink - highly visible coordinate exploration point
  line: 0xff0000, // Red - 1D primitive
  polygon: 0x00ff00, // Green - 2D primitive (distinct from Line red, Point fuchsia)
  prism: 0x00aaff, // Sky blue - 3D primitive (distinct from polygon green)
  cone: 0xffaa00, // Orange - 3D primitive (distinct from prism blue)
  // Helices
  tetrahelix: 0xffaa00, // Orange - Tetrahelix 1 (toroidal)
  tetrahelix2: 0x88ff88, // Light green - Tetrahelix 2 (linear, tetrahedral seed)
  tetrahelix3: 0xff88ff, // Light magenta - Tetrahelix 3 (linear, octahedral seed)
  // Penrose Tiling
  penroseThick: 0xffd700, // Gold - Thick rhombus (72°/108°)
  penroseThin: 0x4169e1, // Royal Blue - Thin rhombus (36°/144°)
  penroseTiling: 0xffd700, // Gold - Default tiling color
};

/**
 * Initialize THREE.js scene and return rendering context
 * @param {Object} THREE - THREE.js library
 * @param {Object} OrbitControls - OrbitControls constructor
 * @param {Object} RT - Rational Trigonometry library
 * @returns {Object} Scene management functions
 */
export function initScene(THREE, OrbitControls, RT) {
  let scene, camera, renderer, controls;
  let cubeGroup, tetrahedronGroup, dualTetrahedronGroup, octahedronGroup;
  let icosahedronGroup, dodecahedronGroup, dualIcosahedronGroup;
  let cuboctahedronGroup, rhombicDodecahedronGroup;
  let geodesicIcosahedronGroup; // Phase 2.7a: Geodesic subdivision
  let geodesicTetrahedronGroup; // Phase 2.7c: Geodesic tetrahedron
  let geodesicOctahedronGroup; // Phase 2.7b: Geodesic octahedron
  let geodesicDualTetrahedronGroup; // Phase 3: Geodesic dual tetrahedron
  let geodesicDualIcosahedronGroup; // Phase 3: Geodesic dual icosahedron
  let cubeMatrixGroup, tetMatrixGroup, octaMatrixGroup; // Matrix forms (IVM arrays)
  let cuboctaMatrixGroup; // Cuboctahedron matrix (Vector Equilibrium array)
  let rhombicDodecMatrixGroup; // Rhombic dodecahedron matrix (space-filling array)
  let radialCubeMatrixGroup, radialRhombicDodecMatrixGroup; // Radial matrix forms (Phase 2)
  let radialTetMatrixGroup, radialOctMatrixGroup, radialVEMatrixGroup; // Radial matrix forms (Phase 3)
  let quadrayTetrahedronGroup,
    quadrayTetraDeformedGroup,
    quadrayCuboctahedronGroup,
    quadrayOctahedronGroup,
    quadrayTruncatedTetGroup,
    quadrayStellaOctangulaGroup; // Quadray demonstrators
  let primeTruncTetGroup, primeCompoundTetGroup, primeCompoundIcosaGroup; // Prime polygon projection polyhedra (base geometry)
  let primeGeoTetF2Group, primeGeoTetF4Group; // Geodesic tet single-poly prime projections
  let pointGroup; // Point primitive (single vertex)
  let lineGroup; // Line primitive (two vertices, one edge)
  let polygonGroup; // Polygon primitive (n vertices, n edges, 1 face)
  let prismGroup; // Prism primitive (3D solid with N-gon caps)
  let coneGroup; // Cone primitive (3D solid with N-gon base and apex)
  let tetrahelix1Group; // Tetrahelix 1: Toroidal (left-handed)
  let tetrahelix2Group; // Tetrahelix 2: Linear (tetrahedral seed)
  let tetrahelix3Group; // Tetrahelix 3: Linear (octahedral seed)
  let penroseTilingGroup; // Penrose Tiling: Aperiodic tiling with golden ratio
  let cartesianGrid, cartesianBasis, quadrayBasis, ivmPlanes;

  // ========================================================================
  // Quaternion-Based Orbit — replaces OrbitControls' spherical rotation
  // Avoids polar singularity (gimbal lock at poles) with non-standard camera.up
  // Inspired by camera-controls by yomotsu (MIT license)
  // https://github.com/yomotsu/camera-controls
  // ========================================================================

  let _qOrbitActive = false;
  let _qOrbitPrevX = 0;
  let _qOrbitPrevY = 0;
  let _qOrbitVelX = 0;
  let _qOrbitVelY = 0;
  const _qOrbitQuat = new THREE.Quaternion();
  const _qOrbitAxis = new THREE.Vector3();
  const _qOrbitOffset = new THREE.Vector3();
  const _qOrbitDir = new THREE.Vector3();
  const ORBIT_SPEED = (2 * Math.PI) / 1800;

  function _applyOrbitRotation(dx, dy) {
    _qOrbitOffset.copy(camera.position).sub(controls.target);

    // Horizontal: rotate around camera.up axis (no pole)
    _qOrbitQuat.setFromAxisAngle(camera.up, -dx);
    _qOrbitOffset.applyQuaternion(_qOrbitQuat);

    // Vertical: rotate around camera's right axis (no pole)
    camera.getWorldDirection(_qOrbitDir);
    _qOrbitAxis.crossVectors(_qOrbitDir, camera.up).normalize();
    _qOrbitQuat.setFromAxisAngle(_qOrbitAxis, -dy);
    _qOrbitOffset.applyQuaternion(_qOrbitQuat);

    camera.position.copy(controls.target).add(_qOrbitOffset);
    camera.lookAt(controls.target);
  }

  function initScene() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Get container dimensions FIRST (before camera setup)
    const container = document.getElementById("canvas-container");
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / height;

    // Camera (Z-up coordinate system for CAD/BIM compatibility)
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 10000);

    // Z-up convention: Position camera for isometric-like view
    // Blue axis (Z) will point vertically upward
    camera.position.set(5, -5, 5);
    camera.up.set(0, 0, 1); // Tell Three.js that Z is up (CAD/BIM standard)
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Orbit Controls (with damping for easing)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;

    // Reassign mouse buttons: Left=orbit, Middle=pan, Right=freed for context menu
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: null, // Disable to free right-click for context menu
    };

    // Disable OrbitControls rotation — quaternion orbit handles it (see outer scope)
    controls.enableRotate = false;

    renderer.domElement.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || !controls.enabled) return;
      _qOrbitActive = true;
      _qOrbitPrevX = e.clientX;
      _qOrbitPrevY = e.clientY;
    });

    renderer.domElement.addEventListener("pointermove", function (e) {
      if (!_qOrbitActive || !controls.enabled) return;
      const dx = (e.clientX - _qOrbitPrevX) * ORBIT_SPEED;
      const dy = (e.clientY - _qOrbitPrevY) * ORBIT_SPEED;
      _qOrbitPrevX = e.clientX;
      _qOrbitPrevY = e.clientY;
      _qOrbitVelX = dx;
      _qOrbitVelY = dy;
      _applyOrbitRotation(dx, dy);
    });

    window.addEventListener("pointerup", function () {
      _qOrbitActive = false;
    });

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Create coordinate grids
    createCartesianGrid();
    createQuadrayBasis();
    createIVMPlanes();

    // Create polyhedra groups
    // Point primitive (single vertex - Move only, no Scale/Rotate)
    pointGroup = new THREE.Group();
    pointGroup.userData.type = "point";
    pointGroup.userData.allowedTools = ["move"]; // Only Move allowed

    lineGroup = new THREE.Group();
    lineGroup.userData.type = "line";
    // Line allows all tools (Move, Scale, Rotate)

    polygonGroup = new THREE.Group();
    polygonGroup.userData.type = "polygon";
    // Polygon allows all tools (Move, Scale, Rotate)

    prismGroup = new THREE.Group();
    prismGroup.userData.type = "prism";
    // Prism allows all tools (Move, Scale, Rotate)

    coneGroup = new THREE.Group();
    coneGroup.userData.type = "cone";
    // Cone allows all tools (Move, Scale, Rotate)

    tetrahelix1Group = new THREE.Group();
    tetrahelix1Group.userData.type = "tetrahelix1";
    // Tetrahelix 1 allows all tools (Move, Scale, Rotate)

    tetrahelix2Group = new THREE.Group();
    tetrahelix2Group.userData.type = "tetrahelix2";
    // Tetrahelix 2 allows all tools (Move, Scale, Rotate)

    tetrahelix3Group = new THREE.Group();
    tetrahelix3Group.userData.type = "tetrahelix3";
    // Tetrahelix 3 allows all tools (Move, Scale, Rotate)

    penroseTilingGroup = new THREE.Group();
    penroseTilingGroup.userData.type = "penroseTiling";
    // Penrose Tiling allows all tools (Move, Scale, Rotate)

    cubeGroup = new THREE.Group();
    cubeGroup.userData.type = "cube";

    tetrahedronGroup = new THREE.Group();
    tetrahedronGroup.userData.type = "tetrahedron";

    dualTetrahedronGroup = new THREE.Group();
    dualTetrahedronGroup.userData.type = "dualTetrahedron";

    octahedronGroup = new THREE.Group();
    octahedronGroup.userData.type = "octahedron";

    icosahedronGroup = new THREE.Group();
    icosahedronGroup.userData.type = "icosahedron";

    dodecahedronGroup = new THREE.Group();
    dodecahedronGroup.userData.type = "dodecahedron";

    dualIcosahedronGroup = new THREE.Group();
    dualIcosahedronGroup.userData.type = "dualIcosahedron";

    cuboctahedronGroup = new THREE.Group();
    cuboctahedronGroup.userData.type = "cuboctahedron";

    rhombicDodecahedronGroup = new THREE.Group();
    rhombicDodecahedronGroup.userData.type = "rhombicDodecahedron";

    geodesicIcosahedronGroup = new THREE.Group(); // Phase 2.7a
    geodesicIcosahedronGroup.userData.type = "geodesicIcosahedron";

    geodesicTetrahedronGroup = new THREE.Group(); // Phase 2.7c
    geodesicTetrahedronGroup.userData.type = "geodesicTetrahedron";

    geodesicOctahedronGroup = new THREE.Group(); // Phase 2.7b
    geodesicOctahedronGroup.userData.type = "geodesicOctahedron";

    geodesicDualTetrahedronGroup = new THREE.Group(); // Phase 3
    geodesicDualTetrahedronGroup.userData.type = "geodesicDualTetrahedron";

    geodesicDualIcosahedronGroup = new THREE.Group(); // Phase 3
    geodesicDualIcosahedronGroup.userData.type = "geodesicDualIcosahedron";

    // Matrix forms (IVM spatial arrays)
    cubeMatrixGroup = new THREE.Group();
    cubeMatrixGroup.userData.type = "cubeMatrix";
    cubeMatrixGroup.userData.isInstance = false;

    tetMatrixGroup = new THREE.Group();
    tetMatrixGroup.userData.type = "tetMatrix";
    tetMatrixGroup.userData.isInstance = false;

    octaMatrixGroup = new THREE.Group();
    octaMatrixGroup.userData.type = "octaMatrix";
    octaMatrixGroup.userData.isInstance = false;

    cuboctaMatrixGroup = new THREE.Group();
    cuboctaMatrixGroup.userData.type = "cuboctaMatrix";
    cuboctaMatrixGroup.userData.isInstance = false;

    rhombicDodecMatrixGroup = new THREE.Group();
    rhombicDodecMatrixGroup.userData.type = "rhombicDodecMatrix";
    rhombicDodecMatrixGroup.userData.isInstance = false;

    // Radial matrix forms (concentric shell expansion)
    radialCubeMatrixGroup = new THREE.Group();
    radialCubeMatrixGroup.userData.type = "radialCubeMatrix";
    radialCubeMatrixGroup.userData.isInstance = false;

    radialRhombicDodecMatrixGroup = new THREE.Group();
    radialRhombicDodecMatrixGroup.userData.type = "radialRhombicDodecMatrix";
    radialRhombicDodecMatrixGroup.userData.isInstance = false;

    // Radial matrix forms - Phase 3 (IVM polyhedra)
    radialTetMatrixGroup = new THREE.Group();
    radialTetMatrixGroup.userData.type = "radialTetMatrix";
    radialTetMatrixGroup.userData.isInstance = false;

    radialOctMatrixGroup = new THREE.Group();
    radialOctMatrixGroup.userData.type = "radialOctMatrix";
    radialOctMatrixGroup.userData.isInstance = false;

    radialVEMatrixGroup = new THREE.Group();
    radialVEMatrixGroup.userData.type = "radialVEMatrix";
    radialVEMatrixGroup.userData.isInstance = false;

    // Quadray demonstrators
    quadrayTetrahedronGroup = new THREE.Group();
    quadrayTetrahedronGroup.userData.type = "quadrayTetrahedron";

    quadrayTetraDeformedGroup = new THREE.Group();
    quadrayTetraDeformedGroup.userData.type = "quadrayTetraDeformed";

    quadrayCuboctahedronGroup = new THREE.Group();
    quadrayCuboctahedronGroup.userData.type = "quadrayCuboctahedron";

    quadrayOctahedronGroup = new THREE.Group();
    quadrayOctahedronGroup.userData.type = "quadrayOctahedron";

    quadrayTruncatedTetGroup = new THREE.Group();
    quadrayTruncatedTetGroup.userData.type = "quadrayTruncatedTet";

    quadrayStellaOctangulaGroup = new THREE.Group();
    quadrayStellaOctangulaGroup.userData.type = "quadrayStellaOctangula";

    // Prime polygon projection polyhedra (base geometry - no Quadray normalization)
    primeTruncTetGroup = new THREE.Group();
    primeTruncTetGroup.userData.type = "primeTruncTet";

    primeCompoundTetGroup = new THREE.Group();
    primeCompoundTetGroup.userData.type = "primeCompoundTet";

    primeCompoundIcosaGroup = new THREE.Group();
    primeCompoundIcosaGroup.userData.type = "primeCompoundIcosa";

    primeGeoTetF2Group = new THREE.Group();
    primeGeoTetF2Group.userData.type = "primeGeoTetF2";

    primeGeoTetF4Group = new THREE.Group();
    primeGeoTetF4Group.userData.type = "primeGeoTetF4";

    scene.add(pointGroup);
    scene.add(lineGroup);
    scene.add(polygonGroup);
    scene.add(prismGroup);
    scene.add(coneGroup);
    scene.add(tetrahelix1Group);
    scene.add(tetrahelix2Group);
    scene.add(tetrahelix3Group);
    scene.add(penroseTilingGroup);
    scene.add(cubeGroup);
    scene.add(tetrahedronGroup);
    scene.add(dualTetrahedronGroup);
    scene.add(octahedronGroup);
    scene.add(icosahedronGroup);
    scene.add(dodecahedronGroup);
    scene.add(dualIcosahedronGroup);
    scene.add(cuboctahedronGroup);
    scene.add(rhombicDodecahedronGroup);
    scene.add(geodesicIcosahedronGroup);
    scene.add(geodesicTetrahedronGroup);
    scene.add(geodesicOctahedronGroup);
    scene.add(geodesicDualTetrahedronGroup);
    scene.add(geodesicDualIcosahedronGroup);
    scene.add(cubeMatrixGroup);
    scene.add(tetMatrixGroup);
    scene.add(octaMatrixGroup);
    scene.add(cuboctaMatrixGroup);
    scene.add(rhombicDodecMatrixGroup);
    scene.add(radialCubeMatrixGroup);
    scene.add(radialRhombicDodecMatrixGroup);
    scene.add(radialTetMatrixGroup);
    scene.add(radialOctMatrixGroup);
    scene.add(radialVEMatrixGroup);
    scene.add(quadrayTetrahedronGroup);
    scene.add(quadrayTetraDeformedGroup);
    scene.add(quadrayCuboctahedronGroup);
    scene.add(quadrayOctahedronGroup);
    scene.add(quadrayTruncatedTetGroup);
    scene.add(quadrayStellaOctangulaGroup);
    // Prime polygon projection polyhedra
    scene.add(primeTruncTetGroup);
    scene.add(primeCompoundTetGroup);
    scene.add(primeCompoundIcosaGroup);
    scene.add(primeGeoTetF2Group);
    scene.add(primeGeoTetF4Group);

    // Initialize PerformanceClock with all scene groups
    PerformanceClock.init([
      // Primitives (0D, 1D, 2D, 3D)
      pointGroup,
      lineGroup,
      polygonGroup,
      prismGroup,
      coneGroup,
      // Regular polyhedra
      cubeGroup,
      tetrahedronGroup,
      dualTetrahedronGroup,
      octahedronGroup,
      icosahedronGroup,
      dodecahedronGroup,
      dualIcosahedronGroup,
      cuboctahedronGroup,
      rhombicDodecahedronGroup,
      // Geodesic polyhedra
      geodesicIcosahedronGroup,
      geodesicTetrahedronGroup,
      geodesicOctahedronGroup,
      geodesicDualTetrahedronGroup,
      geodesicDualIcosahedronGroup,
      // Planar matrices
      cubeMatrixGroup,
      tetMatrixGroup,
      octaMatrixGroup,
      cuboctaMatrixGroup,
      rhombicDodecMatrixGroup,
      // Radial matrices
      radialCubeMatrixGroup,
      radialRhombicDodecMatrixGroup,
      radialTetMatrixGroup,
      radialOctMatrixGroup,
      radialVEMatrixGroup,
      // Quadray demonstrators
      quadrayTetrahedronGroup,
      quadrayTetraDeformedGroup,
      quadrayCuboctahedronGroup,
    ]);

    // Cache all DOM element references for fast lookup
    cacheElements();

    // Initial render
    updateGeometry();

    // Handle window resize
    window.addEventListener("resize", onWindowResize);
  }

  /**
   * Create Cartesian grid (XYZ) - delegated to rt-grids.js
   * Z-up coordinate system: Z is vertical, XY is horizontal ground plane
   */
  function createCartesianGrid() {
    // Read tessellation from slider (dynamic control)
    const sliderElement = el.cartesianTessSlider;
    const divisions = sliderElement ? parseInt(sliderElement.value) : 10;

    // Delegate to Grids module
    const result = Grids.createCartesianGrid(scene, divisions);

    // Store references for later use
    cartesianGrid = result.cartesianGrid;
    cartesianBasis = result.cartesianBasis;
    window.gridXY = result.gridXY;
    window.gridXZ = result.gridXZ;
    window.gridYZ = result.gridYZ;
  }

  // createTetrahedralArrow - delegated to rt-grids.js (Grids.createTetrahedralArrow)

  /**
   * Create SYMBOLIC Quadray basis vectors (WXYZ) - delegated to rt-grids.js
   */
  function createQuadrayBasis() {
    quadrayBasis = Grids.createQuadrayBasis(scene);
  }

  // createIVMGrid - delegated to rt-grids.js (Grids.createIVMGrid)

  /**
   * Create Central Angle Grids (IVM Planes) - delegated to rt-grids.js
   */
  function createIVMPlanes() {
    // Read tessellation from slider (dynamic control)
    const sliderElement = el.quadrayTessSlider;
    const tessellations = sliderElement ? parseInt(sliderElement.value) : 12;

    // Delegate to Grids module
    const result = Grids.createIVMPlanes(scene, tessellations);

    // Store references for later use (dynamic keys: IVM or face planes)
    ivmPlanes = result.ivmPlanes;
    for (const key of Object.keys(result)) {
      if (key !== "ivmPlanes") window[key] = result[key];
    }
  }

  // ========================================================================
  // NODE FUNCTIONS - Delegated to rt-nodes.js
  // ========================================================================

  // Delegation wrappers for node functions (maintains local API compatibility)
  function getClosePackedRadius(type, scale, options = {}) {
    return Nodes.getClosePackedRadius(type, scale, options);
  }

  function getCachedNodeGeometry(
    useRT,
    nodeSize,
    polyhedronType,
    scale,
    options = {}
  ) {
    return Nodes.getCachedNodeGeometry(
      useRT,
      nodeSize,
      polyhedronType,
      scale,
      options
    );
  }

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
    return Nodes.addMatrixNodes(
      matrixGroup,
      matrixSize,
      scale,
      rotate45,
      color,
      nodeSize,
      polyhedronType,
      faceCoplanar
    );
  }

  function addRadialMatrixNodes(
    matrixGroup,
    centerPositions,
    scale,
    color,
    nodeSize,
    polyhedronType = "cube",
    ivmRotation = false
  ) {
    return Nodes.addRadialMatrixNodes(
      matrixGroup,
      centerPositions,
      scale,
      color,
      nodeSize,
      polyhedronType,
      ivmRotation
    );
  }

  // Accessors for node state (from rt-nodes.js)
  function getUseRTNodeGeometry() {
    return Nodes.getNodeConfig().useRTNodeGeometry;
  }

  function getNodeOpacity() {
    return Nodes.getNodeConfig().nodeOpacity;
  }

  /**
   * Read node size from slider element
   * @returns {string} nodeSize key ("off", "1"-"7", or "packed")
   */
  function getNodeSize() {
    const slider = el.nodeSizeSlider;
    return slider ? Nodes.getNodeSizeFromSlider(slider.value) : "4"; // default to Md
  }

  // Original node functions moved to rt-nodes.js (Phase 3 extraction, Jan 2026)
  // See: modules/rt-nodes.js for getPolyhedronEdgeQuadrance, getClosePackedRadius,
  //      getCachedNodeGeometry, addMatrixNodes, addRadialMatrixNodes

  /**
   * Count total triangles in a group (including all children)
   * Used for performance statistics
   */
  function countGroupTriangles(group) {
    let triangles = 0;
    if (group && group.visible) {
      group.traverse(child => {
        if (child.geometry) {
          if (child.geometry.index) {
            triangles += child.geometry.index.count / 3;
          } else if (child.geometry.attributes.position) {
            triangles += child.geometry.attributes.position.count / 3;
          }
        }
      });
    }
    return Math.round(triangles);
  }

  /**
   * Dispose all GPU resources in a group and remove all children.
   * Must be called instead of raw while-loop removal to prevent VRAM leaks.
   * @param {THREE.Group} group - Group to clear
   */
  function disposeGroup(group) {
    group.traverse(child => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
  }

  /**
   * Render a polyhedron from vertices, edges, faces
   * Uses proper geometry with indexed faces for clean rendering
   * @param {THREE.Group} group - Group to render into
   * @param {Object} geometry - {vertices, edges, faces}
   * @param {number} color - Hex color
   * @param {number} opacity - Face opacity
   * @param {Object} options - Optional rendering options
   * @param {number} options.lineWidth - Edge line width (default 1)
   */
  function renderPolyhedron(group, geometry, color, opacity, options = {}) {
    // Clear existing geometry and free GPU resources
    disposeGroup(group);

    const { vertices, edges, faces } = geometry;

    // Dissolve multiplier for form fade in/out during view transitions
    const dissolveOpacity = group.userData.dissolveOpacity ?? 1.0;

    // Get selected node size from new button selector
    const nodeSize = getNodeSize();
    const showNodes = nodeSize !== "off";
    const showFaces = true; // Always render faces (use opacity slider to hide)

    // Render faces first (back to front) using proper BufferGeometry
    if (showFaces) {
      // Build indexed face geometry
      const positions = [];
      const indices = [];

      // Add all vertices to positions array
      vertices.forEach(v => {
        positions.push(v.x, v.y, v.z);
      });

      // Build face indices (triangulate quads if needed)
      faces.forEach(faceIndices => {
        // Fan triangulation from first vertex
        for (let i = 1; i < faceIndices.length - 1; i++) {
          indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
        }
      });

      const faceGeometry = new THREE.BufferGeometry();
      faceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      faceGeometry.setIndex(indices);
      faceGeometry.computeVertexNormals();

      const effectiveOpacity = opacity * dissolveOpacity;

      const faceMaterial = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: effectiveOpacity,
        side: THREE.FrontSide, // Backface culling enabled - all polyhedra winding corrected (2026-01-11)
        depthWrite: effectiveOpacity >= 0.99, // Only write depth for opaque faces
        flatShading: true,
      });

      const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
      faceMesh.renderOrder = 1; // Render faces before edges
      group.add(faceMesh);
    }

    // Render edges using LineSegments for efficiency
    // For Line/Polygon/Penrose primitives with lineWidth option, use Line2/LineMaterial for cross-platform support
    const polyType = group.userData.type;
    const useThickLine =
      (polyType === "line" ||
        polyType === "polygon" ||
        polyType === "penroseTiling") &&
      options.lineWidth &&
      options.lineWidth > 1;

    if (useThickLine && edges.length > 0) {
      // Use Line2/LineMaterial for variable lineweight (works on all platforms)
      edges.forEach(([i, j]) => {
        const v1 = vertices[i];
        const v2 = vertices[j];
        const positions = [v1.x, v1.y, v1.z, v2.x, v2.y, v2.z];

        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(positions);

        const lineMaterial = new LineMaterial({
          color: color,
          linewidth: options.lineWidth * 0.002, // Convert to world units (scaled for visibility)
          worldUnits: true,
          depthTest: true,
          depthWrite: dissolveOpacity >= 0.99,
          transparent: dissolveOpacity < 1,
          opacity: dissolveOpacity,
        });

        // Set resolution for proper line rendering
        if (renderer) {
          const size = new THREE.Vector2();
          renderer.getSize(size);
          lineMaterial.resolution.set(size.x, size.y);
        }

        const line = new Line2(lineGeometry, lineMaterial);
        line.computeLineDistances(); // Required for LineMaterial
        line.renderOrder = 2;
        group.add(line);
      });
    } else {
      // Standard LineSegments for other polyhedra (faster for many edges)
      const edgePositions = [];
      edges.forEach(([i, j]) => {
        const v1 = vertices[i];
        const v2 = vertices[j];
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
        linewidth: 1, // WebGL limitation - always 1px on most platforms
        depthTest: true,
        depthWrite: dissolveOpacity >= 0.99,
        transparent: dissolveOpacity < 1,
        opacity: dissolveOpacity,
      });

      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edgeLines.renderOrder = 2; // Render edges after faces
      group.add(edgeLines);
    }

    // Render vertex nodes using cached geometry for efficiency
    if (showNodes) {
      // Start node generation timing
      PerformanceClock.startNodeGeneration();

      // Get polyhedron type and scale from group for close-pack calculations
      const polyType = group.userData.type;

      // For Line/Polygon primitives, scale IS the quadrance (stored in parameters)
      // For all other polyhedra, scale derives from tetScaleSlider
      let scale;
      let nodeOptions = {}; // Options for polygon (sides) etc.

      if (polyType === "line" && group.userData.parameters?.quadrance) {
        scale = group.userData.parameters.quadrance;
      } else if (
        polyType === "polygon" &&
        group.userData.parameters?.quadrance
      ) {
        scale = group.userData.parameters.quadrance;
        nodeOptions = {
          sides: group.userData.parameters.sides || 3,
          // Pass tiling generations for PACKED node scaling
          tilingGenerations:
            group.userData.parameters.tilingEnabled &&
            group.userData.parameters.tilingGenerations > 1
              ? group.userData.parameters.tilingGenerations
              : undefined,
        };
      } else if (
        polyType === "prism" &&
        group.userData.parameters?.baseQuadrance
      ) {
        // Prism: scale is baseQuadrance, pass sides for edge quadrance calculation
        scale = group.userData.parameters.baseQuadrance;
        nodeOptions = { sides: group.userData.parameters.sides || 6 };
      } else if (
        polyType === "cone" &&
        group.userData.parameters?.baseQuadrance
      ) {
        // Cone: scale is baseQuadrance, pass sides for edge quadrance calculation
        scale = group.userData.parameters.baseQuadrance;
        nodeOptions = { sides: group.userData.parameters.sides || 6 };
      } else if (
        polyType?.startsWith("geodesic") &&
        group.userData.parameters?.frequency
      ) {
        // Geodesic: pass frequency and projection for edge quadrance scaling
        // Frequency: edge Q divides by freq²
        // Projection: edge lengths vary based on sphere projection type (in/mid/out/off)
        const tetEdge = parseFloat(el.tetScaleSlider.value);
        scale = tetEdge / (2 * Math.sqrt(2)); // Convert tet edge to halfSize
        nodeOptions = {
          frequency: group.userData.parameters.frequency,
          projection: group.userData.parameters.projection || "out",
        };
      } else {
        const tetEdge = parseFloat(el.tetScaleSlider.value);
        scale = tetEdge / (2 * Math.sqrt(2)); // Convert tet edge to halfSize
      }

      // Get cached geometry (prevents repeated generation)
      // Pass polyhedronType, scale, and options for 'packed' mode calculations
      const { geometry: nodeGeometry, triangles: trianglesPerNode } =
        getCachedNodeGeometry(
          getUseRTNodeGeometry(),
          nodeSize,
          polyType,
          scale,
          nodeOptions
        );

      // Calculate node radius for userData (same logic as getCachedNodeGeometry)
      let nodeRadius;
      if (nodeSize === "packed") {
        nodeRadius = getClosePackedRadius(polyType, scale, nodeOptions);
        // Fallback to "md" if packed not available (e.g., Point has no edges)
        if (nodeRadius === null) {
          nodeRadius = 0.04; // "md" size fallback
        }
      } else {
        nodeRadius = Nodes.getNodeSizeRadius(nodeSize);
      }

      // Get flatShading preference from checkbox
      const useFlatShading = el.nodeFlatShading?.checked || false;

      const currentNodeOpacity = getNodeOpacity();
      const effectiveNodeOpacity = currentNodeOpacity * dissolveOpacity;
      const nodeMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.2,
        flatShading: useFlatShading, // User-controlled shading
        transparent: effectiveNodeOpacity < 1,
        opacity: effectiveNodeOpacity,
        side: THREE.FrontSide, // Backface culling enabled - all polyhedra winding corrected (2026-01-11)
      });

      vertices.forEach(vertex => {
        // Clone material for each node to avoid shared material issues during selection
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
        node.position.copy(vertex);
        node.renderOrder = 3; // Render nodes on top

        // Mark as vertex node for Papercut section cut detection
        node.userData.isVertexNode = true;
        node.userData.nodeType = "sphere";
        node.userData.nodeRadius = nodeRadius;
        node.userData.nodeGeometry = getUseRTNodeGeometry()
          ? "rt"
          : "classical";

        group.add(node);
      });

      // End node generation timing and store triangle count
      PerformanceClock.endNodeGeneration();
      PerformanceClock.timings.lastNodeTriangles = Math.round(trianglesPerNode);
    } else {
      // Reset node triangle count when nodes are OFF
      PerformanceClock.timings.lastNodeTriangles = 0;
    }
  }

  /**
   * Render pentagon face tiling on a dodecahedron
   * Applies the pentagonalTiling pattern to each of the 12 pentagonal faces
   *
   * @param {THREE.Group} group - Group to render into
   * @param {Object} dodecGeometry - Dodecahedron geometry {vertices, edges, faces}
   * @param {number} scale - Scale of the dodecahedron
   * @param {number} generations - Pentagon tiling generations (1-3)
   * @param {number} opacity - Opacity for rendering
   */
  function renderDodecahedronFaceTiling(
    group,
    dodecGeometry,
    _scale, // Reserved for future use (e.g., scaling tiling independently)
    generations,
    opacity // Used for face rendering
  ) {
    const { vertices, faces } = dodecGeometry;

    // Get pentagon tiling geometry (2D, centered at origin)
    // Use quadrance of 1 and scale to face size later
    // Enable faces for filled pentagon rendering
    const pentTiling = Grids.pentagonalTiling(1, generations, {
      showFace: true,
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // RT-PURE SCALING: Fit tiling pattern WITHIN face
    // ═══════════════════════════════════════════════════════════════════════════
    // The tiling pattern's outermost vertices should align with the face vertices.
    // We use maxExtent (max radius of pattern) to scale pattern to fit face.
    //
    // Pattern growth by generation (for pattern radius R=1):
    //   Gen 1: maxExtent = 1 (single pentagon circumradius)
    //   Gen 2: maxExtent ≈ φ (pentagon centers at 1, circumradius 1/φ)
    //   Gen 3: maxExtent ≈ φ + 1/φ = φ² (outer ring at φ, circumradius 1/φ)
    // ═══════════════════════════════════════════════════════════════════════════
    // Calculate max extent of the 2D tiling pattern
    // This is the radius of the bounding circle (distance from center to farthest vertex)
    const maxExtent = Math.max(
      ...pentTiling.vertices.map(v => Math.sqrt(v.x * v.x + v.y * v.y))
    );

    // Find the outermost vertices (for boundary visualization)
    // Create material for tiling edges - cyan to contrast with yellow dodecahedron
    const tilingEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff, // Cyan
      linewidth: 1,
      depthTest: true,
      depthWrite: true,
    });

    // Create material for tiling faces - semi-transparent cyan
    const tilingFaceMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: opacity * 0.7,
      side: THREE.FrontSide, // Only render front faces (proper winding required)
      depthTest: true,
      depthWrite: true,
    });

    // Process each of the 12 pentagonal faces
    faces.forEach(faceIndices => {
      // Get face vertices in 3D
      const faceVerts = faceIndices.map(i => vertices[i]);

      // Calculate face center (centroid)
      const center = new THREE.Vector3(0, 0, 0);
      faceVerts.forEach(fv => center.add(fv));
      center.divideScalar(faceVerts.length);

      // Calculate face normal (cross product of two edges)
      const v0 = faceVerts[0];
      const v1 = faceVerts[1];
      const v2 = faceVerts[2];
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      // CRITICAL: Ensure normal points OUTWARD (away from origin)
      // Dodecahedron is centered at origin, so face center is on the outward side
      if (normal.dot(center) < 0) {
        normal.negate();
      }
      // Note: No flipWinding needed. With uBasis = normal × vBasis, the transformation
      // always preserves orientation (uBasis × vBasis = normal), so 2D CCW → 3D CCW from outside

      // Get face circumradius (center to vertex distance)
      const faceCircumradius = center.distanceTo(faceVerts[0]);

      // ═══════════════════════════════════════════════════════════════════════════
      // SCALING STRATEGY: Use slider/input to find correct φ-ratio empirically
      // The scale adjusts relative to CIRCUMRADIUS as base
      // φ-candidates: 0.618 (1/φ), 0.809 (cos36), 0.899 (√cos36), 1.236 (1/cos36)
      // ═══════════════════════════════════════════════════════════════════════════
      // Prefer numeric input (more precise) over slider
      const userScale = parseFloat(
        el.dodecTilingScaleInput?.value || el.dodecTilingScale?.value || "1.0"
      );
      const tilingScale = (faceCircumradius * userScale) / maxExtent;

      // Build transformation from 2D tiling plane (XY) to 3D face plane
      // The pentagon tiling has its first pentagon at +Y direction (top of pattern)
      // So we map 2D +Y to the direction of face vertex 0 for proper alignment
      //
      // vBasis = direction from center to first vertex (maps 2D +Y axis)
      // uBasis = perpendicular in face plane (maps 2D +X axis)
      const vBasis = new THREE.Vector3()
        .subVectors(faceVerts[0], center)
        .normalize();

      // uBasis = normal × vBasis gives right-handed system where uBasis × vBasis = normal
      // This preserves CCW winding from 2D to 3D
      const uBasis = new THREE.Vector3()
        .crossVectors(normal, vBasis)
        .normalize();

      // Transform each vertex from 2D tiling to 3D face
      const transformed3DVertices = pentTiling.vertices.map(v2d => {
        // Scale 2D coords by tiling scale
        const x2d = v2d.x * tilingScale;
        const y2d = v2d.y * tilingScale;

        // Position in 3D: center + x*uBasis + y*vBasis
        return new THREE.Vector3(
          center.x + x2d * uBasis.x + y2d * vBasis.x,
          center.y + x2d * uBasis.y + y2d * vBasis.y,
          center.z + x2d * uBasis.z + y2d * vBasis.z
        );
      });

      // Create edge geometry for this face's tiling
      const edgePositions = [];
      pentTiling.edges.forEach(([i, j]) => {
        const p1 = transformed3DVertices[i];
        const p2 = transformed3DVertices[j];
        edgePositions.push(p1.x, p1.y, p1.z);
        edgePositions.push(p2.x, p2.y, p2.z);
      });

      if (edgePositions.length > 0) {
        const edgeGeometry = new THREE.BufferGeometry();
        edgeGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(edgePositions, 3)
        );

        const edgeLines = new THREE.LineSegments(
          edgeGeometry,
          tilingEdgeMaterial.clone()
        );
        edgeLines.renderOrder = 4; // Render tiling on top of base edges
        group.add(edgeLines);
      }

      // Create face geometry for pentagon faces
      // Each face in pentTiling.faces is a 5-element array of vertex indices
      pentTiling.faces.forEach(pentFaceIndices => {
        // Get 3D vertices for this pentagon face
        const pentVerts3D = pentFaceIndices.map(i => transformed3DVertices[i]);

        // Triangulate pentagon (fan from first vertex)
        // Pentagon: V0, V1, V2, V3, V4 → triangles with REVERSED winding
        // The 2D→3D transform inverts orientation, so we use CW order to get outward normals
        const facePositions = [];
        for (let i = 1; i < pentVerts3D.length - 1; i++) {
          const pv0 = pentVerts3D[0];
          const pvi = pentVerts3D[i];
          const pvi1 = pentVerts3D[i + 1];

          // Reversed winding: [v0, vi1, vi] for correct front-face orientation
          facePositions.push(pv0.x, pv0.y, pv0.z);
          facePositions.push(pvi1.x, pvi1.y, pvi1.z);
          facePositions.push(pvi.x, pvi.y, pvi.z);
        }

        if (facePositions.length > 0) {
          const faceGeometry = new THREE.BufferGeometry();
          faceGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(facePositions, 3)
          );
          faceGeometry.computeVertexNormals();

          const faceMesh = new THREE.Mesh(
            faceGeometry,
            tilingFaceMaterial.clone()
          );
          faceMesh.renderOrder = 3; // Render faces behind edges
          group.add(faceMesh);
        }
      });
    });
  }

  /**
   * Helper function to render geodesic polyhedra with DRY pattern
   * Consolidates ~25 lines of duplicated code per geodesic into single config call
   *
   * @param {Object} config - Configuration object
   * @param {string} config.checkboxId - ID of visibility checkbox
   * @param {string} config.frequencyId - ID of frequency input
   * @param {string} config.projectionName - Name attribute of projection radio group
   * @param {Function} config.polyhedronFn - Polyhedra function to call
   * @param {THREE.Group} config.group - Scene group to render into
   * @param {number} config.color - Hex color for polyhedron
   * @param {number} config.scale - Scale parameter for polyhedron
   * @param {number} config.opacity - Opacity for rendering
   */
  function renderGeodesicPolyhedron(config) {
    const {
      checkboxId,
      frequencyId,
      projectionName,
      polyhedronFn,
      group,
      color,
      scale,
      opacity,
    } = config;

    if (document.getElementById(checkboxId).checked) {
      const frequency = parseInt(document.getElementById(frequencyId).value);
      const projectionRadio = document.querySelector(
        `input[name="${projectionName}"]:checked`
      );
      const projection = projectionRadio ? projectionRadio.value : "out";

      const actualFrequency = isNaN(frequency) ? 1 : frequency;
      const geometry = polyhedronFn(scale, actualFrequency, projection);

      // IMPORTANT: Set parameters BEFORE renderPolyhedron so PACKED nodes can access frequency
      group.userData.parameters = {
        frequency: actualFrequency,
        projection: projection,
      };

      renderPolyhedron(group, geometry, color, opacity);
      group.visible = true;
    } else {
      group.visible = false;
    }
  }

  /**
   * Debounced wrapper for slider input events.
   * Coalesces rapid slider drags to one updateGeometry per animation frame.
   */
  let geometryUpdatePending = false;
  function requestGeometryUpdate() {
    if (!geometryUpdatePending) {
      geometryUpdatePending = true;
      requestAnimationFrame(() => {
        updateGeometry();
        geometryUpdatePending = false;
      });
    }
  }

  /**
   * Update all geometry based on current settings
   */
  function updateGeometry() {
    // Start performance timing
    PerformanceClock.startCalculation();

    // QUADRAY SYSTEM: Use tet edge length as primary unit
    // For tetrahedron edge length e: halfSize = e / (2√2)
    const tetEdge = parseFloat(el.tetScaleSlider.value);
    const scale = tetEdge / (2 * Math.sqrt(2)); // Convert tet edge to halfSize
    const opacity = parseFloat(el.opacitySlider.value);

    // Point (single vertex - coordinate exploration tool)
    if (el.showPoint?.checked) {
      const pointData = Polyhedra.point(scale);
      renderPolyhedron(pointGroup, pointData, colorPalette.point, opacity);
      pointGroup.userData.type = "point";
      pointGroup.userData.allowedTools = ["move"]; // Only Move allowed
      pointGroup.visible = true;
    } else {
      pointGroup.visible = false;
    }

    // Line (1D primitive - two vertices, one edge)
    if (el.showLine?.checked) {
      // Get quadrance from input field (default 1)
      const lineQuadrance = parseFloat(el.lineQuadrance?.value || "1");
      // Get lineweight from input field (default 2)
      const lineWeight = parseFloat(el.lineWeight?.value || "2");
      const lineData = Polyhedra.line(lineQuadrance);
      renderPolyhedron(lineGroup, lineData, colorPalette.line, opacity, {
        lineWidth: lineWeight,
      });
      lineGroup.userData.type = "line";
      lineGroup.userData.parameters = {
        quadrance: lineQuadrance,
        length: Math.sqrt(lineQuadrance),
        lineWeight: lineWeight,
      };
      lineGroup.visible = true;
    } else {
      lineGroup.visible = false;
    }

    // Polygon (2D primitive - n vertices, n edges, 1 face)
    if (el.showPolygon?.checked) {
      // Get circumradius quadrance from input field (default 1)
      const polygonQuadrance = parseFloat(el.polygonQuadrance?.value || "1");
      // Get number of sides (default 3 = triangle)
      // Read from numeric input to allow values > 24, fallback to slider
      const polygonSides = parseInt(
        el.polygonSidesInput?.value || el.polygonSides?.value || "3"
      );

      // Update method info text — matches RT.nGonVertices() classification
      // Wildberger reflection: 1√ for any N. Method depends on star spread source.
      const polygonMethodInfo = el.polygonMethodInfo;
      if (polygonMethodInfo) {
        polygonMethodInfo.textContent = nGonMethodText(polygonSides);
      }

      // Get edge weight from input field (default 2)
      const polygonEdgeWeight = parseFloat(el.polygonEdgeWeight?.value || "2");
      // Get face visibility
      const polygonShowFace = el.polygonShowFace?.checked !== false;

      // Check if tiling is enabled
      const tilingEnabled = el.polygonEnableTiling?.checked || false;
      const tilingGenerations = tilingEnabled
        ? parseInt(el.polygonTilingGenerations?.value || "2")
        : 1;

      // Update tiling info text based on polygon type
      const tilingInfoEl = el.polygonTilingInfo;
      if (tilingInfoEl) {
        if (polygonSides === 3) {
          const tileCount = Math.pow(4, tilingGenerations - 1);
          tilingInfoEl.textContent = `Triangle: ${tileCount} tiles (4^${tilingGenerations - 1})`;
        } else if (polygonSides === 4) {
          const tileCount = Math.pow(4, tilingGenerations - 1);
          tilingInfoEl.textContent = `Square: ${tileCount} tiles (4^${tilingGenerations - 1})`;
        } else if (polygonSides === 5) {
          // Pentagon array: gen 1=1, gen 2=5, gen 3=10, gen 4+=more
          const pentCount =
            tilingGenerations === 1
              ? 1
              : tilingGenerations === 2
                ? 5
                : 5 + 5 * (tilingGenerations - 2);
          tilingInfoEl.textContent = `Pentagon array: ${pentCount} pentagons`;
        } else if (polygonSides === 6) {
          const n = Math.pow(2, tilingGenerations - 1);
          const tileCount = 6 * n * n;
          tilingInfoEl.textContent = `Hexagon: ${tileCount} triangles (6×${n}²)`;
        } else {
          tilingInfoEl.textContent = `${polygonSides}-gon: tiling not supported`;
        }
      }

      let polygonData;

      if (tilingEnabled && polygonSides === 3 && tilingGenerations > 1) {
        // Generate triangular tiling using Grids module
        polygonData = Grids.triangularTiling(
          polygonQuadrance,
          tilingGenerations,
          {
            showFace: polygonShowFace,
          }
        );
      } else if (tilingEnabled && polygonSides === 4 && tilingGenerations > 1) {
        // Generate square tiling using Grids module
        polygonData = Grids.squareTiling(polygonQuadrance, tilingGenerations, {
          showFace: polygonShowFace,
        });
      } else if (tilingEnabled && polygonSides === 5 && tilingGenerations > 1) {
        // Generate pentagonal tiling (5 triangular sectors from center)
        polygonData = Grids.pentagonalTiling(
          polygonQuadrance,
          tilingGenerations,
          {
            showFace: polygonShowFace,
          }
        );
      } else if (tilingEnabled && polygonSides === 6 && tilingGenerations > 1) {
        // Generate hexagonal tiling (6 triangular sectors from center)
        polygonData = Grids.hexagonalTiling(
          polygonQuadrance,
          tilingGenerations,
          {
            showFace: polygonShowFace,
          }
        );
      } else {
        // Single polygon (no tiling or unsupported)
        polygonData = Polyhedra.polygon(polygonQuadrance, {
          sides: polygonSides,
          showFace: polygonShowFace,
        });
      }

      // Set userData.parameters BEFORE renderPolyhedron so node rendering
      // has access to current tiling values (fixes PACKED cache key issue)
      polygonGroup.userData.type = "polygon";
      polygonGroup.userData.parameters = {
        quadrance: polygonQuadrance,
        circumradius: Math.sqrt(polygonQuadrance),
        sides: polygonSides,
        edgeQuadrance: polygonData.metadata?.edgeQuadrance,
        edgeLength: polygonData.metadata?.edgeLength,
        edgeWeight: polygonEdgeWeight,
        showFace: polygonShowFace,
        tilingEnabled,
        tilingGenerations,
        rtPure: polygonData.metadata?.rtPure,
      };

      renderPolyhedron(
        polygonGroup,
        polygonData,
        colorPalette.polygon,
        opacity,
        {
          lineWidth: polygonEdgeWeight,
        }
      );

      // BOUNDING PENTAGON: Draw candidate bounding pentagons for debugging
      // Shows multiple φ-ratio candidates to find the correct scale
      if (polygonSides === 5 && tilingEnabled && tilingGenerations > 1) {
        // Calculate max extent of the tiling pattern
        const tilingMaxExtent = Math.max(
          ...polygonData.vertices.map(v => Math.sqrt(v.x * v.x + v.y * v.y))
        );

        const invPhi = RT.PurePhi.inverse(); // 1/φ = φ-1 ≈ 0.618
        const cos36 = RT.PurePhi.pentagon.cos36(); // φ/2 ≈ 0.809

        // Candidate bounding radii (all φ-rational multiples of maxExtent)
        const candidates = [
          { scale: 1.0, color: 0x00ff00, name: "1.0 (maxExtent)" },
          {
            scale: invPhi,
            color: 0x0000ff,
            name: `1/φ ≈ ${invPhi.toFixed(4)}`,
          },
          {
            scale: cos36,
            color: 0xffff00,
            name: `cos36 ≈ ${cos36.toFixed(4)}`,
          },
          {
            scale: 1 / cos36,
            color: 0xff00ff,
            name: `1/cos36 ≈ ${(1 / cos36).toFixed(4)}`,
          },
        ];

        // Helper to draw pentagon at given radius
        const drawPentagon = (radius, color) => {
          const positions = [];
          for (let i = 0; i < 5; i++) {
            const angle1 = Math.PI / 2 + i * ((2 * Math.PI) / 5);
            const angle2 = Math.PI / 2 + ((i + 1) % 5) * ((2 * Math.PI) / 5);
            positions.push(
              radius * Math.cos(angle1),
              radius * Math.sin(angle1),
              0,
              radius * Math.cos(angle2),
              radius * Math.sin(angle2),
              0
            );
          }
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3)
          );
          const material = new THREE.LineBasicMaterial({
            color,
            linewidth: 2,
            depthTest: true,
          });
          const lines = new THREE.LineSegments(geometry, material);
          lines.renderOrder = 10;
          polygonGroup.add(lines);
        };

        // Draw all candidates
        candidates.forEach(c => {
          const radius = tilingMaxExtent * c.scale;
          drawPentagon(radius, c.color);
        });

        // Log all candidates for analysis
        console.log(
          `[RT] Pentagon bounding candidates (maxExtent=${tilingMaxExtent.toFixed(4)}):`
        );
        candidates.forEach(c => {
          const radius = tilingMaxExtent * c.scale;
          console.log(`  ${c.name}: boundingR=${radius.toFixed(4)}`);
        });
        console.log(
          `  Legend: GREEN=1.0, BLUE=1/φ, YELLOW=cos36, MAGENTA=1/cos36`
        );
      }

      polygonGroup.visible = true;
    } else {
      polygonGroup.visible = false;
    }

    // Prism (3D primitive - 2 N-gon caps + rectangular sides)
    if (el.showPrism?.checked) {
      // Get base circumradius quadrance from input field (default 1)
      const prismBaseQ = parseFloat(el.prismBaseQuadrance?.value || "1");
      // Get height quadrance from input field (default 1)
      const prismHeightQ = parseFloat(el.prismHeightQuadrance?.value || "1");
      // Get number of sides (default 6 = hexagonal prism)
      // Read from numeric input to allow values > 24, fallback to slider
      const prismSides = parseInt(
        el.prismSidesInput?.value || el.prismSides?.value || "6"
      );
      // Get face visibility
      const prismShowFaces = el.prismShowFaces?.checked !== false;

      const prismData = Primitives.prism(prismBaseQ, prismHeightQ, {
        sides: prismSides,
        showFaces: prismShowFaces,
      });
      renderPolyhedron(prismGroup, prismData, colorPalette.prism, opacity);
      prismGroup.userData.type = "prism";
      prismGroup.userData.parameters = {
        baseQuadrance: prismBaseQ,
        heightQuadrance: prismHeightQ,
        sides: prismSides,
        height: prismData.metadata.height,
        baseCircumradius: prismData.metadata.baseCircumradius,
        baseEdgeQuadrance: prismData.metadata.baseEdgeQuadrance,
        showFaces: prismShowFaces,
        rtPure: prismData.metadata.rtPure,
      };
      prismGroup.visible = true;

      // Update method info text — matches RT.nGonVertices() classification
      const prismMethodInfo = el.prismMethodInfo;
      if (prismMethodInfo) {
        prismMethodInfo.textContent = nGonMethodText(prismSides);
      }
    } else {
      prismGroup.visible = false;
    }

    // Cone (3D primitive - N-gon base + point apex)
    if (el.showCone?.checked) {
      // Get base circumradius quadrance from input field (default 1)
      const coneBaseQ = parseFloat(el.coneBaseQuadrance?.value || "1");
      // Get height quadrance from input field (default 1)
      const coneHeightQ = parseFloat(el.coneHeightQuadrance?.value || "1");
      // Get number of sides (default 6 = hexagonal cone)
      const coneSides = parseInt(el.coneSides?.value || "6");
      // Get face visibility
      const coneShowFaces = el.coneShowFaces?.checked !== false;

      const coneData = Primitives.cone(coneBaseQ, coneHeightQ, {
        sides: coneSides,
        showFaces: coneShowFaces,
      });
      renderPolyhedron(coneGroup, coneData, colorPalette.cone, opacity);
      coneGroup.userData.type = "cone";
      coneGroup.userData.parameters = {
        baseQuadrance: coneBaseQ,
        heightQuadrance: coneHeightQ,
        sides: coneSides,
        height: coneData.metadata.height,
        slantQuadrance: coneData.metadata.slantQuadrance,
        baseCircumradius: coneData.metadata.baseCircumradius,
        showFaces: coneShowFaces,
        rtPure: coneData.metadata.rtPure,
      };
      coneGroup.visible = true;
    } else {
      coneGroup.visible = false;
    }

    // Penrose Tiling (aperiodic tiling with golden ratio)
    if (el.showPenroseTiling?.checked) {
      // Get common parameters
      const penroseQuadrance = parseFloat(el.penroseQuadrance?.value || "1");
      const penroseEdgeWeight = parseFloat(el.penroseEdgeWeight?.value || "2");
      const penroseShowFace = el.penroseShowFace?.checked !== false;

      // Check if tiling (deflation) mode is enabled
      const tilingEnabled = el.penroseTilingEnabled?.checked || false;

      let penroseData;
      let tileColor = colorPalette.penroseThick; // Default color

      if (tilingEnabled) {
        // TILING MODE: Generate multi-tile pattern via deflation
        const seedRadio = document.querySelector(
          'input[name="penroseSeed"]:checked'
        );
        const seed = seedRadio ? seedRadio.value : "star";
        const generations = parseInt(el.penroseGenerations?.value || "2");

        // Generate tiling via deflation
        const tiles = PenroseTiling.generate(
          generations,
          seed,
          penroseQuadrance
        );

        // Convert to renderable geometry
        penroseData = PenroseTiling.tilesToGeometry(tiles, {
          showFace: penroseShowFace,
        });

        // Store metadata
        penroseTilingGroup.userData.parameters = {
          tilingEnabled: true,
          seed,
          generations,
          quadrance: penroseQuadrance,
          edgeWeight: penroseEdgeWeight,
          showFace: penroseShowFace,
          tileCount: tiles.length,
          ...penroseData.metadata,
        };
      } else {
        // SINGLE TILE MODE: Show individual tile based on type selection
        const tileTypeRadio = document.querySelector(
          'input[name="penroseTileType"]:checked'
        );
        const penroseTileType = tileTypeRadio ? tileTypeRadio.value : "thick";

        switch (penroseTileType) {
          case "thin":
            penroseData = PenroseTiles.thinRhombus(penroseQuadrance, {
              showFace: penroseShowFace,
            });
            tileColor = colorPalette.penroseThin;
            break;
          case "kite":
            penroseData = PenroseTiles.kite(penroseQuadrance, {
              showFace: penroseShowFace,
            });
            tileColor = colorPalette.penroseThick;
            break;
          case "dart":
            penroseData = PenroseTiles.dart(penroseQuadrance, {
              showFace: penroseShowFace,
            });
            tileColor = colorPalette.penroseThin;
            break;
          case "thick":
          default:
            penroseData = PenroseTiles.thickRhombus(penroseQuadrance, {
              showFace: penroseShowFace,
            });
            tileColor = colorPalette.penroseThick;
            break;
        }

        penroseTilingGroup.userData.parameters = {
          tilingEnabled: false,
          tileType: penroseTileType,
          quadrance: penroseQuadrance,
          edgeWeight: penroseEdgeWeight,
          showFace: penroseShowFace,
          ...penroseData.metadata,
        };
      }

      renderPolyhedron(penroseTilingGroup, penroseData, tileColor, opacity, {
        lineWidth: penroseEdgeWeight,
      });
      penroseTilingGroup.userData.type = "penroseTiling";
      penroseTilingGroup.visible = true;
    } else {
      penroseTilingGroup.visible = false;
    }

    // Tetrahelix 1: Toroidal - uses Quadray axis notation (QW, QX, QY, QZ)
    if (el.showTetrahelix1?.checked) {
      const tetrahelix1Count = parseInt(
        el.tetrahelix1CountSlider?.value || "10"
      );
      // Read Quadray axis (QW, QX, QY, QZ) - maps to old A, B, C, D faces
      const axisRadio = document.querySelector(
        'input[name="tetrahelix1Axis"]:checked'
      );
      const tetrahelix1Axis = axisRadio ? axisRadio.value : "QW";
      // Map Quadray axes to face indices (empirically verified)
      // QW and QX are swapped relative to naive A,B,C,D ordering
      const axisToFace = { QW: "B", QX: "A", QY: "C", QZ: "D" };
      const tetrahelix1StartFace = axisToFace[tetrahelix1Axis] || "B";

      const tetrahelix1Data = Helices.tetrahelix1(scale, {
        count: tetrahelix1Count,
        startFace: tetrahelix1StartFace,
      });
      renderPolyhedron(
        tetrahelix1Group,
        tetrahelix1Data,
        colorPalette.tetrahelix,
        opacity
      );
      tetrahelix1Group.userData.type = "tetrahelix1";
      tetrahelix1Group.userData.parameters = {
        count: tetrahelix1Count,
        axis: tetrahelix1Axis,
        tetrahedra: tetrahelix1Data.metadata.tetrahedra,
        expectedQ: tetrahelix1Data.metadata.expectedQ,
      };
      tetrahelix1Group.visible = true;
    } else {
      tetrahelix1Group.visible = false;
    }

    // Tetrahelix 2: Linear - Javelin model with both + and - directions
    if (el.showTetrahelix2?.checked) {
      const tetrahelix2Count = parseInt(
        el.tetrahelix2CountSlider?.value || "10"
      );
      // Read Quadray axis (QW, QX, QY, QZ)
      const axisRadio = document.querySelector(
        'input[name="tetrahelix2Axis"]:checked'
      );
      const tetrahelix2Axis = axisRadio ? axisRadio.value : "QW";
      // Read direction checkboxes - javelin can show both + and -
      const showPlus = el.tetrahelix2DirPlus?.checked ?? true;
      const showMinus = el.tetrahelix2DirMinus?.checked ?? false;

      // 3021 Rule: Map QW→B, QX→A, QY→C, QZ→D for generator compatibility
      const axisToFace = { QW: "B", QX: "A", QY: "C", QZ: "D" };
      const tetrahelix2StartFace = axisToFace[tetrahelix2Axis] || "B";

      const strandsRadio = document.querySelector(
        'input[name="tetrahelix2Strands"]:checked'
      );
      const tetrahelix2Strands = strandsRadio
        ? parseInt(strandsRadio.value)
        : 1;
      const bondModeRadio = document.querySelector(
        'input[name="tetrahelix2BondMode"]:checked'
      );
      const tetrahelix2BondMode = bondModeRadio
        ? bondModeRadio.value
        : "zipped";

      // Per-strand exit face: which face each strand exits after 1st tet (UI commented out, defaults 0)
      const getExitFace = qAxis => {
        const radio = document.querySelector(
          `input[name="tetrahelix2Exit${qAxis}"]:checked`
        );
        return radio ? parseInt(radio.value) : 0;
      };
      // Map UI Quadray names to internal face labels using 3021 Rule
      const tetrahelix2ExitFaces = {
        A: getExitFace("QX"), // QX → face A (3021 Rule)
        B: getExitFace("QW"), // QW → face B (3021 Rule)
        C: getExitFace("QY"), // QY → face C (3021 Rule)
        D: getExitFace("QZ"), // QZ → face D (3021 Rule)
      };

      // Javelin model: single call with dirPlus/dirMinus flags
      if (!showPlus && !showMinus) {
        console.log(
          "[RT] Tetrahelix2: No direction selected (+ or -). Enable at least one to render."
        );
        tetrahelix2Group.visible = false;
      } else {
        // Clear existing geometry
        disposeGroup(tetrahelix2Group);

        // Single call with both direction flags
        const tetrahelix2Data = Helices.tetrahelix2(scale, {
          count: tetrahelix2Count,
          startFace: tetrahelix2StartFace,
          dirPlus: showPlus,
          dirMinus: showMinus,
          strands: tetrahelix2Strands,
          bondMode: tetrahelix2BondMode,
          exitFaces: tetrahelix2ExitFaces,
        });

        renderPolyhedron(
          tetrahelix2Group,
          tetrahelix2Data,
          colorPalette.tetrahelix2 || 0x88ff88,
          opacity
        );

        tetrahelix2Group.userData.type = "tetrahelix2";
        tetrahelix2Group.userData.parameters = {
          count: tetrahelix2Count,
          axis: tetrahelix2Axis,
          dirPlus: showPlus,
          dirMinus: showMinus,
          strands: tetrahelix2Strands,
          bondMode: tetrahelix2BondMode,
          exitFaces: tetrahelix2ExitFaces,
        };
        tetrahelix2Group.visible = true;
      }
    } else {
      tetrahelix2Group.visible = false;
    }

    // Tetrahelix 3: Linear with octahedral seed
    if (el.showTetrahelix3?.checked) {
      const tetrahelix3Count = parseInt(
        el.tetrahelix3CountSlider?.value || "10"
      );
      // Read individual strand checkboxes A-H
      const enabledStrands = {
        A: el.tetrahelix3StrandA?.checked || false,
        B: el.tetrahelix3StrandB?.checked || false,
        C: el.tetrahelix3StrandC?.checked || false,
        D: el.tetrahelix3StrandD?.checked || false,
        E: el.tetrahelix3StrandE?.checked || false,
        F: el.tetrahelix3StrandF?.checked || false,
        G: el.tetrahelix3StrandG?.checked || false,
        H: el.tetrahelix3StrandH?.checked || false,
      };
      // Read chirality checkboxes A-H (checked = RH, unchecked = LH)
      const strandChirality = {
        A: el.tetrahelix3ChiralA?.checked !== false,
        B: el.tetrahelix3ChiralB?.checked !== false,
        C: el.tetrahelix3ChiralC?.checked !== false,
        D: el.tetrahelix3ChiralD?.checked !== false,
        E: el.tetrahelix3ChiralE?.checked !== false,
        F: el.tetrahelix3ChiralF?.checked !== false,
        G: el.tetrahelix3ChiralG?.checked !== false,
        H: el.tetrahelix3ChiralH?.checked !== false,
      };

      const tetrahelix3Data = Helices.tetrahelix3(scale, {
        count: tetrahelix3Count,
        enabledStrands,
        strandChirality,
      });
      renderPolyhedron(
        tetrahelix3Group,
        tetrahelix3Data,
        colorPalette.tetrahelix3 || 0xff88ff, // Light magenta
        opacity
      );
      tetrahelix3Group.userData.type = "tetrahelix3";
      tetrahelix3Group.userData.parameters = {
        count: tetrahelix3Count,
        enabledStrands,
        strandChirality,
      };
      tetrahelix3Group.visible = true;
    } else {
      tetrahelix3Group.visible = false;
    }

    // Cube (Blue)
    if (el.showCube.checked) {
      const cube = Polyhedra.cube(scale);
      renderPolyhedron(cubeGroup, cube, colorPalette.cube, opacity);
      cubeGroup.visible = true;
    } else {
      cubeGroup.visible = false;
    }

    // Cube Matrix (IVM Array)
    if (el.showCubeMatrix.checked) {
      const matrixSize = parseInt(el.cubeMatrixSizeSlider?.value || "1");
      const rotate45 = el.cubeMatrixRotate45?.checked || false;

      // Clear existing cube matrix group
      disposeGroup(cubeMatrixGroup);

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity = cubeMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      cubeMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        opacity: opacity,
        scale: scale,
      };

      // Generate cube matrix
      const cubeMatrix = RTMatrix.createCubeMatrix(
        matrixSize,
        scale,
        rotate45,
        effectiveOpacity,
        colorPalette.cubeMatrix,
        THREE
      );
      cubeMatrixGroup.add(cubeMatrix);

      // Add vertex nodes if enabled
      {
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          addMatrixNodes(
            cubeMatrixGroup,
            matrixSize,
            scale,
            rotate45,
            colorPalette.cubeMatrix,
            nodeSize
          );
        }
      }
      cubeMatrixGroup.visible = true;
    } else {
      cubeMatrixGroup.visible = false;
    }

    // Tetrahedron (Yellow) - with optional truncation
    if (el.showTetrahedron.checked) {
      let tetra;

      // Check if truncation is enabled
      const truncCheckbox = el.showTruncatedTetrahedron;
      if (truncCheckbox && truncCheckbox.checked) {
        // Get truncation value from slider
        const truncSlider = el.truncationTetraSlider;
        const truncation = truncSlider ? parseFloat(truncSlider.value) : 1 / 3;
        tetra = Polyhedra.truncatedTetrahedron(scale, truncation);
      } else {
        tetra = Polyhedra.tetrahedron(scale);
      }

      renderPolyhedron(
        tetrahedronGroup,
        tetra,
        colorPalette.tetrahedron,
        opacity
      );
      tetrahedronGroup.visible = true;

      // DIAGNOSTIC: Log OutSphere radius for edge lengths 1, 2, 3, 4, 5
      // scale = halfSize (s), edge length = 2s√2, OutSphere = s√3
      const halfSize = scale;
      const tetEdgeLength = 2 * halfSize * RT.PureRadicals.sqrt2();
      const outSphereRadius = halfSize * RT.PureRadicals.sqrt3();
      const gridInterval = RT.PureRadicals.QUADRAY_GRID_INTERVAL;
      const difference = outSphereRadius - gridInterval;
      const percentDiff = (difference / gridInterval) * 100;

      // Only log for integer edge lengths 1-5
      const roundedEdge = Math.round(tetEdgeLength * 10) / 10;
      if ([1.0, 2.0, 3.0, 4.0, 5.0].includes(roundedEdge)) {
        MetaLog.log(
          MetaLog.DETAILED,
          `\n=== TETRAHEDRON EDGE LENGTH ${roundedEdge} ===`
        );
        MetaLog.log(MetaLog.DETAILED, `HalfSize (s): ${halfSize.toFixed(16)}`);
        MetaLog.log(
          MetaLog.DETAILED,
          `Edge length (2s√2): ${tetEdgeLength.toFixed(16)}`
        );
        MetaLog.log(
          MetaLog.DETAILED,
          `OutSphere radius (s√3): ${outSphereRadius.toFixed(16)}`
        );
        MetaLog.log(
          MetaLog.DETAILED,
          `Grid interval (√6/4): ${gridInterval.toFixed(16)}`
        );
        MetaLog.log(
          MetaLog.DETAILED,
          `Difference (OutSphere - Grid): ${difference.toFixed(16)}`
        );
        MetaLog.log(
          MetaLog.DETAILED,
          `Percent difference: ${percentDiff.toFixed(8)}%`
        );
      }
    } else {
      tetrahedronGroup.visible = false;
    }

    // Geodesic Tetrahedron (Cyan - complementary to base Yellow)
    renderGeodesicPolyhedron({
      checkboxId: "showGeodesicTetrahedron",
      frequencyId: "geodesicTetraFrequency",
      projectionName: "geodesicTetraProjection",
      polyhedronFn: Polyhedra.geodesicTetrahedron,
      group: geodesicTetrahedronGroup,
      color: colorPalette.geodesicTetrahedron, // Cyan/turquoise
      scale,
      opacity,
    });

    // Dual Tetrahedron (Magenta) - with optional truncation
    if (el.showDualTetrahedron.checked) {
      let dualTetra;

      // Check if truncation is enabled
      const truncDualCheckbox = el.showTruncatedDualTetrahedron;
      if (truncDualCheckbox && truncDualCheckbox.checked) {
        // Get truncation value from slider
        const truncDualSlider = el.truncationDualTetraSlider;
        const truncation = truncDualSlider
          ? parseFloat(truncDualSlider.value)
          : 1 / 3;
        dualTetra = Polyhedra.truncatedDualTetrahedron(scale, truncation);
      } else {
        dualTetra = Polyhedra.dualTetrahedron(scale);
      }

      renderPolyhedron(
        dualTetrahedronGroup,
        dualTetra,
        colorPalette.dualTetrahedron,
        opacity
      );
      dualTetrahedronGroup.visible = true;
    } else {
      dualTetrahedronGroup.visible = false;
    }

    // Geodesic Dual Tetrahedron (Yellow - reciprocal complementary: matches base solid)
    renderGeodesicPolyhedron({
      checkboxId: "showGeodesicDualTetrahedron",
      frequencyId: "geodesicDualTetraFrequency",
      projectionName: "geodesicDualTetraProjection",
      polyhedronFn: Polyhedra.geodesicDualTetrahedron,
      group: geodesicDualTetrahedronGroup,
      color: colorPalette.geodesicDualTetrahedron, // Yellow (reciprocal complementary)
      scale,
      opacity,
    });

    // Tet Matrix (IVM Array)
    if (el.showTetMatrix.checked) {
      const matrixSize = parseInt(el.tetMatrixSizeSlider?.value || "1");
      const rotate45 = el.tetMatrixRotate45?.checked || false;

      // Clear existing tet matrix group
      disposeGroup(tetMatrixGroup);

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity = tetMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      tetMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        opacity: opacity,
        scale: scale,
      };

      // Generate tet matrix
      {
        const tetMatrix = RTMatrix.createTetrahedronMatrix(
          matrixSize,
          scale,
          rotate45,
          effectiveOpacity,
          colorPalette.tetrahedron,
          THREE
        );
        tetMatrixGroup.add(tetMatrix);

        // Add vertex nodes if enabled
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          addMatrixNodes(
            tetMatrixGroup,
            matrixSize,
            scale,
            rotate45,
            colorPalette.tetrahedron,
            nodeSize,
            "tetrahedron"
          );
        }
      }
      tetMatrixGroup.visible = true;
    } else {
      tetMatrixGroup.visible = false;
    }

    // Octahedron (Green)
    if (el.showOctahedron.checked) {
      const octa = Polyhedra.octahedron(scale);
      renderPolyhedron(octahedronGroup, octa, colorPalette.octahedron, opacity);
      octahedronGroup.visible = true;
    } else {
      octahedronGroup.visible = false;
    }

    // Geodesic Octahedron (Magenta/Pink - complementary to Green)
    renderGeodesicPolyhedron({
      checkboxId: "showGeodesicOctahedron",
      frequencyId: "geodesicOctaFrequency",
      projectionName: "geodesicOctaProjection",
      polyhedronFn: Polyhedra.geodesicOctahedron,
      group: geodesicOctahedronGroup,
      color: colorPalette.geodesicOctahedron, // Magenta/pink
      scale,
      opacity,
    });

    // Octa Matrix (IVM Array)
    if (el.showOctaMatrix.checked) {
      const matrixSize = parseInt(el.octaMatrixSizeSlider?.value || "1");
      const rotate45 = el.octaMatrixRotate45?.checked || false;
      const colinearEdges = el.octaMatrixColinearEdges?.checked || false;

      // Clear existing octa matrix group
      disposeGroup(octaMatrixGroup);

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity = octaMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      octaMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        colinearEdges: colinearEdges,
        opacity: opacity,
        scale: scale,
      };

      // Generate octa matrix
      {
        const octaMatrix = RTMatrix.createOctahedronMatrix(
          matrixSize,
          scale,
          rotate45,
          colinearEdges,
          effectiveOpacity,
          colorPalette.octahedronMatrix,
          THREE
        );
        octaMatrixGroup.add(octaMatrix);

        // Add vertex nodes if enabled
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          addMatrixNodes(
            octaMatrixGroup,
            matrixSize,
            scale,
            rotate45,
            colorPalette.octahedronMatrix,
            nodeSize,
            "octahedron",
            colinearEdges
          );
        }
      }
      octaMatrixGroup.visible = true;
    } else {
      octaMatrixGroup.visible = false;
    }

    // Icosahedron (Cyan)
    if (el.showIcosahedron.checked) {
      const icosa = Polyhedra.icosahedron(scale);
      renderPolyhedron(
        icosahedronGroup,
        icosa,
        colorPalette.icosahedron,
        opacity
      );
      icosahedronGroup.visible = true;
    } else {
      icosahedronGroup.visible = false;
    }

    // Dodecahedron (Yellow) - with Face Tiling option
    if (el.showDodecahedron.checked) {
      // Check for face tiling - applies pentagon tiling to each pentagonal face
      const faceTilingEnabled = el.dodecahedronFaceTiling?.checked || false;
      const tilingGenerations = faceTilingEnabled
        ? parseInt(el.polygonTilingGenerations?.value || "1")
        : 1;

      // Store parameters for potential future use (e.g., PACKED nodes)
      dodecahedronGroup.userData.parameters = {
        faceTilingEnabled,
        tilingGenerations,
      };

      if (faceTilingEnabled && tilingGenerations > 1) {
        // Face tiling enabled: apply pentagon array to each face
        // TODO: Implement actual face subdivision - for now render with pentagon overlay
        // Render base dodecahedron with reduced opacity when tiling is shown
        const dodec = Polyhedra.dodecahedron(scale);
        renderPolyhedron(
          dodecahedronGroup,
          dodec,
          colorPalette.dodecahedron,
          opacity * 0.3 // Reduced opacity for base when tiled
        );

        // Apply pentagon tiling to each of the 12 pentagonal faces
        renderDodecahedronFaceTiling(
          dodecahedronGroup,
          dodec,
          scale,
          tilingGenerations,
          opacity
        );
      } else {
        // No face tiling - render normally
        const dodec = Polyhedra.dodecahedron(scale);
        renderPolyhedron(
          dodecahedronGroup,
          dodec,
          colorPalette.dodecahedron,
          opacity
        );
      }
      dodecahedronGroup.visible = true;
    } else {
      dodecahedronGroup.visible = false;
    }

    // Geodesic Icosahedron (Orange - complementary to base Cyan)
    // Custom handling to support Face Tiling option
    if (el.showGeodesicIcosahedron.checked) {
      const frequency = parseInt(el.geodesicIcosaFrequency.value);
      const projectionRadio = document.querySelector(
        'input[name="geodesicIcosaProjection"]:checked'
      );
      const projection = projectionRadio ? projectionRadio.value : "out";
      const actualFrequency = isNaN(frequency) ? 1 : frequency;

      // Check for face tiling - multiplies effective frequency
      const faceTilingEnabled = el.geodesicIcosaFaceTiling?.checked || false;
      const tilingGenerations = faceTilingEnabled
        ? parseInt(el.polygonTilingGenerations?.value || "1")
        : 1;

      // Effective frequency = base frequency × tiling divisions
      // Tiling gen=1 → no change, gen=2 → 2× subdivision, gen=3 → 4× subdivision
      const tilingDivisions = Math.pow(2, tilingGenerations - 1);
      const effectiveFrequency = actualFrequency * tilingDivisions;

      const geometry = Polyhedra.geodesicIcosahedron(
        scale,
        effectiveFrequency,
        projection
      );

      // IMPORTANT: Set parameters BEFORE renderPolyhedron so node rendering has access
      // Use effectiveFrequency for PACKED nodes (includes tiling divisions)
      geodesicIcosahedronGroup.userData.parameters = {
        frequency: effectiveFrequency, // Use effective for PACKED node scaling
        baseFrequency: actualFrequency,
        effectiveFrequency,
        projection,
        faceTilingEnabled,
        tilingGenerations,
      };

      renderPolyhedron(
        geodesicIcosahedronGroup,
        geometry,
        colorPalette.geodesicIcosahedron,
        opacity
      );
      geodesicIcosahedronGroup.visible = true;

      if (faceTilingEnabled && tilingGenerations > 1) {
        MetaLog.log(
          MetaLog.DETAILED,
          `[RT] Geodesic Icosahedron: freq=${actualFrequency} × tiling=${tilingDivisions} → effective=${effectiveFrequency}`
        );
      }
    } else {
      geodesicIcosahedronGroup.visible = false;
    }

    // Dual Icosahedron (Orange - reciprocal complementary: matches base geodesic)
    if (el.showDualIcosahedron.checked) {
      const dualIcosa = Polyhedra.dualIcosahedron(scale);
      renderPolyhedron(
        dualIcosahedronGroup,
        dualIcosa,
        colorPalette.dualIcosahedron,
        opacity
      );
      dualIcosahedronGroup.visible = true;
    } else {
      dualIcosahedronGroup.visible = false;
    }

    // Geodesic Dual Icosahedron (Cyan - reciprocal complementary: matches base solid)
    renderGeodesicPolyhedron({
      checkboxId: "showGeodesicDualIcosahedron",
      frequencyId: "geodesicDualIcosaFrequency",
      projectionName: "geodesicDualIcosaProjection",
      polyhedronFn: Polyhedra.geodesicDualIcosahedron,
      group: geodesicDualIcosahedronGroup,
      color: colorPalette.geodesicDualIcosahedron, // Cyan (reciprocal complementary)
      scale,
      opacity,
    });

    // Cuboctahedron (Lime green - Vector Equilibrium)
    if (el.showCuboctahedron.checked) {
      // Scale by √2 to match matrix geometry (vertices at scale, not scale/√2)
      const cubocta = Polyhedra.cuboctahedron(scale * Math.sqrt(2));
      renderPolyhedron(
        cuboctahedronGroup,
        cubocta,
        colorPalette.cuboctahedron,
        opacity
      ); // Bright lime-cyan
      cuboctahedronGroup.visible = true;
    } else {
      cuboctahedronGroup.visible = false;
    }

    // Cuboctahedron Matrix (Vector Equilibrium Array)
    if (el.showCuboctahedronMatrix.checked) {
      const matrixSize = parseInt(el.cuboctaMatrixSizeSlider?.value || "1");
      const rotate45 = el.cuboctaMatrixRotate45?.checked || false;

      // Clear existing cubocta matrix group
      disposeGroup(cuboctaMatrixGroup);

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity =
        cuboctaMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      cuboctaMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        opacity: opacity,
        scale: scale,
      };

      // Generate cuboctahedron matrix
      {
        const cuboctaMatrix = RTMatrix.createCuboctahedronMatrix(
          matrixSize,
          scale,
          rotate45,
          effectiveOpacity,
          colorPalette.cuboctahedron, // Lime-cyan (Vector Equilibrium color)
          THREE
        );
        cuboctaMatrixGroup.add(cuboctaMatrix);

        // Add vertex nodes if enabled
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          addMatrixNodes(
            cuboctaMatrixGroup,
            matrixSize,
            scale,
            rotate45,
            colorPalette.cuboctahedron,
            nodeSize,
            "cuboctahedron"
          );
        }
      }
      cuboctaMatrixGroup.visible = true;
    } else {
      cuboctaMatrixGroup.visible = false;
    }

    // Rhombic Dodecahedron (Golden Orange)
    if (el.showRhombicDodecahedron.checked) {
      // Scale by √2 to match matrix geometry (axial vertices at scale, not scale/√2)
      const rhombicDodec = Polyhedra.rhombicDodecahedron(scale * Math.sqrt(2));
      renderPolyhedron(
        rhombicDodecahedronGroup,
        rhombicDodec,
        colorPalette.rhombicDodecahedron,
        opacity
      );
      rhombicDodecahedronGroup.visible = true;
    } else {
      rhombicDodecahedronGroup.visible = false;
    }

    // ========== QUADRAY DEMONSTRATORS ==========

    // Quadray Tetrahedron (Native WXYZ definition)
    if (el.showQuadrayTetrahedron?.checked) {
      const normalize = el.quadrayTetraNormalize?.checked ?? true;
      const quadrayTet = Polyhedra.quadrayTetrahedron(scale, {
        normalize: normalize,
      });
      renderPolyhedron(
        quadrayTetrahedronGroup,
        quadrayTet,
        colorPalette.quadrayTetrahedron,
        opacity
      );
      // Store parameters for export/import (preserves native Quadray coordinates)
      quadrayTetrahedronGroup.userData.parameters = {
        normalize: normalize,
        wxyz: quadrayTet.wxyz_normalized, // Store the actual WXYZ coords
      };
      quadrayTetrahedronGroup.visible = true;
    } else {
      quadrayTetrahedronGroup.visible = false;
    }

    // Quadray Tetrahedron Deformed (Demonstrates 4th DOF)
    if (el.showQuadrayTetraDeformed?.checked) {
      const zStretch = parseFloat(el.quadrayTetraZStretch?.value || "2");
      const quadrayTetDeformed = Polyhedra.quadrayTetrahedronDeformed(
        scale,
        zStretch
      );
      renderPolyhedron(
        quadrayTetraDeformedGroup,
        quadrayTetDeformed,
        colorPalette.quadrayTetraDeformed,
        opacity
      );
      // Store parameters for export/import (preserves deformation)
      quadrayTetraDeformedGroup.userData.parameters = {
        zStretch: zStretch,
        wxyz: quadrayTetDeformed.wxyz_normalized, // Store the actual WXYZ coords
      };
      quadrayTetraDeformedGroup.visible = true;
    } else {
      quadrayTetraDeformedGroup.visible = false;
    }

    // Quadray Cuboctahedron (Vector Equilibrium - 4D Native)
    // NOTE: The central vectors visible when this is shown are from quadrayBasis (WXYZ arrows),
    // not from the cuboctahedron edges. Toggle "Show Quadray Basis" to hide them if desired.
    if (el.showQuadrayCuboctahedron?.checked) {
      const normalize = el.quadrayCuboctaNormalize?.checked ?? true;
      // Scale by 1/2 to match XYZ cuboctahedron size
      // Quadray {2,1,1,0} normalized produces vertices at distance 2√2 from origin
      // XYZ cuboctahedron (at same slider scale) has vertices at distance √2 from origin
      const quadrayCubocta = Polyhedra.quadrayCuboctahedron(scale / 2, {
        normalize: normalize,
      });
      renderPolyhedron(
        quadrayCuboctahedronGroup,
        quadrayCubocta,
        colorPalette.quadrayCuboctahedron,
        opacity
      );
      // Store parameters for export/import
      quadrayCuboctahedronGroup.userData.parameters = {
        normalize: normalize,
        wxyz: quadrayCubocta.wxyz_normalized, // Store the actual WXYZ coords
      };
      quadrayCuboctahedronGroup.visible = true;
    } else {
      quadrayCuboctahedronGroup.visible = false;
    }

    // Quadray Octahedron
    if (el.showQuadrayOctahedron?.checked) {
      const normalize = el.quadrayOctaNormalize?.checked ?? true;
      const quadrayOcta = Polyhedra.quadrayOctahedron(scale, {
        normalize: normalize,
      });
      renderPolyhedron(
        quadrayOctahedronGroup,
        quadrayOcta,
        colorPalette.quadrayOctahedron,
        opacity
      );
      quadrayOctahedronGroup.userData.parameters = {
        normalize: normalize,
        wxyz: quadrayOcta.wxyz_normalized,
      };
      quadrayOctahedronGroup.visible = true;
    } else {
      quadrayOctahedronGroup.visible = false;
    }

    // Quadray Truncated Tetrahedron (7-gon projection source)
    if (el.showQuadrayTruncatedTet?.checked) {
      const normalize = el.quadrayTruncTetNormalize?.checked ?? true;
      const quadrayTruncTet = Polyhedra.quadrayTruncatedTetrahedron(scale, {
        normalize: normalize,
      });
      renderPolyhedron(
        quadrayTruncatedTetGroup,
        quadrayTruncTet,
        colorPalette.quadrayTruncatedTet,
        opacity
      );
      quadrayTruncatedTetGroup.userData.parameters = {
        normalize: normalize,
        wxyz: quadrayTruncTet.wxyz_normalized,
        primeProjection: quadrayTruncTet.metadata?.primeProjection,
      };
      quadrayTruncatedTetGroup.visible = true;
    } else {
      quadrayTruncatedTetGroup.visible = false;
      // Hide prime projection visualization when truncated tet is hidden
      RTPrimeCuts.showPrimePolygon(null, scene, camera);
    }

    // Quadray Stella Octangula (Star Tetrahedron - compound of two tetrahedra)
    if (el.showQuadrayStellaOctangula?.checked) {
      const normalize = el.quadrayStellaOctangulaNormalize?.checked ?? true;
      const stellaOcta = Polyhedra.quadrayStellaOctangula(scale, {
        normalize: normalize,
      });
      renderPolyhedron(
        quadrayStellaOctangulaGroup,
        stellaOcta,
        colorPalette.quadrayStellaOctangula,
        opacity
      );
      quadrayStellaOctangulaGroup.userData.parameters = {
        normalize: normalize,
        wxyz: stellaOcta.wxyz_normalized,
      };
      quadrayStellaOctangulaGroup.visible = true;
    } else {
      quadrayStellaOctangulaGroup.visible = false;
    }

    // ========== PRIME POLYGON PROJECTION POLYHEDRA ==========
    // These use BASE Polyhedra functions (no Quadray normalization)
    // Single source of truth for prime hull projections

    // Prime Truncated Tetrahedron (5-gon)
    if (el.showPrimeTruncTet?.checked) {
      // Clear existing group
      disposeGroup(primeTruncTetGroup);

      // Use base truncated tetrahedron - matches Python rt_polyhedra.py exactly
      const truncTet = Polyhedra.truncatedTetrahedron(scale, 1 / 3);

      renderPolyhedron(
        primeTruncTetGroup,
        truncTet,
        colorPalette.quadrayTruncatedTet, // Reuse color
        opacity
      );

      primeTruncTetGroup.userData = {
        type: "primeTruncTet",
        parameters: { scale: scale, truncation: 1 / 3 },
      };
      primeTruncTetGroup.visible = true;
    } else {
      primeTruncTetGroup.visible = false;
    }

    // Prime Compound (TruncTet + DualTet) for 7-gon
    // Uses dual tet with unit-sphere normalization for robust hull projection
    if (el.showPrimeCompoundTet?.checked) {
      // Clear existing group
      disposeGroup(primeCompoundTetGroup);

      // Dual tet compound: all vertices on unit sphere × scale
      const compound = Polyhedra.compoundTruncTetDualTet(scale, 1 / 3);

      // Render truncated tetrahedron component
      const truncTetSubGroup = new THREE.Group();
      truncTetSubGroup.userData.type = "truncatedTetrahedron";
      renderPolyhedron(
        truncTetSubGroup,
        compound.components.truncatedTetrahedron,
        colorPalette.quadrayTruncatedTet,
        opacity
      );
      primeCompoundTetGroup.add(truncTetSubGroup);

      // Render dual tetrahedron component
      const dualTetSubGroup = new THREE.Group();
      dualTetSubGroup.userData.type = "dualTetrahedron";
      renderPolyhedron(
        dualTetSubGroup,
        compound.components.dualTetrahedron,
        colorPalette.tetrahedron,
        opacity
      );
      primeCompoundTetGroup.add(dualTetSubGroup);

      primeCompoundTetGroup.userData = {
        type: "primeCompoundTet",
        parameters: {
          scale: scale,
          truncation: 1 / 3,
          metadata: compound.metadata,
        },
      };
      primeCompoundTetGroup.visible = true;
    } else {
      primeCompoundTetGroup.visible = false;
    }

    // Prime Compound (TruncTet + Icosa) for 11/13-gon
    if (el.showPrimeCompoundIcosa?.checked) {
      // Clear existing group
      disposeGroup(primeCompoundIcosaGroup);

      // Use base compound function - matches Python rt_polyhedra.py exactly
      const compound = Polyhedra.compoundTruncTetIcosa(scale, 1 / 3);

      // Render truncated tetrahedron component
      const truncTetSubGroup = new THREE.Group();
      truncTetSubGroup.userData.type = "truncatedTetrahedron";
      renderPolyhedron(
        truncTetSubGroup,
        compound.components.truncatedTetrahedron,
        colorPalette.quadrayTruncatedTet,
        opacity
      );
      primeCompoundIcosaGroup.add(truncTetSubGroup);

      // Render icosahedron component
      const icosaSubGroup = new THREE.Group();
      icosaSubGroup.userData.type = "icosahedron";
      renderPolyhedron(
        icosaSubGroup,
        compound.components.icosahedron,
        colorPalette.icosahedron,
        opacity
      );
      primeCompoundIcosaGroup.add(icosaSubGroup);

      primeCompoundIcosaGroup.userData = {
        type: "primeCompoundIcosa",
        parameters: {
          scale: scale,
          truncation: 1 / 3,
          metadata: compound.metadata,
        },
      };
      primeCompoundIcosaGroup.visible = true;
    } else {
      primeCompoundIcosaGroup.visible = false;
    }

    // Prime Geodesic Tet f=2 (single-poly 7-gon)
    if (el.showPrimeGeoTetF2?.checked) {
      disposeGroup(primeGeoTetF2Group);

      const geoTet = Polyhedra.geodesicTetrahedron(scale, 2, "out");
      renderPolyhedron(
        primeGeoTetF2Group,
        geoTet,
        colorPalette.geodesicTetrahedron,
        opacity
      );

      primeGeoTetF2Group.userData = {
        type: "primeGeoTetF2",
        parameters: { scale: scale, frequency: 2, projection: "out" },
      };
      primeGeoTetF2Group.visible = true;
    } else {
      primeGeoTetF2Group.visible = false;
    }

    // Prime Geodesic Tet f=4 (single-poly 11/13-gon)
    if (el.showPrimeGeoTetF4?.checked) {
      disposeGroup(primeGeoTetF4Group);

      const geoTet = Polyhedra.geodesicTetrahedron(scale, 4, "out");
      renderPolyhedron(
        primeGeoTetF4Group,
        geoTet,
        colorPalette.geodesicTetrahedron,
        opacity
      );

      primeGeoTetF4Group.userData = {
        type: "primeGeoTetF4",
        parameters: { scale: scale, frequency: 4, projection: "out" },
      };
      primeGeoTetF4Group.visible = true;
    } else {
      primeGeoTetF4Group.visible = false;
    }

    // Rhombic Dodecahedron Matrix (Space-Filling Array)
    if (el.showRhombicDodecMatrix.checked) {
      const matrixSize = parseInt(
        el.rhombicDodecMatrixSizeSlider?.value || "1"
      );
      const rotate45 = el.rhombicDodecMatrixRotate45?.checked || false;
      const faceCoplanar = el.rhombicDodecMatrixFaceCoplanar?.checked || false;

      // Clear existing rhombic dodec matrix group
      disposeGroup(rhombicDodecMatrixGroup);

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity =
        rhombicDodecMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      rhombicDodecMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        faceCoplanar: faceCoplanar,
        opacity: opacity,
        scale: scale,
      };

      // Generate rhombic dodecahedron matrix
      {
        const rhombicDodecMatrix = RTMatrix.createRhombicDodecahedronMatrix(
          matrixSize,
          scale,
          rotate45,
          faceCoplanar,
          effectiveOpacity,
          colorPalette.rhombicDodecahedron, // Golden orange (Rhombic Dodecahedron color)
          THREE
        );
        rhombicDodecMatrixGroup.add(rhombicDodecMatrix);

        // Add vertex nodes if enabled
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          addMatrixNodes(
            rhombicDodecMatrixGroup,
            matrixSize,
            scale,
            rotate45,
            colorPalette.rhombicDodecahedron,
            nodeSize,
            "rhombicDodecahedron",
            faceCoplanar
          );
        }
      }
      rhombicDodecMatrixGroup.visible = true;
    } else {
      rhombicDodecMatrixGroup.visible = false;
    }

    // ========== RADIAL MATRICES ==========

    // Radial Cube Matrix (concentric shell expansion)
    if (el.showRadialCubeMatrix?.checked) {
      const frequency = parseInt(el.radialCubeFreqSlider?.value || "1");
      const spaceFilling = el.radialCubeSpaceFill?.checked ?? true;

      // Clear existing radial cube matrix group
      disposeGroup(radialCubeMatrixGroup);

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity =
        radialCubeMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      radialCubeMatrixGroup.userData.parameters = {
        frequency: frequency,
        spaceFilling: spaceFilling,
        opacity: opacity,
        scale: scale,
      };

      // Generate radial cube matrix
      {
        const radialCubeMatrix = RTRadialMatrix.createRadialCubeMatrix(
          frequency,
          scale,
          spaceFilling,
          effectiveOpacity,
          colorPalette.cube, // Use cube color
          THREE
        );
        radialCubeMatrixGroup.add(radialCubeMatrix);

        // Add vertex nodes if enabled
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          const spacing = scale * 2;
          const positions = RTRadialMatrix.getCubePositions(
            frequency,
            spacing,
            spaceFilling
          );
          addRadialMatrixNodes(
            radialCubeMatrixGroup,
            positions,
            scale,
            colorPalette.cube,
            nodeSize,
            "cube"
          );
        }
      }
      radialCubeMatrixGroup.visible = true;
    } else {
      radialCubeMatrixGroup.visible = false;
    }

    // Radial Rhombic Dodecahedron Matrix (FCC lattice expansion)
    // RD is inherently space-filling - no toggle needed
    if (el.showRadialRhombicDodecMatrix?.checked) {
      const frequency = parseInt(el.radialRhombicDodecFreqSlider?.value || "1");
      const spaceFilling = true; // RD always space-fills (no voids possible)

      // Clear existing radial rhombic dodec matrix group
      disposeGroup(radialRhombicDodecMatrixGroup);

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity =
        radialRhombicDodecMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      radialRhombicDodecMatrixGroup.userData.parameters = {
        frequency: frequency,
        spaceFilling: spaceFilling,
        opacity: opacity,
        scale: scale,
      };

      // Generate radial rhombic dodecahedron matrix
      {
        const radialRhombicDodecMatrix =
          RTRadialMatrix.createRadialRhombicDodecMatrix(
            frequency,
            scale,
            spaceFilling,
            effectiveOpacity,
            colorPalette.rhombicDodecahedron, // Use rhombic dodec color
            THREE
          );
        radialRhombicDodecMatrixGroup.add(radialRhombicDodecMatrix);

        // Add vertex nodes if enabled
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          const spacing = scale * 2;
          const positions = RTRadialMatrix.getRhombicDodecPositions(
            frequency,
            spacing,
            spaceFilling
          );
          addRadialMatrixNodes(
            radialRhombicDodecMatrixGroup,
            positions,
            scale,
            colorPalette.rhombicDodecahedron,
            nodeSize,
            "rhombicDodecahedron"
          );
        }
      }
      radialRhombicDodecMatrixGroup.visible = true;
    } else {
      radialRhombicDodecMatrixGroup.visible = false;
    }

    // Radial Tetrahedron Matrix (Phase 3)
    if (el.showRadialTetrahedronMatrix?.checked) {
      const frequency = parseInt(el.radialTetFreqSlider?.value || "1");

      // Clear existing radial tet matrix group
      disposeGroup(radialTetMatrixGroup);

      // Get IVM Mode checkbox value
      const ivmMode = el.radialTetIVMMode?.checked || false;

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity =
        radialTetMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      radialTetMatrixGroup.userData.parameters = {
        frequency: frequency,
        ivmMode: ivmMode,
        opacity: opacity,
        scale: scale,
      };

      // Generate radial tetrahedron matrix
      {
        const radialTetMatrix = RTRadialMatrix.createRadialTetrahedronMatrix(
          frequency,
          scale,
          effectiveOpacity,
          colorPalette.radialTetrahedron,
          THREE,
          ivmMode
        );
        radialTetMatrixGroup.add(radialTetMatrix);

        // Add vertex nodes if enabled
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          // IVM mode uses 4× spacing, standard uses 2× spacing
          const spacing = ivmMode ? scale * 4 : scale * 2;
          const positions = RTRadialMatrix.getTetrahedronPositions(
            frequency,
            spacing,
            ivmMode
          );
          addRadialMatrixNodes(
            radialTetMatrixGroup,
            positions,
            scale,
            colorPalette.radialTetrahedron,
            nodeSize,
            "tetrahedron"
          );
        }
      }
      radialTetMatrixGroup.visible = true;
    } else {
      radialTetMatrixGroup.visible = false;
    }

    // Radial Octahedron Matrix (Phase 3)
    if (el.showRadialOctahedronMatrix?.checked) {
      const frequency = parseInt(el.radialOctFreqSlider?.value || "1");

      // Clear existing radial oct matrix group
      disposeGroup(radialOctMatrixGroup);

      // Get IVM scale checkbox value
      // ivmScaleOnly = true: 2× size with taxicab positioning (for nesting into tet matrix)
      // ivmScale = false: keeps taxicab positioning (not FCC lattice)
      const ivmScaleOnly = el.radialOctIVMScale?.checked || false;

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity =
        radialOctMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      radialOctMatrixGroup.userData.parameters = {
        frequency: frequency,
        ivmScaleOnly: ivmScaleOnly,
        opacity: opacity,
        scale: scale,
      };

      // Generate radial octahedron matrix
      {
        const radialOctMatrix = RTRadialMatrix.createRadialOctahedronMatrix(
          frequency,
          scale,
          effectiveOpacity,
          colorPalette.radialOctahedron,
          THREE,
          false, // ivmScale = false (no FCC lattice)
          ivmScaleOnly // ivmScaleOnly = checkbox value (2× size only)
        );
        radialOctMatrixGroup.add(radialOctMatrix);

        // Add vertex nodes if enabled
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          // IVM mode uses 4× spacing, standard uses 2× spacing
          const spacing = ivmScaleOnly ? scale * 4 : scale * 2;
          // Get positions based on mode
          let positions;
          if (ivmScaleOnly) {
            positions = RTRadialMatrix.getIVMOctahedronPositions(
              frequency,
              spacing
            );
          } else {
            positions = RTRadialMatrix.getOctahedronPositions(
              frequency,
              spacing,
              false
            );
          }
          // For IVM octahedra, use 2× scale for node vertex calculation
          const octScale = ivmScaleOnly ? scale * 2 : scale;
          addRadialMatrixNodes(
            radialOctMatrixGroup,
            positions,
            octScale,
            colorPalette.radialOctahedron,
            nodeSize,
            "octahedron",
            ivmScaleOnly // Apply 45° rotation for IVM mode
          );
        }
      }
      radialOctMatrixGroup.visible = true;
    } else {
      radialOctMatrixGroup.visible = false;
    }

    // Radial Cuboctahedron (VE) Matrix (Phase 3)
    if (el.showRadialCuboctahedronMatrix?.checked) {
      const frequency = parseInt(el.radialVEFreqSlider?.value || "1");

      // Clear existing radial VE matrix group
      disposeGroup(radialVEMatrixGroup);

      // Apply dissolve opacity for smooth fade transitions
      const dissolveOpacity =
        radialVEMatrixGroup.userData.dissolveOpacity ?? 1.0;
      const effectiveOpacity = opacity * dissolveOpacity;

      // Store parameters for instance creation/export
      radialVEMatrixGroup.userData.parameters = {
        frequency: frequency,
        opacity: opacity,
        scale: scale,
      };

      // Generate radial cuboctahedron matrix
      {
        const radialVEMatrix = RTRadialMatrix.createRadialCuboctahedronMatrix(
          frequency,
          scale,
          effectiveOpacity,
          colorPalette.radialCuboctahedron,
          THREE
        );
        radialVEMatrixGroup.add(radialVEMatrix);

        // Add vertex nodes if enabled
        const nodeSize = getNodeSize();
        const showNodes = nodeSize !== "off";

        if (showNodes) {
          const spacing = scale * 2;
          const positions = RTRadialMatrix.getCuboctahedronPositions(
            frequency,
            spacing
          );
          // addRadialMatrixNodes handles √2 scaling internally for cuboctahedron
          addRadialMatrixNodes(
            radialVEMatrixGroup,
            positions,
            scale,
            colorPalette.radialCuboctahedron,
            nodeSize,
            "cuboctahedron"
          );
        }
      }
      radialVEMatrixGroup.visible = true;
    } else {
      radialVEMatrixGroup.visible = false;
    }

    // Scale basis vectors to match current slider values
    // Cartesian basis vectors scale with cube edge length
    const cubeEdge = parseFloat(el.scaleSlider.value);
    if (cartesianBasis) {
      cartesianBasis.scale.set(cubeEdge, cubeEdge, cubeEdge);
    }

    // Quadray basis vectors: Recreate with correct length
    // REQUIREMENT: tetEdge measured in grid intervals, basis = (tetEdge + 1) grid intervals
    // tetEdge=2 → basis reaches 3 grid intervals (3 × 0.612 = 1.837)
    // tetEdge=3 → basis reaches 4 grid intervals (4 × 0.612 = 2.448)
    // (tetEdge already declared at top of function)
    if (quadrayBasis) {
      // Clear existing basis
      disposeGroup(quadrayBasis);

      // Recreate with current tetEdge value
      const gridInterval = RT.PureRadicals.QUADRAY_GRID_INTERVAL; // √6/4 ≈ 0.612
      // tetEdge represents number of grid intervals, so basis = (tetEdge + 1) × gridInterval
      const targetLength = (tetEdge + 1) * gridInterval;
      const headSize = 0.1; // Reduced from 0.15 for better visual balance
      const headTipExtension = headSize * Math.sqrt(3);
      const shaftLength = targetLength - headTipExtension;

      const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];

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
    }

    updateGeometryStats();

    // Auto-refresh projection if user has it enabled (check DOM checkbox as source of truth,
    // since hideProjection() may have been called during the geometry rebuild cycle)
    const projCheckbox = el.enableProjection;
    if (projCheckbox?.checked && window.RTProjections) {
      // Re-find the current visible polyhedron (may have changed during rebuild)
      let projTarget = null;
      scene.traverse(obj => {
        if (!projTarget && obj.visible && obj.userData?.type) {
          if (
            obj.userData.type.startsWith("quadray") ||
            obj.userData.type.startsWith("geodesic") ||
            [
              "tetrahedron",
              "cube",
              "octahedron",
              "icosahedron",
              "dodecahedron",
              "cuboctahedron",
              "rhombicDodecahedron",
            ].includes(obj.userData.type)
          ) {
            projTarget = obj;
          }
        }
      });
      if (projTarget) {
        window.RTProjections.showProjection(projTarget, {
          spreads: window.RTProjections.state.customSpreads,
        });
      } else {
        // No valid target visible - clean up stale projection
        window.RTProjections.hideProjection();
      }
    }

    // End performance timing
    PerformanceClock.endCalculation();
    PerformanceClock.updateDisplay(getUseRTNodeGeometry());
  }

  /**
   * Update geometry statistics display
   */
  function updateGeometryStats() {
    // Suppress MetaLog during stats rebuild — these Polyhedra calls exist
    // only to extract V/E/F counts for the info panel, not to log geometry.
    MetaLog.suppress();
    const stats = el.polyhedraStats;
    let html = "";

    if (el.showPoint?.checked) {
      html += `<div><strong>Point:</strong></div>`;
      html += `<div>V: 1, E: 0, F: 0</div>`;
      html += `<div>Euler: N/A (degenerate)</div>`;
    }

    if (el.showLine?.checked) {
      const lineQ = parseFloat(el.lineQuadrance?.value || "1");
      const lineL = Math.sqrt(lineQ);
      html += `<div style="margin-top: 10px;"><strong>Line:</strong></div>`;
      html += `<div>V: 2, E: 1, F: 0</div>`;
      html += `<div>Euler: N/A (open form, χ=1)</div>`;
      html += `<div>Q: ${lineQ.toFixed(4)}, L: ${lineL.toFixed(4)}</div>`;
    }

    if (el.showPolygon?.checked) {
      const polyQ = parseFloat(el.polygonQuadrance?.value || "1");
      const polySides = parseInt(
        el.polygonSidesInput?.value || el.polygonSides?.value || "3"
      );
      const polyR = Math.sqrt(polyQ);
      // Math.sin justified: arbitrary n-gon spread calculation (see CODE-QUALITY-AUDIT.md)
      const spread = Math.pow(Math.sin(Math.PI / polySides), 2);
      const polyEdgeQ = 4 * polyQ * spread; // RT-pure formula
      const polyEdgeL = Math.sqrt(polyEdgeQ);
      const showFace = el.polygonShowFace?.checked;
      const faceCount = showFace ? 1 : 0;
      html += `<div style="margin-top: 10px;"><strong>Polygon (${polySides}-gon):</strong></div>`;
      html += `<div>V: ${polySides}, E: ${polySides}, F: ${faceCount}</div>`;
      html += `<div>Euler: N/A (open form, χ=1)</div>`;
      html += `<div>Q_R: ${polyQ.toFixed(4)}, R: ${polyR.toFixed(4)}</div>`;
      html += `<div>Q_edge: ${polyEdgeQ.toFixed(4)}, edge: ${polyEdgeL.toFixed(4)}</div>`;
    }

    if (el.showPrism?.checked) {
      const prismBaseQ = parseFloat(el.prismBaseQuadrance?.value || "1");
      const prismHeightQ = parseFloat(el.prismHeightQuadrance?.value || "1");
      const prismSides = parseInt(
        el.prismSidesInput?.value || el.prismSides?.value || "6"
      );
      const prismShowFaces = el.prismShowFaces?.checked !== false;
      const prismR = Math.sqrt(prismBaseQ);
      const prismH = Math.sqrt(prismHeightQ);
      // Math.sin justified: arbitrary n-gon spread calculation
      const prismSpread = Math.pow(Math.sin(Math.PI / prismSides), 2);
      const prismEdgeQ = 4 * prismBaseQ * prismSpread;
      const V = 2 * prismSides;
      const E = 3 * prismSides;
      const F = prismShowFaces ? prismSides + 2 : 0;
      const eulerOK = RT.verifyEuler(V, E, F);
      html += `<div style="margin-top: 10px;"><strong>Prism (${prismSides}-gon):</strong></div>`;
      html += `<div>V: ${V}, E: ${E}, F: ${F}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
      html += `<div>Q_R: ${prismBaseQ.toFixed(4)}, R: ${prismR.toFixed(4)}</div>`;
      html += `<div>Q_H: ${prismHeightQ.toFixed(4)}, H: ${prismH.toFixed(4)}</div>`;
      html += `<div>Q_baseEdge: ${prismEdgeQ.toFixed(4)}</div>`;
    }

    if (el.showCone?.checked) {
      const coneBaseQ = parseFloat(el.coneBaseQuadrance?.value || "1");
      const coneHeightQ = parseFloat(el.coneHeightQuadrance?.value || "1");
      const coneSides = parseInt(el.coneSides?.value || "6");
      const coneShowFaces = el.coneShowFaces?.checked !== false;
      const coneR = Math.sqrt(coneBaseQ);
      const coneH = Math.sqrt(coneHeightQ);
      const coneSlantQ = coneBaseQ + coneHeightQ;
      const V = coneSides + 1;
      const E = 2 * coneSides;
      const F = coneShowFaces ? coneSides + 1 : 0;
      const eulerOK = RT.verifyEuler(V, E, F);
      html += `<div style="margin-top: 10px;"><strong>Cone (${coneSides}-gon):</strong></div>`;
      html += `<div>V: ${V}, E: ${E}, F: ${F}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
      html += `<div>Q_R: ${coneBaseQ.toFixed(4)}, R: ${coneR.toFixed(4)}</div>`;
      html += `<div>Q_H: ${coneHeightQ.toFixed(4)}, H: ${coneH.toFixed(4)}</div>`;
      html += `<div>Q_slant: ${coneSlantQ.toFixed(4)}</div>`;
    }

    // Tetrahelix 1 stats (toroidal)
    if (el.showTetrahelix1?.checked) {
      const tetrahelix1Count = parseInt(
        el.tetrahelix1CountSlider?.value || "10"
      );
      const axisRadio = document.querySelector(
        'input[name="tetrahelix1Axis"]:checked'
      );
      const tetrahelix1Axis = axisRadio ? axisRadio.value : "QW";
      const axisToFace = { QW: "B", QX: "A", QY: "C", QZ: "D" };
      const tetrahelix1StartFace = axisToFace[tetrahelix1Axis] || "B";
      const tetrahelix1Data = Helices.tetrahelix1(1, {
        count: tetrahelix1Count,
        startFace: tetrahelix1StartFace,
      });
      const V = tetrahelix1Data.vertices.length;
      const E = tetrahelix1Data.edges.length;
      const F = tetrahelix1Data.faces.length;
      html += `<div style="margin-top: 10px;"><strong>Tetrahelix 1 (${tetrahelix1Count} tet):</strong></div>`;
      html += `<div>V: ${V}, E: ${E}, F: ${F}</div>`;
      html += `<div>Euler: N/A (open chain)</div>`;
      html += `<div>Chirality: left-handed (fixed)</div>`;
      html += `<div>Axis: ${tetrahelix1Axis}</div>`;
    }

    // Tetrahelix 2 stats (linear with strands) - uses Quadray axis notation
    if (el.showTetrahelix2?.checked) {
      const tetrahelix2Count = parseInt(
        el.tetrahelix2CountSlider?.value || "10"
      );
      const axisRadio = document.querySelector(
        'input[name="tetrahelix2Axis"]:checked'
      );
      const tetrahelix2Axis = axisRadio ? axisRadio.value : "QW";
      // Read direction checkboxes (javelin model)
      const showPlus = el.tetrahelix2DirPlus?.checked ?? true;
      const showMinus = el.tetrahelix2DirMinus?.checked ?? true;
      // 3021 Rule mapping
      const axisToFace = { QW: "B", QX: "A", QY: "C", QZ: "D" };
      const tetrahelix2StartFace = axisToFace[tetrahelix2Axis] || "B";

      const strandsRadio = document.querySelector(
        'input[name="tetrahelix2Strands"]:checked'
      );
      const tetrahelix2Strands = strandsRadio
        ? parseInt(strandsRadio.value)
        : 1;
      const bondModeRadio2 = document.querySelector(
        'input[name="tetrahelix2BondMode"]:checked'
      );
      const tetrahelix2BondMode = bondModeRadio2
        ? bondModeRadio2.value
        : "zipped";
      // Per-strand exit face for stats (UI commented out, defaults 0)
      const getExitFaceStats = qAxis => {
        const radio = document.querySelector(
          `input[name="tetrahelix2Exit${qAxis}"]:checked`
        );
        return radio ? parseInt(radio.value) : 0;
      };
      const tetrahelix2ExitFaces = {
        A: getExitFaceStats("QX"),
        B: getExitFaceStats("QW"),
        C: getExitFaceStats("QY"),
        D: getExitFaceStats("QZ"),
      };
      const tetrahelix2Data = Helices.tetrahelix2(1, {
        count: tetrahelix2Count,
        startFace: tetrahelix2StartFace,
        dirPlus: showPlus,
        dirMinus: showMinus,
        strands: tetrahelix2Strands,
        bondMode: tetrahelix2BondMode,
        exitFaces: tetrahelix2ExitFaces,
      });
      const V2 = tetrahelix2Data.vertices.length;
      const E2 = tetrahelix2Data.edges.length;
      const F2 = tetrahelix2Data.faces.length;
      const strandLabel =
        tetrahelix2Strands === 1 ? "1 strand" : `${tetrahelix2Strands} strands`;
      const modeLabel =
        tetrahelix2Strands > 1 ? `, ${tetrahelix2BondMode}` : "";
      const dirLabel = (showPlus ? "+" : "") + (showMinus ? "-" : "");
      html += `<div style="margin-top: 10px;"><strong>Tetrahelix 2 (${tetrahelix2Count} tet, ${strandLabel}${modeLabel}):</strong></div>`;
      html += `<div>V: ${V2}, E: ${E2}, F: ${F2}</div>`;
      html += `<div>Euler: N/A (open chain)</div>`;
      html += `<div>Axis: ${tetrahelix2Axis} ${dirLabel}</div>`;
    }

    // Tetrahelix 3 stats (octahedral seed)
    if (el.showTetrahelix3?.checked) {
      const tetrahelix3Count = parseInt(
        el.tetrahelix3CountSlider?.value || "10"
      );
      // Read individual strand checkboxes A-H
      const enabledStrands = {
        A: el.tetrahelix3StrandA?.checked || false,
        B: el.tetrahelix3StrandB?.checked || false,
        C: el.tetrahelix3StrandC?.checked || false,
        D: el.tetrahelix3StrandD?.checked || false,
        E: el.tetrahelix3StrandE?.checked || false,
        F: el.tetrahelix3StrandF?.checked || false,
        G: el.tetrahelix3StrandG?.checked || false,
        H: el.tetrahelix3StrandH?.checked || false,
      };
      // Read chirality checkboxes A-H
      const strandChirality = {
        A: el.tetrahelix3ChiralA?.checked !== false,
        B: el.tetrahelix3ChiralB?.checked !== false,
        C: el.tetrahelix3ChiralC?.checked !== false,
        D: el.tetrahelix3ChiralD?.checked !== false,
        E: el.tetrahelix3ChiralE?.checked !== false,
        F: el.tetrahelix3ChiralF?.checked !== false,
        G: el.tetrahelix3ChiralG?.checked !== false,
        H: el.tetrahelix3ChiralH?.checked !== false,
      };
      const tetrahelix3Data = Helices.tetrahelix3(1, {
        count: tetrahelix3Count,
        enabledStrands,
        strandChirality,
      });
      const V3 = tetrahelix3Data.vertices.length;
      const E3 = tetrahelix3Data.edges.length;
      const F3 = tetrahelix3Data.faces.length;
      const activeStrands = tetrahelix3Data.metadata.activeStrands || [];
      const strandLabel3 =
        activeStrands.length === 1
          ? "1 strand"
          : `${activeStrands.length} strands`;
      html += `<div style="margin-top: 10px;"><strong>Tetrahelix 3 (${tetrahelix3Count} tet, ${strandLabel3}):</strong></div>`;
      html += `<div>V: ${V3}, E: ${E3}, F: ${F3}</div>`;
      html += `<div>Euler: N/A (open chain)</div>`;
      html += `<div>Seed: Octahedron (8 faces)</div>`;
      html += `<div>Strands: ${activeStrands.join(", ") || "none"}</div>`;
    }

    if (el.showCube.checked) {
      const cube = Polyhedra.cube(1);
      const eulerOK = RT.verifyEuler(
        cube.vertices.length,
        cube.edges.length,
        cube.faces.length
      );
      html += `<div><strong>Hexahedron (Cube):</strong></div>`;
      html += `<div>Schläfli: {4,3}</div>`;
      html += `<div>V: ${cube.vertices.length}, E: ${cube.edges.length}, F: ${cube.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
      html += `<div>Face Spread: 1 (90° dihedral)</div>`;
    }

    if (el.showTetrahedron.checked) {
      const tetra = Polyhedra.tetrahedron(1);
      const eulerOK = RT.verifyEuler(
        tetra.vertices.length,
        tetra.edges.length,
        tetra.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Tetrahedron:</strong></div>`;
      html += `<div>Schläfli: {3,3}</div>`;
      html += `<div>V: ${tetra.vertices.length}, E: ${tetra.edges.length}, F: ${tetra.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
      html += `<div>Face Spread: 8/9 (≈70.53° dihedral)</div>`;
    }

    if (el.showDualTetrahedron.checked) {
      const tetra = Polyhedra.tetrahedron(1);
      const eulerOK = RT.verifyEuler(
        tetra.vertices.length,
        tetra.edges.length,
        tetra.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Dual Tetrahedron:</strong></div>`;
      html += `<div>Schläfli: {3,3} (self-dual)</div>`;
      html += `<div>V: ${tetra.vertices.length}, E: ${tetra.edges.length}, F: ${tetra.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
      html += `<div>Face Spread: 8/9 (≈70.53° dihedral)</div>`;
    }

    if (el.showOctahedron.checked) {
      const octa = Polyhedra.octahedron(1);
      const eulerOK = RT.verifyEuler(
        octa.vertices.length,
        octa.edges.length,
        octa.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Octahedron:</strong></div>`;
      html += `<div>Schläfli: {3,4}</div>`;
      html += `<div>V: ${octa.vertices.length}, E: ${octa.edges.length}, F: ${octa.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
      html += `<div>Face Spread: 8/9 (≈109.47° dihedral)</div>`;
    }

    if (el.showIcosahedron.checked) {
      const icosa = Polyhedra.icosahedron(1);
      const eulerOK = RT.verifyEuler(
        icosa.vertices.length,
        icosa.edges.length,
        icosa.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Icosahedron:</strong></div>`;
      html += `<div>Schläfli: {3,5}</div>`;
      html += `<div>V: ${icosa.vertices.length}, E: ${icosa.edges.length}, F: ${icosa.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
      html += `<div>Face Spread: 4/9 (≈138.19° dihedral)</div>`;
    }

    if (el.showDualIcosahedron.checked) {
      const icosa = Polyhedra.icosahedron(1);
      const eulerOK = RT.verifyEuler(
        icosa.vertices.length,
        icosa.edges.length,
        icosa.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Dual Icosahedron:</strong></div>`;
      html += `<div>Schläfli: {3,5} (inverted)</div>`;
      html += `<div>V: ${icosa.vertices.length}, E: ${icosa.edges.length}, F: ${icosa.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
      html += `<div>Face Spread: 4/9 (≈138.19° dihedral)</div>`;
    }

    if (el.showDodecahedron.checked) {
      const dodec = Polyhedra.dodecahedron(1);
      const eulerOK = RT.verifyEuler(
        dodec.vertices.length,
        dodec.edges.length,
        dodec.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Dodecahedron:</strong></div>`;
      html += `<div>Schläfli: {5,3}</div>`;
      html += `<div>V: ${dodec.vertices.length}, E: ${dodec.edges.length}, F: ${dodec.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
      html += `<div>Face Spread: 4/5 (≈116.57° dihedral)</div>`;
    }

    if (el.showRhombicDodecahedron.checked) {
      // Use √2 scaling to match rendering (stats use scale=1 for display)
      const rhombicDodec = Polyhedra.rhombicDodecahedron(Math.sqrt(2));
      const eulerOK = RT.verifyEuler(
        rhombicDodec.vertices.length,
        rhombicDodec.edges.length,
        rhombicDodec.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Rhombic Dodecahedron:</strong></div>`;
      html += `<div>Catalan: V(3,4)</div>`;
      html += `<div>V: ${rhombicDodec.vertices.length}, E: ${rhombicDodec.edges.length}, F: ${rhombicDodec.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
    }

    if (el.showCuboctahedron.checked) {
      // Use √2 scaling to match rendering (stats use scale=1 for display)
      const cubocta = Polyhedra.cuboctahedron(Math.sqrt(2));
      const eulerOK = RT.verifyEuler(
        cubocta.vertices.length,
        cubocta.edges.length,
        cubocta.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Cuboctahedron:</strong></div>`;
      html += `<div>Archimedean: (3.4)²</div>`;
      html += `<div>V: ${cubocta.vertices.length}, E: ${cubocta.edges.length}, F: ${cubocta.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
    }

    // Geodesic Tetrahedron
    if (el.showGeodesicTetrahedron.checked) {
      const frequency = parseInt(el.geodesicTetraFrequency.value);
      const projectionRadio = document.querySelector(
        'input[name="geodesicTetraProjection"]:checked'
      );
      const projection = projectionRadio ? projectionRadio.value : "out";
      const geodesicTetra = Polyhedra.geodesicTetrahedron(
        1,
        isNaN(frequency) ? 1 : frequency,
        projection
      );
      const eulerOK = RT.verifyEuler(
        geodesicTetra.vertices.length,
        geodesicTetra.edges.length,
        geodesicTetra.faces.length
      );
      const triangles = countGroupTriangles(geodesicTetrahedronGroup);
      html += `<div style="margin-top: 10px;"><strong>Geodesic Tetrahedron:</strong></div>`;
      html += `<div>Freq: ${isNaN(frequency) ? 1 : frequency}, Proj: ${projection}</div>`;
      html += `<div>V: ${geodesicTetra.vertices.length}, E: ${geodesicTetra.edges.length}, F: ${geodesicTetra.faces.length}</div>`;
      html += `<div>Triangles: ${triangles}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
    }

    // Geodesic Octahedron
    if (el.showGeodesicOctahedron.checked) {
      const frequency = parseInt(el.geodesicOctaFrequency.value);
      const projectionRadio = document.querySelector(
        'input[name="geodesicOctaProjection"]:checked'
      );
      const projection = projectionRadio ? projectionRadio.value : "out";
      const geodesicOcta = Polyhedra.geodesicOctahedron(
        1,
        isNaN(frequency) ? 1 : frequency,
        projection
      );
      const eulerOK = RT.verifyEuler(
        geodesicOcta.vertices.length,
        geodesicOcta.edges.length,
        geodesicOcta.faces.length
      );
      const triangles = countGroupTriangles(geodesicOctahedronGroup);
      html += `<div style="margin-top: 10px;"><strong>Geodesic Octahedron:</strong></div>`;
      html += `<div>Freq: ${isNaN(frequency) ? 1 : frequency}, Proj: ${projection}</div>`;
      html += `<div>V: ${geodesicOcta.vertices.length}, E: ${geodesicOcta.edges.length}, F: ${geodesicOcta.faces.length}</div>`;
      html += `<div>Triangles: ${triangles}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
    }

    // Geodesic Icosahedron
    if (el.showGeodesicIcosahedron.checked) {
      const frequency = parseInt(el.geodesicIcosaFrequency.value);
      const projectionRadio = document.querySelector(
        'input[name="geodesicIcosaProjection"]:checked'
      );
      const projection = projectionRadio ? projectionRadio.value : "out";
      const geodesicIcosa = Polyhedra.geodesicIcosahedron(
        1,
        isNaN(frequency) ? 1 : frequency,
        projection
      );
      const eulerOK = RT.verifyEuler(
        geodesicIcosa.vertices.length,
        geodesicIcosa.edges.length,
        geodesicIcosa.faces.length
      );
      const triangles = countGroupTriangles(geodesicIcosahedronGroup);
      html += `<div style="margin-top: 10px;"><strong>Geodesic Icosahedron:</strong></div>`;
      html += `<div>Freq: ${isNaN(frequency) ? 1 : frequency}, Proj: ${projection}</div>`;
      html += `<div>V: ${geodesicIcosa.vertices.length}, E: ${geodesicIcosa.edges.length}, F: ${geodesicIcosa.faces.length}</div>`;
      html += `<div>Triangles: ${triangles}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
    }

    // Quadray Tetrahedron (4D Native)
    if (el.showQuadrayTetrahedron?.checked) {
      const normalize = el.quadrayTetraNormalize?.checked ?? true;
      const quadrayTet = Polyhedra.quadrayTetrahedron(1, { normalize });
      const eulerOK = RT.verifyEuler(
        quadrayTet.vertices.length,
        quadrayTet.edges.length,
        quadrayTet.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Quadray Tetrahedron:</strong></div>`;
      html += `<div>WXYZ: {1,0,0,0} permutations</div>`;
      html += `<div>Normalized: ${normalize ? "Yes" : "No"}</div>`;
      html += `<div>V: ${quadrayTet.vertices.length}, E: ${quadrayTet.edges.length}, F: ${quadrayTet.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
    }

    // Quadray Cuboctahedron (Vector Equilibrium)
    if (el.showQuadrayCuboctahedron?.checked) {
      const normalize = el.quadrayCuboctaNormalize?.checked ?? true;
      const quadrayCubocta = Polyhedra.quadrayCuboctahedron(1, { normalize });
      const eulerOK = RT.verifyEuler(
        quadrayCubocta.vertices.length,
        quadrayCubocta.edges.length,
        quadrayCubocta.faces.length
      );
      const triangles = quadrayCubocta.faces.filter(f => f.length === 3).length;
      const squares = quadrayCubocta.faces.filter(f => f.length === 4).length;
      html += `<div style="margin-top: 10px;"><strong>Quadray Cuboctahedron (VE):</strong></div>`;
      html += `<div>WXYZ: {2,1,1,0} permutations</div>`;
      html += `<div>Normalized: ${normalize ? "Yes" : "No"}</div>`;
      html += `<div>V: ${quadrayCubocta.vertices.length}, E: ${quadrayCubocta.edges.length}, F: ${quadrayCubocta.faces.length}</div>`;
      html += `<div>Faces: ${triangles} △ + ${squares} □</div>`;
      html += `<div>IVM: 12-around-1 sphere packing</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
    }

    // Quadray Octahedron
    if (el.showQuadrayOctahedron?.checked) {
      const normalize = el.quadrayOctaNormalize?.checked ?? true;
      const quadrayOcta = Polyhedra.quadrayOctahedron(1, { normalize });
      const eulerOK = RT.verifyEuler(
        quadrayOcta.vertices.length,
        quadrayOcta.edges.length,
        quadrayOcta.faces.length
      );
      html += `<div style="margin-top: 10px;"><strong>Quadray Octahedron:</strong></div>`;
      html += `<div>WXYZ: {1,1,0,0} permutations</div>`;
      html += `<div>Normalized: ${normalize ? "Yes" : "No"}</div>`;
      html += `<div>V: ${quadrayOcta.vertices.length}, E: ${quadrayOcta.edges.length}, F: ${quadrayOcta.faces.length}</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
    }

    // Quadray Truncated Tetrahedron (7-gon projection source)
    if (el.showQuadrayTruncatedTet?.checked) {
      const normalize = el.quadrayTruncTetNormalize?.checked ?? true;
      const quadrayTruncTet = Polyhedra.quadrayTruncatedTetrahedron(1, {
        normalize,
      });
      const eulerOK = RT.verifyEuler(
        quadrayTruncTet.vertices.length,
        quadrayTruncTet.edges.length,
        quadrayTruncTet.faces.length
      );
      const triangles = quadrayTruncTet.faces.filter(
        f => f.length === 3
      ).length;
      const hexagons = quadrayTruncTet.faces.filter(f => f.length === 6).length;
      html += `<div style="margin-top: 10px;"><strong>Quadray Truncated Tetrahedron:</strong></div>`;
      html += `<div>WXYZ: {2,1,0,0} permutations (ALL rational!)</div>`;
      html += `<div>Normalized: ${normalize ? "Yes" : "No"}</div>`;
      html += `<div>V: ${quadrayTruncTet.vertices.length}, E: ${quadrayTruncTet.edges.length}, F: ${quadrayTruncTet.faces.length}</div>`;
      html += `<div>Faces: ${triangles} △ + ${hexagons} ⬡</div>`;
      html += `<div>Prime: 7-gon projection at s=(0.11,0,0.5)</div>`;
      html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
    }

    stats.innerHTML = html || "Select a polyhedron to see stats";
    MetaLog.unsuppress();
  }

  /**
   * Animation loop with FPS tracking
   */
  function animate() {
    requestAnimationFrame(animate);

    // Quaternion orbit damping — apply residual velocity after pointer release
    if (
      !_qOrbitActive &&
      (Math.abs(_qOrbitVelX) > 0.0001 || Math.abs(_qOrbitVelY) > 0.0001)
    ) {
      _applyOrbitRotation(_qOrbitVelX, _qOrbitVelY);
      _qOrbitVelX *= 1 - controls.dampingFactor;
      _qOrbitVelY *= 1 - controls.dampingFactor;
    }

    controls.update(); // Required for zoom/pan damping
    renderer.render(scene, camera);

    // Update FPS tracking and performance display
    PerformanceClock.updateFPS();

    // Update display every 10 frames (reduce overhead)
    if (Math.floor(performance.now() / 100) % 10 === 0) {
      PerformanceClock.updateDisplay(getUseRTNodeGeometry());
    }
  }

  /**
   * Handle window resize
   */
  function onWindowResize() {
    const container = document.getElementById("canvas-container");
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    if (isOrthographic && orthographicCamera) {
      // Update ortho frustum bounds preserving current vertical size
      const frustumHalfHeight =
        (orthographicCamera.top - orthographicCamera.bottom) / 2;
      orthographicCamera.left = -frustumHalfHeight * aspect;
      orthographicCamera.right = frustumHalfHeight * aspect;
      orthographicCamera.updateProjectionMatrix();
    } else {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    renderer.setSize(width, height);
  }

  // Node configuration functions - delegated to rt-nodes.js
  function setNodeGeometryType(useRT) {
    Nodes.setNodeGeometryType(useRT);
  }

  function setGeodesicFrequency(frequency) {
    Nodes.setGeodesicFrequency(frequency);
  }

  function setNodeOpacity(opacity) {
    Nodes.setNodeOpacity(opacity);
  }

  function clearNodeCache() {
    Nodes.clearNodeCache();
  }

  /**
   * Set Cartesian basis visibility
   * @param {boolean} visible - true to show, false to hide
   */
  function setCartesianBasisVisible(visible) {
    if (cartesianBasis) {
      cartesianBasis.visible = visible;
    }
  }

  /**
   * Set Quadray basis visibility
   * @param {boolean} visible - true to show, false to hide
   */
  function setQuadrayBasisVisible(visible) {
    if (quadrayBasis) {
      quadrayBasis.visible = visible;
    }
  }

  /**
   * Set Cartesian grid group visibility (hides/shows entire group including polar circles)
   * @param {boolean} visible - true to show, false to hide
   */
  function setCartesianGridVisible(visible) {
    if (cartesianGrid) {
      cartesianGrid.visible = visible;
    }
  }

  /**
   * Set Quadray/IVM grid group visibility (hides/shows entire group including polar face planes)
   * @param {boolean} visible - true to show, false to hide
   */
  function setQuadrayGridVisible(visible) {
    if (ivmPlanes) {
      ivmPlanes.visible = visible;
    }
  }

  // Variables for camera switching
  let orthographicCamera = null;
  let originalPerspectiveCamera = null;
  let isOrthographic = false;

  /**
   * Set camera to preset view
   * @param {string} view - View name (top, bottom, left, right, front, back, axo, perspective)
   */
  function setCameraPreset(view) {
    const distance = 10; // Standard distance from origin

    // Hide prime polygon overlay unless switching to a prime projection view
    const primeProjectionViews = [
      "pentagonProjection",
      "heptagonProjectionTet",
      "hendecagonProjection",
      "tridecagonProjection",
    ];
    if (!primeProjectionViews.includes(view)) {
      RTPrimeCuts.showPrimePolygon(null, scene, camera);
    }

    // Z-up coordinate system (CAD/BIM standard)
    // Z = vertical, X-Y = horizontal ground plane
    // Viewing convention: Standing on ground (X-Y plane), Z is up
    switch (view) {
      case "zdown":
        // Z-Down view: Looking DOWN from above (camera on +Z looking toward -Z)
        camera.position.set(0, 0, distance);
        camera.up.set(0, 1, 0); // Y axis points "north" in top view
        break;

      case "zup":
        // Z-Up view: Looking UP from below (camera on -Z looking toward +Z)
        camera.position.set(0, 0, -distance);
        camera.up.set(0, -1, 0); // Flip Y to keep orientation consistent
        break;

      case "x":
        // X view: Looking down the X axis (camera on +X looking toward -X)
        // See the YZ plane
        camera.position.set(distance, 0, 0);
        camera.up.set(0, 0, 1); // Z points up
        break;

      case "y":
        // Y view: Looking down the Y axis (camera on +Y looking toward -Y)
        // See the XZ plane
        camera.position.set(0, distance, 0);
        camera.up.set(0, 0, 1); // Z points up
        break;

      case "axo": {
        // Axonometric/Isometric view (equal angles to X, Y, Z)
        // Position: (1, 1, 1) direction scaled to distance
        const axisoDistance = distance / Math.sqrt(3);
        camera.position.set(
          axisoDistance * Math.sqrt(3),
          axisoDistance * Math.sqrt(3),
          axisoDistance * Math.sqrt(3)
        );
        camera.up.set(0, 0, 1); // Z points up
        break;
      }

      // QWXYZ Tetrahedral Basis Views (Quadray coordinate system)
      // Correct color mapping: QW=Yellow(3), QX=Red(0), QY=Blue(2), QZ=Green(1)
      case "quadqw":
      case "quadqx":
      case "quadqy":
      case "quadqz": {
        // Initialize Quadray basis vectors if not already done
        if (!Quadray.basisVectors) {
          Quadray.init(THREE);
        }

        // Use centralized axis mapping from Quadray module
        // View names are "quadqw", "quadqx", etc. - strip "quad" prefix to get axis key
        const axisKey = view.replace("quad", ""); // "quadqw" -> "qw"
        const axisIndex = Quadray.AXIS_INDEX[axisKey];
        const basisVector = Quadray.basisVectors[axisIndex];

        // Camera positioned at grid extent along the basis vector
        // Using distance parameter (typically 10) as the extent
        const cameraPosition = basisVector.clone().multiplyScalar(distance);
        camera.position.copy(cameraPosition);

        // Calculate an appropriate "up" vector perpendicular to the viewing axis
        // Use Z-up (0,0,1) as default, but adjust if looking along Z
        let upVector = new THREE.Vector3(0, 0, 1);

        // If viewing axis is nearly aligned with Z, use Y as up instead
        if (Math.abs(basisVector.dot(new THREE.Vector3(0, 0, 1))) > 0.9) {
          upVector = new THREE.Vector3(0, 1, 0);
        }

        camera.up.copy(upVector);

        // Extract axis name for logging (remove 'quad' prefix)
        const axisName = view.slice(4).toUpperCase();
        console.log(
          `QWXYZ View ${axisName}: Camera at tetrahedral basis vector`,
          basisVector
        );

        break;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PRIME PROJECTION VIEWS - Verified by Project-Streamline (2026-02-07)
      // Uses CAMERA_PRESETS configuration for extensibility
      // ═══════════════════════════════════════════════════════════════════════

      case "pentagonProjection":
      case "heptagonProjectionTet":
      case "hendecagonProjection":
      case "tridecagonProjection": {
        const preset = CAMERA_PRESETS[view];
        if (!preset) {
          console.warn(`Unknown projection preset: ${view}`);
          break;
        }

        // Convert spreads to Euler angles: θ = arcsin(sqrt(s))
        const [s1, s2, s3] = preset.spreads;
        const theta1 = Math.asin(Math.sqrt(s1)); // Z rotation
        const theta2 = Math.asin(Math.sqrt(s2)); // Y rotation
        const theta3 = Math.asin(Math.sqrt(s3)); // X rotation

        // Build rotation matrix from ZYX Euler angles
        const euler = new THREE.Euler(theta3, theta2, theta1, "ZYX");
        const viewDir = new THREE.Vector3(0, 0, 1).applyEuler(euler);
        camera.position.copy(viewDir.multiplyScalar(distance));
        camera.up.set(0, 0, 1);

        // Determine polygon sides from preset name
        const polygonSidesMap = {
          pentagonProjection: 5,
          heptagonProjectionTet: 7,
          hendecagonProjection: 11,
          tridecagonProjection: 13,
        };
        const polygonSides = polygonSidesMap[view] || 5;

        // Show prime polygon overlay
        // This demonstrates that hull vertices map to regular polygon at unit radius
        RTPrimeCuts.showPrimePolygon(polygonSides, scene, camera, 3.5);

        console.log(`📐 ${preset.name}: spreads=(${s1}, ${s2}, ${s3})`);
        console.log(`   ${preset.description}`);
        if (preset.recommendedForm) {
          console.log(`   Best viewed with: ${preset.recommendedForm}`);
        }
        if (preset.note) {
          console.log(`   ★ ${preset.note}`);
        }
        break;
      }

      case "perspective":
        // TRUE PERSPECTIVE view - return to initial app state
        // CRITICAL: Switch to perspective camera FIRST, then set position
        if (isOrthographic) {
          switchCameraType(false); // Switch to perspective internally
          // Also update the checkbox in the UI
          const orthoCheckbox = el.orthoPerspective;
          if (orthoCheckbox) {
            orthoCheckbox.checked = false;
          }
        }
        // Now set the perspective camera to initial position
        camera.position.set(5, -5, 5);
        camera.up.set(0, 0, 1); // Z points up
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
        console.log(
          `✅ Camera preset: perspective (TRUE perspective mode restored)`
        );
        return; // Skip the common camera setup below
    }

    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();

    // Automatic cutplane axis mapping (Phase 2 WXYZ integration)
    // Map camera view to appropriate cutplane axis
    const cartesianAxisMap = {
      top: "z",
      bottom: "z",
      front: "y",
      back: "y",
      left: "x",
      right: "x",
      axo: "z", // Default to Z for axonometric
    };

    const tetrahedralAxisMap = {
      quadqw: "qw",
      quadqx: "qx",
      quadqy: "qy",
      quadqz: "qz",
    };

    // Set cutplane axis based on view
    if (tetrahedralAxisMap[view]) {
      // QWXYZ Tetrahedral views
      RTPapercut.setCutplaneAxis(
        "tetrahedral",
        tetrahedralAxisMap[view],
        scene
      );
    } else if (cartesianAxisMap[view]) {
      // XYZ Cartesian views
      RTPapercut.setCutplaneAxis("cartesian", cartesianAxisMap[view], scene);
    }

    console.log(
      `✅ Camera preset: ${view} (${isOrthographic ? "Orthographic" : "Perspective"})`
    );
  }

  /**
   * Switch between Perspective and Orthographic camera
   * @param {boolean} toOrthographic - true for orthographic, false for perspective
   */
  function switchCameraType(toOrthographic) {
    // Store the original perspective camera on first call
    if (!originalPerspectiveCamera && !isOrthographic) {
      originalPerspectiveCamera = camera;
    }

    const container = document.getElementById("canvas-container");
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / height;

    if (toOrthographic && !isOrthographic) {
      // Create orthographic camera matching current perspective view
      const distance = camera.position.distanceTo(controls.target);
      const frustumSize = distance * Math.tan((camera.fov * Math.PI) / 360) * 2;

      orthographicCamera = new THREE.OrthographicCamera(
        (frustumSize * aspect) / -2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        frustumSize / -2,
        -10000,
        10000
      );

      // Copy position and orientation from perspective camera
      orthographicCamera.position.copy(camera.position);
      orthographicCamera.rotation.copy(camera.rotation);
      orthographicCamera.up.copy(camera.up);

      // Switch to orthographic
      camera = orthographicCamera;
      controls.object = orthographicCamera;
      isOrthographic = true;
    } else if (!toOrthographic && isOrthographic) {
      // Switch back to perspective - use ORIGINAL perspective camera
      if (!originalPerspectiveCamera) {
        console.error("❌ Original perspective camera not found!");
        return;
      }

      // Copy current position/rotation back to perspective camera
      originalPerspectiveCamera.position.copy(camera.position);
      originalPerspectiveCamera.rotation.copy(camera.rotation);
      originalPerspectiveCamera.up.copy(camera.up);

      // Switch to perspective
      camera = originalPerspectiveCamera;
      controls.object = originalPerspectiveCamera;
      isOrthographic = false;
    }

    controls.update();
  }

  /**
   * Reset camera target to origin
   * Re-centers view on origin while preserving current camera position and projection mode
   */
  function resetCameraTarget() {
    // Reset target to origin (re-centers the orbit pivot point)
    controls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    controls.update();
    console.log("✅ Camera target reset to origin");
  }

  /**
   * Get all form groups for selection system
   * @returns {Object} Object containing all form group references
   */
  function getAllFormGroups() {
    return {
      pointGroup,
      lineGroup,
      polygonGroup,
      prismGroup,
      coneGroup,
      cubeGroup,
      tetrahedronGroup,
      dualTetrahedronGroup,
      octahedronGroup,
      icosahedronGroup,
      dodecahedronGroup,
      dualIcosahedronGroup,
      cuboctahedronGroup,
      rhombicDodecahedronGroup,
      geodesicIcosahedronGroup,
      geodesicTetrahedronGroup,
      geodesicOctahedronGroup,
      geodesicDualTetrahedronGroup,
      geodesicDualIcosahedronGroup,
      cubeMatrixGroup,
      tetMatrixGroup,
      octaMatrixGroup,
      cuboctaMatrixGroup,
      rhombicDodecMatrixGroup,
      radialCubeMatrixGroup,
      radialRhombicDodecMatrixGroup,
      radialTetMatrixGroup,
      radialOctMatrixGroup,
      radialVEMatrixGroup,
      quadrayTetrahedronGroup,
      quadrayTetraDeformedGroup,
      quadrayCuboctahedronGroup,
      quadrayOctahedronGroup,
      quadrayTruncatedTetGroup,
      quadrayStellaOctangulaGroup,
      tetrahelix1Group,
      tetrahelix2Group,
      tetrahelix3Group,
      penroseTilingGroup,
    };
  }

  /**
   * Rebuild Quadray grids with new tessellation value - delegated to rt-grids.js
   */
  function rebuildQuadrayGrids(
    tessellations,
    visibilityState = {},
    gridMode = "uniform"
  ) {
    const result = Grids.rebuildQuadrayGrids(
      scene,
      ivmPlanes,
      tessellations,
      visibilityState,
      gridMode
    );

    // Store references for later use (dynamic keys: IVM or face planes)
    ivmPlanes = result.ivmPlanes;
    for (const key of Object.keys(result)) {
      if (key !== "ivmPlanes") window[key] = result[key];
    }
  }

  /**
   * Rebuild Cartesian grids with new tessellation value - delegated to rt-grids.js
   */
  function rebuildCartesianGrids(
    divisions,
    visibilityState = {},
    gridMode = "uniform"
  ) {
    const result = Grids.rebuildCartesianGrids(
      scene,
      cartesianGrid,
      cartesianBasis,
      divisions,
      visibilityState,
      gridMode
    );

    // Store references for later use
    cartesianGrid = result.cartesianGrid;
    cartesianBasis = result.cartesianBasis;
    window.gridXY = result.gridXY;
    window.gridXZ = result.gridXZ;
    window.gridYZ = result.gridYZ;
  }

  /**
   * Get current color for a polyhedron type
   * @param {string} polyhedronType - Polyhedron type key (e.g., 'cube', 'tetrahedron')
   * @returns {number} Current hex color
   */
  function getPolyhedronColor(polyhedronType) {
    return colorPalette[polyhedronType] || 0xffffff;
  }

  /**
   * Update polyhedron color and re-render
   * @param {string} polyhedronType - Polyhedron type key (e.g., 'cube', 'tetrahedron')
   * @param {number} color - Hex color (e.g., 0xFF9300)
   */
  function updatePolyhedronColor(polyhedronType, color) {
    if (Object.prototype.hasOwnProperty.call(colorPalette, polyhedronType)) {
      colorPalette[polyhedronType] = color;
      updateGeometry(); // Re-render with new color
    }
  }

  /**
   * Get all current colors as exportable object
   * @returns {Object} Color mapping
   */
  function exportColorPalette() {
    return { ...colorPalette };
  }

  /**
   * Set canvas background color
   * @param {number} color - Hex color (0xRRGGBB format)
   */
  function setCanvasBackground(color) {
    if (scene) {
      scene.background = new THREE.Color(color);
    }
  }

  /**
   * Get current canvas background color
   * @returns {number} Hex color value
   */
  function getCanvasBackground() {
    if (scene && scene.background) {
      return scene.background.getHex();
    }
    return 0x1a1a1a; // Default
  }

  /**
   * Create a polyhedron group by type name (Factory for instance restoration)
   * @param {string} type - Polyhedron type (e.g., 'cube', 'tetrahedron', 'geodesicIcosahedron')
   * @param {Object} options - Creation options
   * @param {number} options.scale - Scale/halfSize for the polyhedron
   * @param {number} options.opacity - Opacity for rendering (default: current slider value)
   * @param {number} options.frequency - Geodesic frequency (for geodesic types)
   * @param {string} options.projection - Geodesic projection mode ('off'|'in'|'mid'|'out')
   * @param {number} options.matrixSize - Matrix size (for matrix types)
   * @param {boolean} options.rotate45 - Rotate matrix 45° (for matrix types)
   * @param {boolean} options.normalize - Quadray zero-sum normalization (default: true)
   * @param {number} options.zStretch - Quadray deformed Z stretch factor (default: 2)
   * @param {Array} options.wxyz - Native WXYZ coordinates to restore (4x4 array)
   * @returns {THREE.Group|null} New polyhedron group or null if type unknown
   */
  function createPolyhedronByType(type, options = {}) {
    // Default options
    const tetEdge = parseFloat(el.tetScaleSlider?.value || "1");
    const defaultScale = tetEdge / (2 * Math.sqrt(2));
    const scale = options.scale ?? defaultScale;
    const opacity =
      options.opacity ?? parseFloat(el.opacitySlider?.value || "0.25");
    const frequency = options.frequency ?? 1;
    const projection = options.projection ?? "out";
    // Note: Matrix types are handled by createPolyhedronByTypeAsync()

    // Quadray-specific options
    const normalize = options.normalize ?? true;
    const zStretch = options.zStretch ?? 2;
    const wxyz = options.wxyz ?? null; // Native WXYZ coordinates

    // Create new group
    const group = new THREE.Group();
    group.userData.type = type;

    // Get color for this type
    const color = colorPalette[type] || 0xffffff;

    let geometry;

    switch (type) {
      // Primitives
      case "point":
        geometry = Polyhedra.point(scale);
        renderPolyhedron(group, geometry, color, opacity);
        group.userData.allowedTools = ["move"]; // Point only supports Move
        break;

      case "line": {
        // Line uses quadrance from options.quadrance or scale as quadrance
        const lineQuadrance = options.quadrance ?? scale;
        const lineWeight = options.lineWeight ?? 2;
        geometry = Polyhedra.line(lineQuadrance);
        // Set type and parameters BEFORE renderPolyhedron so Line2 path is triggered
        group.userData.type = "line";
        group.userData.parameters = {
          quadrance: lineQuadrance,
          length: Math.sqrt(lineQuadrance),
          lineWeight: lineWeight,
        };
        renderPolyhedron(group, geometry, color, opacity, {
          lineWidth: lineWeight,
        });
        break;
      }

      case "polygon": {
        // Polygon uses circumradius quadrance from options.quadrance or scale
        const polyQuadrance = options.quadrance ?? scale;
        const polySides = options.sides ?? 3;
        const polyEdgeWeight = options.edgeWeight ?? 2;
        const polyShowFace = options.showFace !== false;
        geometry = Polyhedra.polygon(polyQuadrance, {
          sides: polySides,
          showFace: polyShowFace,
        });
        // Set type and parameters BEFORE renderPolyhedron
        group.userData.type = "polygon";
        group.userData.parameters = {
          quadrance: polyQuadrance,
          circumradius: Math.sqrt(polyQuadrance),
          sides: polySides,
          edgeQuadrance: geometry.metadata.edgeQuadrance,
          edgeLength: geometry.metadata.edgeLength,
          edgeWeight: polyEdgeWeight,
          showFace: polyShowFace,
          rtPure: geometry.metadata.rtPure,
        };
        renderPolyhedron(group, geometry, color, opacity, {
          lineWidth: polyEdgeWeight,
        });
        break;
      }

      case "prism": {
        // Prism uses base circumradius quadrance and height quadrance
        const prismBaseQ = options.baseQuadrance ?? scale;
        const prismHeightQ = options.heightQuadrance ?? 1;
        const prismSides = options.sides ?? 6;
        const prismShowFaces = options.showFaces !== false;
        geometry = Primitives.prism(prismBaseQ, prismHeightQ, {
          sides: prismSides,
          showFaces: prismShowFaces,
        });
        group.userData.type = "prism";
        group.userData.parameters = {
          baseQuadrance: prismBaseQ,
          heightQuadrance: prismHeightQ,
          sides: prismSides,
          height: geometry.metadata.height,
          baseCircumradius: geometry.metadata.baseCircumradius,
          baseEdgeQuadrance: geometry.metadata.baseEdgeQuadrance,
          showFaces: prismShowFaces,
          rtPure: geometry.metadata.rtPure,
        };
        renderPolyhedron(group, geometry, color, opacity);
        break;
      }

      case "cone": {
        // Cone uses base circumradius quadrance and height quadrance
        const coneBaseQ = options.baseQuadrance ?? scale;
        const coneHeightQ = options.heightQuadrance ?? 1;
        const coneSides = options.sides ?? 6;
        const coneShowFaces = options.showFaces !== false;
        geometry = Primitives.cone(coneBaseQ, coneHeightQ, {
          sides: coneSides,
          showFaces: coneShowFaces,
        });
        group.userData.type = "cone";
        group.userData.parameters = {
          baseQuadrance: coneBaseQ,
          heightQuadrance: coneHeightQ,
          sides: coneSides,
          height: geometry.metadata.height,
          slantQuadrance: geometry.metadata.slantQuadrance,
          baseCircumradius: geometry.metadata.baseCircumradius,
          showFaces: coneShowFaces,
          rtPure: geometry.metadata.rtPure,
        };
        renderPolyhedron(group, geometry, color, opacity);
        break;
      }

      case "tetrahelix1": {
        // Tetrahelix 1: Toroidal (left-handed only)
        const tetrahelix1Count = options.count ?? 10;
        const tetrahelix1StartFace = options.startFace ?? "A";
        geometry = Helices.tetrahelix1(scale, {
          count: tetrahelix1Count,
          startFace: tetrahelix1StartFace,
        });
        group.userData.type = "tetrahelix1";
        group.userData.parameters = {
          count: tetrahelix1Count,
          startFace: tetrahelix1StartFace,
          tetrahedra: geometry.metadata.tetrahedra,
          expectedQ: geometry.metadata.expectedQ,
        };
        renderPolyhedron(group, geometry, color, opacity);
        break;
      }

      case "tetrahelix2": {
        // Tetrahelix 2: Linear (tetrahedral seed) - Javelin model
        const tetrahelix2Count = options.count ?? 10;
        const tetrahelix2StartFace = options.startFace ?? "A";
        const tetrahelix2DirPlus = options.dirPlus ?? true;
        const tetrahelix2DirMinus = options.dirMinus ?? true;
        const tetrahelix2Strands = options.strands ?? 1;
        const tetrahelix2BondMode = options.bondMode ?? "zipped";
        const tetrahelix2ExitFaces = options.exitFaces ?? {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
        };
        geometry = Helices.tetrahelix2(scale, {
          count: tetrahelix2Count,
          startFace: tetrahelix2StartFace,
          dirPlus: tetrahelix2DirPlus,
          dirMinus: tetrahelix2DirMinus,
          strands: tetrahelix2Strands,
          bondMode: tetrahelix2BondMode,
          exitFaces: tetrahelix2ExitFaces,
        });
        group.userData.type = "tetrahelix2";
        group.userData.parameters = {
          count: tetrahelix2Count,
          startFace: tetrahelix2StartFace,
          dirPlus: tetrahelix2DirPlus,
          dirMinus: tetrahelix2DirMinus,
          strands: tetrahelix2Strands,
          bondMode: tetrahelix2BondMode,
          exitFaces: tetrahelix2ExitFaces,
          tetrahedra: geometry.metadata.tetrahedra,
          expectedQ: geometry.metadata.expectedQ,
        };
        renderPolyhedron(group, geometry, color, opacity);
        break;
      }

      case "tetrahelix3": {
        // Tetrahelix 3: Linear (octahedral seed)
        const tetrahelix3Count = options.count ?? 10;
        const enabledStrands = options.enabledStrands ?? {
          A: true,
          B: false,
          C: false,
          D: false,
          E: false,
          F: false,
          G: false,
          H: false,
        };
        const strandChirality = options.strandChirality ?? {
          A: true,
          B: true,
          C: true,
          D: true,
          E: true,
          F: true,
          G: true,
          H: true,
        };
        geometry = Helices.tetrahelix3(scale, {
          count: tetrahelix3Count,
          enabledStrands,
          strandChirality,
        });
        group.userData.type = "tetrahelix3";
        group.userData.parameters = {
          count: tetrahelix3Count,
          enabledStrands,
          strandChirality,
          tetrahedra: geometry.metadata.tetrahedra,
          expectedQ: geometry.metadata.expectedQ,
        };
        renderPolyhedron(group, geometry, color, opacity);
        break;
      }

      case "penroseTiling": {
        // Penrose Tiling: Aperiodic tiling with golden ratio
        const penroseTileType = options.tileType ?? "thick";
        const penroseQuadrance = options.quadrance ?? scale;
        const penroseEdgeWeight = options.edgeWeight ?? 2;
        const penroseShowFace = options.showFace !== false;

        // Select tile generator based on type
        let tileColor;
        switch (penroseTileType) {
          case "thin":
            geometry = PenroseTiles.thinRhombus(penroseQuadrance, {
              showFace: penroseShowFace,
            });
            tileColor = colorPalette.penroseThin;
            break;
          case "kite":
            geometry = PenroseTiles.kite(penroseQuadrance, {
              showFace: penroseShowFace,
            });
            tileColor = colorPalette.penroseThick;
            break;
          case "dart":
            geometry = PenroseTiles.dart(penroseQuadrance, {
              showFace: penroseShowFace,
            });
            tileColor = colorPalette.penroseThin;
            break;
          case "thick":
          default:
            geometry = PenroseTiles.thickRhombus(penroseQuadrance, {
              showFace: penroseShowFace,
            });
            tileColor = colorPalette.penroseThick;
            break;
        }

        group.userData.type = "penroseTiling";
        group.userData.parameters = {
          tileType: penroseTileType,
          quadrance: penroseQuadrance,
          edgeWeight: penroseEdgeWeight,
          showFace: penroseShowFace,
          ...geometry.metadata,
        };
        renderPolyhedron(group, geometry, tileColor, opacity, {
          lineWidth: penroseEdgeWeight,
        });
        break;
      }

      // Regular polyhedra
      case "cube":
        geometry = Polyhedra.cube(scale);
        renderPolyhedron(group, geometry, color, opacity);
        break;

      case "tetrahedron":
        geometry = Polyhedra.tetrahedron(scale);
        renderPolyhedron(group, geometry, color, opacity);
        break;

      case "dualTetrahedron":
        geometry = Polyhedra.dualTetrahedron(scale);
        renderPolyhedron(group, geometry, color, opacity);
        break;

      case "octahedron":
        geometry = Polyhedra.octahedron(scale);
        renderPolyhedron(group, geometry, color, opacity);
        break;

      case "icosahedron":
        geometry = Polyhedra.icosahedron(scale);
        renderPolyhedron(group, geometry, color, opacity);
        break;

      case "dodecahedron":
        geometry = Polyhedra.dodecahedron(scale);
        renderPolyhedron(group, geometry, color, opacity);
        break;

      case "dualIcosahedron":
        geometry = Polyhedra.dualIcosahedron(scale);
        renderPolyhedron(group, geometry, color, opacity);
        break;

      case "cuboctahedron":
        geometry = Polyhedra.cuboctahedron(scale);
        renderPolyhedron(group, geometry, color, opacity);
        break;

      case "rhombicDodecahedron":
        geometry = Polyhedra.rhombicDodecahedron(scale);
        renderPolyhedron(group, geometry, color, opacity);
        break;

      // Geodesic polyhedra
      case "geodesicIcosahedron":
        geometry = Polyhedra.geodesicIcosahedron(scale, frequency, projection);
        renderPolyhedron(group, geometry, color, opacity);
        // Store parameters for re-export
        group.userData.parameters = {
          frequency: frequency,
          projection: projection,
        };
        break;

      case "geodesicTetrahedron":
        geometry = Polyhedra.geodesicTetrahedron(scale, frequency, projection);
        renderPolyhedron(group, geometry, color, opacity);
        // Store parameters for re-export
        group.userData.parameters = {
          frequency: frequency,
          projection: projection,
        };
        break;

      case "geodesicOctahedron":
        geometry = Polyhedra.geodesicOctahedron(scale, frequency, projection);
        renderPolyhedron(group, geometry, color, opacity);
        // Store parameters for re-export
        group.userData.parameters = {
          frequency: frequency,
          projection: projection,
        };
        break;

      case "geodesicDualTetrahedron":
        geometry = Polyhedra.geodesicDualTetrahedron(
          scale,
          frequency,
          projection
        );
        renderPolyhedron(group, geometry, color, opacity);
        // Store parameters for re-export
        group.userData.parameters = {
          frequency: frequency,
          projection: projection,
        };
        break;

      case "geodesicDualIcosahedron":
        geometry = Polyhedra.geodesicDualIcosahedron(
          scale,
          frequency,
          projection
        );
        renderPolyhedron(group, geometry, color, opacity);
        // Store parameters for re-export
        group.userData.parameters = {
          frequency: frequency,
          projection: projection,
        };
        break;

      // Quadray demonstrator polyhedra (with native WXYZ coordinate preservation)
      case "quadrayTetrahedron":
        geometry = Polyhedra.quadrayTetrahedron(scale, {
          normalize: normalize,
          wxyz: wxyz, // Restore exact WXYZ coords if provided
        });
        renderPolyhedron(group, geometry, color, opacity);
        // Store parameters for re-export
        group.userData.parameters = {
          normalize: normalize,
          wxyz: geometry.wxyz_normalized,
        };
        break;

      case "quadrayTetraDeformed":
        geometry = Polyhedra.quadrayTetrahedronDeformed(scale, zStretch);
        renderPolyhedron(group, geometry, color, opacity);
        // Store parameters for re-export
        group.userData.parameters = {
          zStretch: zStretch,
          wxyz: geometry.wxyz_normalized,
        };
        break;

      case "quadrayDualTetrahedron":
        geometry = Polyhedra.quadrayDualTetrahedron(scale, { normalize });
        renderPolyhedron(group, geometry, color, opacity);
        // Store parameters for re-export
        group.userData.parameters = {
          normalize: normalize,
          wxyz: geometry.wxyz_normalized,
        };
        break;

      case "quadrayCuboctahedron":
        geometry = Polyhedra.quadrayCuboctahedron(scale, { normalize });
        renderPolyhedron(group, geometry, color, opacity);
        // Store parameters for re-export
        group.userData.parameters = {
          normalize: normalize,
          wxyz: geometry.wxyz_normalized,
        };
        break;

      case "quadrayOctahedron":
        geometry = Polyhedra.quadrayOctahedron(scale, { normalize });
        renderPolyhedron(group, geometry, color, opacity);
        group.userData.parameters = {
          normalize: normalize,
          wxyz: geometry.wxyz_normalized,
        };
        break;

      case "quadrayTruncatedTet":
        geometry = Polyhedra.quadrayTruncatedTetrahedron(scale, { normalize });
        renderPolyhedron(group, geometry, color, opacity);
        group.userData.parameters = {
          normalize: normalize,
          wxyz: geometry.wxyz_normalized,
          primeProjection: geometry.metadata?.primeProjection,
        };
        break;

      // Matrix forms - return null, use createPolyhedronByTypeAsync instead
      case "cubeMatrix":
      case "tetMatrix":
      case "octaMatrix":
      case "cuboctaMatrix":
      case "rhombicDodecMatrix":
      case "radialCubeMatrix":
      case "radialRhombicDodecMatrix":
      case "radialTetMatrix":
      case "radialOctMatrix":
      case "radialVEMatrix":
        // Matrix forms require async creation - caller should use createPolyhedronByTypeAsync
        console.warn(
          `⚠️ Matrix type '${type}' requires async creation - use createPolyhedronByTypeAsync`
        );
        return null;

      default:
        console.warn(`⚠️ Unknown polyhedron type: ${type}`);
        return null;
    }

    return group;
  }

  /**
   * Async version of createPolyhedronByType for matrix forms
   * Required because matrix modules are dynamically imported
   *
   * @param {string} type - Polyhedron type name
   * @param {Object} options - Creation options (same as sync version)
   * @returns {Promise<THREE.Group|null>} New polyhedron group or null if type unknown
   */
  async function createPolyhedronByTypeAsync(type, options = {}) {
    // For non-matrix types, delegate to sync version
    const matrixTypes = [
      "cubeMatrix",
      "tetMatrix",
      "octaMatrix",
      "cuboctaMatrix",
      "rhombicDodecMatrix",
      "radialCubeMatrix",
      "radialRhombicDodecMatrix",
      "radialTetMatrix",
      "radialOctMatrix",
      "radialVEMatrix",
    ];

    if (!matrixTypes.includes(type)) {
      return createPolyhedronByType(type, options);
    }

    // Matrix-specific options - use stored parameters from options if available
    const tetEdge = parseFloat(el.tetScaleSlider?.value || "1");
    const defaultScale = tetEdge / (2 * Math.sqrt(2));
    const scale = options.scale ?? defaultScale;
    const opacity =
      options.opacity ?? parseFloat(el.opacitySlider?.value || "0.25");

    // Planar matrix parameters
    const matrixSize = options.matrixSize ?? 1;
    const rotate45 = options.rotate45 ?? false;
    const colinearEdges = options.colinearEdges ?? false; // octaMatrix
    const faceCoplanar = options.faceCoplanar ?? false; // rhombicDodecMatrix

    // Radial matrix parameters
    const frequency = options.frequency ?? 1;
    const spaceFilling = options.spaceFilling ?? true; // radialCube, radialRhombicDodec
    const ivmMode = options.ivmMode ?? false; // radialTetMatrix
    const ivmScaleOnly = options.ivmScaleOnly ?? false; // radialOctMatrix

    // Create group with metadata
    const group = new THREE.Group();
    group.userData.type = type;
    group.userData.parameters = {
      matrixSize: matrixSize,
      frequency: frequency,
      rotate45: rotate45,
      colinearEdges: colinearEdges,
      faceCoplanar: faceCoplanar,
      spaceFilling: spaceFilling,
      ivmMode: ivmMode,
      ivmScaleOnly: ivmScaleOnly,
      opacity: opacity,
      scale: scale,
    };

    // Get color for this type - use type-specific colors
    let color;
    switch (type) {
      case "cubeMatrix":
        color = colorPalette.cubeMatrix || colorPalette.cube || 0xffffff;
        break;
      case "tetMatrix":
        color = colorPalette.tetrahedron || 0xffffff;
        break;
      case "octaMatrix":
        color =
          colorPalette.octahedronMatrix || colorPalette.octahedron || 0xffffff;
        break;
      case "cuboctaMatrix":
        color = colorPalette.cuboctahedron || 0xffffff;
        break;
      case "rhombicDodecMatrix":
        color = colorPalette.rhombicDodecahedron || 0xffffff;
        break;
      case "radialCubeMatrix":
        color = colorPalette.cube || 0xffffff;
        break;
      case "radialRhombicDodecMatrix":
        color = colorPalette.rhombicDodecahedron || 0xffffff;
        break;
      case "radialTetMatrix":
        color =
          colorPalette.radialTetrahedron ||
          colorPalette.tetrahedron ||
          0xffffff;
        break;
      case "radialOctMatrix":
        color =
          colorPalette.radialOctahedron || colorPalette.octahedron || 0xffffff;
        break;
      case "radialVEMatrix":
        color =
          colorPalette.radialCuboctahedron ||
          colorPalette.cuboctahedron ||
          0xffffff;
        break;
      default:
        color = 0xffffff;
    }

    try {
      // Planar matrix types
      if (
        [
          "cubeMatrix",
          "tetMatrix",
          "octaMatrix",
          "cuboctaMatrix",
          "rhombicDodecMatrix",
        ].includes(type)
      ) {
        let matrix;
        switch (type) {
          case "cubeMatrix":
            matrix = RTMatrix.createCubeMatrix(
              matrixSize,
              scale,
              rotate45,
              opacity,
              color,
              THREE
            );
            break;
          case "tetMatrix":
            matrix = RTMatrix.createTetrahedronMatrix(
              matrixSize,
              scale,
              rotate45,
              opacity,
              color,
              THREE
            );
            break;
          case "octaMatrix":
            matrix = RTMatrix.createOctahedronMatrix(
              matrixSize,
              scale,
              rotate45,
              colinearEdges,
              opacity,
              color,
              THREE
            );
            break;
          case "cuboctaMatrix":
            matrix = RTMatrix.createCuboctahedronMatrix(
              matrixSize,
              scale,
              rotate45,
              opacity,
              color,
              THREE
            );
            break;
          case "rhombicDodecMatrix":
            matrix = RTMatrix.createRhombicDodecahedronMatrix(
              matrixSize,
              scale,
              rotate45,
              faceCoplanar,
              opacity,
              color,
              THREE
            );
            break;
        }
        if (matrix) {
          group.add(matrix);
        }
      }

      // Radial matrix types
      if (
        [
          "radialCubeMatrix",
          "radialRhombicDodecMatrix",
          "radialTetMatrix",
          "radialOctMatrix",
          "radialVEMatrix",
        ].includes(type)
      ) {
        let matrix;
        switch (type) {
          case "radialCubeMatrix":
            matrix = RTRadialMatrix.createRadialCubeMatrix(
              frequency,
              scale,
              spaceFilling,
              opacity,
              color,
              THREE
            );
            break;
          case "radialRhombicDodecMatrix":
            matrix = RTRadialMatrix.createRadialRhombicDodecMatrix(
              frequency,
              scale,
              spaceFilling,
              opacity,
              color,
              THREE
            );
            break;
          case "radialTetMatrix":
            matrix = RTRadialMatrix.createRadialTetrahedronMatrix(
              frequency,
              scale,
              opacity,
              color,
              THREE,
              ivmMode
            );
            break;
          case "radialOctMatrix":
            matrix = RTRadialMatrix.createRadialOctahedronMatrix(
              frequency,
              scale,
              opacity,
              color,
              THREE,
              false, // ivmScale - not used in import (always false)
              ivmScaleOnly
            );
            break;
          case "radialVEMatrix":
            matrix = RTRadialMatrix.createRadialCuboctahedronMatrix(
              frequency,
              scale,
              opacity,
              color,
              THREE
            );
            break;
        }
        if (matrix) {
          group.add(matrix);
        }
      }

      return group;
    } catch (error) {
      console.error(`❌ Failed to create matrix type '${type}':`, error);
      return null;
    }
  }

  // ========================================================================
  // UCS (User Coordinate System) — camera-based scene orientation
  // ========================================================================

  let currentUCSMode = "z-up";

  /**
   * Set UCS orientation by rotating the camera so the chosen axis appears vertical.
   * Scene contents stay in native Z-up coordinates — only the viewpoint changes.
   * @param {string} mode - One of: 'z-up', 'y-up', 'x-up', 'qw-up', 'qx-up', 'qy-up', 'qz-up'
   */
  function setUCSOrientation(mode) {
    const orientations = {
      "z-up": new THREE.Vector3(0, 0, 1),
      "y-up": new THREE.Vector3(0, 1, 0),
      "x-up": new THREE.Vector3(1, 0, 0),
      "qw-up": Quadray.basisVectors[Quadray.AXIS_INDEX.qw].clone(),
      "qx-up": Quadray.basisVectors[Quadray.AXIS_INDEX.qx].clone(),
      "qy-up": Quadray.basisVectors[Quadray.AXIS_INDEX.qy].clone(),
      "qz-up": Quadray.basisVectors[Quadray.AXIS_INDEX.qz].clone(),
    };

    const desiredUp = orientations[mode];
    if (!desiredUp) return;

    // Compute rotation from current up to desired up
    const currentUp = camera.up.clone().normalize();
    const newUp = desiredUp.clone().normalize();

    if (currentUp.distanceTo(newUp) < 0.001) {
      currentUCSMode = mode;
      return; // Already there
    }

    // Rotate camera position and up vector
    const quat = new THREE.Quaternion().setFromUnitVectors(currentUp, newUp);
    camera.position.applyQuaternion(quat);
    camera.up.copy(newUp);
    camera.lookAt(controls.target);

    controls.update();

    currentUCSMode = mode;
    MetaLog.log(`UCS orientation set to: ${mode}`);
  }

  // Return public API from initScene() factory
  return {
    // Core scene initialization
    initScene,
    animate,
    onWindowResize,

    // Rendering functions
    updateGeometry,
    requestGeometryUpdate,
    updateGeometryStats,

    // Node configuration
    setNodeGeometryType,
    setGeodesicFrequency,
    setNodeOpacity,
    clearNodeCache,

    // Basis visibility controls
    setCartesianBasisVisible,
    setQuadrayBasisVisible,

    // Grid group visibility controls
    setCartesianGridVisible,
    setQuadrayGridVisible,

    // Camera controls
    switchCameraType,
    setCameraPreset,
    resetCameraTarget,
    setUCSOrientation,

    // Getters for THREE.js objects (needed by rt-init.js)
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getControls: () => controls,
    getAllFormGroups, // For selection system

    // Grid rebuild methods (for tessellation slider controls)
    rebuildQuadrayGrids,
    rebuildCartesianGrids,

    // Color Theory API (for color-theory-modal.js)
    getPolyhedronColor,
    updatePolyhedronColor,
    exportColorPalette,
    setCanvasBackground,
    getCanvasBackground,

    // Instance restoration factory (for rt-filehandler.js)
    createPolyhedronByType,
    createPolyhedronByTypeAsync,
  };

  // ========================================================================
}
