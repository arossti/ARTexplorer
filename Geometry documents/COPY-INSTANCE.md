# COPY-INSTANCE Workplan

## Feature: Opt-Click Drag-to-Copy

**Branch:** `DRAG-COPY`
**Created:** January 2026
**Status:** Planning

---

## Overview

Implement macOS-native Option+click drag behavior to create copies of polyhedra instances. When holding Option (Alt on Windows) while dragging a selected polyhedron, a new instance is created at the release position while the original remains in place.

---

## Current Architecture Summary

### Key Locations

| Component | File | Line Range | Purpose |
|-----------|------|------------|---------|
| Gumball initialization | rt-init.js | ~2633 | `initGumballEventListeners()` |
| Mouse drag handling | rt-init.js | ~2640-3289 | `onMouseDown`, `onMouseMove`, `onMouseUp` |
| Selection logic | rt-init.js | ~2170, ~2233 | Click-to-select, `getSelectedPolyhedra()` |
| NOW button handler | rt-init.js | ~1259 | Deposit logic reference |
| Editing basis (gumball) | rt-init.js | ~2570 | `createEditingBasis()` |
| Instance creation | rt-state-manager.js | ~162 | `RTStateManager.createInstance()` |
| Form reset | rt-state-manager.js | ~465 | `RTStateManager.resetForm()` |

### Current Selection State

- `currentSelection`: Single THREE.Group (Form or Instance)
- Selection triggered by click → raycaster → `selectPolyhedron(parentGroup)`
- `userData.isInstance`: Boolean distinguishing instances from forms
- `userData.instanceId`: Unique ID for instances

### Current Drag Flow

1. **MOUSEDOWN**: Check tool active → raycast handles → set `isDragging` or `isFreeMoving`
2. **MOUSEMOVE**: Apply transform to selected polyhedra, update UI
3. **MOUSEUP**: Apply snapping, clear drag state

### Existing Instance Creation (NOW Button)

```javascript
// Current deposit flow (rt-init.js ~1259)
RTStateManager.createInstance(poly, scene);  // Clone at current position
RTStateManager.resetForm(poly);              // Reset form to origin
```

---

## Implementation Plan

### Phase 1: Modifier Key Detection

**File:** `rt-init.js`
**Location:** `onMouseDown()` handler (~2640)

**Changes:**
1. Detect `event.altKey` (Option on macOS, Alt on Windows)
2. Set new state flag: `isDragCopying = true`
3. Only enable when:
   - A polyhedron is selected (`currentSelection !== null`)
   - A tool is active (move/scale/rotate) OR clicking on selected polyhedron body
   - Alt/Option key is held

**State Variables to Add:**
```javascript
let isDragCopying = false;      // Opt-drag copy mode active
let dragCopySource = null;       // Reference to original being copied
let dragCopyPreview = null;      // Visual preview of copy (optional)
```

### Phase 2: Visual Feedback (Optional)

**File:** `rt-init.js`
**Location:** `onMouseMove()` handler (~2830)

**Changes:**
1. If `isDragCopying`:
   - Show translucent preview of the copied form at cursor position
   - OR change cursor style to indicate copy mode
   - OR show "+ Copy" badge near cursor

**Consideration:** Keep it simple initially. The existing gumball visual may be sufficient feedback.

### Phase 3: Copy on Release

**File:** `rt-init.js`
**Location:** `onMouseUp()` handler (~3298)

**Changes:**
1. If `isDragCopying` and drag completed:
   ```javascript
   // Before clearing drag state
   if (isDragCopying && dragCopySource) {
     // Create instance at current (dragged) position
     RTStateManager.createInstance(dragCopySource, scene);

     // Reset source to original position (stored at drag start)
     dragCopySource.position.copy(dragStartPosition);
     dragCopySource.quaternion.copy(dragStartQuaternion);
     dragCopySource.scale.copy(dragStartScale);

     // Update counter
     updateNowCount();
   }
   ```

2. Clear copy state:
   ```javascript
   isDragCopying = false;
   dragCopySource = null;
   ```

### Phase 4: Store Original Transform

**File:** `rt-init.js`
**Location:** `onMouseDown()` handler

**Changes:**
1. When `isDragCopying` starts, store original transform:
   ```javascript
   const dragStartPosition = currentSelection.position.clone();
   const dragStartQuaternion = currentSelection.quaternion.clone();
   const dragStartScale = currentSelection.scale.clone();
   ```

### Phase 5: Edge Cases

**Handle these scenarios:**

1. **Escape key during drag-copy**: Cancel and restore original position
2. **Tool change during drag**: Cancel copy operation
3. **Deselect during drag**: Cancel copy operation
4. **Matrix forms**: Copy entire matrix (uses existing deep-clone in StateManager)
5. **Geodesic forms**: Preserve frequency/projection settings (already in userData)

---

## Testing Checklist

- [ ] Opt+click on selected polyhedron initiates drag-copy
- [ ] Original stays at starting position after release
- [ ] New instance created at release position
- [ ] Works with Move tool active
- [ ] Works with Scale tool active
- [ ] Works with Rotate tool active
- [ ] Works with free-body drag (no tool, just clicking on selected poly)
- [ ] Snapping applies to copied instance position
- [ ] Object snaps (vertex/edge/face) work during drag-copy
- [ ] NOW counter increments
- [ ] Undo works (removes copied instance)
- [ ] Works on Forms (base polyhedra)
- [ ] Works on Instances (existing deposits)
- [ ] Matrix forms copy entire matrix
- [ ] Escape cancels drag-copy cleanly
- [ ] Release outside canvas area cancels gracefully

---

## Future Considerations

1. **Multi-select copy**: If multi-select is implemented, copy all selected
2. **Copy with offset**: Shift+Opt for array/linear copy with fixed offset
3. **Context menu integration**: Add "Duplicate" option to right-click menu
4. **Keyboard shortcut**: Cmd+D to duplicate selected at same position

---

## Dependencies

- Selection must be active before opt-click works
- Relies on existing `RTStateManager.createInstance()` for cloning
- Uses existing snapping infrastructure
- Uses existing undo/redo system via StateManager

---

## Notes

- This is purely additive; no refactoring of existing drag logic required
- The modifier key check is a simple gate on existing behavior
- StateManager already handles deep cloning of complex geometries
- UI updates (coordinate displays, NOW counter) use existing functions
