/**
 * rt-thomson.js — Thomson Polyhedra: Great-Circle Shells
 *
 * Generates N-gon great circles on symmetry planes of Thomson solutions.
 * Each plane gets ONE circle at the circumsphere radius; nodes appear
 * at each circle's own N-gon vertices (triangle=3, pentagon=5, etc.).
 *
 * Thomson Problem: Given N points on a unit sphere, find the
 * configuration that minimises electrostatic potential energy.
 * For N=4 (tetrahedron) and N=6 (octahedron), the solutions
 * are the inscribed Platonic solids.
 *
 * Follows the same pattern as polar grid circles in rt-grids.js:
 * plane normal → orthonormal basis → RT.nGonVertices() → 2D→3D transform.
 *
 * @requires rt-math.js (RT.nGonVertices)
 */

import { RT } from "./rt-math.js";

// ── Plain-math vector helpers (no THREE dependency) ─────────────────

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// ── Plane definitions ───────────────────────────────────────────────

// 3021 Rule: QW→D(-1,-1,1), QX→A(1,1,1), QY→C(-1,1,-1), QZ→B(1,-1,-1)
// Matches Quadray.getAxisVector() used by rt-grids.js polar planes
const TET_FACE_PLANES = [
  { normal: { x: -1, y: -1, z: 1 }, color: 0xffff00, label: "Face W" },
  { normal: { x: 1, y: 1, z: 1 }, color: 0xff0000, label: "Face X" },
  { normal: { x: -1, y: 1, z: -1 }, color: 0x00ffff, label: "Face Y" },
  { normal: { x: 1, y: -1, z: -1 }, color: 0x00ff00, label: "Face Z" },
];

const TET_EDGE_PLANES = [
  { normal: { x: 0, y: 1, z: 1 }, color: 0xff6600, label: "Edge 1" },
  { normal: { x: 1, y: 0, z: 1 }, color: 0xff6600, label: "Edge 2" },
  { normal: { x: 1, y: 1, z: 0 }, color: 0xff6600, label: "Edge 3" },
  { normal: { x: 1, y: -1, z: 0 }, color: 0xff6600, label: "Edge 4" },
  { normal: { x: 1, y: 0, z: -1 }, color: 0xff6600, label: "Edge 5" },
  { normal: { x: 0, y: 1, z: -1 }, color: 0xff6600, label: "Edge 6" },
];

const OCT_COORD_PLANES = [
  { normal: { x: 1, y: 0, z: 0 }, color: 0xff0000, label: "YZ" },
  { normal: { x: 0, y: 1, z: 0 }, color: 0x00ff00, label: "XZ" },
  { normal: { x: 0, y: 0, z: 1 }, color: 0x0000ff, label: "XY" },
];

// ── Icosahedron edge-mirror planes (lazy-cached) ────────────────────

let _icosaEdgePlanes = null;

/**
 * Derive the 12 edge-mirror planes of the icosahedron.
 * The icosahedral symmetry group (Ih) has 15 mirror planes total:
 *   3 coordinate planes (reused from OCT_COORD_PLANES)
 * + 12 edge-mirror planes (phi-based normals, computed here).
 *
 * Algorithm: for each of 30 edges, the mirror plane contains the origin
 * with normal = normalize(cross(midpoint, edgeDir)). Deduplicate antipodal
 * pairs (n and -n define the same plane), then filter out coordinate planes.
 *
 * Uses RT.PurePhi.value() for exact φ at the algebraic boundary.
 *
 * @returns {Array<{ normal: {x,y,z}, color: number, label: string }>}
 */
function getIcosaEdgePlanes() {
  if (_icosaEdgePlanes) return _icosaEdgePlanes;

  const phi = RT.PurePhi.value(); // φ ≈ 1.618

  // 12 icosahedron vertices: three orthogonal golden rectangles
  // Matches rt-polyhedra.js vertex topology (unnormalized is fine for normals)
  const verts = [
    { x: 0, y: 1, z: phi },   // 0
    { x: 0, y: 1, z: -phi },  // 1
    { x: 0, y: -1, z: phi },  // 2
    { x: 0, y: -1, z: -phi }, // 3
    { x: 1, y: phi, z: 0 },   // 4
    { x: 1, y: -phi, z: 0 },  // 5
    { x: -1, y: phi, z: 0 },  // 6
    { x: -1, y: -phi, z: 0 }, // 7
    { x: phi, y: 0, z: 1 },   // 8
    { x: phi, y: 0, z: -1 },  // 9
    { x: -phi, y: 0, z: 1 },  // 10
    { x: -phi, y: 0, z: -1 }, // 11
  ];

  // 30 edges (same topology as rt-polyhedra.js icosahedron)
  const edges = [
    [0,2],[0,4],[0,6],[0,8],[0,10],
    [1,3],[1,4],[1,6],[1,9],[1,11],
    [2,5],[2,7],[2,8],[2,10],
    [3,5],[3,7],[3,9],[3,11],
    [4,6],[4,8],[4,9],
    [5,7],[5,8],[5,9],
    [6,10],[6,11],
    [7,10],[7,11],
    [8,9],[10,11],
  ];

  // For each edge, compute mirror plane normal
  const allNormals = [];
  for (const [i, j] of edges) {
    const vi = verts[i], vj = verts[j];
    const mid = {
      x: (vi.x + vj.x) / 2,
      y: (vi.y + vj.y) / 2,
      z: (vi.z + vj.z) / 2,
    };
    const dir = {
      x: vj.x - vi.x,
      y: vj.y - vi.y,
      z: vj.z - vi.z,
    };
    const n = normalize(cross(mid, dir));
    if (n.x === 0 && n.y === 0 && n.z === 0) continue;
    allNormals.push(n);
  }

  // Deduplicate: antipodal normals define the same plane
  const unique = [];
  for (const n of allNormals) {
    let isDupe = false;
    for (const u of unique) {
      const dot = n.x * u.x + n.y * u.y + n.z * u.z;
      if (Math.abs(Math.abs(dot) - 1) < 1e-8) { isDupe = true; break; }
    }
    if (!isDupe) unique.push(n);
  }

  // Filter out coordinate planes (exactly 2 components ≈ 0)
  const isCoordPlane = (n) => {
    const eps = 1e-8;
    const zeros = (Math.abs(n.x) < eps ? 1 : 0) +
                  (Math.abs(n.y) < eps ? 1 : 0) +
                  (Math.abs(n.z) < eps ? 1 : 0);
    return zeros >= 2;
  };

  const edgePlanes = unique.filter(n => !isCoordPlane(n));

  _icosaEdgePlanes = edgePlanes.map((n, i) => ({
    normal: n,
    color: 0xcc66ff, // Lavender — distinct from coord-plane RGB
    label: `Icosa Edge ${i + 1}`,
  }));

  return _icosaEdgePlanes;
}

// ── Core generation ─────────────────────────────────────────────────

/**
 * Build orthonormal basis in the plane ⊥ to a normal vector.
 * Same algorithm as createQuadrayPolarPlane() in rt-grids.js.
 *
 * @param {{ x,y,z }} normal - Plane normal (will be normalized)
 * @returns {{ localX: {x,y,z}, localZ: {x,y,z} }}
 */
function buildPlaneBasis(normal) {
  const n = normalize(normal);
  const ref = Math.abs(n.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const localX = normalize(cross(ref, n));
  const localZ = normalize(cross(n, localX));
  return { localX, localZ };
}

/**
 * Generate one great circle as a flat positions array (LineSegments pairs).
 *
 * @param {{ x,y,z }} normal - Plane normal
 * @param {number} radius - Circle radius (circumsphere)
 * @param {number} nGon - Polygon resolution (3-12)
 * @param {number} rotationDeg - Rotation of N-gon about its normal (degrees, default 0)
 * @returns {number[]} Flat [x1,y1,z1, x2,y2,z2, ...] array
 */
function makeCircle(normal, radius, nGon, rotationDeg = 0) {
  const { localX, localZ } = buildPlaneBasis(normal);
  const lxx = localX.x,
    lxy = localX.y,
    lxz = localX.z;
  const lzx = localZ.x,
    lzy = localZ.y,
    lzz = localZ.z;

  const circleVerts = RT.nGonVertices(nGon, radius).vertices;

  // Apply 2D rotation to vertices before 3D transform.
  // Uses RT.reflectInLine twice (two reflections = rotation by 2×angle).
  // The slope m = tan(θ/2) gives rotation by θ via double reflection.
  // Math.PI/Math.tan justified: degree-to-slope UX boundary; rotation itself is RT-pure.
  if (rotationDeg !== 0) {
    const halfRad = ((rotationDeg / 2) * Math.PI) / 180;
    const m = Math.tan(halfRad);
    for (let i = 0; i < circleVerts.length; i++) {
      const v = circleVerts[i];
      // First reflect through line with slope m, then through x-axis (slope 0)
      // reflectInLine(x, y, m) then reflectInLine(rx, ry, 0) = (rx, -ry)
      // Net effect: rotation by 2 × atan(m) = rotationDeg
      const r1 = RT.reflectInLine(v.x, v.y, m);
      circleVerts[i] = { x: r1.x, y: -r1.y };
    }
  }

  const positions = [];

  for (let i = 0; i < nGon; i++) {
    const curr = circleVerts[i];
    const next = circleVerts[(i + 1) % nGon];

    // 2D → 3D via local basis: localX * x2d + localZ * y2d
    positions.push(
      lxx * curr.x + lzx * curr.y,
      lxy * curr.x + lzy * curr.y,
      lxz * curr.x + lzz * curr.y,
      lxx * next.x + lzx * next.y,
      lxy * next.x + lzy * next.y,
      lxz * next.x + lzz * next.y
    );
  }
  return positions;
}

/**
 * Collect N-gon vertex positions from each great circle.
 * Each circle contributes exactly N nodes (one per polygon vertex),
 * placed at the 3D-transformed positions on the circumsphere.
 *
 * Duplicate positions (where two circles share a vertex) are merged
 * using quadrance-based comparison to maintain RT consistency.
 * Returns both the deduplicated node list and the coincident count.
 *
 * @param {Array<{ positions: number[] }>} circles - Generated circle data
 * @param {number} nGon - Polygon resolution
 * @returns {{ nodes: Array<{x,y,z}>, edges: Array<[number,number]>, coincidentCount: number }}
 */
function collectCircleVertices(circles, nGon) {
  const nodes = [];
  const edges = [];
  // Dedup threshold: quadrance < 1e-8 (well within Float32 precision)
  const dedupeQSq = 1e-8;
  let coincidentCount = 0;

  // Find or insert a node, returning its index in the nodes array
  function getNodeIndex(vx, vy, vz) {
    for (let i = 0; i < nodes.length; i++) {
      const dx = nodes[i].x - vx,
        dy = nodes[i].y - vy,
        dz = nodes[i].z - vz;
      if (dx * dx + dy * dy + dz * dz < dedupeQSq) return i;
    }
    nodes.push({ x: vx, y: vy, z: vz });
    return nodes.length - 1;
  }

  for (const circle of circles) {
    const pos = circle.positions;
    // Map each circle vertex to its deduplicated node index
    const circleNodeIndices = [];
    for (let k = 0; k < nGon; k++) {
      const idx = k * 6;
      const vx = pos[idx],
        vy = pos[idx + 1],
        vz = pos[idx + 2];
      const prevCount = nodes.length;
      const nodeIdx = getNodeIndex(vx, vy, vz);
      if (nodeIdx < prevCount) coincidentCount++; // existing node = coincident
      circleNodeIndices.push(nodeIdx);
    }
    // Collect edges: each circle's N-gon has N edges (consecutive vertex pairs)
    for (let k = 0; k < nGon; k++) {
      const a = circleNodeIndices[k];
      const b = circleNodeIndices[(k + 1) % nGon];
      // Deduplicate edges (normalize order: smaller index first)
      const ea = Math.min(a, b),
        eb = Math.max(a, b);
      if (!edges.some(e => e[0] === ea && e[1] === eb)) {
        edges.push([ea, eb]);
      }
    }
  }
  return { nodes, edges, coincidentCount };
}

// ── Public API ───────────────────────────────────────────────────────

export const Thomson = {
  /**
   * Thomson Tetrahedron — great circles on tetrahedral symmetry planes.
   *
   * @param {number} halfSize - Half-edge of bounding cube (default 1)
   * @param {Object} options
   * @param {number} options.nGon - Polygon resolution per circle (3-12, default 5)
   * @param {number} options.rotation - Rotation of each circle about its normal (degrees, default 0)
   * @param {boolean} options.facePlanes - Show 4 face-perpendicular planes (default true)
   * @param {boolean} options.edgePlanes - Show 6 edge mirror planes (default false)
   * @returns {{ circles, nodes, edges, nGon, planeCount, coincidentCount }}
   */
  tetrahedron(halfSize = 1, options = {}) {
    const nGon = options.nGon || 5;
    const rotation = options.rotation || 0;
    const facePlanes = options.facePlanes ?? true;
    const edgePlanes = options.edgePlanes ?? false;
    const radius = halfSize * RT.PureRadicals.sqrt3(); // circumsphere

    const activePlanes = [];
    if (facePlanes) activePlanes.push(...TET_FACE_PLANES);
    if (edgePlanes) activePlanes.push(...TET_EDGE_PLANES);

    const circles = activePlanes.map(p => ({
      positions: makeCircle(p.normal, radius, nGon, rotation),
      color: p.color,
      label: p.label,
    }));

    const { nodes, edges, coincidentCount } = collectCircleVertices(
      circles,
      nGon
    );

    return {
      circles,
      nodes,
      edges,
      nGon,
      planeCount: activePlanes.length,
      coincidentCount,
    };
  },

  /**
   * Thomson Octahedron — great circles on octahedral coordinate planes.
   * 3 planes (YZ, XZ, XY) with normals along the coordinate axes.
   *
   * @param {number} halfSize - Half-edge of bounding cube (default 1)
   * @param {Object} options
   * @param {number} options.nGon - Polygon resolution per circle (3-12, default 5)
   * @param {number} options.rotation - Rotation of each circle about its normal (degrees, default 0)
   * @returns {{ circles, nodes, edges, nGon, planeCount, coincidentCount }}
   */
  /**
   * Thomson Cube — great circles on cubic symmetry planes.
   * 9 planes total: 3 coordinate (4-fold) + 6 diagonal (2-fold).
   * Reuses OCT_COORD_PLANES and TET_EDGE_PLANES — no new plane definitions.
   *
   * @param {number} halfSize - Half-edge of bounding cube (default 1)
   * @param {Object} options
   * @param {number} options.nGon - Polygon resolution per circle (3-12, default 5)
   * @param {number} options.rotation - Rotation of each circle about its normal (degrees, default 0)
   * @param {boolean} options.coordPlanes - Show 3 coordinate planes (default true)
   * @param {boolean} options.diagPlanes - Show 6 diagonal planes (default true)
   * @returns {{ circles, nodes, edges, nGon, planeCount, coincidentCount }}
   */
  cube(halfSize = 1, options = {}) {
    const nGon = options.nGon || 5;
    const rotation = options.rotation || 0;
    const coordPlanes = options.coordPlanes ?? true;
    const diagPlanes = options.diagPlanes ?? true;
    const radius = halfSize * RT.PureRadicals.sqrt3(); // circumsphere = s√3

    const activePlanes = [];
    if (coordPlanes) activePlanes.push(...OCT_COORD_PLANES);
    if (diagPlanes) activePlanes.push(...TET_EDGE_PLANES);

    const circles = activePlanes.map(p => ({
      positions: makeCircle(p.normal, radius, nGon, rotation),
      color: p.color,
      label: p.label,
    }));

    const { nodes, edges, coincidentCount } = collectCircleVertices(
      circles,
      nGon
    );

    return {
      circles,
      nodes,
      edges,
      nGon,
      planeCount: activePlanes.length,
      coincidentCount,
    };
  },

  /**
   * Thomson Icosahedron — great circles on icosahedral symmetry planes.
   * 15 planes total: 3 coordinate (reuse OCT_COORD_PLANES) + 12 edge-mirror (phi-based).
   *
   * @param {number} halfSize - Circumsphere radius (default 1)
   * @param {Object} options
   * @param {number} options.nGon - Polygon resolution per circle (3-12, default 5)
   * @param {number} options.rotation - Rotation of each circle about its normal (degrees, default 0)
   * @param {boolean} options.coordPlanes - Show 3 coordinate planes (default true)
   * @param {boolean} options.edgeMirrorPlanes - Show 12 edge-mirror planes (default true)
   * @returns {{ circles, nodes, edges, nGon, planeCount, coincidentCount }}
   */
  icosahedron(halfSize = 1, options = {}) {
    const nGon = options.nGon || 5;
    const rotation = options.rotation || 0;
    const coordPlanes = options.coordPlanes ?? true;
    const edgeMirrorPlanes = options.edgeMirrorPlanes ?? true;
    const radius = halfSize; // circumsphere

    const activePlanes = [];
    if (coordPlanes) activePlanes.push(...OCT_COORD_PLANES);
    if (edgeMirrorPlanes) activePlanes.push(...getIcosaEdgePlanes());

    const circles = activePlanes.map(p => ({
      positions: makeCircle(p.normal, radius, nGon, rotation),
      color: p.color,
      label: p.label,
    }));

    const { nodes, edges, coincidentCount } = collectCircleVertices(
      circles,
      nGon
    );

    return {
      circles,
      nodes,
      edges,
      nGon,
      planeCount: activePlanes.length,
      coincidentCount,
    };
  },

  octahedron(halfSize = 1, options = {}) {
    const nGon = options.nGon || 5;
    const rotation = options.rotation || 0;
    const radius = halfSize; // circumsphere

    const circles = OCT_COORD_PLANES.map(p => ({
      positions: makeCircle(p.normal, radius, nGon, rotation),
      color: p.color,
      label: p.label,
    }));

    const { nodes, edges, coincidentCount } = collectCircleVertices(
      circles,
      nGon
    );

    return {
      circles,
      nodes,
      edges,
      nGon,
      planeCount: OCT_COORD_PLANES.length,
      coincidentCount,
    };
  },
};
