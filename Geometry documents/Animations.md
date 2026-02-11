# View Animation Workplan

## Goal

Build an animation system into the existing View Capture UI. Camera-only mode for interactive exploration, full-scene mode for export with object transitions, cutplanes, and projections. Also usable for animated favicon generation.

---

## Module Architecture: `rt-animate.js`

New module alongside the existing Papercut ecosystem. Follows the same pattern as `rt-prime-cuts.js` supporting `rt-papercut.js`.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  rt-papercut.js  │     │ rt-viewmanager.js│     │  rt-animate.js   │
│                  │     │                  │     │     (NEW)        │
│  Cutplane        │     │  View capture    │◄────│  Camera interp   │
│  Print mode      │     │  SVG generation  │     │  Easing          │
│  Section render  │     │  View registry   │     │  Timing / T btn  │
│                  │     │  Table UI        │     │  Preview loop    │
│                  │     │                  │     │  Batch export    │
│                  │     │                  │     │  Animation export│
│                  │     │                  │     │  SMIL assembly   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                          RT.getCamera()
                          RT.getControls()
```

### Separation of Concerns

| Module | Owns | Consumes |
|--------|------|----------|
| `rt-viewmanager.js` | View capture, SVG rendering, view registry, table UI | Camera, scene, renderer |
| `rt-animate.js` | Camera interpolation, easing, timing, preview loop, export | ViewManager (views + SVG gen), camera, controls |
| `rt-papercut.js` | Cutplane, print mode, sections | Scene, camera, renderer |

### Init Pattern

```js
// In rt-init.js, after ViewManager init:
import { RTAnimate } from "./rt-animate.js";
window.RTAnimate = RTAnimate;

RTAnimate.init({
  viewManager: RTViewManager,
  camera: RT.getCamera(),
  controls: RT.getControls(),
  renderer: RT.getRenderer(),
  scene: RT.getScene(),
});
```

### How ▶ Button Hooks Up

ViewManager's event delegation routes ▶ clicks through RTAnimate:

```js
// In rt-viewmanager.js _setupTableEventDelegation():
if (btn.classList.contains("view-load-btn")) {
  // Delegate to RTAnimate if available, fallback to snap
  if (window.RTAnimate) {
    window.RTAnimate.animateToView(viewId);
  } else {
    this.loadView(viewId);
  }
}
```

This keeps ViewManager independent — it works with or without rt-animate.js loaded.

---

## Phase 1: Smooth Animated Transitions

**Currently**: The ▶ button calls `loadView()` which **snaps** the camera instantly.
**Target**: ▶ **animates** the camera smoothly from current position to the saved view.

### What Changes

| File | Change |
|------|--------|
| `modules/rt-animate.js` | New module — `animateToView()`, easing, state |
| `modules/rt-viewmanager.js` | ▶ button delegates to `RTAnimate.animateToView()` |
| `modules/rt-init.js` | Import and init RTAnimate |

### `RTAnimate` Module Skeleton

```js
// modules/rt-animate.js
import { MetaLog } from "./rt-metalog.js";

export const RTAnimate = {
  // Dependencies (set during init)
  _viewManager: null,
  _camera: null,
  _controls: null,
  _renderer: null,
  _scene: null,

  // Animation state
  state: {
    active: false,
    frameId: null,
    previewing: false,
  },

  init({ viewManager, camera, controls, renderer, scene }) {
    this._viewManager = viewManager;
    this._camera = camera;
    this._controls = controls;
    this._renderer = renderer;
    this._scene = scene;
    this._wireUpUI();
    MetaLog.log(MetaLog.SUMMARY, "✅ RTAnimate initialized");
  },

  // --- Core: animate camera to a saved view ---

  animateToView(viewId, durationMs) {
    const vm = this._viewManager;
    const view = vm.state.views.find(v => v.id === viewId || v.name === viewId);
    if (!view?.camera) return;

    // Use per-view timing or default
    durationMs = durationMs || view.transitionDuration || 2000;

    // Cancel any running animation
    if (this.state.frameId) cancelAnimationFrame(this.state.frameId);

    const camera = this._camera;
    const controls = this._controls;

    const startPos = camera.position.clone();
    const startZoom = camera.zoom;
    const endPos = new THREE.Vector3(
      view.camera.position.x, view.camera.position.y, view.camera.position.z
    );
    const endZoom = view.camera.zoom || 1;

    const startTime = performance.now();
    this.state.active = true;

    // Return a promise so callers can await completion
    return new Promise(resolve => {
      const tick = (now) => {
        const elapsed = now - startTime;
        const rawT = Math.min(elapsed / durationMs, 1);
        const t = rawT * rawT * (3 - 2 * rawT); // smoothstep

        // Slerp on sphere: lerp + normalize preserves arc path
        const pos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
        const startDist = startPos.length();
        const endDist = endPos.length();
        const dist = startDist + (endDist - startDist) * t;
        pos.normalize().multiplyScalar(dist);

        camera.position.copy(pos);
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
        camera.zoom = startZoom + (endZoom - startZoom) * t;
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.update();

        if (rawT < 1) {
          this.state.frameId = requestAnimationFrame(tick);
        } else {
          this.state.active = false;
          this.state.frameId = null;
          vm.state.activeViewId = view.id;
          vm.setActiveViewRow(view.id);
          resolve();
        }
      };
      this.state.frameId = requestAnimationFrame(tick);
    });
  },

  // Easing functions
  _smoothstep: (t) => t * t * (3 - 2 * t),

  // ... Phase 2: _wireUpUI(), timing popup
  // ... Phase 3: previewAnimation(), exportBatch(), exportAnimation()
};
```

### How to Test

1. Load a cube in the app
2. Save two views (e.g. QW1 from body diagonal, X1 from X-axis)
3. Click ▶ on the other view — camera should smoothly orbit to it over 2s

---

## Phase 2: Timing Controls

**Problem**: Fixed 2s duration isn't flexible. Users need control over transition speed.
**Solution**: A small **T** button on each row that opens a timing slider popup.

### UI Layout (per row)

Current actions area is 60px with 3 buttons: `[▶] [↓] [✕]`

New layout adds **T** (timing) — 4 buttons in ~75px:

```
┌─────────────────────────────────────────────────────────────────┐
│ QW1    Tet-QW   Feb 10   [▶] [T] [↓] [✕]                      │
│ QW2    Tet-QW   Feb 10   [▶] [T] [↓] [✕]                      │
└─────────────────────────────────────────────────────────────────┘
```

### T Button Behavior

- Click **T** → toggles a small popup slider below the row
- Slider: **1s to 24s**, step 1s, default 2s
- Shows current value: `"2s"`
- Stores `view.transitionDuration` in the view object (persists with export)
- Click T again or click elsewhere to dismiss

```
│ QW2    Tet-QW   Feb 10   [▶] [T] [↓] [✕]                      │
│   ┌─ Transition: ──●──────────── 2s ─┐                         │
│   └───────────────────────────────────┘                         │
```

### CSS Patterns (from art.css)

The popup slider uses **established HiFi slider classes** — no new CSS needed:

| Class | From | Purpose |
|-------|------|---------|
| `.hifi-slider-container` | art.css:2378 | Flex container with gap |
| `.hifi-slider.hifi-slider--led` | art.css:2451 | Blue LED dot thumb, neumorphic track |
| `.hifi-slider-value` | art.css:2440 | Right-aligned value readout (#00b4ff) |
| `.toggle-btn.variant-small` | art.css:819 | T button itself (matches ▶ ↓ ✕) |

The popup container is a small `<div>` injected below the row with `position: relative` on the row. Dismiss on blur/outside-click.

```html
<!-- Injected below row when T is clicked -->
<div class="view-timing-popup" style="padding: 4px 8px; background: var(--hifi-bg-dark); border-radius: 4px;">
  <div class="hifi-slider-container">
    <input type="range" class="hifi-slider hifi-slider--led"
           min="1" max="24" step="1" value="2">
    <span class="hifi-slider-value">2s</span>
  </div>
</div>
```

### Data Model Addition

```js
// In captureView(), add to the view object:
view.transitionDuration = 2000; // ms, default 2s
```

---

## Phase 3: Animation Buttons

Three new buttons in a **second row** below the existing `[SVG] [Export] [Import] [✕]`:

```
[SVG] [Export] [Import] [✕]       ← existing
[Preview] [Batch] [Animation]     ← new row
```

### HTML Addition (after line 3670 in index.html)

```html
<!-- Animation Actions -->
<div style="display: flex; gap: 4px; margin-top: 4px">
  <button class="toggle-btn variant-small" id="previewAnimationBtn"
          title="Preview animation loop in scene" style="flex: 1">
    Preview
  </button>
  <button class="toggle-btn variant-small" id="exportBatchBtn"
          title="Export each view as individual SVG" style="flex: 1">
    Batch
  </button>
  <button class="toggle-btn variant-small" id="exportAnimationBtn"
          title="Export animated sequence" style="flex: 1">
    Animation
  </button>
</div>
```

### Button Behaviors

#### Preview

Plays through all saved views in table order, animating between each using `RTAnimate.animateToView()` with per-view timing. **Loops continuously** until clicked again (toggles to Stop). Lives in `rt-animate.js`.

```js
// In RTAnimate:
async previewAnimation() {
  if (this.state.previewing) {
    this.state.previewing = false;
    if (this.state.frameId) cancelAnimationFrame(this.state.frameId);
    return;
  }

  const views = this._viewManager._getSortedViews();
  if (views.length < 2) return;

  this.state.previewing = true;
  while (this.state.previewing) {
    for (const view of views) {
      if (!this.state.previewing) break;
      const duration = view.transitionDuration || 2000;
      await this.animateToView(view.id, duration);
      // Hold at keyframe briefly
      await new Promise(r => setTimeout(r, duration / 3));
    }
  }
},
```

#### Batch

Downloads each saved view as an individual SVG file. Iterates through views, positions camera at each, calls `ViewManager.generateSVG()`, triggers download. Lives in `rt-animate.js`.

#### Animation

Generates **interpolated frames** between all saved views and exports as a single animated file. This is the step that produces the favicon or any other animation.

**Output format options** (research findings):

| Format | Quality | Size | Browser Support | Client-side? |
|--------|---------|------|----------------|-------------|
| **SVG+SMIL** | Vector, infinite resolution | Tiny | All modern | Yes — just XML |
| **Animated GIF** | 256 colors, 1-bit alpha | Large | Universal | Yes — gifshot.js |
| **WebM** | Full color, alpha | Small | Chrome/FF/Edge | Yes — MediaRecorder API |
| **APNG** | Full color, full alpha | Medium | All modern | Possible but limited libs |

**Recommendation**: Offer two outputs:
1. **SVG+SMIL** (default) — our app already generates SVG paths, so we embed all frames into one SVG with `<animate>` or `<set>` timing. Infinite resolution, tiny file, works in any browser. Perfect for documentation, README, sharing.
2. **Animated GIF** (via Python `build_favicon.py`) — for the favicon specifically, since favicons don't support SVG animation.

```
┌─ Export Animation ─────────────────┐
│  Format:  ○ SVG (animated)         │
│           ○ GIF (rasterized)       │
│  Frames between views:  [  10  ]   │
│  [Export]                          │
└────────────────────────────────────┘
```

### SVG+SMIL Animation Strategy

Since `generateSVG()` already produces complete SVG paths for each frame, the animated SVG wraps all frames in a single file using CSS/SMIL visibility timing:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Frame 0 (visible at t=0s) -->
  <g id="frame-0" visibility="hidden">
    <set attributeName="visibility" to="visible"
         begin="0s" dur="0.2s" fill="remove"/>
    <!-- ...paths from generateSVG()... -->
  </g>
  <!-- Frame 1 (visible at t=0.2s) -->
  <g id="frame-1" visibility="hidden">
    <set attributeName="visibility" to="visible"
         begin="0.2s" dur="0.08s" fill="remove"/>
    <!-- ...paths... -->
  </g>
  <!-- ...etc for all frames... -->
</svg>
```

This produces a single self-contained SVG file that animates in any browser. No JavaScript, no external dependencies, scales to any size.

---

## State Machine: Preview / Stop / ▶ Interaction

The animation system has three states with well-defined transitions:

```
                    ▶ click
  ┌───────┐ ──────────────────→ ┌──────────────────┐
  │       │                      │  Animating        │
  │ Idle  │ ←─────────────────── │  (single view)    │
  │       │     done / cancel    │  active: true      │
  └───┬───┘                      └──────────────────┘
      │                                  ↑
      │ Preview                          │ ▶ click (interrupts,
      ▼                                  │  animates to new target)
  ┌──────────────────┐                   │
  │  Previewing      │ ──── ▶ click ─────┘
  │  (looping)       │
  │  previewing: true│
  └──────────────────┘
      │         ↑
      │ Stop    │ Preview (resumes from active view)
      ▼         │
  ┌───────┐ ────┘
  │ Idle  │
  └───────┘
```

### State: `RTAnimate.state`

```js
state: {
  active: false,       // true during any camera animation
  frameId: null,       // current requestAnimationFrame ID
  previewing: false,   // true during preview loop
  activeViewId: null,  // last-reached view (for resume)
  _cancelResolve: null // resolve fn to reject current animation
}
```

### Transition Rules

| From | Trigger | Action | To |
|------|---------|--------|----|
| **Idle** | ▶ click on view | `animateToView(viewId)` — smooth camera transition | **Animating** |
| **Animating** | Animation completes | `state.active = false`, update `activeViewId` | **Idle** |
| **Animating** | ▶ click on *different* view | `cancelAnimationFrame(frameId)`, resolve current promise, start new `animateToView()` | **Animating** (retarget) |
| **Idle** | Preview click | Button text → "Stop", call `previewAnimation()` | **Previewing** |
| **Previewing** | Stop click | `state.previewing = false`, `cancelAnimationFrame(frameId)`, button text → "Preview" | **Idle** |
| **Previewing** | ▶ click on view | `state.previewing = false` (exits loop), `cancelAnimationFrame(frameId)`, then `animateToView(viewId)` | **Animating** |

### Cancel Mechanics

```js
animateToView(viewId, durationMs) {
  // 1. Cancel any running animation
  if (this.state.frameId) {
    cancelAnimationFrame(this.state.frameId);
    this.state.frameId = null;
  }
  // 2. If previewing and ▶ is clicked, exit preview mode
  if (this.state.previewing) {
    this.state.previewing = false;
    this._updatePreviewButton(false);
  }
  // 3. Resolve any pending animation promise (so await unblocks)
  if (this.state._cancelResolve) {
    this.state._cancelResolve();
    this.state._cancelResolve = null;
  }

  // ... begin new animation (returns Promise) ...
  return new Promise(resolve => {
    this.state._cancelResolve = resolve;
    const tick = (now) => {
      // ... interpolation logic ...
      if (rawT < 1) {
        this.state.frameId = requestAnimationFrame(tick);
      } else {
        this.state.active = false;
        this.state.frameId = null;
        this.state._cancelResolve = null;
        this.state.activeViewId = view.id;
        resolve();
      }
    };
    this.state.frameId = requestAnimationFrame(tick);
  });
}
```

### Preview Loop with Cancel Awareness

```js
async previewAnimation() {
  if (this.state.previewing) {
    // Already previewing → Stop
    this.state.previewing = false;
    if (this.state.frameId) {
      cancelAnimationFrame(this.state.frameId);
      this.state.frameId = null;
    }
    if (this.state._cancelResolve) {
      this.state._cancelResolve();
      this.state._cancelResolve = null;
    }
    this._updatePreviewButton(false);
    return;
  }

  const views = this._viewManager._getSortedViews();
  if (views.length < 2) return;

  this.state.previewing = true;
  this._updatePreviewButton(true);

  // Find starting index — resume from activeViewId if set
  let startIdx = 0;
  if (this.state.activeViewId) {
    const idx = views.findIndex(v => v.id === this.state.activeViewId);
    if (idx >= 0) startIdx = (idx + 1) % views.length;
  }

  while (this.state.previewing) {
    for (let i = startIdx; i < views.length; i++) {
      if (!this.state.previewing) break;
      const view = views[i];
      const duration = view.transitionDuration || 2000;
      await this.animateToView(view.id, duration);
      if (!this.state.previewing) break;
      // Hold at keyframe
      await new Promise(r => setTimeout(r, Math.max(duration / 3, 500)));
    }
    startIdx = 0; // After first pass, always loop from beginning
  }

  this._updatePreviewButton(false);
}
```

### Preview Button Toggle

```js
_updatePreviewButton(playing) {
  const btn = document.getElementById('previewAnimationBtn');
  if (!btn) return;
  btn.textContent = playing ? 'Stop' : 'Preview';
  btn.classList.toggle('active', playing);
}
```

### Key Behaviors Summary

1. **▶ always wins**: Clicking ▶ on a view during preview exits the loop and animates to that view
2. **Preview resumes**: Starting Preview picks up from the last-reached view, not always from the top
3. **No jarring cuts**: Cancel resolves the current animation promise cleanly; the new animation starts from wherever the camera currently sits
4. **Button feedback**: Preview ↔ Stop text toggle gives clear state indication
5. **Hold frames**: Each keyframe holds for `duration/3` (min 500ms) before transitioning to the next

---

## Phase 4: Favicon Build (Python)

The animated SVG from Phase 3 is great for general use, but favicons need GIF format. A small Python script rasterizes the SVG frames.

### Prerequisites

```bash
pip install cairosvg Pillow
```

### `build_favicon.py`

```python
#!/usr/bin/env python3
"""Assemble SVG animation frames into favicon.gif + favicon.ico"""

import sys, glob
from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image

def build(svg_dir, hold_indices=None, target_size=64):
    svgs = sorted(glob.glob(f'{svg_dir}/frame_*.svg'))
    assert svgs, f'No frame_*.svg found in {svg_dir}'

    if hold_indices is None:
        # Default: first 3 and middle 3 are hold frames
        n = len(svgs)
        mid = n // 2
        hold_indices = set(range(3)) | set(range(mid, mid + 3))

    # SVG → PNG (in memory)
    pngs = []
    for svg_path in svgs:
        png_data = cairosvg.svg2png(
            url=svg_path,
            output_width=target_size,
            output_height=target_size,
        )
        pngs.append(Image.open(BytesIO(png_data)).convert('RGBA'))

    # Variable timing: 200ms hold, 80ms transition
    durations = [200 if i in hold_indices else 80 for i in range(len(pngs))]

    # Animated GIF
    pngs[0].save(
        'favicon.gif', save_all=True, append_images=pngs[1:],
        duration=durations, loop=0, transparency=0, disposal=2,
    )
    print(f'✅ favicon.gif ({target_size}x{target_size}, {len(pngs)} frames)')

    # Size variants for testing
    for sz in [16, 32, 48, 64]:
        resized = [f.resize((sz, sz), Image.LANCZOS) for f in pngs]
        resized[0].save(
            f'favicon_{sz}.gif', save_all=True, append_images=resized[1:],
            duration=durations, loop=0, transparency=0, disposal=2,
        )

    # Static ICO fallback from first frame (hex view)
    pngs[0].save('favicon.ico', format='ICO', sizes=[(64,64),(32,32),(16,16)])
    print(f'✅ favicon.ico (multi-res static fallback)')

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'svg_frames')
```

### HTML Integration

```html
<link rel="icon" type="image/gif" href="favicon.gif">
<link rel="icon" type="image/x-icon" href="favicon.ico">
```

---

## Implementation Order

| Step | File(s) | What | Test | Status |
|------|---------|------|------|--------|
| ~~**1a**~~ | `rt-animate.js`, `rt-init.js` | ~~Create module, init, `animateToView()`~~ | ~~Console: `RTAnimate.animateToView('QW1')`~~ | **DONE** |
| ~~**1b**~~ | `rt-viewmanager.js` | ~~▶ delegates to RTAnimate~~ | ~~▶ button smoothly transitions~~ | **DONE** |
| ~~**1c**~~ | `rt-animate.js` | ~~Cancel logic (click ▶ mid-animation)~~ | ~~Redirects smoothly to new target~~ | **DONE** |
| ~~**2a**~~ | `rt-viewmanager.js` | ~~Add `transitionDuration` to view data model~~ | ~~Verify in export/import~~ | **DONE** |
| ~~**2b**~~ | `rt-animate.js`, `art.css` | ~~T button + HiFi popup slider~~ | ~~Set timing, verify persistence~~ | **DONE** |
| ~~**3a**~~ | `rt-animate.js`, `index.html` | ~~Preview button — loops through views~~ | ~~Watch cube tumble in scene~~ | **DONE** |
| ~~**3b**~~ | `rt-animate.js` | ~~Export Batch — downloads individual SVGs~~ | ~~Check SVG files~~ | **DONE** |
| ~~**3c**~~ | `rt-animate.js` | ~~Export Animation — generates animated SVG+SMIL~~ | ~~Open .svg in browser, verify it plays~~ | **DONE** |
| **4** | `build_favicon.py` | Python GIF assembly | Verify favicon.gif in browser tab | Pending |
| **5a** | `rt-viewmanager.js` | Drag-to-reorder rows (grip handle) | Drag view between others, verify order persists | Pending |
| **5b** | `rt-viewmanager.js`, `rt-animate.js` | Object visibility per view (instanceRefs) | Add/remove polyhedra between views, verify dissolve | Pending |
| **5c** | `rt-papercut.js` | Papercut respects opacity=0 as invisible | Zero-opacity objects excluded from section cuts | Pending |
| ~~**6a**~~ | `index.html` | ~~Dual-row UI: "Camera" / "Camera + Scene" labels + buttons~~ | ~~Both rows visible, distinct labels~~ | **DONE** `a106bf7` |
| ~~**6b**~~ | `rt-viewmanager.js` | ~~`loadView()` with `skipCamera` option~~ | ~~Restores non-camera state only~~ | **DONE** `a106bf7` |
| ~~**6c**~~ | `rt-animate.js` | ~~`animateToViewFull()` + smooth cutplane interpolation~~ | ~~Bottom-row ▶ slerps camera + interpolates cutplane~~ | **DONE** `a106bf7` |

## Favicon-Specific Parameters

For the QW↔X tumble favicon using this system:

1. Save two views: **QW-axis** (hex silhouette) and **X-axis** (square silhouette)
2. Set transition to ~2s each
3. Use **Export Animation** with ~10 interpolated frames between views
4. Total: ~26 frames (3 hold + 10 transition + 3 hold + 10 transition)
5. Run `build_favicon.py` to rasterize at 64×64

The return path naturally forms a different great-circle arc than the forward path because the camera slerps between different positions on the sphere — creating the tumble effect without needing an explicit waypoint.

## Phase 5: View Reordering & Object Persistence

Two features that become essential once views are used as animation keyframes.

---

### 5a: Drag-to-Reorder Views

**Problem**: Views are currently sorted by name/axis/date. For animation keyframes, the user needs explicit control over sequence order.

**Solution**: Add a drag handle (⠿ grip dots) to the left of each view name. Drag-and-drop reorders the `state.views` array directly.

```
┌──────────────────────────────────────────────────────────┐
│ ⠿  AXO1    Cart-Z   Feb 10   [▶] [2s] [↓] [✕]          │
│ ⠿  X1      Cart-Z   Feb 10   [▶] [2s] [↓] [✕]          │
│ ⠿  QZ1     Tet-QZ   Feb 10   [▶] [5s] [↓] [✕]          │
└──────────────────────────────────────────────────────────┘
```

**Implementation approach**:
- Add `<span class="view-drag-handle">⠿</span>` before view name in row template
- Use native HTML5 drag-and-drop (`draggable`, `dragstart`, `dragover`, `drop`)
- On drop, splice the view from old index to new index in `state.views`
- Add a `sortColumn: "manual"` mode that preserves array order
- When any view is dragged, auto-switch to manual sort mode
- Re-render table after reorder

**No external dependencies** — HTML5 DnD is sufficient for a short list.

---

### 5b: Object Visibility Per View (Scene State)

**Problem**: Currently all objects in the scene are visible in all views. When building an animation sequence (e.g. "first show cube, then add tetrahedron"), there's no way to control which objects appear per keyframe.

**Current infrastructure**: `captureView()` already stores `instanceRefs` — an array of instance IDs present at capture time. This data exists but isn't used during `loadView()`.

**Solution**: Use `instanceRefs` to control visibility via opacity transitions.

#### How It Works

1. **Capture**: `captureView()` already records `instanceRefs` (all instances at save time)
2. **Load**: When transitioning to a view, compare current scene instances with the target view's `instanceRefs`:
   - **Entering objects** (in target but not current): Fade in from opacity 0 → 1
   - **Exiting objects** (in current but not target): Fade out from opacity 1 → 0
   - **Persistent objects**: No change
3. **Dissolve timing**: Object fade runs in parallel with camera animation, using the same `transitionDuration`

#### Opacity Transition (in `rt-animate.js`)

```js
_dissolveObjects(targetInstanceRefs, durationMs) {
  const sm = this._viewManager._stateManager;
  const allInstances = sm.state.instances;

  for (const inst of allInstances) {
    const shouldBeVisible = targetInstanceRefs.includes(inst.id);
    const mesh = inst.mesh; // THREE.js mesh reference

    if (shouldBeVisible && mesh.material.opacity < 1) {
      // Fade in — animate opacity 0 → 1
      this._animateOpacity(mesh, 1, durationMs);
    } else if (!shouldBeVisible && mesh.material.opacity > 0) {
      // Fade out — animate opacity 1 → 0
      this._animateOpacity(mesh, 0, durationMs);
    }
  }
}
```

#### KWW: Leverage Existing Material System

THREE.js materials already support `transparent: true` and `opacity`. The dissolve just animates what's already there — no new render pipeline needed. Objects at opacity=0 are still in the scene graph but invisible.

---

### 5c: Papercut Respects Opacity=0

**Problem**: Papercut section cuts slice all geometry in the scene, including objects at opacity=0 that are "invisible" in the current view. This produces visible cut lines for objects the user can't see.

**Rule**: Treat `material.opacity === 0` as "not present" for section calculations.

**Implementation**: In `rt-papercut.js`, where geometry is gathered for section cuts, add an early filter:

```js
// Skip invisible (dissolved-out) objects
if (mesh.material.opacity === 0) continue;
```

This is a single-line guard in the section loop. Objects faded out via the dissolve system are automatically excluded from cuts. When they fade back in, they're automatically included again.

---

## Phase 6: Dual-Row Animation UI — Camera vs Full Scene

The modal distinction between camera-only and full-scene animation is made **explicit in the UI** via two button rows:

```
Camera
[▶] [Batch] [Animation]

Camera + Scene
[▶] [Batch] [Animation]
```

### How It Works

**Top row — Camera only** (current Phase 1-3 behavior):
- ▶ and Preview animate camera position, zoom, orientation only
- Scene objects, cutplanes, projections remain untouched
- Use case: creative exploration, planning camera paths while sculpting the scene

**Bottom row — Camera + Scene** (full state):
- ▶ animates camera smoothly, then snaps non-camera state at arrival
- Preview loops with full state restore at each keyframe
- Batch/Animation export restores complete saved state per frame
- Includes: object visibility (dissolve via instanceRefs), cutplane state, projection state

### Why Two Rows Instead of a Toggle

- **No hidden mode** — the user sees both options at all times
- **No "which mode am I in?"** confusion — click the row matching your intent
- **Code maps directly**: top row calls `animateToView()`, bottom row calls `animateToViewFull()` which adds `loadView()` state restore
- **Resolves cutplane bug naturally** — top row is *correctly* camera-only by design; cutplane users use the bottom row

### Implementation

| Component | What |
|-----------|------|
| `index.html` | Duplicate button row with "Camera" / "Camera + Scene" labels |
| `rt-animate.js` | `animateToViewFull()` — wraps `animateToView()` + calls `loadView()` non-camera state at completion |
| `rt-animate.js` | `previewAnimationFull()` — preview loop using `animateToViewFull()` |
| `rt-animate.js` | Wire up second row of buttons to full-scene variants |

### `animateToViewFull()` Sketch

```js
async animateToViewFull(viewId, durationMs, opts) {
  // Smooth camera transition (same as camera-only)
  await this.animateToView(viewId, durationMs, opts);

  // At arrival, snap non-camera state from the saved view
  const vm = this._viewManager;
  vm.loadViewState(viewId, { cameraOnly: false, skipCamera: true });
  // ↑ restores cutplanes, object visibility, projections
  //   but skips camera (already positioned by animation)
}
```

This requires a `loadViewState()` variant in ViewManager that can selectively restore subsets of view state. The existing `loadView()` does everything at once — the refactor splits it into camera vs non-camera concerns.

---

## Known Bugs

### ~~BUG: Cutplane state not restoring on ▶ transitions~~ — RESOLVED `a106bf7`

~~**Symptom**: Section cut state (cutplane on/off, position) used to toggle correctly when switching between views via ▶.~~

**Resolution**: Phase 6 dual-row UI. Top-row ▶ is camera-only by design. Bottom-row ▶ calls `animateToViewFull()` which smoothly interpolates the cutplane value per frame and snaps remaining scene state at arrival. Exceeded original fix — cutplane now *animates* between views rather than snapping.

---

## Notes

- **Z-up convention**: Camera always uses `camera.up.set(0,0,1)` per rt-rendering.js:228
- **Safari**: Doesn't animate GIF favicons — frame 0 (hex view) is shown static, which is the most distinctive silhouette
- **GIF transparency**: 1-bit (on/off) — fine for crisp wireframe on transparent background
- **`disposal=2`**: Critical for transparent animated GIFs (clears each frame before drawing next)
- **SVG+SMIL browser support**: Chrome, Firefox, Safari, Edge — all modern browsers (not IE)
- **Smoothstep easing** `t²(3-2t)`: Natural deceleration at keyframes, zero-velocity endpoints
