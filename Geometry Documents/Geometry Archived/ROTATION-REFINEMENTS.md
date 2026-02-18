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

**Location:** `modules/rt-init.js` lines ~3291-3340 (in mousedown handler)

**Critical Discovery:** The original implementation in `rt-controls.js` was never active - the actual gumball code lives in `rt-init.js`. Additionally, using a cached `camera` reference failed when switching between perspective and orthographic modes.

### Key Fixes Applied (2025-01-27)

1. **Correct file location**: Filter implemented in `rt-init.js`, not `rt-controls.js`
2. **Dynamic camera reference**: Use `renderingAPI.getCamera()` instead of cached `camera` variable
3. **Inverted dot product logic**: Filter when dot < 0.15 (edge-on), not > 0.85

### Understanding the Geometry

A rotation ring's **axis** is the vector perpendicular to the ring plane:

- When axis is **parallel** to camera direction (dot ≈ 1.0) → ring appears as **full circle** (KEEP)
- When axis is **perpendicular** to camera direction (dot ≈ 0.0) → ring appears **edge-on** (FILTER)

### Correct Implementation

```javascript
// IMPORTANT: Get CURRENT camera from renderingAPI (may have switched to orthographic)
const currentCamera = renderingAPI.getCamera();
const cameraDirection = new THREE.Vector3();
currentCamera.getWorldDirection(cameraDirection);

// For rotation handles, filter out rings that are edge-on to the camera
if (obj.userData.isRotationHandle && obj.userData.basisAxis) {
  const dotProduct = Math.abs(cameraDirection.dot(obj.userData.basisAxis));

  // If dot product < 0.15, the ring is nearly edge-on (axis perpendicular to view)
  // Skip these as they're unreliable to click in orthographic views
  if (dotProduct < 0.15) {
    return; // Skip this edge-on rotation ring
  }
}
```

**Why 0.15 threshold:**

- `dot = 0.0` = perfectly edge-on (ring appears as a line) - FILTER
- `dot = 1.0` = perfectly face-on (ring appears as a full circle) - KEEP
- `0.15` corresponds to ~81° from face-on, filtering rings that are nearly invisible

## Testing Checklist

### XYZ Cartesian Views (with XYZ coordinate system enabled)

| View   | Expected Selectable Axes | Edge-On (Filtered) | Status |
| ------ | ------------------------ | ------------------ | ------ |
| X      | Y, Z (green, blue)       | X (red)            | [✓]    |
| Y      | X, Z (red, blue)         | Y (green)          | [✓]    |
| Z-Down | X, Y (red, green)        | Z (blue)           | [✓]    |
| Z-Up   | X, Y (red, green)        | Z (blue)           | [✓]    |

### WXYZ Tetrahedral Views (with WXYZ coordinate system enabled)

| View | Expected Selectable Axes | Edge-On (Filtered) | Status |
| ---- | ------------------------ | ------------------ | ------ |
| W    | X, Y, Z (quadray)        | W                  | [✓]    |
| X    | W, Y, Z (quadray)        | X                  | [✓]    |
| Y    | W, X, Z (quadray)        | Y                  | [✓]    |
| Z    | W, X, Y (quadray)        | Z                  | [✓]    |

## Debug Logging

The implementation includes debug logging (can be removed for production):

```
🎯 Camera direction: (0.000, -1.000, 0.000)
  🔄 X-axis (cartesian): dot=0.000 ❌ FILTERED (edge-on)
  🔄 Y-axis (cartesian): dot=1.000 ✓ kept
  🔄 Z-axis (cartesian): dot=0.000 ❌ FILTERED (edge-on)
  📊 Filtered: [X, Z], Available targets: 1
```

## Potential Refinements

### If 0.15 threshold needs adjustment:

- Increase to 0.2 for more aggressive filtering
- Decrease to 0.1 for less aggressive filtering
- Could make threshold camera-type dependent (stricter for orthographic only)

### Alternative approaches not implemented:

- **Option A:** Increase hit zone thickness dynamically for orthographic
- **Option B:** Use raycaster layers to test each axis separately
- **Option D:** Offset tori slightly along their axes (may cause visual issues)

## Notes

- The implementation affects both XYZ and WXYZ rotation handles automatically
- Move and Scale handles (tetrahedra/cubes) are unaffected by this filter
- The filter runs on every mousedown event, using current camera state
- WXYZ quadray axes work correctly because they store `basisAxis` the same way as Cartesian
