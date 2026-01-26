/**
 * RT-Quadrance-Demo
 * Interactive demonstration of spread and quadrance relationships
 * Shows how rational spreads emerge from Pythagorean triples and unit rectangles
 *
 * Key RT Concepts:
 * - Spread s = sin²(θ) = y²/r² (replaces angles)
 * - Quadrance Q = distance² (replaces distance, no square root!)
 * - For unit circle: Q_x + Q_y = 1 (Pythagorean theorem in quadrance form)
 */

import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { create2DScene, initializeModalHandlers } from "./rt-demo-utils.js";
// RT module available if needed for future RT calculations
// import { RT } from "../modules/rt-math.js";

let scene, camera, renderer, animate, cleanup;
let circle, radiusLine, xVector, yVector, draggablePoint;
let isDragging = false;
let angle = Math.PI / 4; // Start at 45 degrees (spread = 0.5)
let radius = 1.5;
let formulaElement;
let snapMarkers = [];
let unitRectangle; // Dynamic unit rectangle from origin to point
let unitRectangleFill; // Filled rectangle behind the outline

// Pythagorean triples and their rational spreads
// Format: { a, b, c, x, y, spread, label, type }
// where (a,b,c) is the triple, (x,y) is normalized to unit circle, spread = (b/c)²

// Pythagorean triples - Q1 only (0° to 90°) with complementary orientations
const snapPoints = [
  // Cardinals (spread = 0, 1) - Q1 endpoints only
  { x: 1, y: 0, spread: 0, label: "s=0", type: "cardinal", triple: null },
  { x: 0, y: 1, spread: 1, label: "s=1", type: "cardinal", triple: null },

  // 3-4-5 Pythagorean triple (spread = 0.64 = 16/25 and complement 0.36 = 9/25)
  // (3, 4, 5) → normalized (3/5, 4/5) → spread = (4/5)² = 0.64
  {
    x: 0.6,
    y: 0.8,
    spread: 0.64,
    label: "s=0.64",
    type: "rational",
    triple: [3, 4, 5],
  },
  // Complement (4, 3, 5) → (4/5, 3/5) → spread = (3/5)² = 0.36
  {
    x: 0.8,
    y: 0.6,
    spread: 0.36,
    label: "s=0.36",
    type: "rational",
    triple: [4, 3, 5],
  },

  // 1-1-√2 special case (spread = 0.5 = 1/2) - 45° diagonal (no complement needed)
  // Equal legs: (1, 1, √2) → normalized (1/√2, 1/√2) → spread = 0.5
  {
    x: 1 / Math.sqrt(2),
    y: 1 / Math.sqrt(2),
    spread: 0.5,
    label: "s=0.5",
    type: "special",
    triple: [1, 1, "√2"],
  },

  // 5-12-13 Pythagorean triple (spread ≈ 0.852 and complement ≈ 0.148)
  // (5, 12, 13) → (5/13, 12/13) → spread = (12/13)² = 144/169 ≈ 0.852
  {
    x: 5 / 13,
    y: 12 / 13,
    spread: 144 / 169,
    label: "s≈0.85",
    type: "rational",
    triple: [5, 12, 13],
  },
  // Complement (12, 5, 13) → (12/13, 5/13) → spread = (5/13)² ≈ 0.148
  {
    x: 12 / 13,
    y: 5 / 13,
    spread: 25 / 169,
    label: "s≈0.15",
    type: "rational",
    triple: [12, 5, 13],
  },

  // 1-√3-2 special case (spread = 0.75 and complement = 0.25)
  // 30-60-90 triangle: (1, √3, 2) → (1/2, √3/2) → spread = (√3/2)² = 0.75
  {
    x: 0.5,
    y: Math.sqrt(3) / 2,
    spread: 0.75,
    label: "s=0.75",
    type: "special",
    triple: [1, "√3", 2],
  },
  // Complement (√3, 1, 2) → (√3/2, 1/2) → spread = (1/2)² = 0.25
  {
    x: Math.sqrt(3) / 2,
    y: 0.5,
    spread: 0.25,
    label: "s=0.25",
    type: "special",
    triple: ["√3", 1, 2],
  },

  // 8-15-17 Pythagorean triple (spread ≈ 0.779 and complement ≈ 0.221)
  // (8, 15, 17) → (8/17, 15/17) → spread = (15/17)² ≈ 0.779
  {
    x: 8 / 17,
    y: 15 / 17,
    spread: 225 / 289,
    label: "s≈0.78",
    type: "rational",
    triple: [8, 15, 17],
  },
  // Complement (15, 8, 17) → (15/17, 8/17) → spread = (8/17)² ≈ 0.221
  {
    x: 15 / 17,
    y: 8 / 17,
    spread: 64 / 289,
    label: "s≈0.22",
    type: "rational",
    triple: [15, 8, 17],
  },

  // 7-24-25 Pythagorean triple (spread ≈ 0.922 and complement ≈ 0.078)
  // (7, 24, 25) → (7/25, 24/25) → spread = (24/25)² ≈ 0.922
  {
    x: 7 / 25,
    y: 24 / 25,
    spread: 576 / 625,
    label: "s≈0.92",
    type: "rational",
    triple: [7, 24, 25],
  },
  // Complement (24, 7, 25) → (24/25, 7/25) → spread = (7/25)² ≈ 0.078
  {
    x: 24 / 25,
    y: 7 / 25,
    spread: 49 / 625,
    label: "s≈0.08",
    type: "rational",
    triple: [24, 7, 25],
  },
];

// BABYLONIAN PLIMPTON 322 TRIPLES (c. 1800 BC)
// Complete set of 15 Pythagorean triples from the ancient clay tablet
// Demonstrates base-60 (sexagesimal) exact trigonometry predating Pythagoras by 1000+ years

// Base Plimpton 322 triples (first quadrant only)
const plimpton322Base = [
  // Row 1: (120, 119, 169) - Nearly square, highest spread
  {
    a: 120,
    b: 119,
    c: 169,
    spread: (119 * 119) / (169 * 169),
    label: "P322-1",
    type: "plimpton",
  },

  // Row 2: (3456, 3367, 4825)
  {
    a: 3456,
    b: 3367,
    c: 4825,
    spread: (3367 * 3367) / (4825 * 4825),
    label: "P322-2",
    type: "plimpton",
  },

  // Row 3: (4800, 4601, 6649)
  {
    a: 4800,
    b: 4601,
    c: 6649,
    spread: (4601 * 4601) / (6649 * 6649),
    label: "P322-3",
    type: "plimpton",
  },

  // Row 4: (13500, 12709, 18541)
  {
    a: 13500,
    b: 12709,
    c: 18541,
    spread: (12709 * 12709) / (18541 * 18541),
    label: "P322-4",
    type: "plimpton",
  },

  // Row 5: (72, 65, 97)
  {
    a: 72,
    b: 65,
    c: 97,
    spread: (65 * 65) / (97 * 97),
    label: "P322-5",
    type: "plimpton",
  },

  // Row 6: (360, 319, 481)
  {
    a: 360,
    b: 319,
    c: 481,
    spread: (319 * 319) / (481 * 481),
    label: "P322-6",
    type: "plimpton",
  },

  // Row 7: (2700, 2291, 3541)
  {
    a: 2700,
    b: 2291,
    c: 3541,
    spread: (2291 * 2291) / (3541 * 3541),
    label: "P322-7",
    type: "plimpton",
  },

  // Row 8: (960, 799, 1249)
  {
    a: 960,
    b: 799,
    c: 1249,
    spread: (799 * 799) / (1249 * 1249),
    label: "P322-8",
    type: "plimpton",
  },

  // Row 9: (600, 481, 769)
  {
    a: 600,
    b: 481,
    c: 769,
    spread: (481 * 481) / (769 * 769),
    label: "P322-9",
    type: "plimpton",
  },

  // Row 10: (6480, 4961, 8161)
  {
    a: 6480,
    b: 4961,
    c: 8161,
    spread: (4961 * 4961) / (8161 * 8161),
    label: "P322-10",
    type: "plimpton",
  },

  // Row 11: (60, 45, 75) - This is 3-4-5 scaled by 15!
  { a: 60, b: 45, c: 75, spread: 0.64, label: "P322-11", type: "plimpton" },

  // Row 12: (2400, 1679, 2929)
  {
    a: 2400,
    b: 1679,
    c: 2929,
    spread: (1679 * 1679) / (2929 * 2929),
    label: "P322-12",
    type: "plimpton",
  },

  // Row 13: (240, 161, 289)
  {
    a: 240,
    b: 161,
    c: 289,
    spread: (161 * 161) / (289 * 289),
    label: "P322-13",
    type: "plimpton",
  },

  // Row 14: (2700, 1771, 3229)
  {
    a: 2700,
    b: 1771,
    c: 3229,
    spread: (1771 * 1771) / (3229 * 3229),
    label: "P322-14",
    type: "plimpton",
  },

  // Row 15: (45, 28, 53) - Steepest triangle, β ≈ 0.6222
  {
    a: 45,
    b: 28,
    c: 53,
    spread: (28 * 28) / (53 * 53),
    label: "P322-15",
    type: "plimpton",
  },
];

// Plimpton 322: Show only Q1 (0° to 90°) with both orientations for historical accuracy
// This preserves the tablet's original data while showing the full 0-90° range
const plimpton322Triples = [];
plimpton322Base.forEach(triple => {
  // Original orientation: (a, b, c)
  const x1 = triple.a / triple.c;
  const y1 = triple.b / triple.c;

  // Complementary orientation: (b, a, c) - swaps x and y for complementary spread
  const x2 = triple.b / triple.c;
  const y2 = triple.a / triple.c;

  // Q1 only: Show both orientations to cover full 0°-90° range
  plimpton322Triples.push({ ...triple, x: x1, y: y1 }); // Original

  // Add complementary only if a ≠ b (avoid duplicates)
  if (triple.a !== triple.b) {
    plimpton322Triples.push({
      ...triple,
      x: x2,
      y: y2,
      label: triple.label + "*",
    }); // Complement
  }
});

// Current triple set mode ('pythagoras' or 'plimpton322')
let currentTripleSet = "pythagoras";

const SNAP_THRESHOLD = 0.04; // radians (~2.3°) - reduced magnetic zone for precise snapping

/**
 * Initialize the Quadrance demo
 */
export function initQuadranceDemo() {
  const container = document.getElementById("quadrance-demo-container");
  if (!container) return;

  // Create 2D scene with cyan/blue theme, zoomed to Q1
  const sceneData = create2DScene(container, {
    backgroundColor: 0x001a1a, // Dark cyan background
    cameraSize: 1.2, // Smaller = more zoomed in for Q1 focus
  });

  ({ scene, camera, renderer, animate, cleanup } = sceneData);

  // Shift camera to center on Q1 (positive x, positive y quadrant)
  // Center at (radius/2, radius/2) to frame the 90° arc nicely
  camera.position.x = radius * 0.45;
  camera.position.y = radius * 0.45;

  // Create visual elements
  createAxes();
  createCircle();
  createSnapMarkers();
  createUnitRectangle();
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
  initializeModalHandlers("quadrance-modal");

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

  // Add axis labels
  createAxisLabels();
}

/**
 * Create axis labels
 */
function createAxisLabels() {
  const container = document.getElementById("quadrance-demo-container");

  // Get container aspect ratio for precise positioning
  const rect = container.getBoundingClientRect();
  const aspect = rect.width / rect.height;
  const cameraSize = 1.2; // Match Q1 zoom camera setting

  // Position labels equidistant outside circle
  const labelOffset = 0.2; // Reduced for zoomed view
  const xLabelWorld = radius + labelOffset;
  const yLabelWorld = radius + labelOffset;

  // Account for Q1 camera shift
  const cameraOffsetX = radius * 0.45;
  const cameraOffsetY = radius * 0.45;

  // X axis label (red X)
  const xLabel = document.createElement("div");
  const xLabelScreenX =
    50 + ((xLabelWorld - cameraOffsetX) / (cameraSize * aspect)) * 100;
  const xLabelScreenY = 50 - ((0 - cameraOffsetY) / cameraSize) * 100;
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

  // Y axis label (green Y)
  const yLabel = document.createElement("div");
  const yLabelScreenX =
    50 + ((0 - cameraOffsetX) / (cameraSize * aspect)) * 100;
  const yLabelScreenY = 50 - ((yLabelWorld - cameraOffsetY) / cameraSize) * 100;
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
 * Create the Q1 arc (0° to 90° only) using RT parametrization
 * DOGFOODING: Uses Weierstrass substitution instead of classical angles
 */
function createCircle() {
  // RT METHOD: Generate arc using Weierstrass parametrization
  // For t = tan(θ/2), the circle parametrization is:
  // x = (1 - t²) / (1 + t²)
  // y = 2t / (1 + t²)
  // For 0° to 90°: θ ranges from 0 to π/2, so t = tan(θ/2) ranges from 0 to 1

  const points = [];
  const numPoints = 64;

  for (let i = 0; i <= numPoints; i++) {
    // Parameter t ranges from 0 (0°) to 1 (90°)
    const t = i / numPoints;

    // RT.circleParam would be: { x: (1-t²)/(1+t²), y: 2t/(1+t²) }
    // Compute directly here for transparency (dogfooding RT math)
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
 * Create snap point markers (supports both Pythagoras and Plimpton 322 sets)
 */
function createSnapMarkers() {
  const container = document.getElementById("quadrance-demo-container");

  // Choose active triple set based on current mode
  const activeTriples =
    currentTripleSet === "plimpton322" ? plimpton322Triples : snapPoints;

  activeTriples.forEach(snap => {
    // Use algebraic coordinates directly
    const x = radius * snap.x;
    const y = radius * snap.y;

    let markerGeometry, markerColor, labelColor;

    if (snap.type === "cardinal") {
      // Grey circles for cardinals (half size for better snap control)
      markerGeometry = new THREE.CircleGeometry(0.03, 16);
      markerColor = 0x666666;
      labelColor = "#666666";
    } else if (snap.type === "rational") {
      // Cyan circles for Pythagorean triple spreads (half size)
      markerGeometry = new THREE.CircleGeometry(0.03, 16);
      markerColor = 0x00cccc;
      labelColor = "#00cccc";
    } else if (snap.type === "plimpton") {
      // Gold pyramid markers for Babylonian Plimpton 322 triples
      // Create a tetrahedron (pyramid) shape - REDUCED SIZE to prevent collision
      const pyramidSize = 0.018; // Reduced from 0.04 to prevent overlap
      const pyramidGeom = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0,
        pyramidSize,
        0, // Top vertex
        -pyramidSize,
        -pyramidSize,
        0, // Bottom-left
        pyramidSize,
        -pyramidSize,
        0, // Bottom-right
      ]);
      pyramidGeom.setAttribute(
        "position",
        new THREE.BufferAttribute(vertices, 3)
      );
      markerGeometry = pyramidGeom;
      markerColor = 0xffd700; // Gold for historical significance
      labelColor = "#ffd700";
    } else {
      // 'special' (√2, √3)
      // Orange circles for special irrational cases (half size)
      markerGeometry = new THREE.CircleGeometry(0.03, 16);
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
    scene.add(marker);
    snapMarkers.push(marker);

    // Create label positioned radially outside the marker
    const label = document.createElement("div");

    // Get container aspect ratio
    const rect = container.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    const cameraSize = 1.2; // Match Q1 zoom camera setting

    // Camera shift for Q1 view
    const cameraOffsetX = radius * 0.45; // Match camera.position.x from initialization
    const cameraOffsetY = radius * 0.45; // Match camera.position.y from initialization

    // Position label outside the circle (smaller offset for zoomed view)
    const labelOffset = snap.type === "plimpton" ? 0.12 : 0.15; // Tighter spacing for Plimpton
    const labelX = x + (x / radius) * labelOffset;
    const labelY = y + (y / radius) * labelOffset;

    // Map world coordinates to screen percentages
    // Following Weierstrass demo approach: direct mapping with aspect correction
    const screenX =
      50 + ((labelX - cameraOffsetX) / (cameraSize * aspect)) * 50;
    const screenY = 50 - ((labelY - cameraOffsetY) / cameraSize) * 50;

    // Reduce font size for Plimpton markers to prevent collision
    const fontSize = snap.type === "plimpton" ? "9px" : "14px";

    label.style.cssText = `
      position: absolute;
      left: ${screenX}%;
      top: ${screenY}%;
      transform: translate(-50%, -50%);
      color: ${labelColor};
      font-family: 'Courier New', monospace;
      font-size: ${fontSize};
      font-weight: bold;
      pointer-events: none;
      text-shadow: 0 0 3px rgba(0,0,0,0.8);
    `;
    label.textContent = snap.label;
    container.appendChild(label);
  });
}

/**
 * Refresh snap markers when switching between triple sets
 */
function refreshSnapMarkers() {
  const container = document.getElementById("quadrance-demo-container");

  // Remove existing markers from scene
  snapMarkers.forEach(marker => {
    scene.remove(marker);
    if (marker.geometry) marker.geometry.dispose();
    if (marker.material) marker.material.dispose();
  });
  snapMarkers = [];

  // Remove existing labels from DOM
  const existingLabels = container.querySelectorAll(
    'div[style*="position: absolute"]'
  );
  existingLabels.forEach(label => {
    // Only remove labels that look like snap point labels (have the specific styling)
    if (
      (label.style.fontFamily.includes("Courier") &&
        label.style.fontSize === "14px" &&
        label.textContent.includes("s=")) ||
      label.textContent.includes("P322")
    ) {
      label.remove();
    }
  });

  // Recreate markers with current triple set
  createSnapMarkers();
}

/**
 * Create dynamic unit rectangle from origin to point on circle
 */
function createUnitRectangle() {
  // Create filled rectangle first (renders behind)
  const fillGeometry = new THREE.BufferGeometry();
  const fillVertices = new Float32Array([
    0,
    0,
    0, // origin
    0,
    0,
    0, // will be updated to (x, 0, 0)
    0,
    0,
    0, // will be updated to (x, y, 0)
    0,
    0,
    0, // will be updated to (0, y, 0)
  ]);
  fillGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(fillVertices, 3)
  );
  fillGeometry.setIndex([0, 1, 2, 0, 2, 3]); // Two triangles forming rectangle

  const fillMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff, // Light cyan
    transparent: true,
    opacity: 0.15, // Very transparent fill
    side: THREE.FrontSide, // Backface culling enabled (2026-01-11)
  });

  unitRectangleFill = new THREE.Mesh(fillGeometry, fillMaterial);
  unitRectangleFill.position.z = -0.02; // Behind everything
  scene.add(unitRectangleFill);

  // Create outline (renders on top of fill)
  const geometry = new LineGeometry();
  geometry.setPositions([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // Placeholder
  const material = new LineMaterial({
    color: 0x00ffff, // Cyan
    linewidth: 2,
    transparent: true,
    opacity: 0.8,
  });
  material.resolution.set(window.innerWidth, window.innerHeight);
  unitRectangle = new Line2(geometry, material);
  unitRectangle.position.z = -0.01; // Behind circle
  scene.add(unitRectangle);
}

/**
 * Create vector visualizations (radius line, X and Y components)
 */
function createVectors() {
  // Radius line (from origin to point on circle)
  const radiusGeometry = new LineGeometry();
  radiusGeometry.setPositions([0, 0, 0, 0, 0, 0]); // Placeholder
  const radiusMaterial = new LineMaterial({ color: 0xffffff, linewidth: 2 });
  radiusMaterial.resolution.set(window.innerWidth, window.innerHeight);
  radiusLine = new Line2(radiusGeometry, radiusMaterial);
  radiusLine.position.z = 0.01;
  scene.add(radiusLine);

  // X vector (horizontal component)
  const xVectorGeometry = new LineGeometry();
  xVectorGeometry.setPositions([0, 0, 0, 0, 0, 0]);
  const xVectorMaterial = new LineMaterial({ color: 0xff0000, linewidth: 2 });
  xVectorMaterial.resolution.set(window.innerWidth, window.innerHeight);
  xVector = new Line2(xVectorGeometry, xVectorMaterial);
  xVector.position.z = 0.01;
  scene.add(xVector);

  // Y vector (vertical component)
  const yVectorGeometry = new LineGeometry();
  yVectorGeometry.setPositions([0, 0, 0, 0, 0, 0]);
  const yVectorMaterial = new LineMaterial({ color: 0x00ff00, linewidth: 2 });
  yVectorMaterial.resolution.set(window.innerWidth, window.innerHeight);
  yVector = new Line2(yVectorGeometry, yVectorMaterial);
  yVector.position.z = 0.01;
  scene.add(yVector);
}

/**
 * Create draggable point on circle
 */
function createDraggablePoint() {
  const pointGeometry = new THREE.CircleGeometry(0.05, 32); // Smaller to match snap markers
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x4a9eff });
  draggablePoint = new THREE.Mesh(pointGeometry, pointMaterial);
  draggablePoint.position.z = 0.02;
  scene.add(draggablePoint);
}

/**
 * Create formula display panel
 */
function createFormulaDisplay() {
  const container = document.getElementById("quadrance-demo-container");

  // Title overlay (top-left) - matching Weierstrass demo style
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
  titleElement.textContent =
    "Quadrance Demo - Rational Spreads & Pythagorean Triples";
  container.appendChild(titleElement);

  // Close button (now styled to match Weierstrass)
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
    document.getElementById("quadrance-modal").style.display = "none";
  };
  container.appendChild(closeButton);

  // Toggle button for Pythagoras vs Plimpton 322 (top-center)
  const toggleButton = document.createElement("button");
  toggleButton.style.cssText = `
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: auto;
    background: rgba(0, 26, 26, 0.9);
    border: 2px solid ${currentTripleSet === "plimpton322" ? "#ffd700" : "#00cccc"};
    color: ${currentTripleSet === "plimpton322" ? "#ffd700" : "#00cccc"};
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: bold;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    z-index: 10;
    transition: all 0.2s;
    white-space: nowrap;
  `;
  toggleButton.innerHTML =
    currentTripleSet === "plimpton322"
      ? "🏺 Plimpton 322 (1800 BC)"
      : "▲ Pythagoras Triples";

  toggleButton.onmouseover = () => {
    toggleButton.style.background = "rgba(0, 51, 51, 0.95)";
    toggleButton.style.transform = "translateX(-50%) scale(1.05)";
  };
  toggleButton.onmouseout = () => {
    toggleButton.style.background = "rgba(0, 26, 26, 0.9)";
    toggleButton.style.transform = "translateX(-50%) scale(1)";
  };
  toggleButton.onclick = () => {
    // Toggle between modes
    currentTripleSet =
      currentTripleSet === "pythagoras" ? "plimpton322" : "pythagoras";

    // Update button appearance
    const isPlimpton = currentTripleSet === "plimpton322";
    toggleButton.style.borderColor = isPlimpton ? "#ffd700" : "#00cccc";
    toggleButton.style.color = isPlimpton ? "#ffd700" : "#00cccc";
    toggleButton.innerHTML = isPlimpton
      ? "🏺 Plimpton 322 (1800 BC)"
      : "▲ Pythagoras Triples";

    // Refresh markers
    refreshSnapMarkers();

    // Update visualization to show current point's properties
    updateVisualization();
  };
  container.appendChild(toggleButton);

  // Formula display (bottom panel)
  formulaElement = document.createElement("div");
  formulaElement.style.cssText = `
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    background: rgba(0, 26, 26, 0.95);
    padding: 12px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    border: 1px solid #00cccc;
    box-shadow: 0 2px 8px rgba(0,255,255,0.3);
    color: #ffffff;
  `;
  container.appendChild(formulaElement);
}

/**
 * Update visualization based on current angle
 */
function updateVisualization() {
  // Calculate point on circle using angle
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  // Update draggable point position
  draggablePoint.position.set(x, y, 0.02);

  // Update radius line (origin to point)
  const radiusGeometry = new LineGeometry();
  radiusGeometry.setPositions([0, 0, 0, x, y, 0]);
  radiusLine.geometry.dispose();
  radiusLine.geometry = radiusGeometry;

  // Update X vector (horizontal component)
  const xVectorGeometry = new LineGeometry();
  xVectorGeometry.setPositions([0, 0, 0, x, 0, 0]);
  xVector.geometry.dispose();
  xVector.geometry = xVectorGeometry;

  // Update Y vector (vertical component)
  const yVectorGeometry = new LineGeometry();
  yVectorGeometry.setPositions([x, 0, 0, x, y, 0]);
  yVector.geometry.dispose();
  yVector.geometry = yVectorGeometry;

  // Update filled rectangle vertices
  const fillPositions = unitRectangleFill.geometry.attributes.position;
  fillPositions.setXYZ(0, 0, 0, 0); // origin
  fillPositions.setXYZ(1, x, 0, 0); // along X axis
  fillPositions.setXYZ(2, x, y, 0); // point on circle
  fillPositions.setXYZ(3, 0, y, 0); // along Y axis
  fillPositions.needsUpdate = true;

  // Update unit rectangle outline (origin to point, forming rectangle)
  const rectGeometry = new LineGeometry();
  rectGeometry.setPositions([
    0,
    0,
    0, // origin
    x,
    0,
    0, // along X axis
    x,
    y,
    0, // point on circle
    0,
    y,
    0, // along Y axis
    0,
    0,
    0, // close path
  ]);
  unitRectangle.geometry.dispose();
  unitRectangle.geometry = rectGeometry;

  // Calculate RT values
  const spread = (y / radius) * (y / radius); // s = y²/r² (for unit circle, just y²)

  // RT Quadrance values (educational - available for future visualization)
  // const qX = x * x;           // Quadrance of X component
  // const qY = y * y;           // Quadrance of Y component
  // const qRadius = x * x + y * y; // Should equal radius² (≈ 2.25 for r=1.5)

  // Normalize to unit circle for display
  const normX = x / radius;
  const normY = y / radius;

  // Find matching triple (Pythagoras or Plimpton 322)
  const activeTriples =
    currentTripleSet === "plimpton322" ? plimpton322Triples : snapPoints;
  let matchingTriple = null;
  let tripleInfo = "";
  const currentSnap = activeTriples.find(snap => {
    const dx = normX - snap.x;
    const dy = normY - snap.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 0.01; // Close enough to snap point
  });

  if (currentSnap) {
    if (currentSnap.type === "plimpton") {
      // Plimpton 322 Babylonian triple
      const { a, b, c, label } = currentSnap;
      const rowNum = label.replace("P322-", "").replace(" (3-4-5)", "");
      tripleInfo =
        `🏺 <strong style="color: #ffd700;">Babylonian (1800 BC)</strong><br>` +
        `Plimpton 322 Row ${rowNum}<br>` +
        `Triple: (${a}, ${b}, ${c})<br>` +
        `Ratio: (${a}/${c}, ${b}/${c})<br>` +
        `Spread: (${b}/${c})² = ${((b * b) / (c * c)).toFixed(6)}`;
    } else if (currentSnap.triple) {
      matchingTriple = currentSnap.triple;
      if (typeof matchingTriple[2] === "string") {
        // Special case (√2 or √3)
        tripleInfo = `Triangle: (${matchingTriple[0]}, ${matchingTriple[1]}, ${matchingTriple[2]})`;
      } else {
        // Pythagorean triple
        const [a, b, c] = matchingTriple;
        tripleInfo = `Triple: (${a}, ${b}, ${c})<br>Ratio: (${a}/${c}, ${b}/${c})<br>Spread: (${b}/${c})² = ${((b * b) / (c * c)).toFixed(6)}`;
      }
    }
  } else {
    tripleInfo = `No Pythagorean triple<br>Spread: ${spread.toFixed(6)}<br>(irrational)`;
  }

  // Degrees for reference
  let degrees = (angle * 180) / Math.PI;
  if (degrees < 0) degrees += 360;

  // Update formula display
  formulaElement.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; font-size: 12px;">
      <!-- Column 1: Spread & Position -->
      <div>
        <strong style="color: #00ffff;">Spread (RT)</strong><br>
        s = y²/r² = <span style="color: #4a9eff">${spread.toFixed(6)}</span><br>
        <span style="color: #ff6666">x = ${normX.toFixed(4)}</span><br>
        <span style="color: #66ff66">y = ${normY.toFixed(4)}</span><br>
        <span style="color: #888; font-size: 10px;">θ ≈ ${degrees.toFixed(1)}°</span>
      </div>

      <!-- Column 2: Quadrances -->
      <div>
        <strong style="color: #00ffff;">Quadrances (Q)</strong><br>
        Q(x) = x² = <span style="color: #ff6666">${(normX * normX).toFixed(6)}</span><br>
        Q(y) = y² = <span style="color: #66ff66">${(normY * normY).toFixed(6)}</span><br>
        Q(r) = x²+y² = <span style="color: #4a9eff">${(normX * normX + normY * normY).toFixed(6)}</span><br>
        <span style="color: #888; font-size: 10px;">Unit circle: Q(r) = 1</span>
      </div>

      <!-- Column 3: Pythagorean Triple Info -->
      <div>
        <strong style="color: #00ffff;">Pythagorean Triple</strong><br>
        ${tripleInfo}
      </div>

      <!-- Column 4: RT Principle -->
      <div>
        <strong style="color: #00ffff;">RT Principle</strong><br>
        Q(x) + Q(y) = Q(r)<br>
        ${(normX * normX).toFixed(4)} + ${(normY * normY).toFixed(4)}<br>
        = ${(normX * normX + normY * normY).toFixed(4)}<br>
        <span style="color: #888; font-size: 10px;">Pythagorean theorem<br>in quadrance form</span>
      </div>
    </div>

    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #004444;">
      <div style="font-size: 10px; color: #aaa;">
        <strong style="color: #00ffff;">Unit Rectangle:</strong>
        Cyan rectangle from origin (0,0) to point (x,y) on circle.
        <strong>Spread</strong> is the quadrance of the vertical side divided by the quadrance of the radius.
        For unit circle: <strong>s = y²</strong>
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

    // Convert to normalized device coordinates
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // Convert to world coordinates (accounting for Q1-centered camera)
    const aspect = rect.width / rect.height;
    const cameraSize = 1.2; // Must match the cameraSize used in create2DScene
    const worldX = x * cameraSize * aspect + camera.position.x;
    const worldY = y * cameraSize + camera.position.y;

    return { worldX, worldY };
  };

  const handleStart = event => {
    const { worldX, worldY } = getMousePos(event);
    const dx = worldX - draggablePoint.position.x;
    const dy = worldY - draggablePoint.position.y;
    // RT OPTIMIZATION: Use quadrance instead of distance
    const clickQuadrance = dx * dx + dy * dy;
    const hitThresholdQ = 0.08 * 0.08; // Reduced to match smaller point

    if (clickQuadrance < hitThresholdQ) {
      isDragging = true;
      canvas.style.cursor = "grabbing";
      event.preventDefault();
    }
  };

  const handleMove = event => {
    if (!isDragging) {
      // Check if hovering
      const { worldX, worldY } = getMousePos(event);
      const dx = worldX - draggablePoint.position.x;
      const dy = worldY - draggablePoint.position.y;
      const hoverQuadrance = dx * dx + dy * dy;
      const hitThresholdQ = 0.08 * 0.08; // Reduced to match smaller point
      canvas.style.cursor = hoverQuadrance < hitThresholdQ ? "grab" : "default";
      return;
    }

    const { worldX, worldY } = getMousePos(event);

    // Normalize to circle
    const dist = Math.sqrt(worldX * worldX + worldY * worldY);
    let normX = worldX / dist;
    let normY = worldY / dist;

    // Constrain to Q1 (0° to 90°) - clamp to positive values
    normX = Math.max(0, normX);
    normY = Math.max(0, normY);

    // Re-normalize after clamping (maintain unit circle constraint)
    const newDist = Math.sqrt(normX * normX + normY * normY);
    if (newDist > 0) {
      normX /= newDist;
      normY /= newDist;
    }

    // RT OPTIMIZATION: Quadrance-based snapping
    // Use active triple set for snapping
    const activeTriples =
      currentTripleSet === "plimpton322" ? plimpton322Triples : snapPoints;
    let snappedX = normX;
    let snappedY = normY;
    const snapThresholdQ = SNAP_THRESHOLD * SNAP_THRESHOLD;

    for (const snap of activeTriples) {
      const dx = normX - snap.x;
      const dy = normY - snap.y;
      const quadrance = dx * dx + dy * dy;

      if (quadrance < snapThresholdQ) {
        snappedX = snap.x;
        snappedY = snap.y;
        break;
      }
    }

    // Calculate angle from snapped coordinates (will be 0 to π/2)
    angle = Math.atan2(snappedY, snappedX);

    // Update visualization
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
  canvas.addEventListener("touchstart", handleStart);
  canvas.addEventListener("touchmove", handleMove);
  canvas.addEventListener("touchend", handleEnd);
}

/**
 * Cleanup demo resources
 */
export function cleanupQuadranceDemo() {
  if (cleanup) cleanup();

  if (formulaElement && formulaElement.parentNode) {
    formulaElement.parentNode.removeChild(formulaElement);
  }
}
