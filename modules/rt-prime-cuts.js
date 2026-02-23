/**
 * RT-PrimeCuts Module
 * Prime polygon projection visualization for Gauss-Wantzel bypass research
 *
 * Demonstrates that prime n-gons (7, 11, 13...) emerge as projections
 * of 3D polyhedra/compounds at rational-spread viewing angles.
 *
 * Extracted from rt-papercut.js using Shadow & Swap pattern.
 * See: Geometry Documents/Prime-Cut-Extract.md
 *
 * @module rt-prime-cuts
 * @author Andy & Claude (2026)
 */

import * as THREE from "three";
import { RT } from "./rt-math.js";
import { RTProjections } from "./rt-projections.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION PRESETS REGISTRY
// Single source of truth for all prime projection configurations.
// Each entry is a complete preset compatible with RTProjections.applyPreset().
// ═══════════════════════════════════════════════════════════════════════════════
const PROJECTION_PRESETS = {
  pentagon: {
    name: "Pentagon (5-gon)",
    n: 5,
    // Use base truncated tetrahedron (single source of truth - no Quadray)
    polyhedronType: "primeTruncTet",
    polyhedronCheckbox: "showPrimeTruncTet",
    compound: "truncatedTetrahedron",
    vertexCount: 12,
    spreads: [0, 0.5, 0], // Rational: s=(0, 1/2, 0), Tier 1
    expectedHull: 5,
    source: "Path A rational search tier 1, s₂=1/2, regularity=0.4231",
    maxInteriorAngle: 170,
    verified: "2026-02-08",
    description: "Truncated Tetrahedron → 5-vertex hull at s=(0, 1/2, 0)",
    rationalSpreads: ["0", "1/2", "0"],
    rationalTier: 1,
    projectionState: {
      enabled: true,
      basis: "custom",
      axis: null,
      distance: 3,
      showRays: true,
      showInterior: false,
      showIdealPolygon: true,
      customSpreads: [0, 0.5, 0],
      presetName: "pentagon",
    },
  },
  heptagon: {
    name: "Heptagon (7-gon)",
    n: 7,
    // Uses DUAL tet compound with unit-sphere normalization for robust hull
    polyhedronType: "primeCompoundTet",
    polyhedronCheckbox: "showPrimeCompoundTet",
    compound: "truncTetPlusDualTet",
    vertexCount: 16,
    spreads: [0.5, 0.5, 0.5], // Rational: s=(1/2, 1/2, 1/2), Tier 1, all spreads equal!
    expectedHull: 7,
    source: "Path A rational search tier 1, all s=1/2, regularity=0.8605",
    maxInteriorAngle: 170,
    verified: "2026-02-08",
    description:
      "TruncTet+DualTet compound → 7-vertex hull at s=(1/2, 1/2, 1/2)",
    rationalSpreads: ["1/2", "1/2", "1/2"],
    rationalTier: 1,
    projectionState: {
      enabled: true,
      basis: "custom",
      axis: null,
      distance: 3,
      showRays: true,
      showInterior: false,
      showIdealPolygon: true,
      customSpreads: [0.5, 0.5, 0.5],
      presetName: "heptagon",
    },
  },
  hendecagon: {
    name: "Hendecagon (11-gon)",
    n: 11,
    // Tier 1 rational spreads — denominators {2, 4} only, √2/√3 radicals
    polyhedronType: "primeCompoundIcosa",
    polyhedronCheckbox: "showPrimeCompoundIcosa",
    compound: "truncTetPlusIcosa",
    vertexCount: 24,
    spreads: [0.75, 0.25, 0.5], // Rational: s=(3/4, 1/4, 1/2), Tier 1
    expectedHull: 11,
    source: "Path A rational search tier 1, s=(3/4,1/4,1/2), regularity=0.4901",
    maxInteriorAngle: 170,
    verified: "2026-02-08",
    description:
      "TruncTet+Icosa compound → 11-vertex hull at s=(3/4, 1/4, 1/2)",
    rationalSpreads: ["3/4", "1/4", "1/2"],
    rationalTier: 1,
    projectionState: {
      enabled: true,
      basis: "custom",
      axis: null,
      distance: 3,
      showRays: true,
      showInterior: false,
      showIdealPolygon: true,
      customSpreads: [0.75, 0.25, 0.5],
      presetName: "hendecagon",
    },
  },
  tridecagon: {
    name: "Tridecagon (13-gon)",
    n: 13,
    // Tier 3 rational spreads — denominators {10, 20, 25}, √5 radical family
    polyhedronType: "primeCompoundIcosa",
    polyhedronCheckbox: "showPrimeCompoundIcosa",
    compound: "truncTetPlusIcosa",
    vertexCount: 24,
    spreads: [0.9, 0.96, 0.95], // Rational: s=(9/10, 24/25, 19/20), Tier 3
    expectedHull: 13,
    source:
      "Path A rational search tier 3, s=(9/10,24/25,19/20), regularity=0.3462",
    maxInteriorAngle: 178,
    verified: "2026-02-08",
    description:
      "TruncTet+Icosa compound → 13-vertex hull at s=(9/10, 24/25, 19/20)",
    rationalSpreads: ["9/10", "24/25", "19/20"],
    rationalTier: 3,
    projectionState: {
      enabled: true,
      basis: "custom",
      axis: null,
      distance: 3,
      showRays: true,
      showInterior: false,
      showIdealPolygon: true,
      customSpreads: [0.9, 0.96, 0.95],
      presetName: "tridecagon",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE-POLYHEDRA GEODESIC TETRAHEDRON RESULTS
  // These bypass the compound requirement — asymmetric geodesic tet alone
  // produces prime hulls due to lack of central symmetry.
  // ═══════════════════════════════════════════════════════════════════════════

  heptagonGeoTet: {
    name: "Heptagon (7-gon) — Geodesic Tet",
    buttonLabel: "7★",
    n: 7,
    polyhedronType: "primeGeoTetF2",
    polyhedronCheckbox: "showPrimeGeoTetF2",
    compound: "geodesicTetrahedronF2",
    vertexCount: 10,
    spreads: [0, 1 / 3, 1 / 3], // Rational: s=(0, 1/3, 1/3), Tier 1
    expectedHull: 7,
    source: "Phase 1 geodesic f=2 search, s=(0,1/3,1/3), regularity=0.419",
    maxInteriorAngle: 170,
    verified: "2026-02-08",
    description: "Geodesic Tet f=2 (10v) → 7-gon hull — SINGLE polyhedron!",
    rationalSpreads: ["0", "1/3", "1/3"],
    rationalTier: 1,
    projectionState: {
      enabled: true,
      basis: "custom",
      axis: null,
      distance: 3,
      showRays: true,
      showInterior: false,
      showIdealPolygon: true,
      customSpreads: [0, 1 / 3, 1 / 3],
      presetName: "heptagonGeoTet",
    },
  },
  hendecagonGeoTet: {
    name: "Hendecagon (11-gon) — Geodesic Tet",
    buttonLabel: "11★",
    n: 11,
    polyhedronType: "primeGeoTetF4",
    polyhedronCheckbox: "showPrimeGeoTetF4",
    compound: "geodesicTetrahedronF4",
    vertexCount: 34,
    spreads: [0.75, 1 / 3, 1 / 3], // Rational: s=(3/4, 1/3, 1/3), Tier 1
    expectedHull: 11,
    source: "Phase 1 geodesic f=4 search, s=(3/4,1/3,1/3), regularity=0.432",
    maxInteriorAngle: 175,
    verified: "2026-02-08",
    description: "Geodesic Tet f=4 (34v) → 11-gon hull — SINGLE polyhedron!",
    rationalSpreads: ["3/4", "1/3", "1/3"],
    rationalTier: 1,
    projectionState: {
      enabled: true,
      basis: "custom",
      axis: null,
      distance: 3,
      showRays: true,
      showInterior: false,
      showIdealPolygon: true,
      customSpreads: [0.75, 1 / 3, 1 / 3],
      presetName: "hendecagonGeoTet",
    },
  },
  tridecagonGeoTet: {
    name: "Tridecagon (13-gon) — Geodesic Tet",
    buttonLabel: "13★",
    n: 13,
    polyhedronType: "primeGeoTetF4",
    polyhedronCheckbox: "showPrimeGeoTetF4",
    compound: "geodesicTetrahedronF4",
    vertexCount: 34,
    spreads: [0.5, 0.75, 0.75], // Rational: s=(1/2, 3/4, 3/4), Tier 1
    expectedHull: 13,
    source: "Phase 1 geodesic f=4 search, s=(1/2,3/4,3/4), regularity=0.448",
    maxInteriorAngle: 175,
    verified: "2026-02-08",
    description:
      "Geodesic Tet f=4 (34v) → 13-gon hull — SINGLE polyhedron! Beats compound.",
    rationalSpreads: ["1/2", "3/4", "3/4"],
    rationalTier: 1,
    projectionState: {
      enabled: true,
      basis: "custom",
      axis: null,
      distance: 3,
      showRays: true,
      showInterior: false,
      showIdealPolygon: true,
      customSpreads: [0.5, 0.75, 0.75],
      presetName: "tridecagonGeoTet",
    },
  },
};

// Legacy lookup by n for backwards compatibility
const VERIFIED_PROJECTIONS = {
  5: PROJECTION_PRESETS.pentagon,
  7: PROJECTION_PRESETS.heptagon,
  11: PROJECTION_PRESETS.hendecagon,
  13: PROJECTION_PRESETS.tridecagon,
};

export const RTPrimeCuts = {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  _primePolygonGroup: null,
  _primePolygonVisible: false,
  _renderer: null,
  _papercutRef: null, // Reference to RTPapercut for cutplane callbacks
  _panel: null,
  _panelVisible: false,

  /**
   * Initialize with renderer reference
   * Called from rt-init.js after scene setup
   * @param {THREE.WebGLRenderer} renderer - The WebGL renderer
   * @param {Object} papercutRef - Reference to RTPapercut module (for cutplane integration)
   */
  init: function (renderer, papercutRef = null) {
    RTPrimeCuts._renderer = renderer;
    RTPrimeCuts._papercutRef = papercutRef;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOATING PANEL (Math Demo modal)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create the floating Prime Projections panel
   * Buttons are built dynamically from PROJECTION_PRESETS for extensibility
   */
  createPanel: function () {
    if (document.getElementById("prime-projections-panel")) {
      this._panel = document.getElementById("prime-projections-panel");
      this._panel.style.display = "block";
      return;
    }

    // Build buttons dynamically from PROJECTION_PRESETS
    const presetKeys = Object.keys(PROJECTION_PRESETS);
    let buttonsHTML = "";
    for (const key of presetKeys) {
      const preset = PROJECTION_PRESETS[key];
      // Fermat primes (3, 5, 17, 257, 65537) are constructible
      const isConstructible = [3, 5, 17].includes(preset.n);
      const isSinglePoly = !!preset.buttonLabel; // Geodesic tet single-poly results
      const gradient = isConstructible
        ? "linear-gradient(135deg, #7bed9f 0%, #26de81 100%)"
        : isSinglePoly
          ? "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)"
          : "linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%)";
      const label = preset.buttonLabel || `${preset.n}-gon`;
      buttonsHTML += `<button class="pp-btn" data-preset="${key}"
        title="${preset.description}"
        style="background: ${gradient}; color: #000">
        ${label}</button>`;
    }

    const panel = document.createElement("div");
    panel.id = "prime-projections-panel";
    panel.innerHTML = `
      <style>
        #prime-projections-panel {
          position: fixed;
          top: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          padding: 15px;
          border-radius: 8px;
          min-width: 240px;
          max-width: 280px;
          z-index: 1000;
          border: 1px solid #444;
        }
        #prime-projections-panel .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid #444;
          padding-bottom: 5px;
          cursor: move;
          user-select: none;
        }
        #prime-projections-panel .header:hover {
          background: rgba(255, 255, 255, 0.05);
          margin: -5px -5px 10px -5px;
          padding: 5px 5px 10px 5px;
          border-radius: 4px 4px 0 0;
        }
        #prime-projections-panel .header h3 {
          margin: 0;
          color: #ffd93d;
          font-size: 13px;
        }
        #prime-projections-panel .header h3::before {
          content: '\\22EE\\22EE ';
          color: #666;
          margin-right: 4px;
        }
        #prime-projections-panel .close-btn {
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
        #prime-projections-panel .close-btn:hover {
          background: #f66;
        }
        #prime-projections-panel .btn-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 8px;
        }
        #prime-projections-panel .pp-btn {
          border: none;
          border-radius: 4px;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
        }
        #prime-projections-panel .pp-btn:hover {
          filter: brightness(1.2);
        }
        #prime-projections-panel .pp-btn.active {
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
          outline: 2px solid #fff;
        }
      </style>
      <div class="header">
        <h3>PRIME PROJECTIONS</h3>
        <button class="close-btn" id="pp-close">\u2715</button>
      </div>
      <p style="font-size: 9px; color: #888; margin: 0 0 8px 0">
        Click to apply preset: enables polyhedron + projection view
      </p>
      <div class="btn-grid">${buttonsHTML}</div>
      <p style="font-size: 8px; margin: 0; color: #888">
        <span style="color: #7bed9f">Green</span>: constructible |
        <span style="color: #ff6b6b">Red</span>: compound |
        <span style="color: #74b9ff">Blue★</span>: single poly
      </p>
      <div id="primeProjectionInfo"
        style="font-size: 10px; color: #00ffff; margin-top: 8px; display: none">
        <span id="primeProjectionFormula"></span>
      </div>
    `;

    document.body.appendChild(panel);
    this._panel = panel;

    // Wire close button
    document.getElementById("pp-close").addEventListener("click", () => {
      this.hidePanel();
    });

    // Wire preset buttons
    panel.querySelectorAll(".pp-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const presetName = btn.dataset.preset;
        this._applyPresetFromPanel(presetName);
        // Highlight active button
        panel
          .querySelectorAll(".pp-btn")
          .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // Make panel draggable
    this._setupPanelDrag(panel);
  },

  /**
   * Apply a preset from the floating panel
   * Centralizes the disable-all/enable-one/apply logic
   */
  _applyPresetFromPanel: function (presetName) {
    const preset = PROJECTION_PRESETS[presetName];
    if (!preset) return;

    // Helper to disable a checkbox if checked
    const disable = id => {
      const cb = document.getElementById(id);
      if (cb?.checked) {
        cb.checked = false;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    // Disable all prime + Quadray polyhedra for clean switch
    disable("showPrimeTruncTet");
    disable("showPrimeCompoundTet");
    disable("showPrimeCompoundIcosa");
    disable("showPrimeGeoTetF2");
    disable("showPrimeGeoTetF4");
    disable("showQuadrayTruncatedTet");

    // For 11/13-gon switching (same checkbox), hide projection first
    if (window.RTProjections) {
      window.RTProjections.hideProjection();
    }

    // Enable the correct polyhedron checkbox
    const checkbox = document.getElementById(preset.polyhedronCheckbox);
    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Apply preset via RTPrimeCuts
    if (window.RTProjections?._scene) {
      this.applyPreset(presetName, window.RTProjections._scene);
    }
  },

  /**
   * Make panel draggable via header
   * Viewport-constrained, follows rotor demo pattern
   */
  _setupPanelDrag: function (panel) {
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

    const onMouseUp = () => {
      isDragging = false;
    };

    header.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  },

  showPanel: function () {
    if (!this._panel) this.createPanel();
    this._panel.style.display = "block";
    this._panelVisible = true;
  },

  hidePanel: function () {
    if (this._panel) {
      this._panel.style.display = "none";
    }
    this._panelVisible = false;
    // Update the Math Demos link
    const link = document.getElementById("open-prime-projections-demo");
    if (link) {
      link.style.color = "#7ab8ff";
      link.textContent = "Prime Projections";
    }
  },

  togglePanel: function () {
    if (this._panelVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
    return this._panelVisible;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESET API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all available projection presets
   * @returns {Object} PROJECTION_PRESETS registry
   */
  getPresets: function () {
    return PROJECTION_PRESETS;
  },

  /**
   * Get a specific preset by name
   * @param {string} name - Preset name (pentagon, heptagon, hendecagon, tridecagon)
   * @returns {Object|null} Preset configuration or null
   */
  getPreset: function (name) {
    return PROJECTION_PRESETS[name] || null;
  },

  /**
   * Get a preset by n (number of sides)
   * @param {number} n - Number of polygon sides (5, 7, 11, 13)
   * @returns {Object|null} Preset configuration or null
   */
  getPresetByN: function (n) {
    return VERIFIED_PROJECTIONS[n] || null;
  },

  /**
   * Get list of preset names
   * @returns {Array<string>} Array of preset names
   */
  getPresetNames: function () {
    return Object.keys(PROJECTION_PRESETS);
  },

  /**
   * Apply a preset using RTProjections
   * @param {string} name - Preset name
   * @param {THREE.Scene} scene - Scene reference
   * @returns {boolean} Success status
   */
  applyPreset: function (name, scene) {
    const preset = PROJECTION_PRESETS[name];
    if (!preset) {
      console.warn(`⚠️ Preset not found: ${name}`);
      return false;
    }
    return RTProjections.applyPreset(preset, scene);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Show or hide the prime projection visualization
   *
   * SIMPLIFIED: Now delegates to RTProjections.applyPreset() for all visualization.
   * Maintains backwards compatibility with existing n-based API.
   *
   * @param {number|null} n - Number of sides (5, 7, 11, 13) or null to hide
   * @param {THREE.Scene} scene - Scene to add/remove visualization from
   * @param {THREE.Camera} camera - Camera reference (kept for API compatibility)
   * @param {number} planeDistance - Distance from polyhedron center (default: 5)
   */
  showPrimePolygon: async function (n, scene, camera, planeDistance = 5) {
    // Validate scene
    if (!scene) {
      console.error("❌ showPrimePolygon: scene is undefined!");
      return;
    }

    // If n is null, hide the projection (only log if actually visible)
    if (!n) {
      const wasVisible = RTPrimeCuts._primePolygonVisible;
      RTProjections.hideProjection();
      RTPrimeCuts._primePolygonVisible = false;
      RTPrimeCuts._hideProjectionInfo();
      if (wasVisible) {
        console.log("📐 Prime projection visualization hidden");
      }
      return;
    }

    // Look up preset by n
    const preset = VERIFIED_PROJECTIONS[n];
    if (!preset) {
      console.warn(`⚠️ No preset found for ${n}-gon projection`);
      RTPrimeCuts._hideProjectionInfo();
      return;
    }

    // Update distance in preset state if provided
    if (planeDistance !== 5) {
      preset.projectionState.distance = planeDistance;
    }

    // Delegate to RTProjections.applyPreset()
    const success = RTProjections.applyPreset(preset, scene);

    if (success) {
      RTPrimeCuts._primePolygonVisible = true;
      RTPrimeCuts._updateProjectionInfo(n);
      console.log(`📐 ${preset.name} projection applied via RTProjections`);
    } else {
      RTPrimeCuts._primePolygonVisible = false;
      RTPrimeCuts._hideProjectionInfo();
    }
  },

  /**
   * Update polygon orientation to match camera (call on camera change)
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  updatePrimePolygonOrientation: function (scene, camera) {
    if (!RTPrimeCuts._primePolygonVisible || !RTPrimeCuts._primePolygonGroup) {
      return;
    }

    // Extract n from group name
    const match =
      RTPrimeCuts._primePolygonGroup.name.match(/primePolygon-(\d+)/);
    if (!match) return;

    const n = parseInt(match[1]);
    const radius = 1.5; // Default radius

    // Recreate polygon with new orientation
    RTPrimeCuts.showPrimePolygon(n, scene, camera, radius);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECTION MATH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get projection plane basis vectors from viewing spreads
   * Returns the plane where the n-gon projection lives (fixed in 3D space)
   *
   * @param {number} n - Number of sides (7 for heptagon, 5 for pentagon)
   * @returns {{planeRight: THREE.Vector3, planeUp: THREE.Vector3, planeNormal: THREE.Vector3}}
   */
  _getProjectionPlaneBasis: function (n) {
    // Get viewing spreads from VERIFIED_PROJECTIONS registry (single source of truth)
    const config = VERIFIED_PROJECTIONS[n];
    let s1, s2, s3;

    if (config) {
      [s1, s2, s3] = config.spreads;
      // Note: config.compound indicates required polyhedron:
      // - truncatedTetrahedron (12v): 5-gon
      // - truncTetPlusTet (16v): 7-gon, 11-gon
      // - truncTetPlusIcosa (24v): 13-gon
    } else {
      // Default: XY plane for unregistered n-gons
      return {
        planeRight: new THREE.Vector3(1, 0, 0),
        planeUp: new THREE.Vector3(0, 1, 0),
        planeNormal: new THREE.Vector3(0, 0, 1),
      };
    }

    // Build rotation matrix from spreads (ZYX Euler)
    // sin(θ) = √s, cos(θ) = √(1-s)
    const sin1 = Math.sqrt(s1),
      cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2),
      cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3),
      cos3 = Math.sqrt(1 - s3);

    // ZYX rotation matrices
    const Rz = [
      [cos1, -sin1, 0],
      [sin1, cos1, 0],
      [0, 0, 1],
    ];
    const Ry = [
      [cos2, 0, sin2],
      [0, 1, 0],
      [-sin2, 0, cos2],
    ];
    const Rx = [
      [1, 0, 0],
      [0, cos3, -sin3],
      [0, sin3, cos3],
    ];

    // Matrix multiply helper
    const matMul = (A, B) =>
      A.map((row, i) =>
        B[0].map((_, j) =>
          row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0)
        )
      );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Transform basis vectors
    // planeRight = R * (1,0,0)
    const planeRight = new THREE.Vector3(R[0][0], R[1][0], R[2][0]).normalize();
    // planeUp = R * (0,1,0)
    const planeUp = new THREE.Vector3(R[0][1], R[1][1], R[2][1]).normalize();
    // planeNormal = R * (0,0,1) - this is the viewing direction
    const planeNormal = new THREE.Vector3(
      R[0][2],
      R[1][2],
      R[2][2]
    ).normalize();

    console.log(
      `📐 Projection plane for ${n}-gon: spreads=(${s1}, ${s2}, ${s3})`
    );
    console.log(
      `   Right: (${planeRight.x.toFixed(3)}, ${planeRight.y.toFixed(3)}, ${planeRight.z.toFixed(3)})`
    );
    console.log(
      `   Up: (${planeUp.x.toFixed(3)}, ${planeUp.y.toFixed(3)}, ${planeUp.z.toFixed(3)})`
    );
    console.log(
      `   Normal: (${planeNormal.x.toFixed(3)}, ${planeNormal.y.toFixed(3)}, ${planeNormal.z.toFixed(3)})`
    );

    return { planeRight, planeUp, planeNormal };
  },

  /**
   * Compute 2D convex hull using Graham scan
   * Delegates to RTProjections for the generic implementation.
   *
   * @param {Array<{x,y}>} points - 2D points
   * @returns {Array<{x,y}>} Hull vertices in CCW order
   */
  _computeConvexHull2D: function (points) {
    return RTProjections._computeConvexHull2D(points);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VERTEX EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract world-space vertices from a polyhedron group
   * Delegates to RTProjections for the generic implementation.
   *
   * @param {THREE.Group} group - The polyhedron group
   * @returns {Array<THREE.Vector3>} World-space vertices
   */
  _getWorldVerticesFromGroup: function (group) {
    return RTProjections._getWorldVerticesFromGroup(group);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUALIZATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

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
    console.log(
      "📐 _createProjectionHullVertices: ACTUAL projection for",
      n,
      "-hull"
    );

    // Get view plane basis vectors
    const viewDir = new THREE.Vector3();
    camera.getWorldDirection(viewDir);
    const up = camera.up.clone().normalize();
    const right = new THREE.Vector3().crossVectors(viewDir, up).normalize();
    const planeUp = new THREE.Vector3()
      .crossVectors(right, viewDir)
      .normalize();

    // Truncated tetrahedron vertices (normalized, from rt-math.js)
    // These are permutations of (3,1,1) with even parity, normalized
    const truncTetVertices = [
      [3, 1, 1],
      [3, -1, -1],
      [1, 3, 1],
      [1, -3, -1],
      [1, 1, 3],
      [1, -1, -3],
      [-3, 1, -1],
      [-3, -1, 1],
      [-1, 3, -1],
      [-1, -3, 1],
      [-1, 1, -3],
      [-1, -1, 3],
    ].map(v => {
      const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      return [v[0] / len, v[1] / len, v[2] / len];
    });

    // Get viewing spreads for this n-gon
    // 5-gon: s=(0, 0, 0.5) from truncated tetrahedron (12v)
    // 7-gon: requires TruncTet+Tet compound - not supported here (use showPrimePolygon)
    let s1, s2, s3;
    if (n === 5) {
      s1 = 0;
      s2 = 0;
      s3 = 0.5;
    } else if (n === 7) {
      // 7-gon requires compound - this function only handles truncated tet
      console.warn("⚠️ 7-gon requires TruncTet+Tet compound, using fallback");
      return this._createRegularPolygonVerticesFallback(n, radius, camera);
    } else {
      // Fallback: no projection defined, use regular polygon
      console.warn(
        "⚠️ No projection defined for",
        n,
        "-gon, using regular polygon"
      );
      return this._createRegularPolygonVerticesFallback(n, radius, camera);
    }

    // Build rotation matrix from spreads (ZYX Euler)
    // sin(θ) = √s, cos(θ) = √(1-s)
    const sin1 = Math.sqrt(s1),
      cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2),
      cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3),
      cos3 = Math.sqrt(1 - s3);

    // Rotation matrices
    const Rz = [
      [cos1, -sin1, 0],
      [sin1, cos1, 0],
      [0, 0, 1],
    ];
    const Ry = [
      [cos2, 0, sin2],
      [0, 1, 0],
      [-sin2, 0, cos2],
    ];
    const Rx = [
      [1, 0, 0],
      [0, cos3, -sin3],
      [0, sin3, cos3],
    ];

    // Matrix multiply helper
    const matMul = (A, B) =>
      A.map((row, i) =>
        B[0].map((_, j) =>
          row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0)
        )
      );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Apply rotation and project to 2D
    const projected2D = truncTetVertices.map(v => {
      const rx = R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2];
      const ry = R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2];
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
      angles.push(Math.round((Math.acos(cosAng) * 180) / Math.PI));
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

    console.log(
      "   ✓ ACTUAL projection hull with",
      hull.length,
      "vertices (irregular!)"
    );
    return vertices;
  },

  /**
   * Fallback: regular polygon for n-gons without projection definition
   */
  _createRegularPolygonVerticesFallback: function (n, radius, camera) {
    const viewDir = new THREE.Vector3();
    camera.getWorldDirection(viewDir);
    const up = camera.up.clone().normalize();
    const right = new THREE.Vector3().crossVectors(viewDir, up).normalize();
    const planeUp = new THREE.Vector3()
      .crossVectors(right, viewDir)
      .normalize();

    const nGonVerts = RT.nGonVertices(n, radius).vertices;
    const vertices = [];
    for (let i = 0; i <= n; i++) {
      const v = nGonVerts[i % n];
      vertices.push(
        new THREE.Vector3()
          .addScaledVector(right, v.x)
          .addScaledVector(planeUp, v.y)
      );
    }
    return vertices;
  },

  /**
   * Create ACTUAL projection hull vertices in the fixed projection plane
   * @param {number} n - Number of sides
   * @param {number} radius - Target radius
   * @param {THREE.Vector3} planeRight - Plane's X axis
   * @param {THREE.Vector3} planeUp - Plane's Y axis
   * @returns {Array<THREE.Vector3>} Vertices in 3D space
   */
  _createProjectionHullVerticesFixed: function (
    n,
    radius,
    planeRight,
    planeUp
  ) {
    // Truncated tetrahedron vertices (normalized)
    const truncTetVertices = [
      [3, 1, 1],
      [3, -1, -1],
      [1, 3, 1],
      [1, -3, -1],
      [1, 1, 3],
      [1, -1, -3],
      [-3, 1, -1],
      [-3, -1, 1],
      [-1, 3, -1],
      [-1, -3, 1],
      [-1, 1, -3],
      [-1, -1, 3],
    ].map(v => {
      const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      return [v[0] / len, v[1] / len, v[2] / len];
    });

    // Get viewing spreads
    // Note: 7-gon requires compound, this function only handles truncated tet (5-gon)
    let s1, s2, s3;
    if (n === 5) {
      s1 = 0;
      s2 = 0;
      s3 = 0.5;
    } else {
      // Default/fallback - no rotation
      s1 = 0;
      s2 = 0;
      s3 = 0;
    }

    // Build rotation matrix from spreads
    const sin1 = Math.sqrt(s1),
      cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2),
      cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3),
      cos3 = Math.sqrt(1 - s3);

    const Rz = [
      [cos1, -sin1, 0],
      [sin1, cos1, 0],
      [0, 0, 1],
    ];
    const Ry = [
      [cos2, 0, sin2],
      [0, 1, 0],
      [-sin2, 0, cos2],
    ];
    const Rx = [
      [1, 0, 0],
      [0, cos3, -sin3],
      [0, sin3, cos3],
    ];

    const matMul = (A, B) =>
      A.map((row, i) =>
        B[0].map((_, j) =>
          row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0)
        )
      );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Apply rotation and project to 2D (in rotated frame)
    const projected2D = truncTetVertices.map(v => {
      const rx = R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2];
      const ry = R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2];
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
  _createRegularPolygonVerticesFixed: function (
    n,
    radius,
    planeRight,
    planeUp
  ) {
    const nGonVerts = RT.nGonVertices(n, radius).vertices;
    const vertices = [];
    for (let i = 0; i <= n; i++) {
      const v = nGonVerts[i % n];
      const vertex = new THREE.Vector3()
        .addScaledVector(planeRight, v.x)
        .addScaledVector(planeUp, v.y);
      vertices.push(vertex);
    }
    return vertices;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CUTPLANE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

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

    // Get reference to RTPapercut for state updates
    const papercut = RTPrimeCuts._papercutRef;
    if (!papercut) {
      console.warn(
        "⚠️ RTPapercut reference not set, cutplane integration unavailable"
      );
      return;
    }

    // Create clipping plane with the projection normal, passing through origin
    // THREE.Plane(normal, constant) where constant = -d (distance from origin)
    const plane = new THREE.Plane(planeNormal.clone(), 0);

    // Update state
    papercut.state.cutplaneEnabled = true;
    papercut.state.cutplaneNormal = plane;
    papercut.state.cutplaneValue = 0;

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
    if (RTPrimeCuts._renderer) {
      RTPrimeCuts._renderer.localClippingEnabled = true;
    }

    // Generate intersection edges (if papercut has this method)
    if (papercut._generateIntersectionEdges) {
      papercut._generateIntersectionEdges(scene, plane);
    }

    console.log(
      `   ✓ Cutplane active with normal: (${planeNormal.x.toFixed(3)}, ${planeNormal.y.toFixed(3)}, ${planeNormal.z.toFixed(3)})`
    );
  },

  /**
   * Deactivate the prime projection cutplane
   * Called when hiding the prime polygon overlay
   *
   * @param {THREE.Scene} scene - Scene reference
   */
  _deactivatePrimeProjectionCutplane: function (scene) {
    console.log("✂️ Deactivating prime projection cutplane");

    // Get reference to RTPapercut for state updates
    const papercut = RTPrimeCuts._papercutRef;

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
    if (RTPrimeCuts._renderer) {
      RTPrimeCuts._renderer.localClippingEnabled = false;
    }

    // Remove intersection lines (if papercut has reference)
    if (papercut && papercut._intersectionLines) {
      scene.remove(papercut._intersectionLines);
      papercut._intersectionLines.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      papercut._intersectionLines = null;
    }

    // Update state
    if (papercut) {
      papercut.state.cutplaneEnabled = false;
      papercut.state.cutplaneNormal = null;
    }

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

  // ═══════════════════════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════════════════════

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
        // 7-gon: TruncTet+Tet compound at same angle as 5-gon
        // The 4 tet vertices extend the 5-hull to 7-hull
        formulaText =
          "YELLOW: Actual 7-hull projection\n" +
          "  Compound (TruncTet + Tet) 16v\n" +
          "  s=(0, 0, 0.5) same as 5-gon\n" +
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
          "  Fermat prime - compass constructible";
        break;

      case 11:
        // 11-gon: BREAKTHROUGH - Compound polyhedra
        // Python search verified: s=(0, 0.4, 0.2) from TruncTet+Icosa (24v)
        formulaText =
          "★ BREAKTHROUGH: Hendecagon (11-gon)\n" +
          "  Compound (Trunc Tet + Icosa) 24v\n" +
          "  s=(0, 0.4, 0.2)\n" +
          "  Bypasses Gauss-Wantzel theorem!\n" +
          "  Quintic polynomial - NOT solvable by radicals";
        break;

      case 13:
        // 13-gon: BREAKTHROUGH - Compound polyhedra
        // Viewing spreads: s=(0, 0.6, 0.8)
        formulaText =
          "★ BREAKTHROUGH: Tridecagon (13-gon)\n" +
          "  Compound (Trunc Tet + Icosa)\n" +
          "  s=(0, 0.6, 0.8) → 24 vertices\n" +
          "  Bypasses Gauss-Wantzel theorem!\n" +
          "  Sextic polynomial - NOT solvable by radicals";
        break;

      default: {
        // Generic n-gon info
        const s = RT.centralSpread(n);
        formulaText =
          `YELLOW: Actual projection (irregular)\n` +
          `CYAN: Ideal regular ${n}-gon\n` +
          `  s = sin²(π/${n}) ≈ ${s.toFixed(4)}`;
      }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION SYSTEM
  // Validates that implemented projections match source data.
  // Call verifyAllProjections() on init or via console to catch mismatches.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the verified projections registry
   * @returns {Object} The VERIFIED_PROJECTIONS registry
   */
  getProjectionRegistry: function () {
    return VERIFIED_PROJECTIONS;
  },

  /**
   * Generate vertices for a compound type (for verification)
   * @param {string} compoundType - "truncatedTetrahedron", "truncTetPlusTet", "truncTetPlusIcosa"
   * @returns {Array<Array<number>>} Array of [x,y,z] vertices (normalized)
   */
  _getVerificationVertices: function (compoundType) {
    // Truncated tetrahedron vertices (normalized)
    const truncTetVertices = [
      [3, 1, 1],
      [3, -1, -1],
      [1, 3, 1],
      [1, -3, -1],
      [1, 1, 3],
      [1, -1, -3],
      [-3, 1, -1],
      [-3, -1, 1],
      [-1, 3, -1],
      [-1, -3, 1],
      [-1, 1, -3],
      [-1, -1, 3],
    ].map(v => {
      const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      return [v[0] / len, v[1] / len, v[2] / len];
    });

    // Tetrahedron vertices (normalized, for TruncTet+Tet compound)
    const tetVertices = [
      [1, 1, 1],
      [1, -1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
    ].map(v => {
      const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      return [v[0] / len, v[1] / len, v[2] / len];
    });

    // Icosahedron vertices (normalized, for TruncTet+Icosa compound)
    const phi = RT.PurePhi.value();
    const icosaVertices = [
      [0, 1, phi],
      [0, 1, -phi],
      [0, -1, phi],
      [0, -1, -phi],
      [1, phi, 0],
      [1, -phi, 0],
      [-1, phi, 0],
      [-1, -phi, 0],
      [phi, 0, 1],
      [phi, 0, -1],
      [-phi, 0, 1],
      [-phi, 0, -1],
    ].map(v => {
      const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      return [v[0] / len, v[1] / len, v[2] / len];
    });

    switch (compoundType) {
      case "truncatedTetrahedron":
        return truncTetVertices;
      case "truncTetPlusTet":
        return [...truncTetVertices, ...tetVertices];
      case "truncTetPlusIcosa":
        return [...truncTetVertices, ...icosaVertices];
      default:
        console.error(`Unknown compound type: ${compoundType}`);
        return [];
    }
  },

  /**
   * Project vertices and compute hull with interior angles
   * @param {Array<Array<number>>} vertices - Array of [x,y,z] vertices
   * @param {Array<number>} spreads - [s1, s2, s3] rotation spreads
   * @returns {{hullCount: number, interiorAngles: Array<number>, maxAngle: number}}
   */
  _projectAndAnalyze: function (vertices, spreads) {
    const [s1, s2, s3] = spreads;

    // Build rotation matrix from spreads (ZYX Euler)
    const sin1 = Math.sqrt(s1),
      cos1 = Math.sqrt(1 - s1);
    const sin2 = Math.sqrt(s2),
      cos2 = Math.sqrt(1 - s2);
    const sin3 = Math.sqrt(s3),
      cos3 = Math.sqrt(1 - s3);

    const Rz = [
      [cos1, -sin1, 0],
      [sin1, cos1, 0],
      [0, 0, 1],
    ];
    const Ry = [
      [cos2, 0, sin2],
      [0, 1, 0],
      [-sin2, 0, cos2],
    ];
    const Rx = [
      [1, 0, 0],
      [0, cos3, -sin3],
      [0, sin3, cos3],
    ];

    const matMul = (A, B) =>
      A.map((row, i) =>
        B[0].map((_, j) =>
          row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0)
        )
      );
    const R = matMul(Rz, matMul(Ry, Rx));

    // Project to 2D (XY plane after rotation)
    const projected2D = vertices.map(v => ({
      x: R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2],
      y: R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2],
    }));

    // Compute convex hull
    const hull = this._computeConvexHull2D(projected2D);

    // Compute interior angles
    const interiorAngles = [];
    for (let i = 0; i < hull.length; i++) {
      const prev = hull[(i - 1 + hull.length) % hull.length];
      const curr = hull[i];
      const next = hull[(i + 1) % hull.length];

      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };

      const dot = v1.x * v2.x + v1.y * v2.y;
      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      const cosAng = Math.max(-1, Math.min(1, dot / (len1 * len2 + 1e-10)));
      interiorAngles.push((Math.acos(cosAng) * 180) / Math.PI);
    }

    return {
      hullCount: hull.length,
      interiorAngles,
      maxAngle: Math.max(...interiorAngles),
    };
  },

  /**
   * Verify a single projection configuration
   * @param {number} n - Prime polygon sides (5, 7, 11, 13)
   * @returns {{passed: boolean, details: Object}}
   */
  verifyProjection: function (n) {
    const config = VERIFIED_PROJECTIONS[n];
    if (!config) {
      console.error(`❌ No verified projection for ${n}-gon`);
      return { passed: false, details: { error: "No configuration found" } };
    }

    const vertices = this._getVerificationVertices(config.compound);
    if (vertices.length !== config.vertexCount) {
      console.error(
        `❌ ${n}-gon: Vertex count mismatch: ${vertices.length} vs expected ${config.vertexCount}`
      );
      return {
        passed: false,
        details: {
          error: "Vertex count mismatch",
          got: vertices.length,
          expected: config.vertexCount,
        },
      };
    }

    const result = this._projectAndAnalyze(vertices, config.spreads);

    const hullOK = result.hullCount === config.expectedHull;
    const anglesOK = result.maxAngle < config.maxInteriorAngle;
    const passed = hullOK && anglesOK;

    const status = passed ? "✓" : "✗";
    const hullStatus = hullOK ? "✓" : `✗ got ${result.hullCount}`;
    const angleStatus = anglesOK ? "✓" : `✗ max=${result.maxAngle.toFixed(1)}°`;

    console.log(
      `${status} ${n}-gon (${config.name}): ` +
        `hull=${config.expectedHull} ${hullStatus}, ` +
        `angles<${config.maxInteriorAngle}° ${angleStatus}`
    );

    if (!passed) {
      console.log(`   Spreads: [${config.spreads.join(", ")}]`);
      console.log(`   Source: ${config.source}`);
      console.log(
        `   Interior angles: ${result.interiorAngles.map(a => a.toFixed(1)).join("°, ")}°`
      );
    }

    return {
      passed,
      details: {
        n,
        name: config.name,
        compound: config.compound,
        spreads: config.spreads,
        expectedHull: config.expectedHull,
        actualHull: result.hullCount,
        maxInteriorAngle: result.maxAngle,
        interiorAngles: result.interiorAngles,
        source: config.source,
      },
    };
  },

  /**
   * Verify all registered projections
   * Call on init (debug mode) or via console: RTPrimeCuts.verifyAllProjections()
   * @returns {{allPassed: boolean, results: Object}}
   */
  verifyAllProjections: function () {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("🔍 PRIME PROJECTION VERIFICATION");
    console.log("═══════════════════════════════════════════════════════════");

    const primes = Object.keys(VERIFIED_PROJECTIONS)
      .map(Number)
      .sort((a, b) => a - b);
    const results = {};
    let allPassed = true;

    for (const n of primes) {
      const result = this.verifyProjection(n);
      results[n] = result;
      if (!result.passed) allPassed = false;
    }

    console.log("═══════════════════════════════════════════════════════════");
    if (allPassed) {
      console.log(`✅ All ${primes.length} projections verified successfully`);
    } else {
      const failed = primes.filter(n => !results[n].passed);
      console.error(
        `❌ ${failed.length}/${primes.length} projections FAILED: ${failed.join(", ")}`
      );
    }
    console.log("═══════════════════════════════════════════════════════════");

    return { allPassed, results };
  },

  /**
   * Search for spreads that produce a target hull count
   * Uses SCENE vertices (extracted from visible polyhedron)
   * Call via console: RTPrimeCuts.searchSpreads(13)
   *
   * @param {number} targetHull - Target hull vertex count (e.g., 13)
   * @param {Object} options - Search options
   * @returns {Array<Object>} Array of {spreads, hullCount} matches
   */
  searchSpreads: function (targetHull, options = {}) {
    const {
      step = 0.1,
      minSpread = 0,
      maxSpread = 1,
      polyhedronType = "primeCompoundIcosa",
    } = options;

    console.log(`🔍 Searching for ${targetHull}-gon spreads...`);
    console.log(`   Step: ${step}, Range: [${minSpread}, ${maxSpread}]`);

    // Get scene from RTProjections
    const scene = RTProjections._scene;
    if (!scene) {
      console.error(`⚠️ Scene not available - RTProjections not initialized`);
      return [];
    }

    // Find polyhedron in scene
    let targetGroup = null;
    scene.traverse(obj => {
      if (obj.userData?.type === polyhedronType) {
        targetGroup = obj;
      }
    });

    if (!targetGroup) {
      console.error(
        `⚠️ Polyhedron ${polyhedronType} not found in scene. Make sure it's visible.`
      );
      return [];
    }

    // Extract vertices from scene
    const vertices = RTProjections._getWorldVerticesFromGroup(targetGroup);
    console.log(`   Found ${vertices.length} vertices from scene`);

    // Convert to array format for projection
    const vertexArray = vertices.map(v => [v.x, v.y, v.z]);

    const matches = [];
    let tested = 0;

    for (let s1 = minSpread; s1 <= maxSpread; s1 += step) {
      for (let s2 = minSpread; s2 <= maxSpread; s2 += step) {
        for (let s3 = minSpread; s3 <= maxSpread; s3 += step) {
          const spreads = [s1, s2, s3];
          const result = this._projectAndAnalyze(vertexArray, spreads);
          tested++;

          if (result.hullCount === targetHull) {
            matches.push({
              spreads: spreads.map(s => Math.round(s * 100) / 100),
              hullCount: result.hullCount,
              maxAngle: result.maxAngle.toFixed(1),
            });
            console.log(
              `   ✓ Found: s=(${spreads.map(s => s.toFixed(2)).join(", ")}) → ${result.hullCount}-gon, max∠=${result.maxAngle.toFixed(1)}°`
            );
          }
        }
      }
    }

    console.log(
      `   Tested ${tested} combinations, found ${matches.length} matches`
    );
    return matches;
  },

  /**
   * Analyze what hull counts are achievable with current scene vertices
   * Call via console: RTPrimeCuts.analyzeHullDistribution()
   */
  analyzeHullDistribution: function (options = {}) {
    const { step = 0.1, polyhedronType = "primeCompoundIcosa" } = options;

    console.log(`📊 Analyzing hull distribution for ${polyhedronType}...`);

    const scene = RTProjections._scene;
    if (!scene) {
      console.error(`⚠️ Scene not available`);
      return;
    }

    let targetGroup = null;
    scene.traverse(obj => {
      if (obj.userData?.type === polyhedronType) {
        targetGroup = obj;
      }
    });

    if (!targetGroup) {
      console.error(`⚠️ Polyhedron ${polyhedronType} not found`);
      return;
    }

    const vertices = RTProjections._getWorldVerticesFromGroup(targetGroup);
    const vertexArray = vertices.map(v => [v.x, v.y, v.z]);
    console.log(`   Vertices: ${vertices.length}`);

    const hullCounts = {};
    let tested = 0;

    for (let s1 = 0; s1 <= 1; s1 += step) {
      for (let s2 = 0; s2 <= 1; s2 += step) {
        for (let s3 = 0; s3 <= 1; s3 += step) {
          const result = this._projectAndAnalyze(vertexArray, [s1, s2, s3]);
          const count = result.hullCount;
          hullCounts[count] = (hullCounts[count] || 0) + 1;
          tested++;
        }
      }
    }

    console.log(`   Tested ${tested} orientations:`);
    const sorted = Object.entries(hullCounts).sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );
    for (const [hull, count] of sorted) {
      const pct = ((100 * count) / tested).toFixed(1);
      const bar = "█".repeat(Math.ceil(count / 20));
      console.log(
        `   ${hull.padStart(2)}-gon: ${count.toString().padStart(4)} (${pct}%) ${bar}`
      );
    }

    return hullCounts;
  },
};
