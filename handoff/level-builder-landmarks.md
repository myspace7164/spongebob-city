# Level builder: editable world objects

State: done on `feat/level-builder-landmarks`.

Done: the newer world objects that sat at fixed positions in every area (leaderboard sign, riverside buddy, first power-up pickup, street-name sign) can now be moved per level. `LevelSite.landmarks` stores them in play coordinates, and the leaderboard can also be turned. `landmarkPose` in `src/game/campaign.ts` is the single source used by the city view, colliders, the buddy and the pickup. Defaults live in `config/city.ts` `landmarkDefaults`, and levels without placements are unchanged. The builder's Objects tool (O key) shows unmoved objects faded at their default place. You can select an object by clicking its marker or the list, then drag, rotate (leaderboard), reset or undo. Drafts, Apply and Test play carry the placements. Choosing a new area resets the objects.

Verified: 148 unit tests (4 new in `tests/level-landmarks.test.ts`), TypeScript and production build pass. 5 of the 6 builder browser tests pass, including the new objects test, run with `CHROMIUM_EXECUTABLE=/usr/bin/chromium`. The real-map test times out taking a screenshot on this machine; it times out the same way on unchanged main, so it's environmental. Screenshots confirmed the markers and the moved leaderboard in Test play.

Next: nothing required. Optional: let the street sign face a direction (it is a camera-facing sprite today).
