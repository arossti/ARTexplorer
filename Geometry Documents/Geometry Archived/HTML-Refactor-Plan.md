# ARTexplorer.html Refactoring Plan

**Date:** 2025-12-30
**Current File Size:** 4,129 lines
**Target Reduction:** ~130 lines (3% reduction to ~4,000 lines)
**Estimated Time:** 80 minutes total

---

## Overview

The ARTexplorer.html file has grown from ~3,000 to 4,129 lines (+38%) due to rotation mode implementation and ongoing feature development. This plan focuses on **safe, high-value cleanup** without risking the working codebase.

**Philosophy:** Focus on code quality (removing inline styles, consolidating CSS) rather than aggressive modularization that risks breaking proven functionality.

---

## Current State Analysis

### File Breakdown

- **Total Lines:** 4,129
- **HTML Markup:** ~1,180 lines (29%)
- **JavaScript Code:** ~2,949 lines (71%)
- **Embedded `<style>` Block:** 71 lines (password protection styles)
- **Inline `style=` Attributes:** 41 instances
- **Total Functions:** 36

### Why File Can't Be Much Smaller

Per [Module-Extraction-Analysis.md](Module-Extraction-Analysis.md:583), the following MUST stay inline:

1. **Gumball System (~600 lines)** - Failed module extraction twice due to scope isolation
2. **Selection System (~150 lines)** - Recommended to stay inline per architectural analysis
3. **Rotation Mode (~200 lines)** - Recently added, working perfectly
4. **Core THREE.js Init (~1,500 lines)** - Scene setup, camera, renderer, animation loop
5. **UI Event Handlers (~1,000 lines)** - Form selection, coordinate updates, etc.

**Conclusion:** A 4,000-line single-page 3D application is acceptable and maintainable.

---

## Phase 1: Move Inline Styles to CSS ⭐ HIGHEST PRIORITY

**Impact:** Remove 41 inline `style=` attributes
**Effort:** 45 minutes
**Risk:** Very Low
**Files Modified:** `art.css`, `ARTexplorer.html`

### 1.1 Identify All Inline Styles

**Current inline styles found:**

| Style Pattern               | Count | Location                  |
| --------------------------- | ----- | ------------------------- |
| `style="font-size: 10px"`   | 3     | Info text paragraphs      |
| `style="font-size: 11px"`   | 3     | Frequency labels          |
| `style="margin-left: 20px"` | 6     | Indented containers       |
| `style="margin-top: 5px"`   | 5     | Small spacing             |
| `style="margin-top: 8px"`   | 4     | Medium spacing            |
| `style="width: 50px"`       | 3     | Narrow inputs             |
| Button group styles         | 18    | Coordinate system buttons |

**Total:** 41 inline styles

### 1.2 Add Utility Classes to art.css

Add these classes to `src/geometry/art.css`:

```css
/* ========================================================================
   TEXT SIZE UTILITIES
   ======================================================================== */

.text-small {
  font-size: 10px;
}

.text-xsmall {
  font-size: 11px;
}

/* ========================================================================
   SPACING UTILITIES
   ======================================================================== */

.indent {
  margin-left: 20px;
}

.spacing-top-xs {
  margin-top: 5px;
}

.spacing-top-sm {
  margin-top: 8px;
}

/* ========================================================================
   INPUT UTILITIES
   ======================================================================== */

.input-narrow {
  width: 50px;
  margin-left: 5px;
}

/* ========================================================================
   BUTTON GROUP ITEMS
   ======================================================================== */

.btn-group-item {
  flex: 1;
  padding: 8px;
  background: var(--btn-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  cursor: pointer;
  transition: background 0.2s;
}

.btn-group-item:hover {
  background: var(--btn-hover-bg);
}

.btn-group-item.active {
  background: var(--btn-active-bg);
  border-color: var(--btn-active-border);
}

.btn-group-item:first-child {
  border-radius: 5px 0 0 5px;
}

.btn-group-item:last-child {
  border-radius: 0 5px 5px 0;
}

.btn-group-item:not(:last-child) {
  border-right: none;
}
```

### 1.3 Replace Inline Styles in HTML

**Search and replace patterns:**

1. **Small text (10px):**

   ```html
   <!-- Before -->
   <p class="info-text" style="font-size: 10px">
     <!-- After -->
   </p>

   <p class="info-text text-small"></p>
   ```

2. **Extra small text (11px):**

   ```html
   <!-- Before -->
   <label style="font-size: 11px">Freq:</label>

   <!-- After -->
   <label class="text-xsmall">Freq:</label>
   ```

3. **Indented containers:**

   ```html
   <!-- Before -->
   <div style="margin-left: 20px">
     <!-- After -->
     <div class="indent"></div>
   </div>
   ```

4. **Top spacing:**

   ```html
   <!-- Before -->
   <div style="margin-top: 5px">
     <div style="margin-top: 8px">
       <!-- After -->
       <div class="spacing-top-xs">
         <div class="spacing-top-sm"></div>
       </div>
     </div>
   </div>
   ```

5. **Narrow inputs:**

   ```html
   <!-- Before -->
   <input style="width: 50px; margin-left: 5px" />

   <!-- After -->
   <input class="input-narrow" />
   ```

6. **Button group items:**

   ```html
   <!-- Before -->
   <button style="flex: 1; padding: 8px; background: #2a2a2a; ...">
     <!-- After -->
     <button class="btn-group-item"></button>
   </button>
   ```

**Verification:** Search for `style="` in HTML - should find 0 results after cleanup.

---

## Phase 2: Move Password Protection Styles to CSS ⭐ HIGH PRIORITY

**Impact:** Remove 71-line embedded `<style>` block
**Effort:** 15 minutes
**Risk:** Very Low
**Files Modified:** `art.css`, `ARTexplorer.html`

### 2.1 Move Styles from HTML to CSS

**Cut from ARTexplorer.html (lines 13-83):**

```html
<style>
  /* Password protection overlay */
  #password-overlay { ... }
  #password-modal { ... }
  /* ... etc ... */
</style>
```

**Paste into art.css:**

```css
/* ========================================================================
   PASSWORD PROTECTION
   ======================================================================== */

#password-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

#password-modal {
  background: #2a2a2a;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  text-align: center;
  max-width: 400px;
}

#password-modal h2 {
  color: #ffffff;
  margin-bottom: 20px;
  font-size: 24px;
}

#password-modal p {
  color: #b0b0b0;
  margin-bottom: 30px;
  font-size: 14px;
}

#password-input {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  border: 2px solid #444;
  border-radius: 5px;
  background: #1a1a1a;
  color: #ffffff;
  margin-bottom: 20px;
  box-sizing: border-box;
}

#password-input:focus {
  outline: none;
  border-color: #4a9eff;
}

#password-submit {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background: #4a9eff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s;
}

#password-submit:hover {
  background: #3a8eef;
}

#password-error {
  color: #ff4444;
  margin-top: 10px;
  font-size: 14px;
  display: none;
}

.hidden {
  display: none !important;
}
```

### 2.2 Remove `<style>` Block from HTML

Delete lines 13-83 from ARTexplorer.html, keeping only:

```html
<link rel="stylesheet" href="art.css" />
```

**Verification:** No `<style>` tags should remain in HTML (except potential inline THREE.js-generated styles).

---

## Phase 3: Extract RT Math Functions to Module ⭐ HIGH PRIORITY

**Impact:** Remove ~20 lines of duplicate code
**Effort:** 20 minutes
**Risk:** Very Low (pure functions, already have rt-math.js)
**Files Modified:** `modules/rt-math.js`, `ARTexplorer.html`

### 3.1 Check Existing rt-math.js

**Note:** User confirmed `rt-math.js` already exists. Verify it contains:

```javascript
export const RTMath = {
  spreadToDegrees(spread) { ... },
  degreesToSpread(degrees) { ... }
};
```

If not, add these functions to the module.

### 3.2 Import RTMath in ARTexplorer.html

Add to imports section (around line 1180):

```javascript
import { RTMath } from "./modules/rt-math.js";
```

### 3.3 Remove Duplicate Functions from HTML

**Delete from ARTexplorer.html (lines ~2921-2943):**

```javascript
function spreadToDegrees(spread) {
  if (spread < 0 || spread > 1) {
    console.warn(
      `⚠️ Invalid spread value: ${spread}. Must be between 0 and 1.`
    );
    return 0;
  }
  const radians = Math.asin(Math.sqrt(spread));
  return (radians * 180) / Math.PI;
}

function degreesToSpread(degrees) {
  const radians = (degrees * Math.PI) / 180;
  const spread = Math.sin(radians) * Math.sin(radians);
  return spread;
}
```

### 3.4 Update All Function Calls

**Find and replace in ARTexplorer.html:**

- `spreadToDegrees(` → `RTMath.spreadToDegrees(`
- `degreesToSpread(` → `RTMath.degreesToSpread(`

**Expected locations:**

- Rotation input setup functions (~line 2960)
- Rotation calculation in mouse move handler (~line 3800)
- Any bidirectional conversion event listeners

**Verification:** Search for `spreadToDegrees\(` and `degreesToSpread\(` - should find 0 results (only `RTMath.spreadToDegrees` and `RTMath.degreesToSpread`).

---

## Phase 4: Stop Here ⏸️ RECOMMENDED

### Why Stop After Phase 3?

**Remaining code is:**

1. **Too tightly coupled to extract safely** (gumball, selection)
2. **Already attempted and failed** (module extraction failed twice)
3. **Small enough to not warrant module overhead** (camera functions)
4. **Core application logic** (initialization, render loop, UI handlers)

### What NOT to Do

❌ **Do NOT extract gumball system to module**

- Attempted twice, failed both times
- See [Module-Extraction-Analysis.md](Module-Extraction-Analysis.md:583) for details
- Requires architectural refactoring (8-12 hours) for minimal gain

❌ **Do NOT extract selection system to module**

- Recommended to stay inline per architectural analysis
- See [Module-Extraction-Analysis.md](Module-Extraction-Analysis.md:708) for rationale
- Only extract if building other tools that need selection

❌ **Do NOT extract visualization grids**

- High coupling to scene, THREE, Quadray globals
- Low reusability - only used in this application
- 370 lines saved but 400 lines added to new module = minimal net benefit

❌ **Do NOT extract camera functions**

- Only ~170 lines total
- Tightly coupled to UI buttons and global camera/controls
- Small gain vs high coupling risk

---

## Expected Results

### Before Refactoring

- **Total Lines:** 4,129
- **Inline Styles:** 41 instances
- **Embedded `<style>` Block:** 71 lines
- **Duplicate Math Functions:** ~20 lines

### After Refactoring (Phases 1-3)

- **Total Lines:** ~4,000
- **Inline Styles:** 0 instances ✅
- **Embedded `<style>` Block:** 0 lines ✅
- **Duplicate Math Functions:** 0 lines ✅
- **New CSS Utilities:** ~80 lines added to art.css (reusable)

**Net Reduction:** ~130 lines from HTML (3% smaller)
**Code Quality:** Significantly improved (no inline styles, reusable utilities)
**Maintainability:** Better (centralized styling, modular math)

---

## Verification Checklist

After completing all phases, verify:

### Phase 1 Verification

- [ ] Search HTML for `style="` returns 0 results
- [ ] All utility classes exist in art.css
- [ ] Page renders identically (visual regression test)
- [ ] All buttons, inputs, spacing look correct

### Phase 2 Verification

- [ ] No `<style>` tags in HTML (except potential THREE.js inline styles)
- [ ] Password protection still works
- [ ] Password modal styles correct (colors, spacing, animations)

### Phase 3 Verification

- [ ] No duplicate `spreadToDegrees` or `degreesToSpread` functions in HTML
- [ ] All calls use `RTMath.*` prefix
- [ ] Rotation mode still works correctly
- [ ] Spread ↔ degrees conversion works bidirectionally
- [ ] Console shows no errors about missing functions

### Overall Verification

- [ ] Page loads without errors
- [ ] All UI interactions work (buttons, inputs, gumball)
- [ ] Move, Scale, Rotate modes all functional
- [ ] No visual regressions
- [ ] File size reduced by ~130 lines
- [ ] No inline styles remain
- [ ] Code is cleaner and more maintainable

---

## Rollback Plan

If any phase causes issues:

1. **Git Revert:** Each phase should be a separate commit

   ```bash
   git log --oneline -5
   git revert <commit-hash>
   ```

2. **Manual Rollback:**
   - Phase 1: Restore inline styles from git history
   - Phase 2: Copy `<style>` block back from git history
   - Phase 3: Copy functions back, remove `RTMath.*` prefix

---

## Future Refactoring Considerations

**Only consider these IF:**

- You have 8+ hours for careful refactoring
- You implement global state pattern first (`window.ARTState`)
- You write integration tests to catch regressions
- You need to build other tools that share code

### Future Phase A: Extract Grid Visualization (~2-3 hours)

Create `modules/rt-visualization.js` with:

- `createCartesianGrid(scene, THREE, options)`
- `createQuadrayBasis(scene, THREE, Quadray, options)`
- `createIVMGrid(scene, THREE, Quadray, options)`
- `createIVMPlanes(scene, THREE, Quadray, options)`

**Savings:** ~370 lines from HTML → ~400 lines in module (net -30)

### Future Phase B: Extract Selection System (~4-6 hours)

**Prerequisites:**

1. Create `window.ARTState` global state object
2. Migrate `currentSelection` → `ARTState.selection.current`
3. Test everything still works

Then create `modules/rt-selection.js` with selection/highlight logic.

**Savings:** ~150 lines from HTML → ~180 lines in module (net -30)

### Future Phase C: Extract Gumball System (~8-12 hours)

**Prerequisites:**

1. Complete Phase B (Selection System)
2. Implement event bus pattern
3. Create comprehensive test suite
4. Allocate full refactoring time

**Only do this if selection system extraction succeeds.**

---

## Summary

### Recommended Action (Phases 1-3)

| Phase     | Task                        | Time       | Lines Saved | Risk         |
| --------- | --------------------------- | ---------- | ----------- | ------------ |
| 1         | Move inline styles to CSS   | 45 min     | ~41         | Very Low     |
| 2         | Move `<style>` block to CSS | 15 min     | ~71         | Very Low     |
| 3         | Use RTMath module           | 20 min     | ~20         | Very Low     |
| **Total** | **All recommended phases**  | **80 min** | **~130**    | **Very Low** |

### Result

- Cleaner, more maintainable codebase
- No inline styles (better separation of concerns)
- Reusable CSS utilities
- Modular math functions
- ~3% smaller HTML file
- Zero functional changes (no regression risk)

**This is the sweet spot:** High value, low risk, reasonable effort.

---

**Status:** Ready for execution
**Last Updated:** 2025-12-30
**Next Review:** After Phase 3 completion
