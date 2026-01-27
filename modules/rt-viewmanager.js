/**
 * rt-viewmanager.js
 * View Management System for ART Explorer
 *
 * Manages SVG export and view persistence with parametric recreation.
 * Integrates with RTPapercut for section rendering, RTFileHandler for I/O,
 * and RTStateManager for view registry persistence.
 *
 * @module RTViewManager
 * @requires THREE.js
 * @requires RTPapercut
 * @requires RTStateManager
 * @requires RTFileHandler
 */

export const RTViewManager = {
  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  config: {
    // Sheet size presets (dimensions in mm, converted to pixels at 96 DPI)
    sheetSizes: {
      A4: { width: 210, height: 297, landscape: { width: 297, height: 210 } },
      Letter: {
        width: 216,
        height: 279,
        landscape: { width: 279, height: 216 },
      },
      A3: { width: 297, height: 420, landscape: { width: 420, height: 297 } },
      // Custom is set dynamically
    },
    // Default DPI for SVG export (96 = CSS standard, 300 = print quality)
    defaultDPI: 96,
    // Conversion: mm to pixels at given DPI
    mmToPixels: (mm, dpi = 96) => (mm * dpi) / 25.4,
  },

  // ========================================================================
  // STATE
  // ========================================================================

  state: {
    // Current sheet size selection
    sheetSize: "A4",
    orientation: "landscape", // 'portrait' or 'landscape'
    customSize: { width: 1920, height: 1080 }, // pixels

    // View registry
    views: [],

    // Drawing number counters per axis type
    counters: {
      X: 0,
      Y: 0,
      Z: 0,
      QW: 0,
      QX: 0,
      QY: 0,
      QZ: 0,
      AXO: 0,
      P: 0,
    },

    // Currently active/loaded view
    activeViewId: null,

    // Sort state for table
    sortColumn: "name", // 'name' | 'axis' | 'date'
    sortDirection: "asc", // 'asc' | 'desc'
  },

  // ========================================================================
  // DEPENDENCIES (set during init)
  // ========================================================================

  _stateManager: null,
  _fileHandler: null,
  _papercut: null,
  _scene: null,
  _camera: null,
  _renderer: null,

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize ViewManager with dependencies
   * @param {Object} options - Configuration options
   * @param {Object} options.stateManager - RTStateManager instance
   * @param {Object} options.fileHandler - RTFileHandler instance
   * @param {Object} options.papercut - RTPapercut instance
   * @param {THREE.Scene} options.scene - THREE.js scene
   * @param {THREE.Camera} options.camera - THREE.js camera
   * @param {THREE.WebGLRenderer} options.renderer - THREE.js renderer
   */
  init(options) {
    const { stateManager, fileHandler, papercut, scene, camera, renderer } =
      options;

    this._stateManager = stateManager;
    this._fileHandler = fileHandler;
    this._papercut = papercut;
    this._scene = scene;
    this._camera = camera;
    this._renderer = renderer;

    // Wire up UI controls
    this._wireUpUI();

    console.log("✅ RTViewManager initialized");
  },

  /**
   * Wire up UI controls in Papercut section
   * @private
   */
  _wireUpUI() {
    // Sheet size buttons
    const sheetButtons = {
      fitA4: "A4",
      fitLetter: "Letter",
      fitA3: "A3",
      fitCustom: "Custom",
    };

    Object.entries(sheetButtons).forEach(([btnId, size]) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.disabled = false; // Enable the button
        btn.addEventListener("click", () => this.setSheetSize(size));
      }
    });

    // Save View button (saves internally, no download)
    const saveViewBtn = document.getElementById("saveViewBtn");
    if (saveViewBtn) {
      saveViewBtn.addEventListener("click", () => this.saveCurrentView());
    }

    // View name input - update placeholder on focus
    const viewNameInput = document.getElementById("viewNameInput");
    if (viewNameInput) {
      this._updateViewNamePlaceholder();
      viewNameInput.addEventListener("focus", () =>
        this._updateViewNamePlaceholder()
      );
    }

    // Sort column headers
    const sortHandlers = {
      sortByName: "name",
      sortByAxis: "axis",
      sortByDate: "date",
    };

    Object.entries(sortHandlers).forEach(([elementId, column]) => {
      const el = document.getElementById(elementId);
      if (el) {
        el.addEventListener("click", () => this.toggleSort(column));
      }
    });

    // Download Selected SVG button
    const downloadSelectedBtn = document.getElementById("downloadSelectedBtn");
    if (downloadSelectedBtn) {
      downloadSelectedBtn.addEventListener("click", () =>
        this.downloadSelectedView()
      );
    }

    // Export All button (.artview file)
    const exportAllBtn = document.getElementById("exportAllViewsBtn");
    if (exportAllBtn) {
      exportAllBtn.addEventListener("click", () => this.exportAllViews());
    }

    // Import button
    const importBtn = document.getElementById("importViewsBtn");
    if (importBtn) {
      importBtn.addEventListener("click", () => this.importViews());
    }

    // Clear All button
    const clearAllBtn = document.getElementById("clearAllViewsBtn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => this.clearAllViews());
    }

    // Initial table render
    this.renderViewsTable();
  },

  // ========================================================================
  // SHEET SIZE MANAGEMENT
  // ========================================================================

  /**
   * Set the current sheet size
   * @param {string} size - 'A4' | 'Letter' | 'A3' | 'Custom'
   */
  setSheetSize(size) {
    this.state.sheetSize = size;

    // Update button states
    ["fitA4", "fitLetter", "fitA3", "fitCustom"].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.classList.toggle(
          "active",
          btnId === `fit${size === "Custom" ? "Custom" : size}`
        );
      }
    });

    // If Custom, could prompt for dimensions (future enhancement)
    if (size === "Custom") {
      // For now, use current canvas dimensions
      if (this._renderer) {
        const canvas = this._renderer.domElement;
        this.state.customSize = {
          width: canvas.width,
          height: canvas.height,
        };
      }
    }

    console.log(`📐 Sheet size set to: ${size}`);
  },

  /**
   * Get current export dimensions in pixels
   * @returns {{width: number, height: number}}
   */
  getExportDimensions() {
    const { sheetSize, orientation, customSize } = this.state;
    const { sheetSizes, mmToPixels, defaultDPI } = this.config;

    if (sheetSize === "Custom") {
      return customSize;
    }

    const sizeData = sheetSizes[sheetSize];
    if (!sizeData) {
      console.warn(`Unknown sheet size: ${sheetSize}, using canvas dimensions`);
      return customSize;
    }

    const dims = orientation === "landscape" ? sizeData.landscape : sizeData;
    return {
      width: Math.round(mmToPixels(dims.width, defaultDPI)),
      height: Math.round(mmToPixels(dims.height, defaultDPI)),
    };
  },

  // ========================================================================
  // VIEW NAME GENERATION
  // ========================================================================

  /**
   * Detect camera axis based on viewing direction
   * @returns {string} Axis code: 'X', 'Y', 'Z', 'AXO', or 'P'
   * @private
   */
  _detectCameraAxis() {
    if (!this._camera) return "P";

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this._camera.quaternion);

    // Check alignment with cardinal axes (threshold for "looking along" axis)
    const threshold = 0.9;

    // Z axis (top/bottom view)
    if (Math.abs(forward.z) > threshold) {
      return "Z";
    }
    // Y axis (front/back view)
    if (Math.abs(forward.y) > threshold) {
      return "Y";
    }
    // X axis (left/right view)
    if (Math.abs(forward.x) > threshold) {
      return "X";
    }

    // Check for axonometric (roughly equal components)
    const absX = Math.abs(forward.x);
    const absY = Math.abs(forward.y);
    const absZ = Math.abs(forward.z);
    if (absX > 0.3 && absY > 0.3 && absZ > 0.3) {
      return "AXO";
    }

    // Default: perspective/free view
    return "P";
  },

  /**
   * Detect quadray axis from cutplane state
   * @returns {string|null} 'QW', 'QX', 'QY', 'QZ', or null if not tetrahedral
   * @private
   */
  _detectQuadrayAxis() {
    if (!this._papercut) return null;

    const state = this._papercut.state;
    if (state.cutplaneBasis !== "tetrahedral") return null;

    const axisMap = { w: "QW", x: "QX", y: "QY", z: "QZ" };
    return axisMap[state.cutplaneAxis] || null;
  },

  /**
   * Generate view name based on current camera/cutplane state
   * @returns {string} View name like 'Z1', 'QW2', 'AXO3'
   */
  generateViewName() {
    // Check cutplane basis first - if tetrahedral, use quadray axis
    const quadrayAxis = this._detectQuadrayAxis();
    const axisCode = quadrayAxis || this._detectCameraAxis();

    // Increment counter and return name
    this.state.counters[axisCode] = (this.state.counters[axisCode] || 0) + 1;
    return `${axisCode}${this.state.counters[axisCode]}`;
  },

  /**
   * Update the view name input placeholder with auto-generated name
   * @private
   */
  _updateViewNamePlaceholder() {
    const input = document.getElementById("viewNameInput");
    if (input) {
      // Preview what the next name would be (without incrementing)
      const quadrayAxis = this._detectQuadrayAxis();
      const axisCode = quadrayAxis || this._detectCameraAxis();
      const nextNum = (this.state.counters[axisCode] || 0) + 1;
      input.placeholder = `Auto: ${axisCode}${nextNum}`;
    }
  },

  // ========================================================================
  // VIEW CAPTURE
  // ========================================================================

  /**
   * Capture current scene state as a view definition
   * @param {Object} options - Capture options
   * @param {string} options.name - Optional custom name (auto-generated if omitted)
   * @param {string} options.label - Optional description
   * @returns {Object} View definition object
   */
  captureView(options = {}) {
    const name =
      options.name ||
      document.getElementById("viewNameInput")?.value ||
      this.generateViewName();
    const label = options.label || "";

    // Get camera state
    const cameraState = {
      position: {
        x: this._camera.position.x,
        y: this._camera.position.y,
        z: this._camera.position.z,
      },
      rotation: {
        x: this._camera.rotation.x,
        y: this._camera.rotation.y,
        z: this._camera.rotation.z,
      },
      zoom: this._camera.zoom || 1,
      type: this._camera.isPerspectiveCamera ? "perspective" : "orthographic",
    };

    // Get cutplane state from Papercut
    const papercutState = this._papercut?.state || {};
    const cutplaneState = {
      enabled: papercutState.cutplaneEnabled || false,
      axis: papercutState.cutplaneAxis || "z",
      basis: papercutState.cutplaneBasis || "cartesian",
      value: papercutState.cutplaneValue || 0,
      inverted: papercutState.invertCutPlane || false,
    };

    // Get render settings
    const renderState = {
      printMode: papercutState.printModeEnabled || false,
      lineWeight: papercutState.lineWeightMax || 3,
      sectionNodes: papercutState.sectionNodesEnabled || false,
      adaptiveResolution: papercutState.adaptiveNodeResolution || false,
      backfaceCulling: papercutState.backfaceCullingEnabled || true,
    };

    // Get instance references from StateManager
    const instanceRefs = this._stateManager
      ? this._stateManager.state.instances.map(inst => inst.id)
      : [];

    // Get grid visibility (would need to query grid module)
    const grids = {
      cartesian: { visible: true }, // TODO: Get actual state
      quadray: { visible: false },
    };

    // Get colors
    const colors = {
      background: papercutState.printModeEnabled
        ? "#ffffff"
        : this._scene?.background?.getHexString
          ? `#${this._scene.background.getHexString()}`
          : "#1a1a1a",
      palette: null, // Use default
    };

    // Detect axis for metadata
    const quadrayAxis = this._detectQuadrayAxis();
    const axisCode = quadrayAxis || this._detectCameraAxis();

    const view = {
      id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name,
      label: label,
      timestamp: Date.now(),
      axisCode: axisCode,
      camera: cameraState,
      cutplane: cutplaneState,
      render: renderState,
      instanceRefs: instanceRefs,
      grids: grids,
      colors: colors,
      sheetSize: this.state.sheetSize,
      svg: {
        exported: false,
        filename: null,
        width: this.getExportDimensions().width,
        height: this.getExportDimensions().height,
        data: null,
      },
    };

    return view;
  },

  // ========================================================================
  // SVG EXPORT
  // ========================================================================

  /**
   * Project 3D point to 2D screen coordinates
   * @param {THREE.Vector3} point3D - 3D world position
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @returns {{x: number, y: number}} 2D screen position
   * @private
   */
  _projectToScreen(point3D, width, height) {
    const vector = point3D.clone();
    vector.project(this._camera);

    return {
      x: (vector.x * 0.5 + 0.5) * width,
      y: (-vector.y * 0.5 + 0.5) * height, // Flip Y for SVG coordinates
    };
  },

  /**
   * Extract vector paths from RTPapercut intersection lines
   * @returns {Array} Array of path objects with SVG data
   */
  extractVectorPaths() {
    const paths = [];
    const intersectionGroup = this._papercut?._intersectionLines;

    if (!intersectionGroup) {
      console.warn("No intersection lines to extract");
      return paths;
    }

    const canvas = this._renderer.domElement;
    const width = canvas.width;
    const height = canvas.height;

    // Get line color and weight from papercut state
    const isPrintMode = this._papercut.state.printModeEnabled;
    const strokeColor = isPrintMode ? "#000000" : "#ff0000";
    const strokeWidth = this._papercut.state.lineWeightMax || 3;

    // Traverse all Line2 objects in the intersection group
    intersectionGroup.traverse(child => {
      if (!child.isLine2 || !child.geometry) return;

      const positionAttr = child.geometry.attributes.position;
      if (!positionAttr) return;

      const positions = positionAttr.array;
      const pointCount = positions.length / 3;

      if (pointCount < 2) return;

      // Build SVG path from projected points
      const projectedPoints = [];
      for (let i = 0; i < pointCount; i++) {
        const point3D = new THREE.Vector3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        );
        projectedPoints.push(this._projectToScreen(point3D, width, height));
      }

      // Check if this is a closed path (circle) - first and last points are close
      const first = projectedPoints[0];
      const last = projectedPoints[projectedPoints.length - 1];
      const isClosed =
        pointCount > 3 &&
        Math.abs(first.x - last.x) < 1 &&
        Math.abs(first.y - last.y) < 1;

      // Generate SVG path data
      let d = `M ${projectedPoints[0].x.toFixed(2)} ${projectedPoints[0].y.toFixed(2)}`;
      for (let i = 1; i < projectedPoints.length; i++) {
        d += ` L ${projectedPoints[i].x.toFixed(2)} ${projectedPoints[i].y.toFixed(2)}`;
      }
      if (isClosed) {
        d += " Z";
      }

      paths.push({
        d: d,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        fill: "none",
        isClosed: isClosed,
      });
    });

    return paths;
  },

  /**
   * Generate SVG from current view with true vector paths
   * @param {Object} options - Export options
   * @param {boolean} options.vectorMode - Use vector paths instead of raster (default: true)
   * @param {boolean} options.includeRaster - Include raster background (default: false)
   * @returns {string} SVG string
   */
  generateSVG(options = {}) {
    const { vectorMode = true, includeRaster = false } = options;
    const dims = this.getExportDimensions();
    const view = options.view || this.captureView();

    // Get canvas dimensions for projection
    const canvas = this._renderer.domElement;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate scale factors to map canvas coords to SVG dims
    const scaleX = dims.width / canvasWidth;
    const scaleY = dims.height / canvasHeight;

    // Extract vector paths if in vector mode
    let vectorContent = "";
    if (vectorMode && this._papercut?._intersectionLines) {
      const paths = this.extractVectorPaths();

      if (paths.length > 0) {
        // Scale paths to SVG dimensions
        const scaledPaths = paths.map(p => {
          // Parse and scale the path data
          const scaledD = p.d.replace(
            /([ML])\s*([\d.-]+)\s+([\d.-]+)/g,
            (match, cmd, x, y) => {
              const scaledX = (parseFloat(x) * scaleX).toFixed(2);
              const scaledY = (parseFloat(y) * scaleY).toFixed(2);
              return `${cmd} ${scaledX} ${scaledY}`;
            }
          );
          return { ...p, d: scaledD };
        });

        vectorContent = `
  <!-- Section Lines (Vector) -->
  <g id="section-lines" fill="none">
${scaledPaths.map(p => `    <path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`).join("\n")}
  </g>`;
      }
    }

    // Optional raster background
    let rasterContent = "";
    if (includeRaster || !vectorMode) {
      const dataURL = canvas.toDataURL("image/png");
      rasterContent = `
  <!-- Canvas Raster (Background) -->
  <image x="0" y="0" width="${dims.width}" height="${dims.height}"
         xlink:href="${dataURL}"
         preserveAspectRatio="xMidYMid meet"/>`;
    }

    // Build complete SVG
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${dims.width} ${dims.height}"
     width="${dims.width}"
     height="${dims.height}"
     data-art-view="${view.name}"
     data-art-version="1.0">

  <!-- Metadata for view recreation -->
  <metadata>
    <art:view xmlns:art="https://artexplorer.github.io/schema">
      <![CDATA[
${JSON.stringify(view, null, 2)}
      ]]>
    </art:view>
  </metadata>

  <!-- Background -->
  <rect width="100%" height="100%" fill="${view.colors.background}"/>
${rasterContent}${vectorContent}

  <!-- Title Block -->
  <g id="title-block" transform="translate(${dims.width - 120}, ${dims.height - 40})">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="14" fill="${view.render.printMode ? "#000000" : "#ffffff"}">
      ${view.name}
    </text>
    <text x="0" y="16" font-family="Arial, sans-serif" font-size="10" fill="${view.render.printMode ? "#666666" : "#888888"}">
      ${new Date(view.timestamp).toLocaleDateString()}
    </text>
  </g>
</svg>`;

    return svg;
  },

  /**
   * Export SVG to file download
   * @param {Object} options - Export options
   */
  exportSVG(options = {}) {
    const view = options.view || this.captureView();
    const svg = this.generateSVG({ view });
    const filename = `${view.name}.svg`;

    // Create download
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Update view with export info
    view.svg.exported = true;
    view.svg.filename = filename;

    console.log(`📄 SVG exported: ${filename}`);
    return view;
  },

  /**
   * Save current view to registry (without downloading)
   */
  saveCurrentView() {
    const input = document.getElementById("viewNameInput");
    const customName = input?.value?.trim();

    // Capture view (will use custom name if provided)
    const view = this.captureView({ name: customName || undefined });

    // Save to registry
    this.saveView(view);

    // Clear input and update placeholder for next view
    if (input) {
      input.value = "";
    }
    this._updateViewNamePlaceholder();

    console.log(`✅ View saved: ${view.name}`);
  },

  /**
   * Download the currently selected/active view as SVG
   */
  downloadSelectedView() {
    if (!this.state.activeViewId) {
      // No view selected - try to download the most recent one
      if (this.state.views.length === 0) {
        console.warn("No views to download. Save a view first.");
        return;
      }
      // Select the most recent view
      const mostRecent = this.state.views[this.state.views.length - 1];
      this.state.activeViewId = mostRecent.id;
      this.setActiveViewRow(mostRecent.id);
    }

    const view = this.state.views.find(v => v.id === this.state.activeViewId);
    if (view) {
      this.exportSVG({ view });
    }
  },

  // ========================================================================
  // VIEW REGISTRY
  // ========================================================================

  /**
   * Save view to registry
   * @param {Object} view - View definition object
   */
  saveView(view) {
    this.state.views.push(view);
    this.state.activeViewId = view.id;
    this.renderViewsTable();
    console.log(`💾 View saved: ${view.name}`);
  },

  /**
   * Load view by ID or name
   * @param {string} idOrName - View ID or name
   * @returns {boolean} Success
   */
  loadView(idOrName) {
    const view = this.state.views.find(
      v => v.id === idOrName || v.name === idOrName
    );

    if (!view) {
      console.warn(`View not found: ${idOrName}`);
      return false;
    }

    // Apply camera state
    if (view.camera && this._camera) {
      this._camera.position.set(
        view.camera.position.x,
        view.camera.position.y,
        view.camera.position.z
      );
      this._camera.rotation.set(
        view.camera.rotation.x,
        view.camera.rotation.y,
        view.camera.rotation.z
      );
      if (view.camera.zoom) {
        this._camera.zoom = view.camera.zoom;
        this._camera.updateProjectionMatrix();
      }
    }

    // Apply cutplane state
    if (view.cutplane && this._papercut) {
      const pc = this._papercut;

      // Set cutplane axis and basis
      pc.setCutplaneAxis(view.cutplane.basis, view.cutplane.axis, this._scene);

      // Set cutplane value
      pc.state.cutplaneValue = view.cutplane.value;
      const slider = document.getElementById("cutplaneSlider");
      if (slider) {
        slider.value = view.cutplane.value;
      }
      const valueDisplay = document.getElementById("cutplaneValue");
      if (valueDisplay) {
        valueDisplay.textContent = view.cutplane.value;
      }

      // Set enabled state
      pc.state.cutplaneEnabled = view.cutplane.enabled;
      const checkbox = document.getElementById("enableCutPlane");
      if (checkbox) {
        checkbox.checked = view.cutplane.enabled;
      }

      // Set inverted state
      pc.state.invertCutPlane = view.cutplane.inverted;
      const invertCheckbox = document.getElementById("invertCutPlane");
      if (invertCheckbox) {
        invertCheckbox.checked = view.cutplane.inverted;
      }

      // Update cutplane
      if (view.cutplane.enabled) {
        pc.updateCutplane(view.cutplane.value, this._scene);
      }
    }

    // Apply render settings
    if (view.render && this._papercut) {
      // Print mode
      if (view.render.printMode !== this._papercut.state.printModeEnabled) {
        this._papercut.state.printModeEnabled = view.render.printMode;
        this._papercut.togglePrintMode(this._scene);
        const printCheckbox = document.getElementById("enablePrintMode");
        if (printCheckbox) {
          printCheckbox.checked = view.render.printMode;
        }
      }

      // Section nodes
      this._papercut.state.sectionNodesEnabled = view.render.sectionNodes;
      const nodesCheckbox = document.getElementById("sectionNodes");
      if (nodesCheckbox) {
        nodesCheckbox.checked = view.render.sectionNodes;
      }
    }

    // Set active view
    this.state.activeViewId = view.id;
    this.setActiveViewRow(view.id);

    console.log(`📂 View loaded: ${view.name}`);
    return true;
  },

  /**
   * Delete view by ID or name
   * @param {string} idOrName - View ID or name
   * @returns {boolean} Success
   */
  deleteView(idOrName) {
    const index = this.state.views.findIndex(
      v => v.id === idOrName || v.name === idOrName
    );

    if (index === -1) {
      console.warn(`View not found: ${idOrName}`);
      return false;
    }

    const view = this.state.views[index];
    this.state.views.splice(index, 1);

    // Clear active if deleted
    if (this.state.activeViewId === view.id) {
      this.state.activeViewId = null;
    }

    this.renderViewsTable();
    console.log(`🗑️ View deleted: ${view.name}`);
    return true;
  },

  /**
   * Clear all views (with confirmation)
   */
  clearAllViews() {
    if (this.state.views.length === 0) {
      console.log("No views to clear");
      return;
    }

    if (
      confirm(
        `Delete all ${this.state.views.length} views? This cannot be undone.`
      )
    ) {
      this.state.views = [];
      this.state.activeViewId = null;
      // Reset counters
      Object.keys(this.state.counters).forEach(key => {
        this.state.counters[key] = 0;
      });
      this.renderViewsTable();
      this._updateViewNamePlaceholder();
      console.log("🗑️ All views cleared");
    }
  },

  /**
   * List all views
   * @returns {Array} Array of view summaries
   */
  listViews() {
    return this.state.views.map(v => ({
      id: v.id,
      name: v.name,
      axisCode: v.axisCode,
      timestamp: v.timestamp,
      label: v.label,
    }));
  },

  // ========================================================================
  // TABLE UI
  // ========================================================================

  /**
   * Render views table to DOM
   */
  renderViewsTable() {
    const tbody = document.getElementById("viewsTableBody");
    if (!tbody) return;

    // Sort views
    const sortedViews = this._getSortedViews();

    if (sortedViews.length === 0) {
      tbody.innerHTML = `
        <div class="views-empty-state" style="padding: 12px; text-align: center; color: #666; font-size: 11px;">
          No saved views. Click "Save SVG View" to capture current view.
        </div>
      `;
      return;
    }

    tbody.innerHTML = sortedViews
      .map(view => {
        const isActive = view.id === this.state.activeViewId;
        const date = new Date(view.timestamp);
        const dateStr = `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        const axisLabel =
          view.cutplane?.basis === "tetrahedral"
            ? `Tet-${view.cutplane.axis.toUpperCase()}`
            : `Cart-${view.cutplane?.axis?.toUpperCase() || "Z"}`;

        // Truncate long names and adjust font size
        const displayName = view.name.length > 12 ? view.name.substring(0, 11) + "…" : view.name;
        const fontSize = view.name.length > 8 ? "10px" : "12px";

        return `
        <div class="view-row${isActive ? " active" : ""}" data-view-id="${view.id}"
             style="display: flex; gap: 4px; padding: 4px 8px; border-bottom: 1px solid #333; align-items: center;">
          <span class="view-name" style="flex: 1 1 auto; min-width: 40px; max-width: 100px; font-weight: 500; color: #00B4FF; font-size: ${fontSize}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${view.name}">${displayName}</span>
          <span class="view-axis" style="flex: 0 0 45px; color: #888; font-size: 10px;">${axisLabel}</span>
          <span class="view-date" style="flex: 0 0 45px; color: #666; font-size: 10px;">${dateStr}</span>
          <span class="view-actions" style="flex: 0 0 60px; display: flex; gap: 4px;">
            <button class="view-load-btn" data-view-id="${view.id}" title="Load view">▶</button>
            <button class="view-export-btn" data-view-id="${view.id}" title="Export SVG">↓</button>
            <button class="view-delete-btn" data-view-id="${view.id}" title="Delete view">✕</button>
          </span>
        </div>
      `;
      })
      .join("");

    // Wire up row action buttons
    tbody.querySelectorAll(".view-load-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        this.loadView(btn.dataset.viewId);
      });
    });

    tbody.querySelectorAll(".view-export-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const view = this.state.views.find(v => v.id === btn.dataset.viewId);
        if (view) {
          this.exportSVG({ view });
        }
      });
    });

    tbody.querySelectorAll(".view-delete-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        this.deleteView(btn.dataset.viewId);
      });
    });

    // Update sort indicators
    this._updateSortIndicators();
  },

  /**
   * Get sorted views array
   * @returns {Array}
   * @private
   */
  _getSortedViews() {
    const { sortColumn, sortDirection } = this.state;
    const views = [...this.state.views];

    views.sort((a, b) => {
      let aVal, bVal;

      switch (sortColumn) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "axis":
          aVal = a.axisCode || "";
          bVal = b.axisCode || "";
          break;
        case "date":
          aVal = a.timestamp;
          bVal = b.timestamp;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return views;
  },

  /**
   * Toggle sort by column
   * @param {string} column - 'name' | 'axis' | 'date'
   */
  toggleSort(column) {
    if (this.state.sortColumn === column) {
      // Toggle direction
      this.state.sortDirection =
        this.state.sortDirection === "asc" ? "desc" : "asc";
    } else {
      // New column, default to ascending
      this.state.sortColumn = column;
      this.state.sortDirection = "asc";
    }

    this.renderViewsTable();
  },

  /**
   * Update sort indicator arrows in header
   * @private
   */
  _updateSortIndicators() {
    const headers = {
      sortByName: "name",
      sortByAxis: "axis",
      sortByDate: "date",
    };

    Object.entries(headers).forEach(([elementId, column]) => {
      const el = document.getElementById(elementId);
      if (el) {
        // Remove existing indicators
        el.classList.remove("sort-asc", "sort-desc");

        // Add indicator for active column
        if (this.state.sortColumn === column) {
          el.classList.add(
            this.state.sortDirection === "asc" ? "sort-asc" : "sort-desc"
          );
        }

        // Update text content
        const baseText = { name: "Name", axis: "Axis", date: "Date" }[column];
        if (this.state.sortColumn === column) {
          el.textContent = `${baseText} ${this.state.sortDirection === "asc" ? "▲" : "▼"}`;
        } else {
          el.textContent = baseText;
        }
      }
    });
  },

  /**
   * Highlight active view row
   * @param {string} viewId
   */
  setActiveViewRow(viewId) {
    const tbody = document.getElementById("viewsTableBody");
    if (!tbody) return;

    tbody.querySelectorAll(".view-row").forEach(row => {
      row.classList.toggle("active", row.dataset.viewId === viewId);
    });
  },

  // ========================================================================
  // FILE IMPORT/EXPORT
  // ========================================================================

  /**
   * Export all views to .artview file
   */
  exportAllViews() {
    if (this.state.views.length === 0) {
      console.log("No views to export");
      return;
    }

    const exportData = {
      format: "artexplorer-views",
      version: "1.0",
      exported: new Date().toISOString(),
      views: this.state.views,
      counters: this.state.counters,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artexplorer-views-${Date.now()}.artview`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`📦 Exported ${this.state.views.length} views`);
  },

  /**
   * Import views from file
   */
  importViews() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".artview,.json";

    input.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = event => {
        try {
          const data = JSON.parse(event.target.result);

          if (data.format !== "artexplorer-views") {
            console.warn("Unknown file format, attempting import anyway");
          }

          if (data.views && Array.isArray(data.views)) {
            // Merge views (avoid duplicates by ID)
            const existingIds = new Set(this.state.views.map(v => v.id));
            let imported = 0;

            data.views.forEach(view => {
              if (!existingIds.has(view.id)) {
                this.state.views.push(view);
                imported++;
              }
            });

            // Merge counters (take max)
            if (data.counters) {
              Object.entries(data.counters).forEach(([key, value]) => {
                this.state.counters[key] = Math.max(
                  this.state.counters[key] || 0,
                  value
                );
              });
            }

            this.renderViewsTable();
            this._updateViewNamePlaceholder();
            console.log(`📥 Imported ${imported} views`);
          }
        } catch (err) {
          console.error("Failed to import views:", err);
          alert("Failed to import views. Check console for details.");
        }
      };

      reader.readAsText(file);
    });

    input.click();
  },
};
