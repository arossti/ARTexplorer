# JAN30-MODULARIZATION-ANALYSIS: rt-init.js Function Breakdown

## Overview

`rt-init.js` is currently **4,730 lines** and serves as the application's main orchestration file. This document provides a comprehensive analysis of all key function groups and proposes modularization strategies.

### Key Insight from Previous Extractions

> **Functions that "call inward" (use libraries) succeed. Functions that "call outward" (to HTML/DOM) fail.**

The failed `rt-controls.js` extraction taught us that tightly coupled event handlers and state management are HIGH RISK. We need to find boundaries where dependencies flow ONE direction.

---

## Function Group Inventory

### 1. MODULE IMPORTS & INITIALIZATION (Lines 1-82)

**Functions:**
- `initApp()` - Nested import chain loader

**Dependencies:**
- THREE.js, OrbitControls, RT, Quadray, Polyhedra, RTStateManager, RTFileHandler

**Risk Level:** ❌ DO NOT EXTRACT
- Bootstrap code, entry point for entire application
- Deeply nested async imports make this the "root" of the dependency tree

---

### 2. EVENT HANDLERS - Form Toggles (Lines 130-1275)

**Functions:**
- Plane toggle switches (XY, XZ, YZ, IVM planes)
- Polyhedra checkboxes (Point, Line, Polygon, Prism, Cone, Cube, etc.)
- Geodesic controls toggles
- Matrix controls toggles
- Radial matrix controls
- Quadray demonstrator controls
- Scale sliders (Cube edge, Tet edge)
- Opacity sliders
- Tessellation sliders

**Dependencies:**
- `document.getElementById()`, `document.querySelectorAll()`
- `updateGeometry()` (renderingAPI)
- `renderingAPI.*` methods

**Risk Level:** 🟡 MEDIUM
- Could potentially be extracted as `rt-ui-bindings.js` if we pass dependencies
- But: Tightly coupled to HTML element IDs
- Pattern: Simple one-liner event → updateGeometry()

**Estimated Size:** ~1,150 lines

**Proposal:** These could be **generated** rather than hand-coded if we had a declarative UI binding system. But extraction alone won't simplify - it's just moving lines.

---

### 3. VIEW CONTROLS - Camera Presets (Lines 1278-1335)

**Functions:**
- Perspective/Orthographic toggle
- Centre camera button
- View preset buttons (X, Y, Zdown, Zup, Axo, QuadW, QuadX, QuadY, QuadZ)

**Dependencies:**
- `renderingAPI.switchCameraType()`
- `renderingAPI.resetCameraTarget()`
- `renderingAPI.setCameraPreset()`

**Risk Level:** 🟢 LOW
- Pure UI → renderingAPI calls
- No state management
- Self-contained

**Estimated Size:** ~60 lines

**Proposal:** Could extract to `rt-camera-controls.js` but value is low (only 60 lines)

---

### 4. DEMO MODAL HANDLERS (Lines 1436-1492)

**Functions:**
- Quadrance demo initialization
- Cross demo initialization
- Weierstrass demo initialization
- Color theory modal setup

**Dependencies:**
- `openDemoModal()`, `initQuadranceDemo()`, etc. (already in separate modules)
- `colorTheoryModal` module

**Risk Level:** 🟢 LOW
- Already uses external modules
- Just wiring

**Estimated Size:** ~60 lines

**Proposal:** Keep in init - this is exactly what init should do (wire modules together)

---

### 5. GUMBALL STATE & TOOL MANAGEMENT (Lines 1495-1685)

**State Variables:**
- `currentGumballTool` - null | "move" | "scale" | "rotate"
- `currentSnapMode` - 'free' | 'xyz' | 'wxyz'
- `isDragging`, `isFreeMoving`
- `selectedHandle`, `dragPlane`, `dragStartPoint`
- `selectedPolyhedra[]`
- `editingBasis` - THREE.Group for gumball handles
- Object snap state: `objectSnapVertex`, `objectSnapEdge`, `objectSnapFace`

**Functions:**
- Tool selector event listeners (Move, Scale, Rotate buttons)
- Snap toggle buttons
- Object snap toggle buttons

**Dependencies:**
- `document.querySelectorAll()` for buttons
- `controls.enabled` (OrbitControls)
- `createEditingBasis()`, `destroyEditingBasis()`

**Risk Level:** 🔴 HIGH
- Core state that multiple other functions depend on
- Extracting state without the functions that USE that state creates broken interfaces
- This is WHY rt-controls.js extraction failed

**Estimated Size:** ~190 lines

**Proposal:** Keep as-is. State and its consumers must stay together.

---

### 6. ROTATION INPUT HANDLERS (Lines 1686-1740)

**Functions:**
- `setupRotationInputs(degreesId, spreadId, axis)` - Factory function

**Dependencies:**
- `document.getElementById()`
- `RT.degreesToSpread()`, `RT.spreadToDegrees()`

**Risk Level:** 🟢 LOW
- Self-contained factory pattern
- Pure conversion logic (degrees ↔ spread)

**Estimated Size:** ~55 lines

**Proposal:** Could extract to `rt-rotation-utils.js` but minimal value

---

### 7. COORDINATE INPUT HANDLERS (Lines 1742-2093)

**Functions:**
- `exitToolMode()` - Exit current gumball tool
- `setupMoveCoordinateInputs()` - XYZ move input handlers
- `setupMoveQuadrayInputs()` - WXYZ move input handlers
- `setupRotateDegreesInputs()` - XYZ rotation via degrees
- `setupRotateQuadrayDegreesInputs()` - WXYZ rotation via degrees
- `setupRotateSpreadInputs()` - XYZ rotation via spread
- `setupRotateQuadraySpreadInputs()` - WXYZ rotation via spread

**Dependencies:**
- `currentGumballTool` state
- `getSelectedPolyhedra()`
- `editingBasis`
- `Quadray.basisVectors`, `Quadray.toCartesian()`

**Risk Level:** 🟡 MEDIUM
- These CONSUME gumball state but don't modify it directly
- Coordinate transformations are pure(ish)

**Estimated Size:** ~350 lines

**Proposal:** Could extract coordinate CONVERSION logic to `rt-coord-transforms.js` (the math, not the event handlers)

---

### 8. EDITING BASIS MANAGEMENT (Lines 2095-2493)

**Functions:**
- `calculateHandleLength(selectedObject)` - Adaptive gumball sizing
- `createEditingBasis(position, selectedObject)` - Build gumball visuals
- `updateEditingBasisPosition(position)` - Move gumball to follow selection
- `destroyEditingBasis()` - Remove gumball
- `applyHandleHover(handle)` - Hover highlight
- `clearHandleHover(handle)` - Remove hover highlight
- `onGumballHover(event)` - Hover detection

**Dependencies:**
- THREE.js extensively (ArrowHelper, Mesh, TorusGeometry, etc.)
- `editingBasis` state
- `currentGumballTool` state
- `renderingAPI.getCamera()`
- `hoveredHandle` state

**Risk Level:** 🔴 HIGH
- Creates THREE.js objects that are used by drag handlers
- State is shared with mouse event handlers
- This is the VISUAL component of gumball, but tightly coupled to BEHAVIOR

**Estimated Size:** ~400 lines

**Proposal:** This is a candidate for extraction IF we also extract the drag handlers. See "Gumball Extraction Strategy" below.

---

### 9. SELECTION SYSTEM (Lines 2608-2920)

**Functions:**
- `selectPolyhedron(polyhedron, addToSelection)` - Select object
- `updateSelectionCountUI()` - Update UI counter
- `applyHighlight(polyhedron)` - Cyan glow effect
- `clearHighlight(polyhedron)` - Remove glow
- `deselectAll()` - Clear selection
- `onCanvasClick(event)` - Click-to-select handler
- `getSelectedPolyhedra()` - Get selection array
- `updateMovedPointConnections(polyhedra)` - Bug 7 fix

**Dependencies:**
- `RTStateManager.isSelected()`, `.addToSelection()`, `.removeFromSelection()`, etc.
- `currentSelection` state
- Form group variables (cubeGroup, tetrahedronGroup, etc.)

**Risk Level:** 🟡 MEDIUM
- Selection logic is well-defined
- But: Uses form group variables extensively
- But: `onCanvasClick` needs raycaster and all form groups

**Estimated Size:** ~310 lines

**Proposal:** Could extract selection STATE to RTStateManager (already partially done), but the raycasting/click handling depends on scene objects.

---

### 10. OBJECT SNAPPING HELPERS (Lines 2948-3227)

**Functions:**
- `getPolyhedronVertices(polyGroup)` - ✅ EXTRACTED to rt-snap-geometry.js
- `getPolyhedronEdgeMidpoints(polyGroup)` - ✅ EXTRACTED
- `getPolyhedronFaceCentroids(polyGroup)` - ✅ EXTRACTED
- `findNearestSnapTarget(position, excludeGroup, threshold)` - Still in rt-init.js
- `updateSnapPreviewMarker(position, snapType)` - Create/update visual marker
- `clearSnapPreviewMarker()` - Remove marker

**Dependencies:**
- Pure geometry functions: THREE only (already extracted)
- `findNearestSnapTarget`: Uses form groups, objectSnapVertex/Edge/Face state, RTStateManager

**Risk Level:** 🟢 LOW (pure geometry) / 🔴 HIGH (findNearestSnapTarget)

**Estimated Size:** ~280 lines

**Status:** Partially extracted. `findNearestSnapTarget` has too many dependencies.

---

### 11. GUMBALL EVENT LISTENERS (Lines 3229-4339)

**Function:**
- `initGumballEventListeners()` - The big one

**Contains:**
- `mousedown` handler (Alt-click auto-move, gumball handle detection, free movement start)
- `mousemove` handler (Free movement, axis-constrained drag, object snapping preview)
- `mouseup` handler (Apply snapping, drag-copy completion, exit tool mode)

**Dependencies:**
- EVERYTHING: raycaster, mouse, camera, controls, scene
- All state variables (isDragging, isFreeMoving, selectedHandle, etc.)
- All form groups
- RTStateManager
- Quadray conversion
- RTJanus (Janus Point crossing)

**Risk Level:** 🔴 EXTREMELY HIGH
- This is the "nervous system" of the gumball
- 1,100 lines of tightly integrated event handling
- THIS is why rt-controls.js extraction failed

**Estimated Size:** ~1,100 lines

**Proposal:** See "Gumball Extraction Strategy" below.

---

### 12. SCENE INITIALIZATION & WIRING (Lines 4341-4508)

**Functions:**
- Initialize scene references
- RTJanus.init()
- Get form groups from renderingAPI
- RTFileHandler.init()
- File button event listeners (Import, Export, Save)
- Keyboard shortcuts (Ctrl+S, Ctrl+O, Ctrl+E)
- RTPapercut.init()
- RTViewManager.init()
- Cutplane axis buttons

**Risk Level:** ❌ DO NOT EXTRACT
- This IS what rt-init.js should be doing
- Wiring modules together

**Estimated Size:** ~170 lines

---

### 13. KEYBOARD SHORTCUTS & CONNECT/DISCONNECT (Lines 4545-4730)

**Functions:**
- ESC key handler (cancel operations, deselect)
- Delete key handler
- Undo/Redo (Ctrl+Z, Ctrl+Shift+Z)
- Connect 'C' key
- `handleConnectAction()` - Connect two Points with Line
- `handleDisconnectAction()` - Remove connected Line

**Dependencies:**
- `currentGumballTool`, `isDragCopying`, `currentSelection` state
- `RTStateManager.undo()`, `.redo()`, `.connectPoints()`, `.disconnectLine()`
- `deselectAll()`, `selectPolyhedron()`

**Risk Level:** 🟡 MEDIUM
- Connect/Disconnect are self-contained
- Keyboard shortcuts are wiring

**Estimated Size:** ~185 lines

**Proposal:** `handleConnectAction()` and `handleDisconnectAction()` could move to RTStateManager as they primarily call RTStateManager methods.

---

## Summary Table

| Section | Lines | Risk | Extract? | Notes |
|---------|-------|------|----------|-------|
| Module Imports | 82 | — | No | Bootstrap |
| Form Toggle Events | 1,150 | 🟡 | Maybe | UI wiring, high coupling |
| View Controls | 60 | 🟢 | Low value | Camera presets |
| Demo Modals | 60 | 🟢 | No | Already wired to modules |
| Gumball State | 190 | 🔴 | No | State must stay with consumers |
| Rotation Inputs | 55 | 🟢 | Low value | Small utility |
| Coordinate Inputs | 350 | 🟡 | Partial | Extract conversion math |
| Editing Basis | 400 | 🔴 | With drag | Visual gumball |
| Selection System | 310 | 🟡 | Partial | RTStateManager integration |
| Object Snapping | 280 | ✅ | Done (partial) | Pure geometry extracted |
| Gumball Events | 1,100 | 🔴🔴 | No* | Core interaction |
| Scene Wiring | 170 | — | No | Init's purpose |
| Keyboard/Connect | 185 | 🟡 | Partial | Connect logic to StateManager |
| **TOTAL** | **4,730** | | | |

---

## Modularization Strategies

### Strategy A: Extract Pure Logic (Low Risk, Low Impact)

**Already Done:**
- `rt-snap-geometry.js` - Pure geometry helpers (173 lines)

**Could Do:**
- Extract coordinate conversion math to `rt-coord-math.js`
- Extract Janus Point logic to `rt-janus.js` (already done!)
- Extract color manipulation to modules (already done via colorTheoryModal)

**Impact:** -100 to -200 lines from rt-init.js

### Strategy B: Consolidate State in RTStateManager (Medium Risk, Medium Impact)

**Move to RTStateManager:**
- `handleConnectAction()` / `handleDisconnectAction()` - These call RTStateManager methods anyway
- Selection highlight logic (`applyHighlight`, `clearHighlight`) could be STATE-aware

**Impact:** -50 to -100 lines, better encapsulation

### Strategy C: Declarative UI Binding System (High Effort, High Impact) ✅ IMPLEMENTED

> **Status (Jan 30, 2026)**: Phase 1 COMPLETE. Declarative binding system implemented and tested.

Instead of 1,150 lines of individual event listeners:

```javascript
// Current (verbose)
document.getElementById("showCube").addEventListener("change", updateGeometry);
document.getElementById("showTetrahedron").addEventListener("change", () => { ... });
// ... 100+ more

// Proposed (declarative) - NOW IMPLEMENTED
const formBindings = [
  { id: "showCube", type: "checkbox", handler: updateGeometry },
  { id: "showTetrahedron", type: "checkbox", handler: updateGeometry, controls: "geodesic-tetra-all" },
  // ... data-driven
];

initFormBindings(formBindings); // ~50 lines of generic code
```

**Files Created:**
- `modules/rt-ui-bindings.js` (370 lines) - Binding engine class
- `modules/rt-ui-binding-defs.js` (455 lines) - 79 binding definitions

**Current State:**
- 79 bindings registered (26 checkboxes, 23 sliders, 6 linked)
- Feature flag: `USE_DECLARATIVE_UI = true` in rt-init.js
- Both systems run in parallel (harmless double-registration)
- Legacy handlers NOT yet wrapped in conditional

**Impact:** Could reduce Form Toggle Events from 1,150 to ~200 lines

### Strategy D: Gumball Extraction Strategy (High Risk, High Reward)

This is the "holy grail" - extracting the gumball system properly.

**Key Insight:** The failed extraction happened because we tried to extract BEHAVIOR (events) without VISUAL (basis creation) without STATE (currentGumballTool, etc.).

**Proper Extraction Requires:**
1. Define a clean INTERFACE between init and gumball
2. Gumball module manages its OWN state
3. Init passes callbacks, not state references

```javascript
// rt-gumball.js (proposed)
export class RTGumball {
  constructor(THREE, Quadray, renderingAPI) {
    this.state = {
      tool: null,
      snapMode: 'free',
      isDragging: false,
      // ... all gumball state
    };
  }

  // Public methods
  setTool(tool) { ... }
  setSnapMode(mode) { ... }
  attachToSelection(selection) { ... }

  // Called by init
  initEventListeners(renderer, camera, controls, getSelectedPolyhedra) { ... }

  // Internal
  _createEditingBasis(position, object) { ... }
  _handleMouseDown(event) { ... }
  _handleMouseMove(event) { ... }
  _handleMouseUp(event) { ... }
}

// In rt-init.js
import { RTGumball } from "./rt-gumball.js";
const gumball = new RTGumball(THREE, Quadray, renderingAPI);
gumball.initEventListeners(renderer, camera, controls, getSelectedPolyhedra);
```

**This would extract:** ~1,700 lines (Gumball State + Editing Basis + Gumball Events)

**Risk:** High. Requires careful interface design.

---

## Recommended Action Plan

### Phase 1: Quick Wins ✅ DONE

1. ✅ Extract `rt-snap-geometry.js` (DONE - 173 lines extracted)
2. ⏳ Move `handleConnectAction`/`handleDisconnectAction` to RTStateManager (deferred)
3. ⏳ Clean up any unused variables or dead code (deferred)

**Expected reduction:** 50-100 lines
**Actual reduction:** ~173 lines (rt-snap-geometry.js)

### Phase 2: Declarative UI ✅ IMPLEMENTED (Jan 30, 2026)

1. ✅ Design declarative form binding system
2. ✅ Created `rt-ui-bindings.js` (370 lines) - binding engine
3. ✅ Created `rt-ui-binding-defs.js` (455 lines) - 79 binding definitions
4. ⏳ Remove legacy event handlers (next step)

**Expected reduction:** 900+ lines
**Current state:** Parallel execution (both systems active, harmless)
**Pending:** Legacy handler cleanup (~1,000 lines to remove after switchover verified)

### Phase 3: Gumball Module (Future)

1. Design RTGumball interface
2. Extract state, visuals, and events together
3. Test extensively before committing

**Expected reduction:** 1,700 lines

---

## Final Notes

**Why is rt-init.js so big?**

1. **It's doing its job** - wiring modules together, setting up event handlers
2. **Gumball is complex** - Move/Scale/Rotate with XYZ and WXYZ axes, snapping, drag-copy
3. **No UI framework** - Every checkbox needs manual `addEventListener()`
4. **Historical accumulation** - Features added over time

**Should we rename rt-init.js?**

No. The file IS initialization and should stay named that way. The goal is to make it smaller through extraction, not renaming.

**What's the minimum viable rt-init.js?**

~500-800 lines if:
- Gumball extracted (~1,700)
- UI bindings declarative (~950)
- Pure utilities extracted (~200)

---

## Implementation Status (Jan 30, 2026 - End of Day)

### Commits Made

| Commit | Description |
|--------|-------------|
| 9d34887 | Created rt-ui-bindings.js binding engine |
| b30bb75 | Created rt-ui-binding-defs.js with 79 bindings |
| f2ccf85 | Added documentation about parallel execution state |

### Current rt-init.js State

- **Line count:** 4,733 lines
- **Feature flag:** `USE_DECLARATIVE_UI = true` at line 31
- **Execution mode:** Parallel (both declarative and legacy handlers active)
- **Binding coverage:** ~61 handlers have declarative equivalents, ~37 legacy-only

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `modules/rt-ui-bindings.js` | 370 | RTUIBindings class - generic binding engine |
| `modules/rt-ui-binding-defs.js` | 455 | Binding definitions (79 total) |

### Next Steps

1. **Legacy handler cleanup** - Wrap covered handlers in `if (!USE_DECLARATIVE_UI)`
2. **Add missing handlers** - Geodesic projection radio buttons, view controls
3. **Test switchover** - Set flag to false, verify legacy-only works
4. **Final cleanup** - Remove legacy handlers after full verification

---

_Created: January 30, 2026_
_Updated: January 30, 2026 - End of Day_
_Status: PHASE 2 COMPLETE (Declarative UI system implemented)_
_Next: Legacy handler cleanup, then Phase 3 (Gumball)_
_Author: Andy & Claude_
