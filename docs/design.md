# Sponge City — Basel campaign

A desktop 3D learning game about turning a sealed, hot square into a sponge city. The supplied idea defines the domain rule: storm water must support vegetation or storage, rather than simply disappear. The existing Three.js/TypeScript/Vite foundation supplies movement, camera and optional Blender imports.

## Campaign

Short, punchy English briefings adapt the supplied arrival, four neighbourhood chapters and ending. A reused original vector SpongeBob bobs while locally synthesised wah-wah gibberish accompanies a word-paced text reveal (300 words/minute, at most 12 seconds). Start is always available; start, mute, hidden tabs and finished speech silence the voice. Reduced motion disables bobbing. Configurable definitions in config/levels.ts hold story, placeholder coordinates, weather and achievement thresholds. Geography for levels 2–4 remains pending; Riehenring uses the supplied map data with illustrative site types.

Riehenring is played on the real street: a straight stretch south of the footbridge, with the Basel scenery moved and turned so the street runs along the play area. Its sixteen spots sit on real street situations (parking lane, sidewalk verge, corner, building edge) and each offers the matching technique: permeable paving, tree pit (Baumrigole), swale (Versickerungsmulde), or green roof/shade/tank. Walking is limited to the street corridor because buildings have no collisions. Levels 2–4 keep placeholder grids until their areas have map data. Later idea: a heat map overlay from Basel-Stadt's published urban climate data, showing which parts of the city collect the most heat.

Riehenring teaches unsealing, water reuse and rain gardens. Erlenmatt adds healthy trees and planted basins. St. Johann adds green roofs and contiguous shade. VoltaNord combines tanks, ponds and safe overflow connections through a complete strongest storm. All current-level achievements must be satisfied together. Progression automatically selects the next level and pauses for its story; only the fourth completion shows the ending.

Each level starts a fresh city: plots, water, budget, upgrades, weather and hazards reset. Only completed level IDs carry forward. The real Riehenring street and three independent fictional locations replace the shared square; scenery follows the active location. Entry checkpoints allow retrying the current level; campaign restart returns to arrival. Press C at a roof/tank, then C at a receiving plot to connect runoff. Finite-capacity transfers conserve water. Each location has sixteen plots. Drainage goals remain illustrative; levels 2–4 use placeholder layouts. Recycling with V reclaims an upgrade’s cost and preserves its water, so accidental building choices cannot exhaust the required plots.

## Playable mission

Start at a fictional, stylised Basel neighbourhood at 37 °C. Walk between sixteen asphalt plots. Break asphalt, plant and water trees, create infiltration basins, ponds, storage, green roofs/facades and shaded seating. Each conversion changes geometry and colours. Healthy vegetation attracts residents and birds.

Dry periods alternate with thunderstorms. Each plot holds surface water, soil moisture and stored water. SpongeBob absorbs nearby water into a limited reservoir and sprays it into vegetation or tanks. Pore Power temporarily increases capacity; bubble irrigation extends reach; MAXIMUM SPONGE temporarily enlarges him and absorbs across the square. Capacity returning to normal never deletes collected water.

Patrick can remove several nearby asphalt slabs. Sandy sells a capacity/bubble upgrade. Squidward comments on shade and Mr. Krabs tracks the construction budget. Dr. Beton's Asphaltinator reseals an exposed green plot periodically; nearby karate disables it temporarily.

The HUD shows city temperature and heat risk, flood danger, sponge capacity, weather, budget and mission progress. Asphalt and Dr. Beton's sealing slowly increase temperature; rain, watered trees, green plots, ponds and shade cool it. SpongeBob's Dry morph starts blending above 36°C, fires begin above 40°C, and temperatures over 60°C lose the mission; prolonged critical flooding also causes a loss. Both outcomes show measured simulation changes in temperature, water retained, tree count and unsealed area, with restart.

## Structure and limits

Contextual team-supplied audio accompanies successful construction and water transfers. Absorption, spraying and rain use loops; continuous sounds stop when their action or weather stops. Pause, hidden tabs and mission outcomes silence all clips. A Sound button and M key toggle mute.

Shared contracts: `src/interfaces.ts`. Rules: `src/game/city.ts` and `src/game/campaign.ts`. Tuning/story: `config/city.ts` and `config/levels.ts`. Scene: `src/game/city-view.ts` and `src/game/characters.ts`. HUD/story: `src/ui/city.ts` and `src/ui/campaign.ts`. Input and movement retain their existing modules. Old sandbox modules remain available as reusable foundation code but are not mounted in the mission.

All coefficients, litres, area and temperatures are fictional gameplay values, not a validated hydrology/climate model or a surveyed mission square. A converted Basel building dataset supplies surrounding scenery; its placement and cleared mission area are documented in `public/models/README.md`. Host-persisted cookie accounts and rankings accompany temporary four-player cooperative rooms. Mobile controls and building collision remain out of scope. The player uses the team Blender model with procedural fallback; companions and mission props are procedural meshes. Surrounding buildings load from the supplied Basel dataset, with the procedural architecture retained as a fallback. Named cartoon characters come from the user's concept. Boss representation is a sabotage machine; additional boss encounters and surveyed neighbourhood layouts are future work.

## City funding rewards

Keep available coins in a large gold wallet beside the weather and sound controls, outside the scrollable mission list. Useful player actions earn fictional government grants: first water collection and delivery per plot, each new construction type per plot, a safe runoff route per source, disabling sabotage and installing the sponge upgrade. Patrick and automatic maximum absorption use the same rules. Each grant is claimed once per level; rebuilding, repeated inputs and refunds cannot farm funding. Levels and retries reset the grant ledger with the city. A short rising coin chime, wallet bounce, flying coin burst and visible `+coins · City funding` receipt celebrate actual grants, including builds whose cost exceeds the grant. Mute, pause and reduced motion remain respected. Reward amounts live in config.

## Held tools and roaming villain

All nine selected climate tools have a recognisable miniature prop in SpongeBob's right hand, including the imported character and fallback. Reuse geometry and cache one prop per tool; attachment follows the character through movement, turns and powers. Tools change immediately when selected from the keyboard or guide.

Both character variants use relaxed idle arms and alternating arm/leg movement while walking. Holding either Shift key increases speed and gait intensity. The current GLB has no exported skeleton or clips, so runtime limb pivots preserve its morph targets and animate its existing arm/leg geometry. Equipment follows the right-arm pivot; imported tooth materials become white. Keep the team Blender source and existing water states intact.

Dr. Beton continuously wanders between deterministic pseudo-random waypoints while active. At each sabotage interval he picks exposed soil or a basin, visibly approaches it and spends a short sealing animation before restoring asphalt. A player can intercept him at his actual moving position with E or karate; disabling cancels the attack and pauses him for the existing duration. Movement and attacks freeze with gameplay, reset with the level and respect terrain. His dark angular outfit, red eyes, slanted brows and toothed grin make him a menacing cartoon villain. A warning path and animated roller signal the plot under attack; water remains conserved.

Each neighbourhood loops the corresponding supplied stage track during gameplay. Rain plays at 8% volume and stage music at 22%; pause, briefings, hidden tabs and mute stop playback. The fifth stage track is reserved for future levels.

## Visual direction

Basel street centrelines become batched translucent road/path surfaces over a
local SWISSIMAGE orthophoto. Both share the building model's LV95 origin and
bounds. The fictional mission rectangle remains clear. Roads are estimated widths
with no surveyed bridge/tunnel elevations.

Buildings get a procedural Basel look instead of the model's plain grey: four
illustrative facade families (old-town houses with shutters and flower boxes,
apartments, offices, workshops) with their own storey heights and windows, a
muted Basel plaster and sandstone palette, tile or slate pitched roofs and
gravel or green flat roofs. Colours and windows are artistic, chosen per
building from a stable seed, not surveyed. Bridges (Basel's `Bru_` objects and
unlabelled spans that float above the terrain) have no windows: asphalt deck,
concrete sides and a darker underside. Hand-picked landmarks get their own look;
the Messe Basel hall on Riehenring shows its aluminium band facade.

The ground is drawn from Basel's land-cover map instead of the blurry photo:
asphalt roads with curbs, paved sidewalks and squares, grass, forest, the Rhine
with cartoon ripples and rail/tram areas, all lit so slopes show. About 6,100
real inventory trees stand at their positions as cartoon trees; trees next to a
level's unsealing spots are left out so they never block play.

The ground is real swissALTI3D terrain (4 m grid): the photo is draped over it,
roads follow it, and buildings keep their surveyed heights on top. Each level's
play area is lifted to y = 0. The player, characters and plots stand on the
terrain, and rainwater on a plot runs to lower neighbours within 7.5 m, so low
spots flood first. Riehenring is nearly flat; the stages near St. Alban drop
about 2 m towards the Rhine. Without terrain data the game stays flat.
Conversion details live in `public/maps/README.md`; licences in `docs/SOURCES.md`.

The cartoon/Frutiger Aero interface follows `docs/style-guide.md`: sponge-yellow lettering and welcome card, glossy aqua controls, original vector mascot, flowers, decorative bubbles, speech-bubble feedback and individually readable power badges. The guide can scroll its tools while keeping its close control visible. Decoration pauses with the mission and respects reduced motion.

## Online cooperation and presentation

Cookie identity, room snapshots and commands are defined in [the shared interface](../src/interfaces.ts). A same-origin Node 24 service persists unique usernames, opaque hashed sessions and server-earned rankings in host-managed SQLite. Four-player rooms run one authoritative campaign with shared budget/water and individual movement/tools. The leaderboard orders campaign wins then personal useful-action funding. Live rooms are temporary; accounts and rankings use a persistent host volume. Solo practice remains available without the online service.

All game text is English. Compact colorful gauges put labels and readings inside the scales. A readable wallet celebrates grants with a brief receipt, three coins and a chime. The HUD stays calm; reduced motion disables animation.

## Basel ground collectibles

Six Basel-themed boosts and the four existing powers form a ten-type collectible pool. Each level starts with one capacity drop; later drops appear at least 60 seconds apart with at most one waiting. Walking over a drop fills the single held/active slot and replaces its previous effect. Q activates once; H also offers activation. Effects expire without deleting water. Co-op claims are authoritative. Fresh levels/retries reset pickups.

Tools unlock alongside missions: water, karate and rain gardens in level 1; trees in 2; roofs/shade in 3; ponds/tanks in 4. Locked gray tiles show remaining levels, and UI/keyboard/server actions enforce availability. The mission checklist is short; heat/flood targets remain visible as safety readings.

Emotes stay behind Alt+1–5: 67, Macarena, teabag, dab and floss. Original procedural arm/leg and body motion uses existing character pivots on both the Blender and fallback characters. Timed poses cancel on movement/jump and restore the walking/idle rig. Co-op relays validated emote identity/timing; no reward or gameplay advantage. The field guide lists shortcuts without adding an always-visible emote panel.
