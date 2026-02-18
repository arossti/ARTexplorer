# Quadray Axis Rename Workplan

**Status**: ✅ COMPLETED (Jan 31, 2026)

## Goal
Rename Quadray axis references for consistency: `QW`, `QX`, `QY`, `QZ` (Quadray 1-4)

## Mapping

| Current | New | Notes |
|---------|-----|-------|
| `coordW` | `coordQW` | Position field |
| `coordX2` | `coordQX` | Position field (was "2" suffix) |
| `coordY2` | `coordQY` | Position field |
| `coordZ2` | `coordQZ` | Position field |
| `rotWDegrees` | `rotQWDegrees` | Rotation degrees |
| `rotWSpread` | `rotQWSpread` | Rotation spread |
| `rotXQDegrees` | `rotQXDegrees` | Rotation degrees |
| `rotXQSpread` | `rotQXSpread` | Rotation spread |
| `rotYQDegrees` | `rotQYDegrees` | Rotation degrees |
| `rotYQSpread` | `rotQYSpread` | Rotation spread |
| `rotZQDegrees` | `rotQZDegrees` | Rotation degrees |
| `rotZQSpread` | `rotQZSpread` | Rotation spread |

CSS classes (`axis-qw`, `label-axis-qw`, etc.) already use consistent naming - no change needed.

## Files to Modify

| File | Occurrences | Type |
|------|-------------|------|
| `index.html` | ~36 | HTML IDs, classes |
| `modules/rt-init.js` | ~52 | JS getElementById, field refs |
| `modules/rt-coordinates.js` | ~20 | JS getElementById, field refs |
| `modules/rt-controls.js` | ~4 | JS getElementById |
| `art.css` | ~3 | CSS selectors (rotation fields) |
| `Geometry documents/Coordinates.md` | ~3 | Documentation |

## Execution Order

1. `index.html` - Change HTML IDs first (source of truth)
2. `modules/rt-init.js` - Update all JS references
3. `modules/rt-coordinates.js` - Update module references
4. `modules/rt-controls.js` - Update any references
5. `art.css` - Update CSS selectors if needed
6. `Geometry documents/Coordinates.md` - Update documentation
7. **TEST** - Verify coordinate display still works

## Risk Assessment

**Low risk** - This is a pure rename with no logic changes. If something breaks, it will be immediately visible (coordinate fields won't update).

## Rollback

If issues occur, `git checkout -- .` to revert all changes.
