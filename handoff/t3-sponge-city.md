# T3 — Sponge city mission

State: done locally on `feat/t3-sponge-city`.

Goal: implement the supplied sponge-city concept as a playable Barfüsserplatz mission on the existing Three.js foundation.

Done: sixteen transformable plots; nine tools; limited sponge capacity; conserved surface/soil/storage water; tank irrigation; cyclic dry heat/storms; heat/flood HUD; budget; Poren-Power, bubble upgrade, Maximum Sponge and Patrick; procedural SpongeBob and companions; Dr. Beton's sabotage machine; healthy trees attract residents/birds; success/failure reports and reset. Updated design, README, shared contracts, decisions and sources.

Checks: final production build, formatting, 19 unit tests, two Chromium browser tests, doc-check and git diff --check passed. A legal strategy wins while empty streets alone do not. Browser verification covers real pointer lock, construction, absorb/spray, healthy trees, powers, field guide, movement, pause and reset. Downloaded Chromium failed WebGL on this host; already installed Nix-packaged Chromium succeeded with SOFTWARE_WEBGL=1. Screenshots are in /tmp/sponge-city-before.png and /tmp/sponge-city-after.png.

Next: play the mission with npm run dev. Future work can add neighbourhoods, campaign progression or more boss encounters. Standing user authorization now permits automatic commits, merges into main and pushes to the existing remote, subject to privacy checks.

Notes: foundation and mission were committed and merged into main. Numbers are fictional; the mission now supports the production campaign and collision systems. The unused T2 prototype inventory/sandbox code and tests were removed in a later cleanup.

Resume: Read this file and docs/design.md, then extend the mission requested by the user.
