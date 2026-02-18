# Deformations v2 - Implementation Roadmap

## Quick Start for New Agent

**Branch**: `NODE-SELECT` (created from `main` after PR #54 merge)
**Status**: Node selection implemented, node-based transforms next
**Goal**: Enable vertex-level selection and eventually editing of polyhedra

### Current State (Jan 30, 2026)

- ✅ **Phase 0: Multi-Select** - COMPLETED & DEPLOYED
- ⏭️ **Phase 1: Grouping** - SKIPPED (multi-select provides sufficient functionality)
- ⚠️ **Phase 2: Line Deformation** - DEPRECATED (replaced by Point-Based Lines)
- ✅ **Phase 2A: Point-Based Lines** - COMPLETED & DEPLOYED (PR #49, #50, #51)
- ✅ **Phase 2A+: Multi-Point Topology** - VERIFIED WORKING
- ✅ **Phase 2B: Node Selection** - COMPLETED (commit `630c7c6`)
- 🔧 **Phase 2C: Node-Based Transform Origin** - IN PROGRESS

**Phase 2A Final Status** (Jan 29, 2026) - ALL DEPLOYED:

- ✅ Create 2 Point instances, multi-select, Connect → creates connectedLine
- ✅ Move single Point → line follows in real-time
- ✅ Rotate connected group → all objects transform together
- ✅ Vertex snap works without self-collapse (connected Points excluded from snap targets)
- ✅ Object snap updates line geometry on mouseup
- ✅ No deform mode needed - just use normal Move/Rotate tools
- ✅ Free move preserves relative positions of multi-selected objects (Bug 6 fix)
- ✅ Opt-click drag-copy works correctly with delta-based movement

**Phase 2A+ Discovery** (Jan 29, 2026 evening):

- ✅ **4+ Point connections work!** - Points can have multiple connections (valence > 2)
- ✅ Created closed quadrilateral: 4 Points + 4 connectedLines forming a loop
- ✅ Single Point move → both connected lines update correctly
- ✅ Adjacent 2-Point move → shared edge and outer edges all update
- ✅ **Bug 7 FIXED**: Opposite corner move now works - selective per-line updates

**Architectural Insight**: This confirms the pathway to:

1. **Planar case**: n Points + n edges = **Polygon** (when coplanar)
2. **Non-planar case**: n Points + full edge connectivity = **Deformed Polyhedra**
3. Base polyhedra remain inviolable - only instances are deformed via Point positions

**Ready for**: Phase 4 (Polygon node deformation via connected Points)

---

## TODO: Jan 30, 2026 Work Plan

### Priority 1: rt-init.js Extraction (MUST DO FIRST)

**Rationale**: `rt-init.js` is now 4,700+ lines and growing. Every feature we add makes extraction harder. Before adding polyhedral node selection, we MUST lighten this file.

**See**: [JAN28-EXTRACT.md](JAN28-EXTRACT.md) for full analysis.

**Immediate extraction candidate**:

- `rt-snap-geometry.js` (~250 lines) - Pure geometry helpers, no DOM, no state
  - `getPolyhedronVertices()`
  - `getPolyhedronEdgeMidpoints()`
  - `getPolyhedronFaceCentroids()`
  - `findNearestSnapTarget()`

**Success criteria**:

- [ ] Extract snap geometry functions to new module
- [ ] Verify object snapping still works
- [ ] rt-init.js reduced by ~250 lines
- [ ] No regressions in existing functionality

### Priority 2: Polyhedral Instance Node Selection ✅ COMPLETED (Jan 30, 2026)

**Goal**: Enable selection of individual vertices on instantiated polyhedra (not Forms).

**Status**: ✅ IMPLEMENTED in commit `630c7c6`

**Implementation**:

1. ✅ Click on an instance vertex node → node highlights yellow (selected)
2. ✅ Shift+click → add to multi-node selection
3. ✅ Click selected node → deselects that node
4. ✅ ESC → release all node selections, exit vertex mode
5. ✅ Click on face → selects entire polyhedron (cyan highlight, classical behavior)

**Files modified**:

- `rt-init.js` (+145 lines) - Node highlight functions, click detection, ESC handling
- `rt-state-manager.js` (+111 lines) - Vertex mode state, selection methods

---

### Priority 3: Node-Based Transform Origin (Next Step)

**Goal**: Use selected node as transform origin for Move/Rotate/Scale operations.

**Key Insight**: When a user wants to move a cube to snap vertex-to-vertex with another cube, dragging from the centroid makes snapping imprecise. But if the editing basis appears at the selected node, transforms become intuitive:

- **Move** from that node → precise vertex snapping
- **Rotate** around that node → pivot point at vertex
- **Scale** away from that node → anchor point at vertex

**Selection Behavior Summary**:

| Click Target | Selection Result | Editing Basis Position |
|-------------|------------------|----------------------|
| Instance face | Entire polyhedron (cyan) | Centroid (classical) |
| Instance vertex node | Single node (yellow) | At selected node |
| Shift+click nodes | Multi-node selection | At first selected node |

**Implementation Scope**:

1. When single node selected → position editing basis at that node's world position
2. Move tool drags from node position (better snap targeting)
3. Rotate tool pivots around node position
4. Scale tool anchors at node position
5. Multi-node selection → use first selected node as basis origin

**Why This Matters**:

- Vertex-to-vertex snapping becomes trivial (drag from source vertex, snap to target)
- Rotation around a specific corner is intuitive (select corner, rotate)
- Scale from anchor point (select anchor node, scale outward)

**This is NOT Deform**: Move/Rotate/Scale still transform the entire polyhedron rigidly. The node selection only determines the transform origin. Deform (moving a node while stretching connected edges) is a separate future command.

---

### Priority 4: Deform Mode (Future)

**Goal**: Move individual vertices while keeping rest of polyhedron intact.

**Distinction from Priority 3**:

| Operation | Priority 3 (Node-Based Origin) | Priority 4 (Deform) |
|-----------|-------------------------------|---------------------|
| Move | Entire polyhedron moves rigidly | Only selected node moves |
| Geometry | Preserved (rigid transform) | Stretched (edges follow node) |
| Use case | Precise positioning | Shape modification |

**Deform behavior**:

- Select node → Enter deform mode (D key or button)
- Drag node → Node moves, connected edges stretch to follow
- Other vertices stay fixed
- Release → New geometry persisted

**Files likely affected**:

- `rt-init.js` or new `rt-deform.js`
- `rt-state-manager.js` (deformation state)
- Instance geometry update functions

---

### Future Enhancement: Smart Multi-Point Connect

When user selects 4+ Points and hits Connect:

1. **Coplanarity test**: Are all Points in the same plane?
   - **Yes → Polygon**: Connect edges in order (convex hull or user-specified winding)
   - **No → Polyhedron**: Determine if Points define a valid polyhedron

2. **Polyhedron detection** (non-planar case):
   - 4 non-coplanar Points → Tetrahedron (6 edges, 4 faces)
   - 8 Points → Could be Cube, or other hexahedron
   - Use iterative solver similar to `rt-polyhedra.js` face construction
   - Reference: Euler's formula V - E + F = 2 for validation

3. **Implementation approach**:
   - Leverage existing polyhedra generation in [rt-polyhedra.js](modules/rt-polyhedra.js)
   - Calculate convex hull for edge determination
   - Allow user to specify face winding if ambiguous

### Key Files to Modify

| File                          | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `modules/rt-init.js`          | Add deform mode handlers, keyboard shortcuts     |
| `modules/rt-state-manager.js` | Add selection state, deformation data structure  |
| `modules/rt-rendering.js`     | Add `updateLineGeometry()` function              |
| `index.html`                  | Buttons already in place (lines 1820-1867)       |
| `modules/rt-context.js`       | Action handlers already in place (lines 144-180) |

### ⚠️ Critical Architecture Note

**rt-init.js is 4,648 lines** - avoid adding significant code here. Any new feature requiring >50 lines should be extracted to a separate module. See `JAN28-EXTRACT.md` for candidates.

---

## Implementation Order (Prerequisites First)

### Phase 0: Multi-Select ✅ COMPLETED

**Commit**: `d5e48a0` - "Feat: Add multi-select support (Phase 0 for Deform)"

**Implementation**:

- Extended selection state in rt-state-manager.js with `objects[]` array
- Added helper methods: `addToSelection()`, `removeFromSelection()`, `isSelected()`, `getSelectedObjects()`, `getSelectionCount()`, `clearSelection()`
- Modified `selectPolyhedron()` in rt-init.js to accept `addToSelection` parameter
- Added Shift+click behavior to toggle selection
- Added selection count UI in Edit Actions section

**Selection state** (rt-state-manager.js):

```javascript
selection: {
  type: null,           // 'form' or 'instance'
  id: null,             // Instance ID
  object: null,         // THREE.Object3D reference (primary selection)
  objects: [],          // Multi-select array
  mode: 'object',       // 'object' | 'vertex' | 'edge' | 'face'
  subSelection: {
    vertices: [],       // Array of selected vertex indices
    edges: [],          // Array of selected edge indices
    faces: []           // Array of selected face indices
  }
}
```

**Bonus**: Move and Rotate tools work with multi-select out of the box!

### Phase 1: Grouping ⏭️ SKIPPED

**Decision**: Skip formal grouping for now. Multi-select already provides group-like behavior for transforms.

**Why skipped (Jan 28, 2026)**:

1. Multi-select + transform tools already provide core "group" behavior
2. Implementation attempt revealed issues: cursor feedback, selection consistency, editing basis positioning
3. Adding ~200 lines to rt-init.js (already 4,648 lines) was unacceptable
4. Grouping adds no value over multi-select until we need hierarchical transforms

**Future consideration**: If we need persistent groups (parent-child hierarchy), implement as a separate module with proper state management.

### Phase 2: Line Deformation (Thin Lines Only) ⚠️ PARTIAL

**Commits**: `5de61af`, `4905e54`

**What Works**:

- ✅ lineWeight=1 now default (uses LineSegments, not Line2)
- ✅ D key and Deform button enter deform mode
- ✅ Green vertex nodes appear at line endpoints
- ✅ Click node → turns yellow (selected)
- ✅ Drag node → edge follows in real-time
- ✅ ESC exits deform mode

**What Didn't Work** (resolved now):

- ❌ Mouse up doesn't complete the operation (must press ESC)
- ❌ Subsequent edits delete one of the vertex nodes
- ❌ Orphaned vertex nodes appear disconnected from rendered line
- ❌ ~470 lines of complex code for fragile results

**Root Cause Analysis**:
The current approach fights the existing architecture:

1. Line instances clone geometry separately from the state-managed Point nodes
2. The deform code must track and update multiple objects (LineSegments, vertex Meshes)
3. Proximity matching between nodes is fragile and accumulates errors
4. No constraint system to keep edge connected to endpoints

---

## 💡 Alternative Approach: Point-Based Lines (RECOMMENDED)

### Key Insight

**Points already work perfectly** with:

- StateManager (create, select, move, delete)
- FileHandler (export, import)
- All snap modes (vertex, edge, face, object)
- All edit commands (move, rotate, scale)

**A Line is fundamentally two Points connected by an edge.**

### Proposed Architecture

Instead of complex deform code, leverage existing infrastructure:

```javascript
// A Line is defined by references to two Point instances
line.userData.connections = {
  startPoint: pointInstanceId1, // Reference to Point instance
  endPoint: pointInstanceId2, // Reference to Point instance
};

// When a Point moves, any connected Lines update automatically
RTStateManager.updateConnectedGeometry(pointInstance);
```

### Benefits

1. **No Deform Mode Needed** - Just move the Points normally
2. **Reuses Proven Code** - Points already work with all systems
3. **Natural Extensibility** - Connect 3+ points → polygon, connect faces → polyhedra
4. **Constraint-Based** - Line edge always follows its endpoints
5. **Less Code** - Remove rt-deform.js, add ~50 lines for connection tracking

### Implementation Plan

**Phase 2A: CONNECT Feature**

1. Select two Point instances (using multi-select)
2. Press "Connect" button or 'C' key
3. Creates a Line instance that references both Points
4. Line edge renders between Point positions

**Phase 2B: Automatic Updates**

1. When a Point moves, find all Lines that reference it
2. Update those Line geometries to match new Point positions
3. No special "deform mode" - just normal move operations

**Phase 2C: Visual Feedback**

1. When Line is selected, highlight connected Points
2. Optionally show "connection lines" during hover

### Research Needed

- THREE.js constraints (may not need - just update on move)
- How to store Point→Line relationships efficiently
- Whether to allow "orphan" Lines (not connected to Points)

---

### Phase 2 Original Approach (DEPRECATED)

**Key Discovery from Previous Attempt**:

> Line2 from three/addons uses **Mesh** internally, not Line objects.
> When lineWidth > 1, Line2 creates a triangular prism (Mesh) to simulate thick lines.

**Tasks (mostly done but fragile)**:

- [x] Force LineSegments (not Line2) for Line primitives during deform
- [ ] Add `deformation` field to instance schema
- [x] Implement `enterDeformMode()` / `exitDeformMode()`
- [x] Vertex node click detection (raycast to meshes with `isVertexNode`)
- [x] Drag handling with offset calculation
- [x] `updateLineGeometry()` to update edge + nodes
- [x] Wire Deform button and 'D' keyboard shortcut

### Phase 3: Line2 Support (Thick Lines)

**After thin lines work**, add Line2 handling:

```javascript
// Clone Line2 at object level, not children
if (child.isLine2) {
  const clone = child.clone();
  clone.geometry = child.geometry.clone();
  clone.material = child.material.clone();
  target.add(clone);
}

// Update Line2 geometry
if (child.isLine2) {
  child.geometry.setPositions([v0.x, v0.y, v0.z, v1.x, v1.y, v1.z]);
  child.computeLineDistances();
}
```

### Phase 4: Polygon Deformation

Extend to n-gon polygons (multiple vertices, edges update automatically).

### Phase 5: Polyhedra Deformation

Full 3D: vertices shared across faces, all incident geometry updates.

---

## Lessons Learned

### From UI-TWEAKS-J28 Branch (Earlier Deform Attempt)

**What Went Wrong**:

1. **Jumped straight to deform** without multi-select infrastructure
2. **Didn't understand Line2 structure** - spent cycles debugging wrong object types
3. **Too many code changes at once** - hard to isolate issues

**What the Logs Revealed**:

```
[Deform] updateLineGeometry called. Group children:
  - type=Group, constructor=Group, isLine2=undefined
  - type=Mesh, constructor=Mesh, isMesh=true  (x4)
[Deform] No edge geometry found to update!
```

The instance had 4 Meshes (2 vertex nodes + 2 Line2 internal prism meshes) but NO Line2/LineSegments object. The edge we saw was from the **Form**, not the **Instance**.

### Line2 Technical Details

**Line2 internal structure**:

- Line2 object has `isLine2 = true`
- But Line2's **children** are regular Meshes (triangular prism geometry)
- Checking `child.isLine2` on traversed children returns `undefined`

**Correct approach for Line2**:

- Check for Line2 at the **group level** before traversing
- Clone Line2 as a unit, not its internal meshes
- Update via `line2.geometry.setPositions()` not position attributes

### From DEFORM Branch Phase 1 (Grouping Attempt - Jan 28, 2026)

**What Went Wrong**:

1. **Grouping didn't add value over multi-select** - Move/Rotate already worked with multiple selections
2. **Too much code in rt-init.js** - Adding ~200 lines pushed file past 4,800 lines
3. **Multiple bugs appeared**: cursor stuck as pointer, individual items could be deselected from group, editing basis appeared at wrong position, Group button didn't toggle to Ungroup
4. **Scope isolation issues** - Similar problems to previous rt-controls.js extraction failures

**Key Insight**: Multi-select with existing transform tools provides 90% of grouping functionality without any new code. Formal grouping only needed for persistent parent-child hierarchies.

**Code Quality Principle**: "Move slowly and don't break things. Clean, minimal, modular code." Large files like rt-init.js (4,648 lines) need extraction, not expansion.

---

## Deformation Data Structure

```javascript
instance.deformation = {
  vertices: [
    { index: 0, offset: { x: 0, y: 0, z: 0 } },
    { index: 1, offset: { x: 0.5, y: 0, z: 0 } },
  ],
  originalVertices: [
    { x: 0, y: 0, z: -0.5 },
    { x: 0, y: 0, z: 0.5 },
  ],
};
```

Benefits:

- Non-destructive (original geometry preserved)
- Easy undo/redo (modify offsets)
- Clean serialization for export/import

---

## UI Elements Already in Place

### index.html (Controls section ~line 1820-1867)

- Edit Actions: Deform button, Group button (disabled stubs)
- History: Undo button, Redo button (disabled stubs)

### rt-context.js (lines 144-180)

- `action === "deform"` → calls `window.enterDeformMode()`
- `action === "group"` → logs stub message
- `action === "undo"` → calls `window.RTStateManager?.undo()`
- `action === "redo"` → calls `window.RTStateManager?.redo()`

---

## Testing Checklist

### Phase 0: Multi-Select ✅ PASSED

- [x] Click object A → selected
- [x] Shift+click object B → both selected
- [x] Shift+click object A → deselected, only B remains
- [x] Visual feedback shows all selected objects
- [x] Move tool works with multi-select
- [x] Rotate tool works with multi-select

### Phase 1: Grouping ⏭️ SKIPPED

(Multi-select provides equivalent functionality)

### Phase 2: Line Deformation (Current Approach - Partial)

- [x] Create Line primitive (lineWidth = 1) - now default
- [x] Deposit instance with NOW
- [x] Select instance
- [x] Click Deform button → mode enters, nodes become selectable
- [x] Click vertex node → node highlights yellow
- [x] Drag vertex → edge follows, other vertex stays fixed
- [ ] Release → position persists ❌ (requires ESC, subsequent edits break)
- [x] ESC → exit deform mode
- [ ] Export/Import → deformation preserved (not tested)

### Phase 2A: Point-Based Lines ✅ COMPLETED

- [x] CONNECT feature: select 2 Points → create Line between them ✅
- [x] Line stores references to Point instances ✅
- [x] Moving Points automatically updates connected Lines ✅
- [x] No deform mode needed - just use normal Move tool ✅
- [x] Vertex snap with self-collapse prevention ✅
- [x] Object snap triggers line geometry update ✅

**Resolved Issues (Jan 29, 2026)**:

- ~~Bug 1: ConnectedLine hard to select in orthographic views (1px line)~~ - OPEN (minor UX issue)
- ~~Bug 2: Rotating connectedLine alone disconnects it from Points~~ - **FIXED** (`9f92935`)
- ~~Bug 3: Rotating 2 connected Points causes visual revert on mouseup~~ - **FIXED** (`9f92935`)
- ~~Bug 4: Single-node movement doesn't update line~~ - **FIXED** (free movement path)
- ~~Bug 5: Vertex snap causes self-collapse (Points snap to each other)~~ - **FIXED** (exclude connected Points from snap targets)
- ~~Bug 6: Free move collapses multi-selected objects to same position~~ - **FIXED** (delta-based movement)
- ~~Bug 7: Partial subset movement breaks unselected connections~~ - **FIXED** (selective per-line updates)

**Solutions Applied**:

1. Auto-select connected Points when selecting a connectedLine
2. Skip `updateConnectedGeometry()` on mouseup when connectedLine is in selection
3. Add `updateConnectedGeometry()` call to OBJECT SNAP code path in free movement handler
4. Exclude connected Points from snap target candidates in `findNearestSnapTarget()`
5. Use delta-based movement in free move (like gumball drag) instead of absolute positioning

### Bug 7: Partial Subset Movement (Opposite Corners) - ✅ FIXED

**Discovered**: Jan 29, 2026 evening during 4-point quadrilateral testing
**Fixed**: Jan 29, 2026 evening - selective per-line update logic

**Symptom**:

- Create 4 Points in a closed loop (quadrilateral with 4 connectedLines)
- Select 2 **opposite** corners (non-adjacent Points)
- Move them → the lines connecting to the **unselected** Points detach

**What Works**:

- Single Point move: ✅ Both connected lines update
- Adjacent 2-Point move: ✅ All lines update (shared edge + outer edges)

**What Was Breaking** (now fixed):

- Opposite corner move: ~~❌ Lines to stationary Points freeze~~ ✅ NOW WORKS

**Root Cause Analysis**:

The `hasConnectedLine` check is **too coarse**:

```javascript
// Current logic (rt-init.js ~line 4361)
const hasConnectedLine = selectedPolyhedra.some(
  p => p.userData.type === "connectedLine"
);
if (!hasConnectedLine) {
  // Update ALL connections for moved Points
}
```

This assumes: "If ANY connectedLine is in selection, ALL lines moved together."

But with opposite corners:

- Point A and Point C are selected (opposite corners)
- Line A-B is NOT in selection (B is stationary)
- Line C-D is NOT in selection (D is stationary)
- The `hasConnectedLine` check may pass (if user also selected an edge), skipping updates
- OR: The lines A-B and C-D simply aren't being updated because their endpoints weren't both moved

**Actual Issue**: When moving Point A, `updateConnectedGeometry(A)` should update:

- Line A-B (A moved, B didn't → line must update)
- Line A-D (A moved, D didn't → line must update)

But if Line A-C was also selected (the diagonal), the current code skips ALL updates.

**Proposed Fix**:

Instead of all-or-nothing, check **per-line** whether both endpoints were in the selection:

```javascript
// For each moved Point, update connections where the OTHER endpoint wasn't moved
selectedPolyhedra.forEach(poly => {
  if (poly.userData.isInstance && poly.userData.type === "point") {
    const pointId = poly.userData.instanceId;
    const connectedLines = RTStateManager.getConnectedLines(pointId);

    connectedLines.forEach(lineId => {
      const line = RTStateManager.getInstanceById(lineId);
      const otherPointId =
        line.connections.startPoint === pointId
          ? line.connections.endPoint
          : line.connections.startPoint;

      // Only update if the OTHER point wasn't also moved
      const otherPointMoved = selectedPolyhedra.some(
        p => p.userData.instanceId === otherPointId
      );

      if (!otherPointMoved) {
        RTStateManager.updateLineGeometry(lineId);
      }
    });
  }
});
```

**Key Insight**: The line needs updating when **exactly one** of its endpoints moved. When **both** endpoints moved together (and were in selection), the line's relative geometry is preserved by the transform.

**Solution Implemented** (Jan 29, 2026):

Added `updateConnectedGeometrySelective(movedPointId, allMovedPointIds)` to [rt-state-manager.js:656-732](modules/rt-state-manager.js#L656-L732):

- Takes a Set of ALL moved Point IDs
- For each connected line, checks if the OTHER endpoint also moved
- Only updates lines where the other endpoint **didn't** move
- Lines between two moved Points are skipped (geometry preserved by transform)

Updated 3 locations in [rt-init.js](modules/rt-init.js) to use selective updates:

- Line ~4178 (Object snap handler)
- Line ~4308 (Free move handler)
- Line ~4449 (Gumball drag handler)

**Status**: ✅ FIXED - needs extensive edge case testing

---

## Reference: Branch Commits

### DEFORM Branch - All Merged to Main

| Commit    | Description                                    | Status         | PR  |
| --------- | ---------------------------------------------- | -------------- | --- |
| `67f73a6` | Fix opt-click drag-copy after Bug 6 fix        | ✅ Deployed    | #51 |
| `23a3c1e` | Fix free move multi-select collapse (Bug 6)    | ✅ Deployed    | #51 |
| `fc36a1b` | Object snap + self-collapse prevention (Bug 5) | ✅ Deployed    | #50 |
| `2355cb0` | Single-node movement fix (Bug 4)               | ✅ Deployed    | #49 |
| `9f92935` | Auto-select connected Points, fix rotation     | ✅ Deployed    | #49 |
| `d5e48a0` | Multi-select support (Phase 0)                 | ✅ Deployed    | #49 |
| `af25fcd` | Branch base (from main)                        | Starting point | -   |

### Previous Attempts (UI-TWEAKS-J28)

| Commit    | Description                                  | Status                  |
| --------- | -------------------------------------------- | ----------------------- |
| `e15d326` | Final state with diagnostic logging          | Exploratory (discarded) |
| `f13df86` | First deform mode (nodes move, edge doesn't) | Bug discovered          |
| `cf033dc` | HiFi UI styling (clean base)                 | Merged to main          |

---

_Document updated: January 29, 2026_
_Branch: DEFORM_
_Author: Andy & Claude_

---

## Bug 4: Single-Node Movement in Connected Group Broken ✅ FIXED (Jan 29, 2026)

**Status**: RESOLVED

### Symptom

After the rotation fix (commit `9f92935`), moving a **single Point** that is part of a connected group no longer updates the connected line. The line stays frozen at its original position while the Point moves away from it.

**Expected behavior (worked before):**

1. User creates 2 Point instances
2. Multi-select + Connect → creates connectedLine between them
3. ESC to deselect
4. Click ONE of the Points and drag it
5. Line follows the Point as it moves
6. On mouseup, Point is relocated with line still connected

**Current behavior (broken):**

- Steps 1-4 work
- Step 5: Line does NOT follow the dragged Point
- Step 6: Point ends up disconnected from frozen line

### Root Cause Analysis

**Investigation of [rt-init.js](../modules/rt-init.js)**

The code has TWO separate movement code paths:

#### Path A: GUMBALL AXIS DRAG (Constrained movement along basis vectors)

- Triggered when user drags along a gumball handle axis
- Lines 4245-4399 in rt-init.js
- **Has the fix** at lines 4361-4378:

```javascript
// Update connected geometry for any moved Point instances
// BUT skip if the connectedLine was also in the selection (it was transformed together)
const hasConnectedLine = selectedPolyhedra.some(
  p => p.userData.type === "connectedLine"
);
if (!hasConnectedLine) {
  selectedPolyhedra.forEach(poly => {
    if (
      poly.userData.isInstance &&
      poly.userData.type === "point" &&
      poly.userData.instanceId
    ) {
      RTStateManager.updateConnectedGeometry(poly.userData.instanceId);
    }
  });
}
```

#### Path B: FREE MOVEMENT (Direct polyhedron drag)

- Triggered when user clicks on selected polyhedron body without hitting gumball handle
- Lines 4085-4242 in rt-init.js
- **Missing the fix** - returns early at line 4242 without calling `updateConnectedGeometry()`

The free movement handler handles:

1. Object snapping (lines 4092-4134) - returns early
2. Grid snapping (lines 4140-4205)
3. Drag-copy (lines 4207-4237)
4. Cleanup (lines 4239-4242) - **returns without connection update**

### Why This Broke

The rotation fix in commit `9f92935` added the `updateConnectedGeometry()` call to the **gumball axis drag** path (lines 4361-4378), but the **free movement** path was not updated.

When clicking directly on a Point (not on a gumball handle), the movement uses the free movement path, which completes successfully but never tells the connected line to update its geometry.

### Solution

Add the same connected geometry update logic to the FREE MOVEMENT handler, just before the `return` at line 4242:

```javascript
// Location: rt-init.js, lines 4239-4242 (before return)

// === FIX: Update connected geometry for moved Point instances ===
// Same logic as gumball drag handler (lines 4361-4378)
const hasConnectedLine = selectedPolyhedra.some(
  p => p.userData.type === "connectedLine"
);
if (!hasConnectedLine) {
  selectedPolyhedra.forEach(poly => {
    if (
      poly.userData.isInstance &&
      poly.userData.type === "point" &&
      poly.userData.instanceId
    ) {
      RTStateManager.updateConnectedGeometry(poly.userData.instanceId);
    }
  });
}
// === END FIX ===

justFinishedDrag = true;
isFreeMoving = false;
selectedPolyhedra = [];
return;
```

### Why This Fix Works

1. `RTStateManager.updateConnectedGeometry(pointId)` ([rt-state-manager.js:597-655](../modules/rt-state-manager.js#L597-L655)) handles all the connection update logic:
   - Finds all connectedLines referencing the moved Point
   - Gets positions of both endpoint Points
   - Recalculates the line's midpoint
   - Updates the LineSegments geometry to span the two Points

2. The `hasConnectedLine` check prevents double-updates when the line was moved as part of a group (the existing fix for Bug 2 & 3)

### Alternative Debug Approach

If the above fix doesn't work, add logging to verify which code path is executing:

```javascript
// Add at start of FREE MOVEMENT handler (line 4085)
console.log(
  "🟢 FREE MOVEMENT mouseup - selectedPolyhedra:",
  selectedPolyhedra.map(p => ({
    type: p.userData.type,
    id: p.userData.instanceId,
  }))
);

// Add at start of GUMBALL DRAG handler (line 4246)
console.log(
  "🔵 GUMBALL DRAG mouseup - selectedPolyhedra:",
  selectedPolyhedra.map(p => ({
    type: p.userData.type,
    id: p.userData.instanceId,
  }))
);
```

Then drag a Point and check console to confirm which path executes.

### Files to Modify

| File                                            | Line  | Change                                             |
| ----------------------------------------------- | ----- | -------------------------------------------------- |
| [rt-init.js](../modules/rt-init.js#L4239-L4242) | ~4239 | Add `updateConnectedGeometry()` call before return |

### Testing After Fix

1. Create 2 Point instances
2. Multi-select both, click Connect
3. ESC to deselect all
4. Click ONE Point (not on gumball handle - direct click on node)
5. Drag the Point
6. ✅ Line should follow the Point in real-time
7. Release mouse
8. ✅ Line should remain connected to both Points

---

## Known Bugs (Jan 29, 2026)

### Bug 1: ConnectedLine selection fails in orthographic view

**Symptom**: User cannot select connectedLine instances in orthographic camera modes (Z-down, etc.), though selection works in perspective mode. Original Point instances remain selectable in all views.

**Root Cause (suspected)**: `connectPoints()` creates bare `THREE.LineSegments` with `THREE.LineBasicMaterial` - a 1px thin line with no vertex node meshes. Regular polyhedra have vertex node spheres that make them clickable. The raycast threshold (`selectionRaycaster.params.Line.threshold = 0.1`) may not be sufficient for orthographic projection.

**Potential Fix**:

- Use `Line2` with `LineMaterial` instead of `LineSegments` (provides thicker, more clickable geometry)
- Or add small invisible hit-test meshes at endpoints

### Bug 2: ConnectedLine transforms independently from its Points ✅ FIXED

**Status**: RESOLVED in commit `9f92935`

**Original Symptom**:

- Select connectedLine → Rotate → Line rotates correctly ✅
- BUT the connected Points do NOT move with the line ❌

**Solution**: Auto-select connected Points when selecting a connectedLine. In `selectPolyhedron()`, when the selected object is a `connectedLine`, automatically add its connected Points to the selection with highlights. This implements option 3 (group-like behavior) from the potential fixes.

### Bug 3: Rotate with 2 connected Points causes visual revert ✅ FIXED

**Status**: RESOLVED in commit `9f92935`

**Original Symptom**: Multi-select 2 Points that are connected, then Rotate → visual revert on mouseup.

**Root Cause**: `updateConnectedGeometry()` was being called on mouseup, which recalculates line position from Point positions. When all 3 objects rotate together, this recalculation was resetting the line.

**Solution**: Skip `updateConnectedGeometry()` on mouseup when a `connectedLine` is also in the selection. The check `selectedPolyhedra.some(p => p.userData.type === "connectedLine")` determines if the line was transformed together with its Points, in which case no geometry update is needed.

---

## Appendix: Why Point-Based Approach is Superior

### Current Line Implementation Issues

1. **Lines have their own vertex nodes** - duplicates Point functionality
2. **Cloning creates disconnected copies** - geometry diverges from visual nodes
3. **Deform code must track multiple objects** - LineSegments + vertex Meshes
4. **Proximity matching is fragile** - errors accumulate with each edit
5. **No constraint system** - edge and nodes can desync

### Point Implementation Already Handles

1. **Creation** - Single node at position, works with all tools
2. **Selection** - Click to select, Shift+click for multi-select
3. **Movement** - Gumball, snap to vertex/edge/face/object
4. **StateManager** - Tracked as instance, undo/redo ready
5. **FileHandler** - Export/import preserves position
6. **Rendering** - Node size options (Sm/Md/Lg/Packed)

### A Line = Two Connected Points

Instead of:

```
Line Instance
├── Mesh (vertex node 0)
├── LineSegments (edge)
└── Mesh (vertex node 1)
```

Use:

```
Point Instance A (existing, proven)
Point Instance B (existing, proven)
Line Instance
└── LineSegments (edge, positions derived from A & B)
    └── userData.connections = { start: A.id, end: B.id }
```

When Point A moves → Line automatically updates edge start position.
When Point B moves → Line automatically updates edge end position.

**No deform mode needed. No special code. Just move Points.**
