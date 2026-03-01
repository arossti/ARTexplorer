/**
 * rt-gizmo.js — Viewport Orientation Gizmo
 *
 * 2D canvas overlay showing camera orientation with colored axis bubbles.
 * Two modes: XYZ (Cartesian) and ABCD (Quadray tetrahedral).
 * Click an axis bubble to snap the camera to that view.
 * Click the mode label to toggle between XYZ and ABCD.
 *
 * @module rt-gizmo
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  size: 160, // Canvas size in CSS pixels
  padding: 16, // Inset from circle edge to bubble centers
  bubbleSizePrimary: 16, // Diameter of labeled axis bubbles
  bubbleSizeSecondary: 8, // Diameter of negative axis bubbles
  lineWidth: 2,
  fontSize: "14px",
  fontWeight: "bold",
  fontFamily: "arial",
  labelColor: "#ffffff",
  labelColorDark: "#151515", // For yellow background
  bgIdle: "transparent",
  bgHover: "rgba(42, 42, 42, 0.6)",
  lineOpacity: 0.6,
  modeLabelColor: "#888888",
  modeLabelHover: "#ffffff",
  modeLabelFont: "bold 11px arial",
  hitRadius: 20, // Click/hover detection radius
};

// ============================================================================
// Axis Definitions
// ============================================================================

/**
 * XYZ mode: 3 primary axes + 3 negative axes
 * Colors match rt-grids.js Cartesian basis: X=Red, Y=Green, Z=Blue
 */
const XYZ_AXES = [
  {
    key: "x",
    dir: [1, 0, 0],
    color: "#ff0000",
    darkColor: "#942424",
    label: "X",
    snap: "x",
  },
  {
    key: "y",
    dir: [0, 1, 0],
    color: "#00ff00",
    darkColor: "#176617",
    label: "Y",
    snap: "y",
  },
  {
    key: "z",
    dir: [0, 0, 1],
    color: "#178cf0",
    darkColor: "#0e5490",
    label: "Z",
    snap: "zdown",
  },
  { key: "-x", dir: [-1, 0, 0], color: "#942424", darkColor: null, snap: "x" },
  {
    key: "-y",
    dir: [0, -1, 0],
    color: "#176617",
    darkColor: null,
    snap: "y",
  },
  {
    key: "-z",
    dir: [0, 0, -1],
    color: "#0e5490",
    darkColor: null,
    snap: "zup",
  },
];

/**
 * ABCD mode: 4 primary axes + 4 negative axes
 * Directions = tetrahedral vertices inscribed in cube (normalized at render time)
 * Colors match rt-grids.js line 615: A=Red, B=Green, C=Blue, D=Yellow
 * Snap presets use Quadray camera views via 3021 Rule:
 *   A (index 0) → QX → "quadqx"
 *   B (index 1) → QZ → "quadqz"
 *   C (index 2) → QY → "quadqy"
 *   D (index 3) → QW → "quadqw"
 */
const ABCD_AXES = [
  {
    key: "a",
    dir: [1, 1, 1],
    color: "#ff0000",
    darkColor: "#942424",
    label: "A",
    snap: "quadqx",
  },
  {
    key: "b",
    dir: [1, -1, -1],
    color: "#00ff00",
    darkColor: "#176617",
    label: "B",
    snap: "quadqz",
  },
  {
    key: "c",
    dir: [-1, 1, -1],
    color: "#0000ff",
    darkColor: "#0e5490",
    label: "C",
    snap: "quadqy",
  },
  {
    key: "d",
    dir: [-1, -1, 1],
    color: "#ffff00",
    darkColor: "#999922",
    label: "D",
    snap: "quadqw",
  },
  { key: "-a", dir: [-1, -1, -1], color: "#942424", darkColor: null },
  { key: "-b", dir: [-1, 1, 1], color: "#176617", darkColor: null },
  { key: "-c", dir: [1, -1, 1], color: "#0e5490", darkColor: null },
  { key: "-d", dir: [1, 1, -1], color: "#999922", darkColor: null },
];

// ============================================================================
// Matrix Helpers (avoid THREE.js dependency — pure 2D canvas module)
// ============================================================================

/**
 * Invert a 3x3 rotation matrix (transpose, since rotation matrices are orthogonal)
 * Input/output: flat array [m00, m01, m02, m10, m11, m12, m20, m21, m22]
 */
function transpose3x3(m) {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

/**
 * Multiply 3x3 matrix by 3-vector
 */
function mulMat3Vec3(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/**
 * Extract upper-left 3x3 from a THREE.js Matrix4 elements array (column-major)
 * Returns row-major 3x3 for our mulMat3Vec3
 */
function extract3x3FromMatrix4Elements(e) {
  // THREE.js Matrix4.elements is column-major: [m00, m10, m20, m30, m01, ...]
  return [
    e[0],
    e[4],
    e[8], // row 0
    e[1],
    e[5],
    e[9], // row 1
    e[2],
    e[6],
    e[10], // row 2
  ];
}

/**
 * Normalize a 3-vector in place
 */
function normalize3(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < 1e-10) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

// ============================================================================
// Gizmo Factory
// ============================================================================

/**
 * Create a viewport orientation gizmo.
 *
 * @param {THREE.PerspectiveCamera|THREE.OrthographicCamera} getCamera - Function returning current camera
 * @param {Function} setCameraPreset - Callback: setCameraPreset(viewName)
 * @param {object} THREE - THREE.js namespace (for Matrix4)
 * @returns {object} Gizmo API: { canvas, update, setMode, getMode, onModeChange, dispose }
 */
export function createViewGizmo(getCamera, setCameraPreset, THREE) {
  // --- State ---
  let mode = "xyz"; // "xyz" or "abcd"
  let _onModeChange = null; // Optional callback: _onModeChange(newMode)
  let hoveredAxis = null;
  let hoveredModeLabel = false;
  let projectedAxes = []; // Populated each frame: [{ ...axisDef, x, y, z, isPrimary }]

  // --- Canvas Setup ---
  const dpr = window.devicePixelRatio || 1;
  const cssSize = CONFIG.size;
  const canvas = document.createElement("canvas");
  canvas.width = cssSize * dpr;
  canvas.height = (cssSize + 24) * dpr; // Extra space for mode label
  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + 24 + "px";
  canvas.style.position = "absolute";
  canvas.style.top = "12px";
  canvas.style.right = "12px";
  canvas.style.zIndex = "100";
  canvas.style.pointerEvents = "auto";
  canvas.style.cursor = "default";

  const ctx = canvas.getContext("2d");

  // Reusable THREE.js Matrix4 for extracting camera rotation
  const _mat4 = new THREE.Matrix4();

  // --- Helpers ---

  const center = cssSize / 2;
  const radius = cssSize / 2 - CONFIG.padding;

  function getActiveAxes() {
    return mode === "abcd" ? ABCD_AXES : XYZ_AXES;
  }

  /**
   * Project axis directions through inverse camera rotation to get 2D positions.
   * Returns array sorted back-to-front by Z.
   */
  function projectAxes(camera) {
    // Get rotation-only matrix from camera, then invert (transpose)
    _mat4.makeRotationFromEuler(camera.rotation);
    const rot3x3 = extract3x3FromMatrix4Elements(_mat4.elements);
    const invRot = transpose3x3(rot3x3);

    const axes = getActiveAxes();
    projectedAxes = axes.map(axis => {
      const dir = normalize3(axis.dir);
      const projected = mulMat3Vec3(invRot, dir);

      // Map to canvas coordinates:
      // projected[0] = right (+X screen), projected[1] = up (+Y screen, but canvas Y is down)
      const isPrimary = !!axis.label;
      return {
        ...axis,
        x: center + projected[0] * radius,
        y: center - projected[1] * radius, // Flip Y for canvas
        z: projected[2], // Depth for sorting
        isPrimary,
      };
    });

    // Sort back-to-front (low Z drawn first, high Z drawn on top)
    projectedAxes.sort((a, b) => a.z - b.z);
  }

  /**
   * Draw a single axis: line from center + filled circle + optional label
   */
  function drawAxis(axis) {
    const bubbleSize = axis.isPrimary
      ? CONFIG.bubbleSizePrimary
      : CONFIG.bubbleSizeSecondary;
    const isHovered = hoveredAxis && hoveredAxis.key === axis.key;

    // Determine colors — front face vs back face
    const isFrontFacing = axis.z >= -0.01;
    const fillColor = isFrontFacing
      ? axis.color
      : axis.darkColor || axis.color;

    // Line from center to bubble
    ctx.beginPath();
    ctx.moveTo(center * dpr, center * dpr);
    ctx.lineTo(axis.x * dpr, axis.y * dpr);
    ctx.strokeStyle = fillColor;
    ctx.globalAlpha = CONFIG.lineOpacity;
    ctx.lineWidth = CONFIG.lineWidth * dpr;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Bubble circle
    ctx.beginPath();
    ctx.arc(axis.x * dpr, axis.y * dpr, (bubbleSize / 2) * dpr, 0, Math.PI * 2);

    if (isHovered) {
      // Hover: white fill with colored ring
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = fillColor;
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
    } else {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    // Label text (primary axes only)
    if (axis.isPrimary && axis.label) {
      const isYellow = axis.color === "#ffff00";
      ctx.fillStyle = isHovered
        ? fillColor
        : isYellow
          ? CONFIG.labelColorDark
          : CONFIG.labelColor;
      ctx.font = `${CONFIG.fontWeight} ${parseFloat(CONFIG.fontSize) * dpr}px ${CONFIG.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(axis.label, axis.x * dpr, axis.y * dpr + 1 * dpr);
    }
  }

  /**
   * Draw the mode toggle label below the circle
   */
  function drawModeLabel() {
    const labelText = mode === "abcd" ? "ABCD" : "XYZ";
    const y = cssSize + 12; // Below the circle

    ctx.fillStyle = hoveredModeLabel
      ? CONFIG.modeLabelHover
      : CONFIG.modeLabelColor;
    ctx.font = CONFIG.modeLabelFont.replace(
      /(\d+)px/,
      (_, n) => `${parseFloat(n) * dpr}px`
    );
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, center * dpr, y * dpr);
  }

  /**
   * Draw background circle (only on hover)
   */
  function drawBackground() {
    if (hoveredAxis || hoveredModeLabel) {
      ctx.beginPath();
      ctx.arc(
        center * dpr,
        center * dpr,
        (cssSize / 2 - 4) * dpr,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = CONFIG.bgHover;
      ctx.fill();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(center * dpr, center * dpr, 3 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = "#666666";
    ctx.fill();
  }

  // --- Public API ---

  function update() {
    const camera = getCamera();
    if (!camera) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Project axes
    projectAxes(camera);

    // Draw background
    drawBackground();

    // Draw axes (already sorted back-to-front)
    for (const axis of projectedAxes) {
      drawAxis(axis);
    }

    // Draw mode label
    drawModeLabel();
  }

  function setMode(newMode) {
    if ((newMode === "xyz" || newMode === "abcd") && newMode !== mode) {
      mode = newMode;
      hoveredAxis = null;
      if (_onModeChange) _onModeChange(newMode);
    }
  }

  function getMode() {
    return mode;
  }

  function dispose() {
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("click", onClick);
    if (canvas.parentElement) {
      canvas.parentElement.removeChild(canvas);
    }
  }

  // --- Interaction ---

  /**
   * Find the nearest axis bubble to a CSS-coordinate pointer position.
   * Returns axis object or null.
   */
  function hitTestAxis(cssX, cssY) {
    let closest = null;
    let closestDist = CONFIG.hitRadius;

    // Test in reverse order (front-most first, since they're drawn on top)
    for (let i = projectedAxes.length - 1; i >= 0; i--) {
      const axis = projectedAxes[i];
      const dx = cssX - axis.x;
      const dy = cssY - axis.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = axis;
      }
    }
    return closest;
  }

  /**
   * Test if pointer is over the mode label
   */
  function hitTestModeLabel(cssX, cssY) {
    const labelY = cssSize + 12;
    return (
      Math.abs(cssX - center) < 30 && Math.abs(cssY - labelY) < 10
    );
  }

  function getCSSCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function onPointerMove(e) {
    const { x, y } = getCSSCoords(e);
    hoveredAxis = hitTestAxis(x, y);
    hoveredModeLabel = hitTestModeLabel(x, y);
    canvas.style.cursor =
      hoveredAxis || hoveredModeLabel ? "pointer" : "default";
  }

  function onPointerLeave() {
    hoveredAxis = null;
    hoveredModeLabel = false;
    canvas.style.cursor = "default";
  }

  function onClick(e) {
    const { x, y } = getCSSCoords(e);

    // Check mode label first
    if (hitTestModeLabel(x, y)) {
      setMode(mode === "xyz" ? "abcd" : "xyz");
      return;
    }

    // Check axis bubbles
    const hit = hitTestAxis(x, y);
    if (hit && hit.snap) {
      setCameraPreset(hit.snap);
    }
  }

  // --- Wire Events ---
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("click", onClick);

  return {
    canvas,
    update,
    setMode,
    getMode,
    onModeChange: cb => { _onModeChange = cb; },
    dispose,
  };
}
