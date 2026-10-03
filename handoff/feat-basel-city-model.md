# Basel model integration

State: done; Basel map integration is ready for team use. Publication on main is explicitly requested by the user.

## Done
- Converted the supplied OBJ into a 16.4 MiB tiled GLB using a standard-library Python script.
- Enabled the existing GLB loader; procedural architecture remains until loading succeeds.
- Preserved mission rules and flat-ground movement; documented map alignment and cleared buildings.
- Verified build, type checking, formatting, 19 unit tests and 4 browser tests. Browser tests passed sequentially with system Chromium and software WebGL (90-second timeout); parallel software rendering exceeded the default timeout.
- Inspected the loaded-map screenshot at /tmp/basel-map-loaded.png. Validated all GLB tile bounds and indices plus a converter fixture for polygon triangulation, negative indices, coordinate orientation and mission clearance.
- Confirmed public category A listing and CC BY 4.0 public-geodata terms; added attribution to the game, GLB and docs/SOURCES.md.

## Next
- Teammates update their copy from main and reload the running game to see the buildings.

## Open questions
- Exact geographic alignment and surveyed ground/collisions are outside this integration.

Resume: Review Basel map integration; read this handoff and public/models/README.md. The user has requested sharing it on main and the dataset licence is documented in docs/SOURCES.md.
