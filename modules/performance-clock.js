/**
 * Performance Clock Module for ARTexplorer
 * Modeled after src/core/Clock.js from TEUI
 * Tracks calculation timing, node generation, FPS, and triangle counts
 *
 * Purpose: Compare RT algebraic methods vs classical trigonometry
 * Note: Performance benefit is in generation speed and triangle efficiency,
 *       NOT in GPU runtime computation (both become BufferGeometry)
 */

export const PerformanceClock = {
  timings: {
    calculationStart: null,
    nodeGenerationStart: null,
    lastCalculationTime: null,
    lastNodeGenerationTime: null,
    lastTotalVertices: 0,
    lastTotalTriangles: 0,
    lastNodeTriangles: 0,
  },
  fpsHistory: [],
  lastFrameTime: performance.now(),
  polyhedraGroups: null, // Will be set by initScene()

  /**
   * Initialize with references to scene groups
   * @param {Array} groups - Array of THREE.Group objects to count triangles from
   */
  init(groups) {
    this.polyhedraGroups = groups;
    console.log("[PerformanceClock] Initialized with", groups.length, "groups");
  },

  /**
   * Start timing full geometry calculation
   */
  startCalculation() {
    this.timings.calculationStart = performance.now();
  },

  /**
   * End timing full geometry calculation
   */
  endCalculation() {
    if (this.timings.calculationStart) {
      this.timings.lastCalculationTime =
        performance.now() - this.timings.calculationStart;
      this.timings.calculationStart = null;
    }
  },

  /**
   * Start timing node generation specifically
   */
  startNodeGeneration() {
    this.timings.nodeGenerationStart = performance.now();
  },

  /**
   * End timing node generation
   */
  endNodeGeneration() {
    if (this.timings.nodeGenerationStart) {
      this.timings.lastNodeGenerationTime =
        performance.now() - this.timings.nodeGenerationStart;
      this.timings.nodeGenerationStart = null;
    }
  },

  /**
   * Update FPS tracking (called every frame)
   */
  updateFPS() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    const fps = 1000 / delta;
    this.fpsHistory.push(fps);

    // Keep only last 60 frames for averaging
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }
  },

  /**
   * Get average FPS from recent frames
   */
  getAverageFPS() {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  },

  /**
   * Count total triangles, vertices, edges, and faces in scene
   * Excludes grids (Line/LineSegments materials without vertex nodes)
   * @returns {Object} {totalTriangles, totalVertices, totalEdges, totalFaces}
   */
  countSceneTriangles() {
    let totalTriangles = 0;
    let totalVertices = 0;
    let totalEdges = 0;
    let totalFaces = 0;

    if (!this.polyhedraGroups) {
      console.warn("[PerformanceClock] Groups not initialized");
      return { totalTriangles, totalVertices, totalEdges, totalFaces };
    }

    // Known V/E/F for standard polyhedra (Euler: V - E + F = 2)
    const polyhedraVEF = {
      // Platonic solids
      tetrahedron: { V: 4, E: 6, F: 4 },
      dualTetrahedron: { V: 4, E: 6, F: 4 },
      cube: { V: 8, E: 12, F: 6 },
      octahedron: { V: 6, E: 12, F: 8 },
      icosahedron: { V: 12, E: 30, F: 20 },
      dodecahedron: { V: 20, E: 30, F: 12 },
      dualIcosahedron: { V: 12, E: 30, F: 20 },
      // Archimedean solids
      cuboctahedron: { V: 12, E: 24, F: 14 },
      rhombicDodecahedron: { V: 14, E: 24, F: 12 },
      // Quadray demonstrators (same as XYZ equivalents)
      quadrayTetrahedron: { V: 4, E: 6, F: 4 },
      quadrayTetraDeformed: { V: 4, E: 6, F: 4 },
      quadrayCuboctahedron: { V: 12, E: 24, F: 14 },
    };

    this.polyhedraGroups.forEach(group => {
      if (group && group.visible) {
        const type = group.userData?.type;
        const params = group.userData?.parameters;

        // Check for known polyhedra V/E/F
        if (type && polyhedraVEF[type]) {
          totalVertices += polyhedraVEF[type].V;
          totalEdges += polyhedraVEF[type].E;
          totalFaces += polyhedraVEF[type].F;
        } else if (params) {
          // For primitives with variable V/E/F based on parameters
          if (type === "point") {
            totalVertices += 1;
          } else if (type === "line") {
            totalVertices += 2;
            totalEdges += 1;
          } else if (type === "polygon") {
            const sides = params.sides || 3;
            totalVertices += sides;
            totalEdges += sides;
            if (params.showFace) totalFaces += 1;
          } else if (type === "prism") {
            const sides = params.sides || 6;
            totalVertices += 2 * sides;
            totalEdges += 3 * sides;
            if (params.showFaces !== false) totalFaces += sides + 2;
          } else if (type === "cone") {
            const sides = params.sides || 6;
            totalVertices += sides + 1;
            totalEdges += 2 * sides;
            if (params.showFaces !== false) totalFaces += sides + 1;
          }
        }

        // Count triangles from actual geometry buffers
        group.traverse(child => {
          // Skip vertex nodes (counted separately) and grid lines
          if (child.userData?.isVertexNode) return;
          if (child.type === "Line" || child.type === "LineSegments") return;
          if (child.type === "Line2") return;

          if (child.isMesh && child.geometry) {
            if (child.geometry.index) {
              // Indexed geometry
              totalTriangles += child.geometry.index.count / 3;
            } else if (child.geometry.attributes.position) {
              // Non-indexed geometry
              totalTriangles += child.geometry.attributes.position.count / 3;
            }
          }
        });
      }
    });

    return { totalTriangles, totalVertices, totalEdges, totalFaces };
  },

  /**
   * Update performance display in Geometry Info section
   * @param {boolean} useRTNodeGeometry - Current node type (for display)
   */
  updateDisplay(useRTNodeGeometry) {
    const avgFPS = this.getAverageFPS();
    const sceneStats = this.countSceneTriangles();

    // Update scene totals (with thousands separators for readability)
    const formatNumber = n => (n > 0 ? n.toLocaleString() : "--");
    const totalVerticesEl = document.getElementById("totalVertices");
    const totalEdgesEl = document.getElementById("totalEdges");
    const totalFacesEl = document.getElementById("totalFaces");
    const totalTrianglesEl = document.getElementById("totalTriangles");

    if (totalVerticesEl)
      totalVerticesEl.textContent = `Vertices: ${formatNumber(sceneStats.totalVertices)}`;
    if (totalEdgesEl)
      totalEdgesEl.textContent = `Edges: ${formatNumber(sceneStats.totalEdges)}`;
    if (totalFacesEl)
      totalFacesEl.textContent = `Faces: ${formatNumber(sceneStats.totalFaces)}`;
    if (totalTrianglesEl)
      totalTrianglesEl.textContent = `Triangles: ${formatNumber(Math.round(sceneStats.totalTriangles))}`;

    // Update performance stats
    const perfCalcTimeEl = document.getElementById("perfCalcTime");
    const perfNodeTimeEl = document.getElementById("perfNodeTime");
    const perfFPSEl = document.getElementById("perfFPS");
    const perfNodeTypeEl = document.getElementById("perfNodeType");
    const perfNodeTrianglesEl = document.getElementById("perfNodeTriangles");

    if (perfCalcTimeEl && this.timings.lastCalculationTime !== null) {
      perfCalcTimeEl.textContent = `Calculation: ${this.timings.lastCalculationTime.toFixed(1)} ms`;
    }

    if (perfNodeTimeEl && this.timings.lastNodeGenerationTime !== null) {
      perfNodeTimeEl.textContent = `Node Gen: ${this.timings.lastNodeGenerationTime.toFixed(1)} ms`;
    }

    if (perfFPSEl) {
      perfFPSEl.textContent = `FPS: ${Math.round(avgFPS) || "--"}`;
    }

    if (perfNodeTypeEl) {
      perfNodeTypeEl.textContent = `Node Type: ${useRTNodeGeometry ? "RT Icosahedron" : "Classical"}`;
    }

    if (perfNodeTrianglesEl) {
      if (this.timings.lastNodeTriangles > 0) {
        perfNodeTrianglesEl.textContent = `Node Δ: ${this.timings.lastNodeTriangles} per vertex`;
        perfNodeTrianglesEl.style.display = "";
      } else {
        perfNodeTrianglesEl.style.display = "none";
      }
    }
  },
};
