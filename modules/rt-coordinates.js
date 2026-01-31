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
      // Position WXYZ (Quadray)
      coordW: document.getElementById('coordW'),
      coordX2: document.getElementById('coordX2'),
      coordY2: document.getElementById('coordY2'),
      coordZ2: document.getElementById('coordZ2'),
      // Rotation XYZ (degrees)
      rotXDegrees: document.getElementById('rotXDegrees'),
      rotYDegrees: document.getElementById('rotYDegrees'),
      rotZDegrees: document.getElementById('rotZDegrees'),
      // Rotation XYZ (spread)
      rotXSpread: document.getElementById('rotXSpread'),
      rotYSpread: document.getElementById('rotYSpread'),
      rotZSpread: document.getElementById('rotZSpread'),
      // Rotation WXYZ (degrees) - Quadray rotation
      rotWDegrees: document.getElementById('rotWDegrees'),
      rotXQDegrees: document.getElementById('rotXQDegrees'),
      rotYQDegrees: document.getElementById('rotYQDegrees'),
      rotZQDegrees: document.getElementById('rotZQDegrees'),
      // Rotation WXYZ (spread)
      rotWSpread: document.getElementById('rotWSpread'),
      rotXQSpread: document.getElementById('rotXQSpread'),
      rotYQSpread: document.getElementById('rotYQSpread'),
      rotZQSpread: document.getElementById('rotZQSpread'),
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
      this.elements.coordW.value = '0.0000';
      this.elements.coordX2.value = '0.0000';
      this.elements.coordY2.value = '0.0000';
      this.elements.coordZ2.value = '0.0000';
      return;
    }

    // Update XYZ coordinates
    this.elements.coordX.value = pos.x.toFixed(4);
    this.elements.coordY.value = pos.y.toFixed(4);
    this.elements.coordZ.value = pos.z.toFixed(4);

    // Convert to WXYZ (Quadray coordinates)
    if (this.deps?.Quadray?.basisVectors) {
      const basisVectors = this.deps.Quadray.basisVectors;
      let wxyz = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) {
        wxyz[i] = pos.dot(basisVectors[i]);
      }
      // Apply zero-sum normalization
      const mean = (wxyz[0] + wxyz[1] + wxyz[2] + wxyz[3]) / 4;
      wxyz = wxyz.map(c => c - mean);

      this.elements.coordW.value = wxyz[0].toFixed(4);
      this.elements.coordX2.value = wxyz[1].toFixed(4);
      this.elements.coordY2.value = wxyz[2].toFixed(4);
      this.elements.coordZ2.value = wxyz[3].toFixed(4);
    }
  },

  /**
   * Update rotation display (Euler → degrees + spread)
   * @param {THREE.Euler} rotation - Rotation to display
   */
  updateRotationDisplay(rotation) {
    if (!this.elements?.rotXDegrees || !rotation) return;

    // Convert radians to degrees
    const radToDeg = rad => (rad * 180 / Math.PI);

    // Update XYZ rotation (degrees)
    this.elements.rotXDegrees.value = radToDeg(rotation.x).toFixed(2);
    this.elements.rotYDegrees.value = radToDeg(rotation.y).toFixed(2);
    this.elements.rotZDegrees.value = radToDeg(rotation.z).toFixed(2);

    // Update XYZ spread (sin²θ)
    if (this.elements.rotXSpread) {
      const degToSpread = deg => {
        const rad = deg * Math.PI / 180;
        return Math.pow(Math.sin(rad), 2);
      };
      this.elements.rotXSpread.value = degToSpread(radToDeg(rotation.x)).toFixed(4);
      this.elements.rotYSpread.value = degToSpread(radToDeg(rotation.y)).toFixed(4);
      this.elements.rotZSpread.value = degToSpread(radToDeg(rotation.z)).toFixed(4);
    }

    // TODO: WXYZ rotation display (Quadray rotation representation)
  },

  /**
   * Clear all coordinate displays
   */
  clearDisplay() {
    this.updatePositionDisplay(null);
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
   * @returns {Object} { position: Vector3, rotation: Euler/Quaternion }
   */
  getDisplayValues(object) {
    if (!object || !this.deps?.RTStateManager) {
      return { position: null, rotation: null };
    }

    const instanceId = object.userData?.instanceId;
    if (!instanceId) {
      // Fallback to object's current transform
      return {
        position: object.position.clone(),
        rotation: object.rotation.clone()
      };
    }

    const instance = this.deps.RTStateManager.getInstance(instanceId);
    if (!instance) {
      console.warn('⚠️ No StateManager record for object');
      return {
        position: object.position.clone(),
        rotation: object.rotation.clone()
      };
    }

    if (this.mode === 'absolute') {
      // Return world transforms from StateManager
      return {
        position: new this.deps.THREE.Vector3(
          instance.position?.x || 0,
          instance.position?.y || 0,
          instance.position?.z || 0
        ),
        rotation: instance.rotation || object.rotation.clone()
      };

    } else if (this.mode === 'relative') {
      // Relative mode: object's own centre is the origin
      // Position is always 0,0,0 (you ARE the origin)
      // Rotation/scale show how transformed from Form's identity
      // Since Forms start at identity, world rotation = local rotation
      return {
        position: new this.deps.THREE.Vector3(0, 0, 0),
        rotation: object.rotation.clone()
      };

    } else if (this.mode === 'group-centre') {
      // Return centroid position (rotation N/A for group centre display)
      const selected = this.deps.getSelectedPolyhedra?.() || [];
      const centroid = this.calculateGroupCentroid(selected);
      return {
        position: centroid || object.position.clone(),
        rotation: null
      };
    }

    return { position: null, rotation: null };
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
            if (displayValues.rotation) {
              self.updateRotationDisplay(displayValues.rotation);
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
      if (displayValues.rotation) {
        this.updateRotationDisplay(displayValues.rotation);
      }
    } else {
      this.clearDisplay();
    }
  },
};
