/**
 * rt-rotor-demo.js
 * Spread-Quadray Rotor Interactive Demo for ARTexplorer
 *
 * Provides interactive visualization of the Spread-Quadray Rotor system:
 * - Gyroscope visualization object
 * - Gimbal lock zone surfaces
 * - Interactive gumball-style rotation handles
 * - Real-time info panel with RPM, axis, spread/cross values
 *
 * @requires THREE.js
 * @requires rt-quadray-rotor.js
 * @requires rt-math.js
 */

import { QuadrayRotor, QuadrayRotorState, CommonSpreads } from "./rt-quadray-rotor.js";
import { RT, Quadray } from "./rt-math.js";

/**
 * Demo configuration constants
 */
const DEMO_CONFIG = {
  // Gyroscope appearance
  gyroscopeRadius: 2.5,
  ringThickness: 0.08,
  diskOpacity: 0.3,

  // Gimbal lock zones
  lockZoneRadius: 2,
  warningAngles: [60, 75, 85],
  dangerZoneHeight: 2.5,

  // Interaction
  rotationSensitivity: 0.01,
  velocityDecay: 0.995,  // Slower decay for longer spin

  // Auto-spin settings
  defaultSpinRPM: 60,  // Start spinning at 60 RPM
  defaultSpinAxis: { x: 0, y: 0, z: 1 },  // Spin around Z-axis
  nudgeStrength: 0.3,  // How much a nudge affects the axis

  // Colors
  colors: {
    outerRing: 0x888888,
    middleRing: 0x00ff00,
    innerDisk: 0x4488ff,
    axisIndicator: 0xffff00,
    lockZoneDanger: 0xff0000,
    warningRings: [0xffff00, 0xff8800, 0xff4400],
    quadrayHandles: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00],
    cartesianHandles: [0xff5555, 0x55ff55, 0x5555ff]
  }
};

/**
 * RotorDemo - Main demo controller class
 */
export class RotorDemo {
  /**
   * Initialize the rotor demo
   *
   * @param {THREE.Scene} scene - THREE.js scene
   * @param {Object} THREE - THREE.js library reference
   */
  constructor(scene, THREE) {
    this.scene = scene;
    this.THREE = THREE;
    this.enabled = false;

    // State management
    this.rotorState = new QuadrayRotorState();

    // 3D objects
    this.demoGroup = null;
    this.spinningObject = null;  // The geodesic octahedron
    this.gimbalLockZones = null;
    this.handles = null;

    // UI elements
    this.infoPanel = null;

    // Interaction state
    this.isDragging = false;
    this.activeHandle = null;
    this.lastMousePos = null;

    // Rotation mode: 'quadray' (default) or 'euler'
    this.rotationMode = 'quadray';

    // Euler angle accumulator (for euler mode)
    this.eulerAngles = { x: 0, y: 0, z: 0 };
    this.eulerGlitchAccumulator = 0;  // Simulates gimbal lock jitter

    // Saved scene state (to restore on exit)
    this.savedSceneState = null;
  }

  /**
   * Save current scene state before demo takes over
   */
  saveSceneState() {
    this.savedSceneState = {
      // Checkbox states
      showCube: document.getElementById('showCube')?.checked,
      showDualTetrahedron: document.getElementById('showDualTetrahedron')?.checked,
      showGeodesicOctahedron: document.getElementById('showGeodesicOctahedron')?.checked,
      geodesicOctaFrequency: document.getElementById('geodesicOctaFrequency')?.value,
      showCartesianBasis: document.getElementById('showCartesianBasis')?.checked,
      showQuadray: document.getElementById('showQuadray')?.checked,
      showCartesianGrid: document.getElementById('showCartesianGrid')?.checked,
    };
    console.log('📦 Saved scene state for demo');
  }

  /**
   * Restore scene state after demo ends
   */
  restoreSceneState() {
    if (!this.savedSceneState) return;

    const state = this.savedSceneState;

    // Restore checkbox states and trigger change events
    const restore = (id, value) => {
      const el = document.getElementById(id);
      if (el && value !== undefined) {
        if (el.type === 'checkbox') {
          el.checked = value;
        } else {
          el.value = value;
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    restore('showCube', state.showCube);
    restore('showDualTetrahedron', state.showDualTetrahedron);
    restore('showGeodesicOctahedron', state.showGeodesicOctahedron);
    restore('geodesicOctaFrequency', state.geodesicOctaFrequency);
    restore('showCartesianBasis', state.showCartesianBasis);
    restore('showQuadray', state.showQuadray);
    restore('showCartesianGrid', state.showCartesianGrid);

    console.log('📦 Restored scene state after demo');
    this.savedSceneState = null;
  }

  /**
   * Configure scene for demo (hide distractions, show demo object)
   */
  configureSceneForDemo() {
    // Helper to set checkbox and trigger change
    const setCheckbox = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    // Hide default geometry
    setCheckbox('showCube', false);
    setCheckbox('showDualTetrahedron', false);

    // Hide grids for cleaner view
    setCheckbox('showCartesianBasis', false);
    setCheckbox('showQuadray', false);
    setCheckbox('showCartesianGrid', false);

    // Show Geodesic Octahedron 3F as the spinning object
    setCheckbox('showGeodesicOctahedron', true);
    setValue('geodesicOctaFrequency', '3');

    console.log('🎬 Configured scene for rotor demo');
  }

  /**
   * Enable/show the demo
   */
  enable() {
    if (this.enabled) return;

    this.enabled = true;

    // Save current scene state before modifying
    this.saveSceneState();

    // Configure scene for demo (hide distractions, show geodesic)
    this.configureSceneForDemo();

    // Create demo overlays (lock zones, handles, etc.)
    this.createDemoObjects();
    this.createInfoPanel();

    // Find the geodesic octahedron group to rotate
    this.findSpinningObject();

    // Start the top spinning automatically!
    this.startSpinning();

    this.startAnimation();

    console.log("✅ Spread-Quadray Rotor Demo enabled - Top is spinning!");
  }

  /**
   * Find the geodesic octahedron in the scene to use as spinning object
   * Called from animation loop to handle async scene updates
   */
  findSpinningObject() {
    // Already found?
    if (this.spinningObject) return;

    // Look for geodesic octahedron by userData.type (as set in rt-rendering.js)
    this.scene.traverse((obj) => {
      if (obj.userData?.type === 'geodesicOctahedron') {
        // Only use it if it has children (geometry has been generated)
        if (obj.children && obj.children.length > 0) {
          this.spinningObject = obj;
          console.log('🎯 Found geodesic octahedron for spinning! Children:', obj.children.length);
        }
      }
    });

    // Debug: if still not found, log what groups exist
    if (!this.spinningObject) {
      let foundGroups = [];
      this.scene.traverse((obj) => {
        if (obj.type === 'Group' && obj.children.length > 0) {
          foundGroups.push({
            name: obj.name || 'unnamed',
            type: obj.userData?.type || 'no-type',
            children: obj.children.length,
            visible: obj.visible
          });
        }
      });
      // Only log once per second to avoid spam
      if (!this._lastDebugLog || Date.now() - this._lastDebugLog > 1000) {
        console.log('🔍 Looking for spinning object. Available groups:', foundGroups.slice(0, 10));
        this._lastDebugLog = Date.now();
      }
    }
  }

  /**
   * Start the gyroscope spinning at default RPM
   */
  startSpinning() {
    const rpm = DEMO_CONFIG.defaultSpinRPM;
    const radiansPerSecond = (rpm * 2 * Math.PI) / 60;
    this.rotorState.setVelocity(radiansPerSecond, DEMO_CONFIG.defaultSpinAxis);
    console.log(`🔄 Spinning at ${rpm} RPM around Z-axis`);
  }

  /**
   * Disable/hide the demo
   */
  disable() {
    if (!this.enabled) return;

    this.enabled = false;

    // Reset spinning object rotation before restoring scene
    if (this.spinningObject) {
      this.spinningObject.quaternion.identity();
      this.spinningObject = null;
    }

    this.removeDemoObjects();
    this.removeInfoPanel();

    // Restore the scene to its previous state
    this.restoreSceneState();

    // Reset rotor state for next time
    this.rotorState = new QuadrayRotorState();

    console.log("❌ Spread-Quadray Rotor Demo disabled");
  }

  /**
   * Toggle demo on/off
   */
  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  }

  /**
   * Create all demo 3D objects
   */
  createDemoObjects() {
    const THREE = this.THREE;

    this.demoGroup = new THREE.Group();
    this.demoGroup.name = "RotorDemo";

    // Create axis indicator (yellow line showing spin axis)
    const axisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -4),
      new THREE.Vector3(0, 0, 4)
    ]);
    const axisMat = new THREE.LineBasicMaterial({
      color: DEMO_CONFIG.colors.axisIndicator,
      linewidth: 2
    });
    const axisLine = new THREE.Line(axisGeom, axisMat);
    axisLine.name = "AxisIndicator";
    this.demoGroup.add(axisLine);

    // Create gimbal lock zone visualization
    this.gimbalLockZones = this.createGimbalLockZones();
    this.demoGroup.add(this.gimbalLockZones);

    // Note: We're NOT creating rotation handles yet - using existing gumball
    // this.handles = this.createRotationHandles();
    // this.demoGroup.add(this.handles);

    this.scene.add(this.demoGroup);
  }

  /**
   * Remove demo objects from scene
   */
  removeDemoObjects() {
    if (this.demoGroup) {
      this.scene.remove(this.demoGroup);
      // Dispose geometries and materials
      this.demoGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.demoGroup = null;
      this.gyroscope = null;
      this.gimbalLockZones = null;
      this.handles = null;
    }
  }

  /**
   * Create the gyroscope visualization object
   * @returns {THREE.Group} Gyroscope group
   */
  createGyroscope() {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.name = "Gyroscope";

    const radius = DEMO_CONFIG.gyroscopeRadius;
    const thickness = DEMO_CONFIG.ringThickness;

    // Outer ring (horizon reference) - XY plane
    const outerRingGeom = new THREE.TorusGeometry(radius, thickness, 16, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: DEMO_CONFIG.colors.outerRing,
      transparent: true,
      opacity: 0.6
    });
    const outerRing = new THREE.Mesh(outerRingGeom, outerRingMat);
    outerRing.name = "OuterRing";
    group.add(outerRing);

    // Middle ring (tilt indicator) - XZ plane
    const middleRingGeom = new THREE.TorusGeometry(radius * 0.85, thickness, 16, 64);
    const middleRingMat = new THREE.MeshBasicMaterial({
      color: DEMO_CONFIG.colors.middleRing,
      transparent: true,
      opacity: 0.5
    });
    const middleRing = new THREE.Mesh(middleRingGeom, middleRingMat);
    middleRing.rotation.x = Math.PI / 2;
    middleRing.name = "MiddleRing";
    group.add(middleRing);

    // Inner ring (roll indicator) - YZ plane
    const innerRingGeom = new THREE.TorusGeometry(radius * 0.7, thickness, 16, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: DEMO_CONFIG.colors.innerDisk,
      transparent: true,
      opacity: 0.5
    });
    const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat);
    innerRing.rotation.y = Math.PI / 2;
    innerRing.name = "InnerRing";
    group.add(innerRing);

    // Central disk with direction marker
    const diskGeom = new THREE.CircleGeometry(radius * 0.5, 32);
    const diskMat = new THREE.MeshBasicMaterial({
      color: DEMO_CONFIG.colors.innerDisk,
      transparent: true,
      opacity: DEMO_CONFIG.diskOpacity,
      side: THREE.DoubleSide
    });
    const disk = new THREE.Mesh(diskGeom, diskMat);
    disk.name = "CentralDisk";
    group.add(disk);

    // Direction marker (arrow on disk)
    const arrowGeom = new THREE.ConeGeometry(0.2, 0.6, 8);
    const arrowMat = new THREE.MeshBasicMaterial({ color: DEMO_CONFIG.colors.axisIndicator });
    const arrow = new THREE.Mesh(arrowGeom, arrowMat);
    arrow.position.set(0, radius * 0.3, 0.1);
    arrow.rotation.x = Math.PI / 2;
    arrow.name = "DirectionMarker";
    group.add(arrow);

    // Axis indicator line (current rotation axis)
    const axisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -radius * 1.2),
      new THREE.Vector3(0, 0, radius * 1.2)
    ]);
    const axisMat = new THREE.LineBasicMaterial({
      color: DEMO_CONFIG.colors.axisIndicator,
      linewidth: 2
    });
    const axisLine = new THREE.Line(axisGeom, axisMat);
    axisLine.name = "AxisIndicator";
    group.add(axisLine);

    return group;
  }

  /**
   * Create gimbal lock zone visualizations
   * @returns {THREE.Group} Lock zones group
   */
  createGimbalLockZones() {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.name = "GimbalLockZones";

    const radius = DEMO_CONFIG.lockZoneRadius;
    const height = DEMO_CONFIG.dangerZoneHeight;

    // Danger zone disks (at Y = ±90° equivalent)
    const diskGeom = new THREE.CircleGeometry(radius, 32);
    const dangerMat = new THREE.MeshBasicMaterial({
      color: DEMO_CONFIG.colors.lockZoneDanger,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthTest: false
    });

    // North pole (Y = +90°)
    const northZone = new THREE.Mesh(diskGeom, dangerMat);
    northZone.position.y = height;
    northZone.rotation.x = -Math.PI / 2;
    northZone.name = "NorthLockZone";
    group.add(northZone);

    // South pole (Y = -90°)
    const southZone = new THREE.Mesh(diskGeom.clone(), dangerMat.clone());
    southZone.position.y = -height;
    southZone.rotation.x = Math.PI / 2;
    southZone.name = "SouthLockZone";
    group.add(southZone);

    // Warning rings at various angles
    DEMO_CONFIG.warningAngles.forEach((angleDeg, i) => {
      const angleRad = angleDeg * Math.PI / 180;
      const ringRadius = radius * Math.cos(angleRad);
      const ringHeight = height * Math.sin(angleRad) / (90 * Math.PI / 180);

      const ringGeom = new THREE.TorusGeometry(ringRadius, 0.02 + i * 0.01, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: DEMO_CONFIG.colors.warningRings[i],
        transparent: true,
        opacity: 0.3 + i * 0.1
      });

      // North warning ring
      const northRing = new THREE.Mesh(ringGeom, ringMat);
      northRing.position.y = ringHeight * (angleDeg / 90) * height / 2;
      northRing.rotation.x = -Math.PI / 2;
      northRing.name = `NorthWarning${angleDeg}`;
      group.add(northRing);

      // South warning ring
      const southRing = new THREE.Mesh(ringGeom.clone(), ringMat.clone());
      southRing.position.y = -ringHeight * (angleDeg / 90) * height / 2;
      southRing.rotation.x = Math.PI / 2;
      southRing.name = `SouthWarning${angleDeg}`;
      group.add(southRing);
    });

    return group;
  }

  /**
   * Create rotation handles (gumball-style)
   * @returns {THREE.Group} Handles group
   */
  createRotationHandles() {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.name = "RotationHandles";

    const handleRadius = DEMO_CONFIG.gyroscopeRadius * 1.3;
    const tubeRadius = 0.08;

    // Initialize Quadray basis vectors if needed
    if (!Quadray.basisVectors) {
      Quadray.init(THREE);
    }

    // Quadray handles (WXYZ - tetrahedral basis)
    Quadray.basisVectors.forEach((vec, i) => {
      const handle = this.createTorusHandle(
        vec,
        handleRadius,
        tubeRadius,
        DEMO_CONFIG.colors.quadrayHandles[i],
        {
          basisType: 'quadray',
          basisIndex: i,
          basisName: ['QX', 'QZ', 'QY', 'QW'][i]
        }
      );
      group.add(handle);
    });

    // Cartesian handles (XYZ - orthogonal basis)
    const cartesianAxes = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1)
    ];

    cartesianAxes.forEach((vec, i) => {
      const handle = this.createTorusHandle(
        vec,
        handleRadius * 1.1,
        tubeRadius * 0.8,
        DEMO_CONFIG.colors.cartesianHandles[i],
        {
          basisType: 'cartesian',
          basisIndex: i,
          basisName: ['X', 'Y', 'Z'][i]
        }
      );
      group.add(handle);
    });

    return group;
  }

  /**
   * Create a single torus rotation handle
   */
  createTorusHandle(axis, radius, tubeRadius, color, userData) {
    const THREE = this.THREE;

    const geom = new THREE.TorusGeometry(radius, tubeRadius, 16, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      depthTest: false
    });

    const handle = new THREE.Mesh(geom, mat);

    // Orient torus perpendicular to axis
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultNormal, axis);
    handle.setRotationFromQuaternion(quaternion);

    // Store metadata for interaction
    handle.userData = {
      ...userData,
      basisAxis: axis.clone(),
      isRotorHandle: true
    };

    handle.name = `Handle_${userData.basisName}`;

    return handle;
  }

  /**
   * Create the info panel DOM element
   */
  createInfoPanel() {
    // Check if panel already exists
    if (document.getElementById('rotor-info-panel')) {
      this.infoPanel = document.getElementById('rotor-info-panel');
      this.infoPanel.style.display = 'block';
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'rotor-info-panel';
    panel.innerHTML = `
      <style>
        #rotor-info-panel {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          padding: 15px;
          border-radius: 8px;
          min-width: 320px;
          z-index: 1000;
          border: 1px solid #444;
        }
        #rotor-info-panel h3 {
          margin: 0 0 10px 0;
          color: #0ff;
          font-size: 14px;
          border-bottom: 1px solid #444;
          padding-bottom: 5px;
        }
        #rotor-info-panel .section {
          margin-bottom: 12px;
        }
        #rotor-info-panel .section-title {
          color: #888;
          font-size: 10px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        #rotor-info-panel .row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        #rotor-info-panel .label {
          color: #888;
        }
        #rotor-info-panel .value {
          color: #0f0;
          font-weight: bold;
        }
        #rotor-info-panel .rotor-value {
          color: #ff0;
        }
        #rotor-info-panel .lock-bar {
          height: 16px;
          background: #333;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 4px;
        }
        #rotor-info-panel .lock-bar-fill {
          height: 100%;
          background: #0f0;
          width: 0%;
          transition: width 0.1s, background-color 0.1s;
        }
        #rotor-info-panel .status-safe { color: #0f0; }
        #rotor-info-panel .status-caution { color: #ff0; }
        #rotor-info-panel .status-danger { color: #f00; }
        #rotor-info-panel .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid #444;
          padding-bottom: 5px;
        }
        #rotor-info-panel .header h3 {
          margin: 0;
          border: none;
          padding: 0;
        }
        #rotor-info-panel .close-btn {
          background: #f44;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 4px 10px;
          cursor: pointer;
          font-size: 11px;
          font-weight: bold;
        }
        #rotor-info-panel .close-btn:hover {
          background: #f66;
        }
        #rotor-info-panel .controls {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        #rotor-info-panel .ctrl-btn {
          flex: 1;
          background: #333;
          color: #0ff;
          border: 1px solid #0ff;
          border-radius: 4px;
          padding: 6px;
          cursor: pointer;
          font-size: 10px;
        }
        #rotor-info-panel .ctrl-btn:hover {
          background: #0ff;
          color: #000;
        }
      </style>
      <div class="header">
        <h3>SPREAD-QUADRAY ROTOR</h3>
        <button class="close-btn" id="rp-close">✕ Close</button>
      </div>

      <div class="controls">
        <button class="ctrl-btn" id="rp-reset">Reset</button>
        <button class="ctrl-btn" id="rp-spin">Spin 60 RPM</button>
        <button class="ctrl-btn" id="rp-stop">Stop</button>
      </div>

      <div class="section">
        <div class="section-title">Nudge Spin Axis (toward gimbal lock)</div>
        <div class="controls" style="margin-top: 4px;">
          <button class="ctrl-btn" id="rp-nudge-x" style="flex: 1;">+X</button>
          <button class="ctrl-btn" id="rp-nudge-y" style="flex: 1; background: #533; border-color: #f88;">+Y (Lock)</button>
          <button class="ctrl-btn" id="rp-nudge-z" style="flex: 1;">+Z</button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Rotation Method</div>
        <div class="controls" style="margin-top: 4px;">
          <button class="ctrl-btn" id="rp-mode-quadray" style="flex: 1; background: #353; border-color: #8f8;">
            Quadray Rotor
          </button>
          <button class="ctrl-btn" id="rp-mode-euler" style="flex: 1;">
            Euler XYZ
          </button>
        </div>
        <div id="rp-mode-status" style="color: #8f8; font-size: 10px; margin-top: 4px; text-align: center;">
          Mode: Quadray Rotor (gimbal-lock free)
        </div>
      </div>

      <div class="section">
        <div class="section-title">Angular Velocity</div>
        <div class="row"><span class="label">RPM:</span><span class="value" id="rp-rpm">0.0</span></div>
        <div class="row"><span class="label">rad/s:</span><span class="value" id="rp-rads">0.00</span></div>
        <div class="row"><span class="label">deg/s:</span><span class="value" id="rp-degs">0.0</span></div>
      </div>

      <div class="section">
        <div class="section-title">Rotation Axis</div>
        <div class="row"><span class="label">XYZ:</span><span class="value" id="rp-axis-xyz">(0, 0, 1)</span></div>
        <div class="row"><span class="label">WXYZ:</span><span class="value" id="rp-axis-wxyz">(0, 0, 0, 1)</span></div>
        <div class="row"><span class="label">Angle:</span><span class="value" id="rp-angle">0.0°</span></div>
      </div>

      <div class="section">
        <div class="section-title">Rotor R = (W, X, Y, Z, ±)</div>
        <div class="row"><span class="label">W:</span><span class="rotor-value" id="rp-w">1.0000</span></div>
        <div class="row"><span class="label">X:</span><span class="rotor-value" id="rp-x">0.0000</span></div>
        <div class="row"><span class="label">Y:</span><span class="rotor-value" id="rp-y">0.0000</span></div>
        <div class="row"><span class="label">Z:</span><span class="rotor-value" id="rp-z">0.0000</span></div>
        <div class="row"><span class="label">±:</span><span class="rotor-value" id="rp-polarity">+1</span></div>
      </div>

      <div class="section">
        <div class="section-title">Spread / Cross (RT Measures)</div>
        <div class="row"><span class="label">s = sin²θ:</span><span class="value" id="rp-spread">0.0000</span></div>
        <div class="row"><span class="label">c = cos²θ:</span><span class="value" id="rp-cross">1.0000</span></div>
      </div>

      <div class="section">
        <div class="section-title">Gimbal Lock Proximity (Euler Reference)</div>
        <div class="row">
          <span class="label">Status:</span>
          <span class="value status-safe" id="rp-lock-status">SAFE</span>
          <span class="value" id="rp-lock-pct">0%</span>
        </div>
        <div class="lock-bar">
          <div class="lock-bar-fill" id="rp-lock-fill"></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.infoPanel = panel;

    // Wire up button event listeners
    document.getElementById('rp-close').addEventListener('click', () => {
      this.disable();
      // Also update the link in Math Demos
      const link = document.getElementById('open-rotor-demo');
      if (link) {
        link.style.color = '#7ab8ff';
        link.textContent = 'Spread-Quadray Rotors';
      }
    });

    document.getElementById('rp-reset').addEventListener('click', () => {
      this.reset();
      this.startSpinning();
    });

    document.getElementById('rp-spin').addEventListener('click', () => {
      this.startSpinning();
    });

    document.getElementById('rp-stop').addEventListener('click', () => {
      this.rotorState.setVelocity(0, { x: 0, y: 0, z: 1 });
    });

    // Nudge buttons - tilt the spin axis
    document.getElementById('rp-nudge-x').addEventListener('click', () => {
      this.nudgeAxis('x', 0.15);
    });
    document.getElementById('rp-nudge-y').addEventListener('click', () => {
      this.nudgeAxis('y', 0.15);  // Y nudge approaches gimbal lock
    });
    document.getElementById('rp-nudge-z').addEventListener('click', () => {
      this.nudgeAxis('z', 0.15);
    });

    // Mode toggle buttons
    document.getElementById('rp-mode-quadray').addEventListener('click', () => {
      this.setRotationMode('quadray');
    });
    document.getElementById('rp-mode-euler').addEventListener('click', () => {
      this.setRotationMode('euler');
    });
  }

  /**
   * Nudge the spin axis toward a given direction
   * This allows users to interactively approach gimbal lock
   */
  nudgeAxis(axis, amount) {
    const currentAxis = { ...this.rotorState.axis };

    // Add nudge component
    if (axis === 'x') currentAxis.x += amount;
    if (axis === 'y') currentAxis.y += amount;
    if (axis === 'z') currentAxis.z += amount;

    // Renormalize
    const len = Math.sqrt(currentAxis.x ** 2 + currentAxis.y ** 2 + currentAxis.z ** 2);
    if (len > 0.001) {
      currentAxis.x /= len;
      currentAxis.y /= len;
      currentAxis.z /= len;
    }

    this.rotorState.axis = currentAxis;

    // Log the nudge for visibility
    console.log(`🎯 Nudged axis toward ${axis.toUpperCase()}: (${currentAxis.x.toFixed(3)}, ${currentAxis.y.toFixed(3)}, ${currentAxis.z.toFixed(3)})`);

    // Check gimbal lock proximity
    const proximity = this.calculateEulerGimbalProximity(currentAxis);
    if (proximity > 0.5) {
      console.log(`⚠️ Gimbal Lock Proximity: ${(proximity * 100).toFixed(0)}% - ${this.rotationMode === 'euler' ? 'EULER MODE WILL STRUGGLE!' : 'Quadray Rotor handles this smoothly'}`);
    }
  }

  /**
   * Calculate gimbal lock proximity based on spin axis orientation
   * For Euler XYZ, lock occurs when Y-axis rotation approaches ±90°
   */
  calculateEulerGimbalProximity(axis) {
    // If axis is mostly aligned with Y, we're heading toward gimbal lock
    const yComponent = Math.abs(axis.y);
    // Danger starts when Y > 0.7 (about 45° from XZ plane)
    return Math.max(0, (yComponent - 0.5) / 0.5);
  }

  /**
   * Set rotation mode: 'quadray' or 'euler'
   */
  setRotationMode(mode) {
    this.rotationMode = mode;

    // Update button styles
    const quadrayBtn = document.getElementById('rp-mode-quadray');
    const eulerBtn = document.getElementById('rp-mode-euler');
    const statusEl = document.getElementById('rp-mode-status');

    if (mode === 'quadray') {
      quadrayBtn.style.background = '#353';
      quadrayBtn.style.borderColor = '#8f8';
      eulerBtn.style.background = '#333';
      eulerBtn.style.borderColor = '#0ff';
      statusEl.style.color = '#8f8';
      statusEl.textContent = 'Mode: Quadray Rotor (gimbal-lock free)';
      console.log('✅ Switched to Quadray Rotor mode - smooth rotation guaranteed');
    } else {
      quadrayBtn.style.background = '#333';
      quadrayBtn.style.borderColor = '#0ff';
      eulerBtn.style.background = '#533';
      eulerBtn.style.borderColor = '#f88';
      statusEl.style.color = '#f88';
      statusEl.textContent = 'Mode: Euler XYZ (gimbal lock possible!)';
      console.log('⚠️ Switched to Euler XYZ mode - watch for gimbal lock when Y-axis approaches ±90°');
    }
  }


  /**
   * Remove the info panel
   */
  removeInfoPanel() {
    if (this.infoPanel) {
      this.infoPanel.style.display = 'none';
    }
  }

  /**
   * Update info panel with current state
   */
  updateInfoPanel() {
    if (!this.infoPanel || !this.enabled) return;

    const state = this.rotorState.getDisplayState();

    // Angular velocity
    document.getElementById('rp-rpm').textContent = state.angularVelocity.rpm.toFixed(1);
    document.getElementById('rp-rads').textContent = state.angularVelocity.radiansPerSecond.toFixed(2);
    document.getElementById('rp-degs').textContent = state.angularVelocity.degreesPerSecond.toFixed(1);

    // Axis
    const ax = state.axisXYZ;
    document.getElementById('rp-axis-xyz').textContent =
      `(${ax.x.toFixed(3)}, ${ax.y.toFixed(3)}, ${ax.z.toFixed(3)})`;

    const aq = state.axisWXYZ;
    document.getElementById('rp-axis-wxyz').textContent =
      `(${aq.qw.toFixed(2)}, ${aq.qx.toFixed(2)}, ${aq.qy.toFixed(2)}, ${aq.qz.toFixed(2)})`;

    document.getElementById('rp-angle').textContent = `${state.angleDeg.toFixed(1)}°`;

    // Rotor components
    document.getElementById('rp-w').textContent = state.rotor.w.toFixed(4);
    document.getElementById('rp-x').textContent = state.rotor.x.toFixed(4);
    document.getElementById('rp-y').textContent = state.rotor.y.toFixed(4);
    document.getElementById('rp-z').textContent = state.rotor.z.toFixed(4);
    document.getElementById('rp-polarity').textContent = state.rotor.polarity > 0 ? '+1' : '-1';

    // Spread/Cross
    document.getElementById('rp-spread').textContent = state.spread.toFixed(4);
    document.getElementById('rp-cross').textContent = state.cross.toFixed(4);

    // Gimbal lock proximity
    const proximity = state.gimbalLockProximity;
    const pctText = `${(proximity * 100).toFixed(0)}%`;
    document.getElementById('rp-lock-pct').textContent = pctText;

    const fill = document.getElementById('rp-lock-fill');
    fill.style.width = pctText;

    // Color based on proximity
    const hue = (1 - proximity) * 120;
    fill.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;

    const statusEl = document.getElementById('rp-lock-status');
    if (proximity < 0.3) {
      statusEl.textContent = 'SAFE';
      statusEl.className = 'value status-safe';
    } else if (proximity < 0.7) {
      statusEl.textContent = 'CAUTION';
      statusEl.className = 'value status-caution';
    } else {
      statusEl.textContent = 'DANGER';
      statusEl.className = 'value status-danger';
    }

    // Update gimbal lock zone visibility
    this.updateLockZoneVisuals(proximity);
  }

  /**
   * Update gimbal lock zone opacity based on proximity
   */
  updateLockZoneVisuals(proximity) {
    if (!this.gimbalLockZones) return;

    this.gimbalLockZones.traverse((child) => {
      if (child.material) {
        const baseName = child.name;
        if (baseName.includes('LockZone')) {
          child.material.opacity = 0.15 + proximity * 0.4;
        } else if (baseName.includes('Warning')) {
          child.material.opacity = 0.3 + proximity * 0.3;
        }
      }
    });
  }

  /**
   * Apply rotation to spinning object based on current rotor state
   * Behavior differs based on rotation mode (quadray vs euler)
   */
  updateGyroscope() {
    if (!this.enabled) return;

    const THREE = this.THREE;

    if (this.rotationMode === 'quadray') {
      // === QUADRAY ROTOR MODE ===
      // Smooth, gimbal-lock-free rotation
      const rotor = this.rotorState.orientation.normalize();
      const quat = new THREE.Quaternion(rotor.x, rotor.y, rotor.z, rotor.w);

      if (this.spinningObject) {
        this.spinningObject.quaternion.copy(quat);
      }
    } else {
      // === EULER XYZ MODE ===
      // Demonstrates gimbal lock issues near Y = ±90°
      if (this.spinningObject) {
        // Convert current rotor to Euler angles (this is where problems arise!)
        const rotor = this.rotorState.orientation.normalize();

        // Extract Euler angles from quaternion
        // This conversion LOSES information near gimbal lock
        const matrix = rotor.toMatrix3();

        // Extract Euler XYZ from rotation matrix
        // Gimbal lock: when matrix[6] ≈ ±1 (Y rotation near ±90°)
        const sinY = Math.max(-1, Math.min(1, matrix[6]));
        let eulerX, eulerY, eulerZ;

        if (Math.abs(sinY) > 0.9999) {
          // GIMBAL LOCK! X and Z rotations become indistinguishable
          eulerY = Math.sign(sinY) * Math.PI / 2;
          eulerX = 0;  // Arbitrarily set X to 0
          eulerZ = Math.atan2(-matrix[1], matrix[4]);

          // Add visible jitter to show instability
          this.eulerGlitchAccumulator += 0.1;
          const jitter = Math.sin(this.eulerGlitchAccumulator * 10) * 0.05;
          eulerX += jitter;
          eulerZ += jitter * 1.5;

          // Log gimbal lock event (throttled)
          if (!this._lastGimbalLog || Date.now() - this._lastGimbalLog > 500) {
            console.log('🔒 GIMBAL LOCK! Euler angles unstable - X and Z conflated');
            this._lastGimbalLog = Date.now();
          }
        } else {
          // Normal case
          eulerY = Math.asin(sinY);
          const cosY = Math.cos(eulerY);
          eulerX = Math.atan2(-matrix[7] / cosY, matrix[8] / cosY);
          eulerZ = Math.atan2(-matrix[3] / cosY, matrix[0] / cosY);
          this.eulerGlitchAccumulator = 0;
        }

        // Apply Euler angles (with potential gimbal lock artifacts)
        this.spinningObject.rotation.set(eulerX, eulerY, eulerZ, 'XYZ');
      }
    }

    // Update the axis indicator in the demo group
    if (this.demoGroup) {
      const axisLine = this.demoGroup.getObjectByName('AxisIndicator');
      if (axisLine) {
        const spinAxis = this.rotorState.axis;
        const length = DEMO_CONFIG.gyroscopeRadius * 1.2;
        const positions = axisLine.geometry.attributes.position;
        positions.setXYZ(0, -spinAxis.x * length, -spinAxis.y * length, -spinAxis.z * length);
        positions.setXYZ(1, spinAxis.x * length, spinAxis.y * length, spinAxis.z * length);
        positions.needsUpdate = true;
      }
    }
  }

  /**
   * Start the animation loop
   */
  startAnimation() {
    const animate = (time) => {
      if (!this.enabled) return;

      // Keep trying to find spinning object until we get it
      // (handles async scene updates from checkbox changes)
      if (!this.spinningObject) {
        this.findSpinningObject();
      }

      this.rotorState.update(time);
      this.updateGyroscope();
      this.updateInfoPanel();

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  /**
   * Handle mouse/pointer down on handles
   */
  handlePointerDown(event, intersects) {
    if (!this.enabled || !intersects.length) return false;

    // Find if we hit a rotor handle
    for (const intersect of intersects) {
      if (intersect.object.userData.isRotorHandle) {
        this.isDragging = true;
        this.activeHandle = intersect.object;
        this.lastMousePos = { x: event.clientX, y: event.clientY };
        return true;
      }
    }

    return false;
  }

  /**
   * Handle mouse/pointer move while dragging
   */
  handlePointerMove(event) {
    if (!this.isDragging || !this.activeHandle) return;

    const deltaX = event.clientX - this.lastMousePos.x;
    const deltaY = event.clientY - this.lastMousePos.y;
    this.lastMousePos = { x: event.clientX, y: event.clientY };

    // Calculate rotation from drag
    const dragMagnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const spreadDelta = dragMagnitude * DEMO_CONFIG.rotationSensitivity;

    if (spreadDelta > 0.0001) {
      const axis = this.activeHandle.userData.basisAxis;
      const polarity = deltaX + deltaY > 0 ? +1 : -1;

      // Apply incremental rotation
      this.rotorState.applyIncrement(spreadDelta, axis, polarity);

      // Also set some angular velocity for continuous rotation
      const velocity = spreadDelta * 10;  // Scale up for visual effect
      this.rotorState.setVelocity(velocity * polarity, axis);
    }
  }

  /**
   * Handle mouse/pointer up
   */
  handlePointerUp() {
    this.isDragging = false;
    this.activeHandle = null;

    // Apply velocity decay
    this.rotorState.angularVelocity *= DEMO_CONFIG.velocityDecay;
  }

  /**
   * Apply a specific rotation for testing
   */
  applyTestRotation(degrees, axis) {
    const rotor = QuadrayRotor.fromDegreesAxis(degrees, axis);
    this.rotorState.orientation = this.rotorState.orientation.multiply(rotor);
  }

  /**
   * Reset to identity rotation
   */
  reset() {
    this.rotorState = new QuadrayRotorState();
  }
}

/**
 * Export singleton creator for easy integration
 */
let demoInstance = null;

export function getRotorDemo(scene, THREE) {
  if (!demoInstance) {
    demoInstance = new RotorDemo(scene, THREE);
  }
  return demoInstance;
}

export function destroyRotorDemo() {
  if (demoInstance) {
    demoInstance.disable();
    demoInstance = null;
  }
}
