# UCS (User Coordinate System) — Workplan

**Branch**: `UCS`
**Date**: 2026-02-09
**Status**: Draft / Discussion

---

## 1. Problem Statement

ARTExplorer uses a **Z-up** convention (CAD/BIM standard). The camera is initialized at `(5, -5, 5)` with `camera.up = (0, 0, 1)` and OrbitControls orbits around this up axis.

The Quadray basis vectors point to tetrahedral vertices:
| Axis | Color  | Direction (XYZ)       | Screen Position |
|------|--------|-----------------------|-----------------|
| QX   | Red    | (1, 1, 1)/√3          | Upper-front-right |
| QW   | Yellow | (-1, -1, 1)/√3        | Upper-back-left |
| QY   | Blue   | (-1, 1, -1)/√3        | Lower-front-left |
| QZ   | Green  | (1, -1, -1)/√3        | Lower-back-right |

**User request (Struppi)**: QZ (Green) points "downward" on screen. User wants the option to see QZ pointing "up" — essentially re-orienting space so the green vector aims skyward, without losing any functionality. This orientation has been nicknamed **"Struppify"** in his honour.

A secondary use case: some users prefer **Y-up** (game engine / Three.js default) over Z-up (CAD/BIM).

---

## 2. Design Principle: Scene Rotation, Not Camera Manipulation

**Key insight**: We rotate the **scene contents**, not the camera. This means:

- OrbitControls remain untouched — orbit/pan/zoom behavior is identical
- `camera.up` stays `(0, 0, 1)` always
- The "trick" is a rotation applied to a wrapper group around all scene geometry
- Files save/load/export in native Z-up coordinates — the UCS rotation is stripped on save and re-applied on load

This is the standard approach used by Rhino, Revit, etc. The UCS is a **view-layer transformation** that sits between internal coordinates and the screen.

---

## 3. Architecture: The `ucsGroup` Wrapper

### 3.1 Current State (No Wrapper)

All ~30+ geometry groups are added directly to `scene`:

```
scene
├── ambientLight
├── directionalLight
├── cartesianBasis
├── quadrayBasis
├── cubeGroup
├── tetrahedronGroup
├── ... (30+ groups)
```

### 3.2 Proposed: Insert `ucsGroup` Between Scene and Content

```
scene
├── ambientLight        ← stays on scene (lights are view-relative)
├── directionalLight    ← stays on scene
└── ucsGroup            ← NEW: single rotation applied here
    ├── cartesianBasis
    ├── quadrayBasis
    ├── cubeGroup
    ├── tetrahedronGroup
    ├── ... (all geometry groups)
```

The `ucsGroup` is a `THREE.Group` with a single rotation quaternion. When UCS is "Z-up" (default), it has identity rotation. When UCS is "QZ-up", it carries the rotation that maps `(1,-1,-1)/√3 → (0,0,1)`.

### 3.3 Rotation Math

To make an arbitrary axis `v` point "up" (align with screen vertical = Z in our Z-up convention):

```javascript
// Compute rotation from current "up" (0,0,1) to desired axis v
const targetUp = new THREE.Vector3(0, 0, 1);
const desiredAxis = quadrayBasisVector.clone().normalize();

// We want: R * desiredAxis = targetUp
// So R rotates desiredAxis TO the up direction
// Equivalently: scene content rotates so desiredAxis appears vertical
const quaternion = new THREE.Quaternion().setFromUnitVectors(desiredAxis, targetUp);
ucsGroup.quaternion.copy(quaternion);
```

For the specific presets:

| UCS Mode    | Axis to Align Up | Rotation                        |
|-------------|------------------|---------------------------------|
| Z-up (default) | (0, 0, 1)    | Identity (no rotation)          |
| Y-up        | (0, 1, 0)       | 90° around X-axis               |
| X-up        | (1, 0, 0)       | -90° around Y-axis              |
| QW-up       | (-1,-1, 1)/√3   | ~54.7° compound rotation        |
| QX-up       | ( 1, 1, 1)/√3   | ~54.7° compound rotation        |
| QY-up       | (-1, 1,-1)/√3   | ~54.7° compound rotation        |
| QZ-up       | ( 1,-1,-1)/√3   | ~54.7° compound rotation        |

All of these are just `setFromUnitVectors()` — one line of math.

---

## 4. What DOESN'T Change

This is a critical list — the UCS is **purely an environment variable / view-layer trick**:

1. **OrbitControls** — orbit, pan, zoom work identically (camera.up unchanged)
2. **Gumball controls** — handles are vector-based and live inside `ucsGroup`, so they rotate naturally with the scene. No code changes needed. When QZ becomes "up", the QZ gumball handle visually becomes the vertical axis and Z becomes angled — correct behavior.
3. **Papercut/cutplane** — vector-based, tied to scene geometry. Rotates with `ucsGroup` naturally. No code changes.
4. **State save/load** — positions/rotations stored in native Z-up coordinates
5. **File export** (JSON/glTF) — native Z-up, no UCS transform baked in
6. **Coordinate panel display** — always shows native XYZ/WXYZ values (Option A: simple)
7. **All geometry generation** — polyhedra, grids, etc. computed in native space
8. **All core math** — rt-math.js, rt-polyhedra.js, etc. completely untouched

**Important finding**: The gumball (`editingBasis`) is currently added to `this.scene` directly (rt-controls.js:504). It must be reparented into `ucsGroup` so it rotates with the geometry. This is the one line in rt-controls.js that changes: `this.scene.add(...)` → `this.ucsGroup.add(...)`.

---

## 5. What DOES Change

### 5.1 rt-rendering.js — Scene Setup

**Modification**: After creating all geometry groups, parent them under `ucsGroup` instead of `scene`.

```javascript
// NEW: Create UCS wrapper group
const ucsGroup = new THREE.Group();
ucsGroup.name = 'ucsGroup';
scene.add(ucsGroup);

// CHANGE: Add geometry to ucsGroup instead of scene
ucsGroup.add(cubeGroup);
ucsGroup.add(tetrahedronGroup);
// ... all geometry groups
// (lights stay on scene)
```

**Estimated scope**: ~30 lines changed (`scene.add(X)` → `ucsGroup.add(X)`)

### 5.2 rt-rendering.js — UCS Rotation API

```javascript
// NEW function
function setUCSOrientation(mode) {
  const Z_UP = new THREE.Vector3(0, 0, 1);

  const orientations = {
    'z-up':  new THREE.Vector3(0, 0, 1),   // identity
    'y-up':  new THREE.Vector3(0, 1, 0),
    'x-up':  new THREE.Vector3(1, 0, 0),
    'qw-up': Quadray.basisVectors[Quadray.AXIS_INDEX.qw].clone(),
    'qx-up': Quadray.basisVectors[Quadray.AXIS_INDEX.qx].clone(),
    'qy-up': Quadray.basisVectors[Quadray.AXIS_INDEX.qy].clone(),
    'qz-up': Quadray.basisVectors[Quadray.AXIS_INDEX.qz].clone(),
  };

  const desiredUp = orientations[mode];
  if (!desiredUp) return;

  if (mode === 'z-up') {
    ucsGroup.quaternion.identity();
  } else {
    ucsGroup.quaternion.setFromUnitVectors(desiredUp, Z_UP);
  }

  currentUCSMode = mode;
}
```

### 5.3 index.html — UI Toggle

Add to the **Coordinate Systems** section (after the Cartesian/Quadray basis toggles):

```html
<div class="control-item">
  <label class="label-section">Scene Orientation (UCS)</label>
  <div class="toggle-btn-group">
    <button class="toggle-btn variant-objsnap active" data-ucs="z-up">Z-up</button>
    <button class="toggle-btn variant-objsnap" data-ucs="y-up">Y-up</button>
    <button class="toggle-btn variant-objsnap" data-ucs="qz-up">WZ-Up (Struppify)</button>
  </div>
</div>
```

Default shows 3 options: standard Z-up, game-engine Y-up, and the Struppi-requested WZ-Up. Could expand to a dropdown with all 7 Quadray orientations if needed.

### 5.4 rt-init.js — Wire Up UCS Buttons

Standard event listener pattern matching existing toggle-btn-group usage.

### 5.5 rt-controls.js — Gumball Reparenting (1 line)

The gumball (`editingBasis`) is currently added via `this.scene.add(this.state.editingBasis)` at line 504. This single call must target `ucsGroup` instead so the gumball rotates with the scene contents:

```javascript
// CHANGE (line 504): scene → ucsGroup
this.ucsGroup.add(this.state.editingBasis);
```

Raycasting: THREE.js `raycaster.intersectObjects()` already accounts for parent transforms, so hit-testing through the rotated `ucsGroup` should work natively.

### 5.6 rt-coordinates.js — No Change (Option A)

Always show native coordinates (internal Z-up). No code change. The coordinate panel displays canonical XYZ/WXYZ values regardless of UCS orientation. This is the simplest and most predictable approach — the numbers always mean the same thing.

---

## 6. Risk Assessment

Since everything vector-based (gumball, cutplane, grids, basis arrows) lives inside `ucsGroup` and rotates naturally, risks are minimal:

| Risk | Severity | Mitigation |
|------|----------|------------|
| Raycasting through rotated parent | Low | THREE.js handles parent transforms natively; verify with click test |
| State save captures UCS rotation | Low | UCS rotation is on `ucsGroup`, not on individual objects; state manager reads object transforms only |
| Projection system (rt-projections.js) | Medium | Uses `_getWorldVerticesFromGroup()` → `getWorldPosition()` which WILL include UCS rotation. May need to strip `ucsGroup` transform when extracting vertices for prime polygon projection math. |
| Camera view presets | Low | "Look down Z" etc. currently ignore UCS — acceptable for Phase 1 |
| Gumball `scene.add` reference | Low | Single line change (rt-controls.js:504) to add to `ucsGroup` instead |

**Lowest-risk approach possible** — the `ucsGroup` wrapper means everything inside it "just works" visually. The only system that reaches through to extract world coordinates (projections) needs a check.

---

## 7. Implementation Order

### Phase 1: Core (Minimal Viable UCS)
1. Create `ucsGroup` in rt-rendering.js
2. Reparent all geometry groups under `ucsGroup` (lights stay on scene)
3. Add `setUCSOrientation()` function
4. Add 3-button toggle in index.html (Z-up / Y-up / QZ-up)
5. Wire up in rt-init.js
6. **Test**: Visual correctness, orbit still works, basic selection works

### Phase 2: Compatibility Verification
7. Test gumball move/rotate/scale in non-default UCS
8. Test state save/load (confirm UCS rotation not baked into state)
9. Test file export (confirm native coordinates exported)
10. Test coordinate panel display
11. Test papercut with non-default UCS

### Phase 3: Polish
12. Add UCS indicator label on canvas (e.g., small "QZ-up" badge)
13. Persist UCS preference in localStorage
14. Expand toggle to include all 7 orientations if warranted
15. Consider whether camera view presets should be UCS-aware

---

## 8. Estimated Scope

| File | Changes |
|------|---------|
| rt-rendering.js | ~40 lines (ucsGroup creation, reparenting, setUCSOrientation, export ref) |
| index.html | ~15 lines (toggle buttons in Coordinate Systems section) |
| rt-init.js | ~15 lines (button event wiring) |
| rt-controls.js | ~1 line (gumball reparent: `scene` → `ucsGroup`) |
| **Total new/changed code** | **~71 lines** |

**No changes at all**: rt-math.js, rt-polyhedra.js, rt-state-manager.js, rt-filehandler.js, rt-coordinates.js, rt-grids.js, rt-papercut.js, rt-projections.js (unless projection extraction needs UCS stripping — TBD in testing).

This is an environment variable + scene wrapper. No geometry, math, or core logic rewrite.

---

## 9. Resolved Decisions

1. **Gumball handles rotate with UCS?** YES — gumball lives inside `ucsGroup`, rotates naturally. When QZ becomes "up", QZ gumball handle becomes vertical and Z handle becomes angled relative to the ground plane. Correct and expected behavior.

2. **Coordinate panel shows UCS-relative values?** NO — Option A (simple). Always show native Z-up coordinates. No confusion, no code change.

3. **Cutplane/papercut affected?** NO — vector-based, lives inside `ucsGroup`, rotates naturally with geometry.

## 10. Remaining Open Questions

1. **Should camera view presets (iso, top, front...) be UCS-aware?** "Top" currently means "looking down Z". In QZ-up mode, should "top" mean looking down QZ? Probably Phase 3 polish if at all.

2. **Expand to full custom UCS?** The proposed system handles 7 presets. A full UCS (user-defined arbitrary plane) is scope creep — note for future.

3. **Persist UCS preference?** Should the chosen orientation survive page reload (localStorage)? Probably yes, simple addition in Phase 3.

---

*Workplan drafted by Claude. Ready for review.*
