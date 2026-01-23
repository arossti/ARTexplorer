# MOVE-FREE: Free Movement & Object Snapping Implementation

## Overview

Enable direct drag-to-move functionality for selected polyhedra without requiring gumball handle interaction. Similar to Blender's grab (G) or standard THREE.js TransformControls behavior.

**Branch**: `FREE-MOVEMENT`

---

## Current State

### What Works Now
- Selection via click-to-select raycasting
- Gumball-based movement along XYZ/WXYZ basis vector axes
- Grid snapping: Free (no snap), XYZ (0.1), WXYZ (√6/4)
- Scale and Rotate tools via gumball handles
- NOW button deposits instances, form resets to origin

### Current Limitation
Movement **only** works when dragging gumball handle hit-zones. Users cannot click-drag directly on a selected polyhedron to move it freely in screen space.

---

## Implementation Plan

### Phase 1: Free Movement (Core Feature)

**Goal**: Click-drag on selected/highlighted polyhedron to move freely in screen-parallel plane.

#### 1.1 Detection Logic
```
mousedown on canvas:
  1. If gumball handle hit → existing axis-constrained behavior
  2. Else if selected polyhedron hit → initiate FREE MOVE
  3. Else → existing selection/deselection logic
```

#### 1.2 Free Move Mechanics
- **Drag plane**: Camera-facing plane through object's current position
- **Movement**: Direct screen-space to world-space projection
- **Visual feedback**: Highlight intensifies during drag (optional glow)

#### 1.3 Code Location
Add to `rt-init.js` within `initGumballEventListeners()`:
- Extend `mousedown` handler to detect polyhedron body hits (not just gumball handles)
- New state flag: `isFreeMoving` (distinct from `isDragging` for gumball)
- Reuse existing `dragPlane` and `dragStartPoint` infrastructure

#### 1.4 UI Integration
- Free movement active when **Move tool is selected** AND **snap mode is "Free"**
- When snap mode is XYZ/WXYZ, movement still constrained to basis axes via gumball
- Consider: Always allow free movement regardless of snap mode, apply snap on release

**Decision Point**: Should free movement be:
- (A) Only available when "Free" snap is selected
- (B) Always available, with snapping applied on mouseup based on current mode

Recommend **(B)** for consistency with existing gumball behavior.

---

### Phase 2: Object Snapping (Enhancement)

**Goal**: Add vertex, edge, and face snap modes for precise object-to-object alignment.

#### 2.1 New Snap Modes
Add to Grid Snapping UI section:

| Mode | Behavior |
|------|----------|
| **Vertex** | Snap dragged object's nearest vertex to target object's nearest vertex |
| **Edge** | Snap dragged object's nearest edge midpoint to target edge midpoint |
| **Face** | Snap dragged object's nearest face centroid to target face centroid |

#### 2.2 UI Layout
```
Grid Snapping: [Free] [XYZ] [WXYZ]
Object Snaps:  [Vertex] [Edge] [Face]
```
Object snaps are **toggles** (can be combined with grid snapping).

#### 2.3 Snap Detection Algorithm
```
On mousemove (during free drag):
  1. Get all vertices/edges/faces of dragged object (world coords)
  2. Get all vertices/edges/faces of other visible objects
  3. Find closest pair within threshold distance
  4. If within snap threshold:
     - Visual indicator (highlight snap target)
     - On mouseup: Snap to that position
```

#### 2.4 Snap Threshold
- Default: 0.5 units (half the standard tetrahedron edge)
- Consider making adjustable via hidden setting

#### 2.5 Performance Considerations
- Only check visible objects
- Use bounding box pre-filter before detailed vertex checks
- Cache vertex positions (invalidate on transform)

---

### Phase 3: Modularization (Technical Debt)

**Goal**: Extract movement/snap logic to `rt-controls.js` module.

#### 3.1 Current Problem
`rt-init.js` has tightly coupled function calls that broke during previous extraction attempts. The module pattern exists in `rt-controls.js` but is not actively used.

#### 3.2 Extraction Strategy
1. **Keep event listeners in rt-init.js** (they need scene/camera/renderer references)
2. **Move logic functions to rt-controls.js**:
   - `calculateFreeMovement(startPoint, currentPoint, camera)`
   - `findSnapTargets(draggedObject, scene, snapMode)`
   - `applySnap(object, snapTarget, snapMode)`
   - `getObjectVertices(object)` / `getObjectEdges(object)` / `getObjectFaceCentroids(object)`
3. **Use delegation pattern**: `rt-init.js` calls `RTControls.calculateFreeMovement()` etc.

#### 3.3 Interface Design
```javascript
// rt-controls.js exports
RTControls.FreeMove = {
  calculateMovement(startPoint, currentPoint, camera, dragPlane),
  applyGridSnap(position, snapMode, Quadray),
  findObjectSnap(position, targetObjects, snapConfig),
};

RTControls.SnapTargets = {
  getVertices(object),
  getEdgeMidpoints(object),
  getFaceCentroids(object),
  findNearest(sourcePoint, targets, threshold),
};
```

---

### Future: Constraints (Deferred)

**Note**: Constraints are significantly more complex and deferred to future work.

#### Constraint Types (Conceptual)
| Type | Description | DOF Removed |
|------|-------------|-------------|
| **Vertex (Ball Joint)** | Objects share a point, can rotate freely around it | 3 translation |
| **Edge (Hinge)** | Objects share an edge, can only rotate around it | 5 (3 trans + 2 rot) |
| **Face (Planar)** | Objects share a face, locked together | 6 (fully constrained) |

#### Why Deferred
- Requires constraint solver (iterative position correction)
- Affects physics simulation if added later
- UI complexity for constraint creation/editing
- Need clear use cases before implementing

---

## Implementation Order

1. **Phase 1.1-1.4**: Free movement (~2-3 hours)
   - Modify mousedown/mousemove/mouseup in rt-init.js
   - Add `isFreeMoving` state flag
   - Test with all polyhedron types including radial matrices

2. **Phase 2.1-2.2**: Object snap UI (~1 hour)
   - Add toggle buttons to index.html
   - Wire up state in rt-init.js

3. **Phase 2.3-2.5**: Snap detection logic (~3-4 hours)
   - Implement vertex extraction for all polyhedron types
   - Spatial query for nearest targets
   - Visual feedback for snap preview

4. **Phase 3**: Modularization (ongoing)
   - Extract as functions stabilize
   - Maintain backwards compatibility

---

## Files to Modify

| File | Changes |
|------|---------|
| `modules/rt-init.js` | Free move logic in gumball event handlers |
| `modules/rt-controls.js` | New snap calculation functions (Phase 3) |
| `index.html` | Object snap toggle buttons |
| `art.css` | Styles for snap toggle buttons, snap preview highlights |

---

## Testing Checklist

- [ ] Free move works for cube, tetrahedron, octahedron
- [ ] Free move works for radial matrix polyhedra
- [ ] Free move works for deposited instances
- [ ] Grid snapping (XYZ/WXYZ) applies correctly on mouseup
- [ ] Vertex snap detects and snaps correctly
- [ ] Edge snap detects and snaps correctly
- [ ] Face snap detects and snaps correctly
- [ ] Performance acceptable with 10+ visible objects
- [ ] Coordinate displays update during free move
- [ ] No interference with gumball axis-constrained movement

---

## Open Questions

1. **Snap preview visual**: Highlight color? Line to snap target?
2. **Multiple snap candidates**: Snap to closest, or show menu?
3. **Snap between different polyhedron types**: Vertex-to-vertex across cube↔tetrahedron?
4. **Touch support**: Same gestures work on tablet?

---

*Document created: 2026-01-22*
*Branch: FREE-MOVEMENT*
