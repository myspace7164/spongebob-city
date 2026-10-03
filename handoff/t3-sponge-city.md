# T3 — Sponge city mission

State: done locally on `feat/t3-sponge-city`.

Goal: implement the supplied sponge-city concept as a playable Barfüsserplatz mission on the existing Three.js foundation.

Done: sixteen transformable plots; nine tools; limited sponge capacity; conserved surface/soil/storage water; tank irrigation; cyclic dry heat/storms; heat/flood HUD; budget; Poren-Power, bubble upgrade, Maximum Sponge and Patrick; procedural SpongeBob and companions; Dr. Beton's sabotage machine; healthy trees attract residents/birds; success/failure reports and reset. Updated design, README, shared contracts, decisions and sources.

Checks: final production build, formatting, 19 unit tests, two Chromium browser tests, doc-check and git diff --check passed. A legal strategy wins while empty streets alone do not. Browser verification covers real pointer lock, construction, absorb/spray, healthy trees, powers, field guide, movement, pause and reset. Downloaded Chromium failed WebGL on this host; already installed Nix-packaged Chromium succeeded with SOFTWARE_WEBGL=1. Screenshots are in /tmp/sponge-city-before.png and /tmp/sponge-city-after.png.

Next: play the local mission with npm run dev. Future work can add neighbourhoods, campaign progression or more boss encounters. Standing user authorization now permits automatic commits and merges into local main; publication remains separate.

Notes: repository began with uncommitted foundation files and modified hooks/docs. The user subsequently authorized committing all workspace changes and merging into local main. No push performed. Full privacy audit found a pre-existing commit with a personal author email; address it with the user's agreement before sharing, without bypassing the guard. Numbers are fictional; one mission and flat-ground bounds, no persistence/campaign/building collisions. Old sandbox modules and their tests remain available but are not mounted in the mission.

Resume: Read this file and docs/design.md, then extend the mission requested by the user.
