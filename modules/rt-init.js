// MODULE IMPORTS
// ========================================================================
import { Polyhedra } from "./rt-polyhedra.js";
// PerformanceClock removed - now used internally by rt-rendering.js
import { RTPapercut } from "./rt-papercut.js";
// RT removed - now used internally by rt-rendering.js (passed to createRenderingAPI)
import { initQuadranceDemo } from "../demos/rt-quadrance-demo.js";
import { initCrossDemo } from "../demos/rt-cross-demo.js";
import { initWeierstrassDemo } from "../demos/rt-weierstrass-demo.js";
import { openDemoModal } from "../demos/rt-demo-utils.js";
import { colorTheoryModal } from "./color-theory-modal.js";

// PHASE 6 EXTRACTION: Import rendering API factory
import { initScene as createRenderingAPI } from "./rt-rendering.js";

// Make RTPolyhedra available globally for node geometry creation
window.RTPolyhedra = Polyhedra;

// TODO: Uncomment when ready to extract gumball to module
// import { RTControls } from "./modules/rt-controls.js";

// ========================================================================
// PASSWORD PROTECTION
// ========================================================================
const PASSWORD = "enzyme2026!";
const passwordOverlay = document.getElementById("password-overlay");
const passwordInput = document.getElementById("password-input");
const passwordSubmit = document.getElementById("password-submit");
const passwordError = document.getElementById("password-error");

// Check if already authenticated (session storage)
if (sessionStorage.getItem("artexplorer-auth") === "true") {
  passwordOverlay.classList.add("hidden");
  initApp();
} else {
  // Focus on password input
  passwordInput.focus();

  // Handle password submission
  function checkPassword() {
    if (passwordInput.value === PASSWORD) {
      sessionStorage.setItem("artexplorer-auth", "true");
      passwordOverlay.classList.add("hidden");
      passwordError.classList.add("hidden");
      initApp();
    } else {
      passwordError.classList.remove("hidden");
      passwordInput.value = "";
      passwordInput.focus();
    }
  }

  passwordSubmit.addEventListener("click", checkPassword);
  passwordInput.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      checkPassword();
    }
  });
}

// ========================================================================
// INFO MODAL
// ========================================================================
function initInfoModal() {
  const infoModalOverlay = document.getElementById("info-modal-overlay");
  const infoModalCloseBtn = document.getElementById("info-modal-close");
  const infoIconBtn = document.getElementById("info-icon-btn");

  // Show modal on first load (check sessionStorage)
  if (!sessionStorage.getItem("artexplorer-info-seen")) {
    infoModalOverlay.classList.remove("hidden");
  }

  // Open modal handler
  function openInfoModal() {
    infoModalOverlay.classList.remove("hidden");
  }

  // Close button handler
  function closeInfoModal() {
    infoModalOverlay.classList.add("hidden");
    sessionStorage.setItem("artexplorer-info-seen", "true");
  }

  // Info icon button to reopen modal
  infoIconBtn.addEventListener("click", openInfoModal);

  // Close button
  infoModalCloseBtn.addEventListener("click", closeInfoModal);

  // ESC key closes modal
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !infoModalOverlay.classList.contains("hidden")) {
      closeInfoModal();
    }
  });

  // Click outside modal to close
  infoModalOverlay.addEventListener("click", e => {
    if (e.target === infoModalOverlay) {
      closeInfoModal();
    }
  });
}

// ========================================================================
// APPLICATION INITIALIZATION
// ========================================================================
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
  // PHASE 6 EXTRACTION: Create rendering API (TEST - does not replace inline functions yet)
  // ========================================================================
  const renderingAPI = createRenderingAPI(THREE, OrbitControls, RT);
  console.log("[rt-init.js] ✅ Rendering API created:", renderingAPI);

  // Make rendering API globally accessible for file handler color restoration
  window.renderingAPI = renderingAPI;

  // ========================================================================
  // THREE.JS SCENE SETUP
  // ========================================================================
  // PHASE 6 EXTRACTION: Assign updateGeometry EARLY so event listeners can reference it
  // This function must be available BEFORE event listeners are registered (line ~2271)
  let updateGeometry = renderingAPI.updateGeometry;
  // updateGeometryStats removed - called internally by renderingAPI.updateGeometry()

  // PHASE 6 EXTRACTION: Declare variables that will be assigned AFTER initScene() is called
  // These objects don't exist yet - they're created inside renderingAPI.initScene()
  let scene, camera, renderer, controls;
  let cubeGroup, tetrahedronGroup, dualTetrahedronGroup, octahedronGroup;
  let icosahedronGroup, dodecahedronGroup, dualIcosahedronGroup;
  let cuboctahedronGroup, rhombicDodecahedronGroup;
  let geodesicIcosahedronGroup,
    geodesicTetrahedronGroup,
    geodesicOctahedronGroup;
  let cubeMatrixGroup, tetMatrixGroup, octaMatrixGroup;
  let cuboctaMatrixGroup, rhombicDodecMatrixGroup;
  let cartesianGrid, ivmPlanes;
  // cartesianBasis, quadrayBasis removed - managed internally by renderingAPI

  // PHASE 6 EXTRACTION: initScene() function now in rt-rendering.js
  // (Commented code removed - using renderingAPI.initScene())

  // PHASE 6 EXTRACTION: Grid creation functions now in rt-rendering.js
  // (Orphaned functions removed - tessellation sliders now call renderingAPI.rebuildQuadrayGrids/rebuildCartesianGrids)
  // Deleted ~370 lines: createCartesianGrid(), createQuadrayBasis(), createIVMGrid(), createIVMPlanes()

  // ========================================================================
  // NODE GEOMETRY CACHE (prevent repeated generation)
  // ========================================================================
  // NOTE: nodeGeometryCache removed - now managed by renderingAPI in rt-rendering.js
  // const nodeGeometryCache = new Map(); // ← REMOVED: Now in rt-rendering.js

  // PHASE 6 EXTRACTION: Helper functions now in rt-rendering.js
  // Removed: getPolyhedronEdgeQuadrance(), getClosePackedRadius(), getCachedNodeGeometry(),
  //          renderPolyhedron(), addMatrixNodes(), countGroupTriangles()
  // All rendering logic now managed by renderingAPI

  // PHASE 6 EXTRACTION: updateGeometry() and updateGeometryStats() now in rt-rendering.js
  // (Commented code removed - using renderingAPI.updateGeometry())

  // ========================================================================
  // PERFORMANCE MONITORING INITIALIZATION
  // ========================================================================
  // Initialize PerformanceClock with scene groups after they're created
  // (Happens in initScene() - see geodesicOctahedronGroup creation below)

  // PHASE 6 EXTRACTION: animate() function commented out - using renderingAPI.animate()
  // PHASE 6 EXTRACTION: animate() function now in rt-rendering.js
  // (Commented code removed - using renderingAPI.animate())

  // PHASE 6 EXTRACTION: onWindowResize() function now in rt-rendering.js

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  // Plane iOS-style toggle switches (Cartesian XYZ + Quadray WXYZ)
  document
    .querySelectorAll(".plane-toggle-switch[data-plane]")
    .forEach(toggleSwitch => {
      toggleSwitch.addEventListener("click", function () {
        // Toggle active state
        this.classList.toggle("active");

        const plane = this.dataset.plane;
        const isActive = this.classList.contains("active");

        // Update Cartesian grid visibility
        if (plane === "XY" && window.gridXY) {
          window.gridXY.visible = isActive;
        } else if (plane === "XZ" && window.gridXZ) {
          window.gridXZ.visible = isActive;
        } else if (plane === "YZ" && window.gridYZ) {
          window.gridYZ.visible = isActive;
        }
        // IVM Grids (Future Implementation) - placeholders, no action yet
        else if (plane.startsWith("quadray")) {
          // These toggles are placeholders for future TRUE IVM implementation
          // No action taken yet
        }
        // Update Central Angle Grid visibility (corrected implementation, 6 planes)
        else if (plane === "ivmWX" && window.ivmWX) {
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

        // Show/hide cartesianGrid group if any Cartesian plane is active
        const anyCartesianActive = Array.from(
          document.querySelectorAll(".plane-toggle-switch[data-plane]")
        ).some(
          sw =>
            !sw.dataset.plane.startsWith("quadray") &&
            !sw.dataset.plane.startsWith("ivm") &&
            sw.classList.contains("active")
        );
        if (cartesianGrid) {
          cartesianGrid.visible = anyCartesianActive;
        }

        // Show/hide ivmPlanes group if any IVM plane is active
        const anyIVMActive = Array.from(
          document.querySelectorAll(".plane-toggle-switch[data-plane]")
        ).some(
          sw =>
            sw.dataset.plane.startsWith("ivm") &&
            sw.classList.contains("active")
        );
        if (ivmPlanes) {
          ivmPlanes.visible = anyIVMActive;
        }
      });
    });

  document
    .getElementById("showCartesianBasis")
    .addEventListener("change", e => {
      renderingAPI.setCartesianBasisVisible(e.target.checked);
    });

  document.getElementById("showQuadray").addEventListener("change", e => {
    renderingAPI.setQuadrayBasisVisible(e.target.checked);
  });

  // Polyhedra toggles
  document
    .getElementById("showCube")
    .addEventListener("change", updateGeometry);

  // Tetrahedron with geodesic controls toggle
  const tetrahedronCheckbox = document.getElementById("showTetrahedron");
  const geodesicTetraCheckbox = document.getElementById(
    "showGeodesicTetrahedron"
  );
  if (tetrahedronCheckbox) {
    tetrahedronCheckbox.addEventListener("change", () => {
      const geodesicTetraControls =
        document.getElementById("geodesic-tetra-all");
      if (geodesicTetraControls) {
        // Keep controls visible if geodesic variant is checked (preserve settings)
        const shouldShow =
          tetrahedronCheckbox.checked ||
          (geodesicTetraCheckbox && geodesicTetraCheckbox.checked);
        geodesicTetraControls.style.display = shouldShow ? "block" : "none";
      }
      updateGeometry();
    });
  }
  // Also listen to geodesic checkbox to control visibility
  if (geodesicTetraCheckbox) {
    geodesicTetraCheckbox.addEventListener("change", () => {
      const geodesicTetraControls =
        document.getElementById("geodesic-tetra-all");
      if (geodesicTetraControls && geodesicTetraCheckbox.checked) {
        geodesicTetraControls.style.display = "block";
      }
      updateGeometry();
    });
  }

  // Dual Tetrahedron with geodesic controls toggle
  const dualTetrahedronCheckbox = document.getElementById(
    "showDualTetrahedron"
  );
  const geodesicDualTetraCheckbox = document.getElementById(
    "showGeodesicDualTetrahedron"
  );
  if (dualTetrahedronCheckbox) {
    dualTetrahedronCheckbox.addEventListener("change", () => {
      const geodesicDualTetraControls = document.getElementById(
        "geodesic-dual-tetra-all"
      );
      if (geodesicDualTetraControls) {
        // Keep controls visible if geodesic variant is checked (preserve settings)
        const shouldShow =
          dualTetrahedronCheckbox.checked ||
          (geodesicDualTetraCheckbox && geodesicDualTetraCheckbox.checked);
        geodesicDualTetraControls.style.display = shouldShow ? "block" : "none";
      }
      updateGeometry();
    });
  }
  // Also listen to geodesic checkbox to control visibility
  if (geodesicDualTetraCheckbox) {
    geodesicDualTetraCheckbox.addEventListener("change", () => {
      const geodesicDualTetraControls = document.getElementById(
        "geodesic-dual-tetra-all"
      );
      if (geodesicDualTetraControls && geodesicDualTetraCheckbox.checked) {
        geodesicDualTetraControls.style.display = "block";
      }
      updateGeometry();
    });
  }

  // Octahedron with geodesic controls toggle
  const octahedronCheckbox = document.getElementById("showOctahedron");
  const geodesicOctaCheckbox = document.getElementById(
    "showGeodesicOctahedron"
  );
  if (octahedronCheckbox) {
    octahedronCheckbox.addEventListener("change", () => {
      const geodesicOctaControls = document.getElementById("geodesic-octa-all");
      if (geodesicOctaControls) {
        // Keep controls visible if geodesic variant is checked (preserve settings)
        const shouldShow =
          octahedronCheckbox.checked ||
          (geodesicOctaCheckbox && geodesicOctaCheckbox.checked);
        geodesicOctaControls.style.display = shouldShow ? "block" : "none";
      }
      updateGeometry();
    });
  }
  // Also listen to geodesic checkbox to control visibility
  if (geodesicOctaCheckbox) {
    geodesicOctaCheckbox.addEventListener("change", () => {
      const geodesicOctaControls = document.getElementById("geodesic-octa-all");
      if (geodesicOctaControls && geodesicOctaCheckbox.checked) {
        geodesicOctaControls.style.display = "block";
      }
      updateGeometry();
    });
  }

  // Icosahedron with geodesic controls toggle
  const icosahedronCheckbox = document.getElementById("showIcosahedron");
  const geodesicIcosaCheckbox = document.getElementById(
    "showGeodesicIcosahedron"
  );
  if (icosahedronCheckbox) {
    icosahedronCheckbox.addEventListener("change", () => {
      const geodesicIcosaControls =
        document.getElementById("geodesic-icosa-all");
      if (geodesicIcosaControls) {
        // Keep controls visible if geodesic variant is checked (preserve settings)
        const shouldShow =
          icosahedronCheckbox.checked ||
          (geodesicIcosaCheckbox && geodesicIcosaCheckbox.checked);
        geodesicIcosaControls.style.display = shouldShow ? "block" : "none";
      }
      updateGeometry();
    });
  }
  // Also listen to geodesic checkbox to control visibility
  if (geodesicIcosaCheckbox) {
    geodesicIcosaCheckbox.addEventListener("change", () => {
      const geodesicIcosaControls =
        document.getElementById("geodesic-icosa-all");
      if (geodesicIcosaControls && geodesicIcosaCheckbox.checked) {
        geodesicIcosaControls.style.display = "block";
      }
      updateGeometry();
    });
  }
  document
    .getElementById("showDodecahedron")
    .addEventListener("change", updateGeometry);

  // Dual Icosahedron with geodesic controls toggle
  const dualIcosahedronCheckbox = document.getElementById(
    "showDualIcosahedron"
  );
  const geodesicDualIcosaCheckbox = document.getElementById(
    "showGeodesicDualIcosahedron"
  );
  if (dualIcosahedronCheckbox) {
    dualIcosahedronCheckbox.addEventListener("change", () => {
      const geodesicDualIcosaControls = document.getElementById(
        "geodesic-dual-icosa-all"
      );
      if (geodesicDualIcosaControls) {
        // Keep controls visible if geodesic variant is checked (preserve settings)
        const shouldShow =
          dualIcosahedronCheckbox.checked ||
          (geodesicDualIcosaCheckbox && geodesicDualIcosaCheckbox.checked);
        geodesicDualIcosaControls.style.display = shouldShow ? "block" : "none";
      }
      updateGeometry();
    });
  }
  // Also listen to geodesic checkbox to control visibility
  if (geodesicDualIcosaCheckbox) {
    geodesicDualIcosaCheckbox.addEventListener("change", () => {
      const geodesicDualIcosaControls = document.getElementById(
        "geodesic-dual-icosa-all"
      );
      if (geodesicDualIcosaControls && geodesicDualIcosaCheckbox.checked) {
        geodesicDualIcosaControls.style.display = "block";
      }
      updateGeometry();
    });
  }

  document
    .getElementById("showCuboctahedron")
    .addEventListener("change", updateGeometry);
  document
    .getElementById("showRhombicDodecahedron")
    .addEventListener("change", updateGeometry);

  // Matrix forms (IVM Arrays)
  const cubeMatrixCheckbox = document.getElementById("showCubeMatrix");
  if (cubeMatrixCheckbox) {
    cubeMatrixCheckbox.addEventListener("change", () => {
      const cubeMatrixControls = document.getElementById(
        "cube-matrix-controls"
      );
      if (cubeMatrixControls) {
        cubeMatrixControls.style.display = cubeMatrixCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const cubeMatrixSizeSlider = document.getElementById("cubeMatrixSizeSlider");
  if (cubeMatrixSizeSlider) {
    cubeMatrixSizeSlider.addEventListener("input", e => {
      const matrixSize = parseInt(e.target.value);
      document.getElementById("cubeMatrixSizeValue").textContent =
        `${matrixSize}×${matrixSize}`;
      updateGeometry();
    });
  }

  const cubeMatrixRotate45 = document.getElementById("cubeMatrixRotate45");
  if (cubeMatrixRotate45) {
    cubeMatrixRotate45.addEventListener("change", updateGeometry);
  }

  // Tet Matrix (IVM Array)
  const tetMatrixCheckbox = document.getElementById("showTetMatrix");
  if (tetMatrixCheckbox) {
    tetMatrixCheckbox.addEventListener("change", () => {
      const tetMatrixControls = document.getElementById("tet-matrix-controls");
      if (tetMatrixControls) {
        tetMatrixControls.style.display = tetMatrixCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const tetMatrixSizeSlider = document.getElementById("tetMatrixSizeSlider");
  if (tetMatrixSizeSlider) {
    tetMatrixSizeSlider.addEventListener("input", e => {
      const matrixSize = parseInt(e.target.value);
      document.getElementById("tetMatrixSizeValue").textContent =
        `${matrixSize}×${matrixSize}`;
      updateGeometry();
    });
  }

  const tetMatrixRotate45 = document.getElementById("tetMatrixRotate45");
  if (tetMatrixRotate45) {
    tetMatrixRotate45.addEventListener("change", updateGeometry);
  }

  // Octa Matrix (IVM Array)
  const octaMatrixCheckbox = document.getElementById("showOctaMatrix");
  if (octaMatrixCheckbox) {
    octaMatrixCheckbox.addEventListener("change", () => {
      const octaMatrixControls = document.getElementById(
        "octa-matrix-controls"
      );
      if (octaMatrixControls) {
        octaMatrixControls.style.display = octaMatrixCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const octaMatrixSizeSlider = document.getElementById("octaMatrixSizeSlider");
  if (octaMatrixSizeSlider) {
    octaMatrixSizeSlider.addEventListener("input", e => {
      const matrixSize = parseInt(e.target.value);
      document.getElementById("octaMatrixSizeValue").textContent =
        `${matrixSize}×${matrixSize}`;
      updateGeometry();
    });
  }

  const octaMatrixRotate45 = document.getElementById("octaMatrixRotate45");
  if (octaMatrixRotate45) {
    octaMatrixRotate45.addEventListener("change", updateGeometry);
  }

  // Octahedral Matrix: Colinear Edges checkbox
  const octaMatrixColinearEdges = document.getElementById(
    "octaMatrixColinearEdges"
  );
  if (octaMatrixColinearEdges) {
    octaMatrixColinearEdges.addEventListener("change", updateGeometry);
  }

  // Cuboctahedron Matrix (Vector Equilibrium Array)
  const cuboctaMatrixCheckbox = document.getElementById(
    "showCuboctahedronMatrix"
  );
  if (cuboctaMatrixCheckbox) {
    cuboctaMatrixCheckbox.addEventListener("change", () => {
      const cuboctaMatrixControls = document.getElementById(
        "cubocta-matrix-controls"
      );
      if (cuboctaMatrixControls) {
        cuboctaMatrixControls.style.display = cuboctaMatrixCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const cuboctaMatrixSizeSlider = document.getElementById(
    "cuboctaMatrixSizeSlider"
  );
  if (cuboctaMatrixSizeSlider) {
    cuboctaMatrixSizeSlider.addEventListener("input", e => {
      const matrixSize = parseInt(e.target.value);
      document.getElementById("cuboctaMatrixSizeValue").textContent =
        `${matrixSize}×${matrixSize}`;
      updateGeometry();
    });
  }

  const cuboctaMatrixRotate45 = document.getElementById(
    "cuboctaMatrixRotate45"
  );
  if (cuboctaMatrixRotate45) {
    cuboctaMatrixRotate45.addEventListener("change", updateGeometry);
  }

  // Rhombic Dodecahedron Matrix (Space-Filling Array)
  const rhombicDodecMatrixCheckbox = document.getElementById(
    "showRhombicDodecMatrix"
  );
  if (rhombicDodecMatrixCheckbox) {
    rhombicDodecMatrixCheckbox.addEventListener("change", () => {
      const rhombicDodecMatrixControls = document.getElementById(
        "rhombic-dodec-matrix-controls"
      );
      if (rhombicDodecMatrixControls) {
        rhombicDodecMatrixControls.style.display =
          rhombicDodecMatrixCheckbox.checked ? "block" : "none";
      }
      updateGeometry();
    });
  }

  const rhombicDodecMatrixSizeSlider = document.getElementById(
    "rhombicDodecMatrixSizeSlider"
  );
  if (rhombicDodecMatrixSizeSlider) {
    rhombicDodecMatrixSizeSlider.addEventListener("input", e => {
      const matrixSize = parseInt(e.target.value);
      document.getElementById("rhombicDodecMatrixSizeValue").textContent =
        `${matrixSize}×${matrixSize}`;
      updateGeometry();
    });
  }

  const rhombicDodecMatrixRotate45 = document.getElementById(
    "rhombicDodecMatrixRotate45"
  );
  if (rhombicDodecMatrixRotate45) {
    rhombicDodecMatrixRotate45.addEventListener("change", updateGeometry);
  }

  // Rhombic Dodecahedron Matrix: Face Coplanarity checkbox
  const rhombicDodecMatrixFaceCoplanar = document.getElementById(
    "rhombicDodecMatrixFaceCoplanar"
  );
  if (rhombicDodecMatrixFaceCoplanar) {
    rhombicDodecMatrixFaceCoplanar.addEventListener("change", updateGeometry);
  }

  // ========== RADIAL MATRICES ==========

  // Radial Cube Matrix
  const radialCubeCheckbox = document.getElementById("showRadialCubeMatrix");
  if (radialCubeCheckbox) {
    radialCubeCheckbox.addEventListener("change", () => {
      const radialCubeControls = document.getElementById(
        "radial-cube-matrix-controls"
      );
      if (radialCubeControls) {
        radialCubeControls.style.display = radialCubeCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const radialCubeFreqSlider = document.getElementById("radialCubeFreqSlider");
  if (radialCubeFreqSlider) {
    radialCubeFreqSlider.addEventListener("input", e => {
      const freq = parseInt(e.target.value);
      document.getElementById("radialCubeFreqDisplay").textContent = `F${freq}`;
      updateGeometry();
    });
  }

  const radialCubeSpaceFill = document.getElementById("radialCubeSpaceFill");
  if (radialCubeSpaceFill) {
    radialCubeSpaceFill.addEventListener("change", updateGeometry);
  }

  // Radial Rhombic Dodecahedron Matrix
  const radialRhombicDodecCheckbox = document.getElementById(
    "showRadialRhombicDodecMatrix"
  );
  if (radialRhombicDodecCheckbox) {
    radialRhombicDodecCheckbox.addEventListener("change", () => {
      const radialRhombicDodecControls = document.getElementById(
        "radial-rhombic-dodec-matrix-controls"
      );
      if (radialRhombicDodecControls) {
        radialRhombicDodecControls.style.display =
          radialRhombicDodecCheckbox.checked ? "block" : "none";
      }
      updateGeometry();
    });
  }

  const radialRhombicDodecFreqSlider = document.getElementById(
    "radialRhombicDodecFreqSlider"
  );
  if (radialRhombicDodecFreqSlider) {
    radialRhombicDodecFreqSlider.addEventListener("input", e => {
      const freq = parseInt(e.target.value);
      document.getElementById("radialRhombicDodecFreqDisplay").textContent =
        `F${freq}`;
      updateGeometry();
    });
  }

  // RD space-fill toggle removed - RD is inherently space-filling

  // Phase 2.7a, 2.7b, 2.7c: Geodesic controls
  document
    .getElementById("showGeodesicIcosahedron")
    .addEventListener("change", updateGeometry);

  // Geodesic Icosahedron frequency slider
  const geodesicIcosaFrequency = document.getElementById("geodesicIcosaFrequency");
  geodesicIcosaFrequency.addEventListener("input", e => {
    e.target.nextElementSibling.textContent = e.target.value;
    updateGeometry();
  });
  geodesicIcosaFrequency.addEventListener("change", updateGeometry);

  document
    .getElementById("showGeodesicTetrahedron")
    .addEventListener("change", updateGeometry);

  // Geodesic Tetrahedron frequency slider
  const geodesicTetraFrequency = document.getElementById("geodesicTetraFrequency");
  geodesicTetraFrequency.addEventListener("input", e => {
    e.target.nextElementSibling.textContent = e.target.value;
    updateGeometry();
  });
  geodesicTetraFrequency.addEventListener("change", updateGeometry);

  // Phase 2.9: Projection radio buttons
  document
    .querySelectorAll('input[name="geodesicTetraProjection"]')
    .forEach(radio => {
      radio.addEventListener("change", updateGeometry);
    });

  // Geodesic Dual Tetrahedron controls
  document
    .getElementById("showGeodesicDualTetrahedron")
    .addEventListener("change", updateGeometry);

  // Geodesic Dual Tetrahedron frequency slider
  const geodesicDualTetraFrequency = document.getElementById("geodesicDualTetraFrequency");
  geodesicDualTetraFrequency.addEventListener("input", e => {
    e.target.nextElementSibling.textContent = e.target.value;
    updateGeometry();
  });
  geodesicDualTetraFrequency.addEventListener("change", updateGeometry);

  document
    .querySelectorAll('input[name="geodesicDualTetraProjection"]')
    .forEach(radio => {
      radio.addEventListener("change", updateGeometry);
    });

  document
    .getElementById("showGeodesicOctahedron")
    .addEventListener("change", updateGeometry);

  // Geodesic Octahedron frequency slider
  const geodesicOctaFrequency = document.getElementById("geodesicOctaFrequency");
  geodesicOctaFrequency.addEventListener("input", e => {
    e.target.nextElementSibling.textContent = e.target.value;
    updateGeometry();
  });
  geodesicOctaFrequency.addEventListener("change", updateGeometry);

  document
    .querySelectorAll('input[name="geodesicOctaProjection"]')
    .forEach(radio => {
      radio.addEventListener("change", updateGeometry);
    });
  document
    .querySelectorAll('input[name="geodesicIcosaProjection"]')
    .forEach(radio => {
      radio.addEventListener("change", updateGeometry);
    });

  // Geodesic Dual Icosahedron controls
  document
    .getElementById("showGeodesicDualIcosahedron")
    .addEventListener("change", updateGeometry);

  // Geodesic Dual Icosahedron frequency slider
  const geodesicDualIcosaFrequency = document.getElementById("geodesicDualIcosaFrequency");
  geodesicDualIcosaFrequency.addEventListener("input", e => {
    e.target.nextElementSibling.textContent = e.target.value;
    updateGeometry();
  });
  geodesicDualIcosaFrequency.addEventListener("change", updateGeometry);

  document
    .querySelectorAll('input[name="geodesicDualIcosaProjection"]')
    .forEach(radio => {
      radio.addEventListener("change", updateGeometry);
    });

  // Dual Scale Sliders - Linked with Smart Snapping
  // ONE unified metric, TWO presentation modes
  // Both snap to 0.10 intervals, show 2 decimal places
  // Which slider you adjust determines which shows rational values

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

    updateGeometry();
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

    updateGeometry();
  });

  // Face Opacity slider
  document.getElementById("opacitySlider").addEventListener("input", e => {
    document.getElementById("opacityValue").textContent = e.target.value;
    updateGeometry();
  });

  // Node Opacity slider
  document.getElementById("nodeOpacitySlider").addEventListener("input", e => {
    const opacity = parseFloat(e.target.value);
    document.getElementById("nodeOpacityValue").textContent = opacity;
    renderingAPI.setNodeOpacity(opacity);
    updateGeometry();
  });

  // Quadray Grid Tessellation Slider
  document.getElementById("quadrayTessSlider").addEventListener("input", e => {
    const tessValue = parseInt(e.target.value);
    document.getElementById("quadrayTessValue").textContent = tessValue;

    // Collect current visibility state
    const visibilityState = {};
    document.querySelectorAll('[data-plane^="ivm"]').forEach(toggle => {
      const planeName = toggle.dataset.plane;
      visibilityState[planeName] = toggle.classList.contains("active");
    });

    // Rebuild grids using rendering API
    renderingAPI.rebuildQuadrayGrids(tessValue, visibilityState);
  });

  // Cartesian Grid Tessellation Slider
  document
    .getElementById("cartesianTessSlider")
    .addEventListener("input", e => {
      const tessValue = parseInt(e.target.value);
      document.getElementById("cartesianTessValue").textContent = tessValue;

      // Collect current visibility state
      const visibilityState = {
        gridXY:
          document
            .querySelector('[data-plane="XY"]')
            ?.classList.contains("active") ?? false,
        gridXZ:
          document
            .querySelector('[data-plane="XZ"]')
            ?.classList.contains("active") ?? false,
        gridYZ:
          document
            .querySelector('[data-plane="YZ"]')
            ?.classList.contains("active") ?? false,
        cartesianBasis:
          document.getElementById("showCartesianBasis")?.checked ?? false,
      };

      // Rebuild grids using rendering API
      renderingAPI.rebuildCartesianGrids(tessValue, visibilityState);
    });

  // Reset camera to default axo view
  document.getElementById("resetCamera").addEventListener("click", () => {
    renderingAPI.setCameraPreset("axo");
  });

  // ========================================================================
  // VIEW CONTROLS - Camera Presets
  // ========================================================================

  let orthographicCamera = null;
  // PHASE 6 EXTRACTION: switchCameraType() and setCameraPreset() functions now in rt-rendering.js

  // Enable view preset buttons and wire up event listeners
  const viewButtons = [
    { id: "viewTop", view: "top" },
    { id: "viewBottom", view: "bottom" },
    { id: "viewLeft", view: "left" },
    { id: "viewRight", view: "right" },
    { id: "viewFront", view: "front" },
    { id: "viewBack", view: "back" },
    { id: "viewAxo", view: "axo" },
    { id: "viewPerspective", view: "perspective" },
    // WXYZ Tetrahedral Basis Views
    { id: "viewW", view: "w" },
    { id: "viewX", view: "x" },
    { id: "viewY", view: "y" },
    { id: "viewZ", view: "z" },
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
    });
  });

  // Orthographic/Perspective toggle (works for both XYZ and WXYZ views)
  const orthoCheckbox = document.getElementById("orthoPerspective");
  orthoCheckbox.addEventListener("change", e => {
    renderingAPI.switchCameraType(e.target.checked);
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

      // Toggle collapsed state
      this.classList.toggle("collapsed");
      targetOptions.classList.toggle("collapsed");
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

  // Node size selector functionality
  document.querySelectorAll(".node-size-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      // Clear geometry cache when size changes
      renderingAPI.clearNodeCache();
      // Remove active from all buttons
      document
        .querySelectorAll(".node-size-btn")
        .forEach(b => b.classList.remove("active"));
      // Add active to clicked button
      this.classList.add("active");
      // Trigger re-render
      updateGeometry();
    });
  });

  // Node geometry type toggle (Classical vs RT)
  // NOTE: useRTNodeGeometry variable removed - now managed by renderingAPI
  // let useRTNodeGeometry = false; // ← REMOVED: Now in rt-rendering.js

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

  // Color Theory Modal - Set rendering API reference
  colorTheoryModal.setRenderingAPI(renderingAPI);

  document
    .getElementById("open-color-theory-modal")
    .addEventListener("click", e => {
      e.preventDefault();
      colorTheoryModal.open();
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
  let selectedHandle = null; // { type: 'quadray'|'cartesian', index: number, axis: Vector3 }
  let dragPlane = null; // THREE.Plane for raycasting
  let dragStartPoint = new THREE.Vector3();
  let selectedPolyhedra = []; // Will store currently selected polyhedra
  let justFinishedDrag = false; // Track if we just completed a drag (prevent deselect on click-after-drag)
  let editingBasis = null; // Localized gumball that follows selected Forms

  // ========================================================================
  // SELECTION STATE
  // ========================================================================
  let currentSelection = null; // Currently selected polyhedron (Form or Instance)

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

      // Create instance using RTStateManager
      const instance = RTStateManager.createInstance(poly, scene);

      // Reset Form to origin
      RTStateManager.resetForm(poly);

      // Check if this was a matrix form
      if (
        formType === "cubeMatrix" ||
        formType === "tetMatrix" ||
        formType === "octaMatrix" ||
        formType === "cuboctaMatrix" ||
        formType === "rhombicDodecMatrix"
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

    console.log(
      `📦 Total deposited instances: ${RTStateManager.getDepositedCount()}`
    );
    console.log(`🏠 Forms reset to origin - ready for next transformation`);
  });

  // INLINE BUTTON HANDLERS - RESTORED (Module extraction deferred)
  // Gumball tool selector functionality
  document.querySelectorAll(".toggle-btn.variant-tool").forEach(btn => {
    btn.addEventListener("click", function () {
      const tool = this.dataset.gumballTool;

      // Toggle: if clicking active button, deactivate it
      if (this.classList.contains("active")) {
        this.classList.remove("active");
        currentGumballTool = null;
        controls.enabled = true; // Re-enable orbit controls
        destroyEditingBasis(); // Remove editing basis
        console.log("✅ Gumball disabled - orbit controls enabled");
      } else {
        // Remove active from all gumball tool buttons
        document
          .querySelectorAll(".toggle-btn.variant-tool")
          .forEach(b => b.classList.remove("active"));
        // Add active to clicked button
        this.classList.add("active");
        currentGumballTool = tool;
        controls.enabled = false; // Disable orbit controls when gumball tool active

        // Create editing basis at selected Forms' center
        const selected = getSelectedPolyhedra();
        if (selected.length > 0) {
          // Use first selected polyhedron's position and pass the object for sizing
          createEditingBasis(selected[0].position.clone(), selected[0]);
        }

        console.log(`✅ Gumball tool: ${tool} - orbit controls disabled`);
      }
    });
  });

  // Snap toggle button functionality (NOW HANDLED BY rt-controls.js)
  document.querySelectorAll(".toggle-btn.variant-snap").forEach(btn => {
    btn.addEventListener("click", function () {
      const snapMode = this.dataset.snapMode;

      // Remove active from all snap buttons
      document.querySelectorAll(".toggle-btn.variant-snap").forEach(b => {
        b.classList.remove("active");
      });

      // Add active to clicked button
      this.classList.add("active");

      // Update global snap mode
      currentSnapMode = snapMode;

      console.log(`📐 Snap mode changed to: ${snapMode.toUpperCase()}`);
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
  setupRotationInputs("rotWDegrees", "rotWSpread", "W");
  setupRotationInputs("rotXQDegrees", "rotXQSpread", "X (Quadray)");
  setupRotationInputs("rotYQDegrees", "rotYQSpread", "Y (Quadray)");
  setupRotationInputs("rotZQDegrees", "rotZQSpread", "Z (Quadray)");

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

      console.log("✅ Tool mode exited - orbit enabled, selection preserved");
    }
  }

  /**
   * Setup coordinate input handler for MOVE mode (XYZ fields)
   */
  function setupMoveCoordinateInputs() {
    const coordInputs = [
      { id: "coordX", axis: "x", name: "X" },
      { id: "coordY", axis: "y", name: "Y" },
      { id: "coordZ", axis: "z", name: "Z" },
    ];

    coordInputs.forEach(({ id, axis, name }) => {
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

          // Apply position change
          selected.forEach(poly => {
            poly.position[axis] = value;
            console.log(`📍 ${name} position set to ${value.toFixed(4)}`);
          });

          // Update WXYZ coordinates
          if (selected.length > 0) {
            const pos = selected[0].position;
            const basisVectors = Quadray.basisVectors;
            let wxyz = [0, 0, 0, 0];
            for (let i = 0; i < 4; i++) {
              wxyz[i] = pos.dot(basisVectors[i]);
            }
            const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
            wxyz = wxyz.map(c => c - mean);

            document.getElementById("coordW").value = wxyz[0].toFixed(4);
            document.getElementById("coordX2").value = wxyz[1].toFixed(4);
            document.getElementById("coordY2").value = wxyz[2].toFixed(4);
            document.getElementById("coordZ2").value = wxyz[3].toFixed(4);
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
      { id: "coordW", index: 0, name: "W" },
      { id: "coordX2", index: 1, name: "X" },
      { id: "coordY2", index: 2, name: "Y" },
      { id: "coordZ2", index: 3, name: "Z" },
    ];

    coordInputs.forEach(({ id, index, name }) => {
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

          // Get all WXYZ values
          let wxyz = [
            parseFloat(document.getElementById("coordW").value),
            parseFloat(document.getElementById("coordX2").value),
            parseFloat(document.getElementById("coordY2").value),
            parseFloat(document.getElementById("coordZ2").value),
          ];

          // Convert WXYZ to Cartesian
          const newPos = Quadray.toCartesian(
            wxyz[0],
            wxyz[1],
            wxyz[2],
            wxyz[3],
            THREE
          );

          // Apply position
          selected.forEach(poly => {
            poly.position.copy(newPos);
            console.log(
              `📍 WXYZ position set: (${wxyz[0].toFixed(4)}, ${wxyz[1].toFixed(4)}, ${wxyz[2].toFixed(4)}, ${wxyz[3].toFixed(4)})`
            );
          });

          // Update XYZ coordinates
          document.getElementById("coordX").value = newPos.x.toFixed(4);
          document.getElementById("coordY").value = newPos.y.toFixed(4);
          document.getElementById("coordZ").value = newPos.z.toFixed(4);

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

          // Apply rotation
          selected.forEach(poly => {
            poly.rotateOnWorldAxis(axis, radians);
            console.log(
              `🔄 Rotated ${degrees.toFixed(2)}° around ${name} axis`
            );
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
    const rotInputs = [
      { id: "rotWDegrees", basisIndex: 0, name: "W" },
      { id: "rotXQDegrees", basisIndex: 1, name: "X (Quadray)" },
      { id: "rotYQDegrees", basisIndex: 2, name: "Y (Quadray)" },
      { id: "rotZQDegrees", basisIndex: 3, name: "Z (Quadray)" },
    ];

    rotInputs.forEach(({ id, basisIndex, name }) => {
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

          // Apply rotation
          selected.forEach(poly => {
            poly.rotateOnWorldAxis(axis, radians);
            console.log(
              `🔄 Rotated ${degrees.toFixed(2)}° around ${name} axis`
            );
          });

          // Exit tool mode but keep selection
          exitToolMode();
        }
      });
    });
  }

  // Initialize all coordinate/rotation input handlers
  setupMoveCoordinateInputs();
  setupMoveQuadrayInputs();
  setupRotateDegreesInputs();
  setupRotateQuadrayDegreesInputs();

  // ========================================================================
  // EDITING BASIS MANAGEMENT (Localized Gumball)
  // ========================================================================

  /**
   * Create EDITING BASIS (localized gumball) at specified position
   *
   * SYSTEMS 3 & 4 OF 4: Interactive transformation handles for selected Forms
   *
   * SYSTEM 3: Editing Quadray Basis (WXYZ)
   * - Location: rt-init.js (this file)
   * - Purpose: Interactive Move/Scale/Rotate handles for tetrahedral coordinates
   * - Scaling: Dynamic - scales with tetEdge slider for optimal interaction
   * - Visual: Conical arrows (Move/Scale) or hexagonal rotation handles (Rotate)
   * - Interaction: Click/drag to transform selected Form in WXYZ coordinates
   *
   * SYSTEM 4: Editing Cartesian Basis (XYZ)
   * - Location: rt-init.js (this file)
   * - Purpose: Interactive Move/Scale/Rotate handles for orthogonal coordinates
   * - Scaling: Dynamic - scales with tetEdge slider for optimal interaction
   * - Visual: Conical arrows (Move/Scale) or circular rotation handles (Rotate)
   * - Interaction: Click/drag to transform selected Form in XYZ coordinates
   *
   * See also: Symbolic basis vectors in rt-rendering.js (non-interactive reference)
   *
   * @param {THREE.Vector3} position - Position to create the basis at
   * @param {THREE.Group} selectedObject - The selected form/instance for sizing
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

    // Use tetEdge from slider for arrow length (performant, works for all forms)
    // For platonic solids: tetEdge ≈ OutSphere radius (good fit)
    // For geodesics: tetEdge < OutSphere (handles outside - easier to grab)
    const tetEdge = parseFloat(document.getElementById("tetScaleSlider").value);
    const arrowLength = tetEdge;
    const headLength = 0.3;

    // ALTERNATIVE: Bounding box calculation (more accurate but slower)
    // Useful for large subdivided geodesics if tetEdge becomes too small
    // Uncomment if needed for specific form types:
    /*
          const boundingBox = new THREE.Box3().setFromObject(selectedObject);
          const size = new THREE.Vector3();
          boundingBox.getSize(size);
          const outSphereRadius = Math.max(size.x, size.y, size.z) * Math.sqrt(3) / 2;
          const arrowLength = outSphereRadius;
          */

    // Determine handle type based on active tool
    const isScaleMode = currentGumballTool === "scale";
    const isRotateMode = currentGumballTool === "rotate";

    let basisCount = 0;

    // ========================================================================
    // QUADRAY BASIS VECTORS (WXYZ) - Tetrahedral coordinate system
    // ========================================================================
    if (showQuadray) {
      const quadrayColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]; // R, G, B, Y

      Quadray.basisVectors.forEach((vec, i) => {
        if (isRotateMode) {
          // ROTATE MODE: Hexagonal circle (arc handle) perpendicular to axis
          const circleRadius = arrowLength * 0.9; // Slightly smaller than arrow length
          const segments = 6; // Hexagon for WXYZ differentiation

          // Create hexagonal circle using EllipseCurve with 6 segments
          const curve = new THREE.EllipseCurve(
            0,
            0, // center x, y
            circleRadius,
            circleRadius, // xRadius, yRadius
            0,
            2 * Math.PI, // start angle, end angle
            false, // clockwise
            0 // rotation
          );

          const points = curve.getPoints(segments);
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: quadrayColors[i],
            linewidth: 2,
            transparent: true,
            opacity: 0.8,
          });

          const rotationHandle = new THREE.LineLoop(geometry, material);

          // Orient circle perpendicular to the axis vector
          // Default circle is in XY plane (normal = Z-axis)
          const defaultNormal = new THREE.Vector3(0, 0, 1);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            defaultNormal,
            vec
          );
          rotationHandle.setRotationFromQuaternion(quaternion);

          editingBasis.add(rotationHandle);

          // Torus hit zone for clicking (visible for debugging)
          const hitThickness = 0.15; // Clickable area thickness
          const hitZone = new THREE.Mesh(
            new THREE.TorusGeometry(circleRadius, hitThickness, 16, 64),
            new THREE.MeshBasicMaterial({
              color: quadrayColors[i],
              transparent: true,
              opacity: 0.2, // Visible for debugging
              depthTest: false,
            })
          );

          hitZone.setRotationFromQuaternion(quaternion);
          hitZone.userData.basisType = "quadray";
          hitZone.userData.basisIndex = i;
          hitZone.userData.basisAxis = vec.clone();
          hitZone.userData.isGumballHandle = true;
          hitZone.userData.isRotationHandle = true;

          editingBasis.add(hitZone);
        } else {
          // MOVE/SCALE MODE: Arrow with handle at tip
          const arrow = new THREE.ArrowHelper(
            vec,
            new THREE.Vector3(0, 0, 0),
            arrowLength,
            quadrayColors[i],
            isScaleMode ? 0 : headLength, // No arrowhead in Scale mode
            0.2
          );

          editingBasis.add(arrow);

          // Add handle at arrow tip - CUBE for Scale, SPHERE for Move
          const tipPosition = vec.clone().multiplyScalar(arrowLength);

          let handle;
          if (isScaleMode) {
            // SCALE MODE: Cube handle
            const cubeSize = 0.4;
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
            // MOVE MODE: Sphere handle
            handle = new THREE.Mesh(
              new THREE.SphereGeometry(0.5, 16, 16),
              new THREE.MeshBasicMaterial({
                color: quadrayColors[i],
                transparent: true,
                opacity: 0.3, // Semi-visible for debugging
                depthTest: true,
              })
            );
          }

          handle.position.copy(tipPosition);
          handle.userData.basisType = "quadray";
          handle.userData.basisIndex = i;
          handle.userData.basisAxis = vec.clone();
          handle.userData.isGumballHandle = true;

          editingBasis.add(handle);
        }
      });
      basisCount++;
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
          // ROTATE MODE: Smooth circle (arc handle) perpendicular to axis
          const circleRadius = arrowLength * 0.9; // Slightly smaller than arrow length
          const segments = 64; // Smooth circle for XYZ

          // Create smooth circle using EllipseCurve with many segments
          const curve = new THREE.EllipseCurve(
            0,
            0, // center x, y
            circleRadius,
            circleRadius, // xRadius, yRadius
            0,
            2 * Math.PI, // start angle, end angle
            false, // clockwise
            0 // rotation
          );

          const points = curve.getPoints(segments);
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: cartesianColors[i],
            linewidth: 2,
            transparent: true,
            opacity: 0.8,
          });

          const rotationHandle = new THREE.LineLoop(geometry, material);

          // Orient circle perpendicular to the axis vector
          // Default circle is in XY plane (normal = Z-axis)
          const defaultNormal = new THREE.Vector3(0, 0, 1);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            defaultNormal,
            vec
          );
          rotationHandle.setRotationFromQuaternion(quaternion);

          editingBasis.add(rotationHandle);

          // Torus hit zone for clicking (visible for debugging)
          const hitThickness = 0.15; // Clickable area thickness
          const hitZone = new THREE.Mesh(
            new THREE.TorusGeometry(circleRadius, hitThickness, 16, 64),
            new THREE.MeshBasicMaterial({
              color: cartesianColors[i],
              transparent: true,
              opacity: 0.2, // Visible for debugging
              depthTest: false,
            })
          );

          hitZone.setRotationFromQuaternion(quaternion);
          hitZone.userData.basisType = "cartesian";
          hitZone.userData.basisIndex = i;
          hitZone.userData.basisAxis = vec.clone();
          hitZone.userData.isGumballHandle = true;
          hitZone.userData.isRotationHandle = true;

          editingBasis.add(hitZone);
        } else {
          // MOVE/SCALE MODE: Arrow with handle at tip
          const arrow = new THREE.ArrowHelper(
            vec,
            new THREE.Vector3(0, 0, 0),
            arrowLength,
            cartesianColors[i],
            isScaleMode ? 0 : headLength, // No arrowhead in Scale mode
            0.2
          );

          editingBasis.add(arrow);

          // Add handle at arrow tip - CUBE for Scale, SPHERE for Move
          const tipPosition = vec.clone().multiplyScalar(arrowLength);

          let handle;
          if (isScaleMode) {
            // SCALE MODE: Cube handle
            const cubeSize = 0.4;
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
            // MOVE MODE: Sphere handle
            handle = new THREE.Mesh(
              new THREE.SphereGeometry(0.5, 16, 16),
              new THREE.MeshBasicMaterial({
                color: cartesianColors[i],
                transparent: true,
                opacity: 0.3, // Semi-visible for debugging
                depthTest: true,
              })
            );
          }

          handle.position.copy(tipPosition);
          handle.userData.basisType = "cartesian";
          handle.userData.basisIndex = i;
          handle.userData.basisAxis = vec.clone();
          handle.userData.isGumballHandle = true;

          editingBasis.add(handle);
        }
      });
      basisCount++;
    }

    // ========================================================================
    // CENTRAL SPHERE for UNIFORM SCALING (Scale mode only)
    // ========================================================================
    if (isScaleMode) {
      const centralSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 32, 32),
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

    // Log which coordinate systems are shown
    const systems = [];
    if (showQuadray) systems.push("WXYZ");
    if (showCartesian) systems.push("XYZ");
    const systemsStr = systems.length > 0 ? systems.join(" + ") : "NONE";
    console.log(
      `✅ Created editing basis (${systemsStr}) at position: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`
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
      console.log("✅ Editing basis destroyed");
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
   */
  function selectPolyhedron(polyhedron) {
    // Deselect previous selection
    if (currentSelection) {
      clearHighlight(currentSelection);
    }

    // Set new selection
    currentSelection = polyhedron;

    // Apply highlight
    applyHighlight(polyhedron);

    const type = polyhedron.userData.isInstance ? "Instance" : "Form";
    const name = polyhedron.userData.type || "unknown";
    console.log(`✅ Selected ${type}: ${name}`);
  }

  /**
   * Apply highlight glow to selected polyhedron
   * Enhanced with stronger emissive and thicker edges for visibility
   */
  function applyHighlight(polyhedron) {
    polyhedron.traverse(obj => {
      if (obj.isMesh) {
        // Store original emissive for restoration
        obj.userData.originalEmissive = obj.material.emissive.clone();
        obj.userData.originalEmissiveIntensity = obj.material.emissiveIntensity;

        // Apply bright cyan glow (more intense and visible)
        obj.material.emissive.setHex(0x00ffff);
        obj.material.emissiveIntensity = 0.8;
      } else if (obj.isLine) {
        // Store original line width
        obj.userData.originalLineWidth = obj.material.linewidth || 1;

        // Increase line width for selected edges (more visible)
        obj.material.linewidth = 3;
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
        } else {
          // Fallback: reset to black emissive (default for non-node meshes)
          // Note: Node meshes should have originalEmissive saved, but this
          // catches any edge cases where it wasn't stored
          obj.material.emissive.setHex(0x000000);
          obj.material.emissiveIntensity = 0;
        }
      } else if (obj.isLine && obj.userData.originalLineWidth !== undefined) {
        obj.material.linewidth = obj.userData.originalLineWidth;
        delete obj.userData.originalLineWidth;
      }
    });
  }

  /**
   * Deselect all polyhedra
   */
  function deselectAll() {
    if (currentSelection) {
      clearHighlight(currentSelection);
      currentSelection = null;
    }
    console.log("✅ Deselected all");
  }

  /**
   * Handle canvas click for object selection
   */
  function onCanvasClick(event) {
    // Don't select during drag operations
    if (isDragging) return;

    // Don't deselect immediately after completing a drag
    // (mouseup fires, then click fires - we want to ignore the click)
    if (justFinishedDrag) {
      justFinishedDrag = false;
      console.log("🚫 Ignoring click-after-drag (selection preserved)");
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
        selectPolyhedron(parentEntry.parent);
      }
    }
    // NOTE: Clicking empty space no longer deselects
    // Deselection now requires: ESC key OR NOW button
    // This allows users to orbit camera between transformations without losing selection
  }

  // Get selected polyhedra - returns only currently selected polyhedron
  function getSelectedPolyhedra() {
    // Return only the currently selected polyhedron (if any)
    if (currentSelection) {
      return [currentSelection];
    }
    return [];
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
        // Only work if a gumball tool is active (Move, Scale, or Rotate mode)
        // NOTE: This code is deprecated - gumball functionality moved to rt-controls.js
        // Keeping this check for backward compatibility
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

        raycaster.setFromCamera(mouse, camera);

        // Check editing basis (localized gumball) if it exists
        if (editingBasis) {
          // Collect all gumball handle hit spheres from editing basis
          const hitTargets = [];
          editingBasis.traverse(obj => {
            if (obj.userData.isGumballHandle) {
              hitTargets.push(obj);
            }
          });

          console.log(
            `🎯 Editing basis exists, found ${hitTargets.length} hit targets`
          );

          const intersects = raycaster.intersectObjects(hitTargets, false);

          console.log(`🎯 Raycaster intersects: ${intersects.length}`);

          if (intersects.length > 0) {
            // Get the first intersected handle
            const handle = intersects[0].object;

            if (handle.userData.isGumballHandle) {
              event.preventDefault();
              event.stopPropagation();

              isDragging = true;
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
          }
        } else {
          console.warn(
            "⚠️ No editing basis found - did you activate Move tool?"
          );
        }
      },
      { capture: true }
    ); // Capture phase to intercept before OrbitControls

    // Mouse move - perform dragging
    renderer.domElement.addEventListener(
      "mousemove",
      event => {
        if (!isDragging || !selectedHandle) return;

        // Prevent orbit controls from receiving this event
        event.preventDefault();
        event.stopPropagation();

        console.log("🔄 Dragging...");

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

                // Calculate new scale multiplier
                const scaleMultiplier = 1 + scaleDelta * 0.01; // Convert delta to percentage
                const newScale = poly.userData.currentScale * scaleMultiplier;

                // Clamp scale to reasonable bounds (0.1 to 10.0)
                const clampedScale = Math.max(0.1, Math.min(10.0, newScale));

                // Apply uniform scale to the object
                poly.scale.set(clampedScale, clampedScale, clampedScale);

                // Store current scale for next frame
                poly.userData.currentScale = clampedScale;

                console.log(
                  `✅ Scaled ${poly.userData.isInstance ? "Instance" : "Form"}: ${clampedScale.toFixed(4)}`
                );
              });

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
            const rotationCenter = editingBasis
              ? editingBasis.position
              : new THREE.Vector3(0, 0, 0);
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
              // WXYZ axes: index 0=W, 1=X, 2=Y, 3=Z
              const axisNames = ["W", "XQ", "YQ", "ZQ"];
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

            document.getElementById("coordW").value = wxyz[0].toFixed(4);
            document.getElementById("coordX2").value = wxyz[1].toFixed(4);
            document.getElementById("coordY2").value = wxyz[2].toFixed(4);
            document.getElementById("coordZ2").value = wxyz[3].toFixed(4);
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

              document.getElementById("coordW").value = wxyz[0].toFixed(4);
              document.getElementById("coordX2").value = wxyz[1].toFixed(4);
              document.getElementById("coordY2").value = wxyz[2].toFixed(4);
              document.getElementById("coordZ2").value = wxyz[3].toFixed(4);
            }
          } else {
            console.log(
              "✨ Free mode - no snapping applied (full precision preserved)"
            );
          }

          // Mark that we just finished a drag to prevent click-after-drag deselection
          justFinishedDrag = true;

          isDragging = false;
          selectedHandle = null;

          // Clear drag start data from selected polyhedra
          selectedPolyhedra.forEach(poly => {
            delete poly.userData.dragStartQuaternion;
            delete poly.userData.dragStartPosition;
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

  // PHASE 6 EXTRACTION: Use renderingAPI.initScene() instead of inline function
  renderingAPI.initScene();

  // PHASE 6 EXTRACTION: NOW get references from API (objects now exist after initScene())
  scene = renderingAPI.getScene();
  camera = renderingAPI.getCamera();
  renderer = renderingAPI.getRenderer();
  controls = renderingAPI.getControls();

  // Get all form groups for selection system
  const formGroups = renderingAPI.getAllFormGroups();
  ({
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
  } = formGroups);

  // NOTE: updateGeometry and updateGeometryStats were assigned earlier (line ~135-136)
  // so that event listeners registered earlier in the code can reference them

  initGumballEventListeners(); // Initialize gumball after scene is ready

  // Initialize color restoration from localStorage (scene is now ready)
  colorTheoryModal.initializeAfterSceneReady();

  // ========================================================================
  // FILE HANDLER INITIALIZATION
  // ========================================================================
  RTFileHandler.init(RTStateManager, scene, camera);
  console.log("✅ RTFileHandler module initialized");

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
  // console.log("✅ RTControls module initialized");

  // Initialize selection click listener with drag detection
  let mouseDownPos = null;
  let mouseMoved = false;

  renderer.domElement.addEventListener("mousedown", e => {
    mouseDownPos = { x: e.clientX, y: e.clientY };
    mouseMoved = false;
  });

  renderer.domElement.addEventListener("mousemove", e => {
    if (mouseDownPos) {
      const dx = e.clientX - mouseDownPos.x;
      const dy = e.clientY - mouseDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If mouse moved more than 5 pixels, consider it a drag/orbit
      if (distance > 5) {
        mouseMoved = true;
      }
    }
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

  // PHASE 6 EXTRACTION: Use renderingAPI.animate() instead of inline function
  renderingAPI.animate();

  // ========================================================================
  // RT-PAPERCUT MODULE INITIALIZATION
  // ========================================================================
  RTPapercut.init(scene, camera, renderer);
  window.RTPapercut = RTPapercut; // Global access for debugging

  // Wire up cutplane axis selector buttons
  const cutplaneAxisButtons = [
    // Cartesian basis
    { id: "cutplaneAxisX", basis: "cartesian", axis: "x" },
    { id: "cutplaneAxisY", basis: "cartesian", axis: "y" },
    { id: "cutplaneAxisZ", basis: "cartesian", axis: "z" },
    // Tetrahedral basis
    { id: "cutplaneAxisW", basis: "tetrahedral", axis: "w" },
    { id: "cutplaneAxisTetraX", basis: "tetrahedral", axis: "x" },
    { id: "cutplaneAxisTetraY", basis: "tetrahedral", axis: "y" },
    { id: "cutplaneAxisTetraZ", basis: "tetrahedral", axis: "z" },
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

  // ========================================================================
  // KEYBOARD SHORTCUTS (ESC, Delete, Undo/Redo)
  // ========================================================================
  document.addEventListener("keydown", event => {
    // ESC key - deselect all
    if (event.key === "Escape") {
      deselectAll();
      console.log("⎋ ESC: Deselected all");
    }

    // Delete key - delete selected Instance
    if (event.key === "Delete" || event.key === "Backspace") {
      if (currentSelection && currentSelection.userData.isInstance) {
        const instanceId = currentSelection.userData.instanceId;

        // Delete via StateManager
        RTStateManager.deleteInstance(instanceId, scene);

        // Clear selection and highlight
        deselectAll();

        // Update counter UI
        document.getElementById("nowCount").textContent =
          RTStateManager.getDepositedCount();

        console.log(`🗑️  Instance deleted: ${instanceId}`);
      } else if (currentSelection && !currentSelection.userData.isInstance) {
        console.warn("⚠️  Cannot delete Forms (templates), only Instances");
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
  });
} // End startARTexplorer function
