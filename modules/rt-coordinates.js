// ========================================================================
// RT-COORDINATES.JS - Coordinate Display System
// ========================================================================
// Manages coordinate display in footer panel with Absolute/Relative/Group Centre modes
// Uses StateManager as source of truth - display is a window into persisted state
//
// See: Geometry documents/Coordinates.md for full specification
// ========================================================================

/**
 * RTCoordinates Module
 *
 * Responsibilities:
 * - Display object transforms in footer (XYZ + WXYZ position, rotation)
 * - Support three modes: Absolute (world), Relative (local), Group Centre
 * - Read from StateManager - bi-directional input modifies stored state
 * - Cache DOM elements to avoid repeated getElementById calls
 */
export const RTCoordinates = {
  // ========================================================================
  // STATE
  // ========================================================================
  mode: 'absolute', // 'absolute' | 'relative' | 'group-centre'
  groupCentroid: null, // Calculated centroid for group-centre mode

  // DOM element cache (populated by init())
  elements: null,

  // Dependencies (injected via init())
  deps: null,

  // Callback when mode changes (for repositioning editingBasis)
  onModeChangeCallback: null,

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize the coordinate system
   * @param {Object} dependencies - External dependencies
   * @param {Object} dependencies.Quadray - Quadray module for WXYZ conversion
   * @param {Object} dependencies.RTStateManager - State manager for persistence
   * @param {Function} dependencies.getSelectedPolyhedra - Get current selection
   * @param {Object} dependencies.THREE - THREE.js library
   */
  init(dependencies) {
    this.deps = dependencies;

    // Cache all coordinate DOM elements
    this.elements = {
      // Position XYZ
      coordX: document.getElementById('coordX'),
      coordY: document.getElementById('coordY'),
      coordZ: document.getElementById('coordZ'),
      // Position QWXYZ (Quadray)
      coordQW: document.getElementById('coordQW'),
      coordQX: document.getElementById('coordQX'),
      coordQY: document.getElementById('coordQY'),
      coordQZ: document.getElementById('coordQZ'),
      // Rotation XYZ (degrees)
      rotXDegrees: document.getElementById('rotXDegrees'),
      rotYDegrees: document.getElementById('rotYDegrees'),
      rotZDegrees: document.getElementById('rotZDegrees'),
      // Rotation XYZ (spread)
      rotXSpread: document.getElementById('rotXSpread'),
      rotYSpread: document.getElementById('rotYSpread'),
      rotZSpread: document.getElementById('rotZSpread'),
      // Rotation QWXYZ (degrees) - Quadray rotation
      rotQWDegrees: document.getElementById('rotQWDegrees'),
      rotQXDegrees: document.getElementById('rotQXDegrees'),
      rotQYDegrees: document.getElementById('rotQYDegrees'),
      rotQZDegrees: document.getElementById('rotQZDegrees'),
      // Rotation QWXYZ (spread)
      rotQWSpread: document.getElementById('rotQWSpread'),
      rotQXSpread: document.getElementById('rotQXSpread'),
      rotQYSpread: document.getElementById('rotQYSpread'),
      rotQZSpread: document.getElementById('rotQZSpread'),
      // Scale (uniform)
      coordScale: document.getElementById('coordScale'),
    };

    // Verify critical elements exist
    const missing = Object.entries(this.elements)
      .filter(([key, el]) => !el)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.warn(`⚠️ RTCoordinates: Missing DOM elements: ${missing.join(', ')}`);
    }

    console.log('✅ RTCoordinates initialized');
    return this;
  },

  // ========================================================================
  // CORE DISPLAY FUNCTIONS
  // ========================================================================

  /**
   * Update position display (XYZ + auto-convert to WXYZ)
   * Replaces duplicate WXYZ conversion blocks in rt-init.js
   * @param {THREE.Vector3} pos - Position to display
   */
  updatePositionDisplay(pos) {
    if (!this.elements?.coordX) return;

    if (!pos) {
      // Clear display if no position
      this.elements.coordX.value = '0.0000';
      this.elements.coordY.value = '0.0000';
      this.elements.coordZ.value = '0.0000';
      this.elements.coordQW.value = '0.0000';
      this.elements.coordQX.value = '0.0000';
      this.elements.coordQY.value = '0.0000';
      this.elements.coordQZ.value = '0.0000';
      return;
    }

    // Update XYZ coordinates
    this.elements.coordX.value = pos.x.toFixed(4);
    this.elements.coordY.value = pos.y.toFixed(4);
    this.elements.coordZ.value = pos.z.toFixed(4);

    // Convert to QWXYZ (Quadray coordinates)
    if (this.deps?.Quadray?.basisVectors) {
      const basisVectors = this.deps.Quadray.basisVectors;
      const AXIS_INDEX = this.deps.Quadray.AXIS_INDEX;

      // Project position onto each basisVector to get raw quadray values
      let rawQuadray = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) {
        rawQuadray[i] = pos.dot(basisVectors[i]);
      }
      // Apply zero-sum normalization
      const mean = (rawQuadray[0] + rawQuadray[1] + rawQuadray[2] + rawQuadray[3]) / 4;
      rawQuadray = rawQuadray.map(c => c - mean);

      // Map basisVector indices to UI fields using AXIS_INDEX
      // AXIS_INDEX: { qw: 3, qx: 0, qy: 2, qz: 1 }
      // QW displays rawQuadray[3], QX displays rawQuadray[0], etc.
      this.elements.coordQW.value = rawQuadray[AXIS_INDEX.qw].toFixed(4);
      this.elements.coordQX.value = rawQuadray[AXIS_INDEX.qx].toFixed(4);
      this.elements.coordQY.value = rawQuadray[AXIS_INDEX.qy].toFixed(4);
      this.elements.coordQZ.value = rawQuadray[AXIS_INDEX.qz].toFixed(4);
    }
  },

  /**
   * Update rotation display (Euler → degrees + spread, and Quadray if provided)
   * @param {THREE.Euler} rotation - Euler rotation to display
   * @param {Object} quadrayRotation - Optional Quadray rotation { qw, qx, qy, qz } in degrees
   */
  updateRotationDisplay(rotation, quadrayRotation = null) {
    if (!this.elements?.rotXDegrees) return;

    // Convert radians to degrees
    const radToDeg = rad => (rad * 180 / Math.PI);
    const degToSpread = deg => {
      const rad = deg * Math.PI / 180;
      return Math.pow(Math.sin(rad), 2);
    };

    // Update XYZ rotation (degrees) - only if rotation provided
    if (rotation) {
      this.elements.rotXDegrees.value = radToDeg(rotation.x).toFixed(2);
      this.elements.rotYDegrees.value = radToDeg(rotation.y).toFixed(2);
      this.elements.rotZDegrees.value = radToDeg(rotation.z).toFixed(2);

      // Update XYZ spread (sin²θ)
      if (this.elements.rotXSpread) {
        this.elements.rotXSpread.value = degToSpread(radToDeg(rotation.x)).toFixed(4);
        this.elements.rotYSpread.value = degToSpread(radToDeg(rotation.y)).toFixed(4);
        this.elements.rotZSpread.value = degToSpread(radToDeg(rotation.z)).toFixed(4);
      }
    }

    // Update QWXYZ rotation (degrees) from stored Quadray rotation
    if (this.elements.rotQWDegrees) {
      const qw = quadrayRotation?.qw || 0;
      const qx = quadrayRotation?.qx || 0;
      const qy = quadrayRotation?.qy || 0;
      const qz = quadrayRotation?.qz || 0;

      this.elements.rotQWDegrees.value = qw.toFixed(2);
      this.elements.rotQXDegrees.value = qx.toFixed(2);
      this.elements.rotQYDegrees.value = qy.toFixed(2);
      this.elements.rotQZDegrees.value = qz.toFixed(2);

      // Update QWXYZ spread (sin²θ)
      if (this.elements.rotQWSpread) {
        this.elements.rotQWSpread.value = degToSpread(qw).toFixed(4);
        this.elements.rotQXSpread.value = degToSpread(qx).toFixed(4);
        this.elements.rotQYSpread.value = degToSpread(qy).toFixed(4);
        this.elements.rotQZSpread.value = degToSpread(qz).toFixed(4);
      }
    }
  },

  /**
   * Update scale display
   * @param {number} scale - Uniform scale value to display
   */
  updateScaleDisplay(scale) {
    if (!this.elements?.coordScale) return;

    if (scale === null || scale === undefined) {
      this.elements.coordScale.value = '1.0000';
      return;
    }

    this.elements.coordScale.value = scale.toFixed(4);
  },

  /**
   * Clear all coordinate displays
   */
  clearDisplay() {
    this.updatePositionDisplay(null);
    this.updateScaleDisplay(null);
    // TODO: Clear rotation display
  },

  // ========================================================================
  // MODE MANAGEMENT
  // ========================================================================

  /**
   * Set coordinate display mode
   * @param {string} newMode - 'absolute' | 'relative' | 'group-centre'
   * @param {Array} selectedObjects - Currently selected objects
   * @returns {boolean} True if mode was set successfully
   */
  setMode(newMode, selectedObjects = []) {
    // Validate Group Centre requires 2+ objects
    if (newMode === 'group-centre' && selectedObjects.length < 2) {
      console.warn('⚠️ Group Centre requires 2+ selected objects');
      return false;
    }

    const previousMode = this.mode;
    this.mode = newMode;

    // Calculate group centroid if switching to group-centre mode
    if (newMode === 'group-centre') {
      this.groupCentroid = this.calculateGroupCentroid(selectedObjects);
    } else {
      this.groupCentroid = null;
    }

    console.log(`📍 Coordinate mode: ${previousMode} → ${newMode}`);
    return true;
  },

  /**
   * Get current coordinate mode
   * @returns {string} Current mode
   */
  getMode() {
    return this.mode;
  },

  // ========================================================================
  // GROUP CENTRE CALCULATIONS
  // ========================================================================

  /**
   * Calculate centroid of multiple selected objects
   * @param {Array} objects - Array of THREE.Object3D
   * @returns {THREE.Vector3|null} Centroid position or null if <2 objects
   */
  calculateGroupCentroid(objects) {
    if (!objects || objects.length < 2) return null;
    if (!this.deps?.THREE) return null;

    const centroid = new this.deps.THREE.Vector3();
    objects.forEach(obj => centroid.add(obj.position));
    centroid.divideScalar(objects.length);
    return centroid;
  },

  /**
   * Get rotation center based on current mode
   * @param {THREE.Object3D} editingBasis - Current editing basis/gumball
   * @param {Array} selectedObjects - Currently selected objects
   * @returns {THREE.Vector3} Position to use as rotation pivot
   */
  getRotationCenter(editingBasis, selectedObjects) {
    if (this.mode === 'group-centre') {
      return this.calculateGroupCentroid(selectedObjects) || editingBasis?.position;
    }
    // Absolute or Relative: use editingBasis position (primary object or node)
    return editingBasis?.position || new this.deps.THREE.Vector3(0, 0, 0);
  },

  // ========================================================================
  // STATEMANAGER INTEGRATION (Phase 2)
  // ========================================================================

  /**
   * Get display values based on current mode (reads from StateManager)
   * @param {THREE.Object3D} object - Selected object
   * @returns {Object} { position: Vector3, rotation: Euler, quadrayRotation: Object, scale: number }
   */
  getDisplayValues(object) {
    if (!object || !this.deps?.RTStateManager) {
      return { position: null, rotation: null, quadrayRotation: null, scale: null };
    }

    const instanceId = object.userData?.instanceId;
    if (!instanceId) {
      // Fallback to object's current transform
      return {
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        quadrayRotation: null,
        scale: object.scale.x // Assume uniform scale
      };
    }

    const instance = this.deps.RTStateManager.getInstance(instanceId);
    if (!instance) {
      console.warn('⚠️ No StateManager record for object');
      return {
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        quadrayRotation: null,
        scale: object.scale.x
      };
    }

    if (this.mode === 'absolute') {
      // Return world transforms from StateManager
      // StateManager stores transforms in instance.transform.position/rotation/scale/quadrayRotation
      const transform = instance.transform;
      return {
        position: new this.deps.THREE.Vector3(
          transform?.position?.x || 0,
          transform?.position?.y || 0,
          transform?.position?.z || 0
        ),
        rotation: transform?.rotation
          ? new this.deps.THREE.Euler(
              transform.rotation.x || 0,
              transform.rotation.y || 0,
              transform.rotation.z || 0,
              transform.rotation.order || 'XYZ'
            )
          : object.rotation.clone(),
        // Absolute mode: show cumulative Quadray rotations from StateManager
        quadrayRotation: transform?.quadrayRotation || { qw: 0, qx: 0, qy: 0, qz: 0 },
        // Uniform scale from StateManager (assume x = y = z)
        scale: transform?.scale?.x || 1
      };

    } else if (this.mode === 'relative') {
      // Relative mode: object's own centre is the origin
      // Position is always 0,0,0 (you ARE the origin)
      // Rotation/scale show how transformed from Form's identity
      // Quadray rotation: tool mode - always show 0,0,0,0 (not cumulative)
      return {
        position: new this.deps.THREE.Vector3(0, 0, 0),
        rotation: object.rotation.clone(),
        // Relative mode: Quadray is tool mode, show zeros
        quadrayRotation: { qw: 0, qx: 0, qy: 0, qz: 0 },
        scale: object.scale.x
      };

    } else if (this.mode === 'group-centre') {
      // Return centroid position (rotation N/A for group centre display)
      const selected = this.deps.getSelectedPolyhedra?.() || [];
      const centroid = this.calculateGroupCentroid(selected);
      return {
        position: centroid || object.position.clone(),
        rotation: null,
        quadrayRotation: null,
        scale: null // Scale N/A for group centre
      };
    }

    return { position: null, rotation: null, quadrayRotation: null, scale: null };
  },

  // ========================================================================
  // INPUT HANDLERS (Phase 3)
  // ========================================================================

  /**
   * Setup bi-directional coordinate input handlers
   * Typing values in fields modifies StateManager state
   * @param {Object} callbacks - Handler callbacks
   */
  setupInputHandlers(callbacks) {
    // TODO: Move coordinate input handlers from rt-init.js
    // This will be implemented in Phase 3
    console.log('📝 RTCoordinates input handlers: TODO');
  },

  // ========================================================================
  // MODE TOGGLE UI (Phase 3)
  // ========================================================================

  /**
   * Setup mode toggle button handlers
   * Replaces the handler in rt-init.js lines 839-852
   */
  setupModeToggles() {
    const self = this;

    document.querySelectorAll('[data-coord-mode]').forEach(btn => {
      btn.addEventListener('click', function() {
        const newMode = this.dataset.coordMode;
        const selected = self.deps?.getSelectedPolyhedra?.() || [];

        if (self.setMode(newMode, selected)) {
          // Update button states
          document.querySelectorAll('[data-coord-mode]').forEach(b => {
            b.classList.remove('active');
          });
          this.classList.add('active');

          // Update display based on new mode
          if (selected.length > 0) {
            const displayValues = self.getDisplayValues(selected[0]);
            self.updatePositionDisplay(displayValues.position);
            self.updateScaleDisplay(displayValues.scale);
            if (displayValues.rotation || displayValues.quadrayRotation) {
              self.updateRotationDisplay(displayValues.rotation, displayValues.quadrayRotation);
            }
          }

          // Notify rt-init.js to reposition editingBasis if needed
          if (self.onModeChangeCallback) {
            self.onModeChangeCallback(newMode, self.groupCentroid);
          }
        }
      });
    });

    console.log('✅ RTCoordinates mode toggles bound');
  },

  // ========================================================================
  // SELECTION STATE MANAGEMENT
  // ========================================================================

  /**
   * Update Group Centre button state based on selection count
   * Called when selection changes
   * @param {number} selectionCount - Number of selected objects
   */
  updateGroupCentreButtonState(selectionCount) {
    const groupBtn = document.getElementById('coordModeGroupCentre');
    if (!groupBtn) return;

    if (selectionCount >= 2) {
      // Enable the button
      groupBtn.disabled = false;
      groupBtn.title = 'Coordinates relative to group centroid';
    } else {
      // Disable the button
      groupBtn.disabled = true;
      groupBtn.title = 'Coordinates relative to group centroid (requires 2+ selected)';

      // If Group Centre was active, switch to Absolute
      if (this.mode === 'group-centre') {
        this.setMode('absolute', []);
        document.querySelectorAll('[data-coord-mode]').forEach(b => {
          b.classList.remove('active');
        });
        document.getElementById('coordModeAbsolute')?.classList.add('active');
        console.log('📍 Group Centre disabled - switched to Absolute');
      }
    }
  },

  /**
   * Called when selection changes - update display and button states
   * @param {Array} selectedObjects - Currently selected objects
   */
  onSelectionChange(selectedObjects) {
    const count = selectedObjects?.length || 0;

    // Update Group Centre button state
    this.updateGroupCentreButtonState(count);

    // Update coordinate display
    if (count > 0) {
      const displayValues = this.getDisplayValues(selectedObjects[0]);
      this.updatePositionDisplay(displayValues.position);
      this.updateScaleDisplay(displayValues.scale);
      if (displayValues.rotation || displayValues.quadrayRotation) {
        this.updateRotationDisplay(displayValues.rotation, displayValues.quadrayRotation);
      }
    } else {
      this.clearDisplay();
    }
  },
};
