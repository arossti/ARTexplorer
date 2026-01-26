# Matrix Instance Export/Import Workplan

**Created:** 2026-01-26
**Status:** Planning
**Priority:** Medium
**Branch:** TBD

---

## Problem Statement

Matrix instances (planar and radial) fail to restore on JSON import due to complex nested group structures that don't clone properly. The current approach attempts to clone geometry, which fails with errors like:

```
Cannot read properties of undefined (reading 'itemSize')
```

---

## Current Architecture

### Matrix Creation Flow (Environment)

1. User enables matrix checkbox (e.g., `showCubeMatrix`)
2. `updateGeometry()` dynamically imports `rt-matrix-planar.js` or `rt-matrix-radial.js`
3. Matrix module creates nested `THREE.Group` with many child meshes/lines
4. Group added to scene with `userData.type` set

### Instance Creation Flow

1. User clicks "NOW" button with matrix selected
2. `RTStateManager.createInstance()` clones the group hierarchy
3. Clone stored in `state.instances[]` with transform/parameters
4. Clone added to scene

### Current Export (Works)

```json
{
  "type": "cubeMatrix",
  "parameters": {
    "matrixSize": 3,
    "rotate45": false
  },
  "transform": { ... }
}
```

### Current Import (Fails)

1. `createPolyhedronByTypeAsync()` dynamically imports matrix module
2. Attempts to create fresh matrix with parameters
3. Geometry creation succeeds but nested structure causes issues
4. `createInstance()` clone fails on complex hierarchy

---

## Proposed Solution

### Strategy: Parameter-Based Recreation

Instead of cloning complex geometry, store only the parameters needed to recreate the matrix, then let the original generators rebuild it on import.

### Phase 1: Export Enhancement

**Goal:** Ensure all matrix parameters are captured in export

**Planar Matrix Parameters:**
- `type`: `cubeMatrix`, `tetMatrix`, `octaMatrix`, `cuboctaMatrix`, `rhombicDodecMatrix`
- `matrixSize`: Integer (N×N grid)
- `rotate45`: Boolean
- `opacity`: Float
- `color`: Hex color (optional, can use palette default)

**Radial Matrix Parameters:**
- `type`: `radialCubeMatrix`, `radialRhombicDodecMatrix`, `radialTetMatrix`, `radialOctMatrix`, `radialVEMatrix`
- `frequency`: Integer (shell count)
- `opacity`: Float
- `color`: Hex color (optional)
- `useIVMPositions`: Boolean (for octahedron only)

**Transform:**
- `position`: {x, y, z}
- `rotation`: {x, y, z, order}
- `scale`: {x, y, z}

### Phase 2: Import Refactoring

**Goal:** Recreate matrices using generators instead of cloning

**Approach A: Direct Generator Call**

```javascript
// In createPolyhedronByTypeAsync for matrix types
const { RTMatrix } = await import("./rt-matrix-planar.js");

// Create fresh matrix with stored parameters
const matrix = RTMatrix.createCubeMatrix(
  options.matrixSize,
  scale,
  options.rotate45,
  options.opacity,
  color,
  THREE
);

// Wrap in group with metadata
const group = new THREE.Group();
group.add(matrix);
group.userData.type = type;
group.userData.parameters = { matrixSize, rotate45, ... };

return group;
```

**Approach B: Delegate to updateGeometry Pattern**

Reuse the same code path as checkbox-based creation:

```javascript
// Create temporary checkbox state
// Call updateGeometry() variant
// Extract the created group
// Reset checkbox state
```

*Approach A is cleaner and recommended.*

### Phase 3: StateManager Update

**Goal:** Skip deep cloning for matrix types

```javascript
createInstance(polyhedronGroup, scene) {
  const type = polyhedronGroup.userData.type;
  const isMatrix = matrixTypes.includes(type);

  if (isMatrix) {
    // For matrices, just store parameters - no clone needed
    // The THREE object IS the instance (not a clone of a form)
    const instance = {
      id: instanceId,
      type: type,
      parameters: polyhedronGroup.userData.parameters,
      transform: { ... },
      threeObject: polyhedronGroup, // Direct reference, not clone
    };
    // ... rest of instance creation
  } else {
    // Existing clone logic for simple polyhedra
  }
}
```

### Phase 4: Node Restoration

Matrix nodes (vertex spheres) also need recreation:

```javascript
// After matrix geometry created, add nodes if enabled
const nodeSizeBtn = document.querySelector(".node-size-btn.active");
const nodeSize = nodeSizeBtn?.dataset.nodeSize || "md";

if (nodeSize !== "off") {
  addMatrixNodes(group, matrixSize, scale, rotate45, color, nodeSize);
  // or addRadialMatrixNodes for radial types
}
```

**Question:** Should node state be saved per-instance or use current UI setting on import?

---

## Implementation Tasks

### Task 1: Verify Export Parameters
- [ ] Confirm `userData.parameters` contains all needed values for each matrix type
- [ ] Add any missing parameters during matrix creation

### Task 2: Simplify createPolyhedronByTypeAsync
- [ ] Remove complex cloning logic
- [ ] Call matrix generators directly with stored parameters
- [ ] Return properly structured group

### Task 3: Update StateManager for Matrix Types
- [ ] Add matrix type detection
- [ ] Skip deep clone for matrices (use direct reference)
- [ ] Ensure transform is applied correctly

### Task 4: Test All Matrix Types
- [ ] Planar: cubeMatrix, tetMatrix, octaMatrix, cuboctaMatrix, rhombicDodecMatrix
- [ ] Radial: radialCubeMatrix, radialRhombicDodecMatrix, radialTetMatrix, radialOctMatrix, radialVEMatrix
- [ ] Test with various sizes/frequencies
- [ ] Test with rotate45 enabled/disabled
- [ ] Test transform preservation (position, rotation, scale)

### Task 5: Node Restoration
- [ ] Decide on node state persistence strategy
- [ ] Implement node recreation on import
- [ ] Test node appearance matches original

---

## JSON Schema Update

```json
{
  "instances": [
    {
      "id": "instance_xxx",
      "type": "cubeMatrix",
      "parameters": {
        "matrixSize": 3,
        "rotate45": false,
        "opacity": 0.25,
        "nodeSize": "md"
      },
      "transform": {
        "position": { "x": 0, "y": 0, "z": 0 },
        "rotation": { "x": 0, "y": 0, "z": 0, "order": "XYZ" },
        "scale": { "x": 1, "y": 1, "z": 1 }
      },
      "appearance": {
        "visible": true
      }
    }
  ]
}
```

---

## Files to Modify

1. **rt-rendering.js** - `createPolyhedronByTypeAsync()` simplification
2. **rt-state-manager.js** - Matrix-aware `createInstance()`
3. **rt-filehandler.js** - Import logic (may need minimal changes)
4. **rt-matrix-planar.js** - Ensure `userData.parameters` set correctly
5. **rt-matrix-radial.js** - Ensure `userData.parameters` set correctly

---

## Testing Checklist

### Export Tests
- [ ] Export scene with single planar matrix instance
- [ ] Export scene with single radial matrix instance
- [ ] Export scene with mixed matrix and polyhedra instances
- [ ] Verify JSON contains correct parameters

### Import Tests
- [ ] Import planar matrix - geometry recreated correctly
- [ ] Import radial matrix - geometry recreated correctly
- [ ] Transform preserved (move matrix, export, import, verify position)
- [ ] Scale preserved
- [ ] Rotation preserved

### Round-Trip Tests
- [ ] Export → Import → Export produces equivalent JSON
- [ ] Visual comparison before/after import

### Edge Cases
- [ ] Large matrix (10×10)
- [ ] High frequency radial (5+ shells)
- [ ] Multiple matrix instances of same type
- [ ] Matrix with nodes enabled

---

## Estimated Effort

- Phase 1 (Export): 15 minutes
- Phase 2 (Import): 45 minutes
- Phase 3 (StateManager): 30 minutes
- Phase 4 (Nodes): 30 minutes
- Testing: 30 minutes

**Total: ~2.5 hours**

---

## References

- [rt-filehandler.js](../modules/rt-filehandler.js) - Import/export logic
- [rt-state-manager.js](../modules/rt-state-manager.js) - Instance management
- [rt-rendering.js](../modules/rt-rendering.js) - `createPolyhedronByTypeAsync()`
- [rt-matrix-planar.js](../modules/rt-matrix-planar.js) - Planar matrix generators
- [rt-matrix-radial.js](../modules/rt-matrix-radial.js) - Radial matrix generators
- [rt-filehandler.md](rt-filehandler.md) - File handler documentation

---

*Last Updated: 2026-01-26*
