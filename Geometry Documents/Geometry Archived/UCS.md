# UCS (User Coordinate System) — Workplan

**Branch**: `UCS`
**Date**: 2026-02-09
**Status**: Phase 2 complete — quaternion orbit eliminates polar singularity

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

## 6. Known Issue: Polar Singularity + Orbit Inversion

### 6.1 The Problem

THREE.js OrbitControls uses **spherical coordinates** (theta, phi) internally. This creates an inherent **polar singularity** — when the camera approaches the "poles" of the up-axis sphere (looking straight along `camera.up`):

- Near the pole, horizontal mouse movement causes rapid spinning instead of smooth orbit
- **Crossing the pole flips orbit direction** — same mouse direction, opposite camera movement
- This is the spherical-coordinate equivalent of gimbal lock

This happens even in default Z-up mode (orbit straight over the top to see it), but it's more noticeable with non-standard up vectors because the poles end up in unexpected screen positions.

**Observed in ARTExplorer**: When in QZ-up mode, on-axis camera views show CCW mouse drag → CW object rotation. Orbiting also encounters "magnetic resistance" at certain axial thresholds where the direction flips mid-drag.

This is a well-known limitation: [GitHub issue #9875](https://github.com/mrdoob/three.js/issues/9875), open since 2016, never merged into THREE.js.

### 6.2 Why OrbitControls Can't Fix This

OrbitControls computes spherical coordinates **directly relative to `camera.up`**. When `camera.up` is non-standard, the internal clamping (`minPolarAngle`, `maxPolarAngle`) doesn't account for the rotated coordinate frame, and the poles land in unexpected positions.

- **`reverseOrbit` does NOT exist** in any official THREE.js version (r160 through r182). Only in [three-stdlib](https://github.com/pmndrs/three-stdlib) (React Three Fiber community fork).
- **`rotateSpeed = -1`** partially compensates for constant inversion but cannot fix the position-dependent pole-crossing flip.
- **No OrbitControls + camera.up fixes** in r160→r182 [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide).

### 6.3 Solution: camera-controls Library (yomotsu)

[**camera-controls**](https://github.com/yomotsu/camera-controls) by yomotsu solves this architecturally. It also uses spherical coordinates, but with a critical difference:

1. Works internally in a **canonical Y-up space** via a quaternion transform (`_yAxisUpSpaceInverse`)
2. Applies orbit rotations in this normalized space where the poles are predictable
3. Transforms the result back to the user's actual `camera.up` direction
4. Proper angle clamping + `makeSafe()` works correctly regardless of up vector

This means: no polar singularity at unexpected positions, no mid-drag orbit reversal, smooth orbiting in any UCS orientation.

**Compatibility**:
- **License**: MIT — fully FOSS compatible, free to use, modify, and distribute
- **API**: Near-compatible with OrbitControls for our usage (damping, zoom, pan, target, mouseButtons, enabled toggle, update method)
- **Import**: Available via CDN (`npm/camera-controls`) or npm
- **THREE.js**: Works with r160+ (uses THREE as a dependency injection: `CameraControls.install({ THREE })`)

### 6.4 Implementation Options (Evaluated)

| Option | Effort | Quality | Status |
|--------|--------|---------|--------|
| **A. Drop-in camera-controls** | Medium | Best | Evaluated — ~95KB minified, 2400+ lines. Overkill for our needs. |
| **B. Port the up-vector transform** | Medium | Good | Evaluated — fragile across THREE.js upgrades. |
| **C. Roll our own quaternion orbit** | Medium | Good | **IMPLEMENTED** — ~35 lines core + ~25 lines event handling + ~5 lines damping. Keeps OrbitControls for zoom/pan. |
| **D. Accept the quirk** | None | Acceptable | Rejected — orbit inversion too disorienting in non-standard UCS modes. |

**Chosen**: Option C. Custom quaternion orbit inspired by camera-controls (yomotsu, MIT). Minimal code, zero new dependencies, solves the root cause.

### 6.5 Quaternion Orbit Implementation

The solution disables OrbitControls' spherical rotation (`controls.enableRotate = false`) and replaces it with a quaternion-based orbit that rotates the camera around:

1. **Horizontal**: `camera.up` axis (no pole — this axis is always perpendicular to the view)
2. **Vertical**: Camera's right axis (`cross(viewDirection, camera.up)`) — also always perpendicular

Since neither rotation axis ever aligns with the camera-to-target vector, there is no polar singularity. The spherical coordinate poles simply don't exist in this formulation.

OrbitControls continues to handle **zoom** (dolly) and **pan** — these are pole-independent and work correctly with any `camera.up`. Damping uses `controls.dampingFactor` for consistent feel.

**Key code** (rt-rendering.js, outer scope):
```javascript
function _applyOrbitRotation(dx, dy) {
  offset.copy(camera.position).sub(controls.target);
  // Horizontal: rotate around camera.up (no pole)
  quat.setFromAxisAngle(camera.up, -dx);
  offset.applyQuaternion(quat);
  // Vertical: rotate around camera's right axis (no pole)
  camera.getWorldDirection(dir);
  axis.crossVectors(dir, camera.up).normalize();
  quat.setFromAxisAngle(axis, -dy);
  offset.applyQuaternion(quat);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
}
```

**Attribution**: Inspired by [camera-controls](https://github.com/yomotsu/camera-controls) by yomotsu (MIT license), which solves the same problem via canonical Y-up quaternion transform.

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

### Phase 2: Orbit Feel (COMPLETE)
5. ~~Investigate `controls.reverseOrbit`~~ — does not exist in official THREE.js (any version)
6. ~~Camera position adjustment~~ — tested, caused quaternion drift / space warping
7. ~~`rotateSpeed = -1` toggle~~ — tested, minor improvement but cannot fix position-dependent pole-crossing flip
8. ~~Replace OrbitControls with camera-controls~~ — evaluated, ~95KB overkill for our needs
9. **Custom quaternion orbit** — implemented, ~65 lines total, eliminates polar singularity. See Section 6.5. Commit `75db42d`.

### Phase 3: Polish (TODO)
10. Persist UCS preference in localStorage
11. Expand toggle to include all 7 orientations if warranted
12. Consider whether camera view presets should be UCS-aware
13. Add UCS indicator label on canvas (e.g., small "QZ-up" badge)
14. Investigate click-selection in orthographic view (raycasting may need adjustment with quaternion orbit)

---

## 9. Estimated Scope (Final)

| File | Changes | Status |
|------|---------|--------|
| rt-rendering.js | ~105 lines (`setUCSOrientation` + quaternion orbit + damping) | Done |
| index.html | ~15 lines (toggle buttons) | Done |
| rt-init.js | ~12 lines (button event wiring) | Done |
| **Total new/changed code** | **~132 lines** | **Done** |

**No changes at all**: rt-math.js, rt-polyhedra.js, rt-state-manager.js, rt-filehandler.js, rt-coordinates.js, rt-grids.js, rt-papercut.js, rt-projections.js, **rt-controls.js** (no gumball reparenting needed).

---

## 10. Resolved Decisions

1. **Scene rotation vs camera rotation?** CAMERA — scene rotation (ucsGroup) caused intractable world/local coordinate mismatches in drag/move/scale. Camera rotation has zero impact on editing controls.

2. **Gumball handles rotate with UCS?** N/A — with camera-based approach, gumball handles stay in native orientation. The visual effect is identical (QZ handle appears vertical in QZ-up mode) because the camera tilts, not the scene.

3. **Coordinate panel shows UCS-relative values?** NO — always shows native Z-up coordinates. No confusion, no code change.

4. **Cutplane/papercut affected?** NO — scene coordinates unchanged.

5. **rt-controls.js changes needed?** NO — unlike ucsGroup approach, no gumball reparenting required.

## 11. Remaining Open Questions

1. **camera-controls integration scope?** API is near-compatible but need to audit: mouse button remapping (`controls.mouseButtons`), `controls.enabled` toggling during gumball drags, `controls.update()` signature (takes `delta` parameter), and damping property names (`smoothTime` vs `dampingFactor`). See Section 6.4.

2. **THREE.js upgrade?** Currently r160, latest r182. No orbit-relevant fixes, but r163+ drops WebGL 1 and r182 deprecates `PCFSoftShadowMap`. Upgrade is independent of UCS — worth doing separately if desired. camera-controls works with r160+.

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

### Known Issues

1. **Click-selection in orthographic view**: Raycasting for object selection is difficult/buggy in orthographic camera mode, in both Struppify (QZ-up) and default Z-up. Unclear whether this predates the UCS branch — may be a pre-existing issue exposed by testing, or introduced by the quaternion orbit replacing OrbitControls' rotation. Needs investigation in Phase 3.

2. **`rotateSpeed = -1` remnant**: The `setUCSOrientation()` still sets `controls.rotateSpeed = newUp.z < 0 ? -1 : 1`. Since OrbitControls rotation is now disabled (`controls.enableRotate = false`), this line has no effect on orbit behavior. It may be safely removed, or kept for future reference if OrbitControls rotation is ever re-enabled for specific modes.

---

*Workplan updated 2026-02-09. Phases 1-2 complete — custom quaternion orbit deployed.*
