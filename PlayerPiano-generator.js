/**
 * PlayerPiano-generator.js — Feature Demo Reel Generator
 *
 * Run in the ARTExplorer browser console to generate a 23-view demo reel
 * that tours through primitives, platonic solids, geodesics, matrices,
 * and tetrahelixes with dissolving transitions and tumbling camera.
 *
 * Usage:
 *   1. Open ARTExplorer in browser
 *   2. Open DevTools console (F12)
 *   3. Paste this script and press Enter
 *   4. Browser downloads the .artview file
 *   5. Import it via View Manager → Import, then click ▶ Preview
 */

(async function generatePlayerPiano() {
  "use strict";

  const vm = window.RTViewManager;
  const api = window.renderingAPI;

  if (!vm || !api) {
    console.error("❌ RTViewManager or renderingAPI not found. Is ARTExplorer loaded?");
    return;
  }

  const camera = api.getCamera();
  const controls = api.getControls();

  if (!camera || !controls) {
    console.error("❌ Camera or controls not available.");
    return;
  }

  // ── All checkbox IDs (from rt-delta.js _captureCheckboxes) ─────────

  const ALL_CHECKBOXES = [
    "showPoint", "showLine", "showPolygon", "showPrism", "showCone",
    "showTetrahelix1", "showTetrahelix2",
    "showCube", "showTetrahedron", "showDualTetrahedron",
    "showOctahedron", "showIcosahedron", "showDodecahedron",
    "showDualIcosahedron", "showCuboctahedron", "showRhombicDodecahedron",
    "showGeodesicTetrahedron", "showGeodesicDualTetrahedron",
    "showGeodesicOctahedron", "showGeodesicIcosahedron",
    "showGeodesicDualIcosahedron",
    "showQuadrayTetrahedron", "showQuadrayTetraDeformed",
    "showQuadrayCuboctahedron", "showQuadrayOctahedron",
    "showQuadrayTruncatedTet",
    "showCubeMatrix", "showTetMatrix", "showOctaMatrix",
    "showCuboctahedronMatrix", "showRhombicDodecMatrix",
    "showRadialCubeMatrix", "showRadialRhombicDodecMatrix",
    "showRadialTetrahedronMatrix", "showRadialOctahedronMatrix",
    "showRadialCuboctahedronMatrix",
    "showCartesianBasis", "showQuadray",
    "showPenroseTiling",
  ];

  // ── Helpers ────────────────────────────────────────────────────────

  function clearAllForms() {
    for (const id of ALL_CHECKBOXES) {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    }
  }

  /** Turn ON only the listed checkbox IDs, turn OFF everything else */
  function setForms(ids) {
    clearAllForms();
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.checked = true;
    }
    api.updateGeometry();
  }

  /** Set a slider value and fire its input event */
  function setSlider(domId, value) {
    const el = document.getElementById(domId);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /** Set camera to an axis preset, then scale to desired distance */
  function setCamera(preset, distance) {
    api.setCameraPreset(preset);
    // setCameraPreset uses distance=10 internally; rescale to desired distance
    const dir = camera.position.clone().normalize();
    camera.position.copy(dir.multiplyScalar(distance));
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  /** Capture current scene as a named view with specified transition duration */
  async function capture(name, duration = 2000) {
    // Let the render loop settle so geometry is fully built
    await new Promise(r => setTimeout(r, 200));
    const view = vm.captureView({ name });
    view.transitionDuration = duration;
    vm.saveView(view);
    console.log(`  📷 ${name} captured (${vm.state.views.length}/${TOTAL_VIEWS})`);
  }

  const TOTAL_VIEWS = 23;
  const T = 2000; // Transition duration (ms) — adjust for faster/slower reel

  console.log("🎹 Player Piano Generator — starting...");

  // ── Clear existing views ───────────────────────────────────────────

  vm.state.views = [];
  vm.state.counters = { X: 0, Y: 0, Z: 0, QW: 0, QX: 0, QY: 0, QZ: 0, AXO: 0, P: 0 };

  // ── Set baseline sliders ───────────────────────────────────────────

  setSlider("scaleSlider", 1.4);
  setSlider("opacitySlider", 0.35);
  setSlider("nodeOpacitySlider", 0.6);

  // ══════════════════════════════════════════════════════════════════
  // ACT 1: PRIMITIVES
  // ══════════════════════════════════════════════════════════════════

  console.log("🎬 Act 1: Primitives");

  // PP-01: Triangle polygon — AXO close
  setForms(["showPolygon"]);
  setCamera("axo", 5);
  await capture("PP-01", T);

  // PP-02: Hexagonal prism — X view
  setForms(["showPrism"]);
  setCamera("x", 6);
  await capture("PP-02", T);

  // PP-03: Cone — top-down view
  setForms(["showCone"]);
  setCamera("zdown", 5);
  await capture("PP-03", T);

  // ══════════════════════════════════════════════════════════════════
  // ACT 2: PLATONIC SOLIDS
  // ══════════════════════════════════════════════════════════════════

  console.log("🎬 Act 2: Platonic Solids");

  // PP-04: Cube + Dual Tetrahedron — AXO medium
  setForms(["showCube", "showDualTetrahedron"]);
  setCamera("axo", 8);
  await capture("PP-04", T);

  // PP-05: + Octahedron — QW view
  setForms(["showCube", "showDualTetrahedron", "showOctahedron"]);
  setCamera("quadqw", 8);
  await capture("PP-05", T);

  // PP-06: + Icosahedron + Dodecahedron — Y view, zoom out
  setForms([
    "showCube", "showDualTetrahedron", "showOctahedron",
    "showIcosahedron", "showDodecahedron",
  ]);
  setCamera("y", 12);
  await capture("PP-06", T);

  // PP-07: All regular solids — QX view
  setForms([
    "showCube", "showDualTetrahedron", "showOctahedron",
    "showIcosahedron", "showDodecahedron",
    "showDualIcosahedron", "showCuboctahedron", "showRhombicDodecahedron",
  ]);
  setCamera("quadqx", 10);
  await capture("PP-07", T);

  // PP-08: Spotlight Cuboctahedron + Rhombic Dodecahedron — QZ close
  setForms(["showCuboctahedron", "showRhombicDodecahedron"]);
  setCamera("quadqz", 6);
  await capture("PP-08", T);

  // ══════════════════════════════════════════════════════════════════
  // ACT 3: GEODESIC SPHERES
  // ══════════════════════════════════════════════════════════════════

  console.log("🎬 Act 3: Geodesic Spheres");

  // PP-09: Geodesic Icosahedron F1 — AXO close
  setForms(["showGeodesicIcosahedron"]);
  setSlider("geodesicIcosaFrequency", 1);
  setCamera("axo", 4);
  await capture("PP-09", T);

  // PP-10: Geodesic Icosa ramp to F5 — X view
  setSlider("geodesicIcosaFrequency", 5);
  api.updateGeometry();
  setCamera("x", 6);
  await capture("PP-10", T);

  // PP-11: + Geodesic Octa F3 + Geodesic Tet F3 — QY view
  setForms([
    "showGeodesicIcosahedron", "showGeodesicOctahedron",
    "showGeodesicTetrahedron",
  ]);
  setSlider("geodesicIcosaFrequency", 5);
  setSlider("geodesicOctaFrequency", 3);
  setSlider("geodesicTetraFrequency", 3);
  api.updateGeometry();
  setCamera("quadqy", 8);
  await capture("PP-11", T);

  // PP-12: All 5 geodesics at F3 — top-down view
  setForms([
    "showGeodesicTetrahedron", "showGeodesicDualTetrahedron",
    "showGeodesicOctahedron", "showGeodesicIcosahedron",
    "showGeodesicDualIcosahedron",
  ]);
  setSlider("geodesicTetraFrequency", 3);
  setSlider("geodesicDualTetraFrequency", 3);
  setSlider("geodesicOctaFrequency", 3);
  setSlider("geodesicIcosaFrequency", 3);
  setSlider("geodesicDualIcosaFrequency", 3);
  api.updateGeometry();
  setCamera("zdown", 10);
  await capture("PP-12", T);

  // ══════════════════════════════════════════════════════════════════
  // ACT 4: PLANAR MATRICES (IVM)
  // ══════════════════════════════════════════════════════════════════

  console.log("🎬 Act 4: Planar Matrices");

  // PP-13: Cube Matrix size 4 — AXO wide
  setForms(["showCubeMatrix"]);
  setSlider("cubeMatrixSizeSlider", 4);
  api.updateGeometry();
  setCamera("axo", 18);
  await capture("PP-13", T);

  // PP-14: Tet Matrix size 3 — QW view
  setForms(["showTetMatrix"]);
  setSlider("tetMatrixSizeSlider", 3);
  api.updateGeometry();
  setCamera("quadqw", 15);
  await capture("PP-14", T);

  // PP-15: Octa Matrix size 3 — Y view
  setForms(["showOctaMatrix"]);
  setSlider("octaMatrixSizeSlider", 3);
  api.updateGeometry();
  setCamera("y", 15);
  await capture("PP-15", T);

  // PP-16: Cubocta + Rhombic Dodec matrices size 2 — top-down
  setForms(["showCuboctahedronMatrix", "showRhombicDodecMatrix"]);
  setSlider("cuboctaMatrixSizeSlider", 2);
  setSlider("rhombicDodecMatrixSizeSlider", 2);
  api.updateGeometry();
  setCamera("zdown", 15);
  await capture("PP-16", T);

  // ══════════════════════════════════════════════════════════════════
  // ACT 5: RADIAL MATRICES
  // ══════════════════════════════════════════════════════════════════

  console.log("🎬 Act 5: Radial Matrices");

  // PP-17: Radial Cube Matrix F3 — AXO
  setForms(["showRadialCubeMatrix"]);
  setSlider("radialCubeFreqSlider", 3);
  api.updateGeometry();
  setCamera("axo", 12);
  await capture("PP-17", T);

  // PP-18: Radial Tetrahedron Matrix F3 — QZ view
  setForms(["showRadialTetrahedronMatrix"]);
  setSlider("radialTetFreqSlider", 3);
  api.updateGeometry();
  setCamera("quadqz", 12);
  await capture("PP-18", T);

  // PP-19: Radial Octahedron Matrix F3 — X view
  setForms(["showRadialOctahedronMatrix"]);
  setSlider("radialOctFreqSlider", 3);
  api.updateGeometry();
  setCamera("x", 12);
  await capture("PP-19", T);

  // PP-20: Radial Cuboctahedron (VE) Matrix F3 — QX close
  setForms(["showRadialCuboctahedronMatrix"]);
  setSlider("radialVEFreqSlider", 3);
  api.updateGeometry();
  setCamera("quadqx", 8);
  await capture("PP-20", T);

  // ══════════════════════════════════════════════════════════════════
  // ACT 6: TETRAHELIXES
  // ══════════════════════════════════════════════════════════════════

  console.log("🎬 Act 6: Tetrahelixes");

  // PP-21: Tetrahelix 1 starting at 1 — AXO close
  setForms(["showTetrahelix1"]);
  setSlider("tetrahelix1CountSlider", 1);
  api.updateGeometry();
  setCamera("axo", 6);
  await capture("PP-21", T);

  // PP-22: Tetrahelix 1 full torus (48) — QW wide
  setSlider("tetrahelix1CountSlider", 48);
  api.updateGeometry();
  setCamera("quadqw", 20);
  await capture("PP-22", T);

  // PP-23: Tetrahelix 1 + Tetrahelix 2 — Y view finale
  setForms(["showTetrahelix1", "showTetrahelix2"]);
  setSlider("tetrahelix1CountSlider", 48);
  setSlider("tetrahelix2CountSlider", 24);
  api.updateGeometry();
  setCamera("y", 15);
  await capture("PP-23", T);

  // ══════════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════════

  console.log(`\n🎹 Player Piano complete: ${vm.state.views.length} views generated`);
  console.log("📥 Exporting .artview file...");

  vm.exportAllViews();

  console.log("✅ Done! Import the file and click ▶ Preview (Camera + Scene) to play.");
})();
