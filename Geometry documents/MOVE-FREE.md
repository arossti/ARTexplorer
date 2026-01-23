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
- **✅ FREE MOVEMENT** - Direct click-drag on polyhedron body (Phase 1 complete)

### ~~Current Limitation~~ (RESOLVED)
~~Movement **only** works when dragging gumball handle hit-zones. Users cannot click-drag directly on a selected polyhedron to move it freely in screen space.~~

**Phase 1 implemented 2026-01-23**: Free movement now works when Move tool is active. Click-drag directly on selected polyhedron to move freely in screen-parallel plane. Snapping applies on release.

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

1. **Phase 1.1-1.4**: Free movement ✅ COMPLETE (2026-01-23)
   - ✅ Modified mousedown/mousemove/mouseup in rt-init.js
   - ✅ Added `isFreeMoving` and `freeMoveDragOffset` state flags
   - ✅ Camera-facing drag plane through object position
   - ✅ Offset calculation prevents object jumping on click
   - ✅ XYZ/WXYZ snapping applies on mouseup
   - ✅ Coordinate displays update in real-time
   - ✅ Works with radial matrices and instances

2. **Phase 2.1-2.2**: Object snap UI ✅ COMPLETE (2026-01-23)
   - ✅ Toggle buttons added to index.html (Vertex, Edge, Face)
   - ✅ State wired up in rt-init.js
   - ✅ CSS styles for `.variant-objsnap` buttons

3. **Phase 2.3-2.5**: Snap detection logic ✅ COMPLETE (2026-01-23)
   - ✅ Geometry-to-geometry comparison (source ↔ target)
   - ✅ Vertex, edge midpoint, and face centroid extraction
   - ✅ Node sphere filtering via `userData.isVertexNode`
   - ✅ Instance cloning preserves userData (rt-state-manager.js fix)
   - ✅ Yellow preview marker shows snap target during drag
   - ✅ Snap offset applied on mouseup

4. **Phase 2.6**: Quad-face refinement 🔲 IN PROGRESS
   - Issue: Cubes show 12 edges (includes 6 invisible diagonals from triangulation)
   - Issue: Cubes show 12 face centroids (2 triangles per quad face)
   - Solution: Store Polyhedra definition reference on mesh userData
   - Use explicit `edges` and `faces` arrays instead of extracting from BufferGeometry

5. **Phase 3**: Modularization (deferred)
   - Extract as functions stabilize
   - Maintain backwards compatibility

---

## Phase 2.6: Quad-Face Refinement (Detailed Plan)

### Problem
THREE.js triangulates all faces for rendering. A cube's 6 square faces become 12 triangles, creating:
- 6 invisible diagonal edges (the triangle hypotenuses)
- 12 triangle centroids instead of 6 face centroids

### Solution: Use Polyhedra Definition Arrays

**Step 1**: Store Polyhedra reference on group userData during mesh creation (rt-rendering.js)
```javascript
// In createPolyhedronMesh():
group.userData.polyhedraDef = {
  vertices: vertices,  // Original vertex array
  edges: edges,        // Explicit edge pairs [v1, v2]
  faces: faces         // Face vertex indices (can be quads)
};
```

**Step 2**: Modify snap helper functions to prefer stored definitions
```javascript
function getPolyhedronEdgeMidpoints(polyGroup) {
  // If polyhedraDef exists, use explicit edges
  if (polyGroup.userData.polyhedraDef?.edges) {
    const { vertices, edges } = polyGroup.userData.polyhedraDef;
    return edges.map(([a, b]) => {
      const v1 = vertices[a].clone();
      const v2 = vertices[b].clone();
      const midpoint = v1.add(v2).multiplyScalar(0.5);
      polyGroup.localToWorld(midpoint);
      return midpoint;
    });
  }
  // Fallback to BufferGeometry extraction (triangulated)
  // ... existing code ...
}
```

**Step 3**: Similar for face centroids - use original face definitions
```javascript
function getPolyhedronFaceCentroids(polyGroup) {
  if (polyGroup.userData.polyhedraDef?.faces) {
    const { vertices, faces } = polyGroup.userData.polyhedraDef;
    return faces.map(faceIndices => {
      const centroid = new THREE.Vector3();
      faceIndices.forEach(i => centroid.add(vertices[i]));
      centroid.divideScalar(faceIndices.length);
      polyGroup.localToWorld(centroid);
      return centroid;
    });
  }
  // Fallback to BufferGeometry extraction
  // ... existing code ...
}
```

### Files to Modify
| File | Changes |
|------|---------|
| `modules/rt-rendering.js` | Store `polyhedraDef` on group userData during mesh creation |
| `modules/rt-state-manager.js` | Copy `polyhedraDef` when cloning instances |
| `modules/rt-init.js` | Update `getPolyhedronEdgeMidpoints()` and `getPolyhedronFaceCentroids()` to use stored definitions |

### Expected Results
| Polyhedron | Before | After |
|------------|--------|-------|
| Cube edges | 18 (includes 6 diagonals) | 12 (true edges only) |
| Cube faces | 12 (triangle centroids) | 6 (quad face centroids) |
| Tetrahedron | No change (already triangular) | No change |
| Icosahedron | No change (already triangular) | No change |

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

### Phase 1: Free Movement
- [x] Free move works for cube, tetrahedron, octahedron (initial test passed)
- [x] Free move works for radial matrix polyhedra
- [x] Free move works for deposited instances
- [x] Grid snapping (XYZ/WXYZ) applies correctly on mouseup
- [x] Coordinate displays update during free move
- [x] No interference with gumball axis-constrained movement

### Phase 2: Object Snapping ✅ COMPLETE (2026-01-23)
- [x] Vertex snap detects and snaps correctly
- [x] Edge snap detects and snaps correctly (note: cubes show triangulated edges)
- [x] Face snap detects and snaps correctly (note: cubes show triangulated faces)
- [x] Node sphere geometry filtered out via `isVertexNode` userData
- [x] Instance cloning preserves userData for filtering
- [ ] Performance testing with 10+ visible objects (deferred)

### Phase 2.6: Quad-Face Refinement (Pending)
- [ ] Store Polyhedra definition on group userData
- [ ] Update edge extraction to use explicit edges array
- [ ] Update face extraction to use explicit faces array
- [ ] Copy polyhedraDef when cloning instances

---

## Open Questions

1. **Snap preview visual**: Highlight color? Line to snap target?
2. **Multiple snap candidates**: Snap to closest, or show menu?
3. **Snap between different polyhedron types**: Vertex-to-vertex across cube↔tetrahedron?
4. **Touch support**: Same gestures work on tablet?

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-23 | Phase 2.6 plan documented: Quad-face refinement for cubes |
| 2026-01-23 | Phase 2 complete: Object snapping (vertex/edge/face) with node filtering |
| 2026-01-23 | Fix: Instance cloning preserves userData for snap filtering |
| 2026-01-23 | Phase 1 complete: Free movement implemented in rt-init.js |
| 2026-01-22 | Document created, workplan drafted |

---

*Branch: FREE-MOVEMENT*
