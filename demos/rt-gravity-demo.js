/**
 * RT-Gravity-Demo
 * Interactive demonstration of gravity grid intervals vs uniform spacing.
 *
 * Two numberlines:
 *   Top — uniform grid, body ACCELERATES (quadratic position in time).
 *   Bottom — gravity-warped grid, body at CONSTANT VELOCITY (linear in time).
 *
 * Both bodies start at left and reach right at the same total time T.
 * The bodies diverge mid-flight: the accelerating body lags early, catches up late.
 *
 * Gravity ticks placed at √(k/N) so the constant-velocity body crosses
 * tick k at the same instant the accelerating body crosses uniform tick k.
 *
 * First integration test of RT.Gravity namespace (rt-math.js).
 */

import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { create2DScene, initializeModalHandlers } from "./rt-demo-utils.js";
import { RT } from "../modules/rt-math.js";
import { linkSpread2D } from "../modules/rt-ik-solvers.js";

// Scene references
let scene, camera, renderer, animate, cleanup;

// Visual elements
let handleLine, handleRing;
let bodyA, bodyB;
let trailA, trailB;
let linkLine;
let formulaElement;
let bodySelector;
let uniformTicks = [];
let gravityTicks = [];

// State
let isDragging = false;
let currentTimeFraction = 0; // 0 to 1 (normalized time)
let selectedBody = "earth";
let N = 144; // Number of grid divisions (matches Quadray tessellation max)

// Animation state
let isAnimating = false;
let animationStartTime = null;
let dropButton = null;

// Layout constants
const LINE_LEFT = -5.0;
const LINE_RIGHT = 5.0;
const LINE_LENGTH = LINE_RIGHT - LINE_LEFT;
const TOP_Y = 1.2;
const BOT_Y = -1.2;
const TICK_HEIGHT = 0.2;
const BODY_RADIUS = 0.12;
const MAJOR_TICK_INTERVAL = 12; // 144 / 12 = 12 major divisions

/**
 * Get current surface gravity for selected body
 */
function getG() {
  const body = RT.Gravity.BODIES[selectedBody];
  return body.surfaceG || RT.Gravity.g_standard;
}

/**
 * Get drop height for current body.
 *
 * Default: 144 m  (1 m per cell, matching Quadray tessellation at N = 144).
 * Black Hole only: auto-scale so the animation lasts ~5 s (H = ½gT²).
 * All other bodies use 144 m — fast drops (Sun, Jupiter) are educational.
 */
function getH() {
  if (selectedBody === "blackhole") {
    const g = getG();
    const T_target = 5.0;
    return 0.5 * g * T_target * T_target; // ≈ 1.9e14 m (~1.27 AU)
  }
  return 144;
}

/**
 * Get total fall time: T = sqrt(2H/g)
 */
function getTotalTime() {
  return Math.sqrt((2 * getH()) / getG());
}

/**
 * Format a value with SI prefix for readability.
 * Keeps 3 significant digits for large/small values, .toFixed(2) for normal.
 */
function fmtVal(v, unit = "m") {
  const abs = Math.abs(v);
  if (abs === 0) return `0 ${unit}`;
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)} T${unit}`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)} G${unit}`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)} M${unit}`;
  if (abs >= 1e4) return `${(v / 1e3).toFixed(2)} k${unit}`;
  if (abs >= 1) return `${v.toFixed(2)} ${unit}`;
  if (abs >= 1e-3) return `${(v * 1e3).toFixed(2)} m${unit}`;
  if (abs >= 1e-6) return `${(v * 1e6).toFixed(2)} \u00B5${unit}`;
  return `${v.toExponential(2)} ${unit}`;
}

/**
 * Format gravity value (g) for display
 */
function fmtG(g) {
  if (g >= 1e6) return g.toExponential(2);
  return g.toFixed(3);
}

/**
 * Compute uniform tick screen positions (equal spacing, top line)
 */
function computeUniformTickPositions() {
  const positions = [];
  for (let k = 0; k <= N; k++) {
    positions.push(LINE_LEFT + (k / N) * LINE_LENGTH);
  }
  return positions;
}

/**
 * Compute gravity tick screen positions (non-uniform, bottom line).
 *
 * Ticks at screen fraction √(k/N) so that the constant-velocity body
 * crosses tick k at the same time the accelerating body crosses uniform tick k.
 *
 * Derivation:
 *   Accelerating body crosses uniform tick k when t/T = √(k/N).
 *   Constant-velocity body at that time is at screen fraction t/T = √(k/N).
 *   So gravity tick k goes at screen fraction √(k/N).
 */
function computeGravityTickPositions() {
  const positions = [];
  for (let k = 0; k <= N; k++) {
    const screenFrac = Math.sqrt(k / N);
    positions.push(LINE_LEFT + screenFrac * LINE_LENGTH);
  }
  return positions;
}

/**
 * Initialize the Gravity demo
 */
export function initGravityDemo() {
  const container = document.getElementById("gravity-demo-container");
  if (!container) return;

  const sceneData = create2DScene(container, {
    backgroundColor: 0x001a1a,
    cameraSize: 4.5,
  });

  ({ scene, camera, renderer, animate, cleanup } = sceneData);

  // Shift camera up so numberlines sit above the bottom panel
  camera.position.x = 0;
  camera.position.y = -0.8;

  // Build visual elements
  createNumberlines();
  createTicks();
  createBodies();
  createHandle();
  createLink();
  createFormulaDisplay(container);

  // Set up interaction
  setupInteraction(container);

  // Render loop
  const renderLoop = () => {
    stepAnimation();
    animate();
    requestAnimationFrame(renderLoop);
  };
  renderLoop();

  initializeModalHandlers("gravity-modal");
  updateVisualization();
}

/**
 * Create the two horizontal numberlines
 */
function createNumberlines() {
  // Top line (uniform grid) — warm color
  const topGeom = new LineGeometry();
  topGeom.setPositions([LINE_LEFT, TOP_Y, 0, LINE_RIGHT, TOP_Y, 0]);
  const topMat = new LineMaterial({ color: 0xff6644, linewidth: 2 });
  topMat.resolution.set(window.innerWidth, window.innerHeight);
  scene.add(new Line2(topGeom, topMat));

  // Bottom line (gravity grid) — teal color
  const botGeom = new LineGeometry();
  botGeom.setPositions([LINE_LEFT, BOT_Y, 0, LINE_RIGHT, BOT_Y, 0]);
  const botMat = new LineMaterial({ color: 0x00cccc, linewidth: 2 });
  botMat.resolution.set(window.innerWidth, window.innerHeight);
  scene.add(new Line2(botGeom, botMat));
}

/**
 * Create tick marks on both numberlines.
 * 144 ticks with major/minor hierarchy (major every 12th).
 */
function createTicks() {
  // Clear existing
  uniformTicks.forEach(t => { scene.remove(t); t.geometry.dispose(); });
  gravityTicks.forEach(t => { scene.remove(t); t.geometry.dispose(); });
  uniformTicks = [];
  gravityTicks = [];

  const uniformPositions = computeUniformTickPositions();
  const gravityPositions = computeGravityTickPositions();

  // Uniform ticks (top)
  uniformPositions.forEach((x, i) => {
    const isEndpoint = i === 0 || i === N;
    const isMajor = i % MAJOR_TICK_INTERVAL === 0;
    const height = isEndpoint ? TICK_HEIGHT * 1.8
      : isMajor ? TICK_HEIGHT * 1.2
      : TICK_HEIGHT * 0.5;
    const color = isEndpoint ? 0xff6644 : isMajor ? 0xcc5533 : 0x663322;
    const width = isEndpoint ? 2 : isMajor ? 1.5 : 1;

    const geom = new LineGeometry();
    geom.setPositions([x, TOP_Y - height, 0, x, TOP_Y + height, 0]);
    const mat = new LineMaterial({ color, linewidth: width });
    mat.resolution.set(window.innerWidth, window.innerHeight);
    const tick = new Line2(geom, mat);
    scene.add(tick);
    uniformTicks.push(tick);
  });

  // Gravity ticks (bottom)
  gravityPositions.forEach((x, i) => {
    const isEndpoint = i === 0 || i === N;
    const isMajor = i % MAJOR_TICK_INTERVAL === 0;
    const height = isEndpoint ? TICK_HEIGHT * 1.8
      : isMajor ? TICK_HEIGHT * 1.2
      : TICK_HEIGHT * 0.5;
    const color = isEndpoint ? 0x00cccc : isMajor ? 0x009999 : 0x004d4d;
    const width = isEndpoint ? 2 : isMajor ? 1.5 : 1;

    const geom = new LineGeometry();
    geom.setPositions([x, BOT_Y - height, 0, x, BOT_Y + height, 0]);
    const mat = new LineMaterial({ color, linewidth: width });
    mat.resolution.set(window.innerWidth, window.innerHeight);
    const tick = new Line2(geom, mat);
    scene.add(tick);
    gravityTicks.push(tick);
  });
}

/**
 * Create the two body markers (circles on each numberline)
 */
function createBodies() {
  // Body A (top — acceleration)
  const geoA = new THREE.CircleGeometry(BODY_RADIUS, 32);
  const matA = new THREE.MeshBasicMaterial({ color: 0xff8866 });
  bodyA = new THREE.Mesh(geoA, matA);
  bodyA.position.set(LINE_LEFT, TOP_Y, 0.01);
  scene.add(bodyA);

  // Trail A
  const trailGeoA = new LineGeometry();
  trailGeoA.setPositions([LINE_LEFT, TOP_Y, 0, LINE_LEFT, TOP_Y, 0]);
  const trailMatA = new LineMaterial({
    color: 0xff6644, linewidth: 3, transparent: true, opacity: 0.6,
  });
  trailMatA.resolution.set(window.innerWidth, window.innerHeight);
  trailA = new Line2(trailGeoA, trailMatA);
  trailA.position.z = -0.01;
  scene.add(trailA);

  // Body B (bottom — constant velocity)
  const geoB = new THREE.CircleGeometry(BODY_RADIUS, 32);
  const matB = new THREE.MeshBasicMaterial({ color: 0x44dddd });
  bodyB = new THREE.Mesh(geoB, matB);
  bodyB.position.set(LINE_LEFT, BOT_Y, 0.01);
  scene.add(bodyB);

  // Trail B
  const trailGeoB = new LineGeometry();
  trailGeoB.setPositions([LINE_LEFT, BOT_Y, 0, LINE_LEFT, BOT_Y, 0]);
  const trailMatB = new LineMaterial({
    color: 0x00cccc, linewidth: 3, transparent: true, opacity: 0.6,
  });
  trailMatB.resolution.set(window.innerWidth, window.innerHeight);
  trailB = new Line2(trailGeoB, trailMatB);
  trailB.position.z = -0.01;
  scene.add(trailB);
}

/**
 * Create the draggable time handle (vertical line between numberlines)
 */
function createHandle() {
  const lineGeom = new LineGeometry();
  lineGeom.setPositions([
    LINE_LEFT, TOP_Y + TICK_HEIGHT * 2, 0,
    LINE_LEFT, BOT_Y - TICK_HEIGHT * 2, 0,
  ]);
  const lineMat = new LineMaterial({
    color: 0xffffff, linewidth: 1.5, transparent: true, opacity: 0.4,
  });
  lineMat.resolution.set(window.innerWidth, window.innerHeight);
  handleLine = new Line2(lineGeom, lineMat);
  handleLine.position.z = 0.005;
  scene.add(handleLine);

  // Ring handle at midpoint between lines
  const ringGeom = new THREE.RingGeometry(0.08, 0.1, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, side: THREE.FrontSide,
  });
  handleRing = new THREE.Mesh(ringGeom, ringMat);
  handleRing.position.set(LINE_LEFT, 0, 0.02);
  scene.add(handleRing);
}

/**
 * Create the rigid link line between bodyA and bodyB.
 * Display-only — shows the differential angle as bodies diverge.
 */
function createLink() {
  const geom = new LineGeometry();
  geom.setPositions([LINE_LEFT, TOP_Y, 0, LINE_LEFT, BOT_Y, 0]);
  const mat = new LineMaterial({
    color: 0xffffff,
    linewidth: 1.5,
    transparent: true,
    opacity: 0.5,
  });
  mat.resolution.set(window.innerWidth, window.innerHeight);
  linkLine = new Line2(geom, mat);
  linkLine.position.z = 0.003;
  scene.add(linkLine);
}

/**
 * Create formula display panel and labels
 */
function createFormulaDisplay(container) {
  // Title
  const titleEl = document.createElement("div");
  titleEl.style.cssText = `
    position: absolute; top: 10px; left: 15px;
    font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold;
    color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.8); pointer-events: none;
  `;
  titleEl.textContent = "Gravity Numberline \u2014 Acceleration vs Grid";
  container.appendChild(titleEl);

  // Numberline labels
  const topLabel = document.createElement("div");
  topLabel.style.cssText = `
    position: absolute; top: 22%; left: 15px;
    font-family: 'Courier New', monospace; font-size: 14px;
    color: #ff6644; pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  `;
  topLabel.textContent = "UNIFORM GRID \u2014 body accelerates (x = \u00BDgt\u00B2)";
  container.appendChild(topLabel);

  const botLabel = document.createElement("div");
  botLabel.style.cssText = `
    position: absolute; top: 62%; left: 15px;
    font-family: 'Courier New', monospace; font-size: 14px;
    color: #00cccc; pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  `;
  botLabel.textContent = "GRAVITY GRID \u2014 body at constant velocity (x = vt)";
  container.appendChild(botLabel);

  // Body selector + Drop button wrapper (inline)
  const selectorWrap = document.createElement("div");
  selectorWrap.style.cssText = `position: absolute; top: 50px; left: 15px; z-index: 10; display: flex; gap: 8px; align-items: center;`;

  bodySelector = document.createElement("select");
  bodySelector.style.cssText = `
    padding: 4px 8px; background: rgba(0, 26, 26, 0.95);
    border: 1px solid #00cccc; border-radius: 4px; color: #ffffff;
    font-family: 'Courier New', monospace; font-size: 13px; cursor: pointer;
  `;

  Object.entries(RT.Gravity.BODIES).forEach(([key, body]) => {
    if (key === "normalized") return; // skip abstract preset
    const opt = document.createElement("option");
    opt.value = key;
    const gLabel = body.surfaceG >= 1e6
      ? body.surfaceG.toExponential(2) : body.surfaceG.toFixed(3);
    opt.textContent = `${body.name} (g = ${gLabel} m/s\u00B2)`;
    if (key === selectedBody) opt.selected = true;
    bodySelector.appendChild(opt);
  });

  bodySelector.addEventListener("change", () => {
    selectedBody = bodySelector.value;
    if (isAnimating) stopAnimation();
    createTicks();
    currentTimeFraction = 0;
    updateVisualization();
  });

  selectorWrap.appendChild(bodySelector);

  // Drop/Stop button — inline next to body selector
  dropButton = document.createElement("button");
  dropButton.textContent = "Drop";
  dropButton.style.cssText = `
    padding: 4px 14px; background: rgba(0, 26, 26, 0.95);
    border: 1px solid #00cccc; border-radius: 4px;
    color: #00cccc; font-family: 'Courier New', monospace;
    font-size: 13px; font-weight: bold; cursor: pointer;
    transition: background 0.2s, color 0.2s;
  `;
  dropButton.onmouseover = () => {
    dropButton.style.background = isAnimating
      ? "rgba(255, 60, 30, 0.3)" : "rgba(0, 204, 204, 0.2)";
  };
  dropButton.onmouseout = () => {
    dropButton.style.background = "rgba(0, 26, 26, 0.95)";
  };
  dropButton.addEventListener("click", toggleAnimation);
  selectorWrap.appendChild(dropButton);

  container.appendChild(selectorWrap);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cssText = `
    position: absolute; top: 8px; right: 8px; background: transparent;
    border: none; color: #888; font-size: 28px; cursor: pointer;
    padding: 0; width: 28px; height: 28px; line-height: 1; z-index: 10;
  `;
  closeBtn.onmouseover = () => { closeBtn.style.color = "#fff"; };
  closeBtn.onmouseout = () => { closeBtn.style.color = "#888"; };
  closeBtn.onclick = () => {
    if (isAnimating) stopAnimation();
    document.getElementById("gravity-modal").style.display = "none";
  };
  container.appendChild(closeBtn);

  // Formula panel (bottom, horizontal)
  formulaElement = document.createElement("div");
  formulaElement.className = "gravity-panel gravity-formula-panel";
  container.appendChild(formulaElement);
}

/**
 * Toggle animation on/off
 */
function toggleAnimation() {
  if (isAnimating) {
    stopAnimation();
  } else {
    startAnimation();
  }
}

/**
 * Start the drop animation
 */
function startAnimation() {
  isAnimating = true;
  currentTimeFraction = 0;
  animationStartTime = performance.now();
  dropButton.textContent = "Stop";
  dropButton.style.color = "#ff6644";
  dropButton.style.borderColor = "#ff6644";
  updateVisualization();
}

/**
 * Stop the animation and reset
 */
function stopAnimation() {
  isAnimating = false;
  animationStartTime = null;
  dropButton.textContent = "Drop";
  dropButton.style.color = "#00cccc";
  dropButton.style.borderColor = "#00cccc";
}

/**
 * Step the animation forward (called each frame)
 */
function stepAnimation() {
  if (!isAnimating || animationStartTime === null) return;

  const T = getTotalTime();
  const elapsed = (performance.now() - animationStartTime) / 1000;
  const timeFraction = elapsed / T;

  if (timeFraction >= 1.0) {
    currentTimeFraction = 1.0;
    updateVisualization();
    // Pause briefly, then loop
    setTimeout(() => {
      if (isAnimating) {
        currentTimeFraction = 0;
        animationStartTime = performance.now();
        updateVisualization();
      }
    }, 500);
    animationStartTime = null;
    return;
  }

  currentTimeFraction = timeFraction;
  updateVisualization();
}

/**
 * Update all visuals based on currentTimeFraction.
 *
 * Key physics:
 *   f = currentTimeFraction = t/T  (0 to 1)
 *
 *   Top body (accelerating on uniform grid):
 *     screen position = f² · LINE_LENGTH  (quadratic — slow start, fast end)
 *
 *   Bottom body (constant velocity on gravity grid):
 *     screen position = f · LINE_LENGTH   (linear — steady rate)
 *
 *   Both reach LINE_RIGHT when f = 1.
 */
function updateVisualization() {
  const g = getG();
  const H = getH();
  const T = getTotalTime();
  const f = currentTimeFraction;
  const t = f * T;

  // --- Body positions (the key difference!) ---
  // Top: accelerating body, position fraction = f² (quadratic in time)
  const topFrac = f * f;
  const topScreenX = LINE_LEFT + topFrac * LINE_LENGTH;

  // Bottom: constant velocity body, position fraction = f (linear in time)
  const botFrac = f;
  const botScreenX = LINE_LEFT + botFrac * LINE_LENGTH;

  // Physical values for the accelerating body
  const position = H * topFrac;        // x = ½gt² = H·f²
  const velocity = g * t;              // v = gt
  const constVelocity = H / T;         // v_const = H/T (bottom body)

  // Update body positions
  bodyA.position.x = topScreenX;
  bodyB.position.x = botScreenX;

  // Update trails
  trailA.geometry.dispose();
  const trailGeomA = new LineGeometry();
  trailGeomA.setPositions([LINE_LEFT, TOP_Y, 0, topScreenX, TOP_Y, 0]);
  trailA.geometry = trailGeomA;

  trailB.geometry.dispose();
  const trailGeomB = new LineGeometry();
  trailGeomB.setPositions([LINE_LEFT, BOT_Y, 0, botScreenX, BOT_Y, 0]);
  trailB.geometry = trailGeomB;

  // Handle tracks time linearly (between the two bodies)
  const handleX = LINE_LEFT + f * LINE_LENGTH;
  handleLine.geometry.dispose();
  const hGeom = new LineGeometry();
  hGeom.setPositions([
    handleX, TOP_Y + TICK_HEIGHT * 2, 0,
    handleX, BOT_Y - TICK_HEIGHT * 2, 0,
  ]);
  handleLine.geometry = hGeom;
  handleRing.position.x = handleX;

  // Which uniform tick has the accelerating body passed?
  // Uniform tick k at fraction k/N. Body at fraction f². Passed when f² >= k/N.
  const uniformCell = Math.min(Math.floor(topFrac * N), N - 1);
  const uniformSpacing = H / N;

  // Which gravity tick has the constant-velocity body passed?
  // Gravity tick k at screen fraction √(k/N). Body at screen fraction f.
  // Passed when f >= √(k/N), i.e., f² >= k/N. Same cell index!
  const gravityCell = uniformCell;

  // Current gravity gap (physical distance between gravity ticks)
  // Tick k at physical position H·√(k/N), tick k+1 at H·√((k+1)/N)
  const gravityGap = gravityCell < N
    ? H * (Math.sqrt((gravityCell + 1) / N) - Math.sqrt(gravityCell / N))
    : 0;

  // Separation between bodies (screen units)
  const separation = Math.abs(topScreenX - botScreenX);
  const separationPhysical = Math.abs(position - H * f);

  // Update rigid link line between bodies
  linkLine.geometry.dispose();
  const linkGeom = new LineGeometry();
  linkGeom.setPositions([topScreenX, TOP_Y, 0, botScreenX, BOT_Y, 0]);
  linkLine.geometry = linkGeom;

  // Link spread (RT-pure: sin^2 of angle from vertical)
  const link = linkSpread2D(topScreenX, TOP_Y, botScreenX, BOT_Y);
  const linkAngleDeg = Math.asin(Math.sqrt(link.spread)) * (180 / Math.PI);

  // Update formula panel
  const bodyInfo = RT.Gravity.BODIES[selectedBody];
  formulaElement.innerHTML = `
    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #ffffff;">Time</strong>
      <div class="gravity-section-content">
        t = <span class="gravity-color-time">${t.toFixed(3)} s</span><br>
        <span class="gravity-text-muted">${(f * 100).toFixed(1)}% of T = ${T.toFixed(3)} s</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #ff6644;">Accelerating</strong>
      <div class="gravity-section-content">
        x = \u00BDgt\u00B2 = <span class="gravity-color-position">${fmtVal(position)}</span><br>
        <span class="gravity-text-muted">v = ${fmtVal(velocity, "m/s")}</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #00cccc;">Constant v</strong>
      <div class="gravity-section-content">
        x = vt = <span style="color: #44dddd; font-weight: bold;">${fmtVal(H * f)}</span><br>
        <span class="gravity-text-muted">v = ${fmtVal(constVelocity, "m/s")}</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #ffaa00;">Grid Cell</strong>
      <div class="gravity-section-content">
        Cell <span class="gravity-color-velocity">${uniformCell}</span> of ${N}<br>
        <span class="gravity-text-muted">${fmtVal(H)} drop, ${N} cells</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #888;">Separation</strong>
      <div class="gravity-section-content">
        \u0394x = <span style="color: #fff;">${fmtVal(separationPhysical)}</span><br>
        <span class="gravity-text-muted">${bodyInfo.name}, g = ${fmtG(g)} m/s\u00B2</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #ccc;">Link</strong>
      <div class="gravity-section-content">
        s = <span style="color: #fff;">${link.spread.toFixed(4)}</span>
        <span class="gravity-text-muted">\u2248 ${linkAngleDeg.toFixed(1)}\u00B0</span><br>
        <span class="gravity-text-muted">Q = ${link.quadrance.toFixed(3)}</span>
      </div>
    </div>
  `;
}

/**
 * Set up mouse/touch interaction for handle dragging.
 * Handle X maps directly to time fraction (linear).
 */
function setupInteraction(container) {
  const canvas = renderer.domElement;

  const getMousePos = event => {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const aspect = rect.width / rect.height;
    const cameraSize = 4.5;
    const worldX = x * cameraSize * aspect + camera.position.x;
    const worldY = y * cameraSize + camera.position.y;

    return { worldX, worldY };
  };

  // Snap to quarter marks and major grid crossings
  const snapFractions = [0, 0.25, 0.5, 0.75, 1.0];
  for (let k = MAJOR_TICK_INTERVAL; k < N; k += MAJOR_TICK_INTERVAL) {
    // Time fraction when accelerating body crosses major tick k:
    // f² = k/N → f = √(k/N)
    snapFractions.push(Math.sqrt(k / N));
  }
  const SNAP_THRESHOLD = 0.012;

  const handleStart = event => {
    const { worldX, worldY } = getMousePos(event);
    const dx = worldX - handleRing.position.x;
    const dy = worldY - handleRing.position.y;
    const clickQ = dx * dx + dy * dy;

    const onLine = Math.abs(worldX - handleRing.position.x) < 0.3 &&
                   worldY > BOT_Y - TICK_HEIGHT * 2 &&
                   worldY < TOP_Y + TICK_HEIGHT * 2;

    if (clickQ < 0.2 * 0.2 || onLine) {
      isDragging = true;
      if (isAnimating) stopAnimation();
      canvas.style.cursor = "grabbing";
      event.preventDefault();
    }
  };

  const handleMove = event => {
    const { worldX, worldY } = getMousePos(event);

    if (!isDragging) {
      const dx = worldX - handleRing.position.x;
      const dy = worldY - handleRing.position.y;
      const hoverQ = dx * dx + dy * dy;
      const onLine = Math.abs(worldX - handleRing.position.x) < 0.3 &&
                     worldY > BOT_Y - TICK_HEIGHT * 2 &&
                     worldY < TOP_Y + TICK_HEIGHT * 2;
      canvas.style.cursor = (hoverQ < 0.2 * 0.2 || onLine) ? "grab" : "default";
      return;
    }

    // Handle X maps directly to time fraction (linear)
    let timeFrac = (worldX - LINE_LEFT) / LINE_LENGTH;
    timeFrac = Math.max(0, Math.min(1, timeFrac));

    // Snap to notable fractions
    for (const snapFrac of snapFractions) {
      if (Math.abs(timeFrac - snapFrac) < SNAP_THRESHOLD) {
        timeFrac = snapFrac;
        break;
      }
    }

    currentTimeFraction = timeFrac;
    updateVisualization();
    event.preventDefault();
  };

  const handleEnd = () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = "default";
    }
  };

  canvas.addEventListener("mousedown", handleStart);
  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("mouseup", handleEnd);
  canvas.addEventListener("mouseleave", handleEnd);

  canvas.addEventListener("touchstart", handleStart, { passive: false });
  canvas.addEventListener("touchmove", handleMove, { passive: false });
  canvas.addEventListener("touchend", handleEnd);
}

/**
 * Cleanup demo resources
 */
export function cleanupGravityDemo() {
  if (isAnimating) stopAnimation();
  if (cleanup) cleanup();
  if (formulaElement && formulaElement.parentNode) {
    formulaElement.parentNode.removeChild(formulaElement);
  }
}
