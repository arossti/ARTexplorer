# Deformations v2 - Implementation Roadmap

## Quick Start for New Agent

**Branch**: `DEFORM` (created from `main` at `af25fcd`)
**Status**: UI buttons in place (stubs), implementation not started
**Goal**: Enable vertex-level editing of Line primitives

### Current State
- Deform/Group/Undo/Redo buttons exist in UI (disabled stubs)
- Context menu has corresponding action handlers (stubs)
- No deform logic implemented yet - clean slate

### Key Files to Modify
| File | Purpose |
|------|---------|
| `modules/rt-init.js` | Add deform mode handlers, keyboard shortcuts |
| `modules/rt-state-manager.js` | Add selection state, deformation data structure |
| `modules/rt-rendering.js` | Add `updateLineGeometry()` function |
| `index.html` | Buttons already in place (lines 1820-1867) |
| `modules/rt-context.js` | Action handlers already in place (lines 144-180) |

---

## Implementation Order (Prerequisites First)

### Phase 0: Multi-Select (PREREQUISITE)
**Why first**: Deform mode requires selecting individual vertices within an already-selected instance. Multi-select infrastructure enables sub-object selection.

**Current selection system** (rt-state-manager.js ~line 67):
```javascript
selection: {
  type: null,      // 'form' or 'instance'
  id: null,        // Instance ID
  object: null,    // THREE.Object3D reference
}
```

**Required extension**:
```javascript
selection: {
  type: null,           // 'form' or 'instance'
  id: null,             // Instance ID
  object: null,         // THREE.Object3D reference
  mode: 'object',       // 'object' | 'vertex' | 'edge' | 'face'
  subSelection: {
    vertices: [],       // Array of selected vertex indices
    edges: [],          // Array of selected edge indices
    faces: []           // Array of selected face indices
  }
}
```

**Tasks**:
- [ ] Extend selection state in rt-state-manager.js
- [ ] Add Shift+click to add/remove from selection
- [ ] Visual feedback for multi-selected objects
- [ ] Update selection count in UI

### Phase 1: Grouping
**Why before deform**: Groups establish parent-child relationships needed for compound objects. Understanding group transforms helps with vertex-to-world coordinate mapping.

**Tasks**:
- [ ] Define Group data structure in rt-state-manager.js
- [ ] Wire "Group" button (Ctrl/Cmd+G)
- [ ] Create compound THREE.Group from selected instances
- [ ] Handle ungroup operation
- [ ] Persist groups in export/import

### Phase 2: Line Deformation (Thin Lines Only)
**Why thin lines first**: LineSegments (1px) use standard THREE.js BufferGeometry that's easy to clone and update. Line2 (thick lines) uses internal Mesh geometry that's complex to handle.

**Key Discovery from Previous Attempt**:
> Line2 from three/addons uses **Mesh** internally, not Line objects.
> When lineWidth > 1, Line2 creates a triangular prism (Mesh) to simulate thick lines.
> This is why cloning produced 4 Meshes instead of 2 nodes + 1 edge.

**Recommendation**: Force `lineWidth = 1` for deformable Lines initially.

**Tasks**:
- [ ] Force LineSegments (not Line2) for Line primitives during deform
- [ ] Add `deformation` field to instance schema
- [ ] Implement `enterDeformMode()` / `exitDeformMode()`
- [ ] Vertex node click detection (raycast to meshes with `isVertexNode`)
- [ ] Drag handling with offset calculation
- [ ] `updateLineGeometry()` to update edge + nodes
- [ ] Wire Deform button and 'D' keyboard shortcut

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

## Lessons Learned from UI-TWEAKS-J28 Branch

### What Went Wrong
1. **Jumped straight to deform** without multi-select infrastructure
2. **Didn't understand Line2 structure** - spent cycles debugging wrong object types
3. **Too many code changes at once** - hard to isolate issues

### What the Logs Revealed
```
[Deform] updateLineGeometry called. Group children:
  - type=Group, constructor=Group, isLine2=undefined
  - type=Mesh, constructor=Mesh, isMesh=true  (x4)
[Deform] No edge geometry found to update!
```

The instance had 4 Meshes (2 vertex nodes + 2 Line2 internal prism meshes) but NO Line2/LineSegments object. The edge we saw was from the **Form**, not the **Instance**.

### Technical Details

**Line2 internal structure**:
- Line2 object has `isLine2 = true`
- But Line2's **children** are regular Meshes (triangular prism geometry)
- Checking `child.isLine2` on traversed children returns `undefined`

**Correct approach for Line2**:
- Check for Line2 at the **group level** before traversing
- Clone Line2 as a unit, not its internal meshes
- Update via `line2.geometry.setPositions()` not position attributes

---

## Deformation Data Structure

```javascript
instance.deformation = {
  vertices: [
    { index: 0, offset: { x: 0, y: 0, z: 0 } },
    { index: 1, offset: { x: 0.5, y: 0, z: 0 } }
  ],
  originalVertices: [
    { x: 0, y: 0, z: -0.5 },
    { x: 0, y: 0, z: 0.5 }
  ]
}
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

### Phase 0: Multi-Select
- [ ] Click object A → selected
- [ ] Shift+click object B → both selected
- [ ] Shift+click object A → deselected, only B remains
- [ ] Visual feedback shows all selected objects

### Phase 1: Grouping
- [ ] Select 2+ instances
- [ ] Click Group (or Ctrl+G) → creates compound
- [ ] Move group → all children move together
- [ ] Export/Import → group preserved

### Phase 2: Line Deformation
- [ ] Create Line primitive (lineWidth = 1)
- [ ] Deposit instance with NOW
- [ ] Select instance
- [ ] Click Deform button → mode enters, nodes become selectable
- [ ] Click vertex node → node highlights yellow
- [ ] Drag vertex → edge follows, other vertex stays fixed
- [ ] Release → position persists
- [ ] ESC → exit deform mode
- [ ] Export/Import → deformation preserved

---

## Reference: Previous Branch Commits

| Commit | Description | Status |
|--------|-------------|--------|
| `e15d326` | Final state with diagnostic logging | Exploratory (discarded) |
| `f13df86` | First deform mode (nodes move, edge doesn't) | Bug discovered |
| `cf033dc` | HiFi UI styling (clean base) | Merged to main |
| `af25fcd` | PR #47 merged (UI buttons) | Current main |

---

*Document updated: January 28, 2026*
*Branch: DEFORM*
*Author: Andy & Claude*
