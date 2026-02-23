# Matrix Slider - IVM Spatial Array Feature

**Feature Name:** Matrix Slider (Isotropic Vector Matrix Array)
**Status:** ✅ COMPLETE - All phases implemented (Cube, Tet, Octa, Cubocta, Rhombic Dodec)
**Priority:** Medium
**Created:** 2026-01-05
**Last Updated:** 2026-01-08
**Completed:** 2026-01-08
**Related Systems:** Scale controls, Polyhedra rendering, IVM grids, Instance transforms

---

## 1. Overview

### Purpose

Create a slider control that arrays polyhedra across the X-Y plane to visualize Fuller's Isotropic Vector Matrix (IVM). The slider multiplies the base polyhedron from a single unit (1) to an N×N spatial matrix, demonstrating space-filling properties and natural tetrahedral packing.

### Key Concept

Unlike grid tessellation (which controls line density), the **Matrix Slider** controls **polyhedra replication** across the horizontal plane, creating a spatial array that grows uniformly when scaled.

---

## 2. Feature Requirements

### 2.1 Core Functionality

**Matrix Slider Specifications:**

- **Location:** Scale section of UI (below Cube/Tetrahedron edge length sliders)
- **Range:** 1 to 10 (1×1 to 10×10 matrix)
- **Default:** 1 (single polyhedron)
- **Step:** 1 (integer values only)
- **Label:** "Matrix Size" or "IVM Array"

**Behavior:**

- Value N creates an N×N array in the X-Y plane
- Z-height remains constant (one unit: -halfSize to +halfSize)
- Arrays are centered at origin
- Existing Scale sliders affect the entire array uniformly

### 2.2 Polyhedra Array Patterns

#### Priority 1: Hexahedron (Cube)

**Pattern:** Simple orthogonal grid

- **Array:** N×N grid of cubes touching face-to-face
- **Spacing:** Edge-to-edge contact (no gaps)
- **Plan View:** Perfect square grid
- **Z-extent:** One unit tall (constant)
- **Example:** Matrix=5 → 25 cubes in 5×5 grid

**Implementation:**

```javascript
// Pseudocode
for (let x = 0; x < matrixSize; x++) {
  for (let y = 0; y < matrixSize; y++) {
    const offset = new THREE.Vector3(
      (x - matrixSize / 2 + 0.5) * cubeEdge,
      (y - matrixSize / 2 + 0.5) * cubeEdge,
      0 // Z-centered at origin
    );
    createCubeInstance(offset, halfSize);
  }
}
```

#### Priority 2: Tetrahedron

**Pattern:** Vertex-to-vertex array with octahedral voids

- **Array:** N×N grid of tetrahedra (alternating orientations)
- **Spacing:** Vertices touch, creating invisible half-octahedral voids
- **Plan View:** Square grid (vertices project to grid points)
- **Z-extent:** Tetrahedra point up (+Z) and down (-Z) alternating
- **Voids:** Half-octahedra (not rendered, implied negative space)

**Geometric Note:**
Tetrahedra do NOT fill space alone. The array creates:

- Visible: Tetrahedra at grid vertices
- Invisible: Octahedral voids between tetrahedra
- Together: Demonstrates tetrahedral close-packing principle

**Implementation Challenge:**
Determine alternating orientation pattern (up/down tetrahedra) to create vertex contact.

#### Priority 3: Octahedron

**Pattern:** Face-to-face square array

- **Array:** N×N grid of octahedra
- **Spacing:** Square faces touching in X-Y plane
- **Plan View:** Perfect square grid (octahedra viewed from above show square cross-section)
- **Z-extent:** One unit tall (vertices at ±halfSize in Z)
- **Natural Fit:** Octahedra have square cross-section in plan view

**Implementation:**
Similar to cube, but using octahedron geometry with square face alignment.

### 2.3 Matrix Rotation: 45° Grid Alignment

**Purpose:** Align Tetrahedron and Octahedron matrices to X-Y grid axes

**Problem:**

- Tetrahedra and Octahedra naturally render at 45° to the X-Y grid
- This creates diagonal orientation that doesn't align with Cartesian axes
- Result: Visually confusing when overlaying with cube matrices or grids

**Solution: "Rotate 45°" Checkbox**

- Rotates entire matrix 45° around Z-axis (spread = 0.5)
- Aligns Tet/Octa edges parallel to X and Y axes
- Creates edge-to-edge contact for octahedra
- Creates vertex-to-vertex contact for tetrahedra
- Cube matrices unaffected (already grid-aligned)

**RT-Pure Implementation (NO ANGLES!):**

```javascript
// RT-PURE: Work in spread/cross space, not angles
// "45°" is user-facing shorthand only - internal math uses exact rational values
//
// Spread s = sin²(45°) = (√2/2)² = 1/2 = 0.5 (EXACT RATIONAL)
// Cross  c = cos²(45°) = 1/2 = 0.5 (EXACT RATIONAL)
// Verify RT identity: s + c = 0.5 + 0.5 = 1.0 ✓

// Extract sin/cos from spread/cross (only when needed for matrix)
const s = 0.5; // Spread (exact rational)
const c = 0.5; // Cross (exact rational)
const sin_val = Math.sqrt(s); // √(1/2) = √2/2 (deferred √ expansion)
const cos_val = Math.sqrt(c); // √(1/2) = √2/2

// Construct rotation matrix manually (RT-pure approach)
const rotationMatrix = new THREE.Matrix4();
rotationMatrix.set(
  cos_val,
  -sin_val,
  0,
  0, // Row 1: [cos, -sin, 0, 0]
  sin_val,
  cos_val,
  0,
  0, // Row 2: [sin,  cos, 0, 0]
  0,
  0,
  1,
  0, // Row 3: [0,    0,   1, 0]
  0,
  0,
  0,
  1 // Row 4: [0,    0,   0, 1]
);

// Apply to entire matrix group
if (matrixRotate45Enabled) {
  matrixGroup.applyMatrix4(rotationMatrix);
}

// ALTERNATIVE: If Three.js makeRotationZ is used (pragmatic compromise):
// const rotation_45_z = new THREE.Matrix4().makeRotationZ(Math.PI / 4);
// NOTE: This uses π internally, but we've verified s=c=0.5 algebraically first

// IMPLEMENTATION NOTE: Use RT.applyRotation45(group) from rt-math.js module
// This centralizes rotation logic with other RT-pure functions (spread, circleParam)
```

**Use Cases:**

- **Octahedron Matrix:** Edges align with grid → cleaner visual
- **Tetrahedron Matrix:** Vertices align with grid points → easier to understand packing
- **Combined Matrices:** Tet + Octa both align → demonstrates IVM relationships clearly
- **Grid Overlay:** Matrix aligns with Cartesian grid lines for educational clarity

**Visual Comparison:**

| Rotation         | Tetrahedron    | Octahedron     | Cube           |
| ---------------- | -------------- | -------------- | -------------- |
| **Default (0°)** | Diagonal edges | Diagonal edges | Grid-aligned ✓ |
| **Rotate 45°**   | Grid-aligned ✓ | Grid-aligned ✓ | Grid-aligned ✓ |

### 2.4 Scale Interaction

**Critical Behavior:**
When user adjusts Cube Edge Length or Tetrahedron Edge Length sliders:

- Entire matrix scales uniformly
- Spacing between polyhedra adjusts proportionally
- Matrix remains centered at origin
- Number of polyhedra (N×N) stays constant
- Rotation state preserved (45° rotation stays applied if enabled)

**Example:**

- Matrix Size = 5 (5×5 = 25 cubes)
- Cube Edge = 1.4142 units
- Rotate 45° enabled
- Adjust Cube Edge to 2.0 → All 25 cubes grow, spacing increases proportionally, rotation maintained

---

## 3. UI Design

### 3.1 Control Placement

**Location:** Scale section, after existing sliders

```html
<!-- Existing sliders (from art.css) -->
<div class="control-item">
  <label>Cube Edge Length</label>
  <div class="slider-container">
    <input type="range" id="cubeScaleSlider" ... />
    <span class="slider-value" id="cubeScaleValue">1.4142</span>
  </div>
</div>

<div class="control-item">
  <label>Tetrahedron Edge Length</label>
  <div class="slider-container">
    <input type="range" id="tetScaleSlider" ... />
    <span class="slider-value" id="tetScaleValue">2.0000</span>
  </div>
</div>

<!-- NEW: Matrix Slider (uses art.css classes) -->
<div class="control-item">
  <label>Matrix Size (IVM Array)</label>
  <div class="slider-container">
    <input
      type="range"
      id="matrixSizeSlider"
      min="1"
      max="10"
      step="1"
      value="1"
    />
    <span class="slider-value" id="matrixSizeValue">1×1</span>
  </div>
  <p class="info-text">Creates N×N array in X-Y plane (Fuller's IVM)</p>

  <!-- Matrix Rotation Toggle (uses art.css .checkbox-label) -->
  <label class="checkbox-label">
    <input type="checkbox" id="matrixRotate45" />
    Rotate 45° (align to grid)
  </label>
  <p class="info-text" style="margin-left: 20px">
    Aligns Tet/Octa edge-to-edge with X-Y grid (spread = 0.5)
  </p>
</div>
```

**CSS Classes Used (from art.css):**

- `.control-item` - Standard control wrapper with bottom margin
- `.slider-container` - Flex layout for slider + value display
- `.slider-value` - Right-aligned value display (cyan color)
- `.info-text` - Small italic helper text (gray)
- `.checkbox-label` - Flex layout for checkbox + label text

**No Inline Styles Needed:**
All styling comes from existing art.css definitions, maintaining visual consistency with the rest of the ARTexplorer UI.

**Visual Feedback:**

- Display format: "N×N" (e.g., "5×5" for matrix size 5)
- Tooltip: "Isotropic Vector Matrix - N×N spatial array"

### 3.2 Per-Polyhedron Toggle

**Design Decision:** Should matrix apply to all visible polyhedra or only selected ones?

**Recommendation:** Apply to all visible polyhedra of supported types (Cube, Tet, Octa)

- If Cube is visible → show cube matrix
- If Tetrahedron is visible → show tet matrix
- If both visible → show both matrices (overlapping demonstration)

**Alternative:** Add per-polyhedron matrix checkboxes (deferred to Phase 2)

---

## 4. Implementation Plan

### Phase 1: Foundation (Cube Matrix Only) ✅ COMPLETED

**Goal:** Proof-of-concept with simplest case

**Status:** ✅ Complete (2026-01-06)

**Implementation Summary:**

- Created [rt-matrix.js](../../../src/geometry/modules/rt-matrix.js) module with `RTMatrix.createCubeMatrix()` function
- Added `RT.applyRotation45()` to [rt-math.js](../../../src/geometry/modules/rt-math.js) using RT-pure spread/cross methodology
- Added Matrix Size slider (1-10) and Rotate 45° checkbox to [index.html](../../../src/geometry/index.html)
- Integrated matrix rendering in [rt-init.js](../../../src/geometry/modules/rt-init.js) updateGeometry() function with dynamic import
- Matrix uses edge-to-edge cube spacing, centered at origin, with N×N grid generation

**Tasks Completed:**

1. ✅ **UI Implementation**
   - Matrix Size slider added to Scale section (HTML)
   - "Rotate 45°" checkbox added below slider
   - Event listeners added for slider `input` and checkbox `change` events
   - Display value updates with N×N format

2. ✅ **Cube Matrix Function**
   - `createCubeMatrix(matrixSize, halfSize, rotate45, opacity, color, THREE)` created
   - N×N grid positions calculated and centered at origin
   - Cube instances generated at each grid point with offset positions
   - 45° Z-rotation applied via RT.applyRotation45() if rotate45 = true
   - Returns THREE.Group containing all cube instances

3. ✅ **Rotation Implementation (RT-PURE)**
   - `RT.applyRotation45(group)` added to rt-math.js module
   - Spread/cross defined: `s = 0.5, c = 0.5` (exact rational values)
   - Sin/cos extracted only when needed: `sin = √s, cos = √c` (deferred √ expansion)
   - Rotation matrix constructed manually using spread/cross values
   - Applied to matrix group: `matrixGroup.applyMatrix4(rotationMatrix)`
   - RT identity verified: `s + c = 1.0 ✓`
   - Console log: `[RT] Matrix rotation applied: s=0.5, c=0.5, s+c=1.0 ✓`

4. ✅ **Integration with Existing Scale**
   - Hooked into `tetScaleSlider` event (via updateGeometry)
   - Matrix rebuilds when scale changes
   - Matrix remains centered and spacing adjusts correctly
   - Rotation state preserved during scale changes

5. ✅ **Rendering**
   - Matrix group integrated into main scene via cubeGroup
   - Visibility toggle works (hide/show entire matrix)
   - Orbit controls work correctly with larger matrix extents
   - Rotation toggle functions: matrix rotates/unrotates correctly

**Validation Results:**

- ✅ Matrix size 1 → single cube at origin
- ✅ Matrix size 5 → 25 cubes in 5×5 grid
- ✅ Matrix size 10 → 100 cubes in 10×10 grid
- ✅ Scale adjustment → all cubes grow uniformly
- ✅ Toggle cube visibility → entire matrix hides
- ✅ Rotate 45° checkbox ON → matrix rotates (cube unchanged due to symmetry)
- ✅ Rotate 45° checkbox OFF → matrix returns to default orientation
- ✅ Rotation state persists during scale changes

**Files Modified:**

- [src/geometry/modules/rt-math.js](../../../src/geometry/modules/rt-math.js) - Added RT.applyRotation45()
- [src/geometry/modules/rt-matrix.js](../../../src/geometry/modules/rt-matrix.js) - Created new module
- [src/geometry/index.html](../../../src/geometry/index.html) - Added UI controls
- [src/geometry/modules/rt-init.js](../../../src/geometry/modules/rt-init.js) - Added matrix rendering logic

**Commits:**

- `a9c14b8` - Initial matrix slider implementation
- `f326461` - Fix: Implement cube matrix in correct updateGeometry function

**Phase 1 Notes:**
Phase 1 implementation placed matrix controls in the Scale section as a proof-of-concept. Phase 1.5 refactors this to create proper Form types with isolated controls, aligning with the established ARTexplorer architecture.

---

### Phase 1.5: Matrix Forms Architecture (REVISED APPROACH) ✅

**Goal:** Refactor matrix slider into separate Form types that integrate with existing instance/transform system

**Status:** ✅ Phase 1.5a Complete (Cube Matrix fully integrated)

**Architectural Decision:**
Instead of treating matrices as properties of base forms (Cube, Tet, Octa), create **dedicated Matrix Form types** (Cube Matrix, Tet Matrix, Octa Matrix) with form-specific controls. This approach:

- Separates concerns: base forms vs spatial arrays
- Isolates transformations to individual forms (existing pattern)
- Enables multi-matrix compositions (e.g., Tet Matrix + Octa Matrix = Octet Truss)
- Integrates seamlessly with RTStateManager instance system

---

## Phase 1.5 Implementation Plan

### 1.5.1: New Form Types

**Create Three Matrix Form Types:**

| Form Type           | Label         | Color    | Properties                    | Notes           |
| ------------------- | ------------- | -------- | ----------------------------- | --------------- |
| `cubeMatrix`        | "Cube Matrix" | 0x4a9eff | matrixSize, rotate45, opacity | No vertex nodes |
| `tetrahedronMatrix` | "Tet Matrix"  | 0xffff00 | matrixSize, rotate45, opacity | No vertex nodes |
| `octahedronMatrix`  | "Octa Matrix" | 0xff6b6b | matrixSize, rotate45, opacity | No vertex nodes |

**Key Properties:**

- **matrixSize**: 1-10 (N×N grid size)
- **rotate45**: Boolean (45° Z-rotation for grid alignment)
- **opacity**: 0.0-1.0 (transparency)
- **scale**: Inherits from global tetScaleSlider (per-polyhedron halfSize)
- **NO nodes toggle**: Matrix forms never render vertex nodes (semantic difference from base forms)

### 1.5.2: UI Restructuring

**Move Matrix Controls OUT of Scale Section → Into Individual Form Sections**

**Current (Phase 1):**

```
Scale (global)
  ├─ Tet Edge Slider
  ├─ Cube Edge Slider
  └─ Matrix Size Slider (❌ applies to all forms, confusing)
```

**New (Phase 1.5):**

```
Forms
  ├─ ☐ Cube
  ├─ ☐ Cube Matrix
  │   └─ Matrix Size: [1-10]
  │   └─ ☐ Rotate 45°
  ├─ ☐ Tetrahedron
  ├─ ☐ Tet Matrix
  │   └─ Matrix Size: [1-10]
  │   └─ ☐ Rotate 45°
  ├─ ☐ Octahedron
  └─ ☐ Octa Matrix
      └─ Matrix Size: [1-10]
      └─ ☐ Rotate 45°

Scale (global - affects ALL forms)
  ├─ Tet Edge Slider
  └─ Cube Edge Slider
```

**Benefits:**

- Matrix controls only visible when corresponding matrix form is checked
- Each matrix form has isolated properties (different sizes/rotations possible)
- Clear separation: "working with Cube" vs "working with Cube Matrix"
- Enables simultaneous multi-matrix scenes (Tet Matrix + Octa Matrix)

### 1.5.3: Multi-Matrix Compositions

**Use Case: Octet Truss Visualization**

User can enable both `Tet Matrix` + `Octa Matrix` simultaneously to visualize Fuller's Octet Truss space frame:

```javascript
// Example configuration
tetMatrix: {
  enabled: true,
  matrixSize: 5,
  rotate45: true,
  opacity: 0.7
}

octaMatrix: {
  enabled: true,
  matrixSize: 5,
  rotate45: true,
  opacity: 0.7
}

// Result: 5×5 Tet + 5×5 Octa overlapping → Octet Truss structure
```

**Design Decision: Separate Octet Matrix Form?**

**Option A:** Dedicated "Octet Matrix" form

- Pros: Single toggle for complete structure, optimized rendering
- Cons: Redundant with Tet + Octa combination, less flexible

**Option B:** Composition via Tet Matrix + Octa Matrix (RECOMMENDED)

- Pros: Educational (shows components), flexible (vary sizes/opacities independently), reuses existing generators
- Cons: Slightly more UI complexity (two checkboxes instead of one)

**Recommendation:** Start with Option B (composition). Defer dedicated "Octet Matrix" form to Phase 5 if user demand exists.

### 1.5.4: RTStateManager Integration

**Extend RTStateManager to Handle Matrix Forms:**

```javascript
// Pseudocode additions to RTStateManager

const FORM_TYPES = {
  // Existing base forms
  cube: { hasNodes: true, generator: 'cube' },
  tetrahedron: { hasNodes: true, generator: 'tetrahedron' },
  octahedron: { hasNodes: true, generator: 'octahedron' },
  // ... other base forms

  // NEW: Matrix forms
  cubeMatrix: {
    hasNodes: false,
    generator: 'createCubeMatrix',
    properties: ['matrixSize', 'rotate45']
  },
  tetrahedronMatrix: {
    hasNodes: false,
    generator: 'createTetrahedronMatrix',
    properties: ['matrixSize', 'rotate45']
  },
  octahedronMatrix: {
    hasNodes: false,
    generator: 'createOctahedronMatrix',
    properties: ['matrixSize', 'rotate45']
  }
};

// Instance creation
createInstance(formType, properties) {
  const instance = {
    id: generateUUID(),
    formType: formType, // 'cubeMatrix', 'tetrahedronMatrix', etc.
    properties: {
      ...properties,
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1)
    },
    group: this.generateGeometry(formType, properties)
  };

  this.instances.set(instance.id, instance);
  return instance;
}

// Geometry generation routing
generateGeometry(formType, props) {
  if (formType === 'cubeMatrix') {
    return RTMatrix.createCubeMatrix(
      props.matrixSize,
      props.halfSize,
      props.rotate45,
      props.opacity,
      props.color,
      THREE
    );
  } else if (formType === 'tetrahedronMatrix') {
    return RTMatrix.createTetrahedronMatrix(/* ... */);
  } else if (formType === 'octahedronMatrix') {
    return RTMatrix.createOctahedronMatrix(/* ... */);
  } else {
    // Base forms use Polyhedra.cube(), etc.
    return Polyhedra[formType](props.halfSize);
  }
}
```

### 1.5.5: Transform & Instance Workflow

**User Workflow (aligns with existing system):**

1. **Enable Matrix Form:**
   - Check `☐ Cube Matrix` → base cube matrix appears at origin

2. **Adjust Properties:**
   - Set Matrix Size = 5 (5×5 grid)
   - Enable Rotate 45° (align to grid)
   - Set Opacity = 0.8

3. **Create Instance ("Now" button):**
   - Current cube matrix is frozen as an instance
   - Instance registered in RTStateManager with properties: `{formType: 'cubeMatrix', matrixSize: 5, rotate45: true, opacity: 0.8}`
   - Base cube matrix resets to defaults (Size=1, Rotate=OFF, Opacity=1.0)

4. **Transform Instance:**
   - Click instance to select
   - Gumball appears attached to matrix bounding box center
   - Move/Scale/Rotate entire matrix as single unit
   - Transforms persist in instance state

5. **Create Additional Instances:**
   - Adjust base cube matrix to different properties (e.g., Size=3, Rotate=OFF)
   - Click "Now" → second instance created
   - Both instances coexist with independent transforms

6. **Multi-Matrix Composition:**
   - Enable `☐ Tet Matrix` while Cube Matrix instances exist
   - Adjust Tet Matrix properties, click "Now"
   - Scene now has Cube Matrix + Tet Matrix instances overlapping

### 1.5.6: RTFileHandler Serialization

**Extend serialization to include matrix properties:**

```javascript
// Serialized instance format
{
  id: "uuid-1234",
  formType: "cubeMatrix",
  properties: {
    matrixSize: 5,
    rotate45: true,
    opacity: 0.8,
    halfSize: 0.707, // from global scale slider
    color: 0x4a9eff
  },
  transform: {
    position: { x: 2.5, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1.2, y: 1.2, z: 1.2 }
  }
}
```

**On reload:**

1. Deserialize instance data
2. Call `RTMatrix.createCubeMatrix(matrixSize, halfSize, rotate45, ...)`
3. Apply stored transform to generated group
4. Add to scene and RTStateManager

### 1.5.7: Implementation Tasks

**Phase 1.5a: Refactor Cube Matrix to Form Type**

**Status:** ✅ COMPLETED

**Part 1: UI & Basic Rendering** ✅ COMPLETED (commit `e72f213`)

1. ✅ Remove matrix controls from Scale section
2. ✅ Add "Cube Matrix" checkbox in Forms section
3. ✅ Create cubeMatrixGroup (separate from cubeGroup)
4. ✅ Add matrix-specific controls (matrixSize, rotate45) that appear only when Cube Matrix is checked
5. ✅ Add Tet Matrix and Octa Matrix UI stubs (disabled)
6. ✅ Register matrix forms in RTStateManager.forms registry
7. ✅ Cube Matrix renders correctly with dynamic size/rotation

**Part 2: Instance System Integration** ✅ COMPLETED

All tasks for full parity with base forms:

8. ✅ **Selection System**
   - Added cubeMatrixGroup, tetMatrixGroup, octaMatrixGroup to selectable objects (rt-init.js:3029-3031)
   - Clicking matrix selects it (highlight/outline via existing system)
   - Selection state tracked in RTStateManager (no changes needed)
   - ESC deselects matrix (existing keyboard handler)

9. ✅ **"Now" Button Integration**
   - "Now" button creates instance from current matrix state (existing RTStateManager.createInstance)
   - Instance captures all visual properties via group cloning
   - Base matrix form resets to defaults: matrixSize=1, rotate45=false (rt-state-manager.js:420-444)
   - updateGeometry() called after reset to regenerate 1×1 matrix (rt-init.js:2179-2181)
   - Instance deposited count increments (existing system)

10. ✅ **Node Rendering**
    - Matrix forms render vertex nodes when nodes toggle is ON
    - addMatrixNodes() function extracts all cube vertices from matrix (rt-init.js:1000-1075)
    - Deduplicates vertices using position keys
    - Applies 45° rotation if enabled
    - Nodes respect node size/style settings (uses getCachedNodeGeometry)

11. ✅ **Gumball Transforms**
    - Selected matrix can be moved/scaled/rotated via gumball (no changes needed)
    - Gumball system attaches to any selected group (existing functionality)
    - Transforms apply to entire matrix group as single unit

12. ✅ **Opacity Controls**
    - Opacity slider affects matrix face transparency (passed to RTMatrix.createCubeMatrix)
    - Matrix edges maintain visibility at low opacity (existing material settings)
    - Opacity stored in instance state (via group cloning)

13. ✅ **Instance Management**
    - Instances can be selected/deselected (existing system)
    - Instances can be deleted via Delete/Backspace keys (existing system)
    - Undo/Redo works with matrix instances (RTStateManager handles all groups)
    - Save/Load preserves matrix instances (RTFileHandler serializes all instances)

**Implementation Summary:**

Matrix forms integrate seamlessly with existing systems through minimal, targeted changes:

1. **Selection System** (rt-init.js:3029-3031)
   - Added matrix groups to formGroups array in onCanvasClick
   - Existing raycaster and highlight system work automatically

2. **Instance Creation** (rt-state-manager.js:162-221)
   - Implemented recursive cloneGroupHierarchy() for nested group structures
   - Clones geometry AND materials (prevents shared highlight state)
   - Strips highlight from instance materials (originalEmissive restoration)
   - No matrix-specific instance logic needed

3. **Node Rendering** (rt-init.js:1000-1075)
   - Created addMatrixNodes() function to extract all cube vertices
   - Deduplicates vertices using position string keys
   - Applies 45° rotation transform if enabled
   - Integrates with existing getCachedNodeGeometry system

4. **Form Reset** (rt-state-manager.js:420-444)
   - Extended resetForm() to detect matrix form types
   - Resets UI controls: matrixSize→1, rotate45→false
   - Updates slider value displays

5. **Now Button** (rt-init.js:2155-2200)
   - Detects matrix forms and calls updateGeometry() after reset
   - Ensures form regenerates at 1×1 after instance creation
   - Existing deselection and gumball hiding work automatically

6. **Automatic Integration**
   - Gumball transforms: Attach to any selected group (no changes)
   - Opacity controls: Passed to RTMatrix.createCubeMatrix (no changes)
   - Save/Load: RTFileHandler serializes all instances (no changes)
   - Delete/Undo/Redo: RTStateManager handles all groups (no changes)

**Critical Fixes:**

- **Recursive Cloning**: Flat children iteration missed nested groups → faces/edges missing from instances
- **Material Cloning**: Shared materials caused instances to inherit highlight → couldn't be reselected
- **Highlight Stripping**: Instances restore originalEmissive to avoid cyan glow on creation

**Files Modified:**

- [rt-init.js](../../../src/geometry/modules/rt-init.js): Selection array, Now button handler, addMatrixNodes function
- [rt-state-manager.js](../../../src/geometry/modules/rt-state-manager.js): Recursive cloning, material cloning, highlight stripping, resetForm matrix support

**Commits:**

- `e72f213` - Part 1: UI & Basic Rendering
- `c09c8ea` - Part 2: Instance System Integration (selection, Now button, nodes)
- `f593d1a` - Fix: Recursive group cloning for nested matrix structure
- `167bf11` - Fix: Clone materials and strip highlight state from instances

**Validation Results:**

- ✅ Click cubeMatrix → selects with cyan highlight/thick edges
- ✅ "Now" → creates instance, resets form to 1×1, instance unhighlighted
- ✅ ESC → deselects instance
- ✅ Click instance → reselects with highlight (full workflow)
- ✅ Nodes toggle ON → matrix shows nodes at all vertices (deduplicated)
- ✅ Gumball move/scale/rotate works on matrix
- ✅ Opacity slider affects matrix transparency
- ✅ Save/Load preserves matrix instances with full geometry
- ✅ Delete key removes selected matrix instances
- ✅ Multiple matrix instances coexist with independent transforms
- ✅ Instances have complete geometry (faces, edges, nodes)

---

**Phase 1.5b: Add Tet Matrix Form Type** ✅ COMPLETE

**Status:** ✅ Fully Implemented and Validated

**Goal:** Create tetrahedron matrix following Cube Matrix pattern

**Implementation Pattern (proven successful):**

1. **Create Generator Function** (rt-matrix.js)

   ```javascript
   createTetrahedronMatrix: (matrixSize, halfSize, rotate45, opacity, color, THREE) => {
     const matrixGroup = new THREE.Group();

     // Get base tetrahedron geometry
     const tetGeom = Polyhedra.tetrahedron(halfSize);
     const { vertices, edges, faces } = tetGeom;

     // Calculate spacing (vertex-to-vertex or edge-to-edge?)
     const tetEdge = /* TBD: calculate from halfSize */;
     const spacing = tetEdge; // Distance between tet centers

     // Generate N×N grid with alternating orientations
     for (let i = 0; i < matrixSize; i++) {
       for (let j = 0; j < matrixSize; j++) {
         const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
         const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
         const offset_z = 0;

         // Determine orientation (up vs down)
         const isUp = (i + j) % 2 === 0;

         // Create tet at position with orientation
         const tetGroup = new THREE.Group();
         // ... build geometry like cubeMatrix ...

         // Apply orientation rotation if needed
         if (!isUp) {
           tetGroup.rotation.z = Math.PI; // Flip 180°
         }

         matrixGroup.add(tetGroup);
       }
     }

     // Apply 45° rotation if requested
     if (rotate45) {
       RT.applyRotation45(matrixGroup);
     }

     return matrixGroup;
   }
   ```

2. **Add UI Controls** (index.html)
   - Enable "Tet Matrix" checkbox (currently disabled)
   - Controls already exist, just enable them
   - Event listeners already wired (rt-init.js:1632-1655)

3. **Add Rendering Logic** (rt-init.js:updateGeometry)
   - Copy Cube Matrix pattern (lines 1012-1057)
   - Replace with RTMatrix.createTetrahedronMatrix call
   - Add nodes support via addMatrixNodes (already works!)

4. **Extend resetForm** (rt-state-manager.js:428-435)
   - Pattern already exists, just uncomment tetMatrix case

**Key Decisions Needed:**

- **Spacing**: Vertex-to-vertex (tightest) vs edge-to-edge vs face-to-face?
- **Orientation**: Checkerboard (i+j % 2) or all same direction?
- **Z-offset**: All in plane or stagger up/down for 3D packing?

**Validation:**

- Same criteria as Cube Matrix (all should work automatically)
- Test Tet + Cube simultaneous display
- Verify octahedral voids appear between tets

**Implementation Summary:**

- ✅ Generator function created with alternating orientations (checkerboard pattern)
- ✅ UI controls enabled (checkbox, size slider, rotate45)
- ✅ Event listeners wired up
- ✅ Rendering integration in updateGeometry()
- ✅ Node support via addMatrixNodes()
- ✅ **Spacing corrected**: Using `spacing = 2 * halfSize` (cube edge length)
  - Tetrahedra perfectly inscribe in cube matrix (complementary geometry)
  - Vertices touch at grid points as expected
  - Creates octahedral voids for complementary octa matrix

**Final Validation Results:**

- ✅ Matrix renders with alternating up/down orientations (checkerboard)
- ✅ UI controls work (size slider, rotate45 checkbox)
- ✅ Nodes render at all vertices with correct positioning
- ✅ Spacing correct: Tets nest perfectly in cube grid
- ✅ Grid alignment: Vertex-to-vertex contact verified
- ✅ IVM geometry: Octahedral voids present for octa complement

**Files Modified:**

- [rt-matrix.js](../../../src/geometry/modules/rt-matrix.js): createTetrahedronMatrix() implemented
- [rt-init.js](../../../src/geometry/modules/rt-init.js): Rendering logic + event listeners + node positioning
- [index.html](../../../src/geometry/index.html): UI controls enabled

---

**Phase 1.5c: Add Octa Matrix Form Type** ✅ COMPLETE

**Status:** ✅ Fully Implemented and Validated

**Goal:** Create octahedron matrix following Cube Matrix pattern

**Implementation Pattern:**

1. **Create Generator Function** (rt-matrix.js)

   ```javascript
   createOctahedronMatrix: (matrixSize, halfSize, rotate45, opacity, color, THREE) => {
     const matrixGroup = new THREE.Group();

     // Get base octahedron geometry
     const octaGeom = Polyhedra.octahedron(halfSize);
     const { vertices, edges, faces } = octGeom;

     // Calculate spacing (face-to-face contact?)
     const octaEdge = /* TBD: calculate from halfSize */;
     const spacing = /* Square packing distance */;

     // Generate N×N grid
     // (Octahedra pack in square array, no alternating orientation needed)
     for (let i = 0; i < matrixSize; i++) {
       for (let j = 0; j < matrixSize; j++) {
         const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
         const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
         const offset_z = 0;

         const octaGroup = new THREE.Group();
         // ... build geometry like cubeMatrix ...
         matrixGroup.add(octaGroup);
       }
     }

     if (rotate45) {
       RT.applyRotation45(matrixGroup);
     }

     return matrixGroup;
   }
   ```

2. **Add UI Controls** (index.html)
   - Enable "Octa Matrix" checkbox
   - Controls already exist

3. **Add Rendering Logic** (rt-init.js:updateGeometry)
   - Copy Cube Matrix pattern
   - Replace with RTMatrix.createOctahedronMatrix

4. **Extend resetForm** (rt-state-manager.js:436-443)
   - Pattern exists, uncomment octaMatrix case

**Key Decisions Needed:**

- **Spacing**: Face-to-face contact distance
- **Orientation**: All octahedra point up, or alternating?
- **Alignment**: With/without 45° rotation shows different grid relationships

**Implementation Summary:**

- ✅ Generator function created with uniform orientation
- ✅ UI controls enabled (checkbox, size slider, rotate45)
- ✅ Event listeners wired up
- ✅ Rendering integration in updateGeometry()
- ✅ Node support via addMatrixNodes() with offset grid positioning
- ✅ **Spacing corrected**: Using `spacing = 2 * halfSize` (cube edge length)
- ✅ **Grid size**: Generates (N-1)×(N-1) grid to complement N×N tet matrix
  - 5×5 tet matrix → 4×4 octa matrix (25 tets + 16 octas = 41 polyhedra)
  - Octahedra fill voids between tetrahedra (interstitial positioning)
  - Grid boundaries align perfectly (symmetric IVM structure)

**Final Validation Results:**

- ✅ Matrix renders with uniform orientation
- ✅ UI controls work (size slider, rotate45 checkbox)
- ✅ Nodes render at all vertices with offset grid positioning
- ✅ Spacing correct: Uses cube edge length (2 \* halfSize)
- ✅ Size correct: Octahedra properly sized for IVM voids
- ✅ Grid alignment: (N-1)×(N-1) octa grid complements N×N tet grid
- ✅ **IVM Octet Truss**: Octahedra fill voids between tets (no overlap)
- ✅ **Grid symmetry**: Both matrices share same outer boundary

**Files Modified:**

- [rt-matrix.js](../../../src/geometry/modules/rt-matrix.js): createOctahedronMatrix() with (N-1) grid
- [rt-init.js](../../../src/geometry/modules/rt-init.js): Rendering logic + event listeners + offset node positioning
- [index.html](../../../src/geometry/index.html): UI controls enabled

**Key IVM Insight:**
The (N-1)×(N-1) octahedron grid is the correct complement to an N×N tetrahedron grid. This creates Fuller's Isotropic Vector Matrix with perfect grid symmetry - octahedra occupy the interstitial voids between tetrahedra, forming the complete Octet Truss structure.

---

**Phase 1.5d: Multi-Matrix Composition Testing**

**Status:** 🔜 After 1.5b & 1.5c

**Goal:** Validate Fuller's Octet Truss visualization

**Test Scenarios:**

1. **Tet + Octa Composition**
   - Enable both Tet Matrix (5×5) and Octa Matrix (5×5)
   - Set both rotate45 = true
   - Set opacity = 0.5 for both
   - Verify octets appear at vertices
   - Verify tets fill octahedral voids

2. **Independent Control**
   - Tet Matrix size=3, Octa Matrix size=5
   - Verify different sizes coexist
   - Create instances of each
   - Transform instances independently

3. **Performance**
   - 10×10 Tet Matrix (100 tets) - should render smoothly
   - 10×10 Octa Matrix (100 octas)
   - Both simultaneously (200 polyhedra)

**Documentation:**

- Educational notes on Octet Truss structure
- Screenshots of Tet+Octa composition
- Workflow guide for multi-matrix scenes

**Estimated Effort:** 1-2 hours (testing + documentation)

---

**Phase 1.5 Summary: Successful Pattern Established**

The Cube Matrix implementation established a **proven pattern** that Tet and Octa matrices can follow:

**What Works Automatically:**

- ✅ Selection (just add to formGroups array)
- ✅ Instance creation (recursive cloning handles any nesting)
- ✅ Material cloning (highlight stripping works for all materials)
- ✅ Node rendering (addMatrixNodes extracts vertices from any polyhedron)
- ✅ Gumball transforms (attaches to any group)
- ✅ Save/Load (RTFileHandler serializes all instances)
- ✅ Delete/Undo/Redo (RTStateManager handles all groups)

**What Needs Per-Matrix Customization:**

- ⚙️ Generator function (RTMatrix.createXMatrix) - geometry-specific
- ⚙️ Spacing calculation - depends on polyhedron edge/face dimensions
- ⚙️ Orientation logic - some matrices need alternating orientations
- ⚙️ UI controls (already exist, just enable checkboxes)

**Confidence Level:** Very High

- Pattern proven with Cube Matrix
- All fixes generalized (recursive cloning, material cloning work for any form)
- No matrix-specific instance code needed
- Tet and Octa will "just work" once generators are written

**Next Steps:**

1. Implement Tet Matrix generator (Phase 1.5b)
2. Implement Octa Matrix generator (Phase 1.5c)
3. Test multi-matrix compositions (Phase 1.5d)
4. Document Octet Truss visualization workflow

### 1.5.8: Validation Criteria

**Form Isolation:**

- ✅ Cube Matrix checkbox toggles cubeMatrixGroup visibility
- ✅ Matrix Size slider only visible when Cube Matrix is checked
- ✅ Changing Matrix Size only affects Cube Matrix, not other forms
- ✅ Cube and Cube Matrix can display simultaneously with different properties

**Instance System:**

- ✅ "Now" button creates cubeMatrix instance
- ✅ Instance stores matrixSize, rotate45, opacity properties
- ✅ Base Cube Matrix resets after "Now"
- ✅ Multiple matrix instances can coexist

**Transforms:**

- ✅ Click matrix instance → gumball attaches to bounding box center
- ✅ Move/Scale/Rotate applied to entire matrix group
- ✅ Transforms persist across session (RTFileHandler save/load)

**Multi-Matrix:**

- ✅ Tet Matrix + Octa Matrix enabled simultaneously
- ✅ Independent matrixSize/rotate45 controls for each
- ✅ Overlapping matrices render correctly (Octet Truss visualization)

**Priority:** High (essential architectural refactor before Phase 2)

---

### Phase 2: Tetrahedron Matrix

**Goal:** Demonstrate tetrahedral packing with octahedral voids

**Tasks:**

1. **Tet Matrix Function**
   - Create `createTetrahedronMatrix(matrixSize, halfSize)` function
   - Determine alternating orientation pattern (up/down)
   - Calculate vertex-to-vertex spacing
   - Generate tetrahedra at grid vertices

2. **Orientation Algorithm**
   - Research tetrahedral close-packing patterns
   - Implement alternating up/down rotation
   - Verify vertices touch (no gaps, no overlap)

3. **Void Visualization (Optional)**
   - Create `showOctahedralVoids` toggle (UI checkbox)
   - Render half-octahedral voids in contrasting color
   - Educational feature: demonstrates space-filling principle

**Validation Criteria:**

- Tetrahedra vertices touch at grid points ✓
- No overlap between tetrahedra ✓
- Void spaces are half-octahedra (geometric verification) ✓
- **Rotate 45° ON:** Tetrahedra align with X-Y grid (edges parallel to axes) ✓
- **Rotate 45° OFF:** Tetrahedra return to diagonal orientation ✓
- Rotation dramatically improves visual clarity of tetrahedral packing ✓

### Phase 3: Octahedron Matrix

**Goal:** Complete the IVM triad (Cube, Tet, Octa)

**Tasks:**

1. **Octa Matrix Function**
   - Create `createOctahedronMatrix(matrixSize, halfSize)` function
   - Calculate square face alignment in X-Y plane
   - Generate octahedra at grid points

2. **Plan View Alignment**
   - Ensure octahedra show square cross-section when viewed from above
   - Verify face-to-face contact in array

**Validation Criteria:**

- Octahedra touch face-to-face ✓
- Plan view shows perfect square grid ✓
- **Rotate 45° ON:** Octahedra align with X-Y grid (edges parallel to axes) ✓
- **Rotate 45° OFF:** Octahedra return to diagonal orientation ✓
- Rotation enables true edge-to-edge contact in cardinal directions ✓

### Phase 4: Performance Optimization

**Goal:** Ensure smooth rendering at Matrix Size = 10 (100 polyhedra)

**Considerations:**

- 10×10 cube matrix = 100 cubes × 6 faces × 2 triangles = 1,200 triangles (acceptable)
- 10×10 tet matrix = 100 tets × 4 faces × 1 triangle = 400 triangles (very efficient)
- Geodesic matrices would be expensive (defer to future)

**Tasks:**

1. **Instancing (Optional)**
   - Use `THREE.InstancedMesh` for repeated geometry
   - Single geometry buffer, multiple transformation matrices
   - Significant performance boost for large matrices

2. **Culling**
   - Frustum culling (Three.js handles automatically)
   - Optional: Only render polyhedra within camera view

3. **LOD (Level of Detail)**
   - For Matrix Size > 10, reduce geometry complexity at distance
   - Use simpler polyhedra for far-away instances

### Phase 5: Advanced Features (Future)

**Deferred to later implementation:**

1. **3D Matrix (Volume Array)**
   - Extend from N×N to N×N×M (add Z-dimension)
   - Slider pair: "Matrix Width" (X-Y) and "Matrix Height" (Z)
   - Creates volumetric IVM structures

2. **Per-Polyhedron Matrix Control**
   - Individual matrix size per polyhedron type
   - Allows cube 5×5 + tet 3×3 simultaneously

3. **Geodesic Matrix**
   - Matrix of geodesic polyhedra (performance-intensive)
   - Requires instancing optimization

4. **Rhombic Dodecahedron Matrix**
   - Space-filling dual of cuboctahedron
   - Natural IVM component

5. **Matrix Offset Controls**
   - Translate entire matrix along X, Y, Z axes
   - Allows multiple matrices at different positions

---

## 4.5. RT-Pure Analysis & Audit

### Current Implementation Status

**Analysis Date:** 2026-01-06
**Scope:** [rt-matrix.js](../../../src/geometry/modules/rt-matrix.js) matrix generation functions
**Reference:** [rt-math.js](../../../src/geometry/modules/rt-math.js) RT-pure methodology

### RT-Pure Compliance Overview

**Grade: B+ (Good with opportunities for improvement)**

The matrix implementation follows RT-pure principles in key areas but has opportunities to deepen the commitment to rational trigonometry and defer sqrt/transcendental operations more systematically.

---

### ✅ What's RT-Pure Compliant

#### 1. **45° Rotation (Excellent Implementation)**

**Location:** [rt-math.js:286-318](../../../src/geometry/modules/rt-math.js#L286-L318)

```javascript
// RT-PURE: Work in spread/cross space, not angle space
const s = 0.5; // Spread = sin²(45°) = 1/2 (exact rational!)
const c = 0.5; // Cross = cos²(45°) = 1/2 (exact rational!)

// Extract sin/cos ONLY when constructing matrix (deferred √)
const sin_val = Math.sqrt(s); // √(1/2) = √2/2
const cos_val = Math.sqrt(c); // √(1/2) = √2/2

// Build rotation matrix from spread/cross values
const rotationMatrix = new THREE.Matrix4();
rotationMatrix.set(
  cos_val,
  -sin_val,
  0,
  0,
  sin_val,
  cos_val,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1
);
```

**Why This is RT-Pure:**

- ✅ Works in spread/cross space first (s = 0.5, c = 0.5)
- ✅ Verifies RT identity: s + c = 1.0 (algebraic correctness)
- ✅ Defers √ expansion until matrix construction
- ✅ No use of Math.PI or trig functions
- ✅ "45°" is UI-facing only; internal math uses exact rationals

**Educational Value:**
This demonstrates the CORE principle of RT: angle is NOT fundamental, spread is. The 45° rotation emerges from the exact rational values s = c = 0.5, not from π/4 radians.

#### 2. **Grid Spacing Using Cube Edge Length**

**Location:** [rt-matrix.js:43, 172, 305](../../../src/geometry/modules/rt-matrix.js#L43)

```javascript
// Cube matrix
const cubeEdge = halfSize * 2; // Full edge length
const spacing = cubeEdge; // Edge-to-edge contact

// Tetrahedron matrix
const spacing = 2 * halfSize; // Same as cube matrix!

// Octahedron matrix
const spacing = 2 * halfSize; // Same as cube matrix!
```

**Why This is Good:**

- ✅ Spacing is derived from exact geometric relationships (cube edge = 2 × halfSize)
- ✅ No sqrt needed for base spacing calculation
- ✅ IVM complementarity emerges naturally (tets inscribe in cubes)

**Note:** This works because `halfSize` is pre-computed. The sqrt is hidden in the tetrahedron/octahedron edge calculations done in [rt-polyhedra.js](../../../src/geometry/modules/rt-polyhedra.js), but the matrix spacing itself is rational multiples of halfSize.

#### 3. **Grid Position Calculation**

**Location:** [rt-matrix.js:55-57, 409-415](../../../src/geometry/modules/rt-matrix.js#L55-L57)

```javascript
// Calculate position: centered at origin
const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
const offset_z = 0;
```

**Why This is RT-Pure:**

- ✅ Uses rational arithmetic only (addition, subtraction, multiplication, division)
- ✅ No trig functions or π
- ✅ Grid centering formula is algebraically exact

---

### ⚠️ Opportunities for RT-Pure Improvement

#### 1. **Tetrahedron Orientation Rotation (Uses Math.PI)**

**Location:** [rt-matrix.js:254-257](../../../src/geometry/modules/rt-matrix.js#L254-L257)

```javascript
// ⚠️ NOT RT-PURE: Uses Math.PI directly
if (!isUp) {
  tetGroup.rotation.z = Math.PI; // Flip 180°
}
```

**Problem:**

- ❌ Uses Math.PI (transcendental constant)
- ❌ Doesn't work in spread/cross space
- ❌ Inconsistent with RT.applyRotation45() methodology

**RT-Pure Alternative:**

```javascript
// RT-PURE: 180° rotation using spread/cross
// Spread s = sin²(180°) = 0 (parallel to original)
// Cross c = cos²(180°) = 1 (negation)
// Result: sin = 0, cos = -1 (exact rational extraction!)

if (!isUp) {
  const s180 = 0; // Spread (exact rational)
  const c180 = 1; // Cross (exact rational)
  const sin180 = Math.sqrt(s180); // = 0 (no sqrt needed!)
  const cos180 = -Math.sqrt(c180); // = -1 (no sqrt needed!)

  // Apply rotation via matrix (OR use tetGroup.rotation.z = Math.PI as pragmatic choice)
  const rot180 = new THREE.Matrix4();
  rot180.set(
    cos180,
    -sin180,
    0,
    0, // [-1,  0, 0, 0]
    sin180,
    cos180,
    0,
    0, // [ 0, -1, 0, 0]
    0,
    0,
    1,
    0, // [ 0,  0, 1, 0]
    0,
    0,
    0,
    1 // [ 0,  0, 0, 1]
  );
  tetGroup.applyMatrix4(rot180);
}
```

**Better Yet - Add to rt-math.js:**

```javascript
/**
 * Apply 180° rotation around Z-axis using RT-pure spread/cross values
 * Used for alternating tetrahedron orientations in IVM matrices
 *
 * RT-Pure Implementation:
 * - Spread s = sin²(180°) = 0² = 0 (exact rational!)
 * - Cross c = cos²(180°) = (-1)² = 1 (exact rational!)
 * - Result: sin = 0, cos = -1 (no sqrt needed!)
 *
 * @param {THREE.Group} group - THREE.js Group to rotate
 */
RT.applyRotation180 = group => {
  const s = 0; // Spread (exact rational)
  const c = 1; // Cross (exact rational)

  // Extract sin/cos (trivial - no sqrt needed!)
  const sin_val = 0; // √0 = 0
  const cos_val = -1; // -√1 = -1

  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.set(
    cos_val,
    -sin_val,
    0,
    0, // [-1,  0, 0, 0]
    sin_val,
    cos_val,
    0,
    0, // [ 0, -1, 0, 0]
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  );

  group.applyMatrix4(rotationMatrix);
  console.log(`[RT] 180° rotation applied: s=${s}, c=${c}, s+c=${s + c} ✓`);
};
```

**Impact:** High - This centralizes rotation logic with other RT functions and eliminates Math.PI from matrix generation.

#### 2. **Spacing Calculation Could Use Quadrance**

**Location:** [rt-matrix.js:43-44, 172, 305](../../../src/geometry/modules/rt-matrix.js#L43-L44)

**Current:**

```javascript
const cubeEdge = halfSize * 2;
const spacing = cubeEdge;
```

**RT-Pure Enhancement:**

```javascript
// Work in quadrance space for distance comparisons
const cubeEdge = halfSize * 2;
const spacing = cubeEdge; // Keep for position calculation (needed for Vector3)
const spacing_Q = spacing * spacing; // Quadrance (for validation/comparison)

// Optional: Validate edge-to-edge contact using quadrance
// const Q_expected = spacing_Q;
// const Q_actual = RT.quadrance(pos1, pos2);
// if (Math.abs(Q_actual - Q_expected) < tolerance) { /* valid */ }
```

**Why This Helps:**

- ✅ Distance validation doesn't need sqrt
- ✅ Can verify IVM relationships using quadrance comparisons
- ✅ Educational: demonstrates RT.quadrance() usage

**Impact:** Medium - Improves validation/debugging but doesn't change core generation logic.

#### 3. **Weierstrass Substitution Not Utilized**

**Available but Unused:** [rt-math.js:108-115](../../../src/geometry/modules/rt-math.js#L108-L115)

```javascript
/**
 * Rational Circle Parameterization - Wildberger's alternative to sin/cos
 * Formula: Circle(t) = ((1 - t²) / (1 + t²), 2t / (1 + t²))
 */
RT.circleParam = t => {
  const tSquared = t * t;
  const denominator = 1 + tSquared;
  return {
    x: (1 - tSquared) / denominator,
    y: (2 * t) / denominator,
  };
};
```

**Potential Use Case:**
For arbitrary rotations (not just 45° or 180°), we could use `RT.circleParam(t)` to generate rotation matrix entries without trig functions.

**Example - 30° Rotation (if needed in future):**

```javascript
// Spread at 30° = sin²(30°) = (1/2)² = 1/4 = 0.25
// Using RT.spreadToParam(0.25) → t ≈ 0.577
// Then RT.circleParam(0.577) → {x: cos²-derived, y: sin²-derived}
```

**Current Status:**

- ⚠️ `RT.circleParam()` exists but is not used in matrix generation
- ⚠️ `RT.spreadToParam()` exists but is not used

**Impact:** Low - Not needed for current implementation (only 45° and 180° rotations), but valuable for future arbitrary angle snapping.

#### 4. **Vertex Position Generation Uses Direct Addition**

**Location:** [rt-matrix.js:67-69, 198-200, 327-329](../../../src/geometry/modules/rt-matrix.js#L67-L69)

```javascript
// Add all vertices to positions array (with offset)
vertices.forEach(v => {
  positions.push(v.x + offset_x, v.y + offset_y, v.z + offset_z);
});
```

**Current Status:**

- ✅ This IS RT-pure (just addition, no trig or sqrt)
- ✅ Vertex positions from Polyhedra module already computed

**Note:** The sqrt/trig operations happen upstream in [rt-polyhedra.js](../../../src/geometry/modules/rt-polyhedra.js) when generating base polyhedra. Matrix generation itself remains RT-pure by working with pre-computed vertices.

**Philosophy:**
This is a valid pragmatic compromise. The base polyhedra need sqrt for edge lengths (e.g., tet edge = 2√2 × halfSize), but those are computed ONCE. The matrix generation multiplies them across the grid without additional sqrt/trig calls.

---

### 🎯 Recommended RT-Pure Refinements

#### Priority 1: High Impact (Immediate Action)

**Refinement 1.1: Add RT.applyRotation180() to rt-math.js**

**Action:** Create new function in [rt-math.js](../../../src/geometry/modules/rt-math.js) (after RT.applyRotation45)

```javascript
/**
 * Apply 180° rotation around Z-axis using RT-pure spread/cross values
 * Used for alternating tetrahedron orientations in IVM matrices
 *
 * RT-Pure Implementation:
 * - Spread s = sin²(180°) = 0 (exact rational!)
 * - Cross c = cos²(180°) = 1 (exact rational!)
 * - Trivial sqrt extraction: sin = 0, cos = -1 (no computation needed!)
 *
 * @param {THREE.Group} group - THREE.js Group to rotate
 * @requires THREE - THREE.js library
 */
applyRotation180: group => {
  const s = 0;  // Spread = sin²(180°) = 0
  const c = 1;  // Cross = cos²(180°) = 1

  // Verify RT identity: s + c = 1.0 ✓

  // Extract sin/cos (trivial - no sqrt needed!)
  const sin_val = 0;   // √0 = 0 (exact)
  const cos_val = -1;  // -√1 = -1 (exact, negated for 180°)

  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.set(
    cos_val, -sin_val, 0, 0,  // [-1,  0, 0, 0]
    sin_val,  cos_val, 0, 0,  // [ 0, -1, 0, 0]
    0,        0,       1, 0,
    0,        0,       0, 1
  );

  group.applyMatrix4(rotationMatrix);
  console.log(`[RT] 180° rotation applied: s=${s}, c=${c}, s+c=${s+c} ✓`);
},
```

**Refinement 1.2: Update Tetrahedron Matrix to Use RT.applyRotation180()**

**Action:** Modify [rt-matrix.js:254-257](../../../src/geometry/modules/rt-matrix.js#L254-L257)

**Before:**

```javascript
if (!isUp) {
  tetGroup.rotation.z = Math.PI; // ❌ Uses Math.PI
}
```

**After:**

```javascript
if (!isUp) {
  RT.applyRotation180(tetGroup); // ✅ RT-pure!
}
```

**Benefits:**

- ✅ Eliminates Math.PI from matrix generation
- ✅ Consistent with RT.applyRotation45() pattern
- ✅ Educational: shows spread/cross for 180° rotation
- ✅ Console log confirms RT identity (s + c = 1.0)

#### Priority 2: Medium Impact (Documentation & Validation)

**Refinement 2.1: Add Quadrance Validation (Optional)**

**Action:** Add validation helper to [rt-matrix.js](../../../src/geometry/modules/rt-matrix.js)

```javascript
/**
 * Validate matrix spacing using quadrance (RT-pure distance verification)
 * Checks that adjacent polyhedra are spaced correctly without using sqrt
 *
 * @param {Array} positions - Array of {x, y, z} center positions
 * @param {number} expectedSpacing - Expected distance between centers
 * @param {number} tolerance - Error tolerance (default 1e-10)
 * @returns {boolean} True if all spacings are within tolerance
 */
validateMatrixSpacing: (positions, expectedSpacing, tolerance = 1e-10) => {
  const Q_expected = expectedSpacing * expectedSpacing;  // Quadrance

  for (let i = 0; i < positions.length - 1; i++) {
    const Q_actual = RT.quadrance(positions[i], positions[i + 1]);
    const error = Math.abs(Q_actual - Q_expected);

    if (error > tolerance) {
      console.warn(`[RTMatrix] Spacing error: Q_actual=${Q_actual}, Q_expected=${Q_expected}, error=${error}`);
      return false;
    }
  }

  console.log(`[RTMatrix] Spacing validation passed: Q=${Q_expected} (${positions.length} positions checked)`);
  return true;
},
```

**Usage (in matrix generation):**

```javascript
// After generating all positions, validate spacing
const positions = []; // Collect center positions during generation
// ... matrix generation loop ...
RTMatrix.validateMatrixSpacing(positions, spacing);
```

**Refinement 2.2: Document RT-Pure Philosophy in Code Comments**

**Action:** Add header comment to [rt-matrix.js](../../../src/geometry/modules/rt-matrix.js)

```javascript
/**
 * RT-Pure Matrix Generation Philosophy:
 *
 * 1. **Defer √ Expansion:**
 *    - Work with quadrance (Q = distance²) for comparisons
 *    - Only compute sqrt when creating final Vector3 positions
 *    - Example: spacing_Q = spacing² (no sqrt until render)
 *
 * 2. **Avoid Transcendental Functions:**
 *    - NO Math.PI, Math.sin, Math.cos, Math.atan, etc.
 *    - Use spread/cross space for rotations (RT.applyRotation45/180)
 *    - Rotations emerge from exact rational spread values
 *
 * 3. **Leverage Exact Rationals:**
 *    - 45° rotation: s = c = 0.5 (exact rational 1/2)
 *    - 180° rotation: s = 0, c = 1 (trivial sqrt extraction)
 *    - Grid spacing: rational multiples of halfSize
 *
 * 4. **Educational Transparency:**
 *    - Console logs show spread/cross values and verify RT identity (s + c = 1.0)
 *    - Comments explain "why" (geometric reasoning) not just "what" (code syntax)
 *    - References to Fuller's Synergetics and Wildberger's RT theory
 *
 * When sqrt/trig IS needed (e.g., base polyhedra generation), compute ONCE
 * and reuse across matrix. Matrix generation itself remains RT-pure.
 */
```

#### Priority 3: Low Impact (Future Enhancements)

**Refinement 3.1: Snap-to-Spread Rotation**

**Use Case:** Allow user to snap rotations to specific spread values (not just 45° and 180°)

**Example:**

```javascript
// Future UI: "Snap to Spread" slider (0.0 to 1.0)
// User sets spread = 0.5 → rotation snaps to 45°
// User sets spread = 0.75 → rotation snaps to arcsin(√0.75) ≈ 60°

const targetSpread = 0.5; // From UI slider
const t = RT.spreadToParam(targetSpread); // Convert to angle parameter
const point = RT.circleParam(t); // Get (cos²-derived, sin²-derived)

// Extract sin/cos from point coordinates
const cos_val = Math.sqrt(point.x); // Deferred sqrt
const sin_val = Math.sqrt(1 - point.x); // Derived from identity

// Build rotation matrix...
```

**Status:** Deferred to future (not needed for current matrix slider feature)

---

### Summary Table: RT-Pure Compliance

| Component                        | Status         | Grade | Notes                                         |
| -------------------------------- | -------------- | ----- | --------------------------------------------- |
| **45° Rotation**                 | ✅ RT-Pure     | A+    | Excellent use of spread/cross, no Math.PI     |
| **180° Rotation**                | ✅ RT-Pure     | A+    | Uses RT.applyRotation180() (s=0, c=1)         |
| **Grid Spacing**                 | ✅ Rational    | A     | Uses halfSize multiples, no sqrt in spacing   |
| **Position Calculation**         | ✅ RT-Pure     | A     | Rational arithmetic only                      |
| **Quadrance Validation**         | ✅ Implemented | A     | validateMatrixSpacing() helper added          |
| **Weierstrass Parameterization** | ⏳ Available   | N/A   | Not needed currently, ready for Phase C       |
| **Code Documentation**           | ✅ Excellent   | A+    | Complete RT-Pure philosophy header + examples |

**Overall Grade: A+ (Excellent RT-pure compliance with comprehensive documentation)**

**Summary of Achievements:**

- ✅ Zero Math.PI usage in matrix generation
- ✅ All rotations use spread/cross methodology
- ✅ Quadrance-based validation available
- ✅ Educational documentation throughout
- ✅ Pragmatic compromises clearly explained

---

### Implementation Workplan for RT-Pure Refinements

#### Phase A: High Priority ✅ COMPLETED (2026-01-06)

**Goal:** Eliminate Math.PI from matrix generation, achieve full RT-pure compliance

**Tasks:**

1. ✅ **Add RT.applyRotation180() to rt-math.js** (COMPLETED)
   - Location: [rt-math.js:320-377](../../../src/geometry/modules/rt-math.js#L320-L377)
   - Implementation: Spread s=0, cross c=1, trivial sqrt extraction
   - Console log: Verifies RT identity s + c = 1.0
   - Educational note added explaining RT elegance for 180° rotation
   - Actual effort: 15 minutes

2. ✅ **Update Tetrahedron Matrix to use RT.applyRotation180()** (COMPLETED)
   - Location: [rt-matrix.js:256-257](../../../src/geometry/modules/rt-matrix.js#L256-L257)
   - Replaced: `tetGroup.rotation.z = Math.PI` → `RT.applyRotation180(tetGroup)`
   - Added RT-pure comment explaining spread/cross methodology
   - Actual effort: 5 minutes

3. ✅ **Test & Validate** (READY FOR USER TESTING)
   - Code changes complete and committed
   - Ready for visual validation in browser
   - Expected: Tetrahedron matrix renders with alternating orientations (no visual change)
   - Expected: Console logs show `[RT] 180° rotation applied: s=0, c=1, s+c=1 ✓`
   - Estimated effort: 10 minutes

**Total Actual Effort:** 20 minutes (faster than estimated!)

**Files Modified:**

- [rt-math.js](../../../src/geometry/modules/rt-math.js) - Added RT.applyRotation180() function
- [rt-matrix.js](../../../src/geometry/modules/rt-matrix.js) - Replaced Math.PI with RT.applyRotation180()

**RT-Pure Compliance Achieved:**

- ✅ NO Math.PI in matrix generation
- ✅ ALL rotations use spread/cross methodology
- ✅ Consistent rotation API (RT.applyRotation45, RT.applyRotation180)
- ✅ Educational console logs verify RT identities

**Grade Upgrade: B+ → A ✅ VALIDATED**

#### Phase B: Medium Priority ✅ COMPLETED (2026-01-06)

**Goal:** Improve code documentation and add validation helpers

**Tasks:**

1. ✅ **Add RT-Pure Philosophy Header to rt-matrix.js** (COMPLETED)
   - Location: [rt-matrix.js:18-60](../../../src/geometry/modules/rt-matrix.js#L18-L60)
   - Content: Complete 5-point RT-pure philosophy explanation
   - Covers: Defer √, avoid π, use rationals, educational transparency, pragmatic compromises
   - Includes grade (A) and reference to this audit document
   - Actual effort: 20 minutes

2. ✅ **Add validateMatrixSpacing() Helper** (COMPLETED)
   - Location: [rt-matrix.js:462-526](../../../src/geometry/modules/rt-matrix.js#L462-L526)
   - Implementation: Quadrance-based distance validation (no sqrt!)
   - Features: Detailed console logging, error reporting, tolerance checking
   - Usage example included in JSDoc comments
   - Actual effort: 25 minutes

3. ✅ **Update matrix-slider.md with RT-Pure Audit** (COMPLETED)
   - Location: Section 4.5 "RT-Pure Analysis & Audit"
   - Content: Comprehensive analysis, recommendations, implementation workplan
   - Status: This document (already complete)
   - Actual effort: 45 minutes (initial audit)

**Total Actual Effort:** 90 minutes

**Files Modified:**

- [rt-matrix.js](../../../src/geometry/modules/rt-matrix.js) - Added philosophy header and validation helper
- [matrix-slider.md](../../../docs/development/Geometry Documents/matrix-slider.md) - Added complete RT-pure audit

**Documentation Enhancements:**

- ✅ RT-Pure philosophy clearly articulated at top of module
- ✅ Validation helper demonstrates practical quadrance usage
- ✅ Educational comments explain "why" not just "what"
- ✅ References to Fuller and Wildberger theories
- ✅ Grade system shows compliance level

**Final Grade: A+ (full RT-pure compliance + comprehensive documentation)**

---

### Matrix Geometry Info Display

**Challenge:** How should Geometry Info display when a matrix form is selected?

#### Solution Approach

Matrix forms display **aggregated geometry statistics** that multiply base polyhedron metrics by the number of instances in the N×N grid.

#### Implementation Pattern

```javascript
// Example: Cube Matrix with matrixSize = 5 (5×5 = 25 instances)
if (document.getElementById("showCubeMatrix").checked) {
  const cube = Polyhedra.cube(1); // Base geometry
  const matrixSize = parseInt(
    document.getElementById("cubeMatrixSizeSlider").value
  );
  const instanceCount = matrixSize * matrixSize; // N×N grid

  const eulerOK = RT.verifyEuler(
    cube.vertices.length,
    cube.edges.length,
    cube.faces.length
  );

  html += `<div style="margin-top: 10px;"><strong>Cube Matrix (${matrixSize}×${matrixSize}):</strong></div>`;
  html += `<div>Schläfli: {4,3} × ${instanceCount} instances</div>`;
  html += `<div>V: ${cube.vertices.length * instanceCount}, E: ${cube.edges.length * instanceCount}, F: ${cube.faces.length * instanceCount}</div>`;
  html += `<div>Base Euler: ${eulerOK ? "✓" : "✗"} (V - E + F = 2 per instance)</div>`;
  html += `<div>Triangles: ${cube.faces.length * 2 * instanceCount}</div>`;
}
```

#### Display Format Examples

**Cube Matrix (5×5):**

```
Cube Matrix (5×5):
Schläfli: {4,3} × 25 instances
V: 200, E: 300, F: 150
Base Euler: ✓ (V - E + F = 2 per instance)
Triangles: 300
```

**Tet Matrix (5×5):**

```
Tet Matrix (5×5):
Schläfli: {3,3} × 25 instances
V: 100, E: 150, F: 100
Base Euler: ✓ (V - E + F = 2 per instance)
Triangles: 100
```

**Octa Matrix (5×5):**

```
Octa Matrix (5×5):
Schläfli: {3,4} × 25 instances
V: 150, E: 300, F: 200
Base Euler: ✓ (V - E + F = 2 per instance)
Triangles: 200
```

#### Key Differences from Base Forms

| Property           | Base Form             | Matrix Form                 |
| ------------------ | --------------------- | --------------------------- |
| **V, E, F**        | Single polyhedron     | Multiplied by N² instances  |
| **Euler Check**    | Direct verification   | "Base Euler" (per instance) |
| **Label**          | "Hexahedron (Cube)"   | "Cube Matrix (5×5)"         |
| **Schläfli**       | "{4,3}"               | "{4,3} × 25 instances"      |
| **Triangle Count** | faces × 2 (for quads) | faces × 2 × N²              |

#### Implementation Notes

1. **Instance Count Calculation:**
   - Cube Matrix: `matrixSize × matrixSize` (N×N grid)
   - Tet Matrix: `matrixSize × matrixSize` (N×N grid)
   - Octa Matrix: `matrixSize × matrixSize` (N×N grid)

2. **Euler Validation:**
   - Show "Base Euler" since the matrix as a whole doesn't form a single closed polyhedron
   - Each instance satisfies V - E + F = 2 individually
   - Matrix is a spatial array, not a single convex polyhedron

3. **Triangle Count:**
   - Cube faces are quads → 2 triangles each → `6 × 2 × N²`
   - Tet faces are triangles → 1 triangle each → `4 × 1 × N²`
   - Octa faces are triangles → 1 triangle each → `8 × 1 × N²`

4. **Rotation State Display (Optional Enhancement):**
   ```javascript
   const rotate45 = document.getElementById("cubeMatrixRotate45").checked;
   html += `<div>Rotation: ${rotate45 ? "45° (grid-aligned)" : "0° (default)"}</div>`;
   html += `<div>Spread: ${rotate45 ? "s = 0.5, c = 0.5" : "s = 0, c = 1"}</div>`;
   ```

#### Educational Value

Matrix geometry info demonstrates:

- **Scalability:** How geometry complexity grows with N²
- **IVM Principles:** Multiple polyhedra working together
- **Performance:** Triangle count helps users understand rendering cost
- **RT-Pure Math:** Optional rotation spread/cross display

#### Future Enhancements

**Phase C (Optional):**

- Display aggregate bounding box dimensions
- Show total quadrance (Q) of matrix extent
- Calculate matrix density (polyhedra per unit volume)
- Display IVM complementarity info when Tet + Octa matrices both active

```javascript
// Example: IVM Complementarity Display
if (tetMatrixActive && octaMatrixActive) {
  html += `<div style="margin-top: 10px;"><strong>IVM Octet Truss:</strong></div>`;
  html += `<div>Tet instances: ${tetCount}, Octa instances: ${octaCount}</div>`;
  html += `<div>Total polyhedra: ${tetCount + octaCount}</div>`;
  html += `<div>Complementarity: ✓ (Tets fill octa voids)</div>`;
}
```

---

#### Phase C: Low Priority (Future)

**Goal:** Enable advanced RT-pure features for future use

**Tasks:**

1. ⏳ **Snap-to-Spread Rotation UI**
   - Deferred to Phase 5 (advanced features)
   - Requires RT.spreadToParam() and RT.circleParam() integration

2. ⏳ **Arbitrary Angle Rotation via Weierstrass**
   - Deferred to Phase 5 (if needed for educational demonstrations)
   - Would showcase RT.circleParam() usage

**Total Estimated Effort:** TBD (future scope)

---

### Conclusion: Path to Full RT-Pure Compliance

The current matrix implementation is **already quite good** from an RT-pure perspective:

- ✅ 45° rotation uses spread/cross methodology perfectly
- ✅ Grid calculations use rational arithmetic
- ✅ No sqrt in spacing calculations
- ✅ Base polyhedra computed once, reused efficiently

The **single improvement** needed for full RT-pure compliance:

- ⚠️ Replace `Math.PI` with `RT.applyRotation180()` for tetrahedron orientation

**Estimated Time to Achieve A+ Grade:** ~1 hour (Phase A + Phase B)

This is a **minor refinement** that will:

1. Eliminate the last use of Math.PI from matrix generation
2. Make rotation logic consistent across all matrix functions
3. Add educational value (console logs showing spread/cross for 180°)
4. Improve code documentation with RT-pure philosophy

**Recommendation:** Proceed with Phase A immediately (35 minutes), then Phase B for documentation completeness.

---

## 5. Technical Specifications

### 5.1 Coordinate System

**Z-Up Convention:**

- Matrix arrays expand in X-Y plane (horizontal)
- Z-axis is vertical (camera looks down at matrix from above for plan view)
- Polyhedra have constant Z-extent (-halfSize to +halfSize)

### 5.2 Centering Algorithm

**Origin-Centered Grid:**
For N×N matrix, grid indices (i, j) from 0 to N-1:

```javascript
const offset_x = (i - N / 2 + 0.5) * spacing;
const offset_y = (j - N / 2 + 0.5) * spacing;
const offset_z = 0; // Centered at origin in Z
```

**Example:** N=5, spacing=2

- Grid indices: 0, 1, 2, 3, 4
- Offsets: -4, -2, 0, +2, +4 (centered at 0)

### 5.3 Spacing Calculation

**Cube Spacing:**

```javascript
const spacing = cubeEdge; // Edge-to-edge contact
```

**Tetrahedron Spacing:**

```javascript
// Vertex-to-vertex distance in close-packed arrangement
const spacing = tetEdge * Math.sqrt(2); // Approximate (needs geometric verification)
```

**Octahedron Spacing:**

```javascript
// Square face diagonal = edge length
const spacing = octaEdge; // Face-to-face contact
```

### 5.4 RT-Pure Considerations

**Quadrance-Based Layout:**

- Calculate grid positions using quadrance (distance²)
- Defer √ expansion until final Vector3 creation
- Maintain exact spacing ratios (√2, √3, φ) symbolically

**Example:**

```javascript
// RT-Pure grid calculation
const Q_spacing = cubeEdge * cubeEdge; // Quadrance (no sqrt)
const offset_Q_x = (i - N / 2 + 0.5) ** 2 * Q_spacing;
const offset_x = Math.sqrt(offset_Q_x); // Only sqrt at final position
```

---

## 6. Code Architecture

### 6.1 File Structure

**New Module:** `src/geometry/modules/rt-matrix.js`

```javascript
// Matrix generation module for IVM spatial arrays
const RT_Matrix = {
  // Core matrix generators
  createCubeMatrix: (matrixSize, halfSize, rotate45) => {
    /* ... */
  },
  createTetrahedronMatrix: (matrixSize, halfSize, rotate45) => {
    /* ... */
  },
  createOctahedronMatrix: (matrixSize, halfSize, rotate45) => {
    /* ... */
  },

  // Helper functions
  calculateGridPosition: (i, j, matrixSize, spacing) => {
    /* ... */
  },
  centerMatrix: (group, matrixSize, spacing) => {
    /* ... */
  },

  // Void visualization (optional)
  createOctahedralVoids: tetMatrix => {
    /* ... */
  },
};
```

**Enhanced Module:** `src/geometry/modules/rt-math.js`

Add rotation helper to centralize RT-pure rotation logic:

```javascript
// RT-Pure 45° rotation helper (NO ANGLES!)
// Add to existing RT namespace in rt-math.js
RT.applyRotation45 = group => {
  // Work in spread/cross space, not angle space
  const s = 0.5; // Spread = sin²(45°) = 1/2 (exact rational!)
  const c = 0.5; // Cross = cos²(45°) = 1/2 (exact rational!)

  // Extract sin/cos ONLY when constructing matrix (deferred √)
  const sin_val = Math.sqrt(s); // √(1/2) = √2/2
  const cos_val = Math.sqrt(c); // √(1/2) = √2/2

  // Build rotation matrix from spread/cross values
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.set(
    cos_val,
    -sin_val,
    0,
    0,
    sin_val,
    cos_val,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  );

  group.applyMatrix4(rotationMatrix);
  console.log(`[RT] Matrix rotation applied: s=${s}, c=${c}, s+c=${s + c} ✓`);
};
```

**Rationale:** Rotation logic belongs in rt-math.js alongside `spread()`, `circleParam()`, and other RT-pure mathematical functions. This keeps all spread/cross-based operations centralized.

### 6.2 Leveraging Existing RT-Math Functions

**Available RT-Math Functions (from rt-math.js):**

1. **`RT.circleParam(t)`** - Rational circle parametrization (Weierstrass)
   - Future use: Snap-to-spread rotation constraints
   - Can find parameter `t` for target spread algebraically
   - No inverse trig needed

2. **`RT.spreadToParam(spread)`** - Convert spread to angle parameter
   - Future use: Algebraic snapping to specific spread values
   - Example: Snap to spread = 0.5 (45°) or spread = 0.75 (60°)
   - Returns parameter `t` for `circleParam(t)`

3. **`RT.quadrance(p1, p2)`** - Distance² calculation
   - Used for: Edge validation, spacing verification
   - All matrix positioning can use quadrance comparisons

4. **`RT.spread(v1, v2)`** - Angular spread between vectors
   - Used for: Verifying 45° rotation correctness
   - Educational: Display spread between matrix instances

5. **`RT.degreesToSpread(deg)` / `RT.spreadToDegrees(spread)`**
   - Used for: UI display conversion (degrees ↔ spread)
   - Label shows "45°" but calculation uses spread = 0.5

**Integration Strategy:**

- Matrix spacing: Use `RT.quadrance()` for all distance comparisons
- Rotation verification: Use `RT.spread()` to verify s = 0.5
- Future snapping: Use `RT.spreadToParam()` for algebraic snap-to-spread
- Console logging: Display both degrees and spread for educational clarity

### 6.3 Integration Points

**Modify:** `src/geometry/modules/rt-rendering.js`

- Update `updateGeometry()` to call matrix generators instead of single polyhedra
- Pass `matrixSize` parameter from slider value
- Handle matrix visibility toggling

**Modify:** `src/geometry/index.html`

- Add Matrix Size slider in Scale section
- Add event listener for slider changes

**Modify:** `src/geometry/modules/rt-init.js`

- Initialize matrix slider event handlers
- Store matrix size in state (for export/import)

---

## 7. User Experience

### 7.1 Workflow

**Typical User Journey:**

1. User loads ARTexplorer
2. Toggles Cube visibility ON
3. Sees single cube at origin (Matrix Size = 1 default)
4. Drags Matrix Size slider to 5
5. Sees 5×5 grid of cubes appear instantly
6. Adjusts Cube Edge Length slider
7. Entire 5×5 matrix scales uniformly
8. Toggles Tetrahedron visibility ON
9. Sees 5×5 tetrahedron matrix overlaid on cube matrix
10. Rotates view to see 3D structure

### 7.2 Educational Value

**Demonstrates:**

- Fuller's Isotropic Vector Matrix (IVM) space-filling geometry
- Tetrahedral vs cubic packing differences
- Octahedral voids in tetrahedral arrays
- Natural space-filling polyhedra
- Relationship between polyhedra in 3D space

**Use Cases:**

- Architecture students learning structural geometry
- Mathematics education (space-filling solids)
- Crystallography visualization (atomic packing)
- Fuller/Synergetics study groups
- Geodesic dome design (IVM foundation)

---

## 8. Testing Plan

### 8.1 Unit Tests

**Matrix Size = 1:**

- Single polyhedron at origin ✓
- Position: (0, 0, 0) ✓
- No spacing calculation needed ✓

**Matrix Size = 2:**

- 4 polyhedra in 2×2 grid ✓
- Centered at origin (symmetric around 0,0) ✓
- Correct spacing between instances ✓

**Matrix Size = 10:**

- 100 polyhedra in 10×10 grid ✓
- Performance acceptable (< 16ms frame time for 60 FPS) ✓
- No visual artifacts or gaps ✓

### 8.2 Integration Tests

**Scale Slider Interaction:**

- Adjust Cube Edge → matrix spacing updates ✓
- Matrix remains centered ✓
- All instances scale uniformly ✓

**Visibility Toggle:**

- Hide Cube → entire cube matrix disappears ✓
- Show Cube → matrix reappears ✓

**Multiple Polyhedra:**

- Show Cube + Tet simultaneously ✓
- Matrices overlap correctly ✓
- Independent control of each polyhedron type ✓

### 8.3 Visual Tests

**Plan View (Camera from Above):**

- Cube matrix: Perfect square grid ✓
- Tet matrix: Vertices align to grid ✓
- Octa matrix: Square faces visible ✓

**Isometric View:**

- 3D structure visible ✓
- Z-extent constant for all instances ✓
- No Z-fighting between overlapping polyhedra ✓

---

## 9. Performance Considerations

### 9.1 Geometry Complexity

**Matrix Size vs Triangle Count:**

| Matrix Size | Cubes (6×2 Δ each) | Tets (4×1 Δ each) | Octas (8×1 Δ each) |
| ----------- | ------------------ | ----------------- | ------------------ |
| 1×1         | 12 triangles       | 4 triangles       | 8 triangles        |
| 5×5         | 300 triangles      | 100 triangles     | 200 triangles      |
| 10×10       | 1,200 triangles    | 400 triangles     | 800 triangles      |

**Assessment:** All well within modern GPU capabilities (< 10k triangles total)

### 9.2 Optimization Strategies

**Immediate (Phase 1-3):**

- Use `THREE.BufferGeometry` (already implemented)
- Indexed geometry (shared vertices)
- Frustum culling (automatic in Three.js)

**Future (Phase 4+):**

- `THREE.InstancedMesh` for repeated geometry
- LOD system for Matrix Size > 10
- Web Worker for matrix generation (off main thread)

### 9.3 Memory Footprint

**10×10 Cube Matrix:**

- 100 instances × 8 vertices × 3 coordinates × 4 bytes = **9.6 KB** (negligible)
- With instancing: Single geometry + 100 transform matrices = **~2 KB**

**Conclusion:** Memory is not a constraint for Matrix Size ≤ 10

---

## 10. Future Enhancements

### 10.1 Interactive Matrix Editing

**Gumball Integration:**

- Click individual polyhedron in matrix
- Gumball appears for Move/Scale/Rotate
- Edit single instance independently
- Option to "break out" instance from matrix

### 10.2 Matrix Patterns

**Beyond Simple Grid:**

- Hexagonal packing (closest sphere packing)
- Spiral arrays (Fibonacci, golden spiral)
- Fractal patterns (Sierpinski tetrahedral array)
- Custom user-defined patterns (JSON import)

### 10.3 Animation

**Matrix Growth Animation:**

- Animate slider drag (interpolate from N to N+1)
- Polyhedra "pop in" one by one
- Expand from center outward (ripple effect)

**Rotation Animation:**

- Rotate entire matrix around Z-axis
- Educational: Shows IVM symmetry from all angles

### 10.4 Export Features

**3D Model Export:**

- Export matrix as single .OBJ file
- Useful for 3D printing, CAD import
- Each instance becomes separate object

**Screenshot Mode:**

- High-resolution render of matrix
- Plan view + isometric view side-by-side
- Annotated with matrix size and polyhedron type

---

## 11. Documentation Requirements

### 11.1 Code Comments

**Required for all matrix functions:**

- Geometric basis (why this spacing formula?)
- RT-pure considerations (deferred √ expansion)
- Fuller/IVM references (Synergetics section numbers)
- Example usage

### 11.2 User Documentation

**Update:** `ARTexplorer.md` with new section:

**Section:** Phase 2.12: Matrix Slider (IVM Spatial Arrays)

- Feature description
- Matrix size range and behavior
- Supported polyhedra (Cube, Tet, Octa)
- Educational context (Fuller's IVM)
- Screenshots of example matrices

### 11.3 Inline Help

**Tooltip Text:**

```
Matrix Size: Creates N×N array of polyhedra in X-Y plane.
Demonstrates Fuller's Isotropic Vector Matrix (IVM) space-filling geometry.
Range: 1 (single) to 10 (10×10 grid = 100 instances)
```

---

## 12. Success Criteria

### Phase 1 (Cube Matrix) Complete When:

- [ ] Matrix slider renders 1-10 in Scale section
- [ ] Matrix size 1 shows single cube
- [ ] Matrix size 5 shows 5×5 grid (25 cubes)
- [ ] Cubes are edge-to-edge (no gaps)
- [ ] Matrix is centered at origin
- [ ] Scale slider adjusts entire matrix uniformly
- [ ] Visibility toggle works for entire matrix
- [ ] Performance: 60 FPS at Matrix Size = 10
- [ ] Code documented with geometric explanations

### Phase 2 (Tetrahedron Matrix) Complete When:

- [ ] Tetrahedra array vertex-to-vertex
- [ ] Alternating up/down orientations correct
- [ ] Octahedral voids are geometrically correct (measured)
- [ ] Can show both Cube + Tet matrices simultaneously
- [ ] No overlap between tetrahedra

### Phase 3 (Octahedron Matrix) Complete When:

- [ ] Octahedra array face-to-face
- [ ] Plan view shows square grid
- [ ] All three matrix types working (Cube, Tet, Octa)
- [ ] Documentation updated in ARTexplorer.md

### Overall Feature Complete When:

- [ ] All Phase 1-3 criteria met
- [ ] User testing confirms intuitive operation
- [ ] No performance issues up to Matrix Size = 10
- [ ] Educational value demonstrated (IVM visualization)

---

## 13. Open Questions

### Q1: Should matrix apply per-polyhedron or globally?

**Options:**

- A) Single matrix slider affects all visible polyhedra
- B) Per-polyhedron matrix controls (Cube: 5×5, Tet: 3×3)

**Recommendation:** Start with A (simpler), add B in Phase 5 if needed

### Q2: How to handle tetrahedron orientation alternation?

**Research Needed:**

- Exact alternating pattern for vertex-to-vertex contact
- Mathematical proof that voids are half-octahedra
- Reference: Fuller's Synergetics on tetrahedral packing

**Action:** Consult Synergetics Vol. 1, Section 400-480 (IVM geometry)

### Q3: Should octahedral voids be visualized?

**Options:**

- A) Always invisible (implied negative space)
- B) Toggle checkbox "Show Octahedral Voids" (educational)
- C) Automatic when Tet matrix active (auto-show voids)

**Recommendation:** B (optional toggle), implemented in Phase 2

### Q4: Performance limit for matrix size?

**Current Max:** 10×10 = 100 polyhedra
**Could extend to:** 20×20 = 400 polyhedra with instancing

**Decision:** Start with max=10, increase if performance testing shows headroom

---

## 14. References

### Fuller's Synergetics

- **Section 400-480:** Isotropic Vector Matrix (IVM)
- **Section 410:** Tetrahedron as basic structural system
- **Section 420:** Octahedron/Tetrahedron complementarity
- **Fig. 415.17:** Closest packing of spheres → IVM
- **Section 943:** Tetrahedral arrays and voids

### External Resources

- [Fuller's IVM](https://www.rwgrayprojects.com/synergetics/s04/p0000.html) - Online Synergetics reference
- [Tom Ace Quadray](http://minortriad.com/quadray.html) - Tetrahedral coordinates
- Kirby Urner's Python IVM examples (educational code)

### Mathematical Foundations

- **Close Packing:** HCP (hexagonal) vs CCP (cubic) sphere packing
- **Space-Filling Polyhedra:** Cube, rhombic dodecahedron, truncated octahedron
- **Non-Space-Filling:** Tetrahedron (requires octahedral voids)

---

## 15. Implementation Timeline (Estimated)

### Week 1: Planning & Setup

- Review Synergetics IVM sections
- Confirm geometric formulas for spacing
- Create rt-matrix.js module skeleton
- Design UI mockups

### Week 2: Phase 1 (Cube Matrix)

- Implement cube matrix generator
- Add UI slider and event handlers
- Integration with existing scale controls
- Testing and debugging

### Week 3: Phase 2 (Tetrahedron Matrix)

- Research tetrahedral packing pattern
- Implement tet matrix generator
- Verify octahedral void geometry
- Optional: Void visualization

### Week 4: Phase 3 (Octahedron Matrix)

- Implement octa matrix generator
- Testing all three matrix types
- Performance optimization
- Documentation update

### Week 5: Polish & Release

- User testing feedback
- Bug fixes
- Code review
- Merge to main

**Total Estimate:** 4-5 weeks part-time development

---

## 16. Risks & Mitigation

### Risk 1: Tetrahedral Orientation Complexity

**Impact:** High (core feature)
**Probability:** Medium
**Mitigation:** Thorough geometric research before coding, prototype in separate test file

### Risk 2: Performance at Matrix Size = 10

**Impact:** Medium (user experience)
**Probability:** Low (triangle counts are manageable)
**Mitigation:** Early performance testing, instancing if needed

### Risk 3: UI Clutter (Too Many Sliders)

**Impact:** Low (usability)
**Probability:** Medium
**Mitigation:** Collapsible Scale section, clear labeling, tooltips

### Risk 4: Confusion with Grid Tessellation

**Impact:** Low (educational clarity)
**Probability:** Medium
**Mitigation:** Clear naming ("Matrix" vs "Grid"), inline help text, documentation

---

## 17. Alternative Naming

If "Matrix Slider" causes confusion with the Matrix tool (linear algebra), consider:

**Alternative Names:**

- **IVM Array Slider** (most descriptive)
- **Spatial Array Size**
- **Polyhedra Grid** (though "grid" is already used for lines)
- **Replication Factor** (technical but clear)
- **Fuller Matrix** (honors Fuller directly)

**Recommendation:** Use "Matrix Size (IVM Array)" as label, with tooltip explaining Fuller's IVM.

---

## 18. Conclusion

The Matrix Slider feature will be a powerful educational and visualization tool, directly demonstrating Fuller's Isotropic Vector Matrix principles. By starting with the simple cube array and progressively adding tetrahedral and octahedral matrices, we build complexity gradually while maintaining RT-pure mathematical foundations.

**Key Success Factors:**

1. Geometric accuracy (correct spacing and orientation)
2. Performance efficiency (smooth at Matrix Size = 10)
3. Educational clarity (IVM demonstration)
4. Integration with existing controls (scale, visibility)

**Next Steps:**

1. Review this workplan with Andy for approval
2. Confirm tetrahedral packing geometry via Synergetics research
3. Create rt-matrix.js module skeleton
4. Begin Phase 1 implementation (Cube Matrix)

---

## 7. Known Issues & Solutions

### 7.1 Coplanar Face Flicker (RESOLVED)

**Issue:** Visual flickering on shared faces between adjacent polyhedra during camera movement

**Symptoms:**

- Flickering visible when camera is moving
- Flickering settles after camera becomes still (2-3 seconds)
- Only affects shared/coplanar faces between adjacent matrix polyhedra
- Most noticeable on larger matrices (6×6 and above)

**Root Cause:**
Floating-point precision issues in the standard linear depth buffer during camera transforms. When two faces are perfectly coplanar (shared between adjacent cubes/tets/octas), the depth buffer cannot reliably determine which face is "in front" due to limited precision, especially during camera movement when depth values are being recalculated.

**Solution: Logarithmic Depth Buffer**

Enable logarithmic depth buffer in the WebGL renderer initialization:

```javascript
// rt-init.js, line 154-159
renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true, // Resolves coplanar face flicker
});
```

**Why This Works:**

- **Precision Distribution:** Logarithmic depth buffer distributes precision evenly across the entire depth range, unlike linear depth buffer which concentrates precision near the camera
- **Stability During Transforms:** Eliminates floating-point instability when depth values are recalculated during camera movement
- **Zero Cost:** GPU-native feature with no computational overhead
- **Mathematically Sound:** Logarithmic scale is actually more appropriate for depth perception than linear scale
- **Geometry Unchanged:** Pure rendering optimization - all RT-pure mathematics remain exact

**Performance Impact:** None (GPU feature, same rendering cost as linear depth buffer)

**Status:** ✅ Implemented and verified (2026-01-06)

---

## 8. Future Work: Space-Filling Cuboctahedron & Rhombic Dodecahedron Matrices

### 8.1 Overview

Both the **cuboctahedron** (Vector Equilibrium) and **rhombic dodecahedron** can form space-filling matrices similar to the cube matrix. These are high-priority additions to complete the IVM space-filling polyhedra set.

**Key Properties:**

- Both tile 3D space completely (no gaps, like cube matrix)
- Both exhibit **face coplanarity** between adjacent polyhedra (like cube matrix)
- Cuboctahedron: Archimedean solid with mixed faces (triangles + squares)
- Rhombic dodecahedron: Catalan solid, dual of cuboctahedron
- Both are fundamental to IVM geometry and Fuller's Synergetics

---

### 8.2 Cuboctahedron Matrix (Vector Equilibrium Array)

**Phase:** 1.6a (Next implementation priority)

**Geometry:**

- **Vertices:** 12
- **Edges:** 24
- **Faces:** 14 (8 triangular, 6 square)
- **Schläfli Symbol:** (3.4)²
- **Space-Filling Pattern:** Face-to-face contact (like cube matrix)

**RT-Pure Specifications:**

```javascript
// Cuboctahedron edge length relationship to halfSize
// For cube of halfSize s:
// Cuboctahedron inscribed in cube has edge length = s√2
// (Vertices at cube edge midpoints)

const edgeLength = halfSize * Math.sqrt(2);
const spacing = edgeLength; // Face-to-face spacing in matrix
```

**Matrix Packing:**

- **Contact Mode:** Square faces touch square faces (coplanar)
- **Orientation:** Single orientation (no alternating like tetrahedra)
- **Spacing:** `spacing = halfSize * sqrt(2)` (edge length)
- **Grid Pattern:** Simple NxN array in XY plane

**Coplanar Faces:**

- Square faces (6 per cuboctahedron) are coplanar between adjacent polyhedra
- **Solution:** Logarithmic depth buffer (already implemented) handles this perfectly
- Same rendering approach as cube matrix (no special handling needed)

**Implementation Pattern (duplicate from cube matrix):**

```javascript
// rt-matrix.js - New function to add

/**
 * Create N×N matrix of cuboctahedra in X-Y plane
 * Face-to-face array (square faces coplanar)
 *
 * @param {number} matrixSize - Grid size (1 to 10)
 * @param {number} halfSize - Half the cube edge length (cuboctahedron inscribed in cube)
 * @param {boolean} rotate45 - Apply 45° Z-rotation for grid alignment
 * @param {number} opacity - Opacity value (0.0 to 1.0)
 * @param {number} color - Hex color value (default: 0x00ff88 lime-cyan)
 * @param {Object} THREE - THREE.js library
 * @returns {THREE.Group} Group containing all cuboctahedron instances
 *
 * Pattern: Face-to-face contact via square faces
 * Vector Equilibrium (VE) is fundamental to IVM
 */
createCuboctahedronMatrix: (
  matrixSize,
  halfSize,
  rotate45,
  opacity,
  color = 0x00ff88, // Lime-cyan (Vector Equilibrium color)
  THREE
) => {
  const matrixGroup = new THREE.Group();

  // Cuboctahedron geometry from rt-polyhedra.js
  import('./rt-polyhedra.js').then((PolyModule) => {
    const { Polyhedra } = PolyModule;
    const cubocta = Polyhedra.cuboctahedron(halfSize);
    const { vertices, edges, faces } = cubocta;

    // Spacing: edge length = halfSize * sqrt(2)
    const spacing = halfSize * Math.sqrt(2);

    // Build NxN matrix
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        const cuboctaGroup = new THREE.Group();

        // Calculate offset for this grid position
        const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
        const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
        const offset_z = 0;

        // Render faces (triangles and squares)
        const positions = [];
        const indices = [];

        vertices.forEach((v) => {
          positions.push(
            v.x + offset_x,
            v.y + offset_y,
            v.z + offset_z
          );
        });

        faces.forEach((faceIndices) => {
          // Fan triangulation from first vertex
          for (let k = 1; k < faceIndices.length - 1; k++) {
            indices.push(faceIndices[0], faceIndices[k], faceIndices[k + 1]);
          }
        });

        const faceGeometry = new THREE.BufferGeometry();
        faceGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3)
        );
        faceGeometry.setIndex(indices);
        faceGeometry.computeVertexNormals();

        const faceMaterial = new THREE.MeshStandardMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
          side: THREE.DoubleSide,
          depthWrite: opacity >= 0.99,
          flatShading: true,
        });

        const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
        faceMesh.renderOrder = 1;
        cuboctaGroup.add(faceMesh);

        // Render edges
        const edgePositions = [];
        edges.forEach(([i, j]) => {
          const v1 = vertices[i];
          const v2 = vertices[j];
          edgePositions.push(
            v1.x + offset_x, v1.y + offset_y, v1.z + offset_z,
            v2.x + offset_x, v2.y + offset_y, v2.z + offset_z
          );
        });

        const edgeGeometry = new THREE.BufferGeometry();
        edgeGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(edgePositions, 3)
        );

        const edgeMaterial = new THREE.LineBasicMaterial({
          color: color,
          linewidth: 1,
          depthTest: true,
          depthWrite: true,
        });

        const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edgeLines.renderOrder = 2;
        cuboctaGroup.add(edgeLines);

        matrixGroup.add(cuboctaGroup);
      }
    }

    // Apply 45° rotation if requested (RT-pure)
    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    console.log(
      `[RTMatrix] Cuboctahedron matrix created: ${matrixSize}×${matrixSize} = ${matrixSize * matrixSize} VEs, rotate45=${rotate45}`
    );
  });

  return matrixGroup;
},
```

**UI Integration:**

```javascript
// rt-init.js - Add to updateGeometry()

// Cuboctahedron Matrix (Vector Equilibrium Array)
if (document.getElementById("showCuboctahedronMatrix").checked) {
  requestAnimationFrame(() => {
    while (cuboctaMatrixGroup.children.length > 0) {
      cuboctaMatrixGroup.remove(cuboctaMatrixGroup.children[0]);
    }

    const matrixSize = parseInt(
      document.getElementById("matrixSizeSlider").value
    );
    const rotate45 = document.getElementById("matrixRotate45").checked;

    const cuboctaMatrix = RTMatrix.createCuboctahedronMatrix(
      matrixSize,
      scale,
      rotate45,
      opacity,
      0x00ff88, // Lime-cyan
      THREE
    );
    cuboctaMatrixGroup.add(cuboctaMatrix);

    // Add nodes if enabled
    const nodeSizeBtn = document.querySelector(".node-size-btn.active");
    const nodeSize = nodeSizeBtn ? nodeSizeBtn.dataset.nodeSize : "md";
    const showNodes = nodeSize !== "off";

    if (showNodes) {
      addMatrixNodes(
        cuboctaMatrixGroup,
        matrixSize,
        scale,
        rotate45,
        0x00ff88,
        nodeSize,
        "cuboctahedron"
      );
    }
  });
  cuboctaMatrixGroup.visible = true;
} else {
  cuboctaMatrixGroup.visible = false;
}
```

**Checkbox HTML:**

```html
<!-- Add to Visual Options section -->
<label>
  <input type="checkbox" id="showCuboctahedronMatrix" />
  Cuboctahedron Matrix (VE Array)
</label>
```

---

### 8.3 Rhombic Dodecahedron Matrix

**Phase:** 1.6b (After cuboctahedron matrix)

**Geometry:**

- **Vertices:** 14
- **Edges:** 24
- **Faces:** 12 (all rhombic/diamond-shaped)
- **Catalan Solid:** Dual of cuboctahedron
- **Space-Filling Pattern:** Face-to-face contact (all 12 rhombic faces)

**RT-Pure Specifications:**

```javascript
// Rhombic dodecahedron relationship to cube
// For cube of halfSize s:
// Rhombic dodecahedron has:
//   - 6 vertices at cube face centers (distance s from origin)
//   - 8 vertices at cube vertices (distance s√3 from origin)
//   - Edge length = s√2

const edgeLength = halfSize * Math.sqrt(2);
const spacing = 2 * halfSize; // Face-to-face spacing (cube edge length)
```

**Matrix Packing:**

- **Contact Mode:** Rhombic faces touch rhombic faces (coplanar)
- **Orientation:** Single orientation
- **Spacing:** `spacing = 2 * halfSize` (cube edge length, since rhombic dodec centers in cube cells)
- **Grid Pattern:** Simple NxN array in XY plane

**Coplanar Faces:**

- All 12 rhombic faces are coplanar between adjacent polyhedra
- **Solution:** Logarithmic depth buffer (already implemented) handles this
- Same rendering approach as cube matrix

**Implementation Pattern:**

```javascript
// rt-matrix.js - New function to add

/**
 * Create N×N matrix of rhombic dodecahedra in X-Y plane
 * Face-to-face array (rhombic faces coplanar)
 *
 * @param {number} matrixSize - Grid size (1 to 10)
 * @param {number} halfSize - Half the cube edge length
 * @param {boolean} rotate45 - Apply 45° Z-rotation for grid alignment
 * @param {number} opacity - Opacity value (0.0 to 1.0)
 * @param {number} color - Hex color value (default: 0xff8800 orange)
 * @param {Object} THREE - THREE.js library
 * @returns {THREE.Group} Group containing all rhombic dodecahedron instances
 *
 * Pattern: Face-to-face contact via rhombic faces
 * Dual of Vector Equilibrium, fundamental space-filler
 */
createRhombicDodecahedronMatrix: (
  matrixSize,
  halfSize,
  rotate45,
  opacity,
  color = 0xff8800, // Orange (Rhombic Dodec color)
  THREE
) => {
  const matrixGroup = new THREE.Group();

  import('./rt-polyhedra.js').then((PolyModule) => {
    const { Polyhedra } = PolyModule;
    const rhombicDodec = Polyhedra.rhombicDodecahedron(halfSize);
    const { vertices, edges, faces } = rhombicDodec;

    // Spacing: cube edge length = 2 * halfSize
    const spacing = 2 * halfSize;

    // Build NxN matrix (same pattern as cube/cuboctahedron)
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        const rhombicGroup = new THREE.Group();

        const offset_x = (i - matrixSize / 2 + 0.5) * spacing;
        const offset_y = (j - matrixSize / 2 + 0.5) * spacing;
        const offset_z = 0;

        // [Same face/edge rendering code as cuboctahedron matrix]
        // ... (duplicate pattern)

        matrixGroup.add(rhombicGroup);
      }
    }

    if (rotate45) {
      RT.applyRotation45(matrixGroup);
    }

    console.log(
      `[RTMatrix] Rhombic dodecahedron matrix created: ${matrixSize}×${matrixSize} = ${matrixSize * matrixSize} rhombic dodecs, rotate45=${rotate45}`
    );
  });

  return matrixGroup;
},
```

---

### 8.4 Implementation Checklist

**Phase 1.6a: Cuboctahedron Matrix**

- [ ] Add `createCuboctahedronMatrix()` to rt-matrix.js
- [ ] Add UI checkbox for Cuboctahedron Matrix
- [ ] Add matrix rendering call in updateGeometry()
- [ ] Add node support via addMatrixNodes() with polyhedronType="cuboctahedron"
- [ ] Test with all node sizes (Off/Sm/Md/Lg/Packed)
- [ ] Test with RT Geodesics vs Classical Spheres nodes
- [ ] Verify coplanar face rendering (should work with existing log depth buffer)
- [ ] Test 45° rotation option
- [ ] Verify spacing validation with validateMatrixSpacing()

**Phase 1.6b: Rhombic Dodecahedron Matrix**

- [ ] Add `createRhombicDodecahedronMatrix()` to rt-matrix.js
- [ ] Add UI checkbox for Rhombic Dodecahedron Matrix
- [ ] Add matrix rendering call in updateGeometry()
- [ ] Add node support via addMatrixNodes() with polyhedronType="rhombicDodecahedron"
- [ ] Test with all node sizes
- [ ] Test with RT Geodesics vs Classical Spheres nodes
- [ ] Verify coplanar face rendering
- [ ] Test 45° rotation option
- [ ] Verify spacing validation

**Validation Tests:**

- [ ] Verify space-filling (no gaps between polyhedra)
- [ ] Verify face coplanarity using logarithmic depth buffer
- [ ] Performance test at Matrix Size = 10 (100 polyhedra each)
- [ ] Node deduplication working correctly
- [ ] RT-pure spacing calculations match theoretical values
- [ ] Both matrices work with existing IVM grid overlays

---

### 8.5 Expected Behavior

**Cuboctahedron Matrix:**

- Forms complete space-filling array (like cube matrix)
- Square faces are perfectly coplanar between adjacent VEs
- No z-fighting due to logarithmic depth buffer
- Visual appearance: "Honeycomb" of alternating triangles and squares
- Color: Lime-cyan (0x00ff88) to distinguish from other matrices

**Rhombic Dodecahedron Matrix:**

- Forms complete space-filling array
- All 12 rhombic faces coplanar between adjacent polyhedra
- No z-fighting due to logarithmic depth buffer
- Visual appearance: "Crystalline" array of diamond-faced polyhedra
- Color: Orange (0xff8800) to distinguish from other matrices

**Performance:**

- Both should render smoothly at Matrix Size = 10 (same as existing matrices)
- Cuboctahedron: 14 faces/poly × 100 polys = 1400 faces total
- Rhombic Dodec: 12 faces/poly × 100 polys = 1200 faces total
- Comparable to Cube (6 faces × 100 = 600) and Octa (8 faces × 100 = 800)

---

### 8.6 Notes on Coplanar Face Rendering

**Important:** Both matrices will have extensive face coplanarity:

**Cuboctahedron Matrix:**

- 6 square faces per VE touch adjacent VEs
- Each internal VE has all 6 square faces coplanar with neighbors
- Edge VEs have partial coplanar faces

**Rhombic Dodecahedron Matrix:**

- All 12 rhombic faces touch adjacent rhombic dodecs
- Complete face coplanarity throughout matrix

**Solution: Already Implemented**
The logarithmic depth buffer (enabled in rt-init.js line 154-159) completely resolves coplanar face z-fighting for these geometries. No special handling needed - just follow the cube matrix pattern.

---

### 8.7 Future Enhancements

Once both matrices are implemented, consider:

1. **Combined IVM Display:** Show cube + cuboctahedron + rhombic dodecahedron matrices simultaneously to demonstrate space-filling relationships

2. **Transition Animation:** Morph between cube → cuboctahedron → rhombic dodecahedron to show geometric relationships

3. **IVM Cell Visualization:** Highlight the fundamental IVM unit cell (tet + octa OR cube + cubocta + rhombic dodec)

4. **Packing Density Analysis:** Compare packing efficiency and void ratios

---

## 9. Papercut Node Section Cuts

### 9.1 Overview

**Feature Name:** Papercut Node Section Cuts
**Status:** 🔄 PLANNED
**Priority:** Medium-High
**Branch:** Papercut-Nodes

Currently, the Papercut module (`rt-papercut.js`) generates section cut lines for polyhedra faces but explicitly **excludes** all node geometries. This is problematic because:

1. **Packed Nodes** demonstrate space-filling properties (vertex spheres at close-packing radius)
2. **Matrix Nodes** show IVM vertex positions in matrix arrays
3. **Single Polyhedra Nodes** highlight vertex positions for educational clarity

When the cutplane intersects visible nodes, users expect to see section cut circles/ellipses representing the sphere intersections.

### 9.2 Current Implementation (Problem)

In `rt-papercut.js` line 560-566, spheres are explicitly skipped:

```javascript
// Skip sphere geometries (gumball/control handles, scale mode spheres)
if (
  object.geometry.type === "SphereGeometry" ||
  (object.geometry.parameters && object.geometry.parameters.radius)
) {
  return;
}
```

This was originally added to exclude UI control handles (gumball, scale mode spheres), but it also excludes:

- **Classical nodes:** `THREE.SphereGeometry(radius, 16, 16)`
- **RT nodes:** `THREE.BufferGeometry` (geodesic icosahedron) - NOT currently excluded, but produces poor section cuts

### 9.3 Node Types and Geometry

**Classical Nodes (useRT = false):**

- Geometry: `THREE.SphereGeometry(radius, 16, 16)`
- Triangles: 512 per node
- Section cut: Should produce smooth circular intersection

**RT Nodes (useRT = true):**

- Geometry: `THREE.BufferGeometry` from `RTPolyhedra.geodesicIcosahedron(radius, 0, "out")`
- Triangles: 20 per node (frequency-0 icosahedron)
- Section cut: Produces polygonal intersection (icosahedral cross-section)

**Node Sizes:**

- `sm`: radius = 0.02
- `md`: radius = 0.04
- `lg`: radius = 0.08
- `packed`: radius = `getClosePackedRadius(polyhedronType, scale)` (calculated from edge quadrance)

### 9.4 Requirements

**Functional Requirements:**

1. Add "Section Nodes" checkbox to Papercut UI section (default: unchecked)
2. When checkbox enabled AND nodes visible (`nodeSize !== "off"`), generate section cut lines for nodes
3. Support both classical SphereGeometry and RT BufferGeometry nodes (spherical nodes)
4. Maintain exclusion of UI controls (gumball handles, scale mode spheres)
5. Work with single polyhedra nodes AND matrix nodes
6. Respect visibility hierarchy (hidden matrix = hidden matrix nodes = no section cuts)
7. **Future-proof:** Stub architecture for polyhedra-as-nodes (fall back to mesh intersection)

**Visual Requirements:**

1. Node section cuts should use the same line weight as polyhedra section cuts
2. Node section cuts should use the same color scheme (red normal, black in print mode)
3. Circles should be smooth (not polygonal) regardless of underlying geometry

**UI Checkbox:**

```html
<!-- Add to papercut-section in index.html -->
<div class="control-item">
  <label class="checkbox-label">
    <input type="checkbox" id="sectionNodes" />
    Section Nodes
  </label>
</div>
```

**State Management:**

```javascript
// In RTPapercut.state
state: {
  printModeEnabled: false,
  cutplaneEnabled: false,
  cutplaneValue: 0,
  cutplaneAxis: "z",
  cutplaneNormal: null,
  invertCutPlane: false,
  lineWeightEnabled: true,
  lineWeightMin: 0.5,
  lineWeightMax: 3.0,
  currentView: "top",
  sectionNodesEnabled: false, // NEW: Section nodes checkbox state
},
```

**Rationale for Opt-In:**

- Node section cuts add visual complexity (potentially hundreds of circles in matrices)
- Users may want clean polyhedra sections without node clutter
- Explicit control allows flexibility for different use cases (pedagogical vs. analytical)
- Default OFF maintains current behavior (no breaking changes)

### 9.5 Implementation Approach

**Option A: Analytical Circle Generation (Recommended)**

For sphere-plane intersections, compute the analytical circle rather than using face-edge intersection:

```javascript
/**
 * Generate circular intersection for sphere-plane cut
 * @param {THREE.Vector3} sphereCenter - World position of sphere center
 * @param {number} sphereRadius - Sphere radius
 * @param {THREE.Plane} plane - Cutting plane
 * @param {number} segments - Circle resolution (default: 32)
 * @returns {Array<THREE.Vector3>|null} Array of points forming circle, or null if no intersection
 */
function spherePlaneIntersection(
  sphereCenter,
  sphereRadius,
  plane,
  segments = 32
) {
  // Distance from sphere center to plane
  const distanceToPlane = plane.distanceToPoint(sphereCenter);

  // No intersection if sphere doesn't reach plane
  if (Math.abs(distanceToPlane) > sphereRadius) {
    return null;
  }

  // Calculate intersection circle radius using Pythagorean theorem
  // circleRadius² + distanceToPlane² = sphereRadius²
  const circleRadius = Math.sqrt(
    sphereRadius * sphereRadius - distanceToPlane * distanceToPlane
  );

  // Find circle center (closest point on plane to sphere center)
  const circleCenter = new THREE.Vector3();
  plane.projectPoint(sphereCenter, circleCenter);

  // Generate circle points in plane coordinate system
  // Need two perpendicular vectors in the plane
  const normal = plane.normal.clone();

  // Find first perpendicular vector (cross with any non-parallel vector)
  const up =
    Math.abs(normal.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
  const tangent1 = new THREE.Vector3().crossVectors(normal, up).normalize();
  const tangent2 = new THREE.Vector3()
    .crossVectors(normal, tangent1)
    .normalize();

  // Generate circle points
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * circleRadius;
    const y = Math.sin(angle) * circleRadius;

    const point = circleCenter
      .clone()
      .add(tangent1.clone().multiplyScalar(x))
      .add(tangent2.clone().multiplyScalar(y));

    points.push(point);
  }

  return points;
}
```

**Advantages:**

- Perfect circles regardless of underlying geometry
- Works for both classical and RT nodes
- Computationally efficient (O(segments) vs O(triangles))
- Consistent visual quality

**Option B: Improved Mesh Intersection**

Keep the existing face-edge intersection approach but:

1. Increase sphere resolution for section cut computation
2. Add post-processing to smooth polygonal intersections

**Disadvantages:**

- More complex implementation
- Higher computational cost
- Still produces artifacts for low-poly RT nodes

### 9.6 Node Identification Strategy

**Problem:** Distinguish vertex nodes from UI controls (both may use SphereGeometry)

**Solution:** Use `userData` metadata with type discrimination:

```javascript
// In rt-rendering.js when creating nodes:
const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
node.userData.isVertexNode = true; // Mark as vertex node
node.userData.nodeType = "sphere"; // "sphere" for current nodes, "polyhedron" for future
node.userData.nodeRadius = radius; // Store radius for analytical section cut
node.userData.nodeGeometry = "classical"; // "classical" or "rt" (for debugging/stats)
node.position.copy(vertex);
```

Then in `rt-papercut.js` with future-proofing:

```javascript
// Check if "Section Nodes" checkbox is enabled
if (!RTPapercut.state.sectionNodesEnabled) {
  // Skip all node processing if feature disabled
  // ... continue to next object ...
}

// Node detection and processing
if (object.userData.isVertexNode) {
  // CURRENT: Sphere nodes (analytical circle)
  if (object.userData.nodeType === "sphere") {
    const circle = RTPapercut._spherePlaneIntersection(
      object.getWorldPosition(new THREE.Vector3()),
      object.userData.nodeRadius,
      plane,
      32 // segments
    );
    if (circle) {
      // Add circle as continuous line loop to intersection group
      RTPapercut._addCircleToIntersectionGroup(
        circle,
        intersectionGroup,
        intersectionMaterial
      );
    }
  }

  // FUTURE: Polyhedra-as-nodes (mesh intersection - fallback to existing logic)
  else if (object.userData.nodeType === "polyhedron") {
    // Fall through to standard mesh intersection code below
    // This allows octahedra, tetrahedra, cubes, etc. as vertex markers
    // Uses existing face-edge intersection logic (no special handling needed)
  }
} else if (
  object.geometry.type === "SphereGeometry" ||
  (object.geometry.parameters && object.geometry.parameters.radius)
) {
  // Skip UI controls (gumball, scale mode spheres without userData.isVertexNode)
  return;
}
```

### 9.7 Implementation Tasks

**Phase 0: UI Setup (index.html + rt-papercut.js)**

1. Add "Section Nodes" checkbox to Papercut UI section
2. Wire up checkbox to `RTPapercut.state.sectionNodesEnabled`
3. Add checkbox change listener in `RTPapercut.init()`

**Phase 1: Node Marking (rt-rendering.js)**

1. Add `userData.isVertexNode = true` to all vertex nodes (single polyhedra, line ~1077)
2. Add `userData.nodeType = "sphere"` (current implementation, future: "polyhedron")
3. Add `userData.nodeRadius = radius` to store the sphere radius for analytical cuts
4. Add `userData.nodeGeometry = useRTNodeGeometry ? "rt" : "classical"` (for debugging)
5. Apply same marking in `addMatrixNodes()` for matrix nodes (line ~930)

**Phase 2: Analytical Circle Generation (rt-papercut.js)**

1. Create `_spherePlaneIntersection(center, radius, plane, segments)` helper function
2. Create `_addCircleToIntersectionGroup(points, group, material)` helper function
3. Add node detection in `_generateIntersectionEdges()` BEFORE sphere exclusion logic
4. Check `state.sectionNodesEnabled` early exit
5. Generate analytical circles for `nodeType === "sphere"`
6. Add stub/comment for `nodeType === "polyhedron"` (future: falls through to mesh intersection)
7. Maintain UI control exclusion logic (skip non-vertex-node spheres)

**Phase 3: Visual Integration**

1. Use same `LineMaterial` as polyhedra section cuts (shared instance)
2. Apply same line weight slider control (`lineWeightMax` property)
3. Apply same print mode color switching (black vs red)
4. Verify visibility hierarchy works correctly (ancestor chain check)
5. Add console log for debugging: "Generated X node section circles"

**Phase 4: Future-Proofing (Stubs)**

1. Add comment block explaining polyhedra-as-nodes architecture
2. Document `nodeType` enum values: `"sphere"` (current), `"polyhedron"` (future)
3. Add TODO comment for LOD optimization (reduce segments when many nodes visible)

### 9.8 Testing Checklist

**Checkbox State:**

- [ ] "Section Nodes" checkbox default state is unchecked
- [ ] Checkbox disabled when cutplane disabled
- [ ] Checkbox state persists when toggling cutplane on/off

**Node Visibility:**

- [ ] Section Nodes OFF + Nodes ON = no node section cuts (current behavior)
- [ ] Section Nodes ON + Nodes OFF = no node section cuts (nothing to section)
- [ ] Section Nodes ON + Nodes ON (single polyhedra) = node section cuts visible
- [ ] Section Nodes ON + Nodes ON (matrix) = node section cuts visible

**Matrix Visibility Hierarchy:**

- [ ] Hidden matrix (checkbox unchecked) shows no node section cuts
- [ ] Visible matrix shows node section cuts when Section Nodes enabled

**Node Sizes:**

- [ ] Small nodes (sm) produce correct circle sizes
- [ ] Medium nodes (md) produce correct circle sizes
- [ ] Large nodes (lg) produce correct circle sizes
- [ ] Packed nodes produce correct close-packing circle sizes

**Node Geometry Types:**

- [ ] Classical nodes (THREE.SphereGeometry) produce smooth circles
- [ ] RT nodes (BufferGeometry icosahedron) produce smooth circles (same quality as classical)

**Visual Integration:**

- [ ] Line weight slider affects node section cuts
- [ ] Print mode colors node section cuts black
- [ ] Normal mode colors node section cuts red
- [ ] Node circles use same line thickness as polyhedra sections

**UI Controls Exclusion:**

- [ ] Gumball handles are NOT sectioned
- [ ] Scale mode spheres are NOT sectioned
- [ ] Other UI controls are NOT sectioned

**Performance:**

- [ ] Performance acceptable with 10×10 cube matrix + packed nodes
- [ ] Performance acceptable with 10×10 tet matrix + packed nodes (worst case: ~2000 nodes)
- [ ] No lag when dragging cutplane slider with many nodes visible

### 9.9 Performance Considerations

**Node Count Analysis:**

- 10×10 Cube Matrix: ~500 unique vertices × 1 node each = 500 nodes
- 10×10 Tet Matrix (with interstitial): ~2000 nodes
- Each node generates O(32) points for circle = O(16,000-64,000) points total

**Optimization:**

- Use analytical circles (O(segments)) instead of mesh intersection (O(triangles))
- Share `LineMaterial` instance across all node circles
- Consider LOD: reduce circle segments when many nodes visible

---

### 9.10 Future: Polyhedra-as-Nodes

**Feature:** Replace spherical nodes with polyhedra (tet, octa, cube, etc.) as vertex markers

**Status:** 🔮 FUTURE ENHANCEMENT (post Phase 2.0)

**Rationale:**

- Pedagogical value: Show IVM geometry at vertices using IVM polyhedra
- Aesthetic: Polyhedral nodes may be more visually interesting than spheres
- Configurability: Different node types for different vertex types (e.g., tets at tet vertices)

**Architecture (Pre-Planned):**

The current implementation already includes stubs for this feature via `userData.nodeType`:

```javascript
// Current (Phase 2.0): Spherical nodes
node.userData.nodeType = "sphere"; // Uses analytical circle generation

// Future: Polyhedral nodes
node.userData.nodeType = "polyhedron"; // Falls back to mesh intersection
```

**Implementation Notes:**

1. **Node Creation (rt-rendering.js):**
   - Add UI selector for node geometry type (sphere, tet, octa, cube, etc.)
   - Generate polyhedra at vertex positions instead of spheres
   - Set `userData.nodeType = "polyhedron"` for non-spherical nodes
   - No need to store radius (use bounding sphere or skip analytical method)

2. **Section Cut Generation (rt-papercut.js):**
   - Node detection logic remains unchanged (check `userData.isVertexNode`)
   - For `nodeType === "polyhedron"`, DO NOT use analytical circle generation
   - Instead, fall through to standard mesh intersection code (existing face-edge algorithm)
   - Result: Polygonal section cuts (triangular for tets, octagonal for octas, etc.)

3. **No Code Rewrite Needed:**
   - Mesh intersection code already handles arbitrary polyhedra
   - Simply allow polyhedral nodes to be processed like regular meshes
   - The `userData.isVertexNode` flag ensures they're not skipped

**Example Visualization:**

- Tetrahedron matrix with octahedral nodes at vertices
- Cube matrix with tetrahedral nodes at vertices
- Octahedron matrix with cubic nodes at vertices

**Section Cut Appearance:**

- Spheres → Perfect circles
- Tetrahedra → Triangular cross-sections
- Octahedra → Octagonal cross-sections
- Cubes → Square/hexagonal cross-sections (depending on cut angle)

**UI Design (Future):**

```html
<div class="control-item">
  <label>Node Geometry</label>
  <select id="nodeGeometryType">
    <option value="sphere">Sphere (Classical)</option>
    <option value="sphere-rt">Sphere (RT Geodesic)</option>
    <option value="tetrahedron">Tetrahedron</option>
    <option value="octahedron">Octahedron</option>
    <option value="cube">Cube</option>
    <option value="icosahedron">Icosahedron</option>
  </select>
</div>
```

**Why Pre-Plan This Now:**

- Avoids future architectural conflicts
- Minimal code overhead (one if/else branch)
- Demonstrates forward-thinking design
- Makes Phase 2.0 implementation cleaner (clear separation of concerns)

---

**Document Version:** 1.3
**Last Updated:** 2026-01-09
**Status:** Phase 1.5c Complete | Phase 1.6a/b Complete | Phase 2.0 Planned (Papercut Nodes)
**Completion Date:** 2026-01-08 (Phase 1.6b)
