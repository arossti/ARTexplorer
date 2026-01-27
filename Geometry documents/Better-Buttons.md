# ART Explorer - Neumorphic UI Component Workplan

## Overview
This workplan outlines the implementation of neumorphic (soft UI) components for ART Explorer, matching the dark theme background (#2A2A2A) and existing control panel dimensions.

---

## Design System Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `--neu-bg` | `#2A2A2A` | Base background (matches `#controls-panel`) |
| `--neu-light` | `rgba(255, 255, 255, 0.07)` | Highlight for raised edges |
| `--neu-shadow` | `rgba(0, 0, 0, 0.5)` | Shadow for depth |
| `--neu-accent` | `#4a9eff` | Active/selected state (existing app blue) |
| `--neu-success` | `#00ff88` | Action buttons (existing green) |
| `--neu-radius-sm` | `3px` | Small components (toggles, small buttons) |
| `--neu-radius-md` | `4px` | Medium components (standard buttons) |

---

## Component Inventory

### A) Sliders (Range Inputs)
**Current state:** Basic browser-styled range inputs
**Target:** Neumorphic track with raised thumb

| Element | Current Class | New Class | Priority |
|---------|--------------|-----------|----------|
| Scale sliders | `.slider-container input[type="range"]` | `.neu-slider` | HIGH |
| Opacity sliders | `#opacitySlider`, `#nodeOpacitySlider` | `.neu-slider` | HIGH |
| Frequency sliders | `#geodesicTetraFrequency` etc. | `.neu-slider` | MEDIUM |
| Grid interval sliders | `#cartesianTessSlider`, `#quadrayTessSlider` | `.neu-slider` | MEDIUM |

### B) Push Buttons
**Current state:** Flat buttons with hover states
**Target:** Raised neumorphic with press animation

| Element | Current Class | New Class | Priority |
|---------|--------------|-----------|----------|
| Tool mode buttons | `.toggle-btn.variant-tool` | `.neu-btn` | HIGH |
| View buttons | `.toggle-btn.variant-standard` | `.neu-btn` | HIGH |
| Node size buttons | `.node-size-btn` | `.neu-btn.neu-btn--sm` | MEDIUM |
| Action buttons | `.gumball-action-btn` | `.neu-btn.neu-btn--action` | HIGH |
| File operation buttons | `#importBtn`, `#exportBtn`, `#saveBtn` | `.neu-btn` | MEDIUM |

### C) Toggles (On/Off Switches)
**Current state:** Checkboxes with labels, plane toggle switches
**Target:** Neumorphic pill switches with sliding thumb

| Element | Current Class | New Class | Priority |
|---------|--------------|-----------|----------|
| Plane toggles | `.plane-toggle-switch` | `.neu-toggle` | ALREADY EXISTS - enhance |
| Show/hide checkboxes | `input[type="checkbox"]` in `.checkbox-label` | `.neu-toggle` | HIGH |
| Geodesic options | `#showGeodesicTetrahedron` etc. | `.neu-toggle` | MEDIUM |
| Visual options | `#nodeFlatShading`, `#backfaceCulling` | `.neu-toggle` | MEDIUM |

**Checkbox → Toggle Candidates (index.html lines):**
- Line 389: `#showCartesianBasis`
- Line 395: `#showQuadray`
- Line 581: `#showPoint`
- Line 588: `#showLine`
- Line 635: `#showPolygon`
- Line 701: `#showPrism`
- Line 777: `#showCone`
- Line 853: `#showCube`
- Line 860: `#showTetrahedron`
- Line 928: `#showDualTetrahedron`
- Line 997: `#showOctahedron`
- Line 1066: `#showIcosahedron`
- Line 1134: `#showDodecahedron`
- Line 1140: `#showDualIcosahedron`
- Line 1208: `#showCuboctahedron`
- Line 1214: `#showRhombicDodecahedron`
- Line 1917: `#nodeFlatShading`
- Line 2027: `#orthoPerspective`
- Line 2064: `#backfaceCulling`
- Line 2068: `#enablePrintMode`
- Line 2074: `#enableCutPlane`
- Line 2080: `#invertCutPlane`

### D) Dropdown Arrows (Collapsible Sections)
**Current state:** CSS triangles (`.section-toggle`, `.geodesic-toggle`)
**Target:** Neumorphic circular button with animated chevron

| Element | Current Class | New Class | Priority |
|---------|--------------|-----------|----------|
| Section toggles | `.section-toggle` | `.neu-dropdown-arrow` | MEDIUM |
| Geodesic toggles | `.geodesic-toggle` | `.neu-dropdown-arrow.neu-dropdown-arrow--sm` | LOW |

---

## Implementation Phases

### Phase 1: CSS Variables & Base Styles
1. Add CSS custom properties to `:root` in art.css
2. Create base `.neu-*` classes
3. Test with isolated HTML file

### Phase 2: Sliders
1. Style track (inset shadow = "down" state)
2. Style thumb (raised = "up" state)
3. Add active/focus states
4. Test cross-browser compatibility

### Phase 3: Push Buttons
1. Create `.neu-btn` base class
2. Add size variants (`--sm`, `--lg`)
3. Add color variants (`--action`, `--danger`)
4. Implement press animation (up → down transition)

### Phase 4: Toggles
1. Enhance existing `.plane-toggle-switch` with neumorphic styling
2. Create JavaScript helper for checkbox → toggle conversion
3. Update event handlers to maintain functionality

### Phase 5: Dropdown Arrows
1. Replace CSS triangles with circular buttons
2. Add SVG chevron icon
3. Animate rotation on expand/collapse

---

## Size Specifications (Matching Existing UI)

Based on analysis of index.html and art.css:

| Component | Width | Height | Font Size |
|-----------|-------|--------|-----------|
| Standard button | flex: 1 (fills container) | 28-32px | 11px |
| Small button | 28px min | 24px | 10px |
| Toggle switch | 40px | 20px | - |
| Slider track | 100% | 4px | - |
| Slider thumb | 14px | 14px | - |
| Dropdown arrow | 16px | 16px | - |

---

## Files to Modify

1. **art.css** - Add new neumorphic styles (append to end)
2. **index.html** - Update class names on components
3. **modules/rt-ui.js** - Update any JavaScript references to changed classes

---

## Test File Structure

Create `button-test.html` with:
- All component variants in isolation
- Dark background matching app
- Side-by-side comparison with current styles

---

# Reference: Original Button Samples (SCSS)

# HTML COMPONENTS


<div class="tile up">Up</div>
<div class="tile down">Down</div>
<div class="tile padded up">
  <div class="tile down">Up &<br />Down</div>
</div>
<div class="tile button">
  <div class="tile"><span>Button</span></div>
</div>
<div class="tile tile--circle round">Up</div>
<div class="tile tile--circle round-down">Down</div>
<div class="tile tile--circle round-button"><span>Button</span></div>

# JS COMPONENTS
@import url("https://fonts.googleapis.com/css2?family=Alumni+Sans+Pinstripe&display=swap");

html {
  @media screen and (max-width: 600px) {
    font-size: 12px;
  }
}

:root {
  --height: 1;
}

$light: rgba(#fff, 0.5);
$shadow: rgba(#000, 0.5);

body {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  gap: 1rem;
  height: 100vh;
  background-color: #ddd;
  overflow: hidden;
  padding: 0 calc(50vw - 16rem);
  font-size: 1.5rem;
  color: #333;
  line-height: 0.9;
  font-family: "Alumni Sans Pinstripe", sans-serif;
  text-transform: uppercase;
  text-align: center;
}

.tile {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 6rem;
  height: 6rem;
  border-radius: 1rem;
  &:before,
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 1rem;
  }
  &--circle {
    border-radius: 50%;
    &:before {
      border-radius: 50%;
    }
  }
}

.padded {
  padding: 0.1rem;
}

.up {
  box-shadow: $shadow calc(0.33rem * var(--height))
    calc(0.33rem * var(--height)) 0.6rem;
  &:before {
    box-shadow: $light calc(-0.33rem * var(--height))
      calc(-0.33rem * var(--height)) 0.6rem;
  }
}

.down {
  box-shadow: inset $shadow calc(0.25rem * var(--height))
    calc(0.25rem * var(--height)) 0.6rem;
  &:before {
    box-shadow: inset $light calc(-0.25rem * var(--height))
      calc(-0.25rem * var(--height)) 0.6rem;
  }
}

.button {
  cursor: pointer;
  box-shadow: $shadow calc(0.33rem * var(--height))
    calc(0.33rem * var(--height)) 0.6rem;
  transition: box-shadow 0.15s 0.15s ease-in;
  &:before {
    box-shadow: $light calc(-0.33rem * var(--height))
      calc(-0.33rem * var(--height)) 0.6rem;
    transition: box-shadow 0.15s 0.15s ease-in;
  }
  span {
    transition: transform 0.3s ease-in-out;
  }
  & > div {
    box-shadow: inset $shadow 0 0 0;
    transition: box-shadow 0.15s ease-in;
    &:before {
      box-shadow: inset $light 0 0 0;
      transition: box-shadow 0.15s ease-in;
    }
  }
  &:hover {
    box-shadow: $shadow 0 0 0;
    transition: box-shadow 0.15s ease-out;
    &:before {
      box-shadow: $light 0 0 0;
      transition: box-shadow 0.15s ease-out;
    }
    & > div {
      box-shadow: inset rgba(#000, 50%) calc(0.25rem * var(--height))
        calc(0.25rem * var(--height)) 0.6rem;
      transition: box-shadow 0.15s 0.15s ease-out;
      &:before {
        box-shadow: inset $light calc(-0.25rem * var(--height))
          calc(-0.25rem * var(--height)) 0.6rem;
        transition: box-shadow 0.15s 0.15s ease-out;
      }
    }
    span {
      transform: translateY(0.1516rem);
    }
  }
}

.round {
  background: radial-gradient(circle at 40% 40%, $light, transparent, $shadow);
  box-shadow: $shadow 0.33rem 0.33rem 0.6rem;
}

.round-down {
  background: radial-gradient(circle at 75% 75%, $light, transparent, $shadow);
}

.round-button {
  cursor: pointer;
  background: radial-gradient(
    circle at 50% 50%,
    $light 15%,
    transparent 30%,
    $shadow
  );
  background-position: -4rem -4rem;
  background-size: 200% 200%;
  box-shadow: $shadow 0.33rem 0.33rem 0.6rem;
  transition: background 0.3s ease-in-out, box-shadow 0.15s 0.15s ease-in-out;
  span {
    transition: transform 0.3s ease-in-out;
  }
  &:hover {
    background-position: -2rem -2rem;
    box-shadow: $shadow 0 0 0;
    transition: background 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
    span {
      transform: translateY(0.1516rem);
    }
  }
}
