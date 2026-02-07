/**
 * RT-Projections Module
 * Generalized projection visualization for any polyhedron
 *
 * Projects any polyhedron's convex hull onto a 2D plane with
 * XYZ (Cartesian) and WXYZ (Tetrahedral) axis selection.
 *
 * Extracted from rt-prime-cuts.js using Shadow & Swap pattern.
 * See: Geometry documents/Project-Projection.md
 *
 * @module rt-projections
 * @author Andy & Claude (2026)
 */

import * as THREE from "three";

export const RTProjections = {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  state: {
    enabled: false,
    basis: "cartesian", // 'cartesian' | 'tetrahedral'
    axis: "z", // 'x','y','z' | 'qw','qx','qy','qz'
    distance: 3, // Plane distance from polyhedron center (scene units)
    showRays: true, // Show projection ray lines
    showInterior: false, // Show interior projected vertices
    showIdealPolygon: false, // Show ideal regular n-gon overlay
  },

  _projectionGroup: null,
  _renderer: null,
  _scene: null,
  _camera: null,
  _activePolyhedron: null, // Currently projected polyhedron group

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESET & STATE MANAGEMENT API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply a built-in or user preset
   * Uses same code path as importState() for consistency
   *
   * @param {Object} preset - Preset with projectionState
   * @param {THREE.Scene} scene - Scene reference
   */
  applyPreset: function (preset, scene) {
    // 1. Auto-enable required polyhedron (same as current prime-cuts behavior)
    if (preset.polyhedronCheckbox) {
      const checkbox = document.getElementById(preset.polyhedronCheckbox);
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    // 2. Apply projection state (same format as importState)
    if (preset.projectionState) {
      Object.assign(RTProjections.state, preset.projectionState);
    }

    // 3. Find target polyhedron in scene
    let targetGroup = null;
    scene.traverse((obj) => {
      if (obj.userData?.type === preset.polyhedronType) {
        targetGroup = obj;
      }
    });

    if (!targetGroup) {
      console.warn(`⚠️ Polyhedron ${preset.polyhedronType} not found in scene`);
      return false;
    }

    // 4. Store for state export
    RTProjections.state.targetPolyhedronType = preset.polyhedronType;
    RTProjections.state.presetName = preset.name;
    RTProjections.state.customSpreads = preset.spreads || null;

    // 5. Show projection with preset spreads
    RTProjections.showProjection(targetGroup, {
      spreads: preset.spreads,
      showIdealPolygon: preset.projectionState?.showIdealPolygon ?? true,
    });

    // 6. Update StateManager (for export)
    if (window.RTStateManager) {
      window.RTStateManager.state.environment.projection = {
        ...RTProjections.state,
      };
    }

    console.log(`📐 Applied preset: ${preset.name}`);
    return true;
  },

  /**
   * Export current projection state (for RTFileHandler)
   * @returns {Object} Projection state snapshot
   */
  exportState: function () {
    return {
      enabled: RTProjections.state.enabled,
      basis: RTProjections.state.basis,
      axis: RTProjections.state.axis,
      distance: RTProjections.state.distance,
      showRays: RTProjections.state.showRays,
      showInterior: RTProjections.state.showInterior,
      showIdealPolygon: RTProjections.state.showIdealPolygon,
      customSpreads: RTProjections.state.customSpreads || null,
      presetName: RTProjections.state.presetName || null,
      targetPolyhedronType: RTProjections.state.targetPolyhedronType || null,
    };
  },

  /**
   * Import projection state (called from RTFileHandler.importState)
   * @param {Object} projectionState - State to restore
   */
  importState: function (projectionState) {
    if (!projectionState) return;
    Object.assign(RTProjections.state, projectionState);

    // If projection was enabled and we have a target type, try to re-apply
    // This is handled by updateGeometry callback after all forms are restored
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize with scene references
   * Called from rt-init.js after scene setup
   *
   * @param {THREE.Scene} scene - The THREE.js scene
   * @param {THREE.Camera} camera - The camera reference
   * @param {THREE.WebGLRenderer} renderer - The WebGL renderer
   */
  init: function (scene, camera, renderer) {
    RTProjections._scene = scene;
    RTProjections._camera = camera;
    RTProjections._renderer = renderer;
    console.log("📐 RTProjections initialized");
  },

  /**
   * Set projection axis (mirrors RTPapercut.setCutplaneAxis pattern)
   *
   * @param {string} basis - 'cartesian' or 'tetrahedral'
   * @param {string} axis - 'x','y','z' or 'qw','qx','qy','qz'
   */
  setProjectionAxis: function (basis, axis) {
    RTProjections.state.basis = basis;
    RTProjections.state.axis = axis;
    console.log(`📐 Projection axis set to: ${basis}/${axis}`);

    // Update if currently enabled
    if (RTProjections.state.enabled && RTProjections._activePolyhedron) {
      RTProjections.updateProjection();
    }

    // Update UI info display
    RTProjections._updateAxisInfo();
  },

  /**
   * Set projection plane distance from polyhedron center
   *
   * @param {number} distance - Distance in scene units
   */
  setProjectionDistance: function (distance) {
    RTProjections.state.distance = distance;

    // Update if currently enabled
    if (RTProjections.state.enabled && RTProjections._activePolyhedron) {
      RTProjections.updateProjection();
    }
  },

  /**
   * Main entry point - show projection for a polyhedron group
   *
   * @param {THREE.Group} polyhedronGroup - The polyhedron to project
   * @param {Object} options - Visualization options
   * @param {boolean} options.showRays - Show projection ray lines (default: state.showRays)
   * @param {boolean} options.showInterior - Show interior vertices (default: state.showInterior)
   * @param {boolean} options.showIdealPolygon - Show ideal n-gon overlay (default: state.showIdealPolygon)
   * @param {number} options.rayColor - Color for projection rays (default: from polyhedron)
   */
  showProjection: function (polyhedronGroup, options = {}) {
    if (!RTProjections._scene) {
      console.error("❌ RTProjections not initialized - call init() first");
      return;
    }

    // Store reference for updates
    RTProjections._activePolyhedron = polyhedronGroup;
    RTProjections.state.enabled = true;

    // Merge options with state
    const showRays = options.showRays ?? RTProjections.state.showRays;
    const showInterior = options.showInterior ?? RTProjections.state.showInterior;
    const showIdealPolygon =
      options.showIdealPolygon ?? RTProjections.state.showIdealPolygon;

    // Get ray color from polyhedron or options
    let rayColor = options.rayColor;
    if (!rayColor) {
      // Try to get color from polyhedron material
      polyhedronGroup.traverse((obj) => {
        if (!rayColor && obj.material && obj.material.color) {
          rayColor = obj.material.color.getHex();
        }
      });
      // Default to cyan if no color found
      if (!rayColor) rayColor = 0x00ffff;
    }

    // Create the projection visualization
    RTProjections._createProjectionVisualization(polyhedronGroup, {
      showRays,
      showInterior,
      showIdealPolygon,
      rayColor,
      spreads: options.spreads, // Pass custom spreads from presets
    });

    console.log("📐 Projection enabled for polyhedron");
  },

  /**
   * Hide and cleanup projection visualization
   */
  hideProjection: function () {
    if (RTProjections._projectionGroup && RTProjections._scene) {
      RTProjections._scene.remove(RTProjections._projectionGroup);
      RTProjections._projectionGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      RTProjections._projectionGroup = null;
    }

    RTProjections.state.enabled = false;
    RTProjections._activePolyhedron = null;
    console.log("📐 Projection hidden");
  },

  /**
   * Update projection (call on state change)
   * Re-creates visualization with current settings
   */
  updateProjection: function () {
    if (!RTProjections.state.enabled || !RTProjections._activePolyhedron) {
      return;
    }

    // Remove existing visualization
    if (RTProjections._projectionGroup && RTProjections._scene) {
      RTProjections._scene.remove(RTProjections._projectionGroup);
      RTProjections._projectionGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      RTProjections._projectionGroup = null;
    }

    // Recreate with current settings
    RTProjections.showProjection(RTProjections._activePolyhedron);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC UTILITIES (extracted from rt-prime-cuts.js)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract world-space vertices from a polyhedron group
   * Skips node spheres (userData.isVertexNode = true) to get only face mesh vertices
   * Uses coarse tolerance to collapse triangulated mesh back to actual polyhedron vertices
   *
   * 100% generic - works for ANY polyhedron
   *
   * @param {THREE.Group} group - The polyhedron group
   * @returns {Array<THREE.Vector3>} World-space vertices
   */
  _getWorldVerticesFromGroup: function (group) {
    const vertices = [];
    const seen = new Set();

    // Coarse tolerance (2 decimal places) to collapse triangulated mesh vertices
    // back to the actual polyhedron vertices
    const TOLERANCE_DECIMALS = 2;

    group.traverse((obj) => {
      // Skip node spheres - they have userData.isVertexNode = true
      if (obj.userData?.isVertexNode) {
        return;
      }

      if (obj.geometry && obj.geometry.attributes?.position) {
        const posAttr = obj.geometry.attributes.position;
        obj.updateMatrixWorld(true);

        for (let i = 0; i < posAttr.count; i++) {
          const v = new THREE.Vector3(
            posAttr.getX(i),
            posAttr.getY(i),
            posAttr.getZ(i)
          );
          v.applyMatrix4(obj.matrixWorld);

          // Deduplicate using coarse tolerance
          const key = `${v.x.toFixed(TOLERANCE_DECIMALS)},${v.y.toFixed(TOLERANCE_DECIMALS)},${v.z.toFixed(TOLERANCE_DECIMALS)}`;
          if (!seen.has(key)) {
            seen.add(key);
            vertices.push(v);
          }
        }
      }
    });

    return vertices;
  },

  /**
   * Compute 2D convex hull using Graham scan
   * 100% generic - works for any 2D point set
   *
   * @param {Array<{x,y}>} points - 2D points
   * @returns {Array<{x,y}>} Hull vertices in CCW order
   */
  _computeConvexHull2D: function (points) {
    // Remove duplicates (within tolerance)
    const unique = [];
    const tol = 1e-8;
    points.forEach((p) => {
      if (
        !unique.some((u) => Math.abs(u.x - p.x) < tol && Math.abs(u.y - p.y) < tol)
      ) {
        unique.push(p);
      }
    });

    if (unique.length < 3) return unique;

    // Find lowest point (and leftmost if tie)
    let lowest = 0;
    for (let i = 1; i < unique.length; i++) {
      if (
        unique[i].y < unique[lowest].y ||
        (unique[i].y === unique[lowest].y && unique[i].x < unique[lowest].x)
      ) {
        lowest = i;
      }
    }
    [unique[0], unique[lowest]] = [unique[lowest], unique[0]];
    const pivot = unique[0];

    // Sort by polar angle
    const sorted = unique.slice(1).sort((a, b) => {
      const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      return angleA - angleB;
    });

    // Graham scan
    const hull = [pivot];
    for (const p of sorted) {
      while (hull.length > 1) {
        const a = hull[hull.length - 2];
        const b = hull[hull.length - 1];
        const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (cross <= 0) hull.pop();
        else break;
      }
      hull.push(p);
    }

    return hull;
  },

  /**
   * Get projection plane basis vectors from viewing spreads
   * Generalized to accept spreads directly (not n-specific lookup)
   *
   * @param {Array<number>} spreads - [s1, s2, s3] ZYX rotation spreads
   * @returns {{planeRight: THREE.Vector3, planeUp: THREE.Vector3, planeNormal: THREE.Vector3}}
   */
  _getProjectionPlaneBasis: function (spreads) {
    const [s1, s2, s3] = spreads;

    // Build rotation matrix from spreads (ZYX Euler)
    // sin(θ) = √s, cos(θ) = √(1-s)
    const sin1 = Math.sqrt(s1),
      cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2),
      cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3),
      cos3 = Math.sqrt(1 - s3);

    // ZYX rotation matrices
    const Rz = [
      [cos1, -sin1, 0],
      [sin1, cos1, 0],
      [0, 0, 1],
    ];
    const Ry = [
      [cos2, 0, sin2],
      [0, 1, 0],
      [-sin2, 0, cos2],
    ];
    const Rx = [
      [1, 0, 0],
      [0, cos3, -sin3],
      [0, sin3, cos3],
    ];

    // Matrix multiply helper
    const matMul = (A, B) =>
      A.map((row, i) =>
        B[0].map((_, j) => row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0))
      );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Transform basis vectors
    // planeRight = R * (1,0,0)
    const planeRight = new THREE.Vector3(R[0][0], R[1][0], R[2][0]).normalize();
    // planeUp = R * (0,1,0)
    const planeUp = new THREE.Vector3(R[0][1], R[1][1], R[2][1]).normalize();
    // planeNormal = R * (0,0,1) - this is the viewing direction
    const planeNormal = new THREE.Vector3(R[0][2], R[1][2], R[2][2]).normalize();

    return { planeRight, planeUp, planeNormal };
  },

  /**
   * Convert axis state to spreads for projection plane
   * Maps XYZ/WXYZ axis selection to ZYX Euler rotation spreads
   *
   * @returns {Array<number>} [s1, s2, s3] spreads for current axis
   */
  _axisToSpreads: function () {
    const { basis, axis } = RTProjections.state;

    if (basis === "cartesian") {
      // Cartesian axes: simple plane-aligned projections
      switch (axis) {
        case "x": // YZ plane, normal = (1,0,0)
          return [0.5, 0.5, 0]; // Rotate 90° around Y, then Z
        case "y": // XZ plane, normal = (0,1,0)
          return [0, 0.5, 0.5]; // Rotate 90° around X, then Y
        case "z": // XY plane, normal = (0,0,1)
        default:
          return [0, 0, 0]; // No rotation - default XY plane
      }
    } else {
      // Tetrahedral (Quadray) axes
      // Normals point toward tetrahedron vertices: (±1,±1,±1)/√3
      switch (axis) {
        case "qw": // (1,1,1)/√3
          return [0.25, 0.25, 0.25]; // s=0.25 → θ=30° each axis
        case "qx": // (1,-1,-1)/√3
          return [0.25, 0.25, 0.75];
        case "qy": // (-1,1,-1)/√3
          return [0.75, 0.25, 0.25];
        case "qz": // (-1,-1,1)/√3
        default:
          return [0.25, 0.75, 0.25];
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create projection visualization (rays, hull, nodes)
   *
   * @param {THREE.Group} polyhedronGroup - The polyhedron to project
   * @param {Object} options - Visualization options
   */
  _createProjectionVisualization: function (polyhedronGroup, options) {
    const { showRays, showInterior, showIdealPolygon, rayColor } = options;

    // Get vertices from polyhedron
    const worldVertices = RTProjections._getWorldVerticesFromGroup(polyhedronGroup);
    if (worldVertices.length === 0) {
      console.warn("⚠️ No vertices found in polyhedron group");
      return;
    }

    // Create group for all visualization objects
    const group = new THREE.Group();
    group.name = "projectionVisualization";

    // Get center of the polyhedron
    const center = new THREE.Vector3();
    worldVertices.forEach((v) => center.add(v));
    center.divideScalar(worldVertices.length);

    // Get projection plane basis - use custom spreads from preset/options if available
    const spreads =
      options.spreads ||
      RTProjections.state.customSpreads ||
      RTProjections._axisToSpreads();
    const { planeRight, planeUp, planeNormal } =
      RTProjections._getProjectionPlaneBasis(spreads);

    // Projection plane is at distance along the normal from center
    const planeCenter = center
      .clone()
      .addScaledVector(planeNormal, RTProjections.state.distance);

    // Project vertices to the plane
    const projectedPoints = []; // 2D coordinates in plane space
    const projected3D = []; // 3D world positions on plane

    worldVertices.forEach((vertex, i) => {
      // Project vertex onto plane along planeNormal direction
      const toVertex = vertex.clone().sub(planeCenter);
      const distAlongNormal = toVertex.dot(planeNormal);
      const projectedPoint = vertex
        .clone()
        .addScaledVector(planeNormal, -distAlongNormal);

      // Convert to 2D plane coordinates
      const localPoint = projectedPoint.clone().sub(planeCenter);
      const x = localPoint.dot(planeRight);
      const y = localPoint.dot(planeUp);

      projectedPoints.push({
        x,
        y,
        vertex3D: vertex,
        projected3D: projectedPoint,
        index: i,
      });
      projected3D.push(projectedPoint);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 1. PROJECTION RAYS
    // ═══════════════════════════════════════════════════════════════════════
    if (showRays) {
      const rayMaterial = new THREE.LineBasicMaterial({
        color: rayColor,
        transparent: true,
        opacity: 0.5,
        depthTest: true,
      });

      projectedPoints.forEach((p, i) => {
        const rayGeometry = new THREE.BufferGeometry().setFromPoints([
          p.vertex3D,
          p.projected3D,
        ]);
        const ray = new THREE.Line(rayGeometry, rayMaterial.clone());
        ray.name = `projectionRay-${i}`;
        group.add(ray);
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. COMPUTE CONVEX HULL of projected points
    // ═══════════════════════════════════════════════════════════════════════
    const hull2D = RTProjections._computeConvexHull2D(
      projectedPoints.map((p) => ({ x: p.x, y: p.y }))
    );

    // Convert hull back to 3D
    const hullVertices3D = hull2D.map((p) => {
      return planeCenter
        .clone()
        .addScaledVector(planeRight, p.x)
        .addScaledVector(planeUp, p.y);
    });
    hullVertices3D.push(hullVertices3D[0].clone()); // Close the loop

    // ═══════════════════════════════════════════════════════════════════════
    // 3. ACTUAL HULL (YELLOW polygon)
    // ═══════════════════════════════════════════════════════════════════════
    const actualGeometry = new THREE.BufferGeometry().setFromPoints(hullVertices3D);
    const actualMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.95,
      depthTest: true,
    });
    const actualLine = new THREE.Line(actualGeometry, actualMaterial);
    actualLine.renderOrder = 1000;
    actualLine.name = "actualHull";
    group.add(actualLine);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. IDEAL REGULAR POLYGON (CYAN) for comparison
    // ═══════════════════════════════════════════════════════════════════════
    if (showIdealPolygon) {
      // Calculate radius from hull for matching scale
      let maxRadius = 0;
      hull2D.forEach((p) => {
        const r = Math.sqrt(p.x * p.x + p.y * p.y);
        if (r > maxRadius) maxRadius = r;
      });

      const n = hull2D.length; // Number of hull vertices
      const idealVertices = [];
      for (let i = 0; i <= n; i++) {
        const angle = (2 * Math.PI * i) / n;
        const x = maxRadius * Math.cos(angle);
        const y = maxRadius * Math.sin(angle);
        idealVertices.push(
          planeCenter
            .clone()
            .addScaledVector(planeRight, x)
            .addScaledVector(planeUp, y)
        );
      }

      const idealGeometry = new THREE.BufferGeometry().setFromPoints(idealVertices);
      const idealMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6,
        depthTest: true,
      });
      const idealLine = new THREE.Line(idealGeometry, idealMaterial);
      idealLine.renderOrder = 999;
      idealLine.name = "idealPolygon";
      group.add(idealLine);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. VERTEX NODES
    // ═══════════════════════════════════════════════════════════════════════
    const nodeRadius = 0.04;
    const nodeGeometry = new THREE.SphereGeometry(nodeRadius, 12, 12);

    // Yellow nodes at hull vertices
    const hullNodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < hullVertices3D.length - 1; i++) {
      const node = new THREE.Mesh(nodeGeometry, hullNodeMaterial.clone());
      node.position.copy(hullVertices3D[i]);
      node.name = `hullNode-${i}`;
      group.add(node);
    }

    // Interior nodes (if enabled)
    if (showInterior) {
      // Find which projected points are NOT on hull
      const hullSet = new Set(hull2D.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`));
      const interiorPoints = projectedPoints.filter(
        (p) => !hullSet.has(`${p.x.toFixed(6)},${p.y.toFixed(6)}`)
      );

      const interiorNodeMaterial = new THREE.MeshBasicMaterial({
        color: rayColor || 0x00ffff,
        transparent: true,
        opacity: 0.6,
      });
      const smallNodeGeom = new THREE.SphereGeometry(nodeRadius * 0.5, 8, 8);

      interiorPoints.forEach((p, i) => {
        const node = new THREE.Mesh(smallNodeGeom, interiorNodeMaterial.clone());
        node.position.copy(p.projected3D);
        node.name = `interiorNode-${i}`;
        group.add(node);
      });
    }

    // Add to scene
    RTProjections._scene.add(group);
    RTProjections._projectionGroup = group;

    // Update info display
    RTProjections._updateProjectionInfo(hull2D.length, worldVertices.length);

    console.log(
      `📐 Projection complete: ${worldVertices.length} vertices → ${hull2D.length}-gon hull`
    );
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update the projection info display
   *
   * @param {number} hullCount - Number of hull vertices
   * @param {number} totalVertices - Total polyhedron vertices
   */
  _updateProjectionInfo: function (hullCount, totalVertices) {
    const infoEl = document.getElementById("projectionInfo");
    if (infoEl) {
      const { axis, presetName } = RTProjections.state;
      // Handle custom spreads (presets) where axis is null
      let axisLabel;
      if (axis === null && presetName) {
        axisLabel = `Custom (${presetName})`;
      } else if (axis) {
        axisLabel = axis.toUpperCase();
      } else {
        axisLabel = "Custom";
      }
      infoEl.textContent = `Axis: ${axisLabel} | Hull: ${hullCount} vertices (${totalVertices} source)`;
    }
  },

  /**
   * Update axis info display when axis changes
   */
  _updateAxisInfo: function () {
    const infoEl = document.getElementById("projectionInfo");
    if (infoEl && !RTProjections.state.enabled) {
      const { basis, axis } = RTProjections.state;
      const axisLabel = basis === "cartesian" ? axis.toUpperCase() : axis.toUpperCase();
      infoEl.textContent = `Axis: ${axisLabel} | Hull: -- vertices`;
    }
  },
};
