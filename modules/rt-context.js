/**
 * A.R.T. Explorer - Right-Click Context Menu
 * Provides quick access to transform tools and actions for selected polyhedra
 *
 * @author Andy Ross Thomson
 */

export function initContextMenu(THREE, scene, camera, renderer) {
  // Module state
  const state = {
    menu: null,
    titleEl: null,
    target: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
  };

  // Initialize DOM references
  state.menu = document.getElementById("polyhedron-context-menu");
  state.titleEl = document.getElementById("context-menu-title");

  if (!state.menu) {
    console.warn("Context menu element not found");
    return null;
  }

  // Show context menu at position
  function show(x, y) {
    state.menu.classList.remove("hidden");

    // Keep within viewport
    const rect = state.menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 10;
    const maxY = window.innerHeight - rect.height - 10;

    state.menu.style.left = Math.min(x, maxX) + "px";
    state.menu.style.top = Math.min(y, maxY) + "px";
  }

  // Hide context menu
  function hide() {
    state.menu.classList.add("hidden");
    state.target = null;
  }

  // Sync button states with main panel
  function syncState() {
    // Get current states from main panel buttons
    const activeToolBtn = document.querySelector(
      ".toggle-btn.variant-tool.active"
    );
    const currentTool = activeToolBtn?.dataset.gumballTool || null;

    const activeSnapBtn = document.querySelector(
      ".toggle-btn.variant-snap.active"
    );
    const currentSnap = activeSnapBtn?.dataset.snapMode || "free";

    // Sync tool buttons
    state.menu.querySelectorAll("[data-action^='tool-']").forEach(btn => {
      const tool = btn.dataset.action.replace("tool-", "");
      btn.classList.toggle("active", currentTool === tool);
    });

    // Sync snap buttons
    state.menu.querySelectorAll("[data-action^='snap-']").forEach(btn => {
      const snap = btn.dataset.action.replace("snap-", "");
      btn.classList.toggle("active", currentSnap === snap);
    });

    // Sync object snap toggles
    state.menu.querySelectorAll("[data-action^='objsnap-']").forEach(btn => {
      const snapType = btn.dataset.action.replace("objsnap-", "");
      const mainBtn = document.querySelector(`[data-objsnap="${snapType}"]`);
      btn.classList.toggle("active", mainBtn?.classList.contains("active"));
    });

    // Update delete button state (only enable for instances)
    const deleteBtn = state.menu.querySelector("[data-action='delete']");
    if (deleteBtn && state.target) {
      const isInstance = state.target.userData?.isInstance;
      deleteBtn.disabled = !isInstance;
      deleteBtn.title = isInstance
        ? "Delete this instance"
        : "Cannot delete base form";
    }
  }

  // Find polyhedron at screen position
  function findPolyhedronAt(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    state.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    state.raycaster.setFromCamera(state.mouse, camera);

    // Collect visible polyhedra (userData.type is the property used in rt-rendering.js)
    const polyhedra = [];
    scene.traverse(obj => {
      if (obj.userData?.type && obj.visible) {
        polyhedra.push(obj);
      }
    });

    const intersects = state.raycaster.intersectObjects(polyhedra, true);

    if (intersects.length > 0) {
      // Walk up to find polyhedron group
      let target = intersects[0].object;
      while (target.parent && !target.userData?.type) {
        target = target.parent;
      }
      return target;
    }
    return null;
  }

  // Handle action button clicks
  function handleAction(action) {
    // Tool mode
    if (action.startsWith("tool-")) {
      const tool = action.replace("tool-", "");
      document.querySelector(`[data-gumball-tool="${tool}"]`)?.click();
      syncState();
      return;
    }

    // Snap mode
    if (action.startsWith("snap-")) {
      const snap = action.replace("snap-", "");
      document.querySelector(`[data-snap-mode="${snap}"]`)?.click();
      syncState();
      return;
    }

    // Object snaps (toggle)
    if (action.startsWith("objsnap-")) {
      const snapType = action.replace("objsnap-", "");
      document.querySelector(`[data-objsnap="${snapType}"]`)?.click();
      syncState();
      return;
    }

    // Deposit (NOW)
    if (action === "deposit") {
      document.getElementById("nowButton")?.click();
      hide();
      return;
    }

    // Delete instance
    if (action === "delete") {
      if (state.target?.userData?.isInstance) {
        scene.remove(state.target);
        if (state.target.userData.instanceId) {
          console.log("Deleted instance:", state.target.userData.instanceId);
        }
        // Notify state manager if available
        if (window.RTStateManager?.deleteInstance) {
          window.RTStateManager.deleteInstance(
            state.target.userData.instanceId
          );
        }
      }
      hide();
      return;
    }
  }

  // Event: Right-click on canvas
  renderer.domElement.addEventListener(
    "contextmenu",
    event => {
      event.preventDefault();

      const target = findPolyhedronAt(event.clientX, event.clientY);

      if (target) {
        state.target = target;

        // Update title (polyhedra use userData.type, not .polyhedronType)
        const typeName = target.userData.type || "Polyhedron";
        const displayName =
          typeName.charAt(0).toUpperCase() + typeName.slice(1);
        state.titleEl.textContent = target.userData.isInstance
          ? `${displayName} (Instance)`
          : displayName;

        syncState();
        show(event.clientX, event.clientY);
      }
    },
    { capture: true }
  );

  // Event: Click outside to dismiss
  document.addEventListener("click", event => {
    if (!state.menu.contains(event.target)) {
      hide();
    }
  });

  // Event: Escape to dismiss
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      hide();
    }
  });

  // Event: Menu button clicks
  state.menu.addEventListener("click", event => {
    const btn = event.target.closest(".context-btn");
    if (btn && btn.dataset.action) {
      handleAction(btn.dataset.action);
    }
  });

  // Return public API
  return {
    show,
    hide,
    syncState,
    getTarget: () => state.target,
  };
}
