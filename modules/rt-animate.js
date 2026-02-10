/**
 * rt-animate.js — Camera animation system for View Capture
 *
 * Provides smooth animated transitions between saved views,
 * preview loop, and export capabilities (batch SVG, animated SVG+SMIL).
 *
 * Follows the same module pattern as rt-papercut.js / rt-prime-cuts.js.
 * Loosely coupled: ViewManager delegates ▶ clicks here via window.RTAnimate.
 */

import { MetaLog } from "./rt-metalog.js";

export const RTAnimate = {
  // ── Dependencies (set during init) ──────────────────────────────
  _viewManager: null,
  _camera: null,
  _controls: null,
  _renderer: null,
  _scene: null,

  // ── Animation state ─────────────────────────────────────────────
  state: {
    active: false, // true during any camera animation
    frameId: null, // current requestAnimationFrame ID
    previewing: false, // true during preview loop
    activeViewId: null, // last-reached view (for resume)
    _cancelResolve: null, // resolve fn to unblock current animation promise
  },

  // ── Initialization ──────────────────────────────────────────────

  init({ viewManager, camera, controls, renderer, scene }) {
    this._viewManager = viewManager;
    this._camera = camera;
    this._controls = controls;
    this._renderer = renderer;
    this._scene = scene;

    this._wireUpButtons();
    MetaLog.log(MetaLog.SUMMARY, "✅ RTAnimate initialized");
  },

  // ── Core: animate camera to a saved view ────────────────────────

  /**
   * Smoothly animate the camera from its current position to a saved view.
   * Uses smoothstep easing and spherical interpolation (slerp via lerp+normalize).
   *
   * @param {string} viewId - View ID or name
   * @param {number} [durationMs] - Override duration (ms). Falls back to
   *   view.transitionDuration, then 2000ms default.
   * @returns {Promise<void>} Resolves when animation completes or is cancelled.
   */
  animateToView(viewId, durationMs, { cancelPreview = true } = {}) {
    const vm = this._viewManager;
    const view = vm.state.views.find(
      v => v.id === viewId || v.name === viewId
    );
    if (!view?.camera) return Promise.resolve();

    durationMs = durationMs || view.transitionDuration || 2000;

    // 1. Cancel any running animation
    if (this.state.frameId) {
      cancelAnimationFrame(this.state.frameId);
      this.state.frameId = null;
    }

    // 2. If previewing and ▶ is clicked externally, exit preview mode
    //    (skip when called internally from previewAnimation loop)
    if (cancelPreview && this.state.previewing) {
      this.state.previewing = false;
      this._updatePreviewButton(false);
    }

    // 3. Resolve any pending animation promise (so await unblocks)
    if (this.state._cancelResolve) {
      this.state._cancelResolve();
      this.state._cancelResolve = null;
    }

    const camera = this._camera;
    const controls = this._controls;

    // Capture start state
    const startPos = camera.position.clone();
    const startDist = startPos.length();
    const startZoom = camera.zoom;

    // Target state from saved view
    const endPos = new THREE.Vector3(
      view.camera.position.x,
      view.camera.position.y,
      view.camera.position.z
    );
    const endDist = endPos.length();
    const endZoom = view.camera.zoom || 1;

    const startTime = performance.now();
    this.state.active = true;

    return new Promise(resolve => {
      this.state._cancelResolve = resolve;

      const tick = now => {
        const elapsed = now - startTime;
        const rawT = Math.min(elapsed / durationMs, 1);
        const t = rawT * rawT * (3 - 2 * rawT); // smoothstep

        // Slerp on sphere: lerp directions + interpolate distance
        const pos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
        const dist = startDist + (endDist - startDist) * t;
        pos.normalize().multiplyScalar(dist);

        camera.position.copy(pos);
        camera.up.set(0, 0, 1); // Z-up convention
        camera.lookAt(0, 0, 0);
        camera.zoom = startZoom + (endZoom - startZoom) * t;
        camera.updateProjectionMatrix();

        if (controls) {
          controls.target.set(0, 0, 0);
          controls.update();
        }

        // Render the frame
        this._renderer.render(this._scene, camera);

        if (rawT < 1) {
          this.state.frameId = requestAnimationFrame(tick);
        } else {
          // Animation complete
          this.state.active = false;
          this.state.frameId = null;
          this.state._cancelResolve = null;
          this.state.activeViewId = view.id;
          vm.state.activeViewId = view.id;
          vm.setActiveViewRow(view.id);
          resolve();
        }
      };

      this.state.frameId = requestAnimationFrame(tick);
    });
  },

  // ── Preview loop ────────────────────────────────────────────────

  /**
   * Toggle preview: loops through all saved views with animated transitions.
   * If already previewing, stops. Resumes from last-reached view.
   */
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
      this.state.active = false;
      this._updatePreviewButton(false);
      return;
    }

    const views = this._viewManager._getSortedViews();
    if (views.length < 2) return;

    this.state.previewing = true;
    this._updatePreviewButton(true);

    // Resume from activeViewId if set
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
        await this.animateToView(view.id, duration, { cancelPreview: false });
        if (!this.state.previewing) break;
        // Hold at keyframe
        await new Promise(r =>
          setTimeout(r, Math.max(duration / 3, 500))
        );
      }
      startIdx = 0; // After first pass, loop from beginning
    }

    this._updatePreviewButton(false);
  },

  // ── UI helpers ──────────────────────────────────────────────────

  /**
   * Update Preview/Stop button text and active state.
   * @param {boolean} playing - true → "Stop", false → "Preview"
   */
  _updatePreviewButton(playing) {
    const btn = document.getElementById("previewAnimationBtn");
    if (!btn) return;
    if (playing) {
      btn.innerHTML = '<span style="color: #ff6b6b; font-size: 14px">&#9632;</span>'; // red ■
      btn.title = "Stop animation preview";
    } else {
      btn.innerHTML = '<span style="color: #4caf50; font-size: 14px">&#9654;</span>'; // green ▶
      btn.title = "Preview animation loop in scene";
    }
  },

  /**
   * Wire up Preview/Batch/Animation button click handlers.
   * @private
   */
  _wireUpButtons() {
    const previewBtn = document.getElementById("previewAnimationBtn");
    const batchBtn = document.getElementById("exportBatchBtn");
    const animBtn = document.getElementById("exportAnimationBtn");

    if (previewBtn) {
      previewBtn.addEventListener("click", () => this.previewAnimation());
    }
    if (batchBtn) {
      batchBtn.addEventListener("click", () => this.exportBatch());
    }
    if (animBtn) {
      animBtn.addEventListener("click", () => this.exportAnimation());
    }
  },

  // ── Batch export ──────────────────────────────────────────────

  /**
   * Export each saved view as an individual SVG file.
   * Positions camera at each view, generates SVG, triggers download.
   */
  async exportBatch() {
    const vm = this._viewManager;
    const views = vm._getSortedViews();
    if (views.length === 0) return;

    for (const view of views) {
      // Position camera at this view (instant snap for export)
      vm.loadView(view.id);
      // Allow one frame for render to settle
      await new Promise(r => requestAnimationFrame(r));
      // Export SVG
      vm.exportSVG({ view });
    }

    MetaLog.log(MetaLog.SUMMARY, `📦 Batch exported ${views.length} SVGs`);
  },

  // ── Animation export (SVG+SMIL) ──────────────────────────────

  /**
   * Generate interpolated frames between all saved views and export
   * as a single animated SVG with SMIL timing.
   *
   * @param {Object} [options]
   * @param {number} [options.stepsPerTransition=10] - Frames between keyframes
   */
  async exportAnimation(options = {}) {
    const { stepsPerTransition = 10 } = options;
    const vm = this._viewManager;
    const views = vm._getSortedViews();

    if (views.length < 2) {
      console.warn("Need at least 2 views for animation export");
      return;
    }

    const camera = this._camera;
    const controls = this._controls;
    const frames = []; // Array of SVG strings
    const frameDurations = []; // Duration per frame in seconds

    // For each pair of adjacent views, generate interpolated frames
    for (let v = 0; v < views.length; v++) {
      const fromView = views[v];
      const toView = views[(v + 1) % views.length];
      const transMs = toView.transitionDuration || 2000;
      const holdSec = Math.max(transMs / 3000, 0.5);
      const frameSec = transMs / 1000 / stepsPerTransition;

      // Hold frame at current keyframe
      vm.loadView(fromView.id);
      await new Promise(r => requestAnimationFrame(r));
      frames.push(vm.generateSVG({ view: fromView }));
      frameDurations.push(holdSec);

      // Interpolated frames between this view and next
      const startPos = new THREE.Vector3(
        fromView.camera.position.x,
        fromView.camera.position.y,
        fromView.camera.position.z
      );
      const endPos = new THREE.Vector3(
        toView.camera.position.x,
        toView.camera.position.y,
        toView.camera.position.z
      );
      const startDist = startPos.length();
      const endDist = endPos.length();
      const startZoom = fromView.camera.zoom || 1;
      const endZoom = toView.camera.zoom || 1;

      for (let s = 1; s < stepsPerTransition; s++) {
        const rawT = s / stepsPerTransition;
        const t = rawT * rawT * (3 - 2 * rawT); // smoothstep

        // Slerp position
        const pos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
        const dist = startDist + (endDist - startDist) * t;
        pos.normalize().multiplyScalar(dist);

        camera.position.copy(pos);
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
        camera.zoom = startZoom + (endZoom - startZoom) * t;
        camera.updateProjectionMatrix();

        if (controls) {
          controls.target.set(0, 0, 0);
          controls.update();
        }

        this._renderer.render(this._scene, camera);
        await new Promise(r => requestAnimationFrame(r));

        // Generate SVG at this interpolated position
        const interpView = vm.captureView({ name: `frame_${frames.length}` });
        frames.push(vm.generateSVG({ view: interpView }));
        frameDurations.push(frameSec);
      }
    }

    // Assemble animated SVG with SMIL
    const dims = vm.getExportDimensions();
    const animatedSvg = this._assembleSMIL(frames, frameDurations, dims);

    // Download
    const blob = new Blob([animatedSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "animation.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    MetaLog.log(
      MetaLog.SUMMARY,
      `🎬 Animation exported: ${frames.length} frames, ${frameDurations.reduce((a, b) => a + b, 0).toFixed(1)}s total`
    );
  },

  /**
   * Assemble individual SVG frame strings into a single animated SVG
   * using SMIL <set> elements for frame-by-frame visibility.
   *
   * @param {string[]} frames - Array of SVG strings (one per frame)
   * @param {number[]} durations - Duration in seconds for each frame
   * @param {{width: number, height: number}} dims - SVG dimensions
   * @returns {string} Complete animated SVG string
   * @private
   */
  _assembleSMIL(frames, durations, dims) {
    const totalDur = durations.reduce((a, b) => a + b, 0);

    // Extract inner content from each SVG (strip outer <svg> tags)
    const innerFrames = frames.map(svg => {
      const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
      return match ? match[1] : svg;
    });

    // Build frame groups with SMIL timing
    let currentTime = 0;
    const frameGroups = innerFrames.map((content, i) => {
      const begin = currentTime.toFixed(3);
      const dur = durations[i].toFixed(3);
      currentTime += durations[i];

      return `  <g id="frame-${i}" visibility="hidden">
    <set attributeName="visibility" to="visible"
         begin="${begin}s" dur="${dur}s" fill="remove"/>
${content}
  </g>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${dims.width} ${dims.height}"
     width="${dims.width}" height="${dims.height}">
  <title>ARTexplorer Animation</title>
  <desc>Generated by ARTexplorer — ${frames.length} frames, ${totalDur.toFixed(1)}s loop</desc>
${frameGroups.join("\n")}
</svg>`;
  },
};
