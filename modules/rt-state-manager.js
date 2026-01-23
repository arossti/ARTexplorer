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

    // Selection state
    selection: {
      type: null, // 'form' or 'instance'
      id: null, // Instance ID or null for Form
      object: null, // THREE.Object3D reference
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
   * @returns {Object} Instance metadata
   */
  createInstance(polyhedronGroup, scene) {
    // Generate unique ID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const instanceId = `instance_${timestamp}_${randomId}`;

    // Create lightweight clone that SHARES geometry/materials (memory efficient)
    const clonedGroup = new THREE.Group();

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
    cloneGroupHierarchy(polyhedronGroup, clonedGroup);

    // Copy current transform from Form
    clonedGroup.position.copy(polyhedronGroup.position);
    clonedGroup.rotation.copy(polyhedronGroup.rotation);
    clonedGroup.scale.copy(polyhedronGroup.scale);

    // Create instance metadata
    const instance = {
      id: instanceId,
      timestamp: timestamp,
      type: polyhedronGroup.userData.type || "unknown",

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
      threeObject: clonedGroup,
    };

    // Tag the clone with instance metadata
    clonedGroup.userData.isInstance = true;
    clonedGroup.userData.instanceId = instance.id;
    clonedGroup.userData.type = instance.type;

    // Add cloned instance to scene
    scene.add(clonedGroup);

    // Track instance in state
    this.state.instances.push(instance);
    this.state.depositedCount++;

    // Add to undo stack
    this.addToHistory({ action: "create", instance });

    // Track modification for auto-save
    this.trackModification("create");

    console.log(
      `✅ Instance created: ${instance.id} (${instance.type}) at position (${instance.transform.position.x.toFixed(2)}, ${instance.transform.position.y.toFixed(2)}, ${instance.transform.position.z.toFixed(2)})`
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

    // Update selection state
    this.state.selection = {
      type: "instance",
      id: instanceId,
      object: instance.threeObject,
    };

    console.log(`✅ Instance selected: ${instanceId} (${instance.type})`);
    return instance;
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

    console.log(`✅ Instance updated: ${instanceId}`);
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
   * @param {string} formType - Form type to select
   * @param {THREE.Group} formGroup - THREE.js group for the Form
   */
  selectForm(formType, formGroup) {
    this.state.selection = {
      type: "form",
      id: null,
      object: formGroup,
    };

    console.log(`✅ Form selected: ${formType}`);
  },

  /**
   * Reset Form to origin (after instance creation)
   * @param {THREE.Group} formGroup - Form to reset
   */
  resetForm(formGroup) {
    formGroup.position.set(0, 0, 0);
    formGroup.rotation.set(0, 0, 0);
    formGroup.scale.set(1, 1, 1);

    const formType = formGroup.userData.type || "unknown";

    // Reset matrix-specific properties to defaults
    if (formType === "cubeMatrix") {
      const sizeSlider = document.getElementById("cubeMatrixSizeSlider");
      const rotateCheckbox = document.getElementById("cubeMatrixRotate45");
      if (sizeSlider) {
        sizeSlider.value = "1";
        document.getElementById("cubeMatrixSizeValue").textContent = "1×1";
      }
      if (rotateCheckbox) rotateCheckbox.checked = false;
    } else if (formType === "tetMatrix") {
      const sizeSlider = document.getElementById("tetMatrixSizeSlider");
      const rotateCheckbox = document.getElementById("tetMatrixRotate45");
      if (sizeSlider) {
        sizeSlider.value = "1";
        document.getElementById("tetMatrixSizeValue").textContent = "1×1";
      }
      if (rotateCheckbox) rotateCheckbox.checked = false;
    } else if (formType === "octaMatrix") {
      const sizeSlider = document.getElementById("octaMatrixSizeSlider");
      const rotateCheckbox = document.getElementById("octaMatrixRotate45");
      if (sizeSlider) {
        sizeSlider.value = "1";
        document.getElementById("octaMatrixSizeValue").textContent = "1×1";
      }
      if (rotateCheckbox) rotateCheckbox.checked = false;
    }

    console.log(`↩️  Form reset to origin: ${formType}`);
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
      },
      instances: this.state.instances.map(instance => ({
        id: instance.id,
        timestamp: instance.timestamp,
        type: instance.type,
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
};
