# Basel model integration

State: done on feat/basel-city-model; local integration, not merged or published.

## Done
- Converted the supplied OBJ into a 16.4 MiB tiled GLB using a standard-library Python script.
- Enabled the existing GLB loader; procedural architecture remains until loading succeeds.
- Preserved mission rules and flat-ground movement; documented map alignment and cleared buildings.
- Verified build, type checking, formatting, 19 unit tests and 4 browser tests. Browser tests passed sequentially with system Chromium and software WebGL (90-second timeout); parallel software rendering exceeded the default timeout.
- Inspected the loaded-map screenshot at /tmp/basel-map-loaded.png. Validated all GLB tile bounds and indices plus a converter fixture for polygon triangulation, negative indices, coordinate orientation and mission clearance.

## Next
- Reload the running game and review the imported scenery. No merging requested for this task.

## Open questions
- Confirm the dataset's redistribution licence before publishing the derived GLB.
- Exact geographic alignment and surveyed ground/collisions are outside this integration.

Resume: Review Basel map integration on feat/basel-city-model; read this handoff and public/models/README.md. Integration is complete; confirm licence before sharing the asset.
