/**
 * RT-Demo-Utils
 * Shared utilities for 2D math demonstrations using THREE.js
 */

import * as THREE from "three";

/**
 * Creates a 2D THREE.js scene with orthographic camera
 * @param {HTMLElement} container - DOM element to render into
 * @param {Object} options - Configuration options
 * @returns {Object} Scene, camera, renderer, and utility functions
 */
export function create2DScene(container, options = {}) {
  const { backgroundColor = 0xffffff, cameraSize = 10 } = options;

  // Get actual container dimensions
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);

  // Orthographic camera for true 2D rendering
  const aspect = width / height;
  const camera = new THREE.OrthographicCamera(
    -cameraSize * aspect,
    cameraSize * aspect,
    cameraSize,
    -cameraSize,
    0.1,
    1000
  );
  camera.position.z = 10;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Ensure canvas fills container
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";

  container.appendChild(renderer.domElement);

  // Animation loop
  function animate() {
    renderer.render(scene, camera);
  }

  // Resize handler
  function handleResize() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    const newAspect = newWidth / newHeight;

    camera.left = -cameraSize * newAspect;
    camera.right = cameraSize * newAspect;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);
  }

  return {
    scene,
    camera,
    renderer,
    animate,
    handleResize,
    cleanup: () => {
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}

/**
 * Creates a 2D grid helper for reference
 */
export function create2DGrid(size = 20, divisions = 20, color = 0xcccccc) {
  const grid = new THREE.GridHelper(size, divisions, color, color);
  grid.rotation.x = Math.PI / 2;
  return grid;
}

/**
 * Creates a 2D axis helper
 */
export function create2DAxes(size = 10) {
  const axes = new THREE.Group();

  const xAxis = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    size,
    0xff0000
  );

  const yAxis = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 0),
    size,
    0x00ff00
  );

  axes.add(xAxis, yAxis);
  return axes;
}

/**
 * Opens a demo modal
 */
export function openDemoModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
  }
}

/**
 * Closes a demo modal
 */
export function closeDemoModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * Initialize modal close handlers
 */
export function initializeModalHandlers(modalId) {
  const modal = document.getElementById(modalId);
  const closeBtn = modal?.querySelector(".close-modal");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeDemoModal(modalId));
  }

  if (modal) {
    modal.addEventListener("click", e => {
      if (e.target === modal) {
        closeDemoModal(modalId);
      }
    });
  }
}
