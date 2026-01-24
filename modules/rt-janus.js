// ========================================================================
// RT-JANUS.JS - Janus Point Transition System
// ========================================================================
// Extracted from rt-init.js
// Handles through-origin (Janus Point) transitions with visual effects
//
// The Janus Point represents the geometric origin where positive and
// negative dimensional spaces meet. When a polyhedron scales through
// the origin, it crosses into "negative space" (inverted geometry).

// Module state (initialized via init())
let THREE = null;
let scene = null;

// Janus crossing detection state
let globalDimensionalState = "positive";
let previousGlobalSign = 1; // Last non-zero sign: 1 or -1
let hasTriggeredAtZero = false; // Debounce: prevent double-trigger when passing through 0

/**
 * Initialize the Janus module with required dependencies
 * @param {Object} deps - Dependencies object
 * @param {Object} deps.THREE - THREE.js library
 * @param {THREE.Scene} deps.scene - Scene reference for effects
 */
export function init(deps) {
  THREE = deps.THREE;
  scene = deps.scene;
}

/**
 * Check if we crossed the Janus Point (zero)
 * Returns: 'inward' | 'outward' | null
 *
 * Critical fix: When slider goes 0.1 → 0.0 → -0.1, we must trigger ONCE.
 * Without debouncing, both the 0.1→0.0 AND 0.0→-0.1 transitions would trigger.
 */
export function checkGlobalJanusCrossing(newValue) {
  const newSign = Math.sign(newValue); // -1, 0, or 1
  let direction = null;

  if (newSign === 0) {
    // Landing on zero: trigger transition if we haven't already
    if (!hasTriggeredAtZero) {
      direction = previousGlobalSign > 0 ? "inward" : "outward";
      hasTriggeredAtZero = true;
    }
    // Don't update previousGlobalSign at zero - keep last known direction
  } else {
    // Non-zero value
    if (newSign !== previousGlobalSign) {
      // Actual sign change (e.g., from positive to negative)
      if (!hasTriggeredAtZero) {
        // Crossed directly without landing on zero
        direction = previousGlobalSign > 0 ? "inward" : "outward";
      }
      // Update to new sign
      previousGlobalSign = newSign;
    }
    // Reset debounce when we've moved away from zero
    hasTriggeredAtZero = false;
  }

  return direction;
}

/**
 * Get/set the global dimensional state
 * @param {string} [newState] - Optional new state to set ('positive' or 'negative')
 * @returns {string} Current dimensional state
 */
export function getDimensionalState(newState) {
  if (newState !== undefined) {
    globalDimensionalState = newState;
  }
  return globalDimensionalState;
}

/**
 * Trigger the Janus Point transition animation when a polyhedron crosses origin
 * @param {THREE.Group} poly - The polyhedron crossing the origin
 * @param {string} direction - 'inward' (positive→negative) or 'outward' (negative→positive)
 * @param {Array} selectedPolyhedra - Array of currently selected polyhedra
 */
export function triggerJanusTransition(poly, direction, selectedPolyhedra) {
  const isEnteringNegative = direction === "inward";

  // ================================================================
  // Phase 1: Ghost non-selected forms
  // ================================================================
  scene.traverse(child => {
    if (
      child.userData &&
      child.userData.type &&
      !selectedPolyhedra.includes(child)
    ) {
      // This is a polyhedron that is NOT being scaled - ghost it
      child.traverse(mesh => {
        if (mesh.isMesh && mesh.material) {
          // Store original material properties for restoration
          if (!mesh.userData.originalOpacity) {
            mesh.userData.originalOpacity = mesh.material.opacity;
            mesh.userData.originalTransparent = mesh.material.transparent;
          }
          // Apply ghost effect
          mesh.material.transparent = true;
          mesh.material.opacity = 0.25;
          mesh.material.needsUpdate = true;
        }
      });
    }
  });

  // ================================================================
  // Phase 2: Background inversion
  // ================================================================
  const targetColor = isEnteringNegative ? 0xffffff : 0x1a1a1a;
  animateBackgroundColor(targetColor, 300);

  // ================================================================
  // Phase 3: Flash effect at origin (the "Janus moment")
  // ================================================================
  createJanusFlash(poly.position.clone());

  // ================================================================
  // Phase 4: Restore non-selected forms after transition settles
  // ================================================================
  setTimeout(() => {
    scene.traverse(child => {
      if (
        child.userData &&
        child.userData.type &&
        !selectedPolyhedra.includes(child)
      ) {
        child.traverse(mesh => {
          if (
            mesh.isMesh &&
            mesh.material &&
            mesh.userData.originalOpacity !== undefined
          ) {
            // Restore original opacity (or keep ghosted if we're in negative space)
            const hasNegativeForms = scene.children.some(
              c => c.userData && c.userData.dimensionalState === "negative"
            );
            if (hasNegativeForms) {
              // Keep ghosted while any form is in negative space
              mesh.material.opacity = 0.35;
            } else {
              // Restore original
              mesh.material.opacity = mesh.userData.originalOpacity;
              mesh.material.transparent = mesh.userData.originalTransparent;
            }
            mesh.material.needsUpdate = true;
          }
        });
      }
    });
  }, 550); // After animation completes (200 + 50 + 200 + 100ms)

  console.log(
    `💫 Janus transition: ${direction} → background ${isEnteringNegative ? "WHITE" : "BLACK"}`
  );
}

/**
 * Animate scene background color transition
 * @param {number} targetColorHex - Target color in hex (e.g., 0xffffff)
 * @param {number} duration - Animation duration in ms
 */
export function animateBackgroundColor(targetColorHex, duration) {
  const startColor = scene.background.clone();
  const endColor = new THREE.Color(targetColorHex);
  const startTime = performance.now();

  function animate() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-in-out cubic
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    scene.background.copy(startColor).lerp(endColor, eased);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * Create a brief flash effect at the Janus Point (origin crossing)
 * @param {THREE.Vector3} position - Position of the flash
 */
export function createJanusFlash(position) {
  // Create a glowing sphere that expands and fades
  const flashGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffcc, // Warm golden-white
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });

  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.position.copy(position);
  scene.add(flash);

  // Animate: expand and fade
  const startTime = performance.now();
  const duration = 250; // ms

  function animateFlash() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Scale up rapidly
    const scale = 0.1 + progress * 2.5;
    flash.scale.set(scale, scale, scale);

    // Fade out
    flashMaterial.opacity = 0.9 * (1 - progress);

    if (progress < 1) {
      requestAnimationFrame(animateFlash);
    } else {
      // Cleanup
      scene.remove(flash);
      flashGeometry.dispose();
      flashMaterial.dispose();
    }
  }

  requestAnimationFrame(animateFlash);
}
