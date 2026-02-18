/**
 * @fileoverview A.r.t.steroids - Weapons, Projectiles & Collision Detection
 * @module rt-asteroids-weapons
 * @requires THREE (via CDN)
 * @requires rt-math.js (shared core module - quadrance calculations)
 *
 * @description
 * Weapon systems for both player (Stellarian RT darts) and enemies (Cartesian laser darts).
 * Implements RT-pure collision detection using quadrance (no square roots).
 *
 * @weapons
 * - Stellarian Laser Darts: Instant RT spread-based targeting, faster projectiles
 * - Tetrahedral Photon Torpedoes: 500 fuel unlock, 100 fuel cost, 4-fold symmetry explosion
 * - Cartesian Laser Darts: Post-telegraph heavy glowing projectiles (0.7× player speed)
 *
 * @collision_detection
 * Uses RT-pure quadrance calculations (Q = Δx² + Δy² + Δz²) for performance.
 * No square roots until visual explosion effects.
 *
 * @documentation
 * - Design doc: /Geometry Documents/A.r.t.steroids.md
 * - Weapon systems: A.r.t.steroids.md Section 7
 * - Collision detection: A.r.t.steroids.md Appendix A.2
 *
 * @related
 * - rt-asteroids-player.js - Player firing mechanics
 * - rt-asteroids-enemies.js - Enemy firing mechanics, targeting telegraph
 * - rt-math.js - Quadrance calculations (RT.quadrance function)
 *
 * @author Andy Thomson, M.Arch. OAA
 * @copyright OpenBuilding, Inc. 2025
 * @license Commercial/Proprietary - Part of A.r.t.steroids ($50 CAD)
 */

(function () {
  "use strict";

  window.RT = window.RT || {};

  /**
   * Weapons and collision detection system
   * @namespace RT.Weapons
   */
  RT.Weapons = (function () {
    // Weapon type enumeration
    const WeaponType = {
      STELLARIAN_DART: "STELLARIAN_DART", // Player instant RT targeting
      TETRAHEDRAL_TORPEDO: "TETRAHEDRAL_TORPEDO", // Player ultimate weapon
      CARTESIAN_DART: "CARTESIAN_DART", // Enemy post-telegraph projectile
    };

    // Active projectiles array
    let projectiles = [];

    /**
     * Projectile class
     */
    class Projectile {
      constructor(type, position, velocity, owner) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.position = { ...position }; // Quadray or Cartesian depending on owner
        this.velocity = { ...velocity };
        this.owner = owner; // 'player' or enemy ID
        this.lifetime = 5.0; // seconds before auto-despawn
        this.age = 0;
        this.damage = this.getDamageForType(type);
        this.mesh = null; // THREE.Line or THREE.Mesh
      }

      /**
       * Get damage value for weapon type
       * @param {string} type - WeaponType enum value
       * @returns {number} Damage amount
       */
      getDamageForType(type) {
        switch (type) {
          case WeaponType.STELLARIAN_DART:
            return 5;
          case WeaponType.TETRAHEDRAL_TORPEDO:
            return 25; // Base, multiplied by enemy type
          case WeaponType.CARTESIAN_DART:
            return 10;
          default:
            return 1;
        }
      }

      /**
       * Update projectile state
       * @param {number} deltaTime - Time since last frame (seconds)
       */
      update(deltaTime) {
        // TODO: Update position based on velocity
        // TODO: Update mesh transform
        // TODO: Increment age
        // TODO: Check if exceeded lifetime (auto-despawn)

        this.age += deltaTime;

        if (this.age >= this.lifetime) {
          this.destroy();
        }
      }

      /**
       * Destroy projectile (collision or timeout)
       */
      destroy() {
        console.log(`[Projectile ${this.id}] Destroyed`);

        // TODO: Remove mesh from scene
        // TODO: Play impact/despawn effect
        // TODO: Remove from projectiles array
      }
    }

    /**
     * Fire Stellarian laser dart (player weapon)
     * @param {object} position - Quadray position
     * @param {object} direction - Normalized velocity vector
     * @param {number} speed - Projectile speed (units per second)
     */
    function fireStellarianDart(position, direction, speed = 50) {
      const velocity = {
        x: direction.x * speed,
        y: direction.y * speed,
        z: direction.z * speed,
      };

      const dart = new Projectile(
        WeaponType.STELLARIAN_DART,
        position,
        velocity,
        "player"
      );

      projectiles.push(dart);

      console.log("[Weapons] Stellarian dart fired");

      // TODO: Create THREE.Line mesh with glowing material
      // TODO: Play firing sound effect
      // TODO: Deduct fuel cost

      return dart;
    }

    /**
     * Fire Tetrahedral Photon Torpedo (player ultimate weapon)
     * @param {object} position - Quadray position
     * @param {object} target - Target enemy or position
     */
    function fireTorpedo(position, target) {
      // Check fuel requirement
      // TODO: Verify player has 100 fuel
      // TODO: Check cooldown timer (30s)

      const torpedo = new Projectile(
        WeaponType.TETRAHEDRAL_TORPEDO,
        position,
        { x: 0, y: 0, z: 0 }, // Auto-tracking (velocity computed in update)
        "player"
      );

      torpedo.target = target;
      projectiles.push(torpedo);

      console.log("[Weapons] Tetrahedral Photon Torpedo launched");

      // TODO: Create tetrahedron mesh projectile
      // TODO: Implement auto-targeting using RT spread calculations
      // TODO: Play torpedo launch sound
      // TODO: Deduct 100 fuel
      // TODO: Start 30s cooldown timer

      return torpedo;
    }

    /**
     * Fire Cartesian laser dart (enemy weapon)
     * @param {object} position - Cartesian XYZ position
     * @param {object} targetPosition - Locked target position from telegraph
     */
    function fireCartesianDart(position, targetPosition) {
      // Calculate velocity toward target (0.7× player dart speed)
      const dx = targetPosition.x - position.x;
      const dy = targetPosition.y - position.y;
      const dz = targetPosition.z - position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const speed = 35; // 0.7× Stellarian speed
      const velocity = {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed,
        z: (dz / distance) * speed,
      };

      const dart = new Projectile(
        WeaponType.CARTESIAN_DART,
        position,
        velocity,
        "enemy" // Owner will be set to specific enemy ID
      );

      projectiles.push(dart);

      console.log("[Weapons] Cartesian laser dart fired");

      // TODO: Create heavy glowing line mesh (lineWidth 3-5)
      // TODO: Play bass hum sound effect

      return dart;
    }

    /**
     * Check collision between projectile and target using RT quadrance
     * @param {Projectile} projectile - Projectile to check
     * @param {object} target - Target with position and radius
     * @returns {boolean} True if collision detected
     */
    function checkCollision(projectile, target) {
      // RT-Pure collision detection (NO SQUARE ROOT!)
      const dx = projectile.position.x - target.position.x;
      const dy = projectile.position.y - target.position.y;
      const dz = projectile.position.z - target.position.z;

      // Quadrance (distance squared)
      const Q = dx * dx + dy * dy + dz * dz;

      // Collision threshold (combined radii squared)
      const threshold = (projectile.radius + target.radius) ** 2;

      return Q < threshold;
    }

    /**
     * Update all projectiles and check collisions
     * @param {number} deltaTime - Time since last frame (seconds)
     * @param {object} player - Player object
     * @param {Array} enemies - Enemy array
     */
    function updateAll(deltaTime, player, enemies) {
      projectiles.forEach(projectile => {
        projectile.update(deltaTime);

        // TODO: Check player projectiles vs enemies
        // TODO: Check enemy projectiles vs player
        // TODO: Apply damage on collision
        // TODO: Trigger explosion effects
      });

      // Remove destroyed projectiles
      projectiles = projectiles.filter(p => p.age < p.lifetime);
    }

    /**
     * Clear all projectiles (wave transition)
     */
    function clearAll() {
      projectiles.forEach(p => {
        // TODO: Remove meshes from scene
        // TODO: Dispose geometries/materials
      });

      projectiles = [];
      console.log("[Weapons] All projectiles cleared");
    }

    // Public API
    return {
      WeaponType,
      fireStellarianDart,
      fireTorpedo,
      fireCartesianDart,
      checkCollision,
      updateAll,
      clearAll,

      // Getters
      getAll: () => projectiles,
      getCount: () => projectiles.length,
    };
  })();

  console.log("[rt-asteroids-weapons.js] Module loaded - RT.Weapons available");
})();
