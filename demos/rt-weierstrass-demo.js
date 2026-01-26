/**
 * RT-Weierstrass-Demo
 * Interactive demonstration of Weierstrass parametrization of the circle
 * Shows how circular motion relates to X/Y vectors using rational functions
 *
 * Weierstrass substitution:
 * Let t = tan(θ/2), then:
 * x = (1 - t²) / (1 + t²)
 * y = 2t / (1 + t²)
 */

import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { create2DScene, initializeModalHandlers } from "./rt-demo-utils.js";
import { RT } from "../modules/rt-math.js";

let scene, _camera, renderer, animate, cleanup;
let circle, radiusLine, xVector, yVector, draggablePoint;
let isDragging = false;
let angle = Math.PI / 4; // Start at 45 degrees
let radius = 1.5;
let formulaElement;
let snapMarkers = [];

// Golden ratio
const PHI = (1 + Math.sqrt(5)) / 2;

// Snap points using algebraic coordinates (no trig!)
// Store normalized (x, y) coordinates on the unit circle instead of angles
// Calculate normalized φ coordinates
const phiNorm = Math.sqrt(PHI * PHI + 1);
const phi_x = PHI / phiNorm; // x for atan2(1, φ)
const phi_y = 1 / phiNorm; // y for atan2(1, φ)

const snapPoints = [
  // Cardinal directions (0°, 90°, 180°, 270°) - on axes
  { x: 1, y: 0, label: "0°", type: "cardinal" },
  { x: 0, y: 1, label: "90°", type: "cardinal" },
  { x: -1, y: 0, label: "180°", type: "cardinal" },
  { x: 0, y: -1, label: "270°", type: "cardinal" },

  // 45° angles (spread = 0.5, √2 square vertices) - normalized (1, 1)
  { x: 1 / Math.sqrt(2), y: 1 / Math.sqrt(2), label: "45°", type: "spread" },
  { x: -1 / Math.sqrt(2), y: 1 / Math.sqrt(2), label: "135°", type: "spread" },
  { x: -1 / Math.sqrt(2), y: -1 / Math.sqrt(2), label: "225°", type: "spread" },
  { x: 1 / Math.sqrt(2), y: -1 / Math.sqrt(2), label: "315°", type: "spread" },

  // φ points (golden rectangle vertices) - normalized (φ, 1) and (1, φ)
  { x: phi_x, y: phi_y, label: "φ", type: "phi" }, // Q1 horizontal
  { x: phi_y, y: phi_x, label: "φ", type: "phi" }, // Q1 vertical
  { x: -phi_x, y: phi_y, label: "φ", type: "phi" }, // Q2 horizontal
  { x: -phi_y, y: phi_x, label: "φ", type: "phi" }, // Q2 vertical
  { x: -phi_x, y: -phi_y, label: "φ", type: "phi" }, // Q3 horizontal
  { x: -phi_y, y: -phi_x, label: "φ", type: "phi" }, // Q3 vertical
  { x: phi_x, y: -phi_y, label: "φ", type: "phi" }, // Q4 horizontal
  { x: phi_y, y: -phi_x, label: "φ", type: "phi" }, // Q4 vertical
];

const SNAP_THRESHOLD = 0.08; // radians (~4.6°) - reduced magnetic zone for less aggressive snapping

/**
 * Initialize the Weierstrass demo
 */
export function initWeierstrassDemo() {
  const container = document.getElementById("weierstrass-demo-container");
  if (!container) return;

  // Create 2D scene
  const sceneData = create2DScene(container, {
    backgroundColor: 0x000000,
    cameraSize: 2.5,
  });

  ({ scene, camera: _camera, renderer, animate, cleanup } = sceneData);

  // Create visual elements
  createAxes();
  createGeometricGuides();
  createCircle();
  createSnapMarkers();
  createVectors();
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
  initializeModalHandlers("weierstrass-modal");

  // Initial update
  updateVisualization();
}

/**
 * Create coordinate axes
 */
function createAxes() {
  const axisWidth = 1;

  // X axis (hairline grey, terminates at circle boundary)
  const xAxisGeometry = new LineGeometry();
  xAxisGeometry.setPositions([-radius, 0, 0, radius, 0, 0]);
  const xAxisMaterial = new LineMaterial({
    color: 0x444444,
    linewidth: axisWidth,
  });
  xAxisMaterial.resolution.set(window.innerWidth, window.innerHeight);
  const xAxis = new Line2(xAxisGeometry, xAxisMaterial);
  scene.add(xAxis);

  // Y axis (hairline grey, terminates at circle boundary)
  const yAxisGeometry = new LineGeometry();
  yAxisGeometry.setPositions([0, -radius, 0, 0, radius, 0]);
  const yAxisMaterial = new LineMaterial({
    color: 0x444444,
    linewidth: axisWidth,
  });
  yAxisMaterial.resolution.set(window.innerWidth, window.innerHeight);
  const yAxis = new Line2(yAxisGeometry, yAxisMaterial);
  scene.add(yAxis);

  // Add axis labels
  createAxisLabels();
}

/**
 * Create geometric guide shapes (√2 squares and golden rectangles)
 * These are quadrant-based shapes: one square/rectangle per quadrant, rotated 90° each
 */
function createGeometricGuides() {
  const hairlineWidth = 1;
  const guideColor = 0x888888; // Match circle color for visibility

  // √2 SQUARE - One square per quadrant (4 total)
  // Vertices at cardinal directions (0°, 90°, 180°, 270°)
  // This is inscribed in the circle, rotated 45° from the axes
  const sqrt2SquareGeometry = new LineGeometry();
  sqrt2SquareGeometry.setPositions([
    radius,
    0,
    0, // 0° (east)
    0,
    radius,
    0, // 90° (north)
    -radius,
    0,
    0, // 180° (west)
    0,
    -radius,
    0, // 270° (south)
    radius,
    0,
    0, // close path
  ]);
  const sqrt2SquareMaterial = new LineMaterial({
    color: guideColor,
    linewidth: hairlineWidth,
    transparent: true,
    opacity: 0.5,
  });
  sqrt2SquareMaterial.resolution.set(window.innerWidth, window.innerHeight);
  const sqrt2Square = new Line2(sqrt2SquareGeometry, sqrt2SquareMaterial);
  sqrt2Square.position.z = -0.01; // Behind circle
  scene.add(sqrt2Square);

  // √3 EQUILATERAL TRIANGLES - Two triangles (pointing up and down)
  // Built using pure algebraic/geometric construction, no classical trig
  // For a point on the unit circle where spread = 0.75, we have sin²(θ) = 3/4
  // This means sin(θ) = √3/2, and by Pythagoras: cos²(θ) = 1 - 3/4 = 1/4, so cos(θ) = ±1/2
  // These are the 30° and 60° points, creating equilateral triangles

  // Algebraic construction: normalize (√3, 1) to get 30° point on circle
  // This avoids classical trig - we use the fact that (√3, 1) has the right ratio
  // and normalize it to lie on the unit circle
  const sqrt3 = Math.sqrt(3);
  const norm_1_sqrt3 = Math.sqrt(1 + 3); // = 2, normalizing factor for (√3, 1)

  // 30° point: normalize (√3, 1) → (√3/2, 1/2)
  // This represents the point on the circle where x/y = √3/1 = √3
  const x_30 = sqrt3 / norm_1_sqrt3; // √3/2
  const y_30 = 1 / norm_1_sqrt3; // 1/2

  // Note: 60° point would be (y_30, x_30) = (1/2, √3/2) by symmetry,
  // but we don't need it since both triangles can be constructed from the 30° point

  // Upward-pointing equilateral triangle (vertices at 90°, 210°, 330°)
  const triangleUpGeometry = new LineGeometry();
  triangleUpGeometry.setPositions([
    0,
    radius,
    0, // 90° (top) - on Y axis
    -x_30 * radius,
    -y_30 * radius,
    0, // 210° (bottom-left) - reflected 30° point
    x_30 * radius,
    -y_30 * radius,
    0, // 330° (bottom-right) - 30° point reflected over X
    0,
    radius,
    0, // close path
  ]);
  const triangleUpMaterial = new LineMaterial({
    color: guideColor,
    linewidth: hairlineWidth,
    transparent: true,
    opacity: 0.5,
  });
  triangleUpMaterial.resolution.set(window.innerWidth, window.innerHeight);
  const triangleUp = new Line2(triangleUpGeometry, triangleUpMaterial);
  triangleUp.position.z = -0.01;
  scene.add(triangleUp);

  // Downward-pointing equilateral triangle (vertices at 30°, 150°, 270°)
  const triangleDownGeometry = new LineGeometry();
  triangleDownGeometry.setPositions([
    x_30 * radius,
    y_30 * radius,
    0, // 30° (top-right)
    -x_30 * radius,
    y_30 * radius,
    0, // 150° (top-left)
    0,
    -radius,
    0, // 270° (bottom) - on -Y axis
    x_30 * radius,
    y_30 * radius,
    0, // close path
  ]);
  const triangleDownMaterial = new LineMaterial({
    color: guideColor,
    linewidth: hairlineWidth,
    transparent: true,
    opacity: 0.5,
  });
  triangleDownMaterial.resolution.set(window.innerWidth, window.innerHeight);
  const triangleDown = new Line2(triangleDownGeometry, triangleDownMaterial);
  triangleDown.position.z = -0.01;
  scene.add(triangleDown);

  // GOLDEN RECTANGLES - 8 total (2 per quadrant)
  // Each rectangle extends from origin to a φ snap point on the circle
  // φ snap points on the circle have angles: atan2(1, φ) and atan2(φ, 1)
  // These create golden rectangles since the ratio of sides is φ:1

  // Calculate normalized φ coordinates (on unit circle)
  const phiNorm = Math.sqrt(PHI * PHI + 1); // Normalizing factor for (φ, 1)
  const phi_x = PHI / phiNorm; // x coordinate for atan2(1, φ)
  const phi_y = 1 / phiNorm; // y coordinate for atan2(1, φ)

  // Quadrant rectangle: origin to φ snap point on circle
  function createQuadrantRectangle(x, y) {
    const geometry = new LineGeometry();
    geometry.setPositions([
      0,
      0,
      0, // origin
      x,
      0,
      0, // along x-axis to x
      x,
      y,
      0, // corner (φ point on circle)
      0,
      y,
      0, // along y-axis to y
      0,
      0,
      0, // back to origin
    ]);
    const material = new LineMaterial({
      color: guideColor,
      linewidth: hairlineWidth,
      transparent: true,
      opacity: 0.5,
    });
    material.resolution.set(window.innerWidth, window.innerHeight);
    const rect = new Line2(geometry, material);
    rect.position.z = -0.01;
    return rect;
  }

  // Create 8 golden rectangles (2 per quadrant - one for each φ orientation)
  // Each uses actual φ snap point positions on the circle

  // Quadrant I (positive x, positive y)
  const q1_horizontal = createQuadrantRectangle(phi_x * radius, phi_y * radius); // atan2(1, φ)
  const q1_vertical = createQuadrantRectangle(phi_y * radius, phi_x * radius); // atan2(φ, 1)
  scene.add(q1_horizontal);
  scene.add(q1_vertical);

  // Quadrant II (negative x, positive y)
  const q2_horizontal = createQuadrantRectangle(
    -phi_x * radius,
    phi_y * radius
  ); // atan2(1, -φ)
  const q2_vertical = createQuadrantRectangle(-phi_y * radius, phi_x * radius); // atan2(φ, -1)
  scene.add(q2_horizontal);
  scene.add(q2_vertical);

  // Quadrant III (negative x, negative y)
  const q3_horizontal = createQuadrantRectangle(
    -phi_x * radius,
    -phi_y * radius
  ); // atan2(-1, -φ)
  const q3_vertical = createQuadrantRectangle(-phi_y * radius, -phi_x * radius); // atan2(-φ, -1)
  scene.add(q3_horizontal);
  scene.add(q3_vertical);

  // Quadrant IV (positive x, negative y)
  const q4_horizontal = createQuadrantRectangle(
    phi_x * radius,
    -phi_y * radius
  ); // atan2(-1, φ)
  const q4_vertical = createQuadrantRectangle(phi_y * radius, -phi_x * radius); // atan2(-φ, 1)
  scene.add(q4_horizontal);
  scene.add(q4_vertical);
}

/**
 * Create axis labels
 */
function createAxisLabels() {
  const container = document.getElementById("weierstrass-demo-container");

  // Get container aspect ratio for precise positioning
  const rect = container.getBoundingClientRect();
  const aspect = rect.width / rect.height;
  const cameraSize = 2.5;

  // Position labels equidistant outside circle (radius + offset)
  const labelOffset = 0.35; // Distance outside circle edge
  const xLabelWorld = radius + labelOffset; // Right of circle
  const yLabelWorld = radius + labelOffset; // Above circle

  // X axis label (red X to the right of circle, on horizontal centerline)
  const xLabel = document.createElement("div");
  const xLabelScreenX = 50 + (xLabelWorld / (cameraSize * aspect)) * 50;
  const xLabelScreenY = 50; // Horizontal centerline
  xLabel.style.cssText = `
    position: absolute;
    left: ${xLabelScreenX}%;
    top: ${xLabelScreenY}%;
    transform: translate(-50%, -50%);
    color: #ff0000;
    font-family: 'Courier New', monospace;
    font-size: 18px;
    font-weight: bold;
    pointer-events: none;
  `;
  xLabel.textContent = "X";
  container.appendChild(xLabel);

  // Y axis label (green Y just above top of circle)
  const yLabel = document.createElement("div");
  const yLabelScreenX = 50; // Vertical centerline
  const yLabelScreenY = 50 - (yLabelWorld / cameraSize) * 50;
  yLabel.style.cssText = `
    position: absolute;
    left: ${yLabelScreenX}%;
    top: ${yLabelScreenY}%;
    transform: translate(-50%, -50%);
    color: #00ff00;
    font-family: 'Courier New', monospace;
    font-size: 18px;
    font-weight: bold;
    pointer-events: none;
  `;
  yLabel.textContent = "Y";
  container.appendChild(yLabel);
}

/**
 * Create circle
 */
function createCircle() {
  const circleGeometry = new THREE.CircleGeometry(radius, 64);
  const edges = new THREE.EdgesGeometry(circleGeometry);
  const circleMaterial = new THREE.LineBasicMaterial({
    color: 0x888888,
    linewidth: 2,
  });
  circle = new THREE.LineSegments(edges, circleMaterial);
  scene.add(circle);
}

/**
 * Create snap point markers
 */
function createSnapMarkers() {
  const container = document.getElementById("weierstrass-demo-container");

  snapPoints.forEach(snap => {
    // Use algebraic coordinates directly - no trig needed!
    const x = radius * snap.x;
    const y = radius * snap.y;

    let markerGeometry, markerColor, labelColor;

    if (snap.type === "cardinal") {
      // Grey circles for cardinal directions (0°, 90°, 180°, 270°)
      markerGeometry = new THREE.CircleGeometry(0.06, 16);
      markerColor = 0x666666;
      labelColor = "#666666";
    } else if (snap.type === "phi") {
      // Tiny gold diamonds for φ points
      // Create a rotated square (diamond) shape
      markerGeometry = new THREE.PlaneGeometry(0.03, 0.03);
      markerColor = 0xffd700; // Gold for φ
      labelColor = "#ffd700";
    } else {
      // 'spread' (45° angles)
      // Orange circles for 45° angles
      markerGeometry = new THREE.CircleGeometry(0.06, 16);
      markerColor = 0xff8800;
      labelColor = "#ff8800";
    }

    const markerMaterial = new THREE.MeshBasicMaterial({
      color: markerColor,
      transparent: true,
      opacity: 0.6,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(x, y, 0.02);

    // Rotate diamonds 45° to make them diamond-shaped
    if (snap.type === "phi") {
      marker.rotation.z = Math.PI / 4;
    }

    scene.add(marker);
    snapMarkers.push(marker);

    // Create label positioned radially outside the marker for better readability
    const label = document.createElement("div");

    // Get container aspect ratio to correctly map world coordinates to screen percentages
    const rect = container.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    const cameraSize = 2.5;

    // Position label outside the circle (radially outward from marker)
    const labelOffset = 0.25; // Distance to push label outward from marker
    const labelX = x + (x / radius) * labelOffset; // Push radially outward
    const labelY = y + (y / radius) * labelOffset;

    // Map world coordinates to screen percentages
    // Account for aspect ratio: X needs to be scaled by aspect, Y is 1:1
    const screenX = 50 + (labelX / (cameraSize * aspect)) * 50; // Map to ±50% range accounting for aspect
    const screenY = 50 - (labelY / cameraSize) * 50; // Map to ±50% range (inverted Y)

    label.style.cssText = `
      position: absolute;
      left: ${screenX}%;
      top: ${screenY}%;
      transform: translate(-50%, -50%);
      color: ${labelColor};
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: bold;
      pointer-events: none;
    `;
    label.textContent = snap.label;
    container.appendChild(label);
  });
}

/**
 * Create X and Y component vectors
 */
function createVectors() {
  // Radius vector (from origin to point on circle)
  const radiusGeometry = new LineGeometry();
  const radiusMaterial = new LineMaterial({
    color: 0x4a9eff,
    linewidth: 3,
    depthTest: false, // Render on top
  });
  radiusMaterial.resolution.set(window.innerWidth, window.innerHeight);
  radiusLine = new Line2(radiusGeometry, radiusMaterial);
  radiusLine.renderOrder = 3;
  scene.add(radiusLine);

  // X component vector (horizontal)
  const xVectorGeometry = new LineGeometry();
  const xVectorMaterial = new LineMaterial({
    color: 0xff0000, // Red
    linewidth: 3,
    depthTest: false, // Render on top
  });
  xVectorMaterial.resolution.set(window.innerWidth, window.innerHeight);
  xVector = new Line2(xVectorGeometry, xVectorMaterial);
  xVector.renderOrder = 2;
  scene.add(xVector);

  // Y component vector (vertical)
  const yVectorGeometry = new LineGeometry();
  const yVectorMaterial = new LineMaterial({
    color: 0x66ff66,
    linewidth: 3,
    depthTest: false, // Render on top
  });
  yVectorMaterial.resolution.set(window.innerWidth, window.innerHeight);
  yVector = new Line2(yVectorGeometry, yVectorMaterial);
  yVector.renderOrder = 2;
  scene.add(yVector);
}

/**
 * Create draggable point on circle
 */
function createDraggablePoint() {
  const pointGeometry = new THREE.CircleGeometry(0.08, 32);
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x4a9eff });
  draggablePoint = new THREE.Mesh(pointGeometry, pointMaterial);
  scene.add(draggablePoint);
}

/**
 * Create formula display overlay
 */
function createFormulaDisplay() {
  const container = document.getElementById("weierstrass-demo-container");

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
  titleElement.textContent = "Weierstrass Parametrization of the Circle";
  container.appendChild(titleElement);

  // Close button (now part of canvas overlay since we removed modal header)
  const closeButton = document.createElement("button");
  closeButton.className = "close-modal";
  closeButton.innerHTML = "&times;";
  closeButton.style.cssText = `
    position: absolute;
    top: 5px;
    right: 10px;
    background: transparent;
    border: none;
    font-size: 32px;
    color: #888;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
    z-index: 10;
  `;
  closeButton.onmouseover = () => (closeButton.style.color = "#fff");
  closeButton.onmouseout = () => (closeButton.style.color = "#888");
  closeButton.onclick = () => {
    document.getElementById("weierstrass-modal").style.display = "none";
  };
  container.appendChild(closeButton);

  // Horizontal masthead formula display (bottom)
  formulaElement = document.createElement("div");
  formulaElement.style.cssText = `
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.85);
    padding: 12px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    border: 1px solid #333;
    box-shadow: 0 2px 8px rgba(255,255,255,0.1);
    color: #ffffff;
  `;
  container.appendChild(formulaElement);
}

/**
 * Update visualization based on current angle
 */
function updateVisualization() {
  // DOGFOODING: Use RT.circleParam (Weierstrass parametrization)
  // This demonstrates rational trigonometry: pure rational functions, no trig!
  // NOTE: We still need tan(θ/2) to convert from angle to parameter 't'
  // In a pure RT workflow, you'd work with 't' parameter directly
  const t = Math.tan(angle / 2);

  // Use RT.circleParam for the actual circle point calculation
  const point = RT.circleParam(t);

  // Scale to radius
  const x = point.x * radius;
  const y = point.y * radius;

  // Update draggable point position
  draggablePoint.position.set(x, y, 0);

  // Update radius vector (origin to point)
  radiusLine.geometry.setPositions([0, 0, 0, x, y, 0]);
  radiusLine.computeLineDistances();

  // Update X component vector (origin to x, 0)
  // Offset slightly in Z to prevent z-fighting with X axis
  xVector.geometry.setPositions([0, 0, 0.01, x, 0, 0.01]);
  xVector.computeLineDistances();

  // Update Y component vector (x, 0 to x, y)
  yVector.geometry.setPositions([x, 0, 0.01, x, y, 0.01]);
  yVector.computeLineDistances();

  // Calculate quadrances (squared lengths) using RT library
  const origin = { x: 0, y: 0, z: 0 };
  const xPoint = { x: x, y: 0, z: 0 };
  const yPoint = { x: x, y: y, z: 0 };

  const qX = RT.quadrance(origin, xPoint); // Quadrance of X component
  const qY = RT.quadrance(xPoint, yPoint); // Quadrance of Y component
  const qRadius = RT.quadrance(origin, { x, y, z: 0 }); // Quadrance of radius vector

  // Calculate angular measures
  // Normalize angle to 0-360° range
  let degrees = (angle * 180) / Math.PI;
  if (degrees < 0) degrees += 360;

  // Radians (normalized to 0-2π)
  let radians = angle;
  if (radians < 0) radians += 2 * Math.PI;

  // RT OPTIMIZATION: Calculate spread directly from coordinates (no trig!)
  // Spread: s = sin²(θ) = y²/r² (for unit circle, just y²)
  // This is pure RT - extracting spread from Weierstrass coordinates
  const spread = (y / radius) * (y / radius); // Equivalent to: 1 - (x/radius)²

  // Calculate actual values for display
  const traditionalX = radius * Math.cos(angle);
  const traditionalY = radius * Math.sin(angle);

  // OPERATION COUNT COMPARISON (Theoretical advantage in GPU/shader contexts)
  // These counts represent the computational advantage in environments without
  // hardware-accelerated transcendentals (GPU shaders, fixed-point systems, etc.)
  const weierstrassOps = 8; // 1 tan + 4 multiply + 2 add + 2 divide (but tan itself uses rational approx in shaders)
  const traditionalOps = 30; // 2 trig functions × ~15 Taylor series terms each (in software/shader implementation)

  // NOTE: In JavaScript, sin/cos use CPU hardware instructions, so the advantage isn't visible here.
  // The real benefit is in GPU fragment shaders where transcendentals are expensive.
  const theoreticalSpeedup = traditionalOps / weierstrassOps;

  // Normalize for bar chart display (showing theoretical GPU advantage)
  const wBarWidth = (weierstrassOps / traditionalOps) * 100;
  const tBarWidth = 100;

  // Horizontal masthead layout with formula columns
  formulaElement.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; font-size: 12px;">
      <!-- Column 1: Weierstrass Method -->
      <div>
        <strong style="color: #00ff88;">Weierstrass (RT)</strong><br>
        t = tan(θ/2) = <span style="color: #4a9eff">${t.toFixed(4)}</span><br>
        x = r·(1-t²)/(1+t²) = <span style="color: #ff0000">${x.toFixed(4)}</span><br>
        y = r·(2t)/(1+t²) = <span style="color: #66ff66">${y.toFixed(4)}</span><br>
        <span style="color: #888; font-size: 10px;">8 rational ops</span>
      </div>

      <!-- Column 2: Traditional Method -->
      <div>
        <strong style="color: #ff8800;">Traditional</strong><br>
        θ = <span style="color: #4a9eff">${degrees.toFixed(2)}° (${radians.toFixed(3)} rad)</span><br>
        x = r·cos(θ) = <span style="color: #ff0000">${traditionalX.toFixed(4)}</span><br>
        y = r·sin(θ) = <span style="color: #66ff66">${traditionalY.toFixed(4)}</span><br>
        <span style="color: #888; font-size: 10px;">~30 Taylor terms</span>
      </div>

      <!-- Column 3: Position & Spread -->
      <div>
        <strong>Position (RT)</strong><br>
        <span style="color: #ff6666">X = ${x.toFixed(4)}</span><br>
        <span style="color: #66ff66">Y = ${y.toFixed(4)}</span><br>
        Spread s = <span style="color: #4a9eff">${spread.toFixed(4)}</span>
      </div>

      <!-- Column 4: Quadrances -->
      <div>
        <strong>Quadrances (Q)</strong><br>
        <span style="color: #ff6666">Q(X) = ${qX.toFixed(4)}</span><br>
        <span style="color: #66ff66">Q(Y) = ${qY.toFixed(4)}</span><br>
        <span style="color: #4a9eff">Q(R) = ${qRadius.toFixed(4)}</span>
      </div>
    </div>

    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #444;">
      <div style="font-size: 10px; color: #aaa; margin-bottom: 4px;">Computational Complexity (GPU/Shader):</div>
      <div style="display: flex; gap: 15px; align-items: center;">
        <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 10px; color: #00ff88;">Weierstrass:</span>
          <div style="flex: 1; background: #222; height: 8px; border-radius: 2px; overflow: hidden;">
            <div id="weierstrass-bar" style="width: 0%; background: linear-gradient(90deg, #00ff88, #00cc66); height: 100%; transition: width 0.15s;"></div>
          </div>
          <span style="font-size: 10px; color: #888;">${weierstrassOps} ops</span>
        </div>
        <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 10px; color: #ff8800;">Traditional:</span>
          <div style="flex: 1; background: #222; height: 8px; border-radius: 2px; overflow: hidden;">
            <div id="traditional-bar" style="width: 0%; background: linear-gradient(90deg, #ff8800, #cc6600); height: 100%; transition: width 0.3s;"></div>
          </div>
          <span style="font-size: 10px; color: #888;">${traditionalOps} ops</span>
        </div>
        <span style="font-size: 10px; color: #666;">~${theoreticalSpeedup.toFixed(1)}× GPU advantage</span>
      </div>
    </div>
  `;

  // Animate the bars to show computation happening
  // Use requestAnimationFrame for smooth animation
  requestAnimationFrame(() => {
    const wBar = document.getElementById("weierstrass-bar");
    const tBar = document.getElementById("traditional-bar");
    if (wBar) wBar.style.width = `${wBarWidth}%`;
    if (tBar) tBar.style.width = `${tBarWidth}%`;
  });
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

    // Convert to normalized device coordinates
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // Convert to world coordinates
    const aspect = rect.width / rect.height;
    const cameraSize = 2.5;
    const worldX = x * cameraSize * aspect;
    const worldY = y * cameraSize;

    return { worldX, worldY };
  };

  const handleStart = event => {
    const { worldX, worldY } = getMousePos(event);
    const dx = worldX - draggablePoint.position.x;
    const dy = worldY - draggablePoint.position.y;
    // RT OPTIMIZATION: Use quadrance instead of distance (no sqrt!)
    const clickQuadrance = dx * dx + dy * dy;
    const hitThresholdQ = 0.15 * 0.15; // Quadrance of hit radius

    if (clickQuadrance < hitThresholdQ) {
      isDragging = true;
      canvas.style.cursor = "grabbing";
      event.preventDefault();
    }
  };

  const handleMove = event => {
    if (!isDragging) {
      // Check if hovering over point
      const { worldX, worldY } = getMousePos(event);
      const dx = worldX - draggablePoint.position.x;
      const dy = worldY - draggablePoint.position.y;
      // RT OPTIMIZATION: Use quadrance instead of distance (no sqrt!)
      const hoverQuadrance = dx * dx + dy * dy;
      const hitThresholdQ = 0.15 * 0.15; // Quadrance of hit radius
      canvas.style.cursor = hoverQuadrance < hitThresholdQ ? "grab" : "default";
      return;
    }

    const { worldX, worldY } = getMousePos(event);

    // Normalize mouse position to unit circle
    const dist = Math.sqrt(worldX * worldX + worldY * worldY);
    const normX = worldX / dist;
    const normY = worldY / dist;

    // RT OPTIMIZATION: Use quadrance-based snapping instead of angle difference
    // Check if mouse is close to any snap point using coordinate quadrance
    let snappedX = normX;
    let snappedY = normY;
    const snapThresholdQ = SNAP_THRESHOLD * SNAP_THRESHOLD; // Convert angle threshold to coordinate quadrance

    for (const snap of snapPoints) {
      // Quadrance between normalized mouse position and snap point
      const dx = normX - snap.x;
      const dy = normY - snap.y;
      const quadrance = dx * dx + dy * dy;

      if (quadrance < snapThresholdQ) {
        snappedX = snap.x;
        snappedY = snap.y;
        break;
      }
    }

    // Calculate angle from snapped coordinates
    angle = Math.atan2(snappedY, snappedX);

    // Update visualization
    updateVisualization();
    event.preventDefault();
  };

  const handleEnd = () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = "grab";
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
export function cleanupWeierstrassDemo() {
  if (cleanup) cleanup();

  // Remove formula display (coordinates now integrated)
  if (formulaElement && formulaElement.parentNode) {
    formulaElement.parentNode.removeChild(formulaElement);
  }
}
