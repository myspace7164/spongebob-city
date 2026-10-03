# Basel road and imagery layers

State: done; merged into main and pushed (2026-10-03).

Done: converted official street centrelines to local metres using PROJ;
cropped to the building model, with estimated widths and a mission exclusion.
Downloaded a local SWISSIMAGE orthophoto and rendered it under two batched road
meshes. Existing movement, collisions and mission logic remain unchanged.

Verified: production build, 21 Node tests, three Python converter tests,
doc-check and staged privacy guard pass. Seven browser checks passed in the
full run; its audio check exposed an inherited pointer-events rule on the
Sound button. Fixed that rule, and the separate audio rerun passes. Top-down
preview confirms the buildings, streets and orthophoto align visually.

Next: review on screen with npm run dev.
The earlier GitHub history privacy CI issue remains open.

Limits: flat ground, approximate widths, no elevated bridges/tunnels, no exact
surveyed mission location, no imagery acquisition date in the WMS snapshot.
