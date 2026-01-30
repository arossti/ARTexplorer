/**
 * rt-ui-bindings.js
 * Declarative UI binding system for ARTexplorer
 *
 * Replaces hundreds of individual addEventListener() calls with data-driven binding.
 * Part of the Phase 1 modularization effort (Jan 30, 2026).
 *
 * Usage:
 *   import { uiBindings } from './rt-ui-bindings.js';
 *   uiBindings.init({ updateGeometry, renderingAPI, RT, Quadray });
 *   uiBindings.registerAll(bindingDefinitions);
 *   uiBindings.applyAll();
 *
 * @module RTUIBindings
 */

/**
 * Binding types supported:
 * - checkbox: Toggle visibility, triggers updateGeometry
 * - checkbox-controls: Toggle visibility + show/hide sub-controls
 * - slider: Update value display, triggers updateGeometry
 * - slider-linked: Bidirectional conversion (e.g., Quadrance ↔ Length)
 * - button-group: Exclusive selection within group
 * - toggle-group: Toggle buttons (can be combined, not exclusive)
 */

export class RTUIBindings {
  constructor() {
    this.bindings = [];
    this.updateGeometry = null;
    this.renderingAPI = null;
    this.RT = null;
    this.Quadray = null;
    this.initialized = false;
  }

  /**
   * Initialize with dependencies
   * @param {Object} deps - { updateGeometry, renderingAPI, RT, Quadray }
   */
  init(deps) {
    this.updateGeometry = deps.updateGeometry;
    this.renderingAPI = deps.renderingAPI;
    this.RT = deps.RT;
    this.Quadray = deps.Quadray;
    this.initialized = true;
    console.log("✅ RTUIBindings initialized");
  }

  /**
   * Register a binding definition
   * @param {Object} binding - Binding configuration
   */
  register(binding) {
    this.bindings.push(binding);
  }

  /**
   * Register multiple bindings at once
   * @param {Array} bindings - Array of binding configurations
   */
  registerAll(bindings) {
    bindings.forEach(b => this.register(b));
    console.log(`📋 RTUIBindings: Registered ${bindings.length} bindings`);
  }

  /**
   * Apply all registered bindings to the DOM
   * Call this AFTER DOM is ready
   */
  applyAll() {
    if (!this.initialized) {
      console.error("❌ RTUIBindings: Must call init() before applyAll()");
      return;
    }

    let applied = 0;
    let skipped = 0;

    this.bindings.forEach(binding => {
      if (this._applyBinding(binding)) {
        applied++;
      } else {
        skipped++;
      }
    });

    console.log(
      `✅ RTUIBindings: Applied ${applied} bindings, skipped ${skipped}`
    );
  }

  /**
   * Internal: Apply a single binding
   * @returns {boolean} True if binding was applied successfully
   */
  _applyBinding(binding) {
    // For linked sliders, element lookup is different
    if (binding.type === "slider-linked") {
      return this._bindLinkedSliders(binding);
    }

    if (binding.type === "button-group") {
      return this._bindButtonGroup(binding);
    }

    if (binding.type === "toggle-group") {
      return this._bindToggleGroup(binding);
    }

    // Standard single-element bindings
    const element = document.getElementById(binding.id);
    if (!element) {
      // Don't warn for optional bindings
      if (!binding.optional) {
        console.warn(`⚠️ RTUIBindings: Element not found: ${binding.id}`);
      }
      return false;
    }

    switch (binding.type) {
      case "checkbox":
        return this._bindCheckbox(element, binding);
      case "checkbox-controls":
        return this._bindCheckboxWithControls(element, binding);
      case "slider":
        return this._bindSlider(element, binding);
      default:
        console.warn(`⚠️ RTUIBindings: Unknown binding type: ${binding.type}`);
        return false;
    }
  }

  /**
   * Bind a simple checkbox
   */
  _bindCheckbox(element, binding) {
    element.addEventListener("change", () => {
      // Custom handler (if provided)
      if (binding.onChange) {
        binding.onChange(element.checked, this.renderingAPI, this.RT);
      }

      // Update geometry (unless explicitly disabled)
      if (binding.updateGeometry !== false) {
        this.updateGeometry();
      }
    });
    return true;
  }

  /**
   * Bind a checkbox that shows/hides sub-controls
   */
  _bindCheckboxWithControls(element, binding) {
    const controlsElement = binding.controlsId
      ? document.getElementById(binding.controlsId)
      : null;

    element.addEventListener("change", () => {
      // Show/hide controls
      if (controlsElement) {
        // Check if there's a sibling checkbox that should keep controls visible
        if (binding.siblingCheckboxId) {
          const sibling = document.getElementById(binding.siblingCheckboxId);
          const shouldShow = element.checked || (sibling && sibling.checked);
          controlsElement.style.display = shouldShow ? "block" : "none";
        } else {
          controlsElement.style.display = element.checked ? "block" : "none";
        }
      }

      // Custom handler (if provided)
      if (binding.onChange) {
        binding.onChange(element.checked, this.renderingAPI, this.RT);
      }

      // Update geometry (unless explicitly disabled)
      if (binding.updateGeometry !== false) {
        this.updateGeometry();
      }
    });
    return true;
  }

  /**
   * Bind a slider with optional value display
   */
  _bindSlider(element, binding) {
    const valueDisplay = binding.valueId
      ? document.getElementById(binding.valueId)
      : null;

    element.addEventListener("input", e => {
      const value = parseFloat(e.target.value);

      // Update value display
      if (valueDisplay) {
        const displayValue = binding.formatValue
          ? binding.formatValue(value)
          : value;
        valueDisplay.textContent = displayValue;
      }

      // Custom handler (if provided)
      if (binding.onInput) {
        binding.onInput(value, this.renderingAPI, this.RT, this.Quadray);
      }

      // Update geometry (unless explicitly disabled)
      if (binding.updateGeometry !== false) {
        this.updateGeometry();
      }
    });

    // Also bind 'change' event for sliders (fires on mouseup)
    if (binding.onChange) {
      element.addEventListener("change", e => {
        const value = parseFloat(e.target.value);
        binding.onChange(value, this.renderingAPI, this.RT, this.Quadray);
      });
    }

    return true;
  }

  /**
   * Bind two sliders with bidirectional conversion
   * e.g., Quadrance ↔ Length (Q = L², L = √Q)
   */
  _bindLinkedSliders(binding) {
    const primaryEl = document.getElementById(binding.primaryId);
    const secondaryEl = document.getElementById(binding.secondaryId);

    if (!primaryEl || !secondaryEl) {
      if (!binding.optional) {
        console.warn(
          `⚠️ RTUIBindings: Linked slider elements not found: ${binding.primaryId}, ${binding.secondaryId}`
        );
      }
      return false;
    }

    // Primary → Secondary conversion
    primaryEl.addEventListener("input", () => {
      const primaryValue = parseFloat(primaryEl.value) || 1;
      const secondaryValue = binding.primaryToSecondary(primaryValue);
      secondaryEl.value = secondaryValue.toFixed(4);

      if (binding.updateGeometry !== false) {
        this.updateGeometry();
      }
    });

    // Secondary → Primary conversion
    secondaryEl.addEventListener("input", () => {
      const secondaryValue = parseFloat(secondaryEl.value) || 1;
      const primaryValue = binding.secondaryToPrimary(secondaryValue);
      primaryEl.value = primaryValue.toFixed(4);

      if (binding.updateGeometry !== false) {
        this.updateGeometry();
      }
    });

    return true;
  }

  /**
   * Bind a group of exclusive buttons (radio-button behavior)
   */
  _bindButtonGroup(binding) {
    const buttons = binding.buttons
      .map(b => ({
        element: document.getElementById(b.id),
        ...b,
      }))
      .filter(b => b.element);

    if (buttons.length === 0) {
      if (!binding.optional) {
        console.warn(
          `⚠️ RTUIBindings: No button elements found for group: ${binding.groupId}`
        );
      }
      return false;
    }

    buttons.forEach(btn => {
      btn.element.addEventListener("click", () => {
        // Remove active from all buttons in group
        buttons.forEach(b => b.element.classList.remove("active"));

        // Add active to clicked button
        btn.element.classList.add("active");

        // Call button-specific handler
        if (btn.onClick) {
          btn.onClick(this.renderingAPI, this.RT);
        }

        // Update geometry if specified
        if (binding.updateGeometry) {
          this.updateGeometry();
        }
      });
    });

    return true;
  }

  /**
   * Bind a group of toggle buttons (can be combined, not exclusive)
   */
  _bindToggleGroup(binding) {
    const buttons = binding.buttons
      .map(b => ({
        element: document.getElementById(b.id),
        ...b,
      }))
      .filter(b => b.element);

    if (buttons.length === 0) {
      if (!binding.optional) {
        console.warn(
          `⚠️ RTUIBindings: No toggle elements found for group: ${binding.groupId}`
        );
      }
      return false;
    }

    buttons.forEach(btn => {
      btn.element.addEventListener("click", () => {
        // Toggle active state
        btn.element.classList.toggle("active");
        const isActive = btn.element.classList.contains("active");

        // Call button-specific handler with new state
        if (btn.onToggle) {
          btn.onToggle(isActive, this.renderingAPI, this.RT);
        }

        // Update geometry if specified
        if (binding.updateGeometry) {
          this.updateGeometry();
        }
      });
    });

    return true;
  }

  /**
   * Get count of registered bindings
   */
  getBindingCount() {
    return this.bindings.length;
  }

  /**
   * Clear all bindings (for testing/reset)
   */
  clearAll() {
    this.bindings = [];
  }
}

// Singleton instance for convenience
export const uiBindings = new RTUIBindings();
