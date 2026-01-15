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
    cutplaneAxis: "z", // 'x', 'y', 'z' (Cartesian) or 'w', 'x', 'y', 'z' (Tetrahedral)
    cutplaneNormal: null, // THREE.Vector3
    invertCutPlane: false, // Invert normal (for ground plane mode)
    intervalSnapXYZEnabled: true, // XYZ: Snap to Cartesian grid intervals (step=1.0) vs fine control (step=0.1)
    intervalSnapWXYZEnabled: false, // WXYZ: Snap to Quadray grid intervals (step=√6/4≈0.612) vs fine control (step=0.1)
    lineWeightEnabled: true,
    lineWeightMin: 0.5,
    lineWeightMax: 3.0,
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

    // 2. Line Weight slider
    const lineWeightSlider = document.getElementById("lineWeight");
    const lineWeightValue = document.getElementById("lineWeightValue");
    if (lineWeightSlider) {
      lineWeightSlider.addEventListener("input", e => {
        const value = parseFloat(e.target.value);
        RTPapercut.state.lineWeightMax = value;
        if (lineWeightValue) {
          lineWeightValue.textContent = value;
        }
        // Update intersection line material if it exists
        if (RTPapercut._intersectionLines) {
          RTPapercut._intersectionLines.traverse(child => {
            if (child.material && child.material.isLineMaterial) {
              // LineMaterial uses linewidth property (scaled to world units)
              child.material.linewidth = value * 0.001;
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
    const intervalSnapWXYZCheckbox = document.getElementById("intervalSnapWXYZ");
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
   * XYZ Cartesian snap: step = 1.0 (aligns with Cartesian grid intervals)
   * WXYZ Quadray snap: step = √6/4 ≈ 0.612 (aligns with tetrahedral grid intervals)
   * Fine control (no snap): step = 0.1
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
        // WXYZ snap: Use Quadray grid interval √6/4 ≈ 0.612372
        step = RT.PureRadicals.QUADRAY_GRID_INTERVAL;
      } else {
        // Fine control
        step = 0.1;
      }

      // WXYZ Tetrahedral: Natural extent is 12 units
      return {
        min: -12,
        max: 12,
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

      // Map axis to Quadray basis vector
      const axisMap = { w: 0, x: 1, y: 2, z: 3 };
      const axisIndex = axisMap[RTPapercut.state.cutplaneAxis];
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
    let materialCount = 0;
    scene.traverse(object => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => {
            mat.clippingPlanes = [plane];
            mat.clipShadows = true;
            mat.needsUpdate = true;
            materialCount++;
          });
        } else {
          object.material.clippingPlanes = [plane];
          object.material.clipShadows = true;
          object.material.needsUpdate = true;
          materialCount++;
        }
      }
    });
    // Applied clipping plane to materials

    // 3. Enable renderer local clipping
    if (RTPapercut._renderer) {
      RTPapercut._renderer.localClippingEnabled = true;
    } else {
      console.error("❌ Renderer reference not found!");
    }

    // 4. Update slider value display
    const valueDisplay = document.getElementById("cutplaneValue");
    if (valueDisplay) {
      valueDisplay.textContent = value.toFixed(1);
    }

    // Cutplane updated

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
      linewidth: RTPapercut.state.lineWeightMax * 0.001, // Convert to world units (scaled down)
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
   * @param {string} axis - 'x', 'y', 'z' (Cartesian) or 'w', 'x', 'y', 'z' (Tetrahedral)
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
};
