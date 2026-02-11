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
| ~~**5a**~~ | `rt-viewmanager.js` | ~~Drag-to-reorder rows (grip handle) + expandable view list~~ | ~~Drag view between others, verify order persists~~ | **DONE** `d564a39` |
| ~~**5b-partial**~~ | `rt-animate.js`, `rt-viewmanager.js` | ~~Instance dissolve system (`_setupDissolve`, `group.visible` snap)~~ | ~~Deposited instances fade in/out between views~~ | **DONE** `912c6ff` |
| ~~**5c**~~ | `rt-papercut.js`, `rt-viewmanager.js` | ~~Papercut + SVG export respects opacity=0~~ | ~~Zero-opacity objects excluded from cuts + SVG~~ | **DONE** `912c6ff` |
| ~~**5b**~~ | `rt-delta.js`, `rt-viewmanager.js`, `rt-animate.js` | ~~Full scene state per view (delta-based) — `rt-delta.js` captures, diffs, applies, and interpolates scene deltas. Integer sliders use linear timing (rawT) for even step spacing; float sliders use smoothstepped t for eased motion.~~ | ~~Geodesic freq F1→F7 steps evenly, scale interpolates smoothly, forms toggle between views~~ | **DONE** `724d229` |
| ~~**6a**~~ | `index.html` | ~~Dual-row UI: "Camera" / "Camera + Scene" labels + buttons~~ | ~~Both rows visible, distinct labels~~ | **DONE** `a106bf7` |
| ~~**6b**~~ | `rt-viewmanager.js` | ~~`loadView()` with `skipCamera` option~~ | ~~Restores non-camera state only~~ | **DONE** `a106bf7` |
| ~~**6c**~~ | `rt-animate.js` | ~~`animateToViewFull()` + smooth cutplane interpolation~~ | ~~Bottom-row ▶ slerps camera + interpolates cutplane~~ | **DONE** `a106bf7` |
| ~~**6d**~~ | `index.html` | ~~HTML reorg: Move View Capture → "View Manager" section, rename Camera → View Manager~~ | ~~UI layout correct, all controls functional~~ | **DONE** |

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

### 5b: Full Scene State Per View (Delta-Based)

**Problem**: Views currently only save camera position, cutplane, and `instanceRefs` (deposited copies). But the actual user workflow is toggling *forms* on/off (Tetrahedron, Cube, Geodesic Icosahedron F3, etc.), adjusting sliders (geodesic frequency, matrix size, scale), and changing projections. None of this is captured per view.

**Goal**: Each view is a full **scene snapshot** — a keyframe that records everything the user sees. Transitioning between views restores the complete scene state, enabling sequences like:

- Geodesic icosahedron subdividing from F1 → F2 → F3 → F6 as camera orbits
- Tetrahelix growing (count slider increasing) as camera follows the helix axis
- Form transitions: cube → cuboctahedron → icosahedron in successive views
- Projection toggling on/off between views

**Approach: Delta compression** — Only record what *changed* from the previous view. Unchanged properties persist naturally from the last keyframe. This keeps view data small and the system simple.

#### New Module: `rt-delta.js`

All delta logic lives in a standalone module — keeping `rt-viewmanager.js` and `rt-animate.js` clean. Three responsibilities:

1. **`RTDelta.captureSnapshot()`** — Read current scene state from DOM (checkboxes, sliders, projections)
2. **`RTDelta.computeDelta(prev, current)`** — Shallow diff two snapshots, return only changed fields
3. **`RTDelta.applyDelta(delta)`** — Restore a delta through existing UI handlers (checkbox `.click()`, slider `dispatchEvent('input')`)
4. **`RTDelta.buildSteppedTick(fromState, toDelta, durationMs)`** — Return an `onTick(t)` function that steps discrete slider values evenly across the transition, firing UI handlers at each step

#### Existing Infrastructure

`RTFileHandler.exportState()` already captures the complete scene as JSON:

| Category | What It Captures | Example Fields |
|----------|-----------------|----------------|
| **Form visibility** | Which polyhedra are on/off | `polyhedraCheckboxes.showCube`, `showGeodesicIcosahedron`, `showTetrahelix1` |
| **Slider values** | All parametric controls | `sliderValues.geodesicIcosaFrequency`, `tetrahelix1Count`, `scaleSlider` |
| **Geodesic projections** | Subdivision mode per geodesic | `geodesicProjections.geodesicIcosaProjection` ("out"\|"flat"\|"in") |
| **Instances** | Deposited copies + transforms | `instances[]` with id, type, parameters, transform |
| **Projection** | RT projection system | `projection.enabled`, `.basis`, `.axis`, `.distance` |
| **Grids** | Grid visibility + tessellation | `grids.quadray.visible`, `grids.cartesian.tessellation` |
| **Colors** | Palette + background | `colorPalette`, `canvasBackground` |

The view system should leverage this existing serialization rather than reinventing it.

#### Data Model: `view.sceneState` (Delta)

```js
// In captureView(), compute delta against previous view (or baseline):
view.sceneState = {
  // Only includes fields that CHANGED from the previous view in the sequence.
  // On first view (or standalone), stores the full relevant state.

  // Examples of what might appear in a delta:
  polyhedraCheckboxes: {
    showGeodesicIcosahedron: true,   // turned on since last view
    showTetrahelix1: false,          // turned off since last view
  },
  sliderValues: {
    geodesicIcosaFrequency: 3,       // changed from 2 → 3
    scaleSlider: 1.5,                // changed from 1.0 → 1.5
  },
  geodesicProjections: {
    geodesicIcosaProjection: "out",  // changed from "flat" → "out"
  },
  // instanceRefs still here for deposited instance visibility
  instanceRefs: ["instance_123", "instance_456"],
};
```

Unchanged fields are simply omitted — they carry forward from the previous view.

#### Capture Logic

```js
// In captureView():
const currentSnapshot = RTDelta.captureSnapshot();

// Diff against previous view's accumulated state
const prevSnapshot = this._getAccumulatedSnapshot(previousViewIndex);
view.sceneState = RTDelta.computeDelta(prevSnapshot, currentSnapshot);
```

The delta computation is a shallow diff of the relevant `polyhedraCheckboxes`, `sliderValues`, `geodesicProjections`, and `instanceRefs` fields. Deep nesting isn't needed — these are flat key-value maps.

#### Restore Logic

```js
// In loadView():
if (view.sceneState) {
  RTDelta.applyDelta(view.sceneState);
}
```

`applyDelta()` iterates the delta and drives existing UI handlers:
1. **Checkboxes**: Set `.checked` + trigger `.click()` handler for form visibility
2. **Sliders**: Set `.value` + dispatch `'input'` event for parametric controls
3. **Projections**: Set select `.value` + dispatch `'change'` event
4. **Instances**: Show/hide deposited instances via `group.visible`

Each restore goes through the **existing UI handlers**, so the scene regenerates exactly as if the user had clicked/dragged those controls manually. No parallel code paths.

#### Transition Behavior — Stepped Interpolation

| Delta Field | Camera-Only (top row) | Camera + Scene (bottom row) |
|------------|----------------------|----------------------------|
| Camera position | Slerp (existing) | Slerp (existing) |
| Cutplane value | — | Smooth interpolate (existing) |
| Form on/off (boolean) | — | Dissolve fade in/out |
| Slider values (integer) | — | **Stepped** — evenly spaced across transition duration |
| Slider values (continuous) | — | **Smooth** — interpolated per-frame via UI handler |
| Geodesic projection (enum) | — | Snap at midpoint |
| Instance visibility | — | Dissolve fade (existing `_setupDissolve`) |

**Stepped interpolation for discrete sliders**: Geometry rebuilds are fast (no visible delay), so integer sliders like geodesic frequency or tetrahelix count are stepped through every intermediate value during the transition. Example: F1→F6 in a 2-second transition = 5 steps, each held for ~400ms, each triggering the slider's `'input'` handler to rebuild the mesh. The result is a live subdivision animation.

**Smooth interpolation for continuous sliders**: Values like `scaleSlider` or `opacitySlider` are interpolated per-frame, driving the UI handler at each tick.

**Snap for enums**: Projection mode (`"out"|"flat"|"in"`) switches at t=0.5 (midpoint).

#### `buildSteppedTick()` Design

```js
// Returns an onTick(t) function for animateToViewFull()
RTDelta.buildSteppedTick(fromSnapshot, toDelta, durationMs)

// Inside the tick function:
// - Integer sliders: compute which step we're on based on t, fire handler if step changed
// - Continuous sliders: lerp value, fire handler every frame
// - Booleans: handled by dissolve system (separate)
// - Enums: snap at t >= 0.5
```

The tick function tracks `lastStep` per slider to avoid redundant handler calls — only fires when the integer value actually changes. This keeps rebuilds to the minimum needed.

#### What This Enables

1. **Geodesic subdivision animation**: F1→F6 in 2s — watch the icosahedron refine live as camera orbits
2. **Tetrahelix growth animation**: Count 1→10 — the helix extends step by step as camera follows its axis
3. **Form transitions**: Cube dissolves out, cuboctahedron dissolves in between keyframes
4. **Scale animation**: Smooth scale changes interpolated per-frame
5. **Mixed sequences**: Any combination of the above with camera slerp and cutplane interpolation

---

### 5c: Papercut Respects Invisible Objects — **DONE** `912c6ff`

**Problem**: Papercut section cuts slice all geometry in the scene, including objects at opacity=0 that are "invisible" in the current view. This produces visible cut lines for objects the user can't see.

**Rule**: Treat `material.opacity === 0` as "not present" for section calculations.

**Implementation**: Added opacity guard in `_generateIntersectionEdges()` and SVG extraction methods:

```js
// Skip dissolved-out objects (opacity=0 during view transitions)
if (object.material) {
  const mat = Array.isArray(object.material) ? object.material[0] : object.material;
  if (mat.opacity === 0) return;
}
```

Also added in `extractEdgeLines()` and `extractMeshFaces()` for SVG export consistency.

### 5d: Instance Dissolve System — **DONE** `912c6ff` (Partial — instances only)

The opacity dissolve infrastructure is in place for deposited instances via `_setupDissolve()` in rt-animate.js. This will be extended in 5b to handle form visibility changes (checkbox toggles) using the same fade mechanism. The dissolve system includes:

- Per-tick opacity interpolation via `onTick` callback
- Mid-animation cancel safety via `_dissolveOriginal*` material markers
- Visibility snap in `loadView()` via `group.visible`

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

## Future Refinements

### Bidirectional Cutplane Transitions

Currently `animateToViewFull()` interpolates the cutplane value between two views that share the same axis. When transitioning from a view with **no cutplane** to one **with a cutplane** (or vice versa), the transition should be bidirectional:

- **Entering a cut** (no cut → cut at interval *d*): Enable the cutplane at the far edge (or distance 0), then smoothly slide it to position *d* over the transition duration. The cut "sweeps in" from the boundary.
- **Exiting a cut** (cut at interval *d* → no cut): Smoothly slide the cutplane back to the far edge / distance 0, then disable. The cut "recedes" before disappearing.

This makes cutplane transitions feel physically motivated — the plane always arrives from or departs to a natural boundary rather than popping on/off. Implementation would extend the `onTick` callback in `animateToViewFull()` to detect the no-cut ↔ cut transition case and remap the interpolation range accordingly (e.g. `lerp(edgeDistance, targetValue, t)` instead of `lerp(0, targetValue, t)`).

### ~~Expandable View List (No Scrollbar)~~ — DONE (Phase 5a)

~~The Saved Views table currently has `max-height: 150px; overflow-y: auto`, which produces a scrollbar when the list grows.~~ Resolved: `max-height` removed, view list expands naturally within collapsible section.

### TODO: Smoother Mesh Rebuild Transitions

Currently, integer slider changes (geodesic frequency, tetrahelix count) produce visible hard jumps during animated transitions — each step is a complete mesh topology change (different vertex/face count). The steps are evenly timed (linear rawT), which is an improvement over smoothstep bunching, but each F→F+1 is still a discontinuous visual jump.

Dragging the geodesic frequency slider manually feels blazing fast and fluid because the user's hand motion provides natural easing. During camera animation, the same steps feel jerkier because the mesh pops while the camera glides.

**Possible approaches** (worth testing, potentially processor-intensive):
- **Sub-step mesh interpolation**: Generate both F(n) and F(n+1) meshes, cross-fade opacity between them over a brief window (~100ms) around each step change. Would require two meshes briefly coexisting.
- **Static camera render sequence**: Test stepped transitions with a locked camera first — if it looks smooth without camera motion, the perceived jerkiness is a camera/mesh timing issue, not a rebuild speed issue.
- **Longer transition durations**: More seconds = more time per step = each frequency gets perceived as a "hold" rather than a flash. User can already control this via the T slider.

**Recommendation**: Start by testing with a static camera to isolate whether the issue is rebuild speed or perceptual conflict with camera motion. If static looks good, the fix may be as simple as slightly delaying stepped changes relative to camera motion (e.g., steps begin at rawT=0.1 and end at rawT=0.9, giving the camera a head start and a settling period).

### TODO: Scene State Preview in Saved Views Table

Currently, clicking ▶ in the "Camera" row only animates camera position — the scene environment (which forms are visible, slider values, geodesic frequency) doesn't change. The user must use "Camera + Scene" ▶ to see full transitions.

**Enhancement**: When the user clicks on a view row in the Saved Views table (not ▶, just selecting the row), show a preview of that view's scene state — or at minimum, display the key delta values (which forms are on/off, geodesic freq, scale) as a tooltip or inline summary. This would let users understand what each view contains without having to load it.

**Alternatively**: Make the "Camera + Scene" ▶ the default/primary animation mode, since users building animation sequences typically want full state transitions, not camera-only.

---

## Known Bugs

### ~~BUG: Cutplane state not restoring on ▶ transitions~~ — RESOLVED `a106bf7`

~~**Symptom**: Section cut state (cutplane on/off, position) used to toggle correctly when switching between views via ▶.~~

**Resolution**: Phase 6 dual-row UI. Top-row ▶ is camera-only by design. Bottom-row ▶ calls `animateToViewFull()` which smoothly interpolates the cutplane value per frame and snaps remaining scene state at arrival. Exceeded original fix — cutplane now *animates* between views rather than snapping.

### ~~BUG: Camera slerp torque on Z-down transitions (View 12)~~ — RESOLVED `bfc1a1c`

~~**Symptom**: When transitioning to `zdown` camera preset (e.g., PP-12 "All 5 geodesics, top-down"), the camera arrives at the correct position but at the last second torques ~180°.~~

**Root cause**: `animateToView()` hardcoded `camera.up.set(0, 0, 1)` every frame, but `setCameraPreset("zdown")` sets `camera.up.set(0, 1, 0)` (Y-up for top view). When the camera position approached (0,0,+d), the look direction (0,0,-1) became antiparallel to the forced Z-up vector — `lookAt()` singularity caused the flip.

**Fix**: (1) Proper angle-based slerp `sin((1-t)ω)/sin(ω)` for direction interpolation (replaces lerp+normalize which breaks near antipodal). (2) Interpolated up vector — captures `startUp` from current camera, computes `endUp` using setCameraPreset's Z-pole logic (Y-up when camera is within ~18° of Z axis), and smoothly lerps between them.

---

### BUG: Planar/Radial matrix groups missing dissolve transitions (Views 13–19)

**Symptom**: During Player Piano playback (Camera + Scene ▶), planar matrices (cube matrix, tet matrix, etc.) and radial matrices pop in/out with no opacity dissolve. They appear after a blank screen flash. In contrast, tetrahelix forms (Views 21–23) dissolve correctly.

**Additional observation**: When the matrices do pop into view, they appear at **100% opacity** — fully opaque — whereas the app's default opacity settings (opacity slider ~0.35) should make them semi-transparent. All other form categories (primitives, polyhedra, geodesics, tetrahelixes) correctly respect the opacity slider during both static display and animated transitions. This suggests the matrix rendering path may bypass the opacity/dissolveOpacity pipeline entirely, which would be a deeper issue than just the dissolve system.

**Analysis**: The `_CHECKBOX_TO_GROUP` mapping in `rt-animate.js` includes all matrix groups (`cubeMatrixGroup`, `radialCubeMatrixGroup`, etc.), so the form dissolve system *should* handle them. Possible causes:

1. **Matrix groups use a different rendering path**: Matrix/radial forms are built by `rt-nodes.js` which creates nested `RTMatrix` groups containing instanced child polyhedra. The `dissolveOpacity` on `group.userData` may not propagate to the deeply-nested child meshes the way it does for simple polyhedra groups.
2. **`getAllFormGroups()` returns the wrong group level**: If the group returned for `cubeMatrixGroup` is a parent container but the actual meshes are in child groups, `renderPolyhedron()` won't see the `dissolveOpacity` marker.
3. **Rebuild timing**: Matrix geometry rebuilds are expensive and may not complete within the 200ms settle time, so the dissolve starts before meshes exist.
4. **Opacity pipeline bypass**: If matrices render at 100% opacity regardless of the opacity slider, they may not go through `renderPolyhedron()` at all — `rt-nodes.js` may create materials directly without reading the global opacity or `dissolveOpacity` values.

**To investigate**: First test static export/import of planar and radial matrix views to see if the state persists correctly (separate from animation). Then add `console.log(groupKey, group.children.length)` in `_setupFormDissolve()` for matrix groups to verify the group has children at dissolve setup time. Check whether matrix meshes go through `renderPolyhedron()` or have their own material creation path.

---

### ~~BUG: Matrix sub-control state not persisting across save/load~~ — RESOLVED `9326f11`

~~**Symptom**: User report — matrix configurations (size slider, 45° toggle, radial frequency) revert to defaults or display incorrectly when reopening a saved file. Specifically: slider thumb at position 5 but display text shows "1×1"; 45° rotation toggle not restored; sub-control panels (size slider, rotation checkbox) hidden until parent checkbox toggled off/on.~~

**Root cause**: Three interrelated gaps in the state pipeline:

1. **45° toggles not captured**: The 5 `*MatrixRotate45` checkboxes were absent from both `RTDelta._captureCheckboxes()` (view deltas) and `RTFileHandler.exportState()` (file export). The rendering code reads them from DOM but no persistence system saved them.
2. **Slider display text not updated**: `importState()` set `el.value` on matrix size sliders without dispatching 'input' events or updating the display element. The display ID `cubeMatrixSizeValue` doesn't match `_setSlider()`'s two lookup patterns (`*Display` and `*SliderValue`), so even the delta path's own display update missed it — though the dispatched 'input' event triggers the UI binding handler which uses the correct `formatValue: v => \`${v}×${v}\``.
3. **Sub-control panels not revealed**: `importState()` had explicit show/hide blocks for line, polygon, prism, cone, tetrahelix, penrose, and quadray controls — but zero entries for any of the 10 matrix control panels (5 planar + 5 radial).

**Fix**: (1) Added 5 rotate45 checkboxes to `RTDelta._captureCheckboxes()` and `RTFileHandler.exportState()`/`importState()`. (2) Added explicit `N×N` display text updates for matrix size sliders and `Fn` display for radial freq sliders in `importState()`. (3) Added 10 matrix sub-control panel show/hide entries to `importState()`. (4) Added `_subControlMap` to `RTDelta` + visibility toggle in `applyDelta()` for view transitions.

---

### POSSIBLE BUG: Browser freeze after tab switch during preview

**Symptom**: App froze/crashed when switching away from the browser tab and back during preview playback. May be caused by `requestAnimationFrame` queuing up while the tab is backgrounded, then firing in a burst when the tab regains focus — especially if `updateGeometry()` is called many times in rapid succession. If this reproduces, investigate throttling the animation tick when returning from a background state.

---

## TO BE INVESTIGATED

### Per-Polyhedron Scale in Delta System

The delta system currently captures `scaleSlider` (global) and `tetScaleSlider` (tetrahedron) — but polyhedra can also have **individual scale** set through the state manager. The sizes of things are recorded in export files, so this data exists in `RTFileHandler.exportState()` somewhere beyond the two sliders already in `RTDelta._sliderMap`.

**Questions**:
- Are there additional per-polyhedron size controls beyond `scaleSlider` and `tetScaleSlider`?
- Does the state manager track per-form circumradius or scale independently?
- Do we need to expand `_sliderMap` or add a new capture category for per-polyhedron sizes?

**Impact**: If a user scales the geodesic icosahedron to 2× in view 1, then changes it to 3× in view 2, the delta system should capture and interpolate that change. Currently only global scale and tet scale are tracked.

---

## Notes

- **Z-up convention**: Camera always uses `camera.up.set(0,0,1)` per rt-rendering.js:228
- **Safari**: Doesn't animate GIF favicons — frame 0 (hex view) is shown static, which is the most distinctive silhouette
- **GIF transparency**: 1-bit (on/off) — fine for crisp wireframe on transparent background
- **`disposal=2`**: Critical for transparent animated GIFs (clears each frame before drawing next)
- **SVG+SMIL browser support**: Chrome, Firefox, Safari, Edge — all modern browsers (not IE)
- **Smoothstep easing** `t²(3-2t)`: Natural deceleration at keyframes, zero-velocity endpoints

### Player Piano Demo Reel

`PlayerPiano-generator.js` is a browser console script that generates a 23-view `.artviews` demo reel touring all major form categories (primitives, platonic solids, geodesic spheres, planar matrices, radial matrices, tetrahelixes). Run in console → downloads `.artview` → import and play via Camera + Scene ▶ Preview.

**Future enhancement**: A second Player Piano pass with cutplanes sweeping through geometry during transitions — each view enables a section cut that animates across the form, revealing interior structure.
