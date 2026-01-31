# Coordinates System - Implementation Roadmap

## Quick Start for New Agent

**Branch**: `FOOTER-COORDINATES`
**Status**: Absolute mode working, Relative mode next, module extraction recommended
**Goal**: Complete coordinate display system with Absolute/Relative/Group Centre modes

### TL;DR - What This Document Covers

This document specifies a **coordinate display system** for ARTexplorer that:

1. **Shows object transforms** in the footer panel (XYZ + WXYZ position, rotation)
2. **Supports three modes**: Absolute (world), Relative (local), Group Centre (multi-select)
3. **Reads from StateManager** - display is a window into persisted state, not transient
4. **Recommends extraction** to `rt-coordinates.js` module using shadow/switchover pattern

### Key Design Decisions (Already Made)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Source of truth** | StateManager | Display matches JSON export; bi-directional input modifies state |
| **Relative mode meaning** | Local transform from Form identity | NOT transient delta; persists across selection changes |
| **Group Centre behavior** | Third button, only when 2+ selected | Changes rotation/scale pivot to centroid |
| **Module extraction** | Yes, `rt-coordinates.js` | 60+ duplicate getElementById calls, 6 WXYZ conversion blocks |

### Current State (Jan 30, 2026)

**Completed:**
- [x] **Absolute/Relative toggle buttons** - Added to footer (far right)
- [x] **Mutually exclusive toggle** - Buttons work as radio group
- [x] **Selection updates coordinates** - Selecting object shows its position (Absolute)
- [x] **`updateCoordinateDisplay(pos)`** - Helper function in rt-init.js (lines 951-990)

**Next Steps (in order):**
1. [ ] Create `modules/rt-coordinates.js` skeleton with `USE_COORDINATE_MODULE = false`
2. [ ] Add `localRotation`/`localScale` fields to StateManager instance schema
3. [ ] Implement mode-aware display (reads from StateManager based on active mode)
4. [ ] Add Group Centre button (disabled when <2 objects selected)
5. [ ] Switchover: replace 6 duplicate WXYZ blocks with single module call

### Files to Modify

| File | What to Do |
|------|------------|
| `modules/rt-coordinates.js` | **CREATE** - New module (~200 lines) |
| `modules/rt-init.js` | Add flag, import, replace duplicate blocks |
| `modules/rt-state-manager.js` | Add `localRotation`, `localScale` to instance schema |
| `index.html` | Add Group Centre button (lines ~425-443) |
| `art.css` | Add disabled state styling for Group Centre |

### Don't Re-Litigate

The following were discussed and decided:
- ✅ Both Absolute and Relative show **persisted state** (not transient deltas)
- ✅ Relative mode shows local transform (how different from Form's identity)
- ✅ Group Centre changes the **rotation pivot**, not just the display
- ✅ Node selection defines pivot point, not coordinate system (gumball stays world-aligned)
- ✅ Module extraction uses shadow/switchover pattern (see `rt-ui-bindings.js` as precedent)

---

## Coordinate Mode Definitions

### Absolute Mode (Default)
Coordinates shown relative to **world origin (Alpha = 0,0,0)**:
- Select any object → display shows its world position
- During move → display updates to show new world position
- Reference point: Always the world origin

### Relative Mode
Coordinates shown relative to **the selected object itself**:
- Select any object → display shows **0,0,0** (it IS the origin)
- During move → display shows **delta from start position**
- Reference point: The object's position at moment of selection

**CORRECTED Understanding**: Relative mode shows the object's **stored local transform** (how different from Form's identity), NOT a transient delta that resets. This is persisted state, just like Absolute.

**Key insight**: Both modes show persisted StateManager values - Absolute shows "where in the world", Relative shows "how transformed from Form's default".

### Group Centre Mode (Multi-Select Only)
Coordinates shown relative to **calculated centroid of all selected objects**:
- Multi-select 2+ objects → display shows centroid's world position
- During move → centroid position updates (all objects move together)
- During rotate → objects rotate AROUND the centroid (not individual origins)
- Reference point: Dynamically calculated center of all selected objects

**Key insight**: Group Centre treats the selection AS a group - like grabbing multiple objects and rotating them around their collective center of mass.

#### Group Centre vs Primary Object

| Aspect | Primary Object (Current) | Group Centre |
|--------|-------------------------|--------------|
| **Coordinate display** | First-selected object's position | Calculated centroid of all |
| **Rotation pivot** | editingBasis at primary's origin | editingBasis at centroid |
| **Move behavior** | Same (delta-based preserves relative positions) | Same |
| **Scale behavior** | Each scales from own center | All scale from centroid |
| **Use case** | "Move this group, track this specific object" | "Treat selection as one unified object" |

#### Historical Context

Group Centre was the original multi-select rotation behavior (~12 commits ago). It was changed to Primary Object because:

1. **Conflict with node-based connection**: When connecting multi-point polyhedra at a specific node, the rotation center needed to be that node, not the group centroid
2. **Predictability**: Users often want to rotate around a known point (their primary selection) rather than an abstract calculated center
3. **Node selection paradigm**: With vertex mode now supporting node-based origins, Group Centre became redundant for many use cases

However, Group Centre remains valuable for:
- Architectural/CAD workflows where you want to rotate a group around its center
- Symmetry operations where centroid is the natural pivot
- Cases where no single object is the "primary" - all are equally important

#### Implementation Considerations

```javascript
// Calculate group centroid
function calculateGroupCentroid(selectedObjects) {
  const centroid = new THREE.Vector3();
  selectedObjects.forEach(obj => centroid.add(obj.position));
  centroid.divideScalar(selectedObjects.length);
  return centroid;
}

// Toggle determines rotation center
let rotationCenter;
if (coordinateMode === 'group-centre') {
  rotationCenter = calculateGroupCentroid(selectedPolyhedra);
} else {
  // Absolute or Relative: use editingBasis position (primary or node)
  rotationCenter = editingBasis.position;
}
```

---

## StateManager as Source of Truth

The coordinate display is a **persistent window into StateManager**, not a transient operation display. Both Absolute and Relative modes show stored state that would be saved to JSON export.

### What Each Mode Displays

| Mode | Position Display | Rotation Display | Bi-directional Input |
|------|-----------------|------------------|---------------------|
| **Absolute** | `instance.worldPosition` | `instance.worldRotation` | Type value → move to world position |
| **Relative** | `instance.localPosition` (offset from Form origin) | `instance.localRotation` (delta from Form identity) | Type value → apply local offset |
| **Group Centre** | Calculated centroid of all selected | N/A (use for pivot only) | Type value → move centroid to position |

### Clock Face Example

Imagine cubes placed on a clock face, world origin at center:

**Absolute Mode:**
1. Place cube at 3 o'clock position
2. Rotate cube -90° around world origin to 12 o'clock
3. Select cube → display shows world rotation: -90°
4. Click away, select other objects, return to 12 o'clock cube
5. Display STILL shows -90° (persisted world state)

**Relative Mode:**
1. Cube at 3 o'clock, no local rotation applied yet
2. Select cube → display shows 0° (no local rotation)
3. Apply 45° local rotation (cube spins in place at 3 o'clock)
4. Display shows 45° (stored local rotation)
5. Click away, select other objects, return to cube
6. Display STILL shows 45° (persisted local state)
7. Type 0° in rotation field → cube rotates back to Form's identity orientation

### StateManager Schema Extension

Currently StateManager stores world transforms. For Relative mode, we need local transforms:

```javascript
// In rt-state-manager.js - instance record structure
instance: {
  id: "cube_001",
  formId: "Cube",

  // Absolute mode reads these (world space)
  position: { x: 1.5, y: 0, z: 0 },           // World position
  rotation: { x: 0, y: 0, z: -1.5708, w: 1 }, // World rotation (quaternion)
  scale: { x: 1, y: 1, z: 1 },                // World scale

  // Relative mode reads these (local space, delta from Form identity)
  localRotation: { x: 0, y: 0, z: 0.7854, w: 1 }, // 45° local spin
  localScale: { x: 1.5, y: 1.5, z: 1.5 },         // 1.5x local scale
  // Note: localPosition would be offset from where Form was instantiated
}
```

**Location**: `modules/rt-state-manager.js` lines ~200-300 (instance creation/update methods)

### Computing Local from World (Alternative)

If we don't want to store local transforms separately, we can compute them:

```javascript
// In rt-init.js or rt-state-manager.js
function getLocalRotation(instance) {
  const formIdentity = new THREE.Quaternion(); // Form's default orientation
  const worldQuat = new THREE.Quaternion(
    instance.rotation.x,
    instance.rotation.y,
    instance.rotation.z,
    instance.rotation.w
  );
  // Local = inverse(formIdentity) * world
  // Since formIdentity is identity quaternion, local = world in this case
  // But if Forms had non-identity orientations, this would differ
  return worldQuat;
}
```

---

## Edge Cases and Special Scenarios

### Edge Case 1: Three Points → Planar Centroid

Three Point instances individually have no inherent rotation (0D objects), but:
- 3 Points define a plane
- Group Centre calculates centroid of those 3 Points
- Rotation around centroid causes Points to **orbit** (no self-spin, Points have no orientation)

```javascript
// Points orbit but don't spin (no local rotation to change)
selectedPoints.forEach((point, index) => {
  const offset = point.position.clone().sub(centroid);
  const rotatedOffset = offset.applyAxisAngle(axis, angle);
  point.position.copy(centroid.clone().add(rotatedOffset));
  // No quaternion change - Points have no orientation
});
```

### Edge Case 2: Node-Selected Cube Rotation (Absolute vs Relative)

When rotating a cube around a selected corner node:

| Mode | Pivot Point | What Display Shows |
|------|-------------|-------------------|
| **Absolute** | Selected node | Accumulated world rotation (e.g., 45° from world identity) |
| **Relative** | Selected node | Accumulated local rotation (e.g., 45° from Form identity) |

The **pivot point** (selected node) is the same in both modes. The difference is purely in **what the coordinate display means**.

**Important**: The node just defines the pivot point, not the coordinate system. Gumball axes remain world-aligned (Cartesian X/Y/Z or Quadray W/X/Y/Z). Rotating around the Cartesian X axis with a corner node selected still rotates around world-X, just pivoting at that corner instead of the centroid.

### Edge Case 3: World-Space vs Object-Space Transforms

Current implementation uses **world-space** gumball axes. A separate future feature could add object-space transforms:

| Transform Space | Gumball Axes | Use Case |
|----------------|--------------|----------|
| **World-space** (current) | Aligned to world X/Y/Z | "Move this cube north" |
| **Object-space** (future) | Aligned to object's current orientation | "Move this cube forward (relative to where it's facing)" |

This is orthogonal to Absolute/Relative coordinate display - it affects the gumball handle orientations, not what the display shows.

### Edge Case 4: Switching Modes Mid-Selection

User has cube selected, display showing Absolute position (1.5, 0, 0):
1. Click "Relative" button
2. Display should update to show local transform (e.g., local rotation 45° if applied)
3. Click "Absolute" button
4. Display returns to world position (1.5, 0, 0)

No transform is applied - only the display mode changes.

---

## Complete Scenario Matrix

### Position (Move) Scenarios

| Scenario | Absolute Mode | Relative Mode | Group Centre Mode |
|----------|--------------|---------------|-------------------|
| **Single object selected** | Shows stored world position | Shows local offset from Form origin | N/A (requires 2+) |
| **Single object during move** | Updates to new world position | Updates local offset | N/A |
| **Multi-select (2+ objects)** | Shows primary's world pos | Shows primary's local offset | Shows centroid position |
| **Multi-select during move** | Updates primary's world pos | Updates primary's local offset | Updates centroid pos |
| **Node selected (vertex mode)** | Shows node's world position | Shows node's local offset | N/A |
| **Node-based move** | Shows polyhedron's world pos | Shows polyhedron's local offset | N/A |

### Rotation Scenarios

| Scenario | Absolute Mode | Relative Mode | Group Centre Mode |
|----------|--------------|---------------|-------------------|
| **Single object selected** | Shows stored world rotation | Shows stored local rotation | N/A (requires 2+) |
| **Single object during rotate** | Updates to new world rotation | Updates local rotation | N/A |
| **Multi-select rotation** | Shows primary's world rotation | Shows primary's local rotation | Pivot at centroid* |
| **Node-based rotate** | Shows polyhedron's world rotation | Shows polyhedron's local rotation | N/A |

*Group Centre rotation: Objects orbit around the calculated centroid while also rotating themselves. This is the "rotate as a group" behavior useful for architectural layouts.

**Key Point**: Both Absolute and Relative show **persisted StateManager values**, not transient deltas. Clicking away and returning shows the same values. Manual input modifies the stored state.

### Scale Scenarios

| Scenario | Absolute Mode | Relative Mode | Group Centre Mode |
|----------|--------------|---------------|-------------------|
| **Single object selected** | Shows stored scale (1,1,1 default) | Shows stored local scale | N/A (requires 2+) |
| **Single object during scale** | Updates current scale | Updates local scale | N/A |
| **Multi-select scale** | Shows primary's scale | Shows primary's local scale | Scale from centroid* |
| **Node-based scale** | Shows polyhedron's scale | Shows polyhedron's local scale | N/A |

*Group Centre scaling: Objects scale toward/away from the calculated centroid, not their individual centers. This creates "expand/contract" behavior for the group as a whole.

---

## Scale Factor Display (Future Enhancement)

Currently not shown in UI, but stored in StateManager records. Proposed addition:

### UI Layout
Add scale factor inputs directly **below the XYZ Position inputs**:
```
Position:  [X: 1.2345] [Y: 0.0000] [Z: -0.5678]
Scale:     [X: 1.0000] [Y: 1.0000] [Z: 1.0000]
```

### Display Logic by Mode

| Mode | Scale Display |
|------|---------------|
| **Absolute** | Current scale factors (1.0 = original size) |
| **Relative** | Always shows 1,1,1 at selection; shows multiplier during scale operation |
| **Group Centre** | Shows uniform scale factor being applied to group |

### Implementation Note
Scale is stored per-object in `poly.userData.currentScale` and per-dimension if non-uniform scaling is applied. The StateManager tracks this for undo/redo.

---

## Implementation Phases

### Phase 1: Selection-Based Display - DONE

| Task | Status | Notes |
|------|--------|-------|
| Add `updateCoordinateDisplay(pos)` function | Done | Reusable helper |
| Call on `selectPolyhedron()` | Done | Shows selected object position |
| Clear display on deselect | TODO | Show 0,0,0 when nothing selected |

### Phase 2: Relative Mode - IN PROGRESS

| Task | Status | Notes |
|------|--------|-------|
| Add toggle buttons to footer | Done | Absolute/Relative, far right |
| Store mode state in variable | TODO | `let coordinateMode = 'absolute'` |
| Add `localRotation` to StateManager | TODO | Store local transform separately |
| Add `localScale` to StateManager | TODO | Store local scale separately |
| Relative: read local transforms on select | TODO | From StateManager, not computed |
| Relative: update local transforms on drag | TODO | Persist to StateManager |
| Relative: bi-directional input | TODO | Type value → apply as local offset |

### Phase 3: Multi-Select Handling

| Task | Status | Notes |
|------|--------|-------|
| Define "primary" object for display | Existing | First selected = primary |
| Absolute: show primary's position | Done | Already works |
| Relative: show 0,0,0 for primary | TODO | Same as single select |
| Multi-move delta tracking | TODO | Track primary's start pos |

### Phase 3B: Group Centre Mode

| Task | Status | Notes |
|------|--------|-------|
| Add Group Centre toggle button | TODO | Third button below Absolute/Relative |
| Calculate group centroid function | TODO | Average position of all selected |
| Group Centre: show centroid position | TODO | Display calculated centroid |
| Group Centre rotation pivot | TODO | Set editingBasis at centroid |
| Group Centre scale origin | TODO | Scale toward/away from centroid |
| Disable when <2 objects selected | TODO | Grey out or hide button |
| Show editing basis at centroid | TODO | Visual indicator of group center |

### Phase 4: Node-Based Coordinates

| Task | Status | Notes |
|------|--------|-------|
| Node select shows node position | TODO | Use node's world pos, not centroid |
| Node-based move updates correctly | TODO | Show polyhedron pos during move |
| Relative mode with node selected | TODO | Show 0,0,0, then delta |

### Phase 5: Input Field Bi-directional

| Task | Status | Notes |
|------|--------|-------|
| Absolute: typing moves to world pos | Existing | Works |
| Relative: typing moves by delta | TODO | Add offset to current pos |

---

## Technical Implementation

### State Variables Needed

**Location**: `modules/rt-init.js` near line 630 (with other state variables)

```javascript
let coordinateMode = 'absolute'; // 'absolute', 'relative', or 'group-centre'
let groupCentroid = null; // Calculated centroid for group-centre mode
// Note: No reference variables needed - we read from StateManager, not track deltas
```

### Centroid Calculation

**Location**: `modules/rt-init.js` or `modules/rt-math.js`

```javascript
function calculateGroupCentroid(selectedObjects) {
  if (selectedObjects.length < 2) return null;

  const centroid = new THREE.Vector3();
  selectedObjects.forEach(obj => centroid.add(obj.position));
  centroid.divideScalar(selectedObjects.length);
  return centroid;
}
```

### Reading from StateManager

**Location**: `modules/rt-init.js` - new helper functions

```javascript
/**
 * Get coordinate display values based on current mode
 * Reads from StateManager - this is the source of truth
 * @param {THREE.Object3D} object - Selected object
 * @returns {Object} { position: Vector3, rotation: Euler/Quaternion }
 */
function getCoordinateDisplayValues(object) {
  const instanceId = object.userData.instanceId;
  const instance = RTStateManager.getInstance(instanceId);

  if (!instance) {
    console.warn('⚠️ No StateManager record for object');
    return { position: object.position.clone(), rotation: object.rotation.clone() };
  }

  if (coordinateMode === 'absolute') {
    // Return world transforms from StateManager
    return {
      position: new THREE.Vector3(instance.position.x, instance.position.y, instance.position.z),
      rotation: instance.rotation // Euler or Quaternion depending on storage
    };

  } else if (coordinateMode === 'relative') {
    // Return local transforms from StateManager
    // These represent "how different from Form's identity"
    return {
      position: instance.localPosition
        ? new THREE.Vector3(instance.localPosition.x, instance.localPosition.y, instance.localPosition.z)
        : new THREE.Vector3(0, 0, 0), // No local offset = at Form origin
      rotation: instance.localRotation || { x: 0, y: 0, z: 0 } // No local rotation = Form identity
    };

  } else if (coordinateMode === 'group-centre') {
    // Return centroid position (rotation N/A for group centre display)
    const selected = getSelectedPolyhedra();
    const centroid = calculateGroupCentroid(selected);
    return {
      position: centroid || object.position.clone(),
      rotation: null // Group centre doesn't display rotation
    };
  }
}
```

### Mode Toggle Handler (Corrected)

**Location**: `modules/rt-init.js` near line 833 (existing toggle handler)

```javascript
// Coordinate mode toggle (Absolute/Relative/Group Centre)
document.querySelectorAll("[data-coord-mode]").forEach(btn => {
  btn.addEventListener("click", function () {
    const newMode = this.dataset.coordMode;
    const selected = getSelectedPolyhedra();

    // Validate Group Centre requires 2+ objects
    if (newMode === 'group-centre' && selected.length < 2) {
      console.warn('⚠️ Group Centre requires 2+ selected objects');
      return; // Don't switch mode
    }

    // Update mode
    coordinateMode = newMode;

    // Update button states
    document.querySelectorAll("[data-coord-mode]").forEach(b => b.classList.remove("active"));
    this.classList.add("active");

    // Update display based on new mode (reads from StateManager)
    if (selected.length > 0) {
      const displayValues = getCoordinateDisplayValues(selected[0]);
      updateCoordinateDisplay(displayValues.position);
      if (displayValues.rotation) {
        updateRotationDisplay(displayValues.rotation);
      }
    }

    // For Group Centre, also move editingBasis to centroid
    if (coordinateMode === 'group-centre' && editingBasis) {
      groupCentroid = calculateGroupCentroid(selected);
      if (groupCentroid) {
        editingBasis.position.copy(groupCentroid);
      }
    }

    console.log(`📍 Coordinate mode: ${coordinateMode}`);
  });
});
```

### Updating StateManager on Input

**Location**: `modules/rt-init.js` - coordinate input handlers (existing, needs modification)

```javascript
// When user types in coordinate field (bi-directional input)
document.getElementById("coordX").addEventListener("change", function() {
  const selected = getSelectedPolyhedra();
  if (selected.length === 0) return;

  const newValue = parseFloat(this.value);
  const object = selected[0];
  const instanceId = object.userData.instanceId;

  if (coordinateMode === 'absolute') {
    // Move to absolute world position
    object.position.x = newValue;
    RTStateManager.updateInstancePosition(instanceId, object.position);

  } else if (coordinateMode === 'relative') {
    // Apply as local offset from current position
    // newValue represents "how far from Form origin"
    const formOrigin = getFormOrigin(object); // Would need to implement
    object.position.x = formOrigin.x + newValue;
    RTStateManager.updateInstanceLocalPosition(instanceId, { x: newValue, y: ..., z: ... });
  }
});
```

### Rotation Center Selection (Unchanged)

**Location**: `modules/rt-init.js` - used in rotation drag handler (~line 3234)

```javascript
function getRotationCenter() {
  if (coordinateMode === 'group-centre') {
    const selected = getSelectedPolyhedra();
    return calculateGroupCentroid(selected) || editingBasis.position;
  }
  // Absolute or Relative: use editingBasis position (primary object or node)
  return editingBasis ? editingBasis.position : new THREE.Vector3(0, 0, 0);
}
```

### Selection Handler Update

**Location**: `modules/rt-init.js` - `selectPolyhedron()` function (~line 1896)

```javascript
// In selectPolyhedron(), after setting selection:
// Update coordinate display based on current mode
const displayValues = getCoordinateDisplayValues(polyhedron);
updateCoordinateDisplay(displayValues.position);
if (displayValues.rotation) {
  updateRotationDisplay(displayValues.rotation);
}
```

---

## Coordinate Display Fields

```
Position (XYZ):    coordX, coordY, coordZ
Position (WXYZ):   coordW, coordX2, coordY2, coordZ2
Rotation (XYZ):    rotXDegrees, rotYDegrees, rotZDegrees (+ spread)
Rotation (WXYZ):   rotWDegrees, rotXQDegrees, rotYQDegrees, rotZQDegrees (+ spread)
```

---

## UI Layout

Footer panel (left to right):
1. XYZ Position inputs
2. WXYZ Position inputs
3. (Future) Scale Factor inputs below XYZ Position
4. Divider
5. XYZ Rotation inputs (degrees + spread)
6. WXYZ Rotation inputs (degrees + spread)
7. Coordinate Mode toggle (far right, stacked vertically):
   ```
   [Absolute]     ← Default, always available
   [Relative]     ← Always available
   [Group Centre] ← Only enabled when 2+ objects selected
   ```

### Button States
- **Active**: Amber text (matches existing toggle button style)
- **Inactive**: Grey text
- **Disabled** (Group Centre with <2 selected): Dimmed, non-clickable

---

## Related Files with Line References

### `index.html`
- **Lines 425-443**: Absolute/Relative toggle buttons in footer
- **Footer panel structure**: Coordinate input fields (coordX, coordY, coordZ, etc.)

### `art.css`
- **Lines 2296-2309**: `.coords-mode-group` styling (far-right positioning, vertical stack)

### `modules/rt-init.js`
- **Line ~630**: State variables (`selectedPolyhedra`, `editingBasis`, etc.) - add `coordinateMode` here
- **Lines 833-848**: Coordinate mode toggle handler (currently just logs, needs update)
- **Lines 951-990**: `updateCoordinateDisplay(pos)` function
- **Line ~1896**: `selectPolyhedron()` - calls `updateCoordinateDisplay()` on selection
- **Lines 3234-3362**: Rotation drag handler - uses `rotationCenter` (needs `getRotationCenter()`)
- **Lines 2768-2790**: Drag start - stores initial quaternions/positions

### `modules/rt-state-manager.js`
- **Lines ~200-300**: Instance creation methods - need to add `localRotation`, `localScale` fields
- **Lines 546-556**: `getSelectedVertices()` - for node-based coordinate display
- **Lines ~400-450**: `updateInstance()` methods - need local transform update methods

### `modules/rt-math.js`
- Quadray conversion functions for WXYZ display

---

## Recommended Refactoring: `rt-coordinates.js` Module

### Why Extract Now?

The coordinate display system is about to grow significantly with:
- Absolute/Relative/Group Centre modes
- StateManager integration
- Local transform storage
- Bi-directional input handling

Currently, coordinate-related code is scattered across rt-init.js:
- **60+ getElementById calls** for coord/rotation fields
- **6 duplicate WXYZ conversion blocks** in drag handlers
- **~200 lines** of coordinate input/display logic

### Proposed Module Structure

```javascript
// rt-coordinates.js - Coordinate Display System
export const RTCoordinates = {
  // ========================================================================
  // STATE
  // ========================================================================
  mode: 'absolute', // 'absolute' | 'relative' | 'group-centre'
  groupCentroid: null,

  // DOM element cache (initialized once, avoids repeated getElementById)
  elements: null,

  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  init() {
    // Cache all coordinate DOM elements
    this.elements = {
      coordX: document.getElementById('coordX'),
      coordY: document.getElementById('coordY'),
      coordZ: document.getElementById('coordZ'),
      coordW: document.getElementById('coordW'),
      coordX2: document.getElementById('coordX2'),
      coordY2: document.getElementById('coordY2'),
      coordZ2: document.getElementById('coordZ2'),
      rotXDegrees: document.getElementById('rotXDegrees'),
      // ... etc
    };
    console.log('✅ RTCoordinates initialized');
  },

  // ========================================================================
  // CORE DISPLAY FUNCTIONS
  // ========================================================================

  /**
   * Update position display (XYZ + auto-convert to WXYZ)
   * Replaces 6 duplicate blocks in rt-init.js drag handlers
   */
  updatePositionDisplay(pos, Quadray) {
    if (!pos || !this.elements.coordX) return;

    // XYZ
    this.elements.coordX.value = pos.x.toFixed(4);
    this.elements.coordY.value = pos.y.toFixed(4);
    this.elements.coordZ.value = pos.z.toFixed(4);

    // WXYZ conversion
    const basisVectors = Quadray.basisVectors;
    let wxyz = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      wxyz[i] = pos.dot(basisVectors[i]);
    }
    const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
    wxyz = wxyz.map(c => c - mean);

    this.elements.coordW.value = wxyz[0].toFixed(4);
    this.elements.coordX2.value = wxyz[1].toFixed(4);
    this.elements.coordY2.value = wxyz[2].toFixed(4);
    this.elements.coordZ2.value = wxyz[3].toFixed(4);
  },

  /**
   * Update rotation display (Euler → degrees + spread)
   */
  updateRotationDisplay(rotation, RT) {
    // Implementation
  },

  /**
   * Get display values based on current mode (reads from StateManager)
   */
  getDisplayValues(object, RTStateManager) {
    const instanceId = object.userData.instanceId;
    const instance = RTStateManager.getInstance(instanceId);

    if (this.mode === 'absolute') {
      return { position: instance.position, rotation: instance.rotation };
    } else if (this.mode === 'relative') {
      return { position: instance.localPosition, rotation: instance.localRotation };
    } else if (this.mode === 'group-centre') {
      return { position: this.groupCentroid, rotation: null };
    }
  },

  // ========================================================================
  // MODE MANAGEMENT
  // ========================================================================

  setMode(mode, selectedObjects) {
    if (mode === 'group-centre' && selectedObjects.length < 2) {
      console.warn('⚠️ Group Centre requires 2+ selected objects');
      return false;
    }
    this.mode = mode;
    if (mode === 'group-centre') {
      this.groupCentroid = this.calculateGroupCentroid(selectedObjects);
    }
    return true;
  },

  calculateGroupCentroid(objects) {
    if (objects.length < 2) return null;
    const centroid = new THREE.Vector3();
    objects.forEach(obj => centroid.add(obj.position));
    centroid.divideScalar(objects.length);
    return centroid;
  },

  getRotationCenter(editingBasis, selectedObjects) {
    if (this.mode === 'group-centre') {
      return this.calculateGroupCentroid(selectedObjects) || editingBasis?.position;
    }
    return editingBasis?.position || new THREE.Vector3(0, 0, 0);
  },

  // ========================================================================
  // INPUT HANDLERS
  // ========================================================================

  setupInputHandlers(dependencies) {
    // Move coordinate input handlers here from rt-init.js
    // dependencies = { getSelectedPolyhedra, exitToolMode, Quadray, RTStateManager }
  }
};
```

### Shadow & Switchover Process

Following the pattern from `rt-ui-bindings.js` (Jan 30, 2026):

**Phase A: Create Shadow Module**
```javascript
// In rt-init.js (line ~36)
const USE_COORDINATE_MODULE = false; // Testing new coordinate module

// Import new module
import { RTCoordinates } from './rt-coordinates.js';
```

**Phase B: Initialize in Parallel**
```javascript
// In startARTexplorer() after scene init
if (USE_COORDINATE_MODULE) {
  RTCoordinates.init();
  RTCoordinates.setupInputHandlers({ ... });
  console.log('🆕 COORDINATE MODULE: Active');
}
```

**Phase C: Replace Calls Incrementally**
```javascript
// In drag handlers, replace:
document.getElementById("coordX").value = pos.x.toFixed(4);
document.getElementById("coordY").value = pos.y.toFixed(4);
document.getElementById("coordZ").value = pos.z.toFixed(4);
// ... 10 more lines of WXYZ conversion ...

// With:
if (USE_COORDINATE_MODULE) {
  RTCoordinates.updatePositionDisplay(pos, Quadray);
} else {
  // Legacy code (kept until switchover complete)
}
```

**Phase D: Full Switchover**
- Set `USE_COORDINATE_MODULE = true`
- Test all coordinate scenarios
- Remove legacy code blocks
- Remove feature flag

### Benefits After Extraction

| Metric | Before | After |
|--------|--------|-------|
| rt-init.js lines | ~4100 | ~3900 |
| Duplicate WXYZ blocks | 6 | 0 |
| getElementById calls | 60+ | 0 (cached) |
| Mode logic locations | Scattered | 1 file |
| Testable in isolation | No | Yes |

### Files Affected

| File | Changes |
|------|---------|
| `modules/rt-coordinates.js` | **NEW** - ~200 lines |
| `modules/rt-init.js` | Remove ~200 lines, add imports |
| `modules/rt-state-manager.js` | Add `localRotation`, `localScale` fields |
| `index.html` | Add Group Centre button |
| `art.css` | Add disabled state for Group Centre |

---

## Implementation Checklist for Next Session

### Phase 1: Module Creation
1. [ ] Create `modules/rt-coordinates.js` with skeleton structure
2. [ ] Add `USE_COORDINATE_MODULE = false` flag to rt-init.js
3. [ ] Add import statement for new module
4. [ ] Implement `RTCoordinates.init()` with DOM element caching
5. [ ] Implement `RTCoordinates.updatePositionDisplay()`

### Phase 2: StateManager Extension
6. [ ] Add `localRotation` field to instance schema
7. [ ] Add `localScale` field to instance schema
8. [ ] Add `updateInstanceLocalRotation()` method
9. [ ] Add `updateInstanceLocalScale()` method

### Phase 3: Mode Implementation
10. [ ] Implement `RTCoordinates.setMode()`
11. [ ] Implement `RTCoordinates.getDisplayValues()`
12. [ ] Implement `RTCoordinates.getRotationCenter()`
13. [ ] Add mode toggle handler to new module

### Phase 4: UI Updates
14. [ ] Add Group Centre button to index.html
15. [ ] Add disabled state styling to art.css
16. [ ] Wire up mode toggle to RTCoordinates

### Phase 5: Switchover
17. [ ] Replace first drag handler block with module call
18. [ ] Test, then replace remaining 5 blocks
19. [ ] Set `USE_COORDINATE_MODULE = true`
20. [ ] Remove legacy code and feature flag
