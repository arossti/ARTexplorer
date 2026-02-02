# Adding New Polyhedra to ARTexplorer

This guide documents all the files and code sections that need modification when adding a new polyhedron or matrix group to ARTexplorer.

## Quick Checklist

When adding a new polyhedron (e.g., `newPolyhedron`), update these files:

| Step | File                      | What to Add                                   |
| ---- | ------------------------- | --------------------------------------------- |
| 1    | `modules/rt-polyhedra.js` | Geometry generator function                   |
| 2    | `modules/rt-rendering.js` | Color, group variable, rendering block, stats |
| 3    | `index.html`              | UI checkbox and controls                      |
| 4    | `modules/rt-init.js`      | Event handlers, selection arrays              |
| 5    | Test                      | Verify in browser                             |

---

## Step 1: Geometry Generator (`modules/rt-polyhedra.js`)

Add a new method to the `Polyhedra` object that returns:

```javascript
newPolyhedron: (scale = 1, options = {}) => {
  // Generate vertices as THREE.Vector3 array
  const vertices = [...];

  // Define edges as [vertexIndex1, vertexIndex2] pairs
  const edges = [...];

  // Define faces as arrays of vertex indices (CCW winding for outward normals)
  const faces = [...];

  // RT validation logging
  console.log(`[RT] New Polyhedron: scale=${scale}`);

  return {
    vertices,
    edges,
    faces,
    metadata: {
      // Optional metadata for export/import
    }
  };
}
```

### Key Requirements:

- **Face winding**: Counter-clockwise (CCW) when viewed from outside for correct normals
- **Edge computation**: For adjacency-based polyhedra, compute edges dynamically from vertex relationships
- **Euler check**: V - E + F = 2 for closed polyhedra

---

## Step 2: Rendering Setup (`modules/rt-rendering.js`)

### 2.1 Add Color (line ~50)

```javascript
const colorPalette = {
  // ... existing colors
  newPolyhedron: 0xRRGGBB,  // Choose distinctive color
};
```

### 2.2 Declare Group Variable (line ~85)

```javascript
let newPolyhedronGroup;
```

### 2.3 Initialize Group (in `initScene()`, line ~600)

```javascript
newPolyhedronGroup = new THREE.Group();
newPolyhedronGroup.userData.type = "newPolyhedron";
scene.add(newPolyhedronGroup);
```

### 2.4 Add Rendering Block (in `updateGeometry()`, line ~2000+)

```javascript
// New Polyhedron
if (document.getElementById("showNewPolyhedron")?.checked) {
  const newPoly = Polyhedra.newPolyhedron(scale, {
    /* options */
  });
  renderPolyhedron(
    newPolyhedronGroup,
    newPoly,
    colorPalette.newPolyhedron,
    opacity
  );
  newPolyhedronGroup.userData.parameters = {
    /* stored params */
  };
  newPolyhedronGroup.visible = true;
} else {
  newPolyhedronGroup.visible = false;
}
```

### 2.5 Add Edge Quadrance Case (in `getEdgeQuadrance()`, line ~2300+)

```javascript
case "newPolyhedron":
  return RT.quadrance(v1, v2);  // Or specific edge length
```

### 2.6 Add to Form Restoration (in `restoreFormFromJSON()`, line ~2400+)

```javascript
case "newPolyhedron":
  // Restore from saved state
  break;
```

### 2.7 Add Geometry Info Stats (in `updateGeometryStats()`, line ~2680+)

```javascript
if (document.getElementById("showNewPolyhedron")?.checked) {
  const newPoly = Polyhedra.newPolyhedron(1);
  const eulerOK = RT.verifyEuler(
    newPoly.vertices.length,
    newPoly.edges.length,
    newPoly.faces.length
  );
  html += `<div style="margin-top: 10px;"><strong>New Polyhedron:</strong></div>`;
  html += `<div>V: ${newPoly.vertices.length}, E: ${newPoly.edges.length}, F: ${newPoly.faces.length}</div>`;
  html += `<div>Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2)</div>`;
}
```

### 2.8 Add to getAllFormGroups() (line ~3005)

```javascript
function getAllFormGroups() {
  return {
    // ... existing groups
    newPolyhedronGroup,
  };
}
```

### 2.9 Add to createPolyhedronByType() (line ~3391)

Required for instance restoration from saved files:

```javascript
case "newPolyhedron":
  geometry = Polyhedra.newPolyhedron(scale);
  renderPolyhedron(group, geometry, color, opacity);
  break;
```

### 2.10 Export in Return Object (line ~3480+)

If needed for external access, add to the module's return object.

---

## Step 3: UI Controls (`index.html`)

Add checkbox and any additional controls in the appropriate section:

```html
<div class="control-item">
  <label class="checkbox-label">
    <input type="checkbox" id="showNewPolyhedron" />
    New Polyhedron
  </label>
  <!-- Optional: Additional controls like sliders, normalize checkbox -->
  <div
    class="control-row sub-controls"
    id="newPolyhedronControls"
    style="display: none;"
  >
    <label class="checkbox-label">
      <input type="checkbox" id="newPolyhedronNormalize" checked />
      Normalize
    </label>
  </div>
</div>
```

---

## Step 4: Event Handlers (`modules/rt-init.js`)

### 4.1 Declare Group Variable (line ~113)

```javascript
let newPolyhedronGroup;
```

### 4.2 Add Checkbox Event Handler (in event handlers section)

```javascript
const newPolyCheckbox = document.getElementById("showNewPolyhedron");
if (newPolyCheckbox) {
  newPolyCheckbox.addEventListener("change", () => {
    const controlsDiv = document.getElementById("newPolyhedronControls");
    if (controlsDiv) {
      controlsDiv.style.display = newPolyCheckbox.checked ? "flex" : "none";
    }
    updateGeometry();
  });
}
```

### 4.3 Add to Selection formGroups Arrays (TWO locations!)

**Location 1** - Selection system (line ~2210):

```javascript
const formGroups = [
  // ... existing groups
  newPolyhedronGroup,
];
```

**Location 2** - Snap targets (line ~2478):

```javascript
const formGroups = [
  // ... existing groups
  newPolyhedronGroup,
];
```

### 4.4 Destructure from getAllFormGroups() (line ~3750)

```javascript
({
  // ... existing groups
  newPolyhedronGroup,
} = formGroups);
```

---

## Step 5: Testing

1. **Visual**: Does the polyhedron render correctly?
2. **Face normals**: Are faces visible from outside (not culled)?
3. **Selection**: Can you click to select the form?
4. **Geometry Info**: Does the stats section show correct V/E/F?
5. **Euler**: Does V - E + F = 2?
6. **Console**: Check for [RT] validation logs and any errors

---

## Common Patterns

### Quadray-Native Polyhedra

For polyhedra defined in Quadray coordinates (like `quadrayTetrahedron`, `quadrayCuboctahedron`):

1. Define vertices as WXYZ coordinates
2. Apply zero-sum normalization if `normalize` option is true
3. Convert to Cartesian using basis vectors:

```javascript
const basisW = new THREE.Vector3(1, 1, 1);
const basisX = new THREE.Vector3(1, -1, -1);
const basisY = new THREE.Vector3(-1, 1, -1);
const basisZ = new THREE.Vector3(-1, -1, 1);
```

### Adjacency-Based Edge Computation

For polyhedra where edges aren't obvious, compute from vertex relationships:

```javascript
// Build adjacency list
const adjList = new Map();
for (let i = 0; i < vertexCount; i++) {
  adjList.set(i, []);
}

for (let i = 0; i < vertexCount; i++) {
  for (let j = i + 1; j < vertexCount; j++) {
    if (areAdjacent(vertices[i], vertices[j])) {
      adjList.get(i).push(j);
      adjList.get(j).push(i);
    }
  }
}

// Extract edges
const edges = [];
for (let i = 0; i < vertexCount; i++) {
  for (const j of adjList.get(i)) {
    if (i < j) edges.push([i, j]);
  }
}
```

### Face Winding Fix

Ensure faces have correct winding for outward normals:

```javascript
const fixWinding = (faceIndices, vertices) => {
  const v0 = vertices[faceIndices[0]];
  const v1 = vertices[faceIndices[1]];
  const v2 = vertices[faceIndices[2]];

  const edge1 = new THREE.Vector3().subVectors(v1, v0);
  const edge2 = new THREE.Vector3().subVectors(v2, v0);
  const normal = new THREE.Vector3().crossVectors(edge1, edge2);

  const center = new THREE.Vector3();
  faceIndices.forEach(idx => center.add(vertices[idx]));
  center.divideScalar(faceIndices.length);

  const outward = center.clone().normalize();

  if (normal.dot(outward) < 0) {
    return [...faceIndices].reverse();
  }
  return faceIndices;
};
```

---

## Notes

- **Central vectors**: For Quadray-native polyhedra, the central vectors visible in the viewport are from the `quadrayBasis` display (the WXYZ arrows), not from the polyhedron edges. Toggle "Show Quadray Basis" to hide them if desired.

- **Color conventions**:
  - Platonic solids: Primary colors
  - Quadray demonstrators: Lime/yellow-green tones
  - Matrix/array forms: Variations of base polyhedron color

- **Performance**: For high-vertex-count forms, consider caching geometry or using instanced rendering.

---

## Primitives (Non-Polyhedra Forms)

Primitives like Point, Line, and Polygon don't follow standard polyhedron patterns. They require special handling for tool restrictions, edge quadrance, close-packing, and selection highlighting.

### Quick Reference: Primitive Characteristics

| Primitive    | Vertices | Edges | Faces | Euler    | Packed Nodes        | Tool Restrictions |
| ------------ | -------- | ----- | ----- | -------- | ------------------- | ----------------- |
| Point (0D)   | 1        | 0     | 0     | N/A      | No (fallback to Md) | Move only         |
| Line (1D)    | 2        | 1     | 0     | 1 (open) | Yes (r = L/2)       | All tools         |
| Polygon (2D) | N        | N     | 1-2   | 1 (open) | Yes (by n-gon)      | All tools         |

---

### Point (0D Primitive) - IMPLEMENTED

**Characteristics:**

- Single vertex at origin, no edges, no faces
- Euler formula doesn't apply (degenerate)
- No valid edge quadrance for close-packing
- Color: Fuchsia/Bright Pink (`0xFF00FF`) - highly visible

**Implementation Files:**

| File                        | What Was Added                                          |
| --------------------------- | ------------------------------------------------------- |
| `modules/rt-polyhedra.js`   | `point()` generator returning single vertex             |
| `modules/rt-rendering.js`   | Color, group, rendering block, edge quadrance null case |
| `index.html`                | Checkbox "Point (Single Vertex)"                        |
| `modules/rt-init.js`        | Event handler, selection arrays, tool restriction logic |
| `modules/rt-filehandler.js` | State save/restore for `showPoint`                      |

**1. Geometry Generator** (`rt-polyhedra.js`):

```javascript
point: (halfSize = 1) => {
  const vertices = [new THREE.Vector3(0, 0, 0)];
  const edges = [];
  const faces = [];
  console.log('[RT] Point: single vertex at origin');
  return { vertices, edges, faces };
},
```

**2. Tool Restrictions** - Point only supports Move (no Scale/Rotate):

```javascript
// In group initialization (rt-rendering.js)
pointGroup.userData.allowedTools = ["move"];

// In tool button handler (rt-init.js), after extracting tool:
if (currentSelection) {
  const allowedTools = currentSelection.userData?.allowedTools;
  if (allowedTools && !allowedTools.includes(tool)) {
    console.log(
      `[Tool] '${tool}' not allowed for ${currentSelection.userData.type}`
    );
    return; // Block disallowed tool
  }
}
```

**3. Edge Quadrance** - Return `null` for edgeless forms:

```javascript
// In getPolyhedronEdgeQuadrance()
case "point":
  return null;  // No edges - packed sizing not applicable
```

**4. Close-Pack Fallback** - Handle null in `getClosePackedRadius()`:

```javascript
const Q_edge = getPolyhedronEdgeQuadrance(type, scale);
if (Q_edge === null || Q_edge === 0) {
  return null; // Signal packed not available
}
```

**5. Node Size Fallback** - In `renderPolyhedron()`:

```javascript
if (nodeSize === "packed") {
  nodeRadius = getClosePackedRadius(polyType, scale);
  if (nodeRadius === null) {
    nodeRadius = 0.04; // Fall back to "md" size
  }
}
```

**6. Geometry Stats** - No Euler validation:

```javascript
html += `<div>V: 1, E: 0, F: 0</div>`;
html += `<div>Euler: N/A (degenerate)</div>`;
```

**7. State Save/Restore** (`rt-filehandler.js`):

```javascript
// In polyhedraCheckboxes array
"showPoint",

// Checkbox is automatically handled by generic polyhedra restore logic
```

---

### Line (1D Primitive) - IMPLEMENTED

**Characteristics:**

- 2 vertices, 1 edge, no faces
- Euler: V - E + F = 2 - 1 + 0 = 1 (not satisfied - open form)
- RT-Pure parameterization: Q (Quadrance) as primary input, L (Length) derived
- Color: Red (`0xFF0000`)
- Variable lineweight using Line2/LineMaterial (cross-platform)

**Implementation Files:**

| File                        | What Was Added                                          |
| --------------------------- | ------------------------------------------------------- |
| `modules/rt-polyhedra.js`   | `line(quadrance)` generator                             |
| `modules/rt-rendering.js`   | Line2 imports, color, group, rendering with thick lines |
| `index.html`                | Checkbox, Q/L inputs, lineweight slider                 |
| `modules/rt-init.js`        | Bidirectional Q↔L handlers, LineMaterial highlight fix  |
| `modules/rt-filehandler.js` | State save/restore for Q, L, and lineweight             |

**1. Geometry Generator** (`rt-polyhedra.js`):

```javascript
line: (quadrance = 1, options = {}) => {
  const length = Math.sqrt(quadrance);
  const halfLength = length / 2;
  const vertices = [
    new THREE.Vector3(0, 0, -halfLength),
    new THREE.Vector3(0, 0, halfLength),
  ];
  const edges = [[0, 1]];
  const faces = [];
  console.log(`[RT] Line: Q=${quadrance.toFixed(6)}, length=${length.toFixed(6)}`);
  return { vertices, edges, faces, metadata: { quadrance, length } };
},
```

**2. Line2 Imports** (`rt-rendering.js`):

```javascript
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
```

**3. Edge Quadrance** - Returns the quadrance directly:

```javascript
// In getPolyhedronEdgeQuadrance()
case "line":
  return scale;  // scale IS the quadrance for line primitive
```

**4. Close-Packing** - Packed nodes touch at line midpoint:

```javascript
// Q_vertex = Q_edge / 4, so r = √(Q/4) = L/2
// For line, packed radius = edgeLength / 2 = √quadrance / 2
```

**5. Line2 Rendering** (in `renderPolyhedron()`):

```javascript
// Use Line2 for variable lineweight (WebGL limitation workaround)
if (useThickLine && edges.length > 0) {
  edges.forEach(([i, j]) => {
    const lineMaterial = new LineMaterial({
      color: color,
      linewidth: options.lineWidth * 0.002, // Scale factor
      worldUnits: true,
      depthTest: true,
      depthWrite: true,
    });
    lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

    const positions = [
      vertices[i].x,
      vertices[i].y,
      vertices[i].z,
      vertices[j].x,
      vertices[j].y,
      vertices[j].z,
    ];
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions(positions);

    const line2 = new Line2(lineGeometry, lineMaterial);
    line2.computeLineDistances();
    group.add(line2);
  });
}
```

**6. LineMaterial Selection Highlight** (`rt-init.js`):

LineMaterial handles color differently than LineBasicMaterial (no `emissive` property):

```javascript
// In applyHighlight()
} else if (obj.isLine) {
  obj.userData.originalLineWidth = obj.material.linewidth || 1;
  if (obj.material.isLineMaterial) {
    // LineMaterial: use getHex()/setHex() for color
    obj.userData.originalColor = obj.material.color.getHex();
    obj.material.color.setHex(0x00ffff);  // Cyan highlight
    obj.material.linewidth = (obj.userData.originalLineWidth || 0.002) * 1.5;
  } else if (obj.material.color) {
    // LineBasicMaterial fallback
    obj.userData.originalColor = obj.material.color.getHex();
    obj.material.color.setHex(0x00ffff);
    obj.material.linewidth = 3;
  }
}

// In clearHighlight()
} else if (obj.isLine) {
  if (obj.material.isLineMaterial) {
    if (obj.userData.originalColor !== undefined) {
      obj.material.color.setHex(obj.userData.originalColor);
    }
    if (obj.userData.originalLineWidth !== undefined) {
      obj.material.linewidth = obj.userData.originalLineWidth;
    }
  } else if (obj.material.color && obj.userData.originalColor !== undefined) {
    obj.material.color.setHex(obj.userData.originalColor);
  }
}
```

**7. UI Controls** (`index.html`):

```html
<div class="control-item">
  <label class="checkbox-label">
    <input type="checkbox" id="showLine" />
    Line (1D Primitive)
  </label>
  <div id="line-controls" style="display: none; margin-left: 20px;">
    <div class="line-quadrance-container">
      <label>Q:</label>
      <input
        type="number"
        id="lineQuadrance"
        value="1"
        step="0.1"
        min="0.001"
      />
      <label>L:</label>
      <input type="number" id="lineLength" value="1" step="0.1" min="0.001" />
    </div>
    <div class="line-weight-container">
      <label>Weight:</label>
      <input type="range" id="lineWeight" min="1" max="10" value="2" />
      <span id="lineWeightValue">2</span>
    </div>
  </div>
</div>
```

**8. Bidirectional Q↔L Conversion** (`rt-init.js`):

```javascript
// Q changes → update L
lineQuadranceInput.addEventListener("input", () => {
  const Q = parseFloat(lineQuadranceInput.value) || 1;
  lineLengthInput.value = Math.sqrt(Q).toFixed(4);
  updateGeometry();
});

// L changes → update Q
lineLengthInput.addEventListener("input", () => {
  const L = parseFloat(lineLengthInput.value) || 1;
  lineQuadranceInput.value = (L * L).toFixed(4);
  updateGeometry();
});
```

**9. State Save/Restore** (`rt-filehandler.js`):

```javascript
// In polyhedraCheckboxes array
"showLine",

// In sliderValues object
lineQuadrance: "lineQuadrance",
lineLength: "lineLength",
lineWeight: "lineWeight",

// Show/hide line-controls on restore
if (document.getElementById("showLine")?.checked) {
  const lineControls = document.getElementById("line-controls");
  if (lineControls) lineControls.style.display = "block";
}
```

**10. createPolyhedronByType()** - Set userData BEFORE rendering:

```javascript
case "line": {
  const quadrance = params.quadrance || 1;
  const length = params.length || Math.sqrt(quadrance);
  const lineWeight = params.lineWeight || 2;
  const geometry = Polyhedra.line(quadrance);
  group.userData.type = "line";  // Set BEFORE renderPolyhedron
  group.userData.parameters = { quadrance, length, lineWeight };
  renderPolyhedron(group, geometry, color, opacity, { lineWidth: lineWeight });
  break;
}
```

---

### Polygon (2D Primitive) - IMPLEMENTED

**Characteristics:**

- N vertices, N edges, 1 face (optional)
- Euler: V - E + F = N - N + 1 = 1 (open form)
- RT-Pure parameterization: Q_R (circumradius quadrance) as primary input
- Drawn on XY plane (Z=0), face normal pointing +Z
- Color: Green (`0x00FF00`) - distinct from Line (red) and Point (fuchsia)

**Implementation Files:**

| File                        | What Was Added                                                |
| --------------------------- | ------------------------------------------------------------- |
| `modules/rt-polyhedra.js`   | `polygon(quadrance, options)` generator                       |
| `modules/rt-rendering.js`   | Color, group, rendering block, edge quadrance case            |
| `index.html`                | Checkbox, sides input, Q_R/R inputs, face toggle, edge weight |
| `modules/rt-init.js`        | Bidirectional Q_R↔R handlers, event handlers                  |
| `modules/rt-filehandler.js` | State save/restore for all polygon parameters                 |

**1. Geometry Generator** (`rt-polyhedra.js`):

```javascript
polygon: (quadrance = 1, options = {}) => {
  const n = options.sides || 3;  // Default triangle
  const showFace = options.showFace !== false;  // Default true

  // Circumradius R = √Q_R
  const R = Math.sqrt(quadrance);

  // Calculate spread and edge quadrance for RT purity
  // spread(π/n) = sin²(π/n)
  const centralAngle = Math.PI / n;
  const spread = Math.pow(Math.sin(centralAngle), 2);
  // Q_edge = 4·R²·spread = 4·Q_R·spread
  const Q_edge = 4 * quadrance * spread;
  const edgeLength = Math.sqrt(Q_edge);

  // Generate vertices around circumcircle in XY plane
  const vertices = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    vertices.push(new THREE.Vector3(
      R * Math.cos(angle),
      R * Math.sin(angle),
      0
    ));
  }

  // Edges connect consecutive vertices (closed loop)
  const edges = [];
  for (let i = 0; i < n; i++) {
    edges.push([i, (i + 1) % n]);
  }

  // Face: single n-gon with CCW winding for +Z normal
  const faces = showFace ? [Array.from({ length: n }, (_, i) => i)] : [];

  console.log(`[RT] Polygon: n=${n}, Q_R=${quadrance.toFixed(6)}, R=${R.toFixed(6)}, Q_edge=${Q_edge.toFixed(6)}`);

  return {
    vertices,
    edges,
    faces,
    metadata: {
      sides: n,
      quadrance,  // circumradius quadrance
      circumradius: R,
      edgeQuadrance: Q_edge,
      edgeLength,
      spread,
      showFace,
    }
  };
},
```

**2. Edge Quadrance** - Calculated from circumradius quadrance and sides:

```javascript
// In getPolyhedronEdgeQuadrance()
case "polygon": {
  // Q_edge = 4·Q_R·spread(π/n) where spread = sin²(θ)
  // scale is the circumradius quadrance (Q_R)
  const sides = options?.sides || 3;
  const centralAngle = Math.PI / sides;
  const spread = Math.pow(Math.sin(centralAngle), 2);
  return 4 * scale * spread;
}
```

**3. Close-Packing** - Packed nodes recalculate based on n-gon edge quadrance:

```javascript
// Packed node radius = √(Q_edge/4) = edgeLength / 2
// Q_vertex = Q_edge / 4
// Same formula as Line - nodes touch at edge midpoints
```

**4. RT Spread Reference Table**:

| n-gon        | Central Angle | Spread s = sin²(π/n) | Q_edge / Q_R |
| ------------ | ------------- | -------------------- | ------------ |
| Triangle (3) | 60°           | 3/4 = 0.75           | 3            |
| Square (4)   | 45°           | 1/2 = 0.5            | 2            |
| Pentagon (5) | 36°           | ≈0.345               | ≈1.38        |
| Hexagon (6)  | 30°           | 1/4 = 0.25           | 1            |
| Octagon (8)  | 22.5°         | ≈0.146               | ≈0.586       |
| Decagon (10) | 18°           | ≈0.095               | ≈0.382       |

**5. UI Controls** (`index.html`):

```html
<div class="control-item">
  <label class="checkbox-label">
    <input type="checkbox" id="showPolygon" />
    Polygon (2D Primitive)
  </label>
  <div id="polygon-controls" style="display: none; margin-left: 20px;">
    <div class="polygon-sides-container">
      <label>Sides:</label>
      <input type="number" id="polygonSides" value="3" min="3" max="24" />
    </div>
    <div class="polygon-quadrance-container">
      <label>Q<sub>R</sub>:</label>
      <input
        type="number"
        id="polygonQuadrance"
        value="1"
        step="0.1"
        min="0.001"
      />
      <label>R:</label>
      <input
        type="number"
        id="polygonRadius"
        value="1"
        step="0.1"
        min="0.001"
      />
    </div>
    <div class="polygon-face-container">
      <label class="checkbox-label">
        <input type="checkbox" id="polygonShowFace" checked />
        Show Face
      </label>
    </div>
    <div class="polygon-weight-container">
      <label>Edge Weight:</label>
      <input type="range" id="polygonEdgeWeight" min="1" max="10" value="2" />
      <span id="polygonEdgeWeightValue">2</span>
    </div>
  </div>
</div>
```

**6. Bidirectional Q_R↔R Conversion** (`rt-init.js`):

```javascript
// Q_R changes → update R
polygonQuadranceInput.addEventListener("input", () => {
  const Q = parseFloat(polygonQuadranceInput.value) || 1;
  polygonRadiusInput.value = Math.sqrt(Q).toFixed(4);
  updateGeometry();
});

// R changes → update Q_R
polygonRadiusInput.addEventListener("input", () => {
  const R = parseFloat(polygonRadiusInput.value) || 1;
  polygonQuadranceInput.value = (R * R).toFixed(4);
  updateGeometry();
});
```

**7. State Save/Restore** (`rt-filehandler.js`):

```javascript
// In polyhedraCheckboxes
showPolygon: document.getElementById("showPolygon")?.checked || false,

// In sliderValues
polygonSides: parseInt(document.getElementById("polygonSides")?.value || "3"),
polygonQuadrance: parseFloat(document.getElementById("polygonQuadrance")?.value || "1"),
polygonRadius: parseFloat(document.getElementById("polygonRadius")?.value || "1"),
polygonEdgeWeight: parseInt(document.getElementById("polygonEdgeWeight")?.value || "2"),
polygonShowFace: document.getElementById("polygonShowFace")?.checked !== false,

// Show/hide polygon-controls on restore
if (polygonControls && checkboxes.showPolygon) {
  polygonControls.style.display = "block";
}
```

**8. createPolyhedronByType()** - Set userData BEFORE rendering:

```javascript
case "polygon": {
  const polyQuadrance = options.quadrance ?? scale;
  const polySides = options.sides ?? 3;
  const polyEdgeWeight = options.edgeWeight ?? 2;
  const polyShowFace = options.showFace !== false;
  geometry = Polyhedra.polygon(polyQuadrance, { sides: polySides, showFace: polyShowFace });
  group.userData.type = "polygon";
  group.userData.parameters = {
    quadrance: polyQuadrance,
    circumradius: Math.sqrt(polyQuadrance),
    sides: polySides,
    edgeQuadrance: geometry.metadata.edgeQuadrance,
    edgeLength: geometry.metadata.edgeLength,
    edgeWeight: polyEdgeWeight,
    showFace: polyShowFace,
  };
  renderPolyhedron(group, geometry, color, opacity, { lineWidth: polyEdgeWeight });
  break;
}
```

**9. Tool Restrictions**:

- Move: Yes
- Scale: Yes (uniform scaling preserves regular polygon)
- Rotate: Yes (useful for orienting the plane in 3D space)

---

### General Pattern for Primitives

When adding any primitive:

1. **Determine tool applicability** - What operations make geometric sense?
2. **Calculate edge quadrance** - Or return `null` if no edges exist
3. **Handle close-packing edge cases** - Provide fallback when packing undefined
4. **Skip Euler validation** - Open forms don't satisfy V - E + F = 2
5. **Consider coordinate display** - Primitives are useful for exploring coordinate mappings
6. **Use Line2/LineMaterial** - For cross-platform variable lineweight (WebGL limitation)
7. **Handle LineMaterial in selection** - No `emissive` property; use `getHex()`/`setHex()`
8. **State save/restore** - Add checkbox to `polyhedraCheckboxes`, parameters to `sliderValues`
9. **Set userData.type BEFORE renderPolyhedron** - Required for proper edge quadrance lookup

---

## Declarative UI Bindings (Simplified Approach)

As of January 2026, ARTexplorer uses a declarative binding system that significantly reduces boilerplate when adding new forms. Instead of writing individual event handlers in `rt-init.js`, you can declare bindings in `modules/rt-ui-binding-defs.js`.

### Quick Comparison

**Old approach** (manual event handlers in rt-init.js):
```javascript
const myCheckbox = document.getElementById("showMyForm");
if (myCheckbox) {
  myCheckbox.addEventListener("change", () => {
    const controlsDiv = document.getElementById("myForm-controls");
    if (controlsDiv) {
      controlsDiv.style.display = myCheckbox.checked ? "flex" : "none";
    }
    updateGeometry();
  });
}

const mySlider = document.getElementById("myFormSlider");
if (mySlider) {
  mySlider.addEventListener("input", () => {
    document.getElementById("myFormDisplay").textContent = mySlider.value;
    updateGeometry();
  });
}
```

**New approach** (declarative in rt-ui-binding-defs.js):
```javascript
// In checkboxWithControlsBindings array:
{ id: "showMyForm", type: "checkbox-controls", controlsId: "myForm-controls" },

// In sliderBindings array:
{ id: "myFormSlider", type: "slider", valueId: "myFormDisplay" },

// In geodesicProjectionBindings array (for radio groups):
{ type: "radio-group", name: "myFormStartFace" },
```

### Binding Types

| Type | Purpose | Parameters |
|------|---------|------------|
| `checkbox` | Toggle visibility, triggers updateGeometry | `id` |
| `checkbox-controls` | Toggle + show/hide sub-controls panel | `id`, `controlsId` |
| `slider` | Update display value, triggers updateGeometry | `id`, `valueId` (optional) |
| `slider-linked` | Bidirectional conversion (e.g., Q ↔ L) | `primaryId`, `secondaryId`, conversion functions |
| `radio-group` | Radio button group | `name` attribute |

### Adding a New Form with Declarative Bindings

**Step 1: HTML** (`index.html`)
```html
<div class="control-item">
  <label class="checkbox-label">
    <input type="checkbox" id="showMyForm" />
    My Form
  </label>
  <div id="myForm-controls" class="geodesic-options" style="display: none">
    <div class="matrix-control-item">
      <label class="matrix-size-label">Count</label>
      <div class="slider-container">
        <input type="range" id="myFormCountSlider" min="1" max="100" value="10" />
        <span class="slider-value" id="myFormCountDisplay">10</span>
      </div>
    </div>
  </div>
</div>
```

**Step 2: Bindings** (`modules/rt-ui-binding-defs.js`)
```javascript
// In checkboxWithControlsBindings:
{ id: "showMyForm", type: "checkbox-controls", controlsId: "myForm-controls" },

// In sliderBindings:
{ id: "myFormCountSlider", type: "slider", valueId: "myFormCountDisplay" },
```

**Step 3: State Persistence** (`modules/rt-filehandler.js`)
```javascript
// In save state collection:
showMyForm: document.getElementById("showMyForm")?.checked || false,
myFormCount: parseInt(document.getElementById("myFormCountSlider")?.value || "10"),

// In restore logic:
if (sliders.myFormCount !== undefined) {
  const slider = document.getElementById("myFormCountSlider");
  const display = document.getElementById("myFormCountDisplay");
  if (slider) slider.value = sliders.myFormCount;
  if (display) display.textContent = sliders.myFormCount;
}

// Controls visibility:
const myFormControls = document.getElementById("myForm-controls");
if (myFormControls && checkboxes.showMyForm) {
  myFormControls.style.display = "block";
}
```

That's it! The binding system handles:
- Event listeners (input, change)
- Display value updates
- Triggering updateGeometry()
- Show/hide of control panels

### Linked Sliders (Bidirectional Conversion)

For RT-pure forms with Q ↔ L conversion:

```javascript
// In linkedSliderBindings:
{
  type: "slider-linked",
  primaryId: "myFormQuadrance",
  secondaryId: "myFormLength",
  primaryToSecondary: Q => Math.sqrt(Q),  // Q → L = √Q
  secondaryToPrimary: L => L * L,          // L → Q = L²
},
```

### Files to Update (Simplified Checklist)

| Step | File | What to Add |
|------|------|-------------|
| 1 | `modules/rt-polyhedra.js` (or `rt-helices.js`) | Geometry generator |
| 2 | `modules/rt-rendering.js` | Color, group, rendering block, stats |
| 3 | `index.html` | UI checkbox and controls |
| 4 | `modules/rt-ui-binding-defs.js` | Declarative bindings |
| 5 | `modules/rt-init.js` | Group variable, formGroups arrays (2 places), destructure |
| 6 | `modules/rt-filehandler.js` | State save/restore |
| 7 | `modules/rt-nodes.js` | Edge quadrance case (if applicable) |

**Note:** Manual event handlers in `rt-init.js` are no longer needed for standard checkbox/slider/radio behavior.

---

_Last updated: February 2026_
_Contributors: Andy & Claude_
