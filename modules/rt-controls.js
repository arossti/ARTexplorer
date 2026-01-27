/**
 * rt-controls.js
 * ART Gumball Interactive Transform Controls
 *
 * Implements the localized gumball system for Move/Scale/Rotate operations
 * with support for both Cartesian (XYZ) and Quadray (WXYZ) coordinate systems.
 *
 * Features:
 * - Move tool: Drag along basis vector axes
 * - Grid snapping: Free, XYZ (0.1), WXYZ (√6/4 ≈ 0.612)
 * - Editing basis: Localized gumball that follows selected Forms
 * - Dual coordinate system support with checkbox visibility control
 *
 * @module RTControls
 * @requires THREE.js
 * @requires rt-math.js (Quadray coordinate system)
 */

export const RTControls = {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  state: {
    currentTool: null, // null = off, "move", "scale", "rotate"
    currentSnapMode: "free", // 'free', 'xyz', 'wxyz'
    isDragging: false,
    selectedHandle: null, // { type: 'quadray'|'cartesian', index: number, axis: Vector3 }
    dragPlane: null, // THREE.Plane for raycasting
    dragStartPoint: null, // THREE.Vector3
    selectedPolyhedra: [], // Currently selected polyhedra
    editingBasis: null, // Localized gumball THREE.Group
    depositedInstances: [], // Deposited instance snapshots
    depositedCount: 0,
  },

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize ART Gumball controls
   * @param {Object} THREE - THREE.js library
   * @param {Object} Quadray - Quadray coordinate system from rt-math.js
   * @param {THREE.Scene} scene - THREE.js scene
   * @param {THREE.Camera} camera - THREE.js camera
   * @param {THREE.Renderer} renderer - THREE.js renderer
   * @param {Object} controls - OrbitControls instance
   */
  init(THREE, Quadray, scene, camera, renderer, controls) {
    this.THREE = THREE;
    this.Quadray = Quadray;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = controls;

    // Initialize state objects
    this.state.dragPlane = new THREE.Plane();
    this.state.dragStartPoint = new THREE.Vector3();

    // Initialize UI event listeners
    this.initToolButtons();
    this.initSnapToggles();
    this.initNowButton();
    this.initEventListeners();

    console.log("✅ RTControls initialized");
  },

  // ========================================================================
  // UI EVENT HANDLERS
  // ========================================================================

  /**
   * Initialize tool mode buttons (Move, Scale, Rotate)
   */
  initToolButtons() {
    const buttons = document.querySelectorAll(".toggle-btn.variant-tool");

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tool = btn.dataset.gumballTool; // Use data-gumball-tool attribute

        // Toggle tool
        if (this.state.currentTool === tool) {
          // Deactivate current tool
          this.deactivateTool();
        } else {
          // Activate new tool
          this.activateTool(tool);
        }
      });
    });
  },

  /**
   * Initialize snap mode toggle buttons (Free, XYZ, WXYZ)
   */
  initSnapToggles() {
    const buttons = document.querySelectorAll(".toggle-btn.variant-snap");

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const snapMode = btn.dataset.snapMode;

        // Remove active from all buttons
        buttons.forEach(b => {
          b.classList.remove("active");
          b.style.background = "#222";
          b.style.color = "#888";
          b.style.borderColor = "#444";
        });

        // Add active to clicked button
        btn.classList.add("active");
        btn.style.background = "#333";
        btn.style.color = "#00ff88";
        btn.style.borderColor = "#00ff88";

        // Update state
        this.state.currentSnapMode = snapMode;

        console.log(`📐 Snap mode changed to: ${snapMode.toUpperCase()}`);
      });
    });
  },

  /**
   * Initialize NOW button for instance deposition
   */
  initNowButton() {
    document.getElementById("nowButton").addEventListener("click", () => {
      this.depositInstances();
    });
  },

  // ========================================================================
  // TOOL ACTIVATION/DEACTIVATION
  // ========================================================================

  /**
   * Activate a gumball tool (move, scale, rotate)
   * @param {string} tool - Tool name ('move', 'scale', 'rotate')
   */
  activateTool(tool) {
    // Update state
    this.state.currentTool = tool;

    // Update UI
    this.updateToolButtons(tool);

    // Disable orbit controls while tool is active
    this.orbitControls.enabled = false;

    // Create/recreate editing basis if polyhedra are selected
    // (Recreate if switching tools to update handle types: arrows vs cubes)
    const selectedPolyhedra = this.getSelectedPolyhedra();

    if (selectedPolyhedra.length > 0) {
      const center = this.getSelectionCenter(selectedPolyhedra);
      // createEditingBasis() automatically destroys existing basis first
      this.createEditingBasis(center);
    }

    console.log(`✅ Gumball tool: ${tool} - orbit controls disabled`);
  },

  /**
   * Deactivate current gumball tool
   */
  deactivateTool() {
    this.state.currentTool = null;

    // Update UI
    this.updateToolButtons(null);

    // Re-enable orbit controls
    this.orbitControls.enabled = true;

    // Remove editing basis
    this.destroyEditingBasis();

    console.log("✅ Gumball disabled - orbit controls enabled");
  },

  /**
   * Update tool button visual states
   * @param {string|null} activeTool - Currently active tool or null
   */
  updateToolButtons(activeTool) {
    const buttons = document.querySelectorAll(".toggle-btn.variant-tool");

    buttons.forEach(btn => {
      const tool = btn.dataset.gumballTool; // Use data-gumball-tool attribute

      if (tool === activeTool) {
        btn.classList.add("active");
        btn.style.background = "#00ff88";
        btn.style.color = "#1a1a1a";
      } else {
        btn.classList.remove("active");
        btn.style.background = "#333";
        btn.style.color = "#b0b0b0";
      }
    });
  },

  // ========================================================================
  // EDITING BASIS (LOCALIZED GUMBALL)
  // ========================================================================

  /**
   * Create editing basis (localized gumball) at specified position
   * @param {THREE.Vector3} position - Center position for editing basis
   */
  createEditingBasis(position) {
    // Remove existing editing basis
    this.destroyEditingBasis();

    // Create new group for editing basis
    this.state.editingBasis = new this.THREE.Group();
    this.state.editingBasis.position.copy(position);

    // Check which coordinate systems are enabled in UI
    const showCartesian = document.getElementById("showCartesianBasis").checked;
    const showQuadray = document.getElementById("showQuadray").checked;

    const totalBasisLength = 2 * Math.sqrt(2);
    const headLength = 0.3;
    const arrowLength = totalBasisLength;

    // Determine handle type based on active tool
    const isScaleMode = this.state.currentTool === "scale";
    const isRotateMode = this.state.currentTool === "rotate";

    // ========================================================================
    // QUADRAY BASIS VECTORS (WXYZ) - Tetrahedral coordinate system
    // ========================================================================
    if (showQuadray) {
      const quadrayColors = [0xffff00, 0xff0000, 0x00ff00, 0x0000ff]; // W=Y, X=R, Y=G, Z=B
      const quadrayLabels = ["W", "X", "Y", "Z"];

      this.Quadray.basisVectors.forEach((vec, i) => {
        if (isRotateMode) {
          // ROTATE MODE: Hexagonal circle perpendicular to axis
          const circleRadius = arrowLength * 0.9;
          const segments = 6; // Hexagon for WXYZ differentiation

          const curve = new this.THREE.EllipseCurve(
            0,
            0,
            circleRadius,
            circleRadius,
            0,
            2 * Math.PI,
            false,
            0
          );

          const points = curve.getPoints(segments);
          const geometry = new this.THREE.BufferGeometry().setFromPoints(
            points
          );
          const material = new this.THREE.LineBasicMaterial({
            color: quadrayColors[i],
            linewidth: 2,
            transparent: true,
            opacity: 0.8,
          });

          const rotationHandle = new this.THREE.LineLoop(geometry, material);

          // Orient circle perpendicular to the axis vector
          const defaultNormal = new this.THREE.Vector3(0, 0, 1);
          const quaternion = new this.THREE.Quaternion().setFromUnitVectors(
            defaultNormal,
            vec
          );
          rotationHandle.setRotationFromQuaternion(quaternion);

          this.state.editingBasis.add(rotationHandle);

          // Invisible torus hit zone for clicking
          const hitThickness = 0.15; // Clickable area thickness
          const hitZone = new this.THREE.Mesh(
            new this.THREE.TorusGeometry(circleRadius, hitThickness, 16, 64),
            new this.THREE.MeshBasicMaterial({
              transparent: true,
              opacity: 0, // Invisible
              depthTest: false,
            })
          );

          hitZone.setRotationFromQuaternion(quaternion);
          hitZone.userData.isGumballHandle = true;
          hitZone.userData.isRotationHandle = true;
          hitZone.userData.basisType = "quadray";
          hitZone.userData.basisIndex = i;
          hitZone.userData.axis = vec.clone();
          hitZone.userData.axisName = quadrayLabels[i];

          this.state.editingBasis.add(hitZone);
        } else {
          // MOVE/SCALE MODE: Arrow with handle at tip
          const arrow = new this.THREE.ArrowHelper(
            vec,
            new this.THREE.Vector3(0, 0, 0),
            arrowLength,
            quadrayColors[i],
            isScaleMode ? 0 : headLength,
            0.2
          );

          this.state.editingBasis.add(arrow);

          // Add handle at arrow tip - CUBE for Scale, SPHERE for Move
          const tipPosition = vec.clone().multiplyScalar(arrowLength);

          let handle;
          if (isScaleMode) {
            // SCALE MODE: Cube handle
            const cubeSize = 0.4;
            handle = new this.THREE.Mesh(
              new this.THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
              new this.THREE.MeshBasicMaterial({
                color: quadrayColors[i],
                transparent: true,
                opacity: 0.5,
              })
            );
          } else {
            // MOVE MODE: Sphere handle
            handle = new this.THREE.Mesh(
              new this.THREE.SphereGeometry(0.5, 16, 16),
              new this.THREE.MeshBasicMaterial({
                color: quadrayColors[i],
                transparent: true,
                opacity: 0.3,
              })
            );
          }

          handle.position.copy(tipPosition);
          handle.userData.isGumballHandle = true;
          handle.userData.basisType = "quadray";
          handle.userData.basisIndex = i;
          handle.userData.axis = vec.clone();
          handle.userData.axisName = quadrayLabels[i];

          this.state.editingBasis.add(handle);
        }
      });
    }

    // ========================================================================
    // CARTESIAN BASIS VECTORS (XYZ) - Standard coordinate system
    // ========================================================================
    if (showCartesian) {
      const cartesianVectors = [
        new this.THREE.Vector3(1, 0, 0), // X
        new this.THREE.Vector3(0, 1, 0), // Y
        new this.THREE.Vector3(0, 0, 1), // Z
      ];
      const cartesianColors = [0xff0000, 0x00ff00, 0x0000ff]; // R, G, B
      const cartesianLabels = ["X", "Y", "Z"];

      cartesianVectors.forEach((vec, i) => {
        if (isRotateMode) {
          // ROTATE MODE: Smooth circle perpendicular to axis
          const circleRadius = arrowLength * 0.9;
          const segments = 64; // Smooth circle for XYZ

          const curve = new this.THREE.EllipseCurve(
            0,
            0,
            circleRadius,
            circleRadius,
            0,
            2 * Math.PI,
            false,
            0
          );

          const points = curve.getPoints(segments);
          const geometry = new this.THREE.BufferGeometry().setFromPoints(
            points
          );
          const material = new this.THREE.LineBasicMaterial({
            color: cartesianColors[i],
            linewidth: 2,
            transparent: true,
            opacity: 0.8,
          });

          const rotationHandle = new this.THREE.LineLoop(geometry, material);

          // Orient circle perpendicular to the axis vector
          const defaultNormal = new this.THREE.Vector3(0, 0, 1);
          const quaternion = new this.THREE.Quaternion().setFromUnitVectors(
            defaultNormal,
            vec
          );
          rotationHandle.setRotationFromQuaternion(quaternion);

          this.state.editingBasis.add(rotationHandle);

          // Invisible torus hit zone for clicking
          const hitThickness = 0.15; // Clickable area thickness
          const hitZone = new this.THREE.Mesh(
            new this.THREE.TorusGeometry(circleRadius, hitThickness, 16, 64),
            new this.THREE.MeshBasicMaterial({
              transparent: true,
              opacity: 0, // Invisible
              depthTest: false,
            })
          );

          hitZone.setRotationFromQuaternion(quaternion);
          hitZone.userData.isGumballHandle = true;
          hitZone.userData.isRotationHandle = true;
          hitZone.userData.basisType = "cartesian";
          hitZone.userData.basisIndex = i;
          hitZone.userData.axis = vec.clone();
          hitZone.userData.axisName = cartesianLabels[i];

          this.state.editingBasis.add(hitZone);
        } else {
          // MOVE/SCALE MODE: Arrow with handle at tip
          const arrow = new this.THREE.ArrowHelper(
            vec,
            new this.THREE.Vector3(0, 0, 0),
            arrowLength,
            cartesianColors[i],
            isScaleMode ? 0 : headLength,
            0.2
          );

          this.state.editingBasis.add(arrow);

          // Add handle at arrow tip - CUBE for Scale, SPHERE for Move
          const tipPosition = vec.clone().multiplyScalar(arrowLength);

          let handle;
          if (isScaleMode) {
            // SCALE MODE: Cube handle
            const cubeSize = 0.4;
            handle = new this.THREE.Mesh(
              new this.THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
              new this.THREE.MeshBasicMaterial({
                color: cartesianColors[i],
                transparent: true,
                opacity: 0.5,
              })
            );
          } else {
            // MOVE MODE: Sphere handle
            handle = new this.THREE.Mesh(
              new this.THREE.SphereGeometry(0.5, 16, 16),
              new this.THREE.MeshBasicMaterial({
                color: cartesianColors[i],
                transparent: true,
                opacity: 0.3,
              })
            );
          }

          handle.position.copy(tipPosition);
          handle.userData.isGumballHandle = true;
          handle.userData.basisType = "cartesian";
          handle.userData.basisIndex = i;
          handle.userData.axis = vec.clone();
          handle.userData.axisName = cartesianLabels[i];

          this.state.editingBasis.add(handle);
        }
      });
    }

    // ========================================================================
    // CENTRAL SPHERE for UNIFORM SCALING (Scale mode only)
    // ========================================================================
    if (isScaleMode) {
      const centralSphere = new this.THREE.Mesh(
        new this.THREE.SphereGeometry(0.6, 32, 32),
        new this.THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.4,
        })
      );

      centralSphere.position.set(0, 0, 0); // At gumball origin
      centralSphere.userData.isGumballHandle = true;
      centralSphere.userData.basisType = "uniform";
      centralSphere.userData.basisIndex = -1; // Special index for uniform
      centralSphere.userData.axis = null; // No specific axis (uniform)
      centralSphere.userData.axisName = "UNIFORM";

      this.state.editingBasis.add(centralSphere);
    }

    // Add to scene
    this.scene.add(this.state.editingBasis);

    console.log(
      `✅ Created editing basis at position: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`
    );
  },

  /**
   * Update editing basis position (follow selected object)
   * @param {THREE.Vector3} position - New center position
   */
  updateEditingBasisPosition(position) {
    if (this.state.editingBasis) {
      this.state.editingBasis.position.copy(position);
    }
  },

  /**
   * Destroy editing basis (remove from scene)
   */
  destroyEditingBasis() {
    if (this.state.editingBasis) {
      this.scene.remove(this.state.editingBasis);
      this.state.editingBasis = null;
      console.log("✅ Editing basis destroyed");
    }
  },

  // ========================================================================
  // MOUSE EVENT HANDLERS
  // ========================================================================

  /**
   * Initialize mouse event listeners for drag operations
   */
  initEventListeners() {
    // Mouse down - start drag
    this.renderer.domElement.addEventListener(
      "mousedown",
      event => {
        this.onMouseDown(event);
      },
      { capture: true }
    );

    // Mouse move - update drag
    this.renderer.domElement.addEventListener(
      "mousemove",
      event => {
        this.onMouseMove(event);
      },
      { capture: true }
    );

    // Mouse up - end drag
    this.renderer.domElement.addEventListener(
      "mouseup",
      event => {
        this.onMouseUp(event);
      },
      { capture: true }
    );
  },

  /**
   * Handle mousedown - select gumball handle
   */
  onMouseDown(event) {
    if (
      !this.state.currentTool ||
      (this.state.currentTool !== "move" &&
        this.state.currentTool !== "scale" &&
        this.state.currentTool !== "rotate")
    )
      return;
    if (!this.state.editingBasis) return;

    // Prevent orbit controls
    event.preventDefault();
    event.stopPropagation();

    const raycaster = new this.THREE.Raycaster();
    const mouse = new this.THREE.Vector2();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, this.camera);

    // Get camera view direction for filtering edge-on rotation rings
    const cameraDirection = new this.THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Check for gumball handle hits
    const hitTargets = [];
    this.state.editingBasis.traverse(obj => {
      if (obj.userData.isGumballHandle) {
        // For rotation handles, filter out rings that are edge-on to the camera
        // (their axis is parallel to the view direction, making them nearly invisible)
        if (obj.userData.isRotationHandle && obj.userData.axis) {
          const dotProduct = Math.abs(cameraDirection.dot(obj.userData.axis));
          // If dot product > 0.85, the ring is nearly edge-on (within ~32° of parallel)
          // Skip these as they're unreliable to click in orthographic views
          if (dotProduct > 0.85) {
            return; // Skip this edge-on rotation ring
          }
        }
        hitTargets.push(obj);
      }
    });

    const intersects = raycaster.intersectObjects(hitTargets, false);

    if (intersects.length > 0) {
      const handle = intersects[0].object;
      this.state.selectedHandle = handle.userData;

      // Get selected polyhedra
      this.state.selectedPolyhedra = this.getSelectedPolyhedra();

      // Setup drag plane perpendicular to camera, containing handle axis
      const planeNormal = new this.THREE.Vector3();
      this.camera.getWorldDirection(planeNormal);

      this.state.dragPlane.setFromNormalAndCoplanarPoint(
        planeNormal,
        this.state.editingBasis.position
      );

      // Store starting point
      raycaster.ray.intersectPlane(
        this.state.dragPlane,
        this.state.dragStartPoint
      );

      this.state.isDragging = true;

      const basisType = handle.userData.basisType;
      const axisName = handle.userData.axisName;

      console.log(
        `✅ Gumball handle selected: ${basisType.toUpperCase()} ${axisName}-axis, polyhedra count: ${this.state.selectedPolyhedra.length}`
      );
    }
  },

  /**
   * Handle mousemove - update drag position (Move mode) or scale (Scale mode)
   */
  onMouseMove(event) {
    if (!this.state.isDragging) return;

    event.preventDefault();
    event.stopPropagation();

    const raycaster = new this.THREE.Raycaster();
    const mouse = new this.THREE.Vector2();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, this.camera);

    // Get current point on drag plane
    const currentPoint = new this.THREE.Vector3();
    raycaster.ray.intersectPlane(this.state.dragPlane, currentPoint);

    // Calculate movement vector
    const movementVector = new this.THREE.Vector3().subVectors(
      currentPoint,
      this.state.dragStartPoint
    );

    if (this.state.currentTool === "move") {
      // ================================================================
      // MOVE MODE: Translate along axis
      // ================================================================
      const axis = this.state.selectedHandle.axis;
      const projectedDistance = movementVector.dot(axis);

      // Apply sensitivity multiplier for easier control
      const sensitivity = 5.0;
      const constrainedMovement = axis
        .clone()
        .multiplyScalar(projectedDistance * sensitivity);

      // Move all selected polyhedra (FULL PRECISION - no snapping during drag)
      this.state.selectedPolyhedra.forEach(poly => {
        poly.position.add(constrainedMovement);
        // Snapping will be applied at mouseup based on currentSnapMode
      });

      // Update editing basis position to follow Forms
      if (this.state.selectedPolyhedra.length > 0) {
        const center = this.getSelectionCenter(this.state.selectedPolyhedra);
        this.updateEditingBasisPosition(center);
      }

      // Update coordinate displays
      if (this.state.selectedPolyhedra.length > 0) {
        this.updateCoordinateDisplays(this.state.selectedPolyhedra[0].position);
      }
    } else if (this.state.currentTool === "scale") {
      // ================================================================
      // SCALE MODE: Scale selected object (Form or Instance)
      // ================================================================
      // Project movement onto the selected axis (or radial for uniform)
      let scaleMovement;

      if (this.state.selectedHandle.basisType === "uniform") {
        // UNIFORM SCALING: Use radial distance from origin
        scaleMovement = movementVector.length();
        // Determine direction (inward vs outward)
        const direction = movementVector.dot(currentPoint.clone().normalize());
        if (direction < 0) scaleMovement = -scaleMovement;
      } else {
        // AXIS-CONSTRAINED SCALING: Project onto selected axis
        const axis = this.state.selectedHandle.axis;
        scaleMovement = movementVector.dot(axis);
      }

      // Apply sensitivity for meaningful scale changes
      const scaleSensitivity = 15.0;
      const scaleDelta = scaleMovement * scaleSensitivity;

      console.log(
        `Scale delta: ${scaleDelta.toFixed(4)}, Handle type: ${this.state.selectedHandle.basisType}`
      );

      // Scale selected polyhedra directly
      if (this.state.selectedPolyhedra.length > 0) {
        this.state.selectedPolyhedra.forEach(poly => {
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
          this.state.selectedPolyhedra.length > 0 &&
          !this.state.selectedPolyhedra[0].userData.isInstance
        ) {
          const currentScale =
            this.state.selectedPolyhedra[0].userData.currentScale;
          const cubeSlider = document.getElementById("scaleSlider");
          const tetSlider = document.getElementById("tetScaleSlider");

          if (cubeSlider && tetSlider) {
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
      }

      // NOTE: No position update needed - objects stay in place during scaling
      // Editing basis stays in place
    } else if (this.state.currentTool === "rotate") {
      // ================================================================
      // ROTATE MODE: Rotate selected object around axis
      // ================================================================
      // Calculate rotation angle from tangential movement
      const rotationSensitivity = 0.5;
      const angleRadians = movementVector.length() * rotationSensitivity;

      // Determine rotation direction based on cross product
      const toCurrentPoint = currentPoint.clone().normalize();
      const toStartPoint = this.state.dragStartPoint.clone().normalize();
      const crossProduct = new this.THREE.Vector3().crossVectors(
        toStartPoint,
        toCurrentPoint
      );
      const rotationDirection =
        crossProduct.dot(this.state.selectedHandle.axis) > 0 ? 1 : -1;

      const signedAngleRadians = angleRadians * rotationDirection;

      // ================================================================
      // FULL CIRCLE ROTATION (360°) - No spread snapping for now
      // ================================================================
      // Use the angle directly - supports full 360° rotation
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
        `🔄 Rotation: ${snappedAngleDegrees.toFixed(2)}°, Spread: ${snappedSpread.toFixed(2)}, Axis: ${this.state.selectedHandle.basisType}[${this.state.selectedHandle.basisIndex}]`
      );

      // Update rotation input fields
      const degreesInput = document.getElementById("rotationDegrees");
      const spreadInput = document.getElementById("rotationSpread");
      if (degreesInput && spreadInput) {
        degreesInput.value = snappedAngleDegrees.toFixed(2);
        spreadInput.value = snappedSpread.toFixed(2);
      }

      // Apply rotation to selected polyhedra
      if (this.state.selectedPolyhedra.length > 0) {
        this.state.selectedPolyhedra.forEach(poly => {
          // Store initial rotation if not set
          if (!poly.userData.initialRotation) {
            poly.userData.initialRotation = poly.quaternion.clone();
          }

          // Create rotation matrix from axis and angle
          const rotationMatrix = new this.THREE.Matrix4().makeRotationAxis(
            this.state.selectedHandle.axis,
            snappedAngleRadians
          );

          // Apply rotation incrementally
          poly.applyMatrix4(rotationMatrix);

          console.log(
            `✅ Rotated ${poly.userData.isInstance ? "Instance" : "Form"}: ${snappedAngleDegrees.toFixed(2)}° around ${this.state.selectedHandle.axisName}-axis`
          );
        });
      }
    }

    // Update drag start point for next frame
    this.state.dragStartPoint.copy(currentPoint);
  },

  /**
   * Handle mouseup - end drag and apply snapping
   */
  onMouseUp(event) {
    if (this.state.isDragging) {
      // Prevent orbit controls from receiving this event
      event.preventDefault();
      event.stopPropagation();

      // ====================================================================
      // ALGEBRAIC PRECISION SNAPPING
      // Apply snapping based on snap mode and handle type (active/passive)
      // ====================================================================
      if (
        this.state.currentSnapMode !== "free" &&
        this.state.selectedPolyhedra.length > 0
      ) {
        this.state.selectedPolyhedra.forEach(poly => {
          if (this.state.currentSnapMode === "xyz") {
            // XYZ Snap Mode: Snap to 0.1 Cartesian grid
            const gridSize = 0.1;
            poly.position.x = Math.round(poly.position.x / gridSize) * gridSize;
            poly.position.y = Math.round(poly.position.y / gridSize) * gridSize;
            poly.position.z = Math.round(poly.position.z / gridSize) * gridSize;
            console.log(
              `📐 XYZ snap applied: (${poly.position.x.toFixed(2)}, ${poly.position.y.toFixed(2)}, ${poly.position.z.toFixed(2)})`
            );
          } else if (this.state.currentSnapMode === "wxyz") {
            // WXYZ Snap Mode: Snap to √6/4 ≈ 0.6124 Quadray grid
            // Convert position to Quadray coordinates
            const basisVectors = this.Quadray.basisVectors;
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
            const snappedPos = this.Quadray.toCartesian(
              wxyz[0],
              wxyz[1],
              wxyz[2],
              wxyz[3],
              this.THREE
            );
            poly.position.copy(snappedPos);
            console.log(
              `📐 WXYZ snap applied: (W:${wxyz[0].toFixed(3)}, X:${wxyz[1].toFixed(3)}, Y:${wxyz[2].toFixed(3)}, Z:${wxyz[3].toFixed(3)})`
            );
          }
        });

        // Update coordinate displays after snapping
        if (this.state.selectedPolyhedra.length > 0) {
          this.updateCoordinateDisplays(
            this.state.selectedPolyhedra[0].position
          );
        }
      } else {
        console.log(
          "✨ Free mode - no snapping applied (full precision preserved)"
        );
      }

      this.state.isDragging = false;
      this.state.selectedHandle = null;
      this.state.selectedPolyhedra = [];

      console.log(
        "✅ Gumball drag ended - orbit controls remain disabled while tool active"
      );
    }
  },

  // ========================================================================
  // COORDINATE DISPLAY UPDATES
  // ========================================================================

  /**
   * Update XYZ and WXYZ coordinate input displays
   * @param {THREE.Vector3} position - Position to display
   */
  updateCoordinateDisplays(position) {
    // Update XYZ coordinates
    document.getElementById("coordX").value = position.x.toFixed(4);
    document.getElementById("coordY").value = position.y.toFixed(4);
    document.getElementById("coordZ").value = position.z.toFixed(4);

    // Convert to WXYZ and update
    const basisVectors = this.Quadray.basisVectors;
    let wxyz = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      wxyz[i] = position.dot(basisVectors[i]);
    }
    const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
    wxyz = wxyz.map(c => c - mean);

    document.getElementById("coordW").value = wxyz[0].toFixed(4);
    document.getElementById("coordX2").value = wxyz[1].toFixed(4);
    document.getElementById("coordY2").value = wxyz[2].toFixed(4);
    document.getElementById("coordZ2").value = wxyz[3].toFixed(4);
  },

  // ========================================================================
  // INSTANCE DEPOSITION (NOW BUTTON)
  // ========================================================================

  /**
   * Deposit instances from selected polyhedra
   */
  depositInstances() {
    const selected = this.getSelectedPolyhedra();

    if (selected.length === 0) {
      console.warn("⚠️ No polyhedra selected - cannot deposit instance");
      return;
    }

    selected.forEach(poly => {
      // Generate unique ID
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const instanceId = `instance_${timestamp}_${randomId}`;

      // Create instance snapshot
      const instance = {
        id: instanceId,
        timestamp: timestamp,
        position: poly.position.clone(),
        rotation: poly.rotation.clone(),
        scale: poly.scale.clone(),
        type: poly.userData.polyhedronType || "unknown",
        polyhedronGroup: poly,
      };

      this.state.depositedInstances.push(instance);
      this.state.depositedCount++;

      console.log(
        `✅ Deposited instance: ${instanceId} at position (${poly.position.x.toFixed(2)}, ${poly.position.y.toFixed(2)}, ${poly.position.z.toFixed(2)})`
      );
    });

    // Update UI counter
    document.getElementById("nowCount").textContent = this.state.depositedCount;

    console.log(`📦 Total deposited instances: ${this.state.depositedCount}`);
  },

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get currently selected polyhedra from scene
   * @returns {Array<THREE.Group>} Array of selected polyhedra groups
   *
   * TEMPORARY WORKAROUND: This function selects ALL visible polyhedra until we implement
   * proper click-to-select functionality. This allows the default hexahedron and dual
   * tetrahedron to work as move targets, replicating the behavior from when gumball
   * functions were inline in the HTML.
   *
   * TODO: Implement proper selection system:
   * - Click-to-select raycasting for individual instances
   * - Visual highlight glow for selected Forms/Instances
   * - Forms vs Instances separation (Forms at origin, Instances as deposited snapshots)
   * - StateManager integration for instance tracking
   */
  getSelectedPolyhedra() {
    const selected = [];

    // TEMPORARY: Select all visible polyhedra (blocks proper Forms/Instances workflow)
    this.scene.traverse(obj => {
      if (obj.userData && obj.userData.polyhedronType && obj.visible) {
        selected.push(obj);
      }
    });

    return selected;
  },

  /**
   * Calculate center of selection
   * @param {Array<THREE.Group>} polyhedra - Array of polyhedra
   * @returns {THREE.Vector3} Center position
   */
  getSelectionCenter(polyhedra) {
    const center = new this.THREE.Vector3();

    polyhedra.forEach(poly => {
      center.add(poly.position);
    });

    center.divideScalar(polyhedra.length);

    return center;
  },
};
