# Rotation Handle Refinements for Orthographic Views

## Problem Summary

When using orthographic camera views (e.g., Y-axis view in Quadray mode), rotation handles that appear edge-on compete with the face-on handles for raycaster hits. This makes it difficult or impossible to select the correct rotation axis.

**Key observation:** This issue never occurs in perspective mode - only in orthographic views.

## Root Cause Analysis

### Why Perspective Works but Orthographic Fails

1. **Perspective mode**: Rays converge from a point (the camera), hitting torus surfaces at different angles. Even when tori overlap spatially, the ray enters each at clearly different distances, making intersection ordering reliable.

2. **Orthographic mode**: Rays are **parallel**. When a rotation ring is viewed edge-on (e.g., the Y-axis green ring from a Y-axis view), the ray travels nearly tangent to the torus surface. The torus hit zone is only 0.15 units thick, meaning:
   - The ray may barely graze the torus or miss entirely
   - When it does hit, the intersection point is unreliable
   - Perpendicular rings have their torus tubes overlapping at the same world-space positions

3. **All three tori share the same origin** and their tube geometries physically overlap in 3D space. With parallel rays, there's no clear "first" intersection when multiple surfaces are nearly equidistant.

## Implemented Solution: Option C - Edge-On Filter

**Location:** `modules/rt-controls.js` lines 591-605

**Logic:** Before raycasting, calculate the dot product between the camera's view direction and each rotation ring's axis (normal). If a ring is nearly edge-on (dot product > 0.85, meaning within ~32° of parallel to the view direction), exclude it from hit testing.

```javascript
// Get camera view direction for filtering edge-on rotation rings
const cameraDirection = new this.THREE.Vector3();
this.camera.getWorldDirection(cameraDirection);

// For rotation handles, filter out rings that are edge-on to the camera
if (obj.userData.isRotationHandle && obj.userData.axis) {
  const dotProduct = Math.abs(cameraDirection.dot(obj.userData.axis));
  // If dot product > 0.85, the ring is nearly edge-on
  if (dotProduct > 0.85) {
    return; // Skip this edge-on rotation ring
  }
}
```

**Why 0.85 threshold:**
- `dot = 1.0` = perfectly edge-on (ring appears as a line)
- `dot = 0.0` = perfectly face-on (ring appears as a full circle)
- `0.85` corresponds to ~32° from edge-on, giving a comfortable buffer

## Testing Checklist

### XYZ Cartesian Views (with XYZ coordinate system enabled)

| View | Expected Selectable Axes | Edge-On (Filtered) | Status |
|------|--------------------------|-------------------|--------|
| X | Y, Z (green, blue) | X (red) | [ ] |
| Y | X, Z (red, blue) | Y (green) | [ ] |
| Z-Down | X, Y (red, green) | Z (blue) | [ ] |
| Z-Up | X, Y (red, green) | Z (blue) | [ ] |

### WXYZ Tetrahedral Views (with WXYZ coordinate system enabled)

| View | Expected Selectable Axes | Edge-On (Filtered) | Status |
|------|--------------------------|-------------------|--------|
| W | X, Y, Z (quadray) | W | [ ] |
| X | W, Y, Z (quadray) | X | [ ] |
| Y | W, X, Z (quadray) | Y | [ ] |
| Z | W, X, Y (quadray) | Z | [ ] |

## Potential Refinements

### If 0.85 threshold is too aggressive:
- Lower to 0.9 (filters only rings within ~26° of edge-on)
- Or make it camera-type dependent (stricter for orthographic)

### If some edge cases still fail:
- Consider testing each axis independently rather than all together
- Add a secondary check based on which axis the cursor is nearest to visually

### Alternative approaches not implemented:
- **Option A:** Increase hit zone thickness dynamically for orthographic
- **Option B:** Use raycaster layers to test each axis separately
- **Option D:** Offset tori slightly along their axes (may cause visual issues)

## Notes

- The current implementation affects both XYZ and WXYZ rotation handles
- Move and Scale handles (arrows/cubes) are unaffected by this filter
- The filter runs on every mousedown event, so camera direction is always current
