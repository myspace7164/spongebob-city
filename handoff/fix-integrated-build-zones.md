# Integrated build zones

Status: done

## Goal

Make buildable plots feel embedded in the Basel ground while retaining clear placement feedback and existing construction rules.

## Done

- Replaced raised asphalt pads and thick wireframe boxes with terrain-conforming ground markings and a thin hover outline.
- Matched plot tints to parking, verge, swale, and facade surfaces; normal plots use only faint site markings, and the surface tint appears on the selected build plot.
- Added valid/invalid previews using the selected structure's existing geometry, and hide plot markings after construction.
- Lowered pond visuals into a shallow bank and water surface.
- Cached terrain conformance until plot position, elevation, or terrain data changes.
- Added a browser test that renders and checks all four configured levels, previews, terrain conformance, and built-plot cleanup.

## Checks

- `npm run build`, `npm run lint`, and all 98 unit tests pass.
- Focused Playwright build-zone test passes across every configured level; visual capture reviewed.
- Construction, collision, and network logic were not changed.

## Next

- No follow-up needed. Changes are ready for the standard privacy check, commit, merge to `main`, and push.
