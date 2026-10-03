# Level builder normal view and active-map alignment

State: done. Builder integration is verified for main. The user authorized merging and pushing the two builder commits to the team's `origin/main`.

Done: the builder uses the active scenery transform and campaign location instead of the default map. It opens with the normal camera behind SpongeBob and a free cursor, with an Overview toggle. Mission markers hide independently of scenery, so fallback architecture remains visible. Level selection previews the selected scene and closing restores the original city, player, checkpoint, and camera. Builder-authored levels retain their chosen map site during Test play and subsequent campaigns. Browser drafts and version history remain available.

Verification: 133 unit tests, TypeScript and the production build pass. Six browser checks pass, covering real Basel assets, map alignment, normal camera, selection/deletion/undo, local drafts, Apply/Restore controls, temporary Test play, co-op refusal and existing build-zone rendering. Two extended browser checks also pass for exact and stepped rotation, mesh selection without movement, placement angle, draft reload and Test play angle conversion, and terrain conformance for rotated fields. Existing Vite extension and chunk-size warnings remain. Apply/Restore HTTP requests remain mocked; saved rotation persistence is covered by validation and serialization tests.

Try: run `npm run dev` and open `/?builder`. Click Level builder, then use right-drag to look and WASD to move the view; Normal view resets the camera behind SpongeBob. Select a coloured spot and drag it or use Delete. Test play does not save level files.

Done: added optional rotationY in radians to LevelSpot and CityPlot, defaulting to zero for existing levels. Editor drafts keep map-local angles and convert to play coordinates. Rotate left/right change angles by 15°; numeric input sets an exact angle. Place a new spot carries the selected angle into the next placement. Direct mesh picking selects visible geometry; a 5-pixel threshold prevents selection clicks from moving fields. Rotation, movement and deletion are undoable. Overlap checks use oriented squares, bounds include rotated corners, NPC clearance respects orientation, terrain sampling follows rotated vertices, and structures and their colliders rotate together.

Integration: fetched team main at `6c7ab73`. Resolved the city-view conflict by retaining the team's leaderboard sign under the scenery root and keeping fire and mission objects under the builder's visibility group. The combined production build, all 144 unit tests, all six builder and build-zone browser tests, formatter, staged privacy check, and documentation checks pass. Review found no blocking issues. Browser fallback tests intentionally return 404 for model assets; the real-map test loads the assets successfully. Existing Vite extension and chunk-size warnings remain.

Delivery: builder commits `98a9e27` and `d7f3b66` are retained in history. The integration is to be merged into main and pushed to origin in this session; verify delivery with `git ls-remote origin refs/heads/main` against local main. Delete merged, unused branches and preserve unmerged experiments.

Next: no implementation work remains. Apply/Restore browser requests use mocks; persistence validation and serialization have unit coverage.

Resume prompt: Read this handoff and inspect main and origin/main to confirm builder integration. Continue with the next requested task; the builder no longer has a local-only restriction.
