# Coordinates System - Implementation Roadmap

## Quick Start for New Agent

**Branch**: `FOOTER-COORDINATES`
**Status**: Absolute mode working, Relative mode next
**Goal**: Complete coordinate display system with Absolute/Relative modes

### Current State (Jan 30, 2026)

- [x] **Absolute/Relative toggle buttons** - Added to footer (far right)
- [x] **Mutually exclusive toggle** - Buttons work as radio group
- [x] **Selection updates coordinates** - Selecting object shows its position (Absolute)
- [ ] **Relative mode display** - Always show 0,0,0 for selected object
- [ ] **Clear on deselect** - Reset display when nothing selected

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

**Key insight**: In Relative mode, we're asking "how far did I move from where I started?" not "where am I in the world?"

---

## Complete Scenario Matrix

### Position (Move) Scenarios

| Scenario | Absolute Mode | Relative Mode |
|----------|--------------|---------------|
| **Single object selected** | Shows world position | Shows 0,0,0 (self is origin) |
| **Single object during move** | Shows current world position | Shows delta from start |
| **Multi-select (2+ objects)** | Shows primary object's world pos | Shows 0,0,0 for primary |
| **Multi-select during move** | Shows primary's new world pos | Shows delta from start |
| **Node selected (vertex mode)** | Shows node's world position | Shows 0,0,0 |
| **Node-based move** | Shows polyhedron's world pos | Shows delta from start |

### Rotation Scenarios

| Scenario | Absolute Mode | Relative Mode |
|----------|--------------|---------------|
| **Single object selected** | Shows world rotation (Euler) | Shows 0,0,0 (identity) |
| **Single object during rotate** | Shows current world rotation | Shows delta rotation |
| **Multi-select rotation** | Shows primary's world rotation | Shows delta rotation |
| **Node-based rotate** | Shows polyhedron's world rotation | Shows delta rotation |

### Scale Scenarios

| Scenario | Absolute Mode | Relative Mode |
|----------|--------------|---------------|
| **Single object selected** | Shows scale (1,1,1 default) | Shows 1,1,1 (identity) |
| **Single object during scale** | Shows current scale | Shows scale factor applied |
| **Multi-select scale** | Shows primary's scale | Shows scale factor applied |
| **Node-based scale** | Shows polyhedron's scale | Shows scale factor applied |

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
| Relative: show 0,0,0 on select | TODO | Simple - just display zeros |
| Relative: show delta during move | TODO | Track start position, show difference |
| Relative: show delta during rotate | TODO | Track start rotation, show difference |
| Relative: show factor during scale | TODO | Track start scale, show multiplier |

### Phase 3: Multi-Select Handling

| Task | Status | Notes |
|------|--------|-------|
| Define "primary" object for display | Existing | First selected = primary |
| Absolute: show primary's position | Done | Already works |
| Relative: show 0,0,0 for primary | TODO | Same as single select |
| Multi-move delta tracking | TODO | Track primary's start pos |

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

```javascript
let coordinateMode = 'absolute'; // or 'relative'
let coordinateReferencePos = null; // Starting position for relative mode
let coordinateReferenceRot = null; // Starting rotation for relative mode
let coordinateReferenceScale = null; // Starting scale for relative mode
```

### Mode Toggle Handler

```javascript
document.querySelectorAll("[data-coord-mode]").forEach(btn => {
  btn.addEventListener("click", function () {
    coordinateMode = this.dataset.coordMode;

    if (coordinateMode === 'relative') {
      // Store current position as reference
      if (currentSelection) {
        coordinateReferencePos = currentSelection.position.clone();
        coordinateReferenceRot = currentSelection.rotation.clone();
        coordinateReferenceScale = currentSelection.scale.clone();
      }
      // Display zeros (we are at our own origin)
      updateCoordinateDisplay(new THREE.Vector3(0, 0, 0));
    } else {
      // Absolute - show world position
      if (currentSelection) {
        updateCoordinateDisplay(currentSelection.position);
      }
    }
  });
});
```

### Display Logic During Operations

```javascript
function updateCoordinateDisplayForMode(currentPos) {
  if (coordinateMode === 'absolute') {
    updateCoordinateDisplay(currentPos);
  } else {
    // Relative: show delta from reference
    const delta = new THREE.Vector3().subVectors(currentPos, coordinateReferencePos);
    updateCoordinateDisplay(delta);
  }
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
3. Divider
4. XYZ Rotation inputs (degrees + spread)
5. WXYZ Rotation inputs (degrees + spread)
6. **[Absolute] [Relative]** toggle buttons (far right)

---

## Related Files

- `index.html` - Footer panel HTML structure
- `art.css` - `.coords-mode-group` styling
- `modules/rt-init.js` - Coordinate update logic, toggle handlers
- `modules/rt-math.js` - Quadray conversion functions
