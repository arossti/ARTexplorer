# Coordinates System - Implementation Roadmap

## Quick Start for New Agent

**Branch**: `FOOTER-COORDINATES`
**Status**: Module extracted, Group Centre complete, Relative mode and bi-directional input next
**Goal**: Complete coordinate display system with Absolute/Relative/Group Centre modes

### TL;DR - What This Document Covers

This document specifies a **coordinate display system** for ARTexplorer that:

1. **Shows object transforms** in the footer panel (XYZ + QWXYZ position, rotation)
2. **Supports three modes**: Absolute (world), Relative (object-local), Group Centre (multi-select)
3. **Reads from StateManager** - display is a window into persisted state, not transient
4. **Extracted to** `rt-coordinates.js` module using shadow/switchover pattern

### Key Design Decisions (Already Made)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Source of truth** | StateManager | Display matches JSON export; bi-directional input modifies state |
| **Relative mode meaning** | Object-centre coordinates | Shows 0,0,0 at object centre; useful when Forms displaced from world origin |
| **Group Centre behavior** | Third button, only when 2+ selected | Changes rotation/scale pivot to centroid |
| **Module extraction** | Done, `rt-coordinates.js` | DOM caching, single WXYZ conversion, mode management |

### Current State (Feb 1, 2026)

**✅ COMPLETED:**
- [x] **Module extracted** - `rt-coordinates.js` with shadow/switchover pattern (`USE_COORDINATE_MODULE = true`)
- [x] **Absolute/Relative/Group toggle buttons** - Moved under XYZ position (Feb 1)
- [x] **Mutually exclusive toggle** - Buttons work as radio group
- [x] **Selection updates coordinates** - Selecting object shows its position
- [x] **Group Centre button** - Enabled only when 2+ objects selected
- [x] **Group Centre rotation pivot** - Objects rotate around calculated centroid
- [x] **Group Centre gumball positioning** - Editing basis appears at centroid
- [x] **Auto-switch on deselect** - Falls back to Absolute when selection drops below 2
- [x] **DOM element caching** - All coordinate fields cached in module init
- [x] **QWXYZ conversion consolidated** - Single `updatePositionDisplay()` replaces 6 duplicate blocks
- [x] **Rotation input persistence** - All rotation input handlers now persist to StateManager (Feb 1)
- [x] **Quadray label consistency** - Renamed W/X/Y/Z → QW/QX/QY/QZ in footer (Feb 1)
- [x] **Scale input field** - Added Scale display with real-time gumball updates (Feb 1)
- [x] **Scale input handler** - Type scale factor + Enter in Scale mode applies scale (Feb 1)

**🔧 IN PROGRESS / TODO:**
1. [x] **StateManager persistence** - Transforms now saved after gumball operations (commit `4c1021f`)
2. [x] **XYZ rotation display from StateManager** - Works correctly for Cartesian coordinates
3. [x] **Rotation input persistence** - Numerical rotation inputs now persist to StateManager (Feb 1 fix)
4. [x] **Position input persistence** - XYZ and QWXYZ position inputs now persist to StateManager (Feb 1)
5. [ ] **QWXYZ rotation storage** - Add `quadrayRotation` field to StateManager (decision made Feb 1)
6. [ ] **QWXYZ rotation display** - Absolute=cumulative, Relative=tool mode (decision made Feb 1)
7. [ ] **Relative mode implementation** - Currently shows same as Absolute (see below)
8. [ ] **Add local transform fields to StateManager** - `localPosition`, `localRotation`, `localScale`
9. [ ] **Node-based coordinate display** - Show node position when vertex selected
10. [ ] **Remove legacy coordinate code from rt-init.js** - Full switchover cleanup

### Files Modified

| File | Status | Changes |
|------|--------|---------|
| `modules/rt-coordinates.js` | **NEW** (~430 lines) | Complete module with mode management, display, Group Centre |
| `modules/rt-init.js` | Modified | Feature flag, imports, gumball positioning, rotation center, rotation input persistence |
| `modules/rt-state-manager.js` | TODO | Need `localPosition`, `localRotation`, `localScale` fields |
| `index.html` | Modified | Added Group Centre button |
| `art.css` | Modified | Added disabled state styling for Group Centre |

### Commits on FOOTER-COORDINATES Branch

1. `3bf9788` - Docs: Comprehensive Coordinates.md workplan
2. `ee44523` - Feat: Add rt-coordinates.js module with shadow/switchover pattern
3. `406c126` - Feat: Add Group Centre mode with centroid-based rotation
4. `ea9335a` - Fix: Position gumball at group centroid in Group Centre mode
5. `a6a312e` - Fix: Absolute mode reads rotation from StateManager correctly
6. `4c1021f` - Fix: Persist transforms to StateManager after gumball operations
7. `pending` - Fix: Persist rotation from numerical input to StateManager

---

## Quadray Axis Index Mapping: Why `{qw: 3, qx: 0, qy: 2, qz: 1}`?

The seemingly arbitrary index mapping `{qw: 3, qx: 0, qy: 2, qz: 1}` (defined in `Quadray.AXIS_INDEX` in `rt-math.js`) arises from two independent conventions colliding:

### 1. The `basisVectors` Array Order (Geometric)

The Quadray basis vectors are stored in an array ordered by their Cartesian coordinate patterns (following Tom Ace / Kirby Urner's original C++ implementation):

```javascript
basisVectors = [
  ( 1,  1,  1)/√3   // index 0 - "A" - top-front-right
  ( 1, -1, -1)/√3   // index 1 - "B" - bottom-back-right
  (-1,  1, -1)/√3   // index 2 - "C" - bottom-front-left
  (-1, -1,  1)/√3   // index 3 - "D" - top-back-left
]
```

This order (A, B, C, D) follows a clean pattern in Cartesian space: all combinations of ±1 that form a tetrahedron inscribed in a cube.

### 2. The Color Assignment (Visual)

Colors were assigned sequentially to the array indices for visual distinction:

```javascript
colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]; // R, G, B, Y
// index 0 (A) → Red
// index 1 (B) → Green
// index 2 (C) → Blue
// index 3 (D) → Yellow
```

### 3. The QW/QX/QY/QZ Naming (User-Facing)

The Q-names were assigned based on **color**, not array index, to create a memorable user convention:

| Q-Name | Color  | Array Index | Basis Vector |
|--------|--------|-------------|--------------|
| **QW** | Yellow | 3           | D: (-1,-1,+1)/√3 |
| **QX** | Red    | 0           | A: (+1,+1,+1)/√3 |
| **QY** | Blue   | 2           | C: (-1,+1,-1)/√3 |
| **QZ** | Green  | 1           | B: (+1,-1,-1)/√3 |

### Result: The 3, 0, 2, 1 Mapping

The mapping `{qw: 3, qx: 0, qy: 2, qz: 1}` translates **user-visible color-based names** to **geometry-based array indices**:

- **QW (Yellow)** → index 3 because Yellow was assigned to the 4th vector (D)
- **QX (Red)** → index 0 because Red was assigned to the 1st vector (A)
- **QY (Blue)** → index 2 because Blue was assigned to the 3rd vector (C)
- **QZ (Green)** → index 1 because Green was assigned to the 2nd vector (B)

### Why Not Reorder?

We could reorder the `basisVectors` array to make indices match names (0,1,2,3), but this would:
1. Break the clean Cartesian coordinate pattern (A,B,C,D progression)
2. Require updating all existing code that uses array indices
3. Diverge from the original Quadray reference implementation

The current approach keeps the mathematical foundation clean while providing a single canonical mapping (`Quadray.AXIS_INDEX`) for UI/display purposes.

---

## ✅ DECISIONS MADE - Coordinate Mode Behavior (Jan 31, 2026)

### Core Principle: StateManager is Source of Truth

The coordinate display is a **window into StateManager**. Whatever is persisted to StateManager (and would be exported to JSON) is what Absolute mode displays.

### Critical Bug Fixed: Transform Persistence (Jan 31, 2026)

**Problem**: After move/rotate/scale via gumball, transforms were NOT being saved to StateManager.
- Only the THREE.js object was updated in memory
- StateManager still had the initial creation-time transforms
- **This affected JSON export** - exported files had stale position/rotation values!
- Coordinate display showed last operation delta, not persisted values

**Root Cause**: `RTStateManager.updateInstance()` was never called after gumball operations.

**Fix** (commit `4c1021f`):
1. Added `RTStateManager.updateInstance()` call after gumball drag ends
2. Added `RTCoordinates.onSelectionChange()` call when selection changes
3. Now transforms are persisted AND display updates correctly

**Impact**: This was a significant data integrity bug. Before this fix:
- Rotating an object, then exporting → exported file had WRONG rotation
- Selecting different objects → display showed last operation, not stored values

### Critical Bug Fixed: Numerical Rotation Input Persistence (Feb 1, 2026)

**Problem**: When rotating an object via numerical input (typing 45° in the rotation field and pressing Enter), the rotation was applied visually but NOT persisted to StateManager.
- Rotating cube A by 45° via input field → visually correct
- Selecting cube B → shows 0° rotation (correct)
- Re-selecting cube A → shows 0° rotation (WRONG - should show 45°)

**Root Cause**: The four rotation input handlers (`setupRotateDegreesInputs`, `setupRotateQuadrayDegreesInputs`, `setupRotateSpreadInputs`, `setupRotateQuadraySpreadInputs`) called `poly.rotateOnWorldAxis()` but never called `RTStateManager.updateInstance()`.

**Fix** (Feb 1, 2026):
Added `RTStateManager.updateInstance()` call after each rotation in all four handlers:
- `setupRotateDegreesInputs()` - XYZ degrees input (~line 1197)
- `setupRotateQuadrayDegreesInputs()` - QWXYZ degrees input (~line 1251)
- `setupRotateSpreadInputs()` - XYZ spread input (~line 1303)
- `setupRotateQuadraySpreadInputs()` - QWXYZ spread input (~line 1357)

**Impact**: Numerical rotation inputs now persist correctly. Selecting away and back shows the correct rotation value.

### Absolute Mode Behavior (DECIDED)

| Transform | Display Shows | Source |
|-----------|---------------|--------|
| **Position** | World position | `instance.transform.position` from StateManager |
| **Rotation** | World rotation | `instance.transform.rotation` from StateManager |
| **Scale** | World scale | `instance.transform.scale` from StateManager |

When you select an instance in Absolute mode:
- Position shows where it is in world space
- Rotation shows accumulated rotation from Form identity (persisted)
- These values match what would be saved/loaded in JSON export

### Relative Mode Behavior (DECIDED)

Relative mode is a **transient tool mode** for performing local operations:

| Transform | Initial Display | During Operation | After Operation |
|-----------|-----------------|------------------|-----------------|
| **Position** | `0, 0, 0` | Delta from drag start | Resets to `0, 0, 0` |
| **Rotation** | `0°, 0°, 0°` | Delta being applied | Resets to `0°, 0°, 0°` |

**Use case**: "Rotate this cube 45°" or "Move this 2 units in X" without caring about world coordinates.

**Bi-directional input in Relative mode**: Typing a value ADDS to current transform (additive), not sets absolute.

### Group Centre Mode Behavior (ALREADY IMPLEMENTED)

| Transform | Display Shows | Source |
|-----------|---------------|--------|
| **Position** | Centroid of selection | Calculated dynamically |
| **Rotation** | N/A | Objects rotate around centroid |

Group Centre is NOT persisted - it's calculated each time from selected objects.

### Summary Table

| Aspect | Absolute | Relative | Group Centre |
|--------|----------|----------|--------------|
| Position displayed | World (StateManager) | 0,0,0 → delta | Centroid (calculated) |
| XYZ Rotation displayed | World Euler (StateManager) | 0° → delta | N/A |
| QWXYZ Rotation displayed | Cumulative Quadray (StateManager) | 0° → delta (tool mode) | N/A |
| Persisted | Yes (Euler + Quadray) | No (tool mode) | No (calculated) |
| Input behavior | Set absolute value | Add to current | N/A |

---

## ✅ DECIDED: QWXYZ Rotation Storage & Display (Feb 1, 2026)

### The Problem

StateManager stores rotation as **Euler XYZ** (radians). When you rotate using a Quadray axis (QW, QX, QY, QZ), the rotation is converted to Euler and stored, but the **which Quadray axis was used** information is lost.

**Previous behavior**:
- XYZ rotation fields: Show Euler values from StateManager ✅
- QWXYZ rotation fields: Only update DURING Quadray drag (show delta), blank on selection ❌

### Solution: Store Quadray Rotations Separately

Add a `quadrayRotation` field to StateManager instance transform:

```javascript
instance.transform = {
  position: { x, y, z },
  rotation: { x, y, z, order },           // Euler (for THREE.js rendering)
  scale: { x, y, z },
  quadrayRotation: { qw: 0, qx: 0, qy: 0, qz: 0 }  // NEW: Quadray rotation state
}
```

**Key insight**: Euler XYZ and Quadray QWXYZ are both valid representations of the same final orientation. They're not independent - THREE.js uses Euler for rendering, but we store Quadray separately so users can think in Quadray terms when working with Quadray axes.

### Mode-Dependent Behavior

| Mode | QWXYZ Display | QWXYZ Input | Persistence |
|------|---------------|-------------|-------------|
| **Absolute** | Cumulative totals from StateManager | Adds to stored value | Yes (quadrayRotation field) |
| **Relative** | Last operation delta (tool mode) | Applies rotation, resets to 0 after | No (transient) |

### Absolute Mode: Cumulative Quadray Rotations

In Absolute mode, QWXYZ fields show **accumulated Quadray rotations**:

1. Select cube → QW shows 0°
2. Rotate 60° around QW → QW shows 60° (stored: `quadrayRotation.qw = 60`)
3. Click away, select other objects
4. Re-select cube → QW still shows 60° (read from StateManager)
5. Rotate another 30° around QW → QW shows 90° (stored: `quadrayRotation.qw = 90`)
6. Enter -90° in QW field → applies reverse, QW shows 0° (stored: `quadrayRotation.qw = 0`)

**Use case**: User can see total Quadray rotations applied and reverse them precisely.

### Relative Mode: Tool Mode (Last Operation Only)

In Relative mode, QWXYZ fields show **current operation delta**:

1. Select cube → QW shows 0° (always starts at zero)
2. Rotate 60° around QW → QW shows 60° during operation
3. Operation completes → QW resets to 0°
4. Re-select cube → QW shows 0° (tool mode, not persisted)

**Use case**: "Rotate this 45°" without caring about accumulated state.

### Mixed XYZ + Quadray Rotations

When user mixes Cartesian and Quadray rotations:
- **Euler XYZ**: Always accurate (THREE.js source of truth for rendering)
- **Quadray QWXYZ**: Only tracks rotations applied via Quadray axes

Example:
1. Rotate 45° around Cartesian Z → Euler Z = 45°, Quadray all = 0°
2. Rotate 60° around QW → Euler updates (complex), Quadray QW = 60°
3. The Euler and Quadray values are both "correct" but describe different aspects

**Note**: We do NOT attempt Euler→Quadray decomposition. The Quadray fields track user intent (which Quadray axes were used), not a mathematical decomposition of the final orientation.

### Implementation Tasks

1. [ ] Add `quadrayRotation` field to StateManager instance schema
2. [ ] Update `setupRotateQuadrayDegreesInputs()` to accumulate QW/QX/QY/QZ values
3. [ ] Update `setupRotateQuadraySpreadInputs()` to accumulate values
4. [ ] Update `RTCoordinates.updateRotationDisplay()` to show Quadray values in Absolute mode
5. [ ] Update `RTCoordinates.getDisplayValues()` to return quadrayRotation from StateManager
6. [ ] Clear Quadray display in Relative mode (show 0,0,0,0)

---

## Coordinate Mode Definitions (Clarified)

### Absolute Mode (Default)
Coordinates shown relative to **world origin (Alpha = 0,0,0)**:
- Select any object → display shows its world position (distance from origin)
- Useful for: Placing objects at specific world coordinates
- Example: Form displaced to (5, 0, 3) shows `X: 5.0000, Y: 0.0000, Z: 3.0000`
- **Persisted**: Yes, these are StateManager values

### Relative Mode (Object-Local) - ⚠️ NEEDS CLARIFICATION
Coordinates shown relative to **the object's own centre**:
- Select any object → display shows **0,0,0** (object centre IS the origin)
- Useful for: Performing local rotations without reference to world coordinates
- **Primary use case**: "Rotate this cube 45°" regardless of where it is in the world
- **Persisted**: TBD - possibly transient (tool mode) rather than persisted state

**Key distinction from Absolute**:
- Absolute = "Where am I in the world?" (persisted state)
- Relative = "How much am I transforming right now?" (possibly transient/tool mode)

### Group Centre Mode (Multi-Select Only)
Coordinates shown relative to **calculated centroid of all selected objects**:
- Multi-select 2+ objects → display shows centroid's world position
- During rotate → objects rotate AROUND the centroid (not individual origins)
- Gumball (editing basis) appears at centroid
- Automatically disabled when selection drops below 2 objects
- **NOT persisted**: Centroid is calculated dynamically, not stored

**Key insight**: Group Centre treats the selection AS a group - like grabbing multiple objects and rotating them around their collective center of mass

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

**Important**: The node just defines the pivot point, not the coordinate system. Gumball axes remain world-aligned (Cartesian X/Y/Z or Quadray QW/QX/QY/QZ). Rotating around the Cartesian X axis with a corner node selected still rotates around world-X, just pivoting at that corner instead of the centroid.

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

### Phase 1: Module Extraction ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Create `rt-coordinates.js` module | ✅ Done | ~430 lines, full module |
| Add `USE_COORDINATE_MODULE` flag | ✅ Done | Set to `true` |
| Cache DOM elements | ✅ Done | All coord fields in `elements` object |
| `updatePositionDisplay(pos)` | ✅ Done | XYZ + QWXYZ conversion |
| `updateRotationDisplay(rotation)` | ✅ Done | Degrees + spread |
| Mode toggle handlers | ✅ Done | Absolute/Relative/Group buttons |

### Phase 2: Group Centre Mode ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Add Group Centre toggle button | ✅ Done | Third button in footer |
| Calculate group centroid function | ✅ Done | `calculateGroupCentroid()` |
| Group Centre: show centroid position | ✅ Done | Display updates on mode change |
| Group Centre rotation pivot | ✅ Done | `getRotationCenter()` uses centroid |
| Group Centre gumball positioning | ✅ Done | `editingBasis` created at centroid |
| Disable when <2 objects selected | ✅ Done | `updateGroupCentreButtonState()` |
| Auto-switch to Absolute on deselect | ✅ Done | Falls back when count < 2 |

### Phase 3: Relative Mode 🔧 TODO

| Task | Status | Notes |
|------|--------|-------|
| Add `localPosition` to StateManager | TODO | Offset from object centre |
| Add `localRotation` to StateManager | TODO | Delta from Form identity |
| Add `localScale` to StateManager | TODO | Multiplier from Form identity |
| Relative: show 0,0,0 for position | TODO | Object centre = origin |
| Relative: show local rotation/scale | TODO | Read from StateManager |
| Update StateManager on transform | TODO | Persist local values |

### Phase 4: Bi-Directional Input 🔧 TODO

| Task | Status | Notes |
|------|--------|-------|
| Absolute: typing moves to world pos | Partial | Legacy code exists, not in module |
| Relative: typing applies local offset | TODO | Requires Phase 3 first |
| Move input handlers to module | TODO | `setupInputHandlers()` placeholder exists |

### Phase 5: Node-Based Coordinates 🔧 TODO

| Task | Status | Notes |
|------|--------|-------|
| Node select shows node position | TODO | Use node's world pos |
| Node-based origin for moves | ✅ Done | Already implemented in rt-init.js |
| Relative mode with node selected | TODO | Show 0,0,0 at node position |

### Phase 6: Cleanup 🔧 TODO

| Task | Status | Notes |
|------|--------|-------|
| Remove legacy coord code from rt-init.js | TODO | 6 duplicate QWXYZ blocks |
| Remove `USE_COORDINATE_MODULE` flag | TODO | After full switchover verified |
| Update all drag handlers to use module | TODO | Consistent display updates |

---

## Technical Implementation (Current)

### RTCoordinates Module Structure

**Location**: `modules/rt-coordinates.js` (~430 lines)

The module is now fully extracted and active (`USE_COORDINATE_MODULE = true` in rt-init.js).

```javascript
export const RTCoordinates = {
  // State
  mode: 'absolute',           // 'absolute' | 'relative' | 'group-centre'
  groupCentroid: null,        // Calculated centroid for group-centre mode
  elements: null,             // DOM element cache
  deps: null,                 // Injected dependencies
  onModeChangeCallback: null, // Callback for rt-init.js to respond to mode changes

  // Core Functions (all implemented)
  init(dependencies),                    // Initialize with Quadray, RTStateManager, THREE, getSelectedPolyhedra
  updatePositionDisplay(pos),            // Update XYZ + QWXYZ fields
  updateRotationDisplay(rotation),       // Update degrees + spread fields
  clearDisplay(),                        // Clear all coordinate fields
  setMode(newMode, selectedObjects),     // Change coordinate mode
  getMode(),                             // Get current mode
  calculateGroupCentroid(objects),       // Calculate centroid of objects
  getRotationCenter(editingBasis, selectedObjects), // Get pivot point based on mode
  getDisplayValues(object),              // Get values to display based on mode
  setupModeToggles(),                    // Bind mode toggle button handlers
  updateGroupCentreButtonState(count),   // Enable/disable Group button
  onSelectionChange(selectedObjects),    // Called when selection changes

  // Placeholder (TODO)
  setupInputHandlers(callbacks),         // Bi-directional coordinate input
};
```

### Integration in rt-init.js

**Initialization** (lines ~181-199):
```javascript
if (USE_COORDINATE_MODULE) {
  RTCoordinates.init({
    Quadray: Quadray,
    RTStateManager: RTStateManager,
    THREE: THREE,
    getSelectedPolyhedra: getSelectedPolyhedra,
  });
  RTCoordinates.setupModeToggles();
  RTCoordinates.onModeChangeCallback = (mode, centroid) => {
    if (mode === 'group-centre' && centroid && editingBasis) {
      editingBasis.position.copy(centroid);
    }
  };
}
```

**Gumball Positioning** (lines ~818-836):
```javascript
// Check for Group Centre mode first (requires 2+ selected)
if (USE_COORDINATE_MODULE && RTCoordinates.getMode() === 'group-centre' && selected.length >= 2) {
  basisPosition = RTCoordinates.calculateGroupCentroid(selected);
} else if (RTStateManager.isVertexMode() && firstVertex?.getWorldPosition) {
  // NODE-BASED ORIGIN
  basisPosition = nodeWorldPos;
} else {
  // CLASSICAL: Use polyhedron centroid
  basisPosition = selected[0].position.clone();
}
```

**Rotation Center** (lines ~3275-3285):
```javascript
let rotationCenter;
if (USE_COORDINATE_MODULE && RTCoordinates.getMode() === 'group-centre') {
  rotationCenter = RTCoordinates.getRotationCenter(editingBasis, selectedPolyhedra);
} else {
  rotationCenter = editingBasis ? editingBasis.position : new THREE.Vector3(0, 0, 0);
}
```

---

## TODO: Relative Mode Implementation

### StateManager Schema Extension

Add to instance record in `rt-state-manager.js`:

```javascript
instance: {
  // Existing world transforms (Absolute mode reads these)
  transform: {
    position: { x, y, z },
    rotation: { x, y, z, order },
    scale: { x, y, z },
  },

  // NEW: Local transforms (Relative mode reads these)
  localTransform: {
    position: { x: 0, y: 0, z: 0 },     // Offset from object centre (always 0,0,0 for position display)
    rotation: { x: 0, y: 0, z: 0 },     // Delta from Form identity orientation
    scale: { x: 1, y: 1, z: 1 },        // Multiplier from Form identity scale
  },
}
```

### Relative Mode Display Logic

In `RTCoordinates.getDisplayValues()`:

```javascript
if (this.mode === 'relative') {
  // Position: Object centre = origin, always show 0,0,0
  // Rotation: Show local rotation (how rotated from Form identity)
  // Scale: Show local scale (how scaled from Form identity)
  return {
    position: new this.deps.THREE.Vector3(0, 0, 0),
    rotation: instance.localTransform?.rotation || { x: 0, y: 0, z: 0 },
    scale: instance.localTransform?.scale || { x: 1, y: 1, z: 1 },
  };
}
```

---

## TODO: Bi-Directional Input Handlers

**Location**: `RTCoordinates.setupInputHandlers()` (currently placeholder)

```javascript
setupInputHandlers(callbacks) {
  const self = this;

  // Position input handlers
  ['coordX', 'coordY', 'coordZ'].forEach((id, index) => {
    const field = this.elements[id];
    if (!field) return;

    field.addEventListener('change', function() {
      const selected = self.deps.getSelectedPolyhedra();
      if (selected.length === 0) return;

      const newValue = parseFloat(this.value);
      const object = selected[0];

      if (self.mode === 'absolute') {
        // Move to world position
        object.position.setComponent(index, newValue);
        self.deps.RTStateManager.updateInstanceTransform(object.userData.instanceId, object);
      }
      // Relative mode: position input is read-only (always 0,0,0)
    });
  });
}
---

## Coordinate Display Fields

```
Position (XYZ):     coordX, coordY, coordZ
Position (QWXYZ):   coordQW, coordQX, coordQY, coordQZ
Rotation (XYZ):     rotXDegrees, rotYDegrees, rotZDegrees (+ spread)
Rotation (QWXYZ):   rotQWDegrees, rotQXDegrees, rotQYDegrees, rotQZDegrees (+ spread)
```

**Naming Convention (Jan 31, 2026)**: Quadray fields use `Q` prefix for consistency:
- `QW` = Quadray W axis (Yellow)
- `QX` = Quadray X axis (Red)
- `QY` = Quadray Y axis (Blue)
- `QZ` = Quadray Z axis (Green)

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

## Related Files

### Primary Files

| File | Purpose |
|------|---------|
| `modules/rt-coordinates.js` | **Main module** - mode management, display, Group Centre logic |
| `modules/rt-init.js` | Integration - gumball positioning, rotation center, feature flag |
| `modules/rt-state-manager.js` | TODO: Add `localTransform` fields for Relative mode |

### Supporting Files

| File | Purpose |
|------|---------|
| `index.html` | Toggle buttons (Absolute/Relative/Group), coordinate input fields |
| `art.css` | Button styling, disabled state for Group Centre |
| `modules/rt-math.js` | Quadray basis vectors for QWXYZ conversion |

---

## Next Steps Checklist

### Immediate: Relative Mode
1. [ ] Add `localTransform` object to StateManager instance schema
2. [ ] Update `RTCoordinates.getDisplayValues()` to return 0,0,0 for position in Relative mode
3. [ ] Update `RTCoordinates.getDisplayValues()` to return local rotation/scale values
4. [ ] Test: Select object in Relative mode → shows 0,0,0 position

### Next: Bi-Directional Input
5. [ ] Implement `RTCoordinates.setupInputHandlers()`
6. [ ] Add change listeners to position fields (Absolute mode)
7. [ ] Typing value moves object to that world position
8. [ ] Add change listeners to rotation fields
9. [ ] Test: Type coordinates → object moves

### Cleanup: Full Switchover
10. [ ] Update all drag handlers in rt-init.js to call `RTCoordinates.updatePositionDisplay()`
11. [ ] Remove duplicate QWXYZ conversion blocks from rt-init.js
12. [ ] Remove `USE_COORDINATE_MODULE` flag (keep module always active)
13. [ ] Document final line count reduction
