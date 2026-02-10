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
  animateToView(viewId, durationMs) {
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
        await this.animateToView(view.id, duration);
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
    btn.textContent = playing ? "Stop" : "Preview";
    btn.classList.toggle("active", playing);
  },
};
