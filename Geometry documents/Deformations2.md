# Deformations v2 - Refined Approach

## Lessons Learned from UI-TWEAKS-J28 Branch

This document captures lessons learned from the exploratory UI-TWEAKS-J28 branch (Jan 28, 2026) and outlines a cleaner implementation path for vertex deformation.

### Reference Commits
- `e15d326` - Final state with diagnostic logging (exploratory)
- `f13df86` - First working deform mode (nodes move, edge doesn't follow)
- `cf033dc` - Clean base before deform experiments (HiFi UI styling)

---

## Key Discovery: Line2 Internal Structure

**Line2 from three/addons uses Mesh internally, not Line objects.**

When we created a Line primitive with `lineWidth > 1`, it renders using Line2 which:
- Creates a triangular prism geometry (Mesh) to simulate thick lines
- The Line2 object has `isLine2 = true`
- But its **children** are regular Meshes, not Lines

This explains why:
1. Instance cloning produced 4 Meshes (2 vertex nodes + 2 Line2 internal meshes)
2. `updateLineGeometry()` couldn't find Line2/LineSegments to update
3. The edge appeared fixed while nodes moved (we were seeing the Form's edge, not the Instance's)

### Implications

For **deformable primitives**, we have two options:

**Option A: Use LineSegments (1px thin lines)**
- Simpler cloning (standard THREE.js objects)
- Direct geometry updates via `positions` attribute
- Sacrifice thick line visual

**Option B: Handle Line2 as a unit**
- Clone Line2 at object level, not traverse children
- Update via `line2.geometry.setPositions()`
- More complex but preserves visual

**Recommendation**: Option A for Phase 1. Get deformation working with thin lines first, then add Line2 support later.

---

## Revised Architecture

### Core Principle: Deformation as Transform, Not Geometry Mutation

Instead of modifying BufferGeometry in place, store deformation as **offsets** that are applied during render:

```javascript
instance.deformation = {
  vertices: [
    { index: 0, offset: { x: 0, y: 0, z: 0 } },
    { index: 1, offset: { x: 0.5, y: 0, z: 0 } }  // Moved 0.5 in X
  ],
  originalVertices: [
    { x: 0, y: 0, z: -0.5 },
    { x: 0, y: 0, z: 0.5 }
  ]
}
```

Benefits:
- Non-destructive (original geometry preserved)
- Easy undo/redo (just modify offsets)
- Clean serialization for export/import

---

## Simplified Interaction Model

### Move Tool (existing)
- Click polyhedron to select
- Drag gumball handle to translate/rotate/scale
- Entire object moves as unit

### Deform Mode (new)
1. Select Line instance
2. Click "Deform" button OR press 'D'
3. Mode changes: vertex nodes become selectable
4. Click vertex node to select it (yellow highlight)
5. Drag to move that vertex (edge follows)
6. Click outside or press ESC to exit deform mode

### Multi-Select (future)
- Shift+click to add to selection
- Drag box to select multiple
- "Group" button to combine into compound object

---

## Implementation Phases

### Phase 1: Simple Line Deformation (LineSegments only)

**Scope**: Line primitive with `lineWidth = 1` (uses LineSegments, not Line2)

1. **Force thin lines for deformable Lines**
   - In `renderPolyhedron()`, if `type === "line"`, always use LineSegments
   - Skip Line2 path for now

2. **Clone LineSegments properly**
   - Already works in `createInstance()`

3. **Update LineSegments geometry**
   ```javascript
   function updateLineGeometry(instance) {
     const deform = instance.deformation;
     const v0 = calculateDeformedPosition(0, deform);
     const v1 = calculateDeformedPosition(1, deform);

     instance.threeObject.traverse(child => {
       if (child.isLineSegments) {
         const positions = child.geometry.attributes.position.array;
         positions[0] = v0.x; positions[1] = v0.y; positions[2] = v0.z;
         positions[3] = v1.x; positions[4] = v1.y; positions[5] = v1.z;
         child.geometry.attributes.position.needsUpdate = true;
       }
       if (child.userData?.isVertexNode) {
         child.position.copy(child.userData.vertexIndex === 0 ? v0 : v1);
       }
     });
   }
   ```

4. **Deform mode handlers** (from rt-init.js)
   - `enterDeformMode()` - validate Line selected, change mode
   - `exitDeformMode()` - reset mode, clear vertex selection
   - `onDeformMouseDown()` - select vertex node
   - `onDeformMouseMove()` - update offset during drag
   - `onDeformMouseUp()` - finalize position

### Phase 2: Line2 Support

Once Phase 1 works, add Line2 handling:

1. **Clone Line2 objects** (not their children)
   ```javascript
   if (child.isLine2) {
     const clone = child.clone();
     clone.geometry = child.geometry.clone();
     clone.material = child.material.clone();
     target.add(clone);
   }
   ```

2. **Update Line2 geometry**
   ```javascript
   if (child.isLine2) {
     child.geometry.setPositions([v0.x, v0.y, v0.z, v1.x, v1.y, v1.z]);
     child.computeLineDistances();
   }
   ```

### Phase 3: Polygon Deformation

Extend to n-gon polygons:
- Multiple vertex nodes (n instead of 2)
- Edges connect consecutive vertices
- Face recalculates from deformed vertices

### Phase 4: Polyhedra Deformation

Full 3D support:
- Vertices shared across multiple faces
- Moving one vertex affects all incident faces
- Edge lengths and face areas update dynamically

---

## UI Elements to Preserve

These were added in UI-TWEAKS-J28 and should be kept:

### index.html (Controls section ~line 1820-1867)
```html
<!-- Edit Actions -->
<div class="control-item spacing-top-large">
  <label class="label-section">Edit Actions</label>
  <div class="toggle-btn-group">
    <button class="toggle-btn variant-standard" id="deformBtn"
            title="Enter vertex deformation mode (D)" disabled>
      Deform
    </button>
    <button class="toggle-btn variant-standard" id="groupBtn"
            title="Group selected objects (Ctrl/Cmd+G)" disabled>
      Group
    </button>
  </div>
</div>

<!-- History -->
<div class="control-item spacing-top">
  <label class="label-section">History</label>
  <div class="toggle-btn-group">
    <button class="toggle-btn variant-standard" id="undoBtn"
            title="Undo (Ctrl/Cmd+Z)" disabled>
      Undo
    </button>
    <button class="toggle-btn variant-standard" id="redoBtn"
            title="Redo (Ctrl/Cmd+Shift+Z)" disabled>
      Redo
    </button>
  </div>
</div>
```

### rt-context.js (lines 144-180)
- Deform action handler
- Group action handler (stub)
- Undo/Redo action handlers (stub)

---

## Files Modified in UI-TWEAKS-J28

| File | Changes | Keep? |
|------|---------|-------|
| `index.html` | Deform/Group/Undo/Redo buttons | YES |
| `rt-context.js` | Action handlers for new buttons | YES |
| `rt-init.js` | Deform mode handlers | REWRITE |
| `rt-state-manager.js` | Line2 cloning, deform state | REWRITE |
| `rt-rendering.js` | updateLineGeometry() | REWRITE |
| `rt-controls.js` | STUB notice only | N/A (not active) |

---

## Next Steps

1. **Create clean branch** from `cf033dc` (pre-deform, with HiFi UI)
2. **Cherry-pick UI elements** from `e15d326`:
   - index.html button additions
   - rt-context.js action handlers
3. **Implement Phase 1** with thin lines only
4. **Test thoroughly** before adding Line2 support

---

## Testing Checklist

### Phase 1 Verification
- [ ] Create Line primitive (ensure lineWidth = 1 or force thin)
- [ ] Deposit instance with NOW
- [ ] Select instance
- [ ] Click Deform button → mode enters
- [ ] Click vertex node → node highlights yellow
- [ ] Drag vertex → edge follows, other vertex stays fixed
- [ ] Release → position persists
- [ ] ESC → exit deform mode
- [ ] Export/Import → deformation preserved

---

*Document created: January 28, 2026*
*Lessons from: UI-TWEAKS-J28 exploratory branch*
*Author: Andy & Claude*
