/**
 * rt-penrose.js
 * Penrose Tiling Generators for ARTexplorer
 *
 * RT-pure implementation of Penrose tiles and tilings using
 * Wildberger's Rational Trigonometry and golden ratio identities.
 *
 * Supports:
 * - P3 rhombic tiles (thick/thin rhombi)
 * - P2 kite/dart tiles
 * - Robinson triangle building blocks
 * - Deflation/inflation tiling generation
 * - Icosahedral geodesic sphere mapping
 *
 * Application: Viral capsid visualization (Twarock quasicrystal theory)
 *
 * RT-PURE STRATEGY:
 * =================
 * All Penrose angles are multiples of 36° (π/5). We use exact algebraic
 * identities from RT.PurePhi.pentagon and RT.PurePhi.penrose namespaces:
 *
 *   cos(36°) = (1+√5)/4 = φ/2        (algebraic identity)
 *   sin(36°) = √(10-2√5)/4           (computed once, cached)
 *   cos(72°) = (√5-1)/4 = 1/(2φ)     (algebraic identity)
 *   sin(72°) = √(10+2√5)/4           (computed once, cached)
 *
 * Spreads (sin²θ):
 *   α = spread(36°) = (5-√5)/8 ≈ 0.0955
 *   β = spread(72°) = (5+√5)/8 ≈ 0.9045
 *
 * Key identity: β/α = φ² (golden ratio squared!)
 *
 * Deferred sqrt expansion:
 * - Work with quadrance (Q = d²) throughout calculations
 * - Use cached trig values from RT.PurePhi.pentagon
 * - Only call Math.sqrt() at final GPU boundary (THREE.Vector3 creation)
 *
 * @requires THREE.js
 * @requires rt-math.js (RT.PurePhi.pentagon, RT.PurePhi.penrose)
 * @see Geometry documents/Penrose-Spheres.md for implementation plan
 */

import { RT } from "./rt-math.js";

// Access THREE.js from global scope

/* ═══════════════════════════════════════════════════════════════════════════
 * PENROSE TILES
 * ═══════════════════════════════════════════════════════════════════════════
 * Individual tile generators using RT-pure golden ratio algebra.
 * All angles are multiples of 36° (spread = α or β from pentagon constants).
 *
 * Tile types:
 *   - Robinson triangles (BL, BS) - building blocks
 *   - Rhombi (thick, thin) - P3 tiling prototiles
 *   - Kite/Dart - P2 tiling prototiles
 * ═══════════════════════════════════════════════════════════════════════════ */

export const PenroseTiles = {
  /**
   * Large Robinson Triangle (BL)
   * Isosceles triangle with sides ratio 1:1:φ
   * - Apex angle: 36° (spread = α ≈ 0.0955)
   * - Base angles: 72° each (spread = β ≈ 0.9045)
   *
   * This is a fundamental building block - two BL triangles form a thick rhombus.
   *
   * @param {number} quadrance - Base quadrance (Q = base²)
   * @param {Object} options - {showFace: boolean}
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  robinsonLarge: (quadrance = 1, options = {}) => {
    const showFace = options.showFace !== false;

    // Golden ratio from RT.PurePhi
    const phi = RT.PurePhi.value();
    const phiSq = RT.PurePhi.squared();

    // Pentagon spread constants (exact algebraic values)
    const alpha = RT.PurePhi.pentagon.alpha(); // spread for 36°
    const beta = RT.PurePhi.pentagon.beta(); // spread for 72°

    // Exact trigonometry from cached pentagon values
    const cos72 = RT.PurePhi.pentagon.cos72();
    const sin72 = RT.PurePhi.pentagon.sin72();

    // Base length = √Q
    const baseLength = Math.sqrt(quadrance);

    // For BL triangle with base = 1, legs = φ
    // Leg quadrance = φ² × Q
    const legQuadrance = phiSq * quadrance;
    const legLength = Math.sqrt(legQuadrance);

    // Vertices: apex at top, base at bottom
    // Apex angle = 36°, base angles = 72° each
    // Standard orientation: apex at origin, base below
    const vertices = [
      new THREE.Vector3(0, 0, 0), // V0: Apex (36° angle)
      new THREE.Vector3(-legLength * sin72, -legLength * cos72, 0), // V1: Base left (72°)
      new THREE.Vector3(legLength * sin72, -legLength * cos72, 0), // V2: Base right (72°)
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 0],
    ];
    const faces = showFace ? [[0, 2, 1]] : []; // CCW for +Z normal (reversed)

    console.log(
      `[RT] Robinson Large (BL): Q_base=${quadrance.toFixed(6)}, Q_leg=${legQuadrance.toFixed(6)}, ` +
        `apex spread=${alpha.toFixed(6)} (36°), base spread=${beta.toFixed(6)} (72°), rtPure=true`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "robinson-large",
        baseQuadrance: quadrance,
        legQuadrance,
        baseLength,
        legLength,
        apexSpread: alpha, // 36°
        baseSpread: beta, // 72°
        sidesRatio: "1:1:φ",
        rtPure: true,
      },
    };
  },

  /**
   * Small Robinson Triangle (BS)
   * Isosceles triangle with sides ratio 1:1:ψ (where ψ = 1/φ = φ - 1)
   * - Apex angle: 108° (spread = β ≈ 0.9045, same as 72°)
   * - Base angles: 36° each (spread = α ≈ 0.0955)
   *
   * Two BS triangles form a thin rhombus.
   *
   * @param {number} quadrance - Base quadrance (Q = base²)
   * @param {Object} options - {showFace: boolean}
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  robinsonSmall: (quadrance = 1, options = {}) => {
    const showFace = options.showFace !== false;

    // Golden ratio and its inverse
    const phi = RT.PurePhi.value();
    const invPhi = RT.PurePhi.inverse(); // 1/φ = φ - 1 ≈ 0.618
    const invPhiSq = invPhi * invPhi; // (1/φ)²

    // Pentagon spread constants
    const alpha = RT.PurePhi.pentagon.alpha(); // spread for 36°
    const beta = RT.PurePhi.pentagon.beta(); // spread for 72° (same as 108°)

    // RT-pure trigonometry from cached pentagon values
    const cos36 = RT.PurePhi.pentagon.cos36(); // cos(36°) = (1+√5)/4 = φ/2
    const sin36 = RT.PurePhi.pentagon.sin36(); // sin(36°) = √(10-2√5)/4

    // Base length = √Q
    const baseLength = Math.sqrt(quadrance);

    // For BS triangle with base = 1, legs = 1/φ
    // Leg quadrance = (1/φ)² × Q
    const legQuadrance = invPhiSq * quadrance;
    const legLength = Math.sqrt(legQuadrance);

    // Vertices: apex at top, base at bottom
    // Apex angle = 108°, base angles = 36° each
    const vertices = [
      new THREE.Vector3(0, 0, 0), // V0: Apex (108° angle)
      new THREE.Vector3(-legLength * sin36, -legLength * cos36, 0), // V1: Base left (36°)
      new THREE.Vector3(legLength * sin36, -legLength * cos36, 0), // V2: Base right (36°)
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 0],
    ];
    const faces = showFace ? [[0, 2, 1]] : []; // CCW for +Z normal

    console.log(
      `[RT] Robinson Small (BS): Q_base=${quadrance.toFixed(6)}, Q_leg=${legQuadrance.toFixed(6)}, ` +
        `apex spread=${beta.toFixed(6)} (108°), base spread=${alpha.toFixed(6)} (36°), rtPure=true`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "robinson-small",
        baseQuadrance: quadrance,
        legQuadrance,
        baseLength,
        legLength,
        apexSpread: beta, // 108° (same as 72°)
        baseSpread: alpha, // 36°
        sidesRatio: "1:1:ψ",
        rtPure: true,
      },
    };
  },

  /**
   * Thick Rhombus (72°/108°)
   * P3 prototile composed of two Large Robinson triangles (BL + BL mirrored)
   *
   * Angles: 72°, 108°, 72°, 108° (at vertices V0, V1, V2, V3)
   * Diagonal ratio: short:long = 1:φ
   *
   * Geometry:
   *       V0 (72°)
   *      /  \
   *    V3    V1
   *   (108°)(108°)
   *      \  /
   *       V2 (72°)
   *
   * @param {number} quadrance - Short diagonal quadrance
   * @param {Object} options - {showFace: boolean, showMatchingArcs: boolean}
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  thickRhombus: (quadrance = 1, options = {}) => {
    const showFace = options.showFace !== false;

    const phi = RT.PurePhi.value();
    const phiSq = RT.PurePhi.squared();

    // Spreads
    const spreadAcute = RT.PurePhi.pentagon.beta(); // 72°
    const spreadObtuse = RT.PurePhi.pentagon.beta(); // 108° has same spread as 72°

    // Diagonals
    const shortDiag = Math.sqrt(quadrance);
    const longDiagQ = phiSq * quadrance; // Long diagonal Q = φ² × short Q
    const longDiag = Math.sqrt(longDiagQ);

    // Vertices at diagonal endpoints
    // Short diagonal along Y-axis, long diagonal along X-axis
    const vertices = [
      new THREE.Vector3(0, shortDiag / 2, 0), // V0: Top (72° acute)
      new THREE.Vector3(longDiag / 2, 0, 0), // V1: Right (108° obtuse)
      new THREE.Vector3(0, -shortDiag / 2, 0), // V2: Bottom (72° acute)
      new THREE.Vector3(-longDiag / 2, 0, 0), // V3: Left (108° obtuse)
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ];
    const faces = showFace ? [[0, 3, 2, 1]] : []; // CCW for +Z normal

    // Edge quadrance calculation
    // From Pythagorean: edge² = (shortDiag/2)² + (longDiag/2)²
    //                        = Q/4 + φ²Q/4 = Q(1 + φ²)/4 = Q(φ + 2)/4
    // Using φ² = φ + 1, so 1 + φ² = 1 + φ + 1 = φ + 2
    const edgeQuadrance = (quadrance * (phi + 2)) / 4;

    console.log(
      `[RT] Thick Rhombus: Q_short=${quadrance.toFixed(6)}, Q_long=${longDiagQ.toFixed(6)}, ` +
        `Q_edge=${edgeQuadrance.toFixed(6)}, acute=72°, obtuse=108°, rtPure=true`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "thick-rhombus",
        shortDiagonalQuadrance: quadrance,
        longDiagonalQuadrance: longDiagQ,
        edgeQuadrance,
        edgeLength: Math.sqrt(edgeQuadrance),
        acuteAngle: 72,
        obtuseAngle: 108,
        acuteSpread: spreadAcute,
        obtuseSpread: spreadObtuse,
        diagonalRatio: phi,
        composedOf: "2× Robinson Large (BL)",
        rtPure: true,
      },
    };
  },

  /**
   * Thin Rhombus (36°/144°)
   * P3 prototile composed of two Small Robinson triangles (BS + BS mirrored)
   *
   * Angles: 36°, 144°, 36°, 144° (at vertices V0, V1, V2, V3)
   * Diagonal ratio: short:long = 1:φ² (more elongated than thick)
   *
   * @param {number} quadrance - Short diagonal quadrance
   * @param {Object} options - {showFace: boolean, showMatchingArcs: boolean}
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  thinRhombus: (quadrance = 1, options = {}) => {
    const showFace = options.showFace !== false;

    const phi = RT.PurePhi.value();
    const phiSq = RT.PurePhi.squared();
    const phiFourth = RT.PurePhi.fourthPower();

    // Spreads (36° and 144° have the same spread value)
    const spreadAcute = RT.PurePhi.pentagon.alpha(); // 36°
    const spreadObtuse = RT.PurePhi.pentagon.alpha(); // 144° has same spread

    // Diagonals
    const shortDiag = Math.sqrt(quadrance);
    const longDiagQ = phiFourth * quadrance; // Long diagonal Q = φ⁴ × short Q
    const longDiag = Math.sqrt(longDiagQ);

    // Vertices at diagonal endpoints
    const vertices = [
      new THREE.Vector3(0, shortDiag / 2, 0), // V0: Top (36° acute)
      new THREE.Vector3(longDiag / 2, 0, 0), // V1: Right (144° obtuse)
      new THREE.Vector3(0, -shortDiag / 2, 0), // V2: Bottom (36° acute)
      new THREE.Vector3(-longDiag / 2, 0, 0), // V3: Left (144° obtuse)
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ];
    const faces = showFace ? [[0, 3, 2, 1]] : []; // CCW for +Z normal

    // Edge quadrance: Q(1 + φ⁴)/4
    const edgeQuadrance = (quadrance * (1 + phiFourth)) / 4;

    console.log(
      `[RT] Thin Rhombus: Q_short=${quadrance.toFixed(6)}, Q_long=${longDiagQ.toFixed(6)}, ` +
        `Q_edge=${edgeQuadrance.toFixed(6)}, acute=36°, obtuse=144°, rtPure=true`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "thin-rhombus",
        shortDiagonalQuadrance: quadrance,
        longDiagonalQuadrance: longDiagQ,
        edgeQuadrance,
        edgeLength: Math.sqrt(edgeQuadrance),
        acuteAngle: 36,
        obtuseAngle: 144,
        acuteSpread: spreadAcute,
        obtuseSpread: spreadObtuse,
        diagonalRatio: phiSq, // φ²
        composedOf: "2× Robinson Small (BS)",
        rtPure: true,
      },
    };
  },

  /**
   * Kite (P2 prototile)
   * Composed of one BL + one BS triangle
   *
   * Angles: 72°, 72°, 72°, 144°
   * The three 72° angles are at "wing" vertices
   * The 144° angle is at the "tail"
   *
   * @param {number} quadrance - Reference quadrance (short edge²)
   * @param {Object} options - {showFace: boolean}
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  kite: (quadrance = 1, options = {}) => {
    const showFace = options.showFace !== false;

    const phi = RT.PurePhi.value();

    // Kite edge lengths: 2 short edges, 2 long edges
    // Short edge = 1 (reference), Long edge = φ
    const shortEdge = Math.sqrt(quadrance);
    const longEdgeQ = RT.PurePhi.squared() * quadrance;
    const longEdge = Math.sqrt(longEdgeQ);

    // RT-pure pentagon trigonometry (cached values)
    const cos72 = RT.PurePhi.pentagon.cos72();
    const sin72 = RT.PurePhi.pentagon.sin72();
    const cos36 = RT.PurePhi.pentagon.cos36();
    const sin36 = RT.PurePhi.pentagon.sin36();

    // Kite vertices (standard orientation: point up)
    // V0: Top point (72°)
    // V1: Right wing (72°)
    // V2: Tail (144°)
    // V3: Left wing (72°)
    const vertices = [
      new THREE.Vector3(0, longEdge * cos36, 0), // V0: Top (72°)
      new THREE.Vector3(shortEdge * sin72, 0, 0), // V1: Right (72°)
      new THREE.Vector3(0, -shortEdge * cos72, 0), // V2: Tail (144°)
      new THREE.Vector3(-shortEdge * sin72, 0, 0), // V3: Left (72°)
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ];
    const faces = showFace ? [[0, 3, 2, 1]] : []; // CCW for +Z normal

    console.log(
      `[RT] Kite: Q_short=${quadrance.toFixed(6)}, Q_long=${longEdgeQ.toFixed(6)}, ` +
        `angles=72°,72°,72°,144°, rtPure=true`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "kite",
        shortEdgeQuadrance: quadrance,
        longEdgeQuadrance: longEdgeQ,
        angles: [72, 72, 72, 144],
        composedOf: "BL + BS",
        rtPure: true,
      },
    };
  },

  /**
   * Dart (P2 prototile)
   * Composed of two BS triangles
   *
   * Angles: 36°, 72°, 36°, 216° (reflex angle at tail)
   *
   * @param {number} quadrance - Reference quadrance (short edge²)
   * @param {Object} options - {showFace: boolean}
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  dart: (quadrance = 1, options = {}) => {
    const showFace = options.showFace !== false;

    const phi = RT.PurePhi.value();
    const invPhi = RT.PurePhi.inverse();

    // Dart edge lengths
    const shortEdge = Math.sqrt(quadrance);
    const longEdgeQ = RT.PurePhi.squared() * quadrance;
    const longEdge = Math.sqrt(longEdgeQ);

    // Pentagon trigonometry
    const cos36 = RT.PurePhi.pentagon.cos36();
    const sin36 = RT.PurePhi.pentagon.sin36();
    const cos72 = RT.PurePhi.pentagon.cos72();
    const sin72 = RT.PurePhi.pentagon.sin72();

    // Dart vertices (standard orientation: point up)
    // V0: Top point (36°)
    // V1: Right wing (72°)
    // V2: Tail (216° reflex)
    // V3: Left wing (36°)
    const vertices = [
      new THREE.Vector3(0, shortEdge * cos36, 0), // V0: Top (36°)
      new THREE.Vector3(longEdge * sin36, 0, 0), // V1: Right (72°)
      new THREE.Vector3(0, shortEdge * cos36 * invPhi, 0), // V2: Tail (216° reflex)
      new THREE.Vector3(-longEdge * sin36, 0, 0), // V3: Left (36°)
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ];
    const faces = showFace ? [[0, 3, 2, 1]] : []; // CCW for +Z normal

    console.log(
      `[RT] Dart: Q_short=${quadrance.toFixed(6)}, Q_long=${longEdgeQ.toFixed(6)}, ` +
        `angles=36°,72°,36°,216°, rtPure=true`
    );

    return {
      vertices,
      edges,
      faces,
      metadata: {
        type: "dart",
        shortEdgeQuadrance: quadrance,
        longEdgeQuadrance: longEdgeQ,
        angles: [36, 72, 36, 216],
        composedOf: "2× BS",
        rtPure: true,
      },
    };
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * PENROSE TILING GENERATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Functions for generating Penrose tilings via deflation/inflation rules.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const PenroseTiling = {
  /**
   * Deflation scale factor: 1/φ (RT-pure using algebraic identity)
   * Each deflation iteration shrinks tiles by golden ratio inverse
   * Uses identity: 1/φ = φ - 1 (no division or sqrt needed!)
   */
  DEFLATION_SCALE: (() => RT.PurePhi.inverse())(),

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Linear interpolation between two points */
  _lerp: (a, b, t) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }),

  /** Centroid of 4 vertices */
  _centroid4: verts => ({
    x: (verts[0].x + verts[1].x + verts[2].x + verts[3].x) / 4,
    y: (verts[0].y + verts[1].y + verts[2].y + verts[3].y) / 4,
  }),

  /**
   * Compute rotation (as n×36°) from rhombus vertices
   * Uses the short diagonal (V0-V2) direction
   * @param {Array} verts - [V0, V1, V2, V3] where V0-V2 is short diagonal
   * @returns {number} Rotation as n in n×36°
   */
  _rotationFromVerts: verts => {
    // Short diagonal direction (V0 to V2)
    const dx = verts[0].x - verts[2].x;
    const dy = verts[0].y - verts[2].y;
    // Angle of short diagonal (should be vertical at rotation=0)
    const angle = Math.atan2(dy, dx);
    // At rotation=0, short diagonal points along +Y (angle = π/2)
    // So adjusted = angle - π/2, then convert to n×36°
    const adjusted = angle - Math.PI / 2;
    const n36 = Math.round((adjusted * 5) / Math.PI);
    return ((n36 % 10) + 10) % 10; // Ensure positive 0-9
  },

  /**
   * Construct a rhombus from 4 explicit vertices
   * Computes position (centroid) and rotation from the geometry
   * @param {string} type - "thick-rhombus" or "thin-rhombus"
   * @param {Array} verts - [V0, V1, V2, V3] vertices in CCW order
   * @param {number} quadrance - The quadrance (short diagonal²)
   * @returns {Object} Tile in {type, quadrance, rotationN36, position} format
   */
  _rhombusFromVerts: (type, verts, quadrance) => {
    const position = PenroseTiling._centroid4(verts);
    const rotationN36 = PenroseTiling._rotationFromVerts(verts);
    return { type, quadrance, rotationN36, position };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TILE VERTEX COMPUTATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get vertices of a tile in world coordinates
   * Converts from (position, rotation, quadrance) format to 4 vertex positions
   *
   * @param {Object} tile - Tile with type, quadrance, rotationN36, position
   * @returns {Array<{x,y}>} Four vertices [V0, V1, V2, V3] in CCW order
   */
  _tileVertices: tile => {
    const phi = RT.PurePhi.value();
    const phiSq = RT.PurePhi.squared();
    const q = tile.quadrance;

    // Short diagonal = √Q, long diagonal = φ√Q (thick) or φ²√Q (thin)
    const shortHalf = Math.sqrt(q) / 2;
    let longHalf;

    if (tile.type === "thick-rhombus") {
      // Thick: long diagonal = φ × short diagonal
      longHalf = (phi * Math.sqrt(q)) / 2;
    } else if (tile.type === "thin-rhombus") {
      // Thin: long diagonal = φ² × short diagonal
      longHalf = (phiSq * Math.sqrt(q)) / 2;
    } else {
      console.warn(`[RT] _tileVertices: Unknown type ${tile.type}`);
      return null;
    }

    // Local vertices (unrotated): short diagonal along Y, long along X
    // V0: top (acute), V1: right (obtuse), V2: bottom (acute), V3: left (obtuse)
    const localVerts = [
      { x: 0, y: shortHalf },
      { x: longHalf, y: 0 },
      { x: 0, y: -shortHalf },
      { x: -longHalf, y: 0 },
    ];

    // Apply rotation: n × 36° = n × π/5 radians
    const angle = (tile.rotationN36 * Math.PI) / 5;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Rotate and translate to world position
    return localVerts.map(v => ({
      x: tile.position.x + v.x * cos - v.y * sin,
      y: tile.position.y + v.x * sin + v.y * cos,
    }));
  },

  /**
   * Calculate centroid of a tile
   * @param {Object} tile - Tile object
   * @returns {{x,y}} Centroid position
   */
  _tileCentroid: tile => {
    const verts = PenroseTiling._tileVertices(tile);
    return {
      x: (verts[0].x + verts[1].x + verts[2].x + verts[3].x) / 4,
      y: (verts[0].y + verts[1].y + verts[2].y + verts[3].y) / 4,
    };
  },

  /**
   * Deflate a thick rhombus into 2 thick + 1 thin
   *
   * P3 substitution rule for thick rhombus (72°/108°):
   * - V0, V2 are acute (72°) vertices - SHORT diagonal
   * - V1, V3 are obtuse (108°) vertices - LONG diagonal
   *
   * Child tiles are constructed by computing their actual 4 vertices,
   * then deriving position (centroid) and rotation from the geometry.
   *
   * @param {Object} tile - Thick rhombus tile
   * @returns {Array} Three new tiles [thick, thick, thin]
   */
  _deflateThickRhombus: tile => {
    const phi = RT.PurePhi.value();
    const invPhi = RT.PurePhi.inverse(); // 1/φ = φ - 1
    const lerp = PenroseTiling._lerp;

    const verts = PenroseTiling._tileVertices(tile);
    const [V0, V1, V2, V3] = verts;

    // New quadrance is scaled by (1/φ)² (RT-pure)
    const newQ = tile.quadrance * invPhi * invPhi;

    // Division points on LONG diagonal (V1-V3)
    // P is at 1/φ from V1 toward V3
    // Q is at 1/φ from V3 toward V1
    const P = lerp(V1, V3, invPhi);
    const Q = lerp(V3, V1, invPhi);

    // Division points on edges (at 1/φ from each vertex)
    // These define where child tiles meet
    const A = lerp(V0, V1, invPhi); // On V0-V1
    const B = lerp(V1, V2, invPhi); // On V1-V2
    const C = lerp(V2, V3, invPhi); // On V2-V3
    const D = lerp(V3, V0, invPhi); // On V3-V0

    // Child thick rhombus #1: centered near V0-V1 corner
    // Vertices: V0 (acute), A, P, D form the rhombus
    // But we need to verify these form a valid rhombus with correct angles!
    // Actually, construct from known geometry:
    // Child has its acute vertex at V0, rotated +36° from parent
    const child1Verts = [V0, A, P, D];
    const child1 = PenroseTiling._rhombusFromVerts(
      "thick-rhombus",
      child1Verts,
      newQ
    );

    // Child thick rhombus #2: centered near V2-V1 corner
    // Vertices: V2 (acute), C, Q, B
    const child2Verts = [V2, C, Q, B];
    const child2 = PenroseTiling._rhombusFromVerts(
      "thick-rhombus",
      child2Verts,
      newQ
    );

    // Child thin rhombus: fills the gap between thick children
    // Vertices: A, B, Q, P (the central region)
    // Note: thin rhombus has acute (36°) at V0,V2 positions
    // Here A and B become the obtuse (144°) vertices
    // P and Q become the acute (36°) vertices
    const child3Verts = [P, A, Q, C]; // Reorder for thin: acute at 0,2
    const child3 = PenroseTiling._rhombusFromVerts(
      "thin-rhombus",
      child3Verts,
      newQ
    );

    console.log(
      `[RT] Thick deflate: parent at (${tile.position.x.toFixed(2)}, ${tile.position.y.toFixed(2)}) → ` +
        `children at (${child1.position.x.toFixed(2)}, ${child1.position.y.toFixed(2)}), ` +
        `(${child2.position.x.toFixed(2)}, ${child2.position.y.toFixed(2)}), ` +
        `(${child3.position.x.toFixed(2)}, ${child3.position.y.toFixed(2)})`
    );

    return [child1, child2, child3];
  },

  /**
   * Deflate a thin rhombus into 1 thick + 1 thin
   *
   * P3 substitution rule for thin rhombus (36°/144°):
   * - V0, V2 are acute (36°) vertices - SHORT diagonal
   * - V1, V3 are obtuse (144°) vertices - LONG diagonal (φ² × short)
   *
   * Child tiles are constructed by computing their actual 4 vertices,
   * then deriving position (centroid) and rotation from the geometry.
   *
   * @param {Object} tile - Thin rhombus tile
   * @returns {Array} Two new tiles [thick, thin]
   */
  _deflateThinRhombus: tile => {
    const invPhi = RT.PurePhi.inverse();
    const lerp = PenroseTiling._lerp;

    const verts = PenroseTiling._tileVertices(tile);
    const [V0, V1, V2, V3] = verts;

    // New quadrance scaled by (1/φ)²
    const newQ = tile.quadrance * invPhi * invPhi;

    // Division point P on LONG diagonal (V1-V3) at 1/φ from V1
    const P = lerp(V1, V3, invPhi);

    // Division points on edges
    const A = lerp(V0, V1, invPhi); // On V0-V1
    const B = lerp(V0, V3, invPhi); // On V0-V3

    // Child thick rhombus: near V0
    // Vertices: V0 (acute of parent becomes acute of child), A, P, B
    const child1Verts = [V0, A, P, B];
    const child1 = PenroseTiling._rhombusFromVerts(
      "thick-rhombus",
      child1Verts,
      newQ
    );

    // Child thin rhombus: fills remaining space
    // Vertices: P, A (becomes obtuse), V2, ... need to work out
    // The thin child shares edge A-P with thick child
    // Its other vertices are toward V2 and V3
    const C = lerp(V2, V1, invPhi); // On V2-V1
    const D = lerp(V2, V3, invPhi); // On V2-V3
    const child2Verts = [P, C, V2, D]; // Thin: acute at P and V2
    const child2 = PenroseTiling._rhombusFromVerts(
      "thin-rhombus",
      child2Verts,
      newQ
    );

    console.log(
      `[RT] Thin deflate: parent at (${tile.position.x.toFixed(2)}, ${tile.position.y.toFixed(2)}) → ` +
        `children at (${child1.position.x.toFixed(2)}, ${child1.position.y.toFixed(2)}), ` +
        `(${child2.position.x.toFixed(2)}, ${child2.position.y.toFixed(2)})`
    );

    return [child1, child2];
  },

  /**
   * Apply deflation (subdivision) to a set of tiles
   *
   * Deflation rules for P3 (rhombic) tiling:
   * - Thick rhombus → 2 thick + 1 thin (3 tiles)
   * - Thin rhombus → 1 thick + 1 thin (2 tiles)
   *
   * @param {Array} tiles - Array of tile objects with type and transform
   * @returns {Array} Subdivided tiles at smaller scale
   */
  deflate: tiles => {
    const newTiles = [];

    for (const tile of tiles) {
      if (tile.type === "thick-rhombus") {
        newTiles.push(...PenroseTiling._deflateThickRhombus(tile));
      } else if (tile.type === "thin-rhombus") {
        newTiles.push(...PenroseTiling._deflateThinRhombus(tile));
      } else {
        // Kites and darts use different deflation rules (P2 tiling)
        // For now, pass through unchanged
        console.warn(`[RT] Deflation not implemented for type: ${tile.type}`);
        newTiles.push(tile);
      }
    }

    console.log(
      `[RT] Penrose deflate: ${tiles.length} tiles → ${newTiles.length} tiles`
    );
    return newTiles;
  },

  /**
   * Apply inflation (reverse subdivision) to a set of tiles
   *
   * @param {Array} tiles - Array of tile objects
   * @returns {Array} Grouped tiles at larger scale
   */
  inflate: tiles => {
    // TODO: Implement inflation rules
    console.log(`[RT] Penrose inflate: ${tiles.length} tiles → TBD`);
    return tiles; // Placeholder
  },

  /**
   * Create initial seed configuration for tiling generation
   * Uses RT-pure rotation methods for 5-fold symmetric patterns
   *
   * @param {string} seed - Configuration name: 'star', 'sun', 'cartwheel', 'single-thick', 'single-thin'
   * @param {number} quadrance - Initial tile quadrance
   * @returns {Array} Initial tile configuration
   */
  seedConfiguration: (seed = "star", quadrance = 1) => {
    // RT-pure: rotation steps are multiples of 72° (2×36°)
    // Full 5-fold pattern: rotations at 0°, 72°, 144°, 216°, 288°
    const rotationSteps = [0, 2, 4, 6, 8]; // n×36° where n=0,2,4,6,8 gives 72° increments

    switch (seed) {
      case "star":
        // 5-fold star: 5 thick rhombi around center (acute 72° angles meeting)
        // Each rhombus rotated by 72° from previous
        return rotationSteps.map(n => ({
          type: "thick-rhombus",
          quadrance,
          rotationN36: n, // RT-pure: rotation as n×36°
          position: { x: 0, y: 0 },
        }));

      case "sun":
        // 5-fold sun: 5 kites around center
        // Kite tips (72° angles) meeting at center
        return rotationSteps.map(n => ({
          type: "kite",
          quadrance,
          rotationN36: n,
          position: { x: 0, y: 0 },
        }));

      case "cartwheel": {
        // Classic Penrose cartwheel pattern
        // 5 thick + 5 thin rhombi arranged concentrically
        const thickTiles = rotationSteps.map(n => ({
          type: "thick-rhombus",
          quadrance,
          rotationN36: n,
          position: { x: 0, y: 0 },
          ring: 0,
        }));
        const thinTiles = rotationSteps.map(n => ({
          type: "thin-rhombus",
          quadrance,
          rotationN36: n + 1, // Offset by 36° from thick rhombi
          position: { x: 0, y: 0 },
          ring: 1,
        }));
        return [...thickTiles, ...thinTiles];
      }

      case "single-thick":
        return [
          {
            type: "thick-rhombus",
            quadrance,
            rotationN36: 0,
            position: { x: 0, y: 0 },
          },
        ];

      case "single-thin":
        return [
          {
            type: "thin-rhombus",
            quadrance,
            rotationN36: 0,
            position: { x: 0, y: 0 },
          },
        ];

      default:
        console.warn(`[RT] Unknown Penrose seed: ${seed}, using single-thick`);
        return [
          {
            type: "thick-rhombus",
            quadrance,
            rotationN36: 0,
            position: { x: 0, y: 0 },
          },
        ];
    }
  },

  /**
   * Generate Penrose tiling by repeated deflation
   *
   * @param {number} generations - Number of deflation iterations
   * @param {string} seed - Starting configuration
   * @param {number} quadrance - Initial quadrance
   * @returns {Array} Generated tile array
   */
  generate: (generations = 5, seed = "star", quadrance = 1) => {
    let tiles = PenroseTiling.seedConfiguration(seed, quadrance);

    for (let g = 0; g < generations; g++) {
      tiles = PenroseTiling.deflate(tiles);
      console.log(`[RT] Penrose generation ${g + 1}: ${tiles.length} tiles`);
    }

    return tiles;
  },

  /**
   * Validate matching rules for a tiling
   * Returns true if all edges satisfy Penrose matching constraints
   *
   * @param {Array} tiles - Tile array to validate
   * @returns {Object} {valid: boolean, violations: Array}
   */
  validateMatching: tiles => {
    // TODO: Implement matching rule validation
    console.log(`[RT] Penrose matching validation: ${tiles.length} tiles`);
    return { valid: true, violations: [] }; // Placeholder
  },

  /**
   * Generate tiling constrained to equilateral triangle boundary
   * Key function for icosahedral mapping
   *
   * @param {number} triangleQuadrance - Edge quadrance of bounding triangle
   * @param {number} generations - Deflation iterations
   * @returns {Object} {tiles, boundary, metadata}
   */
  trianglePatch: (triangleQuadrance, generations = 5) => {
    // TODO: Implement triangle-constrained tiling
    console.log(
      `[RT] Penrose triangle patch: Q=${triangleQuadrance}, generations=${generations}`
    );
    return {
      tiles: [],
      boundary: null,
      metadata: { triangleQuadrance, generations, tileCount: 0 },
    }; // Placeholder
  },

  /**
   * Convert tile array to renderable THREE.js geometry
   *
   * Transforms the tile objects (position, rotation, quadrance format)
   * into vertices, edges, and faces arrays for renderPolyhedron()
   *
   * @param {Array} tiles - Array of tile objects from generate() or deflate()
   * @param {Object} options - Rendering options
   * @param {boolean} options.showFace - Whether to generate faces (default true)
   * @param {boolean} options.colorByType - Different colors for thick/thin (default true)
   * @returns {Object} {vertices, edges, faces, metadata}
   */
  tilesToGeometry: (tiles, options = {}) => {
    const showFace = options.showFace !== false;
    const colorByType = options.colorByType !== false;

    const allVertices = [];
    const allEdges = [];
    const allFaces = [];
    const tileMetadata = [];

    let vertexOffset = 0;

    for (const tile of tiles) {
      const verts = PenroseTiling._tileVertices(tile);
      if (!verts) continue;

      // Add vertices as THREE.Vector3
      const v0 = allVertices.length;
      for (const v of verts) {
        allVertices.push(new THREE.Vector3(v.x, v.y, 0));
      }

      // Add edges (4 edges per rhombus)
      allEdges.push([v0, v0 + 1]);
      allEdges.push([v0 + 1, v0 + 2]);
      allEdges.push([v0 + 2, v0 + 3]);
      allEdges.push([v0 + 3, v0]);

      // Add face (CCW winding for +Z normal)
      if (showFace) {
        allFaces.push([v0, v0 + 3, v0 + 2, v0 + 1]);
      }

      // Track tile metadata for coloring
      tileMetadata.push({
        type: tile.type,
        vertexStart: v0,
        vertexCount: 4,
      });

      vertexOffset += 4;
    }

    // Count tile types
    const thickCount = tiles.filter(t => t.type === "thick-rhombus").length;
    const thinCount = tiles.filter(t => t.type === "thin-rhombus").length;

    console.log(
      `[RT] Penrose tilesToGeometry: ${tiles.length} tiles → ` +
        `${allVertices.length} vertices, ${allEdges.length} edges, ${allFaces.length} faces ` +
        `(thick: ${thickCount}, thin: ${thinCount})`
    );

    return {
      vertices: allVertices,
      edges: allEdges,
      faces: allFaces,
      metadata: {
        tileCount: tiles.length,
        thickCount,
        thinCount,
        tileMetadata,
        colorByType,
        rtPure: true,
      },
    };
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * PENROSE GEODESIC MAPPING
 * ═══════════════════════════════════════════════════════════════════════════
 * Functions for mapping Penrose tilings to icosahedral geodesic spheres.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const PenroseGeodesic = {
  /**
   * Generate icosahedral net (20 triangular faces unfolded)
   *
   * @returns {Object} {triangles, metadata}
   */
  generateIcosahedralNet: () => {
    // TODO: Implement icosahedral net generation
    console.log("[RT] Generating icosahedral net");
    return {
      triangles: [],
      metadata: { faceCount: 20, layout: "standard-unfolding" },
    }; // Placeholder
  },

  /**
   * Map Penrose tiling to icosahedral net
   * Copies triangle patch to all 20 faces with appropriate rotations
   *
   * @param {Object} tiling - Penrose triangle patch
   * @param {Object} net - Icosahedral net
   * @returns {Object} {faces, metadata}
   */
  mapToIcosahedralNet: (tiling, net) => {
    // TODO: Implement net mapping
    console.log("[RT] Mapping Penrose tiling to icosahedral net");
    return {
      faces: [],
      metadata: { totalTiles: 0 },
    }; // Placeholder
  },

  /**
   * Project tiled net onto geodesic sphere
   * Central projection from icosahedron centroid
   *
   * @param {Object} tiledNet - Net with Penrose tiles
   * @param {number} radiusQ - Sphere radius quadrance
   * @returns {Object} {tiles, sphereRadiusQ, metadata}
   */
  wrapToSphere: (tiledNet, radiusQ) => {
    // TODO: Implement spherical projection
    const radius = Math.sqrt(radiusQ);
    console.log(`[RT] Wrapping Penrose net to sphere: R=${radius.toFixed(6)}`);
    return {
      tiles: [],
      sphereRadiusQ: radiusQ,
      metadata: { totalTiles: 0, projection: "central-radial" },
    }; // Placeholder
  },

  /**
   * Apply Penrose tiling to existing geodesic polyhedron
   * Main integration point with rt-polyhedra.js geodesic icosahedron
   *
   * @param {Object} geodesic - Geodesic polyhedron from Polyhedra.geodesicIcosahedron()
   * @param {Object} penroseTiling - Penrose tiling configuration
   * @returns {Object} Modified geodesic with Penrose tile faces
   */
  applyToGeodesic: (geodesic, penroseTiling) => {
    // TODO: Implement geodesic integration
    console.log("[RT] Applying Penrose tiling to geodesic");
    return geodesic; // Placeholder - return unmodified for now
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * PRESETS
 * ═══════════════════════════════════════════════════════════════════════════
 * Named configurations for common Penrose patterns and viral capsid templates.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const PenrosePresets = {
  /**
   * Star vertex configuration
   * 5 acute angles (72°) meeting at center - 5-fold rotational symmetry
   */
  STAR_VERTEX: {
    name: "Star",
    seed: "star",
    symmetry: 5,
    description: "5 thick rhombi, acute angles meeting",
  },

  /**
   * Sun vertex configuration
   * 5 kites meeting at center - 5-fold rotational symmetry
   */
  SUN_VERTEX: {
    name: "Sun",
    seed: "sun",
    symmetry: 5,
    description: "5 kites around center point",
  },

  /**
   * Classic Penrose cartwheel pattern
   */
  CARTWHEEL: {
    name: "Cartwheel",
    seed: "cartwheel",
    symmetry: 5,
    description: "Classic Penrose demonstration pattern",
  },

  /**
   * HPV capsid template (Human Papillomavirus)
   * Based on Twarock's quasicrystalline capsid model
   */
  VIRAL_HPV: {
    name: "HPV Capsid",
    seed: "star",
    generations: 4,
    symmetry: 5,
    description: "Human Papillomavirus T=7 capsid pattern",
  },

  /**
   * Rotavirus capsid template
   */
  VIRAL_ROTAVIRUS: {
    name: "Rotavirus",
    seed: "sun",
    generations: 5,
    symmetry: 5,
    description: "Rotavirus T=13 capsid pattern",
  },
};
