/**
 * rt-metalog.js
 * Centralized Geometry Logging for ARTexplorer
 *
 * Replaces scattered console.log calls across geometry generator modules
 * with level-gated, consistently formatted output.
 *
 * Levels:
 *   SILENT (0)   - No geometry logs (default, toggle OFF)
 *   SUMMARY (1)  - === TITLE === + V/E/F + edge Q (toggle ON)
 *   DETAILED (2) - + construction method, sphere metrics (?logLevel=detailed)
 *   DEBUG (3)    - + WXYZ coords, phi expansions, validation arrays (?logLevel=debug)
 *
 * Usage:
 *   import { MetaLog } from "./rt-metalog.js";
 *   MetaLog.polyhedron("Tetrahedron", "{3,3}", { V: 4, E: 6, F: 4, edgeQ, ... });
 *
 * @module rt-metalog
 */

export const MetaLog = {
  // Level constants
  SILENT: 0,
  SUMMARY: 1,
  DETAILED: 2,
  DEBUG: 3,

  // Current level (mutable from UI toggle / URL param)
  _level: 0,

  // Stack-based suppression for internal calls (stats builder, node spheres,
  // compound internals). When > 0, all logging is silenced regardless of level.
  _suppressCount: 0,

  /** Temporarily silence all logging (nestable) */
  suppress() {
    this._suppressCount++;
  },

  /** Restore logging after suppress() (nestable) */
  unsuppress() {
    if (this._suppressCount > 0) this._suppressCount--;
  },

  /** Check if logging is active at the given minimum level */
  _active(minLevel) {
    return this._suppressCount === 0 && this._level >= minLevel;
  },

  get level() {
    return this._level;
  },

  /**
   * Set logging level with validation
   * @param {number} newLevel - 0 (SILENT) to 3 (DEBUG)
   */
  setLevel(newLevel) {
    const clamped = Math.max(0, Math.min(3, newLevel));
    this._level = clamped;
    if (clamped > 0) {
      const names = ["SILENT", "SUMMARY", "DETAILED", "DEBUG"];
      console.log(`[MetaLog] Level set to ${names[clamped]} (${clamped})`);
    }
  },

  /**
   * Initialize from URL parameters
   * Call once from rt-init.js during setup.
   * @returns {number|null} Level if URL param found, null otherwise
   */
  initFromURL() {
    const params = new URLSearchParams(window.location.search);
    const urlLevel = params.get("logLevel");
    if (urlLevel) {
      const map = { silent: 0, summary: 1, detailed: 2, debug: 3 };
      const level = map[urlLevel.toLowerCase()];
      if (level !== undefined) {
        this.setLevel(level);
        return level;
      }
    }
    return null;
  },

  // =========================================================================
  // Section Loggers
  // =========================================================================

  /**
   * Identity section: title banner + construction method + halfSize
   * @param {string} name - Polyhedron name (e.g., "Tetrahedron")
   * @param {string} schlafli - Schlafli symbol (e.g., "{3,3}")
   * @param {Object} data - { construction, halfSize }
   */
  identity(name, schlafli, data = {}) {
    if (!this._active(this.SUMMARY)) return;
    const symbol = schlafli ? ` ${schlafli}` : "";
    console.log(`=== ${name.toUpperCase()}${symbol} ===`);
    if (data.construction) {
      console.log(`  Construction: ${data.construction}`);
    }
    if (data.halfSize !== undefined) {
      console.log(`  HalfSize (s): ${Number(data.halfSize).toFixed(6)}`);
    }
  },

  /**
   * RT Metrics section: V/E/F, Euler check, edge quadrance, face spread
   * @param {Object} data - { V, E, F, edgeQ, edgeLength, maxError, faceSpread, faceSpreadFraction }
   */
  rtMetrics(data) {
    if (!this._active(this.SUMMARY)) return;
    const {
      V,
      E,
      F,
      edgeQ,
      edgeLength,
      maxError,
      faceSpread,
      faceSpreadFraction,
    } = data;

    if (V !== undefined && E !== undefined && F !== undefined) {
      console.log(`  V: ${V}, E: ${E}, F: ${F}`);
      const euler = V - E + F;
      console.log(`  Euler: V - E + F = ${euler} ${euler === 2 ? "\u2713" : "\u2717"}`);
    }
    if (edgeQ !== undefined) {
      console.log(`  Edge Q: ${edgeQ.toFixed(6)}`);
    }
    if (edgeLength !== undefined) {
      console.log(`  Edge length: ${edgeLength.toFixed(6)}`);
    }
    if (maxError !== undefined) {
      console.log(`  Max Q error: ${maxError.toExponential(2)}`);
    }
    if (faceSpread !== undefined) {
      const fraction = faceSpreadFraction ? ` (${faceSpreadFraction})` : "";
      console.log(`  Face spread S: ${faceSpread.toFixed(6)}${fraction}`);
    }
  },

  /**
   * Construction details: phi algebra, symbolic math, projections
   * Only output at DETAILED level and above.
   * @param {string|string[]} lines - Single line or array of lines
   */
  construction(lines) {
    if (!this._active(this.DETAILED)) return;
    if (typeof lines === "string") {
      console.log(`  ${lines}`);
    } else if (Array.isArray(lines)) {
      lines.forEach(line => console.log(`  ${line}`));
    }
  },

  /**
   * Sphere metrics: projection type, target Q, radius
   * Only output at DETAILED level and above.
   * @param {Object} data - { projection, targetQ, targetRadius, avgQ, maxError }
   */
  spheres(data) {
    if (!this._active(this.DETAILED)) return;
    if (data.projection) console.log(`  Projection: ${data.projection}`);
    if (data.targetQ !== undefined)
      console.log(`  Target Q: ${data.targetQ.toFixed(6)}`);
    if (data.targetRadius !== undefined)
      console.log(`  Target radius: ${data.targetRadius.toFixed(6)}`);
    if (data.avgQ !== undefined)
      console.log(`  Avg edge Q: ${data.avgQ.toFixed(6)}`);
    if (data.maxError !== undefined)
      console.log(`  Sphere max error: ${data.maxError.toExponential(2)}`);
  },

  // =========================================================================
  // Generic Level-Gated Logging
  // =========================================================================

  /**
   * Level-gated console.log
   * @param {number} minLevel - Minimum level required to output
   * @param {...*} args - Arguments passed to console.log
   */
  log(minLevel, ...args) {
    if (this._active(minLevel)) console.log(...args);
  },

  /**
   * Level-gated console.warn
   * @param {number} minLevel - Minimum level required to output
   * @param {...*} args - Arguments passed to console.warn
   */
  warn(minLevel, ...args) {
    if (this._active(minLevel)) console.warn(...args);
  },

  // =========================================================================
  // Convenience: Full Polyhedron Log
  // =========================================================================

  /**
   * Log an entire polyhedron at once (all applicable sections)
   * @param {string} name - Polyhedron name
   * @param {string} schlafli - Schlafli symbol
   * @param {Object} data - Combined data for all sections:
   *   { V, E, F, edgeQ, edgeLength, maxError, faceSpread, faceSpreadFraction,
   *     construction, halfSize, constructionLines, projection, targetQ, ... }
   */
  polyhedron(name, schlafli, data = {}) {
    if (!this._active(this.SUMMARY)) return;
    this.identity(name, schlafli, data);
    this.rtMetrics(data);
    if (this._level >= this.DETAILED) {
      if (data.constructionLines) this.construction(data.constructionLines);
      if (data.projection) this.spheres(data);
    }
  },
};
