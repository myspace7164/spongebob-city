# Level builder normal view and active-map alignment

State: ready for local refinement on `fix/level-builder-normal-view`. The user explicitly requested no push until they have refined the builder. Keep this branch local and do not merge it into main.

Done: the builder uses the active scenery transform and campaign location instead of the default map. It opens with the normal camera behind SpongeBob and a free cursor, with an Overview toggle. Mission markers hide independently of scenery, so fallback architecture remains visible. Level selection previews the selected scene and closing restores the original city, player, checkpoint, and camera. Builder-authored levels retain their chosen map site during Test play and subsequent campaigns. Browser drafts and version history remain available.

Verification: 133 unit tests, TypeScript and the production build pass. Six browser checks pass, covering real Basel assets, map alignment, normal camera, selection/deletion/undo, local drafts, Apply/Restore controls, temporary Test play, co-op refusal and existing build-zone rendering. Two extended browser checks also pass for exact and stepped rotation, mesh selection without movement, placement angle, draft reload and Test play angle conversion, and terrain conformance for rotated fields. Existing Vite extension and chunk-size warnings remain. Apply/Restore HTTP requests remain mocked; saved rotation persistence is covered by validation and serialization tests.

Try: the local dev server is available at `http://localhost:5175/?builder`. Click Level builder, then use right-drag to look and WASD to move the view; Normal view resets the camera behind SpongeBob. Select a coloured spot and drag it or use Delete. Test play does not save level files.

Done: added optional rotationY in radians to LevelSpot and CityPlot, defaulting to zero for existing levels. Editor drafts keep map-local angles and convert to play coordinates. Rotate left/right change angles by 15°; numeric input sets an exact angle. Place a new spot carries the selected angle into the next placement. Direct mesh picking selects visible geometry; a 5-pixel threshold prevents selection clicks from moving fields. Rotation, movement and deletion are undoable. Overlap checks use oriented squares, bounds include rotated corners, NPC clearance respects orientation, terrain sampling follows rotated vertices, and structures and their colliders rotate together.

Next: get feedback on the local builder and refine this branch. Push or merge only after the user explicitly asks to share it.

Resume prompt: Continue refining the local level builder on `fix/level-builder-normal-view`. Read this handoff and keep changes local until the user asks to push.
