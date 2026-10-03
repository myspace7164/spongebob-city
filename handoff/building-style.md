# Basel building style

Status: done

Goal: Basel buildings that look like Basel instead of plain grey, without image textures.

Done: `scripts/convert-basel-map.py` writes a `_BUILDING` attribute per building (style seed, base height, bridge flag from `Bru_` materials); the GLB was regenerated from the supplied OBJ (origin unchanged, 23.7 MB). `src/game/building-style.ts` draws four illustrative facade families (traditional with shutters and flower boxes, apartment, office, workshop), a muted Basel palette, tile/slate pitched roofs and gravel/green flat roofs; values in `config/buildings.ts`. Only meshes with `_building` are styled. Design by Codex (refined palette and families), integration and checks by Claude Code. The participant reviewed it and chose this look.

Verified: 49 unit tests, 3 converter tests, type check, build; screenshot on current main shows the facades with the team's latest characters.

Bridges: Basel labels 42 objects as bridges (`Bru_` materials, e.g. Mittlere Rheinbrücke, Wettsteinbrücke, Markthallenbrücke). The converter now also flags 45 unlabelled objects with no vertex within 1.5 m of the terrain (the span over Riehenring, station canopies, walkways). Bridges render without windows: asphalt deck, concrete sides with seams, darker underside. Landmark override: `LANDMARKS` in the converter gives the Messe Basel Halle 1 (`mesh-5335`, unlabelled in the data; its upper volume floats over Messeplatz behind the Riehenring start) kind 2, rendered as twisted aluminium bands over a glazed ground floor with a dark underside. More landmarks (Münster, Rathaus) can be added the same way.

Later options (Codex research): Basel GWR dataset 100230 (construction period, storeys, category via EGID) could pick facade families per real building; swissBUILDINGS3D 3.0 has EGID-linked roof/facade elements; MapBS 3D and Wikimedia Commons photos for landmark textures need licence checks per image. Not imported.

Not included: free walk and hill shading stay on the local `test/free-walk` branch.
