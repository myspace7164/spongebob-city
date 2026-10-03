# Basel road and imagery layers

State: done on feat/basel-roads; verified locally, not merged or pushed.

Done: converted official street centrelines to local metres using PROJ;
cropped to the building model, with estimated widths and a mission exclusion.
Downloaded a local SWISSIMAGE orthophoto and rendered it under two batched road
meshes. Existing movement, collisions and mission logic remain unchanged.

Verified: production build, 21 Node tests, three Python converter tests,
doc-check and staged privacy guard pass. Seven browser checks passed in the
full run; its audio check exposed an inherited pointer-events rule on the
Sound button. Fixed that rule, and the separate audio rerun passes. Top-down
preview confirms the buildings, streets and orthophoto align visually.

Next: user can review using npm run dev. Sharing or merging is a separate step;
merging into main requires the user's explicit approval. The previous GitHub
history privacy CI issue remains outside this map change.

Limits: flat ground, approximate widths, no elevated bridges/tunnels, no exact
surveyed mission location, no imagery acquisition date in the WMS snapshot.
