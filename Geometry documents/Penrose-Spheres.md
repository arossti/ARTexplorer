# Penrose-Spheres: Implementation Workplan

## Project Overview

**Goal**: Map Penrose tilings to icosahedral geodesic spheres for virology applications.

**Request Origin**: Bonnie Devarco - visualization of Penrose patterns on spherical virus capsids with 5-fold (icosahedral) symmetry.

**Strategy**:
1. Create RT-pure Penrose tile generators (rhombi and Robinson triangles)
2. Generate Penrose tilings that fit equilateral triangles
3. Apply Penrose patterns to icosahedral geodesic nets
4. Wrap tiled nets onto geodesic spheres

---

## Mathematical Foundation

### Penrose Tile Types

**P3 Rhombic Tiles** (preferred for implementation):
- **Thick Rhombus**: Angles 72°, 108°, 72°, 108°
- **Thin Rhombus**: Angles 36°, 144°, 36°, 144°

**Robinson Triangles** (building blocks):
- **BL (Large)**: Isosceles triangle, **legs:legs:base = φ:φ:1** (legs are φ times longer than base)
- **BS (Small)**: Isosceles triangle, **legs:legs:base = ψ:ψ:1** (legs are ψ = 1/φ times shorter than base)

### Golden Ratio Relationships

All Penrose geometry derives from φ = (1 + √5)/2 ≈ 1.618:

| Angle | Spread s = sin²(θ) | RT Expression |
|-------|-------------------|---------------|
| 36°   | (5 - √5)/8 ≈ 0.0955 | `RT.PurePhi.pentagon.alpha()` |
| 72°   | (5 + √5)/8 ≈ 0.9045 | `RT.PurePhi.pentagon.beta()` |
| 108°  | (5 + √5)/8 ≈ 0.9045 | Same as 72° (sin²(180°-θ) = sin²(θ)) |
| 144°  | (5 - √5)/8 ≈ 0.0955 | Same as 36° |

**Key insight**: All Penrose angles are multiples of 36°, using only α and β!

### Matching Rules

Matching rules enforce aperiodicity. Tiles decorated with arcs that must align:
- **7 valid vertex configurations** out of 54 possible angle combinations
- **2 special configurations** with 5-fold rotational symmetry ("Star" and "Sun")

### Viral Capsid Application (Twarock)

Reidun Twarock's research shows:
- Viral capsids use quasicrystalline (Penrose-like) patterns
- Human Papillomavirus (HPV) has 5-fold symmetry not captured by classical models
- Penrose tilings explain structures that violate traditional crystallographic rules

---

## 4D Quadray Approach: Native Icosahedral Mapping

### The Insight: 4D±  Space for Seamless Tiling

Traditional Penrose-to-sphere mapping treats icosahedral faces as 2D patches that must be "cut and stitched" together. This creates the **edge continuity problem**: tiles crossing face boundaries must be explicitly matched.

ARTexplorer's **4D Quadray framework** (see [Janus-Inversion.tex](./Janus-Inversion.tex), [Quadray-Rotors.tex](./Quadray-Rotors.tex), [4D-COORDINATES.md](./4D-COORDINATES.md)) offers a fundamentally different approach where edge matching becomes **automatic and topologically enforced**.

### Why 4D Quadray Advantages Penrose Mapping

| Challenge | Traditional 3D Approach | 4D Quadray Approach |
|-----------|------------------------|---------------------|
| Edge continuity | Half-tiles, explicit matching rules | **Janus inversion** through edge |
| Face rotations | sin/cos chains, error accumulation | **RT-pure spread rotors** (no gimbal lock) |
| 5-fold symmetry | Imposed externally on XYZ | **Native** to φ-based tetrahedral coordinates |
| Matching rules | 2D arrow decorations | **4D vector complementarity** |
| Double-cover | Implicit (quaternion ambiguity) | **Explicit Janus polarity bit** |

### Janus Inversion for Edge Continuity

From [Janus-Inversion.tex](./Janus-Inversion.tex), the **Janus Point** is the dimensional transition at origin where forms pass from 4D+ (positive dimensional space) to 4D− (negative/complementary dimensional space).

**Key insight for Penrose mapping**: When two icosahedral faces meet at an edge, treat one face as being in 4D+ and its neighbor as being in 4D−. The **edge itself becomes the Janus Point** — the dimensional transition boundary.

```
Face A (4D+)          Edge (Janus Point)          Face B (4D−)
     /\                      |                      /\
    /  \                     |                     /  \
   / T₁ \    ← tile crosses →|← and emerges →    / T₁' \
  /______\                   |                  /______\

T₁ in 4D+: (w, x, y, z, +)
T₁' in 4D−: (-w, -x, -y, -z, −)   ← Janus inversion preserves topology!
```

**Why this works**: Janus inversion is not a "cut" — it's a **continuous topological transformation** (inside-outing through a higher-dimensional embedding). The tile doesn't get clipped; it **inverts** through the edge and emerges whole on the adjacent face. Matching is automatic because inversion preserves all geometric relationships.

### RT-Pure Face Rotations with Spread-Quadray Rotors

From [Quadray-Rotors.tex](./Quadray-Rotors.tex), **Spread-Quadray Rotors** provide gimbal-lock-free rotations using:
- **Spread** (s = sin²θ) instead of angles
- **4 independent coordinates** (no zero-sum constraint)
- **Explicit Janus polarity** for double-cover

For Penrose icosahedral mapping, the critical rotations are **multiples of 72°** (between adjacent faces at 5-fold vertices). These map directly to our pentagon spread constants:

```javascript
// RT-pure face rotation using spread β (72°)
const beta = RT.PurePhi.pentagon.beta();  // (5+√5)/8 ≈ 0.9045

// Rotor for 72° rotation about tetrahedral axis
const rotor72 = {
  W: cos(36°),  // half-angle: RT.PurePhi.pentagon.cos36()
  X: sin(36°) * axisX,
  Y: sin(36°) * axisY,
  Z: sin(36°) * axisZ,
  polarity: '+'  // Explicit Janus state
};
```

**Algebraic exactness**: Unlike quaternion sin/cos chains that accumulate floating-point errors, Spread-Quadray rotors use **cached RT-pure values** from `RT.PurePhi.pentagon`. After 5 consecutive 72° rotations (full 360°), we return to **exact** starting position.

### 4D Matching Rules (No Arrow Decorations)

Traditional Penrose matching uses **2D arrow decorations** on tile edges — each edge has a direction that must match its neighbor. This requires explicit validation.

In 4D Quadray space, matching becomes **implicit**:

```
Standard Penrose (2D):
  Edge E on Tile A: → (arrow pointing right)
  Edge E on Tile B: ← (arrow pointing left)
  Match if: arrows oppose (explicit rule check)

4D Quadray (implicit matching):
  Edge E on Tile A: (w, x, y, z, +)
  Edge E on Tile B: (-w, -x, -y, -z, −)
  Match if: B = Janus(A)  (automatic from inversion)
```

Two edges match **if and only if one is the Janus inversion of the other**. This is a single comparison, not a rule lookup.

### Icosahedral Vertices: Native 5-Fold Symmetry

The icosahedron has **12 vertices**, each with **5-fold rotational symmetry**. In Cartesian coordinates, these involve awkward combinations of φ.

In Quadray coordinates, the icosahedral vertices relate naturally to the **Stella Octangula** (interpenetrating tetrahedra) documented in [4D-COORDINATES.md](./4D-COORDINATES.md):

| Vertex Type | Cartesian | Quadray |
|-------------|-----------|---------|
| Icosahedron 5-fold vertex | (0, ±1, ±φ) | Linear combo of W, X, Y, Z with φ coefficients |
| Stella Octangula vertex | (+1, +1, +1) | (1, 0, 0, 0) + permutations |

The **φ-based Quadray relationships** mean Penrose's golden ratio geometry aligns natively with icosahedral structure. No coordinate transformation needed.

### Implementation Strategy: 4D Penrose Net

Instead of generating flat tilings and projecting to sphere, we work **natively in 4D Quadray space**:

```
Phase 1: Seed at Icosahedral Vertex (4D+)
  - Place 5-fold Penrose seed (Star or Sun) at one icosahedral vertex
  - Vertex is naturally a 5-fold Quadray position

Phase 2: Deflate in 4D
  - Each deflation step subdivides tiles
  - Tiles naturally extend toward adjacent vertices
  - Edge crossings trigger Janus inversion (automatic matching)

Phase 3: Spherical Projection (GPU Boundary)
  - Only at final render: convert Quadray → Cartesian → THREE.Vector3
  - Single sqrt expansion at the very end
  - All preceding algebra is RT-pure
```

### Data Structures: 4D Tiles

```javascript
/**
 * 4D Penrose Tile (Quadray representation)
 *
 * Vertices stored as Quadray coordinates (W, X, Y, Z)
 * with explicit Janus polarity for each tile
 */
const Tile4D = {
  type: 'thick-rhombus',

  // Vertices in Quadray coordinates (no zero-sum constraint)
  vertices: [
    { w: 1.0, x: 0.0, y: 0.618, z: 0.0 },  // V0
    { w: 0.618, x: 1.0, y: 0.0, z: 0.0 },  // V1
    { w: 0.0, x: 0.618, y: 1.0, z: 0.0 },  // V2
    { w: 0.618, x: 0.0, y: 0.0, z: 1.0 },  // V3
  ],

  // Janus polarity: '+' = 4D+, '−' = 4D−
  polarity: '+',

  // Edge matching: stores adjacent tile IDs after inversion
  neighbors: {
    edge01: { tileId: 'T42', janusInverted: true },
    edge12: { tileId: 'T17', janusInverted: false },
    // ...
  },

  // Quadrance-based metrics (RT-pure)
  metadata: {
    diagonalQuadranceShort: 1.0,
    diagonalQuadranceLong: 2.618, // φ²
    rtPure: true,
  }
};
```

### Conversion to THREE.js (GPU Boundary)

```javascript
/**
 * Convert 4D Quadray tile to THREE.js geometry
 * This is the ONLY place sqrt is expanded
 */
function tile4DToThreeJS(tile4D) {
  const vertices = tile4D.vertices.map(q => {
    // Quadray → Cartesian conversion (from rt-math.js)
    const cartesian = RT.Quadray.toCartesian(q.w, q.x, q.y, q.z);

    // GPU boundary: create THREE.Vector3
    return new THREE.Vector3(cartesian.x, cartesian.y, cartesian.z);
  });

  return {
    vertices,
    edges: tile4D.edges,
    faces: tile4D.faces,
    metadata: {
      ...tile4D.metadata,
      janusPolarity: tile4D.polarity,
    }
  };
}
```

### Summary: 4D Quadray Benefits

1. **Edge continuity is automatic** — Janus inversion replaces explicit matching rules
2. **No gimbal lock** — Spread-Quadray rotors for face transitions
3. **Native φ geometry** — Penrose golden ratios align with Quadray structure
4. **RT-pure throughout** — sqrt expansion only at GPU boundary
5. **Explicit double-cover** — Janus polarity bit (no quaternion ambiguity)
6. **Topological correctness** — Inversion preserves tile integrity (no clipping)

This approach transforms Penrose-to-icosahedron from a "cut and stitch" problem into a **native 4D tiling** problem where matching is enforced by the coordinate system itself.

---

## Implementation Architecture

### New Module: `modules/rt-penrose.js`

```
rt-penrose.js
├── PenroseTiles (namespace)
│   ├── _robinsonTriangleLarge(Q)  // BL triangle (1:1:φ)
│   ├── _robinsonTriangleSmall(Q)  // BS triangle (1:1:ψ)
│   ├── thickRhombus(Q)            // 72°/108° rhombus (2×BL)
│   ├── thinRhombus(Q)             // 36°/144° rhombus (2×BS)
│   ├── kite(Q)                    // Kite prototile (BL + BS)
│   ├── dart(Q)                    // Dart prototile (2×BS)
│   └── metadata                   // Tile properties & matching rules
│
├── PenroseTiling (namespace)
│   ├── deflate(tiles)             // Subdivision inflation rule
│   ├── inflate(tiles)             // Reverse subdivision
│   ├── validateMatching(tiles)    // Check matching rules
│   ├── trianglePatch(Q, generations) // Tiling constrained to equilateral triangle
│   └── randomTiling(bounds, seed)    // Stochastic generation
│
├── PenroseGeodesic (namespace)
│   ├── mapToIcosahedralNet(tiling)   // Map flat tiling to unfolded icosahedron
│   ├── wrapToSphere(net, radius)     // Wrap net onto geodesic sphere
│   └── applyToGeodesic(geodesic, penroseTiling) // Apply to existing geodesic
│
└── Presets
    ├── STAR_VERTEX                // 5-fold star configuration
    ├── SUN_VERTEX                 // 5-fold sun configuration
    ├── CARTWHEEL                  // Classic Penrose pattern
    └── VIRAL_CAPSID_T4            // Virus-specific template
```

### Integration Points

| File | Integration |
|------|-------------|
| `index.html` | Penrose Polygon UI in Primitives section, Penrose toggle in Geodesic options |
| `rt-ui-binding-defs.js` | Declarative bindings for Penrose controls |
| `rt-rendering.js` | Penrose tile group, color palette, rendering block |
| `rt-init.js` | Event handlers, formGroups arrays |
| `rt-filehandler.js` | State persistence for Penrose parameters |
| `rt-polyhedra.js` | Geodesic icosahedron Penrose option |

---

## Phase 1: RT-Pure Penrose Tiles

### 1.1 Robinson Triangles

Robinson triangles are the atomic building blocks:

```javascript
/**
 * Large Robinson Triangle (BL)
 * Isosceles with sides 1:1:φ
 * Base angle: 72° (spread = β)
 * Apex angle: 36° (spread = α)
 *
 * @param {number} quadrance - Base quadrance (Q)
 * @returns {Object} {vertices, edges, faces, metadata}
 */
_robinsonTriangleLarge: (quadrance = 1) => {
  const phi = RT.PurePhi.value();
  const alpha = RT.PurePhi.pentagon.alpha(); // spread for 36°
  const beta = RT.PurePhi.pentagon.beta();   // spread for 72°

  // Base length = √Q
  const baseLength = Math.sqrt(quadrance);

  // Leg length = φ × base (sides ratio 1:1:φ means legs are φ times base)
  // Wait - let's clarify: for BL, if base = 1, then legs = φ
  // So leg quadrance = φ² × Q
  const legQuadrance = RT.PurePhi.squared() * quadrance;

  // Apex at origin, base below (standard orientation)
  // Using exact golden ratio trigonometry:
  // cos(72°) = (√5 - 1)/4 = RT.PurePhi.pentagon.cos72()
  // sin(72°) = √(10 + 2√5)/4 = RT.PurePhi.pentagon.sin72()
  const cos72 = RT.PurePhi.pentagon.cos72();
  const sin72 = RT.PurePhi.pentagon.sin72();
  const legLength = Math.sqrt(legQuadrance);

  // Vertices: apex at origin, base vertices symmetrically placed
  const vertices = [
    new THREE.Vector3(0, 0, 0),                           // Apex (36° angle)
    new THREE.Vector3(-legLength * sin72, -legLength * cos72, 0), // Base left (72°)
    new THREE.Vector3(legLength * sin72, -legLength * cos72, 0),  // Base right (72°)
  ];

  const edges = [[0, 1], [1, 2], [2, 0]];
  const faces = [[0, 1, 2]]; // CCW for +Z normal

  return {
    vertices,
    edges,
    faces,
    metadata: {
      type: 'robinson-large',
      baseQuadrance: quadrance,
      legQuadrance,
      apexSpread: alpha,  // 36°
      baseSpread: beta,   // 72°
      rtPure: true,
    }
  };
},
```

### 1.2 Rhombic Tiles

```javascript
/**
 * Thick Rhombus (72°/108°)
 * Composed of two Large Robinson triangles (BL + BL mirrored)
 *
 * Angles: 72°, 108°, 72°, 108°
 * Diagonals ratio: 1:φ (short:long)
 *
 *       V0 (72°)
 *      /  \
 *    V3    V1
 *      \  /
 *       V2 (72°)
 *
 * @param {number} quadrance - Short diagonal quadrance
 */
thickRhombus: (quadrance = 1) => {
  const phi = RT.PurePhi.value();
  const cos72 = RT.PurePhi.pentagon.cos72();
  const sin72 = RT.PurePhi.pentagon.sin72();
  const cos36 = RT.PurePhi.pentagon.cos36();  // (1+√5)/4 = φ/2 [FIXED: use cached value]
  const sin36 = RT.PurePhi.pentagon.sin36();  // [FIXED: use cached value]

  // Short diagonal = √Q, long diagonal = φ × √Q
  const shortDiag = Math.sqrt(quadrance);
  const longDiag = phi * shortDiag;

  // Vertices at diagonal endpoints
  // Short diagonal along Y, long diagonal along X
  const vertices = [
    new THREE.Vector3(0, shortDiag / 2, 0),   // V0 (top, 72° angle)
    new THREE.Vector3(longDiag / 2, 0, 0),    // V1 (right, 108° angle)
    new THREE.Vector3(0, -shortDiag / 2, 0),  // V2 (bottom, 72° angle)
    new THREE.Vector3(-longDiag / 2, 0, 0),   // V3 (left, 108° angle)
  ];

  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
  const faces = [[0, 1, 2, 3]]; // CCW

  // Edge quadrance: derived from diagonal half-lengths
  // edge² = (shortDiag/2)² + (longDiag/2)²
  //       = Q/4 + φ²Q/4 = Q(1 + φ²)/4 = Q(1 + φ + 1)/4 = Q(φ + 2)/4
  const edgeQuadrance = quadrance * (phi + 2) / 4;

  return {
    vertices,
    edges,
    faces,
    metadata: {
      type: 'thick-rhombus',
      shortDiagonalQuadrance: quadrance,
      longDiagonalQuadrance: phi * phi * quadrance,
      edgeQuadrance,
      acuteAngleSpread: RT.PurePhi.pentagon.beta(),  // 72°
      obtuseAngleSpread: RT.PurePhi.pentagon.beta(), // 108° [FIXED: same spread as 72°, NOT alpha]
      rtPure: true,
    }
  };
},

/**
 * Thin Rhombus (36°/144°)
 * Composed of two Small Robinson triangles (BS + BS mirrored)
 *
 * Angles: 36°, 144°, 36°, 144°
 * Diagonals ratio: 1:φ² (short:long)
 */
thinRhombus: (quadrance = 1) => {
  const phi = RT.PurePhi.value();
  const phiSq = RT.PurePhi.squared();

  // Short diagonal = √Q, long diagonal = φ² × √Q
  const shortDiag = Math.sqrt(quadrance);
  const longDiag = phiSq * shortDiag;

  const vertices = [
    new THREE.Vector3(0, shortDiag / 2, 0),   // V0 (top, 36° angle)
    new THREE.Vector3(longDiag / 2, 0, 0),    // V1 (right, 144° angle)
    new THREE.Vector3(0, -shortDiag / 2, 0),  // V2 (bottom, 36° angle)
    new THREE.Vector3(-longDiag / 2, 0, 0),   // V3 (left, 144° angle)
  ];

  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
  const faces = [[0, 1, 2, 3]];

  // Edge quadrance = Q(1 + φ⁴)/4
  const edgeQuadrance = quadrance * (1 + RT.PurePhi.fourthPower()) / 4;

  return {
    vertices,
    edges,
    faces,
    metadata: {
      type: 'thin-rhombus',
      shortDiagonalQuadrance: quadrance,
      longDiagonalQuadrance: phiSq * phiSq * quadrance,
      edgeQuadrance,
      acuteAngleSpread: RT.PurePhi.pentagon.alpha(),  // 36°
      obtuseAngleSpread: RT.PurePhi.pentagon.alpha(), // 144° (same spread)
      rtPure: true,
    }
  };
},
```

---

## Phase 2: Penrose Tiling Generation

### 2.1 Deflation (Subdivision) Rules

The key to generating Penrose tilings is the **deflation** operation: each tile subdivides into smaller copies of both tile types.

```javascript
/**
 * Deflation rules for P3 (rhombic) Penrose tiling
 *
 * Thick Rhombus → 2 thick + 1 thin (3 tiles)
 * Thin Rhombus → 1 thick + 1 thin (2 tiles)
 *
 * Scale factor: 1/φ (tiles shrink by golden ratio)
 */
deflate: (tiles) => {
  const newTiles = [];
  const scaleFactor = 1 / RT.PurePhi.value(); // ≈ 0.618

  for (const tile of tiles) {
    if (tile.type === 'thick-rhombus') {
      // Thick rhombus subdivides into 2 thick + 1 thin
      // Positions calculated from centroid and vertex angles
      const subdivided = PenroseTiling._deflateThickRhombus(tile, scaleFactor);
      newTiles.push(...subdivided);
    } else if (tile.type === 'thin-rhombus') {
      // Thin rhombus subdivides into 1 thick + 1 thin
      const subdivided = PenroseTiling._deflateThinRhombus(tile, scaleFactor);
      newTiles.push(...subdivided);
    }
  }

  return newTiles;
},

/**
 * Generate tiling by repeated deflation
 * @param {number} generations - Number of deflation iterations
 * @param {string} seed - Starting configuration ('star', 'sun', 'single-thick', 'single-thin')
 */
generate: (generations = 5, seed = 'star') => {
  // Initialize with seed configuration
  let tiles = PenroseTiling._seedConfiguration(seed);

  // Apply deflation iterations
  for (let g = 0; g < generations; g++) {
    tiles = PenroseTiling.deflate(tiles);
    console.log(`[RT] Penrose generation ${g + 1}: ${tiles.length} tiles`);
  }

  return tiles;
},
```

### 2.2 Triangle-Constrained Tiling

For icosahedral mapping, we need tilings that fit within equilateral triangles:

```javascript
/**
 * Generate Penrose tiling constrained to equilateral triangle
 *
 * This is the key function for icosahedral mapping:
 * An icosahedron net consists of 20 equilateral triangles.
 * If we can tile each triangle with Penrose patterns, we can
 * wrap the result onto a geodesic sphere.
 *
 * @param {number} triangleQuadrance - Edge quadrance of bounding triangle
 * @param {number} generations - Deflation iterations
 * @returns {Object} {tiles, boundary, metadata}
 */
trianglePatch: (triangleQuadrance, generations = 5) => {
  // Generate full Penrose tiling
  const fullTiling = PenroseTiling.generate(generations, 'star');

  // Clip to equilateral triangle boundary
  const triangleEdge = Math.sqrt(triangleQuadrance);
  const triangleVertices = Primitives._polygonTriangle(triangleQuadrance, { showFace: false }).vertices;

  // Filter tiles that lie within triangle
  const clippedTiles = fullTiling.filter(tile => {
    const centroid = PenroseTiling._tileCentroid(tile);
    return PenroseTiling._pointInTriangle(centroid, triangleVertices);
  });

  // Clip tiles at boundary (split tiles that cross edges)
  const boundaryClippedTiles = clippedTiles.flatMap(tile => {
    if (PenroseTiling._tileIntersectsBoundary(tile, triangleVertices)) {
      return PenroseTiling._clipTileToBoundary(tile, triangleVertices);
    }
    return [tile];
  });

  return {
    tiles: boundaryClippedTiles,
    boundary: triangleVertices,
    metadata: {
      triangleQuadrance,
      generations,
      tileCount: boundaryClippedTiles.length,
    }
  };
},
```

---

## Phase 3: Icosahedral Geodesic Mapping

### 3.1 Icosahedral Net

The icosahedron unfolds into a net of 20 equilateral triangles:

```
     /\    /\    /\    /\    /\
    /  \  /  \  /  \  /  \  /  \     <- 5 triangles (top cap)
   /____\/____\/____\/____\/____\
   \    /\    /\    /\    /\    /
    \  /  \  /  \  /  \  /  \  /     <- 10 triangles (middle band)
     \/    \/    \/    \/    \/
      \    /\    /\    /\    /\
       \  /  \  /  \  /  \  /        <- 5 triangles (bottom cap)
        \/    \/    \/    \/
```

### 3.2 Net Generation

```javascript
/**
 * Generate icosahedral net with consistent triangle labeling
 * @returns {Object} {triangles: [{vertices, faceIndex, neighbors}], metadata}
 */
generateIcosahedralNet: () => {
  // Standard icosahedron face adjacency
  // Each face labeled 0-19 with neighbor information
  const faces = [];

  // Face layout follows standard unfolding
  // Top cap: faces 0-4 (pointing up)
  // Middle band: faces 5-14 (alternating up/down)
  // Bottom cap: faces 15-19 (pointing down)

  // ... face adjacency and position calculation ...

  return {
    triangles: faces,
    metadata: {
      faceCount: 20,
      layout: 'standard-unfolding',
    }
  };
},
```

### 3.3 Mapping Tiling to Net

```javascript
/**
 * Apply Penrose tiling to icosahedral net
 *
 * Strategy:
 * 1. Generate one Penrose triangle patch
 * 2. Copy to all 20 faces with appropriate rotations
 * 3. Ensure matching rules preserved across face boundaries
 *
 * @param {Object} tiling - Penrose triangle patch
 * @param {Object} net - Icosahedral net
 * @returns {Object} {faces: [{tiles, transform}], metadata}
 */
mapToIcosahedralNet: (tiling, net) => {
  const mappedFaces = [];

  for (const face of net.triangles) {
    // Calculate rotation needed for this face
    // (5-fold symmetry means rotations of 72° multiples)
    const rotation = face.faceIndex % 5; // 0, 1, 2, 3, 4
    const rotationAngle = rotation * (2 * Math.PI / 5);

    // Transform tiling to face coordinates
    const transformedTiles = tiling.tiles.map(tile =>
      PenroseGeodesic._rotateTile(tile, rotationAngle, face.centroid)
    );

    mappedFaces.push({
      faceIndex: face.faceIndex,
      tiles: transformedTiles,
      rotation,
    });
  }

  return {
    faces: mappedFaces,
    metadata: {
      totalTiles: mappedFaces.reduce((sum, f) => sum + f.tiles.length, 0),
    }
  };
},
```

### 3.4 Wrapping to Sphere

```javascript
/**
 * Project tiled net onto geodesic sphere
 *
 * Uses central projection from icosahedron centroid:
 * Each point on the flat net maps to the sphere surface
 * along a ray from the center.
 *
 * @param {Object} tiledNet - Net with Penrose tiles
 * @param {number} radiusQ - Sphere radius quadrance
 * @returns {Object} {vertices, edges, faces, tiles}
 */
wrapToSphere: (tiledNet, radiusQ) => {
  const radius = Math.sqrt(radiusQ);

  // For each tile vertex:
  // 1. Compute position on icosahedron face
  // 2. Project outward to sphere surface
  // 3. Store spherical coordinates

  const sphericalTiles = tiledNet.faces.flatMap(face => {
    return face.tiles.map(tile => {
      const sphericalVertices = tile.vertices.map(v => {
        // Convert flat position to 3D on icosahedron face
        const facePosition = PenroseGeodesic._flatToFace3D(v, face);

        // Project radially to sphere
        const normalized = facePosition.clone().normalize();
        return normalized.multiplyScalar(radius);
      });

      return {
        vertices: sphericalVertices,
        edges: tile.edges,
        faces: tile.faces,
        metadata: tile.metadata,
      };
    });
  });

  return {
    tiles: sphericalTiles,
    sphereRadiusQ: radiusQ,
    metadata: {
      totalTiles: sphericalTiles.length,
      projection: 'central-radial',
    }
  };
},
```

---

## Phase 4: UI Integration

### 4.1 Primitives Panel - Penrose Tiles

Add to `index.html` Primitives section:

```html
<!-- Penrose Tiles (in Primitives section) -->
<div class="control-item">
  <label class="checkbox-label">
    <input type="checkbox" id="showPenroseTile" />
    Penrose Tile
  </label>
  <div id="penrose-tile-controls" class="sub-controls" style="display: none">
    <!-- Tile Type Selection -->
    <div class="radio-group">
      <label><input type="radio" name="penroseTileType" value="thick" checked> Thick Rhombus</label>
      <label><input type="radio" name="penroseTileType" value="thin"> Thin Rhombus</label>
      <label><input type="radio" name="penroseTileType" value="kite"> Kite</label>
      <label><input type="radio" name="penroseTileType" value="dart"> Dart</label>
      <label><input type="radio" name="penroseTileType" value="robinson-lg"> Robinson (Large)</label>
      <label><input type="radio" name="penroseTileType" value="robinson-sm"> Robinson (Small)</label>
    </div>

    <!-- Size Control -->
    <div class="slider-row">
      <label>Q:</label>
      <input type="number" id="penroseTileQ" value="1" step="0.1" min="0.01">
    </div>

    <!-- Edge Weight -->
    <div class="slider-row">
      <label>Edge:</label>
      <input type="range" id="penroseTileEdgeWeight" min="1" max="10" value="2">
      <span id="penroseTileEdgeWeightValue">2</span>
    </div>

    <!-- Show Matching Arcs -->
    <label class="checkbox-label">
      <input type="checkbox" id="penroseTileShowArcs" checked>
      Show Matching Arcs
    </label>
  </div>
</div>
```

### 4.2 Penrose Tiling Panel

```html
<!-- Penrose Tiling (new panel or section) -->
<div class="control-item">
  <label class="checkbox-label">
    <input type="checkbox" id="showPenroseTiling" />
    Penrose Tiling
  </label>
  <div id="penrose-tiling-controls" class="sub-controls" style="display: none">
    <!-- Generation Slider -->
    <div class="slider-row">
      <label>Generations:</label>
      <input type="range" id="penroseGenerations" min="1" max="8" value="5">
      <span id="penroseGenerationsValue">5</span>
    </div>

    <!-- Seed Pattern -->
    <div class="radio-group">
      <label><input type="radio" name="penroseSeed" value="star" checked> Star</label>
      <label><input type="radio" name="penroseSeed" value="sun"> Sun</label>
      <label><input type="radio" name="penroseSeed" value="cartwheel"> Cartwheel</label>
      <label><input type="radio" name="penroseSeed" value="random"> Random</label>
    </div>

    <!-- Boundary -->
    <div class="radio-group">
      <label><input type="radio" name="penroseBoundary" value="none" checked> None</label>
      <label><input type="radio" name="penroseBoundary" value="triangle"> Triangle</label>
      <label><input type="radio" name="penroseBoundary" value="pentagon"> Pentagon</label>
      <label><input type="radio" name="penroseBoundary" value="circle"> Circle</label>
    </div>
  </div>
</div>
```

### 4.3 Geodesic Penrose Option

In the Geodesic Icosahedron controls:

```html
<!-- Add to existing Geodesic Icosahedron controls -->
<div class="control-row">
  <label class="checkbox-label">
    <input type="checkbox" id="geodesicIcoPenrose">
    Apply Penrose Tiling
  </label>
  <div id="geodesic-penrose-options" style="display: none">
    <label>Pattern:</label>
    <select id="geodesicPenrosePattern">
      <option value="inherit">Use Active Penrose Tile</option>
      <option value="star">Star (5-fold)</option>
      <option value="sun">Sun (5-fold)</option>
      <option value="viral-hpv">HPV Capsid</option>
      <option value="viral-rotavirus">Rotavirus</option>
    </select>
  </div>
</div>
```

---

## Phase 5: Rendering

### 5.1 Color Palette

```javascript
// In rt-rendering.js colorPalette
penroseThick: 0xFFD700,   // Gold
penroseThin: 0x4169E1,    // Royal Blue
penroseKite: 0xFFD700,    // Gold
penroseDart: 0x4169E1,    // Royal Blue
penroseMatchingArc: 0xFF4500, // Orange-Red (for matching rule arcs)
```

### 5.2 Rendering Block

```javascript
// In updateGeometry()
if (document.getElementById("showPenroseTile")?.checked) {
  const tileType = document.querySelector('input[name="penroseTileType"]:checked')?.value || 'thick';
  const quadrance = parseFloat(document.getElementById("penroseTileQ")?.value) || 1;
  const edgeWeight = parseInt(document.getElementById("penroseTileEdgeWeight")?.value) || 2;
  const showArcs = document.getElementById("penroseTileShowArcs")?.checked;

  let tileGeometry;
  let color;

  switch (tileType) {
    case 'thick':
      tileGeometry = PenroseTiles.thickRhombus(quadrance);
      color = colorPalette.penroseThick;
      break;
    case 'thin':
      tileGeometry = PenroseTiles.thinRhombus(quadrance);
      color = colorPalette.penroseThin;
      break;
    case 'kite':
      tileGeometry = PenroseTiles.kite(quadrance);
      color = colorPalette.penroseKite;
      break;
    case 'dart':
      tileGeometry = PenroseTiles.dart(quadrance);
      color = colorPalette.penroseDart;
      break;
    // ... other cases
  }

  renderPolyhedron(penroseTileGroup, tileGeometry, color, opacity, { lineWidth: edgeWeight });

  if (showArcs) {
    renderMatchingArcs(penroseTileGroup, tileGeometry, colorPalette.penroseMatchingArc);
  }

  penroseTileGroup.visible = true;
} else {
  penroseTileGroup.visible = false;
}
```

---

## Phase 6: State Management

### 6.1 File Handler Updates

```javascript
// In saveStateToJSON()
penroseTile: {
  show: document.getElementById("showPenroseTile")?.checked || false,
  type: document.querySelector('input[name="penroseTileType"]:checked')?.value || 'thick',
  quadrance: parseFloat(document.getElementById("penroseTileQ")?.value) || 1,
  edgeWeight: parseInt(document.getElementById("penroseTileEdgeWeight")?.value) || 2,
  showArcs: document.getElementById("penroseTileShowArcs")?.checked || true,
},

penroseTiling: {
  show: document.getElementById("showPenroseTiling")?.checked || false,
  generations: parseInt(document.getElementById("penroseGenerations")?.value) || 5,
  seed: document.querySelector('input[name="penroseSeed"]:checked')?.value || 'star',
  boundary: document.querySelector('input[name="penroseBoundary"]:checked')?.value || 'none',
},

geodesicPenrose: {
  enabled: document.getElementById("geodesicIcoPenrose")?.checked || false,
  pattern: document.getElementById("geodesicPenrosePattern")?.value || 'inherit',
},
```

---

## Implementation Checklist

### Phase 1: Core Tiles
- [ ] Create `modules/rt-penrose.js` stub
- [ ] Implement `_robinsonTriangleLarge(Q)`
- [ ] Implement `_robinsonTriangleSmall(Q)`
- [ ] Implement `thickRhombus(Q)`
- [ ] Implement `thinRhombus(Q)`
- [ ] Implement `kite(Q)`
- [ ] Implement `dart(Q)`
- [ ] Add matching arc decoration data

### Phase 2: Tiling Generation
- [ ] Implement `deflate(tiles)` subdivision
- [ ] Implement `inflate(tiles)` reverse subdivision
- [ ] Implement `_seedConfiguration(seed)` for star/sun/cartwheel
- [ ] Implement `generate(generations, seed)`
- [ ] Implement `trianglePatch(Q, generations)`
- [ ] Implement `validateMatching(tiles)`

### Phase 3: Geodesic Mapping
- [ ] Implement `generateIcosahedralNet()`
- [ ] Implement `mapToIcosahedralNet(tiling, net)`
- [ ] Implement `wrapToSphere(tiledNet, radiusQ)`
- [ ] Implement `applyToGeodesic(geodesic, penroseTiling)`

### Phase 4: UI
- [ ] Add Penrose Tile controls to `index.html`
- [ ] Add Penrose Tiling controls
- [ ] Add Geodesic Penrose option
- [ ] Add declarative bindings to `rt-ui-binding-defs.js`

### Phase 5: Rendering
- [ ] Add Penrose colors to palette
- [ ] Add `penroseTileGroup` and `penroseTilingGroup`
- [ ] Implement tile rendering block
- [ ] Implement tiling rendering block
- [ ] Implement matching arc rendering

### Phase 6: Integration
- [ ] Add to formGroups arrays in `rt-init.js`
- [ ] Add state save/restore to `rt-filehandler.js`
- [ ] Add geometry stats for Penrose tiles
- [ ] Add to `getAllFormGroups()`
- [ ] Add to `createPolyhedronByType()`

### Phase 7: 4D Quadray Implementation
- [ ] Implement `Tile4D` data structure (Quadray vertices + Janus polarity)
- [ ] Implement `RT.Quadray.toCartesian()` conversion (if not already present)
- [ ] Implement Janus inversion for tile edges: `janusInvert(tile4D)`
- [ ] Implement 4D deflation that respects Janus boundaries
- [ ] Implement Spread-Quadray rotor for 72° face transitions
- [ ] Implement icosahedral vertex seeding in Quadray coordinates
- [ ] Implement automatic matching validation via Janus complementarity
- [ ] Add `tile4DToThreeJS()` GPU boundary conversion

### Phase 8: Testing
- [ ] Visual verification of tile shapes
- [ ] RT-purity validation (console logs)
- [ ] Matching rule enforcement (traditional 2D arrows)
- [ ] 4D Janus matching validation (automatic complementarity)
- [ ] Geodesic wrapping visual check
- [ ] State save/load roundtrip
- [ ] Performance with high generation counts
- [ ] Verify algebraic exactness after 5×72° rotations

---

## RT-Pure Implementation Notes

### Existing Assets to Leverage

```javascript
// Already implemented in rt-math.js:
RT.PurePhi.value()           // φ = (1 + √5)/2
RT.PurePhi.squared()         // φ² = φ + 1
RT.PurePhi.inverse()         // 1/φ = φ - 1
RT.PurePhi.pentagon.alpha()  // (5 - √5)/8 = spread for 36°
RT.PurePhi.pentagon.beta()   // (5 + √5)/8 = spread for 72°
RT.PurePhi.pentagon.cos72()  // (√5 - 1)/4
RT.PurePhi.pentagon.sin72()  // √(10 + 2√5)/4
RT.PurePhi.pentagon.cos144() // -(1 + √5)/4
RT.PurePhi.pentagon.sin144() // √(10 - 2√5)/4
RT.StarSpreads.pentagon()    // (5 + √5)/8
RT.StarSpreads.decagon()     // (3 - √5)/8
```

### Deferred √ Strategy

Following ARTexplorer conventions:
1. Accept **quadrance** (Q = length²) as input
2. Work with Q throughout calculations
3. Only call `Math.sqrt(Q)` when creating `THREE.Vector3`
4. Log RT validation: `[RT] Penrose ThickRhombus: Q=${Q}, rtPure=true`

---

## Research References

### ARTexplorer Foundational Documents

- **[Janus-Inversion.tex](./Janus-Inversion.tex)** — Geometric Janus Inversion: Extending the Janus Point from temporal to spatial geometry via Quadray coordinates. Establishes the 4D± framework where origin serves as dimensional transition point.

- **[Quadray-Rotors.tex](./Quadray-Rotors.tex)** — Spread-Quadray Rotors: A tetrahedral alternative to quaternions for gimbal-lock-free rotation. Combines full 4D Quadray, Rational Trigonometry spread/cross, and explicit Janus polarity.

- **[4D-COORDINATES.md](./4D-COORDINATES.md)** — Comprehensive Quadray (WXYZ) coordinate system reference. Covers native 4 DOF, the Stella Octangula, negative dimensionality, and all polyhedra in Quadray space.

### External References

- **Penrose Tilings**: Wikipedia, Wolfram MathWorld
- **Viral Capsid Tilings**: Reidun Twarock (York), "Structures of Spherical Viral Capsids as Quasicrystalline Tilings"
- **Spherical Penrose**: Bridges 2018 "A Class of Spherical Penrose-Like Tilings"
- **Matching Rules**: de Bruijn's pentagrid method, substitution rules
- **RT Foundation**: Wildberger "Divine Proportions" Chapter 14 (pentagon spreads α, β)
- **Fuller Synergetics**: R. Buckminster Fuller, "Synergetics: Explorations in the Geometry of Thinking"
- **Barbour Janus Point**: Julian Barbour, "The Janus Point: A New Theory of Time" (2020)

---

## Future Extensions

1. **Viral Capsid Presets**: HPV, rotavirus, etc. with documented T-numbers
2. **3D Penrose (Ammann Rhombohedra)**: Full 3D quasicrystal tilings
3. **Quasicrystal Mode**: Extends to dodecahedral and other 3D quasiperiodic structures
4. **Assembly Animation**: Visualize tile-by-tile assembly (viral assembly code)
5. **Export to STL**: 3D-printable Penrose spheres

---

## Implementation Review & Open Questions

> **Review Date:** February 2026
> **Status:** Critical review for implementation readiness

### Corrections to Workplan

#### 1. Robinson Triangle Side Ratio Notation (CLARIFICATION NEEDED)

The workplan states:
- BL (Large): sides ratio **1:1:φ**
- BS (Small): sides ratio **1:1:ψ**

**Clarification**: This notation is ambiguous. The actual geometry is:
- **BL**: Two LEGS of length φ, BASE of length 1 → ratio should be written **φ:φ:1** (legs:legs:base)
- **BS**: Two LEGS of length ψ=1/φ, BASE of length 1 → ratio should be written **ψ:ψ:1**

The implemented code in `rt-penrose.js` is CORRECT:
```javascript
// BL: legQuadrance = φ² × baseQuadrance (legs are φ times longer than base)
// BS: legQuadrance = (1/φ)² × baseQuadrance (legs are ψ times shorter than base)
```

**Action**: Update workplan notation to use unambiguous format: **legs:legs:base = φ:φ:1** for BL.

#### 2. Spread Metadata Error (BUG IN WORKPLAN)

The workplan line 417-418 contains an error:
```javascript
// WRONG:
acuteAngleSpread: RT.PurePhi.pentagon.beta(),  // 72°
obtuseAngleSpread: RT.PurePhi.pentagon.alpha(), // 108° (same spread as 72°)
```

**Correction**: Spread of 108° equals spread of 72° (both = β), NOT α!
```javascript
// CORRECT:
acuteAngleSpread: RT.PurePhi.pentagon.beta(),  // 72°
obtuseAngleSpread: RT.PurePhi.pentagon.beta(), // 108° has same spread as 72°
```

The implemented `rt-penrose.js` already handles this correctly.

#### 3. cos36 Calculation (OUTDATED IN WORKPLAN)

The workplan uses a confusing calculation:
```javascript
const cos36 = RT.PurePhi.pentagon.cos72() + 0.5; // cos(36°) = (1+√5)/4
```

**Correction**: Use the now-implemented cached value:
```javascript
const cos36 = RT.PurePhi.pentagon.cos36(); // Already cached in rt-math.js
```

The implemented `rt-penrose.js` already uses the correct cached values.

### Critical Missing Implementations

#### 4. Deflation Algorithm (CORE MISSING PIECE)

The deflation algorithm is marked TODO but is THE critical function for tiling generation.

**Required Implementation Details:**

```javascript
/**
 * Deflate a thick rhombus into 2 thick + 1 thin
 *
 * Geometry (see: de Bruijn, Penrose original papers):
 *
 *        V0 (72°)                    V0
 *       /    \                      /|\
 *      /      \         →          / | \
 *    V3        V1                V3  P  V1   (P = new vertex at φ-ratio)
 *      \      /                    \ | /
 *       \    /                      \|/
 *        V2 (72°)                    V2
 *
 * New vertex P divides long diagonal at golden ratio:
 *   P = V0 + (V2 - V0) × (1/φ)
 *
 * Resulting tiles:
 *   Thick 1: V0, V1, P, V3  (rotated)
 *   Thick 2: V1, V2, P      (actually this needs more work)
 *   Thin 1:  P, V2, V3
 *
 * ⚠️ RESEARCH NEEDED: Exact vertex positions for subdivided tiles
 * Reference: http://tilings.math.uni-bielefeld.de/substitution/penrose-rhomb/
 */
_deflateThickRhombus: (tile, scale) => {
  // TODO: Implement exact subdivision geometry
  // This requires careful calculation of new vertex positions
}
```

**Open Question**: The exact deflation rules vary by source. Need to verify:
- [ ] Which vertices become which in the subdivided tiles?
- [ ] Are the new tiles properly oriented for matching?
- [ ] Does the scale factor apply before or after subdivision?

#### 5. Triangle Patch Boundary Problem (FUNDAMENTAL ISSUE)

The `trianglePatch()` approach has a fundamental problem:

**Problem**: Clipping Penrose tiles to an equilateral triangle boundary:
1. Creates partial tiles at edges
2. Breaks matching rules
3. May not produce valid Penrose tiling at boundaries

**The 4D Quadray approach claims to solve this, but**:

⚠️ **UNRESOLVED**: How exactly does Janus inversion preserve matching rules?
- The claim is that `Tile_B = Janus(Tile_A)` automatically satisfies matching
- But matching rules depend on tile TYPE and ORIENTATION, not just position
- A Janus-inverted thick rhombus is still a thick rhombus with inverted coordinates
- Does this actually satisfy the arrow-matching rules?

**Research Required**:
- [ ] Prove (or disprove) that Janus inversion preserves Penrose matching
- [ ] If not automatic, what additional constraints are needed?
- [ ] Alternative: Use de Bruijn's pentagrid method which guarantees global consistency

#### 6. Icosahedron Face Adjacency (MISSING DATA)

The workplan references "face adjacency" but doesn't provide the actual adjacency table.

**Required Data Structure**:
```javascript
/**
 * Icosahedron face adjacency
 * Each face has 3 neighbors (sharing an edge)
 *
 * Standard labeling (see rt-polyhedra.js icosahedron implementation):
 * Faces 0-4: Top cap (around north pole)
 * Faces 5-14: Middle band
 * Faces 15-19: Bottom cap (around south pole)
 */
const ICOSAHEDRON_ADJACENCY = [
  // Face 0 neighbors
  { face: 0, neighbors: [{ face: 1, edge: 'AB' }, { face: 4, edge: 'AC' }, { face: 5, edge: 'BC' }] },
  // ... 19 more entries
];

// ⚠️ TODO: Verify against rt-polyhedra.js icosahedron face ordering
```

#### 7. Matching Arc Geometry (NOT SPECIFIED)

Matching arcs are mentioned but never defined.

**Required Specification**:
```javascript
/**
 * Matching arc decorations for Penrose tiles
 *
 * Each tile type has specific arc patterns:
 * - Arcs are circular segments
 * - Must connect when tiles are properly matched
 *
 * Thick Rhombus:
 *   - Arc A: Centered at V0 (acute vertex), radius = 0.3 × edge
 *   - Arc B: Centered at V2 (acute vertex), radius = 0.3 × edge
 *
 * Thin Rhombus:
 *   - Arc A: Centered at V0 (acute vertex), radius = 0.2 × edge
 *   - Arc B: Centered at V2 (acute vertex), radius = 0.2 × edge
 *
 * ⚠️ RESEARCH NEEDED: Exact arc radii and angular extents
 * Reference: Penrose's original 1974 paper
 */
```

### Existing Assets (Verified)

These functions already exist and can be used:

| Function | Location | Status |
|----------|----------|--------|
| `RT.PurePhi.pentagon.cos36()` | rt-math.js | ✅ Implemented |
| `RT.PurePhi.pentagon.sin36()` | rt-math.js | ✅ Implemented |
| `RT.PurePhi.penrose.rotate36()` | rt-math.js | ✅ Implemented |
| `RT.PurePhi.penrose.rotateN36()` | rt-math.js | ✅ Implemented |
| `Quadray.toCartesian()` | rt-math.js | ✅ Implemented |
| `Quadray.fromCartesian()` | rt-math.js | ✅ Implemented |
| `PenroseTiles.robinsonLarge()` | rt-penrose.js | ✅ Implemented |
| `PenroseTiles.robinsonSmall()` | rt-penrose.js | ✅ Implemented |
| `PenroseTiles.thickRhombus()` | rt-penrose.js | ✅ Implemented |
| `PenroseTiles.thinRhombus()` | rt-penrose.js | ✅ Implemented |
| `PenroseTiles.kite()` | rt-penrose.js | ✅ Implemented |
| `PenroseTiles.dart()` | rt-penrose.js | ✅ Implemented |
| Icosahedron Quadray vertices | 4D-COORDINATES.md | ✅ Documented |

### Performance Considerations

**Tile Count Growth**:
| Generations | Approx Tiles (star seed) | Notes |
|-------------|--------------------------|-------|
| 1 | 15 | 5 tiles × 3 avg |
| 2 | 37 | |
| 3 | 97 | |
| 4 | 252 | |
| 5 | 655 | Default in workplan |
| 6 | 1,702 | |
| 7 | 4,425 | Performance concern |
| 8 | 11,502 | May cause lag |

**Recommendation**: Cap generations at 6 for real-time interaction, allow 7-8 for export only.

### Revised Implementation Order

Based on dependencies and critical path:

**Phase 1: Verify Existing Tiles** (1 hour)
- [ ] Visual test all 6 tile types in browser console
- [ ] Verify RT-pure logging output
- [ ] Check face winding (CCW for outward normals)

**Phase 2: Implement Deflation** (4-6 hours) ⚠️ CRITICAL PATH
- [ ] Research exact deflation geometry from authoritative source
- [ ] Implement `_deflateThickRhombus()`
- [ ] Implement `_deflateThinRhombus()`
- [ ] Test: Single tile → verify 2-3 output tiles
- [ ] Test: 5 generations → visual inspection

**Phase 3: Seed Configurations** (1 hour)
- [ ] Implement star (5 thick rhombi, acute angles meeting)
- [ ] Implement sun (5 kites, 72° tips meeting)
- [ ] Verify 5-fold symmetry visually

**Phase 4: Basic UI** (2 hours)
- [ ] Add single tile display to Primitives
- [ ] Add generation slider
- [ ] Add seed selector

**Phase 5: Triangle Boundary** (2-3 hours)
- [ ] Implement point-in-triangle test
- [ ] Implement tile centroid filter
- [ ] Implement boundary clipping (accept partial tiles for now)

**Phase 6: Icosahedral Mapping** (4-6 hours)
- [ ] Implement net generation with adjacency
- [ ] Implement tile transformation to each face
- [ ] Implement spherical projection

**Phase 7: 4D Quadray Approach** (RESEARCH PHASE)
- [ ] Prototype Janus-based matching on paper/mathematically
- [ ] If valid: implement 4D tile structures
- [ ] If not valid: document why and use traditional approach

### Open Research Questions

1. **Deflation Exact Geometry**: What are the precise vertex positions after deflation? Multiple sources give slightly different rules.

2. **Janus Matching Validity**: Does Janus inversion truly preserve Penrose matching rules, or is additional logic required?

3. **Triangle Boundary Matching**: When tiling an equilateral triangle, can boundary tiles be arranged to match across icosahedral edges? Or is this fundamentally incompatible with aperiodicity?

4. **Twarock T-numbers**: What specific Penrose patterns correspond to T=1, T=3, T=4, T=7 viral capsids? Need literature review.

5. **3D Distortion**: When projecting flat Penrose tiles onto a sphere, how much angular distortion occurs? Is it acceptable for visualization?

### References for Implementation

- **Deflation rules**: [Tilings Encyclopedia - Penrose Rhombus](http://tilings.math.uni-bielefeld.de/substitution/penrose-rhomb/)
- **Original Penrose paper**: Penrose, R. (1974). "The role of aesthetics in pure and applied mathematical research"
- **de Bruijn pentagrid**: de Bruijn, N.G. (1981). "Algebraic theory of Penrose's non-periodic tilings"
- **Twarock capsids**: Twarock, R. (2006). "Mathematical virology: a novel approach to the structure and assembly of viruses"

---

## Next Session: Deflation Position Fix (Feb 4, 2026)

### Current State

**Commit**: `6104a93` - "Fix: Correct deflation geometry - divide long diagonal (V1-V3)"

**Architecture** (GOOD - keep this):
- Tiles parameterized as `{type, quadrance, rotationN36, position}`
- `_tileVertices()` reconstructs 4 vertices from parameters
- `tilesToGeometry()` converts to renderable form at GPU boundary
- Clean, performant, minimal storage

### The Bug

In `_deflateThickRhombus()` and `_deflateThinRhombus()`, child tile positions are computed as **triangle centroids**:

```javascript
position: { x: (V0.x + V1.x + P.x) / 3, y: (V0.y + V1.y + P.y) / 3 }
```

These triangles (V0-V1-P, V2-V1-Q, etc.) are **reference triangles from the division points**, NOT the actual child rhombi. Child rhombi have 4 vertices each, and their centroids are different from these triangle centroids.

### The Underlying Principle (from regular tilings)

All tilings follow the same rule: **tile position comes from tile geometry, not abstract formulas**.

| Tiling | How new tile position is determined |
|--------|-------------------------------------|
| Square | Position = neighbor + edge normal × edge length |
| Triangle | Position = reflection of neighbor centroid across shared edge |
| Hexagon | Position = neighbor + edge normal × (√3 × edge length) |
| Rhombic | Position = neighbor + edge vector |

**Common pattern**: The child tile's position is determined by **where its vertices actually are**.

### The Fix

For Penrose deflation (subdivision, not extension), the same principle applies:

1. **Identify the 4 vertices** of each child rhombus from P3 deflation rules
   - Vertices are either parent vertices {V0,V1,V2,V3} or division points {P,Q}
2. **Compute centroid** from actual vertices: `position = (A+B+C+D)/4`
3. **Derive rotation** from vertex geometry (angle of short diagonal)

### P3 Deflation Vertex Assignments

**Thick Rhombus → 2 Thick + 1 Thin**

Parent vertices: V0 (top, 72°), V1 (right, 108°), V2 (bottom, 72°), V3 (left, 108°)
Division points: P = V1 + (V3-V1)/φ, Q = V3 + (V1-V3)/φ

```
        V0
       /  \
      /    \
    V3--Q--P--V1
      \    /
       \  /
        V2

Child tiles (vertices in CCW order):
  Thick 1: [V0, V1, P, ?]  ← need 4th vertex
  Thick 2: [V2, ?, Q, V1]  ← need 2nd vertex
  Thin 1:  [V0, P, ?, V3]  ← need 3rd vertex
```

⚠️ **Key insight**: The child tiles share edges with each other, so the "missing" vertices must be computed from edge-sharing constraints, not invented independently.

### Implementation Approach

```javascript
_deflateThickRhombus: (tile) => {
  const verts = _tileVertices(tile);  // Get parent's 4 vertices
  const [V0, V1, V2, V3] = verts;

  // Division points on long diagonal
  const P = lerp(V1, V3, invPhi);
  const Q = lerp(V3, V1, invPhi);

  // Child 1 (thick): vertices are [A, B, C, D]
  const child1Verts = [V0, V1, P, /* computed from geometry */];
  const child1Pos = centroid4(child1Verts);
  const child1Rot = rotationFromVertices(child1Verts);

  // ... same for other children
}
```

### Notes

The `{type, quadrance, rotationN36, position}` format is elegant and worth keeping. Only the position/rotation derivation needs fixing.

---

## Revised Approach: Build Tiling Infrastructure First (Feb 5, 2026)

### The Insight

Instead of solving Penrose deflation in isolation, **build tiling infrastructure using simple regular tilings first**. The same logic that tiles triangles, squares, and hexagons will eventually extend to Penrose.

### Phase 1: Regular Polygon Tiling (Primitives)

**Add "Enable Tiling" section to Polygon primitive UI:**

```
Polygon (n-gon)
├── Sides: [3] [4] [5] [6] ...
├── Quadrance: [slider]
├── Edge Weight: [slider]
└── [NEW] Enable Tiling
    ├── ☑ Enable Grid
    ├── Generations: [1] [2] [3] [4] [5]
    └── Grid Type: ○ Vertex-centered ○ Edge-centered
```

**Tiling types by polygon:**
| n-gon | Grid Type | Notes |
|-------|-----------|-------|
| 3 (triangle) | Triangular grid | Tiles plane, self-similar |
| 4 (square) | Square grid | Tiles plane, self-similar |
| 5 (pentagon) | **Does not tile plane** | But useful as Penrose guide! |
| 6 (hexagon) | Hexagonal grid | Tiles plane, dual of triangular |

### Phase 2: Geodesic Face Tiling

**Add radio buttons to Geodesic options:**

```
Geodesic Icosahedron
├── Frequency: [F1] [F2] [F3] [F4]
├── ...existing options...
└── [NEW] Face Tiling
    ├── ○ None
    ├── ○ Primitive Polygon (uses active Polygon settings)
    └── ○ Penrose (future)
```

**Nesting behavior:**
- Geodesic F2 already subdivides each face into smaller triangles
- If "Primitive Polygon" is selected with Triangle Grid (gen 3):
  - Each F2 subdivided triangle gets a 3-generation triangular tiling
  - Tiling is **nested/child** of the geodesic subdivision

```
Octahedron (8 faces)
    └── F2 subdivision (4 triangles per face = 32 triangles)
        └── Triangle Grid gen 3 (per subdivided triangle)
            └── Result: 32 × (tiled triangles) = dense mesh
```

### Phase 3: Penrose as Special Case

Once regular tiling works on geodesic faces:
- Penrose becomes just another "Grid Type" option
- Pentagon grid serves as the underlying structure
- Rhombi fill in around the pentagonal framework

### Implementation Order

1. **Add tiling to Polygon primitive** (triangular grid first)
   - New UI section in index.html
   - Tiling logic in rt-polyhedra.js or new rt-tiling.js
   - Test: Triangle with generations 1-5

2. **Add square and hexagonal grids**
   - Same pattern, different geometry
   - Test: Square and hexagon grids

3. **Add geodesic face tiling option**
   - Radio buttons in geodesic UI
   - Apply active polygon tiling to each face
   - Handle nesting with existing frequency subdivision

4. **Pentagon grid (non-tiling but useful)**
   - Generates pentagonal pattern
   - Serves as guide/scaffold for Penrose

5. **Penrose integration**
   - Use pentagon grid as underlying structure
   - Rhombi derived from grid cells
   - Matching arcs = grid lines

### Why This Works

- **Babysteps**: Each phase is testable independently
- **Reuses existing UI**: Polygon controls, geodesic controls
- **Clear nesting model**: Geodesic subdivision → face tiling → render
- **Penrose becomes tractable**: It's just a fancy tiling applied to faces

### Technical Rule: CCW Face Winding for +Z Normals

**Problem discovered**: When implementing triangular tiling, faces rendered from underneath (backface culling hid them from above).

**Rule**: For faces with outward normals pointing in +Z direction (facing camera/above):
- Vertices must be ordered **Counter-Clockwise (CCW)** when viewed from +Z
- Example: Triangle with vertices A(left), B(right), C(top) → face index `[A, C, B]` NOT `[A, B, C]`

**Why this matters**:
- THREE.js uses CCW winding to determine front faces
- Backface culling hides CW-wound faces
- Regular polygon primitive already has correct winding → tiled subdivisions must match

**Implementation pattern**:
```javascript
// For triangular tiling generating faces in XY plane with +Z normal:
if (showFace) faces.push([v0, v2, v1]);  // CCW from +Z view

// For quad faces:
if (showFace) faces.push([v0, v3, v2, v1]);  // CCW from +Z view
```

This rule applies to ALL tiling implementations: triangular, square, hexagonal, and eventually Penrose.

### Technical Rule: PACKED Node Spheres with Tiling Subdivisions

**Context**: Node spheres come in 4 sizes: sm, md, lg, and PACKED. The PACKED option creates spheres with radius = ½ edge length, so adjacent spheres "kiss" (close-pack).

**Problem**: When tiling subdivides a polygon, the edge length decreases. PACKED spheres must scale accordingly.

**Rule**: PACKED sphere radius = ½ × (subdivided edge length)

| Generations | Edge Scale | PACKED Radius Scale |
|-------------|------------|---------------------|
| 1 (original) | 1 | 1/2 |
| 2 | 1/2 | 1/4 |
| 3 | 1/4 | 1/8 |
| n | 1/2^(n-1) | 1/2^n |

**Implementation considerations**:
- When rendering tiled polygons with PACKED nodes, compute sphere radius from tiled edge length
- For triangular tiling: edge = original_edge / 2^(gen-1)
- For square tiling: edge = original_edge / 2^(gen-1)
- Hexagonal/pentagonal: similar scaling based on subdivision
- **Penrose**: More complex due to two tile types with different edge lengths (defer to later)

**Priority**: Solve for simple periodic tilings (triangle, square, hexagon) first. Penrose packed spheres can follow once the basic infrastructure is proven.

---

## Completed Implementation: Face Tiling & PACKED Node Scaling (Feb 5, 2026)

### ✅ Polygon Face Tiling on Geodesic Icosahedron

**Feature**: Apply polygon tilings to geodesic icosahedron faces with generation-based subdivision.

**Implementation** (`rt-rendering.js`, `rt-grids.js`):
- Added "Face Tiling" checkbox to Geodesic Icosahedron controls
- When enabled, uses the active Polygon primitive's tiling settings (type, generations)
- Tilings applied to each icosahedral face after geodesic frequency subdivision
- `effectiveFrequency = baseFrequency * 2^(tilingGenerations-1)` for edge length calculation

**UI** (`index.html`):
- Checkbox: "Enable Face Tiling" with cyan info text
- Links to Polygon controls: "Set Polygon Tiling Properties under Primitives/Polygons"

**Cache Key** (`rt-nodes.js`):
- Format: `{rt|classical}-{nodeSize}-{polyType}-{scale}-{sides}-gen{N}-f{freq}`
- Includes `-genN` for tilingGenerations and `-fN` for frequency

### ✅ PACKED Node Dynamic Recalculation

**Problem Solved**: PACKED node spheres (radius = edge/2 for close-packing) were not scaling correctly when:
1. Geodesic frequency slider changed
2. Polygon tiling generations changed

**Root Causes Fixed**:

1. **`getPolyhedronEdgeQuadrance()` in `rt-nodes.js`**:
   - Added geodesic case that divides edge quadrance by frequency²:
   ```javascript
   case "geodesicTetrahedron":
   case "geodesicOctahedron":
   case "geodesicIcosahedron": {
     const baseType = type.replace("geodesic", "").toLowerCase();
     let Q_edge = getPolyhedronEdgeQuadrance(baseType, scale);
     if (options.frequency && options.frequency > 1) {
       Q_edge = Q_edge / (freq * freq);  // Quadrance divides by freq²
     }
     return Q_edge;
   }
   ```

2. **nodeOptions in `rt-rendering.js`**:
   - Added geodesic case to pass frequency from userData.parameters:
   ```javascript
   } else if (polyType?.startsWith("geodesic") && group.userData.parameters?.frequency) {
     nodeOptions = { frequency: group.userData.parameters.frequency };
   }
   ```

3. **Parameter ordering**:
   - Fixed: `userData.parameters` must be set BEFORE `renderPolyhedron()` so nodes can access frequency
   - Applies to `renderGeodesicPolyhedron()` helper and geodesic icosahedron custom rendering

4. **Cache invalidation**:
   - Added `-fN` suffix to cache key for frequency
   - Added `-genN` suffix for tilingGenerations
   - Ensures node spheres regenerate when sliders change

**RT-Pure Calculation**:
- Edge quadrance Q divides by frequency² (geodesics) or by 4^(gen-1) (polygon tilings)
- PACKED radius = √(Q_edge)/2 calculated at render time
- Stays in quadrance space until final sqrt at GPU boundary

### ✅ Projection-Based PACKED Node Adjustment (Implemented Feb 5, 2026)

**Context**: Geodesic polyhedra support four projection modes:
- **Flat (off)**: Vertices stay on base polyhedron faces
- **Insphere**: Vertices projected to insphere (smaller sphere)
- **Midsphere**: Vertices projected to midsphere (edge-tangent sphere)
- **Outsphere**: Vertices projected to circumsphere (largest sphere)

**Implementation**:

1. **Pass projection type to node rendering** (`rt-rendering.js`):
   ```javascript
   nodeOptions = {
     frequency: group.userData.parameters.frequency,
     projection: group.userData.parameters.projection || "out",
   };
   ```

2. **Sphere projection stretch factors** (`rt-nodes.js`):
   When projecting flat vertices to a sphere, edges STRETCH because vertices near face centers move outward. Empirically derived factors:
   ```javascript
   // Stretch factors (flat → sphere projection)
   geodesicTetrahedron: 1.5   // Large faces, significant stretch
   geodesicOctahedron:  1.35  // Medium faces
   geodesicIcosahedron: 1.27  // Smallest faces, verified from avgQ
   ```

3. **Radius scaling for in/mid projections** (relative to outsphere):
   ```javascript
   // Geodesic Tetrahedron: mid=1/3, in=1/9
   // Geodesic Octahedron:  mid=1/2, in=1/3
   // Geodesic Icosahedron: mid=φ²/(φ+2)≈0.724, in=(3-√5)/2≈0.382
   ```

4. **Cache key includes projection**: `-{projection}` suffix ensures nodes regenerate when projection changes

**Result**: PACKED nodes now scale appropriately for all projection modes. Spheres approximately "kiss" for outsphere and scale down proportionally for midsphere/insphere.

### ⚠️ Known Limitation: Non-Uniform Edge Lengths on Projected Geodesics

**Observation**: Geodesic projections produce non-uniform edge lengths:
- Edges near original polyhedron vertices are **shorter**
- Edges near face centers are **longer**
- The tetrahedron has the most extreme variation (large faces)
- The icosahedron has the least variation (small faces)

**Current Approach**: Uses **average edge length** for uniform PACKED sphere radius. This produces:
- Slight gaps where actual edges are longer than average
- Slight overlaps where actual edges are shorter than average

**Perfect Solution (Future Work)**: Calculate per-vertex sphere radius based on actual incident edge lengths:
```javascript
// Pseudocode for perfect close-packing
for each vertex V:
  incidentEdges = getEdgesAt(V)
  minEdgeQ = min(incidentEdges.map(e => e.quadrance))
  packedRadius[V] = sqrt(minEdgeQ) / 2
```

This would create variable-sized spheres that perfectly "kiss" at each vertex without gaps or overlaps.

**Priority**: Nice-to-have. Current uniform-radius solution is acceptable for visualization purposes. The flat projection case remains exact (all edges equal length)

**Research Needed**:
- Exact relationship between frequency and edge length for each projection
- Whether uniform scaling is acceptable or per-edge calculation required
- For midsphere/outsphere, edges near icosahedral vertices may differ from edges near face centers

**Priority**: Nice-to-have for visual consistency. Flat projection is the primary use case for tiling work.

---

## Pentagon Array Tiling for Penrose Guidance Grid (Feb 5, 2026)

### ✅ RT-Pure Pentagon Array Implementation

**Purpose**: Create a 5-fold symmetric array of regular pentagons to serve as a guidance grid for Penrose tiling. Unlike triangular/square tilings that subdivide, pentagons DON'T tile the plane - the gaps form the characteristic star shapes seen in Penrose patterns.

**Implementation** (`rt-grids.js: pentagonalTiling()`):

**Golden Ratio Geometry (algebraically exact)**:
```
R = overall pattern radius (input)
pentRadius = R/φ = R × (φ-1)     (RT-pure: invPhi identity)
innerRingRadius = pentRadius × φ = R    (exactly!)
outerRingRadius = R × φ               (Gen 3)
```

**Key RT-Pure Relationships**:
| Property | Formula | Value |
|----------|---------|-------|
| Pentagon circumradius | R/φ | ≈ 0.618R |
| Inner ring radius | R/φ × φ = R | Exact |
| Inward vertex from origin | R - R/φ = R/φ² | ≈ 0.382R |
| Outer ring radius | R × φ | ≈ 1.618R |

**Generation Structure**:
- **Gen 1**: Single central pentagon (vertex pointing up)
- **Gen 2**: 5 inner pentagons at 72° intervals, vertices pointing at origin
- **Gen 3**: 5 inner + 5 outer pentagons (10 total), outer offset 36°

**Vertex Orientation**: Each pentagon has one vertex pointing directly at the origin, achieved by matching pentagon rotation to its angular position (no 180° offset needed).

**RT-Pure Functions Used**:
- `RT.PurePhi.value()` - φ = (1+√5)/2
- `RT.PurePhi.inverse()` - 1/φ = φ-1 (algebraic identity, no division)
- `RT.PurePhi.penrose.rotateN36(x, y, n)` - rotation by n×36° using cached trig

### ⚠️ Gen 4+ Extension (Not Yet Implemented)

**Current Status**: Gen 4+ uses approximate angular spacing that doesn't maintain proper Penrose geometry.

**For Penrose Guidance Grid Use**:
- Gen 2-3 (5-10 pentagons) may be sufficient for central pattern guidance
- Extending beyond requires careful analysis of how pentagons nest in Penrose tilings
- The "decagon" configuration (10 thick rhombi around a central point) relates to the pentagon array

**Research Needed**:
- How pentagon vertices align with Penrose rhombus vertices at deflation boundaries
- Whether additional rings follow φ-scaling or require different geometry
- Integration with existing `PenroseTiling.deflate()` algorithm

---

## Pentagon Face Tiling via Dodecahedron Overlay (Planned)

### The Icosahedron-Dodecahedron Duality

The natural way to apply pentagon tiling to icosahedron faces is through the **dual dodecahedron**:

| Icosahedron | Dodecahedron (Dual) |
|-------------|---------------------|
| 12 vertices (5-fold) | 12 pentagonal faces |
| 20 triangular faces | 20 vertices (3-fold) |
| 30 edges | 30 edges |

**Key geometric relationship**:
- Each dodecahedral **face center** aligns exactly with an icosahedral **vertex**
- Each dodecahedral **vertex** aligns exactly with an icosahedral **face center**
- Pentagon edges cross icosahedral edges at golden ratio (φ) division points

### Implementation Approach: Dodecahedron Face Tiling

**Concept**: Add "Face Tiling" option to Dodecahedron (similar to Geodesic Icosahedron Face Tiling):

1. **When enabled**: Uses the active Pentagon polygon tiling settings (generations)
2. **Natural fit**: Dodecahedron faces ARE pentagons - no geometric distortion
3. **Pentagon array on each face**: Gen 2 = 5 pentagons per face, Gen 3 = 10 per face
4. **Vertex alignment**: Pentagon vertices naturally align with icosahedral geometry

**UI Extension** (future):
```
☐ Dodecahedron (12 faces, φ)
  ☐ Face Tiling
     "Set Pentagon Tiling Properties under Primitives/Polygons"
```

### Future: Dodecahedron → Icosahedron Projection

**Analogy to Geodesic Projection**:

Geodesic subdivision projects from flat faces to spherical surfaces:
- **Off (flat)**: Vertices on original polyhedron faces
- **InSphere**: Vertices projected to insphere
- **MidSphere**: Vertices projected to midsphere
- **OutSphere**: Vertices projected to circumsphere

**Proposed Dual Projection** for Dodecahedron:
- **Dodecahedron (native)**: Pentagon faces as-is
- **Icosahedral mapping**: Pentagon vertices/edges mapped onto icosahedral triangular faces
- This is a "deflation" from 12 pentagons → 20 triangles (face dual transformation)

**Geometric Mechanics**:
1. Each pentagon face maps to 5 icosahedral faces (the faces sharing that vertex)
2. Pentagon sectors (center-to-edge isoceles triangles, 72° apex) map to face wedges
3. Three pentagon sectors meet at each icosahedral face center
4. The mapping involves angular distortion: 72° (pentagon sector) → ~70.5° (icosahedral face angle)

**RT-Pure Considerations**:
- The dihedral angle of icosahedron involves φ: arctan(φ²) ≈ 70.53°
- Pentagon central angle is 72° = 2×36° (RT-pure via cached trig)
- The ~1.5° difference per sector accumulates to the spherical excess

**Research Questions**:
1. Can the pentagon→triangle mapping preserve RT-pure golden ratio relationships?
2. How do Penrose matching rules translate through the dual transformation?
3. Is there a "deflation" interpretation connecting Penrose P3 rules to icosahedral faces?

---

## ⚠️ OPEN PROBLEM: Pentagon Tiling Scale on Dodecahedron Faces (Feb 5, 2026)

### Critical Insight: Pentagon Array IS the Penrose Scaffold

**Key realization**: The pentagon array (central star + surrounding pentagons) is the CORRECT underlying structure for Penrose tiling. The "odd shapes" that appear between pentagons are NOT errors - they're the spaces where Penrose thick/thin rhombi belong.

```
Pentagon Array (Gen 2):           Penrose P3 Tiling:
      ⬠                               ⬠
    ⬠ ★ ⬠     ←→ same structure     ⬠ ★ ⬠ + rhombi filling gaps
      ⬠                               ⬠

★ = central pentagon (or star void)
⬠ = surrounding pentagons
gaps = where thick/thin rhombi tile in
```

**The relationship**:
- Pentagon vertices define 5-fold symmetry centers
- Pentagon edges guide rhombus edge placement
- Gaps between pentagons = rhombus tiling regions
- The scaffold + rhombi = complete Penrose P3 tiling

### The Scaling Problem Remains

Even though the pentagon array IS the correct scaffold, we still need to **scale it correctly** to fit dodecahedron faces. The current issue: the calculated bounding pentagon doesn't match the actual tiling extent.

### Visual Debug Aid: Bounding Pentagon on Base Polygon

A magenta bounding pentagon is now drawn on the base Polygon primitive (when 5-gon with tiling enabled, Gen 2+). This allows debugging the scale relationship in isolation, without the complexity of dodecahedron face mapping.

**Current implementation** (`rt-rendering.js` line ~1230):
```javascript
// Calculate bounding pentagon that should contain tiling
const tilingMaxExtent = Math.max(
  ...polygonData.vertices.map(v => Math.sqrt(v.x * v.x + v.y * v.y))
);
const cos36 = RT.PurePhi.pentagon.cos36();
const boundingPentRadius = tilingMaxExtent / cos36;
```

**Observation**: The magenta pentagon (circumR = maxExtent/cos36) is LARGER than the actual tiling pattern. There's a gap between the outermost tiling vertices and the bounding pentagon edges.

### What We Know

**Geometric facts**:
- Pentagon circumradius R and inradius r = R × cos(36°) ≈ 0.809R
- Gen 2 tiling has 5 pentagons arranged around center
- Each outer pentagon's tip points toward origin
- Outer pentagon vertices don't all lie on same circle (irregular boundary)

**What the formula predicts vs reality**:
| Gen | maxExtent | Predicted boundingR | Observed | Gap |
|-----|-----------|---------------------|----------|-----|
| 2   | 1.5434    | 1.907 (maxE/cos36)  | < 1.907  | Yes |
| 3   | 2.1490    | 2.656 (maxE/cos36)  | < 2.656  | Yes |

### Wrong Approaches Tried

1. ❌ `tilingScale = faceRadius / maxExtent` → Pattern too large, extends beyond face edges
2. ❌ `tilingScale = faceInradius / maxExtent` → Pattern too small, doesn't fill face
3. ❌ `tilingScale = faceRadius × (1/φ)` for Gen 2+ → Recent fix, partially works but not exact
4. ❌ `boundingPentRadius = maxExtent / cos36` → Produces pentagon larger than tiling

### The Core Question

**What is the exact algebraic relationship between**:
- `maxExtent` (furthest tiling vertex from center)
- The circumradius of a pentagon that exactly contains the tiling

This relationship likely involves φ (golden ratio) in a non-obvious way, since:
- Pentagon geometry is φ-based
- Penrose tiling growth follows φ scaling
- The 5-fold symmetry creates φ-related interference patterns

### Way Forward

1. **Measure actual boundary geometry**: Log all boundary vertex distances, not just maxExtent
2. **Identify the algebraic pattern**: Does boundary radius follow φⁿ scaling with generations?
3. **Derive bounding pentagon formula**: From actual geometry, not assumed regular decagon
4. **Express in RT-pure form**: Using only `RT.PurePhi` cached values

### For Penrose Implementation

Once the scaffold scaling is solved:
1. Pentagon array provides the underlying 5-fold grid
2. Thick rhombi fill 72°/108° gaps
3. Thin rhombi fill 36°/144° gaps
4. Matching arcs follow pentagon edge alignments
5. Deflation creates nested φ-scaled copies

### Current Debug Aid

Visual boundary rendering on base Pentagon polygon (`rt-rendering.js`):
- Magenta outline shows calculated bounding pentagon
- Compare against actual tiling pattern extent
- Gap visible = formula needs refinement

---

## Session Summary: Pentagon Array as Penrose Scaffold (Feb 5, 2026 Evening)

### Key Realizations

1. **Pentagon array IS correct**: The central star + surrounding pentagons is the proper Penrose guidance grid, not a failed tiling attempt

2. **Gaps are features, not bugs**: The "odd shapes" between pentagons are exactly where Penrose thick/thin rhombi belong

3. **Scaling problem isolable**: Moving magenta bounding pentagon to base Polygon primitive allows debugging scale relationship without dodecahedron complexity

4. **Formula mismatch identified**: `boundingPentRadius = maxExtent / cos36` produces a pentagon LARGER than the actual tiling extent

### What Works

- ✅ Pentagon array generation (Gen 1-3)
- ✅ Face Tiling on dodecahedron (uses pentagon array)
- ✅ Gen 2+ scaling by 1/φ
- ✅ Magenta bounding pentagon debug visualization

### What Remains

- ❓ Exact algebraic relationship: maxExtent → bounding pentagon circumradius
- ❓ Why current formula overestimates bounding pentagon size
- ❓ RT-pure derivation of correct scale factor
- 🔜 Implementation of Penrose rhombi to fill pentagon array gaps

### Next Session Tasks

1. Log all boundary vertex distances (not just max)
2. Identify φ-based pattern in boundary geometry
3. Derive correct bounding pentagon formula
4. Test on dodecahedron faces

---

_Last updated: February 5, 2026 (evening session)_
_Contributors: Andy & Claude (for Bonnie Devarco's virology research)_
_Review: Implementation readiness audit completed_
_Session: Pentagon scaffold realization + scale problem documentation_
