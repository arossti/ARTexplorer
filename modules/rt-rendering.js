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

import { Quadray } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js";
import { Primitives } from "./rt-primitives.js";
import { PerformanceClock } from "./performance-clock.js";
import { RTPapercut } from "./rt-papercut.js";
import { Grids } from "./rt-grids.js";
import { Nodes } from "./rt-nodes.js";
import { Helices } from "./rt-helices.js";

// Line2 addons for variable lineweight (cross-platform support)
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";

// Re-export PerformanceClock so rt-init.js can import it from here
export { PerformanceClock };

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
    quadrayCuboctahedronGroup; // Quadray demonstrators
  let pointGroup; // Point primitive (single vertex)
  let lineGroup; // Line primitive (two vertices, one edge)
  let polygonGroup; // Polygon primitive (n vertices, n edges, 1 face)
  let prismGroup; // Prism primitive (3D solid with N-gon caps)
  let coneGroup; // Cone primitive (3D solid with N-gon base and apex)
  let tetrahelix1Group; // Tetrahelix 1: Toroidal (left-handed)
  let tetrahelix2Group; // Tetrahelix 2: Linear (tetrahedral seed)
  let tetrahelix3Group; // Tetrahelix 3: Linear (octahedral seed)
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

    // Reassign mouse buttons: Left=orbit, Middle=pan, Right=freed for context menu
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: null, // Disable to free right-click for context menu
    };

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

    scene.add(pointGroup);
    scene.add(lineGroup);
    scene.add(polygonGroup);
    scene.add(prismGroup);
    scene.add(coneGroup);
    scene.add(tetrahelix1Group);
    scene.add(tetrahelix2Group);
    scene.add(tetrahelix3Group);
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
    const sliderElement = document.getElementById("cartesianTessSlider");
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
    const sliderElement = document.getElementById("quadrayTessSlider");
    const tessellations = sliderElement ? parseInt(sliderElement.value) : 12;

    // Delegate to Grids module
    const result = Grids.createIVMPlanes(scene, tessellations);

    // Store references for later use
    ivmPlanes = result.ivmPlanes;
    window.ivmWX = result.ivmWX;
    window.ivmWY = result.ivmWY;
    window.ivmWZ = result.ivmWZ;
    window.ivmXY = result.ivmXY;
    window.ivmXZ = result.ivmXZ;
    window.ivmYZ = result.ivmYZ;
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
    // For Line/Polygon primitives with lineWidth option, use Line2/LineMaterial for cross-platform support
    const polyType = group.userData.type;
    const useThickLine =
      (polyType === "line" || polyType === "polygon") &&
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
          depthWrite: true,
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
        depthWrite: true,
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
        nodeOptions = { sides: group.userData.parameters.sides || 3 };
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
      } else {
        const tetEdge = parseFloat(
          document.getElementById("tetScaleSlider").value
        );
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
          console.log(`[Node] Packed fallback to md for ${polyType}`);
        }
      } else {
        const nodeSizes = { sm: 0.02, md: 0.04, lg: 0.08 };
        nodeRadius = nodeSizes[nodeSize] || 0.04;
      }

      // Get flatShading preference from checkbox
      const useFlatShading =
        document.getElementById("nodeFlatShading")?.checked || false;

      const currentNodeOpacity = getNodeOpacity();
      const nodeMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.2,
        flatShading: useFlatShading, // User-controlled shading
        transparent: currentNodeOpacity < 1,
        opacity: currentNodeOpacity,
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
      renderPolyhedron(group, geometry, color, opacity);
      group.visible = true;

      // Store parameters for instance export (state manager captures these on deposit)
      group.userData.parameters = {
        frequency: actualFrequency,
        projection: projection,
      };
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

    // Point (single vertex - coordinate exploration tool)
    if (document.getElementById("showPoint")?.checked) {
      const pointData = Polyhedra.point(scale);
      renderPolyhedron(pointGroup, pointData, colorPalette.point, opacity);
      pointGroup.userData.type = "point";
      pointGroup.userData.allowedTools = ["move"]; // Only Move allowed
      pointGroup.visible = true;
    } else {
      pointGroup.visible = false;
    }

    // Line (1D primitive - two vertices, one edge)
    if (document.getElementById("showLine")?.checked) {
      // Get quadrance from input field (default 1)
      const lineQuadrance = parseFloat(
        document.getElementById("lineQuadrance")?.value || "1"
      );
      // Get lineweight from input field (default 2)
      const lineWeight = parseFloat(
        document.getElementById("lineWeight")?.value || "2"
      );
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
    if (document.getElementById("showPolygon")?.checked) {
      // Get circumradius quadrance from input field (default 1)
      const polygonQuadrance = parseFloat(
        document.getElementById("polygonQuadrance")?.value || "1"
      );
      // Get number of sides (default 3 = triangle)
      const polygonSides = parseInt(
        document.getElementById("polygonSides")?.value || "3"
      );
      // Get edge weight from input field (default 2)
      const polygonEdgeWeight = parseFloat(
        document.getElementById("polygonEdgeWeight")?.value || "2"
      );
      // Get face visibility
      const polygonShowFace =
        document.getElementById("polygonShowFace")?.checked !== false;

      const polygonData = Polyhedra.polygon(polygonQuadrance, {
        sides: polygonSides,
        showFace: polygonShowFace,
      });
      renderPolyhedron(
        polygonGroup,
        polygonData,
        colorPalette.polygon,
        opacity,
        {
          lineWidth: polygonEdgeWeight,
        }
      );
      polygonGroup.userData.type = "polygon";
      polygonGroup.userData.parameters = {
        quadrance: polygonQuadrance,
        circumradius: Math.sqrt(polygonQuadrance),
        sides: polygonSides,
        edgeQuadrance: polygonData.metadata.edgeQuadrance,
        edgeLength: polygonData.metadata.edgeLength,
        edgeWeight: polygonEdgeWeight,
        showFace: polygonShowFace,
        rtPure: polygonData.metadata.rtPure, // Track which engine was used
      };
      polygonGroup.visible = true;
    } else {
      polygonGroup.visible = false;
    }

    // Prism (3D primitive - 2 N-gon caps + rectangular sides)
    if (document.getElementById("showPrism")?.checked) {
      // Get base circumradius quadrance from input field (default 1)
      const prismBaseQ = parseFloat(
        document.getElementById("prismBaseQuadrance")?.value || "1"
      );
      // Get height quadrance from input field (default 1)
      const prismHeightQ = parseFloat(
        document.getElementById("prismHeightQuadrance")?.value || "1"
      );
      // Get number of sides (default 6 = hexagonal prism)
      const prismSides = parseInt(
        document.getElementById("prismSides")?.value || "6"
      );
      // Get face visibility
      const prismShowFaces =
        document.getElementById("prismShowFaces")?.checked !== false;

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
    } else {
      prismGroup.visible = false;
    }

    // Cone (3D primitive - N-gon base + point apex)
    if (document.getElementById("showCone")?.checked) {
      // Get base circumradius quadrance from input field (default 1)
      const coneBaseQ = parseFloat(
        document.getElementById("coneBaseQuadrance")?.value || "1"
      );
      // Get height quadrance from input field (default 1)
      const coneHeightQ = parseFloat(
        document.getElementById("coneHeightQuadrance")?.value || "1"
      );
      // Get number of sides (default 6 = hexagonal cone)
      const coneSides = parseInt(
        document.getElementById("coneSides")?.value || "6"
      );
      // Get face visibility
      const coneShowFaces =
        document.getElementById("coneShowFaces")?.checked !== false;

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

    // Tetrahelix 1: Toroidal (left-handed, max 48)
    if (document.getElementById("showTetrahelix1")?.checked) {
      const tetrahelix1Count = parseInt(
        document.getElementById("tetrahelix1CountSlider")?.value || "10"
      );
      const startFace1Radio = document.querySelector(
        'input[name="tetrahelix1StartFace"]:checked'
      );
      const tetrahelix1StartFace = startFace1Radio ? startFace1Radio.value : "A";

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
        startFace: tetrahelix1StartFace,
        tetrahedra: tetrahelix1Data.metadata.tetrahedra,
        expectedQ: tetrahelix1Data.metadata.expectedQ,
      };
      tetrahelix1Group.visible = true;
    } else {
      tetrahelix1Group.visible = false;
    }

    // Tetrahelix 2: Linear with multi-strand option
    if (document.getElementById("showTetrahelix2")?.checked) {
      const tetrahelix2Count = parseInt(
        document.getElementById("tetrahelix2CountSlider")?.value || "10"
      );
      const startFace2Radio = document.querySelector(
        'input[name="tetrahelix2StartFace"]:checked'
      );
      const tetrahelix2StartFace = startFace2Radio ? startFace2Radio.value : "A";
      const strandsRadio = document.querySelector(
        'input[name="tetrahelix2Strands"]:checked'
      );
      const tetrahelix2Strands = strandsRadio ? parseInt(strandsRadio.value) : 1;
      const bondModeRadio = document.querySelector(
        'input[name="tetrahelix2BondMode"]:checked'
      );
      const tetrahelix2BondMode = bondModeRadio ? bondModeRadio.value : "zipped";

      // Read per-strand exit face settings
      const getExitFace = label => {
        const radio = document.querySelector(`input[name="tetrahelix2Exit${label}"]:checked`);
        return radio ? parseInt(radio.value) : 0;
      };
      const tetrahelix2ExitFaces = {
        A: getExitFace("A"),
        B: getExitFace("B"),
        C: getExitFace("C"),
        D: getExitFace("D"),
      };

      const tetrahelix2Data = Helices.tetrahelix2(scale, {
        count: tetrahelix2Count,
        startFace: tetrahelix2StartFace,
        strands: tetrahelix2Strands,
        bondMode: tetrahelix2BondMode,
        exitFaces: tetrahelix2ExitFaces,
      });
      renderPolyhedron(
        tetrahelix2Group,
        tetrahelix2Data,
        colorPalette.tetrahelix2 || 0x88ff88, // Light green
        opacity
      );
      tetrahelix2Group.userData.type = "tetrahelix2";
      tetrahelix2Group.userData.parameters = {
        count: tetrahelix2Count,
        startFace: tetrahelix2StartFace,
        strands: tetrahelix2Strands,
        bondMode: tetrahelix2BondMode,
        exitFaces: tetrahelix2ExitFaces,
      };
      tetrahelix2Group.visible = true;
    } else {
      tetrahelix2Group.visible = false;
    }

    // Tetrahelix 3: Linear with octahedral seed
    if (document.getElementById("showTetrahelix3")?.checked) {
      const tetrahelix3Count = parseInt(
        document.getElementById("tetrahelix3CountSlider")?.value || "10"
      );
      const startFace3Radio = document.querySelector(
        'input[name="tetrahelix3StartFace"]:checked'
      );
      const tetrahelix3StartFace = startFace3Radio ? startFace3Radio.value : "A";
      const strands3Radio = document.querySelector(
        'input[name="tetrahelix3Strands"]:checked'
      );
      const tetrahelix3Strands = strands3Radio ? parseInt(strands3Radio.value) : 1;
      const bondMode3Radio = document.querySelector(
        'input[name="tetrahelix3BondMode"]:checked'
      );
      const tetrahelix3BondMode = bondMode3Radio ? bondMode3Radio.value : "zipped";

      const tetrahelix3Data = Helices.tetrahelix3(scale, {
        count: tetrahelix3Count,
        startFace: tetrahelix3StartFace,
        strands: tetrahelix3Strands,
        bondMode: tetrahelix3BondMode,
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
        startFace: tetrahelix3StartFace,
        strands: tetrahelix3Strands,
        bondMode: tetrahelix3BondMode,
      };
      tetrahelix3Group.visible = true;
    } else {
      tetrahelix3Group.visible = false;
    }

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

      // Store parameters for instance creation/export
      cubeMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        opacity: opacity,
        scale: scale,
      };

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

      // Store parameters for instance creation/export
      tetMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        opacity: opacity,
        scale: scale,
      };

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

      // Store parameters for instance creation/export
      octaMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        colinearEdges: colinearEdges,
        opacity: opacity,
        scale: scale,
      };

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

      // Store parameters for instance creation/export
      cuboctaMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        opacity: opacity,
        scale: scale,
      };

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

    // ========== QUADRAY DEMONSTRATORS ==========

    // Quadray Tetrahedron (Native WXYZ definition)
    if (document.getElementById("showQuadrayTetrahedron")?.checked) {
      const normalize =
        document.getElementById("quadrayTetraNormalize")?.checked ?? true;
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
    if (document.getElementById("showQuadrayTetraDeformed")?.checked) {
      const zStretch = parseFloat(
        document.getElementById("quadrayTetraZStretch")?.value || "2"
      );
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
    if (document.getElementById("showQuadrayCuboctahedron")?.checked) {
      const normalize =
        document.getElementById("quadrayCuboctaNormalize")?.checked ?? true;
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

      // Store parameters for instance creation/export
      rhombicDodecMatrixGroup.userData.parameters = {
        matrixSize: matrixSize,
        rotate45: rotate45,
        faceCoplanar: faceCoplanar,
        opacity: opacity,
        scale: scale,
      };

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

      // Store parameters for instance creation/export
      radialCubeMatrixGroup.userData.parameters = {
        frequency: frequency,
        spaceFilling: spaceFilling,
        opacity: opacity,
        scale: scale,
      };

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

      // Store parameters for instance creation/export
      radialRhombicDodecMatrixGroup.userData.parameters = {
        frequency: frequency,
        spaceFilling: spaceFilling,
        opacity: opacity,
        scale: scale,
      };

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

      // Store parameters for instance creation/export
      radialTetMatrixGroup.userData.parameters = {
        frequency: frequency,
        ivmMode: ivmMode,
        opacity: opacity,
        scale: scale,
      };

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

      // Store parameters for instance creation/export
      radialOctMatrixGroup.userData.parameters = {
        frequency: frequency,
        ivmScaleOnly: ivmScaleOnly,
        opacity: opacity,
        scale: scale,
      };

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

      // Store parameters for instance creation/export
      radialVEMatrixGroup.userData.parameters = {
        frequency: frequency,
        opacity: opacity,
        scale: scale,
      };

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
        const arrow = Grids.createTetrahedralArrow(
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
    PerformanceClock.updateDisplay(getUseRTNodeGeometry());
  }

  /**
   * Update geometry statistics display
   */
  function updateGeometryStats() {
    const stats = document.getElementById("polyhedraStats");
    let html = "";

    if (document.getElementById("showPoint")?.checked) {
      html += `<div><strong>Point:</strong></div>`;
      html += `<div>V: 1, E: 0, F: 0</div>`;
      html += `<div>Euler: N/A (degenerate)</div>`;
    }

    if (document.getElementById("showLine")?.checked) {
      const lineQ = parseFloat(
        document.getElementById("lineQuadrance")?.value || "1"
      );
      const lineL = Math.sqrt(lineQ);
      html += `<div style="margin-top: 10px;"><strong>Line:</strong></div>`;
      html += `<div>V: 2, E: 1, F: 0</div>`;
      html += `<div>Euler: N/A (open form, χ=1)</div>`;
      html += `<div>Q: ${lineQ.toFixed(4)}, L: ${lineL.toFixed(4)}</div>`;
    }

    if (document.getElementById("showPolygon")?.checked) {
      const polyQ = parseFloat(
        document.getElementById("polygonQuadrance")?.value || "1"
      );
      const polySides = parseInt(
        document.getElementById("polygonSides")?.value || "3"
      );
      const polyR = Math.sqrt(polyQ);
      // Math.sin justified: arbitrary n-gon spread calculation (see CODE-QUALITY-AUDIT.md)
      const spread = Math.pow(Math.sin(Math.PI / polySides), 2);
      const polyEdgeQ = 4 * polyQ * spread; // RT-pure formula
      const polyEdgeL = Math.sqrt(polyEdgeQ);
      const showFace = document.getElementById("polygonShowFace")?.checked;
      const faceCount = showFace ? 1 : 0;
      html += `<div style="margin-top: 10px;"><strong>Polygon (${polySides}-gon):</strong></div>`;
      html += `<div>V: ${polySides}, E: ${polySides}, F: ${faceCount}</div>`;
      html += `<div>Euler: N/A (open form, χ=1)</div>`;
      html += `<div>Q_R: ${polyQ.toFixed(4)}, R: ${polyR.toFixed(4)}</div>`;
      html += `<div>Q_edge: ${polyEdgeQ.toFixed(4)}, edge: ${polyEdgeL.toFixed(4)}</div>`;
    }

    if (document.getElementById("showPrism")?.checked) {
      const prismBaseQ = parseFloat(
        document.getElementById("prismBaseQuadrance")?.value || "1"
      );
      const prismHeightQ = parseFloat(
        document.getElementById("prismHeightQuadrance")?.value || "1"
      );
      const prismSides = parseInt(
        document.getElementById("prismSides")?.value || "6"
      );
      const prismShowFaces =
        document.getElementById("prismShowFaces")?.checked !== false;
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

    if (document.getElementById("showCone")?.checked) {
      const coneBaseQ = parseFloat(
        document.getElementById("coneBaseQuadrance")?.value || "1"
      );
      const coneHeightQ = parseFloat(
        document.getElementById("coneHeightQuadrance")?.value || "1"
      );
      const coneSides = parseInt(
        document.getElementById("coneSides")?.value || "6"
      );
      const coneShowFaces =
        document.getElementById("coneShowFaces")?.checked !== false;
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
    if (document.getElementById("showTetrahelix1")?.checked) {
      const tetrahelix1Count = parseInt(
        document.getElementById("tetrahelix1CountSlider")?.value || "10"
      );
      const startFace1Radio = document.querySelector(
        'input[name="tetrahelix1StartFace"]:checked'
      );
      const tetrahelix1StartFace = startFace1Radio ? startFace1Radio.value : "A";
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
      html += `<div>Start face: ${tetrahelix1StartFace}</div>`;
    }

    // Tetrahelix 2 stats (linear with strands)
    if (document.getElementById("showTetrahelix2")?.checked) {
      const tetrahelix2Count = parseInt(
        document.getElementById("tetrahelix2CountSlider")?.value || "10"
      );
      const startFace2Radio = document.querySelector(
        'input[name="tetrahelix2StartFace"]:checked'
      );
      const tetrahelix2StartFace = startFace2Radio ? startFace2Radio.value : "A";
      const strandsRadio = document.querySelector(
        'input[name="tetrahelix2Strands"]:checked'
      );
      const tetrahelix2Strands = strandsRadio ? parseInt(strandsRadio.value) : 1;
      const bondModeRadio2 = document.querySelector(
        'input[name="tetrahelix2BondMode"]:checked'
      );
      const tetrahelix2BondMode = bondModeRadio2 ? bondModeRadio2.value : "zipped";
      // Read per-strand exit faces for stats
      const getExitFaceStats = label => {
        const radio = document.querySelector(`input[name="tetrahelix2Exit${label}"]:checked`);
        return radio ? parseInt(radio.value) : 0;
      };
      const tetrahelix2ExitFaces = {
        A: getExitFaceStats("A"),
        B: getExitFaceStats("B"),
        C: getExitFaceStats("C"),
        D: getExitFaceStats("D"),
      };
      const tetrahelix2Data = Helices.tetrahelix2(1, {
        count: tetrahelix2Count,
        startFace: tetrahelix2StartFace,
        strands: tetrahelix2Strands,
        bondMode: tetrahelix2BondMode,
        exitFaces: tetrahelix2ExitFaces,
      });
      const V2 = tetrahelix2Data.vertices.length;
      const E2 = tetrahelix2Data.edges.length;
      const F2 = tetrahelix2Data.faces.length;
      const strandLabel = tetrahelix2Strands === 1 ? "1 strand" : `${tetrahelix2Strands} strands`;
      const modeLabel = tetrahelix2Strands > 1 ? `, ${tetrahelix2BondMode}` : "";
      html += `<div style="margin-top: 10px;"><strong>Tetrahelix 2 (${tetrahelix2Count} tet, ${strandLabel}${modeLabel}):</strong></div>`;
      html += `<div>V: ${V2}, E: ${E2}, F: ${F2}</div>`;
      html += `<div>Euler: N/A (open chain)</div>`;
      html += `<div>Pattern: Exit faces A=${tetrahelix2ExitFaces.A}, B=${tetrahelix2ExitFaces.B}, C=${tetrahelix2ExitFaces.C}, D=${tetrahelix2ExitFaces.D}</div>`;
      html += `<div>Start face: ${tetrahelix2StartFace}</div>`;
    }

    // Tetrahelix 3 stats (octahedral seed)
    if (document.getElementById("showTetrahelix3")?.checked) {
      const tetrahelix3Count = parseInt(
        document.getElementById("tetrahelix3CountSlider")?.value || "10"
      );
      const startFace3Radio = document.querySelector(
        'input[name="tetrahelix3StartFace"]:checked'
      );
      const tetrahelix3StartFace = startFace3Radio ? startFace3Radio.value : "A";
      const strands3Radio = document.querySelector(
        'input[name="tetrahelix3Strands"]:checked'
      );
      const tetrahelix3Strands = strands3Radio ? parseInt(strands3Radio.value) : 1;
      const bondMode3Radio = document.querySelector(
        'input[name="tetrahelix3BondMode"]:checked'
      );
      const tetrahelix3BondMode = bondMode3Radio ? bondMode3Radio.value : "zipped";
      const tetrahelix3Data = Helices.tetrahelix3(1, {
        count: tetrahelix3Count,
        startFace: tetrahelix3StartFace,
        strands: tetrahelix3Strands,
        bondMode: tetrahelix3BondMode,
      });
      const V3 = tetrahelix3Data.vertices.length;
      const E3 = tetrahelix3Data.edges.length;
      const F3 = tetrahelix3Data.faces.length;
      const strandLabel3 = tetrahelix3Strands === 1 ? "1 strand" : `${tetrahelix3Strands} strands`;
      const modeLabel3 = tetrahelix3Strands > 1 ? `, ${tetrahelix3BondMode}` : "";
      html += `<div style="margin-top: 10px;"><strong>Tetrahelix 3 (${tetrahelix3Count} tet, ${strandLabel3}${modeLabel3}):</strong></div>`;
      html += `<div>V: ${V3}, E: ${E3}, F: ${F3}</div>`;
      html += `<div>Euler: N/A (open chain)</div>`;
      html += `<div>Seed: Octahedron (8 faces)</div>`;
      html += `<div>Start face: ${tetrahelix3StartFace}</div>`;
    }

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
      html += `<div>Face Spread: 1 (90° dihedral)</div>`;
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
      html += `<div>Face Spread: 8/9 (≈70.53° dihedral)</div>`;
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
      html += `<div>Face Spread: 8/9 (≈70.53° dihedral)</div>`;
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
      html += `<div>Face Spread: 8/9 (≈109.47° dihedral)</div>`;
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
      html += `<div>Face Spread: 4/9 (≈138.19° dihedral)</div>`;
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
      html += `<div>Face Spread: 4/9 (≈138.19° dihedral)</div>`;
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
      html += `<div>Face Spread: 4/5 (≈116.57° dihedral)</div>`;
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

    // Quadray Tetrahedron (4D Native)
    if (document.getElementById("showQuadrayTetrahedron")?.checked) {
      const normalize =
        document.getElementById("quadrayTetraNormalize")?.checked ?? true;
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
    if (document.getElementById("showQuadrayCuboctahedron")?.checked) {
      const normalize =
        document.getElementById("quadrayCuboctaNormalize")?.checked ?? true;
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
      PerformanceClock.updateDisplay(getUseRTNodeGeometry());
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
      quadqw: "qw",
      quadqx: "qx",
      quadqy: "qy",
      quadqz: "qz",
    };

    // Set cutplane axis based on view
    if (tetrahedralAxisMap[view]) {
      // QWXYZ Tetrahedral views
      RTPapercut.setCutplaneAxis("tetrahedral", tetrahedralAxisMap[view], scene);
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
      tetrahelix1Group,
      tetrahelix2Group,
      tetrahelix3Group,
    };
  }

  /**
   * Rebuild Quadray grids with new tessellation value - delegated to rt-grids.js
   */
  function rebuildQuadrayGrids(tessellations, visibilityState = {}) {
    const result = Grids.rebuildQuadrayGrids(
      scene,
      ivmPlanes,
      tessellations,
      visibilityState
    );

    // Store references for later use
    ivmPlanes = result.ivmPlanes;
    window.ivmWX = result.ivmWX;
    window.ivmWY = result.ivmWY;
    window.ivmWZ = result.ivmWZ;
    window.ivmXY = result.ivmXY;
    window.ivmXZ = result.ivmXZ;
    window.ivmYZ = result.ivmYZ;
  }

  /**
   * Rebuild Cartesian grids with new tessellation value - delegated to rt-grids.js
   */
  function rebuildCartesianGrids(divisions, visibilityState = {}) {
    const result = Grids.rebuildCartesianGrids(
      scene,
      cartesianGrid,
      cartesianBasis,
      divisions,
      visibilityState
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
    const tetEdge = parseFloat(
      document.getElementById("tetScaleSlider")?.value || "1"
    );
    const defaultScale = tetEdge / (2 * Math.sqrt(2));
    const scale = options.scale ?? defaultScale;
    const opacity =
      options.opacity ??
      parseFloat(document.getElementById("opacitySlider")?.value || "0.25");
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
        // Tetrahelix 2: Linear (tetrahedral seed)
        const tetrahelix2Count = options.count ?? 10;
        const tetrahelix2StartFace = options.startFace ?? "A";
        geometry = Helices.tetrahelix2(scale, {
          count: tetrahelix2Count,
          startFace: tetrahelix2StartFace,
        });
        group.userData.type = "tetrahelix2";
        group.userData.parameters = {
          count: tetrahelix2Count,
          startFace: tetrahelix2StartFace,
          tetrahedra: geometry.metadata.tetrahedra,
          expectedQ: geometry.metadata.expectedQ,
        };
        renderPolyhedron(group, geometry, color, opacity);
        break;
      }

      case "tetrahelix3": {
        // Tetrahelix 3: Linear (octahedral seed)
        const tetrahelix3Count = options.count ?? 10;
        const tetrahelix3StartFace = options.startFace ?? "A";
        const tetrahelix3Strands = options.strands ?? 1;
        const tetrahelix3BondMode = options.bondMode ?? "zipped";
        geometry = Helices.tetrahelix3(scale, {
          count: tetrahelix3Count,
          startFace: tetrahelix3StartFace,
          strands: tetrahelix3Strands,
          bondMode: tetrahelix3BondMode,
        });
        group.userData.type = "tetrahelix3";
        group.userData.parameters = {
          count: tetrahelix3Count,
          startFace: tetrahelix3StartFace,
          strands: tetrahelix3Strands,
          bondMode: tetrahelix3BondMode,
          tetrahedra: geometry.metadata.tetrahedra,
          expectedQ: geometry.metadata.expectedQ,
        };
        renderPolyhedron(group, geometry, color, opacity);
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
    const tetEdge = parseFloat(
      document.getElementById("tetScaleSlider")?.value || "1"
    );
    const defaultScale = tetEdge / (2 * Math.sqrt(2));
    const scale = options.scale ?? defaultScale;
    const opacity =
      options.opacity ??
      parseFloat(document.getElementById("opacitySlider")?.value || "0.25");

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
        const { RTMatrix } = await import("./rt-matrix-planar.js");

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
        const { RTRadialMatrix } = await import("./rt-matrix-radial.js");

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
    resetCameraTarget,

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
