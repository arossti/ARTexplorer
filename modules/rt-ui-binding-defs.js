/**
 * rt-ui-binding-defs.js
 * Declarative binding definitions for ARTexplorer UI
 *
 * Each binding replaces a manual addEventListener() call in rt-init.js.
 * This file defines WHAT to bind; rt-ui-bindings.js handles HOW to bind.
 *
 * Part of the Phase 1 modularization effort (Jan 30, 2026).
 *
 * @module RTUIBindingDefs
 */

// ============================================================================
// POLYHEDRA CHECKBOXES - Simple visibility toggles
// ============================================================================

export const simpleCheckboxBindings = [
  // Base polyhedra (just trigger updateGeometry)
  { id: "showPoint", type: "checkbox" },
  { id: "showCube", type: "checkbox" },
  // showDodecahedron moved to checkboxWithControlsBindings (has Face Tiling option)
  { id: "showCuboctahedron", type: "checkbox" },
  { id: "showRhombicDodecahedron", type: "checkbox" },

  // Geodesic variants
  { id: "showGeodesicIcosahedron", type: "checkbox" },
  { id: "showGeodesicTetrahedron", type: "checkbox" },
  { id: "showGeodesicOctahedron", type: "checkbox" },
  { id: "showGeodesicDualTetrahedron", type: "checkbox" },
  { id: "showGeodesicDualIcosahedron", type: "checkbox" },

  // Matrix rotation checkboxes
  { id: "cubeMatrixRotate45", type: "checkbox" },
  { id: "tetMatrixRotate45", type: "checkbox" },
  { id: "octaMatrixRotate45", type: "checkbox" },
  { id: "cuboctaMatrixRotate45", type: "checkbox" },
  { id: "rhombicDodecMatrixRotate45", type: "checkbox" },
  { id: "octaMatrixColinearEdges", type: "checkbox" },
  { id: "rhombicDodecMatrixFaceCoplanar", type: "checkbox" },

  // Radial matrix options
  { id: "radialCubeSpaceFill", type: "checkbox" },
  { id: "radialTetIVMMode", type: "checkbox" },
  { id: "radialOctIVMScale", type: "checkbox" },

  // Quadray demonstrator options
  { id: "quadrayTetraNormalize", type: "checkbox" },
  { id: "quadrayCuboctaNormalize", type: "checkbox" },

  // Primitive options
  { id: "polygonShowFace", type: "checkbox" },
  { id: "prismShowFaces", type: "checkbox" },
  { id: "coneShowFaces", type: "checkbox" },
  { id: "penroseShowFace", type: "checkbox" },

  // Helix options (chirality commented out for tetrahelix1 - left-handed only)
  // { id: "tetrahelix1LeftHanded", type: "checkbox" },

  // Tetrahelix 2 direction checkboxes (javelin model - both can be enabled)
  { id: "tetrahelix2DirPlus", type: "checkbox" },
  { id: "tetrahelix2DirMinus", type: "checkbox" },

  // Tetrahelix 3 strand checkboxes (A-H for octahedral faces)
  { id: "tetrahelix3StrandA", type: "checkbox" },
  { id: "tetrahelix3StrandB", type: "checkbox" },
  { id: "tetrahelix3StrandC", type: "checkbox" },
  { id: "tetrahelix3StrandD", type: "checkbox" },
  { id: "tetrahelix3StrandE", type: "checkbox" },
  { id: "tetrahelix3StrandF", type: "checkbox" },
  { id: "tetrahelix3StrandG", type: "checkbox" },
  { id: "tetrahelix3StrandH", type: "checkbox" },

  // Tetrahelix 3 chirality checkboxes (A-H: checked=RH, unchecked=LH)
  { id: "tetrahelix3ChiralA", type: "checkbox" },
  { id: "tetrahelix3ChiralB", type: "checkbox" },
  { id: "tetrahelix3ChiralC", type: "checkbox" },
  { id: "tetrahelix3ChiralD", type: "checkbox" },
  { id: "tetrahelix3ChiralE", type: "checkbox" },
  { id: "tetrahelix3ChiralF", type: "checkbox" },
  { id: "tetrahelix3ChiralG", type: "checkbox" },
  { id: "tetrahelix3ChiralH", type: "checkbox" },

  // Node shading
  { id: "nodeFlatShading", type: "checkbox" },
];

// ============================================================================
// CHECKBOXES WITH SUB-CONTROLS - Show/hide control panels
// ============================================================================

export const checkboxWithControlsBindings = [
  // Primitives with controls
  {
    id: "showLine",
    type: "checkbox-controls",
    controlsId: "line-controls",
  },
  {
    id: "showPolygon",
    type: "checkbox-controls",
    controlsId: "polygon-controls",
  },
  {
    id: "polygonEnableTiling",
    type: "checkbox-controls",
    controlsId: "polygon-tiling-controls",
  },
  {
    id: "geodesicIcosaFaceTiling",
    type: "checkbox-controls",
    controlsId: "geodesic-icosa-face-tiling-options",
  },
  {
    id: "showDodecahedron",
    type: "checkbox-controls",
    controlsId: "dodecahedron-options",
  },
  {
    id: "dodecahedronFaceTiling",
    type: "checkbox-controls",
    controlsId: "dodecahedron-face-tiling-options",
  },
  {
    id: "showPrism",
    type: "checkbox-controls",
    controlsId: "prism-controls",
  },
  {
    id: "showCone",
    type: "checkbox-controls",
    controlsId: "cone-controls",
  },
  {
    id: "showPenroseTiling",
    type: "checkbox-controls",
    controlsId: "penrose-tiling-controls",
  },
  {
    id: "penroseTilingEnabled",
    type: "checkbox-controls",
    controlsId: "penrose-deflation-controls",
  },
  {
    id: "showTetrahelix1",
    type: "checkbox-controls",
    controlsId: "tetrahelix1-controls",
  },
  {
    id: "showTetrahelix2",
    type: "checkbox-controls",
    controlsId: "tetrahelix2-controls",
  },
  {
    id: "showTetrahelix3",
    type: "checkbox-controls",
    controlsId: "tetrahelix3-controls",
  },

  // Polyhedra with geodesic controls (complex: sibling checkbox keeps controls visible)
  {
    id: "showTetrahedron",
    type: "checkbox-controls",
    controlsId: "geodesic-tetra-all",
    siblingCheckboxId: "showGeodesicTetrahedron",
  },
  {
    id: "showDualTetrahedron",
    type: "checkbox-controls",
    controlsId: "geodesic-dual-tetra-all",
    siblingCheckboxId: "showGeodesicDualTetrahedron",
  },
  {
    id: "showOctahedron",
    type: "checkbox-controls",
    controlsId: "geodesic-octa-all",
    siblingCheckboxId: "showGeodesicOctahedron",
  },
  {
    id: "showIcosahedron",
    type: "checkbox-controls",
    controlsId: "geodesic-icosa-all",
    siblingCheckboxId: "showGeodesicIcosahedron",
  },
  {
    id: "showDualIcosahedron",
    type: "checkbox-controls",
    controlsId: "geodesic-dual-icosa-all",
    siblingCheckboxId: "showGeodesicDualIcosahedron",
  },

  // Matrix forms with controls
  {
    id: "showCubeMatrix",
    type: "checkbox-controls",
    controlsId: "cube-matrix-controls",
  },
  {
    id: "showTetMatrix",
    type: "checkbox-controls",
    controlsId: "tet-matrix-controls",
  },
  {
    id: "showOctaMatrix",
    type: "checkbox-controls",
    controlsId: "octa-matrix-controls",
  },
  {
    id: "showCuboctahedronMatrix",
    type: "checkbox-controls",
    controlsId: "cubocta-matrix-controls",
  },
  {
    id: "showRhombicDodecMatrix",
    type: "checkbox-controls",
    controlsId: "rhombic-dodec-matrix-controls",
  },

  // Radial matrices with controls
  {
    id: "showRadialCubeMatrix",
    type: "checkbox-controls",
    controlsId: "radial-cube-matrix-controls",
  },
  {
    id: "showRadialRhombicDodecMatrix",
    type: "checkbox-controls",
    controlsId: "radial-rhombic-dodec-matrix-controls",
  },
  {
    id: "showRadialTetrahedronMatrix",
    type: "checkbox-controls",
    controlsId: "radial-tetrahedron-matrix-controls",
  },
  {
    id: "showRadialOctahedronMatrix",
    type: "checkbox-controls",
    controlsId: "radial-octahedron-matrix-controls",
  },
  {
    id: "showRadialCuboctahedronMatrix",
    type: "checkbox-controls",
    controlsId: "radial-cuboctahedron-matrix-controls",
  },

  // Quadray demonstrators with controls
  {
    id: "showQuadrayTetrahedron",
    type: "checkbox-controls",
    controlsId: "quadray-tetra-controls",
  },
  {
    id: "showQuadrayTetraDeformed",
    type: "checkbox-controls",
    controlsId: "quadray-tetra-deformed-controls",
  },
  {
    id: "showQuadrayCuboctahedron",
    type: "checkbox-controls",
    controlsId: "quadray-cuboctahedron-controls",
  },
  {
    id: "showQuadrayOctahedron",
    type: "checkbox-controls",
    controlsId: "quadray-octahedron-controls",
  },
  {
    id: "showQuadrayTruncatedTet",
    type: "checkbox-controls",
    controlsId: "quadray-trunc-tet-controls",
  },
  {
    id: "showQuadrayStellaOctangula",
    type: "checkbox-controls",
    controlsId: "quadray-stella-octangula-controls",
  },
  {
    id: "showQuadrayCompound",
    type: "checkbox-controls",
    controlsId: "quadray-compound-controls",
  },
  {
    id: "showQuadrayCompoundTet",
    type: "checkbox-controls",
    controlsId: "quadray-compound-tet-controls",
  },
];

// ============================================================================
// SIMPLE SLIDERS - Value display only
// ============================================================================

export const simpleSliderBindings = [
  {
    id: "opacitySlider",
    type: "slider",
    valueId: "opacityValue",
  },
  {
    id: "nodeOpacitySlider",
    type: "slider",
    valueId: "nodeOpacityValue",
    onInput: (value, renderingAPI) => {
      renderingAPI.setNodeOpacity(value);
    },
  },
  {
    id: "quadrayTessSlider",
    type: "slider",
    valueId: "quadrayTessValue",
    onInput: (value, renderingAPI) => {
      // Collect visibility state from NEW checkbox IDs (Phase 3)
      const visibilityState = {
        ivmWX: document.getElementById("planeIvmWX")?.checked ?? true,
        ivmWY: document.getElementById("planeIvmWY")?.checked ?? true,
        ivmWZ: document.getElementById("planeIvmWZ")?.checked ?? true,
        ivmXY: document.getElementById("planeIvmXY")?.checked ?? true,
        ivmXZ: document.getElementById("planeIvmXZ")?.checked ?? true,
        ivmYZ: document.getElementById("planeIvmYZ")?.checked ?? true,
      };
      renderingAPI.rebuildQuadrayGrids(parseInt(value), visibilityState);
    },
    updateGeometry: false, // Handled by rebuildQuadrayGrids
  },
  {
    id: "cartesianTessSlider",
    type: "slider",
    valueId: "cartesianTessValue",
    onInput: (value, renderingAPI) => {
      // Collect visibility state from NEW checkbox IDs (Phase 3)
      const visibilityState = {
        gridXY: document.getElementById("planeXY")?.checked ?? false,
        gridXZ: document.getElementById("planeXZ")?.checked ?? false,
        gridYZ: document.getElementById("planeYZ")?.checked ?? false,
        cartesianBasis:
          document.getElementById("showCartesianBasis")?.checked ?? false,
      };
      renderingAPI.rebuildCartesianGrids(parseInt(value), visibilityState);
    },
    updateGeometry: false, // Handled by rebuildCartesianGrids
  },

  // Geodesic frequency sliders
  {
    id: "geodesicIcosaFrequency",
    type: "slider",
    valueId: "geodesicIcosaFreqValue",
    formatValue: v => v,
  },
  {
    id: "geodesicTetraFrequency",
    type: "slider",
    valueId: "geodesicTetraFreqValue",
    formatValue: v => v,
  },
  {
    id: "geodesicOctaFrequency",
    type: "slider",
    valueId: "geodesicOctaFreqValue",
    formatValue: v => v,
  },
  {
    id: "geodesicDualTetraFrequency",
    type: "slider",
    valueId: "geodesicDualTetraFreqValue",
    formatValue: v => v,
  },
  {
    id: "geodesicDualIcosaFrequency",
    type: "slider",
    valueId: "geodesicDualIcosaFreqValue",
    formatValue: v => v,
  },

  // Matrix size sliders
  {
    id: "cubeMatrixSizeSlider",
    type: "slider",
    valueId: "cubeMatrixSizeValue",
    formatValue: v => `${v}×${v}`,
  },
  {
    id: "tetMatrixSizeSlider",
    type: "slider",
    valueId: "tetMatrixSizeValue",
    formatValue: v => `${v}×${v}`,
  },
  {
    id: "octaMatrixSizeSlider",
    type: "slider",
    valueId: "octaMatrixSizeValue",
    formatValue: v => `${v}×${v}`,
  },
  {
    id: "cuboctaMatrixSizeSlider",
    type: "slider",
    valueId: "cuboctaMatrixSizeValue",
    formatValue: v => `${v}×${v}`,
  },
  {
    id: "rhombicDodecMatrixSizeSlider",
    type: "slider",
    valueId: "rhombicDodecMatrixSizeValue",
    formatValue: v => `${v}×${v}`,
  },

  // Radial frequency sliders (with odd-frequency mapping)
  {
    id: "radialCubeFreqSlider",
    type: "slider",
    valueId: "radialCubeFreqDisplay",
    formatValue: v => `F${2 * v - 1}`,
  },
  {
    id: "radialRhombicDodecFreqSlider",
    type: "slider",
    valueId: "radialRhombicDodecFreqDisplay",
    formatValue: v => `F${2 * v - 1}`,
  },
  {
    id: "radialTetFreqSlider",
    type: "slider",
    valueId: "radialTetFreqDisplay",
    formatValue: v => `F${v}`,
  },
  {
    id: "radialOctFreqSlider",
    type: "slider",
    valueId: "radialOctFreqDisplay",
    formatValue: v => `F${v}`,
  },
  {
    id: "radialVEFreqSlider",
    type: "slider",
    valueId: "radialVEFreqDisplay",
    formatValue: v => `F${v}`,
  },

  // Quadray deformed stretch slider
  {
    id: "quadrayTetraZStretch",
    type: "slider",
    formatValue: v => parseFloat(v).toFixed(1),
  },

  // Primitive size inputs
  {
    id: "polygonSides",
    type: "slider",
    onInput: value => {
      const input = document.getElementById("polygonSidesInput");
      if (input) input.value = parseInt(value);
    },
  },
  {
    id: "polygonSidesInput",
    type: "slider", // Treated as slider for updateGeometry trigger
    onInput: value => {
      const slider = document.getElementById("polygonSides");
      if (slider) {
        const clamped = Math.max(3, Math.min(24, parseInt(value) || 3));
        slider.value = clamped;
      }
    },
  },
  {
    id: "prismSides",
    type: "slider",
    onInput: value => {
      const input = document.getElementById("prismSidesInput");
      if (input) input.value = parseInt(value);
    },
  },
  {
    id: "prismSidesInput",
    type: "slider", // Treated as slider for updateGeometry trigger
    onInput: value => {
      const slider = document.getElementById("prismSides");
      if (slider) {
        const clamped = Math.max(1, Math.min(24, parseInt(value) || 6));
        slider.value = clamped;
      }
    },
  },
  { id: "coneSides", type: "slider" },
  { id: "penroseQuadrance", type: "slider" },
  {
    id: "penroseGenerations",
    type: "slider",
    valueId: "penroseGenerationsValue",
  },

  // Helix controls
  {
    id: "tetrahelix1CountSlider",
    type: "slider",
    valueId: "tetrahelix1CountDisplay",
  },
  {
    id: "tetrahelix2CountSlider",
    type: "slider",
    valueId: "tetrahelix2CountDisplay",
  },
  {
    id: "tetrahelix3CountSlider",
    type: "slider",
    valueId: "tetrahelix3CountDisplay",
  },

  // Dodecahedron face tiling scale (for finding φ-ratio)
  // Slider and numeric input are synced together
  {
    id: "dodecTilingScale",
    type: "slider",
    onInput: value => {
      const input = document.getElementById("dodecTilingScaleInput");
      if (input) input.value = parseFloat(value).toFixed(3);
    },
  },
  {
    id: "dodecTilingScaleInput",
    type: "slider", // Treated as slider for updateGeometry trigger
    onInput: value => {
      const slider = document.getElementById("dodecTilingScale");
      if (slider) {
        const clamped = Math.max(0.5, Math.min(1.5, parseFloat(value) || 1.0));
        slider.value = clamped;
      }
    },
  },
];

// ============================================================================
// LINKED SLIDERS - Bidirectional conversion (Quadrance ↔ Length)
// ============================================================================

export const linkedSliderBindings = [
  // Line: Q ↔ L
  {
    type: "slider-linked",
    primaryId: "lineQuadrance",
    secondaryId: "lineLength",
    primaryToSecondary: Q => Math.sqrt(Q), // Q → L = √Q
    secondaryToPrimary: L => L * L, // L → Q = L²
  },
  // Polygon: Q_R ↔ R
  {
    type: "slider-linked",
    primaryId: "polygonQuadrance",
    secondaryId: "polygonRadius",
    primaryToSecondary: Q => Math.sqrt(Q),
    secondaryToPrimary: R => R * R,
  },
  // Prism base: Q_R ↔ R
  {
    type: "slider-linked",
    primaryId: "prismBaseQuadrance",
    secondaryId: "prismBaseRadius",
    primaryToSecondary: Q => Math.sqrt(Q),
    secondaryToPrimary: R => R * R,
  },
  // Prism height: Q_H ↔ H
  {
    type: "slider-linked",
    primaryId: "prismHeightQuadrance",
    secondaryId: "prismHeight",
    primaryToSecondary: Q => Math.sqrt(Q),
    secondaryToPrimary: H => H * H,
  },
  // Cone base: Q_R ↔ R
  {
    type: "slider-linked",
    primaryId: "coneBaseQuadrance",
    secondaryId: "coneBaseRadius",
    primaryToSecondary: Q => Math.sqrt(Q),
    secondaryToPrimary: R => R * R,
  },
  // Cone height: Q_H ↔ H
  {
    type: "slider-linked",
    primaryId: "coneHeightQuadrance",
    secondaryId: "coneHeight",
    primaryToSecondary: Q => Math.sqrt(Q),
    secondaryToPrimary: H => H * H,
  },
];

// ============================================================================
// LINEWEIGHT SLIDERS
// ============================================================================

export const lineweightSliderBindings = [
  {
    id: "lineWeight",
    type: "slider",
    valueId: "lineWeightValue",
  },
  {
    id: "polygonEdgeWeight",
    type: "slider",
    valueId: "polygonEdgeWeightValue",
  },
  {
    id: "polygonTilingGenerations",
    type: "slider",
    valueId: "polygonTilingGenerationsValue",
  },
  {
    id: "penroseEdgeWeight",
    type: "slider",
    valueId: "penroseEdgeWeightValue",
  },
];

// ============================================================================
// GEODESIC PROJECTION RADIO BUTTONS
// ============================================================================

export const geodesicProjectionBindings = [
  // Penrose tile type and seed selection
  { type: "radio-group", name: "penroseTileType" },
  { type: "radio-group", name: "penroseSeed" },
  // Each geodesic form has out/in/mid projection options
  { type: "radio-group", name: "geodesicTetraProjection" },
  { type: "radio-group", name: "geodesicDualTetraProjection" },
  { type: "radio-group", name: "geodesicOctaProjection" },
  { type: "radio-group", name: "geodesicIcosaProjection" },
  { type: "radio-group", name: "geodesicDualIcosaProjection" },
  // Helix axis/face selection - Quadray axis notation (QW, QX, QY, QZ)
  { type: "radio-group", name: "tetrahelix1Axis" },
  { type: "radio-group", name: "tetrahelix2Axis" },
  // tetrahelix2 direction checkboxes moved to simpleCheckboxBindings
  // (tetrahelix2DirPlus, tetrahelix2DirMinus) - javelin model allows both enabled
  // Helix strand count (tetrahelix2 only)
  { type: "radio-group", name: "tetrahelix2Strands" },
  // Helix bond mode (tetrahelix2 only)
  { type: "radio-group", name: "tetrahelix2BondMode" },
  // Helix per-strand exit face selection (tetrahelix2 only) - Quadray axis names
  { type: "radio-group", name: "tetrahelix2ExitQW" },
  { type: "radio-group", name: "tetrahelix2ExitQX" },
  { type: "radio-group", name: "tetrahelix2ExitQY" },
  { type: "radio-group", name: "tetrahelix2ExitQZ" },
];

// ============================================================================
// VIEW CONTROL BUTTONS
// ============================================================================

export const viewControlBindings = [
  // Camera type toggle (perspective/orthographic)
  {
    type: "button-group",
    groupId: "cameraType",
    buttons: [
      {
        id: "cameraPerspective",
        onClick: renderingAPI => renderingAPI.switchCameraType("perspective"),
      },
      {
        id: "cameraOrthographic",
        onClick: renderingAPI => renderingAPI.switchCameraType("orthographic"),
      },
    ],
  },
  // Camera presets (Cartesian views)
  {
    type: "button-group",
    groupId: "cameraPresets",
    buttons: [
      {
        id: "viewX",
        onClick: renderingAPI => renderingAPI.setCameraPreset("X"),
      },
      {
        id: "viewY",
        onClick: renderingAPI => renderingAPI.setCameraPreset("Y"),
      },
      {
        id: "viewZDown",
        onClick: renderingAPI => renderingAPI.setCameraPreset("Zdown"),
      },
      {
        id: "viewZUp",
        onClick: renderingAPI => renderingAPI.setCameraPreset("Zup"),
      },
      {
        id: "viewAxo",
        onClick: renderingAPI => renderingAPI.setCameraPreset("Axo"),
      },
      // QWXYZ Quadray views (QW=Yellow, QX=Red, QY=Blue, QZ=Green)
      {
        id: "viewQuadQW",
        onClick: renderingAPI => renderingAPI.setCameraPreset("quadqw"),
      },
      {
        id: "viewQuadQX",
        onClick: renderingAPI => renderingAPI.setCameraPreset("quadqx"),
      },
      {
        id: "viewQuadQY",
        onClick: renderingAPI => renderingAPI.setCameraPreset("quadqy"),
      },
      {
        id: "viewQuadQZ",
        onClick: renderingAPI => renderingAPI.setCameraPreset("quadqz"),
      },
      // Prime Projection Views (rational n-gon discovery)
      // Note: 7-gon removed from truncated tet - requires TruncTet+Tet compound (see viewHeptagonProjectionTet)
      {
        id: "viewPentagonProjection",
        onClick: renderingAPI =>
          renderingAPI.setCameraPreset("pentagonProjection"),
      },
      // BREAKTHROUGH: Compound polyhedra projections (Feb 2026)
      // These auto-enable the Quadray Compound form so rays cast from visible vertices
      {
        id: "viewHendecagonProjection",
        onClick: renderingAPI => {
          // Auto-enable compound form for 11-gon projection
          const compoundCheckbox = document.getElementById("showQuadrayCompound");
          if (compoundCheckbox && !compoundCheckbox.checked) {
            compoundCheckbox.checked = true;
            compoundCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
          }
          renderingAPI.setCameraPreset("hendecagonProjection");
        },
      },
      {
        id: "viewTridecagonProjection",
        onClick: renderingAPI => {
          // Auto-enable compound form for 13-gon projection
          const compoundCheckbox = document.getElementById("showQuadrayCompound");
          if (compoundCheckbox && !compoundCheckbox.checked) {
            compoundCheckbox.checked = true;
            compoundCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
          }
          renderingAPI.setCameraPreset("tridecagonProjection");
        },
      },
      // 7-gon from TruncTet+Tet compound (Feb 2026)
      {
        id: "viewHeptagonProjectionTet",
        onClick: renderingAPI => {
          // Auto-enable TruncTet+Tet compound form for 7-gon projection
          const compoundCheckbox = document.getElementById("showQuadrayCompoundTet");
          if (compoundCheckbox && !compoundCheckbox.checked) {
            compoundCheckbox.checked = true;
            compoundCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
          }
          renderingAPI.setCameraPreset("heptagonProjectionTet");
        },
      },
    ],
  },
];

// ============================================================================
// BASIS VISIBILITY CHECKBOXES
// ============================================================================

export const basisVisibilityBindings = [
  {
    id: "showCartesianBasis",
    type: "checkbox",
    onChange: (checked, renderingAPI) => {
      renderingAPI.setCartesianBasisVisible(checked);
    },
    updateGeometry: false,
  },
  {
    id: "showQuadray",
    type: "checkbox",
    onChange: (checked, renderingAPI) => {
      renderingAPI.setQuadrayBasisVisible(checked);
    },
    updateGeometry: false,
  },
];

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

/**
 * All binding definitions combined
 * Use this for full initialization:
 *   uiBindings.registerAll(allBindings);
 */
export const allBindings = [
  ...simpleCheckboxBindings,
  ...checkboxWithControlsBindings,
  ...simpleSliderBindings,
  ...linkedSliderBindings,
  ...lineweightSliderBindings,
  ...geodesicProjectionBindings,
  ...viewControlBindings,
  ...basisVisibilityBindings,
];

/**
 * Get binding count by type (for debugging)
 */
export function getBindingStats() {
  return {
    simpleCheckboxes: simpleCheckboxBindings.length,
    checkboxWithControls: checkboxWithControlsBindings.length,
    simpleSliders: simpleSliderBindings.length,
    linkedSliders: linkedSliderBindings.length,
    lineweightSliders: lineweightSliderBindings.length,
    geodesicProjections: geodesicProjectionBindings.length,
    viewControls: viewControlBindings.length,
    basisVisibility: basisVisibilityBindings.length,
    total: allBindings.length,
  };
}
