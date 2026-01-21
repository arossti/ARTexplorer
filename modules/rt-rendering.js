/**
 * rt-rendering.js
 * THREE.js Rendering Module for ARTexplorer
 *
 * Manages scene setup, camera, lighting, grids, and basis vectors.
 * Handles all THREE.js rendering logic separate from geometry generation.
 *
 * @requires THREE.js
 * @requires rt-math.js
 * @requires rt-polyhedra.js
 */

import { Quadray } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js";
import { PerformanceClock } from "./performance-clock.js";
import { RTPapercut } from "./rt-papercut.js";

// Re-export PerformanceClock so rt-init.js can import it from here
export { PerformanceClock };

// Module-level cache for node geometries
const nodeGeometryCache = new Map();

// Module-level variable to track RT vs classical node geometry
let useRTNodeGeometry = true; // Default to RT geodesic nodes (3f)

// Module-level variable to track geodesic frequency for RT nodes
let geodesicFrequency = 3; // Default to 3f Geodesic

// Module-level variable to track node opacity
let nodeOpacity = 0.6; // Default to 0.60 for better visibility (increased from 0.35)

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
  let cartesianGrid, cartesianBasis, quadrayBasis, ivmPlanes;

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
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);

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

    // Initialize PerformanceClock with all scene groups
    PerformanceClock.init([
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
    ]);

    // Initial render
    updateGeometry();

    // Handle window resize
    window.addEventListener("resize", onWindowResize);
  }

  /**
   * Create Cartesian grid (XYZ) - grey hairlines
   * Z-up coordinate system: Z is vertical, XY is horizontal ground plane
   */
  function createCartesianGrid() {
    cartesianGrid = new THREE.Group();

    // Read tessellation from slider (dynamic control)
    const sliderElement = document.getElementById("cartesianTessSlider");
    const divisions = sliderElement ? parseInt(sliderElement.value) : 10;

    // Grid size scales with divisions to maintain 1.0×1.0 unit squares
    // This makes grid EXTEND (like Quadray grids) rather than subdivide
    // divisions=10 → 10-unit extent (-5 to +5) with 1.0 unit squares (cube edge=2 occupies 2×2 squares)
    const gridSize = divisions;

    // Simple grey grid color - subtle and non-distracting
    const gridColor = 0x444444;

    // Z-UP CONVENTION: Notation swap from Y-up
    // In Y-up: XZ was horizontal (default), XY was rotated, YZ was rotated
    // In Z-up: XY is horizontal, XZ is vertical, YZ is vertical
    // Just swap which planes get rotations - same rotation values as before

    // XY plane (Z = 0) - HORIZONTAL ground plane in Z-up
    window.gridXY = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    window.gridXY.rotation.x = Math.PI / 2; // Same rotation as Y-up XY had
    window.gridXY.visible = false; // Hidden by default
    cartesianGrid.add(window.gridXY);

    // XZ plane (Y = 0) - VERTICAL wall in Z-up (front/back)
    window.gridXZ = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    // GridHelper default - was horizontal in Y-up, now vertical in Z-up (notation swap)
    window.gridXZ.visible = false; // Hidden by default
    cartesianGrid.add(window.gridXZ);

    // YZ plane (X = 0) - VERTICAL wall in Z-up (left/right)
    window.gridYZ = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    window.gridYZ.rotation.z = Math.PI / 2; // Same rotation as Y-up YZ had
    window.gridYZ.visible = false; // Hidden by default
    cartesianGrid.add(window.gridYZ);

    scene.add(cartesianGrid);

    /**
     * SYSTEM 2 OF 4: SYMBOLIC Cartesian basis vectors (XYZ)
     *
     * - Location: rt-rendering.js (this file)
     * - Purpose: Non-interactive coordinate reference (user-toggleable visibility)
     * - Scaling: Dynamic - scales with cube slider via updateGeometry()
     * - Visual: Conical arrowheads (THREE.ArrowHelper) distinguish XYZ from WXYZ
     * - Labels: X, Y, Z (orthogonal basis)
     *
     * See also: Editing Cartesian basis in rt-init.js (interactive gumball handles)
     *
     * RT-PURE ALIGNMENT: Base length calculated to align with cube grid
     * - Grid spacing: cube edge length (default 2.0)
     * - Scaling factor (applied in updateGeometry): cubeEdge
     * - Base length: 1.0 (unit length, scaled to match cube edge)
     */
    // Add Cartesian axes as separate object (can be toggled independently)
    // Using ArrowHelper to match Quadray vector style (with arrowheads)
    cartesianBasis = new THREE.Group();

    // RT-PURE: Base length for unit scaling (will be scaled to cubeEdge in updateGeometry)
    const totalBasisLength = 1.0; // Base length (unit), scaled by cubeEdge
    const headLength = 0.2; // Proportionally scaled head
    const arrowLength = totalBasisLength;

    // X-axis (Red)
    const xAxis = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), // Direction
      new THREE.Vector3(0, 0, 0), // Origin
      arrowLength, // Total arrow length ≈ 1.414 (matches default cube edge)
      0xff0000, // Red
      headLength, // Head length = 0.2
      0.15 // Head width (proportionally scaled)
    );
    cartesianBasis.add(xAxis);

    // Y-axis (Green)
    const yAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0), // Direction
      new THREE.Vector3(0, 0, 0), // Origin
      arrowLength, // Total arrow length ≈ 1.414 (matches default cube edge)
      0x00ff00, // Green
      headLength, // Head length = 0.2
      0.15 // Head width (proportionally scaled)
    );
    cartesianBasis.add(yAxis);

    // Z-axis (Blue) - vertical in Z-up convention
    const zAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1), // Direction (up in Z-up)
      new THREE.Vector3(0, 0, 0), // Origin
      arrowLength, // Total arrow length ≈ 1.414 (matches default cube edge)
      0x0000ff, // Blue
      headLength, // Head length = 0.2
      0.15 // Head width (proportionally scaled)
    );
    cartesianBasis.add(zAxis);

    cartesianBasis.visible = false; // Hidden by default
    scene.add(cartesianBasis);
  }

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
  function createTetrahedralArrow(direction, shaftLength, headSize, color) {
    const arrowGroup = new THREE.Group();

    // 1. Create cylindrical shaft (match XYZ ArrowHelper visual weight)
    const shaftRadius = 0.005; // Match THREE.ArrowHelper default shaft radius
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
    // The dual tetrahedron has vertices at (±1,±1,±1) normalized
    // We want ONE vertex to point exactly along the direction vector
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
  }

  /**
   * Create SYMBOLIC Quadray basis vectors (WXYZ) with tetrahedral arrowheads
   *
   * SYSTEM 1 OF 4: Non-interactive coordinate reference (user-toggleable visibility)
   * - Location: rt-rendering.js (this file)
   * - Purpose: Always-on coordinate system reference
   * - Scaling: Dynamic - scales with tetrahedron slider via updateGeometry()
   * - Visual: Tetrahedral arrowheads distinguish WXYZ from XYZ
   * - Labels: W, X, Y, Z (tetrahedral basis)
   *
   * See also: Editing Quadray basis in rt-init.js (interactive gumball handles)
   *
   * RT-PURE ALIGNMENT: Base length calculated to reach 3x grid intervals AFTER scaling
   * - Grid interval: √6/4 ≈ 0.612 (centroid-to-vertex for unit tetrahedron)
   * - Target after scaling: 3 × √6/4 ≈ 1.837 (reaches 3rd grid intersection)
   * - Scaling factor (applied in updateGeometry): tetEdge / (2√2)
   * - Base length (before scaling): targetLength / scaleFactor
   */
  function createQuadrayBasis() {
    quadrayBasis = new THREE.Group();

    // RT-PURE: Basis vectors reach (tetEdge + 1) grid intervals
    // tetEdge=2 → basis at 3 grid intervals, tetEdge=3 → basis at 4 grid intervals
    //
    // Scaling in updateGeometry(): arrow scaled by tetEdge / (2√2)
    // Grid intervals are FIXED (not scaled), so:
    //
    // We want: finalLength = (tetEdge / gridInterval + 1) × gridInterval
    // Example: tetEdge=2.0, gridInterval=0.612
    //   tetEdge / gridInterval = 2.0 / 0.612 ≈ 3.27 grid intervals for tet
    //   basis should reach: (3.27 + 1) × 0.612 ≈ 2.61
    //
    // Actually simpler: tetEdge is already in same units as grid, so:
    // finalLength = tetEdge + gridInterval
    // baseLength × (tetEdge / 2√2) = tetEdge + gridInterval
    // baseLength = (tetEdge + gridInterval) × (2√2 / tetEdge)
    //
    // For DEFAULT tetEdge=2.0:
    const gridInterval = RT.PureRadicals.QUADRAY_GRID_INTERVAL; // √6/4 ≈ 0.612
    const defaultTetEdge = 2.0;
    const scaleDenominator = 2 * Math.sqrt(2); // 2√2 ≈ 2.828

    const totalBasisLength =
      (defaultTetEdge + gridInterval) * (scaleDenominator / defaultTetEdge);
    // = 2.612 × 1.414 ≈ 3.69

    const headSize = 0.15; // Scale of tetrahedral arrowhead

    // RT-PURE: Tetrahedral head tip extends headSize * √3 beyond its center
    // Dual tetrahedron vertices at (±s,±s,±s) → distance s√3 from origin
    const headTipExtension = headSize * Math.sqrt(3); // ≈ 0.260
    const shaftLength = totalBasisLength - headTipExtension; // ≈ 1.577

    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]; // R, G, B, Y
    const labels = ["W", "X", "Y", "Z"];

    Quadray.basisVectors.forEach((vec, i) => {
      const arrow = createTetrahedralArrow(
        vec,
        shaftLength,
        headSize,
        colors[i]
      );
      quadrayBasis.add(arrow);
    });

    quadrayBasis.visible = true; // Visible by default
    scene.add(quadrayBasis);
  }

  /**
   * Create triangular grid for a Quadray plane defined by two basis vectors
   * RT-PURE: Uses SAME tessellation method as tetrahedron frequency subdivisions
   *
   * TRIANGULAR LATTICE: Three line families form equilateral triangles
   * - Direction 1: basis1
   * - Direction 2: basis2
   * - Direction 3: basis1 + basis2 (creates proper 60° triangular grid)
   *
   * CRITICAL: This uses pure barycentric subdivision principles!
   * When Project='Flat', tetrahedron geodesic vertices lie EXACTLY on these grids.
   * Functionally equivalent to tetrahedron frequency divisions.
   *
   * @param {THREE.Vector3} basis1 - First basis vector (e.g., W)
   * @param {THREE.Vector3} basis2 - Second basis vector (e.g., X)
   * @param {number} minExtent - Inner radius (near-zero, avoid origin singularity)
   * @param {number} maxExtent - Outer radius (tetrahedral boundary)
   * @param {number} divisions - Grid subdivisions (frequency parameter)
   * @param {number} color - Grid line color
   * @returns {THREE.LineSegments} Triangular grid geometry
   */
  /**
   * Create Central Angle Grid (Corrected Tessellation Method)
   * This is the CORRECT implementation of the "Tetrahedral Central Angle Exploration Grid"
   * Tessellates triangular faces vertex-to-vertex - NO extraneous lines!
   * RT-PURE: Uses tetrahedron edge length as unit increment
   *
   * NOTE: Originally intended as IVM grid, but this is actually the corrected
   * implementation of Option 1 (Central Angle Grid). TRUE IVM still to be done.
   *
   * @param {THREE.Vector3} basis1 - First basis vector (e.g., W)
   * @param {THREE.Vector3} basis2 - Second basis vector (e.g., X)
   * @param {number} halfSize - Tetrahedron halfSize (s)
   * @param {number} tessellations - Number of triangle copies in each direction (e.g., 5)
   * @param {number} color - Grid line color
   * @returns {THREE.LineSegments} Central Angle grid geometry
   */
  function createIVMGrid(basis1, basis2, halfSize, tessellations, color) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    // RT-PURE + PureRadicals: Unit tetrahedron grid interval
    // For a unit tetrahedron (edge length = 1):
    // Centroid-to-vertex distance (OutSphere radius) = √6/4 ≈ 0.612
    // This provides meaningful intervals at edge lengths 1, 2, 3, 4...
    const edgeLength = RT.PureRadicals.QUADRAY_GRID_INTERVAL;

    // DIAGNOSTIC: Log grid interval with full precision (first plane only)
    if (!window.gridIntervalLogged) {
      console.log("=== QUADRAY GRID INTERVAL (FIXED) ===");
      console.log(`Grid interval (√6/4): ${edgeLength.toFixed(16)}`);
      console.log(`Exact value: ${edgeLength}`);
      window.gridIntervalLogged = true;
    }

    // Base triangle edge vectors:
    // v1 = basis1 * edgeLength (from origin along basis1)
    // v2 = basis2 * edgeLength (from origin along basis2)
    // Origin (0,0,0) is implicit in tessellation calculation
    const v1 = basis1.clone().multiplyScalar(edgeLength);
    const v2 = basis2.clone().multiplyScalar(edgeLength);

    // Tessellate triangle outward in three directions:
    // Direction A: along basis1 (v0 -> v1 edge)
    // Direction B: along basis2 (v0 -> v2 edge)
    // Direction C: along (v1 -> v2 edge), which is (v2 - v1) direction

    // For each tessellation position (i, j, k) where i+j+k <= tessellations:
    // - i: steps along basis1 direction
    // - j: steps along basis2 direction
    // - k: steps along (basis2 - basis1) direction
    //
    // Triangle vertex calculation using vector addition:
    // TriangleOrigin = i*v1 + j*v2
    // Each triangle has three vertices: origin, origin+v1, origin+v2

    for (let i = 0; i <= tessellations; i++) {
      for (let j = 0; j <= tessellations - i; j++) {
        // Calculate the "origin" of this triangle copy
        const triOrigin = v1
          .clone()
          .multiplyScalar(i)
          .add(v2.clone().multiplyScalar(j));

        // Three vertices of this triangle:
        const p0 = triOrigin.clone();
        const p1 = triOrigin.clone().add(v1);
        const p2 = triOrigin.clone().add(v2);

        // Draw three edges (triangle outline):
        // Edge 1: p0 -> p1
        vertices.push(p0.x, p0.y, p0.z);
        vertices.push(p1.x, p1.y, p1.z);

        // Edge 2: p1 -> p2
        vertices.push(p1.x, p1.y, p1.z);
        vertices.push(p2.x, p2.y, p2.z);

        // Edge 3: p2 -> p0
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
        opacity: 0.4, // Slightly more visible than Central Angle Grid
      })
    );
  }

  /**
   * Create Central Angle Grids (Corrected Implementation)
   * This is the CORRECTED "Tetrahedral Central Angle Exploration Grid" (Option 1)
   * Uses vertex-to-vertex triangular tessellation (no extraneous lines!)
   *
   * NOTE: This accidentally became the correct implementation when we thought
   * we were building IVM grids. The TRUE IVM (Option 2) is still to be implemented.
   */
  function createIVMPlanes() {
    ivmPlanes = new THREE.Group();

    const halfSize = 1.0; // Tetrahedron halfSize (s) - matches dual tetrahedron

    // Read tessellation from slider (dynamic control)
    const sliderElement = document.getElementById("quadrayTessSlider");
    const tessellations = sliderElement ? parseInt(sliderElement.value) : 12;

    // Using nomenclature: W, X, Y, Z for Quadray basis (mapping to indices 0,1,2,3)
    // 6 planes from 6 combinations of 4 basis vectors (all Quadray planes)
    // Color scheme: W=Yellow, X=Red, Y=Blue, Z=Green → RGB two-color mixes

    // WX plane (basis 0, 1) - Yellow+Red = Orange-Yellow
    window.ivmWX = createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[1],
      halfSize,
      tessellations,
      0xffaa00
    );
    window.ivmWX.visible = true;
    window.ivmWX.name = "CentralAngle_WX";
    ivmPlanes.add(window.ivmWX);

    // WY plane (basis 0, 2) - Yellow+Blue = Light Purple/Lavender
    window.ivmWY = createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[2],
      halfSize,
      tessellations,
      0xaaaaff
    );
    window.ivmWY.visible = true;
    window.ivmWY.name = "CentralAngle_WY";
    ivmPlanes.add(window.ivmWY);

    // WZ plane (basis 0, 3) - Yellow+Green = Yellow-Green/Lime
    window.ivmWZ = createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0xaaff00
    );
    window.ivmWZ.visible = true;
    window.ivmWZ.name = "CentralAngle_WZ";
    ivmPlanes.add(window.ivmWZ);

    // XY plane (basis 1, 2) - Red+Blue = Magenta
    window.ivmXY = createIVMGrid(
      Quadray.basisVectors[1],
      Quadray.basisVectors[2],
      halfSize,
      tessellations,
      0xff00ff
    );
    window.ivmXY.visible = true;
    window.ivmXY.name = "CentralAngle_XY";
    ivmPlanes.add(window.ivmXY);

    // XZ plane (basis 1, 3) - Red+Green = Yellow
    window.ivmXZ = createIVMGrid(
      Quadray.basisVectors[1],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0xffff00
    );
    window.ivmXZ.visible = true;
    window.ivmXZ.name = "CentralAngle_XZ";
    ivmPlanes.add(window.ivmXZ);

    // YZ plane (basis 2, 3) - Blue+Green = Cyan
    window.ivmYZ = createIVMGrid(
      Quadray.basisVectors[2],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0x00ffff
    );
    window.ivmYZ.visible = true;
    window.ivmYZ.name = "CentralAngle_YZ";
    ivmPlanes.add(window.ivmYZ);

    console.log(
      "✅ Central Angle grids created (corrected tessellation, 6 planes) with edge length:",
      (2 * halfSize * Math.sqrt(2)).toFixed(4)
    );

    scene.add(ivmPlanes);
  }

  /**
   * Get edge quadrance (Q = a²) for a polyhedron type
   * Uses RT-pure algebraic formulas (defers sqrt to last possible moment)
   * @param {string} type - Polyhedron type (tetrahedron, cube, octahedron, etc.)
   * @param {number} scale - halfSize parameter (s)
   * @returns {number} Edge quadrance Q = a² (NOT edge length!)
   */
  function getPolyhedronEdgeQuadrance(type, scale) {
    const s2 = scale * scale; // Pre-compute s² for RT calculations

    switch (type) {
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

      default:
        console.warn(
          `Unknown polyhedron type: ${type}, using default cube Q=4s²`
        );
        return 4 * s2;
    }
  }

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
   * @returns {number} Vertex sphere radius for close-packing
   */
  function getClosePackedRadius(type, scale) {
    // RT-PURE: Work in quadrance space (no sqrt until final step!)
    const Q_edge = getPolyhedronEdgeQuadrance(type, scale);

    // UNIVERSAL CLOSE-PACKING LAW (Rational Trigonometry form):
    // Q_vertex = Q_edge / 4
    // Pure algebraic relationship - no transcendental functions!
    const Q_vertex = Q_edge / 4;

    // Only NOW do we take sqrt for final radius (rendering requirement)
    const radius = Math.sqrt(Q_vertex);

    // DIAGNOSTIC: RT validation logging (matches rt-polyhedra.js pattern)
    console.log(`🔵 Close-pack RT for ${type} (halfSize=${scale.toFixed(4)}):`);
    console.log(`  Edge quadrance Q_edge: ${Q_edge.toFixed(6)}`);
    console.log(
      `  Vertex quadrance Q_vertex = Q_edge/4: ${Q_vertex.toFixed(6)}`
    );
    console.log(`  Vertex radius r = √Q_vertex: ${radius.toFixed(6)}`);
    console.log(`  ✓ RT-PURE: Stayed in quadrance space until final sqrt`);

    return radius;
  }

  /**
   * Get cached node geometry (prevents repeated generation)
   * @param {boolean} useRT - Use RT geodesic icosahedron (true) or classical sphere (false)
   * @param {string} nodeSize - Size ('sm', 'md', 'lg', 'packed', 'off')
   * @param {string} polyhedronType - Type for close-pack calculations
   * @param {number} scale - halfSize for close-pack calculations
   * @returns {Object} {geometry: THREE.BufferGeometry, triangles: number}
   */
  function getCachedNodeGeometry(useRT, nodeSize, polyhedronType, scale) {
    const cacheKey = `${useRT ? "rt" : "classical"}-${nodeSize}-${polyhedronType || "default"}-${scale || 1}`;

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
        radius = getClosePackedRadius(polyhedronType, scale);
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

  /**
   * Add vertex nodes to a matrix group
   * Generates unique vertex positions for matrix arrays
   * Supports alternating orientations for tetrahedra
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
    PerformanceClock.timings.lastNodeTriangles = Math.round(trianglesPerNode);

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
    PerformanceClock.timings.lastNodeTriangles = Math.round(trianglesPerNode);

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
   * Render a polyhedron from vertices, edges, faces
   * Uses proper geometry with indexed faces for clean rendering
   */
  function renderPolyhedron(group, geometry, color, opacity) {
    // Clear existing geometry
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const { vertices, edges, faces } = geometry;

    // Get selected node size from new button selector
    const nodeSizeBtn = document.querySelector(".node-size-btn.active");
    const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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

      const faceMaterial = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.FrontSide, // Backface culling enabled - all polyhedra winding corrected (2026-01-11)
        depthWrite: opacity >= 0.99, // Only write depth for opaque faces
        flatShading: true,
      });

      const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
      faceMesh.renderOrder = 1; // Render faces before edges
      group.add(faceMesh);
    }

    // Render edges using LineSegments for efficiency
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
      linewidth: 1, // WebGL limitation
      depthTest: true,
      depthWrite: true,
    });

    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edgeLines.renderOrder = 2; // Render edges after faces
    group.add(edgeLines);

    // Render vertex nodes using cached geometry for efficiency
    if (showNodes) {
      // Start node generation timing
      PerformanceClock.startNodeGeneration();

      // Get polyhedron type and scale from group for close-pack calculations
      const polyType = group.userData.type;
      const tetEdge = parseFloat(
        document.getElementById("tetScaleSlider").value
      );
      const scale = tetEdge / (2 * Math.sqrt(2)); // Convert tet edge to halfSize

      // Get cached geometry (prevents repeated generation)
      // Pass polyhedronType and scale for 'packed' mode calculations
      const { geometry: nodeGeometry, triangles: trianglesPerNode } =
        getCachedNodeGeometry(useRTNodeGeometry, nodeSize, polyType, scale);

      // Calculate node radius for userData (same logic as getCachedNodeGeometry)
      let nodeRadius;
      if (nodeSize === "packed") {
        nodeRadius = getClosePackedRadius(polyType, scale);
      } else {
        const nodeSizes = { sm: 0.02, md: 0.04, lg: 0.08 };
        nodeRadius = nodeSizes[nodeSize] || 0.04;
      }

      // Get flatShading preference from checkbox
      const useFlatShading =
        document.getElementById("nodeFlatShading")?.checked || false;

      const nodeMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.2,
        flatShading: useFlatShading, // User-controlled shading
        transparent: nodeOpacity < 1,
        opacity: nodeOpacity,
        side: THREE.FrontSide, // Backface culling enabled - all polyhedra winding corrected (2026-01-11)
      });

      vertices.forEach(vertex => {
        // Clone material for each node to avoid shared material issues during selection
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
        node.position.copy(vertex);
        node.renderOrder = 3; // Render nodes on top

        // Mark as vertex node for Papercut section cut detection
        node.userData.isVertexNode = true;
        node.userData.nodeType = "sphere"; // "sphere" (current) vs "polyhedron" (future)
        node.userData.nodeRadius = nodeRadius;
        node.userData.nodeGeometry = useRTNodeGeometry ? "rt" : "classical";

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

      const geometry = polyhedronFn(
        scale,
        isNaN(frequency) ? 1 : frequency,
        projection
      );
      renderPolyhedron(group, geometry, color, opacity);
      group.visible = true;
    } else {
      group.visible = false;
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
    const tetEdge = parseFloat(document.getElementById("tetScaleSlider").value);
    const scale = tetEdge / (2 * Math.sqrt(2)); // Convert tet edge to halfSize
    const opacity = parseFloat(document.getElementById("opacitySlider").value);

    // Cube (Blue)
    if (document.getElementById("showCube").checked) {
      const cube = Polyhedra.cube(scale);
      renderPolyhedron(cubeGroup, cube, colorPalette.cube, opacity);
      cubeGroup.visible = true;
    } else {
      cubeGroup.visible = false;
    }

    // Cube Matrix (IVM Array)
    if (document.getElementById("showCubeMatrix").checked) {
      const matrixSize = parseInt(
        document.getElementById("cubeMatrixSizeSlider")?.value || "1"
      );
      const rotate45 =
        document.getElementById("cubeMatrixRotate45")?.checked || false;

      // Clear existing cube matrix group
      while (cubeMatrixGroup.children.length > 0) {
        cubeMatrixGroup.remove(cubeMatrixGroup.children[0]);
      }

      // Generate cube matrix
      import("./rt-matrix-planar.js").then(MatrixModule => {
        const { RTMatrix } = MatrixModule;
        const cubeMatrix = RTMatrix.createCubeMatrix(
          matrixSize,
          scale,
          rotate45,
          opacity,
          colorPalette.cubeMatrix,
          THREE
        );
        cubeMatrixGroup.add(cubeMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      cubeMatrixGroup.visible = true;
    } else {
      cubeMatrixGroup.visible = false;
    }

    // Tetrahedron (Yellow)
    if (document.getElementById("showTetrahedron").checked) {
      const tetra = Polyhedra.tetrahedron(scale);
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
        console.log(`\n=== TETRAHEDRON EDGE LENGTH ${roundedEdge} ===`);
        console.log(`HalfSize (s): ${halfSize.toFixed(16)}`);
        console.log(`Edge length (2s√2): ${tetEdgeLength.toFixed(16)}`);
        console.log(`OutSphere radius (s√3): ${outSphereRadius.toFixed(16)}`);
        console.log(`Grid interval (√6/4): ${gridInterval.toFixed(16)}`);
        console.log(`Difference (OutSphere - Grid): ${difference.toFixed(16)}`);
        console.log(`Percent difference: ${percentDiff.toFixed(8)}%`);
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

    // Dual Tetrahedron (Magenta - reciprocal complementary: matches geodesic octahedron)
    if (document.getElementById("showDualTetrahedron").checked) {
      const dualTetra = Polyhedra.dualTetrahedron(scale);
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
    if (document.getElementById("showTetMatrix").checked) {
      const matrixSize = parseInt(
        document.getElementById("tetMatrixSizeSlider")?.value || "1"
      );
      const rotate45 =
        document.getElementById("tetMatrixRotate45")?.checked || false;

      // Clear existing tet matrix group
      while (tetMatrixGroup.children.length > 0) {
        tetMatrixGroup.remove(tetMatrixGroup.children[0]);
      }

      // Generate tet matrix
      import("./rt-matrix-planar.js").then(MatrixModule => {
        const { RTMatrix } = MatrixModule;
        const tetMatrix = RTMatrix.createTetrahedronMatrix(
          matrixSize,
          scale,
          rotate45,
          opacity,
          colorPalette.tetrahedron,
          THREE
        );
        tetMatrixGroup.add(tetMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      tetMatrixGroup.visible = true;
    } else {
      tetMatrixGroup.visible = false;
    }

    // Octahedron (Green)
    if (document.getElementById("showOctahedron").checked) {
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
    if (document.getElementById("showOctaMatrix").checked) {
      const matrixSize = parseInt(
        document.getElementById("octaMatrixSizeSlider")?.value || "1"
      );
      const rotate45 =
        document.getElementById("octaMatrixRotate45")?.checked || false;
      const colinearEdges =
        document.getElementById("octaMatrixColinearEdges")?.checked || false;

      // Clear existing octa matrix group
      while (octaMatrixGroup.children.length > 0) {
        octaMatrixGroup.remove(octaMatrixGroup.children[0]);
      }

      // Generate octa matrix
      import("./rt-matrix-planar.js").then(MatrixModule => {
        const { RTMatrix } = MatrixModule;
        const octaMatrix = RTMatrix.createOctahedronMatrix(
          matrixSize,
          scale,
          rotate45,
          colinearEdges,
          opacity,
          colorPalette.octahedronMatrix,
          THREE
        );
        octaMatrixGroup.add(octaMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      octaMatrixGroup.visible = true;
    } else {
      octaMatrixGroup.visible = false;
    }

    // Icosahedron (Cyan)
    if (document.getElementById("showIcosahedron").checked) {
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

    // Dodecahedron (Yellow)
    if (document.getElementById("showDodecahedron").checked) {
      const dodec = Polyhedra.dodecahedron(scale);
      renderPolyhedron(
        dodecahedronGroup,
        dodec,
        colorPalette.dodecahedron,
        opacity
      );
      dodecahedronGroup.visible = true;
    } else {
      dodecahedronGroup.visible = false;
    }

    // Geodesic Icosahedron (Orange - complementary to base Cyan)
    renderGeodesicPolyhedron({
      checkboxId: "showGeodesicIcosahedron",
      frequencyId: "geodesicIcosaFrequency",
      projectionName: "geodesicIcosaProjection",
      polyhedronFn: Polyhedra.geodesicIcosahedron,
      group: geodesicIcosahedronGroup,
      color: colorPalette.geodesicIcosahedron, // Bright orange
      scale,
      opacity,
    });

    // Dual Icosahedron (Orange - reciprocal complementary: matches base geodesic)
    if (document.getElementById("showDualIcosahedron").checked) {
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
    if (document.getElementById("showCuboctahedron").checked) {
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
    if (document.getElementById("showCuboctahedronMatrix").checked) {
      const matrixSize = parseInt(
        document.getElementById("cuboctaMatrixSizeSlider")?.value || "1"
      );
      const rotate45 =
        document.getElementById("cuboctaMatrixRotate45")?.checked || false;

      // Clear existing cubocta matrix group
      while (cuboctaMatrixGroup.children.length > 0) {
        cuboctaMatrixGroup.remove(cuboctaMatrixGroup.children[0]);
      }

      // Generate cuboctahedron matrix
      import("./rt-matrix-planar.js").then(MatrixModule => {
        const { RTMatrix } = MatrixModule;
        const cuboctaMatrix = RTMatrix.createCuboctahedronMatrix(
          matrixSize,
          scale,
          rotate45,
          opacity,
          colorPalette.cuboctahedron, // Lime-cyan (Vector Equilibrium color)
          THREE
        );
        cuboctaMatrixGroup.add(cuboctaMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      cuboctaMatrixGroup.visible = true;
    } else {
      cuboctaMatrixGroup.visible = false;
    }

    // Rhombic Dodecahedron (Golden Orange)
    if (document.getElementById("showRhombicDodecahedron").checked) {
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

    // Rhombic Dodecahedron Matrix (Space-Filling Array)
    if (document.getElementById("showRhombicDodecMatrix").checked) {
      const matrixSize = parseInt(
        document.getElementById("rhombicDodecMatrixSizeSlider")?.value || "1"
      );
      const rotate45 =
        document.getElementById("rhombicDodecMatrixRotate45")?.checked || false;
      const faceCoplanar =
        document.getElementById("rhombicDodecMatrixFaceCoplanar")?.checked ||
        false;

      // Clear existing rhombic dodec matrix group
      while (rhombicDodecMatrixGroup.children.length > 0) {
        rhombicDodecMatrixGroup.remove(rhombicDodecMatrixGroup.children[0]);
      }

      // Generate rhombic dodecahedron matrix
      import("./rt-matrix-planar.js").then(MatrixModule => {
        const { RTMatrix } = MatrixModule;
        const rhombicDodecMatrix = RTMatrix.createRhombicDodecahedronMatrix(
          matrixSize,
          scale,
          rotate45,
          faceCoplanar,
          opacity,
          colorPalette.rhombicDodecahedron, // Golden orange (Rhombic Dodecahedron color)
          THREE
        );
        rhombicDodecMatrixGroup.add(rhombicDodecMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      rhombicDodecMatrixGroup.visible = true;
    } else {
      rhombicDodecMatrixGroup.visible = false;
    }

    // ========== RADIAL MATRICES ==========

    // Radial Cube Matrix (concentric shell expansion)
    if (document.getElementById("showRadialCubeMatrix")?.checked) {
      const frequency = parseInt(
        document.getElementById("radialCubeFreqSlider")?.value || "1"
      );
      const spaceFilling =
        document.getElementById("radialCubeSpaceFill")?.checked ?? true;

      // Clear existing radial cube matrix group
      while (radialCubeMatrixGroup.children.length > 0) {
        radialCubeMatrixGroup.remove(radialCubeMatrixGroup.children[0]);
      }

      // Generate radial cube matrix
      import("./rt-matrix-radial.js").then(RadialModule => {
        const { RTRadialMatrix } = RadialModule;
        const radialCubeMatrix = RTRadialMatrix.createRadialCubeMatrix(
          frequency,
          scale,
          spaceFilling,
          opacity,
          colorPalette.cube, // Use cube color
          THREE
        );
        radialCubeMatrixGroup.add(radialCubeMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      radialCubeMatrixGroup.visible = true;
    } else {
      radialCubeMatrixGroup.visible = false;
    }

    // Radial Rhombic Dodecahedron Matrix (FCC lattice expansion)
    // RD is inherently space-filling - no toggle needed
    if (document.getElementById("showRadialRhombicDodecMatrix")?.checked) {
      const frequency = parseInt(
        document.getElementById("radialRhombicDodecFreqSlider")?.value || "1"
      );
      const spaceFilling = true; // RD always space-fills (no voids possible)

      // Clear existing radial rhombic dodec matrix group
      while (radialRhombicDodecMatrixGroup.children.length > 0) {
        radialRhombicDodecMatrixGroup.remove(
          radialRhombicDodecMatrixGroup.children[0]
        );
      }

      // Generate radial rhombic dodecahedron matrix
      import("./rt-matrix-radial.js").then(RadialModule => {
        const { RTRadialMatrix } = RadialModule;
        const radialRhombicDodecMatrix =
          RTRadialMatrix.createRadialRhombicDodecMatrix(
            frequency,
            scale,
            spaceFilling,
            opacity,
            colorPalette.rhombicDodecahedron, // Use rhombic dodec color
            THREE
          );
        radialRhombicDodecMatrixGroup.add(radialRhombicDodecMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      radialRhombicDodecMatrixGroup.visible = true;
    } else {
      radialRhombicDodecMatrixGroup.visible = false;
    }

    // Radial Tetrahedron Matrix (Phase 3)
    if (document.getElementById("showRadialTetrahedronMatrix")?.checked) {
      const frequency = parseInt(
        document.getElementById("radialTetFreqSlider")?.value || "1"
      );

      // Clear existing radial tet matrix group
      while (radialTetMatrixGroup.children.length > 0) {
        radialTetMatrixGroup.remove(radialTetMatrixGroup.children[0]);
      }

      // Get IVM Mode checkbox value
      const ivmMode =
        document.getElementById("radialTetIVMMode")?.checked || false;

      // Generate radial tetrahedron matrix
      import("./rt-matrix-radial.js").then(RadialModule => {
        const { RTRadialMatrix } = RadialModule;
        const radialTetMatrix = RTRadialMatrix.createRadialTetrahedronMatrix(
          frequency,
          scale,
          opacity,
          colorPalette.radialTetrahedron,
          THREE,
          ivmMode
        );
        radialTetMatrixGroup.add(radialTetMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      radialTetMatrixGroup.visible = true;
    } else {
      radialTetMatrixGroup.visible = false;
    }

    // Radial Octahedron Matrix (Phase 3)
    if (document.getElementById("showRadialOctahedronMatrix")?.checked) {
      const frequency = parseInt(
        document.getElementById("radialOctFreqSlider")?.value || "1"
      );

      // Clear existing radial oct matrix group
      while (radialOctMatrixGroup.children.length > 0) {
        radialOctMatrixGroup.remove(radialOctMatrixGroup.children[0]);
      }

      // Get IVM scale checkbox value
      // ivmScaleOnly = true: 2× size with taxicab positioning (for nesting into tet matrix)
      // ivmScale = false: keeps taxicab positioning (not FCC lattice)
      const ivmScaleOnly =
        document.getElementById("radialOctIVMScale")?.checked || false;

      // Generate radial octahedron matrix
      import("./rt-matrix-radial.js").then(RadialModule => {
        const { RTRadialMatrix } = RadialModule;
        const radialOctMatrix = RTRadialMatrix.createRadialOctahedronMatrix(
          frequency,
          scale,
          opacity,
          colorPalette.radialOctahedron,
          THREE,
          false, // ivmScale = false (no FCC lattice)
          ivmScaleOnly // ivmScaleOnly = checkbox value (2× size only)
        );
        radialOctMatrixGroup.add(radialOctMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      radialOctMatrixGroup.visible = true;
    } else {
      radialOctMatrixGroup.visible = false;
    }

    // Radial Cuboctahedron (VE) Matrix (Phase 3)
    if (document.getElementById("showRadialCuboctahedronMatrix")?.checked) {
      const frequency = parseInt(
        document.getElementById("radialVEFreqSlider")?.value || "1"
      );

      // Clear existing radial VE matrix group
      while (radialVEMatrixGroup.children.length > 0) {
        radialVEMatrixGroup.remove(radialVEMatrixGroup.children[0]);
      }

      // Generate radial cuboctahedron matrix
      import("./rt-matrix-radial.js").then(RadialModule => {
        const { RTRadialMatrix } = RadialModule;
        const radialVEMatrix = RTRadialMatrix.createRadialCuboctahedronMatrix(
          frequency,
          scale,
          opacity,
          colorPalette.radialCuboctahedron,
          THREE
        );
        radialVEMatrixGroup.add(radialVEMatrix);

        // Add vertex nodes if enabled
        const nodeSizeBtn = document.querySelector(".node-size-btn.active");
        const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
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
      });
      radialVEMatrixGroup.visible = true;
    } else {
      radialVEMatrixGroup.visible = false;
    }

    // Scale basis vectors to match current slider values
    // Cartesian basis vectors scale with cube edge length
    const cubeEdge = parseFloat(document.getElementById("scaleSlider").value);
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
      while (quadrayBasis.children.length > 0) {
        quadrayBasis.remove(quadrayBasis.children[0]);
      }

      // Recreate with current tetEdge value
      const gridInterval = RT.PureRadicals.QUADRAY_GRID_INTERVAL; // √6/4 ≈ 0.612
      // tetEdge represents number of grid intervals, so basis = (tetEdge + 1) × gridInterval
      const targetLength = (tetEdge + 1) * gridInterval;
      const headSize = 0.1; // Reduced from 0.15 for better visual balance
      const headTipExtension = headSize * Math.sqrt(3);
      const shaftLength = targetLength - headTipExtension;

      const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];

      Quadray.basisVectors.forEach((vec, i) => {
        const arrow = createTetrahedralArrow(
          vec,
          shaftLength,
          headSize,
          colors[i]
        );
        quadrayBasis.add(arrow);
      });
    }

    updateGeometryStats();

    // End performance timing
    PerformanceClock.endCalculation();
    PerformanceClock.updateDisplay(useRTNodeGeometry);
  }

  /**
   * Update geometry statistics display
   */
  function updateGeometryStats() {
    const stats = document.getElementById("geometryStats");
    let html = "";

    if (document.getElementById("showCube").checked) {
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
    }

    if (document.getElementById("showTetrahedron").checked) {
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
    }

    if (document.getElementById("showDualTetrahedron").checked) {
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
    }

    if (document.getElementById("showOctahedron").checked) {
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
    }

    if (document.getElementById("showIcosahedron").checked) {
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
    }

    if (document.getElementById("showDualIcosahedron").checked) {
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
    }

    if (document.getElementById("showDodecahedron").checked) {
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
    }

    if (document.getElementById("showRhombicDodecahedron").checked) {
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

    if (document.getElementById("showCuboctahedron").checked) {
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
    if (document.getElementById("showGeodesicTetrahedron").checked) {
      const frequency = parseInt(
        document.getElementById("geodesicTetraFrequency").value
      );
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
    if (document.getElementById("showGeodesicOctahedron").checked) {
      const frequency = parseInt(
        document.getElementById("geodesicOctaFrequency").value
      );
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
    if (document.getElementById("showGeodesicIcosahedron").checked) {
      const frequency = parseInt(
        document.getElementById("geodesicIcosaFrequency").value
      );
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

    stats.innerHTML = html || "Select a polyhedron to see stats";
  }

  /**
   * Animation loop with FPS tracking
   */
  function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Required for damping
    renderer.render(scene, camera);

    // Update FPS tracking and performance display
    PerformanceClock.updateFPS();

    // Update display every 10 frames (reduce overhead)
    if (Math.floor(performance.now() / 100) % 10 === 0) {
      PerformanceClock.updateDisplay(useRTNodeGeometry);
    }
  }

  /**
   * Handle window resize
   */
  function onWindowResize() {
    const container = document.getElementById("canvas-container");
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

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

    // Z-up coordinate system (CAD/BIM standard)
    // Z = vertical, X-Y = horizontal ground plane
    // Viewing convention: Standing on ground (X-Y plane), Z is up
    switch (view) {
      case "top":
        // Top view: Looking DOWN from above (camera on +Z looking toward -Z)
        camera.position.set(0, 0, distance);
        camera.up.set(0, 1, 0); // Y axis points "north" in top view
        break;

      case "bottom":
        // Bottom view: Looking UP from below (camera on -Z looking toward +Z)
        camera.position.set(0, 0, -distance);
        camera.up.set(0, -1, 0); // Flip Y to keep orientation consistent
        break;

      case "left": {
        // Left view: Looking from LEFT side at 45° angle (camera on -X,-Y looking toward +X,+Y)
        // At 45° from X-axis to see tetrahedral triangular profile
        const leftDist = distance / Math.sqrt(2);
        camera.position.set(-leftDist, -leftDist, 0);
        camera.up.set(0, 0, 1); // Z points up
        break;
      }

      case "right": {
        // Right view: Looking from RIGHT side at 45° angle (camera on +X,+Y looking toward -X,-Y)
        // At 45° from X-axis to see tetrahedral triangular profile
        const rightDist = distance / Math.sqrt(2);
        camera.position.set(rightDist, rightDist, 0);
        camera.up.set(0, 0, 1); // Z points up
        break;
      }

      case "front":
        // Front view: Looking from FRONT (camera on -Y looking toward +Y)
        // Standing on ground, looking forward (north) - see XZ plane (front elevation)
        camera.position.set(0, -distance, 0);
        camera.up.set(0, 0, 1); // Z points up
        break;

      case "back":
        // Back view: Looking from BACK (camera on +Y looking toward -Y)
        // Standing on ground, looking back (south) - see XZ plane (back elevation)
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

      // WXYZ Tetrahedral Basis Views
      case "w":
      case "x":
      case "y":
      case "z": {
        // Initialize Quadray basis vectors if not already done
        if (!Quadray.basisVectors) {
          Quadray.init(THREE);
        }

        // Map view name to basis vector index
        // W=0, X=1, Y=2, Z=3 (matches Quadray.basisVectors order)
        const axisMap = { w: 0, x: 1, y: 2, z: 3 };
        const axisIndex = axisMap[view];
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

        // TODO: Activate cutplane perpendicular to the viewing axis
        // This requires integration with RT-Papercut module
        // For now, log the basis vector for the cutplane normal
        console.log(
          `WXYZ View ${view.toUpperCase()}: Camera at basis vector`,
          basisVector,
          "\n(Cutplane activation: TODO)"
        );

        break;
      }

      case "perspective":
        // TRUE PERSPECTIVE view - return to initial app state
        // CRITICAL: Switch to perspective camera FIRST, then set position
        if (isOrthographic) {
          switchCameraType(false); // Switch to perspective internally
          // Also update the checkbox in the UI
          const orthoCheckbox = document.getElementById("orthoPerspective");
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
      w: "w",
      x: "x",
      y: "y",
      z: "z",
    };

    // Set cutplane axis based on view
    if (tetrahedralAxisMap[view]) {
      // WXYZ Tetrahedral views
      RTPapercut.setCutplaneAxis("tetrahedral", view, scene);
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
    // CRITICAL: Store the original perspective camera on first call
    if (!originalPerspectiveCamera && !isOrthographic) {
      originalPerspectiveCamera = camera;
      console.log("📸 Saved original perspective camera reference");
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
        0.1,
        1000
      );

      // Copy position and orientation from perspective camera
      orthographicCamera.position.copy(camera.position);
      orthographicCamera.rotation.copy(camera.rotation);
      orthographicCamera.up.copy(camera.up);

      // Switch to orthographic
      camera = orthographicCamera;
      controls.object = orthographicCamera;
      isOrthographic = true;

      console.log("✅ Switched to Orthographic camera (parallel projection)");
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

      console.log("✅ Switched to Perspective camera");
    }

    controls.update();
  }

  /**
   * Get all form groups for selection system
   * @returns {Object} Object containing all form group references
   */
  function getAllFormGroups() {
    return {
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
    };
  }

  /**
   * Rebuild Quadray grids with new tessellation value
   * @param {number} tessellations - Number of triangle copies in each direction
   * @param {Object} visibilityState - Object mapping plane names to visibility state
   */
  function rebuildQuadrayGrids(tessellations, visibilityState = {}) {
    // Remove existing grids
    if (ivmPlanes) {
      scene.remove(ivmPlanes);
    }

    // Recreate with new tessellation (updateIVMPlanes uses stored tessellation value)
    ivmPlanes = new THREE.Group();

    const halfSize = 1.0;

    // WX plane
    window.ivmWX = createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[1],
      halfSize,
      tessellations,
      0xffaa00
    );
    window.ivmWX.visible = visibilityState.ivmWX ?? true;
    window.ivmWX.name = "CentralAngle_WX";
    ivmPlanes.add(window.ivmWX);

    // WY plane
    window.ivmWY = createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[2],
      halfSize,
      tessellations,
      0xaaaaff
    );
    window.ivmWY.visible = visibilityState.ivmWY ?? true;
    window.ivmWY.name = "CentralAngle_WY";
    ivmPlanes.add(window.ivmWY);

    // WZ plane
    window.ivmWZ = createIVMGrid(
      Quadray.basisVectors[0],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0xaaff00
    );
    window.ivmWZ.visible = visibilityState.ivmWZ ?? true;
    window.ivmWZ.name = "CentralAngle_WZ";
    ivmPlanes.add(window.ivmWZ);

    // XY plane
    window.ivmXY = createIVMGrid(
      Quadray.basisVectors[1],
      Quadray.basisVectors[2],
      halfSize,
      tessellations,
      0xff00ff
    );
    window.ivmXY.visible = visibilityState.ivmXY ?? true;
    window.ivmXY.name = "CentralAngle_XY";
    ivmPlanes.add(window.ivmXY);

    // XZ plane
    window.ivmXZ = createIVMGrid(
      Quadray.basisVectors[1],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0xffff00
    );
    window.ivmXZ.visible = visibilityState.ivmXZ ?? true;
    window.ivmXZ.name = "CentralAngle_XZ";
    ivmPlanes.add(window.ivmXZ);

    // YZ plane
    window.ivmYZ = createIVMGrid(
      Quadray.basisVectors[2],
      Quadray.basisVectors[3],
      halfSize,
      tessellations,
      0x00ffff
    );
    window.ivmYZ.visible = visibilityState.ivmYZ ?? true;
    window.ivmYZ.name = "CentralAngle_YZ";
    ivmPlanes.add(window.ivmYZ);

    scene.add(ivmPlanes);

    console.log(
      `✅ Rebuilt Central Angle grids with tessellation=${tessellations}`
    );
  }

  /**
   * Rebuild Cartesian grids with new tessellation value
   * @param {number} divisions - Number of grid divisions
   * @param {Object} visibilityState - Object with grid and basis visibility states
   */
  function rebuildCartesianGrids(divisions, visibilityState = {}) {
    // Remove existing grids and basis
    if (cartesianGrid) {
      scene.remove(cartesianGrid);
    }
    if (cartesianBasis) {
      scene.remove(cartesianBasis);
    }

    // Recreate grid
    cartesianGrid = new THREE.Group();
    const gridSize = divisions;
    const gridColor = 0x444444;

    // XY plane (Z = 0) - HORIZONTAL ground plane in Z-up
    window.gridXY = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    window.gridXY.rotation.x = Math.PI / 2;
    window.gridXY.visible = visibilityState.gridXY ?? false;
    cartesianGrid.add(window.gridXY);

    // XZ plane (Y = 0) - VERTICAL wall in Z-up (front/back)
    window.gridXZ = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    window.gridXZ.visible = visibilityState.gridXZ ?? false;
    cartesianGrid.add(window.gridXZ);

    // YZ plane (X = 0) - VERTICAL wall in Z-up (left/right)
    window.gridYZ = new THREE.GridHelper(
      gridSize,
      divisions,
      gridColor,
      gridColor
    );
    window.gridYZ.rotation.z = Math.PI / 2;
    window.gridYZ.visible = visibilityState.gridYZ ?? false;
    cartesianGrid.add(window.gridYZ);

    scene.add(cartesianGrid);

    // Recreate basis vectors
    cartesianBasis = new THREE.Group();
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

    console.log(`✅ Rebuilt Cartesian grids with divisions=${divisions}`);
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

  // Return public API from initScene() factory
  return {
    // Core scene initialization
    initScene,
    animate,
    onWindowResize,

    // Rendering functions
    updateGeometry,
    updateGeometryStats,

    // Node configuration
    setNodeGeometryType,
    setGeodesicFrequency,
    setNodeOpacity,
    clearNodeCache,

    // Basis visibility controls
    setCartesianBasisVisible,
    setQuadrayBasisVisible,

    // Camera controls
    switchCameraType,
    setCameraPreset,

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
  };

  // ========================================================================
}
