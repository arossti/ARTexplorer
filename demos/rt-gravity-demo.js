/**
 * RT-Gravity-Demo
 * Interactive demonstration of gravity grid intervals vs uniform spacing.
 *
 * Two numberlines: top has equal spacing (body accelerates visibly),
 * bottom has gravity-warped spacing (body crosses gridlines at constant rate).
 * Both bodies reach the right side at the same total time.
 *
 * First integration test of RT.Gravity namespace (rt-math.js).
 */

import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { create2DScene, initializeModalHandlers } from "./rt-demo-utils.js";
import { RT } from "../modules/rt-math.js";

// Scene references
let scene, camera, renderer, animate, cleanup;

// Visual elements
let handleLine, handleRing;
let bodyA, bodyB;
let trailA, trailB;
let formulaElement;
let bodySelector;
let uniformTicks = [];
let gravityTicks = [];

// State
let isDragging = false;
let currentTimeFraction = 0; // 0 to 1 (normalized time)
let selectedBody = "earth";
let N = 24; // Number of grid divisions

// Layout constants
const LINE_LEFT = -5.0;
const LINE_RIGHT = 5.0;
const LINE_LENGTH = LINE_RIGHT - LINE_LEFT;
const TOP_Y = 1.2;
const BOT_Y = -1.2;
const TICK_HEIGHT = 0.25;
const BODY_RADIUS = 0.12;

/**
 * Get current surface gravity for selected body
 */
function getG() {
  const body = RT.Gravity.BODIES[selectedBody];
  // Use surfaceG if available, otherwise default
  return body.surfaceG || RT.Gravity.g_standard;
}

/**
 * Get total height (normalized to LINE_LENGTH for display)
 */
function getH() {
  return 100; // 100 meters — a concrete physical value
}

/**
 * Get total fall time: T = sqrt(2H/g)
 */
function getTotalTime() {
  return Math.sqrt((2 * getH()) / getG());
}

/**
 * Map a physical position (0 to H) to screen x coordinate
 */
function posToScreenX(pos) {
  return LINE_LEFT + (pos / getH()) * LINE_LENGTH;
}

/**
 * Map screen x coordinate to normalized time fraction (0 to 1)
 */
function screenXToTimeFraction(screenX) {
  const clamped = Math.max(LINE_LEFT, Math.min(LINE_RIGHT, screenX));
  return (clamped - LINE_LEFT) / LINE_LENGTH;
}

/**
 * Compute gravity grid tick positions (non-uniform).
 * Ticks placed so that a falling body crosses them at equal time intervals.
 *
 * At equal time step k/N, position = H·(k/N)².
 * So tick k is at position H·(k/N)² — quadratic spacing.
 */
function computeGravityTickPositions() {
  const H = getH();
  const positions = [];
  for (let k = 0; k <= N; k++) {
    const frac = k / N;
    // Position under uniform g at time fraction k/N
    const pos = H * frac * frac; // x = ½g·(t)² scaled to H
    positions.push(posToScreenX(pos));
  }
  return positions;
}

/**
 * Compute uniform tick positions (equal spacing)
 */
function computeUniformTickPositions() {
  const positions = [];
  for (let k = 0; k <= N; k++) {
    positions.push(LINE_LEFT + (k / N) * LINE_LENGTH);
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

  // Center camera on the layout
  camera.position.x = 0;
  camera.position.y = 0;

  // Build visual elements
  createNumberlines();
  createTicks();
  createBodies();
  createHandle();
  createFormulaDisplay(container);

  // Set up interaction
  setupInteraction(container);

  // Start animation loop
  const renderLoop = () => {
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
  const topLine = new Line2(topGeom, topMat);
  scene.add(topLine);

  // Bottom line (gravity grid) — teal color
  const botGeom = new LineGeometry();
  botGeom.setPositions([LINE_LEFT, BOT_Y, 0, LINE_RIGHT, BOT_Y, 0]);
  const botMat = new LineMaterial({ color: 0x00cccc, linewidth: 2 });
  botMat.resolution.set(window.innerWidth, window.innerHeight);
  const botLine = new Line2(botGeom, botMat);
  scene.add(botLine);
}

/**
 * Create tick marks on both numberlines
 */
function createTicks() {
  // Clear existing ticks
  uniformTicks.forEach(t => { scene.remove(t); t.geometry.dispose(); });
  gravityTicks.forEach(t => { scene.remove(t); t.geometry.dispose(); });
  uniformTicks = [];
  gravityTicks = [];

  const uniformPositions = computeUniformTickPositions();
  const gravityPositions = computeGravityTickPositions();

  // Uniform ticks (top)
  uniformPositions.forEach((x, i) => {
    const isEndpoint = i === 0 || i === N;
    const height = isEndpoint ? TICK_HEIGHT * 1.5 : TICK_HEIGHT;
    const geom = new LineGeometry();
    geom.setPositions([x, TOP_Y - height, 0, x, TOP_Y + height, 0]);
    const mat = new LineMaterial({
      color: isEndpoint ? 0xff6644 : 0x884433,
      linewidth: isEndpoint ? 2 : 1,
    });
    mat.resolution.set(window.innerWidth, window.innerHeight);
    const tick = new Line2(geom, mat);
    scene.add(tick);
    uniformTicks.push(tick);
  });

  // Gravity ticks (bottom)
  gravityPositions.forEach((x, i) => {
    const isEndpoint = i === 0 || i === N;
    const height = isEndpoint ? TICK_HEIGHT * 1.5 : TICK_HEIGHT;
    const geom = new LineGeometry();
    geom.setPositions([x, BOT_Y - height, 0, x, BOT_Y + height, 0]);
    const mat = new LineMaterial({
      color: isEndpoint ? 0x00cccc : 0x006666,
      linewidth: isEndpoint ? 2 : 1,
    });
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
  // Body A (top - acceleration)
  const geoA = new THREE.CircleGeometry(BODY_RADIUS, 32);
  const matA = new THREE.MeshBasicMaterial({ color: 0xff8866 });
  bodyA = new THREE.Mesh(geoA, matA);
  bodyA.position.set(LINE_LEFT, TOP_Y, 0.01);
  scene.add(bodyA);

  // Trail A
  const trailGeoA = new LineGeometry();
  trailGeoA.setPositions([LINE_LEFT, TOP_Y, 0, LINE_LEFT, TOP_Y, 0]);
  const trailMatA = new LineMaterial({
    color: 0xff6644,
    linewidth: 3,
    transparent: true,
    opacity: 0.6,
  });
  trailMatA.resolution.set(window.innerWidth, window.innerHeight);
  trailA = new Line2(trailGeoA, trailMatA);
  trailA.position.z = -0.01;
  scene.add(trailA);

  // Body B (bottom - gravity grid)
  const geoB = new THREE.CircleGeometry(BODY_RADIUS, 32);
  const matB = new THREE.MeshBasicMaterial({ color: 0x44dddd });
  bodyB = new THREE.Mesh(geoB, matB);
  bodyB.position.set(LINE_LEFT, BOT_Y, 0.01);
  scene.add(bodyB);

  // Trail B
  const trailGeoB = new LineGeometry();
  trailGeoB.setPositions([LINE_LEFT, BOT_Y, 0, LINE_LEFT, BOT_Y, 0]);
  const trailMatB = new LineMaterial({
    color: 0x00cccc,
    linewidth: 3,
    transparent: true,
    opacity: 0.6,
  });
  trailMatB.resolution.set(window.innerWidth, window.innerHeight);
  trailB = new Line2(trailGeoB, trailMatB);
  trailB.position.z = -0.01;
  scene.add(trailB);
}

/**
 * Create the draggable time handle (vertical line spanning both numberlines)
 */
function createHandle() {
  // Vertical line
  const lineGeom = new LineGeometry();
  lineGeom.setPositions([
    LINE_LEFT, TOP_Y + TICK_HEIGHT * 2, 0,
    LINE_LEFT, BOT_Y - TICK_HEIGHT * 2, 0,
  ]);
  const lineMat = new LineMaterial({
    color: 0xffffff,
    linewidth: 1.5,
    transparent: true,
    opacity: 0.6,
  });
  lineMat.resolution.set(window.innerWidth, window.innerHeight);
  handleLine = new Line2(lineGeom, lineMat);
  handleLine.position.z = 0.005;
  scene.add(handleLine);

  // Ring handle at midpoint
  const ringGeom = new THREE.RingGeometry(0.08, 0.1, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.FrontSide,
  });
  handleRing = new THREE.Mesh(ringGeom, ringMat);
  handleRing.position.set(LINE_LEFT, 0, 0.02);
  scene.add(handleRing);
}

/**
 * Create formula display panel and labels
 */
function createFormulaDisplay(container) {
  // Title
  const titleEl = document.createElement("div");
  titleEl.style.cssText = `
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
  titleEl.textContent = "Gravity Numberline \u2014 Acceleration vs Grid";
  container.appendChild(titleEl);

  // Numberline labels
  const topLabel = document.createElement("div");
  topLabel.style.cssText = `
    position: absolute;
    top: 22%;
    left: 15px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: #ff6644;
    pointer-events: none;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  `;
  topLabel.textContent = "UNIFORM GRID (acceleration visible)";
  container.appendChild(topLabel);

  const botLabel = document.createElement("div");
  botLabel.style.cssText = `
    position: absolute;
    top: 62%;
    left: 15px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: #00cccc;
    pointer-events: none;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  `;
  botLabel.textContent = "GRAVITY GRID (constant crossing rate)";
  container.appendChild(botLabel);

  // Body selector
  const selectorWrap = document.createElement("div");
  selectorWrap.style.cssText = `
    position: absolute;
    top: 50px;
    left: 15px;
    z-index: 10;
  `;

  bodySelector = document.createElement("select");
  bodySelector.style.cssText = `
    padding: 4px 8px;
    background: rgba(0, 26, 26, 0.95);
    border: 1px solid #00cccc;
    border-radius: 4px;
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    cursor: pointer;
  `;

  // Populate from RT.Gravity.BODIES (only bodies with surfaceG)
  Object.entries(RT.Gravity.BODIES).forEach(([key, body]) => {
    if (!body.surfaceG) return; // Skip normalized and blackhole
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${body.name} (g = ${body.surfaceG} m/s\u00B2)`;
    if (key === selectedBody) opt.selected = true;
    bodySelector.appendChild(opt);
  });

  bodySelector.addEventListener("change", () => {
    selectedBody = bodySelector.value;
    createTicks(); // Rebuild gravity ticks for new g
    currentTimeFraction = 0;
    updateVisualization();
  });

  selectorWrap.appendChild(bodySelector);
  container.appendChild(selectorWrap);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "gravity-close-button";
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: none;
    color: #888;
    font-size: 28px;
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    line-height: 1;
    z-index: 10;
  `;
  closeBtn.onmouseover = () => { closeBtn.style.color = "#fff"; };
  closeBtn.onmouseout = () => { closeBtn.style.color = "#888"; };
  closeBtn.onclick = () => {
    document.getElementById("gravity-modal").style.display = "none";
  };
  container.appendChild(closeBtn);

  // Formula panel (right side)
  formulaElement = document.createElement("div");
  formulaElement.className = "gravity-panel gravity-formula-panel";
  container.appendChild(formulaElement);
}

/**
 * Update all visuals based on currentTimeFraction
 */
function updateVisualization() {
  const g = getG();
  const H = getH();
  const T = getTotalTime();
  const t = currentTimeFraction * T;

  // Physical position: x = ½gt²
  const position = 0.5 * g * t * t;
  const positionClamped = Math.min(position, H);
  const velocity = g * t;

  // Screen x for both bodies (same physical position)
  const screenX = posToScreenX(positionClamped);

  // Update body positions
  bodyA.position.x = screenX;
  bodyB.position.x = screenX;

  // Update trails
  trailA.geometry.dispose();
  const trailGeomA = new LineGeometry();
  trailGeomA.setPositions([LINE_LEFT, TOP_Y, 0, screenX, TOP_Y, 0]);
  trailA.geometry = trailGeomA;

  trailB.geometry.dispose();
  const trailGeomB = new LineGeometry();
  trailGeomB.setPositions([LINE_LEFT, BOT_Y, 0, screenX, BOT_Y, 0]);
  trailB.geometry = trailGeomB;

  // Update handle position
  handleLine.geometry.dispose();
  const hGeom = new LineGeometry();
  hGeom.setPositions([
    screenX, TOP_Y + TICK_HEIGHT * 2, 0,
    screenX, BOT_Y - TICK_HEIGHT * 2, 0,
  ]);
  handleLine.geometry = hGeom;
  handleRing.position.x = screenX;

  // Count which grid cell we're in (uniform)
  const uniformCell = Math.min(
    Math.floor((positionClamped / H) * N),
    N - 1
  );
  const uniformSpacing = H / N;

  // Count which grid cell we're in (gravity)
  // Gravity ticks at positions H·(k/N)². Find k where H·(k/N)² <= position
  let gravityCell = 0;
  for (let k = 1; k <= N; k++) {
    if (H * (k / N) * (k / N) <= positionClamped + 0.001) {
      gravityCell = k;
    }
  }
  const gravityGap = gravityCell < N
    ? H * ((gravityCell + 1) / N) * ((gravityCell + 1) / N) -
      H * (gravityCell / N) * (gravityCell / N)
    : 0;

  // Update formula panel
  const bodyInfo = RT.Gravity.BODIES[selectedBody];
  formulaElement.innerHTML = `
    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #ffffff;">Time</strong>
      <div class="gravity-section-content">
        t = <span class="gravity-color-time">${t.toFixed(3)} s</span><br>
        <span class="gravity-text-muted">${(currentTimeFraction * 100).toFixed(1)}% of T = ${T.toFixed(3)} s</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #ff6644;">Position</strong>
      <div class="gravity-section-content">
        x = \u00BDgt\u00B2 = <span class="gravity-color-position">${positionClamped.toFixed(3)} m</span><br>
        <span class="gravity-text-muted">${(positionClamped / H * 100).toFixed(1)}% of H = ${H} m</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #ffaa00;">Velocity</strong>
      <div class="gravity-section-content">
        v = gt = <span class="gravity-color-velocity">${velocity.toFixed(3)} m/s</span><br>
        <span class="gravity-text-muted">a = g = ${g.toFixed(4)} m/s\u00B2</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #ff6644;">Uniform Grid</strong>
      <div class="gravity-section-content">
        Cell ${uniformCell} of ${N}<br>
        <span class="gravity-text-muted">spacing = ${uniformSpacing.toFixed(3)} m (constant)</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #00cccc;">Gravity Grid</strong>
      <div class="gravity-section-content">
        Cell ${gravityCell} of ${N}<br>
        <span class="gravity-text-muted">gap = ${gravityGap.toFixed(3)} m (variable)</span><br>
        <span class="gravity-text-submuted">Ticks at x = H\u00B7(k/N)\u00B2</span>
      </div>
    </div>

    <div class="gravity-section-divider">
      <strong class="gravity-section-title" style="color: #00cccc;">Body</strong>
      <div class="gravity-section-content">
        ${bodyInfo.name}<br>
        <span class="gravity-text-muted">g = ${g.toFixed(4)} m/s\u00B2</span><br>
        <span class="gravity-text-submuted">GM = ${bodyInfo.GM.toExponential(4)}</span>
      </div>
    </div>

    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #004444;">
      <span class="gravity-text-muted" style="font-size: 10px; line-height: 1.4;">
        Both bodies at same position.<br>
        Top: acceleration visible (equal grid).<br>
        Bottom: acceleration hidden (warped grid).<br>
        Grid does the physics.
      </span>
    </div>
  `;
}

/**
 * Set up mouse/touch interaction for handle dragging
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

  // Snap points: endpoints and quarter marks
  const snapFractions = [0, 0.25, 0.5, 0.75, 1.0];
  // Also snap to each 1/N mark (gravity grid crossings = equal time steps)
  for (let k = 1; k < N; k++) {
    snapFractions.push(k / N);
  }
  const SNAP_THRESHOLD = 0.015; // fraction of total

  const handleStart = event => {
    const { worldX, worldY } = getMousePos(event);
    const dx = worldX - handleRing.position.x;
    const dy = worldY - handleRing.position.y;
    const clickQ = dx * dx + dy * dy;

    // Also allow clicking anywhere on the handle line
    const onLine = Math.abs(worldX - handleRing.position.x) < 0.2 &&
                   worldY > BOT_Y - TICK_HEIGHT * 2 &&
                   worldY < TOP_Y + TICK_HEIGHT * 2;

    if (clickQ < 0.15 * 0.15 || onLine) {
      isDragging = true;
      canvas.style.cursor = "grabbing";
      event.preventDefault();
    }
  };

  const handleMove = event => {
    const { worldX, worldY } = getMousePos(event);

    if (!isDragging) {
      // Hover detection
      const dx = worldX - handleRing.position.x;
      const dy = worldY - handleRing.position.y;
      const hoverQ = dx * dx + dy * dy;
      const onLine = Math.abs(worldX - handleRing.position.x) < 0.2 &&
                     worldY > BOT_Y - TICK_HEIGHT * 2 &&
                     worldY < TOP_Y + TICK_HEIGHT * 2;
      canvas.style.cursor = (hoverQ < 0.15 * 0.15 || onLine) ? "grab" : "default";
      return;
    }

    // Convert screen position to time fraction
    let frac = screenXToTimeFraction(worldX);

    // Snap to notable fractions
    for (const snapFrac of snapFractions) {
      if (Math.abs(frac - snapFrac) < SNAP_THRESHOLD) {
        frac = snapFrac;
        break;
      }
    }

    // But we need to map from POSITION fraction to TIME fraction
    // Screen X maps linearly to position. Position = H·(t/T)².
    // So positionFraction = (t/T)², meaning timeFraction = sqrt(positionFraction).
    // When user drags, they're controlling position directly:
    const positionFraction = Math.max(0, Math.min(1, (worldX - LINE_LEFT) / LINE_LENGTH));
    currentTimeFraction = Math.sqrt(positionFraction);

    // Re-apply snapping in time space
    for (const snapFrac of snapFractions) {
      if (Math.abs(currentTimeFraction - snapFrac) < SNAP_THRESHOLD) {
        currentTimeFraction = snapFrac;
        break;
      }
    }

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
  if (cleanup) cleanup();
  if (formulaElement && formulaElement.parentNode) {
    formulaElement.parentNode.removeChild(formulaElement);
  }
}
