# Sources

Every dataset, API, notable library and AI tool used, with licence. Feeds the sources slide on Sunday.

| What | Source / URL | Licence or permission | Used for |
|---|---|---|---|
| Codex (OpenAI) | chatgpt.com/codex | Tool, AI-assisted development | Coding assistant |
| Sponge-city mission and named characters | User-supplied concept | Concept supplied for this prototype; cartoon characters are third-party fictional characters | Gameplay and procedural character representations |
| Climate and water coefficients | Original synthetic gameplay values in config/city.ts | Project-authored; illustrative, not empirical | Mission balancing and outcome metrics |
| Basel stage set | Procedural geometry inspired by the supplied Barfüsserplatz setting | Original project geometry; no survey/map data or imported art | Mission environment |
| Basel building model | [3D-Stadtmodell, Geodaten-Katalog Kanton Basel-Stadt](https://shop.geo.bs.ch/geodaten-katalog/); supplied SM_Stadtmodell3D / 3D_Stadtmodell.obj and matching MTL | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), per [official public-geodata terms](https://www.bs.ch/bvd/grundbuch-und-vermessungsamt/geo/anwendungen/agb). Attribution: Quelle: Geodaten Kanton Basel-Stadt. Catalogue lists the 3D model as public category A with a download service. Verified 2026-10-03. No warranty of accuracy or completeness. | Derived GLB scenery: tiled, centred, Y-up coordinates, buildings touching the fictional mission omitted; see public/models/README.md. No endorsement by the source provider. |
| Three.js | https://github.com/mrdoob/three.js | MIT | 3D renderer and glTF loader |
| UI mascot, flower motifs and bubble/glass textures | Original inline SVG, public/ui/sea-flower.svg and CSS | Project-authored vector/CSS artwork; no external images or fonts | Cartoon / Frutiger Aero UI |
| Eight WAV sound clips | Uploaded by @aureaphi in commit efc672b; organised in public/audio/ | Team-supplied for the prototype; original provenance and licence not recorded | Absorption, spraying, planting, construction, pond, rain, asphalt removal and water storage |
