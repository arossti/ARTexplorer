/**
 * RT-Cross-Demo
 * Interactive demonstration of Cross (c) in Rational Trigonometry
 * Shows Cross as the complement of Spread in the fundamental identity: s + c = 1
 *
 * Key RT Concepts:
 * - Cross (c) = cos²(θ) = x² (horizontal quadrance on unit circle)
 * - Spread (s) = sin²(θ) = y² (vertical quadrance on unit circle)
 * - RT Fundamental Identity: s + c = 1
 * - Cross measures "parallelism" (how aligned with horizontal)
 * - Spread measures "perpendicularity" (how aligned with vertical)
 */

import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { create2DScene, initializeModalHandlers } from "./rt-demo-utils.js";
import { RT } from "../modules/rt-math.js";

let scene, camera, renderer, animate, cleanup;
let circle, radiusLine;
// Visual elements for cross/spread bars (educational - available for future visualization)
// let crossBar, spreadBar;
let draggablePoint;
let isDragging = false;
let angle = Math.PI / 4; // Start at 45 degrees (s = c = 0.5)
let radius = 1.5;
let formulaElement;
let snapMarkers = [];
let crossRectangle, spreadRectangle;
let crossRectangleFill, spreadRectangleFill;
let trackingLines = [];
let displayMode = "decimal"; // "decimal" or "sexagesimal"

// Snappoints for exact rational cross/spread values
const snapPoints = [
  // Cardinal directions
  { x: 1, y: 0, c: 1.0, s: 0.0, label: "c=1", type: "cardinal" }, // 0°
  { x: 0, y: 1, c: 0.0, s: 1.0, label: "s=1", type: "cardinal" }, // 90°

  // 45° - Exact rational 1/2
  {
    x: 1 / Math.sqrt(2),
    y: 1 / Math.sqrt(2),
    c: 0.5,
    s: 0.5,
    label: "c=s=½",
    type: "special",
  },

  // 30-60-90 triangle points
  {
    x: Math.sqrt(3) / 2,
    y: 0.5,
    c: 0.75,
    s: 0.25,
    label: "c=¾",
    type: "rational",
  },
  {
    x: 0.5,
    y: Math.sqrt(3) / 2,
    c: 0.25,
    s: 0.75,
    label: "s=¾",
    type: "rational",
  },
];

// Generate hundredths interval diamond snap points (0.01, 0.02, ... 0.99)
const diamondSnapPoints = [];
for (let i = 1; i < 100; i++) {
  const spreadValue = i / 100;
  const crossValue = 1 - spreadValue;

  // Skip if already covered by main snapPoints
  const isMainSnap = snapPoints.some(
    snap => Math.abs(snap.s - spreadValue) < 0.001
  );

  if (!isMainSnap && spreadValue > 0 && spreadValue < 1) {
    const y = Math.sqrt(spreadValue);
    const x = Math.sqrt(crossValue);
    diamondSnapPoints.push({
      x,
      y,
      c: crossValue,
      s: spreadValue,
      type: "diamond",
      label: null, // No label for these
    });
  }
}

const SNAP_THRESHOLD = 0.04; // radians (~2.3°)

// RT-PURE: 7-frequency icosahedral geodesic tracking angles
// Derived from spread values using RT methods (no transcendental functions)
// Each entry: { s: spread, c: cross, x: cos(θ), y: sin(θ) }
// For Q1 arc, we work directly with x = √c and y = √s on unit circle
const geodesicTrackingAngles = [
  { s: 0.0, c: 1.0, label: "0°" }, // 0° - horizontal (cardinal)
  { s: 0.035, c: 0.965, label: "10.8°" }, // ~10.81° - Class I edge
  { s: 0.127, c: 0.873, label: "20.9°" }, // ~20.90° - Class II
  { s: 0.275, c: 0.725, label: "31.7°" }, // ~31.72° - Class I vertex
  { s: 0.37, c: 0.63, label: "37.4°" }, // ~37.38° - Class II
  { s: 0.5, c: 0.5, label: "45°" }, // 45° - diagonal (exact rational!)
  { s: 0.63, c: 0.37, label: "52.6°" }, // ~52.62° - Class II
  { s: 0.725, c: 0.275, label: "58.3°" }, // ~58.28° - Class I vertex
  { s: 0.873, c: 0.127, label: "69.1°" }, // ~69.10° - Class II
  { s: 0.965, c: 0.035, label: "79.2°" }, // ~79.19° - Class I edge
  { s: 1.0, c: 0.0, label: "90°" }, // 90° - vertical (cardinal)
];

/**
 * Initialize the Cross demo
 */
export function initCrossDemo() {
  const container = document.getElementById("cross-demo-container");
  if (!container) return;

  // Create 2D scene with purple/magenta theme to distinguish from other demos
  const sceneData = create2DScene(container, {
    backgroundColor: 0x1a001a, // Dark purple background
    cameraSize: 1.2, // Zoomed for Q1 focus
  });

  ({ scene, camera, renderer, animate, cleanup } = sceneData);

  // Shift camera to center on Q1 (positive x, positive y quadrant)
  camera.position.x = radius * 0.45;
  camera.position.y = radius * 0.45;

  // Create visual elements
  createAxes();
  createCircle();
  createGeodesicTrackingLines();
  createSnapMarkers();
  createComplementaryRectangles();
  createRadiusLine();
  createDraggablePoint();
  createFormulaDisplay();

  // Set up interaction
  setupInteraction(container);

  // Start animation loop
  const renderLoop = () => {
    animate();
    requestAnimationFrame(renderLoop);
  };
  renderLoop();

  // Initialize modal handlers
  initializeModalHandlers("cross-modal");

  // Initial update
  updateVisualization();
}

/**
 * Create coordinate axes (Q1 only - positive X and Y)
 */
function createAxes() {
  const axisWidth = 2;

  // X axis (positive only, red)
  const xAxisGeometry = new LineGeometry();
  xAxisGeometry.setPositions([0, 0, 0, radius, 0, 0]);
  const xAxisMaterial = new LineMaterial({
    color: 0xff0000,
    linewidth: axisWidth,
  });
  xAxisMaterial.resolution.set(window.innerWidth, window.innerHeight);
  const xAxis = new Line2(xAxisGeometry, xAxisMaterial);
  scene.add(xAxis);

  // Y axis (positive only, green)
  const yAxisGeometry = new LineGeometry();
  yAxisGeometry.setPositions([0, 0, 0, 0, radius, 0]);
  const yAxisMaterial = new LineMaterial({
    color: 0x00ff00,
    linewidth: axisWidth,
  });
  yAxisMaterial.resolution.set(window.innerWidth, window.innerHeight);
  const yAxis = new Line2(yAxisGeometry, yAxisMaterial);
  scene.add(yAxis);
}

/**
 * Create geodesic tracking lines (hairline radius lines for tracking windows)
 * RT-PURE: Uses spread (s) and cross (c) directly, no trigonometry!
 */
function createGeodesicTrackingLines() {
  const container = document.getElementById("cross-demo-container");

  geodesicTrackingAngles.forEach((angle, index) => {
    // RT METHOD: Extract x and y from cross and spread
    // For unit circle: x = √c, y = √s
    // Only sqrt needed - deferred until final step (Wildberger principle)
    const x = Math.sqrt(angle.c) * radius * 1.1; // Extend 10% past arc
    const y = Math.sqrt(angle.s) * radius * 1.1;

    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions([0, 0, 0, x, y, 0]);

    const lineMaterial = new LineMaterial({
      color: 0xbbbbbb, // Brighter gray (was 0x444444)
      linewidth: 0.5,
      transparent: true,
      opacity: 0.5, // Increased from 0.3
    });
    lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

    const line = new Line2(lineGeometry, lineMaterial);
    line.position.z = 0.005; // Behind other elements
    scene.add(line);
    trackingLines.push(line);

    // Add label to one of the middle tracking lines (index 5 is 45°)
    if (index === 5) {
      const label = document.createElement("div");
      const rect = container.getBoundingClientRect();
      const aspect = rect.width / rect.height;
      const cameraSize = 1.2;
      const cameraOffsetX = radius * 0.45;
      const cameraOffsetY = radius * 0.45;

      // Position label along the 45° line, about 80% out
      const labelX = x * 0.8;
      const labelY = y * 0.8;

      const screenX =
        50 + ((labelX - cameraOffsetX) / (cameraSize * aspect)) * 50;
      const screenY = 50 - ((labelY - cameraOffsetY) / cameraSize) * 50;

      label.style.cssText = `
        position: absolute;
        left: ${screenX}%;
        top: ${screenY}%;
        transform: translate(-50%, -50%);
        color: #bbbbbb;
        font-family: 'Courier New', monospace;
        font-size: 9px;
        font-weight: normal;
        pointer-events: none;
        text-shadow: 0 0 3px rgba(0,0,0,0.8);
        white-space: nowrap;
      `;
      label.textContent = "7f Icosahedral Geodesic Windows";
      container.appendChild(label);
    }
  });
}

/**
 * Create the Q1 arc (0° to 90° only) using RT parametrization
 */
function createCircle() {
  // RT METHOD: Generate arc using Weierstrass parametrization
  const points = [];
  const numPoints = 64;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const t_squared = t * t;
    const denominator = 1 + t_squared;
    const x = ((1 - t_squared) / denominator) * radius;
    const y = ((2 * t) / denominator) * radius;
    points.push(new THREE.Vector3(x, y, 0));
  }

  const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const arcMaterial = new THREE.LineBasicMaterial({
    color: 0x888888,
    linewidth: 1,
  });
  circle = new THREE.Line(arcGeometry, arcMaterial);
  scene.add(circle);
}

/**
 * Create snap point markers
 */
function createSnapMarkers() {
  const container = document.getElementById("cross-demo-container");

  // Create main labeled snap points
  snapPoints.forEach(snap => {
    const x = radius * snap.x;
    const y = radius * snap.y;

    let markerGeometry, markerColor, labelColor;

    if (snap.type === "cardinal") {
      markerGeometry = new THREE.CircleGeometry(0.03, 16);
      markerColor = 0x666666;
      labelColor = "#666666";
    } else if (snap.type === "special") {
      // Orange for 45° (c = s = 0.5)
      markerGeometry = new THREE.CircleGeometry(0.03, 16);
      markerColor = 0xff8800;
      labelColor = "#ff8800";
    } else {
      // Cyan for rational values
      markerGeometry = new THREE.CircleGeometry(0.03, 16);
      markerColor = 0x00cccc;
      labelColor = "#00cccc";
    }

    const markerMaterial = new THREE.MeshBasicMaterial({
      color: markerColor,
      transparent: true,
      opacity: 0.6,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(x, y, 0.02);
    scene.add(marker);
    snapMarkers.push(marker);

    // Create label
    const label = document.createElement("div");
    const rect = container.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    const cameraSize = 1.2;
    const cameraOffsetX = radius * 0.45;
    const cameraOffsetY = radius * 0.45;

    const labelOffset = 0.15;
    const labelX = x + (x / radius) * labelOffset;
    const labelY = y + (y / radius) * labelOffset;

    const screenX =
      50 + ((labelX - cameraOffsetX) / (cameraSize * aspect)) * 50;
    const screenY = 50 - ((labelY - cameraOffsetY) / cameraSize) * 50;

    label.style.cssText = `
      position: absolute;
      left: ${screenX}%;
      top: ${screenY}%;
      transform: translate(-50%, -50%);
      color: ${labelColor};
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: bold;
      pointer-events: none;
      text-shadow: 0 0 3px rgba(0,0,0,0.8);
    `;
    label.textContent = snap.label;
    container.appendChild(label);
  });

  // Create diamond snap points for hundredths intervals
  diamondSnapPoints.forEach(snap => {
    const x = radius * snap.x;
    const y = radius * snap.y;

    // Create diamond shape (rotated square)
    const diamondShape = new THREE.Shape();
    const size = 0.02;
    diamondShape.moveTo(0, size);
    diamondShape.lineTo(size, 0);
    diamondShape.lineTo(0, -size);
    diamondShape.lineTo(-size, 0);
    diamondShape.lineTo(0, size);

    const diamondGeometry = new THREE.ShapeGeometry(diamondShape);
    const diamondMaterial = new THREE.MeshBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.4,
    });

    const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial);
    diamond.position.set(x, y, 0.01);
    scene.add(diamond);
    snapMarkers.push(diamond);
  });
}

/**
 * Create complementary rectangles showing Cross (c) and Spread (s)
 */
function createComplementaryRectangles() {
  // Cross rectangle (horizontal component) - BLUE
  const crossFillGeometry = new THREE.BufferGeometry();
  const crossFillVertices = new Float32Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  crossFillGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(crossFillVertices, 3)
  );
  crossFillGeometry.setIndex([0, 1, 2, 0, 2, 3]);

  const crossFillMaterial = new THREE.MeshBasicMaterial({
    color: 0x4a9eff, // Blue for cross (horizontal/parallel)
    transparent: true,
    opacity: 0.3,
    side: THREE.FrontSide, // Backface culling enabled (2026-01-11)
  });

  crossRectangleFill = new THREE.Mesh(crossFillGeometry, crossFillMaterial);
  crossRectangleFill.position.z = -0.03;
  scene.add(crossRectangleFill);

  // Cross rectangle outline
  const crossGeometry = new LineGeometry();
  crossGeometry.setPositions([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const crossMaterial = new LineMaterial({
    color: 0x4a9eff,
    linewidth: 2,
    transparent: true,
    opacity: 0.8,
  });
  crossMaterial.resolution.set(window.innerWidth, window.innerHeight);
  crossRectangle = new Line2(crossGeometry, crossMaterial);
  crossRectangle.position.z = -0.02;
  scene.add(crossRectangle);

  // Spread rectangle (vertical component) - ORANGE/RED
  const spreadFillGeometry = new THREE.BufferGeometry();
  const spreadFillVertices = new Float32Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  spreadFillGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(spreadFillVertices, 3)
  );
  spreadFillGeometry.setIndex([0, 1, 2, 0, 2, 3]);

  const spreadFillMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6600, // Orange for spread (vertical/perpendicular)
    transparent: true,
    opacity: 0.3,
    side: THREE.FrontSide, // Backface culling enabled (2026-01-11)
  });

  spreadRectangleFill = new THREE.Mesh(spreadFillGeometry, spreadFillMaterial);
  spreadRectangleFill.position.z = -0.03;
  scene.add(spreadRectangleFill);

  // Spread rectangle outline
  const spreadGeometry = new LineGeometry();
  spreadGeometry.setPositions([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const spreadMaterial = new LineMaterial({
    color: 0xff6600,
    linewidth: 2,
    transparent: true,
    opacity: 0.8,
  });
  spreadMaterial.resolution.set(window.innerWidth, window.innerHeight);
  spreadRectangle = new Line2(spreadGeometry, spreadMaterial);
  spreadRectangle.position.z = -0.02;
  scene.add(spreadRectangle);
}

/**
 * Create radius line
 */
function createRadiusLine() {
  const radiusGeometry = new LineGeometry();
  const radiusMaterial = new LineMaterial({
    color: 0xffffff,
    linewidth: 2,
  });
  radiusMaterial.resolution.set(window.innerWidth, window.innerHeight);
  radiusLine = new Line2(radiusGeometry, radiusMaterial);
  radiusLine.position.z = 0.01;
  scene.add(radiusLine);
}

/**
 * Create draggable point on circle (hollow ring/crosshair style)
 */
function createDraggablePoint() {
  // Create hollow ring instead of solid circle
  const ringGeometry = new THREE.RingGeometry(0.04, 0.05, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.FrontSide, // Backface culling enabled (2026-01-11)
  });
  draggablePoint = new THREE.Mesh(ringGeometry, ringMaterial);
  draggablePoint.position.z = 0.02;
  scene.add(draggablePoint);
}

/**
 * Create formula display panel
 */
function createFormulaDisplay() {
  const container = document.getElementById("cross-demo-container");

  // Title overlay (top-left)
  const titleElement = document.createElement("div");
  titleElement.style.cssText = `
    position: absolute;
    top: 10px;
    left: 15px;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
    pointer-events: none;
  `;
  titleElement.textContent = "Cross (c) - The Complement of Spread";
  container.appendChild(titleElement);

  // Sexagesimal toggle button (centered at top)
  const toggleButton = document.createElement("button");
  toggleButton.style.cssText = `
    position: absolute;
    top: 50px;
    left: 50%;
    transform: translateX(-50%);
    width: 260px;
    padding: 8px 12px;
    background: rgba(26, 0, 26, 0.95);
    border: 1px solid #cc00cc;
    border-radius: 4px;
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 10;
  `;
  toggleButton.textContent = "Base-60 (Sexagesimal)";
  toggleButton.onmouseover = () => {
    toggleButton.style.background = "rgba(204, 0, 204, 0.3)";
  };
  toggleButton.onmouseout = () => {
    toggleButton.style.background = "rgba(26, 0, 26, 0.95)";
  };
  toggleButton.onclick = () => {
    displayMode = displayMode === "decimal" ? "sexagesimal" : "decimal";
    toggleButton.textContent =
      displayMode === "decimal" ? "Base-60 (Sexagesimal)" : "Base-10 (Decimal)";
    updateVisualization();
  };
  container.appendChild(toggleButton);

  // Close button
  const closeButton = document.createElement("button");
  closeButton.className = "close-modal";
  closeButton.innerHTML = "&times;";
  closeButton.className = "cross-close-button";
  closeButton.style.top = "5px";
  closeButton.style.fontSize = "32px";
  closeButton.style.width = "32px";
  closeButton.style.height = "32px";
  closeButton.onmouseover = () => (closeButton.style.color = "#fff");
  closeButton.onmouseout = () => (closeButton.style.color = "#888");
  closeButton.onclick = () => {
    document.getElementById("cross-modal").style.display = "none";
  };
  container.appendChild(closeButton);

  // Formula display (right side panel) - next to diagram
  formulaElement = document.createElement("div");
  formulaElement.className = "cross-panel cross-formula-panel";
  formulaElement.style.overflow = "visible";
  container.appendChild(formulaElement);
}

/**
 * Update visualization based on current angle
 */
function updateVisualization() {
  // Calculate point on circle
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  // Update draggable point
  draggablePoint.position.set(x, y, 0.02);

  // Update radius line
  radiusLine.geometry.dispose();
  const radiusGeom = new LineGeometry();
  radiusGeom.setPositions([0, 0, 0, x, y, 0]);
  radiusLine.geometry = radiusGeom;

  // Calculate Cross and Spread (normalized to unit circle)
  const normX = x / radius;
  const normY = y / radius;
  const cross = normX * normX; // c = x² (horizontal quadrance)
  const spread = normY * normY; // s = y² (vertical quadrance)
  const identity = cross + spread; // Should equal 1.000

  // Update Cross rectangle (from origin to (x, 0))
  const crossPositions = crossRectangleFill.geometry.attributes.position;
  crossPositions.setXYZ(0, 0, 0, 0); // origin
  crossPositions.setXYZ(1, x, 0, 0); // along X axis
  crossPositions.setXYZ(2, x, 0, 0); // stay on X axis
  crossPositions.setXYZ(3, 0, 0, 0); // back to origin
  crossPositions.needsUpdate = true;

  crossRectangle.geometry.dispose();
  const crossRectGeom = new LineGeometry();
  crossRectGeom.setPositions([0, 0, 0, x, 0, 0, x, 0, 0, 0, 0, 0, 0, 0, 0]);
  crossRectangle.geometry = crossRectGeom;

  // Update Spread rectangle (from (x, 0) to (x, y))
  const spreadPositions = spreadRectangleFill.geometry.attributes.position;
  spreadPositions.setXYZ(0, x, 0, 0); // start at end of cross
  spreadPositions.setXYZ(1, x, y, 0); // up to point on circle
  spreadPositions.setXYZ(2, x, y, 0); // stay at point
  spreadPositions.setXYZ(3, x, 0, 0); // back to start
  spreadPositions.needsUpdate = true;

  spreadRectangle.geometry.dispose();
  const spreadRectGeom = new LineGeometry();
  spreadRectGeom.setPositions([x, 0, 0, x, y, 0, x, y, 0, x, 0, 0, x, 0, 0]);
  spreadRectangle.geometry = spreadRectGeom;

  // Calculate degrees for reference
  let degrees = (angle * 180) / Math.PI;
  if (degrees < 0) degrees += 360;

  // Calculate arc-minutes and arc-seconds
  const degreesWhole = Math.floor(degrees);
  const minutesDecimal = (degrees - degreesWhole) * 60;
  const minutesWhole = Math.floor(minutesDecimal);
  const secondsDecimal = (minutesDecimal - minutesWhole) * 60;
  const secondsWhole = Math.floor(secondsDecimal);
  const milliarcseconds = Math.round((secondsDecimal - secondsWhole) * 1000);

  // Find matching snap point for special messages
  let snapInfo = "";
  const currentSnap = snapPoints.find(snap => {
    const dx = normX - snap.x;
    const dy = normY - snap.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 0.01;
  });

  if (currentSnap) {
    if (currentSnap.type === "special") {
      snapInfo = `<strong style="color: #ff8800;">45° - Exact Rational ½</strong><br>Perfect balance: c = s = 0.5 (used in grid rotation)`;
    } else if (currentSnap.type === "cardinal") {
      if (currentSnap.c === 1) {
        snapInfo = `<strong style="color: #4a9eff;">0° - Pure Horizontal</strong><br>Maximum cross: c = 1, perfectly aligned`;
      } else {
        snapInfo = `<strong style="color: #ff6600;">90° - Pure Vertical</strong><br>Maximum spread: s = 1, perfectly perpendicular`;
      }
    } else if (currentSnap.c === 0.75) {
      snapInfo = `<strong style="color: #00cccc;">30° - Rational ¾</strong><br>30-60-90 triangle: c = ¾, s = ¼`;
    } else {
      snapInfo = `<strong style="color: #00cccc;">60° - Rational ¾</strong><br>30-60-90 triangle: s = ¾, c = ¼`;
    }
  }

  // Create visual identity bar
  const crossBarWidth = cross * 100;
  const spreadBarWidth = spread * 100;

  // Sexagesimal conversion
  let sexagesimalSection = "";
  if (displayMode === "sexagesimal") {
    const dmsFromSpread = RT.Sexagesimal.fromSpread(spread);
    const dmsFromCross = RT.Sexagesimal.fromCross(cross);
    const isExact = RT.Sexagesimal.isExact(degrees, 0);

    sexagesimalSection = `
    <!-- Sexagesimal (Base-60) -->
    <div class="cross-section-divider">
      <strong class="cross-section-title" style="color: #ffaa00;">Sexagesimal (Base-60)</strong><br>
      <div class="cross-section-content">
        <span class="cross-text-muted">From spread:</span><br>
        <span style="color: #ffaa00; font-weight: bold;">${dmsFromSpread.toString(false)}</span><br>
        <span class="cross-text-submuted">s = ${spread.toFixed(4)} → θ</span><br>
        <span class="cross-text-muted" style="margin-top: 4px; display: block;">From cross:</span><br>
        <span style="color: #ffaa00; font-weight: bold;">${dmsFromCross.toString(false)}</span><br>
        <span class="cross-text-submuted">c = ${cross.toFixed(4)} → θ</span><br>
        ${isExact ? '<span class="cross-color-success cross-text-muted" style="margin-top: 4px; display: block;">✓ Exact in Base-60!</span>' : '<span class="cross-text-submuted" style="margin-top: 4px; display: block;">~ Approximate</span>'}
      </div>
    </div>`;
  }

  // Update formula display in right-side panel with vertical stacking
  formulaElement.innerHTML = `
    <!-- Position -->
    <div class="cross-section-divider">
      <strong class="cross-section-title">Position</strong><br>
      <div class="cross-section-content">
        <span class="cross-color-x">x = ${normX.toFixed(6)}</span><br>
        <span class="cross-color-y">y = ${normY.toFixed(6)}</span><br>
        <span class="cross-text-muted">θ ≈ ${degrees.toFixed(6)}°</span><br>
        <span class="cross-text-submuted">${degreesWhole}° ${minutesWhole}' ${secondsWhole}.${milliarcseconds.toString().padStart(3, "0")}"</span>
      </div>
    </div>

    <!-- Cross (c) -->
    <div class="cross-section-divider">
      <strong class="cross-section-title" style="color: #4a9eff;">Cross (c)</strong><br>
      <div class="cross-section-content">
        c = x² = <span class="cross-color-cross">${cross.toFixed(4)}</span><br>
        <span class="cross-text-muted">Horizontal Q</span><br>
        <span class="cross-text-muted">Parallelism</span>
      </div>
    </div>

    <!-- Spread (s) -->
    <div class="cross-section-divider">
      <strong class="cross-section-title" style="color: #ff6600;">Spread (s)</strong><br>
      <div class="cross-section-content">
        s = y² = <span class="cross-color-spread">${spread.toFixed(4)}</span><br>
        <span class="cross-text-muted">Vertical Q</span><br>
        <span class="cross-text-muted">Perpendicularity</span>
      </div>
    </div>

    ${sexagesimalSection}

    <!-- RT Identity -->
    <div style="margin-bottom: 8px;">
      <strong class="cross-section-title">RT Identity</strong><br>
      <div class="cross-section-content">
        s + c = <span class="${Math.abs(identity - 1.0) < 0.0001 ? "cross-color-success" : "cross-color-error"}">${identity.toFixed(4)}</span><br>
        ${Math.abs(identity - 1.0) < 0.0001 ? '<span class="cross-color-success cross-text-muted">✓ Verified</span>' : '<span class="cross-color-error cross-text-muted">✗ Error</span>'}
        <span class="cross-text-muted"> (s + c = 1)</span>
      </div>
    </div>

    ${snapInfo ? `<div class="cross-highlight-box">${snapInfo}</div>` : ""}

    <div class="cross-principle-footer">
      <strong class="cross-section-title">RT Principle:</strong> Cross and Spread partition the radius quadrance. Cross measures horizontal alignment, Spread measures vertical alignment.
      ${displayMode === "sexagesimal" ? '<br><br><span style="color: #ffaa00;">Sexagesimal (base-60) offers superior exact fractioning over decimal (base-10). Used in astronomy/navigation for millennia.</span>' : ""}
    </div>
  `;

  // Create/update identity bar at bottom of container
  const identityBarContainer = document.getElementById("cross-demo-container");
  let identityBar = document.getElementById("cross-identity-bar");

  if (!identityBar) {
    identityBar = document.createElement("div");
    identityBar.id = "cross-identity-bar";
    identityBar.className = "cross-panel cross-identity-bar";
    identityBarContainer.appendChild(identityBar);
  }

  identityBar.innerHTML = `
    <div class="cross-text-small" style="margin-bottom: 4px;">Identity Bar (s + c = 1):</div>
    <div class="cross-identity-bar-content">
      <div class="cross-identity-segment" style="width: ${crossBarWidth}%; background: linear-gradient(90deg, #4a9eff, #2a7edf);">
        <span class="cross-identity-label">${cross > 0.15 ? `c=${cross.toFixed(2)}` : ""}</span>
      </div>
      <div class="cross-identity-segment" style="width: ${spreadBarWidth}%; background: linear-gradient(90deg, #ff6600, #dd4400);">
        <span class="cross-identity-label">${spread > 0.15 ? `s=${spread.toFixed(2)}` : ""}</span>
      </div>
    </div>
  `;
}

/**
 * Set up mouse/touch interaction
 */
function setupInteraction(_container) {
  const canvas = renderer.domElement;

  const getMousePos = event => {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const aspect = rect.width / rect.height;
    const cameraSize = 1.2;
    const worldX = x * cameraSize * aspect + camera.position.x;
    const worldY = y * cameraSize + camera.position.y;

    return { worldX, worldY };
  };

  const handleStart = event => {
    const { worldX, worldY } = getMousePos(event);
    const dx = worldX - draggablePoint.position.x;
    const dy = worldY - draggablePoint.position.y;
    const clickQuadrance = dx * dx + dy * dy;
    const hitThresholdQ = 0.08 * 0.08;

    if (clickQuadrance < hitThresholdQ) {
      isDragging = true;
      canvas.style.cursor = "grabbing";
      event.preventDefault();
    }
  };

  const handleMove = event => {
    const { worldX, worldY } = getMousePos(event);

    if (!isDragging) {
      const dx = worldX - draggablePoint.position.x;
      const dy = worldY - draggablePoint.position.y;
      const hoverQuadrance = dx * dx + dy * dy;
      const hitThresholdQ = 0.08 * 0.08;
      canvas.style.cursor = hoverQuadrance < hitThresholdQ ? "grab" : "default";
      return;
    }

    // Normalize to circle and constrain to Q1
    const dist = Math.sqrt(worldX * worldX + worldY * worldY);
    let normX = Math.max(0, worldX / dist);
    let normY = Math.max(0, worldY / dist);

    // Re-normalize after clamping
    const newDist = Math.sqrt(normX * normX + normY * normY);
    if (newDist > 0) {
      normX /= newDist;
      normY /= newDist;
    }

    // RT OPTIMIZATION: Quadrance-based snapping
    let snappedX = normX;
    let snappedY = normY;
    const snapThresholdQ = SNAP_THRESHOLD * SNAP_THRESHOLD;

    // Check main snap points first (priority) with adjusted thresholds
    for (const snap of snapPoints) {
      const dx = normX - snap.x;
      const dy = normY - snap.y;
      const quadrance = dx * dx + dy * dy;

      // Tighter threshold for special/rational points to reduce "gravity"
      let threshold = snapThresholdQ;
      if (snap.type === "special" || snap.type === "rational") {
        threshold = snapThresholdQ * 0.25; // Much tighter for 1/2 and 3/4 points
      }

      if (quadrance < threshold) {
        snappedX = snap.x;
        snappedY = snap.y;
        break;
      }
    }

    // If no main snap, check diamond snap points
    if (snappedX === normX && snappedY === normY) {
      for (const snap of diamondSnapPoints) {
        const dx = normX - snap.x;
        const dy = normY - snap.y;
        const quadrance = dx * dx + dy * dy;

        if (quadrance < snapThresholdQ * 0.15) {
          // Very tight threshold for diamonds
          snappedX = snap.x;
          snappedY = snap.y;
          break;
        }
      }
    }

    // Calculate angle from snapped coordinates
    angle = Math.atan2(snappedY, snappedX);

    updateVisualization();
    event.preventDefault();
  };

  const handleEnd = () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = "default";
    }
  };

  // Mouse events
  canvas.addEventListener("mousedown", handleStart);
  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("mouseup", handleEnd);
  canvas.addEventListener("mouseleave", handleEnd);

  // Touch events
  canvas.addEventListener("touchstart", handleStart, { passive: false });
  canvas.addEventListener("touchmove", handleMove, { passive: false });
  canvas.addEventListener("touchend", handleEnd);
}

/**
 * Cleanup demo resources
 */
export function cleanupCrossDemo() {
  if (cleanup) cleanup();

  if (formulaElement && formulaElement.parentNode) {
    formulaElement.parentNode.removeChild(formulaElement);
  }
}
