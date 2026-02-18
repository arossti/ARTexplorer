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
import { RTDelta } from "./rt-delta.js";

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
   * @param {Object} [opts] - Options
   * @param {boolean} [opts.cancelPreview=true] - Cancel preview on external ▶ click
   * @param {function} [opts.onTick] - Called each frame with (t, rawT) where t is smoothstepped and rawT is linear (0→1)
   * @returns {Promise<void>} Resolves when animation completes or is cancelled.
   */
  animateToView(
    viewId,
    durationMs,
    { cancelPreview = true, onTick = null } = {}
  ) {
    const vm = this._viewManager;
    const view = vm.state.views.find(v => v.id === viewId || v.name === viewId);
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
    const startDir = startPos.clone().normalize();
    const startUp = camera.up.clone();
    const startZoom = camera.zoom;

    // Target state from saved view
    const endPos = new THREE.Vector3(
      view.camera.position.x,
      view.camera.position.y,
      view.camera.position.z
    );
    const endDist = endPos.length();
    const endDir = endPos.clone().normalize();
    const endZoom = view.camera.zoom || 1;

    // Compute end up vector — match setCameraPreset Z-pole handling
    // When camera is near the Z axis, lookAt(origin) with up=(0,0,1) is degenerate
    // because look direction becomes parallel to up vector. Use Y-up instead.
    const zAxis = new THREE.Vector3(0, 0, 1);
    const endUp = Math.abs(endDir.dot(zAxis)) > 0.95
      ? new THREE.Vector3(0, endDir.z > 0 ? 1 : -1, 0)
      : new THREE.Vector3(0, 0, 1);

    // Pre-compute slerp parameters for direction interpolation
    // Angle-based slerp handles all angular separations correctly (unlike lerp+normalize
    // which breaks near antipodal directions where the midpoint approaches zero)
    const dirDot = THREE.MathUtils.clamp(startDir.dot(endDir), -1, 1);
    const omega = Math.acos(dirDot);
    const sinOmega = Math.sin(omega);

    const startTime = performance.now();
    this.state.active = true;

    return new Promise(resolve => {
      this.state._cancelResolve = resolve;

      const tick = now => {
        const elapsed = now - startTime;
        const rawT = Math.min(elapsed / durationMs, 1);
        const t = rawT * rawT * (3 - 2 * rawT); // smoothstep

        // Direction slerp on the unit sphere (robust for all angular separations)
        let dir;
        if (omega < 0.001) {
          // Nearly identical directions — just use start
          dir = startDir.clone();
        } else {
          const a = Math.sin((1 - t) * omega) / sinOmega;
          const b = Math.sin(t * omega) / sinOmega;
          dir = startDir.clone().multiplyScalar(a).addScaledVector(endDir, b);
        }

        const dist = startDist + (endDist - startDist) * t;
        camera.position.copy(dir.multiplyScalar(dist));

        // Interpolate up vector (avoids lookAt singularity at Z poles)
        const up = new THREE.Vector3().lerpVectors(startUp, endUp, t);
        if (up.lengthSq() < 0.001) up.set(0, 0, 1); // safety for antipodal ups
        up.normalize();
        camera.up.copy(up);
        camera.lookAt(0, 0, 0);
        camera.zoom = startZoom + (endZoom - startZoom) * t;
        camera.updateProjectionMatrix();

        if (controls) {
          controls.target.set(0, 0, 0);
          controls.update();
        }

        // Per-frame callback (e.g. cutplane interpolation, stepped sliders)
        if (onTick) onTick(t, rawT);

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

  /**
   * Animate camera to a saved view with smooth cutplane interpolation.
   * Camera slerps, cutplane value interpolates, render state snaps at arrival.
   *
   * @param {string} viewId - View ID or name
   * @param {number} [durationMs] - Override duration (ms)
   * @param {Object} [opts] - Options passed through to animateToView
   * @returns {Promise<void>}
   */
  async animateToViewFull(viewId, durationMs, opts = {}) {
    const vm = this._viewManager;
    const view = vm.state.views.find(v => v.id === viewId || v.name === viewId);
    if (!view) return;

    const pc = vm._papercut;
    const scene = this._scene;
    const targetCut = view.cutplane || {};

    // Capture current cutplane state before animation starts
    const startEnabled = pc ? pc.state.cutplaneEnabled : false;
    const startValue = pc ? pc.state.cutplaneValue : 0;
    const startAxis = pc ? pc.state.cutplaneAxis : "z";
    const startBasis = pc ? pc.state.cutplaneBasis : "cartesian";

    const endEnabled = targetCut.enabled || false;
    const endValue = targetCut.value || 0;
    const endAxis = targetCut.axis || "z";
    const endBasis = targetCut.basis || "cartesian";

    // Determine if we can smoothly interpolate the cutplane value
    const sameAxis = startAxis === endAxis && startBasis === endBasis;

    // Set up cutplane for interpolation before animation starts
    if (pc && scene) {
      // If axis/basis changes, snap it at the start
      if (!sameAxis && endEnabled) {
        pc.setCutplaneAxis(endBasis, endAxis, scene);
      }

      // Enable cutplane if either endpoint needs it
      if (!startEnabled && endEnabled) {
        pc.state.cutplaneEnabled = true;
        const checkbox = document.getElementById("enableCutPlane");
        if (checkbox) checkbox.checked = true;
      }
    }

    // Build the cutplane tick callback
    const cutplaneTick =
      pc && scene && (startEnabled || endEnabled)
        ? t => {
            const interpValue = startValue + (endValue - startValue) * t;
            pc.state.cutplaneValue = interpValue;
            pc.updateCutplane(interpValue, scene);

            // Update slider UI
            const slider = document.getElementById("cutplaneSlider");
            if (slider) slider.value = interpValue;
            const valueDisplay = document.getElementById("cutplaneValue");
            if (valueDisplay) valueDisplay.textContent = interpValue.toFixed(2);
          }
        : null;

    // Build the dissolve tick callback (fade objects in/out)
    const dissolveTick = view.instanceRefs
      ? this._setupDissolve(view.instanceRefs)
      : null;

    // Build the scene delta tick callback (stepped slider interpolation)
    let deltaTick = null;
    let formDissolveTick = null;
    let gridDissolveTick = null;
    if (view.sceneState) {
      // Get the "from" snapshot — current scene state before animation
      const fromSnapshot = RTDelta.captureSnapshot();
      deltaTick = RTDelta.buildSteppedTick(fromSnapshot, view.sceneState);

      // Build form dissolve tick (fade base forms in/out based on checkbox changes)
      const viewIndex = vm.state.views.indexOf(view);
      const targetSnapshot = viewIndex >= 0
        ? vm.getSnapshotAtView(viewIndex)
        : view.sceneState;
      formDissolveTick = this._setupFormDissolve(fromSnapshot, targetSnapshot);

      // Build grid dissolve tick (fade grids & basis vectors via material traversal)
      gridDissolveTick = this._setupGridDissolve(fromSnapshot, targetSnapshot);
    }

    // Merge cutplane + instance dissolve + form dissolve + grid dissolve + delta
    // cutplane and dissolves use smoothstepped t (continuous interpolation)
    // deltaTick receives both t and rawT (uses rawT for even-spaced discrete steps)
    const onTick =
      cutplaneTick || dissolveTick || formDissolveTick || gridDissolveTick || deltaTick
        ? (t, rawT) => {
            if (cutplaneTick) cutplaneTick(t);
            if (dissolveTick) dissolveTick(t);
            if (formDissolveTick) formDissolveTick(t);
            if (gridDissolveTick) gridDissolveTick(t);
            if (deltaTick) deltaTick(t, rawT);
          }
        : null;

    // Run camera animation with cutplane interpolation + object dissolve
    await this.animateToView(viewId, durationMs, { ...opts, onTick });

    // Snap final non-camera state (render settings, exact cutplane, etc.)
    vm.loadView(viewId, { skipCamera: true });
  },

  // ── Object dissolve (opacity fade per view) ────────────────────

  /**
   * Prepare a per-tick dissolve function that fades objects in/out based on
   * which instances should be visible in the target view.
   *
   * Objects present in targetInstanceRefs but currently hidden fade IN.
   * Objects absent from targetInstanceRefs but currently visible fade OUT.
   *
   * @param {string[]} targetInstanceRefs - Instance IDs that should be visible
   * @returns {function|null} Tick function: (t: 0→1) => void, or null if no fades needed
   * @private
   */
  _setupDissolve(targetInstanceRefs) {
    const sm = this._viewManager._stateManager;
    if (!sm) return null;

    const allInstances = sm.state.instances;
    if (!allInstances || allInstances.length === 0) return null;

    // First pass: restore any materials left mid-dissolve by a cancelled animation.
    // Materials touched by dissolve have _dissolveOriginal* markers.
    for (const inst of allInstances) {
      const group = inst.threeObject;
      if (!group) continue;
      group.traverse(child => {
        if (child.material) {
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          mats.forEach(mat => {
            if (mat._dissolveOriginalOpacity !== undefined) {
              mat.opacity = mat._dissolveOriginalOpacity;
              mat.transparent = mat._dissolveOriginalTransparent;
              delete mat._dissolveOriginalOpacity;
              delete mat._dissolveOriginalTransparent;
              mat.needsUpdate = true;
            }
          });
        }
      });
    }

    // Second pass: determine which objects need to fade in/out
    const fadeTargets = [];

    for (const inst of allInstances) {
      const shouldBeVisible = targetInstanceRefs.includes(inst.id);
      const group = inst.threeObject;
      if (!group) continue;

      const isCurrentlyVisible = group.visible;

      if (shouldBeVisible && !isCurrentlyVisible) {
        // FADE IN: make group visible at opacity 0, animate to original opacity
        group.visible = true;
        const materials = [];
        group.traverse(child => {
          if (child.material) {
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            mats.forEach(mat => {
              const origOpacity = mat.opacity;
              const origTransparent = mat.transparent;
              // Mark material as dissolve-modified (for mid-cancel cleanup)
              mat._dissolveOriginalOpacity = origOpacity;
              mat._dissolveOriginalTransparent = origTransparent;
              mat.transparent = true;
              mat.opacity = 0;
              mat.needsUpdate = true;
              materials.push({ mat, origOpacity, origTransparent });
            });
          }
        });
        fadeTargets.push({ group, materials, direction: "in" });
      } else if (!shouldBeVisible && isCurrentlyVisible) {
        // FADE OUT: animate from current opacity to 0, then hide
        const materials = [];
        group.traverse(child => {
          if (child.material) {
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            mats.forEach(mat => {
              const origOpacity = mat.opacity;
              const origTransparent = mat.transparent;
              mat._dissolveOriginalOpacity = origOpacity;
              mat._dissolveOriginalTransparent = origTransparent;
              mat.transparent = true;
              mat.needsUpdate = true;
              materials.push({ mat, origOpacity, origTransparent });
            });
          }
        });
        fadeTargets.push({ group, materials, direction: "out" });
      }
    }

    if (fadeTargets.length === 0) return null;

    return t => {
      for (const target of fadeTargets) {
        for (const { mat, origOpacity } of target.materials) {
          if (target.direction === "in") {
            mat.opacity = origOpacity * t;
          } else {
            mat.opacity = origOpacity * (1 - t);
          }
          mat.needsUpdate = true;
        }

        // At completion, finalize state and clean up markers
        if (t >= 1) {
          if (target.direction === "out") {
            target.group.visible = false;
          }
          for (const { mat, origOpacity, origTransparent } of target.materials) {
            mat.opacity = origOpacity;
            mat.transparent = origTransparent;
            delete mat._dissolveOriginalOpacity;
            delete mat._dissolveOriginalTransparent;
            mat.needsUpdate = true;
          }
        }
      }
    };
  },

  // ── Base form dissolve (opacity fade for checkbox-toggled polyhedra) ──

  /**
   * Map checkbox DOM IDs to getAllFormGroups() keys.
   * Excludes basis vectors (showCartesianBasis, showQuadray) which use
   * different rendering paths and should snap rather than dissolve.
   * @private
   */
  _CHECKBOX_TO_GROUP: {
    showPoint: "pointGroup",
    showLine: "lineGroup",
    showPolygon: "polygonGroup",
    showPrism: "prismGroup",
    showCone: "coneGroup",
    showTetrahelix1: "tetrahelix1Group",
    showTetrahelix2: "tetrahelix2Group",
    showCube: "cubeGroup",
    showTetrahedron: "tetrahedronGroup",
    showDualTetrahedron: "dualTetrahedronGroup",
    showOctahedron: "octahedronGroup",
    showIcosahedron: "icosahedronGroup",
    showDodecahedron: "dodecahedronGroup",
    showDualIcosahedron: "dualIcosahedronGroup",
    showCuboctahedron: "cuboctahedronGroup",
    showRhombicDodecahedron: "rhombicDodecahedronGroup",
    showGeodesicTetrahedron: "geodesicTetrahedronGroup",
    showGeodesicDualTetrahedron: "geodesicDualTetrahedronGroup",
    showGeodesicOctahedron: "geodesicOctahedronGroup",
    showGeodesicIcosahedron: "geodesicIcosahedronGroup",
    showGeodesicDualIcosahedron: "geodesicDualIcosahedronGroup",
    showQuadrayTetrahedron: "quadrayTetrahedronGroup",
    showQuadrayTetraDeformed: "quadrayTetraDeformedGroup",
    showQuadrayCuboctahedron: "quadrayCuboctahedronGroup",
    showQuadrayOctahedron: "quadrayOctahedronGroup",
    showQuadrayTruncatedTet: "quadrayTruncatedTetGroup",
    showCubeMatrix: "cubeMatrixGroup",
    showTetMatrix: "tetMatrixGroup",
    showOctaMatrix: "octaMatrixGroup",
    showCuboctahedronMatrix: "cuboctaMatrixGroup",
    showRhombicDodecMatrix: "rhombicDodecMatrixGroup",
    showRadialCubeMatrix: "radialCubeMatrixGroup",
    showRadialRhombicDodecMatrix: "radialRhombicDodecMatrixGroup",
    showRadialTetrahedronMatrix: "radialTetMatrixGroup",
    showRadialOctahedronMatrix: "radialOctMatrixGroup",
    showRadialCuboctahedronMatrix: "radialVEMatrixGroup",
    showPenroseTiling: "penroseTilingGroup",
    // Thomson Polyhedra
    showThomsonTetrahedron: "thomsonTetrahedronGroup",
    showThomsonOctahedron: "thomsonOctahedronGroup",
  },

  /**
   * Remove any stale dissolveOpacity markers left by cancelled animations.
   * Called at the start of _setupFormDissolve() to ensure clean state.
   * @private
   */
  _cleanupFormDissolve() {
    const formGroups = window.renderingAPI?.getAllFormGroups();
    if (!formGroups) return;
    let cleaned = false;
    for (const group of Object.values(formGroups)) {
      if (group.userData.dissolveOpacity !== undefined) {
        delete group.userData.dissolveOpacity;
        cleaned = true;
      }
    }
    if (cleaned && window.renderingAPI?.updateGeometry) {
      window.renderingAPI.updateGeometry();
    }
  },

  /**
   * Prepare a per-tick dissolve function that fades base forms in/out based on
   * which polyhedra checkboxes change between views.
   *
   * Forms turning ON fade in (dissolveOpacity 0→1).
   * Forms turning OFF fade out (dissolveOpacity 1→0).
   *
   * Uses group.userData.dissolveOpacity which renderPolyhedron() reads
   * when creating materials during updateGeometry().
   *
   * @param {Object} fromSnapshot - Current scene snapshot
   * @param {Object} targetSnapshot - Target scene full accumulated snapshot
   * @returns {function|null} Tick function: (t: 0→1) => void, or null if no form changes
   * @private
   */
  _setupFormDissolve(fromSnapshot, targetSnapshot) {
    if (!fromSnapshot?.polyhedraCheckboxes || !targetSnapshot?.polyhedraCheckboxes) {
      return null;
    }

    // Clean up any stale dissolve markers from cancelled animations
    this._cleanupFormDissolve();

    const formGroups = window.renderingAPI?.getAllFormGroups();
    if (!formGroups) return null;

    const fadeTargets = [];

    for (const [checkboxId, targetChecked] of Object.entries(targetSnapshot.polyhedraCheckboxes)) {
      const currentChecked = fromSnapshot.polyhedraCheckboxes[checkboxId] ?? false;
      if (currentChecked === targetChecked) continue;

      const groupKey = this._CHECKBOX_TO_GROUP[checkboxId];
      if (!groupKey) continue;

      const group = formGroups[groupKey];
      if (!group) continue;

      if (targetChecked && !currentChecked) {
        fadeTargets.push({ checkboxId, group, direction: "in" });
      } else if (!targetChecked && currentChecked) {
        fadeTargets.push({ checkboxId, group, direction: "out" });
      }
    }

    if (fadeTargets.length === 0) return null;

    // Pre-animation setup:
    // Forms fading IN: check checkbox, set dissolveOpacity=0, rebuild so mesh exists but invisible
    // Forms fading OUT: keep checkbox checked, dissolveOpacity starts at 1
    for (const target of fadeTargets) {
      if (target.direction === "in") {
        const el = document.getElementById(target.checkboxId);
        if (el) el.checked = true;
        target.group.userData.dissolveOpacity = 0;
      } else {
        target.group.userData.dissolveOpacity = 1;
      }
    }

    // Rebuild geometry so fade-in forms are rendered (at opacity 0)
    if (window.renderingAPI?.updateGeometry) {
      window.renderingAPI.updateGeometry();
    }

    return (t) => {
      let needsRebuild = false;

      for (const target of fadeTargets) {
        const prev = target.group.userData.dissolveOpacity;
        const next = target.direction === "in" ? t : 1 - t;

        if (Math.abs(next - prev) > 0.001) {
          target.group.userData.dissolveOpacity = next;
          needsRebuild = true;
        }
      }

      if (needsRebuild && window.renderingAPI?.updateGeometry) {
        window.renderingAPI.updateGeometry();
      }

      // At completion, finalize state and clean up markers
      if (t >= 1) {
        for (const target of fadeTargets) {
          if (target.direction === "out") {
            const el = document.getElementById(target.checkboxId);
            if (el) el.checked = false;
          }
          delete target.group.userData.dissolveOpacity;
        }
        if (window.renderingAPI?.updateGeometry) {
          window.renderingAPI.updateGeometry();
        }
      }
    };
  },

  // ── Grid dissolve (opacity fade for grids & basis vectors) ─────

  /**
   * Map grid group keys (from getGridGroups()) to the checkbox IDs that
   * control their visibility. When ALL checkboxes for a group transition
   * from off→on or on→off, the group fades in/out.
   * @private
   */
  _GRID_CHECKBOX_GROUPS: {
    ivmPlanes: ["planeIvmWX", "planeIvmWY", "planeIvmWZ", "planeIvmXY", "planeIvmXZ", "planeIvmYZ"],
    cartesianGrid: ["planeXY", "planeXZ", "planeYZ"],
    cartesianBasis: ["showCartesianBasis"],
    quadrayBasis: ["showQuadray"],
  },

  /**
   * Prepare a per-tick dissolve function that fades grid groups in/out.
   * Works by directly traversing children and setting material opacity,
   * since grids don't go through renderPolyhedron()/updateGeometry().
   *
   * @param {Object} fromSnapshot - Current scene snapshot
   * @param {Object} targetSnapshot - Target scene full accumulated snapshot
   * @returns {function|null} Tick function: (t: 0→1) => void, or null if no grid changes
   * @private
   */
  _setupGridDissolve(fromSnapshot, targetSnapshot) {
    if (!fromSnapshot?.polyhedraCheckboxes || !targetSnapshot?.polyhedraCheckboxes) {
      return null;
    }

    const gridGroups = window.renderingAPI?.getGridGroups();
    if (!gridGroups) return null;

    const fadeTargets = [];

    for (const [groupKey, checkboxIds] of Object.entries(this._GRID_CHECKBOX_GROUPS)) {
      const group = gridGroups[groupKey];
      if (!group) continue;

      // Check if group-level visibility transitions
      const anyCurrentOn = checkboxIds.some(id => fromSnapshot.polyhedraCheckboxes[id]);
      const anyTargetOn = checkboxIds.some(id => targetSnapshot.polyhedraCheckboxes[id]);
      if (anyTargetOn === anyCurrentOn) continue;

      // Collect all materials in the group (works even when group.visible=false)
      const materials = [];
      group.traverse(child => {
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            materials.push({
              mat,
              origOpacity: mat.opacity,
              origTransparent: mat.transparent,
            });
          });
        }
      });

      if (materials.length === 0) continue;

      if (anyTargetOn && !anyCurrentOn) {
        // FADE IN: zero materials first (before making visible), then enable
        for (const { mat } of materials) {
          mat._dissolveOriginalOpacity = mat.opacity;
          mat._dissolveOriginalTransparent = mat.transparent;
          mat.transparent = true;
          mat.opacity = 0;
          mat.needsUpdate = true;
        }
        // Set checkboxes + dispatch change → makes planes visible (at opacity 0)
        for (const id of checkboxIds) {
          const el = document.getElementById(id);
          if (el && targetSnapshot.polyhedraCheckboxes[id]) {
            el.checked = true;
            el.dispatchEvent(new Event("change"));
          }
        }
        fadeTargets.push({ group, materials, direction: "in", checkboxIds });
      } else {
        // FADE OUT: mark materials for dissolve
        for (const { mat } of materials) {
          mat._dissolveOriginalOpacity = mat.opacity;
          mat._dissolveOriginalTransparent = mat.transparent;
          mat.transparent = true;
          mat.needsUpdate = true;
        }
        fadeTargets.push({ group, materials, direction: "out", checkboxIds });
      }
    }

    if (fadeTargets.length === 0) return null;

    return (t) => {
      for (const target of fadeTargets) {
        for (const { mat, origOpacity } of target.materials) {
          mat.opacity = target.direction === "in"
            ? origOpacity * t
            : origOpacity * (1 - t);
          mat.needsUpdate = true;
        }

        if (t >= 1) {
          if (target.direction === "out") {
            for (const id of target.checkboxIds) {
              const el = document.getElementById(id);
              if (el) {
                el.checked = false;
                el.dispatchEvent(new Event("change"));
              }
            }
          }
          for (const { mat, origOpacity, origTransparent } of target.materials) {
            mat.opacity = origOpacity;
            mat.transparent = origTransparent;
            delete mat._dissolveOriginalOpacity;
            delete mat._dissolveOriginalTransparent;
            mat.needsUpdate = true;
          }
        }
      }
    };
  },

  // ── Preview loop ────────────────────────────────────────────────

  /**
   * Stop any running preview loop and reset UI.
   * @private
   */
  _stopPreview() {
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
    this._updatePreviewFullButton(false);
  },

  /**
   * Core preview loop: cycles through views using the supplied animate function.
   * Resumes from last-reached view.
   *
   * @param {function} animateFn - (viewId, durationMs, opts) => Promise
   * @param {function} updateBtn - (playing: boolean) => void
   * @private
   */
  async _runPreviewLoop(animateFn, updateBtn) {
    if (this.state.previewing) {
      this._stopPreview();
      return;
    }

    const views = this._viewManager._getSortedViews();
    if (views.length < 2) return;

    this.state.previewing = true;
    updateBtn(true);

    // Resume from last-reached view if set
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
        await animateFn.call(this, view.id, duration, {
          cancelPreview: false,
        });
        if (!this.state.previewing) break;
        // Hold at keyframe (1/3 of transition, min 500ms)
        await new Promise(r => setTimeout(r, Math.max(duration / 3, 500)));
      }
      startIdx = 0; // After first pass, loop from beginning
    }

    updateBtn(false);
  },

  /**
   * Toggle preview: loops through all saved views with animated transitions.
   */
  async previewAnimation() {
    await this._runPreviewLoop(this.animateToView, playing =>
      this._updatePreviewButton(playing)
    );
  },

  /**
   * Toggle full-scene preview: loops with camera + cutplane + scene restore.
   */
  async previewAnimationFull() {
    await this._runPreviewLoop(this.animateToViewFull, playing =>
      this._updatePreviewFullButton(playing)
    );
  },

  // ── UI helpers ──────────────────────────────────────────────────

  /**
   * Update a play/stop button's icon and title.
   * @param {string} elementId - DOM id of the button
   * @param {boolean} playing - true → stop icon, false → play icon
   * @param {string} stopTitle - title when playing
   * @param {string} playTitle - title when stopped
   * @private
   */
  _updatePlayStopBtn(elementId, playing, stopTitle, playTitle) {
    const btn = document.getElementById(elementId);
    if (!btn) return;
    if (playing) {
      btn.innerHTML = '<span class="anim-icon-stop">&#9632;</span>';
      btn.title = stopTitle;
    } else {
      btn.innerHTML = '<span class="anim-icon-play">&#9654;</span>';
      btn.title = playTitle;
    }
  },

  _updatePreviewButton(playing) {
    this._updatePlayStopBtn(
      "previewAnimationBtn",
      playing,
      "Stop animation preview",
      "Preview animation loop in scene"
    );
  },

  _updatePreviewFullButton(playing) {
    this._updatePlayStopBtn(
      "previewFullBtn",
      playing,
      "Stop full-scene animation preview",
      "Preview with full scene restore (cutplane, render state)"
    );
  },

  /**
   * Wire up Preview/Batch/Animation button click handlers for both rows.
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

    // ── Camera + Scene row ──
    const previewFullBtn = document.getElementById("previewFullBtn");
    const batchFullBtn = document.getElementById("exportBatchFullBtn");
    const animFullBtn = document.getElementById("exportAnimationFullBtn");

    if (previewFullBtn) {
      previewFullBtn.addEventListener("click", () =>
        this.previewAnimationFull()
      );
    }
    if (batchFullBtn) {
      // Batch already calls vm.loadView() — full state restore
      batchFullBtn.addEventListener("click", () => this.exportBatch());
    }
    if (animFullBtn) {
      // Animation already calls vm.loadView() — full state restore
      animFullBtn.addEventListener("click", () => this.exportAnimation());
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
