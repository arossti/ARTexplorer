# JAN26-PART2: Triangle Counter & RT-Pure Prisms

## Overview

Two new features building on the completed JAN26-EXTRACT refactoring:
1. **Comprehensive Triangle Counter** - Expand Geometry Info to count all triangles
2. **RT-Pure Prisms** - Extend Line primitive to N-gon prisms and cones

---

## TRIANGLES: Comprehensive Triangle Counter

### Current State

The Geometry Info panel shows triangle counts for individual polyhedra, but does not aggregate:
- Polyhedra triangles
- Matrix form triangles
- Node sphere triangles

Grids should be excluded (they are lines, not triangles).

### Goal

Display total triangle count in Geometry Info panel as:
```
Total Triangles: 12,456 (Scene)
```

### Implementation

#### 1. Triangle Counting Function

Add to `rt-rendering.js` or create new `rt-stats.js`:

```javascript
/**
 * Count all triangles in the scene
 * Excludes grids (Line/LineSegments materials)
 * @returns {Object} {total, polyhedra, matrix, nodes}
 */
function countSceneTriangles() {
  let polyhedra = 0;
  let matrix = 0;
  let nodes = 0;

  scene.traverse((object) => {
    // Skip grids and non-mesh objects
    if (object.type === 'Line' || object.type === 'LineSegments') return;
    if (!object.isMesh) return;

    const geometry = object.geometry;
    if (!geometry) return;

    // Count triangles from index or position attribute
    let triangles = 0;
    if (geometry.index) {
      triangles = geometry.index.count / 3;
    } else if (geometry.attributes.position) {
      triangles = geometry.attributes.position.count / 3;
    }

    // Categorize by userData tag
    if (object.userData.isNode) {
      nodes += triangles;
    } else if (object.userData.isMatrix) {
      matrix += triangles;
    } else {
      polyhedra += triangles;
    }
  });

  return {
    total: polyhedra + matrix + nodes,
    polyhedra,
    matrix,
    nodes
  };
}
```

#### 2. UI Update

Add to Geometry Info section in `index.html`:

```html
<div class="stat-row">
  <span class="stat-label">Scene Triangles:</span>
  <span id="total-triangles" class="stat-value">0</span>
</div>
```

#### 3. Event Binding

Call `countSceneTriangles()` and update display:
- On form changes (polyhedra visibility, geodesic frequency)
- On matrix generation
- On node settings changes
- After instance deposit (NOW button)

### Validation Checklist

- [ ] Triangle count updates when polyhedra visibility toggles
- [ ] Triangle count updates when geodesic frequency changes
- [ ] Triangle count updates when matrix is generated
- [ ] Triangle count updates when node settings change
- [ ] Grids do not contribute to triangle count
- [ ] Count matches expected values for known configurations

---

## PRISMS: RT-Pure Prism & Cone Primitives

### Current State

`rt-primitives.js` contains:
- `point()` - 0D: Single vertex
- `line()` - 1D: Two vertices, one edge (uses triangle for lineweight, camera-facing)
- `polygon()` - 2D: N-gon using RT-pure generators for n = 3, 4, 5, 6, 8, 9, 10, 12

### Goal

Extend to 3D primitives using RT-pure polygon generators:
- **Prism** - Two parallel N-gon caps connected by rectangular side faces
- **Cone** - One N-gon base, one point apex (prism where top radius = 0)
- **Cylinder** - Prism approximation with high N (e.g., N=24 or N=36)

These are distinct from the current Line's triangle-based lineweight rendering which rotates to face the camera. The new prisms/cones are proper 3D forms that do NOT rotate to camera.

### Mathematical Foundation

#### Prism (N-gon × height)

Given:
- `n` - Number of sides (uses RT-pure polygon generators)
- `Q_R` - Circumradius quadrance of the N-gon caps
- `Q_H` - Height quadrance (deferred √ until vertex creation)

Vertices: `2n` total
- Bottom cap: N-gon at z = -h/2
- Top cap: N-gon at z = +h/2

Edges: `3n` total
- N edges for bottom cap perimeter
- N edges for top cap perimeter
- N vertical edges connecting corresponding vertices

Faces: `n + 2` total
- 1 bottom cap (N-gon)
- 1 top cap (N-gon)
- N rectangular side faces (each splits into 2 triangles for rendering)

#### Cone (N-gon base → point apex)

Given:
- `n` - Number of sides
- `Q_R` - Base circumradius quadrance
- `Q_H` - Height quadrance

Vertices: `n + 1` total
- Base: N-gon at z = 0
- Apex: Single point at z = h

Edges: `2n` total
- N edges for base perimeter
- N edges connecting base vertices to apex

Faces: `n + 1` total
- 1 base (N-gon)
- N triangular side faces

### Implementation

#### 1. Add to `rt-primitives.js`

```javascript
/**
 * Prism - 3D solid with two parallel N-gon caps
 * RT-pure for n = 3, 4, 5, 6, 8, 10, 12
 *
 * @param {number} baseQuadrance - Circumradius Q of the N-gon caps (R²)
 * @param {number} heightQuadrance - Height Q (h²)
 * @param {Object} options - {sides: n, showFaces: boolean}
 * @returns {Object} {vertices, edges, faces, metadata}
 */
prism: (baseQuadrance = 1, heightQuadrance = 1, options = {}) => {
  const n = options.sides || 6;
  const showFaces = options.showFaces !== false;

  // Generate base polygon using RT-pure generator
  const basePolygon = Primitives.polygon(baseQuadrance, { sides: n, showFace: false });
  const baseVertices = basePolygon.vertices;

  // Height calculation (deferred √)
  const height = Math.sqrt(heightQuadrance);
  const halfHeight = height / 2;

  // Create prism vertices (bottom cap at -h/2, top cap at +h/2)
  const vertices = [];

  // Bottom cap vertices
  for (let i = 0; i < n; i++) {
    const v = baseVertices[i];
    vertices.push(new THREE.Vector3(v.x, v.y, -halfHeight));
  }

  // Top cap vertices
  for (let i = 0; i < n; i++) {
    const v = baseVertices[i];
    vertices.push(new THREE.Vector3(v.x, v.y, halfHeight));
  }

  // Edges
  const edges = [];

  // Bottom cap edges
  for (let i = 0; i < n; i++) {
    edges.push([i, (i + 1) % n]);
  }

  // Top cap edges
  for (let i = 0; i < n; i++) {
    edges.push([n + i, n + ((i + 1) % n)]);
  }

  // Vertical edges
  for (let i = 0; i < n; i++) {
    edges.push([i, n + i]);
  }

  // Faces
  const faces = [];

  if (showFaces) {
    // Bottom cap (CCW winding for -Z normal)
    const bottomFace = [];
    for (let i = n - 1; i >= 0; i--) {
      bottomFace.push(i);
    }
    faces.push(bottomFace);

    // Top cap (CCW winding for +Z normal)
    const topFace = [];
    for (let i = 0; i < n; i++) {
      topFace.push(n + i);
    }
    faces.push(topFace);

    // Side faces (rectangles, split into triangles)
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      // Two triangles per rectangular side face
      // Bottom-left triangle
      faces.push([i, next, n + next]);
      // Top-right triangle
      faces.push([i, n + next, n + i]);
    }
  }

  console.log(`[RT] Prism (${n}-gon): Q_R=${baseQuadrance.toFixed(6)}, Q_H=${heightQuadrance.toFixed(6)}, ` +
    `V=${vertices.length}, E=${edges.length}, F=${faces.length}, rtPure=${basePolygon.metadata.rtPure}`);

  return {
    vertices,
    edges,
    faces,
    metadata: {
      type: 'prism',
      sides: n,
      baseQuadrance,
      heightQuadrance,
      height,
      baseCircumradius: basePolygon.metadata.circumradius,
      edgeQuadrance: basePolygon.metadata.edgeQuadrance,
      showFaces,
      rtPure: basePolygon.metadata.rtPure,
    },
  };
},

/**
 * Cone - 3D solid with N-gon base and point apex
 * RT-pure for n = 3, 4, 5, 6, 8, 10, 12
 *
 * @param {number} baseQuadrance - Circumradius Q of the base N-gon (R²)
 * @param {number} heightQuadrance - Height Q (h²)
 * @param {Object} options - {sides: n, showFaces: boolean}
 * @returns {Object} {vertices, edges, faces, metadata}
 */
cone: (baseQuadrance = 1, heightQuadrance = 1, options = {}) => {
  const n = options.sides || 6;
  const showFaces = options.showFaces !== false;

  // Generate base polygon using RT-pure generator
  const basePolygon = Primitives.polygon(baseQuadrance, { sides: n, showFace: false });
  const baseVertices = basePolygon.vertices;

  // Height calculation (deferred √)
  const height = Math.sqrt(heightQuadrance);

  // Create cone vertices
  const vertices = [];

  // Base vertices at z = 0
  for (let i = 0; i < n; i++) {
    const v = baseVertices[i];
    vertices.push(new THREE.Vector3(v.x, v.y, 0));
  }

  // Apex at z = height
  vertices.push(new THREE.Vector3(0, 0, height));
  const apexIndex = n;

  // Edges
  const edges = [];

  // Base perimeter edges
  for (let i = 0; i < n; i++) {
    edges.push([i, (i + 1) % n]);
  }

  // Edges from base to apex
  for (let i = 0; i < n; i++) {
    edges.push([i, apexIndex]);
  }

  // Faces
  const faces = [];

  if (showFaces) {
    // Base face (CCW winding for -Z normal)
    const baseFace = [];
    for (let i = n - 1; i >= 0; i--) {
      baseFace.push(i);
    }
    faces.push(baseFace);

    // Triangular side faces
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      // Triangle: base[i] → base[next] → apex
      faces.push([i, next, apexIndex]);
    }
  }

  // Slant quadrance: Q_slant = Q_R + Q_H (Pythagorean)
  const slantQuadrance = baseQuadrance + heightQuadrance;

  console.log(`[RT] Cone (${n}-gon): Q_R=${baseQuadrance.toFixed(6)}, Q_H=${heightQuadrance.toFixed(6)}, ` +
    `Q_slant=${slantQuadrance.toFixed(6)}, V=${vertices.length}, E=${edges.length}, F=${faces.length}`);

  return {
    vertices,
    edges,
    faces,
    metadata: {
      type: 'cone',
      sides: n,
      baseQuadrance,
      heightQuadrance,
      height,
      slantQuadrance,
      baseCircumradius: basePolygon.metadata.circumradius,
      showFaces,
      rtPure: basePolygon.metadata.rtPure,
    },
  };
},

/**
 * Cylinder - Prism approximation with high N
 * Convenience wrapper around prism() with n=24 or n=36
 *
 * @param {number} radiusQuadrance - Radius Q (R²)
 * @param {number} heightQuadrance - Height Q (h²)
 * @param {Object} options - {resolution: 'standard'|'high', showFaces: boolean}
 * @returns {Object} {vertices, edges, faces, metadata}
 */
cylinder: (radiusQuadrance = 1, heightQuadrance = 1, options = {}) => {
  const resolution = options.resolution || 'standard';
  const sides = resolution === 'high' ? 36 : 24;

  const result = Primitives.prism(radiusQuadrance, heightQuadrance, {
    sides,
    showFaces: options.showFaces,
  });

  result.metadata.type = 'cylinder';
  result.metadata.resolution = resolution;
  // Note: n=24 and n=36 are NOT RT-pure (not Gauss-Wantzel constructible)
  result.metadata.rtPure = false;

  console.log(`[RT] Cylinder (${sides}-gon prism): resolution=${resolution}, rtPure=false`);

  return result;
},
```

#### 2. UI Integration

Add to Base Forms section in `index.html`:

```html
<!-- After existing primitives -->
<div class="form-group">
  <label>Prism</label>
  <input type="checkbox" id="showPrism">
  <div class="sub-options">
    <label>Sides: <input type="number" id="prismSides" min="3" max="12" value="6"></label>
    <label>Height Q: <input type="number" id="prismHeightQ" min="0.1" max="10" step="0.1" value="1"></label>
  </div>
</div>

<div class="form-group">
  <label>Cone</label>
  <input type="checkbox" id="showCone">
  <div class="sub-options">
    <label>Sides: <input type="number" id="coneSides" min="3" max="12" value="6"></label>
    <label>Height Q: <input type="number" id="coneHeightQ" min="0.1" max="10" step="0.1" value="1"></label>
  </div>
</div>
```

#### 3. Event Bindings in `rt-init.js`

Wire up checkbox and slider events to call `Primitives.prism()` and `Primitives.cone()` with appropriate parameters.

### Special RT-Pure Cases

The following N-gon prisms/cones are fully RT-pure:

| N | Polygon | Prism Name | RT-Pure Radicals |
|---|---------|------------|------------------|
| 3 | Triangle | Triangular Prism | √3 |
| 4 | Square | Square Prism (Box) | integers only |
| 5 | Pentagon | Pentagonal Prism | φ (golden ratio) |
| 6 | Hexagon | Hexagonal Prism | √3 |
| 8 | Octagon | Octagonal Prism | √2 |
| 10 | Decagon | Decagonal Prism | φ |
| 12 | Dodecagon | Dodecagonal Prism | √2, √3 |

### Validation Checklist

- [ ] Prism generates correct vertex count (2n)
- [ ] Prism generates correct edge count (3n)
- [ ] Prism generates correct face count (n+2 base + 2n triangulated sides)
- [ ] Cone generates correct vertex count (n+1)
- [ ] Cone generates correct edge count (2n)
- [ ] Cone generates correct face count (n+1)
- [ ] Face normals point outward (CCW winding)
- [ ] RT-pure flag correctly reflects polygon generator used
- [ ] Prism/Cone do NOT rotate to face camera (unlike Line lineweight)
- [ ] Gumball transformations work correctly on prisms/cones

---

## File Changes Summary

| File | Changes | Status |
|------|---------|--------|
| rt-primitives.js | Add `prism()`, `cone()`, `cylinder()` functions | ✅ Complete |
| rt-rendering.js | Add colors, groups, rendering blocks, geometry stats | ✅ Complete |
| rt-nodes.js | Add edge quadrance cases for prism/cone | ✅ Complete |
| index.html | Add Prism/Cone UI controls | ✅ Complete |
| rt-init.js | Wire up Prism/Cone events, selection support | ✅ Complete |
| rt-filehandler.js | Add state save/restore for prism/cone | ✅ Complete |

---

*Created: 2026-01-26*
*Updated: 2026-01-26*
*Status: PRISMS COMPLETE, TRIANGLES PENDING*
*Prerequisites: JAN26-EXTRACT completed*
