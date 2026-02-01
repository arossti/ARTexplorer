/**
 * rt-state-manager.js
 * State management for ART Gumball system
 *
 * Following TEUI/OBJECTIVE StateManager pattern for proven architecture.
 * Manages Forms (templates at origin) vs Instances (deposited snapshots).
 *
 * @module RTStateManager
 * @requires THREE.js
 */

export const RTStateManager = {
  // ========================================================================
  // FORMS REGISTRY (Templates - always at origin)
  // ========================================================================
  forms: {
    tetrahedron: { type: "tetrahedron", name: "Tetrahedron" },
    cube: { type: "cube", name: "Hexahedron" },
    octahedron: { type: "octahedron", name: "Octahedron" },
    icosahedron: { type: "icosahedron", name: "Icosahedron" },
    dodecahedron: { type: "dodecahedron", name: "Dodecahedron" },
    dualTetrahedron: { type: "dualTetrahedron", name: "Dual Tetrahedron" },
    dualIcosahedron: { type: "dualIcosahedron", name: "Dual Icosahedron" },
    cuboctahedron: { type: "cuboctahedron", name: "Cuboctahedron" },
    rhombicDodecahedron: {
      type: "rhombicDodecahedron",
      name: "Rhombic Dodecahedron",
    },
    geodesicIcosahedron: {
      type: "geodesicIcosahedron",
      name: "Geodesic Icosahedron",
    },
    geodesicTetrahedron: {
      type: "geodesicTetrahedron",
      name: "Geodesic Tetrahedron",
    },
    geodesicOctahedron: {
      type: "geodesicOctahedron",
      name: "Geodesic Octahedron",
    },
    // Matrix forms (IVM spatial arrays)
    cubeMatrix: {
      type: "cubeMatrix",
      name: "Cube Matrix",
    },
    tetMatrix: {
      type: "tetMatrix",
      name: "Tet Matrix",
    },
    octaMatrix: {
      type: "octaMatrix",
      name: "Octa Matrix",
    },
  },

  // ========================================================================
  // STATE
  // ========================================================================
  state: {
    // Active Form (currently being transformed, NOT yet deposited)
    activeForm: null,

    // Deposited Instances (all "Nows" - immutable snapshots)
    instances: [],

    // Selection state (supports multi-select)
    selection: {
      type: null, // 'form' or 'instance' (primary selection type)
      id: null, // Instance ID or null for Form (primary)
      object: null, // THREE.Object3D reference (primary)
      // Multi-select support
      objects: [], // Array of selected THREE.Object3D references
      mode: "object", // 'object' | 'vertex' | 'edge' | 'face' (for deform)
      subSelection: {
        vertices: [], // Array of selected vertex indices
        edges: [], // Array of selected edge indices
        faces: [], // Array of selected face indices
      },
    },

    // Undo/Redo stacks
    history: {
      undoStack: [],
      redoStack: [],
      maxHistory: 50,
    },

    // Counters
    depositedCount: 0,

    // Modification tracking for auto-save
    modificationCount: 0,
    lastSaveModificationCount: 0,

    // Environment settings (persisted across session)
    environment: {
      // Color palette (user customizations override defaults)
      colorPalette: null, // null means use defaults from rt-rendering.js
      // Background colors
      canvasBackground: "0x1A1A1A", // Canvas/scene background
      uiBackground: "0x2A2A2A", // UI panel background
    },
  },

  // Callbacks for external systems (e.g., file handler auto-save)
  callbacks: {
    onModification: null, // Called on each state modification
  },

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize StateManager
   */
  init() {
    console.log("✅ RTStateManager initialized");
  },

  /**
   * Register callback for state modifications
   * @param {Function} callback - Called with (modificationCount, changesSinceSave)
   */
  onModification(callback) {
    this.callbacks.onModification = callback;
  },

  /**
   * Track a state modification and trigger callback
   * @param {string} action - Type of modification (create/update/delete)
   */
  trackModification(action) {
    this.state.modificationCount++;
    const changesSinceSave =
      this.state.modificationCount - this.state.lastSaveModificationCount;

    // Trigger callback if registered
    if (this.callbacks.onModification) {
      this.callbacks.onModification(
        this.state.modificationCount,
        changesSinceSave,
        action
      );
    }
  },

  /**
   * Mark current state as saved (resets modification counter baseline)
   */
  markAsSaved() {
    this.state.lastSaveModificationCount = this.state.modificationCount;
  },

  /**
   * Get number of unsaved modifications
   * @returns {number} Changes since last save
   */
  getUnsavedChanges() {
    return this.state.modificationCount - this.state.lastSaveModificationCount;
  },

  // ========================================================================
  // INSTANCE MANAGEMENT
  // ========================================================================

  /**
   * Create Instance from polyhedron group's current transform state
   * @param {THREE.Group} polyhedronGroup - The Form to snapshot
   * @param {THREE.Scene} scene - THREE.js scene to add instance to
   * @param {Object} options - Creation options
   * @param {boolean} options.skipClone - If true, use polyhedronGroup directly without cloning
   *                                      (for freshly generated geometry during import)
   * @returns {Object} Instance metadata
   */
  createInstance(polyhedronGroup, scene, options = {}) {
    const { skipClone = false } = options;

    // Generate unique ID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const instanceId = `instance_${timestamp}_${randomId}`;

    // Determine the THREE.js object to use
    let instanceGroup;

    if (skipClone) {
      // Use the group directly (for imported/recreated geometry)
      // This avoids cloning complex nested structures that can fail
      instanceGroup = polyhedronGroup;
    } else {
      // Create lightweight clone that SHARES geometry/materials (memory efficient)
      instanceGroup = new THREE.Group();

      // Recursive function to clone entire group hierarchy
      // Needed for matrix forms which have nested group structure
      const cloneGroupHierarchy = (source, target) => {
        source.children.forEach(child => {
          if (child.isMesh) {
            // Clone geometry to prevent transform corruption
            const clonedGeometry = child.geometry.clone();

            // Clone material to prevent shared highlight state
            const clonedMaterial = child.material.clone();

            // Reset any highlight state from material
            // (instance should start unhighlighted even if form was selected)
            if (child.userData.originalEmissive) {
              // Form was highlighted - restore original emissive to cloned material
              clonedMaterial.emissive.copy(child.userData.originalEmissive);
              clonedMaterial.emissiveIntensity =
                child.userData.originalEmissiveIntensity;
            }

            const instanceMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
            instanceMesh.position.copy(child.position);
            instanceMesh.rotation.copy(child.rotation);
            instanceMesh.scale.copy(child.scale);
            instanceMesh.renderOrder = child.renderOrder;
            // Copy userData to preserve isVertexNode and other markers
            Object.assign(instanceMesh.userData, child.userData);
            target.add(instanceMesh);
          } else if (child.isLine || child.isLineSegments) {
            // Clone line geometry too
            const clonedGeometry = child.geometry.clone();

            // Clone material to prevent shared line width state
            const clonedMaterial = child.material.clone();

            // Reset any highlight line width
            if (child.userData.originalLineWidth !== undefined) {
              clonedMaterial.linewidth = child.userData.originalLineWidth;
            }

            const instanceLine = child.isLineSegments
              ? new THREE.LineSegments(clonedGeometry, clonedMaterial)
              : new THREE.Line(clonedGeometry, clonedMaterial);
            instanceLine.position.copy(child.position);
            instanceLine.rotation.copy(child.rotation);
            instanceLine.scale.copy(child.scale);
            instanceLine.renderOrder = child.renderOrder;
            // Copy userData to preserve any markers
            Object.assign(instanceLine.userData, child.userData);
            target.add(instanceLine);
          } else if (child.isGroup) {
            // Recursively clone nested groups (for matrix forms)
            const nestedGroup = new THREE.Group();
            nestedGroup.position.copy(child.position);
            nestedGroup.rotation.copy(child.rotation);
            nestedGroup.scale.copy(child.scale);
            // Copy userData to preserve any markers
            Object.assign(nestedGroup.userData, child.userData);
            cloneGroupHierarchy(child, nestedGroup);
            target.add(nestedGroup);
          }
        });
      };

      // Clone entire hierarchy
      cloneGroupHierarchy(polyhedronGroup, instanceGroup);

      // Copy current transform from Form
      instanceGroup.position.copy(polyhedronGroup.position);
      instanceGroup.rotation.copy(polyhedronGroup.rotation);
      instanceGroup.scale.copy(polyhedronGroup.scale);
    }

    // Create instance metadata
    const instance = {
      id: instanceId,
      timestamp: timestamp,
      type: polyhedronGroup.userData.type || "unknown",

      // Polyhedron-specific parameters (for geodesics, quadray, matrices)
      // These are needed to recreate the exact geometry on import
      parameters: polyhedronGroup.userData.parameters || null,

      // Transform state
      transform: {
        position: {
          x: polyhedronGroup.position.x,
          y: polyhedronGroup.position.y,
          z: polyhedronGroup.position.z,
        },
        rotation: {
          x: polyhedronGroup.rotation.x,
          y: polyhedronGroup.rotation.y,
          z: polyhedronGroup.rotation.z,
          order: polyhedronGroup.rotation.order,
        },
        scale: {
          x: polyhedronGroup.scale.x,
          y: polyhedronGroup.scale.y,
          z: polyhedronGroup.scale.z,
        },
        // Quadray rotation tracking (cumulative degrees around each tetrahedral axis)
        // Stored separately from Euler - tracks user intent for Quadray operations
        quadrayRotation: { qw: 0, qx: 0, qy: 0, qz: 0 },
      },

      // Visual properties
      appearance: {
        visible: polyhedronGroup.visible,
      },

      // Metadata
      metadata: {
        label: `${polyhedronGroup.userData.type}_${timestamp}`,
        tags: [],
        notes: "",
      },

      // THREE.js object reference (independent visual object)
      threeObject: instanceGroup,
    };

    // Tag the instance group with metadata
    instanceGroup.userData.isInstance = true;
    instanceGroup.userData.instanceId = instance.id;
    instanceGroup.userData.type = instance.type;

    // Add instance to scene
    scene.add(instanceGroup);

    // Track instance in state
    this.state.instances.push(instance);
    this.state.depositedCount++;

    // Add to undo stack
    this.addToHistory({ action: "create", instance });

    // Track modification for auto-save
    this.trackModification("create");

    console.log(
      `✅ Instance created: ${instance.id} (${instance.type}) at position (${instance.transform.position.x.toFixed(2)}, ${instance.transform.position.y.toFixed(2)}, ${instance.transform.position.z.toFixed(2)})${skipClone ? " [no clone]" : ""}`
    );

    return instance;
  },

  /**
   * Select an Instance (show editing basis + highlight)
   * @param {string} instanceId - Instance ID to select
   * @returns {Object|null} Selected instance or null
   */
  selectInstance(instanceId) {
    const instance = this.state.instances.find(i => i.id === instanceId);
    if (!instance) {
      console.warn(`⚠️ Instance not found: ${instanceId}`);
      return null;
    }

    // Update selection state (preserve multi-select structure)
    this.state.selection.type = "instance";
    this.state.selection.id = instanceId;
    this.state.selection.object = instance.threeObject;
    return instance;
  },

  // ========================================================================
  // MULTI-SELECT MANAGEMENT
  // ========================================================================

  /**
   * Add object to multi-selection
   * @param {THREE.Object3D} object - Object to add
   * @returns {boolean} True if added, false if already selected
   */
  addToSelection(object) {
    if (!object) return false;
    if (this.state.selection.objects.includes(object)) {
      return false; // Already selected
    }
    this.state.selection.objects.push(object);
    console.log(
      `✅ Added to selection: ${object.userData.type || "object"} (${this.state.selection.objects.length} selected)`
    );
    return true;
  },

  /**
   * Remove object from multi-selection
   * @param {THREE.Object3D} object - Object to remove
   * @returns {boolean} True if removed, false if not in selection
   */
  removeFromSelection(object) {
    const index = this.state.selection.objects.indexOf(object);
    if (index === -1) {
      return false; // Not in selection
    }
    this.state.selection.objects.splice(index, 1);

    // Update primary selection if removed object was primary
    if (this.state.selection.object === object) {
      if (this.state.selection.objects.length > 0) {
        // Set primary to first remaining object
        const newPrimary = this.state.selection.objects[0];
        this.state.selection.object = newPrimary;
        this.state.selection.id = newPrimary.userData.instanceId || null;
        this.state.selection.type = newPrimary.userData.isInstance
          ? "instance"
          : "form";
      } else {
        // No objects left
        this.state.selection.object = null;
        this.state.selection.id = null;
        this.state.selection.type = null;
      }
    }
    console.log(
      `✅ Removed from selection (${this.state.selection.objects.length} remaining)`
    );
    return true;
  },

  /**
   * Check if object is in multi-selection
   * @param {THREE.Object3D} object - Object to check
   * @returns {boolean} True if selected
   */
  isSelected(object) {
    return this.state.selection.objects.includes(object);
  },

  /**
   * Get all selected objects
   * @returns {Array<THREE.Object3D>} Array of selected objects
   */
  getSelectedObjects() {
    return this.state.selection.objects;
  },

  /**
   * Get selection count
   * @returns {number} Number of selected objects
   */
  getSelectionCount() {
    return this.state.selection.objects.length;
  },

  /**
   * Clear all selections
   */
  clearSelection() {
    this.state.selection.objects = [];
    this.state.selection.object = null;
    this.state.selection.id = null;
    this.state.selection.type = null;
    this.state.selection.mode = "object";
    this.state.selection.subSelection = {
      vertices: [],
      edges: [],
      faces: [],
    };
  },

  // ========================================================================
  // NODE (VERTEX) SELECTION MANAGEMENT
  // ========================================================================
  // For selecting individual vertices on polyhedra instances
  // These are the small spheres at each vertex, not entire objects

  /**
   * Enter vertex selection mode for a polyhedron
   * @param {THREE.Object3D} polyhedron - The polyhedron to select vertices on
   */
  enterVertexMode(polyhedron) {
    if (!polyhedron?.userData.isInstance) {
      console.warn("⚠️ Vertex mode only available for instances");
      return false;
    }
    this.state.selection.mode = "vertex";
    this.state.selection.object = polyhedron;
    this.state.selection.subSelection.vertices = [];
    console.log(
      `🔵 Entered vertex mode for ${polyhedron.userData.type || "polyhedron"}`
    );
    return true;
  },

  /**
   * Exit vertex selection mode
   */
  exitVertexMode() {
    this.state.selection.mode = "object";
    this.state.selection.subSelection.vertices = [];
    console.log("🔵 Exited vertex mode");
  },

  /**
   * Check if in vertex selection mode
   * @returns {boolean} True if in vertex mode
   */
  isVertexMode() {
    return this.state.selection.mode === "vertex";
  },

  /**
   * Add a vertex node to selection
   * @param {THREE.Mesh} nodeMesh - The vertex node mesh to select
   * @returns {boolean} True if added, false if already selected
   */
  selectVertex(nodeMesh) {
    if (!nodeMesh?.userData.isVertexNode) {
      console.warn("⚠️ selectVertex: Not a vertex node");
      return false;
    }
    if (this.state.selection.subSelection.vertices.includes(nodeMesh)) {
      return false; // Already selected
    }
    this.state.selection.subSelection.vertices.push(nodeMesh);
    console.log(
      `✅ Vertex selected (${this.state.selection.subSelection.vertices.length} total)`
    );
    return true;
  },

  /**
   * Remove a vertex node from selection
   * @param {THREE.Mesh} nodeMesh - The vertex node mesh to deselect
   * @returns {boolean} True if removed, false if not in selection
   */
  deselectVertex(nodeMesh) {
    const index = this.state.selection.subSelection.vertices.indexOf(nodeMesh);
    if (index === -1) {
      return false; // Not in selection
    }
    this.state.selection.subSelection.vertices.splice(index, 1);
    console.log(
      `✅ Vertex deselected (${this.state.selection.subSelection.vertices.length} remaining)`
    );
    return true;
  },

  /**
   * Check if a vertex node is selected
   * @param {THREE.Mesh} nodeMesh - The vertex node mesh to check
   * @returns {boolean} True if selected
   */
  isVertexSelected(nodeMesh) {
    return this.state.selection.subSelection.vertices.includes(nodeMesh);
  },

  /**
   * Get all selected vertex nodes
   * @returns {Array<THREE.Mesh>} Array of selected vertex node meshes
   */
  getSelectedVertices() {
    return this.state.selection.subSelection.vertices;
  },

  /**
   * Get count of selected vertices
   * @returns {number} Number of selected vertices
   */
  getSelectedVertexCount() {
    return this.state.selection.subSelection.vertices.length;
  },

  /**
   * Clear all vertex selections (but stay in vertex mode)
   */
  clearVertexSelection() {
    this.state.selection.subSelection.vertices = [];
    console.log("🔵 Vertex selection cleared");
  },

  // ========================================================================
  // POINT CONNECTION MANAGEMENT
  // ========================================================================

  /**
   * Connect two Point instances with a Line
   * Creates a new "connectedLine" instance that derives its geometry from the two Points
   * @param {string} pointA_Id - First Point instance ID
   * @param {string} pointB_Id - Second Point instance ID
   * @param {THREE.Scene} scene - Scene to add Line to
   * @returns {Object|null} Created Line instance or null on failure
   */
  connectPoints(pointA_Id, pointB_Id, scene) {
    // Get Point instances
    const pointA = this.getInstance(pointA_Id);
    const pointB = this.getInstance(pointB_Id);

    if (!pointA || !pointB) {
      console.warn("⚠️ connectPoints: One or both Point instances not found");
      return null;
    }

    // Verify both are Point type
    if (pointA.type !== "point" || pointB.type !== "point") {
      console.warn("⚠️ connectPoints: Both selections must be Point instances");
      return null;
    }

    // Get positions from Point instances
    const posA = pointA.threeObject.position;
    const posB = pointB.threeObject.position;

    // Create Line geometry between the two Points
    const geometry = new THREE.BufferGeometry().setFromPoints([
      posA.clone(),
      posB.clone(),
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0x00b4ff });
    const lineSegments = new THREE.LineSegments(geometry, material);

    // Create a Group to hold the line (consistent with other instances)
    const lineGroup = new THREE.Group();
    lineGroup.add(lineSegments);

    // Store connection references in userData
    lineGroup.userData.connections = {
      startPoint: pointA_Id,
      endPoint: pointB_Id,
    };
    lineGroup.userData.type = "connectedLine";
    lineGroup.userData.isInstance = true;

    // Generate unique ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const instanceId = `connectedLine_${timestamp}_${randomSuffix}`;
    lineGroup.userData.instanceId = instanceId;

    // Position at midpoint (for transform origin)
    const midpoint = new THREE.Vector3()
      .addVectors(posA, posB)
      .multiplyScalar(0.5);
    lineGroup.position.copy(midpoint);

    // Adjust line geometry to be relative to group position
    const relA = posA.clone().sub(midpoint);
    const relB = posB.clone().sub(midpoint);
    lineSegments.geometry.setFromPoints([relA, relB]);

    // Add to scene
    scene.add(lineGroup);

    // Create instance metadata
    const instance = {
      id: instanceId,
      timestamp: timestamp,
      type: "connectedLine",
      parameters: {
        startPoint: pointA_Id,
        endPoint: pointB_Id,
      },
      transform: {
        position: { x: midpoint.x, y: midpoint.y, z: midpoint.z },
        rotation: { x: 0, y: 0, z: 0, order: "XYZ" },
        scale: { x: 1, y: 1, z: 1 },
      },
      appearance: { visible: true },
      metadata: {
        label: `connectedLine_${timestamp}`,
        tags: [],
        notes: "",
      },
      threeObject: lineGroup,
    };

    // Add to instances array
    this.state.instances.push(instance);
    this.state.depositedCount++;

    // Add to undo stack
    this.addToHistory({ action: "create", instance });

    // Track modification
    this.trackModification("create");

    console.log(
      `✅ Connected Points: ${pointA_Id} ↔ ${pointB_Id} → ${instanceId}`
    );
    return instance;
  },

  /**
   * Disconnect a connected Line back to its component Points
   * @param {string} lineInstanceId - Connected Line instance ID
   * @param {THREE.Scene} scene - Scene to remove Line from
   * @returns {boolean} True if disconnected successfully
   */
  disconnectLine(lineInstanceId, scene) {
    const lineInstance = this.getInstance(lineInstanceId);

    if (!lineInstance) {
      console.warn("⚠️ disconnectLine: Line instance not found");
      return false;
    }

    if (lineInstance.type !== "connectedLine") {
      console.warn("⚠️ disconnectLine: Instance is not a connectedLine");
      return false;
    }

    // Simply delete the connected line - the Points remain
    this.deleteInstance(lineInstanceId, scene);

    console.log(`✅ Disconnected Line: ${lineInstanceId}`);
    return true;
  },

  /**
   * Update all connected Lines that reference a moved Point
   * Call this after any Point instance is moved
   * @param {string} movedPointId - ID of the Point that was moved
   */
  updateConnectedGeometry(movedPointId) {
    const movedPoint = this.getInstance(movedPointId);
    if (!movedPoint) return;

    // Find all connected lines referencing this point
    const connectedLines = this.state.instances.filter(
      inst =>
        inst.type === "connectedLine" &&
        (inst.parameters?.startPoint === movedPointId ||
          inst.parameters?.endPoint === movedPointId)
    );

    connectedLines.forEach(lineInstance => {
      const connections = lineInstance.parameters;
      const startPoint = this.getInstance(connections.startPoint);
      const endPoint = this.getInstance(connections.endPoint);

      if (!startPoint || !endPoint) {
        console.warn(
          `⚠️ updateConnectedGeometry: Missing endpoint for ${lineInstance.id}`
        );
        return;
      }

      const posA = startPoint.threeObject.position;
      const posB = endPoint.threeObject.position;

      // Recalculate midpoint
      const midpoint = new THREE.Vector3()
        .addVectors(posA, posB)
        .multiplyScalar(0.5);

      // Update line group position
      lineInstance.threeObject.position.copy(midpoint);
      lineInstance.transform.position = {
        x: midpoint.x,
        y: midpoint.y,
        z: midpoint.z,
      };

      // Update line geometry (relative to group position)
      const relA = posA.clone().sub(midpoint);
      const relB = posB.clone().sub(midpoint);

      // Find the LineSegments child and update its geometry
      lineInstance.threeObject.traverse(child => {
        if (child.isLineSegments || child.isLine) {
          child.geometry.setFromPoints([relA, relB]);
          child.geometry.attributes.position.needsUpdate = true;
        }
      });
    });

    if (connectedLines.length > 0) {
      console.log(
        `🔗 Updated ${connectedLines.length} connected line(s) for Point ${movedPointId}`
      );
    }
  },

  /**
   * Selective update for connected Lines - only updates lines where the OTHER endpoint wasn't moved
   * Bug 7 fix: When moving a subset of Points (e.g., opposite corners of quadrilateral),
   * lines connecting to unmoved Points need updating, but lines between two moved Points don't
   * @param {string} movedPointId - ID of the Point that was moved
   * @param {Set<string>} allMovedPointIds - Set of ALL Point IDs that were moved in this operation
   */
  updateConnectedGeometrySelective(movedPointId, allMovedPointIds) {
    const movedPoint = this.getInstance(movedPointId);
    if (!movedPoint) return;

    // Find all connected lines referencing this point
    const connectedLines = this.state.instances.filter(
      inst =>
        inst.type === "connectedLine" &&
        (inst.parameters?.startPoint === movedPointId ||
          inst.parameters?.endPoint === movedPointId)
    );

    let updatedCount = 0;
    connectedLines.forEach(lineInstance => {
      const connections = lineInstance.parameters;
      const otherPointId =
        connections.startPoint === movedPointId
          ? connections.endPoint
          : connections.startPoint;

      // Skip if the OTHER endpoint also moved - line geometry preserved by transform
      if (allMovedPointIds.has(otherPointId)) {
        return;
      }

      // Other endpoint didn't move, so we need to update this line
      const startPoint = this.getInstance(connections.startPoint);
      const endPoint = this.getInstance(connections.endPoint);

      if (!startPoint || !endPoint) {
        console.warn(
          `⚠️ updateConnectedGeometrySelective: Missing endpoint for ${lineInstance.id}`
        );
        return;
      }

      const posA = startPoint.threeObject.position;
      const posB = endPoint.threeObject.position;

      // Recalculate midpoint
      const midpoint = new THREE.Vector3()
        .addVectors(posA, posB)
        .multiplyScalar(0.5);

      // Update line group position
      lineInstance.threeObject.position.copy(midpoint);
      lineInstance.transform.position = {
        x: midpoint.x,
        y: midpoint.y,
        z: midpoint.z,
      };

      // Update line geometry (relative to group position)
      const relA = posA.clone().sub(midpoint);
      const relB = posB.clone().sub(midpoint);

      // Find the LineSegments child and update its geometry
      lineInstance.threeObject.traverse(child => {
        if (child.isLineSegments || child.isLine) {
          child.geometry.setFromPoints([relA, relB]);
          child.geometry.attributes.position.needsUpdate = true;
        }
      });

      updatedCount++;
    });
  },

  /**
   * Update Instance transform (after drag/edit)
   * @param {string} instanceId - Instance ID to update
   * @param {Object} newTransform - New transform data
   */
  updateInstance(instanceId, newTransform) {
    const instance = this.state.instances.find(i => i.id === instanceId);
    if (!instance) {
      console.warn(`⚠️ Instance not found: ${instanceId}`);
      return;
    }

    // Store old transform for undo
    const oldTransform = JSON.parse(JSON.stringify(instance.transform));

    // Apply new transform
    instance.transform = newTransform;

    // Update THREE.js object
    if (instance.threeObject) {
      instance.threeObject.position.set(
        newTransform.position.x,
        newTransform.position.y,
        newTransform.position.z
      );
      instance.threeObject.rotation.set(
        newTransform.rotation.x,
        newTransform.rotation.y,
        newTransform.rotation.z
      );
      instance.threeObject.scale.set(
        newTransform.scale.x,
        newTransform.scale.y,
        newTransform.scale.z
      );
    }

    // Add to undo stack
    this.addToHistory({
      action: "update",
      instanceId,
      oldTransform,
      newTransform,
    });

    // Track modification for auto-save
    this.trackModification("update");
  },

  /**
   * Delete Instance by ID
   * @param {string} instanceId - Instance ID to delete
   * @param {THREE.Scene} scene - THREE.js scene to remove from
   */
  deleteInstance(instanceId, scene) {
    const index = this.state.instances.findIndex(i => i.id === instanceId);
    if (index === -1) {
      console.warn(`⚠️ Instance not found: ${instanceId}`);
      return;
    }

    const instance = this.state.instances[index];

    // Remove from scene
    if (scene && instance.threeObject) {
      scene.remove(instance.threeObject);
    }

    // Remove from state
    this.state.instances.splice(index, 1);
    this.state.depositedCount--;

    // Add to undo stack
    this.addToHistory({ action: "delete", instance, index });

    // Track modification for auto-save
    this.trackModification("delete");

    console.log(`✅ Instance deleted: ${instanceId} (${instance.type})`);
  },

  /**
   * Get instance by ID
   * @param {string} instanceId - Instance ID
   * @returns {Object|null} Instance or null
   */
  getInstance(instanceId) {
    return this.state.instances.find(i => i.id === instanceId) || null;
  },

  /**
   * Get all instances
   * @returns {Array} Array of all instances
   */
  getAllInstances() {
    return this.state.instances;
  },

  /**
   * Get deposited count
   * @returns {number} Number of deposited instances
   */
  getDepositedCount() {
    return this.state.depositedCount;
  },

  // ========================================================================
  // FORM MANAGEMENT
  // ========================================================================

  /**
   * Select a Form (load at origin with editing basis)
   * @param {string} _formType - Form type (unused, kept for API consistency)
   * @param {THREE.Group} formGroup - THREE.js group for the Form
   */
  selectForm(_formType, formGroup) {
    this.state.selection = {
      type: "form",
      id: null,
      object: formGroup,
    };
  },

  /**
   * Reset Form to origin (after instance creation)
   * Resets transform AND UI sliders to defaults for consistent "fresh form" state
   * Note: DOM manipulation here is intentional - resetForm is the single point
   * for resetting form state, keeping UI sync logic centralized
   * @param {THREE.Group} formGroup - Form to reset
   */
  resetForm(formGroup) {
    formGroup.position.set(0, 0, 0);
    formGroup.rotation.set(0, 0, 0);
    formGroup.scale.set(1, 1, 1);

    const formType = formGroup.userData.type || "unknown";

    // Reset matrix sliders to 1×1 defaults
    const matrixSliderMap = {
      cubeMatrix: [
        "cubeMatrixSizeSlider",
        "cubeMatrixSizeValue",
        "cubeMatrixRotate45",
      ],
      tetMatrix: [
        "tetMatrixSizeSlider",
        "tetMatrixSizeValue",
        "tetMatrixRotate45",
      ],
      octaMatrix: [
        "octaMatrixSizeSlider",
        "octaMatrixSizeValue",
        "octaMatrixRotate45",
      ],
      cuboctaMatrix: [
        "cuboctaMatrixSizeSlider",
        "cuboctaMatrixSizeValue",
        "cuboctaMatrixRotate45",
      ],
      rhombicDodecMatrix: [
        "rhombicDodecMatrixSizeSlider",
        "rhombicDodecMatrixSizeValue",
        "rhombicDodecMatrixRotate45",
      ],
    };

    if (matrixSliderMap[formType]) {
      const [sliderId, valueId, rotateId] = matrixSliderMap[formType];
      const slider = document.getElementById(sliderId);
      const valueEl = document.getElementById(valueId);
      const rotateEl = document.getElementById(rotateId);
      if (slider) slider.value = "1";
      if (valueEl) valueEl.textContent = "1×1";
      if (rotateEl) rotateEl.checked = false;
    }
  },

  // ========================================================================
  // UNDO/REDO SYSTEM
  // ========================================================================

  /**
   * Add action to undo stack
   * @param {Object} action - Action to record
   */
  addToHistory(action) {
    // Clear redo stack (new action invalidates future)
    this.state.history.redoStack = [];

    // Add to undo stack
    this.state.history.undoStack.push(action);

    // Limit history size
    if (this.state.history.undoStack.length > this.state.history.maxHistory) {
      this.state.history.undoStack.shift();
    }
  },

  /**
   * Undo last action
   * @param {THREE.Scene} scene - THREE.js scene
   */
  undo(scene) {
    if (this.state.history.undoStack.length === 0) {
      console.warn("⚠️ Nothing to undo");
      return;
    }

    const action = this.state.history.undoStack.pop();

    switch (action.action) {
      case "create": {
        // Remove Instance
        const createIndex = this.state.instances.findIndex(
          i => i.id === action.instance.id
        );
        if (createIndex !== -1) {
          scene.remove(this.state.instances[createIndex].threeObject);
          this.state.instances.splice(createIndex, 1);
          this.state.depositedCount--;
        }
        console.log(`⏪ Undone: Create instance ${action.instance.id}`);
        break;
      }

      case "delete":
        // Re-add Instance
        this.state.instances.splice(action.index, 0, action.instance);
        scene.add(action.instance.threeObject);
        this.state.depositedCount++;
        console.log(`⏪ Undone: Delete instance ${action.instance.id}`);
        break;

      case "update":
        // Revert transform
        this.updateInstance(action.instanceId, action.oldTransform);
        console.log(`⏪ Undone: Update instance ${action.instanceId}`);
        break;
    }

    // Add to redo stack
    this.state.history.redoStack.push(action);
  },

  /**
   * Redo last undone action
   * @param {THREE.Scene} scene - THREE.js scene
   */
  redo(scene) {
    if (this.state.history.redoStack.length === 0) {
      console.warn("⚠️ Nothing to redo");
      return;
    }

    const action = this.state.history.redoStack.pop();

    switch (action.action) {
      case "create":
        // Re-add Instance
        this.state.instances.push(action.instance);
        scene.add(action.instance.threeObject);
        this.state.depositedCount++;
        console.log(`⏩ Redone: Create instance ${action.instance.id}`);
        break;

      case "delete": {
        // Remove Instance again
        const deleteIndex = this.state.instances.findIndex(
          i => i.id === action.instance.id
        );
        if (deleteIndex !== -1) {
          scene.remove(this.state.instances[deleteIndex].threeObject);
          this.state.instances.splice(deleteIndex, 1);
          this.state.depositedCount--;
        }
        console.log(`⏩ Redone: Delete instance ${action.instance.id}`);
        break;
      }

      case "update":
        // Re-apply new transform
        this.updateInstance(action.instanceId, action.newTransform);
        console.log(`⏩ Redone: Update instance ${action.instanceId}`);
        break;
    }

    // Add back to undo stack
    this.state.history.undoStack.push(action);
  },

  // ========================================================================
  // ENVIRONMENT SETTINGS
  // ========================================================================

  /**
   * Set custom color palette (user overrides)
   * @param {Object} colorPalette - Color palette object
   */
  setColorPalette(colorPalette) {
    this.state.environment.colorPalette = colorPalette;
    this.trackModification("updateEnvironment");
    console.log("✅ Color palette updated in StateManager");
  },

  /**
   * Get custom color palette (or null if using defaults)
   * @returns {Object|null} Color palette or null
   */
  getColorPalette() {
    return this.state.environment.colorPalette;
  },

  /**
   * Clear custom color palette (revert to defaults)
   */
  clearColorPalette() {
    this.state.environment.colorPalette = null;
    this.trackModification("updateEnvironment");
    console.log("✅ Color palette cleared (reverted to defaults)");
  },

  /**
   * Set environment backgrounds
   * @param {string} canvasBackground - Canvas background color (0xRRGGBB format)
   * @param {string} uiBackground - UI background color (0xRRGGBB format)
   */
  setEnvironmentBackgrounds(canvasBackground, uiBackground) {
    if (canvasBackground) {
      this.state.environment.canvasBackground = canvasBackground;
    }
    if (uiBackground) {
      this.state.environment.uiBackground = uiBackground;
    }
    this.trackModification("updateEnvironment");
  },

  /**
   * Get environment backgrounds
   * @returns {Object} {canvasBackground, uiBackground}
   */
  getEnvironmentBackgrounds() {
    return {
      canvasBackground: this.state.environment.canvasBackground,
      uiBackground: this.state.environment.uiBackground,
    };
  },

  // ========================================================================
  // EXPORT/IMPORT (Future)
  // ========================================================================

  /**
   * Export session to JSON
   * @returns {string} JSON string of all instances
   */
  exportJSON() {
    const exportData = {
      version: "1.0",
      timestamp: Date.now(),
      count: this.state.instances.length,
      environment: {
        colorPalette: this.state.environment.colorPalette, // Include custom colors
        canvasBackground: this.state.environment.canvasBackground,
        uiBackground: this.state.environment.uiBackground,
      },
      instances: this.state.instances.map(instance => ({
        id: instance.id,
        timestamp: instance.timestamp,
        type: instance.type,
        parameters: instance.parameters, // Geodesic/Quadray/Matrix params
        transform: instance.transform,
        appearance: instance.appearance,
        metadata: instance.metadata,
        // Note: threeObject is NOT exported (not serializable)
      })),
    };

    return JSON.stringify(exportData, null, 2);
  },

  /**
   * Export instances to CSV
   * @returns {string} CSV string of instance data
   */
  exportCSV() {
    const headers = [
      "id",
      "timestamp",
      "type",
      "posX",
      "posY",
      "posZ",
      "rotX",
      "rotY",
      "rotZ",
      "scaleX",
      "scaleY",
      "scaleZ",
      "label",
    ];

    const rows = this.state.instances.map(instance => [
      instance.id,
      instance.timestamp,
      instance.type,
      instance.transform.position.x.toFixed(4),
      instance.transform.position.y.toFixed(4),
      instance.transform.position.z.toFixed(4),
      instance.transform.rotation.x.toFixed(4),
      instance.transform.rotation.y.toFixed(4),
      instance.transform.rotation.z.toFixed(4),
      instance.transform.scale.x.toFixed(4),
      instance.transform.scale.y.toFixed(4),
      instance.transform.scale.z.toFixed(4),
      instance.metadata.label,
    ]);

    return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
  },

  /**
   * Clear all instances
   * @param {THREE.Scene} scene - THREE.js scene
   */
  clearAll(scene) {
    // Remove all instances from scene
    this.state.instances.forEach(instance => {
      if (scene && instance.threeObject) {
        scene.remove(instance.threeObject);
      }
    });

    // Clear state
    this.state.instances = [];
    this.state.depositedCount = 0;
    this.state.history.undoStack = [];
    this.state.history.redoStack = [];

    console.log("🗑️  All instances cleared");
  },

  // ========================================================================
  // SELECTION-BASED CONNECT/DISCONNECT (Convenience Methods)
  // ========================================================================
  // These methods encapsulate validation logic that was previously in rt-init.js

  /**
   * Connect selected Point instances with Lines
   * - 2 Points: Creates 1 line (A↔B)
   * - 3 Points: Creates 3 lines forming a triangle (A↔B, B↔C, C↔A)
   * Validates selection before calling connectPoints()
   * @param {THREE.Scene} scene - Scene to add Line(s) to
   * @returns {Object|Object[]|null} Created Line instance(s), or null on validation failure
   */
  connectFromSelection(scene) {
    const selected = this.getSelectedObjects();

    // Validate selection count (2 or 3 points)
    if (selected.length < 2 || selected.length > 3) {
      console.warn("⚠️ Connect requires 2 or 3 selected Points");
      return null;
    }

    // Get instance IDs and validate all are deposited Points
    const pointIds = [];
    for (const obj of selected) {
      const id = obj.userData.instanceId;
      if (!id) {
        console.warn("⚠️ Connect requires deposited Point instances");
        return null;
      }
      const inst = this.getInstance(id);
      if (!inst || inst.type !== "point") {
        console.warn("⚠️ Connect requires Point instances (not other types)");
        return null;
      }
      pointIds.push(id);
    }

    // 2 Points: single line
    if (pointIds.length === 2) {
      return this.connectPoints(pointIds[0], pointIds[1], scene);
    }

    // 3 Points: triangle (3 lines)
    const lines = [];
    const lineAB = this.connectPoints(pointIds[0], pointIds[1], scene);
    if (lineAB) lines.push(lineAB);
    const lineBC = this.connectPoints(pointIds[1], pointIds[2], scene);
    if (lineBC) lines.push(lineBC);
    const lineCA = this.connectPoints(pointIds[2], pointIds[0], scene);
    if (lineCA) lines.push(lineCA);

    console.log(`✅ Created triangle from 3 Points (${lines.length} lines)`);
    return lines.length > 0 ? lines : null;
  },

  /**
   * Disconnect the selected connected Line back to its component Points
   * Validates selection before calling disconnectLine()
   * @param {THREE.Scene} scene - Scene to remove Line from
   * @returns {boolean} True if disconnected successfully, false on validation failure
   */
  disconnectFromSelection(scene) {
    const selected = this.getSelectedObjects();

    // Validate selection count
    if (selected.length !== 1) {
      console.warn("⚠️ Disconnect requires exactly 1 selected connectedLine");
      return false;
    }

    const lineObj = selected[0];
    const lineId = lineObj.userData.instanceId;

    if (!lineId) {
      console.warn("⚠️ Disconnect requires a deposited connectedLine instance");
      return false;
    }

    const inst = this.getInstance(lineId);
    if (!inst || inst.type !== "connectedLine") {
      console.warn("⚠️ Disconnect only works on connectedLine instances");
      return false;
    }

    // Delegate to existing disconnectLine method
    return this.disconnectLine(lineId, scene);
  },
};
