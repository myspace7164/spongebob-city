# Level builder normal view and active-map alignment

State: ready for local refinement on `fix/level-builder-normal-view`. The user explicitly requested no push until they have refined the builder. Keep this branch local and do not merge it into main.

Done: the builder uses the active scenery transform and campaign location instead of the default map. It opens with the normal camera behind SpongeBob and a free cursor, with an Overview toggle. Mission markers hide independently of scenery, so fallback architecture remains visible. Level selection previews the selected scene and closing restores the original city, player, checkpoint, and camera. Builder-authored levels retain their chosen map site during Test play and subsequent campaigns. Browser drafts and version history remain available.

Verification: 130 unit tests and the production build pass. Browser checks cover real Basel assets, normal view, map/marker alignment, deletion and undo, previewing another level and returning to the original game, existing build-zone rendering, local drafts, Apply/Restore controls, temporary Test play, and co-op refusal. Local screenshots are at `/tmp/level-builder-normal-view.png` and `/tmp/builder-overview-after.png`. Existing Vite extension and chunk-size warnings remain.

Try: the local dev server is available at `http://localhost:5175/?builder`. Click Level builder, then use right-drag to look and WASD to move the view; Normal view resets the camera behind SpongeBob. Select a coloured spot and drag it or use Delete. Test play does not save level files.

Next: get feedback on the local builder and refine this branch. Push or merge only after the user explicitly asks to share it.

Resume prompt: Continue refining the local level builder on `fix/level-builder-normal-view`. Read this handoff and keep changes local until the user asks to push.
