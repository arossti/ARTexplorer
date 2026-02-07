/**
 * RT-PrimeCuts Module
 * Prime polygon projection visualization for Gauss-Wantzel bypass research
 *
 * Demonstrates that prime n-gons (7, 11, 13...) emerge as projections
 * of 3D polyhedra/compounds at rational-spread viewing angles.
 *
 * Extracted from rt-papercut.js using Shadow & Swap pattern.
 * See: Geometry documents/Prime-Cut-Extract.md
 *
 * @module rt-prime-cuts
 * @author Andy & Claude (2026)
 */

import * as THREE from "three";
import { QuadrayPolyhedra } from "./rt-quadray-polyhedra.js";

export const RTPrimeCuts = {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  _primePolygonGroup: null,
  _primePolygonVisible: false,
  _renderer: null,
  _papercutRef: null, // Reference to RTPapercut for cutplane callbacks

  /**
   * Initialize with renderer reference
   * Called from rt-init.js after scene setup
   * @param {THREE.WebGLRenderer} renderer - The WebGL renderer
   * @param {Object} papercutRef - Reference to RTPapercut module (for cutplane integration)
   */
  init: function (renderer, papercutRef = null) {
    RTPrimeCuts._renderer = renderer;
    RTPrimeCuts._papercutRef = papercutRef;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Show or hide the prime projection visualization
   *
   * VISUALIZATION COMPONENTS:
   * 1. Finds the actual Quadray Truncated Tetrahedron in the scene
   * 2. Draws projection RAYS from each vertex toward the projection plane
   * 3. Shows projection plane at a distance with YELLOW (actual) and CYAN (ideal) polygons
   * 4. NO cutplane activation (projection ≠ section cut)
   *
   * @param {number|null} n - Number of sides (7, 5, etc.) or null to hide
   * @param {THREE.Scene} scene - Scene to add/remove visualization from
   * @param {THREE.Camera} camera - Camera reference
   * @param {number} planeDistance - Distance from polyhedron center to projection plane (default: 5)
   */
  showPrimePolygon: async function (n, scene, camera, planeDistance = 5) {
    console.log("🔍 showPrimePolygon called with:", { n, scene: !!scene, camera: !!camera, planeDistance });

    // Validate inputs
    if (!scene) {
      console.error("❌ showPrimePolygon: scene is undefined!");
      return;
    }
    if (!camera) {
      console.error("❌ showPrimePolygon: camera is undefined!");
      return;
    }

    // Remove existing visualization if any
    if (RTPrimeCuts._primePolygonGroup) {
      console.log("🧹 Removing existing projection visualization");
      scene.remove(RTPrimeCuts._primePolygonGroup);
      RTPrimeCuts._primePolygonGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      RTPrimeCuts._primePolygonGroup = null;
    }

    // If n is null, just hide (already removed above)
    if (!n) {
      RTPrimeCuts._primePolygonVisible = false;
      RTPrimeCuts._hideProjectionInfo();
      console.log("📐 Prime projection visualization hidden");
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GET VERTICES FOR PROJECTION
    // For 5/7-gon: Use truncated tetrahedron from scene (12 vertices)
    // For 11/13-gon: Generate compound polyhedra (24 vertices) - BREAKTHROUGH!
    // ═══════════════════════════════════════════════════════════════════════
    let worldVertices = [];
    const isCompoundProjection = (n === 11 || n === 13);

    if (isCompoundProjection) {
      // Find the actual compound polyhedron in the scene (same as 5/7-gon approach)
      let compoundGroup = null;
      scene.traverse(obj => {
        if (obj.userData?.type === "quadrayCompound") {
          compoundGroup = obj;
        }
      });

      if (!compoundGroup || !compoundGroup.visible) {
        console.warn("⚠️ Quadray Compound not found or not visible in scene");
        console.log("   Please enable 'Quadray Compound (TruncTet + Icosa)' checkbox first");
        RTPrimeCuts._hideProjectionInfo();
        return;
      }

      worldVertices = RTPrimeCuts._getWorldVerticesFromGroup(compoundGroup);
      if (worldVertices.length === 0) {
        // Fallback to generating vertices if extraction fails
        console.warn("⚠️ Could not extract vertices from compound, generating programmatically");
        worldVertices = await RTPrimeCuts._generateCompoundVertices();
      }
      console.log("   Found", worldVertices.length, "vertices from compound (trunc tet + icosa)");
    } else {
      // Find the actual truncated tetrahedron in the scene (using userData.type)
      let truncTetGroup = null;
      scene.traverse(obj => {
        if (obj.userData?.type === "quadrayTruncatedTet") {
          truncTetGroup = obj;
        }
      });

      if (!truncTetGroup || !truncTetGroup.visible) {
        console.warn("⚠️ Quadray Truncated Tetrahedron not found or not visible in scene");
        console.log("   Please enable 'Quadray Truncated Tetrahedron' checkbox first");
        RTPrimeCuts._hideProjectionInfo();
        return;
      }

      worldVertices = RTPrimeCuts._getWorldVerticesFromGroup(truncTetGroup);
      if (worldVertices.length === 0) {
        console.error("❌ Could not extract vertices from truncated tetrahedron");
        return;
      }
      console.log("   Found", worldVertices.length, "vertices from scene mesh");
    }

    console.log("🔨 Creating projection visualization for", n, "-hull");
    const group = new THREE.Group();
    group.name = `primeProjection-${n}`;

    // Get center of the polyhedron
    const center = new THREE.Vector3();
    worldVertices.forEach(v => center.add(v));
    center.divideScalar(worldVertices.length);

    // ═══════════════════════════════════════════════════════════════════════
    // COMPUTE PROJECTION PLANE BASIS from viewing spreads
    // ═══════════════════════════════════════════════════════════════════════
    const { planeRight, planeUp, planeNormal } = RTPrimeCuts._getProjectionPlaneBasis(n);
    console.log("   Projection direction:", planeNormal.x.toFixed(3), planeNormal.y.toFixed(3), planeNormal.z.toFixed(3));

    // Projection plane is at distance along the normal from center
    const planeCenter = center.clone().addScaledVector(planeNormal, planeDistance);

    // ═══════════════════════════════════════════════════════════════════════
    // PROJECT VERTICES TO THE PLANE
    // Track component membership: first 12 = truncated tet, next 12 = icosahedron
    // ═══════════════════════════════════════════════════════════════════════
    const projectedPoints = []; // 2D coordinates in plane space
    const projected3D = []; // 3D world positions on plane

    worldVertices.forEach((vertex, i) => {
      // Project vertex onto plane along planeNormal direction
      const toVertex = vertex.clone().sub(planeCenter);
      const distAlongNormal = toVertex.dot(planeNormal);
      const projectedPoint = vertex.clone().addScaledVector(planeNormal, -distAlongNormal);

      // Convert to 2D plane coordinates
      const localPoint = projectedPoint.clone().sub(planeCenter);
      const x = localPoint.dot(planeRight);
      const y = localPoint.dot(planeUp);

      // Track component: first 12 = truncated tet (yellow-green), rest = icosahedron (cyan)
      const component = (isCompoundProjection && i >= 12) ? "icosahedron" : "truncatedTet";
      projectedPoints.push({ x, y, vertex3D: vertex, projected3D: projectedPoint, component, index: i });
      projected3D.push(projectedPoint);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 1. PROJECTION RAYS - Color-coded by component
    //    Yellow-green for truncated tetrahedron, Cyan for icosahedron
    // ═══════════════════════════════════════════════════════════════════════
    const truncTetRayMaterial = new THREE.LineBasicMaterial({
      color: 0xaaff00, // Yellow-green (matches trunc tet mesh color)
      transparent: true,
      opacity: 0.5,
      depthTest: true,
    });
    const icosaRayMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff, // Cyan (matches icosahedron mesh color)
      transparent: true,
      opacity: 0.5,
      depthTest: true,
    });

    let truncTetCount = 0, icosaCount = 0;
    projectedPoints.forEach((p, i) => {
      const rayMaterial = p.component === "icosahedron" ? icosaRayMaterial : truncTetRayMaterial;
      const rayGeometry = new THREE.BufferGeometry().setFromPoints([p.vertex3D, p.projected3D]);
      const ray = new THREE.Line(rayGeometry, rayMaterial);
      ray.name = `projectionRay-${p.component}-${i}`;
      group.add(ray);
      if (p.component === "icosahedron") icosaCount++; else truncTetCount++;
    });
    console.log(`   ✓ Added ${projectedPoints.length} projection rays (${truncTetCount} trunc tet, ${icosaCount} icosa)`);

    // ═══════════════════════════════════════════════════════════════════════
    // 2. COMPUTE CONVEX HULL of projected points
    // ═══════════════════════════════════════════════════════════════════════
    const hull2D = RTPrimeCuts._computeConvexHull2D(projectedPoints.map(p => ({ x: p.x, y: p.y })));
    console.log("   ✓ Hull has", hull2D.length, "vertices (expected:", n, ")");

    // Convert hull back to 3D
    const hullVertices3D = hull2D.map(p => {
      return planeCenter.clone()
        .addScaledVector(planeRight, p.x)
        .addScaledVector(planeUp, p.y);
    });
    hullVertices3D.push(hullVertices3D[0].clone()); // Close the loop

    // ═══════════════════════════════════════════════════════════════════════
    // 3. ACTUAL HULL (YELLOW polygon) - Simple hairline
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
    // 4. IDEAL REGULAR POLYGON (CYAN) for comparison - Simple hairline
    // ═══════════════════════════════════════════════════════════════════════
    // Calculate radius from hull for matching scale
    let maxRadius = 0;
    hull2D.forEach(p => {
      const r = Math.sqrt(p.x * p.x + p.y * p.y);
      if (r > maxRadius) maxRadius = r;
    });

    const idealVertices = [];
    for (let i = 0; i <= n; i++) {
      const angle = (2 * Math.PI * i) / n;
      const x = maxRadius * Math.cos(angle);
      const y = maxRadius * Math.sin(angle);
      idealVertices.push(
        planeCenter.clone()
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

    // ═══════════════════════════════════════════════════════════════════════
    // 5. VERTEX NODES on hull and projected points
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

    // Cyan nodes at ideal vertices
    const idealNodeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 0; i < idealVertices.length - 1; i++) {
      const node = new THREE.Mesh(nodeGeometry.clone(), idealNodeMaterial.clone());
      node.position.copy(idealVertices[i]);
      node.name = `idealNode-${i}`;
      group.add(node);
    }

    // Component-colored nodes at all projected points (showing interior vs hull)
    // Yellow-green for truncated tet, cyan for icosahedron
    const truncTetProjNodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaff00, // Yellow-green (matches trunc tet)
      transparent: true,
      opacity: 0.6,
    });
    const icosaProjNodeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff, // Cyan (matches icosahedron)
      transparent: true,
      opacity: 0.6,
    });
    const smallNodeGeom = new THREE.SphereGeometry(nodeRadius * 0.5, 8, 8);

    projectedPoints.forEach((p, i) => {
      const nodeMaterial = p.component === "icosahedron" ? icosaProjNodeMaterial : truncTetProjNodeMaterial;
      const node = new THREE.Mesh(smallNodeGeom, nodeMaterial.clone());
      node.position.copy(p.projected3D);
      node.name = `projectedPoint-${p.component}-${i}`;
      group.add(node);
    });

    console.log("   ✓ Added vertex nodes (yellow=hull, yellow-green=trunc tet proj, cyan=icosa proj)");

    // ═══════════════════════════════════════════════════════════════════════
    // FINAL SETUP
    // ═══════════════════════════════════════════════════════════════════════
    scene.add(group);
    RTPrimeCuts._primePolygonGroup = group;
    RTPrimeCuts._primePolygonVisible = true;

    const sourceDesc = isCompoundProjection
      ? `${worldVertices.length} vertices from Compound (TruncTet + Icosa)`
      : `${worldVertices.length} vertices from Quadray Truncated Tetrahedron`;
    console.log(`📐 Projection visualization complete:`);
    console.log(`   Source: ${sourceDesc}`);
    console.log(`   Projection: ${hull2D.length}-vertex hull (YELLOW) vs ${n}-vertex ideal (CYAN)`);
    console.log(`   Plane distance: ${planeDistance} units from polyhedron center`);
    if (isCompoundProjection) {
      console.log(`   Components: Yellow-green rays/nodes = TruncTet (12v), Cyan rays/nodes = Icosa (12v)`);
    }

    // Update UI info display
    RTPrimeCuts._updateProjectionInfo(n);
  },

  /**
   * Update polygon orientation to match camera (call on camera change)
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  updatePrimePolygonOrientation: function (scene, camera) {
    if (!RTPrimeCuts._primePolygonVisible || !RTPrimeCuts._primePolygonGroup) {
      return;
    }

    // Extract n from group name
    const match = RTPrimeCuts._primePolygonGroup.name.match(/primePolygon-(\d+)/);
    if (!match) return;

    const n = parseInt(match[1]);
    const radius = 1.5; // Default radius

    // Recreate polygon with new orientation
    RTPrimeCuts.showPrimePolygon(n, scene, camera, radius);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECTION MATH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get projection plane basis vectors from viewing spreads
   * Returns the plane where the n-gon projection lives (fixed in 3D space)
   *
   * @param {number} n - Number of sides (7 for heptagon, 5 for pentagon)
   * @returns {{planeRight: THREE.Vector3, planeUp: THREE.Vector3, planeNormal: THREE.Vector3}}
   */
  _getProjectionPlaneBasis: function (n) {
    // Get viewing spreads for this n-gon from breakthrough results
    // Reference: results/prime_breakthrough_20260206_145052.json
    let s1, s2, s3;
    if (n === 5) {
      s1 = 0; s2 = 0; s3 = 0.5; // Truncated tetrahedron
    } else if (n === 7) {
      // TODO: 7-gon needs compound (TruncTet + Tet, 16v) NOT truncated tet alone!
      // Current spreads (0.11, 0.5, 0) produce 9-hull from trunc tet alone
      // For true 7-hull: use compound at Python (0, 0.04, 0.4) → JS (0, 0.4, 0.04)
      // See: Geometry documents/Polygon-Rationalize.md item 7b
      s1 = 0.11; s2 = 0.5; s3 = 0; // TEMP: produces 9-hull (7-hull needs compound)
    } else if (n === 11) {
      // Swap s2/s3 from Python [0, 0.4, 0.2] to match JS rotation order
      s1 = 0; s2 = 0.2; s3 = 0.4; // Compound (trunc tet + icosa) - BREAKTHROUGH!
    } else if (n === 13) {
      // Swap s2/s3 from Python [0, 0.6, 0.8] to match JS rotation order
      s1 = 0; s2 = 0.8; s3 = 0.6; // Compound (trunc tet + icosa) - BREAKTHROUGH!
    } else {
      // Default: XY plane
      return {
        planeRight: new THREE.Vector3(1, 0, 0),
        planeUp: new THREE.Vector3(0, 1, 0),
        planeNormal: new THREE.Vector3(0, 0, 1),
      };
    }

    // Build rotation matrix from spreads (ZYX Euler)
    // sin(θ) = √s, cos(θ) = √(1-s)
    const sin1 = Math.sqrt(s1), cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2), cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3), cos3 = Math.sqrt(1 - s3);

    // ZYX rotation matrices
    const Rz = [[cos1, -sin1, 0], [sin1, cos1, 0], [0, 0, 1]];
    const Ry = [[cos2, 0, sin2], [0, 1, 0], [-sin2, 0, cos2]];
    const Rx = [[1, 0, 0], [0, cos3, -sin3], [0, sin3, cos3]];

    // Matrix multiply helper
    const matMul = (A, B) => A.map((row, i) =>
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

    console.log(`📐 Projection plane for ${n}-gon: spreads=(${s1}, ${s2}, ${s3})`);
    console.log(`   Right: (${planeRight.x.toFixed(3)}, ${planeRight.y.toFixed(3)}, ${planeRight.z.toFixed(3)})`);
    console.log(`   Up: (${planeUp.x.toFixed(3)}, ${planeUp.y.toFixed(3)}, ${planeUp.z.toFixed(3)})`);
    console.log(`   Normal: (${planeNormal.x.toFixed(3)}, ${planeNormal.y.toFixed(3)}, ${planeNormal.z.toFixed(3)})`);

    return { planeRight, planeUp, planeNormal };
  },

  /**
   * Compute 2D convex hull using Graham scan
   * @param {Array<{x,y}>} points - 2D points
   * @returns {Array<{x,y}>} Hull vertices in CCW order
   */
  _computeConvexHull2D: function (points) {
    // Remove duplicates (within tolerance)
    const unique = [];
    const tol = 1e-8;
    points.forEach(p => {
      if (!unique.some(u => Math.abs(u.x - p.x) < tol && Math.abs(u.y - p.y) < tol)) {
        unique.push(p);
      }
    });

    if (unique.length < 3) return unique;

    // Find lowest point (and leftmost if tie)
    let lowest = 0;
    for (let i = 1; i < unique.length; i++) {
      if (unique[i].y < unique[lowest].y ||
          (unique[i].y === unique[lowest].y && unique[i].x < unique[lowest].x)) {
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

    console.log(`   _computeConvexHull2D: ${unique.length} unique points → ${hull.length} hull vertices`);
    return hull;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VERTEX EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract world-space vertices from a polyhedron group
   * Skips node spheres (userData.isVertexNode = true) to get only face mesh vertices
   * Uses coarse tolerance to collapse triangulated mesh back to actual polyhedron vertices
   *
   * @param {THREE.Group} group - The polyhedron group
   * @returns {Array<THREE.Vector3>} World-space vertices (12 for truncated tetrahedron)
   */
  _getWorldVerticesFromGroup: function (group) {
    const vertices = [];
    const seen = new Set();

    // Coarse tolerance (2 decimal places) to collapse triangulated mesh vertices
    // back to the actual polyhedron vertices
    const TOLERANCE_DECIMALS = 2;

    group.traverse(obj => {
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

    console.log(`   _getWorldVerticesFromGroup: ${vertices.length} vertices (skipped node spheres)`);
    return vertices;
  },

  /**
   * Generate compound polyhedra vertices (truncated tetrahedron + icosahedron)
   * Used for 11-gon and 13-gon projections - BREAKTHROUGH compound that bypasses Gauss-Wantzel!
   *
   * Reuses QuadrayPolyhedra.compoundTruncTetIcosahedron for consistency.
   *
   * @returns {Promise<Array<THREE.Vector3>>} 24 vertices (12 from trunc tet + 12 from icosahedron)
   */
  _generateCompoundVertices: async function () {
    // Reuse the existing compound generator from rt-quadray-polyhedra.js
    const compound = await QuadrayPolyhedra.compoundTruncTetIcosahedron(1, { normalize: true });
    console.log(`   _generateCompoundVertices: ${compound.vertices.length} vertices (reusing QuadrayPolyhedra)`);
    return compound.vertices;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUALIZATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create ACTUAL projection hull vertices from truncated tetrahedron
   * NOT a fake regular polygon - uses real projection computation!
   *
   * @param {number} n - Number of sides (7 for heptagon projection)
   * @param {number} radius - Target radius for scaling the projection
   * @param {THREE.Camera} camera - Camera to align polygon perpendicular to view
   * @returns {Array<THREE.Vector3>} Polygon vertices from ACTUAL projection
   */
  _createProjectionHullVertices: function (n, radius, camera) {
    console.log("📐 _createProjectionHullVertices: ACTUAL projection for", n, "-hull");

    // Get view plane basis vectors
    const viewDir = new THREE.Vector3();
    camera.getWorldDirection(viewDir);
    const up = camera.up.clone().normalize();
    const right = new THREE.Vector3().crossVectors(viewDir, up).normalize();
    const planeUp = new THREE.Vector3().crossVectors(right, viewDir).normalize();

    // Truncated tetrahedron vertices (normalized, from rt-math.js)
    // These are permutations of (3,1,1) with even parity, normalized
    const truncTetVertices = [
      [3, 1, 1], [3, -1, -1], [1, 3, 1], [1, -3, -1],
      [1, 1, 3], [1, -1, -3], [-3, 1, -1], [-3, -1, 1],
      [-1, 3, -1], [-1, -3, 1], [-1, 1, -3], [-1, -1, 3]
    ].map(v => {
      const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
      return [v[0]/len, v[1]/len, v[2]/len];
    });

    // Get viewing spreads for this n-gon
    // 7-hull: s=(0.11, 0, 0.5), 5-gon: s=(0, 0, 0.5)
    let s1, s2, s3;
    if (n === 7) {
      s1 = 0.11; s2 = 0; s3 = 0.5;
    } else if (n === 5) {
      s1 = 0; s2 = 0; s3 = 0.5;
    } else {
      // Fallback: no projection defined, use regular polygon
      console.warn("⚠️ No projection defined for", n, "-gon, using regular polygon");
      return this._createRegularPolygonVerticesFallback(n, radius, camera);
    }

    // Build rotation matrix from spreads (ZYX Euler)
    // sin(θ) = √s, cos(θ) = √(1-s)
    const sin1 = Math.sqrt(s1), cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2), cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3), cos3 = Math.sqrt(1 - s3);

    // Rotation matrices
    const Rz = [[cos1, -sin1, 0], [sin1, cos1, 0], [0, 0, 1]];
    const Ry = [[cos2, 0, sin2], [0, 1, 0], [-sin2, 0, cos2]];
    const Rx = [[1, 0, 0], [0, cos3, -sin3], [0, sin3, cos3]];

    // Matrix multiply helper
    const matMul = (A, B) => A.map((row, i) =>
      B[0].map((_, j) => row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0))
    );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Apply rotation and project to 2D
    const projected2D = truncTetVertices.map(v => {
      const rx = R[0][0]*v[0] + R[0][1]*v[1] + R[0][2]*v[2];
      const ry = R[1][0]*v[0] + R[1][1]*v[1] + R[1][2]*v[2];
      return { x: rx, y: ry };
    });

    // Compute convex hull (Graham scan)
    const hull = this._computeConvexHull2D(projected2D);
    console.log("   Hull vertices:", hull.length, "(expected:", n, ")");

    // Log interior angles for verification
    const angles = [];
    for (let i = 0; i < hull.length; i++) {
      const prev = hull[(i - 1 + hull.length) % hull.length];
      const curr = hull[i];
      const next = hull[(i + 1) % hull.length];
      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      const cosAng = Math.max(-1, Math.min(1, dot / (len1 * len2)));
      angles.push(Math.round(Math.acos(cosAng) * 180 / Math.PI));
    }
    console.log("   Interior angles:", angles.join("°, ") + "°");

    // Scale to target radius (find max distance from centroid)
    const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
    let maxDist = 0;
    hull.forEach(p => {
      const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      if (d > maxDist) maxDist = d;
    });
    const scale = radius / maxDist;

    // Convert to 3D vertices in camera view plane
    const vertices = [];
    hull.forEach(p => {
      const x = (p.x - cx) * scale;
      const y = (p.y - cy) * scale;
      const vertex = new THREE.Vector3()
        .addScaledVector(right, x)
        .addScaledVector(planeUp, y);
      vertices.push(vertex);
    });
    // Close the loop
    vertices.push(vertices[0].clone());

    console.log("   ✓ ACTUAL projection hull with", hull.length, "vertices (irregular!)");
    return vertices;
  },

  /**
   * Fallback: regular polygon for n-gons without projection definition
   */
  _createRegularPolygonVerticesFallback: function (n, radius, camera) {
    const viewDir = new THREE.Vector3();
    camera.getWorldDirection(viewDir);
    const up = camera.up.clone().normalize();
    const right = new THREE.Vector3().crossVectors(viewDir, up).normalize();
    const planeUp = new THREE.Vector3().crossVectors(right, viewDir).normalize();

    const vertices = [];
    for (let i = 0; i <= n; i++) {
      const angle = (2 * Math.PI * i) / n;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      vertices.push(new THREE.Vector3().addScaledVector(right, x).addScaledVector(planeUp, y));
    }
    return vertices;
  },

  /**
   * Create ACTUAL projection hull vertices in the fixed projection plane
   * @param {number} n - Number of sides
   * @param {number} radius - Target radius
   * @param {THREE.Vector3} planeRight - Plane's X axis
   * @param {THREE.Vector3} planeUp - Plane's Y axis
   * @returns {Array<THREE.Vector3>} Vertices in 3D space
   */
  _createProjectionHullVerticesFixed: function (n, radius, planeRight, planeUp) {
    // Truncated tetrahedron vertices (normalized)
    const truncTetVertices = [
      [3, 1, 1], [3, -1, -1], [1, 3, 1], [1, -3, -1],
      [1, 1, 3], [1, -1, -3], [-3, 1, -1], [-3, -1, 1],
      [-1, 3, -1], [-1, -3, 1], [-1, 1, -3], [-1, -1, 3]
    ].map(v => {
      const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
      return [v[0]/len, v[1]/len, v[2]/len];
    });

    // Get viewing spreads
    let s1, s2, s3;
    if (n === 7) {
      s1 = 0.11; s2 = 0; s3 = 0.5;
    } else if (n === 5) {
      s1 = 0; s2 = 0; s3 = 0.5;
    } else {
      s1 = 0; s2 = 0; s3 = 0;
    }

    // Build rotation matrix from spreads
    const sin1 = Math.sqrt(s1), cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2), cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3), cos3 = Math.sqrt(1 - s3);

    const Rz = [[cos1, -sin1, 0], [sin1, cos1, 0], [0, 0, 1]];
    const Ry = [[cos2, 0, sin2], [0, 1, 0], [-sin2, 0, cos2]];
    const Rx = [[1, 0, 0], [0, cos3, -sin3], [0, sin3, cos3]];

    const matMul = (A, B) => A.map((row, i) =>
      B[0].map((_, j) => row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0))
    );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Apply rotation and project to 2D (in rotated frame)
    const projected2D = truncTetVertices.map(v => {
      const rx = R[0][0]*v[0] + R[0][1]*v[1] + R[0][2]*v[2];
      const ry = R[1][0]*v[0] + R[1][1]*v[1] + R[1][2]*v[2];
      return { x: rx, y: ry };
    });

    // Compute convex hull
    const hull = this._computeConvexHull2D(projected2D);

    // Scale to target radius
    const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
    let maxDist = 0;
    hull.forEach(p => {
      const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      if (d > maxDist) maxDist = d;
    });
    const scale = radius / maxDist;

    // Convert to 3D vertices in the FIXED projection plane
    const vertices = [];
    hull.forEach(p => {
      const x = (p.x - cx) * scale;
      const y = (p.y - cy) * scale;
      const vertex = new THREE.Vector3()
        .addScaledVector(planeRight, x)
        .addScaledVector(planeUp, y);
      vertices.push(vertex);
    });
    vertices.push(vertices[0].clone()); // Close the loop

    return vertices;
  },

  /**
   * Create regular polygon vertices in the fixed projection plane
   * @param {number} n - Number of sides
   * @param {number} radius - Circumradius
   * @param {THREE.Vector3} planeRight - Plane's X axis
   * @param {THREE.Vector3} planeUp - Plane's Y axis
   * @returns {Array<THREE.Vector3>} Vertices in 3D space
   */
  _createRegularPolygonVerticesFixed: function (n, radius, planeRight, planeUp) {
    const vertices = [];
    for (let i = 0; i <= n; i++) {
      const angle = (2 * Math.PI * i) / n;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      const vertex = new THREE.Vector3()
        .addScaledVector(planeRight, x)
        .addScaledVector(planeUp, y);
      vertices.push(vertex);
    }
    return vertices;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CUTPLANE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Activate the Papercut cutplane at the prime projection plane orientation
   * This allows the user to see the actual section cut through the truncated tetrahedron
   *
   * @param {number} n - Number of sides (7 or 5)
   * @param {THREE.Scene} scene - Scene reference
   * @param {THREE.Vector3} planeNormal - Normal vector of the projection plane
   */
  _activatePrimeProjectionCutplane: function (n, scene, planeNormal) {
    console.log(`✂️ Activating cutplane for ${n}-gon projection`);

    // Get reference to RTPapercut for state updates
    const papercut = RTPrimeCuts._papercutRef;
    if (!papercut) {
      console.warn("⚠️ RTPapercut reference not set, cutplane integration unavailable");
      return;
    }

    // Create clipping plane with the projection normal, passing through origin
    // THREE.Plane(normal, constant) where constant = -d (distance from origin)
    const plane = new THREE.Plane(planeNormal.clone(), 0);

    // Update state
    papercut.state.cutplaneEnabled = true;
    papercut.state.cutplaneNormal = plane;
    papercut.state.cutplaneValue = 0;

    // Update the UI checkbox to reflect enabled state
    const cutplaneCheckbox = document.getElementById("enableCutPlane");
    if (cutplaneCheckbox) {
      cutplaneCheckbox.checked = true;
    }

    // Update slider display
    const cutplaneValue = document.getElementById("cutplaneValue");
    if (cutplaneValue) {
      cutplaneValue.textContent = "0";
    }
    const cutplaneSlider = document.getElementById("cutplaneSlider");
    if (cutplaneSlider) {
      cutplaneSlider.value = 0;
    }

    // Update axis info display
    const axisInfo = document.getElementById("cutplaneAxisInfo");
    if (axisInfo) {
      axisInfo.textContent = `Axis: ${n}-gon projection plane (custom)`;
    }

    // Apply clipping plane to all renderable objects
    scene.traverse(object => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => {
            mat.clippingPlanes = [plane];
            mat.clipShadows = true;
            mat.needsUpdate = true;
          });
        } else {
          object.material.clippingPlanes = [plane];
          object.material.clipShadows = true;
          object.material.needsUpdate = true;
        }
      }
    });

    // Enable renderer local clipping
    if (RTPrimeCuts._renderer) {
      RTPrimeCuts._renderer.localClippingEnabled = true;
    }

    // Generate intersection edges (if papercut has this method)
    if (papercut._generateIntersectionEdges) {
      papercut._generateIntersectionEdges(scene, plane);
    }

    console.log(`   ✓ Cutplane active with normal: (${planeNormal.x.toFixed(3)}, ${planeNormal.y.toFixed(3)}, ${planeNormal.z.toFixed(3)})`);
  },

  /**
   * Deactivate the prime projection cutplane
   * Called when hiding the prime polygon overlay
   *
   * @param {THREE.Scene} scene - Scene reference
   */
  _deactivatePrimeProjectionCutplane: function (scene) {
    console.log("✂️ Deactivating prime projection cutplane");

    // Get reference to RTPapercut for state updates
    const papercut = RTPrimeCuts._papercutRef;

    // Remove clipping planes from all materials
    scene.traverse(object => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => {
            mat.clippingPlanes = [];
            mat.needsUpdate = true;
          });
        } else {
          object.material.clippingPlanes = [];
          object.material.needsUpdate = true;
        }
      }
    });

    // Disable renderer clipping
    if (RTPrimeCuts._renderer) {
      RTPrimeCuts._renderer.localClippingEnabled = false;
    }

    // Remove intersection lines (if papercut has reference)
    if (papercut && papercut._intersectionLines) {
      scene.remove(papercut._intersectionLines);
      papercut._intersectionLines.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      papercut._intersectionLines = null;
    }

    // Update state
    if (papercut) {
      papercut.state.cutplaneEnabled = false;
      papercut.state.cutplaneNormal = null;
    }

    // Update the UI checkbox
    const cutplaneCheckbox = document.getElementById("enableCutPlane");
    if (cutplaneCheckbox) {
      cutplaneCheckbox.checked = false;
    }

    // Reset axis info display
    const axisInfo = document.getElementById("cutplaneAxisInfo");
    if (axisInfo) {
      axisInfo.textContent = "Axis: Z (Top/Bottom view)";
    }

    console.log("   ✓ Cutplane deactivated");
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update the prime projection info display with Quadray formula
   * Shows DUAL overlay legend: YELLOW (actual) vs CYAN (ideal)
   * @param {number} n - Number of sides
   */
  _updateProjectionInfo: function (n) {
    const infoContainer = document.getElementById("primeProjectionInfo");
    const formulaSpan = document.getElementById("primeProjectionFormula");
    if (!infoContainer || !formulaSpan) return;

    let formulaText = "";

    switch (n) {
      case 7:
        // 7-gon preset: ACTUAL projection from truncated tetrahedron
        // Quadray coords: {2,1,0,0} permutations (12 vertices, ALL RATIONAL)
        // Current spreads s=(0.11, 0, 0.5) produce 9-hull; exact 7-hull TBD
        formulaText =
          "YELLOW: Actual projection hull\n" +
          "  Quadray {2,1,0,0}/3 → s=(0.11,0,½)\n" +
          "  9 vertices (7-hull spread TBD)\n" +
          "CYAN: Ideal regular heptagon\n" +
          "  Classical trig (for comparison)";
        break;

      case 5:
        // 5-gon: ACTUAL projection from truncated tetrahedron
        // Viewing spreads: s=(0, 0, 0.5)
        formulaText =
          "YELLOW: Actual 5-gon projection\n" +
          "  Trunc Tet → s=(0,0,½)\n" +
          "CYAN: Ideal regular pentagon\n" +
          "  Fermat prime - compass constructible";
        break;

      case 11:
        // 11-gon: BREAKTHROUGH - Compound polyhedra
        // Viewing spreads: s=(0, 0.4, 0.2)
        formulaText =
          "★ BREAKTHROUGH: Hendecagon (11-gon)\n" +
          "  Compound (Trunc Tet + Icosa)\n" +
          "  s=(0, 0.4, 0.2) → 24 vertices\n" +
          "  Bypasses Gauss-Wantzel theorem!\n" +
          "  Quintic polynomial - NOT solvable by radicals";
        break;

      case 13:
        // 13-gon: BREAKTHROUGH - Compound polyhedra
        // Viewing spreads: s=(0, 0.6, 0.8)
        formulaText =
          "★ BREAKTHROUGH: Tridecagon (13-gon)\n" +
          "  Compound (Trunc Tet + Icosa)\n" +
          "  s=(0, 0.6, 0.8) → 24 vertices\n" +
          "  Bypasses Gauss-Wantzel theorem!\n" +
          "  Sextic polynomial - NOT solvable by radicals";
        break;

      default:
        // Generic n-gon info
        const s = Math.pow(Math.sin(Math.PI / n), 2);
        formulaText =
          `YELLOW: Actual projection (irregular)\n` +
          `CYAN: Ideal regular ${n}-gon\n` +
          `  s = sin²(π/${n}) ≈ ${s.toFixed(4)}`;
    }

    formulaSpan.textContent = formulaText;
    infoContainer.style.display = "block";
    infoContainer.style.whiteSpace = "pre-line"; // Preserve line breaks
  },

  /**
   * Hide the prime projection info display
   */
  _hideProjectionInfo: function () {
    const infoContainer = document.getElementById("primeProjectionInfo");
    if (infoContainer) {
      infoContainer.style.display = "none";
    }
  },
};
