# ART Explorer - HiFi UI Component Workplan

## Overview
This workplan outlines the implementation of HiFi (1970s High Fidelity Stereo inspired) UI components for ART Explorer, matching the dark theme background (#2A2A2A) and existing control panel dimensions.

**Style Name:** HiFi - inspired by vintage 1970s High Fidelity stereo equipment aesthetics.

**Test File:** `button-test.html` - Contains all finalized component variants with working demos.

**Status:** ✅ IMPLEMENTATION COMPLETE - HiFi button styling applied to art.css

---

## Finalized Design Decisions

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Classic Blue | `#00B4FF` | Primary accent, LED dots, section titles, slider values |
| Ice Blue | `#7DF9FF` | Active/pressed state glow |
| Background | `#2A2A2A` | Base background (matches `#controls-panel`) |
| Dark | `#1a1a1a` | Inset track backgrounds |
| Light | `#353535` | Raised element highlights |

### Design System Variables
```css
:root {
  /* Base colors */
  --hifi-bg: #2A2A2A;
  --hifi-bg-dark: #1a1a1a;
  --hifi-bg-light: #353535;

  /* Shadow colors for HiFi effect */
  --hifi-shadow-dark: rgba(0, 0, 0, 0.5);
  --hifi-shadow-light: rgba(255, 255, 255, 0.07);

  /* Accent colors */
  --hifi-accent: #00B4FF;          /* Classic Blue - primary */
  --hifi-accent-glow: #7DF9FF;     /* Ice Blue - active glow */

  /* Text colors */
  --hifi-text: #e0e0e0;
  --hifi-text-muted: #b0b0b0;
  --hifi-text-dim: #888;

  /* Border radii */
  --hifi-radius-sm: 3px;
  --hifi-radius-md: 4px;

  /* Transitions */
  --hifi-transition: 0.15s ease-out;
}
```

---

## Component Specifications

### A) Sliders `.hifi-slider`

**Style:** Inset track with raised circular thumb containing blue LED dot center.

| Property | Value |
|----------|-------|
| Track height | 6px |
| Track background | `--hifi-bg-dark` with inset shadow |
| Thumb size | 16px diameter |
| Thumb style | Raised gradient with LED dot center |
| LED color | `#00B4FF` (Classic Blue) |

**Variant:** `.hifi-slider--led` - Blue LED dot in thumb center (USE FOR ALL SLIDERS)

**States:**
- Default: Classic Blue `#00B4FF` LED dot
- Hover: Brightened LED with increased inner glow
- Active/Pressed: Thumb becomes inset, LED brightens to `#7DF9FF`

---

### B) Push Buttons `.hifi-btn`

**Style:** Raised gradient surface, pressed state becomes inset.

| Property | Value |
|----------|-------|
| Padding | 8px 12px (standard), 5px 8px (small) |
| Font size | 11px (standard), 10px (small) |
| Border radius | 4px (standard), 3px (small) |
| Text color | `#b0b0b0` default, `#00B4FF` active |

**Variants:**
- `.hifi-btn--sm` - Small button for node sizes
- `.hifi-btn--action` - Action button (NOW) - Classic Blue text
- `.hifi-btn--danger` - Danger button (Delete) - Classic Blue text (same as action)

**States:**
- Default (Up): Raised with outer shadow
- Hover: Slightly brighter
- Active/Pressed (Down): Inset shadow, text becomes `#00B4FF`
- Action/Danger Active: Text becomes Ice Blue `#7DF9FF` with glow

---

### C) Toggles `.hifi-toggle`

**Style:** Horizontal pill switch with sliding circular thumb.

| Size | Width | Height | Thumb |
|------|-------|--------|-------|
| Standard | 36px | 18px | 14px |
| Small (`.hifi-toggle--sm`) | 28px | 14px | 10px |

**USE SMALL SIZE (`.hifi-toggle--sm`) for all form toggles** to match vertical dropdown toggle proportions.

**States:**
- Off: Thumb left, no glow
- On (`.active`): Thumb right, blue border glow on track, blue glow on thumb

---

### D) Dropdown Toggles `.hifi-dropdown-toggle`

**Style:** Vertical pill switch for section expand/collapse.

| Size | Width | Height | Thumb |
|------|-------|--------|-------|
| Standard | 14px | 28px | 10px |
| Small (`.hifi-dropdown-toggle--sm`) | 10px | 20px | 6px |

**States:**
- Collapsed (default): Thumb at TOP, no glow
- Expanded (`.expanded`): Thumb at BOTTOM, blue border glow on track, blue glow on thumb

---

## Implementation Strategy

### Phase 1: Add CSS to art.css
Copy the finalized CSS from `button-test.html` into `art.css`:
1. CSS custom properties (`:root` variables)
2. `.hifi-slider` and `.hifi-slider--led` styles
3. `.hifi-btn` and variants
4. `.hifi-toggle` and `.hifi-toggle--sm`
5. `.hifi-dropdown-toggle` and `.hifi-dropdown-toggle--sm`

### Phase 2: Update Sliders
Replace all `input[type="range"]` styling:

| Element | Current | New |
|---------|---------|-----|
| All sliders | Browser default | `.hifi-slider .hifi-slider--led` |

**Files:** `index.html`, `art.css`

### Phase 3: Update Push Buttons
Replace button styling:

| Element | Current Class | New Class |
|---------|---------------|-----------|
| Tool mode buttons | `.toggle-btn.variant-tool` | `.hifi-btn` |
| View buttons | `.toggle-btn.variant-standard` | `.hifi-btn` |
| Node size buttons | `.node-size-btn` | `.hifi-btn .hifi-btn--sm` |
| Action buttons | `.gumball-action-btn` | `.hifi-btn .hifi-btn--action` |

**Files:** `index.html`, `art.css`, `modules/rt-ui.js`

### Phase 4: Convert Checkboxes to Toggles
Replace checkbox inputs with toggle switches:

**HTML Pattern (Before):**
```html
<label class="checkbox-label">
  <input type="checkbox" id="showCube" checked>
  Hexahedron (Cube)
</label>
```

**HTML Pattern (After):**
```html
<label class="hifi-toggle-label" onclick="this.querySelector('.hifi-toggle').classList.toggle('active')">
  <div class="hifi-toggle hifi-toggle--sm active">
    <div class="hifi-toggle-thumb"></div>
  </div>
  Hexahedron (Cube)
</label>
```

**Checkbox → Toggle Candidates:**
- `#showCartesianBasis`, `#showQuadray`
- `#showPoint`, `#showLine`, `#showPolygon`, `#showPrism`, `#showCone`
- `#showCube`, `#showTetrahedron`, `#showDualTetrahedron`
- `#showOctahedron`, `#showIcosahedron`, `#showDodecahedron`
- `#showDualIcosahedron`, `#showCuboctahedron`, `#showRhombicDodecahedron`
- `#nodeFlatShading`, `#orthoPerspective`, `#backfaceCulling`
- `#enablePrintMode`, `#enableCutPlane`, `#invertCutPlane`

**JavaScript Update Required:** Update event handlers to check for `.active` class instead of checkbox `checked` property.

### Phase 5: Update Section Toggles
Replace CSS triangle arrows with vertical dropdown toggles:

| Element | Current Class | New Class |
|---------|---------------|-----------|
| Section toggles | `.section-toggle` | `.hifi-dropdown-toggle` |
| Geodesic toggles | `.geodesic-toggle` | `.hifi-dropdown-toggle .hifi-dropdown-toggle--sm` |

**JavaScript Update Required:** Toggle `.expanded` class on click, update section visibility logic.

---

## Size Reference

| Component | Width | Height | Notes |
|-----------|-------|--------|-------|
| Standard button | flex: 1 | 28-32px | Fills container |
| Small button | auto | 24px | Compact |
| Toggle (small) | 28px | 14px | Use for all forms |
| Dropdown toggle | 14px | 28px | Vertical orientation |
| Slider track | 100% | 6px | Flexible width |
| Slider thumb | 16px | 16px | Circular with LED |

---

## Files to Modify

1. **art.css** - Add HiFi styles (append to end)
2. **index.html** - Update class names, convert checkboxes to toggles
3. **modules/rt-ui.js** - Update event handlers for toggle/checkbox logic

---

## Test File

`button-test.html` contains:
- ✅ All finalized component styles
- ✅ Interactive demos (click to toggle states)
- ✅ Combined example showing real-world usage
- ✅ Side-by-side comparison with current styles

---

## Notes

- All blue accents use Classic Blue `#00B4FF` for consistency
- Ice Blue `#7DF9FF` reserved for active/pressed state glow effects
- Small toggle size (28x14px) matches vertical dropdown toggle proportions (14x28px)
- LED slider variant (`.hifi-slider--led`) should be used for ALL sliders
- No green/red colors for action/danger buttons - uses blue LED style throughout
