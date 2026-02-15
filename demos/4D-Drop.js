/**
 * 4D-Drop.js
 * 4D± Gravity + Inversion Demo for ARTexplorer
 *
 * Extends the 2D Gravity Numberline concept into 3D/4D Quadray space.
 * Four geodesic icosahedron nodes fall along the four Quadray basis vectors
 * through a gravity-spherical (Polar great circles) grid, collide at the
 * origin (Janus Singularity), invert into negative Quadray space, and
 * oscillate continuously.
 *
 * Follows the in-scene floating panel pattern (rt-rotor-demo.js).
 *
 * @requires THREE.js
 * @requires rt-math.js (RT.Gravity, Quadray)
 * @requires rt-nodes.js (getCachedNodeGeometry)
 * @requires rt-janus.js (createJanusFlash)
 */

import { RT, Quadray } from "../modules/rt-math.js";
import { Polyhedra } from "../modules/rt-polyhedra.js";
import { createJanusFlash, animateBackgroundColor } from "../modules/rt-janus.js";

// Animation phases
const PHASES = ["pos_to_origin", "origin_to_neg", "neg_to_origin", "origin_to_pos"];

// Node colors matching Quadray axis conventions
const AXIS_COLORS = [
  0xff4444, // QX (A axis) — Red
  0x44cc44, // QZ (B axis) — Green
  0x4488ff, // QY (C axis) — Blue
  0xffcc00, // QW (D axis) — Yellow
];

// Quadray axis labels (ordered by basisVectors index: A=0, B=1, C=2, D=3)
const AXIS_LABELS = ["QX", "QZ", "QY", "QW"];

const BODY_HALF_SIZE = 1.0; // halfSize for polyhedra bodies (standard scale)

/**
 * Drop4DDemo - 4D± Gravity + Inversion controller
 */
class Drop4DDemo {
  constructor(scene, THREE, camera, controls) {
    this.scene = scene;
    this.THREE = THREE;
    this.camera = camera;
    this.controls = controls;
    this.enabled = false;

    // Demo objects
    this.demoGroup = null;
    this.nodeMeshes = []; // 4 node meshes, one per Quadray axis

    // UI
    this.infoPanel = null;

    // Saved scene state
    this.savedSceneState = null;

    // Physics state
    this.selectedBody = "earth";
    this.extent = 0; // outermost shell radius

    // Body shape: "tetrahedron" or "icosahedron"
    this.bodyShape = "tetrahedron";

    // Dimensional state tracking for background inversion
    this.inNegativeSpace = false;

    // Animation state
    this.isAnimating = false;
    this.animationId = null;
    this.phaseIndex = 0;
    this.phaseStartTime = null;
  }

  // ========================================================================
  // SCENE STATE SAVE / RESTORE
  // ========================================================================

  saveSceneState() {
    // Save quadray mode button state
    const activeQuadrayMode =
      document.querySelector('[data-quadray-mode].active')?.getAttribute("data-quadray-mode") || "uniform";

    this.savedSceneState = {
      showCube: document.getElementById("showCube")?.checked,
      showDualTetrahedron: document.getElementById("showDualTetrahedron")?.checked,
      showCartesianBasis: document.getElementById("showCartesianBasis")?.checked,
      showQuadray: document.getElementById("showQuadray")?.checked,
      showCartesianGrid: document.getElementById("showCartesianGrid")?.checked,
      planeIvmWX: document.getElementById("planeIvmWX")?.checked,
      planeIvmWY: document.getElementById("planeIvmWY")?.checked,
      planeIvmWZ: document.getElementById("planeIvmWZ")?.checked,
      planeIvmXY: document.getElementById("planeIvmXY")?.checked,
      planeIvmXZ: document.getElementById("planeIvmXZ")?.checked,
      planeIvmYZ: document.getElementById("planeIvmYZ")?.checked,
      quadrayTessSlider: document.getElementById("quadrayTessSlider")?.value,
      quadrayMode: activeQuadrayMode,
    };
    console.log("📦 4D Drop: Saved scene state");
  }

  restoreSceneState() {
    if (!this.savedSceneState) return;
    const state = this.savedSceneState;

    const restore = (id, value) => {
      const el = document.getElementById(id);
      if (el && value !== undefined) {
        if (el.type === "checkbox") {
          el.checked = value;
        } else {
          el.value = value;
        }
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    restore("showCube", state.showCube);
    restore("showDualTetrahedron", state.showDualTetrahedron);
    restore("showCartesianBasis", state.showCartesianBasis);
    restore("showQuadray", state.showQuadray);
    restore("showCartesianGrid", state.showCartesianGrid);
    restore("planeIvmWX", state.planeIvmWX);
    restore("planeIvmWY", state.planeIvmWY);
    restore("planeIvmWZ", state.planeIvmWZ);
    restore("planeIvmXY", state.planeIvmXY);
    restore("planeIvmXZ", state.planeIvmXZ);
    restore("planeIvmYZ", state.planeIvmYZ);

    // Restore tessellation slider
    const slider = document.getElementById("quadrayTessSlider");
    if (slider && state.quadrayTessSlider) {
      slider.value = state.quadrayTessSlider;
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Restore quadray grid mode
    if (state.quadrayMode) {
      const btn = document.querySelector(`[data-quadray-mode="${state.quadrayMode}"]`);
      if (btn) btn.click();
    }

    console.log("📦 4D Drop: Restored scene state");
    this.savedSceneState = null;
  }

  // ========================================================================
  // SCENE CONFIGURATION
  // ========================================================================

  configureSceneForDemo() {
    const setCheckbox = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    // Hide distractions
    setCheckbox("showCube", false);
    setCheckbox("showDualTetrahedron", false);
    setCheckbox("showCartesianBasis", false);
    setCheckbox("showCartesianGrid", false);

    // Show Quadray basis vectors
    setCheckbox("showQuadray", true);

    // Enable all 6 IVM face plane checkboxes
    setCheckbox("planeIvmWX", true);
    setCheckbox("planeIvmWY", true);
    setCheckbox("planeIvmWZ", true);
    setCheckbox("planeIvmXY", true);
    setCheckbox("planeIvmXZ", true);
    setCheckbox("planeIvmYZ", true);

    // Set tessellation to 144
    const slider = document.getElementById("quadrayTessSlider");
    if (slider) {
      slider.value = "144";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Switch to gravity-spherical (Polar) mode
    const polarBtn = document.querySelector('[data-quadray-mode="gravity-spherical"]');
    if (polarBtn) polarBtn.click();

    console.log("🎬 4D Drop: Configured scene (Polar 144, all planes)");
  }

  // ========================================================================
  // PHYSICS
  // ========================================================================

  getG() {
    const body = RT.Gravity.BODIES[this.selectedBody];
    return body.surfaceG || RT.Gravity.g_standard;
  }

  getH() {
    if (this.selectedBody === "blackhole") {
      const g = this.getG();
      const T_target = 5.0;
      return 0.5 * g * T_target * T_target;
    }
    return 144;
  }

  getTotalTime() {
    return Math.sqrt((2 * this.getH()) / this.getG());
  }

  computeExtent() {
    // Outermost shell radius from gravity cumulative distances
    // 144 divisions, halfExtent = 72 (matches grid computation)
    const cumDist = RT.Gravity.computeGravityCumulativeDistances(144, 72);
    this.extent = cumDist[144]; // outermost circle radius
  }

  // ========================================================================
  // DEMO OBJECTS
  // ========================================================================

  /**
   * Build a THREE.BufferGeometry from Polyhedra output {vertices, faces}
   */
  buildGeometry(polyData) {
    const THREE = this.THREE;
    const positions = [];
    const indices = [];

    polyData.vertices.forEach(v => positions.push(v.x, v.y, v.z));
    polyData.faces.forEach(faceIndices => {
      for (let i = 1; i < faceIndices.length - 1; i++) {
        indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  /**
   * Get geometry for current body shape
   */
  getBodyGeometry() {
    if (this.bodyShape === "icosahedron") {
      return this.buildGeometry(
        Polyhedra.geodesicIcosahedron(BODY_HALF_SIZE, 3, "out")
      );
    }
    return this.buildGeometry(
      Polyhedra.tetrahedron(BODY_HALF_SIZE, { silent: true })
    );
  }

  createDemoObjects() {
    const THREE = this.THREE;

    // Ensure Quadray basis vectors are initialized
    if (!Quadray.basisVectors) {
      Quadray.init(THREE);
    }

    this.computeExtent();

    this.demoGroup = new THREE.Group();
    this.demoGroup.name = "Drop4DDemo";

    const bodyGeometry = this.getBodyGeometry();

    // Create 4 body meshes at outermost extent of each Quadray axis
    for (let i = 0; i < 4; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: AXIS_COLORS[i],
        emissive: AXIS_COLORS[i],
        emissiveIntensity: 0.3,
        flatShading: true,
        side: THREE.FrontSide,
      });

      const mesh = new THREE.Mesh(bodyGeometry, material);
      const basisDir = Quadray.basisVectors[i].clone();
      mesh.position.copy(basisDir.multiplyScalar(this.extent));
      mesh.userData = { axisIndex: i, axisLabel: AXIS_LABELS[i] };

      this.demoGroup.add(mesh);
      this.nodeMeshes.push(mesh);
    }

    this.scene.add(this.demoGroup);
    const shapeName = this.bodyShape === "icosahedron" ? "3F Geodesic Icosahedra" : "Tetrahedra";
    console.log(`🔵 4D Drop: Created 4 ${shapeName} at extent=${this.extent.toFixed(3)}`);
  }

  removeDemoObjects() {
    if (this.demoGroup) {
      // Dispose geometry and materials
      this.nodeMeshes.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
      this.scene.remove(this.demoGroup);
      this.demoGroup = null;
      this.nodeMeshes = [];
    }
  }

  /**
   * Switch body shape and rebuild meshes in place
   */
  setBodyShape(shape) {
    if (shape === this.bodyShape) return;
    this.bodyShape = shape;

    if (!this.demoGroup || this.nodeMeshes.length === 0) return;

    const newGeometry = this.getBodyGeometry();

    // Replace geometry on each existing mesh (preserves positions/materials)
    this.nodeMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      mesh.geometry = newGeometry;
    });

    // Update shape buttons
    const tetraBtn = document.getElementById("d4d-shape-tetra");
    const icoBtn = document.getElementById("d4d-shape-ico");
    if (tetraBtn && icoBtn) {
      if (shape === "tetrahedron") {
        tetraBtn.style.background = "#353";
        tetraBtn.style.borderColor = "#8f8";
        icoBtn.style.background = "#333";
        icoBtn.style.borderColor = "#0ff";
      } else {
        icoBtn.style.background = "#353";
        icoBtn.style.borderColor = "#8f8";
        tetraBtn.style.background = "#333";
        tetraBtn.style.borderColor = "#0ff";
      }
    }

    const shapeName = shape === "icosahedron" ? "3F Geodesic Icosahedra" : "Tetrahedra";
    console.log(`🔵 4D Drop: Switched to ${shapeName}`);
  }

  // ========================================================================
  // INFO PANEL
  // ========================================================================

  createInfoPanel() {
    if (document.getElementById("drop4d-info-panel")) {
      this.infoPanel = document.getElementById("drop4d-info-panel");
      this.infoPanel.style.display = "block";
      return;
    }

    const panel = document.createElement("div");
    panel.id = "drop4d-info-panel";
    panel.innerHTML = `
      <style>
        #drop4d-info-panel {
          position: fixed;
          top: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          padding: 15px;
          border-radius: 8px;
          min-width: 260px;
          max-width: 280px;
          z-index: 1000;
          border: 1px solid #444;
        }
        #drop4d-info-panel .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid #444;
          padding-bottom: 5px;
          cursor: move;
          user-select: none;
        }
        #drop4d-info-panel .header:hover {
          background: rgba(255, 255, 255, 0.05);
          margin: -5px -5px 10px -5px;
          padding: 5px 5px 10px 5px;
          border-radius: 4px 4px 0 0;
        }
        #drop4d-info-panel .header h3 {
          margin: 0;
          color: #0ff;
          font-size: 13px;
        }
        #drop4d-info-panel .header h3::before {
          content: '\u22EE\u22EE ';
          color: #666;
          margin-right: 4px;
        }
        #drop4d-info-panel .close-btn {
          background: #f44;
          color: #fff;
          border: none;
          border-radius: 3px;
          width: 20px;
          height: 20px;
          padding: 0;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
          line-height: 20px;
          text-align: center;
          flex-shrink: 0;
        }
        #drop4d-info-panel .close-btn:hover { background: #f66; }
        #drop4d-info-panel .section {
          margin-bottom: 10px;
        }
        #drop4d-info-panel .section-title {
          color: #888;
          font-size: 10px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        #drop4d-info-panel .row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        #drop4d-info-panel .label { color: #888; }
        #drop4d-info-panel .value { color: #0f0; font-weight: bold; }
        #drop4d-info-panel .controls {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }
        #drop4d-info-panel .ctrl-btn {
          flex: 1;
          background: #333;
          color: #0ff;
          border: 1px solid #0ff;
          border-radius: 4px;
          padding: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: bold;
        }
        #drop4d-info-panel .ctrl-btn:hover {
          background: #0ff;
          color: #000;
        }
        #drop4d-info-panel select {
          width: 100%;
          padding: 4px 8px;
          background: rgba(0, 20, 20, 0.95);
          border: 1px solid #0ff;
          border-radius: 4px;
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          cursor: pointer;
          margin-bottom: 8px;
        }
      </style>
      <div class="header">
        <h3>4D\u00B1 GRAVITY + INVERSION</h3>
        <button class="close-btn" id="d4d-close">\u2715</button>
      </div>

      <div class="section">
        <div class="section-title">Celestial Body</div>
        <select id="d4d-body-selector"></select>
      </div>

      <div class="section">
        <div class="section-title">Falling Bodies</div>
        <div class="controls" style="margin-top: 4px;">
          <button class="ctrl-btn" id="d4d-shape-tetra" style="flex: 1; background: #353; border-color: #8f8;">
            Tetrahedron
          </button>
          <button class="ctrl-btn" id="d4d-shape-ico" style="flex: 1;">
            3F Icosahedron
          </button>
        </div>
      </div>

      <div class="controls">
        <button class="ctrl-btn" id="d4d-drop-btn">Drop</button>
      </div>

      <div class="section">
        <div class="section-title">Status</div>
        <div class="row"><span class="label">Phase:</span><span class="value" id="d4d-phase">Ready</span></div>
        <div class="row"><span class="label">Time:</span><span class="value" id="d4d-time">0.000 s</span></div>
        <div class="row"><span class="label">Cell:</span><span class="value" id="d4d-cell">0 / 144</span></div>
        <div class="row"><span class="label">g:</span><span class="value" id="d4d-g">${this.getG().toFixed(3)} m/s\u00B2</span></div>
        <div class="row"><span class="label">T:</span><span class="value" id="d4d-totaltime">${this.getTotalTime().toFixed(3)} s</span></div>
      </div>

      <div class="section">
        <div class="section-title">Axes</div>
        <div class="row"><span class="label" style="color:#f44;">QX (A):</span><span class="value" id="d4d-qx">+extent</span></div>
        <div class="row"><span class="label" style="color:#4c4;">QZ (B):</span><span class="value" id="d4d-qz">+extent</span></div>
        <div class="row"><span class="label" style="color:#48f;">QY (C):</span><span class="value" id="d4d-qy">+extent</span></div>
        <div class="row"><span class="label" style="color:#fc0;">QW (D):</span><span class="value" id="d4d-qw">+extent</span></div>
      </div>
    `;

    document.body.appendChild(panel);
    this.infoPanel = panel;

    // Populate body selector
    const bodySelector = document.getElementById("d4d-body-selector");
    Object.entries(RT.Gravity.BODIES).forEach(([key, body]) => {
      if (key === "normalized") return;
      const opt = document.createElement("option");
      opt.value = key;
      const gLabel = body.surfaceG >= 1e6
        ? body.surfaceG.toExponential(2)
        : body.surfaceG.toFixed(3);
      opt.textContent = `${body.name} (g = ${gLabel} m/s\u00B2)`;
      if (key === this.selectedBody) opt.selected = true;
      bodySelector.appendChild(opt);
    });

    // Body selector change
    bodySelector.addEventListener("change", () => {
      this.selectedBody = bodySelector.value;
      if (this.isAnimating) this.stopAnimation();
      this.computeExtent();
      this.resetNodePositions();
      this.updatePanel();
    });

    // Shape toggle buttons
    document.getElementById("d4d-shape-tetra").addEventListener("click", () => {
      this.setBodyShape("tetrahedron");
    });
    document.getElementById("d4d-shape-ico").addEventListener("click", () => {
      this.setBodyShape("icosahedron");
    });

    // Drop/Stop toggle
    document.getElementById("d4d-drop-btn").addEventListener("click", () => {
      this.toggleAnimation();
    });

    // Close button
    document.getElementById("d4d-close").addEventListener("click", () => {
      this.disable();
      const link = document.getElementById("open-4d-drop-demo");
      if (link) {
        link.style.color = "#7ab8ff";
        link.textContent = "4D\u00B1 Gravity + Inversion";
      }
    });

    // Make panel draggable
    this.setupPanelDrag(panel);
  }

  removeInfoPanel() {
    if (this.infoPanel) {
      if (this._panelDragCleanup) this._panelDragCleanup();
      this.infoPanel.remove();
      this.infoPanel = null;
    }
  }

  setupPanelDrag(panel) {
    const header = panel.querySelector(".header");
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    const onMouseDown = e => {
      if (e.target.classList.contains("close-btn")) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      panel.style.left = rect.left + "px";
      panel.style.top = rect.top + "px";
      panel.style.right = "auto";
      e.preventDefault();
    };

    const onMouseMove = e => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffsetX;
      const newY = e.clientY - dragOffsetY;
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      panel.style.left = Math.max(0, Math.min(newX, maxX)) + "px";
      panel.style.top = Math.max(0, Math.min(newY, maxY)) + "px";
    };

    const onMouseUp = () => { isDragging = false; };

    header.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    this._panelDragCleanup = () => {
      header.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }

  // ========================================================================
  // ANIMATION
  // ========================================================================

  resetNodePositions() {
    for (let i = 0; i < this.nodeMeshes.length; i++) {
      const basisDir = Quadray.basisVectors[i].clone();
      this.nodeMeshes[i].position.copy(basisDir.multiplyScalar(this.extent));
    }
  }

  toggleAnimation() {
    if (this.isAnimating) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
  }

  startAnimation() {
    this.isAnimating = true;
    this.phaseIndex = 0;
    this.phaseStartTime = performance.now();

    const btn = document.getElementById("d4d-drop-btn");
    if (btn) {
      btn.textContent = "Stop";
      btn.style.color = "#ff6644";
      btn.style.borderColor = "#ff6644";
    }

    // Place nodes at positive extent
    this.resetNodePositions();
    this.animationLoop();
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const btn = document.getElementById("d4d-drop-btn");
    if (btn) {
      btn.textContent = "Drop";
      btn.style.color = "#0ff";
      btn.style.borderColor = "#0ff";
    }

    // Restore background if in negative space
    if (this.inNegativeSpace) {
      this.inNegativeSpace = false;
      animateBackgroundColor(0x1a1a1a, 300);
    }

    // Reset to positive extent
    this.resetNodePositions();
    this.phaseIndex = 0;
    this.updatePanel();
  }

  animationLoop() {
    if (!this.isAnimating) return;

    const now = performance.now();
    const T = this.getTotalTime();
    const elapsed = (now - this.phaseStartTime) / 1000;
    let f = elapsed / T;

    // Phase completion: render at f=1.0 first, then advance next frame
    if (f >= 1.0) {
      if (!this._phaseComplete) {
        // First frame past completion: clamp to 1.0 and render the endpoint
        f = 1.0;
        this._phaseComplete = true;
      } else {
        // Second frame: now advance phase with overflow carry
        const phase = PHASES[this.phaseIndex];

        // Trigger Janus flash + background inversion at origin arrivals
        if (phase === "pos_to_origin") {
          createJanusFlash(new this.THREE.Vector3(0, 0, 0));
          this.inNegativeSpace = true;
          animateBackgroundColor(0xffffff, 300);
        } else if (phase === "neg_to_origin") {
          createJanusFlash(new this.THREE.Vector3(0, 0, 0));
          this.inNegativeSpace = false;
          animateBackgroundColor(0x1a1a1a, 300);
        }

        // Advance phase, carry overflow time
        const overflowSeconds = (f - 1.0) * T;
        this.phaseIndex = (this.phaseIndex + 1) % PHASES.length;
        this.phaseStartTime = now - overflowSeconds * 1000;
        f = overflowSeconds / T;
        this._phaseComplete = false;
      }
    }

    const phase = PHASES[this.phaseIndex];

    // Position each node based on current phase
    for (let i = 0; i < this.nodeMeshes.length; i++) {
      const basisDir = Quadray.basisVectors[i].clone();
      let pos;

      switch (phase) {
        case "pos_to_origin":
          pos = basisDir.multiplyScalar(this.extent * (1 - f));
          break;
        case "origin_to_neg":
          pos = basisDir.multiplyScalar(-this.extent * f);
          break;
        case "neg_to_origin":
          pos = basisDir.multiplyScalar(-this.extent * (1 - f));
          break;
        case "origin_to_pos":
          pos = basisDir.multiplyScalar(this.extent * f);
          break;
      }

      this.nodeMeshes[i].position.copy(pos);
    }

    this.updatePanel(phase, elapsed > T ? elapsed % T : elapsed, f);
    this.animationId = requestAnimationFrame(() => this.animationLoop());
  }

  updatePanel(phase, elapsed, f) {
    const phaseEl = document.getElementById("d4d-phase");
    const timeEl = document.getElementById("d4d-time");
    const cellEl = document.getElementById("d4d-cell");
    const gEl = document.getElementById("d4d-g");
    const ttEl = document.getElementById("d4d-totaltime");

    if (!phaseEl) return;

    const g = this.getG();
    const T = this.getTotalTime();

    gEl.textContent = g >= 1e6 ? `${g.toExponential(2)} m/s\u00B2` : `${g.toFixed(3)} m/s\u00B2`;
    ttEl.textContent = `${T.toFixed(3)} s`;

    if (!phase) {
      phaseEl.textContent = "Ready";
      timeEl.textContent = "0.000 s";
      cellEl.textContent = "0 / 144";
    } else {
      // Phase display
      const phaseLabels = {
        pos_to_origin: "+Ext \u2192 Origin",
        origin_to_neg: "Origin \u2192 \u2013Ext",
        neg_to_origin: "\u2013Ext \u2192 Origin",
        origin_to_pos: "Origin \u2192 +Ext",
      };
      phaseEl.textContent = phaseLabels[phase] || phase;
      timeEl.textContent = `${(elapsed || 0).toFixed(3)} s`;

      // Cell estimate (which shell the nodes are currently at)
      const frac = f || 0;
      const cell = Math.min(Math.floor(frac * 144), 143);
      cellEl.textContent = `${cell} / 144`;
    }

    // Axis position readouts
    const axisIds = ["d4d-qx", "d4d-qz", "d4d-qy", "d4d-qw"];
    const axisIndices = [0, 1, 2, 3]; // basisVectors indices matching AXIS_INDEX
    for (let j = 0; j < 4; j++) {
      const el = document.getElementById(axisIds[j]);
      if (el && this.nodeMeshes[axisIndices[j]]) {
        const pos = this.nodeMeshes[axisIndices[j]].position;
        const dist = pos.length();
        const sign = pos.dot(Quadray.basisVectors[axisIndices[j]]) >= 0 ? "+" : "\u2013";
        el.textContent = `${sign}${dist.toFixed(2)}`;
      }
    }
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  enable() {
    if (this.enabled) return;
    this.enabled = true;

    this.saveSceneState();
    this.configureSceneForDemo();
    this.createDemoObjects();
    this.createInfoPanel();

    console.log("4D\u00B1 Gravity + Inversion Demo enabled");
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;

    if (this.isAnimating) this.stopAnimation();
    this.removeDemoObjects();
    this.removeInfoPanel();
    this.restoreSceneState();

    console.log("4D\u00B1 Gravity + Inversion Demo disabled");
  }

  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  }
}

// ========================================================================
// SINGLETON EXPORT
// ========================================================================

let demoInstance = null;

export function get4DDropDemo(scene, THREE, camera, controls) {
  if (!demoInstance) {
    demoInstance = new Drop4DDemo(scene, THREE, camera, controls);
  }
  return demoInstance;
}

export function destroy4DDropDemo() {
  if (demoInstance) {
    demoInstance.disable();
    demoInstance = null;
  }
}
