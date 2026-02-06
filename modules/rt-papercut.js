/**
 * RT-Papercut Module
 * Print-optimized rendering with cutplane and depth-based line weights
 *
 * Initial MVP: "One-shot" print export tool
 * - Dynamic cutplane with slider control
 * - Depth-based line weights (LOD)
 * - White background for print
 * - SVG export via browser print
 */

import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { RT, Quadray } from "./rt-math.js";

export const RTPapercut = {
  // Module state (local, not persisted)
  state: {
    printModeEnabled: false,
    cutplaneEnabled: false,
    cutplaneValue: 0, // Current slider position
    cutplaneBasis: "cartesian", // 'cartesian' or 'tetrahedral'
    cutplaneAxis: "z", // 'x', 'y', 'z' (Cartesian) or 'qw', 'qx', 'qy', 'qz' (Tetrahedral/Quadray)
    cutplaneNormal: null, // THREE.Vector3
    invertCutPlane: false, // Invert normal (for ground plane mode)
    intervalSnapXYZEnabled: true, // XYZ: Snap to Cartesian grid intervals (step=1.0) vs fine control (step=0.1)
    intervalSnapWXYZEnabled: false, // WXYZ: Snap to Quadray grid intervals (step=√6/4≈0.612) vs fine control (step=0.1)
    lineWeightEnabled: true,
    lineWeightMin: 1.0,
    lineWeightMax: 3.0, // Default matches slider value of 3
    currentView: "top",
    sectionNodesEnabled: false, // Section Nodes checkbox state
    adaptiveNodeResolution: false, // High resolution mode: 64 segments (unchecked: 32)
    backfaceCullingEnabled: true, // Backface culling enabled by default - all geometry corrected (2026-01-11)
  },

  // Store references to THREE.js objects
  _scene: null,
  _camera: null,
  _renderer: null,
  _intersectionLines: null, // Group to hold cutplane intersection edge lines
  _originalBackgroundColor: null, // Store original background color
  _originalMaterialColors: new Map(), // Store original material colors

  /**
   * Initialize Papercut module and wire up UI controls
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {THREE.WebGLRenderer} renderer
   */
  init: function (scene, camera, renderer) {
    // Store references
    RTPapercut._scene = scene;
    RTPapercut._camera = camera;
    RTPapercut._renderer = renderer;

    // Store original background color
    RTPapercut._originalBackgroundColor = scene.background
      ? scene.background.clone()
      : new THREE.Color(0x000000);

    // 1. Print Mode checkbox
    const printModeCheckbox = document.getElementById("enablePrintMode");
    if (printModeCheckbox) {
      printModeCheckbox.addEventListener("change", e => {
        RTPapercut.state.printModeEnabled = e.target.checked;
        RTPapercut.togglePrintMode(scene);
      });
    }

    // 2. Cutplane Line Weight slider
    const cutplaneLineWeightSlider =
      document.getElementById("cutplaneLineWeight");
    const cutplaneLineWeightValue = document.getElementById(
      "cutplaneLineWeightValue"
    );
    if (cutplaneLineWeightSlider) {
      cutplaneLineWeightSlider.addEventListener("input", e => {
        const value = parseFloat(e.target.value);
        RTPapercut.state.lineWeightMax = value;
        if (cutplaneLineWeightValue) {
          cutplaneLineWeightValue.textContent = value;
        }
        // Update intersection line material if it exists
        if (RTPapercut._intersectionLines) {
          RTPapercut._intersectionLines.traverse(child => {
            if (child.material && child.material.isLineMaterial) {
              // LineMaterial uses linewidth property (scaled to world units)
              // Scale factor 0.002 gives visible range from 0.002 (thin) to 0.02 (thick)
              child.material.linewidth = value * 0.002;
              child.material.needsUpdate = true;
            }
          });
        }
      });
    }

    // 3. Enable Cutplane checkbox
    const cutplaneCheckbox = document.getElementById("enableCutPlane");
    if (cutplaneCheckbox) {
      cutplaneCheckbox.disabled = false;
      cutplaneCheckbox.addEventListener("change", e => {
        RTPapercut.state.cutplaneEnabled = e.target.checked;
        RTPapercut.updateCutplane(RTPapercut.state.cutplaneValue, scene);
      });
    }

    // 3b. Invert Cutplane checkbox
    const invertCutPlaneCheckbox = document.getElementById("invertCutPlane");
    if (invertCutPlaneCheckbox) {
      invertCutPlaneCheckbox.addEventListener("change", e => {
        RTPapercut.state.invertCutPlane = e.target.checked;
        RTPapercut.updateCutplane(RTPapercut.state.cutplaneValue, scene);
      });
    }

    // 3c. Section Nodes checkbox
    const sectionNodesCheckbox = document.getElementById("sectionNodes");
    if (sectionNodesCheckbox) {
      sectionNodesCheckbox.addEventListener("change", e => {
        RTPapercut.state.sectionNodesEnabled = e.target.checked;
        // Regenerate intersection edges to include/exclude node circles
        if (
          RTPapercut.state.cutplaneEnabled &&
          RTPapercut.state.cutplaneNormal
        ) {
          RTPapercut.updateCutplane(RTPapercut.state.cutplaneValue, scene);
        }
      });
    }

    // 3d. Adaptive Node Resolution checkbox
    const adaptiveResolutionCheckbox = document.getElementById(
      "adaptiveNodeResolution"
    );
    if (adaptiveResolutionCheckbox) {
      adaptiveResolutionCheckbox.addEventListener("change", e => {
        RTPapercut.state.adaptiveNodeResolution = e.target.checked;
        // Regenerate circles with new resolution
        if (
          RTPapercut.state.cutplaneEnabled &&
          RTPapercut.state.cutplaneNormal &&
          RTPapercut.state.sectionNodesEnabled
        ) {
          RTPapercut.updateCutplane(RTPapercut.state.cutplaneValue, scene);
        }
      });
    }

    // 3e. Backface Culling checkbox
    const backfaceCullingCheckbox = document.getElementById("backfaceCulling");
    if (backfaceCullingCheckbox) {
      backfaceCullingCheckbox.disabled = false; // Enable the checkbox
      backfaceCullingCheckbox.addEventListener("change", e => {
        RTPapercut.state.backfaceCullingEnabled = e.target.checked;
        RTPapercut.toggleBackfaceCulling(scene);
      });
    }

    // 3f. XYZ Interval Snap checkbox
    const intervalSnapXYZCheckbox = document.getElementById("intervalSnapXYZ");
    if (intervalSnapXYZCheckbox) {
      intervalSnapXYZCheckbox.addEventListener("change", e => {
        RTPapercut.state.intervalSnapXYZEnabled = e.target.checked;
        // Update slider step size immediately
        RTPapercut._updateSliderRange();
      });
    }

    // 3g. WXYZ Interval Snap checkbox
    const intervalSnapWXYZCheckbox =
      document.getElementById("intervalSnapWXYZ");
    if (intervalSnapWXYZCheckbox) {
      intervalSnapWXYZCheckbox.addEventListener("change", e => {
        RTPapercut.state.intervalSnapWXYZEnabled = e.target.checked;
        // Update slider step size immediately
        RTPapercut._updateSliderRange();
      });
    }

    // 4. Create Cutplane slider UI dynamically
    RTPapercut._createCutplaneSlider();

    // 5. Wire up slider to cutplane updates
    const cutplaneSlider = document.getElementById("cutplaneSlider");
    const cutplaneValue = document.getElementById("cutplaneValue");

    if (cutplaneSlider) {
      cutplaneSlider.addEventListener("input", e => {
        RTPapercut.state.cutplaneValue = parseFloat(e.target.value);
        if (cutplaneValue) {
          cutplaneValue.textContent = e.target.value;
        }
        RTPapercut.updateCutplane(RTPapercut.state.cutplaneValue, scene);
      });
    }

    // 6. Listen to camera view changes to update cutplane axis
    const viewButtons = [
      { id: "viewTop", view: "top" },
      { id: "viewBottom", view: "bottom" },
      { id: "viewLeft", view: "left" },
      { id: "viewRight", view: "right" },
      { id: "viewFront", view: "front" },
      { id: "viewBack", view: "back" },
      { id: "viewAxo", view: "axo" },
      { id: "viewPerspective", view: "perspective" },
    ];

    viewButtons.forEach(({ id, view }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener("click", () => {
          RTPapercut._updateCutplaneAxisForView(view, scene);
        });
      }
    });

    // 7. Update slider range based on current grid extent
    RTPapercut._updateSliderRange();

    // 8. Listen to grid extent changes
    const cartesianSlider = document.getElementById("cartesianTessSlider");
    if (cartesianSlider) {
      cartesianSlider.addEventListener("change", () => {
        RTPapercut._updateSliderRange();
      });
    }

    const quadraySlider = document.getElementById("quadrayTessSlider");
    if (quadraySlider) {
      quadraySlider.addEventListener("change", () => {
        RTPapercut._updateSliderRange();
      });
    }
  },

  /**
   * Create cutplane slider UI and inject into Papercut section
   * @private
   */
  _createCutplaneSlider: function () {
    const papercutSection = document.getElementById("papercut-section");
    if (!papercutSection) {
      console.warn("⚠️ Papercut section not found in HTML");
      return;
    }

    // Check if slider already exists
    if (document.getElementById("cutplaneSlider")) {
      return; // Already created
    }

    // Create slider container
    const sliderContainer = document.createElement("div");
    sliderContainer.className = "control-item";
    sliderContainer.innerHTML = `
      <label class="label-subsection">Cut Plane Position</label>
      <div class="slider-container">
        <input
          type="range"
          id="cutplaneSlider"
          min="-10"
          max="10"
          step="1.0"
          value="0"
        />
        <span class="slider-value" id="cutplaneValue">0</span>
      </div>
      <p class="info-text" id="cutplaneAxisInfo">Axis: Z (Top/Bottom view)</p>
    `;

    // Find the "Enable Cut Plane" checkbox and insert slider after it
    const cutplaneCheckbox = document.getElementById("enableCutPlane");
    if (cutplaneCheckbox && cutplaneCheckbox.parentElement) {
      const checkboxContainer = cutplaneCheckbox.parentElement.parentElement;
      checkboxContainer.parentNode.insertBefore(
        sliderContainer,
        checkboxContainer.nextSibling
      );
    } else {
      // Fallback: append to papercut section
      papercutSection.appendChild(sliderContainer);
    }

    // Cutplane slider UI created
  },

  /**
   * Update slider range and step size based on current grid extent and basis
   * @private
   */
  _updateSliderRange: function () {
    const slider = document.getElementById("cutplaneSlider");
    if (!slider) return;

    const range = RTPapercut._getCutplaneRange();
    slider.min = range.min;
    slider.max = range.max;
    slider.step = range.step;

    // Reset to center if current value is out of bounds
    const currentValue = parseFloat(slider.value);
    if (currentValue < range.min || currentValue > range.max) {
      slider.value = 0;
      RTPapercut.state.cutplaneValue = 0;
      const valueDisplay = document.getElementById("cutplaneValue");
      if (valueDisplay) {
        valueDisplay.textContent = "0";
      }
    }

    // Determine which snap mode is active
    const basis = RTPapercut.state.cutplaneBasis;
    const xyzSnap = RTPapercut.state.intervalSnapXYZEnabled;
    const wxyzSnap = RTPapercut.state.intervalSnapWXYZEnabled;
    let snapMode = "fine";
    if (basis === "cartesian" && xyzSnap) {
      snapMode = "XYZ";
    } else if (basis === "tetrahedral" && wxyzSnap) {
      snapMode = "WXYZ";
    }

    console.log(
      `✂️ Cutplane range: [${range.min}, ${range.max}] step=${range.step.toFixed(6)} (basis: ${basis}, snap: ${snapMode})`
    );
  },

  /**
   * Get cutplane range and step size based on current basis
   * Returns extent and step that match the grid interval system
   *
   * RT-PURE METHODOLOGY:
   * This implementation demonstrates Rational Trigonometry principles by using
   * algebraically exact constants (RT.PureRadicals.QUADRAY_GRID_INTERVAL) and
   * deferring √ expansion until the GPU boundary. The slider counts INTEGER
   * multiples of the grid interval (pure arithmetic), maintaining algebraic
   * exactness throughout intermediate calculations.
   *
   * XYZ Cartesian snap: step = 1.0 (aligns with Cartesian grid intervals)
   * WXYZ Quadray snap: step = √6/4 ≈ 0.612372 (aligns with tetrahedral grid intervals)
   * Fine control (no snap): step = 0.1
   *
   * SLIDER SEMANTICS:
   * - Slider value represents signed DISTANCE from origin along basis vector
   * - Not quadrance! (Distance is appropriate for THREE.Plane constant parameter)
   * - However, step intervals ARE calculated from RT-pure algebraic constants
   * - Console logs show both distance and quadrance for RT pedagogy
   *
   * GRID ALIGNMENT VERIFICATION:
   * Grid intersections (from createIVMGrid in rt-rendering.js):
   *   Position = i × gridInterval × basis1 + j × gridInterval × basis2
   * Cutplane positions when snapped:
   *   Position = n × gridInterval along selected basis vector (n ∈ ℤ)
   * Result: Perfect alignment - cutplane intersects grid at exact lattice points
   *
   * @returns {{min: number, max: number, step: number}}
   * @private
   */
  _getCutplaneRange: function () {
    const basis = RTPapercut.state.cutplaneBasis;
    const xyzSnapEnabled = RTPapercut.state.intervalSnapXYZEnabled;
    const wxySnapEnabled = RTPapercut.state.intervalSnapWXYZEnabled;

    let step;

    if (basis === "tetrahedral") {
      // WXYZ Tetrahedral basis
      if (wxySnapEnabled) {
        // RT-PURE: Use algebraically exact constant (√6/4)
        // This is the OutSphere radius of a unit tetrahedron (halfSize=1)
        // Slider steps through INTEGER multiples: n × √6/4 where n ∈ ℤ
        // No transcendental operations until final √ expansion in constant
        step = RT.PureRadicals.QUADRAY_GRID_INTERVAL;
      } else {
        // Fine control (arbitrary decimal step)
        step = 0.1;
      }

      // WXYZ Tetrahedral: Calculate extent from grid tessellations
      // Grid extends to: tessellations × gridInterval
      // Example: tessellations=12 → extent = 12 × 0.612372 ≈ 7.348469
      // This matches the actual 3D extent of createIVMGrid() geometry
      const tessellations = parseInt(
        document.getElementById("quadrayTessSlider")?.value || "12"
      );
      const extent = tessellations * RT.PureRadicals.QUADRAY_GRID_INTERVAL;

      return {
        min: -extent,
        max: extent,
        step: step,
      };
    } else {
      // XYZ Cartesian basis
      if (xyzSnapEnabled) {
        // XYZ snap: step = 1.0 (Cartesian grid intervals)
        step = 1.0;
      } else {
        // Fine control
        step = 0.1;
      }

      // XYZ Cartesian: Natural extent is 10 units
      return {
        min: -10,
        max: 10,
        step: step,
      };
    }
  },

  /**
   * Update cutplane position and clip geometry
   * @param {number} value - Cutplane position along current axis
   * @param {THREE.Scene} scene
   */
  updateCutplane: function (value, scene) {
    if (!RTPapercut.state.cutplaneEnabled) {
      // Remove clipping planes from all materials
      scene.traverse(object => {
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => {
              mat.clippingPlanes = [];
              mat.needsUpdate = true;
            });
          } else {
            object.material.clippingPlanes = [];
            object.material.needsUpdate = true;
          }
        }
      });

      // Disable renderer clipping
      if (RTPapercut._renderer) {
        RTPapercut._renderer.localClippingEnabled = false;
      }

      // Remove intersection lines
      if (RTPapercut._intersectionLines) {
        scene.remove(RTPapercut._intersectionLines);
        RTPapercut._intersectionLines.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        RTPapercut._intersectionLines = null;
      }

      // Cutplane disabled
      return;
    }

    // 1. Create clipping plane based on current axis and basis
    // Default: Inverted normal for top-down (architectural) clipping
    // With invertCutPlane: Double invert = normal clipping (bottom-up, ground plane mode)
    const normal = new THREE.Vector3();
    const invert = RTPapercut.state.invertCutPlane ? 1 : -1; // Flip sign when inverted

    if (RTPapercut.state.cutplaneBasis === "tetrahedral") {
      // Initialize Quadray basis vectors if not already done
      if (!Quadray.basisVectors) {
        Quadray.init(THREE);
      }

      // Use centralized axis mapping from Quadray module
      const axisIndex = Quadray.AXIS_INDEX[RTPapercut.state.cutplaneAxis];
      const basisVector = Quadray.basisVectors[axisIndex];

      // Use the Quadray basis vector as the normal (with inversion)
      normal.copy(basisVector).multiplyScalar(invert);
    } else {
      // Cartesian basis
      if (RTPapercut.state.cutplaneAxis === "x") {
        normal.set(invert * 1, 0, 0);
      } else if (RTPapercut.state.cutplaneAxis === "y") {
        normal.set(0, invert * 1, 0);
      } else {
        // 'z'
        normal.set(0, 0, invert * 1);
      }
    }

    // Add small epsilon when inverted and at origin to catch geometry sitting exactly on ground
    // This avoids floating-point precision issues at exactly 0.0
    const epsilon =
      RTPapercut.state.invertCutPlane && Math.abs(value) < 0.01 ? -0.001 : 0;
    const adjustedValue = value + epsilon;

    // THREE.Plane(normal, constant)
    // constant = -d where d is distance from origin along normal
    const plane = new THREE.Plane(normal, adjustedValue);
    RTPapercut.state.cutplaneNormal = plane;

    // 2. Apply clipping plane to all renderable objects
    scene.traverse(object => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => {
            mat.clippingPlanes = [plane];
            mat.clipShadows = true;
            mat.needsUpdate = true;
          });
        } else {
          object.material.clippingPlanes = [plane];
          object.material.clipShadows = true;
          object.material.needsUpdate = true;
        }
      }
    });

    // 3. Enable renderer local clipping
    if (RTPapercut._renderer) {
      RTPapercut._renderer.localClippingEnabled = true;
    } else {
      console.error("❌ Renderer reference not found!");
    }

    // 4. Update slider value display and log RT values
    const valueDisplay = document.getElementById("cutplaneValue");
    if (valueDisplay) {
      valueDisplay.textContent = value.toFixed(1);
    }

    // RT-PURE DIAGNOSTIC: Log both distance and quadrance for pedagogy
    // This demonstrates that while we use distance for the plane equation
    // (appropriate for THREE.Plane API), the underlying grid intervals are
    // calculated from RT-pure algebraic constants (√6/4 for WXYZ)
    const quadrance = value * value; // Q = d² (deferred √ principle)
    const basis = RTPapercut.state.cutplaneBasis;
    const axis = RTPapercut.state.cutplaneAxis.toUpperCase();

    // Calculate interval number (how many grid spacings from origin)
    let intervalNum = 0;
    if (basis === "tetrahedral" && RTPapercut.state.intervalSnapWXYZEnabled) {
      intervalNum = Math.round(value / RT.PureRadicals.QUADRAY_GRID_INTERVAL);
    } else if (
      basis === "cartesian" &&
      RTPapercut.state.intervalSnapXYZEnabled
    ) {
      intervalNum = Math.round(value / 1.0);
    }

    console.log(
      `✂️ Cutplane: ${basis === "tetrahedral" ? "WXYZ" : "XYZ"}-${axis} | ` +
        `Distance d = ${value.toFixed(6)}, Quadrance Q = ${quadrance.toFixed(6)} | ` +
        `Interval: ${intervalNum} × gridStep`
    );

    // 5. Generate intersection edges where cutplane slices through geometry
    RTPapercut._generateIntersectionEdges(scene, plane);
  },

  /**
   * Toggle print mode (B&W rendering)
   * @param {THREE.Scene} scene
   */
  togglePrintMode: function (scene) {
    if (RTPapercut.state.printModeEnabled) {
      // ENABLE PRINT MODE: White background, black/dark materials

      // 1. Change background to white
      scene.background = new THREE.Color(0xffffff);

      // 2. Store original colors and convert materials to black/dark gray
      scene.traverse(object => {
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach(mat => {
            // Skip if already stored
            if (!RTPapercut._originalMaterialColors.has(mat.uuid)) {
              // Store original color
              if (mat.color) {
                RTPapercut._originalMaterialColors.set(
                  mat.uuid,
                  mat.color.clone()
                );
              }
            }

            // Set to black or dark gray for print
            if (mat.color) {
              // LineBasicMaterial and similar
              if (mat.type.includes("Line")) {
                mat.color.setHex(0x000000); // Black lines
              } else {
                mat.color.setHex(0x303030); // Dark gray for mesh materials
              }
              mat.needsUpdate = true;
            }
          });
        }
      });

      // 3. Update intersection line color to black
      if (RTPapercut._intersectionLines) {
        RTPapercut._intersectionLines.traverse(child => {
          if (child.material) {
            child.material.color.setHex(0x000000);
            child.material.needsUpdate = true;
          }
        });
      }
    } else {
      // DISABLE PRINT MODE: Restore original colors

      // 1. Restore background color
      scene.background = RTPapercut._originalBackgroundColor.clone();

      // 2. Restore original material colors
      scene.traverse(object => {
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach(mat => {
            const originalColor = RTPapercut._originalMaterialColors.get(
              mat.uuid
            );
            if (originalColor && mat.color) {
              mat.color.copy(originalColor);
              mat.needsUpdate = true;
            }
          });
        }
      });

      // 3. Restore intersection line color to red
      if (RTPapercut._intersectionLines) {
        RTPapercut._intersectionLines.traverse(child => {
          if (child.material) {
            child.material.color.setHex(0xff0000);
            child.material.needsUpdate = true;
          }
        });
      }
    }
  },

  /**
   * Toggle backface culling for print optimization
   * @param {THREE.Scene} scene
   */
  toggleBackfaceCulling: function (scene) {
    scene.traverse(object => {
      if (object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach(mat => {
          // Only apply to mesh materials, not line materials
          if (mat.type && !mat.type.includes("Line")) {
            if (RTPapercut.state.backfaceCullingEnabled) {
              // Enable backface culling (show only front faces) - now default with corrected winding (2026-01-11)
              mat.side = THREE.FrontSide;
            } else {
              // Disable backface culling (show both sides - user override)
              mat.side = THREE.DoubleSide;
            }
            mat.needsUpdate = true;
          }
        });
      }
    });
  },

  /**
   * Generate visible edge lines where cutplane intersects geometry
   * @param {THREE.Scene} scene
   * @param {THREE.Plane} plane - The cutplane
   * @private
   */
  _generateIntersectionEdges: function (scene, plane) {
    // Remove previous intersection lines
    if (RTPapercut._intersectionLines) {
      scene.remove(RTPapercut._intersectionLines);
      RTPapercut._intersectionLines.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      RTPapercut._intersectionLines = null;
    }

    // Create new group for intersection lines
    const intersectionGroup = new THREE.Group();
    intersectionGroup.name = "CutplaneIntersectionEdges";

    // Material for intersection edges (thicker, color depends on print mode)
    // LineMaterial supports actual line thickness (unlike LineBasicMaterial)
    const lineColor = RTPapercut.state.printModeEnabled ? 0x000000 : 0xff0000;
    const intersectionMaterial = new LineMaterial({
      color: lineColor, // Black in print mode, red otherwise
      linewidth: RTPapercut.state.lineWeightMax * 0.002, // Convert to world units (0.002-0.02 range)
      worldUnits: true, // Use world units for consistent thickness
      opacity: 1.0,
      transparent: false,
    });

    // Set resolution for proper line rendering
    if (RTPapercut._renderer) {
      const size = new THREE.Vector2();
      RTPapercut._renderer.getSize(size);
      intersectionMaterial.resolution.set(size.x, size.y);
    }

    // Process MESH objects (not line objects) to get face intersections
    scene.traverse(object => {
      // Skip non-mesh objects
      if (object.type !== "Mesh" || !object.geometry) return;

      // Skip invisible/hidden meshes - traverse FULL ancestor chain
      // This is necessary because matrix polyhedra can be nested 4+ levels deep:
      // scene → matrixGroup (visible=false) → RTMatrix group → polyhedron group → Mesh
      if (!object.visible) return;
      let ancestor = object.parent;
      while (ancestor) {
        if (!ancestor.visible) return;
        ancestor = ancestor.parent;
      }

      // Skip grid-related meshes
      if (
        object.parent &&
        object.parent.name &&
        (object.parent.name.includes("Grid") ||
          object.parent.name.includes("grid"))
      ) {
        return;
      }

      // Skip helper objects, lights, cameras, basis vectors, arrows
      // Skip objects that are part of control systems (gumball, handles, etc.)
      const skipNames = [
        "Helper",
        "Handle",
        "Gumball",
        "Basis",
        "Arrow",
        "Cone",
        "basis",
      ];
      if (object.name && skipNames.some(name => object.name.includes(name))) {
        return;
      }

      // Also check parent and grandparent names for basis/coordinate system objects
      if (
        object.parent &&
        object.parent.name &&
        (object.parent.name.includes("Basis") ||
          object.parent.name.includes("basis") ||
          object.parent.name.includes("Cartesian") ||
          object.parent.name.includes("Quadray"))
      ) {
        return;
      }

      // Check grandparent for basis/coordinate system objects (nested structure)
      if (
        object.parent &&
        object.parent.parent &&
        object.parent.parent.name &&
        (object.parent.parent.name.includes("Basis") ||
          object.parent.parent.name.includes("basis") ||
          object.parent.parent.name.includes("Cartesian") ||
          object.parent.parent.name.includes("Quadray"))
      ) {
        return;
      }

      // Skip if parent is a polyhedron group that's been hidden
      if (
        object.parent &&
        object.parent.name &&
        object.parent.name.includes("Group") &&
        !object.parent.visible
      ) {
        return;
      }

      // NODE DETECTION: Check if this is a vertex node (for Section Nodes feature)
      if (object.userData.isVertexNode) {
        // Only process nodes if Section Nodes checkbox is enabled
        if (!RTPapercut.state.sectionNodesEnabled) {
          return; // Skip node processing if feature disabled
        }

        // CURRENT: Sphere nodes (analytical circle)
        if (object.userData.nodeType === "sphere") {
          const sphereCenter = object.getWorldPosition(new THREE.Vector3());
          const sphereRadius = object.userData.nodeRadius;

          // NOTE: Circle resolution (36/72) is intentionally higher than sphere node
          // geometry (16x16 segments). Section circles are 2D curves optimized for
          // print output, while 3D spheres balance performance with visual quality.
          // Future: Match resolution when polyhedra-as-nodes feature is implemented.
          const circle = RTPapercut._spherePlaneIntersection(
            sphereCenter,
            sphereRadius,
            plane,
            36 // segments (default, or 72 if High Resolution enabled)
          );

          if (circle) {
            // Add circle as continuous line loop to intersection group
            RTPapercut._addCircleToIntersectionGroup(
              circle,
              intersectionGroup,
              intersectionMaterial
            );
          }

          return; // Done processing this node
        }

        // FUTURE: Polyhedra-as-nodes (mesh intersection - fallback to existing logic)
        // else if (object.userData.nodeType === "polyhedron") {
        //   // Fall through to standard mesh intersection code below
        //   // This allows octahedra, tetrahedra, cubes, etc. as vertex markers
        //   // Uses existing face-edge intersection logic (no special handling needed)
        // }
      }

      // Skip sphere geometries (gumball/control handles, scale mode spheres WITHOUT userData.isVertexNode)
      if (
        object.geometry.type === "SphereGeometry" ||
        (object.geometry.parameters && object.geometry.parameters.radius)
      ) {
        return;
      }

      // Get geometry vertices and faces
      const geometry = object.geometry;
      const positionAttr = geometry.attributes.position;
      if (!positionAttr) return;

      // Collect unique intersection points by checking face edges
      const intersectionSegments = [];
      const vertices = [];

      // Build vertex array
      for (let i = 0; i < positionAttr.count; i++) {
        const vertex = new THREE.Vector3(
          positionAttr.getX(i),
          positionAttr.getY(i),
          positionAttr.getZ(i)
        );
        vertex.applyMatrix4(object.matrixWorld);
        vertices.push(vertex);
      }

      // Get index or create sequential indices
      const indices = geometry.index
        ? geometry.index.array
        : Array.from({ length: positionAttr.count }, (_, i) => i);

      // Process triangular faces (groups of 3 indices)
      for (let i = 0; i < indices.length; i += 3) {
        const v1 = vertices[indices[i]];
        const v2 = vertices[indices[i + 1]];
        const v3 = vertices[indices[i + 2]];

        // Check each edge of the triangle for intersection
        const edges = [
          [v1, v2],
          [v2, v3],
          [v3, v1],
        ];
        const faceIntersections = [];

        edges.forEach(([p1, p2]) => {
          const intersection = RTPapercut._lineIntersectPlane(p1, p2, plane);
          if (intersection) {
            faceIntersections.push(intersection);
          }
        });

        // If exactly 2 intersections, we have a line segment crossing this face
        if (faceIntersections.length === 2) {
          intersectionSegments.push([
            faceIntersections[0],
            faceIntersections[1],
          ]);
        }
      }

      // Create line segments from intersection pairs using Line2
      if (intersectionSegments.length > 0) {
        intersectionSegments.forEach(([p1, p2]) => {
          // LineGeometry requires positions as flat array: [x1, y1, z1, x2, y2, z2]
          const positions = [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z];
          const lineGeometry = new LineGeometry();
          lineGeometry.setPositions(positions);

          const line = new Line2(lineGeometry, intersectionMaterial);
          line.computeLineDistances(); // Required for LineMaterial
          intersectionGroup.add(line);
        });
      }
    });

    // Add intersection group to scene
    if (intersectionGroup.children.length > 0) {
      scene.add(intersectionGroup);
      RTPapercut._intersectionLines = intersectionGroup;
    }
  },

  /**
   * Calculate intersection point of line segment with plane
   * @param {THREE.Vector3} p1 - Line start point
   * @param {THREE.Vector3} p2 - Line end point
   * @param {THREE.Plane} plane - The plane
   * @returns {THREE.Vector3|null} Intersection point or null if no intersection
   * @private
   */
  _lineIntersectPlane: function (p1, p2, plane) {
    const line = new THREE.Line3(p1, p2);
    const intersection = new THREE.Vector3();

    // Check if line intersects plane
    const result = plane.intersectLine(line, intersection);

    return result; // Returns Vector3 if intersection, null otherwise
  },

  /**
   * Generate circular intersection for sphere-plane cut (RT-Pure)
   * Uses analytical geometry with RT.spherePlaneCircleRadius() for radius calculation
   *
   * @param {THREE.Vector3} sphereCenter - World position of sphere center
   * @param {number} sphereRadius - Sphere radius
   * @param {THREE.Plane} plane - Cutting plane
   * @param {number} segments - Circle resolution (default: 32, ignored if adaptive mode enabled)
   * @returns {Array<THREE.Vector3>|null} Array of points forming circle, or null if no intersection
   * @private
   */
  _spherePlaneIntersection: function (
    sphereCenter,
    sphereRadius,
    plane,
    segments = 32
  ) {
    // RT-Pure: Work with quadrance until final radius calculation
    const distanceToPlane = plane.distanceToPoint(sphereCenter);
    const distanceQ = distanceToPlane * distanceToPlane;
    const sphereRadiusQ = sphereRadius * sphereRadius;

    // Use RT helper for radius calculation (defers sqrt)
    const circleRadius = RT.spherePlaneCircleRadius(sphereRadiusQ, distanceQ);

    if (circleRadius === null) {
      return null; // No intersection
    }

    // High resolution mode: 72 segments for smoother circles (default: 36)
    if (RTPapercut.state.adaptiveNodeResolution) {
      segments = 72;
    }

    // Find circle center (projection of sphere center onto plane)
    const circleCenter = new THREE.Vector3();
    plane.projectPoint(sphereCenter, circleCenter);

    // Generate two perpendicular vectors in the plane
    const normal = plane.normal.clone();

    // Find first tangent vector (cross with any non-parallel vector)
    const up =
      Math.abs(normal.y) < 0.9
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
    const tangent1 = new THREE.Vector3().crossVectors(normal, up).normalize();
    const tangent2 = new THREE.Vector3()
      .crossVectors(normal, tangent1)
      .normalize();

    // Generate circle points using parametric form
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * circleRadius;
      const y = Math.sin(angle) * circleRadius;

      const point = circleCenter
        .clone()
        .add(tangent1.clone().multiplyScalar(x))
        .add(tangent2.clone().multiplyScalar(y));

      points.push(point);
    }

    return points;
  },

  /**
   * Add circle as continuous line loop to intersection group
   * @param {Array<THREE.Vector3>} points - Circle points
   * @param {THREE.Group} group - Intersection group
   * @param {LineMaterial} material - Line material
   * @private
   */
  _addCircleToIntersectionGroup: function (points, group, material) {
    // Convert points to flat array for LineGeometry
    const positions = [];
    points.forEach(p => {
      positions.push(p.x, p.y, p.z);
    });

    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions(positions);

    const line = new Line2(lineGeometry, material);
    line.computeLineDistances(); // Required for LineMaterial
    group.add(line);
  },

  /**
   * Update cutplane axis based on camera view
   * @param {string} view - Camera view name (top, front, left, etc.)
   * @param {THREE.Scene} scene
   * @private
   */
  _updateCutplaneAxisForView: function (view, scene) {
    const axisMap = {
      top: "z",
      bottom: "z",
      front: "y",
      back: "y",
      left: "x",
      right: "x",
      axo: "z", // Default to Z for axonometric
      perspective: "z",
    };

    const newAxis = axisMap[view] || "z";

    if (newAxis !== RTPapercut.state.cutplaneAxis) {
      RTPapercut.state.cutplaneAxis = newAxis;
      RTPapercut.state.currentView = view;

      // Update axis info display
      const axisInfo = document.getElementById("cutplaneAxisInfo");
      if (axisInfo) {
        const axisNames = { x: "X", y: "Y", z: "Z" };
        const viewNames = {
          top: "Top/Bottom",
          bottom: "Top/Bottom",
          front: "Front/Back",
          back: "Front/Back",
          left: "Left/Right",
          right: "Left/Right",
          axo: "Axonometric",
          perspective: "Perspective",
        };
        axisInfo.textContent = `Axis: ${axisNames[newAxis]} (${viewNames[view]} view)`;
      }

      // Update slider range based on grid extent
      RTPapercut._updateSliderRange();

      // Re-apply cutplane with new axis if enabled
      if (RTPapercut.state.cutplaneEnabled) {
        RTPapercut.updateCutplane(RTPapercut.state.cutplaneValue, scene);
      }

      // Cutplane axis updated
    }
  },

  /**
   * Set cutplane axis manually (called from UI axis selector buttons)
   * @param {string} basis - 'cartesian' or 'tetrahedral'
   * @param {string} axis - 'x', 'y', 'z' (Cartesian) or 'qw', 'qx', 'qy', 'qz' (Tetrahedral/Quadray)
   * @param {THREE.Scene} scene
   */
  setCutplaneAxis: function (basis, axis, scene) {
    RTPapercut.state.cutplaneBasis = basis;
    RTPapercut.state.cutplaneAxis = axis;

    // Update slider range based on grid extent
    RTPapercut._updateSliderRange();

    // Re-apply cutplane with new axis if enabled
    if (RTPapercut.state.cutplaneEnabled) {
      RTPapercut.updateCutplane(RTPapercut.state.cutplaneValue, scene);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIME PROJECTION POLYGON OVERLAY
  // Shows unit-radius regular n-gon to demonstrate prime projection hypothesis
  // ═══════════════════════════════════════════════════════════════════════════

  _primePolygonGroup: null,
  _primePolygonVisible: false,

  /**
   * Create ACTUAL projection hull vertices from truncated tetrahedron
   * NOT a fake regular polygon - uses real projection computation!
   *
   * @param {number} n - Number of sides (7 for heptagon projection)
   * @param {number} radius - Target radius for scaling the projection
   * @param {THREE.Camera} camera - Camera to align polygon perpendicular to view
   * @returns {Array<THREE.Vector3>} Polygon vertices from ACTUAL projection
   */
  _createProjectionHullVertices: function (n, radius, camera) {
    console.log("📐 _createProjectionHullVertices: ACTUAL projection for", n, "-hull");

    // Get view plane basis vectors
    const viewDir = new THREE.Vector3();
    camera.getWorldDirection(viewDir);
    const up = camera.up.clone().normalize();
    const right = new THREE.Vector3().crossVectors(viewDir, up).normalize();
    const planeUp = new THREE.Vector3().crossVectors(right, viewDir).normalize();

    // Truncated tetrahedron vertices (normalized, from rt-math.js)
    // These are permutations of (3,1,1) with even parity, normalized
    const truncTetVertices = [
      [3, 1, 1], [3, -1, -1], [1, 3, 1], [1, -3, -1],
      [1, 1, 3], [1, -1, -3], [-3, 1, -1], [-3, -1, 1],
      [-1, 3, -1], [-1, -3, 1], [-1, 1, -3], [-1, -1, 3]
    ].map(v => {
      const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
      return [v[0]/len, v[1]/len, v[2]/len];
    });

    // Get viewing spreads for this n-gon
    // 7-hull: s=(0.11, 0, 0.5), 5-gon: s=(0, 0, 0.5)
    let s1, s2, s3;
    if (n === 7) {
      s1 = 0.11; s2 = 0; s3 = 0.5;
    } else if (n === 5) {
      s1 = 0; s2 = 0; s3 = 0.5;
    } else {
      // Fallback: no projection defined, use regular polygon
      console.warn("⚠️ No projection defined for", n, "-gon, using regular polygon");
      return this._createRegularPolygonVerticesFallback(n, radius, camera);
    }

    // Build rotation matrix from spreads (ZYX Euler)
    // sin(θ) = √s, cos(θ) = √(1-s)
    const sin1 = Math.sqrt(s1), cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2), cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3), cos3 = Math.sqrt(1 - s3);

    // Rotation matrices
    const Rz = [[cos1, -sin1, 0], [sin1, cos1, 0], [0, 0, 1]];
    const Ry = [[cos2, 0, sin2], [0, 1, 0], [-sin2, 0, cos2]];
    const Rx = [[1, 0, 0], [0, cos3, -sin3], [0, sin3, cos3]];

    // Matrix multiply helper
    const matMul = (A, B) => A.map((row, i) =>
      B[0].map((_, j) => row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0))
    );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Apply rotation and project to 2D
    const projected2D = truncTetVertices.map(v => {
      const rx = R[0][0]*v[0] + R[0][1]*v[1] + R[0][2]*v[2];
      const ry = R[1][0]*v[0] + R[1][1]*v[1] + R[1][2]*v[2];
      return { x: rx, y: ry };
    });

    // Compute convex hull (Graham scan)
    const hull = this._computeConvexHull2D(projected2D);
    console.log("   Hull vertices:", hull.length, "(expected:", n, ")");

    // Log interior angles for verification
    const angles = [];
    for (let i = 0; i < hull.length; i++) {
      const prev = hull[(i - 1 + hull.length) % hull.length];
      const curr = hull[i];
      const next = hull[(i + 1) % hull.length];
      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      const cosAng = Math.max(-1, Math.min(1, dot / (len1 * len2)));
      angles.push(Math.round(Math.acos(cosAng) * 180 / Math.PI));
    }
    console.log("   Interior angles:", angles.join("°, ") + "°");

    // Scale to target radius (find max distance from centroid)
    const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
    let maxDist = 0;
    hull.forEach(p => {
      const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      if (d > maxDist) maxDist = d;
    });
    const scale = radius / maxDist;

    // Convert to 3D vertices in camera view plane
    const vertices = [];
    hull.forEach(p => {
      const x = (p.x - cx) * scale;
      const y = (p.y - cy) * scale;
      const vertex = new THREE.Vector3()
        .addScaledVector(right, x)
        .addScaledVector(planeUp, y);
      vertices.push(vertex);
    });
    // Close the loop
    vertices.push(vertices[0].clone());

    console.log("   ✓ ACTUAL projection hull with", hull.length, "vertices (irregular!)");
    return vertices;
  },

  /**
   * Compute 2D convex hull using Graham scan
   * @param {Array<{x,y}>} points - 2D points
   * @returns {Array<{x,y}>} Hull vertices in CCW order
   */
  _computeConvexHull2D: function (points) {
    // Remove duplicates (within tolerance)
    const unique = [];
    const tol = 1e-8;
    points.forEach(p => {
      if (!unique.some(u => Math.abs(u.x - p.x) < tol && Math.abs(u.y - p.y) < tol)) {
        unique.push(p);
      }
    });

    if (unique.length < 3) return unique;

    // Find lowest point (and leftmost if tie)
    let lowest = 0;
    for (let i = 1; i < unique.length; i++) {
      if (unique[i].y < unique[lowest].y ||
          (unique[i].y === unique[lowest].y && unique[i].x < unique[lowest].x)) {
        lowest = i;
      }
    }
    [unique[0], unique[lowest]] = [unique[lowest], unique[0]];
    const pivot = unique[0];

    // Sort by polar angle
    const sorted = unique.slice(1).sort((a, b) => {
      const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      return angleA - angleB;
    });

    // Graham scan
    const hull = [pivot];
    for (const p of sorted) {
      while (hull.length > 1) {
        const a = hull[hull.length - 2];
        const b = hull[hull.length - 1];
        const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (cross <= 0) hull.pop();
        else break;
      }
      hull.push(p);
    }

    console.log(`   _computeConvexHull2D: ${unique.length} unique points → ${hull.length} hull vertices`);
    return hull;
  },

  /**
   * Fallback: regular polygon for n-gons without projection definition
   */
  _createRegularPolygonVerticesFallback: function (n, radius, camera) {
    const viewDir = new THREE.Vector3();
    camera.getWorldDirection(viewDir);
    const up = camera.up.clone().normalize();
    const right = new THREE.Vector3().crossVectors(viewDir, up).normalize();
    const planeUp = new THREE.Vector3().crossVectors(right, viewDir).normalize();

    const vertices = [];
    for (let i = 0; i <= n; i++) {
      const angle = (2 * Math.PI * i) / n;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      vertices.push(new THREE.Vector3().addScaledVector(right, x).addScaledVector(planeUp, y));
    }
    return vertices;
  },

  /**
   * Show or hide the prime projection visualization
   *
   * VISUALIZATION COMPONENTS:
   * 1. Finds the actual Quadray Truncated Tetrahedron in the scene
   * 2. Draws projection RAYS from each vertex toward the projection plane
   * 3. Shows projection plane at a distance with YELLOW (actual) and CYAN (ideal) polygons
   * 4. NO cutplane activation (projection ≠ section cut)
   *
   * @param {number|null} n - Number of sides (7, 5, etc.) or null to hide
   * @param {THREE.Scene} scene - Scene to add/remove visualization from
   * @param {THREE.Camera} camera - Camera reference
   * @param {number} planeDistance - Distance from polyhedron center to projection plane (default: 5)
   */
  showPrimePolygon: function (n, scene, camera, planeDistance = 5) {
    console.log("🔍 showPrimePolygon called with:", { n, scene: !!scene, camera: !!camera, planeDistance });

    // Validate inputs
    if (!scene) {
      console.error("❌ showPrimePolygon: scene is undefined!");
      return;
    }
    if (!camera) {
      console.error("❌ showPrimePolygon: camera is undefined!");
      return;
    }

    // Remove existing visualization if any
    if (RTPapercut._primePolygonGroup) {
      console.log("🧹 Removing existing projection visualization");
      scene.remove(RTPapercut._primePolygonGroup);
      RTPapercut._primePolygonGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      RTPapercut._primePolygonGroup = null;
    }

    // If n is null, just hide (already removed above)
    if (!n) {
      RTPapercut._primePolygonVisible = false;
      RTPapercut._hideProjectionInfo();
      console.log("📐 Prime projection visualization hidden");
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FIND THE ACTUAL TRUNCATED TETRAHEDRON IN THE SCENE
    // ═══════════════════════════════════════════════════════════════════════
    let truncTetGroup = null;
    scene.traverse(obj => {
      if (obj.name === "QuadrayTruncatedTetrahedron" || obj.name === "quadrayTruncatedTetGroup") {
        truncTetGroup = obj;
      }
    });

    // Also check for the group by looking for userData with primeProjection
    if (!truncTetGroup) {
      scene.traverse(obj => {
        if (obj.userData?.parameters?.primeProjection) {
          truncTetGroup = obj;
        }
      });
    }

    if (!truncTetGroup || !truncTetGroup.visible) {
      console.warn("⚠️ Quadray Truncated Tetrahedron not found or not visible in scene");
      console.log("   Please enable 'Quadray Truncated Tetrahedron' checkbox first");
      RTPapercut._hideProjectionInfo();
      return;
    }

    console.log("🔨 Creating projection visualization for", n, "-hull");
    const group = new THREE.Group();
    group.name = `primeProjection-${n}`;

    // ═══════════════════════════════════════════════════════════════════════
    // GET WORLD VERTICES FROM THE ACTUAL MESH
    // ═══════════════════════════════════════════════════════════════════════
    const worldVertices = RTPapercut._getWorldVerticesFromGroup(truncTetGroup);
    if (worldVertices.length === 0) {
      console.error("❌ Could not extract vertices from truncated tetrahedron");
      return;
    }
    console.log("   Found", worldVertices.length, "vertices from scene mesh");

    // Get center of the polyhedron
    const center = new THREE.Vector3();
    worldVertices.forEach(v => center.add(v));
    center.divideScalar(worldVertices.length);

    // ═══════════════════════════════════════════════════════════════════════
    // COMPUTE PROJECTION PLANE BASIS from viewing spreads
    // ═══════════════════════════════════════════════════════════════════════
    const { planeRight, planeUp, planeNormal } = RTPapercut._getProjectionPlaneBasis(n);
    console.log("   Projection direction:", planeNormal.x.toFixed(3), planeNormal.y.toFixed(3), planeNormal.z.toFixed(3));

    // Projection plane is at distance along the normal from center
    const planeCenter = center.clone().addScaledVector(planeNormal, planeDistance);

    // ═══════════════════════════════════════════════════════════════════════
    // PROJECT VERTICES TO THE PLANE
    // ═══════════════════════════════════════════════════════════════════════
    const projectedPoints = []; // 2D coordinates in plane space
    const projected3D = []; // 3D world positions on plane

    worldVertices.forEach(vertex => {
      // Project vertex onto plane along planeNormal direction
      const toVertex = vertex.clone().sub(planeCenter);
      const distAlongNormal = toVertex.dot(planeNormal);
      const projectedPoint = vertex.clone().addScaledVector(planeNormal, -distAlongNormal);

      // Convert to 2D plane coordinates
      const localPoint = projectedPoint.clone().sub(planeCenter);
      const x = localPoint.dot(planeRight);
      const y = localPoint.dot(planeUp);

      projectedPoints.push({ x, y, vertex3D: vertex, projected3D: projectedPoint });
      projected3D.push(projectedPoint);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 1. PROJECTION RAYS (YELLOW lines from vertices to projected points)
    // ═══════════════════════════════════════════════════════════════════════
    const rayMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
      depthTest: true,
    });

    projectedPoints.forEach((p, i) => {
      const rayGeometry = new THREE.BufferGeometry().setFromPoints([p.vertex3D, p.projected3D]);
      const ray = new THREE.Line(rayGeometry, rayMaterial);
      ray.name = `projectionRay-${i}`;
      group.add(ray);
    });
    console.log("   ✓ Added", projectedPoints.length, "projection rays");

    // ═══════════════════════════════════════════════════════════════════════
    // 2. COMPUTE CONVEX HULL of projected points
    // ═══════════════════════════════════════════════════════════════════════
    const hull2D = RTPapercut._computeConvexHull2D(projectedPoints.map(p => ({ x: p.x, y: p.y })));
    console.log("   ✓ Hull has", hull2D.length, "vertices (expected:", n, ")");

    // Convert hull back to 3D
    const hullVertices3D = hull2D.map(p => {
      return planeCenter.clone()
        .addScaledVector(planeRight, p.x)
        .addScaledVector(planeUp, p.y);
    });
    hullVertices3D.push(hullVertices3D[0].clone()); // Close the loop

    // ═══════════════════════════════════════════════════════════════════════
    // 3. ACTUAL HULL (YELLOW polygon) - Simple hairline
    // ═══════════════════════════════════════════════════════════════════════
    const actualGeometry = new THREE.BufferGeometry().setFromPoints(hullVertices3D);
    const actualMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.95,
      depthTest: true,
    });
    const actualLine = new THREE.Line(actualGeometry, actualMaterial);
    actualLine.renderOrder = 1000;
    actualLine.name = "actualHull";
    group.add(actualLine);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. IDEAL REGULAR POLYGON (CYAN) for comparison - Simple hairline
    // ═══════════════════════════════════════════════════════════════════════
    // Calculate radius from hull for matching scale
    let maxRadius = 0;
    hull2D.forEach(p => {
      const r = Math.sqrt(p.x * p.x + p.y * p.y);
      if (r > maxRadius) maxRadius = r;
    });

    const idealVertices = [];
    for (let i = 0; i <= n; i++) {
      const angle = (2 * Math.PI * i) / n;
      const x = maxRadius * Math.cos(angle);
      const y = maxRadius * Math.sin(angle);
      idealVertices.push(
        planeCenter.clone()
          .addScaledVector(planeRight, x)
          .addScaledVector(planeUp, y)
      );
    }

    const idealGeometry = new THREE.BufferGeometry().setFromPoints(idealVertices);
    const idealMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      depthTest: true,
    });
    const idealLine = new THREE.Line(idealGeometry, idealMaterial);
    idealLine.renderOrder = 999;
    idealLine.name = "idealPolygon";
    group.add(idealLine);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. VERTEX NODES on hull and projected points
    // ═══════════════════════════════════════════════════════════════════════
    const nodeRadius = 0.04;
    const nodeGeometry = new THREE.SphereGeometry(nodeRadius, 12, 12);

    // Yellow nodes at hull vertices
    const hullNodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < hullVertices3D.length - 1; i++) {
      const node = new THREE.Mesh(nodeGeometry, hullNodeMaterial.clone());
      node.position.copy(hullVertices3D[i]);
      node.name = `hullNode-${i}`;
      group.add(node);
    }

    // Cyan nodes at ideal vertices
    const idealNodeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 0; i < idealVertices.length - 1; i++) {
      const node = new THREE.Mesh(nodeGeometry.clone(), idealNodeMaterial.clone());
      node.position.copy(idealVertices[i]);
      node.name = `idealNode-${i}`;
      group.add(node);
    }

    // Small white nodes at all projected points (showing interior vs hull)
    const projNodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
    });
    const smallNodeGeom = new THREE.SphereGeometry(nodeRadius * 0.5, 8, 8);

    projected3D.forEach((p, i) => {
      const node = new THREE.Mesh(smallNodeGeom, projNodeMaterial.clone());
      node.position.copy(p);
      node.name = `projectedPoint-${i}`;
      group.add(node);
    });

    console.log("   ✓ Added vertex nodes (yellow=hull, cyan=ideal, white=all projected)");

    // ═══════════════════════════════════════════════════════════════════════
    // FINAL SETUP
    // ═══════════════════════════════════════════════════════════════════════
    scene.add(group);
    RTPapercut._primePolygonGroup = group;
    RTPapercut._primePolygonVisible = true;

    console.log(`📐 Projection visualization complete:`);
    console.log(`   Source: ${worldVertices.length} vertices from Quadray Truncated Tetrahedron`);
    console.log(`   Projection: ${hull2D.length}-vertex hull (YELLOW) vs ${n}-vertex ideal (CYAN)`);
    console.log(`   Plane distance: ${planeDistance} units from polyhedron center`);

    // Update UI info display
    RTPapercut._updateProjectionInfo(n);
  },

  /**
   * Extract world-space vertices from a polyhedron group
   * Skips node spheres (userData.isVertexNode = true) to get only face mesh vertices
   * Uses coarse tolerance to collapse triangulated mesh back to actual polyhedron vertices
   *
   * @param {THREE.Group} group - The polyhedron group
   * @returns {Array<THREE.Vector3>} World-space vertices (12 for truncated tetrahedron)
   */
  _getWorldVerticesFromGroup: function (group) {
    const vertices = [];
    const seen = new Set();

    // Coarse tolerance (2 decimal places) to collapse triangulated mesh vertices
    // back to the actual polyhedron vertices
    const TOLERANCE_DECIMALS = 2;

    group.traverse(obj => {
      // Skip node spheres - they have userData.isVertexNode = true
      if (obj.userData?.isVertexNode) {
        return;
      }

      if (obj.geometry && obj.geometry.attributes?.position) {
        const posAttr = obj.geometry.attributes.position;
        obj.updateMatrixWorld(true);

        for (let i = 0; i < posAttr.count; i++) {
          const v = new THREE.Vector3(
            posAttr.getX(i),
            posAttr.getY(i),
            posAttr.getZ(i)
          );
          v.applyMatrix4(obj.matrixWorld);

          // Deduplicate using coarse tolerance
          const key = `${v.x.toFixed(TOLERANCE_DECIMALS)},${v.y.toFixed(TOLERANCE_DECIMALS)},${v.z.toFixed(TOLERANCE_DECIMALS)}`;
          if (!seen.has(key)) {
            seen.add(key);
            vertices.push(v);
          }
        }
      }
    });

    console.log(`   _getWorldVerticesFromGroup: ${vertices.length} vertices (skipped node spheres)`);
    return vertices;
  },

  /**
   * Activate the Papercut cutplane at the prime projection plane orientation
   * This allows the user to see the actual section cut through the truncated tetrahedron
   *
   * @param {number} n - Number of sides (7 or 5)
   * @param {THREE.Scene} scene - Scene reference
   * @param {THREE.Vector3} planeNormal - Normal vector of the projection plane
   */
  _activatePrimeProjectionCutplane: function (n, scene, planeNormal) {
    console.log(`✂️ Activating cutplane for ${n}-gon projection`);

    // Create clipping plane with the projection normal, passing through origin
    // THREE.Plane(normal, constant) where constant = -d (distance from origin)
    const plane = new THREE.Plane(planeNormal.clone(), 0);

    // Update state
    RTPapercut.state.cutplaneEnabled = true;
    RTPapercut.state.cutplaneNormal = plane;
    RTPapercut.state.cutplaneValue = 0;

    // Update the UI checkbox to reflect enabled state
    const cutplaneCheckbox = document.getElementById("enableCutPlane");
    if (cutplaneCheckbox) {
      cutplaneCheckbox.checked = true;
    }

    // Update slider display
    const cutplaneValue = document.getElementById("cutplaneValue");
    if (cutplaneValue) {
      cutplaneValue.textContent = "0";
    }
    const cutplaneSlider = document.getElementById("cutplaneSlider");
    if (cutplaneSlider) {
      cutplaneSlider.value = 0;
    }

    // Update axis info display
    const axisInfo = document.getElementById("cutplaneAxisInfo");
    if (axisInfo) {
      axisInfo.textContent = `Axis: ${n}-gon projection plane (custom)`;
    }

    // Apply clipping plane to all renderable objects
    scene.traverse(object => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => {
            mat.clippingPlanes = [plane];
            mat.clipShadows = true;
            mat.needsUpdate = true;
          });
        } else {
          object.material.clippingPlanes = [plane];
          object.material.clipShadows = true;
          object.material.needsUpdate = true;
        }
      }
    });

    // Enable renderer local clipping
    if (RTPapercut._renderer) {
      RTPapercut._renderer.localClippingEnabled = true;
    }

    // Generate intersection edges
    RTPapercut._generateIntersectionEdges(scene, plane);

    console.log(`   ✓ Cutplane active with normal: (${planeNormal.x.toFixed(3)}, ${planeNormal.y.toFixed(3)}, ${planeNormal.z.toFixed(3)})`);
  },

  /**
   * Deactivate the prime projection cutplane
   * Called when hiding the prime polygon overlay
   *
   * @param {THREE.Scene} scene - Scene reference
   */
  _deactivatePrimeProjectionCutplane: function (scene) {
    console.log("✂️ Deactivating prime projection cutplane");

    // Remove clipping planes from all materials
    scene.traverse(object => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => {
            mat.clippingPlanes = [];
            mat.needsUpdate = true;
          });
        } else {
          object.material.clippingPlanes = [];
          object.material.needsUpdate = true;
        }
      }
    });

    // Disable renderer clipping
    if (RTPapercut._renderer) {
      RTPapercut._renderer.localClippingEnabled = false;
    }

    // Remove intersection lines
    if (RTPapercut._intersectionLines) {
      scene.remove(RTPapercut._intersectionLines);
      RTPapercut._intersectionLines.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      RTPapercut._intersectionLines = null;
    }

    // Update state
    RTPapercut.state.cutplaneEnabled = false;
    RTPapercut.state.cutplaneNormal = null;

    // Update the UI checkbox
    const cutplaneCheckbox = document.getElementById("enableCutPlane");
    if (cutplaneCheckbox) {
      cutplaneCheckbox.checked = false;
    }

    // Reset axis info display
    const axisInfo = document.getElementById("cutplaneAxisInfo");
    if (axisInfo) {
      axisInfo.textContent = "Axis: Z (Top/Bottom view)";
    }

    console.log("   ✓ Cutplane deactivated");
  },

  /**
   * Get projection plane basis vectors from viewing spreads
   * Returns the plane where the n-gon projection lives (fixed in 3D space)
   *
   * @param {number} n - Number of sides (7 for heptagon, 5 for pentagon)
   * @returns {{planeRight: THREE.Vector3, planeUp: THREE.Vector3, planeNormal: THREE.Vector3}}
   */
  _getProjectionPlaneBasis: function (n) {
    // Get viewing spreads for this n-gon
    let s1, s2, s3;
    if (n === 7) {
      s1 = 0.11; s2 = 0; s3 = 0.5;
    } else if (n === 5) {
      s1 = 0; s2 = 0; s3 = 0.5;
    } else {
      // Default: XY plane
      return {
        planeRight: new THREE.Vector3(1, 0, 0),
        planeUp: new THREE.Vector3(0, 1, 0),
        planeNormal: new THREE.Vector3(0, 0, 1),
      };
    }

    // Build rotation matrix from spreads (ZYX Euler)
    // sin(θ) = √s, cos(θ) = √(1-s)
    const sin1 = Math.sqrt(s1), cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2), cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3), cos3 = Math.sqrt(1 - s3);

    // ZYX rotation matrices
    const Rz = [[cos1, -sin1, 0], [sin1, cos1, 0], [0, 0, 1]];
    const Ry = [[cos2, 0, sin2], [0, 1, 0], [-sin2, 0, cos2]];
    const Rx = [[1, 0, 0], [0, cos3, -sin3], [0, sin3, cos3]];

    // Matrix multiply helper
    const matMul = (A, B) => A.map((row, i) =>
      B[0].map((_, j) => row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0))
    );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Transform basis vectors
    // planeRight = R * (1,0,0)
    const planeRight = new THREE.Vector3(R[0][0], R[1][0], R[2][0]).normalize();
    // planeUp = R * (0,1,0)
    const planeUp = new THREE.Vector3(R[0][1], R[1][1], R[2][1]).normalize();
    // planeNormal = R * (0,0,1) - this is the viewing direction
    const planeNormal = new THREE.Vector3(R[0][2], R[1][2], R[2][2]).normalize();

    console.log(`📐 Projection plane for ${n}-gon: spreads=(${s1}, ${s2}, ${s3})`);
    console.log(`   Right: (${planeRight.x.toFixed(3)}, ${planeRight.y.toFixed(3)}, ${planeRight.z.toFixed(3)})`);
    console.log(`   Up: (${planeUp.x.toFixed(3)}, ${planeUp.y.toFixed(3)}, ${planeUp.z.toFixed(3)})`);
    console.log(`   Normal: (${planeNormal.x.toFixed(3)}, ${planeNormal.y.toFixed(3)}, ${planeNormal.z.toFixed(3)})`);

    return { planeRight, planeUp, planeNormal };
  },

  /**
   * Create ACTUAL projection hull vertices in the fixed projection plane
   * @param {number} n - Number of sides
   * @param {number} radius - Target radius
   * @param {THREE.Vector3} planeRight - Plane's X axis
   * @param {THREE.Vector3} planeUp - Plane's Y axis
   * @returns {Array<THREE.Vector3>} Vertices in 3D space
   */
  _createProjectionHullVerticesFixed: function (n, radius, planeRight, planeUp) {
    // Truncated tetrahedron vertices (normalized)
    const truncTetVertices = [
      [3, 1, 1], [3, -1, -1], [1, 3, 1], [1, -3, -1],
      [1, 1, 3], [1, -1, -3], [-3, 1, -1], [-3, -1, 1],
      [-1, 3, -1], [-1, -3, 1], [-1, 1, -3], [-1, -1, 3]
    ].map(v => {
      const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
      return [v[0]/len, v[1]/len, v[2]/len];
    });

    // Get viewing spreads
    let s1, s2, s3;
    if (n === 7) {
      s1 = 0.11; s2 = 0; s3 = 0.5;
    } else if (n === 5) {
      s1 = 0; s2 = 0; s3 = 0.5;
    } else {
      s1 = 0; s2 = 0; s3 = 0;
    }

    // Build rotation matrix from spreads
    const sin1 = Math.sqrt(s1), cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2), cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3), cos3 = Math.sqrt(1 - s3);

    const Rz = [[cos1, -sin1, 0], [sin1, cos1, 0], [0, 0, 1]];
    const Ry = [[cos2, 0, sin2], [0, 1, 0], [-sin2, 0, cos2]];
    const Rx = [[1, 0, 0], [0, cos3, -sin3], [0, sin3, cos3]];

    const matMul = (A, B) => A.map((row, i) =>
      B[0].map((_, j) => row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0))
    );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Apply rotation and project to 2D (in rotated frame)
    const projected2D = truncTetVertices.map(v => {
      const rx = R[0][0]*v[0] + R[0][1]*v[1] + R[0][2]*v[2];
      const ry = R[1][0]*v[0] + R[1][1]*v[1] + R[1][2]*v[2];
      return { x: rx, y: ry };
    });

    // Compute convex hull
    const hull = this._computeConvexHull2D(projected2D);

    // Scale to target radius
    const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
    let maxDist = 0;
    hull.forEach(p => {
      const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      if (d > maxDist) maxDist = d;
    });
    const scale = radius / maxDist;

    // Convert to 3D vertices in the FIXED projection plane
    const vertices = [];
    hull.forEach(p => {
      const x = (p.x - cx) * scale;
      const y = (p.y - cy) * scale;
      const vertex = new THREE.Vector3()
        .addScaledVector(planeRight, x)
        .addScaledVector(planeUp, y);
      vertices.push(vertex);
    });
    vertices.push(vertices[0].clone()); // Close the loop

    return vertices;
  },

  /**
   * Create regular polygon vertices in the fixed projection plane
   * @param {number} n - Number of sides
   * @param {number} radius - Circumradius
   * @param {THREE.Vector3} planeRight - Plane's X axis
   * @param {THREE.Vector3} planeUp - Plane's Y axis
   * @returns {Array<THREE.Vector3>} Vertices in 3D space
   */
  _createRegularPolygonVerticesFixed: function (n, radius, planeRight, planeUp) {
    const vertices = [];
    for (let i = 0; i <= n; i++) {
      const angle = (2 * Math.PI * i) / n;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      const vertex = new THREE.Vector3()
        .addScaledVector(planeRight, x)
        .addScaledVector(planeUp, y);
      vertices.push(vertex);
    }
    return vertices;
  },

  /**
   * Update the prime projection info display with Quadray formula
   * Shows DUAL overlay legend: YELLOW (actual) vs CYAN (ideal)
   * @param {number} n - Number of sides
   */
  _updateProjectionInfo: function (n) {
    const infoContainer = document.getElementById("primeProjectionInfo");
    const formulaSpan = document.getElementById("primeProjectionFormula");
    if (!infoContainer || !formulaSpan) return;

    let formulaText = "";

    switch (n) {
      case 7:
        // 7-hull: ACTUAL projection from truncated tetrahedron
        // Quadray coords: {2,1,0,0} permutations (12 vertices, ALL RATIONAL)
        // Viewing spreads: s=(0.11, 0, 0.5) → 7-vertex hull (2 collinear)
        formulaText =
          "YELLOW: Actual 7-hull projection\n" +
          "  Quadray {2,1,0,0}/3 → s=(0.11,0,½)\n" +
          "  7 vertices (2 collinear @ 180°)\n" +
          "CYAN: Ideal regular heptagon\n" +
          "  Classical trig (for comparison)";
        break;

      case 5:
        // 5-gon: ACTUAL projection from truncated tetrahedron
        // Viewing spreads: s=(0, 0, 0.5)
        formulaText =
          "YELLOW: Actual 5-gon projection\n" +
          "  Trunc Tet → s=(0,0,½)\n" +
          "CYAN: Ideal regular pentagon\n" +
          "  Classical trig (for comparison)";
        break;

      default:
        // Generic n-gon info
        const s = Math.pow(Math.sin(Math.PI / n), 2);
        formulaText =
          `YELLOW: Actual projection (irregular)\n` +
          `CYAN: Ideal regular ${n}-gon\n` +
          `  s = sin²(π/${n}) ≈ ${s.toFixed(4)}`;
    }

    formulaSpan.textContent = formulaText;
    infoContainer.style.display = "block";
    infoContainer.style.whiteSpace = "pre-line"; // Preserve line breaks
  },

  /**
   * Hide the prime projection info display
   */
  _hideProjectionInfo: function () {
    const infoContainer = document.getElementById("primeProjectionInfo");
    if (infoContainer) {
      infoContainer.style.display = "none";
    }
  },

  /**
   * Update polygon orientation to match camera (call on camera change)
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  updatePrimePolygonOrientation: function (scene, camera) {
    if (!RTPapercut._primePolygonVisible || !RTPapercut._primePolygonGroup) {
      return;
    }

    // Extract n from group name
    const match = RTPapercut._primePolygonGroup.name.match(/primePolygon-(\d+)/);
    if (!match) return;

    const n = parseInt(match[1]);
    const radius = 1.5; // Default radius

    // Recreate polygon with new orientation
    RTPapercut.showPrimePolygon(n, scene, camera, radius);
  },
};
