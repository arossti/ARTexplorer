// MODULE IMPORTS
// ========================================================================
import { Polyhedra } from "./rt-polyhedra.js";
import { RTPapercut } from "./rt-papercut.js";
import { RTPrimeCuts } from "./rt-prime-cuts.js";
import { RTProjections } from "./rt-projections.js";
import { RTViewManager } from "./rt-viewmanager.js";
import { initQuadranceDemo } from "../demos/rt-quadrance-demo.js";
import { initCrossDemo } from "../demos/rt-cross-demo.js";
import { initWeierstrassDemo } from "../demos/rt-weierstrass-demo.js";
import { initGravityDemo } from "../demos/rt-gravity-demo.js";
import { openDemoModal } from "../demos/rt-demo-utils.js";
import { colorTheoryModal } from "./color-theory-modal.js";
import { initScene as createRenderingAPI } from "./rt-rendering.js";
import { initInfoModal } from "./rt-info-modal.js";
import * as RTJanus from "./rt-janus.js";
import {
  getRotorDemo,
  destroyRotorDemo as _destroyRotorDemo,
} from "./rt-rotor-demo.js";
import {
  get4DDropDemo,
  destroy4DDropDemo as _destroy4DDropDemo,
} from "../demos/4D-Drop.js";
import {
  getPolyhedronVertices as getVertices,
  getPolyhedronEdgeMidpoints as getEdgeMidpoints,
  getPolyhedronFaceCentroids as getFaceCentroids,
} from "./rt-snap-geometry.js";

// Phase 1 Modularization: Declarative UI Bindings (Jan 30, 2026)
import { uiBindings } from "./rt-ui-bindings.js";
import { allBindings, getBindingStats } from "./rt-ui-binding-defs.js";

// Phase 3 Modularization: Coordinate Display System (Jan 30, 2026)
import { RTCoordinates } from "./rt-coordinates.js";

// Node size slider helpers (Feb 2026)
import { Nodes } from "./rt-nodes.js";

// Centralized geometry logging (Feb 2026)
import { MetaLog } from "./rt-metalog.js";

// Camera animation system for View Capture (Feb 2026)
import { RTAnimate } from "./rt-animate.js";

// Phase 2b Modularization: Selection System - REVERTED
// Selection is tightly coupled with gumball (~40 references to currentSelection)
// Extracting selection without gumball creates artificial separation that adds
// complexity without real value. Lesson learned: extract genuinely decoupled systems only.

// Make RTPolyhedra available globally for node geometry creation
window.RTPolyhedra = Polyhedra;

// ========================================================================
// FEATURE FLAGS - Control which systems are active
// ========================================================================
// Set to true to use new declarative UI bindings instead of legacy addEventListener
const USE_DECLARATIVE_UI = true; // Testing declarative bindings (Jan 30)

// Set to true to use new RTCoordinates module for coordinate display
const USE_COORDINATE_MODULE = true; // Shadow testing coordinate module (Jan 30)

// Phase 2b RTSelection: REVERTED - Selection-gumball coupling is by design, not a bug

// TODO: Extract gumball to rt-controls.js module
// import { RTControls } from "./modules/rt-controls.js";

// ========================================================================
// APPLICATION INITIALIZATION
// ========================================================================
// Initialize app immediately (no password protection)
initApp();

function initApp() {
  // Import Three.js modules
  import("three").then(THREE_MODULE => {
    const THREE = THREE_MODULE.default || THREE_MODULE;

    import("three/addons/controls/OrbitControls.js").then(
      OrbitControlsModule => {
        const OrbitControls = OrbitControlsModule.OrbitControls;

        // Import ARTexplorer modules
        import("./rt-math.js").then(RTModule => {
          const { RT, Quadray } = RTModule;

          import("./rt-polyhedra.js").then(PolyhedraModule => {
            const { Polyhedra } = PolyhedraModule;

            import("./rt-state-manager.js").then(StateModule => {
              const { RTStateManager } = StateModule;

              import("./rt-filehandler.js").then(FileHandlerModule => {
                const { RTFileHandler } = FileHandlerModule;

                // Make THREE, RTStateManager, and RTFileHandler global for easier access in console
                window.THREE = THREE;
                window.RTStateManager = RTStateManager;
                window.RTFileHandler = RTFileHandler;

                // Initialize Quadray basis vectors with THREE.js
                Quadray.init(THREE);

                // Initialize StateManager
                RTStateManager.init();

                // Continue with app initialization
                startARTexplorer(
                  THREE,
                  OrbitControls,
                  RT,
                  Quadray,
                  Polyhedra,
                  RTStateManager,
                  RTFileHandler
                );
              });
            });
          });
        });
      }
    );
  });
}

function startARTexplorer(
  THREE,
  OrbitControls,
  RT,
  Quadray,
  Polyhedra,
  RTStateManager,
  RTFileHandler
) {
  // ========================================================================
  // INFO MODAL INITIALIZATION
  // ========================================================================
  initInfoModal();

  // ========================================================================
  // RENDERING API SETUP
  // ========================================================================
  const renderingAPI = createRenderingAPI(THREE, OrbitControls, RT);
  window.renderingAPI = renderingAPI;

  // Assign updateGeometry EARLY so event listeners can reference it
  let updateGeometry = renderingAPI.updateGeometry;
  let requestGeometryUpdate = renderingAPI.requestGeometryUpdate;

  // Scene objects - assigned after initScene() is called
  let scene, camera, renderer, controls;
  let pointGroup; // Point primitive (single vertex)
  let lineGroup; // Line primitive (two vertices, one edge)
  let polygonGroup; // Polygon primitive (n vertices, n edges, 1 face)
  let prismGroup; // Prism primitive (3D solid with N-gon caps)
  let coneGroup; // Cone primitive (3D solid with N-gon base and apex)
  let tetrahelix1Group; // Tetrahelix 1: Toroidal (left-handed)
  let tetrahelix2Group; // Tetrahelix 2: Linear (tetrahedral seed)
  let tetrahelix3Group; // Tetrahelix 3: Linear (octahedral seed)
  let penroseTilingGroup; // Penrose Tiling
  let cubeGroup, tetrahedronGroup, dualTetrahedronGroup, octahedronGroup;
  let icosahedronGroup, dodecahedronGroup, dualIcosahedronGroup;
  let cuboctahedronGroup, rhombicDodecahedronGroup;
  let geodesicIcosahedronGroup,
    geodesicTetrahedronGroup,
    geodesicOctahedronGroup;
  let cubeMatrixGroup, tetMatrixGroup, octaMatrixGroup;
  let cuboctaMatrixGroup, rhombicDodecMatrixGroup;
  let radialCubeMatrixGroup, radialRhombicDodecMatrixGroup;
  let radialTetMatrixGroup, radialOctMatrixGroup, radialVEMatrixGroup;
  let quadrayTetrahedronGroup,
    quadrayTetraDeformedGroup,
    quadrayCuboctahedronGroup,
    quadrayOctahedronGroup,
    quadrayTruncatedTetGroup,
    quadrayStellaOctangulaGroup;
  let cartesianGrid, ivmPlanes;

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  // ========================================================================
  // DECLARATIVE UI BINDINGS (Phase 1 Modularization)
  // ========================================================================
  // When USE_DECLARATIVE_UI is true, use the new declarative binding system
  // When false (default), use the legacy addEventListener() calls below
  if (USE_DECLARATIVE_UI) {
    // Initialize new declarative binding system
    uiBindings.init({
      updateGeometry: updateGeometry,
      requestGeometryUpdate: requestGeometryUpdate,
      renderingAPI: renderingAPI,
      RT: RT,
      Quadray: Quadray,
    });
    uiBindings.registerAll(allBindings);
    uiBindings.applyAll();

    const stats = getBindingStats();
    MetaLog.log(
      MetaLog.SUMMARY,
      `🆕 DECLARATIVE UI: ${stats.total} bindings (${stats.simpleCheckboxes} checkboxes, ${stats.simpleSliders} sliders, ${stats.linkedSliders} linked)`
    );
  }

  // ========================================================================
  // COORDINATE DISPLAY MODULE (Phase 3 Modularization)
  // ========================================================================
  if (USE_COORDINATE_MODULE) {
    RTCoordinates.init({
      Quadray: Quadray,
      RTStateManager: RTStateManager,
      THREE: THREE,
      getSelectedPolyhedra: getSelectedPolyhedra,
    });
    RTCoordinates.setupModeToggles();

    // Callback to reposition editingBasis when mode changes to group-centre
    RTCoordinates.onModeChangeCallback = (mode, centroid) => {
      if (mode === "group-centre" && centroid && editingBasis) {
        editingBasis.position.copy(centroid);
      }
    };

    MetaLog.log(MetaLog.SUMMARY, "🆕 COORDINATE MODULE: Active");
  }

  // ========================================================================
  // LEGACY EVENT HANDLERS (Run in parallel with declarative bindings)
  // ========================================================================
  // CURRENT STATE: Both declarative bindings AND legacy handlers run.
  // This causes harmless double-registration on ~60 elements (updateGeometry
  // called twice per interaction). Performance impact is negligible.
  //
  // FUTURE CLEANUP: Once declarative system is fully proven, wrap covered
  // handlers in `if (!USE_DECLARATIVE_UI)` or remove them entirely.
  // See: Geometry documents/JAN30-MODULARIZATION-ANALYSIS.md for handler inventory
  //
  // HANDLERS NOT IN DECLARATIVE (must always run):
  // - Plane toggles (.plane-toggle-switch[data-plane])
  // - Basis controls (showCartesianBasis, showQuadray)
  // - Janus scale sliders (scaleSlider, tetScaleSlider) - complex inversion logic
  // - Geodesic projection radio buttons
  // - View controls, demo modals, data I/O (handled after line 1311)

  // ========================================================================
  // MetaLog: Centralized geometry logging (Feb 2026)
  // ========================================================================
  const urlLogLevel = MetaLog.initFromURL();
  const advancedLoggingCheckbox = document.getElementById(
    "enableAdvancedLogging"
  );
  if (advancedLoggingCheckbox) {
    // Sync checkbox to URL param if present
    if (urlLogLevel !== null && urlLogLevel >= MetaLog.SUMMARY) {
      advancedLoggingCheckbox.checked = true;
    }
    advancedLoggingCheckbox.addEventListener("change", function () {
      if (this.checked) {
        // Only upgrade to SUMMARY if currently SILENT
        // (Don't downgrade from DETAILED/DEBUG set via URL)
        if (MetaLog.level < MetaLog.SUMMARY) {
          MetaLog.setLevel(MetaLog.SUMMARY);
        }
      } else {
        MetaLog.setLevel(MetaLog.SILENT);
      }
    });
  }

  // ========================================================================
  // Plane checkbox toggles (Cartesian XYZ + Central Angle IVM)
  // ========================================================================
  // Cartesian plane checkboxes
  ["planeXY", "planeXZ", "planeYZ"].forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener("change", function () {
        const plane = id.replace("plane", ""); // "XY", "XZ", "YZ"
        const isActive = this.checked;

        // Update individual grid visibility
        if (plane === "XY" && window.gridXY) {
          window.gridXY.visible = isActive;
        } else if (plane === "XZ" && window.gridXZ) {
          window.gridXZ.visible = isActive;
        } else if (plane === "YZ" && window.gridYZ) {
          window.gridYZ.visible = isActive;
        }

        // Update cartesianGrid group visibility
        const anyCartesianActive =
          document.getElementById("planeXY")?.checked ||
          document.getElementById("planeXZ")?.checked ||
          document.getElementById("planeYZ")?.checked;
        if (cartesianGrid) {
          cartesianGrid.visible = anyCartesianActive;
        }
      });
    }
  });

  // Central Angle (IVM) plane checkboxes
  [
    "planeIvmWX",
    "planeIvmWY",
    "planeIvmWZ",
    "planeIvmXY",
    "planeIvmXZ",
    "planeIvmYZ",
  ].forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener("change", function () {
        const plane = id.replace("planeIvm", "ivm"); // "ivmWX", etc.
        const isActive = this.checked;

        // Update individual grid visibility
        if (plane === "ivmWX" && window.ivmWX) {
          window.ivmWX.visible = isActive;
        } else if (plane === "ivmWY" && window.ivmWY) {
          window.ivmWY.visible = isActive;
        } else if (plane === "ivmWZ" && window.ivmWZ) {
          window.ivmWZ.visible = isActive;
        } else if (plane === "ivmXY" && window.ivmXY) {
          window.ivmXY.visible = isActive;
        } else if (plane === "ivmXZ" && window.ivmXZ) {
          window.ivmXZ.visible = isActive;
        } else if (plane === "ivmYZ" && window.ivmYZ) {
          window.ivmYZ.visible = isActive;
        }

        // Update ivmPlanes group visibility
        const anyIVMActive =
          document.getElementById("planeIvmWX")?.checked ||
          document.getElementById("planeIvmWY")?.checked ||
          document.getElementById("planeIvmWZ")?.checked ||
          document.getElementById("planeIvmXY")?.checked ||
          document.getElementById("planeIvmXZ")?.checked ||
          document.getElementById("planeIvmYZ")?.checked;
        if (ivmPlanes) {
          ivmPlanes.visible = anyIVMActive;
        }
      });
    }
  });

  // ========================================================================
  // HANDLERS NOT IN DECLARATIVE - Must always run
  // ========================================================================
  // These handlers have complex logic that isn't captured by declarative bindings:
  // - Janus scale sliders (inversion detection, bidirectional sync)
  // - View controls (active state management)
  // - Section toggles, geodesic toggles (DOM manipulation)

  // Dual Scale Sliders - Linked with Smart Snapping
  // ONE unified metric, TWO presentation modes
  // Both snap to 0.10 intervals, show 2 decimal places
  // Which slider you adjust determines which shows rational values

  // Janus state tracking now in RTJanus module (rt-janus.js)

  document.getElementById("scaleSlider").addEventListener("input", e => {
    const rawValue = parseFloat(e.target.value);

    // Snap cube edge to 0.10 intervals
    const cubeEdge = Math.round(rawValue * 10) / 10;

    // Update cube slider and display (rational - snapped)
    e.target.value = cubeEdge;
    document.getElementById("scaleValue").textContent = cubeEdge.toFixed(4);

    // Calculate corresponding tet edge (irrational)
    const tetEdge = cubeEdge * Math.sqrt(2);

    // Update tet slider and display (irrational - calculated)
    document.getElementById("tetScaleSlider").value = tetEdge;
    document.getElementById("tetScaleValue").textContent = tetEdge.toFixed(4);

    // JANUS INVERSION: Detect global Janus Point crossing
    const crossDirection = RTJanus.checkGlobalJanusCrossing(cubeEdge);

    if (crossDirection) {
      const newState =
        RTJanus.getDimensionalState() === "positive" ? "negative" : "positive";
      RTJanus.getDimensionalState(newState);
      console.log(
        `🌀 GLOBAL JANUS: All forms crossed origin (${crossDirection}) → ${newState} space`
      );

      // Animate background inversion
      const targetColor = newState === "negative" ? 0xffffff : 0x1a1a1a;
      RTJanus.animateBackgroundColor(targetColor, 300);

      // Create flash effect at origin
      RTJanus.createJanusFlash(new THREE.Vector3(0, 0, 0));
    }

    requestGeometryUpdate();
  });

  document.getElementById("tetScaleSlider").addEventListener("input", e => {
    const rawValue = parseFloat(e.target.value);

    // Snap tet edge to 0.10 intervals
    const tetEdge = Math.round(rawValue * 10) / 10;

    // Update tet slider and display (rational - snapped)
    e.target.value = tetEdge;
    document.getElementById("tetScaleValue").textContent = tetEdge.toFixed(4);

    // Calculate corresponding cube edge (irrational)
    const cubeEdge = tetEdge / Math.sqrt(2);

    // Update cube slider and display (irrational - calculated)
    document.getElementById("scaleSlider").value = cubeEdge;
    document.getElementById("scaleValue").textContent = cubeEdge.toFixed(4);

    // JANUS INVERSION: Detect global Janus Point crossing (using tetEdge)
    const crossDirection = RTJanus.checkGlobalJanusCrossing(tetEdge);

    if (crossDirection) {
      const newState =
        RTJanus.getDimensionalState() === "positive" ? "negative" : "positive";
      RTJanus.getDimensionalState(newState);
      console.log(
        `🌀 GLOBAL JANUS: All forms crossed origin (${crossDirection}) → ${newState} space`
      );

      // Animate background inversion
      const targetColor = newState === "negative" ? 0xffffff : 0x1a1a1a;
      RTJanus.animateBackgroundColor(targetColor, 300);

      // Create flash effect at origin
      RTJanus.createJanusFlash(new THREE.Vector3(0, 0, 0));
    }

    requestGeometryUpdate();
  });

  // Face Opacity slider
  document.getElementById("opacitySlider").addEventListener("input", e => {
    document.getElementById("opacityValue").textContent = e.target.value;
    requestGeometryUpdate();
  });

  // Node Opacity slider
  document.getElementById("nodeOpacitySlider").addEventListener("input", e => {
    const opacity = parseFloat(e.target.value);
    document.getElementById("nodeOpacityValue").textContent = opacity;
    renderingAPI.setNodeOpacity(opacity);
    requestGeometryUpdate();
  });

  // NOTE: Tessellation slider handlers are now in rt-ui-binding-defs.js
  // (quadrayTessSlider and cartesianTessSlider use new checkbox IDs)

  // ========================================================================
  // VIEW CONTROLS - Camera Presets
  // ========================================================================

  // Projection mode buttons (Perspective / Orthographic / Centre)
  const perspectiveBtn = document.getElementById("cameraPerspective");
  const orthographicBtn = document.getElementById("cameraOrthographic");
  const centreBtn = document.getElementById("cameraCentre");

  perspectiveBtn.addEventListener("click", () => {
    renderingAPI.switchCameraType(false); // Switch to perspective
    camera = renderingAPI.getCamera(); // Update local ref (ortho ≠ perspective)
    perspectiveBtn.classList.add("active");
    orthographicBtn.classList.remove("active");
  });

  orthographicBtn.addEventListener("click", () => {
    renderingAPI.switchCameraType(true); // Switch to orthographic
    camera = renderingAPI.getCamera(); // Update local ref (ortho ≠ perspective)
    orthographicBtn.classList.add("active");
    perspectiveBtn.classList.remove("active");
  });

  // Centre: Re-centre camera on origin while preserving current projection mode and direction
  centreBtn.addEventListener("click", () => {
    renderingAPI.resetCameraTarget();
  });

  // Enable view preset buttons and wire up event listeners
  const viewButtons = [
    // XYZ Cartesian Views (looking down each axis)
    { id: "viewX", view: "x" },
    { id: "viewY", view: "y" },
    { id: "viewZDown", view: "zdown" },
    { id: "viewZUp", view: "zup" },
    { id: "viewAxo", view: "axo" },
    // QWXYZ Tetrahedral Basis Views (looking down each quadray axis)
    // QW=Yellow(3), QX=Red(0), QY=Blue(2), QZ=Green(1)
    { id: "viewQuadQW", view: "quadqw" },
    { id: "viewQuadQX", view: "quadqx" },
    { id: "viewQuadQY", view: "quadqy" },
    { id: "viewQuadQZ", view: "quadqz" },
  ];

  // Track active view button for persistent highlighting
  let activeViewButton = null;

  viewButtons.forEach(({ id, view }) => {
    const btn = document.getElementById(id);
    btn.addEventListener("click", () => {
      // Remove active class from previously active button
      if (activeViewButton) {
        activeViewButton.classList.remove("active");
      }

      // Add active class to clicked button
      btn.classList.add("active");
      activeViewButton = btn;

      renderingAPI.setCameraPreset(view);
      camera = renderingAPI.getCamera(); // Preset may switch ortho/perspective
    });
  });

  // ========================================================================
  // INITIALIZE
  // ========================================================================

  // Geodesic toggle functionality
  document.querySelectorAll(".geodesic-toggle").forEach(toggle => {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const targetId = this.dataset.target;
      const targetOptions = document.getElementById(targetId);

      // Check if expanding or collapsing (before toggle)
      const wasCollapsed = this.classList.contains("collapsed");

      // Toggle collapsed state
      this.classList.toggle("collapsed");
      targetOptions.classList.toggle("collapsed");

      // Master toggle handling for grid sections
      const gridMasterToggles = {
        "central-angle-grids": {
          label: "Central Angle Grids",
          checkboxIds: [
            "planeIvmWX",
            "planeIvmWY",
            "planeIvmWZ",
            "planeIvmXY",
            "planeIvmXZ",
            "planeIvmYZ",
          ],
        },
        "cartesian-planes": {
          label: "Cartesian Planes",
          checkboxIds: ["planeXY", "planeXZ", "planeYZ"],
        },
        "ivm-grids": {
          label: "IVM Grids",
          checkboxIds: [
            "planeQuadrayWX",
            "planeQuadrayWY",
            "planeQuadrayWZ",
            "planeQuadrayXY",
            "planeQuadrayXZ",
            "planeQuadrayYZ",
          ],
        },
      };

      if (gridMasterToggles[targetId]) {
        const { label, checkboxIds } = gridMasterToggles[targetId];
        const shouldEnable = wasCollapsed; // Expanding = turn all ON, Collapsing = turn all OFF

        // Set GROUP visibility directly — this covers all objects regardless of
        // mode-specific keys (e.g. polar face planes vs uniform IVM planes)
        if (targetId === "central-angle-grids") {
          renderingAPI.setQuadrayGridVisible(shouldEnable);
        } else if (targetId === "cartesian-planes") {
          renderingAPI.setCartesianGridVisible(shouldEnable);
        }

        checkboxIds.forEach(id => {
          const checkbox = document.getElementById(id);
          if (checkbox && checkbox.checked !== shouldEnable) {
            checkbox.checked = shouldEnable;
            checkbox.dispatchEvent(new Event("change")); // Trigger visibility update
          }
        });

        console.log(
          `[${label}] Master toggle: ${shouldEnable ? "ALL ON" : "ALL OFF"}`
        );
      }
    });
  });

  // Section toggle functionality (for main h3 sections)
  document.querySelectorAll(".section-toggle").forEach(toggle => {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const targetId = this.dataset.target;
      const content = document.getElementById(targetId);

      // Toggle collapsed state
      this.classList.toggle("collapsed");
      content.classList.toggle("collapsed");
    });
  });

  // Make h3 headers clickable (entire row) - only those with section-toggle
  document.querySelectorAll("h3").forEach(header => {
    if (header.querySelector(".section-toggle")) {
      header.addEventListener("click", function (e) {
        // Don't trigger if clicking directly on the toggle arrow
        if (e.target.classList.contains("section-toggle")) return;

        const toggle = this.querySelector(".section-toggle");
        if (toggle) {
          toggle.click();
        }
      });
    }
  });

  // Node size slider functionality
  const nodeSizeSlider = document.getElementById("nodeSizeSlider");
  const nodeSizeLabel = document.getElementById("nodeSizeLabel");
  if (nodeSizeSlider) {
    nodeSizeSlider.addEventListener("input", function () {
      // Update label
      if (nodeSizeLabel) {
        nodeSizeLabel.textContent = Nodes.getNodeSizeLabel(this.value);
      }
      // Clear geometry cache when size changes
      renderingAPI.clearNodeCache();
      // Trigger re-render
      requestGeometryUpdate();
    });
  }

  // Node geometry type toggle (Classical vs RT)
  document
    .getElementById("nodeGeomClassical")
    .addEventListener("click", function () {
      // Use rendering API to set node geometry type
      renderingAPI.setNodeGeometryType(false);
      document.getElementById("nodeGeomClassical").classList.add("active");
      document.getElementById("nodeGeomRT").classList.remove("active");
      updateGeometry();
    });

  // RT Geodesic dropdown - handles both selection and frequency change
  const rtGeodesicDropdown = document.getElementById("nodeGeomRT");

  rtGeodesicDropdown.addEventListener("focus", function () {
    // When dropdown is focused/clicked, switch to RT mode
    renderingAPI.setNodeGeometryType(true);
    rtGeodesicDropdown.classList.add("active");
    document.getElementById("nodeGeomClassical").classList.remove("active");
  });

  rtGeodesicDropdown.addEventListener("change", function () {
    // Update frequency when selection changes
    const frequency = parseInt(this.value, 10);
    renderingAPI.setGeodesicFrequency(frequency);
    updateGeometry();
  });

  // Node shading toggle (Faceted vs Smooth)
  document
    .getElementById("nodeFlatShading")
    .addEventListener("change", updateGeometry);

  // ========================================================================
  // DEMO MODAL HANDLERS
  // ========================================================================

  // Initialize demo modals on first open
  let demosInitialized = {
    quadrance: false,
    cross: false,
    weierstrass: false,
    gravity: false,
  };

  document
    .getElementById("open-quadrance-demo")
    .addEventListener("click", e => {
      e.preventDefault();
      openDemoModal("quadrance-modal");
      if (!demosInitialized.quadrance) {
        // Delay initialization to ensure modal is visible and container has dimensions
        setTimeout(() => {
          initQuadranceDemo();
          demosInitialized.quadrance = true;
        }, 50);
      }
    });

  document.getElementById("open-cross-demo").addEventListener("click", e => {
    e.preventDefault();
    openDemoModal("cross-modal");
    if (!demosInitialized.cross) {
      setTimeout(() => {
        initCrossDemo();
        demosInitialized.cross = true;
      }, 50);
    }
  });

  document
    .getElementById("open-weierstrass-demo")
    .addEventListener("click", e => {
      e.preventDefault();
      openDemoModal("weierstrass-modal");
      if (!demosInitialized.weierstrass) {
        setTimeout(() => {
          initWeierstrassDemo();
          demosInitialized.weierstrass = true;
        }, 50);
      }
    });

  document.getElementById("open-gravity-demo").addEventListener("click", e => {
    e.preventDefault();
    openDemoModal("gravity-modal");
    if (!demosInitialized.gravity) {
      setTimeout(() => {
        initGravityDemo();
        demosInitialized.gravity = true;
      }, 50);
    }
  });

  // Color Theory Modal - Set rendering API reference
  colorTheoryModal.setRenderingAPI(renderingAPI);

  document
    .getElementById("open-color-theory-modal")
    .addEventListener("click", e => {
      e.preventDefault();
      colorTheoryModal.open();
    });

  // Spread-Quadray Rotor Demo - In-scene 3D demo (not modal)
  let rotorDemo = null;
  document.getElementById("open-rotor-demo").addEventListener("click", e => {
    e.preventDefault();
    if (!rotorDemo) {
      rotorDemo = getRotorDemo(scene, THREE, camera, controls);
    }
    const isEnabled = rotorDemo.toggle();
    const link = e.target;
    if (isEnabled) {
      link.style.color = "#0f0";
      link.textContent = "Spread-Quadray Rotors ✓";
    } else {
      link.style.color = "#7ab8ff";
      link.textContent = "Spread-Quadray Rotors";
    }
  });

  // Make rotorDemo globally accessible for debugging
  window.getRotorDemo = () => rotorDemo;

  // 4D± Gravity + Inversion Demo - Quadray Janus drop
  let dropDemo4D = null;
  document.getElementById("open-4d-drop-demo").addEventListener("click", e => {
    e.preventDefault();
    if (!dropDemo4D) {
      dropDemo4D = get4DDropDemo(scene, THREE, camera, controls);
    }
    const isEnabled = dropDemo4D.toggle();
    const link = e.target;
    if (isEnabled) {
      link.style.color = "#0f0";
      link.textContent = "4D\u00B1 Gravity + Inversion \u2713";
    } else {
      link.style.color = "#7ab8ff";
      link.textContent = "4D\u00B1 Gravity + Inversion";
    }
  });

  // Prime Projections Demo - Floating preset panel
  document
    .getElementById("open-prime-projections-demo")
    .addEventListener("click", e => {
      e.preventDefault();
      const isVisible = window.RTPrimeCuts.togglePanel();
      const link = e.target;
      if (isVisible) {
        link.style.color = "#0f0";
        link.textContent = "Prime Projections \u2713";
      } else {
        link.style.color = "#7ab8ff";
        link.textContent = "Prime Projections";
      }
    });

  // ========================================================================
  // GUMBALL TOOL FUNCTIONALITY
  // ========================================================================

  // ========================================================================
  // GUMBALL STATE
  // ========================================================================

  // Gumball state
  let currentGumballTool = null; // null = off, "move", "scale", "rotate"
  let currentSnapMode = "free"; // 'free', 'xyz', 'wxyz'
  let isDragging = false;
  let isFreeMoving = false; // FREE MOVEMENT: Direct drag on polyhedron body (no axis constraint)
  let selectedHandle = null; // { type: 'quadray'|'cartesian', index: number, axis: Vector3 }
  let dragPlane = null; // THREE.Plane for raycasting
  let dragStartPoint = new THREE.Vector3();
  let freeMoveDragOffset = new THREE.Vector3(); // Offset from click point to object center
  let freeMoveInitialPositions = []; // Initial positions of all selected polyhedra (for delta-based movement)
  let freeMoveStartPoint = new THREE.Vector3(); // World position where free move drag started
  let selectedPolyhedra = []; // Will store currently selected polyhedra
  let justFinishedDrag = false; // Track if we just completed a drag (prevent deselect on click-after-drag)
  let editingBasis = null; // Localized gumball that follows selected Forms
  let hoveredHandle = null; // Currently hovered gumball handle (for hover glow effect)

  // Basis vector visibility state (stored when gumball activates, restored on deactivation)
  let savedCartesianBasisVisible = null;
  let savedQuadrayBasisVisible = null;

  // Object snap state (toggleable, can combine with grid snapping)
  let objectSnapVertex = false; // Snap to nearest vertex
  let objectSnapEdge = false; // Snap to nearest edge midpoint
  let objectSnapFace = false; // Snap to nearest face centroid
  let currentSnapTarget = null; // { type: 'vertex'|'edge'|'face', position: Vector3, object: Group }
  let snapPreviewMarker = null; // Visual indicator for snap target

  // ========================================================================
  // SELECTION STATE
  // ========================================================================
  let currentSelection = null; // Currently selected polyhedron (Form or Instance)

  // Opt-click drag-to-copy state
  let isDragCopying = false; // Alt/Option key held during drag
  let dragCopyOriginalPosition = new THREE.Vector3();
  let dragCopyOriginalQuaternion = new THREE.Quaternion();
  let dragCopyOriginalScale = new THREE.Vector3();

  // NOW button - deposit current Form as Instance using RTStateManager
  document.getElementById("nowButton").addEventListener("click", function () {
    const selected = getSelectedPolyhedra();

    if (selected.length === 0) {
      console.warn("⚠️ No polyhedra selected - cannot deposit instance");
      return;
    }

    // Track if any matrix forms were deposited (need geometry update)
    let matrixFormDeposited = false;

    // Deposit each selected polyhedron using StateManager
    selected.forEach(poly => {
      const formType = poly.userData.type;

      // Create instance using RTStateManager (side effect only, return value unused)
      RTStateManager.createInstance(poly, scene);

      // Reset Form to origin
      RTStateManager.resetForm(poly);

      // Check if this was a matrix form (planar or radial)
      if (
        formType === "cubeMatrix" ||
        formType === "tetMatrix" ||
        formType === "octaMatrix" ||
        formType === "cuboctaMatrix" ||
        formType === "rhombicDodecMatrix" ||
        formType === "radialCubeMatrix" ||
        formType === "radialRhombicDodecMatrix" ||
        formType === "radialTetMatrix" ||
        formType === "radialOctMatrix" ||
        formType === "radialVEMatrix"
      ) {
        matrixFormDeposited = true;
      }
    });

    // If matrix form was deposited, regenerate geometry with reset properties
    if (matrixFormDeposited) {
      updateGeometry();
    }

    // Hide editing basis after depositing (nothing selected)
    if (editingBasis) {
      scene.remove(editingBasis);
      editingBasis = null;
    }

    // Deselect after depositing (clear highlight and selection)
    deselectAll();

    // Update counter UI
    document.getElementById("nowCount").textContent =
      RTStateManager.getDepositedCount();
  });

  // Gumball tool selector functionality
  document.querySelectorAll(".toggle-btn.variant-tool").forEach(btn => {
    btn.addEventListener("click", function () {
      const tool = this.dataset.gumballTool;

      // Check if selected form allows this tool (Point only allows "move" for single selection)
      // Exception: Allow "rotate" when 2+ Points are selected (group rotation around centroid)
      if (currentSelection) {
        const allowedTools = currentSelection.userData?.allowedTools;
        if (allowedTools && !allowedTools.includes(tool)) {
          // Check for multi-Point rotation exception
          const selected = RTStateManager.getSelectedObjects();
          const isMultiPointRotation =
            tool === "rotate" &&
            selected.length >= 2 &&
            selected.every(obj => obj.userData.type === "point");

          if (!isMultiPointRotation) {
            console.log(
              `[Tool] '${tool}' not allowed for ${currentSelection.userData.type}`
            );
            return; // Don't activate disallowed tool
          }
        }
      }

      // Toggle: if clicking active button, deactivate it
      if (this.classList.contains("active")) {
        this.classList.remove("active");
        currentGumballTool = null;
        controls.enabled = true;
        destroyEditingBasis();

        // Restore basis vectors to their previous visibility state
        if (savedCartesianBasisVisible !== null) {
          renderingAPI.setCartesianBasisVisible(savedCartesianBasisVisible);
          savedCartesianBasisVisible = null;
        }
        if (savedQuadrayBasisVisible !== null) {
          renderingAPI.setQuadrayBasisVisible(savedQuadrayBasisVisible);
          savedQuadrayBasisVisible = null;
        }
      } else {
        // Remove active from all gumball tool buttons
        document
          .querySelectorAll(".toggle-btn.variant-tool")
          .forEach(b => b.classList.remove("active"));
        // Add active to clicked button
        this.classList.add("active");
        currentGumballTool = tool;
        controls.enabled = false; // Disable orbit controls when gumball tool active

        // Save and hide basis vectors to reduce visual clutter during gumball edits
        const cartesianCheckbox = document.getElementById("showCartesianBasis");
        const quadrayCheckbox = document.getElementById("showQuadray");
        savedCartesianBasisVisible = cartesianCheckbox?.checked ?? false;
        savedQuadrayBasisVisible = quadrayCheckbox?.checked ?? false;
        renderingAPI.setCartesianBasisVisible(false);
        renderingAPI.setQuadrayBasisVisible(false);

        // Create editing basis at appropriate position
        // Priority: 1) Group Centre mode → centroid, 2) Vertex mode → node, 3) Classical → primary centroid
        const selected = getSelectedPolyhedra();
        if (selected.length > 0) {
          let basisPosition;
          const selectedVertices = RTStateManager.getSelectedVertices();
          const firstVertex = selectedVertices[0];

          // Check for Group Centre mode first (requires 2+ selected)
          if (
            USE_COORDINATE_MODULE &&
            RTCoordinates.getMode() === "group-centre" &&
            selected.length >= 2
          ) {
            // GROUP CENTRE: Use calculated centroid of all selected objects
            basisPosition = RTCoordinates.calculateGroupCentroid(selected);
          } else if (
            RTStateManager.isVertexMode() &&
            firstVertex?.getWorldPosition
          ) {
            // NODE-BASED ORIGIN: Use first selected node's world position
            const nodeWorldPos = new THREE.Vector3();
            firstVertex.getWorldPosition(nodeWorldPos);
            basisPosition = nodeWorldPos;
            console.log(
              `✅ Editing basis created: NODE ORIGIN at (${nodeWorldPos.x.toFixed(2)}, ${nodeWorldPos.y.toFixed(2)}, ${nodeWorldPos.z.toFixed(2)})`
            );
          } else {
            // CLASSICAL: Use polyhedron centroid
            basisPosition = selected[0].position.clone();
          }

          createEditingBasis(basisPosition, selected[0]);
        }
      }
    });
  });

  // Snap toggle button functionality
  document.querySelectorAll(".toggle-btn.variant-snap").forEach(btn => {
    btn.addEventListener("click", function () {
      const snapMode = this.dataset.snapMode;
      document.querySelectorAll(".toggle-btn.variant-snap").forEach(b => {
        b.classList.remove("active");
      });
      this.classList.add("active");
      currentSnapMode = snapMode;
    });
  });

  // Object snap toggle buttons (toggleable - can be combined)
  document.querySelectorAll(".toggle-btn.variant-objsnap").forEach(btn => {
    btn.addEventListener("click", function () {
      const snapType = this.dataset.objsnap;
      // Coordinate mode buttons are mutually exclusive (not toggleable)
      if (this.dataset.coordMode) {
        return; // Handled by separate listener below
      }
      this.classList.toggle("active");
      const isActive = this.classList.contains("active");
      if (snapType === "vertex") {
        objectSnapVertex = isActive;
      } else if (snapType === "edge") {
        objectSnapEdge = isActive;
      } else if (snapType === "face") {
        objectSnapFace = isActive;
      }
    });
  });

  // Coordinate mode toggle (Absolute/Relative) - mutually exclusive
  // When USE_COORDINATE_MODULE is true, this is handled by RTCoordinates.setupModeToggles()
  if (!USE_COORDINATE_MODULE) {
    document.querySelectorAll("[data-coord-mode]").forEach(btn => {
      btn.addEventListener("click", function () {
        const mode = this.dataset.coordMode;
        // Remove active from all coord mode buttons
        document.querySelectorAll("[data-coord-mode]").forEach(b => {
          b.classList.remove("active");
        });
        // Activate clicked button
        this.classList.add("active");
        console.log(`📍 Coordinate mode: ${mode}`);
        // TODO: Update coordinate display based on mode
      });
    });
  }

  // UCS orientation toggle — mutually exclusive
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

  // Cartesian grid mode toggle — scoped to Cartesian section only
  document.querySelectorAll("[data-cartesian-mode]").forEach(btn => {
    btn.addEventListener("click", function () {
      if (this.disabled) return;
      const mode = this.dataset.cartesianMode;
      document
        .querySelectorAll("[data-cartesian-mode]")
        .forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      const cartesianTess = parseInt(
        document.getElementById("cartesianTessSlider")?.value || "10"
      );
      const cartVisibility = {
        gridXY: document.getElementById("planeXY")?.checked ?? false,
        gridXZ: document.getElementById("planeXZ")?.checked ?? false,
        gridYZ: document.getElementById("planeYZ")?.checked ?? false,
        cartesianBasis:
          document.getElementById("showCartesianBasis")?.checked ?? false,
      };
      renderingAPI.rebuildCartesianGrids(cartesianTess, cartVisibility, mode);
    });
  });

  // Quadray grid mode toggle — scoped to Central Angle section only
  document.querySelectorAll("[data-quadray-mode]").forEach(btn => {
    btn.addEventListener("click", function () {
      if (this.disabled) return;
      const mode = this.dataset.quadrayMode;
      document
        .querySelectorAll("[data-quadray-mode]")
        .forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      const quadrayTess = parseInt(
        document.getElementById("quadrayTessSlider")?.value || "12"
      );
      const ivmVisibility = {
        ivmWX: document.getElementById("planeIvmWX")?.checked ?? true,
        ivmWY: document.getElementById("planeIvmWY")?.checked ?? true,
        ivmWZ: document.getElementById("planeIvmWZ")?.checked ?? true,
        ivmXY: document.getElementById("planeIvmXY")?.checked ?? true,
        ivmXZ: document.getElementById("planeIvmXZ")?.checked ?? true,
        ivmYZ: document.getElementById("planeIvmYZ")?.checked ?? true,
      };
      renderingAPI.rebuildQuadrayGrids(quadrayTess, ivmVisibility, mode);
    });
  });

  // ========================================================================
  // ROTATION INPUT FIELDS - Per-Axis Bidirectional Conversion (Degrees ↔ Spread)
  // ========================================================================

  /**
   * Setup bidirectional conversion between degrees and spread for a pair of input fields
   * @param {string} degreesId - ID of degrees input field
   * @param {string} spreadId - ID of spread input field
   * @param {string} axis - Axis name for logging
   */
  function setupRotationInputs(degreesId, spreadId, axis) {
    const degreesInput = document.getElementById(degreesId);
    const spreadInput = document.getElementById(spreadId);

    if (!degreesInput || !spreadInput) {
      console.warn(`⚠️ Could not find rotation inputs for ${axis}`);
      return;
    }

    // Degrees → Spread
    degreesInput.addEventListener("input", function (e) {
      const degreesValue = parseFloat(e.target.value);
      if (!isNaN(degreesValue)) {
        const spreadValue = RT.degreesToSpread(degreesValue);
        spreadInput.value = spreadValue.toFixed(2);
        console.log(
          `🔄 ${axis}: ${degreesValue.toFixed(2)}° → Spread: ${spreadValue.toFixed(2)}`
        );
      }
    });

    // Spread → Degrees
    spreadInput.addEventListener("input", function (e) {
      const spreadValue = parseFloat(e.target.value);
      if (!isNaN(spreadValue)) {
        const degreesValue = RT.spreadToDegrees(spreadValue);
        degreesInput.value = degreesValue.toFixed(2);
        console.log(
          `🔄 ${axis}: Spread: ${spreadValue.toFixed(2)} → ${degreesValue.toFixed(2)}°`
        );
      }
    });
  }

  // Setup bidirectional conversion for XYZ (Cartesian) axes
  setupRotationInputs("rotXDegrees", "rotXSpread", "X");
  setupRotationInputs("rotYDegrees", "rotYSpread", "Y");
  setupRotationInputs("rotZDegrees", "rotZSpread", "Z");

  // Setup bidirectional conversion for WXYZ (Quadray) axes
  setupRotationInputs("rotQWDegrees", "rotQWSpread", "W");
  setupRotationInputs("rotQXDegrees", "rotQXSpread", "X (Quadray)");
  setupRotationInputs("rotQYDegrees", "rotQYSpread", "Y (Quadray)");
  setupRotationInputs("rotQZDegrees", "rotQZSpread", "Z (Quadray)");

  // ========================================================================
  // COORDINATE INPUT HANDLERS - Execute transformations on Enter
  // ========================================================================

  /**
   * Helper function to exit current tool mode while keeping selection active
   * Called after transformations complete (Enter key or mouseup)
   */
  function exitToolMode() {
    if (currentGumballTool) {
      console.log(
        `🚪 Exiting ${currentGumballTool} mode - selection preserved`
      );

      // Deactivate tool button
      document.querySelectorAll(".toggle-btn.variant-tool").forEach(btn => {
        btn.classList.remove("active");
      });

      currentGumballTool = null;
      controls.enabled = true; // Re-enable orbit controls

      // Remove editing basis but keep selection highlight
      if (editingBasis) {
        scene.remove(editingBasis);
        editingBasis = null;
      }

      // Restore basis vectors to their previous visibility state
      if (savedCartesianBasisVisible !== null) {
        renderingAPI.setCartesianBasisVisible(savedCartesianBasisVisible);
        savedCartesianBasisVisible = null;
      }
      if (savedQuadrayBasisVisible !== null) {
        renderingAPI.setQuadrayBasisVisible(savedQuadrayBasisVisible);
        savedQuadrayBasisVisible = null;
      }

      console.log("✅ Tool mode exited - orbit enabled, selection preserved");
    }
  }

  /**
   * Persist a polyhedron's current transform to StateManager
   * Consolidates the repeated transform persistence pattern used in input handlers
   *
   * @param {THREE.Object3D} poly - The polyhedron to persist
   * @param {Object} options - Optional overrides for transform values
   * @param {Object} options.scale - Override scale { x, y, z }
   * @param {Object} options.quadrayRotation - Quadray rotation state { qw, qx, qy, qz }
   */
  function persistTransformToState(poly, options = {}) {
    if (!poly.userData?.instanceId) return;

    const newTransform = {
      position: { x: poly.position.x, y: poly.position.y, z: poly.position.z },
      rotation: {
        x: poly.rotation.x,
        y: poly.rotation.y,
        z: poly.rotation.z,
        order: poly.rotation.order,
      },
      scale: options.scale || {
        x: poly.scale.x,
        y: poly.scale.y,
        z: poly.scale.z,
      },
    };

    // Include quadrayRotation if provided
    if (options.quadrayRotation) {
      newTransform.quadrayRotation = options.quadrayRotation;
    }

    RTStateManager.updateInstance(poly.userData.instanceId, newTransform);
  }

  /**
   * Update coordinate display fields with a position (XYZ and WXYZ)
   * @param {THREE.Vector3} pos - Position to display
   */
  function updateCoordinateDisplay(pos) {
    // When coordinate module is active, delegate to it
    if (USE_COORDINATE_MODULE) {
      RTCoordinates.updatePositionDisplay(pos);
      return;
    }

    // Legacy implementation
    if (!pos) {
      // Clear display if no position
      document.getElementById("coordX").value = "0.0000";
      document.getElementById("coordY").value = "0.0000";
      document.getElementById("coordZ").value = "0.0000";
      document.getElementById("coordQW").value = "0.0000";
      document.getElementById("coordQX").value = "0.0000";
      document.getElementById("coordQY").value = "0.0000";
      document.getElementById("coordQZ").value = "0.0000";
      return;
    }

    // Update XYZ coordinates
    document.getElementById("coordX").value = pos.x.toFixed(4);
    document.getElementById("coordY").value = pos.y.toFixed(4);
    document.getElementById("coordZ").value = pos.z.toFixed(4);

    // Convert to QWXYZ (Quadray coordinates) using shared utility
    const quadray = Quadray.fromCartesian(pos);
    document.getElementById("coordQW").value = quadray.qw.toFixed(4);
    document.getElementById("coordQX").value = quadray.qx.toFixed(4);
    document.getElementById("coordQY").value = quadray.qy.toFixed(4);
    document.getElementById("coordQZ").value = quadray.qz.toFixed(4);
  }

  /**
   * Setup coordinate input handler for MOVE mode (XYZ fields)
   */
  function setupMoveCoordinateInputs() {
    const coordInputs = [
      { id: "coordX", axis: "x" },
      { id: "coordY", axis: "y" },
      { id: "coordZ", axis: "z" },
    ];

    coordInputs.forEach(({ id, axis }) => {
      const input = document.getElementById(id);
      if (!input) return;

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && currentGumballTool === "move") {
          const value = parseFloat(e.target.value);
          if (isNaN(value)) return;

          const selected = getSelectedPolyhedra();
          if (selected.length === 0) {
            console.warn("⚠️ No polyhedra selected");
            return;
          }

          // Apply position change and persist to StateManager
          selected.forEach(poly => {
            poly.position[axis] = value;
            console.log(
              `📍 Moved ${axis.toUpperCase()} to ${value.toFixed(4)}`
            );
            persistTransformToState(poly);
          });

          // Update footer coordinate display via module
          if (USE_COORDINATE_MODULE && selected.length > 0) {
            RTCoordinates.updatePositionDisplay(selected[0].position);
          }

          // Update editing basis position if it exists
          if (editingBasis && selected.length > 0) {
            editingBasis.position.copy(selected[0].position);
          }

          // Exit tool mode but keep selection
          exitToolMode();
        }
      });
    });
  }

  /**
   * Setup coordinate input handler for MOVE mode (WXYZ fields)
   */
  function setupMoveQuadrayInputs() {
    const coordInputs = [
      { id: "coordQW", axisKey: "qw", name: "QW" },
      { id: "coordQX", axisKey: "qx", name: "QX" },
      { id: "coordQY", axisKey: "qy", name: "QY" },
      { id: "coordQZ", axisKey: "qz", name: "QZ" },
    ];

    coordInputs.forEach(({ id, axisKey, name }) => {
      const input = document.getElementById(id);
      if (!input) return;

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && currentGumballTool === "move") {
          const value = parseFloat(e.target.value);
          if (isNaN(value)) return;

          const selected = getSelectedPolyhedra();
          if (selected.length === 0) {
            console.warn("⚠️ No polyhedra selected");
            return;
          }

          // Check coordinate mode: Absolute vs Relative
          const coordMode = RTCoordinates.getMode();

          if (coordMode === "relative") {
            // ================================================================
            // RELATIVE MODE: Treat input as delta movement along single axis
            // ================================================================
            // The entered value is a delta - move along this specific Quadray axis
            const delta = value;

            // Get the basis vector for this Quadray axis
            const basisIndex = Quadray.AXIS_INDEX[axisKey];
            const basisVector = Quadray.basisVectors[basisIndex];

            // Calculate Cartesian delta from Quadray delta
            // Movement = delta * basisVector direction
            const cartesianDelta = basisVector.clone().multiplyScalar(delta);

            selected.forEach(poly => {
              // Add delta to current position
              poly.position.add(cartesianDelta);
              console.log(
                `📍 RELATIVE ${name} move: delta=${delta.toFixed(4)} → new pos (${poly.position.x.toFixed(4)}, ${poly.position.y.toFixed(4)}, ${poly.position.z.toFixed(4)})`
              );
              persistTransformToState(poly);
            });
          } else {
            // ================================================================
            // ABSOLUTE MODE: Use all four values as zero-sum position
            // ================================================================
            // Get all QWXYZ values from UI fields
            const qwValue = parseFloat(
              document.getElementById("coordQW").value
            );
            const qxValue = parseFloat(
              document.getElementById("coordQX").value
            );
            const qyValue = parseFloat(
              document.getElementById("coordQY").value
            );
            const qzValue = parseFloat(
              document.getElementById("coordQZ").value
            );

            // Build array in basisVector order (A=0, B=1, C=2, D=3) using AXIS_INDEX
            // AXIS_INDEX: { qw: 3, qx: 0, qy: 2, qz: 1 }
            // toCartesian expects (a, b, c, d) = basisVector indices (0, 1, 2, 3)
            let basisOrderQuadray = [0, 0, 0, 0];
            basisOrderQuadray[Quadray.AXIS_INDEX.qw] = qwValue; // D = index 3
            basisOrderQuadray[Quadray.AXIS_INDEX.qx] = qxValue; // A = index 0
            basisOrderQuadray[Quadray.AXIS_INDEX.qy] = qyValue; // C = index 2
            basisOrderQuadray[Quadray.AXIS_INDEX.qz] = qzValue; // B = index 1

            // Convert to Cartesian using basisVector-ordered array
            const newPos = Quadray.toCartesian(
              basisOrderQuadray[0],
              basisOrderQuadray[1],
              basisOrderQuadray[2],
              basisOrderQuadray[3],
              THREE
            );

            // Apply position and persist to StateManager
            selected.forEach(poly => {
              poly.position.copy(newPos);
              console.log(
                `📍 ABSOLUTE QWXYZ position set: QW=${qwValue.toFixed(4)}, QX=${qxValue.toFixed(4)}, QY=${qyValue.toFixed(4)}, QZ=${qzValue.toFixed(4)}`
              );
              persistTransformToState(poly);
            });
          }

          // Update footer coordinate display via module
          if (USE_COORDINATE_MODULE && selected.length > 0) {
            RTCoordinates.updatePositionDisplay(selected[0].position);
          }

          // Update editing basis position if it exists
          if (editingBasis && selected.length > 0) {
            editingBasis.position.copy(selected[0].position);
          }

          // Exit tool mode but keep selection
          exitToolMode();
        }
      });
    });
  }

  /**
   * Setup rotation input handler for ROTATE mode (Degrees fields - XYZ)
   */
  function setupRotateDegreesInputs() {
    const rotInputs = [
      { id: "rotXDegrees", axis: new THREE.Vector3(1, 0, 0), name: "X" },
      { id: "rotYDegrees", axis: new THREE.Vector3(0, 1, 0), name: "Y" },
      { id: "rotZDegrees", axis: new THREE.Vector3(0, 0, 1), name: "Z" },
    ];

    rotInputs.forEach(({ id, axis, name }) => {
      const input = document.getElementById(id);
      if (!input) return;

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && currentGumballTool === "rotate") {
          const degrees = parseFloat(e.target.value);
          if (isNaN(degrees)) return;

          const selected = getSelectedPolyhedra();
          if (selected.length === 0) {
            console.warn("⚠️ No polyhedra selected");
            return;
          }

          const radians = (degrees * Math.PI) / 180;

          // Apply rotation and persist to StateManager
          selected.forEach(poly => {
            poly.rotateOnWorldAxis(axis, radians);
            console.log(
              `🔄 Rotated ${degrees.toFixed(2)}° around ${name} axis`
            );
            persistTransformToState(poly);
          });

          // Exit tool mode but keep selection
          exitToolMode();
        }
      });
    });
  }

  /**
   * Setup rotation input handler for ROTATE mode (Degrees fields - WXYZ)
   */
  function setupRotateQuadrayDegreesInputs() {
    // Correct color-to-axis mapping: W=Yellow(3), X=Red(0), Y=Blue(2), Z=Green(1)
    // quadrayKey maps basisIndex to the quadrayRotation object key
    const rotInputs = [
      {
        id: "rotQWDegrees",
        basisIndex: 3,
        name: "W (Yellow)",
        quadrayKey: "qw",
      },
      { id: "rotQXDegrees", basisIndex: 0, name: "X (Red)", quadrayKey: "qx" },
      { id: "rotQYDegrees", basisIndex: 2, name: "Y (Blue)", quadrayKey: "qy" },
      {
        id: "rotQZDegrees",
        basisIndex: 1,
        name: "Z (Green)",
        quadrayKey: "qz",
      },
    ];

    rotInputs.forEach(({ id, basisIndex, name, quadrayKey }) => {
      const input = document.getElementById(id);
      if (!input) return;

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && currentGumballTool === "rotate") {
          const degrees = parseFloat(e.target.value);
          if (isNaN(degrees)) return;

          const selected = getSelectedPolyhedra();
          if (selected.length === 0) {
            console.warn("⚠️ No polyhedra selected");
            return;
          }

          const radians = (degrees * Math.PI) / 180;
          const axis = Quadray.basisVectors[basisIndex];

          // Apply rotation and persist to StateManager (with cumulative Quadray tracking)
          selected.forEach(poly => {
            poly.rotateOnWorldAxis(axis, radians);
            console.log(
              `🔄 Rotated ${degrees.toFixed(2)}° around ${name} axis`
            );

            // Calculate cumulative Quadray rotation
            if (poly.userData?.instanceId) {
              const instance = RTStateManager.getInstance(
                poly.userData.instanceId
              );
              const existingQuadray = instance?.transform?.quadrayRotation || {
                qw: 0,
                qx: 0,
                qy: 0,
                qz: 0,
              };
              const newQuadrayRotation = { ...existingQuadray };
              newQuadrayRotation[quadrayKey] =
                (existingQuadray[quadrayKey] || 0) + degrees;

              persistTransformToState(poly, {
                quadrayRotation: newQuadrayRotation,
              });
              console.log(
                `📐 Quadray ${quadrayKey.toUpperCase()}: ${newQuadrayRotation[quadrayKey].toFixed(2)}° (cumulative)`
              );
            }
          });

          // Exit tool mode but keep selection
          exitToolMode();
        }
      });
    });
  }

  /**
   * Setup rotation input handler for ROTATE mode (Spread fields - XYZ)
   */
  function setupRotateSpreadInputs() {
    const rotInputs = [
      { id: "rotXSpread", axis: new THREE.Vector3(1, 0, 0), name: "X" },
      { id: "rotYSpread", axis: new THREE.Vector3(0, 1, 0), name: "Y" },
      { id: "rotZSpread", axis: new THREE.Vector3(0, 0, 1), name: "Z" },
    ];

    rotInputs.forEach(({ id, axis, name }) => {
      const input = document.getElementById(id);
      if (!input) return;

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && currentGumballTool === "rotate") {
          const spread = parseFloat(e.target.value);
          if (isNaN(spread)) return;

          const selected = getSelectedPolyhedra();
          if (selected.length === 0) {
            console.warn("⚠️ No polyhedra selected");
            return;
          }

          // Convert spread to radians: spread = sin²(θ), so θ = asin(√spread)
          const degrees = RT.spreadToDegrees(spread);
          const radians = (degrees * Math.PI) / 180;

          // Apply rotation and persist to StateManager
          selected.forEach(poly => {
            poly.rotateOnWorldAxis(axis, radians);
            console.log(
              `🔄 Rotated spread ${spread.toFixed(2)} (${degrees.toFixed(2)}°) around ${name} axis`
            );
            persistTransformToState(poly);
          });

          // Exit tool mode but keep selection
          exitToolMode();
        }
      });
    });
  }

  /**
   * Setup rotation input handler for ROTATE mode (Spread fields - WXYZ)
   */
  function setupRotateQuadraySpreadInputs() {
    // Correct color-to-axis mapping: W=Yellow(3), X=Red(0), Y=Blue(2), Z=Green(1)
    // quadrayKey maps basisIndex to the quadrayRotation object key
    const rotInputs = [
      {
        id: "rotQWSpread",
        basisIndex: 3,
        name: "W (Yellow)",
        quadrayKey: "qw",
      },
      { id: "rotQXSpread", basisIndex: 0, name: "X (Red)", quadrayKey: "qx" },
      { id: "rotQYSpread", basisIndex: 2, name: "Y (Blue)", quadrayKey: "qy" },
      { id: "rotQZSpread", basisIndex: 1, name: "Z (Green)", quadrayKey: "qz" },
    ];

    rotInputs.forEach(({ id, basisIndex, name, quadrayKey }) => {
      const input = document.getElementById(id);
      if (!input) return;

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && currentGumballTool === "rotate") {
          const spread = parseFloat(e.target.value);
          if (isNaN(spread)) return;

          const selected = getSelectedPolyhedra();
          if (selected.length === 0) {
            console.warn("⚠️ No polyhedra selected");
            return;
          }

          // Convert spread to radians: spread = sin²(θ), so θ = asin(√spread)
          const degrees = RT.spreadToDegrees(spread);
          const radians = (degrees * Math.PI) / 180;
          const axis = Quadray.basisVectors[basisIndex];

          // Apply rotation and persist to StateManager (with cumulative Quadray tracking)
          selected.forEach(poly => {
            poly.rotateOnWorldAxis(axis, radians);
            console.log(
              `🔄 Rotated spread ${spread.toFixed(2)} (${degrees.toFixed(2)}°) around ${name} axis`
            );

            // Calculate cumulative Quadray rotation
            if (poly.userData?.instanceId) {
              const instance = RTStateManager.getInstance(
                poly.userData.instanceId
              );
              const existingQuadray = instance?.transform?.quadrayRotation || {
                qw: 0,
                qx: 0,
                qy: 0,
                qz: 0,
              };
              const newQuadrayRotation = { ...existingQuadray };
              newQuadrayRotation[quadrayKey] =
                (existingQuadray[quadrayKey] || 0) + degrees;

              persistTransformToState(poly, {
                quadrayRotation: newQuadrayRotation,
              });
              console.log(
                `📐 Quadray ${quadrayKey.toUpperCase()}: ${newQuadrayRotation[quadrayKey].toFixed(2)}° (cumulative)`
              );
            }
          });

          // Exit tool mode but keep selection
          exitToolMode();
        }
      });
    });
  }

  /**
   * Setup Scale input handler for SCALE mode
   * User can type a scale factor (e.g., 2.0 = double size) and press Enter
   */
  function setupScaleInput() {
    const input = document.getElementById("coordScale");
    if (!input) return;

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && currentGumballTool === "scale") {
        const newScale = parseFloat(e.target.value);
        if (isNaN(newScale) || newScale <= 0) {
          console.warn("⚠️ Invalid scale value (must be positive number)");
          return;
        }

        const selected = getSelectedPolyhedra();
        if (selected.length === 0) {
          console.warn("⚠️ No polyhedra selected");
          return;
        }

        // Apply scale to all selected objects
        selected.forEach(poly => {
          // Apply uniform scale
          poly.scale.set(newScale, newScale, newScale);
          poly.userData.currentScale = newScale;

          console.log(
            `📐 Scaled ${poly.userData.isInstance ? "Instance" : "Form"}: ${newScale.toFixed(4)}`
          );
          persistTransformToState(poly, {
            scale: { x: newScale, y: newScale, z: newScale },
          });
        });

        // Update footer display
        if (USE_COORDINATE_MODULE) {
          RTCoordinates.updateScaleDisplay(newScale);
        }

        // Exit tool mode but keep selection
        exitToolMode();
      }
    });
  }

  // Initialize all coordinate/rotation input handlers
  setupMoveCoordinateInputs();
  setupMoveQuadrayInputs();
  setupRotateDegreesInputs();
  setupRotateQuadrayDegreesInputs();
  setupRotateSpreadInputs();
  setupRotateQuadraySpreadInputs();
  setupScaleInput();

  // ========================================================================
  // EDITING BASIS MANAGEMENT (Localized Gumball)
  // ========================================================================

  /**
   * Calculate optimal handle length based on object's bounding sphere
   *
   * For adaptive gumball sizing - handles extend just beyond the object's
   * circumsphere so they remain visible and grabbable for any size polyhedron.
   *
   * @param {THREE.Object3D} selectedObject - The selected polyhedron
   * @returns {number} Optimal handle length with padding
   */
  function calculateHandleLength(selectedObject) {
    if (!selectedObject) {
      // Fallback to tetEdge if no object
      return parseFloat(document.getElementById("tetScaleSlider").value);
    }

    // 1. Compute bounding box of the object
    const boundingBox = new THREE.Box3().setFromObject(selectedObject);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // 2. Calculate circumsphere radius (half of bounding box diagonal)
    // This ensures handles extend beyond the farthest vertex
    const circumRadius = size.length() / 2;

    // 3. Add padding (15% beyond bounding sphere) for comfortable grab zone
    const paddingFactor = 1.15;
    const handleLength = circumRadius * paddingFactor;

    // 4. Apply min/max constraints to keep handles usable
    const minHandleLength = 1.0; // Never smaller than 1 unit
    const maxHandleLength = 20.0; // Cap at 20 to prevent unwieldy handles

    return Math.min(Math.max(handleLength, minHandleLength), maxHandleLength);
  }

  /**
   * Create EDITING BASIS (localized gumball) at specified position
   *
   * SYSTEMS 3 & 4 OF 4: Interactive transformation handles for selected Forms
   *
   * SYSTEM 3: Editing Quadray Basis (WXYZ)
   * - Location: rt-init.js (this file)
   * - Purpose: Interactive Move/Scale/Rotate handles for tetrahedral coordinates
   * - Scaling: Adaptive - scales based on selected object's bounding sphere
   * - Visual: Conical arrows (Move/Scale) or hexagonal rotation handles (Rotate)
   * - Interaction: Click/drag to transform selected Form in WXYZ coordinates
   *
   * SYSTEM 4: Editing Cartesian Basis (XYZ)
   * - Location: rt-init.js (this file)
   * - Purpose: Interactive Move/Scale/Rotate handles for orthogonal coordinates
   * - Scaling: Adaptive - scales based on selected object's bounding sphere
   * - Visual: Conical arrows (Move/Scale) or circular rotation handles (Rotate)
   * - Interaction: Click/drag to transform selected Form in XYZ coordinates
   *
   * See also: Symbolic basis vectors in rt-rendering.js (non-interactive reference)
   *
   * @param {THREE.Vector3} position - Position to create the basis at
   * @param {THREE.Group} selectedObject - The selected form/instance for sizing (used for adaptive handle length)
   */
  function createEditingBasis(position, selectedObject) {
    // Remove existing editing basis if any
    if (editingBasis) {
      scene.remove(editingBasis);
    }

    // Create new group for editing basis
    editingBasis = new THREE.Group();
    editingBasis.position.copy(position);

    // Check which coordinate systems are enabled in UI
    const showCartesian = document.getElementById("showCartesianBasis").checked;
    const showQuadray = document.getElementById("showQuadray").checked;

    // Calculate adaptive handle length based on object's bounding sphere
    // Handles will extend just beyond the object for visibility/grabability
    const arrowLength = calculateHandleLength(selectedObject);
    const headLength = Math.max(0.2, arrowLength * 0.1); // Scale head proportionally

    // Determine handle type based on active tool
    const isScaleMode = currentGumballTool === "scale";
    const isRotateMode = currentGumballTool === "rotate";

    // ========================================================================
    // QUADRAY BASIS VECTORS (WXYZ) - Tetrahedral coordinate system
    // ========================================================================
    if (showQuadray) {
      const quadrayColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]; // R, G, B, Y

      Quadray.basisVectors.forEach((vec, i) => {
        if (isRotateMode) {
          // ROTATE MODE: Torus handle perpendicular to axis
          const circleRadius = arrowLength * 0.9; // Slightly smaller than arrow length

          // Orient perpendicular to the axis vector
          const defaultNormal = new THREE.Vector3(0, 0, 1);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            defaultNormal,
            vec
          );

          // Torus rotation handle (clean, no extra line loop)
          const hitThickness = Math.max(0.07, arrowLength * 0.033);
          const handle = new THREE.Mesh(
            new THREE.TorusGeometry(circleRadius, hitThickness, 16, 64),
            new THREE.MeshBasicMaterial({
              color: quadrayColors[i],
              transparent: true,
              opacity: 0.5,
              depthTest: false,
            })
          );

          handle.setRotationFromQuaternion(quaternion);
          handle.userData.basisType = "quadray";
          handle.userData.basisIndex = i;
          handle.userData.basisAxis = vec.clone();
          handle.userData.isGumballHandle = true;
          handle.userData.isRotationHandle = true;

          editingBasis.add(handle);
        } else {
          // MOVE/SCALE MODE: Arrow shaft with handle at tip
          const tipPosition = vec.clone().multiplyScalar(arrowLength);

          // Scale handle sizes proportionally (min sizes for small objects)
          const cubeSize = Math.max(0.3, arrowLength * 0.12);
          const tetraSize = Math.max(0.35, arrowLength * 0.14);

          let handle;
          if (isScaleMode) {
            // SCALE MODE: Arrow with no head, cube handle at tip
            const arrow = new THREE.ArrowHelper(
              vec,
              new THREE.Vector3(0, 0, 0),
              arrowLength,
              quadrayColors[i],
              0, // No arrowhead in Scale mode
              0
            );
            editingBasis.add(arrow);

            // Cube handle (visible, same style as working scale cubes)
            handle = new THREE.Mesh(
              new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
              new THREE.MeshBasicMaterial({
                color: quadrayColors[i],
                transparent: true,
                opacity: 0.5,
                depthTest: true,
              })
            );
          } else {
            // MOVE MODE: Arrow with no head, tetrahedron handle at tip
            const arrow = new THREE.ArrowHelper(
              vec,
              new THREE.Vector3(0, 0, 0),
              arrowLength,
              quadrayColors[i],
              0, // No arrowhead - using tetrahedron instead
              0
            );
            editingBasis.add(arrow);

            // Tetrahedron handle (visible, same opacity style as scale cubes)
            const tetraGeom = new THREE.TetrahedronGeometry(tetraSize);
            handle = new THREE.Mesh(
              tetraGeom,
              new THREE.MeshBasicMaterial({
                color: quadrayColors[i],
                transparent: true,
                opacity: 0.5,
                depthTest: true,
              })
            );

            // Orient tetrahedron so one VERTEX points along the axis direction
            // (matching quadray basis vector tetrahedra orientation from rt-grids.js)
            // Find the vertex closest to pointing in our axis direction
            const posAttr = tetraGeom.getAttribute("position");
            let bestVertex = new THREE.Vector3();
            let maxDot = -Infinity;
            for (let vi = 0; vi < posAttr.count; vi++) {
              const v = new THREE.Vector3().fromBufferAttribute(posAttr, vi);
              const dot = v.clone().normalize().dot(vec);
              if (dot > maxDot) {
                maxDot = dot;
                bestVertex.copy(v);
              }
            }
            // Orient so that vertex points along our axis
            const currentDir = bestVertex.clone().normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(
              currentDir,
              vec
            );
            handle.setRotationFromQuaternion(quaternion);
          }

          handle.position.copy(tipPosition);
          handle.userData.basisType = "quadray";
          handle.userData.basisIndex = i;
          handle.userData.basisAxis = vec.clone();
          handle.userData.isGumballHandle = true;

          editingBasis.add(handle);
        }
      });
    }

    // ========================================================================
    // CARTESIAN BASIS VECTORS (XYZ) - Standard orthogonal coordinate system
    // ========================================================================
    if (showCartesian) {
      const cartesianVectors = [
        new THREE.Vector3(1, 0, 0), // X-axis (red)
        new THREE.Vector3(0, 1, 0), // Y-axis (green)
        new THREE.Vector3(0, 0, 1), // Z-axis (blue)
      ];
      const cartesianColors = [0xff0000, 0x00ff00, 0x0000ff]; // R, G, B

      cartesianVectors.forEach((vec, i) => {
        if (isRotateMode) {
          // ROTATE MODE: Torus handle perpendicular to axis
          const circleRadius = arrowLength * 0.9; // Slightly smaller than arrow length

          // Orient perpendicular to the axis vector
          const defaultNormal = new THREE.Vector3(0, 0, 1);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            defaultNormal,
            vec
          );

          // Torus rotation handle (clean, no extra line loop)
          const hitThickness = Math.max(0.07, arrowLength * 0.033);
          const handle = new THREE.Mesh(
            new THREE.TorusGeometry(circleRadius, hitThickness, 16, 64),
            new THREE.MeshBasicMaterial({
              color: cartesianColors[i],
              transparent: true,
              opacity: 0.5,
              depthTest: false,
            })
          );

          handle.setRotationFromQuaternion(quaternion);
          handle.userData.basisType = "cartesian";
          handle.userData.basisIndex = i;
          handle.userData.basisAxis = vec.clone();
          handle.userData.isGumballHandle = true;
          handle.userData.isRotationHandle = true;

          editingBasis.add(handle);
        } else {
          // MOVE/SCALE MODE: Arrow shaft with handle at tip
          const tipPosition = vec.clone().multiplyScalar(arrowLength);

          // Scale handle sizes proportionally (min sizes for small objects)
          const cubeSize = Math.max(0.3, arrowLength * 0.12);
          const tetraSize = Math.max(0.35, arrowLength * 0.14);

          let handle;
          if (isScaleMode) {
            // SCALE MODE: Arrow with no head, cube handle at tip
            const arrow = new THREE.ArrowHelper(
              vec,
              new THREE.Vector3(0, 0, 0),
              arrowLength,
              cartesianColors[i],
              0, // No arrowhead in Scale mode
              0
            );
            editingBasis.add(arrow);

            // Cube handle (visible, same style as working scale cubes)
            handle = new THREE.Mesh(
              new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
              new THREE.MeshBasicMaterial({
                color: cartesianColors[i],
                transparent: true,
                opacity: 0.5,
                depthTest: true,
              })
            );
          } else {
            // MOVE MODE: Arrow with no head, tetrahedron handle at tip
            const arrow = new THREE.ArrowHelper(
              vec,
              new THREE.Vector3(0, 0, 0),
              arrowLength,
              cartesianColors[i],
              0, // No arrowhead - using tetrahedron instead
              0
            );
            editingBasis.add(arrow);

            // Tetrahedron handle (visible, same opacity style as scale cubes)
            const tetraGeom = new THREE.TetrahedronGeometry(tetraSize);
            handle = new THREE.Mesh(
              tetraGeom,
              new THREE.MeshBasicMaterial({
                color: cartesianColors[i],
                transparent: true,
                opacity: 0.5,
                depthTest: true,
              })
            );

            // Orient tetrahedron so one VERTEX points along the axis direction
            // (matching quadray basis vector tetrahedra orientation from rt-grids.js)
            // Find the vertex closest to pointing in our axis direction
            const posAttr = tetraGeom.getAttribute("position");
            let bestVertex = new THREE.Vector3();
            let maxDot = -Infinity;
            for (let vi = 0; vi < posAttr.count; vi++) {
              const v = new THREE.Vector3().fromBufferAttribute(posAttr, vi);
              const dot = v.clone().normalize().dot(vec);
              if (dot > maxDot) {
                maxDot = dot;
                bestVertex.copy(v);
              }
            }
            // Orient so that vertex points along our axis
            const currentDir = bestVertex.clone().normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(
              currentDir,
              vec
            );
            handle.setRotationFromQuaternion(quaternion);
          }

          handle.position.copy(tipPosition);
          handle.userData.basisType = "cartesian";
          handle.userData.basisIndex = i;
          handle.userData.basisAxis = vec.clone();
          handle.userData.isGumballHandle = true;

          editingBasis.add(handle);
        }
      });
    }

    // ========================================================================
    // CENTRAL SPHERE for UNIFORM SCALING (Scale mode only)
    // ========================================================================
    if (isScaleMode) {
      // Scale central sphere proportionally (min 0.4, ~18% of arrow length)
      const centralRadius = Math.max(0.4, arrowLength * 0.18);
      const centralSphere = new THREE.Mesh(
        new THREE.SphereGeometry(centralRadius, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.4,
          depthTest: true,
        })
      );

      centralSphere.position.set(0, 0, 0); // At gumball origin
      centralSphere.userData.isGumballHandle = true;
      centralSphere.userData.basisType = "uniform";
      centralSphere.userData.basisIndex = -1; // Special index for uniform
      centralSphere.userData.basisAxis = null; // No specific axis (uniform)

      editingBasis.add(centralSphere);
    }

    scene.add(editingBasis);

    // Log basis sizing for debugging adaptive scaling
    const systems = [];
    if (showCartesian) systems.push("XYZ");
    if (showQuadray) systems.push("WXYZ");
    console.log(
      `✅ Editing basis created: ${systems.join("+")} | arrowLength=${arrowLength.toFixed(2)} (adaptive) headLength=${headLength.toFixed(2)}`
    );
  }

  /**
   * Update editing basis position to follow selected object
   */
  function updateEditingBasisPosition(position) {
    if (editingBasis) {
      editingBasis.position.copy(position);
    }
  }

  /**
   * Destroy editing basis (when tool deactivated)
   */
  function destroyEditingBasis() {
    if (editingBasis) {
      scene.remove(editingBasis);
      editingBasis = null;
    }
    hoveredHandle = null;
  }

  /**
   * Apply hover highlight to a gumball handle's arrowhead
   * Increases opacity to make the handle appear more solid/vivid
   * @param {THREE.Mesh} handle - The hit zone mesh (contains reference to arrowCone)
   */
  function applyHandleHover(handle) {
    if (!handle) return;

    // Get the actual visual element to highlight (arrowhead cone or the handle itself)
    const visualTarget = handle.userData.arrowCone || handle;
    if (!visualTarget || !visualTarget.material) return;

    // Store original opacity if not already stored
    if (visualTarget.userData.originalOpacity === undefined) {
      visualTarget.userData.originalOpacity = visualTarget.material.opacity;
    }

    // Make material transparent if not already (required for opacity changes)
    visualTarget.material.transparent = true;

    // Increase opacity to make arrowhead more solid/vivid (preserves color)
    visualTarget.material.opacity = 1.0;

    // Change cursor to indicate interactivity
    renderer.domElement.style.cursor = "pointer";
  }

  /**
   * Remove hover highlight from a gumball handle's arrowhead
   * @param {THREE.Mesh} handle - The hit zone mesh (contains reference to arrowCone)
   */
  function clearHandleHover(handle) {
    if (!handle) return;

    // Get the actual visual element that was highlighted
    const visualTarget = handle.userData.arrowCone || handle;
    if (!visualTarget || !visualTarget.material) return;

    // Restore original opacity
    if (visualTarget.userData.originalOpacity !== undefined) {
      visualTarget.material.opacity = visualTarget.userData.originalOpacity;
    }

    // Reset cursor
    renderer.domElement.style.cursor = "default";
  }

  /**
   * Handle mousemove for gumball handle hover detection
   * @param {MouseEvent} event - The mousemove event
   */
  function onGumballHover(event) {
    if (!editingBasis || !raycaster || !mouse || isDragging) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // IMPORTANT: Get CURRENT camera from renderingAPI (may have switched to orthographic)
    const currentCamera = renderingAPI.getCamera();
    raycaster.setFromCamera(mouse, currentCamera);

    // Get camera view direction for filtering edge-on rotation rings
    const cameraDirection = new THREE.Vector3();
    currentCamera.getWorldDirection(cameraDirection);

    // Collect all gumball handle hit targets
    // Filter out rotation rings that are edge-on to the camera (unreliable in orthographic)
    const hitTargets = [];
    editingBasis.traverse(obj => {
      if (obj.userData.isGumballHandle) {
        // For rotation handles, filter out rings that are edge-on to the camera
        if (obj.userData.isRotationHandle && obj.userData.basisAxis) {
          const dotProduct = Math.abs(
            cameraDirection.dot(obj.userData.basisAxis)
          );
          // If dot product < 0.15, the ring is nearly edge-on - skip it
          if (dotProduct < 0.15) {
            return;
          }
        }
        hitTargets.push(obj);
      }
    });

    const intersects = raycaster.intersectObjects(hitTargets, false);

    if (intersects.length > 0) {
      const newHoveredHandle = intersects[0].object;

      // Only update if hover target changed
      if (newHoveredHandle !== hoveredHandle) {
        // Clear previous hover
        if (hoveredHandle) {
          clearHandleHover(hoveredHandle);
        }
        // Apply new hover
        hoveredHandle = newHoveredHandle;
        applyHandleHover(hoveredHandle);
      }
    } else {
      // Not hovering over any handle
      if (hoveredHandle) {
        clearHandleHover(hoveredHandle);
        hoveredHandle = null;
      }
    }
  }

  // Raycaster for handle selection (will be initialized after scene)
  let raycaster;
  let mouse;

  // ========================================================================
  // SELECTION SYSTEM
  // ========================================================================

  /**
   * Select a polyhedron (Form or Instance) with visual highlight
   * @param {THREE.Group} polyhedron - Polyhedron to select
   * @param {boolean} addToSelection - If true (Shift+click), toggle in multi-selection
   */
  function selectPolyhedron(polyhedron, addToSelection = false) {
    if (addToSelection) {
      // Shift+click: Toggle object in multi-selection
      if (RTStateManager.isSelected(polyhedron)) {
        // Already selected - remove from selection
        clearHighlight(polyhedron);
        RTStateManager.removeFromSelection(polyhedron);

        // Update currentSelection to match state manager's primary
        currentSelection = RTStateManager.state.selection.object;
      } else {
        // Not selected - add to selection
        applyHighlight(polyhedron);
        RTStateManager.addToSelection(polyhedron);

        // If this is the first selection, also set as primary/current
        if (!currentSelection) {
          currentSelection = polyhedron;
          RTStateManager.state.selection.object = polyhedron;
          RTStateManager.state.selection.type = polyhedron.userData.isInstance
            ? "instance"
            : "form";
          RTStateManager.state.selection.id =
            polyhedron.userData.instanceId || null;
        }
      }

      // Update UI selection count
      updateSelectionCountUI();

      // Update coordinate display for multi-selection
      if (USE_COORDINATE_MODULE) {
        RTCoordinates.onSelectionChange(RTStateManager.getSelectedObjects());
      }
    } else {
      // Normal click: Clear previous selection(s), select only this one
      // Clear all existing selections
      RTStateManager.getSelectedObjects().forEach(obj => {
        clearHighlight(obj);
      });
      RTStateManager.clearSelection();

      // Set new selection
      currentSelection = polyhedron;
      RTStateManager.addToSelection(polyhedron);
      RTStateManager.state.selection.object = polyhedron;
      RTStateManager.state.selection.type = polyhedron.userData.isInstance
        ? "instance"
        : "form";
      RTStateManager.state.selection.id =
        polyhedron.userData.instanceId || null;

      // Apply highlight
      applyHighlight(polyhedron);

      // AUTO-SELECT connected Points when selecting a connectedLine
      if (
        polyhedron.userData.type === "connectedLine" &&
        polyhedron.userData.connections
      ) {
        const { startPoint, endPoint } = polyhedron.userData.connections;
        const startInst = RTStateManager.getInstance(startPoint);
        const endInst = RTStateManager.getInstance(endPoint);

        if (startInst?.threeObject) {
          applyHighlight(startInst.threeObject);
          RTStateManager.addToSelection(startInst.threeObject);
        }
        if (endInst?.threeObject) {
          applyHighlight(endInst.threeObject);
          RTStateManager.addToSelection(endInst.threeObject);
        }
      }

      // Update UI selection count
      updateSelectionCountUI();

      // Update coordinate display to show selected object's position/rotation
      if (USE_COORDINATE_MODULE) {
        // Use RTCoordinates module - reads from StateManager for accurate values
        RTCoordinates.onSelectionChange(RTStateManager.getSelectedObjects());
      } else {
        // Legacy: just position display
        updateCoordinateDisplay(polyhedron.position);
      }
    }
  }

  /**
   * Update the UI to show selection count
   */
  function updateSelectionCountUI() {
    const count = RTStateManager.getSelectionCount();
    // Update "Objects Placed" or similar UI element if it exists
    const selectionCountEl = document.getElementById("selectionCount");
    if (selectionCountEl) {
      selectionCountEl.textContent =
        count > 0 ? `${count} selected` : "None selected";
    }
    // Log for debugging
    if (count > 1) {
      console.log(`📦 Multi-select: ${count} objects selected`);
    }

    // Update RTCoordinates Group Centre button state
    if (USE_COORDINATE_MODULE) {
      RTCoordinates.updateGroupCentreButtonState(count);
    }
  }

  /**
   * Apply highlight glow to selected polyhedron
   * Enhanced with stronger emissive and thicker edges for visibility
   */
  function applyHighlight(polyhedron) {
    polyhedron.traverse(obj => {
      if (obj.isMesh) {
        // Store original emissive for restoration (check if emissive exists)
        if (obj.material.emissive) {
          obj.userData.originalEmissive = obj.material.emissive.clone();
          obj.userData.originalEmissiveIntensity =
            obj.material.emissiveIntensity;

          // Apply bright cyan glow (more intense and visible)
          obj.material.emissive.setHex(0x00ffff);
          obj.material.emissiveIntensity = 0.8;
        }
      } else if (obj.isLine) {
        // Store original line width and color
        obj.userData.originalLineWidth = obj.material.linewidth || 1;

        // Handle LineMaterial (Line2) vs LineBasicMaterial
        if (obj.material.isLineMaterial) {
          // LineMaterial stores color as a Color object
          obj.userData.originalColor = obj.material.color.getHex();
          obj.material.color.setHex(0x00ffff); // Cyan highlight
          obj.material.linewidth =
            (obj.userData.originalLineWidth || 0.002) * 1.5;
        } else if (obj.material.color) {
          // LineBasicMaterial
          obj.userData.originalColor = obj.material.color.getHex();
          obj.material.color.setHex(0x00ffff);
          obj.material.linewidth = 3;
        }
      }
    });
  }

  /**
   * Clear highlight from polyhedron
   */
  function clearHighlight(polyhedron) {
    polyhedron.traverse(obj => {
      if (obj.isMesh) {
        // Restore original emissive if it was saved
        if (obj.userData.originalEmissive) {
          obj.material.emissive.copy(obj.userData.originalEmissive);
          obj.material.emissiveIntensity =
            obj.userData.originalEmissiveIntensity;
          // Clean up stored data
          delete obj.userData.originalEmissive;
          delete obj.userData.originalEmissiveIntensity;
        } else if (obj.material.emissive) {
          // Fallback: reset to black emissive (default for non-node meshes)
          // Note: Node meshes should have originalEmissive saved, but this
          // catches any edge cases where it wasn't stored
          obj.material.emissive.setHex(0x000000);
          obj.material.emissiveIntensity = 0;
        }
      } else if (obj.isLine) {
        // Restore original line width
        if (obj.userData.originalLineWidth !== undefined) {
          obj.material.linewidth = obj.userData.originalLineWidth;
          delete obj.userData.originalLineWidth;
        }
        // Restore original color
        if (obj.userData.originalColor !== undefined && obj.material.color) {
          obj.material.color.setHex(obj.userData.originalColor);
          delete obj.userData.originalColor;
        }
      }
    });
  }

  // ========================================================================
  // VERTEX NODE SELECTION (Individual node highlighting)
  // ========================================================================

  /**
   * Apply highlight to a single vertex node (yellow glow for selection)
   * @param {THREE.Mesh} nodeMesh - The vertex node mesh to highlight
   */
  function applyNodeHighlight(nodeMesh) {
    if (!nodeMesh?.isMesh || !nodeMesh.userData.isVertexNode) return;

    // Store original colors if not already stored
    if (!nodeMesh.userData.nodeOriginalColor) {
      nodeMesh.userData.nodeOriginalColor = nodeMesh.material.color.getHex();
      nodeMesh.userData.nodeOriginalEmissive =
        nodeMesh.material.emissive.getHex();
      nodeMesh.userData.nodeOriginalEmissiveIntensity =
        nodeMesh.material.emissiveIntensity;
    }

    // Apply yellow highlight (distinct from cyan object selection)
    nodeMesh.material.color.setHex(0xffff00); // Yellow
    nodeMesh.material.emissive.setHex(0xffff00);
    nodeMesh.material.emissiveIntensity = 0.8;
  }

  /**
   * Clear highlight from a single vertex node
   * @param {THREE.Mesh} nodeMesh - The vertex node mesh to unhighlight
   */
  function clearNodeHighlight(nodeMesh) {
    if (!nodeMesh?.isMesh || !nodeMesh.userData.isVertexNode) return;

    // Restore original colors
    if (nodeMesh.userData.nodeOriginalColor !== undefined) {
      nodeMesh.material.color.setHex(nodeMesh.userData.nodeOriginalColor);
      nodeMesh.material.emissive.setHex(nodeMesh.userData.nodeOriginalEmissive);
      nodeMesh.material.emissiveIntensity =
        nodeMesh.userData.nodeOriginalEmissiveIntensity;

      // Clean up stored data
      delete nodeMesh.userData.nodeOriginalColor;
      delete nodeMesh.userData.nodeOriginalEmissive;
      delete nodeMesh.userData.nodeOriginalEmissiveIntensity;
    }
  }

  /**
   * Clear all vertex node selections and their highlights
   */
  function clearAllNodeSelections() {
    const selectedNodes = RTStateManager.getSelectedVertices();
    selectedNodes.forEach(node => {
      clearNodeHighlight(node);
    });
    RTStateManager.clearVertexSelection();
    RTStateManager.exitVertexMode();
    updateNodeSelectionUI();
  }

  /**
   * Update UI to show node selection count
   */
  function updateNodeSelectionUI() {
    const count = RTStateManager.getSelectedVertexCount();
    const nodeCountEl = document.getElementById("nodeSelectionCount");
    if (nodeCountEl) {
      nodeCountEl.textContent =
        count > 0 ? `${count} node${count > 1 ? "s" : ""} selected` : "";
    }
    if (count > 0) {
      console.log(`🔵 Node selection: ${count} vertices selected`);
    }
  }

  /**
   * Deselect all polyhedra (clears multi-selection)
   */
  function deselectAll() {
    // Clear highlights from all selected objects
    RTStateManager.getSelectedObjects().forEach(obj => {
      clearHighlight(obj);
    });
    // Clear state manager selection
    RTStateManager.clearSelection();
    // Clear local reference
    currentSelection = null;
    // Update UI
    updateSelectionCountUI();
  }

  /**
   * Handle canvas click for object selection
   */
  function onCanvasClick(event) {
    // Don't select during drag operations
    if (isDragging) return;

    // Don't deselect immediately after completing a drag
    if (justFinishedDrag) {
      justFinishedDrag = false;
      return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const selectionRaycaster = new THREE.Raycaster();

    // Set line threshold to 0.1 for precise edge selection (default is 1)
    // With threshold=1, you could click 1 unit away from edges (2x cube width!)
    // threshold=0.1 allows clicking within 0.1 units of edges
    selectionRaycaster.params.Line.threshold = 0.1;

    selectionRaycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    // Collect all selectable polyhedra (Forms and Instances)
    const selectableObjects = [];

    // Forms (including geodesics and matrix forms)
    const formGroups = [
      pointGroup,
      lineGroup,
      polygonGroup,
      prismGroup,
      coneGroup,
      tetrahelix1Group,
      tetrahelix2Group,
      tetrahelix3Group,
      cubeGroup,
      tetrahedronGroup,
      dualTetrahedronGroup,
      octahedronGroup,
      icosahedronGroup,
      dodecahedronGroup,
      dualIcosahedronGroup,
      cuboctahedronGroup,
      rhombicDodecahedronGroup,
      geodesicIcosahedronGroup,
      geodesicTetrahedronGroup,
      geodesicOctahedronGroup,
      cubeMatrixGroup,
      tetMatrixGroup,
      octaMatrixGroup,
      cuboctaMatrixGroup,
      rhombicDodecMatrixGroup,
      radialCubeMatrixGroup,
      radialRhombicDodecMatrixGroup,
      radialTetMatrixGroup,
      radialOctMatrixGroup,
      radialVEMatrixGroup,
      quadrayTetrahedronGroup,
      quadrayTetraDeformedGroup,
      quadrayCuboctahedronGroup,
      quadrayOctahedronGroup,
      quadrayTruncatedTetGroup,
      quadrayStellaOctangulaGroup,
      penroseTilingGroup,
    ];

    formGroups.forEach(group => {
      if (group && group.visible && group.children.length > 0) {
        // Collect all meshes/lines from group for raycasting
        group.traverse(obj => {
          if (obj.isMesh || obj.isLine) {
            selectableObjects.push({ object: obj, parent: group });
          }
        });
      }
    });

    // Instances (from RTStateManager)
    RTStateManager.getAllInstances().forEach(instance => {
      if (instance.threeObject && instance.threeObject.visible) {
        instance.threeObject.traverse(obj => {
          if (obj.isMesh || obj.isLine) {
            selectableObjects.push({
              object: obj,
              parent: instance.threeObject,
            });
          }
        });
      }
    });

    // Raycast
    const intersects = selectionRaycaster.intersectObjects(
      selectableObjects.map(item => item.object),
      false
    );

    if (intersects.length > 0) {
      // Find parent group from hit object
      const hitObject = intersects[0].object;
      const parentEntry = selectableObjects.find(
        item => item.object === hitObject
      );

      if (parentEntry) {
        // Check if we clicked a vertex node on an INSTANCE
        const isVertexNode = hitObject.userData.isVertexNode;
        const isInstance = parentEntry.parent.userData.isInstance;
        const parentType = parentEntry.parent.userData.type;

        // Exclude Points from vertex node selection - a Point IS its own node,
        // so selecting it should use normal object selection (enabling Shift+click
        // multi-select for Connect functionality)
        if (isVertexNode && isInstance && parentType !== "point") {
          // VERTEX NODE SELECTION on an instance (but not Points)
          handleVertexNodeClick(hitObject, parentEntry.parent, event.shiftKey);
        } else {
          // Normal object selection
          // If we were in vertex mode, exit it first
          if (RTStateManager.isVertexMode()) {
            clearAllNodeSelections();
          }
          selectPolyhedron(parentEntry.parent, event.shiftKey);
        }
      }
    }
    // NOTE: Clicking empty space no longer deselects
    // Deselection now requires: ESC key OR NOW button
    // This allows users to orbit camera between transformations without losing selection
  }

  /**
   * Handle click on a vertex node (for node selection)
   * Node clicks select individual nodes and implicitly select the parent polyhedron
   * for transform operations, but use the NODE as the transform origin (not centroid).
   * @param {THREE.Mesh} nodeMesh - The vertex node that was clicked
   * @param {THREE.Group} parentPoly - The parent polyhedron instance
   * @param {boolean} addToSelection - If true (Shift+click), toggle in selection
   */
  function handleVertexNodeClick(nodeMesh, parentPoly, addToSelection) {
    // If switching to a different polyhedron's nodes, clear previous node selection
    if (
      RTStateManager.isVertexMode() &&
      RTStateManager.state.selection.object !== parentPoly
    ) {
      clearAllNodeSelections();
      // Also clear object selection when switching polyhedra
      RTStateManager.getSelectedObjects().forEach(obj => clearHighlight(obj));
      RTStateManager.clearSelection();
    }

    // Enter vertex mode on this polyhedron (tracks which poly we're editing nodes on)
    if (!RTStateManager.isVertexMode()) {
      RTStateManager.enterVertexMode(parentPoly);
    }

    // Ensure the parent polyhedron is in the object selection (for Move/Rotate/Scale)
    // but DON'T apply the cyan highlight - we want node-only yellow highlight
    if (!RTStateManager.isSelected(parentPoly)) {
      RTStateManager.addToSelection(parentPoly);
      currentSelection = parentPoly;
      // Note: No applyHighlight(parentPoly) - the node highlight is sufficient
    }

    if (addToSelection) {
      // Shift+click: Toggle node in selection
      if (RTStateManager.isVertexSelected(nodeMesh)) {
        // Already selected - deselect
        clearNodeHighlight(nodeMesh);
        RTStateManager.deselectVertex(nodeMesh);
      } else {
        // Not selected - add to selection
        applyNodeHighlight(nodeMesh);
        RTStateManager.selectVertex(nodeMesh);
      }
    } else {
      // Normal click: Clear previous node selection, select only this one
      RTStateManager.getSelectedVertices().forEach(node => {
        clearNodeHighlight(node);
      });
      RTStateManager.clearVertexSelection();

      // Select the clicked node
      applyNodeHighlight(nodeMesh);
      RTStateManager.selectVertex(nodeMesh);
    }

    updateNodeSelectionUI();
  }

  // Get selected polyhedra - returns all selected objects (multi-select aware)
  function getSelectedPolyhedra() {
    const selected = RTStateManager.getSelectedObjects();
    if (selected.length > 0) {
      return selected;
    }
    // Fallback to currentSelection for backwards compatibility
    if (currentSelection) {
      return [currentSelection];
    }
    return [];
  }

  // Janus transition functions now in RTJanus module (rt-janus.js)

  /**
   * Update connected geometry for moved Point instances (Bug 7 fix)
   * Uses selective per-line updates, skipping lines where BOTH endpoints moved
   * @param {Array} polyhedra - Array of moved polyhedra (selectedPolyhedra)
   */
  function updateMovedPointConnections(polyhedra) {
    const movedPointIds = new Set(
      polyhedra
        .filter(p => p.userData.type === "point" && p.userData.instanceId)
        .map(p => p.userData.instanceId)
    );
    polyhedra.forEach(poly => {
      if (
        poly.userData.isInstance &&
        poly.userData.type === "point" &&
        poly.userData.instanceId
      ) {
        RTStateManager.updateConnectedGeometrySelective(
          poly.userData.instanceId,
          movedPointIds
        );
      }
    });
  }

  /**
   * Update all connected line geometry for Point instances (non-selective)
   * Used for rubberband effect during drag/rotate - always updates all lines
   * even when both endpoints move together (midpoint still shifts)
   * @param {Array} polyhedra - Array of polyhedra being moved/rotated
   */
  function updateConnectedLinesRubberband(polyhedra) {
    polyhedra.forEach(poly => {
      if (
        poly.userData.isInstance &&
        poly.userData.type === "point" &&
        poly.userData.instanceId
      ) {
        RTStateManager.updateConnectedGeometry(poly.userData.instanceId);
      }
    });
  }

  // ========================================================================
  // OBJECT SNAPPING HELPER FUNCTIONS
  // ========================================================================
  // Pure geometry functions extracted to rt-snap-geometry.js (Jan 30, 2026)
  // Wrapper functions below pass THREE reference to imported functions

  /**
   * Get all vertices of a polyhedron in world coordinates
   * @param {THREE.Group} polyGroup - Polyhedron group
   * @returns {Array<THREE.Vector3>} Array of vertex positions in world space
   */
  function getPolyhedronVertices(polyGroup) {
    return getVertices(polyGroup, THREE);
  }

  /**
   * Get all edge midpoints of a polyhedron in world coordinates
   * @param {THREE.Group} polyGroup - Polyhedron group
   * @returns {Array<THREE.Vector3>} Array of edge midpoint positions in world space
   */
  function getPolyhedronEdgeMidpoints(polyGroup) {
    return getEdgeMidpoints(polyGroup, THREE);
  }

  /**
   * Get all face centroids of a polyhedron in world coordinates
   * @param {THREE.Group} polyGroup - Polyhedron group
   * @returns {Array<THREE.Vector3>} Array of face centroid positions in world space
   */
  function getPolyhedronFaceCentroids(polyGroup) {
    return getFaceCentroids(polyGroup, THREE);
  }

  /**
   * Find the nearest snap target from all visible polyhedra (excluding the dragged one)
   * @param {THREE.Vector3} position - Current position to snap from
   * @param {THREE.Group} excludeGroup - The polyhedron being dragged (exclude from targets)
   * @param {number} threshold - Maximum distance for snapping
   * @returns {Object|null} { type, position, distance } or null if no target found
   */
  function findNearestSnapTarget(position, excludeGroup, threshold = 0.5) {
    let nearest = null;
    let nearestDistance = threshold;

    // Collect all visible polyhedra (Forms and Instances)
    const targetGroups = [];

    // Forms
    const formGroups = [
      pointGroup,
      lineGroup,
      polygonGroup,
      prismGroup,
      coneGroup,
      tetrahelix1Group,
      tetrahelix2Group,
      tetrahelix3Group,
      cubeGroup,
      tetrahedronGroup,
      dualTetrahedronGroup,
      octahedronGroup,
      icosahedronGroup,
      dodecahedronGroup,
      dualIcosahedronGroup,
      cuboctahedronGroup,
      rhombicDodecahedronGroup,
      geodesicIcosahedronGroup,
      geodesicTetrahedronGroup,
      geodesicOctahedronGroup,
      cubeMatrixGroup,
      tetMatrixGroup,
      octaMatrixGroup,
      cuboctaMatrixGroup,
      rhombicDodecMatrixGroup,
      radialCubeMatrixGroup,
      radialRhombicDodecMatrixGroup,
      radialTetMatrixGroup,
      radialOctMatrixGroup,
      radialVEMatrixGroup,
      quadrayTetrahedronGroup,
      quadrayTetraDeformedGroup,
      quadrayCuboctahedronGroup,
      quadrayOctahedronGroup,
      quadrayTruncatedTetGroup,
      quadrayStellaOctangulaGroup,
      penroseTilingGroup,
    ];

    formGroups.forEach(group => {
      if (
        group &&
        group.visible &&
        group !== excludeGroup &&
        group.children.length > 0
      ) {
        targetGroups.push(group);
      }
    });

    // Instances
    const allInstances = RTStateManager.getAllInstances();

    // Build set of connected Point IDs to exclude (prevent self-collapse)
    const excludeConnectedIds = new Set();
    const excludeId = excludeGroup?.userData?.instanceId;
    if (excludeId && excludeGroup?.userData?.type === "point") {
      // Find all connectedLines referencing this Point
      allInstances.forEach(inst => {
        if (inst.type === "connectedLine") {
          const startId = inst.parameters?.startPoint;
          const endId = inst.parameters?.endPoint;
          if (startId === excludeId) {
            excludeConnectedIds.add(endId);
          } else if (endId === excludeId) {
            excludeConnectedIds.add(startId);
          }
        }
      });
    }

    allInstances.forEach(instance => {
      if (
        instance.threeObject &&
        instance.threeObject.visible &&
        instance.threeObject !== excludeGroup &&
        !excludeConnectedIds.has(instance.id) // Exclude connected Points
      ) {
        targetGroups.push(instance.threeObject);
      }
    });

    // Get source object's snap points (we need to compare geometry-to-geometry)
    // NODE-BASED SNAP: If in vertex mode with a selected node, only use that node
    let sourceVertices = [];
    if (objectSnapVertex) {
      const selectedVertices = RTStateManager.getSelectedVertices();
      const firstVertex = selectedVertices[0];
      if (RTStateManager.isVertexMode() && firstVertex?.getWorldPosition) {
        // Use ONLY the selected node's world position for snapping
        const nodeWorldPos = new THREE.Vector3();
        firstVertex.getWorldPosition(nodeWorldPos);
        sourceVertices = [nodeWorldPos];
      } else {
        // Classical: use all vertices
        sourceVertices = getPolyhedronVertices(excludeGroup);
      }
    }
    const sourceEdges = objectSnapEdge
      ? getPolyhedronEdgeMidpoints(excludeGroup)
      : [];
    const sourceFaces = objectSnapFace
      ? getPolyhedronFaceCentroids(excludeGroup)
      : [];

    // Check each target group for snap points
    targetGroups.forEach(targetGroup => {
      // Vertex-to-vertex snapping
      if (objectSnapVertex && sourceVertices.length > 0) {
        const targetVertices = getPolyhedronVertices(targetGroup);
        sourceVertices.forEach(srcVertex => {
          targetVertices.forEach(tgtVertex => {
            const distance = srcVertex.distanceTo(tgtVertex);
            if (distance < nearestDistance) {
              nearestDistance = distance;
              // Calculate offset: where target is minus where source vertex is
              // This offset would move source vertex to target vertex
              const offset = tgtVertex.clone().sub(srcVertex);
              nearest = {
                type: "vertex",
                position: position.clone().add(offset), // New center position after snap
                sourcePoint: srcVertex.clone(),
                targetPoint: tgtVertex.clone(),
                distance: distance,
                targetGroup: targetGroup,
              };
            }
          });
        });
      }

      // Edge-to-edge snapping (midpoint to midpoint)
      if (objectSnapEdge && sourceEdges.length > 0) {
        const targetEdges = getPolyhedronEdgeMidpoints(targetGroup);
        sourceEdges.forEach(srcEdge => {
          targetEdges.forEach(tgtEdge => {
            const distance = srcEdge.distanceTo(tgtEdge);
            if (distance < nearestDistance) {
              nearestDistance = distance;
              // Calculate offset to align source edge to target edge
              const offset = tgtEdge.clone().sub(srcEdge);
              nearest = {
                type: "edge",
                position: position.clone().add(offset), // New center position after snap
                sourcePoint: srcEdge.clone(),
                targetPoint: tgtEdge.clone(),
                distance: distance,
                targetGroup: targetGroup,
              };
            }
          });
        });
      }

      // Face-to-face snapping (centroid to centroid)
      if (objectSnapFace && sourceFaces.length > 0) {
        const targetFaces = getPolyhedronFaceCentroids(targetGroup);
        sourceFaces.forEach(srcFace => {
          targetFaces.forEach(tgtFace => {
            const distance = srcFace.distanceTo(tgtFace);
            if (distance < nearestDistance) {
              nearestDistance = distance;
              // Calculate offset to align source face to target face
              const offset = tgtFace.clone().sub(srcFace);
              nearest = {
                type: "face",
                position: position.clone().add(offset), // New center position after snap
                sourcePoint: srcFace.clone(),
                targetPoint: tgtFace.clone(),
                distance: distance,
                targetGroup: targetGroup,
              };
            }
          });
        });
      }
    });

    return nearest;
  }

  /**
   * Create or update the snap preview marker (visual indicator)
   * @param {THREE.Vector3} position - Position to show marker
   * @param {string} snapType - 'vertex', 'edge', or 'face'
   */
  function updateSnapPreviewMarker(position, snapType) {
    // Remove existing marker
    if (snapPreviewMarker) {
      scene.remove(snapPreviewMarker);
      snapPreviewMarker = null;
    }

    if (!position) return;

    // Create marker based on snap type
    let geometry, material;
    const colors = {
      vertex: 0xff9944, // Orange
      edge: 0x44ff99, // Green
      face: 0x4499ff, // Blue
    };

    if (snapType === "vertex") {
      geometry = new THREE.SphereGeometry(0.15, 16, 16);
    } else if (snapType === "edge") {
      geometry = new THREE.OctahedronGeometry(0.15);
    } else if (snapType === "face") {
      geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    }

    material = new THREE.MeshBasicMaterial({
      color: colors[snapType],
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });

    snapPreviewMarker = new THREE.Mesh(geometry, material);
    snapPreviewMarker.position.copy(position);
    snapPreviewMarker.renderOrder = 999; // Render on top
    scene.add(snapPreviewMarker);
  }

  /**
   * Remove the snap preview marker
   */
  function clearSnapPreviewMarker() {
    if (snapPreviewMarker) {
      scene.remove(snapPreviewMarker);
      snapPreviewMarker = null;
    }
    currentSnapTarget = null;
  }

  // Initialize gumball mouse event listeners (called after initScene)
  function initGumballEventListeners() {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Mouse down - start dragging
    // Use capture phase (true) to intercept before OrbitControls
    renderer.domElement.addEventListener(
      "mousedown",
      event => {
        // Skip right-click (button 2) - let context menu handle it
        if (event.button === 2) return;

        // ================================================================
        // ALT-CLICK AUTO-MOVE: Bypass tool requirement for drag-copy
        // If Alt held + clicking on selected poly + no tool active → start move+copy
        // ================================================================
        if (event.altKey && currentSelection && !currentGumballTool) {
          // Convert mouse position
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);

          // Check if clicking on the selected polyhedron
          const selectableObjects = [];
          currentSelection.traverse(obj => {
            if (obj.isMesh || obj.isLine) selectableObjects.push(obj);
          });

          const polyIntersects = raycaster.intersectObjects(
            selectableObjects,
            false
          );

          if (polyIntersects.length > 0) {
            // Alt+click on selected poly - start free move with drag-copy
            event.preventDefault();
            event.stopPropagation();

            // Disable orbit controls for this drag
            controls.enabled = false;

            isFreeMoving = true;
            isDragCopying = true;
            dragCopyOriginalPosition.copy(currentSelection.position);
            dragCopyOriginalQuaternion.copy(currentSelection.quaternion);
            dragCopyOriginalScale.copy(currentSelection.scale);

            selectedPolyhedra = getSelectedPolyhedra();

            // Create drag plane perpendicular to camera
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);
            dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
              cameraDirection,
              currentSelection.position.clone()
            );

            // Get click point and offset
            raycaster.ray.intersectPlane(dragPlane, dragStartPoint);
            freeMoveDragOffset
              .copy(currentSelection.position)
              .sub(dragStartPoint);

            // Store initial positions for delta-based movement
            freeMoveStartPoint.copy(dragStartPoint);
            freeMoveInitialPositions = selectedPolyhedra.map(poly =>
              poly.position.clone()
            );

            console.log(
              "📋 ALT-CLICK AUTO-MOVE: Drag-copy started without tool activation"
            );
            return; // Don't fall through to normal tool handling
          }
        }

        // Only work if a gumball tool is active (Move, Scale, or Rotate mode)
        if (
          !currentGumballTool ||
          (currentGumballTool !== "move" &&
            currentGumballTool !== "scale" &&
            currentGumballTool !== "rotate")
        )
          return;

        // Convert mouse position to normalized device coordinates
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // IMPORTANT: Get CURRENT camera from renderingAPI (may have switched to orthographic)
        const currentCamera = renderingAPI.getCamera();
        raycaster.setFromCamera(mouse, currentCamera);

        // Check editing basis (localized gumball) if it exists
        if (editingBasis) {
          // Get camera view direction for filtering edge-on rotation rings
          const cameraDirection = new THREE.Vector3();
          currentCamera.getWorldDirection(cameraDirection);

          // Collect all gumball handle hit spheres from editing basis
          // Filter out rotation rings that are edge-on to the camera (unreliable in orthographic)
          const hitTargets = [];
          editingBasis.traverse(obj => {
            if (obj.userData.isGumballHandle) {
              // For rotation handles, filter out rings that are edge-on to the camera
              // A ring's axis is PERPENDICULAR to the ring plane, so:
              // - dot ≈ 1.0 means axis parallel to view = ring appears as full circle (KEEP)
              // - dot ≈ 0.0 means axis perpendicular to view = ring appears edge-on (FILTER)
              if (obj.userData.isRotationHandle && obj.userData.basisAxis) {
                const dotProduct = Math.abs(
                  cameraDirection.dot(obj.userData.basisAxis)
                );
                // If dot product < 0.15, the ring is nearly edge-on (axis perpendicular to view)
                // Skip these as they're unreliable to click in orthographic views
                if (dotProduct < 0.15) {
                  return; // Skip this edge-on rotation ring
                }
              }
              hitTargets.push(obj);
            }
          });

          const intersects = raycaster.intersectObjects(hitTargets, false);

          if (intersects.length > 0) {
            // Get the first intersected handle
            const handle = intersects[0].object;

            if (handle.userData.isGumballHandle) {
              event.preventDefault();
              event.stopPropagation();

              isDragging = true;

              // OPT-CLICK DRAG-COPY: Store original transform if Alt/Option held
              if (event.altKey && currentSelection) {
                isDragCopying = true;
                dragCopyOriginalPosition.copy(currentSelection.position);
                dragCopyOriginalQuaternion.copy(currentSelection.quaternion);
                dragCopyOriginalScale.copy(currentSelection.scale);
                console.log(
                  "📋 DRAG-COPY mode: Alt key detected, will create copy on release"
                );
              }
              // Note: controls.enabled already false when tool is active

              // Get the basis vector direction and type from userData
              const axisDirection = handle.userData.basisAxis.clone();
              const basisIndex = handle.userData.basisIndex;
              const basisType = handle.userData.basisType; // 'quadray' or 'cartesian'

              selectedHandle = {
                type: basisType,
                index: basisIndex,
                axis: axisDirection,
              };

              // Create a drag plane perpendicular to camera view
              const cameraDirection = new THREE.Vector3();
              camera.getWorldDirection(cameraDirection);
              dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                cameraDirection,
                new THREE.Vector3(0, 0, 0)
              );

              // Get starting point
              raycaster.ray.intersectPlane(dragPlane, dragStartPoint);

              // Store initial mouse position for rotation calculation
              dragStartPoint.userData = {
                mouseX: mouse.x,
                mouseY: mouse.y,
                // Store initial quaternions for all selected polyhedra
                initialQuaternions: [],
                initialPositions: [],
              };

              // Store selected polyhedra
              selectedPolyhedra = getSelectedPolyhedra();

              // Store initial state for rotation mode
              if (currentGumballTool === "rotate") {
                selectedPolyhedra.forEach(poly => {
                  dragStartPoint.userData.initialQuaternions.push(
                    poly.quaternion.clone()
                  );
                  dragStartPoint.userData.initialPositions.push(
                    poly.position.clone()
                  );
                });
              }

              const axisName =
                basisType === "cartesian"
                  ? ["X", "Y", "Z"][basisIndex]
                  : ["W", "X", "Y", "Z"][basisIndex];
              console.log(
                `✅ Gumball handle selected: ${basisType.toUpperCase()} ${axisName}-axis, polyhedra count: ${selectedPolyhedra.length}`
              );
            }
          } else if (currentGumballTool === "move" && currentSelection) {
            // ================================================================
            // FREE MOVEMENT: No gumball handle hit, check if clicked on selected polyhedron
            // ================================================================
            const selectableObjects = [];
            currentSelection.traverse(obj => {
              if (obj.isMesh || obj.isLine) {
                selectableObjects.push(obj);
              }
            });

            const polyIntersects = raycaster.intersectObjects(
              selectableObjects,
              false
            );

            if (polyIntersects.length > 0) {
              // Clicked on the selected polyhedron body - start free movement
              event.preventDefault();
              event.stopPropagation();

              isFreeMoving = true;

              // OPT-CLICK DRAG-COPY: Store original transform if Alt/Option held
              if (event.altKey && currentSelection) {
                isDragCopying = true;
                dragCopyOriginalPosition.copy(currentSelection.position);
                dragCopyOriginalQuaternion.copy(currentSelection.quaternion);
                dragCopyOriginalScale.copy(currentSelection.scale);
                console.log(
                  "📋 DRAG-COPY mode (free move): Alt key detected, will create copy on release"
                );
              }
              selectedPolyhedra = getSelectedPolyhedra();

              // Create drag plane perpendicular to camera, through object's position
              const cameraDirection = new THREE.Vector3();
              camera.getWorldDirection(cameraDirection);
              dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                cameraDirection,
                currentSelection.position.clone()
              );

              // Get click point on drag plane
              raycaster.ray.intersectPlane(dragPlane, dragStartPoint);

              // Calculate offset from click point to object center (prevents jumping)
              freeMoveDragOffset
                .copy(currentSelection.position)
                .sub(dragStartPoint);

              // Store initial positions of ALL selected polyhedra for delta-based movement
              freeMoveStartPoint.copy(dragStartPoint);
              freeMoveInitialPositions = selectedPolyhedra.map(poly =>
                poly.position.clone()
              );

              console.log(
                `🖐️ FREE MOVE started: ${currentSelection.userData.type}, polyhedra count: ${selectedPolyhedra.length}`
              );
            }
          }
        } else if (currentGumballTool === "move" && currentSelection) {
          // ================================================================
          // FREE MOVEMENT (no editing basis): Check if clicked on selected polyhedron
          // ================================================================
          const selectableObjects = [];
          currentSelection.traverse(obj => {
            if (obj.isMesh || obj.isLine) {
              selectableObjects.push(obj);
            }
          });

          const polyIntersects = raycaster.intersectObjects(
            selectableObjects,
            false
          );

          if (polyIntersects.length > 0) {
            event.preventDefault();
            event.stopPropagation();

            isFreeMoving = true;
            selectedPolyhedra = getSelectedPolyhedra();

            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);
            dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
              cameraDirection,
              currentSelection.position.clone()
            );

            raycaster.ray.intersectPlane(dragPlane, dragStartPoint);
            freeMoveDragOffset
              .copy(currentSelection.position)
              .sub(dragStartPoint);

            // Store initial positions of ALL selected polyhedra for delta-based movement
            freeMoveStartPoint.copy(dragStartPoint);
            freeMoveInitialPositions = selectedPolyhedra.map(poly =>
              poly.position.clone()
            );

            console.log(
              `🖐️ FREE MOVE started (no basis): ${currentSelection.userData.type}`
            );
          }
        } else if (!editingBasis && currentGumballTool === "move") {
          console.warn(
            "⚠️ No editing basis and no selection - select a polyhedron first"
          );
        }
      },
      { capture: true }
    ); // Capture phase to intercept before OrbitControls

    // Mouse move - perform dragging
    renderer.domElement.addEventListener(
      "mousemove",
      event => {
        // Handle FREE MOVEMENT (direct polyhedron drag)
        if (isFreeMoving) {
          event.preventDefault();
          event.stopPropagation();

          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(mouse, camera);

          const currentPoint = new THREE.Vector3();
          raycaster.ray.intersectPlane(dragPlane, currentPoint);

          if (currentPoint) {
            // Apply offset to get new position (prevents jumping)
            let newPosition = currentPoint.clone().add(freeMoveDragOffset);

            // ================================================================
            // OBJECT SNAPPING: Check for snap targets during drag
            // ================================================================
            if (objectSnapVertex || objectSnapEdge || objectSnapFace) {
              const snapTarget = findNearestSnapTarget(
                newPosition,
                currentSelection,
                0.5 // Snap threshold
              );

              if (snapTarget) {
                // Show snap preview marker at the TARGET point (where snap will attach)
                updateSnapPreviewMarker(
                  snapTarget.targetPoint,
                  snapTarget.type
                );
                currentSnapTarget = snapTarget;

                // Preview snap position (object will snap on release)
                // For now, show the marker but don't move the object until release
                // This gives visual feedback without commitment
              } else {
                // No snap target - clear preview
                clearSnapPreviewMarker();
              }
            }

            // Calculate movement delta from drag start (preserves relative positions)
            const movementDelta = currentPoint.clone().sub(freeMoveStartPoint);

            // Move all selected polyhedra using delta-based positioning
            selectedPolyhedra.forEach((poly, index) => {
              if (freeMoveInitialPositions[index]) {
                poly.position
                  .copy(freeMoveInitialPositions[index])
                  .add(movementDelta);
              }
            });

            // RUBBERBAND: Update connected line geometry in real-time during drag
            updateConnectedLinesRubberband(selectedPolyhedra);

            // Update editing basis position if it exists
            if (editingBasis && selectedPolyhedra.length > 0) {
              const selectedVertices = RTStateManager.getSelectedVertices();
              const firstVertex = selectedVertices[0];
              if (
                RTStateManager.isVertexMode() &&
                firstVertex?.getWorldPosition
              ) {
                // NODE-BASED: Follow the selected node's world position
                const nodeWorldPos = new THREE.Vector3();
                firstVertex.getWorldPosition(nodeWorldPos);
                editingBasis.position.copy(nodeWorldPos);
              } else {
                // CLASSICAL: Follow polyhedron centroid
                editingBasis.position.copy(selectedPolyhedra[0].position);
              }
            }

            // Update coordinate displays (use primary selection's position)
            const pos =
              selectedPolyhedra.length > 0
                ? selectedPolyhedra[0].position
                : currentPoint;
            document.getElementById("coordX").value = pos.x.toFixed(4);
            document.getElementById("coordY").value = pos.y.toFixed(4);
            document.getElementById("coordZ").value = pos.z.toFixed(4);

            // Convert to WXYZ
            const basisVectors = Quadray.basisVectors;
            let wxyz = [0, 0, 0, 0];
            for (let i = 0; i < 4; i++) {
              wxyz[i] = pos.dot(basisVectors[i]);
            }
            const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
            wxyz = wxyz.map(c => c - mean);

            document.getElementById("coordQW").value = wxyz[0].toFixed(4);
            document.getElementById("coordQX").value = wxyz[1].toFixed(4);
            document.getElementById("coordQY").value = wxyz[2].toFixed(4);
            document.getElementById("coordQZ").value = wxyz[3].toFixed(4);
          }
          return; // Don't process gumball drag
        }

        // Handle GUMBALL AXIS DRAG (existing behavior)
        if (!isDragging || !selectedHandle) return;

        // Prevent orbit controls from receiving this event
        event.preventDefault();
        event.stopPropagation();

        // Update mouse position
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Get current point on drag plane
        const currentPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, currentPoint);

        if (currentPoint) {
          // ====================================================================
          // TOOL MODE: MOVE vs SCALE
          // ====================================================================
          if (currentGumballTool === "move") {
            // ====================================================================
            // MOVE MODE: Translate polyhedra along axis
            // ====================================================================
            // Calculate movement vector
            const movement = new THREE.Vector3().subVectors(
              currentPoint,
              dragStartPoint
            );

            // Project movement onto the selected axis (constrained movement)
            const axisMovement = movement.dot(selectedHandle.axis);

            // Apply sensitivity multiplier for more responsive dragging
            const sensitivity = 5.0; // Amplify movement for better responsiveness
            const constrainedMovement = selectedHandle.axis
              .clone()
              .multiplyScalar(axisMovement * sensitivity);

            console.log(
              `Movement: ${(axisMovement * sensitivity).toFixed(4)}, Polyhedra: ${selectedPolyhedra.length}`
            );

            // Move all selected polyhedra (FULL PRECISION - no snapping during drag)
            selectedPolyhedra.forEach(poly => {
              poly.position.add(constrainedMovement);
              // Snapping will be applied at mouseup based on currentSnapMode
            });

            // RUBBERBAND: Update connected line geometry in real-time during drag
            updateConnectedLinesRubberband(selectedPolyhedra);

            // Update editing basis to follow the Forms
            if (selectedPolyhedra.length > 0) {
              updateEditingBasisPosition(selectedPolyhedra[0].position);
            }
          } else if (currentGumballTool === "scale") {
            // ====================================================================
            // SCALE MODE: Scale selected object (Form or Instance)
            // ====================================================================
            // Calculate movement vector
            const movement = new THREE.Vector3().subVectors(
              currentPoint,
              dragStartPoint
            );

            // Project movement onto the selected axis (or radial for uniform)
            let scaleMovement;

            if (selectedHandle.type === "uniform") {
              // UNIFORM SCALING: Use radial distance from origin
              scaleMovement = movement.length();
              // Determine direction (inward vs outward)
              const direction = movement.dot(currentPoint.clone().normalize());
              if (direction < 0) scaleMovement = -scaleMovement;
            } else {
              // AXIS-CONSTRAINED SCALING: Project onto selected axis
              scaleMovement = movement.dot(selectedHandle.axis);
            }

            // Apply sensitivity for meaningful scale changes
            const scaleSensitivity = 15.0;
            const scaleDelta = scaleMovement * scaleSensitivity;

            console.log(
              `Scale delta: ${scaleDelta.toFixed(4)}, Handle type: ${selectedHandle.type}`
            );

            // Scale selected polyhedra directly
            if (selectedPolyhedra.length > 0) {
              selectedPolyhedra.forEach(poly => {
                // Get current scale (default to 1.0 if not set)
                if (!poly.userData.currentScale) {
                  poly.userData.currentScale = 1.0;
                }
                // Initialize dimensional state if not set
                if (!poly.userData.dimensionalState) {
                  poly.userData.dimensionalState = "positive";
                }

                // JANUS INVERSION: Use ADDITIVE scaling to allow crossing through zero
                // Multiplicative scaling asymptotically approaches zero but never crosses
                // Additive scaling allows linear traversal through the Janus Point
                const previousScale = poly.userData.currentScale;
                const scaleIncrement = scaleDelta * 0.02; // INCREASED sensitivity (was 0.005)
                const newScale = previousScale + scaleIncrement;

                // JANUS INVERSION: Allow through-origin scaling
                // Clamp magnitude to reasonable bounds (0.05 to 10.0)
                const minScale = 0.05;
                const maxScale = 10.0;
                let clampedScale;
                let crossedJanus = false; // Track if we crossed this frame

                // KEY: Detect when we're AT the minimum and still pushing toward zero
                // This is the moment to cross through the Janus Point
                const atPositiveMin = Math.abs(previousScale - minScale) < 0.01;
                const atNegativeMin =
                  Math.abs(previousScale - -minScale) < 0.01;
                const pushingInward = scaleIncrement < -0.0001;
                const pushingOutward = scaleIncrement > 0.0001;

                if (atPositiveMin && pushingInward) {
                  // At +0.05 and pushing inward → CROSS TO NEGATIVE SPACE
                  clampedScale = -minScale;
                  crossedJanus = true;
                  console.log(
                    `🌀 CROSSING: +${minScale} → -${minScale} (pushing inward)`
                  );
                } else if (atNegativeMin && pushingOutward) {
                  // At -0.05 and pushing outward → CROSS BACK TO POSITIVE SPACE
                  clampedScale = minScale;
                  crossedJanus = true;
                  console.log(
                    `🌀 CROSSING: -${minScale} → +${minScale} (pushing outward)`
                  );
                } else if (Math.abs(newScale) < minScale) {
                  // In the "zero zone" but not crossing - clamp to current side
                  clampedScale = previousScale > 0 ? minScale : -minScale;
                } else {
                  // Normal scaling - just clamp max
                  clampedScale =
                    Math.sign(newScale) *
                    Math.min(maxScale, Math.abs(newScale));
                }

                // ================================================================
                // JANUS INVERSION: Trigger transition when crossing detected
                // ================================================================
                if (crossedJanus) {
                  const direction = previousScale > 0 ? "inward" : "outward";
                  poly.userData.dimensionalState =
                    poly.userData.dimensionalState === "positive"
                      ? "negative"
                      : "positive";

                  console.log(
                    `🌀 JANUS POINT: ${poly.userData.type || "Form"} crossed origin (${direction}) → ${poly.userData.dimensionalState} space`
                  );

                  // Trigger Janus transition (animation + ghost + background)
                  RTJanus.triggerJanusTransition(
                    poly,
                    direction,
                    selectedPolyhedra
                  );
                }

                // Apply uniform scale to the object (negative = inverted geometry)
                poly.scale.set(clampedScale, clampedScale, clampedScale);

                // Store current scale for next frame
                poly.userData.currentScale = clampedScale;

                console.log(
                  `✅ Scaled ${poly.userData.isInstance ? "Instance" : "Form"}: ${clampedScale.toFixed(4)} (${poly.userData.dimensionalState})`
                );
              });

              // Update footer Scale display during gumball scaling
              if (USE_COORDINATE_MODULE && selectedPolyhedra.length > 0) {
                RTCoordinates.updateScaleDisplay(selectedPolyhedra[0].scale.x);
              }

              // If scaling a Form at origin, also update sliders to reflect change
              if (
                selectedPolyhedra.length > 0 &&
                !selectedPolyhedra[0].userData.isInstance
              ) {
                const currentScale = selectedPolyhedra[0].userData.currentScale;
                const cubeSlider = document.getElementById("scaleSlider");
                const tetSlider = document.getElementById("tetScaleSlider");

                // Update sliders to match the visual scale
                const baseCubeEdge = 1.4142; // Default cube edge length
                const baseTetEdge = 2.0; // Default tet edge length

                const newCubeEdge = baseCubeEdge * currentScale;
                const newTetEdge = baseTetEdge * currentScale;

                cubeSlider.value = newCubeEdge;
                tetSlider.value = newTetEdge;

                document.getElementById("scaleValue").textContent =
                  newCubeEdge.toFixed(4);
                document.getElementById("tetScaleValue").textContent =
                  newTetEdge.toFixed(4);
              }
            }

            // NOTE: No position update needed - objects stay in place during scaling
            // Editing basis stays in place
          } else if (currentGumballTool === "rotate") {
            // ====================================================================
            // ROTATE MODE: Rotate selected object around axis
            // ====================================================================
            // Use screen-space mouse movement for rotation
            // Project rotation center to screen space
            // When Group Centre mode is active, use calculated centroid instead of editingBasis
            let rotationCenter;
            if (
              USE_COORDINATE_MODULE &&
              RTCoordinates.getMode() === "group-centre"
            ) {
              rotationCenter = RTCoordinates.getRotationCenter(
                editingBasis,
                selectedPolyhedra
              );
            } else {
              rotationCenter = editingBasis
                ? editingBasis.position
                : new THREE.Vector3(0, 0, 0);
            }
            const centerScreen = rotationCenter.clone().project(camera);

            // Current mouse position in normalized device coordinates
            const currentMouseX = mouse.x;
            const currentMouseY = mouse.y;

            // CRITICAL: Use INITIAL mouse position stored at drag start (not updated every frame!)
            const startMouseX = dragStartPoint.userData.mouseX;
            const startMouseY = dragStartPoint.userData.mouseY;

            // Vectors from center to mouse positions (in screen space)
            const startDX = startMouseX - centerScreen.x;
            const startDY = startMouseY - centerScreen.y;
            const currentDX = currentMouseX - centerScreen.x;
            const currentDY = currentMouseY - centerScreen.y;

            // Calculate angle between the two vectors using atan2
            // This gives us the total accumulated rotation since drag started
            const startAngle = Math.atan2(startDY, startDX);
            const currentAngle = Math.atan2(currentDY, currentDX);
            let deltaAngle = currentAngle - startAngle;

            // Normalize angle to -π to π range
            // Note: This can still cause issues at ±180°, but we're storing initial state
            // so at least we're calculating from the original start point
            if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
            if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

            // Check if rotation axis points toward or away from camera
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);
            const axisToCamera = selectedHandle.axis.dot(cameraDirection);

            // Flip rotation direction if axis points away from camera
            let signedAngleRadians =
              axisToCamera > 0 ? -deltaAngle : deltaAngle;

            // ================================================================
            // FULL CIRCLE ROTATION (360°) - No spread snapping for now
            // ================================================================
            // Use the deltaAngle directly - it's already calculated correctly
            // from the drag start point, so it supports full 360° rotation
            const snappedAngleRadians = signedAngleRadians;
            const snappedAngleDegrees = (snappedAngleRadians * 180) / Math.PI;

            // Calculate spread for display only (not used for snapping yet)
            const spreadValue =
              Math.sin(signedAngleRadians) * Math.sin(signedAngleRadians);
            const snappedSpread = spreadValue; // No snapping

            /* TODO: Add spread snapping back once full rotation is working
                  // Apply spread snapping (0.1 intervals)
                  const snapInterval = 0.1;
                  const snappedSpread = Math.round(spreadValue / snapInterval) * snapInterval;

                  // Convert snapped spread back to angle (preserving quadrant)
                  // ... quadrant preservation logic here ...
                  */

            console.log(
              `🔄 Rotation: ${snappedAngleDegrees.toFixed(2)}°, Spread: ${snappedSpread.toFixed(2)}, Axis: ${selectedHandle.type}[${selectedHandle.index}]`
            );

            // Update rotation input fields - determine which axis field to update
            let degreesFieldId, spreadFieldId;

            if (selectedHandle.type === "cartesian") {
              // XYZ axes: index 0=X, 1=Y, 2=Z
              const axisNames = ["X", "Y", "Z"];
              const axis = axisNames[selectedHandle.index];
              degreesFieldId = `rot${axis}Degrees`;
              spreadFieldId = `rot${axis}Spread`;
            } else if (selectedHandle.type === "quadray") {
              // Quadray axes match color order: 0=Red(QX), 1=Green(QZ), 2=Blue(QY), 3=Yellow(QW)
              // QW=Yellow, QX=Red, QY=Blue, QZ=Green (user-specified correct mapping)
              const axisNames = ["QX", "QZ", "QY", "QW"];
              const axis = axisNames[selectedHandle.index];
              degreesFieldId = `rot${axis}Degrees`;
              spreadFieldId = `rot${axis}Spread`;
            }

            // Update the corresponding input fields
            const degreesField = document.getElementById(degreesFieldId);
            const spreadField = document.getElementById(spreadFieldId);
            if (degreesField && spreadField) {
              degreesField.value = snappedAngleDegrees.toFixed(2);
              spreadField.value = snappedSpread.toFixed(2);
            }

            // Apply rotation to selected polyhedra using stored initial state
            if (selectedPolyhedra.length > 0) {
              selectedPolyhedra.forEach((poly, index) => {
                // Get initial quaternion and position from drag start data
                const initialQuaternion =
                  dragStartPoint.userData.initialQuaternions[index];
                const initialPosition =
                  dragStartPoint.userData.initialPositions[index];

                // Reset to initial state FIRST
                poly.quaternion.copy(initialQuaternion);
                poly.position.copy(initialPosition);

                // Calculate offset from rotation center
                const offset = poly.position.clone().sub(rotationCenter);

                // Rotate the offset vector by the TOTAL accumulated angle
                const rotatedOffset = offset
                  .clone()
                  .applyAxisAngle(selectedHandle.axis, snappedAngleRadians);

                // Update position with rotated offset
                poly.position.copy(rotationCenter.clone().add(rotatedOffset));

                // Rotate the object itself using quaternion composition
                const rotationQuat = new THREE.Quaternion().setFromAxisAngle(
                  selectedHandle.axis,
                  snappedAngleRadians
                );
                poly.quaternion.multiplyQuaternions(
                  rotationQuat,
                  initialQuaternion
                );

                console.log(
                  `✅ Rotated ${poly.userData.isInstance ? "Instance" : "Form"}: ${snappedAngleDegrees.toFixed(2)}° around ${selectedHandle.type}[${selectedHandle.index}]`
                );
              });

              // RUBBERBAND: Update connected line geometry in real-time during rotation
              updateConnectedLinesRubberband(selectedPolyhedra);
            }

            // NOTE: Do NOT update dragStartPoint - we calculate angle from original start point
          }

          // Update coordinate inputs (MOVE MODE ONLY)
          if (currentGumballTool === "move" && selectedPolyhedra.length > 0) {
            const pos = selectedPolyhedra[0].position;

            // Update XYZ coordinates
            document.getElementById("coordX").value = pos.x.toFixed(4);
            document.getElementById("coordY").value = pos.y.toFixed(4);
            document.getElementById("coordZ").value = pos.z.toFixed(4);

            // Convert to WXYZ (reverse of Quadray.toCartesian)
            // For now, display placeholder - proper conversion needs implementation
            // This is a simplified approximation
            const basisVectors = Quadray.basisVectors;
            let wxyz = [0, 0, 0, 0];

            // Simple projection onto basis vectors
            for (let i = 0; i < 4; i++) {
              wxyz[i] = pos.dot(basisVectors[i]);
            }

            // Apply zero-sum normalization
            const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
            wxyz = wxyz.map(c => c - mean);

            document.getElementById("coordQW").value = wxyz[0].toFixed(4);
            document.getElementById("coordQX").value = wxyz[1].toFixed(4);
            document.getElementById("coordQY").value = wxyz[2].toFixed(4);
            document.getElementById("coordQZ").value = wxyz[3].toFixed(4);
          }

          // CRITICAL FIX: Only update drag start point for MOVE and SCALE modes
          // DO NOT update for ROTATE mode - we need the original start point!
          if (currentGumballTool !== "rotate") {
            dragStartPoint.copy(currentPoint);
          }
        }
      },
      { capture: true }
    ); // Capture phase to intercept before OrbitControls

    // Mouse up - stop dragging
    renderer.domElement.addEventListener(
      "mouseup",
      event => {
        // Handle FREE MOVEMENT mouseup
        if (isFreeMoving) {
          event.preventDefault();
          event.stopPropagation();

          // ================================================================
          // OBJECT SNAPPING: Apply snap if target was found during drag
          // ================================================================
          if (currentSnapTarget && selectedPolyhedra.length > 0) {
            selectedPolyhedra.forEach(poly => {
              poly.position.copy(currentSnapTarget.position);
            });

            // Update editing basis position
            if (editingBasis) {
              const selectedVertices = RTStateManager.getSelectedVertices();
              const firstVertex = selectedVertices[0];
              if (
                RTStateManager.isVertexMode() &&
                firstVertex?.getWorldPosition
              ) {
                // NODE-BASED: Follow the selected node's world position after snap
                const nodeWorldPos = new THREE.Vector3();
                firstVertex.getWorldPosition(nodeWorldPos);
                editingBasis.position.copy(nodeWorldPos);
              } else {
                // CLASSICAL: Use snap target position
                editingBasis.position.copy(currentSnapTarget.position);
              }
            }

            console.log(
              `🎯 OBJECT SNAP (${currentSnapTarget.type.toUpperCase()}): Snapped to (${currentSnapTarget.position.x.toFixed(4)}, ${currentSnapTarget.position.y.toFixed(4)}, ${currentSnapTarget.position.z.toFixed(4)})`
            );

            // Update coordinate displays
            const pos = currentSnapTarget.position;
            document.getElementById("coordX").value = pos.x.toFixed(4);
            document.getElementById("coordY").value = pos.y.toFixed(4);
            document.getElementById("coordZ").value = pos.z.toFixed(4);

            const basisVectors = Quadray.basisVectors;
            let wxyz = [0, 0, 0, 0];
            for (let i = 0; i < 4; i++) {
              wxyz[i] = pos.dot(basisVectors[i]);
            }
            const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
            wxyz = wxyz.map(c => c - mean);

            document.getElementById("coordQW").value = wxyz[0].toFixed(4);
            document.getElementById("coordQX").value = wxyz[1].toFixed(4);
            document.getElementById("coordQY").value = wxyz[2].toFixed(4);
            document.getElementById("coordQZ").value = wxyz[3].toFixed(4);

            // Clear snap state
            clearSnapPreviewMarker();

            // Update connected geometry for moved Points (must happen BEFORE clearing selection)
            updateMovedPointConnections(selectedPolyhedra);

            justFinishedDrag = true;
            isFreeMoving = false;
            selectedPolyhedra = [];
            console.log(
              "✅ FREE MOVE ended with OBJECT SNAP - selection and tool preserved"
            );
            return;
          }

          // Clear any snap preview that didn't result in a snap
          clearSnapPreviewMarker();

          // Apply GRID snapping (same logic as gumball drag)
          if (currentSnapMode !== "free" && selectedPolyhedra.length > 0) {
            selectedPolyhedra.forEach(poly => {
              if (currentSnapMode === "xyz") {
                const gridSize = 0.1;
                poly.position.x =
                  Math.round(poly.position.x / gridSize) * gridSize;
                poly.position.y =
                  Math.round(poly.position.y / gridSize) * gridSize;
                poly.position.z =
                  Math.round(poly.position.z / gridSize) * gridSize;
                console.log(
                  `📐 FREE MOVE XYZ snap: (${poly.position.x.toFixed(2)}, ${poly.position.y.toFixed(2)}, ${poly.position.z.toFixed(2)})`
                );
              } else if (currentSnapMode === "wxyz") {
                const basisVectors = Quadray.basisVectors;
                let wxyz = [0, 0, 0, 0];
                for (let i = 0; i < 4; i++) {
                  wxyz[i] = poly.position.dot(basisVectors[i]);
                }
                const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
                wxyz = wxyz.map(c => c - mean);
                const quadrayGridSize = RT.PureRadicals.QUADRAY_GRID_INTERVAL;
                wxyz = wxyz.map(
                  c => Math.round(c / quadrayGridSize) * quadrayGridSize
                );
                const snappedPos = Quadray.toCartesian(
                  wxyz[0],
                  wxyz[1],
                  wxyz[2],
                  wxyz[3],
                  THREE
                );
                poly.position.copy(snappedPos);
                console.log(
                  `📐 FREE MOVE WXYZ snap: (W:${wxyz[0].toFixed(3)}, X:${wxyz[1].toFixed(3)}, Y:${wxyz[2].toFixed(3)}, Z:${wxyz[3].toFixed(3)})`
                );
              }
            });

            // Update coordinate displays after snapping
            if (selectedPolyhedra.length > 0) {
              const pos = selectedPolyhedra[0].position;
              document.getElementById("coordX").value = pos.x.toFixed(4);
              document.getElementById("coordY").value = pos.y.toFixed(4);
              document.getElementById("coordZ").value = pos.z.toFixed(4);

              const basisVectors = Quadray.basisVectors;
              let wxyz = [0, 0, 0, 0];
              for (let i = 0; i < 4; i++) {
                wxyz[i] = pos.dot(basisVectors[i]);
              }
              const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
              wxyz = wxyz.map(c => c - mean);

              document.getElementById("coordQW").value = wxyz[0].toFixed(4);
              document.getElementById("coordQX").value = wxyz[1].toFixed(4);
              document.getElementById("coordQY").value = wxyz[2].toFixed(4);
              document.getElementById("coordQZ").value = wxyz[3].toFixed(4);

              // Update editing basis position after snapping
              if (editingBasis) {
                const selectedVertices = RTStateManager.getSelectedVertices();
                const firstVertex = selectedVertices[0];
                if (
                  RTStateManager.isVertexMode() &&
                  firstVertex?.getWorldPosition
                ) {
                  // NODE-BASED: Follow the selected node's world position
                  const nodeWorldPos = new THREE.Vector3();
                  firstVertex.getWorldPosition(nodeWorldPos);
                  editingBasis.position.copy(nodeWorldPos);
                } else {
                  // CLASSICAL: Use snapped position
                  editingBasis.position.copy(pos);
                }
              }
            }
          }

          // OPT-CLICK DRAG-COPY: Create instance at current position, restore original
          if (isDragCopying && currentSelection) {
            // Create instance at the dragged position
            RTStateManager.createInstance(currentSelection, scene);

            // Restore original to its starting position
            currentSelection.position.copy(dragCopyOriginalPosition);
            currentSelection.quaternion.copy(dragCopyOriginalQuaternion);
            currentSelection.scale.copy(dragCopyOriginalScale);

            // Update editing basis to follow restored original
            if (editingBasis) {
              editingBasis.position.copy(dragCopyOriginalPosition);
            }

            // Update NOW counter display
            const nowCountEl = document.getElementById("nowCount");
            if (nowCountEl) {
              nowCountEl.textContent = RTStateManager.getDepositedCount();
            }

            console.log(
              "✅ DRAG-COPY complete: Instance created, original restored"
            );
            isDragCopying = false;

            // Re-enable orbit controls if no tool is active (alt-click auto-move case)
            if (!currentGumballTool) {
              controls.enabled = true;
            }
          }

          // Update connected geometry for moved Points (must happen BEFORE clearing selection)
          updateMovedPointConnections(selectedPolyhedra);

          justFinishedDrag = true;
          isFreeMoving = false;
          selectedPolyhedra = [];
          return;
        }

        // Handle GUMBALL AXIS DRAG mouseup (existing behavior)
        if (isDragging) {
          // Prevent orbit controls from receiving this event
          event.preventDefault();
          event.stopPropagation();

          // ====================================================================
          // ALGEBRAIC PRECISION SNAPPING
          // Apply snapping based on snap mode and handle type (active/passive)
          // ====================================================================
          if (currentSnapMode !== "free" && selectedPolyhedra.length > 0) {
            selectedPolyhedra.forEach(poly => {
              if (currentSnapMode === "xyz") {
                // XYZ Snap Mode: Snap to 0.1 Cartesian grid
                const gridSize = 0.1;
                poly.position.x =
                  Math.round(poly.position.x / gridSize) * gridSize;
                poly.position.y =
                  Math.round(poly.position.y / gridSize) * gridSize;
                poly.position.z =
                  Math.round(poly.position.z / gridSize) * gridSize;
                console.log(
                  `📐 XYZ snap applied: (${poly.position.x.toFixed(2)}, ${poly.position.y.toFixed(2)}, ${poly.position.z.toFixed(2)})`
                );
              } else if (currentSnapMode === "wxyz") {
                // WXYZ Snap Mode: Snap to √6/4 ≈ 0.6124 Quadray grid
                // Convert position to Quadray coordinates
                const basisVectors = Quadray.basisVectors;
                let wxyz = [0, 0, 0, 0];

                // Project position onto Quadray basis vectors
                for (let i = 0; i < 4; i++) {
                  wxyz[i] = poly.position.dot(basisVectors[i]);
                }

                // Apply zero-sum normalization
                const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
                wxyz = wxyz.map(c => c - mean);

                // Snap each Quadray coordinate to grid (PureRadicals cached constant)
                const quadrayGridSize = RT.PureRadicals.QUADRAY_GRID_INTERVAL; // ≈ 0.6124
                wxyz = wxyz.map(
                  c => Math.round(c / quadrayGridSize) * quadrayGridSize
                );

                // Convert back to Cartesian
                const snappedPos = Quadray.toCartesian(
                  wxyz[0],
                  wxyz[1],
                  wxyz[2],
                  wxyz[3],
                  THREE
                );
                poly.position.copy(snappedPos);
                console.log(
                  `📐 WXYZ snap applied: (W:${wxyz[0].toFixed(3)}, X:${wxyz[1].toFixed(3)}, Y:${wxyz[2].toFixed(3)}, Z:${wxyz[3].toFixed(3)})`
                );
              }
            });

            // Update coordinate displays after snapping
            if (selectedPolyhedra.length > 0) {
              const pos = selectedPolyhedra[0].position;

              // Update XYZ coordinates
              document.getElementById("coordX").value = pos.x.toFixed(4);
              document.getElementById("coordY").value = pos.y.toFixed(4);
              document.getElementById("coordZ").value = pos.z.toFixed(4);

              // Convert to WXYZ and update
              const basisVectors = Quadray.basisVectors;
              let wxyz = [0, 0, 0, 0];
              for (let i = 0; i < 4; i++) {
                wxyz[i] = pos.dot(basisVectors[i]);
              }
              const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
              wxyz = wxyz.map(c => c - mean);

              document.getElementById("coordQW").value = wxyz[0].toFixed(4);
              document.getElementById("coordQX").value = wxyz[1].toFixed(4);
              document.getElementById("coordQY").value = wxyz[2].toFixed(4);
              document.getElementById("coordQZ").value = wxyz[3].toFixed(4);
            }
          } else {
            console.log(
              "✨ Free mode - no snapping applied (full precision preserved)"
            );
          }

          // OPT-CLICK DRAG-COPY: Create instance at current position, restore original
          if (isDragCopying && currentSelection) {
            // Create instance at the dragged position
            RTStateManager.createInstance(currentSelection, scene);

            // Restore original to its starting position
            currentSelection.position.copy(dragCopyOriginalPosition);
            currentSelection.quaternion.copy(dragCopyOriginalQuaternion);
            currentSelection.scale.copy(dragCopyOriginalScale);

            // Update editing basis to follow restored original
            if (editingBasis) {
              editingBasis.position.copy(dragCopyOriginalPosition);
            }

            // Update NOW counter display
            const nowCountEl = document.getElementById("nowCount");
            if (nowCountEl) {
              nowCountEl.textContent = RTStateManager.getDepositedCount();
            }

            console.log(
              "✅ DRAG-COPY complete: Instance created, original restored"
            );
            isDragCopying = false;
          }

          // Update connected geometry for moved Points (must happen BEFORE clearing selection)
          updateMovedPointConnections(selectedPolyhedra);

          // Mark that we just finished a drag to prevent click-after-drag deselection
          justFinishedDrag = true;

          isDragging = false;
          selectedHandle = null;

          // Clear drag start data from selected polyhedra
          selectedPolyhedra.forEach(poly => {
            delete poly.userData.dragStartQuaternion;
            delete poly.userData.dragStartPosition;
          });

          // Persist transforms to StateManager (critical for rotation/position to be saved)
          selectedPolyhedra.forEach(poly => {
            if (poly.userData.isInstance) {
              persistTransformToState(poly);
            }
          });

          selectedPolyhedra = [];

          // Auto-exit tool mode after drag complete (keeps selection active)
          exitToolMode();
          console.log(
            "✅ Gumball drag ended - tool mode exited, selection preserved"
          );
        }
      },
      { capture: true }
    ); // Capture phase to intercept before OrbitControls
  } // End initGumballEventListeners

  // Initialize scene and get references
  renderingAPI.initScene();
  scene = renderingAPI.getScene();
  camera = renderingAPI.getCamera();
  renderer = renderingAPI.getRenderer();
  controls = renderingAPI.getControls();

  // Initialize Janus module with scene dependencies
  RTJanus.init({ THREE, scene });

  // Get all form groups for selection system
  const formGroups = renderingAPI.getAllFormGroups();
  ({
    pointGroup,
    lineGroup,
    polygonGroup,
    prismGroup,
    coneGroup,
    tetrahelix1Group,
    tetrahelix2Group,
    tetrahelix3Group,
    cubeGroup,
    tetrahedronGroup,
    dualTetrahedronGroup,
    octahedronGroup,
    icosahedronGroup,
    dodecahedronGroup,
    dualIcosahedronGroup,
    cuboctahedronGroup,
    rhombicDodecahedronGroup,
    geodesicIcosahedronGroup,
    geodesicTetrahedronGroup,
    geodesicOctahedronGroup,
    cubeMatrixGroup,
    tetMatrixGroup,
    octaMatrixGroup,
    cuboctaMatrixGroup,
    rhombicDodecMatrixGroup,
    radialCubeMatrixGroup,
    radialRhombicDodecMatrixGroup,
    radialTetMatrixGroup,
    radialOctMatrixGroup,
    radialVEMatrixGroup,
    quadrayTetrahedronGroup,
    quadrayTetraDeformedGroup,
    quadrayCuboctahedronGroup,
    quadrayOctahedronGroup,
    quadrayTruncatedTetGroup,
    quadrayStellaOctangulaGroup,
    penroseTilingGroup,
  } = formGroups);

  initGumballEventListeners(); // Initialize gumball after scene is ready

  // Initialize color restoration from localStorage (scene is now ready)
  colorTheoryModal.initializeAfterSceneReady();

  // ========================================================================
  // FILE HANDLER INITIALIZATION
  // ========================================================================
  RTFileHandler.init(RTStateManager, scene, camera);
  MetaLog.log(MetaLog.SUMMARY, "✅ RTFileHandler module initialized");

  // Wire up File section UI buttons
  const importBtn = document.getElementById("importBtn");
  const exportBtn = document.getElementById("exportBtn");
  const saveBtn = document.getElementById("saveBtn");

  // Enable buttons
  importBtn.disabled = false;
  exportBtn.disabled = false;
  saveBtn.disabled = false;

  // Import button - Load JSON state file
  importBtn.addEventListener("click", () => {
    RTFileHandler.showImportDialog();
  });

  // Export button - Show format selection dialog
  exportBtn.addEventListener("click", async () => {
    await RTFileHandler.showExportDialog();
  });

  // Save button - Quick save to JSON with timestamp
  saveBtn.addEventListener("click", () => {
    RTFileHandler.exportStateToFile();
  });

  // Keyboard shortcuts for file operations
  document.addEventListener("keydown", e => {
    // Ctrl/Cmd + S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      RTFileHandler.exportStateToFile();
      console.log("💾 Quick save triggered (Ctrl/Cmd+S)");
    }

    // Ctrl/Cmd + O - Open
    if ((e.ctrlKey || e.metaKey) && e.key === "o") {
      e.preventDefault();
      RTFileHandler.showImportDialog();
      console.log("📂 Import dialog opened (Ctrl/Cmd+O)");
    }

    // Ctrl/Cmd + E - Export dialog
    if ((e.ctrlKey || e.metaKey) && e.key === "e") {
      e.preventDefault();
      RTFileHandler.showExportDialog();
      console.log("📤 Export dialog opened (Ctrl/Cmd+E)");
    }
  });

  // TODO: Extract to rt-controls.js module when ready
  // RTControls.init(THREE, Quadray, scene, camera, renderer, controls);

  // Initialize selection click listener with drag detection
  let mouseDownPos = null;
  let mouseMoved = false;

  renderer.domElement.addEventListener("mousedown", e => {
    mouseDownPos = { x: e.clientX, y: e.clientY };
    mouseMoved = false;
  });

  renderer.domElement.addEventListener("mousemove", e => {
    // Track drag distance for click vs drag detection
    if (mouseDownPos) {
      const dx = e.clientX - mouseDownPos.x;
      const dy = e.clientY - mouseDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If mouse moved more than 5 pixels, consider it a drag/orbit
      if (distance > 5) {
        mouseMoved = true;
      }
    }

    // Gumball handle hover detection (for visual feedback)
    onGumballHover(e);
  });

  renderer.domElement.addEventListener("mouseup", () => {
    mouseDownPos = null;
  });

  renderer.domElement.addEventListener("click", e => {
    // Only select if mouse didn't move during click (not an orbit/drag)
    if (!mouseMoved) {
      onCanvasClick(e);
    }
    mouseMoved = false;
  });

  // Start animation loop
  renderingAPI.animate();

  // ========================================================================
  // RT-PAPERCUT MODULE INITIALIZATION
  // ========================================================================
  RTPapercut.init(scene, camera, renderer);
  window.RTPapercut = RTPapercut; // Global access for debugging

  // ========================================================================
  // RT-PRIMECUTS MODULE INITIALIZATION
  // ========================================================================
  RTPrimeCuts.init(renderer, RTPapercut);
  window.RTPrimeCuts = RTPrimeCuts; // Global access for debugging

  // ========================================================================
  // RT-PROJECTIONS MODULE INITIALIZATION
  // ========================================================================
  RTProjections.init(scene, camera, renderer);
  window.RTProjections = RTProjections; // Global access for debugging

  // ========================================================================
  // RT-VIEWMANAGER MODULE INITIALIZATION
  // ========================================================================
  RTViewManager.init({
    stateManager: RTStateManager,
    fileHandler: RTFileHandler,
    papercut: RTPapercut,
    scene: scene,
    camera: camera,
    renderer: renderer,
  });
  window.RTViewManager = RTViewManager; // Global access for debugging

  // ========================================================================
  // RT-ANIMATE MODULE INITIALIZATION
  // ========================================================================
  RTAnimate.init({
    viewManager: RTViewManager,
    camera: camera,
    controls: controls,
    renderer: renderer,
    scene: scene,
  });
  window.RTAnimate = RTAnimate; // Global access for debugging

  // Wire up cutplane axis selector buttons
  const cutplaneAxisButtons = [
    // Cartesian basis
    { id: "cutplaneAxisX", basis: "cartesian", axis: "x" },
    { id: "cutplaneAxisY", basis: "cartesian", axis: "y" },
    { id: "cutplaneAxisZ", basis: "cartesian", axis: "z" },
    // Tetrahedral basis (QW/QX/QY/QZ matches camera naming convention)
    { id: "cutplaneAxisQW", basis: "tetrahedral", axis: "qw" },
    { id: "cutplaneAxisQX", basis: "tetrahedral", axis: "qx" },
    { id: "cutplaneAxisQY", basis: "tetrahedral", axis: "qy" },
    { id: "cutplaneAxisQZ", basis: "tetrahedral", axis: "qz" },
  ];

  // Track active cutplane axis button for persistent highlighting
  let activeCutplaneButton = document.getElementById("cutplaneAxisZ"); // Z is default

  cutplaneAxisButtons.forEach(({ id, basis, axis }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        // Remove active class from previously active button
        if (activeCutplaneButton) {
          activeCutplaneButton.classList.remove("active");
        }

        // Add active class to clicked button
        btn.classList.add("active");
        activeCutplaneButton = btn;

        // Update cutplane axis
        RTPapercut.setCutplaneAxis(basis, axis, scene);
      });
    }
  });

  // Wire up projection axis selector buttons (mirrors cutplane pattern)
  const projectionAxisButtons = [
    // Cartesian basis
    { id: "projectionAxisX", basis: "cartesian", axis: "x" },
    { id: "projectionAxisY", basis: "cartesian", axis: "y" },
    { id: "projectionAxisZ", basis: "cartesian", axis: "z" },
    // Tetrahedral basis
    { id: "projectionAxisQW", basis: "tetrahedral", axis: "qw" },
    { id: "projectionAxisQX", basis: "tetrahedral", axis: "qx" },
    { id: "projectionAxisQY", basis: "tetrahedral", axis: "qy" },
    { id: "projectionAxisQZ", basis: "tetrahedral", axis: "qz" },
  ];

  // Track active projection axis button for persistent highlighting
  let activeProjectionButton = document.getElementById("projectionAxisZ"); // Z is default

  projectionAxisButtons.forEach(({ id, basis, axis }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        // Remove active class from previously active button
        if (activeProjectionButton) {
          activeProjectionButton.classList.remove("active");
        }

        // Add active class to clicked button
        btn.classList.add("active");
        activeProjectionButton = btn;

        // Update projection axis
        RTProjections.setProjectionAxis(basis, axis);
      });
    }
  });

  // Wire up projection enable checkbox
  const enableProjectionCheckbox = document.getElementById("enableProjection");
  if (enableProjectionCheckbox) {
    enableProjectionCheckbox.addEventListener("change", () => {
      if (enableProjectionCheckbox.checked) {
        // Find the first visible polyhedron to project
        let targetPolyhedron = null;
        scene.traverse(obj => {
          if (!targetPolyhedron && obj.visible && obj.userData?.type) {
            // Look for quadray polyhedra or standard polyhedra
            if (
              obj.userData.type.startsWith("quadray") ||
              obj.userData.type.startsWith("geodesic") ||
              [
                "tetrahedron",
                "cube",
                "octahedron",
                "icosahedron",
                "dodecahedron",
                "cuboctahedron",
                "rhombicDodecahedron",
              ].includes(obj.userData.type)
            ) {
              targetPolyhedron = obj;
            }
          }
        });

        if (targetPolyhedron) {
          RTProjections.showProjection(targetPolyhedron);
        } else {
          console.warn("⚠️ No visible polyhedron found for projection");
        }
      } else {
        RTProjections.hideProjection();
      }
    });
  }

  // Wire up projection distance slider
  const projectionDistanceSlider =
    document.getElementById("projectionDistance");
  if (projectionDistanceSlider) {
    projectionDistanceSlider.addEventListener("input", () => {
      const value = parseFloat(projectionDistanceSlider.value);
      const valueDisplay = document.getElementById("projectionDistanceValue");
      if (valueDisplay) valueDisplay.textContent = value;
      RTProjections.setProjectionDistance(value);
    });
  }

  // Wire up projection option checkboxes
  const projectionShowRays = document.getElementById("projectionShowRays");
  if (projectionShowRays) {
    projectionShowRays.addEventListener("change", () => {
      RTProjections.state.showRays = projectionShowRays.checked;
      RTProjections.updateProjection();
    });
  }

  const projectionShowInterior = document.getElementById(
    "projectionShowInterior"
  );
  if (projectionShowInterior) {
    projectionShowInterior.addEventListener("change", () => {
      RTProjections.state.showInterior = projectionShowInterior.checked;
      RTProjections.updateProjection();
    });
  }

  const projectionShowIdeal = document.getElementById("projectionShowIdeal");
  if (projectionShowIdeal) {
    projectionShowIdeal.addEventListener("change", () => {
      RTProjections.state.showIdealPolygon = projectionShowIdeal.checked;
      RTProjections.updateProjection();
    });
  }

  // ========================================================================
  // KEYBOARD SHORTCUTS (ESC, Delete, Undo/Redo)
  // ========================================================================
  document.addEventListener("keydown", event => {
    // ESC key - cancel drag-copy, deselect all AND exit any active tool mode
    if (event.key === "Escape") {
      // Cancel drag-copy mode if active and restore original position
      if (isDragCopying && currentSelection) {
        currentSelection.position.copy(dragCopyOriginalPosition);
        currentSelection.quaternion.copy(dragCopyOriginalQuaternion);
        currentSelection.scale.copy(dragCopyOriginalScale);

        // Update editing basis to follow restored original
        if (editingBasis) {
          editingBasis.position.copy(dragCopyOriginalPosition);
        }

        isDragCopying = false;
        isFreeMoving = false;
        isDragging = false;

        // Re-enable orbit controls if no tool is active
        if (!currentGumballTool) {
          controls.enabled = true;
        }

        console.log("❌ DRAG-COPY cancelled via Escape, original restored");
        return; // Don't deselect, just cancel the copy operation
      }

      // If a tool is active, exit tool mode first (consistent with normal behavior)
      // This also clears vertex mode since tool exit ends the operation
      if (currentGumballTool) {
        exitToolMode();
        // Also exit vertex mode when tool exits
        if (RTStateManager.isVertexMode()) {
          clearAllNodeSelections();
        }
        return;
      }

      // If in vertex mode (no tool active), clear vertex selections
      if (RTStateManager.isVertexMode()) {
        clearAllNodeSelections();
        return; // Don't deselect polyhedron yet, just exit vertex mode
      }

      // No tool, no vertex mode - just deselect
      deselectAll();
    }

    // Delete key - delete selected Instance
    if (event.key === "Delete" || event.key === "Backspace") {
      if (currentSelection && currentSelection.userData.isInstance) {
        const instanceId = currentSelection.userData.instanceId;
        RTStateManager.deleteInstance(instanceId, scene);
        deselectAll();
        document.getElementById("nowCount").textContent =
          RTStateManager.getDepositedCount();
      } else if (currentSelection && !currentSelection.userData.isInstance) {
        console.warn("⚠️ Cannot delete Forms (templates), only Instances");
      }
    }

    // Undo: Cmd+Z or Ctrl+Z
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === "z" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      RTStateManager.undo(scene);

      // Update counter UI
      document.getElementById("nowCount").textContent =
        RTStateManager.getDepositedCount();
    }

    // Redo: Cmd+Shift+Z or Ctrl+Shift+Z
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === "z" &&
      event.shiftKey
    ) {
      event.preventDefault();
      RTStateManager.redo(scene);

      // Update counter UI
      document.getElementById("nowCount").textContent =
        RTStateManager.getDepositedCount();
    }

    // Connect: 'C' key (not Ctrl+C) - connect two selected Points with a Line
    if (event.key === "c" && !event.ctrlKey && !event.metaKey) {
      handleConnectAction();
    }
  });

  // ========================================================================
  // CONNECT / DISCONNECT BUTTON HANDLERS
  // ========================================================================

  /**
   * Handle Connect action - connect selected Points with Line(s)
   * - 2 Points: Creates 1 line
   * - 3 Points: Creates 3 lines (triangle)
   * Validation logic moved to RTStateManager.connectFromSelection()
   */
  function handleConnectAction() {
    const result = RTStateManager.connectFromSelection(scene);

    if (result) {
      // Update counter UI
      document.getElementById("nowCount").textContent =
        RTStateManager.getDepositedCount();

      // Clear selection and select the new line(s)
      deselectAll();

      // Handle both single line and array of lines (triangle)
      const lines = Array.isArray(result) ? result : [result];
      lines.forEach(line => {
        selectPolyhedron(line.threeObject, true); // true = add to selection
      });
    }
  }

  /**
   * Handle Disconnect action - disconnect a connected Line back to Points
   * Validation logic moved to RTStateManager.disconnectFromSelection()
   */
  function handleDisconnectAction() {
    if (RTStateManager.disconnectFromSelection(scene)) {
      // Update counter UI
      document.getElementById("nowCount").textContent =
        RTStateManager.getDepositedCount();

      // Clear selection
      deselectAll();
    }
  }

  // Wire up Connect button
  const connectBtn = document.getElementById("connectBtn");
  if (connectBtn) {
    connectBtn.addEventListener("click", handleConnectAction);
  }

  // Wire up Disconnect button
  const disconnectBtn = document.getElementById("disconnectBtn");
  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", handleDisconnectAction);
  }

  // Expose handlers globally for context menu
  window.handleConnectAction = handleConnectAction;
  window.handleDisconnectAction = handleDisconnectAction;

  // Signal that app initialization is complete
  window.dispatchEvent(new CustomEvent("artexplorer-ready"));
  MetaLog.log(MetaLog.SUMMARY, "✅ ARTexplorer initialization complete");
} // End startARTexplorer function
