# Plan

From `docs/design.md`. Status and verification evidence live in task handoffs. Existing task numbers are preserved; T4–T6 describe integrations already in main. T7–T8 are proposed demo preparation. Start tasks after their dependencies are merged.

## M1 Foundation: the game starts and desktop controls work

### Chunk A · in order

#### T1 Playable webgame foundation

Owner: @myspace7164
Needs: nothing
Files: src/main.ts, src/interfaces.ts, src/game/player.ts, src/game/world.ts, src/game/assets.ts, config/game.ts, package.json, README.md, tests/player.test.ts
Done when: README commands start a rendered scene with walking, jumping, camera, pause and reset.
Notes: handoff/t1-game-base.md records initial checks; later mission/map checks cover the integrated browser scene.

#### T2 Controls and placeholder inventory

Owner: @myspace7164
Needs: T1
Files: src/game/input.ts, src/game/inventory.ts, src/game/sandbox.ts, src/ui/inventory.ts, config/items.ts, src/interfaces.ts, tests/input.test.ts, tests/inventory.test.ts, tests/sandbox.test.ts
Done when: movement and camera work together, and the sandbox supports slot selection, shooting, reload and block placement.
Notes: handoff/t2-inventory-controls.md; sandbox modules remain reusable but are not mounted in the city mission.

## M2 Core mission: transform the square and manage water

### Chunk B · in order

#### T3 Sponge city mission

Owner: @myspace7164
Needs: T2
Files: src/interfaces.ts, config/city.ts, src/game/city.ts, src/game/city-water.ts, src/game/city-view.ts, src/game/characters.ts, src/ui/city.ts, src/main.ts, tests/city.test.ts, tests/browser/game.spec.ts, docs/design.md, docs/decisions.md, docs/SOURCES.md, README.md
Done when: players unseal plots, grow trees, absorb and reuse storm water, use companion powers, and reach a measured win or loss with restart.
Notes: handoff/t3-sponge-city.md; simulation coefficients are fictional.

## M3 Presentation: buildings, cartoon interface and sound

### Chunk C · in order

These integrations share scene, UI and documentation files, so they are ordered.

#### T4 Basel model and fallback

Owner: @myspace7164
Needs: T3
Files: scripts/convert-basel-map.py, public/models/, src/game/assets.ts, src/game/city-view.ts, config/game.ts, tests/browser/map.spec.ts, docs/SOURCES.md, README.md
Done when: buildings load around the square, attribution is visible, and procedural scenery works when model loading fails.
Notes: handoff/feat-basel-city-model.md; surveyed alignment and building collision are outside scope.

#### T5 Cartoon / Frutiger Aero interface

Owner: @myspace7164
Needs: T4
Files: src/ui/theme.css, src/ui/style.css, src/ui/city.ts, index.html, tests/browser/game.spec.ts, docs/style-guide.md, docs/design/style-sample.html, docs/design.md, README.md
Done when: welcome, HUD, tools and guide remain usable at documented desktop viewport sizes, including reduced motion.
Notes: handoff/feat-cartoon-aero-ui.md.

#### T6 Contextual audio

Owner: @myspace7164
Needs: T5
Files: public/audio/, config/audio.ts, src/game/audio.ts, src/interfaces.ts, src/main.ts, index.html, tests/browser/audio.spec.ts, docs/decisions.md, docs/SOURCES.md, docs/design.md, README.md
Done when: actions and rain trigger corresponding clips, loops stop with their actions, pause/hidden tabs/outcomes silence playback, and Sound/M toggles mute.
Notes: handoff/feat-contextual-audio.md records verification still to finish; presence on main alone does not establish passing checks.

## M4 Demo readiness: explain the mission and retain an offline fallback

### Chunk D · parallel

#### T7 Demo story, sources and limits

Owner: @myspace7164 (proposed)
Needs: T6
Files: docs/demo.md
Done when: a rehearsed three-minute walkthrough explains water reuse, shows a transformation, and states simulation and source limits.

#### T8 Offline fallback demo

Owner: @myspace7164 (proposed)
Needs: T6
Files: docs/demo-fallback.md; recording and screenshots kept locally
Done when: the presenter can play a saved recording offline and show construction, water reuse and mission results.

## M5 Campaign: four story levels advance after all achievements

### Chunk E · in order

#### T9 Story campaign with replaceable placeholder levels

Owner: @myspace7164
Needs: T3, T4, T5, T6
Files: config/levels.ts, src/interfaces.ts, src/game/campaign.ts, src/game/city.ts, src/game/city-water.ts, src/game/city-view.ts, src/main.ts, src/ui/city.ts, src/ui/campaign.ts, src/ui/style.css, index.html, tests/campaign.test.ts, tests/browser/campaign.spec.ts, tests/browser/game.spec.ts, README.md, docs/design.md, docs/decisions.md, docs/SOURCES.md
Done when: the arrival leads through Riehenring, Erlenmatt, St. Johann and VoltaNord; all current-level achievements trigger automatic progression, only the final completion shows the ending, and failure retries the current level. Configurable placeholder layouts retain prior improvements.
Notes: preserve supplied German storytelling; geography remains pending. Simple conserved runoff/overflow connections and marked entrances use existing tools. See handoff/t9-level-campaign.md.

Revise this plan before implementing changed scope. Keep progress and checks in the corresponding handoff. Further neighbourhoods and boss encounters need a new design decision and plan task.

## M6 Level polish: quick talking briefings and fresh neighbourhoods

### Chunk F · in order

#### T10 Short animated briefings and independent placeholder levels

Owner: @myspace7164
Needs: T9
Files: config/levels.ts, config/briefing.ts, src/interfaces.ts, src/ui/campaign.ts, src/ui/story-speech.ts, src/ui/style.css, src/ui/theme.css, src/game/campaign.ts, src/game/city.ts, src/game/city-view.ts, src/game/map-layers.ts, src/main.ts, index.html, tests/campaign.test.ts, tests/browser/campaign.spec.ts, tests/browser/game.spec.ts, README.md, docs/design.md, docs/style-guide.md, docs/decisions.md, docs/SOURCES.md
Done when: short German briefings reveal text beside a bobbing SpongeBob with bounded wah-wah audio; starting early/muting stops sound, each next level has fresh state and a distinct placeholder location/layout, retry keeps completed levels, and the mission banner is fully readable at tested desktop sizes.
Notes: replaces T9's carried improvements with independent levels at the user's request. Reuse original vector mascot and synthesise speech locally; surveyed maps remain pending. See handoff/t10-level-briefings.md.

## M7 City funding: useful actions earn visible rewards

### Chunk G · in order

#### T11 Prominent wallet and government-funding rewards

Owner: @myspace7164
Needs: T10
Files: config/funding.ts, config/audio.ts, public/audio/*stage*.wav, src/interfaces.ts, src/game/funding.ts, src/game/city.ts, src/game/campaign.ts, src/game/audio.ts, src/main.ts, src/ui/city.ts, src/ui/style.css, src/ui/theme.css, index.html, tests/funding.test.ts, tests/city.test.ts, tests/campaign.test.ts, tests/browser/funding.spec.ts, tests/browser/audio.spec.ts, README.md, docs/design.md, docs/decisions.md, docs/style-guide.md, docs/SOURCES.md
Done when: available coins stay prominent during play; useful actions award actual spendable coins with a rising chime and coin animation; failed/repeated actions and recycling cannot farm grants; each level plays its supplied stage track, rain is quieter, and mute/pause/reduced motion and fresh-level resets work.
Notes: grant ledger tracks earned coins separately from costs/refunds, so rewarded construction celebrates even when wallet balance decreases. See handoff/t11-city-funding.md.

## M8 Visible equipment and a moving antagonist

### Chunk H · in order

#### T12 Held climate tools and roaming Dr. Beton

Owner: @myspace7164
Needs: T11
Files: config/equipment.ts, config/beton.ts, src/interfaces.ts, src/game/held-tools.ts, src/game/sabotage.ts, src/game/city.ts, src/game/campaign.ts, src/game/characters.ts, src/game/city-view.ts, src/game/world.ts, src/main.ts, src/ui/city.ts, tests/sabotage.test.ts, tests/city.test.ts, tests/campaign.test.ts, tests/browser/equipment.spec.ts, README.md, docs/design.md, docs/decisions.md, docs/style-guide.md
Done when: every selected inventory tool appears in SpongeBob's hand with either character model; Dr. Beton roams, visibly approaches the chosen plot and seals only after reaching it; he looks menacing, can be intercepted at his real position, and pause/reset/terrain and water conservation remain correct.
Notes: original procedural props and cartoon villain geometry; deterministic pseudo-random roaming permits reproducible checks. See handoff/t12-held-tools-villain.md.
