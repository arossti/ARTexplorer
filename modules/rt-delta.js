/**
 * rt-delta.js — Scene state delta system for view transitions
 *
 * Captures, diffs, applies, and interpolates scene state deltas between views.
 * Keeps rt-viewmanager.js and rt-animate.js clean by owning all delta logic.
 *
 * Four responsibilities:
 *   1. captureSnapshot()      — Read current scene state from DOM
 *   2. computeDelta(prev, cur) — Shallow diff, return only changed fields
 *   3. applyDelta(delta)       — Restore delta through existing UI handlers
 *   4. buildSteppedTick(from, delta) — Return onTick(t) for animated transitions
 */

export const RTDelta = {
  // ── 1. Capture ───────────────────────────────────────────────────

  /**
   * Read the current scene state from DOM elements.
   * Returns the three flat maps that define visible scene content:
   *   polyhedraCheckboxes, sliderValues, geodesicProjections
   *
   * Mirrors the same fields captured by RTFileHandler.exportState()
   * but reads only the delta-relevant subset (no camera, instances, etc.)
   *
   * @returns {{ polyhedraCheckboxes: Object, sliderValues: Object, geodesicProjections: Object }}
   */
  captureSnapshot() {
    return {
      polyhedraCheckboxes: this._captureCheckboxes(),
      sliderValues: this._captureSliders(),
      geodesicProjections: this._captureProjections(),
    };
  },

  /** @private */
  _captureCheckboxes() {
    const ids = [
      // Primitives
      "showPoint", "showLine", "showPolygon", "showPrism", "showCone",
      // Helices
      "showTetrahelix1", "showTetrahelix2",
      // Regular polyhedra
      "showCube", "showTetrahedron", "showDualTetrahedron",
      "showOctahedron", "showIcosahedron", "showDodecahedron",
      "showDualIcosahedron", "showCuboctahedron", "showRhombicDodecahedron",
      // Geodesic polyhedra
      "showGeodesicTetrahedron", "showGeodesicDualTetrahedron",
      "showGeodesicOctahedron", "showGeodesicIcosahedron",
      "showGeodesicDualIcosahedron",
      // Quadray polyhedra
      "showQuadrayTetrahedron", "showQuadrayTetraDeformed",
      "showQuadrayCuboctahedron", "showQuadrayOctahedron",
      "showQuadrayTruncatedTet",
      // Planar matrices
      "showCubeMatrix", "showTetMatrix", "showOctaMatrix",
      "showCuboctahedronMatrix", "showRhombicDodecMatrix",
      // Radial matrices
      "showRadialCubeMatrix", "showRadialRhombicDodecMatrix",
      "showRadialTetrahedronMatrix", "showRadialOctahedronMatrix",
      "showRadialCuboctahedronMatrix",
      // Basis vectors
      "showCartesianBasis", "showQuadray",
      // Penrose Tiling
      "showPenroseTiling",
    ];
    const result = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) result[id] = el.checked;
    }
    return result;
  },

  /**
   * Slider ID → DOM element ID mapping.
   * Values parsed as float; integer detection uses Number.isInteger() on both endpoints.
   * @private
   */
  _sliderMap: {
    scaleSlider: "scaleSlider",
    tetScaleSlider: "tetScaleSlider",
    opacitySlider: "opacitySlider",
    nodeOpacitySlider: "nodeOpacitySlider",
    tetrahelix1Count: "tetrahelix1CountSlider",
    tetrahelix2Count: "tetrahelix2CountSlider",
    tetrahelix3Count: "tetrahelix3CountSlider",
    cubeMatrixSizeSlider: "cubeMatrixSizeSlider",
    tetMatrixSizeSlider: "tetMatrixSizeSlider",
    octaMatrixSizeSlider: "octaMatrixSizeSlider",
    cuboctaMatrixSizeSlider: "cuboctaMatrixSizeSlider",
    rhombicDodecMatrixSizeSlider: "rhombicDodecMatrixSizeSlider",
    radialCubeFreqSlider: "radialCubeFreqSlider",
    radialRhombicDodecFreqSlider: "radialRhombicDodecFreqSlider",
    radialTetFreqSlider: "radialTetFreqSlider",
    radialOctFreqSlider: "radialOctFreqSlider",
    radialVEFreqSlider: "radialVEFreqSlider",
    geodesicTetraFrequency: "geodesicTetraFrequency",
    geodesicDualTetraFrequency: "geodesicDualTetraFrequency",
    geodesicOctaFrequency: "geodesicOctaFrequency",
    geodesicIcosaFrequency: "geodesicIcosaFrequency",
    geodesicDualIcosaFrequency: "geodesicDualIcosaFrequency",
  },

  /** @private */
  _captureSliders() {
    const result = {};
    for (const [key, domId] of Object.entries(this._sliderMap)) {
      const el = document.getElementById(domId);
      if (el) result[key] = parseFloat(el.value);
    }
    return result;
  },

  /**
   * Geodesic projection radio group names → snapshot keys.
   * @private
   */
  _projectionRadios: [
    "geodesicTetraProjection",
    "geodesicDualTetraProjection",
    "geodesicOctaProjection",
    "geodesicIcosaProjection",
    "geodesicDualIcosaProjection",
  ],

  /** @private */
  _captureProjections() {
    const result = {};
    for (const name of this._projectionRadios) {
      const checked = document.querySelector(`input[name="${name}"]:checked`);
      if (checked) result[name] = checked.value;
    }
    return result;
  },

  // ── 2. Delta computation ─────────────────────────────────────────

  /**
   * Shallow diff two snapshots. Returns only changed fields.
   * If prev is null/undefined, returns the full current snapshot (first view).
   *
   * @param {Object|null} prev - Previous snapshot (or null for first view)
   * @param {Object} current  - Current snapshot from captureSnapshot()
   * @returns {Object} Delta object with only changed categories/fields
   */
  computeDelta(prev, current) {
    if (!prev) {
      // First view — store full snapshot as delta
      return structuredClone(current);
    }

    const delta = {};

    // Diff each category (flat key-value maps)
    for (const category of ["polyhedraCheckboxes", "sliderValues", "geodesicProjections"]) {
      const prevCat = prev[category] || {};
      const curCat = current[category] || {};
      const catDelta = {};
      let hasChanges = false;

      for (const [key, value] of Object.entries(curCat)) {
        if (prevCat[key] !== value) {
          catDelta[key] = value;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        delta[category] = catDelta;
      }
    }

    return delta;
  },

  /**
   * Accumulate a snapshot by applying a sequence of deltas.
   * Used to reconstruct what the scene looks like at a given view index.
   *
   * @param {Object} baseSnapshot - Starting snapshot (from first view or captureSnapshot)
   * @param {Object[]} deltas     - Array of delta objects to apply in order
   * @returns {Object} Accumulated snapshot
   */
  accumulateSnapshot(baseSnapshot, deltas) {
    const accumulated = structuredClone(baseSnapshot);

    for (const delta of deltas) {
      for (const category of ["polyhedraCheckboxes", "sliderValues", "geodesicProjections"]) {
        if (delta[category]) {
          if (!accumulated[category]) accumulated[category] = {};
          Object.assign(accumulated[category], delta[category]);
        }
      }
    }

    return accumulated;
  },

  // ── 3. Apply ─────────────────────────────────────────────────────

  /**
   * Apply a scene state delta by driving existing UI handlers.
   * Order: sliders first (so geometry uses correct values), then projections,
   * then checkboxes, then a single updateGeometry() call.
   *
   * @param {Object} delta - Delta from computeDelta() or view.sceneState
   */
  applyDelta(delta) {
    if (!delta) return;

    // 1. Set slider values (before checkboxes — geometry needs correct params)
    if (delta.sliderValues) {
      for (const [key, value] of Object.entries(delta.sliderValues)) {
        this._setSlider(key, value);
      }
    }

    // 2. Set geodesic projection radios
    if (delta.geodesicProjections) {
      for (const [name, value] of Object.entries(delta.geodesicProjections)) {
        const radio = document.querySelector(
          `input[name="${name}"][value="${value}"]`
        );
        if (radio) radio.checked = true;
      }
    }

    // 3. Set polyhedra checkboxes
    if (delta.polyhedraCheckboxes) {
      for (const [id, checked] of Object.entries(delta.polyhedraCheckboxes)) {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
      }
    }

    // 4. Trigger geometry rebuild (single call, like importState)
    if (window.renderingAPI?.updateGeometry) {
      window.renderingAPI.updateGeometry();
    }
  },

  /**
   * Set a slider's DOM value, update display, and dispatch 'input' event
   * so existing handlers (scale, opacity, etc.) fire correctly.
   * @private
   */
  _setSlider(key, value) {
    const domId = this._sliderMap[key];
    if (!domId) return;

    const el = document.getElementById(domId);
    if (!el) return;

    el.value = value;

    // Dispatch 'input' event so the slider's existing handler fires
    // (e.g., scale slider applies transform, opacity slider updates materials)
    el.dispatchEvent(new Event("input", { bubbles: true }));

    // Update associated display elements (e.g., "tetrahelix1CountDisplay")
    // Convention: slider "fooSlider" or "fooCountSlider" → display "fooDisplay" or "fooCountDisplay"
    const displayId = domId.replace("Slider", "Display");
    if (displayId !== domId) {
      const display = document.getElementById(displayId);
      if (display) display.textContent = Number.isInteger(value) ? value : value.toFixed(2);
    }

    // Also try the *Value pattern (e.g., "geodesicIcosaFrequencyValue")
    const valueId = domId + "Value";
    const valueEl = document.getElementById(valueId);
    if (valueEl) valueEl.textContent = Number.isInteger(value) ? value : value.toFixed(2);
  },

  // ── 4. Stepped interpolation tick builder ─────────────────────────

  /**
   * Build an onTick(t) function that steps/interpolates delta values during
   * an animated transition. Designed to merge with cutplane and dissolve ticks
   * in animateToViewFull().
   *
   * - Integer sliders: stepped evenly across t ∈ [0,1], fire handler only when value changes
   * - Float sliders: smooth per-frame interpolation
   * - Geodesic projections: snap at t=0.5
   * - Checkboxes: NOT handled here (use dissolve system for form fades)
   *
   * @param {Object} fromSnapshot - Full snapshot at animation start
   * @param {Object} delta        - Target delta (view.sceneState)
   * @returns {function|null} Tick function: (t: 0→1) => void, or null if no interpolable changes
   */
  buildSteppedTick(fromSnapshot, delta) {
    if (!delta) return null;

    const steps = [];

    // Build interpolation plan for sliders
    if (delta.sliderValues) {
      for (const [key, toValue] of Object.entries(delta.sliderValues)) {
        const fromValue = fromSnapshot.sliderValues?.[key];
        if (fromValue === undefined || fromValue === toValue) continue;

        const isInteger = Number.isInteger(fromValue) && Number.isInteger(toValue);
        steps.push({
          type: isInteger ? "stepped" : "smooth",
          key,
          from: fromValue,
          to: toValue,
          lastApplied: fromValue, // Track last value to avoid redundant updates
        });
      }
    }

    // Build snap plan for projections
    const projSnaps = [];
    if (delta.geodesicProjections) {
      for (const [name, toValue] of Object.entries(delta.geodesicProjections)) {
        const fromValue = fromSnapshot.geodesicProjections?.[name];
        if (fromValue !== toValue) {
          projSnaps.push({ name, to: toValue, applied: false });
        }
      }
    }

    if (steps.length === 0 && projSnaps.length === 0) return null;

    let needsRebuild = false;

    return (t) => {
      needsRebuild = false;

      // Interpolate sliders
      for (const step of steps) {
        let value;

        if (step.type === "stepped") {
          // Integer: step through each value, round to nearest
          value = Math.round(step.from + (step.to - step.from) * t);
        } else {
          // Float: smooth lerp
          value = step.from + (step.to - step.from) * t;
        }

        // Only fire handler when value actually changes
        if (step.type === "stepped") {
          if (value !== step.lastApplied) {
            step.lastApplied = value;
            this._setSlider(step.key, value);
            needsRebuild = true;
          }
        } else {
          // Continuous: update every frame
          this._setSlider(step.key, value);
          needsRebuild = true;
        }
      }

      // Snap projections at midpoint
      for (const snap of projSnaps) {
        if (!snap.applied && t >= 0.5) {
          const radio = document.querySelector(
            `input[name="${snap.name}"][value="${snap.to}"]`
          );
          if (radio) radio.checked = true;
          snap.applied = true;
          needsRebuild = true;
        }
      }

      // Single geometry rebuild if anything changed this tick
      if (needsRebuild && window.renderingAPI?.updateGeometry) {
        window.renderingAPI.updateGeometry();
      }

      // At completion, snap all values to exact targets
      if (t >= 1) {
        for (const step of steps) {
          this._setSlider(step.key, step.to);
        }
        for (const snap of projSnaps) {
          if (!snap.applied) {
            const radio = document.querySelector(
              `input[name="${snap.name}"][value="${snap.to}"]`
            );
            if (radio) radio.checked = true;
          }
        }
        if (window.renderingAPI?.updateGeometry) {
          window.renderingAPI.updateGeometry();
        }
      }
    };
  },
};
