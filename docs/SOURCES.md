# Sources

Every dataset, API, notable library and AI tool used, with licence. This register feeds the project sources slide.

## Project and development

- **Codex (OpenAI):** [chatgpt.com/codex](https://chatgpt.com/codex), AI-assisted development.
- **Claude Code (Anthropic):** [claude.com/claude-code](https://claude.com/claude-code), AI-assisted development.
- **Three.js:** [github.com/mrdoob/three.js](https://github.com/mrdoob/three.js), MIT; 3D renderer and glTF loader.
- **Sponge-city mission and named characters:** user-supplied concept. Cartoon characters are third-party fictional characters.
- **Climate and water coefficients:** project-authored synthetic values in `config/city.ts`; illustrative, not empirical.
- **Basel stage set:** original procedural geometry inspired by the supplied Barfüsserplatz setting; no survey/map data or imported art.
- **UI:** original inline SVG, CSS artwork and typography; no external images or fonts. Includes `public/ui/sea-flower.svg`.
- **Wearable hats:** original procedural Three.js meshes and inline SVG previews in `src/game/hats.ts` and `src/ui/hat-shop.ts`; no external runtime assets.
- **Character visuals:** held-tool miniatures and Dr. Beton's outfit/eyes are original procedural Three.js geometry. Runtime locomotion adjusts the supplied GLB's limb transforms/materials while preserving morph targets.
- **Imported SpongeBob model:** supplied Blender scene and GLB export. Model author and asset licence are not established; SpongeBob is a third-party fictional character.
- **Audio:** eight team-supplied WAV clips in `public/audio/`; original provenance and licence are not recorded. The coin-reward chime and briefing voice are local Web Audio synthesis, with no recorded character voice.
- **City funding music:** five team-supplied stage WAV files (`18_stage_1_calm.wav` through `22_stage_5_insane.wav`); original provenance and licence are not recorded. The first four follow campaign difficulty stages regardless of randomly selected map location; stage five is reserved.

## Basel data

- **3D buildings:** [Kanton Basel-Stadt 3D-Stadtmodell catalogue](https://shop.geo.bs.ch/geodaten-katalog/), supplied `SM_Stadtmodell3D` / `3D_Stadtmodell.obj` and matching MTL. CC BY 4.0 under the [official public-geodata terms](https://www.bs.ch/bvd/grundbuch-und-vermessungsamt/geo/anwendungen/agb); attribution: Quelle: Geodaten Kanton Basel-Stadt. Catalogue lists the model as public category A with a download service. Verified 2026-10-03; no warranty of accuracy or completeness. The derived GLB uses illustrative procedural facades and omits buildings touching the fictional mission area. See `public/models/README.md`. No endorsement by the source provider.
- **Street centrelines:** [Strassen und Wege, dataset 100250](https://data.bs.ch/explore/dataset/100250/), CC BY 4.0, verified in official dataset API metadata on 2026-10-03; attribution: Geodaten Kanton Basel-Stadt. Used for local street ribbons with illustrative widths; no elevation was supplied.
- **Aerial ground image:** [SWISSIMAGE](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10), official [WMS](https://docs.geo.admin.ch/visualize-data/wms.html). Free use with attribution under [swisstopo terms](https://www.swisstopo.admin.ch/en/faq-free-geodata); © swisstopo. Downloaded 2026-10-03; acquisition date unspecified. Local 4096 × 3465 orthophoto snapshot on flat ground. Reproduction request and extent: `public/maps/README.md`.
- **Terrain heights:** [swissALTI3D](https://www.swisstopo.admin.ch/en/height-model-swissalti3d), 2 m XYZ tiles (2025 release) via the [STAC API](https://data.geo.admin.ch/api/stac/v0.9/collections/ch.swisstopo.swissalti3d). Free use with attribution under [swisstopo terms](https://www.swisstopo.admin.ch/en/faq-free-geodata); © swisstopo. Downloaded 2026-10-03. Used for a 4 m height grid and downhill runoff; rebuild steps: `public/maps/README.md`.
- **Land cover:** [Bodenbedeckung, dataset 100477](https://data.bs.ch/explore/dataset/100477/) (amtliche Vermessung), CC BY 4.0; attribution: Quelle: Geodaten Kanton Basel-Stadt. Downloaded 2026-10-03. Drawn as 0.4 m category tiles; rebuild steps: `public/maps/README.md`.
- **Trees:** [Baumkataster: Baumbestand, dataset 100052](https://data.bs.ch/explore/dataset/100052/) (Stadtgärtnerei), CC BY 4.0; attribution: Quelle: Geodaten Kanton Basel-Stadt. The portal licence label also names OpenStreetMap; only tree points are used. Downloaded 2026-10-03. Species indicates broadleaf/conifer; height is estimated from age.
- **Campaign narrative and locations:** team-supplied level-system request; story content lives in `config/levels.ts`. The tutorial plot template derives from illustrative Riehenring street situations. Current mission plots and water/heat coefficients remain fictional even though the randomized map anchors are real. See [level geography](level-geography.md) for official climate/runoff evidence and limitations.
- **Sponge-city terminology:** permeable paving, tree pit/Baumrigole and swale/Versickerungsmulde follow common Swiss Schwammstadt terms. They illustrate options, not planned municipal measures.

## Online service

Node.js 24 [SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) supplies the embedded host database. MDN documents [cookie attributes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) and [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource). No external identity provider, account dataset or remote leaderboard service is used. Real usernames and session records stay in the ignored host database.

## Climate-based location pool

Eight eligible Basel locations are ranked from official GeoBS human-bioclimate WMS, Basel city-climate policy and FOEN surface-runoff WMS. Original samples, legends and requests are retained in public/maps/risk/. Primary source links, reproduction, selection method and coarse-map limits have their single home in [level geography](level-geography.md). Preserve provider attribution when reusing the source maps.

## Original ambient character and voices

A user-supplied outfit reference remains outside the repository. The riverside buddy's hoodie, jeans, sneakers, can, cigarette, smoke and poses are original procedural geometry; no real name or photograph is stored. Twenty positive English lines, cartoon speech balloons and nearby synthesized cast/buddy gibberish are original game content. Voices are not recordings.

## Presentation

The standalone deck uses original inline SVG/CSS artwork with no external images or fonts. Environmental teaching principles reference [EPA green infrastructure](https://www.epa.gov/green-infrastructure/about-green-infrastructure), [types of green infrastructure](https://www.epa.gov/green-infrastructure/types-green-infrastructure) and [urban heat reduction](https://www.epa.gov/green-infrastructure/reduce-heat-islands). The deck paraphrases these principles; it introduces no measured effectiveness claim. The existing geodata and asset provenance entries above govern the presentation’s project claims.
