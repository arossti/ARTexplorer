# ART Gumball: Workplan & Status

**Version:** 2.0
**Branch:** `GUMBALL-REFINE`
**Last Updated:** 2025-01-26
**Primary Code:** `modules/rt-init.js`
**State Management:** `modules/rt-state-manager.js`

---

## Overview

The ART Gumball is a transform control system for manipulating polyhedra using Rational Trigonometry principles. Unlike traditional CAD gumballs, ART Gumball operates with **quadrance and spread** alongside traditional units, maintaining algebraic exactness.

### Core Concepts

- **Forms**: Polyhedra templates that exist at origin - user transforms then deposits as Instances
- **Instances ("Nows")**: Deposited snapshots with stored transforms (Julian Barbour's relational time)
- **Editing Basis**: Localized gumball handles that appear at selected object's center
- **Dual Coordinates**: Simultaneous XYZ (Cartesian) and WXYZ (Quadray) support

---

## Implementation Status

### Completed Features

| Feature                 | Status      | Location                                        |
| ----------------------- | ----------- | ----------------------------------------------- |
| **Move Tool**           | ✅ Complete | `rt-init.js:1488+`                              |
| **Scale Tool**          | ✅ Complete | `rt-init.js:2224+`                              |
| **Rotate Tool**         | ✅ Complete | `rt-init.js:2148+`                              |
| **XYZ Handles**         | ✅ Complete | Arrows (move), Cubes (scale), Circles (rotate)  |
| **WXYZ Handles**        | ✅ Complete | Arrows (move), Cubes (scale), Hexagons (rotate) |
| **Click-to-Select**     | ✅ Complete | `onCanvasClick()`, `selectPolyhedron()`         |
| **Selection Highlight** | ✅ Complete | Cyan emissive glow (0x00ffff)                   |
| **NOW Button**          | ✅ Complete | Deposits Instance, resets Form to origin        |
| **NOW Counter**         | ✅ Complete | `RTStateManager.getDepositedCount()`            |
| **Form Reset**          | ✅ Complete | `RTStateManager.resetForm()`                    |
| **Instance Selection**  | ✅ Complete | Instances selectable same as Forms              |
| **Coordinate Inputs**   | ✅ Complete | XYZ + WXYZ fields, Enter to apply               |
| **Rotation Inputs**     | ✅ Complete | Degrees ↔ Spread bidirectional                  |
| **Grid Snapping**       | ✅ Complete | 0.1 intervals for RT precision                  |
| **Object Snapping**     | ✅ Complete | Vertex/Edge/Face snap toggles                   |
| **Uniform Scale**       | ✅ Complete | Central sphere handle                           |
| **Orbit Lock**          | ✅ Complete | Disabled when tool active                       |

### Partial / In Progress

| Feature            | Status     | Notes                                                      |
| ------------------ | ---------- | ---------------------------------------------------------- |
| **Drag Rotation**  | 🔶 Partial | Torus handles exist, drag logic pending                    |
| **Spread Presets** | 🔶 Partial | Input conversion works, preset buttons pending             |
| **RT-Pure Schema** | 🔶 Partial | Basic transform stored, full quadray/spread schema pending |

### Not Yet Implemented

| Feature                   | Priority | Notes                                          |
| ------------------------- | -------- | ---------------------------------------------- |
| **Multi-Select**          | High     | Shift+click to add to selection                |
| **Delete Key**            | High     | Remove selected Instance                       |
| **Undo/Redo**             | Medium   | Cmd+Z / Cmd+Shift+Z                            |
| **Keyboard Shortcuts**    | Medium   | G=Move, S=Scale, R=Rotate, N=NOW, ESC=Deselect |
| **Handle Hover Feedback** | Low      | Color/scale change on hover                    |
| **JSON/CSV Export**       | Low      | Full session export                            |

---

## Known Issues

### Selection System

- Single selection only (`currentSelection` object)
- `selectedPolyhedra` array exists but not wired for multi-select
- Clicking empty space preserves selection (by design - allows orbit)

### Rotation

- Interactive drag rotation on torus handles not fully connected
- Rotation via input fields works (Enter key)

### Scale

- Axis-constrained scale drag working
- Uniform scale via central sphere working

---

## Workplan: Remaining Tasks

### Phase 0: Adaptive Handle Scaling (GUMBALL-REFINE Branch Goal)

**Status:** COMPLETED
**Priority:** HIGH - This was the primary goal of the GUMBALL-REFINE branch

#### Completed Features

- [x] Add `calculateHandleLength(selectedObject)` function to rt-init.js
- [x] Modify `createEditingBasis()` to use calculated length instead of tetEdge
- [x] Update hit zone geometry to scale proportionally
- [x] Handles now adapt to object bounding sphere + 15% padding
- [x] Min/max constraints (1.0 - 20.0) keep handles usable at extremes
- [x] All handle components scale proportionally (arrows, tetrahedra, cubes, torus)

#### Additional Refinements Completed

- [x] Move handles: Replaced ArrowHelper cones with tetrahedra (matches basis vectors)
- [x] Tetrahedra orientation: Vertex points along axis direction
- [x] XYZ static basis: Now uses tetrahedral arrowheads (visual consistency)
- [x] Basis vector shafts: Hairlines instead of cylinders (XYZ and WXYZ)
- [x] Rotation handles: Removed hexagon/circle line loops, just torus remains
- [x] Rotation torus: Reduced thickness to 2/3 of previous
- [x] Hover feedback: Opacity increase on mouseover for all handles
- [x] Cursor change: Pointer cursor when hovering over handles

---

### Phase 1: Multi-Select (High Priority)

**Goal:** Allow selecting multiple Forms/Instances simultaneously

**Tasks:**

- [ ] Replace `currentSelection` with `selectedPolyhedra` array usage
- [ ] Implement Shift+click to add/remove from selection
- [ ] Update `getSelectedPolyhedra()` to return full array
- [ ] Update highlight system for multiple objects
- [ ] Update editing basis to show at selection centroid

### Phase 2: Delete & Undo (High Priority)

**Goal:** Allow removing Instances and reversing actions

**Tasks:**

- [ ] Delete key listener for selected Instances
- [ ] Prevent deletion of Forms (only Instances deletable)
- [ ] Implement undo stack in RTStateManager
- [ ] Cmd+Z / Ctrl+Z for undo
- [ ] Cmd+Shift+Z / Ctrl+Shift+Z for redo
- [ ] Track create/move/delete actions

### Phase 3: Keyboard Shortcuts (Medium Priority)

**Goal:** Professional CAD-like keyboard workflow

**Tasks:**

- [ ] G key = activate Move tool
- [ ] S key = activate Scale tool
- [ ] R key = activate Rotate tool
- [ ] N key = NOW (deposit instance)
- [ ] ESC key = deselect all / cancel operation
- [ ] Delete/Backspace = delete selected Instance

### Phase 4: Drag Rotation (Medium Priority)

**Goal:** Complete interactive rotation via handle dragging

**Tasks:**

- [ ] Connect torus handle mousedown to rotation start
- [ ] Calculate rotation from mouse movement around axis
- [ ] Apply spread-based snapping during drag
- [ ] Update rotation input fields in real-time
- [ ] Visual feedback (handle highlight during drag)

### Phase 5: Spread Presets (Low Priority)

**Goal:** One-click buttons for common exact spread values

**Preset Values:**

- `s = 0` (0° - parallel)
- `s = 1/6` (≈23.6°)
- `s = 1/4` (30°)
- `s = 1/3` (≈35.3° - tetrahedral dihedral)
- `s = 1/2` (45° - octahedral)
- `s = 2/3` (≈54.7°)
- `s = 3/4` (60°)
- `s = 1` (90° - perpendicular)

**Tasks:**

- [ ] Add preset buttons to rotation UI section
- [ ] Click preset = apply rotation immediately
- [ ] Visual indication of current rotation matching preset

### Phase 6: Export/Import (Low Priority)

**Goal:** Save and restore sessions

**Tasks:**

- [ ] JSON export of all Instances with transforms
- [ ] CSV export for spreadsheet analysis
- [ ] Import JSON to restore session
- [ ] Environment state capture (grids, camera, scale)

---

## RT Purity Guidelines

When implementing new features, maintain RT principles:

1. **Spread over Angles**: Use spread (s = sin²θ) for rotation, not degrees
2. **Quadrance over Distance**: Use Q = d² internally where possible
3. **Exact Algebraic Values**: Prefer 1/2, 1/3, 2/3 over 0.5, 0.333...
4. **Rational Snapping**: Snap to 0.1 intervals (RT-friendly)
5. **Dual Display**: Always show both XYZ and WXYZ coordinates

---

## Architecture Notes

### File Structure

```
modules/
├── rt-init.js          # Main app, gumball logic (~4000 lines)
├── rt-state-manager.js # Forms, Instances, selection state
├── rt-rendering.js     # Three.js scene, geometry creation
├── rt-math.js          # RT functions (spread, quadrance)
├── rt-polyhedra.js     # Polyhedra definitions
└── rt-janus.js         # Janus point transitions
```

### Key Functions in rt-init.js

- `createEditingBasis()` - Creates localized gumball handles
- `selectPolyhedron()` - Selection with highlight
- `applyHighlight()` / `clearHighlight()` - Visual feedback
- `getSelectedPolyhedra()` - Returns selected objects
- `exitToolMode()` - Clean tool deactivation
- `setupRotationInputs()` - Degrees↔Spread conversion
- `findNearestSnapTarget()` - Object snapping

### StateManager API

- `RTStateManager.createInstance(poly, scene)` - Deposit Instance
- `RTStateManager.resetForm(poly)` - Reset Form to origin
- `RTStateManager.getDepositedCount()` - Instance count
- `RTStateManager.getAllInstances()` - All deposited Instances

---

## References

- **Original Spec:** `ART-Gumball.md` (archived, verbose)
- **RT Math:** Wildberger's Rational Trigonometry
- **Julian Barbour:** "The End of Time" - relational time concept
- **Quadray Coordinates:** Kirby Urner's tetrahedral coordinate system
