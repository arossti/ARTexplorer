# COPY-INSTANCE Workplan

## Feature: Opt-Click Drag-to-Copy

**Branch:** `DRAG-COPY`
**Created:** January 2026
**Status:** In Progress (v1 implemented, refinements needed)

---

## Overview

Implement macOS-native Option+click drag behavior to create copies of polyhedra instances. When holding Option (Alt on Windows) while dragging a selected polyhedron, a new instance is created at the release position while the original remains in place.

---

## Current Implementation Status (v1)

### What Works

- [x] Alt/Option key detected on mousedown
- [x] Original transform stored at drag start
- [x] Instance created at release position via `RTStateManager.createInstance()`
- [x] Original restored to starting position after copy
- [x] NOW counter updates
- [x] Works with gumball axis drag (when Move/Scale/Rotate tool active)
- [x] Works with free movement drag (clicking on selected poly body)

### Known Issues / Refinements Needed

1. **Original should remain visible during drag ("ghost" behavior)** ⚠️ CRITICAL
   - Currently: The original form moves with the drag and STAYS at the new position
   - An instance is created, but it's at the same position as the moved original
   - The original is effectively "lost" - subsequent drags move it further away
   - Expected: Original stays in place (like a ghost), user drags a _copy_ away from it
   - The original never moves - standard macOS opt-drag behavior
   - Implementation: On alt-mousedown, immediately create a clone for dragging; original stays put

2. **Alt must be held throughout drag** (not just on mousedown)
   - Currently: Alt checked only at mousedown
   - Expected: Alt must be held at mouseup to confirm copy intent
   - If Alt released mid-drag, should cancel copy mode (delete the dragged clone)

3. **Escape should cancel drag-copy cleanly** ✅ DONE
   - ~~Currently: Escape doesn't clear `isDragCopying` state~~
   - ~~Result: Next click deposits an unintended instance~~
   - Fixed: Escape restores original position and clears isDragCopying

4. **Alt-click should auto-engage move mode**
   - Currently: Requires Move tool to be active first (left-click = orbit otherwise)
   - Expected: Alt+click on selected polyhedron should implicitly start move+copy
   - This bypasses the need to manually activate Move tool first

5. **Multiple copies while Alt held**
   - Currently: Works, but feels wrong due to issues #1-4
   - Expected: Each drag-release cycle while Alt held creates a copy
   - With fixes above, this becomes the natural continuous-copy workflow

---

## Architecture Summary

### Key Locations

| Component            | File                | Line Range | Purpose                              |
| -------------------- | ------------------- | ---------- | ------------------------------------ |
| Drag-copy state vars | rt-init.js          | ~1259      | `isDragCopying`, `dragCopyOriginal*` |
| Gumball mousedown    | rt-init.js          | ~2682      | Alt detection for axis drag          |
| Free move mousedown  | rt-init.js          | ~2769      | Alt detection for body drag          |
| Free move mouseup    | rt-init.js          | ~3444      | Copy creation (free move)            |
| Gumball mouseup      | rt-init.js          | ~3565      | Copy creation (axis drag)            |
| Instance creation    | rt-state-manager.js | ~162       | `RTStateManager.createInstance()`    |

### State Variables (added in v1)

```javascript
let isDragCopying = false; // Alt/Option key held during drag
let dragCopyOriginalPosition = new THREE.Vector3();
let dragCopyOriginalQuaternion = new THREE.Quaternion();
let dragCopyOriginalScale = new THREE.Vector3();
```

---

## Refinement Plan

### Phase 1: Ghost behavior - Clone on mousedown, original stays put ⚠️ PRIORITY

**Architectural Change Required:**

Current flow:

1. Alt+mousedown → store original position
2. User drags → original moves with cursor
3. Mouseup → create instance at current pos, restore original

New flow:

1. Alt+mousedown → immediately create a draggable clone
2. Original stays exactly where it is (never moves)
3. User drags → clone moves with cursor
4. Mouseup → finalize clone as instance (or delete if Alt released/Escape pressed)

**Implementation:**

```javascript
// On Alt+mousedown:
if (event.altKey && currentSelection) {
  // Create clone immediately
  dragCopyClone = RTStateManager.createInstance(currentSelection, scene);

  // The clone becomes what we're dragging
  // Original stays put - we don't touch it at all

  isDragCopying = true;
  // ... set up drag plane based on clone position
}

// On mousemove: move the clone, not the original
if (isDragCopying && dragCopyClone) {
  dragCopyClone.position.copy(newPosition);
}

// On mouseup with Alt held: clone stays (already an instance)
// On mouseup without Alt: delete the clone
// On Escape: delete the clone
```

**New state variable needed:**

```javascript
let dragCopyClone = null; // The clone being dragged
```

### Phase 2: Escape key cancellation ✅ DONE

Implemented - Escape cancels drag-copy and restores original.
(Will need update to delete clone instead of restoring original once Phase 1 is done)

### Phase 3: Alt-held-at-release check

**File:** `rt-init.js`
**Locations:** Both mouseup handlers

**Change:**

```javascript
// Only keep clone if Alt is STILL held at release
if (isDragCopying && dragCopyClone) {
  if (event.altKey) {
    // Keep the clone - it's already an instance
    console.log("✅ DRAG-COPY complete: Clone deposited");
  } else {
    // Alt released - delete the clone
    scene.remove(dragCopyClone);
    RTStateManager.deleteInstance(dragCopyClone.userData.instanceId, scene);
    console.log("⚠️ DRAG-COPY cancelled: Alt released");
  }
  dragCopyClone = null;
  isDragCopying = false;
}
```

### Phase 4: Alt-click auto-engages move mode

**File:** `rt-init.js`
**Location:** Before existing mousedown gumball check (~2640)

**Change:**

```javascript
// ALT-CLICK AUTO-MOVE: If Alt held + clicking on selected poly, auto-engage move
if (event.altKey && currentSelection && !currentGumballTool) {
  // Check if clicking on the selected polyhedron
  const selectableObjects = [];
  currentSelection.traverse(obj => {
    if (obj.isMesh || obj.isLine) selectableObjects.push(obj);
  });

  const polyIntersects = raycaster.intersectObjects(selectableObjects, false);

  if (polyIntersects.length > 0) {
    // Temporarily engage move mode for this drag
    // Set up free movement with drag-copy enabled
    event.preventDefault();
    event.stopPropagation();

    isFreeMoving = true;
    isDragCopying = true;
    // ... store original transform, set up drag plane, etc.
  }
}
```

**Note:** This requires bypassing OrbitControls. May need to disable controls temporarily or use capture phase carefully.

---

## Testing Checklist

### v1 Tests (current)

- [x] Opt+drag on selected polyhedron with Move tool active creates copy
- [x] Original returns to starting position after release
- [x] NOW counter increments
- [x] Works with gumball axis handles
- [x] Works with free body drag

### v2 Tests (after refinements)

- [ ] Releasing Alt mid-drag cancels copy (no instance created)
- [ ] Escape during drag-copy restores original, no instance created
- [ ] Alt+click on selected poly (no tool active) starts move+copy
- [ ] Multiple drag-release cycles while Alt held creates multiple copies
- [ ] Snapping works during drag-copy
- [ ] Undo removes copied instance
- [ ] Works on both Forms and Instances

---

## Future Considerations

1. **Visual feedback**: Cursor change or translucent preview during drag-copy
2. **Shift+Alt**: Array copy with fixed offset
3. **Cmd+D**: Duplicate in place (no drag needed)
4. **Context menu**: Add "Duplicate" option to right-click menu
5. **Multi-select**: Copy all selected polyhedra together

---

## Notes

- The v1 implementation uses existing `RTStateManager.createInstance()` which handles deep cloning
- No changes to StateManager were required
- The feature is purely additive to existing drag logic
- Alt key is cross-platform (Option on macOS, Alt on Windows/Linux)
