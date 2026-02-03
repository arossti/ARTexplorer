/**
 * rt-filehandler.js
 * File Handler Module for ART Explorer
 *
 * Handles export/import of:
 * - State persistence (.json) - Scene state, instances, environment
 * - Geometry export (.gltf/.glb) - 3D model export for external applications
 * - Auto-save to localStorage
 * - Preset library system
 *
 * @module RTFileHandler
 * @requires THREE.js
 * @requires RTStateManager
 */

export const RTFileHandler = {
  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  config: {
    autoSaveEnabled: true,
    autoSaveThreshold: 10, // Auto-save every N modifications
    autoSaveKey: "art-explorer-autosave",
    presetKeyPrefix: "art-explorer-preset-",
    maxAutoSaveHistory: 5,
  },

  // ========================================================================
  // STATE
  // ========================================================================

  state: {
    lastSaveTimestamp: null,
  },

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize File Handler
   * @param {Object} stateManager - RTStateManager instance
   * @param {THREE.Scene} scene - THREE.js scene
   * @param {THREE.Camera} camera - THREE.js camera
   */
  init(stateManager, scene, camera) {
    this.stateManager = stateManager;
    this.scene = scene;
    this.camera = camera;

    // Register for state modification events if auto-save enabled
    if (this.config.autoSaveEnabled) {
      // Safari-safe: Check if onModification method exists before calling
      if (typeof this.stateManager.onModification === "function") {
        this.stateManager.onModification(
          (_modCount, changesSinceSave, _action) => {
            // Auto-save when threshold is reached
            if (changesSinceSave >= this.config.autoSaveThreshold) {
              this.autoSave();
              console.log(
                `💾 Auto-save triggered after ${changesSinceSave} changes`
              );
            }
          }
        );
        console.log(
          `💾 Auto-save enabled (every ${this.config.autoSaveThreshold} modifications)`
        );
      } else {
        console.warn(
          "⚠️ StateManager.onModification not available - auto-save disabled"
        );
      }
    }

    console.log("✅ RTFileHandler initialized");
  },

  // ========================================================================
  // JSON STATE EXPORT/IMPORT
  // ========================================================================

  /**
   * Export complete scene state to JSON
   * Includes environment (camera, grids, UI) and instances
   * @returns {Object} Complete state object
   */
  exportState() {
    // Get camera state
    const cameraState = {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      rotation: {
        x: this.camera.rotation.x,
        y: this.camera.rotation.y,
        z: this.camera.rotation.z,
      },
      zoom: this.camera.zoom || 1,
    };

    // Get grid states from UI
    const quadrayVisible =
      document.getElementById("quadray-checkbox")?.checked || false;
    const cartesianVisible =
      document.getElementById("cartesian-checkbox")?.checked || false;
    const quadrayTess = parseInt(
      document.getElementById("quadrayTessSlider")?.value || 12
    );
    const cartesianTess = parseInt(
      document.getElementById("cartesianTessSlider")?.value || 10
    );

    // Get polyhedra checkbox states (forms visible at origin)
    const polyhedraCheckboxes = {
      // Primitives
      showPoint: document.getElementById("showPoint")?.checked || false,
      showLine: document.getElementById("showLine")?.checked || false,
      showPolygon: document.getElementById("showPolygon")?.checked || false,
      showPrism: document.getElementById("showPrism")?.checked || false,
      showCone: document.getElementById("showCone")?.checked || false,
      // Helices
      showTetrahelix1:
        document.getElementById("showTetrahelix1")?.checked || false,
      showTetrahelix2:
        document.getElementById("showTetrahelix2")?.checked || false,
      // Regular polyhedra
      showCube: document.getElementById("showCube")?.checked || false,
      showTetrahedron:
        document.getElementById("showTetrahedron")?.checked || false,
      showDualTetrahedron:
        document.getElementById("showDualTetrahedron")?.checked || false,
      showOctahedron:
        document.getElementById("showOctahedron")?.checked || false,
      showIcosahedron:
        document.getElementById("showIcosahedron")?.checked || false,
      showDodecahedron:
        document.getElementById("showDodecahedron")?.checked || false,
      showDualIcosahedron:
        document.getElementById("showDualIcosahedron")?.checked || false,
      showCuboctahedron:
        document.getElementById("showCuboctahedron")?.checked || false,
      showRhombicDodecahedron:
        document.getElementById("showRhombicDodecahedron")?.checked || false,
      // Geodesic polyhedra
      showGeodesicTetrahedron:
        document.getElementById("showGeodesicTetrahedron")?.checked || false,
      showGeodesicDualTetrahedron:
        document.getElementById("showGeodesicDualTetrahedron")?.checked ||
        false,
      showGeodesicOctahedron:
        document.getElementById("showGeodesicOctahedron")?.checked || false,
      showGeodesicIcosahedron:
        document.getElementById("showGeodesicIcosahedron")?.checked || false,
      showGeodesicDualIcosahedron:
        document.getElementById("showGeodesicDualIcosahedron")?.checked ||
        false,
      // Quadray polyhedra
      showQuadrayTetrahedron:
        document.getElementById("showQuadrayTetrahedron")?.checked || false,
      showQuadrayTetraDeformed:
        document.getElementById("showQuadrayTetraDeformed")?.checked || false,
      // Planar matrices
      showCubeMatrix:
        document.getElementById("showCubeMatrix")?.checked || false,
      showTetMatrix: document.getElementById("showTetMatrix")?.checked || false,
      showOctaMatrix:
        document.getElementById("showOctaMatrix")?.checked || false,
      showCuboctahedronMatrix:
        document.getElementById("showCuboctahedronMatrix")?.checked || false,
      showRhombicDodecMatrix:
        document.getElementById("showRhombicDodecMatrix")?.checked || false,
      // Radial matrices
      showRadialCubeMatrix:
        document.getElementById("showRadialCubeMatrix")?.checked || false,
      showRadialRhombicDodecMatrix:
        document.getElementById("showRadialRhombicDodecMatrix")?.checked ||
        false,
      showRadialTetrahedronMatrix:
        document.getElementById("showRadialTetrahedronMatrix")?.checked ||
        false,
      showRadialOctahedronMatrix:
        document.getElementById("showRadialOctahedronMatrix")?.checked || false,
      showRadialCuboctahedronMatrix:
        document.getElementById("showRadialCuboctahedronMatrix")?.checked ||
        false,
      // Basis vectors
      showCartesianBasis:
        document.getElementById("showCartesianBasis")?.checked || false,
      showQuadray: document.getElementById("showQuadray")?.checked || false,
    };

    // Get slider values
    const sliderValues = {
      // Scale sliders
      scaleSlider: parseFloat(
        document.getElementById("scaleSlider")?.value || "1"
      ),
      tetScaleSlider: parseFloat(
        document.getElementById("tetScaleSlider")?.value || "1"
      ),
      opacitySlider: parseFloat(
        document.getElementById("opacitySlider")?.value || "0.25"
      ),
      nodeOpacitySlider: parseFloat(
        document.getElementById("nodeOpacitySlider")?.value || "0.25"
      ),
      // Line primitive parameters
      lineQuadrance: parseFloat(
        document.getElementById("lineQuadrance")?.value || "1"
      ),
      lineLength: parseFloat(
        document.getElementById("lineLength")?.value || "1"
      ),
      lineWeight: parseInt(document.getElementById("lineWeight")?.value || "2"),
      // Polygon primitive parameters
      polygonSides: parseInt(
        document.getElementById("polygonSides")?.value || "3"
      ),
      polygonQuadrance: parseFloat(
        document.getElementById("polygonQuadrance")?.value || "1"
      ),
      polygonRadius: parseFloat(
        document.getElementById("polygonRadius")?.value || "1"
      ),
      polygonEdgeWeight: parseInt(
        document.getElementById("polygonEdgeWeight")?.value || "2"
      ),
      polygonShowFace:
        document.getElementById("polygonShowFace")?.checked !== false,
      // Prism primitive parameters
      prismSides: parseInt(document.getElementById("prismSides")?.value || "6"),
      prismBaseQuadrance: parseFloat(
        document.getElementById("prismBaseQuadrance")?.value || "1"
      ),
      prismBaseRadius: parseFloat(
        document.getElementById("prismBaseRadius")?.value || "1"
      ),
      prismHeightQuadrance: parseFloat(
        document.getElementById("prismHeightQuadrance")?.value || "1"
      ),
      prismHeight: parseFloat(
        document.getElementById("prismHeight")?.value || "1"
      ),
      prismShowFaces:
        document.getElementById("prismShowFaces")?.checked !== false,
      // Cone primitive parameters
      coneSides: parseInt(document.getElementById("coneSides")?.value || "6"),
      coneBaseQuadrance: parseFloat(
        document.getElementById("coneBaseQuadrance")?.value || "1"
      ),
      coneBaseRadius: parseFloat(
        document.getElementById("coneBaseRadius")?.value || "1"
      ),
      coneHeightQuadrance: parseFloat(
        document.getElementById("coneHeightQuadrance")?.value || "1"
      ),
      coneHeight: parseFloat(
        document.getElementById("coneHeight")?.value || "1"
      ),
      coneShowFaces:
        document.getElementById("coneShowFaces")?.checked !== false,
      // Tetrahelix 1 parameters (toroidal, left-handed)
      tetrahelix1Count: parseInt(
        document.getElementById("tetrahelix1CountSlider")?.value || "10"
      ),
      tetrahelix1StartFace:
        document.querySelector('input[name="tetrahelix1StartFace"]:checked')
          ?.value || "A",
      // Tetrahelix 2 parameters (linear with multi-strand)
      tetrahelix2Count: parseInt(
        document.getElementById("tetrahelix2CountSlider")?.value || "10"
      ),
      tetrahelix2StartFace:
        document.querySelector('input[name="tetrahelix2StartFace"]:checked')
          ?.value || "A",
      tetrahelix2Strands: parseInt(
        document.querySelector('input[name="tetrahelix2Strands"]:checked')
          ?.value || "1"
      ),
      tetrahelix2BondMode:
        document.querySelector('input[name="tetrahelix2BondMode"]:checked')
          ?.value || "zipped",
      // Per-strand exit face selection
      tetrahelix2ExitA: parseInt(
        document.querySelector('input[name="tetrahelix2ExitA"]:checked')
          ?.value || "0"
      ),
      tetrahelix2ExitB: parseInt(
        document.querySelector('input[name="tetrahelix2ExitB"]:checked')
          ?.value || "0"
      ),
      tetrahelix2ExitC: parseInt(
        document.querySelector('input[name="tetrahelix2ExitC"]:checked')
          ?.value || "0"
      ),
      tetrahelix2ExitD: parseInt(
        document.querySelector('input[name="tetrahelix2ExitD"]:checked')
          ?.value || "0"
      ),
      // Tetrahelix 3 parameters (octahedral seed)
      tetrahelix3Count: parseInt(
        document.getElementById("tetrahelix3CountSlider")?.value || "10"
      ),
      tetrahelix3StartFace:
        document.querySelector('input[name="tetrahelix3StartFace"]:checked')
          ?.value || "A",
      tetrahelix3Strands: parseInt(
        document.querySelector('input[name="tetrahelix3Strands"]:checked')
          ?.value || "1"
      ),
      tetrahelix3BondMode:
        document.querySelector('input[name="tetrahelix3BondMode"]:checked')
          ?.value || "zipped",
      // Planar matrix size sliders
      cubeMatrixSizeSlider: parseInt(
        document.getElementById("cubeMatrixSizeSlider")?.value || "1"
      ),
      tetMatrixSizeSlider: parseInt(
        document.getElementById("tetMatrixSizeSlider")?.value || "1"
      ),
      octaMatrixSizeSlider: parseInt(
        document.getElementById("octaMatrixSizeSlider")?.value || "1"
      ),
      cuboctaMatrixSizeSlider: parseInt(
        document.getElementById("cuboctaMatrixSizeSlider")?.value || "1"
      ),
      rhombicDodecMatrixSizeSlider: parseInt(
        document.getElementById("rhombicDodecMatrixSizeSlider")?.value || "1"
      ),
      // Radial matrix frequency sliders
      radialCubeFreqSlider: parseInt(
        document.getElementById("radialCubeFreqSlider")?.value || "1"
      ),
      radialRhombicDodecFreqSlider: parseInt(
        document.getElementById("radialRhombicDodecFreqSlider")?.value || "1"
      ),
      radialTetFreqSlider: parseInt(
        document.getElementById("radialTetFreqSlider")?.value || "1"
      ),
      radialOctFreqSlider: parseInt(
        document.getElementById("radialOctFreqSlider")?.value || "1"
      ),
      radialVEFreqSlider: parseInt(
        document.getElementById("radialVEFreqSlider")?.value || "1"
      ),
      // Geodesic frequency sliders
      geodesicTetraFrequency: parseInt(
        document.getElementById("geodesicTetraFrequency")?.value || "1"
      ),
      geodesicDualTetraFrequency: parseInt(
        document.getElementById("geodesicDualTetraFrequency")?.value || "1"
      ),
      geodesicOctaFrequency: parseInt(
        document.getElementById("geodesicOctaFrequency")?.value || "1"
      ),
      geodesicIcosaFrequency: parseInt(
        document.getElementById("geodesicIcosaFrequency")?.value || "1"
      ),
      geodesicDualIcosaFrequency: parseInt(
        document.getElementById("geodesicDualIcosaFrequency")?.value || "1"
      ),
    };

    // Get geodesic projection radio states
    const geodesicProjections = {
      geodesicTetraProjection:
        document.querySelector('input[name="geodesicTetraProjection"]:checked')
          ?.value || "out",
      geodesicDualTetraProjection:
        document.querySelector(
          'input[name="geodesicDualTetraProjection"]:checked'
        )?.value || "out",
      geodesicOctaProjection:
        document.querySelector('input[name="geodesicOctaProjection"]:checked')
          ?.value || "out",
      geodesicIcosaProjection:
        document.querySelector('input[name="geodesicIcosaProjection"]:checked')
          ?.value || "out",
      geodesicDualIcosaProjection:
        document.querySelector(
          'input[name="geodesicDualIcosaProjection"]:checked'
        )?.value || "out",
    };

    // Get active form state (legacy, kept for backwards compatibility)
    const formButtons = document.querySelectorAll(".form-btn");
    const activeFormButton = Array.from(formButtons).find(btn =>
      btn.classList.contains("active")
    );
    const activeForm = activeFormButton?.dataset.form || null;

    // Get form visibility states (legacy)
    const formStates = {};
    formButtons.forEach(btn => {
      const formType = btn.dataset.form;
      if (formType) {
        formStates[formType] = {
          visible: btn.classList.contains("active"),
          scale: 1.0, // Could be extended to track scale
        };
      }
    });

    // Build complete state object
    const stateData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      timestampMs: Date.now(),

      environment: {
        camera: cameraState,
        grids: {
          quadray: {
            visible: quadrayVisible,
            tessellation: quadrayTess,
          },
          cartesian: {
            visible: cartesianVisible,
            tessellation: cartesianTess,
          },
        },
        // Polyhedra checkbox states (forms at origin)
        polyhedraCheckboxes: polyhedraCheckboxes,
        // Slider values (scale, opacity, matrix sizes, frequencies)
        sliderValues: sliderValues,
        // Geodesic projection radio states (out/flat/in)
        geodesicProjections: geodesicProjections,
        // Legacy form states (kept for backwards compatibility)
        forms: formStates,
        activeForm: activeForm,
        // Color palette and environment backgrounds
        colorPalette: this.stateManager.getColorPalette(),
        canvasBackground: this.stateManager.state.environment.canvasBackground,
        uiBackground: this.stateManager.state.environment.uiBackground,
      },

      instances: this.stateManager.state.instances.map(instance => ({
        id: instance.id,
        timestamp: instance.timestamp,
        type: instance.type,
        parameters: instance.parameters, // Geodesic frequency/projection, Quadray wxyz, etc.
        transform: instance.transform,
        appearance: instance.appearance,
        metadata: instance.metadata,
      })),

      metadata: {
        depositedCount: this.stateManager.state.depositedCount,
        instanceCount: this.stateManager.state.instances.length,
      },

      // Include saved views from RTViewManager (if available)
      views: window.RTViewManager?.state?.views || [],
    };

    return stateData;
  },

  /**
   * Export state to JSON file with download
   * @param {string} filename - Optional custom filename
   */
  exportStateToFile(filename) {
    const stateData = this.exportState();
    const jsonString = JSON.stringify(stateData, null, 2);

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const finalFilename = filename || `art-scene-${timestamp}.json`;

    // Create download
    this.downloadFile(jsonString, finalFilename, "application/json");

    // Mark state as saved (resets modification counter)
    this.stateManager.markAsSaved();

    console.log(`✅ State exported to ${finalFilename}`);
    return stateData;
  },

  /**
   * Import state from JSON object
   * @param {Object} stateData - State object to import
   * @returns {Promise<boolean>} Success status
   */
  async importState(stateData) {
    try {
      // Validate state data
      if (!stateData || !stateData.version) {
        throw new Error("Invalid state data: missing version");
      }

      if (stateData.version !== "1.0") {
        console.warn(
          `⚠️ State version mismatch: ${stateData.version} (expected 1.0)`
        );
      }

      // Clear existing scene
      this.stateManager.clearAll(this.scene);

      // Restore camera
      if (stateData.environment?.camera) {
        const cam = stateData.environment.camera;
        this.camera.position.set(
          cam.position.x,
          cam.position.y,
          cam.position.z
        );
        if (cam.rotation) {
          this.camera.rotation.set(
            cam.rotation.x,
            cam.rotation.y,
            cam.rotation.z
          );
        }
        if (cam.zoom) {
          this.camera.zoom = cam.zoom;
          this.camera.updateProjectionMatrix();
        }
      }

      // Restore grid states
      if (stateData.environment?.grids) {
        const grids = stateData.environment.grids;

        if (grids.quadray) {
          const checkbox = document.getElementById("quadray-checkbox");
          const slider = document.getElementById("quadrayTessSlider");
          if (checkbox) checkbox.checked = grids.quadray.visible;
          if (slider) slider.value = grids.quadray.tessellation;
        }

        if (grids.cartesian) {
          const checkbox = document.getElementById("cartesian-checkbox");
          const slider = document.getElementById("cartesianTessSlider");
          if (checkbox) checkbox.checked = grids.cartesian.visible;
          if (slider) slider.value = grids.cartesian.tessellation;
        }

        // Trigger grid rebuild
        const rebuildEvent = new Event("change");
        document
          .getElementById("quadray-checkbox")
          ?.dispatchEvent(rebuildEvent);
        document
          .getElementById("cartesian-checkbox")
          ?.dispatchEvent(rebuildEvent);
      }

      // Restore slider values FIRST (before checkboxes, so geometry uses correct values)
      if (stateData.environment?.sliderValues) {
        const sliders = stateData.environment.sliderValues;

        // Scale and opacity sliders
        if (sliders.scaleSlider !== undefined) {
          const el = document.getElementById("scaleSlider");
          if (el) el.value = sliders.scaleSlider;
        }
        if (sliders.tetScaleSlider !== undefined) {
          const el = document.getElementById("tetScaleSlider");
          if (el) el.value = sliders.tetScaleSlider;
        }
        if (sliders.opacitySlider !== undefined) {
          const el = document.getElementById("opacitySlider");
          if (el) el.value = sliders.opacitySlider;
        }
        if (sliders.nodeOpacitySlider !== undefined) {
          const el = document.getElementById("nodeOpacitySlider");
          if (el) el.value = sliders.nodeOpacitySlider;
        }
        // Line primitive parameters
        if (sliders.lineQuadrance !== undefined) {
          const el = document.getElementById("lineQuadrance");
          if (el) el.value = sliders.lineQuadrance;
        }
        if (sliders.lineLength !== undefined) {
          const el = document.getElementById("lineLength");
          if (el) el.value = sliders.lineLength;
        }
        if (sliders.lineWeight !== undefined) {
          const el = document.getElementById("lineWeight");
          const valEl = document.getElementById("lineWeightValue");
          if (el) el.value = sliders.lineWeight;
          if (valEl) valEl.textContent = sliders.lineWeight;
        }
        // Polygon primitive parameters
        if (sliders.polygonSides !== undefined) {
          const el = document.getElementById("polygonSides");
          if (el) el.value = sliders.polygonSides;
        }
        if (sliders.polygonQuadrance !== undefined) {
          const el = document.getElementById("polygonQuadrance");
          if (el) el.value = sliders.polygonQuadrance;
        }
        if (sliders.polygonRadius !== undefined) {
          const el = document.getElementById("polygonRadius");
          if (el) el.value = sliders.polygonRadius;
        }
        if (sliders.polygonEdgeWeight !== undefined) {
          const el = document.getElementById("polygonEdgeWeight");
          const valEl = document.getElementById("polygonEdgeWeightValue");
          if (el) el.value = sliders.polygonEdgeWeight;
          if (valEl) valEl.textContent = sliders.polygonEdgeWeight;
        }
        if (sliders.polygonShowFace !== undefined) {
          const el = document.getElementById("polygonShowFace");
          if (el) el.checked = sliders.polygonShowFace;
        }
        // Prism primitive parameters
        if (sliders.prismSides !== undefined) {
          const el = document.getElementById("prismSides");
          if (el) el.value = sliders.prismSides;
        }
        if (sliders.prismBaseQuadrance !== undefined) {
          const el = document.getElementById("prismBaseQuadrance");
          if (el) el.value = sliders.prismBaseQuadrance;
        }
        if (sliders.prismBaseRadius !== undefined) {
          const el = document.getElementById("prismBaseRadius");
          if (el) el.value = sliders.prismBaseRadius;
        }
        if (sliders.prismHeightQuadrance !== undefined) {
          const el = document.getElementById("prismHeightQuadrance");
          if (el) el.value = sliders.prismHeightQuadrance;
        }
        if (sliders.prismHeight !== undefined) {
          const el = document.getElementById("prismHeight");
          if (el) el.value = sliders.prismHeight;
        }
        if (sliders.prismShowFaces !== undefined) {
          const el = document.getElementById("prismShowFaces");
          if (el) el.checked = sliders.prismShowFaces;
        }
        // Cone primitive parameters
        if (sliders.coneSides !== undefined) {
          const el = document.getElementById("coneSides");
          if (el) el.value = sliders.coneSides;
        }
        if (sliders.coneBaseQuadrance !== undefined) {
          const el = document.getElementById("coneBaseQuadrance");
          if (el) el.value = sliders.coneBaseQuadrance;
        }
        if (sliders.coneBaseRadius !== undefined) {
          const el = document.getElementById("coneBaseRadius");
          if (el) el.value = sliders.coneBaseRadius;
        }
        if (sliders.coneHeightQuadrance !== undefined) {
          const el = document.getElementById("coneHeightQuadrance");
          if (el) el.value = sliders.coneHeightQuadrance;
        }
        if (sliders.coneHeight !== undefined) {
          const el = document.getElementById("coneHeight");
          if (el) el.value = sliders.coneHeight;
        }
        if (sliders.coneShowFaces !== undefined) {
          const el = document.getElementById("coneShowFaces");
          if (el) el.checked = sliders.coneShowFaces;
        }
        // Tetrahelix 1 parameters
        if (sliders.tetrahelix1Count !== undefined) {
          const slider = document.getElementById("tetrahelix1CountSlider");
          const display = document.getElementById("tetrahelix1CountDisplay");
          if (slider) slider.value = sliders.tetrahelix1Count;
          if (display) display.textContent = sliders.tetrahelix1Count;
        }
        if (sliders.tetrahelix1StartFace !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix1StartFace"][value="${sliders.tetrahelix1StartFace}"]`
          );
          if (radio) radio.checked = true;
        }
        // Tetrahelix 2 parameters
        if (sliders.tetrahelix2Count !== undefined) {
          const slider = document.getElementById("tetrahelix2CountSlider");
          const display = document.getElementById("tetrahelix2CountDisplay");
          if (slider) slider.value = sliders.tetrahelix2Count;
          if (display) display.textContent = sliders.tetrahelix2Count;
        }
        if (sliders.tetrahelix2StartFace !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix2StartFace"][value="${sliders.tetrahelix2StartFace}"]`
          );
          if (radio) radio.checked = true;
        }
        if (sliders.tetrahelix2Strands !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix2Strands"][value="${sliders.tetrahelix2Strands}"]`
          );
          if (radio) radio.checked = true;
        }
        if (sliders.tetrahelix2BondMode !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix2BondMode"][value="${sliders.tetrahelix2BondMode}"]`
          );
          if (radio) radio.checked = true;
        }
        // Per-strand exit face selection
        if (sliders.tetrahelix2ExitA !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix2ExitA"][value="${sliders.tetrahelix2ExitA}"]`
          );
          if (radio) radio.checked = true;
        }
        if (sliders.tetrahelix2ExitB !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix2ExitB"][value="${sliders.tetrahelix2ExitB}"]`
          );
          if (radio) radio.checked = true;
        }
        if (sliders.tetrahelix2ExitC !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix2ExitC"][value="${sliders.tetrahelix2ExitC}"]`
          );
          if (radio) radio.checked = true;
        }
        if (sliders.tetrahelix2ExitD !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix2ExitD"][value="${sliders.tetrahelix2ExitD}"]`
          );
          if (radio) radio.checked = true;
        }
        // Tetrahelix 3 parameters
        if (sliders.tetrahelix3Count !== undefined) {
          const slider = document.getElementById("tetrahelix3CountSlider");
          const display = document.getElementById("tetrahelix3CountDisplay");
          if (slider) slider.value = sliders.tetrahelix3Count;
          if (display) display.textContent = sliders.tetrahelix3Count;
        }
        if (sliders.tetrahelix3StartFace !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix3StartFace"][value="${sliders.tetrahelix3StartFace}"]`
          );
          if (radio) radio.checked = true;
        }
        if (sliders.tetrahelix3Strands !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix3Strands"][value="${sliders.tetrahelix3Strands}"]`
          );
          if (radio) radio.checked = true;
        }
        if (sliders.tetrahelix3BondMode !== undefined) {
          const radio = document.querySelector(
            `input[name="tetrahelix3BondMode"][value="${sliders.tetrahelix3BondMode}"]`
          );
          if (radio) radio.checked = true;
        }
        // Planar matrix size sliders
        if (sliders.cubeMatrixSizeSlider !== undefined) {
          const el = document.getElementById("cubeMatrixSizeSlider");
          if (el) el.value = sliders.cubeMatrixSizeSlider;
        }
        if (sliders.tetMatrixSizeSlider !== undefined) {
          const el = document.getElementById("tetMatrixSizeSlider");
          if (el) el.value = sliders.tetMatrixSizeSlider;
        }
        if (sliders.octaMatrixSizeSlider !== undefined) {
          const el = document.getElementById("octaMatrixSizeSlider");
          if (el) el.value = sliders.octaMatrixSizeSlider;
        }
        if (sliders.cuboctaMatrixSizeSlider !== undefined) {
          const el = document.getElementById("cuboctaMatrixSizeSlider");
          if (el) el.value = sliders.cuboctaMatrixSizeSlider;
        }
        if (sliders.rhombicDodecMatrixSizeSlider !== undefined) {
          const el = document.getElementById("rhombicDodecMatrixSizeSlider");
          if (el) el.value = sliders.rhombicDodecMatrixSizeSlider;
        }
        // Radial matrix frequency sliders
        if (sliders.radialCubeFreqSlider !== undefined) {
          const el = document.getElementById("radialCubeFreqSlider");
          if (el) el.value = sliders.radialCubeFreqSlider;
        }
        if (sliders.radialRhombicDodecFreqSlider !== undefined) {
          const el = document.getElementById("radialRhombicDodecFreqSlider");
          if (el) el.value = sliders.radialRhombicDodecFreqSlider;
        }
        if (sliders.radialTetFreqSlider !== undefined) {
          const el = document.getElementById("radialTetFreqSlider");
          if (el) el.value = sliders.radialTetFreqSlider;
        }
        if (sliders.radialOctFreqSlider !== undefined) {
          const el = document.getElementById("radialOctFreqSlider");
          if (el) el.value = sliders.radialOctFreqSlider;
        }
        if (sliders.radialVEFreqSlider !== undefined) {
          const el = document.getElementById("radialVEFreqSlider");
          if (el) el.value = sliders.radialVEFreqSlider;
        }
        // Geodesic frequency sliders
        if (sliders.geodesicTetraFrequency !== undefined) {
          const el = document.getElementById("geodesicTetraFrequency");
          if (el) el.value = sliders.geodesicTetraFrequency;
        }
        if (sliders.geodesicDualTetraFrequency !== undefined) {
          const el = document.getElementById("geodesicDualTetraFrequency");
          if (el) el.value = sliders.geodesicDualTetraFrequency;
        }
        if (sliders.geodesicOctaFrequency !== undefined) {
          const el = document.getElementById("geodesicOctaFrequency");
          if (el) el.value = sliders.geodesicOctaFrequency;
        }
        if (sliders.geodesicIcosaFrequency !== undefined) {
          const el = document.getElementById("geodesicIcosaFrequency");
          if (el) el.value = sliders.geodesicIcosaFrequency;
        }
        if (sliders.geodesicDualIcosaFrequency !== undefined) {
          const el = document.getElementById("geodesicDualIcosaFrequency");
          if (el) el.value = sliders.geodesicDualIcosaFrequency;
        }
      }

      // Restore geodesic projection radio states
      if (stateData.environment?.geodesicProjections) {
        const projections = stateData.environment.geodesicProjections;

        // Helper to set radio by name and value
        const setRadio = (name, value) => {
          const radio = document.querySelector(
            `input[name="${name}"][value="${value}"]`
          );
          if (radio) radio.checked = true;
        };

        if (projections.geodesicTetraProjection) {
          setRadio(
            "geodesicTetraProjection",
            projections.geodesicTetraProjection
          );
        }
        if (projections.geodesicDualTetraProjection) {
          setRadio(
            "geodesicDualTetraProjection",
            projections.geodesicDualTetraProjection
          );
        }
        if (projections.geodesicOctaProjection) {
          setRadio(
            "geodesicOctaProjection",
            projections.geodesicOctaProjection
          );
        }
        if (projections.geodesicIcosaProjection) {
          setRadio(
            "geodesicIcosaProjection",
            projections.geodesicIcosaProjection
          );
        }
        if (projections.geodesicDualIcosaProjection) {
          setRadio(
            "geodesicDualIcosaProjection",
            projections.geodesicDualIcosaProjection
          );
        }
      }

      // Restore polyhedra checkbox states (forms at origin)
      if (stateData.environment?.polyhedraCheckboxes) {
        const checkboxes = stateData.environment.polyhedraCheckboxes;
        Object.keys(checkboxes).forEach(checkboxId => {
          const el = document.getElementById(checkboxId);
          if (el) {
            el.checked = checkboxes[checkboxId];
          }
        });

        // Show/hide Line controls based on checkbox state
        const lineControls = document.getElementById("line-controls");
        if (lineControls && checkboxes.showLine) {
          lineControls.style.display = "block";
        }

        // Show/hide Polygon controls based on checkbox state
        const polygonControls = document.getElementById("polygon-controls");
        if (polygonControls && checkboxes.showPolygon) {
          polygonControls.style.display = "block";
        }

        // Show/hide Prism controls based on checkbox state
        const prismControls = document.getElementById("prism-controls");
        if (prismControls && checkboxes.showPrism) {
          prismControls.style.display = "block";
        }

        // Show/hide Cone controls based on checkbox state
        const coneControls = document.getElementById("cone-controls");
        if (coneControls && checkboxes.showCone) {
          coneControls.style.display = "block";
        }

        // Show/hide Tetrahelix 1 controls based on checkbox state
        const tetrahelix1Controls = document.getElementById(
          "tetrahelix1-controls"
        );
        if (tetrahelix1Controls && checkboxes.showTetrahelix1) {
          tetrahelix1Controls.style.display = "block";
        }

        // Show/hide Tetrahelix 2 controls based on checkbox state
        const tetrahelix2Controls = document.getElementById(
          "tetrahelix2-controls"
        );
        if (tetrahelix2Controls && checkboxes.showTetrahelix2) {
          tetrahelix2Controls.style.display = "block";
        }

        // Show/hide Tetrahelix 3 controls based on checkbox state
        const tetrahelix3Controls = document.getElementById(
          "tetrahelix3-controls"
        );
        if (tetrahelix3Controls && checkboxes.showTetrahelix3) {
          tetrahelix3Controls.style.display = "block";
        }

        // Trigger updateGeometry to render the restored forms
        if (window.renderingAPI?.updateGeometry) {
          window.renderingAPI.updateGeometry();
        }
      }

      // Restore color palette (environment settings)
      if (stateData.environment?.colorPalette) {
        const colorPalette = stateData.environment.colorPalette;

        // Save to StateManager
        this.stateManager.setColorPalette(colorPalette);

        // Apply colors via rendering API if available
        if (window.renderingAPI) {
          Object.keys(colorPalette).forEach(polyType => {
            window.renderingAPI.updatePolyhedronColor(
              polyType,
              colorPalette[polyType]
            );
          });
        }

        // Save to localStorage for session persistence
        try {
          localStorage.setItem(
            "artexplorer-color-palette",
            JSON.stringify(colorPalette)
          );
        } catch (e) {
          console.warn("Could not save color palette to localStorage:", e);
        }
      }

      // Restore environment backgrounds
      if (
        stateData.environment?.canvasBackground ||
        stateData.environment?.uiBackground
      ) {
        const envSettings = {
          canvasBackground: stateData.environment.canvasBackground,
          uiBackground: stateData.environment.uiBackground,
        };

        // Save to StateManager
        this.stateManager.setEnvironmentBackgrounds(
          envSettings.canvasBackground,
          envSettings.uiBackground
        );

        // Apply via colorTheoryModal if available
        if (window.colorTheoryModal) {
          window.colorTheoryModal.importEnvironment(envSettings);
        } else {
          // Apply directly if modal not available
          if (
            envSettings.canvasBackground &&
            window.renderingAPI?.setCanvasBackground
          ) {
            const colorHex = parseInt(
              envSettings.canvasBackground.replace("0x", ""),
              16
            );
            window.renderingAPI.setCanvasBackground(colorHex);
          }
        }

        console.log("✅ Environment backgrounds restored");
      }

      // Restore instances
      if (stateData.instances && Array.isArray(stateData.instances)) {
        // Check if renderingAPI is available with createPolyhedronByType
        if (!window.renderingAPI?.createPolyhedronByType) {
          console.warn(
            "⚠️ renderingAPI.createPolyhedronByType not available - instances not restored"
          );
        } else {
          // Matrix types that require async creation
          const matrixTypes = [
            "cubeMatrix",
            "tetMatrix",
            "octaMatrix",
            "cuboctaMatrix",
            "rhombicDodecMatrix",
            "radialCubeMatrix",
            "radialRhombicDodecMatrix",
            "radialTetMatrix",
            "radialOctMatrix",
            "radialVEMatrix",
          ];

          let restoredCount = 0;
          let failedCount = 0;

          // Map old instance IDs to new instance IDs (for connectedLine endpoint resolution)
          const instanceIdMap = new Map();

          // Sort instances: Points first, then connectedLines last
          // This ensures endpoints exist before we try to restore connections
          const sortedInstances = [...stateData.instances].sort((a, b) => {
            if (a.type === "connectedLine" && b.type !== "connectedLine")
              return 1;
            if (a.type !== "connectedLine" && b.type === "connectedLine")
              return -1;
            return 0;
          });

          // ----------------------------------------------------------------
          // Helper: Restore a connectedLine by recreating the connection
          // ----------------------------------------------------------------
          const restoreConnectedLine = (instanceData, instanceIdMap) => {
            const { startPoint, endPoint } = instanceData.parameters || {};
            if (!startPoint || !endPoint) {
              console.warn(
                `⚠️ connectedLine missing endpoint IDs: ${instanceData.id}`
              );
              return false;
            }

            if (!window.RTStateManager) {
              console.warn(
                "⚠️ RTStateManager not available for connectedLine restore"
              );
              return false;
            }

            // Map old endpoint IDs to new IDs
            const newStartId = instanceIdMap.get(startPoint);
            const newEndId = instanceIdMap.get(endPoint);

            if (!newStartId || !newEndId) {
              console.warn(
                `⚠️ connectedLine endpoint mapping not found: ${startPoint} → ${newStartId}, ${endPoint} → ${newEndId}`
              );
              return false;
            }

            const startInst = window.RTStateManager.getInstance(newStartId);
            const endInst = window.RTStateManager.getInstance(newEndId);

            if (!startInst || !endInst) {
              console.warn(
                `⚠️ connectedLine endpoints not found: ${newStartId}, ${newEndId}`
              );
              return false;
            }

            // Recreate the connection using existing connectPoints with NEW IDs
            const lineInstance = window.RTStateManager.connectPoints(
              newStartId,
              newEndId,
              window.renderingAPI.getScene()
            );

            if (lineInstance) {
              console.log(
                `  ✅ Restored: connectedLine ${newStartId} ↔ ${newEndId}`
              );
              return true;
            } else {
              console.warn(
                `⚠️ Failed to restore connectedLine: ${instanceData.id}`
              );
              return false;
            }
          };

          // ----------------------------------------------------------------
          // Helper: Build creation options from instance parameters
          // ----------------------------------------------------------------
          const buildCreationOptions = instanceData => {
            const options = {
              opacity: instanceData.appearance?.opacity ?? 0.25,
            };

            if (!instanceData.parameters) return options;

            const params = instanceData.parameters;

            // Geodesic parameters
            if (params.frequency !== undefined)
              options.frequency = params.frequency;
            if (params.projection !== undefined)
              options.projection = params.projection;

            // Matrix parameters
            if (params.matrixSize !== undefined)
              options.matrixSize = params.matrixSize;
            if (params.rotate45 !== undefined)
              options.rotate45 = params.rotate45;

            // Quadray parameters (preserves native WXYZ coordinates)
            if (params.normalize !== undefined)
              options.normalize = params.normalize;
            if (params.zStretch !== undefined)
              options.zStretch = params.zStretch;
            if (params.wxyz !== undefined) options.wxyz = params.wxyz;

            // Primitive parameters (polygon, prism, cone)
            if (params.sides !== undefined) options.sides = params.sides;
            if (params.baseQuadrance !== undefined)
              options.baseQuadrance = params.baseQuadrance;
            if (params.heightQuadrance !== undefined)
              options.heightQuadrance = params.heightQuadrance;
            if (params.showFaces !== undefined)
              options.showFaces = params.showFaces;

            // Polygon-specific parameters
            if (params.quadrance !== undefined)
              options.quadrance = params.quadrance;
            if (params.showFace !== undefined)
              options.showFace = params.showFace;
            if (params.edgeWeight !== undefined)
              options.edgeWeight = params.edgeWeight;

            return options;
          };

          // ----------------------------------------------------------------
          // Helper: Restore a standard polyhedron (non-connectedLine)
          // ----------------------------------------------------------------
          const restoreStandardPolyhedron = async (
            instanceData,
            instanceIdMap,
            matrixTypes,
            stateManager,
            scene
          ) => {
            const options = buildCreationOptions(instanceData);

            // Create polyhedron group from type (async for matrices, sync for others)
            let polyhedronGroup;
            if (matrixTypes.includes(instanceData.type)) {
              if (window.renderingAPI?.createPolyhedronByTypeAsync) {
                polyhedronGroup =
                  await window.renderingAPI.createPolyhedronByTypeAsync(
                    instanceData.type,
                    options
                  );
              } else {
                console.warn(
                  `⚠️ createPolyhedronByTypeAsync not available for matrix type: ${instanceData.type}`
                );
                return false;
              }
            } else {
              polyhedronGroup = window.renderingAPI.createPolyhedronByType(
                instanceData.type,
                options
              );
            }

            if (!polyhedronGroup) {
              console.warn(
                `⚠️ Failed to create polyhedron of type: ${instanceData.type}`
              );
              return false;
            }

            // Apply saved transform
            if (instanceData.transform) {
              const { position, rotation, scale } = instanceData.transform;

              if (position) {
                polyhedronGroup.position.set(
                  position.x ?? 0,
                  position.y ?? 0,
                  position.z ?? 0
                );
              }

              if (rotation) {
                polyhedronGroup.rotation.set(
                  rotation.x ?? 0,
                  rotation.y ?? 0,
                  rotation.z ?? 0
                );
              }

              if (scale) {
                polyhedronGroup.scale.set(
                  scale.x ?? 1,
                  scale.y ?? 1,
                  scale.z ?? 1
                );
              }
            }

            // Set visibility
            if (instanceData.appearance?.visible !== undefined) {
              polyhedronGroup.visible = instanceData.appearance.visible;
            }

            // Register as instance via StateManager
            // Use skipClone: true since geometry was freshly created for import
            const restoredInstance = stateManager.createInstance(
              polyhedronGroup,
              scene,
              { skipClone: true }
            );

            if (restoredInstance) {
              // Store mapping from old ID to new ID (for connectedLine endpoint resolution)
              if (instanceData.id && restoredInstance.id) {
                instanceIdMap.set(instanceData.id, restoredInstance.id);
              }

              console.log(
                `  ✅ Restored: ${instanceData.type} at (${instanceData.transform?.position?.x?.toFixed(2) ?? 0}, ${instanceData.transform?.position?.y?.toFixed(2) ?? 0}, ${instanceData.transform?.position?.z?.toFixed(2) ?? 0})`
              );
              return true;
            }
            return false;
          };

          // ----------------------------------------------------------------
          // Main dispatcher: Restore a single instance
          // ----------------------------------------------------------------
          const restoreInstance = async instanceData => {
            if (instanceData.type === "connectedLine") {
              return restoreConnectedLine(instanceData, instanceIdMap);
            }
            return restoreStandardPolyhedron(
              instanceData,
              instanceIdMap,
              matrixTypes,
              this.stateManager,
              this.scene
            );
          };

          // Restore all instances (handles both sync and async types)
          // Uses sortedInstances to ensure Points are restored before connectedLines
          for (const instanceData of sortedInstances) {
            try {
              const success = await restoreInstance(instanceData);
              if (success) {
                restoredCount++;
              } else {
                failedCount++;
              }
            } catch (error) {
              console.error(
                `❌ Failed to restore instance ${instanceData.id}:`,
                error
              );
              failedCount++;
            }
          }

          console.log(
            `📦 Instance restoration complete: ${restoredCount} restored, ${failedCount} failed`
          );
        }
      }

      // Restore saved views (if RTViewManager is available)
      if (
        stateData.views &&
        Array.isArray(stateData.views) &&
        window.RTViewManager
      ) {
        window.RTViewManager.state.views = stateData.views;
        // Restore view counters from imported views
        if (stateData.views.length > 0) {
          // Reset counters
          const counters = window.RTViewManager.state.counters;
          Object.keys(counters).forEach(key => (counters[key] = 0));

          // Update counters based on imported view names
          stateData.views.forEach(view => {
            const axisCode = view.axisCode || view.name.replace(/\d+$/, "");
            const number = parseInt(view.name.match(/\d+$/)?.[0] || "0", 10);
            if (
              counters[axisCode] !== undefined &&
              number > counters[axisCode]
            ) {
              counters[axisCode] = number;
            }
          });
        }
        window.RTViewManager.renderViewsTable();
        console.log(`📐 Views restored: ${stateData.views.length} views`);
      }

      console.log("✅ State imported successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to import state:", error);
      return false;
    }
  },

  /**
   * Import state from JSON file
   * @param {File} file - File object from input
   * @returns {Promise<boolean>} Success status
   */
  async importStateFromFile(file) {
    try {
      const text = await file.text();
      const stateData = JSON.parse(text);
      return this.importState(stateData);
    } catch (error) {
      console.error("❌ Failed to parse JSON file:", error);
      return false;
    }
  },

  // ========================================================================
  // GLTF EXPORT
  // ========================================================================

  /**
   * Export scene to glTF format
   * @param {Object} options - Export options
   * @param {boolean} options.binary - Export as .glb (true) or .gltf (false)
   * @param {boolean} options.includeGrids - Include grid geometry
   * @param {boolean} options.includeGumball - Include gumball handles
   * @param {string} options.filename - Optional custom filename
   */
  async exportGLTF(options = {}) {
    const {
      binary = true,
      includeGrids = false,
      _includeGumball = false,
      filename = null,
    } = options;

    try {
      // Import GLTFExporter dynamically
      const { GLTFExporter } =
        await import("https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/exporters/GLTFExporter.js");

      const exporter = new GLTFExporter();

      // Collect objects to export
      const exportGroup = new THREE.Group();

      // Add all deposited instances
      this.stateManager.state.instances.forEach(instance => {
        if (instance.threeObject) {
          const clone = instance.threeObject.clone();
          exportGroup.add(clone);
        }
      });

      // Optionally include grids
      if (includeGrids) {
        // Find grid objects in scene
        const cartesianGrid = this.scene.getObjectByName("cartesianGrid");
        const quadrayBasis = this.scene.getObjectByName("quadrayBasis");
        const ivmPlanes = this.scene.getObjectByName("ivmPlanes");

        if (cartesianGrid) exportGroup.add(cartesianGrid.clone());
        if (quadrayBasis) exportGroup.add(quadrayBasis.clone());
        if (ivmPlanes) exportGroup.add(ivmPlanes.clone());
      }

      // Export options
      const exportOptions = {
        binary: binary,
        trs: true, // Export separate translate/rotate/scale
        onlyVisible: true,
        truncateDrawRange: true,
        includeCustomExtensions: true,
      };

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const extension = binary ? "glb" : "gltf";
      const finalFilename = filename || `art-scene-${timestamp}.${extension}`;

      // Export
      exporter.parse(
        exportGroup,
        result => {
          if (binary) {
            // Binary .glb format
            const blob = new Blob([result], {
              type: "application/octet-stream",
            });
            this.downloadBlob(blob, finalFilename);
          } else {
            // JSON .gltf format
            const output = JSON.stringify(result, null, 2);
            this.downloadFile(output, finalFilename, "application/json");
          }

          console.log(`✅ glTF exported to ${finalFilename}`);
        },
        error => {
          console.error("❌ glTF export failed:", error);
        },
        exportOptions
      );
    } catch (error) {
      console.error("❌ Failed to load GLTFExporter:", error);
    }
  },

  // ========================================================================
  // CSV EXPORT
  // ========================================================================

  /**
   * Export instances to CSV file
   * @param {string} filename - Optional custom filename
   */
  exportCSVToFile(filename) {
    const csvString = this.stateManager.exportCSV();

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const finalFilename = filename || `art-instances-${timestamp}.csv`;

    // Create download
    this.downloadFile(csvString, finalFilename, "text/csv");

    console.log(`✅ CSV exported to ${finalFilename}`);
  },

  // ========================================================================
  // AUTO-SAVE (LocalStorage - Modification-Based)
  // ========================================================================

  /**
   * Save current state to localStorage (triggered by modifications)
   */
  autoSave() {
    try {
      const stateData = this.exportState();
      const jsonString = JSON.stringify(stateData);

      // Save to localStorage
      localStorage.setItem(this.config.autoSaveKey, jsonString);
      this.state.lastSaveTimestamp = Date.now();

      // Maintain save history
      this.addToSaveHistory(stateData);

      // Mark state as saved in StateManager (resets modification counter)
      this.stateManager.markAsSaved();

      const unsavedCount = this.stateManager.getUnsavedChanges();
      console.log(
        `💾 Auto-saved at ${new Date().toLocaleTimeString()} (${unsavedCount} unsaved changes)`
      );
    } catch (error) {
      console.error("❌ Auto-save failed:", error);
    }
  },

  /**
   * Load auto-saved state from localStorage
   * @returns {boolean} Success status
   */
  async loadAutoSave() {
    try {
      const jsonString = localStorage.getItem(this.config.autoSaveKey);
      if (!jsonString) {
        console.log("💾 No auto-save found");
        return false;
      }

      const stateData = JSON.parse(jsonString);
      return await this.importState(stateData);
    } catch (error) {
      console.error("❌ Failed to load auto-save:", error);
      return false;
    }
  },

  /**
   * Clear auto-save from localStorage
   */
  clearAutoSave() {
    localStorage.removeItem(this.config.autoSaveKey);
    console.log("💾 Auto-save cleared");
  },

  /**
   * Add state to save history
   * @param {Object} stateData - State to save
   */
  addToSaveHistory(stateData) {
    try {
      const historyKey = `${this.config.autoSaveKey}-history`;
      const historyString = localStorage.getItem(historyKey);
      const history = historyString ? JSON.parse(historyString) : [];

      // Add new save
      history.push({
        timestamp: stateData.timestamp,
        timestampMs: stateData.timestampMs,
        instanceCount: stateData.instances.length,
      });

      // Keep only last N saves
      if (history.length > this.config.maxAutoSaveHistory) {
        history.shift();
      }

      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
      console.error("❌ Failed to save history:", error);
    }
  },

  // ========================================================================
  // PRESET SYSTEM
  // ========================================================================

  /**
   * Save current state as a named preset
   * @param {string} presetName - Name for the preset
   * @returns {boolean} Success status
   */
  savePreset(presetName) {
    try {
      const stateData = this.exportState();
      const presetKey = `${this.config.presetKeyPrefix}${presetName}`;
      const jsonString = JSON.stringify(stateData);

      localStorage.setItem(presetKey, jsonString);
      console.log(`✅ Preset saved: ${presetName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save preset "${presetName}":`, error);
      return false;
    }
  },

  /**
   * Load a named preset
   * @param {string} presetName - Name of the preset to load
   * @returns {boolean} Success status
   */
  async loadPreset(presetName) {
    try {
      const presetKey = `${this.config.presetKeyPrefix}${presetName}`;
      const jsonString = localStorage.getItem(presetKey);

      if (!jsonString) {
        console.warn(`⚠️ Preset not found: ${presetName}`);
        return false;
      }

      const stateData = JSON.parse(jsonString);
      const success = await this.importState(stateData);

      if (success) {
        console.log(`✅ Preset loaded: ${presetName}`);
      }

      return success;
    } catch (error) {
      console.error(`❌ Failed to load preset "${presetName}":`, error);
      return false;
    }
  },

  /**
   * Delete a named preset
   * @param {string} presetName - Name of the preset to delete
   * @returns {boolean} Success status
   */
  deletePreset(presetName) {
    try {
      const presetKey = `${this.config.presetKeyPrefix}${presetName}`;
      localStorage.removeItem(presetKey);
      console.log(`✅ Preset deleted: ${presetName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete preset "${presetName}":`, error);
      return false;
    }
  },

  /**
   * Get list of all saved presets
   * @returns {Array<string>} Array of preset names
   */
  listPresets() {
    const presets = [];
    const prefix = this.config.presetKeyPrefix;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const presetName = key.substring(prefix.length);
        presets.push(presetName);
      }
    }

    return presets;
  },

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  /**
   * Download string as file
   * @param {string} content - File content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
  },

  /**
   * Download blob as file
   * @param {Blob} blob - Blob to download
   * @param {string} filename - Filename
   */
  downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    // Clean up
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  },

  /**
   * Create file input element for import
   * @param {Function} callback - Callback function with file parameter
   * @param {string} accept - File types to accept
   */
  createFileInput(callback, accept = ".json") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";

    input.addEventListener("change", event => {
      const file = event.target.files[0];
      if (file) {
        callback(file);
      }
      input.remove();
    });

    document.body.appendChild(input);
    input.click();
  },

  // ========================================================================
  // UI HELPER METHODS
  // ========================================================================

  /**
   * Show file import dialog
   */
  showImportDialog() {
    this.createFileInput(file => {
      this.importStateFromFile(file);
    }, ".json");
  },

  /**
   * Show export dialog (prompts for format)
   * @returns {Promise<void>}
   */
  async showExportDialog() {
    const format = prompt(
      "Export format:\n1. JSON (state)\n2. glTF (geometry)\n3. glB (binary)\n4. CSV (data)\n\nEnter 1-4:",
      "1"
    );

    switch (format) {
      case "1":
        this.exportStateToFile();
        break;
      case "2":
        await this.exportGLTF({ binary: false });
        break;
      case "3":
        await this.exportGLTF({ binary: true });
        break;
      case "4":
        this.exportCSVToFile();
        break;
      default:
        console.log("Export cancelled");
    }
  },
};
