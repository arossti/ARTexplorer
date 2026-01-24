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

1. **Alt must be held throughout drag** (not just on mousedown)
   - Currently: Alt checked only at mousedown
   - Expected: Alt must be held at mouseup to confirm copy intent
   - If Alt released mid-drag, should cancel copy mode

2. **Escape should cancel drag-copy cleanly**
   - Currently: Escape doesn't clear `isDragCopying` state
   - Result: Next click deposits an unintended instance
   - Fix: Add escape key handler to reset `isDragCopying = false` and restore original position

3. **Alt-click should auto-engage move mode**
   - Currently: Requires Move tool to be active first (left-click = orbit otherwise)
   - Expected: Alt+click on selected polyhedron should implicitly start move+copy
   - This bypasses the need to manually activate Move tool first

4. **Multiple copies while Alt held**
   - Currently: Works, but feels wrong due to issues #1-3
   - Expected: Each drag-release cycle while Alt held creates a copy
   - With fixes above, this becomes the natural continuous-copy workflow

---

## Architecture Summary

### Key Locations

| Component | File | Line Range | Purpose |
|-----------|------|------------|---------|
| Drag-copy state vars | rt-init.js | ~1259 | `isDragCopying`, `dragCopyOriginal*` |
| Gumball mousedown | rt-init.js | ~2682 | Alt detection for axis drag |
| Free move mousedown | rt-init.js | ~2769 | Alt detection for body drag |
| Free move mouseup | rt-init.js | ~3444 | Copy creation (free move) |
| Gumball mouseup | rt-init.js | ~3565 | Copy creation (axis drag) |
| Instance creation | rt-state-manager.js | ~162 | `RTStateManager.createInstance()` |

### State Variables (added in v1)

```javascript
let isDragCopying = false;              // Alt/Option key held during drag
let dragCopyOriginalPosition = new THREE.Vector3();
let dragCopyOriginalQuaternion = new THREE.Quaternion();
let dragCopyOriginalScale = new THREE.Vector3();
```

---

## Refinement Plan

### Phase 1: Alt-held-at-release check

**File:** `rt-init.js`
**Locations:** Both mouseup handlers (~3444 and ~3565)

**Change:**
```javascript
// Only create copy if Alt is STILL held at release
if (isDragCopying && currentSelection && event.altKey) {
  // ... existing copy logic
}

// Always clear isDragCopying on mouseup
isDragCopying = false;
```

### Phase 2: Escape key cancellation

**File:** `rt-init.js`
**Location:** Add to existing keydown handler or create new one

**Change:**
```javascript
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && isDragCopying) {
    // Cancel drag-copy mode
    isDragCopying = false;

    // Restore original position
    if (currentSelection) {
      currentSelection.position.copy(dragCopyOriginalPosition);
      currentSelection.quaternion.copy(dragCopyOriginalQuaternion);
      currentSelection.scale.copy(dragCopyOriginalScale);
    }

    // Update editing basis
    if (editingBasis) {
      editingBasis.position.copy(dragCopyOriginalPosition);
    }

    console.log("❌ DRAG-COPY cancelled via Escape");
  }
});
```

### Phase 3: Alt-click auto-engages move mode

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
