# UCS (User Coordinate System) — Workplan

**Branch**: `UCS`
**Date**: 2026-02-09
**Status**: Phase 1 complete (camera-based), orbit inversion TBD

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

## 2. Design Principle: Camera Rotation, Not Scene Manipulation

**Key insight**: We rotate the **camera**, not the scene contents. This means:

- All scene geometry stays in native Z-up coordinates — nothing moves
- `camera.up` is changed to the desired axis direction
- Camera position is rotated by the same quaternion so the viewpoint tilts naturally
- All editing controls (gumball move/rotate/scale, free move, drag-copy) work identically — they operate in scene space which hasn't changed
- Files save/load/export in native Z-up coordinates — no transform to strip
- OrbitControls automatically adapt to the new `camera.up`

This is the simplest possible approach — a pure view-layer change with zero impact on scene logic.

### Why Not Scene Rotation?

We initially tried a `ucsGroup` wrapper approach (rotate scene contents inside a `THREE.Group`). This was **abandoned** because:

1. **World/local coordinate space mismatch**: Raycaster returns world-space positions, but objects inside a rotated parent group have local-space positions. Every drag/move/scale operation needed coordinate transforms.
2. **Intractable inversion bugs**: Despite adding 8+ world→local transforms across gumball axis move, scale, free-move drag plane setup, movement delta, and snap position, objects still moved opposite to mouse direction.
3. **Scope explosion**: What should have been ~71 lines grew into deep changes across rt-init.js, rt-controls.js, and rt-rendering.js with fragile coordinate conversions.

The camera-based approach achieves the same visual result with **~50 lines total** and zero coordinate space issues.

---

## 3. Architecture: Camera-Based UCS

### 3.1 Scene Structure (Unchanged)

All geometry groups remain directly on `scene` — no wrapper group:

```
scene
├── ambientLight
├── directionalLight
├── cartesianBasis
├── quadrayBasis
├── cubeGroup
├── tetrahedronGroup
├── ... (45+ groups)
```

### 3.2 UCS Rotation Math

To make an arbitrary axis `v` appear as "up" on screen:

```javascript
// Compute rotation from current camera up to desired up
const currentUp = camera.up.clone().normalize();
const newUp = desiredAxis.clone().normalize();
const quat = new THREE.Quaternion().setFromUnitVectors(currentUp, newUp);

// Apply to camera position (tilts the viewpoint)
camera.position.applyQuaternion(quat);
// Set new up vector (tells OrbitControls which way is "up")
camera.up.copy(newUp);
// Re-orient camera to look at target
camera.lookAt(controls.target);
controls.update();
```

For the specific presets:

| UCS Mode    | camera.up Vector   | Visual Effect                   |
|-------------|--------------------|---------------------------------|
| Z-up (default) | (0, 0, 1)     | Standard CAD view               |
| Y-up        | (0, 1, 0)         | Game engine convention          |
| X-up        | (1, 0, 0)         | X-axis vertical                 |
| QW-up       | (-1,-1, 1)/√3     | Yellow quadray skyward          |
| QX-up       | ( 1, 1, 1)/√3     | Red quadray skyward             |
| QY-up       | (-1, 1,-1)/√3     | Blue quadray skyward            |
| QZ-up       | ( 1,-1,-1)/√3     | Green quadray skyward (Struppify) |

All presets use `setFromUnitVectors()` — one quaternion computation.

---

## 4. What DOESN'T Change

This is a critical list — the camera-based UCS has **zero impact** on scene logic:

1. **Gumball controls** — move/rotate/scale all work identically (scene space unchanged)
2. **Free move / drag-copy** — raycaster and drag planes operate in unchanged scene space
3. **Papercut/cutplane** — vector-based, tied to scene geometry. No code changes.
4. **State save/load** — positions/rotations stored in native Z-up coordinates
5. **File export** (JSON/glTF) — native Z-up, no transform to strip
6. **Coordinate panel display** — always shows native XYZ/WXYZ values
7. **All geometry generation** — polyhedra, grids, etc. computed in native space
8. **All core math** — rt-math.js, rt-polyhedra.js, etc. completely untouched
9. **rt-controls.js** — no gumball reparenting needed (unlike ucsGroup approach)
10. **Projection system** — `_getWorldVerticesFromGroup()` returns native coordinates

---

## 5. What DOES Change

### 5.1 rt-rendering.js — `setUCSOrientation()` (~40 lines)

New function added before the return/exports block:

```javascript
let currentUCSMode = "z-up";

function setUCSOrientation(mode) {
  const orientations = {
    "z-up": new THREE.Vector3(0, 0, 1),
    "y-up": new THREE.Vector3(0, 1, 0),
    "x-up": new THREE.Vector3(1, 0, 0),
    "qw-up": Quadray.basisVectors[Quadray.AXIS_INDEX.qw].clone(),
    "qx-up": Quadray.basisVectors[Quadray.AXIS_INDEX.qx].clone(),
    "qy-up": Quadray.basisVectors[Quadray.AXIS_INDEX.qy].clone(),
    "qz-up": Quadray.basisVectors[Quadray.AXIS_INDEX.qz].clone(),
  };

  const desiredUp = orientations[mode];
  if (!desiredUp) return;

  const currentUp = camera.up.clone().normalize();
  const newUp = desiredUp.clone().normalize();

  if (currentUp.distanceTo(newUp) < 0.001) {
    currentUCSMode = mode;
    return; // Already there
  }

  const quat = new THREE.Quaternion().setFromUnitVectors(currentUp, newUp);
  camera.position.applyQuaternion(quat);
  camera.up.copy(newUp);
  camera.lookAt(controls.target);
  controls.update();

  currentUCSMode = mode;
  MetaLog.log(`UCS orientation set to: ${mode}`);
}
```

Exported as `setUCSOrientation` in the Camera controls section.

### 5.2 index.html — UI Toggle (~15 lines)

Added to the **Coordinate Systems** section (after Cartesian/Quadray basis toggles):

```html
<div class="control-item" style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #333">
  <label class="label-section">Scene Orientation (UCS)</label>
  <div class="toggle-btn-group">
    <button class="toggle-btn variant-objsnap active" data-ucs="z-up">Z-up</button>
    <button class="toggle-btn variant-objsnap" data-ucs="y-up">Y-up</button>
    <button class="toggle-btn variant-objsnap" data-ucs="qz-up">WZ-Up (Struppify)</button>
  </div>
  <p class="info-text" style="font-size: 10px; margin-top: 5px">View-only — coordinates and files remain in native Z-up</p>
</div>
```

### 5.3 rt-init.js — Wire Up UCS Buttons (~12 lines)

Standard event listener pattern with mutual exclusion:

```javascript
document.querySelectorAll("[data-ucs]").forEach(btn => {
  btn.addEventListener("click", function () {
    const mode = this.dataset.ucs;
    document.querySelectorAll("[data-ucs]").forEach(b => {
      b.classList.remove("active");
    });
    this.classList.add("active");
    renderingAPI.setUCSOrientation(mode);
  });
});
```

---

## 6. Known Issue: Orbit Inversion

When `camera.up` is set to a non-standard direction, OrbitControls orbit/rotate behavior can feel inverted — mouse dragging in one direction rotates the opposite way.

**Observed**: When in QZ-up mode, on-axis camera views show CCW mouse drag → CW object rotation. This is a well-known limitation of THREE.js OrbitControls with non-standard up vectors ([GitHub issue #9875](https://github.com/mrdoob/three.js/issues/9875), open since 2016, never merged).

### Research Findings (2026-02-09)

- **Current THREE.js version**: `0.160.0` (r160) via CDN
- **Latest THREE.js version**: `0.182.0` (r182)
- **`reverseOrbit` does NOT exist** in any official THREE.js version. It only exists in [three-stdlib](https://github.com/pmndrs/three-stdlib) (community fork for React Three Fiber). Upgrading THREE.js will not help.
- **No OrbitControls + camera.up fixes** in r160→r182 changelog. The [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) shows no relevant changes.

### Candidate Fixes (Phase 2)

1. **`controls.rotateSpeed = -1`** — Negate rotateSpeed when UCS up vector is in the opposite hemisphere (Z component < 0). Simple one-line toggle. Flips both horizontal and vertical orbit. Quick to test.

2. **Monkey-patch `rotateLeft`/`rotateUp`** — Override specific rotation methods on the controls instance to negate individual axes. More surgical control over horizontal vs vertical inversion, but fragile across THREE.js upgrades.

3. **[camera-controls](https://github.com/yomotsu/camera-controls) library** — Drop-in replacement for OrbitControls by yomotsu with better custom up-vector support and built-in orbit reversal. API-compatible. Would require swapping the import.

4. **Accept the quirk** — Editing controls work perfectly. Orbit inversion is noticeable but not a dealbreaker. Could document in UI tooltip: "orbit may feel different in non-Z-up modes."

5. **On-axis view preset integration** — Make camera view presets (iso, top, front...) UCS-aware so they produce natural orbit behavior in any UCS mode.

---

## 7. Risk Assessment

| Risk | Severity | Status |
|------|----------|--------|
| Editing controls broken | None | **Verified OK** — move, rotate, scale, free move, drag-copy all work |
| Orbit feels inverted | Low-Medium | Known issue, multiple fix options (Phase 2) |
| State save captures camera UCS | None | Camera position/up is not persisted in state — only object transforms |
| Projection system affected | None | Scene coordinates unchanged — world vertices are native Z-up |
| Camera view presets | Low | "Top" still means "looking down Z" regardless of UCS — acceptable |

---

## 8. Implementation Status

### Phase 1: Core (COMPLETE)
| Step | Status | Commit |
|------|--------|--------|
| 1. Add 3-button toggle in index.html | Done | `2e30bf0` |
| 2. Add `setUCSOrientation()` (camera-based) in rt-rendering.js | Done | `d66db53` |
| 3. Wire up buttons in rt-init.js | Done | `d66db53` |
| 4. Test visual correctness | Done | All editing controls work correctly |

### Phase 2: Orbit Feel (TODO)
5. ~~Investigate `controls.reverseOrbit`~~ — does not exist in official THREE.js (any version)
6. ~~Camera position adjustment~~ — tested, caused quaternion drift / space warping
7. Try `rotateSpeed = -1` toggle for inverted-hemisphere UCS modes
8. Evaluate camera-controls library as OrbitControls replacement
9. Fix on-axis view rotation inversion artifact

### Phase 3: Polish
8. Persist UCS preference in localStorage
9. Expand toggle to include all 7 orientations if warranted
10. Consider whether camera view presets should be UCS-aware
11. Add UCS indicator label on canvas (e.g., small "QZ-up" badge)

---

## 9. Estimated Scope (Final)

| File | Changes | Status |
|------|---------|--------|
| rt-rendering.js | ~40 lines (`setUCSOrientation` + export) | Done |
| index.html | ~15 lines (toggle buttons) | Done |
| rt-init.js | ~12 lines (button event wiring) | Done |
| **Total new/changed code** | **~67 lines** | **Done** |

**No changes at all**: rt-math.js, rt-polyhedra.js, rt-state-manager.js, rt-filehandler.js, rt-coordinates.js, rt-grids.js, rt-papercut.js, rt-projections.js, **rt-controls.js** (no gumball reparenting needed).

---

## 10. Resolved Decisions

1. **Scene rotation vs camera rotation?** CAMERA — scene rotation (ucsGroup) caused intractable world/local coordinate mismatches in drag/move/scale. Camera rotation has zero impact on editing controls.

2. **Gumball handles rotate with UCS?** N/A — with camera-based approach, gumball handles stay in native orientation. The visual effect is identical (QZ handle appears vertical in QZ-up mode) because the camera tilts, not the scene.

3. **Coordinate panel shows UCS-relative values?** NO — always shows native Z-up coordinates. No confusion, no code change.

4. **Cutplane/papercut affected?** NO — scene coordinates unchanged.

5. **rt-controls.js changes needed?** NO — unlike ucsGroup approach, no gumball reparenting required.

## 11. Remaining Open Questions

1. **Best approach for orbit inversion?** `reverseOrbit` ruled out (doesn't exist). Next candidates: `rotateSpeed = -1` toggle (quickest), or camera-controls library (cleanest). Needs testing.

2. **THREE.js upgrade?** Currently r160, latest r182. No orbit-relevant fixes, but r163+ drops WebGL 1 and r182 deprecates `PCFSoftShadowMap`. Upgrade is independent of UCS — worth doing separately if desired.

3. **Should camera view presets (iso, top, front...) be UCS-aware?** "Top" currently means "looking down Z". In QZ-up mode, should "top" mean looking down QZ? Phase 3 polish.

4. **Expand to full custom UCS?** The proposed system handles 7 presets. A full UCS (user-defined arbitrary plane) is scope creep — note for future.

5. **Persist UCS preference?** Should the chosen orientation survive page reload (localStorage)? Probably yes, simple addition in Phase 3.

---

## Appendix: Abandoned `ucsGroup` Approach

The initial design wrapped all scene geometry in a `THREE.Group` with a rotation quaternion. While visually correct, this approach failed because:

- **Raycaster world-space positions** conflicted with **local-space object positions** inside the rotated group
- 8+ coordinate transforms were added across gumball axis move, scale mode, free-move drag plane setup, movement delta, snap position, and node-mode editing — but objects still moved inversely to mouse direction
- The fix required deep changes to rt-init.js drag handling that were fragile and error-prone

Commits `8f31e7a` (ucsGroup implementation) and `d66db53` (revert + camera-based) document this evolution.

### Abandoned: Camera Position from Fixed Reference

A second attempt tried computing camera position from a fixed Z-up reference state (`Z_UP_CAMERA_POS = (5,-5,5)`) instead of chaining quaternions from the current position. Intent was to avoid quaternion drift, but this caused visible space warping — the camera position "jumped" unpredictably when switching between UCS modes. Reverted in favor of the simpler current→desired quaternion approach which preserves the user's current orbit distance and angle.

---

*Workplan updated 2026-02-09. Phase 1 complete — orbit inversion fix next.*
