/**
 * @fileoverview A.r.t.steroids - Player Ship & ASDF Rubber-Band Motion
 * @module rt-asteroids-player
 * @requires THREE (via CDN)
 * @requires rt-math.js (shared core module)
 * @requires rt-polyhedra.js (shared core module)
 * @requires rt-matrix-planar.js (shared core module)
 *
 * @description
 * Player ship controller with ASDF rubber-band navigation system.
 * Implements tetrahedral WXYZ displacement along Quadray axes with
 * quantitative easing return animation.
 *
 * @mechanics
 * - Hold A/S/D/F: Displacement along W/X/Y/Z Quadray basis vectors (exponential/quadratic curve)
 * - Release key: Quantitative easing return to origin (0.5-1.0s animation)
 * - Max displacement: Q_max = 50 quadrance units
 * - Fuel cost: 1 fuel per second of displacement
 * - World-frame reference: Player always at canvas center, world moves relative
 *
 * @coordinate_system
 * WXYZ Quadray is a separate tetrahedral coordinate system (NOT an extension of XYZ).
 * Four equiangular basis vectors from tetrahedron center to vertices.
 *
 * @documentation
 * - Design doc: /Geometry Documents/A.r.t.steroids.md
 * - Motion dynamics: A.r.t.steroids.md Version 3.2 Updates
 * - ASDF motion test: /demos/asdf-motion-test.html (THIS WEEK)
 *
 * @related
 * - rt-asteroids-core.js - Game loop integration
 * - rt-asteroids-weapons.js - Firing mechanics (separate from motion)
 * - rt-asteroids-hud.js - WXYZ coordinate display
 *
 * @author Andy Thomson, M.Arch. OAA
 * @copyright OpenBuilding, Inc. 2025
 * @license Commercial/Proprietary - Part of A.r.t.steroids ($50 CAD)
 */

(function () {
  "use strict";

  window.RT = window.RT || {};

  /**
   * Player ship controller with ASDF rubber-band navigation
   * @namespace RT.Player
   */
  RT.Player = (function () {
    // Ship tier enumeration
    const ShipTier = {
      TETRAHEDRON: "TETRAHEDRON", // Tier 1 (starting ship)
      OCTAHEDRON: "OCTAHEDRON", // Tier 2
      ICOSAHEDRON: "ICOSAHEDRON", // Tier 3
      CUBOCTAHEDRON: "CUBOCTAHEDRON", // Tier 4 (Vector Equilibrium)
      STELLARIA_OCTANGULA: "STELLARIA_OCTANGULA", // Tier 5 (black hole navigator)
      RHOMBIC_DODECA: "RHOMBIC_DODECA", // Tier 6
      IVM_SWARM: "IVM_SWARM", // Tier 7 (ultimate form)
    };

    // ASDF key states (W/X/Y/Z Quadray basis vectors)
    // Note: WXYZ is a separate 4-axis tetrahedral coordinate system (NOT Cartesian XYZ + W)
    const keyStates = {
      W: false, // A key - displacement along W basis vector (red)
      X: false, // S key - displacement along X basis vector (green)
      Y: false, // D key - displacement along Y basis vector (blue)
      Z: false, // F key - displacement along Z basis vector (yellow)
    };

    // Player state
    let shipTier = ShipTier.TETRAHEDRON;
    let quadrayPosition = [1, 1, 1, 1]; // Origin in WXYZ Quadray tetrahedral coordinate system
    let displacement = { W: 0, X: 0, Y: 0, Z: 0 }; // Current displacement along Quadray basis vectors
    let returnAnimation = { W: null, X: null, Y: null, Z: null }; // Return-to-origin animations
    let health = 100;
    let invulnerable = false;
    let invulnerabilityTimer = 0;

    // Physics constants
    const MAX_DISPLACEMENT = 50; // Q_max quadrance units
    const DISPLACEMENT_SPEED = 20; // Units per second
    const RETURN_DURATION = 0.75; // Seconds for quantitative easing return
    const FUEL_COST_PER_SECOND = 1.0;

    /**
     * Initialize player ship
     */
    function init() {
      console.log("[Player] Initializing Stellarian ship...");

      // TODO: Create tetrahedron mesh at origin
      // TODO: Bind ASDF keyboard listeners
      // TODO: Setup ship transformation matrices

      resetToOrigin();
    }

    /**
     * Update player ship state (called every frame)
     * @param {number} deltaTime - Time since last frame (seconds)
     */
    function update(deltaTime) {
      // TODO: Process ASDF key states
      // TODO: Update displacement along pressed axes
      // TODO: Update return animations for released axes
      // TODO: Calculate Quadray position from displacement
      // TODO: Update ship mesh position (world moves, ship stays at center)
      // TODO: Deduct fuel costs
      // TODO: Update invulnerability timer
    }

    /**
     * Handle ASDF keydown event
     * @param {string} basisVector - 'W', 'X', 'Y', or 'Z' (Quadray basis vector)
     */
    function onAxisKeyDown(basisVector) {
      if (!keyStates.hasOwnProperty(basisVector)) return;

      keyStates[basisVector] = true;

      // Cancel return animation if reactivating basis vector
      if (returnAnimation[basisVector]) {
        returnAnimation[basisVector] = null;
      }

      console.log(
        `[Player] ${basisVector} Quadray basis vector displacement activated`
      );
    }

    /**
     * Handle ASDF keyup event
     * @param {string} basisVector - 'W', 'X', 'Y', or 'Z' (Quadray basis vector)
     */
    function onAxisKeyUp(basisVector) {
      if (!keyStates.hasOwnProperty(basisVector)) return;

      keyStates[basisVector] = false;

      // Start quantitative easing return animation
      startReturnAnimation(basisVector);

      console.log(
        `[Player] ${basisVector} Quadray basis vector return animation started`
      );
    }

    /**
     * Start quantitative easing return animation for Quadray basis vector
     * @param {string} basisVector - 'W', 'X', 'Y', or 'Z'
     */
    function startReturnAnimation(basisVector) {
      const currentDisplacement = displacement[basisVector];
      if (Math.abs(currentDisplacement) < 0.01) return; // Already at origin

      returnAnimation[basisVector] = {
        startDisplacement: currentDisplacement,
        elapsed: 0,
        duration: RETURN_DURATION,
      };
    }

    /**
     * Reset player to origin (after death or respawn)
     */
    function resetToOrigin() {
      quadrayPosition = [1, 1, 1, 1];
      displacement = { W: 0, X: 0, Y: 0, Z: 0 };
      returnAnimation = { W: null, X: null, Y: null, Z: null };

      // Reset key states
      Object.keys(keyStates).forEach(key => {
        keyStates[key] = false;
      });

      console.log("[Player] Reset to origin [1,1,1,1]");
    }

    /**
     * Upgrade ship to next tier
     * @param {string} newTier - ShipTier enum value
     */
    function upgradeShip(newTier) {
      if (!ShipTier.hasOwnProperty(newTier)) {
        console.error(`[Player] Invalid ship tier: ${newTier}`);
        return;
      }

      shipTier = newTier;
      console.log(`[Player] Ship upgraded to ${newTier}`);

      // TODO: Update ship mesh geometry
      // TODO: Update stats (health, speed, firing rate)
      // TODO: Play upgrade animation
    }

    /**
     * Take damage from enemy
     * @param {number} damage - Damage amount
     */
    function takeDamage(damage) {
      if (invulnerable) return;

      health -= damage;
      console.log(`[Player] Took ${damage} damage - ${health} HP remaining`);

      if (health <= 0) {
        // TODO: Trigger death sequence
        // TODO: Call RT.AsteroidsGame.handlePlayerDeath()
      }
    }

    // Public API
    return {
      ShipTier,
      init,
      update,
      onAxisKeyDown,
      onAxisKeyUp,
      resetToOrigin,
      upgradeShip,
      takeDamage,

      // Getters
      getPosition: () => quadrayPosition,
      getDisplacement: () => displacement,
      getShipTier: () => shipTier,
      getHealth: () => health,
      isInvulnerable: () => invulnerable,

      // Setters
      setInvulnerable: (value, duration = 3.0) => {
        invulnerable = value;
        invulnerabilityTimer = duration;
      },
    };
  })();

  console.log("[rt-asteroids-player.js] Module loaded - RT.Player available");
})();
