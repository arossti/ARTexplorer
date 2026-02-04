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
- **BL (Large)**: Isosceles triangle, sides ratio **1:1:φ** (φ = golden ratio)
- **BS (Small)**: Isosceles triangle, sides ratio **1:1:ψ** (ψ = 1/φ = φ - 1)

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
  const cos36 = RT.PurePhi.pentagon.cos72() + 0.5; // cos(36°) = (1+√5)/4
  const sin36 = RT.PurePhi.pentagon.sin144();       // sin(36°) = sin(144°)

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
      obtuseAngleSpread: RT.PurePhi.pentagon.alpha(), // 108° (same spread as 72°)
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

### Phase 7: Testing
- [ ] Visual verification of tile shapes
- [ ] RT-purity validation (console logs)
- [ ] Matching rule enforcement
- [ ] Geodesic wrapping visual check
- [ ] State save/load roundtrip
- [ ] Performance with high generation counts

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

- **Penrose Tilings**: Wikipedia, Wolfram MathWorld
- **Viral Capsid Tilings**: Reidun Twarock (York), "Structures of Spherical Viral Capsids as Quasicrystalline Tilings"
- **Spherical Penrose**: Bridges 2018 "A Class of Spherical Penrose-Like Tilings"
- **Matching Rules**: de Bruijn's pentagrid method, substitution rules
- **RT Foundation**: Wildberger "Divine Proportions" Chapter 14 (pentagon spreads α, β)

---

## Future Extensions

1. **Viral Capsid Presets**: HPV, rotavirus, etc. with documented T-numbers
2. **3D Penrose (Ammann Rhombohedra)**: Full 3D quasicrystal tilings
3. **Quasicrystal Mode**: Extends to dodecahedral and other 3D quasiperiodic structures
4. **Assembly Animation**: Visualize tile-by-tile assembly (viral assembly code)
5. **Export to STL**: 3D-printable Penrose spheres

---

_Last updated: February 2026_
_Contributors: Andy & Claude (for Bonnie Devarco's virology research)_
