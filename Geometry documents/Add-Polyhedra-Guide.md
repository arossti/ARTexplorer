# Adding New Polyhedra to ARTexplorer

This guide documents all the files and code sections that need modification when adding a new polyhedron or matrix group to ARTexplorer.

## Quick Checklist

When adding a new polyhedron (e.g., `newPolyhedron`), update these files:

| Step | File | What to Add |
|------|------|-------------|
| 1 | `modules/rt-polyhedra.js` | Geometry generator function |
| 2 | `modules/rt-rendering.js` | Color, group variable, rendering block, stats |
| 3 | `index.html` | UI checkbox and controls |
| 4 | `modules/rt-init.js` | Event handlers, selection arrays |
| 5 | Test | Verify in browser |

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
  const newPoly = Polyhedra.newPolyhedron(scale, { /* options */ });
  renderPolyhedron(
    newPolyhedronGroup,
    newPoly,
    colorPalette.newPolyhedron,
    opacity
  );
  newPolyhedronGroup.userData.parameters = { /* stored params */ };
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

### 2.9 Export in Return Object (line ~3480+)
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
  <div class="control-row sub-controls" id="newPolyhedronControls" style="display: none;">
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

*Last updated: January 2026*
*Contributors: Andy & Claude*
