# Coordinate Systems UI Update Workplan

**Goal:** Replace old iOS-style toggle switches with HiFi checkbox controls in Coordinate Systems section.

**Status:** Reverted after breaking grid tessellation sliders. This document captures lessons learned and a safer approach.

---

## Problem Analysis

The old toggle system uses a tightly coupled pattern:

```
HTML: <div class="plane-toggle-switch" data-plane="XY">
JS:   classList.toggle("active") / classList.contains("active")
```

This pattern is queried in **3 locations**:
1. `rt-init.js` - Click handlers for individual plane visibility
2. `rt-init.js` - Group visibility checks (anyCartesianActive, anyIVMActive)
3. `rt-ui-binding-defs.js` - Tessellation slider rebuilds read visibility state

The attempted checkbox conversion broke #3 because the slider bindings couldn't find checkbox state.

---

## Files to Modify

| File | Changes Required |
|------|-----------------|
| `index.html` | Replace `plane-toggle-switch` divs with checkbox inputs |
| `rt-init.js` | Update handlers: `change` event, `.checked` property |
| `rt-ui-binding-defs.js` | Update tessellation slider visibility queries |
| `art.css` | (Optional) Remove unused `.plane-toggle-*` styles |

---

## Step-by-Step Plan

### Phase 1: Add New Elements (Non-Breaking)

1. **Add checkbox inputs** alongside existing toggles (don't remove old ones yet)
2. **Assign unique IDs** to new checkboxes:
   - Cartesian: `planeXY`, `planeXZ`, `planeYZ`
   - IVM Grids: `planeQuadrayWX`, `planeQuadrayWY`, `planeQuadrayWZ`, `planeQuadrayXY`, `planeQuadrayXZ`, `planeQuadrayYZ`
   - Central Angle: `planeIvmWX`, `planeIvmWY`, `planeIvmWZ`, `planeIvmXY`, `planeIvmXZ`, `planeIvmYZ`
3. **Test**: Both UI elements visible, old toggles still functional

### Phase 2: Update JavaScript Handlers

1. **rt-init.js**: Add NEW handlers for checkbox `change` events
   ```javascript
   document.querySelectorAll('input[id^="plane"]').forEach(cb => {
     cb.addEventListener("change", function() {
       // Same logic, but use this.checked instead of classList.contains("active")
     });
   });
   ```
2. **Keep old handlers** temporarily for backward compatibility
3. **Test**: Both toggle types work independently

### Phase 3: Update Tessellation Sliders (Critical)

1. **rt-ui-binding-defs.js**: Update `quadrayTessSlider` binding
   ```javascript
   // OLD (broken):
   document.querySelectorAll('[data-plane^="ivm"]').forEach(toggle => {
     visibilityState[toggle.dataset.plane] = toggle.classList.contains("active");
   });

   // NEW (use explicit IDs):
   const visibilityState = {
     ivmWX: document.getElementById("planeIvmWX")?.checked ?? true,
     ivmWY: document.getElementById("planeIvmWY")?.checked ?? true,
     // ... etc
   };
   ```
2. **Same for `cartesianTessSlider`**
3. **Test thoroughly**: Move slider, verify grids rebuild with correct visibility

### Phase 4: Remove Old Elements

1. **Hide old toggles** with CSS `display: none` (reversible)
2. **Test all functionality**
3. **Remove old toggle HTML** from index.html
4. **Remove old handlers** from rt-init.js
5. **Clean up CSS** (optional, low priority)

---

## Testing Checklist

- [ ] Individual plane toggles show/hide grids
- [ ] Cartesian tessellation slider rebuilds grids correctly
- [ ] Central Angle tessellation slider rebuilds grids correctly
- [ ] Group visibility (cartesianGrid, ivmPlanes) updates correctly
- [ ] State persists on page reload (if applicable)
- [ ] No console errors

---

## Key Lessons

1. **Don't swap HTML and JS simultaneously** - causes invisible breakage
2. **Tessellation sliders depend on toggle state** - easy to miss
3. **Use explicit element IDs** instead of attribute selectors for reliability
4. **Test slider interactions**, not just toggle clicks

---

*Created: February 2, 2026*
*Branch: Tetrahelix*
