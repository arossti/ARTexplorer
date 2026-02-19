/**
 * @fileoverview A.r.t.steroids - Sound Effects & Music Management
 * @module rt-asteroids-audio
 * @requires Web Audio API
 *
 * @description
 * Audio system for A.r.t.steroids game sound effects and music.
 * Uses Web Audio API for spatial audio and procedural sound generation.
 *
 * @sound_effects
 * - Laser fire (4 variants for W/X/Y/Z Quadray basis vectors) - High-pitched pew with basis-specific pitch
 * - Enemy explosion - XYZ planar fragmentation crunch
 * - Player damage - Polyhedral shattering sound
 * - Hyperspace deploy - Wobbly warp sound
 * - Matrix army spawn - Cascading spawn sequence
 * - Black hole collapse - Descending pitch vortex
 * - Black hole expansion - Ascending pitch emergence
 * - Targeting lock - High-pitched tone (0.2s before enemy fire)
 * - UI click/hover - Retro computer beeps
 * - Game over - Melancholic synth fadeout
 *
 * @music_tracks
 * - Menu theme - Synthwave upbeat
 * - Gameplay theme - Synthwave intense
 * - Black hole transition - Ambient drone
 * - The Infinite - Ethereal golden harmony
 *
 * @documentation
 * - Design doc: /Geometry Documents/A.r.t.steroids.md
 * - Audio requirements: A.r.t.steroids.md Appendix B.2
 *
 * @related
 * - rt-asteroids-player.js - Player laser firing sounds
 * - rt-asteroids-enemies.js - Enemy firing, explosions
 * - rt-asteroids-blackhole.js - Black hole transition audio
 *
 * @author Andy Thomson, M.Arch. OAA
 * @copyright OpenBuilding, Inc. 2025
 * @license Commercial/Proprietary - Part of A.r.t.steroids ($50 CAD)
 */

(function () {
  "use strict";

  window.RT = window.RT || {};

  /**
   * Audio system for game sounds and music
   * @namespace RT.Audio
   */
  RT.Audio = (function () {
    // Audio context
    let audioContext = null;
    let masterGain = null;

    // Sound effect buffers
    const soundBuffers = new Map();

    // Music tracks
    const musicTracks = new Map();
    let currentMusicSource = null;
    let currentTrack = null;

    // Volume settings
    let masterVolume = 0.7;
    let sfxVolume = 0.8;
    let musicVolume = 0.5;

    /**
     * Initialize audio system
     */
    function init() {
      console.log("[Audio] Initializing audio system...");

      // Create Web Audio context
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.gain.value = masterVolume;
        masterGain.connect(audioContext.destination);

        console.log("[Audio] Audio context created");
      } catch (error) {
        console.error("[Audio] Failed to create audio context:", error);
        return;
      }

      // TODO: Load sound effect audio files
      // TODO: Load music track audio files
      // TODO: Generate procedural sounds (laser, explosions)

      loadSounds();
    }

    /**
     * Load all sound effects and music
     */
    async function loadSounds() {
      console.log("[Audio] Loading sound effects and music...");

      // TODO: Fetch audio files from /assets/sounds/ directory
      // TODO: Decode audio data into buffers
      // TODO: Store in soundBuffers Map

      // For now, we'll generate procedural sounds
      generateProceduralSounds();
    }

    /**
     * Generate procedural sound effects using Web Audio
     */
    function generateProceduralSounds() {
      console.log("[Audio] Generating procedural sound effects...");

      // TODO: Generate laser fire sounds (W/X/Y/Z variants)
      // TODO: Generate explosion sounds
      // TODO: Generate UI beeps
      // TODO: Generate targeting lock tone

      // These will be created on-the-fly during gameplay
    }

    /**
     * Play laser fire sound
     * @param {string} basisVector - 'W', 'X', 'Y', or 'Z' (Quadray basis vector - affects pitch)
     */
    function playLaserFire(basisVector) {
      if (!audioContext) return;

      // Create oscillator for laser sound
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      // Pitch varies by Quadray basis vector
      const basePitch = 440; // A4
      const pitchMap = { W: 1.0, X: 1.125, Y: 1.25, Z: 1.5 }; // Harmonic intervals
      osc.frequency.value = basePitch * (pitchMap[basisVector] || 1.0);

      // Envelope (quick attack, short decay)
      gain.gain.setValueAtTime(0.3 * sfxVolume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.15
      );

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.15);

      console.log(`[Audio] Laser fire (${basisVector} Quadray basis vector)`);
    }

    /**
     * Play enemy laser fire sound (bass hum)
     */
    function playEnemyLaser() {
      if (!audioContext) return;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = "sawtooth";
      osc.frequency.value = 110; // Low A (bass hum)

      gain.gain.setValueAtTime(0.2 * sfxVolume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.3
      );

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.3);

      console.log("[Audio] Enemy laser fire");
    }

    /**
     * Play explosion sound
     * @param {string} type - 'enemy' or 'player'
     */
    function playExplosion(type) {
      if (!audioContext) return;

      // White noise burst for explosion
      const bufferSize = audioContext.sampleRate * 0.5; // 0.5 second
      const buffer = audioContext.createBuffer(
        1,
        bufferSize,
        audioContext.sampleRate
      );
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;

      const gain = audioContext.createGain();
      gain.gain.value = (type === "player" ? 0.4 : 0.3) * sfxVolume;

      source.connect(gain);
      gain.connect(masterGain);

      source.start(audioContext.currentTime);

      console.log(`[Audio] Explosion (${type})`);
    }

    /**
     * Play targeting lock warning tone
     */
    function playTargetingLock() {
      if (!audioContext) return;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.frequency.value = 1200; // High-pitched warning

      gain.gain.setValueAtTime(0.2 * sfxVolume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.2
      );

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.2);

      console.log("[Audio] Targeting lock warning");
    }

    /**
     * Play black hole collapse sound (descending pitch)
     */
    function playBlackHoleCollapse() {
      if (!audioContext) return;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.frequency.setValueAtTime(880, audioContext.currentTime); // Start high
      osc.frequency.exponentialRampToValueAtTime(
        55,
        audioContext.currentTime + 2.5
      ); // End low

      gain.gain.setValueAtTime(0.3 * sfxVolume, audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 2.5);

      console.log("[Audio] Black hole collapse");
    }

    /**
     * Play black hole expansion sound (ascending pitch)
     */
    function playBlackHoleExpansion() {
      if (!audioContext) return;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.frequency.setValueAtTime(55, audioContext.currentTime); // Start low
      osc.frequency.exponentialRampToValueAtTime(
        880,
        audioContext.currentTime + 2.5
      ); // End high

      gain.gain.setValueAtTime(0.3 * sfxVolume, audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 2.5);

      console.log("[Audio] Black hole expansion");
    }

    /**
     * Play music track
     * @param {string} trackName - Track identifier ('menu', 'gameplay', 'blackhole', 'infinite')
     */
    function playMusic(trackName) {
      if (!audioContext) return;

      // Stop current music
      stopMusic();

      // TODO: Load and play music track from musicTracks Map
      // TODO: Loop track
      // TODO: Fade in over 1 second

      currentTrack = trackName;
      console.log(`[Audio] Playing music track: ${trackName}`);
    }

    /**
     * Stop current music track
     */
    function stopMusic() {
      if (currentMusicSource) {
        // TODO: Fade out over 0.5 seconds
        // TODO: Stop source
        currentMusicSource = null;
        currentTrack = null;

        console.log("[Audio] Music stopped");
      }
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    function setMasterVolume(volume) {
      masterVolume = Math.max(0, Math.min(1, volume));
      if (masterGain) {
        masterGain.gain.value = masterVolume;
      }
      console.log(`[Audio] Master volume: ${masterVolume}`);
    }

    /**
     * Set SFX volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    function setSFXVolume(volume) {
      sfxVolume = Math.max(0, Math.min(1, volume));
      console.log(`[Audio] SFX volume: ${sfxVolume}`);
    }

    /**
     * Set music volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    function setMusicVolume(volume) {
      musicVolume = Math.max(0, Math.min(1, volume));
      // TODO: Update current music source gain
      console.log(`[Audio] Music volume: ${musicVolume}`);
    }

    // Public API
    return {
      init,
      playLaserFire,
      playEnemyLaser,
      playExplosion,
      playTargetingLock,
      playBlackHoleCollapse,
      playBlackHoleExpansion,
      playMusic,
      stopMusic,
      setMasterVolume,
      setSFXVolume,
      setMusicVolume,

      // Getters
      getMasterVolume: () => masterVolume,
      getSFXVolume: () => sfxVolume,
      getMusicVolume: () => musicVolume,
      getCurrentTrack: () => currentTrack,
    };
  })();

  console.log("[rt-asteroids-audio.js] Module loaded - RT.Audio available");
})();
