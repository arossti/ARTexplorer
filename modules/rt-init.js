// MODULE IMPORTS
// ========================================================================
import { Polyhedra } from "./rt-polyhedra.js";
import { RTPapercut } from "./rt-papercut.js";
import { RTViewManager } from "./rt-viewmanager.js";
import { initQuadranceDemo } from "../demos/rt-quadrance-demo.js";
import { initCrossDemo } from "../demos/rt-cross-demo.js";
import { initWeierstrassDemo } from "../demos/rt-weierstrass-demo.js";
import { openDemoModal } from "../demos/rt-demo-utils.js";
import { colorTheoryModal } from "./color-theory-modal.js";
import { initScene as createRenderingAPI } from "./rt-rendering.js";
import { initInfoModal } from "./rt-info-modal.js";
import * as RTJanus from "./rt-janus.js";

// Make RTPolyhedra available globally for node geometry creation
window.RTPolyhedra = Polyhedra;

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

  // Scene objects - assigned after initScene() is called
  let scene, camera, renderer, controls;
  let pointGroup; // Point primitive (single vertex)
  let lineGroup; // Line primitive (two vertices, one edge)
  let polygonGroup; // Polygon primitive (n vertices, n edges, 1 face)
  let prismGroup; // Prism primitive (3D solid with N-gon caps)
  let coneGroup; // Cone primitive (3D solid with N-gon base and apex)
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
    quadrayCuboctahedronGroup;
  let cartesianGrid, ivmPlanes;

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
  // Point (single vertex - coordinate exploration tool)
  const pointCheckbox = document.getElementById("showPoint");
  if (pointCheckbox) {
    pointCheckbox.addEventListener("change", updateGeometry);
  }

  // Line (1D primitive - two vertices, one edge)
  const lineCheckbox = document.getElementById("showLine");
  const lineControls = document.getElementById("line-controls");
  const lineQuadranceInput = document.getElementById("lineQuadrance");
  const lineLengthInput = document.getElementById("lineLength");
  const lineWeightSlider = document.getElementById("lineWeight");
  const lineWeightValue = document.getElementById("lineWeightValue");

  if (lineCheckbox) {
    lineCheckbox.addEventListener("change", () => {
      // Show/hide line controls when checkbox toggled
      if (lineControls) {
        lineControls.style.display = lineCheckbox.checked ? "block" : "none";
      }
      updateGeometry();
    });
  }

  // Bidirectional Quadrance/Length conversion (Q = L², L = √Q)
  if (lineQuadranceInput && lineLengthInput) {
    lineQuadranceInput.addEventListener("input", () => {
      const Q = parseFloat(lineQuadranceInput.value) || 1;
      lineLengthInput.value = Math.sqrt(Q).toFixed(4);
      updateGeometry();
    });

    lineLengthInput.addEventListener("input", () => {
      const L = parseFloat(lineLengthInput.value) || 1;
      lineQuadranceInput.value = (L * L).toFixed(4);
      updateGeometry();
    });
  }

  // Lineweight slider
  if (lineWeightSlider && lineWeightValue) {
    lineWeightSlider.addEventListener("input", () => {
      lineWeightValue.textContent = lineWeightSlider.value;
      updateGeometry();
    });
  }

  // Polygon (2D primitive - n vertices, n edges, 1 face)
  const polygonCheckbox = document.getElementById("showPolygon");
  const polygonControls = document.getElementById("polygon-controls");
  const polygonSidesInput = document.getElementById("polygonSides");
  const polygonQuadranceInput = document.getElementById("polygonQuadrance");
  const polygonRadiusInput = document.getElementById("polygonRadius");
  const polygonShowFaceCheckbox = document.getElementById("polygonShowFace");
  const polygonEdgeWeightSlider = document.getElementById("polygonEdgeWeight");
  const polygonEdgeWeightValue = document.getElementById(
    "polygonEdgeWeightValue"
  );

  if (polygonCheckbox) {
    polygonCheckbox.addEventListener("change", () => {
      // Show/hide polygon controls when checkbox toggled
      if (polygonControls) {
        polygonControls.style.display = polygonCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  // Polygon sides input
  if (polygonSidesInput) {
    polygonSidesInput.addEventListener("input", updateGeometry);
  }

  // Bidirectional Quadrance/Radius conversion (Q_R = R², R = √Q_R)
  if (polygonQuadranceInput && polygonRadiusInput) {
    polygonQuadranceInput.addEventListener("input", () => {
      const Q = parseFloat(polygonQuadranceInput.value) || 1;
      polygonRadiusInput.value = Math.sqrt(Q).toFixed(4);
      updateGeometry();
    });

    polygonRadiusInput.addEventListener("input", () => {
      const R = parseFloat(polygonRadiusInput.value) || 1;
      polygonQuadranceInput.value = (R * R).toFixed(4);
      updateGeometry();
    });
  }

  // Polygon show face checkbox
  if (polygonShowFaceCheckbox) {
    polygonShowFaceCheckbox.addEventListener("change", updateGeometry);
  }

  // Polygon edge weight slider
  if (polygonEdgeWeightSlider && polygonEdgeWeightValue) {
    polygonEdgeWeightSlider.addEventListener("input", () => {
      polygonEdgeWeightValue.textContent = polygonEdgeWeightSlider.value;
      updateGeometry();
    });
  }

  // Prism (3D primitive - N-gon caps with rectangular sides)
  const prismCheckbox = document.getElementById("showPrism");
  const prismControls = document.getElementById("prism-controls");
  const prismSidesInput = document.getElementById("prismSides");
  const prismBaseQuadranceInput = document.getElementById("prismBaseQuadrance");
  const prismBaseRadiusInput = document.getElementById("prismBaseRadius");
  const prismHeightQuadranceInput = document.getElementById(
    "prismHeightQuadrance"
  );
  const prismHeightInput = document.getElementById("prismHeight");
  const prismShowFacesCheckbox = document.getElementById("prismShowFaces");

  if (prismCheckbox) {
    prismCheckbox.addEventListener("change", () => {
      if (prismControls) {
        prismControls.style.display = prismCheckbox.checked ? "block" : "none";
      }
      updateGeometry();
    });
  }

  if (prismSidesInput) {
    prismSidesInput.addEventListener("input", updateGeometry);
  }

  // Bidirectional Base Quadrance/Radius conversion (Q_R = R², R = √Q_R)
  if (prismBaseQuadranceInput && prismBaseRadiusInput) {
    prismBaseQuadranceInput.addEventListener("input", () => {
      const Q = parseFloat(prismBaseQuadranceInput.value) || 1;
      prismBaseRadiusInput.value = Math.sqrt(Q).toFixed(4);
      updateGeometry();
    });

    prismBaseRadiusInput.addEventListener("input", () => {
      const R = parseFloat(prismBaseRadiusInput.value) || 1;
      prismBaseQuadranceInput.value = (R * R).toFixed(4);
      updateGeometry();
    });
  }

  // Bidirectional Height Quadrance/Height conversion (Q_H = H², H = √Q_H)
  if (prismHeightQuadranceInput && prismHeightInput) {
    prismHeightQuadranceInput.addEventListener("input", () => {
      const Q = parseFloat(prismHeightQuadranceInput.value) || 1;
      prismHeightInput.value = Math.sqrt(Q).toFixed(4);
      updateGeometry();
    });

    prismHeightInput.addEventListener("input", () => {
      const H = parseFloat(prismHeightInput.value) || 1;
      prismHeightQuadranceInput.value = (H * H).toFixed(4);
      updateGeometry();
    });
  }

  if (prismShowFacesCheckbox) {
    prismShowFacesCheckbox.addEventListener("change", updateGeometry);
  }

  // Cone (3D primitive - N-gon base with point apex)
  const coneCheckbox = document.getElementById("showCone");
  const coneControls = document.getElementById("cone-controls");
  const coneSidesInput = document.getElementById("coneSides");
  const coneBaseQuadranceInput = document.getElementById("coneBaseQuadrance");
  const coneBaseRadiusInput = document.getElementById("coneBaseRadius");
  const coneHeightQuadranceInput = document.getElementById(
    "coneHeightQuadrance"
  );
  const coneHeightInput = document.getElementById("coneHeight");
  const coneShowFacesCheckbox = document.getElementById("coneShowFaces");

  if (coneCheckbox) {
    coneCheckbox.addEventListener("change", () => {
      if (coneControls) {
        coneControls.style.display = coneCheckbox.checked ? "block" : "none";
      }
      updateGeometry();
    });
  }

  if (coneSidesInput) {
    coneSidesInput.addEventListener("input", updateGeometry);
  }

  // Bidirectional Base Quadrance/Radius conversion (Q_R = R², R = √Q_R)
  if (coneBaseQuadranceInput && coneBaseRadiusInput) {
    coneBaseQuadranceInput.addEventListener("input", () => {
      const Q = parseFloat(coneBaseQuadranceInput.value) || 1;
      coneBaseRadiusInput.value = Math.sqrt(Q).toFixed(4);
      updateGeometry();
    });

    coneBaseRadiusInput.addEventListener("input", () => {
      const R = parseFloat(coneBaseRadiusInput.value) || 1;
      coneBaseQuadranceInput.value = (R * R).toFixed(4);
      updateGeometry();
    });
  }

  // Bidirectional Height Quadrance/Height conversion (Q_H = H², H = √Q_H)
  if (coneHeightQuadranceInput && coneHeightInput) {
    coneHeightQuadranceInput.addEventListener("input", () => {
      const Q = parseFloat(coneHeightQuadranceInput.value) || 1;
      coneHeightInput.value = Math.sqrt(Q).toFixed(4);
      updateGeometry();
    });

    coneHeightInput.addEventListener("input", () => {
      const H = parseFloat(coneHeightInput.value) || 1;
      coneHeightQuadranceInput.value = (H * H).toFixed(4);
      updateGeometry();
    });
  }

  if (coneShowFacesCheckbox) {
    coneShowFacesCheckbox.addEventListener("change", updateGeometry);
  }

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

  // Quadray Tetrahedron Demonstrators
  const quadrayTetraCheckbox = document.getElementById(
    "showQuadrayTetrahedron"
  );
  if (quadrayTetraCheckbox) {
    quadrayTetraCheckbox.addEventListener("change", () => {
      const controls = document.getElementById("quadray-tetra-controls");
      if (controls) {
        controls.style.display = quadrayTetraCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const quadrayTetraNormalizeCheckbox = document.getElementById(
    "quadrayTetraNormalize"
  );
  if (quadrayTetraNormalizeCheckbox) {
    quadrayTetraNormalizeCheckbox.addEventListener("change", updateGeometry);
  }

  const quadrayTetraDeformedCheckbox = document.getElementById(
    "showQuadrayTetraDeformed"
  );
  if (quadrayTetraDeformedCheckbox) {
    quadrayTetraDeformedCheckbox.addEventListener("change", () => {
      const controls = document.getElementById(
        "quadray-tetra-deformed-controls"
      );
      if (controls) {
        controls.style.display = quadrayTetraDeformedCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const quadrayTetraZStretchSlider = document.getElementById(
    "quadrayTetraZStretch"
  );
  if (quadrayTetraZStretchSlider) {
    quadrayTetraZStretchSlider.addEventListener("input", e => {
      const value = parseFloat(e.target.value);
      e.target.nextElementSibling.textContent = value.toFixed(1);
      updateGeometry();
    });
  }

  // Quadray Cuboctahedron (Vector Equilibrium - 4D Native)
  const quadrayCuboctaCheckbox = document.getElementById(
    "showQuadrayCuboctahedron"
  );
  if (quadrayCuboctaCheckbox) {
    quadrayCuboctaCheckbox.addEventListener("change", () => {
      const controls = document.getElementById(
        "quadray-cuboctahedron-controls"
      );
      if (controls) {
        controls.style.display = quadrayCuboctaCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const quadrayCuboctaNormalizeCheckbox = document.getElementById(
    "quadrayCuboctaNormalize"
  );
  if (quadrayCuboctaNormalizeCheckbox) {
    quadrayCuboctaNormalizeCheckbox.addEventListener("change", updateGeometry);
  }

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
      const sliderVal = parseInt(e.target.value);
      // Hexahedral radial uses odd frequencies only (nuclear cube at origin)
      // Slider 1→F1(1³), 2→F3(3³), 3→F5(5³), 4→F7(7³), 5→F9(9³)
      // Future: even frequencies (F2, F4...) could use vertex-centered patterns
      const actualFreq = 2 * sliderVal - 1;
      document.getElementById("radialCubeFreqDisplay").textContent =
        `F${actualFreq}`;
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
      const sliderVal = parseInt(e.target.value);
      // RD radial uses odd frequencies only (nuclear RD at origin)
      // Slider 1→F1, 2→F3, 3→F5, 4→F7, 5→F9
      // Future: even frequencies could use vertex-centered patterns
      const actualFreq = 2 * sliderVal - 1;
      document.getElementById("radialRhombicDodecFreqDisplay").textContent =
        `F${actualFreq}`;
      updateGeometry();
    });
  }

  // Radial Tetrahedron Matrix (Phase 3)
  const radialTetCheckbox = document.getElementById(
    "showRadialTetrahedronMatrix"
  );
  if (radialTetCheckbox) {
    radialTetCheckbox.addEventListener("change", () => {
      const radialTetControls = document.getElementById(
        "radial-tetrahedron-matrix-controls"
      );
      if (radialTetControls) {
        radialTetControls.style.display = radialTetCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const radialTetFreqSlider = document.getElementById("radialTetFreqSlider");
  if (radialTetFreqSlider) {
    radialTetFreqSlider.addEventListener("input", e => {
      const freq = parseInt(e.target.value);
      document.getElementById("radialTetFreqDisplay").textContent = `F${freq}`;
      updateGeometry();
    });
  }

  // IVM Mode checkbox for tetrahedron (fills voids between IVM octahedra)
  const radialTetIVMMode = document.getElementById("radialTetIVMMode");
  if (radialTetIVMMode) {
    radialTetIVMMode.addEventListener("change", () => {
      updateGeometry();
    });
  }

  // Radial Octahedron Matrix (Phase 3)
  const radialOctCheckbox = document.getElementById(
    "showRadialOctahedronMatrix"
  );
  if (radialOctCheckbox) {
    radialOctCheckbox.addEventListener("change", () => {
      const radialOctControls = document.getElementById(
        "radial-octahedron-matrix-controls"
      );
      if (radialOctControls) {
        radialOctControls.style.display = radialOctCheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const radialOctFreqSlider = document.getElementById("radialOctFreqSlider");
  if (radialOctFreqSlider) {
    radialOctFreqSlider.addEventListener("input", e => {
      const freq = parseInt(e.target.value);
      document.getElementById("radialOctFreqDisplay").textContent = `F${freq}`;
      updateGeometry();
    });
  }

  // IVM Scale checkbox for octahedron (scales to match tetrahedron faces)
  const radialOctIVMScale = document.getElementById("radialOctIVMScale");
  if (radialOctIVMScale) {
    radialOctIVMScale.addEventListener("change", () => {
      updateGeometry();
    });
  }

  // Radial Cuboctahedron (VE) Matrix (Phase 3)
  const radialVECheckbox = document.getElementById(
    "showRadialCuboctahedronMatrix"
  );
  if (radialVECheckbox) {
    radialVECheckbox.addEventListener("change", () => {
      const radialVEControls = document.getElementById(
        "radial-cuboctahedron-matrix-controls"
      );
      if (radialVEControls) {
        radialVEControls.style.display = radialVECheckbox.checked
          ? "block"
          : "none";
      }
      updateGeometry();
    });
  }

  const radialVEFreqSlider = document.getElementById("radialVEFreqSlider");
  if (radialVEFreqSlider) {
    radialVEFreqSlider.addEventListener("input", e => {
      const freq = parseInt(e.target.value);
      document.getElementById("radialVEFreqDisplay").textContent = `F${freq}`;
      updateGeometry();
    });
  }

  // Phase 2.7a, 2.7b, 2.7c: Geodesic controls
  document
    .getElementById("showGeodesicIcosahedron")
    .addEventListener("change", updateGeometry);

  // Geodesic Icosahedron frequency slider
  const geodesicIcosaFrequency = document.getElementById(
    "geodesicIcosaFrequency"
  );
  geodesicIcosaFrequency.addEventListener("input", e => {
    e.target.nextElementSibling.textContent = e.target.value;
    updateGeometry();
  });
  geodesicIcosaFrequency.addEventListener("change", updateGeometry);

  document
    .getElementById("showGeodesicTetrahedron")
    .addEventListener("change", updateGeometry);

  // Geodesic Tetrahedron frequency slider
  const geodesicTetraFrequency = document.getElementById(
    "geodesicTetraFrequency"
  );
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
  const geodesicDualTetraFrequency = document.getElementById(
    "geodesicDualTetraFrequency"
  );
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
  const geodesicOctaFrequency = document.getElementById(
    "geodesicOctaFrequency"
  );
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
  const geodesicDualIcosaFrequency = document.getElementById(
    "geodesicDualIcosaFrequency"
  );
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

  // ========================================================================
  // VIEW CONTROLS - Camera Presets
  // ========================================================================

  // Projection mode buttons (Perspective / Orthographic / Centre)
  const perspectiveBtn = document.getElementById("cameraPerspective");
  const orthographicBtn = document.getElementById("cameraOrthographic");
  const centreBtn = document.getElementById("cameraCentre");

  perspectiveBtn.addEventListener("click", () => {
    renderingAPI.switchCameraType(false); // Switch to perspective
    perspectiveBtn.classList.add("active");
    orthographicBtn.classList.remove("active");
  });

  orthographicBtn.addEventListener("click", () => {
    renderingAPI.switchCameraType(true); // Switch to orthographic
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
    // WXYZ Tetrahedral Basis Views (looking down each quadray axis)
    { id: "viewQuadW", view: "quadw" },
    { id: "viewQuadX", view: "quadx" },
    { id: "viewQuadY", view: "quady" },
    { id: "viewQuadZ", view: "quadz" },
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

      // Check if selected form allows this tool (Point only allows "move")
      if (currentSelection) {
        const allowedTools = currentSelection.userData?.allowedTools;
        if (allowedTools && !allowedTools.includes(tool)) {
          console.log(
            `[Tool] '${tool}' not allowed for ${currentSelection.userData.type}`
          );
          return; // Don't activate disallowed tool
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

        // Create editing basis at selected Forms' center
        const selected = getSelectedPolyhedra();
        if (selected.length > 0) {
          // Use first selected polyhedron's position and pass the object for sizing
          createEditingBasis(selected[0].position.clone(), selected[0]);
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

          // Apply position change
          selected.forEach(poly => {
            poly.position[axis] = value;
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

    coordInputs.forEach(({ id }) => {
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

          // Apply rotation
          selected.forEach(poly => {
            poly.rotateOnWorldAxis(axis, radians);
            console.log(
              `🔄 Rotated spread ${spread.toFixed(2)} (${degrees.toFixed(2)}°) around ${name} axis`
            );
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
    const rotInputs = [
      { id: "rotWSpread", basisIndex: 0, name: "W" },
      { id: "rotXQSpread", basisIndex: 1, name: "X (Quadray)" },
      { id: "rotYQSpread", basisIndex: 2, name: "Y (Quadray)" },
      { id: "rotZQSpread", basisIndex: 3, name: "Z (Quadray)" },
    ];

    rotInputs.forEach(({ id, basisIndex, name }) => {
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

          // Apply rotation
          selected.forEach(poly => {
            poly.rotateOnWorldAxis(axis, radians);
            console.log(
              `🔄 Rotated spread ${spread.toFixed(2)} (${degrees.toFixed(2)}°) around ${name} axis`
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
  setupRotateSpreadInputs();
  setupRotateQuadraySpreadInputs();

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
        selectPolyhedron(parentEntry.parent, event.shiftKey);
      }
    }
    // NOTE: Clicking empty space no longer deselects
    // Deselection now requires: ESC key OR NOW button
    // This allows users to orbit camera between transformations without losing selection
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

  // ========================================================================
  // OBJECT SNAPPING HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get all vertices of a polyhedron in world coordinates
   * @param {THREE.Group} polyGroup - Polyhedron group
   * @returns {Array<THREE.Vector3>} Array of vertex positions in world space
   */
  function getPolyhedronVertices(polyGroup) {
    const vertices = [];
    const seenPositions = new Set(); // Deduplicate vertices

    polyGroup.traverse(obj => {
      // Skip vertex node spheres (decorative geometry, not structural)
      if (obj.userData?.isVertexNode) return;

      if (obj.isMesh && obj.geometry) {
        const posAttr = obj.geometry.getAttribute("position");
        if (posAttr) {
          for (let i = 0; i < posAttr.count; i++) {
            const localVertex = new THREE.Vector3(
              posAttr.getX(i),
              posAttr.getY(i),
              posAttr.getZ(i)
            );
            // Transform to world coordinates
            const worldVertex = localVertex.clone();
            obj.localToWorld(worldVertex);

            // Deduplicate (round to 4 decimal places for comparison)
            const key = `${worldVertex.x.toFixed(4)},${worldVertex.y.toFixed(4)},${worldVertex.z.toFixed(4)}`;
            if (!seenPositions.has(key)) {
              seenPositions.add(key);
              vertices.push(worldVertex);
            }
          }
        }
      }
    });

    return vertices;
  }

  /**
   * Get all edge midpoints of a polyhedron in world coordinates
   * @param {THREE.Group} polyGroup - Polyhedron group
   * @returns {Array<THREE.Vector3>} Array of edge midpoint positions in world space
   */
  function getPolyhedronEdgeMidpoints(polyGroup) {
    const midpoints = [];
    const seenEdges = new Set(); // Deduplicate edges

    polyGroup.traverse(obj => {
      // Skip vertex node spheres (decorative geometry, not structural)
      if (obj.userData?.isVertexNode) return;

      if (obj.isMesh && obj.geometry) {
        const posAttr = obj.geometry.getAttribute("position");
        const index = obj.geometry.index;

        if (posAttr && index) {
          // Indexed geometry - extract edges from triangles
          for (let i = 0; i < index.count; i += 3) {
            const indices = [
              index.getX(i),
              index.getX(i + 1),
              index.getX(i + 2),
            ];

            // Three edges per triangle
            const edges = [
              [indices[0], indices[1]],
              [indices[1], indices[2]],
              [indices[2], indices[0]],
            ];

            edges.forEach(([a, b]) => {
              // Normalize edge key (smaller index first)
              const edgeKey = a < b ? `${a}-${b}` : `${b}-${a}`;
              if (!seenEdges.has(edgeKey)) {
                seenEdges.add(edgeKey);

                const v1 = new THREE.Vector3(
                  posAttr.getX(a),
                  posAttr.getY(a),
                  posAttr.getZ(a)
                );
                const v2 = new THREE.Vector3(
                  posAttr.getX(b),
                  posAttr.getY(b),
                  posAttr.getZ(b)
                );

                // Calculate midpoint in local space
                const midpoint = v1.clone().add(v2).multiplyScalar(0.5);

                // Transform to world coordinates
                obj.localToWorld(midpoint);
                midpoints.push(midpoint);
              }
            });
          }
        }
      }
    });

    return midpoints;
  }

  /**
   * Get all face centroids of a polyhedron in world coordinates
   * @param {THREE.Group} polyGroup - Polyhedron group
   * @returns {Array<THREE.Vector3>} Array of face centroid positions in world space
   */
  function getPolyhedronFaceCentroids(polyGroup) {
    const centroids = [];

    polyGroup.traverse(obj => {
      // Skip vertex node spheres (decorative geometry, not structural)
      if (obj.userData?.isVertexNode) return;

      if (obj.isMesh && obj.geometry) {
        const posAttr = obj.geometry.getAttribute("position");
        const index = obj.geometry.index;

        if (posAttr && index) {
          // Process each triangle face
          for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i);
            const b = index.getX(i + 1);
            const c = index.getX(i + 2);

            const v1 = new THREE.Vector3(
              posAttr.getX(a),
              posAttr.getY(a),
              posAttr.getZ(a)
            );
            const v2 = new THREE.Vector3(
              posAttr.getX(b),
              posAttr.getY(b),
              posAttr.getZ(b)
            );
            const v3 = new THREE.Vector3(
              posAttr.getX(c),
              posAttr.getY(c),
              posAttr.getZ(c)
            );

            // Calculate centroid in local space
            const centroid = v1
              .clone()
              .add(v2)
              .add(v3)
              .multiplyScalar(1 / 3);

            // Transform to world coordinates
            obj.localToWorld(centroid);
            centroids.push(centroid);
          }
        }
      }
    });

    return centroids;
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
    // DEBUG: Uncomment for snap debugging
    // console.log(`🔍 SNAP DEBUG: ${allInstances.length} instances in RTStateManager`);

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
      // console.log(`  Instance: ${instance.id}, visible: ${instance.threeObject?.visible}, excluded: ${instance.threeObject === excludeGroup}`);
      if (
        instance.threeObject &&
        instance.threeObject.visible &&
        instance.threeObject !== excludeGroup &&
        !excludeConnectedIds.has(instance.id) // Exclude connected Points
      ) {
        targetGroups.push(instance.threeObject);
      }
    });

    // console.log(`🔍 SNAP DEBUG: ${targetGroups.length} target groups found (excluding dragged object)`);

    // Get source object's snap points (we need to compare geometry-to-geometry)
    const sourceVertices = objectSnapVertex
      ? getPolyhedronVertices(excludeGroup)
      : [];
    const sourceEdges = objectSnapEdge
      ? getPolyhedronEdgeMidpoints(excludeGroup)
      : [];
    const sourceFaces = objectSnapFace
      ? getPolyhedronFaceCentroids(excludeGroup)
      : [];

    // console.log(`🔍 SNAP DEBUG: Source has ${sourceVertices.length} vertices, ${sourceEdges.length} edges, ${sourceFaces.length} faces`);

    // Check each target group for snap points
    targetGroups.forEach(targetGroup => {
      // Vertex-to-vertex snapping
      if (objectSnapVertex && sourceVertices.length > 0) {
        const targetVertices = getPolyhedronVertices(targetGroup);
        // console.log(`🔍 SNAP DEBUG: Target ${targetGroup.userData?.type || 'unknown'} has ${targetVertices.length} vertices`);
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
        // console.log(`🔍 SNAP DEBUG: Target ${targetGroup.userData?.type || 'unknown'} has ${targetEdges.length} edge midpoints`);
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

    // Debug: Log result (uncomment for debugging)
    // if (nearest) {
    //   console.log(`🎯 SNAP FOUND: ${nearest.type} at distance ${nearest.distance.toFixed(3)}`);
    // } else {
    //   console.log(`🔍 SNAP DEBUG: Closest was beyond threshold ${threshold}`);
    // }

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

            // Update editing basis position if it exists (use primary selection's new position)
            if (editingBasis && selectedPolyhedra.length > 0) {
              editingBasis.position.copy(selectedPolyhedra[0].position);
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

            document.getElementById("coordW").value = wxyz[0].toFixed(4);
            document.getElementById("coordX2").value = wxyz[1].toFixed(4);
            document.getElementById("coordY2").value = wxyz[2].toFixed(4);
            document.getElementById("coordZ2").value = wxyz[3].toFixed(4);
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
              editingBasis.position.copy(currentSnapTarget.position);
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

            document.getElementById("coordW").value = wxyz[0].toFixed(4);
            document.getElementById("coordX2").value = wxyz[1].toFixed(4);
            document.getElementById("coordY2").value = wxyz[2].toFixed(4);
            document.getElementById("coordZ2").value = wxyz[3].toFixed(4);

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

              document.getElementById("coordW").value = wxyz[0].toFixed(4);
              document.getElementById("coordX2").value = wxyz[1].toFixed(4);
              document.getElementById("coordY2").value = wxyz[2].toFixed(4);
              document.getElementById("coordZ2").value = wxyz[3].toFixed(4);

              // Update editing basis position after snapping
              if (editingBasis) {
                editingBasis.position.copy(pos);
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
  } = formGroups);

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

      if (currentGumballTool) {
        exitToolMode();
      }
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
   * Handle Connect action - connect two selected Points with a Line
   */
  function handleConnectAction() {
    const selected = RTStateManager.getSelectedObjects();

    if (selected.length !== 2) {
      console.warn("⚠️ Connect requires exactly 2 selected Points");
      return;
    }

    // Get instance IDs
    const idA = selected[0].userData.instanceId;
    const idB = selected[1].userData.instanceId;

    if (!idA || !idB) {
      console.warn("⚠️ Connect requires 2 deposited Point instances");
      return;
    }

    // Verify both are Points
    const instA = RTStateManager.getInstance(idA);
    const instB = RTStateManager.getInstance(idB);

    if (!instA || instA.type !== "point" || !instB || instB.type !== "point") {
      console.warn("⚠️ Connect requires 2 Point instances (not other types)");
      return;
    }

    // Create connected line
    const connectedLine = RTStateManager.connectPoints(idA, idB, scene);

    if (connectedLine) {
      // Update counter UI
      document.getElementById("nowCount").textContent =
        RTStateManager.getDepositedCount();

      // Clear selection and select the new line
      deselectAll();
      selectPolyhedron(connectedLine.threeObject);
    }
  }

  /**
   * Handle Disconnect action - disconnect a connected Line back to Points
   */
  function handleDisconnectAction() {
    const selected = RTStateManager.getSelectedObjects();

    if (selected.length !== 1) {
      console.warn("⚠️ Disconnect requires exactly 1 selected connectedLine");
      return;
    }

    const lineObj = selected[0];
    const lineId = lineObj.userData.instanceId;

    if (!lineId) {
      console.warn("⚠️ Disconnect requires a deposited connectedLine instance");
      return;
    }

    const inst = RTStateManager.getInstance(lineId);
    if (!inst || inst.type !== "connectedLine") {
      console.warn("⚠️ Disconnect only works on connectedLine instances");
      return;
    }

    // Disconnect (deletes the line, Points remain)
    RTStateManager.disconnectLine(lineId, scene);

    // Update counter UI
    document.getElementById("nowCount").textContent =
      RTStateManager.getDepositedCount();

    // Clear selection
    deselectAll();
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
  console.log("✅ ARTexplorer initialization complete");
} // End startARTexplorer function
